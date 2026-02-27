import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * RiskScoreDisclaimer — compact (i) icon with tooltip explaining what risk scores mean.
 * Place next to risk score displays, column headers, and risk level legends.
 */
export function RiskScoreDisclaimer({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors ${className ?? ''}`}
          aria-label="Risk score interpretation"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        Risk scores measure statistical similarity to documented corruption
        patterns — not the probability of corruption. A score of 0.50 means
        this contract's procurement characteristics closely resemble those from
        known corruption cases. High scores warrant investigation, not
        presumption of guilt.
      </TooltipContent>
    </Tooltip>
  )
}
