import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ariaApi } from '@/api/client'

/**
 * Shared ARIA triage mutations — extracted from the retired ReviewPopover so
 * the verdict bar (RowExpand) and the estado cell share one write path.
 * Review saves now also invalidate ['aria-stats'] so the DISPOSICIÓN strip
 * moves within the in-memory TTL (the precomputed fallback stays as-of-run —
 * the strip's dateline carries that honesty).
 */
export function useReviewMutations(vendorId: number) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['aria-queue-leads'] })
    queryClient.invalidateQueries({ queryKey: ['aria-stats'] })
    queryClient.invalidateQueries({ queryKey: ['aria-lead-detail', vendorId] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: 'pending' | 'reviewing' | 'confirmed' | 'dismissed') =>
      ariaApi.updateReview(vendorId, { review_status: status }),
    onSuccess: invalidate,
  })

  const promoteMutation = useMutation({
    mutationFn: (confidence: 'low' | 'medium' | 'high') =>
      ariaApi.promoteToGroundTruth(vendorId, { confidence_level: confidence }),
    onSuccess: invalidate,
  })

  return {
    setStatus: statusMutation.mutate,
    isSaving: statusMutation.isPending,
    promote: promoteMutation.mutate,
    isPromoting: promoteMutation.isPending,
    promoted: promoteMutation.isSuccess,
    isError: statusMutation.isError || promoteMutation.isError,
  }
}
