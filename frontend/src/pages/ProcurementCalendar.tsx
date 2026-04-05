/**
 * Procurement Calendar Heatmap
 *
 * GitHub-style contribution calendar showing contract activity and risk level
 * for every day of the year. Tells the story of December budget dumps and
 * election year patterns for investigative journalists.
 */

import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, Info, Calendar, Zap } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { cn, formatNumber } from '@/lib/utils'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'

// =============================================================================
// Types
// =============================================================================

interface CalendarDay {
  date: string
  total_contracts: number
  high_risk_contracts: number
  risk_rate: number
}

interface WeekColumn {
  weekIndex: number
  days: (CalendarDay | null)[]
  // days[0] = Monday, days[6] = Sunday
}

// =============================================================================
// Constants
// =============================================================================

const AVAILABLE_YEARS = Array.from({ length: 2024 - 2015 + 1 }, (_, i) => 2024 - i)
const DEFAULT_YEAR = 2024
const DAY_LABELS = ['Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b', 'Dom']
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ELECTION_YEARS = new Set([2018, 2021, 2024]) // Federal election years in Mexico

const SPANISH_WEEKDAYS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Mi\u00e9rcoles',
  4: 'Jueves', 5: 'Viernes', 6: 'S\u00e1bado',
}
const SPANISH_MONTHS_FULL: Record<number, string> = {
  0: 'enero', 1: 'febrero', 2: 'marzo', 3: 'abril',
  4: 'mayo', 5: 'junio', 6: 'julio', 7: 'agosto',
  8: 'septiembre', 9: 'octubre', 10: 'noviembre', 11: 'diciembre',
}

function formatSpanishDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const weekday = SPANISH_WEEKDAYS[d.getUTCDay()]
  const day = d.getUTCDate()
  const month = SPANISH_MONTHS_FULL[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${weekday}, ${day} de ${month} de ${year}`
}

// =============================================================================
// Color logic
// =============================================================================

function getDayColor(total: number, riskRate: number, maxContracts: number): string {
  if (total === 0) return 'hsl(220, 10%, 11%)'
  const intensity = Math.sqrt(total / maxContracts)
  const hue =
    riskRate > 0.30 ? 0    // red — critical risk
    : riskRate > 0.20 ? 25  // orange — high risk
    : riskRate > 0.10 ? 210 // blue — medium risk
    : 220                   // dark blue — low risk
  const saturation = riskRate > 0.30 ? 82 : riskRate > 0.20 ? 65 : riskRate > 0.10 ? 35 : 22
  const lightness = Math.round(14 + intensity * 42) // 14% (dark) to 56% (bright)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function getRiskBadgeColor(riskRate: number): string {
  if (riskRate > 0.30) return 'text-red-400 bg-red-950/50 border-red-800'
  if (riskRate > 0.20) return 'text-orange-400 bg-orange-950/50 border-orange-800'
  if (riskRate > 0.10) return 'text-blue-400 bg-blue-950/50 border-blue-800'
  return 'text-slate-400 bg-slate-900/50 border-slate-700'
}

// =============================================================================
// Calendar grouping logic
// =============================================================================

/**
 * Groups flat array of CalendarDay objects into week columns (Mon-Sun).
 * Pads the first week so that the first day of the year aligns correctly.
 */
function groupIntoWeeks(days: CalendarDay[]): { weeks: WeekColumn[]; monthPositions: { month: number; weekIndex: number }[] } {
  if (days.length === 0) return { weeks: [], monthPositions: [] }

  const firstDate = new Date(days[0].date + 'T12:00:00Z')
  // getDay(): 0=Sun, 1=Mon... convert to Mon=0 index
  const rawDow = firstDate.getUTCDay() // 0=Sun
  const mondayOffset = rawDow === 0 ? 6 : rawDow - 1 // Mon=0 ... Sun=6

  // Build a flat array padded at start, then chunk into weeks of 7
  const padded: (CalendarDay | null)[] = [
    ...Array(mondayOffset).fill(null),
    ...days,
  ]

  const weeks: WeekColumn[] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push({
      weekIndex: weeks.length,
      days: padded.slice(i, i + 7),
    })
  }
  // Pad last week to length 7
  while (weeks[weeks.length - 1].days.length < 7) {
    weeks[weeks.length - 1].days.push(null)
  }

  // Find which week each month starts in
  const monthPositions: { month: number; weekIndex: number }[] = []
  let lastMonth = -1
  padded.forEach((d, idx) => {
    if (!d) return
    const m = new Date(d.date + 'T12:00:00Z').getUTCMonth()
    if (m !== lastMonth) {
      lastMonth = m
      monthPositions.push({ month: m, weekIndex: Math.floor(idx / 7) })
    }
  })

  return { weeks, monthPositions }
}

// =============================================================================
// Loading skeleton
// =============================================================================

function CalendarSkeleton() {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        {Array.from({ length: 53 }).map((_, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, di) => (
              <div
                key={di}
                className="w-[11px] h-[11px] rounded-sm bg-stone-800 animate-pulse"
                style={{ animationDelay: `${(wi * 7 + di) % 20 * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Day cell tooltip
// =============================================================================

interface TooltipState {
  day: CalendarDay
  x: number
  y: number
}

function DayTooltip({ state, year }: { state: TooltipState; year: number }) {
  const { day, x, y } = state
  const formatted = formatSpanishDate(day.date)
  const riskPct = (day.risk_rate * 100).toFixed(1)

  const d = new Date(day.date + 'T12:00:00Z')
  const month = d.getUTCMonth()
  const isDecember = month === 11
  const isElectionYear = ELECTION_YEARS.has(year)

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="bg-stone-900 border border-stone-700 rounded-md shadow-xl px-3 py-2.5 text-xs min-w-[220px]">
        <div className="font-semibold text-stone-200 mb-1.5">{formatted}</div>
        <div className="flex justify-between gap-4 text-stone-400">
          <span>Contratos</span>
          <span className="text-stone-200 font-mono">{formatNumber(day.total_contracts)}</span>
        </div>
        <div className="flex justify-between gap-4 text-stone-400">
          <span>Alto riesgo</span>
          <span className="text-orange-300 font-mono">{formatNumber(day.high_risk_contracts)}</span>
        </div>
        <div className="flex justify-between gap-4 text-stone-400">
          <span>Tasa de riesgo</span>
          <span
            className={cn(
              'font-mono',
              day.risk_rate > 0.30 ? 'text-red-400' :
              day.risk_rate > 0.20 ? 'text-orange-400' :
              day.risk_rate > 0.10 ? 'text-blue-400' : 'text-slate-400'
            )}
          >
            {riskPct}%
          </span>
        </div>
        {isDecember && (
          <div className="mt-1.5 pt-1.5 border-t border-stone-700/60 text-orange-400/80 text-[10px]">
            Diciembre: per\u00edodo de cierre presupuestal
          </div>
        )}
        {isElectionYear && month >= 3 && month <= 5 && (
          <div className="mt-1.5 pt-1.5 border-t border-stone-700/60 text-amber-400/80 text-[10px]">
            Per\u00edodo pre-electoral federal
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Calendar grid
// =============================================================================

interface CalendarGridProps {
  weeks: WeekColumn[]
  monthPositions: { month: number; weekIndex: number }[]
  maxContracts: number
  onTooltip: (state: TooltipState | null) => void
}

function CalendarGrid({ weeks, monthPositions, maxContracts, onTooltip }: CalendarGridProps) {
  const CELL = 11
  const GAP = 3

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-max">
        {/* Month labels row */}
        <div className="flex gap-0 mb-1 pl-7">
          {weeks.map((week) => {
            const mp = monthPositions.find(m => m.weekIndex === week.weekIndex)
            return (
              <div
                key={week.weekIndex}
                className="text-[10px] text-stone-500 font-mono"
                style={{ width: CELL + GAP, minWidth: CELL + GAP }}
              >
                {mp ? MONTH_NAMES[mp.month] : ''}
              </div>
            )
          })}
        </div>

        {/* Grid body: day-of-week labels + week columns */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-0 mr-1" style={{ gap: GAP }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className="text-[9px] text-stone-600 font-mono flex items-center justify-end pr-1"
                style={{ height: CELL, lineHeight: `${CELL}px` }}
              >
                {i % 2 === 0 ? label.slice(0, 1) : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week) => (
              <div key={week.weekIndex} className="flex flex-col" style={{ gap: GAP }}>
                {week.days.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={di}
                        style={{ width: CELL, height: CELL }}
                        className="rounded-sm"
                      />
                    )
                  }
                  const bg = getDayColor(day.total_contracts, day.risk_rate, maxContracts)
                  return (
                    <div
                      key={di}
                      className="rounded-sm cursor-pointer transition-transform hover:scale-150 hover:z-10 relative"
                      style={{ width: CELL, height: CELL, backgroundColor: bg }}
                      onMouseEnter={(e) => {
                        onTooltip({ day, x: e.clientX, y: e.clientY })
                      }}
                      onMouseMove={(e) => {
                        onTooltip({ day, x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => onTooltip(null)}
                      role="gridcell"
                      aria-label={`${day.date}: ${day.total_contracts} contratos, ${(day.risk_rate * 100).toFixed(1)}% alto riesgo`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Stats computation
// =============================================================================

interface YearStats {
  totalContracts: number
  highRiskContracts: number
  highRiskRate: number
  peakDay: CalendarDay | null
  highestRiskDay: CalendarDay | null
  decemberContracts: number
  januaryContracts: number
  decemberJanuaryRatio: number | null
  decemberRiskRate: number
  nonDecemberRiskRate: number
  avgMonthlyContracts: number
  hasDecemberData: boolean
}

function computeStats(days: CalendarDay[]): YearStats {
  if (days.length === 0) {
    return {
      totalContracts: 0, highRiskContracts: 0, highRiskRate: 0,
      peakDay: null, highestRiskDay: null,
      decemberContracts: 0, januaryContracts: 0, decemberJanuaryRatio: null,
      decemberRiskRate: 0, nonDecemberRiskRate: 0, avgMonthlyContracts: 0,
      hasDecemberData: false,
    }
  }

  let totalContracts = 0
  let highRiskContracts = 0
  let peakDay: CalendarDay | null = null
  let highestRiskDay: CalendarDay | null = null
  let decemberContracts = 0
  let decemberHighRisk = 0
  let januaryContracts = 0
  let nonDecContracts = 0
  let nonDecHighRisk = 0

  const monthlyTotals: Record<number, number> = {}

  for (const day of days) {
    totalContracts += day.total_contracts
    highRiskContracts += day.high_risk_contracts
    if (!peakDay || day.total_contracts > peakDay.total_contracts) {
      peakDay = day
    }
    // Highest risk day: only consider days with at least 10 contracts
    if (day.total_contracts >= 10 && (!highestRiskDay || day.risk_rate > highestRiskDay.risk_rate)) {
      highestRiskDay = day
    }

    const month = new Date(day.date + 'T12:00:00Z').getUTCMonth()
    monthlyTotals[month] = (monthlyTotals[month] ?? 0) + day.total_contracts
    if (month === 11) {
      decemberContracts += day.total_contracts
      decemberHighRisk += day.high_risk_contracts
    } else {
      nonDecContracts += day.total_contracts
      nonDecHighRisk += day.high_risk_contracts
    }
    if (month === 0) januaryContracts += day.total_contracts
  }

  const highRiskRate = totalContracts > 0 ? highRiskContracts / totalContracts : 0
  const decemberJanuaryRatio = januaryContracts > 0 ? decemberContracts / januaryContracts : null
  const decemberRiskRate = decemberContracts > 0 ? decemberHighRisk / decemberContracts : 0
  const nonDecemberRiskRate = nonDecContracts > 0 ? nonDecHighRisk / nonDecContracts : 0
  const monthCount = Object.keys(monthlyTotals).length
  const avgMonthlyContracts = monthCount > 0 ? totalContracts / monthCount : 0
  const hasDecemberData = decemberContracts > 0

  return {
    totalContracts, highRiskContracts, highRiskRate,
    peakDay, highestRiskDay,
    decemberContracts, januaryContracts, decemberJanuaryRatio,
    decemberRiskRate, nonDecemberRiskRate, avgMonthlyContracts,
    hasDecemberData,
  }
}

// =============================================================================
// Legend
// =============================================================================

function Legend() {
  const swatches: { label: string; color: string }[] = [
    { label: 'Sin contratos', color: 'hsl(220, 10%, 11%)' },
    { label: 'Riesgo bajo (<10%)', color: getDayColor(100, 0.05, 3000) },
    { label: 'Riesgo medio (10-20%)', color: getDayColor(400, 0.15, 3000) },
    { label: 'Riesgo alto (>20%)', color: getDayColor(800, 0.25, 3000) },
    { label: 'Riesgo cr\u00edtico (>30%)', color: getDayColor(2000, 0.38, 3000) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
      <span className="font-mono uppercase tracking-wider text-stone-600 text-[10px]">Nivel de riesgo</span>
      {swatches.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
          <span>{s.label}</span>
        </div>
      ))}
      <div className="ml-4 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-sm bg-stone-800" />
        <div className="w-2.5 h-2.5 rounded-sm bg-stone-700" />
        <div className="w-3 h-3 rounded-sm bg-stone-500" />
        <span>Actividad (m\u00e1s oscuro = m\u00e1s contratos)</span>
      </div>
    </div>
  )
}

// =============================================================================
// December analysis section
// =============================================================================

function DiciembreSection({ stats, year }: { stats: YearStats; year: number }) {
  if (!stats.hasDecemberData) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone-600 mb-1">
          RUBLI &middot; Diciembre bajo la lupa
        </p>
        <p className="text-sm text-stone-500 italic">
          Datos de diciembre no disponibles para {year}. El a\u00f1o seleccionado puede tener datos parciales.
        </p>
      </div>
    )
  }

  const decRiskPct = (stats.decemberRiskRate * 100).toFixed(1)
  const annualRiskPct = (stats.highRiskRate * 100).toFixed(1)
  const decBarWidth = stats.avgMonthlyContracts > 0
    ? Math.min(100, (stats.decemberContracts / stats.avgMonthlyContracts) * 50)
    : 50
  const avgBarWidth = 50 // baseline at 50%
  const decRiskBarWidth = Math.min(100, stats.decemberRiskRate * 200) // scale 50% = 100%
  const avgRiskBarWidth = Math.min(100, stats.highRiskRate * 200)

  return (
    <div className="rounded-xl border border-orange-800/30 bg-orange-950/10 p-5 space-y-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-orange-500 mb-1">
        RUBLI &middot; Diciembre bajo la lupa
      </p>
      <p className="text-sm text-stone-400 leading-relaxed">
        El cierre presupuestal de diciembre concentra contrataciones aceleradas.
        En {year}, diciembre acumul\u00f3{' '}
        <span className="text-stone-200 font-semibold">{formatNumber(stats.decemberContracts)}</span>{' '}
        contratos frente a un promedio mensual de{' '}
        <span className="text-stone-200 font-semibold">{formatNumber(Math.round(stats.avgMonthlyContracts))}</span>.
      </p>

      {/* Comparison bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume comparison */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-600">
            Volumen de contratos
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-orange-400">Diciembre</span>
                <span className="text-stone-400 font-mono">{formatNumber(stats.decemberContracts)}</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${decBarWidth}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-stone-500">Promedio mensual</span>
                <span className="text-stone-500 font-mono">{formatNumber(Math.round(stats.avgMonthlyContracts))}</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-600 rounded-full transition-all duration-700"
                  style={{ width: `${avgBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk comparison */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-600">
            Tasa de riesgo
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-red-400">Diciembre</span>
                <span className="text-stone-400 font-mono">{decRiskPct}%</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${decRiskBarWidth}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-stone-500">Resto del a\u00f1o</span>
                <span className="text-stone-500 font-mono">{annualRiskPct}%</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-600 rounded-full transition-all duration-700"
                  style={{ width: `${avgRiskBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main page
// =============================================================================

export default function ProcurementCalendar() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: rawDays, isLoading, isError } = useQuery({
    queryKey: ['calendar-heatmap', year],
    queryFn: () => analysisApi.getCalendarHeatmap(year),
    staleTime: 30 * 60 * 1000,
  })

  const days: CalendarDay[] = rawDays ?? []

  const { weeks, monthPositions } = useMemo(() => groupIntoWeeks(days), [days])

  const maxContracts = useMemo(
    () => days.reduce((m, d) => Math.max(m, d.total_contracts), 1),
    [days]
  )

  const stats = useMemo(() => computeStats(days), [days])

  const isElectionYear = ELECTION_YEARS.has(year)

  // December spike ratio for annotations
  const decemberSpikeRatio = stats.avgMonthlyContracts > 0
    ? stats.decemberContracts / stats.avgMonthlyContracts
    : null

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="border-b border-stone-800 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <EditorialHeadline
            section="Calendario de Riesgo Presupuestal"
            headline="El calendario del gasto sospechoso"
            subtitle="Actividad contractual y nivel de riesgo por d\u00eda. Los patrones de fin de a\u00f1o y a\u00f1o electoral revelan comportamientos sistem\u00e1ticos."
            className="mb-2"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Editorial lede */}
        <div className="max-w-3xl">
          <p className="text-sm text-stone-400 leading-relaxed">
            Cada celda representa un d\u00eda. Los colores indican el nivel de riesgo promedio
            de los contratos adjudicados ese d\u00eda: el rojo intenso se\u00f1ala d\u00edas donde la
            mayor\u00eda de contratos presentan factores de riesgo. Los patrones de diciembre
            son especialmente reveladores &mdash; el &ldquo;subejercicio&rdquo; de fin de a\u00f1o concentra
            contrataciones que en circunstancias normales habr\u00edan sido licitadas.
          </p>
        </div>

        {/* Year selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 mr-2">A\u00f1o</span>
          {AVAILABLE_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                'px-3 py-1 rounded text-sm font-mono transition-all border',
                y === year
                  ? 'bg-stone-200 text-stone-900 border-stone-200 font-bold'
                  : 'bg-transparent text-stone-400 border-stone-700 hover:border-stone-500 hover:text-stone-200',
                ELECTION_YEARS.has(y) && y !== year && 'border-amber-800/60 text-amber-500/80'
              )}
              aria-pressed={y === year}
            >
              {y}
              {ELECTION_YEARS.has(y) && <span className="ml-1 text-[9px] align-top text-amber-500">*</span>}
            </button>
          ))}
          <span className="text-[9px] text-amber-600/70 font-mono ml-1">* a\u00f1o electoral</span>
        </div>

        {/* Stats row */}
        <motion.div
          key={year}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          <HallazgoStat
            value={isLoading ? '\u2014' : formatNumber(stats.totalContracts)}
            label={`Contratos en ${year}`}
            color="border-blue-500"
          />
          <HallazgoStat
            value={isLoading ? '\u2014' : formatNumber(stats.highRiskContracts)}
            label="Contratos de alto riesgo"
            color="border-red-500"
            annotation={isLoading ? undefined : `${(stats.highRiskRate * 100).toFixed(1)}% del total`}
          />
          <HallazgoStat
            value={
              isLoading || !stats.peakDay ? '\u2014'
              : new Date(stats.peakDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            }
            label="D\u00eda m\u00e1s activo"
            color="border-amber-500"
            annotation={
              isLoading || !stats.peakDay ? undefined
              : `${formatNumber(stats.peakDay.total_contracts)} contratos`
            }
          />
          <HallazgoStat
            value={
              isLoading || !stats.decemberJanuaryRatio ? '\u2014'
              : `${stats.decemberJanuaryRatio.toFixed(1)}x`
            }
            label="Dic vs Ene contratos"
            color="border-orange-500"
            annotation="Indicador de cierre presupuestal"
          />
        </motion.div>

        {/* Election year banner */}
        {isElectionYear && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-4 py-3">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">A\u00f1o electoral federal</span> &mdash; Los contratos en per\u00edodo pre-electoral
              pueden mostrar patrones at\u00edpicos de adjudicaci\u00f3n directa. Compare los meses previos
              a la elecci\u00f3n con a\u00f1os no electorales.
            </p>
          </div>
        )}

        {/* Calendar heatmap */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-stone-500">
              Actividad diaria {year}
            </h2>
          </div>

          <div
            ref={scrollRef}
            className="bg-stone-900/60 border border-stone-800 rounded-lg p-4"
          >
            {isLoading ? (
              <CalendarSkeleton />
            ) : isError ? (
              <div className="text-stone-500 text-sm py-8 text-center">
                No se pudieron cargar los datos del calendario. COMPRANET puede estar temporalmente
                no disponible &mdash; mostrando datos en cach\u00e9 si existen.
              </div>
            ) : days.length === 0 ? (
              <div className="text-stone-500 text-sm py-8 text-center">
                Sin datos disponibles para {year}. Los registros de COMPRANET para este a\u00f1o
                a\u00fan no han sido procesados o el a\u00f1o est\u00e1 fuera del rango de cobertura (2015-2024).
              </div>
            ) : (
              <CalendarGrid
                weeks={weeks}
                monthPositions={monthPositions}
                maxContracts={maxContracts}
                onTooltip={setTooltip}
              />
            )}
          </div>

          {/* Legend */}
          <Legend />
        </div>

        {/* Key insights strip */}
        {!isLoading && days.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* Most active day */}
            {stats.peakDay && (
              <div className="border border-stone-800 bg-stone-900/40 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-600 mb-1">
                  D\u00eda m\u00e1s activo
                </div>
                <div className="text-lg font-bold font-mono text-stone-200">
                  {new Date(stats.peakDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </div>
                <div className="text-[11px] text-stone-500">
                  {formatNumber(stats.peakDay.total_contracts)} contratos
                </div>
              </div>
            )}

            {/* Highest risk day */}
            {stats.highestRiskDay && (
              <div className="border border-red-900/40 bg-red-950/10 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-600 mb-1">
                  D\u00eda de mayor riesgo
                </div>
                <div className="text-lg font-bold font-mono text-red-400">
                  {(stats.highestRiskDay.risk_rate * 100).toFixed(1)}%
                </div>
                <div className="text-[11px] text-stone-500">
                  {formatSpanishDate(stats.highestRiskDay.date).split(',')[0]},{' '}
                  {new Date(stats.highestRiskDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </div>
              </div>
            )}

            {/* December vs rest */}
            {stats.hasDecemberData && (
              <div className="border border-orange-900/40 bg-orange-950/10 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-600 mb-1">
                  Riesgo en diciembre
                </div>
                <div className="text-lg font-bold font-mono text-orange-400">
                  {(stats.decemberRiskRate * 100).toFixed(1)}%
                </div>
                <div className="text-[11px] text-stone-500">
                  vs {(stats.nonDecemberRiskRate * 100).toFixed(1)}% resto del a\u00f1o
                </div>
              </div>
            )}

            {/* Election year flag */}
            <div className={cn(
              'border rounded-lg p-3',
              isElectionYear
                ? 'border-amber-900/40 bg-amber-950/10'
                : 'border-stone-800 bg-stone-900/40'
            )}>
              <div className={cn(
                'text-[10px] font-mono uppercase tracking-wider mb-1',
                isElectionYear ? 'text-amber-600' : 'text-stone-600'
              )}>
                Tipo de a\u00f1o
              </div>
              <div className={cn(
                'text-lg font-bold font-mono',
                isElectionYear ? 'text-amber-400' : 'text-stone-400'
              )}>
                {isElectionYear ? 'Electoral' : 'Regular'}
              </div>
              <div className="text-[11px] text-stone-500">
                {isElectionYear
                  ? 'Compare con a\u00f1os no electorales'
                  : 'Sin elecciones federales'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto-detected annotations */}
        {!isLoading && days.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-stone-600">
              Patrones detectados &mdash; {year}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* December spike annotation */}
              {decemberSpikeRatio !== null && decemberSpikeRatio > 1.2 && (
                <div className="border border-orange-800/50 bg-orange-950/20 rounded-lg px-4 py-3 flex gap-3 items-start">
                  <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-orange-300">
                      Diciembre {year}: {formatNumber(stats.decemberContracts)} contratos
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {decemberSpikeRatio.toFixed(1)}x el promedio mensual &mdash; cierre presupuestal detectado
                    </div>
                  </div>
                </div>
              )}

              {/* Election year note */}
              {isElectionYear && (
                <div className="border border-amber-800/50 bg-amber-950/20 rounded-lg px-4 py-3 flex gap-3 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-amber-300">
                      Patr\u00f3n de a\u00f1o electoral
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Elecciones federales en {year} &mdash; la contrataci\u00f3n t\u00edpicamente se
                      acelera en los meses previos mientras los gobiernos en turno aceleran el gasto
                    </div>
                  </div>
                </div>
              )}

              {/* High risk day annotation */}
              {stats.highestRiskDay && stats.highestRiskDay.risk_rate > 0.25 && (
                <div className={cn('border rounded-lg px-4 py-3 flex gap-3 items-start', getRiskBadgeColor(stats.highestRiskDay.risk_rate))}>
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">
                      D\u00eda de mayor riesgo:{' '}
                      {new Date(stats.highestRiskDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', {
                        month: 'long', day: 'numeric', timeZone: 'UTC'
                      })}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {(stats.highestRiskDay.risk_rate * 100).toFixed(1)}% tasa de riesgo &mdash; {formatNumber(stats.highestRiskDay.high_risk_contracts)} de {formatNumber(stats.highestRiskDay.total_contracts)} contratos marcados
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Diciembre bajo la lupa */}
        {!isLoading && days.length > 0 && (
          <DiciembreSection stats={stats} year={year} />
        )}

        {/* Editorial findings callout */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mt-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-400 mb-2">
            HALLAZGO
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            24 a\u00f1os consecutivos de picos de gasto en diciembre. El cierre presupuestal es estructural,
            no accidental. Cada administraci\u00f3n, sin importar el partido, agota el presupuesto restante
            en diciembre &mdash; creando una ventana predecible de contrataci\u00f3n acelerada y con menor
            escrutinio que concentra una proporci\u00f3n desproporcionada de contrataci\u00f3n de alto riesgo.
          </p>
          <p className="text-xs text-stone-500 mt-2 italic">
            OCDE: La tasa de adjudicaci\u00f3n directa en M\u00e9xico supera el 80% &mdash; m\u00e1s de 3x el l\u00edmite recomendado del 25%.
          </p>
        </div>

        {/* Source footnote */}
        <div className="text-[10px] text-stone-600 pt-2 border-t border-stone-800/50">
          <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />
          Fuente: COMPRANET &middot; 3.06M contratos (2002-2025) &middot; Modelo de riesgo v6.5 (AUC=0.828)
        </div>
      </div>

      {/* Tooltip rendered at root level to avoid clipping */}
      {tooltip && <DayTooltip state={tooltip} year={year} />}
    </div>
  )
}
