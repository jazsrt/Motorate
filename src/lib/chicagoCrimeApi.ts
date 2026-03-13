export interface CrimeIncident {
  id: string;
  case_number: string;
  date: string;
  block: string;
  primary_type: string;
  description: string;
  location_description: string;
  arrest: boolean;
  domestic: boolean;
  latitude: string;
  longitude: string;
  year: string;
  location?: {
    lat: number;
    lng: number;
  };
  type?: string;
}

const CHICAGO_CRIME_API = 'https://data.cityofchicago.org/resource/ijzp-q8t2.json';

export async function fetchChicagoCrimeData(): Promise<CrimeIncident[]> {
  try {
    const params = new URLSearchParams({
      $limit: '100',
      $order: 'date DESC',
      $where: 'latitude IS NOT NULL AND longitude IS NOT NULL'
    });

    const response = await fetch(`${CHICAGO_CRIME_API}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch crime data: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Chicago crime data:', error);
    throw error;
  }
}

export async function getCrimeData(lat: number, lng: number, radiusKm: number = 3): Promise<CrimeIncident[]> {
  try {
    const latRange = radiusKm / 111;
    const lngRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const params = new URLSearchParams({
      $limit: '200',
      $order: 'date DESC',
      $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN ${lat - latRange} AND ${lat + latRange} AND longitude BETWEEN ${lng - lngRange} AND ${lng + lngRange}`
    });

    const response = await fetch(`${CHICAGO_CRIME_API}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch crime data: ${response.status}`);
    }

    const data = await response.json();

    return data.map((incident: CrimeIncident) => ({
      ...incident,
      location: {
        lat: parseFloat(incident.latitude),
        lng: parseFloat(incident.longitude)
      },
      type: incident.primary_type
    }));
  } catch (error) {
    console.error('Error fetching Chicago crime data:', error);
    throw error;
  }
}

export function getCrimeMarkerColor(crimeType: string): 'red' | 'yellow' | 'blue' {
  const type = crimeType.toUpperCase();

  if (type.includes('THEFT') || type.includes('BURGLARY')) {
    return 'yellow';
  }

  if (type.includes('BATTERY') || type.includes('ASSAULT')) {
    return 'red';
  }

  return 'blue';
}

export function formatCrimeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}
