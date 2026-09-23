/**
 * Shared 5-tier transparency system.
 *
 * Single source of truth for the Excelente / Satisfactorio / Regular /
 * Deficiente / Critico tiers used by InstitutionLeague, the institution
 * dossier and ReportCard.
 *
 * Backend still emits the 10-letter grade ladder (S/A/B+/B/C+/C/D/D-/F/F-);
 * `gradeToTierKey` collapses it for UI use. Labels are not stored here —
 * each consumer pulls them from i18n via `t('tiers.<key>')`.
 *
 * NOTE: PILLAR_MAXES remain page-local for now — three sources of truth
 * disagreed on per-pillar max values; `lib/institution-pillars.ts` is now
 * the authoritative mapping.
 */

export type TierKey =
  | 'Excelente'
  | 'Satisfactorio'
  | 'Regular'
  | 'Deficiente'
  | 'Critico'

export interface TierStyle {
  key: TierKey
  /** Mark colour — strokes, bands, borders, dots, tints. Not for text. */
  color: string
  /**
   * Text ink — the AA twin of `color` (PARALLAX D9 § Change 5). Measured
   * >= 4.5:1 on --color-background, --color-background-elevated and on the
   * tier's own `bg` tint over either paper. Use for any type in tier colour.
   */
  ink: string
  /** Background fill (rgba with low alpha). */
  bg: string
  /** Border color (rgba). */
  border: string
}

// Audit fix 2026-05-07 — Bible §3.10: a procurement-only model cannot
// certify integrity. Excelente was green (#16a34a) and Satisfactorio
// was teal (#0d9488); both read as "this institution is good" — exactly
// what the rule forbids on a corruption platform.
//
// Steel & Ember 2026-06-09 — the two top tiers were both flat slate gray
// which, alongside the gold brand accent and three amber data colors,
// made the page read gray+yellow on repeat. Moved them onto a deliberate
// STEEL BLUE: a cool, measured "no immediate red flag" tone that is
// emphatically not green (no integrity certification — §3.10 intact) and
// turns the ladder into a real cool→hot ramp (steel → steel → amber →
// orange → red). The warm escalation for Regular/Deficiente/Critico is
// unchanged.
export const TIER_STYLES: Record<TierKey, TierStyle> = {
  Excelente: {
    key: 'Excelente',
    color: '#3d5a80',  // steel blue (deep) — measured, not a certification
    // PARALLAX D9b § Change 8: the ink darkens toward L* 29 so Excelente and
    // Satisfactorio read as two inks in type (ΔE76 2.1 → 15.7).
    ink: '#2c4566',  // L* 28.8 · 9.28 page / 8.65 elevated / 8.02 tint
    bg: 'rgba(61,90,128,0.10)',
    border: 'rgba(61,90,128,0.32)',
  },
  Satisfactorio: {
    key: 'Satisfactorio',
    color: '#5e7fa8',  // steel blue (light) — one step up the cool ramp
    ink: '#466994',  // L* 43.6 · 5.38 page / 5.02 elevated / 4.81 tint (4.52 tint on elevated)
    bg: 'rgba(94,127,168,0.10)',
    border: 'rgba(94,127,168,0.32)',
  },
  Regular: {
    key: 'Regular',
    color: '#d97706',
    ink: '#9a4a0c',  // 5.94 / 5.54 / 4.91
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.30)',
  },
  Deficiente: {
    key: 'Deficiente',
    color: '#ea580c',
    ink: '#a83c0e',  // 6.01 / 5.61 / 4.90
    bg: 'rgba(234,88,12,0.12)',
    border: 'rgba(234,88,12,0.30)',
  },
  Critico: {
    key: 'Critico',
    color: '#dc2626',
    ink: '#b91c1c',  // = RISK_TEXT_COLORS.critical — 6.15 / 5.73 / 4.80
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
