import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Search, Shield, BookOpen, TrendingUp, AlertTriangle, Cpu, ChevronDown } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { NarrativeCard } from '@/components/NarrativeCard'
import type { NarrativeParagraph } from '@/lib/narratives'
import type { FastDashboardData, RiskDistribution } from '@/api/types'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'

// ---------------------------------------------------------------------------
// useCountUp — animates a number from 0 to `target` over `duration` ms.
// Returns the current animated value. Starts only when `enabled` flips true.
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 1800, enabled = false): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    startRef.current = null

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, enabled])

  return value
}

// ---------------------------------------------------------------------------
// SectorRing — SVG ring of 12 sectors, each arc sized by approximate share.
// Arcs glow with their sector color on hover.
// ---------------------------------------------------------------------------
const SECTOR_ARCS = [
  { name: 'Salud',           nameEn: 'Health',          pct: 18, color: '#dc2626' },
  { name: 'Infraestructura', nameEn: 'Infrastructure',  pct: 16, color: '#ea580c' },
  { name: 'Educación',       nameEn: 'Education',       pct: 14, color: '#3b82f6' },
  { name: 'Gobernación',     nameEn: 'Governance',      pct: 11, color: '#be123c' },
  { name: 'Hacienda',        nameEn: 'Treasury',        pct:  9, color: '#16a34a' },
  { name: 'Tecnología',      nameEn: 'Technology',      pct:  8, color: '#8b5cf6' },
  { name: 'Energía',         nameEn: 'Energy',          pct: 12, color: '#eab308' },
  { name: 'Defensa',         nameEn: 'Defense',         pct:  3, color: '#1e3a5f' },
  { name: 'Agricultura',     nameEn: 'Agriculture',     pct:  4, color: '#22c55e' },
  { name: 'Ambiente',        nameEn: 'Environment',     pct:  2, color: '#10b981' },
  { name: 'Trabajo',         nameEn: 'Labor',           pct:  2, color: '#f97316' },
  { name: 'Otros',           nameEn: 'Other',           pct:  1, color: '#64748b' },
]

// ---------------------------------------------------------------------------
// LangToggle — EN / ES pill toggle, calls i18n.changeLanguage
// ---------------------------------------------------------------------------
function LangToggle() {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  return (
    <div className="flex items-center gap-0.5 bg-white/10 border border-white/20 rounded-full p-0.5 backdrop-blur-sm">
      <button
        onClick={() => i18n.changeLanguage('en')}
        className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white/40"
        style={{
          backgroundColor: isEn ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: isEn ? '#fff' : 'rgba(255,255,255,0.4)',
        }}
        aria-pressed={isEn}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage('es')}
        className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white/40"
        style={{
          backgroundColor: !isEn ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: !isEn ? '#fff' : 'rgba(255,255,255,0.4)',
        }}
        aria-pressed={!isEn}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  )
}

