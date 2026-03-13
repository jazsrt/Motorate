import { supabase } from './supabase';

export interface ProfileViewStats {
  total_views: number;
  views_last_7_days: number;
  unique_visitors: number;
}

export interface RecentVisitor {
  visitor_id: string;
  visitor_handle: string;
  visitor_avatar_url: string | null;
  visitor_is_private: boolean;
  last_visit: string;
  visit_count: number;
}

export async function trackProfileView(_viewedProfileId: string, _viewerId: string) {
  // profile_views table not yet created in Supabase — skip to avoid 400 errors
  // Once the migration is applied, restore the insert query here
}

export async function getProfileViewStats(profileId: string): Promise<ProfileViewStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_profile_view_stats', {
      profile_id: profileId
    });

    if (error) {
      console.error('Error getting profile view stats:', error);
      // Return default values if function doesn't exist yet
      return { total_views: 0, views_last_7_days: 0, unique_visitors: 0 };
    }

    return data?.[0] || { total_views: 0, views_last_7_days: 0, unique_visitors: 0 };
  } catch (err) {
    console.error('Error getting profile view stats:', err);
    // Return default values on any error
    return { total_views: 0, views_last_7_days: 0, unique_visitors: 0 };
  }
}

export async function getRecentVisitors(
  profileId: string,
  days: number = 7
): Promise<RecentVisitor[]> {
  try {
    const { data, error } = await supabase.rpc('get_recent_visitors', {
      profile_id: profileId,
      days
    });

    if (error) {
      console.error('Error getting recent visitors:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting recent visitors:', err);
    return [];
  }
}

export async function checkIfFollowing(userId: string, targetUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error checking follow status:', err);
    return false;
  }
}
