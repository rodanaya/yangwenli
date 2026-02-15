/**
 * InstitutionsTab — Institution browser with search, filters, presets, and sortable table.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  cn,
  formatCompactMXN,
  formatNumber,
  toTitleCase,
  getRiskLevel,
} from '@/lib/utils'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { institutionApi } from '@/api/client'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import type { InstitutionFilterParams, InstitutionResponse } from '@/api/types'
import {
  Users,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BarChart3,
  Crown,
  Flame,
  Zap,
  Target,
  X,
  Landmark,
  Banknote,
  Heart,
  GraduationCap,
  Scale,
  Shield,
  Factory,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { StatPill, MiniBar } from './shared'

// =============================================================================
// Column and Preset Configuration
// =============================================================================

type InstSortField = 'name' | 'total_contracts' | 'total_amount_mxn' | 'avg_risk_score' | 'direct_award_pct' | 'single_bid_pct' | 'high_risk_pct' | 'vendor_count'

const INST_COLUMNS: { key: InstSortField; label: string; shortLabel: string; align: 'left' | 'right'; hideBelow?: string }[] = [
  { key: 'name', label: 'Institution', shortLabel: 'Institution', align: 'left' },
  { key: 'total_contracts', label: 'Contracts', shortLabel: '#', align: 'right' },
  { key: 'total_amount_mxn', label: 'Spending', shortLabel: 'Value', align: 'right' },
  { key: 'avg_risk_score', label: 'Risk Score', shortLabel: 'Risk', align: 'right' },
  { key: 'direct_award_pct', label: 'Direct %', shortLabel: 'DA%', align: 'right', hideBelow: 'lg' },
  { key: 'single_bid_pct', label: 'Single Bid %', shortLabel: 'SB%', align: 'right', hideBelow: 'xl' },
  { key: 'high_risk_pct', label: 'Flagged %', shortLabel: 'Flag%', align: 'right', hideBelow: 'lg' },
  { key: 'vendor_count', label: 'Vendors', shortLabel: 'Vndr', align: 'right', hideBelow: 'xl' },
]

const INST_PRESETS: readonly { id: string; label: string; icon: typeof Crown; sort: string; order: 'asc' | 'desc'; filters: Record<string, string | number> }[] = [
  { id: 'top-spending', label: 'Top by Spending', icon: Crown, sort: 'total_amount_mxn', order: 'desc', filters: {} },
  { id: 'highest-risk', label: 'Highest Risk', icon: Flame, sort: 'avg_risk_score', order: 'desc', filters: {} },
  { id: 'most-direct', label: 'Most Direct Awards', icon: Zap, sort: 'direct_award_pct', order: 'desc', filters: {} },
  { id: 'most-flagged', label: 'Most Flagged', icon: AlertTriangle, sort: 'high_risk_pct', order: 'desc', filters: {} },
  { id: 'many-vendors', label: 'Most Vendors', icon: Users, sort: 'vendor_count', order: 'desc', filters: {} },
  { id: 'biggest', label: 'Most Contracts', icon: BarChart3, sort: 'total_contracts', order: 'desc', filters: {} },
  { id: 'mega-large', label: 'Large+', icon: Building2, sort: 'total_amount_mxn', order: 'desc', filters: { size_tier: 'large' } },
  { id: 'concentrated', label: 'Few Vendors', icon: Target, sort: 'vendor_count', order: 'asc', filters: { min_contracts: 100 } },
]

const INST_TYPES = [
  { value: 'federal_secretariat', label: 'Federal Secretariat' },
  { value: 'federal_agency', label: 'Federal Agency' },
  { value: 'state_agency', label: 'State Agency' },
  { value: 'state_government', label: 'State Government' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'health_institution', label: 'Health Institution' },
  { value: 'educational', label: 'Educational' },
  { value: 'research_education', label: 'Research & Education' },
  { value: 'state_enterprise_infra', label: 'State Enterprise (Infra)' },
  { value: 'state_enterprise_energy', label: 'State Enterprise (Energy)' },
  { value: 'state_enterprise_finance', label: 'State Enterprise (Finance)' },
  { value: 'judicial', label: 'Judicial' },
  { value: 'social_program', label: 'Social Program' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'regulatory_agency', label: 'Regulatory Agency' },
  { value: 'autonomous_constitutional', label: 'Autonomous Constitutional' },
  { value: 'legislative', label: 'Legislative' },
  { value: 'military', label: 'Military' },
  { value: 'other', label: 'Other' },
]

const SIZE_TIERS = [
  { value: 'mega', label: 'Mega (top 4)' },
  { value: 'large', label: 'Large' },
  { value: 'medium', label: 'Medium' },
  { value: 'small', label: 'Small' },
  { value: 'micro', label: 'Micro' },
]

const INST_TYPE_ICON: Record<string, typeof Building2> = {
  federal_secretariat: Building2,
  federal_agency: Building,
  state_agency: Landmark,
  state_government: Landmark,
  municipal: Building,
  health_institution: Heart,
  educational: GraduationCap,
  research_education: GraduationCap,
  state_enterprise_infra: Factory,
  state_enterprise_energy: Zap,
  state_enterprise_finance: Banknote,
  judicial: Scale,
  social_program: Users,
  social_security: Shield,
  regulatory_agency: Shield,
  autonomous_constitutional: Landmark,
  legislative: Scale,
  military: Shield,
  other: Building,
}

// =============================================================================
// InstitutionsTab Component
// =============================================================================

export default function InstitutionsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Debounced search
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  // Sort state from URL
  const sortBy = (searchParams.get('sort_by') as InstSortField) || 'total_amount_mxn'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'

  const filters: InstitutionFilterParams = useMemo(
    () => ({
      page: Number(searchParams.get('page')) || 1,
      per_page: 100,
      search: debouncedSearch || undefined,
      institution_type: searchParams.get('type') || undefined,
      sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
      min_contracts: searchParams.get('min_contracts')
        ? Number(searchParams.get('min_contracts'))
        : undefined,
      size_tier: searchParams.get('size_tier') || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    [searchParams, debouncedSearch, sortBy, sortOrder]
  )

  // Sync URL when debounced search changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
        newParams.set('page', '1')
      } else {
        newParams.delete('search')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, searchParams, setSearchParams])

  const toast = useToast()

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['institutions', filters],
    queryFn: () => institutionApi.getAll(filters),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (error) {
      toast.error('Failed to load institutions', (error as Error).message)
    }
  }, [error, toast])

  const updateFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      if (key === 'search') {
        setSearchInput(String(value || ''))
        return
      }

      const newParams = new URLSearchParams(searchParams)
      if (value === undefined || value === '') {
        newParams.delete(key)
      } else {
        newParams.set(key, String(value))
      }
      if (key !== 'page') {
        newParams.set('page', '1')
      }
      if (!newParams.has('tab')) {
        newParams.set('tab', 'institutions')
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams, setSearchInput]
  )

  const handleSort = useCallback(
    (field: InstSortField) => {
      const newParams = new URLSearchParams(searchParams)
      if (sortBy === field) {
        newParams.set('sort_order', sortOrder === 'desc' ? 'asc' : 'desc')
      } else {
        newParams.set('sort_by', field)
        newParams.set('sort_order', field === 'name' ? 'asc' : 'desc')
      }
      newParams.set('page', '1')
      if (!newParams.has('tab')) newParams.set('tab', 'institutions')
      setSearchParams(newParams)
      setActivePreset(null)
    },
    [searchParams, setSearchParams, sortBy, sortOrder]
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = INST_PRESETS.find((p) => p.id === presetId)
      if (!preset) return
      const newParams = new URLSearchParams({ tab: 'institutions' })
      newParams.set('sort_by', preset.sort)
      newParams.set('sort_order', preset.order)
      Object.entries(preset.filters).forEach(([k, v]) => {
        if (v !== undefined) newParams.set(k, String(v))
      })
      newParams.set('page', '1')
      setSearchInput('')
      setSearchParams(newParams)
      setActivePreset(presetId)
    },
    [setSearchParams, setSearchInput]
  )

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setSearchParams({ tab: 'institutions' })
    setActivePreset(null)
  }, [setSearchParams, setSearchInput])

  const hasActiveFilters = !!(filters.search || filters.institution_type || filters.sector_id || filters.min_contracts || filters.size_tier)

  // Page summary stats
  const pageStats = useMemo(() => {
    if (!data?.data?.length) return null
    const insts = data.data
    const totalValue = insts.reduce((s, i) => s + (i.total_amount_mxn || 0), 0)
    const totalContracts = insts.reduce((s, i) => s + (i.total_contracts || 0), 0)
    const withRisk = insts.filter((i) => i.avg_risk_score != null)
    const avgRisk = withRisk.length > 0 ? withRisk.reduce((s, i) => s + i.avg_risk_score!, 0) / withRisk.length : 0
    const highRiskCount = insts.filter((i) => (i.avg_risk_score || 0) >= 0.30).length
    const totalVendors = insts.reduce((s, i) => s + (i.vendor_count || 0), 0)
    return { totalValue, totalContracts, avgRisk, highRiskCount, totalVendors }
  }, [data])

  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = []
    if (filters.institution_type) {
      const t = INST_TYPES.find((t) => t.value === filters.institution_type)
      tags.push({ key: 'type', label: t ? t.label : filters.institution_type })
    }
    if (filters.sector_id) {
      const sec = SECTORS.find((s) => s.id === filters.sector_id)
      tags.push({ key: 'sector_id', label: sec ? sec.nameEN : `Sector ${filters.sector_id}` })
    }
    if (filters.min_contracts) tags.push({ key: 'min_contracts', label: `${filters.min_contracts}+ contracts` })
    if (filters.size_tier) {
      const tier = SIZE_TIERS.find((t) => t.value === filters.size_tier)
      tags.push({ key: 'size_tier', label: tier ? tier.label : filters.size_tier })
    }
    if (filters.search) tags.push({ key: 'search', label: `"${filters.search}"` })
    return tags
  }, [filters])

  return (
    <div className="space-y-3">
      {/* Preset chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {INST_PRESETS.map((preset) => {
          const Icon = preset.icon
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => isActive ? clearAllFilters() : applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all',
                isActive
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-background-card border-border/50 text-text-muted hover:text-text-primary hover:border-border'
              )}
            >
              <Icon className="h-3 w-3" />
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted tabular-nums" aria-live="polite">
            {data
              ? `${formatNumber(data.pagination.total)} institutions`
              : 'Loading...'}
            {isFetching && !isLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
          </p>
          {activeFilterTags.length > 0 && (
            <div className="flex items-center gap-1">
              {activeFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium"
                >
                  {tag.label}
                  <button
                    onClick={() => {
                      if (tag.key === 'search') setSearchInput('')
                      updateFilter(tag.key, undefined)
                      setActivePreset(null)
                    }}
                    className="hover:text-text-primary"
                    aria-label={`Remove ${tag.label} filter`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            {showSearchLoading ? (
              <Loader2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            )}
            <input
              type="text"
              placeholder="Search name or acronym..."
              className="h-8 w-48 rounded-md border border-border bg-background-card pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setActivePreset(null) }}
              aria-label="Search institutions by name or abbreviation"
            />
          </div>

          {/* Sector filter */}
          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.sector_id || ''}
            onChange={(e) => { updateFilter('sector_id', e.target.value ? Number(e.target.value) : undefined); setActivePreset(null) }}
            aria-label="Filter by sector"
          >
            <option value="">All Sectors</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{s.nameEN}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.institution_type || ''}
            onChange={(e) => { updateFilter('type', e.target.value || undefined); setActivePreset(null) }}
            aria-label="Filter by institution type"
          >
            <option value="">All Types</option>
            {INST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Min contracts filter */}
          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.min_contracts || ''}
            onChange={(e) => {
              updateFilter('min_contracts', e.target.value ? Number(e.target.value) : undefined)
              setActivePreset(null)
            }}
            aria-label="Minimum contracts"
          >
            <option value="">Min contracts</option>
            <option value="10">10+</option>
            <option value="50">50+</option>
            <option value="100">100+</option>
            <option value="500">500+</option>
            <option value="1000">1,000+</option>
            <option value="5000">5,000+</option>
          </select>

          {/* Size tier filter */}
          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.size_tier || ''}
            onChange={(e) => { updateFilter('size_tier', e.target.value || undefined); setActivePreset(null) }}
            aria-label="Filter by size"
          >
            <option value="">All Sizes</option>
            {SIZE_TIERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              className="text-[11px] text-accent hover:underline"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Summary stats strip */}
      {pageStats && !isLoading && (
        <div className="flex items-center gap-4 px-3 py-2 rounded-md bg-background-elevated/30 border border-border/30">
          <StatPill label="Page spending" value={formatCompactMXN(pageStats.totalValue)} />
          <StatPill label="Page contracts" value={formatNumber(pageStats.totalContracts)} />
          <StatPill label="Avg risk" value={`${(pageStats.avgRisk * 100).toFixed(1)}%`} color={pageStats.avgRisk >= 0.3 ? 'var(--risk-high)' : pageStats.avgRisk >= 0.1 ? 'var(--risk-medium)' : undefined} />
          {pageStats.highRiskCount > 0 && (
            <StatPill label="High+ risk" value={String(pageStats.highRiskCount)} color="var(--risk-high)" />
          )}
          <StatPill label="Total vendors" value={formatNumber(pageStats.totalVendors)} />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(20)].map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-risk-high mx-auto mb-3" />
            <p className="text-sm text-text-primary mb-2">Failed to load institutions</p>
            <p className="text-xs text-text-muted mb-3">
              {(error as Error).message === 'Network Error'
                ? 'Backend not reachable.'
                : (error as Error).message || 'An unexpected error occurred.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !data?.data?.length ? (
        <div className="py-12 text-center">
          <Building className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">No institutions match your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-background-elevated/50">
                <th className="w-8 px-2 py-2 text-[10px] font-semibold text-text-muted text-center">#</th>
                {INST_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2 font-semibold text-text-muted whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.key === 'name' ? 'w-auto' : 'w-20',
                      col.hideBelow === 'lg' && 'hidden lg:table-cell',
                      col.hideBelow === 'xl' && 'hidden xl:table-cell',
                    )}
                    onClick={() => handleSort(col.key)}
                    aria-sort={sortBy === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.shortLabel}</span>
                      {sortBy === col.key && (
                        <span className="text-accent">
                          {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.data.map((inst, idx) => (
                <InstitutionRow
                  key={inst.id}
                  institution={inst}
                  rank={(filters.page! - 1) * filters.per_page! + idx + 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-text-muted tabular-nums">
            {(filters.page! - 1) * filters.per_page! + 1}-
            {Math.min(filters.page! * filters.per_page!, data.pagination.total)} of{' '}
            {formatNumber(data.pagination.total)}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={filters.page === 1}
              onClick={() => updateFilter('page', filters.page! - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] text-text-muted tabular-nums px-1">
              {filters.page}/{data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={filters.page === data.pagination.total_pages}
              onClick={() => updateFilter('page', filters.page! + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Institution Table Row
// =============================================================================

function InstitutionRow({ institution, rank }: { institution: InstitutionResponse; rank: number }) {
  const prefetch = usePrefetchOnHover({
    queryKey: ['institution', institution.id],
    queryFn: () => institutionApi.getById(institution.id),
    delay: 150,
  })

  const riskLevel = institution.avg_risk_score != null ? getRiskLevel(institution.avg_risk_score) : null
  const riskColor = riskLevel ? RISK_COLORS[riskLevel] : undefined

  // Sector info
  const sector = institution.sector_id ? SECTORS.find((s) => s.id === institution.sector_id) : null

  // NOTE: institution_stats stores percentages as 0-100 (e.g. 79.14 = 79.14%), NOT 0-1 fractions

  // Color for direct award %
  const daPct = institution.direct_award_pct || 0
  const daColor = daPct >= 90 ? 'var(--risk-critical)' :
                  daPct >= 70 ? 'var(--risk-high)' :
                  daPct >= 50 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  // Color for single bid %
  const sbPct = institution.single_bid_pct || 0
  const sbColor = sbPct >= 50 ? 'var(--risk-high)' :
                  sbPct >= 20 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  // Color for high risk %
  const hrPct = institution.high_risk_pct || 0
  const hrColor = hrPct >= 50 ? 'var(--risk-critical)' :
                  hrPct >= 30 ? 'var(--risk-high)' :
                  hrPct >= 15 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  return (
    <tr className="hover:bg-accent/[0.04] transition-colors group" {...prefetch}>
      {/* Rank */}
      <td className="px-2 py-2 text-center">
        <span className="text-[10px] tabular-nums text-text-muted">{rank}</span>
      </td>

      {/* Institution name + type icon + sector */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Type icon with sector-colored background */}
          {(() => {
            const TypeIcon = institution.institution_type ? (INST_TYPE_ICON[institution.institution_type] || Building) : Building
            return (
              <div
                className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center"
                style={{ backgroundColor: sector?.color ? `${sector.color}20` : 'var(--color-border-subtle, rgba(255,255,255,0.06))' }}
                title={`${institution.institution_type?.replace(/_/g, ' ') || 'Unknown type'} — ${sector?.nameEN || 'Unknown sector'}`}
              >
                <TypeIcon className="h-3 w-3" style={{ color: sector?.color || 'var(--color-text-muted)' }} />
              </div>
            )
          })()}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/institutions/${institution.id}`}
                className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-[250px] lg:max-w-[400px]"
              >
                {toTitleCase(institution.name)}
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {institution.siglas && (
                <span className="text-[10px] text-text-muted font-medium">{institution.siglas}</span>
              )}
              {institution.institution_type && (
                <span className="text-[10px] text-text-muted capitalize">
                  {institution.institution_type.replace(/_/g, ' ')}
                </span>
              )}
              {sector && (
                <span className="text-[10px] font-medium" style={{ color: sector.color }}>
                  {sector.nameEN}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Contracts */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs tabular-nums text-text-primary font-medium">
          {formatNumber(institution.total_contracts || 0)}
        </span>
      </td>

      {/* Spending */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs tabular-nums text-text-primary font-medium">
          {formatCompactMXN(institution.total_amount_mxn || 0)}
        </span>
      </td>

      {/* Risk score */}
      <td className="px-3 py-2 text-right">
        {institution.avg_risk_score != null ? (
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-10 h-1.5 rounded-full bg-border/40 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(institution.avg_risk_score * 100, 100)}%`,
                  backgroundColor: riskColor,
                }}
              />
            </div>
            <span className="text-xs tabular-nums font-semibold w-8 text-right" style={{ color: riskColor }}>
              {(institution.avg_risk_score * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-text-muted">-</span>
        )}
      </td>

      {/* Direct Award % */}
      <td className="px-3 py-2 text-right hidden lg:table-cell">
        <MiniBar pct={daPct / 100} color={daColor} />
      </td>

      {/* Single Bid % */}
      <td className="px-3 py-2 text-right hidden xl:table-cell">
        <span className="text-xs tabular-nums" style={{ color: sbColor }}>
          {sbPct < 1 && sbPct > 0 ? `${sbPct.toFixed(1)}%` : `${sbPct.toFixed(0)}%`}
        </span>
      </td>

      {/* Flagged % */}
      <td className="px-3 py-2 text-right hidden lg:table-cell">
        <span className="text-xs tabular-nums font-medium" style={{ color: hrColor }}>
          {hrPct < 1 && hrPct > 0 ? `${hrPct.toFixed(1)}%` : `${hrPct.toFixed(0)}%`}
        </span>
      </td>

      {/* Vendor count */}
      <td className="px-3 py-2 text-right hidden xl:table-cell">
        <span className="text-xs tabular-nums text-text-primary">
          {institution.vendor_count != null ? formatNumber(institution.vendor_count) : '-'}
        </span>
      </td>

      {/* Arrow */}
      <td className="px-2 py-2 text-right">
        <Link
          to={`/institutions/${institution.id}`}
          className="text-text-muted group-hover:text-accent transition-colors"
          aria-label={`View ${toTitleCase(institution.name)} details`}
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}
