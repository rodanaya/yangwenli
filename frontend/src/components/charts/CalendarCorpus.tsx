/**
 * CalendarCorpus — editorial calendar heatmap as a dot corpus.
 *
 * A 53-week × 7-day grid (standard GitHub-style), but cells are dots whose
 * size and color encode risk/volume. Replaces the classic filled-square
 * heatmap with a breathable, hairline-axis layout that matches the rest
 * of the particle grammar. December columns are optionally boxed as a
 * "budget dump" annotation corridor.
 */
import { useMemo } from 'react'
import { FONT_MONO, HAIRLINE_STROKE, RISK_PALETTE } from '@/lib/editorial'

export interface CalendarCell {
  /** ISO date string YYYY-MM-DD. */
  date: string
  /** Contract count or volume for this day. */
  value: number
  /** High-risk rate for this day, 0..1. */
  riskRate?: number
}

interface CalendarCorpusProps {
  cells: CalendarCell[]
  /** Highlight December with a corridor frame. */
  highlightDecember?: boolean
  /** Year label shown top-left. */
  yearLabel?: string
  cellSize?: number
  className?: string
}

export function CalendarCorpus({
  cells,
  highlightDecember = true,
  yearLabel,
  cellSize = 11,
  className,
}: CalendarCorpusProps) {
  const { dots, weeks, maxValue } = useMemo(() => {
    // Build map day-of-year → cell
    const byDate: Record<string, CalendarCell> = {}
    for (const c of cells) byDate[c.date] = c
    const maxValue = Math.max(1, ...cells.map((c) => c.value))

    // Figure year from first cell
    const yr = cells[0] ? parseInt(cells[0].date.slice(0, 4), 10) : new Date().getUTCFullYear()
    const jan1 = new Date(Date.UTC(yr, 0, 1))
    const startDay = jan1.getUTCDay() // 0..6 (Sun..Sat)
    const weeks = 53

    const dots: { x: number; y: number; week: number; r: number; fill: string; alpha: number; date: string }[] = []
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d - startDay
        const dt = new Date(Date.UTC(yr, 0, 1 + dayIdx))
        if (dt.getUTCFullYear() !== yr) continue
        const iso = dt.toISOString().slice(0, 10)
        const cell = byDate[iso]
        const v = cell?.value ?? 0
        const rRate = cell?.riskRate ?? 0
        // Baseline: all days present as faint dots, sized by volume
        const size = 0.7 + 2.2 * Math.sqrt(v / maxValue)
        let fill = '#52525b'
        let alpha = 0.28
        if (rRate >= 0.15) { fill = RISK_PALETTE.critical; alpha = 0.85 }
        else if (rRate >= 0.08) { fill = RISK_PALETTE.high; alpha = 0.72 }
        else if (v > 0) { fill = '#a16207'; alpha = 0.45 }
        dots.push({
          x: 24 + w * cellSize + cellSize / 2,
          y: 20 + d * cellSize + cellSize / 2,
          week: w,
          r: size,
          fill,
          alpha,
          date: iso,
        })
      }
    }
    return { dots, weeks, maxValue }
  }, [cells, cellSize])

  const totalH = 20 + 7 * cellSize + 18
  const totalW = 24 + weeks * cellSize + 16

  // December month range: figure which week indices fall in December
  const decRange = useMemo(() => {
    if (!highlightDecember || cells.length === 0) return null
    const yr = parseInt(cells[0].date.slice(0, 4), 10)
    const jan1 = new Date(Date.UTC(yr, 0, 1))
    const startDay = jan1.getUTCDay()
    const decStart = new Date(Date.UTC(yr, 11, 1))
    const decEnd = new Date(Date.UTC(yr, 11, 31))
    const wk = (d: Date) => Math.floor(((d.getTime() - jan1.getTime()) / 86400000 + startDay) / 7)
    return { w0: wk(decStart), w1: wk(decEnd) }
  }, [cells, highlightDecember])

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Calendar corpus of contract volume by day"
      style={{ fontFamily: FONT_MONO }}
    >
      {/* Year label */}
      {yearLabel && (
        <text x={4} y={14} fill="#a1a1aa" fontSize={10} fontWeight="bold">
          {yearLabel}
        </text>
      )}
      {/* Weekday ticks */}
      {['M', 'W', 'F'].map((d, i) => (
        <text
          key={d}
          x={18}
          y={20 + (i * 2 + 1) * cellSize + cellSize / 2 + 3}
          fill="#52525b"
          fontSize={7}
          textAnchor="end"
        >
          {d}
        </text>
      ))}
      {/* December corridor */}
      {decRange && (
        <rect
          x={24 + decRange.w0 * cellSize - 1}
          y={18}
          width={(decRange.w1 - decRange.w0 + 1) * cellSize + 2}
          height={7 * cellSize + 4}
          fill="none"
          stroke="rgba(239,68,68,0.35)"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      )}
      {/* Faint grid row lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`hl-${i}`}
          x1={24}
          x2={24 + weeks * cellSize}
          y1={20 + i * cellSize}
          y2={20 + i * cellSize}
          stroke={HAIRLINE_STROKE}
          strokeWidth={0.5}
        />
      ))}
      {/* Dots */}
      {dots.map((d, i) => (
        <circle key={`c-${i}`} cx={d.x} cy={d.y} r={d.r} fill={d.fill} fillOpacity={d.alpha}>
          <title>{d.date}</title>
        </circle>
      ))}
      {/* Legend footer */}
      <text x={24} y={totalH - 4} fill="#71717a" fontSize={8}>
        max/day: {maxValue.toLocaleString()}
      </text>
    </svg>
  )
}

export default CalendarCorpus
