import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe, toTitleCase } from '@/lib/utils'
import { sectorApi, vendorApi } from '@/api/client'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import {
  BarChart3,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  AreaChart,
  Area,
} from '@/components/charts'

export function SectorProfile() {
  const { id } = useParams<{ id: string }>()
  const sectorId = Number(id)

  // Fetch sector details
  const { data: sector, isLoading: sectorLoading, error: sectorError } = useQuery({
    queryKey: ['sector', sectorId],
    queryFn: () => sectorApi.getById(sectorId),
    enabled: !!sectorId,
  })

  // Fetch risk distribution
  const { data: riskDist, isLoading: riskLoading } = useQuery({
    queryKey: ['sector', sectorId, 'risk-distribution'],
    queryFn: () => sectorApi.getRiskDistribution(sectorId),
    enabled: !!sectorId,
  })

  // Fetch top vendors in this sector
  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', { sector_affinity: sectorId }],
    queryFn: () => vendorApi.getTop('value', 10, { sector_affinity: sectorId }),
    enabled: !!sectorId,
  })

  if (sectorLoading) {
    return <SectorProfileSkeleton />
  }

  if (sectorError || !sector) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Sector Not Found</h2>
        <p className="text-text-muted mb-4">The requested sector could not be found.</p>
        <Link to="/sectors">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sectors
          </Button>
        </Link>
      </div>
    )
  }

  const sectorColor = SECTOR_COLORS[sector.code] || sector.color || '#64748b'
  const stats = sector.statistics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/sectors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${sectorColor}20`, color: sectorColor }}
            >
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight capitalize">{sector.name}</h1>
              <p className="text-xs text-text-muted mt-0.5">
                Sector code: {sector.code}
              </p>
            </div>
          </div>
        </div>
        {stats && <RiskBadge score={stats.avg_risk_score} className="text-base px-3 py-1" />}
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Contracts"
          value={stats?.total_contracts}
          icon={FileText}
          color={sectorColor}
        />
        <KPICard
          title="Total Value"
          value={stats?.total_value_mxn}
          icon={DollarSign}
          format="currency"
          color={sectorColor}
        />
        <KPICard
          title="Active Vendors"
          value={stats?.total_vendors}
          icon={Users}
          color={sectorColor}
        />
        <KPICard
          title="Institutions"
          value={stats?.total_institutions}
          icon={Building2}
          color={sectorColor}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Stats */}
        <div className="space-y-6">
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
                <Skeleton className="h-48" />
              ) : riskDist?.data ? (
                <RiskDistributionChart data={riskDist.data} />
              ) : null}
            </CardContent>
          </Card>

          {/* Procurement Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Procurement Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Direct Awards" value={formatPercentSafe(stats?.direct_award_pct, false) || '-'} />
              <StatRow label="Single Bids" value={formatPercentSafe(stats?.single_bid_pct, false) || '-'} />
              <StatRow label="Avg Risk Score" value={formatPercentSafe(stats?.avg_risk_score, true) || '-'} />
              <StatRow label="High Risk Count" value={formatNumber((stats?.high_risk_count || 0) + (stats?.critical_risk_count || 0))} />
            </CardContent>
          </Card>

          {/* Risk Level Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Risk Level Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskBreakdown
                low={stats?.low_risk_count || 0}
                medium={stats?.medium_risk_count || 0}
                high={stats?.high_risk_count || 0}
                critical={stats?.critical_risk_count || 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Value Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Contract Value Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sector.trends?.length ? (
                <TrendsChart data={sector.trends} color={sectorColor} />
              ) : (
                <p className="text-sm text-text-muted">No trend data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Vendors in Sector
              </CardTitle>
              <Link to={`/vendors?sector_id=${sectorId}`}>
                <Button variant="ghost" size="sm">
                  View all
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : topVendors?.data ? (
                <TopVendorsList data={topVendors.data} />
              ) : null}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Explore This Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Link to={`/contracts?sector_id=${sectorId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    View Contracts
                  </Button>
                </Link>
                <Link to={`/vendors?sector_id=${sectorId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    View Vendors
                  </Button>
                </Link>
                <Link to={`/contracts?sector_id=${sectorId}&risk_level=high`}>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    High Risk Only
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
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
  format?: 'number' | 'currency' | 'percent'
  color?: string
}

function KPICard({ title, value, icon: Icon, format = 'number', color = '#3b82f6' }: KPICardProps) {
  const formattedValue =
    value === undefined
      ? '-'
      : format === 'currency'
        ? formatCompactMXN(value)
        : format === 'percent'
          ? formatPercentSafe(value, true)
          : formatNumber(value)

  const usdSubtitle = format === 'currency' && value !== undefined ? formatCompactUSD(value) : undefined

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">{formattedValue}</p>
            {usdSubtitle && <p className="text-xs text-text-muted tabular-nums">{usdSubtitle}</p>}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function RiskDistributionChart({ data }: { data: Array<{ risk_level: string; count: number; percentage: number }> }) {
  const chartData = data.map((d) => ({
    level: d.risk_level.charAt(0).toUpperCase() + d.risk_level.slice(1),
    count: d.count,
    percentage: d.percentage,
    color: RISK_COLORS[d.risk_level as keyof typeof RISK_COLORS] || '#64748b',
  }))

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
          <YAxis type="category" dataKey="level" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={60} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
                    <p className="font-medium">{data.level}</p>
                    <p className="text-sm text-text-muted">
                      {formatNumber(data.count)} ({formatPercentSafe(data.percentage, false)})
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

function RiskBreakdown({
  low,
  medium,
  high,
  critical,
}: {
  low: number
  medium: number
  high: number
  critical: number
}) {
  const total = low + medium + high + critical
  if (total === 0) return <p className="text-sm text-text-muted">No data available</p>

  const data = [
    { label: 'Low', count: low, color: RISK_COLORS.low },
    { label: 'Medium', count: medium, color: RISK_COLORS.medium },
    { label: 'High', count: high, color: RISK_COLORS.high },
    { label: 'Critical', count: critical, color: RISK_COLORS.critical },
  ]

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">{item.label}</span>
            <span>
              {formatNumber(item.count)} ({formatPercentSafe(item.count / total, true)})
            </span>
          </div>
          <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / total) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function TrendsChart({
  data,
  color,
}: {
  data: Array<{ year: number; total_value_mxn: number; total_contracts: number }>
  color: string
}) {
  const chartData = data
    .filter((d) => d.year >= 2010)
    .map((d) => ({
      year: d.year,
      value: d.total_value_mxn / 1_000_000_000, // Convert to billions
      contracts: d.total_contracts,
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={(v) => `${v}B`} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
                    <p className="font-medium">{data.year}</p>
                    <p className="text-sm text-text-muted">
                      Value: {formatCompactMXN(data.value * 1_000_000_000)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatCompactUSD(data.value * 1_000_000_000, data.year)}
                    </p>
                    <p className="text-sm text-text-muted">Contracts: {formatNumber(data.contracts)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`${color}30`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TopVendorsList({ data }: { data: any[] }) {
  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((vendor, index) => (
        <div key={vendor.vendor_id} className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background-elevated text-xs font-medium">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/vendors/${vendor.vendor_id}`}
              className="text-sm font-medium hover:text-accent transition-colors truncate block"
            >
              {toTitleCase(vendor.vendor_name)}
            </Link>
            <p className="text-xs text-text-muted">{formatNumber(vendor.total_contracts)} contracts</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</p>
            <p className="text-xs text-text-muted tabular-nums">{formatCompactUSD(vendor.total_value_mxn)}</p>
            {vendor.avg_risk_score !== undefined && vendor.avg_risk_score !== null && (
              <RiskBadge score={vendor.avg_risk_score} className="text-xs" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SectorProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}

export default SectorProfile
