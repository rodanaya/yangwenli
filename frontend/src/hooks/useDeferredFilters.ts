import { useDeferredValue, useMemo } from 'react'

/**
 * Hook for deferring filter updates using React 18's useDeferredValue.
 * This keeps the UI responsive by allowing React to defer expensive updates.
 *
 * Use this when you have filter state that triggers expensive re-renders
 * or data fetching, and you want to keep the UI responsive while typing.
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState({ search: '', sector: null });
 * const deferredFilters = useDeferredFilters(filters);
 * const isStale = filters !== deferredFilters;
 *
 * // Use filters for input values (immediate)
 * // Use deferredFilters for queries (deferred)
 *
 * <input
 *   value={filters.search}
 *   onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
 * />
 * <div className={isStale ? 'opacity-70' : ''}>
 *   <DataTable filters={deferredFilters} />
 * </div>
 * ```
 */
export function useDeferredFilters<T extends Record<string, unknown>>(filters: T): T {
  return useDeferredValue(filters)
}

/**
 * Hook that provides both immediate and deferred filter states,
 * plus a stale indicator for visual feedback.
 */
export function useFiltersWithDeferred<T extends Record<string, unknown>>(filters: T) {
  const deferredFilters = useDeferredValue(filters)

  const isStale = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(deferredFilters),
    [filters, deferredFilters]
  )

  return {
    filters,
    deferredFilters,
    isStale,
  }
}

export default useDeferredFilters
