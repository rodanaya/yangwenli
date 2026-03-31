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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { TableExportButton } from '@/components/TableExportButton'
import { CaseLeadButton } from '@/components/CaseLeadDialog'
import { AlertCircle, Search, X, Eye, EyeOff, Activity, BarChart3, ArrowUpDown } from 'lucide-react'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'

// ── severity colour ──────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-accent-data/10 text-accent-data border border-accent-data/20',
  2: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/20',
  3: 'bg-risk-high/15 text-risk-high border border-risk-high/20',
  4: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/20',
}

// Severity labels are resolved via t('severity.N') in CaseCard

const LEGAL_STATUS_COLORS: Record<string, string> = {
  impunity: 'border-red-500/50 text-red-400',
  investigation: 'border-yellow-500/50 text-yellow-400',
  prosecuted: 'border-orange-500/50 text-orange-400',
  convicted: 'border-green-500/50 text-green-400',
  acquitted: 'border-blue-500/50 text-blue-400',
  dismissed: 'border-muted text-muted-foreground',
  unresolved: 'border-muted text-muted-foreground',
}

// ── fraud type colours (distinct hue per category) ───────────────────────────
const FRAUD_TYPE_COLORS: Record<string, string> = {
  ghost_company:       'border-red-500/60 text-red-400 bg-red-500/10',
  bid_rigging:         'border-orange-500/60 text-orange-400 bg-orange-500/10',
  overpricing:         'border-amber-500/60 text-amber-400 bg-amber-500/10',
  conflict_of_interest:'border-purple-500/60 text-purple-400 bg-purple-500/10',
  embezzlement:        'border-rose-500/60 text-rose-400 bg-rose-500/10',
  bribery:             'border-pink-500/60 text-pink-400 bg-pink-500/10',
  procurement_fraud:   'border-yellow-500/60 text-yellow-400 bg-yellow-500/10',
  monopoly:            'border-blue-500/60 text-blue-400 bg-blue-500/10',
  emergency_fraud:     'border-cyan-500/60 text-cyan-400 bg-cyan-500/10',
  tender_rigging:      'border-indigo-500/60 text-indigo-400 bg-indigo-500/10',
}

const FRAUD_TYPE_ACCENT: Record<string, string> = {
  ghost_company:       'border-l-red-500',
  bid_rigging:         'border-l-orange-500',
  overpricing:         'border-l-amber-500',
  conflict_of_interest:'border-l-purple-500',
  embezzlement:        'border-l-rose-500',
  bribery:             'border-l-pink-500',
  procurement_fraud:   'border-l-yellow-500',
  monopoly:            'border-l-blue-500',
  emergency_fraud:     'border-l-cyan-500',
  tender_rigging:      'border-l-indigo-500',
}

// ── Confidence badge (from is_verified: 0=medium, 1=high, 2=confirmed) ───────
const CONFIDENCE_CONFIG: Record<number, { key: string; cls: string }> = {
  0: { key: 'confidence.medium',    cls: 'border-zinc-500/50 text-zinc-400' },
  1: { key: 'confidence.high',      cls: 'border-blue-500/50 text-blue-400' },
  2: { key: 'confidence.confirmed', cls: 'border-emerald-500/50 text-emerald-400' },
}

// ── Sort types ────────────────────────────────────────────────────────────────
type SortMode = 'amount' | 'year' | 'severity'

// ── COMPRANET visibility config ───────────────────────────────────────────────
type CompranetVisibility = 'high' | 'partial' | 'invisible'

const COMPRANET_CONFIG: Record<CompranetVisibility, { icon: typeof Eye; cls: string; dotCls: string }> = {
  high:      { icon: Eye,    cls: 'text-green-400',  dotCls: 'bg-green-400' },
  partial:   { icon: Eye,    cls: 'text-yellow-400', dotCls: 'bg-yellow-400' },
  invisible: { icon: EyeOff, cls: 'text-text-muted', dotCls: 'bg-muted-foreground' },
}

