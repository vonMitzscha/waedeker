/**
 * GPX utilities: parse, subsample, haversine length, buffer polygon, OSRM routing.
 */

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
 * Compute a corridor (tube/stroke) buffer polygon around a route.
 * At each vertex the offset direction is the bisector of the two adjacent left normals,
 * scaled to exactly radiusKm. Semicircular end caps are added at start and end.
 * Returns polygon as [lng, lat] pairs (not closed, first != last).
 */
export function computeBufferPolygon(
  points: [number, number][],
  radiusKm: number,
  capSteps = 16,
): [number, number][] {
  if (points.length < 2) return [];
  const n = points.length;

  // Local flat-earth projection centred on the midpoint
  const midLat = points[Math.floor(n / 2)][1];
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const toXY = ([lng, lat]: [number, number]): [number, number] => [lng * 111 * cosLat, lat * 111];
  const toGeo = ([x, y]: [number, number]): [number, number] => [x / (111 * cosLat), y / 111];

  // Thin the route so consecutive polygon vertices are at least R/3 apart.
  // This keeps the polygon smooth and clean regardless of GPX point density.
  const minSpacing = radiusKm / 3;
  const rawXY = points.map(toXY);
  const xy: [number, number][] = [rawXY[0]];
  for (let i = 1; i < n - 1; i++) {
    const prev = xy[xy.length - 1];
    const dx = rawXY[i][0] - prev[0];
    const dy = rawXY[i][1] - prev[1];
    if (Math.sqrt(dx * dx + dy * dy) >= minSpacing) xy.push(rawXY[i]);
  }
  xy.push(rawXY[n - 1]); // always keep last point

  const R = radiusKm;

  // Unit direction vector for each segment
  const dirs: [number, number][] = [];
  for (let i = 0; i < xy.length - 1; i++) {
    const dx = xy[i + 1][0] - xy[i][0];
    const dy = xy[i + 1][1] - xy[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    dirs.push(len > 1e-9 ? [dx / len, dy / len] : (dirs[i - 1] ?? [1, 0]));
  }

  // Left normal (CCW 90°): [-dy, dx]
  const lNorm = ([dx, dy]: [number, number]): [number, number] => [-dy, dx];

  // Bisector of the two adjacent left normals at vertex i, scaled to R.
  // Using the sum of the two unit normals gives a smooth join for all turn angles
  // with no spikes — the vector is bounded to R.
  const m = xy.length; // thinned point count

  const offsetAt = (i: number): [number, number] => {
    const ln1 = lNorm(i > 0 ? dirs[i - 1] : dirs[0]);
    const ln2 = lNorm(i < m - 1 ? dirs[i] : dirs[m - 2]);
    const bx = ln1[0] + ln2[0];
    const by = ln1[1] + ln2[1];
    const bl = Math.sqrt(bx * bx + by * by);
    if (bl < 0.01) return [ln1[0] * R, ln1[1] * R];
    return [(bx / bl) * R, (by / bl) * R];
  };

  // Semicircle arc from angle a1 to a2 (inclusive, CCW)
  const semicap = (cx: number, cy: number, a1: number, a2: number): [number, number][] => {
    let da = a2 - a1;
    while (da < 0) da += 2 * Math.PI;
    return Array.from({ length: capSteps + 1 }, (_, k) => {
      const a = a1 + (da * k) / capSteps;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as [number, number];
    });
  };

  // Build left / right offset arrays
  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];
  for (let i = 0; i < m; i++) {
    const [ox, oy] = offsetAt(i);
    leftPts.push([xy[i][0] + ox, xy[i][1] + oy]);
    rightPts.push([xy[i][0] - ox, xy[i][1] - oy]);
  }

  // Assemble: right forward → end cap → left backward → start cap
  const poly: [number, number][] = [...rightPts];

  const lastLn = lNorm(dirs[m - 2]);
  poly.push(...semicap(
    xy[m - 1][0], xy[m - 1][1],
    Math.atan2(-lastLn[1], -lastLn[0]),
    Math.atan2(lastLn[1], lastLn[0]),
  ));

  for (let i = m - 1; i >= 0; i--) poly.push(leftPts[i]);

  const firstLn = lNorm(dirs[0]);
  poly.push(...semicap(
    xy[0][0], xy[0][1],
    Math.atan2(firstLn[1], firstLn[0]),
    Math.atan2(-firstLn[1], -firstLn[0]),
  ));

  return poly.map(toGeo);
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
