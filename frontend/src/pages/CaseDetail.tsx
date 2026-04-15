import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { InstitutionBadge } from '@/components/InstitutionBadge'
import { AlertCircle, ArrowLeft, ExternalLink, CheckCircle, Activity, TrendingUp, Users, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import type { FraudType, LinkedVendor } from '@/api/types'
import { slideUp, staggerContainer, staggerItem } from '@/lib/animations'

// ── Severity colours ──────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-amber-100 text-amber-800 dark:bg-yellow-500/20 dark:text-yellow-400',
  3: 'bg-orange-500/20 text-orange-400',
  4: 'bg-red-500/20 text-red-400',
}

const LEGAL_STATUS_COLORS: Record<string, string> = {
  impunity: 'border-red-500/50 text-red-400',
  investigation: 'border-amber-400 text-amber-800 dark:border-yellow-500/50 dark:text-yellow-400',
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
  procurement_fraud:    { border: 'border-amber-400 dark:border-yellow-500/60', text: 'text-amber-800 dark:text-yellow-400', bg: 'bg-amber-100/50 dark:bg-yellow-500/10' },
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

function formatCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

// ── Timeline helpers ──────────────────────────────────────────────────────────
interface TimelineEvent {
  date: string
  labelKey: string
  labelParams?: Record<string, string | number>
  sublabelKey?: string
  sublabelParams?: Record<string, string | number>
  type: 'start' | 'exposure' | 'resolution' | 'milestone'
}

function buildTimeline(
  yearStart?: number,
  yearEnd?: number,
  discoveryYear?: number,
  legalStatus?: string,
  administration?: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (yearStart) {
    events.push({
      date: yearEnd && yearEnd !== yearStart ? `${yearStart}–${yearEnd}` : String(yearStart),
      labelKey: 'detail.timelineContractsAwarded',
      sublabelKey: yearEnd && yearEnd !== yearStart
        ? 'detail.timelineMultiYear'
        : 'detail.timelineSingleYear',
      sublabelParams: yearEnd && yearEnd !== yearStart
        ? { n: yearEnd - yearStart + 1 }
        : undefined,
      type: 'start',
    })
  }

  // Administration milestone — labels come from existing administrations i18n keys
  if (administration && administration !== 'unknown') {
    const adminDateRange: Record<string, string> = {
      fox: '2000–2006',
      calderon: '2006–2012',
      epn: '2012–2018',
      amlo: '2018–2024',
      sheinbaum: '2024–',
    }
    if (adminDateRange[administration]) {
      events.push({
        date: adminDateRange[administration],
        labelKey: `administrations.${administration}`,
        type: 'milestone',
      })
    }
  }

  if (discoveryYear) {
    const yearsAfter = yearStart ? discoveryYear - yearStart : null
    events.push({
      date: String(discoveryYear),
      labelKey: 'detail.timelineExposure',
      sublabelKey: yearsAfter != null && yearsAfter > 0
        ? (yearsAfter === 1 ? 'detail.timelineExposureSub_one' : 'detail.timelineExposureSub_other')
        : undefined,
      sublabelParams: yearsAfter != null && yearsAfter > 0 ? { count: yearsAfter } : undefined,
      type: 'exposure',
    })
  }

  if (legalStatus && (legalStatus === 'convicted' || legalStatus === 'acquitted' || legalStatus === 'dismissed')) {
    const labelKeyMap: Record<string, string> = {
      convicted: 'detail.timelineConviction',
      acquitted: 'detail.timelineAcquitted',
      dismissed: 'detail.timelineDismissed',
    }
    events.push({
      date: 'Resolved',
      labelKey: labelKeyMap[legalStatus] ?? 'detail.timelineLegalResolution',
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

// ── Detection score label ─────────────────────────────────────────────────────
function DetectionScoreLabel({ score }: { score: number }) {
  const { t } = useTranslation('cases')
  const level = getRiskLevelFromScore(score)
  const pct = Math.round(score * 100)
  return (
    <span className="text-[10px] text-text-muted">{pct}% — {t(`severity.${level === 'critical' ? 4 : level === 'high' ? 3 : level === 'medium' ? 2 : 1}`)}</span>
  )
}

// ── Similar case card ─────────────────────────────────────────────────────────
function SimilarCaseCard({ cas, onClick }: { cas: { name_en: string; slug: string; fraud_type: FraudType; severity: number; amount_mxn_low?: number | null }; onClick: () => void }) {
  const { t } = useTranslation('cases')
  const colors = FRAUD_TYPE_COLORS[cas.fraud_type] ?? FRAUD_TYPE_COLORS.other
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all hover:bg-card/80 group',
        colors.border,
        colors.bg,
      )}
    >
      <div className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mb-1">
        {cas.name_en}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted">
        <span className={cn('px-1.5 py-0.5 rounded font-bold',
          cas.severity >= 4 ? 'bg-red-500/20 text-red-400'
          : cas.severity >= 3 ? 'bg-orange-500/20 text-orange-400'
          : 'bg-amber-100 text-amber-800 dark:bg-yellow-500/20 dark:text-yellow-400'
        )}>
          {t(`severity.${cas.severity}`)}
        </span>
        <span className={cn('px-1.5 py-0.5 rounded border', colors.border, colors.text)}>
          {t(`fraudTypes.${cas.fraud_type}`)}
        </span>
        {cas.amount_mxn_low && (
          <span className="ml-auto font-mono">{formatMXN(cas.amount_mxn_low)}</span>
        )}
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CaseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation('cases')
  const { t: ts } = useTranslation('sectors')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'detail', slug],
    queryFn: slug ? () => caseLibraryApi.getBySlug(slug) : () => Promise.reject(new Error('No slug')),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })

  // Load all cases so we can show "Similar Cases"
  const { data: allCases } = useQuery({
    queryKey: ['cases', 'list', {}],
    queryFn: () => caseLibraryApi.getAll({}),
    staleTime: 10 * 60 * 1000,
    enabled: !!data,
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
          <span>{t('detail.caseNotFound')}</span>
        </div>
      </div>
    )
  }

  const name = i18n.language === 'es' ? data.name_es : data.name_en
  const summary = i18n.language === 'es' && data.summary_es ? data.summary_es : data.summary_en

  const fraudColors = FRAUD_TYPE_COLORS[data.fraud_type] ?? FRAUD_TYPE_COLORS.other
  const signalKeys = FRAUD_TYPE_SIGNALS[data.fraud_type] ?? FRAUD_TYPE_SIGNALS.other
  const fraudTypeKey = data.fraud_type in FRAUD_TYPE_SIGNALS ? data.fraud_type : 'other'
  const signals = signalKeys.map((_, idx) => t(`signals.${fraudTypeKey}.${idx}`, { defaultValue: signalKeys[idx] }))
  const timelineEvents = buildTimeline(
    data.contract_year_start,
    data.contract_year_end,
    data.discovery_year,
    data.legal_status,
    data.administration,
  )

  // Use actual linked_vendors from ground truth (when this case trained the model)
  const linkedVendors: LinkedVendor[] = data.linked_vendors ?? []
  const hasRealVendorScores = linkedVendors.length > 0

  // Compute aggregate detection score from linked vendors (avg of avg_risk_score)
  const vendorScores = linkedVendors.filter(v => v.avg_risk_score != null).map(v => v.avg_risk_score!)
  const avgDetectionScore = vendorScores.length > 0
    ? vendorScores.reduce((a, b) => a + b, 0) / vendorScores.length
    : null
  const totalContractsLinked = linkedVendors.reduce((s, v) => s + (v.contract_count ?? 0), 0)

  // Derive sector names for sector_ids
  const sectorLabels = (data.sector_ids ?? [])
    .map(sid => { const sec = SECTORS.find(s => s.id === sid); return sec ? ts(sec.code) : undefined })
    .filter(Boolean) as string[]

  // Similar cases: same fraud_type, different slug, top 3 by severity
  const similarCases = allCases
    ? allCases
        .filter(c => c.fraud_type === data.fraud_type && c.slug !== data.slug)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3)
    : []

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
      <motion.div className="mb-6" variants={slideUp} initial="initial" animate="animate">
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
                {t('card.mlLinked')} — {t('detail.viewModelValidation')}
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
          {sectorLabels.length > 0 && (
            <span>{sectorLabels.join(', ')}</span>
          )}
        </div>
      </motion.div>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-lg p-4 mb-5">
        <p className="text-sm text-text-secondary leading-relaxed">{summary}</p>
      </div>

      {/* ── Impact Metrics Grid ─────────────────────────────────────────────── */}
      {(data.amount_mxn_low || data.amount_mxn_high || hasRealVendorScores) && (
        <section className="mb-6">
          <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.impactMetrics')}</p>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Total value */}
            {(data.amount_mxn_low || data.amount_mxn_high) && (
              <motion.div
                variants={staggerItem}
                className={cn(
                  'rounded-lg border p-3 flex flex-col gap-1',
                  fraudColors.border,
                  fraudColors.bg,
                )}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {t('detail.estimatedValue')}
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {data.amount_mxn_low ? formatMXN(data.amount_mxn_low) : '—'}
                </div>
                {data.amount_mxn_high && data.amount_mxn_high !== data.amount_mxn_low && (
                  <div className="text-[11px] text-text-muted">
                    {t('detail.upTo', { amount: formatMXN(data.amount_mxn_high) })}
                  </div>
                )}
              </motion.div>
            )}

            {/* RUBLI Detection Score — real data when GT-linked, severity-based otherwise */}
            <motion.div
              variants={staggerItem}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-1.5',
                fraudColors.border,
                fraudColors.bg,
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {t('detail.detectionScore')}
              </div>
              {avgDetectionScore != null ? (
                <>
                  <RiskGauge score={avgDetectionScore} />
                  <DetectionScoreLabel score={avgDetectionScore} />
                  <div className="text-[10px] text-text-muted">
                    {t('detail.avgAcrossVendors', { count: linkedVendors.length })}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                    {t(`severity.${data.severity}`)}
                  </div>
                  <div className="text-[11px] text-text-muted">{t('detail.basedOnSeverity')}</div>
                </>
              )}
            </motion.div>

            {/* Contracts affected */}
            {(totalContractsLinked > 0 || data.amount_mxn_low) && (
              <motion.div
                variants={staggerItem}
                className={cn(
                  'rounded-lg border p-3 flex flex-col gap-1',
                  fraudColors.border,
                  fraudColors.bg,
                )}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('detail.contractsAffected')}
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {totalContractsLinked > 0 ? formatCompact(totalContractsLinked) : '—'}
                </div>
                {linkedVendors.length > 0 ? (
                  <div className="text-[11px] text-text-muted">
                    {t('detail.vendorsMatched', { count: linkedVendors.length })}
                  </div>
                ) : (
                  <div className="text-[11px] text-text-muted">
                    {data.compranet_visibility === 'invisible'
                      ? t('detail.visibilityInvisible')
                      : data.compranet_visibility === 'partial'
                      ? t('detail.visibilityPartial')
                      : t('detail.visibilityNone')}
                  </div>
                )}
              </motion.div>
            )}

            {/* Severity level as visual KPI */}
            <motion.div
              variants={staggerItem}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t('detail.severityLevel')}
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
            </motion.div>

            {/* Legal status KPI */}
            <motion.div
              variants={staggerItem}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t('detail.legalOutcome')}
              </div>
              <div className="text-sm font-semibold text-text-primary capitalize leading-snug">
                {t(`legalStatuses.${data.legal_status}`)}
              </div>
              <div className="text-[11px] text-text-muted">
                {data.legal_status === 'convicted' ? t('detail.legalConvicted') :
                 data.legal_status === 'prosecuted' ? t('detail.legalProsecuted') :
                 data.legal_status === 'impunity' ? t('detail.legalImpunity') :
                 data.legal_status === 'investigation' ? t('detail.legalInvestigation') :
                 t('detail.legalUnresolved')}
              </div>
            </motion.div>

            {/* Discovery year KPI */}
            {data.discovery_year && (
              <motion.div
                variants={staggerItem}
                className={cn(
                  'rounded-lg border p-3 flex flex-col gap-1',
                  fraudColors.border,
                  fraudColors.bg,
                )}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {t('detail.discovered')}
                </div>
                <div className="text-lg font-mono font-bold text-text-primary leading-tight">
                  {data.discovery_year}
                </div>
                {data.contract_year_start && (
                  <div className="text-[11px] text-text-muted">
                    {t('detail.yearsAfterContracts', { n: data.discovery_year - data.contract_year_start })}
                  </div>
                )}
              </motion.div>
            )}

            {/* COMPRANET visibility */}
            <motion.div
              variants={staggerItem}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-1',
                fraudColors.border,
                fraudColors.bg,
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t('detail.compranetVisibilityLabel')}
              </div>
              <div className={cn(
                'text-sm font-semibold capitalize leading-snug',
                data.compranet_visibility === 'high' ? 'text-green-400' :
                data.compranet_visibility === 'partial' ? 'text-yellow-400' :
                'text-text-muted',
              )}>
                {t(`compranetVisibility.${data.compranet_visibility}`)}
              </div>
              <div className="text-[11px] text-text-muted">
                {data.compranet_visibility === 'high' ? t('detail.compranetContractsVisible') :
                 data.compranet_visibility === 'partial' ? t('detail.compranetPartiallyVisible') :
                 t('detail.compranetNotVisible')}
              </div>
            </motion.div>
          </motion.div>
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
          <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.caseTimeline')}</p>
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
                        : event.type === 'milestone'
                          ? 'border-border bg-border/30'
                          : 'border-emerald-400 bg-emerald-400/20',
                  )} />
                  <div className="text-xs text-text-muted font-mono">{event.date}</div>
                  <div className="text-sm font-medium text-text-primary">{t(event.labelKey, event.labelParams)}</div>
                  {event.sublabelKey && (
                    <div className="text-[11px] text-text-muted mt-0.5">{t(event.sublabelKey, event.sublabelParams)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How We Detected This ────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-cyan-400">{t('detail.riskSignals')}</h3>
            {avgDetectionScore != null && (
              <span className="ml-auto text-xs font-mono font-bold" style={{ color: RISK_COLORS[getRiskLevelFromScore(avgDetectionScore)] }}>
                {t('detail.avgDetectionScore', { pct: Math.round(avgDetectionScore * 100) })}
              </span>
            )}
          </div>
          {avgDetectionScore != null && avgDetectionScore < 0.30 && (
            <div className="mb-3 p-2 rounded border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-300/80">
              {t('detail.lowScoreWarning', { pct: Math.round(avgDetectionScore * 100) })}
            </div>
          )}
          <div className="space-y-2 text-sm text-text-muted">
            {signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span>{signal}</span>
              </div>
            ))}
          </div>
          {data.ground_truth_case_id != null && (
            <div className="mt-3 pt-3 border-t border-cyan-500/15">
              <div className="flex items-start gap-2 text-[11px] text-text-muted">
                <Activity className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  {t('detail.mlTrainingNote', {
                    vendors: linkedVendors.length > 0
                      ? t('detail.mlVendors', { count: linkedVendors.length })
                      : t('detail.mlContracts'),
                  })}{' '}
                  <Link to="/methodology" className="text-cyan-400 hover:underline">
                    {t('detail.viewModelValidation')}
                  </Link>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Connected Vendors (real data from ground truth) ─────────────────── */}
      {hasRealVendorScores ? (
        <section className="mb-6">
          <p className="text-sm font-bold font-mono text-text-primary mb-3">
            {t('detail.linkedVendors')}
            <span className="text-text-muted font-normal ml-2">{t('detail.linkedVendorsCount', { count: linkedVendors.length })}</span>
          </p>
          <div className="space-y-2">
            {linkedVendors.map((vendor, i) => (
              <div key={i} className="bg-card border border-border/40 rounded-lg p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {vendor.vendor_id ? (
                        <Link
                          to={`/vendors/${vendor.vendor_id}`}
                          className="text-xs font-semibold text-text-primary hover:text-accent transition-colors"
                        >
                          {vendor.vendor_name}
                        </Link>
                      ) : (
                        <div className="text-xs font-semibold text-text-primary">{vendor.vendor_name}</div>
                      )}
                      {vendor.vendor_id && (
                        <Link
                          to={`/contracts?vendor_id=${vendor.vendor_id}&sort_by=risk_score&sort_order=desc`}
                          className="text-text-muted hover:text-accent transition-colors"
                          title="View contracts"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {vendor.vendor_id && (
                        <Link
                          to={`/thread/${vendor.vendor_id}`}
                          className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                          title="Red Thread"
                        >
                          Red Thread
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn(
                        'text-[10px] px-1.5 py-0',
                        fraudColors.border,
                        fraudColors.text,
                      )}>
                        {t(`detail.roles.${vendor.role}`, { defaultValue: vendor.role })}
                      </Badge>
                      <span className="text-[10px] text-text-muted">
                        {t('card.contracts', { n: vendor.contract_count })}
                      </span>
                      {vendor.match_method && (
                        <span className="text-[10px] text-text-muted">{t('detail.matchedBy', { method: vendor.match_method })}</span>
                      )}
                    </div>
                  </div>
                  {vendor.avg_risk_score != null && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t('detail.rubliScore')}</div>
                      <div
                        className="text-base font-mono font-bold"
                        style={{ color: RISK_COLORS[getRiskLevelFromScore(vendor.avg_risk_score)] }}
                      >
                        {Math.round(vendor.avg_risk_score * 100)}%
                      </div>
                    </div>
                  )}
                </div>
                {/* Risk score bar */}
                {vendor.avg_risk_score != null && (
                  <RiskGauge score={vendor.avg_risk_score} />
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (data.key_actors ?? []).filter(a => a.role === 'vendor').length > 0 ? (
        /* Fallback: key actors vendors when no ground truth linked vendors */
        <section className="mb-6">
          <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.connectedVendors')}</p>
          <div className="space-y-2">
            {(data.key_actors ?? [])
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
                      {t('detail.roles.vendor')}
                    </Badge>
                  </div>
                  {actor.note && (
                    <div className="text-[11px] text-text-secondary">{actor.note}</div>
                  )}
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {/* ── Institutions Affected ────────────────────────────────────────────── */}
      {(() => {
        const institutions = (data.key_actors ?? []).filter(a => a.role === 'institution')
        if (institutions.length === 0) return null
        return (
          <section className="mb-6">
            <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.institutionsAffected')}</p>
            <div className="flex flex-wrap gap-2">
              {institutions.map((actor, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border/40 rounded-lg px-3 py-2">
                  <InstitutionBadge name={actor.name} size={24} showTooltip={false} />
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{actor.name}</div>
                    {actor.title && <div className="text-[10px] text-text-muted">{actor.title}</div>}
                    {actor.note && <div className="text-[10px] text-text-secondary">{actor.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      {/* ── Key Actors (officials + journalists, not institutions or vendors) ── */}
      {(data.key_actors ?? []).filter(a => a.role !== 'vendor' && a.role !== 'institution').length > 0 && (
        <section className="mb-6">
          <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.keyActors')}</p>
          <div className="space-y-2">
            {(data.key_actors ?? [])
              .filter(a => a.role !== 'vendor' && a.role !== 'institution')
              .map((actor, i) => (
                <div key={i} className="flex gap-3 bg-card border border-border/40 rounded-lg p-3">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {t(`detail.roles.${actor.role}`)}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary">{actor.name}</div>
                    {actor.title && <div className="text-[11px] text-text-muted">{actor.title}</div>}
                    {actor.note && <div className="text-[11px] text-text-secondary mt-0.5">{actor.note}</div>}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ── Evidence Trail (linked vendors → contract deep-links) ────────────── */}
      {linkedVendors.length > 0 && (
        <section className="mb-6">
          <p className="text-sm font-bold font-mono text-text-primary mb-1">
            {t('detail.evidenceTrail')}
          </p>
          <p className="text-[11px] text-text-muted mb-3">{t('detail.evidenceTrailSubtitle')}</p>
          <div className="rounded-lg border border-border/40 overflow-x-auto">
            <table className="w-full text-xs" aria-label="Case evidence contracts">
              <thead>
                <tr className="border-b border-border/40 bg-card/60">
                  <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {t('detail.roles.vendor')}
                  </th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {t('detail.contractsAffected')}
                  </th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {t('detail.vendorRiskScore')}
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {linkedVendors.map((vendor, i) => {
                  const level = vendor.avg_risk_score != null ? getRiskLevelFromScore(vendor.avg_risk_score) : null
                  const color = level ? RISK_COLORS[level] : undefined
                  return (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-card/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {vendor.vendor_id ? (
                          <Link to={`/vendors/${vendor.vendor_id}`} className="hover:text-accent transition-colors">
                            {vendor.vendor_name}
                          </Link>
                        ) : (
                          vendor.vendor_name
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {vendor.contract_count > 0 ? (
                          vendor.vendor_id ? (
                            <Link
                              to={`/contracts?vendor_id=${vendor.vendor_id}&sort_by=risk_score&sort_order=desc`}
                              className="hover:text-accent transition-colors"
                            >
                              {vendor.contract_count.toLocaleString()}
                            </Link>
                          ) : (
                            vendor.contract_count.toLocaleString()
                          )
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={color ? { color } : undefined}>
                        {vendor.avg_risk_score != null ? `${Math.round(vendor.avg_risk_score * 100)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {vendor.vendor_id && (
                          <Link
                            to={`/contracts?vendor_id=${vendor.vendor_id}&sort_by=risk_score&sort_order=desc`}
                            className="text-[10px] text-text-muted hover:text-accent transition-colors"
                          >
                            {t('detail.viewAllContracts')}
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Sources ─────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="text-sm font-bold font-mono text-text-primary mb-3">{t('detail.sources')}</p>
        {(data.sources ?? []).length === 0 ? (
          <p className="text-xs text-text-muted">{t('detail.noSources')}</p>
        ) : (
          <div className="space-y-2">
            {(data.sources ?? []).map((src, i) => (
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

      {/* ── Similar Cases ────────────────────────────────────────────────────── */}
      {similarCases.length > 0 && (
        <section>
          <p className="text-sm font-bold font-mono text-text-primary mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            {t('detail.similarCases')}
            <span className="text-text-muted font-normal text-xs">
              {t('detail.similarCasesSubtitle', { type: t(`fraudTypes.${data.fraud_type}`) })}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {similarCases.map((cas) => (
              <SimilarCaseCard
                key={cas.slug}
                cas={cas}
                onClick={() => navigate(`/cases/${cas.slug}`)}
              />
            ))}
          </div>
          <div className="mt-3 text-center">
            <button
              onClick={() => navigate(`/cases?fraud_type=${data.fraud_type}`)}
              className="text-xs text-text-muted hover:text-accent transition-colors"
            >
              {t('detail.viewAllCases', { type: t(`fraudTypes.${data.fraud_type}`) })}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
