import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, AlertTriangle, ExternalLink } from 'lucide-react'
import { analysisApi, phiApi, contractApi } from '@/api/client'
import type { FastDashboardData, ContractListResponse, ContractListItem } from '@/api/types'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import ContractField from '@/components/ContractField'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const CRIMSON = '#d4922a'

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
// LangToggle — small language switcher, preserved from the previous version
// ---------------------------------------------------------------------------
function LangToggle() {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent' }}
    >
      {(['en', 'es'] as const).map((lang) => {
        const active = lang === 'en' ? isEn : !isEn
        return (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            style={{
              backgroundColor: active ? 'rgba(212,146,42,0.18)' : 'transparent',
              color: active ? CRIMSON : 'rgba(255,255,255,0.45)',
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
// RiskPill — colored badge for risk level
// ---------------------------------------------------------------------------
function RiskPill({ level }: { level: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'CRITICAL' },
    high:     { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'HIGH' },
    medium:   { bg: 'rgba(161,98,7,0.12)',   color: '#a16207', label: 'MEDIUM' },
    // Low risk uses zinc (neutral) — green implies safety, forbidden on a corruption platform
    low:      { bg: 'rgba(113,113,122,0.12)', color: '#71717a', label: 'LOW' },
  }
  const key = (level || 'low').toLowerCase()
  const c = colors[key] ?? colors.low
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// InvestigationTeaser — newspaper-style investigation teaser card.
// Large ordinal, kicker, editorial headline, body, stat, CTA.
// ---------------------------------------------------------------------------
interface InvestigationTeaserProps {
  number: string
  kicker: string
  headline: string
  body: string
  statValue: string
  statLabel: string
  statColor: string
  cta: string
  onClick: () => void
  accent?: 'crimson' | 'amber' | 'neutral'
}

function InvestigationTeaser({
  number, kicker, headline, body, statValue, statLabel, statColor, cta, onClick,
  accent = 'amber',
}: InvestigationTeaserProps) {
  const accentRule = accent === 'crimson' ? '#dc2626' : accent === 'amber' ? '#f59e0b' : '#71717a'
  return (
    <button
      onClick={onClick}
      className="group text-left w-full h-full rounded-sm border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors p-7 flex flex-col gap-5 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
    >
      {/* Ordinal + kicker */}
      <div className="flex items-center gap-3">
        <span
          className="text-2xl font-black font-mono tabular-nums leading-none"
          style={{ color: accentRule }}
          aria-hidden="true"
        >
          {number}
        </span>
        <span className="h-px flex-1" style={{ background: accentRule, opacity: 0.5 }} />
        <span
          className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase"
          style={{ color: accentRule }}
        >
          {kicker}
        </span>
      </div>

      {/* Editorial headline — serif-esque, bold */}
      <h3 className="text-[1.25rem] leading-[1.2] font-semibold text-zinc-100 tracking-[-0.01em]">
        {headline}
      </h3>

      {/* Body — italic-ish deck feel */}
      <p className="text-sm leading-relaxed text-zinc-400 flex-1">
        {body}
      </p>

      {/* Stat + CTA row */}
      <div className="flex items-end justify-between gap-3 pt-4 border-t border-zinc-800">
        <div>
          <div
            className="text-3xl font-black font-mono tabular-nums leading-none"
            style={{ color: statColor }}
          >
            {statValue}
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 mt-1.5 max-w-[16ch]">
            {statLabel}
          </p>
        </div>
        <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 inline-flex items-center gap-1 pb-1">
          {cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// CriticalTicker — scrolling marquee of recent critical-risk contracts.
// Pauses on hover. Gracefully hides when no data.
// ---------------------------------------------------------------------------
function CriticalTicker({ contracts, onSelect }: {
  contracts: ContractListItem[]
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation('landing')
  if (contracts.length === 0) return null
  // Duplicate to achieve a seamless infinite marquee loop.
  const doubled = [...contracts, ...contracts]
  return (
    <div
      className="relative overflow-hidden border-y border-red-900/40 bg-red-950/15"
      role="region"
      aria-label={t('ticker.ariaLabel')}
    >
      <div className="flex items-stretch">
        {/* Fixed label column */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-red-950/40 border-r border-red-900/40">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-red-400 whitespace-nowrap">
            {t('ticker.label')}
          </span>
        </div>

        {/* Scrolling strip */}
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
      {/* Embedded keyframes — no CSS file edit needed. */}
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
// Main Intro page
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

  // Ticker data — 12 recent critical contracts for a longer marquee loop
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
  const highRiskPct = overview?.high_risk_pct ?? 13.5
  const phiSectors: PHISector[] = phiSectorsData?.sectors ?? []
  const recentCritical: ContractListItem[] = recentCriticalData?.data ?? []

  // Most vulnerable sector (lowest PHI score)
  const worstSector = phiSectors
    .slice()
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]

  // Editorial edition stamp — today's date in the correct locale, uppercase
  const editionDate = useMemo(() => {
    const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-MX'
    const d = new Date()
    return d.toLocaleDateString(locale, {
      month: 'long', day: 'numeric', year: 'numeric',
    }).toUpperCase()
  }, [i18n.language])

  // Value-weighted high-risk spend — for a secondary stat in hero strip
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
            The numbers are the story. One tri-line declarative lede, one deck,
            two CTAs. The particle field stays because it IS the data.
            ===================================================================== */}
        <section className="relative overflow-hidden border-b border-zinc-900">
          <ContractField
            className="absolute inset-0 h-full w-full"
            ariaLabel="Animated field of 800 procurement contracts — most drift as low-risk grey, while 13.5% self-organize into amber and red clusters representing high-risk vendor networks"
          />
          {/* Left-side radial veil */}
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

            {/* The revelation lede — tri-line declarative. */}
            <h1 className="text-editorial-display text-zinc-50 mb-6" style={{ textWrap: 'balance' as const }}>
              <span className="block" style={{ color: CRIMSON }}>{t('revelation.ledePrimary')}</span>
              <span className="block text-zinc-100">{t('revelation.ledeSecondary')}</span>
              <span className="block text-zinc-400 italic">{t('revelation.ledeTertiary')}</span>
            </h1>

            {/* Deck */}
            <p className="text-deck text-zinc-400 max-w-3xl mb-10">
              {t('revelation.ledeBody')}
            </p>

            {/* CTAs — primary goes to ARIA, not dashboard */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-12 sm:mb-14">
              <button
                onClick={() => goToApp('/aria')}
                className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 sm:py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
              >
                {t('revelation.ctaInvestigate')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToApp('/methodology')}
                className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 sm:py-2.5 text-sm font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-zinc-50 transition-colors"
              >
                {t('revelation.ctaMethodology')}
              </button>
            </div>

            {/* Four-figure strip — revelations, not stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 pt-8 border-t border-[rgba(255,255,255,0.08)] sm:gap-x-0 sm:divide-x sm:divide-[rgba(255,255,255,0.08)]">
              <div className="sm:px-5 sm:first:pl-0 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">{t('hero.statContracts')}</div>
                <div className="text-display-num text-zinc-50">
                  {formatNumber(totalContracts)}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">
                  {t('hero.statValue')} &middot; 2002&ndash;2025
                </div>
                <div className="text-display-num text-zinc-50">
                  {formatCompactMXN(totalValueMxn)}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-kicker--investigation">
                  {t('hero.statHighRisk')}
                </div>
                <div className="text-display-num" style={{ color: CRIMSON }}>
                  {highRiskPct.toFixed(1)}%
                </div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.12em]">
                  {t('hero.statHighRiskContext')}
                </div>
              </div>
              <div className="sm:px-5 space-y-1 min-w-0">
                <div className="text-kicker text-zinc-500">
                  {t('stories.story2.statLabel')}
                </div>
                <div className="text-display-num text-zinc-50">
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
            Scrolling strip of the most recent critical-risk contracts.
            Only rendered when data exists. Invisible offline.
            ===================================================================== */}
        <CriticalTicker
          contracts={recentCritical}
          onSelect={(id) => goToApp(`/contracts/${id}`)}
        />

        {/* =====================================================================
            SECTION 3 — THREE INVESTIGATIONS
            Each one is a specific entry point into documented evidence.
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div className="max-w-3xl">
                <p className="stat-label text-amber-500 mb-2 inline-flex items-center gap-2">
                  <span className="h-px w-5 bg-amber-500 inline-block" />
                  {t('investigations.kicker')}
                </p>
                <h2
                  className="text-[1.5rem] sm:text-[2rem] leading-[1.1] font-semibold text-zinc-100 tracking-[-0.015em]"
                >
                  {t('investigations.headline')}
                </h2>
                <p className="text-base text-zinc-400 mt-3 leading-relaxed italic">
                  {t('investigations.sub')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InvestigationTeaser
                number={t('investigations.one.number')}
                kicker={t('investigations.one.kicker')}
                headline={t('investigations.one.headline')}
                body={t('investigations.one.body')}
                statValue={t('investigations.one.statValue')}
                statLabel={t('investigations.one.statLabel')}
                statColor={CRIMSON}
                cta={t('investigations.one.cta')}
                onClick={() => goToApp('/aria')}
                accent="crimson"
              />
              <InvestigationTeaser
                number={t('investigations.two.number')}
                kicker={t('investigations.two.kicker')}
                headline={t('investigations.two.headline')}
                body={t('investigations.two.body')}
                statValue={t('investigations.two.statValue')}
                statLabel={t('investigations.two.statLabel')}
                statColor="#f59e0b"
                cta={t('investigations.two.cta')}
                onClick={() => goToApp('/price')}
                accent="amber"
              />
              <InvestigationTeaser
                number={t('investigations.three.number')}
                kicker={t('investigations.three.kicker')}
                headline={t('investigations.three.headline')}
                body={t('investigations.three.body')}
                statValue={t('investigations.three.statValue')}
                statLabel={t('investigations.three.statLabel')}
                statColor="#22d3ee"
                cta={t('investigations.three.cta')}
                onClick={() => goToApp('/procedure-type')}
                accent="neutral"
              />
            </div>

            {/* Worst sector callout — preserved */}
            {worstSector && (
              <div className="mt-8 rounded-sm border border-zinc-800 bg-zinc-900/30 p-5 flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="stat-label text-amber-500 mb-1">{t('stories.worstSector.label')}</p>
                  <p className="text-sm text-zinc-300">
                    <span className="capitalize font-semibold text-zinc-100">{worstSector.sector_name}</span>
                    {' '}{t('stories.worstSector.scores')}{' '}
                    <span className="font-mono font-bold" style={{ color: SECTOR_COLORS[worstSector.sector_name.toLowerCase()] ?? CRIMSON }}>
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
            SECTION 4 — WHO USES RUBLI
            3-audience value proposition: journalists / researchers / citizens
            Unified editorial grid — one bordered frame, hairline dividers.
            ===================================================================== */}
        <section className="border-b border-zinc-900 bg-zinc-950">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="mb-10 sm:mb-12">
              <span className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-amber-500/80">
                {t('audiences.kicker')}
              </span>
              <h2 className="text-[1.5rem] sm:text-[2rem] font-semibold text-zinc-100 tracking-[-0.015em] mt-2 leading-[1.1]">
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
                  href: '/aria',
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
                  kickerColor: 'text-green-400',
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
            SECTION 5 — THE LEAGUE TABLE TEASER
            Bridges to InstitutionLeague
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="rounded-sm border border-zinc-800 bg-gradient-to-br from-zinc-900/70 to-zinc-950 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-amber-500 mb-2">
                  {t('scorecards.kicker')}
                </p>
                <h3 className="text-[1.375rem] sm:text-[1.625rem] leading-tight font-semibold text-zinc-100 tracking-[-0.01em] mb-3">
                  {t('scorecards.headline')}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                  {t('scorecards.sub')}
                </p>
              </div>
              <button
                onClick={() => goToApp('/institution-league')}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
              >
                {t('scorecards.cta')}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 5 — RECENT CRITICAL ALERTS (preserved table view)
            Rendered only when data is available.
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
                  <h2 className="text-[1.375rem] sm:text-[1.75rem] leading-tight font-semibold text-zinc-100 tracking-[-0.01em]">
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
                        <div className="stat-xs text-zinc-100">{formatCompactMXN(c.amount_mxn)}</div>
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
