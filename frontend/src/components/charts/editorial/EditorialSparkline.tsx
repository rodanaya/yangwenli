/**
 * EditorialSparkline — tiny inline chart, no axes, no grid, no frame.
 * For inline cell-level trends (vendor rows, sector rows, headlines).
 */

import { ResponsiveContainer, LineChart, Line, AreaChart, Area, YAxis } from 'recharts'
import { CHART_TOKENS, tokenColor, type ColorToken } from './tokens'

export interface EditorialSparklineProps<T extends object> {
  data: T[]
  yKey: keyof T & string
  colorToken: ColorToken
  kind?: 'line' | 'area'
  height?: 24 | 32 | 40 | 48
  /** Optional right-aligned mono value next to the line */
  lastValue?: string
}

export function EditorialSparkline<T extends object>({
  data, yKey, colorToken, kind = 'line', height = 40, lastValue,
}: EditorialSparklineProps<T>) {
  const color = tokenColor(colorToken)

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      {kind === 'area' ? (
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={CHART_TOKENS.line.strokeWidthSecondary}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={CHART_TOKENS.line.strokeWidthSecondary}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )

  if (!lastValue) return chart

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 min-w-0">{chart}</div>
      <span
        className="flex-shrink-0 text-[11px] font-mono tabular-nums"
        style={{ color }}
      >
        {lastValue}
      </span>
    </div>
  )
}
