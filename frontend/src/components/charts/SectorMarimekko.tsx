/**
 * SectorMarimekko — variable-width bar chart
 * Width encodes total spend, fill encodes risk composition
 * Each sector row width is proportional to its share of grand total spend
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

const LABEL_W  = 110
const CHART_W  = 340
const VALUE_W  = 80
const ROW_H    = 24
const ROW_GAP  = 3
const SVG_W    = LABEL_W + CHART_W + VALUE_W

// Risk segment colors (low → critical, left to right inside each row)
const SEG_COLORS = {
  low:      { fill: '#3f3f46', opacity: 0.5 },
  medium:   { fill: '#a16207', opacity: 0.7 },
  high:     { fill: '#f59e0b', opacity: 0.9 },
  critical: { fill: '#ef4444', opacity: 1.0, stroke: '#fca5a5', strokeWidth: 0.5 },
} as const

interface TooltipData {
  code: string
  name: string
  totalValue: number
  highRiskPct: number
  avgRisk: number
  x: number
  y: number
}

export function SectorMarimekko({ sectors, onSectorClick, className }: SectorMarimekkoProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Sort by totalValue descending
  const sorted = [...sectors].sort((a, b) => b.totalValue - a.totalValue)

  const grandTotal = sorted.reduce((s, r) => s + r.totalValue, 0)
  if (grandTotal === 0) return null

  const nSectors = sorted.length
  const svgH = nSectors * (ROW_H + ROW_GAP) + 30

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        preserveAspectRatio="xMinYMid meet"
        aria-label="Marimekko chart of contract spend and risk by sector"
        role="img"
      >
        {sorted.map((sector, idx) => {
          const rowY = idx * (ROW_H + ROW_GAP)
          const rowWidth = (sector.totalValue / grandTotal) * CHART_W
          const barX = LABEL_W + 3 // after the 3px tab

          // Risk segments: low, medium, high, critical (left to right)
          const segments: Array<{
            key: string
            pct: number
            fill: string
            opacity: number
            stroke?: string
            strokeWidth?: number
          }> = [
            { key: 'low',      pct: sector.lowPct,      ...SEG_COLORS.low },
            { key: 'medium',   pct: sector.mediumPct,   ...SEG_COLORS.medium },
            { key: 'high',     pct: sector.highPct,     ...SEG_COLORS.high },
            { key: 'critical', pct: sector.criticalPct, ...SEG_COLORS.critical },
          ]

          let segX = barX
          const renderedSegs = segments.map((seg) => {
            const segW = (seg.pct / 100) * rowWidth
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

          const handleMouseEnter = () => {
            setTooltip({
              code: sector.code,
              name: sector.name,
              totalValue: sector.totalValue,
              highRiskPct: sector.highPct + sector.criticalPct,
              avgRisk: sector.avgRisk,
              x: LABEL_W + rowWidth,
              y: rowY,
            })
          }

          return (
            <g
              key={sector.code}
              className={onSectorClick ? 'cursor-pointer' : undefined}
              onClick={() => onSectorClick?.(sector.code)}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setTooltip(null)}
              role={onSectorClick ? 'button' : undefined}
              aria-label={`${sector.name}: ${formatCompactMXN(sector.totalValue)}`}
            >
              {/* Sector name label */}
              <text
                x={LABEL_W - 8}
                y={rowY + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#d4d4d8"
                fontSize={12}
                fontFamily="var(--font-family-sans, sans-serif)"
              >
                {sector.name}
              </text>

              {/* 3px colored sector identity tab */}
              <rect
                x={LABEL_W}
                y={rowY}
                width={3}
                height={ROW_H}
                fill={sector.color}
              />

              {/* Risk composition segments */}
              {renderedSegs}

              {/* Spend value to the right of segments */}
              <text
                x={LABEL_W + rowWidth + 6}
                y={rowY + ROW_H / 2}
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

        {/* Bottom legend strip */}
        <text
          x={LABEL_W}
          y={nSectors * (ROW_H + ROW_GAP) + 8}
          fill="#52525b"
          fontSize={9}
          fontFamily="var(--font-family-mono, monospace)"
          dominantBaseline="hanging"
        >
          {'← width = total contract value · fill = risk composition →'}
        </text>
      </svg>

      {/* Hover tooltip via absolutely-positioned div */}
      {tooltip && (
        <div
          className="chart-tooltip pointer-events-none"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            minWidth: 180,
          }}
        >
          <p className="font-medium text-zinc-200 mb-1">{tooltip.name}</p>
          <p className="text-zinc-400 text-xs">
            Spend: <span className="font-mono text-zinc-200">{formatCompactMXN(tooltip.totalValue)}</span>
          </p>
          <p className="text-zinc-400 text-xs">
            High-risk: <span className="font-mono text-zinc-200">{tooltip.highRiskPct.toFixed(1)}%</span>
          </p>
          <p className="text-zinc-400 text-xs">
            Avg risk: <span className="font-mono text-zinc-200">{(tooltip.avgRisk * 100).toFixed(1)}%</span>
          </p>
        </div>
      )}
    </div>
  )
}
