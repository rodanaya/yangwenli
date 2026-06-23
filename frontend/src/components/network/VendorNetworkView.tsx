/**
 * VendorNetworkView — vendor-focused network drill-down for /network?vendor=N.
 *
 * Two-view tabbed surface (URL-synced via ?view=institutions|cobidders):
 *
 *   View 1 · Institutional Contracts — ranked-bar matrix with INLINE
 *     CONTRACT BREAKDOWN. Each row is an institution: bar=log(value),
 *     risk dot cluster, tenure span. Click a row to expand inline and
 *     see the actual contracts behind that vendor-institution pair
 *     (titles, dates, amounts, direct-award flag, risk score). No
 *     redirect away from the page.
 *
 *   View 2 · Co-bidding Map — role-grouped ranked list. Co-bidders are
 *     grouped under role headers (Possible Decoys / Rotation Pattern /
 *     Possible Accomplices / Co-bidder). Bar=log(co_bid_count), win
 *     ratio shown inline. Same row idiom as View 1, but grouped by
 *     category instead of sorted by metric — keeps the two views
 *     structurally distinct without forcing a different visual language.
 *
 * Both views run full-width. No more radial geometry — radial layouts
 * don't degrade gracefully when the data is unbalanced (most vendors
 * have one dominant role tier; arc-based layout crammed 28 nodes onto
 * one arc and left two arcs empty).
 */

import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, GitBranch, Building2, Users, ChevronDown, ChevronRight, ExternalLink, Gavel, Zap } from 'lucide-react'
import { vendorApi, networkApi } from '@/api/client'
import type { VendorInstitutionItem, CoBidderItem, ContractListItem } from '@/api/types'
import { cn, formatCompactMXN, formatCompactUSDByYear, formatNumber, getRiskLevel } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

type ViewKey = 'institutions' | 'cobidders'
type InstSortKey = 'value' | 'risk' | 'contracts'
type RoleTier = 'accomplice' | 'rotation' | 'decoy' | 'cobidder'

function classifyRoleTier(cb: { win_count: number; co_bid_count: number }): RoleTier {
  const winRate = cb.co_bid_count > 0 ? cb.win_count / cb.co_bid_count : 0
  if (winRate < 0.15) return 'decoy'
  if (winRate > 0.6) return 'accomplice'
  if (winRate >= 0.3 && winRate <= 0.7) return 'rotation'
  return 'cobidder'
}

const ROLE_COLOR: Record<RoleTier, string> = {
  accomplice: 'var(--color-risk-medium)',
  rotation:   'var(--color-risk-high)',
  decoy:      'var(--color-risk-critical)',
  cobidder:   'var(--color-text-muted)',
}

const ROLE_ORDER: RoleTier[] = ['decoy', 'rotation', 'accomplice', 'cobidder']

function roleLabel(tier: RoleTier, t: (k: string) => string): string {
  switch (tier) {
    case 'accomplice': return t('roles.possibleAccomplice')
    case 'rotation':   return t('roles.rotationPattern')
    case 'decoy':      return t('roles.possibleDecoy')
    case 'cobidder':   return t('roles.coBidder')
  }
}

