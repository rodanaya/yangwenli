/**
 * Temporal Pulse
 * Time-series analysis of procurement patterns — monthly rhythms,
 * year-end spikes, and political cycle effects.
 */

import { useMemo, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN, formatPercentSafe } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { MonthlyBreakdownResponse } from '@/api/client'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  ReferenceArea,
  BarChart,
} from 'recharts'
import {
  Clock,
  Activity,
  Calendar,
  AlertTriangle,
  Zap,
  BarChart3,
  FileText,
  Landmark,
  Scale,
  Shield,
  Flag,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const STALE_TIME = 5 * 60 * 1000

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2015 + i)

const MULTI_YEAR_RANGE = [2018, 2019, 2020, 2021, 2022, 2023, 2024]

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2002, end: 2006, color: 'rgba(59,130,246,0.08)' },
  { name: 'Calderon', start: 2006, end: 2012, color: 'rgba(251,146,60,0.08)' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: 'rgba(248,113,113,0.08)' },
  { name: 'AMLO', start: 2018, end: 2024, color: 'rgba(74,222,128,0.08)' },
  { name: 'Sheinbaum', start: 2024, end: 2026, color: 'rgba(96,165,250,0.08)' },
]

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  election: Landmark,
  scandal: AlertTriangle,
  reform: Scale,
  policy: Shield,
  crisis: Flame,
  default: Flag,
}

const EVENT_COLORS: Record<string, string> = {
  election: '#3b82f6',
  scandal: '#f87171',
  reform: '#8b5cf6',
  policy: '#4ade80',
  crisis: '#fb923c',
  default: '#64748b',
}

// =============================================================================
// Main Component
// =============================================================================

