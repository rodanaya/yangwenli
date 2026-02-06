import { useCallback, useMemo, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatDate, getPaginationRange, clampPage } from '@/lib/utils'
import { contractApi, exportApi } from '@/api/client'
import { VirtualizedTable } from '@/components/VirtualizedTable'
import { SECTORS } from '@/lib/constants'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import type { ContractFilterParams, ContractListItem } from '@/api/types'
import { RISK_FACTORS } from '@/api/types'
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Debounced search - reduces API calls from 13+ to 1 per search term
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  // Parse filters from URL, using debounced search value for API calls
  const filters: ContractFilterParams = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    risk_level: searchParams.get('risk_level') as ContractFilterParams['risk_level'],
    risk_factor: searchParams.get('risk_factor') || undefined,
    search: debouncedSearch || undefined,
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

  // Toast notifications
  const toast = useToast()

  // Fetch contracts
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractApi.getAll(filters),
  })

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error('Failed to load contracts', (error as Error).message)
    }
  }, [error, toast])

  const updateFilter = useCallback((key: string, value: string | number | undefined) => {
    if (key === 'search') {
      // Search is handled by the debounced hook
      setSearchInput(String(value || ''))
      return
    }

    const newParams = new URLSearchParams(searchParams)
    if (value === undefined || value === '') {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
    // Reset to page 1 when filters change
    if (key !== 'page') {
      newParams.set('page', '1')
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams, setSearchInput])

  // Show loading indicator when search is pending or fetching
  const showSearchLoading = isSearchPending || (isFetching && searchInput !== debouncedSearch)

  // Use virtualized table for large page sizes
  const useVirtualized = (filters.per_page || 50) > 100

  // Columns definition for VirtualizedTable
  const virtualizedColumns = useMemo(() => [
    {
      id: 'contract',
      header: 'Contract',
      accessor: (row: ContractListItem) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-muted shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{row.title || 'Untitled'}</p>
            <p className="text-xs text-text-muted">{row.contract_number || `ID: ${row.id}`}</p>
          </div>
        </div>
      ),
      minWidth: 200,
    },
    {
      id: 'vendor',
      header: 'Vendor',
      accessor: (row: ContractListItem) => (
        <span className="text-sm truncate">{row.vendor_name || '-'}</span>
      ),
      minWidth: 150,
    },
    {
      id: 'institution',
      header: 'Institution',
      accessor: (row: ContractListItem) => (
        <span className="text-sm truncate">{row.institution_name || '-'}</span>
      ),
      minWidth: 150,
    },
    {
      id: 'amount',
      header: 'Amount',
      accessor: (row: ContractListItem) => (
        <span className="text-sm font-medium tabular-nums">{formatCompactMXN(row.amount_mxn)}</span>
      ),
      align: 'right' as const,
      minWidth: 100,
    },
    {
      id: 'date',
      header: 'Date',
      accessor: (row: ContractListItem) => (
        <span className="text-sm text-text-muted">
          {row.contract_date ? formatDate(row.contract_date) : row.contract_year || '-'}
        </span>
      ),
      minWidth: 90,
    },
    {
      id: 'risk',
      header: 'Risk',
      accessor: (row: ContractListItem) => (
        row.risk_score !== undefined && row.risk_score !== null
          ? <RiskBadge score={row.risk_score} />
          : <span className="text-xs text-text-muted">-</span>
      ),
      minWidth: 80,
    },
    {
      id: 'flags',
      header: 'Flags',
      accessor: (row: ContractListItem) => (
        <div className="flex gap-1">
          {row.is_direct_award && (
            <Badge variant="outline" className="text-[10px]" title="Direct Award">DA</Badge>
          )}
          {row.is_single_bid && (
            <Badge variant="outline" className="text-[10px]" title="Single Bid">SB</Badge>
          )}
        </div>
      ),
      minWidth: 70,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row: ContractListItem) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="View contract details"
          aria-label={`View details for contract ${row.contract_number || row.id}`}
          onClick={() => console.log('View contract:', row.id)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
      align: 'center' as const,
      minWidth: 60,
    },
  ], [])

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // Copy link state
  const [linkCopied, setLinkCopied] = useState(false)

  // Handle copy link for sharing filters
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      toast.success('Link copied', 'Filter URL copied to clipboard')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      toast.error('Copy failed', 'Unable to copy link to clipboard')
    }
  }

  // Handle export
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
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Export failed', 'Unable to export contracts. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-accent" />
            Contracts
          </h2>
          <p className="text-xs text-text-muted mt-0.5" aria-live="polite">
            {data ? `${formatNumber(data.pagination.total)} records found` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input with debouncing */}
          <div className="relative">
            {showSearchLoading ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            )}
            <input
              type="text"
              placeholder="Search contracts..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search contracts by name, number, or vendor"
            />
          </div>

          {/* Sector filter */}
          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filters.sector_id || ''}
            onChange={(e) => updateFilter('sector_id', e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Filter by sector"
          >
            <option value="">All Sectors</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Year filter */}
          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filters.year || ''}
            onChange={(e) => updateFilter('year', e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {Array.from({ length: 24 }, (_, i) => 2025 - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Risk filter */}
          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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

          {/* Risk Factor filter (v3.2) */}
          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filters.risk_factor || ''}
            onChange={(e) => updateFilter('risk_factor', e.target.value || undefined)}
            title="Filter by specific risk factor"
          >
            <option value="">All Risk Factors</option>
            {RISK_FACTORS.map((f) => (
              <option key={f.value} value={f.value} title={f.description}>
                {f.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            aria-label={linkCopied ? 'Link copied' : 'Copy shareable link with current filters'}
            title="Copy shareable link"
          >
            {linkCopied ? (
              <Check className="mr-2 h-4 w-4 text-risk-low" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {linkCopied ? 'Copied!' : 'Share'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !data || data.pagination.total === 0}
            aria-label={isExporting ? 'Exporting contracts...' : 'Export contracts to CSV'}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Active filters */}
      {(filters.sector_id || filters.year || filters.risk_level || filters.risk_factor || filters.search) && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <button
                onClick={() => updateFilter('search', undefined)}
                className="ml-1 hover:text-text-primary"
                aria-label="Remove search filter"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.sector_id && (
            <Badge variant="secondary" className="gap-1">
              Sector: {SECTORS.find((s) => s.id === filters.sector_id)?.name}
              <button
                onClick={() => updateFilter('sector_id', undefined)}
                className="ml-1 hover:text-text-primary"
                aria-label="Remove sector filter"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="gap-1">
              Year: {filters.year}
              <button
                onClick={() => updateFilter('year', undefined)}
                className="ml-1 hover:text-text-primary"
                aria-label="Remove year filter"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.risk_level && (
            <RiskBadge level={filters.risk_level} className="gap-1">
              {filters.risk_level}
              <button
                onClick={() => updateFilter('risk_level', undefined)}
                className="ml-1 hover:text-text-primary"
                aria-label="Remove risk level filter"
              >
                ×
              </button>
            </RiskBadge>
          )}
          {filters.risk_factor && (
            <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600">
              Factor: {RISK_FACTORS.find((f) => f.value === filters.risk_factor)?.label || filters.risk_factor}
              <button
                onClick={() => updateFilter('risk_factor', undefined)}
                className="ml-1 hover:text-text-primary"
                aria-label="Remove risk factor filter"
              >
                ×
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
            Clear all
          </Button>
        </div>
      )}

      {/* Contracts table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center" role="alert" aria-live="polite">
              <AlertCircle className="h-12 w-12 text-risk-high mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load contracts</h3>
              <p className="text-sm text-text-muted mb-4">
                {(error as Error).message === 'Network Error'
                  ? 'Unable to connect to server. Please check if the backend is running.'
                  : (error as Error).message || 'An unexpected error occurred.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No contracts found</p>
              <p className="text-sm mt-1">
                {filters.search || filters.sector_id || filters.year || filters.risk_level
                  ? 'Try adjusting your filters to see more results.'
                  : 'No contracts are available in the database.'}
              </p>
              {(filters.search || filters.sector_id || filters.year || filters.risk_level) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchParams({})}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : useVirtualized ? (
            <VirtualizedTable
              data={data?.data || []}
              columns={virtualizedColumns}
              getRowKey={(row) => row.id}
              height={600}
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="overflow-x-auto min-w-full">
              <table className="w-full min-w-[800px]" role="table" aria-label="Contracts list">
                <thead className="sticky top-0 z-10 bg-background-card/95 backdrop-blur-sm border-b-2 border-border shadow-sm">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                    <th className="p-3 pl-4">Contract</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Institution</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3">Flags</th>
                    <th className="p-3 pr-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data?.data.map((contract, index) => (
                    <ContractRow key={contract.id} contract={contract} isEven={index % 2 === 0} />
                  ))}
                </tbody>
              </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {(() => {
              const { start, end } = getPaginationRange(
                filters.page || 1,
                filters.per_page || 50,
                data.pagination.total
              )
              return `Showing ${formatNumber(start)} - ${formatNumber(end)} of ${formatNumber(data.pagination.total)}`
            })()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1 || data.pagination.total_pages === 0}
              onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-text-muted">
              Page {clampPage(filters.page || 1, data.pagination.total_pages)} of{' '}
              {Math.max(1, data.pagination.total_pages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                filters.page === data.pagination.total_pages || data.pagination.total_pages === 0
              }
              onClick={() =>
                updateFilter(
                  'page',
                  Math.min(data.pagination.total_pages, (filters.page || 1) + 1)
                )
              }
              aria-label="Go to next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContractRow({ contract, isEven }: { contract: ContractListItem; isEven?: boolean }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      // Navigate to contract details when implemented
      // For now, focus the row to indicate selection
      ;(e.target as HTMLElement).focus()
    }
  }

  return (
    <tr
      className={`
        transition-colors duration-150
        hover:bg-accent/5 hover:shadow-sm
        focus:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent
        ${isEven ? 'bg-background-card' : 'bg-background-elevated/30'}
      `}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="row"
      aria-label={`Contract ${contract.contract_number || contract.id}: ${contract.title || 'Untitled'}, ${formatCompactMXN(contract.amount_mxn)}`}
    >
      <td className="p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium truncate max-w-[200px]">{contract.title || 'Untitled'}</p>
            <p className="text-xs text-text-muted">{contract.contract_number || `ID: ${contract.id}`}</p>
          </div>
        </div>
      </td>
      <td className="p-3">
        <p className="text-sm truncate max-w-[150px]">{contract.vendor_name || '-'}</p>
      </td>
      <td className="p-3">
        <p className="text-sm truncate max-w-[150px]">{contract.institution_name || '-'}</p>
      </td>
      <td className="p-3 text-right">
        <p className="text-sm font-medium tabular-nums">{formatCompactMXN(contract.amount_mxn)}</p>
      </td>
      <td className="p-3">
        <p className="text-sm text-text-muted">
          {contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year || '-'}
        </p>
      </td>
      <td className="p-3">
        {contract.risk_score !== undefined && contract.risk_score !== null ? (
          <RiskBadge score={contract.risk_score} />
        ) : (
          <span className="text-xs text-text-muted">-</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          {contract.is_direct_award && (
            <Badge variant="outline" className="text-[10px]" title="Direct Award">
              DA
            </Badge>
          )}
          {contract.is_single_bid && (
            <Badge variant="outline" className="text-[10px]" title="Single Bid">
              SB
            </Badge>
          )}
        </div>
      </td>
      <td className="p-3 text-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="View contract details"
          aria-label={`View details for contract ${contract.contract_number || contract.id}`}
          onClick={() => {
            // Open contract details - could navigate to detail page or open modal
            console.log('View contract:', contract.id)
          }}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  )
}

export default Contracts
