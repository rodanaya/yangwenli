/**
 * useTopVendorsForCluster — fetch top 3 critical-risk vendors for a SINGLE
 * cluster (the currently zoomed one).
 *
 * omega-N-FIX2: scope reduced from "fetch top 3 per cluster across ALL
 * clusters at idle" (the original N1 implementation that overloaded the
 * macro view) to "fetch top 3 for the zoomed cluster only." Named outliers
 * now appear when the user has selected a cluster, never on the macro view.
 *
 * This also dodges the React #301 loop the original hook produced: useQueries
 * with N dynamic queries per render, returning a fresh `[]` reference, was
 * the suspected root cause. Using a single useQuery with a stable empty-array
 * fallback keeps every render's `namedVendors` reference equal when nothing
 * is zoomed.
 *
 * Backend: GET /api/v1/atlas/cluster-vendors?lens=...&code=...&limit=3
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import type { NamedVendorDot } from '@/components/charts/ConcentrationConstellation'

const EMPTY_NAMED_VENDORS: NamedVendorDot[] = []

/**
 * Fetches top 3 vendors for a single cluster. When `clusterCode` is null,
 * returns the same empty-array reference every call (no fetch, no churn).
 */
export function useTopVendorsForCluster(
  lens: string,
  clusterCode: string | null,
): NamedVendorDot[] {
  const query = useQuery({
    queryKey: ['atlas-top-vendors', lens, clusterCode],
    queryFn: async () => {
      if (!clusterCode) return [] as NamedVendorDot[]
      const response = await api.atlas.getClusterVendors({
        lens,
        code: clusterCode,
        limit: 3,
      })
      return response.vendors.map((v): NamedVendorDot => ({
        clusterCode,
        vendorId: v.vendor_id,
        name: v.name,
        riskScore: v.risk_score,
      }))
    },
    enabled: !!clusterCode && !!lens,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Stable reference: when no data, always return the same empty array.
  return useMemo(() => {
    if (!query.data || query.data.length === 0) return EMPTY_NAMED_VENDORS
    return query.data
  }, [query.data])
}

/**
 * Legacy export name — preserved so existing imports don't break.
 * Routes through the single-cluster hook for the FIRST entry only;
 * idle-mode callers (no clusterCode) get an empty array.
 */
export function useTopVendorsByCluster(
  _lens: string,
  _clusterCodes: string[],
): NamedVendorDot[] {
  // Idle-mode call site no longer fetches anything.
  return EMPTY_NAMED_VENDORS
}
