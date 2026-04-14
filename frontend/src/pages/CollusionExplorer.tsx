/**
 * COLLUSION EXPLORER — Bid-Rigging Pattern Analysis
 *
 * Editorial redesign: methodology explainer, hero stats, pair cards with
 * connection visualization, pattern legend, contextual empty/error states.
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
  FileText,
} from 'lucide-react'
import { collusionApi } from '@/api/client'
import type { CollusionPair, CollusionStats } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SharedContractsModal } from '@/components/SharedContractsModal'

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

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  const items: Array<{
    value: string
    label: string
    sub: string
    icon: React.ElementType
    accent?: boolean
  }> = [
    {
      value: formatNumber(stats.total_pairs),
      label: t('stats.totalPairs'),
      sub: t('stats.totalPairsSub'),
      icon: Users,
    },
    {
      value: formatNumber(stats.potential_collusion_count),
      label: t('stats.flaggedPairs'),
      sub: t('stats.flaggedPairsSub'),
      icon: AlertTriangle,
      accent: true,
    },
    {
      value: formatNumber(stats.total_shared_procedures),
      label: t('stats.sharedProcedures'),
      sub: t('stats.sharedProceduresSub'),
      icon: GitMerge,
    },
    {
      value: `${stats.max_co_bid_rate.toFixed(1)}%`,
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
// Pair Card
// ---------------------------------------------------------------------------

interface PairCardProps {
  pair: CollusionPair
  onViewContracts: (vendorAId: number, vendorBId: number, vendorAName: string, vendorBName: string) => void
}

function PairCard({ pair, onViewContracts }: PairCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('collusion')

  const rate = pair.co_bid_rate
  const isHigh = rate >= 80
  const isMid = rate >= 50
  const accentBar = isHigh ? 'bg-red-500' : isMid ? 'bg-orange-500' : 'bg-amber-500'
  const accentText = isHigh ? 'text-red-400' : isMid ? 'text-orange-400' : 'text-amber-400'
  const accentBorder = isHigh ? 'border-red-500/15' : isMid ? 'border-orange-500/15' : 'border-amber-500/15'

  return (
    <div className={`relative flex items-center gap-0 rounded-lg border ${accentBorder} bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors overflow-hidden`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${accentBar}`} aria-hidden="true" />

      {/* Vendors + rate */}
      <div className="flex items-center gap-3 pl-4 pr-2 py-2.5 flex-1 min-w-0">
        {pair.is_potential_collusion && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
        )}

        {/* Vendor A */}
        <button
          type="button"
          onClick={() => navigate(`/vendors/${pair.vendor_id_a}`)}
          className="min-w-0 text-left group flex-1"
          aria-label={`${t('pairCard.viewProfile')}: ${pair.vendor_name_a}`}
        >
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider leading-none mb-0.5">A</div>
          <div className="text-xs font-medium text-zinc-200 group-hover:text-accent transition-colors truncate leading-snug">
            {pair.vendor_name_a}
          </div>
          <div className="text-[9px] font-mono text-zinc-600 leading-none mt-0.5">
            {formatNumber(pair.vendor_a_procedures)}
          </div>
        </button>

        {/* Rate column */}
        <div className="flex flex-col items-center shrink-0 gap-0.5 px-1">
          <span className={`text-sm font-mono font-bold ${accentText} leading-none`}>
            {rate.toFixed(0)}%
          </span>
          <div className="w-10 h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
            <div className={`h-full ${accentBar} rounded-full`} style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wide mt-0.5">
            {formatNumber(pair.shared_procedures)}
          </span>
        </div>

        {/* Vendor B */}
        <button
          type="button"
          onClick={() => navigate(`/vendors/${pair.vendor_id_b}`)}
          className="min-w-0 text-left group flex-1"
          aria-label={`${t('pairCard.viewProfile')}: ${pair.vendor_name_b}`}
        >
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider leading-none mb-0.5">B</div>
          <div className="text-xs font-medium text-zinc-200 group-hover:text-accent transition-colors truncate leading-snug">
            {pair.vendor_name_b}
          </div>
          <div className="text-[9px] font-mono text-zinc-600 leading-none mt-0.5">
            {formatNumber(pair.vendor_b_procedures)}
          </div>
        </button>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-0.5 pr-2 shrink-0">
        <button
          type="button"
          onClick={() => onViewContracts(pair.vendor_id_a, pair.vendor_id_b, pair.vendor_name_a, pair.vendor_name_b)}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
          title={t('pairCard.sharedContracts')}
          aria-label={t('pairCard.sharedContracts')}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {pair.is_potential_collusion && (
          <button
            type="button"
            onClick={() => navigate(`/thread/${pair.vendor_id_a}`)}
            className="p-1.5 rounded text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            title={t('pairCard.investigationThread')}
            aria-label={t('pairCard.investigationThread')}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Editorial Header ── */}
      <div className="border-b border-zinc-800 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
            Análisis de Colusión · Red de Connivencia
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-zinc-100 leading-tight mb-3"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('title')}
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-3xl">
            Red de relaciones sospechosas entre proveedores. Nodos = proveedores, aristas = procedimientos compartidos. Haz clic en un nodo para investigar a sus cómplices.
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
          <BidRingGraph
            pairs={graphPairs}
            loading={graphLoading}
            onNodeClick={handleGraphNodeClick}
          />
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

        {/* ── Pair Cards ── */}
        {pairsLoading ? (
          <CardSkeleton />
        ) : pairsError ? (
          <ErrorState />
        ) : pairs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pairs.map((pair) => (
              <PairCard
                key={`${pair.vendor_id_a}-${pair.vendor_id_b}`}
                pair={pair}
                onViewContracts={handleViewContracts}
              />
            ))}
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
