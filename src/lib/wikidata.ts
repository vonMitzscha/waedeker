import type {
  GeographicSelection,
  WikidataConfig,
  WikidataResult,
  WikidataCategory,
  WikiArticle,
} from '@/types';
import { reverseGeocode } from '@/lib/geocoder';

function parseWktPoint(wkt: string): [number, number] | undefined {
  const m = wkt.match(/Point\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/i);
  if (!m) return undefined;
  return [parseFloat(m[1]), parseFloat(m[2])];
}

/** Ray-casting point-in-polygon for [lng, lat] coordinates. */
function pointInPolygon(pt: [number, number], poly: [number, number][]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Point inside outer ring AND outside all hole rings (enclaves). */
function pointInPolygonWithHoles(pt: [number, number], poly: [number, number][], holes: [number, number][][]): boolean {
  if (!pointInPolygon(pt, poly)) return false;
  for (const hole of holes) {
    if (pointInPolygon(pt, hole)) return false;
  }
  return true;
}

/** Returns [minLng, minLat, maxLng, maxLat] for a set of points. */
function polygonBbox(points: [number, number][]): [number, number, number, number] {
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** Returns the bounding box of a route expanded by bufferKm on all sides. */
function routeBbox(trackPoints: [number, number][], bufferKm: number): [number, number, number, number] {
  const lngs = trackPoints.map((p) => p[0]);
  const lats = trackPoints.map((p) => p[1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const latPad = bufferKm / 111;
  const lngPad = bufferKm / (111 * Math.cos((midLat * Math.PI) / 180));
  return [Math.min(...lngs) - lngPad, Math.min(...lats) - latPad, Math.max(...lngs) + lngPad, Math.max(...lats) + latPad];
}

/** Haversine distance in km between two [lng, lat] points. */
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Returns true if pt is within bufferKm of any track point. */
function pointNearRoute(pt: [number, number], trackPoints: [number, number][], bufferKm: number): boolean {
  for (const tp of trackPoints) {
    if (haversineKm(pt, tp) <= bufferKm) return true;
  }
  return false;
}

type Binding = Record<string, { value: string; type: string }>;

async function sparqlQuery(query: string): Promise<Binding[]> {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'Waedeker/1.0 (https://waedeker.netzgewoelbe.com)',
    },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL error: ${res.status}`);
  const data = await res.json();
  return data.results?.bindings ?? [];
}

export async function queryWikidata(
  selection: GeographicSelection,
  config: WikidataConfig,
  existingLinkCache?: Map<string, string[]>,
  onProgress?: LinkProgressCallback,
): Promise<WikidataResult> {
  const categoryFilter =
    config.categories.length > 0
      ? `VALUES ?type { ${config.categories.map((c) => `wd:${c}`).join(' ')} }\n  ?item wdt:P31 ?type.`
      : '';

  let spatialService: string;
  if (selection.type === 'polygon') {
    const [minLng, minLat, maxLng, maxLat] = polygonBbox(selection.points);
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'route') {
    const [minLng, minLat, maxLng, maxLat] = routeBbox(selection.trackPoints, selection.bufferKm);
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'rectangle') {
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${selection.sw[0]} ${selection.sw[1]})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${selection.ne[0]} ${selection.ne[1]})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'admin-area') {
    const [minLng, minLat, maxLng, maxLat] = selection.bbox;
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else {
    const [lng, lat] = selection.center;
    spatialService = `SERVICE wikibase:around {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:radius "${selection.radiusKm}".
  }`;
  }

  const query = `
SELECT DISTINCT ?item ?itemLabel ?article ?coord ?type ?typeLabel WHERE {
  ${spatialService}
  ${categoryFilter}
  ?article schema:about ?item;
           schema:isPartOf <https://${config.language}.wikipedia.org/>.
  OPTIONAL { ?item wdt:P31 ?type. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${config.language},en". }
}`.trim();

  const bindings = await sparqlQuery(query);

  const seen = new Map<string, number>(); // qid -> index in acc
  let articles: WikiArticle[] = bindings.reduce<WikiArticle[]>((acc, b) => {
    const qid = b.item?.value?.split('/').pop() ?? '';
    const cat = b.typeLabel?.value && !b.typeLabel.value.startsWith('Q') ? b.typeLabel.value : undefined;
    const catId = b.type?.value?.split('/').pop();
    if (seen.has(qid)) {
      // Back-fill category if first row had none
      if (cat && !acc[seen.get(qid)!].category) {
        acc[seen.get(qid)!].category = cat;
        acc[seen.get(qid)!].categoryId = catId;
      }
      return acc;
    }
    seen.set(qid, acc.length);
    acc.push({
      qid,
      title: decodeURIComponent((b.article?.value ?? '').split('/wiki/').pop() ?? '').replace(/_/g, ' '),
      label: b.itemLabel?.value ?? '',
      coord: b.coord?.value ? parseWktPoint(b.coord.value) : undefined,
      category: cat,
      categoryId: catId,
    });
    return acc;
  }, []);

  // For polygon/route/admin-area: filter bbox results to only include articles inside the polygon
  if (selection.type === 'polygon') {
    articles = articles.filter((a) => !a.coord || pointInPolygon(a.coord, selection.points));
  } else if (selection.type === 'route') {
    articles = articles.filter((a) => !a.coord || pointNearRoute(a.coord, selection.trackPoints, selection.bufferKm));
  } else if (selection.type === 'admin-area') {
    articles = articles.filter((a) => !a.coord || selection.areas.some((area) => pointInPolygonWithHoles(a.coord!, area.polygon, area.holes)));
  }

  const { linkedTitles, linkCache } = await expandByLinkDepth(
    articles.map((a) => a.title).filter(Boolean),
    config.language,
    config.linkDepth,
    existingLinkCache,
    onProgress,
  );

  const kbPerArticle = config.includeImages ? 250 : 60;
  const totalCount = articles.length + linkedTitles.length;
  const estimatedSizeMB = Math.max(1, Math.round((totalCount * kbPerArticle) / 1024));

  return { articleCount: articles.length, estimatedSizeMB, articles, linkedTitles, linkCache };
}

// ── Link-depth expansion ──────────────────────────────────────────────────────

const LINK_BATCH = 50;       // titles per Wikipedia API request
const LINK_CONCURRENCY = 6;  // parallel requests

/** Fetch all namespace-0 links for a set of titles from the Wikipedia Action API.
 *  Follows plcontinue pagination so that articles with more than 500 links are
 *  fetched completely instead of being silently truncated. */
async function fetchWikiLinks(
  titles: string[],
  lang: string,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (titles.length === 0) return result;

  async function fetchBatch(batch: string[]): Promise<void> {
    let plcontinue: string | undefined;
    do {
      const params = new URLSearchParams({
        action: 'query', prop: 'links', plnamespace: '0', pllimit: '500',
        titles: batch.join('|'), format: 'json', origin: '*',
      });
      if (plcontinue) params.set('plcontinue', plcontinue);
      try {
        const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`);
        const data = await res.json();
        const pages = (data.query?.pages ?? {}) as Record<string, { title: string; links?: { title: string }[] }>;
        for (const page of Object.values(pages)) {
          if (page.links?.length) {
            const existing = result.get(page.title) ?? [];
            result.set(page.title, existing.concat(page.links.map((l) => l.title)));
          }
        }
        plcontinue = data.continue?.plcontinue;
      } catch { plcontinue = undefined; /* network error — stop pagination for this batch */ }
    } while (plcontinue);
  }

  const batches: string[][] = [];
  for (let i = 0; i < titles.length; i += LINK_BATCH) batches.push(titles.slice(i, i + LINK_BATCH));
  for (let i = 0; i < batches.length; i += LINK_CONCURRENCY) {
    await Promise.all(batches.slice(i, i + LINK_CONCURRENCY).map(fetchBatch));
  }
  return result;
}

