import React, { useCallback, useMemo, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  cn,
  formatCompactMXN,
  formatNumber,
  formatDate,
  getPaginationRange,
  clampPage,
  toTitleCase,
  getAnomalyInfo,
  getRiskLevel,
} from '@/lib/utils'
import { contractApi, exportApi } from '@/api/client'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import type { ContractFilterParams, ContractListItem } from '@/api/types'
import { RISK_FACTORS } from '@/api/types'
import {
  FileText,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Flame,
  Crown,
  Zap,
  Target,
  Scissors,
  Users,
  X,
  GitCompareArrows,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { ContractCompareModal } from '@/components/ContractCompareModal'
import { ExpandableProvider, ExpandableRow, ExpandChevron } from '@/components/ExpandableRow'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'

// =============================================================================
// Configuration
// =============================================================================

type ContractSortField =
  | 'amount_mxn'
  | 'contract_date'
  | 'risk_score'
  | 'vendor_name'
  | 'institution_name'
  | 'sector_id'
  | 'risk_level'
  | 'mahalanobis_distance'

interface ContractPreset {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  sort: ContractSortField
  order: 'asc' | 'desc'
  filters: Partial<Record<string, string>>
  description?: string
}

// NOTE: PRESET_TRANSLATION_KEYS removed — preset labels use static strings directly

const CONTRACT_PRESETS: ContractPreset[] = [
  {
    id: 'suspicious-monopolies',
    label: 'Suspicious Monopolies',
    icon: Crown,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_level: 'critical', is_single_bid: 'true' },
    description: 'Critical-risk single-bidder contracts — one vendor, no competition',
  },
  {
    id: 'december-rush',
    label: 'December Rush',
    icon: Flame,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_level: 'high', risk_factor: 'year_end' },
    description: 'High-risk year-end contracts — budget dumps before fiscal close',
  },
  {
    id: 'price-manipulation',
    label: 'Price Manipulation',
    icon: TrendingUp,
    sort: 'risk_score',
    order: 'desc',
    filters: { risk_factor: 'price_hyp', risk_level: 'high' },
    description: 'Statistical price outliers — contracts priced far above sector norm',
  },
  {
    id: 'ghost-companies',
    label: 'Ghost Companies',
    icon: AlertTriangle,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_factor: 'industry_mismatch', is_direct_award: 'true' },
    description: 'Direct awards to out-of-industry vendors — classic ghost company pattern',
  },
  {
    id: 'network-clusters',
    label: 'Network Clusters',
    icon: Users,
    sort: 'risk_score',
    order: 'desc',
    filters: { risk_factor: 'network', risk_level: 'critical' },
    description: 'Critical-risk network member contracts — coordinated vendor groups',
  },
  {
    id: 'split-contracts',
    label: 'Split Contracts',
    icon: Scissors,
    sort: 'contract_date',
    order: 'desc',
    filters: { risk_factor: 'split' },
    description: 'Threshold splitting — multiple same-day contracts to dodge oversight limits',
  },
  {
    id: 'most-anomalous',
    label: 'Most Anomalous',
    icon: AlertTriangle,
    sort: 'mahalanobis_distance',
    order: 'desc',
    filters: {},
    description: 'Contracts furthest from statistical norms — highest Mahalanobis distance across all risk dimensions',
  },
  {
    id: 'recent-critical',
    label: 'Recent & Critical',
    icon: Zap,
    sort: 'contract_date',
    order: 'desc',
    filters: { year: '2024', risk_level: 'critical' },
    description: '2024 critical-risk contracts — most recent suspicious activity',
  },
  {
    id: 'largest-direct-awards',
    label: 'Biggest Direct Awards',
    icon: Target,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { is_direct_award: 'true' },
    description: 'Largest contracts bypassing competitive tender — highest value without competition',
  },
]

interface ColumnDef {
  key: string
  label: string
  align: 'left' | 'center' | 'right'
  sortField?: ContractSortField
  hideBelow?: string
}

