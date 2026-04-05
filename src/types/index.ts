export type SelectionMode = 'point-radius' | 'rectangle' | 'polygon' | 'route' | 'admin-area';

export type WizardStep =
  | 'hero'
  | 'explain'
  | 'mode-select'
  | 'map-selection'
  | 'config'
  | 'loading'
  | 'results';

export interface PointRadiusSelection {
  type: 'point-radius';
  center: [number, number]; // [lng, lat]
  radiusKm: number;
  label?: string;
}

export interface RectangleSelection {
  type: 'rectangle';
  sw: [number, number]; // [lng, lat] southwest corner
  ne: [number, number]; // [lng, lat] northeast corner
  label?: string;
}

export interface PolygonSelection {
  type: 'polygon';
  points: [number, number][]; // [lng, lat] vertices (closed polygon, first != last)
  label?: string;
}

export interface RouteSelection {
  type: 'route';
  trackPoints: [number, number][]; // [lng, lat] subsampled track points
  bufferKm: number;
  polygon: [number, number][]; // union-of-circles buffer polygon [lng, lat]
  label?: string;
  filename?: string;
  lengthKm?: number;
  /** Original maps link used to generate the route (Google / Apple Maps URL) */
  sourceLink?: string;
  /** Platform the sourceLink came from */
  sourcePlatform?: 'google' | 'apple';
}

export interface AdminAreaEntry {
  /** Exterior ring of the boundary polygon — [lng, lat] */
  polygon: [number, number][];
  /** Inner rings (holes / enclaves) — [lng, lat] */
  holes: [number, number][][];
  /** Bounding box [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  label?: string;
}

export interface AdminAreaSelection {
  type: 'admin-area';
  /** One or more administrative areas whose shapes are combined */
  areas: AdminAreaEntry[];
  /** Union bounding box of all areas [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  label?: string;
}

export type GeographicSelection = PointRadiusSelection | RectangleSelection | PolygonSelection | RouteSelection | AdminAreaSelection;

export interface WikidataConfig {
  language: string;
  includeImages: boolean;
  linkDepth: number; // 0–3
  categories: string[]; // Q-ids for P31 filter
}

export interface WikiArticle {
  qid: string;
  title: string;
  label: string;
  coord?: [number, number]; // [lng, lat]
  category?: string;   // P31 instance-of label
  categoryId?: string; // P31 instance-of Q-id (for client-side category filtering)
}

export interface WikidataCategory {
  id: string;   // Q-id
  label: string;
  count: number;
}

export interface WikidataResult {
  articleCount: number;
  estimatedSizeMB: number;
  articles: WikiArticle[];
  linkedTitles: string[];           // titles added via link-depth expansion
  linkCache: Map<string, string[]>; // title → linked titles (for fast category re-filter)
}
