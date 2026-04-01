import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { caseLibraryApi } from '@/api/client'
import type { ScandalListItem, FraudType, Administration, LegalStatus } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, X, AlertTriangle, Scale, TrendingUp, Building2, ExternalLink } from 'lucide-react'
import { SECTORS } from '@/lib/constants'
import { staggerContainer, staggerItem } from '@/lib/animations'

// ── Sector lookup ─────────────────────────────────────────────────────────────
const SECTOR_MAP = Object.fromEntries(SECTORS.map((s) => [s.id, s]))

function getSectorForIds(ids: number[]) {
  for (const id of ids) {
    if (SECTOR_MAP[id]) return SECTOR_MAP[id]
  }
  return SECTOR_MAP[12] // fallback: otros
}

// ── Fraud type config ─────────────────────────────────────────────────────────
const FRAUD_TYPE_COLORS: Record<string, string> = {
  ghost_company:        'bg-red-500/15 text-red-400 border-red-500/40',
  bid_rigging:          'bg-orange-500/15 text-orange-400 border-orange-500/40',
  overpricing:          'bg-amber-500/15 text-amber-400 border-amber-500/40',
  conflict_of_interest: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  embezzlement:         'bg-rose-500/15 text-rose-400 border-rose-500/40',
  bribery:              'bg-pink-500/15 text-pink-400 border-pink-500/40',
  procurement_fraud:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  monopoly:             'bg-blue-500/15 text-blue-400 border-blue-500/40',
  emergency_fraud:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/40',
  tender_rigging:       'bg-indigo-500/15 text-indigo-400 border-indigo-500/40',
  infrastructure_overrun: 'bg-stone-500/15 text-stone-400 border-stone-500/40',
  invoice_fraud:        'bg-lime-500/15 text-lime-400 border-lime-500/40',
  state_capture:        'bg-violet-500/15 text-violet-400 border-violet-500/40',
  cartel_infiltration:  'bg-red-900/30 text-red-300 border-red-700/50',
  other:                'bg-zinc-500/15 text-zinc-400 border-zinc-500/40',
}

// ── Legal status config ───────────────────────────────────────────────────────
const LEGAL_STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  convicted:   { color: 'text-emerald-400', icon: Scale },
  prosecuted:  { color: 'text-orange-400',  icon: Scale },
  investigation:{ color: 'text-yellow-400', icon: AlertTriangle },
  ongoing:     { color: 'text-yellow-400',  icon: AlertTriangle },
  settled:     { color: 'text-blue-400',    icon: Scale },
  impunity:    { color: 'text-red-400',     icon: AlertCircle },
  acquitted:   { color: 'text-zinc-400',    icon: Scale },
  dismissed:   { color: 'text-zinc-400',    icon: Scale },
  unresolved:  { color: 'text-zinc-500',    icon: AlertCircle },
}

// ── Amount formatting ─────────────────────────────────────────────────────────
function formatAmount(low?: number | null, high?: number | null): string {
  if (!low) return '—'
  const fmt = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
    return `$${n.toLocaleString()}`
  }
  return high ? `${fmt(low)}–${fmt(high)}` : `${fmt(low)}+`
}

// ── Scandal Card ──────────────────────────────────────────────────────────────
interface ScandalCardProps {
  scandal: ScandalListItem
  onOpen: () => void
  index: number
}

