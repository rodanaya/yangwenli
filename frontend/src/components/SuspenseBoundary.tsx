import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { PageSkeleton } from './LoadingSkeleton'

interface SuspenseBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  errorFallback?: ReactNode
  onReset?: () => void
}

/**
 * Combined ErrorBoundary + Suspense wrapper for lazy-loaded components.
 * Provides a consistent error handling and loading experience.
 */
export function SuspenseBoundary({
  children,
  fallback = <PageSkeleton />,
  errorFallback,
  onReset,
}: SuspenseBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onReset={onReset}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default SuspenseBoundary
