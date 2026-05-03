/**
 * ContractDetail — full-page editorial dossier for a single contract.
 *
 * Design vocabulary: NYT/FT investigative journalism, dark-mode first.
 * Not a modal. A standalone dossier with strong hierarchy: hero finding first,
 * sidebar for metadata, main column for risk assessment and procurement detail.
 */

import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { contractApi, vendorApi } from '@/api/client'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskExplanationPanel } from '@/components/RiskExplanation'
import { ContractExplainPanel } from '@/components/ContractExplainPanel'
import { SanctionsAlertBanner } from '@/components/SanctionsAlertBanner'
import {
  toTitleCase,
  formatCompactMXN,
  formatCompactUSD,
  formatDate,
} from '@/lib/utils'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import type { ContractDetail as ContractDetailType } from '@/api/types'
import {
  ArrowLeft,
  ChevronRight,
  Building2,
  User,
  Calendar,
  ExternalLink,
  FileText,
  ShieldAlert,
  Clock,
  Zap,
  AlertTriangle,
  Database,
  Copy,
} from 'lucide-react'

// Administration helper imported from canonical lib/administrations.
// Was a 4-file duplicate with slightly different accent handling.
import { getAdministrationShortName as getAdministration } from '@/lib/administrations'

// ----------------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------------
export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t: tCommon } = useTranslation('common')
  const contractId = id ? parseInt(id, 10) : NaN

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractApi.getById(contractId),
    enabled: !Number.isNaN(contractId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: externalFlags } = useQuery({
    queryKey: ['vendor-external-flags', contract?.vendor_id],
    queryFn: () => vendorApi.getExternalFlags(contract!.vendor_id!),
    enabled: !!contract?.vendor_id,
    staleTime: 10 * 60 * 1000,
  })

  // Risk palette — derived from score
  const riskPalette = useMemo(() => {
    const score = contract?.risk_score ?? 0
    if (score >= 0.6) return { color: '#dc2626', label: 'CRITICAL', bg: 'bg-red-600/10', border: 'border-red-600/30' }
    if (score >= 0.4) return { color: '#ea580c', label: 'HIGH', bg: 'bg-orange-600/10', border: 'border-orange-600/30' }
    if (score >= 0.25) return { color: '#eab308', label: 'MEDIUM', bg: 'bg-amber-600/10', border: 'border-amber-600/30' }
    return { color: 'var(--color-text-muted)', label: 'LOW', bg: 'bg-background-elevated', border: 'border-border' }
  }, [contract?.risk_score])

  // ----- Error state ------------------------------------------------------
  if (!Number.isNaN(contractId) && error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="h-10 w-10 mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary mb-2">Contract not found or unavailable.</p>
          <p className="text-[11px] text-text-muted font-mono mb-6">ID: {contractId}</p>
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-secondary border border-border rounded-sm px-3 py-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to contracts
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !contract) {
    return <ContractDetailSkeleton />
  }

  const hasSanctions =
    !!externalFlags &&
    (externalFlags.sfp_sanctions.length > 0 || !!externalFlags.sat_efos)

  const isHighRisk =
    contract.risk_level === 'high' || contract.risk_level === 'critical'

  const riskScorePct = ((contract.risk_score ?? 0) * 100).toFixed(1)

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
      {/* ----- Breadcrumb ----- */}
      <nav className="flex items-center gap-1.5 text-[11px] text-text-muted mb-8">
        <Link
          to="/contracts"
          className="inline-flex items-center gap-1 hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Contracts
        </Link>
        <ChevronRight className="h-3 w-3 text-text-primary" />
        <span className="text-text-secondary font-mono tabular-nums">
          {contract.contract_number || `#${contract.id}`}
        </span>
      </nav>

      {/* ----- EDITORIAL HERO ----- */}
      <header className="mb-10 md:mb-14">
        {/* Dateline strip */}
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-text-secondary">RUBLI</span>
          </span>
          <span className="text-text-primary">·</span>
          <span>Contrato</span>
          {contract.contract_number && (
            <>
              <span className="text-text-primary">·</span>
              <span className="text-text-secondary font-mono tabular-nums">{contract.contract_number}</span>
            </>
          )}
          {contract.risk_model_version && (
            <>
              <span className="text-text-primary">·</span>
              <span className="font-mono tabular-nums">{contract.risk_model_version}</span>
            </>
          )}
          {contract.contract_year && (
            <>
              <span className="text-text-primary">·</span>
              <span className="font-mono tabular-nums">{contract.contract_year}</span>
            </>
          )}
        </div>

        {/* Risk pill + kicker row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.15em] border ${riskPalette.bg} ${riskPalette.border}`}
            style={{ color: riskPalette.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: riskPalette.color }}
            />
            {riskPalette.label} · {riskScorePct}%
          </span>
          {contract.sector_name && (
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
              SECTOR · {contract.sector_name}
            </span>
          )}
          {contract.is_election_year && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-risk-high/10/40 text-risk-high border border-amber-600/30">
              <Zap className="h-2.5 w-2.5" aria-hidden="true" />
              ELECTION YEAR
            </span>
          )}
        </div>

        {/* Large serif headline */}
        <h1
          className="text-2xl md:text-3xl font-bold text-text-primary leading-[1.15] tracking-tight mb-6 line-clamp-3"
          style={{ fontFamily: 'var(--font-family-serif)' }}
          title={contract.title || undefined}
        >
          {toTitleCase(contract.title || 'Untitled Contract')}
        </h1>

        {/* Vendor / Institution chips */}
        <div className="flex items-center gap-3 flex-wrap text-sm mb-6">
          {contract.vendor_id ? (
            <EntityIdentityChip type="vendor" id={contract.vendor_id} name={contract.vendor_name} size="sm" />
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-background/40 text-text-secondary max-w-full min-w-0">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[260px] md:max-w-[360px]">{toTitleCase(contract.vendor_name || 'Unknown vendor')}</span>
            </span>
          )}
          <span className="text-text-primary shrink-0">→</span>
          {contract.institution_id ? (
            <Link
              to={`/institutions/${contract.institution_id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-background/40 text-text-secondary hover:border-border hover:bg-background/80 transition-colors max-w-full min-w-0"
              title={toTitleCase(contract.institution_name || '')}
            >
              <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="font-medium truncate max-w-[260px] md:max-w-[360px]">{toTitleCase(contract.institution_name || '-')}</span>
              <ChevronRight className="h-3 w-3 text-text-muted shrink-0" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-background/40 text-text-secondary max-w-full min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[260px] md:max-w-[360px]">{toTitleCase(contract.institution_name || 'Unknown institution')}</span>
            </span>
          )}
        </div>

        {/* Key stats bar — editorial stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 py-6 border-y border-border">
          <StatBlock
            label="Contract value"
            value={
              contract.amount_mxn && contract.amount_mxn > 0
                ? formatCompactMXN(contract.amount_mxn)
                : '—'
            }
            sub={
              contract.amount_mxn && contract.amount_mxn > 0
                ? formatCompactUSD(contract.amount_mxn, contract.contract_year)
                : 'Amount not reported'
            }
          />
          <StatBlock
            label="Signed"
            value={
              contract.contract_date
                ? formatDate(contract.contract_date)
                : String(contract.contract_year || '—')
            }
            sub={contract.contract_year ? getAdministration(contract.contract_year) : undefined}
          />
          <StatBlock
            label="Procedure"
            value={
              contract.procedure_type_normalized ||
              contract.procedure_type ||
              '—'
            }
            sub={contract.is_direct_award ? 'Direct award' : contract.is_single_bid ? 'Single bid' : 'Competitive'}
            emphasis={contract.is_direct_award || contract.is_single_bid}
          />
          <StatBlock
            label="Risk score"
            value={`${riskScorePct}%`}
            sub={
              contract.risk_confidence_lower != null && contract.risk_confidence_upper != null
                ? `CI [${(contract.risk_confidence_lower * 100).toFixed(0)}–${(contract.risk_confidence_upper * 100).toFixed(0)}%]`
                : undefined
            }
            valueColor={riskPalette.color}
          />
        </div>
      </header>

      {/* ----- Sanctions banner ----- */}
      {hasSanctions && externalFlags && (
        <div className="mb-10">
          <SanctionsAlertBanner
            sanctions={[
              ...externalFlags.sfp_sanctions.map((s) => ({
                list_type: 'sfp' as const,
                match_method: 'rfc' as const,
                match_confidence: 1,
                sanction_type: s.sanction_type ?? undefined,
              })),
              ...(externalFlags.sat_efos
                ? [
                    {
                      list_type: (externalFlags.sat_efos.stage === 'definitivo'
                        ? 'efos_definitivo'
                        : 'efos_presunto') as 'efos_definitivo' | 'efos_presunto',
                      match_method: 'rfc' as const,
                      match_confidence: 1,
                    },
                  ]
                : []),
            ]}
            vendorName={contract.vendor_name ?? ''}
          />
        </div>
      )}

      {/* ----- Main grid: content left, sidebar right ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-14">
        {/* ================== MAIN COLUMN ================== */}
        <main className="min-w-0 space-y-12">
          {/* ----- Risk Assessment ----- */}
          <Section overline="Finding · Risk Assessment" title="What the model sees">
            <div className="space-y-6">
              {/* Risk score bar */}
              <div className="rounded-sm border border-border bg-background/40 p-5">
                <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-3xl sm:text-4xl font-mono font-bold tabular-nums"
                      style={{ color: riskPalette.color }}
                    >
                      {riskScorePct}%
                    </span>
                    <RiskBadge score={contract.risk_score ?? 0} className="text-[11px]" />
                  </div>
                  {contract.risk_confidence_lower != null && contract.risk_confidence_upper != null && (
                    <span className="text-[11px] text-text-muted font-mono tabular-nums">
                      95% CI [{(contract.risk_confidence_lower * 100).toFixed(1)}% – {(contract.risk_confidence_upper * 100).toFixed(1)}%]
                    </span>
                  )}
                </div>
                {/* Dot-matrix 0-1 with threshold markers */}
                {(() => {
                  const N = 40, DR = 3, DG = 8
                  const pct = Math.min((contract.risk_score ?? 0), 1)
                  const filled = Math.round(pct * N)
                  const totalW = N * DG
                  const markerX = (t: number) => (t / 100) * totalW
                  return (
                    <svg viewBox={`0 0 ${totalW} 12`} className="w-full" style={{ height: 12 }} preserveAspectRatio="none" aria-hidden="true">
                      {Array.from({ length: N }).map((_, k) => (
                        <circle key={k} cx={k * DG + DR} cy={6} r={DR}
                          fill={k < filled ? riskPalette.color : 'var(--color-background-elevated)'}
                          stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                          strokeWidth={k < filled ? 0 : 0.5}
                          fillOpacity={k < filled ? 0.85 : 1}
                        />
                      ))}
                      {/* Threshold markers */}
                      {[25, 40, 60].map((t) => (
                        <line key={t} x1={markerX(t)} y1={0} x2={markerX(t)} y2={12} stroke="var(--color-text-muted)" strokeWidth={0.6} strokeOpacity={0.5} strokeDasharray="2 2" />
                      ))}
                    </svg>
                  )
                })()}
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
                  <span>0.00 · Low</span>
                  <span>1.00 · Critical</span>
                </div>

                {/* Disclaimer for high-risk */}
                {isHighRisk && (
                  <div className="mt-4 flex items-start gap-2 rounded-sm bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-risk-high/80 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      High risk score indicates similarity to documented corruption patterns — it is
                      an investigative signal, not a verdict.
                    </p>
                  </div>
                )}
              </div>

              {/* Flags */}
              {(contract.is_direct_award ||
                contract.is_single_bid ||
                contract.is_year_end ||
                contract.is_high_value ||
                contract.is_threshold_gaming) && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-2">
                    Procurement flags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.is_direct_award && (
                      <Badge className="text-xs bg-orange-600/15 text-orange-400 border border-orange-600/30">
                        Direct award
                      </Badge>
                    )}
                    {contract.is_single_bid && (
                      <Badge className="text-xs bg-red-600/15 text-risk-critical border border-red-600/30">
                        Single bid
                      </Badge>
                    )}
                    {contract.is_year_end && (
                      <Badge variant="outline" className="text-xs">
                        Year-end timing
                      </Badge>
                    )}
                    {contract.is_high_value && (
                      <Badge variant="outline" className="text-xs">
                        High value
                      </Badge>
                    )}
                    {contract.is_threshold_gaming && (
                      <Badge
                        className="text-xs bg-risk-high/10/30 text-risk-high border border-amber-500/30"
                        title={`${((contract.threshold_proximity ?? 0) * 100).toFixed(1)}% below licitación pública threshold`}
                      >
                        Threshold gaming
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Raw risk factors */}
              {contract.risk_factors && contract.risk_factors.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
                    Risk factors triggered
                  </p>
                  <ul className="space-y-1.5">
                    {contract.risk_factors.map((factor) => {
                      const parsed = parseFactorLabel(factor)
                      return (
                        <li
                          key={factor}
                          className="flex items-center gap-2.5 text-sm text-text-secondary"
                          title={factor}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: getFactorCategoryColor(parsed.category) }}
                          />
                          <span>{parsed.label}</span>
                          <span className="text-[10px] text-text-muted font-mono ml-1 uppercase tracking-[0.15em]">
                            {parsed.category}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Ensemble anomaly score */}
              {contract.ensemble_anomaly_score != null && (
                <AnomalyScoreCard
                  score={contract.ensemble_anomaly_score}
                  isHighRisk={isHighRisk}
                />
              )}

              {/* v6.0 SHAP breakdown */}
              <div className="pt-2">
                <RiskExplanationPanel contractId={contract.id} />
              </div>

              {/* AI plain-language explanation */}
              {contract.risk_level && (
                <ContractExplainPanel
                  contractId={contract.id}
                  riskLevel={contract.risk_level}
                />
              )}
            </div>
          </Section>

          {/* ----- Procurement details ----- */}
          <Section overline="Record · Procurement Details" title="The paper trail">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DetailItem
                label="Procedure type"
                value={
                  contract.procedure_type_normalized || contract.procedure_type
                }
              />
              <DetailItem
                label="Contract type"
                value={
                  contract.contract_type_normalized || contract.contract_type
                }
              />
              <DetailItem
                label="Publication date"
                value={
                  contract.publication_date
                    ? formatDate(contract.publication_date)
                    : undefined
                }
                icon={Calendar}
              />
              <DetailItem
                label="Award date"
                value={
                  contract.award_date ? formatDate(contract.award_date) : undefined
                }
                icon={Calendar}
              />
              <DetailItem
                label="Start date"
                value={
                  contract.start_date ? formatDate(contract.start_date) : undefined
                }
                icon={Calendar}
              />
              <DetailItem
                label="End date"
                value={contract.end_date ? formatDate(contract.end_date) : undefined}
                icon={Calendar}
              />
              <DetailItem label="Sector" value={contract.sector_name} />
              <DetailItem label="Status" value={contract.contract_status} />
            </div>
          </Section>

          {/* ----- Political context ----- */}
          {(contract.publication_delay_days != null ||
            contract.is_election_year ||
            contract.sexenio_year != null) && (
            <Section overline="Context · Political Cycle" title="When was it awarded?">
              <PoliticalContextCard contract={contract} />
            </Section>
          )}

          {/* ----- Description ----- */}
          {contract.description && (
            <Section overline="Record · Description" title="Object of the contract">
              <div className="rounded-sm border border-border bg-background/40 p-5 max-h-[28rem] overflow-y-auto">
                <p
                  className="text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {toTitleCase(contract.description)}
                </p>
                {contract.description.length > 600 && (
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mt-3 pt-3 border-t border-border">
                    {contract.description.length.toLocaleString()} chars · scroll for full text
                  </p>
                )}
              </div>
            </Section>
          )}
        </main>

        {/* ================== SIDEBAR ================== */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Data quality */}
          {(contract.data_quality_grade || contract.source_structure) && (
            <SidebarCard overline="Data Quality">
              <div className="space-y-3">
                {contract.data_quality_grade && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1">
                      Grade
                    </p>
                    <p className="text-2xl font-mono font-bold text-text-secondary">
                      {contract.data_quality_grade}
                    </p>
                  </div>
                )}
                {contract.source_structure && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1">
                      Source structure
                    </p>
                    <p className="text-sm font-mono text-text-secondary">
                      Structure {contract.source_structure}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">
                      {contract.source_structure === 'A'
                        ? '2002-2010 · 0.1% RFC coverage'
                        : contract.source_structure === 'B'
                        ? '2010-2017 · 15.7% RFC coverage'
                        : contract.source_structure === 'C'
                        ? '2018-2022 · 30.3% RFC coverage'
                        : '2023-2025 · 47.4% RFC coverage'}
                    </p>
                  </div>
                )}
              </div>
            </SidebarCard>
          )}

          {/* COMPRANET source */}
          {contract.url && (
            <SidebarCard overline="Primary Source">
              <a
                href={contract.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-risk-high hover:text-accent font-medium group"
              >
                <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                View on COMPRANET
              </a>
              <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                Official government procurement record.
              </p>
            </SidebarCard>
          )}

          {/* Related entities */}
          <SidebarCard overline="Investigation paths">
            <div className="space-y-1.5">
              {contract.vendor_id && (
                <div className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
                  <User className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] mb-0.5">
                      Vendor profile
                    </p>
                    <EntityIdentityChip type="vendor" id={contract.vendor_id} name={contract.vendor_name} size="xs" />
                  </div>
                </div>
              )}
              {contract.institution_id && (
                <Link
                  to={`/institutions/${contract.institution_id}`}
                  className="flex items-center justify-between group py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.15em]">
                        Institution
                      </p>
                      <p className="text-xs text-text-secondary truncate group-hover:text-text-primary">
                        {toTitleCase(contract.institution_name || '-')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-text-secondary shrink-0 ml-2" />
                </Link>
              )}
              {contract.vendor_id && (
                <Link
                  to={`/thread/${contract.vendor_id}`}
                  className="flex items-center justify-between group py-2 text-risk-high hover:text-accent"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs font-mono uppercase tracking-[0.15em]">
                      Investigation thread
                    </span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </SidebarCard>

          {/* Identifiers */}
          <SidebarCard overline="Identifiers">
            <div className="space-y-2.5 text-xs font-mono">
              <IdRow label="Contract ID" value={String(contract.id)} />
              {contract.contract_number && (
                <IdRow label="Contract No." value={contract.contract_number} />
              )}
              {contract.procedure_number && (
                <IdRow label="Procedure No." value={contract.procedure_number} />
              )}
              {contract.expedient_code && (
                <IdRow label="Expediente" value={contract.expedient_code} />
              )}
              {contract.vendor_rfc && (
                <IdRow label="Vendor RFC" value={contract.vendor_rfc} />
              )}
            </div>
          </SidebarCard>
        </aside>
      </div>

      {/* ----- Footer attribution ----- */}
      <footer className="mt-16 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span>Source: COMPRANET · Federal Procurement Data</span>
          </div>
          <div className="flex items-center gap-3">
            {contract.risk_model_version && (
              <span className="font-mono">Model {contract.risk_model_version}</span>
            )}
            <span>·</span>
            <span>Scores are risk indicators, not verdicts</span>
          </div>
        </div>
        {/* unused helper fallback for translation namespace types */}
        <span className="sr-only">{tCommon('contractDetail.procedure', { defaultValue: 'Procedure' })}</span>
      </footer>
    </div>
  )
}

// ============================================================================
// Helper sub-components
// ============================================================================

function Section({
  overline,
  title,
  children,
}: {
  overline: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 border-l-[3px] border-red-600 pl-5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-1">
          {overline}
        </p>
        <h2
          className="text-xl md:text-2xl font-bold text-text-primary tracking-tight"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function StatBlock({
  label,
  value,
  sub,
  valueColor,
  emphasis,
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  emphasis?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1.5">
        {label}
      </p>
      <p
        className={`text-xl md:text-2xl font-bold font-mono tabular-nums leading-tight ${
          emphasis ? 'text-risk-high' : 'text-text-primary'
        }`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

function AnomalyScoreCard({
  score,
  isHighRisk,
}: {
  score: number
  isHighRisk: boolean
}) {
  const isAiConfirmed = isHighRisk && score >= 0.5
  return (
    <div className="rounded-sm border border-border bg-background/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-0.5">
            ML Anomaly · Ensemble
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-text-primary tabular-nums">
              {(score * 100).toFixed(0)}%
            </span>
            {isAiConfirmed && (
              <Badge className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-red-600/20 text-risk-critical border border-red-600/30">
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                AI Confirmed
              </Badge>
            )}
          </div>
        </div>
        <span className="text-[10px] text-text-muted font-mono text-right leading-tight">
          IForest +<br />COPOD
        </span>
      </div>
      {(() => {
        const N = 24, DR = 2, DG = 5.5
        const pct = Math.min(score, 1)
        const filled = Math.max(1, Math.round(pct * N))
        const color = isAiConfirmed ? '#f87171' : 'var(--color-text-muted)'
        return (
          <svg viewBox={`0 0 ${N * DG} 5`} className="w-full" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
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
  )
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string | null
  icon?: React.ElementType
}) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm text-text-secondary leading-snug">{toTitleCase(value)}</p>
    </div>
  )
}

function PoliticalContextCard({ contract }: { contract: ContractDetailType }) {
  const delay = contract.publication_delay_days
  const isElection = contract.is_election_year
  const sexenioYear = contract.sexenio_year
  const admin = getAdministration(contract.contract_year)

  const delayColor =
    delay == null
      ? 'text-text-secondary'
      : delay < 5
      ? 'text-risk-critical'
      : delay < 15
      ? 'text-orange-500'
      : 'text-text-secondary'

  const delayNote =
    delay == null
      ? undefined
      : delay < 5
      ? 'Extremely tight window — below OECD 15-day recommendation'
      : delay < 15
      ? 'Short window — below OECD 15-day recommendation'
      : 'Within standard publication window'

  return (
    <div className="rounded-sm border border-border bg-background/40 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {delay != null && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Publication → Award
            </p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${delayColor}`}>
              {delay}d
            </p>
            {delayNote && <p className="text-[11px] text-text-muted mt-1">{delayNote}</p>}
          </div>
        )}
        {sexenioYear != null && admin && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1.5">
              Sexenio year
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">
              Yr {sexenioYear}/6
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              {admin} administration
            </p>
          </div>
        )}
        {isElection && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1.5 flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              Timing
            </p>
            <p className="text-lg font-bold text-risk-high leading-tight">
              Election year
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              Awarded during federal electoral cycle
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarCard({
  overline,
  children,
}: {
  overline: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-border bg-background/40 p-4">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
        {overline}
      </p>
      {children}
    </div>
  )
}

function IdRow({ label, value }: { label: string; value: string }) {
  const copy = () => {
    try {
      navigator.clipboard?.writeText(value)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">{label}</span>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary group"
        title="Copy to clipboard"
      >
        <span className="font-mono tabular-nums">{value}</span>
        <Copy className="h-3 w-3 text-text-muted group-hover:text-text-secondary" />
      </button>
    </div>
  )
}

// ============================================================================
// Loading skeleton
// ============================================================================
function ContractDetailSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
      <Skeleton className="h-4 w-40 mb-8" />
      <div className="mb-10">
        <Skeleton className="h-3 w-64 mb-4" />
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-4/5 mb-4" />
        <Skeleton className="h-10 w-2/3 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  )
}
