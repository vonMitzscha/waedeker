'use client';

import { motion } from 'framer-motion';
import type { SelectionMode } from '@/types';
import { useT } from '@/i18n';

interface ModeCard {
  mode: SelectionMode;
  icon: React.ReactNode;
  available: boolean;
  label?: string;
}

const MODE_ICONS: ModeCard[] = [
  {
    mode: 'point-radius',
    available: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <circle cx="20" cy="20" r="3" fill="currentColor" />
        <line x1="20" y1="4" x2="20" y2="36" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
        <line x1="4" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      </svg>
    ),
  },
  {
    mode: 'rectangle',
    available: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="10" width="28" height="20" stroke="currentColor" strokeWidth="1.5" rx="2" opacity="0.5" />
        <circle cx="6" cy="10" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="34" cy="10" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="6" cy="30" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="34" cy="30" r="2.5" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    mode: 'polygon',
    available: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <polygon points="20,6 34,16 30,32 10,32 6,16" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        <circle cx="20" cy="6" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="34" cy="16" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="30" cy="32" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="10" cy="32" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="6" cy="16" r="2.5" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    mode: 'route',
    available: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M8 28 C12 20, 16 16, 20 18 C24 20, 28 14, 32 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M8 28 C12 20, 16 16, 20 18 C24 20, 28 14, 32 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.1" />
        <circle cx="8" cy="28" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="32" cy="12" r="2.5" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    mode: 'admin-area',
    available: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M9 13 L17 7 L27 10 L34 18 L30 29 L20 34 L10 29 L6 20 Z"
          stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.07" opacity="0.7" />
        <path d="M17 7 L19 20 L20 34" stroke="currentColor" strokeWidth="0.75" opacity="0.25" />
        <path d="M9 13 L19 20 L30 29" stroke="currentColor" strokeWidth="0.75" opacity="0.25" />
        <circle cx="19" cy="20" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="13" cy="15" r="1.5" fill="currentColor" opacity="0.35" />
        <circle cx="27" cy="25" r="1.5" fill="currentColor" opacity="0.35" />
      </svg>
    ),
  },
];

interface ModeSelectSectionProps {
  onSelect: (mode: SelectionMode) => void;
}

export default function ModeSelectSection({ onSelect }: ModeSelectSectionProps) {
  const t = useT();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <motion.div
        className="max-w-4xl mx-auto w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-[#700700]/50 uppercase tracking-widest mb-4">
            {t.modeSelect.step}
          </p>
          <h2
            className="text-4xl md:text-5xl font-serif text-[#700700] mb-5"
            style={{ fontFamily: "'Rakkas', Georgia, serif" }}
          >
            {t.modeSelect.heading}
            <br />
            <span className="italic">{t.modeSelect.headingItalic}</span>
          </h2>
          <p className="text-[#700700]/60 max-w-md mx-auto leading-relaxed">
            {t.modeSelect.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MODE_ICONS.map((item, i) => {
            const modeT = t.modeSelect.modes[i];
            return (
              <motion.div
                key={item.mode}
                className="h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
              >
                <button
                  onClick={() => item.available && onSelect(item.mode)}
                  disabled={!item.available}
                  className={`
                    group w-full h-full text-left p-7 rounded-2xl border transition-all duration-300
                    ${item.available
                      ? 'border-[#c4a882] bg-[#F9F3EA]/60 hover:bg-[#F9F3EA] hover:border-[#700700] hover:shadow-lg cursor-pointer'
                      : 'border-[#c4a882]/30 bg-[#F9F3EA]/20 cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className={`text-[#700700] transition-transform duration-300 ${item.available ? 'group-hover:scale-110' : ''}`}>
                      {item.icon}
                    </div>
                    {item.mode === 'admin-area' && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#6B8F3E]/10 text-[#6B8F3E] border border-[#6B8F3E]/20">
                        {t.modeSelect.newBadge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-[#700700] mb-2">{modeT.title}</h3>
                  <p className="text-sm text-[#700700]/60 leading-relaxed">{modeT.desc}</p>
                  {item.available && (
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-[#700700] opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.modeSelect.select}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