function formatMXN(n?: number | null): string {
  if (!n) return '?'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

// ── Case Card — Evidence File ─────────────────────────────────────────────────
function CaseCard({ cas, onClick, onNavigate, index }: { cas: ScandalListItem; onClick: () => void; onNavigate: (path: string) => void; index: number }) {
  const { t, i18n } = useTranslation('cases')
  const name = i18n.language === 'es' ? cas.name_es : cas.name_en

  const isMLLinked = cas.ground_truth_case_id != null
  const visibility = (cas.compranet_visibility ?? 'invisible') as CompranetVisibility
  const visCfg = COMPRANET_CONFIG[visibility] ?? COMPRANET_CONFIG.invisible
  const VisIcon = visCfg.icon

  // Derive year display
  const yearLabel = cas.contract_year_start
    ? cas.contract_year_end && cas.contract_year_end !== cas.contract_year_start
      ? `${cas.contract_year_start}--${cas.contract_year_end}`
      : String(cas.contract_year_start)
    : null

  const leftBorder = FRAUD_TYPE_ACCENT[cas.fraud_type] ?? 'border-l-border'
  const caseNum = String(index + 1).padStart(3, '0')

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`relative group flex flex-col overflow-hidden rounded-sm border border-border/60 border-l-[4px] ${leftBorder} hover:border-border transition-all duration-200 bg-zinc-900 text-white`}
    >
      {/* Case number stamp */}
      <div
        className="absolute top-2 right-2 z-10 text-[9px] font-mono tracking-wider text-zinc-500 select-none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        N.{caseNum}
      </div>

      {/* ML training data banner */}
      {isMLLinked && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 border-b border-red-900/40">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: RISK_COLORS.high }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: RISK_COLORS.high }} />
          </span>
          <Activity className="h-3 w-3 text-accent flex-shrink-0" />
          <span className="text-[10px] font-semibold text-accent tracking-wide uppercase">
            {t('card.mlTrainingData')}
          </span>
        </div>
      )}

      {/* Clickable body */}
      <button
        onClick={onClick}
        className="w-full text-left flex-1 p-4 pt-3"
      >
        {/* Fraud type — prominent */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide ${FRAUD_TYPE_COLORS[cas.fraud_type] ?? ''}`}
          >
            {t(`fraudTypes.${cas.fraud_type}`)}
          </Badge>
          {/* Severity as damage level */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${SEVERITY_COLORS[cas.severity] ?? SEVERITY_COLORS[2]}`}>
            {t(`severity.${cas.severity}`)}
          </span>
        </div>

        {/* Case name */}
        <h3
          className="text-sm font-bold text-zinc-100 group-hover:text-accent transition-colors leading-snug mb-1.5 pr-10"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {name}
        </h3>

        {/* Summary */}
        <p className="text-[11px] text-zinc-400 line-clamp-4 mb-3 leading-relaxed">
          {cas.summary_en}
        </p>

        {/* KPI row */}
        <div className="flex items-center gap-2 mb-3 text-[10px] text-zinc-400 font-mono">
          {yearLabel && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">&#x29D7;</span>
              {yearLabel}
            </span>
          )}
          {yearLabel && <span className="opacity-30">|</span>}
          <span className={`flex items-center gap-1 ${visCfg.cls}`} title={t(`compranetVisibility.${visibility}`)}>
            <VisIcon className="h-3 w-3" />
            {visibility === 'high' ? t('card.compranetFull')
              : visibility === 'partial' ? t('card.compranetPartial')
              : t('card.compranetInvisible')}
          </span>
          {cas.amount_mxn_low && (
            <>
              <span className="opacity-30">|</span>
              <span className="ml-auto font-bold text-zinc-300">
                {formatMXN(cas.amount_mxn_low)}
                {cas.amount_mxn_high ? `--${formatMXN(cas.amount_mxn_high)}` : '+'}
              </span>
            </>
          )}
        </div>

        {/* Bottom pill row: legal status + confidence */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${LEGAL_STATUS_COLORS[cas.legal_status] ?? ''}`}>
            {t(`legalStatuses.${cas.legal_status}`)}
          </Badge>
          {(() => {
            const conf = CONFIDENCE_CONFIG[cas.is_verified] ?? CONFIDENCE_CONFIG[0]
            return (
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${conf.cls}`}>
                {t(conf.key)}
              </Badge>
            )
          })()}
        </div>
      </button>

      {/* Footer: primary CTA + quick-link actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 gap-2 bg-zinc-950/50">
        {/* Primary CTA: View Full Investigation */}
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          {t('card.viewInvestigation')}
        </button>
        <div className="flex items-center gap-1.5">
          {/* View contracts filtered to this case's sector + year */}
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
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-accent border border-zinc-700 hover:border-accent/50 rounded px-2 py-1 transition-colors"
              title={t('card.viewDetail')}
            >
              <Search className="h-3 w-3" />
              {t('card.contractsLink')}
            </button>
          )}
          {/* View spending categories for this sector */}
          {cas.sector_ids?.[0] && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(`/categories?sector_id=${cas.sector_ids[0]}`)
              }}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-accent border border-zinc-700 hover:border-accent/50 rounded px-2 py-1 transition-colors"
              title={t('card.categoriesLink')}
            >
              <BarChart3 className="h-3 w-3" />
              {t('card.categoriesLink')}
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
    </motion.div>
  )
}

