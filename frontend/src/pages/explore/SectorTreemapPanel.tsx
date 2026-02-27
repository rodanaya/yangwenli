import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SectorTreemapPanelProps {
  selectedSectorId: number | undefined
  onSectorClick: (id: number | undefined) => void
}

export function SectorTreemapPanel({ selectedSectorId, onSectorClick }: SectorTreemapPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const cells = useMemo(() => {
    if (!data?.sectors) return []
    return [...data.sectors]
      .map(s => {
        const meta = SECTORS.find(m => m.code === s.code)
        return {
          id: s.id,
          code: s.code,
          name: meta?.nameEN || s.code,
          color: SECTOR_COLORS[s.code] || '#64748b',
          value: s.total_value_mxn || 0,
          contracts: s.total_contracts || 0,
          avgRisk: s.avg_risk_score || 0,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [data])

  const total = useMemo(() => cells.reduce((s, c) => s + c.value, 0), [cells])

  if (isLoading) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Sectors by Value</div>
        <div className="grid grid-cols-4 gap-1 h-24">
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-full rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Sectors by Value</span>
        {selectedSectorId && (
          <button
            onClick={() => onSectorClick(undefined)}
            className="text-[10px] text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1" style={{ minHeight: '3.5rem' }}>
        {cells.map(cell => {
          const pct = total > 0 ? (cell.value / total) : 0
          const isSelected = selectedSectorId === cell.id
          const isDimmed = selectedSectorId != null && !isSelected
          const minW = Math.max(pct * 100, 6)
          return (
            <button
              key={cell.id}
              onClick={() => onSectorClick(isSelected ? undefined : cell.id)}
              title={`${cell.name}: ${formatCompactMXN(cell.value)} · avg risk ${(cell.avgRisk * 100).toFixed(1)}%`}
              className={cn(
                'flex items-end justify-start p-1.5 rounded text-left transition-all cursor-pointer overflow-hidden',
                isSelected ? 'ring-2 ring-white/60 scale-105' : '',
                isDimmed ? 'opacity-35' : 'opacity-90 hover:opacity-100'
              )}
              style={{
                backgroundColor: cell.color,
                flexBasis: `${minW}%`,
                flexGrow: pct * 100,
                minHeight: '3.5rem',
                maxHeight: '4rem',
              }}
              aria-pressed={isSelected}
              aria-label={`${cell.name} sector, ${formatCompactMXN(cell.value)}`}
            >
              <span className="text-[9px] font-bold text-white/90 leading-tight truncate block">
                {cell.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
