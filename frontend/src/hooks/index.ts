// Search and filtering hooks
export { useDebouncedSearch, useDebouncedValue } from './useDebouncedSearch'
export { useDeferredFilters, useFiltersWithDeferred } from './useDeferredFilters'

// Query optimization hooks
export { default as queryKeys, useOptimizedQuery, useOptimizedInfiniteQuery } from './useOptimizedQuery'
export { usePrefetchOnHover, usePrefetchList } from './usePrefetchOnHover'

// View management hooks
export { useSavedViews } from './useSavedViews'
export type { SavedView } from './useSavedViews'

// URL state hooks (nuqs-backed)
export { useUrlFilters, useUrlSearch } from './useUrlFilters'
export type { UrlFilters, RiskLevel } from './useUrlFilters'

// Re-export existing hooks
export { useTheme } from './useTheme'
