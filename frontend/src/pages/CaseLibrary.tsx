/**
 * CaseLibrary — "El Padrón" (/cases). The documented-case docket.
 *
 * DESIGNUS synthesis 2026-06-10 (_designus_cases/SYNTHESIS.md):
 * ARCHIVO's Impunity-Docket spine + EDITOR's front-page craft.
 *
 *   Masthead          — the impunity ratio as the page's largest object
 *                       ("Cuarenta y tres expedientes. Una sola condena.")
 *   DispositionBand   — ProPublica Bailout-Tracker share band of the 43
 *                       cases by legal outcome; segments filter ?status.
 *   Dateline filters  — search + native <details> menus (TIPO/SEXENIO/ESTADO)
 *                       with live counts; same shareable URL params.
 *   LeadCase          — above-the-fold feature (rank 1 of active sort).
 *   Secondary tier    — ranks 2–5, two newspaper columns.
 *   AgateLedger       — the full archive at FT-markets density. Disposition
 *                       rail; amounts in neutral tabular ink (rainbow dead).
 *
 * Fixes shipped here (prod bugs, 2026-06-10 screenshots): raw i18n key
 * FRAUDTYPES.INVOICE_FRAUD, dark-theme #e5e5e3 remnants on a cream page,
 * invisible white-on-white hover, inline-<circle> severity (now DotBar,
 * correct 4-point scale), fraud-type rainbow palette.
 */
import { useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
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
import { AlertCircle, ArrowRight, ChevronDown, Search, X } from 'lucide-react'
import { PageFooter } from '@/components/layout/PageFooter'
import { RISK_TEXT_COLORS } from '@/lib/constants'
import { usePublishSiblingList, useOriginRowFlash } from '@/lib/nav/wayfinding'
import {
  fraudLabel,
  dispositionLabel,
  type Lang,
} from '@/components/cases/casesVocab'
import { DispositionBand } from '@/components/cases/DispositionBand'
import { LeadCase, SecondaryCaseCard, AgateLedger } from '@/components/cases/IndexBlocks'

// ─── Hero money formatter (Mexican convention: MDP / billones, never B MXN) ──

function formatMXNHero(n: number, lang: Lang): string {
  if (lang === 'es') {
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)} billones`
    if (n >= 1e9) {
      const mdp = Math.round(n / 1e6)
      return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(mdp)} MDP`
    }
    return `${(n / 1e6).toFixed(0)} MDP`
  }
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T MXN`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B MXN`
  return `$${(n / 1e6).toFixed(0)}M MXN`
}

const NUMBER_WORD: Record<number, { en: string; es: string }> = {
  43: { en: 'Forty-three', es: 'Cuarenta y tres' },
}

// ─── Filter enum lists (extended 2026-06-10 — ?fraud=invoice_fraud etc. were
//     silently unfilterable while the unions lagged the live data) ───────────

const FRAUD_VALUES: FraudType[] = [
  'ghost_company', 'monopoly', 'overpricing', 'bid_rigging',
  'procurement_fraud', 'embezzlement', 'bribery', 'conflict_of_interest',
  'emergency_fraud', 'tender_rigging', 'invoice_fraud',
  'infrastructure_overrun', 'state_capture', 'cartel_infiltration', 'other',
]
const ADMIN_VALUES: Administration[] = ['fox', 'calderon', 'epn', 'amlo', 'sheinbaum', 'multiple']
const STATUS_VALUES: LegalStatus[] = [
  'impunity', 'investigation', 'ongoing', 'prosecuted',
  'convicted', 'acquitted', 'dismissed', 'settled', 'unresolved',
]

const ADMIN_SHORT: Record<string, string> = {
  fox: 'Fox', calderon: 'Calderón', epn: 'Peña Nieto', amlo: 'AMLO',
  sheinbaum: 'Sheinbaum', multiple: 'Multi',
}

// ─── Dateline filter menu (native <details>, zero popover JS) ────────────────

interface MenuOption {
  value: string
  label: string
  count?: number
}

