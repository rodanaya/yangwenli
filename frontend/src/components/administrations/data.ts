/**
 * Static data for /administrations and its extracted helpers.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) so dossier-panel
 * and grade-card components can be split out of the page module without
 * circular imports.
 */
import { ADMINISTRATIONS as CANONICAL_TERMS } from '@/lib/administrations'
import type { DossierEntry, AdminMeta } from './types'

/** First and last calendar years in the contract data (2025 partial, to Sep 28). */
export const DATA_FIRST_YEAR = 2002
export const DATA_LAST_YEAR = 2025

// Term years come from the canonical table (lib/administrations.ts, the same
// outgoing-president convention as backend/api/administrations.py): a year
// belongs to the president in office for most of it. `end` is inclusive.
const TERM_KEY: Record<AdminMeta['name'], string> = {
  Fox: 'fox', Calderon: 'calderon', 'Pena Nieto': 'epn', AMLO: 'amlo', Sheinbaum: 'sheinbaum',
}
const term = (name: AdminMeta['name']) => {
  const t = CANONICAL_TERMS.find((a) => a.key === TERM_KEY[name])
  if (!t) throw new Error(`no canonical term for ${name}`)
  return { start: t.yearStart, end: t.yearEnd, dataStart: Math.max(t.yearStart, DATA_FIRST_YEAR) }
}

/** The 5 modern federal administrations covered by RUBLI's data window. */
export const ADMINISTRATIONS: readonly AdminMeta[] = [
  { name: 'Fox',        fullName: 'Vicente Fox Quesada',        ...term('Fox'),        color: '#3b82f6', party: 'PAN',    wikiArticle: 'Vicente_Fox_Quesada' },
  { name: 'Calderon',   fullName: 'Felipe Calderón Hinojosa',   ...term('Calderon'),   color: '#22c55e', party: 'PAN',    wikiArticle: 'Felipe_Calderón_Hinojosa' },
  { name: 'Pena Nieto', fullName: 'Enrique Peña Nieto',         ...term('Pena Nieto'), color: '#ef4444', party: 'PRI',    wikiArticle: 'Enrique_Peña_Nieto' },
  { name: 'AMLO',       fullName: 'Andrés Manuel López Obrador', ...term('AMLO'),      color: '#a16207', party: 'MORENA', wikiArticle: 'Andrés_Manuel_López_Obrador' },
  { name: 'Sheinbaum',  fullName: 'Claudia Sheinbaum Pardo',    ...term('Sheinbaum'),  color: '#14b8a6', party: 'MORENA', wikiArticle: 'Claudia_Sheinbaum' },
]

/**
 * Printed range of a term's data years: "2019–2024", short "2019–24"; a term
 * still running past the data horizon prints open-ended ("2025–").
 */
export function termRange(meta: AdminMeta, short = false): string {
  if (meta.end > DATA_LAST_YEAR) return `${meta.dataStart}–`
  return `${meta.dataStart}–${short ? String(meta.end).slice(2) : meta.end}`
}

/**
 * Display names with correct diacritics, keyed on the ASCII `name`
 * identifier. Single source of truth — the page, the matrix, and the
 * summary card all import this (2026-06-07; matrix previously rendered
 * raw ASCII "Calderon" / "Pena Nieto").
 */
export const ADMIN_DISPLAY_NAMES: Record<string, string> = {
  Fox: 'Fox',
  Calderon: 'Calderón',
  'Pena Nieto': 'Peña Nieto',
  AMLO: 'AMLO',
  Sheinbaum: 'Sheinbaum',
}

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
      // casa_blanca and the former grupo_higa entry are the SAME affair (shared
      // caseId grupo-higa-casa-blanca) — kept once so the scandal count and the
      // §III spine don't double-count it. DC3.
      { key: 'casa_blanca',    severity: 'high',     caseId: 'grupo-higa-casa-blanca' },
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

/** Public-record year for each scandal key, per administration — used by
 *  ExpedienteSpine to merge scandals into the chronological case-file. */
export const SCANDAL_YEARS: Record<string, Record<string, number>> = {
  Fox: { pemexgate: 2004 },
  Calderon: { odebrecht: 2010 },
  'Pena Nieto': { casa_blanca: 2014, imss_ghost: 2015, odebrecht: 2016, estafa_maestra: 2017 },
  AMLO: { covid_procurement: 2020, segalmex: 2021, efos_sat: 2022, tren_maya: 2023 },
  Sheinbaum: {},
}
