/**
 * EditorialAreaChart — single-series area with gradient fill.
 * Token-locked styling per bible. Identical axis / grid / tooltip grammar
 * to EditorialLineChart for cross-chart coherence.
 */

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts'
import {
  CHART_TOKENS, tokenColor, formatValue,
  type ColorToken, type ChartAnnotation, annotationStroke,
} from './tokens'

export interface EditorialAreaChartProps<T extends object> {
  data: T[]
  xKey: keyof T & string
  yKey: keyof T & string
  colorToken: ColorToken
  yFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  yDomain?: [number, number]
  annotations?: ChartAnnotation[]
  height?: number
  hideXAxis?: boolean
  hideYAxis?: boolean
  xTickFormatter?: (v: string | number) => string
}

export function EditorialAreaChart<T extends object>({
  data, xKey, yKey, colorToken, yFormat = 'integer', yDomain,
  annotations = [], height = CHART_TOKENS.dims.default,
  hideXAxis, hideYAxis, xTickFormatter,
}: EditorialAreaChartProps<T>) {
  const fillColor = tokenColor(colorToken)
  const gradId = `grad-${colorToken}-${String(yKey)}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={CHART_TOKENS.area.fillOpacityTop} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={CHART_TOKENS.area.fillOpacityBottom} />
          </linearGradient>
        </defs>
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
          formatter={(value) => [
            typeof value === 'number' ? formatValue(value, yFormat) : String(value ?? ''),
            '',
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
                  value: a.label, position: 'top', fill: annotationStroke(a.tone),
                  fontSize: 10, fontFamily: 'var(--font-family-mono)',
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
                  value: a.label, position: 'right', fill: annotationStroke(a.tone),
                  fontSize: 10, fontFamily: 'var(--font-family-mono)',
                }}
              />
            )
          }
          if (a.kind === 'band') {
            return (
              <ReferenceArea
                key={idx} x1={a.x1} x2={a.x2}
                fill={annotationStroke(a.tone)} fillOpacity={0.06} stroke="none"
              />
            )
          }
          return null
        })}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={fillColor}
          strokeWidth={CHART_TOKENS.line.strokeWidth}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
