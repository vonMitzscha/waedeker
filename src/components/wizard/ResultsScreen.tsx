'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { GeographicSelection, WikidataConfig, WikidataResult, WikidataCategory } from '@/types';
import { generateAndDownloadZip, queryCategoriesForArea } from '@/lib/wikidata';
import { encodeShareUrl } from '@/lib/shareUrl';
import { copyText } from '@/lib/clipboard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SetupGuide from '@/components/wizard/SetupGuide';
import { useT, useLocale } from '@/i18n';

const PointRadiusMap = dynamic(() => import('@/components/map/PointRadiusMap'), { ssr: false });
const PolygonMap = dynamic(() => import('@/components/map/PolygonMap'), { ssr: false });
const RectangleMap = dynamic(() => import('@/components/map/RectangleMap'), { ssr: false });
const GpxMap = dynamic(() => import('@/components/map/GpxMap'), { ssr: false });
const AdminAreaMap = dynamic(() => import('@/components/map/AdminAreaMap'), { ssr: false });

interface ResultsScreenProps {
  selection: GeographicSelection;
  config: WikidataConfig;
  result: WikidataResult;
  mapSnapshot?: string;
  onBack: () => void;
  onEditConfig: () => void;
  onRefineWithCategories: (categoryIds: string[]) => void;
}

function SizeFmt({ mb }: { mb: number }) {
  if (mb >= 1024) return <>{(mb / 1024).toFixed(1)} GB</>;
  return <>{mb} MB</>;
}

