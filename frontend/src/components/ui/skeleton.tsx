import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
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
