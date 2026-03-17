'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MAP_STYLE_URL, MAP_COLORS } from '@/components/map/mapStyles';
import { getLocaleView } from '@/lib/locale';
import Button from '@/components/ui/Button';
import { useT } from '@/i18n';

interface DrawRouteOverlayProps {
  onConfirm: (points: [number, number][]) => void;
  onBack: () => void;
}

function buildGeoJSON(pts: [number, number][], preview: [number, number] | null) {
  const features: GeoJSON.Feature[] = [];
  if (pts.length === 0) return { type: 'FeatureCollection' as const, features };

  // Confirmed path (solid line)
  if (pts.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { kind: 'line' },
      geometry: { type: 'LineString', coordinates: pts },
    });
  }

  // Dashed preview segment from last point to cursor
  if (pts.length >= 1 && preview) {
    features.push({
      type: 'Feature',
      properties: { kind: 'preview' },
      geometry: { type: 'LineString', coordinates: [pts[pts.length - 1], preview] },
    });
  }

  // Non-first vertex dots
  if (pts.length > 1) {
    features.push({
      type: 'Feature',
      properties: { kind: 'vertices' },
      geometry: { type: 'MultiPoint', coordinates: pts.slice(1) },
    });
  }

  // First vertex (accented)
  features.push({
    type: 'Feature',
    properties: { kind: 'first' },
    geometry: { type: 'Point', coordinates: pts[0] },
  });

  return { type: 'FeatureCollection' as const, features };
}

