import { useCallback, useRef } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'

interface UsePrefetchOnHoverOptions<T> {
  queryKey: QueryKey
  queryFn: () => Promise<T>
  delay?: number
  staleTime?: number
}

interface UsePrefetchOnHoverReturn {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
}

/**
 * Hook for prefetching data when user hovers over or focuses an element.
 * This enables instant page transitions by preloading data before navigation.
 *
 * @example
 * ```tsx
 * const prefetch = usePrefetchOnHover({
 *   queryKey: ['vendor', vendorId],
 *   queryFn: () => vendorApi.getById(vendorId),
 *   delay: 100,
 * });
 *
 * <Link to={`/vendors/${vendorId}`} {...prefetch}>
 *   View Vendor
 * </Link>
 * ```
 */
export function usePrefetchOnHover<T>({
  queryKey,
  queryFn,
  delay = 100,
  staleTime = 5 * 60 * 1000,
}: UsePrefetchOnHoverOptions<T>): UsePrefetchOnHoverReturn {
  const queryClient = useQueryClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    })
  }, [queryClient, queryKey, queryFn, staleTime])

  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(prefetch, delay)
  }, [prefetch, delay])

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const onFocus = useCallback(() => {
    // Prefetch immediately on focus (keyboard navigation)
    prefetch()
  }, [prefetch])

  return {
    onMouseEnter,
    onMouseLeave,
    onFocus,
  }
}

/**
 * Hook for prefetching a list of items (e.g., visible rows in a table)
 */
export function usePrefetchList<T>(
  items: Array<{ id: number | string }>,
  getQueryKey: (id: number | string) => QueryKey,
  getQueryFn: (id: number | string) => () => Promise<T>,
  options?: { staleTime?: number }
) {
  const queryClient = useQueryClient()
  const { staleTime = 5 * 60 * 1000 } = options || {}

  const prefetchItem = useCallback(
    (id: number | string) => {
      queryClient.prefetchQuery({
        queryKey: getQueryKey(id),
        queryFn: getQueryFn(id),
        staleTime,
      })
    },
    [queryClient, getQueryKey, getQueryFn, staleTime]
  )

  const prefetchVisible = useCallback(
    (startIndex: number, endIndex: number) => {
      const visibleItems = items.slice(startIndex, endIndex + 1)
      visibleItems.forEach((item) => prefetchItem(item.id))
    },
    [items, prefetchItem]
  )

  return {
    prefetchItem,
    prefetchVisible,
  }
}

export default usePrefetchOnHover