function ScandalCard({ scandal, onOpen }: ScandalCardProps) {
  const { t, i18n } = useTranslation('scandals')
  const { t: tc } = useTranslation('cases')

  const name = i18n.language === 'es' ? scandal.name_es : scandal.name_en
  const sectorIds = scandal.sector_ids?.length > 0 ? scandal.sector_ids : scandal.sector_id ? [scandal.sector_id] : []
  const sector = getSectorForIds(sectorIds)
  const fraudCls = FRAUD_TYPE_COLORS[scandal.fraud_type] ?? FRAUD_TYPE_COLORS.other
  const legalCfg = LEGAL_STATUS_CONFIG[scandal.legal_status] ?? LEGAL_STATUS_CONFIG.unresolved
  const LegalIcon = legalCfg.icon

  const yearLabel = scandal.contract_year_start
    ? scandal.contract_year_end && scandal.contract_year_end !== scandal.contract_year_start
      ? `${scandal.contract_year_start}–${scandal.contract_year_end}`
      : String(scandal.contract_year_start)
    : null

  const summaryText = scandal.summary_en?.slice(0, 160) + (scandal.summary_en?.length > 160 ? '…' : '')

  return (
    <motion.article
      variants={staggerItem}
      role="article"
      aria-label={name}
      className="group relative flex flex-col bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-md overflow-hidden transition-all duration-200 cursor-pointer"
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      tabIndex={0}
    >
      {/* Severity bar — top accent */}
      <div
        className="h-0.5 w-full flex-shrink-0"
        style={{ backgroundColor: sector.color }}
        aria-hidden="true"
      />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Top row: fraud type + sector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide ${fraudCls}`}
          >
            {tc(`fraudTypes.${scandal.fraud_type}`, { defaultValue: scandal.fraud_type })}
          </Badge>
          {sector && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
              style={{ color: sector.color, backgroundColor: `${sector.color}18` }}
            >
              <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
              {i18n.language === 'es' ? sector.name : sector.nameEN}
            </span>
          )}
          {yearLabel && (
            <span className="text-[10px] font-mono text-gray-400 ml-auto">{yearLabel}</span>
          )}
        </div>

        {/* Scandal name */}
        <h3
          className="text-sm font-bold text-gray-100 group-hover:text-white leading-snug"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {name}
        </h3>

        {/* Summary */}
        <p className="text-[11px] text-gray-400 leading-relaxed flex-1">
          {summaryText}
        </p>

        {/* Fraud amount — prominent */}
        {scandal.amount_mxn_low && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-base font-black font-mono text-orange-400 tracking-tight tabular-nums">
              {formatAmount(scandal.amount_mxn_low, scandal.amount_mxn_high)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">MXN</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-800 flex items-center justify-between gap-2 bg-gray-950/40">
        {/* Legal status */}
        <span
          className={`flex items-center gap-1 text-[10px] font-semibold ${legalCfg.color}`}
          aria-label={`${t('legalStatus')}: ${tc(`legalStatuses.${scandal.legal_status}`, { defaultValue: scandal.legal_status })}`}
        >
          <LegalIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          {tc(`legalStatuses.${scandal.legal_status}`, { defaultValue: scandal.legal_status })}
        </span>

        {/* Administration */}
        <span className="text-[10px] text-gray-500 font-mono">
          {tc(`administrations.${scandal.administration}`, { defaultValue: scandal.administration })}
        </span>

        {/* Open link */}
        <span className="flex items-center gap-1 text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors ml-auto">
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {t('viewCase')}
        </span>
      </div>
    </motion.article>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function ScandalsStatsBar({ data }: { data: ScandalListItem[] }) {
  const { t } = useTranslation('scandals')

  const totalFraud = data.reduce((sum, s) => sum + (s.amount_mxn_low ?? 0), 0)
  const sectorSet = new Set(data.flatMap((s) => s.sector_ids?.length ? s.sector_ids : s.sector_id ? [s.sector_id] : []))
  const impunityCount = data.filter((s) => s.legal_status === 'impunity').length
  const confirmedCount = data.filter((s) => s.ground_truth_case_id != null).length

  const stats = [
    { label: t('stats.totalCases'),    value: String(data.length),                         accent: true },
    { label: t('stats.estimatedFraud'), value: `$${(totalFraud / 1e9).toFixed(0)}B+`,       accent: true },
    { label: t('stats.sectorsAffected'), value: String(sectorSet.size),                    accent: false },
    { label: t('stats.impunityRate'),   value: `${Math.round((impunityCount / Math.max(data.length, 1)) * 100)}%`, accent: false },
    { label: t('stats.mlLinked'),       value: String(confirmedCount),                      accent: false },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 border border-gray-700 rounded-md overflow-hidden mb-6">
      {stats.map(({ label, value, accent }, i) => (
        <div
          key={label}
          className={`px-4 py-3 bg-gray-900 ${i > 0 ? 'border-l border-gray-700' : ''}`}
        >
          <div className={`text-xl font-black font-mono tabular-nums ${accent ? 'text-orange-400' : 'text-gray-100'}`}>
            {value}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-medium">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Fraud type breakdown bar ──────────────────────────────────────────────────
function FraudTypeBreakdown({ data }: { data: ScandalListItem[] }) {
  const { t } = useTranslation('scandals')
  const { t: tc } = useTranslation('cases')

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    data.forEach((s) => { map[s.fraud_type] = (map[s.fraud_type] ?? 0) + 1 })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [data])

  if (counts.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-2">{t('byFraudType')}</p>
      <div className="flex flex-wrap gap-1.5">
        {counts.map(([type, n]) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border ${FRAUD_TYPE_COLORS[type] ?? FRAUD_TYPE_COLORS.other}`}
          >
            {tc(`fraudTypes.${type}`, { defaultValue: type })}
            <span className="font-mono opacity-70">{n}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Filter Row ────────────────────────────────────────────────────────────────
interface Filters {
  fraud_type?: string
  administration?: string
  sector_id?: number
  legal_status?: string
}

function FilterRow({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const { t } = useTranslation('scandals')
  const { t: tc } = useTranslation('cases')
  const hasFilters = Object.values(filters).some((v) => v !== undefined)

  return (
    <div className="flex flex-wrap gap-2 items-center mb-6">
      <Select
        value={filters.fraud_type ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, fraud_type: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
          <SelectValue placeholder={tc('filters.fraudType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tc('filters.all')}</SelectItem>
          {['ghost_company','bid_rigging','overpricing','conflict_of_interest','embezzlement','bribery',
            'procurement_fraud','monopoly','emergency_fraud','tender_rigging',
            'infrastructure_overrun','invoice_fraud','state_capture','cartel_infiltration'].map((ft) => (
            <SelectItem key={ft} value={ft}>
              {tc(`fraudTypes.${ft}`, { defaultValue: ft })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.administration ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, administration: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[190px] h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
          <SelectValue placeholder={tc('filters.administration')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tc('filters.all')}</SelectItem>
          {['fox','calderon','epn','amlo','sheinbaum'].map((a) => (
            <SelectItem key={a} value={a}>{tc(`administrations.${a}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.legal_status ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, legal_status: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[170px] h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
          <SelectValue placeholder={tc('filters.legalStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tc('filters.all')}</SelectItem>
          {['investigation','prosecuted','convicted','acquitted','dismissed','impunity','unresolved','ongoing','settled'].map((ls) => (
            <SelectItem key={ls} value={ls}>
              {tc(`legalStatuses.${ls}`, { defaultValue: ls })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sector_id != null ? String(filters.sector_id) : 'all'}
        onValueChange={(v) => onChange({ ...filters, sector_id: v === 'all' ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-[150px] h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
          <SelectValue placeholder={tc('filters.sector')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tc('filters.all')}</SelectItem>
          {SECTORS.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.nameEN}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-gray-400 hover:text-gray-200"
          onClick={() => onChange({})}
        >
          <X className="h-3 w-3 mr-1" aria-hidden="true" />
          {tc('filters.clearFilters')}
        </Button>
      )}

      <span className="ml-auto text-[10px] font-mono text-gray-500">
        {t('filterHint')}
      </span>
    </div>
  )
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function ScandalsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-md bg-gray-800" />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Scandals() {
  const { t, i18n } = useTranslation('scandals')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filters from URL
  const filters: Filters = useMemo(() => ({
    fraud_type: searchParams.get('fraud_type') ?? undefined,
    administration: searchParams.get('administration') ?? undefined,
    sector_id: searchParams.get('sector_id') ? Number(searchParams.get('sector_id')) : undefined,
    legal_status: searchParams.get('legal_status') ?? undefined,
  }), [searchParams])

  function setFilters(next: Filters) {
    const params = new URLSearchParams()
    if (next.fraud_type)     params.set('fraud_type', next.fraud_type)
    if (next.administration) params.set('administration', next.administration)
    if (next.sector_id != null) params.set('sector_id', String(next.sector_id))
    if (next.legal_status)   params.set('legal_status', next.legal_status)
    setSearchParams(params, { replace: true })
  }

  const queryParams = useMemo(() => ({
    fraud_type: filters.fraud_type as FraudType | undefined,
    administration: filters.administration as Administration | undefined,
    sector_id: filters.sector_id,
    legal_status: filters.legal_status as LegalStatus | undefined,
  }), [filters])

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['scandals', queryParams],
    queryFn: () => caseLibraryApi.getAll(queryParams),
    staleTime: 5 * 60 * 1000,
  })

  // Sort: amount desc, then severity desc
  const data = useMemo(() => {
    if (!rawData) return rawData
    return [...rawData].sort((a, b) => {
      const diff = (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0)
      if (diff !== 0) return diff
      return b.severity - a.severity
    })
  }, [rawData])

  const pageTitle = i18n.language === 'es' ? t('pageTitleEs') : t('pageTitle')

  return (
    <main className="p-6 max-w-7xl mx-auto" aria-label={pageTitle}>
      {/* ── Editorial header ── */}
      <header className="mb-8">
        <div className="text-[10px] font-mono font-bold tracking-[0.35em] uppercase text-orange-500/70 mb-2">
          {t('pageSubhead')}
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black text-gray-100 leading-tight mb-2"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {pageTitle}
            </h1>
            <p className="text-sm text-gray-400 max-w-xl leading-relaxed">
              {t('pageDesc')}
            </p>
          </div>
          {/* Quick link to Case Library for full investigation files */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-8 text-xs border-gray-600 text-gray-300 hover:text-white hover:border-gray-400"
            onClick={() => navigate('/cases')}
            aria-label={t('goToCaseLibrary')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {t('goToCaseLibrary')}
          </Button>
        </div>
      </header>

      {/* ── Stats bar ── */}
      {data && <ScandalsStatsBar data={data} />}

      {/* ── Fraud type breakdown ── */}
      {data && <FraudTypeBreakdown data={data} />}

      {/* ── Filters ── */}
      <FilterRow filters={filters} onChange={setFilters} />

      {/* ── Results ── */}
      {isLoading && <ScandalsSkeleton />}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-sm text-red-400 p-4 bg-red-950/30 border border-red-800/50 rounded-md"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{t('loadError')}</span>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono text-gray-500">
              {t('resultCount', { count: data.length })}
            </p>
          </div>

          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500">
              <AlertTriangle className="h-10 w-10 opacity-30" aria-hidden="true" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">{t('noResults')}</p>
                <p className="text-xs mt-1 opacity-60">{t('noResultsHint')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-gray-700 text-gray-400"
                onClick={() => setFilters({})}
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                {t('clearFilters')}
              </Button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              role="list"
              aria-label={t('gridLabel')}
            >
              {data.map((scandal, idx) => (
                <ScandalCard
                  key={scandal.id}
                  scandal={scandal}
                  index={idx}
                  onOpen={() => navigate(`/cases/${scandal.slug}`)}
                />
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* ── Disclaimer ── */}
      <footer className="mt-10 pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 leading-relaxed max-w-2xl">
          {t('disclaimer')}
        </p>
      </footer>
    </main>
  )
}
