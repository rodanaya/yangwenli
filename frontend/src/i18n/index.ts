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
import esSpending from './locales/es/spending.json'
import enSpending from './locales/en/spending.json'
import esRedflags from './locales/es/redflags.json'
import enRedflags from './locales/en/redflags.json'
import esProcurement from './locales/es/procurement.json'
import enProcurement from './locales/en/procurement.json'
import esAdministrations from './locales/es/administrations.json'
import enAdministrations from './locales/en/administrations.json'
import esPrice from './locales/es/price.json'
import enPrice from './locales/en/price.json'
import esNetwork from './locales/es/network.json'
import enNetwork from './locales/en/network.json'
import esCases from './locales/es/cases.json'
import enCases from './locales/en/cases.json'
import esVendors from './locales/es/vendors.json'
import enVendors from './locales/en/vendors.json'
import esInstitutions from './locales/es/institutions.json'
import enInstitutions from './locales/en/institutions.json'
import esLimitations from './locales/es/limitations.json'
import enLimitations from './locales/en/limitations.json'
import esMethodology from './locales/es/methodology.json'
import enMethodology from './locales/en/methodology.json'
import esMoneyflow from './locales/es/moneyflow.json'
import enMoneyflow from './locales/en/moneyflow.json'
import esTemporal from './locales/es/temporal.json'
import enTemporal from './locales/en/temporal.json'
import esPatterns from './locales/es/patterns.json'
import enPatterns from './locales/en/patterns.json'
import esWorkspace from './locales/es/workspace.json'
import enWorkspace from './locales/en/workspace.json'
import esSubnational from './locales/es/subnational.json'
import enSubnational from './locales/en/subnational.json'
import esYearinreview from './locales/es/yearinreview.json'
import enYearinreview from './locales/en/yearinreview.json'
import esLanding from './locales/es/landing.json'
import enLanding from './locales/en/landing.json'
import esVendorcompare from './locales/es/vendorcompare.json'
import enVendorcompare from './locales/en/vendorcompare.json'
import esApiexplorer from './locales/es/apiexplorer.json'
import enApiexplorer from './locales/en/apiexplorer.json'
import esReportcard from './locales/es/reportcard.json'
import enReportcard from './locales/en/reportcard.json'
import esAria from './locales/es/aria.json'
import enAria from './locales/en/aria.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon, sectors: esSectors, nav: esNav, dashboard: esDashboard,
        explore: esExplore, contracts: esContracts, investigation: esInvestigation,
        executive: esExecutive, watchlist: esWatchlist,
        glossary: esGlossary, spending: esSpending,
        redflags: esRedflags,
        procurement: esProcurement, administrations: esAdministrations, price: esPrice,
        network: esNetwork, cases: esCases, vendors: esVendors, institutions: esInstitutions,
        limitations: esLimitations, methodology: esMethodology,
        moneyflow: esMoneyflow, temporal: esTemporal, patterns: esPatterns,
        workspace: esWorkspace,
        subnational: esSubnational,
        yearinreview: esYearinreview,
        landing: esLanding,
        vendorcompare: esVendorcompare,
        apiexplorer: esApiexplorer,
        reportcard: esReportcard,
        aria: esAria,
      },
      en: {
        common: enCommon, sectors: enSectors, nav: enNav, dashboard: enDashboard,
        explore: enExplore, contracts: enContracts, investigation: enInvestigation,
        executive: enExecutive, watchlist: enWatchlist,
        glossary: enGlossary, spending: enSpending,
        redflags: enRedflags,
        procurement: enProcurement, administrations: enAdministrations, price: enPrice,
        network: enNetwork, cases: enCases, vendors: enVendors, institutions: enInstitutions,
        limitations: enLimitations, methodology: enMethodology,
        moneyflow: enMoneyflow, temporal: enTemporal, patterns: enPatterns,
        workspace: enWorkspace,
        subnational: enSubnational,
        yearinreview: enYearinreview,
        landing: enLanding,
        vendorcompare: enVendorcompare,
        apiexplorer: enApiexplorer,
        reportcard: enReportcard,
        aria: enAria,
      },
    },
    lng: localStorage.getItem('i18nextLng') || 'en', // Default to English when no saved preference
    fallbackLng: 'en',
    detection: { order: ['localStorage'], caches: ['localStorage'] },
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n
