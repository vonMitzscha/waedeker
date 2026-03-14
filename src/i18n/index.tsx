'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, type JSX } from 'react';
import type { Locale, Translations } from './types';
import de from './de';
import en from './en';

const TRANSLATIONS: Record<Locale, Translations> = { de, en };

const STORAGE_KEY = 'waedeker-locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'de',
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>('de');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === 'de' || stored === 'en')) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage unavailable (SSR or private mode)
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT(): Translations {
  const { locale } = useContext(LocaleContext);
  return TRANSLATIONS[locale];
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
