/**
 * Institution Transparency League
 *
 * League-table style ranking of 2,563 scored institutions by their
 * overall transparency score (0-100) derived from 5 pillars:
 *   Openness, Price, Vendors, Process, External Alerts
 *
 * 5-tier system (i18n-aware):
 *   Excelente/Excellent, Satisfactorio/Satisfactory, Regular/Adequate,
 *   Deficiente/Deficient, Critico/Critical
 *
 * Editorial dark-mode design: warm-stone palette, prominent numeric scores,
 * crimson accent for accountability.
 */

import React, { useMemo, useCallback, lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  TIER_STYLES,
  TIER_GRADE_MAP,
  TIER_NAMES,
  gradeToTierKey,
  type TierKey,
  type TierStyle,
} from '@/lib/tiers'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Act } from '@/components/layout/Act'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trophy,
  Flag,
  ExternalLink,
} from 'lucide-react'
import { scorecardApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS, getSectorName } from '@/lib/constants'
import {
  INSTITUTION_PILLARS,
  pillarLabel,
} from '@/lib/institution-pillars'
import { formatNumber, formatDualCurrency, formatCompactMXN } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import { usePublishSiblingList, useOriginRowFlash } from '@/lib/nav/wayfinding'
import { PageFooter } from '@/components/layout/PageFooter'
import { useLeagueField } from '@/hooks/useLeagueField'
import { SpectralRegister, SpectralRegisterUnavailableNote } from '@/components/institution/SpectralRegister'
import { PillarBoleta, getWeakestPillar, pillarDeficitColor } from '@/components/institution/PillarBoleta'

// Reverse-lookup: sector display name (Spanish or English) → canonical code,
// so we can resolve a SECTOR_COLORS swatch from the `sector_name` returned by
// the scorecards API (which sends the localized name_es, not the code).
const SECTOR_NAME_TO_CODE: Record<string, string> = SECTORS.reduce<Record<string, string>>(
  (acc, s) => {
    acc[s.name.toLowerCase()] = s.code
    acc[s.nameEN.toLowerCase()] = s.code
    acc[s.code.toLowerCase()] = s.code
    return acc
  },
  {},
)

function getSectorColorFromName(sectorName: string | null | undefined): string {
  if (!sectorName) return SECTOR_COLORS.otros
  const code = SECTOR_NAME_TO_CODE[sectorName.toLowerCase()] ?? 'otros'
  return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
}

// The scorecards API returns the localized ES `sector_name` (name_es). Resolve
// it back to a sector code so we can render the locale-correct label via
// getSectorName(code, lang) — never the raw Spanish string on the EN locale.
function localizedSectorName(sectorName: string | null | undefined, lang: string): string {
  if (!sectorName) return ''
  const code = SECTOR_NAME_TO_CODE[sectorName.toLowerCase()] ?? 'otros'
  return getSectorName(code, lang === 'es' ? 'es' : 'en')
}

const ReportCard = lazy(() => import('./ReportCard'))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstitutionScorecardItem {
  institution_id: number
  institution_name: string
  ramo_code: number | null
  sector_name: string | null
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  pillar_openness: number
  pillar_price: number
  pillar_vendors: number
  pillar_process: number
  pillar_external: number
  top_risk_driver: string | null
  confidence_band: string | null
  p90_risk_score: number | null
  trend_direction: string | null
  peer_percentile_sector: number | null
  signal_count_red: number | null
  money_at_risk_mxn: number | null
  total_contracts: number | null
}

interface ScorecardListResponse {
  data: InstitutionScorecardItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
  grade_distribution: Record<string, number>
}

interface InstitutionStats {
  total_scored: number
  median_score: number
  top_institution_id: number | null
  top_institution_name: string | null
  top_institution_score: number | null
  worst_institution_id: number | null
  worst_institution_name: string | null
  worst_institution_score: number | null
  grade_distribution: Record<string, number>
}

type SortKey =
  | 'total_score'
  | 'national_percentile'
  | 'institution_name'
  | 'money_at_risk'
  | 'pillar_openness'
  | 'pillar_price'
  | 'pillar_vendors'
  | 'pillar_process'
  | 'pillar_external'

// 5-tier color system imported from lib/tiers (shared across institution surfaces).
// Local TierInfo extends TierStyle with the i18n label resolved at consumption time.
interface TierInfo extends TierStyle {
  label: string
}

