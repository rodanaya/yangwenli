import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '@/components/charts'

interface YearlyPoint {
  year: number
  avg_risk: number
  direct_award_pct: number
  high_risk_pct: number
  contracts: number
}

interface AdminLine {
  name: string      // "Fox", "Calderon", etc.
  color: string
  points: YearlyPoint[]
  startYear: number
}

interface Props {
  administrations: AdminLine[]
  metric: 'avg_risk' | 'direct_award_pct' | 'high_risk_pct'
  loading?: boolean
}

// Build a unified dataset keyed by termYear (1..6), one entry per term year slot
function buildChartData(
  administrations: AdminLine[],
  metric: Props['metric'],
): Record<string, number | string>[] {
  // Collect all term-year slots that exist across admins (1..6)
  const MAX_TERM_YEARS = 6
  return Array.from({ length: MAX_TERM_YEARS }, (_, idx) => {
    const termYear = idx + 1
    const row: Record<string, number | string> = { termYear: `Yr ${termYear}` }
    for (const admin of administrations) {
      const point = admin.points.find(
        (p) => p.year - admin.startYear + 1 === termYear,
      )
      if (point !== undefined) {
        const raw =
          metric === 'avg_risk'
            ? point.avg_risk * 100
            : metric === 'direct_award_pct'
            ? point.direct_award_pct
            : point.high_risk_pct
        row[admin.name] = Number(raw.toFixed(2))
        // Store actual calendar year for tooltip
        row[`${admin.name}_year`] = point.year
      }
    }
    return row
  })
}

interface CustomTooltipPayloadItem {
  dataKey: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayloadItem[]
  label?: string
  metric: Props['metric']
  chartData: Record<string, number | string>[]
}

function CustomTooltip({
  active,
  payload,
  label,
  metric,
  chartData,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  // Find the row index from label
  const rowIndex = chartData.findIndex((r) => r.termYear === label)
  const row = rowIndex >= 0 ? chartData[rowIndex] : null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((entry) => {
        const adminName = entry.dataKey
        const actualYear = row ? row[`${adminName}_year`] : undefined
        return (
          <p key={adminName} className="font-mono" style={{ color: entry.color }}>
            {adminName}
            {actualYear !== undefined ? ` (${actualYear})` : ''}: {entry.value.toFixed(1)}%
          </p>
        )
      })}
      <p className="text-text-muted mt-1">
        {metric === 'avg_risk'
          ? 'Average risk score'
          : metric === 'direct_award_pct'
          ? 'Direct award rate'
          : 'High-risk contract rate'}
      </p>
    </div>
  )
}

export function AdminRiskTrajectory({ administrations, metric, loading }: Props) {
  const chartData = useMemo(
    () => buildChartData(administrations, metric),
    [administrations, metric],
  )

  if (loading) {
    return <Skeleton className="h-[260px] w-full" />
  }

  if (!administrations?.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-text-muted text-sm font-mono">
        No administration data available
      </div>
    )
  }

  return (
    <div role="img" aria-label="Administration risk trajectory over 6-year terms">
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="termYear"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          content={
            <CustomTooltip
              metric={metric}
              chartData={chartData}
            />
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
        />
        {administrations.map((admin) => (
          <Line
            key={admin.name}
            type="monotone"
            dataKey={admin.name}
            stroke={admin.color}
            strokeWidth={2}
            strokeDasharray={admin.points.length < 3 ? '4 2' : undefined}
            dot={{ r: 3, fill: admin.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  )
}
