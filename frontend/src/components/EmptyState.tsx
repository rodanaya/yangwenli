/**
 * Reusable Empty State Component
 * Provides consistent empty state messaging across the application
 */

import type { LucideIcon } from 'lucide-react'
import { AlertCircle, RefreshCw, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// SVG Illustrations for different states
const NoDataIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-4"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="80" className="fill-background-elevated" />
    <rect x="60" y="50" width="80" height="100" rx="4" className="fill-border stroke-text-muted" strokeWidth="2" />
    <rect x="70" y="65" width="40" height="4" rx="2" className="fill-text-muted/30" />
    <rect x="70" y="80" width="60" height="4" rx="2" className="fill-text-muted/30" />
    <rect x="70" y="95" width="50" height="4" rx="2" className="fill-text-muted/30" />
    <rect x="70" y="110" width="55" height="4" rx="2" className="fill-text-muted/30" />
    <circle cx="145" cy="145" r="30" className="fill-background-card stroke-text-muted" strokeWidth="2" />
    <path d="M135 145 L155 145 M145 135 L145 155" className="stroke-text-muted/50" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const ErrorIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-4"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="80" className="fill-risk-critical/10" />
    <circle cx="100" cy="100" r="50" className="fill-risk-critical/20 stroke-risk-critical" strokeWidth="3" />
    <path d="M100 70 L100 110" className="stroke-risk-critical" strokeWidth="6" strokeLinecap="round" />
    <circle cx="100" cy="130" r="4" className="fill-risk-critical" />
  </svg>
)

const SearchIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-4"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="80" className="fill-background-elevated" />
    <circle cx="90" cy="90" r="35" className="fill-background-card stroke-text-muted" strokeWidth="3" />
    <circle cx="90" cy="90" r="20" className="fill-background-elevated" />
    <path d="M115 115 L145 145" className="stroke-text-muted" strokeWidth="6" strokeLinecap="round" />
    <path d="M80 85 L100 85 M80 95 L95 95" className="stroke-text-muted/50" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const ComingSoonIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-4"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="80" className="fill-accent/10" />
    <rect x="60" y="60" width="80" height="80" rx="8" className="fill-background-card stroke-accent" strokeWidth="2" />
    <circle cx="100" cy="95" r="15" className="fill-accent/20 stroke-accent" strokeWidth="2" />
    <path d="M100 88 L100 95 L105 100" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="75" y="120" width="50" height="6" rx="3" className="fill-accent/30" />
  </svg>
)

interface EmptyStateProps {
  /** Icon to display (from lucide-react) - will be replaced by illustration if useIllustration is true */
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
  /** Use SVG illustration instead of icon */
  useIllustration?: boolean
}

const variantConfig = {
  default: {
    icon: FileX,
    iconClass: 'text-text-muted opacity-50',
    containerClass: '',
    Illustration: NoDataIllustration,
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-risk-high',
    containerClass: 'border-risk-critical/30',
    Illustration: ErrorIllustration,
  },
  'no-results': {
    icon: FileX,
    iconClass: 'text-text-muted opacity-30',
    containerClass: '',
    Illustration: SearchIllustration,
  },
  'coming-soon': {
    icon: FileX,
    iconClass: 'text-accent opacity-50',
    containerClass: 'border-accent/20',
    Illustration: ComingSoonIllustration,
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
  useIllustration = true,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = icon || config.icon
  const Illustration = config.Illustration

  return (
    <Card className={`${config.containerClass} ${className}`}>
      <CardContent className="py-12 px-8 text-center">
        {useIllustration ? (
          <Illustration />
        ) : (
          <Icon
            className={`h-16 w-16 mx-auto mb-4 ${config.iconClass}`}
            aria-hidden="true"
          />
        )}
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            disabled={loading}
            className="mt-2"
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
