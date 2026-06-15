import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { ComparePeriodResponse, ComparePeriodPeriod } from '@/api/types'
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

interface PortraitMetric {
  key: keyof ComparePeriodPeriod
  label: string
  label_es: string
  format: (v: number) => string
  /** positive delta = worse risk */
  higherIsWorse: boolean
}

const PORTRAIT_METRICS: PortraitMetric[] = [
  {
    key: 'avg_risk_score',
    label: 'Avg Risk Score',
    label_es: 'Riesgo Promedio',
    format: (v) => (v * 100).toFixed(3) + '%',
    higherIsWorse: true,
  },
  {
    key: 'direct_award_pct',
    label: 'Direct Award',
    label_es: 'Adj. Directa',
    format: (v) => v.toFixed(1) + '%',
    higherIsWorse: true,
  },
  {
    key: 'single_bid_pct',
    label: 'Single Bid',
    label_es: 'Licitación Única',
    format: (v) => v.toFixed(1) + '%',
    higherIsWorse: true,
  },
  {
    key: 'high_risk_pct',
    label: 'High Risk',
    label_es: 'Alto Riesgo',
    format: (v) => v.toFixed(1) + '%',
    higherIsWorse: true,
  },
  {
    key: 'total_value',
    label: 'Total Spending',
    label_es: 'Gasto Total',
    format: (v) => formatCompactMXN(v),
    higherIsWorse: false,
  },
  {
    key: 'contracts',
    label: 'Contracts',
    label_es: 'Contratos',
    format: (v) => v.toLocaleString('en-MX'),
    higherIsWorse: false,
  },
  {
    key: 'unique_vendors',
    label: 'Unique Vendors',
    label_es: 'Proveedores Únicos',
    format: (v) => v.toLocaleString('en-MX'),
    higherIsWorse: false,
  },
]

function DeltaChip({ delta, higherIsWorse }: { delta: number; higherIsWorse: boolean }) {
  if (Math.abs(delta) < 0.0001) {
    return <span className="text-[10px] font-mono text-text-muted">—</span>
  }
  const worse = higherIsWorse ? delta > 0 : delta < 0
  const sign = delta > 0 ? '+' : ''
  const pct = delta !== 0 ? ` (${sign}${(delta * 100).toFixed(1)}pp)` : ''
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold',
        worse ? 'text-risk-critical' : 'text-risk-low',
      )}
    >
      {worse
        ? <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
        : <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
      }
      {sign}{Math.abs(delta) < 0.01 ? pct : `${sign}${delta.toFixed(1)}%`}
    </span>
  )
}

function getJudgment(period1: ComparePeriodPeriod, period2: ComparePeriodPeriod, isEs: boolean): string {
  const riskDelta = period2.avg_risk_score - period1.avg_risk_score
  const daDelta = period2.direct_award_pct - period1.direct_award_pct
  if (riskDelta > 0.005 && daDelta > 2) {
    return isEs
      ? 'El periodo B muestra deterioro estructural: mayor riesgo y mayor adjudicación directa.'
      : 'Period B shows structural deterioration — higher risk and wider direct-award use.'
  }
  if (riskDelta < -0.005 && daDelta < -2) {
    return isEs
      ? 'El periodo B exhibe mejora relativa: menor riesgo promedio y menor adjudicación directa.'
      : 'Period B shows relative improvement — lower average risk and reduced direct-award rate.'
  }
  if (Math.abs(riskDelta) < 0.002) {
    return isEs
      ? 'Sin diferencia significativa entre periodos. El riesgo sistémico es estructural, no cíclico.'
      : 'No significant difference between periods — systemic risk is structural, not cyclical.'
  }
  return isEs
    ? 'Los patrones entre periodos son mixtos; se requiere análisis por sector para mayor precisión.'
    : 'Mixed patterns across periods — sector-level analysis required for precise attribution.'
}

