import type { GeographicSelection, WikidataConfig } from '@/types';
import type { Locale } from '@/i18n/types';

const PREC = 4; // ~11 m accuracy
const r = (n: number) => Math.round(n * 10 ** PREC) / 10 ** PREC;

/** Encode selection + config into a shareable URL string. */
export function encodeShareUrl(
  selection: GeographicSelection,
  config: WikidataConfig,
  uiLocale?: Locale,
): string {
  const p = new URLSearchParams();
  p.set('lang', config.language);
  p.set('img', config.includeImages ? '1' : '0');
  p.set('depth', String(config.linkDepth));
  if (uiLocale) p.set('ui', uiLocale);

  switch (selection.type) {
    case 'point-radius':
      p.set('t', 'pt');
      p.set('lat', String(r(selection.center[1])));
      p.set('lng', String(r(selection.center[0])));
      p.set('r', String(r(selection.radiusKm)));
      if (selection.label) p.set('lbl', selection.label);
      break;
    case 'rectangle':
      p.set('t', 'rect');
      p.set('sw', `${r(selection.sw[0])},${r(selection.sw[1])}`);
      p.set('ne', `${r(selection.ne[0])},${r(selection.ne[1])}`);
      if (selection.label) p.set('lbl', selection.label);
      break;
    case 'polygon':
      p.set('t', 'poly');
      p.set('pts', selection.points.map(([lng, lat]) => `${r(lng)},${r(lat)}`).join('|'));
      if (selection.label) p.set('lbl', selection.label);
      break;
    case 'route':
      // GPX routes: carry config + buffer radius + optional maps link for auto-trigger.
      p.set('t', 'gpx');
      p.set('buf', String(r(selection.bufferKm)));
      if (selection.label) p.set('lbl', selection.label);
      if (selection.sourceLink) {
        p.set('maplink', selection.sourceLink);
        if (selection.sourcePlatform) p.set('mapprovider', selection.sourcePlatform);
      }
      break;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${p.toString()}`;
}

export interface DecodedShareParams {
  /** Fully reconstructed selection, or null for GPX (user must re-upload). */
  selection: GeographicSelection | null;
  config: WikidataConfig;
  /** True for GPX routes — app should show GPX overlay first. */
  isRoute: boolean;
  /** bufferKm carried from URL, only relevant when isRoute=true */
  bufferKm?: number;
  /** UI locale encoded in the share URL */
  uiLocale?: Locale;
  /** Maps link to auto-trigger in GpxSelectionOverlay */
  mapLink?: string;
  /** Platform of the maps link */
  mapProvider?: 'google' | 'apple';
}

/** Parse URLSearchParams into wizard state. Returns null if params are missing/invalid. */
export function decodeShareParams(params: URLSearchParams): DecodedShareParams | null {
  const t = params.get('t');
  if (!t) return null;

  const lang = params.get('lang') ?? 'de';
  const img = params.get('img') === '1';
  const depth = Math.min(3, Math.max(0, parseInt(params.get('depth') ?? '0', 10)));
  const config: WikidataConfig = { language: lang, includeImages: img, linkDepth: depth, categories: [] };
  const lbl = params.get('lbl') ?? undefined;
  const uiRaw = params.get('ui');
  const uiLocale: Locale | undefined = uiRaw === 'de' || uiRaw === 'en' ? uiRaw : undefined;

  try {
    if (t === 'pt') {
      const lat = parseFloat(params.get('lat') ?? '');
      const lng = parseFloat(params.get('lng') ?? '');
      const radiusKm = parseFloat(params.get('r') ?? '25');
      if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) return null;
      return {
        selection: { type: 'point-radius', center: [lng, lat], radiusKm, label: lbl },
        config,
        isRoute: false,
        uiLocale,
      };
    }

    if (t === 'rect') {
      const sw = parseCoord(params.get('sw') ?? '');
      const ne = parseCoord(params.get('ne') ?? '');
      if (!sw || !ne) return null;
      return {
        selection: { type: 'rectangle', sw, ne, label: lbl },
        config,
        isRoute: false,
        uiLocale,
      };
    }

    if (t === 'poly') {
      const raw = params.get('pts') ?? '';
      const pts = raw.split('|').map(parseCoord).filter((p): p is [number, number] => p !== null);
      if (pts.length < 3) return null;
      return {
        selection: { type: 'polygon', points: pts, label: lbl },
        config,
        isRoute: false,
        uiLocale,
      };
    }

    if (t === 'gpx') {
      const bufferKm = parseFloat(params.get('buf') ?? '5');
      const mapLink = params.get('maplink') ?? undefined;
      const rawProvider = params.get('mapprovider');
      const mapProvider: 'google' | 'apple' | undefined =
        rawProvider === 'google' || rawProvider === 'apple' ? rawProvider : undefined;
      return { selection: null, config, isRoute: true, bufferKm: isNaN(bufferKm) ? 5 : bufferKm, uiLocale, mapLink, mapProvider };
    }
  } catch {
    return null;
  }

  return null;
}

function parseCoord(s: string): [number, number] | null {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const a = parseFloat(parts[0]);
  const b = parseFloat(parts[1]);
  if (isNaN(a) || isNaN(b)) return null;
  return [a, b];
}
