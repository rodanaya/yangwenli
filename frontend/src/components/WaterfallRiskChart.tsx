import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

interface WaterfallFeature {
  feature: string
  z_score: number
  coefficient: number
  contribution: number
  label_en: string
}

interface WaterfallRiskChartProps {
  features: WaterfallFeature[]
  baseScore?: number
  finalScore?: number
  className?: string
}

interface ChartItem {
  label: string
  contribution: number
  feature: string
  z_score: number
  coefficient: number
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartItem }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border bg-background-card p-2 text-xs shadow-md">
      <p className="font-medium text-text-primary">{d.label}</p>
      <p className="text-text-muted">z-score: {d.z_score.toFixed(2)}</p>
      <p className="text-text-muted">coefficient: {d.coefficient.toFixed(3)}</p>
      <p className="font-medium" style={{ color: d.contribution >= 0 ? '#dc2626' : '#16a34a' }}>
        contribution: {d.contribution >= 0 ? '+' : ''}
        {d.contribution.toFixed(3)}
      </p>
    </div>
  )
}

export function WaterfallRiskChart({
  features,
  className,
}: WaterfallRiskChartProps) {
  const data = useMemo(() => {
    return [...features]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 10)
      .map((f) => ({
        label: f.label_en,
        contribution: f.contribution,
        feature: f.feature,
        z_score: f.z_score,
        coefficient: f.coefficient,
      }))
  }, [features])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-xs text-text-muted', className)}>
        No feature data available
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32 + 40)}>
        <ComposedChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 20, bottom: 4, left: 120 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            width={115}
          />
          <Tooltip content={<WaterfallTooltip />} />
          <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1} />
          <Bar dataKey="contribution" barSize={18} radius={[0, 3, 3, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.contribution >= 0 ? '#dc2626' : '#16a34a'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WaterfallRiskChart
