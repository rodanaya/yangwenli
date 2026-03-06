import { useQuery } from '@tanstack/react-query'
import { Printer, Loader2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { reportApi } from '@/api/client'
import { formatRiskScorePercent } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import type { VendorReport, InstitutionReport, SectorReport } from '@/api/types'

interface ReportModalProps {
  reportType: 'vendor' | 'institution' | 'sector'
  entityId: number
  entityName: string
  open: boolean
  onClose: () => void
}

function useReport(type: ReportModalProps['reportType'], id: number, enabled: boolean) {
  return useQuery<VendorReport | InstitutionReport | SectorReport>({
    queryKey: ['report', type, id],
    queryFn: async () => {
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
  _data: VendorReport | InstitutionReport | SectorReport
): _data is VendorReport {
  return type === 'vendor'
}

/** Risk level color from score */
function riskColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return RISK_COLORS.high
  if (score >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
}

function riskLabel(score: number): string {
  if (score >= 0.5) return 'Critical'
  if (score >= 0.3) return 'High'
  if (score >= 0.1) return 'Medium'
  return 'Low'
}

/**
 * Opens a print-optimised popup window for a vendor report.
 * Renders an inline SVG bar chart of key metrics.
 */
function openVendorPrintWindow(report: VendorReport, entityName: string): void {
  const riskScore = report.risk_score
  const riskPct = Math.round(riskScore * 100)
  const color = riskColor(riskScore)
  const level = riskLabel(riskScore)
  const generatedAt = new Date(report.generated_at).toLocaleString()

  // Simple 5-bar SVG chart: risk score as bar width (0-100)
  const bars: Array<{ label: string; value: number; max: number; color: string }> = [
    { label: 'Risk Score', value: riskPct, max: 100, color: color },
    { label: 'Total Contracts', value: Math.min(report.contract_count, 10000), max: 10000, color: '#3b82f6' },
  ]

  const barSvg = bars
    .map(
      (b, i) => `
    <g transform="translate(0, ${i * 40})">
      <text x="0" y="14" font-size="11" fill="#374151">${b.label}</text>
      <rect x="0" y="20" width="300" height="12" rx="3" fill="#e5e7eb"/>
      <rect x="0" y="20" width="${(b.value / b.max) * 300}" height="12" rx="3" fill="${b.color}"/>
      <text x="308" y="31" font-size="10" fill="#6b7280">${b.label === 'Risk Score' ? riskPct + '%' : b.value.toLocaleString()}</text>
    </g>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RUBLI Report — ${entityName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111827; padding: 32px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 24px; }
    .risk-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; color: #fff; background: ${color}; margin-left: 8px; vertical-align: middle; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
    .summary { font-size: 12px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
    .disclaimer { margin-top: 32px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 10px; color: #6b7280; }
    .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="section">
    <h1>${entityName} <span class="risk-badge">${level} Risk</span></h1>
    <p class="subtitle">RUBLI Vendor Report &nbsp;·&nbsp; Generated: ${generatedAt}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Risk Score</div>
      <div class="kpi-value" style="color: ${color}">${riskPct}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Contracts</div>
      <div class="kpi-value">${report.contract_count.toLocaleString()}</div>
    </div>
  </div>

  <div class="section">
    <h2>Risk Indicators</h2>
    <svg width="380" height="${bars.length * 40 + 8}" aria-label="Risk metrics chart">
      <g transform="translate(0, 4)">
        ${barSvg}
      </g>
    </svg>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p class="summary">${report.summary}</p>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> Generated by RUBLI v5.1 — Risk scores are statistical indicators, not proof of corruption.
    A high score indicates the contract's procurement characteristics resemble those from documented corruption cases.
    This report is intended for investigation triage only.
  </div>

  <div class="footer">
    <span>RUBLI — Red Unificada de Busqueda de Licitaciones Irregulares</span>
    <span>${generatedAt}</span>
  </div>

  <script>
    window.onload = function() { window.print(); }
  <\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export function ReportModal({
  reportType,
  entityId,
  entityName,
  open,
  onClose,
}: ReportModalProps) {
  const { data, isLoading, error } = useReport(reportType, entityId, open)

  const handlePrint = () => {
    if (!data) return
    if (reportType === 'vendor' && isVendorReport(reportType, data)) {
      openVendorPrintWindow(data, entityName)
    } else {
      window.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg" className="print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report: {entityName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {reportType === 'vendor' && data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={isLoading || !!error}
                  aria-label="Open print-optimised PDF view"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Export PDF
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={isLoading || !!error}
                aria-label="Print this dialog"
              >
                <Printer className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden="true" />
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
                    <p
                      className="text-lg font-semibold"
                      style={{ color: riskColor(data.risk_score) }}
                    >
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

              {/* Print disclaimer */}
              <div className="rounded-md bg-background-elevated p-3 text-xs text-text-muted border border-border/40">
                <strong className="text-text-secondary">Disclaimer:</strong> Generated by RUBLI
                v5.1 — Risk scores are statistical indicators, not proof of corruption.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportModal
