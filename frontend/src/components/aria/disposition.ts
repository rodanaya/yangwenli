/**
 * Disposition bucketing for the ARIA queue — "la máquina propone, el analista
 * dispone." The DB carries 15 raw review_status values (4 canonical UI states
 * + 11 CENTINELA script-written states); the UI reads them through 5 buckets.
 *
 * Verified against RUBLI_NORMALIZED 2026-06-12: T1 = confirmed 164 ·
 * needs_review 83 · confirmed_corrupt 41 · reviewed 6 · false_positive 3 ·
 * skipped 2 — and ZERO 'pending'. Any "start here" mechanic must key on
 * needs_review, never pending (audit finding F1, designus aria-cola run).
 */

export type DispositionBucket =
  | 'pendiente'      // pending / null — untouched
  | 'por_revisar'    // needs_review (CENTINELA asks for human eyes) + reviewing
  | 'confirmada'     // confirmed + confirmed_corrupt
  | 'descartada'     // dismissed + false_positive + fp_excluded
  | 'pipeline'       // reviewed / skipped / other script states

export function bucketStatus(raw: string | null | undefined): DispositionBucket {
  switch (raw ?? 'pending') {
    case 'pending':
    case '':
      return 'pendiente'
    case 'needs_review':
    case 'reviewing':
      return 'por_revisar'
    case 'confirmed':
    case 'confirmed_corrupt':
      return 'confirmada'
    case 'dismissed':
    case 'false_positive':
    case 'fp_excluded':
      return 'descartada'
    default:
      return 'pipeline'
  }
}

export const DISPOSITION_META: Record<
  DispositionBucket,
  { es: string; en: string; color: string; railColor: string }
> = {
  pendiente: {
    es: 'PENDIENTE',
    en: 'PENDING',
    color: 'var(--color-text-muted)',
    railColor: 'transparent',
  },
  por_revisar: {
    es: 'POR REVISAR',
    en: 'TO REVIEW',
    color: '#a06820',
    railColor: '#a06820',
  },
  confirmada: {
    es: 'CONFIRMADA',
    en: 'CONFIRMED',
    color: 'var(--color-risk-critical)',
    railColor: 'var(--color-risk-critical)',
  },
  descartada: {
    es: 'DESCARTADA',
    en: 'DISMISSED',
    color: 'var(--color-text-muted)',
    railColor: 'var(--color-border)',
  },
  pipeline: {
    es: 'PIPELINE',
    en: 'PIPELINE',
    color: 'var(--color-text-muted)',
    railColor: 'transparent',
  },
}

/** Sum raw status counts (e.g. stats.t1_status_counts) into buckets. */
export function bucketCounts(raw: Record<string, number> | null | undefined) {
  const out: Record<DispositionBucket, number> = {
    pendiente: 0,
    por_revisar: 0,
    confirmada: 0,
    descartada: 0,
    pipeline: 0,
  }
  if (!raw) return out
  for (const [status, n] of Object.entries(raw)) {
    out[bucketStatus(status)] += n
  }
  return out
}

/**
 * Driver tag — which of the four on-wire IPS components dominates this rank.
 * Distribution verified on T1 (2026-06-12): REGISTROS 133 · RIESGO 119 ·
 * CONSENSO 47 · ESCALA 0 — three live classes, a real discriminator where
 * the rounded score is a wall of 87s. Tie-break priority: risk > ensemble >
 * scale > flags.
 */
export type DriverKey = 'riesgo' | 'consenso' | 'escala' | 'registros'

export const DRIVER_META: Record<DriverKey, { es: string; en: string; titleEs: string; titleEn: string }> = {
  riesgo:    { es: 'RIESGO',    en: 'RISK',       titleEs: 'Componente dominante: riesgo del modelo',     titleEn: 'Dominant component: model risk score' },
  consenso:  { es: 'CONSENSO',  en: 'ENSEMBLE',   titleEs: 'Componente dominante: ensamble de anomalía',  titleEn: 'Dominant component: anomaly ensemble' },
  escala:    { es: 'ESCALA',    en: 'SCALE',      titleEs: 'Componente dominante: escala financiera',     titleEn: 'Dominant component: financial scale' },
  registros: { es: 'REGISTROS', en: 'REGISTRIES', titleEs: 'Componente dominante: registros externos',    titleEn: 'Dominant component: external registries' },
}

export function driverTag(item: {
  risk_score_norm?: number | null
  ensemble_norm?: number | null
  financial_scale_norm?: number | null
  external_flags_score?: number | null
}): DriverKey | null {
  const parts: Array<[DriverKey, number | null | undefined]> = [
    ['riesgo', item.risk_score_norm],
    ['consenso', item.ensemble_norm],
    ['escala', item.financial_scale_norm],
    ['registros', item.external_flags_score],
  ]
  let best: DriverKey | null = null
  let bestV = -Infinity
  for (const [key, v] of parts) {
    if (v == null) continue
    // strict > keeps the earlier (higher-priority) component on ties
    if (v > bestV) {
      best = key
      bestV = v
    }
  }
  return best
}

/** Mills notation for IPS: 0.87367 → "·874". Restores the spread the ×100 rounding destroyed. */
export function ipsMills(ips: number | null | undefined): string {
  if (ips == null) return '·—'
  return '·' + String(Math.round(ips * 1000)).padStart(3, '0')
}
