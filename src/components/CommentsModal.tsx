import { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, Trash2, CreditCard as Edit2, MessageCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { EditCommentModal } from './EditCommentModal';
import { UserAvatar } from './UserAvatar';
import { BadgeList } from './badges/BadgeList';
import { getUserBadges, getUserDriverRating, type Badge, type UserBadge } from '../lib/badges';
import { type OnNavigate } from '../types/navigation';
import { calculateAndAwardReputation } from '../lib/reputation';
import { formatTimeAgo } from '../lib/formatting';

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

export function CommentsModal({ postId, postAuthor, onClose, onNavigate }: CommentsModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments(0);
    inputRef.current?.focus();
  }, [postId]);

  const loadComments = async (pageNum: number) => {
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
      } catch (likesError) {
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
            .filter(b => b && b.id && b.rarity && b.icon_name);
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
  };

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

        // AUTO-AWARD: Check for tiered comment badges
        try {
          await supabase.rpc('check_and_award_badges', {
            p_user_id: user.id,
            p_action: 'comment'
          });
        } catch (autoAwardError) {
          console.error('Auto-award badge error:', autoAwardError);
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
            .filter(b => b && b.id && b.rarity && b.icon_name);
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-surface p-4 border-b border-surfacehighlight flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-bold">Comments</h3>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-surfacehighlight rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
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
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {/* Avatar - Clickable */}
                    <button
                      onClick={() => onNavigate?.('user-profile', { userId: comment.author_id })}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <UserAvatar
                        avatarUrl={comment.author.avatar_url}
                        handle={comment.author.handle}
                        size="md"
                      />
                    </button>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-surfacehighlight rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <button
                                onClick={() => onNavigate?.('user-profile', { userId: comment.author_id })}
                                className="font-bold text-sm hover:underline"
                              >
                                @{comment.author.handle}
                              </button>
                              {comment.authorBadges && comment.authorBadges.length > 0 && (
                                <BadgeList badges={comment.authorBadges} maxDisplay={2} size="xs" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {comment.driverRating && comment.driverRating.avg_driver_rating > 0 && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                                  <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                                  <span className="text-[10px] font-bold text-yellow-600">
                                    {comment.driverRating.avg_driver_rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              <span className="text-xs text-secondary">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                              {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <span className="text-xs text-secondary italic">(edited)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm break-words">{comment.text}</p>
                      </div>

                      {/* Comment Actions */}
                      <div className="flex items-center gap-3 mt-1 ml-2">
                        <button
                          onClick={() => handleLikeComment(comment.id, comment.user_liked || false)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            comment.user_liked
                              ? 'text-red-500 font-semibold'
                              : 'text-secondary hover:text-red-500'
                          }`}
                        >
                          <Heart
                            className="w-3 h-3"
                            fill={comment.user_liked ? 'currentColor' : 'none'}
                          />
                          {comment.like_count && comment.like_count > 0 && <span>{comment.like_count}</span>}
                        </button>

                        {user?.id === comment.author_id && (
                          <>
                            <button
                              onClick={() => handleEditComment(comment)}
                              className="flex items-center gap-1 text-xs text-secondary hover:text-orange-500 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="flex items-center gap-1 text-xs text-secondary hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
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
                  className="w-full py-3 mt-4 text-sm text-secondary hover:text-primary hover:bg-surfacehighlight rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2">
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
                <p className="text-center text-sm text-secondary mt-4">
                  No more comments
                </p>
              )}
            </>
          )}
        </div>

        {/* Comment Input - Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-surfacehighlight">
          <div className="flex gap-3">
            {user && (
              <>
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-surfacehighlight border border-surfacehighlight rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                  rows={2}
                  disabled={submitting}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 bg-accent-primary hover:bg-accent-hover rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
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
