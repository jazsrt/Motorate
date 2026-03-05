import { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, MoreVertical, Trash2, Edit, Eye, CheckCircle,
  MapPin, Star, ImageOff, ThumbsDown, Car, Zap, Award
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
import { BadgeList } from './badges/BadgeList';
import { StarRating } from './StarRating';
import { getUserBadges, getUserDriverRating, type Badge } from '../lib/badges';
import { VehicleQuickModal } from './VehicleQuickModal';
import { PublicProfileModal } from './PublicProfileModal';
import { floatPoints, haptic } from '../utils/floatPoints';
import type { OnNavigate } from '../types/navigation';

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
  if (post.post_type === 'spot' || post.spot_history_id) return 'SPOT';
  if (post.post_type === 'review' || post.review_id) return 'FULL SPOT';
  if (post.post_type === 'claim') return 'CLAIMED';
  return 'POST';
}

function getTypeChipStyle(post: any): string {
  const type = getTypeLabel(post);
  switch (type) {
    case 'SPOT': return 'bg-[rgba(249,115,22,0.15)] text-accent-2';
    case 'FULL SPOT': return 'bg-[rgba(251,146,60,0.15)] text-accent-2';
    case 'CLAIMED': return 'bg-[rgba(16,185,129,0.15)] text-positive';
    default: return 'bg-[rgba(16,185,129,0.15)] text-positive';
  }
}

function isSpotOrReview(post: any): boolean {
  const type = getTypeLabel(post);
  return type === 'SPOT' || type === 'FULL SPOT';
}

