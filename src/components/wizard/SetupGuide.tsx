'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
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

// ── Step image paths ──────────────────────────────────────────────────────────

const STEP_IMAGES = [
  '/setupguide/step1.jpeg',
  '/setupguide/step2.jpeg',
  '/setupguide/step3.jpeg',
  '/setupguide/step4.jpeg',
  '/setupguide/step5.jpeg',
  '/setupguide/step6.jpeg',
  '/setupguide/step7.jpeg',
  '/setupguide/step8.jpeg',
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
  const stepImage = STEP_IMAGES[step];
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
        {/* ── Left: Step image ── */}
        <div className="hidden sm:block w-[44%] relative flex-shrink-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={stepImage}
                alt={`Schritt ${step + 1}`}
                fill
                className="object-cover object-center"
                priority
              />
            </motion.div>
          </AnimatePresence>

          {/* Step dots */}
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 z-10">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-1.5 bg-white/80'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={t.setupGuide.nav.stepLabel(i + 1)}
              />
            ))}
          </div>
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
