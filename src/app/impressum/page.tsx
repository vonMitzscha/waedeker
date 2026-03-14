'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useT } from '@/i18n';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const ICONS = [
  // Person / identity
  <svg key="identity" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 19c0-3.87 3.13-7 7-7h0c3.87 0 7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  // Envelope / contact
  <svg key="contact" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // Document / liability content
  <svg key="liability" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="4" y="2" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 7h8M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  // External link / links liability
  <svg key="links" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 3h6m0 0v6m0-6L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // Copyright / lock
  <svg key="copyright" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13.5 9a3 3 0 1 0 0 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  // Database / sources
  <svg key="sources" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <ellipse cx="11" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" stroke="currentColor" strokeWidth="1.5" />
  </svg>,
];

export default function ImpressumPage() {
  const t = useT();
  const s = t.impressum.sections;

  const sections = [
    {
      heading: s.identity.heading,
      body: null,
      custom: (
        <p className="text-sm text-[#700700]/65 leading-relaxed">
          {/* TODO: Name und Anschrift eintragen */}
          Marc Eric Mitzscherling<br />
        </p>
      ),
    },
    {
      heading: s.contact.heading,
      body: null,
      custom: (
        <p className="text-sm text-[#700700]/65 leading-relaxed">
          E-Mail:{' '}
          <a
            href={['mailto:support', 'mitzscherling.digital'].join('@')}
            className="underline underline-offset-2 hover:text-[#700700]/90"
          >
            {'support' + '\u0040' + 'mitzscherling' + '\u002E' + 'digital'}
          </a>
        </p>
      ),
    },
    { heading: s.liability.heading, body: s.liability.body, custom: null },
    { heading: s.links.heading, body: s.links.body, custom: null },
    { heading: s.copyright.heading, body: s.copyright.body, custom: null },
    { heading: s.sources.heading, body: s.sources.body, custom: null },
  ];

  return (
    <motion.div
      className="min-h-screen bg-[#F5EDE0] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Back button */}
      <div className="px-6 md:px-12 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#700700]/55 hover:text-[#700700] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.impressum.back}
        </Link>
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
            {t.impressum.title}
          </motion.h1>

          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono tracking-wide border border-[#6B8F3E]/40 bg-[#6B8F3E]/10 text-[#6B8F3E]">
              {t.impressum.badge}
            </span>
          </motion.div>

          <motion.div
            className="w-10 h-px bg-[#c4a882] mb-10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          />

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((sec, i) => (
              <motion.div
                key={i}
                className="flex gap-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl border border-[#c4a882]/60 bg-[#F9F3EA] flex items-center justify-center text-[#700700]/70 mt-0.5">
                  {ICONS[i]}
                </div>
                <div>
                  <h2 className="font-semibold text-[#700700] mb-2">{sec.heading}</h2>
                  {sec.custom ?? (
                    <p className="text-sm text-[#700700]/65 leading-relaxed">{sec.body}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
