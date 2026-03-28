import { supabase } from './supabase';
import { uploadVerificationProof } from './vehicles';

export interface VerificationResult {
  success: boolean;
  reason?: string;
  message: string;
  verification_tier?: string;
  detected_vin?: string;
  expected_vin?: string;
}

/**
 * Uploads document and calls AI verification Edge Function
 * @param vehicleId - The vehicle to verify
 * @param file - Registration document image/PDF
 * @param expectedVIN - VIN entered by user
 * @param userId - Current user ID
 * @returns Verification result
 */
export async function verifyDocument(
  vehicleId: string,
  file: File,
  expectedVIN: string,
  userId: string
): Promise<VerificationResult> {
  // Rate limit: max 3 verification attempts per vehicle per user in 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('verification_claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .gte('created_at', twentyFourHoursAgo);

  if ((count ?? 0) >= 3) {
    return {
      success: false,
      message: 'Too many verification attempts. Please try again in 24 hours.',
      reason: 'rate_limited',
    };
  }

  // 1. Upload document to private storage
  const proofUrl = await uploadVerificationProof(file, vehicleId, userId);

  // 2. Call verify-document Edge Function
  const { data, error } = await supabase.functions.invoke('verify-document', {
    body: {
      vehicleId: vehicleId,
      imageUrl: proofUrl,
      documentType: 'registration',
    },
  });

  if (error) {
    throw new Error(error.message || 'Verification failed');
  }

  // Map the edge function response to our VerificationResult format
  const result = data as { verified: boolean; confidence: number; reason?: string; extractedData?: { vin?: string } };
  return {
    success: result.verified && result.confidence >= 0.7,
    message: result.verified
      ? 'Vehicle ownership verified successfully!'
      : 'Verification failed. Please check your document and try again.',
    reason: result.reason,
    verification_tier: result.verified ? 'verified' : 'standard',
    detected_vin: result.extractedData?.vin,
    expected_vin: expectedVIN,
  };
}

/**
 * Normalize VIN for comparison (uppercase, no spaces/dashes)
 */
export function normalizeVIN(vin: string): string {
  return vin.toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Validate VIN format (17 characters, no I/O/Q)
 */
export function isValidVINFormat(vin: string): boolean {
  const normalized = normalizeVIN(vin);
  if (normalized.length !== 17) return false;
  if (/[IOQ]/.test(normalized)) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized);
}
