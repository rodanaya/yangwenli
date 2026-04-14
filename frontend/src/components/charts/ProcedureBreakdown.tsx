/**
 * Procedure Breakdown Chart Component
 * Shows stacked bar chart of procedure types by sector
 *
 * Design: dark editorial (zinc-900 bg), monospace labels, risk-tinted bars.
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

// Dark editorial procedure colors — risk-coded
const PROCEDURE_COLORS = {
  direct_award: '#f87171', // red-400 — most restrictive
  single_bid: '#fb923c',   // orange-400 — concerning
  open_tender: '#4ade80',  // green-400 — most competitive
}

export const ProcedureBreakdown = memo(function ProcedureBreakdown({
  data,
  height = 300,
  onSectorClick,
}: ProcedureBreakdownProps) {
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
    <div role="img" aria-label="Procedure type breakdown by sector: direct award, single bid, and open tender percentages" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" onClick={(data: any) => {
          if (onSectorClick && data?.activePayload?.[0]?.payload?.code) {
            onSectorClick(data.activePayload[0].payload.code)
          }
        }} style={{ cursor: onSectorClick ? 'pointer' : 'default' }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#3f3f46"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: "var(--font-family-mono)" }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: "var(--font-family-mono)" }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
            width={90}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div
                    className="rounded-lg p-3 shadow-2xl text-xs"
                    style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  >
                    <p className="font-medium text-zinc-100 font-mono mb-1">{label}</p>
                    {payload.map((entry) => (
                      <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-zinc-400">{entry.dataKey}</span>
                        <span className="font-mono ml-auto text-zinc-200">
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
              <span style={{ color: '#71717a', fontSize: 11, fontFamily: "var(--font-family-mono)" }}>{value}</span>
            )}
          />
          <Bar
            dataKey="Direct Award"
            stackId="a"
            fill={PROCEDURE_COLORS.direct_award}
            fillOpacity={0.85}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Single Bid"
            stackId="a"
            fill={PROCEDURE_COLORS.single_bid}
            fillOpacity={0.85}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Open Tender"
            stackId="a"
            fill={PROCEDURE_COLORS.open_tender}
            fillOpacity={0.85}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

export default ProcedureBreakdown
