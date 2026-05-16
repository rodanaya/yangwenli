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
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ariaApi } from '@/api/client'
import { TableExportButton } from '@/components/TableExportButton'
import { GhostSuspectsPanel } from '@/components/aria/GhostSuspectsPanel'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { getSectorName, SECTORS, RISK_COLORS, PATTERN_COLORS } from '@/lib/constants'
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
          className="w-full py-1.5 rounded text-xs font-medium border border-risk-high/30 text-risk-high hover:bg-risk-high/10 disabled:opacity-50 transition-colors"
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

/**
 * FilterChip — small removable pill for the Active-filter summary bar.
 * Shows the filter label + an X to clear that one filter without
 * resetting the rest of the active combination.
 */
function FilterChip({
  children,
  onClear,
  accent,
}: {
  children: React.ReactNode
  onClear: () => void
  accent?: string
}) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es')
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10px] font-mono font-medium"
      style={
        accent
          ? { color: accent, backgroundColor: `${accent}10`, borderColor: `${accent}33` }
          : { backgroundColor: 'var(--color-background-elevated)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
      }
    >
      <span>{children}</span>
      <button
        onClick={onClear}
        className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-background-card transition-colors"
        aria-label={isEs ? 'Quitar filtro' : 'Clear filter'}
        type="button"
      >
        <XIcon className="w-2.5 h-2.5" />
      </button>
    </span>
  )
}

// ============================================================================
// LollipopScore — FT Visual Vocabulary "lollipop" ranking pattern.
//
// One row. Thin baseline rule from x=0 to score-x. Vertical tick at the
// T2/T3 boundary (avg ≈ 0.50, the high-risk threshold) to anchor scale.
// Filled dot at score-x, colored by tier. Score label sits right of dot.
//
// Reads magnitude AND deviation-from-baseline at a glance — the two
// pieces of information a journalist needs from a queue ranking.
// ============================================================================

const TIER_DOT_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: '#c41e3a', // T1 critical
  2: '#ea580c', // T2 high
  3: '#f59e0b', // T3 medium
  4: '#71717a', // T4 low — warm zinc, never green
}

function LollipopScore({ ips, tier }: { ips: number; tier: 1 | 2 | 3 | 4 }) {
  // ips is in [0, 1]. Map to a 0..130 px track inside a 140-wide SVG.
  const trackW = 130
  const clamped = Math.max(0, Math.min(1, ips))
  const dotX = clamped * trackW
  const avgX = 0.5 * trackW // T2/T3 boundary baseline tick
  const dotColor = TIER_DOT_COLOR[tier]
  const label = Math.round(clamped * 100)

  return (
    <svg
      width={140}
      height={20}
      viewBox="0 0 140 20"
      role="img"
      aria-label={`IPS ${label} of 100, tier ${tier}`}
      className="shrink-0 overflow-visible"
    >
      {/* Stick: thin line from origin to dot */}
      <line
        x1={0}
        y1={10}
        x2={dotX}
        y2={10}
        stroke="#3f3f46"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Baseline tick at avg — small vertical mark */}
      <line
        x1={avgX}
        y1={6}
        x2={avgX}
        y2={14}
        stroke="#52525b"
        strokeWidth={1}
      />
      {/* Lollipop head */}
      <circle cx={dotX} cy={10} r={5} fill={dotColor} />
      {/* IPS readout right of dot */}
      <text
        x={Math.min(dotX + 9, trackW + 1)}
        y={13}
        fontSize={9}
        fill="#a1a1aa"
        className="font-mono tabular-nums"
      >
        {label}
      </text>
    </svg>
  )
}

