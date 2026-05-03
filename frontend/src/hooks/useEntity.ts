/**
 * useEntity — universal entity data fetcher with shared TanStack Query cache key.
 *
 * Per docs/FRONTEND_V3_PLAN.md task P1.5.
 *
 * Motivation: before this hook, every page that displayed a vendor or institution
 * called useQuery with its own ad-hoc key shape ('vendor-detail', vendorId) or
 * ['vendors', id] etc. This meant the same vendor fetched by VendorProfile,
 * EntityIdentityChip hover cards, and RedThread could be triple-cached under
 * three different keys, tripling network requests.
 *
 * This hook establishes ONE canonical cache key: ['entity', type, id].
 * Any component that fetches an entity through this hook benefits from the
 * shared cache — if VendorProfile already fetched vendor 29277, a story chip
 * hover-card for the same vendor gets the data instantly.
 *
 * Usage:
 *   const { data, isLoading, error } = useEntity('vendor', 29277)
 *   const { data } = useEntity('institution', 15)
 *
 * Returns the same shape as the underlying API endpoint. For 'vendor' this
 * is VendorDetailResponse; for 'institution' InstitutionDetailResponse.
 * For unsupported types (sector, category, etc.) the hook returns null data
 * immediately so callers can fall back to their own fetches.
 */

import { useQuery } from '@tanstack/react-query'
import { vendorApi, institutionApi } from '@/api/client'
import type { VendorDetailResponse, InstitutionDetailResponse } from '@/api/types'
import type { EntityType } from '@/lib/entity/format'

// ---------------------------------------------------------------------------
// Return type union
// ---------------------------------------------------------------------------

type EntityDataMap = {
  vendor: VendorDetailResponse
  institution: InstitutionDetailResponse
  sector: null
  category: null
  case: null
  pattern: null
  network: null
  investigation: null
  story: null
}

type EntityResult<T extends EntityType> = {
  data: EntityDataMap[T] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

// ---------------------------------------------------------------------------
// Canonical cache key factory — exported so page-level queries can opt in
// ---------------------------------------------------------------------------

export function entityQueryKey(type: EntityType, id: number): [string, EntityType, number] {
  return ['entity', type, id]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEntity<T extends EntityType>(
  type: T,
  id: number,
  options: { enabled?: boolean; staleTime?: number } = {},
): EntityResult<T> {
  const { enabled = true, staleTime = 10 * 60 * 1000 } = options

  const query = useQuery({
    queryKey: entityQueryKey(type, id),
    queryFn: async () => {
      switch (type) {
        case 'vendor':
          return vendorApi.getById(id) as Promise<EntityDataMap[T]>
        case 'institution':
          return institutionApi.getById(id) as Promise<EntityDataMap[T]>
        default:
          // Sector / category / pattern / etc. have no single-entity endpoint yet.
          // Return null so callers can fall back to their own fetches.
          return null as EntityDataMap[T]
      }
    },
    enabled: enabled && id > 0,
    staleTime,
  })

  return {
    data: query.data as EntityDataMap[T] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// Convenience typed wrappers — preferred for page-level usage
// ---------------------------------------------------------------------------

export function useVendorEntity(id: number, options?: { enabled?: boolean }) {
  return useEntity('vendor', id, options)
}

export function useInstitutionEntity(id: number, options?: { enabled?: boolean }) {
  return useEntity('institution', id, options)
}
