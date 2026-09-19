/**
 * useThresholdData — the live cuts behind «Los precios que terminan en ceros»
 * (SD-07).
 *
 * The story's load-bearing number was a category error. It said 28,264 federal
 * contracts were written for **exactly** 210,000 pesos. 28,264 is the count of
 * the 10,000-peso *bucket* that starts at 210,000; the number of contracts
 * written for exactly 210,000 pesos is 1,613. The story then compared that
 * bucket against "16,075 at 200,000" and called the difference +76% — but
 * 16,075 is the count of a *five*-thousand-peso half-bucket, [200,000 205,000).
 * At the same width the two buckets are 28,963 against 30,441, a 4.9% decline.
 * The spike the prose walked the reader along was an artefact of two bucket
 * widths in one sentence.
 *
 * What the register does say is sharper than what the story claimed, and it is
 * what these figures draw:
 *
 *   - 23,506 contracts in the 200K-400K band are written on an exact multiple
 *     of 10,000 pesos. Every one of those 21 values stands 6 to 17 times above
 *     the 1,000-peso grid around it.
 *   - 80.3% of them are direct awards, against 70.8% for the band as a whole.
 *   - The three values the story names are real spikes — 210,000 at 11.6x its
 *     neighbourhood, 250,000 at 13.2x, 300,000 at 15.4x — but they are not the
 *     sharpest. 400,000 is, at 16.7x.
 *   - The habit peaked in 2014 at 8.3% of the band and has since roughly
 *     halved, to 4.3% in 2024.
 *
 * Two calls, four figures. Both are `GET /analysis/amount-histogram`, which
 * the server caches for ten minutes:
 *
 *   bucket=10000, exact=210000,250000,300000   F1 stage 0, F2
 *   bucket=1000,  exact=<the 21 round values>  F1 stages 1-3, F3, F4
 */
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import type { AmountHistogramResponse } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** The band every figure reads, in pesos. */
export const BAND_MIN = 200000
export const BAND_MAX = 400000
/** The coarse silhouette the story originally drew. */
export const COARSE_BUCKET = 10000
/** The resolution at which the round numbers become visible as teeth. */
export const FINE_BUCKET = 1000

/** The three values the story names, and the selector offers. */
export const THRESHOLDS = [210000, 250000, 300000] as const
export type Threshold = (typeof THRESHOLDS)[number]

/**
 * Every multiple of 10,000 the band actually contains — twenty values,
 * 200,000 to 390,000. The band is half-open, so 400,000 is NOT one of them:
 * asking for it would add a row the fold can never fill and make the grid
 * total disagree with the bars drawn above it.
 */
export const ROUND_GRID = Array.from(
  { length: (BAND_MAX - BAND_MIN) / COARSE_BUCKET },
  (_, i) => BAND_MIN + i * COARSE_BUCKET,
)

/** F1 stage 0 and F2 — the coarse silhouette and the three named thresholds. */
export function useCoarseHistogram(enabled = true) {
  return useQuery({
    queryKey: ['amount-histogram', BAND_MIN, BAND_MAX, COARSE_BUCKET, THRESHOLDS.join(',')],
    queryFn: () =>
      analysisApi.getAmountHistogram({
        min: BAND_MIN,
        max: BAND_MAX,
        bucket: COARSE_BUCKET,
        exact: THRESHOLDS.join(','),
      }),
    staleTime: HOUR,
    enabled,
  })
}

/** F1 stages 1-3, F3 and F4 — the fine comb and the whole round-number grid. */
export function useFineHistogram(enabled = true) {
  return useQuery({
    queryKey: ['amount-histogram', BAND_MIN, BAND_MAX, FINE_BUCKET, 'grid'],
    queryFn: () =>
      analysisApi.getAmountHistogram({
        min: BAND_MIN,
        max: BAND_MAX,
        bucket: FINE_BUCKET,
        exact: ROUND_GRID.join(','),
      }),
    staleTime: HOUR,
    enabled,
  })
}

// ── derived readings ──────────────────────────────────────────────────────

export interface Spike {
  amount: number
  count: number
  directAwardCount: number
  /** Contracts at `amount - 1000`. */
  below: number
  /** Contracts at `amount + 1000`. */
  above: number
  /** The mean of the two neighbours — the local floor a spike stands on. */
  neighbourMean: number
  /** `count / neighbourMean`, the excess the figure prints. */
  ratio: number
  /** Direct awards as a share of the contracts at this exact amount. */
  directAwardShare: number
}

export function readSpike(row: AmountHistogramResponse['exact'][number]): Spike {
  const below = row.neighbours.minus_1000
  const above = row.neighbours.plus_1000
  const neighbourMean = (below + above) / 2
  return {
    amount: row.amount,
    count: row.count,
    directAwardCount: row.direct_award_count,
    below,
    above,
    neighbourMean,
    ratio: neighbourMean > 0 ? row.count / neighbourMean : 0,
    directAwardShare: row.count > 0 ? row.direct_award_count / row.count : 0,
  }
}

/** Everything written on a round value, summed across the grid. */
export function readGrid(body: AmountHistogramResponse) {
  const count = body.exact.reduce((s, r) => s + r.count, 0)
  const directAwardCount = body.exact.reduce((s, r) => s + r.direct_award_count, 0)
  const bandCount = body.buckets.reduce((s, b) => s + b.count, 0)
  const bandDirectAward = body.buckets.reduce((s, b) => s + b.direct_award_count, 0)
  const spikes = body.exact.map(readSpike)
  // The sharpest spike is not one of the three the story used to name, which
  // is the correction F1's footline states.
  const sharpest = spikes.reduce((a, b) => (b.ratio > a.ratio ? b : a), spikes[0])
  return {
    count,
    directAwardCount,
    share: bandCount > 0 ? count / bandCount : 0,
    directAwardShare: count > 0 ? directAwardCount / count : 0,
    bandCount,
    bandDirectAwardShare: bandCount > 0 ? bandDirectAward / bandCount : 0,
    spikes,
    sharpest,
  }
}

export interface YearPoint {
  year: number
  onGrid: number
  inBand: number
  share: number
}

/**
 * The habit over time, as a share of the band.
 *
 * Years holding fewer than 500 in-band contracts are dropped: the register
 * carries two contracts dated 2001 and two dated 2004 in this band, and a
 * share taken over a denominator of two is a 0% or a 100% that means nothing.
 */
export const MIN_YEAR_DENOMINATOR = 500

export function readYears(body: AmountHistogramResponse): YearPoint[] {
  return body.by_year
    .filter((r) => r.contracts_in_range >= MIN_YEAR_DENOMINATOR)
    .map((r) => ({
      year: r.year,
      onGrid: r.exact_total,
      inBand: r.contracts_in_range,
      share: r.exact_total / r.contracts_in_range,
    }))
}
