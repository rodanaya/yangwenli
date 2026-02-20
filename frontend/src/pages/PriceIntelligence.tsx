import { memo, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHero, StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { SECTOR_COLORS, getSectorNameEN, RISK_COLORS } from '@/lib/constants'
import { analysisApi, contractApi, priceApi } from '@/api/client'
import type { SectorPriceBaseline, PriceHypothesisItem } from '@/api/client'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import {
  TrendingUp,
  BarChart3,
  ScatterChart,
  AlertTriangle,
  Target,
  Layers,
  Table2,
  FileSearch,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ComposedChart,
  Line,
  ScatterChart as RechartsScatterChart,
  Scatter,
  ZAxis,
  LabelList,
} from '@/components/charts'

const STALE_TIME = 10 * 60 * 1000

// ============================================================================
// Helper: format hypothesis type name
// ============================================================================

function formatTypeName(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Severity color for hypothesis types
const TYPE_COLORS: Record<string, string> = {
  extreme_overpricing: '#f87171',
  statistical_outlier: '#fb923c',
  vendor_price_anomaly: '#fbbf24',
  sector_price_anomaly: '#a78bfa',
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PriceIntelligence() {
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['contract-statistics'],
    queryFn: () => contractApi.getStatistics(),
    staleTime: STALE_TIME,
  })

  const { data: yoyData, isLoading: yoyLoading } = useQuery({
    queryKey: ['year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: STALE_TIME,
  })

  // ── New: Price hypotheses summary ──
  const { data: priceSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['price-hypotheses-summary'],
    queryFn: () => priceApi.getSummary(),
    staleTime: STALE_TIME,
  })

  // ── New: Sector price baselines ──
  const { data: baselines, isLoading: baselinesLoading } = useQuery({
    queryKey: ['price-baselines'],
    queryFn: () => priceApi.getBaselines(),
    staleTime: STALE_TIME,
  })

  // ── New: Top overpriced contracts ──
  const { data: topOverpriced, isLoading: overpricedLoading } = useQuery({
    queryKey: ['price-hypotheses', 'extreme_overpricing', 'top10'],
    queryFn: () => priceApi.getHypotheses({
      hypothesis_type: 'extreme_overpricing',
      sort_by: 'confidence',
      sort_order: 'desc',
      per_page: 10,
    }),
    staleTime: STALE_TIME,
  })

  // Compute price-flagged contract count from stats
  const priceFlaggedCount = useMemo(() => {
    if (!stats) return 0
    return (stats.high_risk_count || 0) + (stats.critical_risk_count || 0)
  }, [stats])

  // Yearly value trends for ComposedChart
  const yearlyValueData = useMemo(() => {
    if (!yoyData?.data) return []
    return yoyData.data
      .filter((d) => d.year >= 2005)
      .map((d) => ({
        year: d.year,
        totalValueBillions: (d.total_value || 0) / 1_000_000_000,
        totalValue: d.total_value || 0,
        avgValue: d.contracts > 0 ? (d.total_value || 0) / d.contracts : 0,
        avgValueMillions: d.contracts > 0 ? ((d.total_value || 0) / d.contracts) / 1_000_000 : 0,
        contracts: d.contracts,
        avgRisk: d.avg_risk,
      }))
  }, [yoyData])

  // Risk vs Value scatter data
  const scatterData = useMemo(() => {
    if (!yoyData?.data) return []
    return yoyData.data
      .filter((d) => d.year >= 2005 && d.contracts > 0)
      .map((d) => ({
        year: d.year,
        avgValue: d.contracts > 0 ? (d.total_value || 0) / d.contracts / 1_000_000 : 0,
        avgRisk: d.avg_risk,
        contracts: d.contracts,
      }))
  }, [yoyData])

  // Sector price comparison from fast dashboard
  const { data: fastDashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: STALE_TIME,
  })

  const sectorPriceData = useMemo(() => {
    if (!fastDashboard?.sectors) return []
    return fastDashboard.sectors
      .map((s: any) => {
        const totalContracts = s.total_contracts || 1
        const avgValue = (s.total_value_mxn || 0) / totalContracts
        return {
          name: getSectorNameEN(s.code),
          code: s.code,
          avgValue,
          totalValue: s.total_value_mxn || 0,
          contracts: s.total_contracts || 0,
          color: SECTOR_COLORS[s.code] || '#64748b',
        }
      })
      .sort((a: any, b: any) => b.avgValue - a.avgValue)
  }, [fastDashboard])

  // ── Derived: anomalies by type chart data ──
  const byTypeData = useMemo(() => {
    if (!priceSummary?.by_type) return []
    return priceSummary.by_type
      .sort((a, b) => b.count - a.count)
      .map((t) => ({
        name: formatTypeName(t.type),
        type: t.type,
        count: t.count,
        value: t.total_value,
        avgConfidence: t.avg_confidence,
        color: TYPE_COLORS[t.type] || '#94a3b8',
      }))
  }, [priceSummary])

  // ── Derived: anomalies by sector chart data ──
  const bySectorData = useMemo(() => {
    if (!priceSummary?.by_sector) return []
    return priceSummary.by_sector
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        name: getSectorNameEN(s.sector_name) || s.sector_name,
        sectorName: s.sector_name,
        count: s.count,
        value: s.total_value,
        color: SECTOR_COLORS[s.sector_name] || '#64748b',
      }))
  }, [priceSummary])

  // ── Derived: baselines sorted by median ──
  const sortedBaselines = useMemo(() => {
    if (!baselines) return []
    return [...baselines].sort((a, b) => b.percentile_50 - a.percentile_50)
  }, [baselines])

  return (
    <div className="space-y-5">
      {/* L0: Hero Header */}
      <PageHero
        trackingLabel="PRICE INTELLIGENCE"
        icon={<TrendingUp className="h-4 w-4 text-accent" />}
        headline={stats ? formatCompactMXN(stats.total_value_mxn || 0) : '—'}
        subtitle="Total procurement value under analysis"
        detail="Statistical analysis of contract pricing patterns, outlier detection, and sector benchmarks across 3.1M contracts. Amounts exceeding 100B MXN excluded as data errors."
        loading={statsLoading}
      />

      {/* L1: Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SharedStatCard
          loading={statsLoading}
          label="AVG CONTRACT"
          value={stats ? formatCompactMXN(stats.avg_contract_value || 0) : '—'}
          detail="Mean contract value"
          color="text-accent"
          borderColor="border-accent/30"
        />
        <SharedStatCard
          loading={statsLoading}
          label="MEDIAN CONTRACT"
          value={stats ? formatCompactMXN(stats.median_contract_value || 0) : '—'}
          detail="50th percentile value"
          color="text-text-primary"
          borderColor="border-text-muted/20"
        />
        <SharedStatCard
          loading={statsLoading}
          label="HIGH VALUE FLAGGED"
          value={formatNumber(priceFlaggedCount)}
          detail="High + critical risk contracts"
          color="text-risk-high"
          borderColor="border-risk-high/30"
        />
        <SharedStatCard
          loading={statsLoading}
          label="CONTRACTS"
          value={stats ? formatNumber(stats.total_contracts || 0) : '—'}
          detail="2002-2025"
          color="text-text-primary"
          borderColor="border-text-muted/20"
        />
      </div>

      {/* ── NEW: Section A — Price Anomaly Summary ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
            Price Anomaly Detection
          </CardTitle>
          <CardDescription>
            IQR-based statistical outlier detection across all contracts. Extreme overpricing
            = amount exceeds Q3 + 3x IQR; statistical outlier = exceeds Q3 + 1.5x IQR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <SharedStatCard
              loading={summaryLoading}
              label="TOTAL HYPOTHESES"
              value={priceSummary?.overall ? formatNumber(priceSummary.overall.total_hypotheses) : '—'}
              detail="Price anomalies detected"
              color="text-risk-high"
              borderColor="border-risk-high/30"
            />
            <SharedStatCard
              loading={summaryLoading}
              label="EXTREME OVERPRICING"
              value={byTypeData.find((t) => t.type === 'extreme_overpricing') ? formatNumber(byTypeData.find((t) => t.type === 'extreme_overpricing')!.count) : '—'}
              detail="> Q3 + 3x IQR"
              color="text-risk-critical"
              borderColor="border-risk-critical/30"
            />
            <SharedStatCard
              loading={summaryLoading}
              label="STATISTICAL OUTLIERS"
              value={byTypeData.find((t) => t.type === 'statistical_outlier') ? formatNumber(byTypeData.find((t) => t.type === 'statistical_outlier')!.count) : '—'}
              detail="> Q3 + 1.5x IQR"
              color="text-risk-medium"
              borderColor="border-risk-medium/30"
            />
            <SharedStatCard
              loading={summaryLoading}
              label="FLAGGED VALUE"
              value={priceSummary?.overall ? formatCompactMXN(priceSummary.overall.total_flagged_value) : '—'}
              detail="Total value of anomalies"
              color="text-accent"
              borderColor="border-accent/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── NEW: Section B — Anomalies by Type ── */}
      {byTypeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-3.5 w-3.5 text-accent" />
              Anomalies by Type
            </CardTitle>
            <CardDescription>
              Distribution of price anomaly hypotheses by detection method. Color intensity reflects severity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <ChartSkeleton height={200} type="bar" />
            ) : (
              <AnomalyByTypeChart data={byTypeData} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── NEW: Section C — Anomalies by Sector ── */}
      {bySectorData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Anomalies by Sector
            </CardTitle>
            <CardDescription>
              Which sectors have the most price anomalies. Sector colors match the platform palette.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <ChartSkeleton height={380} type="bar" />
            ) : (
              <AnomalyBySectorChart data={bySectorData} />
            )}
          </CardContent>
        </Card>
      )}

      {/* L2: Price Distribution by Sector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-3.5 w-3.5 text-accent" />
            Average Contract Value by Sector
          </CardTitle>
          <CardDescription>
            Mean contract value per sector, sorted by highest average. Reflects sector-specific
            procurement scale and pricing norms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <ChartSkeleton height={380} type="bar" />
          ) : (
            <SectorPriceChart data={sectorPriceData} />
          )}
        </CardContent>
      </Card>

      {/* ── NEW: Section D — Sector Price Baselines ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Table2 className="h-3.5 w-3.5 text-accent" />
            Sector Price Baselines
          </CardTitle>
          <CardDescription>
            Statistical distribution of contract values per sector. Shows percentile thresholds
            (p10 to p95) and the IQR upper fence used for outlier detection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {baselinesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : sortedBaselines.length > 0 ? (
            <BaselineTable data={sortedBaselines} />
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No baseline data available</p>
          )}
        </CardContent>
      </Card>

      {/* L3: Value Trends Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              Value Trends Over Time
            </CardTitle>
            <span className="text-xs text-text-muted font-mono">
              2005-2025
            </span>
          </div>
          <CardDescription>
            Annual total procurement value (bars) and average contract size (line). Spikes may
            indicate policy changes, emergency spending, or large infrastructure programs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yoyLoading ? (
            <ChartSkeleton height={320} type="bar" />
          ) : (
            <ValueTrendChart data={yearlyValueData} />
          )}
        </CardContent>
      </Card>

      {/* ── NEW: Section E — Top Overpriced Contracts ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileSearch className="h-3.5 w-3.5 text-risk-high" />
            Top Extreme Overpricing Cases
          </CardTitle>
          <CardDescription>
            Highest-confidence extreme overpricing hypotheses. Click a contract to inspect details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overpricedLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topOverpriced?.data && topOverpriced.data.length > 0 ? (
            <OverpricedTable
              data={topOverpriced.data}
              baselines={baselines || []}
              onContractClick={(id) => setSelectedContractId(id)}
            />
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No overpricing hypotheses available</p>
          )}
        </CardContent>
      </Card>

      {/* L4: Risk vs Value Scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScatterChart className="h-3.5 w-3.5 text-accent" />
            Risk vs. Value Correlation
          </CardTitle>
          <CardDescription>
            Each point represents one year. X-axis shows average contract value, Y-axis shows
            average risk score. Dot size reflects total contracts that year. Reveals whether
            higher-value years correlate with higher risk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yoyLoading ? (
            <ChartSkeleton height={360} type="line" />
          ) : (
            <RiskValueScatter data={scatterData} />
          )}
        </CardContent>
      </Card>

      {/* Contract detail modal */}
      <ContractDetailModal
        contractId={selectedContractId}
        open={selectedContractId !== null}
        onOpenChange={(open) => { if (!open) setSelectedContractId(null) }}
      />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

