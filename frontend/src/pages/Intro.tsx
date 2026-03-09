import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Search, Shield, BookOpen, AlertTriangle, Cpu, ChevronDown } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { NarrativeCard } from '@/components/NarrativeCard'
import type { NarrativeParagraph } from '@/lib/narratives'
import type { FastDashboardData, RiskDistribution } from '@/api/types'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'

// ---------------------------------------------------------------------------
// useCountUp — animates a number from 0 to `target` over `duration` ms.
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
// LangToggle
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

// ---------------------------------------------------------------------------
// ScrollReveal
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
// HeroSection — full viewport intro
// ---------------------------------------------------------------------------
function HeroSection({ onEnter, onScrollDown }: { onEnter: () => void; onScrollDown: () => void }) {
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
        <motion.span
          variants={slideUp}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-white/5 border border-white/10 text-white/50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('hero.badge')}
        </motion.span>

        <motion.h1
          variants={slideUp}
          className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] text-white"
        >
          23 years.{' '}
          <span style={{ color: '#3b82f6' }}>{t('hero.headline_part2')}</span>{' '}
          contracts.{' '}
          <span style={{ color: '#dc2626' }}>{t('hero.headline_part4')}</span>
        </motion.h1>

        <motion.p
          variants={slideUp}
          className="text-lg sm:text-xl text-white/55 max-w-2xl leading-relaxed"
        >
          {t('hero.subheading')}
        </motion.p>

        <motion.div variants={slideUp} className="w-full max-w-2xl mt-2">
          <NarrativeCard
            paragraphs={heroFindings}
            className="bg-white/[0.03] border-white/10 text-left"
          />
        </motion.div>

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

      <button
        onClick={onScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 hover:text-white/40 transition-colors focus:outline-none"
        aria-label="Scroll to learn more"
      >
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
      </button>
    </section>
  )
}

function useHeroFindings(): NarrativeParagraph[] {
  const { t } = useTranslation('landing')
  return [
    { text: t('hero_findings.f1'), severity: 'critical' },
    { text: t('hero_findings.f2'), severity: 'warning' },
    { text: t('hero_findings.f3'), severity: 'info' },
  ]
}

