import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUrlSearch } from '@/hooks'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import type { ScandalListItem, FraudType, Administration, LegalStatus, CaseLibraryParams } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { TableExportButton } from '@/components/TableExportButton'
import { CitationBlock } from '@/components/CitationBlock'
import { ShareButton } from '@/components/ShareButton'
import { CaseLeadButton } from '@/components/CaseLeadDialog'
import {
  AlertCircle, Search, X, Eye, EyeOff, Activity,
  ArrowUpDown, ArrowRight, ChevronDown, Scale, Landmark
} from 'lucide-react'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'

// ── Fraud type pill colours ──────────────────────────────────────────────────
const FRAUD_TYPE_COLORS: Record<string, string> = {
  ghost_company:        'border-red-500/60 text-red-400 bg-red-500/10',
  bid_rigging:          'border-orange-500/60 text-orange-400 bg-orange-500/10',
  overpricing:          'border-amber-500/60 text-amber-400 bg-amber-500/10',
  conflict_of_interest: 'border-purple-500/60 text-purple-400 bg-purple-500/10',
  embezzlement:         'border-rose-500/60 text-rose-400 bg-rose-500/10',
  bribery:              'border-pink-500/60 text-pink-400 bg-pink-500/10',
  procurement_fraud:    'border-yellow-500/60 text-yellow-400 bg-yellow-500/10',
  monopoly:             'border-blue-500/60 text-blue-400 bg-blue-500/10',
  emergency_fraud:      'border-cyan-500/60 text-cyan-400 bg-cyan-500/10',
  tender_rigging:       'border-indigo-500/60 text-indigo-400 bg-indigo-500/10',
}

const FRAUD_TYPE_LEFT: Record<string, string> = {
  ghost_company:        'border-l-red-500',
  bid_rigging:          'border-l-orange-500',
  overpricing:          'border-l-amber-500',
  conflict_of_interest: 'border-l-purple-500',
  embezzlement:         'border-l-rose-500',
  bribery:              'border-l-pink-500',
  procurement_fraud:    'border-l-yellow-500',
  monopoly:             'border-l-blue-500',
  emergency_fraud:      'border-l-cyan-500',
  tender_rigging:       'border-l-indigo-500',
}

// ── Legal status: editorial colour system ────────────────────────────────────
const LEGAL_STATUS_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  impunity:      { dot: 'bg-red-500',    text: 'text-red-400',    bg: 'bg-red-500/10' },
  investigation: { dot: 'bg-amber-500',  text: 'text-amber-400',  bg: 'bg-amber-500/10' },
  prosecuted:    { dot: 'bg-blue-500',   text: 'text-blue-400',   bg: 'bg-blue-500/10' },
  convicted:     { dot: 'bg-green-500',  text: 'text-green-400',  bg: 'bg-green-500/10' },
  acquitted:     { dot: 'bg-zinc-400',   text: 'text-zinc-400',   bg: 'bg-zinc-500/10' },
  dismissed:     { dot: 'bg-zinc-600',   text: 'text-zinc-500',   bg: 'bg-zinc-600/10' },
  unresolved:    { dot: 'bg-zinc-600',   text: 'text-zinc-500',   bg: 'bg-zinc-600/10' },
}

// ── Confidence badge ─────────────────────────────────────────────────────────
const CONFIDENCE_CONFIG: Record<number, { key: string; cls: string }> = {
  0: { key: 'confidence.medium',    cls: 'border-zinc-500/50 text-zinc-400' },
  1: { key: 'confidence.high',      cls: 'border-blue-500/50 text-blue-400' },
  2: { key: 'confidence.confirmed', cls: 'border-emerald-500/50 text-emerald-400' },
}

// ── COMPRANET visibility ─────────────────────────────────────────────────────
type CompranetVisibility = 'high' | 'partial' | 'invisible'
const COMPRANET_ICON: Record<CompranetVisibility, typeof Eye> = {
  high: Eye,
  partial: Eye,
  invisible: EyeOff,
}

