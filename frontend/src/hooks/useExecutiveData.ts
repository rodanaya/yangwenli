/**
 * useExecutiveData — consolidates the Executive Dashboard's data into ONE
 * request via GET /executive/dashboard-bundle (previously 6 separate calls
 * fired in parallel on mount). The endpoint fetches all 6 blocks concurrently
 * server-side and caches them, so the page does a single round-trip.
 *
 * Each block is surfaced individually with a per-section null/empty fallback
 * (a block that failed or timed out comes back null), plus one loading/error
 * signal for the page chrome. Long staleTime/gcTime because the data is stable
 * (overview totals, GT counts, ARIA tier distribution all drift slowly).
 *
 * The Observatory map (cluster-stats) stays on its own hook (useScatterClusters)
 * because it is lens-dependent and re-fetches as the user toggles patterns /
 * sectors / categories / terms.
 */
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import type {
  FastDashboardResponse,
  ContractListItem,
  AriaStatsResponse,
  ExecutiveSummaryResponse,
  ScandalStats,
  CaptureLeadersResponse,
} from '@/api/types'

export interface ExecutiveData {
  dashboard: FastDashboardResponse | null
  recentCritical: ContractListItem[]
  ariaStats: AriaStatsResponse | null
  executiveSummary: ExecutiveSummaryResponse | null
  caseStats: ScandalStats | null
  captureLeaders: CaptureLeadersResponse | null
  /** True until the single bundle request settles. */
  isLoading: boolean
  /** True if the bundle request itself failed (individual blocks fall back to null). */
  isError: boolean
}

export function useExecutiveData(): ExecutiveData {
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ['executive', 'dashboard-bundle'],
    queryFn: () => analysisApi.getDashboardBundle(),
    staleTime: 10 * 60 * 1000, // 10 min (server also caches the bundle ~2 min)
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })

  return {
    dashboard: bundle?.fast_dashboard ?? null,
    recentCritical: bundle?.recent_critical?.data ?? [],
    ariaStats: bundle?.aria_stats ?? null,
    executiveSummary: bundle?.executive_summary ?? null,
    caseStats: bundle?.case_stats ?? null,
    captureLeaders: bundle?.capture_leaders ?? null,
    isLoading,
    isError,
  }
}
