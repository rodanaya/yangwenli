import { cn } from '@/lib/utils'

interface FuentePillProps {
  source: string
  count?: number
  countLabel?: string
  verified?: boolean
  className?: string
}

export function FuentePill({
  source,
  count,
  countLabel = 'contratos',
  verified = false,
  className,
}: FuentePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono',
        'bg-background-elevated text-text-secondary border border-border',
        className
      )}
    >
      <span aria-hidden="true">&#128196;</span>
      <span className="text-text-primary font-semibold">{source}</span>
      {count != null && (
        <span className="text-text-muted">
          &middot; {count.toLocaleString()} {countLabel}
        </span>
      )}
      {verified && (
        <span className="inline-flex items-center gap-0.5 text-emerald-500 font-semibold ml-0.5">
          &#10003; verificado
        </span>
      )}
    </span>
  )
}

export default FuentePill
