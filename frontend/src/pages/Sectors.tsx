/**
 * Sectors Overview — Investigation Workbench
 *
 * Section 1: 4 StatCards (total sectors, contracts, value, avg risk)
 * Section 2: Sortable sector comparison table (primary)
 * Section 3: Charts gallery (collapsed in <details>)
 */

import { memo, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, slideUp, fadeIn } from '@/lib/animations'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { cn, formatCompactMXN, formatNumber, formatPercentSafe } from '@/lib/utils'
import { sectorApi, analysisApi, institutionApi } from '@/api/client'
import type { IndustryClusterItem } from '@/api/client'
import { SECTOR_COLORS, SECTORS, RISK_COLORS, getRiskLevelFromScore, getSectorNameEN } from '@/lib/constants'
import { Heatmap } from '@/components/charts/Heatmap'
import type { SectorStatistics } from '@/api/types'
import { AlertTriangle, BarChart3, Layers, X } from 'lucide-react'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { ScrollReveal } from '@/hooks/useAnimations'
import { StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Treemap,
} from '@/components/charts'
import { formatCompactUSD } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type SortField = 'total_contracts' | 'total_value_mxn' | 'avg_risk_score' | 'high_risk_pct' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'

// ============================================================================
// Ramo mapping (top ramo per sector, from CLAUDE.md)
// ============================================================================

const SECTOR_TOP_RAMO: Record<string, string> = {
  salud: '12',
  educacion: '11',
  infraestructura: '09',
  energia: '18',
  defensa: '07',
  tecnologia: '38',
  hacienda: '06',
  gobernacion: '01',
  agricultura: '08',
  ambiente: '16',
  trabajo: '14',
  otros: '—',
}

// ============================================================================
// Helpers
// ============================================================================

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <span className="text-text-muted/40 ml-1">↕</span>
  return <span className="text-accent ml-1">{sortDir === 'desc' ? '▼' : '▲'}</span>
}

function getTopRamo(sectorCode: string): string {
  return SECTOR_TOP_RAMO[sectorCode] ?? '—'
}

// ============================================================================
// SECTOR RANKING STRIP — Compact horizontal ranking by avg_risk_score
// ============================================================================

interface SectorRankingStripProps {
  sectors: SectorStatistics[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
}

const SectorRankingStrip = memo(function SectorRankingStrip({
  sectors,
  selectedCode,
  onSelect,
}: SectorRankingStripProps) {
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b.avg_risk_score - a.avg_risk_score),
    [sectors]
  )
  const maxRisk = Math.max(...sorted.map((s) => s.avg_risk_score), 0.01)

  return (
    <motion.div
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
      role="listbox"
      aria-label="Sector risk ranking"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
    >
      {sorted.map((sector, i) => {
        const color = SECTOR_COLORS[sector.sector_code] || '#64748b'
        const riskPct = sector.avg_risk_score * 100
        const barHeight = Math.round((sector.avg_risk_score / maxRisk) * 28)
        const isSelected = selectedCode === sector.sector_code

        const riskBorderColor =
          sector.avg_risk_score >= 0.30 ? 'border-risk-critical/40' :
          sector.avg_risk_score >= 0.20 ? 'border-risk-high/40' :
          sector.avg_risk_score >= 0.10 ? 'border-risk-medium/30' :
          'border-border/30'

        return (
          <motion.button
            key={sector.sector_id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(isSelected ? null : sector.sector_code)}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all flex-shrink-0 min-w-[64px] group',
              isSelected
                ? 'border-accent bg-accent/10'
                : cn('hover:bg-background-elevated/40 hover:border-border/60', riskBorderColor, 'bg-background-elevated/10')
            )}
            aria-label={`${getSectorNameEN(sector.sector_code)}: ${riskPct.toFixed(1)}% avg risk, rank ${i + 1}`}
            variants={staggerItem}
            whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
          >
            {/* Rank badge */}
            <span className="text-[9px] font-bold text-text-muted font-mono">#{i + 1}</span>
            {/* Mini bar chart */}
            <div className="w-full flex items-end justify-center h-7">
              <div
                className="w-4 rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(barHeight, 3)}px`,
                  backgroundColor: color,
                  opacity: isSelected ? 1 : 0.7,
                }}
              />
            </div>
            {/* Color dot + code */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span
                className={cn(
                  'text-[9px] font-bold font-mono uppercase truncate max-w-[44px]',
                  isSelected ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'
                )}
              >
                {getSectorNameEN(sector.sector_code).slice(0, 6)}
              </span>
            </div>
            {/* Risk % */}
            <span
              className={cn(
                'text-[10px] font-black tabular-nums font-mono',
                sector.avg_risk_score >= 0.30 ? 'text-risk-critical' :
                sector.avg_risk_score >= 0.20 ? 'text-risk-high' :
                sector.avg_risk_score >= 0.10 ? 'text-risk-medium' :
                'text-risk-low'
              )}
            >
              {riskPct.toFixed(1)}%
            </span>
          </motion.button>
        )
      })}
    </motion.div>
  )
})

// ============================================================================
// SECTOR RADAR — Spider chart showing 6 risk dimensions for a sector
// ============================================================================

interface SectorRadarProps {
  sector: SectorStatistics
  allSectors: SectorStatistics[]
  compareSector?: SectorStatistics | null
}

function buildRadarData(sector: SectorStatistics, allSectors: SectorStatistics[]) {
  const totalValue = allSectors.reduce((s, sec) => s + sec.total_value_mxn, 0)
  const valueSharePct = totalValue > 0 ? (sector.total_value_mxn / totalValue) * 100 : 0
  const maxContracts = Math.max(...allSectors.map((s) => s.total_contracts), 1)
  const volumePct = (sector.total_contracts / maxContracts) * 100
  return [
    { subject: 'Direct Award', value: Math.min(100, sector.direct_award_pct ?? 0), fullMark: 100 },
    { subject: 'Single Bid',   value: Math.min(100, sector.single_bid_pct ?? 0),   fullMark: 100 },
    { subject: 'Avg Risk',     value: Math.min(100, (sector.avg_risk_score ?? 0) * 200), fullMark: 100 },
    { subject: 'High Risk %',  value: Math.min(100, sector.high_risk_pct ?? 0),    fullMark: 100 },
    { subject: 'Value Share',  value: Math.min(100, valueSharePct * 2),             fullMark: 100 },
    { subject: 'Volume',       value: Math.min(100, volumePct),                    fullMark: 100 },
  ]
}

