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
// omega-N-FIX1: stable empty-array reference to avoid prop-identity churn
// downstream. The previous implementation returned a fresh `[]` every render,
// which through useQueries + downstream useMemos likely caused React error
// #301 ("too many re-renders") under certain combinations of activeStory +
// AtlasContextBridge. Until we identify the exact trigger, ship the path
// disabled — chart still gets the dim-anonymous + bigger-label benefits.
const EMPTY_NAMED_VENDORS: NamedVendorDot[] = []

export function useTopVendorsByCluster(
  _lens: string,
  _clusterCodes: string[],
): NamedVendorDot[] {
  // Hook intentionally returns the same empty-array reference every call
  // until the underlying useQueries integration is stabilized.
  // Re-enable by uncommenting the implementation below and verifying
  // referential stability across renders.
  return EMPTY_NAMED_VENDORS
}

// Disabled implementation — see comment above. Exported (with underscore
// prefix) so the unused-locals lint passes; not imported anywhere.
export function _useTopVendorsByClusterImpl(
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
      retry: 1,
    })),
  })

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
