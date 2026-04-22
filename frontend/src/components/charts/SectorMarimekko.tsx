/**
 * SectorMarimekko — dot-matrix edition, risk-first.
 *
 * Sorted by H+C% (highest risk at top).
 * Dot order: CRITICAL → HIGH → MEDIUM → LOW (left to right).
 * Dot width ∝ sector spend vs. max sector spend.
 * Fixed H+C% column, color-coded by severity.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN } from '@/lib/utils'

export interface SectorMarimekkoRow {
  code: string
  name: string
  totalValue: number
  criticalPct: number
  highPct: number
  mediumPct: number
  lowPct: number
  color: string
  avgRisk: number
}

interface SectorMarimekkoProps {
  sectors: SectorMarimekkoRow[]
  onSectorClick?: (code: string) => void
  className?: string
}

// ── Layout ──────────────────────────────────────────────────────────────────
const LABEL_W  = 106
const TAB_W    = 3
const CHART_W  = 250
const GAP      = 8
const HC_W     = 44   // fixed H+C% column
const HC_GAP   = 6
const VALUE_W  = 82
const ROW_H    = 22
const ROW_GAP  = 4
const PAD_T    = 16   // header row height

const barStartX = LABEL_W + TAB_W
const dotStartX = barStartX + 1
const HC_X      = barStartX + CHART_W + GAP
const VALUE_X   = HC_X + HC_W + HC_GAP
const SVG_W     = VALUE_X + VALUE_W

// ── Dot-matrix params ────────────────────────────────────────────────────────
const DOT_R    = 3
const DOT_GAP  = 8
const N_DOTS   = Math.floor(CHART_W / DOT_GAP)  // 31

// ── Colors: CRITICAL → HIGH → MEDIUM → LOW (risk-first left-to-right) ───────
const DOT_CRITICAL    = '#ef4444'
const DOT_HIGH        = '#f59e0b'
const DOT_MEDIUM      = '#a16207'
const DOT_LOW         = '#52525b'   // was #3f3f46 — lifted for visibility
const DOT_EMPTY       = '#27272a'
const DOT_EMPTY_STR   = '#3f3f46'
const HEADER_COLOR    = '#71717a'
const GRID_COLOR      = 'rgba(255,255,255,0.05)'

function hcColor(pct: number): string {
  if (pct > 25) return '#ef4444'
  if (pct > 15) return '#f59e0b'
  if (pct > 8)  return '#d97706'
  return '#71717a'
}

// Critical-first dot coloring: most dangerous dots on the LEFT
function dotColor(i: number, critN: number, highN: number, medN: number, totalN: number): string {
  if (i >= totalN)              return DOT_EMPTY
  if (i < critN)                return DOT_CRITICAL
  if (i < critN + highN)        return DOT_HIGH
  if (i < critN + highN + medN) return DOT_MEDIUM
  return DOT_LOW
}

interface TooltipData {
  name: string
  totalValue: number
  highRiskPct: number
  criticalPct: number
  avgRisk: number
}

export function SectorMarimekko({ sectors, onSectorClick, className }: SectorMarimekkoProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Sort by H+C% descending — most dangerous sector at top
  const sorted = [...sectors].sort(
    (a, b) => (b.criticalPct + b.highPct) - (a.criticalPct + a.highPct)
  )
  const maxValue = Math.max(...sorted.map(s => s.totalValue), 1)
  if (maxValue === 0) return null

  const nSectors = sorted.length
  const legendH  = 22
  const svgH     = PAD_T + nSectors * (ROW_H + ROW_GAP) + legendH + 16

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        preserveAspectRatio="xMinYMid meet"
        aria-label="Sector risk and spend dot chart, sorted by high+critical rate"
        role="img"
      >
        {/* ── Column headers ──────────────────────────────────────────── */}
        <text x={HC_X + HC_W - 2} y={PAD_T - 4}
          textAnchor="end" fill={HEADER_COLOR} fontSize={8}
          fontFamily="var(--font-family-mono, monospace)" letterSpacing="0.08em">
          {lang === 'en' ? 'H+CRIT' : 'A+CRÍT'}
        </text>
        <text x={VALUE_X} y={PAD_T - 4}
          fill={HEADER_COLOR} fontSize={8}
          fontFamily="var(--font-family-mono, monospace)" letterSpacing="0.08em">
          {lang === 'en' ? 'SPEND' : 'GASTO'}
        </text>

        {/* Header underline */}
        <line x1={0} y1={PAD_T - 2} x2={SVG_W} y2={PAD_T - 2}
          stroke={GRID_COLOR} strokeWidth={1} />

        {/* ── Sector rows ─────────────────────────────────────────────── */}
        {sorted.map((sector, idx) => {
          const rowY   = PAD_T + idx * (ROW_H + ROW_GAP)
          const cy     = rowY + ROW_H / 2
          const totalN = Math.round((sector.totalValue / maxValue) * N_DOTS)

          // Risk-first dot allocation: critical → high → medium → low
          const critN = Math.round((sector.criticalPct / 100) * totalN)
          const highN = Math.round((sector.highPct    / 100) * totalN)
          const medN  = Math.round((sector.mediumPct  / 100) * totalN)

          const hrPct    = sector.criticalPct + sector.highPct
          const nameColor = hrPct > 20 ? '#e2e8f0' : '#c4bdb8'

          return (
            <g
              key={sector.code}
              className={onSectorClick ? 'cursor-pointer' : undefined}
              onClick={() => onSectorClick?.(sector.code)}
              onMouseEnter={() => setTooltip({
                name: sector.name,
                totalValue: sector.totalValue,
                highRiskPct: hrPct,
                criticalPct: sector.criticalPct,
                avgRisk: sector.avgRisk,
              })}
              onMouseLeave={() => setTooltip(null)}
              role={onSectorClick ? 'button' : undefined}
              aria-label={`${sector.name}: ${hrPct.toFixed(0)}% high+critical risk`}
            >
              {/* Sector name */}
              <text
                x={LABEL_W - 6} y={cy}
                textAnchor="end" dominantBaseline="middle"
                fill={nameColor} fontSize={11}
                fontFamily="var(--font-family-sans, sans-serif)"
              >
                {sector.name}
              </text>

              {/* Sector color tab */}
              <rect x={LABEL_W} y={rowY} width={TAB_W} height={ROW_H} fill={sector.color} />

              {/* Dot strip — critical-first */}
              {Array.from({ length: N_DOTS }).map((_, i) => {
                const isEmpty = i >= totalN
                const fill = dotColor(i, critN, highN, medN, totalN)
                return (
                  <circle
                    key={i}
                    cx={dotStartX + i * DOT_GAP + DOT_R}
                    cy={cy}
                    r={DOT_R}
                    fill={fill}
                    stroke={isEmpty ? DOT_EMPTY_STR : undefined}
                    strokeWidth={isEmpty ? 0.5 : 0}
                    fillOpacity={isEmpty ? 1 : 0.88}
                  />
                )
              })}

              {/* H+C% — fixed column, color-coded by severity */}
              <text
                x={HC_X + HC_W - 2} y={cy}
                textAnchor="end" dominantBaseline="middle"
                fill={hcColor(hrPct)}
                fontSize={hrPct > 15 ? 11 : 10}
                fontWeight={hrPct > 15 ? 'bold' : 'normal'}
                fontFamily="var(--font-family-mono, monospace)"
              >
                {hrPct.toFixed(0)}%
              </text>

              {/* Spend value */}
              <text
                x={VALUE_X} y={cy}
                dominantBaseline="middle"
                fill="#71717a"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
              >
                {formatCompactMXN(sector.totalValue)}
              </text>
            </g>
          )
        })}

        {/* ── Legend ──────────────────────────────────────────────────── */}
        {(() => {
          const legendY = PAD_T + nSectors * (ROW_H + ROW_GAP) + 8
          const items = lang === 'en'
            ? [
                { label: 'critical', fill: DOT_CRITICAL },
                { label: 'high',     fill: DOT_HIGH },
                { label: 'medium',   fill: DOT_MEDIUM },
                { label: 'low',      fill: DOT_LOW },
              ]
            : [
                { label: 'crítico',  fill: DOT_CRITICAL },
                { label: 'alto',     fill: DOT_HIGH },
                { label: 'medio',    fill: DOT_MEDIUM },
                { label: 'bajo',     fill: DOT_LOW },
              ]
          let lx = barStartX
          return (
            <g>
              {items.map(({ label, fill }) => {
                const el = (
                  <g key={label}>
                    <circle cx={lx + DOT_R} cy={legendY + 7} r={DOT_R} fill={fill} fillOpacity={0.88} />
                    <text x={lx + DOT_R * 2 + 4} y={legendY + 7}
                      fill="#71717a" fontSize={9}
                      fontFamily="var(--font-family-mono, monospace)"
                      dominantBaseline="middle">
                      {label}
                    </text>
                  </g>
                )
                lx += label.length * 5.5 + 18
                return el
              })}
              <text
                x={VALUE_X} y={legendY + 7}
                fill="#3f3f46" fontSize={9}
                fontFamily="var(--font-family-mono, monospace)"
                dominantBaseline="middle"
              >
                {lang === 'en' ? 'sorted by risk ↓' : 'orden: riesgo ↓'}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          minWidth: 190, background: '#1a1410',
          border: '1px solid #3a3430', borderRadius: 6,
          padding: '10px 14px', pointerEvents: 'none',
        }}>
          <p style={{ fontWeight: 600, color: '#e8e0d8', marginBottom: 6, fontSize: 13 }}>
            {tooltip.name}
          </p>
          <p style={{ color: '#78716c', fontSize: 11, marginBottom: 2 }}>
            {lang === 'en' ? 'Spend:' : 'Gasto:'}{' '}
            <span style={{ fontFamily: 'monospace', color: '#c4bdb8' }}>
              {formatCompactMXN(tooltip.totalValue)}
            </span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11, marginBottom: 2 }}>
            {lang === 'en' ? 'High + Critical:' : 'Alto + Crítico:'}{' '}
            <span style={{ fontFamily: 'monospace', color: '#f87171' }}>
              {tooltip.highRiskPct.toFixed(1)}%
            </span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11 }}>
            {lang === 'en' ? 'Critical only:' : 'Solo crítico:'}{' '}
            <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>
              {tooltip.criticalPct.toFixed(1)}%
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
