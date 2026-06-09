/**
 * ARIA — Cola de Investigación
 *
 * Charter Archetype B (index) — one eye-path down the page.
 *   B0. Folio — Playfair nameplate + dek + dateline (no seal)
 *   B1. § EL SALDO — the queue's single finding as a sentence with numbers
 *   B2. El Filtro — ONE unified header (tier pills · search · pattern · presets)
 *   B3. El Registro — investigation rows, one per vendor, EntityIdentityChip-routed
 *   Coda. § · ADÓNDE IR — pattern-dossier CTAs (P2/P6) + top-T1 vendor chips
 *   Procedencia. Methodology footer
 *
 * Credo: "evenflow" — ONE obvious action per element.
 */

import { useState, useRef, useEffect, Fragment } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
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
import { cn, formatCompactMXN, formatCompactUSDByYear, formatDualCurrency, formatNumber } from '@/lib/utils'
import { getSectorName, SECTORS } from '@/lib/constants'
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
      <span className={cn('h-1 w-1 rounded-full', meta.dot)} aria-hidden="true" />
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
          className="flex-1 py-1.5 rounded text-xs font-medium bg-risk-high text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? t('reviewPopover.saving') : t('reviewPopover.save')}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-background-card transition-colors"
          aria-label={t('reviewPopover.close')}
        >
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
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
        <XIcon className="w-2.5 h-2.5" aria-hidden="true" />
      </button>
    </span>
  )
}

// 2026-05-08 audit fix: title was monolingual EN — now picks ES on `es` locale.
const REVIEW_GLYPH: Record<ReviewStatus, { char: string; color: string; titleEn: string; titleEs: string }> = {
  pending:    { char: '○', color: 'var(--color-text-muted)',     titleEn: 'Pending review',      titleEs: 'Revisión pendiente' },
  reviewing:  { char: '◐', color: 'var(--color-risk-high)',      titleEn: 'Under review',         titleEs: 'En revisión' },
  confirmed:  { char: '✓', color: 'var(--color-risk-critical)',  titleEn: 'Confirmed corrupt',    titleEs: 'Corrupción confirmada' },
  dismissed:  { char: '⊘', color: 'var(--color-text-muted)',     titleEn: 'Dismissed',            titleEs: 'Descartado' },
}

