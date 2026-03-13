import { supabase } from './supabase';

/**
 * Result from admin badge granting operation
 */
export interface AdminGrantBadgeResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Grant a badge to a user (admin only)
 *
 * This function calls the database function which:
 * - Verifies admin permissions
 * - Checks if user and badge exist
 * - Inserts badge into user_badges (triggers notification)
 * - Returns success/error status
 *
 * @param userId - ID of user receiving the badge
 * @param badgeId - ID of badge to grant
 * @param adminId - ID of admin granting the badge
 * @returns Result with success status and message/error
 *
 * @example
 * try {
 *   const result = await adminGrantBadge(userId, badgeId, adminId);
 *   if (result.success) {
 *   }
 * } catch (error) {
 *   console.error('Failed to grant badge:', error);
 * }
 */
export async function adminGrantBadge(
  userId: string,
  badgeId: string,
  adminId: string
): Promise<AdminGrantBadgeResult> {
  try {
    const { data, error } = await supabase.rpc('admin_grant_badge', {
      p_user_id: userId,
      p_badge_id: badgeId,
      p_admin_id: adminId
    });

    if (error) {
      console.error('RPC error:', error);
      return {
        success: false,
        error: error.message || 'Failed to grant badge'
      };
    }

    // The function returns a jsonb object with success, message, or error
    return {
      success: data.success,
      message: data.message,
      error: data.error
    };
  } catch (error: any) {
    console.error('Exception granting badge:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Get all available badges that can be granted
 *
 * @returns Array of all badges in the system
 */
export async function getAllBadges() {
  const { data, error } = await supabase
    .from('badges')
    .select('id, name, description, icon_name, rarity, category, level')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching badges:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a user already has a specific badge
 *
 * @param userId - ID of the user
 * @param badgeId - ID of the badge
 * @returns True if user has the badge, false otherwise
 */
export async function userHasBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (error) {
    console.error('Error checking badge:', error);
    return false;
  }

  return data !== null;
}
