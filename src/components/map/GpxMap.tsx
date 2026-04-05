'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import type { Popup } from 'maplibre-gl';
import type { WikiArticle } from '@/types';
import { getLocaleView } from '@/lib/locale';
import {
  MAP_STYLE_URL,
  selectionFillPaint,
  selectionLinePaint,
  articleDotsPaint,
  POPUP_OPTIONS,
  articlePopupHtml,
} from './mapStyles';

export interface GpxMapHandle {
  getSnapshot: () => Promise<string | null>;
}

interface GpxMapProps {
  trackPoints: [number, number][];
  bufferPolygon: [number, number][];
  interactive?: boolean;
  articles?: WikiArticle[];
  language?: string;
}

const DISPLAY_LAYERS = ['route-line', 'buffer-fill', 'buffer-line'] as const;

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

function routeGeoJSON(trackPoints: [number, number][]) {
  if (trackPoints.length < 2) {
    return { type: 'FeatureCollection' as const, features: [] };
  }
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'LineString' as const, coordinates: trackPoints },
      },
    ],
  };
}

function bufferGeoJSON(bufferPolygon: [number, number][]) {
  if (bufferPolygon.length < 3) {
    return { type: 'FeatureCollection' as const, features: [] };
  }
  const closed: [number, number][] = [...bufferPolygon, bufferPolygon[0]];
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [closed] },
      },
    ],
  };
}

const GpxMap = forwardRef<GpxMapHandle, GpxMapProps>(function GpxMap(
  { trackPoints, bufferPolygon, interactive = false, articles, language = 'de' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const initialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const trackPointsRef = useRef(trackPoints);
  const bufferPolygonRef = useRef(bufferPolygon);
  trackPointsRef.current = trackPoints;
  bufferPolygonRef.current = bufferPolygon;

  useImperativeHandle(ref, () => ({
    getSnapshot: async () => {
      const m = mapRef.current;
      if (!m) return null;
      const pts = trackPointsRef.current;
      if (pts.length < 2) return null;

      // Use buffer polygon bounds so the snapshot captures the full query area
      const poly = bufferPolygonRef.current;
      const sourcePts = poly.length >= 3 ? poly : pts;
      const lngs = sourcePts.map((p) => p[0]);
      const lats = sourcePts.map((p) => p[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];

      // Hide layers for clean background snapshot
      DISPLAY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'none'); } catch { /* layer may not exist */ } });

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
            DISPLAY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
            resolve(null); return;
          }
          ctx.drawImage(canvas, (W - S) / 2, (H - S) / 2, S, S, 0, 0, S, S);
          DISPLAY_LAYERS.forEach((id) => { try { m.setLayoutProperty(id, 'visibility', 'visible'); } catch { /* */ } });
          resolve(out.toDataURL('image/jpeg', 0.88));
        });
        m.fitBounds(bounds, { padding, maxZoom: 16, animate: false });
      });
    },
  }));

  // Init map
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

      if (interactive) {
        map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
      } else {
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        map.keyboard.disable();
      }

      map.on('load', () => {
        mapRef.current = map;

        // Buffer polygon — fill + dashed outline (same style as all other selection modes)
        map.addSource('buffer', {
          type: 'geojson',
          data: bufferGeoJSON(bufferPolygonRef.current),
        });

        map.addLayer({
          id: 'buffer-fill',
          type: 'fill',
          source: 'buffer',
          paint: selectionFillPaint,
        });

        map.addLayer({
          id: 'buffer-line',
          type: 'line',
          source: 'buffer',
          paint: selectionLinePaint,
        });

        // Route centerline
        map.addSource('route', {
          type: 'geojson',
          data: routeGeoJSON(trackPointsRef.current),
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#700700', 'line-width': 2.5 },
        });

        // Fit to buffer polygon bounds (or route as fallback)
        const pts = trackPointsRef.current;
        if (pts.length >= 2) {
          const poly = bufferPolygonRef.current;
          const fitPts = poly.length >= 3 ? poly : pts;
          const lngs = fitPts.map((p) => p[0]);
          const lats = fitPts.map((p) => p[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: 16, animate: false },
          );
        }

        // Article dots
        map.addSource('articles', { type: 'geojson', data: markersGeoJSON([]) });
        map.addLayer({
          id: 'article-dots',
          type: 'circle',
          source: 'articles',
          paint: articleDotsPaint,
        });

        if (!interactive) {
          map.on('mouseenter', 'article-dots', (e) => {
            const ev = e as any;
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
            const ev = e as any;
            const title = ev.features?.[0]?.properties?.title;
            if (title) window.open(`https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`, '_blank');
          });
        }

        setMapReady(true);
      });
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; initialized.current = false; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update buffer source reactively (no refit — user may be panning)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const bufferSrc = mapRef.current.getSource('buffer') as import('maplibre-gl').GeoJSONSource | undefined;
    if (bufferSrc) bufferSrc.setData(bufferGeoJSON(bufferPolygon));
  }, [bufferPolygon, mapReady]);

  // Update route source + refit when route changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const m = mapRef.current;
    const routeSrc = m.getSource('route') as import('maplibre-gl').GeoJSONSource | undefined;
    if (routeSrc) routeSrc.setData(routeGeoJSON(trackPoints));
    if (trackPoints.length >= 2) {
      const poly = bufferPolygonRef.current;
      const fitPts = poly.length >= 3 ? poly : trackPoints;
      const lngs = fitPts.map((p) => p[0]);
      const lats = fitPts.map((p) => p[1]);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 16, animate: false },
      );
    }
  }, [trackPoints, mapReady]);

  // Update article dots reactively
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const src = mapRef.current.getSource('articles') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!src) return;
    src.setData(markersGeoJSON(articles ?? []));
    if (articles && articles.length > 0 && trackPoints.length >= 2) {
      const poly = bufferPolygonRef.current;
      const fitPts = poly.length >= 3 ? poly : trackPoints;
      const lngs = fitPts.map((p) => p[0]);
      const lats = fitPts.map((p) => p[1]);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 24, animate: false },
      );
    }
  }, [articles, mapReady, trackPoints]);

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

export default GpxMap;
