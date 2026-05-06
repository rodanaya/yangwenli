/**
 * useTopVendorsByCluster — fetches top 3 critical-risk vendors per cluster
 * for named-outlier dot rendering in the constellation.
 *
 * omega-N N1: vendor data fetching for named-outlier dots.
 * Ref: Reuters "Forever Pollution" (named outliers + persistent labels) +
 *      NYT Upshot annotated dot strip.
 *
 * Uses TanStack Query useQueries for parallel fetches across all cluster codes.
 * Falls back gracefully to empty array on backend error or 0 results.
 * Aggressive staleTime=5min so repeated mode/year toggles don't re-fetch.
 *
 * Backend endpoint: GET /api/v1/atlas/cluster-vendors?lens=...&code=...&limit=3
 */

import { useQueries } from '@tanstack/react-query'
import api from '@/api/client'
import type { NamedVendorDot } from '@/components/charts/ConcentrationConstellation'

/**
 * For each cluster code in `clusterCodes`, fetches the top 3 vendors by
 * risk_score from the backend cluster-vendors endpoint and returns a flat
 * array of NamedVendorDot entries.
 *
 * Returns empty array if backend errors or returns 0 results.
 */
export function useTopVendorsByCluster(
  lens: string,
  clusterCodes: string[],
): NamedVendorDot[] {
  const results = useQueries({
    queries: clusterCodes.map((code) => ({
      queryKey: ['atlas-top-vendors', lens, code] as const,
      queryFn: async () => {
        const response = await api.atlas.getClusterVendors({ lens, code, limit: 3 })
        return { code, vendors: response.vendors }
      },
      staleTime: 5 * 60 * 1000,
      enabled: clusterCodes.length > 0 && !!lens && !!code,
      // Don't throw — return empty on error so constellation renders gracefully
      retry: 1,
    })),
  })

  // Flatten results into NamedVendorDot[]
  const named: NamedVendorDot[] = []
  for (const result of results) {
    if (!result.data) continue
    const { code, vendors } = result.data
    for (const v of vendors) {
      named.push({
        clusterCode: code,
        vendorId: v.vendor_id,
        name: v.name,
        riskScore: v.risk_score,
      })
    }
  }
  return named
}
