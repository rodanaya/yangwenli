/**
 * EditorialHeatmap — SVG-based matrix heatmap.
 * No ECharts dependency; keeps bundle small. Good for 12×5, 12×12, sector×year
 * scale matrices. For 365×52 calendar heatmaps, use a dedicated calendar primitive.
 */

import { scaleToColor, type HeatmapScale } from './colorScales'

export interface EditorialHeatmapProps {
  rows: string[]
  cols: (string | number)[]
  /** [colIdx, rowIdx, value] — sparse matrix */
  values: Array<[number, number, number]>
  valueDomain?: [number, number]
  scale?: HeatmapScale
  /** Cell formatter for tooltip / optional cell-label rendering */
  valueFormat?: (v: number) => string
  /** Cell annotations — point to a specific cell */
  annotations?: Array<{ col: number; row: number; label: string }>
  /** Show text inside cells (for small matrices) */
  showCellLabels?: boolean
  cellSize?: number
  gap?: number
}

export function EditorialHeatmap({
  rows, cols, values,
  valueDomain, scale = 'risk',
  valueFormat = (v) => v.toFixed(0),
  annotations = [],
  showCellLabels = false,
  cellSize = 36, gap = 2,
}: EditorialHeatmapProps) {
  const nRows = rows.length
  const nCols = cols.length
  const rowLabelWidth = 120
  const colLabelHeight = 28
  const gridW = nCols * cellSize + (nCols - 1) * gap
  const gridH = nRows * cellSize + (nRows - 1) * gap
  const W = rowLabelWidth + gridW + 8
  const H = colLabelHeight + gridH + 8

  const vmin = valueDomain?.[0] ?? Math.min(...values.map((v) => v[2]))
  const vmax = valueDomain?.[1] ?? Math.max(...values.map((v) => v[2]))

  // Build a value lookup for sparse matrix
  const valueMap = new Map<string, number>()
  values.forEach(([c, r, v]) => valueMap.set(`${r}:${c}`, v))

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} role="img" aria-label="Heatmap">
        {/* Column labels */}
        {cols.map((col, cIdx) => (
          <text
            key={cIdx}
            x={rowLabelWidth + cIdx * (cellSize + gap) + cellSize / 2}
            y={colLabelHeight - 8}
            textAnchor="middle"
            className="fill-[color:var(--color-text-muted)]"
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {col}
          </text>
        ))}
        {/* Row labels */}
        {rows.map((row, rIdx) => (
          <text
            key={rIdx}
            x={rowLabelWidth - 8}
            y={colLabelHeight + rIdx * (cellSize + gap) + cellSize / 2 + 4}
            textAnchor="end"
            className="fill-[color:var(--color-text-secondary)]"
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            {row}
          </text>
        ))}
        {/* Cells */}
        {rows.map((_, rIdx) =>
          cols.map((_, cIdx) => {
            const v = valueMap.get(`${rIdx}:${cIdx}`)
            const hasValue = v !== undefined
            const fill = hasValue ? scaleToColor(v!, vmin, vmax, scale) : '#f3f1ec'
            const x = rowLabelWidth + cIdx * (cellSize + gap)
            const y = colLabelHeight + rIdx * (cellSize + gap)
            return (
              <g key={`${rIdx}-${cIdx}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                  rx={1}
                />
                {showCellLabels && hasValue && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 3}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-family-mono)',
                      fill: pickTextColor(fill),
                    }}
                  >
                    {valueFormat(v!)}
                  </text>
                )}
                <title>
                  {`${rows[rIdx]} · ${cols[cIdx]}: ${hasValue ? valueFormat(v!) : '—'}`}
                </title>
              </g>
            )
          }),
        )}
        {/* Annotations — small amber dot + label */}
        {annotations.map((a, aIdx) => {
          const x = rowLabelWidth + a.col * (cellSize + gap) + cellSize / 2
          const y = colLabelHeight + a.row * (cellSize + gap) + cellSize / 2
          return (
            <g key={aIdx}>
              <circle cx={x} cy={y} r={3} fill="var(--color-accent)" />
              <text
                x={x + 8}
                y={y + 3}
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-family-mono)',
                  fill: 'var(--color-accent)',
                  fontWeight: 600,
                }}
              >
                {a.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function pickTextColor(bgHex: string): string {
  // Quick luminance check — if bg is dark, use cream; else dark
  const hex = bgHex.replace('#', '')
  if (hex.length !== 6) return 'var(--color-text-primary)'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1a1714' : '#faf9f6'
}
