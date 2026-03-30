import { useState, useEffect, useCallback } from 'react';
import { getProfileViewStats } from '../lib/profileViews';
import { supabase } from '../lib/supabase';

interface ProfileInsightsProps {
  profileId: string;
}

export function ProfileInsights({ profileId }: ProfileInsightsProps) {
  const [stats, setStats] = useState<{ total_views: number; views_last_7_days: number; unique_visitors: number }>({
    total_views: 0,
    views_last_7_days: 0,
    unique_visitors: 0
  });
  const [postStats, setPostStats] = useState<{ total_post_views: number; total_likes: number; total_comments: number }>({
    total_post_views: 0,
    total_likes: 0,
    total_comments: 0
  });
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, postStatsData] = await Promise.all([
        getProfileViewStats(profileId),
        loadPostStats(profileId)
      ]);

      if (statsData) {
        setStats(statsData);
      }

      if (postStatsData) {
        setPostStats(postStatsData);
      }
    } catch (error) {
      console.error('Error loading profile insights:', error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  async function loadPostStats(userId: string) {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId);

      if (!posts || posts.length === 0) {
        return { total_post_views: 0, total_likes: 0, total_comments: 0 };
      }

      const postIds = posts.map(p => p.id);

      const [
        { count: totalLikes },
        { count: totalComments }
      ] = await Promise.all([
        supabase.from('reactions').select('*', { count: 'exact', head: true }).in('post_id', postIds),
        supabase.from('post_comments').select('*', { count: 'exact', head: true }).in('post_id', postIds)
      ]);

      return {
        total_post_views: 0,
        total_likes: totalLikes || 0,
        total_comments: totalComments || 0
      };
    } catch (error) {
      console.error('Error loading post stats:', error);
      return { total_post_views: 0, total_likes: 0, total_comments: 0 };
    }
  }

  if (loading) return null;

  const insightStats = [
    { label: 'Views', value: stats?.total_views ?? 0 },
    { label: 'Likes', value: postStats?.total_likes ?? 0 },
    { label: 'Comments', value: postStats?.total_comments ?? 0 },
  ];

  return (
    <div style={{
      background: '#0d1117', border: '1px solid rgba(249,115,22,0.10)',
      borderRadius: 8, margin: '10px 14px', display: 'flex',
    }}>
      {insightStats.map((stat, i, arr) => (
        <div key={stat.label} style={{
          flex: 1, padding: '10px 0', textAlign: 'center' as const,
          borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600,
            color: '#F97316', display: 'block', fontVariantNumeric: 'tabular-nums',
          }}>
            {stat.value.toLocaleString()}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            color: '#5a6e7e', display: 'block', marginTop: 2,
          }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