function FilterMenu({
  label,
  activeLabel,
  options,
  onSelect,
  onClear,
  lang,
}: {
  label: string
  activeLabel: string | null
  options: MenuOption[]
  onSelect: (value: string) => void
  onClear: () => void
  lang: Lang
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const close = () => ref.current?.removeAttribute('open')
  return (
    <details ref={ref} className="relative">
      <summary
        className="list-none cursor-pointer select-none inline-flex items-center gap-1.5 font-mono uppercase px-2.5 py-1.5 transition-colors"
        style={{
          fontSize: 12,
          letterSpacing: '0.14em',
          color: activeLabel ? '#ffffff' : 'var(--color-text-secondary)',
          background: activeLabel ? 'var(--color-accent)' : 'transparent',
          border: `1px solid ${activeLabel ? 'var(--color-accent)' : 'var(--color-border-hover)'}`,
        }}
      >
        {label}
        {activeLabel && <span className="normal-case tracking-normal font-semibold">· {activeLabel}</span>}
        <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
      </summary>
      <div
        className="absolute left-0 z-30 mt-1 min-w-[240px] py-1"
        style={{
          background: 'var(--color-background-card)',
          border: '1px solid var(--color-border-hover)',
          boxShadow: '0 6px 20px rgba(45, 41, 38, 0.12)',
        }}
      >
        <button
          type="button"
          onClick={() => { onClear(); close() }}
          className="w-full text-left px-3 py-1.5 font-mono uppercase hover:bg-background-elevated transition-colors"
          style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
        >
          {lang === 'es' ? 'Todos' : 'All'}
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { onSelect(o.value); close() }}
            className="w-full flex items-baseline justify-between gap-4 text-left px-3 py-1.5 hover:bg-background-elevated transition-colors"
          >
            <span
              className="font-mono uppercase"
              style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-primary)' }}
            >
              {o.label}
            </span>
            {o.count != null && (
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 12, color: 'var(--color-text-muted)' }}
              >
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </details>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

type SortKey = 'loss' | 'severity' | 'year' | 'gt'

export default function CaseLibrary() {
  const { i18n } = useTranslation('cases')
  const location = useLocation()
  const lang: Lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  // URL-synced filters — refresh preserves state, links are shareable.
  const [fraudType, setFraudType] = useQueryState('fraud', parseAsStringEnum<FraudType>(FRAUD_VALUES))
  const [administration, setAdministration] = useQueryState('admin', parseAsStringEnum<Administration>(ADMIN_VALUES))
  const [legalStatus, setLegalStatus] = useQueryState('status', parseAsStringEnum<LegalStatus>(STATUS_VALUES))
  const { search, setSearch } = useUrlSearch()

  const filters: CaseLibraryParams = useMemo(
    () => ({
      fraud_type: fraudType ?? undefined,
      administration: administration ?? undefined,
      legal_status: legalStatus ?? undefined,
    }),
    [fraudType, administration, legalStatus],
  )
  const queryParams: CaseLibraryParams = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search],
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

  const [sortBy, setSortBy] = useState<SortKey>('loss')

  const data = useMemo(() => {
    if (!rawData) return rawData
    const arr = [...rawData]
    const byAmount = (a: ScandalListItem, b: ScandalListItem) =>
      (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0)
    switch (sortBy) {
      case 'severity':
        arr.sort((a, b) => (b.severity !== a.severity ? b.severity - a.severity : byAmount(a, b)))
        break
      case 'year':
        arr.sort((a, b) => {
          const ay = a.contract_year_start ?? -Infinity
          const by = b.contract_year_start ?? -Infinity
          return by !== ay ? by - ay : byAmount(a, b)
        })
        break
      case 'gt':
        arr.sort((a, b) => {
          const al = a.ground_truth_case_id != null ? 1 : 0
          const bl = b.ground_truth_case_id != null ? 1 : 0
          return bl !== al ? bl - al : byAmount(a, b)
        })
        break
      case 'loss':
      default:
        arr.sort((a, b) => {
          const d = byAmount(a, b)
          if (d !== 0) return d
          return b.severity - a.severity
        })
    }
    return arr
  }, [rawData, sortBy])

  const hasFilters =
    !!search || filters.fraud_type != null || filters.administration != null || filters.legal_status != null

  // El Hilo — publish the displayed order so the dossier stepper follows it.
  usePublishSiblingList(
    data && data.length > 0
      ? {
          kind: 'case',
          items: data.map((c) => ({
            id: c.slug,
            label: lang === 'es' && c.name_es ? c.name_es : c.name_en,
          })),
          backTo: location.pathname + location.search,
          backLabel: lang === 'es' ? 'El Padrón' : 'the docket',
        }
      : null,
  )
  useOriginRowFlash('case', !!data && data.length > 0)

  // Masthead numbers — interpolated, never hardcoded.
  const totalCases = stats?.total_cases ?? rawData?.length ?? 0
  const convicted = stats?.cases_by_legal_status?.find((s) => s.legal_status === 'convicted')?.count ?? 0
  const withoutConviction = Math.max(0, totalCases - convicted)
  const totalLoss = stats?.total_amount_mxn_low ?? 0

  const totalWord = NUMBER_WORD[totalCases]?.[lang] ?? String(totalCases)
  const headlineTop = lang === 'es' ? `${totalWord} expedientes.` : `${totalWord} case files.`
  const headlineFragment =
    convicted === 1
      ? lang === 'es' ? 'Una sola condena.' : 'One conviction.'
      : lang === 'es' ? `${convicted} condenas.` : `${convicted} convictions.`

  // Tier split — front page only on the unfiltered view.
  const showTiers = !hasFilters && !!data && data.length > 6
  const lead = showTiers ? data![0] : null
  const secondary = showTiers ? data!.slice(1, 5) : []
  const agate = showTiers ? data!.slice(5) : data ?? []

  const clearAll = () => {
    setFraudType(null)
    setAdministration(null)
    setLegalStatus(null)
    setSearch(null)
  }

  // Filter menu options — built from the live stats distributions so every
  // value in the data is filterable (the old page hardcoded 6 of 12 types).
  const fraudOptions: MenuOption[] = (stats?.cases_by_fraud_type ?? [])
    .map((f) => ({ value: f.fraud_type, label: fraudLabel(f.fraud_type, lang), count: f.count }))
  const adminOptions: MenuOption[] = (stats?.cases_by_administration ?? [])
    .map((a) => ({ value: a.administration, label: ADMIN_SHORT[a.administration] ?? a.administration, count: a.count }))
  const statusOptions: MenuOption[] = (stats?.cases_by_legal_status ?? [])
    .map((s) => ({ value: s.legal_status, label: dispositionLabel(s.legal_status, lang), count: s.count }))

  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh', color: 'var(--color-text-primary)' }}>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-7 py-5">
        {/* ─── Masthead ─── */}
        <header className="pb-5" style={{ borderBottom: '2px solid var(--color-text-primary)' }}>
          <p
            className="font-mono uppercase mb-3"
            style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 500 }}
          >
            <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 600 }}>
              {lang === 'es' ? 'El Padrón' : 'The Docket'}
            </span>
            <span className="mx-2 opacity-50">·</span>
            {lang === 'es' ? 'Casos documentados · 2002–2025' : 'Documented cases · 2002–2025'}
          </p>

          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <h1
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 500,
                fontSize: 'clamp(30px, 4.6vw, 54px)',
                lineHeight: 1.0,
                letterSpacing: '-0.012em',
                color: 'var(--color-text-primary)',
              }}
            >
              {headlineTop}
              <br />
              <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                {headlineFragment}
              </span>
            </h1>

            {/* Stat rail */}
            <div className="flex items-end gap-8" aria-label={lang === 'es' ? 'Cifras del padrón' : 'Docket figures'}>
              <MastheadStat
                value={totalCases ? `${convicted}/${totalCases}` : '—'}
                caption={lang === 'es' ? 'Condenas' : 'Convictions'}
                ink="var(--color-text-primary)"
              />
              <MastheadStat
                value={totalLoss ? formatMXNHero(totalLoss, lang) : '—'}
                caption={lang === 'es' ? 'Daño documentado' : 'Documented harm'}
                ink="var(--color-text-primary)"
              />
              <MastheadStat
                value={totalCases ? String(withoutConviction) : '—'}
                caption={lang === 'es' ? 'Sin condena' : 'Without conviction'}
                ink={RISK_TEXT_COLORS.critical}
              />
            </div>
          </div>
        </header>

        {/* ─── Disposition band ─── */}
        {stats && stats.cases_by_legal_status.length > 0 && (
          <DispositionBand
            counts={stats.cases_by_legal_status}
            activeStatus={legalStatus}
            onSelect={(s) => setLegalStatus((s as LegalStatus) ?? null)}
            lang={lang}
          />
        )}

        {/* ─── Dateline filters ─── */}
        <div
          className="mt-4 py-3 flex flex-wrap items-center gap-3"
          style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              aria-label={lang === 'es' ? 'Buscar casos' : 'Search cases'}
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value || null)}
              placeholder={lang === 'es' ? 'Buscar caso o proveedor…' : 'Search case or vendor…'}
              className="w-full pl-9 pr-8 py-1.5 text-[12px] bg-transparent focus:outline-none transition-colors"
              style={{
                fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-hover)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch(null)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                aria-label={lang === 'es' ? 'Limpiar búsqueda' : 'Clear search'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <FilterMenu
            label={lang === 'es' ? 'Tipo' : 'Type'}
            activeLabel={fraudType ? fraudLabel(fraudType, lang) : null}
            options={fraudOptions}
            onSelect={(v) => setFraudType(v as FraudType)}
            onClear={() => setFraudType(null)}
            lang={lang}
          />
          <FilterMenu
            label={lang === 'es' ? 'Sexenio' : 'Term'}
            activeLabel={administration ? (ADMIN_SHORT[administration] ?? administration) : null}
            options={adminOptions}
            onSelect={(v) => setAdministration(v as Administration)}
            onClear={() => setAdministration(null)}
            lang={lang}
          />
          <FilterMenu
            label={lang === 'es' ? 'Estado' : 'Status'}
            activeLabel={legalStatus ? dispositionLabel(legalStatus, lang) : null}
            options={statusOptions}
            onSelect={(v) => setLegalStatus(v as LegalStatus)}
            onClear={() => setLegalStatus(null)}
            lang={lang}
          />

          <div className="ml-auto flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 font-mono uppercase text-text-muted hover:text-accent transition-colors"
                style={{ fontSize: 12, letterSpacing: '0.12em' }}
              >
                <X className="h-3 w-3" aria-hidden="true" />
                {lang === 'es' ? 'Limpiar' : 'Clear'}
              </button>
            )}
            <span
              className="font-mono tabular-nums uppercase"
              style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
            >
              {data
                ? hasFilters
                  ? `${totalCases} → ${data.length} ${lang === 'es' ? 'casos' : 'cases'}`
                  : `${data.length} ${lang === 'es' ? 'casos' : 'cases'}`
                : '…'}
            </span>
          </div>
        </div>

        {/* ─── Body ─── */}
        {isLoading && (
          <div className="mt-4 space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[44px] animate-pulse"
                style={{ background: 'var(--color-background-card)', borderBottom: '1px solid var(--color-border)' }}
              />
            ))}
          </div>
        )}

        {error != null && (
          <div
            className="mt-5 p-5 flex items-start gap-3"
            style={{
              background: 'var(--color-background-card)',
              border: '1px solid var(--color-border)',
              borderLeft: `3px solid ${RISK_TEXT_COLORS.critical}`,
            }}
          >
            <AlertCircle className="h-5 w-5 text-risk-critical mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-semibold text-risk-critical mb-1" style={{ fontFamily: 'var(--font-family-serif)' }}>
                {lang === 'es' ? 'Error al cargar los casos.' : 'Failed to load cases.'}
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed">
                {lang === 'es'
                  ? 'El servidor puede estar temporalmente no disponible. Los datos aparecerán al restablecerse la conexión.'
                  : 'The server may be temporarily unavailable. Data will appear once the connection is restored.'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {data.length === 0 ? (
              <div
                className="mt-5 py-16 text-center"
                style={{ background: 'var(--color-background-card)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-[14px] text-text-secondary mb-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
                  {lang === 'es' ? 'Ningún caso coincide con los filtros actuales.' : 'No cases match the current filters.'}
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono uppercase text-accent hover:opacity-70 transition-opacity"
                  style={{ fontSize: 13, letterSpacing: '0.12em' }}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  {lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
                </button>
              </div>
            ) : (
              <>
                {lead && <LeadCase cas={lead} lang={lang} />}

                {secondary.length > 0 && (
                  <section aria-label={lang === 'es' ? 'Más en portada' : 'More on the front page'}>
                    <div
                      className="flex items-center gap-3 mt-6 mb-1 font-mono uppercase"
                      style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 600 }}
                    >
                      <span>
                        {lang === 'es'
                          ? `Más en portada · ${secondary.length} casos`
                          : `More on the front page · ${secondary.length} cases`}
                      </span>
                      <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-7">
                      {secondary.map((cas, i) => (
                        <SecondaryCaseCard
                          key={cas.id}
                          cas={cas}
                          lang={lang}
                          withGutter={i % 2 === 0}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Sort control */}
                <div
                  className="mt-6 flex items-center justify-end gap-1.5 flex-wrap font-mono uppercase"
                  style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
                >
                  <span>{lang === 'es' ? 'Ordenar' : 'Sort'}</span>
                  {([
                    { key: 'loss' as SortKey, label: lang === 'es' ? 'Pérdida ↓' : 'Loss ↓' },
                    { key: 'severity' as SortKey, label: lang === 'es' ? 'Gravedad ↓' : 'Severity ↓' },
                    { key: 'year' as SortKey, label: lang === 'es' ? 'Año ↓' : 'Year ↓' },
                    { key: 'gt' as SortKey, label: lang === 'es' ? 'GT primero' : 'GT first' },
                  ]).map((s) => {
                    const active = sortBy === s.key
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSortBy(s.key)}
                        className="px-2 py-0.5 font-medium transition-colors"
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          background: active ? 'var(--color-accent)' : 'transparent',
                          color: active ? '#ffffff' : 'var(--color-text-muted)',
                          border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>

                <AgateLedger
                  cases={agate}
                  lang={lang}
                  header={
                    showTiers
                      ? lang === 'es'
                        ? `El archivo completo · ${agate.length} casos`
                        : `The full archive · ${agate.length} cases`
                      : lang === 'es'
                        ? `${agate.length} resultados`
                        : `${agate.length} results`
                  }
                />
              </>
            )}

            {/* ─── Footer ─── */}
            {convicted === 1 && totalCases > 0 && (
              <p
                className="mt-10 text-center"
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'normal',
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {lang === 'es'
                  ? `Una condena en ${totalCases} casos. El registro es el argumento.`
                  : `One conviction in ${totalCases} cases. The record is the argument.`}
              </p>
            )}
            <p
              className="mt-4 font-mono uppercase flex items-center justify-center gap-2 flex-wrap"
              style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}
            >
              <span>{lang === 'es' ? 'Fuentes' : 'Sources'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'es'
                  ? 'Registros judiciales, auditorías ASF, registro SAT EFOS, periodismo de investigación'
                  : 'Judicial records, ASF audits, SAT EFOS registry, investigative journalism'}
              </span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </p>
          </>
        )}
        <PageFooter />
      </div>
    </div>
  )
}

function MastheadStat({
  value,
  caption,
  ink,
}: {
  value: string
  caption: string
  ink: string
}) {
  return (
    <div className="text-right">
      <div
        className="tabular-nums"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'normal',
          fontWeight: 800,
          fontSize: 'clamp(22px, 2.6vw, 32px)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: ink,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono uppercase mt-1"
        style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}
      >
        {caption}
      </div>
    </div>
  )
}
