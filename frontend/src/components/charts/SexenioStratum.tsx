/**
 * SexenioStratum — 23-year horizontal timeline of Mexican federal procurement.
 *
 * Each column = one year. Height ∝ √(total_value_mxn), expressing spending
 * magnitude without letting PEMEX superspend dwarf everything else.
 * Fill = warm top (high+critical risk share) + zinc bottom (lower-risk share).
 * Sexenio boundary hairlines mark presidential transitions.
 * OECD 15% dashed line anchors the risk ceiling.
 * 2025 pulses amber — the current year, still accumulating.
 *
 * Design grammar: same thermal/geological vocabulary as RiskStrata, but
 * unrolled horizontally across 23 years. Tells the story RiskStrata cannot:
 * that risk concentration varies dramatically by sexenio, and that value
 * scale has nothing to do with where the corruption pressure lands.
 */
import { useMemo } from 'react'

export interface SexenioYearRow {
  year: number
  value_mxn: number
  avg_risk: number        // 0–1 (v0.6.5 score)
  high_risk_pct: number  // 0–100 (high + critical combined share)
  contracts: number
}

interface SexenioStratumProps {
  rows: SexenioYearRow[]
  className?: string
}

// ── Layout constants ──────────────────────────────────────────────────────────
const SVG_W   = 840
const SVG_H   = 160
const PAD_L   = 32   // room for left axis label
const PAD_R   = 12
const PAD_T   = 12
const PAD_B   = 32   // room for year labels
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B
const OECD_PCT = 15  // OECD 2-15% high-risk ceiling

// Sexenio boundary years (start of new presidential term)
// Fox 2000-2006, Calderón 2006-2012, Peña 2012-2018, AMLO 2018-2024, Sheinbaum 2024-
const SEXENIO_BOUNDS = [
  { year: 2006, label: 'Calderón' },
  { year: 2012, label: 'Peña Nieto' },
  { year: 2018, label: 'AMLO' },
  { year: 2024, label: 'Sheinbaum' },
]

// Colors
const RISK_WARM   = '#ef4444'  // critical red top
const RISK_MID    = '#f59e0b'  // amber mid
const RISK_ZINC   = '#3f3f46'  // zinc-700 for the low-risk base
const OECD_COLOR  = '#06b6d4'  // cyan (same as RiskStrata)
const TEXT_MUTED  = '#52525b'
const TEXT_DIM    = '#3f3f46'
const PULSE_COLOR = '#f59e0b'  // amber for 2025

const CURRENT_YEAR = 2025