function SectorRing() {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  const [hovered, setHovered] = useState<number | null>(null)

  const cx = 140
  const cy = 140
  const outerR = 120
  const innerR = 76
  const gap = 2 // degrees gap between arcs

  // Build arcs
  const total = SECTOR_ARCS.reduce((s, a) => s + a.pct, 0)
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const arcs: { d: string; color: string; name: string; idx: number }[] = []
  let startDeg = -90 // start at 12-o'clock

  SECTOR_ARCS.forEach((sector, idx) => {
    const spanDeg = (sector.pct / total) * 360 - gap
    const endDeg = startDeg + spanDeg

    const x1 = cx + outerR * Math.cos(toRad(startDeg))
    const y1 = cy + outerR * Math.sin(toRad(startDeg))
    const x2 = cx + outerR * Math.cos(toRad(endDeg))
    const y2 = cy + outerR * Math.sin(toRad(endDeg))

    const x3 = cx + innerR * Math.cos(toRad(endDeg))
    const y3 = cy + innerR * Math.sin(toRad(endDeg))
    const x4 = cx + innerR * Math.cos(toRad(startDeg))
    const y4 = cy + innerR * Math.sin(toRad(startDeg))

    const largeArc = spanDeg > 180 ? 1 : 0

    const d = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ')

    arcs.push({ d, color: sector.color, name: isEn ? sector.nameEn : sector.name, idx })
    startDeg += spanDeg + gap
  })

  const hoveredSector = hovered !== null ? SECTOR_ARCS[hovered] : null

  return (
    <div className="flex flex-col items-center gap-3 select-none" aria-hidden="true">
      <svg
        width="280"
        height="280"
        viewBox="0 0 280 280"
        role="img"
        aria-label="Sector distribution ring"
      >
        <defs>
          {arcs.map((arc) => (
            <filter key={`glow-${arc.idx}`} id={`glow-${arc.idx}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {arcs.map((arc) => {
          const isHov = hovered === arc.idx
          return (
            <path
              key={arc.idx}
              d={arc.d}
              fill={arc.color}
              opacity={hovered === null ? 0.75 : isHov ? 1 : 0.35}
              filter={isHov ? `url(#glow-${arc.idx})` : undefined}
              style={{
                transition: 'opacity 0.2s, filter 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHovered(arc.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}

        {/* Center label */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill={hoveredSector ? hoveredSector.color : '#ffffff'}
          fontSize="13"
          fontWeight="700"
          style={{ transition: 'fill 0.2s' }}
        >
          {hoveredSector ? hoveredSector.name : '12 Sectors'}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="11"
        >
          {hoveredSector ? `${hoveredSector.pct}% of contracts` : 'hover to explore'}
        </text>
      </svg>

      {/* Mini legend — two rows of 6 */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 mt-1">
        {SECTOR_ARCS.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color, opacity: hovered === null || hovered === i ? 1 : 0.3 }}
            />
            <span className="text-[10px] text-white/50 whitespace-nowrap leading-none">
              {isEn ? s.nameEn : s.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HeroStats — four key numbers that count up when scrolled into view.
// Includes the LIVE badge and risk distribution strip.
// ---------------------------------------------------------------------------
interface HeroStatsProps {
  totalContracts: number
  totalValueMxn: number
  highRiskPct: number
  groundTruthCases: number
  riskDistribution?: RiskDistribution[]
}

function HeroStats({ totalContracts, totalValueMxn, highRiskPct, groundTruthCases, riskDistribution }: HeroStatsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const contractCount = useCountUp(totalContracts, 1800, triggered)
  const valueB = Math.round(totalValueMxn / 1_000_000_000_000 * 10) / 10 // trillions
  const valueBAnimated = useCountUp(Math.round(valueB * 10), 2000, triggered) / 10
  const riskPctAnimated = useCountUp(Math.round(highRiskPct * 10), 1600, triggered) / 10
  const casesAnimated = useCountUp(groundTruthCases, 1200, triggered)

  const stats = [
    {
      value: triggered ? `${(contractCount / 1_000_000).toFixed(1)}M` : '0M',
      label: 'Contracts tracked',
      sub: '2002 – 2025',
      color: '#3b82f6',
    },
    {
      value: triggered ? `~${valueBAnimated.toFixed(1)}T` : '0T',
      label: 'MXN in procurement',
      sub: '~9.5 trillion pesos',
      color: '#8b5cf6',
    },
    {
      value: triggered ? `${riskPctAnimated.toFixed(1)}%` : '0%',
      label: 'Contracts high-risk',
      sub: 'OECD-calibrated model',
      color: '#dc2626',
    },
    {
      value: triggered ? String(casesAnimated) : '0',
      label: 'Corruption cases',
      sub: 'Ground-truth training set',
      color: '#16a34a',
    },
  ]

  return (
    <div ref={ref} className="w-full">
      {/* LIVE badge */}
      <div className="flex items-center gap-2 mb-5">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-950/60 border border-emerald-700/40 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE DATA · 2025
        </span>
      </div>

      {/* Stat grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        variants={staggerContainer}
        initial="initial"
        animate={triggered ? 'animate' : 'initial'}
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={staggerItem} className="flex flex-col gap-1">
            <span
              className="text-3xl sm:text-4xl font-black tabular-nums leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
            <span className="text-xs text-white/60 leading-tight font-medium">{s.label}</span>
            <span className="text-[10px] text-white/30 leading-tight">{s.sub}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Risk distribution strip */}
      <RiskStrip riskDistribution={riskDistribution} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// RiskStrip — horizontal proportional bar: critical | high | medium | low
// Accepts live counts from the API; falls back to known static values.
// ---------------------------------------------------------------------------
const RISK_BANDS_FALLBACK = [
  { label: 'Critical', pct: 6.5,  color: '#dc2626', contracts: '201,745' },
  { label: 'High',     pct: 4.1,  color: '#f97316', contracts: '126,553' },
  { label: 'Medium',   pct: 43.9, color: '#eab308', contracts: '~1.36M' },
  { label: 'Low',      pct: 45.6, color: '#16a34a', contracts: '~1.42M' },
]

interface RiskBand {
  label: string
  pct: number
  color: string
  contracts: string
}

interface RiskStripProps {
  riskDistribution?: RiskDistribution[]
}

function RiskStrip({ riskDistribution }: RiskStripProps) {
  const [hov, setHov] = useState<number | null>(null)

  // Build bands from live API data when available
  const bands: RiskBand[] = (() => {
    if (!riskDistribution || riskDistribution.length === 0) {
      return RISK_BANDS_FALLBACK
    }
    const total = riskDistribution.reduce((s, r) => s + r.count, 0)
    const colorMap: Record<string, string> = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#16a34a',
    }
    const order = ['critical', 'high', 'medium', 'low']
    return order.map((level) => {
      const row = riskDistribution.find((r) => r.risk_level === level)
      const count = row?.count ?? 0
      const pct = total > 0 ? (count / total) * 100 : 0
      const label = level.charAt(0).toUpperCase() + level.slice(1)
      const contracts =
        count >= 1_000_000
          ? `~${(count / 1_000_000).toFixed(1)}M`
          : count.toLocaleString()
      return { label, pct, color: colorMap[level] ?? '#64748b', contracts }
    })
  })()

  return (
    <div className="w-full" aria-label="Risk level distribution">
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-2">
        {bands.map((band, i) => (
          <div
            key={band.label}
            style={{
              width: `${band.pct}%`,
              backgroundColor: band.color,
              opacity: hov === null || hov === i ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex gap-4 flex-wrap">
        {bands.map((band, i) => (
          <div
            key={band.label}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: band.color }}
            />
            <span
              className="text-[11px] leading-none"
              style={{ color: hov === i ? band.color : 'rgba(255,255,255,0.45)' }}
            >
              {band.label} {band.pct.toFixed(1)}%
              {hov === i && (
                <span className="ml-1 text-white/30">· {band.contracts} contracts</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScrollReveal — wraps children; fades+slides in when it enters the viewport.
// ---------------------------------------------------------------------------
function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HeroSection — full-viewport above-fold entry point
// ---------------------------------------------------------------------------
interface HeroSectionProps {
  onEnter: () => void
  onScrollDown: () => void
}

function HeroSection({ onEnter, onScrollDown }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false)
  const { t } = useTranslation('landing')
  const heroFindings = useHeroFindings()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center relative px-6 sm:px-12 text-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #080c14 0%, #0f172a 60%, #080c14 100%)' }}
      aria-label="RUBLI platform introduction"
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.07) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="max-w-4xl mx-auto flex flex-col items-center gap-6 z-10"
        variants={staggerContainer}
        initial="initial"
        animate={mounted ? 'animate' : 'initial'}
      >
        {/* Platform badge */}
        <motion.span
          variants={slideUp}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-white/5 border border-white/10 text-white/50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('hero.badge')}
        </motion.span>

        {/* Main headline */}
        <motion.h1
          variants={slideUp}
          className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] text-white"
        >
          23 years.{' '}
          <span style={{ color: '#3b82f6' }}>{t('hero.headline_part2')}</span>{' '}
          contracts.{' '}
          <span style={{ color: '#dc2626' }}>{t('hero.headline_part4')}</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={slideUp}
          className="text-lg sm:text-xl text-white/55 max-w-2xl leading-relaxed"
        >
          {t('hero.subheading')}
        </motion.p>

        {/* What we found strip */}
        <motion.div variants={slideUp} className="w-full max-w-2xl mt-2">
          <NarrativeCard
            paragraphs={heroFindings}
            className="bg-white/[0.03] border-white/10 text-left"
          />
        </motion.div>

        {/* CTA row */}
        <motion.div variants={slideUp} className="flex flex-wrap gap-3 justify-center mt-2">
          <button
            onClick={onEnter}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
            style={{ backgroundColor: '#3b82f6', color: '#fff' }}
          >
            {t('hero.cta_enter')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={onScrollDown}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {t('hero.cta_scroll')} <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <button
        onClick={onScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 hover:text-white/40 transition-colors focus:outline-none"
        aria-label="Scroll to chapters"
      >
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
      </button>
    </section>
  )
}

// Findings displayed in the hero NarrativeCard — built at render time so they react to language changes
function useHeroFindings(): NarrativeParagraph[] {
  const { t } = useTranslation('landing')
  return [
    { text: t('hero_findings.f1'), severity: 'critical' },
    { text: t('hero_findings.f2'), severity: 'warning' },
    { text: t('hero_findings.f3'), severity: 'info' },
  ]
}

// ---------------------------------------------------------------------------
// HowItWorks section — plain language methodology explainer
// ---------------------------------------------------------------------------
function HowItWorks() {
  const { t } = useTranslation('landing')
  const howItWorksCaveats = useHowItWorksCaveats()
  const steps = [
    { num: '01', title: t('how_it_works.step1_title'), body: t('how_it_works.step1_body'), color: '#3b82f6' },
    { num: '02', title: t('how_it_works.step2_title'), body: t('how_it_works.step2_body'), color: '#8b5cf6' },
    { num: '03', title: t('how_it_works.step3_title'), body: t('how_it_works.step3_body'), color: '#eab308' },
    { num: '04', title: t('how_it_works.step4_title'), body: t('how_it_works.step4_body'), color: '#16a34a' },
  ]

  return (
    <section
      className="min-h-screen flex items-center px-6 sm:px-12 lg:px-24 py-20"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #080c14 100%)' }}
      aria-label="How RUBLI works"
    >
      <div className="max-w-6xl mx-auto w-full">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold tracking-widest uppercase text-purple-400 mb-3 block">
              {t('how_it_works.section_label')}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
              {t('how_it_works.title')}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base">
              {t('how_it_works.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 80}>
              <div
                className="rounded-2xl p-6 h-full"
                style={{
                  backgroundColor: `${step.color}08`,
                  border: `1px solid ${step.color}20`,
                }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="text-3xl font-black tabular-nums leading-none flex-shrink-0"
                    style={{ color: step.color, opacity: 0.5 }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Limitation callout */}
        <ScrollReveal delay={300}>
          <div className="mt-8">
            <NarrativeCard
              paragraphs={howItWorksCaveats}
              className="bg-white/[0.03] border-white/10"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function useHowItWorksCaveats(): NarrativeParagraph[] {
  const { t } = useTranslation('landing')
  return [
    { text: t('how_it_works.caveat1'), severity: 'warning' },
    { text: t('how_it_works.caveat2'), severity: 'info' },
  ]
}

// ---------------------------------------------------------------------------
// FeaturedCasesStrip — 3 hardcoded biggest cases linking to /cases/:slug
// ---------------------------------------------------------------------------
const FEATURED_CASES = [
  {
    name: 'IMSS Ghost Company Network',
    contracts: 9366,
    sector: 'Health',
    sectorColor: '#dc2626',
    fraudType: 'ghost_company',
    slug: 'imss-ghost-company-network',
    badgeClass: 'border-red-500/60 text-red-400 bg-red-500/10',
    badgeLabel: 'Ghost Company',
  },
  {
    name: 'Segalmex Food Distribution',
    contracts: 6326,
    sector: 'Agriculture',
    sectorColor: '#22c55e',
    fraudType: 'procurement_fraud',
    slug: 'segalmex-food-distribution',
    badgeClass: 'border-yellow-500/60 text-yellow-400 bg-yellow-500/10',
    badgeLabel: 'Procurement Fraud',
  },
  {
    name: 'COVID-19 Emergency Procurement',
    contracts: 5371,
    sector: 'Health',
    sectorColor: '#dc2626',
    fraudType: 'embezzlement',
    slug: 'covid-19-emergency-procurement',
    badgeClass: 'border-rose-500/60 text-rose-400 bg-rose-500/10',
    badgeLabel: 'Embezzlement',
  },
]

function FeaturedCasesStrip({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation('landing')
  return (
    <div className="w-full mb-5">
      <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
        {t('featured_cases.label')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FEATURED_CASES.map((cas) => (
          <button
            key={cas.slug}
            onClick={() => onNavigate(`/cases/${cas.slug}`)}
            className="group flex flex-col gap-2.5 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            {/* Top row: fraud type badge + sector dot */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold leading-none ${cas.badgeClass}`}
              >
                {cas.badgeLabel}
              </span>
              <span
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: cas.sectorColor }}
                aria-hidden="true"
              />
            </div>

            {/* Case name */}
            <span className="text-sm font-bold text-white/85 group-hover:text-white transition-colors leading-snug">
              {cas.name}
            </span>

            {/* Bottom row: contract count + arrow */}
            <div className="flex items-center justify-between mt-auto pt-1">
              <span className="text-[11px] text-white/35 tabular-nums">
                {t('featured_cases.contracts', { num: cas.contracts.toLocaleString() })}
              </span>
              <ArrowRight
                className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all duration-200"
                aria-hidden="true"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// Main page
// ===========================================================================
export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')
  const [activeChapter, setActiveChapter] = useState(0)
  const [visible, setVisible] = useState<Record<number, boolean>>({})
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const chaptersStartRef = useRef<HTMLDivElement | null>(null)

  // Check returning user — redirect immediately if already visited
  useEffect(() => {
    if (localStorage.getItem('rubli_seen_landing')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  // Fetch pre-computed dashboard stats for live numbers
  const { data: fastDashboard, isError: dashboardError } = useQuery<FastDashboardData>({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-yellow-400" aria-hidden="true" />
        <p className="text-lg font-semibold">Could not load platform data</p>
        <p className="text-sm text-white/50">The backend may be starting up. Please wait a moment.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
        >
          Reload page
        </button>
      </div>
    )
  }

  // IntersectionObserver for scroll-reveal of chapters
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    sectionRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [i]: true }))
            setActiveChapter(i)
          }
        },
        { threshold: 0.25 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const goToApp = useCallback((path: string = '/dashboard') => {
    localStorage.setItem('rubli_seen_landing', '1')
    navigate(path)
  }, [navigate])

  const scrollToChapters = useCallback(() => {
    chaptersStartRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Derive live stats from API; fall back to known values from CLAUDE.md
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_110_007
  const totalValueMxn = overview?.total_value_mxn ?? 9_560_000_000_000

  // risk_distribution is RiskDistribution[] — find critical and high percentages
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 6.1
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 2.9

  const CHAPTERS = [
    {
      tag: t('chapters.scale.tag'),
      heading: t('chapters.scale.heading', { value: formatCompactMXN(totalValueMxn) }),
      body: t('chapters.scale.body', { total: (totalContracts / 1_000_000).toFixed(1) }),
      icon: BarChart3,
      color: '#3b82f6',
      stat: formatCompactMXN(totalValueMxn),
      statLabel: t('chapters.scale.stat_label'),
      visualType: 'heroStats' as const,
    },
    {
      tag: t('chapters.patterns.tag'),
      heading: t('chapters.patterns.heading'),
      body: t('chapters.patterns.body'),
      icon: TrendingUp,
      color: '#eab308',
      stat: '78%',
      statLabel: t('chapters.patterns.stat_label'),
      visualType: 'patternNarrative' as const,
    },
    {
      tag: t('chapters.risk.tag'),
      heading: t('chapters.risk.heading', { pct: (criticalPct + highPct).toFixed(1) }),
      body: t('chapters.risk.body', { critical: criticalPct.toFixed(1), high: highPct.toFixed(1) }),
      icon: AlertTriangle,
      color: '#dc2626',
      stat: `${(criticalPct + highPct).toFixed(1)}%`,
      statLabel: t('chapters.risk.stat_label'),
      visualType: 'riskNarrative' as const,
    },
    {
      tag: t('chapters.cases.tag'),
      heading: t('chapters.cases.heading'),
      body: t('chapters.cases.body'),
      icon: BookOpen,
      color: '#8b5cf6',
      stat: '43',
      statLabel: t('chapters.cases.stat_label'),
      visualType: 'sectorRing' as const,
    },
    {
      tag: t('chapters.yourturn.tag'),
      heading: t('chapters.yourturn.heading'),
      body: t('chapters.yourturn.body'),
      icon: Search,
      color: '#16a34a',
      stat: '3.1M',
      statLabel: t('chapters.yourturn.stat_label'),
      visualType: 'default' as const,
    },
  ]

  // Narrative content for chapters that use NarrativeCard
  const patternNarrativeParagraphs: NarrativeParagraph[] = [
    { text: t('chapters.patterns.n1'), severity: 'warning' },
    { text: t('chapters.patterns.n2'), severity: 'warning' },
    { text: t('chapters.patterns.n3'), severity: 'critical' },
  ]

  const riskNarrativeParagraphs: NarrativeParagraph[] = [
    { text: t('chapters.risk.n1', { pct: criticalPct.toFixed(1) }), severity: 'critical' },
    { text: t('chapters.risk.n2', { pct: highPct.toFixed(1) }), severity: 'warning' },
    { text: t('chapters.risk.n3'), severity: 'info' },
  ]

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Fixed top-right controls: lang toggle + chapter dots + skip link */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <LangToggle />
        {/* Chapter progress dots — desktop only */}
        <div className="hidden sm:flex flex-col gap-1.5" aria-label="Chapter navigation">
          {CHAPTERS.map((chapter, i) => (
            <button
              key={chapter.tag}
              onClick={() => sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' })}
              className="h-1.5 w-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-white/60"
              style={{
                backgroundColor: activeChapter === i ? '#fff' : 'rgba(255,255,255,0.25)',
                transform: activeChapter === i ? 'scale(1.5)' : 'scale(1)',
              }}
              aria-label={`Go to chapter ${i + 1}: ${chapter.tag}`}
            />
          ))}
        </div>

        <button
          onClick={() => goToApp()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {t('skip_to_app')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Hero — above-fold entry point */}
      <HeroSection onEnter={() => goToApp()} onScrollDown={scrollToChapters} />

      {/* Scroll anchor for chapters */}
      <div ref={chaptersStartRef} />

      {/* Scroll chapters */}
      {CHAPTERS.map((chapter, i) => {
        const Icon = chapter.icon
        const isVisible = !!visible[i]
        const isLast = i === CHAPTERS.length - 1
        const isEven = i % 2 === 0

        return (
          <section
            key={chapter.tag}
            ref={(el) => {
              sectionRefs.current[i] = el
            }}
            className="min-h-screen flex items-center px-6 sm:px-12 lg:px-24 py-20"
            style={{
              background: isEven
                ? 'linear-gradient(135deg, #080c14 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0a0f1e 0%, #080c14 100%)',
            }}
            aria-label={`Chapter ${i + 1}: ${chapter.tag}`}
          >
            <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Text block */}
              <ScrollReveal delay={0}>
                <div
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
                    transition: 'all 0.7s ease',
                    order: isEven ? 0 : 1,
                  }}
                >
                  <span
                    className="text-xs font-semibold tracking-widest uppercase mb-3 block"
                    style={{ color: chapter.color }}
                  >
                    {t('chapter_label', { num: i + 1, tag: chapter.tag })}
                  </span>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-6 text-white">
                    {chapter.heading}
                  </h2>

                  <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-lg mb-6">
                    {chapter.body}
                  </p>

                  {/* Hero stats: contracts, value, risk, cases — shown in chapter 1 */}
                  {chapter.visualType === 'heroStats' && (
                    <div className="mt-2">
                      <HeroStats
                        totalContracts={totalContracts}
                        totalValueMxn={totalValueMxn}
                        highRiskPct={criticalPct + highPct}
                        groundTruthCases={22}
                        riskDistribution={riskDist.length > 0 ? riskDist : undefined}
                      />
                    </div>
                  )}

                  {/* Pattern narrative with NarrativeCard */}
                  {chapter.visualType === 'patternNarrative' && (
                    <NarrativeCard
                      paragraphs={patternNarrativeParagraphs}
                      className="bg-white/[0.03] border-white/10"
                    />
                  )}

                  {/* Risk narrative with NarrativeCard */}
                  {chapter.visualType === 'riskNarrative' && (
                    <NarrativeCard
                      paragraphs={riskNarrativeParagraphs}
                      className="bg-white/[0.03] border-white/10"
                    />
                  )}

                  {/* CTA buttons on last chapter */}
                  {isLast && (
                    <FeaturedCasesStrip onNavigate={goToApp} />
                  )}
                  {isLast && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      <button
                        onClick={() => goToApp('/dashboard')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
                        style={{ backgroundColor: chapter.color, color: '#fff' }}
                      >
                        {t('cta.open_dashboard')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => goToApp('/explore?tab=vendors')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <Search className="h-4 w-4" aria-hidden="true" /> {t('cta.search_vendor')}
                      </button>
                      <button
                        onClick={() => goToApp('/methodology')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <Shield className="h-4 w-4" aria-hidden="true" /> {t('cta.see_methodology')}
                      </button>
                      <button
                        onClick={() => goToApp('/cases')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" /> {t('cta.browse_cases')}
                      </button>
                    </div>
                  )}
                </div>
              </ScrollReveal>

              {/* Visual block */}
              <ScrollReveal delay={150}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                    order: isEven ? 1 : 0,
                  }}
                  aria-hidden="true"
                >
                  {chapter.visualType === 'sectorRing' ? (
                    /* Chapter 4: sector ring visualization */
                    <div
                      className="rounded-2xl p-8 w-full flex flex-col items-center"
                      style={{
                        backgroundColor: `${chapter.color}10`,
                        border: `1px solid ${chapter.color}20`,
                      }}
                    >
                      <SectorRing />
                    </div>
                  ) : (
                    /* Default: large icon + stat card */
                    <div
                      className="relative flex flex-col items-center justify-center rounded-2xl p-10 sm:p-14 w-full sm:w-auto"
                      style={{
                        backgroundColor: `${chapter.color}10`,
                        border: `1px solid ${chapter.color}20`,
                        minHeight: 220,
                      }}
                    >
                      <Icon
                        className="mb-6"
                        style={{ width: 56, height: 56, color: chapter.color, opacity: 0.9 }}
                      />
                      <div
                        className="text-5xl sm:text-6xl font-black tabular-nums"
                        style={{ color: chapter.color }}
                      >
                        {chapter.stat}
                      </div>
                      <div className="text-sm text-white/50 mt-2 text-center max-w-[180px]">
                        {chapter.statLabel}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </section>
        )
      })}

      {/* How it works section */}
      <HowItWorks />

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-white/20 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Cpu className="h-3 w-3" aria-hidden="true" />
          <span>{t('footer.platform')}</span>
        </div>
        <span>{t('footer.data')}</span>
      </footer>
    </div>
  )
}
