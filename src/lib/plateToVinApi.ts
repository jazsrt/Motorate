// Plate lookup via Supabase Edge Function and RapidAPI.
// Edge function: supabase/functions/lookup-plate

export interface VehicleLookupResult {
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
  cityMpg?: string;
  hwyMpg?: string;
}

/**
 * Execute the actual plate lookup API call via Supabase Edge Function.
 * Handles flat, array, or nested response shapes from RapidAPI PostgREST.
 * Credit consumption happens in the caller (plateSearch.ts), not here.
 * VIN is intentionally not exposed to the browser from this lookup path.
 */
export async function executeLookup(
  plate: string,
  state: string,
  _userId?: string
): Promise<VehicleLookupResult | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-plate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plate: plate.trim().toUpperCase(), state: state.trim().toUpperCase() })
    });

    if (!response.ok) {
      console.warn('[plateToVinApi] lookup-plate failed:', response.status);
      return null;
    }

    const raw = await response.json();

    if (!raw) return null;

    // Normalise: handle array, flat object, or nested { vehicle, engine } shape
    const row = Array.isArray(raw) ? raw[0] : raw;

    if (!row) return null;

    // Detect shape — nested vs flat
    const isNested = row.vehicle && (row.vehicle.make || row.vehicle.model);

    const make      = isNested ? row.vehicle?.make    : (row.make    ?? row.Make    ?? null);
    const model     = isNested ? row.vehicle?.model   : (row.model   ?? row.Model   ?? null);
    const year      = isNested ? row.vehicle?.year    : (row.year    ?? row.Year    ?? null);
    const trim      = isNested ? row.vehicle?.trim    : (row.trim    ?? row.Trim    ?? null);
    const type      = isNested ? row.vehicle?.type    : (row.type    ?? row.body_style ?? row.bodyStyle ?? null);
    const doors     = isNested ? row.vehicle?.doors   : (row.doors   ?? row.Doors   ?? null);
    const engine    = isNested ? (row.engine?.description ?? row.engine?.size ?? '') : (row.engine ?? row.engine_description ?? row.displacement ?? '');
    const cylinders = isNested ? (row.engine?.cylinders ?? '') : (row.cylinders ?? row.engine_cylinders ?? '');
    const fuel      = isNested ? (row.engine?.fuel_type ?? '') : (row.fuel_type ?? row.fuel ?? '');
    const driveType = isNested ? (row.drivetrain ?? '') : (row.drivetrain ?? row.drive_type ?? row.driveType ?? '');
    const msrp      = isNested ? (row.pricing?.msrp ?? '') : (row.msrp ?? row.price ?? '');
    const cityMpg   = isNested ? (row.fuel_economy?.city_mpg ?? '') : (row.city_mpg ?? row.mpg_city ?? '');
    const hwyMpg    = isNested ? (row.fuel_economy?.highway_mpg ?? '') : (row.highway_mpg ?? row.mpg_highway ?? '');

    if (!make && !model) {
      console.warn('[plateToVinApi] No make/model in response — plate not in RapidAPI database');
      return null;
    }

    const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

    return {
      year:         year ? String(year) : '',
      make:         make ? capFirst(String(make)) : '',
      model:        model ? String(model).charAt(0).toUpperCase() + String(model).slice(1) : '',
      trim:         trim ? String(trim) : '',
      color:        '',
      engine:       String(engine),
      cylinders:    String(cylinders),
      fuel:         String(fuel),
      bodyStyle:    type ? String(type) : '',
      transmission: '',
      driveType:    String(driveType),
      doors:        doors ? String(doors) : '',
      madeIn:       isNested ? (row.vehicle?.made_in ?? '') : (row.made_in ?? row.country ?? ''),
      msrp:         String(msrp),
      fullName:     [year, make ? capFirst(String(make)) : '', model].filter(Boolean).join(' '),
      cityMpg:      String(cityMpg),
      hwyMpg:       String(hwyMpg),
    };
  } catch (err) {
    console.error('[plateToVinApi] executeLookup error:', err);
    return null;
  }
}
