import { useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { institutionApi } from '@/api/client'
import type { InstitutionFilterParams, InstitutionResponse } from '@/api/types'
import { Building2, Search, ChevronLeft, ChevronRight, ExternalLink, AlertCircle, RefreshCw, Building, Loader2 } from 'lucide-react'
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'

export function Institutions() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Debounced search - reduces API calls
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    debouncedValue: debouncedSearch,
    isPending: isSearchPending,
  } = useDebouncedSearch(searchParams.get('search') || '', { delay: 300, minLength: 2 })

  const filters: InstitutionFilterParams = useMemo(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: Number(searchParams.get('per_page')) || 50,
    search: debouncedSearch || undefined,
    institution_type: searchParams.get('type') || undefined,
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

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['institutions', filters],
    queryFn: () => institutionApi.getAll(filters),
  })

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-accent" />
            Institutions
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {data ? `${formatNumber(data.pagination.total)} government entities` : 'Loading...'}
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
            <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load institutions</h3>
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
              <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>
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

function InstitutionCard({ institution, style }: { institution: InstitutionResponse; style?: React.CSSProperties }) {
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

export default Institutions
