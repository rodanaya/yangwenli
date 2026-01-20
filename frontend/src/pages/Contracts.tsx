import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatDate } from '@/lib/utils'
import { contractApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import type { ContractFilterParams, ContractListItem } from '@/api/types'
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
} from 'lucide-react'

export function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse filters from URL
  const filters: ContractFilterParams = {
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    risk_level: searchParams.get('risk_level') as ContractFilterParams['risk_level'],
    search: searchParams.get('search') || undefined,
  }

  // Fetch contracts
  const { data, isLoading, error } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractApi.getAll(filters),
  })

  const updateFilter = (key: string, value: string | number | undefined) => {
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
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contracts</h2>
          <p className="text-sm text-text-muted">
            {data ? `${formatNumber(data.pagination.total)} contracts found` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search contracts..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Sector filter */}
          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filters.sector_id || ''}
            onChange={(e) => updateFilter('sector_id', e.target.value ? Number(e.target.value) : undefined)}
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
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Active filters */}
      {(filters.sector_id || filters.year || filters.risk_level || filters.search) && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <button onClick={() => updateFilter('search', undefined)} className="ml-1 hover:text-text-primary">
                ×
              </button>
            </Badge>
          )}
          {filters.sector_id && (
            <Badge variant="secondary" className="gap-1">
              Sector: {SECTORS.find((s) => s.id === filters.sector_id)?.name}
              <button onClick={() => updateFilter('sector_id', undefined)} className="ml-1 hover:text-text-primary">
                ×
              </button>
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="gap-1">
              Year: {filters.year}
              <button onClick={() => updateFilter('year', undefined)} className="ml-1 hover:text-text-primary">
                ×
              </button>
            </Badge>
          )}
          {filters.risk_level && (
            <RiskBadge level={filters.risk_level} className="gap-1">
              {filters.risk_level}
              <button onClick={() => updateFilter('risk_level', undefined)} className="ml-1 hover:text-text-primary">
                ×
              </button>
            </RiskBadge>
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
            <div className="p-8 text-center text-text-muted">
              <p>Failed to load contracts</p>
              <p className="text-sm">{(error as Error).message}</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-background-card border-b border-border">
                  <tr className="text-left text-xs font-medium text-text-muted">
                    <th className="p-3">Contract</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Institution</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.data.map((contract) => (
                    <ContractRow key={contract.id} contract={contract} />
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing {(filters.page! - 1) * filters.per_page! + 1} -{' '}
            {Math.min(filters.page! * filters.per_page!, data.pagination.total)} of {formatNumber(data.pagination.total)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => updateFilter('page', filters.page! - 1)}
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

function ContractRow({ contract }: { contract: ContractListItem }) {
  return (
    <tr className="hover:bg-background-elevated/50 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-muted" />
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
            <Badge variant="outline" className="text-[10px]">
              DA
            </Badge>
          )}
          {contract.is_single_bid && (
            <Badge variant="outline" className="text-[10px]">
              SB
            </Badge>
          )}
        </div>
      </td>
    </tr>
  )
}
