import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { phiApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PHIIndicator {
  value: number
  light: 'green' | 'yellow' | 'red'
  label: string
  description: string
  benchmark: string
}

interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  indicators: Record<string, PHIIndicator>
}

interface PHINational {
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  indicators: Record<string, PHIIndicator>
}

interface PHISectorsResponse {
  methodology: {
    name: string
    based_on: string[]
  }
  national: PHINational
  sectors: PHISector[]
}

interface TrendYear {
  year: number
  grade: string
  competition_rate: number
  single_bid_rate: number
  avg_bidders: number
  total_contracts: number
}

interface CorrelationResponse {
  correlations: {
    ml_phi_agreement: {
      high_risk_contracts: number
      also_flagged_by_phi: number
      agreement_rate: number
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LIGHT_COLORS = {
  green: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  yellow: { bg: 'bg-amber-400', text: 'text-amber-600', ring: 'ring-amber-200' },
  red: { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' },
} as const

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50 border-emerald-300',
  B: 'text-blue-600 bg-blue-50 border-blue-300',
  C: 'text-amber-600 bg-amber-50 border-amber-300',
  D: 'text-orange-600 bg-orange-50 border-orange-300',
  F: 'text-red-700 bg-red-50 border-red-400',
}

function TrafficDot({ light }: { light: 'green' | 'yellow' | 'red' }) {
  return <span className={cn('inline-block w-3 h-3 rounded-full', LIGHT_COLORS[light].bg)} />
}

function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-20 h-20 text-4xl',
    xl: 'w-32 h-32 text-7xl',
  }
  return (
    <div
      className={cn(
        'rounded-full border-2 font-bold flex items-center justify-center',
        GRADE_COLORS[grade] || GRADE_COLORS.F,
        sizeClasses[size]
      )}
    >
      {grade}
    </div>
  )
}

const INDICATOR_KEYS = [
  'competition_rate',
  'single_bid_rate',
  'avg_bidders',
  'hhi',
  'short_ad_rate',
  'amendment_rate',
] as const

const INDICATOR_I18N: Record<string, string> = {
  competition_rate: 'competitionRate',
  single_bid_rate: 'singleBidRate',
  avg_bidders: 'avgBidders',
  hhi: 'hhi',
  short_ad_rate: 'shortAdRate',
  amendment_rate: 'amendmentRate',
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function HeroSection({ national, t }: { national: PHINational; t: (k: string, o?: Record<string, unknown>) => string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 md:p-12 mb-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl">
          {t('subtitle')}
        </p>

        <GradeBadge grade={national.grade} size="xl" />

        <h2 className="text-2xl font-semibold mt-2">
          {t('nationalGrade')}:{' '}
          <span className="text-amber-400">
            {t(`grade${national.grade}`)}
          </span>
        </h2>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 mt-2">
          <span>{(national.total_contracts / 1_000_000).toFixed(1)}M+ {t('heroContracts')}</span>
          <span className="text-slate-600">|</span>
          <span>{t('heroPeriod')}</span>
          <span className="text-slate-600">|</span>
          <span>{t('heroBenchmarks')}</span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          {INDICATOR_KEYS.map((key) => {
            const ind = national.indicators[key]
            return ind ? <TrafficDot key={key} light={ind.light} /> : null
          })}
        </div>
        <p className="text-xs text-slate-500">
          {t('greenCount', { count: national.greens })} / {t('yellowCount', { count: national.yellows })} / {t('redCount', { count: national.reds })}
        </p>
      </div>
    </section>
  )
}

function IndicatorCard({ indicatorKey, indicator, t }: {
  indicatorKey: string
  indicator: PHIIndicator
  t: (k: string) => string
}) {
  const i18nKey = INDICATOR_I18N[indicatorKey]
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center ring-4',
            LIGHT_COLORS[indicator.light].bg,
            LIGHT_COLORS[indicator.light].ring,
          )}>
            <span className="text-white font-bold text-sm">
              {indicator.light === 'green' ? '!' : indicator.light === 'yellow' ? '~' : '!!'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {t(i18nKey)}
            </h3>
            <p className={cn('text-2xl font-bold mt-1', LIGHT_COLORS[indicator.light].text)}>
              {indicator.value}
              {!['hhi', 'avg_bidders'].includes(indicatorKey) ? '%' : ''}
            </p>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t(`${i18nKey}Desc`)}
      </p>
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-400">
          <span className="font-medium">{t('benchmark')}:</span> {indicator.benchmark}
        </p>
      </div>
    </div>
  )
}

