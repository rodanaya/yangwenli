/**
 * Explore Page
 * Unified data browser with 3 tabs: Vendors, Institutions, and Trends
 * Combines the full functionality of the former Vendors, Institutions, and Timeline pages.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge, RiskBadge } from '@/components/ui/badge'
import {
  cn,
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
  formatPercentSafe,
  toTitleCase,
  getRiskLevel,
} from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { vendorApi, institutionApi, analysisApi } from '@/api/client'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import type {
  VendorFilterParams,
  VendorListItem,
  VendorTopItem,
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
  LayoutGrid,
  Layers,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flag,
  Clock,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { InlineNarrative } from '@/components/NarrativeCard'
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

function VendorsTab() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Debounced search
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  const filters: VendorFilterParams = useMemo(
    () => ({
      page: Number(searchParams.get('page')) || 1,
      per_page: Number(searchParams.get('per_page')) || 50,
      search: debouncedSearch || undefined,
      risk_level: searchParams.get('risk_level') as VendorFilterParams['risk_level'],
      min_contracts: searchParams.get('min_contracts')
        ? Number(searchParams.get('min_contracts'))
        : undefined,
    }),
    [searchParams, debouncedSearch]
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

  // Triage view data
  const { data: criticalVendors, isLoading: criticalLoading } = useQuery({
    queryKey: ['vendors', 'triage', 'critical'],
    queryFn: () =>
      vendorApi.getAll({
        risk_level: 'critical',
        per_page: 10,
        sort_by: 'total_value',
        sort_order: 'desc',
      }),
    enabled: viewMode === 'triage',
    staleTime: 5 * 60 * 1000,
  })
  const { data: highRiskVendors, isLoading: highLoading } = useQuery({
    queryKey: ['vendors', 'triage', 'high'],
    queryFn: () =>
      vendorApi.getAll({
        risk_level: 'high',
        per_page: 10,
        sort_by: 'total_value',
        sort_order: 'desc',
      }),
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
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            Vendors
          </h3>
          <p className="text-xs text-text-muted mt-0.5" aria-live="polite">
            {data
              ? `${formatNumber(data.pagination.total)} registered suppliers`
              : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              )}
              onClick={() => {
                setViewMode('grid')
                const p = new URLSearchParams(searchParams)
                p.delete('view')
                setSearchParams(p)
              }}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border',
                viewMode === 'triage'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              )}
              onClick={() => {
                setViewMode('triage')
                const p = new URLSearchParams(searchParams)
                p.set('view', 'triage')
                setSearchParams(p)
              }}
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
            onChange={(e) =>
              updateFilter(
                'min_contracts',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
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

      {/* Featured strip -- only visible when no filters are active */}
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
            onViewAll={() => {
              updateFilter('risk_level', 'critical')
              setViewMode('grid')
            }}
          />
          <TriageSection
            title="High Risk Vendors"
            color="var(--color-risk-high, #ea580c)"
            count={highRiskVendors?.pagination?.total}
            loading={highLoading}
            expanded={expandedSections.high}
            onToggle={() => toggleSection('high')}
            vendors={highRiskVendors?.data || []}
            onViewAll={() => {
              updateFilter('risk_level', 'high')
              setViewMode('grid')
            }}
          />
          <TriageSection
            title="Top Volume Vendors"
            color="var(--color-accent, #58a6ff)"
            count={topVolumeVendors?.data?.length}
            loading={volumeLoading}
            expanded={expandedSections.volume}
            onToggle={() => toggleSection('volume')}
            vendors={
              (topVolumeVendors?.data || []).map((v) => ({
                id: v.vendor_id,
                name: v.vendor_name,
                total_contracts: v.total_contracts,
                total_value_mxn: v.total_value_mxn,
                avg_risk_score: v.avg_risk_score ?? null,
                direct_award_pct: 0,
                high_risk_pct: 0,
              })) as VendorListItem[]
            }
            onViewAll={() => {
              setViewMode('grid')
            }}
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
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  Failed to load vendors
                </h3>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchParams({ tab: 'vendors' })}
                  >
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

// =============================================================================
// Vendor Sub-Components
// =============================================================================

