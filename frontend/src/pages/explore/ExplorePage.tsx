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
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { X, Building2, Users, Layers, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { useExplorerFilters } from '@/hooks/useExplorerFilters'
import { SectorTreemapPanel } from './SectorTreemapPanel'
import { TimeSeriesPanel } from './TimeSeriesPanel'
import { RiskDistributionStrip } from './RiskDistributionStrip'
import { ResultsTable } from './ResultsTable'
import { SECTORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'

const RISK_LABELS: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

// Suggestion chips per entity type
// Each param maps to the useExplorerFilters URL params:
//   sector → sector_id   risk → risk levels   q → search text
const SUGGESTIONS: Record<'vendor' | 'institution', { label: string; params: Record<string, string> }[]> = {
  vendor: [
    { label: 'Critical + High risk', params: { risk: 'critical,high' } },
    { label: 'Critical only',        params: { risk: 'critical' } },
    { label: 'Salud sector',         params: { sector: '1' } },
    { label: 'Energia sector',       params: { sector: '4' } },
    { label: 'Infraestructura',      params: { sector: '3' } },
  ],
  institution: [
    { label: 'IMSS / ISSSTE',    params: { q: 'IMSS' } },
    { label: 'Salud sector',     params: { sector: '1' } },
    { label: 'Infraestructura',  params: { sector: '3' } },
    { label: 'High risk only',   params: { risk: 'critical,high' } },
  ],
}

export function ExplorePage() {
  const [page, setPage] = useState(1)
  const { t: ts } = useTranslation('sectors')
  const [, setSearchParams] = useSearchParams()
  const filters = useExplorerFilters()

  // Shared fast dashboard data — same queryKey as SectorTreemapPanel, free from cache
  const { data: dashData } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const activeSectorData = filters.sectorId != null && dashData?.sectors
    ? (dashData.sectors as any[]).find(s => s.id === filters.sectorId)
    : null
  const activeSectorMeta = filters.sectorId != null
    ? SECTORS.find(s => s.id === filters.sectorId)
    : null

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
      label: `Sector: ${sector ? ts(sector.code) : filters.sectorId}`,
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
      onRemove: () => { filters.clearRiskFilter(); setPage(1) },
    })
  }

  const hasFilters = activeChips.length > 0 || filters.searchText

  const applySuggestion = useCallback((params: Record<string, string>) => {
    // Apply suggestion atomically via direct URL update so all params land in one render
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (params.q !== undefined) {
        if (params.q) next.set('q', params.q)
        else next.delete('q')
      }
      if (params.sector !== undefined) {
        next.set('sector', params.sector)
      }
      if (params.risk !== undefined) {
        // risk param drives the risk filter: "critical,high" etc.
        // All-4 = no param (shows all), subset = set param
        const levels = params.risk.split(',').filter(Boolean)
        if (levels.length < 4) {
          next.set('risk', levels.join(','))
        } else {
          next.delete('risk')
        }
      }
      return next
    }, { replace: true })
    setPage(1)
  }, [setSearchParams])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Explore Contracts"
        subtitle="Cross-filter 3.1M procurement records"
        icon={Layers}
      />

      {/* Crossfilter orientation */}
      <div className="flex items-center gap-2 text-xs text-text-muted border-b border-border/20 pb-4">
        <Layers className="h-3.5 w-3.5 text-accent flex-shrink-0" />
        <span>Click any panel to filter all others — sector, time range, and risk level are cross-connected</span>
        {hasFilters && (
          <button
            onClick={() => { filters.clearAll(); setPage(1) }}
            className="ml-auto flex items-center gap-1 text-text-muted hover:text-risk-high transition-colors whitespace-nowrap"
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

      {/* Active sector intel card */}
      {activeSectorData && activeSectorMeta && (() => {
        const sd = activeSectorData
        const highRisk = (sd.high_risk_count || 0) + (sd.critical_risk_count || 0)
        const riskRate = sd.total_contracts > 0 ? (highRisk / sd.total_contracts * 100) : 0
        const daRate = sd.total_contracts > 0 ? ((sd.direct_award_count || 0) / sd.total_contracts * 100) : 0
        return (
          <div
            className="rounded-lg border p-3 flex flex-wrap items-center gap-x-5 gap-y-2"
            style={{
              borderColor: `${activeSectorMeta.color}50`,
              backgroundColor: `${activeSectorMeta.color}0a`,
            }}
          >
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: activeSectorMeta.color }} />
              <span className="text-sm font-semibold" style={{ color: activeSectorMeta.color }}>
                {ts(activeSectorMeta.code)}
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">sector intel</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <div>
                <span className="text-text-muted">Contracts</span>
                <span className="ml-1.5 font-mono font-semibold text-text-primary">
                  {formatNumber(sd.total_contracts || 0)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Total value</span>
                <span className="ml-1.5 font-mono font-semibold text-text-primary">
                  {formatCompactMXN(sd.total_value_mxn || 0)}
                </span>
              </div>
              <div>
                <span className="text-text-muted">High+ risk</span>
                <span className="ml-1.5 font-mono font-semibold text-orange-400">
                  {riskRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-text-muted">Direct award</span>
                <span className="ml-1.5 font-mono font-semibold text-text-primary">
                  {daRate.toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-text-muted">Avg risk score</span>
                <span className="ml-1.5 font-mono font-semibold text-text-primary">
                  {((sd.avg_risk_score || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )
      })()}

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

          {/* Suggestion chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {SUGGESTIONS[filters.entityType as 'vendor' | 'institution']?.map(s => (
              <button
                key={s.label}
                onClick={() => applySuggestion(s.params)}
                className="px-2 py-1 rounded-full border border-border/30 bg-background-elevated/20 text-xs text-text-muted hover:border-accent/40 hover:text-accent transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Text search */}
          <input
            type="text"
            value={filters.searchText}
            onChange={handleSearchChange}
            placeholder={`Search ${filters.entityType}s…`}
            className="flex-1 min-w-[180px] h-8 px-3 rounded-lg border border-border/40 bg-background-elevated/60 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/50 transition-all"
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
