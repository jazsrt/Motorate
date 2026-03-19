// Auto.dev Plate-to-VIN API
// Docs: https://docs.auto.dev/v2/products/plate-to-vin
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

export async function lookupPlate(
  plate: string,
  state: string
): Promise<VehicleLookupResult | null> {
  const apiKey = import.meta.env.VITE_AUTO_DEV_API_KEY;

  if (!apiKey) {
    console.warn('Auto.dev API key not configured (VITE_AUTO_DEV_API_KEY) — falling back to manual entry');
    return null;
  }

  const cleanPlate = plate.replace(/\s/g, '').toUpperCase();
  const cleanState = state.toUpperCase();

  try {
    const response = await fetch(
      `https://api.auto.dev/plate/${cleanState}/${cleanPlate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      // Plate not found — not an error, just no match
      return null;
    }

    if (!response.ok) {
      console.error('Auto.dev plate lookup error:', response.status);
      return null;
    }

    const data = await response.json();

    // Auto.dev returns: { vin, year, make, model, trim, drivetrain, engine, transmission }
    if (!data.make || !data.model) {
      return null;
    }

    return {
      vin: data.vin ?? '',
      year: String(data.year ?? ''),
      make: data.make ?? '',
      model: data.model ?? '',
      trim: data.trim ?? '',
      color: '',                          // Auto.dev does not return color on plate lookup
      engine: data.engine ?? '',
      bodyStyle: data.style ?? '',
      transmission: data.transmission ?? '',
      driveType: data.drivetrain ?? '',
      fuel: '',
      fullName: `${data.year ?? ''} ${data.make ?? ''} ${data.model ?? ''}`.trim(),
    };
  } catch (error) {
    console.error('Auto.dev plate lookup failed:', error);
    return null;
  }
}
