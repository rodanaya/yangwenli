/**
 * ARIA — Lista de Vigilancia · «El Registro de Asignación»
 *
 * La máquina propone, el analista dispone. Spec:
 * .claude/designs/aria-cola-2026-06-11-spec.md (DESIGNUS panel, APPROVED 2026-06-12).
 *
 *   B0. Folio · B1. § EL SALDO — kept frames (sentence carries the GT/DISC split)
 *   § EL EMBUDO — log-width compression band = the tier navigation
 *   Honest filter rail — every visible control is server-backed
 *   § EL REGISTRO — 40px agate rows (rank+provenance · mills IPS · driver tag ·
 *     E/S/W ticks · memo provenance · disposition rail/cell)
 *   EL DESGLOSE — lazy in-row case file with the one-click verdict bar
 *   Coda. § · ADÓNDE IR · § METODOLOGÍA — kept
 *
 * Data-honesty invariants (panel audit F1/F2): T1 has ZERO 'pending' rows —
 * start-here keys on needs_review; progress never renders from
 * t1_reviewed_count (it counts 299/299).
 */

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ariaApi } from '@/api/client'
import { GhostSuspectsPanel } from '@/components/aria/GhostSuspectsPanel'
import { FunnelBand } from '@/components/aria/FunnelBand'
import { QueueRegisterHeader } from '@/components/aria/QueueRegisterHeader'
import { RegisterRow } from '@/components/aria/RegisterRow'
import { RowExpand } from '@/components/aria/RowExpand'
import { bucketStatus } from '@/components/aria/disposition'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type { AriaQueueItem, AriaStatsResponse } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDualCurrency, formatNumber } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import {
  Search,
  FileText,
  ArrowRight,
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
  // Debounced server search — the old input fired one fetch per keystroke.
  const { inputValue: search, setInputValue: setSearch, debouncedValue: debouncedSearch, clear: clearSearch } =
    useDebouncedSearch('', { delay: 300 })
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
  // Free-string server param — canonical 4 plus CENTINELA script statuses
  // (the "Por revisar" chip sends 'needs_review'; aria.py:144–146 binds it
  // parameterized). W5: every filter on this page is server-backed.
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string | null>(null)
  const [efosOnly, setEfosOnly] = useState(false)
  // "Histórico 10+" — wires the existing, never-sent min_years_active param.
  const [minYears, setMinYears] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  // One expand open at a time — EL DESGLOSE state.
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Disclosure state for the "+ More filters" panel.
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  const PER_PAGE = 50

  // Stats keeps refetchOnWindowFocus (cheap, feeds the funnel + strip and
  // auto-recovers from deploy blips); the QUEUE query drops it and both gain
  // placeholderData so the rendered register never collapses to skeletons
  // mid-read (W7 — observed 4,955px → 1,714px on tab-return; pattern:
  // InstitutionLeague.tsx:983).
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
    placeholderData: (prev) => prev,
  })

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError } = useQuery({
    queryKey: ['aria-queue-leads', { page, search: debouncedSearch, patternFilter, tierFilter, newVendorOnly, novelOnly, sectorFilter, reviewStatusFilter, efosOnly, minYears }],
    queryFn: () =>
      ariaApi.getQueue({
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
        pattern: patternFilter ?? undefined,
        new_vendor_only: newVendorOnly || undefined,
        novel_only: novelOnly || undefined,
        status: reviewStatusFilter ?? undefined,
        tier: tierFilter ?? undefined,
        sector_id: sectorFilter ?? undefined,
        efos_only: efosOnly || undefined,
        min_years_active: minYears ?? undefined,
      }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  })

  const totalLeads = leadsData?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalLeads / PER_PAGE)

  const patternCounts = stats?.pattern_counts ?? {}

  // Server truth, verbatim — the client filter/sort pipeline is deleted (W5:
  // controls whose operand was 50 rows presented as global are gone, not
  // relabeled). Order is always the server's ips_final DESC.
  const leadsItems: AriaQueueItem[] = leadsData?.data ?? []
  const queueSummary = leadsData?.summary ?? null

  // Close any open desglose when the underlying slice changes — no ghost
  // panels floating over different data.
  useEffect(() => {
    setExpandedId(null)
  }, [page, debouncedSearch, patternFilter, tierFilter, newVendorOnly, novelOnly, sectorFilter, reviewStatusFilter, efosOnly, minYears])

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
    const sorted = [...leadsItems].sort((a, b) => (b.ips_final ?? 0) - (a.ips_final ?? 0))
    const t1 = sorted.filter((it) => (it.ips_tier ?? 4) === 1)
    return (t1.length >= 3 ? t1 : sorted).slice(0, 3)
  })()

  const isEs = i18n.language.startsWith('es')

  // "Siguiente por revisar" — the next OPEN row (needs_review / pending /
  // reviewing) after the given index on this page. F1: T1 has zero 'pending'
  // rows, so the open-work definition is bucket-based, not status==='pending'.
  const nextOpenAfter = (fromId: number): AriaQueueItem | null => {
    const idx = leadsItems.findIndex((it) => it.vendor_id === fromId)
    for (let i = idx + 1; i < leadsItems.length; i++) {
      const b = bucketStatus(leadsItems[i].review_status)
      if (b === 'por_revisar' || b === 'pendiente') return leadsItems[i]
    }
    return null
  }

  const openDesglose = (vendorId: number) => {
    setExpandedId(vendorId)
    requestAnimationFrame(() => {
      document.getElementById(`aria-row-${vendorId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  const clearAll = () => {
    setPatternFilter(null)
    setTierFilter(null)
    setNewVendorOnly(false)
    setNovelOnly(false)
    setSectorFilter(null)
    setReviewStatusFilter(null)
    setEfosOnly(false)
    setMinYears(null)
    clearSearch()
    setPage(1)
  }

  const activeFilterCount = [
    patternFilter,
    tierFilter != null ? tierFilter : null,
    newVendorOnly || null,
    novelOnly || null,
    sectorFilter != null ? sectorFilter : null,
    reviewStatusFilter,
    efosOnly || null,
    minYears != null ? minYears : null,
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
            {isEs ? 'Lista de Vigilancia' : 'Watchlist'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary leading-snug">
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
            <p className="text-sm sm:text-[15px] text-text-secondary leading-relaxed">
              {/* GT/DISC clause is computed-guarded: "todos anclados" renders only
                  while summary.novel_leads_t1 === 0 (the verified structural truth);
                  the 831 anchor deep-links to the T2 discoveries register. */}
              {isEs ? (
                <>
                  De{' '}
                  <SaldoAnchor color="var(--color-text-primary)">
                    {formatNumber(stats?.queue_total ?? 0)}
                  </SaldoAnchor>{' '}
                  proveedores examinados, el modelo eleva{' '}
                  <SaldoAnchor color="var(--color-risk-critical)">
                    {formatNumber(stats?.latest_run?.tier1_count ?? 0)}
                  </SaldoAnchor>{' '}
                  al Nivel 1{queueSummary && queueSummary.novel_leads_t1 === 0 ? (
                    <span className="text-text-muted"> — todos anclados a casos documentados</span>
                  ) : null}.
                  {queueSummary && queueSummary.novel_leads_t2 > 0 ? (
                    <>
                      {' '}Sus{' '}
                      <button
                        onClick={() => { setTierFilter(2); setNovelOnly(true); setPage(1); document.getElementById('aria-investigation-list')?.scrollIntoView({ behavior: 'smooth' }) }}
                        className="align-baseline hover:opacity-80 transition-opacity"
                        aria-label={`Ver los ${formatNumber(queueSummary.novel_leads_t2)} descubrimientos del modelo en el Nivel 2`}
                      >
                        <SaldoAnchor color="var(--color-accent-data)">
                          {formatNumber(queueSummary.novel_leads_t2)}
                        </SaldoAnchor>
                      </button>{' '}
                      descubrimientos propios esperan en el Nivel 2, en calibración.
                    </>
                  ) : null}{' '}
                  Los niveles altos suman{' '}
                  <SaldoAnchor color="var(--color-risk-high)" small>
                    {formatDualCurrency(stats?.elevated_value_mxn ?? 0)}
                  </SaldoAnchor>{' '}
                  en valor de contratos marcados para revisión.
                </>
              ) : (
                <>
                  Of{' '}
                  <SaldoAnchor color="var(--color-text-primary)">
                    {formatNumber(stats?.queue_total ?? 0)}
                  </SaldoAnchor>{' '}
                  vendors examined, the model elevates{' '}
                  <SaldoAnchor color="var(--color-risk-critical)">
                    {formatNumber(stats?.latest_run?.tier1_count ?? 0)}
                  </SaldoAnchor>{' '}
                  to Tier 1{queueSummary && queueSummary.novel_leads_t1 === 0 ? (
                    <span className="text-text-muted"> — every one anchored to a documented case</span>
                  ) : null}.
                  {queueSummary && queueSummary.novel_leads_t2 > 0 ? (
                    <>
                      {' '}Its own{' '}
                      <button
                        onClick={() => { setTierFilter(2); setNovelOnly(true); setPage(1); document.getElementById('aria-investigation-list')?.scrollIntoView({ behavior: 'smooth' }) }}
                        className="align-baseline hover:opacity-80 transition-opacity"
                        aria-label={`View the ${formatNumber(queueSummary.novel_leads_t2)} model discoveries in Tier 2`}
                      >
                        <SaldoAnchor color="var(--color-accent-data)">
                          {formatNumber(queueSummary.novel_leads_t2)}
                        </SaldoAnchor>
                      </button>{' '}
                      discoveries wait in Tier 2, in calibration.
                    </>
                  ) : null}{' '}
                  The elevated tiers carry{' '}
                  <SaldoAnchor color="var(--color-risk-high)" small>
                    {formatDualCurrency(stats?.elevated_value_mxn ?? 0)}
                  </SaldoAnchor>{' '}
                  in contract value flagged for review.
                </>
              )}
            </p>
          )}
        </section>

        {/* ═══ § EL EMBUDO — the compression band IS the tier navigation ═══ */}
        <FunnelBand
          tierCounts={tierCounts}
          queueTotal={stats?.queue_total ?? 0}
          novelLeadsT2={queueSummary?.novel_leads_t2 ?? null}
          activeTier={tierFilter}
          novelOnly={novelOnly}
          loading={statsLoading}
          isEs={isEs}
          onSelect={(tier, novel) => {
            setTierFilter(tier)
            setNovelOnly(novel)
            setPage(1)
          }}
        />

        {/* ═══ FILTER RAIL — every visible control is server-backed (W5/W10) ═══ */}
        <div className="mb-4 space-y-2">
          {/* ROW 1: Search */}
          <div className="flex flex-wrap items-center gap-1.5">
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

          {/* ROW 2.5: server-backed chips — FILTROS · ALCANCE GLOBAL */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mr-1 shrink-0">
              {isEs ? 'Filtros · alcance global' : 'Filters · global scope'}
            </span>
            <button
              onClick={() => { setReviewStatusFilter(reviewStatusFilter === 'needs_review' ? null : 'needs_review'); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                reviewStatusFilter === 'needs_review'
                  ? 'border-current'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
              style={reviewStatusFilter === 'needs_review' ? { color: '#a06820', backgroundColor: '#a0682014' } : undefined}
              title={isEs ? 'Pendientes de revisión humana (CENTINELA needs_review)' : 'Awaiting human review (CENTINELA needs_review)'}
            >
              {isEs ? 'Por revisar' : 'To review'}
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
                  ? 'bg-accent-data/10 text-accent-data border-accent-data/30'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
              title={t('filters.novelOnlyTooltip')}
            >
              {isEs ? 'Solo descubrimientos' : 'Discoveries only'}
            </button>
            <button
              onClick={() => { setMinYears(minYears === 10 ? null : 10); setPage(1) }}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors',
                minYears === 10
                  ? 'bg-background-elevated text-text-primary border-border'
                  : 'bg-background-card text-text-secondary border-border hover:border-border'
              )}
              title={isEs ? 'Proveedores con 10+ años de actividad (filtro del servidor)' : 'Vendors with 10+ years active (server filter)'}
            >
              {isEs ? 'Histórico 10+' : 'Long-running 10+'}
            </button>
            <button
              onClick={() => setMoreFiltersOpen((v) => !v)}
              className={cn(
                'ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-[0.12em] transition-colors shrink-0',
                moreFiltersOpen ? 'bg-background-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'
              )}
              aria-expanded={moreFiltersOpen}
              aria-label={isEs ? 'Más filtros' : 'More filters'}
            >
              {moreFiltersOpen ? '−' : '+'} {isEs ? 'Más filtros' : 'More filters'}
            </button>
          </div>

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
              {efosOnly && (
                <FilterChip onClear={() => { setEfosOnly(false); setPage(1) }} accent="var(--color-risk-critical)">
                  EFOS only
                </FilterChip>
              )}
              {minYears != null && (
                <FilterChip onClear={() => { setMinYears(null); setPage(1) }}>
                  {isEs ? `Histórico ${minYears}+` : `Long-running ${minYears}+`}
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
                  {reviewStatusFilter === 'needs_review'
                    ? (isEs ? 'Por revisar' : 'To review')
                    : t(`status.${reviewStatusFilter}`)}
                </FilterChip>
              )}
              {search && (
                <FilterChip onClear={() => { clearSearch(); setPage(1) }}>
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

          {/* § EL REGISTRO header — disposition strip (honest buckets, F2),
              MESETA rug, tier invariant, key line, export. The client sort
              chips are deleted, not demoted: the only order this page shows
              is the server's ips_final DESC, and the header says so. */}
          <QueueRegisterHeader
            isEs={isEs}
            totalLeads={totalLeads}
            tierFilter={tierFilter}
            novelOnly={novelOnly}
            t1StatusCounts={stats?.t1_status_counts ?? null}
            runDateline={stats?.latest_run?.completed_at ?? stats?.latest_run?.started_at ?? null}
            ipsValues={leadsItems.map((it) => it.ips_final ?? 0).filter((v) => v > 0)}
            novelLeadsT2={queueSummary?.novel_leads_t2 ?? null}
            tier1Count={stats?.latest_run?.tier1_count ?? 0}
            tier4Count={stats?.latest_run?.tier4_count ?? 0}
            onGoT2Disc={() => { setTierFilter(2); setNovelOnly(true); setPage(1) }}
            onFilterNeedsReview={() => { setReviewStatusFilter('needs_review'); setPage(1) }}
            exportData={leadsItems as unknown as Record<string, unknown>[]}
          />

          {leadsLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-sm" />
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
            <div className="border-t border-border">
              {leadsItems.map((item, idx) => {
                const isOpen = expandedId === item.vendor_id
                const next = isOpen ? nextOpenAfter(item.vendor_id) : null
                return (
                  <div key={item.vendor_id} id={`aria-row-${item.vendor_id}`}>
                    <RegisterRow
                      item={item}
                      isEs={isEs}
                      rank={(page - 1) * PER_PAGE + idx + 1}
                      expanded={isOpen}
                      onToggle={() => setExpandedId(isOpen ? null : item.vendor_id)}
                    />
                    {isOpen && (
                      <RowExpand
                        item={item}
                        isEs={isEs}
                        onClose={() => setExpandedId(null)}
                        onNext={next ? () => openDesglose(next.vendor_id) : null}
                      />
                    )}
                  </div>
                )
              })}
            </div>
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

        {/* (Badge legend retired — its content lives in the register header's
            key line, 0px from the marks it explains.) */}

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
                {isEs ? 'Encabezan la lista' : 'Leading the watchlist'}
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
                {/* W9 — documented IPS-scale decision (designus aria-cola panel):
                    IPS is a priority ordering, not a risk scale; it carries no color. */}
                <p className="text-text-muted">
                  {isEs
                    ? 'El IPS ordena la cola; no es una escala de riesgo y no se colorea. En el registro, el color del riel codifica la disposición del análisis — no la magnitud.'
                    : 'IPS orders the queue; it is not a risk scale and carries no color. In the register, the rail color encodes the analyst disposition — not magnitude.'}
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