export default function DrawRouteOverlay({ onConfirm, onBack }: DrawRouteOverlayProps) {
  const t = useT();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const initialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const pointsRef = useRef<[number, number][]>([]);
  const previewRef = useRef<[number, number] | null>(null);
  const historyRef = useRef<[number, number][][]>([]);
  const redoStackRef = useRef<[number, number][][]>([]);

  const [pointCount, setPointCount] = useState(0);
  const [canRedo, setCanRedo] = useState(false);

  const pushUpdate = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const src = m.getSource('draw-route') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!src) return;
    src.setData(buildGeoJSON(pointsRef.current, previewRef.current));
    setPointCount(pointsRef.current.length);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  useEffect(() => {
    if (initialized.current || !mapContainerRef.current) return;
    initialized.current = true;

    let m: import('maplibre-gl').Map | null = null;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (!initialized.current || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: getLocaleView().center,
        zoom: getLocaleView().zoom,
        attributionControl: false,
      });

      m = map;
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        map.addSource('draw-route', {
          type: 'geojson',
          data: buildGeoJSON([], null),
        });

        map.addLayer({
          id: 'draw-line',
          type: 'line',
          source: 'draw-route',
          filter: ['==', ['get', 'kind'], 'line'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': MAP_COLORS.selection, 'line-width': 2.5 },
        });

        map.addLayer({
          id: 'draw-preview',
          type: 'line',
          source: 'draw-route',
          filter: ['==', ['get', 'kind'], 'preview'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': MAP_COLORS.selection,
            'line-width': 2,
            'line-dasharray': [3, 3],
            'line-opacity': 0.45,
          },
        });

        map.addLayer({
          id: 'draw-vertices',
          type: 'circle',
          source: 'draw-route',
          filter: ['==', ['get', 'kind'], 'vertices'],
          paint: {
            'circle-radius': 5,
            'circle-color': MAP_COLORS.vertexFill,
            'circle-stroke-color': MAP_COLORS.selection,
            'circle-stroke-width': 2,
          },
        });

        map.addLayer({
          id: 'draw-first',
          type: 'circle',
          source: 'draw-route',
          filter: ['==', ['get', 'kind'], 'first'],
          paint: {
            'circle-radius': 7,
            'circle-color': MAP_COLORS.selection,
            'circle-stroke-color': MAP_COLORS.vertexFill,
            'circle-stroke-width': 2.5,
          },
        });

        map.getCanvas().style.cursor = 'crosshair';

        map.on('mousemove', (e) => {
          if (pointsRef.current.length === 0) return;
          previewRef.current = [e.lngLat.lng, e.lngLat.lat];
          pushUpdate();
        });

        map.on('click', (e) => {
          historyRef.current.push([...pointsRef.current]);
          redoStackRef.current = [];
          pointsRef.current = [...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]];
          previewRef.current = null;
          pushUpdate();
        });

        map.on('mouseleave', () => {
          previewRef.current = null;
          pushUpdate();
        });

        setMapReady(true);
      });
    });

    return () => {
      initialized.current = false;
      m?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    redoStackRef.current.push([...pointsRef.current]);
    pointsRef.current = historyRef.current.pop()!;
    previewRef.current = null;
    pushUpdate();
  }, [pushUpdate]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    historyRef.current.push([...pointsRef.current]);
    pointsRef.current = redoStackRef.current.pop()!;
    previewRef.current = null;
    pushUpdate();
  }, [pushUpdate]);

  const handleReset = useCallback(() => {
    historyRef.current = [];
    redoStackRef.current = [];
    pointsRef.current = [];
    previewRef.current = null;
    pushUpdate();
  }, [pushUpdate]);

  const handleConfirm = useCallback(() => {
    if (pointsRef.current.length < 2) return;
    onConfirm([...pointsRef.current]);
  }, [onConfirm]);

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) { e.preventDefault(); handleRedo(); }
        else { e.preventDefault(); handleUndo(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const canUndo = pointCount > 0;
  const canConfirm = pointCount >= 2;
  const dr = t.gpxOverlay.drawRoute;

  const hint = pointCount === 0
    ? dr.hint.empty
    : dr.hint.drawing(pointCount);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-[#EDE0CE]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Map + loading indicator */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />
        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#EDE0CE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'map-spin 1s linear infinite' }}>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#c4a882" strokeWidth="3" />
              <path d="M18 4 A14 14 0 0 1 32 18" fill="none" stroke="#700700" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes map-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-2 p-3 pr-14 md:p-4 md:pr-4">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882] text-[#700700] hover:bg-[#EDE0CE] active:scale-95 transition-all touch-manipulation"
          aria-label={dr.backAriaLabel}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Instruction hint ─────────────────────────────── */}
      <div className="relative z-10 flex justify-center pointer-events-none px-3">
        <div className="bg-[#700700] text-[#F5EDE0] rounded-full px-4 py-1.5 text-xs font-medium shadow-md whitespace-nowrap">
          {hint}
        </div>
      </div>

      {/* ── Bottom control bar ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 md:p-5">
        <motion.div
          className="bg-[#F9F3EA]/96 backdrop-blur-sm border border-[#c4a882] rounded-2xl shadow-xl overflow-hidden"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            {/* Undo / Redo / Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#c4a882] bg-[#EDE0CE] text-[#700700] text-sm font-medium hover:bg-[#d8cdb8] active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7a5 5 0 1 0 1.2-3.2M2 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {dr.undo}
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#c4a882] bg-[#EDE0CE] text-[#700700] text-sm font-medium hover:bg-[#d8cdb8] active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12 7a5 5 0 1 1-1.2-3.2M12 3v4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {dr.redo}
              </button>
              <button
                onClick={handleReset}
                disabled={!canUndo}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#c4a882] bg-[#EDE0CE] text-[#700700] text-sm font-medium hover:bg-[#d8cdb8] active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {dr.reset}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-[#c4a882]/40 mx-1" />

            {/* Status label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#700700]/55 truncate">
                {canConfirm ? (
                  <span className="font-medium text-[#700700]">{dr.statusReady(pointCount)}</span>
                ) : (
                  <span>{dr.statusEmpty}</span>
                )}
              </p>
            </div>

            {/* Confirm */}
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              size="md"
              className="flex-shrink-0 w-full sm:w-auto"
            >
              {dr.ctaConfirm}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
