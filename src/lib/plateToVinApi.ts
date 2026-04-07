// Plate-to-VIN via Supabase Edge Function → RapidAPI (us-plate-to-vin-lookup.p.rapidapi.com)
// Edge function: supabase/functions/lookup-plate


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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    console.log('[plateToVinApi] Raw RapidAPI response:', JSON.stringify(data));

    if (!data) return null;

    // API returns nested structure: data.vehicle, data.engine, etc.
    const vehicle = data.vehicle || {};
    const eng = data.engine || {};

    console.log('[plateToVinApi] Extracted vehicle:', JSON.stringify(vehicle), 'engine:', JSON.stringify(eng));

    if (!vehicle.make && !vehicle.model) {
      console.warn('[plateToVinApi] No make/model found in data.vehicle — returning null');
      return null;
    }

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
