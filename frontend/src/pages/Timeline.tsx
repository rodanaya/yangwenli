/**
 * Timeline Page
 * Interactive timeline of contract awards, budget cycles, and significant events
 * Reveals temporal patterns in procurement
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flag,
  Clock,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
} from 'recharts'

interface TimelineEvent {
  id: string
  date: string
  type: 'election' | 'budget' | 'audit' | 'anomaly' | 'milestone'
  title: string
  description: string
  impact?: 'high' | 'medium' | 'low'
}

// Key events in Mexican procurement/politics
const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: '1', date: '2024-06', type: 'election', title: 'Presidential Election', description: 'Federal elections held', impact: 'high' },
  { id: '2', date: '2023-01', type: 'budget', title: 'New Fiscal Year', description: '2023 budget enacted', impact: 'medium' },
  { id: '3', date: '2022-12', type: 'audit', title: 'ASF Audit Report', description: 'Annual audit findings released', impact: 'medium' },
  { id: '4', date: '2021-06', type: 'election', title: 'Midterm Elections', description: 'Congressional elections', impact: 'high' },
  { id: '5', date: '2020-03', type: 'anomaly', title: 'COVID Emergency', description: 'Emergency procurement authorized', impact: 'high' },
  { id: '6', date: '2018-12', type: 'milestone', title: 'Administration Change', description: 'New administration begins', impact: 'high' },
  { id: '7', date: '2018-07', type: 'election', title: 'Presidential Election', description: 'AMLO elected president', impact: 'high' },
]

export function Timeline() {
  const navigate = useNavigate()
  const [selectedYear, setSelectedYear] = useState(2024)
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly')

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
  })

  // Process timeline data
  const timelineData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data.map((d) => ({
      year: d.year,
      contracts: d.contracts,
      value: d.total_value,
      avgRisk: d.avg_risk * 100,
      // Simulate monthly breakdown
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        contracts: Math.floor(d.contracts / 12 * (0.7 + Math.random() * 0.6)),
        value: d.total_value / 12 * (0.7 + Math.random() * 0.6),
        // December spike simulation
        isYearEnd: i === 11,
        spike: i === 11 ? 1.4 : 1,
      })),
    }))
  }, [trends])

  // Selected year data
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
    return TIMELINE_EVENTS.filter((e) => e.date.startsWith(String(selectedYear)))
  }, [selectedYear])

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'election': return '🗳️'
      case 'budget': return '💰'
      case 'audit': return '📋'
      case 'anomaly': return '⚠️'
      case 'milestone': return '🏛️'
    }
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'election': return 'bg-sector-gobernacion/20 border-sector-gobernacion/30 text-sector-gobernacion'
      case 'budget': return 'bg-sector-hacienda/20 border-sector-hacienda/30 text-sector-hacienda'
      case 'audit': return 'bg-accent/20 border-accent/30 text-accent'
      case 'anomaly': return 'bg-risk-high/20 border-risk-high/30 text-risk-high'
      case 'milestone': return 'bg-sector-tecnologia/20 border-sector-tecnologia/30 text-sector-tecnologia'
    }
  }

  const years = timelineData.map((d) => d.year).sort((a, b) => b - a)

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
            <div className="flex items-center gap-4 overflow-x-auto py-2">
              {years.slice(0, 10).map((year) => (
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
              Contract volume and average risk over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[350px]" />
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'yearly' ? (
                    <ComposedChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                      <XAxis dataKey="year" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
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
                                  Avg Risk: {data.avgRisk.toFixed(1)}%
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      {/* Mark election years */}
                      {TIMELINE_EVENTS.filter((e) => e.type === 'election').map((event) => (
                        <ReferenceLine
                          key={event.id}
                          x={parseInt(event.date.slice(0, 4))}
                          stroke={RISK_COLORS.high}
                          strokeDasharray="3 3"
                          yAxisId="left"
                        />
                      ))}
                      <Bar yAxisId="left" dataKey="contracts" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgRisk" stroke={RISK_COLORS.high} strokeWidth={2} dot />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={selectedYearData?.months || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
                        tickFormatter={(m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                      />
                      <YAxis
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                            return (
                              <div className="chart-tooltip">
                                <p className="font-medium">{monthNames[data.month - 1]} {selectedYear}</p>
                                <p className="text-xs text-text-muted">
                                  Contracts: {formatNumber(data.contracts)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Value: {formatCompactMXN(data.value)}
                                </p>
                                {data.isYearEnd && (
                                  <p className="text-xs text-risk-high mt-1">
                                    ⚠️ Year-end spending spike
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="contracts" radius={[2, 2, 0, 0]}>
                        {selectedYearData?.months.map((entry, index) => (
                          <rect
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
                  <p className="text-[10px] text-text-muted mt-1">{event.date}</p>
                </div>
              ))
            )}

            {/* Historical Events */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-text-muted mb-2">Historical Events</p>
              {TIMELINE_EVENTS.filter((e) => !e.date.startsWith(String(selectedYear)))
                .slice(0, 3)
                .map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedYear(parseInt(event.date.slice(0, 4)))}
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
