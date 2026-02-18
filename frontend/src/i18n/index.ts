import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import locale files
import esCommon from './locales/es/common.json'
import enCommon from './locales/en/common.json'
import esSectors from './locales/es/sectors.json'
import enSectors from './locales/en/sectors.json'
import esNav from './locales/es/nav.json'
import enNav from './locales/en/nav.json'
import esDashboard from './locales/es/dashboard.json'
import enDashboard from './locales/en/dashboard.json'
import esExplore from './locales/es/explore.json'
import enExplore from './locales/en/explore.json'
import esContracts from './locales/es/contracts.json'
import enContracts from './locales/en/contracts.json'
import esInvestigation from './locales/es/investigation.json'
import enInvestigation from './locales/en/investigation.json'
import esExecutive from './locales/es/executive.json'
import enExecutive from './locales/en/executive.json'
import esPatterns from './locales/es/patterns.json'
import enPatterns from './locales/en/patterns.json'
import esWatchlist from './locales/es/watchlist.json'
import enWatchlist from './locales/en/watchlist.json'
import esGlossary from './locales/es/glossary.json'
import enGlossary from './locales/en/glossary.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon, sectors: esSectors, nav: esNav, dashboard: esDashboard,
        explore: esExplore, contracts: esContracts, investigation: esInvestigation,
        executive: esExecutive, patterns: esPatterns, watchlist: esWatchlist,
        glossary: esGlossary,
      },
      en: {
        common: enCommon, sectors: enSectors, nav: enNav, dashboard: enDashboard,
        explore: enExplore, contracts: enContracts, investigation: enInvestigation,
        executive: enExecutive, patterns: enPatterns, watchlist: enWatchlist,
        glossary: enGlossary,
      },
    },
    lng: 'es', // Default to Spanish
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n
