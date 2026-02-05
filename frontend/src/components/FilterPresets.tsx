/**
 * Filter Presets Component
 * Quick filter buttons for common data queries
 */

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  AlertOctagon,
  User,
  Award,
  DollarSign,
  Calendar,
  X,
} from 'lucide-react'
import type { ContractFilterParams } from '@/api/types'

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  AlertTriangle,
  AlertOctagon,
  User,
  Award,
  DollarSign,
  Calendar,
}

interface FilterPreset {
  id: string
  label: string
  icon: string
  filter: Partial<ContractFilterParams>
  description?: string
}

const PRESETS: FilterPreset[] = [
  {
    id: 'high-risk',
    label: 'High Risk',
    icon: 'AlertTriangle',
    filter: { risk_level: 'high' },
    description: 'Contracts with high risk score',
  },
  {
    id: 'critical-risk',
    label: 'Critical',
    icon: 'AlertOctagon',
    filter: { risk_level: 'critical' },
    description: 'Contracts requiring immediate attention',
  },
  {
    id: 'single-bid',
    label: 'Single Bidder',
    icon: 'User',
    filter: { is_single_bid: true },
    description: 'Competitive procedures with only one bidder',
  },
  {
    id: 'direct-award',
    label: 'Direct Awards',
    icon: 'Award',
    filter: { is_direct_award: true },
    description: 'Contracts awarded without competition',
  },
  {
    id: 'big-contracts',
    label: '>100M MXN',
    icon: 'DollarSign',
    filter: { min_amount: 100_000_000 },
    description: 'Large contracts over 100 million pesos',
  },
]

interface FilterPresetsProps {
  activePresets: string[]
  onPresetToggle: (presetId: string, filter: Partial<ContractFilterParams>) => void
  onClearAll?: () => void
  className?: string
  compact?: boolean
}

export const FilterPresets = memo(function FilterPresets({
  activePresets,
  onPresetToggle,
  onClearAll,
  className = '',
  compact = false,
}: FilterPresetsProps) {
  const hasActiveFilters = activePresets.length > 0

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-text-muted mr-1">Quick filters:</span>
      {PRESETS.map((preset) => {
        const Icon = ICONS[preset.icon] || AlertTriangle
        const isActive = activePresets.includes(preset.id)

        return (
          <Button
            key={preset.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresetToggle(preset.id, preset.filter)}
            className={`gap-1.5 ${compact ? 'h-7 text-xs px-2' : 'h-8'}`}
            title={preset.description}
          >
            <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {preset.label}
          </Button>
        )
      })}
      {hasActiveFilters && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className={`gap-1 text-text-muted hover:text-text-primary ${compact ? 'h-7 text-xs' : 'h-8'}`}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
})

// Hook for managing filter preset state
import { useState, useCallback } from 'react'

export function useFilterPresets(
  onFilterChange: (filters: Partial<ContractFilterParams>) => void
) {
  const [activePresets, setActivePresets] = useState<string[]>([])

  const togglePreset = useCallback(
    (presetId: string, _filter: Partial<ContractFilterParams>) => {
      setActivePresets((prev) => {
        const isActive = prev.includes(presetId)
        const newPresets = isActive
          ? prev.filter((id) => id !== presetId)
          : [...prev, presetId]

        // Build combined filter from all active presets
        const combinedFilter = newPresets.reduce((acc, id) => {
          const preset = PRESETS.find((p) => p.id === id)
          if (preset) {
            return { ...acc, ...preset.filter }
          }
          return acc
        }, {} as Partial<ContractFilterParams>)

        onFilterChange(combinedFilter)
        return newPresets
      })
    },
    [onFilterChange]
  )

  const clearAll = useCallback(() => {
    setActivePresets([])
    onFilterChange({})
  }, [onFilterChange])

  return {
    activePresets,
    togglePreset,
    clearAll,
  }
}

export default FilterPresets
