import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EditorialLineChart,
  type LineSeries,
  type ColorToken,
} from '@/components/charts/editorial'

interface YearlyPoint {
  year: number
  avg_risk: number
  direct_award_pct: number
  high_risk_pct: number
  contracts: number
}

interface AdminLine {
  name: string      // "Fox", "Calderon", etc.
  color: string     // legacy raw hex (kept in props for back-compat; not used internally)
  points: YearlyPoint[]
  startYear: number
}

interface Props {
  administrations: AdminLine[]
  metric: 'avg_risk' | 'direct_award_pct' | 'high_risk_pct'
  loading?: boolean
}

// Editorial-locked palette assigned by admin index (deterministic).
// Bible: "no raw hex in primitives". We resolve hex → token at the boundary.
const ADMIN_COLOR_TOKENS: ColorToken[] = [
  'sector-educacion',      // Fox-ish blue
  'sector-tecnologia',     // purple
  'risk-critical',         // red
  'sector-energia',        // amber
  'sector-ambiente',       // teal
  'sector-otros',          // neutral
]

interface ChartRow {
  termYear: string
  [adminName: string]: number | string | undefined
}

// Build a unified dataset keyed by termYear (1..6), one entry per term year slot
function buildChartData(
  administrations: AdminLine[],
  metric: Props['metric'],
): ChartRow[] {
  const MAX_TERM_YEARS = 6
  return Array.from({ length: MAX_TERM_YEARS }, (_, idx) => {
    const termYear = idx + 1
    const row: ChartRow = { termYear: `Yr ${termYear}` }
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
      }
    }
    return row
  })
}

export function AdminRiskTrajectory({ administrations, metric, loading }: Props) {
  const chartData = useMemo(
    () => buildChartData(administrations, metric),
    [administrations, metric],
  )

  const series: LineSeries<ChartRow>[] = useMemo(
    () =>
      administrations.map((admin, idx) => ({
        key: admin.name,
        label: admin.name,
        colorToken: ADMIN_COLOR_TOKENS[idx % ADMIN_COLOR_TOKENS.length],
        style: admin.points.length < 3 ? 'dashed' : 'solid',
      })),
    [administrations],
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
      <EditorialLineChart<ChartRow>
        data={chartData}
        xKey="termYear"
        series={series}
        yFormat="pct"
        height={260}
      />
    </div>
  )
}
