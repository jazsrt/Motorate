import { useState } from 'react';
import { ReactionButton } from '../ReactionButton';
import { CommentsModal } from '../CommentsModal';
import { LicensePlate } from '../LicensePlate';

interface FeedPostCardProps {
  post: {
    id: string;
    created_at: string;
    author_id: string;
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
  onNavigate?: (page: string, data?: any) => void;
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatRP(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function extractCityOnly(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/^\d/.test(raw.trim())) return null;
  if (/\b(st|ave|blvd|dr|rd|ln|way|ct|pl|hwy|pkwy|cir|loop)\b/i.test(raw)) return null;
  const city = raw.split(',')[0].trim();
  if (city.length > 30) return null;
  return city || null;
}

function TrackButton({ vehicleId }: { vehicleId: string | null }) {
  const [tracking, setTracking] = useState(false);
  if (!vehicleId) return null;
  return (
    <button onClick={() => setTracking(!tracking)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: tracking ? '#F97316' : '#5a6e7e', padding: '6px 8px 6px 0', transition: 'color 0.15s' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={tracking ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    </button>
  );
}

export function FeedPostCard({ post, vehicleRank, currentUserId, onNavigate }: FeedPostCardProps) {
  const [showComments, setShowComments] = useState(false);

  const vehicles = post.vehicles;
  const ownerHandle = post.author?.handle || (post as any).author_handle || post.profiles?.handle || 'owner';
  const cityLabel = extractCityOnly(post.location_label || post.location);

  // Image source priority
  const imageUrl = (post.image_urls && post.image_urls.length > 0 && post.image_urls[0])
    || vehicles?.profile_image_url
    || vehicles?.stock_image_url
    || null;

  const hasPhoto = !!imageUrl;

  // Activity label
  const repScore = vehicles?.reputation_score ?? 0;
  const likeCount = post.like_count ?? 0;
  const activityLabel = (likeCount > 500 || repScore > 15000) ? 'Trending'
    : (likeCount > 100 || repScore > 5000) ? 'Active'
    : null;

  // Stats
  const spotCount = (vehicles as any)?.spot_count ?? null;
  const fanCount = (vehicles as any)?.follower_count ?? (vehicles as any)?.vehicle_follower_count ?? null;

  return (
    <>
      <div style={{ marginTop: 6, borderTop: '1px solid rgba(249,115,22,0.15)' }}>
        {/* MEDIA ZONE */}
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#0a0d14', height: 330 }}>
          {hasPhoto ? (
            <img src={imageUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative',
              background: 'radial-gradient(ellipse 70% 65% at 50% 42%, #1a2540 0%, #0a0d14 60%, #030508 100%)',
              backgroundImage: 'linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LicensePlate
                plateNumber={vehicles?.plate_number || ''}
                plateState={vehicles?.plate_state || ''}
                size="lg"
              />
            </div>
          )}

          {/* Gradient overlays (on photo only) */}
          {hasPhoto && (
            <>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%', background: 'linear-gradient(to bottom, rgba(3,5,8,0.72) 0%, transparent 100%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%', background: 'linear-gradient(to top, rgba(3,5,8,0.98) 0%, rgba(3,5,8,0.55) 45%, transparent 100%)', pointerEvents: 'none' }} />
            </>
          )}

          {/* Activity indicator top-left */}
          {activityLabel && (
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(6,9,14,0.76)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '4px 9px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#20c060', animation: 'motorate-pulse 2s infinite' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>{activityLabel}</span>
            </div>
          )}

          {/* Rank pill top-right */}
          {vehicleRank != null && (
            <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 5, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', background: 'rgba(6,9,14,0.82)', backdropFilter: 'blur(14px)', border: '1px solid rgba(249,115,22,0.38)', borderRadius: 6, padding: '5px 10px', minWidth: 44 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#F97316', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>#{vehicleRank}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 1 }}>CHI</span>
            </div>
          )}

          {/* Vehicle identity bottom-left */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 5, padding: '12px 14px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: 'rgba(249,115,22,0.88)', marginBottom: 1 }}>
              {vehicles?.make ?? '—'}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: '#eef4f8', lineHeight: 1, textShadow: '0 2px 18px rgba(0,0,0,0.95)' }}>
              {vehicles?.model ?? '—'}
            </div>
            {(vehicles?.plate_number || vehicles?.plate_state) && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.14em', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                {vehicles?.plate_state ? `${vehicles.plate_state} · ` : ''}{vehicles?.plate_number}
              </div>
            )}
            {cityLabel && (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                {cityLabel}
              </div>
            )}
          </div>

          {/* Stats bottom-right */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 5, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4 }}>
            {[
              { v: formatRP(vehicles?.reputation_score), l: 'RP', hi: true },
              { v: formatCount(spotCount), l: 'Spots', hi: false },
              { v: formatCount(fanCount), l: 'Fans', hi: false },
            ].map(({ v, l, hi }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: hi ? '#F97316' : '#eef4f8', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACTION ROW */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px 8px', background: '#070a0f', gap: 0 }}>
          <ReactionButton postId={post.id} initialCount={post.like_count} onNavigate={onNavigate} />
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 8px' }} />
          <button onClick={() => setShowComments(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#5a6e7e', padding: '6px 8px 6px 0' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {(post.comment_count ?? 0) > 0 && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>{formatCount(post.comment_count)}</span>}
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 8px 0 0' }} />
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#5a6e7e', padding: '6px 8px 6px 0' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 8px 0 0' }} />
          <TrackButton vehicleId={vehicles?.id ?? null} />
          <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#3a4e60', whiteSpace: 'nowrap' }}>
            by <b style={{ color: '#5a6e7e', fontWeight: 600 }}>@{ownerHandle}</b>
          </span>
        </div>

        {/* CAPTION */}
        {post.caption && (
          <div style={{ padding: '0 14px 10px', background: '#070a0f' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', lineHeight: 1.55, margin: 0 }}>
              {post.caption.length > 140 ? `${post.caption.slice(0, 140)}…` : post.caption}
            </p>
          </div>
        )}
      </div>

      {/* Comments modal */}
      {showComments && (
        <CommentsModal postId={post.id} postAuthor={ownerHandle} onClose={() => setShowComments(false)} onNavigate={onNavigate} />
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes motorate-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.85); }
        }
      `}</style>
    </>
  );
}
