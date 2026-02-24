/**
 * Spending Categories — Investigation Workbench
 *
 * Section 1: Filter bar (year range, sector, view toggle)
 * Section 2: Sortable table (by Partida or by Sector view)
 * Section 3: Charts (treemap, trend lines) — collapsed in <details>
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { categoriesApi } from '@/api/client'
import { StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Treemap,
  LineChart,
  Line,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
} from '@/components/charts'
import {
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  SlidersHorizontal,
  AlertTriangle,
  Brain,
  BarChart3,
} from 'lucide-react'
import { getSectorNameEN } from '@/lib/constants'

// =============================================================================
// Types
// =============================================================================

interface CategoryStat {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: { id: number; name: string } | null
  top_institution: { id: number; name: string } | null
}

interface TrendItem {
  category_id: number
  name_es: string
  name_en: string
  year: number
  contracts: number
  value: number
  avg_risk: number
}

type SortField = 'total_contracts' | 'total_value' | 'avg_risk' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'
type ViewMode = 'partida' | 'sector'

// =============================================================================
// Helpers
// =============================================================================

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text
}

function getRiskColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return RISK_COLORS.high
  if (score >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
}

function getRiskLabel(score: number): string {
  if (score >= 0.5) return 'Critical'
  if (score >= 0.3) return 'High'
  if (score >= 0.1) return 'Medium'
  return 'Low'
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1f2e' : '#e2e8f0'
}

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <span className="text-text-muted/40 ml-1">↕</span>
  return <span className="text-accent ml-1">{sortDir === 'desc' ? '▼' : '▲'}</span>
}

/** Interpolates green→red based on risk score (0→#4ade80, 0.5+→#f87171) */
function riskToColor(score: number): string {
  const clamped = Math.min(1, score / 0.5)
  const r = Math.round(74  + (248 - 74)  * clamped)
  const g = Math.round(222 + (113 - 222) * clamped)
  const b = Math.round(128 + (113 - 128) * clamped)
  return `rgb(${r},${g},${b})`
}

// =============================================================================
// Scatter plot tooltip
// =============================================================================

interface ScatterPayloadItem {
  payload: ScatterDatum
}

interface ScatterTooltipProps {
  active?: boolean
  payload?: ScatterPayloadItem[]
}

function CustomScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg border p-3 text-xs font-mono shadow-lg"
      style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <p className="font-bold text-text-primary mb-1.5 max-w-[200px] whitespace-normal text-[11px]">{d.name}</p>
      <p style={{ color: riskToColor(d.risk) }}>Risk: {(d.risk * 100).toFixed(1)}% ({d.riskLabel})</p>
      <p className="text-text-secondary">Value: {formatCompactMXN(d.value)}</p>
      <p className="text-text-muted">Contracts: {formatNumber(d.contracts)}</p>
      {d.sectorCode && (
        <p className="text-text-muted capitalize">Sector: {d.sectorCode}</p>
      )}
    </div>
  )
}

// =============================================================================
// Scatter plot data type
// =============================================================================

interface ScatterDatum {
  x: number       // log10 of total_value_mxn
  y: number       // avg_risk_score
  z: number       // sqrt of contracts (for bubble size)
  name: string
  value: number
  risk: number
  contracts: number
  riskLabel: string
  sectorCode: string | null
  fill: string
}

// =============================================================================
// Risk × Value Scatter Chart
// =============================================================================

