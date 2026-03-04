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

interface AwardedBadge {
  badge_id: string;
  badge_name: string;
  badge_rarity: string;
}

export function useBadgeChecker() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const checkBadges = useCallback(async (action: string): Promise<AwardedBadge[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .rpc('check_and_award_badges', {
          p_user_id: user.id,
          p_action: action,
        });

      if (error) {
        console.error('Badge check error:', error);
        return [];
      }

      const awarded = (data as AwardedBadge[]) || [];

      // Show toast notification for each newly awarded badge
      for (const badge of awarded) {
        showToast(`Badge Unlocked: ${badge.badge_name}!`, 'success');
      }

      return awarded;
    } catch (err) {
      console.error('Badge check failed:', err);
      return [];
    }
  }, [user?.id, showToast]);

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
