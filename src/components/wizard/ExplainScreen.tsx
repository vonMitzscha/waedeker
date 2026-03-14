'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useT } from '@/i18n';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

const ICONS = [
  (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h8M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V3M14 5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3C7 3 4 6 4 9c0 4 7 10 7 10s7-6 7-10c0-3-3-6-7-6z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
];

export default function ExplainScreen({ onStart, onBack }: Props) {
  const t = useT();

  return (
    <motion.div
      className="min-h-screen bg-[#F5EDE0] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back button */}
      <div className="px-6 md:px-12 pt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[#700700]/55 hover:text-[#700700] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.explain.back}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full mx-auto">

          {/* Heading */}
          <motion.h1
            className="text-4xl md:text-5xl font-serif text-[#700700] mb-4 leading-tight"
            style={{ fontFamily: "'Rakkas', Georgia, serif" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
          >
            {t.explain.heading}
          </motion.h1>

          <motion.div
            className="w-10 h-px bg-[#c4a882] mb-10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          />

          {/* Sections */}
          <div className="space-y-8">
            {t.explain.sections.map((s, i) => (
              <motion.div
                key={i}
                className="flex gap-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.6 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl border border-[#c4a882]/60 bg-[#F9F3EA] flex items-center justify-center text-[#700700]/70 mt-0.5">
                  {ICONS[i]}
                </div>
                <div>
                  <h2 className="font-semibold text-[#700700] mb-2">{s.title}</h2>
                  <p className="text-sm text-[#700700]/65 leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Kiwix hint */}
          <motion.div
            className="mt-10 flex items-start gap-3 p-4 rounded-xl border border-[#c4a882]/40 bg-[#F9F3EA]/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0 text-[#700700]/50">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 5v3.5M7 10v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-[#700700]/60 leading-relaxed">
              {t.explain.kiwixNote}{' '}
              <a
                href="https://www.kiwix.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#700700]/90"
              >
                kiwix.org
              </a>
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button size="lg" onClick={onStart}>
              {t.explain.ctaStart}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
