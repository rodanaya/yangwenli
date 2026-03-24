import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, useInView, type Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { phiApi, scorecardApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PHIIndicator {
  value: number
  light: 'green' | 'yellow' | 'red'
  label: string
  description: string
  benchmark: string
  weight?: number | null
}

interface RiskLevelEntry {
  count: number
  value_mxn: number
  count_pct: number
  value_pct: number
}

interface RiskDistribution {
  critical: RiskLevelEntry
  high: RiskLevelEntry
  medium: RiskLevelEntry
  low: RiskLevelEntry
}

interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  phi_composite_score?: number
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  competition_by_value?: number
  direct_award_rate_by_value?: number
  risk_distribution?: RiskDistribution
  indicators: Record<string, PHIIndicator>
}

interface PHINational {
  sector_name: string
  grade: string
  phi_composite_score?: number
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  competition_by_value?: number
  risk_distribution?: RiskDistribution
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
  phi_composite_score?: number
  competition_rate: number
  competition_by_value?: number
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
// Constants
// ---------------------------------------------------------------------------

const SERIF = "'Playfair Display', Georgia, serif"

// Full 10-tier grade palette
const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'S':  { text: '#34d399', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(52,211,153,0.25)' },
  'A':  { text: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.20)' },
  'B+': { text: '#a3e635', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(163,230,53,0.20)' },
  'B':  { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.20)' },
  'C+': { text: '#fcd34d', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(252,211,77,0.20)' },
  'C':  { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.20)' },
  'D':  { text: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.20)' },
  'D-': { text: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(248,113,113,0.20)' },
  'F':  { text: '#fca5a5', bg: 'rgba(153,27,27,0.12)',   border: 'rgba(239,68,68,0.20)' },
  'F-': { text: '#fca5a5', bg: 'rgba(28,5,5,0.75)',      border: 'rgba(153,27,27,0.40)' },
}

// Risk level visual config — labels resolved via t('riskLevelCritical') etc.
const RISK_LEVEL_CONFIG = {
  critical: { color: '#dc2626', labelKey: 'riskLevelCritical' },
  high:     { color: '#ea580c', labelKey: 'riskLevelHigh' },
  medium:   { color: '#eab308', labelKey: 'riskLevelMedium' },
  low:      { color: '#22c55e', labelKey: 'riskLevelLow' },
} as const

const LIGHT_COLORS = {
  green: { dot: 'bg-emerald-500', label: 'text-emerald-700' },
  yellow: { dot: 'bg-amber-400', label: 'text-amber-700' },
  red: { dot: 'bg-red-500', label: 'text-red-700' },
} as const

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

const GRADE_ORDER: Record<string, number> = { 'F-': 0, 'F': 1, 'D-': 2, 'D': 3, 'C': 4, 'C+': 5, 'B': 6, 'B+': 7, 'A': 8, 'S': 9 }

// Presidential term overlays for trend chart
const PRESIDENCIAS = [
  { name: 'Calderón', start: 2007, end: 2012, color: 'rgba(59,130,246,0.06)' },
  { name: 'EPN',      start: 2013, end: 2018, color: 'rgba(251,191,36,0.06)' },
  { name: 'AMLO',     start: 2019, end: 2024, color: 'rgba(239,68,68,0.05)' },
  { name: 'Sheinbaum',start: 2025, end: 2030, color: 'rgba(16,185,129,0.06)' },
]

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

// Fern-style bold stagger — y:60, scale:0.94, blur:4px, spring easing
const cardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.10, delayChildren: 0.08 },
  },
}
const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}


// ---------------------------------------------------------------------------
// Cinematic Animation Helpers
// ---------------------------------------------------------------------------

function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        setDone(true)
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  return { displayed, done }
}

