import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Users, Building2, Loader2, Check, X, AlertTriangle } from 'lucide-react'
import { exportApi } from '@/api/client'
import { formatNumber } from '@/lib/utils'

type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

// Export limits and estimates
const EXPORT_LIMITS = {
  contracts: { default: 10000, max: 50000, estimatedSizeMB: 2.5 },
  vendors: { default: 10000, max: 50000, estimatedSizeMB: 1.5 },
  institutions: { default: 5000, max: 10000, estimatedSizeMB: 0.8 },
}

export function Export() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Download className="h-4.5 w-4.5 text-accent" />
          Export Data
        </h2>
        <p className="text-xs text-text-muted mt-0.5">Download procurement data in various formats</p>
      </div>

      {/* Export size warning */}
      <Card className="border-risk-medium/30 bg-risk-medium/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-risk-medium flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-primary">Export Limits</p>
            <p className="text-xs text-text-muted mt-1">
              Exports are limited to {formatNumber(EXPORT_LIMITS.contracts.default)} records by default.
              For larger exports, please contact the administrator or use the API directly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          title="Contracts"
          description="Export contract data with risk scores and classifications"
          icon={FileText}
          estimatedRecords={EXPORT_LIMITS.contracts.default}
          estimatedSizeMB={EXPORT_LIMITS.contracts.estimatedSizeMB}
          formats={['CSV']}
          onExport={async (format) => {
            if (format === 'CSV') {
              const blob = await exportApi.exportContracts({ limit: EXPORT_LIMITS.contracts.default })
              downloadBlob(blob, `contracts_${getTimestamp()}.csv`)
            } else {
              throw new Error(`${format} export not yet implemented`)
            }
          }}
          onSuccess={(format) => showToast(`Contracts exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
        <ExportCard
          title="Vendors"
          description="Export vendor profiles with risk metrics and classifications"
          icon={Users}
          estimatedRecords={EXPORT_LIMITS.vendors.default}
          estimatedSizeMB={EXPORT_LIMITS.vendors.estimatedSizeMB}
          formats={['CSV']}
          onExport={async (format) => {
            if (format === 'CSV') {
              const blob = await exportApi.exportVendors({ limit: EXPORT_LIMITS.vendors.default })
              downloadBlob(blob, `vendors_${getTimestamp()}.csv`)
            } else {
              throw new Error(`${format} export not yet implemented for vendors`)
            }
          }}
          onSuccess={(format) => showToast(`Vendors exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
        <ExportCard
          title="Institutions"
          description="Export institution data with spending analysis"
          icon={Building2}
          estimatedRecords={EXPORT_LIMITS.institutions.default}
          estimatedSizeMB={EXPORT_LIMITS.institutions.estimatedSizeMB}
          formats={['CSV']}
          disabled
          disabledReason="Coming soon"
          onExport={async (_format) => {
            throw new Error('Institution export coming soon')
          }}
          onSuccess={(format) => showToast(`Institutions exported as ${format} successfully!`, 'success')}
          onError={(error) => showToast(`Export failed: ${error}`, 'error')}
        />
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success'
                ? 'bg-risk-low/90 text-white'
                : toast.type === 'warning'
                  ? 'bg-risk-medium/90 text-white'
                  : 'bg-risk-critical/90 text-white'
            }`}
            role="alert"
            aria-live="polite"
          >
            {toast.type === 'success' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

function getTimestamp() {
  const now = new Date()
  return now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface ExportCardProps {
  title: string
  description: string
  icon: React.ElementType
  formats?: string[]
  estimatedRecords?: number
  estimatedSizeMB?: number
  disabled?: boolean
  disabledReason?: string
  onExport: (format: string) => Promise<void>
  onSuccess: (format: string) => void
  onError: (error: string) => void
}

function ExportCard({
  title,
  description,
  icon: Icon,
  formats = ['CSV'],
  estimatedRecords,
  estimatedSizeMB,
  disabled = false,
  disabledReason,
  onExport,
  onSuccess,
  onError,
}: ExportCardProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    if (disabled) return
    setLoadingFormat(format)
    try {
      await onExport(format)
      onSuccess(format)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <Card className={disabled ? 'opacity-60' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
          {disabled && disabledReason && (
            <span className="ml-auto text-xs font-normal text-text-muted bg-background-elevated px-2 py-0.5 rounded">
              {disabledReason}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted mb-2">{description}</p>
        {estimatedRecords && estimatedSizeMB && (
          <p className="text-xs text-text-muted mb-4">
            ~{formatNumber(estimatedRecords)} records ({estimatedSizeMB} MB)
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              onClick={() => handleExport(format)}
              disabled={disabled || loadingFormat !== null}
              aria-label={`Export ${title} as ${format}`}
            >
              {loadingFormat === format ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-3 w-3" aria-hidden="true" />
              )}
              {format}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default Export
