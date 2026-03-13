import { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useVehicleTracking } from '../../hooks/useVehicleTracking';
import {
  getVehicleClaimStatus,
  getVehicleImage,
  getVehicleDisplayName,
  getOwnerRPStrip,
  formatRP,
  formatCount,
  formatSpotTime,
} from '../../lib/vehicleUtils';
import { getTierFromScore } from '../../lib/tierConfig';
import { CommentsModal } from '../CommentsModal';

interface StreamPostCardProps {
  post: {
    id: string;
    created_at: string;
    author_id: string;
    vehicle_id?: string | null;
    vehicles?: {
      id: string;
      make: string | null;
      model: string | null;
      year: number | null;
      color: string | null;
      stock_image_url?: string | null;
      profile_image_url?: string | null;
      is_claimed?: boolean | null;
      owner_id?: string | null;
    } | null;
    profiles?: {
      id: string;
      handle: string | null;
      avatar_url: string | null;
      reputation_score: number | null;
    } | null;
    // From feed data - mapped names
    author_handle?: string | null;
    author_avatar_url?: string | null;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
  };
  currentUserId?: string | null;
  onNavigate?: (page: string, data?: any) => void;
}

export function StreamPostCard({ post, currentUserId, onNavigate }: StreamPostCardProps) {
  const vehicleId = post.vehicle_id || post.vehicles?.id || null;
  const { isTracking, trackerCount, toggle } = useVehicleTracking(vehicleId);
  const [showComments, setShowComments] = useState(false);

  const vehicle = post.vehicles;
  const handle = post.profiles?.handle ?? post.author_handle ?? 'Spotter';
  const avatarUrl = post.profiles?.avatar_url ?? post.author_avatar_url ?? null;
  const repScore = post.profiles?.reputation_score ?? null;

  const isOwnerPost = !!(
    vehicle &&
    post.author_id === vehicle.owner_id &&
    vehicle.is_claimed
  );

  const { make, model } = vehicle
    ? getVehicleDisplayName(vehicle)
    : { make: 'Unknown', model: 'Vehicle' };

  const vehicleImage = getVehicleImage(vehicle, 'stock');

  const ownerRPStrip = isOwnerPost && repScore != null
    ? getOwnerRPStrip(repScore)
    : null;

  const handleShare = async () => {
    const shareData = {
      title: `${make} ${model} on MotoRate`,
      text: `Check out this ${make} ${model} on MotoRate`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <div
      style={{
        width: '80%',
        margin: '0 auto 20px',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--carbon-1, #0a0d14)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* CARD HEADER */}
      <div
        style={{
          padding: '11px 13px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            flexShrink: 0,
            overflow: 'hidden',
            border: isOwnerPost
              ? '2px solid #f0a030'
              : '2px solid var(--accent, #F97316)',
            boxShadow: isOwnerPost
              ? '0 0 12px rgba(240,160,48,0.35)'
              : '0 0 12px rgba(249,115,22,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--carbon-2, #111827)',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={handle}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--accent, #F97316)',
              }}
            >
              {handle.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--white, #f2f4f7)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {make}{' '}
            <span style={{ color: 'var(--accent, #F97316)' }}>{model}</span>
          </div>

          <div
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted, #586878)',
              marginTop: 2,
            }}
          >
            @{handle} · {isOwnerPost ? 'Owner' : 'Spotter'}
          </div>

          {ownerRPStrip && (() => {
            const tierName = getTierFromScore(repScore!);
            return (
              <div
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                }}
              >
                <span style={{ color: 'rgba(249,115,22,0.75)' }}>{tierName}</span>
                <span style={{ color: 'var(--dim, #6a7486)' }}> · </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--white, #f2f4f7)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {repScore!.toLocaleString()} RP
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* PHOTO 1:1 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          overflow: 'hidden',
        }}
      >
        {vehicleImage ? (
          <img
            src={vehicleImage}
            alt={`${make} ${model}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.4s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--carbon-2, #111827)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '100%', height: '100%', background: 'var(--carbon-2, #0e1320)' }} />
          </div>
        )}

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent 55%, rgba(3,5,8,0.82) 100%)',
          }}
        />

        {/* Photo overlay text */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            padding: '10px 13px 11px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(249,115,22,0.85)',
              }}
            >
              {vehicle?.make ?? '—'}
            </span>
            <div
              style={{
                width: 1,
                height: 9,
                background: 'rgba(255,255,255,0.18)',
              }}
            />
            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 9,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {vehicle?.year?.toString() ?? '—'}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
              color: 'var(--white, #f2f4f7)',
              textShadow: '0 1px 12px rgba(0,0,0,0.9)',
            }}
          >
            {vehicle?.model ?? 'Unknown'}
          </div>
        </div>
      </div>

      {/* STAT STRIP */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {[
          { value: formatRP(repScore), label: 'RP', accent: true },
          { value: '—', label: 'Spots' },
          { value: '—', label: 'Fans' },
          { value: '—', label: 'Enc.' },
        ].map((cell, i) => (
          <div
            key={cell.label}
            style={{
              flex: 1,
              padding: '8px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: cell.accent ? 'var(--accent, #F97316)' : 'var(--white, #f2f4f7)',
              }}
            >
              {cell.value}
            </span>
            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 7,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted, #586878)',
              }}
            >
              {cell.label}
            </span>
          </div>
        ))}
      </div>

      {/* ACTION ROW */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 13px 9px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {/* Track button */}
          <button
            onClick={toggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Heart
              size={14}
              fill={isTracking ? 'var(--accent, #F97316)' : 'none'}
              stroke={isTracking ? 'var(--accent, #F97316)' : 'var(--dim, #6a7486)'}
            />
            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: isTracking ? 'var(--accent, #F97316)' : 'var(--dim, #6a7486)',
              }}
            >
              {isTracking ? `${formatCount(trackerCount)} Fanned` : 'Fan'}
            </span>
          </button>

          {/* Comment count */}
          <button
            onClick={() => setShowComments(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--dim, #6a7486)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <MessageCircle size={14} />
            <span
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {formatCount(post.comment_count ?? 0)}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--dim, #6a7486)',
              display: 'flex',
            }}
          >
            <Share2 size={14} />
          </button>
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--muted, #586878)',
          }}
        >
          {formatSpotTime(post.created_at)}
        </span>
      </div>

      {/* SPOTTER FOOTER */}
      <div style={{ padding: '0 13px 10px' }}>
        <span
          style={{
            fontFamily: 'Barlow, sans-serif',
            fontSize: 11,
            color: 'var(--dim, #6a7486)',
          }}
        >
          {isOwnerPost ? (
            <>
              Owner post ·{' '}
              <span style={{ color: 'var(--light, #c0c8d4)', fontWeight: 600 }}>
                @{handle}
              </span>
            </>
          ) : (
            <>
              Spotted by{' '}
              <span style={{ color: 'var(--light, #c0c8d4)', fontWeight: 600 }}>
                @{handle}
              </span>
            </>
          )}
        </span>
      </div>

      {showComments && (
        <CommentsModal
          postId={post.id}
          postAuthor={handle}
          onClose={() => setShowComments(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
