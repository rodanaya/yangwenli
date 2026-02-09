import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { cn, formatCompactMXN, formatNumber, formatPercentSafe, toTitleCase, formatCompactUSD, getRiskLevel } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { vendorApi } from '@/api/client'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import type { VendorFilterParams, VendorListItem, VendorTopItem } from '@/api/types'
import { Users, Search, ChevronLeft, ChevronRight, ExternalLink, Loader2, AlertCircle, RefreshCw, UserX, LayoutGrid, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'

export function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Debounced search - reduces API calls from 13+ to 1 per search term
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  const filters: VendorFilterParams = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    search: debouncedSearch || undefined,
    risk_level: searchParams.get('risk_level') as VendorFilterParams['risk_level'],
    min_contracts: searchParams.get('min_contracts') ? Number(searchParams.get('min_contracts')) : undefined,
  }), [searchParams, debouncedSearch])

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
  })

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error('Failed to load vendors', (error as Error).message)
    }
  }, [error, toast])

  const updateFilter = useCallback((key: string, value: string | number | undefined) => {
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
    setSearchParams(newParams)
  }, [searchParams, setSearchParams, setSearchInput])

  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)

  const hasNoFilters = !filters.search && !filters.risk_level && !filters.min_contracts

  // Combined featured strips query (3 calls -> 1)
  const { data: topAll, isLoading: isLoadingTopAll } = useQuery({
    queryKey: ['vendors-top-all', 5],
    queryFn: () => vendorApi.getTopAll(5),
    enabled: hasNoFilters,
    staleTime: 5 * 60 * 1000,
  })
  const topRisk = topAll ? { data: topAll.risk } : undefined
  const topValue = topAll ? { data: topAll.value } : undefined
  const topCount = topAll ? { data: topAll.count } : undefined
  const isLoadingRisk = isLoadingTopAll
  const isLoadingValue = isLoadingTopAll
  const isLoadingCount = isLoadingTopAll

  // View mode: grid (default) or triage
  const [viewMode, setViewMode] = useState<'grid' | 'triage'>(
    searchParams.get('view') === 'triage' ? 'triage' : 'grid'
  )

  // Triage view data (cached so toggling grid/triage doesn't re-fetch)
  const { data: criticalVendors, isLoading: criticalLoading } = useQuery({
    queryKey: ['vendors', 'triage', 'critical'],
    queryFn: () => vendorApi.getAll({ risk_level: 'critical', per_page: 10, sort_by: 'total_value', sort_order: 'desc' }),
    enabled: viewMode === 'triage',
    staleTime: 5 * 60 * 1000,
  })
  const { data: highRiskVendors, isLoading: highLoading } = useQuery({
    queryKey: ['vendors', 'triage', 'high'],
    queryFn: () => vendorApi.getAll({ risk_level: 'high', per_page: 10, sort_by: 'total_value', sort_order: 'desc' }),
    enabled: viewMode === 'triage',
    staleTime: 5 * 60 * 1000,
  })
  const { data: topVolumeVendors, isLoading: volumeLoading } = useQuery({
    queryKey: ['vendors', 'triage', 'volume'],
    queryFn: () => vendorApi.getTop('value', 10),
    enabled: viewMode === 'triage',
    staleTime: 5 * 60 * 1000,
  })

  // Triage collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    critical: true,
    high: false,
    volume: false,
  })
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-accent" />
            Vendors
          </h2>
          <p className="text-xs text-text-muted mt-0.5" aria-live="polite">
            {data ? `${formatNumber(data.pagination.total)} registered suppliers` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary'
              )}
              onClick={() => { setViewMode('grid'); const p = new URLSearchParams(searchParams); p.delete('view'); setSearchParams(p) }}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border',
                viewMode === 'triage' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary'
              )}
              onClick={() => { setViewMode('triage'); const p = new URLSearchParams(searchParams); p.set('view', 'triage'); setSearchParams(p) }}
              aria-label="Triage view"
              aria-pressed={viewMode === 'triage'}
            >
              <Layers className="h-3.5 w-3.5" />
              Triage
            </button>
          </div>

          {/* Search input with debouncing */}
          <div className="relative">
            {showSearchLoading ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            )}
            <input
              type="text"
              placeholder="Search vendors..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search vendors by name or RFC"
            />
          </div>

          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm"
            value={filters.risk_level || ''}
            onChange={(e) => updateFilter('risk_level', e.target.value || undefined)}
            aria-label="Filter by risk level"
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm"
            value={filters.min_contracts || ''}
            onChange={(e) => updateFilter('min_contracts', e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Filter by minimum contract count"
          >
            <option value="">Any Contracts</option>
            <option value="10">10+ contracts</option>
            <option value="50">50+ contracts</option>
            <option value="100">100+ contracts</option>
            <option value="500">500+ contracts</option>
          </select>
        </div>
      </div>

      {/* Featured strip — only visible when no filters are active */}
      {hasNoFilters && (
        <FeaturedStrip
          topRisk={topRisk?.data}
          topValue={topValue?.data}
          topCount={topCount?.data}
          isLoadingRisk={isLoadingRisk}
          isLoadingValue={isLoadingValue}
          isLoadingCount={isLoadingCount}
        />
      )}

      {/* Triage view */}
      {viewMode === 'triage' ? (
        <div className="space-y-4">
          <TriageSection
            title="Critical Risk Vendors"
            color="var(--color-risk-critical, #dc2626)"
            count={criticalVendors?.pagination?.total}
            loading={criticalLoading}
            expanded={expandedSections.critical}
            onToggle={() => toggleSection('critical')}
            vendors={criticalVendors?.data || []}
            onViewAll={() => { updateFilter('risk_level', 'critical'); setViewMode('grid') }}
          />
          <TriageSection
            title="High Risk Vendors"
            color="var(--color-risk-high, #ea580c)"
            count={highRiskVendors?.pagination?.total}
            loading={highLoading}
            expanded={expandedSections.high}
            onToggle={() => toggleSection('high')}
            vendors={highRiskVendors?.data || []}
            onViewAll={() => { updateFilter('risk_level', 'high'); setViewMode('grid') }}
          />
          <TriageSection
            title="Top Volume Vendors"
            color="var(--color-accent, #58a6ff)"
            count={topVolumeVendors?.data?.length}
            loading={volumeLoading}
            expanded={expandedSections.volume}
            onToggle={() => toggleSection('volume')}
            vendors={(topVolumeVendors?.data || []).map(v => ({
              id: v.vendor_id,
              name: v.vendor_name,
              total_contracts: v.total_contracts,
              total_value_mxn: v.total_value_mxn,
              avg_risk_score: v.avg_risk_score ?? null,
              direct_award_pct: 0,
              high_risk_pct: 0,
            })) as VendorListItem[]}
            onViewAll={() => { setViewMode('grid') }}
          />
        </div>
      ) : (
        <>
          {/* Vendors grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-risk-high mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load vendors</h3>
                <p className="text-sm text-text-muted mb-4">
                  {(error as Error).message === 'Network Error'
                    ? 'Unable to connect to server. Please check if the backend is running.'
                    : (error as Error).message || 'An unexpected error occurred.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : !data?.data?.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UserX className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No vendors found</h3>
                <p className="text-sm text-text-muted mb-4">
                  {filters.search || filters.risk_level || filters.min_contracts
                    ? 'Try adjusting your filters to see more results.'
                    : 'No vendors are available in the database.'}
                </p>
                {(filters.search || filters.risk_level || filters.min_contracts) && (
                  <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.data.map((vendor, index) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  style={{ animationDelay: `${index * 30}ms` }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                Showing {(filters.page! - 1) * filters.per_page! + 1} -{' '}
                {Math.min(filters.page! * filters.per_page!, data.pagination.total)} of{' '}
                {formatNumber(data.pagination.total)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => updateFilter('page', filters.page! - 1)}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-text-muted">
                  Page {filters.page} of {data.pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === data.pagination.total_pages}
                  onClick={() => updateFilter('page', filters.page! + 1)}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TriageSection({ title, color, count, loading, expanded, onToggle, vendors, onViewAll }: {
  title: string
  color: string
  count?: number
  loading: boolean
  expanded: boolean
  onToggle: () => void
  vendors: VendorListItem[]
  onViewAll: () => void
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-accent/5 transition-colors"
        onClick={onToggle}
        style={{ borderLeft: `3px solid ${color}` }}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background-elevated text-text-muted tabular-nums">
            {formatNumber(count)}
          </span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </button>
      {expanded && (
        <div className="border-t border-border p-3">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No vendors found</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {vendors.slice(0, 9).map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>
              {count && count > 9 && (
                <button
                  className="mt-3 text-xs text-accent hover:underline font-medium"
                  onClick={onViewAll}
                >
                  View all {formatNumber(count)} vendors &rarr;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface FeaturedStripProps {
  topRisk?: VendorTopItem[]
  topValue?: VendorTopItem[]
  topCount?: VendorTopItem[]
  isLoadingRisk: boolean
  isLoadingValue: boolean
  isLoadingCount: boolean
}

function FeaturedStrip({ topRisk, topValue, topCount, isLoadingRisk, isLoadingValue, isLoadingCount }: FeaturedStripProps) {
  const sections: { label: string; data?: VendorTopItem[]; isLoading: boolean }[] = [
    { label: 'HIGHEST RISK', data: topRisk, isLoading: isLoadingRisk },
    { label: 'BIGGEST SPENDERS', data: topValue, isLoading: isLoadingValue },
    { label: 'MOST ACTIVE', data: topCount, isLoading: isLoadingCount },
  ]

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted font-[var(--font-family-mono)]">
            {section.label}
          </span>
          <div className="mt-1.5 flex gap-3 overflow-x-auto pb-2">
            {section.isLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-64 flex-shrink-0" />
              ))
            ) : section.data?.length ? (
              section.data.map((vendor) => (
                <Link
                  key={vendor.vendor_id}
                  to={`/vendors/${vendor.vendor_id}`}
                  className="w-64 flex-shrink-0"
                >
                  <Card className="h-full hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium line-clamp-1 flex-1 mr-2">
                          {toTitleCase(vendor.vendor_name)}
                        </span>
                        {vendor.avg_risk_score != null && (
                          <RiskBadge score={vendor.avg_risk_score} />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</span>
                        <span className="tabular-nums">{formatNumber(vendor.total_contracts)} contracts</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function VendorCard({ vendor, style }: { vendor: VendorListItem; style?: React.CSSProperties }) {
  // Prefetch vendor details on hover for instant page transitions
  const prefetch = usePrefetchOnHover({
    queryKey: ['vendor', vendor.id],
    queryFn: () => vendorApi.getById(vendor.id),
    delay: 150,
  })

  return (
    <Card
      className="border-l-4 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 animate-slide-up opacity-0 group"
      style={{
        ...style,
        borderLeftColor: vendor.avg_risk_score != null
          ? RISK_COLORS[getRiskLevel(vendor.avg_risk_score)]
          : 'var(--color-border)',
      }}
      role="article"
      aria-label={toTitleCase(vendor.name)}
      {...prefetch}
    >
      <CardContent className="p-4 group-hover:bg-accent/[0.02] transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <Link
                to={`/vendors/${vendor.id}`}
                className="text-sm font-medium hover:text-accent transition-colors line-clamp-1"
              >
                {toTitleCase(vendor.name)}
              </Link>
              {vendor.rfc && <p className="text-xs text-text-muted font-mono">{vendor.rfc}</p>}
            </div>
          </div>
          {vendor.avg_risk_score !== undefined && vendor.avg_risk_score !== null && (
            <RiskBadge score={vendor.avg_risk_score} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-text-muted text-xs">Contracts</p>
            <p className="font-medium tabular-nums">{formatNumber(vendor.total_contracts)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Total Value</p>
            <p className="font-medium tabular-nums">
              {formatCompactMXN(vendor.total_value_mxn)}
              <span className="text-[10px] text-text-muted ml-1">({formatCompactUSD(vendor.total_value_mxn)})</span>
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Direct Awards</p>
            <p className="font-medium tabular-nums">{formatPercentSafe(vendor.direct_award_pct, false)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">High Risk</p>
            <p className="font-medium tabular-nums">{formatPercentSafe(vendor.high_risk_pct, false)}</p>
          </div>
        </div>

        {vendor.first_contract_year && vendor.last_contract_year && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span>
                {vendor.first_contract_year} - {vendor.last_contract_year}
              </span>
              {/* Activity status badge */}
              {(() => {
                const currentYear = new Date().getFullYear()
                const yearsInactive = currentYear - vendor.last_contract_year
                if (yearsInactive <= 1) {
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-risk-low/20 text-risk-low">
                      <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" aria-hidden="true" />
                      Active
                    </span>
                  )
                } else if (yearsInactive <= 3) {
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-risk-medium/20 text-risk-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-risk-medium" aria-hidden="true" />
                      Dormant
                    </span>
                  )
                } else {
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-background-elevated text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" aria-hidden="true" />
                      Inactive
                    </span>
                  )
                }
              })()}
            </div>
            <Link
              to={`/vendors/${vendor.id}`}
              className="flex items-center gap-1 text-accent hover:underline"
            >
              View details
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Vendors
