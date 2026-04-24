/**
 * EditorialScatterChart — token-locked scatter plot.
 * Used for risk-vs-value paradox plots, vendor positioning, etc.
 * Supports optional quadrant labels (NYT-style).
 */

import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import {
  CHART_TOKENS, tokenColor, formatValue,
  type ColorToken,
} from './tokens'

export interface EditorialScatterChartProps<T extends object> {
  data: T[]
  xKey: keyof T & string
  yKey: keyof T & string
  /** Optional size encoding */
  sizeKey?: keyof T & string
  /** Row → color token. Defaults to 'accent-data'. */
  colorBy?: (row: T) => ColorToken
  xFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  yFormat?: 'pct' | 'mxn-compact' | 'integer' | 'decimal'
  xLabel?: string
  yLabel?: string
  /** Quadrant labels [top-right, top-left, bottom-left, bottom-right] */
  quadrantLabels?: [string, string, string, string]
  /** Divider lines for quadrants */
  quadrants?: { xMedian: number; yMedian: number }
  height?: number
}

export function EditorialScatterChart<T extends object>({
  data, xKey, yKey, sizeKey, colorBy,
  xFormat = 'integer', yFormat = 'integer',
  xLabel, yLabel, quadrantLabels, quadrants,
  height = CHART_TOKENS.dims.default,
}: EditorialScatterChartProps<T>) {
  const tintedData = data.map((d) => ({
    ...d,
    __fill: tokenColor(colorBy ? colorBy(d) : 'accent-data'),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
        <CartesianGrid
          stroke={CHART_TOKENS.grid.stroke}
          strokeDasharray={CHART_TOKENS.grid.strokeDasharray}
          opacity={CHART_TOKENS.grid.opacity}
        />
        <XAxis
          type="number"
          dataKey={xKey}
          name={xLabel}
          tick={{
            fill: CHART_TOKENS.axis.tickFill,
            fontSize: CHART_TOKENS.axis.tickFontSize,
            fontFamily: CHART_TOKENS.axis.tickFontFamily,
          }}
          tickLine={CHART_TOKENS.axis.tickLine}
          axisLine={CHART_TOKENS.axis.axisLine}
          tickFormatter={(v: number) => formatValue(v, xFormat)}
          label={
            xLabel
              ? {
                  value: xLabel, position: 'insideBottom', offset: -4,
                  fill: CHART_TOKENS.axis.tickFill, fontSize: 10,
                  fontFamily: CHART_TOKENS.axis.tickFontFamily,
                }
              : undefined
          }
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={yLabel}
          tick={{
            fill: CHART_TOKENS.axis.tickFill,
            fontSize: CHART_TOKENS.axis.tickFontSize,
            fontFamily: CHART_TOKENS.axis.tickFontFamily,
          }}
          tickLine={CHART_TOKENS.axis.tickLine}
          axisLine={CHART_TOKENS.axis.axisLine}
          width={CHART_TOKENS.axis.width}
          tickFormatter={(v: number) => formatValue(v, yFormat)}
          label={
            yLabel
              ? {
                  value: yLabel, angle: -90, position: 'insideLeft',
                  fill: CHART_TOKENS.axis.tickFill, fontSize: 10,
                  fontFamily: CHART_TOKENS.axis.tickFontFamily,
                }
              : undefined
          }
        />
        {sizeKey && <ZAxis type="number" dataKey={sizeKey} range={[20, 220]} />}
        <Tooltip
          wrapperClassName="!outline-none"
          cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border-hover)' }}
          contentStyle={{
            background: '#1a1714',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            padding: '8px 10px',
            color: '#faf9f6',
            fontSize: 11,
            fontFamily: 'var(--font-family-mono)',
          }}
          formatter={(value) =>
            typeof value === 'number' ? formatValue(value, yFormat) : String(value ?? '')
          }
        />
        {quadrants && (
          <>
            <ReferenceLine x={quadrants.xMedian} stroke="var(--color-border-hover)" strokeDasharray="3 3" />
            <ReferenceLine y={quadrants.yMedian} stroke="var(--color-border-hover)" strokeDasharray="3 3" />
          </>
        )}
        <Scatter
          data={tintedData as Array<T & { __fill: string }>}
          fill="var(--color-accent-data)"
          isAnimationActive={false}
          shape={(p: { cx?: number; cy?: number; payload?: { __fill?: string } }) => (
            <circle
              cx={p.cx ?? 0}
              cy={p.cy ?? 0}
              r={4}
              fill={p.payload?.__fill ?? 'var(--color-accent-data)'}
              fillOpacity={0.85}
            />
          )}
        />
      </ScatterChart>
      {quadrantLabels && (
        <div className="absolute inset-0 pointer-events-none text-[10px] font-mono text-text-muted">
          <span className="absolute top-2 right-3">{quadrantLabels[0]}</span>
          <span className="absolute top-2 left-10">{quadrantLabels[1]}</span>
          <span className="absolute bottom-8 left-10">{quadrantLabels[2]}</span>
          <span className="absolute bottom-8 right-3">{quadrantLabels[3]}</span>
        </div>
      )}
    </ResponsiveContainer>
  )
}
