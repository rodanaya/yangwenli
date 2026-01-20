import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { analysisApi, sectorApi, vendorApi } from '@/api/client'
import {
  FileText,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
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

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sector Distribution */}
        <Card>
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
              <SectorPieChart data={sectors?.data || []} />
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
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

      {/* Trends and Top Vendors Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Year-over-Year Trends */}
        <Card className="lg:col-span-2">
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
        <Card>
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
              <TopVendorsList data={topVendors?.data || []} />
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

function KPICard({ title, value, icon: Icon, loading, format = 'number', subtitle, variant = 'default' }: KPICardProps) {
  const formattedValue =
    value === undefined
      ? '-'
      : format === 'currency'
        ? formatCompactMXN(value)
        : format === 'percent'
          ? formatPercent(value)
          : formatNumber(value)

  return (
    <Card className={variant === 'warning' ? 'border-risk-high/30' : undefined}>
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
}

interface StatCardProps {
  title: string
  value?: number
  format: 'percent' | 'score'
  loading: boolean
  trend?: 'up' | 'down'
  description: string
}

function StatCard({ title, value, format, loading, trend, description }: StatCardProps) {
  const formattedValue =
    value === undefined ? '-' : format === 'percent' ? formatPercent(value) : (value * 100).toFixed(1)

  return (
    <Card>
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
                    {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
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
}

function SectorPieChart({ data }: { data: SectorStatistics[] }) {
  const chartData = data
    .filter((s) => s.total_value_mxn > 0)
    .sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    .slice(0, 8)
    .map((s) => ({
      name: s.sector_name,
      value: s.total_value_mxn,
      color: SECTOR_COLORS[s.sector_code] || '#64748b',
    }))

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
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
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
          <div key={item.name} className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-text-muted">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskBarChart({ data }: { data: RiskDistribution[] }) {
  const chartData = data.map((d) => ({
    level: d.risk_level.charAt(0).toUpperCase() + d.risk_level.slice(1),
    count: d.count,
    percentage: d.percentage,
    color: RISK_COLORS[d.risk_level as keyof typeof RISK_COLORS] || '#64748b',
  }))

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#a3a3a3', fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
          <YAxis type="category" dataKey="level" tick={{ fill: '#a3a3a3', fontSize: 12 }} width={60} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
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
}

function TrendsLineChart({ data }: { data: { year: number; value_mxn: number; contracts: number }[] }) {
  const chartData = data
    .filter((d) => d.year >= 2010)
    .map((d) => ({
      year: d.year,
      value: d.value_mxn / 1_000_000_000, // Convert to billions
      contracts: d.contracts,
    }))

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
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
                    <p className="font-medium">{data.year}</p>
                    <p className="text-sm text-text-muted">Value: {formatCompactMXN(data.value * 1_000_000_000)}</p>
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
}

function TopVendorsList({ data }: { data: VendorTopItem[] }) {
  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((vendor, index) => (
        <div key={vendor.vendor_id} className="flex items-center gap-3">
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
        </div>
      ))}
    </div>
  )
}
