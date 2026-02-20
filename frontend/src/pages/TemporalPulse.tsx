/**
 * Temporal Pulse
 * Time-series analysis of procurement patterns — monthly rhythms,
 * year-end spikes, and political cycle effects.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN, formatPercentSafe } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { PageHero, StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import { analysisApi } from '@/api/client'
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
  ReferenceLine,
  BarChart,
} from '@/components/charts'
import {
  Clock,
  Activity,
  Zap,
  TrendingUp,
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
  { name: 'Fox', start: 2002, end: 2006, color: 'rgba(59,130,246,0.08)', solidColor: '#3b82f6' },
  { name: 'Calderon', start: 2006, end: 2012, color: 'rgba(251,146,60,0.08)', solidColor: '#fb923c' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: 'rgba(248,113,113,0.08)', solidColor: '#f87171' },
  { name: 'AMLO', start: 2018, end: 2024, color: 'rgba(74,222,128,0.08)', solidColor: '#4ade80' },
  { name: 'Sheinbaum', start: 2024, end: 2026, color: 'rgba(96,165,250,0.08)', solidColor: '#60a5fa' },
]

const KEY_EVENTS = [
  { year: 2008, label: 'Financial Crisis' },
  { year: 2012, label: 'New PRI Govt' },
  { year: 2018, label: 'AMLO Takes Office' },
  { year: 2020, label: 'COVID-19' },
  { year: 2024, label: 'Sheinbaum' },
]

// =============================================================================
// Main Component
// =============================================================================

export default function TemporalPulse() {
  const navigate = useNavigate()
  const { t } = useTranslation('temporal')
  const [selectedYear, setSelectedYear] = useState(2023)

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
        value: y.total_value ?? 0,
        avgRisk: y.avg_risk * 100,
        directAwardPct: y.direct_award_pct,
        highRiskPct: y.high_risk_pct,
      }))
  }, [yoyData])

  // Anomaly years: years where high_risk_pct is > mean + 1.2 * stddev
  const anomalyYears = useMemo(() => {
    if (!adminChartData.length) return new Set<number>()
    const riskValues = adminChartData
      .map((d) => d.highRiskPct)
      .filter((v): v is number => v != null)
    if (riskValues.length < 3) return new Set<number>()
    const mean = riskValues.reduce((a, b) => a + b, 0) / riskValues.length
    const stddev = Math.sqrt(
      riskValues.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / riskValues.length
    )
    const threshold = mean + 1.2 * stddev
    return new Set(adminChartData.filter((d) => (d.highRiskPct ?? 0) > threshold).map((d) => d.year))
  }, [adminChartData])

  // Q4 vs Q1-Q3 breakdown derived from multiYearQueries
  const q4BreakdownData = useMemo(() => {
    const results: Array<{
      year: number
      q4Total: number
      q1q3AvgMonthly: number
      q4Ratio: number
    }> = []
    for (let i = 0; i < MULTI_YEAR_RANGE.length; i++) {
      const query = multiYearQueries[i]
      if (!query.data?.months) continue
      const months = query.data.months
      const q4Months = months.filter((m) => m.month >= 10)
      const q1q3Months = months.filter((m) => m.month < 10)
      const q4Total = q4Months.reduce((s, m) => s + m.contracts, 0)
      const q1q3Avg =
        q1q3Months.length > 0
          ? q1q3Months.reduce((s, m) => s + m.contracts, 0) / q1q3Months.length
          : 0
      results.push({
        year: MULTI_YEAR_RANGE[i],
        q4Total,
        q1q3AvgMonthly: Math.round(q1q3Avg),
        q4Ratio: q1q3Avg > 0 ? q4Total / (q1q3Avg * 3) : 0,
      })
    }
    return results
  }, [multiYearQueries])

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <PageHero
        trackingLabel={t('trackingLabel')}
        icon={<Activity className="h-4 w-4 text-accent" />}
        headline={yearOverview ? formatNumber(yearOverview.totalContracts) : '—'}
        subtitle={t('subtitle', { year: selectedYear })}
        detail={yearOverview ? t('heroDetail', { value: formatCompactMXN(yearOverview.totalValue), risk: formatPercentSafe(yearOverview.avgRisk) }) : undefined}
        loading={monthlyLoading}
        trailing={
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-xs text-text-muted font-mono">
              {t('yearLabel')}
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
        }
      />

      {/* L1: Year Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SharedStatCard
          label={t('stats.totalContracts')}
          value={yearOverview ? formatNumber(yearOverview.totalContracts) : '—'}
          detail={t('stats.totalContractsDetail', { year: selectedYear })}
          borderColor="border-accent/30"
          loading={monthlyLoading}
        />
        <SharedStatCard
          label={t('stats.totalValue')}
          value={yearOverview ? formatCompactMXN(yearOverview.totalValue) : '—'}
          detail={t('stats.totalValueDetail')}
          borderColor="border-blue-500/30"
          loading={monthlyLoading}
        />
        <SharedStatCard
          label={t('stats.avgRiskScore')}
          value={yearOverview ? formatPercentSafe(yearOverview.avgRisk) : '—'}
          detail={t('stats.avgRiskScoreDetail')}
          borderColor="border-amber-500/30"
          color={
            yearOverview && yearOverview.avgRisk >= 0.3
              ? 'text-risk-high'
              : yearOverview && yearOverview.avgRisk >= 0.1
                ? 'text-risk-medium'
                : 'text-text-primary'
          }
          loading={monthlyLoading}
        />
        <SharedStatCard
          label={t('stats.decemberSpike')}
          value={
            yearOverview?.decSpikeRatio != null
              ? `${yearOverview.decSpikeRatio.toFixed(1)}x`
              : '—'
          }
          detail={t('stats.decemberSpikeDetail')}
          borderColor="border-red-500/30"
          color={
            yearOverview?.decSpikeRatio != null && yearOverview.decSpikeRatio > 1.5
              ? 'text-risk-critical'
              : 'text-text-primary'
          }
          loading={monthlyLoading}
        />
      </div>

      {/* L2: Monthly Rhythm Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-muted" />
            {t('monthlyRhythm.title', { year: selectedYear })}
          </CardTitle>
          <CardDescription>
            {t('monthlyRhythm.description')}
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
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.contracts')}: {formatNumber(d.contracts)}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.value')}: {formatCompactMXN(d.value)}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.avgRisk')}: {d.avgRisk.toFixed(1)}%
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.directAwards')}: {formatNumber(d.directAwards)}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.singleBids')}: {formatNumber(d.singleBids)}
                          </p>
                          {d.isYearEnd && (
                            <p className="text-xs text-risk-high mt-1 font-medium">
                              {t('tooltip.yearEndPeriod')}
                            </p>
                          )}
                          <p className="text-xs text-accent/70 mt-1">{t('tooltip.clickToInvestigate')}</p>
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
                    name={t('legend.contracts')}
                    radius={[3, 3, 0, 0]}
                    style={{ cursor: 'pointer' }}
                    onClick={(_data: unknown, index: number) => {
                      const monthIndex = index // 0 = Jan, 11 = Dec
                      if (monthIndex === 11) {
                        navigate(
                          `/contracts?year=${selectedYear}&risk_factor=year_end&sort_by=amount_mxn&sort_order=desc`
                        )
                      } else {
                        navigate(
                          `/contracts?year=${selectedYear}&sort_by=contract_date&sort_order=desc`
                        )
                      }
                    }}
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
                    name={t('legend.avgRiskPct')}
                    stroke={RISK_COLORS.critical}
                    strokeWidth={2}
                    dot={{ r: 3, fill: RISK_COLORS.critical }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message={t('empty.noDataForYear', { year: selectedYear })} />
          )}
        </CardContent>
      </Card>

      {/* L3: December Spike Analysis (Multi-Year) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-text-muted" />
            {t('decemberAnalysis.title')}
          </CardTitle>
          <CardDescription>
            {t('decemberAnalysis.description')}
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
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: RISK_COLORS.high }}
                            />
                            {t('tooltip.december')}: {formatNumber(d.decContracts)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                            {t('tooltip.avgOther')}: {formatNumber(d.avgOtherContracts)}
                          </div>
                          <p
                            className={cn(
                              'text-xs font-medium mt-1',
                              d.spikeRatio > 1.5 ? 'text-risk-high' : 'text-text-secondary'
                            )}
                          >
                            {t('tooltip.ratio')}: {d.spikeRatio.toFixed(2)}x
                            {d.spikeRatio > 1.5 ? ` (${t('tooltip.spikeDetected')})` : ''}
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
                    name={t('legend.december')}
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
                    name={t('legend.avgOtherMonths')}
                    fill="var(--color-accent)"
                    opacity={0.5}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message={t('empty.noMultiYearData')} />
          )}
        </CardContent>
      </Card>

      {/* L4: Year-over-Year Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-text-muted" />
            {t('yoyTrend.title')}
          </CardTitle>
          <CardDescription>
            {t('yoyTrend.description')}
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
                      const isAnomaly = anomalyYears.has(d.year)
                      return (
                        <div className="chart-tooltip">
                          <p className="font-medium text-xs mb-1">
                            {d.year}
                            {admin ? ` (${admin.name})` : ''}
                            {isAnomaly ? ` — ${t('anomalous')}` : ''}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.contracts')}: {formatNumber(d.contracts)}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.value')}: {formatCompactMXN(d.value)}
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.avgRisk')}: {d.avgRisk.toFixed(1)}%
                          </p>
                          <p className="text-xs text-text-muted tabular-nums">
                            {t('tooltip.directAwards')}: {d.directAwardPct.toFixed(1)}%
                          </p>
                          <p className="text-xs text-accent/70 mt-1">{t('tooltip.clickToInvestigate')}</p>
                        </div>
                      )
                    }}
                  />
                  {/* Key event markers */}
                  {KEY_EVENTS.map((event) => (
                    <ReferenceLine
                      key={event.year}
                      x={event.year}
                      yAxisId="left"
                      stroke="#fbbf24"
                      strokeDasharray="3 3"
                      label={{
                        value: event.label,
                        position: 'top',
                        style: {
                          fill: 'var(--color-text-muted)',
                          fontSize: 10,
                        },
                      }}
                    />
                  ))}
                  {/* Anomaly year markers */}
                  {Array.from(anomalyYears).map((year) => (
                    <ReferenceLine
                      key={`anomaly-${year}`}
                      x={year}
                      yAxisId="left"
                      stroke={RISK_COLORS.critical}
                      strokeOpacity={0.4}
                      strokeDasharray="4 4"
                      label={{
                        value: '↑',
                        fill: RISK_COLORS.critical,
                        fontSize: 12,
                        position: 'top',
                      }}
                    />
                  ))}
                  <Bar
                    yAxisId="left"
                    dataKey="contracts"
                    fill="var(--color-accent)"
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                    style={{ cursor: 'pointer' }}
                    onClick={(_data: unknown, index: number) => {
                      const year = adminChartData[index]?.year
                      if (year) {
                        navigate(
                          `/contracts?year=${year}&risk_level=high&sort_by=risk_score&sort_order=desc`
                        )
                      }
                    }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRisk"
                    name={t('legend.avgRiskPct')}
                    stroke={RISK_COLORS.high}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message={t('empty.noYoyData')} />
          )}

        </CardContent>
      </Card>

      {/* L5: Q4 vs Q1-Q3 Spend Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-text-muted" />
            {t('q4Breakdown.title')}
          </CardTitle>
          <CardDescription>
            {t('q4Breakdown.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {multiYearQueries.some((q) => q.isLoading) ? (
            <ChartSkeleton height={280} />
          ) : q4BreakdownData.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={q4BreakdownData}
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
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS.high }} />
                            {t('q4Breakdown.q4Label')}: {formatNumber(d.q4Total)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                            {t('q4Breakdown.q1q3Label')} (×3): {formatNumber(d.q1q3AvgMonthly * 3)}
                          </div>
                          <p className={cn(
                            'text-xs font-medium mt-1',
                            d.q4Ratio > 1.3 ? 'text-risk-high' : 'text-text-secondary'
                          )}>
                            {t('q4Breakdown.ratio')}: {d.q4Ratio.toFixed(2)}x
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                  <Bar
                    dataKey="q4Total"
                    name={t('q4Breakdown.q4Label')}
                    radius={[3, 3, 0, 0]}
                  >
                    {q4BreakdownData.map((entry, index) => (
                      <Cell
                        key={`q4-${index}`}
                        fill={entry.q4Ratio > 1.3 ? RISK_COLORS.high : RISK_COLORS.medium}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="q1q3AvgMonthly"
                    name={t('q4Breakdown.q1q3Label')}
                    fill="var(--color-accent)"
                    opacity={0.5}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message={t('empty.noMultiYearData')} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

// Local StatCard removed — using shared DashboardWidgets.StatCard

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
      <Activity className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
