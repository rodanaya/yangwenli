/**
 * useGhostData — the live cuts behind «El hombre que ganó 370 millones de pesos
 * y desapareció» (SD-06).
 *
 * The story's load-bearing number was wrong by a factor of three. It said SAT's
 * definitive Article 69-B list confirms **42** of the 6,118 vendors ARIA flags
 * on the ghost pattern. The register says **126** — `/aria/stats`
 * (`external_counts.efos`), `/intersection/summary`
 * (`registry_breakdown.efos_definitivo`) and `/aria/queue?pattern=P2&
 * efos_only=true` all agree on it.
 *
 * The 42 is not invented; it is one table behind. `ghost_confidence_scores`,
 * the multi-signal ranking `/aria/ghost-suspects` serves, holds 6,034 of the
 * 6,118 and flags 42 of them EFOS. All 42 are inside the queue's 126, and
 * 6,118 − 6,034 = 126 − 42 = 84: the rows the ranking has never seen are the
 * listings SAT published after it was computed. So the queue is the authority
 * for who is confirmed, and the ranking is the authority for the signal
 * breakdown — which is exactly how the figures below split the work.
 *
 * Five calls' worth of pulls, five figures:
 *   /vendors/:id/risk-timeline × 5              F1 — the lifecycle strips
 *   /aria/ghost-suspects, pages 1–5             F2, F3 — the population
 *   /aria/queue?pattern=P2&efos_only=true × 2   F3, F4, F5 — the 126
 *   /aria/patterns/P2/institutions?vendors=3    F4, F5 — cohort + roster
 *   /aria/stats                                 F3 — the measured run
 */
import { useQuery } from '@tanstack/react-query'
import { ariaApi, vendorApi } from '@/api/client'
import type { GhostSuspect } from '@/api/types'

const HOUR = 60 * 60 * 1000

/** Buyers the roster pull ranks, and largest vendors inlined at each. */
export const TOP_BUYERS = 12
export const VENDORS_PER_BUYER = 3
/** Rows F5 draws of the vendors those buyers inline. */
export const ROSTER_ROWS = 8

/** `/aria/ghost-suspects` caps a page at 200; five pages is the head we draw. */
const GHOST_PER_PAGE = 200
const GHOST_PAGES = 5
export const GHOST_DRAWN = GHOST_PER_PAGE * GHOST_PAGES

/**
 * The five vendors chapter 1 names, in the order it names them.
 *
 * Every one was re-verified against `/vendors?search=` and its ARIA row: all
 * five exist, none carries a cleared disposition, and — the fact F2 draws —
 * they are ranks 1 to 5 by lifetime value in the whole scored cohort.
 */
export const NAMED_VENDORS: ReadonlyArray<{ id: number; name: string; persona: boolean }> = [
  { id: 205012, name: 'RAPISCAN SYSTEMS, INC.', persona: false },
  { id: 124418, name: 'APIS FOOD BV', persona: false },
  { id: 65586, name: 'EMILIO CARRANZA OBERSOHN', persona: true },
  { id: 54323, name: 'ARTURO PUEBLITA FERNANDEZ', persona: true },
  { id: 69019, name: 'VALERIA FERNANDEZ DIAZ', persona: true },
]

/** The lede: Carranza, the vendor the story opens on. */
export const CARRANZA_ID = 65586

/**
 * Review dispositions that mean a human looked and said no (SD-05's rule,
 * unchanged). A row carrying one of them is not drawn, named or chipped.
 */
const CLEARED = new Set(['false_positive', 'fp_excluded', 'dismissed'])

export function isCleared(v: { review_status?: string | null }): boolean {
  return CLEARED.has(v.review_status ?? '')
}

export interface LifecycleYear {
  year: number
  contracts: number
  value: number
}

export interface Lifecycle {
  id: number
  name: string
  persona: boolean
  /** The vendor's worst yearly risk reading — the chip's dot. */
  risk: number | null
  years: LifecycleYear[]
}

/** F1 — a year-by-year contracting record for each named vendor. */
export function useGhostLifecycles(enabled = true) {
  return useQuery({
    queryKey: ['ghost-lifecycles', NAMED_VENDORS.map((v) => v.id).join(',')],
    queryFn: async (): Promise<Lifecycle[]> =>
      Promise.all(
        NAMED_VENDORS.map(async (v) => {
          const t = await vendorApi.getRiskTimeline(v.id)
          const scores = t.timeline
            .map((y) => y.avg_risk_score)
            .filter((s): s is number => typeof s === 'number')
          return {
            id: v.id,
            // The register's own spelling wins over the constant, so a rename
            // upstream shows here rather than being papered over.
            name: t.vendor_name || v.name,
            persona: v.persona,
            risk: scores.length ? Math.max(...scores) : null,
            years: t.timeline
              .filter((y) => y.contract_count > 0)
              .map((y) => ({ year: y.year, contracts: y.contract_count, value: y.total_value })),
          }
        }),
      ),
    staleTime: HOUR,
    enabled,
  })
}

