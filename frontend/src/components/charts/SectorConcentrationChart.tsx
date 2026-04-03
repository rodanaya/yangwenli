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
import { SECTOR_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

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
          <div className="w-[140px] flex-shrink-0 h-3 rounded bg-zinc-800 animate-pulse" />
          <div
            className="h-5 rounded bg-zinc-800 animate-pulse"
            style={{ width: `${30 + ((i * 47) % 55)}%` }}
          />
          <div className="ml-auto w-8 h-3 rounded bg-zinc-800 animate-pulse" />
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
      className={cn('rounded-xl border border-white/8 bg-zinc-900/60 p-5', className)}
      aria-labelledby="sector-concentration-title"
    >
      {showTitle && (
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 leading-none mb-1">
            RUBLI v6.5 · 3.06M contratos · 2002–2025
          </p>
          <h2
            id="sector-concentration-title"
            className="text-base font-bold text-white leading-tight"
          >
            {t('charts.sectorConcentration.title')}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('charts.sectorConcentration.subtitle')}
          </p>
        </div>
      )}

      {isLoading && <BarSkeleton label={t('charts.sectorConcentration.skeletonAriaLabel')} />}

      {isError && !isLoading && (
        <p
          role="alert"
          className="text-sm text-zinc-500 py-6 text-center"
        >
          {t('charts.sectorConcentration.noData')}
        </p>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <p className="text-sm text-zinc-500 py-6 text-center">{t('charts.sectorConcentration.noData')}</p>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <ul className="space-y-2.5" role="list" aria-label="Concentración de mercado por sector">
          {sorted.map((row) => {
            const { color: barColor, label } = getConcentrationLevel(row.metric_value)
            const accentColor = getSectorColor(row.sector_name)
            const pct = Math.min(100, Math.max(0, row.metric_value))

            return (
              <li
                key={row.sector_id}
                className="flex items-center gap-3"
                aria-label={`${row.sector_name}: ${pct.toFixed(1)}% — ${label}`}
              >
                {/* Sector name with left border accent */}
                <div
                  className="w-[140px] flex-shrink-0 pl-2 border-l-2 text-xs font-medium text-zinc-300 truncate"
                  style={{ borderColor: accentColor }}
                  title={row.sector_name}
                >
                  {row.sector_name}
                </div>

                {/* Bar track */}
                <div
                  className="flex-1 h-4 rounded-sm bg-zinc-800 overflow-hidden relative"
                  role="meter"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${pct.toFixed(1)}% concentración`}
                >
                  <div
                    className="h-full rounded-sm transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                      opacity: 0.85,
                    }}
                  />
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
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1">
          {[
            { color: '#dc2626', label: 'Alta ≥75%' },
            { color: '#ea580c', label: 'Moderada ≥50%' },
            { color: '#eab308', label: 'Baja ≥30%' },
            { color: '#16a34a', label: 'Competitiva <30%' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2 w-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
              <span className="text-[10px] font-mono text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="mt-3 text-[10px] text-zinc-600 leading-snug">
        Fuente: RUBLI v6.5 · 3.06M contratos · 2002-2025
      </p>
    </section>
  )
}
