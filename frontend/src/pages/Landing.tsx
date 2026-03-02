import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BarChart3, Search, Shield, BookOpen, TrendingUp, AlertTriangle, Cpu, ChevronDown } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { NarrativeCard } from '@/components/NarrativeCard'
import type { NarrativeParagraph } from '@/lib/narratives'
import type { FastDashboardData, RiskDistribution } from '@/api/types'

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
  { name: 'Salud',           pct: 18, color: '#dc2626' },
  { name: 'Infraestructura', pct: 16, color: '#ea580c' },
  { name: 'Educación',       pct: 14, color: '#3b82f6' },
  { name: 'Gobernación',     pct: 11, color: '#be123c' },
  { name: 'Hacienda',        pct:  9, color: '#16a34a' },
  { name: 'Tecnología',      pct:  8, color: '#8b5cf6' },
  { name: 'Energía',         pct: 12, color: '#eab308' },
  { name: 'Defensa',         pct:  3, color: '#1e3a5f' },
  { name: 'Agricultura',     pct:  4, color: '#22c55e' },
  { name: 'Ambiente',        pct:  2, color: '#10b981' },
  { name: 'Trabajo',         pct:  2, color: '#f97316' },
  { name: 'Otros',           pct:  1, color: '#64748b' },
]

function SectorRing() {
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

    arcs.push({ d, color: sector.color, name: sector.name, idx })
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
            <span className="text-[10px] text-white/50 whitespace-nowrap leading-none">{s.name}</span>
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
}

function HeroStats({ totalContracts, totalValueMxn, highRiskPct, groundTruthCases }: HeroStatsProps) {
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
      sub: '6–8 trillion pesos',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span
              className="text-3xl sm:text-4xl font-black tabular-nums leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
            <span className="text-xs text-white/60 leading-tight font-medium">{s.label}</span>
            <span className="text-[10px] text-white/30 leading-tight">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Risk distribution strip */}
      <RiskStrip />
    </div>
  )
}

// ---------------------------------------------------------------------------
// RiskStrip — horizontal proportional bar: critical | high | medium | low
// ---------------------------------------------------------------------------
const RISK_BANDS = [
  { label: 'Critical', pct: 6.5,  color: '#dc2626', contracts: '201,745' },
  { label: 'High',     pct: 4.1,  color: '#f97316', contracts: '126,553' },
  { label: 'Medium',   pct: 43.9, color: '#eab308', contracts: '~1.36M' },
  { label: 'Low',      pct: 45.6, color: '#16a34a', contracts: '~1.42M' },
]

