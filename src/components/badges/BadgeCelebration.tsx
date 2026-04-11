import { useState, useEffect } from 'react';
import { sounds } from '../../lib/sounds';
import { haptics } from '../../lib/haptics';
import { shareBadgeImage } from '../../lib/badgeShareCard';

interface BadgeCelebrationProps {
  badgeName: string;
  badgeDescription: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: React.ReactNode;
  iconPath?: string;
  othersCount?: number;
  userHandle?: string;
  userId?: string;
  vehicleName?: string;
  vehicleImageUrl?: string;
  vehicleId?: string;
  onClose: () => void;
  onViewBadges?: () => void;
}

const tierTextColors = {
  bronze: '#9a7a58',
  silver: '#909aaa',
  gold: '#c8a85a',
  platinum: '#8a88a8',
};

export function BadgeCelebration({
  badgeName, badgeDescription, tier, icon, iconPath,
  othersCount = 0, userHandle = '', userId: _userId,
  vehicleName, vehicleImageUrl, vehicleId,
  onClose, onViewBadges,
}: BadgeCelebrationProps) {
  const [particles, setParticles] = useState<Array<{x: number; y: number; size: number; color: string; delay: number}>>([]);
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'downloaded' | 'failed'>('idle');

  useEffect(() => {
    const colors = ['#F97316', '#fb923c', '#c8a45a', '#e8c474', '#f0d888'];
    const newParticles = Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const distance = 80 + Math.random() * 120;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 30,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: 600 + Math.random() * 300,
      };
    });
    setParticles(newParticles);

    try { sounds.badge(); haptics.celebration(); } catch { /* intentionally empty */ }
  }, []);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    const result = await shareBadgeImage({
      badgeName,
      badgeTier: tier,
      badgeDescription,
      badgeIconPath: iconPath,
      userHandle,
      vehicleName,
      vehicleImageUrl,
      deepLinkUrl: vehicleId
        ? `${window.location.origin}/#/vehicle/${vehicleId}`
        : `${window.location.origin}/#/badges`,
    });
    setShareStatus(result);
    setSharing(false);
    // Reset status after 2.5s
    setTimeout(() => setShareStatus('idle'), 2500);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,10,16,.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Radial glow aura behind badge — pulsing halo */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 400, height: 400,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0.08) 35%, rgba(249,115,22,0) 65%)',
        borderRadius: '50%',
        opacity: 0,
        animation: 'aura-pulse 1.8s ease-out forwards',
        animationDelay: '0.3s',
        pointerEvents: 'none',
      }} />

      {/* Expanding concentric rings — shockwave */}
      {[0, 1, 2].map(i => (
        <div
          key={`ring-${i}`}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 160, height: 160,
            transform: 'translate(-50%, -50%) scale(0.3)',
            border: '3px solid rgba(249,115,22,0.55)',
            borderRadius: '50%',
            opacity: 0,
            animation: 'ring-expand 1.6s ease-out forwards',
            animationDelay: `${0.4 + i * 0.22}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            pointerEvents: 'none',
            opacity: 0,
            '--dx': `${p.x}px`,
            '--dy': `${p.y}px`,
            animation: 'pburst 1s cubic-bezier(.25,.46,.45,.94) forwards',
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}

      {/* Badge image — standalone, no circle */}
      <div
        style={{
          width: 160, height: 160,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          animation: 'coin-in 0.7s cubic-bezier(.25,.46,.45,.94) forwards, badge-pulse 3s ease-in-out 1.5s infinite',
          animationDelay: '0.2s',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {icon}
      </div>

      {/* Text reveals — staggered fade-up */}
      <div style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 28, fontWeight: 700, color: '#eef4f8',
        marginTop: 28, letterSpacing: '.5px',
        textAlign: 'center',
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '0.9s',
      }}>{badgeName}</div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: 3, color: tierTextColors[tier], marginTop: 8,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1s',
      }}>{tier}</div>

      <div style={{
        fontFamily: "'Barlow', sans-serif",
        fontSize: 13, color: '#8090a4', fontWeight: 400, marginTop: 10,
        maxWidth: 280, textAlign: 'center', lineHeight: 1.5, padding: '0 20px',
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1.1s',
      }}>{badgeDescription}</div>

      {vehicleName && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
          color: '#F97316', marginTop: 14,
          opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
          animationDelay: '1.2s',
        }}>On {vehicleName}</div>
      )}

      {othersCount > 0 && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, color: '#586878', marginTop: 20, letterSpacing: '.5px',
          opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
          animationDelay: '1.4s',
        }}>
          <span style={{ color: '#c0c8d4', fontWeight: 500 }}>{othersCount}</span> others have earned this
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 10, marginTop: 32,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1.6s',
      }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            padding: '12px 28px', borderRadius: 2, border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: '1.4px', textTransform: 'uppercase',
            background: sharing ? '#7a4a10' : '#F97316',
            color: '#030508', cursor: sharing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 140, justifyContent: 'center',
          }}
        >
          {sharing ? (
            <>Generating…</>
          ) : shareStatus === 'shared' ? (
            <>✓ Shared</>
          ) : shareStatus === 'downloaded' ? (
            <>✓ Saved</>
          ) : shareStatus === 'failed' ? (
            <>Try Again</>
          ) : (
            <>Share Card</>
          )}
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (onViewBadges) onViewBadges(); else onClose(); }}
          style={{
            padding: '12px 28px', borderRadius: 2,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: '1.4px', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid rgba(255,255,255,.15)', color: '#c0c8d4',
            cursor: 'pointer',
          }}
        >View Badges</button>
      </div>
    </div>
  );
}
