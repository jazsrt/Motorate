import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FirstStepsCardProps {
  userId: string;
  onNavigate: (page: string, data?: unknown) => void;
  onDismiss: () => void;
}

interface Steps {
  spotted: boolean;
  claimed: boolean;
  badge: boolean;
}

export function FirstStepsCard({ userId, onNavigate, onDismiss }: FirstStepsCardProps) {
  const [steps, setSteps] = useState<Steps>({ spotted: false, claimed: false, badge: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSteps = async () => {
      const [spotResult, claimResult, badgeResult] = await Promise.all([
        supabase.from('spot_history').select('id', { count: 'exact', head: true }).eq('spotter_id', userId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('is_claimed', true),
        supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      setSteps({
        spotted: (spotResult.count ?? 0) > 0,
        claimed: (claimResult.count ?? 0) > 0,
        badge: (badgeResult.count ?? 0) > 0,
      });
      setLoading(false);
    };
    checkSteps();
  }, [userId]);

  // Auto-dismiss when all steps complete
  useEffect(() => {
    if (!loading && steps.spotted && steps.claimed && steps.badge) {
      setTimeout(onDismiss, 2000);
    }
  }, [steps, loading, onDismiss]);

  if (loading) return null;

  const allDone = steps.spotted && steps.claimed && steps.badge;

  const items = [
    {
      done: steps.spotted,
      label: 'Spot your first vehicle',
      sub: 'Find any car or truck and log it to MotoRate',
      action: () => onNavigate('scan'),
      actionLabel: 'Spot Now',
    },
    {
      done: steps.claimed,
      label: 'Claim your plate',
      sub: 'Verify ownership with your VIN and make it yours',
      action: () => onNavigate('explore'),
      actionLabel: 'Find My Car',
    },
    {
      done: steps.badge,
      label: 'Earn your first badge',
      sub: 'Spot a vehicle or complete your profile to unlock one',
      action: () => onNavigate('badges'),
      actionLabel: 'View Badges',
    },
  ];

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(249,115,22,0.2)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 2,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F97316', marginBottom: 2 }}>
            {allDone ? 'All Done' : 'Get Started'}
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
            {allDone ? "You're part of MotoRate." : 'First Steps'}
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6e7e', padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', margin: '0 16px' }}>
        <div style={{
          height: 2,
          background: '#F97316',
          width: `${(Object.values(steps).filter(Boolean).length / 3) * 100}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 2, flexShrink: 0,
              background: item.done ? 'rgba(32,192,96,0.12)' : 'rgba(249,115,22,0.08)',
              border: `1px solid ${item.done ? 'rgba(32,192,96,0.4)' : 'rgba(249,115,22,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.done
                ? <Check size={12} color="#20c060" strokeWidth={2.5} />
                : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: '#F97316' }}>{i + 1}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.done ? '#5a6e7e' : '#eef4f8', textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.label}
              </div>
              {!item.done && (
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', lineHeight: 1.3 }}>
                  {item.sub}
                </div>
              )}
            </div>
            {!item.done && (
              <button
                onClick={item.action}
                style={{ flexShrink: 0, padding: '5px 10px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 2, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F97316' }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
