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
import { useQuery } from '@tanstack/react-query'
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
 * Fetch up to `perClusterLimit` vendors for EVERY cluster in ONE request.
 *
 * 2026-05-21 — switched from N parallel /cluster-vendors calls to a single
 * /cluster-vendors-batch request. The per-call TLS handshake over the public
 * edge was ~1.5s; batching collapses 7+ handshakes into 1 round-trip
 * (verified via vetting: 1,687ms avg per call → ~200ms total).
 *
 * Cache key: `['atlas-galaxy-vendors-batch', lens, joinedCodes, limit]`
 * — switching lens warms the per-lens cache for 5 min.
 */
export function useGalaxyVendors(
  lens: string,
  clusterCodes: string[],
  perClusterLimit = 30,
  enabled = true,
): UseGalaxyVendorsResult {
  // Sorted-join makes the key stable regardless of input order.
  const codesKey = useMemo(() => [...clusterCodes].sort().join(','), [clusterCodes])

  const q = useQuery({
    queryKey: ['atlas-galaxy-vendors-batch', lens, codesKey, perClusterLimit],
    queryFn: async () => {
      const res = await api.atlas.getClusterVendorsBatch({
        lens,
        codes: clusterCodes,
        limit: perClusterLimit,
      })
      const flat: GalaxyVendor[] = []
      for (const cluster of res.clusters) {
        for (const v of cluster.vendors) {
          flat.push(toGalaxyVendor(v, cluster.code))
        }
      }
      return flat
    },
    enabled: enabled && !!lens && clusterCodes.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const vendors = useMemo<GalaxyVendor[]>(() => {
    if (!q.data || q.data.length === 0) return EMPTY_VENDORS
    return q.data
  }, [q.data])

  return { vendors, isLoading: q.isLoading, isError: q.isError }
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
