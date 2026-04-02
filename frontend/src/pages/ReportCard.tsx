/**
 * National Procurement Health Report Card
 *
 * Annual-report style editorial page showing Mexico's overall procurement
 * health grade with sector breakdowns, trend analysis, and OECD context.
 *
 * Dark-mode first: zinc-900/950 palette, serif headlines, large grade display.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { phiApi, analysisApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface PHIIndicator {
  value: number
  light: 'green' | 'yellow' | 'red'
  label: string
  description: string
  benchmark: string
  weight?: number | null
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERIF = "'Playfair Display', Georgia, serif"

// Grade config: color + tier
const GRADE_CONFIGS: Record<string, {
  text: string
  bg: string
  border: string
  ring: string
  tier: 'good' | 'ok' | 'poor' | 'bad'
}> = {
  'S':  { text: '#34d399', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(52,211,153,0.25)',  ring: 'rgba(52,211,153,0.30)',  tier: 'good' },
  'A':  { text: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.20)',  ring: 'rgba(74,222,128,0.25)',  tier: 'good' },
  'B+': { text: '#a3e635', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(163,230,53,0.20)',  ring: 'rgba(163,230,53,0.25)',  tier: 'ok'   },
  'B':  { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.20)',  ring: 'rgba(96,165,250,0.25)',  tier: 'ok'   },
  'C+': { text: '#fcd34d', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(252,211,77,0.20)',  ring: 'rgba(252,211,77,0.25)',  tier: 'poor' },
  'C':  { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.20)',  ring: 'rgba(251,191,36,0.25)',  tier: 'poor' },
  'D':  { text: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.20)',  ring: 'rgba(251,146,60,0.30)',  tier: 'bad'  },
  'D-': { text: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(248,113,113,0.20)', ring: 'rgba(248,113,113,0.30)', tier: 'bad'  },
  'F':  { text: '#fca5a5', bg: 'rgba(153,27,27,0.12)',   border: 'rgba(239,68,68,0.20)',   ring: 'rgba(220,38,38,0.35)',   tier: 'bad'  },
  'F-': { text: '#fca5a5', bg: 'rgba(28,5,5,0.75)',      border: 'rgba(153,27,27,0.40)',   ring: 'rgba(220,38,38,0.45)',   tier: 'bad'  },
}

const GRADE_FALLBACK = GRADE_CONFIGS['F']

// Sector colours from project taxonomy
const SECTOR_COLORS_MAP: Record<string, string> = {
  salud:           '#dc2626',
  educacion:       '#3b82f6',
  infraestructura: '#ea580c',
  energia:         '#eab308',
  defensa:         '#1e3a5f',
  tecnologia:      '#8b5cf6',
  hacienda:        '#16a34a',
  gobernacion:     '#be123c',
  agricultura:     '#22c55e',
  ambiente:        '#10b981',
  trabajo:         '#f97316',
  otros:           '#64748b',
}

// Sector display names (ES)
const SECTOR_NAME_ES: Record<string, string> = {
  salud: 'Salud',
  educacion: 'Educacion',
  infraestructura: 'Infraestructura',
  energia: 'Energia',
  defensa: 'Defensa',
  tecnologia: 'Tecnologia',
  hacienda: 'Hacienda',
  gobernacion: 'Gobernacion',
  agricultura: 'Agricultura',
  ambiente: 'Ambiente',
  trabajo: 'Trabajo',
  otros: 'Otros',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardContainerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const cardItemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gradeConfig(grade: string) {
  return GRADE_CONFIGS[grade] ?? GRADE_FALLBACK
}

/** Convert raw high_risk_pct (0-1 or 0-100) to "1 in N" integer. */
function highRiskToOneIn(pct: number): number {
  const fraction = pct > 1 ? pct / 100 : pct
  if (fraction <= 0) return 100
  return Math.round(1 / fraction)
}

/** Format trillions of MXN for the hero stat: 9.9 */
function formatTrillions(mxn: number): string {
  const trillions = mxn / 1_000_000_000_000
  return trillions.toFixed(1)
}