// ── Sort types ───────────────────────────────────────────────────────────────
type SortMode = 'amount' | 'year' | 'severity'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMXN(n?: number | null): string {
  if (!n) return '?'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function formatMXNLarge(n: number): string {
  if (n >= 1e12) return `MXN $${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `MXN $${(n / 1e9).toFixed(0)}B`
  return `MXN $${(n / 1e6).toFixed(0)}M`
}

// ── Dropdown chip (for filter categories) ────────────────────────────────────
function DropdownChip({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string | undefined
  options: { value: string; label: string }[]
  onSelect: (v: string | undefined) => void
}) {
  const { t } = useTranslation('cases')
  const [open, setOpen] = useState(false)
  const active = value != null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-150
          ${active
            ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
            : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-700/50'
          }`}
      >
        {active ? options.find(o => o.value === value)?.label ?? label : label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl py-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => { onSelect(undefined); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors
                ${!active ? 'text-amber-400 font-medium' : 'text-zinc-400'}`}
            >
              {t('filters.all')}
            </button>
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onSelect(o.value); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors
                  ${value === o.value ? 'text-amber-400 font-medium' : 'text-zinc-300'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  const { t } = useTranslation('cases')
  const { data: stats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const totalCases = stats?.total_cases ?? 0
  const totalAmount = stats?.total_amount_mxn_low ?? 0
  const amountStr = totalAmount > 0 ? formatMXNLarge(totalAmount) : '--'

  // Derive conviction and impunity counts from stats
  const convictedCount = stats?.cases_by_legal_status?.find(s => s.legal_status === 'convicted')?.count ?? 0
  const impunityCount = stats?.cases_by_legal_status?.find(s => s.legal_status === 'impunity')?.count ?? 0
  const convictionPct = totalCases > 0 ? Math.round((convictedCount / totalCases) * 100) : 0

  // Unique sectors from fraud type distribution (approximation: use cases_by_fraud_type length as lower bound)
  const fraudTypes = stats?.cases_by_fraud_type?.length ?? 0

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="mb-10"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        {t('hero.overline')}
      </p>

      {/* Hero stat: the number that matters */}
      <div className="border-l-2 border-red-500 pl-5 py-1 mb-5">
        <div className="text-4xl sm:text-5xl font-mono font-bold text-red-500 leading-tight tracking-tight">
          {amountStr}
        </div>
        <div className="text-sm text-zinc-300 mt-1.5 max-w-xl leading-relaxed">
          {t('hero.headline', { amount: amountStr, count: totalCases })}
        </div>
      </div>

      {/* 4-stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 rounded-lg overflow-hidden mb-4">
        {[
          {
            value: String(totalCases),
            label: t('statsBar.totalCases'),
            accent: 'text-red-500',
          },
          {
            value: totalAmount > 0 ? `$${(totalAmount / 1e9).toFixed(0)}B+` : '--',
            label: t('statsBar.totalAmount'),
            accent: 'text-red-500',
          },
          {
            value: stats?.gt_linked_count != null ? `${stats.gt_linked_count}` : '--',
            label: t('statsBar.vendorsIdentified'),
            accent: 'text-zinc-100',
          },
          {
            value: `${fraudTypes}`,
            label: t('statsBar.sectorsAffected'),
            accent: 'text-zinc-100',
          },
        ].map(({ value, label, accent }) => (
          <div key={label} className="bg-zinc-900 px-4 py-3">
            <div className={`text-2xl font-mono font-bold tracking-tight ${accent}`}>
              {value}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Impunity callout: the editorial finding */}
      {totalCases > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <Scale className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
              {t('hero.findingLabel')}
            </p>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {t('hero.impunityCallout', { pct: convictionPct, impunity: impunityCount })}
            </p>
          </div>
        </div>
      )}

      {/* Source links */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{t('hero.sourcesLabel')}</span>
        {[
          { label: t('sources.efosList'), href: 'https://www.sat.gob.mx/consultas/76674/consulta-la-lista-de-contribuyentes-con-operaciones-no-localizadas-o-inexistentes' },
          { label: t('sources.sfpSanctions'), href: 'https://www.gob.mx/sfp' },
          { label: t('sources.asfAudits'), href: 'https://www.asf.gob.mx' },
        ].map(s => (
          <a
            key={s.href}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-amber-400 text-[10px] font-mono underline underline-offset-2 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </div>
    </motion.div>
  )
}

// ── Case Card: Investigation Dossier ─────────────────────────────────────────
function CaseCard({
  cas,
  onClick,
  onNavigate,
  index,
}: {
  cas: ScandalListItem
  onClick: () => void
  onNavigate: (path: string) => void
  index: number
}) {
  const { t, i18n } = useTranslation('cases')
  const name = i18n.language === 'es' ? cas.name_es : cas.name_en

  const isMLLinked = cas.ground_truth_case_id != null
  const visibility = (cas.compranet_visibility ?? 'invisible') as CompranetVisibility
  const VisIcon = COMPRANET_ICON[visibility] ?? COMPRANET_ICON.invisible
  const leftBorder = FRAUD_TYPE_LEFT[cas.fraud_type] ?? 'border-l-zinc-700'
  const legalStyle = LEGAL_STATUS_STYLE[cas.legal_status] ?? LEGAL_STATUS_STYLE.unresolved
  const caseNum = String(index + 1).padStart(3, '0')

  // Year display
  const yearLabel = cas.contract_year_start
    ? cas.contract_year_end && cas.contract_year_end !== cas.contract_year_start
      ? `${cas.contract_year_start}\u2013${cas.contract_year_end}`
      : String(cas.contract_year_start)
    : null

  // Summary text: use language-appropriate or fallback
  const summary = cas.summary_en

  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`relative group flex flex-col overflow-hidden rounded-lg border border-zinc-800/80 border-l-[3px] ${leftBorder} hover:border-zinc-700 transition-all duration-200 bg-zinc-900`}
    >
      {/* Case number watermark */}
      <div
        className="absolute top-3 right-3 z-10 text-[9px] font-mono tracking-wider text-zinc-700 select-none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {caseNum}
      </div>

      {/* ML training data indicator */}
      {isMLLinked && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-950/30 border-b border-red-900/30">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: RISK_COLORS.high }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: RISK_COLORS.high }} />
          </span>
          <Activity className="h-3 w-3 text-amber-500 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-amber-500 tracking-wide uppercase">
            {t('card.mlTrainingData')}
          </span>
        </div>
      )}

      {/* Card body */}
      <button onClick={onClick} className="w-full text-left flex-1 p-4 pb-3">
        {/* Top row: fraud type + legal status */}
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide rounded-full ${FRAUD_TYPE_COLORS[cas.fraud_type] ?? ''}`}
          >
            {t(`fraudTypes.${cas.fraud_type}`)}
          </Badge>

          {/* Legal status pill with dot */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${legalStyle.bg} ${legalStyle.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${legalStyle.dot}`} />
            {t(`legalStatuses.${cas.legal_status}`)}
          </span>
        </div>

        {/* Case name: editorial weight */}
        <h3
          className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors leading-snug mb-2 pr-8"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {name}
        </h3>

        {/* Lede: 1-sentence summary */}
        <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed mb-4">
          {summary}
        </p>

        {/* Estimated loss: the big number */}
        {cas.amount_mxn_low ? (
          <div className="mb-3">
            <div className="text-2xl font-mono font-bold text-zinc-100 tracking-tight leading-none">
              {formatMXN(cas.amount_mxn_low)}
              {cas.amount_mxn_high && cas.amount_mxn_high !== cas.amount_mxn_low ? (
                <span className="text-zinc-500 text-lg">{` \u2013 ${formatMXN(cas.amount_mxn_high)}`}</span>
              ) : (
                <span className="text-zinc-500 text-lg">+</span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
              {t('statsBar.totalAmount')}
            </div>
          </div>
        ) : null}

        {/* Metadata row: year + sector + COMPRANET visibility */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 font-mono">
          {yearLabel && (
            <span className="text-zinc-400">{yearLabel}</span>
          )}
          {cas.administration && (
            <span className="text-zinc-500">
              {t(`administrations.${cas.administration}`)}
            </span>
          )}
          <span className={`flex items-center gap-1 ${
            visibility === 'high' ? 'text-green-500' :
            visibility === 'partial' ? 'text-yellow-500' : 'text-zinc-600'
          }`}>
            <VisIcon className="h-3 w-3" />
            {visibility === 'high' ? t('card.compranetFull') :
             visibility === 'partial' ? t('card.compranetPartial') :
             t('card.compranetInvisible')}
          </span>
        </div>

        {/* Confidence badge */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(() => {
            const conf = CONFIDENCE_CONFIG[cas.is_verified] ?? CONFIDENCE_CONFIG[0]
            return (
              <Badge variant="outline" className={`text-[9px] px-2 py-0.5 font-semibold ${conf.cls}`}>
                {t(conf.key)}
              </Badge>
            )
          })()}
        </div>
      </button>

      {/* Footer: investigation pathway */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-950/40">
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors font-mono uppercase tracking-wide"
        >
          {t('card.viewInvestigation')}
          <ArrowRight className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-1.5">
          {/* Quick-link: contracts */}
          {(cas.sector_ids?.length > 0 || cas.contract_year_start) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const params = new URLSearchParams()
                if (cas.sector_ids?.[0]) params.set('sector_id', String(cas.sector_ids[0]))
                if (cas.contract_year_start) params.set('year', String(cas.contract_year_start))
                params.set('risk_level', 'high')
                onNavigate(`/contracts?${params}`)
              }}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30 rounded-full px-2.5 py-1 transition-colors"
              title={t('card.contractsLink')}
            >
              <Search className="h-3 w-3" />
              {t('card.contractsLink')}
            </button>
          )}
          <AddToDossierButton
            entityType="note"
            entityId={cas.id}
            entityName={cas.name_en}
            className="h-7 text-xs"
          />
        </div>
      </div>
    </motion.article>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CaseLibrary() {
  const { t } = useTranslation('cases')
  const { t: ts } = useTranslation('sectors')
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CaseLibraryParams>({})
  const [sortMode, setSortMode] = useState<SortMode>('amount')
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

  // Stats for filter chip counts
  const { data: stats } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  // Sort
  const data = useMemo(() => {
    if (!rawData) return rawData
    return [...rawData].sort((a, b) => {
      if (sortMode === 'amount') {
        const diff = (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0)
        if (diff !== 0) return diff
      } else if (sortMode === 'year') {
        const diff = (b.contract_year_start ?? 0) - (a.contract_year_start ?? 0)
        if (diff !== 0) return diff
      } else if (sortMode === 'severity') {
        if (b.severity !== a.severity) return b.severity - a.severity
      }
      // Secondary: severity
      if (b.severity !== a.severity) return b.severity - a.severity
      // Tertiary: ML-linked first
      const aL = a.ground_truth_case_id != null ? 1 : 0
      const bL = b.ground_truth_case_id != null ? 1 : 0
      return bL - aL
    })
  }, [rawData, sortMode])

  const hasFilters = Object.values(queryParams).some(Boolean)

  // Fraud type options for chip filter
  const fraudTypeOptions = useMemo(() => {
    const types = ['ghost_company', 'bid_rigging', 'overpricing', 'conflict_of_interest',
      'embezzlement', 'bribery', 'procurement_fraud', 'monopoly', 'emergency_fraud', 'tender_rigging'] as const
    return types.map(ft => {
      const count = stats?.cases_by_fraud_type?.find(c => c.fraud_type === ft)?.count
      return { value: ft, label: t(`fraudTypes.${ft}`), count }
    }).filter(ft => ft.count == null || ft.count > 0)
  }, [stats, t])

  // Legal status options for chip filter
  const legalStatusOptions = useMemo(() => {
    const statuses = ['impunity', 'investigation', 'prosecuted', 'convicted', 'acquitted', 'dismissed', 'unresolved'] as const
    return statuses.map(ls => {
      const count = stats?.cases_by_legal_status?.find(c => c.legal_status === ls)?.count
      return { value: ls, label: t(`legalStatuses.${ls}`), count }
    }).filter(ls => ls.count == null || ls.count > 0)
  }, [stats, t])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('pageSubhead')}
          </p>
          <h1
            style={{ fontFamily: 'var(--font-family-serif)' }}
            className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight"
          >
            {t('pageTitle')}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <ShareButton label={t('share')} />
          <CaseLeadButton />
        </div>
      </div>
      <p className="text-sm text-zinc-400 max-w-2xl mb-8 leading-relaxed">
        {t('hero.subhead')}
      </p>

      {/* ── Hero Section ── */}
      <HeroSection />

      {/* ── Filter bar: editorial chips ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[9px] font-mono font-bold tracking-[0.25em] uppercase text-zinc-600">
            {t('filterArchives')}
          </div>
          <div className="flex-1 h-px bg-zinc-800" />
          {hasFilters && (
            <button
              onClick={() => { setFilters({}); setSearch(null) }}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-amber-400 transition-colors font-mono"
            >
              <X className="h-3 w-3" />
              {t('filters.clearFilters')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center mb-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('filters.search')}
              className="pl-8 h-8 w-56 text-xs bg-zinc-900 border-zinc-800 rounded-full focus:border-amber-500/50 focus:ring-amber-500/20"
            />
            {search && (
              <button className="absolute right-2 top-2" onClick={() => setSearch(null)}>
                <X className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            )}
          </div>

          {/* Fraud type chips (top-level visible as pills) */}
          <DropdownChip
            label={t('filters.fraudType')}
            value={filters.fraud_type}
            options={fraudTypeOptions}
            onSelect={(v) => setFilters(f => ({ ...f, fraud_type: v as FraudType | undefined }))}
          />

          {/* Legal status chips */}
          <DropdownChip
            label={t('filters.legalStatus')}
            value={filters.legal_status}
            options={legalStatusOptions}
            onSelect={(v) => setFilters(f => ({ ...f, legal_status: v as LegalStatus | undefined }))}
          />

          {/* Administration dropdown chip */}
          <DropdownChip
            label={t('filters.administration')}
            value={filters.administration}
            options={['fox', 'calderon', 'epn', 'amlo', 'sheinbaum'].map(a => ({
              value: a,
              label: t(`administrations.${a}`),
            }))}
            onSelect={(v) => setFilters(f => ({ ...f, administration: v as Administration | undefined }))}
          />

          {/* Sector dropdown chip */}
          <DropdownChip
            label={t('filters.sector')}
            value={filters.sector_id != null ? String(filters.sector_id) : undefined}
            options={SECTORS.map(s => ({
              value: String(s.id),
              label: ts(s.code),
            }))}
            onSelect={(v) => setFilters(f => ({ ...f, sector_id: v != null ? Number(v) : undefined }))}
          />

          {/* Sort: pushed right */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="h-3 w-3 text-zinc-600 flex-shrink-0" />
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
              {t('sortBy')}:
            </span>
            {(['amount', 'year', 'severity'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                  sortMode === mode
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t(`sortOptions.${mode}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3 mb-4" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">{t('loadError')}</p>
            <p className="text-xs text-zinc-400">
              {t('loadErrorDetail')}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Results count + export */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 font-mono">
              {t('resultCount', { count: data.length })}
              {hasFilters && (
                <span className="text-zinc-600"> ({t('filteredSuffix')})</span>
              )}
            </p>
            <TableExportButton
              data={data.map(c => ({
                title: c.name_en,
                fraud_type: c.fraud_type,
                severity: c.severity,
                amount_min: c.amount_mxn_low ?? '',
                amount_max: c.amount_mxn_high ?? '',
                legal_status: c.legal_status,
              }))}
              filename="case-library"
            />
          </div>

          {data.length === 0 ? (
            /* ── Empty state: editorial, not generic ── */
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <Landmark className="h-12 w-12 text-zinc-700" />
              <div className="text-center max-w-md">
                <p className="text-base font-medium text-zinc-300 mb-2">{t('noResults')}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {search
                    ? t('noResultsExplain', { query: search })
                    : t('noResultsHint')
                  }
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-full border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30"
                onClick={() => { setFilters({}); setSearch(null) }}
              >
                <X className="h-3 w-3 mr-1" /> {t('filters.clearFilters')}
              </Button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {data.map((cas, idx) => (
                <CaseCard
                  key={cas.id}
                  cas={cas}
                  index={idx}
                  onClick={() => navigate(`/cases/${cas.slug}`)}
                  onNavigate={navigate}
                />
              ))}
            </motion.div>
          )}
        </>
      )}

      <CitationBlock context="43 documented corruption cases" className="mt-2" />
    </div>
  )
}
