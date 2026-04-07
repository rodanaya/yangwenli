/**
 * SectorSlopeChart — Economist-style slopegraph comparing sector risk
 * across two time periods.
 *
 * Each sector is a line connecting its period-A value to its period-B value.
 * The sector with the biggest increase gets a bold label + upward arrow;
 * the sector with the biggest decrease gets a downward arrow annotation.
 */

import { memo, useMemo, useState, useCallback } from 'react'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import type { SectorYearItem } from '@/api/types'

// ─── Data source citation ────────────────────────────────────────────────────
const DATA_SOURCE = 'Source: RUBLI analysis · COMPRANET data 2002–2025 · Risk model v6.5'

interface SectorSlopeChartProps {
  /** Raw sector-year breakdown items from the API */
  sectorYearData: SectorYearItem[]
  /** Start year of period A (inclusive, default 2018) */
  periodAStart?: number
  /** End year of period A (inclusive, default 2020) */
  periodAEnd?: number
  /** Start year of period B (inclusive, default 2022) */
  periodBStart?: number
  /** End year of period B (inclusive, default 2024) */
  periodBEnd?: number
  /** Height of the SVG canvas in pixels (default 420) */
  height?: number
}

interface SlopeRow {
  sectorId: number
  code: string
  nameEN: string
  color: string
  valueA: number
  valueB: number
  delta: number
}

function computeSlopes(
  data: SectorYearItem[],
  pAStart: number,
  pAEnd: number,
  pBStart: number,
  pBEnd: number,
): SlopeRow[] {
  return SECTORS.map((sector) => {
    const rowsA = data.filter(
      (d) => d.sector_id === sector.id && d.year >= pAStart && d.year <= pAEnd,
    )
    const rowsB = data.filter(
      (d) => d.sector_id === sector.id && d.year >= pBStart && d.year <= pBEnd,
    )
    const totalA = rowsA.reduce((s, r) => s + r.contracts, 0)
    const totalB = rowsB.reduce((s, r) => s + r.contracts, 0)
    const valueA =
      totalA > 0
        ? rowsA.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalA
        : 0
    const valueB =
      totalB > 0
        ? rowsB.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalB
        : 0
    return {
      sectorId: sector.id,
      code: sector.code,
      nameEN: sector.nameEN,
      color: SECTOR_COLORS[sector.code] || '#64748b',
      valueA,
      valueB,
      delta: valueB - valueA,
    }
  })
}

