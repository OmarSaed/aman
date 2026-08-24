// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import enProducts from './locales/en/products.json';
import arProducts from './locales/ar/products.json';
import enSettings from './locales/en/settings.json';
import arSettings from './locales/ar/settings.json';
import enStorefront from './locales/en/storefront.json';
import arStorefront from './locales/ar/storefront.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, products: enProducts, settings: enSettings, storefront: enStorefront },
      ar: { common: arCommon, products: arProducts, settings: arSettings, storefront: arStorefront },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Apply RTL direction on load
const applyDirection = (lang) => {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('data-lang', lang);
};
applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;
