import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { ComparePeriodResponse } from '@/api/types'
import { cn, formatCompactMXN } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const ADMIN_PRESETS = [
  { label: 'Zedillo',     start: '1994', end: '2000' },
  { label: 'Fox',         start: '2001', end: '2006' },
  { label: 'Calderón',    start: '2006', end: '2012' },
  { label: 'Peña Nieto',  start: '2012', end: '2018' },
  { label: 'AMLO',        start: '2018', end: '2024' },
  { label: 'Sheinbaum',   start: '2024', end: '2030' },
] as const

interface CompareRow {
  metric: string
  p1: string
  p2: string
  delta: number
  deltaFmt: string
  signal: 'worse' | 'better' | 'neutral'
  unit: string
}

function buildCompareRows(data: ComparePeriodResponse): CompareRow[] {
  const riskDelta = (data.period2?.avg_risk_score ?? 0) - (data.period1?.avg_risk_score ?? 0)
  const valueDelta = (data.period2?.total_value ?? 0) - (data.period1?.total_value ?? 0)

  return [
    {
      metric: 'Avg Risk Score',
      p1: ((data.period1?.avg_risk_score ?? 0) * 100).toFixed(3) + '%',
      p2: ((data.period2?.avg_risk_score ?? 0) * 100).toFixed(3) + '%',
      delta: riskDelta,
      deltaFmt: (riskDelta > 0 ? '+' : '') + (riskDelta * 100).toFixed(3) + 'pp',
      signal: Math.abs(riskDelta) < 0.0005 ? 'neutral' : riskDelta > 0 ? 'worse' : 'better',
      unit: 'pp',
    },
    {
      metric: 'Total Spending',
      p1: formatCompactMXN(data.period1?.total_value ?? 0),
      p2: formatCompactMXN(data.period2?.total_value ?? 0),
      delta: valueDelta,
      deltaFmt: (valueDelta >= 0 ? '+' : '−') + formatCompactMXN(Math.abs(valueDelta)),
      signal: 'neutral',
      unit: 'MXN',
    },
  ]
}

function SignalBadge({ signal }: { signal: 'worse' | 'better' | 'neutral' }) {
  const { t } = useTranslation('administrations')
  if (signal === 'worse')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-critical"><TrendingUp className="h-3 w-3" />{t('compareView.signalWorse')}</span>
  if (signal === 'better')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-low"><TrendingDown className="h-3 w-3" />{t('compareView.signalBetter')}</span>
  return <span className="text-xs text-text-muted"><Minus className="h-3 w-3 inline" /> —</span>
}

export function ComparePeriodView() {
  const [p1Start, setP1Start] = useState('2012')
  const [p1End, setP1End] = useState('2018')
  const [p2Start, setP2Start] = useState('2018')
  const [p2End, setP2End] = useState('2024')
  const [enabled, setEnabled] = useState(true)

  const { data, isLoading, isFetching, isError } = useQuery<ComparePeriodResponse>({
    queryKey: ['compare-periods', p1Start, p1End, p2Start, p2End],
    queryFn: () => analysisApi.comparePeriods(p1Start, p1End, p2Start, p2End),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const inputCls =
    'w-20 h-8 px-2 rounded border border-border/40 bg-background-elevated/60 text-sm font-mono focus-visible:outline-none focus-visible:border-accent/50 transition-colors text-text-primary'

  const rows = useMemo(() => (data ? buildCompareRows(data) : []), [data])

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <h3 className="text-sm font-mono flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-accent" />
            Compare Periods
          </h3>
          <p className="text-xs text-text-muted">
            Compare procurement risk and total spending between any two time windows. Click an administration preset to fill Period A.
          </p>
        </div>
        <div className="space-y-5 px-4 py-3 bg-background-card">

          {/* Administration presets */}
          <div>
            <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-[0.15em]">Quick Presets → Period A</div>
            <div className="flex flex-wrap gap-1.5">
              {ADMIN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setP1Start(preset.start)
                    setP1End(preset.end)
                    setEnabled(true)
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                    p1Start === preset.start && p1End === preset.end
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'border-border/40 text-text-muted hover:text-text-primary hover:border-border',
                  )}
                >
                  {preset.label} {preset.start}–{preset.end}
                </button>
              ))}
            </div>
          </div>

          {/* Year selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Period A</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1Start}
                  onChange={(e) => { setP1Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period A start year"
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1End}
                  onChange={(e) => { setP1End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period A end year"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Period B</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2Start}
                  onChange={(e) => { setP2Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period B start year"
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2End}
                  onChange={(e) => { setP2End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period B end year"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setEnabled(true)}
            disabled={isFetching}
            className="px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? 'Loading…' : 'Compare Periods'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card">
          <div className="pt-5 space-y-3 px-4 pb-3 bg-background-card">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="card">
          <div className="pt-5 flex items-center gap-2 text-text-muted text-sm px-4 pb-3 bg-background-card">
            <AlertTriangle className="h-4 w-4 text-risk-high shrink-0" />
            <span>Period comparison data could not be loaded. Please try again.</span>
          </div>
        </div>
      )}

      {/* Results table */}
      {data && !isLoading && (
        <div className="card">
          <div className="px-4 py-3 border-b border-border/60 bg-background-card">
            <h3 className="text-xs font-mono text-text-muted">
              Results: Period A ({data.period1?.period}) vs Period B ({data.period2?.period})
            </h3>
          </div>
          <div className="px-4 py-3 bg-background-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table" aria-label="Period comparison results">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-[0.15em] w-1/4">Metric</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Period A</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Period B</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Δ (B − A)</th>
                    <th className="text-center py-2 pl-4 text-xs font-medium text-text-muted uppercase tracking-[0.15em]">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.metric}
                      className={cn(
                        'border-b border-border/20 transition-colors',
                        row.signal === 'worse' && 'bg-risk-critical/5',
                        row.signal === 'better' && 'bg-risk-low/5',
                      )}
                    >
                      <td className="py-3 pr-4 text-xs font-medium text-text-secondary">{row.metric}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono tabular-nums text-text-primary">{row.p1}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono tabular-nums text-text-primary">{row.p2}</td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right text-xs font-mono tabular-nums font-semibold',
                          row.signal === 'worse' ? 'text-risk-critical' :
                          row.signal === 'better' ? 'text-risk-low' :
                          'text-text-muted',
                        )}
                      >
                        {row.deltaFmt}
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <SignalBadge signal={row.signal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary footnote */}
            <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
              Signal: "Worse" = risk increased between periods. "Better" = risk decreased. Spending change is reported as neutral — higher spending may reflect legitimate growth or procurement expansion.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
