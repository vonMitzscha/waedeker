'use client';

import { useLocale } from '@/i18n';
import type { Locale } from '@/i18n/types';

const LOCALES: Locale[] = ['de', 'en'];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 p-0.5 bg-[#F9F3EA]/90 backdrop-blur-sm border border-[#c4a882]/60 rounded-lg shadow-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
            locale === l
              ? 'bg-[#700700] text-[#F5EDE0] shadow-sm'
              : 'text-[#700700]/40 hover:text-[#700700]/70'
          }`}
          aria-label={l === 'de' ? 'Deutsch' : 'English'}
          aria-pressed={locale === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
