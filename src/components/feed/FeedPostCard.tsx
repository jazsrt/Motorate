import { useState } from 'react';
import { ReactionButton } from '../ReactionButton';
import { CommentsModal } from '../CommentsModal';
import { LicensePlate } from '../LicensePlate';
import { buildSpotFeedSignals } from '../../lib/feed';

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
  onNavigate?: (page: string, data?: any) => void;
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

  // Image source priority: user photo > vehicle profile > stock image
  const imageUrl = (post.image_urls && post.image_urls.length > 0 && post.image_urls[0])
    || vehicles?.profile_image_url
    || vehicles?.stock_image_url
    || null;

  // Hard rule: no image = no card render for spot/review posts
  const isSpotType = (post as any).post_type === 'spot' || (post as any).post_type === 'review';
  if (!imageUrl && isSpotType) return null;

  const hasPhoto = !!imageUrl;

  // Build impact signals for spot posts
  const isSpot = isSpotType;
  const spotSignals = isSpot ? buildSpotFeedSignals({
    postId: post.id,
    spotType: post.spot_type,
    spotsCount: vehicles?.spots_count,
    reputationScore: vehicles?.reputation_score,
  }) : null;

  // Activity label
  const repScore = vehicles?.reputation_score ?? 0;
  const likeCount = post.like_count ?? 0;
  const activityLabel = (likeCount > 500 || repScore > 15000) ? 'Trending'
    : (likeCount > 100 || repScore > 5000) ? 'Active'
    : null;

  // Vehicle headline
  const makeLabel = vehicles?.make ?? null;
  const modelLabel = vehicles?.model ?? null;
  const yearLabel = vehicles?.year ?? null;

  return (
    <>
      <div style={{ marginTop: 4, borderTop: '1px solid rgba(249,115,22,0.12)' }}>
        {/* SPOT SIGNAL STRIP — only for spot/review posts */}
        {isSpot && spotSignals && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#070a0f' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#F97316' }}>
              {spotSignals.primarySignal}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: '#7a8e9e', fontVariantNumeric: 'tabular-nums' }}>
              {spotSignals.impactSignal}
            </span>
          </div>
        )}

        {/* MEDIA ZONE — image is the hero */}
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#0a0d14', height: hasPhoto ? 300 : 220 }}>
          {hasPhoto ? (
            <img src={imageUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #070a0f 0%, #0a0d14 40%, #070a0f 100%)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
              {/* Subtle grid texture */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
              {/* Scan line */}
              <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)', animation: 'motorate-scan 3s ease-in-out infinite', pointerEvents: 'none' }} />
              {/* Plate */}
              <div style={{ position: 'relative', zIndex: 2, cursor: 'pointer' }} onClick={() => onNavigate?.('vehicle-detail', vehicles?.id)}>
                <LicensePlate plateNumber={vehicles?.plate_number || '?????'} plateState={vehicles?.plate_state || ''} size="lg" />
              </div>
              {/* Vehicle name */}
              {(vehicles?.make || vehicles?.model) && (
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'rgba(249,115,22,0.7)', marginBottom: 3 }}>{vehicles?.make ?? ''}</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{vehicles?.model ?? ''}</div>
                </div>
              )}
              {/* Bottom fade */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(3,5,8,0.95) 0%, transparent 100%)', pointerEvents: 'none' }} />
            </div>
          )}

          {/* Bottom gradient for text readability */}
          {hasPhoto && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, rgba(3,5,8,0.95) 0%, rgba(3,5,8,0.5) 50%, transparent 100%)', pointerEvents: 'none' }} />
          )}

          {/* Activity indicator top-left */}
          {activityLabel && hasPhoto && (
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(6,9,14,0.76)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '3px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#20c060', animation: 'motorate-pulse 2s infinite' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>{activityLabel}</span>
            </div>
          )}

          {/* Rank pill top-right */}
          {vehicleRank != null && hasPhoto && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', background: 'rgba(6,9,14,0.82)', backdropFilter: 'blur(14px)', border: '1px solid rgba(249,115,22,0.38)', borderRadius: 6, padding: '4px 9px', minWidth: 40 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#F97316', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>#{vehicleRank}</span>
            </div>
          )}

          {/* Vehicle identity — overlaid on image bottom-left */}
          {hasPhoto && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 5, padding: '10px 14px' }}>
              {/* MAKE as overline */}
              {makeLabel && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'rgba(249,115,22,0.85)', marginBottom: 1 }}>
                  {yearLabel ? `${yearLabel} ${makeLabel}` : makeLabel}
                </div>
              )}
              {/* MODEL as headline */}
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1, textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}>
                {modelLabel ?? '---'}
              </div>
              {/* Plate as small secondary */}
              {(vehicles?.plate_number || vehicles?.plate_state) && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {vehicles?.plate_state ? `${vehicles.plate_state} / ` : ''}{vehicles?.plate_number}
                </div>
              )}
              {cityLabel && (
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                  {cityLabel}
                </div>
              )}
            </div>
          )}

          {/* RP badge bottom-right over image */}
          {hasPhoto && repScore > 0 && (
            <div style={{ position: 'absolute', bottom: 10, right: 14, zIndex: 5, display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>{formatRP(repScore)}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(249,115,22,0.6)' }}>RP</span>
            </div>
          )}
        </div>

        {/* IMPACT ROW — spot stats */}
        {isSpot && vehicles && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 14px', background: '#070a0f', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {[
              { v: formatRP(vehicles.reputation_score), raw: vehicles.reputation_score, l: 'RP', hi: true },
              { v: formatCount(vehicles.spots_count), raw: vehicles.spots_count, l: 'Spots', hi: false },
            ].filter(({ raw }) => raw != null && raw > 0).map(({ v, l, hi }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: hi ? '#F97316' : '#eef4f8', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{l}</span>
              </div>
            ))}
            {post.spot_type && (
              <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: post.spot_type === 'full' ? 'rgba(249,115,22,0.6)' : '#3a4e60' }}>
                {post.spot_type === 'full' ? 'Full Spot' : 'Quick Spot'}
              </span>
            )}
          </div>
        )}

        {/* ACTION ROW */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px 6px', background: '#070a0f', gap: 0 }}>
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

        {/* CAPTION — only if user-written, skip generic defaults */}
        {post.caption && post.caption !== 'Spotted this ride!' && post.caption !== 'Full spot on this ride!' && (
          <div style={{ padding: '0 14px 8px', background: '#070a0f' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', lineHeight: 1.5, margin: 0 }}>
              {post.caption.length > 140 ? `${post.caption.slice(0, 140)}...` : post.caption}
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
        @keyframes motorate-scan {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </>
  );
}
