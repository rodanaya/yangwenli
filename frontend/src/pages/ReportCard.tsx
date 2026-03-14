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
  green: { bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  yellow: { bg: 'bg-amber-400', text: 'text-amber-400', ring: 'ring-amber-400/30' },
  red: { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30' },
} as const

const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', border: 'rgba(74, 222, 128, 0.3)' },
  B: { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)' },
  C: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
  D: { text: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', border: 'rgba(251, 146, 60, 0.3)' },
  F: { text: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)' },
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
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.F
  return (
    <div
      className={cn(
        'rounded-full border-2 font-bold flex items-center justify-center font-mono',
        sizeClasses[size]
      )}
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
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
    <section
      className="relative overflow-hidden rounded-2xl p-8 md:p-12 mb-12"
      style={{
        background: 'linear-gradient(135deg, #080c14 0%, #0e1420 50%, #141c2c 100%)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(245, 158, 11, 0.06), transparent 60%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient font-mono">
          {t('title')}
        </h1>
        <p className="text-text-muted text-lg max-w-2xl">
          {t('subtitle')}
        </p>

        <GradeBadge grade={national.grade} size="xl" />

        <h2 className="text-2xl font-semibold mt-2 text-text-primary font-mono">
          {t('nationalGrade')}:{' '}
          <span className="text-accent">
            {t(`grade${national.grade}`)}
          </span>
        </h2>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted mt-2">
          <span>{(national.total_contracts / 1_000_000).toFixed(1)}M+ {t('heroContracts')}</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{t('heroPeriod')}</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{t('heroBenchmarks')}</span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          {INDICATOR_KEYS.map((key) => {
            const ind = national.indicators[key]
            return ind ? <TrafficDot key={key} light={ind.light} /> : null
          })}
        </div>
        <p className="text-xs text-text-muted">
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
    <div
      className="card-elevated rounded-xl p-6 flex flex-col gap-4"
    >
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
            <h3 className="font-semibold text-text-primary">
              {t(i18nKey)}
            </h3>
            <p className={cn('text-2xl font-bold font-mono mt-1', LIGHT_COLORS[indicator.light].text)}>
              {indicator.value}
              {!['hhi', 'avg_bidders'].includes(indicatorKey) ? '%' : ''}
            </p>
          </div>
        </div>
      </div>
      <p className="text-sm text-text-muted">
        {t(`${i18nKey}Desc`)}
      </p>
      <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{t('benchmark')}:</span> {indicator.benchmark}
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
      className="card rounded-xl p-5 text-left transition-all duration-200 group hover:border-border-hover"
      style={{ boxShadow: 'none' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
            {sectorMeta?.nameEN || sector.sector_name}
          </h3>
          <p className="text-xs text-text-muted">
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
      <p className="text-xs text-text-muted font-mono">
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
      <h2 className="text-2xl font-bold text-text-primary mb-2 font-mono">
        {t('sectionTrend')}
      </h2>
      <p className="text-text-muted mb-6">
        {t('sectionTrendSubtitle')}
      </p>

      <div className="card-elevated rounded-xl p-6">
        {/* Grade timeline */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {years.map((y) => (
            <div key={y.year} className="flex flex-col items-center min-w-[3rem]">
              <GradeBadge grade={y.grade} size="sm" />
              <span className="text-[10px] text-text-muted mt-1 font-mono">{y.year}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={years} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} domain={[0, 100]} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ color: 'var(--color-text-muted)' }} />
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
      <h2 className="text-2xl font-bold text-text-primary mb-2 font-mono">
        {t('sectionAgreement')}
      </h2>
      <p className="text-text-muted mb-6">
        {t('sectionAgreementSubtitle')}
      </p>

      <div
        className="rounded-xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.05))',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-bold font-mono mb-4" style={{ color: '#60a5fa' }}>
            {agreement.agreement_rate}%
          </p>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            {t('agreementStat', { pct: agreement.agreement_rate })}
          </p>
          <p className="text-sm text-text-muted mt-4 max-w-lg mx-auto">
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
    <section className="mt-16 pt-8 pb-4" style={{ borderTop: '1px solid var(--color-border)' }}>
      <h3 className="text-lg font-semibold text-text-primary mb-2 font-mono">
        {t('methodologyNote')}
      </h3>
      <p className="text-sm text-text-muted mb-4 max-w-3xl">
        {t('methodologyText')}
      </p>
      <h4 className="text-sm font-medium text-text-secondary mb-2">{t('sources')}</h4>
      <ul className="text-xs text-text-muted space-y-1">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-text-muted">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-risk-critical">{t('error')}</p>
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
        <h2 className="text-2xl font-bold text-text-primary mb-2 font-mono">
          {t('sectionIndicators')}
        </h2>
        <p className="text-text-muted mb-6">
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
        <h2 className="text-2xl font-bold text-text-primary mb-2 font-mono">
          {t('sectionSectors')}
        </h2>
        <p className="text-text-muted mb-6">
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