export function SexenioStratum({ rows, className }: SexenioStratumProps) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.year - b.year),
    [rows]
  )

  const { colW, maxSqrtVal, oecdY } = useMemo(() => {
    if (!sorted.length) return { colW: 0, maxSqrtVal: 1, oecdY: PAD_T }
    const n = sorted.length
    const colW = FIELD_W / n
    const maxSqrtVal = Math.max(...sorted.map((r) => Math.sqrt(r.value_mxn || 1)))
    // OECD line: high_risk_pct = OECD_PCT → y from top of field
    // We position the line at a fixed ratio of FIELD_H based on OECD target
    // It's decorative — marks 15% high-risk as a reference ceiling
    const oecdY = PAD_T + FIELD_H * (1 - OECD_PCT / 100)
    return { colW, maxSqrtVal, oecdY }
  }, [sorted])

  if (!sorted.length) return null

  const n = sorted.length
  const startYear = sorted[0].year
  const endYear   = sorted[n - 1].year

  // Build column rects
  const columns = sorted.map((row, i) => {
    const x = PAD_L + i * colW
    const sqrtH = (Math.sqrt(row.value_mxn || 1) / maxSqrtVal) * FIELD_H
    const barY  = PAD_T + (FIELD_H - sqrtH)   // bar sits at bottom of field
    const hrFrac = Math.min(1, (row.high_risk_pct || 0) / 100)
    // Warm portion = top hrFrac of the bar
    const warmH = sqrtH * hrFrac
    const zincH = sqrtH - warmH
    return { row, x, colW, barY, sqrtH, warmH, zincH }
  })

  // Sexenio boundary x positions
  const boundaryLines = SEXENIO_BOUNDS.flatMap((b) => {
    // Find the column index where this year starts
    const idx = sorted.findIndex((r) => r.year === b.year)
    if (idx < 0) return []
    const bx = PAD_L + idx * colW
    return [{ x: bx, label: b.label, year: b.year }]
  })

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`Federal procurement timeline ${startYear}–${endYear}: column height shows total contract value, warm fill shows high-risk share by year.`}
    >
      {/* ── Definitions: pulse animation for 2025, gradient ──────────────── */}
      <defs>
        <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={RISK_WARM} stopOpacity="0.85" />
          <stop offset="100%" stopColor={RISK_MID}  stopOpacity="0.70" />
        </linearGradient>
        <style>{`
          @keyframes ss-pulse {
            0%, 100% { opacity: 0.0; r: 3; }
            50%       { opacity: 0.55; r: 5.5; }
          }
          .ss-pulse { animation: ss-pulse 2.4s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── Field baseline ───────────────────────────────────────────────── */}
      <line
        x1={PAD_L}
        y1={PAD_T + FIELD_H}
        x2={PAD_L + FIELD_W}
        y2={PAD_T + FIELD_H}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {/* ── Sexenio boundary hairlines ───────────────────────────────────── */}
      {boundaryLines.map((b) => (
        <g key={`sxb-${b.year}`}>
          <line
            x1={b.x}
            y1={PAD_T}
            x2={b.x}
            y2={PAD_T + FIELD_H}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          {/* President label — rotated, above the bar field */}
          <text
            x={b.x + 3}
            y={PAD_T + 2}
            fill={TEXT_MUTED}
            fontSize={7.5}
            fontFamily="var(--font-family-mono, monospace)"
            opacity={0.7}
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* ── OECD 15% reference line ──────────────────────────────────────── */}
      <line
        x1={PAD_L}
        y1={oecdY}
        x2={PAD_L + FIELD_W}
        y2={oecdY}
        stroke={OECD_COLOR}
        strokeWidth={0.75}
        strokeDasharray="4 5"
        strokeOpacity={0.4}
      />
      <text
        x={PAD_L - 4}
        y={oecdY + 1}
        fill={OECD_COLOR}
        fontSize={7}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end"
        dominantBaseline="middle"
        opacity={0.6}
      >
        15%
      </text>

      {/* ── Year columns ──────────────────────────────────────────────────── */}
      {columns.map(({ row, x, barY, sqrtH, warmH, zincH }) => {
        const isCurrent = row.year === CURRENT_YEAR
        const gap = 0.8  // gap between columns
        const colInner = colW - gap

        return (
          <g key={`col-${row.year}`}>
            {/* Zinc base (low+medium risk share) */}
            {zincH > 0.5 && (
              <rect
                x={x + gap / 2}
                y={barY + warmH}
                width={colInner}
                height={zincH}
                fill={RISK_ZINC}
                fillOpacity={isCurrent ? 0.65 : 0.50}
              />
            )}
            {/* Warm top (high+critical risk share) */}
            {warmH > 0.5 && (
              <rect
                x={x + gap / 2}
                y={barY}
                width={colInner}
                height={warmH}
                fill="url(#warmGrad)"
                fillOpacity={isCurrent ? 1.0 : 0.85}
              />
            )}
            {/* Pulse crown for current year */}
            {isCurrent && (
              <circle
                className="ss-pulse"
                cx={x + colW / 2}
                cy={barY + (sqrtH > 2 ? warmH / 2 : 0)}
                r={4}
                fill={PULSE_COLOR}
              />
            )}
          </g>
        )
      })}

      {/* ── Year labels (every 4 years + current) ────────────────────────── */}
      {sorted.map((row, i) => {
        const x = PAD_L + i * colW + colW / 2
        const isCurrent = row.year === CURRENT_YEAR
        const showLabel = row.year % 4 === 2 || isCurrent || row.year === startYear
        if (!showLabel) return null
        return (
          <text
            key={`lbl-${row.year}`}
            x={x}
            y={SVG_H - 10}
            fill={isCurrent ? PULSE_COLOR : TEXT_MUTED}
            fontSize={isCurrent ? 8.5 : 7.5}
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight={isCurrent ? 'bold' : 'normal'}
            textAnchor="middle"
            opacity={isCurrent ? 1 : 0.7}
          >
            {row.year}
          </text>
        )
      })}

      {/* ── Left axis: "MXN spend" label ─────────────────────────────────── */}
      <text
        x={PAD_L - 6}
        y={PAD_T + FIELD_H / 2}
        fill={TEXT_DIM}
        fontSize={7.5}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="middle"
        transform={`rotate(-90, ${PAD_L - 6}, ${PAD_T + FIELD_H / 2})`}
        opacity={0.5}
      >
        √ SPEND
      </text>

      {/* ── Caption (bottom right) ───────────────────────────────────────── */}
      <text
        x={SVG_W - PAD_R}
        y={SVG_H - 10}
        fill={TEXT_DIM}
        fontSize={7}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end"
        opacity={0.5}
      >
        height = √(contract value) · warm fill = high+critical risk share · — — = OECD 15% ceiling
      </text>
    </svg>
  )
}
