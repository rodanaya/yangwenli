import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EvidenceUnavailableProps {
  title?: string
  detail?: string
  onRetry?: () => void
  className?: string
}

export function EvidenceUnavailable({
  title = 'Evidence unavailable',
  detail = 'This section could not be retrieved from the archive.',
  onRetry,
  className
}: EvidenceUnavailableProps) {
  return (
    <div className={cn('surface-card surface-card--warning p-5 flex items-start gap-3', className)}>
      <AlertTriangle className="h-4 w-4 text-risk-high flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold tracking-wide uppercase text-risk-high mb-1">
          {title}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">{detail}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-7 px-2 text-xs font-mono tracking-wide"
            onClick={onRetry}
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
