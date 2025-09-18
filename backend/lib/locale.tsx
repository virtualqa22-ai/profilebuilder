"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLocales, getLocaleByCode, ILocale } from './localeService';

interface LocaleContextValue {
  locale: string;
  setLocale: (l: string) => void;
  localeData?: ILocale;
  availableLocales: ILocale[];
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('cv_locale')) || 'en-US');
  const [availableLocales, setAvailableLocales] = useState<ILocale[]>([]);
  const [localeData, setLocaleData] = useState<ILocale | undefined>(undefined);

  useEffect(() => {
    // load static locales from localeService
    try {
      const list = getLocales();
      setAvailableLocales(list);
    } catch (e) {
      setAvailableLocales([]);
    }
  }, []);

  useEffect(() => {
    try {
      const d = getLocaleByCode(locale);
      setLocaleData(d);
    } catch (e) {
      setLocaleData(undefined);
    }
    try { localStorage.setItem('cv_locale', locale); } catch (e) { /* ignore */ }
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, localeData, availableLocales }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
