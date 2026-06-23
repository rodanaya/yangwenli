/**
 * SaqueoSwimlane — «La Línea del Saqueo» (DESIGNUS journalists-2026-06-22).
 *
 * The newsroom centerpiece: every investigation is a bar plotted across the
 * years it spans on a shared 2002–2025 time axis. Magnitude is the DOMINANT
 * channel (bar height + right-gutter value + sort order all encode it); the
 * time-span width is secondary (position + lighter weight) so it is never
 * misread as magnitude. Color = ordinal severity (RISK_COLORS ramp, zinc for
 * low — never green). amount===0 stories render HOLLOW (structural patterns,
 * no faked length). Desktop-only — the page swaps in a DotStrip register on
 * mobile (the time axis can't fit a phone).
 *
 * Bars are CSS-positioned (% left/width on the time axis, px height for
 * magnitude) — fully responsive, no SVG viewBox scaling. Precedents:
 * Reuters "Carbon's Casualties" (bars on a shared time axis) + NYT Upshot
 * "How Much Hotter Is Your Hometown" (named outliers, sequential ramp).
 */

import { Link } from 'react-router-dom'
import { RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import {
  compositeMag,
  severityKey,
  isPatternRow,
  severityRankNum,
  parseYearSpan,
  firstYear,
  type JStatus,
} from '@/lib/journalistsMagnitude'

export type SwimAxis = 'magnitude' | 'chronology' | 'severity'

export interface SwimRow {
  slug: string
  label: string
  brief: string
  amount: number
  contracts: number
  status: JStatus
  yearSpan?: string
  sub?: string
}

const Y_MIN = 2002
const Y_MAX = 2025
const SPAN = Y_MAX - Y_MIN
const LABEL_W = 140
const VALUE_W = 84
const GUTTERS = LABEL_W + VALUE_W
const ROW_H = 30
const BAR_MAX_H = 26
const YEAR_TICKS = [2002, 2006, 2010, 2014, 2018, 2022]

const frac = (year: number) => (Math.min(Y_MAX, Math.max(Y_MIN, year)) - Y_MIN) / SPAN
/** CSS left within the plot column, accounting for the label + value gutters. */
const plotLeft = (f: number) => `calc(${LABEL_W}px + (100% - ${GUTTERS}px) * ${f})`
const plotWidth = (f: number) => `calc((100% - ${GUTTERS}px) * ${f})`

export function axisSort<T extends SwimRow>(rows: T[], axis: SwimAxis): T[] {
  const copy = [...rows]
  if (axis === 'chronology') {
    return copy.sort((a, b) => firstYear(a) - firstYear(b) || compositeMag(b) - compositeMag(a))
  }
  if (axis === 'severity') {
    return copy.sort((a, b) => severityRankNum(a) - severityRankNum(b) || compositeMag(b) - compositeMag(a))
  }
  return copy.sort((a, b) => compositeMag(b) - compositeMag(a))
}

export function SaqueoSwimlane({
  rows,
  lang,
  axis,
  onAxisChange,
}: {
  rows: SwimRow[]
  lang: 'en' | 'es'
  axis: SwimAxis
  onAxisChange: (a: SwimAxis) => void
}) {
  const isEs = lang === 'es'
  const magMax = Math.max(1, ...rows.map(compositeMag))
  // Top-4 by magnitude get an on-bar annotation (named-outlier discipline).
  const annotate = new Set(
    [...rows].sort((a, b) => compositeMag(b) - compositeMag(a)).slice(0, 4).map((r) => r.slug),
  )
  const sorted = axisSort(rows, axis)

  const AXES: { key: SwimAxis; en: string; es: string }[] = [
    { key: 'magnitude', en: 'Magnitude', es: 'Magnitud' },
    { key: 'chronology', en: 'Chronology', es: 'Cronología' },
    { key: 'severity', en: 'Severity', es: 'Severidad' },
  ]

  return (
    <div>
      {/* Axis toggle */}
      <div className="flex items-center justify-end mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mr-3">
          {isEs ? 'Ordenar por' : 'Sort by'}
        </span>
        <div className="inline-flex rounded-sm border border-border overflow-hidden" role="group">
          {AXES.map((a) => {
            const active = a.key === axis
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => onAxisChange(a.key)}
                aria-pressed={active}
                className={[
                  'px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.12em] transition-colors',
                  active ? 'bg-text-primary text-background' : 'bg-background-card text-text-muted hover:text-text-primary',
                ].join(' ')}
              >
                {isEs ? a.es : a.en}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time axis header */}
      <div className="flex items-end mb-1" aria-hidden="true">
        <div style={{ width: LABEL_W }} className="flex-shrink-0" />
        <div className="relative flex-1 h-4">
          {YEAR_TICKS.map((y) => (
            <span
              key={y}
              className="absolute top-0 -translate-x-1/2 text-[9px] font-mono text-text-muted tabular-nums"
              style={{ left: `${frac(y) * 100}%` }}
            >
              {y}
            </span>
          ))}
        </div>
        <div style={{ width: VALUE_W }} className="flex-shrink-0" />
      </div>

      {/* Rows + era bands */}
      <div className="relative">
        {/* Era washes (the "saqueo deepens in the AMLO/COVID years" read) */}
        <div
          className="absolute top-0 bottom-0 bg-risk-critical/[0.04] pointer-events-none"
          style={{ left: plotLeft(frac(2018)), width: plotWidth((2024 - 2018) / SPAN) }}
          aria-hidden="true"
        />
        <div
          className="absolute top-0 bottom-0 border-l border-r border-risk-critical/20 pointer-events-none"
          style={{ left: plotLeft(frac(2020)), width: plotWidth((2021 - 2020) / SPAN) }}
          aria-hidden="true"
        />
        {/* Gridlines */}
        {YEAR_TICKS.map((y) => (
          <div
            key={y}
            className="absolute top-0 bottom-0 w-px bg-border/50 pointer-events-none"
            style={{ left: plotLeft(frac(y)) }}
            aria-hidden="true"
          />
        ))}

        {sorted.map((r) => {
          const [startY, endY] = parseYearSpan(r.yearSpan, r.sub)
          const mag = compositeMag(r)
          const pattern = isPatternRow(r)
          const sev = severityKey(r)
          const color = RISK_COLORS[sev]
          const heightPx = pattern ? 6 : Math.max(5, Math.round(BAR_MAX_H * Math.sqrt(mag / magMax)))
          const leftF = frac(startY)
          const widthF = Math.max((endY - startY) / SPAN, 0.012)
          const valueLabel = r.amount > 0 ? formatCompactMXN(r.amount * 1e9) : isEs ? 'patrón' : 'pattern'

          return (
            <Link
              key={r.slug}
              to={`/stories/${r.slug}`}
              className="group relative flex items-center border-b border-border/40 hover:bg-background-elevated/60 transition-colors"
              style={{ height: ROW_H }}
              aria-label={`${r.label}: ${valueLabel}, ${startY}–${endY}`}
            >
              {/* Label gutter */}
              <div
                className="flex-shrink-0 pr-3 text-right text-[11px] text-text-secondary truncate leading-tight"
                style={{ width: LABEL_W }}
              >
                {r.label}
              </div>
              {/* Plot track */}
              <div className="relative flex-1 h-full" aria-hidden="true">
                <div
                  className="absolute bottom-1 rounded-[1px]"
                  style={{
                    left: `${leftF * 100}%`,
                    width: `${widthF * 100}%`,
                    height: heightPx,
                    background: pattern ? 'transparent' : color,
                    border: pattern ? `1px dashed ${color}` : 'none',
                    opacity: pattern ? 0.7 : 0.92,
                  }}
                />
                {annotate.has(r.slug) && (
                  <span
                    className="absolute bottom-1 text-[10px] font-serif italic text-text-primary whitespace-nowrap pointer-events-none"
                    style={{ left: `calc(${leftF * 100}% + 6px)`, lineHeight: `${Math.max(heightPx, 12)}px` }}
                  >
                    {r.label}
                  </span>
                )}
              </div>
              {/* Value gutter */}
              <div className="flex-shrink-0 text-right" style={{ width: VALUE_W }}>
                <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
                  {valueLabel}
                </span>
              </div>

              {/* Hover peek — pure CSS group-hover, no layout shift */}
              <div
                className="absolute z-20 top-full mt-1 hidden group-hover:block group-focus:block bg-background-card border border-border-hover rounded-sm p-3 shadow-xl max-w-md"
                style={{ left: LABEL_W }}
              >
                <p className="text-[12px] leading-[1.5] text-text-secondary">{r.brief}</p>
                <span className="mt-2 inline-block text-[10px] font-mono font-bold uppercase tracking-[0.12em]" style={{ color }}>
                  {isEs ? 'Leer la investigación →' : 'Read the investigation →'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
