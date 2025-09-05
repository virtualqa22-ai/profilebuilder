"use client";

import { useEffect, useState } from 'react';
import ReactFlagsSelect from 'react-flags-select';
import { useLocale } from '@/lib/locale';

interface Locale { locale: string; countryCode?: string }

export default function LocaleSelector() {
  const { locale, setLocale, availableLocales } = useLocale();
  const [loading, setLoading] = useState(false);

  useEffect(() => { setLoading(false); }, []);

  if (loading) return <div className="my-4 inline-block bg-white p-2 rounded-md shadow-sm">Loading locales...</div>;
  if (!availableLocales.length) return null;

  const countryCodes = availableLocales.map(l => l.locale.split('-')[1] || 'US');

  const onSelect = (code: string) => {
    const selectedLocale = availableLocales.find(l => (l.locale.split('-')[1]) === code);
    if (selectedLocale) setLocale(selectedLocale.locale);
  }

  return (
    <div className="my-4 inline-block bg-white p-2 rounded-md shadow-sm">
      <label htmlFor="locale-selector" className="mr-2 font-medium text-gray-700">Select Locale:</label>
      <ReactFlagsSelect
        id="locale-selector"
        countries={countryCodes}
        onSelect={onSelect}
        selected={locale.split('-')[1] || countryCodes[0]}
        selectedSize={22}
        optionsSize={18}
        className="react-flags-select"
      />
    </div>
  );
}
