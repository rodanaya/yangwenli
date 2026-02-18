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
// Theme handled by CSS variables
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
  onSectorClick,
}: ProcedureBreakdownProps) {
  // Theme handled by CSS variables

  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        name: d.sector_name,
        code: d.sector_code,
        'Direct Award': d.direct_award_pct,
        'Single Bid': d.single_bid_pct,
        'Open Tender': d.open_tender_pct,
      }))
      .sort((a, b) => b['Direct Award'] - a['Direct Award'])
  }, [data])

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" onClick={(data) => {
          if (onSectorClick && data?.activePayload?.[0]?.payload?.code) {
            onSectorClick(data.activePayload[0].payload.code)
          }
        }} style={{ cursor: onSectorClick ? 'pointer' : 'default' }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={'var(--color-border)'}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
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
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{value}</span>
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
