import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, MoreVertical, Trash2, Edit, CheckCircle,
  MapPin, Star, Car
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ReactionButton } from './ReactionButton';
import { CommentsModal } from './CommentsModal';
import { ShareButton } from './ShareButton';
import { EditPostModal } from './EditPostModal';
import { UserAvatar } from './UserAvatar';
import { VideoPlayer } from './VideoPlayer';
import { trackPostView } from '../lib/postViews';
import { getUserBadges, getUserDriverRating, type Badge } from '../lib/badges';
import { VehicleQuickModal } from './VehicleQuickModal';
import { UserQuickModal } from './UserQuickModal';
import type { OnNavigate } from '../types/navigation';
import { formatTimeAgo } from '../lib/formatting';

interface Comment {
  id: string;
  text: string;
  author: {
    handle: string;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  author_id: string;
  caption: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  location: string | null;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  vehicle_id?: string | null;
  vehicles?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    color: string | null;
    plate_number: string | null;
    plate_state: string | null;
    stock_image_url: string | null;
    profile_image_url: string | null;
  } | null;
  author: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  profiles?: {
    verified?: boolean;
  };
}

interface PostCardProps {
  post: Post;
  onNavigate?: OnNavigate;
}

function getTypeLabel(post: any): string {
  if (post.post_type === 'claim') return 'CLAIMED';
  if (post.post_type === 'spot' || post.spot_history_id || post.post_type === 'review' || post.review_id) return 'RECENTLY SPOTTED';
  return 'OWNER POST';
}

function isSpotOrReview(post: any): boolean {
  const type = getTypeLabel(post);
  return type === 'RECENTLY SPOTTED';
}

