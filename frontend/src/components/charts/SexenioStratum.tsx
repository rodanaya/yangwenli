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

// ── Layout constants ──────────────────────────────────────────────────────────
const SVG_W   = 840
const SVG_H   = 160
const PAD_L   = 32
const PAD_R   = 12
const PAD_T   = 12
const PAD_B   = 32
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B
const OECD_PCT = 15
const TOOLTIP_W = 100

const SEXENIO_BOUNDS = [
  { year: 2006, label: 'Calderón' },
  { year: 2012, label: 'Peña Nieto' },
  { year: 2018, label: 'AMLO' },
  { year: 2024, label: 'Sheinbaum' },
]

const RISK_WARM   = '#ef4444'
const RISK_MID    = '#f59e0b'
const RISK_ZINC   = '#3f3f46'
const OECD_COLOR  = '#06b6d4'
const TEXT_MUTED  = '#52525b'
const TEXT_DIM    = '#3f3f46'
const PULSE_COLOR = '#f59e0b'

const CURRENT_YEAR = 2025

export function SexenioStratum({ rows, className }: SexenioStratumProps) {
  const navigate = useNavigate()
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.year - b.year),
    [rows]
  )

  const { colW, maxSqrtVal, oecdY } = useMemo(() => {
    if (!sorted.length) return { colW: 0, maxSqrtVal: 1, oecdY: PAD_T }
    const n = sorted.length
    const colW = FIELD_W / n
    const maxSqrtVal = Math.max(...sorted.map((r) => Math.sqrt(r.value_mxn || 1)))
    const oecdY = PAD_T + FIELD_H * (1 - OECD_PCT / 100)
    return { colW, maxSqrtVal, oecdY }
  }, [sorted])

  if (!sorted.length) return null

  const startYear = sorted[0].year
  const endYear   = sorted[sorted.length - 1].year

  const columns = sorted.map((row, i) => {
    const x = PAD_L + i * colW
    const sqrtH = (Math.sqrt(row.value_mxn || 1) / maxSqrtVal) * FIELD_H
    const barY  = PAD_T + (FIELD_H - sqrtH)
    const hrFrac = Math.min(1, (row.high_risk_pct || 0) / 100)
    const warmH = sqrtH * hrFrac
    const zincH = sqrtH - warmH
    return { row, x, barY, sqrtH, warmH, zincH }
  })

  const boundaryLines = SEXENIO_BOUNDS.flatMap((b) => {
    const idx = sorted.findIndex((r) => r.year === b.year)
    if (idx < 0) return []
    return [{ x: PAD_L + idx * colW, label: b.label, year: b.year }]
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

  const fmtB = (v: number) => {
    const b = v / 1e9
    return b >= 1000 ? `${(b / 1000).toFixed(1)}T` : `${Math.round(b)}B`
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-label={`Federal procurement ${startYear}–${endYear}: click a year column to explore details.`}
    >
      <defs>
        <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={RISK_WARM} stopOpacity="0.85" />
          <stop offset="100%" stopColor={RISK_MID}  stopOpacity="0.70" />
        </linearGradient>
        <style>{`
          @keyframes ss-pulse {
            0%, 100% { opacity: 0.0; }
            50%       { opacity: 0.55; }
          }
          .ss-pulse { animation: ss-pulse 2.4s ease-in-out infinite; }
          .ss-col   { cursor: pointer; }
        `}</style>
      </defs>

      {/* field baseline */}
      <line
        x1={PAD_L} y1={PAD_T + FIELD_H}
        x2={PAD_L + FIELD_W} y2={PAD_T + FIELD_H}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1}
      />

      {/* sexenio boundary hairlines (lines only) */}
      {boundaryLines.map((b) => (
        <line
          key={`bl-${b.year}`}
          x1={b.x} y1={PAD_T}
          x2={b.x} y2={PAD_T + FIELD_H}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}

      {/* OECD 15% reference line */}
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

      {/* year columns — interactive */}
      {columns.map(({ row, x, barY, sqrtH, warmH, zincH }) => {
        const isCurrent = row.year === CURRENT_YEAR
        const isHovered = row.year === hoveredYear
        const gap = 0.8
        const colInner = colW - gap

        return (
          <g
            key={`col-${row.year}`}
            className="ss-col"
            onMouseEnter={() => setHoveredYear(row.year)}
            onMouseLeave={() => setHoveredYear(null)}
            onClick={() => navigate(`/year-in-review/${row.year}`)}
          >
            {/* full-height transparent hit target */}
            <rect x={x} y={PAD_T} width={colW} height={FIELD_H} fill="transparent" />

            {/* hover highlight */}
            {isHovered && (
              <rect
                x={x + gap / 2} y={PAD_T}
                width={colInner} height={FIELD_H}
                fill="rgba(255,255,255,0.045)" rx={1}
              />
            )}

            {/* zinc base (low+medium risk) */}
            {zincH > 0.5 && (
              <rect
                x={x + gap / 2} y={barY + warmH}
                width={colInner} height={zincH}
                fill={RISK_ZINC}
                fillOpacity={isCurrent ? 0.65 : isHovered ? 0.60 : 0.50}
              />
            )}

            {/* warm top (high+critical risk) */}
            {warmH > 0.5 && (
              <rect
                x={x + gap / 2} y={barY}
                width={colInner} height={warmH}
                fill="url(#warmGrad)"
                fillOpacity={isCurrent ? 1.0 : isHovered ? 0.95 : 0.85}
              />
            )}

            {/* amber pulse crown for current year */}
            {isCurrent && (
              <circle
                className="ss-pulse"
                cx={x + colW / 2}
                cy={barY + (sqrtH > 2 ? warmH / 2 : 0)}
                r={4} fill={PULSE_COLOR}
              />
            )}
          </g>
        )
      })}

      {/* year labels (every 4 years + current + hovered) */}
      {sorted.map((row, i) => {
        const lx = PAD_L + i * colW + colW / 2
        const isCurrent = row.year === CURRENT_YEAR
        const isHov = row.year === hoveredYear
        const showLabel = row.year % 4 === 2 || isCurrent || row.year === startYear || isHov
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

      {/* left axis label */}
      <text
        x={PAD_L - 6} y={PAD_T + FIELD_H / 2}
        fill={TEXT_DIM} fontSize={6}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="middle"
        transform={`rotate(-90, ${PAD_L - 6}, ${PAD_T + FIELD_H / 2})`}
        opacity={0.45}
      >√ SPEND</text>

      {/* caption bottom right */}
      <text
        x={SVG_W - PAD_R} y={SVG_H - 10}
        fill={TEXT_DIM} fontSize={5.5}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end" opacity={0.45}
      >height = √(value) · warm = high+critical · — — = OECD 15% · click to explore</text>

      {/* president labels — dimmed while tooltip showing */}
      {boundaryLines.map((b) => (
        <text
          key={`bl-lbl-${b.year}`}
          x={b.x + 3} y={PAD_T + 2}
          fill={TEXT_MUTED} fontSize={5.5}
          fontFamily="var(--font-family-mono, monospace)"
          opacity={hoveredRow ? 0.25 : 0.65}
          style={{ pointerEvents: 'none' }}
        >
          {b.label}
        </text>
      ))}

      {/* tooltip — topmost layer */}
      {hoveredRow && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltipX - TOOLTIP_W / 2} y={PAD_T + 2}
            width={TOOLTIP_W} height={58}
            fill="#18181b" stroke="#3f3f46" strokeWidth={0.5} rx={2}
          />
          <text x={tooltipX} y={PAD_T + 14} textAnchor="middle"
                fill="#f4f4f5" fontSize={9} fontFamily="monospace" fontWeight="bold">
            {hoveredRow.year}
          </text>
          <text x={tooltipX} y={PAD_T + 25} textAnchor="middle"
                fill="#a1a1aa" fontSize={6.5} fontFamily="monospace">
            {fmtB(hoveredRow.value_mxn)} MXN
          </text>
          <text x={tooltipX} y={PAD_T + 35} textAnchor="middle"
                fill="#a1a1aa" fontSize={6.5} fontFamily="monospace">
            {hoveredRow.contracts.toLocaleString()} contracts
          </text>
          <text x={tooltipX} y={PAD_T + 45} textAnchor="middle"
                fill="#f59e0b" fontSize={6.5} fontFamily="monospace">
            {hoveredRow.high_risk_pct.toFixed(1)}% high/critical
          </text>
          <text x={tooltipX} y={PAD_T + 55} textAnchor="middle"
                fill="#52525b" fontSize={5.5} fontFamily="monospace">
            click to explore →
          </text>
        </g>
      )}
    </svg>
  )
}
