import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SectorTreemapPanelProps {
  selectedSectorId: number | undefined
  onSectorClick: (id: number | undefined) => void
}

type ViewMode = 'value' | 'risk'

export function SectorTreemapPanel({ selectedSectorId, onSectorClick }: SectorTreemapPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('value')
  const { t } = useTranslation('explore')
  const { t: ts } = useTranslation('sectors')
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const cells = useMemo(() => {
    if (!data?.sectors) return []
    return [...data.sectors]
      .map(s => {
        const sd = s as any
        const meta = SECTORS.find(m => m.code === s.code)
        const highRisk = (sd.high_risk_count || 0) + (sd.critical_risk_count || 0)
        const riskRate = (sd.total_contracts || 0) > 0 ? highRisk / sd.total_contracts : 0
        return {
          id: s.id,
          code: s.code,
          name: ts(meta?.code ?? s.code),
          color: SECTOR_COLORS[s.code] || '#64748b',
          value: s.total_value_mxn || 0,
          contracts: sd.total_contracts || 0,
          avgRisk: s.avg_risk_score || 0,
          riskRate,
        }
      })
      .sort((a, b) => viewMode === 'value' ? b.value - a.value : b.riskRate - a.riskRate)
  }, [data, ts, viewMode])

  const maxValue = useMemo(() => Math.max(...cells.map(c => c.value), 1), [cells])
  const maxRiskRate = useMemo(() => Math.max(...cells.map(c => c.riskRate), 0.001), [cells])

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full flex-shrink-0" />
              <Skeleton className="h-3 w-20 flex-shrink-0" />
              <Skeleton className="h-4 rounded flex-1" style={{ width: `${70 - i * 6}%` }} />
              <Skeleton className="h-3 w-12 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {t('treemap.sectorsByValue')}
        </span>
        <div className="flex items-center gap-2">
          {selectedSectorId && (
            <button
              onClick={() => onSectorClick(undefined)}
              className="text-[10px] text-accent hover:underline"
            >
              {t('filters.clearFilter')}
            </button>
          )}
          <div className="flex items-center rounded border border-border/30 overflow-hidden text-[10px] font-medium">
            <button
              onClick={() => setViewMode('value')}
              className={cn(
                'px-2 py-0.5 transition-colors',
                viewMode === 'value'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {t('treemap.value')}
            </button>
            <button
              onClick={() => setViewMode('risk')}
              className={cn(
                'px-2 py-0.5 border-l border-border/30 transition-colors',
                viewMode === 'risk'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {t('treemap.risk')}
            </button>
          </div>
        </div>
      </div>

      {/* Ranked horizontal bar chart */}
      <div className="space-y-[3px]">
        {cells.map((cell, idx) => {
          const isSelected = selectedSectorId === cell.id
          const isDimmed = selectedSectorId != null && !isSelected
          const barPct = viewMode === 'value'
            ? (cell.value / maxValue) * 100
            : (cell.riskRate / maxRiskRate) * 100
          const metricLabel = viewMode === 'value'
            ? formatCompactMXN(cell.value)
            : `${(cell.riskRate * 100).toFixed(1)}%`
          const isRiskMode = viewMode === 'risk'
          // Risk color gradient: low rates stay accent, high rates shift toward red-orange
          const barColor = isRiskMode
            ? cell.riskRate > 0.18 ? '#f87171'
              : cell.riskRate > 0.12 ? '#fb923c'
              : cell.riskRate > 0.08 ? '#fbbf24'
              : 'var(--color-accent, #6366f1)'
            : cell.color

          return (
            <button
              key={cell.id}
              onClick={() => onSectorClick(isSelected ? undefined : cell.id)}
              className={cn(
                'w-full flex items-center gap-2 px-1.5 py-1 rounded transition-all text-left group',
                isSelected
                  ? 'bg-background-elevated ring-1 ring-border/60'
                  : 'hover:bg-background-elevated/50',
                isDimmed ? 'opacity-30' : 'opacity-100'
              )}
              aria-pressed={isSelected}
              aria-label={`${cell.name} sector, ${metricLabel}`}
            >
              {/* Rank */}
              <span className="text-[9px] font-mono text-text-muted/50 w-3 flex-shrink-0 text-right">
                {idx + 1}
              </span>

              {/* Sector color dot */}
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cell.color }}
              />

              {/* Sector name */}
              <span className={cn(
                'text-[11px] font-medium truncate flex-shrink-0 w-24',
                isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
              )}>
                {cell.name}
              </span>

              {/* Dot-matrix strip */}
              {(() => {
                const N = 22, DR = 2, DG = 5
                const filled = Math.max(1, Math.round((barPct / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 6`} className="flex-1 min-w-0" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                        fill={k < filled ? barColor : '#2d2926'}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}

              {/* Metric label */}
              <span className="text-[10px] font-mono text-text-muted flex-shrink-0 w-16 text-right">
                {metricLabel}
              </span>

              {/* Contract count (secondary, only in value mode) */}
              {viewMode === 'value' && (
                <span className="text-[9px] text-text-muted/50 flex-shrink-0 w-14 text-right hidden lg:block">
                  {formatNumber(cell.contracts)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
