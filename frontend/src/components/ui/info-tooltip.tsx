import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  /** Glossary key - looks up glossary:{termKey} in i18n */
  termKey: string
  /** Optional inline label to show next to the icon */
  label?: string
  /** Size of the help icon */
  size?: number
  /** Additional className for the icon */
  className?: string
  /** Side of the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Whether to show as inline (within text) or block */
  inline?: boolean
}

/**
 * InfoTooltip - Shows a help icon that reveals an explanation on hover.
 *
 * Uses the 'glossary' i18n namespace for bilingual term definitions.
 * Each term has a 'title' and 'description' key.
 *
 * Usage:
 *   <InfoTooltip termKey="riskScore" />
 *   <InfoTooltip termKey="singleBid" label="Single Bid" />
 */
export function InfoTooltip({ termKey, label, size = 14, className, side = 'top', inline = true }: InfoTooltipProps) {
  const { t } = useTranslation('glossary')

  const title = t(`${termKey}.title`, { defaultValue: '' })
  const description = t(`${termKey}.description`, { defaultValue: '' })

  if (!title && !description) return null

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-text-muted hover:text-text-secondary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm',
            inline ? 'inline-flex items-center align-middle ml-1' : 'flex items-center gap-1.5',
            className
          )}
          aria-label={title}
        >
          {label && <span className="text-xs font-medium">{label}</span>}
          <HelpCircle className="shrink-0" size={size} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-3">
        {title && <p className="font-semibold text-xs mb-1">{title}</p>}
        {description && <p className="text-xs text-text-secondary leading-relaxed">{description}</p>}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * GlossaryBadge - Shows a term with built-in tooltip explanation.
 * Useful for inline text where you want to explain a term on hover.
 */
export function GlossaryBadge({ termKey, children, className }: {
  termKey: string
  children: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation('glossary')

  const title = t(`${termKey}.title`, { defaultValue: '' })
  const description = t(`${termKey}.description`, { defaultValue: '' })

  if (!title && !description) return <>{children}</>

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={cn(
          'underline decoration-dotted decoration-text-muted/50 underline-offset-2 cursor-help',
          className
        )}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        {title && <p className="font-semibold text-xs mb-1">{title}</p>}
        {description && <p className="text-xs text-text-secondary leading-relaxed">{description}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
