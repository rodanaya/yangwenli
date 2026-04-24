/**
 * RiskStrata — 10×10 waffle chart: each dot = 1% of all contracts.
 * Critical-first layout clusters the danger zone in the upper-left.
 *
 * Replaces the broken 4-row dot matrix where critical and high both
 * mapped to 1 filled dot each — visually indistinguishable and
 * editorially misleading.
 */

import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/lib/utils'

export interface RiskStrataRow {
  level: 'critical' | 'high' | 'medium' | 'low'
  count: number
  pct: number   // 0–100
  label: string
}

interface RiskStrataProps {
  rows: RiskStrataRow[]
  totalContracts: number
  hrRate: number           // high + critical combined %
  className?: string
}

// ── Waffle grid params ─────────────────────────────────────────────────────
const COLS     = 10
const ROWS     = 10
const DOT_R    = 7
const STEP     = 17          // center-to-center; gap = STEP − 2×DOT_R = 3px
const GRID_W   = (COLS - 1) * STEP + 2 * DOT_R   // 153 + 14 = 167
const GRID_H   = (ROWS - 1) * STEP + 2 * DOT_R   // same

// ── Layout ────────────────────────────────────────────────────────────────
const HERO_H   = 56
const GRID_X   = DOT_R                   // 7 — left-flush, no clip
const GRID_Y   = HERO_H + 8             // 64
const STATS_X  = GRID_W + 24            // 191 — stats column starts here
const STAT_H   = 30                     // row height in stats column

const SVG_W    = STATS_X + 132          // 323
const SVG_H    = GRID_Y + GRID_H + 22  // 253

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  critical:    '#ef4444',
  high:        '#f59e0b',
  medium:      '#92400e',   // dark amber — subdued, not alarming
  lowFill:     '#f3f1ec',   // near-black
  lowStroke:   '#e2ddd6',
} as const

const LABEL_C: Record<string, string> = {
  critical: '#f87171',
  high:     '#fbbf24',
  medium:   '#a16207',
  low:      '#52525b',
}

function dotFill(i: number, crit: number, high: number, med: number) {
  if (i < crit)              return C.critical
  if (i < crit + high)       return C.high
  if (i < crit + high + med) return C.medium
  return null  // low — render as empty dot
}

export function RiskStrata({ rows, totalContracts, hrRate, className }: RiskStrataProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  const get = (lvl: RiskStrataRow['level']) => rows.find(r => r.level === lvl)
  const crit = get('critical')
  const high = get('high')
  const med  = get('medium')
  const low  = get('low')

  // Clamp to whole-number counts that sum to 100
  const critN = Math.round(crit?.pct ?? 0)
  const highN = Math.round(high?.pct ?? 0)
  const medN  = Math.round(med?.pct ?? 0)
  // low = remainder (not used directly — dotFill handles it as the fallback)

  const statRows = [
    { key: 'critical' as const, row: crit },
    { key: 'high'     as const, row: high },
    { key: 'medium'   as const, row: med  },
    { key: 'low'      as const, row: low  },
  ]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMinYMid meet"
      className={className}
      role="img"
      aria-label={`Risk waffle chart: ${hrRate.toFixed(1)}% high-risk rate across ${formatNumber(totalContracts)} contracts`}
    >
      {/* ── Hero stat ───────────────────────────────────────────────── */}
      <text
        x={0} y={30}
        fill={C.critical}
        fontSize={28}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight="bold"
        dominantBaseline="middle"
      >
        {hrRate.toFixed(1)}%
      </text>
      <text
        x={0} y={48}
        fill="var(--color-text-muted)"
        fontSize={9}
        fontFamily="var(--font-family-mono, monospace)"
        letterSpacing="0.10em"
        dominantBaseline="middle"
      >
        {lang === 'en' ? 'HIGH-RISK RATE · OECD 2–15%' : 'TASA DE RIESGO ALTO · OCDE 2–15%'}
      </text>

      {/* ── Waffle: 10×10 dots ──────────────────────────────────────── */}
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const cx  = GRID_X + col * STEP
        const cy  = GRID_Y + row * STEP
        const fill = dotFill(i, critN, highN, medN)
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={DOT_R}
            fill={fill ?? C.lowFill}
            stroke={fill ? 'none' : C.lowStroke}
            strokeWidth={fill ? 0 : 0.5}
          />
        )
      })}

      {/* ── Stats column ────────────────────────────────────────────── */}
      {statRows.map(({ key, row }, idx) => {
        if (!row) return null
        const y   = GRID_Y + idx * STAT_H
        const isHigh = key === 'critical' || key === 'high'
        const dotFillColor = key === 'low' ? 'none' : C[key as keyof typeof C]
        return (
          <g key={key}>
            {/* Color indicator */}
            <circle
              cx={STATS_X + 5} cy={y + 6}
              r={4.5}
              fill={typeof dotFillColor === 'string' && dotFillColor !== 'none' ? dotFillColor : C.lowFill}
              stroke={key === 'low' ? C.lowStroke : 'none'}
              strokeWidth={key === 'low' ? 1 : 0}
            />
            {/* Level name */}
            <text
              x={STATS_X + 15} y={y + 7}
              fill={isHigh ? 'var(--color-text-muted)' : '#52525b'}
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              letterSpacing="0.06em"
              dominantBaseline="middle"
            >
              {row.label.toUpperCase()}
            </text>
            {/* Percentage */}
            <text
              x={STATS_X + 15} y={y + 20}
              fill={LABEL_C[key]}
              fontSize={isHigh ? 12 : 10}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={isHigh ? 'bold' : 'normal'}
              dominantBaseline="middle"
            >
              {row.pct.toFixed(1)}%
            </text>
            {/* Count */}
            <text
              x={STATS_X + 62} y={y + 20}
              fill="#4a4a4a"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              dominantBaseline="middle"
            >
              {formatNumber(row.count)}
            </text>
          </g>
        )
      })}

      {/* ── Caption ─────────────────────────────────────────────────── */}
      <text
        x={GRID_X} y={SVG_H - 5}
        fill="#e2ddd6"
        fontSize={8}
        fontFamily="var(--font-family-mono, monospace)"
      >
        {lang === 'en'
          ? `${formatNumber(totalContracts)} contracts · 1 dot = 1%`
          : `${formatNumber(totalContracts)} contratos · 1 punto = 1%`}
      </text>
    </svg>
  )
}
