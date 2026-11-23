import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../locales/en/common.json';
import pl from '../../locales/pl/common.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DEFAULT_LANGUAGE: AppLanguage = 'pl';
const STORAGE_KEY = 'hcm-language';

const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  pl: 'pl-PL',
  en: 'en-US',
};

function readInitialLanguage(): AppLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.find((language) => language === stored) ?? DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: {
    pl: { common: pl },
    en: { common: en },
  },
  lng: readInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

document.documentElement.lang = i18n.language;

export function setAppLanguage(language: AppLanguage): void {
  localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  void i18n.changeLanguage(language);
}

export function currentLanguage(): AppLanguage {
  return SUPPORTED_LANGUAGES.find((language) => language === i18n.language) ?? DEFAULT_LANGUAGE;
}

export function currentLocale(): string {
  return LOCALE_BY_LANGUAGE[currentLanguage()];
}

export default i18n;