export const SectorSlopeChart = memo(function SectorSlopeChart({
  sectorYearData,
  periodAStart = 2018,
  periodAEnd = 2020,
  periodBStart = 2022,
  periodBEnd = 2024,
  height = 420,
}: SectorSlopeChartProps) {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)

  const slopes = useMemo(
    () => computeSlopes(sectorYearData, periodAStart, periodAEnd, periodBStart, periodBEnd),
    [sectorYearData, periodAStart, periodAEnd, periodBStart, periodBEnd],
  )

  const maxIncrease = useMemo(
    () => slopes.reduce((best, s) => (s.delta > best.delta ? s : best), slopes[0]),
    [slopes],
  )
  const maxDecrease = useMemo(
    () => slopes.reduce((best, s) => (s.delta < best.delta ? s : best), slopes[0]),
    [slopes],
  )

  // Layout constants
  const leftCol = 180
  const rightCol = 520
  const topPad = 50
  const bottomPad = 40
  const chartHeight = height - topPad - bottomPad
  const svgWidth = 700

  // Y scale based on all values
  const allValues = slopes.flatMap((s) => [s.valueA, s.valueB])
  const yMin = Math.max(0, Math.min(...allValues) - 2)
  const yMax = Math.max(...allValues) + 2

  const yScale = useCallback(
    (v: number) => topPad + chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight,
    [chartHeight, yMin, yMax, topPad],
  )

  if (!slopes.length || slopes.every((s) => s.valueA === 0 && s.valueB === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted text-sm font-mono">
        No data available for slope chart
      </div>
    )
  }

  const periodALabel = `${periodAStart}–${periodAEnd}`
  const periodBLabel = `${periodBStart}–${periodBEnd}`

  return (
    <div>
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`Slope chart comparing sector high-risk rates: ${periodALabel} vs ${periodBLabel}`}
        style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
      >
        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={height} fill="transparent" />

        {/* Column headers */}
        <text x={leftCol} y={topPad - 20} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} fontWeight={700}>
          {periodALabel}
        </text>
        <text x={rightCol} y={topPad - 20} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} fontWeight={700}>
          {periodBLabel}
        </text>

        {/* Vertical guide lines */}
        <line x1={leftCol} y1={topPad - 8} x2={leftCol} y2={topPad + chartHeight + 4} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <line x1={rightCol} y1={topPad - 8} x2={rightCol} y2={topPad + chartHeight + 4} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

        {/* Slope lines */}
        {slopes.map((s) => {
          const y1 = yScale(s.valueA)
          const y2 = yScale(s.valueB)
          const isMax = s.code === maxIncrease?.code
          const isMin = s.code === maxDecrease?.code
          const isHovered = hoveredSector === s.code
          const dimmed = hoveredSector !== null && !isHovered

          return (
            <g
              key={s.code}
              onMouseEnter={() => setHoveredSector(s.code)}
              onMouseLeave={() => setHoveredSector(null)}
              style={{ cursor: 'default' }}
            >
              {/* Connecting line */}
              <line
                x1={leftCol}
                y1={y1}
                x2={rightCol}
                y2={y2}
                stroke={s.color}
                strokeWidth={isMax || isMin || isHovered ? 3 : 1.5}
                strokeOpacity={dimmed ? 0.15 : isHovered ? 1 : 0.7}
                strokeLinecap="round"
              />

              {/* Left dot */}
              <circle cx={leftCol} cy={y1} r={isHovered ? 5 : 3.5} fill={s.color} fillOpacity={dimmed ? 0.2 : 0.9} />
              {/* Right dot */}
              <circle cx={rightCol} cy={y2} r={isHovered ? 5 : 3.5} fill={s.color} fillOpacity={dimmed ? 0.2 : 0.9} />

              {/* Left label */}
              <text
                x={leftCol - 12}
                y={y1 + 4}
                textAnchor="end"
                fontSize={isMax || isMin || isHovered ? 11 : 10}
                fontWeight={isMax || isMin || isHovered ? 700 : 400}
                fill={dimmed ? 'rgba(255,255,255,0.15)' : s.color}
              >
                {s.nameEN} {s.valueA.toFixed(1)}%
              </text>

              {/* Right label */}
              <text
                x={rightCol + 12}
                y={y2 + 4}
                textAnchor="start"
                fontSize={isMax || isMin || isHovered ? 11 : 10}
                fontWeight={isMax || isMin || isHovered ? 700 : 400}
                fill={dimmed ? 'rgba(255,255,255,0.15)' : s.color}
              >
                {s.valueB.toFixed(1)}% {s.nameEN}
              </text>

              {/* Arrow annotation for biggest increase */}
              {isMax && s.delta > 0 && (
                <text
                  x={(leftCol + rightCol) / 2}
                  y={Math.min(y1, y2) - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#f87171"
                >
                  {'↑'} +{s.delta.toFixed(1)}pp
                </text>
              )}

              {/* Arrow annotation for biggest decrease */}
              {isMin && s.delta < 0 && (
                <text
                  x={(leftCol + rightCol) / 2}
                  y={Math.max(y1, y2) + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#4ade80"
                >
                  {'↓'} {s.delta.toFixed(1)}pp
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="text-xs text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800">
        {DATA_SOURCE}
      </p>
    </div>
  )
})

export default SectorSlopeChart
