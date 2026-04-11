import { useEffect } from 'react';
import { Confetti } from './Confetti';
import { Badge } from '../lib/badges';
import { BadgeIcon } from './BadgeIcon';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';

interface BadgeUnlockModalProps {
  badge: Badge;
  onClose: () => void;
}

function getTierColor(levelName?: string): string {
  const tier = levelName?.toLowerCase() || '';
  if (tier === 'platinum') return '#f5cc55';
  if (tier === 'gold') return '#f0a030';
  if (tier === 'silver') return '#9ab0c0';
  if (tier === 'bronze') return '#c07840';
  return '#F97316';
}

function getTierBg(levelName?: string): string {
  const tier = levelName?.toLowerCase() || '';
  if (tier === 'platinum') return 'linear-gradient(135deg, rgba(245,204,85,0.2), rgba(240,160,48,0.15))';
  if (tier === 'gold') return 'linear-gradient(135deg, rgba(240,160,48,0.2), rgba(240,160,48,0.1))';
  if (tier === 'silver') return 'linear-gradient(135deg, rgba(154,176,192,0.2), rgba(154,176,192,0.1))';
  if (tier === 'bronze') return 'linear-gradient(135deg, rgba(192,120,64,0.2), rgba(192,120,64,0.1))';
  return 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.1))';
}

function getTierMessage(levelName?: string): string {
  const tier = levelName?.toLowerCase() || '';
  if (tier === 'platinum') return 'Legendary achievement';
  if (tier === 'gold') return 'Gold tier reached';
  if (tier === 'silver') return 'Silver tier unlocked';
  if (tier === 'bronze') return 'First tier unlocked';
  return 'Achievement unlocked';
}

export function BadgeUnlockModal({ badge, onClose }: BadgeUnlockModalProps) {
  const tierName = badge.level_name?.toLowerCase() || '';
  const isTiered = ['bronze', 'silver', 'gold', 'platinum'].includes(tierName);
  const isNegativeBadge = badge.category === 'negative';
  const tierColor = getTierColor(badge.level_name);

  useEffect(() => {
    if (!isNegativeBadge) {
      sounds.badge();
      haptics.celebration();
    }
  }, [isNegativeBadge]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {!isNegativeBadge && <Confetti duration={3000} />}

      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column' as const,
          alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="#7a8e9e" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const, maxWidth: 320, width: '100%', gap: 20 }}>

          {/* Tier label */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.3em', textTransform: 'uppercase' as const,
            color: isNegativeBadge ? '#ef4444' : tierColor,
          }}>
            {isNegativeBadge ? 'Warning Issued' : getTierMessage(badge.level_name)}
          </div>

          {/* Badge image — standalone, no circle */}
          <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeIcon
              iconPath={badge.icon_path}
              size={120}
              alt={badge.name}
            />
          </div>

          {/* Badge info */}
          <div>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700,
              color: '#eef4f8', lineHeight: 1, marginBottom: 8,
            }}>
              {isTiered && `${badge.level_name} `}{badge.name}
            </div>
            <p style={{
              fontFamily: "'Barlow', sans-serif", fontSize: 13,
              color: '#a8bcc8', lineHeight: 1.65,
            }}>
              {badge.description}
            </p>
          </div>

          {/* Tier pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {[badge.category, isTiered ? badge.level_name : null].filter(Boolean).map(label => (
              <span key={label} style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                padding: '3px 10px', borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.10)', color: '#7a8e9e',
              }}>
                {label}
              </span>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
