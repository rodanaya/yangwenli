/**
 * useIntermediaryData — the live cuts behind «Sigan al intermediario» (SD-05).
 *
 * The story was built on a vendor ARIA has already cleared. CONSTRUCTORA
 * ARHNOS is the single largest firm in the P3 cohort by value — 32 billion
 * pesos across six contracts — and it carried the story's prototype, its
 * pull-quote and its subheadline. The register files it `review_status =
 * false_positive`: a reviewer looked at it and said no. So did the second,
 * fifth, seventh and eighth largest. The pattern's top is a false-positive
 * trap, because two enormous contracts inside one year are the signature of a
 * megaproject contractor as much as of a shell, and `CLEARED` below is the
 * one rule every figure here filters by.
 *
 * Read the P3 definition before reading the figures. `docs/ARIA_SPEC.md`
 * § Module 3 scores a vendor on a burst: every contract inside a window of at
 * most three years, a value per contract at least twice its sector's median,
 * and no contract since (weights 0.25 value ratio · 0.20 contracts per month ·
 * 0.20 disappeared · 0.15 product overlap · 0.10 short window · 0.10 RFC age).
 * It is a shape, not a verdict — which is why the cleared rows exist at all.
 *
 * Four calls carry five figures, shared by query key:
 *   /aria/patterns/P3/institutions?group=sector    F1 (and the cohort, F5)
 *   /aria/patterns/P3/institutions?vendors=3       F2
 *   /aria/queue?pattern=P3&tier=1                  F3, F4
 *   /sectors                                       F3's reference rule
 */
import { useQuery } from '@tanstack/react-query'
import { ariaApi, sectorApi } from '@/api/client'
import type { AriaPatternVendor, AriaQueueItem } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** Buyers ranked in F2, and groups drawn in F1 (the whole 12-sector map). */
export const TOP_BUYERS = 12
/** Flow rows F2 draws, of the buyers fetched. */
export const FLOW_ROWS = 10
/** Largest vendors inlined per buyer — enough to reach past a cleared one. */
export const VENDORS_PER_BUYER = 3

/**
 * Review dispositions that mean a human looked and said this is not a broker.
 *
 * `false_positive` and `dismissed` are a reviewer's call; `fp_excluded` is the
 * structural exclusion list (narrow supplier markets — oilfield services,
 * patented medicine) that the calibration carries for the same reason. A row
 * carrying any of them may not be drawn as an intermediary anywhere in this
 * story, in a chart, a chip or a caption.
 *
 * `skipped` is NOT here: it means the web-evidence pass moved on, not that
 * anyone judged the vendor.
 */
const CLEARED = new Set(['false_positive', 'fp_excluded', 'dismissed'])

/** True when a reviewer has ruled this vendor out. */
export function isCleared(v: { review_status?: string | null }): boolean {
  return CLEARED.has(v.review_status ?? '')
}

/** P3 grouped by the sector its vendors mostly sell into — F1, and the cohort. */
export function useP3Sectors(enabled = true) {
  return useQuery({
    queryKey: ['aria-pattern-groups', 'P3', 'sector', TOP_BUYERS, 0],
    queryFn: () => ariaApi.getPatternGroups('P3', { group: 'sector', limit: TOP_BUYERS }),
    staleTime: HOUR,
    enabled,
  })
}

/** P3 grouped by buyer, each buyer's largest vendors inlined — F2's flows. */
export function useP3Buyers(enabled = true) {
  return useQuery({
    queryKey: ['aria-pattern-groups', 'P3', 'institution', TOP_BUYERS, VENDORS_PER_BUYER],
    queryFn: () =>
      ariaApi.getPatternGroups('P3', {
        group: 'institution',
        limit: TOP_BUYERS,
        vendors: VENDORS_PER_BUYER,
      }),
    staleTime: HOUR,
    enabled,
  })
}

/**
 * Every Tier-1 vendor in the P3 cohort — thirteen of 2,972.
 *
 * One page holds all of them (the cohort's own `tier1` count is 13), and the
 * queue row carries what the group aggregate does not: the burst score, the
 * first and last contract year, whether the vendor has disappeared, and its
 * buyer. That is the whole P3 signature on one line, which is why F3 and F4
 * read the queue rather than the aggregate.
 */
export function useP3Tier1(enabled = true) {
  return useQuery({
    queryKey: ['aria-queue', 'P3', 1, 100],
    queryFn: () => ariaApi.getQueue({ pattern: 'P3', tier: 1, per_page: 100 }),
    staleTime: HOUR,
    enabled,
  })
}

/** Sector statistics — F3 takes each row's reference from `avg_contract_value`. */
export function useSectorNorms(enabled = true) {
  return useQuery({
    queryKey: ['sectors', 'all'],
    queryFn: () => sectorApi.getAll(),
    staleTime: HOUR,
    enabled,
  })
}

/** What one contract is worth to a vendor — the ticket. */
export function ticketOf(v: AriaQueueItem | AriaPatternVendor): number {
  const stored = 'value_per_contract' in v ? v.value_per_contract : null
  if (stored) return stored
  return v.total_contracts > 0 ? v.total_value_mxn / v.total_contracts : 0
}

/**
 * The money one buyer sends to one vendor.
 *
 * `top_institution_ratio` is the share of the VENDOR's own contracting that
 * sits at that buyer, so the product is the part of its lifetime total the
 * buyer accounts for — an estimate from two register fields, not a summed
 * contract ledger, and the figure's caption says so.
 */
export function flowValue(v: AriaPatternVendor): number {
  return v.total_value_mxn * (v.top_institution_ratio ?? 1)
}
