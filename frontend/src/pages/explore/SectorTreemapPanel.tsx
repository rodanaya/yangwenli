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
      .sort((a, b) => b.value - a.value)
  }, [data, ts])

  const totalValue = useMemo(() => cells.reduce((s, c) => s + c.value, 0), [cells])
  const maxRiskRate = useMemo(() => Math.max(...cells.map(c => c.riskRate), 0.001), [cells])

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {t('treemap.sectorsByValue')}
          </div>
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-4 gap-1 h-28">
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-full rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
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
              Value
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
              Risk
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1" style={{ minHeight: '6rem' }}>
        {cells.map(cell => {
          const pct = totalValue > 0 ? cell.value / totalValue : 0
          const isSelected = selectedSectorId === cell.id
          const isDimmed = selectedSectorId != null && !isSelected
          const minW = Math.max(pct * 100, 7)
          const riskBarWidth = maxRiskRate > 0 ? (cell.riskRate / maxRiskRate) * 100 : 0
          const riskOverlayOpacity = viewMode === 'risk' ? Math.min(cell.riskRate * 7, 0.70) : 0

          return (
            <button
              key={cell.id}
              onClick={() => onSectorClick(isSelected ? undefined : cell.id)}
              title={`${cell.name}: ${formatCompactMXN(cell.value)} · ${(cell.riskRate * 100).toFixed(1)}% high-risk rate`}
              className={cn(
                'relative flex flex-col justify-between p-2 rounded text-left transition-all cursor-pointer overflow-hidden',
                isSelected
                  ? 'ring-2 ring-white/70 scale-[1.03] shadow-lg z-10'
                  : 'hover:scale-[1.015] hover:shadow-md',
                isDimmed ? 'opacity-20' : 'opacity-90 hover:opacity-100'
              )}
              style={{
                backgroundColor: cell.color,
                flexBasis: `${minW}%`,
                flexGrow: pct * 100,
                minHeight: '6rem',
                maxHeight: '7.5rem',
              }}
              aria-pressed={isSelected}
              aria-label={`${cell.name} sector, ${formatCompactMXN(cell.value)}, ${(cell.riskRate * 100).toFixed(1)}% high-risk`}
            >
              {/* Risk heat overlay for risk mode */}
              <div
                className="absolute inset-0 rounded pointer-events-none transition-opacity duration-300"
                style={{ backgroundColor: `rgba(248,113,113,${riskOverlayOpacity})` }}
              />

              {/* Top: name + count */}
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-white/95 leading-tight truncate block">
                  {cell.name}
                </span>
                <span className="text-[9px] text-white/60 leading-tight block mt-0.5">
                  {formatNumber(cell.contracts)}
                </span>
              </div>

              {/* Bottom: primary metric + risk bar */}
              <div className="relative z-10 mt-1">
                <div className="flex items-end justify-between mb-1">
                  {viewMode === 'value' ? (
                    <span className="text-[9px] font-semibold text-white/80 truncate">
                      {formatCompactMXN(cell.value)}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-white/95">
                      {(cell.riskRate * 100).toFixed(1)}% HR
                    </span>
                  )}
                </div>
                {/* Normalized risk bar */}
                <div className="h-[3px] rounded-full bg-black/25 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${riskBarWidth}%`,
                      backgroundColor: viewMode === 'risk' ? '#fca5a5' : 'rgba(255,255,255,0.60)',
                    }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
