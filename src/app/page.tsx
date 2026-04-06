'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { WizardStep, SelectionMode, WikidataConfig, WikidataResult, GeographicSelection } from '@/types';
import HeroSection from '@/components/wizard/HeroSection';
import ExplainScreen from '@/components/wizard/ExplainScreen';
import ModeSelectSection from '@/components/wizard/ModeSelectSection';
import LoadingScreen, { type LinkProgress } from '@/components/wizard/LoadingScreen';
import { queryWikidata, expandByLinkDepth } from '@/lib/wikidata';
import { decodeShareParams } from '@/lib/shareUrl';
import { useLocale } from '@/i18n';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const MapSelectionOverlay = dynamic(() => import('@/components/wizard/MapSelectionOverlay'), { ssr: false });
const PolygonSelectionOverlay = dynamic(() => import('@/components/wizard/PolygonSelectionOverlay'), { ssr: false });
const RectangleSelectionOverlay = dynamic(() => import('@/components/wizard/RectangleSelectionOverlay'), { ssr: false });
const GpxSelectionOverlay = dynamic(() => import('@/components/wizard/GpxSelectionOverlay'), { ssr: false });
const AdminAreaSelectionOverlay = dynamic(() => import('@/components/wizard/AdminAreaSelectionOverlay'), { ssr: false });
const ConfigWizard = dynamic(() => import('@/components/wizard/ConfigWizard'), { ssr: false });
const ResultsScreen = dynamic(() => import('@/components/wizard/ResultsScreen'), { ssr: false });

