import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NearMissBadgeNudgeProps {
  userId: string | undefined;
}

export function NearMissBadgeNudge({ userId }: NearMissBadgeNudgeProps) {
  const [nudge, setNudge] = useState<{ name: string; remaining: number; percent: number } | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      try {
        const { count: spotCount } = await supabase
          .from('spot_history')
          .select('*', { count: 'exact', head: true })
          .eq('spotter_id', userId!);

        const spots = spotCount || 0;

        const { data: earnedData } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', userId!);

        const earnedIds = new Set((earnedData || []).map(b => b.badge_id));

        const { data: nextBadges } = await supabase
          .from('badges')
          .select('id, name, tier_threshold')
          .eq('progression_group', 'spotter')
          .order('tier_threshold', { ascending: true });

        if (!nextBadges) return;

        const nextBadge = nextBadges.find(b => !earnedIds.has(b.id) && (b.tier_threshold || 0) > spots);
        if (!nextBadge || !nextBadge.tier_threshold) return;

        const remaining = nextBadge.tier_threshold - spots;
        const percent = Math.min(95, Math.round((spots / nextBadge.tier_threshold) * 100));

        if (percent >= 25) {
          setNudge({ name: nextBadge.name, remaining, percent });
        }
      } catch (e) {
        console.error('Badge nudge error:', e);
      }
    }

    load();
  }, [userId]);

  if (!nudge) return null;

  return (
    <div style={{
      margin: '0 18px', padding: '10px 14px', borderRadius: 10,
      background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          width: `${nudge.percent}%`, height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #F97316, #fb923c)',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
        color: '#5a6e7e', whiteSpace: 'nowrap' as const,
      }}>
        <span style={{ color: '#F97316', fontWeight: 700 }}>{nudge.remaining}</span>
        {' '}spot{nudge.remaining !== 1 ? 's' : ''} to{' '}
        <span style={{ color: '#eef4f8', fontWeight: 600 }}>{nudge.name}</span>
      </span>
    </div>
  );
}
