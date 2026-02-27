import { useQuery } from '@tanstack/react-query'
import { Printer, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { reportApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatCompactMXN, formatRiskScorePercent } from '@/lib/utils'
import type { VendorReport, InstitutionReport, SectorReport } from '@/api/types'

interface ReportModalProps {
  reportType: 'vendor' | 'institution' | 'sector'
  entityId: number
  entityName: string
  open: boolean
  onClose: () => void
}

function useReport(type: ReportModalProps['reportType'], id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['report', type, id],
    queryFn: () => {
      switch (type) {
        case 'vendor':
          return reportApi.getVendorReport(id)
        case 'institution':
          return reportApi.getInstitutionReport(id)
        case 'sector':
          return reportApi.getSectorReport(id)
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

function isVendorReport(
  type: string,
  data: VendorReport | InstitutionReport | SectorReport
): data is VendorReport {
  return type === 'vendor'
}

export function ReportModal({
  reportType,
  entityId,
  entityName,
  open,
  onClose,
}: ReportModalProps) {
  const { data, isLoading, error } = useReport(reportType, entityId, open)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg" className="print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report: {entityName}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={isLoading || !!error}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              <span className="ml-2 text-sm text-text-muted">Generating report...</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 p-4 text-center">
              Failed to load report. Please try again.
            </div>
          )}

          {data && (
            <div className="space-y-4 text-sm">
              {/* Header */}
              <div className="border-b border-border pb-3">
                <h2 className="text-lg font-semibold text-text-primary">{entityName}</h2>
                <p className="text-xs text-text-muted">
                  Generated: {new Date(data.generated_at).toLocaleString()}
                </p>
              </div>

              {/* Key metrics for vendor reports */}
              {isVendorReport(reportType, data) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[11px] text-text-muted uppercase">Risk Score</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {formatRiskScorePercent(data.risk_score)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-[11px] text-text-muted uppercase">Contracts</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {data.contract_count.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase mb-1">
                  Summary
                </h3>
                <p className="text-text-secondary whitespace-pre-wrap">{data.summary}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportModal
