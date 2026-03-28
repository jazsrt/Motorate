interface NHTSAMake {
  Make_ID: number;
  Make_Name: string;
}

interface NHTSAModel {
  Model_ID: number;
  Model_Name: string;
}

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Keywords to exclude (trailers, motorcycles, etc.)
const EXCLUDED_KEYWORDS = [
  'trailer', 'trailers', 'motorcycle', 'motorcycles', 'scooter', 'scooters',
  'moped', 'atv', 'utility', 'recreational', 'boat', 'marine',
  'off-road', 'bus', 'truck trailer', 'semi', 'camper', 'rv',
  'golf cart', 'snowmobile', 'jet ski', 'watercraft'
];

function isAutomobileMake(makeName: string): boolean {
  const lowerName = makeName.toLowerCase();
  return !EXCLUDED_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

export async function getAllMakes(): Promise<string[]> {
  try {
    const response = await fetch(
      `${NHTSA_BASE_URL}/GetAllMakes?format=json`
    );
    const data = await response.json();

    if (data.Results && Array.isArray(data.Results)) {
      return data.Results
        .map((make: NHTSAMake) => make.Make_Name)
        .filter((makeName: string) => isAutomobileMake(makeName))
        .sort();
    }

    return [];
  } catch (error) {
    console.error('Error fetching makes from NHTSA:', error);
    return getPopularMakes();
  }
}

export async function getModelsForMake(make: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${NHTSA_BASE_URL}/GetModelsForMake/${encodeURIComponent(make)}?format=json`
    );
    const data = await response.json();

    if (data.Results && Array.isArray(data.Results)) {
      return data.Results
        .map((model: NHTSAModel) => model.Model_Name)
        .filter((name: string) => name && name.trim())
        .sort();
    }

    return [];
  } catch (error) {
    console.error('Error fetching models from NHTSA:', error);
    return [];
  }
}

export async function getTrimsForModel(make: string, model: string, year?: string): Promise<string[]> {
  try {
    // If year is provided, use it for more accurate results
    const modelYear = year || new Date().getFullYear().toString();
    const response = await fetch(
      `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${modelYear}?format=json`
    );
    const data = await response.json();

    if (data.Results && Array.isArray(data.Results)) {
      // Filter to the specific model and extract unique trims
      const trims = data.Results
        .filter((item: { Model_Name: string; Trim?: string }) => item.Model_Name === model && item.Trim)
        .map((item: { Model_Name: string; Trim?: string }) => item.Trim)
        .filter((trim: string) => trim && trim.trim());

      // Remove duplicates and sort
      return [...new Set(trims)].sort() as string[];
    }

    return [];
  } catch (error) {
    console.error('Error fetching trims from NHTSA:', error);
    return [];
  }
}

export function getYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = 1980;
  const years: number[] = [];

  for (let year = currentYear + 1; year >= startYear; year--) {
    years.push(year);
  }

  return years;
}

export function getPopularColors(): string[] {
  return [
    'Black',
    'White',
    'Silver',
    'Gray',
    'Red',
    'Blue',
    'Green',
    'Yellow',
    'Orange',
    'Brown',
    'Gold',
    'Beige',
    'Purple',
    'Pink',
    'Teal',
    'Burgundy',
    'Tan',
    'Bronze',
    'Copper',
    'Chrome',
  ].sort();
}

function getPopularMakes(): string[] {
  return [
    'Acura',
    'Alfa Romeo',
    'Aston Martin',
    'Audi',
    'Bentley',
    'BMW',
    'Bugatti',
    'Buick',
    'Cadillac',
    'Chevrolet',
    'Chrysler',
    'Dodge',
    'Ferrari',
    'Fiat',
    'Ford',
    'Genesis',
    'GMC',
    'Honda',
    'Hyundai',
    'Infiniti',
    'Jaguar',
    'Jeep',
    'Kia',
    'Lamborghini',
    'Land Rover',
    'Lexus',
    'Lincoln',
    'Lotus',
    'Maserati',
    'Mazda',
    'McLaren',
    'Mercedes-Benz',
    'Mini',
    'Mitsubishi',
    'Nissan',
    'Pagani',
    'Porsche',
    'Ram',
    'Rolls-Royce',
    'Subaru',
    'Tesla',
    'Toyota',
    'Volkswagen',
    'Volvo',
  ].sort();
}
