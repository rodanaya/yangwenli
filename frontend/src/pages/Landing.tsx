import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BarChart3, Search, Shield, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import type { FastDashboardData, RiskDistribution } from '@/api/types'

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

  // IntersectionObserver for scroll-reveal — no scrollama needed for this pattern
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

  const goToApp = (path: string = '/dashboard') => {
    localStorage.setItem('rubli_seen_landing', '1')
    navigate(path)
  }

  // Derive live stats from API; fall back to known values from CLAUDE.md
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_110_007
  const totalValueMxn = overview?.total_value_mxn ?? 6_800_000_000_000

  // risk_distribution is RiskDistribution[] — find critical and high percentages
  const riskDist: RiskDistribution[] = fastDashboard?.risk_distribution ?? []
  const criticalPct = riskDist.find((r) => r.risk_level === 'critical')?.percentage ?? 5.8
  const highPct = riskDist.find((r) => r.risk_level === 'high')?.percentage ?? 2.2

  const CHAPTERS = [
    {
      tag: 'The Scale',
      heading: `${formatCompactMXN(totalValueMxn)} in Government Contracts`,
      body: `Between 2002 and 2025, Mexico's federal government awarded over ${(totalContracts / 1_000_000).toFixed(1)} million contracts. RUBLI tracks every peso — from emergency health procurement to major infrastructure works.`,
      icon: BarChart3,
      color: '#3b82f6',
      stat: formatCompactMXN(totalValueMxn),
      statLabel: 'Total procurement value (2002–2025)',
    },
    {
      tag: 'The Patterns',
      heading: 'Billions Spent in December Rushes',
      body: 'Year-end budget dumps, direct awards without competition, and suspiciously short publication periods are systemic — not exceptions. The data reveals these patterns across every administration since 2002.',
      icon: TrendingUp,
      color: '#eab308',
      stat: '78%',
      statLabel: 'of contracts awarded directly (no competition)',
    },
    {
      tag: 'The Risk',
      heading: `${(criticalPct + highPct).toFixed(1)}% of Contracts Flagged High-Risk`,
      body: `RUBLI's AI model — trained on 15 documented corruption scandals — identifies ${criticalPct.toFixed(1)}% of contracts as Critical and ${highPct.toFixed(1)}% as High risk. That's over 270,000 contracts worth investigating.`,
      icon: AlertTriangle,
      color: '#dc2626',
      stat: `${criticalPct.toFixed(1)}%`,
      statLabel: 'Critical risk contracts',
    },
    {
      tag: 'The Cases',
      heading: 'From IMSS Ghost Companies to Odebrecht Bribes',
      body: "RUBLI's Case Library documents 43 corruption scandals — with the specific vendors, contracts, and procurement patterns that gave them away. These are the ground truth behind the risk model.",
      icon: BookOpen,
      color: '#8b5cf6',
      stat: '43',
      statLabel: 'Documented corruption cases',
    },
    {
      tag: 'Your Turn',
      heading: 'Start Investigating',
      body: 'Search any vendor, institution, or contract. Follow the network. Flag anomalies. Build a dossier. RUBLI gives investigative journalists and anti-corruption researchers the tools to follow the money.',
      icon: Search,
      color: '#16a34a',
      stat: '3.1M',
      statLabel: 'Contracts searchable in seconds',
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
              <div
                className="transition-all duration-700"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
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

              {/* Visual block */}
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
                <div
                  className="relative flex flex-col items-center justify-center rounded-2xl p-10 sm:p-14"
                  style={{
                    backgroundColor: `${chapter.color}10`,
                    border: `1px solid ${chapter.color}20`,
                    minWidth: 260,
                    minHeight: 260,
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
              </div>
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
