import { supabase } from './supabase';

/**
 * Manual badge giving functionality has been removed.
 * Badges are now only awarded automatically through the badge automation system.
 * See useBadgeChecker.ts for automatic badge awarding logic.
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  icon_path?: string;
  level: number;
  level_name: string;
  progression_group?: string;
  badge_group?: string;
  tier?: string;
  tier_threshold?: number;
  badge_type?: string;
  is_positive?: boolean;
  gradient?: string;
  created_at?: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

/**
 * Get all badges earned by a user
 * Fetches badges with full badge details from the database
 *
 * @param userId - ID of the user
 * @returns Array of UserBadge objects with nested badge details (empty array on error)
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        user_id,
        badge_id,
        earned_at,
        badge:badges(
          id,
          name,
          description,
          icon_name,
          category,
          level,
          level_name,
          badge_group,
          tier,
          tier_threshold,
          is_positive,
          gradient
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    const badgesWithDefaults = (data || [])
      .filter((item: any) => item.badge !== null)
      .map((item: any) => {
        const badge = item.badge as any;
        return {
          ...item,
          badge: {
            ...badge,
          }
        };
      });

    return badgesWithDefaults as UserBadge[];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

/**
 * Get user's reputation score with calculated rank tier
 * @deprecated Use ReputationScore component instead
 *
 * @param userId - ID of the user
 * @returns Object with total_score and rank tier name
 */
export async function getUserMotoRateScore(userId: string): Promise<{ total_score: number; rank: string }> {
  try {
    const { data, error } = await supabase.rpc('calculate_reputation_score', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching reputation score:', error);
      return { total_score: 0, rank: 'Bronze' };
    }

    const score = data || 0;

    // Calculate rank based on score thresholds
    let rank = 'Bronze';
    if (score >= 10000) {
      rank = 'Legendary';
    } else if (score >= 5000) {
      rank = 'Elite';
    } else if (score >= 2500) {
      rank = 'Titanium';
    } else if (score >= 1000) {
      rank = 'Gold';
    } else if (score >= 500) {
      rank = 'Silver';
    }

    return { total_score: score, rank };
  } catch (error) {
    console.error('Error fetching reputation score:', error);
    return { total_score: 0, rank: 'Bronze' };
  }
}

/**
 * Get user's driver rating information
 *
 * @param userId - ID of the user
 * @returns Object with avg_driver_rating and driver_rating_count
 */
export async function getUserDriverRating(userId: string): Promise<{ avg_driver_rating: number; driver_rating_count: number }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avg_driver_rating, driver_rating_count')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching driver rating:', error);
      return { avg_driver_rating: 0, driver_rating_count: 0 };
    }

    return {
      avg_driver_rating: data?.avg_driver_rating || 0,
      driver_rating_count: data?.driver_rating_count || 0
    };
  } catch (error) {
    console.error('Error fetching driver rating:', error);
    return { avg_driver_rating: 0, driver_rating_count: 0 };
  }
}