function RiskStrip() {
  const [hov, setHov] = useState<number | null>(null)

  return (
    <div className="w-full" aria-label="Risk level distribution">
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-2">
        {RISK_BANDS.map((band, i) => (
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
        {RISK_BANDS.map((band, i) => (
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
              {band.label} {band.pct}%
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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
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

      <div
        className="max-w-4xl mx-auto flex flex-col items-center gap-6 z-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
        }}
      >
        {/* Platform badge */}
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-white/5 border border-white/10 text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI-Powered Anti-Corruption Research Platform
        </span>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] text-white">
          23 years.{' '}
          <span style={{ color: '#3b82f6' }}>3.1 million</span>{' '}
          contracts.{' '}
          <span style={{ color: '#dc2626' }}>Follow the money.</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/55 max-w-2xl leading-relaxed">
          RUBLI analyzes every federal procurement contract Mexico has published since 2002 —
          flagging corruption patterns, mapping vendor networks, and surfacing cases the data reveals.
        </p>

        {/* What we found strip */}
        <div className="w-full max-w-2xl mt-2">
          <NarrativeCard
            paragraphs={HERO_FINDINGS}
            className="bg-white/[0.03] border-white/10 text-left"
          />
        </div>

        {/* CTA row */}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <button
            onClick={onEnter}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
            style={{ backgroundColor: '#3b82f6', color: '#fff' }}
          >
            Start investigating <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={onScrollDown}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            See how it works <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

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

// Findings displayed in the hero NarrativeCard
const HERO_FINDINGS: NarrativeParagraph[] = [
  {
    text: 'Our model flags 328,298 contracts as high or critical risk — equivalent to the entire public health procurement of 5 years.',
    severity: 'critical',
  },
  {
    text: 'Training ground truth: IMSS Ghost Company Network (9,366 contracts), Segalmex food fraud (6,326), COVID emergency embezzlement (5,371), and 19 more documented scandals.',
    severity: 'warning',
  },
  {
    text: 'Model AUC 0.957 on contracts from 2021–2025 — never seen during training. 93% of known-corrupt contracts scored high or critical.',
    severity: 'info',
  },
]

// ---------------------------------------------------------------------------
// HowItWorks section — plain language methodology explainer
// ---------------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Z-score normalization',
      body: 'Each contract\'s 16 features (price, vendor concentration, ad period, etc.) are converted to z-scores relative to its own sector and year. A single-bid award in Defensa (where 80% are direct) is far less suspicious than in Educación.',
      color: '#3b82f6',
    },
    {
      num: '02',
      title: 'Per-sector logistic models',
      body: '12 dedicated logistic regression sub-models — one per sector — capture sector-specific corruption fingerprints. Energy fraud looks different from health fraud. The global model provides a fallback.',
      color: '#8b5cf6',
    },
    {
      num: '03',
      title: 'Positive-Unlabeled learning',
      body: 'Only documented corruption cases are labeled. The remaining 3.1M contracts are unlabeled (not necessarily clean). Elkan & Noto\'s PU-learning correction (c=0.88) adjusts for this selection bias.',
      color: '#eab308',
    },
    {
      num: '04',
      title: '95% confidence intervals',
      body: 'Each score ships with bootstrap confidence bounds. A contract scoring 0.42 [0.31, 0.55] is genuinely uncertain — one scoring 0.89 [0.81, 0.95] is not. Investigators see both.',
      color: '#16a34a',
    },
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
              The Science
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
              How the Risk Model Works
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base">
              Train AUC 0.964 · Test AUC 0.957 (temporal split, never seen during training) ·
              Validated against 22 documented corruption cases across all 12 sectors
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
              paragraphs={HOW_IT_WORKS_CAVEATS}
              className="bg-white/[0.03] border-white/10"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

const HOW_IT_WORKS_CAVEATS: NarrativeParagraph[] = [
  {
    text: 'A high risk score means the contract\'s procurement characteristics closely resemble those from documented corruption cases — not that corruption is proven. Scores are investigation triage, not verdicts.',
    severity: 'warning',
  },
  {
    text: 'Key limitation: RUBLI analyzes contract award data only. Execution-phase fraud (cost overruns, ghost workers, kickbacks) is invisible. Infrastructure and energy sectors are likely underscored for this reason.',
    severity: 'info',
  },
]

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
  return (
    <div className="w-full mb-5">
      <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
        Biggest Cases
      </p>
      <div className="flex flex-col gap-2">
        {FEATURED_CASES.map((cas) => (
          <button
            key={cas.slug}
            onClick={() => onNavigate(`/cases/${cas.slug}`)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-colors text-left focus:outline-none focus:ring-1 focus:ring-white/30 group"
          >
            {/* Sector color dot */}
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: cas.sectorColor }}
              aria-hidden="true"
            />
            {/* Case name */}
            <span className="flex-1 text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">
              {cas.name}
            </span>
            {/* Contract count */}
            <span className="flex-shrink-0 text-xs text-white/35 tabular-nums">
              {cas.contracts.toLocaleString()} contracts
            </span>
            {/* Fraud type badge */}
            <span
              className={`flex-shrink-0 hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border leading-none ${cas.badgeClass}`}
            >
              {cas.badgeLabel}
            </span>
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
  const totalValueMxn = overview?.total_value_mxn ?? 6_800_000_000_000

  // risk_distribution is RiskDistribution[] — find critical and high percentages
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 6.5
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 4.1

  const CHAPTERS = [
    {
      tag: 'The Scale',
      heading: `${formatCompactMXN(totalValueMxn)} in Government Contracts`,
      body: `Between 2002 and 2025, Mexico's federal government awarded over ${(totalContracts / 1_000_000).toFixed(1)} million contracts worth an estimated 6–8 trillion pesos. RUBLI tracks every peso — from emergency health procurement to major infrastructure works — in a single searchable database.`,
      icon: BarChart3,
      color: '#3b82f6',
      stat: formatCompactMXN(totalValueMxn),
      statLabel: 'Total procurement value (2002–2025)',
      visualType: 'heroStats' as const,
    },
    {
      tag: 'The Patterns',
      heading: 'Systemic Red Flags — In Every Administration',
      body: 'Year-end budget dumps. Direct awards without competition. Suspiciously short publication windows. Single vendors winning 90%+ of a sector\'s contracts. These patterns are not aberrations — the data shows they repeat across every administration since 2002, in every sector.',
      icon: TrendingUp,
      color: '#eab308',
      stat: '78%',
      statLabel: 'of contracts awarded directly (no competition)',
      visualType: 'patternNarrative' as const,
    },
    {
      tag: 'The Risk',
      heading: `${(criticalPct + highPct).toFixed(1)}% of Contracts Flagged High-Risk`,
      body: `RUBLI's AI model — trained on 22 documented corruption cases and validated against contracts it never saw during training — identifies ${criticalPct.toFixed(1)}% of contracts as Critical and ${highPct.toFixed(1)}% as High risk. That's over 328,000 contracts worth investigating.`,
      icon: AlertTriangle,
      color: '#dc2626',
      stat: `${(criticalPct + highPct).toFixed(1)}%`,
      statLabel: 'High or Critical risk contracts',
      visualType: 'riskNarrative' as const,
    },
    {
      tag: 'The Cases',
      heading: 'From IMSS Ghost Companies to Odebrecht Bribes',
      body: "RUBLI's Case Library documents 43 corruption scandals — with the specific vendors, contracts, and procurement patterns that gave them away. These 22 matched cases form the ground truth behind the risk model. The model detects 93% of them as high or critical risk.",
      icon: BookOpen,
      color: '#8b5cf6',
      stat: '43',
      statLabel: 'Documented corruption cases',
      visualType: 'sectorRing' as const,
    },
    {
      tag: 'Your Turn',
      heading: 'Start Investigating',
      body: 'Search any vendor, institution, or contract. Follow the network of co-bidders. Build a dossier. Export to your newsroom. RUBLI gives investigative journalists and anti-corruption researchers the tools to follow the money — across 23 years of data, in seconds.',
      icon: Search,
      color: '#16a34a',
      stat: '3.1M',
      statLabel: 'Contracts searchable in seconds',
      visualType: 'default' as const,
    },
  ] as const

  // Narrative content for chapters that use NarrativeCard
  const patternNarrativeParagraphs: NarrativeParagraph[] = [
    {
      text: '78% of all contracts are direct awards — meaning no open competition, no public bids. In health procurement alone, this rate exceeded 85% during the 2020 COVID emergency.',
      severity: 'warning',
    },
    {
      text: 'December contracts spike 40–60% above monthly averages every year. Budget-year-end pressure pushes institutions toward rushed, uncompetitive awards.',
      severity: 'warning',
    },
    {
      text: 'Vendor concentration: in Agricultura, the top 3 vendors captured 71% of sector value during Segalmex\'s peak years. In Salud, IMSS\'s ghost company network won 9,366 contracts without meaningful competition.',
      severity: 'critical',
    },
  ]

  const riskNarrativeParagraphs: NarrativeParagraph[] = [
    {
      text: `Critical (≥0.50 score): ${criticalPct.toFixed(1)}% — 201,745 contracts. These resemble the strongest known corruption patterns. Immediate investigation warranted.`,
      severity: 'critical',
    },
    {
      text: `High (0.30–0.50 score): ${highPct.toFixed(1)}% — 126,553 contracts. Strong similarity to documented fraud. Priority review recommended.`,
      severity: 'warning',
    },
    {
      text: 'Model confidence: Train AUC 0.964, Test AUC 0.957 (temporal split — test set is 2021–2025, never seen during training). 93% of ground-truth corruption contracts score high or critical.',
      severity: 'info',
    },
  ]

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Fixed top-right controls: chapter dots + skip link */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
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
          Skip to app <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
                    Chapter {i + 1} — {chapter.tag}
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
                        Open Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => goToApp('/explore?tab=vendors')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <Search className="h-4 w-4" aria-hidden="true" /> Search a vendor
                      </button>
                      <button
                        onClick={() => goToApp('/methodology')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <Shield className="h-4 w-4" aria-hidden="true" /> See the methodology
                      </button>
                      <button
                        onClick={() => goToApp('/cases')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" /> Browse case library
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
          <span>RUBLI — Mexican Government Procurement Analysis Platform</span>
        </div>
        <span>Data: COMPRANET 2002–2025 · Model: v5.1 · AUC 0.957</span>
      </footer>
    </div>
  )
}
