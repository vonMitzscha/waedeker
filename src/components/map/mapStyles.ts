/**
 * Shared map style constants for all selection modes.
 * Single source of truth for colors, layer paints, and popup HTML.
 */

export const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const MAP_COLORS = {
  /** Selection area fill + stroke (polygon outline, circle border, marker) */
  selection: '#700700',
  /** Article location dots */
  articleDot: '#6B8F3E',
  /** Vertex dot fill / inner marker ring */
  vertexFill: '#F9F3EA',
} as const;

/** Paint config for selection fill layers (circle-fill, poly-fill) */
export const selectionFillPaint = {
  'fill-color': MAP_COLORS.selection,
  'fill-opacity': 0.1,
};

/** Paint config for selection outline layers (circle-line, poly-line) */
export const selectionLinePaint = {
  'line-color': MAP_COLORS.selection,
  'line-width': 2,
  'line-dasharray': [4, 3],
};

/** Paint config for article dot layers */
export const articleDotsPaint: any = {
  'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6],
  'circle-color': MAP_COLORS.articleDot,
  'circle-stroke-color': '#ffffff',
  'circle-stroke-width': 1.5,
  'circle-opacity': 0.9,
};

/** Default options for article hover popups */
export const POPUP_OPTIONS = {
  closeButton: false,
  closeOnClick: false,
  offset: [0, -4] as [number, number],
  maxWidth: '260px',
} as const;

/** HTML for article hover popup (uses .wiki-popup CSS class from globals.css) */
export function articlePopupHtml(label: string, wikiUrl: string): string {
  return `<div class="wiki-popup"><a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">${label}</a></div>`;
}
