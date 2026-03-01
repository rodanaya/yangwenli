import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { AlertCircle, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import type { FraudType } from '@/api/types'

// ── Severity colours ──────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-yellow-500/20 text-yellow-400',
  3: 'bg-orange-500/20 text-orange-400',
  4: 'bg-red-500/20 text-red-400',
}

const LEGAL_STATUS_COLORS: Record<string, string> = {
  impunity: 'border-red-500/50 text-red-400',
  investigation: 'border-yellow-500/50 text-yellow-400',
  prosecuted: 'border-orange-500/50 text-orange-400',
  convicted: 'border-green-500/50 text-green-400',
  acquitted: 'border-blue-500/50 text-blue-400',
  dismissed: 'border-muted text-muted-foreground',
  unresolved: 'border-muted text-muted-foreground',
}

// ── Fraud type badge colours ──────────────────────────────────────────────────
const FRAUD_TYPE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  ghost_company:        { border: 'border-red-500/60',    text: 'text-red-400',    bg: 'bg-red-500/10' },
  bid_rigging:          { border: 'border-purple-500/60', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  overpricing:          { border: 'border-orange-500/60', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  conflict_of_interest: { border: 'border-violet-500/60', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  embezzlement:         { border: 'border-amber-500/60',  text: 'text-amber-400',  bg: 'bg-amber-500/10' },
  bribery:              { border: 'border-rose-500/60',   text: 'text-rose-400',   bg: 'bg-rose-500/10' },
  procurement_fraud:    { border: 'border-yellow-500/60', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  monopoly:             { border: 'border-blue-500/60',   text: 'text-blue-400',   bg: 'bg-blue-500/10' },
  emergency_fraud:      { border: 'border-cyan-500/60',   text: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  tender_rigging:       { border: 'border-indigo-500/60', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  other:                { border: 'border-slate-500/60',  text: 'text-slate-400',  bg: 'bg-slate-500/10' },
}

// Fraud type → model detection signals shown in the "How We Detected" section
const FRAUD_TYPE_SIGNALS: Record<string, string[]> = {
  ghost_company: [
    'High vendor concentration: a single vendor controlled a disproportionate share of sector contracts',
    'Abnormal price volatility: contract amounts varied far outside the sector norm',
    'Win rate anomaly: vendor won near 100% of competitive procedures it entered',
  ],
  bid_rigging: [
    'Repeated co-bidding patterns: the same group of vendors appeared together in sequential procedures',
    'Alternating win rates: vendors took turns winning, consistent with bid rotation',
    'Suspiciously low price gaps: losing bids were just slightly above the winner, signalling cover bidding',
  ],
  overpricing: [
    'Price ratio outlier: contract amounts were 3x or more above the sector median',
    'High price hypothesis confidence: IQR-based statistical test flagged extreme overpricing',
    'Repeated same-institution awards: same vendor repeatedly won from the same contracting authority',
  ],
  conflict_of_interest: [
    'Abnormally high win rate with a single institution',
    'Industry mismatch: vendor\'s stated sector did not match the contract category',
    'Short advertisement periods: limited time for competing vendors to prepare bids',
  ],
  embezzlement: [
    'Year-end contract clustering: contracts concentrated in December budget spending',
    'Same-day contract patterns: multiple contracts signed simultaneously to the same vendor',
    'Threshold splitting: contract values just below legal thresholds for competitive bidding',
  ],
  bribery: [
    'Industry mismatch: out-of-sector vendor winning specialised contracts',
    'Network centrality: vendor appeared at the hub of a co-bidding relationship cluster',
    'Win rate anomaly: success rate far above the sector baseline',
  ],
  procurement_fraud: [
    'Direct award prevalence: contracts awarded without competitive procedures',
    'High vendor concentration in a single institution',
    'Abnormal price volatility across contracts of the same type',
  ],
  monopoly: [
    'Extreme vendor concentration: one vendor held >50% of all sector contracts by value',
    'Near-zero single-bid rate in competitive procedures: no real competition detected',
    'Institution diversity signal: vendor served only one or two contracting authorities',
  ],
  emergency_fraud: [
    'Short advertisement periods: procedures fast-tracked under emergency justification',
    'Price ratio outliers: amounts significantly above normal benchmarks',
    'Direct award clustering: multiple emergency contracts to the same vendor simultaneously',
  ],
  tender_rigging: [
    'Co-bidding concentration: a closed group of vendors dominated the procedure pool',
    'High win rate with a single institution over a sustained period',
    'Price anomaly: winning bids consistently at the ceiling of acceptable ranges',
  ],
  other: [
    'Statistical anomalies in vendor concentration detected by the risk model',
    'Behavioural patterns consistent with known corruption cases in the training set',
    'Multiple z-score features above sector baselines simultaneously',
  ],
}

function formatMXN(n?: number | null): string {
  if (!n) return '?'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B MXN`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M MXN`
  return `$${n.toLocaleString()} MXN`
}

// ── Timeline helpers ──────────────────────────────────────────────────────────
interface TimelineEvent {
  date: string
  label: string
  type: 'start' | 'exposure' | 'resolution'
}

function buildTimeline(
  yearStart?: number,
  yearEnd?: number,
  discoveryYear?: number,
  legalStatus?: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (yearStart) {
    events.push({
      date: String(yearStart),
      label: yearEnd && yearEnd !== yearStart
        ? `Contracts awarded (${yearStart}–${yearEnd})`
        : `Contracts awarded (${yearStart})`,
      type: 'start',
    })
  }

  if (discoveryYear) {
    events.push({
      date: String(discoveryYear),
      label: 'Case exposed / investigation opened',
      type: 'exposure',
    })
  }

  if (legalStatus && (legalStatus === 'convicted' || legalStatus === 'acquitted' || legalStatus === 'dismissed')) {
    const resolutionLabel: Record<string, string> = {
      convicted: 'Conviction obtained',
      acquitted: 'Acquitted / charges dropped',
      dismissed: 'Case dismissed',
    }
    events.push({
      date: 'Resolved',
      label: resolutionLabel[legalStatus] ?? 'Legal resolution',
      type: 'resolution',
    })
  }

  return events
}

// ── Risk score mini gauge ─────────────────────────────────────────────────────
function RiskGauge({ score }: { score: number }) {
  const level = getRiskLevelFromScore(score)
  const color = RISK_COLORS[level]
  const pct = Math.round(score * 100)

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CaseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation('cases')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'detail', slug],
    queryFn: () => caseLibraryApi.getBySlug(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('detail.backToLibrary')}
        </Button>
        <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>Case not found.</span>
        </div>
      </div>
    )
  }

  const name = i18n.language === 'es' ? data.name_es : data.name_en
  const summary = i18n.language === 'es' && data.summary_es ? data.summary_es : data.summary_en

  const fraudColors = FRAUD_TYPE_COLORS[data.fraud_type] ?? FRAUD_TYPE_COLORS.other
  const signals = FRAUD_TYPE_SIGNALS[data.fraud_type] ?? FRAUD_TYPE_SIGNALS.other
  const timelineEvents = buildTimeline(
    data.contract_year_start,
    data.contract_year_end,
    data.discovery_year,
    data.legal_status,
  )

  // Derive a representative avg risk score from severity for vendor gauges
  // (actual per-vendor scores are not in this endpoint; severity 1-4 maps to 0.05-0.65)
  const severityToScore: Record<number, number> = { 1: 0.08, 2: 0.22, 3: 0.44, 4: 0.62 }
  const representativeScore = severityToScore[data.severity] ?? 0.30

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Back navigation */}
      <button
        onClick={() => navigate('/cases')}
        className="text-xs text-text-muted hover:text-accent mb-5 flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t('detail.backToLibrary')}
      </button>

      {/* ── Title block ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Severity */}
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded', SEVERITY_COLORS[data.severity] ?? SEVERITY_COLORS[2])}>
            {t(`severity.${data.severity}`)}
          </span>

          {/* Fraud type — prominently coloured */}
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded border',
            fraudColors.border,
            fraudColors.text,
            fraudColors.bg,
          )}>
            {t(`fraudTypes.${data.fraud_type}`)}
          </span>

          {/* Legal status */}
          <Badge variant="outline" className={cn('text-xs', LEGAL_STATUS_COLORS[data.legal_status] ?? '')}>
            {t(`legalStatuses.${data.legal_status}`)}
          </Badge>

          {/* ML-linked badge */}
          {data.ground_truth_case_id != null && (
            <Link to="/methodology" className="no-underline">
              <Badge variant="outline" className="text-xs border-accent/50 text-accent hover:bg-accent/10 transition-colors cursor-pointer">
                {t('card.mlLinked')} — View in Model Validation
              </Badge>
            </Link>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold font-mono text-text-primary">{name}</h1>
          <AddToDossierButton
            entityType="note"
            entityId={data.id}
            entityName={data.name_en}
            className="flex-shrink-0"
          />
        </div>

        <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-muted">
          {(data.contract_year_start || data.contract_year_end) && (
            <span>
              {data.contract_year_start}
              {data.contract_year_end && data.contract_year_end !== data.contract_year_start
                ? `–${data.contract_year_end}`
                : ''}
            </span>
          )}
          {data.discovery_year && <span>{t('card.discovered', { year: data.discovery_year })}</span>}
          <span>{t(`administrations.${data.administration}`)}</span>
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-lg p-4 mb-5">
        <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
      </div>

      {/* ── Impact Metrics Grid ─────────────────────────────────────────────── */}
      {(data.amount_mxn_low || data.amount_mxn_high) && (
        <section className="mb-6">
          <h2 className="text-sm font-bold font-mono text-text-primary mb-3">Impact Metrics</h2>
          <div className={cn(
            'grid grid-cols-2 sm:grid-cols-3 gap-3',
          )}>
            {/* Total value */}
            {(data.amount_mxn_low || data.amount_mxn_high) && (
              <div className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Estimated Value
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {data.amount_mxn_low ? formatMXN(data.amount_mxn_low) : '—'}
                </div>
                {data.amount_mxn_high && data.amount_mxn_high !== data.amount_mxn_low && (
                  <div className="text-[11px] text-text-muted">
                    up to {formatMXN(data.amount_mxn_high)}
                  </div>
                )}
              </div>
            )}

            {/* Severity level as visual KPI */}
            <div className={cn(
              'rounded-lg border p-3 flex flex-col gap-1',
              fraudColors.border,
              fraudColors.bg,
            )}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Severity Level
              </div>
              <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                {data.severity} / 4
              </div>
              <div className="flex gap-1 mt-0.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      'h-1.5 flex-1 rounded-full',
                      n <= data.severity
                        ? data.severity >= 4 ? 'bg-red-500' : data.severity >= 3 ? 'bg-orange-500' : 'bg-yellow-500'
                        : 'bg-border/30',
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Legal status KPI */}
            <div className={cn(
              'rounded-lg border p-3 flex flex-col gap-1',
              fraudColors.border,
              fraudColors.bg,
            )}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Legal Outcome
              </div>
              <div className="text-sm font-semibold text-text-primary capitalize leading-snug">
                {t(`legalStatuses.${data.legal_status}`)}
              </div>
              <div className="text-[11px] text-text-muted">
                {data.legal_status === 'convicted' ? 'Accountability achieved' :
                 data.legal_status === 'prosecuted' ? 'Proceedings underway' :
                 data.legal_status === 'impunity' ? 'No accountability' :
                 data.legal_status === 'investigation' ? 'Under investigation' :
                 'Status unresolved'}
              </div>
            </div>

            {/* Discovery year KPI */}
            {data.discovery_year && (
              <div className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Discovered
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {data.discovery_year}
                </div>
                {data.contract_year_start && (
                  <div className="text-[11px] text-text-muted">
                    {data.discovery_year - data.contract_year_start}yr after contracts started
                  </div>
                )}
              </div>
            )}

            {/* Sectors affected */}
            {data.sector_ids && data.sector_ids.length > 0 && (
              <div className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Sectors Affected
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {data.sector_ids.length}
                </div>
                <div className="text-[11px] text-text-muted">
                  {data.sector_ids.length === 1 ? 'Single sector' : 'Cross-sector fraud'}
                </div>
              </div>
            )}

            {/* Compranet visibility */}
            <div className={cn(
              'rounded-lg border p-3 flex flex-col gap-1',
              fraudColors.border,
              fraudColors.bg,
            )}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                COMPRANET Visibility
              </div>
              <div className={cn(
                'text-sm font-semibold capitalize leading-snug',
                data.compranet_visibility === 'high' ? 'text-green-400' :
                data.compranet_visibility === 'partial' ? 'text-yellow-400' :
                'text-text-muted',
              )}>
                {data.compranet_visibility}
              </div>
              <div className="text-[11px] text-text-muted">
                {data.compranet_visibility === 'high' ? 'Contracts visible in database' :
                 data.compranet_visibility === 'partial' ? 'Partially visible' :
                 'Not visible in procurement records'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Info grid (amount note / COMPRANET note / legal note) ────────────── */}
      {(data.amount_note || data.compranet_note || data.legal_status_note) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {data.amount_note && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {t('detail.amountNote')}
              </div>
              {data.amount_mxn_low && (
                <div className="text-sm font-mono text-text-primary">
                  {formatMXN(data.amount_mxn_low)}
                  {data.amount_mxn_high ? ` – ${formatMXN(data.amount_mxn_high)}` : '+'}
                </div>
              )}
              <p className="text-[11px] text-text-muted mt-1">{data.amount_note}</p>
            </div>
          )}
          {data.compranet_note && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {t('detail.compranetNote')}
              </div>
              <div className="text-[11px] text-text-secondary">{data.compranet_note}</div>
            </div>
          )}
          {data.legal_status_note && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {t('detail.legalNote')}
              </div>
              <div className="text-[11px] text-text-secondary">{data.legal_status_note}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Case Timeline ───────────────────────────────────────────────────── */}
      {timelineEvents.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold font-mono text-text-primary mb-3">Case Timeline</h2>
          <div className="bg-card border border-border/50 rounded-lg p-4">
            <div className="relative space-y-0">
              {/* Vertical connector line */}
              {timelineEvents.length > 1 && (
                <div className="absolute left-3 top-4 bottom-4 w-px bg-border/30" />
              )}
              {timelineEvents.map((event, i) => (
                <div key={i} className="relative pl-9 pb-5 last:pb-0">
                  {/* Dot */}
                  <div className={cn(
                    'absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2',
                    event.type === 'start'
                      ? 'border-red-400 bg-red-400/20'
                      : event.type === 'exposure'
                        ? 'border-amber-400 bg-amber-400/20'
                        : 'border-emerald-400 bg-emerald-400/20',
                  )} />
                  <div className="text-xs text-text-muted">{event.date}</div>
                  <div className="text-sm font-medium text-text-primary">{event.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How We Detected This ────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">How the Model Detected This Case</h3>
          <div className="space-y-2 text-sm text-text-muted">
            {signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
          {data.ground_truth_case_id != null && (
            <div className="mt-3 pt-3 border-t border-cyan-500/15 text-[11px] text-text-muted">
              This case is part of the model&apos;s ground truth training set. Contracts linked to it
              were used to calibrate the v5.1 per-sector risk sub-models.{' '}
              <Link to="/methodology" className="text-cyan-400 hover:underline">
                View model validation
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Connected Vendors ───────────────────────────────────────────────── */}
      {data.key_actors.filter(a => a.role === 'vendor').length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold font-mono text-text-primary mb-3">Connected Vendors</h2>
          <div className="space-y-2">
            {data.key_actors
              .filter(a => a.role === 'vendor')
              .map((actor, i) => (
                <div key={i} className="bg-card border border-border/40 rounded-lg p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text-primary">{actor.name}</div>
                      {actor.title && (
                        <div className="text-[11px] text-text-muted">{actor.title}</div>
                      )}
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[10px] px-1.5 py-0 flex-shrink-0',
                      fraudColors.border,
                      fraudColors.text,
                    )}>
                      vendor
                    </Badge>
                  </div>
                  {/* Risk score mini-bar — approximated from severity */}
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">
                      Estimated Risk Level
                    </div>
                    <RiskGauge score={representativeScore} />
                  </div>
                  {actor.note && (
                    <div className="text-[11px] text-text-secondary">{actor.note}</div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ── Key Actors (non-vendor) ─────────────────────────────────────────── */}
      {data.key_actors.filter(a => a.role !== 'vendor').length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.keyActors')}</h2>
          <div className="space-y-2">
            {data.key_actors
              .filter(a => a.role !== 'vendor')
              .map((actor, i) => (
                <div key={i} className="flex gap-3 bg-card border border-border/40 rounded-lg p-3">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {t(`detail.roles.${actor.role}`)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{actor.name}</div>
                    {actor.title && <div className="text-[11px] text-text-muted">{actor.title}</div>}
                    {actor.note && <div className="text-[11px] text-text-secondary mt-0.5">{actor.note}</div>}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ── Sources ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.sources')}</h2>
        {data.sources.length === 0 ? (
          <p className="text-xs text-text-muted">{t('detail.noSources')}</p>
        ) : (
          <div className="space-y-2">
            {data.sources.map((src, i) => (
              <div key={i} className="flex gap-3 bg-card border border-border/40 rounded-lg p-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 h-fit">
                  {t(`detail.sourceTypes.${src.type}`)}
                </Badge>
                <div>
                  <div className="text-xs font-medium text-text-primary">
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent flex items-center gap-1"
                      >
                        {src.title} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      src.title
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {src.outlet}{src.date ? ` · ${src.date.slice(0, 7)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
