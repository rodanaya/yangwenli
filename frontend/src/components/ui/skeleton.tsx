import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean
}

function Skeleton({ className, shimmer = false, role, ...props }: SkeletonProps) {
  return (
    <div
      role={role ?? 'status'}
      aria-live="polite"
      aria-label={props['aria-label'] ?? 'Loading'}
      aria-busy="true"
      className={cn(
        'rounded-md bg-background-elevated',
        shimmer ? 'animate-shimmer' : 'animate-pulse',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