// ---------------------------------------------------------------------------
// StatBomb — animated count-up stat
// ---------------------------------------------------------------------------
function StatBomb({ value, label, sub, color }: {
  value: string; label: string; sub: string; color: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-white/60 leading-tight font-medium">{label}</span>
      <span className="text-[10px] text-white/30 leading-tight">{sub}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RiskStrip — proportional bar
// ---------------------------------------------------------------------------
function RiskStrip({ riskDistribution }: { riskDistribution?: RiskDistribution[] }) {
  const [hov, setHov] = useState<number | null>(null)

  const FALLBACK = [
    { label: 'Critical', pct: 6.1, color: '#dc2626', contracts: '190K' },
    { label: 'High', pct: 2.9, color: '#f97316', contracts: '89K' },
    { label: 'Medium', pct: 13.2, color: '#eab308', contracts: '409K' },
    { label: 'Low', pct: 77.8, color: '#16a34a', contracts: '2.4M' },
  ]

  const bands = (() => {
    if (!riskDistribution || riskDistribution.length === 0) return FALLBACK
    const total = riskDistribution.reduce((s, r) => s + r.count, 0)
    const colorMap: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#16a34a' }
    const order = ['critical', 'high', 'medium', 'low']
    return order.map((level) => {
      const row = riskDistribution.find((r) => r.risk_level === level)
      const count = row?.count ?? 0
      const pct = total > 0 ? (count / total) * 100 : 0
      const label = level.charAt(0).toUpperCase() + level.slice(1)
      const contracts = count >= 1_000_000 ? `~${(count / 1_000_000).toFixed(1)}M` : count.toLocaleString()
      return { label, pct, color: colorMap[level] ?? '#64748b', contracts }
    })
  })()

  return (
    <div className="w-full" aria-label="Risk level distribution">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-2">
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
      <div className="flex gap-4 flex-wrap">
        {bands.map((band, i) => (
          <div
            key={band.label}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: band.color }} />
            <span className="text-[11px] leading-none" style={{ color: hov === i ? band.color : 'rgba(255,255,255,0.45)' }}>
              {band.label} {band.pct.toFixed(1)}%
              {hov === i && <span className="ml-1 text-white/30">· {band.contracts}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FeaturedCasesStrip
// ---------------------------------------------------------------------------
const FEATURED_CASES = [
  { name: 'IMSS Ghost Company Network', contracts: 9366, sector: 'Health', sectorColor: '#dc2626', slug: 'imss-ghost-company-network', badgeClass: 'border-red-500/60 text-red-400 bg-red-500/10', badgeLabel: 'Ghost Company' },
  { name: 'Segalmex Food Distribution', contracts: 6326, sector: 'Agriculture', sectorColor: '#22c55e', slug: 'segalmex-food-distribution', badgeClass: 'border-yellow-500/60 text-yellow-400 bg-yellow-500/10', badgeLabel: 'Procurement Fraud' },
  { name: 'COVID-19 Emergency Procurement', contracts: 5371, sector: 'Health', sectorColor: '#dc2626', slug: 'covid-19-emergency-procurement', badgeClass: 'border-rose-500/60 text-rose-400 bg-rose-500/10', badgeLabel: 'Embezzlement' },
]

function FeaturedCasesStrip({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation('landing')
  return (
    <div className="w-full">
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
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold leading-none ${cas.badgeClass}`}>
                {cas.badgeLabel}
              </span>
              <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: cas.sectorColor }} aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-white/85 group-hover:text-white transition-colors leading-snug">
              {cas.name}
            </span>
            <div className="flex items-center justify-between mt-auto pt-1">
              <span className="text-[11px] text-white/35 tabular-nums">
                {t('featured_cases.contracts', { num: cas.contracts.toLocaleString() })}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// Main Intro page — condensed: Hero + Numbers + Patterns + How + CTA
// ===========================================================================
export default function Intro() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')
  const belowFoldRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (localStorage.getItem('rubli_seen_intro')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

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
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 transition-colors">
          Reload page
        </button>
      </div>
    )
  }

  const goToApp = useCallback((path: string = '/dashboard') => {
    localStorage.setItem('rubli_seen_intro', '1')
    navigate(path)
  }, [navigate])

  const scrollDown = useCallback(() => {
    belowFoldRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_051_294
  const totalValueMxn = overview?.total_value_mxn ?? 9_560_000_000_000
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 6.1
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 2.9

  // Animated stats
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsTriggered, setStatsTriggered] = useState(false)
  useEffect(() => {
    if (!statsRef.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsTriggered(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const contractCount = useCountUp(totalContracts, 1800, statsTriggered)
  const valueB = Math.round(totalValueMxn / 1_000_000_000_000 * 10) / 10
  const valueBAnimated = useCountUp(Math.round(valueB * 10), 2000, statsTriggered) / 10
  const riskPctAnimated = useCountUp(Math.round((criticalPct + highPct) * 10), 1600, statsTriggered) / 10
  const casesAnimated = useCountUp(390, 1200, statsTriggered)

  const patternNarrative: NarrativeParagraph[] = [
    { text: t('chapters.patterns.n1'), severity: 'warning' },
    { text: t('chapters.patterns.n2'), severity: 'warning' },
    { text: t('chapters.patterns.n3'), severity: 'critical' },
  ]

  const riskNarrative: NarrativeParagraph[] = [
    { text: t('chapters.risk.n1', { pct: criticalPct.toFixed(1) }), severity: 'critical' },
    { text: t('chapters.risk.n2', { pct: highPct.toFixed(1) }), severity: 'warning' },
    { text: t('chapters.risk.n3'), severity: 'info' },
  ]

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Fixed controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <LangToggle />
        <button
          onClick={() => goToApp()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {t('skip_to_app')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* ── HERO ── */}
      <HeroSection onEnter={() => goToApp()} onScrollDown={scrollDown} />

      {/* ── SECTION 2: The Numbers ── */}
      <section
        ref={(el: HTMLDivElement | null) => { belowFoldRef.current = el; statsRef.current = el }}
        className="px-6 sm:px-12 lg:px-24 py-20"
        style={{ background: 'linear-gradient(135deg, #080c14 0%, #0f172a 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-3 block">
              {t('chapters.scale.tag')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-8">
              {t('chapters.scale.heading', { value: formatCompactMXN(totalValueMxn) })}
            </h2>
          </ScrollReveal>

          {/* 4 stat bombs */}
          <ScrollReveal delay={100}>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8"
              variants={staggerContainer}
              initial="initial"
              animate={statsTriggered ? 'animate' : 'initial'}
            >
              <motion.div variants={staggerItem}>
                <StatBomb value={statsTriggered ? `${(contractCount / 1_000_000).toFixed(1)}M` : '0M'} label="Contracts tracked" sub="2002 – 2025" color="#3b82f6" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatBomb value={statsTriggered ? `~${valueBAnimated.toFixed(1)}T` : '0T'} label="MXN in procurement" sub="~$500B USD" color="#8b5cf6" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatBomb value={statsTriggered ? `${riskPctAnimated.toFixed(1)}%` : '0%'} label="Contracts high-risk" sub="OECD-calibrated model" color="#dc2626" />
              </motion.div>
              <motion.div variants={staggerItem}>
                <StatBomb value={statsTriggered ? String(casesAnimated) : '0'} label="Corruption cases" sub="Ground-truth database" color="#16a34a" />
              </motion.div>
            </motion.div>
          </ScrollReveal>

          {/* Risk strip */}
          <ScrollReveal delay={200}>
            <RiskStrip riskDistribution={riskDist.length > 0 ? riskDist : undefined} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 3: Systemic Patterns ── */}
      <section
        className="px-6 sm:px-12 lg:px-24 py-20"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #080c14 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-yellow-400 mb-3 block">
              {t('chapters.patterns.tag')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('chapters.patterns.heading')}
            </h2>
            <p className="text-base text-white/50 max-w-2xl mb-6">
              {t('chapters.patterns.body')}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <NarrativeCard paragraphs={patternNarrative} className="bg-white/[0.03] border-white/10 mb-8" />
          </ScrollReveal>

          {/* Risk model + narrative */}
          <ScrollReveal delay={150}>
            <span className="text-xs font-semibold tracking-widest uppercase text-red-400 mb-3 block">
              {t('chapters.risk.tag')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              {t('chapters.risk.heading', { pct: (criticalPct + highPct).toFixed(1) })}
            </h2>
            <p className="text-base text-white/50 max-w-2xl mb-6">
              {t('chapters.risk.body', { critical: criticalPct.toFixed(1), high: highPct.toFixed(1) })}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <NarrativeCard paragraphs={riskNarrative} className="bg-white/[0.03] border-white/10" />
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 4: How It Works ── */}
      <section
        className="px-6 sm:px-12 lg:px-24 py-20"
        style={{ background: 'linear-gradient(135deg, #080c14 0%, #0f172a 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <span className="text-xs font-semibold tracking-widest uppercase text-purple-400 mb-3 block">
                {t('how_it_works.section_label')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                {t('how_it_works.title')}
              </h2>
              <p className="text-white/50 max-w-xl mx-auto text-base">
                {t('how_it_works.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { num: '01', title: t('how_it_works.step1_title'), body: t('how_it_works.step1_body'), color: '#3b82f6' },
              { num: '02', title: t('how_it_works.step2_title'), body: t('how_it_works.step2_body'), color: '#8b5cf6' },
              { num: '03', title: t('how_it_works.step3_title'), body: t('how_it_works.step3_body'), color: '#eab308' },
              { num: '04', title: t('how_it_works.step4_title'), body: t('how_it_works.step4_body'), color: '#16a34a' },
            ].map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 80}>
                <div
                  className="rounded-xl p-5 h-full"
                  style={{ backgroundColor: `${step.color}08`, border: `1px solid ${step.color}20` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-black tabular-nums leading-none flex-shrink-0" style={{ color: step.color, opacity: 0.5 }}>
                      {step.num}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Start Investigating ── */}
      <section
        className="px-6 sm:px-12 lg:px-24 py-20"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #080c14 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <span className="text-xs font-semibold tracking-widest uppercase text-green-400 mb-3 block">
              {t('chapters.yourturn.tag')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('chapters.yourturn.heading')}
            </h2>
            <p className="text-base text-white/50 max-w-2xl mb-8">
              {t('chapters.yourturn.body')}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <FeaturedCasesStrip onNavigate={goToApp} />
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={() => goToApp('/dashboard')}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90 shadow-lg shadow-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-400/60"
                style={{ backgroundColor: '#16a34a', color: '#fff' }}
              >
                {t('cta.open_dashboard')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => goToApp('/explore?tab=vendors')}
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Search className="h-4 w-4" aria-hidden="true" /> {t('cta.search_vendor')}
              </button>
              <button
                onClick={() => goToApp('/methodology')}
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Shield className="h-4 w-4" aria-hidden="true" /> {t('cta.see_methodology')}
              </button>
              <button
                onClick={() => goToApp('/cases')}
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" /> {t('cta.browse_cases')}
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

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