function RiskValueScatter({ categories }: { categories: CategoryStat[] }) {
  const data: ScatterDatum[] = categories
    .filter(c => c.total_value > 0 && c.avg_risk > 0)
    .map(c => ({
      x: Math.log10(c.total_value),
      y: c.avg_risk,
      z: Math.sqrt(c.total_contracts || 1),
      name: c.name_en || c.name_es,
      value: c.total_value,
      risk: c.avg_risk,
      contracts: c.total_contracts,
      riskLabel: getRiskLabel(c.avg_risk),
      sectorCode: c.sector_code,
      fill: c.avg_risk >= 0.5 ? '#f87171'
          : c.avg_risk >= 0.3 ? '#fb923c'
          : c.avg_risk >= 0.1 ? '#fbbf24'
          : '#4ade80',
    }))

  if (data.length === 0) return null

  const xValues = data.map(d => d.x)
  const medianX = xValues.sort((a, b) => a - b)[Math.floor(xValues.length / 2)]
  const avgY = data.reduce((s, d) => s + d.y, 0) / data.length

  // Quadrant labels styled via manual annotation — we use 4 reference areas
  const xMin = Math.min(...xValues) - 0.2
  const xMax = Math.max(...xValues) + 0.2

  return (
    <Card className="bg-card border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-text-primary flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
          Risk vs. Value — Category Landscape
        </CardTitle>
        <p className="text-[11px] text-text-muted mt-0.5">
          Each dot = one spending category. Size = contract count. Quadrant = investigation priority.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 30, right: 60, bottom: 50, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Value (log scale)"
              domain={[xMin, xMax]}
              tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              label={{
                value: 'Contract Value (log scale MXN) →',
                position: 'insideBottom',
                offset: -15,
                fill: '#8b949e',
                fontSize: 10,
              }}
              tickFormatter={(v: number) => {
                const val = Math.pow(10, v)
                if (val >= 1e12) return `${(val / 1e12).toFixed(0)}T`
                if (val >= 1e9) return `${(val / 1e9).toFixed(0)}B`
                if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M`
                return `${val.toFixed(0)}`
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Risk Score"
              domain={[0, 1]}
              tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              label={{
                value: 'Avg Risk Score →',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: '#8b949e',
                fontSize: 10,
              }}
            />
            <ZAxis type="number" dataKey="z" range={[20, 280]} />
            <RechartsTooltip content={<CustomScatterTooltip />} />
            {/* Quadrant dividers */}
            <ReferenceLine
              x={medianX}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={avgY}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 4"
            />
            {/* Quadrant labels via CustomLabel */}
            <ReferenceLine
              x={xMax - 0.05}
              stroke="transparent"
              label={{
                value: 'INVESTIGATE NOW',
                position: 'insideTopRight',
                fill: '#f87171',
                fontSize: 9,
                fontFamily: 'var(--font-family-mono)',
              }}
            />
            <ReferenceLine
              x={xMin + 0.05}
              stroke="transparent"
              label={{
                value: 'WATCH',
                position: 'insideTopLeft',
                fill: '#fbbf24',
                fontSize: 9,
                fontFamily: 'var(--font-family-mono)',
              }}
            />
            <Scatter
              data={data}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {[
            { color: '#f87171', label: 'Critical (≥50%)' },
            { color: '#fb923c', label: 'High (≥30%)' },
            { color: '#fbbf24', label: 'Medium (≥10%)' },
            { color: '#4ade80', label: 'Low (<10%)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-text-muted font-mono">{item.label}</span>
            </div>
          ))}
          <span className="text-[10px] text-text-muted font-mono ml-auto">Bubble size = contract count</span>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Mini sparkline for category table rows
// =============================================================================

interface MiniSparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
}

function MiniSparkline({ values, color = '#58a6ff', width = 56, height = 20 }: MiniSparklineProps) {
  if (!values.length || values.every(v => v === 0)) {
    return <span className="text-[9px] text-text-muted font-mono">—</span>
  }
  const max = Math.max(...values)
  if (max === 0) return <span className="text-[9px] text-text-muted font-mono">—</span>

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1
    const y = height - 2 - ((v / max) * (height - 4)) + 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastVal = values[values.length - 1]
  const firstNonZero = values.find(v => v > 0) ?? 0
  const trend = lastVal > firstNonZero * 1.1 ? 'up' : lastVal < firstNonZero * 0.9 ? 'down' : 'flat'
  const trendColor = trend === 'up' ? '#fb923c' : trend === 'down' ? '#4ade80' : color

  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      className="flex-shrink-0"
      title={`5-year trend: ${values.map(v => formatCompactMXN(v)).join(', ')}`}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* Last point dot */}
      {values.length > 0 && (() => {
        const lastX = width - 1
        const lastY = height - 2 - ((lastVal / max) * (height - 4)) + 1
        return <circle cx={lastX} cy={lastY} r={2} fill={trendColor} />
      })()}
    </svg>
  )
}

// =============================================================================
// Year range constants
// =============================================================================

const MIN_YEAR = 2002
const MAX_YEAR = 2025

// Sector options for filter dropdown
const SECTOR_OPTIONS = [
  { code: '', label: 'All Sectors' },
  { code: 'salud', label: 'Health' },
  { code: 'educacion', label: 'Education' },
  { code: 'infraestructura', label: 'Infrastructure' },
  { code: 'energia', label: 'Energy' },
  { code: 'defensa', label: 'Defense' },
  { code: 'tecnologia', label: 'Technology' },
  { code: 'hacienda', label: 'Treasury' },
  { code: 'gobernacion', label: 'Governance' },
  { code: 'agricultura', label: 'Agriculture' },
  { code: 'ambiente', label: 'Environment' },
  { code: 'trabajo', label: 'Labor' },
  { code: 'otros', label: 'Other' },
]

// =============================================================================
// Treemap content component
// =============================================================================

function TreemapContent(props: {
  x: number; y: number; width: number; height: number;
  name: string; value: number; depth: number; fill: string;
}) {
  const { x, y, width, height, name, value, depth, fill } = props
  if (depth !== 1 || width < 50 || height < 30) return null
  const textFill = getTextColor(fill)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--color-background)" strokeWidth={2} rx={3} />
      <text
        x={x + width / 2}
        y={y + height / 2 - (height > 50 ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textFill}
        fontSize={width > 120 ? 12 : 10}
        fontWeight="bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {truncate(name, width > 120 ? 24 : 14)}
      </text>
      {height > 50 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={10}
          opacity={0.8}
        >
          {formatCompactMXN(value)}
        </text>
      )}
    </g>
  )
}

// =============================================================================
// Sector aggregation (for "by sector" view)
// =============================================================================

interface SectorAggregate {
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  high_risk_count: number
}

function aggregateBySector(categories: CategoryStat[]): SectorAggregate[] {
  const map = new Map<string, SectorAggregate>()
  for (const cat of categories) {
    const code = cat.sector_code || 'otros'
    const existing = map.get(code)
    if (!existing) {
      map.set(code, {
        sector_code: code,
        total_contracts: cat.total_contracts,
        total_value: cat.total_value,
        avg_risk: cat.avg_risk * cat.total_contracts,
        high_risk_count: cat.avg_risk >= 0.3 ? cat.total_contracts : 0,
      })
    } else {
      existing.total_contracts += cat.total_contracts
      existing.total_value += cat.total_value
      existing.avg_risk += cat.avg_risk * cat.total_contracts
      existing.high_risk_count += cat.avg_risk >= 0.3 ? cat.total_contracts : 0
    }
  }
  // Normalize avg_risk
  for (const agg of map.values()) {
    agg.avg_risk = agg.total_contracts > 0 ? agg.avg_risk / agg.total_contracts : 0
  }
  return Array.from(map.values())
}

// =============================================================================
// Main Component
// =============================================================================

export default function SpendingCategories() {
  const navigate = useNavigate()
  const { t } = useTranslation('spending')
  const [viewMode, setViewMode] = useState<ViewMode>('partida')
  const [sectorFilter, setSectorFilter] = useState<string>('')
  const [yearFrom, setYearFrom] = useState(2010)
  const [yearTo, setYearTo] = useState(2025)
  const [sortField, setSortField] = useState<SortField>('total_value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [trendCount, setTrendCount] = useState<number | null>(10)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['categories', 'trends', yearFrom, yearTo],
    queryFn: () => categoriesApi.getTrends(yearFrom, yearTo),
    staleTime: 5 * 60 * 1000,
  })

  const allCategories: CategoryStat[] = summaryData?.data ?? []

  // Apply sector filter
  const filteredCategories = useMemo(() => {
    if (!sectorFilter) return allCategories
    return allCategories.filter(c => c.sector_code === sectorFilter)
  }, [allCategories, sectorFilter])

  // Derived stats from filtered categories
  const stats = useMemo(() => {
    if (!filteredCategories.length) return null
    const totalValue = filteredCategories.reduce((s, c) => s + c.total_value, 0)
    const totalContracts = filteredCategories.reduce((s, c) => s + c.total_contracts, 0)
    const avgRisk = totalContracts > 0
      ? filteredCategories.reduce((s, c) => s + c.avg_risk * c.total_contracts, 0) / totalContracts
      : 0
    const highRiskCategories = filteredCategories.filter(c => c.avg_risk >= 0.3).length
    return { totalValue, totalContracts, avgRisk, highRiskCategories }
  }, [filteredCategories])

  // Sort handler
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Sorted partida view
  const sortedCategories = useMemo(() => {
    const sorted = [...filteredCategories]
    sorted.sort((a, b) => {
      const aVal = a[sortField] as number
      const bVal = b[sortField] as number
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return sorted
  }, [filteredCategories, sortField, sortDir])

  // Top risk categories for the AI-Flagged strip
  const topRiskCategories = useMemo(() => {
    return [...filteredCategories]
      .filter(c => c.avg_risk > 0)
      .sort((a, b) => b.avg_risk - a.avg_risk)
      .slice(0, 8)
  }, [filteredCategories])

  // Sector aggregation view
  const sectorAggregates = useMemo(() => {
    const aggs = aggregateBySector(filteredCategories)
    return aggs.sort((a, b) => {
      if (sortField === 'total_contracts') return sortDir === 'desc' ? b.total_contracts - a.total_contracts : a.total_contracts - b.total_contracts
      if (sortField === 'avg_risk') return sortDir === 'desc' ? b.avg_risk - a.avg_risk : a.avg_risk - b.avg_risk
      return sortDir === 'desc' ? b.total_value - a.total_value : a.total_value - b.total_value
    })
  }, [filteredCategories, sortField, sortDir])

  // Treemap data — include category_id for click-to-drill
  const treemapData = useMemo(() => {
    return filteredCategories
      .filter(c => c.total_value > 0)
      .slice(0, 30)
      .map(c => ({
        name: c.name_en || c.name_es,
        value: c.total_value,
        category_id: c.category_id,
        fill: selectedCategoryId === c.category_id
          ? '#f59e0b'  // highlight selected in amber
          : c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : getRiskColor(c.avg_risk),
      }))
  }, [filteredCategories, selectedCategoryId])

  // Selected category name (for the filter chip label)
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = filteredCategories.find(c => c.category_id === selectedCategoryId)
    return cat ? (cat.name_en || cat.name_es) : null
  }, [selectedCategoryId, filteredCategories])

  // Trend chart — filtered by selected treemap cell, or top N by value
  const trendChartData = useMemo(() => {
    if (!trendsData?.data) return { years: [] as number[], series: [] as Array<{ name: string; data: Record<number, number> }> }
    const items: TrendItem[] = trendsData.data
    const sortedByValue = [...filteredCategories].sort((a, b) => b.total_value - a.total_value)
    const targetIds = selectedCategoryId
      ? [selectedCategoryId]
      : (trendCount === null ? sortedByValue : sortedByValue.slice(0, trendCount)).map(c => c.category_id)
    const yearSet = new Set<number>()
    const seriesMap = new Map<number, { name: string; data: Record<number, number> }>()

    for (const item of items) {
      if (!targetIds.includes(item.category_id)) continue
      yearSet.add(item.year)
      if (!seriesMap.has(item.category_id)) {
        seriesMap.set(item.category_id, { name: item.name_en || item.name_es, data: {} })
      }
      seriesMap.get(item.category_id)!.data[item.year] = item.value
    }

    return { years: Array.from(yearSet).sort(), series: Array.from(seriesMap.values()) }
  }, [trendsData, filteredCategories, selectedCategoryId, trendCount])

  const TREND_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#16a34a', '#dc2626']

  // Build per-category sparkline data from trend items (last 5 available years)
  const categorySparklines = useMemo(() => {
    if (!trendsData?.data) return new Map<number, number[]>()
    const items: TrendItem[] = trendsData.data
    const map = new Map<number, Map<number, number>>()
    for (const item of items) {
      if (!map.has(item.category_id)) map.set(item.category_id, new Map())
      map.get(item.category_id)!.set(item.year, item.value)
    }
    const result = new Map<number, number[]>()
    const recentYears = Array.from({ length: 5 }, (_, i) => yearTo - 4 + i)
    for (const [catId, yearMap] of map.entries()) {
      result.set(catId, recentYears.map(y => yearMap.get(y) ?? 0))
    }
    return result
  }, [trendsData, yearTo])

  // Year range options
  const yearOptions = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

  // Macro stats from all categories (not filtered)
  const macroStats = useMemo(() => {
    if (!allCategories.length) return null
    const totalValue = allCategories.reduce((s, c) => s + c.total_value, 0)
    const totalContracts = allCategories.reduce((s, c) => s + c.total_contracts, 0)
    const avgRisk = totalContracts > 0
      ? allCategories.reduce((s, c) => s + c.avg_risk * c.total_contracts, 0) / totalContracts
      : 0
    const topCategory = [...allCategories].sort((a, b) => b.total_value - a.total_value)[0]
    return { totalValue, totalContracts, avgRisk, topCategory }
  }, [allCategories])

  return (
    <div className="space-y-6">
      {/* Page Hero */}
      <div className="pb-1">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            SPENDING INTELLIGENCE
          </span>
        </div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Where the Money Goes</h1>
        <p className="text-sm text-text-muted mt-1">
          Drill into procurement spending by category, sector, and year — with AI risk scores on every line.
        </p>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-accent" />
          Spending Categories
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          What Mexico buys — {allCategories.length} categories covering all 3.1M contracts
        </p>
      </div>

      {/* Macro Intelligence Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
        <Brain className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider mr-2">AI Analysis</span>
          <span className="text-sm text-text-secondary leading-relaxed">
            {summaryLoading ? 'Loading analysis...' : macroStats
              ? `${allCategories.length} spending categories tracked across ${formatCompactMXN(macroStats.totalValue)} in validated federal procurement (2002–2025). Top category by value: ${macroStats.topCategory ? (macroStats.topCategory.name_en || macroStats.topCategory.name_es) : '—'}. Portfolio-wide avg risk: ${(macroStats.avgRisk * 100).toFixed(1)}%.`
              : 'Analyzing spending categories across Mexican federal procurement (2002–2025).'
            }
          </span>
        </div>
      </div>

      {/* Macro Stat Cards — all categories, unfiltered */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SharedStatCard
          label="TOTAL TRACKED SPEND"
          value={macroStats ? formatCompactMXN(macroStats.totalValue) : '—'}
          detail={`${allCategories.length} categories · 2002–2025`}
          borderColor="border-accent/30"
          loading={summaryLoading}
        />
        <SharedStatCard
          label="CATEGORIES TRACKED"
          value={allCategories.length > 0 ? formatNumber(allCategories.length) : '—'}
          detail="Partida presupuestal items"
          borderColor="border-blue-500/30"
          loading={summaryLoading}
        />
        <SharedStatCard
          label="TOP CATEGORY"
          value={macroStats?.topCategory ? formatCompactMXN(macroStats.topCategory.total_value) : '—'}
          detail={macroStats?.topCategory ? (macroStats.topCategory.name_en || macroStats.topCategory.name_es) : 'Loading...'}
          borderColor="border-amber-500/30"
          loading={summaryLoading}
        />
        <SharedStatCard
          label="AVG RISK SCORE"
          value={macroStats ? `${(macroStats.avgRisk * 100).toFixed(1)}%` : '—'}
          detail="Weighted by contract count"
          borderColor="border-red-500/30"
          color={macroStats && macroStats.avgRisk >= 0.3 ? 'text-risk-high' : 'text-text-primary'}
          loading={summaryLoading}
        />
      </div>

      {/* Section 1: Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap bg-background-elevated/30 border border-border/50 rounded-lg px-4 py-2.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />

        {/* Year range */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-from" className="text-xs text-text-muted whitespace-nowrap">Year</label>
          <select
            id="year-from"
            value={yearFrom}
            onChange={e => setYearFrom(Math.min(Number(e.target.value), yearTo))}
            className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-text-muted">to</span>
          <select
            id="year-to"
            value={yearTo}
            onChange={e => setYearTo(Math.max(Number(e.target.value), yearFrom))}
            className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Sector filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="sector-filter" className="text-xs text-text-muted whitespace-nowrap">Sector</label>
          <select
            id="sector-filter"
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SECTOR_OPTIONS.map(opt => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('partida')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'partida'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
            )}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode('sector')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'sector'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
            )}
          >
            By Sector
          </button>
        </div>
      </div>

      {/* Filtered Stat Cards — reflect current sector/view selection */}
      {sectorFilter && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SharedStatCard
            label="FILTERED CATEGORIES"
            value={filteredCategories.length > 0 ? formatNumber(filteredCategories.length) : '—'}
            detail={`In ${getSectorNameEN(sectorFilter)}`}
            borderColor="border-accent/30"
            loading={summaryLoading}
          />
          <SharedStatCard
            label="FILTERED CONTRACTS"
            value={stats ? formatNumber(stats.totalContracts) : '—'}
            detail={`${getSectorNameEN(sectorFilter)} sector`}
            borderColor="border-blue-500/30"
            loading={summaryLoading}
          />
          <SharedStatCard
            label="FILTERED AVG RISK"
            value={stats ? `${(stats.avgRisk * 100).toFixed(1)}%` : '—'}
            detail="Weighted by contract count"
            borderColor="border-amber-500/30"
            color={stats && stats.avgRisk >= 0.3 ? 'text-risk-high' : 'text-text-primary'}
            loading={summaryLoading}
          />
          <SharedStatCard
            label="HIGH-RISK CATEGORIES"
            value={stats ? String(stats.highRiskCategories) : '—'}
            detail="Risk score >= 30%"
            borderColor="border-red-500/30"
            color={stats && stats.highRiskCategories > 0 ? 'text-risk-critical' : 'text-text-primary'}
            loading={summaryLoading}
          />
        </div>
      )}

      {/* AI-Flagged Categories Strip */}
      {topRiskCategories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              AI-Flagged: Highest Risk Categories
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {topRiskCategories.map((cat) => (
              <div
                key={cat.category_id}
                className="flex-shrink-0 rounded-lg border border-border/50 bg-background-card px-3 py-2 min-w-[150px] max-w-[190px]"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  {cat.sector_code && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SECTOR_COLORS[cat.sector_code] || '#64748b' }}
                    />
                  )}
                  <span className="text-xs font-medium text-text-primary truncate">
                    {cat.name_en || cat.name_es}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted font-mono">{formatCompactMXN(cat.total_value)}</span>
                  <span
                    className="text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      color: getRiskColor(cat.avg_risk),
                      backgroundColor: `${getRiskColor(cat.avg_risk)}20`,
                    }}
                  >
                    {(cat.avg_risk * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk × Value Scatter Chart */}
      {!summaryLoading && filteredCategories.length > 0 && (
        <RiskValueScatter categories={filteredCategories} />
      )}

      {/* Section 2: Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
            {viewMode === 'partida' ? 'Spending Categories' : 'By Government Sector'}
          </CardTitle>
          <CardDescription className="text-xs">
            {viewMode === 'partida'
              ? `${sortedCategories.length} categories. Click column headers to sort.`
              : `${sectorAggregates.length} sectors. Click column headers to sort.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {summaryLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : viewMode === 'partida' ? (
            /* ---- Partida view ---- */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs" role="table">
                <thead>
                  <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                    <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Category</th>
                    <th className="px-3 py-2.5 text-left font-medium hidden md:table-cell">Sector</th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_contracts')}
                    >
                      Contracts
                      <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_value')}
                    >
                      Total Value (MXN)
                      <SortIndicator field="total_value" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('avg_risk')}
                    >
                      Avg Risk
                      <SortIndicator field="avg_risk" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap hidden lg:table-cell"
                      onClick={() => handleSort('direct_award_pct')}
                    >
                      Direct Award %
                      <SortIndicator field="direct_award_pct" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium hidden lg:table-cell">Top Vendor</th>
                    <th className="px-3 py-2.5 text-right font-medium hidden xl:table-cell whitespace-nowrap">
                      5yr Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.slice(0, 50).map((cat, idx) => (
                    <tr
                      key={cat.category_id}
                      className="border-b border-border/10 hover:bg-background-elevated/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-text-muted tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {cat.sector_code && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SECTOR_COLORS[cat.sector_code] || '#64748b' }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-text-primary font-medium truncate max-w-[280px]">
                            {cat.name_en || cat.name_es}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-text-muted hidden md:table-cell">
                        {cat.sector_code ? getSectorNameEN(cat.sector_code) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums font-mono">
                        {formatNumber(cat.total_contracts)}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums font-mono">
                        {formatCompactMXN(cat.total_value)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono tabular-nums"
                          style={{
                            color: getRiskColor(cat.avg_risk),
                            backgroundColor: `${getRiskColor(cat.avg_risk)}15`,
                          }}
                          title={getRiskLabel(cat.avg_risk)}
                        >
                          {(cat.avg_risk * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted tabular-nums font-mono hidden lg:table-cell">
                        {cat.direct_award_pct != null ? `${cat.direct_award_pct.toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-text-muted text-xs truncate max-w-[200px] hidden lg:table-cell">
                        {cat.top_vendor ? (
                          <button
                            onClick={() => navigate(`/vendors/${cat.top_vendor!.id}`)}
                            className="hover:text-accent transition-colors flex items-center gap-1"
                          >
                            {truncate(cat.top_vendor.name, 28)}
                            <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right hidden xl:table-cell">
                        <div className="flex items-center justify-end">
                          <MiniSparkline
                            values={categorySparklines.get(cat.category_id) ?? []}
                            color={getRiskColor(cat.avg_risk)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedCategories.length === 0 && (
                <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                  No categories match the current filters.
                </div>
              )}
            </div>
          ) : (
            /* ---- By Sector view ---- */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-xs" role="table">
                <thead>
                  <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                    <th className="px-3 py-2.5 text-left font-medium">Sector</th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_contracts')}
                    >
                      Contracts
                      <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_value')}
                    >
                      Total Value (MXN)
                      <SortIndicator field="total_value" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('avg_risk')}
                    >
                      Avg Risk
                      <SortIndicator field="avg_risk" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">High-Risk Contracts</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorAggregates.map((agg) => (
                    <tr
                      key={agg.sector_code}
                      className="border-b border-border/10 hover:bg-background-elevated/50 transition-colors cursor-pointer"
                      onClick={() => setSectorFilter(agg.sector_code)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: SECTOR_COLORS[agg.sector_code] || '#64748b' }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-text-primary">
                            {getSectorNameEN(agg.sector_code)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                        {formatNumber(agg.total_contracts)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                        {formatCompactMXN(agg.total_value)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono tabular-nums"
                          style={{
                            color: getRiskColor(agg.avg_risk),
                            backgroundColor: `${getRiskColor(agg.avg_risk)}15`,
                          }}
                        >
                          {(agg.avg_risk * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                        {formatNumber(agg.high_risk_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Charts */}
      <div className="space-y-5">
          {/* Treemap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-text-muted" />
                {t('treemap.title')}
              </CardTitle>
              <CardDescription>
                {t('treemap.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCategoryName && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-text-muted">Trend filtered by:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {selectedCategoryName}
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className="ml-0.5 hover:text-amber-200"
                      aria-label="Clear filter"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
              {summaryLoading ? (
                <ChartSkeleton height={380} />
              ) : treemapData.length > 0 ? (
                <div style={{ height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      nameKey="name"
                      onClick={(data: { category_id?: number }) => {
                        if (data.category_id != null) {
                          setSelectedCategoryId(prev => prev === data.category_id ? null : data.category_id!)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} depth={0} fill="" />}
                    />
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                  {t('treemap.empty')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-text-muted" />
                {t('trends.title')}
                {selectedCategoryName ? (
                  <span className="ml-auto text-xs text-amber-400 font-normal">
                    Showing: {selectedCategoryName}
                  </span>
                ) : (
                  <div className="ml-auto flex items-center gap-1">
                    {([5, 10, 20] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setTrendCount(n)}
                        className={cn(
                          'px-2 py-0.5 text-xs rounded border transition-colors',
                          trendCount === n
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border/50 text-text-muted hover:border-accent/40 hover:text-text-primary'
                        )}
                      >
                        Top {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setTrendCount(null)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border transition-colors',
                        trendCount === null
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border/50 text-text-muted hover:border-accent/40 hover:text-text-primary'
                      )}
                    >
                      All
                    </button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {t('trends.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <ChartSkeleton height={320} type="area" />
              ) : trendChartData.years.length > 0 ? (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 10, right: 30, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis
                        dataKey="year"
                        type="number"
                        domain={[trendChartData.years[0], trendChartData.years[trendChartData.years.length - 1]]}
                        ticks={trendChartData.years}
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickLine={false}
                        tickFormatter={(v: number) => formatCompactMXN(v)}
                      />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs text-text-primary mb-1">{label}</p>
                              {payload.map((p, i) => (
                                <p key={i} className="text-xs tabular-nums" style={{ color: p.color }}>
                                  {p.name}: {formatCompactMXN(p.value as number)}
                                </p>
                              ))}
                            </div>
                          )
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => (
                          <span className="text-xs text-text-muted">{truncate(value, 30)}</span>
                        )}
                      />
                      {trendChartData.series.map((series, idx) => (
                        <Line
                          key={series.name}
                          type="monotone"
                          data={trendChartData.years.map(y => ({ year: y, value: series.data[y] || 0 }))}
                          dataKey="value"
                          name={series.name}
                          stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                  {t('trends.empty')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
