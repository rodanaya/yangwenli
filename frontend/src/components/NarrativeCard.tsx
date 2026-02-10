/**
 * NarrativeCard
 * Renders data as human-readable paragraphs with inline highlights.
 * Each paragraph can have a severity level that colors its left border.
 */

import { cn } from '@/lib/utils'
import type { NarrativeParagraph } from '@/lib/narratives'

interface NarrativeCardProps {
  paragraphs: NarrativeParagraph[]
  className?: string
  /** Compact mode uses smaller text */
  compact?: boolean
}

const severityStyles: Record<string, string> = {
  info: 'border-l-blue-500/50',
  warning: 'border-l-risk-high/50',
  critical: 'border-l-risk-critical/50',
}

export function NarrativeCard({ paragraphs, className, compact = false }: NarrativeCardProps) {
  if (paragraphs.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background-card/50 p-4 space-y-3',
        className,
      )}
    >
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={cn(
            compact ? 'text-xs' : 'text-sm',
            'leading-relaxed text-text-secondary',
            p.severity && `border-l-2 pl-3 ${severityStyles[p.severity] || ''}`,
          )}
        >
          {p.text}
        </p>
      ))}
    </div>
  )
}

/**
 * InlineNarrative — renders a single paragraph without card chrome.
 * Useful for small inline summaries on cards.
 */
export function InlineNarrative({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <p className={cn('text-xs leading-relaxed text-text-muted', className)}>
      {text}
    </p>
  )
}
