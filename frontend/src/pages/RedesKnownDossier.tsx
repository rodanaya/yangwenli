/**
 * RedesKnownDossier — "LA RED INVISIBLE"
 *
 * Intelligence dossier of known corruption networks in Mexico's procurement system.
 * Presents ARIA Tier 1 + Tier 2 vendors as investigation dossiers.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import type * as echarts from 'echarts'
import { Skeleton } from '@/components/ui/skeleton'
import { ariaApi, vendorApi, networkApi } from '@/api/client'
import type { AriaQueueItem, VendorDetailResponse } from '@/api/types'
import { cn, formatCompactMXN, formatNumber, formatPercent, formatPercentSafe } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { getRiskLevelFromScore } from '@/lib/constants'
import {
  Search, Shield, ArrowRight, AlertTriangle, Ghost, Building, Users,
  X, ExternalLink, Loader2, AlertCircle, LayoutGrid, List,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const staggerItem: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
const panelVariants: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 35 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
}

// ---------------------------------------------------------------------------
// Pattern helpers
// ---------------------------------------------------------------------------

const PATTERN_ICONS: Record<string, React.ElementType> = {
  P1: Building,
  P2: Ghost,
  P3: Users,
  P6: Shield,
  P7: AlertTriangle,
}

const PATTERN_BORDER_COLORS: Record<string, string> = {
  P1: 'border-l-red-500',
  P2: 'border-l-amber-500',
  P3: 'border-l-orange-400',
  P6: 'border-l-rose-600',
  P7: 'border-l-yellow-500',
}

const PATTERN_PILL_COLORS: Record<string, { active: string; inactive: string }> = {
  P1: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
  },
  P2: {
    active: 'bg-amber-500 text-black border-amber-500',
    inactive: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  },
  P3: {
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
  },
  P6: {
    active: 'bg-rose-600 text-white border-rose-600',
    inactive: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
  },
  P7: {
    active: 'bg-yellow-500 text-black border-yellow-500',
    inactive: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20',
  },
}

function getTierBadgeColor(tier: number): string {
  switch (tier) {
    case 1: return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 2: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

function getIpsColor(ips: number): string {
  if (ips >= 0.8) return 'bg-red-500/20 text-red-300 border-red-500/30'
  if (ips >= 0.6) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  if (ips >= 0.4) return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
}

function getRiskBadgeColor(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'high':     return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'medium':   return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    default:         return 'bg-green-500/20 text-green-300 border-green-500/30'
  }
}

// All known patterns for filter
const ALL_PATTERNS = ['P1', 'P2', 'P3', 'P6', 'P7']

// Solid hex colors per pattern (for ECharts which can't read tailwind classes)
const PATTERN_HEX: Record<string, string> = {
  P1: '#ef4444', // red-500
  P2: '#f59e0b', // amber-500
  P3: '#f97316', // orange-500
  P6: '#e11d48', // rose-600
  P7: '#eab308', // yellow-500
}

// ---------------------------------------------------------------------------
// Risk Intelligence Matrix — scatter plot of every queue vendor
// ---------------------------------------------------------------------------

interface RiskMatrixProps {
  dossiers: AriaQueueItem[]
  onSelect: (vendorId: number) => void
}

// Each scatter point: [riskScore (x, 0-1), ipsScore (y, 0-100), totalValue, name, vendorId, pattern, tier]
type ScatterPoint = [number, number, number, string, number, string, number]

function RiskMatrix({ dossiers, onSelect }: RiskMatrixProps) {
  const seriesData = useMemo(() => {
    // Group dossiers by primary_pattern so each pattern is its own series
    const grouped: Record<string, ScatterPoint[]> = {}
    for (const d of dossiers) {
      const pattern = d.primary_pattern || 'OTHER'
      const point: ScatterPoint = [
        Math.max(0, Math.min(1, d.avg_risk_score ?? 0)),
        Math.max(0, Math.min(100, (d.ips_final ?? 0) * 100)),
        d.total_value_mxn ?? 0,
        d.vendor_name,
        d.vendor_id,
        pattern,
        d.ips_tier,
      ]
      if (!grouped[pattern]) grouped[pattern] = []
      grouped[pattern].push(point)
    }
    return grouped
  }, [dossiers])

  const option = useMemo(() => {
    const series: echarts.SeriesOption[] = Object.entries(seriesData).map(
      ([pattern, points]) => ({
        type: 'scatter',
        name: pattern,
        data: points,
        symbolSize: (data: number[]) => {
          const value = data[2] ?? 0
          return Math.max(8, Math.min(40, Math.sqrt(value / 5_000_000)))
        },
        itemStyle: {
          color: PATTERN_HEX[pattern] ?? '#64748b',
          opacity: 0.78,
          borderColor: '#0a0a0a',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: { opacity: 1, borderColor: '#ffffff', borderWidth: 2 },
        },
      }),
    )

    return {
      backgroundColor: 'transparent',
      grid: { left: 60, right: 30, top: 40, bottom: 50 },
      xAxis: {
        name: 'Avg Risk Score →',
        nameLocation: 'end',
        nameTextStyle: { color: '#6b6560', fontSize: 11 },
        type: 'value',
        min: 0,
        max: 1,
        splitLine: { lineStyle: { color: '#2a2d2c', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#3a3d3c' } },
        axisLabel: {
          color: '#6b6560',
          fontSize: 11,
          formatter: (v: number) => v.toFixed(1),
        },
      },
      yAxis: {
        name: 'IPS Score ↑',
        nameLocation: 'end',
        nameTextStyle: { color: '#6b6560', fontSize: 11 },
        type: 'value',
        min: (val: { min: number }) => Math.max(0, Math.floor(val.min - 8)),
        max: (val: { max: number }) => Math.min(100, Math.ceil(val.max + 4)),
        splitLine: { lineStyle: { color: '#2a2d2c', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#3a3d3c' } },
        axisLabel: { color: '#6b6560', fontSize: 11 },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0a0a0a',
        borderColor: '#3f3f46',
        textStyle: { color: '#f4f4f5', fontSize: 12 },
        formatter: (params: { data: ScatterPoint }) => {
          const [riskScore, ipsScore, totalVal, name, , pattern, tier] = params.data
          return `<div style="max-width:280px"><b>${name}</b><br/>IPS: <b>${ipsScore.toFixed(1)}</b> · Tier ${tier}<br/>Risk: <b>${(riskScore * 100).toFixed(0)}%</b><br/>Pattern: ${pattern}<br/>Value: MX$${(totalVal / 1e9).toFixed(2)}B</div>`
        },
      },
      graphic: [
        { type: 'text', left: '60%', top: '8%', style: { text: 'CRÍTICO', fill: '#dc2626', fontSize: 10, fontFamily: 'monospace', opacity: 0.5 } },
        { type: 'text', left: '60%', top: '60%', style: { text: 'RIESGO', fill: '#ea580c', fontSize: 10, fontFamily: 'monospace', opacity: 0.5 } },
        { type: 'text', left: '8%', top: '8%', style: { text: 'MONITOREO', fill: '#6b6560', fontSize: 10, fontFamily: 'monospace', opacity: 0.5 } },
        { type: 'text', left: '8%', top: '60%', style: { text: 'BAJO', fill: '#6b6560', fontSize: 10, fontFamily: 'monospace', opacity: 0.5 } },
      ],
      series: [
        ...series,
        {
          type: 'scatter',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#3a3d3c', type: 'dashed', width: 1 },
            label: { show: false },
            data: [
              { xAxis: 0.5 },
            ],
          },
          data: [],
        },
      ],
    } as unknown as echarts.EChartsOption
  }, [seriesData])

  const handleEvents = useMemo(
    () => ({
      click: (params: { data?: ScatterPoint }) => {
        if (!params.data || !Array.isArray(params.data)) return
        const vendorId = params.data[4]
        if (typeof vendorId === 'number') onSelect(vendorId)
      },
    }),
    [onSelect],
  )

  if (dossiers.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface-card/40 overflow-hidden mb-6">
      <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-muted">
            Matriz de Investigación
          </p>
          <p className="text-[11px] text-text-muted/60 mt-0.5">
            IPS vs riesgo · tamaño = valor contractual · clic para abrir expediente
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_PATTERNS.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 text-[9px] font-mono text-text-muted/70 px-1.5 py-0.5 rounded border border-white/10 bg-white/5"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: PATTERN_HEX[p] }}
                aria-hidden="true"
              />
              {p}
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: 480, width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height: 480, width: '100%' }}
          onEvents={handleEvents}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RedesKnownDossier() {
  const { t } = useTranslation('redes')

  // Filters
  const [patternFilter, setPatternFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Selected vendor for the detail panel
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)

  // Fetch Tier 1 + Tier 2 + Tier 3 (sample) from ARIA queue
  const { data: tier1Data, isLoading: loading1 } = useQuery({
    queryKey: ['aria-queue-redes-t1'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 30 }),
    staleTime: 10 * 60 * 1000,
  })
  const { data: tier2Data, isLoading: loading2 } = useQuery({
    queryKey: ['aria-queue-redes-t2'],
    queryFn: () => ariaApi.getQueue({ tier: 2, per_page: 30 }),
    staleTime: 10 * 60 * 1000,
  })
  const { data: tier3Data, isLoading: loading3 } = useQuery({
    queryKey: ['aria-queue-redes-t3'],
    queryFn: () => ariaApi.getQueue({ tier: 3, per_page: 40 }),
    staleTime: 10 * 60 * 1000,
  })

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['aria-stats-redes'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const isLoading = loading1 || loading2 || loading3

  // Merge and sort by IPS
  const dossiers = useMemo(() => {
    const items: AriaQueueItem[] = []
    if (tier1Data?.data) items.push(...tier1Data.data)
    if (tier2Data?.data) items.push(...tier2Data.data)
    if (tier3Data?.data) items.push(...tier3Data.data)
    // Deduplicate by vendor_id
    const seen = new Set<number>()
    const unique: AriaQueueItem[] = []
    for (const item of items) {
      if (!seen.has(item.vendor_id)) {
        seen.add(item.vendor_id)
        unique.push(item)
      }
    }
    // Sort by IPS descending
    unique.sort((a, b) => b.ips_final - a.ips_final)
    return unique
  }, [tier1Data, tier2Data, tier3Data])

  // Apply filters
  const filtered = useMemo(() => {
    let result = dossiers
    if (patternFilter) {
      result = result.filter((d) => d.primary_pattern === patternFilter)
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((d) => d.vendor_name.toLowerCase().includes(term))
    }
    return result.slice(0, 40) // cap at 40 for perf
  }, [dossiers, patternFilter, searchTerm])

  const error = !isLoading && dossiers.length === 0 && !tier1Data && !tier2Data && !tier3Data

  // Stats bar computations derived from filtered results
  const statsBar = useMemo(() => {
    const t1 = filtered.filter((d) => d.ips_tier === 1).length
    const t2 = filtered.filter((d) => d.ips_tier === 2).length
    const totalAtRisk = filtered.reduce((sum, d) => sum + (d.total_value_mxn ?? 0), 0)
    const sectors = new Set(filtered.map((d) => d.primary_sector_name).filter(Boolean)).size
    return { t1, t2, totalAtRisk, sectors }
  }, [filtered])

  // Dismiss the detail panel when clicking outside on mobile overlay
  const handleOverlayClick = () => setSelectedVendorId(null)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative space-y-6 max-w-6xl mx-auto">
      {/* Editorial header */}
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
          Inteligencia Artificial · Cola de Investigación
        </div>
        <h1 style={{ fontFamily: 'var(--font-family-serif)' }} className="text-2xl font-bold text-text-primary mb-2">
          {t('header.title')}
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Matriz de priorización: IPS vs puntuación de riesgo. Cada burbuja es un proveedor en vigilancia activa — clic para abrir su expediente.
        </p>
      </div>

      {/* Source attribution + stats */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-muted/60">
        {statsData && (
          <>
            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {t('sourceAttribution', { count: statsData.queue_total })} &middot; {t('sourceRegistries')}
            </span>
            <span className="text-red-400">{t('stats.tier1')}: {statsData.latest_run?.tier1_count ?? 0}</span>
            <span className="text-orange-400">{t('stats.tier2')}: {statsData.latest_run?.tier2_count ?? 0}</span>
          </>
        )}
      </div>

      {/* Pattern summary grid — live counts from ARIA stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ALL_PATTERNS.map((code) => {
          const liveCount = statsData?.pattern_counts?.[code]
          const countLabel = liveCount !== undefined
            ? liveCount >= 1000 ? `${(liveCount / 1000).toFixed(1)}K` : String(liveCount)
            : '—'
          const name = t(`patternGrid.${code}.name`)
          const desc = t(`patternGrid.${code}.desc`)
          const borderColorMap: Record<string, string> = {
            P1: 'border-red-500',
            P2: 'border-amber-500',
            P3: 'border-orange-400',
            P6: 'border-rose-600',
            P7: 'border-yellow-500',
          }
          return (
            <button
              key={code}
              onClick={() => setPatternFilter(patternFilter === code ? '' : code)}
              className={cn(
                'border-l-4 pl-3 py-2 rounded-r text-left transition-all',
                borderColorMap[code] ?? 'border-zinc-500',
                patternFilter === code
                  ? 'bg-white/10 ring-1 ring-white/20'
                  : 'bg-background-elevated hover:bg-white/5',
              )}
              aria-pressed={patternFilter === code}
            >
              <div className="text-xs font-mono font-bold text-text-primary">{code}</div>
              <div className="text-xs text-text-muted">{name}</div>
              <div className="text-sm font-semibold text-text-primary mt-1">
                {countLabel} {t('patternGrid.vendors')}
              </div>
              <div className="text-xs text-text-muted/60">{desc}</div>
            </button>
          )
        })}
      </div>

      {/* Filters — search + pattern pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="bg-surface-card border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-sm text-text-primary w-64 placeholder:text-text-muted/30"
            aria-label={t('filters.searchPlaceholder')}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_PATTERNS.map((p) => {
            const isActive = patternFilter === p
            const colors = PATTERN_PILL_COLORS[p]
            const label = t(`patternLabels.${p}`)
            return (
              <button
                key={p}
                onClick={() => setPatternFilter(isActive ? '' : p)}
                className={cn(
                  'text-[10px] font-mono font-semibold tracking-wider px-2.5 py-1 rounded border transition-all',
                  isActive ? colors?.active : colors?.inactive,
                )}
                aria-pressed={isActive}
                aria-label={`${t('filters.byPattern')}: ${p}`}
              >
                {p} {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Risk Intelligence Matrix — scatter plot */}
      {!isLoading && filtered.length > 0 && (
        <RiskMatrix dossiers={filtered} onSelect={setSelectedVendorId} />
      )}

      {/* Stats bar + view toggle */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div
            className="grid grid-cols-4 gap-3 p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl"
            role="region"
            aria-label="Summary statistics"
          >
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-red-400">{statsBar.t1}</div>
              <div className="text-[10px] text-text-muted/60 uppercase tracking-wider">T1 Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-orange-400">{statsBar.t2}</div>
              <div className="text-[10px] text-text-muted/60 uppercase tracking-wider">T2 Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-text-primary">{formatCompactMXN(statsBar.totalAtRisk)}</div>
              <div className="text-[10px] text-text-muted/60 uppercase tracking-wider">Total at Risk</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-text-primary">{statsBar.sectors}</div>
              <div className="text-[10px] text-text-muted/60 uppercase tracking-wider">Sectors</div>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded border transition-all',
                viewMode === 'grid'
                  ? 'bg-white/10 border-white/20 text-text-primary'
                  : 'border-white/10 text-text-muted/40 hover:text-text-muted hover:border-white/15',
              )}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded border transition-all',
                viewMode === 'list'
                  ? 'bg-white/10 border-white/20 text-text-primary'
                  : 'border-white/10 text-text-muted/40 hover:text-text-muted hover:border-white/15',
              )}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-surface-card border border-red-500/20 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('errorTitle')}</h3>
          <p className="text-text-muted text-sm">{t('errorMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('errorHint')}</p>
        </div>
      )}

      {/* Empty state (loaded but no results) */}
      {!isLoading && !error && filtered.length === 0 && dossiers.length === 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-8 text-center">
          <h3 className="font-serif text-xl text-text-primary mb-2">{t('emptyTitle')}</h3>
          <p className="text-text-muted text-sm">{t('emptyMessage')}</p>
          <p className="text-text-muted/60 text-xs mt-2">{t('emptyHint')}</p>
        </div>
      )}

      {/* Filter yields nothing */}
      {!isLoading && !error && filtered.length === 0 && dossiers.length > 0 && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-6 text-center">
          <p className="text-text-muted text-sm">{t('noFilterResults')}</p>
        </div>
      )}

      {/* Dossier grid */}
      {!isLoading && filtered.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-2'
          }
        >
          {filtered.map((item) =>
            viewMode === 'list' ? (
              <DossierListRow
                key={item.vendor_id}
                item={item}
                isSelected={selectedVendorId === item.vendor_id}
                onSelect={() =>
                  setSelectedVendorId(
                    selectedVendorId === item.vendor_id ? null : item.vendor_id
                  )
                }
              />
            ) : (
              <DossierCard
                key={item.vendor_id}
                item={item}
                isSelected={selectedVendorId === item.vendor_id}
                onSelect={() =>
                  setSelectedVendorId(
                    selectedVendorId === item.vendor_id ? null : item.vendor_id
                  )
                }
              />
            )
          )}
        </motion.div>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-[11px] text-text-muted/40 text-center">
          {t('dossierCount', { filtered: filtered.length, total: dossiers.length })}
        </p>
      )}

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {selectedVendorId !== null && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={handleOverlayClick}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Detail panel — slides in from the right */}
      <AnimatePresence>
        {selectedVendorId !== null && (
          <motion.aside
            key={`detail-${selectedVendorId}`}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'fixed top-0 right-0 h-full w-full max-w-md z-40',
              'bg-background border-l border-white/10 shadow-2xl',
              'overflow-y-auto',
            )}
            aria-label="Vendor detail panel"
          >
            <VendorDetailPanel
              vendorId={selectedVendorId}
              ariaItem={dossiers.find((d) => d.vendor_id === selectedVendorId) ?? null}
              onClose={() => setSelectedVendorId(null)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dossier List Row — compact horizontal layout for list view mode
// ---------------------------------------------------------------------------

interface DossierListRowProps {
  item: AriaQueueItem
  isSelected: boolean
  onSelect: () => void
}

function DossierListRow({ item, isSelected, onSelect }: DossierListRowProps) {
  const { t } = useTranslation('redes')
  const pattern = item.primary_pattern || 'default'
  const PatternIcon = PATTERN_ICONS[pattern] || AlertTriangle
  const borderClass = PATTERN_BORDER_COLORS[pattern] || 'border-l-zinc-500'
  const sectorColor = item.primary_sector_name
    ? SECTOR_COLORS[item.primary_sector_name.toLowerCase()] || '#64748b'
    : '#64748b'

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'bg-surface-card border border-white/8 rounded-lg overflow-hidden',
        'border-l-4',
        borderClass,
        'transition-colors cursor-pointer',
        isSelected ? 'border-white/30 ring-1 ring-white/20' : 'hover:border-white/20',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-expanded={isSelected}
      aria-label={`${item.vendor_name} — ${t('card.viewCase')}`}
    >
      <div className="px-4 py-2.5 flex items-center gap-4 flex-wrap">
        {/* Pattern icon */}
        <PatternIcon className="w-3.5 h-3.5 text-text-muted/50 shrink-0" aria-hidden="true" />

        {/* Vendor name */}
        <span className="text-sm font-semibold text-text-primary flex-1 min-w-0 truncate">
          {item.vendor_name}
        </span>

        {/* Tier badge */}
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold shrink-0', getTierBadgeColor(item.ips_tier))}>
          {t('detail.tier')} {item.ips_tier}
        </span>

        {/* IPS score */}
        <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0', getIpsColor(item.ips_final))}>
          {item.ips_final.toFixed(2)}
        </span>

        {/* Risk score */}
        <span className="text-[11px] text-text-muted/70 shrink-0">
          {t('card.riskScore')}: {(item.avg_risk_score * 100).toFixed(0)}%
        </span>

        {/* Total value */}
        <span className="text-[11px] font-semibold text-text-primary shrink-0">
          {formatCompactMXN(item.total_value_mxn)}
        </span>

        {/* Sector chip */}
        {item.primary_sector_name && (
          <span className="flex items-center gap-1 text-[10px] text-text-muted/60 shrink-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sectorColor }} aria-hidden="true" />
            {item.primary_sector_name}
          </span>
        )}

        {/* External flags */}
        {item.is_efos_definitivo && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 font-mono shrink-0">
            EFOS
          </span>
        )}
        {item.is_sfp_sanctioned && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 font-mono shrink-0">
            SFP
          </span>
        )}

        {/* Action link */}
        <Link
          to={`/thread/${item.vendor_id}`}
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-primary hover:text-accent-primary/80 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {t('card.viewCase')} <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Dossier Card — intelligence dossier style
// ---------------------------------------------------------------------------

