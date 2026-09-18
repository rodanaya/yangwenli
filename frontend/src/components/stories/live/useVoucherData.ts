/**
 * useVoucherData — the live cuts behind «El cártel de los vales» (SD-03).
 *
 * The story is about five firms, not the three it used to name, and one of
 * those five files under three registrations. Everything here is therefore
 * shaped around a FIRM — a label plus the vendor ids that belong to it — and
 * the merge happens once, in `mergeYears` / `mergeStats`, so no figure can
 * disagree with another about what "Efectivale" means.
 *
 * Three endpoints carry the four figures:
 *   /vendors/:id               lifetime counts, the two door rates, the span
 *   /vendors/:id/risk-timeline the annual value series F1 and F4 are drawn from
 *   /aria/queue/:id            the tier, the ground-truth flag, the pattern
 *
 * Every pull is a `useQueries` batch on the same query keys the vendor dossier
 * already uses, so a reader arriving from `/vendors/102627` reuses the cache
 * rather than refetching, and the figures issue one request per id between
 * them instead of one each.
 */
import { useQueries } from '@tanstack/react-query'
import { ariaApi, vendorApi } from '@/api/client'
import type { AriaQueueItem, VendorDetailResponse } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** One voucher issuer: the display label and the registrations behind it. */
export interface Firm {
  key: string
  label: string
  /** Every vendor id whose record belongs to this firm, principal first. */
  ids: number[]
  /**
   * The registration a chip opens and the ARIA badge is read from. Always one
   * of `ids`. For Efectivale this is the registration still trading, not the
   * largest by value — a badge earned by one legal entity is never moved onto
   * another.
   */
  chipId: number
  color: string
  /** Sodexo's swatch is the same ink as Efectivale's at lower opacity. */
  opacity?: number
  dashed?: boolean
}

/**
 * The cast, ordered by lifetime value (verified at build time, 2026-09-18:
 * Toka 51.8B · Edenred 38.6B · Efectivale 27.6B · Si Vale 15.8B · Sodexo 8.7B).
 * The figures re-sort from the live totals, so this order is only the fallback
 * the legend starts from.
 *
 * Colours: no green, no sector palette. This is a risk story, so the ink runs
 * from the critical red of the firm that now takes most of the money down to
 * muted grey for the one that has left.
 */
export const VOUCHER_FIRMS: Firm[] = [
  { key: 'toka', label: 'Toka Internacional', ids: [102627], chipId: 102627, color: 'var(--color-risk-critical)' },
  { key: 'edenred', label: 'Edenred México', ids: [44372], chipId: 44372, color: 'var(--color-accent)' },
  {
    key: 'efectivale',
    label: 'Efectivale',
    ids: [45016, 64, 3403],
    chipId: 45016,
    color: 'var(--color-text-muted)',
  },
  {
    key: 'sivale',
    label: 'Si Vale México',
    ids: [44362],
    chipId: 44362,
    color: 'var(--color-text-primary)',
    opacity: 0.7,
  },
  {
    key: 'sodexo',
    label: 'Sodexo Motivation Solutions',
    ids: [474],
    chipId: 474,
    color: 'var(--color-text-muted)',
    opacity: 0.55,
    dashed: true,
  },
]

/** Every id the four figures touch, in one flat list for the query batches. */
export const VOUCHER_IDS = VOUCHER_FIRMS.flatMap((f) => f.ids)

export interface FirmYear {
  year: number
  contracts: number
  value: number
}

/** A firm's lifetime record, merged across its registrations. */
export interface FirmStats {
  firm: Firm
  contracts: number
  value: number
  directAward: number
  singleBid: number
  directAwardPct: number
  singleBidPct: number
  firstYear: number
  lastYear: number
  /** From the chip registration only — never averaged across entities. */
  riskScore: number
  years: FirmYear[]
  /**
   * The same series keyed by year. F1 re-reads every firm's value for every
   * one of 24 columns on each scroll beat and each lens toggle; over a linear
   * scan of `years` that is a few thousand comparisons per render, for a
   * lookup that is O(1) here.
   */
  valueByYear: Map<number, number>
}

type TimelineResponse = Awaited<ReturnType<typeof vendorApi.getRiskTimeline>>

