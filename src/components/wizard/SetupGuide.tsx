'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/i18n';
import type { Translations } from '@/i18n/types';
import { copyText } from '@/lib/clipboard';

type OS = 'mac' | 'windows' | 'linux';

function detectOS(): OS {
  if (typeof window === 'undefined') return 'mac';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return 'mac';
}

// ── Small helpers ────────────────────────────────────────────────────────────

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 decoration-[#700700]/30 hover:decoration-[#700700] transition-colors"
    >
      {children}
    </a>
  );
}

function Cmd({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-2">
      <code className="block px-4 py-2.5 pr-20 bg-[#700700]/6 border border-[#c4a882]/60 rounded-xl font-mono text-sm text-[#700700] select-all leading-relaxed">
        {children}
      </code>
      <button
        onClick={async () => {
          await copyText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
          copied
            ? 'text-[#6B8F3E] bg-[#6B8F3E]/10 border border-[#6B8F3E]/30'
            : 'text-[#700700]/35 bg-[#F9F3EA]/80 border border-[#c4a882]/40 hover:text-[#700700]/70'
        }`}
        aria-label="Kopieren"
      >
        {copied ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 3 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Kopiert
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="3" y="1" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
              <path d="M1 3v6h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Kopieren
          </>
        )}
      </button>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 px-3 py-2.5 rounded-xl bg-[#6B8F3E]/8 border border-[#6B8F3E]/20 text-xs text-[#700700]/65 leading-relaxed">
      {children}
    </div>
  );
}

// ── OS selector ──────────────────────────────────────────────────────────────

function OsSelector({ os, onChange, labels }: { os: OS; onChange: (os: OS) => void; labels: Translations['setupGuide']['os'] }) {
  return (
    <div className="flex gap-1 p-0.5 bg-[#EDE0CE] rounded-lg">
      {(['mac', 'windows', 'linux'] as OS[]).map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            os === o
              ? 'bg-[#F9F3EA] text-[#700700] shadow-sm'
              : 'text-[#700700]/45 hover:text-[#700700]/70'
          }`}
        >
          {o === 'mac' ? labels.mac : o === 'windows' ? labels.windows : labels.linux}
        </button>
      ))}
    </div>
  );
}

// ── Step illustrations (placeholder areas) ───────────────────────────────────

