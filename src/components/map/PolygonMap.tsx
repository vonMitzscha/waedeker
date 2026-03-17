'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { Popup } from 'maplibre-gl';
import type { PolygonSelection, WikiArticle } from '@/types';
import { getLocaleView } from '@/lib/locale';
import {
  MAP_STYLE_URL,
  MAP_COLORS,
  selectionFillPaint,
  selectionLinePaint,
  articleDotsPaint,
  POPUP_OPTIONS,
  articlePopupHtml,
} from './mapStyles';

export interface PolygonMapHandle {
  getPoints: () => [number, number][];
  getClosed: () => boolean;
  undoLast: () => void;
  redoLast: () => void;
  reset: () => void;
  getSnapshot: () => Promise<string | null>;
  flyTo: (center: [number, number]) => void;
}

interface PolygonMapProps {
  interactive?: boolean;
  initialSelection?: PolygonSelection | null;
  onChange?: (points: [number, number][], closed: boolean) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  articles?: WikiArticle[];
  language?: string;
}

const CLOSE_THRESHOLD = 18;

function buildGeoJSON(pts: [number, number][], closed: boolean, preview: [number, number] | null) {
  const features: GeoJSON.Feature[] = [];
  if (pts.length === 0) return { type: 'FeatureCollection' as const, features };

  if (closed && pts.length >= 3) {
    features.push({
      type: 'Feature',
      properties: { kind: 'fill' },
      geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
    });
  }

  const linePts: [number, number][] = closed
    ? [...pts, pts[0]]
    : preview
    ? [...pts, preview]
    : [...pts];

  if (linePts.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { kind: 'line' },
      geometry: { type: 'LineString', coordinates: linePts },
    });
  }

  if (pts.length > 0) {
    features.push({
      type: 'Feature',
      properties: { kind: 'vertices' },
      geometry: { type: 'MultiPoint', coordinates: closed ? pts : pts.slice(1) },
    });
    features.push({
      type: 'Feature',
      properties: { kind: 'first' },
      geometry: { type: 'Point', coordinates: pts[0] },
    });
  }

  return { type: 'FeatureCollection' as const, features };
}

function markersGeoJSON(articles: WikiArticle[]) {
  return {
    type: 'FeatureCollection' as const,
    features: articles
      .filter((a) => a.coord)
      .map((a) => ({
        type: 'Feature' as const,
        properties: { label: a.label || a.title, title: a.title },
        geometry: { type: 'Point' as const, coordinates: a.coord! },
      })),
  };
}

