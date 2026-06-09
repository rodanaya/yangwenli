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

/** Share of the sector's own spend that is model-flagged (0–1). */
export function ownSpendShare(row: Pick<LedgerRow, 'varMxn' | 'totalMxn'>): number {
  if (row.totalMxn <= 0) return 0
  return Math.max(0, Math.min(1, row.varMxn / row.totalMxn))
}

/** Log-scale fraction builder over the registry's VaR extremes. */
export function makeLogFrac(rows: LedgerRow[]): (varMxn: number) => number {
  const positive = rows.map((r) => r.varMxn).filter((v) => v > 0)
  if (positive.length === 0) return () => 0
  const lo = Math.log10(Math.min(...positive))
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

/** Display order for the active lens. Rows arrive varMxn-descending. */
export type PlateLens = 'var' | 'intensity'

export function orderForLens(rows: LedgerRow[], lens: PlateLens): LedgerRow[] {
  if (lens === 'intensity') {
    return [...rows].sort((a, b) => ownSpendShare(b) - ownSpendShare(a))
  }
  return [...rows].sort((a, b) => b.varMxn - a.varMxn)
}
