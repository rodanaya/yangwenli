/**
 * SectionDescription
 * Text block for adding descriptions at top of page sections.
 * Variants: default, callout, warning.
 */

import { cn } from '@/lib/utils'
import { Info, AlertTriangle, BookOpen } from 'lucide-react'

type Variant = 'default' | 'callout' | 'warning'

interface SectionDescriptionProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
  /** Optional title displayed above the description */
  title?: string
}

const variantStyles: Record<Variant, { container: string; icon: React.ElementType }> = {
  default: {
    container: 'border-border bg-background-card/30',
    icon: BookOpen,
  },
  callout: {
    container: 'border-blue-500/30 bg-blue-500/5',
    icon: Info,
  },
  warning: {
    container: 'border-risk-high/30 bg-risk-high/5',
    icon: AlertTriangle,
  },
}

export function SectionDescription({
  children,
  variant = 'default',
  className,
  title,
}: SectionDescriptionProps) {
  const styles = variantStyles[variant]
  const Icon = styles.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex gap-3',
        styles.container,
        className,
      )}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="space-y-1 min-w-0">
        {title && (
          <p className="text-sm font-medium text-text-primary">{title}</p>
        )}
        <div className="text-xs leading-relaxed text-text-secondary">
          {children}
        </div>
      </div>
    </div>
  )
}
