export interface GeocoderResult {
  label: string;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'de,en', 'User-Agent': 'GeoZIMWizard/1.0' },
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    // Prefer city/town/village/municipality, fall back to county
    const a = data.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? data.name ?? undefined;
  } catch {
    return undefined;
  }
}

export async function geocodeAddress(query: string): Promise<GeocoderResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

  const response = await fetch(url, {
    headers: { 'Accept-Language': 'de,en', 'User-Agent': 'GeoZIMWizard/1.0' },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.map((item: { display_name: string; lat: string; lon: string }) => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
