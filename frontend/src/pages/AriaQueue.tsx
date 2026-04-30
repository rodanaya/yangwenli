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
import { GhostSuspectsPanel } from '@/components/aria/GhostSuspectsPanel'
import { formatVendorName } from '@/lib/vendor/formatName'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { getSectorNameEN, SECTORS } from '@/lib/constants'
import {
  Search,
  FileText,
  ArrowRight,
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
  P1: { text: 'text-risk-critical', bg: 'bg-risk-critical/10', border: 'border-risk-critical/30', dot: 'bg-risk-critical' },
  P2: { text: 'text-risk-high',     bg: 'bg-risk-high/10',     border: 'border-risk-high/30',     dot: 'bg-risk-high' },
  P3: { text: 'text-risk-high',     bg: 'bg-risk-high/10',     border: 'border-risk-high/30',     dot: 'bg-risk-high' },
  P4: { text: 'text-text-secondary',bg: 'bg-background-elevated', border: 'border-border', dot: 'bg-background-elevated' },
  P5: { text: 'text-text-secondary',bg: 'bg-background-elevated', border: 'border-border', dot: 'bg-background-elevated' },
  P6: { text: 'text-risk-critical', bg: 'bg-risk-critical/10', border: 'border-risk-critical/30', dot: 'bg-risk-critical' },
  P7: { text: 'text-risk-high',     bg: 'bg-risk-high/10',     border: 'border-risk-high/30',     dot: 'bg-risk-high' },
}

// (Former IPS_TEXT_COLOR + IPS_BG_COLOR helpers removed — the row now
// inlines a single riskColor CSS var derived from ips_final, used both
// for the score text and the TenureRibbon. The dual-classname helpers
// are no longer referenced.)

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

// Tier accent: T1 critical=red, T2 high=amber, T3 medium=muted border, T4 low=subtle border
const TIER_CONFIG: TierConfig[] = [
  { tier: 1, labelKey: 'tier1.label', nameKey: 'tier1.name', accent: 'border-l-risk-critical',   textColor: 'text-risk-critical',   pillBg: 'bg-risk-critical/10',   pillText: 'text-risk-critical',   descKey: 'tier1.description' },
  { tier: 2, labelKey: 'tier2.label', nameKey: 'tier2.name', accent: 'border-l-risk-high', textColor: 'text-risk-high', pillBg: 'bg-risk-high/10', pillText: 'text-risk-high', descKey: 'tier2.description' },
  { tier: 3, labelKey: 'tier3.label', nameKey: 'tier3.name', accent: 'border-l-border',  textColor: 'text-text-secondary',  pillBg: 'bg-background-elevated',  pillText: 'text-text-secondary',  descKey: 'tier3.description' },
  { tier: 4, labelKey: 'tier4.label', nameKey: 'tier4.name', accent: 'border-l-border',  textColor: 'text-text-muted',  pillBg: 'bg-background-card',  pillText: 'text-text-muted',  descKey: 'tier4.description' },
]

type ReviewStatus = 'pending' | 'confirmed' | 'dismissed' | 'reviewing'

// Phase 1: review status pills use the canonical 3-color system (red/amber/zinc).
// "confirmed" no longer uses green — confirmed-corrupt is a critical finding, not a "safe" state.
const REVIEW_STATUS_META: Record<ReviewStatus, { className: string }> = {
  pending:   { className: 'bg-background-elevated text-text-secondary border-border' },
  reviewing: { className: 'bg-risk-high/10 text-risk-high border-risk-high/30' },
  confirmed: { className: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30' },
  dismissed: { className: 'bg-background-card text-text-muted border-border' },
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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors',
        isActive
          ? cn(tier.pillBg, tier.pillText, 'border-current')
          : 'bg-background-card text-text-secondary border-border hover:border-border'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('font-mono font-bold', isActive ? tier.textColor : 'text-text-muted')}>
        {t(tier.labelKey).replace(/^Nivel\s+/i, 'T')}
      </span>
      {loading
        ? <span className="w-6 h-2.5 rounded bg-background-elevated animate-pulse" />
        : <span className="font-mono tabular-nums">{formatNumber(count)}</span>
      }
    </button>
  )
}

