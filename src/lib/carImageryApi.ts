const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

export async function getVehicleImageUrl(
  make: string,
  model: string,
  year?: number,
  color?: string
): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  try {
    const parts = [year, make, model, color].filter(Boolean);
    const query = encodeURIComponent(parts.join(' '));
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos?.[0]?.src?.large2x ?? null;
  } catch {
    return null;
  }
}
