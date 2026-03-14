'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useT } from '@/i18n';

interface HeroSectionProps {
  onStart: () => void;
  onExplain: () => void;
}

export default function HeroSection({ onStart, onExplain }: HeroSectionProps) {
  const t = useT();
  const explainLabels = t.hero.ctaExplainLabels;

  const [labelIdx, setLabelIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setLabelIdx((i) => (i + 1) % explainLabels.length);
        setVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, [explainLabels.length]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
      {/* Impressum link */}
      <a
        href="/impressum"
        className="absolute bottom-5 left-5 z-10 flex items-center gap-1.5 text-[#700700]/35 hover:text-[#700700]/70 transition-colors text-xs"
        aria-label="Impressum"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="#700700" fillOpacity="0.12" />
          <path d="M7 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="7" cy="4.5" r="0.6" fill="currentColor" />
        </svg>
        {t.hero.impressumLink}
      </a>
      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #700700 0%, transparent 65%)' }}
        />
      </div>

      <motion.div
        className="relative z-10 max-w-2xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Pronunciation badge */}
        <motion.p
          className="text-sm text-[#700700]/40 tracking-widest font-mono mb-5 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
        >
          {t.hero.pronunciation}
        </motion.p>

        {/* Wordmark */}
        <motion.h1
          className="text-6xl md:text-8xl font-serif text-[#700700] leading-none mb-5"
          style={{ fontFamily: "'Rakkas', Georgia, serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
        >
          Waedeker
        </motion.h1>

        {/* Slogan */}
        <motion.p
          className="text-lg md:text-xl text-[#700700]/60 italic mb-10 leading-snug"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {t.hero.slogan}
        </motion.p>

        {/* Divider */}
        <motion.div
          className="w-12 h-px bg-[#c4a882] mx-auto mb-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        />

        {/* Description */}
        <motion.p
          className="text-base md:text-lg text-[#700700]/65 max-w-lg mx-auto leading-relaxed mb-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {t.hero.description}
        </motion.p>

        {/* CTA */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          <Button size="lg" onClick={onStart}>
            {t.hero.ctaStart}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>

          <Button size="lg" variant="ghost" onClick={onExplain}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 11V10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M8 5C6.9 5 6 5.9 6 7h1.2c0-.66.36-1 .8-1 .44 0 .8.34.8.8 0 .5-.4.8-.9 1.1C7.4 8.2 7 8.7 7 9.5h1.2c0-.5.3-.75.75-1.02C9.5 8.2 10 7.6 10 6.8 10 5.8 9.1 5 8 5z" fill="currentColor" />
            </svg>
            <motion.span
              key={labelIdx}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ duration: 0.35 }}
            >
              {explainLabels[labelIdx]}
            </motion.span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Step cards */}
      <motion.div
        className="relative z-10 max-w-4xl mx-auto mt-20 w-full"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.8 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.hero.steps.map((item) => (
            <div
              key={item.num}
              className="p-6 rounded-2xl border border-[#c4a882]/50 bg-[#F9F3EA]/60 backdrop-blur-sm"
            >
              <div
                className="text-5xl font-serif text-[#700700]/15 mb-3 leading-none"
                style={{ fontFamily: "'Rakkas', Georgia, serif" }}
              >
                {item.num}
              </div>
              <h3 className="font-semibold text-[#700700] mb-2">{item.title}</h3>
              <p className="text-sm text-[#700700]/60 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
