/**
 * COLLUSION EXPLORER — Bid-Rigging Pattern Analysis
 *
 * Editorial redesign: methodology explainer, hero stats, pair cards with
 * connection visualization, pattern legend, contextual empty/error states.
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ReactECharts from 'echarts-for-react'
import type * as echarts from 'echarts'
import {
  AlertTriangle,
  Users,
  GitMerge,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Shield,
  MapPin,
  HelpCircle,
  X,
  RotateCcw,
} from 'lucide-react'
import { collusionApi } from '@/api/client'
import type { CollusionPair, CollusionStats } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SharedContractsModal } from '@/components/SharedContractsModal'
import { PairDossierRow } from '@/components/collusion/PairDossierRow'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortField = 'shared_procedures' | 'co_bid_rate'

const DEFAULT_MIN_SHARED = 10
const DEFAULT_SORT: SortField = 'shared_procedures'
const DEFAULT_PER_PAGE = 50

// ---------------------------------------------------------------------------
// Methodology Callout
// ---------------------------------------------------------------------------

function MethodologyCallout() {
  const { t } = useTranslation('collusion')
  return (
    <details className="mb-8 group">
      <summary className="cursor-pointer list-none flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400 hover:text-amber-300 transition-colors select-none">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        {t('methodology.title')}
      </summary>
      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-sm text-zinc-300 leading-relaxed">
          {t('methodology.body')}
        </p>
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Hero Stats Strip
// ---------------------------------------------------------------------------

function HeroStats({ stats, loading }: { stats: CollusionStats | undefined; loading: boolean }) {
  const { t } = useTranslation('collusion')

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  // Safe defaults — API may return null fields or empty object
  const safe = {
    total_pairs: stats?.total_pairs ?? 0,
    potential_collusion_count: stats?.potential_collusion_count ?? 0,
    total_shared_procedures: stats?.total_shared_procedures ?? 0,
    max_co_bid_rate: stats?.max_co_bid_rate ?? 0,
  }

  const items: Array<{
    value: string
    label: string
    sub: string
    icon: React.ElementType
    accent?: boolean
  }> = [
    {
      value: formatNumber(safe.total_pairs),
      label: t('stats.totalPairs'),
      sub: t('stats.totalPairsSub'),
      icon: Users,
    },
    {
      value: formatNumber(safe.potential_collusion_count),
      label: t('stats.flaggedPairs'),
      sub: t('stats.flaggedPairsSub'),
      icon: AlertTriangle,
      accent: true,
    },
    {
      value: formatNumber(safe.total_shared_procedures),
      label: t('stats.sharedProcedures'),
      sub: t('stats.sharedProceduresSub'),
      icon: GitMerge,
    },
    {
      value: `${safe.max_co_bid_rate.toFixed(1)}%`,
      label: t('stats.maxRate'),
      sub: t('stats.maxRateSub'),
      icon: ArrowUpDown,
      accent: true,
    },
  ]

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      role="region"
      aria-label="Collusion statistics"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border p-4 ${
            item.accent
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <item.icon
              className={`h-3.5 w-3.5 ${item.accent ? 'text-red-400' : 'text-zinc-500'}`}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500">
              {item.label}
            </span>
          </div>
          <div
            className={`text-3xl font-mono font-bold ${
              item.accent ? 'text-red-400' : 'text-zinc-100'
            }`}
          >
            {item.value}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern Legend
// ---------------------------------------------------------------------------

function PatternLegend() {
  const { t } = useTranslation('collusion')

  const patterns: Array<{
    icon: React.ElementType
    name: string
    desc: string
    color: string
  }> = [
    { icon: Repeat, name: t('patterns.bidRotation'), desc: t('patterns.bidRotationDesc'), color: 'text-red-400' },
    { icon: Shield, name: t('patterns.coverBidding'), desc: t('patterns.coverBiddingDesc'), color: 'text-orange-400' },
    { icon: MapPin, name: t('patterns.marketAllocation'), desc: t('patterns.marketAllocationDesc'), color: 'text-amber-400' },
    { icon: HelpCircle, name: t('patterns.unknown'), desc: t('patterns.unknownDesc'), color: 'text-zinc-400' },
  ]

  return (
    <details className="mb-8 group">
      <summary className="cursor-pointer list-none flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-300 transition-colors select-none">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        {t('patterns.title')}
      </summary>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {patterns.map((p) => (
          <div key={p.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <p.icon className={`h-3.5 w-3.5 ${p.color}`} aria-hidden="true" />
              <span className={`text-xs font-semibold ${p.color}`}>{p.name}</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function Filters({
  flaggedOnly,
  setFlaggedOnly,
  minShared,
  setMinShared,
  sortBy,
  setSortBy,
  onReset,
}: {
  flaggedOnly: boolean
  setFlaggedOnly: (v: boolean) => void
  minShared: number
  setMinShared: (v: number) => void
  sortBy: SortField
  setSortBy: (v: SortField) => void
  onReset: () => void
}) {
  const { t } = useTranslation('collusion')

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
      {/* Flagged-only toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="sr-only peer"
            aria-label={t('filters.showFlaggedOnly')}
          />
          <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full peer peer-checked:bg-red-700 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-zinc-400">{t('filters.showFlaggedOnly')}</span>
      </label>

      {/* Divider */}
      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      {/* Min shared procedures */}
      <div className="flex items-center gap-2">
        <label htmlFor="min-shared-input" className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide">
          {t('filters.minShared')}
        </label>
        <input
          id="min-shared-input"
          type="number"
          min={1}
          max={500}
          value={minShared}
          onChange={(e) => setMinShared(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm font-mono px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      {/* Sort by */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide">
          {t('filters.sortBy')}
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="shared_procedures">{t('filters.sortShared')}</option>
          <option value="co_bid_rate">{t('filters.sortRate')}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-[10px] font-mono uppercase tracking-wide text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {t('filters.reset')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bid-Ring Network Graph (force-directed)
// ---------------------------------------------------------------------------

interface GraphNodeData {
  id: string
  name: string
  vendorId: number
  symbolSize: number
  degree: number
  maxRate: number
  itemStyle: { color: string }
  label: { show: boolean }
}

interface GraphEdgeData {
  source: string
  target: string
  value: number
  sharedCount: number
  lineStyle: { width: number; color: string; opacity: number; curveness: number }
}

function buildGraphData(pairs: CollusionPair[]): {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
} {
  // Take top 150 pairs by co_bid_rate (already sorted server-side, but be safe)
  const top = [...pairs]
    .sort((a, b) => b.co_bid_rate - a.co_bid_rate)
    .slice(0, 150)

  // Aggregate per-vendor degree + max rate
  const nodeMap = new Map<
    number,
    { name: string; degree: number; maxRate: number }
  >()
  for (const p of top) {
    const a = nodeMap.get(p.vendor_id_a)
    if (a) {
      a.degree += 1
      a.maxRate = Math.max(a.maxRate, p.co_bid_rate)
    } else {
      nodeMap.set(p.vendor_id_a, {
        name: p.vendor_name_a,
        degree: 1,
        maxRate: p.co_bid_rate,
      })
    }
    const b = nodeMap.get(p.vendor_id_b)
    if (b) {
      b.degree += 1
      b.maxRate = Math.max(b.maxRate, p.co_bid_rate)
    } else {
      nodeMap.set(p.vendor_id_b, {
        name: p.vendor_name_b,
        degree: 1,
        maxRate: p.co_bid_rate,
      })
    }
  }

  const colorForRate = (rate: number): string => {
    if (rate >= 80) return '#f87171' // risk-critical
    if (rate >= 50) return '#fb923c' // risk-high
    return '#fbbf24' // risk-medium
  }

  const nodes: GraphNodeData[] = Array.from(nodeMap.entries()).map(
    ([vendorId, info]) => {
      const symbolSize = Math.max(
        10,
        Math.min(38, 10 + Math.sqrt(info.degree) * 7),
      )
      return {
        id: `v-${vendorId}`,
        name: info.name,
        vendorId,
        symbolSize,
        degree: info.degree,
        maxRate: info.maxRate,
        itemStyle: { color: colorForRate(info.maxRate) },
        label: { show: false },
      }
    },
  )

  const maxShared = Math.max(1, ...top.map((p) => p.shared_procedures))
  const edges: GraphEdgeData[] = top.map((p) => {
    const widthScale = Math.sqrt(p.shared_procedures / maxShared)
    return {
      source: `v-${p.vendor_id_a}`,
      target: `v-${p.vendor_id_b}`,
      value: Math.round(p.co_bid_rate * 10) / 10,
      sharedCount: p.shared_procedures,
      lineStyle: {
        width: Math.max(1, widthScale * 5),
        color: colorForRate(p.co_bid_rate),
        opacity: 0.55,
        curveness: 0.18,
      },
    }
  })

  return { nodes, edges }
}

interface BidRingGraphProps {
  pairs: CollusionPair[]
  loading: boolean
  onNodeClick: (vendorId: number, vendorName: string) => void
}

function BidRingGraph({ pairs, loading, onNodeClick }: BidRingGraphProps) {
  const chartRef = useRef<ReactECharts>(null)

  const { nodes, edges } = useMemo(() => buildGraphData(pairs), [pairs])

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0a0a0a',
        borderColor: '#3f3f46',
        textStyle: { color: '#f4f4f5', fontSize: 12 },
        formatter: (params: {
          dataType: string
          data: GraphNodeData | (GraphEdgeData & { source: string; target: string })
        }) => {
          if (params.dataType === 'edge') {
            const e = params.data as GraphEdgeData
            const src = nodes.find((n) => n.id === e.source)?.name ?? e.source
            const tgt = nodes.find((n) => n.id === e.target)?.name ?? e.target
            return `<div style="max-width:280px"><b>${src}</b><br/>↔<br/><b>${tgt}</b><br/><br/>Co-bid rate: <b>${e.value}%</b><br/>Shared procedures: ${formatNumber(e.sharedCount)}</div>`
          }
          const n = params.data as GraphNodeData
          return `<div style="max-width:280px"><b>${n.name}</b><br/>Suspicious pairs: ${n.degree}<br/>Max co-bid rate: ${n.maxRate.toFixed(1)}%</div>`
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          animation: true,
          roam: true,
          draggable: true,
          label: {
            show: nodes.length <= 40,
            position: 'right',
            fontSize: 11,
            color: '#f4f4f5',
          },
          emphasis: {
            focus: 'adjacency',
            label: { show: true, fontSize: 11, color: '#f4f4f5' },
            lineStyle: { width: 4 },
          },
          force: {
            repulsion: 900,
            gravity: 0.02,
            edgeLength: [120, 350],
            layoutAnimation: true,
          },
          lineStyle: { curveness: 0.2, opacity: 0.6 },
          data: nodes,
          links: edges,
        },
      ],
    } as unknown as echarts.EChartsOption
  }, [nodes, edges])

  const handleEvents = useMemo(
    () => ({
      click: (params: { dataType?: string; data?: GraphNodeData }) => {
        if (params.dataType !== 'node' || !params.data) return
        onNodeClick(params.data.vendorId, params.data.name)
      },
    }),
    [onNodeClick],
  )

  const handleReset = () => {
    const inst = chartRef.current?.getEchartsInstance()
    inst?.dispatchAction({ type: 'restore' })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div>
          <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-500">
            Bid-Ring Network
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Top 150 suspicious pairs · drag to explore · hover to focus · click a node to filter
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
          aria-label="Reset graph view"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset View
        </button>
      </div>
      <div style={{ height: 580, width: '100%', position: 'relative' }}>
        {loading || nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <div className="h-6 w-6 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                {loading ? 'Loading network…' : 'No pairs available'}
              </span>
            </div>
          </div>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: 580, width: '100%' }}
            onEvents={handleEvents}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dossier Skeleton — matches the vertical rhythm of PairDossierRow
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="space-y-0 border-t border-[rgba(255,255,255,0.06)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[108px] rounded-none border-b border-[rgba(255,255,255,0.06)]" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <Users className="h-8 w-8 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-zinc-300 mb-1">{t('empty.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">{t('empty.body')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-red-300 mb-1">{t('error.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">{t('error.body')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CollusionExplorer() {
  const { t } = useTranslation('collusion')

  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [showGraph, setShowGraph] = useState(false)

  // Selected vendor (filtered from graph node click)
  const [selectedVendor, setSelectedVendor] = useState<{ id: number; name: string } | null>(null)

  // Shared contracts modal state
  const [selectedPair, setSelectedPair] = useState<{
    vendorAId: number
    vendorBId: number
    vendorAName: string
    vendorBName: string
  } | null>(null)

  const handleViewContracts = useCallback(
    (vendorAId: number, vendorBId: number, vendorAName: string, vendorBName: string) => {
      setSelectedPair({ vendorAId, vendorBId, vendorAName, vendorBName })
    },
    [],
  )

  // Reset page when filters change
  const handleFlaggedOnly = (v: boolean) => { setFlaggedOnly(v); setPage(1) }
  const handleMinShared = (v: number) => { setMinShared(v); setPage(1) }
  const handleSortBy = (v: SortField) => { setSortBy(v); setPage(1) }
  const handleReset = () => {
    setFlaggedOnly(true)
    setMinShared(DEFAULT_MIN_SHARED)
    setSortBy(DEFAULT_SORT)
    setPage(1)
    setSelectedVendor(null)
  }

  const handleGraphNodeClick = useCallback((vendorId: number, vendorName: string) => {
    setSelectedVendor({ id: vendorId, name: vendorName })
    setPage(1)
  }, [])

  const queryParams = useMemo(
    () => ({
      is_potential_collusion: flaggedOnly ? true : undefined,
      min_shared_procedures: minShared,
      sort_by: sortBy,
      page,
      per_page: DEFAULT_PER_PAGE,
    }),
    [flaggedOnly, minShared, sortBy, page],
  )

  const {
    data: pairsData,
    isLoading: pairsLoading,
    isError: pairsError,
  } = useQuery({
    queryKey: ['collusion-pairs', queryParams],
    queryFn: () => collusionApi.getPairs(queryParams),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['collusion-stats'],
    queryFn: () => collusionApi.getStats(),
    staleTime: 30 * 60 * 1000,
  })

  // Separate broader fetch dedicated to feeding the network graph
  // (top 100 by co_bid_rate, flagged-only, regardless of UI filters)
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['collusion-pairs-graph'],
    queryFn: () =>
      collusionApi.getPairs({
        is_potential_collusion: true,
        min_shared_procedures: 10,
        sort_by: 'co_bid_rate',
        page: 1,
        per_page: 100,
      }),
    staleTime: 30 * 60 * 1000,
  })
  const graphPairs: CollusionPair[] = graphData?.data ?? []

  const rawPairs: CollusionPair[] = pairsData?.data ?? []
  // Apply client-side selectedVendor filter (server doesn't support vendor filter)
  const pairs: CollusionPair[] = useMemo(() => {
    if (!selectedVendor) return rawPairs
    return rawPairs.filter(
      (p) =>
        p.vendor_id_a === selectedVendor.id ||
        p.vendor_id_b === selectedVendor.id,
    )
  }, [rawPairs, selectedVendor])

  const pagination = pairsData?.pagination
  const totalPages = selectedVendor ? 1 : pagination?.total_pages ?? 1
  const total = selectedVendor ? pairs.length : pagination?.total ?? 0

  const showingFrom = total === 0 ? 0 : selectedVendor ? 1 : (page - 1) * DEFAULT_PER_PAGE + 1
  const showingTo = selectedVendor ? pairs.length : Math.min(page * DEFAULT_PER_PAGE, total)

  const editorialDate = useMemo(
    () =>
      new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  )

  const flaggedCount = stats?.potential_collusion_count ?? 0

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Editorial Masthead ── */}
      <div className="border-b border-[rgba(255,255,255,0.08)] px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Dateline strip */}
          <div className="flex items-center gap-3 mb-5 text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="capitalize">{editorialDate}</span>
            <span className="text-zinc-700">·</span>
            <span>Modelo v0.6.5</span>
            <span className="text-zinc-700">·</span>
            <span>Pares analizados {formatNumber(stats?.total_pairs ?? 0)}</span>
          </div>

          {/* Kicker with rule */}
          <p className="text-kicker text-kicker--investigation editorial-kicker-rule mb-3">
            Dossier · Colusión entre proveedores
          </p>

          {/* Serif display headline */}
          <h1 className="text-editorial-display mb-4">
            {t('title')}
          </h1>

          {/* Italic deck */}
          <p className="text-deck max-w-3xl mb-4">
            Cada fila es una pareja de proveedores que comparecen juntos en las
            mismas licitaciones. La punta de flecha muestra quién depende de
            quién: a mayor asimetría, mayor evidencia de licitación de cobertura.
          </p>

          {/* Byline */}
          <p className="text-byline">
            Por RUBLI · {formatNumber(flaggedCount)} parejas marcadas como potencialmente coludidas ·
            Fuente: COMPRANET 2010–2025
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Methodology ── */}
        <MethodologyCallout />

        {/* ── Hero Stats ── */}
        <HeroStats stats={stats} loading={statsLoading} />

        {/* ── Pattern Legend ── */}
        <PatternLegend />

        {/* ── Bid-Ring Network Graph (collapsible) ── */}
        <button
          type="button"
          onClick={() => setShowGraph((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors mb-6"
          aria-expanded={showGraph}
        >
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
              Bid-Ring Network
            </span>
            <span className="text-[11px] text-zinc-600 ml-3">
              Top 150 suspicious pairs — interactive graph
            </span>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-zinc-500 transition-transform ${showGraph ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>
        {showGraph && (
          <ErrorBoundary fallback={<div className="h-64 rounded-xl border border-border/20 flex items-center justify-center text-xs text-text-muted">Network graph unavailable</div>}>
            <BidRingGraph
              pairs={graphPairs}
              loading={graphLoading}
              onNodeClick={handleGraphNodeClick}
            />
          </ErrorBoundary>
        )}

        {/* ── Filters ── */}
        <Filters
          flaggedOnly={flaggedOnly}
          setFlaggedOnly={handleFlaggedOnly}
          minShared={minShared}
          setMinShared={handleMinShared}
          sortBy={sortBy}
          setSortBy={handleSortBy}
          onReset={handleReset}
        />

        {/* ── Selected vendor filter chip ── */}
        {selectedVendor && (
          <div className="mb-4 flex items-center gap-2 flex-wrap" aria-live="polite">
            <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">
              Viewing pairs for:
            </span>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold max-w-md">
              <span className="truncate">{selectedVendor.name}</span>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="hover:text-amber-100 transition-colors shrink-0"
                aria-label="Clear vendor filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* ── Showing count ── */}
        {!pairsLoading && !pairsError && total > 0 && (
          <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-600 mb-4" aria-live="polite">
            {t('pagination.showing', {
              from: showingFrom,
              to: showingTo,
              total: formatNumber(total),
            })}
          </p>
        )}

        {/* ── Dossier Rows ── */}
        {pairsLoading ? (
          <CardSkeleton />
        ) : pairsError ? (
          <ErrorState />
        ) : pairs.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            role="list"
            aria-label="Parejas de proveedores sospechosos"
            className="border-t border-[rgba(255,255,255,0.06)]"
          >
            {pairs.map((pair, idx) => {
              const rank = (page - 1) * DEFAULT_PER_PAGE + idx + 1
              // Top-5 of the first page get the full deck treatment; the rest
              // render as compact act-strip rows so the page stays scannable.
              const isHeadline = page === 1 && idx < 5
              return (
                <PairDossierRow
                  key={`${pair.vendor_id_a}-${pair.vendor_id_b}`}
                  pair={pair}
                  rank={rank}
                  variant={isHeadline ? 'full' : 'compact'}
                  onViewContracts={handleViewContracts}
                />
              )
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800"
            role="navigation"
            aria-label="Pagination"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.previous')}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('pagination.previous')}
            </button>

            <span className="text-[10px] font-mono text-zinc-600" aria-live="polite">
              {t('pagination.pageOf', { page, total: totalPages })}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.next')}
            >
              {t('pagination.next')}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Source footnote ── */}
        <p className="text-[10px] text-zinc-700 mt-8 text-center">
          COMPRANET 2010-2025 &middot; co_bidding_stats &middot; RUBLI v0.6.5
        </p>
      </div>

      {/* ── Shared Contracts Modal ── */}
      {selectedPair && (
        <SharedContractsModal
          vendorAId={selectedPair.vendorAId}
          vendorBId={selectedPair.vendorBId}
          vendorAName={selectedPair.vendorAName}
          vendorBName={selectedPair.vendorBName}
          onClose={() => setSelectedPair(null)}
        />
      )}
    </div>
  )
}
