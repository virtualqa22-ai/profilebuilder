import enUS from '@/locales/en-US.json';
import enGB from '@/locales/en-GB.json';
import jaJP from '@/locales/ja-JP.json';
import enIN from '@/locales/en-IN.json';
import enCA from '@/locales/en-CA.json';
import arAE from '@/locales/ar-AE.json';
import enAU from '@/locales/en-AU.json';

export interface ILocale {
  locale: string;
  name: string;
  dateFormat: string;
  sections: {
    [key: string]: {
      label: string;
      placeholder?: string;
      fields?: {
        [key: string]: {
          label: string;
          placeholder: string;
          optional?: boolean;
        };
      };
      order?: string[];
    };
  };
}

const locales: { [key: string]: ILocale } = {
  'en-US': enUS,
  'en-GB': enGB,
  'ja-JP': jaJP,
  'en-IN': enIN,
  'en-CA': enCA,
  'ar-AE': arAE,
  'en-AU': enAU,
};

export const getLocales = (): ILocale[] => {
  return Object.values(locales);
};

export const getLocaleByCode = (code: string): ILocale | undefined => {
  return locales[code];
};