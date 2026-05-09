import { supabase } from './supabase';
import { VEHICLE_PLATE_VISIBLE_COLUMNS } from './vehicles';
import { hashPlate } from './hash';
import { executeLookup } from './plateToVinApi';
import { getLookupCredits, consumeLookupCredit } from './spotAnalytics';
import { getVehicleImageUrl } from './carImageryApi';

export interface VehicleResult {
  id?: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  trim: string | null;
  stock_image_url: string | null;
  profile_image_url?: string | null;
  is_claimed: boolean;
  verification_tier: string;
  owner_id: string | null;
  plate_state: string | null;
  plate_number: string | null;
  spots_count?: number;
  vehicle_handle?: string | null;
  // API spec data (only present for API-sourced vehicles)
  engine?: string | null;
  cylinders?: string | null;
  fuel?: string | null;
  bodyStyle?: string | null;
  driveType?: string | null;
  doors?: string | null;
  madeIn?: string | null;
  msrp?: string | null;
}

export interface PlateSearchResult {
  status: 'found' | 'not-found' | 'error';
  vehicle?: VehicleResult;
  plateHash?: string;
  creditsRemaining?: number;
  noCredits?: boolean;
  error?: string;
}

/**
 * Unified plate search: DB cache first, then API lookup if cache misses.
 * Credit is consumed ONLY after a successful API lookup — never before.
 */
export async function searchPlate(
  stateCode: string,
  plateNumber: string,
  userId: string | undefined
): Promise<PlateSearchResult> {
  try {
    const normalized = plateNumber.trim().toUpperCase().replace(/[\s-]/g, '');
    const hash = await hashPlate(stateCode, normalized);

    // Step 1: Check internal DB cache
    const { data: cached, error: dbError } = await supabase
      .from('vehicles')
      .select(VEHICLE_PLATE_VISIBLE_COLUMNS + ', vehicle_handle')
      .eq('plate_hash', hash)
      .maybeSingle();

    if (dbError) throw new Error(dbError.message);

    if (cached && (cached as any).make && (cached as any).model) {
      return {
        status: 'found',
        vehicle: cached as unknown as VehicleResult,
        plateHash: hash,
      };
    }

    // Step 2: DB miss — check lookup credits
    if (!userId) {
      return { status: 'not-found', plateHash: hash, noCredits: true };
    }

    const credits = await getLookupCredits(userId);

    if (credits <= 0) {
      console.warn('[plateSearch] No credits — skipping API call');
      return { status: 'not-found', plateHash: hash, creditsRemaining: 0, noCredits: true };
    }

    // Step 3: Call API lookup
    const result = await executeLookup(normalized, stateCode, userId);

    if (result && result.make && result.model) {
      // Consume credit ONLY after successful response
      await consumeLookupCredit(userId);

      // Fetch stock image
      const stockUrl = await getVehicleImageUrl(
        result.make, result.model,
        result.year ? parseInt(result.year) : undefined,
        result.color || undefined
      );

      return {
        status: 'found',
        plateHash: hash,
        creditsRemaining: credits - 1,
        vehicle: {
          make: result.make,
          model: result.model,
          year: result.year ? parseInt(result.year) : null,
          color: result.color || null,
          trim: result.trim || null,
          stock_image_url: stockUrl || null,
          is_claimed: false,
          verification_tier: 'shadow',
          owner_id: null,
          plate_state: stateCode,
          plate_number: normalized,
          engine: result.engine || null,
          cylinders: result.cylinders || null,
          fuel: result.fuel || null,
          bodyStyle: result.bodyStyle || null,
          driveType: result.driveType || null,
          doors: result.doors || null,
          madeIn: result.madeIn || null,
          msrp: result.msrp || null,
        },
      };
    }

    // API returned nothing — do NOT consume credit
    return { status: 'not-found', plateHash: hash, creditsRemaining: credits };
  } catch (err: unknown) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Search failed',
    };
  }
}
