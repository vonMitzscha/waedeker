'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { buildMapHtml } from '@/lib/wikidata';
import type { GeographicSelection, WikidataResult } from '@/types';

// ── Dummy data ────────────────────────────────────────────────────────────────

const DUMMY_ARTICLES = [
  { qid: 'Q1726',    title: 'München',                 label: 'München',                  coord: [11.5755, 48.1374] as [number,number], category: 'Großstadt',       categoryId: 'Q1637706' },
  { qid: 'Q158720',  title: 'Marienplatz',             label: 'Marienplatz',              coord: [11.5754, 48.1374] as [number,number], category: 'Platz',           categoryId: 'Q11660573' },
  { qid: 'Q193563',  title: 'Englischer Garten',       label: 'Englischer Garten',        coord: [11.5928, 48.1642] as [number,number], category: 'Park',            categoryId: 'Q22698' },
  { qid: 'Q154849',  title: 'Frauenkirche (München)',  label: 'Frauenkirche',             coord: [11.5734, 48.1386] as [number,number], category: 'Kirchengebäude',  categoryId: 'Q16970' },
  { qid: 'Q162244',  title: 'Deutsches Museum',        label: 'Deutsches Museum',         coord: [11.5832, 48.1299] as [number,number], category: 'Museum',          categoryId: 'Q33506' },
  { qid: 'Q162346',  title: 'Nymphenburg Palace',      label: 'Schloss Nymphenburg',      coord: [11.5031, 48.1583] as [number,number], category: 'Schloss',         categoryId: 'Q102496' },
  { qid: 'Q154981',  title: 'Hofbräuhaus am Platzl',  label: 'Hofbräuhaus',              coord: [11.5797, 48.1378] as [number,number], category: 'Brauereigaststätte', categoryId: 'Q187456' },
  { qid: 'Q156279',  title: 'Viktualienmarkt',         label: 'Viktualienmarkt',          coord: [11.5769, 48.1354] as [number,number], category: 'Markt',           categoryId: 'Q188913' },
  { qid: 'Q154810',  title: 'Maximilianstraße (München)', label: 'Maximilianstraße',     coord: [11.5888, 48.1396] as [number,number], category: 'Straße',          categoryId: 'Q79007' },
  { qid: 'Q163740',  title: 'Olympiapark München',    label: 'Olympiapark',              coord: [11.5517, 48.1733] as [number,number], category: 'Sportanlage',     categoryId: 'Q483110' },
  { qid: 'Q193619',  title: 'Alte Pinakothek',         label: 'Alte Pinakothek',          coord: [11.5697, 48.1482] as [number,number], category: 'Kunstmuseum',     categoryId: 'Q1030034' },
  { qid: 'Q193620',  title: 'Neue Pinakothek',         label: 'Neue Pinakothek',          coord: [11.5706, 48.1491] as [number,number], category: 'Kunstmuseum',     categoryId: 'Q1030034' },
  { qid: 'Q162214',  title: 'Residenz München',        label: 'Residenz München',         coord: [11.5790, 48.1412] as [number,number], category: 'Palast',          categoryId: 'Q16560' },
  { qid: 'Q320907',  title: 'Isar',                    label: 'Isar',                     coord: [11.5790, 48.1350] as [number,number], category: 'Fluss',           categoryId: 'Q4022' },
  { qid: 'Q154865',  title: 'Theresienwiese',          label: 'Theresienwiese',           coord: [11.5497, 48.1314] as [number,number], category: 'Freifläche',      categoryId: 'Q1497748' },
  { qid: 'Q193558',  title: 'BMW Museum',              label: 'BMW Museum',               coord: [11.5565, 48.1773] as [number,number], category: 'Museum',          categoryId: 'Q33506' },
  { qid: 'Q154924',  title: 'Rathaus-Glockenspiel',   label: 'Glockenspiel am Rathaus',  coord: [11.5753, 48.1375] as [number,number], category: 'Sehenswürdigkeit', categoryId: 'Q570116' },
  { qid: 'Q246810',  title: 'Gasteig',                 label: 'Gasteig',                  coord: [11.5912, 48.1284] as [number,number], category: 'Kulturzentrum',   categoryId: 'Q41253' },
  { qid: 'Q154952',  title: 'Siegestor',               label: 'Siegestor',                coord: [11.5818, 48.1502] as [number,number], category: 'Triumphbogen',    categoryId: 'Q1007846' },
  { qid: 'Q154911',  title: 'Maxvorstadt',             label: 'Maxvorstadt',              coord: [11.5700, 48.1500] as [number,number], category: 'Stadtviertel',    categoryId: 'Q15284' },
  { qid: 'Q154866',  title: 'Schwabing',               label: 'Schwabing',                coord: [11.5780, 48.1610] as [number,number], category: 'Stadtviertel',    categoryId: 'Q15284' },
  { qid: 'Q631009',  title: 'Odeonsplatz',             label: 'Odeonsplatz',              coord: [11.5774, 48.1421] as [number,number], category: 'Platz',           categoryId: 'Q11660573' },
  { qid: 'Q154895',  title: 'Feldherrnhalle',          label: 'Feldherrnhalle',           coord: [11.5779, 48.1409] as [number,number], category: 'Bauwerk',         categoryId: 'Q811979' },
  { qid: 'Q157297',  title: 'Lenbachhaus',             label: 'Lenbachhaus',              coord: [11.5671, 48.1484] as [number,number], category: 'Kunstmuseum',     categoryId: 'Q1030034' },
  { qid: 'Q670507',  title: 'Glyptothek (München)',    label: 'Glyptothek',               coord: [11.5666, 48.1469] as [number,number], category: 'Museum',          categoryId: 'Q33506' },
];

