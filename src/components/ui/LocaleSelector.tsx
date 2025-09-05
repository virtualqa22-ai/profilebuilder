"use client";

import { useEffect, useState } from 'react';
import ReactFlagsSelect from 'react-flags-select';

interface Locale { locale: string; countryCode?: string }

interface LocaleSelectorProps {
  onLocaleChange: (locale: string) => void;
}

export default function LocaleSelector({ onLocaleChange }: LocaleSelectorProps) {
  const [locales, setLocales] = useState<Locale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/locales')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        // Expect array of locale objects with `locale` like "en-US"
        const parsed: Locale[] = data?.map((l: any) => ({
          locale: l.locale || `${l.countryCode ? 'en-' + l.countryCode : 'en-US'}`,
          countryCode: l.locale ? l.locale.split('-')[1] : l.countryCode,
        })) || [];
        setLocales(parsed);
      })
      .catch(() => setLocales([]))
      .finally(() => setLoading(false));
    return () => { mounted = false };
  }, []);

  if (loading) return <div className="my-4 inline-block bg-white p-2 rounded-md shadow-sm">Loading locales...</div>;
  if (!locales.length) return null;

  const countryCodes = locales.map(l => l.countryCode || l.locale.split('-')[1] || 'US');

  const onSelect = (code: string) => {
    const selectedLocale = locales.find(l => (l.countryCode || l.locale.split('-')[1]) === code);
    if (selectedLocale) {
      onLocaleChange(selectedLocale.locale);
    }
  }

  return (
    <div className="my-4 inline-block bg-white p-2 rounded-md shadow-sm">
      <ReactFlagsSelect
        countries={countryCodes}
        onSelect={onSelect}
        selected={countryCodes[0]}
        selectedSize={22}
        optionsSize={18}
        className="react-flags-select"
      />
    </div>
  );
}