const SectorRadar = memo(function SectorRadar({ sector, allSectors, compareSector }: SectorRadarProps) {
  const color = SECTOR_COLORS[sector.sector_code] || '#64748b'
  const compareColor = compareSector ? (SECTOR_COLORS[compareSector.sector_code] || '#64748b') : null

  // Merge primary + compare data into single series for RadarChart
  const radarData = buildRadarData(sector, allSectors).map((d, i) => ({
    ...d,
    compareValue: compareSector ? buildRadarData(compareSector, allSectors)[i].value : undefined,
  }))

  return (
    <div className="flex flex-col items-center">
      <RadarChart cx={140} cy={130} outerRadius={95} width={280} height={260} data={radarData}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={getSectorNameEN(sector.sector_code)}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.25}
          strokeWidth={1.5}
        />
        {compareSector && compareColor && (
          <Radar
            name={getSectorNameEN(compareSector.sector_code)}
            dataKey="compareValue"
            stroke={compareColor}
            fill={compareColor}
            fillOpacity={0.15}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}
      </RadarChart>
      <p className="text-[10px] text-text-muted font-mono text-center -mt-2">
        {compareSector
          ? `${getSectorNameEN(sector.sector_code)} vs ${getSectorNameEN(compareSector.sector_code)} · all axes 0–100`
          : `Risk dimensions for ${getSectorNameEN(sector.sector_code)} · all axes 0–100`}
      </p>
    </div>
  )
})

// ============================================================================
// MINI SPARKLINE — SVG polyline for risk trend
// ============================================================================

function MiniSparkline({ points, color = '#06b6d4' }: { points: number[]; color?: string }) {
  if (points.length < 2) return <span className="text-text-muted text-xs font-mono">—</span>
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const w = 60
  const h = 24
  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ')
  const trend = points[points.length - 1] - points[0]
  const trendColor = trend > 0.005 ? '#f87171' : trend < -0.005 ? '#4ade80' : '#94a3b8'
  return (
    <div className="flex items-center gap-1">
      <svg width={w} height={h} className="overflow-visible flex-shrink-0" aria-hidden="true">
        <polyline
          points={coords}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        {/* End dot */}
        {points.length > 0 && (() => {
          const lastX = w
          const lastY = h - ((points[points.length - 1] - min) / range) * (h - 4) - 2
          return <circle cx={lastX} cy={lastY} r={2} fill={color} />
        })()}
      </svg>
      <span className="text-[9px] font-mono" style={{ color: trendColor }}>
        {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'}
      </span>
    </div>
  )
}

// ============================================================================
// RISK STACK BAR — Stacked bar showing % contracts at each risk level
// ============================================================================

interface RiskStackBarProps {
  criticalPct: number
  highPct: number
  mediumPct: number
  lowPct: number
}

function RiskStackBar({ criticalPct, highPct, mediumPct, lowPct }: RiskStackBarProps) {
  const segments = [
    { key: 'critical', pct: criticalPct, color: '#ef4444', label: 'Critical' },
    { key: 'high',     pct: highPct,     color: '#f97316', label: 'High' },
    { key: 'medium',   pct: mediumPct,   color: '#eab308', label: 'Medium' },
    { key: 'low',      pct: lowPct,      color: '#22c55e', label: 'Low' },
  ]
  const title = segments
    .filter(s => s.pct > 0)
    .map(s => `${s.label}: ${s.pct.toFixed(1)}%`)
    .join(' · ')
  return (
    <div
      className="flex h-2 w-full rounded-full overflow-hidden gap-px"
      role="meter"
      aria-label={title}
      title={title}
    >
      {segments.map(s =>
        s.pct > 0.3 ? (
          <div
            key={s.key}
            className="h-full transition-all duration-500"
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
          />
        ) : null
      )}
    </div>
  )
}

// ============================================================================
// SECTOR TREEMAP — contract value by sector, colored by sector color
// ============================================================================

interface TreemapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  color?: string
  avg_risk_score?: number
}

function SectorTreemapContent(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', value = 0, color = '#64748b', avg_risk_score = 0 } = props
  if (width < 20 || height < 20) return null
  const showLabel = width > 60 && height > 36
  const showValue = width > 80 && height > 52
  const riskPct = (avg_risk_score * 100).toFixed(1)
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        rx={4}
        style={{ fill: color, fillOpacity: 0.82, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1 }}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + (showValue ? height / 2 - 8 : height / 2)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: '#fff',
            fontSize: Math.min(13, Math.max(9, width / 8)),
            fontWeight: 700,
            fontFamily: 'var(--font-mono, monospace)',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'rgba(255,255,255,0.75)',
            fontSize: Math.min(10, Math.max(8, width / 11)),
            fontFamily: 'var(--font-mono, monospace)',
            pointerEvents: 'none',
          }}
        >
          {formatCompactMXN(value)} · {riskPct}%
        </text>
      )}
    </g>
  )
}

// ============================================================================
// INDUSTRY RISK HEATMAP — Treemap: cell size = total value, color = avg risk
// ============================================================================

interface IndustryHeatmapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  vendor_count?: number
  avg_risk_score?: number
}

function IndustryHeatmapContent(props: IndustryHeatmapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', vendor_count = 0, avg_risk_score = 0 } = props
  if (width < 20 || height < 20) return null
  const showLabel = width > 55 && height > 32
  const showVendors = width > 80 && height > 52
  const riskLevel = getRiskLevelFromScore(avg_risk_score)
  const fillColor = RISK_COLORS[riskLevel]
  const riskPct = (avg_risk_score * 100).toFixed(1)

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        style={{ fill: fillColor, fillOpacity: 0.7, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1 }}
        rx={3}
        ry={3}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showVendors ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'rgba(255,255,255,0.92)',
            fontSize: Math.min(12, Math.max(9, width / 9)),
            fontWeight: 700,
            fontFamily: 'var(--font-mono, monospace)',
            pointerEvents: 'none',
          }}
        >
          {name}
        </text>
      )}
      {showVendors && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'rgba(255,255,255,0.72)',
            fontSize: Math.min(10, Math.max(8, width / 11)),
            fontFamily: 'var(--font-mono, monospace)',
            pointerEvents: 'none',
          }}
        >
          {vendor_count} vendors · {riskPct}%
        </text>
      )}
    </g>
  )
}

