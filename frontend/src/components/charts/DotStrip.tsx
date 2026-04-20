/**
 * DotStrip — editorial dot-matrix bar substitute.
 *
 * Renders ranked/categorized data as horizontal rows of dots (filled
 * proportional to value). Pure SVG, dark-mode first. Replaces Recharts
 * <Bar> elements to avoid heavy render paths and give a distinct
 * investigative visual vocabulary.
 */

import { motion } from 'framer-motion'

export interface DotStripItem {
  label: string
  value: number
  color?: string
  /** Optional formatted value shown at the end of the row. */
  valueLabel?: string
}

interface DotStripProps {
  data: DotStripItem[]
  /** Number of dot cells per row. Default 50. */
  dots?: number
  /** Dot radius. Default 3. */
  dotR?: number
  /** Spacing between dot centers. Default 8. */
  dotGap?: number
  /** Width reserved for the left-side label. Default 120. */
  labelW?: number
  /** Row height. Default 22. */
  rowH?: number
  /** Formatter for the right-side value. Falls back to toLocaleString(). */
  formatVal?: (v: number) => string
  className?: string
}

export function DotStrip({
  data,
  dots = 50,
  dotR = 3,
  dotGap = 8,
  labelW = 120,
  rowH = 22,
  formatVal,
  className,
}: DotStripProps) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const width = labelW + dots * dotGap + 60
  const height = data.length * rowH + 20

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className ?? 'w-full h-auto'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Dot-matrix chart"
    >
      {data.map((item, rowIdx) => {
        const filled = Math.round((item.value / maxVal) * dots)
        const yC = rowIdx * rowH + rowH / 2
        const fill = item.color ?? '#a78bfa'
        const vLabel = item.valueLabel ?? (formatVal ? formatVal(item.value) : item.value.toLocaleString())
        return (
          <g key={rowIdx}>
            <text
              x={labelW - 6}
              y={yC + 4}
              textAnchor="end"
              fill="#71717a"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              {item.label}
            </text>
            {Array.from({ length: dots }).map((_, i) => (
              <motion.circle
                key={i}
                cx={labelW + i * dotGap + dotR}
                cy={yC}
                r={dotR}
                fill={i < filled ? fill : '#f3f1ec'}
                stroke={i < filled ? 'none' : '#e2ddd6'}
                strokeWidth={0.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
              />
            ))}
            <text
              x={labelW + dots * dotGap + 6}
              y={yC + 4}
              fill={fill}
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={600}
            >
              {vLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default DotStrip
