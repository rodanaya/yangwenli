/**
 * EditorialLineChart — bible-locked wrapper over Recharts LineChart.
 *
 * Enforces:
 *   - Horizontal-only gridlines (bible implicit §4)
 *   - Mono 11px axis labels, muted
 *   - Paper-dark tooltip (.chart-tooltip)
 *   - Line stroke-width 2 (primary) / 1.5 (secondary)
 *   - Token-locked colors — no raw hex allowed
 *
 * Accepts annotations (vrules, hrules, bands) for editorial callouts.
 */

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts'
import {
  CHART_TOKENS, tokenColor, formatValue,
  type ColorToken, type ChartAnnotation, annotationStroke,
} from './tokens'

export interface LineSeries<T extends object> {
  /** Data key to plot */
  key: keyof T & string
  /** Legend/tooltip label */
  label: string
  /** Token-locked color */
  colorToken: ColorToken
  /** Solid or dashed stroke */
  style?: 'solid' | 'dashed'
  /** Visual emphasis — secondary renders at 1.5px, 0.7 opacity */
  emphasis?: 'primary' | 'secondary'
}

export interface EditorialLineChartProps<T extends object> {
  data: T[]
  xKey: keyof T & string
  series: LineSeries<T>[]
  yFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  yDomain?: [number, number]
  annotations?: ChartAnnotation[]
  /** Height in px. Use CHART_TOKENS.dims.* for canonical values. */
  height?: number
  /** Hide X axis (e.g. sparkline-ish variant inside a frame) */
  hideXAxis?: boolean
  /** Hide Y axis labels but keep gridlines */
  hideYAxis?: boolean
  xTickFormatter?: (v: string | number) => string
}

export function EditorialLineChart<T extends object>({
  data, xKey, series, yFormat = 'integer', yDomain,
  annotations = [], height = CHART_TOKENS.dims.default,
  hideXAxis, hideYAxis, xTickFormatter,
}: EditorialLineChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid
          stroke={CHART_TOKENS.grid.stroke}
          strokeDasharray={CHART_TOKENS.grid.strokeDasharray}
          opacity={CHART_TOKENS.grid.opacity}
          vertical={CHART_TOKENS.grid.vertical}
        />
        {!hideXAxis && (
          <XAxis
            dataKey={xKey}
            tick={{
              fill: CHART_TOKENS.axis.tickFill,
              fontSize: CHART_TOKENS.axis.tickFontSize,
              fontFamily: CHART_TOKENS.axis.tickFontFamily,
            }}
            tickLine={CHART_TOKENS.axis.tickLine}
            axisLine={CHART_TOKENS.axis.axisLine}
            tickFormatter={xTickFormatter}
          />
        )}
        {!hideYAxis && (
          <YAxis
            tick={{
              fill: CHART_TOKENS.axis.tickFill,
              fontSize: CHART_TOKENS.axis.tickFontSize,
              fontFamily: CHART_TOKENS.axis.tickFontFamily,
            }}
            tickLine={CHART_TOKENS.axis.tickLine}
            axisLine={CHART_TOKENS.axis.axisLine}
            width={CHART_TOKENS.axis.width}
            domain={yDomain}
            tickFormatter={(v: number) => formatValue(v, yFormat)}
          />
        )}
        <Tooltip
          wrapperClassName="!outline-none"
          contentStyle={{
            background: '#1a1714',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            padding: '8px 10px',
            color: '#faf9f6',
            fontSize: 11,
            fontFamily: 'var(--font-family-mono)',
          }}
          labelStyle={{ color: '#faf9f6', fontWeight: 600, marginBottom: 4 }}
          formatter={(value, name) => [
            typeof value === 'number' ? formatValue(value, yFormat) : String(value ?? ''),
            String(name ?? ''),
          ]}
        />
        {annotations.map((a, idx) => {
          if (a.kind === 'vrule') {
            return (
              <ReferenceLine
                key={idx}
                x={a.x}
                stroke={annotationStroke(a.tone)}
                strokeDasharray="2 2"
                label={{
                  value: a.label,
                  position: 'top',
                  fill: annotationStroke(a.tone),
                  fontSize: 10,
                  fontFamily: 'var(--font-family-mono)',
                }}
              />
            )
          }
          if (a.kind === 'hrule') {
            return (
              <ReferenceLine
                key={idx}
                y={a.y}
                stroke={annotationStroke(a.tone)}
                strokeDasharray="2 2"
                label={{
                  value: a.label,
                  position: 'right',
                  fill: annotationStroke(a.tone),
                  fontSize: 10,
                  fontFamily: 'var(--font-family-mono)',
                }}
              />
            )
          }
          if (a.kind === 'band') {
            return (
              <ReferenceArea
                key={idx}
                x1={a.x1}
                x2={a.x2}
                fill={annotationStroke(a.tone)}
                fillOpacity={0.06}
                stroke="none"
              />
            )
          }
          return null
        })}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={tokenColor(s.colorToken)}
            strokeWidth={
              s.emphasis === 'secondary'
                ? CHART_TOKENS.line.strokeWidthSecondary
                : CHART_TOKENS.line.strokeWidth
            }
            strokeDasharray={s.style === 'dashed' ? '4 3' : undefined}
            dot={CHART_TOKENS.line.dot}
            activeDot={{ r: CHART_TOKENS.line.activeDotR }}
            strokeOpacity={s.emphasis === 'secondary' ? 0.7 : 1}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