const ILLUSTRATIONS: { bg: string; icon: React.ReactNode }[] = [
  // 0 – Unzip
  {
    bg: 'linear-gradient(135deg, #EDE0CE 0%, #d8cdb8 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="10" y="14" width="44" height="52" rx="5" fill="#c4a882" opacity="0.3" />
        <rect x="16" y="8" width="36" height="48" rx="5" fill="#F9F3EA" stroke="#c4a882" strokeWidth="2" />
        <path d="M28 8v12h16" stroke="#c4a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 30v16M28 38l8 8 8-8" stroke="#700700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="22" y="50" width="28" height="6" rx="2" fill="#700700" opacity="0.15" />
      </svg>
    ),
  },
  // 1 – Docker install
  {
    bg: 'linear-gradient(135deg, #ddedf7 0%, #b8d8ee 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="8" y="34" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.7" />
        <rect x="21" y="34" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.7" />
        <rect x="34" y="34" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.7" />
        <rect x="21" y="23" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.5" />
        <rect x="34" y="23" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.5" />
        <rect x="34" y="12" width="10" height="8" rx="2" fill="#0db7ed" opacity="0.35" />
        <path d="M8 48c0 0 4 10 28 10s28-10 28-10H8z" fill="#0db7ed" opacity="0.25" />
        <path d="M8 48q8-4 20 0t20-4" stroke="#0db7ed" strokeWidth="2" fill="none" />
        <circle cx="58" cy="20" r="4" fill="#0db7ed" opacity="0.5" />
        <path d="M58 20c0 0 4-8 8-6" stroke="#0db7ed" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  // 2 – Docker start
  {
    bg: 'linear-gradient(135deg, #e8f0e0 0%, #d0e3c0 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="26" fill="#6B8F3E" opacity="0.12" stroke="#6B8F3E" strokeWidth="2" />
        <path d="M28 24l20 12-20 12V24z" fill="#6B8F3E" />
      </svg>
    ),
  },
  // 3 – Terminal
  {
    bg: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="8" y="16" width="56" height="40" rx="6" fill="#1e1e1e" stroke="#444" strokeWidth="1.5" />
        <rect x="8" y="16" width="56" height="12" rx="6" fill="#333" />
        <circle cx="20" cy="22" r="3" fill="#ff5f57" />
        <circle cx="30" cy="22" r="3" fill="#febc2e" />
        <circle cx="40" cy="22" r="3" fill="#28c840" />
        <path d="M16 38l8 4-8 4" stroke="#6B8F3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 46h16" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        <rect x="44" y="42" width="2" height="8" rx="1" fill="#ccc" />
      </svg>
    ),
  },
  // 4 – Navigate
  {
    bg: 'linear-gradient(135deg, #f0e8d0 0%, #e0d0b0 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <path d="M10 26c0-3.3 2.7-6 6-6h16l6 8h18c3.3 0 6 2.7 6 6v18c0 3.3-2.7 6-6 6H16c-3.3 0-6-2.7-6-6V26z" fill="#c4a882" opacity="0.4" stroke="#c4a882" strokeWidth="1.5" />
        <path d="M36 36v14M29 43l7 7 7-7" stroke="#700700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  // 5 – Build
  {
    bg: 'linear-gradient(135deg, #f5ede0 0%, #ead4b4 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="10" y="18" width="52" height="36" rx="6" fill="#F9F3EA" stroke="#c4a882" strokeWidth="1.5" />
        <path d="M18 30l6 6-6 6" stroke="#700700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 42h16" stroke="#700700" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M28 36h12" stroke="#700700" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
  },
  // 6 – Wait
  {
    bg: 'linear-gradient(135deg, #ede0ce 0%, #d8c8b0 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="24" fill="none" stroke="#c4a882" strokeWidth="3" />
        <path d="M36 18v18l12 6" stroke="#700700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="36" cy="36" r="3" fill="#700700" />
      </svg>
    ),
  },
  // 7 – Kiwix
  {
    bg: 'linear-gradient(135deg, #e0eed4 0%, #c8e0b4 100%)',
    icon: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="12" y="14" width="48" height="44" rx="5" fill="#6B8F3E" opacity="0.15" stroke="#6B8F3E" strokeWidth="2" />
        <path d="M20 28h32M20 36h24M20 44h16" stroke="#6B8F3E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="52" cy="48" r="12" fill="#6B8F3E" />
        <path d="M47 48l3 4 7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ── Step content builder ──────────────────────────────────────────────────────

interface StepDef {
  title: string;
  osSpecific?: boolean;
  body: (os: OS) => React.ReactNode;
}

function getSteps(t: Translations['setupGuide']): StepDef[] {
  const s = t.steps;
  return [
    // 0 – Unzip
    {
      title: s.unzip.title,
      body: () => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>
            {s.unzip.p1.split('ZIP-Datei').length > 1 ? (
              <>
                {s.unzip.p1.split(/\bZIP-Datei\b/)[0]}
                <strong className="text-[#700700]">ZIP-Datei</strong>
                {s.unzip.p1.split(/\bZIP-Datei\b/)[1]?.split(/\bDoppelklick\b/)[0]}
                {s.unzip.p1.includes('Doppelklick') && (
                  <><strong className="text-[#700700]">Doppelklick</strong>{s.unzip.p1.split(/\bDoppelklick\b/)[1]}</>
                )}
              </>
            ) : s.unzip.p1}
          </p>
          <p>
            {s.unzip.p2}
            <code className="block mt-1 px-3 py-2 bg-[#700700]/5 rounded-lg font-mono text-xs">
              articles.txt · docker-compose.yml · build.sh · README.md
            </code>
          </p>
          <p>{s.unzip.p3}</p>
          <Tip>
            <strong>{s.unzip.tipLabel}</strong>{' '}
            <code className="font-mono text-xs">{s.unzip.tipMacLinux}</code>{' '}
            <code className="font-mono text-xs">{s.unzip.tipWindows}</code>
          </Tip>
        </div>
      ),
    },

    // 1 – Docker install
    {
      title: s.docker.title,
      osSpecific: true,
      body: (os) => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.docker.intro}</p>
          {os === 'mac' && (
            <>
              <p>
                <strong className="text-[#700700]">{s.docker.mac.download}</strong>
              </p>
              <p className="text-center">
                <A href="https://www.docker.com/products/docker-desktop/">{s.docker.dockerLink}</A>
              </p>
              <p>{s.docker.mac.instructions}</p>
              <Tip>{s.docker.mac.tip}</Tip>
            </>
          )}
          {os === 'windows' && (
            <>
              <p>
                <strong className="text-[#700700]">{s.docker.windows.download}</strong>
              </p>
              <p className="text-center">
                <A href="https://www.docker.com/products/docker-desktop/">{s.docker.dockerLink}</A>
              </p>
              <p>{s.docker.windows.instructions}</p>
              <Tip>{s.docker.windows.tip}</Tip>
            </>
          )}
          {os === 'linux' && (
            <>
              <p>
                <strong className="text-[#700700]">{s.docker.linux.download}</strong>
              </p>
              <p className="text-center">
                <A href="https://www.docker.com/products/docker-desktop/">{s.docker.dockerLink}</A>
              </p>
              <p>{s.docker.linux.alt}</p>
              <Cmd>{'curl -fsSL https://get.docker.com | sh'}</Cmd>
              <Tip>
                {s.docker.linux.tip.split('docs.docker.com/engine/install')[0]}
                <A href="https://docs.docker.com/engine/install/">docs.docker.com/engine/install</A>
                {s.docker.linux.tip.split('docs.docker.com/engine/install')[1]}
              </Tip>
            </>
          )}
        </div>
      ),
    },

    // 2 – Docker start
    {
      title: s.dockerStart.title,
      osSpecific: true,
      body: (os) => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.dockerStart.intro}</p>
          {os === 'mac' && (
            <>
              <p>{s.dockerStart.mac.p1}</p>
              <p>{s.dockerStart.mac.p2}</p>
            </>
          )}
          {os === 'windows' && (
            <p>{s.dockerStart.windows.p}</p>
          )}
          {os === 'linux' && (
            <p>
              {s.dockerStart.linux.p}
              <Cmd>{'sudo systemctl start docker'}</Cmd>
            </p>
          )}
          <p>{os === 'windows' ? s.dockerStart.finalWindows : s.dockerStart.final}</p>
          <Tip>{s.dockerStart.tip}</Tip>
        </div>
      ),
    },

    // 3 – Terminal
    {
      title: s.terminal.title,
      osSpecific: true,
      body: (os) => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.terminal.intro}</p>
          {os === 'mac' && (
            <>
              <p>{s.terminal.mac.heading}</p>
              <ol className="space-y-1.5 list-none">
                {s.terminal.mac.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[#700700]/30 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span>{i === 0 ? (
                      <>Drücke <kbd className="px-1.5 py-0.5 rounded bg-[#EDE0CE] text-xs font-mono">⌘ Leertaste</kbd>{step.replace('Drücke ⌘ Leertaste', '')}</>
                    ) : step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {os === 'windows' && (
            <>
              <p>{s.terminal.windows.heading}</p>
              <ol className="space-y-1.5 list-none">
                {s.terminal.windows.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[#700700]/30 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {os === 'linux' && (
            <p>{s.terminal.linux.p}</p>
          )}
        </div>
      ),
    },

    // 4 – Navigate
    {
      title: s.navigate.title,
      osSpecific: true,
      body: (os) => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.navigate.intro}</p>
          {os === 'mac' && (
            <>
              <ol className="space-y-2 list-none">
                {s.navigate.mac.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[#700700]/30 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Tip>{s.navigate.mac.tip}</Tip>
            </>
          )}
          {os === 'windows' && (
            <>
              <ol className="space-y-2 list-none">
                {s.navigate.windows.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[#700700]/30 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Tip>{s.navigate.windows.tip}</Tip>
            </>
          )}
          {os === 'linux' && (
            <>
              <ol className="space-y-2 list-none">
                {s.navigate.linux.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono text-[#700700]/30 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Tip>{s.navigate.linux.tip}</Tip>
            </>
          )}
        </div>
      ),
    },

    // 5 – Build
    {
      title: s.build.title,
      body: () => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.build.p1}</p>
          <Cmd>{'docker compose up && docker compose down'}</Cmd>
          <p>{s.build.p2}</p>
          <ul className="space-y-1.5 list-none">
            {s.build.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6B8F3E] mt-1.5 flex-shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <Tip>{s.build.tip}</Tip>
        </div>
      ),
    },

    // 6 – Wait
    {
      title: s.wait.title,
      body: () => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.wait.p1}</p>
          <p>
            {s.wait.p2}
            <code className="block mt-1 px-3 py-2 bg-[#700700]/5 rounded-lg font-mono text-xs text-[#6B8F3E]">
              mwoffliner   | Finished. Output: /output/wikipedia_….zim
            </code>
          </p>
          <p>{s.wait.p3}</p>
          <Tip>{s.wait.tip}</Tip>
        </div>
      ),
    },

    // 7 – Kiwix
    {
      title: s.kiwix.title,
      body: () => (
        <div className="space-y-3 text-sm text-[#700700]/75 leading-relaxed">
          <p>{s.kiwix.p1}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: s.kiwix.apps.desktop, href: 'https://www.kiwix.org/de/applications/' },
              { label: s.kiwix.apps.android, href: 'https://play.google.com/store/apps/details?id=org.kiwix.kiwixmobile' },
              { label: s.kiwix.apps.ios, href: 'https://apps.apple.com/app/kiwix/id997079563' },
              { label: s.kiwix.apps.browser, href: 'https://www.kiwix.org/de/applications/' },
            ].map((app) => (
              <a
                key={app.label}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-[#c4a882]/40 bg-[#F9F3EA]/60 hover:bg-[#F9F3EA] hover:border-[#c4a882] transition-all text-xs text-[#700700] font-medium"
              >
                <div className="w-5 h-5 rounded-md bg-[#6B8F3E]/15 flex-shrink-0 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2h6v6H2z" stroke="#6B8F3E" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M4 5h2M5 4v2" stroke="#6B8F3E" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </div>
                {app.label}
              </a>
            ))}
          </div>
          <p>{s.kiwix.p2}</p>
          <Tip>{s.kiwix.tip}</Tip>
        </div>
      ),
    },
  ];
}

