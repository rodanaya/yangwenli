/**
 * Sectors Overview — Investigation Workbench
 *
 * Section 1: 4 StatCards (total sectors, contracts, value, avg risk)
 * Section 2: Sortable sector comparison table (primary)
 * Section 3: Charts gallery (collapsed in <details>)
 */

import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercentSafe } from '@/lib/utils'
import { sectorApi, analysisApi } from '@/api/client'
import { SECTOR_COLORS, SECTORS, getSectorNameEN } from '@/lib/constants'
import { Heatmap } from '@/components/charts/Heatmap'
import type { SectorStatistics } from '@/api/types'
import { BarChart3, Layers } from 'lucide-react'
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
// Main Component
// ============================================================================

export function Sectors() {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('total_value_mxn')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
          <p>Failed to load sectors</p>
          <p className="text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    )
  }

  const topSector = chartSectors[0]

  return (
    <div className="space-y-5">
      {/* Header */}
      <ScrollReveal direction="fade">
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          Sectors Overview
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          12 sectors covering Mexican federal procurement — click any column header to sort
        </p>
      </div>
      </ScrollReveal>

      {/* Section 1: Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <ScrollReveal delay={0} direction="up">
          <SharedStatCard
            label="SECTORS TRACKED"
            value={aggregates ? String(aggregates.sectorCount) : '—'}
            detail="Active government sectors"
            borderColor="border-accent/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={80} direction="up">
          <SharedStatCard
            label="TOTAL CONTRACTS"
            value={aggregates ? formatNumber(aggregates.totalContracts) : '—'}
            detail="All sectors, all years"
            borderColor="border-blue-500/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={160} direction="up">
          <SharedStatCard
            label="TOTAL VALUE"
            value={aggregates ? formatCompactMXN(aggregates.totalValue) : '—'}
            detail="Validated amounts only"
            borderColor="border-amber-500/30"
            loading={isLoading}
          />
        </ScrollReveal>
        <ScrollReveal delay={240} direction="up">
          <SharedStatCard
            label="AVG RISK SCORE"
            value={aggregates ? `${(aggregates.avgRisk * 100).toFixed(1)}%` : '—'}
            detail="Weighted by contract count"
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
                {formatNumber(patternCounts.counts.critical)} Critical Risk
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={60} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-mono font-medium text-amber-500">
                {formatNumber(patternCounts.counts.december_rush)} December Rush
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={120} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background-elevated/30 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              <span className="text-xs font-mono font-medium text-text-secondary">
                {formatNumber(patternCounts.counts.co_bidding)} Co-Bidding Flags
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={180} direction="up">
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background-elevated/30 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
              <span className="text-xs font-mono font-medium text-text-secondary">
                {formatNumber(patternCounts.counts.price_outliers)} Price Outliers
              </span>
            </div>
          </ScrollReveal>
        </div>
      )}

      {/* Section 2: Sortable Comparison Table */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-3.5 w-3.5 text-accent" />
            Sector Comparison
          </CardTitle>
          <CardDescription className="text-xs">
            Click column headers to sort. Click a sector name to view its full profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-xs" role="table">
              <thead>
                <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                  <th className="px-3 py-2.5 text-left font-medium">Sector</th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('total_contracts')}
                    aria-sort={sortField === 'total_contracts' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Total Contracts
                    <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('total_value_mxn')}
                    aria-sort={sortField === 'total_value_mxn' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Total Value (MXN)
                    <SortIndicator field="total_value_mxn" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('avg_risk_score')}
                    aria-sort={sortField === 'avg_risk_score' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Avg Risk Score
                    <SortIndicator field="avg_risk_score" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('high_risk_pct')}
                    aria-sort={sortField === 'high_risk_pct' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    High-Risk %
                    <SortIndicator field="high_risk_pct" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('direct_award_pct')}
                    aria-sort={sortField === 'direct_award_pct' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Direct Award %
                    <SortIndicator field="direct_award_pct" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap hidden lg:table-cell">
                    Top Ramo
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSectors.map((sector, i) => {
                  const color = SECTOR_COLORS[sector.sector_code] || '#64748b'
                  const topRamo = getTopRamo(sector.sector_code)
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
                        <div className="flex items-center gap-2">
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
                      <td className="px-3 py-2.5 text-text-muted font-mono hidden lg:table-cell">
                        {topRamo}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Charts (collapsed) */}
      <ScrollReveal direction="fade">
      <details className="mt-4 group">
        <summary className="flex items-center gap-2 cursor-pointer select-none list-none text-xs font-medium text-text-muted hover:text-text-primary transition-colors py-1">
          <Layers className="h-3.5 w-3.5" />
          Show charts (value by sector, risk heatmap)
          <span className="ml-1 group-open:hidden">▶</span>
          <span className="ml-1 hidden group-open:inline">▼</span>
        </summary>
        <div className="mt-4 space-y-5">
          {/* Contract Value by Sector */}
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

          {/* Sector Risk Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Sector Risk Heatmap
              </CardTitle>
              <CardDescription>
                Risk indicators by sector (color = relative ranking within each metric). Click a row to open that sector.
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
        </div>
      </details>
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
