/**
 * RiskFeedbackButton — feature 4.7 (False Positive Feedback Loop)
 *
 * Renders a small flag icon next to a risk score.  Clicking it opens a
 * compact dialog that lets an analyst mark the entity as:
 *   • not_suspicious
 *   • confirmed_suspicious
 *   • needs_review
 *
 * The choice is persisted via POST /api/v1/feedback (upsert semantics).
 * Existing feedback is fetched on mount and reflected in the icon's state.
 */
import { useState } from 'react'
import { Flag, CheckCircle2, AlertCircle, HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '@/api/client'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Option definitions
// ---------------------------------------------------------------------------

type FeedbackType = 'not_suspicious' | 'confirmed_suspicious' | 'needs_review'

const FEEDBACK_OPTIONS: {
  value: FeedbackType
  label: string
  description: string
  Icon: React.ElementType
  colorClass: string
}[] = [
  {
    value: 'not_suspicious',
    label: 'Not suspicious',
    description: 'Reviewed — no corruption indicators found',
    Icon: CheckCircle2,
    colorClass: 'text-emerald-500',
  },
  {
    value: 'confirmed_suspicious',
    label: 'Confirmed suspicious',
    description: 'Evidence of irregularity or corruption found',
    Icon: AlertCircle,
    colorClass: 'text-red-500',
  },
  {
    value: 'needs_review',
    label: 'Needs review',
    description: 'Flagged for deeper manual investigation',
    Icon: HelpCircle,
    colorClass: 'text-amber-500',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RiskFeedbackButtonProps {
  entityType: 'vendor' | 'institution' | 'contract'
  entityId: number
  className?: string
}

export function RiskFeedbackButton({
  entityType,
  entityId,
  className,
}: RiskFeedbackButtonProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const qKey = ['feedback', entityType, entityId] as const

  // Fetch existing feedback (null if none)
  const { data: existing, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => feedbackApi.get(entityType, entityId),
    staleTime: 5 * 60 * 1000,
  })

  const submitMutation = useMutation({
    mutationFn: (feedbackType: FeedbackType) =>
      feedbackApi.submit({
        entity_type: entityType,
        entity_id: entityId,
        feedback_type: feedbackType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey })
      setOpen(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => feedbackApi.remove(entityType, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey })
      setOpen(false)
    },
  })

  const currentOpt = FEEDBACK_OPTIONS.find(
    (o) => o.value === existing?.feedback_type
  )
  const hasFeedback = !!existing && !isLoading
  const TriggerIcon = currentOpt?.Icon ?? Flag

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 transition-opacity',
          hasFeedback ? 'opacity-100' : 'opacity-40 hover:opacity-80',
          currentOpt?.colorClass,
          className
        )}
        onClick={() => setOpen(true)}
        aria-label={hasFeedback ? `Feedback: ${currentOpt?.label}` : 'Submit risk feedback'}
        title={hasFeedback ? `Analyst feedback: ${currentOpt?.label}` : 'Mark this entity'}
      >
        <TriggerIcon className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Analyst Feedback
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1 mb-3">
            Mark this {entityType} to track your assessment alongside the AI
            risk score.
          </p>

          <div className="space-y-1">
            {FEEDBACK_OPTIONS.map((opt) => {
              const Icon = opt.Icon
              const isSelected = existing?.feedback_type === opt.value
              const isLoading = submitMutation.isPending && submitMutation.variables === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => submitMutation.mutate(opt.value)}
                  disabled={submitMutation.isPending || removeMutation.isPending}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    'hover:bg-accent/10 disabled:opacity-50',
                    isSelected && 'bg-accent/10 ring-1 ring-accent/20'
                  )}
                  aria-pressed={isSelected}
                >
                  <Icon
                    className={cn('h-4 w-4 mt-0.5 flex-shrink-0', opt.colorClass)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium leading-tight">
                      {opt.label}
                      {isSelected && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                          (current)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {opt.description}
                    </div>
                  </div>
                  {isLoading && (
                    <span className="ml-auto text-[10px] text-muted-foreground">saving…</span>
                  )}
                </button>
              )
            })}
          </div>

          {hasFeedback && (
            <>
              <div className="my-3 h-px bg-border/40" />
              <button
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending || submitMutation.isPending}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-xs',
                  'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                  'transition-colors disabled:opacity-50'
                )}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {removeMutation.isPending ? 'Clearing…' : 'Clear feedback'}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
