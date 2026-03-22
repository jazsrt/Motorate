import { useState, useEffect } from 'react';
import { Share2, Users, Lock, CheckCircle } from 'lucide-react';
import { Confetti } from './Confetti';
import { Badge, shareBadgeUnlock } from '../lib/badges';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const tierName = badge.level_name?.toLowerCase() || '';
  const isTiered = ['bronze', 'silver', 'gold', 'platinum'].includes(tierName);
  const isNegativeBadge = badge.rarity === 'Common' && badge.category === 'negative';
  const tierColor = getTierColor(badge.level_name);

  useEffect(() => {
    if (!isNegativeBadge) {
      sounds.badge();
      haptics.celebration();
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleShare = async (privacySetting: 'public' | 'friends' | 'private') => {
    if (!user || sharing) return;
    setSharing(true);
    try {
      const postId = await shareBadgeUnlock(user.id, badge, privacySetting);
      showToast(postId ? 'Badge shared to your feed!' : 'Badge saved privately', 'success');
      setShared(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      showToast('Failed to share badge', 'error');
      setSharing(false);
    }
  };

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
          disabled={sharing}
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

          {/* Badge coin */}
          <div style={{
            width: 112, height: 112, borderRadius: '50%',
            background: isNegativeBadge ? 'rgba(239,68,68,0.2)' : getTierBg(badge.level_name),
            border: `2px solid ${isNegativeBadge ? 'rgba(239,68,68,0.4)' : tierColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isNegativeBadge ? 'none' : `0 0 40px ${tierColor}33`,
          }}>
            <BadgeIcon iconPath={badge.icon_path} size={72} alt={badge.name} />
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
            {[badge.category, isTiered ? badge.level_name : null, badge.rarity].filter(Boolean).map(label => (
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

          {/* Share actions */}
          {!shared ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 8, paddingTop: 8 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#445566',
                marginBottom: 4,
              }}>
                Share your achievement
              </div>
              <button onClick={() => handleShare('public')} disabled={sharing} style={{
                width: '100%', padding: 12, borderRadius: 8,
                background: '#F97316', border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#030508',
                cursor: 'pointer', opacity: sharing ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Share2 style={{ width: 14, height: 14 }} strokeWidth={2} />
                Share Publicly
              </button>
              <button onClick={() => handleShare('friends')} disabled={sharing} style={{
                width: '100%', padding: 12, borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7a8e9e',
                cursor: 'pointer', opacity: sharing ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Users style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                Friends Only
              </button>
              <button onClick={() => handleShare('private')} disabled={sharing} style={{
                width: '100%', padding: 12, borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#445566',
                cursor: 'pointer', opacity: sharing ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Lock style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                Keep Private
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
              <CheckCircle style={{ width: 20, height: 20, color: '#20c060' }} />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#a8bcc8' }}>Badge saved</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
