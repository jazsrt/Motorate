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
  const result = data as any;
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
  return vin.toUpperCase().replace(/[\s\-]/g, '');
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
