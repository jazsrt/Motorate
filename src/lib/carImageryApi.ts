export async function getVehicleImageUrl(
  make: string,
  model: string,
  year?: number
): Promise<string | null> {
  try {
    const searchTerm = year ? `${year} ${make} ${model}` : `${make} ${model}`;
    const response = await fetch(
      `https://www.carimagery.com/api.asmx/GetImageUrl?searchTerm=${encodeURIComponent(searchTerm)}`
    );
    const text = await response.text();
    const match = text.match(/<string[^>]*>(.*?)<\/string>/);
    if (match?.[1]) {
      return match[1].replace('http://', 'https://');
    }
    return null;
  } catch {
    return null;
  }
}
