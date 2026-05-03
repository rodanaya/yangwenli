import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { contractApi, vendorApi } from '@/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toTitleCase, formatCompactMXN, formatCompactUSD, formatDate } from '@/lib/utils'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import { Link } from 'react-router-dom'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RiskExplanationPanel } from '@/components/RiskExplanation'
import { ContractExplainPanel } from '@/components/ContractExplainPanel'
import { SanctionsAlertBanner } from '@/components/SanctionsAlertBanner'
import {
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  ShieldAlert,
  User,
  Clock,
  Zap,
} from 'lucide-react'

interface ContractDetailModalProps {
  contractId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractDetailModal({ contractId, open, onOpenChange }: ContractDetailModalProps) {
  const { t } = useTranslation('contracts')
  const { t: tCommon } = useTranslation('common')
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractApi.getById(contractId!),
    enabled: open && contractId !== null,
  })

  const { data: externalFlags } = useQuery({
    queryKey: ['vendor-external-flags', contract?.vendor_id],
    queryFn: () => vendorApi.getExternalFlags(contract!.vendor_id!),
    enabled: open && !!contract?.vendor_id,
    staleTime: 10 * 60 * 1000,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
            {t('detail.title')}
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
            <p className="text-sm">{t('detail.errorLoading')}</p>
          </div>
        ) : contract ? (
          <div className="space-y-5">
            {/* Sanctions Alert Banner */}
            {externalFlags && (externalFlags.sfp_sanctions.length > 0 || externalFlags.sat_efos) && (
              <SanctionsAlertBanner
                sanctions={[
                  ...externalFlags.sfp_sanctions.map(s => ({
                    list_type: 'sfp' as const,
                    match_method: 'rfc' as const,
                    match_confidence: 1,
                    sanction_type: s.sanction_type ?? undefined,
                  })),
                  ...(externalFlags.sat_efos ? [{
                    list_type: (externalFlags.sat_efos.stage === 'definitivo' ? 'efos_definitivo' : 'efos_presunto') as 'efos_definitivo' | 'efos_presunto',
                    match_method: 'rfc' as const,
                    match_confidence: 1,
                  }] : []),
                ]}
                vendorName={contract.vendor_name ?? ''}
                className="mb-1"
              />
            )}

            {/* Section 1: Overview */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">{t('detail.overview')}</p>
              <div className="space-y-3">
                <p className="text-sm font-medium leading-snug">
                  {toTitleCase(contract.title || 'Untitled Contract')}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow icon={User} label={t('detail.vendor')}>
                    {contract.vendor_id ? (
                      <EntityIdentityChip type="vendor" id={contract.vendor_id} name={contract.vendor_name || '-'} size="sm" />
                    ) : (
                      <span>{toTitleCase(contract.vendor_name || '-')}</span>
                    )}
                  </InfoRow>

                  <InfoRow icon={Building2} label={t('detail.institution')}>
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

                  <InfoRow icon={DollarSign} label={t('detail.amount')}>
                    <span className="font-medium font-mono tabular-nums">
                      {formatCompactMXN(contract.amount_mxn)}
                    </span>
                    <span className="text-text-muted ml-1.5 text-xs">
                      ({formatCompactUSD(contract.amount_mxn, contract.contract_year)})
                    </span>
                  </InfoRow>

                  <InfoRow icon={Calendar} label={t('detail.date')}>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">{t('detail.riskAssessment')}</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {contract.risk_score !== undefined && contract.risk_score !== null ? (
                    <RiskBadge score={contract.risk_score} />
                  ) : (
                    <span className="text-sm text-text-muted">{t('detail.noRiskScore')}</span>
                  )}
                  {contract.risk_confidence_lower != null && contract.risk_confidence_upper != null ? (
                    <span className="text-xs text-text-muted font-mono tabular-nums">
                      CI: [{(contract.risk_confidence_lower * 100).toFixed(1)}% – {(contract.risk_confidence_upper * 100).toFixed(1)}%]
                    </span>
                  ) : contract.risk_confidence ? (
                    <span className="text-xs text-text-muted">
                      {tCommon('contractDetail.confidence', { value: contract.risk_confidence })}
                    </span>
                  ) : null}
                  {contract.risk_model_version && (
                    <span className="text-xs text-text-muted font-mono">
                      {contract.risk_model_version}
                    </span>
                  )}
                </div>

                {/* Disclaimer for high/critical risk */}
                {(contract.risk_level === 'high' || contract.risk_level === 'critical') && (
                  <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <span className="text-risk-high/80 mt-0.5 flex-shrink-0 text-sm">⚠️</span>
                    <p className="text-[10px] text-text-muted leading-relaxed">
                      {t('riskScoreTooltipBody')}
                    </p>
                  </div>
                )}

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
                    <Badge className="text-xs bg-risk-high/20 text-risk-high border border-risk-high/30">
                      {tCommon('contractDetail.flagDirectAward')}
                    </Badge>
                  )}
                  {contract.is_single_bid && (
                    <Badge className="text-xs bg-risk-critical/20 text-risk-critical border border-risk-critical/30">
                      {tCommon('contractDetail.flagSingleBid')}
                    </Badge>
                  )}
                  {contract.is_year_end && (
                    <Badge variant="outline" className="text-xs">{tCommon('contractDetail.flagYearEnd')}</Badge>
                  )}
                  {contract.is_high_value && (
                    <Badge variant="outline" className="text-xs">{tCommon('contractDetail.flagHighValue')}</Badge>
                  )}
                  {contract.is_threshold_gaming && (
                    <Badge className="text-xs bg-risk-high/10/30 text-risk-high border border-amber-500/30" title={`${((contract.threshold_proximity ?? 0) * 100).toFixed(1)}% below licitación pública threshold`}>
                      {tCommon('contractDetail.flagThresholdGaming')}
                    </Badge>
                  )}
                </div>

                {/* PyOD Cross-Model Validation */}
                {contract.ensemble_anomaly_score != null && (() => {
                  const isHighRisk = contract.risk_level === 'high' || contract.risk_level === 'critical'
                  const isAiConfirmed = isHighRisk && contract.ensemble_anomaly_score >= 0.5
                  return (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-background-elevated/40 border border-border/30">
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
                          {tCommon('contractDetail.anomalyScore')} <span className="normal-case font-normal">· {tCommon('contractDetail.anomalyScoreSubtitle')}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-text-primary tabular-nums">
                            {(contract.ensemble_anomaly_score * 100).toFixed(0)}%
                          </span>
                          {isAiConfirmed && (
                            <Badge className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-risk-critical/20 text-risk-critical border border-risk-critical/30">
                              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {tCommon('contractDetail.aiConfirmed')}
                            </Badge>
                          )}
                        </div>
                        {(() => {
                          const N = 20, DR = 2, DG = 5
                          const pct = Math.min(contract.ensemble_anomaly_score, 1)
                          const filled = Math.max(1, Math.round(pct * N))
                          const color = isAiConfirmed ? '#f87171' : '#9ca3af'
                          return (
                            <svg viewBox={`0 0 ${N * DG} 5`} className="w-full mt-1.5" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                              {Array.from({ length: N }).map((_, k) => (
                                <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                                  fill={k < filled ? color : 'var(--color-background-elevated)'}
                                  stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                                  strokeWidth={k < filled ? 0 : 0.5}
                                  fillOpacity={k < filled ? 0.85 : 1}
                                />
                              ))}
                            </svg>
                          )
                        })()}
                      </div>
                      <div className="text-right text-[10px] text-text-muted">
                        <p>{tCommon('contractDetail.ensemble')}</p>
                        <p>{tCommon('contractDetail.ensembleDetail')}</p>
                      </div>
                    </div>
                  )
                })()}

                {/* v6.0 Risk Explanation */}
                <RiskExplanationPanel contractId={contract.id} compact />

                {/* AI-powered plain-language explanation */}
                {contract.risk_level && (
                  <ContractExplainPanel contractId={contract.id} riskLevel={contract.risk_level} />
                )}
              </div>
            </section>

            {/* Section 3: Procurement Details */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">{tCommon('contractDetail.procurement')}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DetailRow label={tCommon('contractDetail.procedure')} value={contract.procedure_type_normalized || contract.procedure_type} />
                <DetailRow label={tCommon('contractDetail.contractType')} value={contract.contract_type_normalized || contract.contract_type} />
                <DetailRow label={tCommon('contractDetail.publication')} value={contract.publication_date ? formatDate(contract.publication_date) : undefined} />
                <DetailRow label={tCommon('contractDetail.award')} value={contract.award_date ? formatDate(contract.award_date) : undefined} />
                <DetailRow label={tCommon('contractDetail.start')} value={contract.start_date ? formatDate(contract.start_date) : undefined} />
                <DetailRow label={tCommon('contractDetail.end')} value={contract.end_date ? formatDate(contract.end_date) : undefined} />
                <DetailRow label={tCommon('contractDetail.sector')} value={contract.sector_name} />
                <DetailRow label={tCommon('contractDetail.status')} value={contract.contract_status} />
              </div>

              {/* Political cycle context */}
              {(contract.publication_delay_days != null || contract.is_election_year || contract.sexenio_year != null) && (
                <PoliticalContextRow contract={contract} />
              )}

              {contract.url && (
                <a
                  href={contract.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-3"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tCommon('contractDetail.viewOnCompranet')}
                </a>
              )}
            </section>

            {/* Data quality footer */}
            {(contract.data_quality_grade || contract.source_structure) && (
              <div className="flex items-center gap-3 text-xs text-text-muted border-t border-border pt-3">
                {contract.data_quality_grade && (
                  <span>{tCommon('contractDetail.qualityLabel', { grade: contract.data_quality_grade })}</span>
                )}
                {contract.source_structure && (
                  <span>{tCommon('contractDetail.sourceLabel', { structure: contract.source_structure })}</span>
                )}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function getAdministration(year?: number | null): string {
  if (!year) return ''
  if (year <= 2000) return 'Zedillo'
  if (year <= 2006) return 'Fox'
  if (year <= 2012) return 'Calderón'
  if (year <= 2018) return 'Peña Nieto'
  if (year <= 2024) return 'AMLO'
  return 'Sheinbaum'
}

function PoliticalContextRow({ contract }: { contract: import('@/api/types').ContractDetail }) {
  const { t: tCommon } = useTranslation('common')
  const delay = contract.publication_delay_days
  const isElection = contract.is_election_year
  const sexenioYear = contract.sexenio_year
  const admin = getAdministration(contract.contract_year)

  const delayColor =
    delay == null ? '' :
    delay < 5 ? 'text-risk-critical' :
    delay < 15 ? 'text-risk-high' :
    'text-risk-low'

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg bg-background-elevated/30 border border-border/20">
      <div className="flex items-center gap-1 text-text-muted">
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-wider">{tCommon('contractDetail.context')}</span>
      </div>
      {delay != null && (
        <span className={`text-xs font-mono tabular-nums ${delayColor}`} title="Days between publication and award">
          {delay}d window
        </span>
      )}
      {sexenioYear != null && admin && (
        <span className="text-xs text-text-secondary" title={`Year ${sexenioYear} of 6-year term`}>
          Yr {sexenioYear} · {admin}
        </span>
      )}
      {isElection && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-risk-high/10/40 text-risk-high border border-amber-600/30"
          title="Contract awarded during a federal election year"
        >
          <Zap className="h-2.5 w-2.5" aria-hidden="true" />
          {tCommon('contractDetail.electionYear')}
        </span>
      )}
    </div>
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
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-text-primary">{toTitleCase(value)}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="grid grid-cols-2 gap-4">
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
