/**
 * EditorialRadarChart — token-locked radar for vendor/admin fingerprints.
 * Supports 1–3 overlaid series with tokenized colors.
 */

import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip,
} from 'recharts'
import { CHART_TOKENS, tokenColor, type ColorToken } from './tokens'

export interface RadarSeries {
  name: string
  /** Object keyed by axis name */
  values: Record<string, number>
  colorToken: ColorToken
}

export interface EditorialRadarChartProps {
  axes: string[]
  series: RadarSeries[]
  valueDomain?: [number, number]
  height?: number
}

export function EditorialRadarChart({
  axes, series, valueDomain = [0, 1],
  height = CHART_TOKENS.dims.default,
}: EditorialRadarChartProps) {
  // Transform into Recharts shape: one row per axis
  const data = axes.map((axis) => {
    const row: Record<string, number | string> = { axis }
    series.forEach((s) => {
      row[s.name] = s.values[axis] ?? 0
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={CHART_TOKENS.grid.stroke} opacity={0.5} />
        <PolarAngleAxis
          dataKey="axis"
          tick={{
            fill: CHART_TOKENS.axis.tickFill,
            fontSize: CHART_TOKENS.axis.tickFontSize,
            fontFamily: 'var(--font-family-sans)',
          }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={valueDomain}
          tick={false}
          axisLine={false}
        />
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
        />
        {series.map((s) => {
          const color = tokenColor(s.colorToken)
          return (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={CHART_TOKENS.line.strokeWidth}
              isAnimationActive={false}
            />
          )
        })}
      </RadarChart>
    </ResponsiveContainer>
  )
}
