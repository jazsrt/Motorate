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

function getOrCreateSessionId(): string {
  const SESSION_KEY = 'motorate_pv_session';
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `pv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `pv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

export async function trackProfileView(viewedProfileId: string, viewerId?: string | null) {
  try {
    if (!viewedProfileId) return;
    // Don't track self-views
    if (viewerId && viewerId === viewedProfileId) return;

    const sessionId = getOrCreateSessionId();
    const today = new Date().toISOString().split('T')[0];

    // Deduplicate: one view per viewer/session per profile per day
    const dedupeQuery = supabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', viewedProfileId)
      .eq('view_date', today);

    if (viewerId) {
      dedupeQuery.eq('viewer_id', viewerId);
    } else {
      dedupeQuery.eq('session_id', sessionId).is('viewer_id', null);
    }

    const { count } = await dedupeQuery;
    if ((count ?? 0) > 0) return;

    await supabase.from('profile_views').insert({
      profile_id: viewedProfileId,
      viewer_id: viewerId || null,
      session_id: sessionId,
      view_date: today,
    });
  } catch {
    // Silent — profile view tracking must never break the UI
  }
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
