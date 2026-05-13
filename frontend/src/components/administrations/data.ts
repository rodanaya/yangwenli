/**
 * Static data for /administrations and its extracted helpers.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) so dossier-panel
 * and grade-card components can be split out of the page module without
 * circular imports.
 */
import type { DossierEntry, AdminMeta } from './types'

/** The 5 modern federal administrations covered by RUBLI's data window. */
export const ADMINISTRATIONS: readonly AdminMeta[] = [
  { name: 'Fox',       fullName: 'Vicente Fox',                   start: 2001, end: 2006, dataStart: 2002, color: '#3b82f6', party: 'PAN',    wikiArticle: 'Vicente_Fox_Quesada' },
  { name: 'Calderon',  fullName: 'Felipe Calderon',               start: 2006, end: 2012, dataStart: 2006, color: '#22c55e', party: 'PAN',    wikiArticle: 'Felipe_Calderón_Hinojosa' },
  { name: 'Pena Nieto',fullName: 'Enrique Pena Nieto',            start: 2012, end: 2018, dataStart: 2012, color: '#ef4444', party: 'PRI',    wikiArticle: 'Enrique_Peña_Nieto' },
  { name: 'AMLO',      fullName: 'Andres Manuel Lopez Obrador',   start: 2018, end: 2024, dataStart: 2018, color: '#a16207', party: 'MORENA', wikiArticle: 'Andrés_Manuel_López_Obrador' },
  { name: 'Sheinbaum', fullName: 'Claudia Sheinbaum',             start: 2024, end: 2030, dataStart: 2024, color: '#14b8a6', party: 'MORENA', wikiArticle: 'Claudia_Sheinbaum' },
] as const

/** Party color mapping for badge/stripe. */
export const PARTY_COLORS: Record<string, string> = {
  PAN: '#002395',
  PRI: '#008000',
  MORENA: '#8B0000',
}

/** Severity → hex color for scandal badges. */
export const SEVERITY_COLORS = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fbbf24',
}

export const DOSSIER_DATA: Record<string, DossierEntry> = {
  Fox: {
    contextKey: 'fox',
    scandals: [
      { key: 'pemexgate', severity: 'high' },
    ],
    topSectorKeys: ['energia', 'infraestructura', 'salud', 'defensa', 'educacion'],
  },
  Calderon: {
    contextKey: 'calderon',
    scandals: [
      { key: 'odebrecht', severity: 'high', caseId: 'odebrecht-pemex-bribery' },
    ],
    topSectorKeys: ['defensa', 'infraestructura', 'energia', 'salud', 'gobernacion'],
  },
  'Pena Nieto': {
    contextKey: 'pena_nieto',
    scandals: [
      { key: 'casa_blanca',    severity: 'high',     caseId: 'grupo-higa-casa-blanca' },
      { key: 'grupo_higa',     severity: 'high',     caseId: 'grupo-higa-casa-blanca' },
      { key: 'estafa_maestra', severity: 'critical', caseId: 'estafa-maestra' },
      { key: 'imss_ghost',     severity: 'critical', caseId: 'imss-ghost-company-network' },
      { key: 'odebrecht',      severity: 'high',     caseId: 'odebrecht-pemex-bribery' },
    ],
    topSectorKeys: ['salud', 'infraestructura', 'educacion', 'energia', 'hacienda'],
  },
  AMLO: {
    contextKey: 'amlo',
    scandals: [
      { key: 'covid_procurement', severity: 'critical', caseId: 'covid-emergency-procurement' },
      { key: 'segalmex',          severity: 'critical', caseId: 'segalmex-food-distribution' },
      { key: 'efos_sat',          severity: 'high' },
      { key: 'tren_maya',         severity: 'high',     caseId: 'tren-maya-fonatur' },
    ],
    topSectorKeys: ['infraestructura', 'salud', 'energia', 'defensa', 'gobernacion'],
  },
  Sheinbaum: {
    contextKey: 'sheinbaum',
    scandals: [],
    topSectorKeys: ['infraestructura', 'salud', 'energia', 'educacion', 'gobernacion'],
  },
}