export default function Home() {
  const [step, setStep] = useState<WizardStep>('hero');
  const [mode, setMode] = useState<SelectionMode | null>(null);
  const [selection, setSelection] = useState<GeographicSelection | null>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<WikidataConfig | null>(null);
  const [result, setResult] = useState<WikidataResult | null>(null);
  const [baseResult, setBaseResult] = useState<WikidataResult | null>(null);
  const [linkProgress, setLinkProgress] = useState<LinkProgress | null>(null);

  const { setLocale } = useLocale();

  // Refs for share-URL state passed to overlays
  const urlConfigRef = useRef<WikidataConfig | null>(null);
  const urlBufferKmRef = useRef<number | undefined>(undefined);
  const urlMapLinkRef = useRef<string | undefined>(undefined);
  const urlMapProviderRef = useRef<'google' | 'apple' | undefined>(undefined);

  const runQuery = useCallback(async (
    sel: GeographicSelection,
    cfg: WikidataConfig,
    existingCache?: Map<string, string[]>,
  ) => {
    setStep('loading');
    setLinkProgress(null);
    try {
      const res = await queryWikidata(sel, cfg, existingCache, (depth, ofDepth, done, progress) => {
        setLinkProgress({ depth, ofDepth, done, progress });
      });
      setResult(res);
      setBaseResult(res);
    } catch (err) {
      console.error('Wikidata query failed:', err);
      const empty = { articleCount: 0, estimatedSizeMB: 0, articles: [], linkedTitles: [], linkCache: new Map() };
      setResult(empty);
      setBaseResult(empty);
    }
    setStep('results');
  }, []);

  // Restore state from a share URL on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('t')) return;

    const decoded = decodeShareParams(params);
    if (!decoded) return;

    // Remove query params from the URL so refreshing doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);

    if (decoded.uiLocale) setLocale(decoded.uiLocale);
    setConfig(decoded.config);

    if (decoded.isRoute) {
      // GPX: show GPX overlay with config pre-filled; user re-uploads route
      urlConfigRef.current = decoded.config;
      if (decoded.bufferKm !== undefined) urlBufferKmRef.current = decoded.bufferKm;
      if (decoded.mapLink) urlMapLinkRef.current = decoded.mapLink;
      if (decoded.mapProvider) urlMapProviderRef.current = decoded.mapProvider;
      setMode('route');
      setStep('map-selection');
    } else if (decoded.selection) {
      setSelection(decoded.selection);
      runQuery(decoded.selection, decoded.config);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload MapLibre + overlay modules immediately on mount
  useEffect(() => {
    import('maplibre-gl');
    import('@/components/wizard/MapSelectionOverlay');
    import('@/components/wizard/PolygonSelectionOverlay');
    import('@/components/wizard/RectangleSelectionOverlay');
    import('@/components/wizard/GpxSelectionOverlay');
    import('@/components/wizard/AdminAreaSelectionOverlay');
  }, []);

  const handleModeSelect = useCallback((m: SelectionMode) => {
    setMode(m);
    setStep('map-selection');
  }, []);

  const handleMapConfirm = useCallback((sel: GeographicSelection, snap?: string) => {
    setSelection(sel);
    setMapSnapshot(snap);
    // If config was pre-filled from a share URL, skip the config step
    if (urlConfigRef.current) {
      const cfg = urlConfigRef.current;
      urlConfigRef.current = null;
      urlBufferKmRef.current = undefined;
      urlMapLinkRef.current = undefined;
      urlMapProviderRef.current = undefined;
      setConfig(cfg);
      runQuery(sel, cfg);
    } else {
      setStep('config');
    }
  }, [runQuery]);

  const handleConfigSubmit = useCallback(async (cfg: WikidataConfig) => {
    if (!selection) return;
    setConfig(cfg);
    await runQuery(selection, cfg);
  }, [selection, runQuery]);

  const handleRefineWithCategories = useCallback(async (categoryIds: string[]) => {
    if (!selection || !config || !baseResult) return;
    setConfig({ ...config, categories: categoryIds });

    // Filter articles client-side — no Wikidata SPARQL query needed
    const filtered = categoryIds.length === 0
      ? baseResult.articles
      : baseResult.articles.filter((a) => a.categoryId && categoryIds.includes(a.categoryId));

    // Re-derive linkedTitles from the filtered set using the already-cached link data
    setStep('loading');
    setLinkProgress(null);
    const { linkedTitles } = await expandByLinkDepth(
      filtered.map((a) => a.title).filter(Boolean),
      config.language,
      config.linkDepth,
      baseResult.linkCache,
      (depth, ofDepth, done) => setLinkProgress({ depth, ofDepth, done }),
    );

    const kbPerArticle = config.includeImages ? 250 : 60;
    const totalCount = filtered.length + linkedTitles.length;
    setResult({
      articleCount: filtered.length,
      estimatedSizeMB: Math.max(1, Math.round((totalCount * kbPerArticle) / 1024)),
      articles: filtered,
      linkedTitles,
      linkCache: baseResult.linkCache, // keep original cache for future re-filters
    });
    setStep('results');
  }, [selection, config, baseResult]);

  return (
    <main className="min-h-screen bg-[#F5EDE0]">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <AnimatePresence mode="wait">
        {step === 'hero' && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <HeroSection onStart={() => setStep('mode-select')} onExplain={() => setStep('explain')} />
          </motion.div>
        )}

        {step === 'explain' && (
          <ExplainScreen
            onStart={() => setStep('mode-select')}
            onBack={() => setStep('hero')}
          />
        )}

        {step === 'mode-select' && (
          <motion.div key="mode-select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            onAnimationComplete={() => { import('maplibre-gl'); }}>
            <ModeSelectSection onSelect={handleModeSelect} />
          </motion.div>
        )}

        {step === 'map-selection' && mode === 'point-radius' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <MapSelectionOverlay
              onConfirm={handleMapConfirm}
              onBack={() => setStep('mode-select')}
            />
          </motion.div>
        )}

        {step === 'map-selection' && mode === 'polygon' && (
          <motion.div key="map-polygon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <PolygonSelectionOverlay
              onConfirm={handleMapConfirm}
              onBack={() => setStep('mode-select')}
            />
          </motion.div>
        )}

        {step === 'map-selection' && mode === 'rectangle' && (
          <motion.div key="map-rectangle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <RectangleSelectionOverlay
              onConfirm={handleMapConfirm}
              onBack={() => setStep('mode-select')}
            />
          </motion.div>
        )}

        {step === 'map-selection' && mode === 'route' && (
          <motion.div key="map-route" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <GpxSelectionOverlay
              onConfirm={handleMapConfirm}
              onBack={() => setStep('mode-select')}
              initialBufferKm={urlBufferKmRef.current}
              initialMapLink={urlMapLinkRef.current}
              initialProvider={urlMapProviderRef.current}
              autoConfirm={!!urlMapLinkRef.current}
            />
          </motion.div>
        )}

        {step === 'map-selection' && mode === 'admin-area' && (
          <motion.div key="map-admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <AdminAreaSelectionOverlay
              onConfirm={handleMapConfirm}
              onBack={() => setStep('mode-select')}
            />
          </motion.div>
        )}

        {step === 'config' && selection && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ConfigWizard
              selection={selection}
              onBack={() => setStep('map-selection')}
              onSubmit={handleConfigSubmit}
            />
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <LoadingScreen linkDepth={config?.linkDepth ?? 0} linkProgress={linkProgress} />
          </motion.div>
        )}

        {step === 'results' && selection && config && result && (
          <motion.div key="results" className="h-[100dvh] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ResultsScreen
              selection={selection}
              config={config}
              result={result}
              mapSnapshot={mapSnapshot}
              onBack={() => setStep('map-selection')}
              onEditConfig={() => setStep('config')}
              onRefineWithCategories={handleRefineWithCategories}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
