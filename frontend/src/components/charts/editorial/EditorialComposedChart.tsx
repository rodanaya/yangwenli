/**
 * EditorialComposedChart — combined line + area (NO bars per bible §4, §8).
 * Supports dual Y axes for mixed-unit comparisons (e.g. MXN left + % right).
 */

import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts'
import {
  CHART_TOKENS, tokenColor, formatValue,
  type ColorToken, type ChartAnnotation, annotationStroke,
} from './tokens'

export type ComposedLayer<T extends object> =
  | {
      kind: 'line'
      key: keyof T & string
      label: string
      colorToken: ColorToken
      style?: 'solid' | 'dashed'
      emphasis?: 'primary' | 'secondary'
      axis?: 'left' | 'right'
    }
  | {
      kind: 'area'
      key: keyof T & string
      label: string
      colorToken: ColorToken
      axis?: 'left' | 'right'
    }

export interface EditorialComposedChartProps<T extends object> {
  data: T[]
  xKey: keyof T & string
  layers: ComposedLayer<T>[]
  yFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  rightYFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  yDomain?: [number, number]
  rightYDomain?: [number, number]
  annotations?: ChartAnnotation[]
  height?: number
  xTickFormatter?: (v: string | number) => string
}

export function EditorialComposedChart<T extends object>({
  data, xKey, layers,
  yFormat = 'integer', rightYFormat = 'integer',
  yDomain, rightYDomain,
  annotations = [], height = CHART_TOKENS.dims.default,
  xTickFormatter,
}: EditorialComposedChartProps<T>) {
  const hasRightAxis = layers.some((l) => l.axis === 'right')

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: hasRightAxis ? 8 : 12, left: 0, bottom: 4 }}>
        <defs>
          {layers
            .filter((l) => l.kind === 'area')
            .map((l) => {
              const color = tokenColor(l.colorToken)
              return (
                <linearGradient key={`grad-${l.key}`} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={CHART_TOKENS.area.fillOpacityTop} />
                  <stop offset="100%" stopColor={color} stopOpacity={CHART_TOKENS.area.fillOpacityBottom} />
                </linearGradient>
              )
            })}
        </defs>
        <CartesianGrid
          stroke={CHART_TOKENS.grid.stroke}
          strokeDasharray={CHART_TOKENS.grid.strokeDasharray}
          opacity={CHART_TOKENS.grid.opacity}
          vertical={CHART_TOKENS.grid.vertical}
        />
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
        <YAxis
          yAxisId="left"
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
        {hasRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{
              fill: CHART_TOKENS.axis.tickFill,
              fontSize: CHART_TOKENS.axis.tickFontSize,
              fontFamily: CHART_TOKENS.axis.tickFontFamily,
            }}
            tickLine={CHART_TOKENS.axis.tickLine}
            axisLine={CHART_TOKENS.axis.axisLine}
            width={CHART_TOKENS.axis.width}
            domain={rightYDomain}
            tickFormatter={(v: number) => formatValue(v, rightYFormat)}
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
                key={idx} x={a.x} yAxisId="left"
                stroke={annotationStroke(a.tone)} strokeDasharray="2 2"
                label={{
                  value: a.label, position: 'top', fill: annotationStroke(a.tone),
                  fontSize: 10, fontFamily: 'var(--font-family-mono)',
                }}
              />
            )
          }
          if (a.kind === 'band') {
            return (
              <ReferenceArea
                key={idx} x1={a.x1} x2={a.x2} yAxisId="left"
                fill={annotationStroke(a.tone)} fillOpacity={0.06} stroke="none"
              />
            )
          }
          return null
        })}
        {layers.map((layer) => {
          const axis = layer.axis ?? 'left'
          if (layer.kind === 'line') {
            return (
              <Line
                key={layer.key}
                yAxisId={axis}
                type="monotone"
                dataKey={layer.key}
                name={layer.label}
                stroke={tokenColor(layer.colorToken)}
                strokeWidth={
                  layer.emphasis === 'secondary'
                    ? CHART_TOKENS.line.strokeWidthSecondary
                    : CHART_TOKENS.line.strokeWidth
                }
                strokeDasharray={layer.style === 'dashed' ? '4 3' : undefined}
                dot={false}
                activeDot={{ r: CHART_TOKENS.line.activeDotR }}
                strokeOpacity={layer.emphasis === 'secondary' ? 0.7 : 1}
                isAnimationActive={false}
              />
            )
          }
          return (
            <Area
              key={layer.key}
              yAxisId={axis}
              type="monotone"
              dataKey={layer.key}
              name={layer.label}
              stroke={tokenColor(layer.colorToken)}
              strokeWidth={CHART_TOKENS.line.strokeWidth}
              fill={`url(#grad-${layer.key})`}
              isAnimationActive={false}
            />
          )
        })}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
