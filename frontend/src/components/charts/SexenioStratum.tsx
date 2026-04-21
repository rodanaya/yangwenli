import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

// ── Layout ──────────────────────────────────────────────────────────────────
const SVG_W   = 840
const PAD_L   = 36
const PAD_R   = 8
const PAD_T   = 40    // admin label row (two-line label: name + spend)
const PAD_B   = 32    // year labels + caption
const ROWS    = 22    // dot rows per column
const DOT_R   = 3
const DOT_GAP = 8
const FIELD_W = SVG_W - PAD_L - PAD_R    // 796
const FIELD_H = ROWS * DOT_GAP            // 176
const SVG_H   = PAD_T + FIELD_H + PAD_B   // 248

const OECD_PCT  = 15
const TOOLTIP_W = 108

// ── Colors ──────────────────────────────────────────────────────────────────
const DOT_AMBER        = '#f59e0b'   // high + critical risk
const DOT_ZINC         = '#52525b'   // low + medium risk
const DOT_EMPTY        = '#2d2926'   // unfilled
const DOT_EMPTY_STROKE = '#3d3734'
const OECD_COLOR       = '#06b6d4'
const TEXT_MUTED       = '#52525b'
const PULSE_COLOR      = '#f59e0b'
const CURRENT_YEAR     = 2025

// ── Administration bands ────────────────────────────────────────────────────
const ADMIN_BANDS = [
  { startYear: 2002, endYear: 2006, color: '#1a5276', label: 'Fox' },
  { startYear: 2007, endYear: 2012, color: '#1a5276', label: 'Calderón' },
  { startYear: 2013, endYear: 2018, color: '#c41e3a', label: 'P. Nieto' },
  { startYear: 2019, endYear: 2024, color: '#7b2d8b', label: 'AMLO' },
  { startYear: 2025, endYear: 2030, color: '#7b2d8b', label: 'Sheinbaum' },
] as const

const fmtB = (v: number) => {
  const b = v / 1e9
  return b >= 1000 ? `${(b / 1000).toFixed(1)}T` : `${Math.round(b)}B`
}

