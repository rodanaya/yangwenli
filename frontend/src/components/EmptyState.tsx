/**
 * Reusable Empty State Component
 * Provides consistent empty state messaging across the application
 */

import type { LucideIcon } from 'lucide-react'
import { AlertCircle, RefreshCw, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  /** Icon to display (from lucide-react) */
  icon?: LucideIcon
  /** Main heading */
  title: string
  /** Descriptive message */
  description?: string
  /** Action button label */
  actionLabel?: string
  /** Action button callback */
  onAction?: () => void
  /** Show loading state on action button */
  loading?: boolean
  /** Additional CSS classes */
  className?: string
  /** Variant for different contexts */
  variant?: 'default' | 'error' | 'no-results' | 'coming-soon'
}

const variantConfig = {
  default: {
    icon: FileX,
    iconClass: 'text-text-muted opacity-50',
    containerClass: '',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-risk-high',
    containerClass: '',
  },
  'no-results': {
    icon: FileX,
    iconClass: 'text-text-muted opacity-30',
    containerClass: '',
  },
  'coming-soon': {
    icon: FileX,
    iconClass: 'text-accent opacity-50',
    containerClass: 'border-accent/20',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
  className = '',
  variant = 'default',
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = icon || config.icon

  return (
    <Card className={`${config.containerClass} ${className}`}>
      <CardContent className="p-8 text-center">
        <Icon
          className={`h-12 w-12 mx-auto mb-4 ${config.iconClass}`}
          aria-hidden="true"
        />
        <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            disabled={loading}
          >
            {loading && (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Pre-configured empty states for common use cases
export function NoResultsState({
  entityName = 'items',
  hasFilters = false,
  onClearFilters,
}: {
  entityName?: string
  hasFilters?: boolean
  onClearFilters?: () => void
}) {
  return (
    <EmptyState
      variant="no-results"
      title={`No ${entityName} found`}
      description={
        hasFilters
          ? 'Try adjusting your filters to see more results.'
          : `No ${entityName} are available in the database.`
      }
      actionLabel={hasFilters ? 'Clear all filters' : undefined}
      onAction={onClearFilters}
    />
  )
}

export function ErrorState({
  message,
  onRetry,
  loading = false,
}: {
  message?: string
  onRetry?: () => void
  loading?: boolean
}) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description={
        message === 'Network Error'
          ? 'Unable to connect to server. Please check if the backend is running.'
          : message || 'An unexpected error occurred.'
      }
      actionLabel="Try again"
      onAction={onRetry}
      loading={loading}
    />
  )
}

export function LoadingTimeoutState({
  onRetry,
}: {
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="error"
      title="Loading is taking longer than expected"
      description="The data might still be loading. You can wait or try again."
      actionLabel="Retry"
      onAction={onRetry}
    />
  )
}

export function ComingSoonState({
  featureName,
}: {
  featureName: string
}) {
  return (
    <EmptyState
      variant="coming-soon"
      title={`${featureName} Coming Soon`}
      description="This feature is currently under development and will be available in a future update."
    />
  )
}

export default EmptyState