/** Hook that returns an i18n-aware tier-info resolver. */
function useTierInfo() {
  const { t } = useTranslation('institutionleague')
  return useCallback((grade: string): TierInfo => {
    const key = gradeToTierKey(grade)
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

/** Hook that returns the full TierInfo for a given tier key. */
function useTierByKey() {
  const { t } = useTranslation('institutionleague')
  return useCallback((key: TierKey): TierInfo => {
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: string | null }) {
  const { t } = useTranslation('institutionleague')
  if (direction === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-accent-data" aria-label={t('trend.improving')} />
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-risk-critical" aria-label={t('trend.declining')} />
  return <Minus className="h-3.5 w-3.5 text-text-muted" aria-label={t('trend.stable')} />
}

/**
 * Weak-pillar cell — the single legible fact that replaced PillarSparkBars'
 * five illegible 14px heat cells. `{letter} {v}/{max}`, deficit-band colored.
 */
function WeakPillarCell({ item }: { item: InstitutionScorecardItem }) {
  const { i18n } = useTranslation('institutionleague')
  const lang = i18n.language
  const weakest = getWeakestPillar(item, lang)
  const color = pillarDeficitColor(weakest.frac)
  return (
    <span
      className="font-mono text-[13px] tabular-nums whitespace-nowrap"
      style={{ color }}
      title={weakest.label}
    >
      {weakest.pillar.letter} {weakest.value.toFixed(0)}/{weakest.pillar.max}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ChampionCard — editorial "honor roll" card for top performers
// Gold accent, score as the visual anchor, verdict-style tier badge
// ---------------------------------------------------------------------------

function ChampionCard({
  rank,
  item,
  onNavigate,
}: {
  rank: number
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierInfo()
  const tier = getTier(item.grade)
  const sectorColor = getSectorColorFromName(item.sector_name)

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className="relative w-full text-left group transition-colors flex items-center gap-4 px-3 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-background-elevated/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      aria-label={t('podiumAriaLabel', { rank, name: item.institution_name, score: item.total_score })}
    >
      {/* Rank — quiet mono caption */}
      <span
        className="text-[13px] font-mono font-bold tabular-nums w-6 flex-shrink-0 text-text-muted"
      >
        {rank}
      </span>

      {/* Institution name — full name, wraps to 2 lines; demoted weight */}
      <span className="flex-1 min-w-0 whitespace-normal break-words leading-tight text-text-secondary text-[13px] group-hover:text-text-primary transition-colors">
        {formatEntityName('institution', item.institution_name, 'full')}
      </span>

      {/* Sector dot */}
      {item.sector_name && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: sectorColor }}
          title={item.sector_name}
        />
      )}

      {/* Score — tabular mono */}
      <span className="font-mono tabular-nums text-[13px] text-text-muted flex-shrink-0 w-12 text-right">
        {item.total_score.toFixed(1)}
      </span>

      {/* Tier — caption mono in tier color (no big italic) */}
      <span
        className="text-[13px] font-mono font-bold uppercase tracking-[0.12em] flex-shrink-0 w-24 text-right"
        style={{ color: tier.color }}
      >
        {tier.label}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ActaCard — «Las Actas»: the verdict card for bottom performers.
// Keeps the 60px EB Garamond rank numeral (the best thing on the
// page); replaces PillarSparkBars + RiskDriverPill with a single computed
// worst-pillar deficit line, merged with the prosecutorial fields the API
// returns but no surface previously rendered (peer_percentile_sector,
// money_at_risk_mxn, signal_count_red).
// ---------------------------------------------------------------------------

function ActaCard({
  rank,
  item,
  onNavigate,
}: {
  rank: number
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}) {
  const { t, i18n } = useTranslation('institutionleague')
  const lang = i18n.language
  const getTier = useTierInfo()
  const tier = getTier(item.grade)
  const sectorColor = getSectorColorFromName(item.sector_name)
  const weakest = getWeakestPillar(item, lang)
  const weakestColor = pillarDeficitColor(weakest.frac)

  const agateParts: string[] = [
    t('weakestPillarLine', { label: weakest.label, value: weakest.value.toFixed(0), max: weakest.pillar.max }),
  ]
  if (item.peer_percentile_sector != null) {
    agateParts.push(t('peerPercentileLine', { pct: Math.round((1 - item.peer_percentile_sector) * 100) }))
  }
  if (item.money_at_risk_mxn != null) {
    agateParts.push(t('moneyAtRiskLine', { money: formatCompactMXN(item.money_at_risk_mxn) }))
  }
  if (item.signal_count_red != null) {
    agateParts.push(t('redSignalsLine', { n: item.signal_count_red }))
  }

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className="relative w-full text-left group transition-all
        border border-border bg-background-elevated/40
        hover:bg-risk-critical/8
        hover:border-risk-critical/40
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-risk-critical)]/50"
      style={{
        borderLeft: '4px solid var(--color-risk-critical)',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      }}
      aria-label={t('rowAriaLabel', { rank, name: item.institution_name, score: item.total_score, tier: tier.label })}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4">

        {/* Rank — cinematic Playfair numeral, left-anchored */}
        <div className="flex items-baseline gap-2 min-w-[58px]">
          <span
            className="leading-none tabular-nums"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontStyle: 'normal',
              fontSize: '60px',
              color: 'var(--color-risk-critical)',
              letterSpacing: '-0.04em',
            }}
          >
            {rank}
          </span>
        </div>

        {/* Identity column — institution name in Garamond italic, sector chip below */}
        <div className="min-w-0 flex flex-col gap-1.5">
          <p
            className="text-text-primary leading-snug line-clamp-2"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '18px',
              letterSpacing: '-0.005em',
            }}
          >
            {formatEntityName('institution', item.institution_name, 'full')}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier verdict pill — inline */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-mono font-bold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: `color-mix(in srgb, ${tier.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${tier.color} 35%, transparent)`,
                color: tier.color,
              }}
            >
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: tier.color }}
              />
              {tier.label}
            </span>
            <span className="text-text-muted text-[12px] font-mono tabular-nums tracking-wide">
              {item.total_score.toFixed(1)}<span className="opacity-50"> / 100</span>
            </span>
            {item.sector_name && (
              <span
                className="text-[13px] font-mono uppercase tracking-[0.12em] truncate flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sectorColor }}
                />
                {localizedSectorName(item.sector_name, lang)}
              </span>
            )}
          </div>
          {/* Worst-pillar deficit line — merges the old top_risk_driver pill
              and the five-cell PillarSparkBars into one computed, legible fact,
              plus the peer-percentile / money-at-risk / red-signal agate. */}
          <p
            className="text-[13px] font-mono tracking-wide leading-relaxed"
            style={{ color: weakestColor }}
          >
            {agateParts.join(' · ')}
          </p>
        </div>

        {/* Trailing affordance — trend + chevron, sits at far right */}
        <div className="flex items-center gap-2 flex-shrink-0 text-text-muted">
          <TrendIcon direction={item.trend_direction} />
          <ChevronRight className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
      </div>
    </button>
  )
}


// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = '',
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  className?: string
}) {
  const { t } = useTranslation('institutionleague')
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-text-primary transition-colors ${active ? 'text-accent-data' : 'text-text-muted'} ${className}`}
      aria-label={t('sortAriaLabel', { label })}
    >
      <span className="text-[12px] font-mono font-bold tracking-[0.1em] uppercase">{label}</span>
      {active ? (
        currentDir === 'desc' ? (
          <ArrowDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 flex-shrink-0 opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstitutionLeague() {
  const { t, i18n } = useTranslation('institutionleague')
  const lang = i18n.language
  // Canonical pillar legend (letter = concept), bilingual tooltip.
  const pillarLegendTitle = INSTITUTION_PILLARS
    .map((p) => `${p.letter}=${pillarLabel(p, lang)}`)
    .join(' · ')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const getTier = useTierInfo()
  const getTierByKey = useTierByKey()

  // Filter / sort state from URL
  const page = Number(searchParams.get('page') || 1)
  const sectorFilter = searchParams.get('sector') || ''
  const gradeFilter = searchParams.get('grade') || ''
  const search = searchParams.get('q') || ''
  const sortBy = (searchParams.get('sort') || 'total_score') as SortKey
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  // Scope — Federal (validated is_federal classifier, default) vs the separate
  // Subnational board (state/municipal), never co-mingled. `all` includes both.
  // Legacy `all=1` links map to the All scope.
  const scope = (searchParams.get('scope')
    || (searchParams.get('all') === '1' ? 'all' : 'federal')) as 'federal' | 'subnational' | 'all'
  // Reliability gate: the headline (Honor Roll / Red Flags) excludes tiny-sample
  // institutions whose scores are noise; the full table still lists everyone.
  const RELIABLE_MIN = 30
  const PER_PAGE = 50

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k)
        else next.set(k, v)
      })
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      updateParams({ order: sortOrder === 'desc' ? 'asc' : 'desc', page: '1' })
    } else {
      updateParams({ sort: key, order: 'desc', page: '1' })
    }
  }

  // Data fetching — every query is federal-aware so the headline numbers
  // (median, total_scored, top/worst) match the table population below.
  const { data: statsData } = useQuery<InstitutionStats>({
    queryKey: ['institution-scorecard-stats', scope],
    queryFn: () => scorecardApi.getInstitutionStats({ scope }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: listData, isLoading, isError } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards', scope, page, sectorFilter, gradeFilter, search, sortBy, sortOrder],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
        order: sortOrder,
        grade: gradeFilter || undefined,
        sector: sectorFilter || undefined,
        search: search || undefined,
        scope,
      }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Top 5 champions — reliability-gated (>=30 contracts) so tiny-sample noise
  // does not headline the Honor Roll.
  const { data: championsData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-top5', scope],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 5, sort_by: 'total_score', order: 'desc', scope, min_contracts: RELIABLE_MIN }),
    staleTime: 30 * 60 * 1000,
  })

  // Bottom 5 red flags — reliability-gated, the editorial lead.
  const { data: redFlagsData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-bottom5', scope],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 5, sort_by: 'total_score', order: 'asc', scope, min_contracts: RELIABLE_MIN }),
    staleTime: 30 * 60 * 1000,
  })

  // Top 5 by Money-at-Risk — the EXPOSURE lens (the outliers the integrity
  // score structurally cannot rank). Reliability-gated.
  const { data: exposureData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-var', scope],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 5, sort_by: 'money_at_risk', order: 'desc', scope, min_contracts: 100 }),
    staleTime: 30 * 60 * 1000,
  })

  const championItems = championsData?.data ?? []
  const redFlagItems = redFlagsData?.data ?? []
  const exposureItems = exposureData?.data ?? []

  // Row expansion for pillar radar
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  // Act III "Methodology" collapsible — closed by default to keep the page lean
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const items = listData?.data ?? []
  const total = listData?.total ?? 0
  const totalPages = listData?.total_pages ?? 1

  // Row rank calculation: rank of first item on current page
  const firstItemRank = (page - 1) * PER_PAGE + 1

  // ── Wayfinding (El Hilo P1+) — publish the current league page as the
  // institution sibling list (Prev/Next steps within the loaded page, honouring
  // the active sort/filter); flash the origin row on browser-back. backTo
  // carries the page + filters so "back" restores this exact view.
  const leagueSearch = searchParams.toString()
  usePublishSiblingList(
    items.length
      ? {
          kind: 'institution',
          items: items.map((it) => ({ id: String(it.institution_id), label: it.institution_name })),
          backTo: leagueSearch ? `/institutions?${leagueSearch}` : '/institutions',
          backLabel: lang?.startsWith('es') ? 'el ranking' : 'the ranking',
        }
      : null,
  )
  useOriginRowFlash('institution', items.length > 0)

  // Whether filters are active (don't show podium when filtered)
  const hasFilters = !!(sectorFilter || gradeFilter || search)

  // Editorial headline from stats
  const editorialHeadline = useMemo(() => {
    if (!statsData?.grade_distribution) return null
    const dist = statsData.grade_distribution
    const totalScored = statsData.total_scored
    const aboveB = (dist['S'] ?? 0) + (dist['A'] ?? 0) + (dist['B+'] ?? 0) + (dist['B'] ?? 0)
    const aboveBPct = totalScored > 0 ? ((aboveB / totalScored) * 100).toFixed(0) : '0'
    const failingCount = (dist['F'] ?? 0) + (dist['F-'] ?? 0)
    if (failingCount > 0) {
      return t('finding.critical', { pct: aboveBPct, failing: failingCount })
    }
    return t('finding.normal', { pct: aboveBPct, total: formatNumber(totalScored) })
  }, [statsData, t])

  // "At-risk" headline stat = the bottom two tiers (Deficiente D/D- + Crítico
  // F/F-). Under the reformed ABSOLUTE grades no federal buyer reaches the
  // Crítico floor, so counting only F/F- would read a misleading "0"; the
  // honest figure is everyone graded Deficient or worse.
  const failingCount = useMemo(() => {
    const d = statsData?.grade_distribution
    if (!d) return 0
    return (d['D'] ?? 0) + (d['D-'] ?? 0) + (d['F'] ?? 0) + (d['F-'] ?? 0)
  }, [statsData])

  // Excelente headcount (tier S+A) — drives the plate's empty-band annotation
  // and the computed headline (none-reaches vs only-N-reach).
  const excelenteCount = useMemo(() => {
    const d = statsData?.grade_distribution
    if (!d) return 0
    const grades = TIER_GRADE_MAP['Excelente'] ?? []
    return grades.reduce((sum, g) => sum + (d[g] ?? 0), 0)
  }, [statsData])

  // Top-exposure institution for the lede (highest money-at-risk).
  const topExposure = exposureItems[0]

  // Full federal field for the Spectral Register plate (paged, federal-only).
  const { data: fieldData } = useLeagueField(scope)

  const sectorOptions = useMemo(
    () => SECTORS.map((s) => ({ value: s.code, label: s.name })),
    [],
  )

  // Map current gradeFilter (backend grade value like "S") back to its tier name for display
  const activeTierName = useMemo(() => {
    if (!gradeFilter) return ''
    for (const [tierName, grades] of Object.entries(TIER_GRADE_MAP)) {
      if (grades.includes(gradeFilter)) return tierName
    }
    return ''
  }, [gradeFilter])

  // Only 'ranking' and 'reporte' are valid tabs (the legacy 'fichas'/Scorecards
  // tab was retired Day-11 — redundant with the Ranking row-expand). Any unknown
  // tab value (e.g. a stale ?tab=fichas bookmark) normalizes to ranking so the
  // TabBar always reflects a valid tab.
  const tabParam = searchParams.get('tab') || ''
  const activeTab = ['ranking', 'reporte'].includes(tabParam) ? tabParam : 'ranking'
  const setTab = (tab: string) => updateParams({ tab, page: undefined })

  if (activeTab === 'reporte') {
    return (
      <div className="min-h-screen bg-background text-text-primary">
        <TabBar activeTab={activeTab} setTab={setTab} />
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-text-muted text-sm">{t('loadingShort')}</div>}>
            <ReportCard />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  const totalInstitutions = statsData?.total_scored ?? 0

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <TabBar activeTab={activeTab} setTab={setTab} />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-6">
        {/* Utility header — same pattern as /aria, /workspace, /cases,
            /sectors. Institution Ranking is a working surface
            (compare 100+ institutions, drill into one). */}
        <header className="mb-5 pb-4 border-b border-border">
          {/* Folio strip — archival eyebrow matching /aria, /atlas pattern.
              "Folio·VII" anchors this page in the broader RUBLI catalog;
              the ranking is a section of an ongoing accountability series,
              not a standalone tool. */}
          <div
            className="mb-3 flex items-center gap-3"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '12px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 500 }}>
              Folio·VII
            </span>
            <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'normal', fontWeight: 300 }}>
              {t('kicker')}
            </span>
            <span aria-hidden style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontStyle: 'normal', fontWeight: 300 }}>{t('meta')}</span>
          </div>
          {/* Asymmetric editorial hero — narrative measure on the left, a
              bordered scorecard rail on the right. Replaces the old layout
              where narrow text + a full-width triptych left the entire right
              half of the xl container as dead space. */}
          <div
            className="mt-1 grid gap-x-12 gap-y-6 items-start lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"
            role="group"
            aria-label={t('statsAriaLabel')}
          >
            <div>
              <h1
                className="text-text-primary"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.012em',
                }}
              >
                {excelenteCount === 0 ? (
                  <>
                    {t('headline.beforeNone', { total: formatNumber(totalInstitutions) })}
                    <span style={{ color: 'var(--color-accent)' }}>{t('headline.accentNone')}</span>
                    {t('headline.afterNone', { failing: formatNumber(failingCount) })}
                  </>
                ) : (
                  <>
                    {t('headline.beforeSome', { total: formatNumber(totalInstitutions) })}
                    <span style={{ color: 'var(--color-accent)' }}>{t('headline.accentSome', { n: formatNumber(excelenteCount) })}</span>
                    {t('headline.afterSome', { failing: formatNumber(failingCount) })}
                  </>
                )}
              </h1>
              {topExposure && (
                <p className="text-sm sm:text-[15px] text-text-secondary mt-3 leading-relaxed">
                  {t('lede', {
                    name: formatEntityName('institution', topExposure.institution_name, 'md'),
                    money: formatDualCurrency(topExposure.money_at_risk_mxn ?? 0),
                  })}
                </p>
              )}
            </div>

          </div>

          {/* Federal scope segmented control + disclaimer.
              Lifted out of the Act II filter row so it sits next to the
              Honor Roll / Red Flags it actually governs. State-level
              institutions have tiny sample sizes and incomparable
              procedures; including them puts state secretarías at the top
              of the league and buries the federal agencies that matter
              for reform (IMSS, ISSSTE, PEMEX, etc.). */}
          <div className="mt-4 pt-3 border-t border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
                  {t('scope.label')}
                </span>
                <div
                  role="radiogroup"
                  aria-label={t('scope.label')}
                  className="inline-flex rounded-sm border border-border bg-background overflow-hidden"
                >
                  {(['federal', 'subnational', 'all'] as const).map((sc, i) => (
                    <button
                      key={sc}
                      type="button"
                      role="radio"
                      aria-checked={scope === sc}
                      onClick={() => updateParams({ scope: sc === 'federal' ? undefined : sc, all: undefined, page: '1' })}
                      className={`px-3 py-1 text-[12px] font-mono uppercase tracking-[0.12em] transition-colors ${
                        i < 2 ? 'border-r border-border' : ''
                      } ${
                        scope === sc
                          ? 'bg-accent-data/15 text-accent-data'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {t(`scope.${sc}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[12px] font-mono leading-relaxed text-text-muted mt-2">
              {t(scope === 'federal'
                ? 'scope.disclaimerFederal'
                : scope === 'subnational'
                  ? 'scope.disclaimerSubnational'
                  : 'scope.disclaimerAll')}
            </p>
          </div>
        </header>
      {/* Editorial finding — clean left-bordered callout, no decorative icon.
          The verdict is editorial, not ornamental. Border + kicker carry the
          accountability tone; the sentence is the story. */}
      {editorialHeadline && (
        <div
          className="mb-6 pl-5 py-1"
          style={{
            borderLeft: `3px solid ${
              failingCount > 0
                ? 'var(--color-risk-critical)'
                : 'var(--color-accent)'
            }`,
          }}
        >
          <p
            className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] mb-1.5"
            style={{
              color: failingCount > 0
                ? 'var(--color-risk-critical)'
                : 'var(--color-accent)',
            }}
          >
            {t('hallazgo')}
          </p>
          <p
            className="text-text-primary leading-snug"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 'clamp(17px, 1.6vw, 21px)',
              letterSpacing: '-0.005em',
            }}
          >
            {editorialHeadline}
          </p>
        </div>
      )}

      <div className="space-y-10"><Act number="I" label={t('acts.one')}>

      <div className="space-y-8">

        {/* ─── LA PLACA — the Spectral Register: the whole federal field on one
            integrity axis (position = score, stroke height = money-at-risk).
            Absorbs the old HeroStatRail, Exposure list, and ScoreHistogram. */}
        {scope === 'federal' ? (
          fieldData && fieldData.length > 0 ? (
            <SpectralRegister
              items={fieldData}
              median={statsData?.median_score ?? null}
              totalScored={statsData?.total_scored ?? fieldData.length}
              failingCount={failingCount}
            />
          ) : null
        ) : (
          <SpectralRegisterUnavailableNote scope={scope} />
        )}

        {/* ─── ACT I — THE VERDICT ──────────────────────────────────────────
            Red Flags lead (dominant grid). Bright Spots is a quieter
            counterweight that follows. Editorial logic: this is an
            anti-corruption platform, the worst offenders are the lead.
            Stats triptych moved to the page header (already there). The
            distribution-bar / histogram are demoted to Act III. */}

        {/* Red Flags — DOMINANT verdict cards */}
        {!hasFilters && redFlagItems.length >= 3 && (
          <section aria-labelledby="redflags-heading" className="space-y-4">
            <div className="border-l-2 border-risk-critical pl-4">
              <p className="text-[12px] font-mono font-bold tracking-[0.15em] uppercase text-risk-critical mb-1 flex items-center gap-2">
                <Flag className="h-3 w-3" aria-hidden="true" />
                {t('redFlags.kicker')}
              </p>
              <h2
                id="redflags-heading"
                className="text-2xl sm:text-3xl font-serif font-bold text-text-primary leading-tight"
                style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'normal', fontWeight: 500 }}
              >
                {t('redFlags.headline')}
              </h2>
              <p className="text-text-secondary text-sm mt-2">
                {t('redFlags.sub')}
              </p>
            </div>
            <div className="space-y-1">
              {redFlagItems.slice(0, 5).map((item, idx) => (
                <ActaCard
                  key={item.institution_id}
                  rank={idx + 1}
                  item={item}
                  onNavigate={(id) => navigate(`/institutions/${id}`, { state: { institutionName: item.institution_name } })}
                />
              ))}
            </div>
          </section>
        )}


        {/* Bright Spots — quieter counterweight, demoted below Red Flags.
            Rendered as a flat list (one institution per row) rather than a
            card grid: the Red Flags are the story, the champions are the
            footnote. */}
        {!hasFilters && championItems.length >= 3 && (
          <section aria-labelledby="champions-heading" className="space-y-3 pt-2">
            <div className="border-l border-border pl-4">
              <p className="text-[12px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1 flex items-center gap-2">
                <Trophy className="h-3 w-3" aria-hidden="true" />
                {t('champions.kicker')}
              </p>
              <h2
                id="champions-heading"
                className="text-lg font-serif font-bold text-text-secondary leading-tight"
              >
                {t('champions.headline')}
              </h2>
            </div>
            <div
              className="rounded-sm border border-border/60 bg-background-elevated/20 divide-y divide-border/40"
              role="list"
            >
              {championItems.slice(0, 5).map((item, idx) => (
                <ChampionCard
                  key={item.institution_id}
                  rank={idx + 1}
                  item={item}
                  onNavigate={(id) => navigate(`/institutions/${id}`, { state: { institutionName: item.institution_name } })}
                />
              ))}
            </div>
          </section>
        )}

        </div>
      </Act>

      <Act number="II" label={t('acts.two')}>
      <div className="space-y-5">

        {/* ─── ACT II — THE LEAGUE ──────────────────────────────────────────
            Editorial filter pills replace generic dropdowns. Tier pills
            communicate the 5-tier system visually; sector pills surface
            all 12 sector colors at a glance. Search input full-width
            below. Result count anchors the table headline. */}

        {/* Search input — full-width above the pill rows */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="league-search" className="sr-only">{t('filters.search')}</label>
            <input
              id="league-search"
              type="search"
              value={search}
              onChange={(e) => updateParams({ q: e.target.value || undefined, page: '1' })}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-data/50 font-mono"
            />
          </div>
          <span className="text-text-muted text-[12px] font-mono tabular-nums tracking-wide flex-shrink-0">
            {t('filters.results', { num: formatNumber(total) })}
          </span>
        </div>

        {/* Tier filter pills — horizontal scroll on narrow widths */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
            {t('filters.tier')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => updateParams({ grade: undefined, page: '1' })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-mono uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                !activeTierName
                  ? 'bg-accent-data/15 border-accent-data/40 text-accent-data'
                  : 'border-border bg-background text-text-muted hover:text-text-secondary hover:border-border-hover'
              }`}
            >
              {t('filters.allTiers')}
            </button>
            {TIER_NAMES.map((tierName) => {
              const tier = getTierByKey(tierName)
              const isActive = activeTierName === tierName
              return (
                <button
                  key={tierName}
                  type="button"
                  onClick={() => {
                    const grades = TIER_GRADE_MAP[tierName]
                    const gradeVal = grades ? grades[0] : undefined
                    updateParams({ grade: gradeVal || undefined, page: '1' })
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-mono uppercase tracking-[0.08em] transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    borderColor: isActive ? tier.color : 'var(--color-border)',
                    backgroundColor: isActive ? `${tier.color}1f` : 'transparent',
                    color: isActive ? tier.color : 'var(--color-text-muted)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  {tier.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sector filter pills — all 12 sectors with their canonical colors */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
            {t('filters.sectorLabel')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => updateParams({ sector: undefined, page: '1' })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-mono uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                !sectorFilter
                  ? 'bg-accent-data/15 border-accent-data/40 text-accent-data'
                  : 'border-border bg-background text-text-muted hover:text-text-secondary hover:border-border-hover'
              }`}
            >
              {t('filters.allSectors')}
            </button>
            {sectorOptions.map((s) => {
              const isActive = sectorFilter === s.value
              const color = SECTOR_COLORS[s.value] ?? SECTOR_COLORS.otros
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateParams({ sector: isActive ? undefined : s.value, page: '1' })}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-mono uppercase tracking-[0.08em] transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    borderColor: isActive ? color : 'var(--color-border)',
                    backgroundColor: isActive ? `${color}1f` : 'transparent',
                    color: isActive ? color : 'var(--color-text-muted)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {getSectorName(s.value, lang === 'es' ? 'es' : 'en')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <section aria-labelledby="league-table-heading" className="space-y-3 pt-2">
          <div>
            <p className="text-[12px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1">
              {t('tableKicker')}
            </p>
            <h2 id="league-table-heading" className="text-lg font-serif font-bold text-text-primary leading-tight">
              {isLoading ? t('tableKicker') : t('tableHeadline', { total: formatNumber(total) })}
            </h2>
          </div>

          {isError && (
            <div className="flex items-center gap-3 p-4 rounded-sm bg-risk-critical/10/40 border border-red-800/40 text-risk-critical text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {t('error')}
            </div>
          )}

          {isLoading && !items.length && (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-background-elevated rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-sm border border-border bg-background/50 p-8 text-center" role="status" aria-live="polite">
              <p className="text-text-secondary text-sm">{t('empty')}</p>
              <p className="text-text-muted text-xs mt-1">
                {t('filters.adjustFilters')}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-sm min-w-[900px]" role="grid" aria-label={t('tableAriaLabel')}>
                <thead>
                  <tr className="border-b border-border bg-background/80">
                    <th scope="col" className="px-2 py-2 text-left w-12">
                      <span className="text-[13px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        #
                      </span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left">
                      <SortHeader
                        label={t('columns.institution')}
                        sortKey="institution_name"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-2 py-2 text-left w-24">
                      <SortHeader
                        label={t('columns.score')}
                        sortKey="total_score"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-2 py-2 text-center w-24">
                      <span className="text-[13px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.grade')}
                      </span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left hidden sm:table-cell w-28" title={pillarLegendTitle}>
                      <span className="text-[13px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.weakPillar')}
                      </span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-center w-12 hidden sm:table-cell">
                      <span className="text-[13px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.trend')}
                      </span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-left hidden md:table-cell w-24">
                      <SortHeader
                        label={t('columns.percentile')}
                        sortKey="national_percentile"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th scope="col" className="px-2 py-2 text-right hidden lg:table-cell w-28">
                      <SortHeader
                        label={t('columns.moneyAtRisk')}
                        sortKey="money_at_risk"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                        className="justify-end"
                      />
                    </th>
                    <th scope="col" className="px-2 py-2 w-8" aria-label="Dossier" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rank = firstItemRank + idx
                    const tier = getTier(item.grade)
                    // Worst performers: bottom 5 when sorted by score ascending
                    const isWorstPerformer = sortBy === 'total_score' && sortOrder === 'asc' && idx < 5
                    // Top 3 medals (only visible when sorted by score descending on first page)
                    const isTopMedalist = sortBy === 'total_score' && sortOrder === 'desc' && rank <= 3
                    // Critico tier always reads as dominant — red wash on the
                    // row, thicker left border, stronger left-border weight.
                    // This is the editorial promise: a reader scrolling past
                    // a Critico row cannot miss it.
                    const isCritico = item.grade === 'F' || item.grade === 'F-'
                    const rankColor = isTopMedalist
                      ? (rank === 1 ? '#facc15' : rank === 2 ? '#d4d4d8' : '#d97706')
                      : isWorstPerformer || isCritico
                        ? '#dc2626'
                        : tier.color
                    const isExpanded = expandedRowId === item.institution_id
                    const toggleExpand = (e: React.MouseEvent) => {
                      e.stopPropagation()
                      setExpandedRowId(isExpanded ? null : item.institution_id)
                    }
                    return (
                      <React.Fragment key={item.institution_id}>
                      <tr
                        data-wf-row={item.institution_id}
                        className={`border-b border-border hover:bg-background-elevated transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] ${
                          isWorstPerformer || isCritico ? 'bg-risk-critical/10' : ''
                        } ${isExpanded ? 'bg-background-elevated' : ''}`}
                        onClick={() => navigate(`/institutions/${item.institution_id}`, { state: { institutionName: item.institution_name } })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/institutions/${item.institution_id}`, { state: { institutionName: item.institution_name } })
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={t('rowAriaLabel', { rank, name: item.institution_name, score: item.total_score, tier: tier.label })}
                        style={{
                          borderLeft: `${isCritico ? '4px' : '3px'} solid ${tier.color}`,
                          height: '44px',
                        }}
                      >
                        {/* Rank — compact mono, ARIA-style */}
                        <td className="px-2 py-0 font-mono tabular-nums text-right w-12 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {isTopMedalist && (
                              <Crown
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: rankColor }}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="text-[13px] font-mono font-bold leading-none tabular-nums"
                              style={{ color: rankColor, opacity: isWorstPerformer || isTopMedalist ? 1 : 0.65 }}
                            >
                              {rank}
                            </span>
                          </div>
                          {isWorstPerformer && (
                            <div className="mt-0.5 text-[7px] font-mono font-bold uppercase tracking-[0.12em] text-risk-critical whitespace-nowrap leading-none">
                              {t('worstPerformerBadge')}
                            </div>
                          )}
                        </td>

                        {/* Sector color dot + institution name + sector label
                            + risk-driver pill — all on one line. The dot is
                            the sector-palette accent (SECTOR_COLORS), the
                            tier color stays on the left border. */}
                        <td className="px-2 py-0 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={toggleExpand}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-background-elevated text-text-muted hover:text-text-secondary transition-colors"
                              aria-label={isExpanded ? t('collapseRow') : t('expandRow')}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                              />
                            </button>
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getSectorColorFromName(item.sector_name) }}
                              title={localizedSectorName(item.sector_name, lang)}
                            />
                            <span
                              className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors font-medium whitespace-normal break-words leading-tight"
                            >
                              {formatEntityName('institution', item.institution_name, 'full')}
                            </span>
                            {item.sector_name && (
                              <span className="text-text-muted text-[13px] font-mono uppercase tracking-[0.1em] flex-shrink-0 hidden lg:inline">
                                · {localizedSectorName(item.sector_name, lang)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score — secondary numeric, demoted from primary
                            anchor. The tier label below is now the
                            editorial verdict; the score is the supporting
                            measurement. */}
                        <td className="px-2 py-0 align-middle">
                          <div className="flex items-baseline gap-1">
                            <span
                              className="text-[14px] font-mono tabular-nums leading-none"
                              style={{ color: tier.color, fontWeight: isCritico ? 700 : 600, opacity: isCritico ? 1 : 0.85 }}
                            >
                              {item.total_score.toFixed(1)}
                            </span>
                            <span className="text-text-muted text-[13px] font-mono">/100</span>
                          </div>
                        </td>

                        {/* Tier — now the primary editorial verdict. Rendered
                            as a bold mono label, not a small pill. Critico
                            gets the dominant red-bar treatment to match the
                            row tint. */}
                        <td className="px-2 py-0 text-center align-middle">
                          <div
                            className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-sm"
                            style={{
                              backgroundColor: tier.bg,
                              border: `1px solid ${tier.border}`,
                              minWidth: '92px',
                            }}
                          >
                            <span
                              className="font-mono uppercase tabular-nums leading-none"
                              style={{
                                color: tier.color,
                                fontSize: isCritico ? '11px' : '10px',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                              }}
                            >
                              {tier.label}
                            </span>
                          </div>
                        </td>

                        {/* Weak pillar — the single legible pillar fact */}
                        <td className="px-2 py-0 hidden sm:table-cell align-middle">
                          <WeakPillarCell item={item} />
                        </td>

                        {/* Trend icon */}
                        <td className="px-2 py-0 text-center hidden sm:table-cell align-middle">
                          <TrendIcon direction={item.trend_direction} />
                        </td>

                        {/* National percentile */}
                        <td className="px-2 py-0 hidden md:table-cell align-middle">
                          <span className="text-text-secondary text-[13px] font-mono tabular-nums">
                            {item.national_percentile !== null
                              ? t('percentileLabel', { n: Math.round(item.national_percentile * 100) })
                              : '--'}
                          </span>
                        </td>

                        {/* Money at risk — the exposure the integrity score can't see */}
                        <td className="px-2 py-0 text-right hidden lg:table-cell align-middle">
                          <span className="text-text-secondary text-[13px] font-mono tabular-nums">
                            {item.money_at_risk_mxn != null && item.money_at_risk_mxn > 0
                              ? formatCompactMXN(item.money_at_risk_mxn)
                              : '—'}
                          </span>
                        </td>

                        {/* Dossier icon link */}
                        <td className="px-1 py-0 align-middle">
                          <Link
                            to={`/institutions/${item.institution_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 p-1 rounded text-text-muted hover:text-accent-data hover:bg-accent-data/10 transition-colors inline-flex"
                            title={t('openDossier')}
                            aria-label={t('openDossier')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          className="border-b border-border bg-background/60"
                          style={{ borderLeft: `3px solid ${tier.color}` }}
                        >
                          <td colSpan={9} className="px-5 py-4">
                            <PillarBoleta item={item} />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between mt-4"
              aria-label={t('pagination.ariaLabel')}
            >
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border text-text-secondary text-sm hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.previousAriaLabel')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t('pagination.previous')}
              </button>
              <span className="text-text-muted text-sm font-mono tabular-nums">
                {t('pagination.pageOf', { page, total: totalPages })}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border text-text-secondary text-sm hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.nextAriaLabel')}
              >
                {t('pagination.next')}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>

      </div>
      </Act>

      {/* ─── ACT III — METHODOLOGY ────────────────────────────────────────
          Collapsible (closed by default) — holds the distribution and
          histogram, which used to break Act I's editorial rhythm. */}
      <section
        aria-labelledby="methodology-heading"
        className="border-t border-border pt-6 mt-2"
      >
        <button
          type="button"
          onClick={() => setMethodologyOpen((v) => !v)}
          aria-expanded={methodologyOpen}
          className="w-full flex items-center justify-between gap-3 text-left group"
        >
          <div>
            <p className="text-[12px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1">
              ACT III
            </p>
            <h2
              id="methodology-heading"
              className="text-lg font-serif font-bold text-text-primary leading-tight group-hover:text-accent transition-colors"
            >
              {t('histogram.kicker')}
            </h2>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-text-muted flex-shrink-0 transition-transform ${methodologyOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {methodologyOpen && (
          <div className="space-y-6 mt-5">

            {/* Source footnote */}
            <p className="text-[12px] text-text-muted font-mono pt-4 border-t border-border">
              {t('methodologyFootnote')}
            </p>
          </div>
        )}
      </section>
      <PageFooter />
      </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar — shared between ranking/reporte views
// ---------------------------------------------------------------------------

function TabBar({ activeTab, setTab }: { activeTab: string; setTab: (tab: string) => void }) {
  const { t } = useTranslation('institutionleague')
  const tabs = [
    { id: 'ranking', label: t('tabs.ranking') },
    { id: 'reporte', label: t('tabs.reporte') },
  ]
  return (
    <div className="border-b border-border bg-background/50 px-4 sm:px-6">
      <div className="max-w-screen-xl mx-auto flex items-center gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

