/**
 * ARIA — Cola de Investigación
 *
 * Evenflow redesign: one eye-path down the page.
 *   1. Compact header (title · search · tier pills)
 *   2. Hero stat strip (4 small numbers)
 *   3. Tier navigation (horizontal clickable rows)
 *   4. Pattern filter chips
 *   5. Investigation rows — one row per vendor, ONE action
 *   6. Methodology footer
 *
 * Credo: "evenflow" — ONE obvious action per element.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ariaApi } from '@/api/client'
import { TableExportButton } from '@/components/TableExportButton'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { getSectorNameEN } from '@/lib/constants'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import {
  Search,
  ChevronRight,
  AlertTriangle,
  FileText,
  ArrowRight,
  ClipboardEdit,
  Check,
  X as XIcon,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

type PatternKey = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'

// Phase 1 design system: collapse 7 pattern colors → 3 semantic families.
//   red    = monopoly / capture (P1, P6) — structural risk
//   amber  = ghost / intermediary (P2, P3, P7) — vendor opacity
//   zinc   = everything else (P4, P5) — neutral / pattern unknown
const PATTERN_META: Record<PatternKey, { text: string; bg: string; border: string; dot: string }> = {
  P1: { text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-500' },
  P2: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  P3: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  P4: { text: 'text-zinc-400',  bg: 'bg-zinc-800/50',  border: 'border-zinc-700/30',  dot: 'bg-zinc-500' },
  P5: { text: 'text-zinc-400',  bg: 'bg-zinc-800/50',  border: 'border-zinc-700/30',  dot: 'bg-zinc-500' },
  P6: { text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-500' },
  P7: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
}

// IPS pill color mirrors risk severity bands (critical/high/medium/low).
const IPS_TEXT_COLOR = (score: number) => {
  if (score >= 0.75) return 'text-red-400'   // critical
  if (score >= 0.50) return 'text-amber-400' // high
  if (score >= 0.30) return 'text-zinc-300'  // medium
  return 'text-zinc-500'                      // low
}

const IPS_BG_COLOR = (score: number) => {
  if (score >= 0.75) return 'bg-red-500/10 border-red-500/20'
  if (score >= 0.50) return 'bg-amber-500/10 border-amber-500/20'
  if (score >= 0.30) return 'bg-zinc-800/50 border-zinc-700/30'
  return 'bg-zinc-900/50 border-zinc-800'
}

type TierConfig = {
  tier: 1 | 2 | 3 | 4
  labelKey: string
  nameKey: string
  accent: string     // border-left color
  textColor: string
  pillBg: string
  pillText: string
  descKey: string
}

// Tier accent: T1 critical=red, T2 high=amber, T3 medium=zinc-400, T4 low=zinc-600
const TIER_CONFIG: TierConfig[] = [
  { tier: 1, labelKey: 'tier1.label', nameKey: 'tier1.name', accent: 'border-l-red-500',   textColor: 'text-red-400',   pillBg: 'bg-red-500/10',   pillText: 'text-red-400',   descKey: 'tier1.description' },
  { tier: 2, labelKey: 'tier2.label', nameKey: 'tier2.name', accent: 'border-l-amber-500', textColor: 'text-amber-400', pillBg: 'bg-amber-500/10', pillText: 'text-amber-400', descKey: 'tier2.description' },
  { tier: 3, labelKey: 'tier3.label', nameKey: 'tier3.name', accent: 'border-l-zinc-500',  textColor: 'text-zinc-400',  pillBg: 'bg-zinc-800/50',  pillText: 'text-zinc-400',  descKey: 'tier3.description' },
  { tier: 4, labelKey: 'tier4.label', nameKey: 'tier4.name', accent: 'border-l-zinc-700',  textColor: 'text-zinc-600',  pillBg: 'bg-zinc-900/50',  pillText: 'text-zinc-500',  descKey: 'tier4.description' },
]

type ReviewStatus = 'pending' | 'confirmed' | 'dismissed' | 'reviewing'

// Phase 1: review status pills use the canonical 3-color system (red/amber/zinc).
// "confirmed" no longer uses green — confirmed-corrupt is a critical finding, not a "safe" state.
const REVIEW_STATUS_META: Record<ReviewStatus, { className: string }> = {
  pending:   { className: 'bg-zinc-800/60 text-zinc-400 border-zinc-700' },
  reviewing: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  dismissed: { className: 'bg-zinc-900/60 text-zinc-500 border-zinc-800' },
}

// ============================================================================
// Tier pill — used in header filter row
// ============================================================================

function TierFilterPill({
  tier,
  count,
  isActive,
  loading,
  onClick,
}: {
  tier: TierConfig
  count: number
  isActive: boolean
  loading?: boolean
  onClick: () => void
}) {
  const { t } = useTranslation('aria')
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors',
        isActive
          ? cn(tier.pillBg, tier.pillText, 'border-current')
          : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('font-mono font-bold', isActive ? tier.textColor : 'text-zinc-500')}>
        {t(tier.labelKey).replace(/^Nivel\s+/i, 'T')}
      </span>
      {loading
        ? <span className="w-6 h-2.5 rounded bg-zinc-700 animate-pulse" />
        : <span className="font-mono tabular-nums">{formatNumber(count)}</span>
      }
    </button>
  )
}

// ============================================================================
// Tier navigation row — horizontal clickable band replaces bulky tier cards
// ============================================================================

function TierNavigationRow({
  tier,
  count,
  avgRisk,
  valueAtRisk,
  isActive,
  onClick,
}: {
  tier: TierConfig
  count: number
  avgRisk: number | null
  valueAtRisk: number | null
  isActive: boolean
  onClick: () => void
}) {
  const { t } = useTranslation('aria')
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-4 px-4 py-3 rounded-md border border-zinc-800 border-l-4 transition-all',
        tier.accent,
        isActive
          ? 'bg-background-elevated border-opacity-100'
          : 'bg-background-card/40 hover:bg-background-card/80'
      )}
      aria-pressed={isActive}
    >
      <div className="shrink-0 w-20">
        <div className={cn('text-[10px] font-mono font-bold uppercase tracking-[0.15em]', tier.textColor)}>
          {t(tier.labelKey)}
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
          {t(tier.nameKey)}
        </div>
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
        <div>
          <div className={cn('stat-sm tabular-nums', tier.textColor)}>
            {formatNumber(count)}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            {t('leads.vendorCount')}
          </div>
        </div>
        <div>
          <div className="stat-sm font-mono tabular-nums text-zinc-200">
            {avgRisk != null ? `${(avgRisk * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            {t('tierCard.avgRisk')}
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="stat-sm font-mono tabular-nums text-zinc-200">
            {valueAtRisk != null && valueAtRisk > 0 ? formatCompactMXN(valueAtRisk) : '—'}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            {t('tierCard.valueAtRisk')}
          </div>
        </div>
      </div>

      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'text-amber-400 translate-x-0.5' : 'text-zinc-600')} />
    </button>
  )
}

// ============================================================================
// Pattern chip — compact filter chip
// ============================================================================

function PatternChip({
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
  const meta = PATTERN_META[pattern as PatternKey]
  if (!meta) return null
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors',
        isActive
          ? cn(meta.bg, meta.text, meta.border)
          : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      <span className={cn(isActive ? meta.text : 'text-zinc-300')}>{t(`patterns.${pattern}`)}</span>
      <span className="font-mono tabular-nums text-zinc-500">{formatNumber(count)}</span>
    </button>
  )
}

// ============================================================================
// Review popover (kept — useful inline action)
// ============================================================================

function ReviewPopover({
  vendorId,
  currentStatus,
  inGroundTruth,
  onClose,
}: {
  vendorId: number
  currentStatus: ReviewStatus | null | undefined
  inGroundTruth?: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('aria')
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ReviewStatus>((currentStatus ?? 'pending') as ReviewStatus)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (s: ReviewStatus) => ariaApi.updateReview(vendorId, { review_status: s }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aria-queue-leads'] })
      queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
      onClose()
    },
  })

  const promoteMutation = useMutation({
    mutationFn: () => ariaApi.promoteToGroundTruth(vendorId, { confidence_level: 'medium' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aria-queue-leads'] })
      queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
      queryClient.invalidateQueries({ queryKey: ['aria-stats'] })
      onClose()
    },
  })

  const statuses: ReviewStatus[] = ['pending', 'reviewing', 'confirmed', 'dismissed']

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-56 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl p-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold mb-2">
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
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            )}
          >
            {isSelected && <Check className="h-3 w-3 shrink-0" />}
            {!isSelected && <span className="w-3 shrink-0" />}
            {t('status.' + s)}
          </button>
        )
      })}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
        <button
          onClick={() => mutation.mutate(status)}
          disabled={mutation.isPending}
          className="flex-1 py-1.5 rounded text-xs font-medium bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? t('reviewPopover.saving') : t('reviewPopover.save')}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          aria-label={t('reviewPopover.close')}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {status === 'confirmed' && !inGroundTruth && (
        <button
          onClick={() => promoteMutation.mutate()}
          disabled={promoteMutation.isPending || promoteMutation.isSuccess}
          className="w-full py-1.5 rounded text-xs font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
        >
          {promoteMutation.isPending ? t('reviewPopover.promoting') : promoteMutation.isSuccess ? t('reviewPopover.promotedToGT') : t('reviewPopover.promoteToGT')}
        </button>
      )}
      {inGroundTruth && (
        <p className="text-[10px] text-zinc-500 text-center">{t('reviewPopover.alreadyInGT')}</p>
      )}
      {(mutation.isError || promoteMutation.isError) && (
        <p className="text-[10px] text-red-400">{t('reviewPopover.error')}</p>
      )}
    </div>
  )
}

// ============================================================================
// Investigation Row — the core card, replaces both SpotlightCard + LeadRow
// Evenflow: [Tier] [Vendor name · subline] [Pattern] [IPS] [→]
// ============================================================================

function InvestigationRow({ item }: { item: AriaQueueItem }) {
  const { t } = useTranslation('aria')
  const navigate = useNavigate()
  const [reviewOpen, setReviewOpen] = useState(false)

  const ips = item.ips_final ?? 0
  const ipsPct = Math.round(ips * 100)
  const tier = item.ips_tier ?? 4
  const tierCfg = TIER_CONFIG.find((c) => c.tier === tier) ?? TIER_CONFIG[3]
  const patternMeta = item.primary_pattern
    ? PATTERN_META[item.primary_pattern as PatternKey]
    : null

  const value = item.total_value_mxn ?? 0
  const contracts = item.total_contracts ?? 0
  const sector = item.primary_sector_name ?? null

  // Single-line subline: value · contracts · sector
  const sublineParts: string[] = []
  if (value > 0) sublineParts.push(formatCompactMXN(value))
  if (contracts > 0) sublineParts.push(`${formatNumber(contracts)} ${t('card.contracts', { defaultValue: 'contracts' })}`)
  if (sector) sublineParts.push(getSectorNameEN(sector))

  const handleClick = () => {
    navigate(`/thread/${item.vendor_id}`)
  }

  return (
    <motion.div variants={staggerItem}>
      <div
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        className={cn(
          'group relative flex items-center gap-3 sm:gap-4 px-4 py-2 rounded-md border border-zinc-800 border-l-4 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer',
          tierCfg.accent
        )}
      >
        {/* Tier badge */}
        <div className="shrink-0 w-10 sm:w-12 text-center">
          <div className={cn(
            'inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider',
            tierCfg.pillBg,
            tierCfg.pillText
          )}>
            T{tier}
          </div>
        </div>

        {/* Vendor name + subline — the editorial anchor */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-100 truncate leading-tight">
              {item.vendor_name}
            </h3>
            {item.new_vendor_risk && (
              <span className="shrink-0 font-mono text-[9px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                NEW
              </span>
            )}
          </div>
          {sublineParts.length > 0 && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {sublineParts.join(' · ')}
            </p>
          )}
        </div>

        {/* Primary pattern — ONE badge only */}
        {item.primary_pattern && patternMeta && (
          <div
            className={cn(
              'hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium shrink-0',
              patternMeta.bg,
              patternMeta.text,
              patternMeta.border
            )}
          >
            <span className={cn('h-1 w-1 rounded-full', patternMeta.dot)} />
            {t(`patterns.${item.primary_pattern}`)}
          </div>
        )}

        {/* IPS pill — single compact number */}
        <div className="shrink-0 flex items-center gap-2">
          <div
            className={cn(
              'inline-flex items-baseline gap-0.5 px-2 py-1 rounded-md border tabular-nums',
              IPS_BG_COLOR(ips)
            )}
            title={t('ipsBreakdown.title')}
          >
            <span className={cn('font-mono font-bold text-base leading-none', IPS_TEXT_COLOR(ips))}>
              {ipsPct}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">IPS</span>
          </div>
        </div>

        {/* Review + arrow actions */}
        <div className="relative flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="hidden sm:inline-flex p-1.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            aria-label={t('reviewPopover.updateTitle')}
            title={t('reviewPopover.updateTitle')}
          >
            <ClipboardEdit className="h-3.5 w-3.5" />
          </button>
          {reviewOpen && (
            <ReviewPopover
              vendorId={item.vendor_id}
              currentStatus={item.review_status as ReviewStatus | undefined}
              inGroundTruth={!!item.in_ground_truth}
              onClose={() => setReviewOpen(false)}
            />
          )}
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function AriaPage() {
  const { t, i18n } = useTranslation('aria')
  const [search, setSearch] = useState('')
  const [patternFilter, setPatternFilter] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<number | null>(1)   // start on T1 — most urgent
  const [newVendorOnly, setNewVendorOnly] = useState(false)
  const [novelOnly, setNovelOnly] = useState(false)
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | null>(null)
  const [page, setPage] = useState(1)

  const PER_PAGE = 50

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<AriaStatsResponse>({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60_000,
  })

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError } = useQuery({
    queryKey: ['aria-queue-leads', { page, search, patternFilter, tierFilter, newVendorOnly, novelOnly, reviewStatusFilter }],
    queryFn: () =>
      ariaApi.getQueue({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        pattern: patternFilter ?? undefined,
        new_vendor_only: newVendorOnly || undefined,
        novel_only: novelOnly || undefined,
        status: reviewStatusFilter ?? undefined,
        tier: tierFilter ?? undefined,
      }),
    staleTime: 2 * 60_000,
  })

  // Tier 1 preview data used to compute T1 avg risk
  const { data: tier1PreviewData } = useQuery({
    queryKey: ['aria-tier1-preview'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 12 }),
    staleTime: 5 * 60_000,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}
  const elevatedValue = stats?.elevated_value_mxn ?? 0

  const leadsItems: AriaQueueItem[] = leadsData?.data ?? []
  const tier1Items: AriaQueueItem[] = tier1PreviewData?.data ?? []

  const tierCounts: Record<number, number> = {
    1: stats?.latest_run?.tier1_count ?? 0,
    2: stats?.latest_run?.tier2_count ?? 0,
    3: stats?.latest_run?.tier3_count ?? 0,
    4: stats?.latest_run?.tier4_count ?? 0,
  }

  const tier1AvgRisk = tier1Items.length > 0
    ? tier1Items.reduce((s, x) => s + (x.avg_risk_score ?? 0), 0) / tier1Items.length
    : null

  const isEs = i18n.language === 'es'
  const locale = isEs ? 'es-MX' : 'en-US'
  const lastRunAt = stats?.latest_run?.completed_at
    ? new Intl.DateTimeFormat(locale, {
        month: 'short', day: 'numeric', year: 'numeric',
      }).format(new Date(stats.latest_run.completed_at))
    : null

  const clearAll = () => {
    setPatternFilter(null)
    setTierFilter(null)
    setNewVendorOnly(false)
    setNovelOnly(false)
    setReviewStatusFilter(null)
    setSearch('')
    setPage(1)
  }

  const activeFilterCount = [
    patternFilter,
    tierFilter != null ? tierFilter : null,
    newVendorOnly || null,
    novelOnly || null,
    reviewStatusFilter,
    search || null,
  ].filter(Boolean).length

  if (statsError || leadsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-xs font-mono uppercase tracking-widest text-red-500 mb-2">{t('connectionError.title')}</p>
          <p className="text-lg font-bold text-zinc-100 mb-2">{t('connectionError.headline')}</p>
          <p className="text-sm text-zinc-500">{t('connectionError.body')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded bg-zinc-800 text-zinc-300 text-xs font-mono hover:bg-zinc-700 transition-colors"
          >
            {t('connectionError.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <EditorialPageShell
          kicker={isEs
            ? `COLA ARIA · BURÓ DE INVESTIGACIÓN ACTIVA${lastRunAt ? ` · SINCRONIZADO ${lastRunAt.toUpperCase()}` : ''}`
            : `ARIA QUEUE · ACTIVE INVESTIGATION BUREAU${lastRunAt ? ` · SYNCED ${lastRunAt.toUpperCase()}` : ''}`
          }
          headline={
            statsLoading ? (isEs ? 'Cargando cola...' : 'Loading queue...') : (
              <>
                {formatNumber(tierCounts[1])}{' '}
                {isEs ? 'proveedores activan cada' : 'vendors trip every'}{' '}
                <span style={{ color: 'var(--color-risk-critical)' }}>
                  {isEs ? 'patrón de corrupción' : 'corruption pattern'}
                </span>{' '}
                {isEs ? 'en nuestro modelo.' : 'in our model.'}
              </>
            )
          }
          paragraph={
            statsLoading
              ? (isEs ? 'Cargando...' : 'Loading...')
              : isEs
                ? `Estos son los ${formatNumber(tierCounts[1])} proveedores de mayor riesgo en la contratación pública federal mexicana. Cada uno coincide con la huella estructural de al menos tres casos documentados de corrupción.${elevatedValue > 0 ? ' ' + formatCompactMXN(elevatedValue) + ' fluyen a través de sus contratos.' : ''}`
                : `These are the ${formatNumber(tierCounts[1])} highest-risk vendors in Mexican federal procurement. Each one matches the structural fingerprint of at least three documented corruption cases.${elevatedValue > 0 ? ' ' + formatCompactMXN(elevatedValue) + ' flows through their contracts.' : ''}`
          }
          stats={statsLoading ? undefined : [
            { value: formatNumber(tierCounts[1]), label: isEs ? 'T1 Crítico' : 'T1 Critical', color: 'var(--color-risk-critical)' },
            { value: formatNumber(tierCounts[2]), label: isEs ? 'T2 Alto' : 'T2 High', color: 'var(--color-risk-high)' },
            { value: formatNumber(tierCounts[3]), label: isEs ? 'T3 Medio' : 'T3 Medium' },
            { value: elevatedValue > 0 ? formatCompactMXN(elevatedValue) : '—', label: isEs ? 'Valor en riesgo' : 'Value at risk', color: 'var(--color-accent)' },
          ]}
          loading={statsLoading}
          severity="critical"
          meta={
            <span className="flex items-center gap-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-500" />
              v0.6.5
              <MetodologiaTooltip
                title={t('methodology.title')}
                body={t('methodology.body')}
                link="/methodology"
              />
            </span>
          }
          actions={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder={t('leads.searchPlaceholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => { setTierFilter(null); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors',
                    tierFilter == null
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  {t('filters.all')}
                </button>
                {TIER_CONFIG.map((cfg) => (
                  <TierFilterPill
                    key={cfg.tier}
                    tier={cfg}
                    count={tierCounts[cfg.tier]}
                    isActive={tierFilter === cfg.tier}
                    loading={statsLoading}
                    onClick={() => {
                      setTierFilter(tierFilter === cfg.tier ? null : cfg.tier)
                      setPage(1)
                    }}
                  />
                ))}
              </div>
            </div>
          }
        >

        <Act number="I" label="THE QUEUE">

        {/* ============================================================== */}
        {/* TIER NAVIGATION ROWS — horizontal bands, clickable              */}
        {/* ============================================================== */}
        <section aria-label={t('threatLevels')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
                {t('threatLevels')}
              </p>
              <span className="text-[10px] text-zinc-600 font-mono">·</span>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                {t('tierCard.clickFilter')}
              </p>
            </div>
          </div>

          {statsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {TIER_CONFIG.map((cfg) => (
                <TierNavigationRow
                  key={cfg.tier}
                  tier={cfg}
                  count={tierCounts[cfg.tier]}
                  avgRisk={cfg.tier === 1 ? tier1AvgRisk : null}
                  valueAtRisk={cfg.tier === 1 ? elevatedValue : null}
                  isActive={tierFilter === cfg.tier}
                  onClick={() => {
                    setTierFilter(tierFilter === cfg.tier ? null : cfg.tier)
                    setPatternFilter(null)
                    setPage(1)
                    setTimeout(() => {
                      document.getElementById('aria-investigation-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 80)
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* 4. PATTERN FILTER CHIPS — compact, one line, optional           */}
        {/* ============================================================== */}
        {Object.keys(patternCounts).length > 0 && (
          <section aria-label={t('patternSection.title')}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
                {t('patternSection.title')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(patternCounts).map(([pattern, count]) => (
                <PatternChip
                  key={pattern}
                  pattern={pattern}
                  count={count}
                  isActive={patternFilter === pattern}
                  onClick={() => {
                    setPatternFilter(patternFilter === pattern ? null : pattern)
                    setPage(1)
                  }}
                />
              ))}
              <button
                onClick={() => { setNewVendorOnly(!newVendorOnly); setPage(1) }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors',
                  newVendorOnly
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                )}
              >
                {t('filters.newVendorOnly')}
                {stats?.new_vendor_count != null && (
                  <span className="font-mono tabular-nums text-zinc-500">{formatNumber(stats.new_vendor_count)}</span>
                )}
              </button>
              <button
                onClick={() => { setNovelOnly(!novelOnly); setPage(1) }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors',
                  novelOnly
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                )}
                title={t('filters.novelOnlyTooltip')}
              >
                {t('filters.novelOnly')}
              </button>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* HOW TO READ THIS QUEUE — methodology explainer                 */}
        {/* ============================================================== */}
        <div className="surface-card--evidence surface-card p-4 mb-4">
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-accent block mb-1">How to read this queue</span>
            Each row is a vendor ranked by IPS — the Investigation Priority Score. IPS combines risk score, anomaly signals, network centrality, and external registry matches (EFOS, SFP, RUPC). T1 vendors should be investigated immediately. Click any row to open the full dossier.
          </p>
        </div>

        {/* ============================================================== */}
        {/* INVESTIGATION LIST — one row per vendor, one action            */}
        {/* ============================================================== */}
        <section id="aria-investigation-list" aria-label={t('queueSection.title')}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
                  {tierFilter != null
                    ? t(TIER_CONFIG.find((c) => c.tier === tierFilter)!.labelKey)
                    : t('queueSection.title', { defaultValue: 'Cola completa' })}
                </p>
                {activeFilterCount > 0 && (
                  <>
                    <span className="text-[10px] text-zinc-600 font-mono">·</span>
                    <button
                      onClick={clearAll}
                      className="text-[10px] font-mono uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {t('filterBar.clearAll')} ({activeFilterCount})
                    </button>
                  </>
                )}
              </div>
              {totalLeads > 0 && (
                <p className="text-xs text-zinc-500 font-mono mt-1 tabular-nums">
                  {formatNumber(totalLeads)} {t('leads.vendorCount')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TableExportButton
                data={leadsItems as unknown as Record<string, unknown>[]}
                filename="aria-queue"
                showXlsx={true}
                disabled={leadsItems.length === 0}
              />
            </div>
          </div>

          {/* Review status filter — compact chip row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
              {t('table.review')}
            </span>
            {([null, 'pending', 'reviewing', 'confirmed', 'dismissed'] as (ReviewStatus | null)[]).map((s) => {
              const meta = s ? REVIEW_STATUS_META[s] : null
              const isActive = reviewStatusFilter === s
              return (
                <button
                  key={s ?? 'all'}
                  onClick={() => { setReviewStatusFilter(s); setPage(1) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
                    isActive
                      ? s
                        ? cn(meta!.className, 'ring-1 ring-white/10')
                        : 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  {s ? t('status.' + s) : t('reviewFilter.all')}
                </button>
              )
            })}
          </div>

          {leadsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
          ) : leadsItems.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <Search className="h-8 w-8 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm font-medium text-zinc-300 mb-1">
                {search ? t('emptyState.noSearchResults', { query: search }) : t('leads.empty', { defaultValue: 'Sin resultados' })}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-3 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors font-mono"
                >
                  {t('filterBar.clearAll', { defaultValue: 'Limpiar filtros' })}
                </button>
              )}
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-1.5"
            >
              {leadsItems.map((item) => (
                <InvestigationRow key={item.vendor_id} item={item} />
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-zinc-800 rounded-md text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
              >
                {t('pagination.previous', { defaultValue: '← Anterior' })}
              </button>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                {t('pagination.pageOf', { page, total: totalPages, defaultValue: `${page} / ${totalPages}` })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-zinc-800 rounded-md text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
              >
                {t('pagination.next', { defaultValue: 'Siguiente →' })}
              </button>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* 6. METHODOLOGY FOOTER — minimal                                */}
        {/* ============================================================== */}
        <section>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-500 space-y-1 leading-relaxed">
                <p className="font-mono uppercase tracking-wider text-[10px] font-bold text-zinc-400">
                  {t('about.title', { defaultValue: 'Sobre ARIA' })}
                </p>
                <p>{t('about.description')}</p>
                <p className="text-zinc-600">{t('about.disclaimer')}</p>
              </div>
            </div>
          </div>
        </section>

        </Act>
        </EditorialPageShell>
      </div>
    </div>
  )
}
