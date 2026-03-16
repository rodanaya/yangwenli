import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { analysisApi, phiApi } from '@/api/client'
import type { FastDashboardData } from '@/api/types'

// ---------------------------------------------------------------------------
// Constants
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

const SECTOR_COLORS_ARRAY = Object.values(SECTOR_COLORS)

const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  B: { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  C: { text: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  D: { text: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  F: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const SERIF = "'Playfair Display', Georgia, serif"
const CRIMSON = '#c41e3a'

const SECTOR_DISPLAY: Record<string, { es: string; en: string }> = {
  salud: { es: 'Salud', en: 'Health' },
  educacion: { es: 'Educacion', en: 'Education' },
  infraestructura: { es: 'Infraestructura', en: 'Infrastructure' },
  energia: { es: 'Energia', en: 'Energy' },
  defensa: { es: 'Defensa', en: 'Defense' },
  tecnologia: { es: 'Tecnologia', en: 'Technology' },
  hacienda: { es: 'Hacienda', en: 'Finance' },
  gobernacion: { es: 'Gobernacion', en: 'Government' },
  agricultura: { es: 'Agricultura', en: 'Agriculture' },
  ambiente: { es: 'Ambiente', en: 'Environment' },
  trabajo: { es: 'Trabajo', en: 'Labor' },
  otros: { es: 'Otros', en: 'Other' },
}

// ---------------------------------------------------------------------------
// PHI Sector type
// ---------------------------------------------------------------------------
interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  score: number
}

// ---------------------------------------------------------------------------
// useCountUp hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 1800, enabled = false): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) { setValue(0); return }
    startRef.current = null
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, enabled])

  return value
}

// ---------------------------------------------------------------------------
// FloatingDots -- cinematic particle background
// ---------------------------------------------------------------------------
interface DotData {
  id: number
  x: number
  y: number
  size: number
  color: string
  durationY: number
  durationX: number
  delayStagger: number
  opacity: number
  dy: number
  dx: number
}

const FloatingDots = memo(function FloatingDots({
  count = 200,
  className = '',
}: {
  count?: number
  className?: string
}) {
  const dots: DotData[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 5,
        color: SECTOR_COLORS_ARRAY[i % 12],
        durationY: 3 + Math.random() * 5,
        durationX: 4 + Math.random() * 6,
        delayStagger: Math.random() * 3,
        opacity: 0.25 + Math.random() * 0.4,
        dy: -12 + Math.random() * 24,
        dx: -10 + Math.random() * 20,
      })),
    [count],
  )

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: dot.opacity,
            scale: 1,
            y: [0, dot.dy, 0],
            x: [0, dot.dx, 0],
          }}
          transition={{
            opacity: { duration: 0.8, delay: dot.delayStagger * 0.3 },
            scale: { duration: 0.6, delay: dot.delayStagger * 0.3 },
            y: {
              duration: dot.durationY,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: dot.delayStagger,
            },
            x: {
              duration: dot.durationX,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: dot.delayStagger + 0.5,
            },
          }}
        />
      ))}
    </div>
  )
})

// (AnimatedSection removed -- all sections use inline ref/useInView)