// 2026-05-08 audit fix: title was monolingual EN — now picks ES on `es` locale.
const REVIEW_GLYPH: Record<ReviewStatus, { char: string; color: string; titleEn: string; titleEs: string }> = {
  pending:    { char: '○', color: 'var(--color-text-muted)',     titleEn: 'Pending review',      titleEs: 'Revisión pendiente' },
  reviewing:  { char: '◐', color: 'var(--color-risk-high)',      titleEn: 'Under review',         titleEs: 'En revisión' },
  confirmed:  { char: '✓', color: 'var(--color-risk-critical)',  titleEn: 'Confirmed corrupt',    titleEs: 'Corrupción confirmada' },
  dismissed:  { char: '⊘', color: 'var(--color-text-muted)',     titleEn: 'Dismissed',            titleEs: 'Descartado' },
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

  // Recency / tenure — prefer direct year columns (from vendor_stats JOIN),
  // fall back to years_active derivation for older API deploys.
  const lastYear = item.last_contract_year ?? null
  const yearsActive = item.years_active ?? null
  const firstYear =
    item.first_contract_year ??
    (lastYear != null && yearsActive != null && yearsActive > 0
      ? lastYear - yearsActive + 1
      : null)
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

        {/* Vendor name — EntityIdentityChip with narrative=true so the chip
            link target (/thread/:id) matches the row's onClick. Without
            this the chip routes to /vendors/:id and the user's first
            instinct (click the name) lands on the vendor profile instead
            of the Red Thread, contradicting the row's affordance.
            stopPropagation still prevents double-navigation if the chip
            and row both fire. */}
        <div className="min-w-0 flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()} className="min-w-0 max-w-full overflow-hidden">
            <EntityIdentityChip
              type="vendor"
              id={item.vendor_id}
              name={item.vendor_name}
              size="sm"
              riskScore={item.avg_risk_score}
              sectorCode={item.primary_sector_name ?? null}
              ariaTier={item.ips_tier}
              narrative
              hideIcon
              className="max-w-full"
            />
          </div>
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

        {/* IPS score — lollipop on sm+, compact badge on xs */}
        <div
          className="shrink-0 flex items-center justify-end"
          title={`IPS ${ipsPct} · T${tier} (baseline tick = high-risk threshold 50)`}
        >
          {/* Compact badge — xs only */}
          <span
            className="sm:hidden font-mono tabular-nums text-xs font-bold px-1.5 py-0.5 rounded-sm"
            style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}33` }}
          >
            {ipsPct}
          </span>
          {/* Lollipop — sm and above */}
          <span className="hidden sm:flex items-center">
            <LollipopScore ips={ips} tier={tier} />
          </span>
        </div>

        {/* Review status glyph — visible inline, replaces the buried popover icon */}
        <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-base leading-none hover:bg-background-elevated transition-colors"
            style={{ color: reviewGlyph.color }}
            aria-label={t('reviewPopover.updateTitle')}
            title={`${isEs ? reviewGlyph.titleEs : reviewGlyph.titleEn} — ${t('reviewPopover.updateTitle')}`}
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
              {/* 2026-05-08 audit fix: sector chips were force-EN; now follow lang */}
              <span className="uppercase tracking-[0.06em] truncate" title={getSectorName(sector, isEs ? 'es' : 'en')}>
                {getSectorName(sector, isEs ? 'es' : 'en')}
              </span>
            </span>
          )}

          {/* Contract count — pluralized so it never reads "1 contratos" */}
          {contracts > 0 && (
            <span className="tabular-nums">
              {formatNumber(contracts)}{' '}
              {isEs
                ? (contracts === 1 ? 'contrato' : 'contratos')
                : (contracts === 1 ? 'contract' : 'contracts')}
            </span>
          )}

          {/* Top institution — institutional capture indicator (S.1 backfill) */}
          {item.top_institution && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                (item.top_institution_ratio ?? 0) >= 0.6
                  ? 'text-risk-high'
                  : 'text-text-muted'
              )}
              title={
                item.top_institution_ratio != null
                  ? `${isEs ? 'Institución principal' : 'Top institution'}: ${item.top_institution} · ${(item.top_institution_ratio * 100).toFixed(0)}%`
                  : item.top_institution
              }
            >
              <span className="text-text-muted/50">▸</span>
              <span className="uppercase tracking-[0.04em] truncate max-w-[100px]">{item.top_institution}</span>
              {item.top_institution_ratio != null && item.top_institution_ratio >= 0.3 && (
                <span className="tabular-nums opacity-70">
                  {(item.top_institution_ratio * 100).toFixed(0)}%
                </span>
              )}
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
                  title={isEs
                    ? 'Anclado en corpus GT — ya documentado como corrupción. IPS elevado refleja el anclaje, no solo señal del modelo.'
                    : 'GT-anchored — already documented corruption. High IPS reflects GT boost, not model-only signal.'}
                >
                  GT
                </span>
              )}
              {!item.in_ground_truth && item.ips_tier === 1 && (
                <span
                  className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-accent-data/10 text-accent-data border border-accent-data/20"
                  title={isEs
                    ? 'Descubrimiento del modelo — T1 sin anclaje GT. Señal pura del modelo de riesgo.'
                    : 'Model discovery — T1 without GT anchor. Pure risk model signal.'}
                >
                  {isEs ? 'DESCUBRIMIENTO' : 'DISCOVERY'}
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
                  title={isEs ? 'Sancionado por la SFP' : 'Sanctioned by SFP'}
                >
                  SFP
                </span>
              )}
            </span>
          )}

          {/* Memo quality glyph — LLM narrative available */}
          {item.memo_provenance === 'llm_narrative' && (
            <span
              className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-accent-data/10 text-accent-data border border-accent-data/20"
              title={isEs ? 'Memo investigativo LLM disponible' : 'LLM investigation memo available'}
            >
              LLM
            </span>
          )}

          {/* Web evidence badge (CENTINELA) */}
          {item.web_evidence_verdict && item.web_evidence_verdict !== 'NEGATIVE' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border',
                item.web_evidence_verdict === 'SANCTION'
                  ? 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
                  : item.web_evidence_verdict === 'CORRUPTION_MENTION'
                    ? 'bg-risk-high/10 text-risk-high border-risk-high/30'
                    : item.web_evidence_verdict === 'SHELL_SIGNAL'
                      ? 'bg-risk-medium/10 text-risk-medium border-risk-medium/30'
                      : 'bg-background-elevated text-text-secondary border-border'
              )}
              title={`Evidencia web CENTINELA — ${item.web_evidence_verdict} (score ${((item.web_evidence_score ?? 0) * 100).toFixed(0)})`}
            >
              {item.web_evidence_verdict === 'SANCTION'
                ? 'SANC·WEB'
                : item.web_evidence_verdict === 'CORRUPTION_MENTION'
                  ? 'CORR·WEB'
                  : item.web_evidence_verdict === 'SHELL_SIGNAL'
                    ? (isEs ? 'FANTASMA·WEB' : 'SHELL·WEB')
                    : (isEs ? 'PRENSA' : 'PRESS')}
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
// Helpers for editorial visualizations
// ============================================================================

/**
 * Synthesize an approximate risk score array from tier counts.
 * Uses beta-like sampling concentrated around each tier's midpoint
 * so the EditorialDistribution renders a plausible shape without
 * a dedicated backend endpoint.
 *
 * T1 ≥0.60 → center 0.70  T2 0.40–0.60 → center 0.50
 * T3 0.25–0.40 → center 0.32  T4 <0.25 → center 0.12
 *
 * Down-sampled to max 2,000 points total for SVG performance.
 */

/**
 * TierEditorialStrip — 4 horizontal rows, one per tier.
 * § LOS CUATRO ANILLOS (The Four Rings) — editorial naming for T1–T4.
 */
function TierEditorialStrip({
  counts,
  isEs,
  statsLoading,
}: {
  counts: Record<number, number>
  isEs: boolean
  statsLoading: boolean
}) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  const rows = [
    {
      tier: 1,
      label: isEs ? 'T1 · Crítico' : 'T1 · Critical',
      sublabel: isEs ? 'Prioridad máxima de investigación' : 'Maximum investigation priority',
      color: RISK_COLORS.critical,
    },
    {
      tier: 2,
      label: isEs ? 'T2 · Alto' : 'T2 · High',
      sublabel: isEs ? 'Revisión urgente' : 'Urgent review',
      color: RISK_COLORS.high,
    },
    {
      tier: 3,
      label: isEs ? 'T3 · Medio' : 'T3 · Medium',
      sublabel: isEs ? 'Señales emergentes' : 'Emerging signals',
      color: RISK_COLORS.medium,
    },
    {
      tier: 4,
      label: isEs ? 'T4 · Bajo' : 'T4 · Low',
      sublabel: isEs ? 'Ruido de fondo' : 'Background noise',
      color: RISK_COLORS.low,
    },
  ]

  return (
    <div className="mb-5">
      {/* § kicker */}
      <p className="font-mono uppercase tracking-[0.15em] text-[10px] text-text-muted mb-2">
        {isEs
          ? '§ LOS CUATRO ANILLOS · COLA DE INVESTIGACIÓN'
          : '§ FOUR RINGS · INVESTIGATION QUEUE'}
      </p>

      {/* Stacked proportion bar — shows T1:T2:T3:T4 at a glance.
          Segments are labeled to surface the editorial insight: T1+T2
          are a small fraction but represent the highest-priority leads. */}
      {!statsLoading && total > 0 && (
        <div className="mb-3">
          <div className="h-2.5 w-full overflow-hidden flex mb-1.5">
            {rows.map(({ tier, color }) => {
              const count = counts[tier] ?? 0
              const pct = (count / total) * 100
              if (pct < 0.05) return null
              return (
                <div
                  key={tier}
                  title={`T${tier}: ${formatNumber(count)} (${pct.toFixed(1)}%)`}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: tier === 4 ? 0.25 : tier === 3 ? 0.55 : 1,
                    minWidth: tier <= 2 ? 6 : undefined,
                  }}
                />
              )
            })}
          </div>
          {/* Proportion legend — T1+T2 elevated percentage callout */}
          <div className="flex items-center gap-3 flex-wrap">
            {rows.slice(0, 2).map(({ tier, color }) => {
              const count = counts[tier] ?? 0
              const pct = ((count / total) * 100).toFixed(2)
              return (
                <span key={tier} className="inline-flex items-center gap-1 text-[9px] font-mono tabular-nums">
                  <span className="h-1.5 w-3 rounded-sm inline-block" style={{ background: color }} />
                  <span style={{ color }}>T{tier}</span>
                  <span className="text-text-muted">{formatNumber(count)} ({pct}%)</span>
                </span>
              )
            })}
            <span className="text-text-muted text-[9px] font-mono">· T3 {formatNumber(counts[3] ?? 0)} · T4 {formatNumber(counts[4] ?? 0)}</span>
          </div>
        </div>
      )}

      {statsLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-sm" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(({ tier, label, sublabel, color }) => {
            const count = counts[tier] ?? 0
            const fraction = total > 0 ? count / total : 0
            const pct = (fraction * 100).toFixed(1)
            const isCritical = tier === 1

            return (
              <div
                key={tier}
                className="px-3 py-2.5 rounded-sm border border-border/60"
                style={{
                  borderLeft: `3px solid ${color}`,
                  background: isCritical
                    ? `linear-gradient(90deg, ${color}08 0%, transparent 60%)`
                    : 'var(--color-background-card)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  {/* Label + sublabel */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.1em]" style={{ color }}>
                      {label}
                    </span>
                    <p className="text-[9px] text-text-muted leading-none mt-0.5">{sublabel}</p>
                  </div>

                  {/* Count + pct — big number hero */}
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap shrink-0">
                    <span
                      className="tabular-nums leading-none"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: isCritical ? '1.5rem' : '1.25rem',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        color: isCritical ? color : 'var(--color-text-primary)',
                      }}
                    >
                      {formatNumber(count)}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted/70 self-center">
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Progress track — shows tier's share of full 248K queue */}
                <div className="relative h-1.5 rounded-full bg-background-elevated overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width]"
                    style={{
                      width: `${Math.max(fraction * 100, fraction > 0 ? 0.4 : 0)}%`,
                      background: `linear-gradient(90deg, ${color}cc 0%, ${color}44 100%)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 2026-05-16 (Audit F060/F169/F170): pattern names aligned to backend canon.
