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
  /**
   * Decorative: the trend is already stated in text next to it (e.g. a row's
   * accessible name). Drops recharts' keyboard/ARIA layer (no Tab stop, no
   * role=application) and hides the chart from assistive tech. Default false
   * keeps the existing markup for every other caller.
   */
  decorative?: boolean
}

export function EditorialSparkline<T extends object>({
  data, yKey, colorToken, kind = 'line', height = 40, lastValue, decorative = false,
}: EditorialSparklineProps<T>) {
  const color = tokenColor(colorToken)
  // Only pass the prop when decorative so the default render is unchanged.
  const a11y = decorative ? { accessibilityLayer: false } : {}

  const chart = (
    <ResponsiveContainer width="100%" minWidth={0} height={height}>
      {kind === 'area' ? (
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }} {...a11y}>
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
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }} {...a11y}>
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

  if (!lastValue) return decorative ? <div aria-hidden="true">{chart}</div> : chart

  return (
    <div className="flex items-center gap-2 w-full" aria-hidden={decorative || undefined}>
      <div className="flex-1 min-w-0">{chart}</div>
      <span
        className="flex-shrink-0 text-[13px] font-mono tabular-nums"
        style={{ color }}
      >
        {lastValue}
      </span>
    </div>
  )
}
