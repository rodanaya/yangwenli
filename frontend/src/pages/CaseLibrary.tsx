import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useQueryState, parseAsStringEnum } from 'nuqs'
import { useUrlSearch } from '@/hooks'
import { caseLibraryApi } from '@/api/client'
import type {
  ScandalListItem,
  FraudType,
  Administration,
  LegalStatus,
  CaseLibraryParams,
} from '@/api/types'
import { TableExportButton } from '@/components/TableExportButton'
import { formatCompactMXN } from '@/lib/utils'
import { AlertCircle, Search, X, ArrowRight, ChevronRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Art direction
// ─────────────────────────────────────────────────────────────────────────────

// Bible §2: page ground = #faf9f6 cream; card = #ffffff white; border = #e2ddd6
const PAGE_BG = 'var(--color-background)'
const CARD_BG = 'var(--color-background-card)'
const BORDER = 'var(--color-border)'
const BORDER_STRONG = 'var(--color-border-hover)'

const FRAUD_TYPE_LEFT: Record<string, string> = {
  ghost_company: '#ef4444',
  bid_rigging: '#a78bfa',
  overpricing: '#fb923c',
  conflict_of_interest: '#c084fc',
  embezzlement: '#f59e0b',
  bribery: '#fb7185',
  procurement_fraud: '#facc15',
  monopoly: '#60a5fa',
  emergency_fraud: '#22d3ee',
  tender_rigging: '#818cf8',
  other: '#64748b',
}

const LEGAL_STATUS_STYLE: Record<
  string,
  { dot: string; label: string; text: string }
> = {
  impunity: { dot: '#ef4444', label: 'IMPUNITY', text: '#fca5a5' },
  investigation: { dot: '#f59e0b', label: 'UNDER INVESTIGATION', text: '#fcd34d' },
  prosecuted: { dot: '#3b82f6', label: 'PROSECUTED', text: '#93c5fd' },
  convicted: { dot: '#22d3ee', label: 'CONVICTED', text: '#67e8f9' },
  acquitted: { dot: 'var(--color-text-muted)', label: 'ACQUITTED', text: 'var(--color-text-muted)' },
  dismissed: { dot: 'var(--color-text-muted)', label: 'DISMISSED', text: 'var(--color-text-muted)' },
  unresolved: { dot: 'var(--color-text-muted)', label: 'UNRESOLVED', text: 'var(--color-text-muted)' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatMXN(n?: number | null): string {
  if (!n) return '—'
  // Delegates to the canonical formatter — single source of truth.
  return formatCompactMXN(n)
}

function formatMXNHero(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  return `$${(n / 1e6).toFixed(0)}M`
}

// URL-safe slug (case.slug is already URL-safe; fall back to case_id)
function caseUrl(cas: ScandalListItem): string {
  return `/cases/${cas.slug}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter pill (inline, no dropdown)
// ─────────────────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 text-[11px] font-medium tracking-wide transition-colors"
      style={{
        fontFamily: 'var(--font-family-mono)',
        // Active: strong amber fill + white text (unmistakable).
        // Default: transparent, muted text, warm-gray border (clearly ghost).
        background: active ? 'var(--color-accent)' : 'transparent',
        color: active ? '#ffffff' : 'var(--color-text-muted)',
        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      {label.toUpperCase()}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Case row — editorial table style
// ─────────────────────────────────────────────────────────────────────────────

function CaseRow({
  cas,
  onClick,
  t,
  lang,
}: {
  cas: ScandalListItem
  onClick: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  lang: string
}) {
  const accent = FRAUD_TYPE_LEFT[cas.fraud_type] ?? FRAUD_TYPE_LEFT.other
  const legal = LEGAL_STATUS_STYLE[cas.legal_status] ?? LEGAL_STATUS_STYLE.unresolved
  const name = lang === 'es' && cas.name_es ? cas.name_es : cas.name_en
  // summary_es only exists on ScandalDetail; list endpoint returns summary_en only.
  const summaryEs = (cas as ScandalListItem & { summary_es?: string }).summary_es
  const summary = lang === 'es' && summaryEs ? summaryEs : cas.summary_en

  const yearLabel = cas.contract_year_start
    ? cas.contract_year_end && cas.contract_year_end !== cas.contract_year_start
      ? `${cas.contract_year_start}\u2013${cas.contract_year_end}`
      : String(cas.contract_year_start)
    : '—'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left transition-colors"
      style={{
        background: CARD_BG,
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-start gap-4 px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
        {/* Left: name + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Fraud type tag */}
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5"
              style={{
                fontFamily: 'var(--font-family-mono)',
                color: accent,
                background: `${accent}14`,
                border: `1px solid ${accent}33`,
              }}
            >
              {t(`fraudTypes.${cas.fraud_type}`)}
            </span>
            {/* Administration pill */}
            {cas.administration && (
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-0.5"
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  color: '#8a8a86',
                  border: `1px solid ${BORDER_STRONG}`,
                }}
              >
                {t(`administrations.${cas.administration}`)}
              </span>
            )}
            {/* Ground truth indicator */}
            {cas.ground_truth_case_id != null && (
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-0.5"
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  color: '#d4922a',
                  background: 'rgba(212,146,42,0.06)',
                  border: '1px solid rgba(212,146,42,0.22)',
                }}
              >
                {lang === 'es' ? 'ENTRENAMIENTO GT' : 'GT TRAINING'}
              </span>
            )}
          </div>

          <h3
            className="text-[15px] leading-snug text-text-primary group-hover:text-accent transition-colors"
            style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
          >
            {name}
          </h3>

          <p
            className="text-[12px] text-text-muted mt-1.5 line-clamp-2 leading-relaxed pr-6"
            style={{ fontFamily: 'var(--font-family-sans)' }}
          >
            {summary}
          </p>

          {/* Status line */}
          <div
            className="flex items-center gap-3 mt-2.5 text-[10px] flex-wrap"
            style={{ fontFamily: 'var(--font-family-mono)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5"
                style={{ background: legal.dot, borderRadius: 999 }}
              />
              <span style={{ color: legal.text }} className="tracking-wider">
                {legal.label}
              </span>
            </span>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted tabular-nums">{yearLabel}</span>
            {cas.severity >= 3 && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted tracking-wider">
                  {t(`severity.${cas.severity}`)} {lang === 'es' ? 'SEVERIDAD' : 'SEVERITY'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Middle: amount */}
        <div className="flex-shrink-0 text-right min-w-[120px]">
          <div
            className="text-[22px] text-text-primary leading-none tracking-tight tabular-nums"
            style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
          >
            {formatMXN(cas.amount_mxn_low)}
            {cas.amount_mxn_high &&
              cas.amount_mxn_high !== cas.amount_mxn_low && (
                <span className="text-text-muted text-[14px]"> +</span>
              )}
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1"
            style={{ fontFamily: 'var(--font-family-mono)' }}
          >
            {lang === 'es' ? 'PÉRDIDA EST.' : 'EST. LOSS'}
          </div>
        </div>

        {/* Right: chevron */}
        <div className="flex-shrink-0 self-center">
          <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const FRAUD_FILTERS: { value: FraudType; key: string }[] = [
  { value: 'ghost_company', key: 'fraudTypes.ghost_company' },
  { value: 'monopoly', key: 'fraudTypes.monopoly' },
  { value: 'overpricing', key: 'fraudTypes.overpricing' },
  { value: 'bid_rigging', key: 'fraudTypes.bid_rigging' },
  { value: 'procurement_fraud', key: 'fraudTypes.procurement_fraud' },
  { value: 'embezzlement', key: 'fraudTypes.embezzlement' },
]

const ADMIN_FILTERS: { value: Administration; key: string }[] = [
  { value: 'fox', key: 'administrations.fox' },
  { value: 'calderon', key: 'administrations.calderon' },
  { value: 'epn', key: 'administrations.epn' },
  { value: 'amlo', key: 'administrations.amlo' },
  { value: 'sheinbaum', key: 'administrations.sheinbaum' },
]

const STATUS_FILTERS: { value: LegalStatus; key: string }[] = [
  { value: 'impunity', key: 'legalStatuses.impunity' },
  { value: 'investigation', key: 'legalStatuses.investigation' },
  { value: 'prosecuted', key: 'legalStatuses.prosecuted' },
  { value: 'convicted', key: 'legalStatuses.convicted' },
]

export default function CaseLibrary() {
  const { t, i18n } = useTranslation('cases')
  const navigate = useNavigate()

  // URL-synced filters — refresh preserves state, links are shareable.
  const [fraudType, setFraudType] = useQueryState(
    'fraud',
    parseAsStringEnum<FraudType>([
      'ghost_company', 'monopoly', 'overpricing', 'bid_rigging',
      'procurement_fraud', 'embezzlement', 'bribery',
      'conflict_of_interest', 'emergency_fraud', 'tender_rigging', 'other',
    ])
  )
  const [administration, setAdministration] = useQueryState(
    'admin',
    parseAsStringEnum<Administration>(['fox', 'calderon', 'epn', 'amlo', 'sheinbaum'])
  )
  const [legalStatus, setLegalStatus] = useQueryState(
    'status',
    parseAsStringEnum<LegalStatus>([
      'impunity', 'investigation', 'prosecuted',
      'convicted', 'acquitted', 'dismissed', 'unresolved',
    ])
  )
  const { search, setSearch } = useUrlSearch()

  const filters: CaseLibraryParams = useMemo(
    () => ({
      fraud_type: fraudType ?? undefined,
      administration: administration ?? undefined,
      legal_status: legalStatus ?? undefined,
    }),
    [fraudType, administration, legalStatus]
  )

  const queryParams: CaseLibraryParams = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search]
  )

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['cases', 'list', queryParams],
    queryFn: () => caseLibraryApi.getAll(queryParams),
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  // Default sort: amount DESC, severity DESC
  const data = useMemo(() => {
    if (!rawData) return rawData
    return [...rawData].sort((a, b) => {
      const ad = (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0)
      if (ad !== 0) return ad
      if (b.severity !== a.severity) return b.severity - a.severity
      const al = a.ground_truth_case_id != null ? 1 : 0
      const bl = b.ground_truth_case_id != null ? 1 : 0
      return bl - al
    })
  }, [rawData])

  const hasFilters =
    !!search ||
    filters.fraud_type != null ||
    filters.administration != null ||
    filters.legal_status != null

  // ── Stats strip numbers ────────────────────────────────────────────────────
  const totalCases = stats?.total_cases ?? data?.length ?? 0
  const totalLoss = stats?.total_amount_mxn_low ?? 0
  const prosecutedCount =
    (stats?.cases_by_legal_status?.find((s) => s.legal_status === 'prosecuted')
      ?.count ?? 0) +
    (stats?.cases_by_legal_status?.find((s) => s.legal_status === 'convicted')
      ?.count ?? 0)

  const yearSpan = '2002\u20132025'

  return (
    <div
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#e5e5e3',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* Utility header — same pattern as /aria + /workspace. The
            archive is a working surface (filter, search, export, scan)
            not a magazine cover; the impact-statement that lived in the
            42px serif headline is now compressed into the dateline so it
            still reads but doesn't crowd the data. */}
        <header className="mb-5 pb-4 border-b" style={{ borderColor: BORDER_STRONG }}>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {i18n.language === 'es' ? 'Archivo de Casos' : 'Case Archive'}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                {i18n.language === 'es'
                  ? <><span style={{ color: 'var(--color-risk-critical)' }}>{Math.max(0, totalCases - prosecutedCount)} de {totalCases}</span> escándalos sin enjuiciar · {yearSpan} · {formatMXNHero(totalLoss)} MXN documentados</>
                  : <><span style={{ color: 'var(--color-risk-critical)' }}>{Math.max(0, totalCases - prosecutedCount)} of {totalCases}</span> scandals unprosecuted · {yearSpan} · {formatMXNHero(totalLoss)} MXN documented</>
                }
              </p>
            </div>
            <div className="flex items-baseline gap-5">
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                  {totalCases}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {i18n.language === 'es' ? 'Casos' : 'Cases'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: '#a06820' }}>
                  {totalLoss > 0 ? formatMXNHero(totalLoss) : '—'}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {i18n.language === 'es' ? 'Pérdidas MXN' : 'Losses MXN'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: '#22d3ee' }}>
                  {prosecutedCount}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  {i18n.language === 'es' ? 'Procesados' : 'Prosecuted'}
                </div>
              </div>
              {data && data.length > 0 && (
                <div className="self-center">
                  <TableExportButton
                    data={data.map((c) => ({
                      case_name_en: c.name_en,
                      case_name_es: c.name_es,
                      fraud_type: c.fraud_type,
                      administration: c.administration,
                      year_start: c.contract_year_start ?? '',
                      year_end: c.contract_year_end ?? '',
                      amount_mxn_low: c.amount_mxn_low ?? '',
                      amount_mxn_high: c.amount_mxn_high ?? '',
                      severity: c.severity,
                      legal_status: c.legal_status,
                      ground_truth_case_id: c.ground_truth_case_id ?? '',
                    }))}
                    filename="rubli-case-archive"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─────────── Filter strip ─────────── */}
        <section className="mb-6 space-y-3">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={search ?? ''}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('filters.search')}
                className="w-full pl-9 pr-8 py-2 text-[12px] bg-transparent focus:outline-none focus:border-amber-500/40 transition-colors"
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  color: '#e5e5e3',
                  border: `1px solid ${BORDER_STRONG}`,
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch(null)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setFraudType(null)
                  setAdministration(null)
                  setLegalStatus(null)
                  setSearch(null)
                }}
                className="text-[10px] tracking-wider uppercase text-text-muted hover:text-accent transition-colors flex items-center gap-1"
                style={{ fontFamily: 'var(--font-family-mono)' }}
              >
                <X className="h-3 w-3" />
                {t('filters.clearFilters')}
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-text-muted w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              {i18n.language === 'es' ? 'TIPO' : 'TYPE'}
            </span>
            <FilterPill
              label={t('filters.all')}
              active={fraudType == null}
              onClick={() => setFraudType(null)}
            />
            {FRAUD_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key)}
                active={fraudType === f.value}
                onClick={() => setFraudType(f.value)}
              />
            ))}
          </div>

          {/* Admin filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-text-muted w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              {i18n.language === 'es' ? 'ADMIN' : 'ADMIN'}
            </span>
            <FilterPill
              label={t('filters.all')}
              active={administration == null}
              onClick={() => setAdministration(null)}
            />
            {ADMIN_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key).split(' ')[0]}
                active={administration === f.value}
                onClick={() => setAdministration(f.value)}
              />
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-text-muted w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              {i18n.language === 'es' ? 'ESTADO' : 'STATUS'}
            </span>
            <FilterPill
              label={t('filters.all')}
              active={legalStatus == null}
              onClick={() => setLegalStatus(null)}
            />
            {STATUS_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key)}
                active={legalStatus === f.value}
                onClick={() => setLegalStatus(f.value)}
              />
            ))}
          </div>
        </section>

        {/* ─────────── Results ─────────── */}
        {isLoading && (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[112px] animate-pulse"
                style={{
                  background: CARD_BG,
                  borderBottom: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${BORDER_STRONG}`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            className="p-5 flex items-start gap-3"
            style={{
              background: CARD_BG,
              border: '1px solid rgba(239,68,68,0.3)',
              borderLeft: '3px solid #ef4444',
            }}
          >
            <AlertCircle className="h-5 w-5 text-risk-critical mt-0.5 flex-shrink-0" />
            <div>
              <p
                className="text-[13px] font-semibold text-risk-critical mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('loadError')}
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed">
                {t('loadErrorDetail')}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Result count */}
            <div
              className="flex items-center justify-between mb-3 text-[10px] tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-family-mono)', color: '#6a6a66' }}
            >
              <span>
                {t('resultCount', { count: data.length })}
                {hasFilters && (
                  <span className="text-text-muted ml-1">
                    ({i18n.language === 'es' ? 'filtrado' : 'filtered'})
                  </span>
                )}
              </span>
              <span className="text-text-muted">
                {i18n.language === 'es' ? 'ORDENADO POR PÉRDIDA · DESC' : 'SORTED BY LOSS · DESC'}
              </span>
            </div>

            {data.length === 0 ? (
              <div
                className="py-16 text-center"
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <p
                  className="text-[14px] text-text-secondary mb-2"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {t('noResults')}
                </p>
                <p className="text-[12px] text-text-muted max-w-md mx-auto leading-relaxed">
                  {search
                    ? t('noResultsExplain', { query: search })
                    : t('noResultsHint')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFraudType(null)
                    setAdministration(null)
                    setLegalStatus(null)
                    setSearch(null)
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-accent hover:text-accent-hover transition-colors"
                  style={{ fontFamily: 'var(--font-family-mono)' }}
                >
                  <X className="h-3 w-3" />
                  {t('filters.clearFilters')}
                </button>
              </div>
            ) : (() => {
              // Editorial tier break: the top 3 cases (by loss, via existing sort)
              // get a "FEATURED" section header so the reader immediately sees the
              // most damaging scandals; the rest render compactly below. Art
              // Director + UX/IA critics flagged the uniform list as having no
              // featured case and no rhythm change — "a database dump."
              // Only applied to the unfiltered view; filtered results render flat.
              const showFeatured = !hasFilters && data.length > 6
              const featured = showFeatured ? data.slice(0, 3) : []
              const rest = showFeatured ? data.slice(3) : data
              return (
                <>
                  {showFeatured && (
                    <>
                      <div
                        className="flex items-center gap-3 mb-3"
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        <span
                          className="h-px flex-1"
                          style={{ background: 'rgba(212,146,42,0.3)' }}
                        />
                        <span
                          className="text-[10px] font-bold tracking-[0.2em] uppercase"
                          style={{ color: '#d4922a' }}
                        >
                          {i18n.language === 'es'
                            ? 'Los tres casos de mayor daño documentado'
                            : 'The three largest documented cases'}
                        </span>
                        <span
                          className="h-px flex-1"
                          style={{ background: 'rgba(212,146,42,0.3)' }}
                        />
                      </div>
                      <div
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderBottom: 'none',
                          marginBottom: 24,
                        }}
                      >
                        {featured.map((cas) => (
                          <div
                            key={cas.id}
                            style={{ background: 'rgba(212,146,42,0.03)' }}
                          >
                            <CaseRow
                              cas={cas}
                              onClick={() => navigate(caseUrl(cas))}
                              t={t}
                              lang={i18n.language}
                            />
                          </div>
                        ))}
                      </div>
                      <div
                        className="flex items-center gap-3 mb-3"
                        style={{ fontFamily: 'var(--font-family-mono)' }}
                      >
                        <span
                          className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted"
                        >
                          {i18n.language === 'es'
                            ? `El resto del archivo · ${rest.length} casos`
                            : `The rest of the archive · ${rest.length} cases`}
                        </span>
                        <span
                          className="h-px flex-1 bg-border"
                        />
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderBottom: 'none',
                    }}
                  >
                    {rest.map((cas) => (
                      <CaseRow
                        key={cas.id}
                        cas={cas}
                        onClick={() => navigate(caseUrl(cas))}
                        t={t}
                        lang={i18n.language}
                      />
                    ))}
                  </div>
                </>
              )
            })()}

            {/* Footnote */}
            <p
              className="mt-8 text-[10px] tracking-wider uppercase text-text-muted flex items-center gap-2"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              <span>{i18n.language === 'es' ? 'FUENTE' : 'SOURCE'}</span>
              <span className="text-text-primary">·</span>
              <span className="text-text-muted">
                {i18n.language === 'es'
                  ? 'Registros judiciales, auditorías ASF, registro SAT EFOS, investigaciones periodísticas'
                  : 'Judicial records, ASF audits, SAT EFOS registry, journalism investigations'}
              </span>
              <ArrowRight className="h-3 w-3 ml-1 text-text-primary" />
            </p>
          </>
        )}
      </div>
    </div>
  )
}
