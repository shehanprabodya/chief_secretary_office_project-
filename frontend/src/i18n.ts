import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const applyDocumentLanguage = (language: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = language.startsWith('si') ? 'si' : 'en';
  document.documentElement.lang = normalized;
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'si'],
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'appLanguage',
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

applyDocumentLanguage(i18n.language || 'en');
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
