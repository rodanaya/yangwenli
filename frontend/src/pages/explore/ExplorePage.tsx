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
import { useNavigate } from 'react-router-dom'
import { Compass, X, Building2, Users, TrendingUp, AlertTriangle, Activity, Network, Clock, DollarSign, ChevronRight } from 'lucide-react'
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

// Pre-computed intelligence insights (static facts from v5.1 model)
const INTELLIGENCE_INSIGHTS = [
  { icon: TrendingUp,    color: 'red',     title: 'Highest Risk Sector',    value: 'Salud',   detail: 'Avg risk score 0.34 · 9,366 IMSS contracts', href: '/sectors/1' },
  { icon: AlertTriangle, color: 'orange',  title: 'Corruption Cases',        value: '22',      detail: 'Documented cases in ground truth DB', href: '/cases' },
  { icon: Activity,      color: 'cyan',    title: 'ML Detection Rate',       value: '99.8%',   detail: 'Known corrupt contracts flagged', href: '/model' },
  { icon: Network,       color: 'purple',  title: 'Suspicious Vendors',      value: '8,701',   detail: 'With abnormal co-bidding patterns', href: '/network' },
  { icon: Clock,         color: 'amber',   title: 'Single-Bid Procedures',   value: '~22%',    detail: 'Competitive tenders with 1 bidder', href: '/contracts?single_bid=true' },
  { icon: DollarSign,    color: 'emerald', title: 'Validated Spend',          value: '~7T MXN', detail: '3.1M contracts 2002–2025', href: '/contracts' },
] as const

const INSIGHT_STYLES: Record<string, { border: string; bg: string; icon: string; value: string }> = {
  red:     { border: 'border-red-500/20',     bg: 'bg-red-500/5',     icon: 'text-red-400',     value: 'text-red-300' },
  orange:  { border: 'border-orange-500/20',  bg: 'bg-orange-500/5',  icon: 'text-orange-400',  value: 'text-orange-300' },
  cyan:    { border: 'border-cyan-500/20',    bg: 'bg-cyan-500/5',    icon: 'text-cyan-400',    value: 'text-cyan-300' },
  purple:  { border: 'border-purple-500/20',  bg: 'bg-purple-500/5',  icon: 'text-purple-400',  value: 'text-purple-300' },
  amber:   { border: 'border-amber-500/20',   bg: 'bg-amber-500/5',   icon: 'text-amber-400',   value: 'text-amber-300' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: 'text-emerald-400', value: 'text-emerald-300' },
}

// Suggestion chips per entity type
const SUGGESTIONS: Record<'vendor' | 'institution', { label: string; params: Record<string, string> }[]> = {
  vendor: [
    { label: 'High-risk',       params: { risk_level: 'critical,high' } },
    { label: 'Top by risk',     params: { sort_by: 'avg_risk_score', sort_order: 'desc' } },
    { label: 'Ghost company suspects', params: { risk_level: 'critical' } },
    { label: 'Salud sector',    params: { sector_id: '1' } },
    { label: 'Energia sector',  params: { sector_id: '4' } },
  ],
  institution: [
    { label: 'High direct-award', params: { sort_by: 'direct_award_rate', sort_order: 'desc' } },
    { label: 'IMSS / ISSSTE',     params: { search: 'IMSS' } },
    { label: 'Infraestructura',   params: { sector_id: '3' } },
    { label: 'Federal agencies',  params: { type: 'federal' } },
  ],
}

export function ExplorePage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
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

  const applySuggestion = useCallback((params: Record<string, string>) => {
    if (params.search) { filters.setSearchText(params.search); setPage(1) }
    if (params.sector_id) { filters.setSectorId(Number(params.sector_id)); setPage(1) }
    if (params.risk_level) { filters.clearAll(); setPage(1) }
  }, [filters])

  return (
    <div className="space-y-5">

      {/* Intelligence Insights strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {INTELLIGENCE_INSIGHTS.map((insight) => {
          const s = INSIGHT_STYLES[insight.color]
          const Icon = insight.icon
          return (
            <button
              key={insight.title}
              onClick={() => navigate(insight.href)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all duration-150 group',
                s.border, s.bg,
                'hover:scale-[1.02] hover:shadow-md'
              )}
            >
              <Icon className={cn('h-4 w-4 mb-2', s.icon)} />
              <div className={cn('text-lg font-bold font-mono leading-none mb-1', s.value)}>
                {insight.value}
              </div>
              <div className="text-[10px] font-medium text-text-muted/80 leading-tight">{insight.title}</div>
              <div className="text-[10px] text-text-muted/50 mt-0.5 leading-tight hidden group-hover:block truncate">{insight.detail}</div>
              <ChevronRight className={cn('h-3 w-3 mt-1 opacity-0 group-hover:opacity-60 transition-opacity', s.icon)} />
            </button>
          )
        })}
      </div>

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

          {/* Suggestion chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {SUGGESTIONS[filters.entityType as 'vendor' | 'institution']?.map(s => (
              <button
                key={s.label}
                onClick={() => applySuggestion(s.params)}
                className="px-2 py-1 rounded-full border border-border/30 bg-white/[0.03] text-xs text-text-muted hover:border-accent/40 hover:text-accent transition-colors"
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
