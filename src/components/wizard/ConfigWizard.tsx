'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { GeographicSelection, WikidataConfig } from '@/types';
import Button from '@/components/ui/Button';
import { useT } from '@/i18n';

const PointRadiusMap = dynamic(() => import('@/components/map/PointRadiusMap'), { ssr: false });
const PolygonMap = dynamic(() => import('@/components/map/PolygonMap'), { ssr: false });
const RectangleMap = dynamic(() => import('@/components/map/RectangleMap'), { ssr: false });
const GpxMap = dynamic(() => import('@/components/map/GpxMap'), { ssr: false });
const AdminAreaMap = dynamic(() => import('@/components/map/AdminAreaMap'), { ssr: false });

// Pinned: most widely used Wikipedia editions (shown first, always visible)
const PINNED_LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pl', label: 'Polski' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'fa', label: 'فارسی' },
  { code: 'he', label: 'עברית' },
  { code: 'no', label: 'Norsk (bokmål)' },
  { code: 'da', label: 'Dansk' },
  { code: 'fi', label: 'Suomi' },
  { code: 'cs', label: 'Čeština' },
  { code: 'hu', label: 'Magyar' },
  { code: 'ro', label: 'Română' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'ca', label: 'Català' },
  { code: 'bg', label: 'Български' },
  { code: 'sr', label: 'Српски / Srpski' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'sk', label: 'Slovenčina' },
];