// (TierNavigationRow component removed in the AriaQueue redesign — tier
//  selection is now a compact pill row inside the unified filter bar
//  via TierFilterPill above.)

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
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] font-medium transition-colors flex-shrink-0',
        isActive
          ? cn(meta.bg, meta.text, meta.border)
          : 'bg-background-card text-text-secondary border-border hover:border-border'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('h-1 w-1 rounded-full', meta.dot)} />
      <span className={cn(isActive ? meta.text : 'text-text-secondary')}>{t(`patterns.${pattern}`)}</span>
      <span className="font-mono tabular-nums text-text-muted">{formatNumber(count)}</span>
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
      className="absolute right-0 top-8 z-50 w-56 rounded-sm border border-border bg-background shadow-xl p-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] font-mono text-text-muted font-bold mb-2">
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
                ? cn(meta.className, 'ring-1 ring-border')
                : 'bg-background-card border-border text-text-secondary hover:border-border'
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
          className="flex-1 py-1.5 rounded text-xs font-medium bg-amber-500 text-text-primary hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? t('reviewPopover.saving') : t('reviewPopover.save')}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-background-card transition-colors"
          aria-label={t('reviewPopover.close')}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {status === 'confirmed' && !inGroundTruth && (
        <button
          onClick={() => promoteMutation.mutate()}
          disabled={promoteMutation.isPending || promoteMutation.isSuccess}
          className="w-full py-1.5 rounded text-xs font-medium border border-amber-500/30 text-risk-high hover:bg-risk-high/10 disabled:opacity-50 transition-colors"
        >
          {promoteMutation.isPending ? t('reviewPopover.promoting') : promoteMutation.isSuccess ? t('reviewPopover.promotedToGT') : t('reviewPopover.promoteToGT')}
        </button>
      )}
      {inGroundTruth && (
        <p className="text-[10px] text-text-muted text-center">{t('reviewPopover.alreadyInGT')}</p>
      )}
      {(mutation.isError || promoteMutation.isError) && (
        <p className="text-[10px] text-risk-critical">{t('reviewPopover.error')}</p>
      )}
    </div>
  )
}

// ============================================================================
// Investigation Row — the core card, replaces both SpotlightCard + LeadRow
// Evenflow: [Tier] [Vendor name · subline] [Pattern] [IPS] [→]
// ============================================================================

// ============================================================================
// Ghost Suspects Panel — shown when P2 pattern filter is active
// ============================================================================

// TIER_GHOST_META + SIG_LABELS + SIG_KEYS + GhostSuspectsPanel itself moved
// to components/aria/GhostSuspectsPanel.tsx (167 LOC removed from this file).

/**
 * TenureRibbon — horizontal mini-strip mapping a vendor's active years
 * to the full COMPRANET 2002-2025 axis. Replaces the useless 12px IPS
 * bar that was always 80-90% full for every T1 vendor.
 *
 * The visual difference between vendors is now SHAPE: a vendor active
 * 2008-2025 has a wide bar; one active only 2024-2025 has a tiny bar
 * pinned to the right. Position + width = trajectory at a glance.
 */
