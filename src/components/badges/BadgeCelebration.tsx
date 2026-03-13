import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { shareToSocial } from '../ShareCardGenerator';

interface BadgeCelebrationProps {
  badgeName: string;
  badgeDescription: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: React.ReactNode;
  othersCount?: number;
  onClose: () => void;
  onViewBadges?: () => void;
}

const tierGradients = {
  bronze: 'linear-gradient(145deg, #5a4228, #7a6040 40%, #9a7a58 55%, #7a6040 70%, #5a4228)',
  silver: 'linear-gradient(145deg, #4a5668, #6a7688 40%, #909aaa 55%, #6a7688 70%, #4a5668)',
  gold:   'linear-gradient(145deg, #806828, #a8883e 40%, #c8a85a 55%, #a8883e 70%, #806828)',
  platinum: 'linear-gradient(145deg, #585678, #706e90 40%, #8a88a8 55%, #706e90 70%, #585678)',
};

const tierTextColors = {
  bronze: '#9a7a58',
  silver: '#909aaa',
  gold: '#c8a85a',
  platinum: '#8a88a8',
};

export function BadgeCelebration({
  badgeName, badgeDescription, tier, icon, othersCount = 0, onClose, onViewBadges
}: BadgeCelebrationProps) {
  const [particles, setParticles] = useState<Array<{x: number; y: number; size: number; color: string; delay: number}>>([]);

  useEffect(() => {
    const colors = ['#c8a45a', '#e8c474', '#a8883e', '#f0d888', '#806828'];
    const newParticles = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const distance = 60 + Math.random() * 80;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 30,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: 600 + Math.random() * 200,
      };
    });
    setParticles(newParticles);

    if (navigator.vibrate) navigator.vibrate([15, 50, 25, 50, 40]);
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,10,16,.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 2,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <X size={16} color="#8090a4" strokeWidth={1.5} />
      </button>

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
            boxShadow: `0 0 ${p.size}px ${p.color}`,
            pointerEvents: 'none',
            opacity: 0,
            '--dx': `${p.x}px`,
            '--dy': `${p.y}px`,
            animation: `pburst 0.9s cubic-bezier(.25,.46,.45,.94) forwards`,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}

      {/* Badge Coin */}
      <div
        style={{
          width: 100, height: 100, borderRadius: '50%',
          background: tierGradients[tier],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          opacity: 0,
          animation: 'coin-in 0.7s cubic-bezier(.25,.46,.45,.94) forwards',
          animationDelay: '0.2s',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 4px 16px rgba(0,0,0,.4)',
        }}
      >
        {/* Metallic flash */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '50%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)',
          left: '-100%',
          animation: 'metal-flash 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
          animationDelay: '0.7s',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>{icon}</div>
      </div>

      {/* Text reveals */}
      <div style={{
        fontSize: 22, fontWeight: 300, color: '#f2f4f7', marginTop: 24,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '0.9s', fontFamily: "'Space Grotesk', sans-serif",
      }}>{badgeName}</div>

      <div className="mono" style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: 3, color: tierTextColors[tier], marginTop: 6,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1s',
      }}>{tier}</div>

      <div style={{
        fontSize: 12, color: '#8090a4', fontWeight: 300, marginTop: 8,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1.1s', fontFamily: "'Space Grotesk', sans-serif",
        maxWidth: 280, textAlign: 'center',
      }}>{badgeDescription}</div>

      {othersCount > 0 && (
        <div style={{
          fontSize: 10, color: '#586878', marginTop: 20,
          opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
          animationDelay: '1.4s', fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <span style={{ color: '#c0c8d4', fontWeight: 500 }}>{othersCount}</span> others have earned this
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 28,
        opacity: 0, animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) forwards',
        animationDelay: '1.6s',
      }}>
        <button
          onClick={e => {
            e.stopPropagation();
            shareToSocial({
              type: 'badge',
              title: badgeName,
              subtitle: badgeDescription,
              userHandle: '',
              userRep: 0,
              deepLinkUrl: `${window.location.origin}/#badges`,
            });
          }}
          style={{
            padding: '10px 28px', borderRadius: 10, fontSize: 10, fontWeight: 500,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif", border: 'none',
            background: '#F97316', color: '#fff',
          }}
        >Share</button>
        <button
          onClick={e => { e.stopPropagation(); onViewBadges ? onViewBadges() : onClose(); }}
          style={{
            padding: '10px 28px', borderRadius: 10, fontSize: 10, fontWeight: 500,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: '#c0c8d4',
          }}
        >View Badges</button>
      </div>
    </div>
  );
}
