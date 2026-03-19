import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeIn, slideUp } from '@/lib/animations'
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
import { RiskFeedbackButton } from '@/components/RiskFeedbackButton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { RiskExplainTooltip } from '@/components/RiskExplainTooltip'
import { TableExportButton } from '@/components/TableExportButton'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { useDebouncedSearch, useDebouncedValue } from '@/hooks/useDebouncedSearch'
import { useSavedSearches } from '@/hooks/useSavedSearches'
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
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { ContractCompareModal } from '@/components/ContractCompareModal'
import { ExpandableProvider, ExpandableRow, ExpandChevron } from '@/components/ExpandableRow'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'

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
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  sort: ContractSortField
  order: 'asc' | 'desc'
  filters: Partial<Record<string, string>>
  descriptionKey: string
}

// Preset definitions — labels/descriptions resolved via t() inside the component (Fix 3)
const CONTRACT_PRESET_DEFS: ContractPreset[] = [
  {
    id: 'suspicious-monopolies',
    labelKey: 'presets.suspiciousMonopolies.label',
    icon: Crown,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_level: 'critical', is_single_bid: 'true' },
    descriptionKey: 'presets.suspiciousMonopolies.description',
  },
  {
    id: 'december-rush',
    labelKey: 'presets.decemberRush.label',
    icon: Flame,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_level: 'high', risk_factor: 'year_end' },
    descriptionKey: 'presets.decemberRush.description',
  },
  {
    id: 'price-manipulation',
    labelKey: 'presets.priceManipulation.label',
    icon: TrendingUp,
    sort: 'risk_score',
    order: 'desc',
    filters: { risk_factor: 'price_hyp', risk_level: 'high' },
    descriptionKey: 'presets.priceManipulation.description',
  },
  {
    id: 'ghost-companies',
    labelKey: 'presets.ghostCompanies.label',
    icon: AlertTriangle,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { risk_factor: 'industry_mismatch', is_direct_award: 'true' },
    descriptionKey: 'presets.ghostCompanies.description',
  },
  {
    id: 'network-clusters',
    labelKey: 'presets.networkClusters.label',
    icon: Users,
    sort: 'risk_score',
    order: 'desc',
    filters: { risk_factor: 'network', risk_level: 'critical' },
    descriptionKey: 'presets.networkClusters.description',
  },
  {
    id: 'split-contracts',
    labelKey: 'presets.splitContracts.label',
    icon: Scissors,
    sort: 'contract_date',
    order: 'desc',
    filters: { risk_factor: 'split' },
    descriptionKey: 'presets.splitContracts.description',
  },
  {
    id: 'most-anomalous',
    labelKey: 'presets.mostAnomalous.label',
    icon: AlertTriangle,
    sort: 'mahalanobis_distance',
    order: 'desc',
    filters: {},
    descriptionKey: 'presets.mostAnomalous.description',
  },
  {
    id: 'recent-critical',
    labelKey: 'presets.recentCritical.label',
    icon: Zap,
    sort: 'contract_date',
    order: 'desc',
    filters: { year: '2024', risk_level: 'critical' },
    descriptionKey: 'presets.recentCritical.description',
  },
  {
    id: 'largest-direct-awards',
    labelKey: 'presets.biggestDirectAwards.label',
    icon: Target,
    sort: 'amount_mxn',
    order: 'desc',
    filters: { is_direct_award: 'true' },
    descriptionKey: 'presets.biggestDirectAwards.description',
  },
]

interface ColumnDef {
  key: string
  labelKey: string
  align: 'left' | 'center' | 'right'
  sortField?: ContractSortField
  hideBelow?: string
}

// Column definitions — labels resolved via t() inside the component (Fix 4)
const CONTRACT_COLUMN_DEFS: ColumnDef[] = [
  { key: 'risk', labelKey: 'columns.risk', align: 'center', sortField: 'risk_score' },
  { key: 'amount', labelKey: 'columns.amount', align: 'right', sortField: 'amount_mxn' },
  { key: 'vendor', labelKey: 'columns.vendor', align: 'left', sortField: 'vendor_name' },
  { key: 'institution', labelKey: 'columns.institution', align: 'left', sortField: 'institution_name' },
  { key: 'sector', labelKey: 'columns.sector', align: 'left', sortField: 'sector_id' },
  { key: 'date', labelKey: 'columns.date', align: 'right', sortField: 'contract_date' },
  { key: 'procedure', labelKey: 'columns.procedure', align: 'left' },
  { key: 'anomaly', labelKey: 'columns.anomalyScore', align: 'right', sortField: 'mahalanobis_distance' },
]

