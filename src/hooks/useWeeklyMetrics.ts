import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface WeeklyMetrics {
  spotsThisWeek: number;
  spotsLastWeek: number;
  repEarnedThisWeek: number;
  likesReceivedThisWeek: number;
  viewsThisWeek: number;
  globalRank: number;
  totalUsers: number;
  topPercent: number;
  bestWeekSpots: number;
  loading: boolean;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useWeeklyMetrics(userId: string | undefined): WeeklyMetrics {
  const [metrics, setMetrics] = useState<WeeklyMetrics>({
    spotsThisWeek: 0, spotsLastWeek: 0, repEarnedThisWeek: 0,
    likesReceivedThisWeek: 0, viewsThisWeek: 0,
    globalRank: 0, totalUsers: 0, topPercent: 0, bestWeekSpots: 0, loading: true,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        const now = new Date();
        const thisMonday = getMonday(now).toISOString();
        const lastMonday = getMonday(new Date(now.getTime() - 7 * 86400000)).toISOString();

        const [
          spotsThisWeekRes, spotsLastWeekRes, repThisWeekRes,
          myPostsRes, viewsThisWeekRes, userRepRes,
          totalUsersRes, weeklyBestRes,
        ] = await Promise.all([
          supabase.from('spot_history').select('*', { count: 'exact', head: true })
            .eq('spotter_id', userId).gte('created_at', thisMonday),
          supabase.from('spot_history').select('*', { count: 'exact', head: true })
            .eq('spotter_id', userId).gte('created_at', lastMonday).lt('created_at', thisMonday),
          supabase.from('reputation_transactions').select('points')
            .eq('user_id', userId).gte('created_at', thisMonday),
          supabase.from('posts').select('id').eq('author_id', userId),
          Promise.resolve({ count: 0, data: null, error: null }),
          supabase.from('profiles').select('reputation_score').eq('id', userId).single(),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('reputation_score', 0),
          supabase.from('user_weekly_stats').select('spots_count')
            .eq('user_id', userId).order('spots_count', { ascending: false }).limit(1),
        ]);

        // Likes received this week
        const postIds = myPostsRes.data?.map(p => p.id) || [];
        let likesThisWeek = 0;
        if (postIds.length > 0) {
          const { count } = await supabase.from('reactions')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds).gte('created_at', thisMonday);
          likesThisWeek = count || 0;
        }

        // Rank calc
        const myRep = userRepRes.data?.reputation_score || 0;
        const { count: usersAboveCount } = await supabase.from('profiles')
          .select('*', { count: 'exact', head: true }).gt('reputation_score', myRep);

        const totalActive = totalUsersRes.count || 1;
        const rank = (usersAboveCount || 0) + 1;
        const topPercent = Math.max(1, Math.round((rank / totalActive) * 100));
        const repEarned = repThisWeekRes.data?.reduce((sum, t) => sum + (t.points || 0), 0) || 0;
        const currentWeekSpots = spotsThisWeekRes.count || 0;
        const bestWeek = weeklyBestRes.data?.[0]?.spots_count || 0;

        if (!cancelled) {
          setMetrics({
            spotsThisWeek: currentWeekSpots,
            spotsLastWeek: spotsLastWeekRes.count || 0,
            repEarnedThisWeek: repEarned,
            likesReceivedThisWeek: likesThisWeek,
            viewsThisWeek: viewsThisWeekRes.count || 0,
            globalRank: rank, totalUsers: totalActive,
            topPercent, bestWeekSpots: Math.max(bestWeek, currentWeekSpots),
            loading: false,
          });
        }
      } catch (err) {
        console.error('Error loading weekly metrics:', err);
        if (!cancelled) setMetrics(prev => ({ ...prev, loading: false }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return metrics;
}