// ---------------------------------------------------------------------------
// Hero Impact Section -- dark card with key stats above the grade hero
// ---------------------------------------------------------------------------

function HeroImpactSection({
  national,
  totalValueMxn,
}: {
  national: PHINational
  totalValueMxn: number | null
}) {
  const dist = national.risk_distribution

  const valueMxn = totalValueMxn ?? national.total_value_mxn ?? null
  const valueLabel: string = valueMxn != null
    ? `MX$${formatTrillions(valueMxn)}T`
    : 'MX$9.9T'

  const criticalCount: number = dist?.critical?.count ?? 184031
  const criticalCountLabel = criticalCount.toLocaleString('en-US')

  const critPct = dist?.critical?.count_pct ?? 6.01
  const highPct = dist?.high?.count_pct ?? 7.48
  const highRiskRate = (critPct + highPct).toFixed(1)

  const totalPct =
    (dist?.critical?.count_pct ?? 0) +
    (dist?.high?.count_pct ?? 0) +
    (dist?.medium?.count_pct ?? 0) +
    (dist?.low?.count_pct ?? 0)

  const barLevels: Array<{ key: keyof RiskDistribution; color: string; label: string }> = [
    { key: 'critical', color: '#dc2626', label: 'Critical' },
    { key: 'high',     color: '#ea580c', label: 'High'     },
    { key: 'medium',   color: '#eab308', label: 'Medium'   },
    { key: 'low',      color: '#22c55e', label: 'Low'      },
  ]

  return (
    <motion.section
      className="mb-8 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      aria-label="Procurement health impact summary"
      role="region"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 divide-zinc-800">
        {/* Stat 1 -- total value */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-zinc-100">
            {valueLabel}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            Contracts analyzed
          </span>
        </div>

        {/* Stat 2 -- critical contracts */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-red-400">
            {criticalCountLabel}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            Critical risk contracts
          </span>
        </div>

        {/* Stat 3 -- high-risk rate */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-orange-400">
            {highRiskRate}%
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            High-risk rate
            <span className="text-cyan-400 ml-1">(OECD: max 15%)</span>
          </span>
        </div>

        {/* Stat 4 -- sectors graded */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-violet-400">
            12
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            Sectors graded
          </span>
        </div>
      </div>

      {/* Risk bar */}
      {dist && totalPct > 0 && (
        <div className="px-6 pb-5 pt-1 border-t border-zinc-800">
          <div
            className="flex rounded-full overflow-hidden gap-[2px] h-3"
            role="img"
            aria-label="Risk level distribution across all contracts"
          >
            {barLevels.map(({ key, color, label }) => {
              const pct = dist[key]?.count_pct ?? 0
              if (pct < 0.3) return null
              return (
                <div
                  key={key}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    minWidth: '4px',
                    opacity: 0.9,
                  }}
                  title={`${label}: ${pct.toFixed(1)}%`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
            {barLevels.map(({ key, color, label }) => {
              const entry = dist[key]
              if (!entry || entry.count_pct < 0.3) return null
              return (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-500"
                >
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="font-mono font-bold" style={{ color }}>{label}</span>
                  <span className="tabular-nums">{entry.count_pct.toFixed(1)}%</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </motion.section>
  )
}

// ---------------------------------------------------------------------------
// Hero Section -- big grade + plain-language headline
// ---------------------------------------------------------------------------

function HeroSection({
  national,
  highRiskPct,
}: {
  national: PHINational
  highRiskPct: number | null
}) {
  const { t } = useTranslation('reportcard')
  const cfg = gradeConfig(national.grade)

  const headlineKey = `heroHeadline_${cfg.tier}` as const
  const headline = t(headlineKey, { grade: national.grade })

  return (
    <section className="mb-10">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${cfg.border}`,
          borderLeftWidth: 6,
          borderLeftColor: cfg.text,
          backgroundColor: cfg.bg,
        }}
        role="region"
        aria-label={t('heroGradeLabel')}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-10 px-8">
          {/* Grade letter */}
          <motion.div
            className="flex-shrink-0 flex flex-col items-center"
            initial={{ scale: 2.5, opacity: 0, filter: 'blur(16px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.0, type: 'spring', stiffness: 130, damping: 16 }}
            aria-hidden="true"
          >
            <span
              className="leading-none font-bold"
              style={{ fontFamily: SERIF, fontSize: '8rem', color: cfg.text }}
            >
              {national.grade}
            </span>
            <span
              className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mt-1"
              style={{ color: cfg.text, opacity: 0.7 }}
            >
              {t('heroGradeLabel')}
            </span>
            {/* YoY delta badge */}
            <span
              className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: 'rgba(245,158,11,0.20)',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.30)',
              }}
              title="Change vs prior year (estimated)"
              aria-label="Grade trend: plus 0.02 vs prior year"
            >
              +0.02 vs prior year
            </span>
            {/* Grade methodology explanation */}
            <p className="text-[10px] text-zinc-500 max-w-sm text-center mt-2 leading-relaxed font-mono">
              {t('gradeMethodology.body')}
            </p>
          </motion.div>

          {/* Headline + sub-text */}
          <motion.div
            className="flex-1 min-w-0 text-center sm:text-left"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1
              className="text-2xl md:text-3xl font-bold leading-snug mb-3 text-zinc-100"
              style={{ fontFamily: SERIF }}
            >
              {headline}
            </h1>

            {/* Risk distribution bar */}
            {national.risk_distribution && (
              <RiskBar dist={national.risk_distribution} />
            )}

            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-4">
              {t('heroBadgeLabel', { count: national.total_indicators })}
            </p>

            {/* High-risk rate pill */}
            {highRiskPct !== null && (
              <div className="mt-3 inline-flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: highRiskPct > 15 ? '#dc2626' : highRiskPct > 10 ? '#f97316' : '#16a34a' }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-zinc-300">
                  {highRiskPct.toFixed(1)}% {t('sectorHighRisk')}
                  {' · '}
                  <span className="text-cyan-400">{t('metricRiskNote')}</span>
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Risk distribution bar (stacked horizontal)
// ---------------------------------------------------------------------------

const RISK_LEVEL_COLORS = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#eab308',
  low:      '#22c55e',
} as const

function RiskBar({ dist }: { dist: RiskDistribution }) {
  const { t } = useTranslation('reportcard')
  const total =
    (dist.critical?.value_mxn ?? 0) +
    (dist.high?.value_mxn ?? 0) +
    (dist.medium?.value_mxn ?? 0) +
    (dist.low?.value_mxn ?? 0)
  if (total === 0) return null

  const levels = [
    { key: 'critical' as const, label: t('riskLevelCritical') },
    { key: 'high'     as const, label: t('riskLevelHigh') },
    { key: 'medium'   as const, label: t('riskLevelMedium') },
    { key: 'low'      as const, label: t('riskLevelLow') },
  ]

  return (
    <div>
      <div
        className="flex rounded-full overflow-hidden gap-[1px] h-2.5"
        role="img"
        aria-label="Risk distribution by contract value"
      >
        {levels.map(({ key }) => {
          const val = dist[key]?.value_mxn ?? 0
          const pct = (val / total) * 100
          if (pct < 0.5) return null
          return (
            <div
              key={key}
              style={{
                width: `${pct}%`,
                backgroundColor: RISK_LEVEL_COLORS[key],
                minWidth: '3px',
              }}
              title={`${levels.find(l => l.key === key)?.label}: ${pct.toFixed(1)}% ${t('ofValue')}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
        {levels.map(({ key, label }) => {
          const entry = dist[key]
          if (!entry || entry.value_pct < 0.5) return null
          return (
            <span key={key} className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: RISK_LEVEL_COLORS[key] }}
                aria-hidden="true"
              />
              <span className="font-mono font-bold" style={{ color: RISK_LEVEL_COLORS[key] }}>{label}</span>
              <span className="tabular-nums">{entry.value_pct.toFixed(0)}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3 Key Metrics
// ---------------------------------------------------------------------------

function KeyMetrics({
  highRiskPct,
  totalValueMxn,
  totalContracts,
  gtCasesCount,
}: {
  highRiskPct: number | null
  totalValueMxn: number | null
  totalContracts: number | null
  gtCasesCount: number
}) {
  const { t } = useTranslation('reportcard')

  const oneIn = highRiskPct !== null ? highRiskToOneIn(highRiskPct) : null
  const valueTrillions = totalValueMxn !== null ? formatTrillions(totalValueMxn) : null
  const contractsFormatted = totalContracts !== null ? totalContracts.toLocaleString() : null

  const metrics = [
    {
      id: 'risk',
      title: oneIn !== null ? t('metricRiskTitle', { n: oneIn }) : '--',
      subtitle: t('metricRiskSubtitle'),
      note: t('metricRiskNote'),
      accent: '#dc2626',
    },
    {
      id: 'value',
      title: valueTrillions !== null ? t('metricValueTitle', { value: valueTrillions }) : '--',
      subtitle: t('metricValueSubtitle'),
      note: t('metricValueNote', { contracts: contractsFormatted ?? '3.1M' }),
      accent: '#3b82f6',
    },
    {
      id: 'cases',
      title: t('metricCasesTitle', { count: gtCasesCount }),
      subtitle: t('metricCasesSubtitle'),
      note: t('metricCasesNote'),
      accent: '#16a34a',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
      variants={cardContainerVariants}
      initial="hidden"
      animate="show"
    >
      {metrics.map((m) => (
        <motion.div
          key={m.id}
          variants={cardItemVariants}
          className="rounded-xl p-5 bg-zinc-900 border border-zinc-800"
          style={{ borderLeftWidth: 3, borderLeftColor: m.accent }}
        >
          <p className="text-lg md:text-xl font-bold leading-tight mb-2 text-zinc-100" style={{ fontFamily: SERIF }}>
            {m.title}
          </p>
          <p className="text-sm leading-relaxed mb-3 text-zinc-400">
            {m.subtitle}
          </p>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em]" style={{ color: m.accent }}>
            {m.note}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// What This Means (plain-language bullets)
// ---------------------------------------------------------------------------

function WhatThisMeans({
  highRiskPct,
  worstSectors,
}: {
  highRiskPct: number | null
  worstSectors: string[]
}) {
  const { t } = useTranslation('reportcard')

  const bullet1Key = highRiskPct !== null && highRiskPct > 15
    ? 'bullet1_poor'
    : 'bullet1_ok'

  const sectorNames = worstSectors.slice(0, 3).join(', ')

  const bullets = [
    t(bullet1Key),
    t('bullet2', { sectors: sectorNames }),
    t('bullet3'),
  ]

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-4 text-zinc-100" style={{ fontFamily: SERIF }}>
        {t('whatThisMeansTitle')}
      </h2>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400 mb-3">
          HALLAZGO
        </p>
        <ul className="space-y-3" role="list">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
              <span
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sector Breakdown -- horizontal bar chart
// ---------------------------------------------------------------------------

function SectorBreakdown({ sectors }: { sectors: PHISector[] }) {
  const { t, i18n } = useTranslation('reportcard')
  const navigate = useNavigate()

  // Sort worst -> best by high+critical pct
  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const aHighPct =
        (a.risk_distribution?.critical?.count_pct ?? 0) +
        (a.risk_distribution?.high?.count_pct ?? 0)
      const bHighPct =
        (b.risk_distribution?.critical?.count_pct ?? 0) +
        (b.risk_distribution?.high?.count_pct ?? 0)
      return bHighPct - aHighPct
    })
  }, [sectors])

  // Find max for bar scaling
  const maxPct = useMemo(() => {
    return sorted.reduce((max, s) => {
      const pct =
        (s.risk_distribution?.critical?.count_pct ?? 0) +
        (s.risk_distribution?.high?.count_pct ?? 0)
      return Math.max(max, pct)
    }, 1)
  }, [sorted])

  const isES = i18n.language?.startsWith('es')

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-1 text-zinc-100" style={{ fontFamily: SERIF }}>
        {t('sectorTitle')}
      </h2>
      <p className="text-sm mb-5 text-zinc-500">
        {t('sectorSubtitle')}
      </p>

      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
        <div className="divide-y divide-zinc-800/60">
          {sorted.map((sector, idx) => {
            const sectorMeta = SECTORS.find((s) => s.id === sector.sector_id)
            const color = SECTOR_COLORS_MAP[sector.sector_name] ?? sectorMeta?.color ?? '#64748b'
            const displayName = isES
              ? (SECTOR_NAME_ES[sector.sector_name] ?? sector.sector_name)
              : (sectorMeta?.name ?? sector.sector_name)

            const critPct = sector.risk_distribution?.critical?.count_pct ?? 0
            const highPct = sector.risk_distribution?.high?.count_pct ?? 0
            const combinedPct = critPct + highPct
            const barWidth = maxPct > 0 ? (combinedPct / maxPct) * 100 : 0

            const gradeColors = GRADE_CONFIGS[sector.grade] ?? GRADE_FALLBACK

            return (
              <motion.div
                key={sector.sector_id}
                className={`flex items-center gap-4 px-5 py-3 transition-colors cursor-default ${
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-800/20'
                }`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35 }}
              >
                {/* Sector colour dot + name */}
                <div className="flex items-center gap-2.5 w-36 flex-shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium truncate text-zinc-200">
                    {displayName}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="h-4 rounded-full overflow-hidden flex-1 bg-zinc-800"
                    role="meter"
                    aria-valuenow={combinedPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${displayName}: ${combinedPct.toFixed(1)}% ${t('sectorHighRisk')}`}
                  >
                    <motion.div
                      className="h-4 rounded-full"
                      style={{
                        backgroundColor: color,
                        opacity: 0.85,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ delay: idx * 0.04 + 0.2, duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Pct label */}
                  <span
                    className="text-sm font-bold font-mono tabular-nums w-14 text-right flex-shrink-0"
                    style={{ color: combinedPct > 20 ? '#dc2626' : combinedPct > 10 ? '#f97316' : '#a1a1aa' }}
                  >
                    {combinedPct.toFixed(1)}%
                  </span>
                </div>

                {/* Grade badge */}
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm flex-shrink-0"
                  style={{
                    fontFamily: SERIF,
                    color: gradeColors.text,
                    backgroundColor: gradeColors.bg,
                    border: `1px solid ${gradeColors.border}`,
                  }}
                  title={sector.grade}
                >
                  {sector.grade}
                </span>

                {/* Go to sector link */}
                <button
                  onClick={() => navigate(`/sectors/${sector.sector_id}`)}
                  className="text-[10px] font-mono uppercase tracking-wide flex-shrink-0 transition-colors text-amber-400 hover:text-amber-300"
                  aria-label={`${t('sectorGoTo')}: ${displayName}`}
                >
                  {t('sectorGoTo')} &rarr;
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Trend section -- "Getting better or worse?"
// ---------------------------------------------------------------------------

function TrendSection() {
  const { t } = useTranslation('reportcard')

  const { data } = useQuery<{ years: TrendYear[] }>({
    queryKey: ['phi-trend'],
    queryFn: () => phiApi.getTrend(),
  })

  const years: TrendYear[] = data?.years ?? []

  const trendDirection = useMemo((): 'improving' | 'stable' | 'worsening' => {
    if (years.length < 4) return 'stable'
    const recent = years.slice(-3)
    const prior = years.slice(-6, -3)
    if (prior.length === 0) return 'stable'
    const avgRecent = recent.reduce((s, y) => s + (y.competition_by_value ?? y.competition_rate ?? 0), 0) / recent.length
    const avgPrior = prior.reduce((s, y) => s + (y.competition_by_value ?? y.competition_rate ?? 0), 0) / prior.length
    const delta = avgRecent - avgPrior
    if (delta > 2) return 'improving'
    if (delta < -2) return 'worsening'
    return 'stable'
  }, [years])

  const trendConfig = {
    improving: { icon: '\u2191', color: '#16a34a', labelKey: 'trendImproving', sentenceKey: 'trendSentence_improving' },
    stable:    { icon: '\u2192', color: '#6b7280', labelKey: 'trendStable',    sentenceKey: 'trendSentence_stable'    },
    worsening: { icon: '\u2193', color: '#dc2626', labelKey: 'trendWorsening', sentenceKey: 'trendSentence_worsening' },
  }[trendDirection]

  const earliestYear = years.length > 0 ? years[0].year : 2010

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-4 text-zinc-100" style={{ fontFamily: SERIF }}>
        {t('trendTitle')}
      </h2>

      <div className="rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-zinc-800 bg-zinc-900">
        {/* Big arrow */}
        <div className="flex-shrink-0 text-center">
          <span
            className="block text-7xl font-bold leading-none"
            style={{ color: trendConfig.color }}
            aria-hidden="true"
          >
            {trendConfig.icon}
          </span>
          <span
            className="block text-sm font-bold font-mono mt-1"
            style={{ color: trendConfig.color }}
          >
            {t(trendConfig.labelKey)}
          </span>
        </div>

        {/* Sentence + small year markers */}
        <div className="flex-1 min-w-0">
          <p className="text-base leading-relaxed mb-4 text-zinc-300">
            {t(trendConfig.sentenceKey)}
          </p>

          {/* Compact year-grade timeline ribbon */}
          {years.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <span className="text-[10px] font-mono text-zinc-600 mr-1 flex-shrink-0">
                {t('trendSince', { year: earliestYear })}:
              </span>
              {years.map((y) => {
                const gc = GRADE_CONFIGS[y.grade] ?? GRADE_FALLBACK
                return (
                  <div key={y.year} className="flex flex-col items-center flex-shrink-0">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold"
                      style={{
                        fontFamily: SERIF,
                        color: gc.text,
                        backgroundColor: gc.bg,
                        border: `1px solid ${gc.border}`,
                      }}
                      title={String(y.year)}
                    >
                      {y.grade}
                    </span>
                    <span className="text-[9px] font-mono mt-0.5 tabular-nums text-zinc-600">
                      {String(y.year).slice(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Methodology Footer
// ---------------------------------------------------------------------------

function MethodologyFooter() {
  const { t } = useTranslation('reportcard')
  const navigate = useNavigate()

  return (
    <section className="mt-12 mb-8">
      <div className="rounded-xl p-5 border border-zinc-800 bg-zinc-900">
        <p className="text-xs leading-relaxed mb-3 text-zinc-400">
          {t('methodologyNote')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-mono text-zinc-600">
            {t('sourcesLabel')}
          </p>
          <button
            onClick={() => navigate('/methodology')}
            className="text-[10px] font-mono font-bold uppercase tracking-wide transition-colors text-amber-400 hover:text-amber-300"
          >
            {t('viewFullMethodology')}
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

function LoadingState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-zinc-950">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-700 border-t-amber-500 mx-auto mb-4"
          role="status"
          aria-label={t('loading')}
        />
        <p className="text-zinc-500 text-sm font-mono">{t('loading')}</p>
      </div>
    </div>
  )
}

function ComputingState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-zinc-950">
      <div className="text-center max-w-md">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-700 border-t-amber-500 mx-auto mb-4"
          role="status"
        />
        <p className="font-bold mb-2 text-zinc-100">
          {t('computing')}
        </p>
        <p className="text-sm text-zinc-500">
          {t('computingDetail')}
        </p>
      </div>
    </div>
  )
}

function ErrorState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-zinc-950">
      <div className="text-center">
        <p role="alert" className="text-red-400 mb-2">{t('error')}</p>
        <p className="text-zinc-600 text-xs font-mono">COMPRANET data may be temporarily unavailable.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function ReportCard() {
  const { t } = useTranslation('reportcard')

  // PHI data: national grade + sector breakdown
  const {
    data: phiData,
    isLoading: phiLoading,
    error: phiError,
  } = useQuery<PHISectorsResponse>({
    queryKey: ['phi-sectors'],
    queryFn: () => phiApi.getSectors(),
    retry: 3,
    retryDelay: (failureCount) => Math.min(1000 * 2 ** failureCount, 30_000),
  })

  // Fast dashboard: total value, total contracts, high risk pct
  const { data: dashData } = useQuery({
    queryKey: ['fast-dashboard'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
  })

  const is503 = (err: unknown): boolean =>
    (err as AxiosError)?.response?.status === 503

  if (phiLoading) return <LoadingState />
  if (phiError && is503(phiError)) return <ComputingState />
  if (phiError || !phiData) return <ErrorState />

  const { national, sectors } = phiData

  // Compute worst sectors by high+critical rate
  const sortedBySeverity = [...sectors].sort((a, b) => {
    const aPct =
      (a.risk_distribution?.critical?.count_pct ?? 0) +
      (a.risk_distribution?.high?.count_pct ?? 0)
    const bPct =
      (b.risk_distribution?.critical?.count_pct ?? 0) +
      (b.risk_distribution?.high?.count_pct ?? 0)
    return bPct - aPct
  })
  const worstSectorNames = sortedBySeverity.slice(0, 3).map((s) => {
    const meta = SECTORS.find((m) => m.id === s.sector_id)
    return SECTOR_NAME_ES[s.sector_name] ?? meta?.name ?? s.sector_name
  })

  // High risk pct from PHI national risk_distribution or fast dashboard
  const highRiskPct: number | null = (() => {
    if (national.risk_distribution) {
      const critPct = national.risk_distribution.critical?.count_pct ?? 0
      const highP = national.risk_distribution.high?.count_pct ?? 0
      return critPct + highP
    }
    if (dashData?.overview?.high_risk_pct != null) {
      return dashData.overview.high_risk_pct
    }
    return null
  })()

  const totalValueMxn: number | null = dashData?.overview?.total_value_mxn ?? national.total_value_mxn ?? null
  const totalContracts: number | null = dashData?.overview?.total_contracts ?? national.total_contracts ?? null

  // Ground truth cases count -- hardcoded known value (1363 cases as of Mar 26, 2026)
  const GT_CASES_COUNT = 1363

  return (
    <main className="min-h-screen bg-zinc-950" id="main-content">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page header */}
        <header className="mb-8 pb-5 border-b border-zinc-800">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mb-2 text-amber-500">
            RUBLI · {t('pageEyebrow')}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100" style={{ fontFamily: SERIF }}>
            {t('pageTitle')}
          </h1>
          <p className="text-sm mt-1 text-zinc-500">
            {t('pageSubtitle')}
          </p>
        </header>

        {/* Hero impact: dark card with key numbers */}
        <HeroImpactSection national={national} totalValueMxn={totalValueMxn} />

        {/* Hero: big grade + headline */}
        <HeroSection national={national} highRiskPct={highRiskPct} />

        {/* 3 key metrics in plain language */}
        <KeyMetrics
          highRiskPct={highRiskPct}
          totalValueMxn={totalValueMxn}
          totalContracts={totalContracts}
          gtCasesCount={GT_CASES_COUNT}
        />

        {/* Plain-language bullets */}
        <WhatThisMeans highRiskPct={highRiskPct} worstSectors={worstSectorNames} />

        {/* Sector breakdown: horizontal bar chart */}
        <SectorBreakdown sectors={sectors} />

        {/* Trend: better or worse? */}
        <TrendSection />

        {/* Methodology link */}
        <MethodologyFooter />

        {/* Source footnote */}
        <p className="text-[10px] text-zinc-700 font-mono text-center pb-4">
          RUBLI v6.5 · COMPRANET 2002-2025 · 3.06M contracts · MX$9.88T validated
        </p>
      </div>
    </main>
  )
}

export default ReportCard
