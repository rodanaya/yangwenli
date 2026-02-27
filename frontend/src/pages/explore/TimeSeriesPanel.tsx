import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export function TimeSeriesPanel({ yearStart, yearEnd, onYearRangeChange }: TimeSeriesPanelProps) {
  const [brushStart, setBrushStart] = useState<number | null>(null)
  const [brushEnd, setBrushEnd] = useState<number | null>(null)
  const [isBrushing, setIsBrushing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const chartData = useMemo(() => {
    if (!data?.yearly_trends) return []
    return data.yearly_trends
      .filter(d => d.year >= 2002)
      .map(d => ({
        year: d.year,
        contracts: d.contracts || 0,
        avgRisk: ((d.avg_risk || 0) * 100),
        value: d.total_value || d.value_mxn || 0,
      }))
  }, [data])

  if (isLoading) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Contracts Over Time</div>
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  function handleMouseDown(e: any) {
    if (e?.activeLabel) {
      setBrushStart(Number(e.activeLabel))
      setIsBrushing(true)
    }
  }

  function handleMouseMove(e: any) {
    if (isBrushing && e?.activeLabel) {
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

  const selStart = brushStart != null && brushEnd != null ? Math.min(brushStart, brushEnd) : yearStart
  const selEnd = brushStart != null && brushEnd != null ? Math.max(brushStart, brushEnd) : yearEnd
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
        style={{ height: 80, cursor: 'crosshair', userSelect: 'none' }}
        onMouseLeave={() => { if (isBrushing) handleMouseUp() }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            margin={{ top: 2, right: 4, left: 4, bottom: 2 }}
          >
            <defs>
              <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(71 85 105 / 0.15)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: 'rgb(148 163 184)' }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis hide />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'rgb(15 23 42)',
                border: '1px solid rgb(71 85 105 / 0.4)',
                borderRadius: 6,
                fontSize: 11,
                color: 'rgb(226 232 240)',
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Contracts']}
              labelStyle={{ color: 'rgb(148 163 184)', fontSize: 10 }}
            />
            {hasSelection && (
              <ReferenceArea
                x1={selStart}
                x2={selEnd}
                fill="rgb(99 102 241 / 0.2)"
                stroke="rgb(99 102 241 / 0.6)"
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey="contracts"
              stroke="#6366f1"
              strokeWidth={1.5}
              fill="url(#tsGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-text-muted/60 mt-1">Click and drag to filter by year range</p>
    </div>
  )
}
