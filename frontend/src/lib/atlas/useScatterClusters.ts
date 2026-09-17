/**
 * useScatterClusters — the single source of truth for the faithful Observatory
 * bubble data (ScatterCluster[]), shared by /atlas and the /dashboard § 1 map.
 *
 * Prefers LIVE per-cluster aggregates from `/atlas/cluster-stats`; falls back
 * to the static pattern/sector/sexenio meta only while loading. Categories
 * render live data or nothing — never a curated table. Shared by /atlas and
 * the /dashboard § 1 map so both surfaces stay in lockstep.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { atlasApi } from '@/api/client'
import {
  buildPatternMeta,
  buildSectorMeta,
  buildSexenioMeta,
  type ClusterMeta,
  type ConstellationMode,
} from '@/components/charts/ConcentrationConstellation'
import type { ScatterCluster } from '@/components/atlas/ObservatoryScatter'

/** Static meta for the active lens (the faithful-scatter fallback source). */
function activeMetaFor(mode: ConstellationMode, lang: 'en' | 'es'): ClusterMeta[] {
  const isEs = lang === 'es'
  if (mode === 'sectors') return buildSectorMeta(isEs)
  if (mode === 'sexenios') return buildSexenioMeta(isEs)
  // Categories has no curated meta. A hand-typed table of 33 invented cohorts
  // used to live here and rendered as real data on /atlas and /dashboard.
  // Live cluster-stats only; empty until the backend serves the lens.
  if (mode === 'categories') return []
  return buildPatternMeta(isEs)
}

/**
 * Faithful-Observatory cluster data for a lens. Live aggregates win; static
 * meta is the graceful fallback (and the only source for categories/sexenios).
 */
export function useScatterClusters(
  mode: ConstellationMode,
  lang: 'en' | 'es',
): { clusters: ScatterCluster[]; isLoading: boolean } {
  const { data: clusterStats, isLoading } = useQuery({
    queryKey: ['atlas-cluster-stats', mode],
    queryFn: () => atlasApi.getClusterStats(mode),
    enabled: mode === 'patterns' || mode === 'sectors' || mode === 'categories',
    staleTime: 10 * 60 * 1000,
  })

  const activeMeta = useMemo(() => activeMetaFor(mode, lang), [mode, lang])

  const clusters = useMemo(() => {
    const live = clusterStats?.clusters
    if (live && live.length > 0) {
      return live.map((c) => ({
        code: c.code,
        label: lang === 'es' ? c.label_es : c.label_en,
        vendors: c.vendors,
        t1: c.t1,
        highRiskPct: c.high_risk_rate,
      }))
    }
    return activeMeta.map((m) => ({
      code: m.code, label: m.label, vendors: m.vendors, t1: m.t1, highRiskPct: m.highRiskPct,
    }))
  }, [clusterStats, activeMeta, lang])

  return { clusters, isLoading }
}