interface IndustryHeatmapWidgetProps {
  items: IndustryClusterItem[]
}

const IndustryRiskHeatmap = memo(function IndustryRiskHeatmap({ items }: IndustryHeatmapWidgetProps) {
  const treemapData = useMemo(
    () =>
      items.map((item) => ({
        name: item.sector_name,
        size: item.total_value,
        vendor_count: item.vendor_count,
        avg_risk_score: item.avg_risk_score,
        high_risk_vendor_count: item.high_risk_vendor_count,
        top_vendor_name: item.top_vendor_name,
        top_vendor_value: item.top_vendor_value,
        top_vendor_risk: item.top_vendor_risk,
      })),
    [items]
  )

  return (
    <ResponsiveContainer width="100%" height={380}>
      <Treemap
        data={treemapData}
        dataKey="size"
        aspectRatio={4 / 3}
        content={(props: Record<string, unknown>) => {
          const { x, y, width, height, name, vendor_count, avg_risk_score } = props as IndustryHeatmapContentProps
          return (
            <IndustryHeatmapContent
              x={x}
              y={y}
              width={width}
              height={height}
              name={name}
              vendor_count={vendor_count}
              avg_risk_score={avg_risk_score}
            />
          )
        }}
      >
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload as {
              name: string
              size: number
              vendor_count: number
              avg_risk_score: number
              high_risk_vendor_count: number
              top_vendor_name: string | null
              top_vendor_value: number | null
              top_vendor_risk: number | null
            }
            if (!d) return null
            const riskLevel = getRiskLevelFromScore(d.avg_risk_score)
            return (
              <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg max-w-[240px]">
                <p className="font-semibold text-text-primary text-sm mb-1">{d.name}</p>
                <div className="space-y-0.5 text-xs text-text-muted font-mono">
                  <p>Vendors: {d.vendor_count.toLocaleString()}</p>
                  <p>Total value: {formatCompactMXN(d.size)}</p>
                  <p className="flex items-center gap-1">
                    Avg risk:
                    <span
                      className="font-bold"
                      style={{ color: RISK_COLORS[riskLevel] }}
                    >
                      {(d.avg_risk_score * 100).toFixed(2)}% ({riskLevel})
                    </span>
                  </p>
                  <p>High-risk vendors: {d.high_risk_vendor_count.toLocaleString()}</p>
                  {d.top_vendor_name && (
                    <p className="pt-1 border-t border-border/30 mt-1">
                      Top vendor: {d.top_vendor_name}
                      {d.top_vendor_value != null && (
                        <span className="block text-[10px]">
                          {formatCompactMXN(d.top_vendor_value)}
                          {d.top_vendor_risk != null && ` · risk ${(d.top_vendor_risk * 100).toFixed(1)}%`}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export function Sectors() {
  const { t } = useTranslation('sectors')
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('total_value_mxn')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedSectorCode, setSelectedSectorCode] = useState<string | null>(null)
  const [compareSectorCode, setCompareSectorCode] = useState<string | null>(null)
  const [tableViewMode, setTableViewMode] = useState<'list' | 'treemap'>('list')
  const sectorValueChartRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: patternCounts } = useQuery({
    queryKey: ['analysis', 'pattern-counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 15 * 60 * 1000,
  })

  const { data: sectorYearResp } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: criScatterData } = useQuery({
    queryKey: ['institutions', 'cri-scatter'],
    queryFn: () => institutionApi.getCriScatter({ min_contracts: 200, limit: 200 }),
    staleTime: 60 * 60 * 1000,
  })

  // Derived: sector object for the selected code — must be before queries that depend on it
  const selectedSector = useMemo(() => {
    if (!selectedSectorCode || !data?.data) return null
    return data.data.find((s) => s.sector_code === selectedSectorCode) ?? null
  }, [selectedSectorCode, data])

  const { data: concentrationData } = useQuery({
    queryKey: ['institutions', 'concentration-rankings', selectedSector?.sector_id],
    queryFn: () => institutionApi.getConcentrationRankings({ sector_id: selectedSector?.sector_id, limit: 10 }),
    staleTime: 60 * 60 * 1000,
  })

  const { data: sectorASF } = useQuery({
    queryKey: ['sector-asf-findings', selectedSector?.sector_id],
    queryFn: () => analysisApi.getSectorASFFindings(selectedSector!.sector_id),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!selectedSector?.sector_id,
  })

  const { data: industryClusters, isLoading: industryClustersLoading } = useQuery({
    queryKey: ['analysis', 'industry-risk-clusters'],
    queryFn: () => analysisApi.getIndustryClusters(100),
    staleTime: 60 * 60 * 1000,
  })

  // ---- Sparkline data: per-sector avg_risk by year ----
  const sparklinesBySector = useMemo(() => {
    const items = sectorYearResp?.data ?? []
    const map = new Map<number, { year: number; avg_risk: number }[]>()
    items.forEach((d) => {
      if (!map.has(d.sector_id)) map.set(d.sector_id, [])
      map.get(d.sector_id)!.push({ year: d.year, avg_risk: d.avg_risk })
    })
    // Sort each sector's data by year
    map.forEach((arr) => arr.sort((a, b) => a.year - b.year))
    return map
  }, [sectorYearResp])

  // ---- Aggregate stats ----
  const aggregates = useMemo(() => {
    const sectors = data?.data ?? []
    if (!sectors.length) return null
    const totalContracts = sectors.reduce((s, sec) => s + sec.total_contracts, 0)
    const totalValue = sectors.reduce((s, sec) => s + sec.total_value_mxn, 0)
    const avgRisk = totalContracts > 0
      ? sectors.reduce((s, sec) => s + sec.avg_risk_score * sec.total_contracts, 0) / totalContracts
      : 0
    return { totalContracts, totalValue, avgRisk, sectorCount: sectors.length }
  }, [data])

  // ---- Sorted table data ----
  const sortedSectors = useMemo(() => {
    const sectors = data?.data ?? []
    return [...sectors].sort((a, b) => {
      const aVal = a[sortField] as number
      const bVal = b[sortField] as number
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [data, sortField, sortDir])

  // ---- Heatmap data ----
  const sectorHeatmapData = useMemo(() => {
    if (!data?.data) return { data: [], rows: [], columns: [] }
    const metrics = ['Avg Risk', 'Direct Award %', 'Single Bid %', 'High Risk %']
    const sectorNames = data.data.slice(0, 12).map((s) => getSectorNameEN(s.sector_code))

    const avgRiskValues = data.data.map((s) => s.avg_risk_score)
    const daValues = data.data.map((s) => s.direct_award_pct)
    const sbValues = data.data.map((s) => s.single_bid_pct)
    const hrValues = data.data.map((s) => s.high_risk_pct)

    const ranges = {
      'Avg Risk': { min: Math.min(...avgRiskValues), max: Math.max(...avgRiskValues) },
      'Direct Award %': { min: Math.min(...daValues), max: Math.max(...daValues) },
      'Single Bid %': { min: Math.min(...sbValues), max: Math.max(...sbValues) },
      'High Risk %': { min: Math.min(...hrValues), max: Math.max(...hrValues) },
    }

    const normalize = (value: number, metric: string) => {
      const range = ranges[metric as keyof typeof ranges]
      if (!range || range.max === range.min) return 0.5
      return (value - range.min) / (range.max - range.min)
    }

    const sectorsSubset = data.data.slice(0, 12)
    const heatmapData = sectorsSubset.flatMap((sector) => [
      { row: getSectorNameEN(sector.sector_code), col: 'Avg Risk', value: normalize(sector.avg_risk_score, 'Avg Risk'), rawValue: sector.avg_risk_score },
      { row: getSectorNameEN(sector.sector_code), col: 'Direct Award %', value: normalize(sector.direct_award_pct, 'Direct Award %'), rawValue: sector.direct_award_pct },
      { row: getSectorNameEN(sector.sector_code), col: 'Single Bid %', value: normalize(sector.single_bid_pct, 'Single Bid %'), rawValue: sector.single_bid_pct },
      { row: getSectorNameEN(sector.sector_code), col: 'High Risk %', value: normalize(sector.high_risk_pct, 'High Risk %'), rawValue: sector.high_risk_pct },
    ])

    return { data: heatmapData, rows: sectorNames, columns: metrics }
  }, [data])

  const compareSector = useMemo(() => {
    if (!compareSectorCode || !data?.data) return null
    return data.data.find((s) => s.sector_code === compareSectorCode) ?? null
  }, [compareSectorCode, data])

  const handleSectorClick = (sectorName: string) => {
    const sector = data?.data.find((s) => getSectorNameEN(s.sector_code) === sectorName)
    if (sector) navigate(`/sectors/${sector.sector_id}`)
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // ---- Sorted sectors for value chart ----
  const chartSectors = useMemo(() => {
    return [...(data?.data ?? [])].sort((a, b) => b.total_value_mxn - a.total_value_mxn)
  }, [data])

  // ---- Treemap data: sectors sized by total_value_mxn ----
  const treemapData = useMemo(() => {
    return (data?.data ?? []).map((s) => ({
      name: getSectorNameEN(s.sector_code),
      value: s.total_value_mxn,
      color: SECTOR_COLORS[s.sector_code] || '#64748b',
      avg_risk_score: s.avg_risk_score,
      sector_code: s.sector_code,
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-text-muted">
          <p>{t('page.failedToLoad')}</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  const topSector = chartSectors[0]

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        variants={slideUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
      <ScrollReveal direction="fade">
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          {t('page.title')}
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          {t('page.subtitle')}
        </p>
      </div>
      </ScrollReveal>
      </motion.div>

      {/* ================================================================ */}
      {/* SECTOR RANKING STRIP — All 12 sectors by avg risk, clickable  */}
      {/* ================================================================ */}
      {data?.data && data.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
              {t('page.rankedBy')}
            </p>
            {selectedSectorCode && (
              <button
                onClick={() => setSelectedSectorCode(null)}
                className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 font-mono"
                aria-label="Clear sector selection"
              >
                <X className="h-3 w-3" /> {t('page.clear')}
              </button>
            )}
          </div>
          <SectorRankingStrip
            sectors={data.data}
            selectedCode={selectedSectorCode}
            onSelect={(code) => { setSelectedSectorCode(code); setCompareSectorCode(null) }}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTOR RADAR — Spider chart for the selected sector            */}
      {/* ================================================================ */}
      {selectedSector && data?.data && (
        <Card className="border-accent/20 bg-accent/3">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SECTOR_COLORS[selectedSector.sector_code] || '#64748b' }}
                />
                <h3 className="text-sm font-bold text-text-primary">
                  {getSectorNameEN(selectedSector.sector_code)} — Risk Profile
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Compare dropdown */}
                <select
                  value={compareSectorCode ?? ''}
                  onChange={(e) => setCompareSectorCode(e.target.value || null)}
                  className="text-xs bg-background border border-border rounded px-2 py-0.5 text-text-secondary focus:outline-none focus:border-accent"
                  aria-label="Compare with sector"
                >
                  <option value="">{t('page.compareWith')}</option>
                  {data.data
                    .filter((s) => s.sector_code !== selectedSector.sector_code)
                    .map((s) => (
                      <option key={s.sector_code} value={s.sector_code}>
                        {getSectorNameEN(s.sector_code)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => navigate(`/sectors/${selectedSector.sector_id}`)}
                  className="text-xs text-accent flex items-center gap-1 hover:underline"
                >
                  {t('page.fullProfile')}
                </button>
                <button
                  onClick={() => { setSelectedSectorCode(null); setCompareSectorCode(null) }}
                  className="text-text-muted hover:text-text-primary"
                  aria-label="Close radar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 items-center">
              {/* Radar chart */}
              <SectorRadar sector={selectedSector} allSectors={data.data} compareSector={compareSector} />
              {/* Key stats sidebar */}
              <div className="space-y-2.5">
                {[
                  { label: t('table.totalContracts'), value: formatNumber(selectedSector.total_contracts), mono: true },
                  { label: t('table.totalValueMxn'), value: formatCompactMXN(selectedSector.total_value_mxn), mono: true },
                  { label: t('table.avgRiskScore'), value: `${(selectedSector.avg_risk_score * 100).toFixed(1)}%`, mono: true },
                  { label: t('table.highRiskPct'), value: formatPercentSafe(selectedSector.high_risk_pct, false), mono: true },
                  { label: t('table.directAwardPct'), value: formatPercentSafe(selectedSector.direct_award_pct, false), mono: true },
                  { label: t('heatmap.singleBid'), value: formatPercentSafe(selectedSector.single_bid_pct, false), mono: true },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/20">
                    <span className="text-xs text-text-muted">{label}</span>
                    <span className="text-xs font-bold tabular-nums font-mono text-text-primary">{value}</span>
                  </div>
                ))}
                {/* Risk level breakdown bar */}
                <div className="pt-1">
                  <p className="text-[10px] text-text-muted font-mono mb-1.5">Risk distribution</p>
                  <RiskStackBar
                    criticalPct={selectedSector.critical_risk_count / Math.max(selectedSector.total_contracts, 1) * 100}
                    highPct={selectedSector.high_risk_count / Math.max(selectedSector.total_contracts, 1) * 100}
                    mediumPct={selectedSector.medium_risk_count / Math.max(selectedSector.total_contracts, 1) * 100}
                    lowPct={selectedSector.low_risk_count / Math.max(selectedSector.total_contracts, 1) * 100}
                  />
                  <div className="flex justify-between mt-1 text-[9px] font-mono text-text-muted">
                    <span className="text-[#ef4444]">{(selectedSector.critical_risk_count / Math.max(selectedSector.total_contracts, 1) * 100).toFixed(1)}% crit</span>
                    <span className="text-[#f97316]">{(selectedSector.high_risk_count / Math.max(selectedSector.total_contracts, 1) * 100).toFixed(1)}% high</span>
                    <span className="text-[#eab308]">{(selectedSector.medium_risk_count / Math.max(selectedSector.total_contracts, 1) * 100).toFixed(1)}% med</span>
                    <span className="text-[#22c55e]">{(selectedSector.low_risk_count / Math.max(selectedSector.total_contracts, 1) * 100).toFixed(1)}% low</span>
                  </div>
                </div>
                {/* Quick CTAs */}
                <div className="flex gap-2 pt-2">
                  <Link
                    to={`/contracts?sector_id=${selectedSector.sector_id}`}
                    className="flex-1 text-center text-[10px] font-mono font-bold rounded border border-border/50 px-2 py-1.5 hover:border-accent/60 hover:bg-accent/5 transition-all text-text-muted hover:text-accent"
                  >
                    All Contracts →
                  </Link>
                  <Link
                    to={`/contracts?sector_id=${selectedSector.sector_id}&risk_level=high`}
                    className="flex-1 text-center text-[10px] font-mono font-bold rounded border border-risk-high/30 px-2 py-1.5 hover:border-risk-high/60 hover:bg-risk-high/5 transition-all text-risk-high"
                  >
                    High Risk →
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sectorASF && sectorASF.findings.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              ASF Audit History · {sectorASF.sector_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-center text-sm">
              <div>
                <div className="font-semibold">{formatCompactMXN(sectorASF.total_amount_mxn)}</div>
                <div className="text-xs text-muted-foreground">{t('asf.totalQuestioned')}</div>
              </div>
              <div>
                <div className="font-semibold">{sectorASF.years_audited}</div>
                <div className="text-xs text-muted-foreground">{t('asf.yearsAudited')}</div>
              </div>
              <div>
                <div className="font-semibold">
                  {sectorASF.findings.reduce((s, f) => s + f.institutions_audited, 0)}
                </div>
                <div className="text-xs text-muted-foreground">{t('asf.institutions')}</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart data={sectorASF.findings} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)}B`} tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(value: any) => [formatCompactMXN(value as number), 'Questioned']} />
                <Bar dataKey="total_amount_mxn" fill="#ef4444" opacity={0.5} />
                <Bar
                  dataKey="total_amount_mxn"
                  fill="#22c55e"
                  opacity={0.6}
                  {...{ data: sectorASF.findings.map(f => ({
                    ...f,
                    total_amount_mxn: f.observations_solved > 0
                      ? (f.total_amount_mxn * f.observations_solved / Math.max(f.total_observations, 1))
                      : 0
                  })) } as any}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <ScrollReveal delay={0} direction="up">
          <SharedStatCard
            label={t('statCards.sectorsTracked')}
            value={aggregates ? String(aggregates.sectorCount) : '—'}
            detail={t('statCards.sectorsTrackedDetail')}
            borderColor="border-accent/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={80} direction="up">
          <SharedStatCard
            label={t('statCards.totalContracts')}
            value={aggregates ? formatNumber(aggregates.totalContracts) : '—'}
            detail={t('statCards.totalContractsDetail')}
            borderColor="border-blue-500/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={160} direction="up">
          <SharedStatCard
            label={t('statCards.totalValue')}
            value={aggregates ? formatCompactMXN(aggregates.totalValue) : '—'}
            detail={t('statCards.totalValueDetail')}
            borderColor="border-amber-500/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={240} direction="up">
          <SharedStatCard
            label={t('statCards.avgRiskScore')}
            value={aggregates ? `${(aggregates.avgRisk * 100).toFixed(1)}%` : '—'}
            detail={t('statCards.avgRiskScoreDetail')}
            borderColor="border-red-500/30"
            color={aggregates && aggregates.avgRisk >= 0.3 ? 'text-risk-high' : 'text-text-primary'}
            loading={isLoading}
          />
        </ScrollReveal>
      </div>

      {/* System Intelligence Chips */}
      {patternCounts && (
        <div className="flex flex-wrap gap-2">
          <ScrollReveal delay={0} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-risk-critical/20 bg-risk-critical/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-critical" />
              <span className="text-xs font-mono font-medium text-risk-critical">
                {formatNumber(patternCounts.counts.critical)} {t('chips.criticalRisk')}
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={60} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-mono font-medium text-amber-500">
                {formatNumber(patternCounts.counts.december_rush)} {t('chips.decemberRush')}
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={120} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background-elevated/30 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              <span className="text-xs font-mono font-medium text-text-secondary">
                {formatNumber(patternCounts.counts.co_bidding)} {t('chips.coBiddingFlags')}
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={180} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background-elevated/30 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              <span className="text-xs font-mono font-medium text-text-secondary">
                {formatNumber(patternCounts.counts.price_outliers)} {t('chips.priceOutliers')}
              </span>
            </div>
          </ScrollReveal>
        </div>
      )}

      {/* Section 2a: Sector Risk Heatmap — strongest signal, visible by default */}
      <ScrollReveal direction="fade">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('heatmap.title')}
            </CardTitle>
            <CardDescription>
              {t('heatmap.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[450px]" />
            ) : (
              <Heatmap
                data={sectorHeatmapData.data}
                rows={sectorHeatmapData.rows}
                columns={sectorHeatmapData.columns}
                height={450}
                colorRange={['#16a34a', '#f5f5f5', '#dc2626']}
                valueFormatter={(v, row, col) => {
                  const cell = sectorHeatmapData.data.find((d) => d.row === row && d.col === col)
                  const rawValue = (cell as { rawValue?: number })?.rawValue ?? v
                  if (col === 'Avg Risk') return `${(rawValue * 100).toFixed(1)}%`
                  return `${rawValue.toFixed(1)}%`
                }}
                onCellClick={(row) => handleSectorClick(row)}
              />
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Section 2b: Sortable Comparison Table */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <motion.div
        variants={fadeIn}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              {t('table.title')}
            </CardTitle>
            {/* View toggle: List | Treemap */}
            <div
              className="flex items-center rounded-md border border-border/50 overflow-hidden text-[11px] font-mono select-none"
              role="group"
              aria-label="Table view mode"
            >
              <button
                onClick={() => setTableViewMode('list')}
                className={cn(
                  'px-3 py-1 transition-colors',
                  tableViewMode === 'list'
                    ? 'bg-accent text-black font-bold'
                    : 'text-text-muted hover:text-text-primary hover:bg-background-elevated/40'
                )}
                aria-pressed={tableViewMode === 'list'}
              >
                List
              </button>
              <button
                onClick={() => setTableViewMode('treemap')}
                className={cn(
                  'px-3 py-1 transition-colors border-l border-border/50',
                  tableViewMode === 'treemap'
                    ? 'bg-accent text-black font-bold'
                    : 'text-text-muted hover:text-text-primary hover:bg-background-elevated/40'
                )}
                aria-pressed={tableViewMode === 'treemap'}
              >
                Treemap
              </button>
            </div>
          </div>
          <CardDescription className="text-xs">
            {tableViewMode === 'treemap'
              ? 'Sectors sized by total contract value — color = sector, label shows value and avg risk score'
              : t('table.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tableViewMode === 'treemap' ? (
            /* ---- TREEMAP VIEW ---- */
            <div className="p-4">
              <ResponsiveContainer width="100%" height={420}>
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  aspectRatio={4 / 3}
                  onClick={(node: Record<string, unknown>) => {
                    const sectorName = node.name as string
                    handleSectorClick(sectorName)
                  }}
                  content={(props: Record<string, unknown>) => {
                    const { x, y, width, height, name, value, color, avg_risk_score } = props as TreemapContentProps
                    return (
                      <SectorTreemapContent
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        name={name}
                        value={value}
                        color={color}
                        avg_risk_score={avg_risk_score}
                      />
                    )
                  }}
                >
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]?.payload as {
                        name: string
                        value: number
                        avg_risk_score: number
                        color: string
                      }
                      if (!d) return null
                      return (
                        <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="font-bold text-text-primary">{d.name}</span>
                          </div>
                          <div className="text-text-muted space-y-0.5 font-mono">
                            <div>Value: {formatCompactMXN(d.value)}</div>
                            <div>Avg Risk: {(d.avg_risk_score * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      )
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
              <p className="mt-2 text-[10px] text-text-muted font-mono text-center">
                Rectangle area ∝ total contract value · Color = sector · Value shown when space permits
              </p>
            </div>
          ) : (
            /* ---- LIST VIEW ---- */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-xs" role="table">
                <thead>
                  <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                    <th className="px-3 py-2.5 text-left font-medium">{t('table.sector')}</th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_contracts')}
                      aria-sort={sortField === 'total_contracts' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    >
                      {t('table.totalContracts')}
                      <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('total_value_mxn')}
                      aria-sort={sortField === 'total_value_mxn' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    >
                      {t('table.totalValueMxn')}
                      <SortIndicator field="total_value_mxn" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('avg_risk_score')}
                      aria-sort={sortField === 'avg_risk_score' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    >
                      {t('table.avgRiskScore')}
                      <SortIndicator field="avg_risk_score" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('high_risk_pct')}
                      aria-sort={sortField === 'high_risk_pct' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    >
                      {t('table.highRiskPct')}
                      <SortIndicator field="high_risk_pct" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th
                      className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                      onClick={() => handleSort('direct_award_pct')}
                      aria-sort={sortField === 'direct_award_pct' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    >
                      {t('table.directAwardPct')}
                      <SortIndicator field="direct_award_pct" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap hidden xl:table-cell w-[100px]">
                      Risk Levels
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap hidden xl:table-cell">
                      {t('table.riskTrend')}
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap hidden lg:table-cell">
                      {t('table.topRamo')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSectors.map((sector, i) => {
                    const color = SECTOR_COLORS[sector.sector_code] || '#64748b'
                    const topRamo = getTopRamo(sector.sector_code)
                    const spark = sparklinesBySector.get(sector.sector_id)
                    const sparkPoints = spark ? spark.map((d) => d.avg_risk) : []
                    return (
                      <tr
                        key={sector.sector_id}
                        className="border-b border-border/20 hover:bg-background-elevated/40 transition-colors"
                        style={{
                          opacity: 0,
                          animation: `fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 40 + 200}ms both`,
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                            <Link
                              to={`/sectors/${sector.sector_id}`}
                              className="font-medium text-text-primary hover:text-accent transition-colors"
                            >
                              {getSectorNameEN(sector.sector_code)}
                            </Link>
                            {/* ASF audit badge — shown when this sector has audit findings loaded */}
                            {sectorASF && sectorASF.sector_id === sector.sector_id && sectorASF.findings.length > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0"
                                title={`ASF: ${sectorASF.findings.length} audit year${sectorASF.findings.length !== 1 ? 's' : ''} with findings`}
                                aria-label={`ASF audit findings: ${sectorASF.findings.length} years`}
                              >
                                ASF {sectorASF.findings.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                          {formatNumber(sector.total_contracts)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                          {formatCompactMXN(sector.total_value_mxn)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <RiskBadge score={sector.avg_risk_score} className="text-xs px-1.5 py-0" />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                          {formatPercentSafe(sector.high_risk_pct, false)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary tabular-nums">
                          {formatPercentSafe(sector.direct_award_pct, false)}
                        </td>
                        {/* Risk Stack Bar — % at each level */}
                        <td className="px-3 py-2.5 hidden xl:table-cell w-[100px]">
                          <RiskStackBar
                            criticalPct={sector.critical_risk_count / Math.max(sector.total_contracts, 1) * 100}
                            highPct={sector.high_risk_count / Math.max(sector.total_contracts, 1) * 100}
                            mediumPct={sector.medium_risk_count / Math.max(sector.total_contracts, 1) * 100}
                            lowPct={sector.low_risk_count / Math.max(sector.total_contracts, 1) * 100}
                          />
                        </td>
                        {/* Sparkline */}
                        <td className="px-3 py-2.5 hidden xl:table-cell">
                          <MiniSparkline points={sparkPoints} color={color} />
                        </td>
                        <td className="px-3 py-2.5 text-text-muted font-mono hidden lg:table-cell">
                          {topRamo}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Section 3: Contract Value by Sector */}
      <ScrollReveal direction="fade">
        <div>
          {/* Contract Value by Sector */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                  {t('valueChart.title')}
                </CardTitle>
                <ChartDownloadButton targetRef={sectorValueChartRef} filename="sectors-contract-value" />
              </div>
              {topSector && (
                <CardDescription className="text-xs">
                  {getSectorNameEN(topSector.sector_code)} leads with {formatCompactMXN(topSector.total_value_mxn)} — {((topSector.total_value_mxn / (data?.total_value_mxn || 1)) * 100).toFixed(0)}% of all procurement
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[340px]" ref={sectorValueChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSectors} layout="vertical" margin={{ right: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1_000_000_000_000).toFixed(1)}T`}
                    />
                    <YAxis
                      type="category"
                      dataKey="sector_code"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={(code) => getSectorNameEN(code)}
                      width={100}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as SectorStatistics
                          const totalVal = data?.total_value_mxn || 1
                          const pctOfTotal = ((d.total_value_mxn / totalVal) * 100).toFixed(1)
                          return (
                            <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg">
                              <p className="font-medium">{getSectorNameEN(d.sector_code)}</p>
                              <p className="text-sm text-text-muted">Value: {formatCompactMXN(d.total_value_mxn)} ({pctOfTotal}%)</p>
                              <p className="text-xs text-text-muted">{formatCompactUSD(d.total_value_mxn)}</p>
                              <p className="text-sm text-text-muted">Contracts: {formatNumber(d.total_contracts)}</p>
                              <p className="text-sm text-text-muted">Avg Risk: {formatPercentSafe(d.avg_risk_score, true)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="total_value_mxn" radius={[0, 4, 4, 0]}>
                      {chartSectors.map((sector) => (
                        <Cell key={sector.sector_id} fill={SECTOR_COLORS[sector.sector_code] || '#64748b'} />
                      ))}
                      <LabelList
                        dataKey="total_value_mxn"
                        position="right"
                        formatter={(v: unknown) => formatCompactMXN(Number(v))}
                        style={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      </ScrollReveal>

      {/* ================================================================ */}
      {/* CRI SCATTER — Institution Risk Landscape (Fazekas-style)         */}
      {/* ================================================================ */}
      {criScatterData && criScatterData.data.length > 0 && (
        <ScrollReveal direction="fade">
          <Card className="bg-card border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-text-primary">
                Institution Risk Landscape — Direct Award vs Risk Score
              </CardTitle>
              <CardDescription className="text-xs text-text-muted">
                Each bubble = one institution. X: direct award rate. Y: avg risk score. Size: contract volume. Top-right quadrant = highest concern.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.2} />
                  <XAxis
                    type="number"
                    dataKey="direct_award_pct"
                    name="Direct Award %"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'Direct Award Rate', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-text-muted)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="avg_risk"
                    name="Avg Risk"
                    domain={[0, 0.5]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: 'Avg Risk', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--color-text-muted)' }}
                    width={40}
                  />
                  <ZAxis type="number" dataKey="total_contracts" range={[20, 600]} name="Contracts" />
                  <ReferenceLine x={70} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={0.30} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-family-mono)',
                    }}
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      return (
                        <div className="p-2 max-w-[240px]">
                          <div className="font-semibold text-text-primary text-[11px] leading-tight mb-1">{d.name}</div>
                          <div className="text-[10px] text-text-muted space-y-0.5">
                            <div>Sector: {d.sector_code}</div>
                            <div>Contracts: {d.total_contracts.toLocaleString()}</div>
                            <div>Avg Risk: {(d.avg_risk * 100).toFixed(2)}%</div>
                            <div>Direct Award: {d.direct_award_pct.toFixed(1)}%</div>
                            <div>Single Bid: {d.single_bid_pct.toFixed(1)}%</div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Scatter
                    data={criScatterData.data}
                    fill="#64748b"
                    fillOpacity={0.7}
                    shape={(props: any) => {
                      const { cx, cy, r } = props as { cx: number; cy: number; r: number; payload: Record<string, unknown> }
                      const payload = props.payload as { sector_code: string }
                      const color = SECTOR_COLORS[payload.sector_code] || '#64748b'
                      return <circle cx={cx} cy={cy} r={r || 4} fill={color} fillOpacity={0.65} stroke={color} strokeOpacity={0.9} strokeWidth={0.5} />
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="mt-2 text-[10px] text-text-muted font-mono">
                Dashed amber line = 70% direct award threshold · Dashed red line = 30% high-risk threshold · Bubble color = sector · Size = contract volume
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* ================================================================ */}
      {/* MARKET HEALTH — Supplier Diversity (HHI)                        */}
      {/* ================================================================ */}
      {concentrationData && concentrationData.most_concentrated.length > 0 && (
        <ScrollReveal direction="fade">
          <Card className="bg-card border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-text-primary">
                Market Health — Supplier Diversity (HHI)
              </CardTitle>
              <CardDescription className="text-xs text-text-muted">
                Herfindahl-Hirschman Index per institution ({concentrationData.year}). HHI &gt;2,500 = highly concentrated; &lt;1,000 = competitive.
                Source: Prozorro (Ukraine) analytics / Fazekas CRI methodology.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-text-muted font-mono mb-3 p-2 bg-muted/20 rounded border border-border/30">
                HHI = sum of squared market shares (0–10,000 scale). EU antitrust challenges mergers creating HHI &gt;2,500.
                In procurement, high HHI indicates limited effective competition.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-1.5 pr-4 font-mono text-text-muted">Institution</th>
                      <th className="text-right py-1.5 pr-4 font-mono text-text-muted">HHI</th>
                      <th className="text-right py-1.5 pr-4 font-mono text-text-muted">Unique Vendors</th>
                      <th className="text-right py-1.5 pr-4 font-mono text-text-muted">Total Value</th>
                      <th className="text-left py-1.5 font-mono text-text-muted">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concentrationData.most_concentrated.slice(0, 10).map((inst) => (
                      <tr key={inst.institution_id} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="py-1.5 pr-4 text-text-secondary max-w-[220px] truncate" title={inst.name}>
                          {inst.siglas || inst.name.slice(0, 30)}
                        </td>
                        <td className={`py-1.5 pr-4 text-right font-mono font-bold ${
                          inst.hhi >= 2500 ? 'text-risk-critical' : inst.hhi >= 1000 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {inst.hhi.toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-4 text-right font-mono text-text-muted">{inst.unique_vendors}</td>
                        <td className="py-1.5 pr-4 text-right font-mono text-text-muted">{formatCompactMXN(inst.total_value_mxn)}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            inst.concentration_level === 'high'
                              ? 'bg-red-950/40 text-red-400 border border-red-500/30'
                              : inst.concentration_level === 'medium'
                              ? 'bg-amber-950/30 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {inst.concentration_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* ================================================================ */}
      {/* INDUSTRY RISK CONCENTRATION — Treemap by total value             */}
      {/* ================================================================ */}
      <ScrollReveal direction="fade">
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Industry Risk Concentration
            </CardTitle>
            <CardDescription className="text-xs text-text-muted">
              Cell size = total contract value · Color = avg risk score (
              <span className="text-risk-critical font-semibold">critical</span> ≥50% ·{' '}
              <span className="text-risk-high font-semibold">high</span> ≥30% ·{' '}
              <span className="text-risk-medium font-semibold">medium</span> ≥10% ·{' '}
              <span className="text-risk-low font-semibold">low</span> &lt;10%
              ) · Min 100 vendors per sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            {industryClustersLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 h-[380px]">
                <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" aria-hidden="true" />
                <p className="text-xs text-text-muted font-mono">Computing industry clusters...</p>
                <p className="text-[10px] text-text-muted/60 font-mono">First load may take up to 100 seconds</p>
              </div>
            ) : industryClusters && industryClusters.data.length > 0 ? (
              <IndustryRiskHeatmap items={industryClusters.data} />
            ) : (
              <div className="flex items-center justify-center h-[380px]">
                <p className="text-xs text-text-muted font-mono">No cluster data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  )
}

// ============================================================================
// Legacy SectorRiskTable — kept for potential reuse, not rendered in main flow
// ============================================================================

interface SectorRiskTableProps {
  data: Array<{
    sector_id: number
    sector_code: string
    sector_name: string
    total_contracts: number
    total_value_mxn: number
    avg_risk_score: number
    high_risk_pct: number
    direct_award_pct: number
    single_bid_pct: number
  }>
  onSectorClick?: (name: string) => void
}

const SectorRiskTable = memo(function SectorRiskTable({
  data,
  onSectorClick,
}: SectorRiskTableProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.avg_risk_score - a.avg_risk_score)
  }, [data])

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr>
            <th className="data-cell-header text-left">Rank</th>
            <th className="data-cell-header text-left">Sector</th>
            <th className="data-cell-header text-right">Contracts</th>
            <th className="data-cell-header text-right">Total Value</th>
            <th className="data-cell-header text-right">Avg Risk</th>
            <th className="data-cell-header text-right">High Risk %</th>
            <th className="data-cell-header text-right">Direct Award %</th>
            <th className="data-cell-header text-right">Single Bid %</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((sector, index) => (
            <tr
              key={sector.sector_id}
              className="interactive"
              onClick={() => onSectorClick?.(sector.sector_name)}
            >
              <td className="data-cell font-medium">{index + 1}</td>
              <td className="data-cell">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        SECTORS.find((s) => s.code === sector.sector_code)?.color || '#64748b',
                    }}
                  />
                  {sector.sector_name}
                </div>
              </td>
              <td className="data-cell text-right tabular-nums">
                {formatNumber(sector.total_contracts)}
              </td>
              <td className="data-cell text-right tabular-nums">
                {formatCompactMXN(sector.total_value_mxn)}
              </td>
              <td className="data-cell text-right">
                <RiskBadge score={sector.avg_risk_score} />
              </td>
              <td className="data-cell text-right tabular-nums">
                {formatPercentSafe(sector.high_risk_pct, false)}
              </td>
              <td className="data-cell text-right tabular-nums">
                {formatPercentSafe(sector.direct_award_pct, false)}
              </td>
              <td className="data-cell text-right tabular-nums">
                {formatPercentSafe(sector.single_bid_pct, false)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

// Suppress unused warning — kept for potential reuse
void SectorRiskTable

export default Sectors
