import { supabase } from './supabase';

export type DisputeType =
  | 'false_information'
  | 'wrong_vehicle'
  | 'harassment'
  | 'fake_review'
  | 'privacy_violation'
  | 'other';

export type DisputeStatus = 'open' | 'investigating' | 'resolved';

export type DisputeResolution = 'upheld' | 'dismissed' | 'review_removed' | 'review_edited';

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  false_information: 'Contains false information',
  wrong_vehicle: 'This is the wrong vehicle',
  harassment: 'Harassment or personal attack',
  fake_review: 'Fake/spam review',
  privacy_violation: 'Privacy violation',
  other: 'Other',
};

/**
 * File a dispute against a review
 *
 * Rate limits:
 * - Max 1 dispute per review per user
 * - Max 3 open disputes per user at a time
 */
export async function fileDispute(
  reviewId: string,
  disputeType: DisputeType,
  description: string,
  evidenceUrls?: string[]
): Promise<unknown> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for open disputes limit
  const { count, error: countError } = await supabase
    .from('review_disputes')
    .select('*', { count: 'exact', head: true })
    .eq('disputed_by', user.id)
    .eq('status', 'open');

  if (countError) throw countError;

  if (count && count >= 3) {
    throw new Error('You have reached the maximum number of open disputes (3). Please wait for existing disputes to be resolved.');
  }

  // Create dispute
  const { data: dispute, error } = await supabase
    .from('review_disputes')
    .insert({
      review_id: reviewId,
      disputed_by: user.id,
      dispute_type: disputeType,
      description,
      evidence_urls: evidenceUrls || null
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already filed a dispute for this review');
    }
    throw error;
  }

  // Trigger AI evaluation
  try {
    await supabase.functions.invoke('evaluate-dispute', {
      body: { disputeId: dispute.id }
    });
  } catch (evalError) {
    console.error('Failed to trigger dispute evaluation:', evalError);
  }

  return dispute;
}

/**
 * Get user's disputes
 */
export async function getMyDisputes(status?: DisputeStatus) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('review_disputes')
    .select(`
      *,
      review:reviews(
        id,
        comment,
        driver_rating,
        vehicle_rating,
        vehicle:vehicles(
          id,
          make,
          model,
          year
        )
      )
    `)
    .eq('disputed_by', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get disputes filed against reviews on user's vehicles
 */
export async function getDisputesAgainstMyVehicles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('review_disputes')
    .select(`
      *,
      review:reviews!inner(
        id,
        comment,
        driver_rating,
        vehicle_rating,
        vehicle:vehicles!inner(
          id,
          make,
          model,
          year,
          owner_id
        )
      )
    `)
    .eq('review.vehicle.owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get dispute by ID
 */
export async function getDispute(disputeId: string) {
  const { data, error } = await supabase
    .from('review_disputes')
    .select(`
      *,
      review:reviews(
        id,
        comment,
        driver_rating,
        vehicle_rating,
        sentiment,
        created_at,
        photo_url,
        author:profiles(id, handle),
        vehicle:vehicles(
          id,
          make,
          model,
          year,
          color
        )
      )
    `)
    .eq('id', disputeId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if user has already disputed a review
 */
export async function hasDisputedReview(reviewId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('review_disputes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('disputed_by', user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * Get dispute for a review (if user filed one)
 */
export async function getDisputeForReview(reviewId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('review_disputes')
    .select('*')
    .eq('review_id', reviewId)
    .eq('disputed_by', user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}
