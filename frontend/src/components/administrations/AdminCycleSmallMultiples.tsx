/**
 * AdminCycleSmallMultiples — 5-panel small multiples showing each
 * administration's risk trajectory across Year 1–6 of their term.
 *
 * Replaces AdminRiskTrajectory spaghetti chart (M7 redesign).
 * Each panel: 220×100 SVG, single colored path + 15% opacity area fill.
 * All panels share a common Y-axis scale so comparisons are valid.
 */

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface AdminYearDatum {
  termYear: number  // 1–6
  risk: number      // percent (0–100)
}

interface AdminCycleEntry {
  name: string
  displayName: string
  color: string
  yearData: AdminYearDatum[]
}

interface AdminCycleSmallMultiplesProps {
  administrations: AdminCycleEntry[]
  isEs: boolean
  /** National-average risk (percent) — drawn as a dashed reference rule on each panel. */
  referencePct?: number
  /** Name of the page-selected administration — its panel gets an identity ring (M7c). */
  selectedName?: string
  /**
   * Single-administration focus mode. When set, ONLY this administration's
   * panel renders, full-width and enlarged — the dossier is about one term, so
   * the systemic five-panel comparison collapses to the selected file.
   */
  focusName?: string
  /** Drop the outer card chrome when embedded inside the PATRÓN folder (M7c). */
  bare?: boolean
}

const PANEL_W = 220
const PANEL_H = 100
const MARGIN = { top: 12, right: 8, bottom: 20, left: 30 }

function calcPath(data: AdminYearDatum[], xScale: (v: number) => number, yScale: (v: number) => number): string {
  if (data.length === 0) return ''
  return data
    .sort((a, b) => a.termYear - b.termYear)
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.termYear).toFixed(1)},${yScale(d.risk).toFixed(1)}`)
    .join(' ')
}

function calcArea(data: AdminYearDatum[], xScale: (v: number) => number, yScale: (v: number) => number, bottomY: number): string {
  if (data.length === 0) return ''
  const sorted = [...data].sort((a, b) => a.termYear - b.termYear)
  const line = sorted
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.termYear).toFixed(1)},${yScale(d.risk).toFixed(1)}`)
    .join(' ')
  const last = sorted[sorted.length - 1]
  const first = sorted[0]
  return `${line} L${xScale(last.termYear).toFixed(1)},${bottomY.toFixed(1)} L${xScale(first.termYear).toFixed(1)},${bottomY.toFixed(1)} Z`
}

