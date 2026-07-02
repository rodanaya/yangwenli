/**
 * useLeagueField — paged assembly of the full federal scorecard field.
 *
 * The scorecards list endpoint caps `per_page` at 100, so the ~476-strong
 * federal board (445 at nc>=30) needs ~5 requests to assemble in full. This
 * hook fetches page 1 to learn `total_pages`, then fires the remaining pages
 * in parallel and flattens the result — a one-shot 30KB payload, cached for
 * 30 minutes (the field barely moves between scoring runs).
 *
 * Spec: institutions_fable_spec.md §3.1(I) "LA PLACA" · §3.3 · §4-P1.
 */
import { useQuery } from '@tanstack/react-query'
import { scorecardApi } from '@/api/client'

export interface LeagueFieldItem {
  institution_id: number
  institution_name: string
  ramo_code: number | null
  sector_name: string | null
  total_score: number
  grade: string
  money_at_risk_mxn: number | null
  total_contracts: number | null
}

export type LeagueScope = 'federal' | 'subnational' | 'all'

/** Mirrors InstitutionLeague's RELIABLE_MIN gate — noise below 30 contracts. */
const MIN_CONTRACTS = 30
const PER_PAGE = 100

async function fetchFullField(scope: LeagueScope): Promise<LeagueFieldItem[]> {
  const first = await scorecardApi.getInstitutions({
    scope,
    min_contracts: MIN_CONTRACTS,
    per_page: PER_PAGE,
    sort_by: 'total_score',
    order: 'desc',
    page: 1,
  })
  const items: LeagueFieldItem[] = [...(first.data ?? [])]
  const totalPages: number = first.total_pages ?? 1

  if (totalPages > 1) {
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const rest = await Promise.all(
      remainingPages.map((page) =>
        scorecardApi.getInstitutions({
          scope,
          min_contracts: MIN_CONTRACTS,
          per_page: PER_PAGE,
          sort_by: 'total_score',
          order: 'desc',
          page,
        }),
      ),
    )
    for (const r of rest) items.push(...(r.data ?? []))
  }

  return items
}

/**
 * Assembles the full federal scorecard field (all institutions with
 * nc>=30, all pages flattened). Only meaningful for `scope === 'federal'` —
 * subnational/all boards have incomparable sample sizes and the plate
 * declines to render for them (see SpectralRegister call site).
 */
export function useLeagueField(scope: LeagueScope) {
  return useQuery<LeagueFieldItem[]>({
    queryKey: ['institution-league-field', scope],
    queryFn: () => fetchFullField(scope),
    staleTime: 30 * 60 * 1000,
    enabled: scope === 'federal',
  })
}
