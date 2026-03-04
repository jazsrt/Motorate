/**
 * VIN Decoder — NHTSA vPIC API
 * Free, no key required, covers all US vehicles 1981+
 * Docs: https://vpic.nhtsa.dot.gov/api/
 */

const NHTSA_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

export interface VinResult {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  fuelType: string | null;
  engineCylinders: string | null;
  engineDisplacement: string | null;
  horsepower: string | null;
  transmission: string | null;
  doors: string | null;
  plantCountry: string | null;
  // Formatted engine string like "1.8L 4-Cyl 132hp"
  engineFormatted: string | null;
  // Raw NHTSA response for future reference
  rawData: Record<string, string>;
}

/**
 * Clean NHTSA value — convert empty/not-applicable to null
 */
function clean(val: string | undefined | null): string | null {
  if (!val || val === 'Not Applicable' || val.trim() === '' || val === 'null') return null;
  return val.trim();
}

/**
 * Build a human-readable engine description from NHTSA fields
 * e.g. "1.8L 4-Cyl 132hp" or "5.0L V8 460hp"
 */
function buildEngineString(result: Record<string, any>): string | null {
  const parts: string[] = [];

  const displacement = result.DisplacementL;
  if (displacement && displacement !== '0') {
    parts.push(`${parseFloat(displacement).toFixed(1)}L`);
  }

  const cylinders = result.EngineCylinders;
  const config = result.EngineConfiguration;
  if (cylinders && cylinders !== '0') {
    if (config && config !== 'Not Applicable') {
      parts.push(`${config}${cylinders}`);
    } else {
      parts.push(`${cylinders}-Cyl`);
    }
  }

  const hp = result.EngineHP;
  if (hp && hp !== '0') {
    parts.push(`${Math.round(parseFloat(hp))}hp`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Validate VIN format — 17 alphanumeric chars, no I, O, Q
 */
export function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

/**
 * Sanitize VIN input — uppercase, strip invalid chars
 */
export function formatVinDisplay(raw: string): string {
  return raw.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

/**
 * Decode a VIN using NHTSA vPIC API (free, no key needed)
 */
export async function decodeVin(vin: string): Promise<VinResult> {
  const cleaned = vin.trim().toUpperCase();

  if (!isValidVinFormat(cleaned)) {
    throw new Error('Invalid VIN format — must be 17 characters (letters A-H, J-N, P, R-Z and digits)');
  }

  const res = await fetch(`${NHTSA_URL}/${cleaned}?format=json`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error('VIN decode service unavailable. Try again.');
  }

  const json = await res.json();
  const r = json.Results?.[0];

  if (!r || (!r.Make && !r.Model)) {
    throw new Error('Could not decode this VIN. Please check and try again.');
  }

  const yearNum = parseInt(r.ModelYear, 10);

  // Build raw response for JSONB storage (only non-empty values)
  const rawData: Record<string, string> = {};
  for (const [key, value] of Object.entries(r)) {
    if (value && typeof value === 'string' && value.trim() !== '' && value !== 'Not Applicable') {
      rawData[key] = value;
    }
  }

  return {
    vin: cleaned,
    make: r.Make || 'Unknown',
    model: r.Model || 'Unknown',
    year: isNaN(yearNum) ? 0 : yearNum,
    trim: clean(r.Trim),
    bodyClass: clean(r.BodyClass),
    driveType: clean(r.DriveType),
    fuelType: clean(r.FuelTypePrimary),
    engineCylinders: clean(r.EngineCylinders),
    engineDisplacement: r.DisplacementL && r.DisplacementL !== '0'
      ? `${parseFloat(r.DisplacementL).toFixed(1)}L`
      : null,
    horsepower: clean(r.EngineHP),
    transmission: clean(r.TransmissionStyle),
    doors: clean(r.Doors),
    plantCountry: clean(r.PlantCountry),
    engineFormatted: buildEngineString(r),
    rawData,
  };
}