export type LinkProgressCallback = (depth: number, ofDepth: number, done: boolean) => void;

/**
 * Expand a set of geo-article titles by following Wikipedia links recursively.
 * If `existingCache` is provided (e.g. for category re-filter), cached entries are
 * reused so no Wikipedia API calls are made for already-fetched articles.
 */
export async function expandByLinkDepth(
  geoTitles: string[],
  lang: string,
  depth: number,
  existingCache?: Map<string, string[]>,
  onProgress?: LinkProgressCallback,
): Promise<{ linkedTitles: string[]; linkCache: Map<string, string[]> }> {
  if (depth === 0 || geoTitles.length === 0) {
    return { linkedTitles: [], linkCache: existingCache ? new Map(existingCache) : new Map() };
  }

  const cache: Map<string, string[]> = existingCache ? new Map(existingCache) : new Map();
  const geoSet = new Set(geoTitles);
  const allLinked = new Set<string>();
  let currentLevel = [...geoTitles];

  for (let d = 1; d <= depth; d++) {
    onProgress?.(d, depth, false);

    const toFetch = currentLevel.filter((t) => !cache.has(t));
    if (toFetch.length > 0) {
      const linkMap = await fetchWikiLinks(toFetch, lang);
      for (const [title, links] of linkMap) cache.set(title, links);
    }

    onProgress?.(d, depth, true);

    const nextLevel = new Set<string>();
    for (const title of currentLevel) {
      for (const link of (cache.get(title) ?? [])) {
        if (!geoSet.has(link) && !allLinked.has(link)) {
          allLinked.add(link);
          if (d < depth) nextLevel.add(link);
        }
      }
    }
    if (d < depth) currentLevel = [...nextLevel];
  }

  return { linkedTitles: [...allLinked], linkCache: cache };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function queryCategoriesForArea(
  selection: GeographicSelection,
  config: WikidataConfig
): Promise<WikidataCategory[]> {
  let spatialService: string;
  if (selection.type === 'polygon') {
    const [minLng, minLat, maxLng, maxLat] = polygonBbox(selection.points);
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'route') {
    const [minLng, minLat, maxLng, maxLat] = routeBbox(selection.trackPoints, selection.bufferKm);
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'rectangle') {
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${selection.sw[0]} ${selection.sw[1]})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${selection.ne[0]} ${selection.ne[1]})"^^geo:wktLiteral.
  }`;
  } else if (selection.type === 'admin-area') {
    const [minLng, minLat, maxLng, maxLat] = selection.bbox;
    spatialService = `SERVICE wikibase:box {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:cornerWest "Point(${minLng} ${minLat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:cornerEast "Point(${maxLng} ${maxLat})"^^geo:wktLiteral.
  }`;
  } else {
    const [lng, lat] = selection.center;
    spatialService = `SERVICE wikibase:around {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:radius "${selection.radiusKm}".
  }`;
  }

  const query = `
