import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Database,
  Users,
  LayoutGrid,
  Calendar,
  Download,
  Cpu,
  Search,
  BarChart3,
} from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { FastDashboardData, RiskDistribution, DashboardSectorItem } from '@/api/types'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'

// ---------------------------------------------------------------------------
// Sector color map (matches CLAUDE.md canonical colors)
// ---------------------------------------------------------------------------
const SECTOR_COLORS: Record<string, string> = {
  salud: '#dc2626',
  educacion: '#3b82f6',
  infraestructura: '#ea580c',
  energia: '#eab308',
  defensa: '#1e3a5f',
  tecnologia: '#8b5cf6',
  hacienda: '#16a34a',
  gobernacion: '#be123c',
  agricultura: '#22c55e',
  ambiente: '#10b981',
  trabajo: '#f97316',
  otros: '#64748b',
}

// ---------------------------------------------------------------------------
// useCountUp -- animates a number from 0 to `target` over `duration` ms.
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
    <div className="flex items-center gap-0.5 rounded-full p-0.5 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        style={{
          backgroundColor: isEn ? 'rgba(245,158,11,0.15)' : 'transparent',
          color: isEn ? '#f59e0b' : 'rgba(255,255,255,0.35)',
        }}
        aria-pressed={isEn}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage('es')}
        className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        style={{
          backgroundColor: !isEn ? 'rgba(245,158,11,0.15)' : 'transparent',
          color: !isEn ? '#f59e0b' : 'rgba(255,255,255,0.35)',
        }}
        aria-pressed={!isEn}
        aria-label="Cambiar a Espanol"
      >
        ES
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnimatedGrid -- subtle CSS-only background
// ---------------------------------------------------------------------------
function AnimatedGrid() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 35%, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: 'linear-gradient(to top, #080c14, transparent)' }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// HeroSection -- full viewport
// ---------------------------------------------------------------------------
function HeroSection({
  onEnter,
  onMethodology,
  totalContracts,
  highRiskCount,
  totalValueMxn,
}: {
  onEnter: () => void
  onMethodology: () => void
  totalContracts: number
  highRiskCount: number
  totalValueMxn: number
}) {
  const [mounted, setMounted] = useState(false)
  const { t } = useTranslation('landing')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const contractsAnimated = useCountUp(totalContracts, 2000, mounted)
  const flaggedAnimated = useCountUp(highRiskCount, 2200, mounted)
  const valueT = Math.round(totalValueMxn / 1_000_000_000_000 * 10) / 10
  const valueTAnimated = useCountUp(Math.round(valueT * 10), 1800, mounted) / 10

  return (
    <section
      ref={ref}
      className="min-h-screen flex flex-col items-center justify-center relative px-6 sm:px-12 text-center overflow-hidden"
      style={{ background: '#080c14' }}
      aria-label="RUBLI platform introduction"
    >
      <AnimatedGrid />

      <motion.div
        className="max-w-4xl mx-auto flex flex-col items-center gap-8 z-10"
        variants={staggerContainer}
        initial="initial"
        animate={mounted ? 'animate' : 'initial'}
      >
        {/* Badge */}
        <motion.span
          variants={slideUp}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          RUBLI v6.1
        </motion.span>

        {/* Headline */}
        <motion.h1
          variants={slideUp}
          className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] text-white"
        >
          {t('hero.headline')}{' '}
          <span className="block sm:inline" style={{ color: '#f59e0b' }}>
            {t('hero.headline_accent')}
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          variants={slideUp}
          className="text-lg sm:text-xl max-w-2xl leading-relaxed"
          style={{ color: '#7d90aa' }}
        >
          {t('hero.sub')}
        </motion.p>

        {/* Animated counters */}
        <motion.div
          variants={slideUp}
          className="grid grid-cols-3 gap-6 sm:gap-12 w-full max-w-2xl"
        >
          <CounterStat
            value={mounted ? `${(contractsAnimated / 1_000_000).toFixed(1)}M` : '0'}
            label={t('hero.stat_contracts')}
            color="#3b82f6"
            inView={inView}
          />
          <CounterStat
            value={mounted ? flaggedAnimated.toLocaleString() : '0'}
            label={t('hero.stat_flagged')}
            color="#ef4444"
            inView={inView}
          />
          <CounterStat
            value={mounted ? `~${valueTAnimated.toFixed(1)}T` : '0'}
            label={t('hero.stat_value')}
            color="#f59e0b"
            inView={inView}
          />
        </motion.div>

        {/* CTAs */}
        <motion.div variants={slideUp} className="flex flex-wrap gap-3 justify-center mt-2">
          <button
            onClick={onEnter}
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400/60"
            style={{
              backgroundColor: '#f59e0b',
              color: '#080c14',
              boxShadow: '0 0 30px -5px rgba(245,158,11,0.3)',
            }}
          >
            {t('hero.cta_primary')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={onMethodology}
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            {t('hero.cta_secondary')}
          </button>
        </motion.div>
      </motion.div>
    </section>
  )
}

