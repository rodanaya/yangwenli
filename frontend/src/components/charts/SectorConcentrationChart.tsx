/**
 * SectorConcentrationChart
 *
 * Horizontal bar chart showing what percentage of contracts in each sector
 * goes to the top-3 vendors — a key market concentration indicator.
 *
 * Design: pure CSS/divs, no recharts dependency.
 * Data: /analysis/vendor-concentration?top_n=3
 */

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
import { cn } from '@/lib/utils'

function useSectorName() {
  const { t } = useTranslation('sectors')
  return (code: string) => t(code) || getSectorNameEN(code)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConcentrationRow {
  sector_id: number
  sector_name: string
  color: string
  metric_value: number
  rank: number
}

export interface SectorConcentrationChartProps {
  className?: string
  showTitle?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getConcentrationColor(pct: number): string {
  if (pct >= 75) return '#dc2626'
  if (pct >= 50) return '#ea580c'
  if (pct >= 30) return '#eab308'
  return '#16a34a'
}

/** Map a sector_name (Spanish, from API) to our SECTOR_COLORS key */
function getSectorColor(sectorName: string): string {
  const normalised = sectorName.toLowerCase().trim()
  // Direct match first
  if (SECTOR_COLORS[normalised]) return SECTOR_COLORS[normalised]
  // Partial / accent-stripped match
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (normalised.includes(key) || key.includes(normalised)) return color
  }
  return SECTOR_COLORS['otros']
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BarSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-[140px] flex-shrink-0 h-3 rounded bg-background-elevated animate-pulse" />
          <div
            className="h-5 rounded bg-background-elevated animate-pulse"
            style={{ width: `${30 + ((i * 47) % 55)}%` }}
          />
          <div className="ml-auto w-8 h-3 rounded bg-background-elevated animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SectorConcentrationChart({
  className,
  showTitle = true,
}: SectorConcentrationChartProps) {
  const { t } = useTranslation('common')
  const getSectorName = useSectorName()

  function getConcentrationLevel(pct: number): { color: string; label: string } {
    return {
      color: getConcentrationColor(pct),
      label: pct >= 75
        ? t('charts.sectorConcentration.levelHigh')
        : pct >= 50
        ? t('charts.sectorConcentration.levelModerate')
        : pct >= 30
        ? t('charts.sectorConcentration.levelLow')
        : t('charts.sectorConcentration.levelCompetitive'),
    }
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analysis', 'vendor-concentration', 3],
    queryFn: () => analysisApi.getVendorConcentration(3),
    staleTime: 30 * 60 * 1000,
  })

  const rows: ConcentrationRow[] = data?.data ?? []

  // Sort by concentration descending for visual impact
  const sorted = [...rows].sort((a, b) => b.metric_value - a.metric_value)

  return (
    <section
      className={cn('rounded-sm border border-border bg-background-card/60 p-5', className)}
      aria-labelledby="sector-concentration-title"
    >
      {showTitle && (
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted leading-none mb-1">
            {t('charts.sectorConcentration.footnote')}
          </p>
          <h2
            id="sector-concentration-title"
            className="text-base font-bold text-text-primary leading-tight"
          >
            {t('charts.sectorConcentration.title')}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {t('charts.sectorConcentration.subtitle')}
          </p>
        </div>
      )}

      {isLoading && <BarSkeleton label={t('charts.sectorConcentration.skeletonAriaLabel')} />}

      {isError && !isLoading && (
        <p
          role="alert"
          className="text-sm text-text-muted py-6 text-center"
        >
          {t('charts.sectorConcentration.noData')}
        </p>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <p className="text-sm text-text-muted py-6 text-center">{t('charts.sectorConcentration.noData')}</p>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <ul className="space-y-2.5" role="list" aria-label={t('charts.sectorConcentration.ariaList')}>
          {sorted.map((row) => {
            const { color: barColor, label } = getConcentrationLevel(row.metric_value)
            const accentColor = getSectorColor(row.sector_name)
            const pct = Math.min(100, Math.max(0, row.metric_value))

            return (
              <li
                key={row.sector_id}
                className="flex items-center gap-3"
                aria-label={`${getSectorName(row.sector_name)}: ${pct.toFixed(1)}% — ${label}`}
              >
                {/* Sector name with left border accent */}
                <div
                  className="w-[140px] flex-shrink-0 pl-2 border-l-2 text-xs font-medium text-text-secondary truncate"
                  style={{ borderColor: accentColor }}
                  title={getSectorName(row.sector_name)}
                >
                  {getSectorName(row.sector_name)}
                </div>

                {/* Dot-matrix strip */}
                <div
                  className="flex-1"
                  role="meter"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('charts.sectorConcentration.concentrationAriaLabel', { pct: pct.toFixed(1) })}
                >
                  {(() => {
                    const N = 30, DR = 3, DG = 8
                    const filled = Math.round((pct / 100) * N)
                    return (
                      <svg viewBox={`0 0 ${N * DG} 10`} width={N * DG} height={10} aria-hidden="true">
                        {Array.from({ length: N }).map((_, i) => (
                          <circle
                            key={i}
                            cx={i * DG + DR}
                            cy={5}
                            r={DR}
                            fill={i < filled ? barColor : '#f3f1ec'}
                            stroke={i < filled ? undefined : '#e2ddd6'}
                            strokeWidth={i < filled ? 0 : 0.5}
                            fillOpacity={i < filled ? 0.85 : 1}
                          />
                        ))}
                      </svg>
                    )
                  })()}
                </div>

                {/* Percentage label */}
                <div className="w-[52px] flex-shrink-0 flex items-center gap-1.5 justify-end">
                  <span
                    className="text-xs font-mono font-bold tabular-nums"
                    style={{ color: barColor }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold uppercase tracking-wide hidden sm:inline-block"
                    style={{ color: `${barColor}99` }}
                  >
                    {label}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Legend */}
      {!isLoading && !isError && sorted.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
          {[
            { color: '#dc2626', label: t('charts.sectorConcentration.legendHigh') },
            { color: '#ea580c', label: t('charts.sectorConcentration.legendModerate') },
            { color: '#eab308', label: t('charts.sectorConcentration.legendLow') },
            { color: '#16a34a', label: t('charts.sectorConcentration.legendCompetitive') },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="inline-block rounded-full" style={{ width: 6, height: 6, backgroundColor: color, opacity: 0.85 }} />
              <span className="text-[10px] font-mono text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="mt-3 text-[10px] text-text-muted leading-snug">
        {t('charts.sectorConcentration.footnote')}
      </p>
    </section>
  )
}
