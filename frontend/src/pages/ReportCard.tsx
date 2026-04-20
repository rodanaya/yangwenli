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
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'

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
// Mexican traffic-light system (semaforo) -- replaces US letter grades
// Colors: neutral zinc tones for "good" grades (a corruption platform should
// not use green to imply confidence), amber/red for problematic ones.
// ---------------------------------------------------------------------------

interface MexicanGrade {
  label: string
  labelEN: string
  color: string
  bg: string
  border: string
  semaforo: 'verde' | 'amarillo' | 'rojo'
  tier: 'good' | 'ok' | 'poor' | 'bad'
}

function gradeToMexican(grade: string, _score?: number): MexicanGrade {
  switch (grade) {
    case 'S':
    case 'A':
      // Excelente -- neutral light zinc (no green, avoid false confidence)
      return { label: 'Excelente', labelEN: 'Excellent', color: '#d4d4d8', bg: 'rgba(212,212,216,0.06)', border: 'rgba(212,212,216,0.20)', semaforo: 'verde', tier: 'good' }
    case 'B+':
    case 'B':
      // Satisfactorio -- mid zinc
      return { label: 'Satisfactorio', labelEN: 'Satisfactory', color: '#a1a1aa', bg: 'rgba(161,161,170,0.06)', border: 'rgba(161,161,170,0.20)', semaforo: 'verde', tier: 'ok' }
    case 'C+':
    case 'C':
      // Regular -- amber
      return { label: 'Regular', labelEN: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', semaforo: 'amarillo', tier: 'poor' }
    case 'D':
    case 'D-':
      // Deficiente -- darker amber
      return { label: 'Deficiente', labelEN: 'Deficient', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)', semaforo: 'rojo', tier: 'bad' }
    default:
      // Critico -- red
      return { label: 'Critico', labelEN: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', semaforo: 'rojo', tier: 'bad' }
  }
}

/** Semaforo (traffic light) indicator -- 3 stacked CSS circles
 *  Note: keeps semaforo green for the visual metaphor (verde light is conventional),
 *  but grade text colors elsewhere use neutral zinc to avoid false confidence. */
function SemaforoIndicator({ active }: { active: 'verde' | 'amarillo' | 'rojo' }) {
  const lights: Array<{ key: 'verde' | 'amarillo' | 'rojo'; color: string }> = [
    { key: 'verde', color: '#a1a1aa' },
    { key: 'amarillo', color: '#f59e0b' },
    { key: 'rojo', color: '#ef4444' },
  ]
  return (
    <div
      className="flex flex-col gap-1 items-center bg-zinc-800/60 rounded-full px-1.5 py-2"
      role="img"
      aria-label={`Semaforo: ${active}`}
    >
      {lights.map(({ key, color }) => (
        <span
          key={key}
          className="block rounded-full"
          style={{
            width: 12,
            height: 12,
            backgroundColor: key === active ? color : 'rgba(255,255,255,0.06)',
            boxShadow: key === active ? `0 0 8px ${color}60` : 'none',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
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
    { key: 'critical', color: '#ef4444', label: 'Critical' },
    { key: 'high',     color: '#f59e0b', label: 'High'     },
    { key: 'medium',   color: '#a16207', label: 'Medium'   },
    { key: 'low',      color: '#71717a', label: 'Low'      },
  ]

  return (
    <motion.section
      className="mb-8 surface-card overflow-hidden"
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
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-red-500">
            {criticalCountLabel}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            Critical risk contracts
          </span>
        </div>

        {/* Stat 3 -- high-risk rate */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-amber-500">
            {highRiskRate}%
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            High-risk rate
            <span className="text-cyan-400 ml-1">(OECD: max 15%)</span>
          </span>
        </div>

        {/* Stat 4 -- sectors graded */}
        <div className="px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl md:text-3xl font-bold font-mono leading-none tabular-nums text-zinc-100">
            12
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-1">
            Sectors graded
          </span>
        </div>
      </div>

      {/* Risk dot-matrix distribution */}
      {dist && totalPct > 0 && (
        <div className="px-6 pb-5 pt-1 border-t border-zinc-800">
          {(() => {
            const N = 50, DR = 3, DG = 8
            const segs = barLevels
              .map(({ key, color, label }) => ({ pct: dist[key]?.count_pct ?? 0, color, label }))
              .filter((s) => s.pct >= 0.3)
            const cells: { color: string; label: string }[] = []
            segs.forEach((seg) => {
              const segDots = Math.max(1, Math.round((seg.pct / 100) * N))
              for (let k = 0; k < segDots && cells.length < N; k++) {
                cells.push({ color: seg.color, label: seg.label })
              }
            })
            while (cells.length < N && cells.length > 0) {
              cells.push(cells[cells.length - 1])
            }
            return (
              <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none"
                role="img" aria-label="Risk level distribution across all contracts">
                {cells.map((c, k) => (
                  <circle key={k} cx={k * DG + DR} cy={5} r={DR} fill={c.color} fillOpacity={0.9}>
                    <title>{c.label}</title>
                  </circle>
                ))}
              </svg>
            )
          })()}
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
  const { t, i18n } = useTranslation('reportcard')
  const mx = gradeToMexican(national.grade, national.phi_composite_score)
  const isES = i18n.language?.startsWith('es')

  const headlineKey = `heroHeadline_${mx.tier}` as const
  const displayLabel = isES ? mx.label : mx.labelEN
  const headline = t(headlineKey, { grade: displayLabel })

  const score = national.phi_composite_score ?? 0

  return (
    <section className="mb-10">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${mx.border}`,
          borderLeftWidth: 6,
          borderLeftColor: mx.color,
          backgroundColor: mx.bg,
        }}
        role="region"
        aria-label={t('heroGradeLabel')}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-10 px-8">
          {/* Score + semaforo */}
          <motion.div
            className="flex-shrink-0 flex items-center gap-4"
            initial={{ scale: 2.5, opacity: 0, filter: 'blur(16px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.0, type: 'spring', stiffness: 130, damping: 16 }}
          >
            <SemaforoIndicator active={mx.semaforo} />
            <div className="flex flex-col items-center">
              {/* Extra-large numeric score — national index hero */}
              <div className="flex items-baseline gap-1">
                <motion.span
                  className="leading-none font-black font-mono tabular-nums"
                  style={{
                    fontSize: '7.5rem',
                    color: mx.color,
                    textShadow: `0 0 40px ${mx.color}40, 0 0 80px ${mx.color}20`,
                  }}
                  aria-label={`${Math.round(score)} de 100`}
                  animate={{
                    textShadow: [
                      `0 0 40px ${mx.color}40, 0 0 80px ${mx.color}20`,
                      `0 0 60px ${mx.color}60, 0 0 100px ${mx.color}30`,
                      `0 0 40px ${mx.color}40, 0 0 80px ${mx.color}20`,
                    ],
                  }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {Math.round(score)}
                </motion.span>
                <span
                  className="text-3xl font-bold font-mono"
                  style={{ color: mx.color, opacity: 0.5 }}
                >
                  /100
                </span>
              </div>
              {/* Colored label badge */}
              <span
                className="mt-1 text-xs font-mono font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full"
                style={{
                  color: mx.color,
                  backgroundColor: mx.bg,
                  border: `1px solid ${mx.border}`,
                }}
              >
                {displayLabel}
              </span>
              <span
                className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mt-2"
                style={{ color: mx.color, opacity: 0.6 }}
              >
                {t('heroGradeLabel')}
              </span>
              {/* Methodology explanation */}
              <p className="text-[10px] text-zinc-500 max-w-sm text-center mt-2 leading-relaxed font-mono">
                {t('gradeMethodology.body')}
              </p>
            </div>
          </motion.div>

          {/* Headline + sub-text */}
          <motion.div
            className="flex-1 min-w-0 text-center sm:text-left"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-3xl font-serif font-bold leading-snug mb-3 text-zinc-100">
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
                  style={{ backgroundColor: highRiskPct > 15 ? '#ef4444' : highRiskPct > 10 ? '#f59e0b' : '#a1a1aa' }}
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
// OECD Context Panel
// ---------------------------------------------------------------------------

function OECDContextPanel({ national }: { national: PHINational }) {
  const { t } = useTranslation('reportcard')

  // Extract DA rate from national indicators if available
  const daIndicator = national.indicators?.['direct_award_rate']
  const sbIndicator = national.indicators?.['single_bid_rate']

  const daRate = daIndicator?.value ?? (national.competition_by_value != null ? (100 - national.competition_by_value) : null)
  const sbRate = sbIndicator?.value ?? null

  return (
    <section className="mb-10">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-cyan-400 mb-3">
          {t('oecdContextTitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* DA rate */}
          <div className="flex items-start gap-3">
            <span
              className="block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: '#22d3ee' }}
            />
            <div>
              <p className="text-xs text-zinc-400">{t('oecdDALabel')}</p>
              <p className="text-sm text-zinc-200 font-medium">
                {t('oecdDABenchmark')}
              </p>
              {daRate != null && (
                <p className="text-sm font-mono font-bold mt-0.5" style={{ color: daRate > 25 ? '#ef4444' : '#a1a1aa' }}>
                  {t('oecdMexicoDA', { pct: daRate.toFixed(1) })}
                </p>
              )}
            </div>
          </div>
          {/* Single bid rate */}
          <div className="flex items-start gap-3">
            <span
              className="block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: '#22d3ee' }}
            />
            <div>
              <p className="text-xs text-zinc-400">{t('oecdSBLabel')}</p>
              <p className="text-sm text-zinc-200 font-medium">
                {t('oecdSBBenchmark')}
              </p>
              {sbRate != null && (
                <p className="text-sm font-mono font-bold mt-0.5" style={{ color: sbRate > 15 ? '#ef4444' : '#a1a1aa' }}>
                  {t('oecdMexicoSB', { pct: sbRate.toFixed(1) })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Risk distribution bar (stacked horizontal)
// ---------------------------------------------------------------------------

const RISK_LEVEL_COLORS = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#a16207',
  low:      '#71717a',
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
      {(() => {
        const N = 40, DR = 2.5, DG = 6
        const segs = levels
          .map(({ key, label }) => {
            const val = dist[key]?.value_mxn ?? 0
            const pct = (val / total) * 100
            return { pct, color: RISK_LEVEL_COLORS[key], label }
          })
          .filter((s) => s.pct >= 0.5)
        const cells: { color: string; label: string }[] = []
        segs.forEach((seg) => {
          const segDots = Math.max(1, Math.round((seg.pct / 100) * N))
          for (let k = 0; k < segDots && cells.length < N; k++) {
            cells.push({ color: seg.color, label: seg.label })
          }
        })
        while (cells.length < N && cells.length > 0) {
          cells.push(cells[cells.length - 1])
        }
        return (
          <svg viewBox={`0 0 ${N * DG} 8`} className="w-full" style={{ height: 8 }} preserveAspectRatio="none"
            role="img" aria-label="Risk distribution by contract value">
            {cells.map((c, k) => (
              <circle key={k} cx={k * DG + DR} cy={4} r={DR} fill={c.color} fillOpacity={0.9}>
                <title>{c.label}</title>
              </circle>
            ))}
          </svg>
        )
      })()}
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
      accent: '#ef4444',
    },
    {
      id: 'value',
      title: valueTrillions !== null ? t('metricValueTitle', { value: valueTrillions }) : '--',
      subtitle: t('metricValueSubtitle'),
      note: t('metricValueNote', { contracts: contractsFormatted ?? '3.1M' }),
      accent: '#22d3ee',
    },
    {
      id: 'cases',
      title: t('metricCasesTitle', { count: gtCasesCount }),
      subtitle: t('metricCasesSubtitle'),
      note: t('metricCasesNote'),
      accent: '#f59e0b',
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
          className="surface-card p-5"
          style={{ borderLeftWidth: 3, borderLeftColor: m.accent }}
        >
          <p className="text-lg md:text-xl font-bold leading-tight mb-2 text-zinc-100">
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
      <h2 className="text-lg font-serif font-bold mb-4 text-zinc-100">
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
      <h2 className="text-lg font-serif font-bold mb-1 text-zinc-100">
        {t('sectorTitle')}
      </h2>
      <p className="text-sm mb-5 text-zinc-500">
        {t('sectorSubtitle')}
      </p>

      <div className="surface-card overflow-hidden">
        <div className="divide-y divide-zinc-800/60">
          {sorted.map((sector, idx) => {
            const sectorMeta = SECTORS.find((s) => s.id === sector.sector_id)
            const color = SECTOR_COLORS[sector.sector_name] ?? sectorMeta?.color ?? SECTOR_COLORS.otros
            const displayName = isES
              ? (SECTOR_NAME_ES[sector.sector_name] ?? sector.sector_name)
              : (sectorMeta?.name ?? sector.sector_name)

            const critPct = sector.risk_distribution?.critical?.count_pct ?? 0
            const highPct = sector.risk_distribution?.high?.count_pct ?? 0
            const combinedPct = critPct + highPct
            const barWidth = maxPct > 0 ? (combinedPct / maxPct) * 100 : 0

            const sectorMx = gradeToMexican(sector.grade, sector.phi_composite_score)
            const sectorScore = sector.phi_composite_score ?? 0
            const sectorDisplayLabel = isES ? sectorMx.label : sectorMx.labelEN

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
                {/* Traffic light dot + sector colour dot + name */}
                <div className="flex items-center gap-2.5 w-40 flex-shrink-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: sectorMx.color,
                      boxShadow: `0 0 4px ${sectorMx.color}40`,
                    }}
                    aria-hidden="true"
                    title={sectorMx.semaforo}
                  />
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
                    className="flex-1"
                    role="meter"
                    aria-valuenow={combinedPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${displayName}: ${combinedPct.toFixed(1)}% ${t('sectorHighRisk')}`}
                  >
                    {(() => {
                      const N = 30, DR = 3, DG = 8
                      const filled = Math.max(1, Math.round((barWidth / 100) * N))
                      return (
                        <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                          {Array.from({ length: N }).map((_, k) => (
                            <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                              fill={k < filled ? color : '#27272a'}
                              fillOpacity={k < filled ? 0.85 : 1}
                            />
                          ))}
                        </svg>
                      )
                    })()}
                  </div>

                  {/* Pct label */}
                  <span
                    className="text-sm font-bold font-mono tabular-nums w-14 text-right flex-shrink-0"
                    style={{ color: combinedPct > 20 ? '#ef4444' : combinedPct > 10 ? '#f59e0b' : '#a1a1aa' }}
                  >
                    {combinedPct.toFixed(1)}%
                  </span>
                </div>

                {/* Score + label badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm font-bold font-mono tabular-nums w-8 text-right"
                    style={{ color: sectorMx.color }}
                    title={`${Math.round(sectorScore)}/100`}
                  >
                    {Math.round(sectorScore)}
                  </span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                    style={{
                      color: sectorMx.color,
                      backgroundColor: sectorMx.bg,
                      border: `1px solid ${sectorMx.border}`,
                    }}
                    title={sectorDisplayLabel}
                  >
                    {sectorDisplayLabel}
                  </span>
                </div>

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
    improving: { icon: '\u2191', color: '#a1a1aa', labelKey: 'trendImproving', sentenceKey: 'trendSentence_improving' },
    stable:    { icon: '\u2192', color: '#6b7280', labelKey: 'trendStable',    sentenceKey: 'trendSentence_stable'    },
    worsening: { icon: '\u2193', color: '#ef4444', labelKey: 'trendWorsening', sentenceKey: 'trendSentence_worsening' },
  }[trendDirection]

  const earliestYear = years.length > 0 ? years[0].year : 2010

  return (
    <section className="mb-10">
      <h2 className="text-lg font-serif font-bold mb-4 text-zinc-100">
        {t('trendTitle')}
      </h2>

      <div className="surface-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
                const ymx = gradeToMexican(y.grade, y.phi_composite_score)
                const yScore = y.phi_composite_score ?? 0
                return (
                  <div key={y.year} className="flex flex-col items-center flex-shrink-0">
                    <span
                      className="inline-flex items-center justify-center w-7 h-6 rounded-md text-[10px] font-bold font-mono tabular-nums"
                      style={{
                        color: ymx.color,
                        backgroundColor: ymx.bg,
                        border: `1px solid ${ymx.border}`,
                      }}
                      title={`${String(y.year)}: ${Math.round(yScore)}/100`}
                    >
                      {Math.round(yScore)}
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
      <div className="surface-card p-5">
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

  // Ground truth cases count -- institution-scoped windowed cases (v6.5 model)
  const GT_CASES_COUNT = 748

  return (
    <main className="min-h-screen bg-zinc-950" id="main-content">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page header — NATIONAL SYSTEM HEALTH */}
        <header className="mb-8 pb-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-amber-500">
              Salud del Sistema · Índice Nacional de Integridad
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100">
            {t('pageTitle')}
          </h1>
          <p className="text-sm mt-2 text-zinc-400 max-w-2xl leading-relaxed">
            Este índice mide la salud del sistema de compras federales de México — no instituciones individuales.
          </p>
          <p className="text-[11px] mt-1 text-zinc-600 font-mono">
            {t('pageSubtitleV2')}
          </p>
        </header>

        {/* Hero impact: dark card with key numbers */}
        <HeroImpactSection national={national} totalValueMxn={totalValueMxn} />

        {/* Hero: numeric score + semaforo + headline */}
        <HeroSection national={national} highRiskPct={highRiskPct} />

        {/* Clear separator between national score and sector breakdown */}
        <div className="relative my-10" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-950 px-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600">
              Desglose por Sector
            </span>
          </div>
        </div>

        {/* OECD context panel */}
        <OECDContextPanel national={national} />

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
          RUBLI v0.6.5 · COMPRANET 2002-2025 · 3.06M contracts · MX$9.88T validated
        </p>
      </div>
    </main>
  )
}

export default ReportCard
