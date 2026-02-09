import { memo, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { RiskBadge } from '@/components/ui/badge'
import { cn, formatCompactMXN, formatNumber, formatPercentSafe, formatCompactUSD } from '@/lib/utils'
import { analysisApi, vendorApi } from '@/api/client'

// Lazy load chart components for better initial load performance
const AlertPanel = lazy(() => import('@/components/charts').then(m => ({ default: m.AlertPanel })))
const ProcedureBreakdown = lazy(() => import('@/components/charts').then(m => ({ default: m.ProcedureBreakdown })))
const Heatmap = lazy(() => import('@/components/charts').then(m => ({ default: m.Heatmap })))
import {
  FileText,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Layers,
  Crosshair,
  Radar,
  ArrowRight,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
  ComposedChart,
} from 'recharts'
import { SECTOR_COLORS, RISK_COLORS, getSectorNameEN } from '@/lib/constants'
import type { SectorStatistics, VendorTopItem, RiskDistribution } from '@/api/types'

export function Dashboard() {
  const navigate = useNavigate()

  // Fetch all dashboard data in ONE request (pre-computed, <100ms)
  const { data: fastDashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // Transform fast dashboard data into expected formats
  const overview = fastDashboard?.overview as any
  const overviewLoading = dashboardLoading

  const sectors = fastDashboard ? {
    data: fastDashboard.sectors.map((s: any) => {
      const total = s.total_contracts || 1
      return {
        sector_id: s.id,
        sector_code: s.code,
        sector_name: s.name,
        total_contracts: s.total_contracts,
        total_value_mxn: s.total_value_mxn,
        total_vendors: s.total_vendors,
        avg_risk_score: s.avg_risk_score || 0,
        low_risk_count: s.low_risk_count,
        medium_risk_count: s.medium_risk_count,
        high_risk_count: s.high_risk_count,
        critical_risk_count: s.critical_risk_count,
        direct_award_count: s.direct_award_count,
        single_bid_count: s.single_bid_count,
        direct_award_pct: (s.direct_award_count || 0) / total,
        single_bid_pct: (s.single_bid_count || 0) / total,
        high_risk_pct: ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / total,
        color: '',
        total_institutions: 0,
        avg_contract_value: s.total_value_mxn / total,
      }
    }),
    total_contracts: (fastDashboard.overview as any)?.total_contracts || 0,
    total_value_mxn: (fastDashboard.overview as any)?.total_value_mxn || 0,
  } : undefined
  const sectorsLoading = dashboardLoading

  // Fetch top vendors separately (not in precomputed stats)
  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value'],
    queryFn: () => vendorApi.getTop('value', 10),
    staleTime: 5 * 60 * 1000,
  })

  const riskDist = fastDashboard ? {
    data: fastDashboard.risk_distribution as unknown as RiskDistribution[]
  } : undefined
  const riskLoading = dashboardLoading

  const trends = fastDashboard ? {
    data: fastDashboard.yearly_trends as Array<{ year: number; value_mxn: number; contracts: number }>
  } : undefined
  const trendsLoading = dashboardLoading

  // Fetch anomalies
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['analysis', 'anomalies'],
    queryFn: () => analysisApi.getAnomalies(),
    staleTime: 5 * 60 * 1000,
  })

  // Transform trends data for contracts + value chart (real per-year data)
  const yearlyTrendsData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        contracts: d.contracts,
        valueBillions: d.value_mxn / 1_000_000_000,
        value_mxn: d.value_mxn,
      }))
  }, [trends])

  // Transform sectors data for procedure breakdown
  const procedureData = useMemo(() => {
    if (!sectors?.data) return []
    return sectors.data.map((s) => {
      const directPct = s.direct_award_pct || 0
      const singlePct = s.single_bid_pct || 0
      return {
        sector_name: getSectorNameEN(s.sector_code),
        sector_code: s.sector_code,
        direct_award_pct: directPct,
        single_bid_pct: singlePct,
        open_tender_pct: Math.max(0, 1 - directPct - singlePct),
      }
    })
  }, [sectors])

  // Transform sectors data for heatmap
  const heatmapData = useMemo(() => {
    if (!sectors?.data) return { data: [], rows: [], columns: [] }
    const metrics = ['Direct Award %', 'Single Bid %', 'Avg Risk Score']
    const rows = sectors.data.slice(0, 10).map((s) => getSectorNameEN(s.sector_code))

    const daValues = sectors.data.map((s) => s.direct_award_pct)
    const sbValues = sectors.data.map((s) => s.single_bid_pct)
    const riskValues = sectors.data.map((s) => s.avg_risk_score)

    const ranges = {
      'Direct Award %': { min: Math.min(...daValues), max: Math.max(...daValues) },
      'Single Bid %': { min: Math.min(...sbValues), max: Math.max(...sbValues) },
      'Avg Risk Score': { min: Math.min(...riskValues), max: Math.max(...riskValues) },
    }

    const normalize = (value: number, metric: string) => {
      const range = ranges[metric as keyof typeof ranges]
      if (range.max === range.min) return 0.5
      return (value - range.min) / (range.max - range.min)
    }

    const sectorsSubset = sectors.data.slice(0, 10)
    const data = sectorsSubset.flatMap((s) => {
      const sectorNameEN = getSectorNameEN(s.sector_code)
      return [
        { row: sectorNameEN, col: 'Direct Award %', value: normalize(s.direct_award_pct, 'Direct Award %'), rawValue: s.direct_award_pct },
        { row: sectorNameEN, col: 'Single Bid %', value: normalize(s.single_bid_pct, 'Single Bid %'), rawValue: s.single_bid_pct },
        { row: sectorNameEN, col: 'Avg Risk Score', value: normalize(s.avg_risk_score, 'Avg Risk Score'), rawValue: s.avg_risk_score },
      ]
    })
    return { data, rows, columns: metrics, ranges }
  }, [sectors])

  const handleVendorClick = (vendorId: number) => navigate(`/vendors/${vendorId}`)
  const handleSectorClick = (sectorCode: string) => {
    const sector = sectors?.data.find((s) => s.sector_code === sectorCode)
    if (sector) navigate(`/sectors/${sector.sector_id}`)
  }
  const handleInvestigateAnomaly = () => navigate('/analysis/risk')

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-5">
      {/* Command Center Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-accent" />
            Command Center
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time procurement intelligence overview
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-[var(--font-family-mono)]">
            <Activity className="h-3 w-3 text-signal-live" aria-hidden="true" />
            <span>SYNCED {lastUpdated.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* KPI Cards — Intelligence metrics (clickable) */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 stagger-animate">
        <KPICard
          title="TOTAL CONTRACTS"
          value={overview?.total_contracts}
          icon={FileText}
          loading={overviewLoading}
          subtitle={`${overview?.years_covered || 0} years of data`}
          onClick={() => navigate('/contracts')}
        />
        <KPICard
          title="TOTAL VALUE"
          value={overview?.total_value_mxn}
          icon={DollarSign}
          loading={overviewLoading}
          format="currency"
          subtitle={overview?.total_value_mxn ? `~${formatCompactUSD(overview.total_value_mxn)}` : 'Mexican Pesos (MXN)'}
          onClick={() => navigate('/contracts?sort_by=amount_mxn&sort_order=desc')}
        />
        <KPICard
          title="ACTIVE VENDORS"
          value={overview?.total_vendors}
          icon={Users}
          loading={overviewLoading}
          subtitle="Unique suppliers"
          onClick={() => navigate('/vendors')}
        />
        <KPICard
          title="HIGH RISK"
          value={overview?.high_risk_pct}
          icon={AlertTriangle}
          loading={overviewLoading}
          format="percent"
          subtitle={`${formatNumber(overview?.high_risk_contracts || 0)} flagged`}
          variant="warning"
          onClick={() => navigate('/contracts?risk_level=critical')}
        />
      </div>

      {/* Quick Investigation Links */}
      <div className="grid gap-2 md:grid-cols-4">
        {[
          { label: 'Detective Patterns', icon: Crosshair, path: '/analysis/detective', desc: 'Investigate fraud patterns' },
          { label: 'Network Graph', icon: Radar, path: '/network', desc: 'Vendor relationship map' },
          { label: 'Price Analysis', icon: DollarSign, path: '/analysis/price', desc: 'Outlier detection' },
          { label: 'Timeline', icon: Activity, path: '/timeline', desc: 'Temporal patterns' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/50 bg-surface-card/50 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <item.icon className="h-3.5 w-3.5 text-text-muted group-hover:text-accent shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary">{item.label}</p>
              <p className="text-[10px] text-text-muted">{item.desc}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-text-muted/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Row 1: Sector Distribution & Risk Distribution */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5 text-accent" />
              Value by Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <ChartSkeleton height={250} type="pie" />
            ) : (
              <SectorPieChart data={sectors?.data || []} onSectorClick={handleSectorClick} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radar className="h-3.5 w-3.5 text-accent" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <ChartSkeleton height={250} type="bar" />
            ) : (
              <RiskBarChart data={riskDist?.data || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Risk Trends & Anomalies */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-3.5 w-3.5 text-accent" />
              Yearly Procurement Activity
            </CardTitle>
            <p className="text-[10px] text-text-muted mt-0.5">
              Contract count and total value per year
            </p>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton height={280} type="area" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <YAxis
                      yAxisId="contracts"
                      orientation="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => formatNumber(v)}
                      label={{ value: 'Contracts', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="value"
                      orientation="right"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => `${v.toFixed(0)}B`}
                      label={{ value: 'Value (B MXN)', angle: 90, position: 'insideRight', fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs">{data.year}</p>
                              <p className="text-[11px] text-text-muted tabular-nums">
                                Contracts: {formatNumber(data.contracts)}
                              </p>
                              <p className="text-[11px] text-text-muted tabular-nums">
                                Value: {formatCompactMXN(data.value_mxn)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar yAxisId="contracts" dataKey="contracts" fill="var(--color-accent)" opacity={0.5} radius={[2, 2, 0, 0]} />
                    <Line yAxisId="value" type="monotone" dataKey="valueBillions" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {anomaliesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <Suspense fallback={<div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}>
                <AlertPanel anomalies={anomalies?.data || []} maxItems={4} onInvestigate={handleInvestigateAnomaly} />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Procedure Breakdown & Sector Heatmap */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Competition by Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <ChartSkeleton height={320} type="bar" />
            ) : (
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <ProcedureBreakdown data={procedureData} height={320} onSectorClick={handleSectorClick} />
              </Suspense>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Sector Risk Matrix
            </CardTitle>
            <p className="text-[10px] text-text-muted mt-0.5">
              Relative ranking within each metric
            </p>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <ChartSkeleton height={320} type="bar" />
            ) : (
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <Heatmap
                  data={heatmapData.data}
                  rows={heatmapData.rows}
                  columns={heatmapData.columns}
                  height={320}
                  valueFormatter={(v, row, col) => {
                    const cell = heatmapData.data.find((d) => d.row === row && d.col === col)
                    const rawValue = cell && 'rawValue' in cell && typeof cell.rawValue === 'number' ? cell.rawValue : v
                    if (col === 'Avg Risk Score') return (rawValue * 100).toFixed(1)
                    return `${(rawValue * 100).toFixed(1)}%`
                  }}
                />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Trends and Top Vendors */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              Contract Value Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton height={250} type="line" />
            ) : (
              <TrendsLineChart data={trends?.data || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-accent" />
              Top Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : (
              <TopVendorsList data={topVendors?.data || []} onVendorClick={handleVendorClick} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="Direct Awards"
          value={overview?.direct_award_pct}
          format="percent"
          loading={overviewLoading}
          trend={overview?.direct_award_pct && overview.direct_award_pct > 0.5 ? 'up' : 'down'}
          description="of all procedures"
        />
        <StatCard
          title="Single Bid"
          value={overview?.single_bid_pct}
          format="percent"
          loading={overviewLoading}
          trend={overview?.single_bid_pct && overview.single_bid_pct > 0.3 ? 'up' : 'down'}
          description="competitive procedures"
        />
        <StatCard
          title="Avg Risk Score"
          value={overview?.avg_risk_score}
          format="score"
          loading={overviewLoading}
          trend={overview?.avg_risk_score && overview.avg_risk_score > 0.3 ? 'up' : 'down'}
          description="across all contracts"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface KPICardProps {
  title: string
  value?: number
  icon: React.ElementType
  loading: boolean
  format?: 'number' | 'currency' | 'percent'
  subtitle?: string
  variant?: 'default' | 'warning'
  trend?: number
  trendLabel?: string
  onClick?: () => void
}

const KPICard = memo(function KPICard({
  title,
  value,
  icon: Icon,
  loading,
  format = 'number',
  subtitle,
  variant = 'default',
  trend,
  trendLabel,
  onClick,
}: KPICardProps) {
  const formattedValue = useMemo(
    () =>
      value === undefined
        ? '-'
        : format === 'currency'
          ? formatCompactMXN(value)
          : format === 'percent'
            ? formatPercentSafe(value, false)
            : formatNumber(value),
    [value, format]
  )

  const trendColor = trend !== undefined
    ? trend > 0
      ? variant === 'warning' ? 'text-risk-high' : 'text-risk-low'
      : variant === 'warning' ? 'text-risk-low' : 'text-risk-high'
    : ''

  return (
    <Card
      className={cn(
        variant === 'warning' ? 'border-risk-high/20' : '',
        onClick && 'cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group/kpi'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${title}: ${loading ? 'Loading' : formattedValue}` : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted font-[var(--font-family-mono)]">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tabular-nums text-text-primary tracking-tight">{formattedValue}</p>
                {trend !== undefined && (
                  <span
                    className={`flex items-center text-[10px] font-semibold ${trendColor}`}
                    aria-label={trendLabel || `${trend > 0 ? 'Up' : 'Down'} ${Math.abs(trend).toFixed(1)}%`}
                  >
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </span>
                )}
              </div>
            )}
            {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              variant === 'warning'
                ? 'bg-risk-high/10 text-risk-high'
                : 'bg-accent/10 text-accent'
            }`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            {onClick && (
              <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 -translate-x-1 group-hover/kpi:opacity-100 group-hover/kpi:translate-x-0 transition-all duration-200" aria-hidden="true" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

interface StatCardProps {
  title: string
  value?: number
  format: 'percent' | 'score'
  loading: boolean
  trend?: 'up' | 'down'
  description: string
}

const StatCard = memo(function StatCard({
  title,
  value,
  format,
  loading,
  trend,
  description,
}: StatCardProps) {
  const formattedValue = useMemo(
    () =>
      value === undefined ? '-' : format === 'percent' ? formatPercentSafe(value, false) : (value * 100).toFixed(1),
    [value, format]
  )

  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted font-[var(--font-family-mono)]">{title}</p>
            {loading ? (
              <Skeleton className="h-5 w-14 mt-1" />
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold tabular-nums">{formattedValue}</span>
                {trend && (
                  <span className={trend === 'up' ? 'text-risk-high' : 'text-risk-low'}>
                    {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </span>
                )}
              </div>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

const SectorPieChart = memo(function SectorPieChart({
  data,
  onSectorClick,
}: {
  data: SectorStatistics[]
  onSectorClick?: (code: string) => void
}) {
  const chartData = useMemo(
    () =>
      data
        .filter((s) => s.total_value_mxn > 0)
        .sort((a, b) => b.total_value_mxn - a.total_value_mxn)
        .slice(0, 12)
        .map((s) => ({
          name: getSectorNameEN(s.sector_code),
          code: s.sector_code,
          value: s.total_value_mxn,
          color: SECTOR_COLORS[s.sector_code] || '#64748b',
        })),
    [data]
  )

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            onClick={(_, index) => onSectorClick?.(chartData[index].code)}
            style={{ cursor: 'pointer' }}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{data.name}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">{formatCompactMXN(data.value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {chartData.slice(0, 6).map((item) => (
          <button
            key={item.name}
            className="flex items-center gap-1 text-[10px] interactive rounded px-1 py-0.5"
            onClick={() => onSectorClick?.(item.code)}
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-text-muted">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
})

const RiskBarChart = memo(function RiskBarChart({ data }: { data: RiskDistribution[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        level: d.risk_level.charAt(0).toUpperCase() + d.risk_level.slice(1),
        count: d.count,
        percentage: d.percentage,
        color: RISK_COLORS[d.risk_level as keyof typeof RISK_COLORS] || '#64748b',
      })),
    [data]
  )

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} opacity={0.3} />
          <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
          <YAxis type="category" dataKey="level" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={55} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{data.level}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {formatNumber(data.count)} ({formatPercentSafe(data.percentage, false)})
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

const TrendsLineChart = memo(function TrendsLineChart({
  data,
}: {
  data: { year: number; value_mxn: number; contracts: number }[]
}) {
  const chartData = useMemo(
    () =>
      data
        .filter((d) => d.year >= 2010)
        .map((d) => ({
          year: d.year,
          value: d.value_mxn / 1_000_000_000,
          contracts: d.contracts,
        })),
    [data]
  )

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={(v) => `${v}B`} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{data.year}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Value: {formatCompactMXN(data.value * 1_000_000_000)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">Contracts: {formatNumber(data.contracts)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

const TopVendorsList = memo(function TopVendorsList({
  data,
  onVendorClick,
}: {
  data: VendorTopItem[]
  onVendorClick?: (id: number) => void
}) {
  return (
    <div className="space-y-1">
      {data.slice(0, 5).map((vendor, index) => (
        <button
          key={vendor.vendor_id}
          className="flex items-center gap-2.5 w-full text-left interactive rounded-md p-2 -mx-1"
          onClick={() => onVendorClick?.(vendor.vendor_id)}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-text-muted bg-background-elevated font-[var(--font-family-mono)]">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{vendor.vendor_name}</p>
            <p className="text-[10px] text-text-muted tabular-nums">{formatNumber(vendor.total_contracts)} contracts</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</p>
            {vendor.avg_risk_score !== undefined && vendor.avg_risk_score !== null && (
              <RiskBadge score={vendor.avg_risk_score} className="text-[9px]" />
            )}
          </div>
        </button>
      ))}
    </div>
  )
})

export default Dashboard
