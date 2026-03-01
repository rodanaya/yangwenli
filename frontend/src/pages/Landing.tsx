import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BarChart3, Search, Shield, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
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
      color: '#3b82f6',
    },
    {
      value: triggered ? `~${valueBAnimated.toFixed(1)}T` : '0T',
      label: 'MXN in procurement',
      color: '#8b5cf6',
    },
    {
      value: triggered ? `${riskPctAnimated.toFixed(1)}%` : '0%',
      label: 'Contracts high-risk',
      color: '#dc2626',
    },
    {
      value: triggered ? String(casesAnimated) : '0',
      label: 'Corruption cases',
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
            <span className="text-xs text-white/45 leading-tight">{s.label}</span>
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
  { label: 'Critical', pct: 6.5,  color: '#dc2626' },
  { label: 'High',     pct: 4.1,  color: '#f97316' },
  { label: 'Medium',   pct: 43.9, color: '#eab308' },
  { label: 'Low',      pct: 45.6, color: '#16a34a' },
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

// ===========================================================================
// Main page
// ===========================================================================
export default function Landing() {
  const navigate = useNavigate()
  const [activeChapter, setActiveChapter] = useState(0)
  const [visible, setVisible] = useState<Record<number, boolean>>({})
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

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

  // Derive live stats from API; fall back to known values from CLAUDE.md
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_110_007
  const totalValueMxn = overview?.total_value_mxn ?? 6_800_000_000_000

  // risk_distribution is RiskDistribution[] — find critical and high percentages
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 6.1
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 2.9

  const CHAPTERS = [
    {
      tag: 'The Scale',
      heading: `${formatCompactMXN(totalValueMxn)} in Government Contracts`,
      body: `Between 2002 and 2025, Mexico's federal government awarded over ${(totalContracts / 1_000_000).toFixed(1)} million contracts. RUBLI tracks every peso — from emergency health procurement to major infrastructure works.`,
      icon: BarChart3,
      color: '#3b82f6',
      stat: formatCompactMXN(totalValueMxn),
      statLabel: 'Total procurement value (2002–2025)',
      visualType: 'heroStats' as const,
    },
    {
      tag: 'The Patterns',
      heading: 'Billions Spent in December Rushes',
      body: 'Year-end budget dumps, direct awards without competition, and suspiciously short publication periods are systemic — not exceptions. The data reveals these patterns across every administration since 2002.',
      icon: TrendingUp,
      color: '#eab308',
      stat: '78%',
      statLabel: 'of contracts awarded directly (no competition)',
      visualType: 'default' as const,
    },
    {
      tag: 'The Risk',
      heading: `${(criticalPct + highPct).toFixed(1)}% of Contracts Flagged High-Risk`,
      body: `RUBLI's AI model — trained on 22 documented corruption cases — identifies ${criticalPct.toFixed(1)}% of contracts as Critical and ${highPct.toFixed(1)}% as High risk. That's over 270,000 contracts worth investigating.`,
      icon: AlertTriangle,
      color: '#dc2626',
      stat: `${criticalPct.toFixed(1)}%`,
      statLabel: 'Critical risk contracts',
      visualType: 'default' as const,
    },
    {
      tag: 'The Cases',
      heading: 'From IMSS Ghost Companies to Odebrecht Bribes',
      body: "RUBLI's Case Library documents 43 corruption scandals — with the specific vendors, contracts, and procurement patterns that gave them away. These are the ground truth behind the risk model.",
      icon: BookOpen,
      color: '#8b5cf6',
      stat: '43',
      statLabel: 'Documented corruption cases',
      visualType: 'sectorRing' as const,
    },
    {
      tag: 'Your Turn',
      heading: 'Start Investigating',
      body: 'Search any vendor, institution, or contract. Follow the network. Flag anomalies. Build a dossier. RUBLI gives investigative journalists and anti-corruption researchers the tools to follow the money.',
      icon: Search,
      color: '#16a34a',
      stat: '3.1M',
      statLabel: 'Contracts searchable in seconds',
      visualType: 'default' as const,
    },
  ] as const

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

                  <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-lg">
                    {chapter.body}
                  </p>

                  {/* Hero stats: contracts, value, risk, cases — shown in chapter 1 */}
                  {chapter.visualType === 'heroStats' && (
                    <div className="mt-8">
                      <HeroStats
                        totalContracts={totalContracts}
                        totalValueMxn={totalValueMxn}
                        highRiskPct={criticalPct + highPct}
                        groundTruthCases={22}
                      />
                    </div>
                  )}

                  {/* CTA buttons on last chapter */}
                  {isLast && (
                    <div className="flex flex-wrap gap-3 mt-8">
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

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-white/20 border-t border-white/5">
        RUBLI — Mexican Government Procurement Analysis Platform · Data: COMPRANET 2002–2025
      </footer>
    </div>
  )
}
