'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { RouteSelection } from '@/types';
import GpxMap, { type GpxMapHandle } from '@/components/map/GpxMap';
import Button from '@/components/ui/Button';
import { parseGpx, subsamplePoints, routeLengthKm, computeBufferPolygon, fetchOsrmRoute } from '@/lib/gpx';
import { geocodeAddress } from '@/lib/geocoder';
import RadiusInput from '@/components/map/RadiusInput';
import { useT } from '@/i18n';

interface Props {
  onConfirm: (selection: RouteSelection, snapshot?: string) => void;
  onBack: () => void;
  initialBufferKm?: number;
  initialMapLink?: string;
  initialProvider?: 'google' | 'apple';
  /** Skip the upload UI and auto-confirm once the route finishes loading */
  autoConfirm?: boolean;
}

type RouteState = 'idle' | 'loading' | 'ready' | 'error';
type Provider = 'google' | 'apple' | 'mapy';

export default function GpxSelectionOverlay({ onConfirm, onBack, initialBufferKm, initialMapLink, initialProvider, autoConfirm }: Props) {
  const t = useT();
  const mapRef = useRef<GpxMapHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [bufferKm, setBufferKm] = useState(initialBufferKm ?? 0.5);
  const [bufferPolygon, setBufferPolygon] = useState<[number, number][]>([]);
  const [routeState, setRouteState] = useState<RouteState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [filename, setFilename] = useState('');
  const [lengthKm, setLengthKm] = useState(0);

  const [activeProvider, setActiveProvider] = useState<Provider>(initialProvider ?? 'google');
  const [googleLink, setGoogleLink] = useState(initialProvider === 'google' ? (initialMapLink ?? '') : '');
  const [appleLink, setAppleLink] = useState(initialProvider === 'apple' ? (initialMapLink ?? '') : '');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [sourceLink, setSourceLink] = useState<string | undefined>(undefined);
  const [sourcePlatform, setSourcePlatform] = useState<'google' | 'apple' | undefined>(undefined);

  const [isDragOver, setIsDragOver] = useState(false);

  // Recompute buffer polygon when trackPoints or bufferKm changes
  useEffect(() => {
    if (trackPoints.length >= 2) {
      setBufferPolygon(computeBufferPolygon(trackPoints, bufferKm));
    } else {
      setBufferPolygon([]);
    }
  }, [trackPoints, bufferKm]);

  const handleFile = useCallback(async (file: File) => {
    setRouteState('loading');
    setErrorMsg('');
    setLinkError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGpx(text);
        if (parsed.length < 2) {
          setRouteState('error');
          setErrorMsg(t.gpxOverlay.errors.noWaypoints);
          return;
        }
        const pts = subsamplePoints(parsed, 500);
        const km = routeLengthKm(pts);
        setBufferPolygon(computeBufferPolygon(pts, bufferKm));
        setTrackPoints(pts);
        setFilename(file.name);
        setLengthKm(km);
        setRouteState('ready');
      } catch {
        setRouteState('error');
        setErrorMsg(t.gpxOverlay.errors.parseError);
      }
    };
    reader.onerror = () => {
      setRouteState('error');
      setErrorMsg(t.gpxOverlay.errors.readError);
    };
    reader.readAsText(file);
  }, [bufferKm]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  /** Expand a potentially shortened URL via our API route */
  async function expandUrl(url: string): Promise<string> {
    try {
      const res = await fetch(`/api/expand-url?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      return data.expanded ?? url;
    } catch {
      return url;
    }
  }

  /**
   * Extract waypoints from Google Maps `data` parameter.
   * Google encodes waypoints as !1d[lng]!2d[lat] pairs (protobuf-style text encoding).
   * Based on the gmaps-gpx approach (github.com/mcilvena/gmaps-gpx).
   */
  function parseGoogleMapsDataParam(url: string): [number, number][] {
    const dataMatch = url.match(/[?&/]data=([^?&#\s]+)/);
    if (!dataMatch) return [];
    const dataStr = decodeURIComponent(dataMatch[1]);
    const results: [number, number][] = [];
    const re = /!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/g;
    let m;
    while ((m = re.exec(dataStr)) !== null) {
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if ((lat !== 0 || lng !== 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        results.push([lng, lat]);
      }
    }
    return results;
  }

  const handleGoogleLink = async () => {
    if (!googleLink.trim()) return;
    setLinkLoading(true);
    setLinkError('');
    try {
      const raw = googleLink.trim();
      // Only resolve shortened URLs — passing a full URL through expandUrl risks Google
      // redirecting to a consent/stripped URL that loses the data parameter and travel mode.
      const isShortened = raw.includes('goo.gl') || raw.includes('maps.app');
      const expanded = isShortened ? await expandUrl(raw) : raw;

      // Method 1: extract waypoints from data parameter (works for all shared Google Maps links)
      let waypoints: [number, number][] = parseGoogleMapsDataParam(expanded);

      // Method 2: fall back to /dir/ path parsing + geocoding for named locations
      if (waypoints.length < 2) {
        const dirMatch = expanded.match(/\/maps\/dir\/([^@?#]+)/);
        if (dirMatch) {
          const segments = dirMatch[1].split('/').filter(Boolean);
          const geocoded: [number, number][] = [];
          for (const seg of segments) {
            const decoded = decodeURIComponent(seg);
            const coordMatch = decoded.match(/^([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)$/);
            if (coordMatch) {
              geocoded.push([parseFloat(coordMatch[2]), parseFloat(coordMatch[1])]);
            } else if (decoded.length > 0) {
              const results = await geocodeAddress(decoded);
              if (results.length > 0) geocoded.push([results[0].lng, results[0].lat]);
            }
          }
          waypoints = geocoded;
        }
      }

      if (waypoints.length < 2) {
        setLinkError(t.gpxOverlay.errors.linkExtractError);
        setLinkLoading(false);
        return;
      }

      // Detect travel mode: check travelmode= query param first, then !3eN in data parameter
      // !3e0=driving, !3e1=cycling, !3e2=walking, !3e3=transit
      let profile: 'driving' | 'walking' | 'cycling' = 'driving';
      try {
        const travelMode = new URL(expanded).searchParams.get('travelmode') ?? '';
        if (travelMode === 'walking') profile = 'walking';
        else if (travelMode === 'bicycling') profile = 'cycling';
      } catch { /* keep default */ }
      if (profile === 'driving') {
        const modeMatch = expanded.match(/!3e(\d)/);
        if (modeMatch) {
          if (modeMatch[1] === '2') profile = 'walking';
          else if (modeMatch[1] === '1') profile = 'cycling';
        }
      }

      const pts = await fetchOsrmRoute(waypoints, profile);
      const subsampled = subsamplePoints(pts, 500);
      const km = routeLengthKm(subsampled);
      setBufferPolygon(computeBufferPolygon(subsampled, bufferKm));
      setTrackPoints(subsampled);
      setFilename('google-maps-route.gpx');
      setLengthKm(km);
      setRouteState('ready');
      setSourceLink(raw);
      setSourcePlatform('google');
    } catch (err) {
      setLinkError(String(err));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleAppleLink = async () => {
    if (!appleLink.trim()) return;
    const originalAppleLink = appleLink.trim();
    setLinkLoading(true);
    setLinkError('');
    try {
      const expanded = await expandUrl(originalAppleLink);
      const url = new URL(expanded);
      const params = url.searchParams;

      const sourceStr = params.get('source') ?? params.get('saddr') ?? '';
      const destStr = params.get('destination') ?? params.get('daddr') ?? '';
      const modeStr = params.get('mode') ?? params.get('dirflg') ?? '';

      let profile: 'driving' | 'walking' | 'cycling' = 'driving';
      if (modeStr.includes('w') || modeStr === 'walking') profile = 'walking';
      else if (modeStr.includes('b') || modeStr === 'cycling') profile = 'cycling';

      const geocodePoint = async (str: string): Promise<[number, number] | null> => {
        const coordMatch = str.match(/^([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)$/);
        if (coordMatch) return [parseFloat(coordMatch[2]), parseFloat(coordMatch[1])];
        if (str.length === 0) return null;
        const results = await geocodeAddress(str);
        return results.length > 0 ? [results[0].lng, results[0].lat] : null;
      };

      // Collect all stops in order: source → waypoints[] → destination
      const waypointStrs = params.getAll('waypoint');
      const allCoords: [number, number][] = [];
      for (const str of [sourceStr, ...waypointStrs, destStr]) {
        if (!str) continue;
        const coord = await geocodePoint(str);
        if (coord) allCoords.push(coord);
      }

      // Handle place URLs (maps.apple.com/place?coordinate=lat,lng) — single point, no route
      if (allCoords.length === 0) {
        const coordParam = params.get('coordinate') ?? '';
        if (coordParam.match(/^-?\d+\.?\d*,-?\d+\.?\d*$/)) {
          setLinkError(t.gpxOverlay.errors.singleLocationError);
        } else {
          setLinkError(t.gpxOverlay.errors.startDestNotFound);
        }
        setLinkLoading(false);
        return;
      }

      if (allCoords.length < 2) {
        setLinkError(t.gpxOverlay.errors.oneWaypointOnly);
        setLinkLoading(false);
        return;
      }

      const pts = await fetchOsrmRoute(allCoords, profile);
      const subsampled = subsamplePoints(pts, 500);
      const km = routeLengthKm(subsampled);
      setBufferPolygon(computeBufferPolygon(subsampled, bufferKm));
      setTrackPoints(subsampled);
      setFilename('apple-maps-route.gpx');
      setLengthKm(km);
      setRouteState('ready');
      setSourceLink(originalAppleLink);
      setSourcePlatform('apple');
    } catch (err) {
      setLinkError(String(err));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (routeState !== 'ready' || trackPoints.length < 2) return;
    const snap = await mapRef.current?.getSnapshot();
    const poly = computeBufferPolygon(trackPoints, bufferKm);
    const selection: RouteSelection = {
      type: 'route',
      trackPoints,
      bufferKm,
      polygon: poly,
      filename,
      lengthKm,
      sourceLink,
      sourcePlatform,
    };
    onConfirm(selection, snap ?? undefined);
  };

  // Auto-trigger link loading when arriving from a share URL with a maps link
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (!initialMapLink || autoTriggered.current) return;
    autoTriggered.current = true;
    if (initialProvider === 'apple') {
      handleAppleLink();
    } else {
      handleGoogleLink();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-confirm: fire handleConfirm as soon as the route is ready
  useEffect(() => {
    if (autoConfirm && routeState === 'ready') {
      handleConfirm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeState, autoConfirm]);

  // When auto-confirming from a share URL, skip the full UI
  if (autoConfirm) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#F5EDE0]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        {routeState === 'error' ? (
          <p className="text-sm text-red-600 text-center px-6">{errorMsg || linkError}</p>
        ) : (
          <>
            <svg className="w-8 h-8 animate-spin text-[#700700]/40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
            </svg>
            <p className="text-sm text-[#700700]/55">{t.gpxOverlay.loadingRoute}</p>
          </>
        )}
      </motion.div>
    );
  }

  const providerTabs: { id: Provider; label: string }[] = [
    { id: 'google', label: 'Google Maps' },
    { id: 'apple', label: 'Apple Maps' },
    { id: 'mapy', label: 'Mapy.cz / OSM' },
  ];

  const showDropzone = routeState === 'idle' || routeState === 'error';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Left: Map ── */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#EDE0CE]">
        <div style={{ position: 'absolute', inset: 0 }}>
          <GpxMap
            ref={mapRef}
            trackPoints={trackPoints}
            bufferPolygon={bufferPolygon}
            interactive
          />
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-5 left-5 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882] text-[#700700] hover:bg-[#EDE0CE] active:scale-95 transition-all touch-manipulation"
          aria-label={t.gpxOverlay.backAriaLabel}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Buffer radius control — styled like MapSelectionOverlay bottom bar */}
        {routeState === 'ready' && (
          <div className="absolute bottom-3 md:bottom-5 left-3 md:left-5 right-3 md:right-5 z-10">
            <motion.div
              className="bg-[#F9F3EA]/96 backdrop-blur-sm border border-[#c4a882] rounded-2xl shadow-xl"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 p-3 md:p-4">
                <span className="text-sm font-medium text-[#700700] whitespace-nowrap">{t.gpxOverlay.bufferLabel}</span>
                <RadiusInput
                  value={bufferKm}
                  min={0.1}
                  max={100}
                  step={0.1}
                  onLiveChange={setBufferKm}
                  onCommit={setBufferKm}
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Right: Panel ── */}
      <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-[#F5EDE0]">
        {/* Mobile back button */}
        <div className="md:hidden flex items-center px-5 pt-5 pb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#700700] text-sm font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.gpxOverlay.back}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10">

          {/* Header */}
          <div className="mb-6">
            <h2
              className="text-3xl md:text-4xl font-serif text-[#700700] mb-2 leading-tight"
              style={{ fontFamily: 'Rakkas, Georgia, serif' }}
            >
              {t.gpxOverlay.heading}
            </h2>
            {routeState === 'ready' ? (
              <p className="text-sm text-[#6B8F3E] font-medium">
                {t.gpxOverlay.subheadingReady(lengthKm, filename)}
              </p>
            ) : (
              <p className="text-sm text-[#700700]/55">
                {t.gpxOverlay.subheadingIdle}
              </p>
            )}
          </div>

          {/* Dropzone */}
          {showDropzone && (
            <div
              className={`mb-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-10 gap-3 ${
                isDragOver
                  ? 'border-[#6B8F3E] bg-[#6B8F3E]/5'
                  : routeState === 'error'
                  ? 'border-red-400/60 bg-red-50/50'
                  : 'border-[#c4a882] bg-[#F9F3EA]/40 hover:border-[#700700]/40 hover:bg-[#F9F3EA]/70'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={handleFileInput}
              />
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={isDragOver ? 'text-[#6B8F3E]' : 'text-[#700700]/40'}>
                <path d="M18 4 L18 24 M10 16 L18 24 L26 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 28 L6 32 L30 32 L30 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {routeState === 'error' ? (
                <p className="text-sm text-red-600 font-medium text-center">{errorMsg}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#700700]">{isDragOver ? t.gpxOverlay.dropzone.dragging : t.gpxOverlay.dropzone.idle}</p>
                  <p className="text-xs text-[#700700]/45">{t.gpxOverlay.dropzone.sub}</p>
                </>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {routeState === 'loading' && (
            <div className="mb-8 flex items-center justify-center gap-3 py-8 rounded-2xl border border-[#c4a882]/40 bg-[#F9F3EA]/40">
              <svg className="w-5 h-5 animate-spin text-[#700700]/50" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
              <span className="text-sm text-[#700700]/60">{t.gpxOverlay.loadingRoute}</span>
            </div>
          )}

          {/* Ready: reset option */}
          {routeState === 'ready' && (
            <div className="mb-6 flex items-center justify-between p-4 rounded-xl border border-[#6B8F3E]/30 bg-[#6B8F3E]/5">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#6B8F3E]">
                  <path d="M2 8 C4 4 8 3 10 5 C12 7 14 5 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="2" cy="8" r="2" fill="currentColor" />
                  <circle cx="14" cy="8" r="2" fill="currentColor" />
                </svg>
                <span className="text-sm font-medium text-[#6B8F3E]">{t.gpxOverlay.routeReady}</span>
              </div>
              <button
                onClick={() => { setRouteState('idle'); setTrackPoints([]); setFilename(''); setLengthKm(0); }}
                className="text-xs text-[#700700]/45 hover:text-[#700700] transition-colors underline underline-offset-2"
              >
                {t.gpxOverlay.loadNewRoute}
              </button>
            </div>
          )}

          {/* Mobile map preview + buffer slider (map column is hidden on small screens) */}
          {routeState === 'ready' && (
            <div className="md:hidden mb-6 space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-[#c4a882]/50" style={{ height: 220 }}>
                <GpxMap
                  trackPoints={trackPoints}
                  bufferPolygon={bufferPolygon}
                  interactive
                />
              </div>
              <motion.div
                className="bg-[#F9F3EA]/96 border border-[#c4a882] rounded-2xl"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm font-medium text-[#700700] whitespace-nowrap">{t.gpxOverlay.bufferLabel}</span>
                  <RadiusInput
                    value={bufferKm}
                    min={0.1}
                    max={100}
                    step={0.1}
                    onLiveChange={setBufferKm}
                    onCommit={setBufferKm}
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Provider guide ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#700700] mb-3">{t.gpxOverlay.howToGetGpx}</h3>

            {/* Tab switcher */}
            <div className="flex gap-1 mb-4 p-1 bg-[#EDE0CE] rounded-xl w-fit">
              {providerTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveProvider(tab.id); setLinkError(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    activeProvider === tab.id
                      ? 'bg-[#F9F3EA] text-[#700700] shadow-sm'
                      : 'text-[#700700]/45 hover:text-[#700700]/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Google Maps tab */}
            {activeProvider === 'google' && (
              <div className="space-y-3">
                <p className="text-sm text-[#700700]/65 leading-relaxed">
                  {t.gpxOverlay.google.description}
                </p>
                <div className="flex items-start gap-2 p-3 rounded-xl border border-[#c4a882]/40 bg-[#EDE0CE]/40">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0 text-[#700700]/50">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 5v3.5M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <p className="text-xs text-[#700700]/60 leading-relaxed">
                    {t.gpxOverlay.google.note}{' '}
                    <a href="https://mapstogpx.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#700700]/90">mapstogpx.com</a>
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={googleLink}
                    onChange={(e) => setGoogleLink(e.target.value)}
                    placeholder={t.gpxOverlay.google.placeholder}
                    className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-[#c4a882] bg-[#F9F3EA]/60 text-[#700700] placeholder-[#700700]/30 outline-none focus:border-[#700700] transition-colors"
                  />
                  <button
                    onClick={handleGoogleLink}
                    disabled={linkLoading || !googleLink.trim()}
                    className="flex-shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#700700] text-[#F5EDE0] text-sm font-medium hover:bg-[#5a0606] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {linkLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                      </svg>
                    ) : null}
                    {t.gpxOverlay.google.loadButton}
                  </button>
                </div>
                {linkError && <p className="text-xs text-red-600/80">{linkError}</p>}
              </div>
            )}

            {/* Apple Maps tab */}
            {activeProvider === 'apple' && (
              <div className="space-y-3">
                <p className="text-sm text-[#700700]/65 leading-relaxed">
                  {t.gpxOverlay.apple.description}
                </p>
                <div className="flex items-start gap-2 p-3 rounded-xl border border-[#c4a882]/40 bg-[#EDE0CE]/40">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0 text-[#700700]/50">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 5v3.5M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <p className="text-xs text-[#700700]/60 leading-relaxed">
                    {t.gpxOverlay.apple.note}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={appleLink}
                    onChange={(e) => setAppleLink(e.target.value)}
                    placeholder={t.gpxOverlay.apple.placeholder}
                    className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-[#c4a882] bg-[#F9F3EA]/60 text-[#700700] placeholder-[#700700]/30 outline-none focus:border-[#700700] transition-colors"
                  />
                  <button
                    onClick={handleAppleLink}
                    disabled={linkLoading || !appleLink.trim()}
                    className="flex-shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#700700] text-[#F5EDE0] text-sm font-medium hover:bg-[#5a0606] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {linkLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                      </svg>
                    ) : null}
                    {t.gpxOverlay.apple.loadButton}
                  </button>
                </div>
                {linkError && <p className="text-xs text-red-600/80">{linkError}</p>}
              </div>
            )}

            {/* Mapy.cz / OSM tab */}
            {activeProvider === 'mapy' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#700700]">{t.gpxOverlay.mapy.heading}</h4>
                <ol className="space-y-2">
                  {t.gpxOverlay.mapy.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#700700]/65">
                      <span className="font-mono text-[#700700]/30 flex-shrink-0 text-xs mt-0.5">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky confirm bar ── */}
        <div className="sticky bottom-0 px-6 md:px-10 py-5 border-t border-[#c4a882]/25 bg-[#F9F3EA]/96 backdrop-blur-sm">
          <Button
            onClick={handleConfirm}
            disabled={routeState !== 'ready'}
            className="w-full"
          >
            {t.gpxOverlay.ctaConfirm}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
