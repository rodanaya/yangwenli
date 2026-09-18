/**
 * useEmergencyData — the live cuts behind «El año de la emergencia» (SD-02).
 *
 * Four endpoints carry the five figures. Each hook keeps the query key the rest
 * of the app already uses for that endpoint, so a reader who arrives from
 * `/explore` or a vendor dossier reuses the cached response instead of
 * refetching, and the story's own figures share one request per endpoint
 * between them.
 *
 * `useQueries` is deliberate for the multi-year pulls: three `monthly-breakdown`
 * years and two `/sectors?year=` cuts issue in parallel rather than as a
 * three-deep waterfall.
 */
import { useQueries, useQuery } from '@tanstack/react-query'
import { analysisApi, sectorApi, vendorApi } from '@/api/client'
import type {
  ContractListItem,
  MonthlyBreakdownResponse,
  SectorListResponse,
  YearOverYearChange,
} from '@/api/types'

const HOUR = 60 * 60 * 1000

/** The annual series behind F1 (the floor) and F4 (the ratchet). */
export function useYearOverYear(enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: HOUR,
    enabled,
    select: (r: { data: YearOverYearChange[] }) => r.data,
  })
}

/**
 * F2's 36-month window. Same key as `RiskCalendarHeatmap`
 * (`['monthly-breakdown', year]`) so the two share one cache entry per year.
 */
export function useMonthlyYears(years: number[]) {
  return useQueries({
    queries: years.map((year) => ({
      queryKey: ['monthly-breakdown', year],
      queryFn: () => analysisApi.getMonthlyBreakdown(year),
      staleTime: HOUR,
    })),
    combine: (results: Array<{ data?: MonthlyBreakdownResponse; isPending: boolean; isError: boolean }>) => ({
      data: results.every((r) => r.data) ? (results.map((r) => r.data!) as MonthlyBreakdownResponse[]) : undefined,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  })
}

/**
 * Every award a vendor booked in one calendar year (F3).
 *
 * `per_page` is capped at 100 by the router, so this walks the pages rather
 * than asking for 200 and getting a 422. The walk is bounded: a vendor-year
 * with more than 500 awards would not fit the calendar anyway, and the figure
 * says so rather than drawing a partial year silently.
 */
export const VENDOR_YEAR_PAGE_CAP = 5

export function useVendorYearContracts(vendorId: number, year: number, enabled = true) {
  return useQuery({
    queryKey: ['vendor-year-contracts', vendorId, year],
    staleTime: HOUR,
    enabled,
    queryFn: async () => {
      const rows: ContractListItem[] = []
      let page = 1
      let totalPages = 1
      let total = 0
      while (page <= Math.min(totalPages, VENDOR_YEAR_PAGE_CAP)) {
        const res = await vendorApi.getContracts(vendorId, { year, per_page: 100, page })
        rows.push(...res.data)
        totalPages = res.pagination.total_pages
        total = res.pagination.total
        page += 1
      }
      return { rows, total, complete: rows.length === total }
    },
  })
}

/** F5's two cuts of `/sectors`, issued in parallel. */
export function useSectorsYears(years: [number, number], enabled = true) {
  return useQueries({
    queries: years.map((year) => ({
      queryKey: ['sectors', 'year', year],
      queryFn: () => sectorApi.getAll({ year }),
      staleTime: HOUR,
      enabled,
    })),
    combine: (results: Array<{ data?: SectorListResponse; isPending: boolean; isError: boolean }>) => ({
      data: results.every((r) => r.data) ? (results.map((r) => r.data!) as SectorListResponse[]) : undefined,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  })
}
