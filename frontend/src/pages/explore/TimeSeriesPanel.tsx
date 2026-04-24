import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisApi } from '@/api/client'
import { Skeleton } from '@/components/ui/skeleton'
// TODO(charts): primitive lacks mouse-event handlers — brushing/drag-to-select on this
// chart requires onMouseDown/Move/Up at the ComposedChart level. Keeping inline.
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceArea,
} from 'recharts'
import { DotStrip } from '@/components/charts/DotStrip'

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
  const { t } = useTranslation('explore')
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
          {t('timeSeries.title')}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || chartData.length === 0) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          {t('timeSeries.title')}
        </div>
        <div className="h-32 w-full flex items-center justify-center text-[11px] text-text-muted/60 border border-border/20 rounded bg-background-elevated/10">
          {t('timeSeries.noData')}
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
          {t('timeSeries.title')}
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
            {t('timeSeries.clear')}
          </button>
        )}
      </div>
      {/* TODO(charts): EditorialComposedChart lacks onMouseDown/Move/Up brushing handlers
          and the year-range selection interaction is core to this widget's UX.
          Tokens migrated to bible-aligned values; structural migration deferred. */}
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.35} vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis yAxisId="left" hide />
            <YAxis yAxisId="right" hide domain={[0, 'dataMax + 5']} />
            <RechartsTooltip
              contentStyle={{
                background: '#1a1714',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                padding: '8px 10px',
                color: '#faf9f6',
                fontSize: 11,
                fontFamily: 'var(--font-family-mono)',
              }}
              formatter={(value, name) => {
                if (name === 'contracts') return [Number(value).toLocaleString(), t('timeSeries.contractsLegend')]
                if (name === 'avgRisk') return [`${Number(value).toFixed(1)}%`, t('timeSeries.avgRiskLegend')]
                return [String(value ?? ''), String(name ?? '')]
              }}
              labelStyle={{ color: '#faf9f6', fontSize: 11, fontWeight: 600 }}
            />
            {hasSelection && (
              <ReferenceArea
                x1={selStart}
                x2={selEnd}
                yAxisId="left"
                fill="var(--color-accent)"
                fillOpacity={0.12}
                stroke="var(--color-accent)"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="avgRisk"
              stroke="var(--color-risk-critical)"
              strokeWidth={1.5}
              dot={false}
              yAxisId="right"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3">
        <DotStrip
          data={chartData.map((d) => ({
            label: String(d.year),
            value: d.contracts,
            color: '#6366f1',
          }))}
          formatVal={(v) => Number(v).toLocaleString()}
        />
      </div>
      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-text-muted/60">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(99,102,241,0.6)' }} />
          <span>{t('timeSeries.contractsLegend')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-400" />
          <span>{t('timeSeries.avgRiskLegend')}</span>
        </div>
        <span className="ml-auto">{t('timeSeries.dragHint')}</span>
      </div>
    </div>
  )
}
