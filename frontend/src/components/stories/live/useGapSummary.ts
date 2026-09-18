/**
 * useGapSummary — the `/gap/summary` cut, shared with the `/gap` page.
 *
 * Same query key and staleTime as `pages/Gap.tsx`, so a reader who arrives at
 * the story from `/gap` (or leaves for it) reuses one cached response, and the
 * five live figures in `el-vacio` issue ONE request between them rather than
 * five — no waterfall, no per-figure fetch.
 */
import { useQuery } from '@tanstack/react-query'
import { gapApi } from '@/api/client'

export function useGapSummary() {
  return useQuery({
    queryKey: ['gap-summary'],
    queryFn: () => gapApi.getSummary(),
    staleTime: 10 * 60 * 1000,
  })
}
