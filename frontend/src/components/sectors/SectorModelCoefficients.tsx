/**
 * SectorModelCoefficients
 *
 * Horizontal diverging bar chart of v0.6.5 logistic regression coefficients
 * for a given sector. Positive coefficients (risk-increasing) extend right in
 * orange; negative coefficients (protective) extend left in sky blue.
 *
 * Endpoint: GET /api/v1/sectors/{sectorId}/model-coefficients
 * Shape (from backend/api/routers/sectors.py):
 *   {
 *     sector_id: number
 *     sector_name: string
 *     uses_global_model?: boolean      // present in API
 *     model_used?: 'sector' | 'global' // older alias used by api client
 *     intercept: number | null
 *     coefficients: Array<{ feature: string; coefficient: number }>
 *   }
 * The array is already sorted by abs(coefficient) DESC server-side.
 */

import { useQuery } from '@tanstack/react-query'
import { sectorApi } from '@/api/client'

interface SectorModelCoefficientsProps {
  sectorId: number
  sectorName: string
  className?: string
}

const FEATURE_LABELS_ES: Record<string, string> = {
  price_volatility: 'Volatilidad de precios',
  vendor_concentration: 'Concentración de proveedor',
  institution_diversity: 'Diversidad institucional',
  price_ratio: 'Ratio de precio',
  network_member_count: 'Red de proveedores',
  same_day_count: 'Contratos simultáneos',
  direct_award: 'Adjudicación directa',
  single_bid: 'Licitación única',
  ad_period_days: 'Días de publicación',
  win_rate: 'Tasa de adjudicación',
  industry_mismatch: 'Desajuste sectorial',
  institution_risk: 'Riesgo institucional',
  year_end: 'Cierre de año',
  co_bid_rate: 'Tasa de co-licitación',
  price_hyp_confidence: 'Hipótesis de precio',
  sector_spread: 'Dispersión sectorial',
}

