'use client';

import { type ReactNode } from 'react';
import { LocaleProvider } from '@/i18n';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
