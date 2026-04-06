import { useState, useEffect, useRef } from 'react';
import { ReactionButton } from '../ReactionButton';
import { CommentsModal } from '../CommentsModal';
import { trackPostView } from '../../lib/postViews';

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

// Accent bar + chip config per post type
function getPostTypeConfig(postType: string | null | undefined) {
  switch (postType) {
    case 'spot': return { bar: 'linear-gradient(90deg, rgba(249,115,22,0.8), transparent)', chip: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', color: '#F97316', label: 'SPOTTED' } };
    case 'owner_post': case 'post': return { bar: 'linear-gradient(90deg, rgba(32,192,96,0.8), transparent)', chip: { bg: 'rgba(32,192,96,0.15)', border: 'rgba(32,192,96,0.3)', color: '#20c060', label: 'OWNER' } };
    case 'badge': case 'badge_given': return { bar: 'linear-gradient(90deg, rgba(240,160,48,0.8), transparent)', chip: { bg: 'rgba(240,160,48,0.15)', border: 'rgba(240,160,48,0.3)', color: '#f0a030', label: 'BADGE' } };
    default: return null;
  }
}

export function FeedPostCard({ post, vehicleRank, currentUserId, onNavigate }: FeedPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

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

  // No media = no render for spot/badge posts
  if (!imageUrl && !isVideo && !isBadgePost) {
    if (post.post_type === 'spot' || post.post_type === 'review') return null;
  }

  const repScore = vehicles?.reputation_score ?? 0;
  const makeLabel = vehicles?.make ?? null;
  const modelLabel = vehicles?.model ?? null;
  const config = getPostTypeConfig(post.post_type);

  const handleCardClick = () => {
    const vid = post.vehicle_id || vehicles?.id;
    if (vid && onNavigate) onNavigate('vehicle-detail', { vehicleId: vid });
  };

  // Aspect ratio: 4:5 portrait for images, 9:16 for video, square for badge/fallback
  const aspectPadding = isVideo ? '177%' : (isBadgePost && !imageUrl) ? '100%' : '125%';

  return (
    <>
      {/* Outer wrapper: aspect-ratio via padding trick */}
      <div
        ref={cardRef}
        style={{ position: 'relative', width: '100%', paddingBottom: aspectPadding, overflow: 'hidden', marginBottom: 3, cursor: 'pointer', animation: 'motorate-fade-in 0.3s ease-out' }}
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
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #131d2a 0%, #060a10 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f0a030" strokeWidth="1.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#f0a030', textAlign: 'center', zIndex: 2, position: 'relative' }}>Badge Earned</span>
            </div>
          ) : imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block', filter: 'saturate(0.9) brightness(0.95)' }}
              onError={() => setImgError(true)}
            />
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
