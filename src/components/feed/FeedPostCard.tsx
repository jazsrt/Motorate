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

function formatRP(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}


export function FeedPostCard({ post, vehicleRank, currentUserId, onNavigate }: FeedPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [viewCount, setViewCount] = useState(post.view_count ?? 0);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!cardRef.current || viewTracked.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewTracked.current) {
          viewTracked.current = true;
          trackPostView(post.id, currentUserId);
          setViewCount(v => v + 1);
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


  // Image source priority: user photo > vehicle profile > stock image
  const imageUrl = (post.image_urls && post.image_urls.length > 0 && post.image_urls[0])
    || vehicles?.profile_image_url
    || vehicles?.stock_image_url
    || null;

  // Hard rule: no image = no card render for spot/review/badge posts
  const isSpotType = post.post_type === 'spot' || post.post_type === 'review';
  if (!imageUrl && isSpotType) return null;
  if (!imageUrl && post.post_type === 'badge_given') return null;

  const hasPhoto = !!imageUrl;

  const repScore = vehicles?.reputation_score ?? 0;

  // Vehicle headline
  const makeLabel = vehicles?.make ?? null;
  const modelLabel = vehicles?.model ?? null;
  const yearLabel = vehicles?.year ?? null;

  return (
    <>
      <div ref={cardRef} style={{ background: '#0a0d14', borderTop: '1px solid rgba(249,115,22,0.08)', marginBottom: 2 }}>
        {/* MEDIA ZONE — clean image, no overlays per mockup */}
        {hasPhoto && (
          <img src={imageUrl!} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}

        {/* SIGNAL STRIP — vehicle make/model + RP score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#070a0f' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>
            {makeLabel && <>{makeLabel} </>}<b style={{ color: '#eef4f8' }}>{modelLabel || '---'}</b>
          </span>
          {repScore > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: '#F97316' }}>
              {formatRP(repScore)} RP
            </span>
          )}
        </div>

        {/* CAPTION — only if user-written, skip generic defaults */}
        {(() => {
          if (!post.caption) return null;
          const cleaned = post.caption.replace(/\bnull\b/g, '').replace(/\s{2,}/g, ' ').trim();
          if (!cleaned || cleaned === 'Spotted this ride!' || cleaned === 'Full spot on this ride!') return null;
          return (
            <div style={{ padding: '0 14px 10px', background: '#070a0f' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', lineHeight: 1.5, margin: 0 }}>
                {cleaned.length > 140 ? `${cleaned.slice(0, 140)}...` : cleaned}
              </p>
            </div>
          );
        })()}

        {/* ACTION ROW — heart, comment, share, views, byline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: 0, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
            <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
          </div>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />
          <button onClick={() => setShowComments(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {(post.comment_count ?? 0) > 0 && <span>{formatCount(post.comment_count)}</span>}
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#5a6e7e' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {viewCount > 0 && <span>{formatCount(viewCount)}</span>}
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#3a4e60', paddingRight: 12 }}>
            by <b style={{ color: '#7a8e9e' }}>@{ownerHandle}</b>
          </span>
        </div>
      </div>

      {/* Comments modal */}
      {showComments && (
        <CommentsModal postId={post.id} postAuthor={ownerHandle} onClose={() => setShowComments(false)} onNavigate={onNavigate} />
      )}

    </>
  );
}
