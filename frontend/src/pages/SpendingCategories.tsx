/**
 * Spending Categories Page
 *
 * Shows what Mexico buys — 72 regex-based spending categories covering
 * all 3.1M contracts (2002-2025), with risk analysis and trends.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { categoriesApi } from '@/api/client'
import { PageHero, StatCard as SharedStatCard } from '@/components/DashboardWidgets'
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
} from '@/components/charts'
import {
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'

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

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1f2e' : '#e2e8f0'
}

// =============================================================================
// Custom Treemap Content
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
// Tooltips
// =============================================================================

// =============================================================================
// Main Component
// =============================================================================

export default function SpendingCategories() {
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<'value' | 'risk' | 'contracts'>('value')

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['categories', 'trends'],
    queryFn: () => categoriesApi.getTrends(2015, 2025),
    staleTime: 5 * 60 * 1000,
  })

  const categories: CategoryStat[] = summaryData?.data ?? []

  // Derived stats
  const stats = useMemo(() => {
    if (!categories.length) return null
    const totalValue = categories.reduce((s, c) => s + c.total_value, 0)
    const totalContracts = categories.reduce((s, c) => s + c.total_contracts, 0)
    const avgRisk = totalContracts > 0
      ? categories.reduce((s, c) => s + c.avg_risk * c.total_contracts, 0) / totalContracts
      : 0
    const highRiskCategories = categories.filter(c => c.avg_risk >= 0.3).length
    return { totalValue, totalContracts, avgRisk, highRiskCategories }
  }, [categories])

  // Sorted categories
  const sortedCategories = useMemo(() => {
    const sorted = [...categories]
    if (sortBy === 'value') sorted.sort((a, b) => b.total_value - a.total_value)
    else if (sortBy === 'risk') sorted.sort((a, b) => b.avg_risk - a.avg_risk)
    else sorted.sort((a, b) => b.total_contracts - a.total_contracts)
    return sorted
  }, [categories, sortBy])

  // Treemap data
  const treemapData = useMemo(() => {
    return categories
      .filter(c => c.total_value > 0)
      .slice(0, 30)
      .map(c => ({
        name: c.name_en || c.name_es,
        value: c.total_value,
        fill: c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : getRiskColor(c.avg_risk),
      }))
  }, [categories])

  // Trend chart data — top 5 categories by value
  const trendChartData = useMemo(() => {
    if (!trendsData?.data) return { years: [] as number[], series: [] as Array<{ name: string; data: Record<number, number> }> }
    const items: TrendItem[] = trendsData.data
    const top5Ids = categories.slice(0, 5).map(c => c.category_id)
    const yearSet = new Set<number>()
    const seriesMap = new Map<number, { name: string; data: Record<number, number> }>()

    for (const item of items) {
      if (!top5Ids.includes(item.category_id)) continue
      yearSet.add(item.year)
      if (!seriesMap.has(item.category_id)) {
        seriesMap.set(item.category_id, { name: item.name_en || item.name_es, data: {} })
      }
      seriesMap.get(item.category_id)!.data[item.year] = item.value
    }

    return {
      years: Array.from(yearSet).sort(),
      series: Array.from(seriesMap.values()),
    }
  }, [trendsData, categories])

  // Colors for trend lines
  const TREND_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#16a34a', '#dc2626']

  return (
    <div className="space-y-6">
      {/* Hero */}
      <PageHero
        trackingLabel="SPENDING CATEGORIES"
        icon={<ShoppingCart className="h-4 w-4 text-accent" />}
        headline={stats ? formatCompactMXN(stats.totalValue) : '—'}
        subtitle="What Mexico buys — spending categories from government procurement"
        detail="72 regex-based categories classify 3.1M contracts (2002-2025) by title with accent-aware matching. Coverage: ~84% specific, ~16% unclassified."
        loading={summaryLoading}
      />

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SharedStatCard
          label="TOTAL CATEGORIES"
          value={categories.length > 0 ? formatNumber(categories.length) : '—'}
          detail="Distinct spending categories"
          borderColor="border-accent/30"
          loading={summaryLoading}
        />
        <SharedStatCard
          label="TOTAL CONTRACTS"
          value={stats ? formatNumber(stats.totalContracts) : '—'}
          detail="Categorized contracts"
          borderColor="border-blue-500/30"
          loading={summaryLoading}
        />
        <SharedStatCard
          label="AVG RISK"
          value={stats ? `${(stats.avgRisk * 100).toFixed(1)}%` : '—'}
          detail="Weighted average risk score"
          borderColor="border-amber-500/30"
          color={stats && stats.avgRisk >= 0.3 ? 'text-risk-high' : 'text-text-primary'}
          loading={summaryLoading}
        />
        <SharedStatCard
          label="HIGH-RISK CATEGORIES"
          value={stats ? String(stats.highRiskCategories) : '—'}
          detail="Categories with avg risk >= 30%"
          borderColor="border-red-500/30"
          color={stats && stats.highRiskCategories > 0 ? 'text-risk-critical' : 'text-text-primary'}
          loading={summaryLoading}
        />
      </div>

      {/* Treemap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-text-muted" />
            Category Treemap by Value
          </CardTitle>
          <CardDescription>
            Size represents total contract value. Colors indicate sector classification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <ChartSkeleton height={380} />
          ) : treemapData.length > 0 ? (
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  nameKey="name"
                  content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} depth={0} fill="" />}
                />
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">
              No category data available yet. Please contact your administrator.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-text-muted" />
                Top Categories
              </CardTitle>
              <CardDescription>
                Ranked by {sortBy === 'value' ? 'total contract value' : sortBy === 'risk' ? 'average risk score' : 'contract count'}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {(['value', 'risk', 'contracts'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    sortBy === s
                      ? 'bg-accent/20 text-accent font-medium'
                      : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
                  )}
                >
                  {s === 'value' ? 'Value' : s === 'risk' ? 'Risk' : 'Count'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-text-muted">
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Category</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Contracts</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Value</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Avg Risk</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted hidden lg:table-cell">DA%</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted hidden lg:table-cell">Top Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.slice(0, 30).map((cat, idx) => (
                    <tr
                      key={cat.category_id}
                      className="border-b border-border/10 hover:bg-background-elevated/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-text-muted text-xs tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {cat.sector_code && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SECTOR_COLORS[cat.sector_code] || '#64748b' }}
                            />
                          )}
                          <span className="text-text-primary font-medium truncate max-w-[280px]">
                            {cat.name_en || cat.name_es}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                        {formatNumber(cat.total_contracts)}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                        {formatCompactMXN(cat.total_value)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono tabular-nums"
                          style={{
                            color: getRiskColor(cat.avg_risk),
                            backgroundColor: `${getRiskColor(cat.avg_risk)}15`,
                          }}
                        >
                          {(cat.avg_risk * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted tabular-nums hidden lg:table-cell">
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedCategories.length === 0 && (
                <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                  No categories found. Category data may not be available yet.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-text-muted" />
            Spending Trends — Top 5 Categories
          </CardTitle>
          <CardDescription>
            Year-over-year contract value for the five largest spending categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <ChartSkeleton height={320} type="area" />
          ) : trendChartData.years.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  margin={{ top: 10, right: 30, bottom: 0, left: 10 }}
                >
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
              No trend data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