SELECT ?type ?typeLabel (COUNT(DISTINCT ?item) AS ?count) WHERE {
  ${spatialService}
  ?article schema:about ?item;
           schema:isPartOf <https://${config.language}.wikipedia.org/>.
  ?item wdt:P31 ?type.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${config.language},en". }
}
GROUP BY ?type ?typeLabel
ORDER BY DESC(?count)`.trim();

  const bindings = await sparqlQuery(query);
  return bindings
    .filter((b) => b.typeLabel?.value && !b.typeLabel.value.startsWith('Q'))
    .map((b) => ({
      id: b.type?.value?.split('/').pop() ?? '',
      label: b.typeLabel?.value ?? '',
      count: parseInt(b.count?.value ?? '0', 10),
    }));
}

export async function generateAndDownloadZip(
  selection: GeographicSelection,
  config: WikidataConfig,
  result: WikidataResult,
  mapSnapshot?: string,
  uiLocale: 'de' | 'en' = 'de'
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const lang = config.language;

  let areaLabel: string;
  if (selection.label) {
    areaLabel = selection.label;
  } else if (selection.type === 'polygon') {
    const lngs = selection.points.map((p) => p[0]);
    const lats = selection.points.map((p) => p[1]);
    const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const placeName = await reverseGeocode(cLat, cLng);
    areaLabel = placeName ?? `${cLat.toFixed(3)}N_${cLng.toFixed(3)}E`;
  } else if (selection.type === 'route') {
    const pts = selection.trackPoints;
    const [startLng, startLat] = pts[0];
    const [endLng, endLat] = pts[pts.length - 1];
    const [startName, endName] = await Promise.all([
      reverseGeocode(startLat, startLng, uiLocale),
      reverseGeocode(endLat, endLng, uiLocale),
    ]);
    const from = startName ?? `${startLat.toFixed(3)}N`;
    const to = endName ?? `${endLat.toFixed(3)}N`;
    areaLabel = uiLocale === 'en'
      ? `Route from ${from} to ${to}`
      : `Route von ${from} nach ${to}`;
  } else if (selection.type === 'rectangle') {
    const cLng = (selection.sw[0] + selection.ne[0]) / 2;
    const cLat = (selection.sw[1] + selection.ne[1]) / 2;
    const placeName = await reverseGeocode(cLat, cLng);
    areaLabel = placeName ?? `${cLat.toFixed(3)}N_${cLng.toFixed(3)}E`;
  } else if (selection.type === 'admin-area') {
    const [minLng, minLat, maxLng, maxLat] = selection.bbox;
    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    const placeName = await reverseGeocode(cLat, cLng);
    areaLabel = placeName ?? `${cLat.toFixed(3)}N_${cLng.toFixed(3)}E`;
  } else {
    areaLabel = `${selection.center[1].toFixed(3)}N_${selection.center[0].toFixed(3)}E`;
  }

  const areaSlug = areaLabel.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const prefix = `wikipedia_${lang}_${areaSlug}_${timestamp}`;

  // Convert map snapshot data URL → binary file in ZIP
  let hasBg = false;
  if (mapSnapshot) {
    try {
      const b64 = mapSnapshot.split(',')[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      zip.file('map-bg.jpg', bytes);
      hasBg = true;
    } catch { /* snapshot unusable */ }
  }

  // ALL article titles, one per line (geo-found + link-expanded, deduped)
  const allTitles = [...new Set([...result.articles.map((a) => a.title), ...result.linkedTitles])].filter(Boolean);
  zip.file('articles.txt', allTitles.join('\n'));
  zip.file('map.html', buildMapHtml(selection, lang, result, areaLabel, hasBg, uiLocale));
  zip.file('inject.py', buildInjectScript(hasBg));
  zip.file('docker-compose.yml', buildDockerCompose(prefix, lang, config, selection, areaLabel, hasBg));
  zip.file('build.sh', buildShellScript(prefix));
  zip.file('README.md', buildReadme(selection, config, result, areaLabel, prefix));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeArea = areaLabel
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w-]/g, '_').slice(0, 40);
  a.download = `waedeker-config-${safeArea}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildDockerCompose(
  prefix: string,
  lang: string,
  config: WikidataConfig,
  selection: GeographicSelection,
  areaLabel: string,
  hasBg = false
): string {
  const formatLine = config.includeImages ? '' : '      --format=nopic\n';

  const zimTitle = `Region ${areaLabel} (Wikipedia)`.slice(0, 30);

  let coordPart: string;
  if (selection.type === 'polygon') {
    coordPart = selection.label ? '' : ` | Polygon (${selection.points.length} Punkte)`;
  } else if (selection.type === 'route') {
    coordPart = '';
  } else if (selection.type === 'rectangle') {
    coordPart = '';
  } else if (selection.type === 'admin-area') {
    coordPart = '';
  } else {
    coordPart = selection.label
      ? ''
      : ` | ${selection.center[1].toFixed(3)}°N ${selection.center[0].toFixed(3)}°E`;
  }
  const selDesc = selection.type === 'polygon'
    ? `Polygon (${selection.points.length} Punkte)`
    : selection.type === 'route'
    ? `Route ${selection.lengthKm?.toFixed(1) ?? '?'} km · Puffer ${selection.bufferKm} km`
    : selection.type === 'rectangle'
    ? (() => {
        const cosL = Math.cos(((selection.sw[1] + selection.ne[1]) / 2) * Math.PI / 180);
        const wKm = Math.round((selection.ne[0] - selection.sw[0]) * cosL * 111);
        const hKm = Math.round((selection.ne[1] - selection.sw[1]) * 111);
        return `Rechteck ${wKm}×${hKm} km`;
      })()
    : selection.type === 'admin-area'
    ? `Verwaltungsgebiet (${selection.label ?? ''})`
    : `Radius: ${selection.radiusKm} km`;
  const zimDesc = `${areaLabel}${coordPart} | ${selDesc} | ${lang.toUpperCase()} Wikipedia`.slice(0, 80);

  return `services:
  mwoffliner:
    image: ghcr.io/openzim/mwoffliner:latest
    platform: linux/amd64
    volumes:
      - ./articles.txt:/articles.txt:ro
      - ./output:/output
    command: >
      mwoffliner
      --mwUrl=https://${lang}.wikipedia.org
      --adminEmail=support@mitzscherling.digital
      --outputDirectory=/output
      --filenamePrefix=${prefix}
      --customZimTitle="${zimTitle}"
      --customZimDescription="${zimDesc}"
      --publisher=Waedeker
      --webp
      --minifyHtml
      --speed=0.5
${formatLine}      --articleList=/articles.txt

  inject-map:
    image: python:3.11-slim
    platform: linux/amd64
    depends_on:
      mwoffliner:
        condition: service_completed_successfully
    volumes:
      - ./output:/output
      - ./map.html:/map.html:ro
      - ./inject.py:/inject.py:ro${hasBg ? '\n      - ./map-bg.jpg:/map-bg.jpg:ro' : ''}
    command: python /inject.py
`;
}

