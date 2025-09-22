"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Lang = 'en' | 'de' | 'hi' | 'ja' | 'ru';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

async function loadTranslations(lang: Lang) {
  try {
    const mod = await import(`../i18n/${lang}.json`);
    return (mod && (mod.default || mod));
  } catch (e) {
    const fallback = await import(`../i18n/en.json`);
    return (fallback && (fallback.default || fallback));
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>((typeof window !== 'undefined' && (localStorage.getItem('cv_lang') as Lang)) || 'en');
  const [t, setT] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    loadTranslations(lang).then((m) => {
      if (!mounted) return;
      setT(m);
      try { document.documentElement.lang = lang; } catch (e) { /* ignore SSR */ }
    });
    try { localStorage.setItem('cv_lang', lang); } catch (e) { /* ignore */ }
    return () => { mounted = false };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}