export interface GhostPopulation {
  /** The head of the ranking, drawn by F2 and read by F3. */
  rows: GhostSuspect[]
  /** Rows in `ghost_confidence_scores` — the whole scored population. */
  total: number
  tiers: { confirmed: number; multi_signal: number; behavioral: number }
}

/**
 * F2, F3 — the ghost-signal ranking, five pages of it.
 *
 * One query key for five requests, so the two figures that read it share one
 * cache entry. The head is NOT a random sample: it is ordered by evidence, and
 * it happens to contain every `confirmed` and every `multi_signal` row in the
 * table, plus the highest-scoring behavioural ones. F2's caption says so, and
 * quotes no population statistic the head cannot support.
 */
export function useGhostPopulation(enabled = true) {
  return useQuery({
    queryKey: ['ghost-suspects', GHOST_PAGES, GHOST_PER_PAGE],
    queryFn: async (): Promise<GhostPopulation> => {
      const pages = await Promise.all(
        Array.from({ length: GHOST_PAGES }, (_, i) =>
          ariaApi.getGhostSuspects({ page: i + 1, per_page: GHOST_PER_PAGE }),
        ),
      )
      return {
        rows: pages.flatMap((p) => p.data),
        total: pages[0].pagination.total,
        tiers: pages[0].tier_summary,
      }
    },
    staleTime: HOUR,
    enabled,
  })
}

export interface EfosSet {
  /** Every P2 vendor carrying SAT's definitive Art. 69-B listing. */
  ids: Set<number>
  count: number
  /** How many of them RUBLI's own case corpus already holds. */
  inGroundTruth: number
  /** Their combined lifetime federal contracting. */
  valueMxn: number
}

/**
 * F3, F4, F5 — the 126, fetched whole.
 *
 * `/aria/queue` caps a page at 100 and has no `sort` parameter (SD-05), but
 * with `efos_only` the filter itself is the ranking: two pages is the entire
 * set, so nothing here depends on an order the endpoint does not promise.
 */
export function useP2Efos(enabled = true) {
  return useQuery({
    queryKey: ['aria-queue', 'P2', 'efos', 200],
    queryFn: async (): Promise<EfosSet> => {
      const first = await ariaApi.getQueue({
        pattern: 'P2',
        efos_only: true,
        per_page: 100,
        page: 1,
      })
      const pages = first.pagination.total_pages
      const rest =
        pages > 1
          ? await Promise.all(
              Array.from({ length: pages - 1 }, (_, i) =>
                ariaApi.getQueue({ pattern: 'P2', efos_only: true, per_page: 100, page: i + 2 }),
              ),
            )
          : []
      const rows = [first, ...rest].flatMap((p) => p.data)
      return {
        ids: new Set(rows.map((r) => r.vendor_id)),
        count: first.pagination.total,
        inGroundTruth: rows.filter((r) => r.in_ground_truth).length,
        valueMxn: rows.reduce((s, r) => s + (r.total_value_mxn ?? 0), 0),
      }
    },
    staleTime: HOUR,
    enabled,
  })
}

/** F4, F5 — the P2 cohort block and its largest buyers, with vendors inlined. */
export function useP2Cohort(enabled = true) {
  return useQuery({
    queryKey: ['aria-pattern-groups', 'P2', 'institution', TOP_BUYERS, VENDORS_PER_BUYER],
    queryFn: () =>
      ariaApi.getPatternGroups('P2', {
        group: 'institution',
        limit: TOP_BUYERS,
        vendors: VENDORS_PER_BUYER,
      }),
    staleTime: HOUR,
    enabled,
  })
}

/** F3 — the last pipeline run, for the one latency number that is ours. */
export function useAriaRun(enabled = true) {
  return useQuery({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: HOUR,
    enabled,
  })
}

/** Seconds the last ARIA run took, or null when the register cannot say. */
export function runSeconds(started: string | null, completed: string | null): number | null {
  if (!started || !completed) return null
  // SQLite writes these naive ("2026-05-03T10:38:42.892718"); both ends are
  // parsed the same way, so the difference is right whatever the zone.
  const a = Date.parse(started)
  const b = Date.parse(completed)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  return (b - a) / 1000
}
