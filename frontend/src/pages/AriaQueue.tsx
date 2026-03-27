/**
 * EL CUARTO DE GUERRA — ARIA Intelligence Operations Center
 *
 * A published intelligence product. Dark, serious, organized by threat level.
 * Like a printed intelligence bulletin from an anti-corruption unit.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Users,
  Eye,
  Sparkles,
  FileText,
  ArrowRight,
  Building2,
  Crosshair,
  ClipboardEdit,
  Check,
  X as XIcon,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

function getPatternMeta() {
  return {
    P1: { color: 'text-red-300',    bg: 'bg-red-950/60',    border: 'border-red-800' },
    P2: { color: 'text-purple-300', bg: 'bg-purple-950/60', border: 'border-purple-800' },
    P3: { color: 'text-orange-300', bg: 'bg-orange-950/60', border: 'border-orange-800' },
    P4: { color: 'text-yellow-300', bg: 'bg-yellow-950/60', border: 'border-yellow-800' },
    P5: { color: 'text-blue-300',   bg: 'bg-blue-950/60',   border: 'border-blue-800' },
    P6: { color: 'text-pink-300',   bg: 'bg-pink-950/60',   border: 'border-pink-800' },
    P7: { color: 'text-text-muted', bg: 'bg-background-elevated/60', border: 'border-border' },
  }
}

const IPS_COLOR = (score: number) => {
  if (score >= 0.75) return 'bg-red-500'
  if (score >= 0.50) return 'bg-orange-500'
  if (score >= 0.30) return 'bg-yellow-500'
  return 'bg-blue-500'
}

const IPS_TEXT_COLOR = (score: number) => {
  if (score >= 0.75) return 'text-red-400'
  if (score >= 0.50) return 'text-orange-400'
  if (score >= 0.30) return 'text-yellow-400'
  return 'text-blue-400'
}

const TIER_CONFIG = [
  { tier: 1, labelKey: 'tier1.label', nameKey: 'tier1.name', color: 'border-red-600',    bg: 'bg-red-950/40',    textColor: 'text-red-400',    dotColor: 'bg-red-500',    count: 285,    descKey: 'tier1.description' },
  { tier: 2, labelKey: 'tier2.label', nameKey: 'tier2.name', color: 'border-orange-600', bg: 'bg-orange-950/30', textColor: 'text-orange-400', dotColor: 'bg-orange-500', count: 894,    descKey: 'tier2.description' },
  { tier: 3, labelKey: 'tier3.label', nameKey: 'tier3.name', color: 'border-yellow-600', bg: 'bg-yellow-950/20', textColor: 'text-yellow-400', dotColor: 'bg-yellow-500', count: 5151,   descKey: 'tier3.description' },
  { tier: 4, labelKey: 'tier4.label', nameKey: 'tier4.name', color: 'border-blue-800',   bg: 'bg-blue-950/15',   textColor: 'text-blue-400',   dotColor: 'bg-blue-500',   count: 191708, descKey: 'tier4.description' },
] as const

// ============================================================================
// Sub-components
// ============================================================================

function CardStatItem({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation('aria')
  return (
    <div className="bg-background-elevated rounded p-2">
      <div className="text-text-muted mb-0.5">{t(label)}</div>
      <div className="font-semibold text-text-primary">{value}</div>
    </div>
  )
}

// #54 — IPS Breakdown Tooltip
type IpsItemData = { risk_score_norm?: number | null; ensemble_norm?: number | null; financial_scale_norm?: number | null; external_flags_score?: number | null }

function IpsBar({ score, item }: { score: number; item?: IpsItemData }) {
  const { t } = useTranslation('aria')
  const pct = Math.min(100, Math.round(score * 100))
  const [showTooltip, setShowTooltip] = useState(false)
  const hasBreakdown = item && (
    item.risk_score_norm != null ||
    item.ensemble_norm != null ||
    item.financial_scale_norm != null ||
    item.external_flags_score != null
  )

  return (
    <div className="relative flex items-center gap-2">
      <div
        className={cn('flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden', hasBreakdown && 'cursor-help')}
        onMouseEnter={() => hasBreakdown && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className={cn('h-full rounded-full transition-all', IPS_COLOR(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-muted w-8 text-right">{pct}</span>
      {showTooltip && hasBreakdown && item && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-52 rounded-lg border border-border bg-background-card shadow-xl p-3 space-y-1.5 text-xs pointer-events-none">
          <p className="text-[10px] uppercase tracking-wider font-mono text-text-muted font-bold mb-2">{t('ipsBreakdown.title')}</p>
          {([
            { label: t('ipsBreakdown.risk'),     value: item.risk_score_norm,      weight: 0.40, color: 'text-red-400' },
            { label: t('ipsBreakdown.ensemble'),  value: item.ensemble_norm,        weight: 0.20, color: 'text-purple-400' },
            { label: t('ipsBreakdown.financial'), value: item.financial_scale_norm, weight: 0.20, color: 'text-yellow-400' },
            { label: t('ipsBreakdown.external'),  value: item.external_flags_score, weight: 0.20, color: 'text-green-400' },
          ] as { label: string; value: number | null | undefined; weight: number; color: string }[]).map((row) => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-text-muted">{row.label}</span>
              <span className={cn('font-mono tabular-nums', row.color)}>
                {row.value != null ? (row.value * row.weight).toFixed(2) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PatternPill({ pattern }: { pattern: string | null }) {
  const { t } = useTranslation('aria')
  if (!pattern) return null
  const meta = getPatternMeta()[pattern as keyof ReturnType<typeof getPatternMeta>]
  if (!meta) return null
  const label = t(`patterns.${pattern}`)
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border', meta.bg, meta.color, meta.border)}>
      {label}
    </span>
  )
}

function NewVendorBadge() {
  const { t } = useTranslation('aria')
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-950/60 text-purple-300 border border-purple-800">
      <Sparkles className="h-3 w-3" />
      {t('badges.new')}
    </span>
  )
}

// #61 — EFOS Definitivo vs Provisional
function EfosBadge({ definitivo }: { definitivo: boolean }) {
  const { t } = useTranslation('aria')
  return definitivo ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-950/70 text-red-300 border border-red-700">
      {t('efosBadge.definitivo')}
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
      {t('efosBadge.provisional')}
    </span>
  )
}

// Ground truth status badges
function GtStatusBadge({ inGroundTruth }: { inGroundTruth: boolean }) {
  const { t } = useTranslation('aria')
  if (inGroundTruth) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-stone-800/60 text-stone-400 border border-stone-700"
        title={t('gtBadge.knownTooltip', { defaultValue: 'Ya en base de casos documentados' })}
      >
        GT
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-950/60 text-green-300 border border-green-800">
      {t('gtBadge.nuevo', { defaultValue: 'Nuevo' })}
    </span>
  )
}

// #60 — False Positive / Known Signal badge
function FpBadge({ item }: { item: AriaQueueItem }) {
  const { t } = useTranslation('aria')
  if (!item.fp_penalty) return null
  const reason = item.fp_patent_exception
    ? t('fpBadge.patent')
    : item.fp_data_error
    ? t('fpBadge.dataError')
    : item.fp_structural_monopoly
    ? t('fpBadge.structural')
    : t('fpBadge.penalty')
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-stone-800/60 text-stone-400 border border-stone-700">
      {t('fpBadge.label')}: {reason}
    </span>
  )
}

// #56 — Disappeared Vendor badge
function DisappearedBadge({ lastYear }: { lastYear?: number | null }) {
  const { t } = useTranslation('aria')
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-red-950/80 text-red-400 border border-red-700 uppercase tracking-wider">
      {t('disappeared.badge')}
      {lastYear != null && (
        <span className="font-normal normal-case tracking-normal text-red-400/70">
          {t('disappeared.lastContract', { year: lastYear })}
        </span>
      )}
    </span>
  )
}

// #55 — Pattern confidence breakdown row
function PatternConfidenceRow({ confidences, primaryPattern }: { confidences: Record<string, number> | null | undefined; primaryPattern?: string | null }) {
  const { t } = useTranslation('aria')
  if (!confidences) return null
  const entries = Object.entries(confidences)
    .filter(([k, v]) => v > 0.10 && k !== primaryPattern)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([pattern, conf]) => {
        const meta = getPatternMeta()[pattern as keyof ReturnType<typeof getPatternMeta>]
        if (!meta) return null
        return (
          <span key={pattern} className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border opacity-75', meta.bg, meta.color, meta.border)}>
            {t(`patterns.${pattern}`)} <span className="font-mono opacity-60">{Math.round(conf * 100)}%</span>
          </span>
        )
      })}
    </div>
  )
}

// ============================================================================
// Review Status Badge
// ============================================================================

type ReviewStatus = 'pending' | 'confirmed' | 'dismissed' | 'reviewing'

const REVIEW_STATUS_META: Record<ReviewStatus, { className: string }> = {
  pending:   { className: 'bg-stone-800/60 text-stone-400 border-stone-700' },
  reviewing: { className: 'bg-orange-950/60 text-orange-400 border-orange-800' },
  confirmed: { className: 'bg-green-950/60 text-green-400 border-green-800' },
  dismissed: { className: 'bg-stone-900/60 text-stone-500 border-stone-800' },
}

function ReviewStatusBadge({ status }: { status: ReviewStatus | null | undefined }) {
  const { t } = useTranslation('aria')
  const s = (status ?? 'pending') as ReviewStatus
  const meta = REVIEW_STATUS_META[s] ?? REVIEW_STATUS_META.pending
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', meta.className)}>
      {t('status.' + s)}
    </span>
  )
}

// ============================================================================
// Review Popover
// ============================================================================

function ReviewPopover({
  vendorId,
  currentStatus,
  onClose,
}: {
  vendorId: number
  currentStatus: ReviewStatus | null | undefined
  onClose: () => void
}) {
  const { t } = useTranslation('aria')
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ReviewStatus>((currentStatus ?? 'pending') as ReviewStatus)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (s: ReviewStatus) =>
      ariaApi.updateReview(vendorId, { review_status: s }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aria-queue-leads'] })
      queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
      onClose()
    },
  })

  const statuses: ReviewStatus[] = ['pending', 'reviewing', 'confirmed', 'dismissed']

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-52 rounded-lg border border-border bg-background-card shadow-xl p-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] uppercase tracking-wider font-mono text-text-muted font-bold mb-2">
        {t('reviewPopover.reviewStatus')}
      </p>
      {statuses.map((s) => {
        const meta = REVIEW_STATUS_META[s]
        const isSelected = status === s
        return (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium border transition-colors',
              isSelected
                ? cn(meta.className, 'ring-1 ring-white/10')
                : 'bg-background-elevated/40 border-border text-text-secondary hover:border-accent/40'
            )}
          >
            {isSelected && <Check className="h-3 w-3 shrink-0" />}
            {!isSelected && <span className="w-3 shrink-0" />}
            {t('status.' + s)}
          </button>
        )
      })}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <button
          onClick={() => mutation.mutate(status)}
          disabled={mutation.isPending}
          className="flex-1 py-1.5 rounded text-xs font-medium bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? t('reviewPopover.saving') : t('reviewPopover.save')}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          aria-label={t('reviewPopover.close')}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {mutation.isError && (
        <p className="text-[10px] text-red-400">{t('reviewPopover.error')}</p>
      )}
    </div>
  )
}

// ============================================================================
// Threat Level Card
// ============================================================================

function ThreatLevelCard({ config, actualCount }: { config: typeof TIER_CONFIG[number]; actualCount?: number }) {
  const { t } = useTranslation('aria')
  const count = actualCount ?? config.count
  return (
    <div className={cn(
      'relative border-l-4 rounded-r-lg p-4',
      config.color,
      config.bg,
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-text-muted">
          {t(config.labelKey)}
        </span>
        {config.tier === 1 && (
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dotColor)} />
        )}
      </div>
      <div className={cn('text-2xl font-bold font-mono', config.textColor)}>
        {formatNumber(count)}
      </div>
      <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-text-muted mt-0.5">
        {t(config.nameKey)}
      </div>
      <div className="text-xs text-text-muted/70 mt-1.5">
        {t(config.descKey)}
      </div>
    </div>
  )
}

// ============================================================================
// Intel Pattern Card
// ============================================================================

function IntelPatternCard({
  pattern,
  count,
  isActive,
  onClick,
}: {
  pattern: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const { t } = useTranslation('aria')
  const meta = getPatternMeta()[pattern as keyof ReturnType<typeof getPatternMeta>]
  if (!meta) return null
  const label = t(`patterns.${pattern}`)

  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-3 rounded-lg border transition-all',
        isActive
          ? cn(meta.bg, meta.border, 'ring-1 ring-white/10')
          : 'bg-background-elevated/40 border-border hover:border-accent/30'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn('text-xs font-mono font-bold', isActive ? meta.color : 'text-text-muted')}>
          {pattern}
        </span>
        <span className={cn('text-xs font-semibold', isActive ? meta.color : 'text-text-secondary')}>
          {label}
        </span>
      </div>
      <div className="text-lg font-bold font-mono text-text-primary">
        {formatNumber(count)}
      </div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">
        {t('leads.vendorCount')}
      </div>
    </button>
  )
}

// ============================================================================
// Spotlight Card -- editorial Tier 1 card
// ============================================================================

function SpotlightCard({ item, index, t }: { item: AriaQueueItem; index: number; t: ReturnType<typeof useTranslation>['t'] }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const ips = item.ips_final ?? 0
  const value = item.total_value_mxn ?? 0
  const contracts = item.total_contracts ?? 0
  const memo = item.memo_text ?? ''
  const memoSnippet = memo.length > 0
    ? memo.slice(0, 220).replace(/^#{1,3}\s+.+\n?/, '').trim()
    : null

  return (
    <motion.div variants={staggerItem}>
      <Card className="border border-border bg-background-card hover:border-red-800/60 transition-colors group h-full flex flex-col">
        <CardContent className="p-5 flex flex-col gap-3 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[10px] font-mono tracking-wider text-red-400/80 font-bold">
                  {t('tier1.objective', { number: index + 1 })}
                </span>
                <PatternPill pattern={item.primary_pattern ?? null} />
                {item.new_vendor_risk && <NewVendorBadge />}
                <GtStatusBadge inGroundTruth={item.in_ground_truth} />
                {item.is_efos_definitivo != null && (
                  <EfosBadge definitivo={item.is_efos_definitivo} />
                )}
                {item.is_disappeared && (
                  <DisappearedBadge lastYear={item.last_contract_year} />
                )}
              </div>
              <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2">
                {item.vendor_name}
              </h3>
              {item.top_institution && (
                <p className={cn(
                  'text-xs mt-0.5 flex items-center gap-1',
                  item.top_institution_ratio != null && item.top_institution_ratio > 0.80
                    ? 'text-amber-400/80'
                    : 'text-text-muted'
                )}>
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.top_institution}</span>
                  {item.top_institution_ratio != null && (
                    <span className="font-mono shrink-0">
                      {Math.round(item.top_institution_ratio * 100)}%
                      {item.top_institution_ratio > 0.80 && (
                        <span className="ml-1 text-[10px] text-amber-500/70">{t('topInstitution.capture')}</span>
                      )}
                    </span>
                  )}
                </p>
              )}
              <PatternConfidenceRow confidences={item.pattern_confidences} primaryPattern={item.primary_pattern} />
              <FpBadge item={item} />
            </div>
            <div className="shrink-0 text-right">
              <div className={cn('text-2xl font-bold font-mono', IPS_TEXT_COLOR(ips))}>
                {Math.round(ips * 100)}
              </div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">IPS</div>
            </div>
          </div>

          {/* IPS bar with breakdown tooltip (#54) */}
          <IpsBar score={ips} item={item} />

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <CardStatItem label="card.totalValue" value={formatCompactMXN(value)} />
            <div className="bg-background-elevated rounded p-2">
              <div className="text-text-muted mb-0.5 text-xs">{t('card.contracts')}</div>
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                {formatNumber(contracts)}
                {item.burst_score != null && item.burst_score > 0.70 && (
                  <span className={cn(
                    'text-[10px] font-mono px-1 py-0.5 rounded',
                    item.burst_score > 0.85 ? 'text-red-400 bg-red-950/40' : 'text-orange-400 bg-orange-950/40'
                  )}>
                    {t('burst.label')} {(item.burst_score * 100).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            {item.avg_risk_score != null && (
              <CardStatItem label="card.avgRisk" value={`${(item.avg_risk_score * 100).toFixed(0)}/100`} />
            )}
            {item.value_per_contract != null && (
              <div className="bg-background-elevated rounded p-2">
                <div className="text-text-muted mb-0.5 text-xs">{t('valuePerContract.label')}</div>
                <div className="font-semibold text-text-primary flex items-center gap-1">
                  {formatCompactMXN(item.value_per_contract)}
                  {item.value_per_contract > 5_000_000 && (
                    <span className="text-amber-400 text-[10px]" title={t('valuePerContract.highFlag')}>⚠</span>
                  )}
                </div>
              </div>
            )}
            {item.value_per_contract == null && item.direct_award_rate != null && (
              <CardStatItem label="card.directAward" value={`${(item.direct_award_rate * 100).toFixed(0)}%`} />
            )}
          </div>

          {/* Risk indicator disclaimer */}
          <p className="text-[10px] text-text-muted/60 italic">
            {t('vendorCard.disclaimer')}
          </p>

          {/* Memo excerpt */}
          {memoSnippet && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-text-secondary italic leading-relaxed line-clamp-3">
                "{memoSnippet}..."
              </p>
            </div>
          )}

          {/* Full memo expandable */}
          {memo.length > 220 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 self-start"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? t('memo.less') : t('memo.full')}
            </button>
          )}
          {expanded && memo && (
            <div className="border border-border rounded p-3 bg-background-elevated text-xs text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {memo}
            </div>
          )}

          {/* Red Thread CTA */}
          <div className="mt-auto pt-2 border-t border-border">
            <button
              onClick={() => navigate(`/thread/${item.vendor_id}`)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 py-1.5 rounded hover:bg-accent/10 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Red Thread
              <ArrowRight className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Lead Row -- compact expandable table row for Tier 2-4
// ============================================================================

function LeadRow({
  item,
  expanded,
  onToggle,
  t,
}: {
  item: AriaQueueItem
  expanded: boolean
  onToggle: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  const navigate = useNavigate()
  const ips = item.ips_final ?? 0
  const [reviewOpen, setReviewOpen] = useState(false)

  return (
    <>
      <tr
        className={cn(
          'border-b border-border hover:bg-background-elevated/50 cursor-pointer transition-colors text-sm',
          expanded && 'bg-background-elevated/30'
        )}
        onClick={onToggle}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-text-muted shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
            )}
            <span className="font-medium text-text-primary line-clamp-1">{item.vendor_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            <PatternPill pattern={item.primary_pattern ?? null} />
            {item.new_vendor_risk && <NewVendorBadge />}
            <GtStatusBadge inGroundTruth={item.in_ground_truth} />
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-text-secondary font-mono text-xs">
          {formatCompactMXN(item.total_value_mxn ?? 0)}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="flex items-center gap-2">
            <IpsBar score={ips} />
            <span className={cn('text-sm font-bold font-mono w-8', IPS_TEXT_COLOR(ips))}>
              {Math.round(ips * 100)}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            'inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
            item.ips_tier === 1 ? 'bg-red-950/60 text-red-400' :
            item.ips_tier === 2 ? 'bg-orange-950/60 text-orange-400' :
            item.ips_tier === 3 ? 'bg-yellow-950/40 text-yellow-400' :
            'bg-blue-950/30 text-blue-400'
          )}>
            T{item.ips_tier ?? '?'}
          </span>
        </td>
        {/* Review status column */}
        <td className="px-4 py-3 hidden xl:table-cell">
          <ReviewStatusBadge status={item.review_status as ReviewStatus | undefined} />
        </td>
        {/* Actions column */}
        <td className="px-4 py-3">
          <div className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setReviewOpen((v) => !v)}
              className="text-text-muted hover:text-accent p-1 rounded hover:bg-accent/10 transition-colors"
              aria-label="Review"
              title={t('reviewPopover.updateTitle')}
            >
              <ClipboardEdit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${item.vendor_id}`) }}
              className="text-text-muted hover:text-accent p-1 rounded hover:bg-accent/10 transition-colors"
              aria-label={t('actions.vendorProfile')}
              title={t('actions.vendorProfile')}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/thread/${item.vendor_id}`) }}
              className="text-accent hover:text-accent/80 p-1 rounded hover:bg-accent/10 transition-colors"
              aria-label={t('actions.redThread')}
              title={t('actions.redThread')}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {reviewOpen && (
              <ReviewPopover
                vendorId={item.vendor_id}
                currentStatus={item.review_status as ReviewStatus | undefined}
                onClose={() => setReviewOpen(false)}
              />
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-background-elevated/20">
          <td colSpan={8} className="px-6 py-4">
            <div className="border-l-2 border-accent/30 pl-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent/60 font-mono font-bold mb-2">
                {t('intelligenceDetails')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
                <div>
                  <span className="text-text-muted">{t('rowLabels.contracts')} </span>
                  <span className="text-text-primary font-medium font-mono">{formatNumber(item.total_contracts ?? 0)}</span>
                </div>
                {item.avg_risk_score != null && (
                  <div>
                    <span className="text-text-muted">{t('rowLabels.avgRisk')} </span>
                    <span className="text-text-primary font-medium font-mono">{(item.avg_risk_score * 100).toFixed(0)}%</span>
                  </div>
                )}
                {item.direct_award_rate != null && (
                  <div>
                    <span className="text-text-muted">{t('rowLabels.directAward')} </span>
                    <span className="text-text-primary font-medium font-mono">{(item.direct_award_rate * 100).toFixed(0)}%</span>
                  </div>
                )}
                {item.top_institution && (
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-text-muted">{t('rowLabels.institution')} </span>
                    <span className="text-text-primary font-medium">{item.top_institution}</span>
                  </div>
                )}
              </div>
              {item.memo_text && (
                <p className="text-xs text-text-secondary italic leading-relaxed border-t border-border pt-2 line-clamp-3">
                  "{item.memo_text.slice(0, 300).replace(/^#{1,3}\s+.+\n?/, '').trim()}..."
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function AriaPage() {
  const { t, i18n } = useTranslation('aria')
  const [search, setSearch] = useState('')
  const [patternFilter, setPatternFilter] = useState<string | null>(null)
  const [newVendorOnly, setNewVendorOnly] = useState(false)
  const [novelOnly, setNovelOnly] = useState(false)
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [collapsedTiers, setCollapsedTiers] = useState<Set<number>>(new Set([3, 4]))

  const PER_PAGE = 50

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery<AriaStatsResponse>({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60_000,
  })

  // Tier 1 spotlight
  const { data: tier1Data, isLoading: tier1Loading } = useQuery({
    queryKey: ['aria-queue', { tier: 1 }],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 12 }),
    staleTime: 5 * 60_000,
  })

  // Full leads table
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['aria-queue-leads', { page, search, patternFilter, newVendorOnly, reviewStatusFilter }],
    queryFn: () =>
      ariaApi.getQueue({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        pattern: patternFilter ?? undefined,
        new_vendor_only: newVendorOnly || undefined,
        status: reviewStatusFilter ?? undefined,
        tier: patternFilter || newVendorOnly || search || reviewStatusFilter ? undefined : 2,
      }),
    staleTime: 2 * 60_000,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}
  const efosCount = stats?.external_counts?.efos ?? 0
  const elevatedValue = stats?.elevated_value_mxn ?? 0

  const tier1Items: AriaQueueItem[] = tier1Data?.data ?? []
  const leadsItemsRaw: AriaQueueItem[] = leadsData?.data ?? []
  const leadsItems: AriaQueueItem[] = novelOnly
    ? leadsItemsRaw.filter((item) => !item.in_ground_truth)
    : leadsItemsRaw

  const locale = i18n.language === 'es' ? 'es-MX' : 'en-US'
  const lastRunAt = stats?.latest_run?.completed_at
    ? new Intl.DateTimeFormat(locale, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(stats.latest_run.completed_at))
    : null

  const todayStr = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-background">

      {/* ================================================================== */}
      {/* COMPACT STATUS BAR                                                  */}
      {/* ================================================================== */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-mono">
            ARIA SYSTEM &middot; {t('header.statusActive')}
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-sm font-semibold text-text-primary">{t('header.title')}</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-live animate-pulse" />
              <span className="text-[11px] text-text-muted">
                {tier1Data?.pagination?.total ?? 285} {t('header.t1Require')}
              </span>
            </span>
          </div>
        </div>
        <div className="text-[10px] text-text-muted font-mono">
          {t('header.lastUpdated')}: {lastRunAt ?? todayStr}
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPACT STATS PILL ROW                                              */}
      {/* ================================================================== */}
      <div className="flex flex-wrap gap-4 px-6 py-2 bg-background-card/50 border-b border-border text-[11px] text-text-muted">
        <span><strong className="text-text-primary font-mono">{formatNumber(stats?.queue_total ?? 198038)}</strong> {t('stats.vendorsUnderSurveillance')}</span>
        <span>&middot;</span>
        <span><strong className="text-text-primary font-mono">{formatCompactMXN(elevatedValue)}</strong> {t('stats.valueAtRisk')}</span>
        <span>&middot;</span>
        <span><strong className="text-red-400 font-mono">{formatNumber(efosCount)}</strong> {t('stats.onEfos')}</span>
        {stats?.reviewed_count != null && stats.reviewed_count > 0 && (
          <>
            <span>&middot;</span>
            <span>
              <strong className="text-text-primary font-mono">{formatNumber(stats.reviewed_count)}</strong> {t('efficiencyStats.reviewed')}
              {stats.confirmed_count != null && stats.reviewed_count > 0 && (
                <span className="ml-1 text-green-400/80">
                  ({Math.round((stats.confirmed_count / stats.reviewed_count) * 100)}% {t('efficiencyStats.confirmationRate')})
                </span>
              )}
            </span>
            {stats.t1_reviewed_count != null && (
              <>
                <span>&middot;</span>
                <span>
                  <strong className="text-text-primary font-mono">
                    {Math.round(((stats.t1_reviewed_count) / (tier1Data?.pagination?.total ?? 285)) * 100)}%
                  </strong> {t('efficiencyStats.t1Complete')}
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Data source attribution */}
        <div className="flex flex-wrap items-center gap-3">
          <FuentePill source="COMPRANET" verified={true} />
          <FuentePill source="SAT EFOS" count={13960} />
          <MetodologiaTooltip
            title={t('methodology.title')}
            body={t('methodology.body')}
            link="/methodology"
          />
        </div>

        {/* ================================================================ */}
        {/* INTEL PATTERNS — classification grid (FIRST interactive element) */}
        {/* ================================================================ */}
        {Object.keys(patternCounts).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <p className="text-[11px] tracking-[0.2em] uppercase font-mono text-text-muted font-bold">
                {t('patternSection.title')}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {Object.entries(patternCounts).map(([pattern, count]) => (
                <IntelPatternCard
                  key={pattern}
                  pattern={pattern}
                  count={count}
                  isActive={patternFilter === pattern}
                  onClick={() => { setPatternFilter(patternFilter === pattern ? null : pattern); setPage(1) }}
                />
              ))}
            </div>
            {/* Additional filter toggles */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={() => { setPatternFilter(null); setNewVendorOnly(false); setNovelOnly(false); setSearch(''); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors font-mono',
                  !patternFilter && !newVendorOnly
                    ? 'bg-accent text-white border-accent'
                    : 'bg-background-elevated text-text-secondary border-border hover:border-accent/50'
                )}
              >
                {t('filters.all')}
              </button>
              <button
                onClick={() => { setNewVendorOnly(!newVendorOnly); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                  newVendorOnly
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                    : 'bg-background-elevated text-text-secondary border-border hover:border-accent/50'
                )}
              >
                <Sparkles className="h-3 w-3" />
                {t('filters.newVendorOnly')}
                {stats?.new_vendor_count ? <span className="opacity-60">({formatNumber(stats.new_vendor_count)})</span> : null}
              </button>
              <button
                onClick={() => { setNovelOnly(!novelOnly); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5',
                  novelOnly
                    ? 'bg-green-950/60 text-green-300 border-green-800'
                    : 'bg-background-elevated text-text-secondary border-border hover:border-accent/50'
                )}
                title={t('filters.novelOnlyTooltip', { defaultValue: 'Mostrar solo leads que no están en la base de casos documentados' })}
              >
                {t('filters.novelOnly', { defaultValue: 'Solo nuevos' })}
              </button>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* THREAT LEVEL INDICATORS — T1/T2 expanded, T3/T4 collapsed        */}
        {/* ================================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Crosshair className="h-4 w-4 text-red-400" />
            <p className="text-[11px] tracking-[0.2em] uppercase font-mono text-text-muted font-bold">
              {t('threatLevels')}
            </p>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {TIER_CONFIG.map((cfg) => {
                const isCollapsed = collapsedTiers.has(cfg.tier)
                return (
                  <motion.div key={cfg.tier} variants={staggerItem}>
                    {isCollapsed ? (
                      <button
                        onClick={() => {
                          const next = new Set(collapsedTiers)
                          next.delete(cfg.tier)
                          setCollapsedTiers(next)
                        }}
                        className={cn(
                          'w-full text-left relative border-l-4 rounded-r-lg p-3 opacity-60 hover:opacity-100 transition-opacity',
                          cfg.color,
                          cfg.bg,
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-text-muted">{t(cfg.labelKey)}</span>
                            <div className={cn('text-lg font-bold font-mono', cfg.textColor)}>
                              {formatNumber(cfg.count)}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-text-muted" />
                        </div>
                        <div className="text-[10px] text-text-muted/60 mt-1">
                          {t('tierCollapse.show', { count: cfg.count })}
                        </div>
                      </button>
                    ) : (
                      <div className="relative">
                        <ThreatLevelCard config={cfg} />
                        {cfg.tier >= 3 && (
                          <button
                            onClick={() => {
                              const next = new Set(collapsedTiers)
                              next.add(cfg.tier)
                              setCollapsedTiers(next)
                            }}
                            className="absolute top-2 right-2 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </section>

        {/* ── Pipeline Not Run Yet ── */}
        {!statsLoading && !lastRunAt && (stats?.queue_total ?? 0) === 0 && (
          <Card className="border border-border bg-background-card">
            <CardContent className="p-10 text-center text-text-muted">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-text-secondary mb-1">{t('errors.notRun')}</p>
              <p className="text-xs">
                {t('errors.notRunDesc')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* TIER 1 SPOTLIGHT — critical targets                              */}
        {/* ================================================================ */}
        {!patternFilter && !newVendorOnly && !search && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-red-400" />
                  <p className="text-[11px] tracking-[0.2em] uppercase font-mono text-red-400 font-bold">
                    {t('tierSection.objectives')}
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <p className="text-xs text-text-muted">
                  {t('tier1.subtitle')}
                </p>
              </div>
            </div>

            {tier1Loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : tier1Items.length === 0 ? (
              <Card className="border border-border bg-background-card">
                <CardContent className="p-8 text-center text-text-muted">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{t('tier1.empty')}</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {tier1Items.map((item, i) => (
                  <SpotlightCard key={item.vendor_id} item={item} index={i} t={t} />
                ))}
              </motion.div>
            )}
          </section>
        )}

        {/* ================================================================ */}
        {/* FULL INTELLIGENCE QUEUE                                          */}
        {/* ================================================================ */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-text-muted" />
                <p className="text-[11px] tracking-[0.2em] uppercase font-mono text-text-muted font-bold">
                  {patternFilter || newVendorOnly || search ? t('leads.filteredResults') : t('queueSection.title')}
                </p>
              </div>
              {totalLeads > 0 && (
                <p className="text-xs text-text-muted font-mono">{formatNumber(totalLeads)} {t('leads.vendorCount')}</p>
              )}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder={t('leads.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-3 py-2 text-sm bg-background-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/60 w-64 font-mono"
              />
            </div>
          </div>

          {/* Review status filter chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted">{t('table.review')}</span>
            {([null, 'pending', 'reviewing', 'confirmed', 'dismissed'] as (ReviewStatus | null)[]).map((s) => {
              const meta = s ? REVIEW_STATUS_META[s] : null
              const isActive = reviewStatusFilter === s
              return (
                <button
                  key={s ?? 'all'}
                  onClick={() => { setReviewStatusFilter(s); setPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                    isActive
                      ? s
                        ? cn(meta!.className, 'ring-1 ring-white/10')
                        : 'bg-accent text-white border-accent'
                      : 'bg-background-elevated text-text-muted border-border hover:border-accent/40'
                  )}
                >
                  {s ? t('status.' + s) : t('reviewFilter.all')}
                </button>
              )
            })}
          </div>

          <Card className="border border-border bg-background-card overflow-hidden">
            {leadsLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : leadsItems.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>{t('leads.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background-elevated/50">
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
                        {t('table.headers.vendor')}
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">
                        {t('table.headers.pattern')}
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider hidden sm:table-cell">
                        {t('table.headers.value')}
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider hidden lg:table-cell w-44">
                        {t('table.headers.ips')}
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider w-12">
                        TIER
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider hidden xl:table-cell">
                        REVISIÓN
                      </th>
                      <th className="px-4 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {leadsItems.map((item) => (
                      <LeadRow
                        key={item.vendor_id}
                        item={item}
                        expanded={expandedId === item.vendor_id}
                        onToggle={() =>
                          setExpandedId(expandedId === item.vendor_id ? null : item.vendor_id)
                        }
                        t={t}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
              >
                {t('pagination.previous')}
              </button>
              <span className="text-sm text-text-muted font-mono">
                {t('pagination.pageOf', { page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* METHODOLOGY NOTE                                                 */}
        {/* ================================================================ */}
        <section>
          <Card className="border border-border bg-background-card">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                <div className="text-xs text-text-muted space-y-1">
                  <p className="font-semibold text-text-secondary font-mono uppercase tracking-wider">{t('about.title')}</p>
                  <p>
                    {t('about.description')}
                  </p>
                  <p>
                    {t('about.disclaimer')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}