//   P1 Concentrated Monopoly  P2 Ghost Company  P3 Single-Use Intermediary
//   P4 Bid Rigging            P5 Overpricing    P6 Institution Capture
//   P7 Conflict of Interest
const PATTERN_LABELS: Record<string, { es: string; en: string; color: string }> = {
  P1: { es: 'Monopolio Concentrado',     en: 'Concentrated Monopoly',  color: PATTERN_COLORS.P1 ?? RISK_COLORS.critical },
  P2: { es: 'Empresa Fantasma',          en: 'Ghost Company',           color: PATTERN_COLORS.P2 ?? RISK_COLORS.high },
  P3: { es: 'Intermediario de Contrato',  en: 'Contract Intermediary',   color: PATTERN_COLORS.P3 ?? RISK_COLORS.high },
  P4: { es: 'Manipulación de Licitación',en: 'Bid Rigging',             color: PATTERN_COLORS.P4 ?? RISK_COLORS.medium },
  P5: { es: 'Sobreprecio',               en: 'Overpricing',             color: PATTERN_COLORS.P5 ?? RISK_COLORS.medium },
  P6: { es: 'Captura Institucional',     en: 'Institutional Capture',   color: PATTERN_COLORS.P6 ?? RISK_COLORS.critical },
  P7: { es: 'Conflicto de Interés',      en: 'Conflict of Interest',    color: PATTERN_COLORS.P7 ?? RISK_COLORS.high },
}

/**
 * PatternEditorialBars — compact clickable bar chart for P1–P7 pattern breakdown.
 * Each row is a tappable shortcut that sets the pattern filter.
 * Replaces the DotStrip approach with a more editorial inline bar design.
 */
