/**
 * Shared 5-tier transparency system.
 *
 * Single source of truth for the Excelente / Satisfactorio / Regular /
 * Deficiente / Critico tiers used by InstitutionLeague + InstitutionScorecards
 * (and any future entity scorecard pages).
 *
 * Backend still emits the 10-letter grade ladder (S/A/B+/B/C+/C/D/D-/F/F-);
 * `gradeToTierKey` collapses it for UI use. Labels are not stored here —
 * each consumer pulls them from i18n via `t('tiers.<key>')`.
 *
 * NOTE: PILLAR_MAXES remain page-local for now — three sources of truth
 * disagree on per-pillar max values (ScorecardWidgets all /20, InstitutionLeague
 * O:20/P:25/V:20/R:15/E:20, InstitutionScorecards O:25/P:25/V:20/R:20/E:10).
 * Reconciliation requires backend verification — see Batch C critique.
 */

export type TierKey =
  | 'Excelente'
  | 'Satisfactorio'
  | 'Regular'
  | 'Deficiente'
  | 'Critico'

export interface TierStyle {
  key: TierKey
  /** Hex color used for chips, dots, and accent text. */
  color: string
  /** Background fill (rgba with low alpha). */
  bg: string
  /** Border color (rgba). */
  border: string
}

export const TIER_STYLES: Record<TierKey, TierStyle> = {
  Excelente: {
    key: 'Excelente',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.12)',
    border: 'rgba(22,163,74,0.30)',
  },
  Satisfactorio: {
    key: 'Satisfactorio',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    border: 'rgba(13,148,136,0.30)',
  },
  Regular: {
    key: 'Regular',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.30)',
  },
  Deficiente: {
    key: 'Deficiente',
    color: '#ea580c',
    bg: 'rgba(234,88,12,0.12)',
    border: 'rgba(234,88,12,0.30)',
  },
  Critico: {
    key: 'Critico',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.30)',
  },
}

export const TIER_NAMES: readonly TierKey[] = [
  'Excelente',
  'Satisfactorio',
  'Regular',
  'Deficiente',
  'Critico',
] as const

/** Backend grades that collapse to each tier (for filter passthrough). */
export const TIER_GRADE_MAP: Record<TierKey, string[]> = {
  Excelente: ['S', 'A'],
  Satisfactorio: ['B+', 'B'],
  Regular: ['C+', 'C'],
  Deficiente: ['D', 'D-'],
  Critico: ['F', 'F-'],
}

/** Map any backend grade (S..F-) to the 5-tier key. */
export function gradeToTierKey(grade: string): TierKey {
  switch (grade) {
    case 'S':
    case 'A':
      return 'Excelente'
    case 'B+':
    case 'B':
      return 'Satisfactorio'
    case 'C+':
    case 'C':
      return 'Regular'
    case 'D':
    case 'D-':
      return 'Deficiente'
    case 'F':
    case 'F-':
    default:
      return 'Critico'
  }
}
