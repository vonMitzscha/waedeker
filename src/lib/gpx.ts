/**
 * GPX utilities: parse, subsample, haversine length, buffer polygon, OSRM routing.
 */
import polygonClipping from 'polygon-clipping';

/** Parse a GPX XML string, returns [lng, lat] pairs. Tries trkpt → rtept → wpt. */
export function parseGpx(xmlString: string): [number, number][] {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'application/xml');
  } catch {
    return [];
  }

  const parseError = doc.querySelector('parsererror');
  if (parseError) return [];

  const elementTypes = ['trkpt', 'rtept', 'wpt'];
  for (const tag of elementTypes) {
    const elements = Array.from(doc.getElementsByTagName(tag));
    if (elements.length >= 2) {
      const pts: [number, number][] = [];
      for (const el of elements) {
        const lat = parseFloat(el.getAttribute('lat') ?? '');
        const lon = parseFloat(el.getAttribute('lon') ?? '');
        if (!isNaN(lat) && !isNaN(lon)) pts.push([lon, lat]);
      }
      if (pts.length >= 2) return pts;
    }
  }
  return [];
}

/** Reduce point density by uniform sampling (keeps first and last). */
export function subsamplePoints(points: [number, number][], maxPoints = 500): [number, number][] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

/** Haversine distance between two [lng, lat] points in km. */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total route length in km using Haversine. */
export function routeLengthKm(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}

/**
 * Compute a corridor buffer polygon around a route using circle union.
 *
 * The buffer is the union of circles of radius `radiusKm` centred on a subsampled
 * set of track points. This is mathematically the exact Minkowski sum of the route
 * with a disk — it never self-intersects regardless of how much the route bends,
 * and MapLibre renders it as a single clean filled shape.
 *
 * Returns polygon as [lng, lat] pairs (not closed, first != last).
 * Returns [] on failure or too few points.
 */
export function computeBufferPolygon(
  points: [number, number][],
  radiusKm: number,
  circleSteps = 16,
): [number, number][] {
  if (points.length < 2) return [];

  // Latitude correction: 1° longitude ≠ 1° latitude in km.
  const midLat = points[Math.floor(points.length / 2)][1];
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const lngR = radiusKm / (111 * cosLat); // radius in degrees longitude
  const latR = radiusKm / 111;            // radius in degrees latitude

  // Densify: insert intermediate points so no consecutive pair is more than
  // 0.8*radiusKm apart. This guarantees adjacent circles overlap → connected union.
  // Without this, a hand-drawn route with few, widely-spaced points produces
  // separate non-overlapping circles and the union returns multiple polygons.
  const maxSpacingKm = radiusKm * 0.8;
  const dense: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = dense[dense.length - 1];
    const [x1, y1] = points[i];
    const distKm = Math.sqrt(((x1 - x0) * 111 * cosLat) ** 2 + ((y1 - y0) * 111) ** 2);
    if (distKm > maxSpacingKm) {
      const steps = Math.ceil(distKm / maxSpacingKm);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        dense.push([x0 + t * (x1 - x0), y0 + t * (y1 - y0)]);
      }
    }
    dense.push([x1, y1]);
  }

  // Cap at 400 points for performance (polygon-clipping is O(n log n)).
  // The cap preserves connectivity because subsamplePoints keeps uniform spacing.
  const sparse = dense.length > 400 ? subsamplePoints(dense, 400) : dense;

  // Build one closed circle polygon per sample point.
  const circlePolys = sparse.map(([lng, lat]) => {
    const ring: [number, number][] = Array.from({ length: circleSteps }, (_, i) => {
      const a = (2 * Math.PI * i) / circleSteps;
      return [lng + lngR * Math.cos(a), lat + latR * Math.sin(a)] as [number, number];
    });
    ring.push(ring[0]); // close
    return [[ring]] as [[typeof ring]];
  });

  try {
    // Union of all circles → the exact Minkowski buffer, always valid, never self-intersecting.
    const result = polygonClipping.union(...(circlePolys as unknown as Parameters<typeof polygonClipping.union>));
    if (!result || result.length === 0) return [];
    // Take the outer ring of the largest polygon (area heuristic: first is largest after union)
    const outerRing = result[0][0] as [number, number][];
    return outerRing.slice(0, -1); // remove the closing duplicate
  } catch {
    return [];
  }
}

/**
 * Fetch a route via OSRM public router.
 * Returns [lng, lat] coordinate pairs from the route geometry.
 */
export async function fetchOsrmRoute(
  waypoints: [number, number][],
  profile: 'driving' | 'walking' | 'cycling',
): Promise<[number, number][]> {
  if (waypoints.length < 2) throw new Error('Mindestens 2 Wegpunkte erforderlich');
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM Fehler: ${res.status}`);
  const data = await res.json();
  const routeCoords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates;
  if (!routeCoords || routeCoords.length < 2) throw new Error('OSRM hat keine Route zurückgegeben');
  return routeCoords;
}