// All other Wikipedia language editions, alphabetically by code
const OTHER_LANGUAGES = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'ak', label: 'Akan' },
  { code: 'als', label: 'Alemannisch' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'an', label: 'Aragonés' },
  { code: 'ast', label: 'Asturianu' },
  { code: 'az', label: 'Azərbaycanca' },
  { code: 'azb', label: 'تۆرکجه' },
  { code: 'ba', label: 'Башҡортса' },
  { code: 'bar', label: 'Bairisch' },
  { code: 'be', label: 'Беларуская' },
  { code: 'br', label: 'Brezhoneg' },
  { code: 'bs', label: 'Bosanski' },
  { code: 'ce', label: 'Нохчийн' },
  { code: 'ceb', label: 'Cebuano' },
  { code: 'ckb', label: 'کوردی' },
  { code: 'cv', label: 'Чӑвашла' },
  { code: 'cy', label: 'Cymraeg' },
  { code: 'eo', label: 'Esperanto' },
  { code: 'et', label: 'Eesti' },
  { code: 'eu', label: 'Euskara' },
  { code: 'ext', label: 'Estremeñu' },
  { code: 'frr', label: 'Nordfriisk' },
  { code: 'fur', label: 'Furlan' },
  { code: 'ga', label: 'Gaeilge' },
  { code: 'gd', label: 'Gàidhlig' },
  { code: 'gl', label: 'Galego' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hy', label: 'Հայերեն' },
  { code: 'ia', label: 'Interlingua' },
  { code: 'io', label: 'Ido' },
  { code: 'is', label: 'Íslenska' },
  { code: 'ka', label: 'ქართული' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'km', label: 'ភាសាខ្មែរ' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ku', label: 'Kurdî' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'la', label: 'Latina' },
  { code: 'lb', label: 'Lëtzebuergesch' },
  { code: 'lij', label: 'Ligure' },
  { code: 'lmo', label: 'Lombard' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'mg', label: 'Malagasy' },
  { code: 'min', label: 'Minangkabau' },
  { code: 'mk', label: 'Македонски' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mn', label: 'Монгол' },
  { code: 'mr', label: 'मराठी' },
  { code: 'my', label: 'မြန်မာဘာသာ' },
  { code: 'myv', label: 'Эрзянь' },
  { code: 'mzn', label: 'مازِرونی' },
  { code: 'nah', label: 'Nāhuatl' },
  { code: 'nap', label: 'Napulitano' },
  { code: 'nds', label: 'Plattdüütsch' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'new', label: 'नेपाल भाषा' },
  { code: 'nn', label: 'Norsk (nynorsk)' },
  { code: 'oc', label: 'Occitan' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'pms', label: 'Piemontèis' },
  { code: 'pnb', label: 'پنجابی' },
  { code: 'ps', label: 'پښتو' },
  { code: 'qu', label: 'Runa Simi' },
  { code: 'sa', label: 'संस्कृतम्' },
  { code: 'sc', label: 'Sardu' },
  { code: 'scn', label: 'Sicilianu' },
  { code: 'sco', label: 'Scots' },
  { code: 'sd', label: 'سنڌي' },
  { code: 'si', label: 'සිංහල' },
  { code: 'sl', label: 'Slovenščina' },
  { code: 'sq', label: 'Shqip' },
  { code: 'su', label: 'Basa Sunda' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'szl', label: 'Ślůnski' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'tg', label: 'Тоҷикӣ' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'tt', label: 'Татарча' },
  { code: 'ur', label: 'اردو' },
  { code: 'uz', label: 'Oʻzbekcha' },
  { code: 'vec', label: 'Vèneto' },
  { code: 'vls', label: 'West-Vlaoms' },
  { code: 'vo', label: 'Volapük' },
  { code: 'war', label: 'Waray' },
  { code: 'wuu', label: '吴语' },
  { code: 'xmf', label: 'მარგალური' },
  { code: 'yi', label: 'ייִדיש' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'zh-yue', label: '粵語 (Kantonesisch)' },
  { code: 'zu', label: 'isiZulu' },
];

function LangRow({ lang, selected, onSelect }: { lang: { code: string; label: string }; selected: boolean; onSelect: (code: string) => void }) {
  return (
    <button
      onClick={() => onSelect(lang.code)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-b border-[#c4a882]/15 last:border-0 transition-colors ${
        selected ? 'bg-[#700700] text-[#F5EDE0]' : 'bg-[#F9F3EA]/40 text-[#700700] hover:bg-[#EDE0CE]'
      }`}
    >
      <span className={`font-mono text-xs w-8 flex-shrink-0 ${selected ? 'text-[#F5EDE0]/60' : 'text-[#700700]/35'}`}>
        {lang.code}
      </span>
      <span className="font-medium flex-1 text-left">{lang.label}</span>
      {selected && (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0">
          <path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

type ConfigStep = 'language' | 'content';

interface ConfigWizardProps {
  selection: GeographicSelection;
  onBack: () => void;
  onSubmit: (config: WikidataConfig) => void;
}

export default function ConfigWizard({ selection, onBack, onSubmit }: ConfigWizardProps) {
  const t = useT();

  const STEPS: { id: ConfigStep; label: string }[] = [
    { id: 'language', label: t.config.stepLabels[0] },
    { id: 'content', label: t.config.stepLabels[1] },
  ];

  const [activeStep, setActiveStep] = useState<ConfigStep>('language');
  const [config, setConfig] = useState<WikidataConfig>({
    language: 'de',
    includeImages: false,
    linkDepth: 0,
    categories: [],
  });
  const [langSearch, setLangSearch] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === activeStep);
  const isLast = currentIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) onSubmit(config);
    else setActiveStep(STEPS[currentIndex + 1].id);
  };

  const handleBack = () => {
    if (currentIndex > 0) setActiveStep(STEPS[currentIndex - 1].id);
    else onBack();
  };

  const isSearching = langSearch.trim() !== '';

  const filteredPinned = isSearching
    ? PINNED_LANGUAGES.filter(
        (l) =>
          l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
          l.code.toLowerCase().includes(langSearch.toLowerCase())
      )
    : PINNED_LANGUAGES;

  const filteredOthers = OTHER_LANGUAGES.filter(
    (l) =>
      !isSearching ||
      l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const totalFiltered = filteredPinned.length + filteredOthers.length;

  const areaLabel = selection.label ?? (
    selection.type === 'polygon'
      ? t.config.selectionLabels.polygon(selection.points.length)
      : selection.type === 'route'
      ? (selection.filename ?? t.config.selectionLabels.route)
      : selection.type === 'rectangle'
      ? t.config.selectionLabels.rectangle
      : selection.type === 'admin-area'
      ? t.config.selectionLabels.adminArea
      : `${selection.center[1].toFixed(3)}° N`
  );

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      {/* ── Left: map preview ── */}
      <motion.div
        className="hidden md:block w-1/2 relative bg-[#EDE0CE]"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ minHeight: '100%' }}
      >
        {/* Map card */}
        <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 224, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(112,7,7,0.12)', border: '1px solid rgba(196,168,130,0.4)' }}>
          {selection.type === 'polygon' ? (
            <PolygonMap initialSelection={selection} interactive={false} />
          ) : selection.type === 'route' ? (
            <GpxMap trackPoints={selection.trackPoints} bufferPolygon={selection.polygon} interactive={false} />
          ) : selection.type === 'rectangle' ? (
            <RectangleMap initialSelection={selection} interactive={false} />
          ) : selection.type === 'admin-area' ? (
            <AdminAreaMap polygon={selection.polygon} bbox={selection.bbox} />
          ) : (
            <PointRadiusMap initialSelection={selection} interactive={false} compact />
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="bg-[#F9F3EA]/90 backdrop-blur-sm border border-[#c4a882]/50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#700700] flex items-center justify-center flex-shrink-0">
                {selection.type === 'polygon' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <polygon points="8,2 14,6 12,14 4,14 2,6" stroke="#F5EDE0" strokeWidth="1.5" fill="none" />
                  </svg>
                ) : selection.type === 'route' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 12 C4 8, 7 6, 8 8 C9 10, 12 7, 14 4" stroke="#F5EDE0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
                ) : selection.type === 'rectangle' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="4" width="12" height="8" stroke="#F5EDE0" strokeWidth="1.5" rx="1" fill="none" />
                  </svg>
                ) : selection.type === 'admin-area' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6 L8 3 L12 5 L14 9 L11 13 L5 13 L2 9 Z" stroke="#F5EDE0" strokeWidth="1.5" fill="none" />
                    <circle cx="8" cy="8" r="1.5" fill="#F5EDE0" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="#F5EDE0" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="8" cy="8" r="2.5" fill="#F5EDE0" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-[#700700] text-sm">{areaLabel}</p>
                <p className="text-xs text-[#700700]/55 mt-0.5">
                  {selection.type === 'polygon'
                    ? (() => {
                        const pts = selection.points;
                        let area = 0;
                        for (let i = 0; i < pts.length; i++) {
                          const j = (i + 1) % pts.length;
                          area += pts[i][0] * pts[j][1];
                          area -= pts[j][0] * pts[i][1];
                        }
                        area = Math.abs(area) / 2;
                        const avgLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
                        const cosL = Math.cos(avgLat * Math.PI / 180);
                        const areaKm2 = Math.round(area * 111 * 111 * cosL);
                        return `${pts.length} Punkte · ca. ${areaKm2.toLocaleString('de')} km²`;
                      })()
                    : selection.type === 'route'
                    ? `${selection.lengthKm?.toFixed(1) ?? '?'} km · Puffer ${selection.bufferKm} km`
                    : selection.type === 'rectangle'
                    ? (() => {
                        const cosL = Math.cos(((selection.sw[1] + selection.ne[1]) / 2) * Math.PI / 180);
                        const wKm = Math.round((selection.ne[0] - selection.sw[0]) * cosL * 111);
                        const hKm = Math.round((selection.ne[1] - selection.sw[1]) * 111);
                        return `${wKm} km × ${hKm} km`;
                      })()
                    : selection.type === 'admin-area'
                    ? (() => {
                        const pts = selection.polygon;
                        let area = 0;
                        for (let i = 0; i < pts.length; i++) {
                          const j = (i + 1) % pts.length;
                          area += pts[i][0] * pts[j][1];
                          area -= pts[j][0] * pts[i][1];
                        }
                        area = Math.abs(area) / 2;
                        const avgLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
                        const cosL = Math.cos(avgLat * Math.PI / 180);
                        const areaKm2 = Math.round(area * 111 * 111 * cosL);
                        return `ca. ${areaKm2.toLocaleString('de')} km²`;
                      })()
                    : `Radius ${selection.radiusKm} km · ca. ${Math.round(Math.PI * selection.radiusKm ** 2).toLocaleString('de')} km²`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Right: config steps ── */}
      <motion.div
        className="w-full md:w-1/2 flex flex-col overflow-hidden"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 md:px-12 py-10 md:py-14 pb-6">
          {/* Step indicator */}
          <div className="mb-10">
            <div className="flex items-center gap-1 mb-5">
              {STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-1">
                  <button
                    onClick={() => i <= currentIndex && setActiveStep(step.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      step.id === activeStep
                        ? 'bg-[#700700] text-[#F5EDE0]'
                        : i < currentIndex
                        ? 'bg-[#700700]/10 text-[#700700] cursor-pointer hover:bg-[#700700]/15'
                        : 'bg-[#c4a882]/20 text-[#b89370] cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none ${i < currentIndex ? 'bg-[#6B8F3E] text-white' : ''}`}>
                      {i < currentIndex ? '✓' : i + 1}
                    </span>
                    {step.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-4 ${i < currentIndex ? 'bg-[#700700]/30' : 'bg-[#c4a882]/25'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-medium text-[#700700]/35 uppercase tracking-widest">
              {t.config.stepOf(currentIndex + 2, STEPS.length + 1)}
            </p>
          </div>

          {/* Step content */}
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {/* ── Language step ── */}
            {activeStep === 'language' && (
              <div>
                <h2 className="text-3xl md:text-4xl font-serif text-[#700700] mb-2 leading-tight" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                  {t.config.langStep.heading}
                </h2>
                <p className="text-[#700700]/55 mb-6 leading-relaxed text-sm">
                  {t.config.langStep.description}
                </p>

                {/* Search */}
                <div className="relative mb-4">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#700700]/35">
                    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder={t.config.langStep.searchPlaceholder}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#c4a882] bg-[#F9F3EA]/60 text-[#700700] placeholder-[#700700]/30 text-sm outline-none focus:border-[#700700] transition-colors"
                  />
                </div>

                {/* Language list */}
                <div className="rounded-xl border border-[#c4a882]/50 overflow-hidden max-h-72 overflow-y-auto">
                  {totalFiltered === 0 ? (
                    <p className="px-4 py-6 text-sm text-[#700700]/40 text-center">{t.config.langStep.noResult}</p>
                  ) : (
                    <>
                      {/* Pinned section */}
                      {filteredPinned.length > 0 && (
                        <>
                          {!isSearching && (
                            <div className="px-4 py-1.5 text-xs font-medium text-[#700700]/35 uppercase tracking-wider bg-[#EDE0CE]/60 border-b border-[#c4a882]/20">
                              {t.config.langStep.common}
                            </div>
                          )}
                          {filteredPinned.map((lang) => (
                            <LangRow key={lang.code} lang={lang} selected={config.language === lang.code} onSelect={(code) => setConfig((c) => ({ ...c, language: code }))} />
                          ))}
                        </>
                      )}
                      {/* Other languages section */}
                      {filteredOthers.length > 0 && (
                        <>
                          {!isSearching && (
                            <div className="px-4 py-1.5 text-xs font-medium text-[#700700]/35 uppercase tracking-wider bg-[#EDE0CE]/60 border-t border-b border-[#c4a882]/20">
                              {t.config.langStep.moreLangs(OTHER_LANGUAGES.length)}
                            </div>
                          )}
                          {filteredOthers.map((lang) => (
                            <LangRow key={lang.code} lang={lang} selected={config.language === lang.code} onSelect={(code) => setConfig((c) => ({ ...c, language: code }))} />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Content step ── */}
            {activeStep === 'content' && (
              <div>
                <h2 className="text-3xl md:text-4xl font-serif text-[#700700] mb-2 leading-tight" style={{ fontFamily: 'Rakkas, Georgia, serif' }}>
                  {t.config.contentStep.heading}
                </h2>
                <p className="text-[#700700]/55 mb-7 leading-relaxed text-sm">
                  {t.config.contentStep.description}
                </p>

                <div className="space-y-4">
                  {/* Images toggle */}
                  <div className="p-5 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#700700] mb-1">{t.config.contentStep.images.label}</h3>
                        <p className="text-sm text-[#700700]/55 leading-relaxed">
                          {t.config.contentStep.images.desc}
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={config.includeImages}
                        onClick={() => setConfig((c) => ({ ...c, includeImages: !c.includeImages }))}
                        className={`relative inline-flex flex-shrink-0 h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          config.includeImages ? 'bg-[#700700]' : 'bg-[#c4a882]/50'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                            config.includeImages ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Link depth slider */}
                  <div className="p-5 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/50">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-[#700700]">{t.config.contentStep.linkDepth.label}</h3>
                      <span className="text-sm font-semibold text-[#700700] bg-[#700700]/10 px-2.5 py-0.5 rounded-full">
                        {config.linkDepth}
                      </span>
                    </div>
                    <p className="text-sm text-[#700700]/55 mb-4 leading-relaxed">
                      {t.config.contentStep.linkDepth.descriptions[config.linkDepth]}
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={config.linkDepth}
                      onChange={(e) => setConfig((c) => ({ ...c, linkDepth: Number(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#700700]/35 mt-1.5">
                      {[0, 1, 2, 3].map((n) => (
                        <span key={n} className={config.linkDepth === n ? 'text-[#700700] font-semibold' : ''}>{n}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#6B8F3E]/25 bg-[#6B8F3E]/5 flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0 text-[#6B8F3E]">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M7 5v3.5M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <p className="text-xs text-[#6B8F3E] leading-relaxed">
                      {t.config.contentStep.hint}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

        </div>

        {/* Navigation — pinned outside the scroll area */}
        <div className="flex-shrink-0 px-6 md:px-12 py-5 border-t border-[#c4a882]/25 flex items-center justify-between bg-[#F5EDE0]/96 backdrop-blur-sm">
          <Button variant="ghost" onClick={handleBack}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.5 3L5 6.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {currentIndex === 0 ? t.config.backFirst : t.config.back}
          </Button>
          <Button onClick={handleNext}>
            {isLast ? (
              <>
                {t.config.submit}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 6.5h5M7 4.5l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            ) : (
              <>
                {t.config.next}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M4.5 3L8 6.5 4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
