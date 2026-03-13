interface PlateToVinResponse {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  name: string;
  engine: string;
  style: string;
  transmission: string;
  driveType: string;
  fuel: string;
  color: {
    name: string;
    abbreviation: string;
  };
}

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

const PLATE_TO_VIN_API_URL = 'https://platetovin.net/api/convert';

export async function lookupPlate(plate: string, state: string): Promise<VehicleLookupResult | null> {
  const apiKey = import.meta.env.VITE_PLATE_TO_VIN_API_KEY;

  if (!apiKey) {
    console.warn('PlateToVIN API key not configured — falling back to manual entry');
    return null;
  }

  try {
    const response = await fetch(PLATE_TO_VIN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plate: plate.replace(/\s/g, '').toUpperCase(),
        state: state.toUpperCase(),
      }),
    });

    if (!response.ok) {
      console.error('PlateToVIN API error:', response.status);
      return null;
    }

    const data: PlateToVinResponse = await response.json();

    if (!data.make || !data.model) {
      return null;
    }

    return {
      vin: data.vin || '',
      year: data.year || '',
      make: data.make || '',
      model: data.model || '',
      trim: data.trim || '',
      color: data.color?.name || '',
      engine: data.engine || '',
      bodyStyle: data.style || '',
      transmission: data.transmission || '',
      driveType: data.driveType || '',
      fuel: data.fuel || '',
      fullName: data.name || `${data.year} ${data.make} ${data.model}`,
    };
  } catch (error) {
    console.error('PlateToVIN lookup failed:', error);
    return null;
  }
}
