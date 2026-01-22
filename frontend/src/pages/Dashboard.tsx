import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { analysisApi, sectorApi, vendorApi } from '@/api/client'
import { StackedAreaChart, AlertPanel, ProcedureBreakdown, Heatmap } from '@/components/charts'
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
} from 'recharts'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import type { SectorStatistics, VendorTopItem, RiskDistribution } from '@/api/types'

export function Dashboard() {
  const navigate = useNavigate()

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analysis', 'overview'],
    queryFn: () => analysisApi.getOverview(),
  })

  // Fetch sectors data
  const { data: sectors, isLoading: sectorsLoading } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => sectorApi.getAll(),
  })

  // Fetch top vendors
  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value'],
    queryFn: () => vendorApi.getTop('value', 10),
  })

  // Fetch risk distribution
  const { data: riskDist, isLoading: riskLoading } = useQuery({
    queryKey: ['analysis', 'risk-distribution'],
    queryFn: () => analysisApi.getRiskDistribution(),
  })

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
  })

  // Fetch anomalies
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['analysis', 'anomalies'],
    queryFn: () => analysisApi.getAnomalies(),
  })

  // Transform trends data for stacked area chart
  // Use actual risk distribution percentages instead of hardcoded estimates
  const riskTrendsData = useMemo(() => {
    if (!trends?.data || !riskDist?.data) return []

    // Calculate actual distribution percentages from riskDist data
    const totalCount = riskDist.data.reduce((sum, d) => sum + d.count, 0)
    const distribution = {
      low: riskDist.data.find((d) => d.risk_level === 'low')?.count || 0,
      medium: riskDist.data.find((d) => d.risk_level === 'medium')?.count || 0,
      high: riskDist.data.find((d) => d.risk_level === 'high')?.count || 0,
      critical: riskDist.data.find((d) => d.risk_level === 'critical')?.count || 0,
    }
    const pct = {
      low: totalCount > 0 ? distribution.low / totalCount : 0.796,
      medium: totalCount > 0 ? distribution.medium / totalCount : 0.203,
      high: totalCount > 0 ? distribution.high / totalCount : 0.0008,
      critical: totalCount > 0 ? distribution.critical / totalCount : 0,
    }

    return trends.data
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        low: Math.round(d.contracts * pct.low),
        medium: Math.round(d.contracts * pct.medium),
        high: Math.round(d.contracts * pct.high),
        critical: Math.round(d.contracts * pct.critical),
      }))
  }, [trends, riskDist])

  // Transform sectors data for procedure breakdown
  const procedureData = useMemo(() => {
    if (!sectors?.data) return []
    return sectors.data.map((s) => ({
      sector_name: s.sector_name,
      sector_code: s.sector_code,
      direct_award_pct: s.direct_award_pct,
      single_bid_pct: s.single_bid_pct,
      open_tender_pct: 1 - s.direct_award_pct - s.single_bid_pct,
    }))
  }, [sectors])

  // Transform sectors data for heatmap
  // IMPORTANT: Normalize each metric to 0-1 scale for comparable color coding
  const heatmapData = useMemo(() => {
    if (!sectors?.data) return { data: [], rows: [], columns: [] }
    const metrics = ['Direct Award %', 'Single Bid %', 'Avg Risk Score']
    const rows = sectors.data.slice(0, 10).map((s) => s.sector_name) // Limit to top 10 for readability

    // Calculate min/max for each metric to normalize colors
    const daValues = sectors.data.map((s) => s.direct_award_pct)
    const sbValues = sectors.data.map((s) => s.single_bid_pct)
    const riskValues = sectors.data.map((s) => s.avg_risk_score)

    const ranges = {
      'Direct Award %': { min: Math.min(...daValues), max: Math.max(...daValues) },
      'Single Bid %': { min: Math.min(...sbValues), max: Math.max(...sbValues) },
      'Avg Risk Score': { min: Math.min(...riskValues), max: Math.max(...riskValues) },
    }

    // Normalize values within each metric's range for color consistency
    const normalize = (value: number, metric: string) => {
      const range = ranges[metric as keyof typeof ranges]
      if (range.max === range.min) return 0.5
      return (value - range.min) / (range.max - range.min)
    }

    const sectorsSubset = sectors.data.slice(0, 10)
    const data = sectorsSubset.flatMap((s) => [
      {
        row: s.sector_name,
        col: 'Direct Award %',
        value: normalize(s.direct_award_pct, 'Direct Award %'),
        rawValue: s.direct_award_pct,
      },
      {
        row: s.sector_name,
        col: 'Single Bid %',
        value: normalize(s.single_bid_pct, 'Single Bid %'),
        rawValue: s.single_bid_pct,
      },
      {
        row: s.sector_name,
        col: 'Avg Risk Score',
        value: normalize(s.avg_risk_score, 'Avg Risk Score'),
        rawValue: s.avg_risk_score,
      },
    ])
    return { data, rows, columns: metrics, ranges }
  }, [sectors])

  const handleVendorClick = (vendorId: number) => {
    navigate(`/vendors/${vendorId}`)
  }

  const handleSectorClick = (sectorCode: string) => {
    const sector = sectors?.data.find((s) => s.sector_code === sectorCode)
    if (sector) {
      navigate(`/sectors/${sector.sector_id}`)
    }
  }

  const handleInvestigateAnomaly = () => {
    navigate('/analysis/risk')
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Contracts"
          value={overview?.total_contracts}
          icon={FileText}
          loading={overviewLoading}
          subtitle={`${overview?.years_covered || 0} years of data`}
        />
        <KPICard
          title="Total Value"
          value={overview?.total_value_mxn}
          icon={DollarSign}
          loading={overviewLoading}
          format="currency"
          subtitle="Mexican Pesos (MXN)"
        />
        <KPICard
          title="Active Vendors"
          value={overview?.total_vendors}
          icon={Users}
          loading={overviewLoading}
          subtitle="Unique suppliers"
        />
        <KPICard
          title="High Risk"
          value={overview?.high_risk_pct}
          icon={AlertTriangle}
          loading={overviewLoading}
          format="percent"
          subtitle={`${formatNumber(overview?.high_risk_contracts || 0)} contracts`}
          variant="warning"
        />
      </div>

      {/* Charts Row 1: Sector Distribution & Risk Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sector Distribution */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Value by Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <SectorPieChart
                data={sectors?.data || []}
                onSectorClick={(code) => handleSectorClick(code)}
              />
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <RiskBarChart data={riskDist?.data || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Risk Trends & Anomalies */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Risk Trend Timeline - NEW */}
        <Card className="lg:col-span-2 hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Risk Trend Over Time
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              Contract distribution by risk level (click year to view contracts)
            </p>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <StackedAreaChart
                data={riskTrendsData}
                height={280}
                showPercentage={true}
                onYearClick={(year) => navigate(`/contracts?year=${year}`)}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Anomalies Alert Panel - NEW */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-high" />
              Top Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {anomaliesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <AlertPanel
                anomalies={anomalies?.data || []}
                maxItems={4}
                onInvestigate={handleInvestigateAnomaly}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Procedure Breakdown & Sector Heatmap */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Procedure Type Breakdown - NEW */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Competition by Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <Skeleton className="h-[320px]" />
            ) : (
              <ProcedureBreakdown
                data={procedureData}
                height={320}
                onSectorClick={handleSectorClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Sector Risk Heatmap - NEW */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Sector Risk Matrix
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              Color intensity shows relative ranking within each metric (green=best, red=worst)
            </p>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <Skeleton className="h-[320px]" />
            ) : (
              <Heatmap
                data={heatmapData.data}
                rows={heatmapData.rows}
                columns={heatmapData.columns}
                height={320}
                valueFormatter={(v, row, col) => {
                  // Find the raw value for this cell
                  const cell = heatmapData.data.find((d) => d.row === row && d.col === col)
                  const rawValue = (cell as { rawValue?: number })?.rawValue ?? v
                  // Format based on metric type
                  if (col === 'Avg Risk Score') {
                    return (rawValue * 100).toFixed(1)
                  }
                  return formatPercent(rawValue)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 4: Trends and Top Vendors */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Year-over-Year Trends */}
        <Card className="lg:col-span-2 hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Contract Value Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <TrendsLineChart data={trends?.data || []} />
            )}
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Vendors by Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <TopVendorsList
                data={topVendors?.data || []}
                onVendorClick={handleVendorClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
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
}

const KPICard = memo(function KPICard({
  title,
  value,
  icon: Icon,
  loading,
  format = 'number',
  subtitle,
  variant = 'default',
}: KPICardProps) {
  const formattedValue = useMemo(
    () =>
      value === undefined
        ? '-'
        : format === 'currency'
          ? formatCompactMXN(value)
          : format === 'percent'
            ? formatPercent(value)
            : formatNumber(value),
    [value, format]
  )

  return (
    <Card className={`hover-lift ${variant === 'warning' ? 'border-risk-high/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-text-primary">{formattedValue}</p>
            )}
            {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              variant === 'warning' ? 'bg-risk-high/10 text-risk-high' : 'bg-accent/10 text-accent'
            }`}
          >
            <Icon className="h-5 w-5" />
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
      value === undefined ? '-' : format === 'percent' ? formatPercent(value) : (value * 100).toFixed(1),
    [value, format]
  )

  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">{title}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold tabular-nums">{formattedValue}</span>
                {trend && (
                  <span className={trend === 'up' ? 'text-risk-high' : 'text-risk-low'}>
                    {trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">{description}</p>
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
        .slice(0, 8)
        .map((s) => ({
          name: s.sector_name,
          code: s.sector_code,
          value: s.total_value_mxn,
          color: SECTOR_COLORS[s.sector_code] || '#64748b',
        })),
    [data]
  )

  const handleClick = (entry: { code: string }) => {
    if (onSectorClick) {
      onSectorClick(entry.code)
    }
  }

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
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            onClick={(_, index) => handleClick(chartData[index])}
            style={{ cursor: 'pointer' }}
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
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-text-muted">{formatCompactMXN(data.value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {chartData.slice(0, 4).map((item) => (
          <button
            key={item.name}
            className="flex items-center gap-1 text-xs interactive rounded px-1.5 py-0.5"
            onClick={() => onSectorClick?.(item.code)}
          >
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
            tickFormatter={(v) => formatNumber(v)}
          />
          <YAxis type="category" dataKey="level" tick={{ fill: '#a3a3a3', fontSize: 12 }} width={60} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium">{data.level}</p>
                    <p className="text-sm text-text-muted">
                      {formatNumber(data.count)} ({formatPercent(data.percentage / 100)})
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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
          value: d.value_mxn / 1_000_000_000, // Convert to billions
          contracts: d.contracts,
        })),
    [data]
  )

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
          <XAxis dataKey="year" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
          <YAxis tick={{ fill: '#a3a3a3', fontSize: 12 }} tickFormatter={(v) => `${v}B`} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium">{data.year}</p>
                    <p className="text-sm text-text-muted">
                      Value: {formatCompactMXN(data.value * 1_000_000_000)}
                    </p>
                    <p className="text-sm text-text-muted">Contracts: {formatNumber(data.contracts)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
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
    <div className="space-y-3">
      {data.slice(0, 5).map((vendor, index) => (
        <button
          key={vendor.vendor_id}
          className="flex items-center gap-3 w-full text-left interactive rounded-lg p-2 -m-2"
          onClick={() => onVendorClick?.(vendor.vendor_id)}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background-elevated text-xs font-medium">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{vendor.vendor_name}</p>
            <p className="text-xs text-text-muted">{formatNumber(vendor.total_contracts)} contracts</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</p>
            {vendor.avg_risk_score !== undefined && vendor.avg_risk_score !== null && (
              <RiskBadge score={vendor.avg_risk_score} className="text-[10px]" />
            )}
          </div>
        </button>
      ))}
    </div>
  )
})

export default Dashboard
