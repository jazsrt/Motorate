import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { ReactionButton } from '../ReactionButton';
import { CommentsModal } from '../CommentsModal';
import { trackPostView } from '../../lib/postViews';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface FeedPostCardProps {
  post: {
    id: string;
    created_at: string;
    author_id: string;
    post_type?: string | null;
    spot_type?: 'quick' | 'full' | null;
    content_type?: string | null;
    caption?: string | null;
    image_urls?: string[] | null;
    video_url?: string | null;
    vehicle_id?: string | null;
    like_count?: number;
    comment_count?: number;
    view_count?: number;
    looks_rating?: number | null;
    sound_rating?: number | null;
    condition_rating?: number | null;
    vehicles?: {
      id: string;
      make: string | null;
      model: string | null;
      year: number | null;
      color: string | null;
      plate_number?: string | null;
      plate_state?: string | null;
      stock_image_url?: string | null;
      profile_image_url?: string | null;
      is_claimed?: boolean | null;
      owner_id?: string | null;
      reputation_score?: number | null;
      spots_count?: number | null;
    } | null;
    profiles?: { id?: string; handle?: string | null; avatar_url?: string | null; reputation_score?: number | null; } | null;
    author?: { id: string; handle: string; avatar_url: string | null; };
    author_handle?: string | null;
    author_avatar_url?: string | null;
    location?: string | null;
    location_label?: string | null;
    badge_id?: string | null;
    badge_icon_path?: string | null;
  };
  vehicleRank?: number | null;
  currentUserId?: string | null;
  onNavigate?: (page: string, data?: unknown) => void;
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function getBadgeTierColors(caption: string | null | undefined): { color: string; glow: string; atmo: string } {
  const c = (caption || '').toLowerCase();
  if (c.includes('platinum')) return { color: '#D0D0CE', glow: 'rgba(208,208,206,0.9)', atmo: 'rgba(195,210,240,0.1)' };
  if (c.includes('gold'))     return { color: '#C4921A', glow: 'rgba(196,146,26,0.9)',  atmo: 'rgba(185,138,22,0.14)' };
  if (c.includes('silver'))   return { color: '#A8A8A8', glow: 'rgba(168,168,168,0.8)', atmo: 'rgba(160,160,160,0.08)' };
  return                             { color: '#9B6B3A', glow: 'rgba(155,107,58,0.8)',  atmo: 'rgba(140,90,30,0.1)' };
}

// Accent bar + chip config per post type
function getPostTypeConfig(postType: string | null | undefined) {
  switch (postType) {
    case 'spot': return { bar: 'linear-gradient(90deg, rgba(249,115,22,0.8), transparent)', chip: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', color: '#F97316', label: 'SPOTTED' } };
    case 'owner_post': case 'post': return { bar: 'linear-gradient(90deg, rgba(32,192,96,0.8), transparent)', chip: { bg: 'rgba(32,192,96,0.15)', border: 'rgba(32,192,96,0.3)', color: '#20c060', label: 'OWNER' } };
    case 'badge': case 'badge_given': return { bar: 'linear-gradient(90deg, rgba(240,160,48,0.8), transparent)', chip: { bg: 'rgba(240,160,48,0.15)', border: 'rgba(240,160,48,0.3)', color: '#f0a030', label: 'BADGE' } };
    default: return null;
  }
}

export function FeedPostCard({ post, currentUserId, onNavigate }: FeedPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imageAspect, setImageAspect] = useState<number>(56.25);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!cardRef.current || viewTracked.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewTracked.current) {
          viewTracked.current = true;
          trackPostView(post.id, currentUserId);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, currentUserId]);

  const vehicles = post.vehicles;
  const ownerHandle = post.author?.handle || post.author_handle || post.profiles?.handle || 'owner';

  const imageUrl = (post.image_urls && post.image_urls.length > 0 && post.image_urls[0])
    || vehicles?.profile_image_url
    || vehicles?.stock_image_url
    || null;

  const isVideo = post.video_url && (post.content_type === 'video' || post.post_type === 'video');
  const isBadgePost = post.post_type === 'badge' || post.post_type === 'badge_given';
  const badgeImageUrl = post.badge_icon_path ? `/badges/${post.badge_icon_path}` : null;
  const tierColors = isBadgePost ? getBadgeTierColors(post.caption) : { color: '#C4921A', glow: 'rgba(196,146,26,0.9)', atmo: 'rgba(185,138,22,0.14)' };
  const isPostAuthor = currentUserId === post.author_id;

  // No media = no render for spot/badge posts
  if (!imageUrl && !isVideo && !isBadgePost) {
    if (post.post_type === 'spot' || post.post_type === 'review') return null;
  }

  if (isDeleted) return null;

  const repScore = vehicles?.reputation_score ?? 0;
  const makeLabel = vehicles?.make ?? null;
  const modelLabel = vehicles?.model ?? null;
  const config = getPostTypeConfig(post.post_type);

  const handleCardClick = () => {
    const vid = post.vehicle_id || vehicles?.id;
    if (vid && onNavigate) onNavigate('vehicle-detail', { vehicleId: vid });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalHeight / img.naturalWidth;
      const clamped = Math.max(52.36, Math.min(125, ratio * 100));
      setImageAspect(clamped);
    }
  };

  const handleDeletePost = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isPostAuthor || deleting) return;
    if (!window.confirm('Delete this post from the feed?')) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('author_id', currentUserId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Post was not deleted');

      setIsDeleted(true);
      showToast('Post deleted', 'success');
    } catch (error) {
      console.error('[FeedPostCard] delete failed', error);
      showToast('Failed to delete post', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const aspectPadding = isVideo ? '177%' : isBadgePost ? undefined : `${imageAspect}%`;

  return (
    <>
      {/* Outer wrapper: aspect-ratio via padding trick */}
      <div
        ref={cardRef}
        style={{
          position: 'relative', width: '100%', overflow: 'hidden', marginBottom: 3, cursor: 'pointer',
          animation: 'motorate-fade-in 0.3s ease-out',
          ...(isBadgePost ? { height: 340 } : { paddingBottom: aspectPadding }),
        }}
        onClick={handleCardClick}
      >
        {/* Inner absolute container */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Layer 1: Media */}
          {isVideo ? (
            <video
              src={post.video_url!}
              controls
              playsInline
              preload="metadata"
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }}
            />
          ) : isBadgePost && !imageUrl ? (
            <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
              {/* Atmospheric color */}
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 65% 55% at 50% 33%, ${tierColors.atmo} 0%, transparent 100%)`, zIndex: 1 }} />
              {/* Image zone: top:32px, bottom:130px — badge centered here */}
              <div style={{ position: 'absolute', top: 32, left: 0, right: 0, bottom: 130, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Glow bloom */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, marginTop: -100, marginLeft: -100, borderRadius: '50%', background: `radial-gradient(circle, ${tierColors.glow.replace('0.9', '0.28')} 0%, transparent 70%)`, animation: 'badge-glow-bloom 3s cubic-bezier(.4,0,.2,1) forwards', zIndex: 1 }} />
                {/* Badge image — flex centered */}
                {badgeImageUrl ? (
                  <img
                    src={badgeImageUrl}
                    alt=""
                    style={{ width: 118, height: 118, objectFit: 'contain', display: 'block', position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 28px ${tierColors.glow}) drop-shadow(0 0 10px ${tierColors.color}88)`, animation: 'badge-focus-reveal 3s cubic-bezier(.4,0,.2,1) forwards' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={tierColors.color} strokeWidth="1.1" style={{ display: 'block', position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 16px ${tierColors.glow})`, animation: 'badge-focus-reveal 3s cubic-bezier(.4,0,.2,1) forwards' }}>
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                  </svg>
                )}
              </div>
              {/* Text zone: absolute bottom 130px */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, zIndex: 8, padding: '10px 14px 12px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-end', background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 20%, rgba(0,0,0,0.99) 42%, #000 100%)' }}>
                {/* Separator line */}
                <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: `linear-gradient(90deg, transparent, ${tierColors.color}80, transparent)`, animation: 'badge-line-draw 3s ease-out forwards' }} />
                {/* Eyebrow */}
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: `${tierColors.color}CC`, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, animation: 'badge-text-rise 3s ease-out forwards', opacity: 0 }}>
                  <span style={{ height: 1, width: 12, background: `${tierColors.color}4D`, display: 'inline-block' }} />
                  Achievement Unlocked
                  <span style={{ height: 1, flex: 1, background: `${tierColors.color}1A`, display: 'inline-block' }} />
                </div>
                {/* Badge name */}
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1, letterSpacing: '0.01em', animation: 'badge-text-rise 3s ease-out forwards', animationDelay: '0.07s', opacity: 0 }}>
                  {(post.caption || 'Badge Earned').split(' · ')[0]}
                </div>
                {/* Tier pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, animation: 'badge-text-rise 3s ease-out forwards', animationDelay: '0.14s', opacity: 0 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: tierColors.color, boxShadow: `0 0 6px ${tierColors.glow}` }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: tierColors.color }}>
                    {(post.caption || '').split(' · ')[1] || ''}
                  </span>
                  {(post.caption || '').split(' · ')[2] && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.08)', margin: '0 2px' }}>·</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{(post.caption || '').split(' · ')[2]}</span>
                    </>
                  )}
                </div>
                {/* Action row */}
                <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 6, paddingTop: 6, animation: 'badge-text-rise 3s ease-out forwards', animationDelay: '0.21s', opacity: 0 }}>
                  <div onClick={e => e.stopPropagation()}>
                    <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
                  </div>
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
                  <button onClick={e => { e.stopPropagation(); setShowComments(true); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {(post.comment_count ?? 0) > 0 && <span>{formatCount(post.comment_count)}</span>}
                  </button>
                  {isPostAuthor && (
                    <>
                      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
                      <button
                        onClick={handleDeletePost}
                        disabled={deleting}
                        title="Delete post"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.45 : 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#f87171' }}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                        Delete
                      </button>
                    </>
                  )}
                  <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#3a4e60' }}>
                    by <b style={{ color: '#7a8e9e' }}>@{ownerHandle}</b>
                  </span>
                </div>
              </div>
            </div>
          ) : imageUrl && !imgError ? (
            <>
              <img
                src={imageUrl}
                alt=""
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center center', display: 'block',
                  background: '#030508',
                  filter: isBadgePost ? 'saturate(0.3) brightness(0.45)' : 'none',
                }}
                onLoad={handleImageLoad}
                onError={() => setImgError(true)}
              />
              {isBadgePost && badgeImageUrl && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,48,0.15) 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={badgeImageUrl}
                      alt=""
                      style={{ width: 90, height: 90, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(240,160,48,0.5))' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a2535, #0d1520, #08101a)' }}>
              {/* HUD grid texture */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.08, zIndex: 1, backgroundImage: 'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              {/* Scan line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)', animation: 'motorate-scan 3s linear infinite', zIndex: 4 }} />
            </div>
          )}

          {/* Layer 2: Gradient overlay */}
          {!isVideo && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(180deg, rgba(3,5,8,0) 0%, rgba(3,5,8,0.02) 40%, rgba(3,5,8,0.6) 65%, rgba(3,5,8,0.95) 85%, rgba(3,5,8,0.99) 100%)',
            }} />
          )}

          {/* Layer 3: Accent bar */}
          {config && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 3, background: config.bar }} />
          )}

          {/* Layer 4: Post type chip */}
          {config && (
            <div style={{
              position: 'absolute', top: 8, left: 10, zIndex: 3,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
              letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3,
              background: config.chip.bg, border: `1px solid ${config.chip.border}`, color: config.chip.color,
            }}>
              {config.chip.label}
            </div>
          )}

          {/* Layer 5: Rank pill */}
          {repScore > 100 && (
            <div style={{
              position: 'absolute', top: 8, right: 10, zIndex: 3,
              background: 'rgba(3,5,8,0.85)', border: '1px solid #F97316', borderRadius: 3, padding: '3px 7px',
              fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: '#eef4f8',
            }}>
              {formatCount(repScore)} RP
            </div>
          )}

          {/* Layer 6: Bottom content overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px', zIndex: 2 }}>
            {/* Row A: Vehicle identity */}
            {makeLabel && (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F97316', lineHeight: 1 }}>
                {makeLabel}
              </div>
            )}
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1.1 }}>
              {modelLabel || (isBadgePost ? (post.caption || 'Badge Earned') : '---')}
            </div>

            {/* Ratings strip — spot posts with ratings only */}
            {post.post_type === 'spot' && (post.looks_rating || post.sound_rating || post.condition_rating) && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
                {post.looks_rating != null && (
                  <>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#f0a030' }}>★ {post.looks_rating}.0</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>Looks</span>
                  </>
                )}
                {post.sound_rating != null && (
                  <>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#f0a030' }}>★ {post.sound_rating}.0</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>Sound</span>
                  </>
                )}
                {post.condition_rating != null && (
                  <>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#f0a030' }}>★ {post.condition_rating}.0</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>Cond.</span>
                  </>
                )}
              </div>
            )}

            {/* Caption — non-badge posts only, 2 lines max */}
            {post.caption && !isBadgePost && (
              <div style={{
                fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#a8bcc8',
                lineHeight: 1.4, marginTop: 3, marginBottom: 2,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {post.caption}
              </div>
            )}

            {/* Row C: Action row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6,
            }}>
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
                <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
              </div>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <button
                onClick={e => { e.stopPropagation(); setShowComments(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                {(post.comment_count ?? 0) > 0 && <span>{formatCount(post.comment_count)}</span>}
              </button>
              {isPostAuthor && (
                <>
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                  <button
                    onClick={handleDeletePost}
                    disabled={deleting}
                    title="Delete post"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.45 : 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#f87171' }}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                    Delete
                  </button>
                </>
              )}
              {(post.view_count ?? 0) > 0 && (
                <>
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#3a4e60' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {formatCount(post.view_count)}
                  </div>
                </>
              )}
              <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#3a4e60' }}>
                by <b style={{ color: '#7a8e9e' }}>@{ownerHandle}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentsModal postId={post.id} postAuthor={ownerHandle} onClose={() => setShowComments(false)} onNavigate={onNavigate} />
      )}

    </>
  );
}
