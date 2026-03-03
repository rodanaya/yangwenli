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

// Contract filtering and bulk export hooks
export { useContractFilters } from './useContractFilters'
export type { ContractFilterState, ContractFilterActions, FilterableContract } from './useContractFilters'
export { useBulkExport } from './useBulkExport'
export type { ExportOptions } from './useBulkExport'

// Re-export existing hooks
export { useTheme } from './useTheme'
