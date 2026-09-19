/**
 * useCaptureData — the live cuts behind «El edificio que construyó la captura»
 * (SD-04).
 *
 * The story was written as if P6 measured a BUYER: "IMSS carries 401.8 billion
 * pesos of capture-pattern contracting". The register measures the opposite
 * direction. `aria_queue.top_institution` is the buyer a flagged VENDOR sends
 * most of its own work to, and `top_institution_ratio` — never below 0.80 for
 * a P6 vendor, averaging 0.96 — is that vendor's dependence on it. So a row's
 * value is the lifetime federal contracting of the vendors anchored at that
 * buyer, not a captured share of that buyer's budget, and every figure here
 * says which of the two it is printing.
 *
 * Two endpoints carry five figures:
 *   /aria/patterns/:code/institutions  the cohort, its groups, its top vendors
 *   /capture/landscape                 the institution-side counter-reading
 *
 * The three calls are declared once, here, and shared by query key, so the
 * page issues three requests for five figures rather than one per figure.
 */
import { useQueries, useQuery } from '@tanstack/react-query'
import { ariaApi, captureApi } from '@/api/client'
import type { AriaPatternGroupRow, AriaPatternGroupsResponse } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** The buyer ch1 is about. IMSS is `siglas` in the queue, id 251 in institutions. */
export const IMSS_SIGLAS = 'IMSS'

/**
 * How many buyers ch2 ranks. Seven is the story's own frame ("seven
 * institutions"), and the figure draws an eighth bar for everything else so
 * the seven are never mistaken for the whole cohort.
 */
export const TOP_INSTITUTIONS = 7

/** How many vendors ch1's ledger draws. */
export const IMSS_VENDORS = 6

/**
 * P6 grouped by buyer, with each buyer's largest vendors inlined.
 *
 * One call serves ch1 (the IMSS row and its vendors), ch2 (the ranking) and
 * ch5 (the cohort rollup). `limit` is the ranking's depth, not ch1's: IMSS is
 * the first row by value, so it arrives in the same response.
 */
export function usePatternGroups(
  code: string,
  opts: { group?: 'institution' | 'sector'; limit?: number; vendors?: number; enabled?: boolean } = {},
) {
  const { group = 'institution', limit = TOP_INSTITUTIONS, vendors = 0, enabled = true } = opts
  return useQuery<AriaPatternGroupsResponse>({
    queryKey: ['aria-pattern-groups', code, group, limit, vendors],
    queryFn: () => ariaApi.getPatternGroups(code, { group, limit, vendors }),
    staleTime: HOUR,
    enabled,
  })
}

/**
 * The institution-side reading: every buyer with ≥100M of recorded spend and
 * its single largest supplier's CUMULATIVE share of that total.
 *
 * This is the same call `/captura` makes, on the same key, so a reader who
 * follows the story's link arrives with the plate already cached.
 */
export function useCaptureLandscape(enabled = true) {
  return useQuery({
    queryKey: ['capture-landscape'],
    queryFn: () => captureApi.getLandscape(),
    staleTime: HOUR,
    enabled,
  })
}

/** P6 and P3 cohorts together — ch5 counts the queue both patterns fill. */
export function useTwoPatternCohorts(enabled = true) {
  return useQueries({
    queries: (['P6', 'P3'] as const).map((code) => ({
      queryKey: ['aria-pattern-groups', code, 'institution', 1, 0],
      queryFn: () => ariaApi.getPatternGroups(code, { group: 'institution', limit: 1, vendors: 0 }),
      staleTime: HOUR,
      enabled,
    })),
    combine: (results: Array<{ data?: AriaPatternGroupsResponse; isPending: boolean; isError: boolean }>) => ({
      p6: results[0]?.data,
      p3: results[1]?.data,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  })
}

/** The ranked row for one buyer, by the acronym the queue files it under. */
export function rowFor(body: AriaPatternGroupsResponse | undefined, key: string): AriaPatternGroupRow | null {
  return body?.rows.find((r) => r.key === key) ?? null
}

/**
 * One buyer's top-1 cumulative share, from the landscape census.
 *
 * `ticks` is a share-desc tuple list — [id, name, sector_id, share] — so the
 * lookup is by institution id, and a buyer below the census threshold simply
 * has no tick. Returns null rather than 0: "not measured" and "zero" are
 * different claims and the figure prints them differently.
 */
export function top1ShareFor(
  landscape: { ticks: Array<[number, string, number | null, number]> } | undefined,
  institutionId: number | null,
): number | null {
  if (!landscape || institutionId == null) return null
  const tick = landscape.ticks.find((t) => t[0] === institutionId)
  return tick ? tick[3] : null
}

/**
 * The share of everything ARIA flags in a group that this pattern accounts for.
 *
 * `flagged_value_mxn` is the honest denominator — all patterns, same group —
 * which is why the endpoint returns it beside the pattern's own slice instead
 * of leaving the figure to divide by a number from somewhere else.
 */
export function shareOfFlagged(row: AriaPatternGroupRow): number {
  return row.flagged_value_mxn > 0 ? (100 * row.total_value_mxn) / row.flagged_value_mxn : 0
}
