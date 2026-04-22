/**
 * RiskStrata — dot-matrix breakdown of contracts by risk level
 * critical → high → medium → low
 * Hero stat: high-risk rate (critical + high combined)
 */

import { useTranslation } from 'react-i18next'
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
  medium:   '#fbbf24',
  low:      '#4ade80',
}

// Dot-matrix params — matches AdminFingerprints protocol
const DOT_R        = 3
const DOT_GAP      = 8
const N_DOTS       = 20       // 20 dots × 5% = 100%
const LABEL_W      = 58
const DOT_AREA_W   = N_DOTS * DOT_GAP   // 160px
const GAP          = 6
const PCT_W        = 36
const COUNT_W      = 76
const ROW_H        = 16
const ROW_GAP      = 10
const EMPTY_DOT    = '#27272a'
const EMPTY_STROKE = '#3f3f46'
const SVG_W        = LABEL_W + DOT_AREA_W + GAP + PCT_W + COUNT_W

export function RiskStrata({ rows, totalContracts, hrRate, className }: RiskStrataProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  const order: RiskStrataRow['level'][] = ['critical', 'high', 'medium', 'low']
  const sorted = order.map((lvl) => rows.find((r) => r.level === lvl)).filter(Boolean) as RiskStrataRow[]

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
      <text x={0} y={50} fill="#a1a1aa" fontSize={10} fontFamily="var(--font-family-mono, monospace)"
        dominantBaseline="middle" letterSpacing="0.08em">
        {lang === 'en' ? 'HIGH-RISK RATE · OECD 2–15%' : 'TASA DE RIESGO ALTO · OCDE 2–15%'}
      </text>

      {/* ── Dot-matrix rows ─────────────────────────────────────────── */}
      {sorted.map((row, idx) => {
        const rowY = HERO_H + idx * (ROW_H + ROW_GAP)
        const cy   = rowY + ROW_H / 2
        const fill = STRATA_COLORS[row.level] ?? '#3f3f46'
        const filled = Math.round((row.pct / 100) * N_DOTS)
        const isHighSeverity = row.level === 'critical' || row.level === 'high'

        return (
          <g key={row.level}>
            {/* Level label */}
            <text
              x={LABEL_W - 4}
              y={cy}
              textAnchor="end"
              dominantBaseline="middle"
              fill={isHighSeverity ? '#a1a1aa' : '#71717a'}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
            >
              {row.label}
            </text>

            {/* Dot strip */}
            {Array.from({ length: N_DOTS }).map((_, i) => (
              <circle
                key={i}
                cx={LABEL_W + i * DOT_GAP + DOT_R}
                cy={cy}
                r={DOT_R}
                fill={i < filled ? fill : EMPTY_DOT}
                stroke={i < filled ? undefined : EMPTY_STROKE}
                strokeWidth={i < filled ? 0 : 0.5}
                fillOpacity={i < filled ? (isHighSeverity ? 1.0 : 0.78) : 1}
              />
            ))}

            {/* Percentage */}
            <text
              x={LABEL_W + DOT_AREA_W + GAP}
              y={cy}
              dominantBaseline="middle"
              fill={row.level === 'critical' ? '#f87171' : row.level === 'high' ? '#fbbf24' : '#71717a'}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={isHighSeverity ? 'bold' : 'normal'}
            >
              {row.pct.toFixed(1)}%
            </text>

            {/* Count */}
            <text
              x={LABEL_W + DOT_AREA_W + GAP + PCT_W}
              y={cy}
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={10}
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
            {lang === 'en'
              ? `${formatNumber(totalContracts)} contracts · 1 dot ≈ 5%`
              : `${formatNumber(totalContracts)} contratos · 1 punto ≈ 5%`}
          </text>
        )
      })()}
    </svg>
  )
}