export default function ResultsScreen({
  selection,
  config,
  result,
  mapSnapshot,
  onBack,
  onEditConfig,
  onRefineWithCategories,
}: ResultsScreenProps) {
  const t = useT();
  const { locale } = useLocale();

  const [activeTab, setActiveTab] = useState<'overview' | 'articles'>('overview');
  const [articleSearch, setArticleSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);
  const [fallbackUrlCopied, setFallbackUrlCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
    // iPadOS 13+ reports as "Macintosh" but has touch points > 1
    const iPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    setIsMobileDevice(mobileUA || iPadOS);
  }, []);

  // Category filter state
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [categories, setCategories] = useState<WikidataCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [catSearch, setCatSearch] = useState('');

  const areaLabel = selection.label ?? (
    selection.type === 'polygon'
      ? t.config.selectionLabels.polygon(selection.points.length)
      : selection.type === 'route'
      ? (selection.filename ?? t.config.selectionLabels.route)
      : selection.type === 'rectangle'
      ? t.config.selectionLabels.rectangle
      : selection.type === 'admin-area'
      ? t.config.selectionLabels.adminArea
      : `${selection.center[1].toFixed(3)}°N, ${selection.center[0].toFixed(3)}°E`
  );

  const filteredCategories = useMemo(() => {
    if (!catSearch) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const filteredArticles = useMemo(() => {
    if (!articleSearch) return result.articles;
    const q = articleSearch.toLowerCase();
    return result.articles.filter(
      (a) => a.label.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)
    );
  }, [result.articles, articleSearch]);

  const handleShare = async () => {
    const url = encodeShareUrl(selection, config, locale);
    // Try Web Share API (native iOS/Android share sheet)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Waedeker', url });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return; // user dismissed
        // fall through to clipboard
      }
    }
    // Try clipboard (with iOS-safe fallback)
    try {
      await copyText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // Last resort: show URL so user can copy manually
      setShareFallbackUrl(url);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateAndDownloadZip(selection, config, result, mapSnapshot, locale as 'de' | 'en');
      setDownloaded(true);
      setTimeout(() => setShowGuide(true), 800);
    } finally {
      setDownloading(false);
    }
  };

  // Prevent the page itself from growing when scrollable content expands.
  // We keep the viewport fixed and allow scrolling only within the component.
  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);


  // Auto-fetch categories on mount
  useEffect(() => {
    setCatLoading(true);
    // Capture article set at mount time (= unfiltered base result)
    const baseArticles = result.articles;
    queryCategoriesForArea(selection, config)
      .then((cats) => {
        // Recount from actual articles so displayed counts match the filter results.
        // SPARQL counts every P31 type per article (an article with two types gets counted twice),
        // but the client-side filter only matches the primary categoryId stored on each article.
        const countMap = new Map<string, number>();
        for (const a of baseArticles) {
          if (a.categoryId) countMap.set(a.categoryId, (countMap.get(a.categoryId) ?? 0) + 1);
        }
        setCategories(
          cats
            .map((c) => ({ ...c, count: countMap.get(c.id) ?? 0 }))
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count),
        );
      })
      .catch(() => setCatError(true))
      .finally(() => setCatLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchCategories = useCallback(async () => {
    setShowCategoryFilter(true);
  }, []);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyFilter = () => {
    onRefineWithCategories(selectedCats);
  };

  // Build the files list for the ZIP overview
  const zipFiles = [
    { name: 'articles.txt', desc: t.results.zip.articlesTxt(result.articleCount) },
    { name: 'docker-compose.yml', desc: t.results.zip.descDockerCompose },
    { name: 'build.sh', desc: t.results.zip.descBuildSh },
    { name: 'README.md', desc: t.results.zip.descReadme },
  ];

  return (
    <>
    {showGuide && <SetupGuide onClose={() => setShowGuide(false)} />}

    {/* Mobile warning modal */}
    <AnimatePresence>
      {showMobileWarning && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#1a0000]/40 backdrop-blur-sm"
            onClick={() => setShowMobileWarning(false)}
          />
          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-sm bg-[#F9F3EA] rounded-2xl border border-[#c4a882]/60 shadow-2xl p-6"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Close X */}
            <button
              onClick={() => { setShowMobileWarning(false); setShareFallbackUrl(null); }}
              className="absolute top-4 right-4 text-[#700700]/30 hover:text-[#700700]/70 transition-colors"
              aria-label="Schließen"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl border border-[#c4a882]/60 bg-[#F5EDE0] flex items-center justify-center text-[#700700]/70 mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="font-semibold text-[#700700] mb-2">{t.results.mobileWarning.heading}</h2>
            <p className="text-sm text-[#700700]/60 leading-relaxed mb-5">{t.results.mobileWarning.body}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowMobileWarning(false); handleDownload(); }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#700700] hover:bg-[#8a0a0a] text-[#F9F3EA] text-sm font-medium transition-colors"
              >
                {t.results.mobileWarning.ctaAnyway}
              </button>
              <button
                onClick={handleShare}
                className="w-full py-2.5 px-4 rounded-xl border border-[#c4a882]/60 text-[#700700]/70 hover:text-[#700700] text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.4 6.2l5.2-2.5M4.4 7.8l5.2 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {shareCopied ? t.results.mobileWarning.ctaShareCopied : t.results.mobileWarning.ctaShare}
              </button>
              {/* Fallback: show URL as selectable text when share+clipboard both fail */}
              {shareFallbackUrl && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={shareFallbackUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[#c4a882]/60 bg-[#F5EDE0] text-[#700700]/70 text-xs font-mono outline-none"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await copyText(shareFallbackUrl);
                        setFallbackUrlCopied(true);
                        setTimeout(() => setFallbackUrlCopied(false), 2000);
                      } catch { /* input is still selectable */ }
                    }}
                    className={`flex-shrink-0 h-8 flex items-center justify-center gap-1 rounded-xl border px-2 transition-all ${
                      fallbackUrlCopied
                        ? 'border-[#6B8F3E]/50 bg-[#6B8F3E]/10 text-[#6B8F3E]'
                        : 'border-[#c4a882]/60 bg-[#F9F3EA] text-[#700700]/50 hover:text-[#700700]'
                    }`}
                    aria-label="Kopieren"
                  >
                    {fallbackUrlCopied ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 5.5l2.5 3 5.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs font-medium">Kopiert</span>
                      </>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M1 4v7h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <div className="h-full flex overflow-hidden">
      {/* ── Left: Map with article markers ── */}
      <motion.div
        className="hidden md:block w-1/2 relative bg-[#EDE0CE]"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Map with article dots */}
        <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 220, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(112,7,7,0.12)', border: '1px solid rgba(196,168,130,0.4)' }}>
          {selection.type === 'polygon' ? (
            <PolygonMap initialSelection={selection} interactive={false} articles={result.articles} language={config.language} />
          ) : selection.type === 'route' ? (
            <GpxMap
              trackPoints={selection.trackPoints}
              bufferPolygon={selection.polygon}
              interactive={false}
              articles={result.articles}
              language={config.language}
            />
          ) : selection.type === 'rectangle' ? (
            <RectangleMap
              initialSelection={selection}
              interactive={false}
              articles={result.articles}
              language={config.language}
            />
          ) : selection.type === 'admin-area' ? (
            <AdminAreaMap
              polygon={selection.polygon}
              bbox={selection.bbox}
              articles={result.articles}
              language={config.language}
            />
          ) : (
            <PointRadiusMap
              initialSelection={selection}
              interactive={false}
              compact
              articles={result.articles}
              language={config.language}
            />
          )}
        </div>

        {/* Stats cards */}
        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <div className={`grid gap-3 ${config.linkDepth > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <motion.div
              className="bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882]/50 rounded-2xl p-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.articles}</p>
              <p className="text-3xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                {result.articleCount.toLocaleString('de')}
              </p>
            </motion.div>
            {config.linkDepth > 0 && (
              <motion.div
                className="bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882]/50 rounded-2xl p-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.viaLinks}</p>
                <p className="text-3xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                  {result.linkedTitles.length.toLocaleString('de')}
                </p>
                <p className="text-xs text-[#700700]/35 mt-0.5 leading-tight whitespace-pre-line">{t.results.stats.viaLinksDesc(config.linkDepth)}</p>
              </motion.div>
            )}
            <motion.div
              className="bg-[#F9F3EA]/95 backdrop-blur-sm border border-[#c4a882]/50 rounded-2xl p-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.size}</p>
              <p className="text-3xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                <SizeFmt mb={result.estimatedSizeMB} />
              </p>
            </motion.div>
          </div>
          <motion.div
            className="bg-[#F9F3EA]/88 backdrop-blur-sm border border-[#c4a882]/40 rounded-xl px-4 py-2.5 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex gap-1.5 items-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#700700]" />
              <span className="text-xs text-[#700700]/45">{t.results.map.area}</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#6B8F3E] ml-2" />
              <span className="text-xs text-[#700700]/45">{t.results.map.articles}</span>
            </div>
            <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
              <span className="text-xs text-[#700700]/45 truncate">{areaLabel} · {config.language.toUpperCase()}</span>
              <span
                className={`flex-shrink-0 flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${
                  config.includeImages
                    ? 'text-[#6B8F3E] border-[#6B8F3E]/30 bg-[#6B8F3E]/8'
                    : 'text-[#700700]/30 border-[#c4a882]/30 bg-transparent'
                }`}
                title={config.includeImages ? 'Mit Bildern' : 'Ohne Bilder'}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="0.75" y="2" width="8.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="0.9" />
                  <circle cx="3.2" cy="4.3" r="0.9" fill="currentColor" />
                  <path d="M1.5 8l2-2.2 1.5 1.5 1.5-2 2 2.7" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Right: Results + actions ── */}
      <motion.div
        className="w-full md:w-1/2 flex flex-col min-h-0 overflow-hidden"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-12 py-10 md:py-14">
          <div className="flex items-center gap-2 mb-5">
            <Badge variant={result.articleCount > 0 ? 'green' : 'muted'}>
              {result.articleCount > 0 ? t.results.badges.success : t.results.badges.empty}
            </Badge>
            {config.categories.length > 0 && (
              <Badge variant="default">{t.results.badges.filtered(config.categories.length)}</Badge>
            )}
          </div>

          <h2 className="text-3xl md:text-4xl font-serif text-[#700700] mb-3 leading-tight" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
            {result.articleCount > 0 ? t.results.heading.success : t.results.heading.empty}
          </h2>

          {/* Mobile-only stats (map is hidden on mobile) */}
          {result.articleCount > 0 && (
            <div className={`md:hidden grid gap-3 mb-6 ${config.linkDepth > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="bg-[#F9F3EA]/95 border border-[#c4a882]/50 rounded-2xl p-3">
                <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.articles}</p>
                <p className="text-2xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                  {result.articleCount.toLocaleString('de')}
                </p>
              </div>
              {config.linkDepth > 0 && (
                <div className="bg-[#F9F3EA]/95 border border-[#c4a882]/50 rounded-2xl p-3">
                  <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.viaLinks}</p>
                  <p className="text-2xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                    {result.linkedTitles.length.toLocaleString('de')}
                  </p>
                </div>
              )}
              <div className="bg-[#F9F3EA]/95 border border-[#c4a882]/50 rounded-2xl p-3">
                <p className="text-xs text-[#700700]/45 uppercase tracking-wide mb-1">{t.results.stats.size}</p>
                <p className="text-2xl font-serif text-[#700700]" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                  <SizeFmt mb={result.estimatedSizeMB} />
                </p>
              </div>
            </div>
          )}

          <p className="text-[#700700]/55 mb-8 text-sm leading-relaxed">
            {result.articleCount > 0
              ? t.results.successMsg(result.articleCount)
              : t.results.emptyMsg}
          </p>

          {/* Tabs */}
          {result.articleCount > 0 && (
            <>
              <div className="flex gap-1 mb-5 p-1 bg-[#EDE0CE] rounded-xl w-fit">
                {(['overview', 'articles'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab ? 'bg-[#F9F3EA] text-[#700700] shadow-sm' : 'text-[#700700]/45 hover:text-[#700700]/70'
                    }`}
                  >
                    {tab === 'overview' ? t.results.tabs.overview : t.results.tabs.articles(result.articleCount)}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Files list */}
                  <div className="p-5 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/50">
                    <h3 className="font-semibold text-[#700700] text-sm mb-3">{t.results.zip.heading}</h3>
                    <ul className="space-y-2">
                      {zipFiles.map((f) => (
                        <li key={f.name} className="flex items-center gap-2.5 text-sm">
                          <div className="w-6 h-6 rounded bg-[#c4a882]/20 flex items-center justify-center flex-shrink-0">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 1h4.5L8 2.5V9H2V1z" stroke="#700700" strokeWidth="0.8" opacity="0.6" />
                            </svg>
                          </div>
                          <span className="font-mono text-xs text-[#700700] font-medium">{f.name}</span>
                          <span className="text-[#700700]/40 text-xs">— {f.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next steps */}
                  <div className="p-5 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/50">
                    <h3 className="font-semibold text-[#700700] text-sm mb-3">{t.results.nextSteps.heading}</h3>
                    <ol className="space-y-2">
                      {[
                        t.results.nextSteps.steps[0],
                        t.results.nextSteps.steps[1],
                        <><code className="px-1.5 py-0.5 bg-[#EDE0CE] rounded font-mono text-xs">docker compose up && docker compose down</code> {t.results.nextSteps.steps[2].replace('docker compose up && docker compose down ', '')}</>,
                        <>{t.results.nextSteps.steps[3].replace('./output/', '')} <code className="px-1 py-0.5 bg-[#EDE0CE] rounded font-mono text-xs">./output/</code> {t.results.nextSteps.steps[3].replace(/.*\.\/output\//, '')}</>,
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-[#700700]/65">
                          <span className="font-mono text-[#700700]/30 flex-shrink-0 text-xs mt-0.5">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'articles' && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#700700]/35">
                      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      placeholder={t.results.search.placeholder}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#c4a882] bg-[#F9F3EA]/50 text-[#700700] placeholder-[#700700]/30 text-sm outline-none focus:border-[#700700] transition-colors"
                    />
                    {articleSearch && (
                      <button
                        onClick={() => setArticleSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#700700]/30 hover:text-[#700700]"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#700700]/40">
                    {articleSearch
                      ? t.results.search.count(filteredArticles.length, result.articleCount)
                      : t.results.search.count(result.articleCount, result.articleCount)}
                  </p>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredArticles.map((a) => {
                      const wikiUrl = `https://${config.language}.wikipedia.org/wiki/${encodeURIComponent(a.title)}`;
                      return (
                        <a
                          key={a.qid}
                          href={wikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl border border-[#c4a882]/25 bg-[#F9F3EA]/40 hover:bg-[#F9F3EA]/80 hover:border-[#c4a882]/50 transition-all group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#700700] text-sm truncate group-hover:underline group-hover:underline-offset-2">
                              {a.label || a.title}
                            </p>
                            {a.label && a.title !== a.label && (
                              <p className="text-xs text-[#700700]/35 font-mono truncate mt-0.5">{a.title}</p>
                            )}
                          </div>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="ml-2 flex-shrink-0 text-[#700700]/25 group-hover:text-[#700700]/60 transition-colors">
                            <path d="M4.5 1.5H1.5v8h8V6.5M9.5 1.5L5.5 5.5M9.5 1.5H6.5M9.5 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      );
                    })}
                    {filteredArticles.length === 0 && (
                      <p className="text-sm text-center text-[#700700]/35 py-8">{t.results.search.noResults}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Category filter ── */}
          {result.articleCount > 0 && (
            <div className="mt-6">
              {!showCategoryFilter ? (
                <button
                  onClick={handleFetchCategories}
                  className="w-full py-3 px-4 rounded-xl border border-[#c4a882]/50 bg-[#F9F3EA]/40 hover:bg-[#F9F3EA]/70 text-[#700700] text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {t.results.categories.filterButton}
                </button>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[#700700] text-sm">{t.results.categories.heading}</h3>
                      <button
                        onClick={() => setShowCategoryFilter(false)}
                        className="text-[#700700]/30 hover:text-[#700700] transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {catLoading && (
                      <div className="flex items-center gap-2 text-sm text-[#700700]/50 py-4 justify-center">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                        </svg>
                        {t.results.categories.loadingMsg}
                      </div>
                    )}

                    {catError && (
                      <p className="text-sm text-red-600/70 text-center py-4">
                        {t.results.categories.error}
                      </p>
                    )}

                    {!catLoading && !catError && categories.length > 0 && (
                      <>
                        <p className="text-xs text-[#700700]/40 mb-3">
                          {t.results.categories.instruction}
                        </p>

                        {/* Search + select-all controls */}
                        <div className="flex gap-2 mb-2">
                          <input
                            type="search"
                            placeholder={t.results.categories.searchPlaceholder}
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            className="flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg border border-[#c4a882]/50 bg-[#F9F3EA] text-[#700700] placeholder-[#700700]/30 outline-none focus:border-[#700700]/40"
                          />
                          <button
                            onClick={() => setSelectedCats(filteredCategories.map((c) => c.id))}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#c4a882]/50 text-[#700700]/60 hover:text-[#700700] hover:bg-[#F9F3EA] transition-colors whitespace-nowrap"
                          >
                            {t.results.categories.selectAll}
                          </button>
                          <button
                            onClick={() => setSelectedCats((prev) => prev.filter((id) => !filteredCategories.some((c) => c.id === id)))}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#c4a882]/50 text-[#700700]/60 hover:text-[#700700] hover:bg-[#F9F3EA] transition-colors whitespace-nowrap"
                          >
                            {t.results.categories.deselectAll}
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 mb-4">
                          {filteredCategories.map((cat) => (
                            <label
                              key={cat.id}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                selectedCats.includes(cat.id)
                                  ? 'border-[#700700] bg-[#700700]/5'
                                  : 'border-[#c4a882]/30 hover:border-[#c4a882] bg-transparent'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                                selectedCats.includes(cat.id) ? 'bg-[#700700] border-[#700700]' : 'border-[#c4a882]'
                              }`}>
                                {selectedCats.includes(cat.id) && (
                                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                    <path d="M1.5 4.5l2 2.5 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedCats.includes(cat.id)}
                                onChange={() => toggleCat(cat.id)}
                                className="sr-only"
                              />
                              <span className="text-sm text-[#700700] flex-1">{cat.label}</span>
                              <span className="text-xs text-[#700700]/35 font-mono flex-shrink-0">{cat.count}</span>
                            </label>
                          ))}
                          {filteredCategories.length === 0 && (
                            <p className="text-sm text-center text-[#700700]/35 py-4">{t.results.categories.noCategories}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={applyFilter}
                            size="sm"
                            className="ml-auto"
                          >
                            {selectedCats.length === 0 ? t.results.categories.applyAll : t.results.categories.applySelected(selectedCats.length)}
                          </Button>
                        </div>
                      </>
                    )}

                    {!catLoading && !catError && categories.length === 0 && (
                      <p className="text-sm text-[#700700]/45 text-center py-4">
                        {t.results.categories.noCategories}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </div>

        {/* ── Action bar ── */}
        <div className="sticky bottom-0 px-6 md:px-12 py-5 border-t border-[#c4a882]/25 bg-[#F5EDE0]/96 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button variant="secondary" onClick={onEditConfig} size="sm" className="flex-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2l2 2-6 6H2v-2l6-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.results.ctaConfig}
            </Button>
            <Button
              onClick={() => isMobileDevice ? setShowMobileWarning(true) : handleDownload()}
              size="sm"
              className="flex-1"
              disabled={result.articleCount === 0 || downloading}
            >
              {downloading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                  </svg>
                  {t.results.ctaDownloading}
                </>
              ) : downloaded ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t.results.ctaDownloaded}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 2v7M3.5 6.5l3 3 3-3M1.5 11h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t.results.ctaDownload}
                </>
              )}
            </Button>
          </div>
          {result.articleCount === 0 && (
            <Button variant="ghost" onClick={onBack} size="sm" className="w-full mt-2">
              {t.results.ctaNewArea}
            </Button>
          )}
          {downloaded && (
            <button
              onClick={() => setShowGuide(true)}
              className="w-full mt-2 py-2 text-xs text-[#700700]/50 hover:text-[#700700] transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 5v4M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {t.results.ctaShowGuide}
            </button>
          )}
        </div>
      </motion.div>
    </div>
    </>
  );
}
