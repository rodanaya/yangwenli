/**
 * TrendsTab — Procurement trends, sector radar, bubble charts, monthly patterns, and market dynamics.
 */

import { useState, useMemo, useRef } from 'react'
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
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
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
  EditorialComposedChart,
  EditorialRadarChart,
  EditorialScatterChart,
  type ComposedLayer,
  type RadarSeries,
  type ChartAnnotation,
  type ColorToken,
} from '@/components/charts/editorial'
import { DotStrip } from '@/components/charts/DotStrip'

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
  const { t, i18n } = useTranslation('explore')
  const { t: ts } = useTranslation('sectors')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [selectedYear, setSelectedYear] = useState(2024)
  const [radarPreset, setRadarPreset] = useState<RadarPreset>('risk')
  const [radarShowAll, setRadarShowAll] = useState(false)
  const [hiddenSectors, setHiddenSectors] = useState<Set<string>>(new Set())

  // Chart refs for export
  const historicalChartRef = useRef<HTMLDivElement>(null)
  const transparencyChartRef = useRef<HTMLDivElement>(null)
  const radarChartRef = useRef<HTMLDivElement>(null)
  const bubbleChartRef = useRef<HTMLDivElement>(null)
  const monthlyChartRef = useRef<HTMLDivElement>(null)
  const marketChartRef = useRef<HTMLDivElement>(null)

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
        name: ts(SECTORS.find((sec) => sec.id === s.sector_id)?.code ?? s.sector_code),
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
  }, [sectorData, radarPreset, radarShowAll, ts])

  // Sector bubble data for landscape scatter chart
  const sectorBubbleData = useMemo(() => {
    if (!sectorData?.data) return []
    const maxValue = Math.max(...sectorData.data.map((s) => s.total_value_mxn || 1))
    return sectorData.data.map((s) => ({
      name: ts(SECTORS.find((sec) => sec.id === s.sector_id)?.code ?? s.sector_code),
      code: s.sector_code,
      x: s.total_contracts,
      y: (s.avg_risk_score ?? 0) * 100,
      z: Math.max(((s.total_value_mxn || 0) / maxValue) * 800, 60),
      value: s.total_value_mxn,
      vendors: s.total_vendors,
      color: SECTOR_COLORS[s.sector_code] ?? '#64748b',
    }))
  }, [sectorData, ts])

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historical Trends
                </CardTitle>
                <CardDescription className="text-xs">
                  Contract volume and avg risk, 2002-2025
                </CardDescription>
              </div>
              <ChartDownloadButton targetRef={historicalChartRef} filename="rubli-historical-trends" />
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div ref={historicalChartRef}>
                {(() => {
                  const annotations: ChartAnnotation[] = [
                    ...ADMINISTRATIONS.map<ChartAnnotation>((a) => ({
                      kind: 'band', x1: a.start, x2: a.end, label: a.name, tone: 'admin',
                    })),
                    ...electionEvents.map<ChartAnnotation>((e) => ({
                      kind: 'vrule', x: e.year, label: '', tone: 'warn',
                    })),
                    { kind: 'vrule', x: 2010, label: 'Bundled data', tone: 'info' },
                  ]
                  const layers: ComposedLayer<typeof timelineData[number]>[] = [
                    { kind: 'line', key: 'avgRisk', label: 'Avg Risk %', colorToken: 'risk-high', axis: 'right' },
                  ]
                  return (
                    <EditorialComposedChart
                      data={timelineData}
                      xKey="year"
                      layers={layers}
                      yFormat="integer"
                      rightYFormat="pct"
                      rightYDomain={[0, 50]}
                      annotations={annotations}
                      height={280}
                    />
                  )
                })()}
                <div className="mt-3">
                  <DotStrip
                    data={timelineData.map((d) => ({
                      label: String(d.year),
                      value: d.contracts,
                      color: 'var(--color-accent)',
                    }))}
                    formatVal={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Procurement Transparency Pulse */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Procurement Transparency Pulse
                </CardTitle>
                <CardDescription className="text-xs">
                  Layered health metrics — darker fill = less transparent procurement
                </CardDescription>
              </div>
              <ChartDownloadButton targetRef={transparencyChartRef} filename="rubli-transparency-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div ref={transparencyChartRef}>
                {(() => {
                  const annotations: ChartAnnotation[] = [
                    { kind: 'hrule', y: 50, label: 'Majority', tone: 'warn' },
                  ]
                  const layers: ComposedLayer<typeof timelineData[number]>[] = [
                    { kind: 'area', key: 'directAwardPct', label: 'Direct Award %', colorToken: 'accent-data' },
                    { kind: 'area', key: 'singleBidPct', label: 'Single Bid %', colorToken: 'risk-medium' },
                    { kind: 'area', key: 'highRiskPct', label: 'High Risk %', colorToken: 'risk-high' },
                    { kind: 'line', key: 'opacityIndex', label: 'Opacity Index', colorToken: 'sector-tecnologia' },
                  ]
                  return (
                    <EditorialComposedChart
                      data={timelineData}
                      xKey="year"
                      layers={layers}
                      yFormat="pct"
                      yDomain={[0, 100]}
                      annotations={annotations}
                      height={280}
                    />
                  )
                })()}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setRadarShowAll(!radarShowAll); setHiddenSectors(new Set()) }}
                  className="text-xs text-text-muted hover:text-accent transition-colors font-mono"
                >
                  {radarShowAll ? 'Top 6' : 'All 12'}
                </button>
                <ChartDownloadButton targetRef={radarChartRef} filename="rubli-sector-risk-dna" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : radarData.chartData && radarData.sectors.length > 0 ? (
              <div ref={radarChartRef}>
                {(() => {
                  const visibleSectors = radarData.sectors.filter((s) => !hiddenSectors.has(s.code))
                  const axes = radarData.axes.map((a) => a.label)
                  const series: RadarSeries[] = visibleSectors.map((s) => ({
                    name: s.name,
                    colorToken: `sector-${s.code}` as ColorToken,
                    values: Object.fromEntries(
                      radarData.axes.map((a) => [
                        a.label,
                        Number((s.values[a.key as keyof typeof s.values] ?? 0).toFixed(1)),
                      ])
                    ),
                  }))
                  return (
                    <EditorialRadarChart
                      axes={axes}
                      series={series}
                      valueDomain={[0, 100]}
                      height={300}
                    />
                  )
                })()}
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
              <div className="py-12 text-center">
                <p className="text-sm text-text-muted">
                  {lang === 'en' ? 'No sector data for this slice.' : 'Sin datos de sector para este corte.'}
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  {lang === 'en'
                    ? 'Adjust the year range or metric type.'
                    : 'Ajusta el rango de años o el tipo de métrica.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Sector Landscape Bubble */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Sector Landscape
                </CardTitle>
                <CardDescription className="text-xs">
                  Contracts vs avg risk per sector (bubble size = total value)
                </CardDescription>
              </div>
              <ChartDownloadButton targetRef={bubbleChartRef} filename="rubli-sector-landscape" />
            </div>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : sectorBubbleData.length > 0 ? (
              <div ref={bubbleChartRef}>
                <EditorialScatterChart
                  data={sectorBubbleData}
                  xKey="x"
                  yKey="y"
                  sizeKey="z"
                  colorBy={(row) => `sector-${row.code}` as ColorToken}
                  xFormat="integer"
                  yFormat="pct"
                  xLabel="Contracts"
                  yLabel="Avg Risk %"
                  height={300}
                />
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
              <div className="py-12 text-center">
                <p className="text-sm text-text-muted">
                  {lang === 'en' ? 'No sector data for this slice.' : 'Sin datos de sector para este corte.'}
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  {lang === 'en'
                    ? 'Adjust the year range or metric type.'
                    : 'Ajusta el rango de años o el tipo de métrica.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Monthly Patterns + Market Structure */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 5: Monthly Patterns */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
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
              </div>
              <ChartDownloadButton targetRef={monthlyChartRef} filename={`rubli-monthly-patterns-${selectedYear}`} />
            </div>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[280px]" />
            ) : monthlyChartData.length > 0 ? (
              <div ref={monthlyChartRef}>
                {(() => {
                  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  const layers: ComposedLayer<typeof monthlyChartData[number]>[] = [
                    { kind: 'line', key: 'da_pct', label: 'DA%', colorToken: 'neutral', style: 'dashed', emphasis: 'secondary', axis: 'right' },
                    { kind: 'line', key: 'avg_risk', label: 'Avg Risk', colorToken: 'risk-high', axis: 'right' },
                  ]
                  return (
                    <EditorialComposedChart
                      data={monthlyChartData}
                      xKey="month"
                      layers={layers}
                      yFormat="integer"
                      rightYFormat="pct"
                      rightYDomain={[0, 100]}
                      xTickFormatter={(m) => monthLabels[(Number(m) || 1) - 1] ?? String(m)}
                      height={280}
                    />
                  )
                })()}
                <div className="mt-3">
                  <DotStrip
                    data={monthlyChartData.map((entry) => ({
                      label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][(entry.month ?? 1) - 1] ?? String(entry.month ?? ''),
                      value: entry.contracts ?? 0,
                      color: entry.isYearEnd ? RISK_COLORS.high : 'var(--color-accent)',
                    }))}
                    formatVal={(v) => Number(v).toLocaleString()}
                  />
                </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Market Dynamics
                </CardTitle>
                <CardDescription className="text-xs">
                  Vendor pool size (area) and contracts per vendor (line) — rising line = market concentrating
                </CardDescription>
              </div>
              <ChartDownloadButton targetRef={marketChartRef} filename="rubli-market-dynamics" />
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div ref={marketChartRef}>
                {(() => {
                  const layers: ComposedLayer<typeof timelineData[number]>[] = [
                    { kind: 'area', key: 'vendorCount', label: 'Active Vendors', colorToken: 'accent-data', axis: 'left' },
                    { kind: 'line', key: 'institutionCount', label: 'Institutions', colorToken: 'neutral', style: 'dashed', emphasis: 'secondary', axis: 'left' },
                    { kind: 'line', key: 'contractsPerVendor', label: 'Contracts/Vendor', colorToken: 'sector-tecnologia', axis: 'right' },
                  ]
                  return (
                    <EditorialComposedChart
                      data={timelineData}
                      xKey="year"
                      layers={layers}
                      yFormat="integer"
                      rightYFormat="decimal"
                      height={280}
                    />
                  )
                })()}
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