// -- NEW: Anomaly By Type Horizontal Bar --

const AnomalyByTypeChart = memo(function AnomalyByTypeChart({
  data,
}: {
  data: Array<{
    name: string
    type: string
    count: number
    value: number
    avgConfidence: number
    color: string
  }>
}) {
  const height = Math.max(160, data.length * 50)
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            horizontal={false}
            opacity={0.3}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(v) => formatNumber(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={140}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatNumber(d.count)} hypotheses
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Value: {formatCompactMXN(d.value)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Avg confidence: {(d.avgConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// -- NEW: Anomaly By Sector Horizontal Bar --

const AnomalyBySectorChart = memo(function AnomalyBySectorChart({
  data,
}: {
  data: Array<{
    name: string
    sectorName: string
    count: number
    value: number
    color: string
  }>
}) {
  const height = Math.max(300, data.length * 35)
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            horizontal={false}
            opacity={0.3}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(v) => formatNumber(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={90}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatNumber(d.count)} anomalies
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Value: {formatCompactMXN(d.value)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// -- NEW: Baseline Table --

const BaselineTable = memo(function BaselineTable({
  data,
}: {
  data: SectorPriceBaseline[]
}) {
  // Find the max upper_fence for scaling the visual bars
  const maxFence = useMemo(() => Math.max(...data.map((d) => d.upper_fence || 0), 1), [data])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Sector</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P10</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P25</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted font-bold">Median</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P75</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P90</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P95</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Upper Fence</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Contracts</th>
            <th className="px-3 py-2.5 text-xs font-medium text-text-muted w-32">Range</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const sectorCode = row.sector_name
            const color = SECTOR_COLORS[sectorCode] || '#64748b'
            const barWidth = maxFence > 0 ? (row.upper_fence / maxFence) * 100 : 0
            const medianPos = maxFence > 0 ? (row.percentile_50 / maxFence) * 100 : 0

            return (
              <tr key={row.sector_id} className="border-b border-border/50 hover:bg-surface-hover/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-medium text-text-primary">
                      {getSectorNameEN(sectorCode)}
                    </span>
                  </div>
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_10)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_25)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums font-bold text-text-primary">
                  {formatCompactMXN(row.percentile_50)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_75)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_90)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_95)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-risk-high font-medium">
                  {formatCompactMXN(row.upper_fence)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatNumber(row.sample_count)}
                </td>
                <td className="px-3 py-2">
                  <div className="relative h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-30"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 rounded-full"
                      style={{ left: `${medianPos}%`, backgroundColor: color }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})

// -- NEW: Overpriced Contracts Mini Table --

const OverpricedTable = memo(function OverpricedTable({
  data,
  baselines,
  onContractClick,
}: {
  data: PriceHypothesisItem[]
  baselines: SectorPriceBaseline[]
  onContractClick: (id: number) => void
}) {
  // Build a lookup from sector_id to upper_fence
  const baselineMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const b of baselines) {
      if (b.upper_fence > 0) map.set(b.sector_id, b.upper_fence)
    }
    return map
  }, [baselines])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Contract</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Amount</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted" title="Contract amount divided by sector upper fence (Q3 + 1.5x IQR)">x Baseline</th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Type</th>
            <th className="text-center px-3 py-2.5 text-xs font-medium text-text-muted">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const fence = item.sector_id ? baselineMap.get(item.sector_id) : undefined
            const ratio = (item.amount_mxn && fence) ? item.amount_mxn / fence : null

            return (
              <tr
                key={item.id}
                className="border-b border-border/50 hover:bg-surface-hover/50 cursor-pointer"
                onClick={() => onContractClick(item.contract_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onContractClick(item.contract_id)
                  }
                }}
              >
                <td className="px-3 py-2">
                  <span className="text-accent hover:underline font-mono tabular-nums">
                    #{item.contract_id}
                  </span>
                </td>
                <td className="text-right px-3 py-2 tabular-nums font-medium text-text-primary">
                  {item.amount_mxn ? formatCompactMXN(item.amount_mxn) : '—'}
                </td>
                <td className="text-right px-3 py-2 tabular-nums font-medium" title="Contract amount / sector upper fence">
                  {ratio !== null ? (
                    <span className={ratio > 3.0 ? 'text-risk-critical' : ratio > 1.5 ? 'text-risk-medium' : 'text-text-muted'}>
                      {ratio.toFixed(1)}x
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {formatTypeName(item.hypothesis_type)}
                </td>
                <td className="text-center px-3 py-2">
                  <RiskBadge level={
                    item.confidence >= 0.8 ? 'critical'
                      : item.confidence >= 0.6 ? 'high'
                        : item.confidence >= 0.4 ? 'medium'
                          : 'low'
                  }>
                    {(item.confidence * 100).toFixed(0)}%
                  </RiskBadge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})

// -- Sector Price Horizontal Bar Chart --

const SectorPriceChart = memo(function SectorPriceChart({
  data,
}: {
  data: Array<{
    name: string
    code: string
    avgValue: number
    totalValue: number
    contracts: number
    color: string
  }>
}) {
  return (
    <div className="h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            horizontal={false}
            opacity={0.3}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(v) => {
              if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
              if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
              if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
              return String(v)
            }}
            domain={[0, 'auto']}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={90}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Avg: {formatCompactMXN(d.avgValue)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Total: {formatCompactMXN(d.totalValue)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatNumber(d.contracts)} contracts
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="avgValue" radius={[0, 3, 3, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// -- Value Trend ComposedChart --

const ValueTrendChart = memo(function ValueTrendChart({
  data,
}: {
  data: Array<{
    year: number
    totalValueBillions: number
    totalValue: number
    avgValue: number
    avgValueMillions: number
    contracts: number
  }>
}) {
  // Find the year with the highest total value for highlighting
  const maxYear = useMemo(() => {
    if (data.length === 0) return null
    return data.reduce((max, d) => (d.totalValueBillions > max.totalValueBillions ? d : max), data[0])
  }, [data])

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.3}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="total"
            orientation="left"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(0)}B`}
            label={{
              value: 'Total (B MXN)',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--color-text-muted)',
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="avg"
            orientation="right"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(1)}M`}
            label={{
              value: 'Avg (M MXN)',
              angle: 90,
              position: 'insideRight',
              fill: 'var(--color-text-muted)',
              fontSize: 10,
            }}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.year}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Total: {formatCompactMXN(d.totalValue)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Avg contract: {formatCompactMXN(d.avgValue)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatNumber(d.contracts)} contracts
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            yAxisId="total"
            dataKey="totalValueBillions"
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  maxYear && entry.year === maxYear.year
                    ? '#58a6ff'
                    : 'var(--color-accent)'
                }
                fillOpacity={
                  maxYear && entry.year === maxYear.year ? 0.8 : 0.35
                }
              />
            ))}
          </Bar>
          <Line
            yAxisId="avg"
            type="monotone"
            dataKey="avgValueMillions"
            stroke="#58a6ff"
            strokeWidth={2}
            dot={{ r: 2, fill: '#58a6ff', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#58a6ff', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-accent/40" />
          <span className="text-xs text-text-muted">Total value (B MXN)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-accent rounded-full" />
          <span className="text-xs text-text-muted">Avg contract (M MXN)</span>
        </div>
      </div>
    </div>
  )
})

// -- Risk vs Value Scatter --

const RiskValueScatter = memo(function RiskValueScatter({
  data,
}: {
  data: Array<{
    year: number
    avgValue: number
    avgRisk: number
    contracts: number
  }>
}) {
  // Compute size range for ZAxis
  const minContracts = useMemo(
    () => Math.min(...data.map((d) => d.contracts)),
    [data]
  )
  const maxContracts = useMemo(
    () => Math.max(...data.map((d) => d.contracts)),
    [data]
  )

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.3}
          />
          <XAxis
            type="number"
            dataKey="avgValue"
            name="Avg Value"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(1)}M`}
            label={{
              value: 'Avg Contract Value (M MXN)',
              position: 'insideBottom',
              offset: -10,
              fill: 'var(--color-text-muted)',
              fontSize: 10,
            }}
          />
          <YAxis
            type="number"
            dataKey="avgRisk"
            name="Avg Risk"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            domain={['auto', 'auto']}
            label={{
              value: 'Avg Risk Score',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--color-text-muted)',
              fontSize: 10,
            }}
          />
          <ZAxis
            type="number"
            dataKey="contracts"
            range={[40, 250]}
            domain={[minContracts, maxContracts]}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.year}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Avg value: {formatCompactMXN(d.avgValue * 1_000_000)}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      Avg risk: {(d.avgRisk * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatNumber(d.contracts)} contracts
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter data={data} fill="#58a6ff" fillOpacity={0.45} stroke="#58a6ff" strokeWidth={1} strokeOpacity={0.8}>
            <LabelList
              dataKey="year"
              position="top"
              offset={8}
              style={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            />
          </Scatter>
        </RechartsScatterChart>
      </ResponsiveContainer>
      {/* Size legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="text-xs text-text-muted">Dot size = total contracts that year</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent/60" />
          <span className="text-xs text-text-muted tabular-nums">
            {formatNumber(minContracts)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full bg-accent/60" />
          <span className="text-xs text-text-muted tabular-nums">
            {formatNumber(maxContracts)}
          </span>
        </div>
      </div>
    </div>
  )
})
