/**
 * Mexican federal presidential administrations — single source of truth.
 *
 * Replaces ADMIN_DISPLAY / ADMIN_ORDER / getAdministration duplicated across
 * ContractDetail.tsx, CategoryProfile.tsx, SectorProfile.tsx, CaseDetail.tsx
 * (4 files, slightly different accent handling and year ranges).
 *
 * Year boundaries are inclusive on the upper end. A contract signed in 2018
 * resolves to AMLO (started Dec 2018) — same convention used by every page.
 */

export type AdministrationKey = 'fox' | 'calderon' | 'epn' | 'amlo' | 'sheinbaum'

export interface Administration {
  key: AdministrationKey
  /** Short display name without accents (canonical UI label). */
  short: string
  /** Long display name with proper accents. */
  long: string
  /** First year of the term. */
  yearStart: number
  /** Last year of the term (inclusive). */
  yearEnd: number
}

export const ADMINISTRATIONS: Administration[] = [
  { key: 'fox',       short: 'Fox',       long: 'Vicente Fox',          yearStart: 2000, yearEnd: 2006 },
  { key: 'calderon',  short: 'Calderon',  long: 'Felipe Calderón',      yearStart: 2006, yearEnd: 2012 },
  { key: 'epn',       short: 'Pena Nieto', long: 'Enrique Peña Nieto',  yearStart: 2012, yearEnd: 2018 },
  { key: 'amlo',      short: 'AMLO',      long: 'Andrés Manuel López Obrador', yearStart: 2018, yearEnd: 2024 },
  { key: 'sheinbaum', short: 'Sheinbaum', long: 'Claudia Sheinbaum',    yearStart: 2024, yearEnd: 2030 },
]

/** Display order — chronological. Used by sexenio matrices and admin filters. */
export const ADMIN_ORDER: readonly AdministrationKey[] = [
  'fox', 'calderon', 'epn', 'amlo', 'sheinbaum',
] as const

/** Canonical short-name display map (accent-stripped where the historical
 *  page convention does that — same as the four duplicates we replaced). */
export const ADMIN_DISPLAY: Record<AdministrationKey, string> = {
  fox: 'Fox',
  calderon: 'Calderon',
  epn: 'Pena Nieto',
  amlo: 'AMLO',
  sheinbaum: 'Sheinbaum',
}

/** Backward-compatible alias map for legacy string keys with accents. */
export const ADMIN_DISPLAY_LEGACY: Record<string, string> = {
  Fox: ADMIN_DISPLAY.fox,
  Calderon: ADMIN_DISPLAY.calderon,
  'Calderón': ADMIN_DISPLAY.calderon,
  'Pena Nieto': ADMIN_DISPLAY.epn,
  'Peña Nieto': ADMIN_DISPLAY.epn,
  AMLO: ADMIN_DISPLAY.amlo,
  Sheinbaum: ADMIN_DISPLAY.sheinbaum,
}

/** Resolve a year (or undefined) to its administration short name. Returns ''
 *  for null/undefined years, matching the prior helper signature. */
export function getAdministrationShortName(
  year: number | null | undefined
): string {
  if (year == null) return ''
  for (const a of ADMINISTRATIONS) {
    if (year <= a.yearEnd) return a.short
  }
  return ADMINISTRATIONS[ADMINISTRATIONS.length - 1].short
}

/** Resolve a year to its full Administration record (or undefined). */
export function getAdministrationByYear(
  year: number | null | undefined
): Administration | undefined {
  if (year == null) return undefined
  for (const a of ADMINISTRATIONS) {
    if (year >= a.yearStart && year <= a.yearEnd) return a
  }
  return undefined
}
