/**
 * RiskTopography — risk as a topographic surface.
 *
 * Two-axis grid (e.g. sector × year). Each cell = 0..1 high-risk rate,
 * rendered as a dot density in a tiny mini-field inside the cell. A
 * contour step at OECD ceiling (15%) is drawn as a continuous red
 * ribbon across cells that exceed it — the "peaks" of the landscape.
 *
 * This makes hotspots legible as geography, not as tabular color.
 */
import { useMemo } from 'react'
import { halton } from '@/lib/particle'
import { FONT_MONO, HAIRLINE_STROKE, OECD_CEILING, RISK_PALETTE } from '@/lib/editorial'

export interface TopographyCell {
  xKey: string   // e.g. year "2024"
  yKey: string   // e.g. sector "salud"
  value: number  // 0..1 high-risk rate
}

interface RiskTopographyProps {
  cells: TopographyCell[]
  xKeys: string[]
  yKeys: string[]
  width?: number
  height?: number
  /** Max dots per cell (scales with value). */
  maxDotsPerCell?: number
  className?: string
}

export function RiskTopography({
  cells,
  xKeys,
  yKeys,
  width = 720,
  height = 320,
  maxDotsPerCell = 18,
  className,
}: RiskTopographyProps) {
  const { cellW, cellH, lookup, peakCells } = useMemo(() => {
    const padL = 86
    const padT = 12
    const padR = 18
    const padB = 28
    const cellW = (width - padL - padR) / Math.max(1, xKeys.length)
    const cellH = (height - padT - padB) / Math.max(1, yKeys.length)
    const lookup = new Map<string, number>()
    for (const c of cells) lookup.set(`${c.xKey}|${c.yKey}`, c.value)
    const peakCells: { xi: number; yi: number }[] = []
    for (let yi = 0; yi < yKeys.length; yi++) {
      for (let xi = 0; xi < xKeys.length; xi++) {
        const v = lookup.get(`${xKeys[xi]}|${yKeys[yi]}`) ?? 0
        if (v >= OECD_CEILING) peakCells.push({ xi, yi })
      }
    }
    return { cellW, cellH, lookup, peakCells }
  }, [cells, xKeys, yKeys, width, height])

  const padL = 86
  const padT = 12

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Risk topography grid"
      style={{ fontFamily: FONT_MONO }}
    >
      {/* Y labels */}
      {yKeys.map((k, yi) => (
        <text
          key={`y-${k}`}
          x={padL - 6}
          y={padT + yi * cellH + cellH / 2}
          fill="#a1a1aa"
          fontSize={10}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {k.slice(0, 14)}
        </text>
      ))}
      {/* X labels (sparse: first, middle, last) */}
      {[0, Math.floor(xKeys.length / 2), xKeys.length - 1].filter((xi) => xi >= 0 && xi < xKeys.length).map((xi) => (
        <text
          key={`x-${xi}`}
          x={padL + xi * cellW + cellW / 2}
          y={height - 8}
          fill="#71717a"
          fontSize={9}
          textAnchor="middle"
        >
          {xKeys[xi]}
        </text>
      ))}

      {/* Cells: hairline grid + dot density */}
      {yKeys.map((yk, yi) =>
        xKeys.map((xk, xi) => {
          const v = lookup.get(`${xk}|${yk}`) ?? 0
          const nDots = Math.round(v * maxDotsPerCell * 6) // scale up
          const cx0 = padL + xi * cellW
          const cy0 = padT + yi * cellH
          return (
            <g key={`cell-${xi}-${yi}`}>
              <rect
                x={cx0}
                y={cy0}
                width={cellW}
                height={cellH}
                fill="none"
                stroke={HAIRLINE_STROKE}
                strokeWidth={0.5}
              />
              {Array.from({ length: Math.min(nDots, maxDotsPerCell * 4) }, (_, i) => {
                const u = halton(i + 1, 2)
                const vv = halton(i + 1, 3)
                const x = cx0 + 2 + u * (cellW - 4)
                const y = cy0 + 2 + vv * (cellH - 4)
                const color =
                  v >= OECD_CEILING ? RISK_PALETTE.critical :
                  v >= 0.08 ? RISK_PALETTE.high :
                  v >= 0.03 ? '#a16207' : '#52525b'
                const alpha = v >= OECD_CEILING ? 0.82 : v >= 0.08 ? 0.7 : 0.5
                return (
                  <circle key={i} cx={x} cy={y} r={0.85} fill={color} fillOpacity={alpha} />
                )
              })}
            </g>
          )
        }),
      )}

      {/* Peak contour — box peak cells in red */}
      {peakCells.map(({ xi, yi }, i) => (
        <rect
          key={`peak-${i}`}
          x={padL + xi * cellW + 0.5}
          y={padT + yi * cellH + 0.5}
          width={cellW - 1}
          height={cellH - 1}
          fill="none"
          stroke={RISK_PALETTE.critical}
          strokeWidth={1}
          strokeOpacity={0.72}
        />
      ))}
    </svg>
  )
}

export default RiskTopography