function RatingStars({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-wider font-semibold text-tertiary" style={{ fontFamily: 'var(--font-cond)' }}>{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className="w-2.5 h-2.5"
            style={{
              color: i < value ? 'var(--gold-h)' : 'var(--border-2)',
              fill: i < value ? 'var(--gold-h)' : 'transparent',
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold" style={{ color: 'var(--gold-h)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{value}/5</span>
    </div>
  );
}

const viewedPostsThisSession = new Set<string>();

export default function PostCard({ post, onNavigate }: PostCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [, setCommentPreview] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(post.comment_count || 0);
  const [viewCount, setViewCount] = useState(post.view_count || 0);
  const [, setAuthorBadges] = useState<Badge[]>([]);
  const [, setDriverRating] = useState<{ avg_driver_rating: number; driver_rating_count: number }>({ avg_driver_rating: 0, driver_rating_count: 0 });
  const [, setLoading] = useState(true);
  const [isVerifiedOwner, setIsVerifiedOwner] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [vehicleImgError, setVehicleImgError] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const commentSectionRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === post.author_id;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const spotOrReview = isSpotOrReview(post as any);
  const typeLabel = getTypeLabel(post as any);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const loadCommentPreview = useCallback(async () => {
    try {
      const { data, count } = await supabase
        .from('post_comments')
        .select('id, text, author:profiles!author_id(handle, avatar_url)', { count: 'exact' })
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(2);
      const mapped = data?.map(c => ({
        id: c.id, text: c.text,
        author: Array.isArray(c.author) ? c.author[0] : c.author
      })) || [];
      setCommentPreview(mapped);
      setTotalComments(count || 0);
    } catch {
      // intentionally empty
    }
  }, [post.id]);

  const loadAuthorBadges = useCallback(async () => {
    try {
      setLoading(true);
      const [userBadges, rating, verifiedVehicles] = await Promise.all([
        getUserBadges(post.author_id),
        getUserDriverRating(post.author_id),
        supabase.from('vehicles').select('id').eq('owner_id', post.author_id).eq('is_verified', true).limit(1)
      ]);
      const badges = userBadges.map(ub => ub.badge).filter(b => b !== null && b !== undefined && b.icon_name);
      setAuthorBadges(badges);
      setDriverRating(rating);
      setIsVerifiedOwner((verifiedVehicles.data?.length || 0) > 0);
    } catch {
      // intentionally empty
    } finally {
      setLoading(false);
    }
  }, [post.author_id]);

  useEffect(() => {
    loadCommentPreview();
    loadAuthorBadges();
  }, [post.id, loadCommentPreview, loadAuthorBadges]);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !viewedPostsThisSession.has(post.id)) {
          viewedPostsThisSession.add(post.id);
          observer.disconnect();
          await trackPostView(post.id, user?.id).catch(() => {});
          setViewCount(prev => prev + 1);
        }
      },
      { threshold: 0.5, rootMargin: '0px' }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, user?.id]);

  if (isDeleted) return null;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user?.id);
      if (error) throw error;
      setIsDeleted(true);
      showToast('Post deleted', 'success');
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  const handleCommentClick = () => setShowComments(true);

  const postRecord = post as any;
  const hasRatings = postRecord.rating_vehicle;
  const hasDetailRatings = postRecord.spot_type === 'full' && (
    postRecord.looks_rating || postRecord.sound_rating || postRecord.condition_rating
  );
  const vehicleData = post.vehicles;
  const vehicleDisplay = vehicleData
    ? ([vehicleData.year, vehicleData.make, vehicleData.model].filter(Boolean).join(' ') || null)
    : null;
  const vehicleImage = vehicleData && !vehicleImgError
    ? (vehicleData.profile_image_url || vehicleData.stock_image_url)
    : null;
  const spottedImageUrl = post.image_urls && post.image_urls.length > 0 && !imageErrors.has(0)
    ? post.image_urls[0]
    : null;

  return (
    <>
      <div
        ref={cardRef}
        style={{ background: 'var(--carbon-1)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0px', overflow: 'hidden', marginBottom: '2px' }}
      >
        {/* ── TOP ACCENT LINE ──────────────────────────────── */}
        <div style={{ height: '3px', background: typeLabel === 'OWNER POST' ? 'var(--accent)' : typeLabel === 'CLAIMED' ? 'var(--green)' : 'var(--steel)' }} />

        {/* ── HEADER ROW ───────────────────────────────────── */}
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => setShowUserModal(true)} style={{ cursor: 'pointer' }}>
            <UserAvatar avatarUrl={post.author.avatar_url} handle={post.author.handle} size="md" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vehicleDisplay || `@${post.author.handle}`}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--dim)' }}>
              {vehicleData?.plate_state && vehicleData?.plate_number ? `${vehicleData.plate_state} · ${vehicleData.plate_number}` : formatTimeAgo(post.created_at)}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '3px', background: typeLabel === 'OWNER POST' ? 'var(--accent-dim)' : typeLabel === 'CLAIMED' ? 'rgba(32,192,96,0.12)' : 'rgba(255,255,255,0.06)', color: typeLabel === 'OWNER POST' ? 'var(--accent)' : typeLabel === 'CLAIMED' ? 'var(--green)' : 'var(--dim)' }}>
            {typeLabel}
          </span>
          {isOwner && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowOptions(!showOptions)}
                style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                <MoreVertical style={{ width: '16px', height: '16px' }} strokeWidth={1.5} />
              </button>
              {showOptions && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowOptions(false)} />
                  <div style={{ position: 'absolute', right: 0, marginTop: '4px', width: '160px', zIndex: 50, background: 'var(--carbon-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      onClick={() => { setShowEditModal(true); setShowOptions(false); }}
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--white)', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                    >
                      <Edit style={{ width: '14px', height: '14px', color: 'var(--accent)' }} strokeWidth={1.5} />
                      Edit Post
                    </button>
                    <button
                      onClick={() => { handleDelete(); setShowOptions(false); }}
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--negative)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── VEHICLE IMAGE (16:9) ─────────────────────────── */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--carbon-3)' }}>
          {(spottedImageUrl || vehicleImage) ? (
            <img src={spottedImageUrl || vehicleImage!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => spottedImageUrl ? handleImageError(0) : setVehicleImgError(true)} />
          ) : post.video_url ? (
            <VideoPlayer src={post.video_url} className="w-full h-full" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car style={{ width: '48px', height: '48px', color: 'var(--muted)' }} strokeWidth={1} />
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(3,5,8,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />
          {/* Vehicle identity overlaid bottom-left */}
          {vehicleData && (
            <div style={{ position: 'absolute', bottom: '8px', left: '12px', zIndex: 2 }}>
              {vehicleData.make && (
                <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                  {vehicleData.make} · {vehicleData.year}
                </div>
              )}
              {vehicleData.model && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
                  {vehicleData.model}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STATS STRIP ──────────────────────────────────── */}
        <div style={{ display: 'flex', background: 'rgba(7,10,15,0.5)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'SPOTS', value: (post.vehicles as any)?.spot_count as number || 0, accent: true },
            { label: 'FOLLOWERS', value: ((post.vehicles as any)?.vehicle_follower_count || (post.vehicles as any)?.follower_count || 0) as number, accent: false },
            { label: 'VIEWS', value: viewCount, accent: false },
          ].map((stat, i) => (
            <div key={stat.label} style={{ flex: 1, padding: '8px 0', textAlign: 'center' as const, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: stat.accent ? 'var(--accent)' : 'var(--white)' }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--font-cond)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── RATINGS ROW ──────────────────────────────────── */}
        {hasRatings && (
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,10,15,0.3)' }}>
            {postRecord.rating_vehicle && (
              <RatingStars value={postRecord.rating_vehicle as number} label="Vehicle" />
            )}
          </div>
        )}

        {/* ── DETAIL RATINGS ROW (full review only) ────────── */}
        {hasDetailRatings && (
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,10,15,0.3)' }}>
            {postRecord.looks_rating && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '2px', color: 'var(--muted)' }}>Looks</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-h)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{postRecord.looks_rating as number}/5</p>
              </div>
            )}
            {postRecord.sound_rating && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '2px', color: 'var(--muted)' }}>Sound</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-h)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{postRecord.sound_rating as number}/5</p>
              </div>
            )}
            {postRecord.condition_rating && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '2px', color: 'var(--muted)' }}>Condition</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-h)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{postRecord.condition_rating as number}/5</p>
              </div>
            )}
          </div>
        )}

        {/* ── CAPTION ──────────────────────────────────────── */}
        {post.caption && (
          <div style={{ padding: '10px 16px 4px' }}>
            <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--white)' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>@{post.author.handle}</span>
              {isVerifiedOwner && <CheckCircle style={{ display: 'inline', width: '12px', height: '12px', marginLeft: '2px', marginBottom: '2px', color: 'var(--accent)' }} />}
              {' '}{post.caption}
            </p>
          </div>
        )}

        {/* ── ACTIONS ROW ──────────────────────────────────── */}
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
            <button onClick={handleCommentClick} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: 'rgba(10,13,20,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', fontFamily: 'var(--font-cond)', fontSize: '11px', fontWeight: 700, color: 'var(--light)', cursor: 'pointer' }}>
              <MessageCircle style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
              {totalComments > 0 && totalComments}
            </button>
            <ShareButton post={post} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--dim)' }}>{formatTimeAgo(post.created_at)}</span>
        </div>

        {/* ── SPOT CTA PILL ────────────────────────────────── */}
        {vehicleData?.id && (
          <button onClick={(e) => { e.stopPropagation(); onNavigate?.('scan', { plateNumber: vehicleData?.plate_number }); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: 'calc(100% - 32px)', margin: '0 16px 10px', padding: '9px 16px', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: '20px', fontFamily: 'var(--font-cond)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', cursor: 'pointer' }}>
            <MapPin style={{ width: '14px', height: '14px' }} />
            Have you spotted this ride?
          </button>
        )}

        {/* ── COMMENT INPUT ROW ────────────────────────────── */}
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleCommentClick} style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {totalComments === 0 ? 'Be the first to comment...' : 'Add a comment...'}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsModal
          postId={post.id}
          postAuthor={post.author.handle}
          onNavigate={onNavigate}
          onClose={() => { setShowComments(false); loadCommentPreview(); }}
        />
      )}

      {showEditModal && (
        <EditPostModal
          postId={post.id}
          currentCaption={post.caption}
          onClose={() => setShowEditModal(false)}
          onSave={async (postId: string, newCaption: string) => {
            await supabase.from('posts').update({ caption: newCaption }).eq('id', postId);
            setShowEditModal(false);
            showToast('Post updated!', 'success');
          }}
        />
      )}

      {showVehicleModal && vehicleData?.id && (
        <VehicleQuickModal
          vehicleId={vehicleData.id}
          onClose={() => setShowVehicleModal(false)}
          onNavigate={onNavigate}
        />
      )}

      {showUserModal && (
        <UserQuickModal
          userId={post.author_id}
          onClose={() => setShowUserModal(false)}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
