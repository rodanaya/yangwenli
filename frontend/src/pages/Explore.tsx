/**
 * Explore Page
 * Unified data browser with 3 tabs: Vendors, Institutions, and Trends
 * Combines the full functionality of the former Vendors, Institutions, and Timeline pages.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  cn,
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
  toTitleCase,
  getRiskLevel,
} from '@/lib/utils'
import { RISK_COLORS, SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { vendorApi, institutionApi, analysisApi, sectorApi } from '@/api/client'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import type {
  VendorFilterParams,
  VendorListItem,
  InstitutionFilterParams,
  InstitutionResponse,
} from '@/api/types'
import {
  Compass,
  Users,
  Building2,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserX,
  Building,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flag,
  Clock,
  BarChart3,
  Crown,
  Flame,
  Zap,
  Target,
  X,
  Landmark,
  Banknote,
  FileSearch,
  Heart,
  GraduationCap,
  Scale,
  Shield,
  Factory,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
  Bar,
  Line,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts'

// =============================================================================
// Tab Configuration
// =============================================================================

const TABS = [
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'institutions', label: 'Institutions', icon: Building2 },
  { id: 'trends', label: 'Trends', icon: Calendar },
] as const

type TabId = (typeof TABS)[number]['id']

// =============================================================================
// Explore Page (Main Component)
// =============================================================================

export function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) || 'vendors'

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams]
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Compass className="h-4.5 w-4.5 text-accent" />
          Explore
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Browse vendors, institutions, and procurement trends
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border/50 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-accent border-accent'
                : 'text-text-muted border-transparent hover:text-text-primary'
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <tab.icon className="h-4 w-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content — only render the active tab */}
      {activeTab === 'vendors' && <VendorsTab />}
      {activeTab === 'institutions' && <InstitutionsTab />}
      {activeTab === 'trends' && <TrendsTab />}
    </div>
  )
}

// =============================================================================
// Vendors Tab
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

// Quick-access presets
const VENDOR_PRESETS = [
  { id: 'top-value', label: 'Top by Value', icon: Crown, sort: 'total_value_mxn', order: 'desc' as const, filters: { min_contracts: 10 } },
  { id: 'highest-risk', label: 'Highest Risk', icon: Flame, sort: 'avg_risk_score', order: 'desc' as const, filters: { min_contracts: 5 } },
  { id: 'most-direct', label: 'Most Direct Awards', icon: Zap, sort: 'direct_award_pct', order: 'desc' as const, filters: { min_contracts: 50 } },
  { id: 'most-flagged', label: 'Most Flagged', icon: AlertTriangle, sort: 'high_risk_pct', order: 'desc' as const, filters: { min_contracts: 20 } },
  { id: 'anomalous', label: 'Statistical Outliers', icon: Target, sort: 'pct_anomalous', order: 'desc' as const, filters: { min_contracts: 10 } },
  { id: 'big-players', label: 'Big Players (1K+)', icon: BarChart3, sort: 'total_contracts', order: 'desc' as const, filters: { min_contracts: 1000 } },
] as const

function VendorsTab() {
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
                <th className="w-8 px-2 py-2 text-[10px] font-semibold text-text-muted text-center">#</th>
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

// Compact stat pill for summary strip
function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-text-muted">{label}</span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

// Tiny inline bar for percentage columns
function MiniBar({ pct, color }: { pct: number; color: string }) {
  const clampedPct = Math.max(0, Math.min(1, pct))
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clampedPct * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>
        {(clampedPct * 100).toFixed(0)}%
      </span>
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
        <span className="text-[10px] tabular-nums text-text-muted">{rank}</span>
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
                <span className="text-[10px] font-medium" style={{ color: sector.color }}>
                  {sector.nameEN}
                </span>
              )}
              {vendor.first_contract_year && vendor.last_contract_year && (
                <span className="text-[10px] text-text-muted">
                  {vendor.first_contract_year === vendor.last_contract_year
                    ? vendor.first_contract_year
                    : `${vendor.first_contract_year}-${vendor.last_contract_year}`}
                </span>
              )}
              {avgContractSize >= 100_000_000 && (
                <span className="text-[10px] text-text-muted" title={`Avg contract: ${formatCompactMXN(avgContractSize)}`}>
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
          <span className="text-[10px] text-text-muted">-</span>
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
          <span className="text-[10px] text-text-muted">-</span>
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

// =============================================================================
// Institutions Tab
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

function InstitutionsTab() {
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

// =============================================================================
// Trends Tab
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2001, end: 2006, color: 'rgba(59,130,246,0.08)' },
  { name: 'Calderon', start: 2006, end: 2012, color: 'rgba(251,146,60,0.08)' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: 'rgba(248,113,113,0.08)' },
  { name: 'AMLO', start: 2018, end: 2024, color: 'rgba(74,222,128,0.08)' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: 'rgba(96,165,250,0.08)' },
]

// Event type → Lucide icon mapping (no emojis)
const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  election: Landmark,
  budget: Banknote,
  audit: FileSearch,
  crisis: AlertTriangle,
  anomaly: AlertCircle,
  milestone: Building2,
}

