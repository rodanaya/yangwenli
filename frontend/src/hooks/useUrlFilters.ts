/**
 * useUrlFilters — typed URL query parameters for RUBLI filter state.
 *
 * Built on `nuqs` (v2) for type-safe, URL-synced filter state.
 * All filter state is reflected in the URL, enabling shareable links.
 *
 * Section 4.8 — URL State Architecture
 */
import { useQueryState, parseAsInteger, parseAsString, parseAsStringEnum } from 'nuqs'

/** Risk levels used across the platform */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** Standard filter shape for list/table pages */
export interface UrlFilters {
  // Sector filter (1-12)
  sectorId: number | null
  setSectorId: (v: number | null) => void

  // Year filter
  year: number | null
  setYear: (v: number | null) => void

  // Risk level filter
  riskLevel: RiskLevel | null
  setRiskLevel: (v: RiskLevel | null) => void

  // Free-text search
  search: string | null
  setSearch: (v: string | null) => void

  // Pagination — page number (1-based)
  page: number
  setPage: (v: number | null) => void

  // Reset all filters to null (page resets to 1)
  reset: () => void
}

/**
 * Hook for pages that need sector + year + risk + search + page filters.
 *
 * @example
 * const { sectorId, setSectorId, year, setYear, riskLevel, search, page, reset } = useUrlFilters()
 */
export function useUrlFilters(): UrlFilters {
  const [sectorId, setSectorId] = useQueryState('sector', parseAsInteger)
  const [year, setYear] = useQueryState('year', parseAsInteger)
  const [riskLevel, setRiskLevel] = useQueryState(
    'risk',
    parseAsStringEnum<RiskLevel>(['low', 'medium', 'high', 'critical'])
  )
  const [search, setSearch] = useQueryState('q', parseAsString)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))

  function reset() {
    setSectorId(null)
    setYear(null)
    setRiskLevel(null)
    setSearch(null)
    setPage(null)
  }

  return {
    sectorId,
    setSectorId,
    year,
    setYear,
    riskLevel,
    setRiskLevel,
    search,
    setSearch,
    page: page ?? 1,
    setPage,
    reset,
  }
}

/**
 * Minimal hook for pages that only need search + page (e.g. Cases, Sectors).
 */
export function useUrlSearch() {
  const [search, setSearch] = useQueryState('q', parseAsString)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))

  return {
    search,
    setSearch,
    page: page ?? 1,
    setPage,
    reset: () => { setSearch(null); setPage(null) },
  }
}