export default function TemporalPulse() {
  const [selectedYear, setSelectedYear] = useState(2023)
  const [showAllEvents, setShowAllEvents] = useState(false)

  // ---- Data Fetching ----

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-breakdown', selectedYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear),
    staleTime: STALE_TIME,
  })

  const { data: yoyData, isLoading: yoyLoading } = useQuery({
    queryKey: ['year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: STALE_TIME,
  })

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: STALE_TIME,
  })

  // Fetch monthly breakdowns for multi-year December analysis
  const multiYearQueries = useQueries({
    queries: MULTI_YEAR_RANGE.map((year) => ({
      queryKey: ['monthly-breakdown', year] as const,
      queryFn: () => analysisApi.getMonthlyBreakdown(year),
      staleTime: STALE_TIME,
    })),
  })

  // ---- Computed Data ----

  const yearOverview = useMemo(() => {
    if (!monthlyData) return null
    const months = monthlyData.months || []
    const decMonth = months.find((m) => m.month === 12)
    const nonDecMonths = months.filter((m) => m.month !== 12)
    const avgNonDec =
      nonDecMonths.length > 0
        ? nonDecMonths.reduce((s, m) => s + m.contracts, 0) / nonDecMonths.length
        : 0
    const decSpikeRatio = decMonth && avgNonDec > 0 ? decMonth.contracts / avgNonDec : null
    return {
      totalContracts: monthlyData.total_contracts,
      totalValue: monthlyData.total_value,
      avgRisk: monthlyData.avg_risk,
      decSpikeRatio,
    }
  }, [monthlyData])

  const monthlyChartData = useMemo(() => {
    if (!monthlyData?.months) return []
    return monthlyData.months.map((m) => ({
      month: MONTH_LABELS[m.month - 1] || `M${m.month}`,
      monthNum: m.month,
      contracts: m.contracts,
      value: m.value,
      avgRisk: m.avg_risk * 100,
      directAwards: m.direct_award_count,
      singleBids: m.single_bid_count,
      isYearEnd: m.is_year_end,
    }))
  }, [monthlyData])

  const decemberSpikeData = useMemo(() => {
    const results: Array<{
      year: number
      decContracts: number
      avgOtherContracts: number
      spikeRatio: number
    }> = []

    for (let i = 0; i < MULTI_YEAR_RANGE.length; i++) {
      const query = multiYearQueries[i]
      if (!query.data?.months) continue
      const months = query.data.months
      const decMonth = months.find((m) => m.month === 12)
      const nonDec = months.filter((m) => m.month !== 12)
      const avgOther =
        nonDec.length > 0
          ? nonDec.reduce((s, m) => s + m.contracts, 0) / nonDec.length
          : 0
      results.push({
        year: MULTI_YEAR_RANGE[i],
        decContracts: decMonth?.contracts ?? 0,
        avgOtherContracts: Math.round(avgOther),
        spikeRatio: avgOther > 0 ? (decMonth?.contracts ?? 0) / avgOther : 0,
      })
    }
    return results
  }, [multiYearQueries])

  const adminChartData = useMemo(() => {
    if (!yoyData?.data) return []
    return yoyData.data
      .filter((y) => y.year >= 2002 && y.year <= 2025)
      .map((y) => ({
        year: y.year,
        contracts: y.contracts,
        value: y.total_value ?? y.value_mxn ?? 0,
        avgRisk: y.avg_risk * 100,
        directAwardPct: y.direct_award_pct,
        highRiskPct: y.high_risk_pct,
      }))
  }, [yoyData])

  const visibleEvents = useMemo(() => {
    if (!eventsData?.events) return []
    const sorted = [...eventsData.events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return showAllEvents ? sorted : sorted.slice(0, 8)
  }, [eventsData, showAllEvents])

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Temporal Pulse
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            The heartbeat of Mexican procurement — rhythms, spikes, and political cycles
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-xs text-text-muted font-mono">
            Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-background-elevated border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* L1: Year Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Contracts"
          value={yearOverview ? formatNumber(yearOverview.totalContracts) : null}
          icon={FileText}
          subtitle={`In ${selectedYear}`}
          loading={monthlyLoading}
        />
        <StatCard
          label="Total Value"
          value={yearOverview ? formatCompactMXN(yearOverview.totalValue) : null}
          icon={BarChart3}
          subtitle="Contract spending"
          loading={monthlyLoading}
        />
        <StatCard
          label="Avg Risk Score"
          value={yearOverview ? formatPercentSafe(yearOverview.avgRisk) : null}
          icon={AlertTriangle}
          subtitle="Mean corruption probability"
          loading={monthlyLoading}
          valueColor={
            yearOverview && yearOverview.avgRisk >= 0.3
              ? RISK_COLORS.high
              : yearOverview && yearOverview.avgRisk >= 0.1
                ? RISK_COLORS.medium
                : undefined
          }
        />
        <StatCard
          label="December Spike"
          value={
            yearOverview?.decSpikeRatio != null
              ? `${yearOverview.decSpikeRatio.toFixed(1)}x`
              : null
          }
          icon={Zap}
          subtitle="Dec vs avg month"
          loading={monthlyLoading}
          valueColor={
            yearOverview?.decSpikeRatio != null && yearOverview.decSpikeRatio > 1.5
              ? RISK_COLORS.high
              : undefined
          }
        />
      </div>

      {/* L2: Monthly Rhythm Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-muted" />
            Monthly Procurement Rhythm ({selectedYear})
          </CardTitle>
          <CardDescription>
            Contract volume by month with risk overlay. December bars highlighted when they exceed the annual average.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <ChartSkeleton height={320} />
          ) : monthlyChartData.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 40, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    domain={[0, 'auto']}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      return (
                        <div className="chart-tooltip">
                          <p className="font-medium text-xs mb-1">
                            {d.month} {selectedYear}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Contracts: {formatNumber(d.contracts)}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Value: {formatCompactMXN(d.value)}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Avg Risk: {d.avgRisk.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Direct Awards: {formatNumber(d.directAwards)}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Single Bids: {formatNumber(d.singleBids)}
                          </p>
                          {d.isYearEnd && (
                            <p className="text-[10px] text-risk-high mt-1 font-medium">
                              Year-end period
                            </p>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="contracts"
                    name="Contracts"
                    radius={[3, 3, 0, 0]}
                  >
                    {monthlyChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isYearEnd
                            ? RISK_COLORS.high
                            : 'var(--color-accent)'
                        }
                        opacity={entry.isYearEnd ? 0.9 : 0.7}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRisk"
                    name="Avg Risk %"
                    stroke={RISK_COLORS.critical}
                    strokeWidth={2}
                    dot={{ r: 3, fill: RISK_COLORS.critical }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message={`No data available for ${selectedYear}`} />
          )}
        </CardContent>
      </Card>

      {/* L3: December Spike Analysis (Multi-Year) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-text-muted" />
            December Spike Analysis (2018-2024)
          </CardTitle>
          <CardDescription>
            December contract counts vs average of other months. Years where December exceeds 1.5x are highlighted.
            Budget-clearing behavior drives predictable year-end surges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {multiYearQueries.some((q) => q.isLoading) ? (
            <ChartSkeleton height={300} />
          ) : decemberSpikeData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={decemberSpikeData}
                  margin={{ top: 10, right: 30, bottom: 0, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      return (
                        <div className="chart-tooltip">
                          <p className="font-medium text-xs mb-1">{d.year}</p>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: RISK_COLORS.high }}
                            />
                            December: {formatNumber(d.decContracts)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                            Avg Other: {formatNumber(d.avgOtherContracts)}
                          </div>
                          <p
                            className={cn(
                              'text-[10px] font-medium mt-1',
                              d.spikeRatio > 1.5 ? 'text-risk-high' : 'text-text-secondary'
                            )}
                          >
                            Ratio: {d.spikeRatio.toFixed(2)}x
                            {d.spikeRatio > 1.5 ? ' (spike detected)' : ''}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                  />
                  <Bar
                    dataKey="decContracts"
                    name="December"
                    radius={[3, 3, 0, 0]}
                  >
                    {decemberSpikeData.map((entry, index) => (
                      <Cell
                        key={`dec-${index}`}
                        fill={
                          entry.spikeRatio > 1.5
                            ? RISK_COLORS.high
                            : RISK_COLORS.medium
                        }
                        opacity={entry.spikeRatio > 1.5 ? 0.9 : 0.6}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="avgOtherContracts"
                    name="Avg Other Months"
                    fill="var(--color-accent)"
                    opacity={0.5}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No multi-year data available" />
          )}
        </CardContent>
      </Card>

      {/* L4: Administration Bands */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-text-muted" />
            Procurement by Presidential Administration
          </CardTitle>
          <CardDescription>
            Year-over-year contract volume with administration periods shaded.
            Structural shifts in procurement patterns often align with political transitions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yoyLoading ? (
            <ChartSkeleton height={340} type="area" />
          ) : adminChartData.length > 0 ? (
            <div style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={adminChartData}
                  margin={{ top: 10, right: 40, bottom: 0, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    type="number"
                    domain={[2002, 2025]}
                    ticks={[2002, 2006, 2010, 2012, 2014, 2018, 2020, 2024]}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    domain={[0, 'auto']}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      const admin = ADMINISTRATIONS.find(
                        (a) => d.year >= a.start && d.year < a.end
                      )
                      return (
                        <div className="chart-tooltip">
                          <p className="font-medium text-xs mb-1">
                            {d.year}
                            {admin ? ` (${admin.name})` : ''}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Contracts: {formatNumber(d.contracts)}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Value: {formatCompactMXN(d.value)}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Avg Risk: {d.avgRisk.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            Direct Awards: {d.directAwardPct.toFixed(1)}%
                          </p>
                        </div>
                      )
                    }}
                  />
                  {/* Administration shading */}
                  {ADMINISTRATIONS.map((admin) => (
                    <ReferenceArea
                      key={admin.name}
                      x1={admin.start}
                      x2={admin.end}
                      yAxisId="left"
                      fill={admin.color}
                      fillOpacity={1}
                      label={{
                        value: admin.name,
                        position: 'insideTopLeft',
                        style: {
                          fill: 'var(--color-text-muted)',
                          fontSize: 9,
                          fontFamily: 'var(--font-mono)',
                        },
                      }}
                    />
                  ))}
                  <Bar
                    yAxisId="left"
                    dataKey="contracts"
                    fill="var(--color-accent)"
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRisk"
                    name="Avg Risk %"
                    stroke={RISK_COLORS.high}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No year-over-year data available" />
          )}

          {/* Admin legend */}
          {adminChartData.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4 px-2">
              {ADMINISTRATIONS.map((admin) => (
                <div key={admin.name} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <div
                    className="w-3 h-3 rounded-sm border border-border"
                    style={{ backgroundColor: admin.color }}
                  />
                  <span className="font-mono">
                    {admin.name} ({admin.start}-{admin.end > 2025 ? '' : admin.end})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* L5: Political Events Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text-muted" />
            Political Events Timeline
          </CardTitle>
          <CardDescription>
            Key political events that may have influenced procurement patterns.
            Elections, reforms, scandals, and crises can all trigger shifts in spending behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleEvents.length > 0 ? (
            <div className="space-y-1">
              {visibleEvents.map((event) => {
                const EventIcon = EVENT_ICONS[event.type] || EVENT_ICONS.default
                const color = EVENT_COLORS[event.type] || EVENT_COLORS.default
                return (
                  <div
                    key={event.id}
                    className="flex gap-3 p-2.5 rounded-md hover:bg-background-elevated/50 transition-colors"
                  >
                    <div
                      className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <EventIcon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {event.title}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: `${color}15`,
                            color,
                          }}
                        >
                          {event.type}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted font-mono">
                        <span>{event.date}</span>
                        {event.impact && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded',
                              event.impact === 'high'
                                ? 'bg-red-500/10 text-red-400'
                                : event.impact === 'medium'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-blue-500/10 text-blue-400'
                            )}
                          >
                            {event.impact} impact
                          </span>
                        )}
                        {event.source && (
                          <span className="text-text-muted">{event.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Show more/less toggle */}
              {eventsData && eventsData.events.length > 8 && (
                <button
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors mt-2 px-2.5"
                >
                  {showAllEvents ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show all {eventsData.events.length} events
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <EmptyState message="No political events data available" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  loading,
  valueColor,
}: {
  label: string
  value: string | null
  icon: React.ElementType
  subtitle: string
  loading: boolean
  valueColor?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
              {label}
            </p>
            {loading || value === null ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: valueColor || 'var(--color-text-primary)' }}
              >
                {value}
              </p>
            )}
            <p className="text-[10px] text-text-muted">{subtitle}</p>
          </div>
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10">
            <Icon className="h-5 w-5 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
      <Activity className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
