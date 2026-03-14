'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import type { PointRadiusSelection, WikiArticle } from '@/types';
import { getLocaleView } from '@/lib/locale';
import {
  MAP_STYLE_URL,
  selectionFillPaint,
  selectionLinePaint,
  articleDotsPaint,
  POPUP_OPTIONS,
  articlePopupHtml,
} from './mapStyles';

export interface MapHandle {
  setRadius: (km: number, fitMap?: boolean) => void;
  flyTo: (center: [number, number]) => void;
  getSnapshot: () => Promise<string | null>;
}

interface PointRadiusMapProps {
  initialSelection?: PointRadiusSelection;
  onSelectionChange?: (sel: PointRadiusSelection) => void;
  interactive?: boolean;
  compact?: boolean;
  showCircle?: boolean; // default true; false = circle hidden until explicitly shown
  articles?: WikiArticle[];
  language?: string;
}

function circleGeoJSON(center: [number, number], radiusKm: number, steps = 80) {
  const [lng, lat] = center;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 111) * Math.cos(angle);
    const dLng = (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    pts.push([lng + dLng, lat + dLat]);
  }
  return {
    type: 'FeatureCollection' as const,
    features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [pts] }, properties: {} }],
  };
}

function markersGeoJSON(articles: WikiArticle[]) {
  return {
    type: 'FeatureCollection' as const,
    features: articles
      .filter((a) => a.coord)
      .map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: a.coord! },
        properties: { label: a.label || a.title, title: a.title },
      })),
  };
}

// Precise crosshair cursor for pixel-accurate map selection
const PIN_CURSOR = 'crosshair';

