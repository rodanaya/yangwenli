import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceArea,
} from 'recharts'

interface TimeSeriesPanelProps {
  yearStart: number | undefined
  yearEnd: number | undefined
  onYearRangeChange: (start: number | undefined, end: number | undefined) => void
}

// Recharts fires mouse events with a CategoricalChartState-like payload.
// We only care about `activeLabel`, which is the x-axis value under the cursor.
interface ChartMouseEvent {
  activeLabel?: string | number
}

export function TimeSeriesPanel({ yearStart, yearEnd, onYearRangeChange }: TimeSeriesPanelProps) {
  const [brushStart, setBrushStart] = useState<number | null>(null)
  const [brushEnd, setBrushEnd] = useState<number | null>(null)
  const [isBrushing, setIsBrushing] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const chartData = useMemo(() => {
    if (!data?.yearly_trends) return []
    return data.yearly_trends
      .filter((d) => d.year >= 2002)
      .map((d) => ({
        year: d.year,
        contracts: d.contracts || 0,
        avgRisk: (d.avg_risk || 0) * 100,
        value: d.total_value || d.value_mxn || 0,
      }))
  }, [data])

  if (isLoading) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Contracts Over Time
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || chartData.length === 0) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Contracts Over Time
        </div>
        <div className="h-32 w-full flex items-center justify-center text-[11px] text-text-muted/60 border border-border/20 rounded bg-background-elevated/10">
          No trend data available
        </div>
      </div>
    )
  }

  function handleMouseDown(e: ChartMouseEvent) {
    if (e?.activeLabel != null) {
      setBrushStart(Number(e.activeLabel))
      setIsBrushing(true)
    }
  }

  function handleMouseMove(e: ChartMouseEvent) {
    if (isBrushing && e?.activeLabel != null) {
      setBrushEnd(Number(e.activeLabel))
    }
  }

  function handleMouseUp() {
    if (brushStart != null && brushEnd != null) {
      const lo = Math.min(brushStart, brushEnd)
      const hi = Math.max(brushStart, brushEnd)
      if (lo !== hi) {
        onYearRangeChange(lo, hi)
      }
    }
    setBrushStart(null)
    setBrushEnd(null)
    setIsBrushing(false)
  }

  const selStart =
    brushStart != null && brushEnd != null ? Math.min(brushStart, brushEnd) : yearStart
  const selEnd =
    brushStart != null && brushEnd != null ? Math.max(brushStart, brushEnd) : yearEnd
  const hasSelection = selStart != null && selEnd != null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Contracts Over Time
          {hasSelection && (
            <span className="ml-2 text-accent normal-case">
              {selStart}–{selEnd}
            </span>
          )}
        </span>
        {(yearStart || yearEnd) && (
          <button
            onClick={() => onYearRangeChange(undefined, undefined)}
            className="text-[10px] text-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div
        style={{ height: 120, cursor: 'crosshair', userSelect: 'none' }}
        onMouseLeave={() => {
          if (isBrushing) handleMouseUp()
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            margin={{ top: 4, right: 4, left: 4, bottom: 2 }}
          >
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(71 85 105 / 0.12)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: 'rgb(148 163 184)' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis yAxisId="left" hide />
            <YAxis yAxisId="right" hide domain={[0, 'dataMax + 5']} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'rgb(15 23 42)',
                border: '1px solid rgb(71 85 105 / 0.4)',
                borderRadius: 6,
                fontSize: 11,
                color: 'rgb(226 232 240)',
              }}
              formatter={(value: any, name: string | undefined) => {
                if (name === 'contracts') return [Number(value).toLocaleString(), 'Contracts']
                if (name === 'avgRisk') return [`${Number(value).toFixed(1)}%`, 'Avg risk']
                return [value, name ?? '']
              }}
              labelStyle={{ color: 'rgb(148 163 184)', fontSize: 10 }}
            />
            {hasSelection && (
              <ReferenceArea
                x1={selStart}
                x2={selEnd}
                yAxisId="left"
                fill="rgb(99 102 241 / 0.18)"
                stroke="rgb(99 102 241 / 0.5)"
                strokeWidth={1}
              />
            )}
            <Bar
              dataKey="contracts"
              fill="url(#barGrad)"
              yAxisId="left"
              isAnimationActive={false}
              radius={[1, 1, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="avgRisk"
              stroke="#f87171"
              strokeWidth={1.5}
              dot={false}
              yAxisId="right"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-text-muted/60">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(99,102,241,0.6)' }} />
          <span>Contracts</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-400" />
          <span>Avg risk %</span>
        </div>
        <span className="ml-auto">Drag to filter year range</span>
      </div>
    </div>
  )
}
