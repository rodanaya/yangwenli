/**
 * useGlobalStats — single source of truth for platform-wide summary metrics.
 *
 * All pages that display headline numbers (total contracts, high-risk rate,
 * total value, etc.) MUST read from this hook to ensure consistency.
 * The hook wraps the /stats/dashboard/fast endpoint with a long staleTime
 * so it is fetched once per session and shared across all consumers.
 */

import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import type { FastDashboardData, DashboardOverview } from '@/api/types'

const QUERY_KEY = ['global', 'stats'] as const

/** Canonical platform-wide numbers derived from the fast dashboard overview. */
export interface GlobalStats {
  totalContracts: number
  totalValueMxn: number
  totalVendors: number
  totalInstitutions: number
  highRiskContracts: number
  /** high + critical combined, as a percentage */
  highRiskPct: number
  directAwardPct: number
  singleBidPct: number
  avgRiskScore: number
  minYear: number
  maxYear: number
  /** Raw overview object for consumers that need additional fields */
  overview: DashboardOverview | undefined
  isLoading: boolean
}

const FALLBACK: GlobalStats = {
  totalContracts: 3_051_294,
  totalValueMxn: 9_900_000_000_000,
  totalVendors: 0,
  totalInstitutions: 0,
  highRiskContracts: 281_615,
  highRiskPct: 9.2,
  directAwardPct: 0,
  singleBidPct: 0,
  avgRiskScore: 0,
  minYear: 2002,
  maxYear: 2025,
  overview: undefined,
  isLoading: false,
}

export function useGlobalStats(): GlobalStats {
  const { data, isLoading } = useQuery<FastDashboardData>({
    queryKey: QUERY_KEY,
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 30 * 60 * 1000, // 30 min — overview rarely changes mid-session
    gcTime: 60 * 60 * 1000,    // 1 hr in cache
    retry: 1,
  })

  const ov = data?.overview
  if (!ov || isLoading) return { ...FALLBACK, isLoading }

  return {
    totalContracts: ov.total_contracts ?? FALLBACK.totalContracts,
    totalValueMxn: ov.total_value_mxn ?? FALLBACK.totalValueMxn,
    totalVendors: ov.total_vendors ?? 0,
    totalInstitutions: ov.total_institutions ?? 0,
    highRiskContracts: ov.high_risk_contracts ?? FALLBACK.highRiskContracts,
    highRiskPct: ov.high_risk_pct ?? FALLBACK.highRiskPct,
    directAwardPct: ov.direct_award_pct ?? 0,
    singleBidPct: ov.single_bid_pct ?? 0,
    avgRiskScore: ov.avg_risk_score ?? 0,
    minYear: ov.min_year ?? 2002,
    maxYear: ov.max_year ?? 2025,
    overview: ov,
    isLoading: false,
  }
}
