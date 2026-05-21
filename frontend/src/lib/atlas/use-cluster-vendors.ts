/**
 * useGalaxyVendors — fetch real vendors for EVERY cluster in the active lens.
 *
 * Atlas P6 Frontier B (2026-05-21). The macro view used to be 1,200 synthetic
 * lattice dots + ~5 named outliers per cluster. This hook fetches a real
 * cohort per cluster (default limit=30) so the galaxy is built from actual
 * vendor IDs — every dot is clickable and lands on /thread/{vendorId}.
 *
 * The data shape returned mirrors `NamedVendorDot` so existing consumers
 * (AtlasVendorDrawer, ClusterFloatingCard) work unchanged.
 *
 * Backend: GET /api/v1/atlas/cluster-vendors?lens=...&code=...&limit=...
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import api, { type AtlasClusterVendorItem } from '@/api/client'
import type { NamedVendorDot } from '@/components/charts/ConcentrationConstellation'

export interface GalaxyVendor extends NamedVendorDot {
  primarySectorCode: string | null
  tier: number
}

interface UseGalaxyVendorsResult {
  vendors: GalaxyVendor[]
  isLoading: boolean
  isError: boolean
}

const EMPTY_VENDORS: GalaxyVendor[] = []

function toGalaxyVendor(v: AtlasClusterVendorItem, clusterCode: string): GalaxyVendor {
  return {
    clusterCode,
    vendorId: v.vendor_id,
    name: v.name,
    riskScore: v.risk_score,
    primarySectorCode: v.primary_sector_code ?? null,
    tier: v.tier,
  }
}

/**
 * Fetch up to `perClusterLimit` vendors for EACH cluster code in parallel.
 * Returns a flat array + loading/error flags.
 *
 * Keys are stable per lens + code + limit, so switching modes warms the cache
 * for that lens permanently (5min staleTime).
 */
export function useGalaxyVendors(
  lens: string,
  clusterCodes: string[],
  perClusterLimit = 30,
  enabled = true,
): UseGalaxyVendorsResult {
  const queries = useQueries({
    queries: clusterCodes.map((code) => ({
      queryKey: ['atlas-galaxy-vendors', lens, code, perClusterLimit],
      queryFn: async () => {
        const res = await api.atlas.getClusterVendors({ lens, code, limit: perClusterLimit })
        return res.vendors.map((v) => toGalaxyVendor(v, code))
      },
      enabled: enabled && !!lens && !!code,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.every((q) => q.isError) && queries.length > 0

  const vendors = useMemo<GalaxyVendor[]>(() => {
    const out: GalaxyVendor[] = []
    for (const q of queries) {
      if (q.data) out.push(...q.data)
    }
    return out.length === 0 ? EMPTY_VENDORS : out
    // queries reference changes every render; depend on data identities instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.dataUpdatedAt).join('|')])

  return { vendors, isLoading, isError }
}

/**
 * Fetch the FULL vendor list for one cluster (limit=200 by default).
 * Used when the user zooms into a cluster — fans the dots out, and feeds
 * the AtlasVendorDrawer / ClusterFloatingCard.
 */
export function useZoomedClusterVendors(
  lens: string,
  clusterCode: string | null,
  limit = 200,
): UseGalaxyVendorsResult {
  const q = useQuery({
    queryKey: ['atlas-galaxy-vendors', lens, clusterCode, limit],
    queryFn: async () => {
      if (!clusterCode) return [] as GalaxyVendor[]
      const res = await api.atlas.getClusterVendors({ lens, code: clusterCode, limit })
      return res.vendors.map((v) => toGalaxyVendor(v, clusterCode))
    },
    enabled: !!lens && !!clusterCode,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const vendors = useMemo<GalaxyVendor[]>(() => {
    if (!q.data || q.data.length === 0) return EMPTY_VENDORS
    return q.data
  }, [q.data])

  return {
    vendors,
    isLoading: q.isLoading,
    isError: q.isError,
  }
}
