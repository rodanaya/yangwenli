/**
 * Timeline Page
 * Interactive timeline of contract awards, budget cycles, and significant events
 * Reveals temporal patterns in procurement
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flag,
  Clock,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
  Bar,
  Line,
  Cell,
} from 'recharts'

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2001, end: 2006, color: 'rgba(59,130,246,0.08)' },
  { name: 'Calderon', start: 2006, end: 2012, color: 'rgba(251,146,60,0.08)' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: 'rgba(248,113,113,0.08)' },
  { name: 'AMLO', start: 2018, end: 2024, color: 'rgba(74,222,128,0.08)' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: 'rgba(96,165,250,0.08)' },
]

export function Timeline() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly')

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch monthly breakdown for the selected year
  const { data: monthlyBreakdown, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly-breakdown', selectedYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear),
    enabled: viewMode === 'monthly',
    staleTime: 10 * 60 * 1000,
  })

  // Fetch all temporal events
  const { data: eventsData } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 60 * 60 * 1000, // Events rarely change, cache 1 hour
  })

  const allEvents = eventsData?.events ?? []

  // Process timeline data from year-over-year API
  const timelineData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data.map((d: any) => ({
      year: d.year,
      contracts: d.contracts,
      value: d.total_value ?? d.value_mxn ?? 0,
      avgRisk: (d.avg_risk ?? 0) * 100,
    }))
  }, [trends])

  // Selected year summary from yearly data
  const selectedYearData = useMemo(() => {
    return timelineData.find((d) => d.year === selectedYear)
  }, [timelineData, selectedYear])

  // Year-over-year changes
  const yoyChanges = useMemo(() => {
    if (timelineData.length < 2) return null
    const currentIdx = timelineData.findIndex((d) => d.year === selectedYear)
    if (currentIdx < 1) return null
    const current = timelineData[currentIdx]
    const previous = timelineData[currentIdx - 1]
    return {
      contracts: ((current.contracts - previous.contracts) / previous.contracts) * 100,
      value: ((current.value - previous.value) / previous.value) * 100,
      avgRisk: current.avgRisk - previous.avgRisk,
    }
  }, [timelineData, selectedYear])

  // Events for selected year
  const yearEvents = useMemo(() => {
    return allEvents.filter((e) => e.year === selectedYear)
  }, [allEvents, selectedYear])

  // Election events for reference lines on yearly chart
  const electionEvents = useMemo(() => {
    return allEvents.filter((e) => e.type === 'election')
  }, [allEvents])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'election': return '🗳️'
      case 'budget': return '💰'
      case 'audit': return '📋'
      case 'crisis': return '⚠️'
      case 'anomaly': return '⚠️'
      case 'milestone': return '🏛️'
      default: return '📌'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'election': return 'bg-sector-gobernacion/20 border-sector-gobernacion/30 text-sector-gobernacion'
      case 'budget': return 'bg-sector-hacienda/20 border-sector-hacienda/30 text-sector-hacienda'
      case 'audit': return 'bg-accent/20 border-accent/30 text-accent'
      case 'crisis': return 'bg-risk-high/20 border-risk-high/30 text-risk-high'
      case 'anomaly': return 'bg-risk-high/20 border-risk-high/30 text-risk-high'
      case 'milestone': return 'bg-sector-tecnologia/20 border-sector-tecnologia/30 text-sector-tecnologia'
      default: return 'bg-accent/20 border-accent/30 text-accent'
    }
  }

  const years = timelineData.map((d) => d.year).sort((a, b) => b - a)

  const currentAdmin = ADMINISTRATIONS.find(a => selectedYear >= a.start && selectedYear < a.end)

  // Monthly chart data from real API
  const monthlyChartData = useMemo(() => {
    if (!monthlyBreakdown?.months) return []
    return monthlyBreakdown.months.map((m) => ({
      month: m.month,
      month_name: m.month_name,
      contracts: m.contracts,
      value: m.value,
      avg_risk: m.avg_risk,
      isYearEnd: m.is_year_end,
      direct_award_count: m.direct_award_count,
      single_bid_count: m.single_bid_count,
    }))
  }, [monthlyBreakdown])

  const isMonthlyChartLoading = viewMode === 'monthly' && monthlyLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            Timeline
          </h2>
          <p className="text-sm text-text-muted">
            Temporal patterns in procurement activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'yearly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('yearly')}
          >
            Yearly
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => Math.max(2002, y - 1))}
              disabled={selectedYear <= 2002}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="min-w-[60px]"
                >
                  {year}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => Math.min(2025, y + 1))}
              disabled={selectedYear >= 2025}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {currentAdmin && (
            <div className="flex items-center justify-center mt-2">
              <Badge variant="outline" className="text-xs text-text-muted border-border">
                {currentAdmin.name} Administration ({currentAdmin.start}-{currentAdmin.end})
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Contracts</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? formatNumber(selectedYearData.contracts) : '-'}
                </p>
                {yoyChanges && (
                  <p className={`text-xs flex items-center gap-1 ${yoyChanges.contracts >= 0 ? 'text-risk-low' : 'text-risk-high'}`}>
                    {yoyChanges.contracts >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(yoyChanges.contracts).toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <BarChart3 className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Total Value</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? formatCompactMXN(selectedYearData.value) : '-'}
                </p>
                {selectedYearData && (
                  <p className="text-xs text-text-muted">
                    ~{formatCompactUSD(selectedYearData.value, selectedYear)}
                  </p>
                )}
                {yoyChanges && (
                  <p className={`text-xs flex items-center gap-1 ${yoyChanges.value >= 0 ? 'text-risk-low' : 'text-risk-high'}`}>
                    {yoyChanges.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(yoyChanges.value).toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Avg Risk</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? `${selectedYearData.avgRisk.toFixed(1)}%` : '-'}
                </p>
                {yoyChanges && (
                  <p className={`text-xs flex items-center gap-1 ${yoyChanges.avgRisk <= 0 ? 'text-risk-low' : 'text-risk-high'}`}>
                    {yoyChanges.avgRisk <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {yoyChanges.avgRisk >= 0 ? '+' : ''}{yoyChanges.avgRisk.toFixed(1)} pts
                  </p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Key Events</p>
                <p className="text-2xl font-bold">{yearEvents.length}</p>
                <p className="text-xs text-text-muted">
                  {yearEvents.filter((e) => e.impact === 'high').length} high impact
                </p>
              </div>
              <Flag className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {viewMode === 'yearly' ? 'Historical Trends' : `${selectedYear} Monthly Breakdown`}
            </CardTitle>
            <CardDescription className="text-xs">
              {viewMode === 'yearly'
                ? 'Contract volume and average risk over time'
                : `Real monthly contract data for ${selectedYear}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(trendsLoading || isMonthlyChartLoading) ? (
              <Skeleton className="h-[350px]" />
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'yearly' ? (
                    <ComposedChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 50]}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="chart-tooltip">
                                <p className="font-medium">{data.year}</p>
                                <p className="text-xs text-text-muted">
                                  Contracts: {formatNumber(data.contracts)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Value: {formatCompactMXN(data.value)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  ~{formatCompactUSD(data.value, data.year)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Avg Risk: {data.avgRisk.toFixed(1)}%
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      {/* Presidential administration bands */}
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
                            style: { fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)' },
                          }}
                        />
                      ))}
                      {/* Mark election years */}
                      {electionEvents.map((event) => (
                        <ReferenceLine
                          key={event.id}
                          x={event.year}
                          stroke={RISK_COLORS.high}
                          strokeDasharray="3 3"
                          yAxisId="left"
                        />
                      ))}
                      <Bar yAxisId="left" dataKey="contracts" fill="var(--color-accent)" opacity={0.7} radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgRisk" stroke={RISK_COLORS.high} strokeWidth={2} dot />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="chart-tooltip">
                                <p className="font-medium">{data.month_name} {selectedYear}</p>
                                <p className="text-xs text-text-muted">
                                  Contracts: {formatNumber(data.contracts)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Value: {formatCompactMXN(data.value)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Avg Risk: {(data.avg_risk * 100).toFixed(1)}%
                                </p>
                                {data.direct_award_count > 0 && (
                                  <p className="text-xs text-text-muted">
                                    Direct Awards: {formatNumber(data.direct_award_count)}
                                  </p>
                                )}
                                {data.isYearEnd && (
                                  <p className="text-xs text-risk-high mt-1">
                                    Year-end spending period
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="contracts" radius={[2, 2, 0, 0]}>
                        {monthlyChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.isYearEnd ? RISK_COLORS.high : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
            {monthlyBreakdown?.december_spike != null && viewMode === 'monthly' && (
              <p className="text-xs text-text-muted mt-2">
                December spike ratio: {monthlyBreakdown.december_spike.toFixed(2)}x average monthly spending
              </p>
            )}
          </CardContent>
        </Card>

        {/* Events Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Key Events
            </CardTitle>
            <CardDescription className="text-xs">
              Significant events affecting procurement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {yearEvents.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                No major events recorded for {selectedYear}
              </p>
            ) : (
              yearEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getEventIcon(event.type)}</span>
                    <span className="font-medium text-sm">{event.title}</span>
                    {event.impact === 'high' && (
                      <Badge variant="outline" className="text-[10px] bg-risk-high/10 border-risk-high/30 text-risk-high">
                        High Impact
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-text-muted">{event.date}</p>
                    {event.source && (
                      <p className="text-[10px] text-text-muted">Source: {event.source}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Historical Events */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-text-muted mb-2">Historical Events</p>
              {allEvents
                .filter((e) => e.year !== selectedYear)
                .slice(0, 3)
                .map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedYear(event.year)}
                    className="w-full p-2 rounded text-left hover:bg-background-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getEventIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.title}</p>
                        <p className="text-[10px] text-text-muted">{event.date}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Timeline
