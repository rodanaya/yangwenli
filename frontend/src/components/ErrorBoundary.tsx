import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

// Functional fallback UI — uses i18n hooks (class components cannot use hooks directly)
function ErrorFallbackUI({
  error,
  onReset,
  onGoHome,
}: {
  error: Error | null
  onReset: () => void
  onGoHome: () => void
}) {
  const { t } = useTranslation('common')
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-risk-high/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-risk-high">
            <AlertTriangle className="h-5 w-5" />
            {t('emptyState.errorTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-muted">
            {t('emptyState.unexpectedError')}
          </p>
          {error && (
            <pre className="rounded-md bg-background-elevated p-3 text-xs text-text-muted overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={onReset} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('emptyState.tryAgain')}
            </Button>
            <Button onClick={onGoHome} variant="outline" size="sm">
              <Home className="mr-2 h-4 w-4" />
              {t('emptyState.goHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallbackUI
          error={this.state.error}
          onReset={this.handleReset}
          onGoHome={this.handleGoHome}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
