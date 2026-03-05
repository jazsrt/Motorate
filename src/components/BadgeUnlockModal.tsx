import { useState, useEffect } from 'react';
import { X, Share2, Users, Lock, CheckCircle } from 'lucide-react';
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

function getCoinClass(levelName?: string): string {
  const tier = levelName?.toLowerCase() || '';
  if (tier === 'platinum') return 'coin-plat';
  if (tier === 'gold') return 'coin-gold';
  if (tier === 'silver') return 'coin-silver';
  if (tier === 'bronze') return 'coin-bronze';
  return 'coin-silver';
}

function getTierColor(levelName?: string): string {
  const tier = levelName?.toLowerCase() || '';
  if (tier === 'platinum') return 'var(--plat-h)';
  if (tier === 'gold') return 'var(--gold-h)';
  if (tier === 'silver') return 'var(--silver-h)';
  if (tier === 'bronze') return 'var(--bronze-h)';
  return 'var(--accent)';
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
  const coinClass = getCoinClass(badge.level_name);

  // Sound + Haptic feedback on mount
  useEffect(() => {
    if (!isNegativeBadge) {
      sounds.badge();
      haptics.celebration();
    }
  }, []);

  // Prevent background scroll
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

      {/* Full-screen overlay */}
      <div
        className="modal-overlay p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-2)' }}
          disabled={sharing}
        >
          <X className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6 max-w-xs w-full">
          {/* Tier label */}
          <div
            className="text-[10px] font-medium uppercase"
            style={{ color: isNegativeBadge ? 'var(--negative)' : tierColor, letterSpacing: '3px' }}
          >
            {isNegativeBadge ? 'Warning Issued' : getTierMessage(badge.level_name)}
          </div>

          {/* Coin */}
          <div
            className={`coin w-28 h-28 animate-coin-in ${isNegativeBadge ? '' : coinClass}`}
            style={isNegativeBadge ? { background: 'var(--negative)', opacity: 0.8 } : {}}
          >
            <div className="w-full h-full flex items-center justify-center p-3">
              <BadgeIcon iconPath={badge.icon_path} size={80} alt={badge.name} />
            </div>
          </div>

          {/* Badge info */}
          <div>
            <h2
              className="text-[18px] font-medium"
              style={{ color: 'var(--text-white)', letterSpacing: '0.5px' }}
            >
              {isTiered && `${badge.level_name} `}{badge.name}
            </h2>
            <p
              className="text-[13px] mt-2 leading-[1.65]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {badge.description}
            </p>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[badge.category, isTiered ? badge.level_name : null, badge.rarity].filter(Boolean).map(label => (
              <span
                key={label}
                className="text-[10px] px-2.5 py-1 rounded-full font-medium uppercase"
                style={{
                  border: '1px solid var(--border-2)',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '1px',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Share actions */}
          {!shared ? (
            <div className="w-full space-y-2 pt-2">
              <p className="label-micro mb-3">Share your achievement</p>

              <button
                onClick={() => handleShare('public')}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[11px] font-semibold uppercase transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'var(--text-secondary)',
                  color: 'var(--bg)',
                  letterSpacing: '0.8px',
                }}
              >
                <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                Share Publicly
              </button>

              <button
                onClick={() => handleShare('friends')}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[11px] font-semibold uppercase transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-2)',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.8px',
                }}
              >
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                Friends Only
              </button>

              <button
                onClick={() => handleShare('private')}
                disabled={sharing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[11px] font-semibold uppercase transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-quaternary)',
                  letterSpacing: '0.8px',
                }}
              >
                <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                Keep Private
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-2">
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--positive)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Badge saved</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
