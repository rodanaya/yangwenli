import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
} from 'recharts'
import { analysisApi } from '@/api/client'
import type { SectorYearItem } from '@/api/types'
import { SECTORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constants — Seismograph waveform
// ---------------------------------------------------------------------------

const DISPLAYED_SECTORS = [1, 4, 3, 8, 2, 6, 7] as const

const SECTOR_NAMES: Record<number, string> = {
  1: 'SALUD',
  2: 'EDUCACION',
  3: 'INFRAEST.',
  4: 'ENERGIA',
  5: 'DEFENSA',
  6: 'TECNOLOGIA',
  7: 'HACIENDA',
  8: 'GOBERNACION',
  9: 'AGRICULTURA',
  10: 'AMBIENTE',
  11: 'TRABAJO',
  12: 'OTROS',
}

const SECTOR_ID_TO_CODE: Record<number, string> = {}
for (const s of SECTORS) SECTOR_ID_TO_CODE[s.id] = s.code

const SECTOR_ID_TO_COLOR: Record<number, string> = {}
for (const s of SECTORS) SECTOR_ID_TO_COLOR[s.id] = s.color

const SEXENIOS = [
  { name: 'Fox', start: 2001, end: 2006, color: '#dbeafe' },
  { name: 'Calderón', start: 2007, end: 2012, color: '#fef9c3' },
  { name: 'Peña Nieto', start: 2013, end: 2018, color: '#fee2e2' },
  { name: 'AMLO', start: 2019, end: 2024, color: '#dcfce7' },
  { name: 'Sheinbaum', start: 2025, end: 2030, color: '#ede9fe' },
] as const

const ELECTION_YEARS = [2006, 2009, 2012, 2015, 2018, 2021, 2024] as const

const SCANDAL_EVENTS_BASE = [
  { year: 2017, labelKey: 'scandalEvents.laEstafaMaestra', color: '#ef4444' },
  { year: 2019, labelKey: 'scandalEvents.casoLozoya', color: '#ef4444' },
  { year: 2020, labelKey: 'scandalEvents.comprasCovid', color: '#f97316' },
  { year: 2021, labelKey: 'scandalEvents.segalmexEscandalo', color: '#ef4444' },
] as const

const BG_COLOR = '#060a12'
const CHANNEL_HEIGHT = 90
const LABEL_WIDTH = 140
const YEAR_MIN = 2010
const YEAR_MAX = 2025
const TOP_PADDING = 24
const BOTTOM_PADDING = 52
const RIGHT_PADDING = 20

// Month abbreviations for charts
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ---------------------------------------------------------------------------
// Catmull-Rom spline interpolation
// ---------------------------------------------------------------------------

interface Point { x: number; y: number }

function catmullRomToBezierPath(points: Point[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

// ---------------------------------------------------------------------------
// Data processing (waveform)
// ---------------------------------------------------------------------------

interface ChannelData {
  sectorId: number
  sectorName: string
  color: string
  points: Point[]
  pathD: string
  baselineY: number
  yearValues: Map<number, { highRiskPct: number; contracts: number; totalValue: number; avgRisk: number }>
}

function processData(items: SectorYearItem[], chartWidth: number): { channels: ChannelData[]; years: number[] } {
  const years: number[] = []
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) years.push(y)
  const xScale = (year: number) => ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * chartWidth

  const bySector = new Map<number, Map<number, SectorYearItem>>()
  for (const item of items) {
    if (item.year < YEAR_MIN || item.year > YEAR_MAX) continue
    if (!bySector.has(item.sector_id)) bySector.set(item.sector_id, new Map())
    bySector.get(item.sector_id)!.set(item.year, item)
  }

  const sectorDevs = new Map<number, Map<number, number>>()
  let globalMaxDev = 0
  for (const sectorId of DISPLAYED_SECTORS) {
    const sectorData = bySector.get(sectorId)
    if (!sectorData) continue
    const pcts: number[] = []
    for (const year of years) { const item = sectorData.get(year); if (item) pcts.push(item.high_risk_pct) }
    if (pcts.length === 0) continue
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
    const devMap = new Map<number, number>()
    for (const year of years) {
      const item = sectorData.get(year)
      const dev = item ? item.high_risk_pct - mean : 0
      devMap.set(year, dev)
      globalMaxDev = Math.max(globalMaxDev, Math.abs(dev))
    }
    sectorDevs.set(sectorId, devMap)
  }
  if (globalMaxDev === 0) globalMaxDev = 1

  const channels: ChannelData[] = []
  let channelIndex = 0
  for (const sectorId of DISPLAYED_SECTORS) {
    const devMap = sectorDevs.get(sectorId)
    const sectorData = bySector.get(sectorId)
    if (!devMap) continue
    const baselineY = TOP_PADDING + channelIndex * CHANNEL_HEIGHT + CHANNEL_HEIGHT / 2
    const yearValues = new Map<number, { highRiskPct: number; contracts: number; totalValue: number; avgRisk: number }>()
    const points: Point[] = []
    for (const year of years) {
      const dev = devMap.get(year) ?? 0
      const yOffset = -(dev / globalMaxDev) * (CHANNEL_HEIGHT * 0.38)
      points.push({ x: xScale(year), y: baselineY + yOffset })
      const item = sectorData?.get(year)
      if (item) yearValues.set(year, { highRiskPct: item.high_risk_pct, contracts: item.contracts, totalValue: item.total_value, avgRisk: item.avg_risk })
    }
    channels.push({ sectorId, sectorName: SECTOR_NAMES[sectorId] ?? `SECTOR ${sectorId}`, color: SECTOR_ID_TO_COLOR[sectorId] ?? '#64748b', points, pathD: catmullRomToBezierPath(points), baselineY, yearValues })
    channelIndex++
  }
  return { channels, years }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtB(v: number): string {
  if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}B MXN`
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}Mil MXN`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M MXN`
  return v.toLocaleString('es-MX')
}

function fmtPct(v: number, decimals = 1): string { return `${v.toFixed(decimals)}%` }

// Risk color based on avg_risk score
function riskColor(score: number): string {
  if (score >= 0.6) return '#ef4444'
  if (score >= 0.4) return '#f97316'
  if (score >= 0.25) return '#eab308'
  return '#22c55e'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  sub: string
  accent: string
  delay?: number
}
function StatCard({ label, value, sub, accent, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border px-5 py-4 flex flex-col gap-1"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{label}</span>
      <span className="font-mono text-2xl font-bold" style={{ color: accent }}>{value}</span>
      <span className="font-mono text-[11px] text-white/40 leading-snug">{sub}</span>
    </motion.div>
  )
}

// Custom Recharts tooltip
interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string; unit?: string }>
  label?: string | number
}

function MonthlyTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border px-3 py-2.5 shadow-2xl" style={{ background: 'rgba(6,10,18,0.95)', borderColor: 'rgba(255,255,255,0.08)', minWidth: 160 }}>
      <div className="font-mono text-[10px] text-white/40 tracking-widest mb-2 uppercase">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? '#64748b' }} />
            <span className="font-mono text-[10px] text-white/55">{p.name}</span>
          </div>
          <span className="font-mono text-[11px] text-white/80 tabular-nums">
            {typeof p.value === 'number' && p.name?.includes('Valor')
              ? fmtB(p.value)
              : typeof p.value === 'number' && (p.name?.includes('Riesgo') || p.name?.includes('Prima'))
              ? fmtPct(p.value * 100)
              : typeof p.value === 'number'
              ? p.value.toLocaleString()
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SpikeTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const ratio = payload[0]?.value as number
  return (
    <div className="rounded-lg border px-3 py-2 shadow-2xl" style={{ background: 'rgba(6,10,18,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="font-mono text-[10px] text-white/40 tracking-widest mb-1">{label}</div>
      <div className="font-mono text-sm font-bold" style={{ color: ratio > 2 ? '#ef4444' : ratio > 1.5 ? '#f97316' : '#eab308' }}>
        {ratio.toFixed(2)}x el promedio
      </div>
      {ratio > 2 && <div className="font-mono text-[10px] text-red-400/70 mt-1">Pico extremo</div>}
      {ratio > 1.5 && ratio <= 2 && <div className="font-mono text-[10px] text-orange-400/70 mt-1">Pico significativo</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Seismograph() {
  const { t } = useTranslation('seismograph')
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = useState(900)
  const [tooltipData, setTooltipData] = useState<{ x: number; year: number; entries: { sectorName: string; color: string; highRiskPct: number; contracts: number }[] } | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Data queries
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['sector-year-breakdown-seismo'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: decemberData } = useQuery({
    queryKey: ['december-spike'],
    queryFn: () => analysisApi.getDecemberSpike(2015, 2024),
    staleTime: 30 * 60 * 1000,
  })

  const { data: monthlyRiskData } = useQuery({
    queryKey: ['monthly-risk-summary'],
    queryFn: () => analysisApi.getMonthlyRiskSummary(),
    staleTime: 30 * 60 * 1000,
  })

  const { data: yoyData } = useQuery({
    queryKey: ['year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setSvgWidth(w)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const chartWidth = Math.max(100, svgWidth - LABEL_WIDTH - RIGHT_PADDING)
  const svgHeight = TOP_PADDING + DISPLAYED_SECTORS.length * CHANNEL_HEIGHT + BOTTOM_PADDING

  const { channels, years } = useMemo(() => {
    if (!rawData?.data) return { channels: [], years: [] }
    return processData(rawData.data, chartWidth)
  }, [rawData, chartWidth])

  const yearX = useCallback((year: number) => {
    const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)
    return LABEL_WIDTH + t * chartWidth
  }, [chartWidth])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const chartX = e.clientX - rect.left - LABEL_WIDTH
    if (chartX < 0 || chartX > chartWidth) { setTooltipData(null); return }
    const yearFrac = (chartX / chartWidth) * (YEAR_MAX - YEAR_MIN) + YEAR_MIN
    const year = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(yearFrac)))
    const entries = channels.flatMap((ch) => {
      const val = ch.yearValues.get(year)
      return val ? [{ sectorName: ch.sectorName, color: ch.color, highRiskPct: val.highRiskPct, contracts: val.contracts }] : []
    })
    setTooltipData({ x: yearX(year), year, entries })
  }, [channels, chartWidth, yearX])

  const handleMouseLeave = useCallback(() => setTooltipData(null), [])

  // ---------------------------------------------------------------------------
  // Derived stats for the data-story section
  // ---------------------------------------------------------------------------

  const decemberStats = useMemo(() => {
    if (!decemberData) return null
    const avg = decemberData.average_spike_ratio
    const pctAboveAverage = avg > 1 ? ((avg - 1) * 100) : 0
    const worstYear = [...(decemberData.years ?? [])].sort((a, b) => (b.spike_ratio ?? 0) - (a.spike_ratio ?? 0))[0]
    return { avg, pctAboveAverage, worstYear, significant: decemberData.years_with_significant_spike }
  }, [decemberData])

  const monthlyRiskStats = useMemo(() => {
    if (!monthlyRiskData?.data) return null
    const months = monthlyRiskData.data
    const dec = months.find((m) => m.month === 12)
    const riskiest = [...months].sort((a, b) => b.avg_risk - a.avg_risk)[0]
    const safest = [...months].sort((a, b) => a.avg_risk - b.avg_risk)[0]
    // Quarter averages
    const quarters = [
      { q: 'Q1', label: 'Ene–Mar', months: [1, 2, 3] },
      { q: 'Q2', label: 'Abr–Jun', months: [4, 5, 6] },
      { q: 'Q3', label: 'Jul–Sep', months: [7, 8, 9] },
      { q: 'Q4', label: 'Oct–Dic', months: [10, 11, 12] },
    ].map(({ q, label, months: mns }) => {
      const items = months.filter((m) => mns.includes(m.month))
      const avgRisk = items.reduce((s, m) => s + m.avg_risk, 0) / Math.max(1, items.length)
      return { q, label, avgRisk }
    })
    return { dec, riskiest, safest, quarters, overall: monthlyRiskData.overall_avg_risk }
  }, [monthlyRiskData])

  // YoY data shaped for the spike timeline bar chart
  const spikeChartData = useMemo(() => {
    if (!decemberData?.years) return []
    return decemberData.years.map((y) => ({
      year: y.year,
      ratio: y.spike_ratio ?? 0,
      significant: y.is_significant,
    }))
  }, [decemberData])

  // Monthly risk chart data (cross-year average)
  const monthlyRiskChartData = useMemo(() => {
    if (!monthlyRiskData?.data) return []
    return monthlyRiskData.data.map((m) => ({
      name: MONTH_SHORT[m.month - 1],
      month: m.month,
      riskPremium: m.risk_premium_pct,
      avgRisk: m.avg_risk,
      overallAvg: m.overall_avg_risk,
      contracts: m.contract_count,
    }))
  }, [monthlyRiskData])

  // Administration comparison from YoY data
  const adminData = useMemo(() => {
    if (!yoyData?.data) return []
    const rows = yoyData.data as Array<{ year: number; high_risk_pct: number; direct_award_pct: number; total_value: number }>
    return SEXENIOS.map((sx) => {
      const slice = rows.filter((r) => r.year >= sx.start && r.year <= sx.end)
      if (slice.length === 0) return null
      const avgRisk = slice.reduce((s, r) => s + (r.high_risk_pct ?? 0), 0) / slice.length
      const avgDA = slice.reduce((s, r) => s + (r.direct_award_pct ?? 0), 0) / slice.length
      const totalVal = slice.reduce((s, r) => s + (r.total_value ?? 0), 0)
      return { name: sx.name, avgRisk, avgDA, totalVal, color: sx.color, years: `${sx.start}–${sx.end}` }
    }).filter(Boolean) as Array<{ name: string; avgRisk: number; avgDA: number; totalVal: number; color: string; years: string }>
  }, [yoyData])

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_COLOR }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="font-mono text-xs text-white/40 tracking-widest uppercase">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_COLOR }}>
        <p className="font-mono text-sm text-red-400">{t('error')}</p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen" style={{ background: BG_COLOR }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-10 pb-4 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-2">
            {t('eyebrow')}
          </p>
          <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-[0.3em] text-white/90">
            {t('title')}
          </h1>
          <div className="mt-2 h-px bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
          <p className="mt-3 font-mono text-[11px] text-white/35 tracking-[0.15em] uppercase leading-relaxed">
            {t('subtitle')}
            <span className="text-white/15 mx-2">&middot;</span>
            {t('dateRange')}
            <span className="text-white/15 mx-2">&middot;</span>
            {t('system')}
          </p>
          <p className="mt-2 font-mono text-[11px] text-white/50 leading-relaxed max-w-2xl">
            {t('description')}
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div
          className="mt-5 flex flex-wrap gap-x-5 gap-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {channels.map((ch) => (
            <div key={ch.sectorId} className="flex items-center gap-1.5">
              <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: ch.color, boxShadow: `0 0 6px ${ch.color}60` }} />
              <span className="font-mono text-[10px] tracking-wider" style={{ color: `${ch.color}99` }}>{ch.sectorName}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-3 h-3 rounded-sm bg-red-500/15 border border-red-500/30" />
            <span className="font-mono text-[10px] tracking-wider text-red-400/50">{t('legend.scandal')}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(219,234,254,0.25)', border: '1px solid rgba(219,234,254,0.2)' }} />
            <span className="font-mono text-[10px] tracking-wider text-white/30">sexenio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
            <span className="font-mono text-[10px] tracking-wider text-amber-400/50">año electoral</span>
          </div>
        </motion.div>
      </div>

      {/* ── SEISMOGRAPH SVG ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 max-w-[1400px] mx-auto relative" ref={containerRef}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
          <svg
            width="100%"
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="overflow-visible select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label={t('aria.chartLabel')}
          >
            <defs>
              {channels.map((ch) => {
                const code = SECTOR_ID_TO_CODE[ch.sectorId] ?? 'default'
                return (
                  <filter key={code} id={`glow-${code}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                )
              })}
            </defs>

            {/* Sexenio background bands */}
            {SEXENIOS.map((sx) => {
              const clampedStart = Math.max(sx.start, YEAR_MIN)
              const clampedEnd = Math.min(sx.end, YEAR_MAX)
              if (clampedStart >= clampedEnd) return null
              const x1 = yearX(clampedStart); const x2 = yearX(clampedEnd)
              return (
                <g key={sx.name}>
                  <rect x={x1} y={0} width={x2 - x1} height={svgHeight - BOTTOM_PADDING + 8} fill={sx.color} opacity={0.04} />
                  <text x={(x1 + x2) / 2} y={svgHeight - BOTTOM_PADDING + 35} textAnchor="middle" fill={sx.color} opacity={0.5} fontSize={8} fontFamily="monospace" letterSpacing="0.06em">{sx.name}</text>
                </g>
              )
            })}

            {/* Scandal bands */}
            {SCANDAL_EVENTS_BASE.map((evt) => {
              const cx = yearX(evt.year)
              const bandWidth = chartWidth / (YEAR_MAX - YEAR_MIN) * 0.7
              const evtLabel = t(evt.labelKey)
              return (
                <g key={evt.year}>
                  <rect x={cx - bandWidth / 2} y={0} width={bandWidth} height={svgHeight - BOTTOM_PADDING + 8} fill={evt.color} opacity={0.06} rx={2} />
                  <line x1={cx} y1={0} x2={cx} y2={svgHeight - BOTTOM_PADDING + 8} stroke={evt.color} strokeWidth={0.5} opacity={0.2} strokeDasharray="4 4" />
                  {evtLabel.split('\n').map((line, li) => (
                    <text key={li} x={cx + 5} y={14 + li * 12} fill={evt.color} opacity={0.55} fontSize={9} fontFamily="monospace" letterSpacing="0.05em">{line}</text>
                  ))}
                </g>
              )
            })}

            {/* Channel baselines & labels */}
            {channels.map((ch) => (
              <g key={`baseline-${ch.sectorId}`}>
                <line x1={LABEL_WIDTH} y1={ch.baselineY} x2={LABEL_WIDTH + chartWidth} y2={ch.baselineY} stroke="white" strokeWidth={0.3} opacity={0.08} />
                <line x1={LABEL_WIDTH} y1={ch.baselineY - CHANNEL_HEIGHT * 0.38} x2={LABEL_WIDTH + chartWidth} y2={ch.baselineY - CHANNEL_HEIGHT * 0.38} stroke="white" strokeWidth={0.2} opacity={0.03} strokeDasharray="2 6" />
                <line x1={LABEL_WIDTH} y1={ch.baselineY + CHANNEL_HEIGHT * 0.38} x2={LABEL_WIDTH + chartWidth} y2={ch.baselineY + CHANNEL_HEIGHT * 0.38} stroke="white" strokeWidth={0.2} opacity={0.03} strokeDasharray="2 6" />
                <text x={LABEL_WIDTH - 12} y={ch.baselineY + 1} textAnchor="end" dominantBaseline="middle" fill={ch.color} opacity={0.5} fontSize={11} fontFamily="monospace" fontWeight={600} letterSpacing="0.08em">{ch.sectorName}</text>
                <line x1={LABEL_WIDTH - 6} y1={ch.baselineY} x2={LABEL_WIDTH} y2={ch.baselineY} stroke={ch.color} strokeWidth={1} opacity={0.25} />
              </g>
            ))}

            {/* Waveform traces */}
            {channels.map((ch, i) => {
              const code = SECTOR_ID_TO_CODE[ch.sectorId] ?? 'default'
              const offsetPath = ch.pathD.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, xStr, yStr) => `${parseFloat(xStr) + LABEL_WIDTH},${yStr}`)
              return (
                <g key={`trace-${ch.sectorId}`}>
                  <motion.path d={offsetPath} fill="none" stroke={ch.color} strokeWidth={6} opacity={0.2} filter={`url(#glow-${code})`} strokeLinecap="round" strokeLinejoin="round" initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: i * 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
                    {!prefersReducedMotion && <animate attributeName="opacity" values="0.15;0.35;0.15" dur="4s" repeatCount="indefinite" begin={`${i * 0.3}s`} />}
                  </motion.path>
                  <motion.path d={offsetPath} fill="none" stroke={ch.color} strokeWidth={1.5} opacity={0.9} strokeLinecap="round" strokeLinejoin="round" initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: i * 0.2, ease: [0.25, 0.1, 0.25, 1] }} />
                  {ch.points.map((pt, pi) => (
                    <motion.circle key={pi} cx={pt.x + LABEL_WIDTH} cy={pt.y} r={2} fill={ch.color} opacity={0} initial={prefersReducedMotion ? { opacity: 0.5 } : { opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: i * 0.2 + 2.5 + pi * 0.03, duration: 0.3 }} />
                  ))}
                </g>
              )
            })}

            {/* X-axis */}
            {years.map((year) => {
              const cx = yearX(year)
              const isElectionYear = (ELECTION_YEARS as ReadonlyArray<number>).includes(year)
              return (
                <g key={`year-${year}`}>
                  <line x1={cx} y1={svgHeight - BOTTOM_PADDING + 4} x2={cx} y2={svgHeight - BOTTOM_PADDING + 10} stroke={isElectionYear ? '#f59e0b' : 'white'} strokeWidth={isElectionYear ? 1.2 : 0.6} opacity={isElectionYear ? 0.6 : 0.2} />
                  {isElectionYear && <circle cx={cx} cy={svgHeight - BOTTOM_PADDING + 12} r={2} fill="#f59e0b" opacity={0.7} />}
                  <text x={cx} y={svgHeight - BOTTOM_PADDING + 22} textAnchor="middle" fill={isElectionYear ? '#f59e0b' : 'white'} opacity={isElectionYear ? 0.65 : year % 5 === 0 ? 0.4 : 0.2} fontSize={10} fontFamily="monospace" letterSpacing="0.05em">{year}</text>
                </g>
              )
            })}

            <line x1={LABEL_WIDTH} y1={0} x2={LABEL_WIDTH} y2={svgHeight - BOTTOM_PADDING + 10} stroke="white" strokeWidth={0.5} opacity={0.1} />
            <line x1={LABEL_WIDTH} y1={svgHeight - BOTTOM_PADDING + 4} x2={LABEL_WIDTH + chartWidth} y2={svgHeight - BOTTOM_PADDING + 4} stroke="white" strokeWidth={0.5} opacity={0.1} />

            {/* Hover crosshair */}
            {tooltipData && (
              <g>
                <line x1={tooltipData.x} y1={0} x2={tooltipData.x} y2={svgHeight - BOTTOM_PADDING + 4} stroke="white" strokeWidth={0.5} opacity={0.35} strokeDasharray="3 3" />
                {channels.map((ch) => {
                  const yearIdx = tooltipData.year - YEAR_MIN
                  const pt = ch.points[yearIdx]
                  if (!pt) return null
                  return <circle key={`dot-${ch.sectorId}`} cx={pt.x + LABEL_WIDTH} cy={pt.y} r={4} fill={ch.color} stroke={BG_COLOR} strokeWidth={1.5} opacity={0.9} />
                })}
              </g>
            )}
          </svg>

          {/* HTML tooltip */}
          {tooltipData && tooltipData.entries.length > 0 && (
            <div className="absolute pointer-events-none z-50" style={{ left: tooltipData.x + (tooltipData.x > svgWidth * 0.7 ? -200 : 16), top: TOP_PADDING + 20 }}>
              <div className="rounded-lg border px-3 py-2.5 shadow-2xl" style={{ background: 'rgba(6,10,18,0.92)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', minWidth: 170 }}>
                <div className="font-mono text-[10px] text-white/40 tracking-widest mb-2 uppercase">{tooltipData.year}</div>
                {tooltipData.entries.map((e) => (
                  <div key={e.sectorName} className="flex items-center justify-between gap-4 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color, boxShadow: `0 0 4px ${e.color}50` }} />
                      <span className="font-mono text-[10px] text-white/60">{e.sectorName}</span>
                    </div>
                    <span className="font-mono text-[11px] text-white/80 tabular-nums">{(e.highRiskPct * 100).toFixed(1)}%</span>
                  </div>
                ))}
                <div className="mt-1.5 pt-1.5 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-white/25 uppercase">{t('tooltip.totalContracts')}</span>
                    <span className="font-mono text-[10px] text-white/40 tabular-nums">{tooltipData.entries.reduce((s, e) => s + e.contracts, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── DATA STORY SECTION ─────────────────────────────────────────────── */}
      <div className="px-6 pb-16 max-w-[1400px] mx-auto space-y-16">

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── OPENING STAT CARDS ──────────────────────────────────────────── */}
        {decemberStats && monthlyRiskStats && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Hallazgos clave</p>

            {/* Dramatic lede */}
            <div className="rounded-xl border px-6 py-5 mb-6" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.15)' }}>
              <p className="font-mono text-sm text-white/70 leading-relaxed max-w-3xl">
                En diciembre, el gasto en contratos federales sube{' '}
                <span className="text-red-400 font-bold">{fmtPct(decemberStats.pctAboveAverage, 0)}</span>
                {' '}sobre el promedio mensual — un patrón que se repite en{' '}
                <span className="text-red-400 font-bold">{decemberStats.significant} de los últimos {decemberData?.total_years_analyzed ?? '?'} años</span>
                {' '}y es consistente con la presión de liquidar presupuesto antes del cierre fiscal.
                {' '}El peor año registrado fue{' '}
                <span className="text-orange-400 font-bold">{decemberStats.worstYear?.year}</span>
                {', con diciembre '}
                <span className="text-orange-400 font-bold">{decemberStats.worstYear?.spike_ratio?.toFixed(1)}x</span>
                {' '}el promedio del resto del año.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Promedio diciembre vs resto del año"
                value={`${decemberData?.average_spike_ratio?.toFixed(2)}x`}
                sub={`${decemberStats.significant} años con pico significativo (>1.5x)`}
                accent="#ef4444"
                delay={0.9}
              />
              <StatCard
                label="Mes más riesgoso (histórico)"
                value={monthlyRiskStats.riskiest ? MONTH_SHORT[monthlyRiskStats.riskiest.month - 1] : '—'}
                sub={`Riesgo promedio: ${fmtPct((monthlyRiskStats.riskiest?.avg_risk ?? 0) * 100)} — ${fmtPct((monthlyRiskStats.riskiest?.risk_premium_pct ?? 0))} sobre la media`}
                accent="#f97316"
                delay={1.0}
              />
              <StatCard
                label="Mes con menor riesgo"
                value={monthlyRiskStats.safest ? MONTH_SHORT[monthlyRiskStats.safest.month - 1] : '—'}
                sub={`Riesgo promedio: ${fmtPct((monthlyRiskStats.safest?.avg_risk ?? 0) * 100)} — proceso más competitivo`}
                accent="#22c55e"
                delay={1.1}
              />
            </div>
          </motion.section>
        )}

        {/* ── DECEMBER SPIKE TIMELINE ─────────────────────────────────────── */}
        {spikeChartData.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.7 }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Patrón año-final</p>
            <h2 className="font-mono text-lg font-bold text-white/80 mb-2">El pico de diciembre, año por año</h2>
            <p className="font-mono text-[11px] text-white/40 leading-relaxed mb-6 max-w-2xl">
              Cada barra muestra cuántas veces más gasto hubo en diciembre respecto al promedio del resto del año.
              Las barras en rojo superan 1.5x — umbral de pico significativo según criterios OCDE.
              La línea punteada marca el promedio histórico.
            </p>

            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={spikeChartData} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="spikeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="spikeGradNorm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}x`} width={38} />
                <Tooltip content={<SpikeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <ReferenceLine y={1} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: '1x (normal)', fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace' }} />
                {decemberStats && (
                  <ReferenceLine y={decemberStats.avg} stroke="rgba(239,68,68,0.4)" strokeDasharray="6 3" label={{ value: `Prom: ${decemberStats.avg.toFixed(2)}x`, fill: 'rgba(239,68,68,0.5)', fontSize: 9, fontFamily: 'monospace', position: 'right' }} />
                )}
                <Bar dataKey="ratio" name="Multiplicador diciembre" radius={[3, 3, 0, 0]}
                  fill="rgba(100,116,139,0.4)"
                  isAnimationActive={!prefersReducedMotion}
                >
                  {spikeChartData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.ratio > 2 ? '#ef4444' : entry.ratio > 1.5 ? '#f97316' : 'rgba(100,116,139,0.4)'}
                      fillOpacity={entry.ratio > 1.5 ? 0.85 : 0.5}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </motion.section>
        )}

        {/* ── MONTHLY RISK PREMIUM ────────────────────────────────────────── */}
        {monthlyRiskChartData.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7 }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Ritmo estacional del riesgo</p>
            <h2 className="font-mono text-lg font-bold text-white/80 mb-2">¿En qué mes se contrata más riesgo?</h2>
            <p className="font-mono text-[11px] text-white/40 leading-relaxed mb-6 max-w-2xl">
              Prima de riesgo por mes calendario — promedio histórico de todos los años disponibles.
              Valores positivos indican que ese mes tiene mayor riesgo que la media anual.
              Las barras naranjas y rojas son meses donde históricamente proliferan contratos irregulares.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Risk premium bars */}
              <div>
                <p className="font-mono text-[10px] text-white/25 uppercase tracking-wider mb-3">Prima de riesgo por mes (% sobre media)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyRiskChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} width={42} />
                    <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="riskPremium" name="Prima de riesgo" radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion}>
                      {monthlyRiskChartData.map((entry, idx) => (
                        <Cell
                          key={`mp-${idx}`}
                          fill={entry.riskPremium > 5 ? '#ef4444' : entry.riskPremium > 0 ? '#f97316' : '#22c55e'}
                          fillOpacity={0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quarter comparison */}
              {monthlyRiskStats && (
                <div>
                  <p className="font-mono text-[10px] text-white/25 uppercase tracking-wider mb-3">Riesgo promedio por trimestre</p>
                  <div className="space-y-3 mt-4">
                    {monthlyRiskStats.quarters.map((q, i) => {
                      const maxRisk = Math.max(...monthlyRiskStats.quarters.map((x) => x.avgRisk))
                      const barPct = (q.avgRisk / Math.max(maxRisk, 0.001)) * 100
                      const isWorst = q.avgRisk === maxRisk
                      return (
                        <motion.div
                          key={q.q}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.2 + i * 0.08, duration: 0.5 }}
                          className="flex items-center gap-4"
                        >
                          <div className="w-16 font-mono text-[11px] text-white/50 shrink-0">
                            <span className="font-bold" style={{ color: isWorst ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>{q.q}</span>
                            <span className="text-white/25 text-[9px] ml-1">{q.label}</span>
                          </div>
                          <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div
                              className="h-full rounded-sm"
                              style={{ width: `${barPct}%`, background: isWorst ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'rgba(100,116,139,0.5)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ delay: 1.3 + i * 0.08, duration: 0.6 }}
                            />
                          </div>
                          <div className="w-20 font-mono text-[11px] text-right shrink-0" style={{ color: isWorst ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                            {fmtPct(q.avgRisk * 100, 2)}
                          </div>
                        </motion.div>
                      )
                    })}
                    {monthlyRiskStats.quarters[3] && (
                      <p className="font-mono text-[10px] text-white/30 pt-2 leading-relaxed">
                        El último trimestre concentra el riesgo más alto del año — Q4 supera el promedio histórico de {fmtPct((monthlyRiskStats.overall ?? 0) * 100, 2)} en todos los sexenios analizados.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ── ADMINISTRATION COMPARISON TABLE ─────────────────────────────── */}
        {adminData.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Comparativa por administración</p>
            <h2 className="font-mono text-lg font-bold text-white/80 mb-2">¿Qué sexenio contrató con mayor riesgo?</h2>
            <p className="font-mono text-[11px] text-white/40 leading-relaxed mb-6 max-w-2xl">
              Porcentaje de contratos en nivel alto/crítico de riesgo y tasa de adjudicación directa,
              promediados por año de gobierno. Datos limitados a los años disponibles en COMPRANET (2010–2025).
            </p>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Administración', 'Período', 'Alto/Crítico', 'Adj. Directa', 'Gasto total'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adminData.map((row, i) => (
                    <motion.tr
                      key={row.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + i * 0.07, duration: 0.4 }}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: row.color, opacity: 0.6 }} />
                          <span className="font-mono text-sm text-white/70 font-medium">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-white/35">{row.years}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(row.avgRisk, 100)}%`, background: riskColor(row.avgRisk / 100) }} />
                          </div>
                          <span className="font-mono text-[12px] tabular-nums" style={{ color: riskColor(row.avgRisk / 100) }}>
                            {fmtPct(row.avgRisk)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] tabular-nums" style={{ color: row.avgDA > 70 ? '#f97316' : 'rgba(255,255,255,0.45)' }}>
                        {fmtPct(row.avgDA)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-white/35 tabular-nums">
                        {fmtB(row.totalVal)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 font-mono text-[10px] text-white/20 leading-relaxed">
              Nota metodológica: el porcentaje alto/crítico corresponde al modelo v6.5 (umbral critical ≥0.60, high ≥0.40).
              La cobertura de datos pre-2010 es limitada — los valores del sexenio Fox son indicativos.
            </p>
          </motion.section>
        )}

        {/* Footer */}
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 1.0 }}>
          <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
          <p className="font-mono text-[10px] text-white/20 tracking-wider leading-relaxed">
            {t('footer')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
