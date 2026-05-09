import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Heart, Trash2, CreditCard as Edit2, MessageCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRewardEvents } from '../contexts/RewardEventContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { EditCommentModal } from './EditCommentModal';
import { UserAvatar } from './UserAvatar';
import { BadgeList } from './badges/BadgeList';
import { getUserBadges, getUserDriverRating, type Badge } from '../lib/badges';
import { type OnNavigate } from '../types/navigation';
import { calculateAndAwardReputation } from '../lib/reputation';
import { formatTimeAgo } from '../lib/formatting';
import { moderateTextContent } from '../lib/contentModeration';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  text: string;
  created_at: string;
  updated_at?: string;
  like_count?: number;
  is_edited?: boolean;
  user_liked?: boolean;
  author: {
    handle: string;
    avatar_url: string | null;
  };
  authorBadges?: Badge[];
  driverRating?: { avg_driver_rating: number; driver_rating_count: number };
}

interface CommentsModalProps {
  postId: string;
  postAuthor: string;
  onClose: () => void;
  onNavigate?: OnNavigate;
}

const COMMENTS_PER_PAGE = 20;

export function CommentsModal({ postId, postAuthor: _postAuthor, onClose, onNavigate }: CommentsModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { celebrateReward } = useRewardEvents();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async (pageNum: number) => {
    if (!user) return;

    const isLoadingMore = pageNum > 0;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const start = pageNum * COMMENTS_PER_PAGE;
      const end = start + COMMENTS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          author_id,
          text,
          created_at,
          author:profiles!author_id(handle, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      let likedCommentIds = new Set<string>();

      try {
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', (data || []).map(c => c.id));

        likedCommentIds = new Set((likesData || []).map(l => l.comment_id));
      } catch {
        // Comment likes table not yet available
      }

      const enrichedComments = await Promise.all((data || []).map(async (comment) => {
        const authorId = comment.author_id;
        let authorBadges: Badge[] = [];
        let driverRating = { avg_driver_rating: 0, driver_rating_count: 0 };

        try {
          const [userBadges, rating] = await Promise.all([
            getUserBadges(authorId),
            getUserDriverRating(authorId)
          ]);

          authorBadges = userBadges
            .map(ub => ub.badge)
            .filter(b => b && b.id && b.icon_name);
          driverRating = rating;
        } catch (error) {
          console.error('Error loading author data for comment:', error);
        }

        return {
          ...comment,
          like_count: 0,
          user_liked: likedCommentIds.has(comment.id),
          author: Array.isArray(comment.author) ? comment.author[0] : comment.author,
          authorBadges,
          driverRating
        };
      }));

      if (pageNum === 0) {
        setComments(enrichedComments as Comment[]);
      } else {
        setComments(prev => {
          const updated = [...prev, ...(enrichedComments as Comment[])];
          return updated;
        });
      }

      setHasMore((data?.length || 0) === COMMENTS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, postId, showToast]);

  useEffect(() => {
    loadComments(0);
    inputRef.current?.focus();
  }, [postId, loadComments]);

  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      loadComments(page + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const moderation = await moderateTextContent(newComment, 'comment');
      if (!moderation.allowed) {
        showToast(moderation.reason || 'Comment blocked by moderation.', 'error');
        return;
      }

      const { error: insertError } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          text: newComment.trim(),
        });

      if (insertError) {
        console.error('Comment insert error:', insertError);
        console.error('Error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      // Now fetch the comment we just created
      const { data, error: fetchError } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          author_id,
          text,
          created_at,
          author:profiles!author_id(handle, avatar_url)
        `)
        .eq('post_id', postId)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Comment fetch error:', fetchError);
        // Don't throw - the insert worked, just reload the comments
        await loadComments(0);
        setNewComment('');
        showToast('Comment added!', 'success');
        return;
      }

      if (data) {
        // REPUTATION: Award points for comment creation
        try {
          await calculateAndAwardReputation({
            userId: user.id,
            action: 'COMMENT_LEFT',
            referenceType: 'comment',
            referenceId: data.id
          });
        } catch (repError) {
          console.error('Reputation award error:', repError);
        }

        // Load badges and rating for the new comment
        let authorBadges: Badge[] = [];
        let driverRating = { avg_driver_rating: 0, driver_rating_count: 0 };

        try {
          const [userBadges, rating] = await Promise.all([
            getUserBadges(user.id),
            getUserDriverRating(user.id)
          ]);

          authorBadges = userBadges
            .map(ub => ub.badge)
            .filter(b => b && b.id && b.icon_name);
          driverRating = rating;
        } catch (error) {
          console.error('Error loading author data:', error);
        }

        const newCommentData: Comment = {
          ...data,
          like_count: 0,
          user_liked: false,
          author: Array.isArray(data.author) ? data.author[0] : data.author,
          authorBadges,
          driverRating
        };
        setComments(prev => {
          const updated = [newCommentData, ...prev];
          return updated;
        });
      }

      setNewComment('');
      showToast('Comment added!', 'success');
      celebrateReward({
        type: 'rp',
        title: 'Comment Posted',
        message: 'You added momentum to the conversation.',
        points: 3,
      });

      // Send notification to post author
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .maybeSingle();

        if (post && post.author_id && post.author_id !== user.id) {
          const { notifyPostComment } = await import('../lib/notifications');
          await notifyPostComment(postId, post.author_id, user.id, newComment.trim());
        }
      } catch (notifError) {
        console.error('Failed to send comment notification:', notifError);
      }

      // Close modal after posting comment
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      showToast('Failed to add comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });

        // Badge awards are now handled automatically by database triggers
      }

      setComments(prev => prev.map(comment =>
        comment.id === commentId
          ? { ...comment, user_liked: !isLiked }
          : comment
      ));
    } catch (error) {
      console.error('Error liking comment:', error);
      showToast('Comment likes not yet available', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    if (!window.confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      showToast('Comment deleted', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment({ id: comment.id, text: comment.text });
  };

  const handleSaveEdit = async (commentId: string, newText: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({
          text: newText,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) {
        console.error('Comment update error:', error);
        throw error;
      }

      setComments(prev => {
        const updated = prev.map(comment =>
          comment.id === commentId
            ? { ...comment, text: newText, updated_at: new Date().toISOString() }
            : comment
        );
        return updated;
      });
      showToast('Comment updated', 'success');
    } catch (error: unknown) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#eef4f8',
              margin: 0,
            }}
          >
            Comments
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#7a8e9e',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              minWidth: 44,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
          }}
        >
          {loading ? (
            <LoadingSpinner size="md" label="Loading comments..." />
          ) : comments.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No comments yet"
              description="Be the first to comment!"
            />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{ display: 'flex', gap: 12 }}>
                    {/* Avatar */}
                    <button
                      onClick={() => onNavigate?.('user-profile', { userId: comment.author_id })}
                      style={{
                        flexShrink: 0,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <UserAvatar
                        avatarUrl={comment.author.avatar_url}
                        handle={comment.author.handle}
                        size="md"
                      />
                    </button>

                    {/* Comment Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 10,
                          padding: 12,
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 4,
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                onClick={() => onNavigate?.('user-profile', { userId: comment.author_id })}
                                style={{
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#F97316',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                @{comment.author.handle}
                              </button>
                              {comment.authorBadges && comment.authorBadges.length > 0 && (
                                <BadgeList badges={comment.authorBadges} maxDisplay={2} size="xs" />
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              {comment.driverRating && comment.driverRating.avg_driver_rating > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '2px 6px',
                                    background: 'rgba(234,179,8,0.1)',
                                    border: '1px solid rgba(234,179,8,0.3)',
                                    borderRadius: 999,
                                  }}
                                >
                                  <Star
                                    style={{ width: 10, height: 10, fill: '#eab308', color: '#eab308' }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: '#ca8a04',
                                      fontFamily: 'Barlow Condensed, sans-serif',
                                    }}
                                  >
                                    {comment.driverRating.avg_driver_rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              <span
                                style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  fontSize: 9,
                                  color: '#445566',
                                }}
                              >
                                {formatTimeAgo(comment.created_at)}
                              </span>
                              {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <span
                                  style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: 9,
                                    color: '#445566',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  (edited)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p
                          style={{
                            fontFamily: 'Barlow, sans-serif',
                            fontSize: 13,
                            color: '#a8bcc8',
                            margin: 0,
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                          }}
                        >
                          {comment.text}
                        </p>
                      </div>

                      {/* Comment Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginTop: 4,
                          marginLeft: 8,
                        }}
                      >
                        <button
                          onClick={() => handleLikeComment(comment.id, comment.user_liked || false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontFamily: 'Barlow, sans-serif',
                            color: comment.user_liked ? '#ef4444' : '#7a8e9e',
                            fontWeight: comment.user_liked ? 600 : 400,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          <Heart
                            style={{ width: 12, height: 12 }}
                            fill={comment.user_liked ? 'currentColor' : 'none'}
                          />
                          {comment.like_count && comment.like_count > 0 && <span>{comment.like_count}</span>}
                        </button>

                        {user?.id === comment.author_id && (
                          <>
                            <button
                              onClick={() => handleEditComment(comment)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontFamily: 'Barlow, sans-serif',
                                color: '#7a8e9e',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              <Edit2 style={{ width: 12, height: 12 }} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontFamily: 'Barlow, sans-serif',
                                color: '#7a8e9e',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 style={{ width: 12, height: 12 }} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={loadMoreComments}
                  disabled={loadingMore}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    marginTop: 16,
                    fontSize: 13,
                    fontFamily: 'Barlow Condensed, sans-serif',
                    color: '#7a8e9e',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.5 : 1,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {loadingMore ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <LoadingSpinner size="sm" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    'Load more comments'
                  )}
                </button>
              )}

              {/* End of comments message */}
              {!hasMore && comments.length > 0 && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontFamily: 'Barlow, sans-serif',
                    color: '#7a8e9e',
                    marginTop: 16,
                  }}
                >
                  No more comments
                </p>
              )}
            </>
          )}
        </div>

        {/* Comment Input - Fixed Footer */}
        <form
          onSubmit={handleSubmit}
          style={{
            flexShrink: 0,
            padding: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {user && (
              <>
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1,
                    background: '#070a0f',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontFamily: 'Barlow, sans-serif',
                    fontSize: 13,
                    color: '#eef4f8',
                    resize: 'none',
                    outline: 'none',
                  }}
                  rows={2}
                  disabled={submitting}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  style={{
                    padding: '10px 18px',
                    background: '#F97316',
                    border: 'none',
                    borderRadius: 10,
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: (!newComment.trim() || submitting) ? 'not-allowed' : 'pointer',
                    opacity: (!newComment.trim() || submitting) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 44,
                  }}
                >
                  <Send style={{ width: 16, height: 16 }} />
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Edit Comment Modal */}
      {editingComment && (
        <EditCommentModal
          commentId={editingComment.id}
          currentText={editingComment.text}
          onClose={() => setEditingComment(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