const PolygonMap = forwardRef<PolygonMapHandle, PolygonMapProps>(function PolygonMap(
  { interactive = false, initialSelection = null, onChange, onHistoryChange, articles, language = 'de' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const initialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const pointsRef = useRef<[number, number][]>([]);
  const closedRef = useRef(false);
  const previewRef = useRef<[number, number] | null>(null);
  type Snapshot = { points: [number, number][]; closed: boolean };
  const historyRef = useRef<Snapshot[]>([]);
  const redoStackRef = useRef<Snapshot[]>([]);

  const POLY_LAYERS = ['poly-fill', 'poly-line', 'poly-vertices', 'poly-first'] as const;

  const pushUpdate = useCallback(() => {
    const m = mapRef.current;
    if (!m || !m.getSource('polygon')) return;
    (m.getSource('polygon') as import('maplibre-gl').GeoJSONSource).setData(
      buildGeoJSON(pointsRef.current, closedRef.current, previewRef.current),
    );
    onChange?.(pointsRef.current, closedRef.current);
    onHistoryChange?.(historyRef.current.length > 0, redoStackRef.current.length > 0);
  }, [onChange, onHistoryChange]);

  useImperativeHandle(ref, () => ({
    getPoints: () => pointsRef.current,
    getClosed: () => closedRef.current,
    undoLast: () => {
      if (historyRef.current.length === 0) return;
      redoStackRef.current.push({ points: [...pointsRef.current], closed: closedRef.current });
      const prev = historyRef.current.pop()!;
      pointsRef.current = prev.points;
      closedRef.current = prev.closed;
      pushUpdate();
    },
    redoLast: () => {
      if (redoStackRef.current.length === 0) return;
      historyRef.current.push({ points: [...pointsRef.current], closed: closedRef.current });
      const next = redoStackRef.current.pop()!;
      pointsRef.current = next.points;
      closedRef.current = next.closed;
      pushUpdate();
    },
    reset: () => {
      historyRef.current = [];
      redoStackRef.current = [];
      pointsRef.current = [];
      closedRef.current = false;
      previewRef.current = null;
      pushUpdate();
    },
    getSnapshot: async () => {
      const m = mapRef.current;
      if (!m) return null;
      const pts = pointsRef.current;
      if (pts.length < 2) return null;

      const lngs = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];

      // Hide polygon overlay for clean background snapshot
      POLY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'none'); } catch { /* layer may not exist */ } });

      const canvas = m.getCanvas();
      const W = canvas.width, H = canvas.height;
      const S = Math.min(W, H);
      // Padding matches the SVG's 1.15× margin factor so background and overlay align
      const padding = Math.round(S * (300 - 280 / 1.15) / 600);

      return new Promise((resolve) => {
        m.once('idle', () => {
          const out = document.createElement('canvas');
          out.width = S; out.height = S;
          const ctx = out.getContext('2d');
          if (!ctx) {
            POLY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
            resolve(null); return;
          }
          ctx.drawImage(canvas, (W - S) / 2, (H - S) / 2, S, S, 0, 0, S, S);
          POLY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
          resolve(out.toDataURL('image/jpeg', 0.88));
        });
        m.fitBounds(bounds, { padding, maxZoom: 16, animate: false });
      });
    },
    flyTo: (center) => { mapRef.current?.flyTo({ center, zoom: 12, duration: 900 }); },
  }), [pushUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    let map: import('maplibre-gl').Map;

    import('maplibre-gl').then((gl) => {
      map = new gl.Map({
        container: containerRef.current!,
        style: MAP_STYLE_URL,
        center: getLocaleView().center,
        zoom: getLocaleView().zoom,
        preserveDrawingBuffer: true,
        attributionControl: false,
      } as any);

      map.addControl(new gl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');

      if (!interactive) {
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        map.keyboard.disable();
      }

      map.on('load', () => {
        mapRef.current = map;

        // ── Polygon source + layers ──────────────────────
        map.addSource('polygon', { type: 'geojson', data: buildGeoJSON([], false, null) });

        map.addLayer({
          id: 'poly-fill', type: 'fill', source: 'polygon',
          filter: ['==', ['get', 'kind'], 'fill'],
          paint: selectionFillPaint,
        });

        map.addLayer({
          id: 'poly-line', type: 'line', source: 'polygon',
          filter: ['==', ['get', 'kind'], 'line'],
          paint: selectionLinePaint,
        });

        // Vertex dots
        map.addLayer({
          id: 'poly-vertices', type: 'circle', source: 'polygon',
          filter: ['==', ['get', 'kind'], 'vertices'],
          paint: {
            'circle-radius': 5,
            'circle-color': MAP_COLORS.vertexFill,
            'circle-stroke-color': MAP_COLORS.selection,
            'circle-stroke-width': 2,
          },
        });

        // First vertex: filled accent
        map.addLayer({
          id: 'poly-first', type: 'circle', source: 'polygon',
          filter: ['==', ['get', 'kind'], 'first'],
          paint: {
            'circle-radius': 7,
            'circle-color': MAP_COLORS.selection,
            'circle-stroke-color': MAP_COLORS.vertexFill,
            'circle-stroke-width': 2.5,
          },
        });

        // Load initial selection
        if (initialSelection && initialSelection.points.length >= 3) {
          pointsRef.current = initialSelection.points;
          closedRef.current = true;
          pushUpdate();
          const lngs = initialSelection.points.map((p) => p[0]);
          const lats = initialSelection.points.map((p) => p[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: 16, animate: false },
          );
        }

        // ── Article dots (static display only) ──────────
        if (!interactive) {
          map.addSource('articles', { type: 'geojson', data: markersGeoJSON([]) });
          map.addLayer({
            id: 'article-dots', type: 'circle', source: 'articles',
            paint: articleDotsPaint,
          });

          map.on('mouseenter', 'article-dots', (e) => {
            const ev = e as unknown as { features: Array<{ properties: { label: string; title: string }; geometry: { coordinates: [number, number] } }> };
            map.getCanvas().style.cursor = 'pointer';
            const props = ev.features?.[0]?.properties;
            const coords = ev.features?.[0]?.geometry?.coordinates as [number, number] | undefined;
            if (!props || !coords) return;
            const wikiUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(props.title)}`;
            popupRef.current?.remove();
            popupRef.current = new gl.Popup(POPUP_OPTIONS)
              .setLngLat(coords)
              .setHTML(articlePopupHtml(props.label, wikiUrl))
              .addTo(map);
          });

          map.on('mouseleave', 'article-dots', () => {
            map.getCanvas().style.cursor = '';
            popupRef.current?.remove();
            popupRef.current = null;
          });

          map.on('click', 'article-dots', (e) => {
            const ev = e as unknown as { features: Array<{ properties: { title: string } }> };
            const title = ev.features?.[0]?.properties?.title;
            if (title) window.open(`https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`, '_blank');
          });

          setMapReady(true);
          return;
        }

        // ── Interactive drawing ──────────────────────────
        map.getCanvas().style.cursor = 'crosshair';

        map.on('mousemove', (e) => {
          if (closedRef.current) return;
          if (pointsRef.current.length === 0) return;
          previewRef.current = [e.lngLat.lng, e.lngLat.lat];
          pushUpdate();
          const firstPt = map.project(pointsRef.current[0] as [number, number]);
          const dx = e.point.x - firstPt.x, dy = e.point.y - firstPt.y;
          map.getCanvas().style.cursor =
            pointsRef.current.length >= 3 && Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD
              ? 'pointer'
              : 'crosshair';
        });

        map.on('click', (e) => {
          if (closedRef.current) return;
          const pts = pointsRef.current;
          if (pts.length >= 3) {
            const firstPt = map.project(pts[0] as [number, number]);
            const dx = e.point.x - firstPt.x, dy = e.point.y - firstPt.y;
            if (Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD) {
              historyRef.current.push({ points: [...pointsRef.current], closed: closedRef.current });
              redoStackRef.current = [];
              closedRef.current = true;
              previewRef.current = null;
              map.getCanvas().style.cursor = '';
              pushUpdate(); return;
            }
          }
          historyRef.current.push({ points: [...pointsRef.current], closed: closedRef.current });
          redoStackRef.current = [];
          pointsRef.current = [...pts, [e.lngLat.lng, e.lngLat.lat]];
          pushUpdate();
        });

        map.on('dblclick', (e) => {
          e.preventDefault();
          if (closedRef.current || pointsRef.current.length < 3) return;
          historyRef.current.push({ points: [...pointsRef.current], closed: closedRef.current });
          redoStackRef.current = [];
          closedRef.current = true;
          previewRef.current = null;
          map.getCanvas().style.cursor = '';
          pushUpdate();
        });

        map.on('mouseleave', () => { previewRef.current = null; pushUpdate(); });

        setMapReady(true);
      });
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; initialized.current = false; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update article dots when prop changes
  useEffect(() => {
    if (!mapRef.current || !mapReady || !articles || interactive) return;
    const src = mapRef.current.getSource('articles') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!src) return;
    src.setData(markersGeoJSON(articles));
    if (pointsRef.current.length >= 3) {
      const lngs = pointsRef.current.map((p) => p[0]);
      const lats = pointsRef.current.map((p) => p[1]);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 24, animate: false },
      );
    }
  }, [articles, mapReady, interactive]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 200 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {!mapReady && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#EDE0CE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'map-spin 1s linear infinite' }}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="#c4a882" strokeWidth="3" />
            <path d="M18 4 A14 14 0 0 1 32 18" fill="none" stroke="#700700" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes map-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
});

export default PolygonMap;
