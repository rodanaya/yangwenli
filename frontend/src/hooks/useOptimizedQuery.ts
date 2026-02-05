import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions } from '@tanstack/react-query'

/**
 * Query key factory for consistent key generation across the app.
 * This ensures cache hits and proper invalidation.
 */
export const queryKeys = {
  // Contracts
  contracts: {
    all: ['contracts'] as const,
    list: (filters: Record<string, unknown>) => ['contracts', 'list', filters] as const,
    detail: (id: number) => ['contracts', 'detail', id] as const,
    statistics: (filters?: Record<string, unknown>) => ['contracts', 'statistics', filters] as const,
  },

  // Vendors
  vendors: {
    all: ['vendors'] as const,
    list: (filters: Record<string, unknown>) => ['vendors', 'list', filters] as const,
    detail: (id: number) => ['vendors', 'detail', id] as const,
    riskProfile: (id: number) => ['vendors', id, 'risk-profile'] as const,
    contracts: (id: number, filters?: Record<string, unknown>) => ['vendors', id, 'contracts', filters] as const,
    institutions: (id: number) => ['vendors', id, 'institutions'] as const,
    top: (metric: string, limit: number, filters?: Record<string, unknown>) => ['vendors', 'top', metric, limit, filters] as const,
  },

  // Institutions
  institutions: {
    all: ['institutions'] as const,
    list: (filters: Record<string, unknown>) => ['institutions', 'list', filters] as const,
    detail: (id: number) => ['institutions', 'detail', id] as const,
    contracts: (id: number, filters?: Record<string, unknown>) => ['institutions', id, 'contracts', filters] as const,
    vendors: (id: number) => ['institutions', id, 'vendors'] as const,
    top: (metric: string, limit: number) => ['institutions', 'top', metric, limit] as const,
  },

  // Sectors
  sectors: {
    all: ['sectors'] as const,
    list: () => ['sectors', 'list'] as const,
    detail: (id: number) => ['sectors', 'detail', id] as const,
    trends: (id: number) => ['sectors', id, 'trends'] as const,
    riskDistribution: (id: number) => ['sectors', id, 'risk-distribution'] as const,
  },

  // Analysis
  analysis: {
    overview: ['analysis', 'overview'] as const,
    riskDistribution: ['analysis', 'risk-distribution'] as const,
    yearOverYear: ['analysis', 'year-over-year'] as const,
    anomalies: (severity?: string) => ['analysis', 'anomalies', severity] as const,
    classificationStats: ['analysis', 'classification-stats'] as const,
  },
}

/**
 * Enhanced query hook with optimized defaults for this application.
 * Includes better stale time, caching, and error handling.
 */
export function useOptimizedQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError, TData> & {
    keepPreviousData?: boolean
  }
) {
  return useQuery({
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  })
}

/**
 * Hook for infinite scrolling / pagination with optimized defaults
 */
export function useOptimizedInfiniteQuery<TData, TError = Error>(
  options: UseInfiniteQueryOptions<TData, TError, TData>
) {
  return useInfiniteQuery({
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export default queryKeys
