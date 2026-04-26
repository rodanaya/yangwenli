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
import esWatchlist from './locales/es/watchlist.json'
import enWatchlist from './locales/en/watchlist.json'
import esGlossary from './locales/es/glossary.json'
import enGlossary from './locales/en/glossary.json'
import esProcurement from './locales/es/procurement.json'
import enProcurement from './locales/en/procurement.json'
import esAdministrations from './locales/es/administrations.json'
import enAdministrations from './locales/en/administrations.json'
import esPrice from './locales/es/price.json'
import enPrice from './locales/en/price.json'
import esCases from './locales/es/cases.json'
import enCases from './locales/en/cases.json'
import esVendors from './locales/es/vendors.json'
import enVendors from './locales/en/vendors.json'
import esInstitutions from './locales/es/institutions.json'
import enInstitutions from './locales/en/institutions.json'
import esMethodology from './locales/es/methodology.json'
import enMethodology from './locales/en/methodology.json'
import esTemporal from './locales/es/temporal.json'
import enTemporal from './locales/en/temporal.json'
import esWorkspace from './locales/es/workspace.json'
import enWorkspace from './locales/en/workspace.json'
import esYearinreview from './locales/es/yearinreview.json'
import enYearinreview from './locales/en/yearinreview.json'
import esVendorcompare from './locales/es/vendorcompare.json'
import enVendorcompare from './locales/en/vendorcompare.json'
import esReportcard from './locales/es/reportcard.json'
import enReportcard from './locales/en/reportcard.json'
import esAria from './locales/es/aria.json'
import enAria from './locales/en/aria.json'
import esCaptura from './locales/es/captura.json'
import enCaptura from './locales/en/captura.json'
import esJournalists from './locales/es/journalists.json'
import enJournalists from './locales/en/journalists.json'
import esInstitutionleague from './locales/es/institutionleague.json'
import enInstitutionleague from './locales/en/institutionleague.json'
import esCollusion from './locales/es/collusion.json'
import enCollusion from './locales/en/collusion.json'
import esSettings from './locales/es/settings.json'
import enSettings from './locales/en/settings.json'
import esCategories from './locales/es/categories.json'
import enCategories from './locales/en/categories.json'
import esRedThread from './locales/es/redThread.json'
import enRedThread from './locales/en/redThread.json'
import esProcurementCalendar from './locales/es/procurementCalendar.json'
import enProcurementCalendar from './locales/en/procurementCalendar.json'
import esInstitutionScorecards from './locales/es/institutionScorecards.json'
import enInstitutionScorecards from './locales/en/institutionScorecards.json'
import esAuth from './locales/es/auth.json'
import enAuth from './locales/en/auth.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon, sectors: esSectors, nav: esNav, dashboard: esDashboard,
        explore: esExplore, contracts: esContracts, investigation: esInvestigation,
        executive: esExecutive, watchlist: esWatchlist,
        glossary: esGlossary,
        procurement: esProcurement, administrations: esAdministrations, price: esPrice,
        cases: esCases, vendors: esVendors, institutions: esInstitutions,
        methodology: esMethodology,
        temporal: esTemporal,
        workspace: esWorkspace,
        yearinreview: esYearinreview,
        vendorcompare: esVendorcompare,
        reportcard: esReportcard,
        aria: esAria,
        captura: esCaptura,
        journalists: esJournalists,
        institutionleague: esInstitutionleague,
        collusion: esCollusion,
        settings: esSettings,
        categories: esCategories,
        redThread: esRedThread,
        procurementCalendar: esProcurementCalendar,
        institutionScorecards: esInstitutionScorecards,
        auth: esAuth,
      },
      en: {
        common: enCommon, sectors: enSectors, nav: enNav, dashboard: enDashboard,
        explore: enExplore, contracts: enContracts, investigation: enInvestigation,
        executive: enExecutive, watchlist: enWatchlist,
        glossary: enGlossary,
        procurement: enProcurement, administrations: enAdministrations, price: enPrice,
        cases: enCases, vendors: enVendors, institutions: enInstitutions,
        methodology: enMethodology,
        temporal: enTemporal,
        workspace: enWorkspace,
        yearinreview: enYearinreview,
        vendorcompare: enVendorcompare,
        reportcard: enReportcard,
        aria: enAria,
        captura: enCaptura,
        journalists: enJournalists,
        institutionleague: enInstitutionleague,
        collusion: enCollusion,
        settings: enSettings,
        categories: enCategories,
        redThread: enRedThread,
        procurementCalendar: enProcurementCalendar,
        institutionScorecards: enInstitutionScorecards,
        auth: enAuth,
      },
    },
    lng: localStorage.getItem('i18nextLng') || 'en', // Default to English when no saved preference
    fallbackLng: 'en',
    detection: { order: ['localStorage'], caches: ['localStorage'] },
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

// Sync <html lang="..."> on init and on every language change so screen readers
// and browser spell-check pick up the correct language immediately.
i18n.on('initialized', () => {
  document.documentElement.lang = i18n.language
})
i18n.on('languageChanged', (lng: string) => {
  document.documentElement.lang = lng
})

export default i18n
