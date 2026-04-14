/**
 * ChartAnnotation — Data-journalism-style callout annotation for charts.
 *
 * Renders a small circle at a data point with a thin leader line and a
 * text label in small-caps monospace. Designed to overlay on top of
 * Recharts SVG charts.
 */

interface ChartAnnotationProps {
  /** Horizontal position in pixels from left edge of the SVG */
  x: number
  /** Vertical position in pixels from top edge of the SVG */
  y: number
  /** Callout text displayed at the end of the leader line */
  label: string
  /** Direction the leader line extends from the data point */
  direction: 'left' | 'right' | 'up' | 'down'
  /** Circle and line color (default: '#dc2626') */
  color?: string
  /** Length of the leader line in pixels (default: 40) */
  lineLength?: number
}

export function ChartAnnotation({
  x,
  y,
  label,
  direction,
  color = '#dc2626',
  lineLength = 40,
}: ChartAnnotationProps) {
  const dx = direction === 'right' ? lineLength : direction === 'left' ? -lineLength : 0
  const dy = direction === 'down' ? lineLength : direction === 'up' ? -lineLength : 0

  const textAnchor =
    direction === 'left' ? 'end' :
    direction === 'right' ? 'start' :
    'middle'

  const textDy =
    direction === 'up' ? -6 :
    direction === 'down' ? 14 :
    4

  const textDx =
    direction === 'left' ? -6 :
    direction === 'right' ? 6 :
    0

  return (
    <g className="chart-annotation" pointerEvents="none">
      {/* Leader line */}
      <line
        x1={x}
        y1={y}
        x2={x + dx}
        y2={y + dy}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.7}
      />
      {/* Data point circle */}
      <circle
        cx={x}
        cy={y}
        r={4}
        fill={color}
        fillOpacity={0.9}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={0.5}
      />
      {/* Label text */}
      <text
        x={x + dx + textDx}
        y={y + dy + textDy}
        textAnchor={textAnchor}
        style={{
          fill: color,
          fontSize: 10,
          fontFamily: 'var(--font-family-mono)',
          fontVariant: 'all-small-caps',
          letterSpacing: '0.04em',
          fontWeight: 600,
        }}
      >
        {label}
      </text>
    </g>
  )
}

export default ChartAnnotation
