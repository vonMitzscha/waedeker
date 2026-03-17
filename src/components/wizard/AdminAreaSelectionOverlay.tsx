'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminAreaSelection } from '@/types';
import Button from '@/components/ui/Button';
import { searchAdminAreas, type AdminAreaResult } from '@/lib/geocoder';
import { MAP_STYLE_URL, selectionFillPaint, selectionLinePaint } from '@/components/map/mapStyles';
import { getLocaleView } from '@/lib/locale';
import { useT } from '@/i18n';

type AnyMap = {
  on: (event: string, cb: () => void) => void;
  addSource: (id: string, src: unknown) => void;
  addLayer: (layer: unknown) => void;
  addControl: (ctrl: unknown, pos: string) => void;
  getSource: (id: string) => { setData: (d: unknown) => void } | undefined;
  fitBounds: (bounds: [[number, number], [number, number]], opts?: object) => void;
  remove: () => void;
};

interface AdminAreaSelectionOverlayProps {
  onConfirm: (selection: AdminAreaSelection, snapshot?: string) => void;
  onBack: () => void;
}

export default function AdminAreaSelectionOverlay({ onConfirm, onBack }: AdminAreaSelectionOverlayProps) {
  const t = useT();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMap | null>(null);
  const rawMapRef = useRef<import('maplibre-gl').Map | null>(null);
  const initialized = useRef(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selection, setSelection] = useState<AdminAreaSelection | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminAreaResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (initialized.current || !mapContainerRef.current) return;
    initialized.current = true;

    let m: AnyMap | null = null;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (!initialized.current || !mapContainerRef.current) return;

      const rawMap = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: getLocaleView().center,
        zoom: getLocaleView().zoom,
        attributionControl: false,
      });

      const map = rawMap as unknown as AnyMap;
      m = map;
      mapRef.current = map;
      rawMapRef.current = rawMap;

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        map.addSource('admin-polygon', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'admin-fill',
          type: 'fill',
          source: 'admin-polygon',
          paint: selectionFillPaint,
        });
        map.addLayer({
          id: 'admin-line',
          type: 'line',
          source: 'admin-polygon',
          paint: selectionLinePaint,
        });
        setMapReady(true);
      });
    });

    return () => {
      initialized.current = false;
      m?.remove();
      mapRef.current = null;
      rawMapRef.current = null;
      setMapReady(false);
    };
  }, []);

  const updatePolygon = useCallback((geojson: object, bbox: [number, number, number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    // Source is only added after 'load' fires — skip silently if not yet ready
    const src = map.getSource('admin-polygon');
    if (!src) return;
    src.setData({
      type: 'Feature',
      properties: {},
      geometry: geojson,
    });
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, duration: 800 });
  }, []);

  const handleSelectResult = useCallback((r: AdminAreaResult) => {
    const newSel: AdminAreaSelection = {
      type: 'admin-area',
      polygon: r.polygon,
      bbox: r.bbox,
      label: r.shortName,
    };
    setSelection(newSel);
    setQuery(r.shortName);
    setShowResults(false);
    setResults([]);
    updatePolygon(r.geojson, r.bbox);
  }, [updatePolygon]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 3) { setResults([]); setShowResults(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchAdminAreas(q);
      setResults(res);
      setShowResults(res.length > 0);
      setSearching(false);
    }, 400);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selection) return;
    let snapshot: string | undefined;
    const rawMap = rawMapRef.current;
    if (rawMap && mapReady) {
      await new Promise<void>((resolve) => {
        const [minLng, minLat, maxLng, maxLat] = selection.bbox;
        rawMap.setLayoutProperty('admin-fill', 'visibility', 'none');
        rawMap.setLayoutProperty('admin-line', 'visibility', 'none');
        const canvas = rawMap.getCanvas();
        const W = canvas.width, H = canvas.height;
        const S = Math.min(W, H);
        const padding = Math.round(S * (300 - 280 / 1.15) / 600);
        rawMap.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding, duration: 0 });
        rawMap.once('idle', () => {
          try {
            const out = document.createElement('canvas');
            out.width = S; out.height = S;
            const ctx = out.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, (W - S) / 2, (H - S) / 2, S, S, 0, 0, S, S);
              snapshot = out.toDataURL('image/jpeg', 0.88);
            }
          } catch { /* ignore */ }
          resolve();
        });
      });
    }
    onConfirm(selection, snapshot);
  }, [selection, mapReady, onConfirm]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#EDE0CE]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Map + loading indicator — wrapped together so controls (z-10) always sit on top */}
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

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-2 p-3 pr-14 md:p-4 md:pr-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882] text-[#700700] hover:bg-[#EDE0CE] active:scale-95 transition-all touch-manipulation"
          aria-label={t.adminAreaOverlay.backAriaLabel}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Search bar */}
        <div className="relative flex-1 md:max-w-sm">
          <div className="flex items-center gap-2 bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882] rounded-xl px-3 py-2">
            {searching ? (
              <svg className="w-4 h-4 text-[#700700]/40 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-[#700700]/40 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder={t.adminAreaOverlay.searchPlaceholder}
              className="flex-1 bg-transparent text-[#700700] placeholder-[#700700]/35 text-sm outline-none min-w-0"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setShowResults(false); setSelection(null); }}
                className="text-[#700700]/30 hover:text-[#700700] flex-shrink-0"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1.5 left-0 right-0 bg-[#F9F3EA]/98 backdrop-blur-sm border border-[#c4a882] rounded-xl overflow-hidden shadow-xl z-20"
              >
                {results.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#700700]/50">{t.adminAreaOverlay.noResults}</div>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectResult(r)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#700700] hover:bg-[#EDE0CE] active:bg-[#d8cdb8] transition-colors border-b border-[#c4a882]/20 last:border-0 touch-manipulation"
                    >
                      <div className="font-medium truncate">{r.shortName}</div>
                      <div className="text-[#700700]/45 text-xs truncate mt-0.5">
                        {r.label.split(',').slice(1, 4).join(',').trim()}
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Instruction hint ────────────────────────────── */}
      <div className="relative z-10 flex justify-center pointer-events-none px-3">
        <div className="bg-[#700700] text-[#F5EDE0] rounded-full px-4 py-1.5 text-xs font-medium shadow-md whitespace-nowrap">
          {t.adminAreaOverlay.hint}
        </div>
      </div>

      {/* ── Bottom control bar ────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 md:p-5">
        <motion.div
          className="bg-[#F9F3EA]/96 backdrop-blur-sm border border-[#c4a882] rounded-2xl shadow-xl overflow-hidden"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            {/* Selected area label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#700700]/55 truncate">
                {selection?.label ? (
                  <span className="font-medium text-[#700700]">{selection.label}</span>
                ) : (
                  t.adminAreaOverlay.noSelectionHint
                )}
              </p>
            </div>

            {/* Confirm */}
            <Button
              onClick={handleConfirm}
              disabled={!selection}
              size="md"
              className="flex-shrink-0 w-full sm:w-auto"
            >
              {t.adminAreaOverlay.ctaConfirm}
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