function TriageSection({
  title,
  color,
  count,
  loading,
  expanded,
  onToggle,
  vendors,
  onViewAll,
}: {
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
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border p-3">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
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

const FEATURED_STRIP_DESCRIPTIONS: Record<string, string> = {
  'HIGHEST RISK': 'Vendors with the highest average risk scores across all their contracts.',
  'BIGGEST SPENDERS': 'Vendors receiving the most total procurement value.',
  'MOST ACTIVE': 'Vendors with the highest number of individual contracts.',
}

function FeaturedStrip({
  topRisk,
  topValue,
  topCount,
  isLoadingRisk,
  isLoadingValue,
  isLoadingCount,
}: FeaturedStripProps) {
  const sections: { label: string; data?: VendorTopItem[]; isLoading: boolean }[] = [
    { label: 'HIGHEST RISK', data: topRisk, isLoading: isLoadingRisk },
    { label: 'BIGGEST SPENDERS', data: topValue, isLoading: isLoadingValue },
    { label: 'MOST ACTIVE', data: topCount, isLoading: isLoadingCount },
  ]

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted font-[var(--font-family-mono)]">
              {section.label}
            </span>
            <span className="text-[10px] text-text-muted">
              {FEATURED_STRIP_DESCRIPTIONS[section.label]}
            </span>
          </div>
          <div className="mt-1.5 flex gap-3 overflow-x-auto pb-2">
            {section.isLoading
              ? [...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-64 flex-shrink-0" />
                ))
              : section.data?.length
                ? section.data.map((vendor) => (
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
                            <span className="tabular-nums">
                              {formatCompactMXN(vendor.total_value_mxn)}
                            </span>
                            <span className="tabular-nums">
                              {formatNumber(vendor.total_contracts)} contracts
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function VendorCard({
  vendor,
  style,
}: {
  vendor: VendorListItem
  style?: React.CSSProperties
}) {
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
        borderLeftColor:
          vendor.avg_risk_score != null
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
              <span className="text-[10px] text-text-muted ml-1">
                ({formatCompactUSD(vendor.total_value_mxn)})
              </span>
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Direct Awards</p>
            <p className="font-medium tabular-nums">
              {formatPercentSafe(vendor.direct_award_pct, false)}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs">High Risk</p>
            <p className="font-medium tabular-nums">
              {formatPercentSafe(vendor.high_risk_pct, false)}
            </p>
          </div>
        </div>

        {/* Inline narrative summary */}
        <VendorInlineSummary vendor={vendor} />

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
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse"
                        aria-hidden="true"
                      />
                      Active
                    </span>
                  )
                } else if (yearsInactive <= 3) {
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-risk-medium/20 text-risk-medium">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-risk-medium"
                        aria-hidden="true"
                      />
                      Dormant
                    </span>
                  )
                } else {
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-background-elevated text-text-muted">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-text-muted"
                        aria-hidden="true"
                      />
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

/** Builds a short inline narrative string for a vendor card */
function VendorInlineSummary({ vendor }: { vendor: VendorListItem }) {
  const parts: string[] = []

  // Size context
  if (vendor.total_contracts > 5000) parts.push('Major supplier')
  else if (vendor.total_contracts > 500) parts.push('Significant supplier')

  // High risk context
  if (vendor.high_risk_pct > 0.3) parts.push(`${(vendor.high_risk_pct * 100).toFixed(0)}% high-risk`)
  else if (vendor.high_risk_pct > 0.15) parts.push(`${(vendor.high_risk_pct * 100).toFixed(0)}% high-risk`)

  // Direct award context
  if (vendor.direct_award_pct > 0.7) parts.push('mostly direct awards')
  else if (vendor.direct_award_pct > 0.5) parts.push(`${(vendor.direct_award_pct * 100).toFixed(0)}% direct`)

  // Activity context
  if (vendor.first_contract_year && vendor.last_contract_year) {
    const years = vendor.last_contract_year - vendor.first_contract_year + 1
    if (years > 15) parts.push(`active ${years} years`)
    const currentYear = new Date().getFullYear()
    if (currentYear - vendor.last_contract_year > 3) parts.push('inactive')
  }

  if (parts.length === 0) return null
  const text = parts.join(', ') + '.'

  return (
    <div className="mt-2">
      <InlineNarrative text={text} />
    </div>
  )
}

// =============================================================================
// Institutions Tab
// =============================================================================

function InstitutionsTab() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Debounced search
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  const filters: InstitutionFilterParams = useMemo(
    () => ({
      page: Number(searchParams.get('page')) || 1,
      per_page: Number(searchParams.get('per_page')) || 50,
      search: debouncedSearch || undefined,
      institution_type: searchParams.get('type') || undefined,
    }),
    [searchParams, debouncedSearch]
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

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['institutions', filters],
    queryFn: () => institutionApi.getAll(filters),
    staleTime: 5 * 60 * 1000,
  })

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
        newParams.set('tab', 'institutions')
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams, setSearchInput]
  )

  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            Institutions
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {data
              ? `${formatNumber(data.pagination.total)} government entities`
              : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            {showSearchLoading ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            )}
            <input
              type="text"
              placeholder="Search institutions..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search institutions by name or abbreviation"
            />
          </div>

          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={filters.institution_type || ''}
            onChange={(e) => updateFilter('type', e.target.value || undefined)}
            aria-label="Filter by institution type"
          >
            <option value="">All Types</option>
            <option value="federal_secretariat">Federal Secretariat</option>
            <option value="decentralized_agency">Decentralized Agency</option>
            <option value="state_agency">State Agency</option>
            <option value="municipal">Municipal</option>
            <option value="health_institution">Health Institution</option>
            <option value="education_institution">Education Institution</option>
          </select>
        </div>
      </div>

      {/* Institutions grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-risk-high mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Failed to load institutions
            </h3>
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
            <Building className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No institutions found</h3>
            <p className="text-sm text-text-muted mb-4">
              {filters.search || filters.institution_type
                ? 'Try adjusting your filters to see more results.'
                : 'No institutions are available in the database.'}
            </p>
            {(filters.search || filters.institution_type) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({ tab: 'institutions' })}
              >
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((institution, index) => (
            <InstitutionCard
              key={institution.id}
              institution={institution}
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
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-muted">
              Page {filters.page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === data.pagination.total_pages}
              onClick={() => updateFilter('page', filters.page! + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Institution Sub-Components
// =============================================================================

function InstitutionCard({
  institution,
  style,
}: {
  institution: InstitutionResponse
  style?: React.CSSProperties
}) {
  // Prefetch institution details on hover for instant page transitions
  const prefetch = usePrefetchOnHover({
    queryKey: ['institution', institution.id],
    queryFn: () => institutionApi.getById(institution.id),
    delay: 150,
  })

  return (
    <Card
      className="hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 animate-slide-up opacity-0 group"
      style={style}
      {...prefetch}
    >
      <CardContent className="p-4 group-hover:bg-accent/[0.02] transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sector-gobernacion/10 text-sector-gobernacion">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <Link
                to={`/institutions/${institution.id}`}
                className="text-sm font-medium hover:text-accent transition-colors line-clamp-2"
              >
                {toTitleCase(institution.name)}
              </Link>
              {institution.siglas && (
                <p className="text-xs text-text-muted">{institution.siglas}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {institution.institution_type && (
            <Badge variant="secondary" className="text-[10px]">
              {institution.institution_type.replace(/_/g, ' ')}
            </Badge>
          )}
          {institution.size_tier && (
            <Badge variant="outline" className="text-[10px]">
              {institution.size_tier}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-text-muted text-xs">Contracts</p>
            <p className="font-medium tabular-nums">
              {formatNumber(institution.total_contracts || 0)}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Total Spending</p>
            <p className="font-medium tabular-nums">
              {formatCompactMXN(institution.total_amount_mxn || 0)}
            </p>
            <p className="text-[10px] text-text-muted tabular-nums">
              {formatCompactUSD(institution.total_amount_mxn || 0)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-end">
          <Link
            to={`/institutions/${institution.id}`}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
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

function TrendsTab() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly')

  // Fetch year-over-year trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch monthly breakdown for the selected year
  const { data: monthlyBreakdown, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly-breakdown', selectedYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear),
    enabled: viewMode === 'monthly',
    staleTime: 10 * 60 * 1000,
  })

  // Fetch all temporal events
  const { data: eventsData } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 60 * 60 * 1000,
  })

  const allEvents = eventsData?.events ?? []

  // Process timeline data from year-over-year API
  const timelineData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data.map((d: any) => ({
      year: d.year,
      contracts: d.contracts,
      value: d.total_value ?? d.value_mxn ?? 0,
      avgRisk: (d.avg_risk ?? 0) * 100,
    }))
  }, [trends])

  // Selected year summary from yearly data
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

  // Election events for reference lines on yearly chart
  const electionEvents = useMemo(() => {
    return allEvents.filter((e) => e.type === 'election')
  }, [allEvents])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'election':
        return '🗳️'
      case 'budget':
        return '💰'
      case 'audit':
        return '📋'
      case 'crisis':
        return '⚠️'
      case 'anomaly':
        return '⚠️'
      case 'milestone':
        return '🏛️'
      default:
        return '📌'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'election':
        return 'bg-sector-gobernacion/20 border-sector-gobernacion/30 text-sector-gobernacion'
      case 'budget':
        return 'bg-sector-hacienda/20 border-sector-hacienda/30 text-sector-hacienda'
      case 'audit':
        return 'bg-accent/20 border-accent/30 text-accent'
      case 'crisis':
        return 'bg-risk-high/20 border-risk-high/30 text-risk-high'
      case 'anomaly':
        return 'bg-risk-high/20 border-risk-high/30 text-risk-high'
      case 'milestone':
        return 'bg-sector-tecnologia/20 border-sector-tecnologia/30 text-sector-tecnologia'
      default:
        return 'bg-accent/20 border-accent/30 text-accent'
    }
  }

  const years = timelineData.map((d) => d.year).sort((a, b) => b - a)

  const currentAdmin = ADMINISTRATIONS.find(
    (a) => selectedYear >= a.start && selectedYear < a.end
  )

  // Monthly chart data from real API
  const monthlyChartData = useMemo(() => {
    if (!monthlyBreakdown?.months) return []
    return monthlyBreakdown.months.map((m) => ({
      month: m.month,
      month_name: m.month_name,
      contracts: m.contracts,
      value: m.value,
      avg_risk: m.avg_risk,
      isYearEnd: m.is_year_end,
      direct_award_count: m.direct_award_count,
      single_bid_count: m.single_bid_count,
    }))
  }, [monthlyBreakdown])

  const isMonthlyChartLoading = viewMode === 'monthly' && monthlyLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            Trends
          </h3>
          <p className="text-xs text-text-muted">
            Temporal patterns in procurement activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'yearly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('yearly')}
          >
            Yearly
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => Math.max(2002, y - 1))}
              disabled={selectedYear <= 2002}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="min-w-[60px]"
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
            <div className="flex items-center justify-center mt-2">
              <Badge variant="outline" className="text-xs text-text-muted border-border">
                {currentAdmin.name} Administration ({currentAdmin.start}-{currentAdmin.end})
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Contracts</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? formatNumber(selectedYearData.contracts) : '-'}
                </p>
                {yoyChanges && (
                  <p
                    className={`text-xs flex items-center gap-1 ${yoyChanges.contracts >= 0 ? 'text-risk-low' : 'text-risk-high'}`}
                  >
                    {yoyChanges.contracts >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(yoyChanges.contracts).toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <BarChart3 className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Total Value</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? formatCompactMXN(selectedYearData.value) : '-'}
                </p>
                {selectedYearData && (
                  <p className="text-xs text-text-muted">
                    ~{formatCompactUSD(selectedYearData.value, selectedYear)}
                  </p>
                )}
                {yoyChanges && (
                  <p
                    className={`text-xs flex items-center gap-1 ${yoyChanges.value >= 0 ? 'text-risk-low' : 'text-risk-high'}`}
                  >
                    {yoyChanges.value >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(yoyChanges.value).toFixed(1)}% YoY
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Avg Risk</p>
                <p className="text-2xl font-bold">
                  {selectedYearData ? `${selectedYearData.avgRisk.toFixed(1)}%` : '-'}
                </p>
                {yoyChanges && (
                  <p
                    className={`text-xs flex items-center gap-1 ${yoyChanges.avgRisk <= 0 ? 'text-risk-low' : 'text-risk-high'}`}
                  >
                    {yoyChanges.avgRisk <= 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {yoyChanges.avgRisk >= 0 ? '+' : ''}
                    {yoyChanges.avgRisk.toFixed(1)} pts
                  </p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Key Events</p>
                <p className="text-2xl font-bold">{yearEvents.length}</p>
                <p className="text-xs text-text-muted">
                  {yearEvents.filter((e) => e.impact === 'high').length} high impact
                </p>
              </div>
              <Flag className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {viewMode === 'yearly'
                ? 'Historical Trends'
                : `${selectedYear} Monthly Breakdown`}
            </CardTitle>
            <CardDescription className="text-xs">
              {viewMode === 'yearly'
                ? 'Contract volume and average risk over time'
                : `Real monthly contract data for ${selectedYear}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading || isMonthlyChartLoading ? (
              <Skeleton className="h-[350px]" />
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'yearly' ? (
                    <ComposedChart data={timelineData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
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
                      {/* Presidential administration bands */}
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
                            style: {
                              fill: 'var(--color-text-muted)',
                              fontSize: 9,
                              fontFamily: 'var(--font-mono)',
                            },
                          }}
                        />
                      ))}
                      {/* Mark election years */}
                      {electionEvents.map((event) => (
                        <ReferenceLine
                          key={event.id}
                          x={event.year}
                          stroke={RISK_COLORS.high}
                          strokeDasharray="3 3"
                          yAxisId="left"
                        />
                      ))}
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
                        dot
                      />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={monthlyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(m) =>
                          [
                            'Jan',
                            'Feb',
                            'Mar',
                            'Apr',
                            'May',
                            'Jun',
                            'Jul',
                            'Aug',
                            'Sep',
                            'Oct',
                            'Nov',
                            'Dec',
                          ][m - 1]
                        }
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="chart-tooltip">
                                <p className="font-medium">
                                  {data.month_name} {selectedYear}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Contracts: {formatNumber(data.contracts)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Value: {formatCompactMXN(data.value)}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Avg Risk: {(data.avg_risk * 100).toFixed(1)}%
                                </p>
                                {data.direct_award_count > 0 && (
                                  <p className="text-xs text-text-muted">
                                    Direct Awards: {formatNumber(data.direct_award_count)}
                                  </p>
                                )}
                                {data.isYearEnd && (
                                  <p className="text-xs text-risk-high mt-1">
                                    Year-end spending period
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="contracts" radius={[2, 2, 0, 0]}>
                        {monthlyChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.isYearEnd ? RISK_COLORS.high : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
            {monthlyBreakdown?.december_spike != null && viewMode === 'monthly' && (
              <p className="text-xs text-text-muted mt-2">
                December spike ratio: {monthlyBreakdown.december_spike.toFixed(2)}x average
                monthly spending
              </p>
            )}
          </CardContent>
        </Card>

        {/* Events Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Key Events
            </CardTitle>
            <CardDescription className="text-xs">
              Significant events affecting procurement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {yearEvents.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                No major events recorded for {selectedYear}
              </p>
            ) : (
              yearEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getEventIcon(event.type)}</span>
                    <span className="font-medium text-sm">{event.title}</span>
                    {event.impact === 'high' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-risk-high/10 border-risk-high/30 text-risk-high"
                      >
                        High Impact
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-text-muted">{event.date}</p>
                    {event.source && (
                      <p className="text-[10px] text-text-muted">Source: {event.source}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Historical Events */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-text-muted mb-2">Historical Events</p>
              {allEvents
                .filter((e) => e.year !== selectedYear)
                .slice(0, 3)
                .map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedYear(event.year)}
                    className="w-full p-2 rounded text-left hover:bg-background-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getEventIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.title}</p>
                        <p className="text-[10px] text-text-muted">{event.date}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default Explore