export function ComparePeriodView() {
  const { i18n } = useTranslation('administrations')
  const isEs = i18n.language?.startsWith('es') ?? false
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

  const judgment = useMemo(() => {
    if (!data?.period1 || !data?.period2) return null
    return getJudgment(data.period1, data.period2, isEs)
  }, [data, isEs])

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <h3 className="text-sm font-mono flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-accent" aria-hidden="true" />
            {isEs ? 'Comparar Periodos' : 'Compare Periods'}
          </h3>
          <p className="text-xs text-text-muted">
            {isEs
              ? 'Compara riesgo de contratación y gasto total entre dos ventanas temporales.'
              : 'Compare procurement risk and total spending between any two time windows.'}
          </p>
        </div>
        <div className="space-y-5 px-4 py-3 bg-background-card">

          {/* Administration presets */}
          <div>
            <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-[0.15em]">
              {isEs ? 'Presets → Periodo A' : 'Quick Presets → Period A'}
            </div>
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
              <div className="text-xs font-medium text-text-muted uppercase tracking-[0.15em]">
                {isEs ? 'Periodo A' : 'Period A'}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1Start}
                  onChange={(e) => { setP1Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label={isEs ? 'Año inicio Periodo A' : 'Period A start year'}
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1End}
                  onChange={(e) => { setP1End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label={isEs ? 'Año fin Periodo A' : 'Period A end year'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-muted uppercase tracking-[0.15em]">
                {isEs ? 'Periodo B' : 'Period B'}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2Start}
                  onChange={(e) => { setP2Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label={isEs ? 'Año inicio Periodo B' : 'Period B start year'}
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2End}
                  onChange={(e) => { setP2End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label={isEs ? 'Año fin Periodo B' : 'Period B end year'}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setEnabled(true)}
            disabled={isFetching}
            className="px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? (isEs ? 'Cargando…' : 'Loading…') : (isEs ? 'Comparar' : 'Compare Periods')}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-6">
          {[0, 1].map((col) => (
            <div key={col} className="card">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="px-4 py-3 bg-background-card space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="card">
          <div className="pt-5 flex items-center gap-2 text-text-muted text-sm px-4 pb-3 bg-background-card">
            <AlertTriangle className="h-4 w-4 text-risk-high shrink-0" aria-hidden="true" />
            <span>{isEs ? 'No se pudo cargar la comparación. Inténtalo de nuevo.' : 'Period comparison data could not be loaded. Please try again.'}</span>
          </div>
        </div>
      )}

      {/* Portrait output — side-by-side cards */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Editorial judgment */}
          {judgment && (
            <div
              className="rounded-sm border-l-2 px-4 py-3 bg-background-elevated/30"
              style={{ borderLeftColor: 'var(--color-accent)' }}
            >
              <p
                className="text-sm text-text-secondary leading-relaxed"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {judgment}
              </p>
            </div>
          )}

          {/* Portrait cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Period A portrait */}
            <div className="card">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-muted mb-0.5">
                  {isEs ? 'PERIODO A' : 'PERIOD A'}
                </div>
                <div
                  className="text-base font-bold text-text-primary"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {data.period1?.period ?? `${p1Start}–${p1End}`}
                </div>
              </div>
              <div className="px-4 py-3 bg-background-card space-y-2">
                {PORTRAIT_METRICS.map((m) => {
                  const key = m.key as keyof ComparePeriodPeriod
                  const raw = (data.period1?.[key] as number) ?? 0
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
                        {isEs ? m.label_es : m.label}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-text-primary font-semibold">
                        {m.format(raw)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Period B portrait */}
            <div className="card">
              <div className="px-4 py-3 border-b border-border/60 bg-background-card">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-muted mb-0.5">
                  {isEs ? 'PERIODO B' : 'PERIOD B'}
                </div>
                <div
                  className="text-base font-bold text-text-primary"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {data.period2?.period ?? `${p2Start}–${p2End}`}
                </div>
              </div>
              <div className="px-4 py-3 bg-background-card space-y-2">
                {PORTRAIT_METRICS.map((m) => {
                  const key = m.key as keyof ComparePeriodPeriod
                  const raw2 = (data.period2?.[key] as number) ?? 0
                  const raw1 = (data.period1?.[key] as number) ?? 0
                  const delta = raw2 - raw1
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
                        {isEs ? m.label_es : m.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono tabular-nums text-text-primary font-semibold">
                          {m.format(raw2)}
                        </span>
                        <DeltaChip delta={delta} higherIsWorse={m.higherIsWorse} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <p className="text-[10px] font-mono text-text-muted/70">
            {isEs
              ? 'COMPRANET 2000–2025 · RUBLI v0.8.5 · Δ = B − A'
              : 'COMPRANET 2000–2025 · RUBLI v0.8.5 · Δ = B − A'}
          </p>
        </div>
      )}
    </div>
  )
}
