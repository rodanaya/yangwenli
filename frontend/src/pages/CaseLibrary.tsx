import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { caseLibraryApi } from '@/api/client'
import type { ScandalListItem, FraudType, Administration, LegalStatus, CaseLibraryParams } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Search, X } from 'lucide-react'

// ── severity colour ──────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-yellow-500/20 text-yellow-400',
  3: 'bg-orange-500/20 text-orange-400',
  4: 'bg-red-500/20 text-red-400',
}

const LEGAL_STATUS_COLORS: Record<string, string> = {
  impunity: 'border-red-500/50 text-red-400',
  investigation: 'border-yellow-500/50 text-yellow-400',
  prosecuted: 'border-orange-500/50 text-orange-400',
  convicted: 'border-green-500/50 text-green-400',
  acquitted: 'border-blue-500/50 text-blue-400',
  dismissed: 'border-muted text-muted-foreground',
  unresolved: 'border-muted text-muted-foreground',
}

function formatMXN(n?: number | null): string {
  if (!n) return '?'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

// ── Case Card ────────────────────────────────────────────────────────────────
function CaseCard({ cas, onClick }: { cas: ScandalListItem; onClick: () => void }) {
  const { t, i18n } = useTranslation('cases')
  const name = i18n.language === 'es' ? cas.name_es : cas.name_en

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border/60 rounded-lg p-4 hover:border-accent/50 hover:bg-card/80 transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
          {name}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${SEVERITY_COLORS[cas.severity] ?? SEVERITY_COLORS[2]}`}>
          {t(`severity.${cas.severity}`)}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-text-muted line-clamp-2 mb-3">
        {cas.summary_en}
      </p>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {t(`fraudTypes.${cas.fraud_type}`)}
        </Badge>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${LEGAL_STATUS_COLORS[cas.legal_status] ?? ''}`}>
          {t(`legalStatuses.${cas.legal_status}`)}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {t(`administrations.${cas.administration}`)}
        </Badge>
        {cas.amount_mxn_low && (
          <span className="text-[10px] text-text-muted ml-auto font-mono">
            {formatMXN(cas.amount_mxn_low)}
            {cas.amount_mxn_high ? ` – ${formatMXN(cas.amount_mxn_high)}` : '+'}
          </span>
        )}
        {cas.ground_truth_case_id != null && (
          <span className="text-[10px] text-accent ml-auto font-mono">
            {t('card.mlLinked')}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const { t } = useTranslation('cases')
  const { data } = useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => caseLibraryApi.getStats(),
    staleTime: 10 * 60 * 1000,
  })

  const totalBn = data ? (data.total_amount_mxn_low / 1e9).toFixed(0) : '–'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: t('statsBar.totalCases'), value: data?.total_cases ?? '–' },
        { label: t('statsBar.totalAmount'), value: data ? `$${totalBn}B+` : '–' },
        { label: t('statsBar.gtLinked'), value: data?.gt_linked_count ?? '–' },
        { label: t('statsBar.compranetVisible'), value: data?.compranet_visible_count ?? '–' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-card border border-border/50 rounded-lg px-4 py-3">
          <div className="text-xl font-bold font-mono text-accent">{value}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CaseLibrary() {
  const { t } = useTranslation('cases')
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CaseLibraryParams>({})
  const [search, setSearch] = useState('')

  const queryParams: CaseLibraryParams = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search]
  )

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'list', queryParams],
    queryFn: () => caseLibraryApi.getAll(queryParams),
    staleTime: 5 * 60 * 1000,
  })

  const hasFilters = Object.values(queryParams).some(Boolean)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
      </div>

      <StatsBar />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filters.search')}
            className="pl-8 h-8 text-sm bg-card"
          />
          {search && (
            <button className="absolute right-2 top-2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 text-text-muted" />
            </button>
          )}
        </div>

        <Select
          value={filters.fraud_type ?? 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, fraud_type: v === 'all' ? undefined : v as FraudType }))}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
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
          <SelectTrigger className="w-[180px] h-8 text-xs bg-card">
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
          <SelectTrigger className="w-[170px] h-8 text-xs bg-card">
            <SelectValue placeholder={t('filters.legalStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all')}</SelectItem>
            {['investigation','prosecuted','convicted','acquitted','dismissed','impunity','unresolved'].map((ls) => (
              <SelectItem key={ls} value={ls}>{t(`legalStatuses.${ls}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-text-muted"
            onClick={() => { setFilters({}); setSearch('') }}
          >
            <X className="h-3 w-3 mr-1" /> {t('filters.clearFilters')}
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load cases.</span>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <p className="text-xs text-text-muted mb-3">{data.length} cases</p>
          {data.length === 0 ? (
            <div className="text-center py-16 text-text-muted">{t('noResults')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.map((cas) => (
                <CaseCard
                  key={cas.id}
                  cas={cas}
                  onClick={() => navigate(`/cases/${cas.slug}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