export function LoadingIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="rc-scan-line rc-scan-line-1" />
        <div className="rc-scan-line rc-scan-line-2" />
        <div className="rc-scan-line rc-scan-line-3" />
      </div>
      <motion.p
        className="text-sm tracking-[0.3em] uppercase"
        style={{ fontFamily: "'Courier New', monospace", color: '#c41e3a' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.6, 1] }}
        transition={{ duration: 1.2, times: [0, 0.2, 0.5, 0.7, 1] }}
      >
        ANALYZING PROCUREMENT DATA...
      </motion.p>
      <motion.div
        className="mt-4 h-0.5 rounded-full"
        style={{ backgroundColor: '#c41e3a', width: 0 }}
        animate={{ width: 200 }}
        transition={{ duration: 1.3, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

const SECTOR_NAME_ES: Record<string, string> = {
  salud: 'Salud',
  educacion: 'Educaci\u00f3n',
  infraestructura: 'Infraestructura',
  energia: 'Energ\u00eda',
  defensa: 'Defensa',
  tecnologia: 'Tecnolog\u00eda',
  hacienda: 'Hacienda',
  gobernacion: 'Gobernaci\u00f3n',
  agricultura: 'Agricultura',
  ambiente: 'Ambiente',
  trabajo: 'Trabajo',
  otros: 'Otros',
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function TrafficDot({ light, size = 'sm' }: { light: 'green' | 'yellow' | 'red'; size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
  return <span className={cn('inline-block rounded-full', px, LIGHT_COLORS[light].dot)} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold tracking-[0.15em] uppercase mb-2"
      style={{ color: '#c41e3a' }}
    >
      {children}
    </p>
  )
}

// Stacked horizontal bar: risk level distribution by MXN value
function RiskDistributionBar({ dist, compact = false }: { dist?: RiskDistribution; compact?: boolean }) {
  const { t } = useTranslation('reportcard')
  if (!dist) return null
  const total = (dist.critical?.value_mxn ?? 0) + (dist.high?.value_mxn ?? 0) + (dist.medium?.value_mxn ?? 0) + (dist.low?.value_mxn ?? 0)
  if (total === 0) return null
  const levels = [
    { key: 'critical' as const, cfg: RISK_LEVEL_CONFIG.critical },
    { key: 'high'     as const, cfg: RISK_LEVEL_CONFIG.high },
    { key: 'medium'   as const, cfg: RISK_LEVEL_CONFIG.medium },
    { key: 'low'      as const, cfg: RISK_LEVEL_CONFIG.low },
  ]
  return (
    <div className={compact ? '' : 'mt-3'}>
      {!compact && (
        <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {t('riskDistribution')}
        </p>
      )}
      <div className={cn('flex rounded-full overflow-hidden gap-[1px]', compact ? 'h-2' : 'h-3')}>
        {levels.map(({ key, cfg }) => {
          const val = dist[key]?.value_mxn ?? 0
          const pct = (val / total) * 100
          if (pct < 0.5) return null
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: cfg.color, minWidth: '3px' }}
              title={`${t(cfg.labelKey)}: ${pct.toFixed(1)}% ${t('ofValue')}`}
            />
          )
        })}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {levels.map(({ key, cfg }) => {
            const entry = dist[key]
            if (!entry || entry.value_pct < 0.5) return null
            return (
              <span key={key} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span style={{ color: cfg.color }}>{t(cfg.labelKey)}</span>
                {entry.value_pct.toFixed(0)}%
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero: National Grade
// ---------------------------------------------------------------------------

function NationalGradeHero({ national }: { national: PHINational }) {
  const { t } = useTranslation('reportcard')
  const colors = GRADE_COLORS[national.grade] ?? GRADE_COLORS['F']
  const compByValue = national.competition_by_value
  const compRate = national.indicators['competition_rate']
  const sbRate = national.indicators['single_bid_rate']
  const avgBid = national.indicators['avg_bidders']
  const compositeScore = national.phi_composite_score

  // Grade badge drama: red fast pulse for D/F, green slow for B+/A/S
  const gradeVal = GRADE_ORDER[national.grade] ?? 0
  const isUrgent = gradeVal <= 3
  const ringColor = isUrgent ? 'rgba(220, 38, 38, 0.35)' : 'rgba(34, 197, 94, 0.25)'
  const ringDuration = isUrgent ? '1.4s' : '2.8s'

  // Typewriter summary
  const summaryText = compositeScore != null
    ? t('typewriterSummary', { grade: national.grade, score: compositeScore.toFixed(1), greens: national.greens, yellows: national.yellows, reds: national.reds })
    : t('typewriterSummaryNoScore', { grade: national.grade, greens: national.greens, yellows: national.yellows, reds: national.reds })
  const { displayed: typedSummary, done: typingDone } = useTypewriter(summaryText, 30)

  return (
    <section className="mb-10">
      {/* Grade card */}
      <div
        className="fern-card rounded-2xl mx-auto max-w-2xl overflow-hidden"
        style={{ borderColor: 'var(--color-border)', borderLeftWidth: 6, borderLeftColor: colors.text }}
      >
        <div className="flex flex-col items-center py-10 px-6">
          {/* Dramatic grade letter reveal with concentric pulse rings */}
          <div className="relative flex items-center justify-center" style={{ width: '12rem', height: '12rem' }}>
            {/* Concentric pulse rings */}
            <span className="absolute inset-0 rounded-full rc-grade-ring" style={{ borderColor: ringColor, animationDuration: ringDuration }} />
            <span className="absolute rounded-full rc-grade-ring" style={{ inset: '-1rem', borderColor: ringColor, animationDuration: ringDuration, animationDelay: '0.4s' }} />
            <span className="absolute rounded-full rc-grade-ring" style={{ inset: '-2rem', borderColor: ringColor, animationDuration: ringDuration, animationDelay: '0.8s' }} />

            {/* Grade letter: scale(3) blur(20px) -> scale(1) blur(0) with spring */}
            <motion.span
              className="leading-none font-bold relative z-10"
              style={{ fontFamily: SERIF, fontSize: '9rem', color: colors.text }}
              initial={{ scale: 3, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, type: 'spring', stiffness: 120, damping: 14 }}
            >
              {national.grade}
            </motion.span>

            {/* Crimson glow ring pulse after letter lands */}
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 0 0px ${colors.text}` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0], boxShadow: [`0 0 0 0px ${colors.text}`, `0 0 40px 20px ${colors.text}`, `0 0 60px 40px transparent`] }}
              transition={{ duration: 1.0, delay: 1.0, ease: 'easeOut' }}
            />
          </div>

          {compositeScore != null && (
            <motion.p
              className="text-sm tabular-nums font-medium mt-1"
              style={{ color: colors.text, opacity: 0.8 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              {compositeScore.toFixed(1)} / 100
            </motion.p>
          )}
          <p
            className="text-sm font-semibold tracking-[0.1em] uppercase mt-2 mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('nationalGradeSubtitle')}
          </p>

          {/* Typewriter score summary */}
          <div className="max-w-md mx-auto mb-6">
            <p
              className="text-xs leading-relaxed text-center"
              style={{ fontFamily: "'Courier New', monospace", color: 'var(--color-text-secondary)', minHeight: '2.5rem' }}
            >
              {typedSummary}
              {!typingDone && <span className="rc-typing-cursor">|</span>}
            </p>
          </div>

          {/* Supporting stats row */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {compByValue != null && (
              <div>
                <p className="text-2xl font-bold" style={{
                  fontFamily: SERIF,
                  color: compByValue >= 50 ? '#22c55e' : compByValue >= 30 ? '#f59e0b' : '#ef4444',
                }}>
                  {compByValue.toFixed(1)}%
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('statCompetitiveSpend')}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>{t('statByValue')}</p>
              </div>
            )}
            {compRate && (
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                  {compRate.value}%
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('statCompetitiveContracts')}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>{t('statByCount')}</p>
              </div>
            )}
            {sbRate && (
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                  {sbRate.value}%
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('statSingleBid')}
                </p>
              </div>
            )}
            {avgBid && (
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                  {avgBid.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('statAvgBidders')}
                </p>
              </div>
            )}
          </div>

          {/* Risk distribution */}
          {national.risk_distribution && (
            <div className="w-full max-w-sm mt-6 px-2">
              <RiskDistributionBar dist={national.risk_distribution} />
            </div>
          )}

          {/* Traffic dots summary */}
          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <TrafficDot light="green" size="md" /> {national.greens} {t('trafficGood')}
            </span>
            <span className="flex items-center gap-1.5">
              <TrafficDot light="yellow" size="md" /> {national.yellows} {t('trafficAlert')}
            </span>
            <span className="flex items-center gap-1.5">
              <TrafficDot light="red" size="md" /> {national.reds} {t('trafficPoor')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Grade Legend
// ---------------------------------------------------------------------------

function GradeLegend() {
  const { t } = useTranslation('reportcard')
  const items = [
    { grade: 'S',  label: t('gradeLabelS') },
    { grade: 'A',  label: t('gradeLabelA') },
    { grade: 'B+', label: t('gradeLabelBPlus') },
    { grade: 'B',  label: t('gradeLabelB') },
    { grade: 'C+', label: t('gradeLabelCPlus') },
    { grade: 'C',  label: t('gradeLabelC') },
    { grade: 'D',  label: t('gradeLabelD') },
    { grade: 'D-', label: t('gradeLabelDMinus') },
    { grade: 'F',  label: t('gradeLabelF') },
    { grade: 'F-', label: t('gradeLabelFMinus') },
  ]

  return (
    <div
      className="fern-card rounded-xl px-5 py-3 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
    >
      <span className="font-semibold uppercase tracking-wide text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        {t('gradeScale')}
      </span>
      {items.map((item) => {
        const c = GRADE_COLORS[item.grade]
        return (
          <span key={item.grade} className="flex items-center gap-1">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold"
              style={{ fontFamily: SERIF, color: c.text, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
            >
              {item.grade}
            </span>
            <span className="hidden sm:inline text-[10px]">{item.label}</span>
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sector Card (with inline expansion)
// ---------------------------------------------------------------------------

function SectorReportCard({ sector, t }: { sector: PHISector; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const sectorMeta = SECTORS.find((s) => s.id === sector.sector_id)
  const color = sectorMeta?.color || '#64748b'
  const gradeColors = GRADE_COLORS[sector.grade] || GRADE_COLORS.F
  const sectorDisplayName = SECTOR_NAME_ES[sector.sector_name] || sectorMeta?.name || sector.sector_name
  const gradeOrd = GRADE_ORDER[sector.grade] ?? 5
  const isCriticalSector = gradeOrd <= 2

  return (
    <div
      className="fern-card rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
      style={{
        borderColor: 'var(--color-border)',
        borderLeftWidth: isCriticalSector ? 3 : undefined,
        borderLeftColor: isCriticalSector ? '#dc2626' : undefined,
        boxShadow: isCriticalSector ? 'inset 3px 0 12px -4px rgba(220, 38, 38, 0.25)' : undefined,
      }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <h3
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sectorDisplayName}
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {sector.total_contracts.toLocaleString()} contratos &middot; {formatCompactMXN(sector.total_value_mxn)}
              </p>
            </div>
          </div>

          {/* Grade */}
          <span
            className="font-bold flex-shrink-0 leading-none"
            style={{
              fontFamily: SERIF,
              fontSize: '2.8rem',
              color: gradeColors.text,
            }}
          >
            {sector.grade}
          </span>
        </div>

        {/* Competition by value + composite score */}
        {(sector.competition_by_value != null || sector.phi_composite_score != null) && (
          <div className="flex items-center gap-4 mb-2 text-xs">
            {sector.competition_by_value != null && (
              <span>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color: sector.competition_by_value >= 50 ? '#22c55e'
                         : sector.competition_by_value >= 30 ? '#f59e0b'
                         : '#ef4444',
                  }}
                >
                  {sector.competition_by_value.toFixed(1)}%
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}> gasto competitivo</span>
              </span>
            )}
            {sector.phi_composite_score != null && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                Score: <span className="font-medium tabular-nums" style={{ color: gradeColors.text }}>{sector.phi_composite_score.toFixed(0)}</span>/100
              </span>
            )}
          </div>
        )}

        {/* Risk distribution bar (compact) */}
        {sector.risk_distribution && (
          <div className="mb-2">
            <RiskDistributionBar dist={sector.risk_distribution} compact />
          </div>
        )}

        {/* Traffic dots row */}
        <div className="flex items-center gap-1.5 mb-3">
          {INDICATOR_KEYS.map((key) => {
            const ind = sector.indicators?.[key]
            return ind ? <TrafficDot key={key} light={ind.light} size="md" /> : null
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium transition-colors"
            style={{ color: '#c41e3a' }}
          >
            {expanded ? t('hideDetail') : t('viewDetail')} {expanded ? '\u2191' : '\u2192'}
          </button>
          <button
            onClick={() => navigate(`/sectors/${sector.sector_id}`)}
            className="text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('goToSector')}
          </button>
        </div>
      </div>

      {/* Expanded indicator table */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background-elevated)' }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Indicador
                </th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Valor
                </th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Benchmark
                </th>
                <th className="text-center px-4 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {INDICATOR_KEYS.map((key) => {
                const ind = sector.indicators?.[key]
                if (!ind) return null
                const i18nKey = INDICATOR_I18N[key]
                return (
                  <tr
                    key={key}
                    className="border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>
                      {t(i18nKey)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                      {ind.value}{!['hhi', 'avg_bidders'].includes(key) ? '%' : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {ind.benchmark}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <TrafficDot light={ind.light} size="md" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trend Chart (editorial style)
// ---------------------------------------------------------------------------

function TrendSection({ t }: { t: (k: string) => string }) {
  const { data } = useQuery({
    queryKey: ['phi-trend'],
    queryFn: () => phiApi.getTrend(),
  })

  const years: TrendYear[] = data?.years || []
  if (years.length === 0) return null

  return (
    <section className="mb-12">
      <SectionLabel>{t('historicalTrend')}</SectionLabel>
      <h2 className="text-editorial-h2 mb-1" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
        {t('sectionTrend')}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {t('sectionTrendSubtitle')}
      </p>

      <div
        className="fern-card rounded-2xl p-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Grade timeline ribbon */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {years.map((y) => {
            const gc = GRADE_COLORS[y.grade] || GRADE_COLORS.F
            return (
              <div key={y.year} className="flex flex-col items-center min-w-[2.8rem]">
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold"
                  style={{
                    fontFamily: SERIF,
                    color: gc.text,
                    backgroundColor: gc.bg,
                    border: `1px solid ${gc.border}`,
                  }}
                >
                  {y.grade}
                </span>
                <span className="text-[10px] mt-1 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {y.year}
                </span>
              </div>
            )
          })}
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={years} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              {/* Presidential term background shading */}
              {PRESIDENCIAS.map((p) => (
                <ReferenceArea
                  key={p.name}
                  x1={p.start}
                  x2={p.end}
                  fill={p.color}
                  strokeOpacity={0}
                  label={{ value: p.name, position: 'insideTopLeft', fontSize: 10, fill: 'var(--color-text-muted)', dy: 4 }}
                />
              ))}
              <ReferenceLine
                x={2020}
                stroke="rgba(239,68,68,0.5)"
                strokeDasharray="4 2"
                label={{ value: 'COVID', position: 'top', fontSize: 10, fill: '#f87171', dy: -4 }}
              />
              <ReferenceLine
                x={2019}
                stroke="rgba(251,191,36,0.3)"
                strokeDasharray="4 2"
                label={{ value: 'AMLO', position: 'top', fontSize: 10, fill: '#fcd34d', dy: -20 }}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                domain={[0, 100]}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              />
              <Line
                type="monotone"
                dataKey="competition_by_value"
                name="Gasto competitivo (valor)"
                stroke="#c41e3a"
                strokeWidth={3}
                dot={{ r: 3, fill: '#c41e3a' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="competition_rate"
                name={t('competitionRateYAxis')}
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="single_bid_rate"
                name={t('singleBidRateYAxis')}
                stroke="var(--color-text-muted)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: 'var(--color-text-muted)' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-2">
            <span className="w-5 h-0.5 rounded" style={{ backgroundColor: '#c41e3a', height: '3px' }} />
            Gasto competitivo (valor)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5" style={{ borderTop: '2px dashed #f87171', height: 0 }} />
            {t('competitionRateYAxis')}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5" style={{ borderTop: '2px dashed var(--color-text-muted)', height: 0 }} />
            {t('singleBidRateYAxis')}
          </span>
        </div>

        {/* Presidential term legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {PRESIDENCIAS.map((p) => (
            <span key={p.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color.replace('0.06', '0.4').replace('0.05', '0.35') }} />
              {p.name} {p.start}–{p.end}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// ML Agreement Callout
// ---------------------------------------------------------------------------

function AgreementSection({ t }: { t: (k: string, o?: Record<string, unknown>) => string }) {
  const { data } = useQuery<CorrelationResponse>({
    queryKey: ['phi-correlation'],
    queryFn: () => phiApi.getCorrelation(),
  })

  const agreement = data?.correlations?.ml_phi_agreement
  if (!agreement) return null

  return (
    <section className="mb-12">
      <SectionLabel>{t('crossValidation')}</SectionLabel>
      <div
        className="fern-card rounded-2xl p-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Big stat */}
          <div className="flex-shrink-0 text-center">
            <p
              className="font-bold leading-none"
              style={{ fontFamily: SERIF, fontSize: '4.5rem', color: '#2563eb' }}
            >
              {agreement.agreement_rate}%
            </p>
            <p className="text-xs mt-2 font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Concordancia
            </p>
          </div>

          {/* Explanation text */}
          <div className="flex-1">
            <h3
              className="font-semibold text-lg mb-2"
              style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}
            >
              {t('sectionAgreement')}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('agreementStat', { pct: agreement.agreement_rate })}
            </p>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              {t('agreementExplain', {
                total: agreement.high_risk_contracts.toLocaleString(),
                flagged: agreement.also_flagged_by_phi.toLocaleString(),
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Methodology Disclaimer
// ---------------------------------------------------------------------------

function MethodologyFooter({ sources }: { sources: string[] }) {
  const { t } = useTranslation('reportcard')
  const navigate = useNavigate()

  return (
    <section className="mt-16 mb-8">
      <div
        className="border rounded-xl p-6"
        style={{ backgroundColor: 'var(--color-background-card)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {t('methodologyNoteTitle')}
        </h3>
        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('methodologyNoteBody')}
        </p>
        <button
          onClick={() => navigate('/methodology')}
          className="text-xs font-medium transition-colors"
          style={{ color: '#c41e3a' }}
        >
          {t('viewFullMethodology')}
        </button>

        {sources.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('sourcesLabel')}
            </p>
            <ul className="text-[11px] space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 10-tier grade system
// ---------------------------------------------------------------------------

const GRADE10_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'S':  { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(52,211,153,0.25)', bar: '#10b981' },
  'A':  { bg: 'rgba(34,197,94,0.10)', text: '#4ade80', border: 'rgba(74,222,128,0.25)', bar: '#22c55e' },
  'B+': { bg: 'rgba(132,204,22,0.10)', text: '#a3e635', border: 'rgba(163,230,53,0.25)', bar: '#84cc16' },
  'B':  { bg: 'rgba(234,179,8,0.10)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)', bar: '#eab308' },
  'C+': { bg: 'rgba(245,158,11,0.10)', text: '#fcd34d', border: 'rgba(252,211,77,0.25)', bar: '#f59e0b' },
  'C':  { bg: 'rgba(249,115,22,0.10)', text: '#fb923c', border: 'rgba(251,146,60,0.25)', bar: '#f97316' },
  'D':  { bg: 'rgba(239,68,68,0.10)', text: '#f87171', border: 'rgba(248,113,113,0.25)', bar: '#ef4444' },
  'D-': { bg: 'rgba(220,38,38,0.10)', text: '#fca5a5', border: 'rgba(252,165,165,0.25)', bar: '#dc2626' },
  'F':  { bg: 'rgba(153,27,27,0.15)', text: '#fca5a5', border: 'rgba(239,68,68,0.25)', bar: '#991b1b' },
  'F-': { bg: 'rgba(28,5,5,0.80)', text: '#fca5a5', border: 'rgba(153,27,27,0.50)', bar: '#450a0a' },
}

const GRADE10_ORDER_KEYS = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'D-', 'F', 'F-']

// Institution scorecard types
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
  confidence_band?: string | null
  p90_risk_score?: number | null
  trend_direction?: string | null
  peer_percentile_sector?: number | null
  key_metrics?: string | null
}

interface InstitutionScorecardListResponse {
  data: InstitutionScorecardItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
  grade_distribution: Record<string, number>
}

// Vendor scorecard types
interface VendorScorecardItem {
  vendor_id: number
  vendor_name: string
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  sector_percentile: number
  pillar_risk_signal: number
  confidence_band?: string | null
  p90_risk_score?: number | null
  trend_direction?: string | null
  risk_tier?: string | null
  key_metrics?: string | null
  pillar_conduct: number
  pillar_spread: number
  pillar_behavior: number
  pillar_flags: number
  top_risk_driver: string | null
}

interface VendorScorecardListResponse {
  data: VendorScorecardItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
  grade_distribution: Record<string, number>
}

interface ScorecardSummary {
  institutions_scored: number
  vendors_scored: number
  institution_grade_distribution: Record<string, number>
  vendor_grade_distribution: Record<string, number>
  institution_avg_score: number
  vendor_avg_score: number
  computed_at: string | null
}

// ---------------------------------------------------------------------------
// GradeBadge10 — the 10-tier badge
// ---------------------------------------------------------------------------

function GradeBadge10({
  grade,
  size = 'md',
}: {
  grade: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const c = GRADE10_COLORS[grade] ?? GRADE10_COLORS['F']
  const sizeClasses = {
    sm:  'w-7 h-7 text-sm',
    md:  'w-9 h-9 text-base',
    lg:  'w-12 h-12 text-xl',
    xl:  'w-16 h-16 text-3xl',
  }[size]
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-lg font-bold flex-shrink-0', sizeClasses)}
      style={{ fontFamily: SERIF, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {grade}
    </span>
  )
}

// ---------------------------------------------------------------------------
// TrendArrow — inline trend indicator
// ---------------------------------------------------------------------------

function TrendArrow({ direction, invertColor = false }: { direction: string | null | undefined; invertColor?: boolean }) {
  if (!direction) return null
  const configs: Record<string, { arrow: string; color: string }> = {
    improving:     { arrow: invertColor ? '\u2191' : '\u2193', color: '#16a34a' },
    deteriorating: { arrow: invertColor ? '\u2193' : '\u2191', color: '#dc2626' },
    stable:        { arrow: '\u2192', color: '#6b7280' },
  }
  const cfg = configs[direction]
  if (!cfg) return null
  return (
    <span className="font-mono text-xs font-bold" style={{ color: cfg.color }} title={direction}>
      {cfg.arrow}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ConfidencePill — data reliability indicator
// ---------------------------------------------------------------------------

function ConfidencePill({ band }: { band: string | null | undefined }) {
  if (!band) return null
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    wide:   { label: '~uncertain', bg: 'rgba(249,115,22,0.12)', text: '#ea580c' },
    medium: { label: '~moderate',  bg: 'rgba(234,179,8,0.12)',  text: '#ca8a04' },
    narrow: { label: '~reliable',  bg: 'rgba(59,130,246,0.12)', text: '#2563eb' },
    high:   { label: '\u25CF reliable', bg: 'rgba(22,163,74,0.12)', text: '#16a34a' },
  }
  const cfg = configs[band]
  if (!cfg) return null
  return (
    <span
      className="inline-flex items-center font-mono rounded-full px-1.5 py-0.5"
      style={{ fontSize: '9px', lineHeight: '1', backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SignalDot — colored circle for signal status
// ---------------------------------------------------------------------------

function SignalDot({ signal, title: dotTitle }: { signal: 'green' | 'yellow' | 'red' | null | undefined; title?: string }) {
  const colors: Record<string, string> = { green: '#16a34a', yellow: '#eab308', red: '#dc2626' }
  const color = signal ? colors[signal] : '#6b7280'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color, opacity: signal ? 1 : 0.3 }}
      title={dotTitle}
    />
  )
}

// ---------------------------------------------------------------------------
// RiskTierBadge — replaces A-F grade for vendors
// ---------------------------------------------------------------------------

function RiskTierBadge({ tier, t }: { tier: string | null | undefined; t: (k: string) => string }) {
  const configs: Record<string, { bg: string; text: string; labelKey: string }> = {
    flag:     { bg: '#7f1d1d', text: '#ffffff', labelKey: 'riskTierFlag' },
    watch:    { bg: '#dc2626', text: '#ffffff', labelKey: 'riskTierWatch' },
    elevated: { bg: '#ea580c', text: '#ffffff', labelKey: 'riskTierElevated' },
    low:      { bg: '#16a34a', text: '#ffffff', labelKey: 'riskTierLow' },
  }
  const cfg = tier ? configs[tier] : null
  const label = cfg ? t(cfg.labelKey) : t('riskTierUnscored')
  const bg = cfg?.bg ?? '#6b7280'
  const textColor = cfg?.text ?? '#ffffff'
  return (
    <span
      className="inline-flex items-center font-mono font-bold rounded px-1.5 py-0.5 uppercase"
      style={{ fontSize: '10px', lineHeight: '1.2', backgroundColor: bg, color: textColor }}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SignalStrip — 5 dots inline for table row quick view
// ---------------------------------------------------------------------------

function SignalStrip({ metrics }: { metrics: Record<string, unknown> | null }) {
  const { t } = useTranslation('reportcard')
  const signals = [
    { key: 'signal_competitive', labelKey: 'signalCompetitive' },
    { key: 'signal_single_bid', labelKey: 'signalSingleBid' },
    { key: 'signal_short_ad', labelKey: 'signalShortAd' },
    { key: 'signal_p90_risk', labelKey: 'signalP90Risk' },
    { key: 'signal_external', labelKey: 'signalExternal' },
  ]
  return (
    <div className="flex items-center gap-1">
      {signals.map((s) => {
        const val = metrics ? (metrics[s.key] as string | undefined) : null
        const signal = (val === 'green' || val === 'yellow' || val === 'red') ? val : null
        return <SignalDot key={s.key} signal={signal} title={t(s.labelKey)} />
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// parseKeyMetrics — safely parse JSON key_metrics
// ---------------------------------------------------------------------------

function parseKeyMetrics(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// countAlerts — count red/yellow signals in key_metrics
// ---------------------------------------------------------------------------

function countAlerts(metrics: Record<string, unknown> | null): number {
  if (!metrics) return 0
  const signalKeys = ['signal_competitive', 'signal_single_bid', 'signal_short_ad', 'signal_p90_risk', 'signal_external']
  return signalKeys.filter((k) => {
    const v = metrics[k]
    return v === 'red' || v === 'yellow'
  }).length
}

// ---------------------------------------------------------------------------
// InstitutionSignalPanel — expanded signal dashboard for institutions
// ---------------------------------------------------------------------------

function InstitutionSignalPanel({ metrics, t }: { metrics: Record<string, unknown>; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const signalCards = [
    {
      labelKey: 'signalCompetitive',
      value: metrics.competitive_rate != null ? `${((metrics.competitive_rate as number) * 100).toFixed(0)}%` : '--',
      subValue: metrics.competitive_rate_value != null ? `${((metrics.competitive_rate_value as number) * 100).toFixed(0)}% ${t('signalByValue')}` : null,
      trend: metrics.trend_competitive as string | undefined,
      signal: metrics.signal_competitive as string | undefined,
      benchmark: 'OECD: >50%',
      invertTrend: true,
    },
    {
      labelKey: 'signalSingleBid',
      value: metrics.single_bid_pct != null ? `${((metrics.single_bid_pct as number) * 100).toFixed(0)}%` : '--',
      subValue: null,
      trend: metrics.trend_single_bid as string | undefined,
      signal: metrics.signal_single_bid as string | undefined,
      benchmark: 'OECD: <20%',
      invertTrend: false,
    },
    {
      labelKey: 'signalP90Risk',
      value: metrics.p90_risk != null ? ((metrics.p90_risk as number)).toFixed(2) : '--',
      subValue: null,
      trend: metrics.trend_risk as string | undefined,
      signal: metrics.signal_p90_risk as string | undefined,
      benchmark: null,
      invertTrend: false,
    },
    {
      labelKey: 'signalShortAd',
      value: metrics.short_ad_rate != null ? `${((metrics.short_ad_rate as number) * 100).toFixed(0)}%` : '--',
      subValue: null,
      trend: null,
      signal: metrics.signal_short_ad as string | undefined,
      benchmark: '<15%',
      invertTrend: false,
    },
    {
      labelKey: 'signalYearEnd',
      value: metrics.year_end_rate != null ? `${((metrics.year_end_rate as number) * 100).toFixed(0)}%` : '--',
      subValue: null,
      trend: null,
      signal: metrics.signal_year_end as string | undefined,
      benchmark: '<12%',
      invertTrend: false,
    },
    {
      labelKey: 'signalExternal',
      value: metrics.efos_vendors != null ? `${metrics.efos_vendors} EFOS` : '--',
      subValue: metrics.aria_t1_vendors != null ? `${metrics.aria_t1_vendors} T1 / ${metrics.aria_t2_vendors ?? 0} T2` : null,
      trend: null,
      signal: metrics.signal_external as string | undefined,
      benchmark: null,
      invertTrend: false,
    },
  ]

  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>
        {t('signalPanelTitle')}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {signalCards.map((card) => {
          const signalVal = (card.signal === 'green' || card.signal === 'yellow' || card.signal === 'red') ? card.signal : null
          return (
            <div
              key={card.labelKey}
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--color-background-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  {t(card.labelKey)}
                </span>
                <SignalDot signal={signalVal} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                  {card.value}
                </span>
                {card.trend && <TrendArrow direction={card.trend} invertColor={card.invertTrend} />}
              </div>
              {card.subValue && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{card.subValue}</p>
              )}
              {card.benchmark && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                  {t('benchmarkOECD')}: {card.benchmark}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PillarBar — 0-20 (or other max) visual bar
// ---------------------------------------------------------------------------

function PillarBar({
  label,
  score,
  maxScore,
  color: fallbackColor,
}: {
  label: string
  score: number
  maxScore: number
  color: string
}) {
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100))
  const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? fallbackColor : pct >= 30 ? '#f97316' : '#ef4444'
  const pillarRef = useRef<HTMLDivElement>(null)
  const [barWidth, setBarWidth] = useState(0)
  const [pillShimmer, setPillShimmer] = useState(false)

  useEffect(() => {
    const el = pillarRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBarWidth(pct)
          setTimeout(() => setPillShimmer(true), 1600)
          obs.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [pct])

  return (
    <div ref={pillarRef} className="space-y-1">
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{label}</span>
        <span className="font-medium tabular-nums">{score.toFixed(0)}/{maxScore}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-1.5 rounded-full relative overflow-hidden"
          style={{
            width: `${barWidth}%`,
            backgroundColor: barColor,
            transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {pillShimmer && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                animation: 'shimmerSweep 0.8s ease-out forwards',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GradeDistBar — stacked horizontal grade distribution
// ---------------------------------------------------------------------------

function GradeDistBar({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  if (total === 0) return null
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden gap-[1px]">
        {GRADE10_ORDER_KEYS.map((g) => {
          const count = distribution[g] ?? 0
          if (count === 0) return null
          const pct = (count / total) * 100
          const c = GRADE10_COLORS[g]
          return (
            <div
              key={g}
              style={{ width: `${pct}%`, backgroundColor: c.bar, minWidth: pct > 1 ? undefined : '2px' }}
              title={`${g}: ${count.toLocaleString()}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {GRADE10_ORDER_KEYS.filter((g) => (distribution[g] ?? 0) > 0).map((g) => {
          const count = distribution[g] ?? 0
          const c = GRADE10_COLORS[g]
          return (
            <span key={g} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.bar }} />
              <strong style={{ color: c.text }}>{g}</strong>
              {count.toLocaleString()}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Institution Scorecards Tab
// ---------------------------------------------------------------------------

const SECTORS_ES: Record<string, string> = {
  salud: 'Salud', educacion: 'Educación', infraestructura: 'Infraestructura',
  energia: 'Energía', defensa: 'Defensa', tecnologia: 'Tecnología',
  hacienda: 'Hacienda', gobernacion: 'Gobernación', agricultura: 'Agricultura',
  ambiente: 'Ambiente', trabajo: 'Trabajo', otros: 'Otros',
}

const INST_PILLARS = [
  { key: 'pillar_openness' as const, labelKey: 'pillarOpenness', max: 20 },
  { key: 'pillar_price' as const, labelKey: 'pillarPrice', max: 20 },
  { key: 'pillar_vendors' as const, labelKey: 'pillarVendors', max: 20 },
  { key: 'pillar_process' as const, labelKey: 'pillarProcess', max: 20 },
  { key: 'pillar_external' as const, labelKey: 'pillarExternal', max: 20 },
]

// InstitutionTbody — wraps tbody, triggers row stagger animation on scroll
function InstitutionTbody({ children }: { children: React.ReactNode }) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const inView = useInView(tbodyRef, { once: true, margin: '-40px' })
  return (
    <tbody
      ref={tbodyRef}
      className={inView ? 'inst-tbody-visible' : 'inst-tbody-hidden'}
    >
      {children}
    </tbody>
  )
}

// ---------------------------------------------------------------------------
// InstitutionDotScale — Bloomberg-style dot ranking on a risk axis
// ---------------------------------------------------------------------------

interface DotTooltipState {
  id: number
  name: string
  score: number
  grade: string
  sector: string
  x: number
  y: number
}

const DOT_GRADE_COLORS: Record<string, string> = {
  'S': '#10b981', 'A': '#16a34a',
  'B+': '#22c55e', 'B': '#22c55e',
  'C+': '#eab308', 'C': '#eab308',
  'D': '#f97316', 'D-': '#f97316',
  'F': '#dc2626', 'F-': '#dc2626',
}

function InstitutionDotScale({ items }: { items: InstitutionScorecardItem[] }) {
  const { t } = useTranslation('reportcard')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [tooltip, setTooltip] = useState<DotTooltipState | null>(null)
  const [visible, setVisible] = useState(false)

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // IntersectionObserver — trigger dot animation once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const DOT_SIZE = 10
  const ROW_COUNT = 4
  const ROW_HEIGHT = 18
  const AXIS_TOP = ROW_COUNT * ROW_HEIGHT + 4

  const handleDotEnter = useCallback((
    inst: InstitutionScorecardItem,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dotRect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      id: inst.institution_id,
      name: inst.institution_name,
      score: inst.total_score,
      grade: inst.grade,
      sector: inst.sector_name ?? '',
      x: dotRect.left - rect.left + DOT_SIZE / 2,
      y: dotRect.top - rect.top,
    })
  }, [])

  const handleDotLeave = useCallback(() => setTooltip(null), [])

  // Clamp tooltip X so it doesn't overflow
  const tooltipX = useMemo(() => {
    if (!tooltip) return 0
    const half = 120
    return Math.max(half, Math.min(containerWidth - half, tooltip.x))
  }, [tooltip, containerWidth])

  if (items.length === 0) return null

  // While measuring, render invisible container
  if (containerWidth === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
            {t('rankingInstitutionsShort')}
          </h3>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(196,30,58,0.10)', color: '#c41e3a' }}
          >
            {items.length}
          </span>
        </div>
        <div
          ref={containerRef}
          className="fern-card rounded-xl p-4"
          style={{ borderColor: 'var(--color-border)', minHeight: 140 }}
        />
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
          {t('rankingInstitutions')}
        </h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(196,30,58,0.10)', color: '#c41e3a' }}
        >
          {items.length}
        </span>
      </div>

      <div
        ref={containerRef}
        className={cn('fern-card rounded-xl p-4 relative', visible ? 'dot-scale-visible' : '')}
        style={{ borderColor: 'var(--color-border)', minHeight: AXIS_TOP + 36 }}
      >
        {/* Dots */}
        {items.map((inst, i) => {
          const x = (inst.total_score / 100) * (containerWidth - DOT_SIZE)
          const row = i % ROW_COUNT
          const color = DOT_GRADE_COLORS[inst.grade] ?? '#64748b'
          const isHovered = tooltip?.id === inst.institution_id
          return (
            <div
              key={inst.institution_id}
              className="dot-scale-dot absolute cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${inst.institution_name}: ${inst.total_score} ${t('points')}, ${t('gradeWord')} ${inst.grade}`}
              style={{
                left: x,
                top: row * ROW_HEIGHT,
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: '50%',
                backgroundColor: color,
                animationDelay: `${i * 30}ms`,
                transform: isHovered ? 'scale(1.8)' : undefined,
                zIndex: isHovered ? 10 : 1,
                transition: 'transform 0.15s ease',
                boxShadow: isHovered ? `0 0 0 2px var(--color-background-card), 0 0 0 3px ${color}` : undefined,
              }}
              onMouseEnter={(e) => handleDotEnter(inst, e)}
              onMouseLeave={handleDotLeave}
              onFocus={(e) => handleDotEnter(inst, e as unknown as React.MouseEvent<HTMLDivElement>)}
              onBlur={handleDotLeave}
            />
          )
        })}

        {/* Gradient axis bar */}
        <div
          className="absolute left-4 right-4 rounded-full"
          style={{
            top: AXIS_TOP,
            height: 6,
            background: 'linear-gradient(to right, #dc2626, #f97316, #eab308, #22c55e, #16a34a)',
            opacity: 0.7,
          }}
        />

        {/* Axis labels */}
        <div
          className="absolute left-4 right-4 flex justify-between"
          style={{ top: AXIS_TOP + 10 }}
        >
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {t('moreRisk')}
          </span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {t('moreTransparent')}
          </span>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: tooltipX,
              top: tooltip.y - 8,
              transform: 'translate(-50%, -100%)',
              zIndex: 50,
            }}
          >
            <div
              className="rounded-lg px-3 py-2 shadow-lg text-center whitespace-nowrap"
              style={{
                backgroundColor: 'var(--color-background-card)',
                border: '1px solid var(--color-border)',
                maxWidth: 260,
              }}
            >
              <p
                className="text-xs font-semibold leading-tight mb-1"
                style={{ color: 'var(--color-text-primary)', whiteSpace: 'normal' }}
              >
                {tooltip.name}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ fontFamily: SERIF, color: DOT_GRADE_COLORS[tooltip.grade] ?? '#64748b' }}
                >
                  {tooltip.score.toFixed(0)}
                </span>
                <GradeBadge10 grade={tooltip.grade} size="sm" />
              </div>
              {tooltip.sector && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {SECTORS_ES[tooltip.sector] ?? tooltip.sector}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// InstitutionLedeBanner — at-risk callout for institutions tab
// ---------------------------------------------------------------------------

function InstitutionLedeBanner({ summary }: { summary: ScorecardSummary }) {
  const dist = summary.institution_grade_distribution
  const concerningGrades = ['C+', 'C', 'D', 'D-', 'F', 'F-']
  const concerningCount = concerningGrades.reduce((acc, g) => acc + (dist[g] ?? 0), 0)
  const total = summary.institutions_scored
  if (!concerningCount || !total) return null
  const pct = ((concerningCount / total) * 100).toFixed(1)

  return (
    <div
      className="rounded-xl px-5 py-4 mb-6 flex flex-wrap items-center gap-5"
      style={{
        border: '1px solid rgba(220,38,38,0.15)',
        borderLeftWidth: '4px',
        borderLeftColor: '#dc2626',
        borderLeftStyle: 'solid',
        backgroundColor: 'rgba(220,38,38,0.05)',
      }}
    >
      <div className="flex-shrink-0 text-center min-w-[5rem]">
        <span
          className="font-bold leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '3.5rem', color: '#dc2626' }}
        >
          {concerningCount.toLocaleString()}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: '#dc2626', opacity: 0.8 }}>
          {pct}% of agencies
        </p>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
          federal agencies score{' '}
          <span style={{ color: '#dc2626' }}>C+ or below</span>
          {' '}— in the Watch, Concerning, or High Risk zone
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Average score: {summary.institution_avg_score}/100 · RUBLI 5-pillar model · {total.toLocaleString()} institutions evaluated
        </p>
      </div>
    </div>
  )
}

// VendorLedeBanner — at-risk callout for vendors tab
// ---------------------------------------------------------------------------

function VendorLedeBanner({ summary }: { summary: ScorecardSummary }) {
  const { t } = useTranslation('reportcard')
  const dist = summary.vendor_grade_distribution
  const highRiskGrades = ['D', 'D-', 'F', 'F-']
  const highRiskCount = highRiskGrades.reduce((acc, g) => acc + (dist[g] ?? 0), 0)
  const total = summary.vendors_scored
  if (!highRiskCount || !total) return null
  const pct = ((highRiskCount / total) * 100).toFixed(1)

  return (
    <div
      className="rounded-xl px-5 py-4 mb-6 flex flex-wrap items-center gap-5"
      style={{
        border: '1px solid rgba(220,38,38,0.15)',
        borderLeftWidth: '4px',
        borderLeftColor: '#dc2626',
        borderLeftStyle: 'solid',
        backgroundColor: 'rgba(220,38,38,0.05)',
      }}
    >
      <div className="flex-shrink-0 text-center min-w-[5rem]">
        <span
          className="font-bold leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '3.5rem', color: '#dc2626' }}
        >
          {highRiskCount.toLocaleString()}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: '#dc2626', opacity: 0.8 }}>
          {pct}% of vendors
        </p>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
          {t('vendorLedeHighRisk')}
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {t('riskScoreLabel')}: {summary.vendor_avg_score}/100 avg {'\u00b7'} {total.toLocaleString()} suppliers evaluated
        </p>
      </div>
    </div>
  )
}

function InstitutionScorecardsTab() {
  const { t } = useTranslation('reportcard')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('total_score')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [gradeFilter, setGradeFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: summary } = useQuery<ScorecardSummary>({
    queryKey: ['scorecard-summary'],
    queryFn: () => scorecardApi.getSummary(),
    staleTime: 10 * 60 * 1000,
  })

  const { data, isLoading } = useQuery<InstitutionScorecardListResponse>({
    queryKey: ['institution-scorecards', page, sortBy, order, gradeFilter, sectorFilter, search],
    queryFn: () => scorecardApi.getInstitutions({
      page, per_page: 25, sort_by: sortBy, order,
      grade: gradeFilter || undefined,
      sector: sectorFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 5 * 60 * 1000,
  })

  const handleSearch = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 300)
  }

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setOrder('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span style={{ color: 'var(--color-text-muted)' }}>↕</span>
    return <span style={{ color: '#c41e3a' }}>{order === 'desc' ? '↓' : '↑'}</span>
  }

  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div>
      {/* Summary bar */}
      {summary && (
        <div className="fern-card rounded-2xl p-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap gap-8 items-start">
            <div>
              <p className="text-3xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                {summary.institutions_scored.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('institutionsEvaluated')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                {summary.institution_avg_score}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('averageScore')}</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('gradeDistribution')}
              </p>
              <GradeDistBar
                distribution={summary.institution_grade_distribution}
                total={summary.institutions_scored}
              />
            </div>
          </div>
        </div>
      )}

      {summary && <InstitutionLedeBanner summary={summary} />}
      <GradeScale10 />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('searchInstitution')}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-elevated)' }}
        />
        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-elevated)' }}
        >
          <option value="">{t('allGrades')}</option>
          {GRADE10_ORDER_KEYS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={sectorFilter}
          onChange={(e) => { setSectorFilter(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-elevated)' }}
        >
          <option value="">{t('allSectors')}</option>
          {Object.entries(SECTORS_ES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Dot Scale visualization */}
      {!isLoading && data?.data && <InstitutionDotScale items={data.data} />}

      {/* Table */}
      <div className="fern-card rounded-2xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: '#c41e3a' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-elevated)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('institution')}</th>
                <th
                  className="px-3 py-3 text-center font-medium cursor-pointer whitespace-nowrap"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={() => handleSort('total_score')}
                >
                  {t('grade')} <SortIcon col="total_score" />
                </th>
                <th className="px-3 py-3 text-center font-medium hidden md:table-cell" style={{ color: 'var(--color-text-secondary)' }}>Signals</th>
                <th className="px-3 py-3 text-center font-medium hidden lg:table-cell" style={{ color: 'var(--color-text-secondary)' }}>{t('p90RiskLabel')}</th>
                <th className="px-3 py-3 text-center font-medium hidden xl:table-cell" style={{ color: 'var(--color-text-secondary)' }}>Peer</th>
              </tr>
            </thead>
            <InstitutionTbody>
              {(data?.data ?? []).map((inst, rowIdx) => {
                const c = GRADE10_COLORS[inst.grade] ?? GRADE10_COLORS['F']
                const isExpanded = expandedId === inst.institution_id
                const km = parseKeyMetrics(inst.key_metrics)
                const alertCount = countAlerts(km)
                const sectorMeta = SECTORS.find((s) => s.name?.toLowerCase() === inst.sector_name?.toLowerCase())
                const sectorColor = sectorMeta?.color || '#64748b'
                return (
                  <>
                    <tr
                      key={inst.institution_id}
                      className="border-t cursor-pointer transition-colors hover:bg-[var(--color-background-elevated)] inst-row-stagger"
                      style={{
                        borderColor: 'var(--color-border)',
                        animationDelay: rowIdx < 10 ? `${rowIdx * 50}ms` : '0ms',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : inst.institution_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: sectorColor }} />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                              {inst.institution_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {inst.sector_name && (
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {SECTORS_ES[inst.sector_name] ?? inst.sector_name}
                                  {inst.ramo_code ? ` \u00b7 Ramo ${inst.ramo_code}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <GradeBadge10 grade={inst.grade} size="sm" />
                          <div className="flex items-center gap-1">
                            <TrendArrow direction={inst.trend_direction} />
                            <ConfidencePill band={inst.confidence_band} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <SignalStrip metrics={km} />
                          <span className="text-[9px] font-mono" style={{ color: alertCount > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                            {t('signalAlertsCount', { count: alertCount })}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center hidden lg:table-cell">
                        {inst.p90_risk_score != null && inst.p90_risk_score > 0.50 ? (
                          <span className="text-xs font-mono font-bold tabular-nums" style={{ color: '#dc2626' }}>
                            {inst.p90_risk_score.toFixed(2)}
                          </span>
                        ) : inst.p90_risk_score != null ? (
                          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                            {inst.p90_risk_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>--</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center hidden xl:table-cell">
                        {inst.peer_percentile_sector != null ? (
                          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('peerPercentile', { pct: ((1 - inst.peer_percentile_sector) * 100).toFixed(0) })}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>--</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${inst.institution_id}-exp`} style={{ backgroundColor: 'var(--color-background-elevated)', borderTop: '1px solid var(--color-border)' }}>
                        <td colSpan={5} className="px-4 py-4">
                          {km ? (
                            <InstitutionSignalPanel metrics={km} t={t} />
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              {INST_PILLARS.map((p) => (
                                <PillarBar
                                  key={p.key}
                                  label={t(p.labelKey)}
                                  score={inst[p.key]}
                                  maxScore={p.max}
                                  color={c.bar}
                                />
                              ))}
                            </div>
                          )}
                          {inst.top_risk_driver && (
                            <p className="text-xs mt-3" style={{ color: '#c41e3a' }}>
                              {t('topRiskDriver')}: <strong>{inst.top_risk_driver}</strong>
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </InstitutionTbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-elevated)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {total.toLocaleString()} {t('institutionsCount')} · {t('pageOf', { page, total: totalPages })}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                ← {t('previous')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vendor Scorecards Tab
// ---------------------------------------------------------------------------

const VENDOR_PILLARS = [
  { key: 'pillar_risk_signal' as const, labelKey: 'pillarRiskSignal', max: 25 },
  { key: 'pillar_conduct' as const, labelKey: 'pillarConduct', max: 20 },
  { key: 'pillar_spread' as const, labelKey: 'pillarSpread', max: 20 },
  { key: 'pillar_behavior' as const, labelKey: 'pillarBehavior', max: 20 },
  { key: 'pillar_flags' as const, labelKey: 'pillarFlags', max: 15 },
]

function VendorScorecardsTab() {
  const { t } = useTranslation('reportcard')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('total_score')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')  // asc = cleanest first by default
  const [gradeFilter, setGradeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: summary } = useQuery<ScorecardSummary>({
    queryKey: ['scorecard-summary'],
    queryFn: () => scorecardApi.getSummary(),
    staleTime: 10 * 60 * 1000,
  })

  const { data, isLoading } = useQuery<VendorScorecardListResponse>({
    queryKey: ['vendor-scorecards', page, sortBy, order, gradeFilter, search],
    queryFn: () => scorecardApi.getVendors({
      page, per_page: 25, sort_by: sortBy, order,
      grade: gradeFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 5 * 60 * 1000,
  })

  const handleSearch = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 300)
  }

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setOrder(col === 'total_score' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span style={{ color: 'var(--color-text-muted)' }}>↕</span>
    return <span style={{ color: '#c41e3a' }}>{order === 'desc' ? '↓' : '↑'}</span>
  }

  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div>
      {/* Summary bar */}
      {summary && (
        <div className="fern-card rounded-2xl p-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap gap-8 items-start">
            <div>
              <p className="text-3xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                {summary.vendors_scored.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('vendorsEvaluated')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
                {summary.vendor_avg_score}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('averageScore')}</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('gradeDistribution')}
              </p>
              <GradeDistBar
                distribution={summary.vendor_grade_distribution}
                total={summary.vendors_scored}
              />
            </div>
          </div>
        </div>
      )}

      {summary && <VendorLedeBanner summary={summary} />}
      <GradeScale10 />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('searchVendor')}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-elevated)' }}
        />
        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-elevated)' }}
        >
          <option value="">{t('allGrades')}</option>
          {GRADE10_ORDER_KEYS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => { setSortBy('total_score'); setOrder('asc'); setPage(1) }}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
              sortBy === 'total_score' && order === 'asc'
                ? 'text-white' : ''
            )}
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: sortBy === 'total_score' && order === 'asc' ? '#c41e3a' : 'var(--color-background-card)',
              color: sortBy === 'total_score' && order === 'asc' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {t('highestRiskFirst')}
          </button>
          <button
            onClick={() => { setSortBy('total_score'); setOrder('desc'); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: sortBy === 'total_score' && order === 'desc' ? '#22c55e' : 'var(--color-background-card)',
              color: sortBy === 'total_score' && order === 'desc' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {t('cleanestFirst')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="fern-card rounded-2xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: '#c41e3a' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-elevated)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('vendor')}</th>
                <th
                  className="px-3 py-3 text-center font-medium cursor-pointer whitespace-nowrap"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={() => handleSort('total_score')}
                >
                  {t('riskScoreLabel')} <SortIcon col="total_score" />
                </th>
                <th className="px-3 py-3 text-center font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('grade')}</th>
                <th className="px-3 py-3 text-center font-medium hidden md:table-cell" style={{ color: 'var(--color-text-secondary)' }}>{t('p90RiskLabel')}</th>
                <th className="px-3 py-3 text-center font-medium hidden lg:table-cell" style={{ color: 'var(--color-text-secondary)' }}>Details</th>
                <th className="px-3 py-3 text-center font-medium hidden xl:table-cell" style={{ color: 'var(--color-text-secondary)' }}>Percentile</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((vendor) => {
                const c = GRADE10_COLORS[vendor.grade] ?? GRADE10_COLORS['F']
                const isExpanded = expandedId === vendor.vendor_id
                const riskScore = vendor.total_score
                const riskColor = riskScore >= 60 ? '#dc2626' : riskScore >= 40 ? '#ea580c' : riskScore >= 25 ? '#eab308' : '#16a34a'
                return (
                  <>
                    <tr
                      key={vendor.vendor_id}
                      className="border-t cursor-pointer transition-colors hover:bg-[var(--color-background-elevated)]"
                      style={{ borderColor: 'var(--color-border)' }}
                      onClick={() => setExpandedId(isExpanded ? null : vendor.vendor_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <RiskTierBadge tier={vendor.risk_tier} t={t} />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                              {vendor.vendor_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ConfidencePill band={vendor.confidence_band} />
                              <TrendArrow direction={vendor.trend_direction} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="text-lg font-bold font-mono tabular-nums"
                          style={{ color: riskColor }}
                        >
                          {riskScore.toFixed(0)}
                        </span>
                        <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>/100</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <GradeBadge10 grade={vendor.grade} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        {vendor.p90_risk_score != null && vendor.p90_risk_score > 0.50 ? (
                          <span className="text-xs font-mono font-bold tabular-nums" style={{ color: '#dc2626' }}>
                            {vendor.p90_risk_score.toFixed(2)}
                          </span>
                        ) : vendor.p90_risk_score != null ? (
                          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                            {vendor.p90_risk_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>--</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center hidden lg:table-cell">
                        <div className="flex flex-col items-center gap-0.5 text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>DA: {vendor.pillar_conduct != null ? `${vendor.pillar_conduct}` : '--'}</span>
                          <span>SB: {vendor.pillar_behavior != null ? `${vendor.pillar_behavior}` : '--'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center hidden xl:table-cell">
                        <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                          {(vendor.national_percentile * 100).toFixed(0)}{'\u00b0'}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${vendor.vendor_id}-exp`} style={{ backgroundColor: 'var(--color-background-elevated)', borderTop: '1px solid var(--color-border)' }}>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {VENDOR_PILLARS.map((p) => (
                              <PillarBar
                                key={p.key}
                                label={t(p.labelKey)}
                                score={vendor[p.key]}
                                maxScore={p.max}
                                color={c.bar}
                              />
                            ))}
                          </div>
                          {vendor.top_risk_driver && (
                            <p className="text-xs mt-3" style={{ color: '#c41e3a' }}>
                              {t('topFactor')}: <strong>{vendor.top_risk_driver}</strong>
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-elevated)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {total.toLocaleString()} {t('vendorsCount')} · {t('pageOf', { page, total: totalPages })}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                ← {t('previous')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grade Scale legend for 10-tier system
// ---------------------------------------------------------------------------

function GradeScale10() {
  const { t } = useTranslation('reportcard')
  return (
    <div
      className="border rounded-xl px-5 py-3 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2"
      style={{ backgroundColor: 'var(--color-background-card)', borderColor: 'var(--color-border)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {t('scale0to100')}
      </span>
      {GRADE10_ORDER_KEYS.map((g) => {
        const c = GRADE10_COLORS[g]
        const ranges: Record<string, string> = {
          'S': '90–100', 'A': '80–89', 'B+': '70–79', 'B': '60–69',
          'C+': '50–59', 'C': '40–49', 'D': '30–39', 'D-': '20–29',
          'F': '10–19', 'F-': '0–9',
        }
        const labelKeys: Record<string, string> = {
          'S': 'gradeLabelSFull', 'A': 'gradeLabelAFull', 'B+': 'gradeLabelBPlusFull', 'B': 'gradeLabelBFull',
          'C+': 'gradeLabelCPlusFull', 'C': 'gradeLabelCFull', 'D': 'gradeLabelDFull', 'D-': 'gradeLabelDMinusFull',
          'F': 'gradeLabelFFull', 'F-': 'gradeLabelFMinusFull',
        }
        return (
          <span key={g} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold"
              style={{ fontFamily: SERIF, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
            >
              {g}
            </span>
            <span>{t(labelKeys[g])} <span style={{ color: 'var(--color-text-muted)' }}>({ranges[g]})</span></span>
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LedeBanner — top-of-PHI at-risk callout
// ---------------------------------------------------------------------------

function LedeBanner({ national }: { national: PHINational }) {
  const dist = national.risk_distribution
  if (!dist) return null
  const critPct = dist.critical?.value_pct ?? 0
  const highPct = dist.high?.value_pct ?? 0
  const combined = critPct + highPct
  if (combined < 1) return null

  return (
    <div
      className="rounded-xl px-5 py-4 mb-8 flex flex-wrap items-center gap-5"
      style={{
        borderLeft: '4px solid #dc2626',
        backgroundColor: 'rgba(220,38,38,0.05)',
        border: '1px solid rgba(220,38,38,0.15)',
        borderLeftWidth: '4px',
        borderLeftColor: '#dc2626',
        borderLeftStyle: 'solid',
      }}
    >
      <div className="flex-shrink-0 text-center min-w-[5rem]">
        <span
          className="font-bold leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '3.5rem', color: '#dc2626' }}
        >
          {combined.toFixed(0)}%
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: '#dc2626', opacity: 0.8 }}>
          At risk
        </p>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
          of all federal spending — measured by peso value — flows through contracts flagged{' '}
          <span style={{ color: '#dc2626' }}>Critical or High risk</span>
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {critPct.toFixed(0)}% Critical · {highPct.toFixed(0)}% High · RUBLI v6.4 model · {national.total_contracts.toLocaleString()} contracts analyzed
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WorstSectorsAlert — worst-3 sectors highlight row
// ---------------------------------------------------------------------------

function WorstSectorsAlert({ sectors, t }: { sectors: PHISector[]; t: (k: string) => string }) {
  if (sectors.length === 0) return null
  const worst = sectors.slice(0, 3)
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#dc2626' }}>
        <span>⚠</span> {t('worstSectorsLabel')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {worst.map((sector) => {
          const meta = SECTORS.find((s) => s.id === sector.sector_id)
          const color = meta?.color || '#64748b'
          const gc = GRADE_COLORS[sector.grade] || GRADE_COLORS['F']
          const name = SECTOR_NAME_ES[sector.sector_name] || sector.sector_name
          return (
            <div
              key={sector.sector_id}
              className="rounded-lg px-4 py-3 flex items-center gap-3"
              style={{
                backgroundColor: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.15)',
                borderLeft: `4px solid ${color}`,
              }}
            >
              <span
                className="font-bold leading-none flex-shrink-0"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', color: gc.text }}
              >
                {sector.grade}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {name}
                </p>
                {sector.competition_by_value != null && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {sector.competition_by_value.toFixed(0)}% competitive spend
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Tab = 'phi' | 'institutions' | 'vendors'

function PHITab({ t }: { t: (k: string, opts?: Record<string, unknown>) => string }) {
  const is503 = useCallback((err: unknown): boolean => {
    return (err as AxiosError)?.response?.status === 503
  }, [])

  const { data, isLoading, error } = useQuery<PHISectorsResponse>({
    queryKey: ['phi-sectors'],
    queryFn: () => phiApi.getSectors(),
    retry: 3,
    retryDelay: (failureCount) => Math.min(1000 * 2 ** failureCount, 30_000),
  })

  const sortedSectors = useMemo(() => {
    if (!data?.sectors) return []
    return [...data.sectors].sort(
      (a, b) => (GRADE_ORDER[a.grade] ?? 2) - (GRADE_ORDER[b.grade] ?? 2)
    )
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-border)', borderTopColor: '#c41e3a' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error && is503(error)) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-10 w-10 border-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-border)', borderTopColor: '#c41e3a' }} />
          <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {t('computing', { defaultValue: 'Computing procurement health data...' })}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('computingDetail', { defaultValue: 'Procurement health data is being computed. Refreshing automatically...' })}
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p style={{ color: '#dc2626' }}>{t('error')}</p>
      </div>
    )
  }

  const { national, methodology } = data

  return (
    <>
      <LedeBanner national={national} />
      <NationalGradeHero national={national} />
      <AgreementSection t={t} />
      <GradeLegend />

      <section className="mb-12">
        <SectionLabel>{t('sectorGrades')}</SectionLabel>
        <h2 className="text-editorial-h2 mb-1" style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}>
          {t('howEachSector')}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {t('clickCardDetail')}
        </p>
        <WorstSectorsAlert sectors={sortedSectors} t={t} />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={cardContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {sortedSectors.map((sector) => (
            <motion.div key={sector.sector_id} variants={cardItemVariants}>
              <SectorReportCard sector={sector} t={t} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <TrendSection t={t} />
      <MethodologyFooter sources={methodology.based_on} />
    </>
  )
}

function ReportCard() {
  const { t } = useTranslation('reportcard')
  const [activeTab, setActiveTab] = useState<Tab>('phi')

  const tabs: { id: Tab; label: string; sub: string }[] = [
    { id: 'phi', label: t('tabPHI'), sub: t('tabPHISub') },
    { id: 'institutions', label: t('tabInstitutions'), sub: t('tabInstitutionsSub') },
    { id: 'vendors', label: t('tabVendors'), sub: t('tabVendorsSub') },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Single page header */}
      <div className="mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: '#c41e3a' }}>
          {t('pageEyebrow')}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1
            className="text-editorial-h1 md:text-editorial-display"
            style={{ fontFamily: SERIF, color: 'var(--color-text-primary)' }}
          >
            {t('pageTitle')}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <FuentePill source="COMPRANET" count={3051294} countLabel={t('countLabel')} verified={true} />
            <MetodologiaTooltip
              title={t('tooltipGradeTitle')}
              body={t('tooltipGradeBody')}
              link="/methodology"
            />
          </div>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('subtitleReportCard')}
        </p>
      </div>

        {/* Tab bar */}
        <div
          className="flex border-b mb-8 gap-0 overflow-x-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-start px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id ? 'border-[#c41e3a]' : 'border-transparent hover:border-[var(--color-border)]'
              )}
              style={{
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-normal mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tab.sub}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'phi' && <PHITab t={t} />}

        {activeTab === 'institutions' && <InstitutionScorecardsTab />}

        {activeTab === 'vendors' && <VendorScorecardsTab />}
    </div>
  )
}

export default ReportCard
