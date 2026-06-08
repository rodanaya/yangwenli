/**
 * Institution scorecard pillars — SINGLE SOURCE OF TRUTH.
 *
 * `backend/scripts/compute_scorecards.py` (score_institution) stuffs the five
 * conceptual pillars into legacy DB columns whose NAMES do not match their
 * CONTENTS — the code literally comments "Reusing column for ...". The real
 * mapping is:
 *
 *   DB column         conceptual pillar (max)
 *   pillar_openness   Competitive Openness       (30)
 *   pillar_price      Process Integrity          (25)   ← NOT "price"
 *   pillar_vendors    Tail Risk (P90)            (20)   ← NOT "vendors"
 *   pillar_process    External Flags             (15)   ← NOT "process"
 *   pillar_external   Vendor Independence        (10)   ← NOT "external"
 *
 * The June 2026 audit found FOUR divergent, wrong label/max tables across
 * InstitutionLeague, InstitutionScorecards and ScorecardWidgets — every one
 * mislabeled and several mis-normalized (e.g. pillar_external ÷20 when its max
 * is 10, halving the Vendor-Independence axis for every institution). This
 * constant is now the only authoritative mapping; all consumers import it so
 * the tables can never drift apart again.
 *
 * NOTE: this fixes only the PRESENTATION. The stored scorecard VALUES are
 * correct (verified MAX/AVG per column) — no rescore is required.
 */

export type InstitutionPillarField =
  | 'pillar_openness'
  | 'pillar_price'
  | 'pillar_vendors'
  | 'pillar_process'
  | 'pillar_external'

export interface InstitutionPillar {
  /** DB / API field as returned by the scorecards endpoint. */
  dbField: InstitutionPillarField
  /** Maximum points this pillar can contribute (sums to 100). */
  max: number
  /** Single mnemonic letter for the compact column legend. */
  letter: string
  label_en: string
  label_es: string
  /** Terse label for tight chips / radar axes. */
  short_en: string
  short_es: string
}

export const INSTITUTION_PILLARS: InstitutionPillar[] = [
  { dbField: 'pillar_openness', max: 30, letter: 'A', label_en: 'Competitive Openness', label_es: 'Apertura y Competencia', short_en: 'Openness', short_es: 'Apertura' },
  { dbField: 'pillar_price', max: 25, letter: 'P', label_en: 'Process Integrity', label_es: 'Integridad de Proceso', short_en: 'Process', short_es: 'Proceso' },
  { dbField: 'pillar_vendors', max: 20, letter: 'R', label_en: 'Tail Risk (P90)', label_es: 'Riesgo de Cola (P90)', short_en: 'Tail Risk', short_es: 'Riesgo P90' },
  { dbField: 'pillar_process', max: 15, letter: 'E', label_en: 'External Flags', label_es: 'Alertas Externas', short_en: 'External', short_es: 'Alertas Ext.' },
  { dbField: 'pillar_external', max: 10, letter: 'I', label_en: 'Vendor Independence', label_es: 'Independencia de Proveedores', short_en: 'Independence', short_es: 'Independencia' },
]

/** Pick the localized full label for a pillar. */
export function pillarLabel(p: InstitutionPillar, lang: string): string {
  return lang === 'en' ? p.label_en : p.label_es
}

/** Pick the localized short label for a pillar. */
export function pillarShort(p: InstitutionPillar, lang: string): string {
  return lang === 'en' ? p.short_en : p.short_es
}

/** Compact legend string, e.g. "A P R E I". */
export const INSTITUTION_PILLAR_LETTERS = INSTITUTION_PILLARS.map((p) => p.letter).join(' ')
