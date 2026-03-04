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
    <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-3"
         style={{ background: 'var(--s1)', border: '1px solid var(--border)' }}>
      <div className="flex-1">
        <div className="tach-bar">
          <div className="tach-fill" style={{ width: `${nudge.percent}%` }} />
        </div>
      </div>
      <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--t3)' }}>
        <span style={{ color: 'var(--orange)' }}>{nudge.remaining}</span> spot{nudge.remaining !== 1 ? 's' : ''} to <span className="font-semibold text-primary">{nudge.name}</span>
      </span>
    </div>
  );
}
