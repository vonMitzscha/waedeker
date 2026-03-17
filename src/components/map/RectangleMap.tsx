'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { Popup } from 'maplibre-gl';
import type { RectangleSelection, WikiArticle } from '@/types';
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

export interface RectangleMapHandle {
  getCorners: () => { sw: [number, number]; ne: [number, number] } | null;
  isConfirmed: () => boolean;
  reset: () => void;
  getSnapshot: () => Promise<string | null>;
  flyTo: (center: [number, number]) => void;
}

interface RectangleMapProps {
  interactive?: boolean;
  initialSelection?: RectangleSelection | null;
  onChange?: (sw: [number, number] | null, ne: [number, number] | null, confirmed: boolean) => void;
  articles?: WikiArticle[];
  language?: string;
}

function normalizeCorners(a: [number, number], b: [number, number]) {
  return {
    sw: [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as [number, number],
    ne: [Math.max(a[0], b[0]), Math.max(a[1], b[1])] as [number, number],
  };
}

function buildRectGeoJSON(
  start: [number, number] | null,
  end: [number, number] | null,
  preview: [number, number] | null,
) {
  const features: GeoJSON.Feature[] = [];
  if (!start) return { type: 'FeatureCollection' as const, features };

  const second = end ?? preview;

  if (!second) {
    // Only start point: show a single handle dot
    features.push({
      type: 'Feature',
      properties: { kind: 'handles' },
      geometry: { type: 'MultiPoint', coordinates: [start] },
    });
    return { type: 'FeatureCollection' as const, features };
  }

  const { sw, ne } = normalizeCorners(start, second);
  const nw: [number, number] = [sw[0], ne[1]];
  const se: [number, number] = [ne[0], sw[1]];

  // Fill
  features.push({
    type: 'Feature',
    properties: { kind: 'fill' },
    geometry: {
      type: 'Polygon',
      coordinates: [[sw, se, ne, nw, sw]],
    },
  });

  // Line (closed rectangle)
  features.push({
    type: 'Feature',
    properties: { kind: 'line' },
    geometry: {
      type: 'LineString',
      coordinates: [sw, se, ne, nw, sw],
    },
  });

  // Handles at 4 corners
  features.push({
    type: 'Feature',
    properties: { kind: 'handles' },
    geometry: {
      type: 'MultiPoint',
      coordinates: [sw, se, ne, nw],
    },
  });

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

const RECT_LAYERS = ['rect-fill', 'rect-line', 'rect-handles'] as const;

const RectangleMap = forwardRef<RectangleMapHandle, RectangleMapProps>(function RectangleMap(
  { interactive = false, initialSelection = null, onChange, articles, language = 'de' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const initialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const startRef = useRef<[number, number] | null>(null);
  const endRef = useRef<[number, number] | null>(null);
  const confirmedRef = useRef(false);
  const previewRef = useRef<[number, number] | null>(null);

  const pushUpdate = useCallback(() => {
    const m = mapRef.current;
    if (!m || !m.getSource('rectangle')) return;
    (m.getSource('rectangle') as import('maplibre-gl').GeoJSONSource).setData(
      buildRectGeoJSON(startRef.current, endRef.current, previewRef.current),
    );
    const corners = startRef.current && endRef.current
      ? normalizeCorners(startRef.current, endRef.current)
      : null;
    onChange?.(corners?.sw ?? null, corners?.ne ?? null, confirmedRef.current);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getCorners: () => {
      if (!startRef.current || !endRef.current) return null;
      return normalizeCorners(startRef.current, endRef.current);
    },
    isConfirmed: () => confirmedRef.current,
    reset: () => {
      startRef.current = null;
      endRef.current = null;
      confirmedRef.current = false;
      previewRef.current = null;
      pushUpdate();
    },
    getSnapshot: async () => {
      const m = mapRef.current;
      if (!m) return null;
      if (!startRef.current || !endRef.current) return null;

      const { sw, ne } = normalizeCorners(startRef.current, endRef.current);

      // Hide rect overlay for clean background snapshot
      RECT_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'none'); } catch { /* layer may not exist */ } });

      const canvas = m.getCanvas();
      const W = canvas.width, H = canvas.height;
      const S = Math.min(W, H);
      const padding = Math.round(S * (300 - 280 / 1.15) / 600);

      return new Promise((resolve) => {
        m.once('idle', () => {
          const out = document.createElement('canvas');
          out.width = S; out.height = S;
          const ctx = out.getContext('2d');
          if (!ctx) {
            RECT_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
            resolve(null); return;
          }
          ctx.drawImage(canvas, (W - S) / 2, (H - S) / 2, S, S, 0, 0, S, S);
          RECT_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
          resolve(out.toDataURL('image/jpeg', 0.88));
        });
        m.fitBounds([sw, ne], { padding, maxZoom: 16, animate: false });
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
        attributionControl: false,
      });

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

        // ── Rectangle source + layers ─────────────────────
        map.addSource('rectangle', { type: 'geojson', data: buildRectGeoJSON(null, null, null) });

        map.addLayer({
          id: 'rect-fill', type: 'fill', source: 'rectangle',
          filter: ['==', ['get', 'kind'], 'fill'],
          paint: selectionFillPaint,
        });

        map.addLayer({
          id: 'rect-line', type: 'line', source: 'rectangle',
          filter: ['==', ['get', 'kind'], 'line'],
          paint: selectionLinePaint,
        });

        map.addLayer({
          id: 'rect-handles', type: 'circle', source: 'rectangle',
          filter: ['==', ['get', 'kind'], 'handles'],
          paint: {
            'circle-radius': 5,
            'circle-color': MAP_COLORS.vertexFill,
            'circle-stroke-color': MAP_COLORS.selection,
            'circle-stroke-width': 2,
          },
        });

        // Load initial selection
        if (initialSelection) {
          startRef.current = initialSelection.sw;
          endRef.current = initialSelection.ne;
          confirmedRef.current = true;
          pushUpdate();
          map.fitBounds([initialSelection.sw, initialSelection.ne], { padding: 60, maxZoom: 16, animate: false });
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
          if (confirmedRef.current) return;
          if (!startRef.current) return;
          previewRef.current = [e.lngLat.lng, e.lngLat.lat];
          pushUpdate();
        });

        map.on('click', (e) => {
          if (confirmedRef.current) return;
          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          if (!startRef.current) {
            // First click: set start
            startRef.current = lngLat;
            pushUpdate();
          } else {
            // Second click: confirm rectangle
            endRef.current = lngLat;
            confirmedRef.current = true;
            previewRef.current = null;
            map.getCanvas().style.cursor = '';
            pushUpdate();
          }
        });

        map.on('mouseleave', () => {
          if (confirmedRef.current) return;
          previewRef.current = null;
          pushUpdate();
        });

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
    if (startRef.current && endRef.current) {
      const { sw, ne } = normalizeCorners(startRef.current, endRef.current);
      mapRef.current.fitBounds([sw, ne], { padding: 24, animate: false });
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

export default RectangleMap;
