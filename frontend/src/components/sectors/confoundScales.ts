/**
 * confoundScales — pure scale helpers for the Confound Plate (§B) and the
 * Self-Capture band (§C) on /sectors WHO.
 *
 * Lane 1 positions absolute VaR on a LOG axis (rescues the 80× leader-to-tail
 * spread from linear sliver-collapse). Lane 2 positions exposure over the
 * sector's OWN spend on a linear 0–100% axis. Both return fractions [0,1];
 * the components own the pixel mapping.
 */
import type { LedgerRow } from './ExposureLedger'
import type { SectorTrajectoryPoint } from '@/api/types'
import { RISK_COLORS, RISK_TEXT_COLORS, EU_DIRECT_AWARD_LIMIT, getRiskLevelFromScore } from '@/lib/constants'

/** EU direct-award line as a percentage (0–100). Single source: constants. */
export const EU_DA_LINE = EU_DIRECT_AWARD_LIMIT * 100

/** Intensity dot/ring colour — RISK_COLORS by level, never green for low (Bible §3.10). */
export function intensityColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[level]
}

/** Compact integer count: 1.08M · 65.7k · 942 (not currency). */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

/** Direction of a risk trajectory over its series — rising risk is the signal we tint. */
export function trajectoryDirection(traj: SectorTrajectoryPoint[]): { glyph: string; rising: boolean } {
  if (!traj || traj.length < 2) return { glyph: '·', rising: false }
  const delta = traj[traj.length - 1].avg_risk - traj[0].avg_risk
  if (delta > 0.02) return { glyph: '↑', rising: true }
  if (delta < -0.02) return { glyph: '↓', rising: false }
  return { glyph: '→', rising: false }
}

/**
 * Intensity as TYPE — the AA-safe twin of intensityColor (above) for
 * every % numeral (rings and dots keep intensityColor). Never green for low.
 * PARALLAX D7 § Change 3 (lives here, not in the component file, so that file
 * does not grow another non-component export — react-refresh).
 */
export function intensityTextColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[level]
}

/** Share of the sector's own spend that is model-flagged (0–1). */
export function ownSpendShare(row: Pick<LedgerRow, 'varMxn' | 'totalMxn'>): number {
  if (row.totalMxn <= 0) return 0
  return Math.max(0, Math.min(1, row.varMxn / row.totalMxn))
}

/**
 * Log-scale fraction builder. The origin is the decade at or below the smallest
 * sector, not the smallest sector itself — otherwise "Other" sat at 0 with no
 * stem and read as zero (PARALLAX D7b § Change 6, S7).
 */
export function makeLogFrac(rows: LedgerRow[]): (varMxn: number) => number {
  const positive = rows.map((r) => r.varMxn).filter((v) => v > 0)
  if (positive.length === 0) return () => 0
  const lo = Math.floor(Math.log10(Math.min(...positive)))
  const hi = Math.log10(Math.max(...positive))
  const span = hi - lo
  return (varMxn: number) => {
    if (varMxn <= 0 || span <= 0) return 0
    return Math.max(0, Math.min(1, (Math.log10(varMxn) - lo) / span))
  }
}

/**
 * Rank disagreement: rankByVaR − rankByOwnSpendShare per sector (1-based ranks,
 * descending metric). Positive = the sector climbs when ranked by intensity.
 */
export interface RankDelta {
  sectorId: number
  rankVar: number
  rankIntensity: number
  delta: number
}

export function rankDeltas(rows: LedgerRow[]): Map<number, RankDelta> {
  const byVar = [...rows].sort((a, b) => b.varMxn - a.varMxn)
  const byIntensity = [...rows].sort((a, b) => ownSpendShare(b) - ownSpendShare(a))
  const rankVar = new Map(byVar.map((r, i) => [r.sectorId, i + 1]))
  const out = new Map<number, RankDelta>()
  byIntensity.forEach((r, i) => {
    const rv = rankVar.get(r.sectorId) ?? 0
    out.set(r.sectorId, {
      sectorId: r.sectorId,
      rankVar: rv,
      rankIntensity: i + 1,
      delta: rv - (i + 1),
    })
  })
  return out
}

/**
 * The registry's sort lenses — one word per measure (PARALLAX D7b § Change 1):
 *   var        flagged amount (both views)
 *   saturation own-spend share — the Plate's second lens
 *   intensity  model mean risk (avgRiskScore) — the Register's second column
 * A view that does not offer the URL's lens shows `var`.
 */
export type PlateLens = 'var' | 'saturation' | 'intensity'

/** Display order for a lens. Rows arrive varMxn-descending. */
export function orderForLens(rows: LedgerRow[], lens: PlateLens): LedgerRow[] {
  if (lens === 'saturation') return [...rows].sort((a, b) => ownSpendShare(b) - ownSpendShare(a))
  if (lens === 'intensity') return [...rows].sort((a, b) => b.avgRiskScore - a.avgRiskScore)
  return [...rows].sort((a, b) => b.varMxn - a.varMxn)
}

/** Ruler ticks (MXN) for the log lane: 1× and 5× each decade strictly inside (0, 1). */
export function logTicks(rows: LedgerRow[], frac: (v: number) => number): number[] {
  const positive = rows.map((r) => r.varMxn).filter((v) => v > 0)
  if (positive.length === 0) return []
  const d0 = Math.floor(Math.log10(Math.min(...positive)))
  const d1 = Math.ceil(Math.log10(Math.max(...positive)))
  const out: number[] = []
  for (let d = d0; d <= d1; d++) for (const m of [1, 5]) {
    const t = m * 10 ** d
    const f = frac(t)
    if (f > 0 && f < 1) out.push(t)
  }
  return out
}