function roleHint(tier: RoleTier, isEs: boolean): string {
  switch (tier) {
    case 'accomplice': return isEs ? 'tasa éxito > 60%' : 'win rate > 60%'
    case 'rotation':   return isEs ? 'tasa éxito 30–70%' : 'win rate 30–70%'
    case 'decoy':      return isEs ? 'tasa éxito < 15%' : 'win rate < 15%'
    case 'cobidder':   return isEs ? 'sin patrón claro' : 'no clear pattern'
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function VendorNetworkView({ vendorId }: { vendorId: number }) {
  const { t, i18n } = useTranslation('redThread')
  const isEs = i18n.language.startsWith('es')

  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = (searchParams.get('view') as ViewKey | null) ?? 'institutions'
  const view: ViewKey = viewParam === 'cobidders' ? 'cobidders' : 'institutions'

  const setView = (next: ViewKey) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  // ── La Trama ladder (Phase B) — shareable trail in the URL ─────────────
  // /network?vendor=A&comm=N&trail=X,Y records the reader's hop history so
  // a colleague opening the link lands at the exact investigative position.
  const commParam = searchParams.get('comm')
  const trailIds = useMemo(() => {
    const raw = searchParams.get('trail')
    if (!raw) return [] as number[]
    return raw
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(-10)
  }, [searchParams])

  /** Hop to a co-bidder's ring, appending the current vendor to the trail. */
  const buildHopTo = (nextVendorId: number) => {
    const params = new URLSearchParams()
    if (commParam) params.set('comm', commParam)
    params.set('vendor', String(nextVendorId))
    params.set('trail', [...trailIds, vendorId].slice(-10).join(','))
    return `/network?${params.toString()}`
  }

  /** Rewind one hop (pop the trail). */
  const prevHopTo = useMemo(() => {
    if (trailIds.length === 0) return null
    const params = new URLSearchParams()
    if (commParam) params.set('comm', commParam)
    params.set('vendor', String(trailIds[trailIds.length - 1]))
    const rest = trailIds.slice(0, -1)
    if (rest.length) params.set('trail', rest.join(','))
    return `/network?${params.toString()}`
  }, [trailIds, commParam])

  const [linkCopied, setLinkCopied] = useState(false)
  const copyTrailLink = () => {
    try {
      void navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  const [instSort, setInstSort] = useState<InstSortKey>('value')

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    staleTime: 5 * 60_000,
  })

  const { data: coBidders } = useQuery({
    queryKey: ['vendor-co-bidders-full', vendorId],
    queryFn: () => networkApi.getCoBidders(vendorId, 1, 30),
    staleTime: 5 * 60_000,
  })

  const { data: institutions } = useQuery({
    queryKey: ['vendor-institutions-full', vendorId],
    queryFn: () => vendorApi.getInstitutions(vendorId, 50),
    staleTime: 5 * 60_000,
  })

  const vendorName = vendor?.name ?? `Vendor #${vendorId}`
  const sectorName = vendor?.primary_sector_name ?? null
  const sectorColor = sectorName
    ? SECTOR_COLORS[sectorName.toLowerCase()] ?? 'var(--color-accent)'
    : 'var(--color-accent)'
  const coBiddersList: CoBidderItem[] = coBidders?.co_bidders ?? []
  const institutionsList: VendorInstitutionItem[] = institutions?.data ?? []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5">
          {/* Breadcrumb ladder: Índice › C-NNN › (rewind hop) › current */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <nav
              className="flex items-center gap-1.5 min-w-0 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted"
              aria-label={isEs ? 'Ruta de investigación' : 'Investigation trail'}
            >
              <Link
                to="/network"
                className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors shrink-0"
              >
                <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                {isEs ? 'Índice' : 'Index'}
              </Link>
              {commParam && (
                <>
                  <span className="opacity-40 shrink-0">›</span>
                  <Link
                    to={`/network?comm=${commParam}`}
                    className="hover:text-text-primary transition-colors shrink-0"
                  >
                    C-{commParam}
                  </Link>
                </>
              )}
              {prevHopTo && (
                <>
                  <span className="opacity-40 shrink-0">›</span>
                  <Link to={prevHopTo} className="hover:text-text-primary transition-colors shrink-0">
                    {isEs ? `‹ salto ${trailIds.length}` : `‹ hop ${trailIds.length}`}
                  </Link>
                </>
              )}
              <span className="opacity-40 shrink-0">›</span>
              <span className="text-text-primary truncate" title={vendorName}>
                {vendorName}
              </span>
            </nav>
            <button
              type="button"
              onClick={copyTrailLink}
              className="shrink-0 rounded-sm border border-border px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary hover:bg-border/20 transition-colors"
            >
              {linkCopied ? (isEs ? 'Copiado ✓' : 'Copied ✓') : isEs ? 'Copiar enlace' : 'Copy link'}
            </button>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {isEs ? '§ RED DEL PROVEEDOR' : '§ VENDOR NETWORK'}
            </span>
            {sectorName && (
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">
                · {sectorName}
              </span>
            )}
          </div>

          {vendorLoading ? (
            <Skeleton className="h-7 w-64" />
          ) : (
            <h1
              className="font-serif font-bold text-text-primary leading-tight mb-4"
              style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'clamp(1.4rem, 2.4vw, 1.875rem)' }}
              title={vendorName}
            >
              {vendorName}
            </h1>
          )}

          {vendor && (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
              <StatChip value={formatNumber(coBiddersList.length || 0)} label={isEs ? 'co-licitantes' : 'co-bidders'} />
              <StatChip value={formatNumber(vendor.total_institutions ?? 0)} label={isEs ? 'instituciones' : 'institutions'} />
              <StatChip value={formatNumber(vendor.sectors_count ?? 0)} label={isEs ? 'sectores' : 'sectors'} />
              <StatChip
                value={formatCompactMXN(vendor.total_value_mxn ?? 0)}
                secondary={`≈ ${formatCompactUSDByYear(vendor.total_value_mxn ?? 0)}`}
                label={isEs ? 'valor total' : 'total value'}
              />
              <Link
                to={`/vendors/${vendorId}`}
                className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-secondary hover:text-text-primary transition-colors border border-border rounded-sm px-3 py-1.5"
              >
                <GitBranch className="w-3 h-3" aria-hidden="true" />
                {isEs ? 'Dossier del proveedor' : 'Vendor dossier'}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* View toggle */}
        <div className="flex items-stretch border-b border-border mb-6" role="tablist">
          <ViewTab
            active={view === 'institutions'}
            onClick={() => setView('institutions')}
            icon={Building2}
            label={isEs ? 'Contratos institucionales' : 'Institutional Contracts'}
            count={institutionsList.length}
          />
          <ViewTab
            active={view === 'cobidders'}
            onClick={() => setView('cobidders')}
            icon={Users}
            label={isEs ? 'Mapa de co-licitación' : 'Co-bidding Map'}
            count={coBiddersList.length}
          />
        </div>

        {view === 'institutions' && (
          <InstitutionsView
            vendorId={vendorId}
            institutions={institutionsList}
            sort={instSort}
            onSortChange={setInstSort}
            sectorColor={sectorColor}
            isEs={isEs}
          />
        )}

        {view === 'cobidders' && (
          <CoBiddersView
            coBidders={coBiddersList}
            t={t}
            isEs={isEs}
            buildHopTo={buildHopTo}
          />
        )}
      </main>
    </div>
  )
}

// ─── View 1 · Institutional Contracts ───────────────────────────────────────

function InstitutionsView({
  vendorId,
  institutions,
  sort,
  onSortChange,
  sectorColor,
  isEs,
}: {
  vendorId: number
  institutions: VendorInstitutionItem[]
  sort: InstSortKey
  onSortChange: (s: InstSortKey) => void
  sectorColor: string
  isEs: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const sorted = useMemo(() => {
    const arr = [...institutions]
    if (sort === 'value') arr.sort((a, b) => (b.total_value_mxn ?? 0) - (a.total_value_mxn ?? 0))
    else if (sort === 'risk') arr.sort((a, b) => (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
    else arr.sort((a, b) => (b.contract_count ?? 0) - (a.contract_count ?? 0))
    return arr
  }, [institutions, sort])

  const maxValue = useMemo(
    () => Math.max(1, ...sorted.map((i) => i.total_value_mxn ?? 0)),
    [sorted]
  )
  const totalValue = useMemo(
    () => sorted.reduce((acc, i) => acc + (i.total_value_mxn ?? 0), 0),
    [sorted]
  )

  // Shared year axis across all institution rows. Each row's timeline ribbon
  // is positioned on this axis (band span = first_year → last_year).
  const yearAxis = useMemo(() => {
    let min = Infinity, max = -Infinity
    for (const inst of sorted) {
      if (inst.first_year != null && inst.first_year < min) min = inst.first_year
      if (inst.last_year != null && inst.last_year > max) max = inst.last_year
    }
    if (!Number.isFinite(min)) min = new Date().getFullYear() - 10
    if (!Number.isFinite(max)) max = new Date().getFullYear()
    if (max - min < 2) max = min + 2
    // Pick 4–5 tick years evenly distributed
    const span = max - min
    const tickCount = Math.min(5, Math.max(3, span + 1))
    const ticks: number[] = []
    for (let i = 0; i < tickCount; i++) {
      ticks.push(Math.round(min + (span * i) / (tickCount - 1)))
    }
    return { min, max, span, ticks: Array.from(new Set(ticks)) }
  }, [sorted])

  if (sorted.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-background-card p-8 text-center text-xs font-mono text-text-muted">
        {isEs ? 'Sin contratos institucionales registrados.' : 'No institutional contracts recorded.'}
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent)]">
            {isEs ? '§ DÓNDE FLUYÓ EL DINERO' : '§ WHERE THE MONEY FLOWED'}
          </h2>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {isEs
              ? 'Cada institución compradora ocupa una franja en el eje temporal compartido. La franja abarca de su primer a su último contrato; grosor = valor, color = riesgo. Clic en una fila para ver los contratos.'
              : 'Each buying institution occupies a band on the shared time axis. The band spans first → last contract; thickness = value, color = risk. Click any row to expand contracts.'}
          </p>
        </div>
        <div className="flex items-baseline gap-3 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
          <span>{isEs ? 'Ordenar por:' : 'Sort by:'}</span>
          <SortPill active={sort === 'value'} onClick={() => onSortChange('value')}>
            {isEs ? 'Valor' : 'Value'}
          </SortPill>
          <SortPill active={sort === 'risk'} onClick={() => onSortChange('risk')}>
            {isEs ? 'Riesgo' : 'Risk'}
          </SortPill>
          <SortPill active={sort === 'contracts'} onClick={() => onSortChange('contracts')}>
            {isEs ? 'Contratos' : 'Contracts'}
          </SortPill>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background-card divide-y divide-border/60">
        {/* Shared timeline axis header */}
        <div className="px-4 py-2 bg-background-elevated/30">
          <div className="grid grid-cols-[1.6rem_1fr_auto] gap-x-3 items-center">
            <span />
            <div className="relative h-3.5 text-[9px] font-mono text-text-muted">
              {yearAxis.ticks.map((y) => {
                const pct = yearAxis.span > 0 ? ((y - yearAxis.min) / yearAxis.span) * 100 : 50
                const align: 'start' | 'middle' | 'end' =
                  pct < 8 ? 'start' : pct > 92 ? 'end' : 'middle'
                return (
                  <span
                    key={y}
                    className="absolute top-0 tabular-nums whitespace-nowrap"
                    style={{
                      left: align === 'start' ? '0%' : align === 'end' ? undefined : `${pct}%`,
                      right: align === 'end' ? '0%' : undefined,
                      transform: align === 'middle' ? 'translateX(-50%)' : undefined,
                    }}
                  >
                    {y}
                  </span>
                )
              })}
            </div>
            <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted whitespace-nowrap">
              {isEs ? 'MXN · riesgo · contratos · %' : 'MXN · risk · contracts · %'}
            </span>
          </div>
        </div>
        {sorted.map((inst) => (
          <InstitutionRow
            key={inst.institution_id}
            vendorId={vendorId}
            inst={inst}
            maxValue={maxValue}
            totalValue={totalValue}
            yearAxis={yearAxis}
            sectorColor={sectorColor}
            isEs={isEs}
            expanded={expandedId === inst.institution_id}
            onToggle={() => setExpandedId(expandedId === inst.institution_id ? null : inst.institution_id)}
          />
        ))}
      </div>
    </section>
  )
}

function InstitutionRow({
  vendorId,
  inst,
  maxValue,
  totalValue,
  yearAxis,
  sectorColor,
  isEs,
  expanded,
  onToggle,
}: {
  vendorId: number
  inst: VendorInstitutionItem
  maxValue: number
  totalValue: number
  yearAxis: { min: number; max: number; span: number; ticks: number[] }
  sectorColor: string
  isEs: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const risk = inst.avg_risk_score ?? 0
  const riskLevel = getRiskLevel(risk)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const value = inst.total_value_mxn ?? 0
  const valueShare = totalValue > 0 ? (value / totalValue) * 100 : 0
  const yearRange = inst.first_year && inst.last_year
    ? inst.first_year === inst.last_year ? String(inst.first_year) : `${inst.first_year}–${inst.last_year}`
    : '—'
  const riskDotCount = riskLevel === 'critical' ? 3 : riskLevel === 'high' ? 2 : riskLevel === 'medium' ? 1 : 0

  // Timeline ribbon position on the shared axis
  const startYear = inst.first_year ?? yearAxis.min
  const endYear = inst.last_year ?? startYear
  const span = yearAxis.span || 1
  const startPctRaw = ((startYear - yearAxis.min) / span) * 100
  const endPctRaw = ((endYear - yearAxis.min) / span) * 100
  // Add one-year width even for single-year institutions so the band is visible
  const yearStepPct = (1 / (span + 1)) * 100
  const startPct = Math.max(0, Math.min(100, startPctRaw))
  const endPct = Math.max(startPct, Math.min(100, endPctRaw + yearStepPct))
  const widthPct = Math.max(1.5, endPct - startPct)
  // Band thickness encodes log(value): 3px (small) → 12px (largest)
  const bandHeight = 3 + (Math.log(value + 1) / Math.log(maxValue + 1)) * 9

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-background-elevated/40 transition-colors group focus:outline-none focus-visible:bg-background-elevated/60"
        aria-expanded={expanded}
        aria-controls={`inst-${inst.institution_id}-detail`}
      >
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 items-baseline mb-2">
          <span className="inline-flex items-center justify-center w-4 h-4 text-text-muted self-center mt-0.5" aria-hidden="true">
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
          </span>
          <span className="text-sm text-text-primary group-hover:text-accent transition-colors leading-snug break-words">
            {inst.institution_name}
          </span>
          <span className="text-right whitespace-nowrap">
            <span className="font-mono tabular-nums text-sm font-bold text-text-primary block">
              {formatCompactMXN(value)}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-text-muted block">
              ≈ {formatCompactUSDByYear(value)}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-[1.6rem_1fr_auto] gap-x-3 items-center">
          <span></span>
          {/* Timeline ribbon — band spans first→last year on the shared axis */}
          <div className="relative h-4 rounded-sm" title={`${yearRange} · ${formatCompactMXN(value)} · ${Math.round(risk * 100)}% avg risk`}>
            {/* Axis track (subtle horizontal rule) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border/40" aria-hidden="true" />
            {/* Tick marks at axis years */}
            {yearAxis.ticks.map((y) => {
              const pct = yearAxis.span > 0 ? ((y - yearAxis.min) / yearAxis.span) * 100 : 50
              return (
                <span
                  key={y}
                  className="absolute top-0 bottom-0 w-px bg-border/30"
                  style={{ left: `${pct}%` }}
                  aria-hidden="true"
                />
              )
            })}
            {/* The band itself */}
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-sm transition-all"
              style={{
                left: `${startPct}%`,
                width: `${widthPct}%`,
                height: `${bandHeight}px`,
                backgroundColor: riskColor,
                opacity: riskLevel === 'low' ? 0.55 : 0.88,
              }}
            />
          </div>
          {/* Meta — year range removed (timeline ribbon shows tenure now) */}
          <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-text-muted whitespace-nowrap">
            <span className="inline-flex items-center gap-0.5" aria-label={`${riskLevel} risk`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    backgroundColor: i < riskDotCount ? riskColor : 'transparent',
                    border: i < riskDotCount ? 'none' : '1px solid var(--color-border-hover)',
                  }}
                />
              ))}
            </span>
            <span style={{ color: riskColor }}>{Math.round(risk * 100)}%</span>
            <span className="text-text-muted/60">·</span>
            <span>{formatNumber(inst.contract_count ?? 0)} {isEs ? 'contr.' : 'contr.'}</span>
            <span className="text-text-muted/60">·</span>
            <span className="text-text-secondary">{valueShare.toFixed(1)}%</span>
          </div>
        </div>
        <div
          className="h-px mt-2 transition-opacity"
          style={{ backgroundColor: sectorColor, opacity: expanded ? 0.5 : 0 }}
        />
      </button>

      {expanded && (
        <InstitutionContractsBreakdown
          id={`inst-${inst.institution_id}-detail`}
          vendorId={vendorId}
          institutionId={inst.institution_id}
          institutionName={inst.institution_name}
          isEs={isEs}
          accentColor={sectorColor}
        />
      )}
    </div>
  )
}