export function buildMapHtml(
  selection: GeographicSelection,
  lang: string,
  result: WikidataResult,
  areaLabel: string,
  hasBg = false,
  uiLang: 'de' | 'en' = 'de'
): string {
  const numLocale = uiLang === 'en' ? 'en' : 'de';
  const dateStr = new Date().toLocaleDateString(uiLang === 'en' ? 'en-GB' : 'de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const ui = uiLang === 'en' ? {
    subtitle: `Created from Wikipedia ${lang.toUpperCase()} with <a href="https://waedecker.netzgewoelbe.com" style="color:inherit;text-decoration:underline;text-underline-offset:2px">Waedecker</a> \u00b7 Wikipedia\u2019s knowledge in a handy Baedeker format`,
    areaSuffix: 'and surroundings',
    asOf: `As of ${dateStr}`,
    articles: 'Articles',
    area: 'km² Area',
    length: 'Length',
    viaLinks: 'Via Links',
    searchPlaceholder: 'Search articles\u2026',
    countOf: (n: number, total: number) => `${n} of ${total} articles`,
  } : {
    subtitle: `Erstellt aus Wikipedia ${lang.toUpperCase()} mit <a href="https://waedecker.netzgewoelbe.com" style="color:inherit;text-decoration:underline;text-underline-offset:2px">Waedecker</a> \u00b7 Das Wissen Wikipedias im handlichen Baedeker-Format`,
    areaSuffix: 'und Umgebung',
    asOf: `Stand: ${dateStr}`,
    articles: 'Artikel',
    area: 'km² Fläche',
    length: 'Länge',
    viaLinks: 'Via Links',
    searchPlaceholder: 'Artikel suchen\u2026',
    countOf: (n: number, total: number) => `${n} von ${total} Artikeln`,
  };

  const articlesJson = JSON.stringify(
    result.articles.map((a) => ({
      t: a.title,
      l: a.label || a.title,
      c: a.coord ?? null,
      cat: a.category ?? null,
    }))
  );

  // ── Projection constants ──────────────────────────────
  let centerLng: number, centerLat: number, SC: number;
  let clipPathDef: string, bgLayer: string, selectionOverlay: string, selectionMarker: string, statCard2: string;
  let jsProj: string;

  // Shared Mercator-y helper: MY(lat) = atanh(sin(φ)) * 180/π
  // Converts geographic latitude to Web-Mercator y in degree-equivalents so that
  // x (longitude) and y share the same unit and scale — exactly what MapLibre uses.
  const MY = (lat: number) => Math.atanh(Math.sin(lat * Math.PI / 180)) * 180 / Math.PI;
  // Inverse: from Mercator-y back to latitude
  const fromMY = (my: number) => Math.asin(Math.tanh(my * Math.PI / 180)) * 180 / Math.PI;
  // Build a Mercator projection for any bbox (shared by polygon / route / rectangle / admin-area)
  const mercProj = (minLng: number, minLat: number, maxLng: number, maxLat: number) => {
    const lng0 = (minLng + maxLng) / 2;
    const myMin = MY(minLat), myMax = MY(maxLat);
    const myCtr = (myMin + myMax) / 2;
    const lat0 = fromMY(myCtr);
    const lngSpan = maxLng - minLng;
    const latSpan = Math.abs(myMax - myMin);
    const halfDeg = Math.max(lngSpan, latSpan) / 2 * 1.15;
    const sc = 280 / halfDeg;
    const proj = (lng: number, lat: number): [number, number] => [
      300 + (lng - lng0) * sc,
      300 - (MY(lat) - myCtr) * sc,
    ];
    const jsP = `function MY(lat){return Math.atanh(Math.sin(lat*Math.PI/180))*180/Math.PI;}
const CLng=${lng0},MYCtr=${myCtr.toFixed(6)},SC=${sc.toFixed(6)};
function proj(lng,lat){return[300+(lng-CLng)*SC,300-(MY(lat)-MYCtr)*SC];}`;
    return { lng0, lat0, myCtr, sc, proj, jsP };
  };

  if (selection.type === 'polygon') {
    const lngs = selection.points.map((p) => p[0]);
    const lats = selection.points.map((p) => p[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const { lng0, lat0, sc, proj: proj2, jsP } = mercProj(minLng, minLat, maxLng, maxLat);
    centerLng = lng0; centerLat = lat0; SC = sc;

    const svgPoints = selection.points.map((p) => proj2(p[0], p[1]).join(',')).join(' ');

    clipPathDef = '';
    bgLayer = hasBg
      ? `<image href="map-bg.jpg" x="0" y="0" width="600" height="600" preserveAspectRatio="none"/>`
      : `<rect x="0" y="0" width="600" height="600" fill="#e9e9ed"/>`;
    selectionOverlay = `<polygon points="${svgPoints}" fill="rgba(0,0,0,0.05)" stroke="#3a3a3c" stroke-width="2.5" stroke-linejoin="round"/>`;
    selectionMarker = '';
    {
      const cosL2 = Math.cos(centerLat * Math.PI / 180);
      let shoelace = 0;
      const pts = selection.points;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        shoelace += (pts[i][0] * cosL2 * 111) * (pts[j][1] * 111) - (pts[j][0] * cosL2 * 111) * (pts[i][1] * 111);
      }
      const polyAreaKm2 = Math.round(Math.abs(shoelace) / 2);
      statCard2 = `<div class="sc"><div class="sc-n">${polyAreaKm2.toLocaleString(numLocale)}</div><div class="sc-l">${ui.area}</div></div>`;
    }
    jsProj = jsP;
  } else if (selection.type === 'route') {
    const lngs = selection.trackPoints.map((p) => p[0]);
    const lats = selection.trackPoints.map((p) => p[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const { lng0, lat0, sc, proj: projR, jsP } = mercProj(minLng, minLat, maxLng, maxLat);
    centerLng = lng0; centerLat = lat0; SC = sc;

    const svgRoutePoints = selection.trackPoints.map((p) => projR(p[0], p[1]).join(',')).join(' ');
    const svgBufPoints = selection.polygon.map((p) => projR(p[0], p[1]).join(',')).join(' ');

    clipPathDef = '';
    bgLayer = hasBg
      ? `<image href="map-bg.jpg" x="0" y="0" width="600" height="600" preserveAspectRatio="none"/>`
      : `<rect x="0" y="0" width="600" height="600" fill="#e9e9ed"/>`;
    selectionOverlay = `<polygon points="${svgBufPoints}" fill="rgba(0,0,0,0.04)" stroke="#8a8a8e" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="4 3"/>
        <polyline points="${svgRoutePoints}" fill="none" stroke="#1d1d1f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    selectionMarker = '';
    statCard2 = `<div class="sc"><div class="sc-n">${selection.lengthKm?.toFixed(0) ?? '?'} km</div><div class="sc-l">${ui.length}</div></div>`;
    jsProj = jsP;
  } else if (selection.type === 'rectangle') {
    const [minLng, minLat] = selection.sw;
    const [maxLng, maxLat] = selection.ne;
    const { lng0, lat0, sc, proj: proj2, jsP } = mercProj(minLng, minLat, maxLng, maxLat);
    centerLng = lng0; centerLat = lat0; SC = sc;

    const [x1, y1] = proj2(minLng, minLat);
    const [x2, y2] = proj2(maxLng, maxLat);
    const rectX = Math.min(x1, x2), rectY = Math.min(y1, y2);
    const rectW = Math.abs(x2 - x1), rectH = Math.abs(y2 - y1);
    const cosL = Math.cos(centerLat * Math.PI / 180);
    const areaKm2 = Math.round((maxLng - minLng) * cosL * 111 * (maxLat - minLat) * 111);

    clipPathDef = '';
    bgLayer = hasBg
      ? `<image href="map-bg.jpg" x="0" y="0" width="600" height="600" preserveAspectRatio="none"/>`
      : `<rect x="0" y="0" width="600" height="600" fill="#e9e9ed"/>`;
    selectionOverlay = `<rect x="${rectX.toFixed(1)}" y="${rectY.toFixed(1)}" width="${rectW.toFixed(1)}" height="${rectH.toFixed(1)}" fill="rgba(0,0,0,0.05)" stroke="#3a3a3c" stroke-width="2.5"/>`;
    selectionMarker = '';
    statCard2 = `<div class="sc"><div class="sc-n">${areaKm2.toLocaleString(numLocale)}</div><div class="sc-l">${ui.area}</div></div>`;
    jsProj = jsP;
  } else if (selection.type === 'admin-area') {
    const [minLng, minLat, maxLng, maxLat] = selection.bbox;
    const { lng0, lat0, sc, proj: projA, jsP } = mercProj(minLng, minLat, maxLng, maxLat);
    centerLng = lng0; centerLat = lat0; SC = sc;

    // Build SVG path for all areas with holes using even-odd fill rule
    const svgAdminPath = selection.areas.map(({ polygon, holes }) => {
      const outerPath = 'M ' + polygon.map((p) => projA(p[0], p[1]).join(' ')).join(' L ') + ' Z';
      const holePaths = holes.map((hole) =>
        'M ' + hole.map((p) => projA(p[0], p[1]).join(' ')).join(' L ') + ' Z'
      ).join(' ');
      return outerPath + (holePaths ? ' ' + holePaths : '');
    }).join(' ');

    clipPathDef = '';
    bgLayer = hasBg
      ? `<image href="map-bg.jpg" x="0" y="0" width="600" height="600" preserveAspectRatio="none"/>`
      : `<rect x="0" y="0" width="600" height="600" fill="#e9e9ed"/>`;
    selectionOverlay = `<path d="${svgAdminPath}" fill-rule="evenodd" fill="rgba(0,0,0,0.05)" stroke="#3a3a3c" stroke-width="2.5" stroke-linejoin="round"/>`;
    selectionMarker = '';
    {
      let totalShoelace = 0;
      for (const { polygon: pts } of selection.areas) {
        const cosForArea = Math.cos(centerLat * Math.PI / 180);
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          totalShoelace += (pts[i][0] * cosForArea * 111) * (pts[j][1] * 111) - (pts[j][0] * cosForArea * 111) * (pts[i][1] * 111);
        }
      }
      const polyAreaKm2 = Math.round(Math.abs(totalShoelace) / 2);
      statCard2 = `<div class="sc"><div class="sc-n">${polyAreaKm2.toLocaleString(numLocale)}</div><div class="sc-l">${ui.area}</div></div>`;
    }
    jsProj = jsP;
  } else {
    centerLng = selection.center[0];
    centerLat = selection.center[1];
    const { radiusKm } = selection;
    SC = 292 / radiusKm;

    clipPathDef = `<clipPath id="cp"><circle cx="300" cy="300" r="292"/></clipPath>`;
    bgLayer = hasBg
      ? `<image href="map-bg.jpg" x="0" y="0" width="600" height="600" clip-path="url(#cp)" preserveAspectRatio="none"/>`
      : `<rect x="8" y="8" width="584" height="584" rx="16" fill="#e9e9ed" clip-path="url(#cp)"/>`;
    selectionOverlay = `<circle cx="300" cy="300" r="292" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2"/>`;
    selectionMarker = `<circle cx="300" cy="300" r="6" fill="#1d1d1f"/>
        <circle cx="300" cy="300" r="12" fill="none" stroke="#1d1d1f" stroke-width="1.5"/>`;
    {
      const radiusAreaKm2 = Math.round(Math.PI * radiusKm * radiusKm);
      statCard2 = `<div class="sc"><div class="sc-n">${radiusAreaKm2.toLocaleString(numLocale)}</div><div class="sc-l">${ui.area}</div></div>`;
    }
    jsProj = `const CLng=${centerLng},CLat=${centerLat},RKm=${radiusKm};
const SC=292/RKm,cosL=Math.cos(CLat*Math.PI/180);
function proj(lng,lat){return[300+(lng-CLng)*cosL*111*SC,300-(lat-CLat)*111*SC];}`;
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${areaLabel} – Wikipedia Offline</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#1d1d1f;background:#f5f5f7;line-height:1.6;min-height:100vh;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:680px;margin:0 auto;padding:56px 24px 80px}
.hd-src{display:flex;align-items:center;gap:9px;margin-bottom:30px}
.hd-wp{width:24px;height:24px;border-radius:6px;background:#1d1d1f;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;font-family:Georgia,'Times New Roman',serif;line-height:1;flex-shrink:0;letter-spacing:-.03em}
.hd-lbl{font-size:12px;color:#6e6e73;letter-spacing:.01em}
h1{font-size:clamp(1.9rem,6vw,2.8rem);font-weight:700;color:#1d1d1f;letter-spacing:-.045em;line-height:1.08;margin-bottom:6px}
.hd-sub{font-size:clamp(1rem,3vw,1.35rem);font-weight:400;color:#6e6e73;letter-spacing:-.02em;margin-bottom:10px}
.hd-date{font-size:.8rem;color:#aeaeb2;margin-bottom:28px}
.hd-rule{height:1px;background:#d2d2d7;margin-bottom:28px}
.stats{display:flex;margin-bottom:24px;background:#fff;border:1px solid #d2d2d7;border-radius:14px;overflow:hidden}
.sc{flex:1;padding:16px 10px;text-align:center;border-right:1px solid #d2d2d7}.sc:last-child{border-right:none}
.sc-n{font-size:1.5rem;font-weight:700;color:#1d1d1f;line-height:1;letter-spacing:-.035em}
.sc-l{font-size:.67rem;font-weight:500;color:#6e6e73;text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
.card{background:#fff;border-radius:14px;border:1px solid #d2d2d7;overflow:hidden;margin-bottom:20px}
#mw{position:relative;user-select:none}
#mw svg{width:100%;height:auto;display:block;cursor:grab;touch-action:none}
#mw svg:active{cursor:grabbing}
.zb{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:4px;z-index:2}
.zb button{width:30px;height:30px;border-radius:8px;border:1px solid #d2d2d7;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);color:#1d1d1f;font-size:16px;font-weight:400;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.zb button:hover{background:#fff}
.srch-wrap{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:10px 14px;margin-bottom:10px}
.srch-wrap svg{flex-shrink:0;color:#aeaeb2}
#srch{flex:1;border:none;font-size:15px;font-family:inherit;outline:none;background:transparent;color:#1d1d1f}
#srch::placeholder{color:#aeaeb2}
#cnt{font-size:12px;color:#6e6e73;margin-bottom:8px;padding-left:2px}
#al-wrap{position:relative}
#al-wrap.overflow::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,#fff);pointer-events:none;z-index:1}
#al{border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;max-height:480px;overflow-y:auto;background:#fff}
#al-wrap.overflow #al{padding-bottom:60px}
.ar{padding:11px 16px;cursor:pointer;transition:background .1s;border-bottom:1px solid #f2f2f7;background:#fff}.ar:last-child{border-bottom:none}
.ar:hover{background:#f5f5f7}
.ar.hl{background:#f2f2f7}
.ar-t{font-size:.9375rem;font-weight:500;color:#1d1d1f;display:block;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ar-sub{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.ar-cat{font-size:.75rem;color:#6e6e73}
.ar-crd{font-size:.7rem;font-family:'SF Mono','Menlo',Consolas,monospace;color:#aeaeb2;white-space:nowrap}
#tt{position:fixed;background:rgba(29,29,31,.9);color:#fff;padding:5px 11px;border-radius:8px;font-size:12px;pointer-events:none;display:none;z-index:100;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px)}
</style></head>
<body>
<div class="wrap">
  <div class="hd-src">
    <div class="hd-wp">W</div>
    <span class="hd-lbl">${ui.subtitle}</span>
  </div>
  <h1>${areaLabel}</h1>
  <p class="hd-sub">${ui.areaSuffix}</p>
  <p class="hd-date">${ui.asOf}</p>
  <div class="hd-rule"></div>
  <div class="stats">
    <div class="sc"><div class="sc-n">${result.articleCount}</div><div class="sc-l">${ui.articles}</div></div>
    ${statCard2}
    ${result.linkedTitles.length > 0
      ? `<div class="sc"><div class="sc-n">+${result.linkedTitles.length}</div><div class="sc-l">${ui.viaLinks}</div></div>`
      : ''
    }
  </div>
  <div class="card" id="mw">
    <svg id="map" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      ${clipPathDef ? `<defs>${clipPathDef}</defs>` : ''}
      <g id="vp">
        ${bgLayer}
        ${selectionOverlay}
        ${selectionMarker}
        <g id="dots"></g>
      </g>
    </svg>
    <div class="zb">
      <button onclick="doZ(1.35)" title="Zoom ein">+</button>
      <button onclick="doZ(1/1.35)" title="Zoom aus">−</button>
      <button onclick="doR()" title="Zurücksetzen" style="font-size:11px">↺</button>
    </div>
  </div>
  <div class="srch-wrap">
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    <input id="srch" type="text" placeholder="${ui.searchPlaceholder}">
  </div>
  <p id="cnt"></p>
  <div id="al-wrap"><div id="al"></div></div>
</div>
<div id="tt"></div>
<script>
const A=${articlesJson};
${jsProj}
const svg=document.getElementById('map');
const dg=document.getElementById('dots'),dm=new Map();
const isTouch=navigator.maxTouchPoints>0||'ontouchstart' in window;
let activeTapI=-1;
function deactivateTap(){
  if(activeTapI<0)return;
  const pc=dm.get(activeTapI);
  if(pc){pc.setAttribute('r','5');pc.setAttribute('fill','#1d1d1f');}
  hR(activeTapI,false,false);
  hT();activeTapI=-1;
}
A.forEach((a,i)=>{
  if(!a.c)return;
  const[x,y]=proj(a.c[0],a.c[1]);
  if(x<2||x>598||y<2||y>598)return;
  const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','5');
  c.setAttribute('fill','#1d1d1f');c.setAttribute('stroke','rgba(255,255,255,.8)');c.setAttribute('stroke-width','1.5');
  c.style.cursor='pointer';
  if(!isTouch){
    c.addEventListener('mouseenter',e=>{sT(e,a.l);c.setAttribute('r','7');c.setAttribute('fill','#3a3a3c');hR(i,true,false);});
    c.addEventListener('mouseleave',()=>{hT();c.setAttribute('r','5');c.setAttribute('fill','#1d1d1f');hR(i,false,false);});
    c.addEventListener('click',()=>go(a.t));
  } else {
    c.addEventListener('click',(e)=>{
      e.stopPropagation();
      if(activeTapI===i){go(a.t);return;}
      deactivateTap();
      activeTapI=i;
      c.setAttribute('r','7');c.setAttribute('fill','#3a3a3c');
      hR(i,true,false);
      const br=c.getBoundingClientRect();
      tt.style.left=Math.min(br.right+8,window.innerWidth-160)+'px';
      tt.style.top=Math.max(4,br.top-4)+'px';
      sT(null,a.l);
    });
  }
  dg.appendChild(c);dm.set(i,c);
});
if(isTouch){document.addEventListener('click',deactivateTap);}
const listEl=document.getElementById('al'),cntEl=document.getElementById('cnt');
const all=[...A.map((a,i)=>[a,i])].sort((x,y)=>x[0].l.localeCompare(y[0].l,'de'));
function rl(items){
  listEl.innerHTML='';
  const vis=new Set(items.map(([,i])=>i));
  dm.forEach((c,i)=>{c.style.display=vis.has(i)?'':'none';});
  items.forEach(([a,i])=>{
    const d=document.createElement('div');d.className='ar';d.dataset.i=i;
    const lk=document.createElement('a');lk.className='ar-t';lk.href='./'+encodeURIComponent(a.t.replace(/ /g,'_'));lk.textContent=a.l;lk.title=a.l;
    const sub=document.createElement('div');sub.className='ar-sub';
    if(a.cat){const s=document.createElement('span');s.className='ar-cat';s.textContent='('+a.cat+')';sub.appendChild(s);}
    if(a.c){const s=document.createElement('span');s.className='ar-crd';s.textContent=a.c[1].toFixed(4)+'°N\u2009'+a.c[0].toFixed(4)+'°E';sub.appendChild(s);}
    d.appendChild(lk);d.appendChild(sub);
    if(!isTouch){
      d.addEventListener('mouseenter',()=>{const c=dm.get(i);if(c){c.setAttribute('r','7');c.setAttribute('fill','#3a3a3c');}});
      d.addEventListener('mouseleave',()=>{const c=dm.get(i);if(c){c.setAttribute('r','5');c.setAttribute('fill','#1d1d1f');}});
    }
    listEl.appendChild(d);
  });
  cntEl.textContent=${uiLang === 'en'
    ? `items.length+' of '+A.length+' articles'`
    : `items.length+' von '+A.length+' Artikeln'`};
  requestAnimationFrame(()=>{const w=document.getElementById('al-wrap');w.classList.toggle('overflow',listEl.scrollHeight>listEl.clientHeight+2);});
}
document.getElementById('srch').addEventListener('input',function(){
  const q=this.value.toLowerCase();
  rl(q?all.filter(([a])=>a.l.toLowerCase().includes(q)||a.t.toLowerCase().includes(q)):all);
});
rl(all);
function go(t){window.location.href='./'+encodeURIComponent(t.replace(/ /g,'_'));}
function hR(i,on,scroll=true){const d=listEl.querySelector('[data-i="'+i+'"]');if(d){d.classList.toggle('hl',on);if(on&&scroll)d.scrollIntoView({block:'nearest',behavior:'smooth'});}}
const tt=document.getElementById('tt');
document.addEventListener('mousemove',e=>{if(!isTouch&&tt.style.display==='block'){tt.style.left=(e.clientX+12)+'px';tt.style.top=(e.clientY-6)+'px';}});
function sT(e,text){tt.textContent=text;tt.style.display='block';}
function hT(){tt.style.display='none';}
let tx=0,ty=0,sc=1;
function ap(){
  document.getElementById('vp').setAttribute('transform','translate('+tx+','+ty+') scale('+sc+')');
  const inv=1/sc;
  dm.forEach(c=>{const cx=parseFloat(c.getAttribute('cx')),cy=parseFloat(c.getAttribute('cy'));c.setAttribute('transform','translate('+(cx*(1-inv))+','+(cy*(1-inv))+') scale('+inv+')');});
}
function doZ(f,cx=300,cy=300){const ns=Math.max(.3,Math.min(14,sc*f));tx=cx-(cx-tx)*(ns/sc);ty=cy-(cy-ty)*(ns/sc);sc=ns;ap();}
function doR(){tx=0;ty=0;sc=1;ap();}
svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();doZ(e.deltaY<0?1.2:1/1.2,(e.clientX-r.left)/r.width*600,(e.clientY-r.top)/r.height*600);},{passive:false});
let drag=false,lx=0,ly=0;
svg.addEventListener('mousedown',e=>{drag=true;lx=e.clientX;ly=e.clientY;});
window.addEventListener('mousemove',e=>{if(!drag)return;const r=svg.getBoundingClientRect(),s=600/r.width;tx+=(e.clientX-lx)*s;ty+=(e.clientY-ly)*s;lx=e.clientX;ly=e.clientY;ap();});
window.addEventListener('mouseup',()=>drag=false);
let pd=0;
svg.addEventListener('touchstart',e=>{
  if(e.touches.length===2){drag=false;pd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}
  else if(e.touches.length===1){drag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;}
},{passive:true});
svg.addEventListener('touchmove',e=>{
  if(e.touches.length===2){
    e.preventDefault();
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    const r=svg.getBoundingClientRect();
    const cx=((e.touches[0].clientX+e.touches[1].clientX)/2-r.left)/r.width*600;
    const cy=((e.touches[0].clientY+e.touches[1].clientY)/2-r.top)/r.height*600;
    doZ(d/pd,cx,cy);pd=d;
  } else if(e.touches.length===1&&drag){
    e.preventDefault();
    const r=svg.getBoundingClientRect(),s=600/r.width;
    tx+=(e.touches[0].clientX-lx)*s;ty+=(e.touches[0].clientY-ly)*s;
    lx=e.touches[0].clientX;ly=e.touches[0].clientY;ap();
  }
},{passive:false});
svg.addEventListener('touchend',()=>{drag=false;});
</script>
</body></html>`;
}

function buildInjectScript(hasBg = false): string {
  return `#!/usr/bin/env python3
"""
Geo ZIM Wizard – Kartenübersicht als Startseite in ZIM integrieren
Fuegt eine interaktive Kartenuebersicht zur ZIM-Datei hinzu.
"""
import subprocess, sys

print("Installiere python-libzim...")
subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "libzim>=3.3"], check=True)

import glob, os, tempfile, shutil
from libzim.reader import Archive
from libzim.writer import Creator, Item, StringProvider, FileProvider, Hint


class HtmlItem(Item):
    def __init__(self, path, title, html):
        super().__init__()
        self._path, self._title, self._html = path, title, html

    def get_path(self): return self._path
    def get_title(self): return self._title
    def get_mimetype(self): return "text/html"
    def get_contentprovider(self): return StringProvider(self._html)
    def get_hints(self): return {Hint.FRONT_ARTICLE: True}


class TextItem(Item):
    def __init__(self, path, title, mimetype, text):
        super().__init__()
        self._path, self._title, self._mt, self._text = path, title, mimetype, text

    def get_path(self): return self._path
    def get_title(self): return self._title
    def get_mimetype(self): return self._mt
    def get_contentprovider(self): return StringProvider(self._text)
    def get_hints(self): return {Hint.FRONT_ARTICLE: True}


class BinaryItem(Item):
    def __init__(self, path, title, mimetype, filepath):
        super().__init__()
        self._path, self._title, self._mt, self._fp = path, title, mimetype, filepath

    def get_path(self): return self._path
    def get_title(self): return self._title
    def get_mimetype(self): return self._mt
    def get_contentprovider(self): return FileProvider(self._fp)
    def get_hints(self): return {Hint.FRONT_ARTICLE: False}


def main():
    with open("/map.html", "r", encoding="utf-8") as f:
        map_html = f.read()

    zim_files = sorted(glob.glob("/output/*.zim"))
    if not zim_files:
        print("FEHLER: Keine ZIM-Datei in /output/ gefunden")
        sys.exit(1)

    source_path = zim_files[0]
    tmp_path = source_path + ".tmp"
    tmp_dir = tempfile.mkdtemp(prefix="zim_inject_")

    try:
        print(f"Verarbeite: {os.path.basename(source_path)}")
        source = Archive(source_path)
        n = source.all_entry_count
        print(f"{n} Eintraege gefunden - Kartenuebersicht wird eingefuegt...")

        try:
            lang = bytes(source.get_metadata("Language")).decode().strip()
        except Exception:
            lang = "deu"

        with Creator(tmp_path).config_indexing(True, lang) as creator:
            creator.set_mainpath("map")

            # Copy all metadata from source ZIM
            # Skip keys that Creator manages automatically to avoid conflicts
            AUTO_MANAGED_KEYS = {"Counter"}  # only Counter is auto-generated by Creator
            for key in source.metadata_keys:
                try:
                    if key.startswith("Illustration_"):
                        continue  # handled separately below
                    if key in AUTO_MANAGED_KEYS:
                        continue  # auto-generated by Creator, skip to avoid duplicate conflict
                    creator.add_metadata(key, bytes(source.get_metadata(key)))
                except Exception as e:
                    print(f"  Warnung: Metadaten '{key}' nicht kopiert ({e})")

            # Copy illustrations (favicon etc.)
            try:
                for info in source.get_illustration_infos():
                    illo = bytes(source.get_illustration_item(info.size).content)
                    creator.add_illustration(info.size, illo)
            except Exception as e:
                print(f"  Warnung: Illustration nicht kopiert ({e})")

            creator.add_item(HtmlItem("map", "Kartenuebersicht", map_html))
${hasBg ? `
            # Add map background image if available
            bg_path = "/map-bg.jpg"
            if os.path.exists(bg_path):
                creator.add_item(BinaryItem("map-bg.jpg", "Kartenhintergrund", "image/jpeg", bg_path))` : ''}

            for i in range(n):
                try:
                    entry = source._get_entry_by_id(i)
                    if entry.is_redirect:
                        target = entry.get_redirect_entry()
                        creator.add_redirection(
                            entry.path, entry.title, target.path,
                            {Hint.FRONT_ARTICLE: False}
                        )
                    else:
                        item = entry.get_item()
                        raw = bytes(item.content)
                        mt = item.mimetype
                        if mt.startswith("text/"):
                            creator.add_item(TextItem(
                                entry.path, entry.title, mt,
                                raw.decode("utf-8", errors="replace")
                            ))
                        else:
                            fp = os.path.join(tmp_dir, str(i))
                            with open(fp, "wb") as f:
                                f.write(raw)
                            creator.add_item(BinaryItem(entry.path, entry.title, mt, fp))

                    if (i + 1) % 200 == 0:
                        print(f"  {i + 1}/{n} Eintraege verarbeitet...")

                except Exception as e:
                    print(f"  Warnung: Eintrag {i} uebersprungen ({e})")

        os.replace(tmp_path, source_path)
        print("Kartenuebersicht erfolgreich als Startseite integriert!")

    except Exception as e:
        print(f"FEHLER: {e}")
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        sys.exit(1)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


main()
`;
}

function buildShellScript(prefix: string): string {
  return `#!/bin/bash
# Geo ZIM Wizard – Build Script
# Voraussetzung: Docker muss installiert sein
# Aufruf: bash build.sh

set -e

mkdir -p output

echo "mwoffliner starten (kann Stunden dauern)..."
docker compose up
docker compose down

echo "Fertig!"
echo "ZIM-Datei: ./output/${prefix}.zim"
echo "Öffne mit Kiwix: https://www.kiwix.org/de/applications/"
`;
}

function buildReadme(
  selection: GeographicSelection,
  config: WikidataConfig,
  result: WikidataResult,
  areaLabel: string,
  prefix: string
): string {
  const sizeFmt =
    result.estimatedSizeMB >= 1024
      ? `${(result.estimatedSizeMB / 1024).toFixed(1)} GB`
      : `${result.estimatedSizeMB} MB`;
  const diskNeeded = Math.round(result.estimatedSizeMB * 2.5);

  return `# Wikipedia Offline-Archiv

Erstellt mit [Waedeker](https://waedeker.netzgewoelbe.com)

## Dein Archiv

| Eigenschaft | Wert |
|-------------|------|
| Gebiet | ${areaLabel} |
| Auswahl | ${
  selection.type === 'polygon'
    ? `Polygon (${selection.points.length} Punkte)`
    : selection.type === 'route'
    ? `Route ${selection.lengthKm?.toFixed(1) ?? '?'} km · Puffer ${selection.bufferKm} km`
    : selection.type === 'rectangle'
    ? (() => {
        const cosL = Math.cos(((selection.sw[1] + selection.ne[1]) / 2) * Math.PI / 180);
        const wKm = Math.round((selection.ne[0] - selection.sw[0]) * cosL * 111);
        const hKm = Math.round((selection.ne[1] - selection.sw[1]) * 111);
        return `Rechteck ${wKm}×${hKm} km`;
      })()
    : selection.type === 'admin-area'
    ? `Verwaltungsgebiet (${selection.label ?? ''})`
    : `Radius: ${selection.radiusKm} km`
} |
| Wikipedia-Sprache | ${config.language.toUpperCase()} |
| Artikel | ${result.articleCount.toLocaleString('de')} |
| Geschätzte Dateigröße | ${sizeFmt} |
| Bilder | ${config.includeImages ? 'Ja' : 'Nein'} |
| Linktiefe | ${config.linkDepth} |
${config.categories.length > 0 ? `| Kategorienfilter | ${config.categories.join(', ')} |` : ''}

## Enthaltene Dateien

| Datei | Beschreibung |
|-------|--------------|
| \`articles.txt\` | Alle ${result.articleCount.toLocaleString('de')} Wikipedia-Artikel (ein Titel pro Zeile) |
| \`docker-compose.yml\` | Docker Compose Konfiguration (empfohlen) |
| \`build.sh\` | Shell-Skript als Alternative zu Compose |
| \`README.md\` | Diese Anleitung |

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert und gestartet
- Mind. **${diskNeeded} MB** freier Festplattenspeicher
- Stabile Internetverbindung während des Builds

## Build starten

### Option A: Docker Compose (empfohlen)

\`\`\`bash
mkdir output
docker compose up && docker compose down
\`\`\`

### Option B: Shell-Skript

\`\`\`bash
chmod +x build.sh
./build.sh
\`\`\`

> **Hinweis:** Der Build-Prozess lädt alle ${result.articleCount.toLocaleString('de')} Artikel direkt von Wikipedia und
> kann je nach Artikelanzahl und Verbindungsgeschwindigkeit **mehrere Stunden** dauern.
> Du kannst ihn jederzeit mit Strg+C unterbrechen und später mit \`docker compose up && docker compose down\` fortsetzen.

> **Aufräumen:** \`docker compose down\` entfernt die gestoppten Container nach dem Build automatisch.
> Für bereits angesammelte Container aus früheren Builds: \`docker container prune\` löscht alle gestoppten Container auf einmal.

## ZIM-Datei verwenden

Die fertige Datei liegt in \`./output/${prefix}.zim\`.

**Kiwix** kann ZIM-Dateien auf allen Geräten ohne Internet öffnen:

- **Desktop:** [Kiwix Desktop](https://www.kiwix.org/de/applications/) (Windows, macOS, Linux)
- **Android:** [Kiwix im Play Store](https://play.google.com/store/apps/details?id=org.kiwix.kiwixmobile)
- **iOS:** [Kiwix im App Store](https://apps.apple.com/app/kiwix/id997079563)
- **Lokaler Server:**
  \`\`\`bash
  docker run -p 8080:80 -v ./output:/data ghcr.io/kiwix/kiwix-serve:latest ${prefix}.zim
  \`\`\`
  → öffne http://localhost:8080 im Browser

---
*Erstellt am ${new Date().toLocaleDateString('de-DE')} mit Geo ZIM Wizard*
`;
}