// =============================================================================
// Main Component
// =============================================================================

export function Contracts() {
  const { t } = useTranslation('contracts')
  const { t: ts } = useTranslation('sectors')
  const [searchParams, setSearchParams] = useSearchParams()
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const { open: openEntityDrawer } = useEntityDrawer()

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  // Fix 1: Amount range local state + 500ms debounce
  const [minAmountInput, setMinAmountInput] = useState<string>(searchParams.get('min_amount') || '')
  const [maxAmountInput, setMaxAmountInput] = useState<string>(searchParams.get('max_amount') || '')
  const debouncedMinAmount = useDebouncedValue(minAmountInput, 500)
  const debouncedMaxAmount = useDebouncedValue(maxAmountInput, 500)

  const sortBy = (searchParams.get('sort_by') as ContractSortField) || 'contract_date'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'

  // Fix 6: filters always reads per_page from URL (no hardcoded fallback at query level)
  const filters: ContractFilterParams = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    vendor_id: searchParams.get('vendor_id') ? Number(searchParams.get('vendor_id')) : undefined,
    institution_id: searchParams.get('institution_id') ? Number(searchParams.get('institution_id')) : undefined,
    category_id: searchParams.get('category_id') ? Number(searchParams.get('category_id')) : undefined,
    risk_level: searchParams.get('risk_level') as ContractFilterParams['risk_level'],
    risk_factor: searchParams.get('risk_factor') || undefined,
    is_direct_award: searchParams.get('is_direct_award') === 'true' ? true : undefined,
    is_single_bid: searchParams.get('is_single_bid') === 'true' ? true : undefined,
    min_amount: searchParams.get('min_amount') ? Number(searchParams.get('min_amount')) : undefined,
    max_amount: searchParams.get('max_amount') ? Number(searchParams.get('max_amount')) : undefined,
    search: debouncedSearch || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  }), [searchParams, debouncedSearch, sortBy, sortOrder])

  // Sync debounced search to URL
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

  // Fix 1: Sync debounced min_amount to URL
  useEffect(() => {
    const currentMin = searchParams.get('min_amount') || ''
    if (debouncedMinAmount !== currentMin) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedMinAmount) {
        newParams.set('min_amount', debouncedMinAmount)
        newParams.set('page', '1')
      } else {
        newParams.delete('min_amount')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedMinAmount, searchParams, setSearchParams])

  // Fix 1: Sync debounced max_amount to URL
  useEffect(() => {
    const currentMax = searchParams.get('max_amount') || ''
    if (debouncedMaxAmount !== currentMax) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedMaxAmount) {
        newParams.set('max_amount', debouncedMaxAmount)
        newParams.set('page', '1')
      } else {
        newParams.delete('max_amount')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedMaxAmount, searchParams, setSearchParams])

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
    if (error) toast.error('Failed to load contracts', error instanceof Error ? error.message : String(error))
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
    const preset = CONTRACT_PRESET_DEFS.find((p) => p.id === presetId)
    if (!preset) return
    const newParams = new URLSearchParams()
    newParams.set('sort_by', preset.sort)
    newParams.set('sort_order', preset.order)
    for (const [k, v] of Object.entries(preset.filters)) {
      if (v !== undefined) newParams.set(k, v)
    }
    newParams.set('page', '1')
    setSearchInput('')
    setMinAmountInput('')
    setMaxAmountInput('')
    setSearchParams(newParams)
    setActivePreset(presetId)
  }, [setSearchParams, setSearchInput])

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setMinAmountInput('')
    setMaxAmountInput('')
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

  // Saved contract filters (localStorage)
  const CONTRACT_FILTERS_KEY = 'rubli_contract_filters'
  const { items: savedFilters, save: saveFilter, remove: removeSavedFilter } = useSavedSearches(CONTRACT_FILTERS_KEY)
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false)
  const savedFiltersRef = useRef<HTMLDivElement>(null)
  const [filterSavedAnim, setFilterSavedAnim] = useState(false)

  const handleApplySavedFilter = useCallback((params: string) => {
    setSavedFiltersOpen(false)
    setSearchInput('')
    setMinAmountInput('')
    setMaxAmountInput('')
    setSearchParams(new URLSearchParams(params))
    setActivePreset(null)
  }, [setSearchParams, setSearchInput])

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
  const hasActiveFilters = !!(
    filters.search ||
    filters.sector_id ||
    filters.year ||
    filters.risk_level ||
    filters.risk_factor ||
    filters.is_direct_award ||
    filters.is_single_bid ||
    filters.min_amount ||
    filters.max_amount
  )

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

  // Risk distribution histogram data computed from current page results
  const riskHistogram = useMemo(() => {
    if (!data?.data?.length) return null
    const buckets = [
      { label: '0–0.1', min: 0, max: 0.1, color: '#4ade80', count: 0 },
      { label: '0.1–0.2', min: 0.1, max: 0.2, color: '#fbbf24', count: 0 },
      { label: '0.2–0.3', min: 0.2, max: 0.3, color: '#fbbf24', count: 0 },
      { label: '0.3–0.5', min: 0.3, max: 0.5, color: '#fb923c', count: 0 },
      { label: '0.5–1.0', min: 0.5, max: 1.01, color: '#f87171', count: 0 },
    ]
    for (const c of data.data) {
      const score = c.risk_score ?? 0
      for (const b of buckets) {
        if (score >= b.min && score < b.max) { b.count++; break }
      }
    }
    const maxCount = Math.max(...buckets.map((b) => b.count), 1)
    return buckets.map((b) => ({ ...b, pct: (b.count / maxCount) * 100 }))
  }, [data])

  const pageExportData = useMemo(() => {
    if (!data?.data?.length) return []
    return data.data.map((c) => ({
      id: c.id,
      title: c.title ?? '',
      vendor_name: c.vendor_name ?? '',
      amount_mxn: c.amount_mxn,
      risk_level: c.risk_level ?? '',
      risk_score: c.risk_score != null ? Number(c.risk_score.toFixed(4)) : '',
      year: c.contract_year ?? '',
      procedure_type: c.procedure_type ?? '',
      sector_name: c.sector_name ?? '',
    }))
  }, [data])

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = []
    if (filters.search) tags.push({ key: 'search', label: `"${filters.search}"` })
    if (filters.sector_id) {
      const sec = SECTORS.find((s) => s.id === filters.sector_id)
      tags.push({ key: 'sector_id', label: sec ? ts(sec.code) : `Sector ${filters.sector_id}` })
    }
    if (filters.year) tags.push({ key: 'year', label: `Year ${filters.year}` })
    if (filters.risk_level) tags.push({ key: 'risk_level', label: `Risk: ${filters.risk_level}` })
    if (filters.risk_factor) {
      const f = RISK_FACTORS.find((rf) => rf.value === filters.risk_factor)
      tags.push({ key: 'risk_factor', label: f ? f.label : filters.risk_factor })
    }
    if (filters.is_direct_award) tags.push({ key: 'is_direct_award', label: 'Direct Awards' })
    if (filters.is_single_bid) tags.push({ key: 'is_single_bid', label: 'Single Bidders' })
    if (filters.min_amount) tags.push({ key: 'min_amount', label: `\u2265 ${formatCompactMXN(filters.min_amount)}` })
    if (filters.max_amount) tags.push({ key: 'max_amount', label: `\u2264 ${formatCompactMXN(filters.max_amount)}` })
    if (filters.category_id) tags.push({ key: 'category_id', label: `Category #${filters.category_id}` })
    return tags
  }, [filters])

  // Remove a filter tag — amount tags also clear local input state
  const removeFilterTag = useCallback((key: string) => {
    if (key === 'min_amount') { setMinAmountInput(''); return }
    if (key === 'max_amount') { setMaxAmountInput(''); return }
    updateFilter(key, undefined)
  }, [updateFilter])

  // Save current filter to localStorage (defined after activeFilterTags is available)
  const handleSaveFilter = useCallback(() => {
    const params = searchParams.toString()
    if (!params) return
    const label = activeFilterTags.map((tag) => tag.label).join(', ') || 'Filter'
    saveFilter(label, params)
    setFilterSavedAnim(true)
    setTimeout(() => setFilterSavedAnim(false), 2000)
  }, [searchParams, activeFilterTags, saveFilter])

  // --- Render ---

  return (
    <div className="space-y-3">
      {/* Editorial masthead */}
      <motion.div className="pb-1" variants={fadeIn} initial="initial" animate="animate">
        <EditorialHeadline
          section="BASE DE DATOS"
          headline="Contratos Federales"
          subtitle="3,051,294 contratos de compras gubernamentales &middot; 2002–2025"
        />
      </motion.div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-accent" />
            Contracts
          </h2>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2" aria-live="polite">
            <span>
              {data ? `${formatNumber(data?.pagination?.total ?? 0)} records` : 'Loading...'}
              {isFetching && !isLoading && (
                <Loader2 className="inline h-3 w-3 ml-1.5 animate-spin text-accent" />
              )}
            </span>
            <FuentePill source="COMPRANET" count={3051294} countLabel="contratos" verified={true} />
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
            disabled={isExporting || !data || (data?.pagination?.total ?? 0) === 0}
            title="Export to CSV"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
          <TableExportButton
            data={pageExportData}
            filename="contracts-page"
          />
        </div>
      </div>

      {/* Full-width search bar */}
      <div className="relative">
        {showSearchLoading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
        )}
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
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

      {/* Preset chips — Fix 3: labels via t() */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CONTRACT_PRESET_DEFS.map((preset) => {
          const Icon = preset.icon
          const isActive = activePreset === preset.id
          return (
            <button
              key={preset.id}
              title={t(preset.descriptionKey)}
              onClick={() => isActive ? clearAllFilters() : applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                isActive
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-background-card border-border/50 text-text-muted hover:text-text-primary hover:border-border'
              )}
            >
              <Icon className="h-3 w-3" />
              {t(preset.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Risk level chips — Fix 2: labels via t() */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter by risk level">
          {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
            const isActive = filters.risk_level === level
            const color = RISK_COLORS[level]
            return (
              <button
                key={level}
                onClick={() => updateFilter('risk_level', isActive ? undefined : level)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-current font-semibold'
                    : 'border-border text-text-muted hover:border-current'
                )}
                style={isActive ? { color, borderColor: color, backgroundColor: `${color}18` } : { color: isActive ? color : undefined }}
                aria-pressed={isActive}
                title={`Filter by ${t(`riskLevels.${level}`)} risk`}
              >
                {t(`riskLevels.${level}`)}
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
          <option value="">{t('filters.allSectors')}</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>{ts(s.code)}</option>
          ))}
        </select>

        {/* Year dropdown */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.year || ''}
          onChange={(e) => updateFilter('year', e.target.value ? Number(e.target.value) : undefined)}
          aria-label="Filter by year"
        >
          <option value="">{t('filters.allYears')}</option>
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
          <option value="">{t('filters.allFactors')}</option>
          {RISK_FACTORS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Fix 1: Min amount input with debounce */}
        <div className="relative">
          <input
            type="number"
            placeholder={t('filters.minAmountPlaceholder')}
            aria-label={t('filters.minAmount')}
            className="h-8 w-28 rounded-md border border-border bg-background-card px-2 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={minAmountInput}
            onChange={(e) => { setMinAmountInput(e.target.value); setActivePreset(null) }}
            min={0}
          />
          {minAmountInput && (
            <button
              onClick={() => setMinAmountInput('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label={`Clear ${t('filters.minAmount')}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Fix 1: Max amount input with debounce */}
        <div className="relative">
          <input
            type="number"
            placeholder={t('filters.maxAmountPlaceholder')}
            aria-label={t('filters.maxAmount')}
            className="h-8 w-28 rounded-md border border-border bg-background-card px-2 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={maxAmountInput}
            onChange={(e) => { setMaxAmountInput(e.target.value); setActivePreset(null) }}
            min={0}
          />
          {maxAmountInput && (
            <button
              onClick={() => setMaxAmountInput('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label={`Clear ${t('filters.maxAmount')}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

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
          {t('filters.directAward')}
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
          {t('filters.singleBid')}
        </button>

        {/* Per page — Fix 6: value always from filters.per_page */}
        <select
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          value={filters.per_page}
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
            {t('filters.clearAll')}
          </Button>
        )}

        {/* Save current filter */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2 text-text-muted hover:text-accent transition-colors"
            onClick={handleSaveFilter}
            title="Save current filters"
            aria-label="Save current filter configuration"
          >
            {filterSavedAnim ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="ml-1">{filterSavedAnim ? 'Saved' : 'Save filter'}</span>
          </Button>
        )}

        {/* Saved filters dropdown */}
        {savedFilters.length > 0 && (
          <div className="relative" ref={savedFiltersRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 text-text-muted hover:text-accent transition-colors"
              onClick={() => setSavedFiltersOpen((o) => !o)}
              aria-label="Show saved filters"
              aria-expanded={savedFiltersOpen}
              aria-haspopup="menu"
            >
              <BookmarkCheck className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Saved ({savedFilters.length})
            </Button>
            {savedFiltersOpen && (
              <div
                role="menu"
                className="absolute left-0 top-9 z-50 min-w-[220px] rounded-md border border-border bg-background-card shadow-lg py-1"
              >
                {savedFilters.map((sf, i) => (
                  <div key={`${sf.value}-${i}`} className="flex items-center gap-1 px-3 py-1.5 hover:bg-accent/5 group">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex-1 text-xs text-left truncate hover:text-accent transition-colors"
                      onClick={() => handleApplySavedFilter(sf.value)}
                      title={sf.label}
                    >
                      {sf.label}
                    </button>
                    <button
                      type="button"
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-risk-critical transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSavedFilter(i)
                        if (savedFilters.length <= 1) setSavedFiltersOpen(false)
                      }}
                      aria-label={`Remove saved filter: ${sf.label}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk distribution mini-histogram */}
      {riskHistogram && (
        <div className="flex items-end gap-1.5 h-10" aria-label="Risk score distribution for current page" role="img">
          {riskHistogram.map((bucket) => (
            <div key={bucket.label} className="flex flex-col items-center gap-0.5" title={`${bucket.label}: ${bucket.count} contracts`}>
              <div
                className="w-8 rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(4, (bucket.pct / 100) * 28)}px`,
                  backgroundColor: bucket.color,
                  opacity: bucket.count === 0 ? 0.15 : 0.75,
                }}
              />
              <span className="text-[9px] text-text-muted/60 font-mono leading-none">{bucket.label}</span>
            </div>
          ))}
          <span className="ml-1 text-[10px] text-text-muted/50 self-center leading-tight">page<br/>dist.</span>
        </div>
      )}

      {/* Summary stats + Active filters */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-2"
        variants={slideUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
      >
        {pageStats && (
          <div className="flex items-center gap-3 flex-wrap">
            <StatPill label={t('stats.pageTotal')} value={formatCompactMXN(pageStats.totalValue)} />
            <StatPill
              label={t('stats.avgRisk')}
              value={`${(pageStats.avgRisk * 100).toFixed(0)}%`}
              color={RISK_COLORS[getRiskLevel(pageStats.avgRisk)]}
            />
            {pageStats.criticalCount > 0 && (
              <StatPill label={t('stats.critical')} value={String(pageStats.criticalCount)} color={RISK_COLORS.critical} />
            )}
            {pageStats.highPlusCount > 0 && (
              <StatPill label={t('stats.highPlus')} value={String(pageStats.highPlusCount)} color={RISK_COLORS.high} />
            )}
            <StatPill label={t('stats.direct')} value={`${pageStats.daPct.toFixed(0)}%`} />
          </div>
        )}

        {activeFilterTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {activeFilterTags.map((tag) => (
              <button
                key={tag.key}
                onClick={() => removeFilterTag(tag.key)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                title={`Remove ${tag.label} filter`}
              >
                {tag.label}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        )}
      </motion.div>

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
          ) : data?.data?.length === 0 ? (
            !hasActiveFilters ? (
              <div className="p-12 text-center">
                <FileText className="h-14 w-14 mx-auto mb-4 opacity-10" />
                <p className="text-base font-semibold text-text-primary mb-1">{t('emptyInitial')}</p>
                <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                  {t('emptyInitialDesc')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileSearch className="h-8 w-8 text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-secondary">{t('emptyFiltered')}</p>
                <p className="text-xs text-text-muted mt-1">{t('emptyFilteredDesc')}</p>
              </div>
            )
          ) : (
            <ExpandableProvider>
            {/* Scroll affordance: gradient fade + hint text, mobile only */}
            <div className="relative lg:hidden pointer-events-none">
              <div
                className="absolute inset-y-0 right-0 w-12 z-20"
                style={{
                  background: 'linear-gradient(to right, transparent, var(--color-background-card, #0f172a))',
                }}
                aria-hidden="true"
              />
              <p className="absolute bottom-0 right-2 z-20 text-[10px] text-text-muted pb-1 select-none" aria-hidden="true">
                scroll →
              </p>
            </div>
            <div className="overflow-x-auto">
            <ScrollArea className="h-[600px]">
              <div className="min-w-[700px]">
              <table className="w-full" role="table" aria-label="Contracts list">
                <thead className="sticky top-0 z-10 bg-background-card/95 backdrop-blur-sm border-b-2 border-border">
                  <tr>
                    <th className="px-2 py-2.5 w-8" title={t('table.selectForCompare')}>
                      {compareIds.size > 0 && (
                        <button
                          onClick={clearCompare}
                          className="text-xs text-text-muted hover:text-text-primary transition-colors"
                          title={t('table.clearSelection')}
                          aria-label={t('table.clearSelection')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </th>
                    <th className="px-2 py-2.5 w-8" />
                    {/* Fix 4: Column headers via t() */}
                    {CONTRACT_COLUMN_DEFS.map((col) => (
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
                        title={col.key === 'anomaly' ? t('table.anomalyTooltip') : undefined}
                      >
                        {t(col.labelKey)}
                        {col.key === 'risk' && (
                          <MetodologiaTooltip
                            title="Sobre el score de riesgo"
                            body="El score de riesgo (0-1) mide similitud con patrones de corrupci&oacute;n documentados. No es prueba de irregularidad — es una se&ntilde;al de investigaci&oacute;n."
                            link="/methodology"
                          />
                        )}
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
                  {data?.data?.map((contract) => (
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
            </div>
            </ExpandableProvider>
          )}
        </CardContent>
      </Card>

      {/* Pagination — Fix 6: use filters.per_page throughout */}
      {data && (data?.pagination?.total ?? 0) > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted tabular-nums">
            {(() => {
              const { start, end } = getPaginationRange(filters.page || 1, filters.per_page || 50, data.pagination?.total ?? 0)
              return `${formatNumber(start)}-${formatNumber(end)} of ${formatNumber(data.pagination?.total ?? 0)}`
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
              {clampPage(filters.page || 1, data.pagination?.total_pages ?? 1)}/{Math.max(1, data.pagination?.total_pages ?? 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={filters.page === (data.pagination?.total_pages ?? 0) || (data.pagination?.total_pages ?? 0) === 0}
              onClick={() => updateFilter('page', Math.min(data.pagination?.total_pages ?? 1, (filters.page || 1) + 1))}
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
  const { t } = useTranslation('contracts')
  const { t: ts } = useTranslation('sectors')
  const anomalyInfo = getAnomalyInfo(contract.mahalanobis_distance)
  const riskLevel = contract.risk_score != null ? getRiskLevel(contract.risk_score) : (contract.risk_level ?? null)
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

      {/* Risk: mini-bar + colored pill */}
      <td className="px-3 py-2">
        <div className="flex flex-col items-center gap-1">
          {/* Colored risk level pill */}
          {riskLevel ? (
            <RiskExplainTooltip contractId={contract.id} riskScore={contract.risk_score ?? 0} riskLevel={riskLevel}>
              <span>
                <RiskLevelPill level={riskLevel as 'critical' | 'high' | 'medium' | 'low'} score={contract.risk_score ?? undefined} size="sm" />
              </span>
            </RiskExplainTooltip>
          ) : (
            <span className="text-xs text-text-muted/30">&middot;</span>
          )}
          {/* Mini score bar */}
          {contract.risk_score != null && (
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-14 bg-background-elevated/10 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(contract.risk_score * 100, 100)}%`,
                    backgroundColor:
                      contract.risk_score >= 0.5 ? '#f87171'
                      : contract.risk_score >= 0.3 ? '#fb923c'
                      : contract.risk_score >= 0.1 ? '#fbbf24'
                      : '#4ade80',
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-text-muted tabular-nums">{contract.risk_score.toFixed(3)}</span>
            </div>
          )}
          <RiskFeedbackButton
            entityType="contract"
            entityId={contract.id}
            className="h-5 w-5"
          />
          <AddToDossierButton
            entityType="contract"
            entityId={contract.id}
            entityName={contract.title ?? contract.contract_number ?? `Contract #${contract.id}`}
            className="h-5 w-5"
          />
        </div>
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
          <div className="flex items-center gap-1 min-w-0">
            {contract.vendor_is_individual && (
              <span
                className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 leading-none"
                title="Natural person (individual) — not a company"
              >
                PERSON
              </span>
            )}
            <button
              className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate text-left flex-1"
              title={toTitleCase(contract.vendor_name || 'Unknown')}
              onClick={(e) => { e.stopPropagation(); onOpenVendorDrawer(contract.vendor_id!, 'vendor') }}
            >
              {toTitleCase(contract.vendor_name || 'Unknown')}
            </button>
            <Link
              to={`/vendors/${contract.vendor_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-text-muted hover:text-accent transition-colors flex-shrink-0"
              title="Open vendor profile"
              aria-label="Open vendor profile page"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <span className="text-xs text-text-muted truncate block" title={contract.vendor_name || ''}>
            {contract.vendor_name ? toTitleCase(contract.vendor_name) : '\u2014'}
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
            {contract.institution_name ? toTitleCase(contract.institution_name) : '\u2014'}
          </span>
        )}
      </td>

      {/* Sector */}
      <td className="px-3 py-2">
        {sector ? (
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: sector.color }}>
            {ts(sector.code)}
          </span>
        ) : (
          <span className="text-xs text-text-muted">\u2014</span>
        )}
      </td>

      {/* Date: year-month only for density */}
      <td className="px-3 py-2 text-right">
        <span className="text-xs text-text-muted tabular-nums whitespace-nowrap">
          {contract.contract_date
            ? contract.contract_date.slice(0, 7)
            : contract.contract_year || '\u2014'}
        </span>
      </td>

      {/* Procedure type */}
      <td className="px-3 py-2 max-w-[120px]">
        <span className="text-xs text-text-muted truncate block" title={contract.procedure_type || ''}>
          {contract.procedure_type || '\u2014'}
        </span>
      </td>

      {/* Anomaly (Mahalanobis D\u00B2) — Fix 5: 2 decimal places + i18n tooltip */}
      <td className="px-3 py-2 text-right">
        {contract.mahalanobis_distance != null ? (
          <span
            className="text-xs tabular-nums font-mono"
            style={anomalyInfo ? { color: anomalyInfo.dotClass.includes('red') ? RISK_COLORS.critical : anomalyInfo.dotClass.includes('amber') ? RISK_COLORS.medium : 'inherit' } : undefined}
            title={t('table.anomalyTooltip')}
          >
            {contract.mahalanobis_distance.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-text-muted">\u2014</span>
        )}
      </td>

      {/* View link */}
      <td className="px-2 py-2 text-right">
        <button
          className="text-text-muted hover:text-accent transition-colors p-1"
          title={t('table.viewFullDetails')}
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
            <p>Anomaly: {anomalyInfo.label} (D\u00B2={contract.mahalanobis_distance.toFixed(2)})</p>
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
          {t('table.fullDetails')}
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
      className={cn('hover:bg-background-card/[0.02] cursor-pointer transition-colors group', rowBorder)}
    />
  )
}

export default Contracts