// ---------------------------------------------------------------------------
// StatCounter -- a single animated statistic
// ---------------------------------------------------------------------------
function StatCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  color = '#fff',
  labelColor = 'rgba(255,255,255,0.6)',
  inView,
  duration = 2000,
}: {
  value: number
  suffix?: string
  prefix?: string
  label: string
  color?: string
  labelColor?: string
  inView: boolean
  duration?: number
}) {
  const animated = useCountUp(value, duration, inView)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
        style={{ color }}
      >
        {prefix}
        {animated.toLocaleString()}
        {suffix}
      </span>
      <span className="text-sm font-medium" style={{ color: labelColor }}>
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GradeSlotMachine -- animates through letters before landing
// ---------------------------------------------------------------------------
function GradeSlotMachine({ grade, trigger }: { grade: string; trigger: boolean }) {
  const letters = ['A', 'B', 'C', 'D', 'F']
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!trigger) return
    let idx = 0
    const total = letters.length * 3 + letters.indexOf(grade)
    const interval = setInterval(() => {
      idx++
      setCurrent(idx % letters.length)
      if (idx >= total) {
        clearInterval(interval)
        setDone(true)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [trigger, grade])

  const displayLetter = done ? grade : letters[current]
  const gradeStyle = GRADE_COLORS[displayLetter] || GRADE_COLORS.F

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayLetter}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.06 }}
        className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center mx-auto"
        style={{
          fontFamily: SERIF,
          fontSize: '5rem',
          fontWeight: 900,
          color: gradeStyle.text,
          backgroundColor: gradeStyle.bg,
          border: `3px solid ${gradeStyle.border}`,
        }}
      >
        {displayLetter}
      </motion.div>
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// LangToggle
// ---------------------------------------------------------------------------
function LangToggle({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  const borderColor = dark ? 'rgba(255,255,255,0.15)' : '#e7e5e4'
  const bgBase = dark ? 'transparent' : 'white'
  const activeBg = dark ? 'rgba(196,30,58,0.25)' : '#fef2f2'
  const inactiveColor = dark ? 'rgba(255,255,255,0.4)' : '#a8a29e'

  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{ border: `1px solid ${borderColor}`, backgroundColor: bgBase }}
    >
      {(['en', 'es'] as const).map((lang) => {
        const active = lang === 'en' ? isEn : !isEn
        return (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-red-400/40"
            style={{
              backgroundColor: active ? activeBg : 'transparent',
              color: active ? CRIMSON : inactiveColor,
            }}
            aria-pressed={active}
            aria-label={lang === 'en' ? 'Switch to English' : 'Cambiar a Espanol'}
          >
            {lang.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProcessStep -- one step in the methodology pipeline
// ---------------------------------------------------------------------------
function ProcessStep({
  step,
  title,
  body,
  color,
  index,
  inView,
}: {
  step: string
  title: string
  body: string
  color: string
  index: number
  inView: boolean
}) {
  return (
    <motion.div
      className="flex flex-col relative"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
    >
      {/* Step number */}
      <span
        className="text-6xl font-black font-mono mb-4 leading-none"
        style={{ color, opacity: 0.18 }}
      >
        {step}
      </span>
      <h3 className="text-lg font-bold mb-2" style={{ color: '#1a1714' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#78716c' }}>
        {body}
      </p>
      {/* Animated connector line on desktop */}
      {index < 3 && (
        <motion.div
          className="hidden sm:block absolute -right-4 top-8 w-8 h-0.5"
          style={{ backgroundColor: color, opacity: 0.25 }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.15 + 0.5 }}
        />
      )}
    </motion.div>
  )
}

// ===========================================================================
// Main Intro page
// ===========================================================================
export default function Intro() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  const [mounted, setMounted] = useState(false)

  // Redirect if already seen
  useEffect(() => {
    if (localStorage.getItem('rubli_seen_intro')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // ---- Data fetching ----
  const { data: fastDashboard } = useQuery<FastDashboardData>({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const { data: phiSectorsData } = useQuery<{ sectors: PHISector[] }>({
    queryKey: ['phi', 'sectors'],
    queryFn: () => phiApi.getSectors(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const goToApp = useCallback(
    (path = '/dashboard') => {
      localStorage.setItem('rubli_seen_intro', '1')
      navigate(path)
    },
    [navigate],
  )

  // ---- Derived data ----
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_051_294
  const totalValueMxn = overview?.total_value_mxn ?? 9_560_000_000_000
  const yearlyTrends = fastDashboard?.yearly_trends ?? []
  const sectors = fastDashboard?.sectors ?? []
  const phiSectors = phiSectorsData?.sectors ?? []

  // Value in trillions
  const valueT = Math.round((totalValueMxn / 1_000_000_000_000) * 10) / 10
  const valueTInt = Math.round(valueT * 10)

  // Section 2 inView
  const s2Ref = useRef<HTMLDivElement>(null)
  const s2InView = useInView(s2Ref, { once: true, amount: 0.25 })

  // Section 3 inView
  const s3Ref = useRef<HTMLDivElement>(null)
  const s3InView = useInView(s3Ref, { once: true, amount: 0.15 })

  // Section 4 inView
  const s4Ref = useRef<HTMLDivElement>(null)
  const s4InView = useInView(s4Ref, { once: true, amount: 0.15 })

  // Section 5 inView
  const s5Ref = useRef<HTMLDivElement>(null)
  const s5InView = useInView(s5Ref, { once: true, amount: 0.25 })

  // Count-up for section 2 stats
  const yearsUp = useCountUp(23, 1200, s2InView)
  const valueTUp = useCountUp(valueTInt, 1800, s2InView)

  // Build chart data for section 2 (year-by-year bars)
  const chartBars = useMemo(() => {
    if (yearlyTrends.length === 0) return []
    const maxContracts = Math.max(...yearlyTrends.map((y) => y.contracts))
    return yearlyTrends.map((y) => ({
      year: y.year,
      contracts: y.contracts,
      heightPct: maxContracts > 0 ? (y.contracts / maxContracts) * 100 : 0,
      highRiskPct: y.high_risk_pct ?? 0,
    }))
  }, [yearlyTrends])

  // National average grade for section 5
  const nationalGrade = useMemo(() => {
    if (phiSectors.length === 0) return 'C'
    const avgScore = phiSectors.reduce((sum, s) => sum + s.score, 0) / phiSectors.length
    if (avgScore >= 80) return 'A'
    if (avgScore >= 60) return 'B'
    if (avgScore >= 40) return 'C'
    if (avgScore >= 20) return 'D'
    return 'F'
  }, [phiSectors])

  // Sort sectors by risk for section 3
  const sortedSectors = useMemo(() => {
    return [...sectors].sort(
      (a, b) => b.avg_risk_score - a.avg_risk_score,
    )
  }, [sectors])

  return (
    <div className="min-h-screen" style={{ overflowX: 'hidden' }}>
      {/* ================================================================= */}
      {/* SECTION 1: CINEMATIC OPENING - Dark, full viewport */}
      {/* ================================================================= */}
      <section
        className="min-h-screen flex flex-col items-center justify-center relative"
        style={{ background: '#0d1117', color: '#fff' }}
        aria-label="RUBLI platform introduction"
      >
        {/* Floating dots background */}
        <FloatingDots count={180} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-10 py-5 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={mounted ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl font-black tracking-tight"
            style={{ fontFamily: SERIF, color: '#fff' }}
          >
            RUBLI
          </motion.span>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={mounted ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <LangToggle dark />
            <button
              onClick={() => goToApp()}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'Enter' : 'Entrar'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center gap-6">
          {/* Crimson label */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: CRIMSON }}
          >
            RUBLI &bull; {isEn ? 'PROCUREMENT TRANSPARENCY' : 'TRANSPARENCIA PROCURATORIA'}
          </motion.span>

          {/* Main title with contract count */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05]"
            style={{ fontFamily: SERIF, letterSpacing: '-0.03em' }}
          >
            <span style={{ color: CRIMSON }}>3,051,294</span>
            <br />
            <span style={{ color: '#fff' }}>{isEn ? 'contracts' : 'contratos'}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="text-lg sm:text-xl max-w-xl leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {isEn
              ? 'analyzed by artificial intelligence to detect corruption patterns'
              : 'analizados por inteligencia artificial para detectar patrones de corrupcion'}
          </motion.p>

          {/* Scroll prompt */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 2.2, duration: 1 }}
            className="mt-8 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => {
              document.getElementById('section-scale')?.scrollIntoView({ behavior: 'smooth' })
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') document.getElementById('section-scale')?.scrollIntoView({ behavior: 'smooth' })
            }}
            aria-label={isEn ? 'Scroll to learn more' : 'Desplaza para saber mas'}
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isEn ? 'Discover' : 'Descubre'}
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 2: THE SCALE - White bg, animated bar chart */}
      {/* ================================================================= */}
      <section
        id="section-scale"
        ref={s2Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#fff' }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header label */}
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={s2InView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'THE SCALE OF THE PROBLEM' : 'EL TAMANO DEL PROBLEMA'}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={s2InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black mb-12 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#1a1714' }}
          >
            {isEn ? '23 years of public spending data' : '23 anos de datos de gasto publico'}
          </motion.h2>

          {/* Animated bar chart - custom CSS bars */}
          {chartBars.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={s2InView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-16"
            >
              <div className="flex items-end gap-[2px] sm:gap-1 h-40 sm:h-52">
                {chartBars.map((bar, i) => {
                  const isHighRisk = bar.highRiskPct > 15
                  return (
                    <motion.div
                      key={bar.year}
                      className="flex-1 rounded-t-sm relative group cursor-default"
                      style={{
                        backgroundColor: isHighRisk ? CRIMSON : '#2563eb',
                        opacity: isHighRisk ? 0.9 : 0.6,
                        minWidth: 2,
                      }}
                      initial={{ height: 0 }}
                      animate={s2InView ? { height: `${Math.max(bar.heightPct, 2)}%` } : { height: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.03 + 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                      title={`${bar.year}: ${bar.contracts.toLocaleString()} ${isEn ? 'contracts' : 'contratos'}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {bar.year}: {bar.contracts.toLocaleString()}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {/* Year labels (first, middle, last) */}
              <div className="flex justify-between mt-2 text-xs" style={{ color: '#a8a29e' }}>
                <span>{chartBars[0]?.year}</span>
                <span>{chartBars[Math.floor(chartBars.length / 2)]?.year}</span>
                <span>{chartBars[chartBars.length - 1]?.year}</span>
              </div>
            </motion.div>
          )}

          {/* Three animated stat counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <StatCounter
              value={totalContracts}
              label={isEn ? 'contracts analyzed' : 'contratos analizados'}
              color="#1a1714"
              labelColor="#78716c"
              inView={s2InView}
              duration={2200}
            />
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
                style={{ color: '#1a1714' }}
              >
                {yearsUp}
              </span>
              <span className="text-sm font-medium" style={{ color: '#78716c' }}>
                {isEn ? 'years of data (2002-2025)' : 'anos de datos (2002-2025)'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
                style={{ color: '#1a1714' }}
              >
                ~{(valueTUp / 10).toFixed(1)}T
              </span>
              <span className="text-sm font-medium" style={{ color: '#78716c' }}>
                {isEn ? 'MXN evaluated value' : 'MXN valor evaluado'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 3: THE RISK MAP - Dark bg, sector cards */}
      {/* ================================================================= */}
      <section
        ref={s3Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#1a1714', color: '#fff' }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={s3InView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'WHERE IS THE RISK?' : 'DONDE ESTA EL RIESGO?'}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={s3InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black mb-14 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em' }}
          >
            {isEn ? 'Risk by sector' : 'Riesgo por sector'}
          </motion.h2>

          {/* Sector cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
            {sortedSectors.length > 0
              ? sortedSectors.map((sector, i) => {
                  const key = sector.code?.toLowerCase() ?? 'otros'
                  const sectorColor = SECTOR_COLORS[key] ?? '#64748b'
                  const displayName = SECTOR_DISPLAY[key]
                  const name = displayName
                    ? isEn
                      ? displayName.en
                      : displayName.es
                    : sector.name
                  const riskPct = Math.round(sector.avg_risk_score * 100)

                  return (
                    <motion.div
                      key={sector.id}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={s3InView ? { opacity: 1, y: 0, scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: i * 0.06 + 0.2 }}
                      className="rounded-xl p-4 flex flex-col gap-3"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Pulsing colored dot */}
                        <span className="relative flex h-3 w-3 flex-shrink-0">
                          <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                            style={{ backgroundColor: sectorColor }}
                          />
                          <span
                            className="relative inline-flex rounded-full h-3 w-3"
                            style={{ backgroundColor: sectorColor }}
                          />
                        </span>
                        <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {name}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <SectorRiskBar pct={riskPct} color={sectorColor} inView={s3InView} delay={i * 0.06 + 0.4} />
                        <span className="text-xl font-black tabular-nums" style={{ color: sectorColor }}>
                          {s3InView ? riskPct : 0}%
                        </span>
                      </div>
                    </motion.div>
                  )
                })
              : Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-xl h-24 animate-pulse"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  />
                ))}
          </div>

          {/* Big stat callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={s3InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-center"
          >
            <span
              className="text-5xl sm:text-6xl font-black"
              style={{ fontFamily: SERIF, color: CRIMSON }}
            >
              12.3%
            </span>
            <p className="text-base mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {isEn ? 'of contracts flagged as high risk' : 'de contratos en alto riesgo'}
            </p>
            <button
              onClick={() => goToApp('/report-card')}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'See the Full Report' : 'Ver el Reporte Completo'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 4: HOW IT WORKS - White bg, animated steps */}
      {/* ================================================================= */}
      <section
        ref={s4Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#fff' }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={s4InView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'HOW WE DETECT PATTERNS' : 'COMO DETECTAMOS PATRONES'}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={s4InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black mb-14 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#1a1714' }}
          >
            {isEn ? 'From raw data to risk intelligence' : 'De datos crudos a inteligencia de riesgo'}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: isEn ? 'Data' : 'Datos',
                body: isEn
                  ? '3.1M contracts from COMPRANET (2002-2025), cleaned and standardized'
                  : '3.1M contratos de COMPRANET (2002-2025), limpiados y estandarizados',
                color: '#2563eb',
              },
              {
                step: '02',
                title: isEn ? '16 Indicators' : '16 Indicadores',
                body: isEn
                  ? 'Vendor concentration, atypical prices, direct awards, network patterns...'
                  : 'Concentracion de proveedores, precios atipicos, adjudicacion directa, redes...',
                color: '#8b5cf6',
              },
              {
                step: '03',
                title: isEn ? 'ML Model' : 'Modelo ML',
                body: isEn
                  ? 'Compared against 289 documented corruption cases across all 12 sectors'
                  : 'Comparamos contra 289 casos documentados de corrupcion en los 12 sectores',
                color: CRIMSON,
              },
              {
                step: '04',
                title: isEn ? 'Report' : 'Reporte',
                body: isEn
                  ? 'We grade procurement health from A to F for every sector'
                  : 'Calificamos la salud procuratoria de A a F para cada sector',
                color: '#16a34a',
              },
            ].map((item, i) => (
              <ProcessStep key={item.step} {...item} index={i} inView={s4InView} />
            ))}
          </div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={s4InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mt-14 rounded-xl border border-stone-200 p-5 text-sm leading-relaxed"
            style={{ color: '#78716c', background: '#faf9f6' }}
          >
            {isEn
              ? 'Scores are statistical risk indicators, not proof of corruption. A high score means the contract resembles documented corruption patterns.'
              : 'Las puntuaciones son indicadores estadisticos de riesgo, no prueba de corrupcion. Una puntuacion alta significa que el contrato se parece a patrones documentados.'}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={s4InView ? { opacity: 1 } : {}}
            transition={{ delay: 1 }}
            onClick={() => goToApp('/methodology')}
            className="mt-8 inline-flex items-center gap-2 text-base font-bold transition-colors duration-200 hover:underline focus:outline-none"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'See the full methodology' : 'Ver la metodologia completa'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 5: REPORT CARD TEASER - Warm bg, grade slot machine */}
      {/* ================================================================= */}
      <section
        ref={s5Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#f5f5f0' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={s5InView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'OUR NATIONAL GRADE' : 'NUESTRA CALIFICACION NACIONAL'}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={s5InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black mb-10 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#1a1714' }}
          >
            {isEn
              ? 'How healthy is Mexican public procurement?'
              : 'Que tan sana es la contratacion publica de Mexico?'}
          </motion.h2>

          {/* Grade slot machine */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={s5InView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <GradeSlotMachine grade={nationalGrade} trigger={s5InView} />
            <p className="mt-4 text-base" style={{ color: '#78716c' }}>
              {isEn ? 'National average grade' : 'Calificacion promedio nacional'}
            </p>
          </motion.div>

          {/* Per-sector grades */}
          {phiSectors.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
              {phiSectors.map((sector, i) => {
                const key = sector.sector_name.toLowerCase().replace(/\s+/g, '')
                const gradeStyle = GRADE_COLORS[sector.grade] || GRADE_COLORS.F
                const sectorColor = SECTOR_COLORS[key] ?? '#64748b'
                const displayName = SECTOR_DISPLAY[key]
                const name = displayName ? (isEn ? displayName.en : displayName.es) : sector.sector_name

                return (
                  <motion.div
                    key={sector.sector_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={s5InView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.35, delay: i * 0.05 + 0.6 }}
                    className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 shadow-sm"
                  >
                    <span
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sectorColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block" style={{ color: '#1a1714' }}>
                        {name}
                      </span>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0"
                      style={{
                        fontFamily: SERIF,
                        color: gradeStyle.text,
                        backgroundColor: gradeStyle.bg,
                        border: `1px solid ${gradeStyle.border}`,
                      }}
                    >
                      {sector.grade}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-stone-200 p-4 h-16 animate-pulse"
                />
              ))}
            </div>
          )}

          <button
            onClick={() => goToApp('/report-card')}
            className="inline-flex items-center gap-2 text-base font-bold transition-colors duration-200 hover:underline focus:outline-none"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'See the Full Report' : 'Ver el Reporte Completo'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 6: CALL TO ACTION - Dark with dots */}
      {/* ================================================================= */}
      <section
        className="relative px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#0d1117', color: '#fff' }}
      >
        <FloatingDots count={80} className="opacity-40" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em' }}
          >
            {isEn ? 'Start investigating' : 'Empieza a investigar'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg mb-10"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {isEn
              ? 'Browse contracts, investigate vendors, and discover risk patterns.'
              : 'Navega contratos, investiga proveedores y descubre patrones de riesgo.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <button
              onClick={() => goToApp('/report-card')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'See the Report' : 'Ver el Reporte'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => goToApp('/dashboard')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
            >
              {isEn ? 'Explore the platform' : 'Explorar la plataforma'}
            </button>
          </motion.div>

          {/* Attribution */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-14 text-xs"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {isEn ? 'Data' : 'Datos'}: COMPRANET &bull; {isEn ? 'Methodology' : 'Metodologia'}: OECD, IMF CRI &bull;{' '}
            {isEn ? 'Open-source procurement intelligence' : 'Inteligencia en contrataciones de codigo abierto'}
          </motion.p>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectorRiskBar -- small animated horizontal bar
// ---------------------------------------------------------------------------
function SectorRiskBar({
  pct,
  color,
  inView,
  delay,
}: {
  pct: number
  color: string
  inView: boolean
  delay: number
}) {
  return (
    <div className="flex-1 mr-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, opacity: 0.7 }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(pct * 3, 100)}%` } : { width: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  )
}
