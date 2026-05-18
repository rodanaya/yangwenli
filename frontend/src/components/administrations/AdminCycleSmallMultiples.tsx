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

export function AdminCycleSmallMultiples({ administrations, isEs }: AdminCycleSmallMultiplesProps) {
  const { t } = useTranslation('administrations')

  if (administrations.length === 0) return null

  // Compute shared Y-axis scale across all panels
  const allRiskValues = administrations.flatMap((a) => a.yearData.map((d) => d.risk))
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
    <div className="card mt-6">
      <div className="px-4 py-3 border-b border-border/60 bg-background-card">
        <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
          {isEs ? 'TRAYECTORIA DE RIESGO POR SEXENIO' : 'RISK TRAJECTORY BY TERM YEAR'}
        </div>
        <h3 className="text-sm font-mono text-text-primary">
          {isEs
            ? 'Riesgo por año del sexenio — cinco administraciones'
            : t('trajectoryChart.title', 'Risk by Term Year — Five Administrations')}
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {isEs
            ? 'Año 1 = primer año de gobierno; Año 6 = año previo a la elección. Eje Y compartido.'
            : 'Year 1 = first year in office; Year 6 = pre-election year. Shared Y-axis scale.'}
        </p>
      </div>
      <div className="px-4 py-4 bg-background-card">
        <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-4')}>
          {administrations.map((admin) => {
            const hasData = admin.yearData.length >= 2
            const sorted = [...admin.yearData].sort((a, b) => a.termYear - b.termYear)

            // Detect outlier: Year 5 risk > 1.5× mean
            const mean = hasData
              ? sorted.reduce((s, d) => s + d.risk, 0) / sorted.length
              : 0
            const year5 = sorted.find((d) => d.termYear === 5)
            const isOutlier = year5 && mean > 0 && year5.risk > mean * 1.5

            return (
              <div key={admin.name} className="space-y-1.5">
                {/* Panel header */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: admin.color }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    {admin.displayName}
                  </span>
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

                    {hasData ? (
                      <>
                        {/* Area fill at 15% opacity */}
                        <path
                          d={calcArea(sorted, xScale, yScale, bottomY)}
                          fill={admin.color}
                          fillOpacity={0.15}
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
                        fontSize={9}
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

        {/* Footer note */}
        <p className="mt-3 text-[10px] text-text-muted font-mono leading-relaxed">
          {isEs
            ? 'Riesgo promedio por año relativo de mandato. Eje Y compartido — las alturas son comparables entre paneles.'
            : 'Average risk by relative term year. Shared Y-axis — heights are comparable across panels.'}
        </p>
      </div>
    </div>
  )
}

export default AdminCycleSmallMultiples
