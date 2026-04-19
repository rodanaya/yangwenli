/**
 * SectorMarimekko — horizontal bar chart
 * Bar width = sector spend relative to largest sector (not grand total)
 * Fill = risk composition (low → medium → high → critical, L→R)
 */

import { useState } from 'react'
import { formatCompactMXN } from '@/lib/utils'

export interface SectorMarimekkoRow {
  code: string
  name: string
  totalValue: number     // MXN
  criticalPct: number    // 0-100
  highPct: number
  mediumPct: number
  lowPct: number
  color: string          // sector color
  avgRisk: number        // 0-1
}

interface SectorMarimekkoProps {
  sectors: SectorMarimekkoRow[]
  onSectorClick?: (code: string) => void
  className?: string
}

const LABEL_W  = 112
const TAB_W    = 3
const CHART_W  = 300
const GAP      = 10
const VALUE_W  = 90
const ROW_H    = 22
const ROW_GAP  = 4
const SVG_W    = LABEL_W + TAB_W + CHART_W + GAP + VALUE_W

const SEG_COLORS = {
  low:      { fill: '#3f3f46', opacity: 0.45 },
  medium:   { fill: '#a16207', opacity: 0.65 },
  high:     { fill: '#f59e0b', opacity: 0.88 },
  critical: { fill: '#ef4444', opacity: 1.0, stroke: '#fca5a5', strokeWidth: 0.5 },
} as const

interface TooltipData {
  code: string
  name: string
  totalValue: number
  highRiskPct: number
  criticalPct: number
  avgRisk: number
}

export function SectorMarimekko({ sectors, onSectorClick, className }: SectorMarimekkoProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const sorted = [...sectors].sort((a, b) => b.totalValue - a.totalValue)
  const maxValue = sorted[0]?.totalValue ?? 1
  if (maxValue === 0) return null

  const nSectors = sorted.length
  const legendH = 22
  const svgH = nSectors * (ROW_H + ROW_GAP) + legendH + 16

  const barStartX = LABEL_W + TAB_W

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        preserveAspectRatio="xMinYMid meet"
        aria-label="Sector spend and risk composition chart"
        role="img"
      >
        {sorted.map((sector, idx) => {
          const rowY = idx * (ROW_H + ROW_GAP)
          const barWidth = (sector.totalValue / maxValue) * CHART_W

          const segments: Array<{ key: string; pct: number; fill: string; opacity: number; stroke?: string; strokeWidth?: number }> = [
            { key: 'low',      pct: sector.lowPct,      ...SEG_COLORS.low },
            { key: 'medium',   pct: sector.mediumPct,   ...SEG_COLORS.medium },
            { key: 'high',     pct: sector.highPct,     ...SEG_COLORS.high },
            { key: 'critical', pct: sector.criticalPct, ...SEG_COLORS.critical },
          ]

          let segX = barStartX
          const renderedSegs = segments.map((seg) => {
            const segW = (seg.pct / 100) * barWidth
            const x = segX
            segX += segW
            if (segW < 0.5) return null
            return (
              <rect
                key={seg.key}
                x={x}
                y={rowY}
                width={segW}
                height={ROW_H}
                fill={seg.fill}
                fillOpacity={seg.opacity}
                stroke={seg.stroke}
                strokeWidth={seg.strokeWidth ?? 0}
              />
            )
          })

          const hrPct = sector.highPct + sector.criticalPct

          return (
            <g
              key={sector.code}
              className={onSectorClick ? 'cursor-pointer' : undefined}
              onClick={() => onSectorClick?.(sector.code)}
              onMouseEnter={() => setTooltip({ code: sector.code, name: sector.name, totalValue: sector.totalValue, highRiskPct: hrPct, criticalPct: sector.criticalPct, avgRisk: sector.avgRisk })}
              onMouseLeave={() => setTooltip(null)}
              role={onSectorClick ? 'button' : undefined}
              aria-label={`${sector.name}: ${formatCompactMXN(sector.totalValue)}`}
            >
              {/* Sector name */}
              <text x={LABEL_W - 6} y={rowY + ROW_H / 2} textAnchor="end" dominantBaseline="middle"
                fill="#c4bdb8" fontSize={11} fontFamily="var(--font-family-sans, sans-serif)">
                {sector.name}
              </text>

              {/* Sector color tab */}
              <rect x={LABEL_W} y={rowY} width={TAB_W} height={ROW_H} fill={sector.color} />

              {/* Background track */}
              <rect x={barStartX} y={rowY} width={CHART_W} height={ROW_H}
                fill="#1c1917" fillOpacity={0.5} />

              {/* Risk composition fill */}
              {renderedSegs}

              {/* H+C % label inside bar right edge — only if wide enough */}
              {barWidth > 50 && hrPct > 0 && (
                <text
                  x={barStartX + barWidth - 4}
                  y={rowY + ROW_H / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.55)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono, monospace)"
                >
                  {hrPct.toFixed(0)}%
                </text>
              )}

              {/* Value label — always at fixed right position */}
              <text
                x={barStartX + CHART_W + GAP}
                y={rowY + ROW_H / 2}
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
          const items = [
            { label: 'low',      fill: '#3f3f46', opacity: 0.7 },
            { label: 'medium',   fill: '#a16207', opacity: 0.8 },
            { label: 'high',     fill: '#f59e0b', opacity: 0.9 },
            { label: 'critical', fill: '#ef4444', opacity: 1.0 },
          ]
          let lx = barStartX
          return (
            <g>
              {items.map(({ label, fill, opacity }) => {
                const el = (
                  <g key={label}>
                    <rect x={lx} y={legendY + 3} width={8} height={8} fill={fill} fillOpacity={opacity} rx={1} />
                    <text x={lx + 11} y={legendY + 7} fill="#52525b" fontSize={9}
                      fontFamily="var(--font-family-mono, monospace)" dominantBaseline="middle">
                      {label}
                    </text>
                  </g>
                )
                lx += label.length * 6 + 22
                return el
              })}
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
            Spend: <span style={{ fontFamily: 'monospace', color: '#c4bdb8' }}>{formatCompactMXN(tooltip.totalValue)}</span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11, marginBottom: 2 }}>
            High + Critical: <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{tooltip.highRiskPct.toFixed(1)}%</span>
          </p>
          <p style={{ color: '#78716c', fontSize: 11 }}>
            Critical only: <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>{tooltip.criticalPct.toFixed(1)}%</span>
          </p>
        </div>
      )}
    </div>
  )
}
