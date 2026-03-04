import { supabase } from './supabase';

export interface HideReviewResult {
  success: boolean;
  hidden_count?: number;
  remaining?: number;
  error?: string;
}

/**
 * Hide a review as vehicle owner (God Mode)
 *
 * Restrictions:
 * - Only works on pre-claim reviews
 * - Maximum 5 reviews can be hidden per vehicle
 * - Requires ownership of the vehicle
 * - Action is logged in moderation_log
 */
export async function hideReview(reviewId: string, reason?: string): Promise<HideReviewResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('hide_review_as_owner', {
    p_review_id: reviewId,
    p_owner_id: user.id,
    p_reason: reason || null
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data;
}

/**
 * Unhide a review as vehicle owner
 *
 * Removes the hidden status and decrements the hidden count
 */
export async function unhideReview(reviewId: string): Promise<HideReviewResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('unhide_review_as_owner', {
    p_review_id: reviewId,
    p_owner_id: user.id
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data;
}

/**
 * Get moderation history for a vehicle
 */
export async function getModerationHistory(vehicleId: string) {
  const { data, error } = await supabase
    .from('review_moderation_log')
    .select(`
      *,
      review:reviews(id, review_text),
      moderator:profiles(handle)
    `)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get God Mode stats for a vehicle
 */
export async function getGodModeStats(vehicleId: string) {
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('hidden_review_count')
    .eq('id', vehicleId)
    .single();

  if (vehicleError) throw vehicleError;

  const maxHidden = 5;
  const hiddenCount = vehicle?.hidden_review_count || 0;
  const remaining = Math.max(0, maxHidden - hiddenCount);

  return {
    hiddenCount,
    maxHidden,
    remaining,
    canHideMore: remaining > 0,
    percentUsed: (hiddenCount / maxHidden) * 100
  };
}
