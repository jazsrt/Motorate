/*
 ============================================================
 RUN THIS SQL IN SUPABASE SQL EDITOR BEFORE USING THIS HOOK
 ============================================================

 See: /migrations/badge_auto_award_function.sql

 This creates the check_and_award_badges() function that:
 - Maps actions to badge groups
 - Counts user activities
 - Awards tiered badges automatically
 - Returns list of newly earned badges

 ============================================================
*/

import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBadges } from '../contexts/BadgeContext';

interface AwardedBadge {
  badge_id: string;
  badge_name: string;
  badge_rarity: string;
}

export function useBadgeChecker() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { celebrateBadge } = useBadges();

  const checkBadges = useCallback(async (action: string): Promise<AwardedBadge[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .rpc('check_and_award_badges', {
          p_user_id: user.id,
          p_action: action,
        });

      if (error) {
        console.error('[BadgeChecker] Badge check error:', error);
        return [];
      }

      const awarded = (data as AwardedBadge[]) || [];

      // For each awarded badge, fetch full badge data and trigger celebration modal
      for (const badge of awarded) {
        try {
          const { data: badgeData, error: fetchError } = await supabase
            .from('badges')
            .select('*')
            .eq('id', badge.badge_id)
            .maybeSingle();

          if (fetchError) {
            console.error('[BadgeChecker] Failed to fetch badge details:', fetchError.message);
            // Fall back to toast if we can't get full badge data
            showToast(`Badge Unlocked: ${badge.badge_name}!`, 'success');
            continue;
          }

          if (badgeData) {
            // Trigger the full celebration modal
            celebrateBadge(badgeData);
          } else {
            // Badge not found in DB — show toast as fallback
            showToast(`Badge Unlocked: ${badge.badge_name}!`, 'success');
          }
        } catch (err) {
          console.error('[BadgeChecker] Error fetching badge for celebration:', err);
          showToast(`Badge Unlocked: ${badge.badge_name}!`, 'success');
        }
      }

      return awarded;
    } catch (err) {
      console.error('[BadgeChecker] Badge check failed:', err);
      return [];
    }
  }, [user?.id, showToast, celebrateBadge]);

  // Keep the old function for backwards compatibility
  const checkActivityBadges = useCallback(async (): Promise<AwardedBadge[]> => {
    // Check all activity types
    const actions = ['spot', 'review', 'post', 'comment', 'follow', 'like', 'photo', 'mod'];
    const allAwardedBadges: AwardedBadge[] = [];

    for (const action of actions) {
      const awarded = await checkBadges(action);
      allAwardedBadges.push(...awarded);
    }

    return allAwardedBadges;
  }, [checkBadges]);

  return { checkBadges, checkActivityBadges };
}
