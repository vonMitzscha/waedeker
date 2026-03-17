export interface GeocoderResult {
  label: string;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number, lang = 'de'): Promise<string | undefined> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const acceptLang = lang === 'en' ? 'en,de' : 'de,en';
    const response = await fetch(url, {
      headers: { 'Accept-Language': acceptLang, 'User-Agent': 'GeoZIMWizard/1.0' },
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

export interface AdminAreaResult {
  /** Full Nominatim display_name */
  label: string;
  /** Short name (city/country name) */
  shortName: string;
  lat: number;
  lng: number;
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  /** Exterior ring of the boundary polygon (largest ring for MultiPolygon) — [lng, lat] */
  polygon: [number, number][];
  /** Full GeoJSON geometry for map display */
  geojson: object;
}

export async function searchAdminAreas(query: string): Promise<AdminAreaResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&polygon_geojson=1&format=json&limit=10&addressdetails=1`;
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'de,en', 'User-Agent': 'GeoZIMWizard/1.0' },
  });
  if (!response.ok) return [];
  const data = await response.json() as Record<string, unknown>[];

  return data
    .filter((item) => {
      const g = item.geojson as { type?: string } | undefined;
      return g?.type === 'Polygon' || g?.type === 'MultiPolygon';
    })
    .map((item) => {
      const bb = item.boundingbox as string[]; // [minLat, maxLat, minLng, maxLng]
      const bbox: [number, number, number, number] = [
        parseFloat(bb[2]), parseFloat(bb[0]),
        parseFloat(bb[3]), parseFloat(bb[1]),
      ];

      const geojson = item.geojson as { type: string; coordinates: unknown };

      let polygon: [number, number][];
      if (geojson.type === 'Polygon') {
        polygon = (geojson.coordinates as [number, number][][])[0];
      } else {
        // MultiPolygon: use exterior ring of the largest polygon
        const rings = (geojson.coordinates as [number, number][][][]).map((p) => p[0]);
        polygon = rings.reduce((a, b) => (a.length >= b.length ? a : b));
      }

      const displayName = item.display_name as string;
      return {
        label: displayName,
        shortName: (item.name as string | undefined) || displayName.split(',')[0].trim(),
        lat: parseFloat(item.lat as string),
        lng: parseFloat(item.lon as string),
        bbox,
        polygon,
        geojson: geojson as object,
      };
    });
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