function SectorCard({ sector, t }: { sector: PHISector; t: (k: string) => string }) {
  const navigate = useNavigate()
  const sectorMeta = SECTORS.find((s) => s.id === sector.sector_id)
  const color = sectorMeta?.color || '#64748b'

  return (
    <button
      onClick={() => navigate(`/sectors/${sector.sector_id}`)}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">
            {sectorMeta?.nameEN || sector.sector_name}
          </h3>
          <p className="text-xs text-slate-400">
            {sector.total_contracts.toLocaleString()} {t('contracts')}
          </p>
        </div>
        <GradeBadge grade={sector.grade} size="sm" />
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        {INDICATOR_KEYS.map((key) => {
          const ind = sector.indicators?.[key]
          return ind ? <TrafficDot key={key} light={ind.light} /> : null
        })}
      </div>
      <p className="text-xs text-slate-400">
        {formatCompactMXN(sector.total_value_mxn)}
      </p>
    </button>
  )
}

function TrendSection({ t }: { t: (k: string) => string }) {
  const { data } = useQuery({
    queryKey: ['phi-trend'],
    queryFn: () => phiApi.getTrend(),
  })

  const years: TrendYear[] = data?.years || []
  if (years.length === 0) return null

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        {t('sectionTrend')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        {t('sectionTrendSubtitle')}
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        {/* Grade timeline */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {years.map((y) => (
            <div key={y.year} className="flex flex-col items-center min-w-[3rem]">
              <GradeBadge grade={y.grade} size="sm" />
              <span className="text-[10px] text-slate-400 mt-1">{y.year}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={years} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: 13,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="competition_rate"
                name={t('competitionRateYAxis')}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="single_bid_rate"
                name={t('singleBidRateYAxis')}
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function AgreementSection({ t }: { t: (k: string, o?: Record<string, unknown>) => string }) {
  const { data } = useQuery<CorrelationResponse>({
    queryKey: ['phi-correlation'],
    queryFn: () => phiApi.getCorrelation(),
  })

  const agreement = data?.correlations?.ml_phi_agreement
  if (!agreement) return null

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        {t('sectionAgreement')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        {t('sectionAgreementSubtitle')}
      </p>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl border border-blue-200 dark:border-slate-700 p-8">
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-bold text-blue-700 dark:text-blue-400 mb-4">
            {agreement.agreement_rate}%
          </p>
          <p className="text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto">
            {t('agreementStat', { pct: agreement.agreement_rate })}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 max-w-lg mx-auto">
            {t('agreementExplain', {
              total: agreement.high_risk_contracts.toLocaleString(),
              flagged: agreement.also_flagged_by_phi.toLocaleString(),
            })}
          </p>
        </div>
      </div>
    </section>
  )
}

function MethodologyFooter({ sources, t }: { sources: string[]; t: (k: string) => string }) {
  return (
    <section className="mt-16 border-t border-slate-200 dark:border-slate-700 pt-8 pb-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {t('methodologyNote')}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-3xl">
        {t('methodologyText')}
      </p>
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('sources')}</h4>
      <ul className="text-xs text-slate-400 space-y-1">
        {sources.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function ReportCard() {
  const { t } = useTranslation('reportcard')

  const { data, isLoading, error } = useQuery<PHISectorsResponse>({
    queryKey: ['phi-sectors', 2020, 2024],
    queryFn: () => phiApi.getSectors(2020, 2024),
  })

  const sortedSectors = useMemo(() => {
    if (!data?.sectors) return []
    return [...data.sectors]
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{t('error')}</p>
      </div>
    )
  }

  const { national, methodology } = data

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Section 1: Hero */}
      <HeroSection national={national} t={t} />

      {/* Section 2: The 6 Indicators */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t('sectionIndicators')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {t('sectionIndicatorsSubtitle')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INDICATOR_KEYS.map((key) => {
            const ind = national.indicators[key]
            return ind ? (
              <IndicatorCard key={key} indicatorKey={key} indicator={ind} t={t} />
            ) : null
          })}
        </div>
      </section>

      {/* Section 3: Sector Report Cards */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t('sectionSectors')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {t('sectionSectorsSubtitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedSectors.map((sector) => (
            <SectorCard key={sector.sector_id} sector={sector} t={t} />
          ))}
        </div>
      </section>

      {/* Section 4: National Trend */}
      <TrendSection t={t} />

      {/* Section 5: PHI vs ML Agreement */}
      <AgreementSection t={t} />

      {/* Methodology Footer */}
      <MethodologyFooter sources={methodology.based_on} t={t} />
    </div>
  )
}

export default ReportCard
