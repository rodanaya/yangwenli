/**
 * VendorsTab — Vendor browser with search, filters, presets, and sortable table.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import { vendorApi } from '@/api/client'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import type { VendorFilterParams, VendorListItem } from '@/api/types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BarChart3,
  Crown,
  Flame,
  Zap,
  Target,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { StatPill, MiniBar } from './shared'

// =============================================================================
// Column and Preset Configuration
// =============================================================================

type SortField = 'name' | 'total_contracts' | 'total_value_mxn' | 'avg_risk_score' | 'direct_award_pct' | 'high_risk_pct' | 'single_bid_pct' | 'pct_anomalous'

const VENDOR_COLUMNS: { key: SortField; label: string; shortLabel: string; align: 'left' | 'right'; hideBelow?: string }[] = [
  { key: 'name', label: 'Vendor', shortLabel: 'Vendor', align: 'left' },
  { key: 'total_contracts', label: 'Contracts', shortLabel: '#', align: 'right' },
  { key: 'total_value_mxn', label: 'Total Value', shortLabel: 'Value', align: 'right' },
  { key: 'avg_risk_score', label: 'Risk Score', shortLabel: 'Risk', align: 'right' },
  { key: 'direct_award_pct', label: 'Direct %', shortLabel: 'DA%', align: 'right', hideBelow: 'lg' },
  { key: 'single_bid_pct', label: 'Single Bid %', shortLabel: 'SB%', align: 'right', hideBelow: 'xl' },
  { key: 'high_risk_pct', label: 'Flagged %', shortLabel: 'Flag%', align: 'right', hideBelow: 'lg' },
  { key: 'pct_anomalous', label: 'Anomaly %', shortLabel: 'Anom%', align: 'right', hideBelow: 'xl' },
]

const VENDOR_PRESETS = [
  { id: 'top-value', label: 'Top by Value', icon: Crown, sort: 'total_value_mxn', order: 'desc' as const, filters: { min_contracts: 10 } },
  { id: 'highest-risk', label: 'Highest Risk', icon: Flame, sort: 'avg_risk_score', order: 'desc' as const, filters: { min_contracts: 5 } },
  { id: 'most-direct', label: 'Most Direct Awards', icon: Zap, sort: 'direct_award_pct', order: 'desc' as const, filters: { min_contracts: 50 } },
  { id: 'most-flagged', label: 'Most Flagged', icon: AlertTriangle, sort: 'high_risk_pct', order: 'desc' as const, filters: { min_contracts: 20 } },
  { id: 'anomalous', label: 'Statistical Outliers', icon: Target, sort: 'pct_anomalous', order: 'desc' as const, filters: { min_contracts: 10 } },
  { id: 'big-players', label: 'Big Players (1K+)', icon: BarChart3, sort: 'total_contracts', order: 'desc' as const, filters: { min_contracts: 1000 } },
] as const

// =============================================================================
// VendorsTab Component
// =============================================================================

export default function VendorsTab() {
  const { t } = useTranslation('explore')
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const columnLabel = (key: SortField): string => ({
    name: t('vendors.columns.name'),
    total_contracts: t('vendors.columns.contracts'),
    total_value_mxn: t('vendors.columns.totalValue'),
    avg_risk_score: t('vendors.columns.avgRisk'),
    direct_award_pct: t('vendors.columns.directAwardPct'),
    single_bid_pct: t('vendors.columns.singleBidPct'),
    high_risk_pct: t('vendors.columns.highRiskPct'),
    pct_anomalous: t('vendors.columns.anomalyPct'),
  })[key] ?? key

  const presetLabel = (id: string): string => ({
    'top-value': t('vendors.presets.topValue'),
    'highest-risk': t('vendors.presets.highestRisk'),
    'most-direct': t('vendors.presets.mostDirect'),
    'most-flagged': t('vendors.presets.mostFlagged'),
    'anomalous': t('vendors.presets.outliers'),
    'big-players': t('vendors.presets.bigPlayers'),
  } as Record<string, string>)[id] ?? id

  // Debounced search
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  // Sort state from URL
  const sortBy = (searchParams.get('sort_by') as SortField) || 'total_value_mxn'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'

  const filters: VendorFilterParams = useMemo(
    () => ({
      page: Number(searchParams.get('page')) || 1,
      per_page: 100,
      search: debouncedSearch || undefined,
      risk_level: searchParams.get('risk_level') as VendorFilterParams['risk_level'],
      sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
      min_contracts: searchParams.get('min_contracts')
        ? Number(searchParams.get('min_contracts'))
        : undefined,
      min_value: searchParams.get('min_value')
        ? Number(searchParams.get('min_value'))
        : undefined,
      has_rfc: searchParams.get('has_rfc') === 'true' ? true : searchParams.get('has_rfc') === 'false' ? false : undefined,
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
    queryKey: ['vendors', filters],
    queryFn: () => vendorApi.getAll(filters),
    staleTime: 5 * 60 * 1000,
  })

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error('Failed to load vendors', (error as Error).message)
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
      // Preserve tab
      if (!newParams.has('tab')) {
        newParams.set('tab', 'vendors')
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams, setSearchInput]
  )

  const handleSort = useCallback(
    (field: SortField) => {
      const newParams = new URLSearchParams(searchParams)
      if (sortBy === field) {
        newParams.set('sort_order', sortOrder === 'desc' ? 'asc' : 'desc')
      } else {
        newParams.set('sort_by', field)
        newParams.set('sort_order', field === 'name' ? 'asc' : 'desc')
      }
      newParams.set('page', '1')
      if (!newParams.has('tab')) newParams.set('tab', 'vendors')
      setSearchParams(newParams)
      setActivePreset(null)
    },
    [searchParams, setSearchParams, sortBy, sortOrder]
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = VENDOR_PRESETS.find((p) => p.id === presetId)
      if (!preset) return
      const newParams = new URLSearchParams({ tab: 'vendors' })
      newParams.set('sort_by', preset.sort)
      newParams.set('sort_order', preset.order)
      if (preset.filters.min_contracts) newParams.set('min_contracts', String(preset.filters.min_contracts))
      newParams.set('page', '1')
      setSearchInput('')
      setSearchParams(newParams)
      setActivePreset(presetId)
    },
    [setSearchParams, setSearchInput]
  )

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setSearchParams({ tab: 'vendors' })
    setActivePreset(null)
  }, [setSearchParams, setSearchInput])

  const hasActiveFilters = !!(filters.search || filters.risk_level || filters.min_contracts || filters.sector_id || filters.min_value || filters.has_rfc !== undefined)

  // Compute summary stats from current page
  const pageStats = useMemo(() => {
    if (!data?.data?.length) return null
    const vendors = data.data
    const totalValue = vendors.reduce((s, v) => s + v.total_value_mxn, 0)
    const totalContracts = vendors.reduce((s, v) => s + v.total_contracts, 0)
    const avgRisk = vendors.reduce((s, v) => s + (v.avg_risk_score || 0), 0) / vendors.length
    const highRiskCount = vendors.filter((v) => (v.avg_risk_score || 0) >= 0.30).length
    const criticalCount = vendors.filter((v) => (v.avg_risk_score || 0) >= 0.50).length
    return { totalValue, totalContracts, avgRisk, highRiskCount, criticalCount }
  }, [data])

  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)

  // Active filters display
  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = []
    if (filters.risk_level) tags.push({ key: 'risk_level', label: `Risk: ${filters.risk_level}` })
    if (filters.sector_id) {
      const sec = SECTORS.find((s) => s.id === filters.sector_id)
      tags.push({ key: 'sector_id', label: sec ? sec.nameEN : `Sector ${filters.sector_id}` })
    }
    if (filters.min_contracts) tags.push({ key: 'min_contracts', label: `${filters.min_contracts}+ contracts` })
    if (filters.min_value) tags.push({ key: 'min_value', label: `${formatCompactMXN(filters.min_value)}+` })
    if (filters.has_rfc === true) tags.push({ key: 'has_rfc', label: 'Has RFC' })
    if (filters.has_rfc === false) tags.push({ key: 'has_rfc', label: 'No RFC' })
    if (filters.search) tags.push({ key: 'search', label: `"${filters.search}"` })
    return tags
  }, [filters])

  return (
    <div className="space-y-3">
      {/* Preset chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {VENDOR_PRESETS.map((preset) => {
          const Icon = preset.icon
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => isActive ? clearAllFilters() : applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                isActive
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-background-card border-border/50 text-text-muted hover:text-text-primary hover:border-border'
              )}
            >
              <Icon className="h-3 w-3" />
              {presetLabel(preset.id)}
            </button>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted tabular-nums" aria-live="polite">
            {data
              ? `${formatNumber(data.pagination.total)} vendors`
              : 'Loading...'}
            {isFetching && !isLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
          </p>
          {/* Active filter tags */}
          {activeFilterTags.length > 0 && (
            <div className="flex items-center gap-1">
              {activeFilterTags.map((tag) => (
                <span
                  key={tag.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium"
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
              placeholder="Search name or RFC..."
              className="h-8 w-48 rounded-md border border-border bg-background-card pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setActivePreset(null) }}
              aria-label="Search vendors by name or RFC"
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

          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.risk_level || ''}
            onChange={(e) => { updateFilter('risk_level', e.target.value || undefined); setActivePreset(null) }}
            aria-label="Filter by risk level"
          >
            <option value="">All Risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

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
            <option value="5">5+</option>
            <option value="10">10+</option>
            <option value="50">50+</option>
            <option value="100">100+</option>
            <option value="500">500+</option>
            <option value="1000">1,000+</option>
          </select>

          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.min_value || ''}
            onChange={(e) => {
              updateFilter('min_value', e.target.value ? Number(e.target.value) : undefined)
              setActivePreset(null)
            }}
            aria-label="Minimum total value"
          >
            <option value="">Min value</option>
            <option value="1000000">1M+ MXN</option>
            <option value="10000000">10M+ MXN</option>
            <option value="100000000">100M+ MXN</option>
            <option value="1000000000">1B+ MXN</option>
            <option value="10000000000">10B+ MXN</option>
          </select>

          <select
            className="h-8 rounded-md border border-border bg-background-card px-2 text-xs"
            value={filters.has_rfc === true ? 'true' : filters.has_rfc === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value
              updateFilter('has_rfc', val === 'true' ? 'true' : val === 'false' ? 'false' : undefined)
              setActivePreset(null)
            }}
            aria-label="RFC status"
          >
            <option value="">RFC status</option>
            <option value="true">Has RFC</option>
            <option value="false">No RFC</option>
          </select>

          {hasActiveFilters && (
            <button
              className="text-xs text-accent hover:underline"
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
          <StatPill label="Page value" value={formatCompactMXN(pageStats.totalValue)} />
          <StatPill label="Page contracts" value={formatNumber(pageStats.totalContracts)} />
          <StatPill label="Avg risk" value={`${(pageStats.avgRisk * 100).toFixed(1)}%`} color={pageStats.avgRisk >= 0.3 ? 'var(--risk-high)' : pageStats.avgRisk >= 0.1 ? 'var(--risk-medium)' : undefined} />
          {pageStats.highRiskCount > 0 && (
            <StatPill label="High+" value={String(pageStats.highRiskCount)} color="var(--risk-high)" />
          )}
          {pageStats.criticalCount > 0 && (
            <StatPill label="Critical" value={String(pageStats.criticalCount)} color="var(--risk-critical)" />
          )}
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
            <p className="text-sm text-text-primary mb-2">Failed to load vendors</p>
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
          <UserX className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">No vendors match your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-background-elevated/50">
                <th className="w-8 px-2 py-2 text-xs font-semibold text-text-muted text-center">#</th>
                {VENDOR_COLUMNS.map((col) => (
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
                      <span className="hidden sm:inline">{columnLabel(col.key)}</span>
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
              {data.data.map((vendor, idx) => (
                <VendorRow
                  key={vendor.id}
                  vendor={vendor}
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
          <p className="text-xs text-text-muted tabular-nums">
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
            <span className="text-xs text-text-muted tabular-nums px-1">
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
// Vendor Table Row
// =============================================================================

function VendorRow({ vendor, rank }: { vendor: VendorListItem; rank: number }) {
  const prefetch = usePrefetchOnHover({
    queryKey: ['vendor', vendor.id],
    queryFn: () => vendorApi.getById(vendor.id),
    delay: 150,
  })

  const riskLevel = vendor.avg_risk_score != null ? getRiskLevel(vendor.avg_risk_score) : null
  const riskColor = riskLevel ? RISK_COLORS[riskLevel] : undefined

  // Sector info
  const sector = vendor.primary_sector_id ? SECTORS.find((s) => s.id === vendor.primary_sector_id) : null

  // Activity indicator
  const currentYear = new Date().getFullYear()
  const yearsInactive = vendor.last_contract_year ? currentYear - vendor.last_contract_year : 99
  const isActive = yearsInactive <= 1

  // Avg contract size
  const avgContractSize = vendor.total_contracts > 0 ? vendor.total_value_mxn / vendor.total_contracts : 0

  // NOTE: vendor_stats stores percentages as 0-100 (e.g. 79.14 = 79.14%), NOT 0-1 fractions

  // Color for direct award %
  const daColor = vendor.direct_award_pct >= 90 ? 'var(--risk-critical)' :
                  vendor.direct_award_pct >= 70 ? 'var(--risk-high)' :
                  vendor.direct_award_pct >= 50 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  // Color for single bid %
  const sbColor = vendor.single_bid_pct >= 50 ? 'var(--risk-high)' :
                  vendor.single_bid_pct >= 20 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  // Color for high risk %
  const hrColor = vendor.high_risk_pct >= 50 ? 'var(--risk-critical)' :
                  vendor.high_risk_pct >= 30 ? 'var(--risk-high)' :
                  vendor.high_risk_pct >= 15 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  // Color for anomaly %
  const anomColor = (vendor.pct_anomalous || 0) >= 60 ? 'var(--risk-high)' :
                    (vendor.pct_anomalous || 0) >= 30 ? 'var(--risk-medium)' : 'var(--color-text-muted)'

  return (
    <tr
      className="hover:bg-accent/[0.04] transition-colors group"
      {...prefetch}
    >
      {/* Rank */}
      <td className="px-2 py-2 text-center">
        <span className="text-xs tabular-nums text-text-muted">{rank}</span>
      </td>

      {/* Vendor name + sector + activity */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Sector dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: sector?.color || riskColor || 'var(--color-border)' }}
            title={sector?.nameEN || 'Unknown sector'}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/vendors/${vendor.id}`}
                className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-[250px] lg:max-w-[350px]"
              >
                {toTitleCase(vendor.name)}
              </Link>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse shrink-0" title="Active (recent contracts)" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {sector && (
                <span className="text-xs font-medium" style={{ color: sector.color }}>
                  {sector.nameEN}
                </span>
              )}
              {vendor.first_contract_year && vendor.last_contract_year && (
                <span className="text-xs text-text-muted">
                  {vendor.first_contract_year === vendor.last_contract_year
                    ? vendor.first_contract_year
                    : `${vendor.first_contract_year}-${vendor.last_contract_year}`}
                </span>
              )}
              {avgContractSize >= 100_000_000 && (
                <span className="text-xs text-text-muted" title={`Avg contract: ${formatCompactMXN(avgContractSize)}`}>
                  avg {formatCompactMXN(avgContractSize)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Contracts */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs tabular-nums text-text-primary font-medium">
          {formatNumber(vendor.total_contracts)}
        </span>
      </td>

      {/* Value */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs tabular-nums text-text-primary font-medium">
          {formatCompactMXN(vendor.total_value_mxn)}
        </span>
      </td>

      {/* Risk — show score as bar + number, not just a badge */}
      <td className="px-3 py-2 text-right">
        {vendor.avg_risk_score != null ? (
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-10 h-1.5 rounded-full bg-border/40 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(vendor.avg_risk_score * 100, 100)}%`,
                  backgroundColor: riskColor,
                }}
              />
            </div>
            <span className="text-xs tabular-nums font-semibold w-8 text-right" style={{ color: riskColor }}>
              {(vendor.avg_risk_score * 100).toFixed(0)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-muted">-</span>
        )}
      </td>

      {/* Direct Award % — mini bar */}
      <td className="px-3 py-2 text-right hidden lg:table-cell">
        <MiniBar pct={vendor.direct_award_pct / 100} color={daColor} />
      </td>

      {/* Single Bid % */}
      <td className="px-3 py-2 text-right hidden xl:table-cell">
        <span className="text-xs tabular-nums" style={{ color: sbColor }}>
          {vendor.single_bid_pct < 1 && vendor.single_bid_pct > 0
            ? `${vendor.single_bid_pct.toFixed(1)}%`
            : `${vendor.single_bid_pct.toFixed(0)}%`}
        </span>
      </td>

      {/* High Risk % */}
      <td className="px-3 py-2 text-right hidden lg:table-cell">
        <span className="text-xs tabular-nums font-medium" style={{ color: hrColor }}>
          {vendor.high_risk_pct < 1 && vendor.high_risk_pct > 0
            ? `${vendor.high_risk_pct.toFixed(1)}%`
            : `${vendor.high_risk_pct.toFixed(0)}%`}
        </span>
      </td>

      {/* Anomaly % */}
      <td className="px-3 py-2 text-right hidden xl:table-cell">
        {vendor.pct_anomalous != null ? (
          <span className="text-xs tabular-nums" style={{ color: anomColor }}>
            {vendor.pct_anomalous.toFixed(0)}%
          </span>
        ) : (
          <span className="text-xs text-text-muted">-</span>
        )}
      </td>

      {/* Arrow */}
      <td className="px-2 py-2 text-right">
        <Link
          to={`/vendors/${vendor.id}`}
          className="text-text-muted group-hover:text-accent transition-colors"
          aria-label={`View ${toTitleCase(vendor.name)} details`}
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}
