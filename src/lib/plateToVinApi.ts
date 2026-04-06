// Auto.dev Plate-to-VIN via Supabase Edge Function (server-side proxy)
// Edge function: supabase/functions/lookup-plate
// Free tier: 1,000 calls/month

import { supabase } from './supabase';
import { hashPlate } from './hash';

export interface VehicleLookupResult {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  color: string;
  engine: string;
  bodyStyle: string;
  transmission: string;
  driveType: string;
  fuel: string;
  fullName: string;
}

export type LookupResult =
  | { cacheHit: true; make: string; model: string; year: number; color?: string; trim?: string; stock_image_url?: string }
  | { requiresConfirmation: true; lookupCost: 1; cacheHit: false }
  | { error: string }
  | null;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CACHE_TTL_DAYS = 90;

/**
 * Cache-first plate lookup.
 * 1. Normalize plate, hash it
 * 2. Check vehicles table for cached data
 * 3. If fresh cache hit → return immediately
 * 4. If no cache → return requiresConfirmation (caller shows confirmation UI)
 *
 * Signature stays identical to original for backward compatibility.
 * Callers that don't handle LookupResult will get null (cache miss returns null
 * since the old return type was VehicleLookupResult | null).
 */
export async function lookupPlate(
  plate: string,
  state: string,
  userId?: string
): Promise<VehicleLookupResult | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured — falling back to manual entry');
    return null;
  }

  // Pro paywall gate: only Pro users get plate-to-VIN lookups
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .maybeSingle();

      if (!profile?.is_pro) {
        return null;
      }
    } catch {
      return null;
    }
  }

  // Step 1: Normalize plate
  const normalizedPlate = plate.trim().toUpperCase().replace(/[\s-]/g, '');
  const normalizedState = state.trim().toUpperCase();

  // Step 2: Hash and check cache
  try {
    const hash = await hashPlate(normalizedState, normalizedPlate);

    const { data: cached } = await supabase
      .from('vehicles')
      .select('make, model, year, color, trim, stock_image_url, created_at')
      .eq('plate_hash', hash)
      .limit(1)
      .maybeSingle();

    if (cached && cached.make && cached.model) {
      // Check freshness — use created_at as proxy for cache age
      const createdAt = new Date(cached.created_at);
      const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCreated <= CACHE_TTL_DAYS) {
        // Fresh cache hit — return as VehicleLookupResult
        return {
          vin: '',
          year: String(cached.year ?? ''),
          make: cached.make,
          model: cached.model,
          trim: cached.trim ?? '',
          color: cached.color ?? '',
          engine: '',
          bodyStyle: '',
          transmission: '',
          driveType: '',
          fuel: '',
          fullName: `${cached.year ?? ''} ${cached.make} ${cached.model}`.trim(),
        };
      }
    }
  } catch {
    // Cache check failed — fall through to API
  }

  // Step 3: No cache hit — return null (caller falls back to manual entry or calls executeLookup)
  return null;
}

/**
 * Execute the actual plate-to-VIN API call via RapidAPI.
 * Only called after user explicitly confirms (to conserve API quota).
 * Credit consumption happens in the caller (plateSearch.ts), not here.
 */
export async function executeLookup(
  plate: string,
  state: string,
  _userId?: string
): Promise<VehicleLookupResult | null> {
  console.log('RapidAPI key present:', !!import.meta.env.VITE_RAPIDAPI_PLATE_KEY);
  const apiKey = import.meta.env.VITE_RAPIDAPI_PLATE_KEY;

  if (!apiKey) {
    console.warn('VITE_RAPIDAPI_PLATE_KEY not configured — plate lookup unavailable');
    return null;
  }

  try {
    const cleanPlate = plate.trim().toUpperCase();
    const cleanState = state.trim().toUpperCase();
    const url = `https://us-plate-to-vin-lookup.p.rapidapi.com/rpc/secure_lookup_plate?p_state=${encodeURIComponent(cleanState)}&p_plate=${encodeURIComponent(cleanPlate)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'us-plate-to-vin-lookup.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('RapidAPI plate lookup failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('RapidAPI response:', JSON.stringify(data));

    if (!data) return null;

    // Map response — covers common field naming patterns
    const make = data.make || data.Make || data.manufacturer || null;
    const model = data.model || data.Model || null;
    const year = data.year || data.Year || data.model_year || data.modelYear || null;

    if (!make && !model) return null;

    return {
      vin: data.vin || data.VIN || data.Vin || '',
      year: String(year ?? ''),
      make: make ?? '',
      model: model ?? '',
      trim: data.trim || data.Trim || data.style || '',
      color: data.color || data.Color || data.exterior_color || data.exteriorColor || '',
      engine: data.engine || data.Engine || data.engine_description || '',
      bodyStyle: data.body_type || data.bodyType || data.style || '',
      transmission: data.transmission || data.Transmission || '',
      driveType: data.drivetrain || data.Drivetrain || data.drive_type || '',
      fuel: data.fuel_type || data.fuelType || '',
      fullName: `${year ?? ''} ${make ?? ''} ${model ?? ''}`.trim(),
    };
  } catch (err) {
    console.error('RapidAPI plate lookup error:', err);
    return null;
  }
}
