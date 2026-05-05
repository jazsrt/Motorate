/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Award, BadgeCheck, Car, CheckCircle, Flame, Sparkles, Star, Trophy } from 'lucide-react';

export type RewardEventType =
  | 'rp'
  | 'badge'
  | 'level'
  | 'spot'
  | 'claim'
  | 'streak'
  | 'follow'
  | 'sticker'
  | 'garage';

export interface RewardEvent {
  type: RewardEventType;
  title: string;
  message?: string;
  points?: number;
  accent?: string;
}

interface RewardEventContextValue {
  celebrateReward: (event: RewardEvent) => void;
}

const RewardEventContext = createContext<RewardEventContextValue | undefined>(undefined);

const typeConfig: Record<RewardEventType, { color: string; Icon: typeof Sparkles; eyebrow: string }> = {
  rp: { color: '#F97316', Icon: Sparkles, eyebrow: 'RP Earned' },
  badge: { color: '#f0a030', Icon: Award, eyebrow: 'Badge Unlocked' },
  level: { color: '#20c060', Icon: Trophy, eyebrow: 'Level Up' },
  spot: { color: '#F97316', Icon: Star, eyebrow: 'Spot Logged' },
  claim: { color: '#20c060', Icon: BadgeCheck, eyebrow: 'Ownership' },
  streak: { color: '#f0a030', Icon: Flame, eyebrow: 'Streak' },
  follow: { color: '#20c060', Icon: CheckCircle, eyebrow: 'Following' },
  sticker: { color: '#f0a030', Icon: Award, eyebrow: 'Sticker Given' },
  garage: { color: '#F97316', Icon: Car, eyebrow: 'Garage Updated' },
};

function RewardEventOverlay({ event, onDone }: { event: RewardEvent; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const config = typeConfig[event.type];
  const color = event.accent || config.color;
  const Icon = config.Icon;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 92,
        zIndex: 120,
        width: 'min(360px, calc(100vw - 28px))',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(13,17,23,0.98), rgba(7,10,15,0.98))',
          border: `1px solid ${color}55`,
          boxShadow: `0 18px 48px rgba(0,0,0,0.45), 0 0 32px ${color}22`,
          padding: '14px 16px',
          animation: 'reward-slide-up 280ms cubic-bezier(.22,.68,0,1.12) both',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${color}18, transparent 68%)` }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              background: `${color}18`,
              border: `1px solid ${color}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color={color} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color,
                marginBottom: 2,
              }}
            >
              {config.eyebrow}
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 19,
                fontWeight: 700,
                color: '#eef4f8',
                lineHeight: 1.05,
              }}
            >
              {event.title}
            </div>
            {event.message && (
              <div
                style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 12,
                  color: '#7a8e9e',
                  lineHeight: 1.35,
                  marginTop: 3,
                }}
              >
                {event.message}
              </div>
            )}
          </div>
          {typeof event.points === 'number' && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                fontWeight: 700,
                color,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
                animation: 'reward-points-pop 520ms cubic-bezier(.22,.68,0,1.12) 120ms both',
              }}
            >
              +{event.points}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes reward-slide-up {
          from { opacity: 0; transform: translateY(18px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes reward-points-pop {
          0% { opacity: 0; transform: translateY(10px) scale(.85); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export function RewardEventProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<RewardEvent[]>([]);
  const active = queue[0] || null;

  const celebrateReward = useCallback((event: RewardEvent) => {
    setQueue(prev => [...prev, event]);
  }, []);

  const value = useMemo(() => ({ celebrateReward }), [celebrateReward]);

  return (
    <RewardEventContext.Provider value={value}>
      {children}
      {active && (
        <RewardEventOverlay
          event={active}
          onDone={() => setQueue(prev => prev.slice(1))}
        />
      )}
    </RewardEventContext.Provider>
  );
}

export function useRewardEvents() {
  const context = useContext(RewardEventContext);
  if (!context) {
    throw new Error('useRewardEvents must be used within RewardEventProvider');
  }
  return context;
}