// Placed marker element
function createMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:32px;height:40px;cursor:grab;filter:drop-shadow(0 2px 6px rgba(112,7,7,0.35))';
  el.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='40' viewBox='0 0 32 40'>
    <path d='M16 0C7.16 0 0 7.16 0 16c0 11.7 16 24 16 24S32 27.7 32 16C32 7.16 24.84 0 16 0z' fill='#700700'/>
    <circle cx='16' cy='16' r='7.5' fill='#F5EDE0'/>
    <circle cx='16' cy='16' r='3.5' fill='#700700'/>
  </svg>`;
  return el;
}

type AnyMap = {
  on: ((event: string, cb: (e: unknown) => void) => void) & ((event: string, layerId: string, cb: (e: unknown) => void) => void);
  off: (event: string, cb: (e: unknown) => void) => void;
  addSource: (id: string, src: unknown) => void;
  addLayer: (layer: unknown) => void;
  addControl: (ctrl: unknown, pos: string) => void;
  getSource: (id: string) => { setData: (d: unknown) => void } | undefined;
  getCanvas: () => HTMLCanvasElement;
  fitBounds: (bounds: unknown, opts: unknown) => void;
  flyTo: (opts: unknown) => void;
  remove: () => void;
  setLayoutProperty: (layerId: string, name: string, value: unknown) => void;
};

const PointRadiusMap = forwardRef<MapHandle, PointRadiusMapProps>(function PointRadiusMap(
  { initialSelection, onSelectionChange, interactive = true, compact = false, showCircle = true, articles, language = 'de' },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMap | null>(null);
  const rawMapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const initialized = useRef(false);
  const hasMarker = useRef(false);
  const showCircleRef = useRef(showCircle);
  showCircleRef.current = showCircle; // always current in closures
  const selRef = useRef<PointRadiusSelection>(
    initialSelection ?? { type: 'point-radius', center: getLocaleView().center, radiusKm: 10 }
  );
  const [mapReady, setMapReady] = useState(false);

  const updateCircle = useCallback((center: [number, number], radiusKm: number) => {
    mapRef.current?.getSource('circle')?.setData(circleGeoJSON(center, radiusKm));
  }, []);

  useImperativeHandle(ref, () => ({
    setRadius(km: number, fitMap = true) {
      if (!mapRef.current || !mapReady) return;
      selRef.current = { ...selRef.current, radiusKm: km };
      updateCircle(selRef.current.center, km);
      if (fitMap && interactive) {
        const [lng, lat] = selRef.current.center;
        const pad = (km / 111) * 1.6;
        mapRef.current.fitBounds([[lng - pad, lat - pad], [lng + pad, lat + pad]], { padding: 80, duration: 600 });
      }
    },
    flyTo(center: [number, number]) {
      if (!mapRef.current || !mapReady) return;
      selRef.current = { ...selRef.current, center };
      updateCircle(center, selRef.current.radiusKm);
      markerRef.current?.setLngLat(center);
      mapRef.current.flyTo({ center, zoom: 10, duration: 800 });
    },
    getSnapshot(): Promise<string | null> {
      return new Promise((resolve) => {
        const map = rawMapRef.current;
        if (!map || !mapReady) { resolve(null); return; }
        const { center, radiusKm } = selRef.current;
        const [lng, lat] = center;
        const cosL = Math.cos(lat * Math.PI / 180);
        // Exact bbox: ±RKm in each direction (equirectangular → square in Mercator pixels)
        const dLat = radiusKm / 111;
        const dLng = dLat / cosL;
        // Hide circle overlay for a clean snapshot
        const m = mapRef.current;
        m?.setLayoutProperty('circle-fill', 'visibility', 'none');
        m?.setLayoutProperty('circle-line', 'visibility', 'none');
        map.fitBounds([[lng - dLng, lat - dLat], [lng + dLng, lat + dLat]], { padding: 0, duration: 0 });
        map.once('idle', () => {
          try {
            const src = map.getCanvas();
            // Center-crop to square — the bbox is square in Mercator pixels,
            // so the center min(W,H)×min(W,H) contains exactly our selection area.
            const size = Math.min(src.width, src.height);
            const off = document.createElement('canvas');
            off.width = size; off.height = size;
            const ctx = off.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(src, (src.width - size) / 2, (src.height - size) / 2, size, size, 0, 0, size, size);
            resolve(off.toDataURL('image/jpeg', 0.82));
          } catch { resolve(null); } finally {
            // Restore circle visibility
            if (showCircleRef.current) {
              m?.setLayoutProperty('circle-fill', 'visibility', 'visible');
              m?.setLayoutProperty('circle-line', 'visibility', 'visible');
            }
          }
        });
      });
    },
  }), [mapReady, interactive, updateCircle]);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const sel = selRef.current;
    let m: AnyMap | null = null;

    import('maplibre-gl').then(({ Map, NavigationControl, Marker, Popup }) => {
      if (!containerRef.current || !initialized.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: sel.center,
        zoom: compact ? 8 : getLocaleView().zoom,
        interactive,
        attributionControl: compact ? false : undefined,
        preserveDrawingBuffer: true,
      } as any);

      rawMapRef.current = map;
      m = map as unknown as AnyMap;
      mapRef.current = m;

      // Create pin marker (not added to map until first click)
      const mk = new Marker({ element: createMarkerEl(), anchor: 'bottom' });
      markerRef.current = mk;

      // On compact/non-interactive maps, add the marker immediately at initial position
      if (!interactive) {
        mk.setLngLat(sel.center).addTo(map);
        hasMarker.current = true;
      }


      m.on('load', () => {
        if (!m) return;

        // Circle layers – visibility controlled by showCircle prop
        const circleVisibility = showCircleRef.current ? 'visible' : 'none';
        m.addSource('circle', { type: 'geojson', data: circleGeoJSON(sel.center, sel.radiusKm) });
        m.addLayer({ id: 'circle-fill', type: 'fill', source: 'circle', layout: { visibility: circleVisibility }, paint: selectionFillPaint });
        m.addLayer({ id: 'circle-line', type: 'line', source: 'circle', layout: { visibility: circleVisibility }, paint: selectionLinePaint });

        // Article markers
        if (articles && articles.length > 0 && !m.getSource('articles')) {
          m.addSource('articles', { type: 'geojson', data: markersGeoJSON(articles) });
          m.addLayer({ id: 'article-dots', type: 'circle', source: 'articles', paint: articleDotsPaint });
        }

        if (!interactive) {
          const [lng, lat] = sel.center;
          const latDeg = sel.radiusKm / 111;
          const lngDeg = sel.radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
          m.fitBounds([[lng - lngDeg, lat - latDeg], [lng + lngDeg, lat + latDeg]], { padding: 24, animate: false });
        }

        if (interactive) {
          m.addControl(new NavigationControl({ showCompass: false }), 'top-right');

          // Custom pin cursor
          m.getCanvas().style.cursor = PIN_CURSOR;

          // Click → place/move marker + update circle
          m.on('click', (e) => {
            const ev = e as { lngLat: { lng: number; lat: number }; defaultPrevented?: boolean };
            const newCenter: [number, number] = [ev.lngLat.lng, ev.lngLat.lat];
            selRef.current = { ...selRef.current, center: newCenter };
            updateCircle(newCenter, selRef.current.radiusKm);
            onSelectionChange?.(selRef.current);

            // Place / move the pin marker
            if (rawMapRef.current) {
              mk.setLngLat(newCenter);
              if (!hasMarker.current) {
                mk.addTo(rawMapRef.current);
                hasMarker.current = true;
              }
            }

            // Restore cursor (might have been overridden by article-dots hover)
            m!.getCanvas().style.cursor = PIN_CURSOR;
          });

          m.on('touchend', (e) => {
            const ev = e as { lngLat: { lng: number; lat: number } };
            const newCenter: [number, number] = [ev.lngLat.lng, ev.lngLat.lat];
            selRef.current = { ...selRef.current, center: newCenter };
            updateCircle(newCenter, selRef.current.radiusKm);
            onSelectionChange?.(selRef.current);
            if (rawMapRef.current) {
              mk.setLngLat(newCenter);
              if (!hasMarker.current) {
                mk.addTo(rawMapRef.current);
                hasMarker.current = true;
              }
            }
          });
        }

        // Article dot hover popup (works in both interactive and non-interactive mode)
        if (articles && articles.length > 0) {
          m.on('mouseenter', 'article-dots', (e) => {
            const ev = e as { features: Array<{ properties: { label: string; title: string }; geometry: { coordinates: [number, number] } }> };
            m!.getCanvas().style.cursor = 'pointer';

            const props = ev.features?.[0]?.properties;
            const coords = ev.features?.[0]?.geometry.coordinates as [number, number];
            if (!props || !coords) return;

            const wikiUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(props.title)}`;

            popupRef.current?.remove();
            popupRef.current = new Popup(POPUP_OPTIONS)
              .setLngLat(coords)
              .setHTML(articlePopupHtml(props.label, wikiUrl))
              .addTo(rawMapRef.current!);
          });

          m.on('mouseleave', 'article-dots', () => {
            m!.getCanvas().style.cursor = interactive ? PIN_CURSOR : '';
            popupRef.current?.remove();
            popupRef.current = null;
          });

          // Click on article dot → open Wikipedia
          m.on('click', 'article-dots', (e) => {
            const ev = e as { features: Array<{ properties: { label: string; title: string } }> };
            const props = ev.features?.[0]?.properties;
            if (props) {
              window.open(`https://${language}.wikipedia.org/wiki/${encodeURIComponent(props.title)}`, '_blank', 'noopener,noreferrer');
            }
          });
        }

        setMapReady(true);
      });
    });

    return () => {
      initialized.current = false;
      hasMarker.current = false;
      markerRef.current?.remove();
      popupRef.current?.remove();
      m?.remove();
      mapRef.current = null;
      rawMapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle circle visibility when showCircle prop changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const visibility = showCircle ? 'visible' : 'none';
    mapRef.current.setLayoutProperty('circle-fill', 'visibility', visibility);
    mapRef.current.setLayoutProperty('circle-line', 'visibility', visibility);
    if (showCircle) {
      // Ensure data is current when becoming visible
      updateCircle(selRef.current.center, selRef.current.radiusKm);
    }
  }, [showCircle, mapReady, updateCircle]);

  // Update article markers when prop changes (for results screen re-queries)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !articles) return;
    const src = mapRef.current.getSource('articles');
    if (src) {
      src.setData(markersGeoJSON(articles));
    } else if (articles.length > 0 && rawMapRef.current) {
      // Source doesn't exist yet → add it
      (mapRef.current as AnyMap).addSource('articles', { type: 'geojson', data: markersGeoJSON(articles) });
      (mapRef.current as AnyMap).addLayer({ id: 'article-dots', type: 'circle', source: 'articles', paint: articleDotsPaint });
    }
    // Re-fit to selection after articles update so zoom stays consistent with config view
    if (!interactive) {
      const { center, radiusKm } = selRef.current;
      const [lng, lat] = center;
      const latDeg = radiusKm / 111;
      const lngDeg = latDeg / Math.cos((lat * Math.PI) / 180);
      mapRef.current.fitBounds([[lng - lngDeg, lat - latDeg], [lng + lngDeg, lat + latDeg]], { padding: 24, animate: false });
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

export default PointRadiusMap;
