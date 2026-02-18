/**
 * Stacked Area Chart Component
 * For showing risk distribution trends over time
 */

import { memo, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
// Theme handled by CSS variables
import { RISK_COLORS } from '@/lib/constants'
import { formatNumber, formatPercent } from '@/lib/utils'

interface StackedAreaData {
  year: number
  low: number
  medium: number
  high: number
  critical: number
}

interface StackedAreaProps {
  data: StackedAreaData[]
  height?: number
  showLegend?: boolean
  showPercentage?: boolean
  onYearClick?: (year: number) => void
}

export const StackedAreaChart = memo(function StackedAreaChart({
  data,
  height = 250,
  showLegend = true,
  showPercentage = false,
  onYearClick,
}: StackedAreaProps) {

  const chartData = useMemo(() => {
    if (!showPercentage) return data

    // Convert to percentages
    return data.map((d) => {
      const total = d.low + d.medium + d.high + d.critical
      if (total === 0) return { ...d, low: 0, medium: 0, high: 0, critical: 0 }
      return {
        year: d.year,
        low: (d.low / total) * 100,
        medium: (d.medium / total) * 100,
        high: (d.high / total) * 100,
        critical: (d.critical / total) * 100,
      }
    })
  }, [data, showPercentage])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (onYearClick && data?.activePayload && data.activePayload.length > 0) {
      onYearClick(data.activePayload[0].payload.year)
    }
  }

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} onClick={handleClick} style={{ cursor: onYearClick ? 'pointer' : 'default' }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={'var(--color-border)'}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v) => (showPercentage ? `${v}%` : formatNumber(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium mb-1">{label}</p>
                    {[...payload].reverse().map((entry) => (
                      <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="capitalize">{entry.dataKey}</span>
                        <span className="font-mono ml-auto">
                          {showPercentage
                            ? formatPercent((entry.value as number) / 100)
                            : formatNumber(entry.value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </span>
              )}
            />
          )}
          <Area
            type="monotone"
            dataKey="low"
            stackId="1"
            stroke={RISK_COLORS.low}
            fill={RISK_COLORS.low}
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="medium"
            stackId="1"
            stroke={RISK_COLORS.medium}
            fill={RISK_COLORS.medium}
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="high"
            stackId="1"
            stroke={RISK_COLORS.high}
            fill={RISK_COLORS.high}
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="critical"
            stackId="1"
            stroke={RISK_COLORS.critical}
            fill={RISK_COLORS.critical}
            fillOpacity={0.8}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

export default StackedAreaChart
