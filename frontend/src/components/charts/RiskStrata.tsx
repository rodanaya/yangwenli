/**
 * RiskStrata — horizontal bar breakdown of contracts by risk level
 * critical → high → medium → low
 * Hero stat: high-risk rate (critical + high combined)
 */

import { formatNumber } from '@/lib/utils'

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

const STRATA_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#a16207',
  low:      '#3f3f46',
}

const STRATA_OPACITY: Record<string, number> = {
  critical: 1.0,
  high:     0.88,
  medium:   0.65,
  low:      0.45,
}

const LABEL_W  = 58
const BAR_W    = 160
const GAP      = 6
const PCT_W    = 36
const COUNT_W  = 76
const ROW_H    = 20
const ROW_GAP  = 6
const SVG_W    = LABEL_W + BAR_W + GAP + PCT_W + COUNT_W

export function RiskStrata({ rows, totalContracts, hrRate, className }: RiskStrataProps) {
  const order: RiskStrataRow['level'][] = ['critical', 'high', 'medium', 'low']
  const sorted = order.map((lvl) => rows.find((r) => r.level === lvl)).filter(Boolean) as RiskStrataRow[]

  // Scale bars relative to max pct so small values (6%, 7%) are still visible
  const maxPct = Math.max(...sorted.map((r) => r.pct), 1)

  // Hero block height
  const HERO_H = 56
  const svgH = HERO_H + sorted.length * (ROW_H + ROW_GAP) + 36

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgH}`}
      width="100%"
      preserveAspectRatio="xMinYMid meet"
      className={className}
      aria-label={`Risk distribution: ${hrRate.toFixed(1)}% high-risk rate across ${totalContracts.toLocaleString()} contracts`}
      role="img"
    >
      {/* ── Hero stat ───────────────────────────────────────────────── */}
      <text x={0} y={34} fill="#ef4444" fontSize={32} fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold" dominantBaseline="middle">
        {hrRate.toFixed(1)}%
      </text>
      <text x={0} y={50} fill="#71717a" fontSize={9} fontFamily="var(--font-family-mono, monospace)"
        dominantBaseline="middle" letterSpacing="0.08em">
        HIGH-RISK RATE · OECD 2–15%
      </text>

      {/* ── Horizontal bars ─────────────────────────────────────────── */}
      {sorted.map((row, idx) => {
        const rowY = HERO_H + idx * (ROW_H + ROW_GAP)
        const fill = STRATA_COLORS[row.level] ?? '#3f3f46'
        const opacity = STRATA_OPACITY[row.level] ?? 0.5
        const barFill = (row.pct / maxPct) * BAR_W

        return (
          <g key={row.level}>
            {/* Level label */}
            <text
              x={LABEL_W - 4}
              y={rowY + ROW_H / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill={row.level === 'critical' || row.level === 'high' ? '#a8a29e' : '#52525b'}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
            >
              {row.label}
            </text>

            {/* Background track */}
            <rect x={LABEL_W} y={rowY} width={BAR_W} height={ROW_H}
              fill="#1c1917" fillOpacity={0.5} rx={2} />

            {/* Filled bar */}
            <rect x={LABEL_W} y={rowY} width={Math.max(barFill, 1)} height={ROW_H}
              fill={fill} fillOpacity={opacity} rx={2} />

            {/* Percentage */}
            <text
              x={LABEL_W + BAR_W + GAP}
              y={rowY + ROW_H / 2}
              dominantBaseline="middle"
              fill={row.level === 'critical' ? '#f87171' : row.level === 'high' ? '#fbbf24' : '#52525b'}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={row.level === 'critical' || row.level === 'high' ? 'bold' : 'normal'}
            >
              {row.pct.toFixed(1)}%
            </text>

            {/* Count */}
            <text
              x={LABEL_W + BAR_W + GAP + PCT_W}
              y={rowY + ROW_H / 2}
              dominantBaseline="middle"
              fill="#3f3f46"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
            >
              {formatNumber(row.count)}
            </text>
          </g>
        )
      })}

      {/* ── Caption ─────────────────────────────────────────────────── */}
      {(() => {
        const capY = HERO_H + sorted.length * (ROW_H + ROW_GAP) + 12
        return (
          <text x={LABEL_W} y={capY} fill="#3f3f46" fontSize={9}
            fontFamily="var(--font-family-mono, monospace)" dominantBaseline="hanging">
            {formatNumber(totalContracts)} contracts analyzed
          </text>
        )
      })()}
    </svg>
  )
}
