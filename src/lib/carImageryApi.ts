import { supabase } from './supabase';

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

/**
 * Fetch a vehicle image URL from Pexels with year-adjacent fallback.
 *
 * Fallback chain:
 * 1. Exact query: year + make + model + color
 * 2. Adjacent years: year-1, year+1 + make + model
 * 3. Make + model only (no year)
 * 4. Return null — caller handles placeholder
 *
 * If vehicleId is provided, successful results are written back
 * to vehicles.stock_image_url as a fire-and-forget update.
 */
export async function getVehicleImageUrl(
  make: string,
  model: string,
  year?: number,
  color?: string,
  vehicleId?: string
): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;

  // Try 1: Exact query
  const exactUrl = await fetchPexelsImage([year, make, model, color]);
  if (exactUrl) {
    if (vehicleId) writeBackImage(vehicleId, exactUrl);
    return exactUrl;
  }

  // Try 2: Adjacent years (year-1, year+1)
  if (year) {
    for (const adjYear of [year - 1, year + 1]) {
      const adjUrl = await fetchPexelsImage([adjYear, make, model]);
      if (adjUrl) {
        if (vehicleId) writeBackImage(vehicleId, adjUrl);
        return adjUrl;
      }
    }
  }

  // Try 3: Make + model only
  const genericUrl = await fetchPexelsImage([make, model]);
  if (genericUrl) {
    if (vehicleId) writeBackImage(vehicleId, genericUrl);
    return genericUrl;
  }

  // Try 4: Give up
  return null;
}

/**
 * Internal: query Pexels API for a single landscape image.
 */
async function fetchPexelsImage(parts: (string | number | undefined | null)[]): Promise<string | null> {
  try {
    const query = encodeURIComponent(parts.filter(Boolean).join(' '));
    if (!query) return null;

    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY! } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos?.[0]?.src?.large2x ?? null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget: write image URL back to vehicle row.
 */
function writeBackImage(vehicleId: string, url: string): void {
  supabase.from('vehicles').update({ stock_image_url: url }).eq('id', vehicleId).then(() => {});
}
