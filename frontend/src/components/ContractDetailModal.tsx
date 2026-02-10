import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toTitleCase, formatCompactMXN, formatCompactUSD, formatDate } from '@/lib/utils'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import { Link } from 'react-router-dom'
import {
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  ShieldAlert,
  User,
} from 'lucide-react'

interface ContractDetailModalProps {
  contractId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractDetailModal({ contractId, open, onOpenChange }: ContractDetailModalProps) {
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractApi.getById(contractId!),
    enabled: open && contractId !== null,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
            Contract Details
          </DialogTitle>
          <DialogDescription>
            {contract?.contract_number || (contractId ? `ID: ${contractId}` : '')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="py-8 text-center text-text-muted">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load contract details</p>
          </div>
        ) : contract ? (
          <div className="space-y-5">
            {/* Section 1: Overview */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Overview</h3>
              <div className="space-y-3">
                <p className="text-sm font-medium leading-snug">
                  {toTitleCase(contract.title || 'Untitled Contract')}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={User} label="Vendor">
                    {contract.vendor_id ? (
                      <Link
                        to={`/vendors/${contract.vendor_id}`}
                        className="text-accent hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        {toTitleCase(contract.vendor_name || '-')}
                      </Link>
                    ) : (
                      <span>{toTitleCase(contract.vendor_name || '-')}</span>
                    )}
                  </InfoRow>

                  <InfoRow icon={Building2} label="Institution">
                    {contract.institution_id ? (
                      <Link
                        to={`/institutions/${contract.institution_id}`}
                        className="text-accent hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        {toTitleCase(contract.institution_name || '-')}
                      </Link>
                    ) : (
                      <span>{toTitleCase(contract.institution_name || '-')}</span>
                    )}
                  </InfoRow>

                  <InfoRow icon={DollarSign} label="Amount">
                    <span className="font-medium tabular-nums">
                      {formatCompactMXN(contract.amount_mxn)}
                    </span>
                    <span className="text-text-muted ml-1.5 text-xs">
                      ({formatCompactUSD(contract.amount_mxn, contract.contract_year)})
                    </span>
                  </InfoRow>

                  <InfoRow icon={Calendar} label="Date">
                    <span>
                      {contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year || '-'}
                    </span>
                  </InfoRow>
                </div>

                {contract.description && (
                  <p className="text-xs text-text-muted leading-relaxed border-t border-border pt-3 mt-3">
                    {toTitleCase(contract.description)}
                  </p>
                )}
              </div>
            </section>

            {/* Section 2: Risk Assessment */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Risk Assessment</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {contract.risk_score !== undefined && contract.risk_score !== null ? (
                    <RiskBadge score={contract.risk_score} />
                  ) : (
                    <span className="text-sm text-text-muted">No risk score available</span>
                  )}
                  {contract.risk_confidence_lower != null && contract.risk_confidence_upper != null ? (
                    <span className="text-xs text-text-muted font-mono tabular-nums">
                      CI: [{(contract.risk_confidence_lower * 100).toFixed(1)}% – {(contract.risk_confidence_upper * 100).toFixed(1)}%]
                    </span>
                  ) : contract.risk_confidence ? (
                    <span className="text-xs text-text-muted">
                      Confidence: {contract.risk_confidence}
                    </span>
                  ) : null}
                  {contract.risk_model_version && (
                    <span className="text-[10px] text-text-muted font-mono">
                      {contract.risk_model_version}
                    </span>
                  )}
                </div>

                {contract.risk_factors && contract.risk_factors.length > 0 && (
                  <div className="space-y-1.5">
                    {contract.risk_factors.map((factor) => {
                      const parsed = parseFactorLabel(factor)
                      return (
                        <div key={factor} className="flex items-center gap-2 text-xs" title={factor}>
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: getFactorCategoryColor(parsed.category) }}
                          />
                          <span className="text-text-secondary">{parsed.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {contract.is_direct_award && (
                    <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Direct Award
                    </Badge>
                  )}
                  {contract.is_single_bid && (
                    <Badge className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                      Single Bid
                    </Badge>
                  )}
                  {contract.is_year_end && (
                    <Badge variant="outline" className="text-[10px]">Year-End</Badge>
                  )}
                  {contract.is_high_value && (
                    <Badge variant="outline" className="text-[10px]">High Value</Badge>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Procurement Details */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Procurement</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DetailRow label="Procedure" value={contract.procedure_type_normalized || contract.procedure_type} />
                <DetailRow label="Contract Type" value={contract.contract_type_normalized || contract.contract_type} />
                <DetailRow label="Publication" value={contract.publication_date ? formatDate(contract.publication_date) : undefined} />
                <DetailRow label="Award" value={contract.award_date ? formatDate(contract.award_date) : undefined} />
                <DetailRow label="Start" value={contract.start_date ? formatDate(contract.start_date) : undefined} />
                <DetailRow label="End" value={contract.end_date ? formatDate(contract.end_date) : undefined} />
                <DetailRow label="Sector" value={contract.sector_name} />
                <DetailRow label="Status" value={contract.contract_status} />
              </div>

              {contract.url && (
                <a
                  href={contract.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-3"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on COMPRANET
                </a>
              )}
            </section>

            {/* Data quality footer */}
            {(contract.data_quality_grade || contract.source_structure) && (
              <div className="flex items-center gap-3 text-[10px] text-text-muted border-t border-border pt-3">
                {contract.data_quality_grade && (
                  <span>Quality: {contract.data_quality_grade}</span>
                )}
                {contract.source_structure && (
                  <span>Source: Structure {contract.source_structure}</span>
                )}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-text-muted mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-text-primary">{toTitleCase(value)}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </div>
    </div>
  )
}