const EVENT_BORDER_COLORS: Record<string, string> = {
  election: 'border-l-[#be123c]',
  budget: 'border-l-[#16a34a]',
  audit: 'border-l-[#58a6ff]',
  crisis: 'border-l-[#fb923c]',
  anomaly: 'border-l-[#fb923c]',
  milestone: 'border-l-[#8b5cf6]',
}

function TrendsTab() {
  const [selectedYear, setSelectedYear] = useState(2024)

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch monthly breakdown
  const { data: monthlyBreakdown, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly-breakdown', selectedYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch all temporal events
  const { data: eventsData } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 60 * 60 * 1000,
  })

  // Fetch sector data for radar + bubble charts
  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ['sectors', 'all'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 10 * 60 * 1000,
  })

  const allEvents = eventsData?.events ?? []

  // Process timeline data — includes all 5 new fields from year-over-year API
  const timelineData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data.map((d: any) => ({
      year: d.year,
      contracts: d.contracts,
      value: d.total_value ?? d.value_mxn ?? 0,
      avgRisk: (d.avg_risk ?? 0) * 100,
      directAwardPct: d.direct_award_pct ?? 0,
      singleBidPct: d.single_bid_pct ?? 0,
      highRiskPct: d.high_risk_pct ?? 0,
      vendorCount: d.vendor_count ?? 0,
      institutionCount: d.institution_count ?? 0,
    }))
  }, [trends])

  // Selected year summary
  const selectedYearData = useMemo(() => {
    return timelineData.find((d) => d.year === selectedYear)
  }, [timelineData, selectedYear])

  // Year-over-year changes
  const yoyChanges = useMemo(() => {
    if (timelineData.length < 2) return null
    const currentIdx = timelineData.findIndex((d) => d.year === selectedYear)
    if (currentIdx < 1) return null
    const current = timelineData[currentIdx]
    const previous = timelineData[currentIdx - 1]
    return {
      contracts: ((current.contracts - previous.contracts) / previous.contracts) * 100,
      value: ((current.value - previous.value) / previous.value) * 100,
      avgRisk: current.avgRisk - previous.avgRisk,
    }
  }, [timelineData, selectedYear])

  // Events for selected year
  const yearEvents = useMemo(() => {
    return allEvents.filter((e) => e.year === selectedYear)
  }, [allEvents, selectedYear])

  // Election events for reference lines
  const electionEvents = useMemo(() => {
    return allEvents.filter((e) => e.type === 'election')
  }, [allEvents])

  const years = timelineData.map((d) => d.year).sort((a, b) => b - a)

  const currentAdmin = ADMINISTRATIONS.find(
    (a) => selectedYear >= a.start && selectedYear < a.end
  )

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    if (!monthlyBreakdown?.months) return []
    return monthlyBreakdown.months.map((m) => ({
      month: m.month,
      month_name: m.month_name,
      contracts: m.contracts,
      value: m.value,
      avg_risk: (m.avg_risk ?? 0) * 100,
      isYearEnd: m.is_year_end,
      direct_award_count: m.direct_award_count,
      single_bid_count: m.single_bid_count,
      da_pct: m.contracts > 0 ? ((m.direct_award_count ?? 0) / m.contracts) * 100 : 0,
    }))
  }, [monthlyBreakdown])

  // Radar chart data: top 6 sectors, 5 axes
  const radarData = useMemo(() => {
    if (!sectorData?.data) return { axes: [], sectors: [] }

    const top6 = [...sectorData.data]
      .sort((a, b) => b.total_contracts - a.total_contracts)
      .slice(0, 6)

    const maxAvgValue = Math.max(...top6.map((s) => s.avg_contract_value || 1))

    const axes = [
      { key: 'avgRisk', label: 'Avg Risk' },
      { key: 'highRiskPct', label: 'High Risk %' },
      { key: 'directAwardPct', label: 'Direct Award %' },
      { key: 'singleBidPct', label: 'Single Bid %' },
      { key: 'concentration', label: 'Concentration' },
    ]

    const sectors = top6.map((s) => ({
      code: s.sector_code,
      name: SECTORS.find((sec) => sec.id === s.sector_id)?.nameEN ?? s.sector_name,
      color: SECTOR_COLORS[s.sector_code] ?? '#64748b',
      values: {
        avgRisk: Math.min((s.avg_risk_score ?? 0) * 100, 100),
        highRiskPct: Math.min(s.high_risk_pct ?? 0, 100),
        directAwardPct: Math.min(s.direct_award_pct ?? 0, 100),
        singleBidPct: Math.min(s.single_bid_pct ?? 0, 100),
        concentration: Math.min(((s.avg_contract_value || 0) / maxAvgValue) * 100, 100),
      },
    }))

    const chartData = axes.map((axis) => {
      const point: Record<string, string | number> = { axis: axis.label }
      sectors.forEach((s) => {
        point[s.code] = Number(s.values[axis.key as keyof typeof s.values].toFixed(1))
      })
      return point
    })

    return { axes, sectors, chartData }
  }, [sectorData])

  // Sector bubble data for landscape scatter chart
  const sectorBubbleData = useMemo(() => {
    if (!sectorData?.data) return []
    const maxValue = Math.max(...sectorData.data.map((s) => s.total_value_mxn || 1))
    return sectorData.data.map((s) => ({
      name: SECTORS.find((sec) => sec.id === s.sector_id)?.nameEN ?? s.sector_name,
      code: s.sector_code,
      x: s.total_contracts,
      y: (s.avg_risk_score ?? 0) * 100,
      z: Math.max(((s.total_value_mxn || 0) / maxValue) * 800, 60),
      value: s.total_value_mxn,
      vendors: s.total_vendors,
      color: SECTOR_COLORS[s.sector_code] ?? '#64748b',
    }))
  }, [sectorData])

  return (
    <div className="space-y-4">
      {/* Year Selector + Admin Badge */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => Math.max(2002, y - 1))}
              disabled={selectedYear <= 2002}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-thin">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="min-w-[52px] h-7 text-xs"
                >
                  {year}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => Math.min(2025, y + 1))}
              disabled={selectedYear >= 2025}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {currentAdmin && (
            <div className="flex items-center justify-center mt-1.5">
              <Badge variant="outline" className="text-[10px] text-text-muted border-border">
                {currentAdmin.name} Administration ({currentAdmin.start}-{currentAdmin.end})
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat Pills */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm font-mono">
        <span className="font-semibold">
          {selectedYearData ? formatNumber(selectedYearData.contracts) : '--'}{' '}
          <span className="text-text-muted font-normal">contracts</span>
        </span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="font-semibold">
          {selectedYearData ? formatCompactMXN(selectedYearData.value) : '--'}
          {selectedYearData && (
            <span className="text-text-muted font-normal text-xs ml-1">
              (~{formatCompactUSD(selectedYearData.value, selectedYear)})
            </span>
          )}
        </span>
        <span className="text-border hidden sm:inline">|</span>
        <span className="font-semibold">
          Avg risk{' '}
          <span className={selectedYearData && selectedYearData.avgRisk > 15 ? 'text-risk-high' : ''}>
            {selectedYearData ? `${selectedYearData.avgRisk.toFixed(1)}%` : '--'}
          </span>
        </span>
        {selectedYearData && (
          <>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-text-muted font-normal text-xs">
              DA {selectedYearData.directAwardPct.toFixed(0)}%
            </span>
            <span className="text-border hidden md:inline">|</span>
            <span className="text-text-muted font-normal text-xs hidden md:inline">
              SB {selectedYearData.singleBidPct.toFixed(0)}%
            </span>
            <span className="text-border hidden lg:inline">|</span>
            <span className="text-text-muted font-normal text-xs hidden lg:inline">
              {formatNumber(selectedYearData.vendorCount)} vendors
            </span>
          </>
        )}
        {yoyChanges && (
          <>
            <span className="text-border hidden sm:inline">|</span>
            <span
              className={`flex items-center gap-0.5 ${yoyChanges.avgRisk <= 0 ? 'text-risk-low' : 'text-risk-high'}`}
            >
              {yoyChanges.avgRisk <= 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {yoyChanges.avgRisk >= 0 ? '+' : ''}
              {yoyChanges.avgRisk.toFixed(1)} pts YoY
            </span>
          </>
        )}
      </div>

      {/* Row 1: Historical Trends + Procurement Health Indicators */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 1: Historical Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historical Trends
            </CardTitle>
            <CardDescription className="text-xs">
              Contract volume and avg risk, 2002-2025
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 50]}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium">{data.year}</p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.contracts)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Value: {formatCompactMXN(data.value)}
                              </p>
                              <p className="text-xs text-text-muted">
                                ~{formatCompactUSD(data.value, data.year)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Avg Risk: {data.avgRisk.toFixed(1)}%
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    {ADMINISTRATIONS.map((admin) => (
                      <ReferenceArea
                        key={admin.name}
                        x1={admin.start}
                        x2={admin.end}
                        yAxisId="left"
                        fill={admin.color}
                        fillOpacity={1}
                        label={{
                          value: admin.name,
                          position: 'insideTopLeft',
                          style: { fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)' },
                        }}
                      />
                    ))}
                    {electionEvents.map((event) => (
                      <ReferenceLine
                        key={event.id}
                        x={event.year}
                        stroke={RISK_COLORS.high}
                        strokeDasharray="3 3"
                        yAxisId="left"
                      />
                    ))}
                    <ReferenceLine
                      x={2010}
                      yAxisId="left"
                      stroke="var(--color-text-muted)"
                      strokeDasharray="4 2"
                      strokeOpacity={0.5}
                      label={{
                        value: 'Bundled data',
                        position: 'insideTopRight',
                        style: { fill: 'var(--color-text-muted)', fontSize: 8, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="contracts"
                      fill="var(--color-accent)"
                      opacity={0.7}
                      radius={[2, 2, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgRisk"
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Procurement Health Indicators */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Procurement Health Indicators
            </CardTitle>
            <CardDescription className="text-xs">
              Direct award %, single bid %, and high-risk % over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData}>
                    <defs>
                      <linearGradient id="gradDA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium">{data.year}</p>
                              <p className="text-xs" style={{ color: '#58a6ff' }}>
                                Direct Award: {data.directAwardPct.toFixed(1)}%
                              </p>
                              <p className="text-xs" style={{ color: RISK_COLORS.medium }}>
                                Single Bid: {data.singleBidPct.toFixed(1)}%
                              </p>
                              <p className="text-xs" style={{ color: RISK_COLORS.high }}>
                                High Risk: {data.highRiskPct.toFixed(1)}%
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="directAwardPct"
                      stroke="#58a6ff"
                      strokeWidth={1.5}
                      fill="url(#gradDA)"
                      name="Direct Award %"
                    />
                    <Line
                      type="monotone"
                      dataKey="singleBidPct"
                      stroke={RISK_COLORS.medium}
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      name="Single Bid %"
                    />
                    <Line
                      type="monotone"
                      dataKey="highRiskPct"
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      dot={false}
                      name="High Risk %"
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      iconSize={10}
                      wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Sector Risk DNA Radar + Sector Landscape Bubble */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 3: Sector Risk DNA Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Sector Risk DNA
            </CardTitle>
            <CardDescription className="text-xs">
              Top 6 sectors across 5 risk dimensions (0-100)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : radarData.chartData && radarData.sectors ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData.chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--color-border)" opacity={0.4} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                      tickCount={4}
                    />
                    {radarData.sectors.map((sector) => (
                      <Radar
                        key={sector.code}
                        name={sector.name}
                        dataKey={sector.code}
                        stroke={sector.color}
                        fill={sector.color}
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                      />
                    ))}
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs mb-1">{label}</p>
                              {payload.map((p: any) => (
                                <p
                                  key={p.name}
                                  className="text-xs flex items-center gap-1.5"
                                  style={{ color: p.color }}
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  {p.name}: {p.value}
                                </p>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 -mt-2">
                  {radarData.sectors.map((s) => (
                    <span key={s.code} className="flex items-center gap-1 text-[10px] text-text-muted">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">No sector data</p>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Sector Landscape Bubble */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Sector Landscape
            </CardTitle>
            <CardDescription className="text-xs">
              Contracts vs avg risk per sector (bubble size = total value)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sectorLoading ? (
              <Skeleton className="h-[300px]" />
            ) : sectorBubbleData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Contracts"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                      label={{ value: 'Contracts', position: 'insideBottom', offset: -10, style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Avg Risk %"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      label={{ value: 'Avg Risk %', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 800]} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs" style={{ color: data.color }}>
                                {data.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.x)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Avg Risk: {data.y.toFixed(1)}%
                              </p>
                              <p className="text-xs text-text-muted">
                                Value: {formatCompactMXN(data.value)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Vendors: {formatNumber(data.vendors)}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter data={sectorBubbleData} fill="#58a6ff">
                      {sectorBubbleData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={1} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 -mt-1">
                  {sectorBubbleData.map((s) => (
                    <span key={s.code} className="flex items-center gap-1 text-[10px] text-text-muted">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">No sector data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Monthly Patterns + Market Structure */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 5: Monthly Patterns */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {selectedYear} Monthly Patterns
            </CardTitle>
            <CardDescription className="text-xs">
              Volume, direct award %, and risk by month
              {monthlyBreakdown?.december_spike != null && (
                <span className="ml-1 text-risk-high">
                  (Dec spike: {monthlyBreakdown.december_spike.toFixed(1)}x)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[280px]" />
            ) : monthlyChartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(m) =>
                        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
                      }
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium text-xs">
                                {data.month_name} {selectedYear}
                              </p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.contracts)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Value: {formatCompactMXN(data.value)}
                              </p>
                              <p className="text-xs text-text-muted">
                                DA%: {data.da_pct.toFixed(1)}%
                              </p>
                              <p className="text-xs text-text-muted">
                                Avg Risk: {data.avg_risk.toFixed(1)}%
                              </p>
                              {data.isYearEnd && (
                                <p className="text-xs text-risk-high mt-1">Year-end spending</p>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar yAxisId="left" dataKey="contracts" radius={[2, 2, 0, 0]}>
                      {monthlyChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.isYearEnd ? RISK_COLORS.high : 'var(--color-accent)'}
                          opacity={0.7}
                        />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="da_pct"
                      stroke="var(--color-text-muted)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      name="DA%"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_risk"
                      stroke={RISK_COLORS.high}
                      strokeWidth={2}
                      dot={false}
                      name="Avg Risk"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-12">
                No monthly data for {selectedYear}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chart 6: Market Structure */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Market Structure
            </CardTitle>
            <CardDescription className="text-xs">
              Vendor and institution counts over time (market fragmentation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="font-medium">{data.year}</p>
                              <p className="text-xs" style={{ color: '#58a6ff' }}>
                                Vendors: {formatNumber(data.vendorCount)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Institutions: {formatNumber(data.institutionCount)}
                              </p>
                              <p className="text-xs text-text-muted">
                                Contracts: {formatNumber(data.contracts)}
                              </p>
                              {data.vendorCount > 0 && (
                                <p className="text-xs text-text-muted">
                                  Contracts/vendor: {(data.contracts / data.vendorCount).toFixed(1)}
                                </p>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendorCount"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      dot={false}
                      name="Vendors"
                    />
                    <Line
                      type="monotone"
                      dataKey="institutionCount"
                      stroke="var(--color-text-muted)"
                      strokeWidth={1.5}
                      dot={false}
                      name="Institutions"
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      iconSize={10}
                      wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Footer — compressed horizontal */}
      {allEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5 text-text-muted">
              <Flag className="h-3.5 w-3.5" />
              Key Events
              {yearEvents.length > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
                  {yearEvents.length} in {selectedYear}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="max-h-[140px]">
              <div className="space-y-1.5">
                {yearEvents.map((event) => {
                  const IconComp = EVENT_ICONS[event.type] ?? Flag
                  const borderClass = EVENT_BORDER_COLORS[event.type] ?? 'border-l-[#58a6ff]'
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'pl-3 py-1.5 border-l-2 rounded-r',
                        borderClass,
                        event.impact === 'high' && 'bg-background-elevated/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <IconComp className="h-3 w-3 text-text-muted shrink-0" />
                        <span className="text-xs font-medium truncate">{event.title}</span>
                        {event.impact === 'high' && (
                          <Badge
                            variant="outline"
                            className="text-[8px] px-1 py-0 bg-risk-high/10 border-risk-high/30 text-risk-high shrink-0"
                          >
                            High
                          </Badge>
                        )}
                        <span className="text-[10px] text-text-muted shrink-0 ml-auto">{event.date}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 pl-5 line-clamp-1">{event.description}</p>
                    </div>
                  )
                })}
                {yearEvents.length === 0 && (
                  <p className="text-[10px] text-text-muted text-center py-2">
                    No events for {selectedYear}
                  </p>
                )}
                {/* Other years — horizontal compact */}
                {allEvents.filter((e) => e.year !== selectedYear).length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border/50">
                    <div className="flex flex-wrap gap-1">
                      {allEvents
                        .filter((e) => e.year !== selectedYear)
                        .slice(0, 8)
                        .map((event) => {
                          const IconComp = EVENT_ICONS[event.type] ?? Flag
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedYear(event.year)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-muted hover:bg-background-elevated transition-colors border border-border/30"
                            >
                              <IconComp className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{event.title}</span>
                              <span className="font-mono">{event.year}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default Explore
