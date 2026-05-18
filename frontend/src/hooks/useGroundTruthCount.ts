import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { GROUND_TRUTH_CASE_COUNT_FALLBACK, GROUND_TRUTH_VENDOR_COUNT_FALLBACK } from '@/lib/constants'

/**
 * Returns live ground-truth counts from the executive summary API,
 * falling back to compiled constants when the request is still loading
 * or fails. This prevents stale hardcoded values from accumulating
 * across files after each retraining event.
 */
export function useGroundTruthCount() {
  const { data } = useQuery({
    queryKey: ['executive-summary-gt-count'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })
  return {
    cases: data?.ground_truth?.cases ?? GROUND_TRUTH_CASE_COUNT_FALLBACK,
    vendors: data?.ground_truth?.vendors ?? GROUND_TRUTH_VENDOR_COUNT_FALLBACK,
  }
}