// ── Dossier Hero (Stats Banner) ───────────────────────────────────────────────
function DossierHero() {
  const { t } = useTranslation('cases')
  const { data } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const totalBn = data ? (data.total_amount_mxn_low / 1e9).toFixed(0) : '--'
  const totalCases = data?.total_cases ?? '--'

  return (
    <div className="mb-8">
      {/* Hero headline — dossier style */}
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="relative overflow-hidden rounded-sm border border-red-900/40 bg-red-950/20 px-6 py-5 mb-4"
      >
        {/* Decorative corner rule */}
        <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
        <div className="pl-4">
          <div className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase text-red-400/70 mb-2">
            {t('pageSubhead')}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="text-3xl sm:text-4xl font-black font-mono text-red-500 tabular-nums"
              aria-label={`${totalCases} documented cases`}
            >
              {totalCases}
            </span>
            <span className="text-base font-semibold text-text-secondary">
              {t('statsBar.totalCases')}
            </span>
            <span className="text-text-muted/40 hidden sm:inline">·</span>
            <span
              className="text-3xl sm:text-4xl font-black font-mono text-red-500 tabular-nums"
              aria-label={`$${totalBn}B+ estimated losses`}
            >
              {data ? `$${totalBn}B+` : '--'}
            </span>
            <span className="text-base font-semibold text-text-secondary">
              {t('statsBar.totalAmount')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Secondary stats */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-border/60 rounded-sm overflow-hidden"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {[
          { label: t('statsBar.totalCases'), value: totalCases, accent: true },
          { label: t('statsBar.totalAmount'), value: data ? `$${totalBn}B+` : '--', accent: true },
          { label: t('statsBar.vendorsIdentified'), value: data?.gt_linked_count != null ? `${data.gt_linked_count}+` : '--', accent: false },
          { label: t('statsBar.compranetVisible'), value: data?.compranet_visible_count ?? '--', accent: false },
        ].map(({ label, value, accent }, i) => (
          <motion.div
            key={label}
            variants={slideUp}
            className={`px-4 py-3 border-l-[3px] bg-background-elevated ${accent ? 'border-l-red-500' : 'border-l-border'} ${i > 0 ? 'sm:border-t-0 border-t border-border/40' : ''}`}
          >
            <div className={`text-xl font-black font-mono tracking-tight ${accent ? 'text-red-500' : 'text-text-primary'}`}>
              {value}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider font-medium">{label}</div>
          </motion.div>
        ))}
      </motion.div>

      <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
        {t('caseCount.explanation')}
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <a
          href="https://www.sat.gob.mx/consultas/76674/consulta-la-lista-de-contribuyentes-con-operaciones-no-localizadas-o-inexistentes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-accent text-xs underline"
        >
          {t('sources.efosList')} ↗
        </a>
        <a
          href="https://www.gob.mx/sfp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-accent text-xs underline"
        >
          {t('sources.sfpSanctions')} ↗
        </a>
        <a
          href="https://www.asf.gob.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-accent text-xs underline"
        >
          {t('sources.asfAudits')} ↗
        </a>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  // Sort by selected mode; severity + ML-linked as tiebreakers.
  const data = useMemo(() => {
    if (!rawData) return rawData
    return [...rawData].sort((a, b) => {
      // Primary key by sortMode
      if (sortMode === 'amount') {
        const aAmt = a.amount_mxn_low ?? 0
        const bAmt = b.amount_mxn_low ?? 0
        if (bAmt !== aAmt) return bAmt - aAmt
      } else if (sortMode === 'year') {
        const aYr = a.contract_year_start ?? 0
        const bYr = b.contract_year_start ?? 0
        if (bYr !== aYr) return bYr - aYr
      } else if (sortMode === 'severity') {
        if (b.severity !== a.severity) return b.severity - a.severity
      }
      // Secondary: severity descending
      if (b.severity !== a.severity) return b.severity - a.severity
      // Tertiary: ML-linked first
      const aLinked = a.ground_truth_case_id != null ? 1 : 0
      const bLinked = b.ground_truth_case_id != null ? 1 : 0
      return bLinked - aLinked
    })
  }, [rawData, sortMode])

  const hasFilters = Object.values(queryParams).some(Boolean)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <div className="border-b border-border pb-6 mb-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-semibold mb-2">
              {t('pageSubhead')}
            </div>
            <h1
              style={{ fontFamily: 'var(--font-family-serif)' }}
              className="text-2xl font-bold text-text-primary mb-2"
            >
              {t('pageTitle')}
            </h1>
            <p className="text-sm text-text-secondary max-w-lg">
              {t('pageDesc', { count: data?.length ?? 0 })}
            </p>
          </div>
          <CaseLeadButton className="shrink-0" />
        </div>
      </div>

      {/* Spacing after header */}
      <div className="h-6" />

      {/* ── Dossier Hero ── */}
      <DossierHero />

      {/* ── Filters: FILTRAR ARCHIVOS ── */}
      <div className="mb-6">
        <div className="text-[9px] tracking-[0.25em] uppercase text-text-muted font-bold mb-2">
          {t('filterArchives')}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <Input
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('filters.search')}
              className="pl-8 h-8 text-sm bg-card border-border/60"
            />
            {search && (
              <button className="absolute right-2 top-2" onClick={() => setSearch(null)}>
                <X className="h-3.5 w-3.5 text-text-muted" />
              </button>
            )}
          </div>

          <Select
            value={filters.fraud_type ?? 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, fraud_type: v === 'all' ? undefined : v as FraudType }))}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs bg-card border-border/60">
              <SelectValue placeholder={t('filters.fraudType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {['ghost_company','bid_rigging','overpricing','conflict_of_interest','embezzlement','bribery','procurement_fraud','monopoly','emergency_fraud','tender_rigging'].map((ft) => (
                <SelectItem key={ft} value={ft}>{t(`fraudTypes.${ft}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.administration ?? 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, administration: v === 'all' ? undefined : v as Administration }))}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border/60">
              <SelectValue placeholder={t('filters.administration')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {['fox','calderon','epn','amlo','sheinbaum'].map((a) => (
                <SelectItem key={a} value={a}>{t(`administrations.${a}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.legal_status ?? 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, legal_status: v === 'all' ? undefined : v as LegalStatus }))}
          >
            <SelectTrigger className="w-[170px] h-8 text-xs bg-card border-border/60">
              <SelectValue placeholder={t('filters.legalStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {['investigation','prosecuted','convicted','acquitted','dismissed','impunity','unresolved'].map((ls) => (
                <SelectItem key={ls} value={ls}>{t(`legalStatuses.${ls}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sector_id != null ? String(filters.sector_id) : 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, sector_id: v === 'all' ? undefined : Number(v) }))}
          >
            <SelectTrigger className="w-[150px] h-8 text-xs bg-card border-border/60">
              <SelectValue placeholder={t('filters.sector')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{ts(s.code)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="h-3 w-3 text-text-muted flex-shrink-0" />
            <Select
              value={sortMode}
              onValueChange={(v) => setSortMode(v as SortMode)}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs bg-card border-border/60">
                <SelectValue placeholder={t('sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">{t('sortOptions.amount')}</SelectItem>
                <SelectItem value="year">{t('sortOptions.year')}</SelectItem>
                <SelectItem value="severity">{t('sortOptions.severity')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-text-muted"
              onClick={() => { setFilters({}); setSearch(null) }}
            >
              <X className="h-3 w-3 mr-1" /> {t('filters.clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-sm" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{t('loadError')}</span>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-text-muted font-mono">
              {t('resultCount', { count: data.length })} &middot; {t('sortBy')}: {t(`sortOptions.${sortMode}`)}
            </p>
            <TableExportButton
              data={data.map((c) => ({
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
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
              <Search className="h-10 w-10 opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium">{t('noResults')}</p>
                <p className="text-xs mt-1 opacity-70">{t('noResultsHint')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
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
    </div>
  )
}
