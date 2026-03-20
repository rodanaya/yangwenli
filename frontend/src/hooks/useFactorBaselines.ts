import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import type { FactorBaselineResponse } from '@/api/client'

/**
 * Hook to fetch factor baselines (mean/stddev) for a given sector and year.
 * Caches for 1 hour since baselines change only when features are recomputed.
 */
export function useFactorBaseline(sectorId: number, year: number) {
  return useQuery<FactorBaselineResponse>({
    queryKey: ['factor-baselines', sectorId, year],
    queryFn: () => analysisApi.getFactorBaselines(sectorId, year),
    staleTime: 3600000, // 1 hour
    enabled: sectorId > 0 && year > 0,
  })
}

export default useFactorBaseline