function humanizeFeature(key: string): string {
  if (FEATURE_LABELS_ES[key]) return FEATURE_LABELS_ES[key]
  return key
    .split('_')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function formatCoef(value: number): string {
  if (value === 0) return '0.00'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

const POSITIVE_COLOR = '#f97316'
const NEGATIVE_COLOR = '#38bdf8'
const ZERO_COLOR = '#3f3f46' // zinc-700

function SectorModelCoefficients({
  sectorId,
  sectorName,
  className,
}: SectorModelCoefficientsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sector-model-coefficients', sectorId],
    queryFn: () => sectorApi.getModelCoefficients(sectorId),
    staleTime: 10 * 60 * 1000,
  })

  const wrapperClass = `bg-[#0a0a0a] border border-zinc-800/60 rounded-sm p-5 ${className ?? ''}`

  if (isLoading) {
    return (
      <section className={wrapperClass} aria-busy="true">
        <Header sectorName={sectorName} />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-40 bg-zinc-800/80 rounded-sm" />
              <div
                className="h-3 bg-zinc-800/60 rounded-sm"
                style={{ width: `${30 + ((i * 17) % 55)}%` }}
              />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className={wrapperClass}>
        <Header sectorName={sectorName} />
        <p className="mt-4 text-[11px] text-zinc-400">
          No fue posible cargar los coeficientes del modelo para este sector.
        </p>
      </section>
    )
  }

  const coefficients = data.coefficients ?? []
  if (coefficients.length === 0) {
    return (
      <section className={wrapperClass}>
        <Header sectorName={sectorName} />
        <p className="mt-4 text-[11px] text-zinc-400">
          No hay coeficientes disponibles para este sector.
        </p>
      </section>
    )
  }

  // Already sorted server-side; sort defensively in case backend contract changes.
  const sorted = [...coefficients].sort(
    (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient),
  )

  const maxAbs = Math.max(...sorted.map((c) => Math.abs(c.coefficient)), 0.01)

  // Layout: each row 26px tall, label gutter 180px, bars drawn on shared axis
  const ROW_H = 26
  const LABEL_W = 180
  const VALUE_W = 56
  const CHART_H = ROW_H * sorted.length + 8
  const AXIS_PAD = 4

  const usesGlobal =
    ('uses_global_model' in data && (data as { uses_global_model?: boolean }).uses_global_model) ||
    ('model_used' in data && (data as { model_used?: string }).model_used === 'global')

  return (
    <section className={wrapperClass} aria-label={`Coeficientes del modelo para ${sectorName}`}>
      <Header sectorName={sectorName} />
      {usesGlobal && (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Fallback al modelo global (n_positive &lt; 500)
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <svg
          role="img"
          aria-label="Coeficientes del modelo logístico por característica"
          width="100%"
          viewBox={`0 0 600 ${CHART_H}`}
          preserveAspectRatio="xMinYMid meet"
          className="block"
        >
          {(() => {
            const chartX = LABEL_W + AXIS_PAD
            const chartW = 600 - chartX - VALUE_W - AXIS_PAD
            const centerX = chartX + chartW / 2
            const halfW = chartW / 2

            return (
              <>
                {/* Axis line */}
                <line
                  x1={centerX}
                  y1={0}
                  x2={centerX}
                  y2={CHART_H}
                  stroke="#27272a"
                  strokeWidth={1}
                />

                {/* Faint tick lines at ±maxAbs */}
                <line
                  x1={chartX}
                  y1={0}
                  x2={chartX}
                  y2={CHART_H}
                  stroke="#18181b"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <line
                  x1={chartX + chartW}
                  y1={0}
                  x2={chartX + chartW}
                  y2={CHART_H}
                  stroke="#18181b"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />

                {sorted.map((c, i) => {
                  const y = i * ROW_H + 4
                  const rowCenter = y + ROW_H / 2 - 2
                  const isZero = c.coefficient === 0
                  const scaled = (Math.abs(c.coefficient) / maxAbs) * halfW
                  const barW = Math.max(isZero ? 0 : 2, scaled)
                  const isPositive = c.coefficient > 0
                  const barX = isPositive ? centerX : centerX - barW
                  const fill = isZero
                    ? ZERO_COLOR
                    : isPositive
                      ? POSITIVE_COLOR
                      : NEGATIVE_COLOR

                  const labelText = humanizeFeature(c.feature)
                  const valueText = isZero ? '0' : formatCoef(c.coefficient)
                  const valueX = isPositive
                    ? barX + barW + 6
                    : barX - 6
                  const valueAnchor = isPositive ? 'start' : 'end'

                  return (
                    <g key={c.feature}>
                      {/* Feature label */}
                      <text
                        x={LABEL_W - 8}
                        y={rowCenter + 3}
                        textAnchor="end"
                        className="fill-zinc-300"
                        style={{
                          fontSize: 11,
                          fontFamily: 'inherit',
                        }}
                      >
                        {labelText}
                      </text>

                      {/* Bar or zero-line */}
                      {isZero ? (
                        <line
                          x1={centerX - 10}
                          y1={rowCenter}
                          x2={centerX + 10}
                          y2={rowCenter}
                          stroke={ZERO_COLOR}
                          strokeWidth={1}
                        />
                      ) : (
                        <rect
                          x={barX}
                          y={y + 4}
                          width={barW}
                          height={ROW_H - 12}
                          fill={fill}
                          opacity={0.92}
                          rx={0.5}
                        />
                      )}

                      {/* Coefficient value */}
                      <text
                        x={valueX}
                        y={rowCenter + 3}
                        textAnchor={valueAnchor}
                        className={isZero ? 'fill-zinc-600' : 'fill-zinc-200'}
                        style={{
                          fontSize: 10,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {valueText}
                      </text>
                    </g>
                  )
                })}
              </>
            )
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-5 text-[10px] uppercase tracking-wider text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3"
            style={{ backgroundColor: POSITIVE_COLOR }}
            aria-hidden="true"
          />
          Aumenta el riesgo
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3"
            style={{ backgroundColor: NEGATIVE_COLOR }}
            aria-hidden="true"
          />
          Protector
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-px w-3"
            style={{ backgroundColor: ZERO_COLOR }}
            aria-hidden="true"
          />
          Regularizado a cero
        </span>
      </div>
    </section>
  )
}

function Header({ sectorName }: { sectorName: string }) {
  return (
    <header>
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-zinc-300 uppercase">
        Factores de riesgo — {sectorName}
      </h3>
      <p className="mt-1 text-[10px] text-zinc-500">
        Coeficientes del modelo logístico v0.6.5
      </p>
    </header>
  )
}

export { SectorModelCoefficients }
export default SectorModelCoefficients