export function SexenioStratum({ rows, className }: SexenioStratumProps) {
  const navigate = useNavigate()
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)

  const sorted = useMemo(() => [...rows].sort((a, b) => a.year - b.year), [rows])

  const adminTotals = useMemo(() =>
    ADMIN_BANDS.reduce((acc, band) => {
      const total = sorted
        .filter(r => r.year >= band.startYear && r.year <= band.endYear)
        .reduce((s, r) => s + (r.value_mxn || 0), 0)
      acc[band.label] = total
      return acc
    }, {} as Record<string, number>),
  [sorted])

  const { colW, maxSqrtVal } = useMemo(() => {
    if (!sorted.length) return { colW: 0, maxSqrtVal: 1 }
    const colW = FIELD_W / sorted.length
    const maxSqrtVal = Math.max(...sorted.map((r) => Math.sqrt(r.value_mxn || 1)))
    return { colW, maxSqrtVal }
  }, [sorted])

  if (!sorted.length) return null

  const startYear = sorted[0].year
  const endYear   = sorted[sorted.length - 1].year

  // OECD 15% line: row where 15% of dots would be amber (from top)
  const oecdDotRow = Math.round(ROWS * OECD_PCT / 100)
  const oecdY = PAD_T + oecdDotRow * DOT_GAP

  // Precompute per-column dot data
  const columns = sorted.map((row, i) => {
    const cx       = PAD_L + i * colW + colW / 2
    const sqrtFrac = Math.sqrt(row.value_mxn || 1) / maxSqrtVal
    const filled   = Math.max(1, Math.round(sqrtFrac * ROWS))
    const hrFrac   = Math.min(1, (row.high_risk_pct || 0) / 100)
    const hrDots   = Math.round(hrFrac * filled)
    return { row, cx, filled, hrDots }
  })

  // Administration band rectangles mapped to pixel coords
  const adminBands = ADMIN_BANDS.flatMap((band) => {
    const firstIdx = sorted.findIndex((r) => r.year === band.startYear)
    const lastIdx  = sorted.reduce((acc, r, i) => (r.year <= band.endYear ? i : acc), -1)
    if (firstIdx < 0 || lastIdx < 0) return []
    const x1     = PAD_L + firstIdx * colW
    const x2     = PAD_L + (lastIdx + 1) * colW
    const labelX = (x1 + x2) / 2
    return [{ ...band, x1, x2, labelX }]
  })

  const hoveredRow = hoveredYear != null
    ? sorted.find((r) => r.year === hoveredYear) ?? null
    : null

  const tooltipX = hoveredYear != null
    ? (() => {
        const idx = sorted.findIndex((r) => r.year === hoveredYear)
        if (idx < 0) return SVG_W / 2
        const cx = PAD_L + idx * colW + colW / 2
        return Math.max(
          PAD_L + TOOLTIP_W / 2 + 2,
          Math.min(SVG_W - PAD_R - TOOLTIP_W / 2 - 2, cx)
        )
      })()
    : 0

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-label={`Federal procurement ${startYear}–${endYear}: dot matrix by year. Amber = high/critical risk. Click to explore.`}
    >
      <defs>
        <style>{`
          @keyframes ss-pulse {
            0%, 100% { opacity: 0; }
            50%       { opacity: 0.55; }
          }
          .ss-pulse { animation: ss-pulse 2.4s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── Administration background bands ──────────────────────────────── */}
      {adminBands.map((band) => (
        <g key={`band-${band.label}`}>
          <rect
            x={band.x1} y={PAD_T}
            width={band.x2 - band.x1} height={FIELD_H}
            fill={band.color} fillOpacity={0.05}
          />
          {/* Top accent hairline per administration */}
          <rect
            x={band.x1 + 1} y={PAD_T}
            width={band.x2 - band.x1 - 2} height={1.5}
            fill={band.color} fillOpacity={hoveredRow ? 0.2 : 0.5}
          />
          {/* Admin label — two lines: name + spend total */}
          <text
            x={band.labelX} y={PAD_T - 14}
            fill={band.color} fontSize={8} fontWeight="600"
            fontFamily="var(--font-family-mono, monospace)"
            textAnchor="middle"
            opacity={hoveredRow ? 0.2 : 0.85}
            style={{ pointerEvents: 'none' }}
          >
            {band.label}
          </text>
          <text
            x={band.labelX} y={PAD_T - 5}
            fill={band.color} fontSize={6.5}
            fontFamily="var(--font-family-mono, monospace)"
            textAnchor="middle"
            opacity={hoveredRow ? 0.15 : 0.6}
            style={{ pointerEvents: 'none' }}
          >
            {adminTotals[band.label] ? fmtB(adminTotals[band.label]) : '—'}
          </text>
        </g>
      ))}

      {/* ── Baseline ─────────────────────────────────────────────────────── */}
      <line
        x1={PAD_L} y1={PAD_T + FIELD_H}
        x2={PAD_L + FIELD_W} y2={PAD_T + FIELD_H}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}
      />

      {/* ── OECD 15% reference line ──────────────────────────────────────── */}
      <line
        x1={PAD_L} y1={oecdY}
        x2={PAD_L + FIELD_W} y2={oecdY}
        stroke={OECD_COLOR} strokeWidth={0.75}
        strokeDasharray="4 5" strokeOpacity={0.4}
      />
      <text
        x={PAD_L - 4} y={oecdY + 1}
        fill={OECD_COLOR} fontSize={6}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end" dominantBaseline="middle" opacity={0.6}
      >15%</text>

      {/* ── Dot columns ──────────────────────────────────────────────────── */}
      {columns.map(({ row, cx, filled, hrDots }) => {
        const isCurrent  = row.year === CURRENT_YEAR
        const isHovered  = row.year === hoveredYear
        const emptyStart = ROWS - filled   // rows 0..(emptyStart-1) = empty
        const hrEnd      = emptyStart + hrDots  // rows emptyStart..(hrEnd-1) = amber

        return (
          <g
            key={`col-${row.year}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredYear(row.year)}
            onMouseLeave={() => setHoveredYear(null)}
            onClick={() => navigate(`/year-in-review/${row.year}`)}
          >
            {/* transparent hit target */}
            <rect
              x={cx - colW / 2} y={PAD_T}
              width={colW} height={FIELD_H}
              fill="transparent"
            />

            {/* hover highlight */}
            {isHovered && (
              <rect
                x={cx - colW / 2 + 1} y={PAD_T}
                width={colW - 2} height={FIELD_H}
                fill="rgba(255,255,255,0.04)" rx={1}
              />
            )}

            {/* dots — top to bottom (dotIdx=0 is topmost) */}
            {Array.from({ length: ROWS }, (_, dotIdx) => {
              const dotY   = PAD_T + dotIdx * DOT_GAP + DOT_R
              const isEmpty = dotIdx < emptyStart
              const isAmber = !isEmpty && dotIdx < hrEnd

              return (
                <circle
                  key={dotIdx}
                  cx={cx}
                  cy={dotY}
                  r={DOT_R}
                  fill={isEmpty ? DOT_EMPTY : isAmber ? DOT_AMBER : DOT_ZINC}
                  stroke={isEmpty ? DOT_EMPTY_STROKE : 'none'}
                  strokeWidth={isEmpty ? 0.5 : 0}
                  fillOpacity={isEmpty ? 1 : isCurrent ? 0.95 : isHovered ? 0.90 : 0.78}
                />
              )
            })}

            {/* pulse crown on topmost amber dot for current year */}
            {isCurrent && hrDots > 0 && (
              <circle
                className="ss-pulse"
                cx={cx}
                cy={PAD_T + emptyStart * DOT_GAP + DOT_R}
                r={5}
                fill={PULSE_COLOR}
              />
            )}
          </g>
        )
      })}

      {/* ── Year labels (every 2 years + current + hovered) ─────────────── */}
      {sorted.map((row, i) => {
        const lx        = PAD_L + i * colW + colW / 2
        const isCurrent = row.year === CURRENT_YEAR
        const isHov     = row.year === hoveredYear
        const showLabel = row.year % 2 === 0 || isCurrent || row.year === startYear || isHov
        if (!showLabel) return null
        return (
          <text
            key={`lbl-${row.year}`}
            x={lx} y={SVG_H - 10}
            fill={isCurrent ? PULSE_COLOR : isHov ? '#a1a1aa' : TEXT_MUTED}
            fontSize={isCurrent ? 7 : 6}
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight={isCurrent || isHov ? 'bold' : 'normal'}
            textAnchor="middle"
            opacity={isCurrent ? 1 : isHov ? 1 : 0.7}
            style={{ pointerEvents: 'none' }}
          >
            {row.year}
          </text>
        )
      })}

      {/* ── Left axis label ──────────────────────────────────────────────── */}
      <text
        x={PAD_L - 10} y={PAD_T + FIELD_H / 2}
        fill="#3f3f46" fontSize={6}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="middle"
        transform={`rotate(-90, ${PAD_L - 10}, ${PAD_T + FIELD_H / 2})`}
        opacity={0.40}
      >√ SPEND</text>

      {/* ── Caption bottom right ─────────────────────────────────────────── */}
      <text
        x={SVG_W - PAD_R} y={SVG_H - 10}
        fill="#3f3f46" fontSize={5.5}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end" opacity={0.40}
      >dots ≈ √spend · amber = high/critical risk · — — = OECD 15% · click to explore</text>

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {hoveredRow && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltipX - TOOLTIP_W / 2} y={PAD_T + 4}
            width={TOOLTIP_W} height={60}
            fill="#18181b" stroke="#3f3f46" strokeWidth={0.5} rx={2}
          />
          <text x={tooltipX} y={PAD_T + 17} textAnchor="middle"
                fill="#f4f4f5" fontSize={9} fontFamily="monospace" fontWeight="bold">
            {hoveredRow.year}
          </text>
          <text x={tooltipX} y={PAD_T + 28} textAnchor="middle"
                fill="#a1a1aa" fontSize={6.5} fontFamily="monospace">
            {fmtB(hoveredRow.value_mxn)} MXN
          </text>
          <text x={tooltipX} y={PAD_T + 38} textAnchor="middle"
                fill="#a1a1aa" fontSize={6.5} fontFamily="monospace">
            {hoveredRow.contracts.toLocaleString()} contracts
          </text>
          <text x={tooltipX} y={PAD_T + 48} textAnchor="middle"
                fill="#f59e0b" fontSize={6.5} fontFamily="monospace">
            {hoveredRow.high_risk_pct.toFixed(1)}% high/critical
          </text>
          <text x={tooltipX} y={PAD_T + 58} textAnchor="middle"
                fill="#52525b" fontSize={5.5} fontFamily="monospace">
            click to explore →
          </text>
        </g>
      )}
    </svg>
  )
}