const CONTRACT_COLUMNS: ColumnDef[] = [
  { key: 'risk', label: 'Risk', align: 'center', sortField: 'risk_score' },
  { key: 'amount', label: 'Amount (MXN)', align: 'right', sortField: 'amount_mxn' },
  { key: 'vendor', label: 'Vendor', align: 'left', sortField: 'vendor_name' },
  { key: 'institution', label: 'Institution', align: 'left', sortField: 'institution_name' },
  { key: 'sector', label: 'Sector', align: 'left', sortField: 'sector_id' },
  { key: 'date', label: 'Date', align: 'right', sortField: 'contract_date' },
  { key: 'procedure', label: 'Procedure', align: 'left' },
  { key: 'anomaly', label: 'Anomaly D\u00B2', align: 'right', sortField: 'mahalanobis_distance' },
]

// =============================================================================
// Main Component
// =============================================================================

export function Contracts() {
  const { t } = useTranslation('contracts')
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const { open: openEntityDrawer } = useEntityDrawer()

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  const sortBy = (searchParams.get('sort_by') as ContractSortField) || 'contract_date'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'

  const filters: ContractFilterParams = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    vendor_id: searchParams.get('vendor_id') ? Number(searchParams.get('vendor_id')) : undefined,
    institution_id: searchParams.get('institution_id') ? Number(searchParams.get('institution_id')) : undefined,
    risk_level: searchParams.get('risk_level') as ContractFilterParams['risk_level'],
    risk_factor: searchParams.get('risk_factor') || undefined,
    is_direct_award: searchParams.get('is_direct_award') === 'true' ? true : undefined,
    is_single_bid: searchParams.get('is_single_bid') === 'true' ? true : undefined,
    search: debouncedSearch || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  }), [searchParams, debouncedSearch, sortBy, sortOrder])

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
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Compare selection
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set())
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const MAX_COMPARE = 4

  const toggleCompare = useCallback((id: number) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_COMPARE) {
        next.add(id)
      } else {
        toast.error('Too many selected', `You can compare up to ${MAX_COMPARE} contracts at a time`)
      }
      return next
    })
  }, [toast])

  const clearCompare = useCallback(() => {
    setCompareIds(new Set())
    setIsCompareOpen(false)
  }, [])

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractApi.getAll(filters),
    staleTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    if (error) toast.error('Failed to load contracts', (error as Error).message)
  }, [error, toast])

  // --- Handlers ---

  const updateFilter = useCallback((key: string, value: string | number | boolean | undefined) => {
    if (key === 'search') { setSearchInput(String(value || '')); return }
    const newParams = new URLSearchParams(searchParams)
    if (value === undefined || value === '') {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
    if (key !== 'page') newParams.set('page', '1')
    setSearchParams(newParams)
    setActivePreset(null)
  }, [searchParams, setSearchParams, setSearchInput])

  const handleSort = useCallback((field: ContractSortField) => {
    const newParams = new URLSearchParams(searchParams)
    if (sortBy === field) {
      newParams.set('sort_order', sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      newParams.set('sort_by', field)
      newParams.set('sort_order', 'desc')
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
    setActivePreset(null)
  }, [searchParams, setSearchParams, sortBy, sortOrder])

  const applyPreset = useCallback((presetId: string) => {
    const preset = CONTRACT_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const newParams = new URLSearchParams()
    newParams.set('sort_by', preset.sort)
    newParams.set('sort_order', preset.order)
    for (const [k, v] of Object.entries(preset.filters)) {
      if (v !== undefined) newParams.set(k, v)
    }
    newParams.set('page', '1')
    setSearchInput('')
    setSearchParams(newParams)
    setActivePreset(presetId)
  }, [setSearchParams, setSearchInput])

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setSearchParams({})
    setActivePreset(null)
  }, [setSearchParams, setSearchInput])

  const [isExporting, setIsExporting] = useState(false)
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportApi.exportContracts(filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contracts_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Export complete', `Downloaded ${data?.pagination.total || 0} contracts`)
    } catch {
      toast.error('Export failed', 'Unable to export contracts')
    } finally {
      setIsExporting(false)
    }
  }

  const [linkCopied, setLinkCopied] = useState(false)
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      toast.success('Link copied', 'Filter URL copied to clipboard')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast.error('Copy failed', 'Unable to copy link')
    }
  }

  // --- Computed ---

  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)
  const hasActiveFilters = !!(filters.search || filters.sector_id || filters.year || filters.risk_level || filters.risk_factor || filters.is_direct_award || filters.is_single_bid)

  const pageStats = useMemo(() => {
    if (!data?.data?.length) return null
    const contracts = data.data
    const totalValue = contracts.reduce((s, c) => s + c.amount_mxn, 0)
    const avgRisk = contracts.reduce((s, c) => s + (c.risk_score || 0), 0) / contracts.length
    const criticalCount = contracts.filter((c) => (c.risk_score || 0) >= 0.50).length
    const highPlusCount = contracts.filter((c) => (c.risk_score || 0) >= 0.30).length
    const daCount = contracts.filter((c) => c.is_direct_award).length
    const daPct = contracts.length > 0 ? (daCount / contracts.length) * 100 : 0
    return { totalValue, avgRisk, criticalCount, highPlusCount, daPct }
  }, [data])

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = []
    if (filters.search) tags.push({ key: 'search', label: `"${filters.search}"` })
    if (filters.sector_id) {
      const sec = SECTORS.find((s) => s.id === filters.sector_id)
      tags.push({ key: 'sector_id', label: sec ? sec.nameEN : `Sector ${filters.sector_id}` })
    }
    if (filters.year) tags.push({ key: 'year', label: `Year ${filters.year}` })
    if (filters.risk_level) tags.push({ key: 'risk_level', label: `Risk: ${filters.risk_level}` })
    if (filters.risk_factor) {
      const f = RISK_FACTORS.find((rf) => rf.value === filters.risk_factor)
      tags.push({ key: 'risk_factor', label: f ? f.label : filters.risk_factor })
    }
    if (filters.is_direct_award) tags.push({ key: 'is_direct_award', label: 'Direct Awards' })
    if (filters.is_single_bid) tags.push({ key: 'is_single_bid', label: 'Single Bidders' })
    return tags
  }, [filters])

  // --- Render ---

  return (
    <div className="space-y-3">
      {/* Page Hero */}
      <div className="pb-1">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            CONTRACT EXPLORER
          </span>
        </div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">3.1M Contracts. Search Everything.</h1>
        <p className="text-sm text-text-muted mt-1">
          Every government contract from 2002–2025, searchable by vendor, institution, sector, or risk level.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-accent" />
            Contracts
          </h2>
          <p className="text-xs text-text-muted mt-0.5" aria-live="polite">
            {data ? `${formatNumber(data.pagination.total)} records` : 'Loading...'}
            {isFetching && !isLoading && (
              <Loader2 className="inline h-3 w-3 ml-1.5 animate-spin text-accent" />
            )}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {t('guidance')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleCopyLink}
            title={linkCopied ? 'Copied!' : 'Copy shareable link'}
          >
            {linkCopied ? <Check className="h-3.5 w-3.5 text-risk-low" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleExport}
            disabled={isExporting || !data || data.pagination.total === 0}
            title="Export to CSV"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Full-width search bar — primary entry point */}
      <div className="relative">
        {showSearchLoading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
        )}
        <input
          type="text"
          placeholder="Search contracts, institutions, or vendors…"
          className="h-11 w-full rounded-lg border border-border bg-background-card pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search contracts by vendor or institution"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CONTRACT_PRESETS.map((preset) => {
          const Icon = preset.icon
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              title={preset.description}
              onClick={() => isActive ? clearAllFilters() : applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
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

      {/* Filter bar — compact inline row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Risk level chips */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter by risk level">
          {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
            const isActive = filters.risk_level === level
            const color = RISK_COLORS[level]
            return (
              <button
                key={level}
                onClick={() => updateFilter('risk_level', isActive ? undefined : level)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border transition-colors whitespace-nowrap capitalize',
                  isActive
                    ? 'border-current font-semibold'
                    : 'border-border text-text-muted hover:border-current'
                )}
                style={isActive ? { color, borderColor: color, backgroundColor: `${color}18` } : { color: isActive ? color : undefined }}
                aria-pressed={isActive}
                title={`Filter by ${level} risk`}
              >
                {level}
              </button>
            )
          })}
        </div>

        {/* Sector dropdown */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.sector_id || ''}
          onChange={(e) => updateFilter('sector_id', e.target.value ? Number(e.target.value) : undefined)}
          aria-label="Filter by sector"
        >
          <option value="">All Sectors</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>{s.nameEN}</option>
          ))}
        </select>

        {/* Year dropdown */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.year || ''}
          onChange={(e) => updateFilter('year', e.target.value ? Number(e.target.value) : undefined)}
          aria-label="Filter by year"
        >
          <option value="">All Years</option>
          {Array.from({ length: 24 }, (_, i) => 2025 - i).map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Risk factor dropdown */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.risk_factor || ''}
          onChange={(e) => updateFilter('risk_factor', e.target.value || undefined)}
          aria-label="Filter by risk factor"
        >
          <option value="">All Factors</option>
          {RISK_FACTORS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Direct award toggle */}
        <button
          onClick={() => updateFilter('is_direct_award', filters.is_direct_award ? undefined : true)}
          className={cn(
            'h-8 px-3 rounded-md text-xs border transition-colors whitespace-nowrap',
            filters.is_direct_award
              ? 'border-amber-500 text-amber-500 bg-amber-500/10 font-semibold'
              : 'border-border text-text-muted hover:border-amber-500/50 hover:text-amber-500'
          )}
          aria-pressed={!!filters.is_direct_award}
        >
          Direct Award
        </button>

        {/* Single bid toggle */}
        <button
          onClick={() => updateFilter('is_single_bid', filters.is_single_bid ? undefined : true)}
          className={cn(
            'h-8 px-3 rounded-md text-xs border transition-colors whitespace-nowrap',
            filters.is_single_bid
              ? 'border-red-500 text-red-500 bg-red-500/10 font-semibold'
              : 'border-border text-text-muted hover:border-red-500/50 hover:text-red-500'
          )}
          aria-pressed={!!filters.is_single_bid}
        >
          Single Bid
        </button>

        {/* Per page */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.per_page || 50}
          onChange={(e) => updateFilter('per_page', Number(e.target.value))}
          aria-label="Results per page"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-text-muted hover:text-text-primary" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Summary stats + Active filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {pageStats && (
          <div className="flex items-center gap-3 flex-wrap">
            <StatPill label="Page total" value={formatCompactMXN(pageStats.totalValue)} />
            <StatPill
              label="Avg risk"
              value={`${(pageStats.avgRisk * 100).toFixed(0)}%`}
              color={RISK_COLORS[getRiskLevel(pageStats.avgRisk)]}
            />
            {pageStats.criticalCount > 0 && (
              <StatPill label="Critical" value={String(pageStats.criticalCount)} color={RISK_COLORS.critical} />
            )}
            {pageStats.highPlusCount > 0 && (
              <StatPill label="High+" value={String(pageStats.highPlusCount)} color={RISK_COLORS.high} />
            )}
            <StatPill label="Direct" value={`${pageStats.daPct.toFixed(0)}%`} />
          </div>
        )}

        {activeFilterTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {activeFilterTags.map((tag) => (
              <button
                key={tag.key}
                onClick={() => updateFilter(tag.key, undefined)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                title={`Remove ${tag.label} filter`}
              >
                {tag.label}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contracts table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center" role="alert">
              <AlertCircle className="h-10 w-10 text-risk-high mx-auto mb-3" />
              <h3 className="text-sm font-medium mb-1">Failed to load contracts</h3>
              <p className="text-xs text-text-muted mb-3">
                {(error as Error).message === 'Network Error'
                  ? 'Unable to connect to server.'
                  : (error as Error).message || 'An unexpected error occurred.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : data?.data.length === 0 ? (
            !hasActiveFilters ? (
              <div className="p-12 text-center">
                <FileText className="h-14 w-14 mx-auto mb-4 opacity-10" />
                <p className="text-base font-semibold text-text-primary mb-1">3.1 Million Contracts · 2002–2025</p>
                <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                  Search any contract, institution, or vendor name to begin. Or use the filters above to browse by sector, year, or risk level.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileSearch className="h-8 w-8 text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-secondary">No contracts match your filters</p>
                <p className="text-xs text-text-muted mt-1">Try adjusting your search or clearing the active filters</p>
              </div>
            )
          ) : (
            <ExpandableProvider>
            <ScrollArea className="h-[600px]">
              <div className="overflow-x-auto min-w-full">
              <table className="w-full min-w-[700px]" role="table" aria-label="Contracts list">
                <thead className="sticky top-0 z-10 bg-background-card/95 backdrop-blur-sm border-b-2 border-border">
                  <tr>
                    <th className="px-2 py-2.5 w-8" title="Select to compare">
                      {compareIds.size > 0 && (
                        <button
                          onClick={clearCompare}
                          className="text-xs text-text-muted hover:text-text-primary transition-colors"
                          title="Clear selection"
                          aria-label="Clear comparison selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </th>
                    <th className="px-2 py-2.5 w-8" />
                    {CONTRACT_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider select-none',
                          col.sortField && 'cursor-pointer hover:text-accent transition-colors',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.hideBelow === 'lg' && 'hidden lg:table-cell',
                          col.sortField && sortBy === col.sortField ? 'text-accent' : 'text-text-muted'
                        )}
                        onClick={col.sortField ? () => handleSort(col.sortField!) : undefined}
                      >
                        {col.label}
                        {col.sortField && sortBy === col.sortField && (
                          sortOrder === 'desc'
                            ? <ChevronDown className="h-3 w-3 inline ml-0.5" />
                            : <ChevronUp className="h-3 w-3 inline ml-0.5" />
                        )}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data?.data.map((contract) => (
                    <ContractRow
                      key={contract.id}
                      contract={contract}
                      onView={(id) => { setSelectedContractId(id); setIsDetailOpen(true) }}
                      isSelected={compareIds.has(contract.id)}
                      onToggleCompare={toggleCompare}
                      onOpenVendorDrawer={openEntityDrawer}
                    />
                  ))}
                </tbody>
              </table>
              </div>
            </ScrollArea>
            </ExpandableProvider>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted tabular-nums">
            {(() => {
              const { start, end } = getPaginationRange(filters.page || 1, filters.per_page || 50, data.pagination.total)
              return `${formatNumber(start)}-${formatNumber(end)} of ${formatNumber(data.pagination.total)}`
            })()}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={filters.page === 1}
              onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-text-muted tabular-nums px-1">
              {clampPage(filters.page || 1, data.pagination.total_pages)}/{Math.max(1, data.pagination.total_pages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={filters.page === data.pagination.total_pages || data.pagination.total_pages === 0}
              onClick={() => updateFilter('page', Math.min(data.pagination.total_pages, (filters.page || 1) + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* Floating compare bar */}
      {compareIds.size >= 2 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9000,
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full shadow-xl border border-accent/30 bg-background-card backdrop-blur-sm"
        >
          <span className="text-xs text-text-muted">
            <span className="font-semibold text-accent tabular-nums">{compareIds.size}</span> selected
          </span>
          <Button
            size="sm"
            className="h-7 text-xs px-3 rounded-full"
            onClick={() => setIsCompareOpen(true)}
          >
            <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" />
            Compare
          </Button>
          <button
            onClick={clearCompare}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Compare modal */}
      <ContractCompareModal
        contracts={(data?.data || []).filter((c) => compareIds.has(c.id))}
        open={isCompareOpen}
        onOpenChange={setIsCompareOpen}
        onViewDetail={(id) => { setSelectedContractId(id); setIsDetailOpen(true) }}
      />
    </div>
  )
}

// =============================================================================
// Helper Components
// =============================================================================

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

// =============================================================================
// Contract Row
// =============================================================================

function ContractRow({
  contract,
  onView,
  isSelected,
  onToggleCompare,
  onOpenVendorDrawer,
}: {
  contract: ContractListItem
  onView: (id: number) => void
  isSelected: boolean
  onToggleCompare: (id: number) => void
  onOpenVendorDrawer: (id: number, type: 'vendor' | 'institution') => void
}) {
  const anomalyInfo = getAnomalyInfo(contract.mahalanobis_distance)
  const riskLevel = contract.risk_score != null ? getRiskLevel(contract.risk_score) : (contract.risk_level ?? null)
  const riskColor = riskLevel ? RISK_COLORS[riskLevel] : undefined
  const sector = contract.sector_id ? SECTORS.find((s) => s.id === contract.sector_id) : null

  const rowBorder =
    riskLevel === 'critical' ? 'border-l-2 border-l-red-400/60'
    : riskLevel === 'high' ? 'border-l-2 border-l-orange-400/40'
    : ''

  const cells = (
    <>
      {/* Checkbox: select for comparison */}
      <td className="px-2 py-2 w-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleCompare(contract.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
          aria-label={`Select contract ${contract.contract_number || contract.id} for comparison`}
        />
      </td>
      <td className="px-2 py-2 w-8">
        <ExpandChevron id={contract.id} />
      </td>

      {/* Risk: tiered display — nothing for low, dot for medium, badge for high/critical */}
      <td className="px-3 py-2 text-center">
        {riskLevel === 'critical' || riskLevel === 'high' ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize"
            style={{ color: riskColor, backgroundColor: `${riskColor}18`, border: `1px solid ${riskColor}40` }}
            title={contract.risk_score != null ? `${(contract.risk_score * 100).toFixed(1)}%` : riskLevel}
          >
            {riskLevel}
          </span>
        ) : riskLevel === 'medium' ? (
          <span
            className="inline-flex h-2 w-2 rounded-full mx-auto"
            style={{ backgroundColor: riskColor, opacity: 0.7 }}
            title={contract.risk_score != null ? `Medium · ${(contract.risk_score * 100).toFixed(1)}%` : 'Medium'}
          />
        ) : (
          <span className="text-xs text-text-muted/30">·</span>
        )}
      </td>

      {/* Amount */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs tabular-nums font-medium text-text-primary">
          {formatCompactMXN(contract.amount_mxn)}
        </span>
      </td>

      {/* Vendor */}
      <td className="px-3 py-2 max-w-[180px]">
        {contract.vendor_id ? (
          <button
            className="text-xs font-medium text-text-primary hover:text-accent transition-colors block truncate text-left w-full"
            title={toTitleCase(contract.vendor_name || 'Unknown')}
            onClick={(e) => { e.stopPropagation(); onOpenVendorDrawer(contract.vendor_id!, 'vendor') }}
          >
            {toTitleCase(contract.vendor_name || 'Unknown')}
          </button>
        ) : (
          <span className="text-xs text-text-muted truncate block" title={contract.vendor_name || ''}>
            {contract.vendor_name ? toTitleCase(contract.vendor_name) : '—'}
          </span>
        )}
      </td>

      {/* Institution */}
      <td className="px-3 py-2 max-w-[180px]">
        {contract.institution_id ? (
          <Link
            to={`/institutions/${contract.institution_id}`}
            className="text-xs text-text-muted hover:text-accent transition-colors block truncate"
            title={toTitleCase(contract.institution_name || 'Unknown')}
            onClick={(e) => e.stopPropagation()}
          >
            {toTitleCase(contract.institution_name || 'Unknown')}
          </Link>
        ) : (
          <span className="text-xs text-text-muted truncate block" title={contract.institution_name || ''}>
            {contract.institution_name ? toTitleCase(contract.institution_name) : '—'}
          </span>
        )}
      </td>

      {/* Sector */}
      <td className="px-3 py-2">
        {sector ? (
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: sector.color }}>
            {sector.nameEN}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>

      {/* Date: year-month only for density */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs text-text-muted tabular-nums whitespace-nowrap">
          {contract.contract_date
            ? contract.contract_date.slice(0, 7)
            : contract.contract_year || '—'}
        </span>
      </td>

      {/* Procedure type */}
      <td className="px-3 py-2 max-w-[120px]">
        <span className="text-xs text-text-muted truncate block" title={contract.procedure_type || ''}>
          {contract.procedure_type || '—'}
        </span>
      </td>

      {/* Anomaly (Mahalanobis D²) */}
      <td className="px-3 py-2 text-right">
        {contract.mahalanobis_distance != null ? (
          <span
            className="text-xs tabular-nums font-mono"
            style={anomalyInfo ? { color: anomalyInfo.dotClass.includes('red') ? RISK_COLORS.critical : anomalyInfo.dotClass.includes('amber') ? RISK_COLORS.medium : 'inherit' } : undefined}
            title={anomalyInfo ? `${anomalyInfo.label} anomaly` : undefined}
          >
            {contract.mahalanobis_distance.toFixed(1)}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>

      {/* View link */}
      <td className="px-2 py-2 text-right">
        <button
          className="text-text-muted hover:text-accent transition-colors p-1"
          title="View full details"
          onClick={(e) => { e.stopPropagation(); onView(contract.id) }}
          aria-label={`View details for ${contract.contract_number || contract.id}`}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </td>
    </>
  )

  const factors = contract.risk_factors?.filter(Boolean) || []

  const detail = (
    <div className="space-y-3">
      {contract.title && (
        <p className="text-sm text-text-primary">{contract.title}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factors.length > 0 && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">Risk Factors</p>
            <div className="flex flex-wrap gap-1.5">
              {factors.map((raw) => {
                const parsed = parseFactorLabel(raw)
                const catColor = getFactorCategoryColor(parsed.category)
                return (
                  <span
                    key={raw}
                    className="text-xs font-medium px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${catColor}15`,
                      color: catColor,
                      borderColor: `${catColor}30`,
                    }}
                    title={raw}
                  >
                    {parsed.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-xs text-text-muted space-y-1">
          {contract.contract_date && <p>Date: {formatDate(contract.contract_date)}</p>}
          {contract.procedure_type && <p>Procedure: {contract.procedure_type}</p>}
          {contract.contract_number && <p>Number: {contract.contract_number}</p>}
          {anomalyInfo && contract.mahalanobis_distance != null && (
            <p>Anomaly: {anomalyInfo.label} (D\u00B2={contract.mahalanobis_distance.toFixed(1)})</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border/30">
        {contract.vendor_id && (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="text-xs text-accent hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            {contract.vendor_name ? toTitleCase(contract.vendor_name) : `Vendor #${contract.vendor_id}`}
          </Link>
        )}
        {contract.institution_id && (
          <Link
            to={`/institutions/${contract.institution_id}`}
            className="text-xs text-accent hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            {contract.institution_name ? toTitleCase(contract.institution_name) : `Inst #${contract.institution_id}`}
          </Link>
        )}
        {contract.contract_number && (
          <a
            href={`https://compranet.hacienda.gob.mx/esop/toolkit/opportunity/opportunityDetail.do?opportunityId=${encodeURIComponent(contract.contract_number)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-muted hover:text-accent flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            title="View on COMPRANET"
          >
            <ExternalLink className="h-3 w-3" />
            COMPRANET
          </a>
        )}
        <button
          className="text-xs text-accent hover:underline ml-auto flex items-center gap-1"
          onClick={(e) => { e.stopPropagation(); onView(contract.id) }}
        >
          <Eye className="h-3 w-3" />
          Full details
        </button>
      </div>
    </div>
  )

  return (
    <ExpandableRow
      id={contract.id}
      cells={cells}
      detail={detail}
      colSpan={11}
      className={cn('hover:bg-accent/[0.04] transition-colors group', rowBorder)}
    />
  )
}

export default Contracts
