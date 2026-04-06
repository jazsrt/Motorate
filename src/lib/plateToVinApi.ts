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
  cylinders: string;
  fuel: string;
  bodyStyle: string;
  transmission: string;
  driveType: string;
  doors: string;
  madeIn: string;
  msrp: string;
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
          cylinders: '',
          fuel: '',
          bodyStyle: '',
          transmission: '',
          driveType: '',
          doors: '',
          madeIn: '',
          msrp: '',
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
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-plate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate: plate.trim().toUpperCase(), state: state.trim().toUpperCase() })
    });
    if (!response.ok) { console.warn('lookup-plate failed:', response.status); return null; }
    const data = await response.json();
    console.log('[plateToVinApi] response:', JSON.stringify(data));

    if (!data) return null;

    // API returns nested structure: data.vehicle, data.engine, etc.
    const vehicle = data.vehicle || {};
    const eng = data.engine || {};

    if (!vehicle.make && !vehicle.model) return null;

    // Title-case make/model from API (returns lowercase)
    const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

    return {
      vin: data.vin || '',
      year: vehicle.year ? String(vehicle.year) : '',
      make: vehicle.make ? capFirst(vehicle.make) : '',
      model: vehicle.model ? vehicle.model.charAt(0).toUpperCase() + vehicle.model.slice(1) : '',
      trim: vehicle.trim || '',
      color: '',
      engine: eng.description || '',
      cylinders: eng.cylinders || '',
      fuel: eng.fuel_type || '',
      bodyStyle: vehicle.type || '',
      transmission: '',
      driveType: data.drivetrain || '',
      doors: vehicle.doors || '',
      madeIn: vehicle.made_in || '',
      msrp: data.pricing?.msrp || '',
      fullName: [vehicle.year, vehicle.make ? capFirst(vehicle.make) : '', vehicle.model].filter(Boolean).join(' '),
    };
  } catch (err) {
    console.error('RapidAPI plate lookup error:', err);
    return null;
  }
}
