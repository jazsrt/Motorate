import { supabase } from './supabase';
import { calculateAndAwardReputation } from './reputation';

export type VerificationTier = 'shadow' | 'conditional' | 'standard' | 'verified' | 'vin_verified';

/** Safe columns for public-facing vehicle queries (feed, rankings, search, public profiles) */
export const VEHICLE_PUBLIC_COLUMNS = `
  id,
  plate_hash,
  city,
  state,
  year,
  make,
  model,
  trim,
  color,
  stock_image_url,
  profile_image_url,
  reputation_score,
  spot_count,
  spots_count,
  is_claimed,
  is_private,
  verification_tier,
  owner_id,
  created_at,
  updated_at
`.replace(/\s+/g, ' ').trim();

/** Owner-only columns — includes plate info but never VIN */
export const VEHICLE_OWNER_COLUMNS = `
  id,
  plate_hash,
  plate_number,
  plate_state,
  city,
  state,
  year,
  make,
  model,
  trim,
  color,
  stock_image_url,
  profile_image_url,
  reputation_score,
  spot_count,
  spots_count,
  is_claimed,
  is_private,
  verification_tier,
  verification_status,
  owner_id,
  claimed_at,
  created_at,
  updated_at
`.replace(/\s+/g, ' ').trim();

export interface Vehicle {
  id: string;
  plate_hash: string;
  owner_id: string | null;
  is_claimed: boolean;
  verification_tier: VerificationTier;
  owner_proof_url: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
}

/**
 * Claims a vehicle with standard verification (soft claim)
 * Sets verification_tier to 'standard' and owner_id to current user
 */
export async function claimVehicleStandard(vehicleId: string, userId: string) {
  const { data: vehicle, error: fetchError } = await supabase
    .from('vehicles')
    .select('is_claimed, owner_id')
    .eq('id', vehicleId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!vehicle) throw new Error('Vehicle not found');

  if (vehicle.owner_id && vehicle.is_claimed) {
    throw new Error('Vehicle already claimed');
  }

  const { error } = await supabase
    .from('vehicles')
    .update({
      owner_id: userId,
      is_claimed: true,
      claimed_at: new Date().toISOString(),
      verification_tier: 'standard',
    })
    .eq('id', vehicleId);

  if (error) throw error;

  // REPUTATION: Award points for claiming vehicle
  try {
    await calculateAndAwardReputation({
      userId,
      action: 'CLAIM_VEHICLE',
      referenceType: 'vehicle',
      referenceId: vehicleId
    });
  } catch (repError) {
    console.error('Reputation award error:', repError);
  }

  try {
    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_claimed', true);

    if (vehicleCount === 1) {
      const { data: firstRideBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('slug', 'my-first-ride')
        .maybeSingle();

      if (firstRideBadge) {
        await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: firstRideBadge.id
          });
      }
    }
  } catch (badgeError) {
    console.error('Failed to award first ride badge:', badgeError);
  }

  return { success: true };
}

/**
 * Upgrades a vehicle claim to verified status with proof document
 * Can override standard claims - verified claims take precedence
 */
export async function claimVehicleVerified(
  vehicleId: string,
  userId: string,
  proofUrl: string
) {
  const { error } = await supabase.rpc('upgrade_to_verified', {
    p_vehicle_id: vehicleId,
    p_new_owner_id: userId,
    p_proof_url: proofUrl,
  });

  if (error) throw error;

  // REPUTATION: Award points for claiming vehicle (verified tier)
  try {
    await calculateAndAwardReputation({
      userId,
      action: 'CLAIM_VEHICLE',
      referenceType: 'vehicle',
      referenceId: vehicleId
    });
  } catch (repError) {
    console.error('Reputation award error:', repError);
  }

  try {
    const { data: verifiedOwnerBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('slug', 'verified-owner')
      .maybeSingle();

    if (verifiedOwnerBadge) {
      await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: verifiedOwnerBadge.id
        });
    }
  } catch (badgeError) {
    console.error('Failed to award verified owner badge:', badgeError);
  }

  return { success: true };
}

/**
 * Uploads verification proof document to private storage
 */
export async function uploadVerificationProof(
  file: File,
  vehicleId: string,
  userId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/verification/${vehicleId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('vehicles')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('vehicles')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Checks if user has verified ownership of vehicle
 */
export async function hasVerifiedOwnership(
  userId: string,
  vehicleId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_verified_ownership', {
    p_user_id: userId,
    p_vehicle_id: vehicleId,
  });

  if (error) throw error;
  return data;
}

/**
 * User-friendly error messages for vehicle claiming errors
 */
export function getClaimErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'Vehicle not found': "This vehicle doesn't exist",
    'Vehicle already claimed': 'This vehicle has already been claimed by someone else',
  };

  return errorMessages[error] || 'Failed to claim vehicle. Please try again.';
}
