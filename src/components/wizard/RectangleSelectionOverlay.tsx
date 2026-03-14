'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RectangleSelection } from '@/types';
import RectangleMap, { type RectangleMapHandle } from '@/components/map/RectangleMap';
import Button from '@/components/ui/Button';
import { geocodeAddress, type GeocoderResult } from '@/lib/geocoder';
import { useT } from '@/i18n';

interface RectangleSelectionOverlayProps {
  onConfirm: (selection: RectangleSelection, mapSnapshot?: string) => void;
  onBack: () => void;
}

export default function RectangleSelectionOverlay({ onConfirm, onBack }: RectangleSelectionOverlayProps) {
  const t = useT();
  const mapRef = useRef<RectangleMapHandle>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sw, setSw] = useState<[number, number] | null>(null);
  const [ne, setNe] = useState<[number, number] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocoderResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleChange = useCallback((
    newSw: [number, number] | null,
    newNe: [number, number] | null,
    isConfirmed: boolean,
  ) => {
    setSw(newSw);
    setNe(newNe);
    setConfirmed(isConfirmed);
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 3) { setResults([]); setShowResults(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const res = await geocodeAddress(q);
      setResults(res);
      setShowResults(res.length > 0);
      setSearching(false);
    }, 400);
  }, []);

  const handleSelectResult = (r: GeocoderResult) => {
    setQuery(r.label.split(',')[0].trim());
    setShowResults(false);
    setResults([]);
    mapRef.current?.flyTo([r.lng, r.lat]);
  };

  const handleReset = () => {
    mapRef.current?.reset();
    setSw(null);
    setNe(null);
    setConfirmed(false);
  };

  const handleConfirm = async () => {
    if (!confirmed || !sw || !ne) return;
    const snap = await mapRef.current?.getSnapshot();
    const selection: RectangleSelection = {
      type: 'rectangle',
      sw,
      ne,
    };
    onConfirm(selection, snap ?? undefined);
  };

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  }, []);

  const canConfirm = confirmed && sw !== null && ne !== null;
  const canReset = sw !== null || confirmed;

  const hint = confirmed
    ? t.rectangleOverlay.hint.confirmed
    : sw === null
    ? t.rectangleOverlay.hint.firstCorner
    : t.rectangleOverlay.hint.secondCorner;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#EDE0CE]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Map — full screen */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <RectangleMap ref={mapRef} interactive onChange={handleChange} />
      </div>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-2 p-3 pr-14 md:p-4 md:pr-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882] text-[#700700] hover:bg-[#EDE0CE] active:scale-95 transition-all touch-manipulation"
          aria-label={t.rectangleOverlay.backAriaLabel}
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
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder={t.rectangleOverlay.searchPlaceholder}
              className="flex-1 bg-transparent text-[#700700] placeholder-[#700700]/35 text-sm outline-none min-w-0"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
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
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectResult(r)}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#700700] hover:bg-[#EDE0CE] active:bg-[#d8cdb8] transition-colors border-b border-[#c4a882]/20 last:border-0 touch-manipulation"
                  >
                    <div className="font-medium truncate">{r.label.split(',')[0]}</div>
                    <div className="text-[#700700]/45 text-xs truncate mt-0.5">
                      {r.label.split(',').slice(1, 3).join(',').trim()}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Instruction hint ─────────────────────────────── */}
      <div className="relative z-10 flex justify-center pointer-events-none px-3">
        <div className="bg-[#700700] text-[#F5EDE0] rounded-full px-4 py-1.5 text-xs font-medium shadow-md whitespace-nowrap">
          {hint}
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
            {/* Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={!canReset}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#c4a882] bg-[#EDE0CE] text-[#700700] text-sm font-medium hover:bg-[#d8cdb8] active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {t.rectangleOverlay.reset}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-[#c4a882]/40 mx-1" />

            {/* Status label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#700700]/55 truncate">
                {confirmed ? (
                  <span className="font-medium text-[#6B8F3E]">{t.rectangleOverlay.statusReady}</span>
                ) : sw !== null ? (
                  <span>{t.rectangleOverlay.statusFirstCorner}</span>
                ) : (
                  <span>{t.rectangleOverlay.statusEmpty}</span>
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
              {t.rectangleOverlay.ctaConfirm}
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
