import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, AlertTriangle, ExternalLink,
  Radar, BookOpen, Search, Bookmark, LineChart, CalendarDays,
} from 'lucide-react'
import { analysisApi, phiApi, contractApi } from '@/api/client'
import type { FastDashboardData, ContractListResponse, ContractListItem } from '@/api/types'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import ContractField from '@/components/ContractField'

// ---------------------------------------------------------------------------
// Design tokens — editorial palette per ART_DIRECTION.md §2
// ---------------------------------------------------------------------------

const CRIMSON = '#ef4444'   // critical / risk-red
const AMBER   = '#f59e0b'   // high / accent
const CYAN    = '#22d3ee'   // OECD reference
const ZINC    = '#a1a1aa'   // neutral data

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
// LangToggle — masthead language pill
// ---------------------------------------------------------------------------
function LangToggle() {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  return (
    <div
      className="flex items-center gap-0.5 rounded-sm p-0.5"
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {(['en', 'es'] as const).map((lang) => {
        const active = lang === 'en' ? isEn : !isEn
        return (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="px-2.5 py-1 rounded-sm text-[11px] font-mono font-semibold tracking-wider transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            style={{
              backgroundColor: active ? 'rgba(245,158,11,0.14)' : 'transparent',
              color: active ? AMBER : 'rgba(255,255,255,0.45)',
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
// DotMatrixStrip — the signature RUBLI visualization motif, used decoratively
// in the hero to reinforce "each dot = one contract" as the unit of truth.
// ---------------------------------------------------------------------------
function DotMatrixStrip({
  filled,
  total = 50,
  filledColor = CRIMSON,
  ariaLabel,
}: {
  filled: number
  total?: number
  filledColor?: string
  ariaLabel: string
}) {
  const R = 3
  const GAP = 8
  const width = total * GAP
  return (
    <svg
      width={width}
      height={R * 2 + 2}
      viewBox={`0 0 ${width} ${R * 2 + 2}`}
      role="img"
      aria-label={ariaLabel}
      className="block"
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled
        return (
          <motion.circle
            key={i}
            cx={i * GAP + R}
            cy={R + 1}
            r={R}
            fill={isFilled ? filledColor : '#27272a'}
            stroke={isFilled ? 'none' : '#3f3f46'}
            strokeWidth={isFilled ? 0 : 1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.008, duration: 0.25 }}
          />
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// RiskPill — colored badge for risk level (recent flags list)
// ---------------------------------------------------------------------------
function RiskPill({ level }: { level: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: 'rgba(239,68,68,0.12)',   color: CRIMSON,  label: 'CRITICAL' },
    high:     { bg: 'rgba(245,158,11,0.12)',  color: AMBER,    label: 'HIGH' },
    medium:   { bg: 'rgba(161,98,7,0.14)',    color: '#a16207',label: 'MEDIUM' },
    low:      { bg: 'rgba(113,113,122,0.12)', color: '#71717a',label: 'LOW' },
  }
  const key = (level || 'low').toLowerCase()
  const c = colors[key] ?? colors.low
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold tracking-wider"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// PillarCard — one of six feature highlights for v2.1. Icon + kicker + headline
// + body + mono stat + dot-matrix hairline + CTA. Designed like a miniature
// investigation card rather than a SaaS feature tile.
// ---------------------------------------------------------------------------
interface PillarCardProps {
  icon: React.ReactNode
  kicker: string
  headline: string
  body: string
  statValue: string
  statLabel: string
  accent: string
  dots: number   // 0..50 — a visual hairline that reinforces the stat
  cta: string
  onClick: () => void
}

function PillarCard({
  icon, kicker, headline, body, statValue, statLabel, accent, dots, cta, onClick,
}: PillarCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full h-full rounded-sm border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors p-6 flex flex-col gap-4 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
    >
      {/* Icon + kicker row */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border"
          style={{
            borderColor: `${accent}33`,
            backgroundColor: `${accent}14`,
            color: accent,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span
          className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: accent }}
        >
          {kicker}
        </span>
      </div>

      {/* Editorial headline */}
      <h3 className="text-[1.0625rem] sm:text-lg font-semibold text-zinc-100 leading-snug tracking-[-0.01em]">
        {headline}
      </h3>

      {/* Body copy */}
      <p className="text-sm leading-relaxed text-zinc-400 flex-1">
        {body}
      </p>

      {/* Dot-matrix hairline — reinforces "each dot = one unit" */}
      <div className="pt-1">
        <DotMatrixStrip
          filled={dots}
          total={50}
          filledColor={accent}
          ariaLabel={`${headline} — ${dots} of 50 dots filled`}
        />
      </div>

      {/* Stat + CTA row */}
      <div className="flex items-end justify-between gap-3 pt-3 border-t border-zinc-800">
        <div className="min-w-0">
          <div
            className="text-2xl font-black font-mono tabular-nums leading-none"
            style={{ color: accent }}
          >
            {statValue}
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500 mt-1.5 truncate max-w-[22ch]">
            {statLabel}
          </p>
        </div>
        <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 inline-flex items-center gap-1 pb-1 flex-shrink-0">
          {cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// CriticalTicker — scrolling marquee of recent critical-risk contracts
// ---------------------------------------------------------------------------
function CriticalTicker({ contracts, onSelect }: {
  contracts: ContractListItem[]
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation('landing')
  if (contracts.length === 0) return null
  const doubled = [...contracts, ...contracts]
  return (
    <div
      className="relative overflow-hidden border-y border-red-900/40 bg-red-950/15"
      role="region"
      aria-label={t('ticker.ariaLabel')}
    >
      <div className="flex items-stretch">
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-red-950/40 border-r border-red-900/40">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-red-400 whitespace-nowrap">
            {t('ticker.label')}
          </span>
        </div>
        <div
          className="flex-1 overflow-hidden relative"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
        >
          <div className="flex items-center gap-8 py-2.5 animate-marquee whitespace-nowrap">
            {doubled.map((c, idx) => {
              const sectorColor = c.sector_name
                ? SECTOR_COLORS[c.sector_name.toLowerCase()] ?? '#64748b'
                : '#64748b'
              return (
                <button
                  key={`${c.id}-${idx}`}
                  onClick={() => onSelect(c.id)}
                  className="inline-flex items-center gap-2.5 flex-shrink-0 text-left focus:outline-none"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectorColor }}
                  />
                  <span className="text-xs font-mono font-bold text-red-300 tabular-nums">
                    {formatCompactMXN(c.amount_mxn)}
                  </span>
                  <span className="text-xs text-zinc-400 max-w-[32ch] truncate">
                    {c.vendor_name || t('recentFlags.unknownVendor')}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 capitalize">
                    {c.sector_name || '—'}
                  </span>
                  {c.contract_date && (
                    <span className="text-[10px] font-mono text-zinc-700">
                      {new Date(c.contract_date).toISOString().slice(0, 10)}
                    </span>
                  )}
                  <span className="text-zinc-700 select-none">·</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
          will-change: transform;
        }
        .animate-marquee:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee { animation: none; }
        }
      `}</style>
    </div>
  )
}

// ===========================================================================
// Main Intro page — RUBLI v2.1
// ===========================================================================

export default function Intro() {
  const { t, i18n } = useTranslation('landing')
  const navigate = useNavigate()

  // Defer below-fold queries until hero has painted
  const [belowFoldEnabled, setBelowFoldEnabled] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldEnabled(true), 500)
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
    enabled: belowFoldEnabled,
  })

  const { data: recentCriticalData } = useQuery<ContractListResponse>({
    queryKey: ['contracts', 'recent-critical', 'intro-ticker'],
    queryFn: () => contractApi.getAll({
      risk_level: 'critical',
      per_page: 12,
      sort_by: 'contract_date',
      sort_order: 'desc',
    }),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    enabled: belowFoldEnabled,
  })

  const goToApp = useCallback(
    (path = '/aria') => {
      localStorage.setItem('rubli_seen_intro', '1')
      navigate(path)
    },
    [navigate],
  )

  // ---- Derived data ----
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_051_294
  const totalValueMxn = overview?.total_value_mxn ?? 9_900_000_000_000
  const highRiskPct = overview?.high_risk_pct ?? 13.49
  const phiSectors: PHISector[] = phiSectorsData?.sectors ?? []
  const recentCritical: ContractListItem[] = recentCriticalData?.data ?? []

  const worstSector = phiSectors
    .slice()
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]

  // Edition stamp — today in locale
  const editionDate = useMemo(() => {
    const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-MX'
    const d = new Date()
    return d.toLocaleDateString(locale, {
      month: 'long', day: 'numeric', year: 'numeric',
    }).toUpperCase()
  }, [i18n.language])

  const highRiskValue = totalValueMxn * (highRiskPct / 100)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* =====================================================================
          TOP BAR — masthead + edition date + language toggle
          ===================================================================== */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-bold tracking-wider">RUBLI</span>
              <span
                className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold tracking-widest"
                style={{ backgroundColor: 'rgba(245,158,11,0.14)', color: AMBER }}
              >
                v2.1
              </span>
            </div>
            <span className="hidden sm:inline-block h-3 w-px bg-zinc-700" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.18em] hidden sm:inline">
              {t('revelation.masthead')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-[10px] font-mono text-zinc-600 uppercase tracking-[0.18em]">
              {t('revelation.edition', { date: editionDate })}
            </span>
            <button
              onClick={() => goToApp('/login')}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors hidden md:inline-flex items-center gap-1"
            >
              {t('v21.signIn')}
            </button>
            <button
              onClick={() => goToApp('/dashboard')}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              {t('skip_to_app')}
              <ArrowRight className="h-3 w-3" />
            </button>
            <LangToggle />
          </div>
        </div>
      </header>

      <main>
        {/* =====================================================================
            SECTION 1 — REVELATION HERO
            The numbers are the story. Tri-line declarative lede, particle field,
            four-stat strip. Risk stat front-and-center.
            ===================================================================== */}
        <section className="relative overflow-hidden border-b border-zinc-900">
          <ContractField
            className="absolute inset-0 h-full w-full"
            ariaLabel="Animated field of 800 procurement contracts — most drift as low-risk grey, while 13.49% self-organize into amber and red clusters representing high-risk vendor networks"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 18% 50%, rgba(9,9,11,0.94) 0%, rgba(9,9,11,0.82) 32%, rgba(9,9,11,0.40) 62%, rgba(9,9,11,0) 88%)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 pt-14 pb-12 sm:pt-28 sm:pb-20"
          >
            {/* Kicker */}
            <div className="mb-6">
              <span className="text-kicker text-kicker--investigation inline-flex items-center gap-2">
                <span className="h-px w-6 bg-amber-500/80 inline-block" />
                {t('revelation.ledeLabel')}
              </span>
            </div>

            {/* Tri-line declarative lede — Playfair Display via text-editorial-display */}
            <h1
              className="text-editorial-display text-zinc-50 mb-6 font-serif font-extrabold"
              style={{ textWrap: 'balance' as const }}
            >
              <span className="block" style={{ color: CRIMSON }}>{t('revelation.ledePrimary')}</span>
              <span className="block text-zinc-100">{t('revelation.ledeSecondary')}</span>
              <span className="block text-zinc-400 italic">{t('revelation.ledeTertiary')}</span>
            </h1>

            {/* Deck */}
            <p className="text-deck text-zinc-400 max-w-3xl mb-10">
              {t('revelation.ledeBody')}
            </p>

            {/* CTAs — primary goes to ARIA, secondary to methodology */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-12 sm:mb-14">
              <button
                onClick={() => goToApp('/aria')}
                className="inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 sm:py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
              >
                {t('revelation.ctaInvestigate')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToApp('/methodology')}
                className="inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 sm:py-2.5 text-sm font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-zinc-50 transition-colors"
              >
                {t('revelation.ctaMethodology')}
              </button>
            </div>

            {/* Four-figure strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 pt-8 border-t border-[rgba(255,255,255,0.08)] sm:gap-x-0 sm:divide-x sm:divide-[rgba(255,255,255,0.08)]">
              <div className="sm:px-5 sm:first:pl-0 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">{t('hero.statContracts')}</div>
                <div className="text-display-num text-zinc-50 font-mono">
                  {formatNumber(totalContracts)}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">
                  {t('hero.statValue')} &middot; 2002&ndash;2025
                </div>
                <div className="text-display-num text-zinc-50 font-mono">
                  {formatCompactMXN(totalValueMxn)}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-kicker--investigation">
                  {t('hero.statHighRisk')}
                </div>
                <div className="text-display-num font-mono" style={{ color: CRIMSON }}>
                  {highRiskPct.toFixed(2)}%
                </div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.12em]">
                  {t('hero.statHighRiskContext')}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">
                  {t('stories.story2.statLabel')}
                </div>
                <div className="text-display-num text-zinc-50 font-mono">
                  {formatCompactMXN(highRiskValue)}
                </div>
              </div>
            </div>

            <p className="text-byline text-zinc-600 mt-10">
              {t('hero.credibility')}
            </p>
          </motion.div>
        </section>

        {/* =====================================================================
            SECTION 2 — LIVE CRITICAL TICKER
            ===================================================================== */}
        <CriticalTicker
          contracts={recentCritical}
          onSelect={(id) => goToApp(`/contracts/${id}`)}
        />

        {/* =====================================================================
            SECTION 3 — WHAT'S NEW IN v2.1
            Editorial callout — a single paragraph framed as a newsroom note.
            Keeps the changelog honest: what was added, no marketing fluff.
            ===================================================================== */}
        <section className="border-b border-zinc-900 bg-zinc-950">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 sm:py-16">
            <div className="rounded-sm border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.04] to-zinc-950 p-7 sm:p-9 flex flex-col md:flex-row gap-6 md:gap-10 md:items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
                        style={{ backgroundColor: 'rgba(245,158,11,0.16)', color: AMBER }}>
                    {t('v21.badge')}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.15em]">
                  {t('v21.kicker')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[1.25rem] sm:text-[1.5rem] font-serif font-bold text-zinc-100 leading-tight tracking-[-0.01em] mb-3">
                  {t('v21.headline')}
                </h2>
                <p className="text-sm sm:text-[0.9375rem] text-zinc-400 leading-relaxed mb-4 max-w-3xl">
                  {t('v21.body')}
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-zinc-800/60">
                  {[
                    { k: 'v21.item1', n: '10' },
                    { k: 'v21.item2', n: '320' },
                    { k: 'v21.item3', n: '2,563' },
                    { k: 'v21.item4', n: '748' },
                  ].map((item) => (
                    <div key={item.k} className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-mono font-bold tabular-nums text-amber-400">
                        {item.n}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.08em]">
                        {t(item.k)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 4 — THE SIX PILLARS (feature highlights)
            Each card introduces one v2.1 entry point. Dot-matrix hairline
            reinforces "each dot = one unit" as the platform's unit of truth.
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div className="max-w-3xl">
                <p className="stat-label text-amber-500 mb-2 inline-flex items-center gap-2">
                  <span className="h-px w-5 bg-amber-500 inline-block" />
                  {t('pillars.kicker')}
                </p>
                <h2 className="text-[1.5rem] sm:text-[2rem] leading-[1.1] font-serif font-bold text-zinc-100 tracking-[-0.015em]">
                  {t('pillars.headline')}
                </h2>
                <p className="text-base text-zinc-400 mt-3 leading-relaxed italic max-w-2xl">
                  {t('pillars.sub')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PillarCard
                icon={<Radar className="h-4 w-4" />}
                kicker={t('pillars.aria.kicker')}
                headline={t('pillars.aria.headline')}
                body={t('pillars.aria.body')}
                statValue="320"
                statLabel={t('pillars.aria.statLabel')}
                accent={CRIMSON}
                dots={42}
                cta={t('pillars.aria.cta')}
                onClick={() => goToApp('/aria')}
              />
              <PillarCard
                icon={<BookOpen className="h-4 w-4" />}
                kicker={t('pillars.stories.kicker')}
                headline={t('pillars.stories.headline')}
                body={t('pillars.stories.body')}
                statValue="10"
                statLabel={t('pillars.stories.statLabel')}
                accent={AMBER}
                dots={26}
                cta={t('pillars.stories.cta')}
                onClick={() => goToApp('/journalists')}
              />
              <PillarCard
                icon={<Search className="h-4 w-4" />}
                kicker={t('pillars.vendors.kicker')}
                headline={t('pillars.vendors.headline')}
                body={t('pillars.vendors.body')}
                statValue="320K"
                statLabel={t('pillars.vendors.statLabel')}
                accent={CYAN}
                dots={35}
                cta={t('pillars.vendors.cta')}
                onClick={() => goToApp('/aria')}
              />
              <PillarCard
                icon={<LineChart className="h-4 w-4" />}
                kicker={t('pillars.model.kicker')}
                headline={t('pillars.model.headline')}
                body={t('pillars.model.body')}
                statValue="0.828"
                statLabel={t('pillars.model.statLabel')}
                accent={CRIMSON}
                dots={7}
                cta={t('pillars.model.cta')}
                onClick={() => goToApp('/methodology')}
              />
              <PillarCard
                icon={<Bookmark className="h-4 w-4" />}
                kicker={t('pillars.workspace.kicker')}
                headline={t('pillars.workspace.headline')}
                body={t('pillars.workspace.body')}
                statValue={t('pillars.workspace.statValue')}
                statLabel={t('pillars.workspace.statLabel')}
                accent={AMBER}
                dots={18}
                cta={t('pillars.workspace.cta')}
                onClick={() => goToApp('/workspace')}
              />
              <PillarCard
                icon={<CalendarDays className="h-4 w-4" />}
                kicker={t('pillars.calendar.kicker')}
                headline={t('pillars.calendar.headline')}
                body={t('pillars.calendar.body')}
                statValue="Dec"
                statLabel={t('pillars.calendar.statLabel')}
                accent={ZINC}
                dots={12}
                cta={t('pillars.calendar.cta')}
                onClick={() => goToApp('/procurement-calendar')}
              />
            </div>

            {/* Worst sector — editorial callout below the grid, preserved */}
            {worstSector && (
              <div className="mt-8 rounded-sm border border-zinc-800 bg-zinc-900/30 p-5 flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="stat-label text-amber-500 mb-1">{t('stories.worstSector.label')}</p>
                  <p className="text-sm text-zinc-300">
                    <span className="capitalize font-semibold text-zinc-100">{worstSector.sector_name}</span>
                    {' '}{t('stories.worstSector.scores')}{' '}
                    <span className="font-mono font-bold" style={{ color: SECTOR_COLORS[worstSector.sector_name.toLowerCase()] ?? AMBER }}>
                      {worstSector.grade}
                    </span>
                    {' '}{t('stories.worstSector.on')}{' '}
                    {worstSector.reds} {t('stories.worstSector.subIndicators')} {worstSector.reds + worstSector.yellows + worstSector.greens} {t('stories.worstSector.evaluated')}
                  </p>
                </div>
                <button
                  onClick={() => goToApp('/report-card')}
                  className="flex-shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  {t('stories.worstSector.viewReport')}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================================
            SECTION 5 — WHO USES RUBLI
            Three audiences — unchanged from v2.0 but routes updated for v2.1.
            ===================================================================== */}
        <section className="border-b border-zinc-900 bg-zinc-950">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="mb-10 sm:mb-12">
              <span className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-amber-500/80">
                {t('audiences.kicker')}
              </span>
              <h2 className="text-[1.5rem] sm:text-[2rem] font-serif font-bold text-zinc-100 tracking-[-0.015em] mt-2 leading-[1.1]">
                {t('audiences.headline')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border border-zinc-800 rounded-sm overflow-hidden">
              {([
                {
                  kicker: t('audiences.journalists.kicker'),
                  headline: t('audiences.journalists.headline'),
                  body: t('audiences.journalists.body'),
                  cta: t('audiences.journalists.cta'),
                  href: '/journalists',
                  kickerColor: 'text-red-400',
                },
                {
                  kicker: t('audiences.researchers.kicker'),
                  headline: t('audiences.researchers.headline'),
                  body: t('audiences.researchers.body'),
                  cta: t('audiences.researchers.cta'),
                  href: '/methodology',
                  kickerColor: 'text-blue-400',
                },
                {
                  kicker: t('audiences.citizens.kicker'),
                  headline: t('audiences.citizens.headline'),
                  body: t('audiences.citizens.body'),
                  cta: t('audiences.citizens.cta'),
                  href: '/report-card',
                  kickerColor: 'text-amber-400',
                },
              ] as const).map((card, idx) => (
                <button
                  key={card.kicker}
                  onClick={() => goToApp(card.href)}
                  className={`text-left p-7 sm:p-8 flex flex-col gap-4 transition-colors hover:bg-zinc-900/40 focus:outline-none focus:bg-zinc-900/50 ${
                    idx < 2 ? 'border-b md:border-b-0 md:border-r border-zinc-800' : ''
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold tracking-[0.18em] uppercase ${card.kickerColor}`}>
                    {card.kicker}
                  </span>
                  <h3 className="text-[1.0625rem] sm:text-lg font-semibold text-zinc-100 leading-snug tracking-[-0.01em]">
                    {card.headline}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                    {card.body}
                  </p>
                  <span className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 self-start mt-1">
                    {card.cta}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 6 — LEAGUE TABLE TEASER
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="rounded-sm border border-zinc-800 bg-gradient-to-br from-zinc-900/70 to-zinc-950 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-amber-500 mb-2">
                  {t('scorecards.kicker')}
                </p>
                <h3 className="text-[1.375rem] sm:text-[1.625rem] leading-tight font-serif font-bold text-zinc-100 tracking-[-0.01em] mb-3">
                  {t('scorecards.headline')}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                  {t('scorecards.sub')}
                </p>
              </div>
              <button
                onClick={() => goToApp('/institution-league')}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
              >
                {t('scorecards.cta')}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 7 — RECENT CRITICAL ALERTS (table view)
            ===================================================================== */}
        {recentCritical.length > 0 && (
          <section className="border-b border-zinc-900">
            <div className="max-w-6xl mx-auto px-6 py-20">
              <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                  <p className="stat-label text-red-400 inline-flex items-center gap-2 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                    {t('recentFlags.label')}
                  </p>
                  <h2 className="text-[1.375rem] sm:text-[1.75rem] leading-tight font-serif font-bold text-zinc-100 tracking-[-0.01em]">
                    {t('recentFlags.headline')}
                  </h2>
                </div>
                <button
                  onClick={() => goToApp('/contracts?risk_level=critical')}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  {t('recentFlags.viewAll')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-sm border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
                {recentCritical.slice(0, 5).map((c) => {
                  const sectorColor = c.sector_name
                    ? SECTOR_COLORS[c.sector_name.toLowerCase()] ?? '#64748b'
                    : '#64748b'
                  return (
                    <button
                      key={c.id}
                      onClick={() => goToApp(`/contracts/${c.id}`)}
                      className="w-full text-left p-5 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors focus:outline-none focus:bg-zinc-900/70"
                    >
                      <div className="flex-shrink-0 w-20">
                        <RiskPill level={c.risk_level as string || 'critical'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate">
                          {c.vendor_name || t('recentFlags.unknownVendor')}
                        </p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {c.title || c.institution_name || '—'}
                        </p>
                      </div>
                      <div className="hidden md:flex flex-shrink-0 w-32 items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
                        <span className="text-xs text-zinc-400 capitalize truncate">
                          {c.sector_name || t('recentFlags.unknownSector')}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="stat-xs text-zinc-100 font-mono">{formatCompactMXN(c.amount_mxn)}</div>
                        {c.contract_date && (
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            {new Date(c.contract_date).toISOString().slice(0, 10)}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-[11px] font-mono text-zinc-600 leading-relaxed max-w-2xl">
                {t('hero.riskDisclaimer')}
              </p>
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 8 — FINAL CTA
            Two-button CTA on a clean editorial strip. Primary = investigate,
            secondary = methodology (since /limitations → /methodology).
            ===================================================================== */}
        <section className="border-b border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-900/40">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-20 text-center">
            <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-amber-500 mb-4">
              {t('finalCta.kicker')}
            </p>
            <h2 className="text-[1.75rem] sm:text-[2.25rem] leading-[1.05] font-serif font-extrabold text-zinc-50 tracking-[-0.02em] mb-5">
              {t('finalCta.headline')}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
              {t('finalCta.body')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => goToApp('/aria')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
              >
                {t('finalCta.primary')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToApp('/methodology')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-zinc-50 transition-colors"
              >
                {t('finalCta.secondary')}
              </button>
            </div>
            <p className="text-[11px] font-mono text-zinc-600 mt-8 tracking-[0.08em]">
              {t('finalCta.credibility')}
            </p>
          </div>
        </section>
      </main>

      {/* =====================================================================
          FOOTER
          ===================================================================== */}
      <footer className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-zinc-600 tracking-wide">
            {t('footer.platform')}
          </p>
          <p className="text-[11px] font-mono text-zinc-600 tracking-wide">
            {t('footer.data')}
          </p>
        </div>
      </footer>
    </div>
  )
}