// ── Main component ────────────────────────────────────────────────────────────

interface SetupGuideProps {
  onClose: () => void;
}

export default function SetupGuide({ onClose }: SetupGuideProps) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [os, setOs] = useState<OS>('mac');
  const [dir, setDir] = useState<1 | -1>(1);

  const steps = useMemo(() => getSteps(t.setupGuide), [t.setupGuide]);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && step < steps.length - 1) { setDir(1); setStep((s) => s + 1); }
      if (e.key === 'ArrowLeft' && step > 0) { setDir(-1); setStep((s) => s - 1); }
      if (e.key === 'Escape') onClose();
    },
    [step, steps.length, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const current = steps[step];
  const illus = ILLUSTRATIONS[step];
  const isLast = step === steps.length - 1;

  const goTo = (nextStep: number) => {
    setDir(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[#1a0000]/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-3xl bg-[#F9F3EA] rounded-3xl border border-[#c4a882]/60 shadow-2xl overflow-hidden flex flex-col sm:flex-row"
        style={{ height: 'min(88vh, 475px)' }}
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        {/* ── Left: Illustration ── */}
        <div
          className="hidden sm:flex w-[44%] flex-col items-center justify-center p-8 relative flex-shrink-0"
          style={{ background: illus.bg, transition: 'background 0.5s' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
            >
              {illus.icon}
            </motion.div>
          </AnimatePresence>

          {/* Step dots */}
          <div className="absolute bottom-5 flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-1.5 bg-[#700700]/50'
                    : 'w-1.5 h-1.5 bg-[#700700]/20 hover:bg-[#700700]/35'
                }`}
                aria-label={t.setupGuide.nav.stepLabel(i + 1)}
              />
            ))}
          </div>

          {/* Placeholder label */}
          <span className="absolute top-3 left-3 text-[10px] text-[#700700]/20 font-mono select-none">
            {t.setupGuide.placeholder}
          </span>
        </div>

        {/* ── Right: Content ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
            {current.osSpecific ? (
              <OsSelector os={os} onChange={setOs} labels={t.setupGuide.os} />
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#700700]/35 hover:text-[#700700] hover:bg-[#EDE0CE] transition-all"
              aria-label={t.setupGuide.nav.close}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Step number + title */}
          <div className="px-6 pb-2 flex-shrink-0">
            <p className="text-xs text-[#700700]/35 uppercase tracking-widest font-medium mb-1">
              {t.setupGuide.nav.stepOf(step + 1, steps.length)}
            </p>
            <AnimatePresence mode="wait">
              <motion.h2
                key={`title-${step}`}
                initial={{ opacity: 0, x: dir * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -16 }}
                transition={{ duration: 0.2 }}
                className="text-xl text-[#700700] leading-tight"
                style={{ fontFamily: 'Rakkas, Georgia, serif' }}
              >
                {current.title}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={`body-${step}-${os}`}
                initial={{ opacity: 0, x: dir * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -20 }}
                transition={{ duration: 0.2 }}
              >
                {current.body(os)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#c4a882]/25 flex-shrink-0">
            {/* Prev */}
            <button
              onClick={() => { setDir(-1); setStep((s) => s - 1); }}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#700700]/50 hover:text-[#700700] hover:bg-[#EDE0CE] disabled:opacity-0 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.setupGuide.nav.back}
            </button>

            {/* Next / Done */}
            <button
              onClick={() => {
                if (isLast) { onClose(); }
                else { setDir(1); setStep((s) => s + 1); }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLast
                  ? 'bg-[#6B8F3E] text-white hover:bg-[#5a7a33]'
                  : 'bg-[#700700] text-[#F5EDE0] hover:bg-[#8a0a0a]'
              }`}
            >
              {isLast ? t.setupGuide.nav.done : t.setupGuide.nav.next}
              {!isLast && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3.5 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
