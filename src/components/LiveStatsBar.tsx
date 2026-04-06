import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  spotsWeek: number;
  repToday: number;
  newFans: number;
  badgesMonth: number;
}

export function LiveStatsBar() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ spotsWeek: 0, repToday: 0, newFans: 0, badgesMonth: 0 });

  const loadStats = useCallback(async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [spotsRes, fansRes, badgesRes] = await Promise.all([
      supabase
        .from('spot_history')
        .select('id', { count: 'exact', head: true })
        .eq('spotter_id', user!.id)
        .gte('created_at', weekAgo),
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user!.id)
        .eq('status', 'accepted')
        .gte('created_at', weekAgo),
      supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('earned_at', monthAgo),
    ]);

    setStats({
      spotsWeek: spotsRes.count ?? 0,
      repToday: profile?.reputation_score ?? 0,
      newFans: fansRes.count ?? 0,
      badgesMonth: badgesRes.count ?? 0,
    });
  }, [user, profile]);

  useEffect(() => {
    if (user) loadStats();
  }, [user, loadStats]);

  const metrics = [
    { value: stats.spotsWeek, label: 'Spots/wk' },
    { value: stats.repToday, label: 'Score today' },
    { value: stats.newFans, label: 'New followers' },
    { value: stats.badgesMonth, label: 'Badges/mo' },
  ];

  return (
    <div
      className="w-full flex items-center justify-around"
      style={{
        height: '36px',
        background: 'var(--s1)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-1.5">
          <span
            className="font-mono font-bold"
            style={{ fontSize: '13px', color: 'var(--t1)' }}
          >
            {m.value.toLocaleString()}
          </span>
          <span
            style={{ fontSize: '10px', color: 'var(--t4)' }}
          >
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