interface DossierCardProps {
  item: AriaQueueItem
  isSelected: boolean
  onSelect: () => void
}

function DossierCard({ item, isSelected, onSelect }: DossierCardProps) {
  const { t } = useTranslation('redes')
  const pattern = item.primary_pattern || 'default'
  const PatternIcon = PATTERN_ICONS[pattern] || AlertTriangle
  const borderClass = PATTERN_BORDER_COLORS[pattern] || 'border-l-zinc-500'
  const sectorColor = item.primary_sector_name
    ? SECTOR_COLORS[item.primary_sector_name.toLowerCase()] || '#64748b'
    : '#64748b'

  const patternLabel = t(`patternLabels.${pattern}`, { defaultValue: pattern.toUpperCase() })

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'bg-surface-card border border-white/8 rounded-xl overflow-hidden',
        'border-l-4',
        borderClass,
        'transition-colors group cursor-pointer',
        isSelected ? 'border-white/30 ring-1 ring-white/20' : 'hover:border-white/20',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-expanded={isSelected}
      aria-label={`${item.vendor_name} — ${t('card.viewCase')}`}
    >
      <div className="p-5 space-y-3">
        {/* Top row: pattern badge + tier + flags */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PatternIcon className="w-3.5 h-3.5 text-text-muted/50" aria-hidden="true" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted/70">
              {pattern} {patternLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.is_efos_definitivo && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 font-mono">
                EFOS
              </span>
            )}
            {item.is_sfp_sanctioned && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20 font-mono">
                SFP
              </span>
            )}
            {item.new_vendor_risk && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20 font-mono">
                {t('card.newVendor')}
              </span>
            )}
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold',
                getTierBadgeColor(item.ips_tier),
              )}
            >
              {t('detail.tier')} {item.ips_tier}
            </span>
          </div>
        </div>

        {/* Vendor name (bold serif) */}
        <h3
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-lg text-text-primary font-bold leading-tight"
        >
          {item.vendor_name}
        </h3>

        {/* Sector + period row */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted/60">
          {item.primary_sector_name && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: sectorColor }} aria-hidden="true" />
              {item.primary_sector_name}
            </span>
          )}
          {item.years_active !== undefined && item.years_active > 0 && (
            <span>
              &middot; {t('card.yearsActive_other', { count: item.years_active })}
            </span>
          )}
        </div>

        {/* Key stats row — IPS prominent + contracts + value */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={cn(
              'text-xs font-mono font-bold px-2 py-0.5 rounded border',
              getIpsColor(item.ips_final),
            )}
          >
            {t('card.ipsScore')} {item.ips_final.toFixed(2)}
          </span>
          <span className="text-[11px] text-text-muted/70">
            {formatNumber(item.total_contracts)} {t('card.contracts')}
          </span>
          <span className="text-[11px] font-semibold text-text-primary">
            {formatCompactMXN(item.total_value_mxn)}
          </span>
          <span className="text-[11px] text-text-muted/50">
            {t('card.riskScore')}: {formatPercent(item.avg_risk_score, 0)}
          </span>
        </div>

        {/* Action links */}
        <div className="pt-1 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/thread/${item.vendor_id}`}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-accent-primary hover:text-accent-primary/80 transition-colors group-hover:underline"
          >
            {t('card.viewCase')} <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
          <Link
            to={`/vendors/${item.vendor_id}`}
            className="text-[10px] text-text-muted/40 hover:text-text-muted/70 transition-colors"
          >
            {t('card.viewProfile')}
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Vendor Detail Panel — loads rich data for the selected vendor
// ---------------------------------------------------------------------------

interface VendorDetailPanelProps {
  vendorId: number
  ariaItem: AriaQueueItem | null
  onClose: () => void
}

function VendorDetailPanel({ vendorId, ariaItem, onClose }: VendorDetailPanelProps) {
  const { t } = useTranslation('redes')
  const NA = t('detail.notAvailable')

  // Vendor profile from /vendors/{id}
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useQuery<VendorDetailResponse>({
    queryKey: ['vendor-detail-redes', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  // Co-bidders from /network/co-bidders/{id}
  const { data: coBiddersData, isLoading: coBiddersLoading } = useQuery({
    queryKey: ['co-bidders-redes', vendorId],
    queryFn: () => networkApi.getCoBidders(vendorId, 2, 5),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const riskLevel = vendor?.avg_risk_score != null
    ? getRiskLevelFromScore(vendor.avg_risk_score)
    : null

  const pattern = ariaItem?.primary_pattern || 'default'
  const PatternIcon = PATTERN_ICONS[pattern] || AlertTriangle
  const patternLabel = t(`patternLabels.${pattern}`, { defaultValue: pattern })

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <PatternIcon className="w-4 h-4 text-text-muted/60 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted/70 truncate">
            {pattern} · {patternLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors ml-3 shrink-0"
          aria-label={t('detail.closePanel')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading state */}
      {vendorLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          <span className="text-sm">{t('detail.loading')}</span>
        </div>
      )}

      {/* Error state */}
      {vendorError && !vendorLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-text-muted">
          <AlertCircle className="w-6 h-6 text-red-400" aria-hidden="true" />
          <span className="text-sm">{t('detail.loadError')}</span>
          {/* Fallback: still show ARIA data if we have it */}
          {ariaItem && (
            <div className="mt-4 w-full">
              <AriaFallbackSection ariaItem={ariaItem} />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {vendor && !vendorLoading && (
        <div className="flex-1 p-5 space-y-5 overflow-y-auto">

          {/* Vendor name */}
          <div>
            <h2
              style={{ fontFamily: 'var(--font-family-serif)' }}
              className="text-xl font-bold text-text-primary leading-tight"
            >
              {vendor.name}
            </h2>
            {vendor.rfc ? (
              <p className="text-xs text-text-muted mt-1 font-mono">
                {t('detail.rfc')}: <span className="text-text-secondary">{vendor.rfc}</span>
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1 font-mono">
                {t('detail.rfc')}: <span className="text-text-muted/40">{NA}</span>
              </p>
            )}
          </div>

          {/* ARIA tier + IPS */}
          {ariaItem && (
            <div className="flex flex-wrap gap-2">
              <span className={cn('text-xs px-2 py-1 rounded border font-mono font-bold', getTierBadgeColor(ariaItem.ips_tier))}>
                {t('detail.tier')} {ariaItem.ips_tier}
              </span>
              <span className={cn('text-xs px-2 py-1 rounded border font-mono font-bold', getIpsColor(ariaItem.ips_final))}>
                {t('detail.ipsScore')}: {ariaItem.ips_final.toFixed(3)}
              </span>
            </div>
          )}

          {/* External watchlist flags */}
          {(vendor.is_efos_ghost || vendor.is_sfp_sanctioned) && (
            <div>
              <SectionLabel>{t('detail.externalFlags')}</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {vendor.is_efos_ghost && (
                  <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono font-bold">
                    EFOS {t('card.efos')}
                  </span>
                )}
                {vendor.is_sfp_sanctioned && (
                  <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono font-bold">
                    SFP {t('card.sfp')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Key stats grid */}
          <div>
            <SectionLabel>{t('detail.riskScore')}</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <StatCell
                label={t('detail.riskScore')}
                value={vendor.avg_risk_score != null ? formatPercent(vendor.avg_risk_score, 1) : NA}
              />
              <StatCell
                label={t('detail.riskLevel')}
                value={
                  riskLevel
                    ? <span className={cn('text-xs font-mono font-bold px-1.5 py-0.5 rounded border', getRiskBadgeColor(riskLevel))}>
                        {t(`riskLevels.${riskLevel}`)}
                      </span>
                    : NA
                }
              />
              <StatCell
                label={t('detail.totalContracts')}
                value={formatNumber(vendor.total_contracts)}
              />
              <StatCell
                label={t('detail.totalValue')}
                value={formatCompactMXN(vendor.total_value_mxn)}
              />
              <StatCell
                label={t('detail.directAward')}
                value={vendor.direct_award_pct != null ? formatPercentSafe(vendor.direct_award_pct, false) : NA}
              />
              <StatCell
                label={t('detail.singleBid')}
                value={vendor.single_bid_pct != null ? formatPercentSafe(vendor.single_bid_pct, false) : NA}
              />
              <StatCell
                label={t('detail.yearsActive')}
                value={vendor.years_active > 0 ? String(vendor.years_active) : NA}
              />
              <StatCell
                label={t('detail.sector')}
                value={vendor.primary_sector_name ?? NA}
              />
            </div>
          </div>

          {/* Top institutions */}
          <div>
            <SectionLabel>{t('detail.topInstitutions')}</SectionLabel>
            {vendor.top_institutions && vendor.top_institutions.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {vendor.top_institutions.slice(0, 5).map((inst) => (
                  <li
                    key={inst.institution_id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-text-secondary truncate">{inst.institution_name}</span>
                    <span className="text-text-muted/60 shrink-0 font-mono">
                      {formatNumber(inst.total_contracts)} {t('detail.contracts')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-text-muted/50 mt-2">{t('detail.noInstitutions')}</p>
            )}
          </div>

          {/* Co-bidders */}
          <div>
            <SectionLabel>{t('detail.coBidders')}</SectionLabel>
            {coBiddersLoading ? (
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted/50">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                <span>{t('detail.loading')}</span>
              </div>
            ) : coBiddersData?.co_bidders && coBiddersData.co_bidders.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {coBiddersData.co_bidders.slice(0, 5).map((cb) => (
                  <li
                    key={cb.vendor_id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <Link
                      to={`/vendors/${cb.vendor_id}`}
                      className="text-accent-primary hover:underline truncate"
                    >
                      {cb.vendor_name}
                    </Link>
                    <span className="text-text-muted/60 shrink-0 font-mono">
                      {cb.co_bid_count ?? 0} {t('detail.contracts')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : !coBiddersLoading ? (
              <p className="text-xs text-text-muted/50 mt-2">{t('detail.noCoBidders')}</p>
            ) : null}
          </div>

          {/* ARIA memo if available */}
          {ariaItem?.memo_text && (
            <div>
              <SectionLabel>{t('detail.memo')}</SectionLabel>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-6">
                {ariaItem.memo_text}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link
              to={`/thread/${vendorId}`}
              className="flex items-center justify-center gap-2 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {t('detail.openDossier')} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link
              to={`/vendors/${vendorId}`}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-text-secondary border border-white/10 rounded-lg py-2.5 text-sm transition-colors"
            >
              {t('detail.viewProfile')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fallback section — shows ARIA data when vendor endpoint fails
// ---------------------------------------------------------------------------

function AriaFallbackSection({ ariaItem }: { ariaItem: AriaQueueItem }) {
  const { t } = useTranslation('redes')
  const NA = t('detail.notAvailable')

  return (
    <div className="space-y-3 w-full px-2">
      <h2
        style={{ fontFamily: 'var(--font-family-serif)' }}
        className="text-lg font-bold text-text-primary"
      >
        {ariaItem.vendor_name}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <StatCell label={t('detail.ipsScore')} value={ariaItem.ips_final.toFixed(3)} />
        <StatCell label={t('detail.tier')} value={String(ariaItem.ips_tier)} />
        <StatCell label={t('detail.totalContracts')} value={formatNumber(ariaItem.total_contracts)} />
        <StatCell label={t('detail.totalValue')} value={formatCompactMXN(ariaItem.total_value_mxn)} />
        <StatCell label={t('detail.riskScore')} value={ariaItem.avg_risk_score != null ? formatPercent(ariaItem.avg_risk_score, 1) : NA} />
        <StatCell label={t('detail.sector')} value={ariaItem.primary_sector_name ?? NA} />
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Link
          to={`/thread/${ariaItem.vendor_id}`}
          className="flex items-center justify-center gap-2 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-lg py-2 text-sm font-semibold transition-colors"
        >
          {t('detail.openDossier')} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted/50 mb-1">
      {children}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white/3 rounded-lg p-2.5 border border-white/8">
      <div className="text-[10px] text-text-muted/50 mb-1">{label}</div>
      <div className="text-sm font-semibold text-text-primary">
        {value === null || value === undefined || value === '' ? '—' : value}
      </div>
    </div>
  )
}