const DUMMY_SELECTIONS: Record<string, GeographicSelection> = {
  radius: {
    type: 'point-radius',
    center: [11.5755, 48.1374],
    radiusKm: 8,
    label: 'München',
  },
  rectangle: {
    type: 'rectangle',
    sw: [11.48, 48.10],
    ne: [11.67, 48.20],
    label: 'München Innenstadt',
  },
  polygon: {
    type: 'polygon',
    points: [
      [11.48, 48.12], [11.52, 48.10], [11.60, 48.09],
      [11.67, 48.13], [11.65, 48.20], [11.57, 48.22],
      [11.49, 48.19],
    ],
    label: 'Münchner Stadtgebiet',
  },
};

const DUMMY_RESULT: WikidataResult = {
  articleCount: DUMMY_ARTICLES.length,
  estimatedSizeMB: 42,
  articles: DUMMY_ARTICLES,
  linkedTitles: ['Bayern', 'Bundesrepublik Deutschland', 'Oktoberfest', 'FC Bayern München', 'Weißwurst', 'Hofbräu München'],
  linkCache: new Map(),
};

// ── Component ─────────────────────────────────────────────────────────────────

type SelectionKey = keyof typeof DUMMY_SELECTIONS;

export default function ZimPreviewPage() {
  const [selectionKey, setSelectionKey] = useState<SelectionKey>('radius');

  const html = useMemo(
    () => buildMapHtml(DUMMY_SELECTIONS[selectionKey], 'de', DUMMY_RESULT, DUMMY_SELECTIONS[selectionKey].label ?? 'München'),
    [selectionKey],
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#1a1a2e]">
      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-[#12121e] border-b border-white/10">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </Link>

        <div className="w-px h-4 bg-white/15" />

        <span className="text-white/35 text-xs font-mono uppercase tracking-wider">ZIM Startseite — Vorschau</span>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-white/35 text-xs mr-1">Auswahltyp:</span>
          {(Object.keys(DUMMY_SELECTIONS) as SelectionKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSelectionKey(k)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                k === selectionKey
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/8'
              }`}
            >
              {k === 'radius' ? 'Radius' : k === 'rectangle' ? 'Rechteck' : 'Polygon'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preview iframe ── */}
      <iframe
        key={selectionKey}
        srcDoc={html}
        className="flex-1 w-full border-0"
        title="ZIM Startseiten-Vorschau"
        sandbox="allow-scripts"
      />
    </div>
  );
}
