import { useState, useEffect, useCallback } from 'react';
import { Eye, Users, TrendingUp, User, Heart, MessageCircle, Zap } from 'lucide-react';
import { getProfileViewStats, getRecentVisitors, RecentVisitor } from '../lib/profileViews';
import { UserAvatar } from './UserAvatar';
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
  const [visitors, setVisitors] = useState<RecentVisitor[]>([]);
  const [postStats, setPostStats] = useState<{ total_post_views: number; total_likes: number; total_comments: number }>({
    total_post_views: 0,
    total_likes: 0,
    total_comments: 0
  });
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, visitorsData, postStatsData] = await Promise.all([
        getProfileViewStats(profileId),
        getRecentVisitors(profileId, 7),
        loadPostStats(profileId)
      ]);

      if (statsData) {
        setStats(statsData);
      }

      setVisitors(visitorsData);

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

  if (loading) {
    return (
      <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={20} className="text-accent-primary" />
          <h3 className="text-lg font-bold uppercase tracking-wider">Profile Insights</h3>
        </div>
        <div className="text-center py-8 text-secondary">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Eye size={20} className="text-accent-primary" />
        <h3 className="text-lg font-bold uppercase tracking-wider">Profile Insights</h3>
        <span className="text-xs text-secondary ml-auto">Only visible to you</span>
      </div>

      {/* Profile Views Stats */}
      <div className="mb-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-3">Profile Views</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surfacehighlight rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Eye size={16} className="text-accent-primary" />
              <span className="text-2xl font-bold text-accent-primary">{(stats?.total_views ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Total Views</p>
          </div>

          <div className="bg-surfacehighlight rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-500" />
              <span className="text-2xl font-bold text-green-500">{(stats?.views_last_7_days ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Last 7 Days</p>
          </div>

          <div className="bg-surfacehighlight rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users size={16} className="text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">{(stats?.unique_visitors ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Unique Visitors</p>
          </div>
        </div>
      </div>

      {/* Post Engagement Stats */}
      <div className="mb-6 pb-6 border-b border-surfacehighlight">
        <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-3">Post Engagement</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 rounded-lg p-4 text-center border border-accent-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap size={16} className="text-accent-primary" />
              <span className="text-2xl font-bold text-accent-primary">{(postStats?.total_post_views ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Post Views</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-lg p-4 text-center border border-red-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Heart size={16} className="text-red-500" />
              <span className="text-2xl font-bold text-red-500">{(postStats?.total_likes ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Likes</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg p-4 text-center border border-orange-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MessageCircle size={16} className="text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">{(postStats?.total_comments ?? 0).toLocaleString()}</span>
            </div>
            <p className="text-xs text-secondary uppercase tracking-wider">Comments</p>
          </div>
        </div>

        {/* Total Engagement */}
        <div className="mt-4 bg-gradient-to-r from-accent-primary/5 via-orange-500/5 to-orange-600/5 rounded-lg p-4 border border-accent-primary/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-secondary">Total Engagement</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-accent-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
              {((postStats?.total_post_views ?? 0) + (postStats?.total_likes ?? 0) + (postStats?.total_comments ?? 0)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {visitors.length > 0 && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-3">
            Recent Visitors (Last 7 Days)
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {visitors.map((visitor) => (
              <div
                key={visitor.visitor_id}
                className="flex-shrink-0 bg-surfacehighlight rounded-lg p-3 text-center min-w-[100px]"
              >
                {visitor.visitor_is_private ? (
                  <div className="w-12 h-12 mx-auto mb-2 bg-surface rounded-full flex items-center justify-center border border-surfacehighlight">
                    <User size={20} className="text-secondary" />
                  </div>
                ) : (
                  <div className="mb-2 flex justify-center">
                    <UserAvatar
                      avatarUrl={visitor.visitor_avatar_url}
                      userName={visitor.visitor_handle}
                      size="medium"
                    />
                  </div>
                )}
                <p className="text-xs font-semibold text-primary truncate">
                  {visitor.visitor_is_private ? 'Anonymous' : `@${visitor.visitor_handle}`}
                </p>
                <p className="text-xs text-secondary">
                  {visitor.visit_count} {visitor.visit_count === 1 ? 'view' : 'views'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {visitors.length === 0 && (
        <div className="text-center py-6 text-secondary text-sm">
          No visitors in the last 7 days
        </div>
      )}
    </div>
  );
}