function TenureRibbon({
  firstYear,
  lastYear,
  riskColor,
}: {
  firstYear: number
  lastYear: number
  riskColor: string
}) {
  const AXIS_MIN = 2002
  const AXIS_MAX = 2025
  const span = AXIS_MAX - AXIS_MIN
  const startPct = ((firstYear - AXIS_MIN) / span) * 100
  const widthPct = Math.max(2, ((lastYear - firstYear + 1) / span) * 100)
  const isRecent = lastYear >= 2024
  return (
    <div className="relative w-[88px] h-2 rounded-sm bg-background-elevated/60 border border-border/50 overflow-hidden flex-shrink-0" aria-hidden>
      {/* 2010 / 2018 reference ticks — faint vertical guide lines for orientation */}
      {[2010, 2018].map((y) => (
        <div
          key={y}
          className="absolute top-0 bottom-0 w-px bg-border/40"
          style={{ left: `${((y - AXIS_MIN) / span) * 100}%` }}
        />
      ))}
      {/* The ribbon itself */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-sm"
        style={{
          left: `${startPct}%`,
          width: `${widthPct}%`,
          backgroundColor: riskColor,
          opacity: 0.85,
          boxShadow: isRecent ? `0 0 4px ${riskColor}` : undefined,
        }}
      />
    </div>
  )
}

const REVIEW_GLYPH: Record<ReviewStatus, { char: string; color: string; title: string }> = {
  pending:    { char: '○', color: 'var(--color-text-muted)',     title: 'Pending review' },
  reviewing:  { char: '◐', color: 'var(--color-risk-high)',      title: 'Under review' },
  confirmed:  { char: '✓', color: 'var(--color-risk-critical)',  title: 'Confirmed corrupt' },
  dismissed:  { char: '⊘', color: 'var(--color-text-muted)',     title: 'Dismissed' },
}

function InvestigationRow({ item, isEs }: { item: AriaQueueItem; isEs: boolean }) {
  const { t } = useTranslation('aria')
  const navigate = useNavigate()
  const [reviewOpen, setReviewOpen] = useState(false)

  const ips = item.ips_final ?? 0
  const ipsPct = Math.round(ips * 100)
  const tier = item.ips_tier ?? 4
  const tierCfg = TIER_CONFIG.find((c) => c.tier === tier) ?? TIER_CONFIG[3]
  const patternKey = item.primary_pattern as PatternKey | null
  const patternMeta = patternKey ? PATTERN_META[patternKey] : null

  const value = item.total_value_mxn ?? 0
  const contracts = item.total_contracts ?? 0
  const sector = item.primary_sector_name ?? null

  // Recency / tenure derived from years_active + last_contract_year.
  // years_active was already on the payload but never visualized.
  const lastYear = item.last_contract_year ?? null
  const yearsActive = item.years_active ?? null
  const firstYear =
    lastYear != null && yearsActive != null && yearsActive > 0
      ? lastYear - yearsActive + 1
      : null
  const isActive = lastYear != null && lastYear >= 2024
  const isDormant = lastYear != null && lastYear < 2022

  const reviewStatus = (item.review_status as ReviewStatus | undefined) ?? 'pending'
  const reviewGlyph = REVIEW_GLYPH[reviewStatus] ?? REVIEW_GLYPH.pending
  const flagsCount =
    (item.in_ground_truth ? 1 : 0) +
    (item.is_efos_definitivo ? 1 : 0) +
    (item.is_sfp_sanctioned ? 1 : 0)

  // IPS color for both score and tenure ribbon (consistent across the row)
  const riskColor =
    ips >= 0.75 ? 'var(--color-risk-critical)'
    : ips >= 0.50 ? 'var(--color-risk-high)'
    : ips >= 0.30 ? 'var(--color-risk-medium)'
    : 'var(--color-text-muted)'

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
          'group relative grid items-center gap-x-3 gap-y-1 px-3 py-2 border-b border-border/50 border-l-2 bg-background-card hover:bg-background-elevated/40 transition-colors cursor-pointer',
          'grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto]',
          tierCfg.accent
        )}
      >
        {/* ─── LINE 1 ─────────────────────────────────────────────────── */}

        {/* Vendor name — bold primary text */}
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary truncate leading-tight" title={item.vendor_name}>
            {formatVendorName(item.vendor_name, 56)}
          </span>
          {item.new_vendor_risk && (
            <span className="shrink-0 font-mono text-[8px] font-bold tracking-widest uppercase text-risk-high bg-risk-high/10 border border-risk-high/30 px-1 py-0.5 rounded-sm">
              {isEs ? 'NUEVO' : 'NEW'}
            </span>
          )}
        </div>

        {/* Total value — line 1, right-aligned */}
        <div className="text-right shrink-0">
          {value > 0 && (
            <span className="text-sm font-bold font-mono tabular-nums text-text-primary">
              {formatCompactMXN(value)}
            </span>
          )}
        </div>

        {/* IPS score — large, color-coded */}
        <div className="shrink-0 text-right">
          <span
            className="font-mono font-bold text-base tabular-nums leading-none"
            style={{ color: riskColor }}
            title={`IPS ${ipsPct}`}
          >
            {ipsPct}
          </span>
        </div>

        {/* Review status glyph — visible inline, replaces the buried popover icon */}
        <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-base leading-none hover:bg-background-elevated transition-colors"
            style={{ color: reviewGlyph.color }}
            aria-label={t('reviewPopover.updateTitle')}
            title={`${reviewGlyph.title} — ${t('reviewPopover.updateTitle')}`}
          >
            {reviewGlyph.char}
          </button>
          {reviewOpen && (
            <ReviewPopover
              vendorId={item.vendor_id}
              currentStatus={reviewStatus}
              inGroundTruth={!!item.in_ground_truth}
              onClose={() => setReviewOpen(false)}
            />
          )}
        </div>

        {/* Open arrow */}
        <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-text-muted group-hover:text-risk-high group-hover:translate-x-0.5 transition-all shrink-0" />

        {/* ─── LINE 2 ─────────────────────────────────────────────────── */}

        {/* Meta row spans the full width */}
        <div className="col-span-full flex items-center gap-2.5 text-[10px] font-mono text-text-muted flex-wrap">
          {/* Sector chip with sector-color dot */}
          {sector && (
            <span className="inline-flex items-center gap-1 max-w-[160px]">
              <span className="h-1 w-1 rounded-full bg-text-muted/60 shrink-0" />
              <span className="uppercase tracking-[0.06em] truncate" title={getSectorNameEN(sector)}>
                {getSectorNameEN(sector)}
              </span>
            </span>
          )}

          {/* Contract count */}
          {contracts > 0 && (
            <span className="tabular-nums">
              {formatNumber(contracts)} {isEs ? 'contratos' : 'contracts'}
            </span>
          )}

          {/* Pattern — full label inline (was: just "P5") */}
          {patternKey && patternMeta && (
            <span className={cn('inline-flex items-center gap-1', patternMeta.text)}>
              <span className={cn('h-1 w-1 rounded-full', patternMeta.dot)} />
              <span className="font-mono font-bold">{patternKey}</span>
              <span className="text-text-secondary normal-case">{t(`patterns.${patternKey}`)}</span>
            </span>
          )}

          {/* Recency badge — derived from last_contract_year */}
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-risk-high">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-high animate-pulse" />
              <span className="uppercase tracking-[0.08em] font-bold">
                {isEs ? `Activo ${lastYear}` : `Active ${lastYear}`}
              </span>
            </span>
          ) : isDormant && lastYear ? (
            <span className="text-text-muted/70">
              {isEs ? `Inactivo desde ${lastYear}` : `Dormant since ${lastYear}`}
            </span>
          ) : lastYear ? (
            <span className="text-text-muted/70">
              {isEs ? `Última: ${lastYear}` : `Last: ${lastYear}`}
            </span>
          ) : null}

          {/* External flag glyphs — inline, not buried */}
          {flagsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              {item.in_ground_truth && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] border border-[color:var(--color-accent)]/30"
                  title={isEs ? 'En casos de referencia documentados' : 'In documented ground-truth cases'}
                >
                  GT
                </span>
              )}
              {item.is_efos_definitivo && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-risk-critical/10 text-risk-critical border border-risk-critical/30"
                  title="SAT EFOS Definitivo"
                >
                  EFOS
                </span>
              )}
              {item.is_sfp_sanctioned && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-risk-high/10 text-risk-high border border-risk-high/30"
                  title="Sancionado SFP"
                >
                  SFP
                </span>
              )}
            </span>
          )}

          {/* Tenure ribbon — pushed to the right */}
          {firstYear != null && lastYear != null && (
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="font-mono tabular-nums text-text-muted/70">
                '{String(firstYear).slice(2)}–'{String(lastYear).slice(2)}
              </span>
              <TenureRibbon firstYear={firstYear} lastYear={lastYear} riskColor={riskColor} />
            </span>
          )}
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
  const [sectorFilter, setSectorFilter] = useState<number | null>(null)
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | null>(null)
  const [page, setPage] = useState(1)

  // Client-side sort within the current page. Server returns IPS-ordered;
  // user can re-sort by what's actually meaningful for their triage. The
  // 'ips' sort key is server-default so picking it preserves backend order.
  type SortKey = 'ips' | 'value' | 'recency' | 'tenure' | 'pattern'
  const [sortKey, setSortKey] = useState<SortKey>('ips')

  const PER_PAGE = 50

  // refetchOnWindowFocus auto-recovers from transient deploy windows /
  // backend restarts — when the user tabs back to the page, react-query
  // refetches in the background and replaces the stale data. Without it
  // a 30-second deploy blip strands the user on a broken page until they
  // manually reload. Same pattern applied to RedThread (see 41c500b).
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery<AriaStatsResponse>({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  })

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError } = useQuery({
    queryKey: ['aria-queue-leads', { page, search, patternFilter, tierFilter, newVendorOnly, novelOnly, sectorFilter, reviewStatusFilter }],
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
        sector_id: sectorFilter ?? undefined,
      }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}
  const elevatedValue = stats?.elevated_value_mxn ?? 0

  const leadsItemsRaw: AriaQueueItem[] = leadsData?.data ?? []

  // Client-side sort for the visible page. IPS is the server default —
  // returning leadsItemsRaw unchanged preserves the original ordering.
  const leadsItems: AriaQueueItem[] = (() => {
    if (sortKey === 'ips') return leadsItemsRaw
    const arr = [...leadsItemsRaw]
    if (sortKey === 'value') {
      arr.sort((a, b) => (b.total_value_mxn ?? 0) - (a.total_value_mxn ?? 0))
    } else if (sortKey === 'recency') {
      arr.sort((a, b) => (b.last_contract_year ?? 0) - (a.last_contract_year ?? 0))
    } else if (sortKey === 'tenure') {
      arr.sort((a, b) => (b.years_active ?? 0) - (a.years_active ?? 0))
    } else if (sortKey === 'pattern') {
      arr.sort((a, b) => (a.primary_pattern ?? 'ZZ').localeCompare(b.primary_pattern ?? 'ZZ'))
    }
    return arr
  })()

  const tierCounts: Record<number, number> = {
    1: stats?.latest_run?.tier1_count ?? 0,
    2: stats?.latest_run?.tier2_count ?? 0,
    3: stats?.latest_run?.tier3_count ?? 0,
    4: stats?.latest_run?.tier4_count ?? 0,
  }

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
    setSectorFilter(null)
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
          <p className="text-xs font-mono uppercase tracking-widest text-risk-critical mb-2">{t('connectionError.title')}</p>
          <p className="text-lg font-bold text-text-primary mb-2">{t('connectionError.headline')}</p>
          <p className="text-sm text-text-muted">{t('connectionError.body')}</p>
          <button
            onClick={() => refetchStats()}
            className="mt-4 px-4 py-2 rounded bg-background-elevated text-text-secondary text-xs font-mono hover:bg-background-elevated transition-colors"
          >
            {t('connectionError.retry')}
          </button>
        </div>
      </div>
    )
  }

  // Empty-pipeline state — distinct from a network error. The query
  // succeeded, but ARIA hasn't been run on this DB yet (latest_run is
  // null) or the run produced zero queue rows. Without this branch the
  // page rendered "0 vendors trip every corruption pattern in our
  // model" — grammatically broken nonsense that looked identical to a
  // backend failure (which is what the user reported as the bug).
  // Same architectural pattern as RedThread's 404-vs-network split: a
  // genuine zero-state needs its own UI, not a forced rendering of the
  // happy path with zero values.
  if (!statsLoading && stats && (!stats.latest_run || stats.queue_total === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">
            {isEs ? 'COLA ARIA · SIN DATOS' : 'ARIA QUEUE · NO DATA'}
          </p>
          <p className="text-lg font-bold text-text-primary mb-2">
            {isEs
              ? 'El pipeline ARIA aún no se ha ejecutado contra esta base de datos.'
              : 'The ARIA pipeline has not run against this database yet.'}
          </p>
          <p className="text-sm text-text-muted mb-4">
            {isEs
              ? 'Una vez que se complete una corrida de ARIA, esta cola se llenará con los proveedores prioritarios. La producción se actualiza alrededor de la fecha de corrida del modelo.'
              : 'Once an ARIA run completes, this queue will populate with priority vendors. Production refreshes around the model rescore date.'}
          </p>
          <button
            onClick={() => refetchStats()}
            className="px-3 py-1.5 rounded-sm border border-border text-text-secondary text-xs font-mono hover:bg-background-elevated/40 transition-colors"
          >
            {isEs ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ════════════════════════════════════════════════════════════════
            UTILITY HEADER — replaces EditorialPageShell.
            The page is a working surface for investigators, not a
            magazine cover. One title row, one dateline, two anchor
            stats, plus a methodology popover. No serif headline,
            no kicker, no editorial paragraph competing with the data.
           ════════════════════════════════════════════════════════════════ */}
        <header className="mb-5 pb-4 border-b border-border">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {isEs ? 'Cola de Riesgo' : 'Risk Queue'}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5 inline-flex items-center gap-1.5 flex-wrap">
                {lastRunAt && (
                  <>
                    <span>{isEs ? `Sincronizado ${lastRunAt}` : `Synced ${lastRunAt}`}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span className="tabular-nums">{formatNumber(stats?.queue_total ?? 0)}</span>
                <span>{isEs ? 'proveedores procesados' : 'vendors processed'}</span>
                <span aria-hidden>·</span>
                <span>v0.6.5</span>
                <MetodologiaTooltip
                  title={t('methodology.title')}
                  body={t('methodology.body')}
                  link="/methodology"
                />
              </p>
            </div>
            {!statsLoading && (
              <div className="flex items-baseline gap-5">
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-risk-critical tabular-nums leading-none">
                    {formatNumber(tierCounts[1])}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {isEs ? 'T1 prioridad' : 'T1 priority'}
                  </div>
                </div>
                {elevatedValue > 0 && (
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                      {formatCompactMXN(elevatedValue)}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                      {isEs ? 'en riesgo' : 'at risk'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════════
            UNIFIED FILTER BAR
            Patterns first (most discriminative), then tiers, then sector
            + flag toggles + search. Replaces three separate sections
            (TierNavigationRow stack, pattern chips, EditorialPageShell
            actions slot) that fought for vertical space.
           ════════════════════════════════════════════════════════════════ */}
        <div className="mb-4 space-y-2">
          {/* Pattern chips — single horizontal-scrollable row, sorted by
              count descending so the most frequent pattern leads the eye.
              Replaces the prior 4-row wrapped grid that read as "scattered." */}
          {Object.keys(patternCounts).length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0 inline-flex items-center gap-1">
                {isEs ? 'Patrón' : 'Pattern'}
              </span>
              {Object.entries(patternCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([pattern, count]) => (
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
            </div>
          )}
          {/* Tier pills + flags + sector + search — single row. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
              {isEs ? 'Nivel' : 'Tier'}
            </span>
            <button
              onClick={() => { setTierFilter(null); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors',
                tierFilter == null
                  ? 'bg-background-elevated text-text-primary border-border'
                  : 'bg-background-card text-text-muted border-border hover:border-border'
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
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <button
              onClick={() => { setNewVendorOnly(!newVendorOnly); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors',
                newVendorOnly
                  ? 'bg-risk-high/10 text-risk-high border-risk-high/30'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
            >
              {t('filters.newVendorOnly')}
              {stats?.new_vendor_count != null && (
                <span className="font-mono tabular-nums text-text-muted">{formatNumber(stats.new_vendor_count)}</span>
              )}
            </button>
            <button
              onClick={() => { setNovelOnly(!novelOnly); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors',
                novelOnly
                  ? 'bg-background-elevated text-text-secondary border-border'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
              title={t('filters.novelOnlyTooltip')}
            >
              {t('filters.novelOnly')}
            </button>
            <select
              value={sectorFilter ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setSectorFilter(v === '' ? null : Number(v))
                setPage(1)
              }}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors cursor-pointer',
                sectorFilter != null
                  ? 'bg-background-elevated text-text-primary border-border'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
              aria-label={isEs ? 'Filtrar por sector' : 'Filter by sector'}
            >
              <option value="">{isEs ? 'Todos los sectores' : 'All sectors'}</option>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {isEs ? s.name : s.nameEN}
                </option>
              ))}
            </select>
            <span className="mx-1 h-4 w-px bg-border hidden sm:inline-block" aria-hidden />
            {/* Search — flexes to fill remaining width on the same row. */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
              <input
                type="text"
                placeholder={t('leads.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-7 pr-3 py-1 text-xs bg-background-card border border-border rounded-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-accent font-mono"
              />
            </div>
          </div>
        </div>

        {/* GhostSuspectsPanel — only renders when P2 pattern is active. */}
        {patternFilter === 'P2' && (
          <GhostSuspectsPanel isEs={isEs} />
        )}

        {/* ============================================================== */}
        {/* INVESTIGATION LIST — one row per vendor, one action            */}
        {/* ============================================================== */}
        <section id="aria-investigation-list" aria-label={t('queueSection.title')}>
          {/* List header strip — single dense row. Combines the previous
              orphan title block + review filter chips + export button.
              Was: 3 stacked sections (title row → vendor count → review
              chips → export); now flows as one. */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border flex-wrap">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
              {tierFilter != null
                ? t(TIER_CONFIG.find((c) => c.tier === tierFilter)!.labelKey)
                : t('queueSection.title', { defaultValue: 'Cola completa' })}
            </p>
            {totalLeads > 0 && (
              <span className="text-[11px] text-text-muted font-mono tabular-nums">
                · {formatNumber(totalLeads)}
              </span>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] font-mono uppercase tracking-[0.15em] text-risk-high hover:text-accent transition-colors"
              >
                · {t('filterBar.clearAll')} ({activeFilterCount})
              </button>
            )}

            {/* Sort + review chips — pushed to the right of the list header */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Sort dropdown — client-side sort within the visible page.
                  Defaults to IPS (server order). */}
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-text-muted">
                {isEs ? 'Ordenar' : 'Sort'}
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background-card text-text-secondary border border-border hover:border-border cursor-pointer focus-visible:outline-none focus-visible:border-accent"
                aria-label={isEs ? 'Ordenar por' : 'Sort by'}
              >
                <option value="ips">{isEs ? 'Riesgo (IPS)' : 'Risk (IPS)'}</option>
                <option value="value">{isEs ? 'Valor total' : 'Total value'}</option>
                <option value="recency">{isEs ? 'Última actividad' : 'Last activity'}</option>
                <option value="tenure">{isEs ? 'Años activo' : 'Years active'}</option>
                <option value="pattern">{isEs ? 'Patrón' : 'Pattern'}</option>
              </select>
              <span className="mx-1 h-3 w-px bg-border" aria-hidden />
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-text-muted">
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
                      'px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors',
                      isActive
                        ? s
                          ? cn(meta!.className, 'ring-1 ring-border')
                          : 'bg-background-elevated text-text-primary border-border'
                        : 'bg-background-card text-text-muted border-border hover:border-border'
                    )}
                  >
                    {s ? t('status.' + s) : t('reviewFilter.all')}
                  </button>
                )
              })}
              <span className="mx-1 h-3 w-px bg-border" aria-hidden />
              <TableExportButton
                data={leadsItems as unknown as Record<string, unknown>[]}
                filename="aria-queue"
                showXlsx={true}
                disabled={leadsItems.length === 0}
              />
            </div>
          </div>

          {leadsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-sm" />
              ))}
            </div>
          ) : leadsItems.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <Search className="h-8 w-8 mx-auto mb-3 text-text-primary" />
              <p className="text-sm font-medium text-text-secondary mb-1">
                {search
                  ? t('emptyState.noSearchResults', { query: search })
                  : tierFilter != null
                    ? (isEs
                        ? `Sin proveedores en ${t(TIER_CONFIG.find((c) => c.tier === tierFilter)!.labelKey)}`
                        : `No vendors in ${t(TIER_CONFIG.find((c) => c.tier === tierFilter)!.labelKey)}`)
                    : t('leads.empty', { defaultValue: isEs ? 'Sin resultados' : 'No results' })}
              </p>
              {!search && tierFilter != null && (
                <p className="text-xs text-text-muted mt-1">
                  {isEs
                    ? 'Ajusta los filtros o revisa otros niveles.'
                    : 'Adjust filters or review other tiers.'}
                </p>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-3 px-3 py-1.5 rounded-sm text-xs font-medium bg-background-card border border-border text-text-secondary hover:border-border hover:text-text-secondary transition-colors font-mono"
                >
                  {t('filterBar.clearAll', { defaultValue: isEs ? 'Limpiar filtros' : 'Clear filters' })}
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
                <InvestigationRow key={item.vendor_id} item={item} isEs={isEs} />
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-sm text-text-secondary hover:border-border hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
              >
                {t('pagination.previous', { defaultValue: '← Anterior' })}
              </button>
              <span className="text-xs text-text-muted font-mono tabular-nums">
                {t('pagination.pageOf', { page, total: totalPages, defaultValue: `${page} / ${totalPages}` })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-sm text-text-secondary hover:border-border hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
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
          <div className="rounded-sm border border-border bg-background-card p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
              <div className="text-xs text-text-muted space-y-1 leading-relaxed">
                <p className="font-mono uppercase tracking-[0.15em] text-[10px] font-bold text-text-secondary">
                  {t('about.title', { defaultValue: 'Sobre ARIA' })}
                </p>
                <p>{t('about.description')}</p>
                <p className="text-text-muted">{t('about.disclaimer')}</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
