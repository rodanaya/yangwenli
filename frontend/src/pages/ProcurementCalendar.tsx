/**
 * Procurement Calendar Heatmap
 *
 * GitHub-style contribution calendar showing contract activity and risk level
 * for every day of the year. Tells the story of December budget dumps and
 * election year patterns for investigative journalists.
 */

import { useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, Info, Calendar, Zap } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { cn, formatNumber } from '@/lib/utils'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

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
const DEFAULT_YEAR = new Date().getFullYear()
const ELECTION_YEARS = new Set([2018, 2021, 2024]) // Federal election years in Mexico

function formatLocalDate(dateStr: string, weekdaysLong: string[], monthsLong: string[]): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const weekday = weekdaysLong[d.getUTCDay()]
  const day = d.getUTCDate()
  const month = monthsLong[d.getUTCMonth()]
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
  const { t } = useTranslation('procurementCalendar')
  const weekdaysLong = t('weekdays.long', { returnObjects: true }) as string[]
  const monthsLong = t('months.long', { returnObjects: true }) as string[]

  const { day, x, y } = state
  const formatted = formatLocalDate(day.date, weekdaysLong, monthsLong)
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
          <span>{t('tooltip.contracts')}</span>
          <span className="text-stone-200 font-mono">{formatNumber(day.total_contracts)}</span>
        </div>
        <div className="flex justify-between gap-4 text-stone-400">
          <span>{t('tooltip.highRisk')}</span>
          <span className="text-orange-300 font-mono">{formatNumber(day.high_risk_contracts)}</span>
        </div>
        <div className="flex justify-between gap-4 text-stone-400">
          <span>{t('tooltip.riskRate')}</span>
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
            {t('events.budgetClose')}
          </div>
        )}
        {isElectionYear && month >= 3 && month <= 5 && (
          <div className="mt-1.5 pt-1.5 border-t border-stone-700/60 text-amber-400/80 text-[10px]">
            {t('events.preElectoral')}
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
  const { t } = useTranslation('procurementCalendar')
  const dayLabels = t('weekdays.short', { returnObjects: true }) as string[]
  const monthNames = t('months.short', { returnObjects: true }) as string[]

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
                {mp ? monthNames[mp.month] : ''}
              </div>
            )
          })}
        </div>

        {/* Grid body: day-of-week labels + week columns */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-0 mr-1" style={{ gap: GAP }}>
            {dayLabels.map((label, i) => (
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
                      aria-label={`${day.date}: ${day.total_contracts} ${t('tooltip.contracts').toLowerCase()}, ${(day.risk_rate * 100).toFixed(1)}% ${t('tooltip.highRisk').toLowerCase()}`}
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
  const { t } = useTranslation('procurementCalendar')

  const swatches: { label: string; color: string }[] = [
    { label: t('legend.noContracts'), color: 'hsl(220, 10%, 11%)' },
    { label: t('legend.riskLow'), color: getDayColor(100, 0.05, 3000) },
    { label: t('legend.riskMedium'), color: getDayColor(400, 0.15, 3000) },
    { label: t('legend.riskHigh'), color: getDayColor(800, 0.25, 3000) },
    { label: t('legend.riskCritical'), color: getDayColor(2000, 0.38, 3000) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
      <span className="font-mono uppercase tracking-wider text-stone-600 text-[10px]">{t('legend.riskLevel')}</span>
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
        <span>{t('legend.activity')}</span>
      </div>
    </div>
  )
}

// =============================================================================
// December analysis section
// =============================================================================

function DiciembreSection({ stats, year }: { stats: YearStats; year: number }) {
  const { t } = useTranslation('procurementCalendar')

  if (!stats.hasDecemberData) {
    return (
      <div className="rounded-sm border border-stone-800 bg-stone-900/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone-600 mb-1">
          {t('decemberSection.title')}
        </p>
        <p className="text-sm text-stone-500 italic">
          {t('decemberSection.noData', { year })}
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
    <div className="rounded-sm border border-orange-800/30 bg-orange-950/10 p-5 space-y-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-orange-500 mb-1">
        {t('decemberSection.title')}
      </p>
      <p className="text-sm text-stone-400 leading-relaxed">
        {t('decemberSection.subtitle', {
          year,
          dec: formatNumber(stats.decemberContracts),
          avg: formatNumber(Math.round(stats.avgMonthlyContracts)),
        })}
      </p>

      {/* Comparison bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume comparison */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-600">
            {t('decemberSection.volume')}
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-orange-400">{t('decemberSection.december')}</span>
                <span className="text-stone-400 font-mono">{formatNumber(stats.decemberContracts)}</span>
              </div>
              {(() => {
                const N = 30, DR = 3, DG = 8
                const filled = Math.max(1, Math.round((decBarWidth / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                        fill={k < filled ? '#f97316' : '#f3f1ec'}
                        stroke={k < filled ? undefined : '#e2ddd6'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-stone-500">{t('decemberSection.monthlyAvg')}</span>
                <span className="text-stone-500 font-mono">{formatNumber(Math.round(stats.avgMonthlyContracts))}</span>
              </div>
              {(() => {
                const N = 30, DR = 3, DG = 8
                const filled = Math.max(1, Math.round((avgBarWidth / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                        fill={k < filled ? '#78716c' : '#f3f1ec'}
                        stroke={k < filled ? undefined : '#e2ddd6'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Risk comparison */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-600">
            {t('decemberSection.riskRate')}
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-red-400">{t('decemberSection.december')}</span>
                <span className="text-stone-400 font-mono">{decRiskPct}%</span>
              </div>
              {(() => {
                const N = 30, DR = 3, DG = 8
                const filled = Math.max(1, Math.round((decRiskBarWidth / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                        fill={k < filled ? '#ef4444' : '#f3f1ec'}
                        stroke={k < filled ? undefined : '#e2ddd6'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-stone-500">{t('decemberSection.restOfYear')}</span>
                <span className="text-stone-500 font-mono">{annualRiskPct}%</span>
              </div>
              {(() => {
                const N = 30, DR = 2.5, DG = 6.5
                const filled = Math.max(1, Math.round((avgRiskBarWidth / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 8`} className="w-full" style={{ height: 8 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={4} r={DR}
                        fill={k < filled ? '#78716c' : '#f3f1ec'}
                        stroke={k < filled ? undefined : '#e2ddd6'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
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
  const { t } = useTranslation('procurementCalendar')
  const weekdaysLong = t('weekdays.long', { returnObjects: true }) as string[]
  const monthsLong = t('months.long', { returnObjects: true }) as string[]

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
      <div className="max-w-6xl mx-auto px-6 py-8">
      <EditorialPageShell
        kicker="PROCUREMENT CALENDAR · TEMPORAL PATTERNS"
        headline={<>Year-end spending reveals the <em>budget dump</em> pattern.</>}
        paragraph="December concentrates an anomalous share of federal contracts — a pattern consistent with fiscal year-end pressure and reduced oversight."
        severity="medium"
        loading={isLoading}
        stats={[
          {
            value: stats.totalContracts > 0 ? formatNumber(stats.totalContracts) : '—',
            label: `contracts in ${year}`,
            color: '#60a5fa',
          },
          {
            value: stats.highRiskContracts > 0 ? formatNumber(stats.highRiskContracts) : '—',
            label: 'high-risk contracts',
            color: '#f87171',
            sub: stats.totalContracts > 0 ? `${(stats.highRiskRate * 100).toFixed(1)}% of total` : undefined,
          },
          {
            value: stats.hasDecemberData ? formatNumber(stats.decemberContracts) : '—',
            label: 'december contracts',
            color: '#fb923c',
            sub: stats.decemberJanuaryRatio ? `${stats.decemberJanuaryRatio.toFixed(1)}x vs january` : undefined,
          },
          {
            value: stats.hasDecemberData ? `${(stats.decemberRiskRate * 100).toFixed(1)}%` : '—',
            label: 'december risk rate',
            color: '#fbbf24',
          },
        ]}
      >
        <Act number="I" label="THE CALENDAR">
      <div className="space-y-8">
        {/* Existing in-page header (kept for sub-sections) */}
        <EditorialHeadline
          section={t('section')}
          headline={t('headline')}
          subtitle={t('headlineSubtitle')}
          className="mb-2"
        />
        {/* Editorial lede */}
        <div className="max-w-3xl">
          <p className="text-sm text-stone-400 leading-relaxed">
            {t('lede')}
          </p>
        </div>

        {/* Year selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 mr-2">{t('yearLabel')}</span>
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
          <span className="text-[9px] text-amber-600/70 font-mono ml-1">{t('electionSuffix')}</span>
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
            value={isLoading ? '—' : formatNumber(stats.totalContracts)}
            label={t('stats.contractsInYear', { year })}
            color="border-blue-500"
          />
          <HallazgoStat
            value={isLoading ? '—' : formatNumber(stats.highRiskContracts)}
            label={t('stats.highRiskContracts')}
            color="border-red-500"
            annotation={isLoading ? undefined : t('stats.ofTotal', { pct: (stats.highRiskRate * 100).toFixed(1) })}
          />
          <HallazgoStat
            value={
              isLoading || !stats.peakDay ? '—'
              : new Date(stats.peakDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            }
            label={t('stats.mostActiveDay')}
            color="border-amber-500"
            annotation={
              isLoading || !stats.peakDay ? undefined
              : t('stats.contractsCount', { num: formatNumber(stats.peakDay.total_contracts) })
            }
          />
          <HallazgoStat
            value={
              isLoading || !stats.decemberJanuaryRatio ? '—'
              : `${stats.decemberJanuaryRatio.toFixed(1)}x`
            }
            label={t('stats.decVsJan')}
            color="border-orange-500"
            annotation={t('stats.budgetCloseIndicator')}
          />
        </motion.div>

        {/* Election year banner */}
        {isElectionYear && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-4 py-3">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">{t('electionBanner.title')}</span> &mdash; {t('electionBanner.body')}
            </p>
          </div>
        )}

        {/* Calendar heatmap */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-stone-500">
              {t('calendarHeader', { year })}
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
                {t('error.load')}
              </div>
            ) : days.length === 0 ? (
              <div className="text-stone-500 text-sm py-8 text-center">
                {t('error.noData', { year })}
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
                  {t('insights.mostActiveDay')}
                </div>
                <div className="text-lg font-bold font-mono text-stone-200">
                  {new Date(stats.peakDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </div>
                <div className="text-[11px] text-stone-500">
                  {t('stats.contractsCount', { num: formatNumber(stats.peakDay.total_contracts) })}
                </div>
              </div>
            )}

            {/* Highest risk day */}
            {stats.highestRiskDay && (
              <div className="border border-red-900/40 bg-red-950/10 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-600 mb-1">
                  {t('insights.peakRiskDay')}
                </div>
                <div className="text-lg font-bold font-mono text-red-400">
                  {(stats.highestRiskDay.risk_rate * 100).toFixed(1)}%
                </div>
                <div className="text-[11px] text-stone-500">
                  {formatLocalDate(stats.highestRiskDay.date, weekdaysLong, monthsLong).split(',')[0]},{' '}
                  {new Date(stats.highestRiskDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </div>
              </div>
            )}

            {/* December vs rest */}
            {stats.hasDecemberData && (
              <div className="border border-orange-900/40 bg-orange-950/10 rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-600 mb-1">
                  {t('insights.decemberRisk')}
                </div>
                <div className="text-lg font-bold font-mono text-orange-400">
                  {(stats.decemberRiskRate * 100).toFixed(1)}%
                </div>
                <div className="text-[11px] text-stone-500">
                  {t('insights.vsRestOfYear', { pct: (stats.nonDecemberRiskRate * 100).toFixed(1) })}
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
                {t('insights.yearType')}
              </div>
              <div className={cn(
                'text-lg font-bold font-mono',
                isElectionYear ? 'text-amber-400' : 'text-stone-400'
              )}>
                {isElectionYear ? t('insights.electoral') : t('insights.regular')}
              </div>
              <div className="text-[11px] text-stone-500">
                {isElectionYear
                  ? t('insights.compareElectoral')
                  : t('insights.noFederalElections')}
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
              {t('patterns.title', { year })}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* December spike annotation */}
              {decemberSpikeRatio !== null && decemberSpikeRatio > 1.2 && (
                <div className="border border-orange-800/50 bg-orange-950/20 rounded-lg px-4 py-3 flex gap-3 items-start">
                  <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-orange-300">
                      {t('patterns.decemberSpike', { year, num: formatNumber(stats.decemberContracts) })}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {t('patterns.decemberSpikeDetail', { ratio: decemberSpikeRatio.toFixed(1) })}
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
                      {t('patterns.electionPattern')}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {t('patterns.electionDetail', { year })}
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
                      {t('patterns.peakRiskDayLabel', {
                        date: new Date(stats.highestRiskDay.date + 'T12:00:00Z').toLocaleDateString('es-MX', {
                          month: 'long', day: 'numeric', timeZone: 'UTC'
                        }),
                      })}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {t('patterns.peakRiskDayDetail', {
                        pct: (stats.highestRiskDay.risk_rate * 100).toFixed(1),
                        high: formatNumber(stats.highestRiskDay.high_risk_contracts),
                        total: formatNumber(stats.highestRiskDay.total_contracts),
                      })}
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
        <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-5 mt-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-400 mb-2">
            {t('finding.label')}
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            {t('finding.body')}
          </p>
          <p className="text-xs text-stone-500 mt-2 italic">
            {t('finding.oecd')}
          </p>
        </div>

        {/* Source footnote */}
        <div className="text-[10px] text-stone-600 pt-2 border-t border-stone-800/50">
          <Calendar className="w-3 h3 inline-block mr-1 -mt-0.5" />
          {t('source')}
        </div>
      </div>
        </Act>
      </EditorialPageShell>
      </div>

      {/* Tooltip rendered at root level to avoid clipping */}
      {tooltip && <DayTooltip state={tooltip} year={year} />}
    </div>
  )
}
