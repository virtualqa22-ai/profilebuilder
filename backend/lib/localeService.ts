import enUS from '../../frontend/locales/en-US.json';
import enGB from '../../frontend/locales/en-GB.json';
import jaJP from '../../frontend/locales/ja-JP.json';
import enIN from '../../frontend/locales/en-IN.json';
import enCA from '../../frontend/locales/en-CA.json';
import arAE from '../../frontend/locales/ar-AE.json';
import enAU from '../../frontend/locales/en-AU.json';

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
  optionalFields?: { // New property for optional fields
    photos?: {
      enabled: boolean;
      required?: boolean; // Optional: if it can be required based on locale
    };
    certifications?: {
      enabled: boolean;
      required?: boolean;
    };
    hobbies?: {
      enabled: boolean;
      required?: boolean;
    };
    references?: {
      enabled: boolean;
      required?: boolean;
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
