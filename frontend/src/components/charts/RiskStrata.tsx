/**
 * RiskStrata — a vertical geological column
 * One tall bar = the universe of contracts
 * Strata from top (critical, hot) to bottom (low, cool)
 * OECD 15% reference line cuts horizontally through it
 */

export interface RiskStrataRow {
  level: 'critical' | 'high' | 'medium' | 'low'
  count: number
  pct: number   // 0-100
  label: string // "Critical" / "High" / "Medium" / "Low"
}

interface RiskStrataProps {
  rows: RiskStrataRow[]         // sorted critical→high→medium→low
  totalContracts: number
  hrRate: number                // high+critical pct (e.g. 13.49)
  className?: string
}

const STRATA_COLORS: Record<string, { fill: string; stroke?: string; opacity: number }> = {
  critical: { fill: '#ef4444', stroke: '#dc2626', opacity: 1.0 },
  high:     { fill: '#f59e0b', opacity: 0.9 },
  medium:   { fill: '#a16207', opacity: 0.6 },
  low:      { fill: '#3f3f46', opacity: 0.5 },
}

const TOTAL_H = 280
const COL_W   = 52
const COL_X   = 180
const LEADER_END_X = 248
const LABEL_X = 254
const SVG_W   = 520
const SVG_H   = 340

export function RiskStrata({ rows, totalContracts, hrRate, className }: RiskStrataProps) {
  // Compute cumulative y positions
  let cumPct = 0
  const segments = rows.map((row) => {
    const y = (cumPct / 100) * TOTAL_H
    const h = (row.pct / 100) * TOTAL_H
    cumPct += row.pct
    return { ...row, y, h }
  })

  // OECD 15% line at y = 15% of TOTAL_H
  const oecdY = TOTAL_H * 0.15

  // Hero stat: midpoint of critical+high band
  const critHighPct = rows
    .filter((r) => r.level === 'critical' || r.level === 'high')
    .reduce((s, r) => s + r.pct, 0)
  const heroY = (critHighPct / 100) * TOTAL_H / 2

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMinYMid meet"
      className={className}
      aria-label="Geological column chart of contracts by risk level"
      role="img"
    >
      {/* ── Geological strata column ─────────────────────────────────────── */}
      {segments.map((seg) => {
        if (seg.h < 0.5) return null
        const style = STRATA_COLORS[seg.level] ?? { fill: '#3f3f46', opacity: 0.5 }
        return (
          <rect
            key={seg.level}
            x={COL_X}
            y={seg.y}
            width={COL_W}
            height={seg.h}
            fill={style.fill}
            fillOpacity={style.opacity}
            stroke={style.stroke}
            strokeWidth={style.stroke ? 1 : 0}
          />
        )
      })}

      {/* ── Dashed leader lines + labels ─────────────────────────────────── */}
      {segments.map((seg) => {
        if (seg.h < 0.5) return null
        const midY = seg.y + seg.h / 2
        return (
          <g key={`label-${seg.level}`}>
            {/* Leader line */}
            <line
              x1={COL_X + COL_W}
              y1={midY}
              x2={LEADER_END_X}
              y2={midY}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            {/* Tier label */}
            <text
              x={LABEL_X}
              y={midY - 6}
              fill="#d4d4d8"
              fontSize={11}
              fontFamily="var(--font-family-mono, monospace)"
              dominantBaseline="middle"
            >
              {seg.label}
            </text>
            {/* Pct + count */}
            <text
              x={LABEL_X}
              y={midY + 8}
              fill="#71717a"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              dominantBaseline="middle"
            >
              {seg.pct.toFixed(1)}% · {seg.count.toLocaleString()}
            </text>
          </g>
        )
      })}

      {/* ── OECD 15% reference line ───────────────────────────────────────── */}
      <line
        x1={COL_X - 12}
        y1={oecdY}
        x2={COL_X + COL_W + 12}
        y2={oecdY}
        stroke="#22d3ee"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={COL_X - 14}
        y={oecdY}
        fill="#22d3ee"
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        textAnchor="end"
        dominantBaseline="middle"
      >
        OECD 15%
      </text>

      {/* ── Hero stat — hrRate, floats left of column ────────────────────── */}
      <text
        x={COL_X - 16}
        y={heroY - 8}
        textAnchor="end"
        fill="#ef4444"
        fontSize={28}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold"
        dominantBaseline="middle"
      >
        {hrRate.toFixed(1)}%
      </text>
      <text
        x={COL_X - 16}
        y={heroY + 18}
        textAnchor="end"
        fill="#71717a"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        dominantBaseline="middle"
      >
        high-risk
      </text>

      {/* ── Column border (hairline) ──────────────────────────────────────── */}
      <rect
        x={COL_X}
        y={0}
        width={COL_W}
        height={TOTAL_H}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {/* ── Caption below column ─────────────────────────────────────────── */}
      <text
        x={COL_X + COL_W / 2}
        y={TOTAL_H + 18}
        textAnchor="middle"
        fill="#52525b"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
      >
        {totalContracts.toLocaleString()} contracts analyzed
      </text>
    </svg>
  )
}
