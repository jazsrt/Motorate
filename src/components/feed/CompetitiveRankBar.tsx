import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CompetitiveRankBarProps {
  rank: number;
  city?: string;
  totalUsers?: number;
  topPercent?: number;
  spotsThisWeek?: number;
  userId?: string;
}

export function CompetitiveRankBar({
  rank, city = 'your city', topPercent = 0, spotsThisWeek = 0, userId,
}: CompetitiveRankBarProps) {
  const [nudge, setNudge] = useState<{ name: string; remaining: number; percent: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    async function loadNudge() {
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
        const next = nextBadges.find(b => !earnedIds.has(b.id) && (b.tier_threshold || 0) > spots);
        if (next?.tier_threshold) {
          const remaining = next.tier_threshold - spots;
          const percent = Math.min(95, Math.round((spots / next.tier_threshold) * 100));
          if (percent >= 10) setNudge({ name: next.name, remaining, percent });
        }
      } catch { /* intentionally empty */ }
    }
    loadNudge();
  }, [userId]);

  if (rank <= 0) return null;

  return (
    <div
      className="card-v3 card-v3-lift mx-4 mb-4 v3-stagger v3-stagger-1"
      style={{
        borderLeft: '3px solid #F97316',
        boxShadow: 'inset 4px 0 20px rgba(249,115,22,.04), inset 0 1px 0 rgba(255,255,255,.04), 0 2px 12px rgba(0,0,0,.35)',
      }}
    >
      {/* Rank row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="mono"
          style={{
            fontSize: 28, fontWeight: 700, color: '#F97316', lineHeight: 1,
            textShadow: '0 0 20px rgba(249,115,22,.2)', minWidth: 28, textAlign: 'center',
          }}
        >
          {rank}
        </div>
        <div className="flex-1">
          <div style={{ fontSize: 12, color: '#c0c8d4', fontWeight: 300, lineHeight: 1.5 }}>
            in <span style={{ color: '#f2f4f7', fontWeight: 500 }}>{city}</span> this week
          </div>
          {spotsThisWeek > 0 && (
            <div style={{ fontSize: 10, color: '#586878', fontWeight: 300, marginTop: 2 }}>
              {spotsThisWeek} spot{spotsThisWeek !== 1 ? 's' : ''} this week
              {topPercent > 0 && topPercent <= 25 && (
                <span style={{ color: '#F97316' }}> · Top {topPercent}%</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badge progress — inline, not separate */}
      {nudge && (
        <div className="px-4 pb-3 pt-0">
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, width: `${nudge.percent}%`,
              background: 'linear-gradient(90deg, #F97316, #fb923c)',
              transition: 'width 1s cubic-bezier(.34,1.56,.64,1)',
            }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="mono" style={{ fontSize: 9, color: '#F97316' }}>
              {nudge.remaining} to {nudge.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
