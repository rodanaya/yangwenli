import { memo, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS, getSectorNameEN } from '@/lib/constants'
import { analysisApi, contractApi } from '@/api/client'
import type { YearOverYearChange, ContractStatistics } from '@/api/types'
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Activity,
  AlertTriangle,
  ScatterChart,
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
// Main Page Component
// ============================================================================

export default function PriceIntelligence() {
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

  const { data: riskOverview, isLoading: riskLoading } = useQuery({
    queryKey: ['risk-overview'],
    queryFn: () => analysisApi.getRiskOverview(),
    staleTime: STALE_TIME,
  })

  const isLoading = statsLoading || yoyLoading

  // Derive sector average values from year-over-year data
  const sectorAvgData = useMemo(() => {
    if (!riskOverview?.yearly_trends) return []
    // Use fast dashboard sectors if available via riskOverview, otherwise
    // compute from yearly trends. Since riskOverview doesn't have per-sector
    // data, we use the SECTORS array and the fast dashboard approach.
    // For now, compute from yoyData by year and show value trends.
    return []
  }, [riskOverview])

  // Compute price-flagged contract count from stats
  const priceFlaggedCount = useMemo(() => {
    if (!stats) return 0
    // Approximate: high_risk + critical_risk contracts as price-related flags
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

  return (
    <div className="space-y-5">
      {/* L0: Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          Price Intelligence
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Statistical analysis of contract pricing patterns, outlier detection, and sector benchmarks
        </p>
      </div>

      <SectionDescription>
        This page visualizes pricing patterns across 3.1M government contracts. Average values are
        computed per sector and year to reveal pricing anomalies, sector benchmarks, and the
        relationship between contract value and risk. Amounts exceeding 100B MXN are excluded as
        data errors per validation rules.
      </SectionDescription>

      {/* L1: Overview Stats */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="TOTAL VALUE"
          value={stats?.total_value_mxn}
          format="currency"
          icon={DollarSign}
          loading={statsLoading}
          subtitle="All contracts 2002-2025"
        />
        <StatCard
          title="AVERAGE CONTRACT"
          value={stats?.avg_contract_value}
          format="currency"
          icon={BarChart3}
          loading={statsLoading}
          subtitle="Mean contract value"
        />
        <StatCard
          title="MEDIAN CONTRACT"
          value={stats?.median_contract_value}
          format="currency"
          icon={Activity}
          loading={statsLoading}
          subtitle="50th percentile value"
        />
        <StatCard
          title="HIGH VALUE FLAGGED"
          value={priceFlaggedCount}
          format="number"
          icon={AlertTriangle}
          loading={statsLoading}
          subtitle="High + critical risk contracts"
          variant="warning"
        />
      </div>

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

      {/* L3: Value Trends Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              Value Trends Over Time
            </CardTitle>
            <span className="text-[10px] text-text-muted font-[var(--font-family-mono)]">
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
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

// -- Stat Card --

interface StatCardProps {
  title: string
  value?: number
  format?: 'number' | 'currency'
  icon: React.ElementType
  loading: boolean
  subtitle?: string
  variant?: 'default' | 'warning'
}

const StatCard = memo(function StatCard({
  title,
  value,
  format = 'number',
  icon: Icon,
  loading,
  subtitle,
  variant = 'default',
}: StatCardProps) {
  const formattedValue = useMemo(() => {
    if (value === undefined || value === null) return '-'
    if (format === 'currency') return formatCompactMXN(value)
    return formatNumber(value)
  }, [value, format])

  return (
    <Card
      className={cn(
        variant === 'warning' && 'border-risk-high/20'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted font-[var(--font-family-mono)]">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-text-primary tracking-tight">
                {formattedValue}
              </p>
            )}
            {subtitle && (
              <p className="text-[11px] text-text-muted">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              variant === 'warning'
                ? 'bg-risk-high/10 text-risk-high'
                : 'bg-accent/10 text-accent'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
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
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Avg: {formatCompactMXN(d.avgValue)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Total: {formatCompactMXN(d.totalValue)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
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
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Total: {formatCompactMXN(d.totalValue)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Avg contract: {formatCompactMXN(d.avgValue)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
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
          <span className="text-[10px] text-text-muted">Total value (B MXN)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-accent rounded-full" />
          <span className="text-[10px] text-text-muted">Avg contract (M MXN)</span>
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
            range={[60, 400]}
            domain={[minContracts, maxContracts]}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.year}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Avg value: {formatCompactMXN(d.avgValue * 1_000_000)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Avg risk: {(d.avgRisk * 100).toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {formatNumber(d.contracts)} contracts
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter data={data} fill="#58a6ff" fillOpacity={0.6} stroke="#58a6ff" strokeOpacity={0.8}>
            <LabelList
              dataKey="year"
              position="top"
              offset={8}
              style={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
            />
          </Scatter>
        </RechartsScatterChart>
      </ResponsiveContainer>
      {/* Size legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="text-[10px] text-text-muted">Dot size = total contracts that year</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent/60" />
          <span className="text-[10px] text-text-muted tabular-nums">
            {formatNumber(minContracts)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full bg-accent/60" />
          <span className="text-[10px] text-text-muted tabular-nums">
            {formatNumber(maxContracts)}
          </span>
        </div>
      </div>
    </div>
  )
})
