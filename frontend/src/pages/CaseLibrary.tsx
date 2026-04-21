import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { AlertCircle, Search, X, ArrowRight, ChevronRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Art direction
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_BG = '#0f0d0c'
const CARD_BG = '#141210'
const BORDER = 'rgba(255,255,255,0.05)'
const BORDER_STRONG = 'rgba(255,255,255,0.09)'

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
  acquitted: { dot: '#a1a1aa', label: 'ACQUITTED', text: '#a1a1aa' },
  dismissed: { dot: '#71717a', label: 'DISMISSED', text: '#a1a1aa' },
  unresolved: { dot: '#71717a', label: 'UNRESOLVED', text: '#a1a1aa' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatMXN(n?: number | null): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
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
        background: active ? 'rgba(212,146,42,0.12)' : 'transparent',
        color: active ? '#d4922a' : '#9a9a96',
        border: `1px solid ${active ? 'rgba(212,146,42,0.35)' : BORDER_STRONG}`,
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
  const name = lang === 'es' ? cas.name_es : cas.name_en

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
                GT TRAINING
              </span>
            )}
          </div>

          <h3
            className="text-[15px] leading-snug text-zinc-100 group-hover:text-amber-300 transition-colors"
            style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
          >
            {name}
          </h3>

          <p
            className="text-[12px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed pr-6"
            style={{ fontFamily: 'var(--font-family-sans)' }}
          >
            {cas.summary_en}
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
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 tabular-nums">{yearLabel}</span>
            {cas.severity >= 3 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 tracking-wider">
                  {t(`severity.${cas.severity}`)} SEVERITY
                </span>
              </>
            )}
          </div>
        </div>

        {/* Middle: amount */}
        <div className="flex-shrink-0 text-right min-w-[120px]">
          <div
            className="text-[22px] text-zinc-100 leading-none tracking-tight tabular-nums"
            style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
          >
            {formatMXN(cas.amount_mxn_low)}
            {cas.amount_mxn_high &&
              cas.amount_mxn_high !== cas.amount_mxn_low && (
                <span className="text-zinc-600 text-[14px]"> +</span>
              )}
          </div>
          <div
            className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 mt-1"
            style={{ fontFamily: 'var(--font-family-mono)' }}
          >
            MXN · EST. LOSS
          </div>
        </div>

        {/* Right: chevron */}
        <div className="flex-shrink-0 self-center">
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
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

  const [filters, setFilters] = useState<CaseLibraryParams>({})
  const { search, setSearch } = useUrlSearch()

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
        {/* ─────────── Section header ─────────── */}
        <header
          className="flex items-start justify-between gap-6 pb-6 mb-8"
          style={{ borderBottom: `1px solid ${BORDER_STRONG}` }}
        >
          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2"
              style={{
                fontFamily: 'var(--font-family-mono)',
                color: '#8a8a86',
              }}
            >
              RUBLI · CASE ARCHIVE
            </p>
            <h1
              className="text-[24px] leading-tight text-zinc-100"
              style={{ fontFamily: 'var(--font-family-serif)', fontWeight: 600 }}
            >
              The Archive
            </h1>
            <p
              className="text-[13px] text-zinc-500 mt-1.5"
              style={{ fontFamily: 'var(--font-family-sans)' }}
            >
              {totalCases} {t('subtitle').includes('documented') ? 'documented corruption cases' : 'casos documentados de corrupción'} · {yearSpan}
            </p>
          </div>
          <div className="flex-shrink-0">
            {data && data.length > 0 && (
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
            )}
          </div>
        </header>

        {/* ─────────── Stats row (3 numbers) ─────────── */}
        <div
          className="grid grid-cols-3 mb-10"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          {[
            {
              value: totalCases.toString(),
              label: 'TOTAL CASES',
              accent: '#e5e5e3',
            },
            {
              value: totalLoss > 0 ? formatMXNHero(totalLoss) : '—',
              sub: totalLoss > 0 ? 'MXN' : '',
              label: 'DOCUMENTED LOSSES',
              accent: '#ef4444',
            },
            {
              value: prosecutedCount.toString(),
              label: 'PROSECUTED OR CONVICTED',
              accent: '#22d3ee',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="py-5 px-5"
              style={{ borderRight: `1px solid ${BORDER}` }}
            >
              <div
                className="text-[28px] leading-none tabular-nums"
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontWeight: 700,
                  color: s.accent,
                }}
              >
                {s.value}
                {s.sub && (
                  <span className="text-[14px] text-zinc-500 ml-1.5">
                    {s.sub}
                  </span>
                )}
              </div>
              <div
                className="text-[10px] tracking-[0.15em] uppercase text-zinc-500 mt-2"
                style={{ fontFamily: 'var(--font-family-mono)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ─────────── Filter strip ─────────── */}
        <section className="mb-6 space-y-3">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
                  setFilters({})
                  setSearch(null)
                }}
                className="text-[10px] tracking-wider uppercase text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
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
              className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              TYPE
            </span>
            <FilterPill
              label={t('filters.all')}
              active={filters.fraud_type == null}
              onClick={() =>
                setFilters((f) => ({ ...f, fraud_type: undefined }))
              }
            />
            {FRAUD_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key)}
                active={filters.fraud_type === f.value}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, fraud_type: f.value }))
                }
              />
            ))}
          </div>

          {/* Admin filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              ADMIN
            </span>
            <FilterPill
              label={t('filters.all')}
              active={filters.administration == null}
              onClick={() =>
                setFilters((f) => ({ ...f, administration: undefined }))
              }
            />
            {ADMIN_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key).split(' ')[0]}
                active={filters.administration === f.value}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, administration: f.value }))
                }
              />
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-zinc-600 w-14 flex-shrink-0"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              STATUS
            </span>
            <FilterPill
              label={t('filters.all')}
              active={filters.legal_status == null}
              onClick={() =>
                setFilters((f) => ({ ...f, legal_status: undefined }))
              }
            />
            {STATUS_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={t(f.key)}
                active={filters.legal_status === f.value}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, legal_status: f.value }))
                }
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
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p
                className="text-[13px] font-semibold text-red-300 mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('loadError')}
              </p>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
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
                  <span className="text-zinc-600 ml-1">(filtered)</span>
                )}
              </span>
              <span className="text-zinc-600">SORTED BY LOSS · DESC</span>
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
                  className="text-[14px] text-zinc-300 mb-2"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {t('noResults')}
                </p>
                <p className="text-[12px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {search
                    ? t('noResultsExplain', { query: search })
                    : t('noResultsHint')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({})
                    setSearch(null)
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-amber-400 hover:text-amber-300 transition-colors"
                  style={{ fontFamily: 'var(--font-family-mono)' }}
                >
                  <X className="h-3 w-3" />
                  {t('filters.clearFilters')}
                </button>
              </div>
            ) : (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderBottom: 'none',
                }}
              >
                {data.map((cas) => (
                  <CaseRow
                    key={cas.id}
                    cas={cas}
                    onClick={() => navigate(caseUrl(cas))}
                    t={t}
                    lang={i18n.language}
                  />
                ))}
              </div>
            )}

            {/* Footnote */}
            <p
              className="mt-8 text-[10px] tracking-wider uppercase text-zinc-600 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              <span>SOURCE</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">
                Judicial records, ASF audits, SAT EFOS registry, journalism investigations
              </span>
              <ArrowRight className="h-3 w-3 ml-1 text-zinc-700" />
            </p>
          </>
        )}
      </div>
    </div>
  )
}
