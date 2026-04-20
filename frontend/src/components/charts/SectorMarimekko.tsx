/**
 * SectorMarimekko — dot-matrix edition.
 *
 * Each row = one sector. Total filled dots ∝ sector spend (vs largest sector).
 * Dot color = risk composition (low → medium → high → critical, L→R).
 * This preserves both the relative spend signal and the risk breakdown
 * in one compact dot strip per sector.
 */

import { useState } from 'react'
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

// Layout
const LABEL_W  = 112
const TAB_W    = 3
const CHART_W  = 300
const GAP      = 10
const VALUE_W  = 90
const ROW_H    = 22
const ROW_GAP  = 4
const SVG_W    = LABEL_W + TAB_W + CHART_W + GAP + VALUE_W

// Dot-matrix protocol
const DOT_R    = 3
const DOT_GAP  = 8
const N_DOTS   = Math.floor(CHART_W / DOT_GAP)  // 37 dots

// Risk segment colors — warm investigative palette
const DOT_LOW      = '#3f3f46'
const DOT_MEDIUM   = '#a16207'
const DOT_HIGH     = '#f59e0b'
const DOT_CRITICAL = '#ef4444'
const DOT_EMPTY    = '#f3f1ec'
const DOT_EMPTY_STROKE = '#e2ddd6'

interface TooltipData {
  code: string
  name: string
  totalValue: number
  highRiskPct: number
  criticalPct: number
  avgRisk: number
}

function dotColorForIndex(i: number, lowN: number, medN: number, highN: number, totalN: number): string {
  if (i >= totalN) return DOT_EMPTY
  if (i < lowN) return DOT_LOW
  if (i < lowN + medN) return DOT_MEDIUM
  if (i < lowN + medN + highN) return DOT_HIGH
  return DOT_CRITICAL
}

export function SectorMarimekko({ sectors, onSectorClick, className }: SectorMarimekkoProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const sorted = [...sectors].sort((a, b) => b.totalValue - a.totalValue)
  const maxValue = sorted[0]?.totalValue ?? 1
  if (maxValue === 0) return null

  const nSectors = sorted.length
  const legendH  = 22
  const svgH     = nSectors * (ROW_H + ROW_GAP) + legendH + 16

  const barStartX = LABEL_W + TAB_W
  const dotStartX = barStartX + 1   // 1px gap after sector color tab

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        preserveAspectRatio="xMinYMid meet"
        aria-label="Sector spend and risk composition dot chart"
        role="img"
      >
        {sorted.map((sector, idx) => {
          const rowY    = idx * (ROW_H + ROW_GAP)
          const cy      = rowY + ROW_H / 2
          const totalN  = Math.round((sector.totalValue / maxValue) * N_DOTS)

          // Compute dot allocation per risk tier
          const lowN  = Math.round((sector.lowPct / 100) * totalN)
          const medN  = Math.round((sector.mediumPct / 100) * totalN)
          const highN = Math.round((sector.highPct / 100) * totalN)
          // critN = totalN - lowN - medN - highN (residual, handled in dotColorForIndex)

          const hrPct = sector.highPct + sector.criticalPct

          return (
            <g
              key={sector.code}
              className={onSectorClick ? 'cursor-pointer' : undefined}
              onClick={() => onSectorClick?.(sector.code)}
              onMouseEnter={() => setTooltip({
                code: sector.code,
                name: sector.name,
                totalValue: sector.totalValue,
                highRiskPct: hrPct,
                criticalPct: sector.criticalPct,
                avgRisk: sector.avgRisk,
              })}
              onMouseLeave={() => setTooltip(null)}
              role={onSectorClick ? 'button' : undefined}
              aria-label={`${sector.name}: ${formatCompactMXN(sector.totalValue)}`}
            >
              {/* Sector name */}
              <text
                x={LABEL_W - 6} y={cy} textAnchor="end" dominantBaseline="middle"
                fill="#c4bdb8" fontSize={11}
                fontFamily="var(--font-family-sans, sans-serif)"
              >
                {sector.name}
              </text>

              {/* Sector color tab */}
              <rect x={LABEL_W} y={rowY} width={TAB_W} height={ROW_H} fill={sector.color} />

              {/* Dot strip */}
              {Array.from({ length: N_DOTS }).map((_, i) => {
                const isEmpty = i >= totalN
                return (
                  <circle
                    key={i}
                    cx={dotStartX + i * DOT_GAP + DOT_R}
                    cy={cy}
                    r={DOT_R}
                    fill={dotColorForIndex(i, lowN, medN, highN, totalN)}
                    stroke={isEmpty ? DOT_EMPTY_STROKE : undefined}
                    strokeWidth={isEmpty ? 0.5 : 0}
                    fillOpacity={isEmpty ? 1 : 0.9}
                  />
                )
              })}

              {/* H+C % label — only if enough dots filled */}
              {totalN > 12 && hrPct > 0 && (
                <text
                  x={dotStartX + (totalN - 1) * DOT_GAP + DOT_R * 2 + 4}
                  y={cy}
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.45)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono, monospace)"
                >
                  {hrPct.toFixed(0)}%
                </text>
              )}

              {/* Value label — fixed right position */}
              <text
                x={barStartX + CHART_W + GAP}
                y={cy}
                dominantBaseline="middle"
                fill="#78716c"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
              >
                {formatCompactMXN(sector.totalValue)}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        {(() => {
          const legendY = nSectors * (ROW_H + ROW_GAP) + 8
          const items: Array<{ label: string; fill: string }> = [
            { label: 'bajo',     fill: DOT_LOW },
            { label: 'medio',    fill: DOT_MEDIUM },
            { label: 'alto',     fill: DOT_HIGH },
            { label: 'crítico',  fill: DOT_CRITICAL },
          ]
          let lx = barStartX
          return (
            <g>
              {items.map(({ label, fill }) => {
                const el = (
                  <g key={label}>
                    <circle cx={lx + DOT_R} cy={legendY + 7} r={DOT_R} fill={fill} fillOpacity={0.9} />
                    <text x={lx + DOT_R * 2 + 4} y={legendY + 7} fill="#52525b" fontSize={9}
                      fontFamily="var(--font-family-mono, monospace)" dominantBaseline="middle">
                      {label}
                    </text>
                  </g>
                )
                lx += label.length * 5.8 + 20
                return el
              })}
              <text
                x={barStartX + CHART_W + GAP}
                y={legendY + 7}
                fill="#3f3f46"
                fontSize={9}
                fontFamily="var(--font-family-mono, monospace)"
                dominantBaseline="middle"
              >
                1 punto ≈ {(100 / N_DOTS).toFixed(0)}% del gasto mayor
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            minWidth: 190,
            background: '#1a1410',
            border: '1px solid #3a3430',
            borderRadius: 6,
            padding: '10px 14px',
            pointerEvents: 'none',
          }}
        >
          <p style={{ fontWeight: 600, color: '#e8e0d8', marginBottom: 6, fontSize: 13 }}>{tooltip.name}</p>
          <p style={{ color: '#78716c', fontSize: 11, marginBottom: 2 }}>
            Gasto: <span style={{ fontFamily: 'monospace', color: '#c4bdb8' }}>{formatCompactMXN(tooltip.totalValue)}</span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11, marginBottom: 2 }}>
            Alto + Crítico: <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{tooltip.highRiskPct.toFixed(1)}%</span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11 }}>
            Solo crítico: <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>{tooltip.criticalPct.toFixed(1)}%</span>
          </p>
        </div>
      )}
    </div>
  )
}
