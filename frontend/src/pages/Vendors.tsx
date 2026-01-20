import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { vendorApi } from '@/api/client'
import type { VendorFilterParams, VendorListItem } from '@/api/types'
import { Users, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

export function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: VendorFilterParams = {
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    search: searchParams.get('search') || undefined,
    risk_level: searchParams.get('risk_level') as VendorFilterParams['risk_level'],
    min_contracts: searchParams.get('min_contracts') ? Number(searchParams.get('min_contracts')) : undefined,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => vendorApi.getAll(filters),
  })

  const updateFilter = (key: string, value: string | number | undefined) => {
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
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vendors</h2>
          <p className="text-sm text-text-muted">
            {data ? `${formatNumber(data.pagination.total)} vendors` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search vendors..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm"
            value={filters.risk_level || ''}
            onChange={(e) => updateFilter('risk_level', e.target.value || undefined)}
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
          >
            <option value="">Any Contracts</option>
            <option value="10">10+ contracts</option>
            <option value="50">50+ contracts</option>
            <option value="100">100+ contracts</option>
            <option value="500">500+ contracts</option>
          </select>
        </div>
      </div>

      {/* Vendors grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-text-muted">
            <p>Failed to load vendors</p>
            <p className="text-sm">{(error as Error).message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
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

function VendorCard({ vendor }: { vendor: VendorListItem }) {
  return (
    <Card className="hover:border-border-hover transition-colors">
      <CardContent className="p-4">
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
                {vendor.name}
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
            <p className="font-medium tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Direct Awards</p>
            <p className="font-medium tabular-nums">{formatPercent(vendor.direct_award_pct)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">High Risk</p>
            <p className="font-medium tabular-nums">{formatPercent(vendor.high_risk_pct)}</p>
          </div>
        </div>

        {vendor.first_contract_year && vendor.last_contract_year && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>
              Active: {vendor.first_contract_year} - {vendor.last_contract_year}
            </span>
            <Link
              to={`/vendors/${vendor.id}`}
              className="flex items-center gap-1 text-accent hover:underline"
            >
              View details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