function RatingStars({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-wider font-semibold text-tertiary">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className="w-2.5 h-2.5"
            style={{
              color: i < value ? '#F97316' : 'var(--border-2)',
              fill: i < value ? '#F97316' : 'transparent',
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold font-mono" style={{ color: '#F97316' }}>{value}/5</span>
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
  const [commentPreview, setCommentPreview] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(post.comment_count || 0);
  const [viewCount, setViewCount] = useState(post.view_count || 0);
  const [authorBadges, setAuthorBadges] = useState<Badge[]>([]);
  const [driverRating, setDriverRating] = useState<{ avg_driver_rating: number; driver_rating_count: number }>({ avg_driver_rating: 0, driver_rating_count: 0 });
  const [loading, setLoading] = useState(true);
  const [isVerifiedOwner, setIsVerifiedOwner] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [vehicleImgError, setVehicleImgError] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  const likeButtonRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === post.author_id;
  const spotOrReview = isSpotOrReview(post);
  const typeLabel = getTypeLabel(post);
  const isRareFind = (post as any).rare_find || (post as any).spot_count != null && (post as any).spot_count < 5;

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const loadCommentPreview = async () => {
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
    } catch {}
  };

  useEffect(() => {
    loadCommentPreview();
    loadAuthorBadges();
  }, [post.id]);

  const loadAuthorBadges = async () => {
    try {
      setLoading(true);
      const [userBadges, rating, verifiedVehicles] = await Promise.all([
        getUserBadges(post.author_id),
        getUserDriverRating(post.author_id),
        supabase.from('vehicles').select('id').eq('owner_id', post.author_id).eq('is_verified', true).limit(1)
      ]);
      const badges = userBadges.map(ub => ub.badge).filter(b => b !== null && b !== undefined && b.rarity && b.icon_name);
      setAuthorBadges(badges);
      setDriverRating(rating);
      setIsVerifiedOwner((verifiedVehicles.data?.length || 0) > 0);
    } catch {} finally {
      setLoading(false);
    }
  };

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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return postDate.toLocaleDateString();
  };

  const hasRatings = (post as any).rating_vehicle || (post as any).rating_driver || (post as any).rating_driving;
  const hasDetailRatings = (post as any).spot_type === 'full' && (
    (post as any).looks_rating || (post as any).sound_rating || (post as any).condition_rating
  );
  const pointsEarned = (post as any).spot_type === 'full' ? '+35 pts' : '+15 pts';
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
        className={`card-v3 card-v3-lift transition-all duration-300 relative ${isRareFind ? 'rare-card-v3' : ''}`}
      >
        <div className="absolute top-0 left-[30%] right-[30%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--orange), transparent)' }} />
        {/* ── POST HEADER ─────────────────────────────────── */}
        <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <UserAvatar avatarUrl={post.author.avatar_url} handle={post.author.handle} size="md" />
              {post.profiles?.verified && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent)', border: '1.5px solid var(--surface)' }}
                >
                  <CheckCircle className="w-2.5 h-2.5 text-background fill-current" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowUserModal(true)}
                  className="text-[13px] font-semibold transition-opacity active:opacity-70 text-primary"
                >
                  @{post.author.handle}
                </button>
                {(post as any).author_rank && (post as any).author_rank <= 10 && (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full ml-1"
                    style={{ background: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid var(--orange-muted)' }}>
                    #{(post as any).author_rank}
                  </span>
                )}
                {isRareFind && (
                  <span style={{
                    fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 10,
                    background: 'rgba(249,115,22,.12)', color: '#F97316',
                    border: '1px solid rgba(249,115,22,.2)', marginLeft: 6,
                  }}>Rare Find</span>
                )}
                {isVerifiedOwner && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--steel-dim)', color: 'var(--accent)', border: '1px solid rgba(90,122,154,0.20)', letterSpacing: '0.8px' }}
                  >
                    OWNER
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {!loading && authorBadges.length > 0 && (
                  <BadgeList badges={authorBadges} maxDisplay={3} size="sm" />
                )}
                {!loading && driverRating.avg_driver_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5" style={{ color: 'var(--rep)', fill: 'var(--rep)' }} />
                    <span className="text-[11px]" style={{ color: 'var(--rep)' }}>{driverRating.avg_driver_rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-[11px] font-mono text-tertiary">{formatTimeAgo(post.created_at)}</span>
                <span className="tag-chip">
                  {typeLabel}
                </span>
                {spotOrReview && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {pointsEarned}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors text-tertiary hover:bg-[var(--surface-2)]"
              >
                <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {showOptions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                  <div className="card-v3 absolute right-0 mt-1 w-40 z-50">
                    <button
                      onClick={() => { setShowEditModal(true); setShowOptions(false); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-[13px] text-primary border-b hover:bg-[var(--surface-2)]"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Edit className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                      Edit Post
                    </button>
                    <button
                      onClick={() => { handleDelete(); setShowOptions(false); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-[13px] hover:bg-[var(--surface-2)]"
                      style={{ color: 'var(--negative)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── SPOT / REVIEW CARD BODY ──────────────────────── */}
        {spotOrReview ? (
          <div>
            {/* Vehicle hero — spotter photo takes priority, then stock image */}
            <div className="relative w-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              {spottedImageUrl ? (
                <img
                  src={spottedImageUrl}
                  alt={vehicleDisplay || 'Spotted vehicle'}
                  className="w-full object-cover"
                  style={{ maxHeight: 240, minHeight: 140 }}
                  onError={() => handleImageError(0)}
                />

              ) : post.video_url ? (
                <div className="w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                  <VideoPlayer src={post.video_url} className="w-full" />
                </div>
              ) : vehicleImage ? (
                <img
                  src={vehicleImage}
                  alt={vehicleDisplay || 'Vehicle'}
                  className="w-full object-cover"
                  style={{ maxHeight: 180, minHeight: 100 }}
                  onError={() => setVehicleImgError(true)}
                />
              ) : (
                <div
                  className="w-full flex items-center justify-center"
                  style={{ height: 60, background: 'linear-gradient(135deg, var(--bg) 0%, var(--s2) 100%)' }}
                >
                  <Car className="w-6 h-6" style={{ color: '#4a5668' }} strokeWidth={0.8} />
                </div>
              )}

              {/* Overlay badges on hero */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {(post as any).sentiment && (
                  <span
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm flex items-center gap-1"
                    style={{
                      background: (post as any).sentiment === 'love' ? 'rgba(244,63,94,0.85)' : 'rgba(75,85,99,0.85)',
                      color: '#fff',
                    }}
                  >
                    {(post as any).sentiment === 'love' ? (
                      <><Heart className="w-3 h-3 fill-current" /> Love it</>
                    ) : (
                      <><ThumbsDown className="w-3 h-3" /> Not a fan</>
                    )}
                  </span>
                )}
              </div>

              {/* Plate pill overlaid on hero */}
              {vehicleData?.plate_number && (
                <div
                  className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
                  style={{ background: 'rgba(30,42,58,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="font-mono text-[11px] font-bold text-white tracking-widest">
                    {vehicleData.plate_state ? `${vehicleData.plate_state} · ` : ''}{vehicleData.plate_number}
                  </span>
                </div>
              )}
            </div>

            {/* Vehicle identity bar — compact inline */}
            {(vehicleDisplay || vehicleData?.plate_number) && (
              <div
                className={`px-3 py-2 flex items-center gap-2 border-b ${vehicleData?.id ? 'cursor-pointer active:opacity-80' : ''}`}
                style={{ background: 'rgba(20,28,40,.8)', borderColor: 'rgba(255,255,255,.03)' }}
                onClick={vehicleData?.id ? () => setShowVehicleModal(true) : undefined}
              >
                {vehicleData?.plate_number && (
                  <span className="font-mono text-[11px] font-bold tracking-widest px-2 py-1 rounded"
                    style={{ background: 'var(--s3)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,.06)' }}>
                    {vehicleData.plate_number}
                  </span>
                )}
                <span className="text-[11px] text-secondary font-light flex-1 truncate">{vehicleDisplay}</span>
                {pointsEarned && (
                  <span className="font-mono text-[11px] font-semibold" style={{ color: '#F97316', textShadow: '0 0 8px rgba(249,115,22,.15)' }}>
                    {pointsEarned}
                  </span>
                )}
              </div>
            )}

            {/* Compact ratings — single row */}
            {hasRatings && (
              <div
                className="px-3 py-2 flex items-center gap-3 border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {/* Overall score */}
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />
                  <span className="font-mono text-[14px] font-bold" style={{ color: 'var(--t1)' }}>
                    {(() => {
                      const sum = ((post as any).rating_driver || 0) + ((post as any).rating_driving || 0) + ((post as any).rating_vehicle || 0);
                      const count = ((post as any).rating_driver ? 1 : 0) + ((post as any).rating_driving ? 1 : 0) + ((post as any).rating_vehicle ? 1 : 0);
                      return (sum / (count || 1)).toFixed(1);
                    })()}
                  </span>
                </div>
                {/* Mini category chips */}
                <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                  {[
                    { key: 'rating_driver', label: 'DRV' },
                    { key: 'rating_driving', label: 'DRG' },
                    { key: 'rating_vehicle', label: 'VHC' },
                  ].filter(r => (post as any)[r.key]).map(r => (
                    <span key={r.key} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--s2)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,.04)' }}>
                      {r.label} {(post as any)[r.key]}
                    </span>
                  ))}
                  {hasDetailRatings && [
                    { key: 'looks_rating', label: 'LKS' },
                    { key: 'sound_rating', label: 'SND' },
                    { key: 'condition_rating', label: 'CND' },
                  ].filter(r => (post as any)[r.key]).map(r => (
                    <span key={r.key} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--s2)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,.04)' }}>
                      {r.label} {(post as any)[r.key]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Caption / comment */}
            {post.caption && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[13px] leading-[1.65] text-primary">
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>@{post.author.handle}</span>
                  {isVerifiedOwner && <CheckCircle className="inline w-3 h-3 ml-0.5 mb-0.5" style={{ color: 'var(--accent)' }} />}
                  {' '}{post.caption}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── REGULAR PHOTO / POST BODY ───────────────────── */
          <>
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="w-full bg-black">
                <div className={`w-full ${post.image_urls.length === 1 ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-px'}`}>
                  {post.image_urls.map((url, index) => (
                    <div key={index} className="relative overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      {!imageErrors.has(index) ? (
                        <img
                          src={url}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-full object-cover"
                          style={{
                            maxHeight: post.image_urls!.length === 1 ? '280px' : '240px',
                            minHeight: post.image_urls!.length === 1 ? '140px' : '140px',
                          }}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          onError={() => handleImageError(index)}
                        />
                      ) : (
                        <div
                          className="w-full flex flex-col items-center justify-center"
                          style={{
                            maxHeight: post.image_urls!.length === 1 ? '280px' : '240px',
                            minHeight: post.image_urls!.length === 1 ? '140px' : '140px',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          <ImageOff className="w-8 h-8 mb-1.5" strokeWidth={1} />
                          <p className="text-[11px]">Image unavailable</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {post.video_url && (
              <div className="w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                <VideoPlayer src={post.video_url} className="w-full" />
              </div>
            )}

            <div className="px-3 pb-3 pt-2 space-y-2">
              {post.caption && (
                <p className="text-[13px] leading-[1.65] text-primary">
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>@{post.author.handle}</span>
                  {isVerifiedOwner && <CheckCircle className="inline w-3 h-3 ml-0.5 mb-0.5" style={{ color: 'var(--accent)' }} />}
                  {' '}{post.caption}
                </p>
              )}
              {post.location && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <MapPin className="w-3 h-3 text-tertiary" strokeWidth={1.5} />
                  <span className="text-[11px] text-secondary">{post.location}</span>
                </div>
              )}
              {!loading && driverRating.avg_driver_rating > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating value={driverRating.avg_driver_rating} readonly size="sm" showCount={false} />
                  <span className="text-[11px] text-tertiary">({driverRating.driver_rating_count})</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ACTIONS ──────────────────────────────────────── */}
        <div className="px-3 py-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-5">
            <div ref={likeButtonRef}>
              <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
            </div>

            <button
              onClick={handleCommentClick}
              className="min-h-[44px] flex items-center gap-1.5 transition-colors text-tertiary hover:text-secondary"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
              {totalComments > 0 && <span className="text-[13px] font-mono">{totalComments}</span>}
            </button>

            <div ref={shareButtonRef}>
              <ShareButton post={post} />
            </div>
          </div>
          {spotOrReview && pointsEarned && (
            <span className="mono" style={{
              fontSize: 11, fontWeight: 600, color: '#F97316',
              textShadow: '0 0 8px rgba(249,115,22,.15)',
            }}>
              {pointsEarned}
            </span>
          )}
        </div>

        {/* ── COMMENT PREVIEW ──────────────────────────────── */}
        {commentPreview.length > 0 && (
          <div ref={commentSectionRef} className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {totalComments > 2 && (
              <button
                onClick={handleCommentClick}
                className="mt-3 text-[12px] transition-colors text-tertiary hover:text-secondary"
              >
                View all {totalComments} comments
              </button>
            )}
            <div className="space-y-2 mt-2">
              {commentPreview.slice(0, 2).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <UserAvatar avatarUrl={comment.author.avatar_url} handle={comment.author.handle} size="sm" />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setShowUserModal(true)}
                      className="text-[13px] font-semibold transition-opacity active:opacity-70"
                      style={{ color: 'var(--accent)' }}
                    >
                      @{comment.author.handle}
                    </button>
                    <span className="text-[13px] ml-2 text-primary">
                      {comment.text.length > 120 ? `${comment.text.substring(0, 120)}…` : comment.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          post={post}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => { setShowEditModal(false); showToast('Post updated!', 'success'); }}
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
        <PublicProfileModal
          userId={post.author_id}
          onClose={() => setShowUserModal(false)}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
