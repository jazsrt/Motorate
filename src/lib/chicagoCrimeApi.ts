/**
 * DISABLED — Chicago-specific, non-auth public API with no rate limit handling.
 * Not suitable for production use outside Chicago.
 * Stubbed to prevent accidental calls.
 */

export interface CrimeIncident {
  id: string;
  case_number: string;
  date: string;
  primary_type: string;
  description: string;
  location_description: string;
  arrest: boolean;
  domestic: boolean;
  latitude: string;
  longitude: string;
  year: string;
}

export async function fetchChicagoCrimeData(): Promise<CrimeIncident[]> {
  console.warn('chicagoCrimeApi is disabled — Chicago-only, not suitable for production');
  return [];
}

export async function getCrimeData(_lat: number, _lng: number, _radiusKm?: number): Promise<CrimeIncident[]> {
  return [];
}

export function getCrimeMarkerColor(_crimeType: string): 'red' | 'yellow' | 'blue' {
  return 'blue';
}

export function formatCrimeDate(dateString: string): string {
  return dateString;
}