/** `/vendors/:id` for every registration, in parallel. */
export function useVoucherStats(enabled = true) {
  return useQueries({
    queries: VOUCHER_IDS.map((id) => ({
      queryKey: ['vendor', id],
      queryFn: () => vendorApi.getById(id),
      staleTime: HOUR,
      enabled,
    })),
    combine: (results: Array<{ data?: VendorDetailResponse; isPending: boolean; isError: boolean }>) => ({
      data: results.every((r) => r.data) ? (results.map((r) => r.data!) as VendorDetailResponse[]) : undefined,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  })
}

/** `/vendors/:id/risk-timeline` for every registration, in parallel. */
export function useVoucherTimelines(enabled = true) {
  return useQueries({
    queries: VOUCHER_IDS.map((id) => ({
      queryKey: ['vendor-risk-timeline', id],
      queryFn: () => vendorApi.getRiskTimeline(id),
      staleTime: HOUR,
      enabled,
    })),
    combine: (results: Array<{ data?: TimelineResponse; isPending: boolean; isError: boolean }>) => ({
      data: results.every((r) => r.data) ? (results.map((r) => r.data!) as TimelineResponse[]) : undefined,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  })
}

/**
 * `/aria/queue/:id` for the five chip registrations.
 *
 * `getVendorDetail` throws on a failed request where `getAriaQueueEntry`
 * swallows it and returns null, and the difference matters here: the roster
 * prints "N of five at Tier 1", so a request that fails quietly does not cost
 * a badge, it prints a smaller number than the truth. Throwing lets react-query
 * retry a transient 5xx, and `resolved` lets the figure say how many rows it
 * actually has rather than counting a missing one as a negative.
 */
export function useVoucherAria(enabled = true) {
  return useQueries({
    queries: VOUCHER_FIRMS.map((f) => ({
      // Same key the vendor dossier uses for this call (`useVendorData.ts`), so
      // a reader who follows a roster chip arrives with the row already cached.
      queryKey: ['vendor', f.chipId, 'aria-detail'],
      queryFn: () => ariaApi.getVendorDetail(f.chipId),
      staleTime: HOUR,
      retry: 2,
      enabled,
    })),
    combine: (results: Array<{ data?: AriaQueueItem; isPending: boolean }>) => ({
      data: results.map((r) => r.data ?? null),
      resolved: results.filter((r) => r.data).length,
      isPending: results.some((r) => r.isPending),
    }),
  })
}

/**
 * The years a firm's span can be read from: whatever its registrations report,
 * or the years its series covers. Never empty — an empty list would make
 * `Math.min` return Infinity and print it.
 */
function spanYears(
  parts: VendorDetailResponse[],
  field: 'first_contract_year' | 'last_contract_year',
  years: Map<number, FirmYear>,
): number[] {
  const reported = parts.map((p) => p[field]).filter((y): y is number => typeof y === 'number')
  return reported.length ? reported : [...years.keys()]
}

/**
 * Merge the flat per-registration responses into one record per firm.
 *
 * Returns firms sorted by lifetime value descending — the order every figure
 * and the legend read in.
 */
export function mergeFirms(
  stats: VendorDetailResponse[],
  timelines: TimelineResponse[],
): FirmStats[] {
  const byId = new Map(stats.map((s) => [s.id, s]))
  const tlById = new Map(timelines.map((t) => [t.vendor_id, t]))

  return VOUCHER_FIRMS.map((firm) => {
    const parts = firm.ids.map((id) => byId.get(id)).filter((v): v is VendorDetailResponse => v != null)
    const years = new Map<number, FirmYear>()
    for (const id of firm.ids) {
      for (const row of tlById.get(id)?.timeline ?? []) {
        const prev = years.get(row.year) ?? { year: row.year, contracts: 0, value: 0 }
        prev.contracts += row.contract_count
        prev.value += row.total_value
        years.set(row.year, prev)
      }
    }
    const contracts = parts.reduce((s, p) => s + p.total_contracts, 0)
    const directAward = parts.reduce((s, p) => s + (p.direct_award_count ?? 0), 0)
    const singleBid = parts.reduce((s, p) => s + (p.single_bid_count ?? 0), 0)
    const chip = byId.get(firm.chipId)
    return {
      firm,
      contracts,
      value: parts.reduce((s, p) => s + p.total_value_mxn, 0),
      directAward,
      singleBid,
      directAwardPct: contracts ? (100 * directAward) / contracts : 0,
      singleBidPct: contracts ? (100 * singleBid) / contracts : 0,
      // The span comes from whichever registrations report it, and falls back
      // to the year series for any that do not — the two agree where both
      // exist, and F2/F3 read the span without ever pulling a timeline.
      firstYear: Math.min(...spanYears(parts, 'first_contract_year', years)),
      lastYear: Math.max(...spanYears(parts, 'last_contract_year', years)),
      riskScore: chip?.avg_risk_score ?? 0,
      years: [...years.values()].sort((a, b) => a.year - b.year),
      valueByYear: new Map([...years.values()].map((y) => [y.year, y.value])),
    }
  })
    .filter((f) => f.contracts > 0)
    .sort((a, b) => b.value - a.value)
}

/** Every year any firm has a record in, ascending. 2004 is absent for all five. */
export function firmYears(firms: FirmStats[]): number[] {
  return [...new Set(firms.flatMap((f) => f.years.map((y) => y.year)))].sort((a, b) => a - b)
}

/** One firm's value in one year — 0 when it has no record that year. */
export function valueIn(firm: FirmStats, year: number): number {
  return firm.valueByYear.get(year) ?? 0
}
