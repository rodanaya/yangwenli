/**
 * Procedure Breakdown Chart Component
 * Shows stacked bar chart of procedure types by sector
 */

import { memo, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatPercent } from '@/lib/utils'

interface ProcedureBreakdownData {
  sector_name: string
  sector_code: string
  direct_award_pct: number
  single_bid_pct: number
  open_tender_pct: number
}

interface ProcedureBreakdownProps {
  data: ProcedureBreakdownData[]
  height?: number
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSectorClick?: (sectorCode: string) => void
}

const PROCEDURE_COLORS = {
  direct_award: '#f87171', // Rose - most restrictive
  single_bid: '#fb923c', // Orange - concerning
  open_tender: '#4ade80', // Green - most competitive
}

export const ProcedureBreakdown = memo(function ProcedureBreakdown({
  data,
  height = 300,
  onSectorClick: _onSectorClick,
}: ProcedureBreakdownProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        name: d.sector_name,
        code: d.sector_code,
        'Direct Award': d.direct_award_pct * 100,
        'Single Bid': d.single_bid_pct * 100,
        'Open Tender': d.open_tender_pct * 100,
      }))
      .sort((a, b) => b['Direct Award'] - a['Direct Award'])
  }, [data])

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#2e2e2e' : '#e2e8f0'}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: isDark ? '#a3a3a3' : '#64748b', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#2e2e2e' : '#e2e8f0' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: isDark ? '#a3a3a3' : '#64748b', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#2e2e2e' : '#e2e8f0' }}
            tickLine={false}
            width={90}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium mb-1">{label}</p>
                    {payload.map((entry) => (
                      <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.dataKey}</span>
                        <span className="font-mono ml-auto">
                          {formatPercent((entry.value as number) / 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: isDark ? '#a3a3a3' : '#64748b', fontSize: 11 }}>{value}</span>
            )}
          />
          <Bar
            dataKey="Direct Award"
            stackId="a"
            fill={PROCEDURE_COLORS.direct_award}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Single Bid"
            stackId="a"
            fill={PROCEDURE_COLORS.single_bid}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Open Tender"
            stackId="a"
            fill={PROCEDURE_COLORS.open_tender}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

export default ProcedureBreakdown
