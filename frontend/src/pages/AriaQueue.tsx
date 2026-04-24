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
import type { AriaQueueItem, AriaStatsResponse, GhostSuspect } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { getSectorNameEN, SECTORS } from '@/lib/constants'
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
  P4: { text: 'text-text-secondary',  bg: 'bg-background-elevated',  border: 'border-border',  dot: 'bg-background-elevated' },
  P5: { text: 'text-text-secondary',  bg: 'bg-background-elevated',  border: 'border-border',  dot: 'bg-background-elevated' },
  P6: { text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-500' },
  P7: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
}

// IPS pill color mirrors risk severity bands (critical/high/medium/low).
const IPS_TEXT_COLOR = (score: number) => {
  if (score >= 0.75) return 'text-red-400'   // critical
  if (score >= 0.50) return 'text-amber-400' // high
  if (score >= 0.30) return 'text-text-secondary'  // medium
  return 'text-text-muted'                      // low
}

const IPS_BG_COLOR = (score: number) => {
  if (score >= 0.75) return 'bg-red-500/10 border-red-500/20'
  if (score >= 0.50) return 'bg-amber-500/10 border-amber-500/20'
  if (score >= 0.30) return 'bg-background-elevated border-border'
  return 'bg-background-card border-border'
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
  reviewing: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { className: 'bg-red-500/10 text-red-400 border-red-500/20' },
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
        'w-full text-left flex items-center gap-4 px-4 py-3 rounded-sm border border-border border-l-4 transition-all',
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
        <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">
          {t(tier.nameKey)}
        </div>
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <div className={cn('stat-sm tabular-nums', tier.textColor)}>
            {formatNumber(count)}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">
            {t('leads.vendorCount')}
          </div>
        </div>
        <div>
          <div className="stat-sm font-mono tabular-nums text-text-secondary">
            {avgRisk != null ? `${(avgRisk * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">
            {t('tierCard.avgRisk')}
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="stat-sm font-mono tabular-nums text-text-secondary">
            {valueAtRisk != null && valueAtRisk > 0 ? formatCompactMXN(valueAtRisk) : '—'}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">
            {t('tierCard.valueAtRisk')}
          </div>
        </div>
      </div>

      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'text-amber-400 translate-x-0.5' : 'text-text-muted')} />
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
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors',
        isActive
          ? cn(meta.bg, meta.text, meta.border)
          : 'bg-background-card text-text-secondary border-border hover:border-border'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
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
          className="w-full py-1.5 rounded text-xs font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
        >
          {promoteMutation.isPending ? t('reviewPopover.promoting') : promoteMutation.isSuccess ? t('reviewPopover.promotedToGT') : t('reviewPopover.promoteToGT')}
        </button>
      )}
      {inGroundTruth && (
        <p className="text-[10px] text-text-muted text-center">{t('reviewPopover.alreadyInGT')}</p>
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

// ============================================================================
// Ghost Suspects Panel — shown when P2 pattern filter is active
// ============================================================================

const TIER_GHOST_META = {
  confirmed:    { label: 'Confirmed', labelEs: 'Confirmado',    color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-500' },
  multi_signal: { label: 'Multi-Signal', labelEs: 'Multi-Señal', color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  behavioral:   { label: 'Behavioral', labelEs: 'Conductual',   color: 'var(--color-text-muted)', bg: 'bg-background-elevated',   border: 'border-border',  dot: 'bg-background-elevated' },
}

const SIG_LABELS: Record<string, { en: string; es: string }> = {
  sig_efos_definitivo:  { en: 'SAT confirmed shell', es: 'SAT: empresa fantasma confirmada' },
  sig_sfp_sanctioned:   { en: 'SFP sanctioned', es: 'SFP: sancionado' },
  sig_efos_soft:        { en: 'SAT under review', es: 'SAT: bajo revisión' },
  sig_p7_intersection:  { en: 'P7 intermediary overlap', es: 'Solapamiento P7 intermediario' },
  sig_disappeared:      { en: 'Disappeared from market', es: 'Desaparecido del mercado' },
  sig_invalid_rfc:      { en: 'Invalid RFC', es: 'RFC inválido' },
  sig_young_company:    { en: '<2yr at first contract', es: '<2 años al primer contrato' },
  sig_high_risk:        { en: 'Risk score ≥0.50', es: 'Puntaje de riesgo ≥0.50' },
  sig_temporal_burst:   { en: 'Temporal burst', es: 'Ráfaga temporal' },
  sig_ultra_micro:      { en: '≤3 lifetime contracts', es: '≤3 contratos de por vida' },
  sig_short_lived:      { en: '≤1yr active', es: '≤1 año activo' },
}

const SIG_KEYS = Object.keys(SIG_LABELS) as (keyof GhostSuspect)[]

function GhostSuspectsPanel({ isEs }: { isEs: boolean }) {
  const navigate = useNavigate()
  const [tierTab, setTierTab] = useState<'confirmed' | 'multi_signal' | 'behavioral'>('confirmed')
  const [ghostPage, setGhostPage] = useState(1)
  const GHOST_PER_PAGE = 20

  const { data: ghostData, isLoading: ghostLoading } = useQuery({
    queryKey: ['ghost-suspects', { tier: tierTab, page: ghostPage }],
    queryFn: () => ariaApi.getGhostSuspects({ tier: tierTab, page: ghostPage, per_page: GHOST_PER_PAGE }),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const tierSummary = ghostData?.tier_summary ?? { confirmed: 0, multi_signal: 0, behavioral: 0 }
  const suspects = ghostData?.data ?? []
  const totalPages = ghostData ? Math.ceil(ghostData.pagination.total / GHOST_PER_PAGE) : 0

  if (ghostData === undefined && !ghostLoading) return null

  return (
    <div className="mt-4 rounded-sm border border-amber-500/20 bg-amber-500/[0.03]">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-amber-500/15 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400">
            {isEs ? 'ANÁLISIS DE CONFIANZA · EMPRESAS FANTASMA' : 'GHOST CONFIDENCE ANALYSIS'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {isEs
              ? '11 señales independientes — convergen para producir una cola de investigación defendible'
              : '11 independent signals — convergence builds a defensible investigation referral'}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-text-muted">
          <span>{isEs ? 'puntuado' : 'scored'}</span>
          <span className="text-amber-500">{(tierSummary.confirmed + tierSummary.multi_signal + tierSummary.behavioral).toLocaleString()}</span>
          <span>{isEs ? 'proveedores P2' : 'P2 vendors'}</span>
        </div>
      </div>

      {/* Tier tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap">
        {(['confirmed', 'multi_signal', 'behavioral'] as const).map((tier) => {
          const meta = TIER_GHOST_META[tier]
          const count = tierSummary[tier]
          return (
            <button
              key={tier}
              onClick={() => { setTierTab(tier); setGhostPage(1) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors',
                tierTab === tier
                  ? cn(meta.bg, meta.border)
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
              <span style={tierTab === tier ? { color: meta.color } : undefined}>
                {isEs ? meta.labelEs : meta.label}
              </span>
              <span className="font-mono tabular-nums text-text-muted">{count.toLocaleString()}</span>
            </button>
          )
        })}
        <div className="ml-auto self-center text-[10px] text-text-muted font-mono hidden sm:block">
          {tierTab === 'confirmed' && (isEs ? 'Verificación externa (EFOS SAT / SFP)' : 'External verification (EFOS SAT / SFP)')}
          {tierTab === 'multi_signal' && (isEs ? '3+ señales independientes convergentes' : '3+ independent signals converging')}
          {tierTab === 'behavioral' && (isEs ? 'Solo patrón P2 — evidencia adicional necesaria' : 'P2 pattern only — additional evidence needed')}
        </div>
      </div>

      {/* Suspects list */}
      <div className="px-4 pb-4">
        {ghostLoading ? (
          <div className="space-y-1.5 pt-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-sm" />)}
          </div>
        ) : suspects.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">
            {isEs ? 'No hay sospechosos en este nivel' : 'No suspects in this tier'}
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            {suspects.map((s) => {
              const meta = TIER_GHOST_META[s.ghost_confidence_tier]
              const activeSigs = SIG_KEYS.filter((k) => s[k] === 1)
              return (
                <button
                  key={s.vendor_id}
                  onClick={() => navigate(`/vendors/${s.vendor_id}`)}
                  className="w-full text-left group flex items-start gap-3 px-3 py-2.5 rounded-sm border border-transparent hover:border-border hover:bg-background-card transition-all"
                >
                  {/* Score badge */}
                  <div className="shrink-0 w-10 text-right pt-0.5">
                    <span className="font-mono font-bold text-sm tabular-nums" style={{ color: meta.color }}>
                      {s.ghost_confidence_score.toFixed(1)}
                    </span>
                  </div>

                  {/* Name + signals */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary truncate group-hover:text-text-primary">
                        {s.vendor_name || `#${s.vendor_id}`}
                      </span>
                      {s.total_contracts != null && (
                        <span className="text-[10px] font-mono text-text-muted shrink-0">
                          {s.total_contracts} {isEs ? 'contratos' : 'contracts'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeSigs.map((k) => {
                        const keyStr = k as string
                        const sigLabel = SIG_LABELS[keyStr]
                        const isExternal = keyStr === 'sig_efos_definitivo' || keyStr === 'sig_sfp_sanctioned'
                        return (
                          <span
                            key={keyStr}
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                              isExternal
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-background-elevated border-border text-text-secondary'
                            )}
                          >
                            {isEs ? sigLabel.es : sigLabel.en}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Signals count */}
                  <div className="shrink-0 self-center">
                    <span className="text-[10px] font-mono tabular-nums text-text-muted">
                      {s.ghost_signal_count} {isEs ? 'señ' : 'sig'}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-primary group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {/* Ghost pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setGhostPage(Math.max(1, ghostPage - 1))}
              disabled={ghostPage === 1}
              className="px-3 py-1 text-xs border border-border rounded-sm text-text-secondary hover:border-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
            >← {isEs ? 'Anterior' : 'Previous'}</button>
            <span className="text-xs text-text-muted font-mono tabular-nums">
              {ghostPage} / {totalPages}
            </span>
            <button
              onClick={() => setGhostPage(Math.min(totalPages, ghostPage + 1))}
              disabled={ghostPage === totalPages}
              className="px-3 py-1 text-xs border border-border rounded-sm text-text-secondary hover:border-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
            >{isEs ? 'Siguiente' : 'Next'} →</button>
          </div>
        )}
      </div>
    </div>
  )
}

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
          'group relative flex items-center gap-3 sm:gap-4 px-4 py-2 rounded-sm border border-border border-l-4 bg-background-card hover:bg-background-card hover:border-border transition-all cursor-pointer',
          tierCfg.accent
        )}
      >
        {/* Tier badge */}
        <div className="shrink-0 w-10 sm:w-12 text-center">
          <div className={cn(
            'inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-[0.15em]',
            tierCfg.pillBg,
            tierCfg.pillText
          )}>
            T{tier}
          </div>
        </div>

        {/* Vendor name + subline — the editorial anchor */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary truncate leading-tight">
              {item.vendor_name}
            </h3>
            {item.new_vendor_risk && (
              <span className="shrink-0 font-mono text-[9px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                NEW
              </span>
            )}
          </div>
          {sublineParts.length > 0 && (
            <p className="text-xs text-text-muted truncate mt-0.5">
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
              'inline-flex items-baseline gap-0.5 px-2 py-1 rounded-sm border tabular-nums',
              IPS_BG_COLOR(ips)
            )}
            title={t('ipsBreakdown.title')}
          >
            <span className={cn('font-mono font-bold text-base leading-none', IPS_TEXT_COLOR(ips))}>
              {ipsPct}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">IPS</span>
          </div>
        </div>

        {/* Review + arrow actions */}
        <div className="relative flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setReviewOpen((v) => !v)}
            className="hidden sm:inline-flex p-1.5 rounded text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
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
          <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
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

  const PER_PAGE = 50

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<AriaStatsResponse>({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 5 * 60_000,
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
          <p className="text-xs font-mono uppercase tracking-widest text-red-500 mb-2">{t('connectionError.title')}</p>
          <p className="text-lg font-bold text-text-primary mb-2">{t('connectionError.headline')}</p>
          <p className="text-sm text-text-muted">{t('connectionError.body')}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded bg-background-elevated text-text-secondary text-xs font-mono hover:bg-background-elevated transition-colors"
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
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-background-elevated" />
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder={t('leads.searchPlaceholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-background-card border border-border rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
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
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
                {t('threatLevels')}
              </p>
              <span className="text-[10px] text-text-muted font-mono">·</span>
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-[0.15em]">
                {t('tierCard.clickFilter')}
              </p>
            </div>
          </div>

          {statsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-sm" />
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
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
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
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors',
                  newVendorOnly
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors',
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
                  'inline-flex items-center px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors cursor-pointer',
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
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* GHOST SUSPECTS — P2 confidence panel (shown when P2 active)    */}
        {/* ============================================================== */}
        {patternFilter === 'P2' && (
          <GhostSuspectsPanel isEs={isEs} />
        )}

        {/* ============================================================== */}
        {/* HOW TO READ THIS QUEUE — methodology explainer                 */}
        {/* ============================================================== */}
        <div className="surface-card--evidence surface-card p-4 mb-4">
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-accent block mb-1">
              {isEs ? 'Cómo leer esta cola' : 'How to read this queue'}
            </span>
            {isEs
              ? 'Cada fila es un proveedor ordenado por IPS — el Índice de Prioridad de Investigación. IPS combina puntaje de riesgo, señales de anomalía, centralidad de red y coincidencias en registros externos (EFOS, SFP, RUPC). Los proveedores T1 deben investigarse de inmediato. Haga clic en cualquier fila para abrir el dossier completo.'
              : 'Each row is a vendor ranked by IPS — the Investigation Priority Score. IPS combines risk score, anomaly signals, network centrality, and external registry matches (EFOS, SFP, RUPC). T1 vendors should be investigated immediately. Click any row to open the full dossier.'}
          </p>
        </div>

        {/* ============================================================== */}
        {/* INVESTIGATION LIST — one row per vendor, one action            */}
        {/* ============================================================== */}
        <section id="aria-investigation-list" aria-label={t('queueSection.title')}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
                  {tierFilter != null
                    ? t(TIER_CONFIG.find((c) => c.tier === tierFilter)!.labelKey)
                    : t('queueSection.title', { defaultValue: 'Cola completa' })}
                </p>
                {activeFilterCount > 0 && (
                  <>
                    <span className="text-[10px] text-text-muted font-mono">·</span>
                    <button
                      onClick={clearAll}
                      className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {t('filterBar.clearAll')} ({activeFilterCount})
                    </button>
                  </>
                )}
              </div>
              {totalLeads > 0 && (
                <p className="text-xs text-text-muted font-mono mt-1 tabular-nums">
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
                    'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
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
                <InvestigationRow key={item.vendor_id} item={item} />
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

        </Act>
        </EditorialPageShell>
      </div>
    </div>
  )
}