export function AdminCycleSmallMultiples({ administrations, isEs, referencePct, selectedName, focusName, bare }: AdminCycleSmallMultiplesProps) {
  const { t } = useTranslation('administrations')

  if (administrations.length === 0) return null

  // Single-administration focus: collapse the five-panel grid to one enlarged panel.
  const isFocus = focusName != null
  const panels = isFocus
    ? administrations.filter((a) => a.name === focusName)
    : administrations
  if (panels.length === 0) return null
  const focusDisplay = isFocus ? (panels[0]?.displayName ?? focusName) : ''

  // Compute shared Y-axis scale across all panels
  const allRiskValues = panels.flatMap((a) => a.yearData.map((d) => d.risk))
  const maxRisk = allRiskValues.length > 0 ? Math.max(...allRiskValues) : 50
  const minRisk = allRiskValues.length > 0 ? Math.min(...allRiskValues) : 0
  const yPad = (maxRisk - minRisk) * 0.15
  const yMin = Math.max(0, minRisk - yPad)
  const yMax = maxRisk + yPad

  const innerW = PANEL_W - MARGIN.left - MARGIN.right
  const innerH = PANEL_H - MARGIN.top - MARGIN.bottom

  const xScale = (termYear: number) =>
    MARGIN.left + ((termYear - 1) / 5) * innerW

  const yScale = (risk: number) =>
    MARGIN.top + innerH - ((risk - yMin) / (yMax - yMin)) * innerH

  const bottomY = MARGIN.top + innerH

  // Y-axis tick values
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v))

  return (
    <div className={bare ? '' : 'card mt-6'}>
      <div className={cn('py-3', bare ? '' : 'px-4 border-b border-border/60 bg-background-card')}>
        <div className="text-[13px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
          {isEs ? 'TRAYECTORIA DE RIESGO POR AÑO DE MANDATO' : 'RISK TRAJECTORY BY TERM YEAR'}
        </div>
        <h3 className="text-sm font-mono text-text-primary">
          {isFocus
            ? (isEs ? `Riesgo por año del sexenio — ${focusDisplay}` : `Risk by term year — ${focusDisplay}`)
            : (isEs
              ? 'Riesgo por año del sexenio — cinco administraciones'
              : t('trajectoryChart.title', 'Risk by Term Year — Five Administrations'))}
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {isEs
            ? 'Año 1 = primer año de gobierno; Año 6 = año previo a la elección.'
            : 'Year 1 = first year in office; Year 6 = pre-election year.'}
        </p>
      </div>
      <div className={cn('py-4', bare ? '' : 'px-4 bg-background-card')}>
        <div className={cn(isFocus ? 'w-full' : 'grid grid-cols-2 md:grid-cols-3 gap-4')}>
          {panels.map((admin, panelIdx) => {
            const hasData = admin.yearData.length >= 2
            const sorted = [...admin.yearData].sort((a, b) => a.termYear - b.termYear)

            // Detect outlier: Year 5 risk > 1.5× mean
            const mean = hasData
              ? sorted.reduce((s, d) => s + d.risk, 0) / sorted.length
              : 0
            const year5 = sorted.find((d) => d.termYear === 5)
            const isOutlier = year5 && mean > 0 && year5.risk > mean * 1.5

            const first = sorted[0]
            const last = sorted[sorted.length - 1]
            const delta = hasData ? last.risk - first.risk : 0
            const hasYear6 = sorted.some((d) => d.termYear === 6)
            // Lame-duck band: from the year-6 column midpoint minus half a step to the panel right edge.
            const stepW = innerW / 5
            const bandX = xScale(6) - stepW / 2
            const refClamped = referencePct != null && referencePct >= yMin && referencePct <= yMax

            const isSelectedPanel = !isFocus && selectedName != null && admin.name === selectedName
            return (
              <div
                key={admin.name}
                className={cn('space-y-1.5', isSelectedPanel && 'rounded-sm p-1.5 -m-1.5')}
                style={isSelectedPanel ? { boxShadow: `inset 0 0 0 1.5px ${admin.color}66` } : undefined}
              >
                {/* Panel header */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: admin.color }}
                  />
                  <span className="font-mono text-[12px] uppercase tracking-wider text-text-muted">
                    {admin.displayName}
                  </span>
                  {hasData && (
                    <span
                      className="font-mono text-[13px] tabular-nums ml-auto flex-shrink-0"
                      style={{ color: delta >= 0 ? 'var(--color-risk-high)' : 'var(--color-text-muted)' }}
                    >
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pp
                    </span>
                  )}
                </div>

                {/* SVG panel */}
                <div
                  className="rounded-sm border border-border/40 bg-background-elevated/20 overflow-hidden"
                  style={{ width: '100%' }}
                >
                  <svg
                    viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
                    width="100%"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={`${admin.displayName} risk trajectory by term year`}
                  >
                    {/* Year-6 lame-duck band (completed terms only) */}
                    {hasYear6 && (
                      <rect
                        x={bandX}
                        y={MARGIN.top}
                        width={(PANEL_W - MARGIN.right) - bandX}
                        height={innerH}
                        fill="rgba(0,0,0,0.04)"
                      />
                    )}

                    {/* Y-axis ticks */}
                    {yTicks.map((tick) => (
                      <g key={tick}>
                        <line
                          x1={MARGIN.left}
                          y1={yScale(tick)}
                          x2={PANEL_W - MARGIN.right}
                          y2={yScale(tick)}
                          stroke="var(--color-border)"
                          strokeWidth={0.5}
                          strokeDasharray="2 3"
                        />
                        <text
                          x={MARGIN.left - 3}
                          y={yScale(tick)}
                          fill="var(--color-text-muted)"
                          fontSize={8}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fontFamily="monospace"
                        >
                          {tick.toFixed(0)}%
                        </text>
                      </g>
                    ))}

                    {/* X-axis: term year labels 1–6 */}
                    {[1, 2, 3, 4, 5, 6].map((yr) => (
                      <text
                        key={yr}
                        x={xScale(yr)}
                        y={PANEL_H - 4}
                        fill="var(--color-text-muted)"
                        fontSize={8}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {yr}
                      </text>
                    ))}

                    {/* National-average reference rule (labeled only on the first panel) */}
                    {refClamped && referencePct != null && (
                      <g>
                        <line
                          x1={MARGIN.left}
                          y1={yScale(referencePct)}
                          x2={PANEL_W - MARGIN.right}
                          y2={yScale(referencePct)}
                          stroke="var(--color-text-muted)"
                          strokeDasharray="3 3"
                          strokeWidth={0.75}
                          opacity={0.6}
                        />
                        {panelIdx === 0 && (
                          <text
                            x={MARGIN.left + 2}
                            y={yScale(referencePct) - 2}
                            fill="var(--color-text-muted)"
                            fontSize={7.5}
                            fontFamily="monospace"
                          >
                            {`${isEs ? 'Prom. nacional' : 'Natl. avg'} ${referencePct.toFixed(1)}%`}
                          </text>
                        )}
                      </g>
                    )}

                    {hasData ? (
                      <>
                        {/* Area fill — uniform ochre wash (no identity-green lawns) */}
                        <path
                          d={calcArea(sorted, xScale, yScale, bottomY)}
                          fill="rgba(160,104,32,0.07)"
                        />

                        {/* Line path */}
                        <path
                          d={calcPath(sorted, xScale, yScale)}
                          fill="none"
                          stroke={admin.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />

                        {/* Data point dots */}
                        {sorted.map((d) => (
                          <circle
                            key={d.termYear}
                            cx={xScale(d.termYear)}
                            cy={yScale(d.risk)}
                            r={2.5}
                            fill={admin.color}
                            fillOpacity={0.9}
                          />
                        ))}

                        {/* End-of-term value label at the final data point (clamped inside viewBox) */}
                        {(() => {
                          const lx = xScale(last.termYear)
                          const ly = yScale(last.risk)
                          const placeLeft = lx > PANEL_W - MARGIN.right - 24
                          return (
                            <text
                              x={placeLeft ? lx - 5 : lx + 5}
                              y={Math.max(MARGIN.top + 6, Math.min(ly + 3, PANEL_H - MARGIN.bottom))}
                              fill={admin.color}
                              fontSize={8}
                              fontFamily="monospace"
                              className="tabular-nums"
                              textAnchor={placeLeft ? 'end' : 'start'}
                            >
                              {last.risk.toFixed(1)}%
                            </text>
                          )
                        })()}

                        {/* Outlier annotation for Year 5 */}
                        {isOutlier && year5 && (
                          <g>
                            <circle
                              cx={xScale(year5.termYear)}
                              cy={yScale(year5.risk)}
                              r={5}
                              fill="none"
                              stroke={admin.color}
                              strokeWidth={1.5}
                              strokeDasharray="2 2"
                            />
                            <text
                              x={xScale(year5.termYear) + 7}
                              y={yScale(year5.risk) - 3}
                              fill={admin.color}
                              fontSize={8}
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {year5.risk.toFixed(1)}%
                            </text>
                          </g>
                        )}
                      </>
                    ) : (
                      <text
                        x={PANEL_W / 2}
                        y={PANEL_H / 2}
                        fill="var(--color-text-muted)"
                        fontSize={13}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="monospace"
                      >
                        {isEs ? 'Sin datos' : 'No data'}
                      </text>
                    )}
                  </svg>
                </div>
              </div>
            )
          })}
        </div>

        {/* Year-6 band caption */}
        <p className="mt-2 text-[13px] text-text-muted font-mono">
          {isEs ? 'Año 6 = año electoral / salida' : 'Year 6 = election / exit year'}
        </p>

        {/* Footer note */}
        <p className="mt-1 text-[12px] text-text-muted font-mono leading-relaxed">
          {isFocus
            ? (isEs
              ? 'Riesgo promedio por año relativo de mandato. La línea discontinua marca el promedio nacional.'
              : 'Average risk by relative term year. The dashed line marks the national average.')
            : (isEs
              ? 'Riesgo promedio por año relativo de mandato. Eje Y compartido — las alturas son comparables entre paneles.'
              : 'Average risk by relative term year. Shared Y-axis — heights are comparable across panels.')}
        </p>
      </div>
    </div>
  )
}

export default AdminCycleSmallMultiples
