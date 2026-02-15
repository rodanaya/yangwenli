import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import { SECTOR_COLORS, SECTORS, getSectorNameEN } from '@/lib/constants'
import { Heatmap } from '@/components/charts'
import type { SectorStatistics } from '@/api/types'
import { BarChart3, ExternalLink, Layers } from 'lucide-react'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import { getSectorDescription } from '@/lib/sector-descriptions'
import { buildSectorNarrative } from '@/lib/narratives'
import { NarrativeCard } from '@/components/NarrativeCard'
import { SectionDescription } from '@/components/SectionDescription'
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
} from '@/components/charts'

// Sector groupings for logical organization
const SECTOR_GROUPS = [
  { label: 'Essential Services', codes: ['salud', 'educacion', 'trabajo'] },
  { label: 'Infrastructure & Energy', codes: ['infraestructura', 'energia', 'ambiente'] },
  { label: 'Government Operations', codes: ['hacienda', 'gobernacion', 'defensa'] },
  { label: 'Specialized', codes: ['tecnologia', 'agricultura', 'otros'] },
] as const

export function Sectors() {
  const navigate = useNavigate()
  const [selectedSectorCode, setSelectedSectorCode] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 10 * 60 * 1000,
  })

  // Transform sectors data for heatmap (sectors x metrics)
  const sectorHeatmapData = useMemo(() => {
    if (!data?.data) return { data: [], rows: [], columns: [] }
    const metrics = ['Avg Risk', 'Direct Award %', 'Single Bid %', 'High Risk %']
    const sectorNames = data.data.slice(0, 12).map((s) => s.sector_name)

    // Calculate ranges for normalization
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
      {
        row: sector.sector_name,
        col: 'Avg Risk',
        value: normalize(sector.avg_risk_score, 'Avg Risk'),
        rawValue: sector.avg_risk_score,
      },
      {
        row: sector.sector_name,
        col: 'Direct Award %',
        value: normalize(sector.direct_award_pct, 'Direct Award %'),
        rawValue: sector.direct_award_pct,
      },
      {
        row: sector.sector_name,
        col: 'Single Bid %',
        value: normalize(sector.single_bid_pct, 'Single Bid %'),
        rawValue: sector.single_bid_pct,
      },
      {
        row: sector.sector_name,
        col: 'High Risk %',
        value: normalize(sector.high_risk_pct, 'High Risk %'),
        rawValue: sector.high_risk_pct,
      },
    ])

    return { data: heatmapData, rows: sectorNames, columns: metrics }
  }, [data])

  const handleSectorClick = (sectorName: string) => {
    const sector = data?.data.find((s) => s.sector_name === sectorName)
    if (sector) {
      navigate(`/sectors/${sector.sector_id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-text-muted">
          <p>Failed to load sectors</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  const allSectors = data?.data || []
  const sortedSectors = [...allSectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn)

  const selectedSector = allSectors.find((s) => s.sector_code === selectedSectorCode) || null

  // Compute comparative stats
  const avgHighRiskPct = allSectors.length > 0
    ? allSectors.reduce((s, sec) => s + sec.high_risk_pct, 0) / allSectors.length
    : 0
  const avgDirectAwardPct = allSectors.length > 0
    ? allSectors.reduce((s, sec) => s + sec.direct_award_pct, 0) / allSectors.length
    : 0
  const avgSingleBidPct = allSectors.length > 0
    ? allSectors.reduce((s, sec) => s + sec.single_bid_pct, 0) / allSectors.length
    : 0

  // Top sector annotation for bar chart
  const topSector = sortedSectors[0]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-accent" />
          Sectors Overview
        </h2>
        <p className="text-xs text-text-muted mt-0.5">12 sectors covering {formatNumber(data?.total_contracts || 0)} contracts</p>
      </div>

      <SectionDescription>
        Mexican federal procurement is organized into 12 sectors based on the government
        branch (ramo) responsible. Each sector has distinct procurement patterns, vendor
        ecosystems, and risk profiles. Expand any sector card to read an AI-generated
        analysis comparing it to cross-sector averages.
      </SectionDescription>

      {/* Summary chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-3.5 w-3.5 text-accent" />
            Contract Value by Sector
          </CardTitle>
          {topSector && (
            <CardDescription className="text-xs">
              {getSectorNameEN(topSector.sector_code)} leads with {formatCompactMXN(topSector.total_value_mxn)} — {((topSector.total_value_mxn / (data?.total_value_mxn || 1)) * 100).toFixed(0)}% of all procurement
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedSectors} layout="vertical" margin={{ right: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
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
                  {sortedSectors.map((sector) => (
                    <Cell key={sector.sector_id} fill={SECTOR_COLORS[sector.sector_code] || '#64748b'} />
                  ))}
                  <LabelList
                    dataKey="total_value_mxn"
                    position="right"
                    formatter={(v) => formatCompactMXN(Number(v))}
                    style={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sector Narrative (shown when a sector is selected) */}
      {selectedSector && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              {getSectorNameEN(selectedSector.sector_code)} — Analysis
            </h3>
            <button
              onClick={() => setSelectedSectorCode(null)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
          <NarrativeCard
            paragraphs={buildSectorNarrative(selectedSector, allSectors)}
            compact
          />
        </div>
      )}

      {/* Grouped sector cards */}
      {SECTOR_GROUPS.map((group) => {
        const groupSectors = group.codes
          .map((code) => allSectors.find((s) => s.sector_code === code))
          .filter((s): s is SectorStatistics => s != null)
        if (groupSectors.length === 0) return null
        return (
          <div key={group.label} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted font-[var(--font-family-mono)]">
              {group.label}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupSectors.map((sector) => (
                <SectorCard
                  key={sector.sector_id}
                  sector={sector}
                  allSectors={allSectors}
                  avgHighRiskPct={avgHighRiskPct}
                  avgDirectAwardPct={avgDirectAwardPct}
                  avgSingleBidPct={avgSingleBidPct}
                  isSelected={selectedSectorCode === sector.sector_code}
                  onSelect={() => setSelectedSectorCode(
                    selectedSectorCode === sector.sector_code ? null : sector.sector_code
                  )}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Sector Risk Heatmap */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Sector Risk Heatmap
          </CardTitle>
          <CardDescription>
            Risk indicators by sector (color = relative ranking within each metric)
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
              valueFormatter={(v, row, col) => {
                const cell = sectorHeatmapData.data.find((d) => d.row === row && d.col === col)
                const rawValue = (cell as { rawValue?: number })?.rawValue ?? v
                if (col === 'Avg Risk') {
                  return `${(rawValue * 100).toFixed(1)}%`
                }
                return `${rawValue.toFixed(1)}%`
              }}
              onCellClick={(row) => handleSectorClick(row)}
            />
          )}
        </CardContent>
      </Card>

      {/* Sector Risk Rankings */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Sector Risk Rankings
          </CardTitle>
          <CardDescription>All sectors ranked by average risk score</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <SectorRiskTable
              data={data?.data || []}
              onSectorClick={handleSectorClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Build a comparative annotation like "highest of all sectors" or "2.3x average" */
function comparativeLabel(
  value: number,
  avg: number,
  allValues: number[],
  higher: 'higher' | 'lower' = 'higher',
): string {
  const sorted = [...allValues].sort((a, b) => b - a)
  const rank = sorted.indexOf(value) + 1
  if (rank === 1 && higher === 'higher') return 'highest of all sectors'
  if (rank === sorted.length && higher === 'lower') return 'lowest of all sectors'
  if (avg > 0) {
    const ratio = value / avg
    if (ratio >= 1.8) return `${ratio.toFixed(1)}x average`
    if (ratio <= 0.5) return `${ratio.toFixed(1)}x average`
  }
  if (rank <= 3) return `#${rank} of 12 sectors`
  if (rank >= 10) return `#${rank} of 12 sectors`
  return ''
}

function SectorCard({
  sector,
  allSectors,
  avgHighRiskPct: _avgHighRiskPct,
  avgDirectAwardPct,
  avgSingleBidPct,
  isSelected,
  onSelect,
}: {
  sector: SectorStatistics
  allSectors: SectorStatistics[]
  avgHighRiskPct: number
  avgDirectAwardPct: number
  avgSingleBidPct: number
  isSelected: boolean
  onSelect: () => void
}) {
  const sectorColor = SECTOR_COLORS[sector.sector_code] || '#64748b'
  const desc = getSectorDescription(sector.sector_code)

  // Prefetch sector details on hover for instant page transitions
  const prefetch = usePrefetchOnHover({
    queryKey: ['sector', sector.sector_id],
    queryFn: () => sectorApi.getById(sector.sector_id),
    delay: 150,
  })

  // Comparative annotations
  const daAnnotation = comparativeLabel(
    sector.direct_award_pct,
    avgDirectAwardPct,
    allSectors.map((s) => s.direct_award_pct),
  )
  const sbAnnotation = comparativeLabel(
    sector.single_bid_pct,
    avgSingleBidPct,
    allSectors.map((s) => s.single_bid_pct),
  )

  return (
    <Card
      className={`hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group ${
        isSelected ? 'border-accent/70 ring-1 ring-accent/30' : ''
      }`}
      {...prefetch}
    >
      <CardContent className="p-4 group-hover:bg-accent/[0.02] transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${sectorColor}20`, color: sectorColor }}
            >
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <Link
                to={`/sectors/${sector.sector_id}`}
                className="text-sm font-medium hover:text-accent transition-colors"
              >
                {getSectorNameEN(sector.sector_code)}
              </Link>
              <p className="text-xs text-text-muted">{formatNumber(sector.total_contracts)} contracts</p>
            </div>
          </div>
          <RiskBadge score={sector.avg_risk_score} />
        </div>

        {/* Sector description */}
        <p className="text-[11px] leading-relaxed text-text-muted mb-3">{desc.short}</p>

        {/* Stats with comparative context */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <p className="text-text-muted text-xs">Total Value</p>
            <p className="font-medium tabular-nums">{formatCompactMXN(sector.total_value_mxn)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Vendors</p>
            <p className="font-medium tabular-nums">{formatNumber(sector.total_vendors)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Direct Awards</p>
            <p className="font-medium tabular-nums">
              {formatPercentSafe(sector.direct_award_pct, false)}
              {daAnnotation && (
                <span className="text-[10px] text-text-muted ml-1">({daAnnotation})</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Single Bids</p>
            <p className="font-medium tabular-nums">
              {formatPercentSafe(sector.single_bid_pct, false)}
              {sbAnnotation && (
                <span className="text-[10px] text-text-muted ml-1">({sbAnnotation})</span>
              )}
            </p>
          </div>
        </div>

        {/* Risk breakdown mini bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Risk Distribution</span>
            <span>{formatNumber(sector.high_risk_count + sector.critical_risk_count)} high risk</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-background-elevated">
            <div
              className="bg-risk-low"
              style={{ width: `${(sector.low_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-medium"
              style={{ width: `${(sector.medium_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-high"
              style={{ width: `${(sector.high_risk_count / sector.total_contracts) * 100}%` }}
            />
            <div
              className="bg-risk-critical"
              style={{ width: `${(sector.critical_risk_count / sector.total_contracts) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <button
            onClick={onSelect}
            className="text-xs text-text-muted hover:text-accent transition-colors"
          >
            {isSelected ? 'Hide analysis' : 'Show analysis'}
          </button>
          <Link
            to={`/sectors/${sector.sector_id}`}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Sector Risk Rankings Table
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

export default Sectors