function getTopBadges(item: AriaQueueItem, isEs: boolean): Array<{ code: string; cls: string; title: string }> {
  const badges: Array<{ code: string; cls: string; title: string }> = []
  if (item.in_ground_truth) {
    badges.push({ code: 'GT', cls: 'bg-accent/10 text-accent border-accent/30', title: isEs ? 'Caso documentado de corrupción' : 'Documented corruption case' })
  }
  if (item.is_efos_definitivo) {
    badges.push({ code: 'EFOS', cls: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30', title: 'SAT EFOS Definitivo' })
  }
  if (item.is_sfp_sanctioned) {
    badges.push({ code: 'SFP', cls: 'bg-risk-high/10 text-risk-high border-risk-high/30', title: isEs ? 'Sancionado por la SFP' : 'Sanctioned by SFP' })
  }
  if (item.web_evidence_verdict === 'SANCTION') {
    badges.push({ code: 'SANC', cls: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30', title: 'CENTINELA — Sanction' })
  } else if (item.web_evidence_verdict === 'CORRUPTION_MENTION') {
    badges.push({ code: 'CORR', cls: 'bg-risk-high/10 text-risk-high border-risk-high/30', title: 'CENTINELA — Corruption mention' })
  }
  if (item.memo_provenance === 'llm_narrative') {
    badges.push({ code: 'LLM', cls: 'bg-accent-data/10 text-accent-data border-accent-data/20', title: isEs ? 'Memo investigativo IA' : 'AI investigation memo' })
  }
  if (!item.in_ground_truth && item.ips_tier === 1) {
    badges.push({ code: 'DISC', cls: 'bg-accent-data/10 text-accent-data border-accent-data/20', title: isEs ? 'Descubrimiento del modelo' : 'Model discovery' })
  }
  return badges
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

  const riskColor =
    ips >= 0.75 ? 'var(--color-risk-critical)'
    : ips >= 0.50 ? 'var(--color-risk-high)'
    : ips >= 0.30 ? 'var(--color-risk-medium)'
    : 'var(--color-text-muted)'

  const allBadges = getTopBadges(item, isEs)
  const shownBadges = allBadges.slice(0, 2)
  const overflowCount = allBadges.length - 2

  const handleClick = () => {
    navigate(`/vendors/${item.vendor_id}`)
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
          'group relative grid items-center gap-x-3 gap-y-0.5 px-3 py-2 border-b border-border/50 border-l-2 bg-background-card hover:bg-background-elevated/40 transition-colors cursor-pointer',
          'grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto_auto]',
          tierCfg.accent
        )}
      >
        {/* ─── LINE 1: Name + pattern + sector + score + badges + review + arrow ── */}
        <div className="min-w-0 flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()} className="min-w-0">
            <EntityIdentityChip
              type="vendor"
              id={item.vendor_id}
              name={item.vendor_name}
              size="md"
              riskScore={item.avg_risk_score}
              sectorCode={item.primary_sector_name ?? null}
              ariaTier={item.ips_tier}
              hideIcon
            />
          </div>
          {patternKey && patternMeta && (
            <span
              className={cn('shrink-0 font-mono text-[9px] font-bold px-1 py-0.5 rounded-sm leading-none border', patternMeta.bg, patternMeta.text, patternMeta.border)}
            >
              {patternKey}
            </span>
          )}
          {sector && (
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.06em] text-text-muted hidden sm:inline" title={getSectorName(sector, isEs ? 'es' : 'en')}>
              {getSectorName(sector, isEs ? 'es' : 'en')}
            </span>
          )}
        </div>

        {/* IPS score — compact number badge */}
        <div
          className="shrink-0 flex items-center justify-end"
          title={`IPS ${ipsPct} · T${tier}`}
        >
          <span
            className="font-mono tabular-nums text-xs font-bold px-1.5 py-0.5 rounded-sm"
            style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}33` }}
          >
            {ipsPct}
          </span>
        </div>

        {/* Badges — max 2 + overflow */}
        <div className="shrink-0 flex items-center gap-1">
          {shownBadges.map((b) => (
            <span
              key={b.code}
              className={cn('inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border', b.cls)}
              title={b.title}
            >
              {b.code}
            </span>
          ))}
          {overflowCount > 0 && (
            <span
              className="text-[8px] font-mono text-text-muted bg-background-elevated rounded px-1 py-0.5"
              title={allBadges.slice(2).map(b => b.code).join(', ')}
            >
              +{overflowCount}
            </span>
          )}
        </div>

        {/* Review glyph */}
        <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-base leading-none hover:bg-background-elevated transition-colors"
            style={{ color: reviewGlyph.color }}
            aria-label={t('reviewPopover.updateTitle')}
            aria-expanded={reviewOpen}
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

        {/* Arrow */}
        <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-text-muted group-hover:text-risk-high group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden="true" />

        {/* ─── LINE 2: Financials + timeline ─────────────────────────── */}
        <div className="col-span-full flex items-center gap-2.5 text-[10px] font-mono text-text-muted flex-wrap">
          {value > 0 && (
            <>
              <span className="text-[11px] font-bold tabular-nums text-text-primary">
                {formatCompactMXN(value)}
              </span>
              <span className="tabular-nums text-text-muted/70">
                ~{formatCompactUSDByYear(value)}
              </span>
            </>
          )}
          {contracts > 0 && (
            <span className="tabular-nums">
              {formatNumber(contracts)}{' '}
              {isEs ? (contracts === 1 ? 'contrato' : 'contratos') : (contracts === 1 ? 'contract' : 'contracts')}
            </span>
          )}
          {firstYear != null && lastYear != null && (
            <span className="tabular-nums">
              '{String(firstYear).slice(2)}–'{String(lastYear).slice(2)}
            </span>
          )}
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-risk-high">
              <span className="h-1.5 w-1.5 rounded-full bg-risk-high animate-pulse" aria-hidden="true" />
              <span className="uppercase tracking-[0.08em] font-bold">
                {isEs ? `Activo ${lastYear}` : `Active ${lastYear}`}
              </span>
            </span>
          ) : isDormant && lastYear ? (
            <span className="text-text-muted/70">
              {isEs ? `Inactivo desde ${lastYear}` : `Dormant since ${lastYear}`}
            </span>
          ) : null}
          {sector && (
            <span className="sm:hidden inline-flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-text-muted/60 shrink-0" aria-hidden="true" />
              <span className="uppercase tracking-[0.06em]">
                {getSectorName(sector, isEs ? 'es' : 'en')}
              </span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// SaldoAnchor — Playfair Display Italic 800 tabular-nums anchor number for the
// EL SALDO lede. Color is applied via style={{ color }} (never a hex className —
// the April 2026 audit found that hex-as-className is silently stripped).
// ============================================================================

function SaldoAnchor({
  children,
  color,
  small,
}: {
  children: React.ReactNode
  color: string
  small?: boolean
}) {
  return (
    <span
      className={cn('tabular-nums align-baseline', small ? 'text-xl' : 'text-2xl sm:text-[28px]')}
      style={{
        color,
        fontFamily: '"Playfair Display", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
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

// 2026-05-16 (Audit F060/F169/F170): pattern names aligned to backend canon.
//   P1 Concentrated Monopoly  P2 Ghost Company  P3 Single-Use Intermediary
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

  // Coda exit-ramp chips — top T1 vendors drawn from the already-fetched page
  // (no new API call). Prefer Tier-1 rows; fall back to the highest-IPS rows
  // currently loaded so the coda is never empty under a non-T1 filter.
  const codaVendors: AriaQueueItem[] = (() => {
    const sorted = [...leadsItemsRaw].sort((a, b) => (b.ips_final ?? 0) - (a.ips_final ?? 0))
    const t1 = sorted.filter((it) => (it.ips_tier ?? 4) === 1)
    return (t1.length >= 3 ? t1 : sorted).slice(0, 3)
  })()

  const isEs = i18n.language.startsWith('es')

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
    <div className="bg-background">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {/* ═══ B0 · FOLIO — surface nameplate: title + dek + dateline (no seal) ═══ */}
        <header className="mb-3">
          <h1
            className="text-text-primary"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(20px, 3vw, 28px)',
              lineHeight: 1,
              letterSpacing: '-0.012em',
            }}
          >
            {isEs ? 'Cola de Riesgo' : 'Risk Queue'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-2xl leading-snug">
            {isEs
              ? 'La cola priorizada de ARIA — proveedores ordenados por indicador de riesgo del modelo y señales de patrón, listos para investigar.'
              : 'ARIA’s prioritized queue — vendors ranked by the model’s risk indicator and pattern signals, ready to investigate.'}
          </p>
          <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted inline-flex items-center gap-1.5 flex-wrap">
            <span>ARIA</span>
            <span aria-hidden>·</span>
            <span>{isEs ? 'Modelo v0.8.5' : 'Model v0.8.5'}</span>
            <MetodologiaTooltip
              title={t('methodology.title')}
              body={t('methodology.body')}
              link="/methodology"
            />
          </p>
        </header>

        {/* ═══ B1 · EL SALDO — the queue's single most important finding, as a ═══ */}
        {/* sentence with numbers (charter invariant #17: NOT a KPI grid).        */}
        <section aria-label={isEs ? 'El saldo de la cola' : 'The queue’s bottom line'} className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-1.5">
            {isEs ? '§ EL SALDO' : '§ THE BOTTOM LINE'}
          </p>
          {statsLoading ? (
            <span className="h-3 w-3/4 max-w-lg rounded bg-background-elevated animate-pulse inline-block" />
          ) : (
            <p className="text-sm sm:text-[15px] text-text-secondary leading-relaxed max-w-3xl">
              {isEs ? (
                <>
                  El modelo coloca{' '}
                  <SaldoAnchor color="var(--color-risk-critical)">
                    {formatNumber(stats?.latest_run?.tier1_count ?? 0)}
                  </SaldoAnchor>{' '}
                  proveedores en el Nivel 1 —{' '}
                  <span className="text-text-muted">los anclados en casos de referencia más los descubrimientos del modelo</span>{' '}
                  — de una cola total de{' '}
                  <SaldoAnchor color="var(--color-text-primary)">
                    {formatNumber(stats?.queue_total ?? 0)}
                  </SaldoAnchor>{' '}
                  proveedores. Suman{' '}
                  <SaldoAnchor color="var(--color-risk-high)" small>
                    {formatDualCurrency(stats?.elevated_value_mxn ?? 0)}
                  </SaldoAnchor>{' '}
                  en valor de contratos marcados para revisión.
                </>
              ) : (
                <>
                  The model places{' '}
                  <SaldoAnchor color="var(--color-risk-critical)">
                    {formatNumber(stats?.latest_run?.tier1_count ?? 0)}
                  </SaldoAnchor>{' '}
                  vendors in Tier 1 —{' '}
                  <span className="text-text-muted">the ground-truth-anchored plus the model’s own discoveries</span>{' '}
                  — out of a total queue of{' '}
                  <SaldoAnchor color="var(--color-text-primary)">
                    {formatNumber(stats?.queue_total ?? 0)}
                  </SaldoAnchor>{' '}
                  vendors. Together they carry{' '}
                  <SaldoAnchor color="var(--color-risk-high)" small>
                    {formatDualCurrency(stats?.elevated_value_mxn ?? 0)}
                  </SaldoAnchor>{' '}
                  in contract value flagged for review.
                </>
              )}
            </p>
          )}
        </section>

        {/* ═══ FILTER BAR — Tier + Search (row 1), Patterns (row 2), VIEW presets (row 3) ═══ */}
        <div className="mb-4 space-y-2">
          {/* ROW 1: Tier pills + Search — primary slicer */}
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" aria-hidden="true" />
              <input
                type="text"
                aria-label={isEs ? 'Buscar en la cola ARIA' : 'Search ARIA queue'}
                placeholder={t('leads.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-7 pr-3 py-1 text-xs bg-background-card border border-border rounded-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-accent font-mono"
              />
            </div>
          </div>

          {/* ROW 2: Pattern summary — compact clickable chips with counts */}
          {Object.keys(patternCounts).length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
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

          {/* ROW 3: VIEW presets + More filters toggle */}
          {(() => {
            const presets: Array<{ id: string; label: string; isActive: boolean; onClick: () => void }> = [
              {
                id: 'active',
                label: isEs ? 'Activos 2024+' : 'Active 2024+',
                isActive: adminFilter === 'sheinbaum' && tierFilter === 1,
                onClick: () => {
                  setTierFilter(1); setAdminFilter('sheinbaum'); setPatternFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setSortKey('recency'); setPage(1)
                },
              },
              {
                id: 'flagged',
                label: isEs ? 'Validados extern.' : 'External-flagged',
                isActive: (gtOnly || efosOnly || sfpOnly) && tierFilter === 1,
                onClick: () => {
                  setTierFilter(1); setGtOnly(true); setEfosOnly(false); setSfpOnly(false)
                  setAdminFilter(null); setPatternFilter(null)
                  setNewVendorOnly(false); setNovelOnly(false); setPage(1)
                },
              },
              {
                id: 'biggest-bets',
                label: isEs ? 'Mayor valor' : 'Biggest bets',
                isActive: sortKey === 'value' && tierFilter === 1 && !adminFilter && !gtOnly,
                onClick: () => {
                  setTierFilter(1); setSortKey('value'); setAdminFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setPatternFilter(null); setPage(1)
                },
              },
              {
                id: 'long-running',
                label: isEs ? 'Histórico 10+' : 'Long-running',
                isActive: sortKey === 'tenure' && tierFilter === 1 && !adminFilter && !gtOnly,
                onClick: () => {
                  setTierFilter(1); setSortKey('tenure'); setAdminFilter(null)
                  setGtOnly(false); setEfosOnly(false); setSfpOnly(false)
                  setPatternFilter(null); setPage(1)
                },
              },
            ]
            const secondaryActiveCount =
              (sectorFilter != null ? 1 : 0) + (newVendorOnly ? 1 : 0) + (novelOnly ? 1 : 0) +
              (adminFilter != null ? 1 : 0) + (gtOnly ? 1 : 0) + (efosOnly ? 1 : 0) +
              (sfpOnly ? 1 : 0) + (webEvidenceOnly ? 1 : 0) + (llmMemoOnly ? 1 : 0) +
              (reviewStatusFilter != null ? 1 : 0)
            return (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
                  {isEs ? 'Vista' : 'View'}
                </span>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={p.onClick}
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-mono transition-colors',
                      p.isActive
                        ? 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
                        : 'bg-background-card text-text-muted border-border hover:border-border-hover'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-[0.12em] transition-colors shrink-0',
                    moreFiltersOpen ? 'bg-background-elevated text-text-primary'
                      : secondaryActiveCount > 0 ? 'text-accent hover:text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                  aria-expanded={moreFiltersOpen}
                  aria-label={isEs ? 'Más filtros' : 'More filters'}
                >
                  {moreFiltersOpen ? '−' : '+'} {isEs ? 'Más filtros' : 'More filters'}
                  {secondaryActiveCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent/15 text-accent text-[10px] font-mono tabular-nums font-bold" aria-hidden>
                      {secondaryActiveCount}
                    </span>
                  )}
                </button>
              </div>
            )
          })()}

          {/* "+ More filters" disclosure — secondary filters */}
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
                      ? 'bg-accent/10 text-accent border-accent/30'
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
            <div className="ml-auto flex items-center gap-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-text-muted mr-1">
                {isEs ? 'Orden' : 'Sort'}
              </span>
              {(
                [
                  { key: 'ips',     labelEs: 'Indicador de Riesgo ↕', labelEn: 'Risk Score ↕' },
                  { key: 'value',   labelEs: 'Valor MXN ↕',           labelEn: 'MXN Value ↕' },
                  { key: 'recency', labelEs: 'T1 Reciente ↕',         labelEn: 'T1 Count ↕' },
                  { key: 'pattern', labelEs: 'Patrón ↕',              labelEn: 'Pattern ↕' },
                ] as const
              ).map(({ key, labelEs, labelEn }) => (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border transition-colors"
                  style={{
                    background: sortKey === key ? 'var(--color-accent)' : 'var(--color-background-card)',
                    color: sortKey === key ? '#ffffff' : 'var(--color-text-secondary)',
                    borderColor: sortKey === key ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                >
                  {isEs ? labelEs : labelEn}
                </button>
              ))}
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
              <Search className="h-8 w-8 mx-auto mb-3 text-text-primary" aria-hidden="true" />
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

        {/* ═══ BADGE LEGEND ═══ */}
        <div className="rounded-sm border border-border bg-background-card p-4 mt-4">
          <p className="font-mono uppercase tracking-[0.15em] text-[10px] text-text-muted font-bold mb-3">
            {isEs ? '§ LEYENDA DE INDICADORES' : '§ BADGE LEGEND'}
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
            {([
              { code: 'GT', cls: 'bg-accent/10 text-accent border-accent/30', es: 'Caso documentado de corrupción (corpus de referencia)', en: 'Documented corruption case (ground-truth corpus)' },
              { code: 'EFOS', cls: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30', es: 'Lista SAT de empresas que facturan operaciones simuladas', en: 'SAT invoice fraud list (definitive)' },
              { code: 'SFP', cls: 'bg-risk-high/10 text-risk-high border-risk-high/30', es: 'Sancionado por la Secretaría de la Función Pública', en: 'Sanctioned by public audit authority' },
              { code: 'LLM', cls: 'bg-accent-data/10 text-accent-data border-accent-data/20', es: 'Memo investigativo generado por IA disponible', en: 'AI-generated investigation memo available' },
              { code: 'SANC', cls: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30', es: 'Sanción oficial encontrada en medios digitales', en: 'Official sanction found in digital media' },
              { code: 'CORR', cls: 'bg-risk-high/10 text-risk-high border-risk-high/30', es: 'Mención de corrupción en medios digitales', en: 'Corruption mention in digital media' },
              { code: 'DISC', cls: 'bg-accent-data/10 text-accent-data border-accent-data/20', es: 'Descubrimiento del modelo — T1 sin anclaje GT, señal pura', en: 'Model discovery — T1 without GT anchor, pure signal' },
            ] as const).map((b) => (
              <Fragment key={b.code}>
                <span className={cn('inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border', b.cls)}>
                  {b.code}
                </span>
                <span className="text-[11px] text-text-muted leading-relaxed">
                  {isEs ? b.es : b.en}
                </span>
              </Fragment>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* CODA · § ADÓNDE IR — exit ramps: pattern dossiers + top T1 chips */}
        {/* ============================================================== */}
        <section
          aria-label={isEs ? 'Adónde ir' : 'Where to go next'}
          className="mt-4 rounded-sm border border-border bg-background-card p-4"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
            {isEs ? '§ · ADÓNDE IR' : '§ · WHERE TO GO NEXT'}
          </p>

          {/* Pattern-dossier CTAs — the two structural families behind the queue */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Link
              to="/patterns/P2"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-risk-high/30 bg-risk-high/10 text-risk-high text-[11px] font-mono uppercase tracking-[0.08em] hover:bg-risk-high/20 transition-colors"
              title={isEs ? 'Patrón P2 · Empresa Fantasma' : 'Pattern P2 · Ghost Company'}
            >
              {isEs ? 'P2 · Empresa Fantasma' : 'P2 · Ghost Company'}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              to="/patterns/P6"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-risk-critical/30 bg-risk-critical/10 text-risk-critical text-[11px] font-mono uppercase tracking-[0.08em] hover:bg-risk-critical/20 transition-colors"
              title={isEs ? 'Patrón P6 · Captura Institucional' : 'Pattern P6 · Institutional Capture'}
            >
              {isEs ? 'P6 · Captura Institucional' : 'P6 · Institutional Capture'}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {/* Top T1 vendor chips — drawn from already-fetched queue data */}
          {codaVendors.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1.5">
                {isEs ? 'Encabezan la cola' : 'Leading the queue'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {codaVendors.map((v) => (
                  <EntityIdentityChip
                    key={v.vendor_id}
                    type="vendor"
                    id={v.vendor_id}
                    name={v.vendor_name}
                    size="sm"
                    riskScore={v.avg_risk_score}
                    sectorCode={v.primary_sector_name ?? null}
                    ariaTier={v.ips_tier}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* 6. METHODOLOGY FOOTER — minimal                                */}
        {/* ============================================================== */}
        <section>
          <div className="rounded-sm border border-border bg-background-card p-4 mt-4">
            <div className="flex items-start gap-3">
              <FileText className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
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
