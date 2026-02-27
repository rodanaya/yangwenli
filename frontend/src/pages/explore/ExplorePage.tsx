/**
 * ExplorePage — Crossfilter procurement explorer.
 * Every panel filters all others. Shneiderman mantra: Overview → Zoom → Details.
 *
 * Layout:
 *   [Sector Treemap | Time Series]
 *   [Risk Distribution Strip     ]
 *   [Entity Type Toggle + Search + Filter Chips]
 *   [Results Table               ]
 */

import React, { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Compass, X, Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExplorerFilters } from '@/hooks/useExplorerFilters'
import { SectorTreemapPanel } from './SectorTreemapPanel'
import { TimeSeriesPanel } from './TimeSeriesPanel'
import { RiskDistributionStrip } from './RiskDistributionStrip'
import { ResultsTable } from './ResultsTable'
import { SECTORS, RISK_COLORS } from '@/lib/constants'

const RISK_LABELS: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

export function ExplorePage() {
  const [page, setPage] = useState(1)
  const filters = useExplorerFilters()

  // Reset page when filters change
  const handleSectorClick = useCallback((id: number | undefined) => {
    filters.setSectorId(id)
    setPage(1)
  }, [filters])

  const handleYearRange = useCallback((start: number | undefined, end: number | undefined) => {
    filters.setYearRange(start, end)
    setPage(1)
  }, [filters])

  const handleToggleRisk = useCallback((level: string) => {
    filters.toggleRiskLevel(level)
    setPage(1)
  }, [filters])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    filters.setSearchText(e.target.value)
    setPage(1)
  }, [filters])

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = []

  if (filters.sectorId != null) {
    const sector = SECTORS.find(s => s.id === filters.sectorId)
    activeChips.push({
      label: `Sector: ${sector?.nameEN || filters.sectorId}`,
      onRemove: () => { filters.setSectorId(undefined); setPage(1) },
    })
  }
  if (filters.yearStart != null || filters.yearEnd != null) {
    const label = filters.yearStart && filters.yearEnd
      ? `${filters.yearStart}–${filters.yearEnd}`
      : filters.yearStart
        ? `From ${filters.yearStart}`
        : `Until ${filters.yearEnd}`
    activeChips.push({
      label: `Years: ${label}`,
      onRemove: () => { filters.setYearRange(undefined, undefined); setPage(1) },
    })
  }
  if (filters.riskLevels.length < 4) {
    activeChips.push({
      label: `Risk: ${filters.riskLevels.map(l => RISK_LABELS[l]).join(', ')}`,
      onRemove: () => { filters.riskLevels.forEach(() => {}); filters.clearAll(); setPage(1) },
    })
  }

  const hasFilters = activeChips.length > 0 || filters.searchText

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Compass className="h-4.5 w-4.5 text-accent" />
            Explore
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Click any panel to filter. All views are connected.
          </p>
        </div>
        {hasFilters && (
          <button
            onClick={() => { filters.clearAll(); setPage(1) }}
            className="text-xs text-text-muted hover:text-risk-high transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Top panels — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 bg-background-elevated/20 border border-border/20 rounded-lg p-4">
        <SectorTreemapPanel
          selectedSectorId={filters.sectorId}
          onSectorClick={handleSectorClick}
        />
        <div className="border-t lg:border-t-0 lg:border-l border-border/20 pt-4 lg:pt-0 lg:pl-5">
          <TimeSeriesPanel
            yearStart={filters.yearStart}
            yearEnd={filters.yearEnd}
            onYearRangeChange={handleYearRange}
          />
        </div>
      </div>

      {/* Risk distribution */}
      <div className="bg-background-elevated/20 border border-border/20 rounded-lg p-4">
        <RiskDistributionStrip
          activeRiskLevels={filters.riskLevels}
          onToggleRisk={handleToggleRisk}
        />
      </div>

      {/* Entity type toggle + search + active chips */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Entity type toggle */}
          <div className="flex rounded-lg border border-border/30 overflow-hidden">
            <button
              onClick={() => { filters.setEntityType('vendor'); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                filters.entityType === 'vendor'
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              aria-pressed={filters.entityType === 'vendor'}
            >
              <Users className="h-3 w-3" />
              Vendors
            </button>
            <button
              onClick={() => { filters.setEntityType('institution'); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border/30',
                filters.entityType === 'institution'
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              aria-pressed={filters.entityType === 'institution'}
            >
              <Building2 className="h-3 w-3" />
              Institutions
            </button>
          </div>

          {/* Text search */}
          <input
            type="text"
            value={filters.searchText}
            onChange={handleSearchChange}
            placeholder={`Search ${filters.entityType}s…`}
            className="h-8 px-3 rounded-lg border border-border/40 bg-background-elevated/60 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/50 transition-all"
          />

          {/* Active filter chips */}
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="flex items-center gap-1 px-2 py-1 rounded-full border border-accent/30 bg-accent/10 text-xs text-accent"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="hover:text-risk-high transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Results table */}
        <ResultsTable
          filters={filters}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
