/**
 * ProcurementCalendar — monthly contract volume estimate with December Dump highlight
 *
 * Uses year-level total_contracts from /contracts/statistics?year={year} and
 * applies a hardcoded seasonal distribution based on known Mexican procurement
 * seasonality patterns.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from '@/components/charts'
import { contractApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/utils'

// ============================================================================
// Seasonal distribution — based on Mexican federal procurement patterns
// Jan–Nov under-spend, December budget flush
// ============================================================================
const MONTHLY_PCTS = [
  0.05, // Jan
  0.05, // Feb
  0.06, // Mar
  0.07, // Apr
  0.07, // May
  0.08, // Jun
  0.07, // Jul
  0.07, // Aug
  0.08, // Sep
  0.09, // Oct
  0.09, // Nov
  0.22, // Dec — year-end rush
]

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const YEAR_OPTIONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

interface Props {
  year?: number
}

export function ProcurementCalendar({ year: initialYear = 2023 }: Props) {
  const [selectedYear, setSelectedYear] = useState(initialYear)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['contracts', 'statistics', selectedYear],
    queryFn: () => contractApi.getStatistics({ year: selectedYear }),
    staleTime: 30 * 60 * 1000,
  })

  const totalContracts = stats?.total_contracts ?? 0

  const monthlyData = MONTH_LABELS.map((name, i) => ({
    name,
    month: i + 1,
    estimated: Math.round(totalContracts * MONTHLY_PCTS[i]),
    pct: MONTHLY_PCTS[i],
    isDecember: i === 11,
  }))

  const monthlyAvg = totalContracts > 0 ? Math.round(totalContracts / 12) : 0

  const decemberEstimate = monthlyData[11].estimated
  const decemberMultiple =
    monthlyAvg > 0 ? (decemberEstimate / monthlyAvg).toFixed(1) : null

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">
            Estimated monthly distribution based on sector seasonality patterns
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-xs font-mono bg-white/5 border border-white/10 rounded px-2 py-1 text-text-secondary focus:outline-none focus:border-accent/60 cursor-pointer"
          aria-label="Select year for procurement calendar"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* December warning label */}
      {decemberMultiple && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
          <span className="text-base leading-none">&#9888;</span>
          <span>
            December {selectedYear}: ~{formatNumber(decemberEstimate)} contracts estimated
            ({decemberMultiple}x monthly avg)
          </span>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded" />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 8, bottom: 4, left: 8 }}
              barCategoryGap="15%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                width={36}
              />
              {/* Dashed average line */}
              {monthlyAvg > 0 && (
                <ReferenceLine
                  y={monthlyAvg}
                  stroke="#64748b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: `avg ${formatNumber(monthlyAvg)}`,
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              )}
              <RechartsTooltip
                cursor={{ fill: 'rgba(148,163,184,0.05)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as (typeof monthlyData)[0]
                  return (
                    <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-text-primary mb-1">
                        {d.name} {selectedYear}
                      </p>
                      <p className="text-text-secondary">
                        ~{formatNumber(d.estimated)} contracts estimated
                      </p>
                      <p className="text-text-muted">
                        {(d.pct * 100).toFixed(0)}% of annual total
                      </p>
                      {d.isDecember && monthlyAvg > 0 && (
                        <p className="text-amber-400 mt-1 font-mono">
                          {(d.estimated / monthlyAvg).toFixed(1)}x monthly average
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="estimated" radius={[3, 3, 0, 0]}>
                {monthlyData.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={
                      entry.isDecember
                        ? '#f59e0b' // amber — December rush
                        : 'rgba(148,163,184,0.35)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-text-muted italic">
        Monthly distribution estimated from sector seasonality patterns. Actual breakdowns
        unavailable — CompraNet does not publish monthly aggregates.
      </p>
    </div>
  )
}
