import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { institutionApi } from '@/api/client'
import type { InstitutionFilterParams, InstitutionResponse } from '@/api/types'
import { Building2, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

export function Institutions() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: InstitutionFilterParams = {
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    search: searchParams.get('search') || undefined,
    institution_type: searchParams.get('type') || undefined,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['institutions', filters],
    queryFn: () => institutionApi.getAll(filters),
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
          <h2 className="text-lg font-semibold">Institutions</h2>
          <p className="text-sm text-text-muted">
            {data ? `${formatNumber(data.pagination.total)} institutions` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search institutions..."
              className="h-9 rounded-md border border-border bg-background-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          <select
            className="h-9 rounded-md border border-border bg-background-card px-3 text-sm"
            value={filters.institution_type || ''}
            onChange={(e) => updateFilter('type', e.target.value || undefined)}
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
          <CardContent className="p-8 text-center text-text-muted">
            <p>Failed to load institutions</p>
            <p className="text-sm">{(error as Error).message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((institution) => (
            <InstitutionCard key={institution.id} institution={institution} />
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

function InstitutionCard({ institution }: { institution: InstitutionResponse }) {
  return (
    <Card className="hover:border-border-hover transition-colors">
      <CardContent className="p-4">
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
                {institution.name}
              </Link>
              {institution.siglas && <p className="text-xs text-text-muted">{institution.siglas}</p>}
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
            <p className="font-medium tabular-nums">{formatNumber(institution.total_contracts || 0)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Total Spending</p>
            <p className="font-medium tabular-nums">{formatCompactMXN(institution.total_amount_mxn || 0)}</p>
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
