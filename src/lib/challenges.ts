import { supabase } from './supabase';

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if GPS coordinates are within checkpoint radius
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  checkpointLat: number,
  checkpointLon: number,
  radiusMeters: number,
  buffer: number = 1.5
): boolean {
  const distance = calculateDistance(userLat, userLon, checkpointLat, checkpointLon);
  return distance <= radiusMeters * buffer;
}

/**
 * Submit challenge photo for verification
 */
export async function submitChallengePhoto(
  userId: string,
  challengeId: string,
  checkpointId: string,
  imageUrl: string,
  gpsCoords: { lat: number; lng: number }
): Promise<{ progressId: string }> {
  const { data: progress, error } = await supabase
    .from('challenge_progress')
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      checkpoint_id: checkpointId,
      verified: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger verification edge function
  const { error: verifyError } = await supabase.functions.invoke('verify-challenge-photo', {
    body: {
      progressId: progress.id,
      imageUrl,
      gpsLat: gpsCoords.lat,
      gpsLng: gpsCoords.lng,
    },
  });

  if (verifyError) {
    console.error('Verification trigger failed:', verifyError);
  }

  return { progressId: progress.id };
}

/**
 * Get user's progress for a specific challenge
 */
export async function getChallengeProgress(userId: string, challengeId: string) {
  const { data, error } = await supabase
    .from('challenge_progress')
    .select(`
      *,
      checkpoint:challenge_checkpoints(*)
    `)
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);

  if (error) throw error;
  return data || [];
}

/**
 * Check if challenge is complete and award rewards
 */
export async function checkChallengeCompletion(
  userId: string,
  challengeId: string
): Promise<boolean> {
  // Get challenge requirements
  const { data: challenge, error: challengeError } = await supabase
    .from('location_challenges')
    .select('required_completions, points_reward, badge_id')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) return false;

  // Count verified checkpoints
  const { count, error: countError } = await supabase
    .from('challenge_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('verified', true);

  if (countError) return false;

  // Check if complete
  if (count && count >= challenge.required_completions) {
    // Check if already completed
    const { data: existing } = await supabase
      .from('challenge_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (existing) return true;

    // Create completion record
    const { error: completionError } = await supabase
      .from('challenge_completions')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        points_awarded: challenge.points_reward,
        badge_awarded_id: challenge.badge_id,
      });

    if (completionError) {
      console.error('Failed to create completion:', completionError);
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Get all challenges with user progress
 */
export async function getChallengesWithProgress(userId: string) {
  const { data: challenges, error: challengesError } = await supabase
    .from('location_challenges')
    .select(`
      *,
      checkpoints:challenge_checkpoints(count),
      badge:badges(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (challengesError) throw challengesError;

  const { data: progress, error: progressError } = await supabase
    .from('challenge_progress')
    .select('challenge_id, verified')
    .eq('user_id', userId);

  if (progressError) throw progressError;

  // Calculate progress for each challenge
  return challenges?.map((challenge) => {
    const userProgress = progress?.filter((p) => p.challenge_id === challenge.id) || [];
    const verifiedCount = userProgress.filter((p) => p.verified).length;
    const checkpointCount = challenge.checkpoints?.[0]?.count || 0;

    return {
      ...challenge,
      checkpointCount,
      completedCount: verifiedCount,
      progressPercent: checkpointCount > 0 ? (verifiedCount / checkpointCount) * 100 : 0,
      isComplete: verifiedCount >= challenge.required_completions,
    };
  });
}

/**
 * Get single challenge with detailed progress
 */
export async function getChallengeDetail(challengeId: string, userId: string) {
  const { data: challenge, error: challengeError } = await supabase
    .from('location_challenges')
    .select(`
      *,
      checkpoints:challenge_checkpoints(*),
      badge:badges(*)
    `)
    .eq('id', challengeId)
    .single();

  if (challengeError) throw challengeError;

  const { data: progress, error: progressError } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);

  if (progressError) throw progressError;

  // Map progress to checkpoints
  const checkpointsWithProgress = challenge.checkpoints?.map((checkpoint: Record<string, unknown>) => {
    const checkpointProgress = progress?.find((p) => p.checkpoint_id === checkpoint.id);
    return {
      ...checkpoint,
      completed: checkpointProgress?.verified || false,
      pending: checkpointProgress && !checkpointProgress.verified,
      progressId: checkpointProgress?.id,
    };
  });

  const verifiedCount = progress?.filter((p) => p.verified).length || 0;

  return {
    ...challenge,
    checkpoints: checkpointsWithProgress,
    completedCount: verifiedCount,
    progressPercent:
      challenge.checkpoints.length > 0
        ? (verifiedCount / challenge.checkpoints.length) * 100
        : 0,
    isComplete: verifiedCount >= challenge.required_completions,
  };
}

/**
 * Get checkpoint with progress
 */
export async function getCheckpointDetail(checkpointId: string, userId: string) {
  const { data: checkpoint, error: checkpointError } = await supabase
    .from('challenge_checkpoints')
    .select(`
      *,
      challenge:location_challenges(*)
    `)
    .eq('id', checkpointId)
    .single();

  if (checkpointError) throw checkpointError;

  const { data: progress, error: progressError } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('checkpoint_id', checkpointId)
    .maybeSingle();

  if (progressError) throw progressError;

  return {
    ...checkpoint,
    completed: progress?.verified || false,
    pending: progress && !progress.verified,
    progressId: progress?.id,
  };
}
