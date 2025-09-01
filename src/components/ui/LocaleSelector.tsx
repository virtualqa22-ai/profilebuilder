import { getLocales } from '@/lib/localeService';
import ReactFlagsSelect from 'react-flags-select';

interface LocaleSelectorProps {
  onLocaleChange: (locale: string) => void;
}

export default function LocaleSelector({ onLocaleChange }: LocaleSelectorProps) {
  const locales = getLocales();
  const countryCodes = locales.map(l => l.locale.split('-')[1]);

  const onSelect = (code: string) => {
    const selectedLocale = locales.find(l => l.locale.split('-')[1] === code);
    if (selectedLocale) {
      onLocaleChange(selectedLocale.locale);
    }
  }

  return (
    <div className="my-4">
      <ReactFlagsSelect
        countries={countryCodes}
        onSelect={onSelect}
        selected="US"
      />
    </div>
  );
}