// ─── Inline contracts breakdown (expanded under each institution row) ───────

function InstitutionContractsBreakdown({
  id,
  vendorId,
  institutionId,
  institutionName,
  isEs,
  accentColor,
}: {
  id: string
  vendorId: number
  institutionId: number
  institutionName: string
  isEs: boolean
  accentColor: string
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-institution-contracts', vendorId, institutionId],
    queryFn: () => vendorApi.getContracts(vendorId, {
      institution_id: institutionId,
      per_page: 12,
      sort_by: 'amount_mxn',
      sort_order: 'desc',
    }),
    staleTime: 5 * 60_000,
  })

  const contracts: ContractListItem[] = data?.data ?? []
  const total = data?.pagination?.total ?? 0
  const directAwardCount = contracts.filter((c) => c.is_direct_award).length
  const directAwardPct = contracts.length > 0 ? (directAwardCount / contracts.length) * 100 : 0
  const singleBidCount = contracts.filter((c) => c.is_single_bid).length

  return (
    <div
      id={id}
      className="px-4 py-3 bg-background-elevated/30 border-l-2"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
          {isEs ? '§ DESGLOSE DE CONTRATOS' : '§ CONTRACTS BREAKDOWN'}
        </h3>
        <Link
          to={`/institutions/${institutionId}`}
          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors"
        >
          {isEs ? 'Ver institución' : 'View institution'}
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <SmallStat label={isEs ? 'Mostrando' : 'Showing'} value={`${contracts.length} / ${formatNumber(total)}`} />
        <SmallStat label={isEs ? 'Adj. directa' : 'Direct award'} value={`${Math.round(directAwardPct)}%`} icon={Zap} />
        <SmallStat label={isEs ? 'Oferta única' : 'Single bid'} value={formatNumber(singleBidCount)} icon={Gavel} />
        <SmallStat
          label={isEs ? 'Top contrato' : 'Top contract'}
          value={contracts[0] ? formatCompactMXN(contracts[0].amount_mxn) : '—'}
          secondary={contracts[0] ? `≈ ${formatCompactUSDByYear(contracts[0].amount_mxn, contracts[0].contract_year)}` : undefined}
        />
      </div>

      {/* Contracts list */}
      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : contracts.length === 0 ? (
        <p className="text-xs text-text-secondary">
          {isEs ? 'Sin contratos disponibles.' : 'No contracts available.'}
        </p>
      ) : (
        <ul className="space-y-1" role="list" aria-label={`Contracts at ${institutionName}`}>
          {contracts.map((c) => {
            const cRisk = c.risk_score ?? 0
            const cRiskColor = RISK_DOT_COLORS[getRiskLevel(cRisk)]
            const dateStr = c.contract_date
              ? new Date(c.contract_date).toISOString().slice(0, 10)
              : c.contract_year ? String(c.contract_year) : '—'
            return (
              <li key={c.id}>
                <Link
                  to={`/contracts/${c.id}`}
                  className="grid grid-cols-[1fr_auto] gap-x-3 items-baseline py-1.5 px-2 rounded-sm hover:bg-background-card/60 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-text-primary group-hover:text-accent transition-colors leading-snug">
                      {c.title || c.contract_number || `Contract #${c.id}`}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-text-muted">
                      <span>{dateStr}</span>
                      {c.is_direct_award && (
                        <>
                          <span className="text-text-muted/40">·</span>
                          <span className="inline-flex items-center gap-0.5 text-[var(--color-risk-medium)]">
                            <Zap className="w-2.5 h-2.5" aria-hidden="true" />
                            {isEs ? 'Adj. directa' : 'Direct award'}
                          </span>
                        </>
                      )}
                      {c.is_single_bid && (
                        <>
                          <span className="text-text-muted/40">·</span>
                          <span className="text-[var(--color-risk-high)]">
                            {isEs ? 'Oferta única' : 'Single bid'}
                          </span>
                        </>
                      )}
                      {c.procedure_type && (
                        <>
                          <span className="text-text-muted/40">·</span>
                          <span>{c.procedure_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-mono tabular-nums text-xs font-bold text-text-primary">
                      {formatCompactMXN(c.amount_mxn)}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums text-text-muted">
                      ≈ {formatCompactUSDByYear(c.amount_mxn, c.contract_year)}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums" style={{ color: cRiskColor }}>
                      {Math.round(cRisk * 100)}% {isEs ? 'riesgo' : 'risk'}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {total > contracts.length && (
        <p className="mt-3 text-[10px] font-mono text-text-muted">
          {isEs
            ? `+ ${formatNumber(total - contracts.length)} contratos más en el perfil de la institución.`
            : `+ ${formatNumber(total - contracts.length)} more contracts on the institution profile.`}
        </p>
      )}
    </div>
  )
}

// ─── View 2 · Co-bidding Map (role-grouped ranked list) ─────────────────────

function CoBiddersView({
  coBidders,
  t,
  isEs,
  buildHopTo,
}: {
  coBidders: CoBidderItem[]
  t: (k: string) => string
  isEs: boolean
  buildHopTo: (vendorId: number) => string
}) {
  const byTier = useMemo(() => {
    const buckets: Record<RoleTier, CoBidderItem[]> = {
      accomplice: [], rotation: [], decoy: [], cobidder: [],
    }
    for (const cb of coBidders) {
      buckets[classifyRoleTier(cb)].push(cb)
    }
    for (const k of Object.keys(buckets) as RoleTier[]) {
      buckets[k].sort((a, b) => b.co_bid_count - a.co_bid_count)
    }
    return buckets
  }, [coBidders])

  const maxCoBids = Math.max(1, ...coBidders.map((c) => c.co_bid_count))

  if (coBidders.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-background-card p-8 text-center text-xs font-mono text-text-muted">
        {isEs
          ? 'Sin co-licitantes registrados — todas las adjudicaciones fueron directas o sin oferentes concurrentes.'
          : 'No co-bidders recorded — all awards were direct or had no concurrent bidders.'}
      </div>
    )
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {isEs ? '§ QUIÉN LICITÓ JUNTO AL PROVEEDOR' : '§ WHO BID ALONGSIDE'}
        </h2>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {isEs
            ? 'Co-licitantes agrupados por rol detectado. La tasa de éxito (victorias ÷ apariciones) determina la clasificación: señuelos pierden casi siempre, cómplices ganan casi siempre, rotación alterna.'
            : 'Co-bidders grouped by detected role. Win rate (wins ÷ appearances) drives the classification: decoys lose almost always, accomplices win almost always, rotation alternates.'}
        </p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ROLE_ORDER.map((tier) => (
          <RoleSummaryCard
            key={tier}
            tier={tier}
            count={byTier[tier].length}
            label={roleLabel(tier, t)}
            hint={roleHint(tier, isEs)}
          />
        ))}
      </div>

      {/* Grouped list */}
      <div className="space-y-6">
        {ROLE_ORDER.map((tier) => {
          const items = byTier[tier]
          if (items.length === 0) return null
          const color = ROLE_COLOR[tier]
          return (
            <div key={tier}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color }}>
                  {roleLabel(tier, t)}
                </h3>
                <span className="text-[10px] font-mono tabular-nums text-text-muted">
                  {items.length}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  ── {roleHint(tier, isEs)} ──
                </span>
              </div>
              <div className="rounded-sm border border-border bg-background-card divide-y divide-border/60">
                {items.map((cb) => (
                  <CoBidderRow
                    key={cb.vendor_id}
                    cb={cb}
                    maxCoBids={maxCoBids}
                    color={color}
                    isEs={isEs}
                    hopTo={buildHopTo(cb.vendor_id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CoBidderRow({
  cb,
  maxCoBids,
  color,
  isEs,
  hopTo,
}: {
  cb: CoBidderItem
  maxCoBids: number
  color: string
  isEs: boolean
  hopTo: string
}) {
  const winRate = cb.co_bid_count > 0 ? cb.win_count / cb.co_bid_count : 0
  const barPct = Math.max(2, (Math.log(cb.co_bid_count + 1) / Math.log(maxCoBids + 1)) * 100)

  return (
    // Row click HOPS within the mesh (trail appended); the corner icon
    // escapes to the vendor dossier. Sibling links — never nested <a>.
    <div className="relative">
      <Link
        to={hopTo}
        title={isEs ? 'Saltar a su red de co-licitación' : 'Hop to its co-bidding ring'}
        className="block px-4 py-2.5 pr-10 hover:bg-background-elevated/40 transition-colors group"
      >
      <div className="grid grid-cols-[1fr_auto] gap-x-3 items-baseline mb-1.5">
        <span className="text-sm text-text-primary group-hover:text-accent transition-colors leading-snug break-words">
          {cb.vendor_name}
        </span>
        <span className="font-mono tabular-nums text-sm font-bold text-text-primary whitespace-nowrap">
          {formatNumber(cb.co_bid_count)} <span className="text-[10px] font-normal text-text-muted">co-bids</span>
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-3 items-center">
        <div className="relative h-2 rounded-sm bg-background-elevated/60 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-sm transition-all"
            style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.82 }}
          />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-text-muted whitespace-nowrap">
          <span>{cb.win_count}/{cb.co_bid_count} {isEs ? 'ganados' : 'wins'}</span>
          <span className="text-text-muted/60">·</span>
          <span style={{ color }}>{Math.round(winRate * 100)}% {isEs ? 'éxito' : 'win rate'}</span>
          {cb.same_winner_ratio != null && (
            <>
              <span className="text-text-muted/60">·</span>
              <span>{Math.round(cb.same_winner_ratio * 100)}% same-winner</span>
            </>
          )}
        </div>
      </div>
      </Link>
      <Link
        to={`/vendors/${cb.vendor_id}`}
        aria-label={isEs ? `Abrir dossier de ${cb.vendor_name}` : `Open dossier for ${cb.vendor_name}`}
        title={isEs ? 'Dossier del proveedor' : 'Vendor dossier'}
        className="absolute right-2.5 top-2.5 p-1 rounded-sm text-text-muted/50 hover:text-text-primary hover:bg-border/30 transition-colors"
      >
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
      </Link>
    </div>
  )
}

// ─── Local sub-components ────────────────────────────────────────────────────

function ViewTab({
  active, onClick, icon: Icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-[0.12em] border-b-2 transition-colors -mb-px',
        active
          ? 'border-[var(--color-accent)] text-text-primary'
          : 'border-transparent text-text-muted hover:text-text-secondary'
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
      <span className="text-text-muted tabular-nums">{count}</span>
    </button>
  )
}

function StatChip({ value, label, secondary }: { value: string; label: string; secondary?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono font-bold tabular-nums text-text-primary text-base">{value}</span>
      {secondary && (
        <span className="text-[10px] font-mono tabular-nums text-text-muted">{secondary}</span>
      )}
      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">{label}</span>
    </div>
  )
}

function SortPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm border transition-colors',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
          : 'border-border text-text-secondary hover:text-text-primary'
      )}
    >
      {children}
    </button>
  )
}

function RoleSummaryCard({
  tier, count, label, hint,
}: {
  tier: RoleTier
  count: number
  label: string
  hint: string
}) {
  const color = ROLE_COLOR[tier]
  return (
    <div className="rounded-sm border border-border p-3 bg-background-card">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="font-mono font-bold tabular-nums text-2xl text-text-primary leading-tight">
        {count}
      </div>
      <div className="text-[10px] font-mono text-text-muted mt-0.5">
        {hint}
      </div>
    </div>
  )
}

function SmallStat({
  label, value, secondary, icon: Icon,
}: {
  label: string
  value: string
  secondary?: string
  icon?: React.ElementType
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted">
        {Icon && <Icon className="w-2.5 h-2.5" aria-hidden="true" />}
        {label}
      </div>
      <div className="font-mono tabular-nums text-sm font-bold text-text-primary mt-0.5">
        {value}
      </div>
      {secondary && (
        <div className="font-mono tabular-nums text-[10px] text-text-muted">
          {secondary}
        </div>
      )}
    </div>
  )
}