function CounterStat({ value, label, color }: {
  value: string; label: string; color: string; inView: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-2xl sm:text-4xl font-black tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-[11px] leading-tight font-medium" style={{ color: '#4a5d73' }}>
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScaleSection -- 4 stat cards
// ---------------------------------------------------------------------------
function ScaleSection({ totalContracts, totalVendors }: { totalContracts: number; totalVendors: number }) {
  const { t } = useTranslation('landing')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  const stats = useMemo(() => [
    { icon: Database, value: `${(totalContracts / 1_000_000).toFixed(1)}M`, label: t('scale.contracts'), color: '#3b82f6' },
    { icon: Users, value: `${Math.round(totalVendors / 1000)}K`, label: t('scale.vendors'), color: '#8b5cf6' },
    { icon: LayoutGrid, value: '12', label: t('scale.sectors'), color: '#f59e0b' },
    { icon: Calendar, value: '23', label: t('scale.years'), color: '#22c55e' },
  ], [totalContracts, totalVendors, t])

  return (
    <section
      ref={ref}
      className="px-6 sm:px-12 lg:px-24 py-20"
      style={{ background: '#080c14' }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-black text-white mb-10 text-center"
        >
          {t('scale.title')}
        </motion.h2>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate={inView ? 'animate' : 'initial'}
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={staggerItem}
              className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
              style={{
                background: `${s.color}06`,
                border: `1px solid ${s.color}18`,
              }}
            >
              <s.icon className="h-5 w-5" style={{ color: s.color, opacity: 0.7 }} aria-hidden="true" />
              <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none" style={{ color: s.color }}>
                {s.value}
              </span>
              <span className="text-xs font-medium" style={{ color: '#7d90aa' }}>
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// HowItWorksSection -- 3 steps
// ---------------------------------------------------------------------------
function HowItWorksSection() {
  const { t } = useTranslation('landing')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  const steps = useMemo(() => [
    { num: '01', title: t('how.step1_title'), body: t('how.step1_body'), icon: Download, color: '#3b82f6' },
    { num: '02', title: t('how.step2_title'), body: t('how.step2_body'), icon: Cpu, color: '#f59e0b' },
    { num: '03', title: t('how.step3_title'), body: t('how.step3_body'), icon: Search, color: '#22c55e' },
  ], [t])

  return (
    <section
      ref={ref}
      className="px-6 sm:px-12 lg:px-24 py-20"
      style={{ background: 'linear-gradient(180deg, #080c14 0%, #0a1020 100%)' }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span
            className="text-[11px] font-semibold tracking-widest uppercase mb-3 block"
            style={{ color: '#f59e0b' }}
          >
            {t('how.tag')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            {t('how.title')}
          </h2>
          <p className="text-sm max-w-xl mx-auto" style={{ color: '#7d90aa' }}>
            {t('how.sub')}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="initial"
          animate={inView ? 'animate' : 'initial'}
        >
          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={staggerItem}
              className="rounded-xl p-6"
              style={{
                background: `${step.color}05`,
                border: `1px solid ${step.color}15`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${step.color}12` }}
                >
                  <step.icon className="h-5 w-5" style={{ color: step.color }} aria-hidden="true" />
                </div>
                <span className="text-xl font-black tabular-nums" style={{ color: step.color, opacity: 0.4 }}>
                  {step.num}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#7d90aa' }}>
                {step.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// RiskSnapshotSection -- live data
// ---------------------------------------------------------------------------
function RiskSnapshotSection({
  riskDist,
  sectors,
}: {
  riskDist: RiskDistribution[]
  sectors: DashboardSectorItem[]
}) {
  const { t } = useTranslation('landing')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  const total = riskDist.reduce((s, r) => s + r.count, 0)
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 0
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 0
  const highRiskRate = (criticalPct + highPct).toFixed(1)

  const riskColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  }
  const riskOrder = ['critical', 'high', 'medium', 'low'] as const

  // Top 3 sectors by avg risk
  const topSectors = useMemo(() => {
    if (!sectors || sectors.length === 0) return []
    return [...sectors]
      .sort((a, b) => b.avg_risk_score - a.avg_risk_score)
      .slice(0, 5)
  }, [sectors])

  if (riskDist.length === 0) return null

  return (
    <section
      ref={ref}
      className="px-6 sm:px-12 lg:px-24 py-20"
      style={{ background: '#080c14' }}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#ef4444' }}>
            {t('snapshot.tag')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            {t('snapshot.title')}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {/* Risk distribution card */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#0e1420', border: '1px solid #1e2d45' }}
          >
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-black tabular-nums" style={{ color: '#ef4444' }}>
                {highRiskRate}%
              </span>
              <span className="text-xs font-medium" style={{ color: '#7d90aa' }}>
                {t('snapshot.high_risk_rate')}
              </span>
            </div>

            {/* Proportional bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-px mb-4">
              {riskOrder.map((level) => {
                const row = riskDist.find((r) => r.risk_level === level)
                const pct = row ? (row.count / total) * 100 : 0
                return (
                  <div
                    key={level}
                    style={{ width: `${pct}%`, backgroundColor: riskColors[level] }}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2">
              {riskOrder.map((level) => {
                const row = riskDist.find((r) => r.risk_level === level)
                const count = row?.count ?? 0
                const tKey = `snapshot.${level}` as const
                return (
                  <div key={level} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: riskColors[level] }} />
                    <span className="text-[11px]" style={{ color: '#7d90aa' }}>
                      {t(tKey)} -- {count.toLocaleString()} {t('snapshot.contracts_label')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top sectors card */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#0e1420', border: '1px solid #1e2d45' }}
          >
            <h3 className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: '#7d90aa' }}>
              {t('snapshot.top_sectors')}
            </h3>
            <div className="space-y-3">
              {topSectors.map((s) => {
                const hrPct = s.total_contracts > 0
                  ? ((s.high_risk_count + s.critical_risk_count) / s.total_contracts * 100)
                  : 0
                const sectorColor = SECTOR_COLORS[s.code] ?? '#64748b'
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
                    <span className="text-sm font-medium text-white flex-1 capitalize truncate">
                      {s.name}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: '#7d90aa' }}>
                      {hrPct.toFixed(1)}% HR
                    </span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(hrPct * 3, 100)}%`, backgroundColor: sectorColor }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// CTASection -- final call to action
// ---------------------------------------------------------------------------
function CTASection({ onDashboard, onExecutive }: { onDashboard: () => void; onExecutive: () => void }) {
  const { t } = useTranslation('landing')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section
      ref={ref}
      className="px-6 sm:px-12 lg:px-24 py-24"
      style={{ background: 'linear-gradient(180deg, #0a1020 0%, #080c14 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center"
      >
        <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#f59e0b' }}>
          {t('cta.tag')}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
          {t('cta.title')}
        </h2>
        <p className="text-sm mb-8" style={{ color: '#4a5d73' }}>
          {t('cta.sub')}
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={onDashboard}
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400/60"
            style={{
              backgroundColor: '#f59e0b',
              color: '#080c14',
              boxShadow: '0 0 30px -5px rgba(245,158,11,0.3)',
            }}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t('cta.dashboard')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={onExecutive}
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            {t('cta.executive')}
          </button>
        </div>
      </motion.div>
    </section>
  )
}

// ===========================================================================
// Main Intro page
// ===========================================================================
export default function Intro() {
  const navigate = useNavigate()
  const { t } = useTranslation('landing')

  useEffect(() => {
    if (localStorage.getItem('rubli_seen_intro')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const { data: fastDashboard } = useQuery<FastDashboardData>({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const goToApp = useCallback((path: string = '/dashboard') => {
    localStorage.setItem('rubli_seen_intro', '1')
    navigate(path)
  }, [navigate])

  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_051_294
  const totalVendors = overview?.total_vendors ?? 320_000
  const totalValueMxn = overview?.total_value_mxn ?? 9_560_000_000_000
  const highRiskCount = overview?.high_risk_contracts ?? 301_961
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const sectors: DashboardSectorItem[] = fastDashboard?.sectors ?? []

  return (
    <div className="min-h-screen text-white" style={{ background: '#080c14' }}>
      {/* Fixed controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <LangToggle />
        <button
          onClick={() => goToApp()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#f59e0b',
          }}
        >
          {t('skip_to_app')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Section 1: Hero */}
      <HeroSection
        onEnter={() => goToApp()}
        onMethodology={() => goToApp('/methodology')}
        totalContracts={totalContracts}
        highRiskCount={highRiskCount}
        totalValueMxn={totalValueMxn}
      />

      {/* Section 2: The Scale */}
      <ScaleSection totalContracts={totalContracts} totalVendors={totalVendors} />

      {/* Section 3: How It Works */}
      <HowItWorksSection />

      {/* Section 4: Risk Snapshot (live data) */}
      <RiskSnapshotSection riskDist={riskDist} sectors={sectors} />

      {/* Section 5: CTA */}
      <CTASection
        onDashboard={() => goToApp('/dashboard')}
        onExecutive={() => goToApp('/executive')}
      />

      {/* Footer */}
      <footer
        className="text-center py-8 text-xs"
        style={{ borderTop: '1px solid #1e2d45', color: '#4a5d73' }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Cpu className="h-3 w-3" aria-hidden="true" />
          <span>{t('footer.platform')}</span>
        </div>
        <span>{t('footer.data')}</span>
      </footer>
    </div>
  )
}