function PatternEditorialBars({
  patternCounts,
  isEs,
  total,
  onPatternClick,
}: {
  patternCounts: Record<string, number>
  isEs: boolean
  total?: number
  onPatternClick?: (key: string) => void
}) {
  const entries = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)
  if (entries.length === 0) return null

  const maxCount = entries[0][1]
  const totalVendors = Object.values(patternCounts).reduce((s, n) => s + n, 0)

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono uppercase tracking-[0.15em] text-[10px] text-text-muted">
          {isEs ? '§ COMPOSICIÓN DE PATRONES' : '§ PATTERN COMPOSITION'}
        </p>
        <p className="font-mono text-[10px] text-text-muted">
          {formatNumber(totalVendors)}{' '}
          {total != null && total > totalVendors
            ? (isEs ? `coincidencias · ${formatNumber(total)} procesados` : `matches · ${formatNumber(total)} processed`)
            : (isEs ? 'coincidencias' : 'matches')}
        </p>
      </div>
      <div className="rounded-sm border border-border/60 bg-background-card overflow-hidden">
        {entries.map(([key, count], i) => {
          const meta = PATTERN_LABELS[key]
          if (!meta) return null
          const barFrac = maxCount > 0 ? count / maxCount : 0
          const pct = totalVendors > 0 ? ((count / totalVendors) * 100).toFixed(1) : '0.0'
          const name = isEs ? meta.es : meta.en
          const isClickable = !!onPatternClick
          return (
            <div
              key={key}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => onPatternClick?.(key)}
              onKeyDown={(e) => e.key === 'Enter' && onPatternClick?.(key)}
              className={cn(
                'flex items-center gap-2 sm:gap-3 px-3 py-2.5',
                i > 0 && 'border-t border-border/40',
                isClickable && 'cursor-pointer hover:bg-background-elevated/70 transition-colors',
              )}
            >
              {/* Pattern code badge */}
              <span
                className="shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm leading-none tabular-nums"
                style={{
                  background: `${meta.color}18`,
                  color: meta.color,
                  border: `1px solid ${meta.color}50`,
                }}
              >
                {key}
              </span>

              {/* Pattern name */}
              <span className="min-w-0 flex-1 text-[11px] text-text-secondary truncate">
                {name}
              </span>

              {/* Proportion bar — visible on all breakpoints */}
              <div className="flex items-center gap-1.5 w-20 sm:w-28 shrink-0">
                <div className="block flex-1 h-1 rounded-full bg-background-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${barFrac * 100}%`, background: meta.color, opacity: 0.85 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-text-muted tabular-nums shrink-0 sm:w-8 sm:text-right">
                  {pct}%
                </span>
              </div>

              {/* Count */}
              <span
                className="font-mono text-[11px] font-bold tabular-nums shrink-0"
                style={{ color: meta.color }}
              >
                {formatNumber(count)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function AriaPage() {
  const { t, i18n } = useTranslation('aria')
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const patternFilter = searchParams.get('pattern')
  const setPatternFilter = (pattern: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (pattern == null) {
        next.delete('pattern')
      } else {
        next.set('pattern', pattern)
      }
      return next
    }, { replace: true })
  }
  const [tierFilter, setTierFilter] = useState<number | null>(1)   // start on T1 — most urgent
  const [newVendorOnly, setNewVendorOnly] = useState(false)
  const [novelOnly, setNovelOnly] = useState(false)
  const [sectorFilter, setSectorFilter] = useState<number | null>(null)
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | null>(null)
  const [page, setPage] = useState(1)

  // Administration overlap filter — Mexican sexenio chips. Client-side
  // computed against last_contract_year + years_active (we derive
  // first_year = last_year - years_active + 1 and check whether the
  // vendor's [first, last] range overlaps the sexenio's [start, end].
  type AdminKey = 'sheinbaum' | 'amlo' | 'pena' | 'calderon' | 'fox'
  const [adminFilter, setAdminFilter] = useState<AdminKey | null>(null)

  // External flag filters — client-side OR drives api param when supported.
  // gtOnly + sfpOnly are client-side; efosOnly hits the existing API param.
  const [gtOnly, setGtOnly] = useState(false)
  const [efosOnly, setEfosOnly] = useState(false)
  const [sfpOnly, setSfpOnly] = useState(false)
  const [webEvidenceOnly, setWebEvidenceOnly] = useState(false)
  // S.3: filter to vendors with genuine LLM investigation memos
  const [llmMemoOnly, setLlmMemoOnly] = useState(false)

  // Client-side sort within the current page. Server returns IPS-ordered;
  // user can re-sort by what's actually meaningful for their triage. The
  // 'ips' sort key is server-default so picking it preserves backend order.
  type SortKey = 'ips' | 'value' | 'recency' | 'tenure' | 'pattern'
  const [sortKey, setSortKey] = useState<SortKey>('ips')

  // Disclosure state for the "+ More filters" panel. Hides secondary
  // filters by default to drop the chrome from 9 rows to 3-4.
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

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
    queryKey: ['aria-queue-leads', { page, search, patternFilter, tierFilter, newVendorOnly, novelOnly, sectorFilter, reviewStatusFilter, efosOnly }],
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
        efos_only: efosOnly || undefined,
      }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}
  const elevatedValue = stats?.elevated_value_mxn ?? 0

  const leadsItemsRaw: AriaQueueItem[] = leadsData?.data ?? []

  // Sexenio definitions — Mexican federal administrations. We check
  // [first_year, last_year] overlap with each window. Sheinbaum is
  // 2024-present; we use 2025+ as a hard right edge.
  const ADMIN_RANGES: Record<AdminKey, [number, number]> = {
    sheinbaum: [2024, 2030],
    amlo:      [2018, 2024],
    pena:      [2012, 2018],
    calderon:  [2006, 2012],
    fox:       [2000, 2006],
  }

  // Client-side filters applied to the visible page after the API call.
  // These are paired in the same pipeline as sort so the user can stack
  // (e.g. P5 + AMLO + GT-only).
  const leadsItems: AriaQueueItem[] = (() => {
    let arr = [...leadsItemsRaw]
    if (gtOnly) arr = arr.filter((it) => it.in_ground_truth)
    if (sfpOnly) arr = arr.filter((it) => it.is_sfp_sanctioned)
    if (llmMemoOnly) arr = arr.filter((it) => it.memo_provenance === 'llm_narrative')
    if (webEvidenceOnly) {
      arr = arr.filter((it) => it.web_evidence_verdict && it.web_evidence_verdict !== 'NEGATIVE')
      // Sort by evidence score descending when WEB filter is active (overrides IPS order)
      if (sortKey === 'ips') arr.sort((a, b) => (b.web_evidence_score ?? 0) - (a.web_evidence_score ?? 0))
    }
    if (adminFilter) {
      const [adminStart, adminEnd] = ADMIN_RANGES[adminFilter]
      arr = arr.filter((it) => {
        const last = it.last_contract_year ?? 0
        const yrs = it.years_active ?? 1
        const first = last > 0 ? last - yrs + 1 : 0
        if (last === 0 || first === 0) return false
        // Overlap test: [first, last] ∩ [adminStart, adminEnd] != ∅
        return first <= adminEnd && last >= adminStart
      })
    }
    if (sortKey === 'ips') return arr
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

  const isEs = i18n.language.startsWith('es')
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
    setAdminFilter(null)
    setGtOnly(false)
    setEfosOnly(false)
    setSfpOnly(false)
    setWebEvidenceOnly(false)
    setSearch('')
    setPage(1)
  }

  const activeFilterCount = [
    patternFilter,
    tierFilter != null ? tierFilter : null,
    newVendorOnly || null,
    novelOnly || null,
    sectorFilter != null ? sectorFilter : null,
    reviewStatusFilter,
    adminFilter,
    gtOnly || null,
    efosOnly || null,
    sfpOnly || null,
    webEvidenceOnly || null,
    llmMemoOnly || null,
    search || null,
  ].filter(Boolean).length

  // Sexenio metadata — labels + risk-style accent palette so the chips
  // read as time-coded slicers, not generic toggles.
  const ADMIN_META: Record<AdminKey, { label: string; range: string; color: string }> = {
    sheinbaum: { label: isEs ? 'Sheinbaum' : 'Sheinbaum', range: '2024–', color: 'var(--color-risk-critical)' },
    amlo:      { label: isEs ? 'AMLO' : 'AMLO',           range: '2018–24', color: 'var(--color-risk-high)' },
    pena:      { label: isEs ? 'Peña Nieto' : 'Peña Nieto', range: '2012–18', color: 'var(--color-accent)' },
    calderon:  { label: isEs ? 'Calderón' : 'Calderón',   range: '2006–12', color: 'var(--color-text-secondary)' },
    fox:       { label: isEs ? 'Fox' : 'Fox',             range: '2000–06', color: 'var(--color-text-muted)' },
  }

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
        <header className="mb-5 pb-5 border-b border-border">
          {/* folio-v1-P5: archival eyebrow */}
          <div
            className="mb-3 flex items-center gap-3"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ color: '#a06820', fontStyle: 'italic', fontWeight: 500 }}>Folio·V</span>
            <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {isEs ? 'Cola de investigación · ARIA' : 'Investigation queue · ARIA'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1
                className="text-text-primary"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(24px, 4vw, 38px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.012em',
                }}
              >
                {isEs ? 'Cola de Riesgo' : 'Risk Queue'}
              </h1>
              {statsLoading ? (
                <span className="mt-1.5 inline-flex items-center gap-2">
                  <span className="h-2 w-32 rounded bg-background-elevated animate-pulse inline-block" />
                  <span className="h-2 w-16 rounded bg-background-elevated animate-pulse inline-block" />
                </span>
              ) : (
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
                  <span>v0.8.5</span>
                  <MetodologiaTooltip
                    title={t('methodology.title')}
                    body={t('methodology.body')}
                    link="/methodology"
                  />
                </p>
              )}
            </div>
            <div className="flex items-baseline gap-5">
              {statsLoading ? (
                <>
                  <div className="text-right">
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-2 w-14" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right">
                    <div
                      className="tabular-nums leading-none"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(22px, 3vw, 32px)',
                        fontWeight: 700,
                        fontStyle: 'italic',
                        color: 'var(--color-risk-critical)',
                      }}
                    >
                      {formatNumber(tierCounts[1])}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1 font-mono">
                      {isEs ? 'T1 prioridad' : 'T1 priority'}
                    </div>
                  </div>
                  {elevatedValue > 0 && (
                    <div className="text-right">
                      <div
                        className="tabular-nums leading-none"
                        style={{
                          fontFamily: 'var(--font-family-serif)',
                          fontSize: 'clamp(22px, 3vw, 32px)',
                          fontWeight: 700,
                          fontStyle: 'italic',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {formatCompactMXN(elevatedValue)}
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1 font-mono">
                        {isEs ? 'en riesgo' : 'at risk'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════════
            EDITORIAL TIER STRIP + INTELLIGENCE STATS
            Left: 4-ring tier strip. Right: 4 real investigative metrics
            (at-risk spend, EFOS/SFP external flags, new vendors, pipeline).
           ════════════════════════════════════════════════════════════════ */}
        <div className="mb-5 grid gap-4 md:gap-5 md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_380px]">
          {/* Left: tier strip */}
          <TierEditorialStrip counts={tierCounts} isEs={isEs} statsLoading={statsLoading} />

          {/* Right: real investigative metrics — replaces synthesized distribution */}
          <div>
            <p className="font-mono uppercase tracking-[0.15em] text-[10px] text-text-muted mb-2">
              {isEs ? '§ INTELIGENCIA DE COLA · ARIA v1.2' : '§ QUEUE INTELLIGENCE · ARIA v1.2'}
            </p>
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-[96px] rounded-sm" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Elevated value MXN */}
                <div className="rounded-sm border border-border/60 bg-background-card px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">
                    {isEs ? 'Gasto en riesgo' : 'At-risk spend'}
                  </div>
                  <div
                    className="tabular-nums leading-tight"
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: RISK_COLORS.critical,
                    }}
                  >
                    {elevatedValue > 0 ? formatCompactMXN(elevatedValue) : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted/60 mt-1 font-mono">
                    {isEs ? 'contratos totales de los 1,789 proveedores T1+T2 — no estimación de fraude' : 'total contracts of 1,789 T1+T2 vendors — not a fraud estimate'}
                  </div>
                </div>
                {/* EFOS + SFP external flags */}
                <div className="rounded-sm border border-border/60 bg-background-card px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">
                    {isEs ? 'Registros externos' : 'External flags'}
                  </div>
                  <div
                    className="tabular-nums leading-tight"
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: RISK_COLORS.high,
                    }}
                  >
                    {formatNumber((stats?.external_counts?.efos ?? 0) + (stats?.external_counts?.sfp ?? 0))}
                  </div>
                  <div className="text-[10px] text-text-muted/60 mt-1 font-mono">
                    EFOS {formatNumber(stats?.external_counts?.efos ?? 0)}
                    <span className="mx-1 opacity-40">·</span>
                    SFP {formatNumber(stats?.external_counts?.sfp ?? 0)}
                  </div>
                </div>
                {/* New vendor signals */}
                <div className="rounded-sm border border-border/60 bg-background-card px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">
                    {isEs ? 'Señal proveedor nuevo' : 'New vendor signal'}
                  </div>
                  <div
                    className="tabular-nums leading-tight"
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: RISK_COLORS.high,
                    }}
                  >
                    {formatNumber(stats?.new_vendor_count ?? 0)}
                  </div>
                  <div className="text-[10px] text-text-muted/60 mt-1 font-mono">
                    {isEs ? 'proveedores de reciente creación' : 'recently-formed vendors'}
                  </div>
                </div>
                {/* Review pipeline */}
                <div className="rounded-sm border border-border/60 bg-background-card px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">
                    {isEs ? 'En revisión activa' : 'Under review'}
                  </div>
                  <div
                    className="tabular-nums leading-tight"
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatNumber((stats?.review_stats?.confirmed ?? 0) + (stats?.review_stats?.reviewing ?? 0))}
                  </div>
                  <div className="text-[10px] text-text-muted/60 mt-1 font-mono">
                    {formatNumber(stats?.review_stats?.confirmed ?? 0)} {isEs ? 'confirmados' : 'confirmed'}
                    <span className="mx-1 opacity-40">·</span>
                    {formatNumber(stats?.review_stats?.reviewing ?? 0)} {isEs ? 'activos' : 'active'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* aria-P2: Pattern editorial bars (replaces donut/pie pattern composition) */}
        {statsLoading ? (
          <div className="mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <p className="font-mono uppercase tracking-[0.15em] text-[10px] text-text-muted">
                {isEs ? '§ COMPOSICIÓN DE PATRONES' : '§ PATTERN COMPOSITION'}
              </p>
              <div className="h-3 w-16 bg-background-elevated rounded animate-pulse" />
            </div>
            <div className="rounded-sm border border-border/60 bg-background-card overflow-hidden">
              {Object.entries(PATTERN_LABELS).map(([key, meta], i) => (
                <div key={key} className={cn('flex items-center gap-3 px-3 py-2.5', i > 0 && 'border-t border-border/40')}>
                  <span
                    className="shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm leading-none"
                    style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}50` }}
                  >
                    {key}
                  </span>
                  <span className="text-[11px] font-mono text-text-secondary min-w-0 truncate flex-1">
                    {isEs ? meta.es : meta.en}
                  </span>
                  <div className="flex-1 h-1.5 bg-background-elevated rounded-sm animate-pulse max-w-[120px]" />
                  <span className="text-[10px] font-mono tabular-nums text-text-muted w-8 text-right">—</span>
                </div>
              ))}
            </div>
          </div>
        ) : Object.keys(patternCounts).length > 0 ? (
          <PatternEditorialBars
            patternCounts={patternCounts}
            isEs={isEs}
            total={stats?.queue_total}
            onPatternClick={(key) => {
              setPatternFilter(key)
              setTierFilter(null)
              setPage(1)
            }}
          />
        ) : null}

        {/* ════════════════════════════════════════════════════════════════
            UNIFIED FILTER BAR
            Patterns first (most discriminative), then tiers, then sector
            + flag toggles + search. Replaces three separate sections
            (TierNavigationRow stack, pattern chips, EditorialPageShell
            actions slot) that fought for vertical space.
           ════════════════════════════════════════════════════════════════ */}
        <div className="mb-4 space-y-2">
          {/* Quick-select preset row — most-used investigative views as
              one-click chips. 90% of users never touch raw filters; the
              presets give them the curated view they actually want. */}
          {(() => {
            const presets: Array<{
              id: string
              label: string
              icon: string
              isActive: boolean
              onClick: () => void
            }> = [
              {
                id: 'all-t1',
                label: isEs ? 'Cola T1' : 'All T1',
                icon: '◆',
                isActive: tierFilter === 1 && !patternFilter && !adminFilter && !gtOnly && !efosOnly && !sfpOnly && !newVendorOnly && !novelOnly && !sectorFilter,
                onClick: () => {
                  setTierFilter(1); setPatternFilter(null); setAdminFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setNewVendorOnly(false); setNovelOnly(false); setSectorFilter(null)
                  setReviewStatusFilter(null); setSearch(''); setPage(1)
                },
              },
              {
                id: 'active',
                label: isEs ? 'Activos 2024+' : 'Active 2024+',
                icon: '●',
                isActive: adminFilter === 'sheinbaum' && tierFilter === 1,
                onClick: () => {
                  setTierFilter(1); setAdminFilter('sheinbaum'); setPatternFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setSortKey('recency'); setPage(1)
                },
              },
              {
                id: 'flagged',
                label: isEs ? 'Validados externamente' : 'External-flagged',
                icon: '⚑',
                isActive: (gtOnly || efosOnly || sfpOnly) && tierFilter === 1,
                onClick: () => {
                  setTierFilter(1); setGtOnly(true); setEfosOnly(false); setSfpOnly(false)
                  setAdminFilter(null); setPatternFilter(null)
                  setNewVendorOnly(false); setNovelOnly(false); setPage(1)
                },
              },
              {
                id: 'long-running',
                label: isEs ? 'Histórico (10+ años)' : 'Long-running',
                icon: '↗',
                isActive: sortKey === 'tenure' && tierFilter === 1 && !adminFilter && !gtOnly,
                onClick: () => {
                  setTierFilter(1); setSortKey('tenure'); setAdminFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setPatternFilter(null); setPage(1)
                },
              },
              {
                id: 'biggest-bets',
                label: isEs ? 'Mayor valor' : 'Biggest bets',
                icon: '$',
                isActive: sortKey === 'value' && tierFilter === 1 && !adminFilter && !gtOnly,
                onClick: () => {
                  setTierFilter(1); setSortKey('value'); setAdminFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setPatternFilter(null); setPage(1)
                },
              },
            ]
            return (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
                  {isEs ? 'Vista' : 'View'}
                </span>
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={preset.onClick}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors',
                      preset.isActive
                        ? 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
                        : 'bg-background-card text-text-secondary border-border hover:border-border-hover'
                    )}
                  >
                    <span aria-hidden className="font-mono opacity-70">{preset.icon}</span>
                    {preset.label}
                  </button>
                ))}
                {(() => {
                  // U-061: count secondary filters that are active so the
                  // button surfaces hidden state. Primary slicers (tier,
                  // pattern, search) live in the always-visible row and
                  // are excluded here.
                  const secondaryActiveCount =
                    (sectorFilter != null ? 1 : 0) +
                    (newVendorOnly ? 1 : 0) +
                    (novelOnly ? 1 : 0) +
                    (adminFilter != null ? 1 : 0) +
                    (gtOnly ? 1 : 0) +
                    (efosOnly ? 1 : 0) +
                    (sfpOnly ? 1 : 0) +
                    (webEvidenceOnly ? 1 : 0) +
                    (llmMemoOnly ? 1 : 0) +
                    (reviewStatusFilter != null ? 1 : 0)
                  return (
                    <button
                      onClick={() => setMoreFiltersOpen((v) => !v)}
                      className={cn(
                        'ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-mono uppercase tracking-[0.12em] transition-colors shrink-0',
                        moreFiltersOpen
                          ? 'bg-background-elevated text-text-primary'
                          : secondaryActiveCount > 0
                            ? 'text-accent hover:text-text-primary'
                            : 'text-text-muted hover:text-text-primary'
                      )}
                      aria-expanded={moreFiltersOpen}
                      aria-label={
                        secondaryActiveCount > 0
                          ? (isEs
                              ? `Más filtros, ${secondaryActiveCount} activos`
                              : `More filters, ${secondaryActiveCount} active`)
                          : (isEs ? 'Más filtros' : 'More filters')
                      }
                    >
                      {moreFiltersOpen ? '−' : '+'} {isEs ? 'Más filtros' : 'More filters'}
                      {secondaryActiveCount > 0 && (
                        <span
                          className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent/15 text-accent text-[10px] font-mono tabular-nums font-bold"
                          aria-hidden
                        >
                          {secondaryActiveCount}
                        </span>
                      )}
                    </button>
                  )
                })()}
              </div>
            )
          })()}

          {/* Pattern chips — kept always-visible. The chip counts
              ("Institutional Capture 15,923") are a useful at-a-glance
              signal that a dropdown would hide. Single horizontal-scroll row. */}
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

          {/* Tier pills + Search — primary slicer always-visible row. */}
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
            <span className="mx-1 h-4 w-px bg-border hidden sm:inline-block" aria-hidden />
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

          {/* "+ More filters" disclosure — secondary filters hidden by
              default. Most users (~90%) never touch these. Power users
              get the same control with one click. Drops the chrome from
              ~9 default rows to 3-4. */}
          {moreFiltersOpen && (
            <div className="space-y-2 pt-2 mt-1 border-t border-border/60">
              {/* Sector + New / Novel toggles */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
                  {isEs ? 'Sector' : 'Sector'}
                </span>
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
                <span className="mx-1 h-3 w-px bg-border" aria-hidden />
                <button
                  onClick={() => { setNewVendorOnly(!newVendorOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
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
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    novelOnly
                      ? 'bg-background-elevated text-text-secondary border-border'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title={t('filters.novelOnlyTooltip')}
                >
                  {t('filters.novelOnly')}
                </button>
              </div>

              {/* Administration (sexenio) + external flags */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
                  {isEs ? 'Sexenio' : 'Admin'}
                </span>
                <button
                  onClick={() => { setAdminFilter(null); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    adminFilter == null
                      ? 'bg-background-elevated text-text-primary border-border'
                      : 'bg-background-card text-text-muted border-border hover:border-border'
                  )}
                >
                  {t('filters.all')}
                </button>
                {(['sheinbaum', 'amlo', 'pena', 'calderon', 'fox'] as const).map((key) => {
                  const meta = ADMIN_META[key]
                  const isActive = adminFilter === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setAdminFilter(isActive ? null : key); setPage(1) }}
                      className={cn(
                        'inline-flex items-baseline gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                        isActive
                          ? 'border-current'
                          : 'bg-background-card text-text-secondary border-border hover:border-border'
                      )}
                      style={isActive ? { color: meta.color, backgroundColor: `${meta.color}10` } : undefined}
                      title={`${meta.label} (${meta.range})`}
                    >
                      <span>{meta.label}</span>
                      <span className="font-mono text-[9px] text-text-muted tabular-nums">{meta.range}</span>
                    </button>
                  )
                })}
                <span className="mx-1 h-3 w-px bg-border" aria-hidden />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
                  {isEs ? 'Banderas' : 'Flags'}
                </span>
                <button
                  onClick={() => { setGtOnly(!gtOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    gtOnly
                      ? 'bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] border-[color:var(--color-accent)]/30'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title={isEs ? 'Solo proveedores en casos de referencia documentados' : 'Only vendors in documented ground-truth cases'}
                >
                  GT
                </button>
                <button
                  onClick={() => { setEfosOnly(!efosOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    efosOnly
                      ? 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title="SAT EFOS Definitivo"
                >
                  EFOS
                </button>
                <button
                  onClick={() => { setSfpOnly(!sfpOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    sfpOnly
                      ? 'bg-risk-high/10 text-risk-high border-risk-high/30'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title={isEs ? 'Sancionado por SFP' : 'Sanctioned by SFP'}
                >
                  SFP
                </button>
                <button
                  onClick={() => { setWebEvidenceOnly(!webEvidenceOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    webEvidenceOnly
                      ? 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title={isEs ? 'Evidencia web (CENTINELA)' : 'Has web evidence (CENTINELA)'}
                >
                  WEB
                </button>
                <button
                  onClick={() => { setLlmMemoOnly(!llmMemoOnly); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                    llmMemoOnly
                      ? 'bg-accent-data/10 text-accent-data border-accent-data/30'
                      : 'bg-background-card text-text-secondary border-border hover:border-border'
                  )}
                  title={isEs ? 'Solo proveedores con memo investigativo LLM completo' : 'Only vendors with full LLM investigation memo'}
                >
                  LLM
                </button>
              </div>

              {/* Review-status filter — moved out of the list header to
                  unblock single-line header layout. Workflow filter, used
                  by editorial leads tracking what's been triaged. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
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
                        'px-2 py-0.5 rounded-sm text-[11px] font-medium border transition-colors',
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
              </div>
            </div>
          )}
        </div>

        {/* GhostSuspectsPanel — only renders when P2 pattern is active. */}
        {patternFilter === 'P2' && (
          <GhostSuspectsPanel isEs={isEs} />
        )}

        {/* ============================================================== */}
        {/* INVESTIGATION LIST — one row per vendor, one action            */}
        {/* ============================================================== */}
        <section id="aria-investigation-list" aria-label={t('queueSection.title')}>
          {/* Active-filter summary bar — when 2+ filters are active, render
              the combination as removable chips above the list. Without
              this, an investigator who applied "T1 + P5 + AMLO + GT" 30
              seconds ago can't tell what's currently filtering the view —
              the chips are scattered across the filter bar above. This
              makes the *combination* visible. */}
          {activeFilterCount >= 2 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3 px-3 py-2 rounded-sm border border-border bg-background-card/60">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted shrink-0">
                {isEs ? 'Filtros activos' : 'Active filters'}
              </span>
              {tierFilter != null && (
                <FilterChip onClear={() => { setTierFilter(null); setPage(1) }}>
                  T{tierFilter}
                </FilterChip>
              )}
              {patternFilter && (
                <FilterChip onClear={() => { setPatternFilter(null); setPage(1) }}>
                  {patternFilter} {t(`patterns.${patternFilter}`)}
                </FilterChip>
              )}
              {sectorFilter != null && (
                <FilterChip onClear={() => { setSectorFilter(null); setPage(1) }}>
                  {(() => {
                    const s = SECTORS.find((x) => x.id === sectorFilter)
                    return s ? (isEs ? s.name : s.nameEN) : `Sector ${sectorFilter}`
                  })()}
                </FilterChip>
              )}
              {adminFilter && (
                <FilterChip onClear={() => { setAdminFilter(null); setPage(1) }} accent={ADMIN_META[adminFilter].color}>
                  {ADMIN_META[adminFilter].label} {ADMIN_META[adminFilter].range}
                </FilterChip>
              )}
              {gtOnly && (
                <FilterChip onClear={() => { setGtOnly(false); setPage(1) }} accent="var(--color-accent)">
                  GT only
                </FilterChip>
              )}
              {efosOnly && (
                <FilterChip onClear={() => { setEfosOnly(false); setPage(1) }} accent="var(--color-risk-critical)">
                  EFOS only
                </FilterChip>
              )}
              {sfpOnly && (
                <FilterChip onClear={() => { setSfpOnly(false); setPage(1) }} accent="var(--color-risk-high)">
                  SFP only
                </FilterChip>
              )}
              {webEvidenceOnly && (
                <FilterChip onClear={() => { setWebEvidenceOnly(false); setPage(1) }} accent="var(--color-risk-critical)">
                  {isEs ? 'Con evidencia web' : 'Web evidence'}
                </FilterChip>
              )}
              {newVendorOnly && (
                <FilterChip onClear={() => { setNewVendorOnly(false); setPage(1) }}>
                  {t('filters.newVendorOnly')}
                </FilterChip>
              )}
              {novelOnly && (
                <FilterChip onClear={() => { setNovelOnly(false); setPage(1) }}>
                  {t('filters.novelOnly')}
                </FilterChip>
              )}
              {reviewStatusFilter && (
                <FilterChip onClear={() => { setReviewStatusFilter(null); setPage(1) }}>
                  {t(`status.${reviewStatusFilter}`)}
                </FilterChip>
              )}
              {search && (
                <FilterChip onClear={() => { setSearch(''); setPage(1) }}>
                  "{search}"
                </FilterChip>
              )}
              <button
                onClick={clearAll}
                className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-risk-high hover:text-accent transition-colors shrink-0"
              >
                {t('filterBar.clearAll')}
              </button>
            </div>
          )}

          {/* List header — single tight line. The redundant "TIER 1 · 299 ·
              CLEAR ALL (1)" was already covered by the Active Filter Bar
              above; review-status chips moved into "+ More filters" since
              they're a workflow filter most users don't touch. Header now
              shows: count · sort · export — three things, never wraps. */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <span className="text-[11px] text-text-muted font-mono tabular-nums">
              {totalLeads > 0 ? `${formatNumber(totalLeads)} ${t('leads.vendorCount')}` : ''}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
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
                  {isEs ? '§ METODOLOGÍA · ' : '§ METHODOLOGY · '}{t('about.title', { defaultValue: 'Sobre ARIA' })}
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
