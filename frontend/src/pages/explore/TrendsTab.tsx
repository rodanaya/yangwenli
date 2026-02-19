/**
 * TrendsTab — Procurement trends, sector radar, bubble charts, monthly patterns, and market dynamics.
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  cn,
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
} from '@/lib/utils'
import { RISK_COLORS, SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { analysisApi, sectorApi } from '@/api/client'
import {
  Compass,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Flag,
  Clock,
  BarChart3,
  Target,
  Landmark,
  Banknote,
  FileSearch,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from '@/components/charts'

// =============================================================================
// Constants
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2001, end: 2006, color: 'rgba(59,130,246,0.08)' },
  { name: 'Calderon', start: 2006, end: 2012, color: 'rgba(251,146,60,0.08)' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: 'rgba(248,113,113,0.08)' },
  { name: 'AMLO', start: 2018, end: 2024, color: 'rgba(74,222,128,0.08)' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: 'rgba(96,165,250,0.08)' },
]

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  election: Landmark,
  budget: Banknote,
  audit: FileSearch,
  crisis: AlertTriangle,
  anomaly: AlertCircle,
  milestone: Building2,
}

const EVENT_BORDER_COLORS: Record<string, string> = {
  election: 'border-l-[#be123c]',
  budget: 'border-l-[#16a34a]',
  audit: 'border-l-[#58a6ff]',
  crisis: 'border-l-[#fb923c]',
  anomaly: 'border-l-[#fb923c]',
  milestone: 'border-l-[#8b5cf6]',
}

type RadarPreset = 'risk' | 'transparency' | 'market'

const RADAR_PRESETS: { id: RadarPreset; label: string; axes: { key: string; label: string }[] }[] = [
  {
    id: 'risk',
    label: 'Risk Profile',
    axes: [
      { key: 'avgRisk', label: 'Avg Risk' },
      { key: 'highRiskPct', label: 'High Risk %' },
      { key: 'criticalPct', label: 'Critical %' },
      { key: 'singleBidPct', label: 'Single Bid %' },
      { key: 'concentration', label: 'Concentration' },
    ],
  },
  {
    id: 'transparency',
    label: 'Transparency',
    axes: [
      { key: 'directAwardPct', label: 'Direct Award %' },
      { key: 'singleBidPct', label: 'Single Bid %' },
      { key: 'highRiskPct', label: 'High Risk %' },
      { key: 'avgRisk', label: 'Avg Risk' },
      { key: 'vendorDensity', label: 'Vendor Density' },
    ],
  },
  {
    id: 'market',
    label: 'Market Structure',
    axes: [
      { key: 'vendorDensity', label: 'Vendor Density' },
      { key: 'concentration', label: 'Concentration' },
      { key: 'avgValue', label: 'Avg Contract $' },
      { key: 'institutionDensity', label: 'Institutions' },
      { key: 'directAwardPct', label: 'Direct Award %' },
    ],
  },
]

// =============================================================================
// TrendsTab Component
// =============================================================================

export default function TrendsTab() {
  const { t } = useTranslation('explore')
  const [selectedYear, setSelectedYear] = useState(2024)
  const [radarPreset, setRadarPreset] = useState<RadarPreset>('risk')
  const [radarShowAll, setRadarShowAll] = useState(false)
  const [hiddenSectors, setHiddenSectors] = useState<Set<string>>(new Set())

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch monthly breakdown
  const { data: monthlyBreakdown, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly-breakdown', selectedYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch all temporal events
  const { data: eventsData } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 60 * 60 * 1000,
  })

  // Fetch sector data for radar + bubble charts
  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ['sectors', 'all'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 10 * 60 * 1000,
  })

  const allEvents = eventsData?.events ?? []

  // Process timeline data
  const timelineData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data.map((d: any) => {
      const da = d.direct_award_pct ?? 0
      const sb = d.single_bid_pct ?? 0
      const hr = d.high_risk_pct ?? 0
      const vendors = d.vendor_count ?? 0
      const contracts = d.contracts ?? 0
      const opacityIndex = da * 0.5 + sb * 0.3 + hr * 0.2
      const contractsPerVendor = vendors > 0 ? contracts / vendors : 0
      return {
        year: d.year,
        contracts,
        value: d.total_value ?? d.value_mxn ?? 0,
        avgRisk: (d.avg_risk ?? 0) * 100,
        directAwardPct: da,
        singleBidPct: sb,
        highRiskPct: hr,
        opacityIndex: Math.round(opacityIndex * 10) / 10,
        vendorCount: vendors,
        institutionCount: d.institution_count ?? 0,
        contractsPerVendor: Math.round(contractsPerVendor * 10) / 10,
      }
    })
  }, [trends])

  // Selected year summary
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

  // Election events for reference lines
  const electionEvents = useMemo(() => {
    return allEvents.filter((e) => e.type === 'election')
  }, [allEvents])

  const years = timelineData.map((d) => d.year).sort((a, b) => b - a)

  const currentAdmin = ADMINISTRATIONS.find(
    (a) => selectedYear >= a.start && selectedYear < a.end
  )

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    if (!monthlyBreakdown?.months) return []
    return monthlyBreakdown.months.map((m) => ({
      month: m.month,
      month_name: m.month_name,
      contracts: m.contracts,
      value: m.value,
      avg_risk: (m.avg_risk ?? 0) * 100,
      isYearEnd: m.is_year_end,
      direct_award_count: m.direct_award_count,
      single_bid_count: m.single_bid_count,
      da_pct: m.contracts > 0 ? ((m.direct_award_count ?? 0) / m.contracts) * 100 : 0,
    }))
  }, [monthlyBreakdown])

  // Radar chart data
  const radarData = useMemo(() => {
    if (!sectorData?.data) return { axes: [], sectors: [], chartData: [] }

    const allSectors = [...sectorData.data].sort((a, b) => b.total_contracts - a.total_contracts)
    const chosen = radarShowAll ? allSectors : allSectors.slice(0, 6)

    const maxAvgValue = Math.max(...allSectors.map((s) => s.avg_contract_value || 1))
    const maxVendors = Math.max(...allSectors.map((s) => s.total_vendors || 1))
    const maxInstitutions = Math.max(...allSectors.map((s) => s.total_institutions || 1))

    const preset = RADAR_PRESETS.find((p) => p.id === radarPreset) ?? RADAR_PRESETS[0]
    const axes = preset.axes

    const sectors = chosen.map((s) => {
      const totalRisk = (s.low_risk_count || 0) + (s.medium_risk_count || 0) + (s.high_risk_count || 0) + (s.critical_risk_count || 0)
      const critPct = totalRisk > 0 ? ((s.critical_risk_count || 0) / totalRisk) * 100 : 0
      return {
        code: s.sector_code,
        name: SECTORS.find((sec) => sec.id === s.sector_id)?.nameEN ?? s.sector_name,
        color: SECTOR_COLORS[s.sector_code] ?? '#64748b',
        values: {
          avgRisk: Math.min((s.avg_risk_score ?? 0) * 100, 100),
          highRiskPct: Math.min(s.high_risk_pct ?? 0, 100),
          criticalPct: Math.min(critPct, 100),
          directAwardPct: Math.min(s.direct_award_pct ?? 0, 100),
          singleBidPct: Math.min(s.single_bid_pct ?? 0, 100),
          concentration: Math.min(((s.avg_contract_value || 0) / maxAvgValue) * 100, 100),
          vendorDensity: Math.min(((s.total_vendors || 0) / maxVendors) * 100, 100),
          avgValue: Math.min(((s.avg_contract_value || 0) / maxAvgValue) * 100, 100),
          institutionDensity: Math.min(((s.total_institutions || 0) / maxInstitutions) * 100, 100),
        },
      }
    })

    const chartData = axes.map((axis) => {
      const point: Record<string, string | number> = { axis: axis.label }
      sectors.forEach((s) => {
        point[s.code] = Number((s.values[axis.key as keyof typeof s.values] ?? 0).toFixed(1))
      })
      return point
    })

    return { axes, sectors, chartData }
  }, [sectorData, radarPreset, radarShowAll])

  // Sector bubble data for landscape scatter chart
  const sectorBubbleData = useMemo(() => {
    if (!sectorData?.data) return []
    const maxValue = Math.max(...sectorData.data.map((s) => s.total_value_mxn || 1))
    return sectorData.data.map((s) => ({
      name: SECTORS.find((sec) => sec.id === s.sector_id)?.nameEN ?? s.sector_name,
      code: s.sector_code,
      x: s.total_contracts,
      y: (s.avg_risk_score ?? 0) * 100,
      z: Math.max(((s.total_value_mxn || 0) / maxValue) * 800, 60),
      value: s.total_value_mxn,
      vendors: s.total_vendors,
      color: SECTOR_COLORS[s.sector_code] ?? '#64748b',
    }))
  }, [sectorData])

  return (
    <div className="space-y-4">
      {/* Year Selector + Admin Badge */}
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
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-thin">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="min-w-[52px] h-7 text-xs"
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
            <div className="flex items-center justify-center mt-1.5">
              <Badge variant="outline" className="text-xs text-text-muted border-border">
                {currentAdmin.name} Administration ({currentAdmin.start}-{currentAdmin.end})
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat Pills */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm font-mono">
        <span className="font-semibold">
          {selectedYearData ? formatNumber(selectedYearData.contracts) : '--'}{' '}
          <span className="text-text-muted font-normal">contracts</span>
        </span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="font-semibold">
          {selectedYearData ? formatCompactMXN(selectedYearData.value) : '--'}
          {selectedYearData && (
            <span className="text-text-muted font-normal text-xs ml-1">
              (~{formatCompactUSD(selectedYearData.value, selectedYear)})
            </span>
          )}
        </span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="font-semibold">
          Avg risk{' '}
          <span className={selectedYearData && selectedYearData.avgRisk > 15 ? 'text-risk-high' : ''}>
            {selectedYearData ? `${selectedYearData.avgRisk.toFixed(1)}%` : '--'}
          </span>
        </span>
        {selectedYearData && (
          <>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-text-muted font-normal text-xs">
              DA {selectedYearData.directAwardPct.toFixed(0)}%
            </span>
            <span className="text-border hidden md:inline">|</span>
            <span className="text-text-muted font-normal text-xs hidden md:inline">
              SB {selectedYearData.singleBidPct.toFixed(0)}%
            </span>
            <span className="text-border hidden lg:inline">|</span>
            <span className="text-text-muted font-normal text-xs hidden lg:inline">
              {formatNumber(selectedYearData.vendorCount)} vendors
            </span>
          </>
        )}
        {yoyChanges && (
          <>
            <span className="text-border hidden sm:inline">|</span>
            <span
              className={`flex items-center gap-0.5 ${yoyChanges.avgRisk <= 0 ? 'text-risk-low' : 'text-risk-high'}`}
            >
              {yoyChanges.avgRisk <= 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {yoyChanges.avgRisk >= 0 ? '+' : ''}
              {yoyChanges.avgRisk.toFixed(1)} pts YoY
            </span>
          </>
        )}
      </div>

      {/* Row 1: Historical Trends + Procurement Health Indicators */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 1: Historical Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historical Trends
            </CardTitle>
            <CardDescription className="text-xs">
              Contract volume and avg risk, 2002-2025
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
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
                          style: { fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' },
                        }}
                      />
                    ))}
                    {electionEvents.map((event) => (
                      <ReferenceLine
                        key={event.id}
                        x={event.year}
                        stroke={RISK_COLORS.high}
                        strokeDasharray="3 3"
                        yAxisId="left"
                      />
                    ))}
                    <ReferenceLine
                      x={2010}
                      yAxisId="left"
                      stroke="var(--color-text-muted)"
                      strokeDasharray="4 2"
                      strokeOpacity={0.5}
                      label={{
                        value: 'Bundled data',
                        position: 'insideTopRight',
                        style: { fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' },
                      }}
                    />
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
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Procurement Transparency Pulse */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Procurement Transparency Pulse
            </CardTitle>
            <CardDescription className="text-xs">
              Layered health metrics — darker fill = less transparent procurement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradDA2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="gradSB2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={RISK_COLORS.medium} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={RISK_COLORS.medium} stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="gradHR2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={RISK_COLORS.high} stopOpacity={0.55} />
                        <stop offset="95%" stopColor={RISK_COLORS.high} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.15} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)', strokeOpacity: 0.3 }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceArea y1={50} y2={100} fill={RISK_COLORS.high} fillOpacity={0.03} />
                    <ReferenceLine
                      y={50}
                      stroke={RISK_COLORS.high}
                      strokeDasharray="6 4"
                      strokeOpacity={0.3}
                      label={{
                        value: 'Majority',
                        position: 'right',
                        style: { fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          const grade =
                            data.opacityIndex < 30 ? 'A' :
                            data.opacityIndex < 40 ? 'B' :
                            data.opacityIndex < 50 ? 'C' :
                            data.opacityIndex < 60 ? 'D' : 'F'
                          const gradeColor =
                            grade === 'A' ? RISK_COLORS.low :
                            grade === 'B' ? '#58a6ff' :
                            grade === 'C' ? RISK_COLORS.medium :
                            grade === 'D' ? RISK_COLORS.high : RISK_COLORS.critical
                          return (
                            <div className="chart-tooltip">
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="font-medium">{data.year}</span>
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                                  style={{ color: gradeColor, background: `${gradeColor}15` }}
                                >
                                  Grade {grade}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#58a6ff' }} />
                                  Direct Award: {data.directAwardPct.toFixed(1)}%
                                </p>
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: RISK_COLORS.medium }} />
                                  Single Bid: {data.singleBidPct.toFixed(1)}%
                                </p>
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: RISK_COLORS.high }} />
                                  High Risk: {data.highRiskPct.toFixed(1)}%
                                </p>
                                <p className="text-xs flex items-center gap-1.5 pt-0.5 border-t border-border/50 mt-1">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#c084fc' }} />
                                  Opacity Index: {data.opacityIndex.toFixed(1)}
                                </p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="directAwardPct"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      fill="url(#gradDA2)"
                      name="Direct Award %"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="singleBidPct"
                      stroke={RISK_COLORS.medium}
                      strokeWidth={2}
                      fill="url(#gradSB2)"
                      name="Single Bid %"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="highRiskPct"
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      fill="url(#gradHR2)"
                      name="High Risk %"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="opacityIndex"
                      stroke="#c084fc"
                      strokeWidth={3}
                      dot={{ r: 2.5, fill: '#c084fc', strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: '#c084fc', stroke: '#fff', strokeWidth: 1.5 }}
                      name="Opacity Index"
                      strokeLinecap="round"
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Sector Risk DNA Radar + Sector Landscape Bubble */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 3: Sector Risk DNA Radar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Sector Risk DNA
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {RADAR_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setRadarPreset(p.id)}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-full border transition-colors font-mono',
                      radarPreset === p.id
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'border-border text-text-muted hover:border-text-muted'
                    )}
                  >
                    {t(`trends.radarPresets.${p.id}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">
                {radarShowAll ? 'All 12' : 'Top 6'} sectors, {RADAR_PRESETS.find(p => p.id === radarPreset)?.axes.length ?? 5} dimensions (0-100)
              </CardDescription>
              <button
                onClick={() => { setRadarShowAll(!radarShowAll); setHiddenSectors(new Set()) }}
                className="text-xs text-text-muted hover:text-accent transition-colors font-mono"
              >
                {radarShowAll ? 'Top 6' : 'All 12'}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : radarData.chartData && radarData.sectors.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData.chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--color-border)" opacity={0.4} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickCount={4}
                    />
                    {radarData.sectors.map((sector) => (
                      <Radar
                        key={sector.code}
                        name={sector.name}
                        dataKey={sector.code}
                        stroke={sector.color}
                        fill={sector.color}
                        fillOpacity={hiddenSectors.has(sector.code) ? 0 : 0.1}
                        strokeWidth={hiddenSectors.has(sector.code) ? 0 : 1.5}
                        strokeOpacity={hiddenSectors.has(sector.code) ? 0 : 1}
                      />
                    ))}
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const visible = payload.filter((p: any) => !hiddenSectors.has(p.dataKey as string))
                          if (!visible.length) return null
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs mb-1">{label}</p>
                              {visible.map((p: any) => (
                                <p
                                  key={p.name}
                                  className="text-xs flex items-center gap-1.5"
                                  style={{ color: p.color }}
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  {p.name}: {p.value}
                                </p>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 -mt-2">
                  {radarData.sectors.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => setHiddenSectors((prev) => {
                        const next = new Set(prev)
                        if (next.has(s.code)) next.delete(s.code)
                        else next.add(s.code)
                        return next
                      })}
                      className={cn(
                        'flex items-center gap-1 text-xs transition-opacity cursor-pointer',
                        hiddenSectors.has(s.code) ? 'opacity-30' : 'opacity-100'
                      )}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-text-muted">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">No sector data</p>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Sector Landscape Bubble */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Sector Landscape
            </CardTitle>
            <CardDescription className="text-xs">
              Contracts vs avg risk per sector (bubble size = total value)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : sectorBubbleData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Contracts"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                      label={{ value: 'Contracts', position: 'insideBottom', offset: -10, style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Avg Risk %"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      label={{ value: 'Avg Risk %', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 800]} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs" style={{ color: data.color }}>
                                {data.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.x)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Avg Risk: {data.y.toFixed(1)}%
                              </p>
                              <p className="text-xs text-text-muted">
                                Value: {formatCompactMXN(data.value)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Vendors: {formatNumber(data.vendors)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter data={sectorBubbleData} fill="#58a6ff">
                      {sectorBubbleData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={1} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 -mt-1">
                  {sectorBubbleData.map((s) => (
                    <span key={s.code} className="flex items-center gap-1 text-xs text-text-muted">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">No sector data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Monthly Patterns + Market Structure */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 5: Monthly Patterns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {selectedYear} Monthly Patterns
            </CardTitle>
            <CardDescription className="text-xs">
              Volume, direct award %, and risk by month
              {monthlyBreakdown?.december_spike != null && (
                <span className="ml-1 text-risk-high">
                  (Dec spike: {monthlyBreakdown.december_spike.toFixed(1)}x)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[280px]" />
            ) : monthlyChartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(m) =>
                        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
                      }
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs">
                                {data.month_name} {selectedYear}
                              </p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.contracts)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Value: {formatCompactMXN(data.value)}
                              </p>
                              <p className="text-xs text-text-muted">
                                DA%: {data.da_pct.toFixed(1)}%
                              </p>
                              <p className="text-xs text-text-muted">
                                Avg Risk: {data.avg_risk.toFixed(1)}%
                              </p>
                              {data.isYearEnd && (
                                <p className="text-xs text-risk-high mt-1">Year-end spending</p>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar yAxisId="left" dataKey="contracts" radius={[2, 2, 0, 0]}>
                      {monthlyChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.isYearEnd ? RISK_COLORS.high : 'var(--color-accent)'}
                          opacity={0.7}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="da_pct"
                      stroke="var(--color-text-muted)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      name="DA%"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_risk"
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      dot={false}
                      name="Avg Risk"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">
                No monthly data for {selectedYear}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chart 6: Market Dynamics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Market Dynamics
            </CardTitle>
            <CardDescription className="text-xs">
              Vendor pool size (area) and contracts per vendor (line) — rising line = market concentrating
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradVendors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.15} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)', strokeOpacity: 0.3 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#c084fc', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(v) => `${v.toFixed(0)}`}
                      domain={[0, 'auto']}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: 'contracts/vendor',
                        angle: -90,
                        position: 'insideRight',
                        style: { fill: '#c084fc', fontSize: 10, fontFamily: 'var(--font-mono)' },
                        offset: 10,
                      }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          const cpv = data.contractsPerVendor
                          const concentrationLabel =
                            cpv > 6 ? 'Concentrated' :
                            cpv > 3 ? 'Moderate' : 'Diverse'
                          const concentrationColor =
                            cpv > 6 ? RISK_COLORS.high :
                            cpv > 3 ? RISK_COLORS.medium : RISK_COLORS.low
                          return (
                            <div className="chart-tooltip">
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="font-medium">{data.year}</span>
                                <span
                                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                                  style={{ color: concentrationColor, background: `${concentrationColor}15` }}
                                >
                                  {concentrationLabel}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#58a6ff' }} />
                                  Vendors: {formatNumber(data.vendorCount)}
                                </p>
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--color-text-muted)' }} />
                                  Institutions: {formatNumber(data.institutionCount)}
                                </p>
                                <p className="text-xs flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full inline-block opacity-50" />
                                  Contracts: {formatNumber(data.contracts)}
                                </p>
                                <p className="text-xs flex items-center gap-1.5 pt-0.5 border-t border-border/50 mt-1 font-medium" style={{ color: '#c084fc' }}>
                                  <span className="w-2 h-2 rounded inline-block" style={{ background: '#c084fc' }} />
                                  {cpv.toFixed(1)} contracts/vendor
                                </p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="vendorCount"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      fill="url(#gradVendors)"
                      name="Active Vendors"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="institutionCount"
                      stroke="var(--color-text-muted)"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      dot={false}
                      name="Institutions"
                      strokeOpacity={0.5}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="contractsPerVendor"
                      stroke="#c084fc"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#c084fc', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#c084fc', stroke: '#fff', strokeWidth: 1.5 }}
                      name="Contracts/Vendor"
                      strokeLinecap="round"
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Footer */}
      {allEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5 text-text-muted">
              <Flag className="h-3.5 w-3.5" />
              Key Events
              {yearEvents.length > 0 && (
                <Badge variant="outline" className="text-xs px-1 py-0 ml-1">
                  {yearEvents.length} in {selectedYear}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="max-h-[140px]">
              <div className="space-y-1.5">
                {yearEvents.map((event) => {
                  const IconComp = EVENT_ICONS[event.type] ?? Flag
                  const borderClass = EVENT_BORDER_COLORS[event.type] ?? 'border-l-[#58a6ff]'
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'pl-3 py-1.5 border-l-2 rounded-r',
                        borderClass,
                        event.impact === 'high' && 'bg-background-elevated/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <IconComp className="h-3 w-3 text-text-muted shrink-0" />
                        <span className="text-xs font-medium truncate">{event.title}</span>
                        {event.impact === 'high' && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 bg-risk-high/10 border-risk-high/30 text-risk-high shrink-0"
                          >
                            High
                          </Badge>
                        )}
                        <span className="text-xs text-text-muted shrink-0 ml-auto">{event.date}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 pl-5 line-clamp-1">{event.description}</p>
                    </div>
                  )
                })}
                {yearEvents.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-2">
                    No events for {selectedYear}
                  </p>
                )}
                {/* Other years — horizontal compact */}
                {allEvents.filter((e) => e.year !== selectedYear).length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border/50">
                    <div className="flex flex-wrap gap-1">
                      {allEvents
                        .filter((e) => e.year !== selectedYear)
                        .slice(0, 8)
                        .map((event) => {
                          const IconComp = EVENT_ICONS[event.type] ?? Flag
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedYear(event.year)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:bg-background-elevated transition-colors border border-border/30"
                            >
                              <IconComp className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{event.title}</span>
                              <span className="font-mono">{event.year}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
