// Auto.dev Plate-to-VIN via Supabase Edge Function (server-side proxy)
// Edge function: supabase/functions/lookup-plate
// Free tier: 1,000 calls/month

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: profile } = await sb
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .maybeSingle();

      if (!profile?.is_pro) {
        // Free user — return null, fall back to manual entry
        return null;
      }
    } catch {
      // If pro check fails, fall back to manual entry
      return null;
    }
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/lookup-plate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plate, state }),
      }
    );

    if (!response.ok) {
      console.error('Plate lookup edge function error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.found || !data.make || !data.model) {
      return null;
    }

    return {
      vin: data.vin ?? '',
      year: String(data.year ?? ''),
      make: data.make ?? '',
      model: data.model ?? '',
      trim: data.trim ?? '',
      color: '',
      engine: data.engine ?? '',
      bodyStyle: data.style ?? '',
      transmission: data.transmission ?? '',
      driveType: data.drivetrain ?? '',
      fuel: '',
      fullName: `${data.year ?? ''} ${data.make ?? ''} ${data.model ?? ''}`.trim(),
    };
  } catch (error) {
    console.error('Plate lookup failed:', error);
    return null;
  }
}
