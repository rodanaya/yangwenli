import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, AlertTriangle, ExternalLink } from 'lucide-react'
import { analysisApi, phiApi, contractApi } from '@/api/client'
import type { FastDashboardData, ContractListResponse, ContractListItem } from '@/api/types'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const SERIF = 'var(--font-family-serif)'
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
// LangToggle — a small language switcher, preserved from the previous version
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
// StoryCard — one of the three editorial leads on the page
// ---------------------------------------------------------------------------
interface StoryCardProps {
  kicker: string
  headline: string
  body: string
  stat: string
  statLabel: string
  statColor: string
  linkLabel: string
  onClick: () => void
}

function StoryCard({
  kicker, headline, body, stat, statLabel, statColor, linkLabel, onClick,
}: StoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full h-full rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors p-6 flex flex-col gap-4 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
    >
      <p className="stat-label text-zinc-500">{kicker}</p>

      <h3 className="text-[1.5rem] leading-tight font-semibold text-zinc-100" style={{ fontFamily: SERIF }}>
        {headline}
      </h3>

      <p className="text-sm leading-relaxed text-zinc-400 flex-1">
        {body}
      </p>

      <div className="flex items-end justify-between pt-2 border-t border-zinc-800">
        <div>
          <div className="stat-lg" style={{ color: statColor }}>{stat}</div>
          <p className="stat-label text-zinc-500 mt-1">{statLabel}</p>
        </div>
        <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 inline-flex items-center gap-1 pb-1">
          {linkLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// RiskPill — colored badge for risk level
// ---------------------------------------------------------------------------
function RiskPill({ level }: { level: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: 'rgba(220,38,38,0.12)', color: '#f87171', label: 'CRITICAL' },
    high:     { bg: 'rgba(234,88,12,0.12)', color: '#fb923c', label: 'HIGH' },
    medium:   { bg: 'rgba(234,179,8,0.12)', color: '#facc15', label: 'MEDIUM' },
    low:      { bg: 'rgba(22,163,74,0.12)', color: '#4ade80', label: 'LOW' },
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

// ===========================================================================
// Main Intro page
// ===========================================================================

export default function Intro() {
  const { t } = useTranslation('landing')
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
    queryKey: ['contracts', 'recent-critical', 'intro'],
    queryFn: () => contractApi.getAll({
      risk_level: 'critical',
      per_page: 5,
      sort_by: 'contract_date',
      sort_order: 'desc',
    }),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    enabled: belowFoldEnabled,
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
  const totalValueMxn = overview?.total_value_mxn ?? 9_900_000_000_000
  const highRiskPct = overview?.high_risk_pct ?? 13.5
  const phiSectors: PHISector[] = phiSectorsData?.sectors ?? []
  const recentCritical: ContractListItem[] = recentCriticalData?.data ?? []

  // Top flagged sector (highest combined red+yellow share, sorted by score descending for worst)
  const worstSector = phiSectors
    .slice()
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* =====================================================================
          TOP BAR — brand + language toggle + skip link
          ===================================================================== */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm font-bold tracking-wider">RUBLI</span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.18em] hidden sm:inline">
              {t('hero.transparency')}
            </span>
          </div>
          <div className="flex items-center gap-4">
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
            SECTION 1 — EDITORIAL HERO
            One headline. One subhead. Two CTAs. Three stats inline below.
            No particle canvas. No scan lines. No GSAP. Just the story.
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-4xl mx-auto px-6 pt-20 pb-14 sm:pt-28 sm:pb-20"
          >
            {/* Kicker */}
            <p className="stat-label text-amber-500 mb-6 inline-flex items-center gap-2">
              <span className="h-1 w-4 bg-amber-500 inline-block" />
              {t('hero.transparency')}
            </p>

            {/* Editorial headline — serif, large but not screaming */}
            <h1
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] leading-[1.05] font-semibold text-zinc-50 mb-6 tracking-[-0.02em]"
              style={{ fontFamily: SERIF }}
            >
              3.1 millones de contratos.
              <br />
              <span className="text-zinc-400">¿Cuántos son irregulares?</span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-3xl mb-10">
              {t('hero.storySubtitle')}
            </p>

            {/* Two CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-14">
              <button
                onClick={() => goToApp('/dashboard')}
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
              >
                {t('hero.ctaInvestigate')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToApp('/methodology')}
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-zinc-50 transition-colors"
              >
                {t('hero.cta_secondary')}
              </button>
            </div>

            {/* Inline three-stat callout — stat-md, not stat-hero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-zinc-900">
              <div>
                <div className="stat-md text-zinc-50">
                  {formatNumber(totalContracts)}
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {t('hero.statContracts')}
                </p>
              </div>
              <div>
                <div className="stat-md text-zinc-50">
                  {formatCompactMXN(totalValueMxn)}
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {t('hero.statValue')} &middot; 2002&ndash;2025
                </p>
              </div>
              <div>
                <div className="stat-md" style={{ color: CRIMSON }}>
                  {highRiskPct.toFixed(1)}%
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {t('hero.statHighRisk')}
                  <span className="text-zinc-600"> &middot; {t('hero.statHighRiskContext')}</span>
                </p>
              </div>
            </div>

            {/* Credibility footer — tiny mono */}
            <p className="mt-10 text-[11px] font-mono text-zinc-600 tracking-wide">
              {t('hero.credibility')}
            </p>
          </motion.div>
        </section>

        {/* =====================================================================
            SECTION 2 — THREE STORY CARDS
            Each card is a lead on the investigation. Clicking drills in.
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="max-w-3xl mb-12">
              <p className="stat-label text-zinc-500 mb-3">{t('ctaPanels.ariaLabel')}</p>
              <h2
                className="text-[1.75rem] sm:text-[2.25rem] leading-tight font-semibold text-zinc-100 tracking-[-0.01em]"
                style={{ fontFamily: SERIF }}
              >
                {t('ctaPanels.headline')}
              </h2>
              <p className="text-base text-zinc-400 mt-3 leading-relaxed">
                {t('ctaPanels.sub')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StoryCard
                kicker="HALLAZGO 01"
                headline="81.9% de contratos se adjudican sin competencia."
                body="La adjudicación directa triplica el límite máximo recomendado por la OCDE (25%). El patrón es estructural: en 2023, 9 de cada 10 pesos gastados evitaron licitación pública."
                stat="81.9%"
                statLabel={t('sectorTeaser.label')}
                statColor="#f87171"
                linkLabel="Ver compras directas"
                onClick={() => goToApp('/procedure-type')}
              />

              <StoryCard
                kicker="HALLAZGO 02"
                headline="184K contratos con riesgo crítico."
                body="Nuestro modelo v0.6.5 (AUC 0.828) marca el 6% de contratos como críticos — patrones estadísticamente similares a 748 casos documentados de corrupción."
                stat={formatCompactMXN(totalValueMxn * (highRiskPct / 100))}
                statLabel={t('hero.statHighRisk')}
                statColor={CRIMSON}
                linkLabel="Explorar el riesgo"
                onClick={() => goToApp('/risk')}
              />

              <StoryCard
                kicker="HALLAZGO 03"
                headline="320 proveedores bajo investigación inmediata."
                body="ARIA — nuestro motor de inteligencia automática — prioriza los T1: proveedores con mayor concentración, menor diversidad institucional y señales múltiples de captura."
                stat="320"
                statLabel="Tier 1 · Investigación inmediata"
                statColor="#fb923c"
                linkLabel="Abrir cola ARIA"
                onClick={() => goToApp('/aria')}
              />
            </div>

            {/* Worst sector callout — optional, shown when data is loaded */}
            {worstSector && (
              <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="stat-label text-amber-500 mb-1">SECTOR MÁS VULNERABLE</p>
                  <p className="text-sm text-zinc-300">
                    <span className="capitalize font-semibold text-zinc-100">{worstSector.sector_name}</span>
                    {' '}obtiene calificación{' '}
                    <span className="font-mono font-bold" style={{ color: SECTOR_COLORS[worstSector.sector_name.toLowerCase()] ?? CRIMSON }}>
                      {worstSector.grade}
                    </span>
                    {' '}en salud procuratoria —{' '}
                    {worstSector.reds} sub-indicadores en rojo de {worstSector.reds + worstSector.yellows + worstSector.greens} evaluados.
                  </p>
                </div>
                <button
                  onClick={() => goToApp('/report-card')}
                  className="flex-shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  Ver reporte
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================================
            SECTION 3 — RECENT CRITICAL ALERTS
            Simple list. Most recent first. Every row is clickable.
            ===================================================================== */}
        <section className="border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="stat-label text-red-400 inline-flex items-center gap-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {t('recentFlags.label')}
                </p>
                <h2
                  className="text-[1.75rem] sm:text-[2.25rem] leading-tight font-semibold text-zinc-100 tracking-[-0.01em]"
                  style={{ fontFamily: SERIF }}
                >
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

            <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
              {recentCritical.length === 0 && belowFoldEnabled && (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Cargando datos recientes&hellip;
                </div>
              )}
              {!belowFoldEnabled && (
                <>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="p-5 flex items-center gap-4 animate-pulse">
                      <div className="h-4 w-16 bg-zinc-800 rounded" />
                      <div className="flex-1 h-4 bg-zinc-800 rounded" />
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                    </div>
                  ))}
                </>
              )}
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
                    {/* Risk pill */}
                    <div className="flex-shrink-0 w-20">
                      <RiskPill level={c.risk_level as string || 'critical'} />
                    </div>

                    {/* Vendor + title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">
                        {c.vendor_name || t('recentFlags.unknownVendor')}
                      </p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {c.title || c.institution_name || '—'}
                      </p>
                    </div>

                    {/* Sector */}
                    <div className="hidden md:flex flex-shrink-0 w-32 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sectorColor }}
                      />
                      <span className="text-xs text-zinc-400 capitalize truncate">
                        {c.sector_name || t('recentFlags.unknownSector')}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div className="stat-xs text-zinc-100">
                        {formatCompactMXN(c.amount_mxn)}
                      </div>
                      {c.contract_date && (
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {new Date(c.contract_date).toISOString().slice(0, 10)}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* Risk disclaimer — small mono */}
            <p className="mt-4 text-[11px] font-mono text-zinc-600 leading-relaxed max-w-2xl">
              {t('hero.riskDisclaimer')}
            </p>
          </div>
        </section>

        {/* =====================================================================
            SECTION 4 — FINAL CTA
            One sentence, one button. End of page.
            ===================================================================== */}
        <section>
          <div className="max-w-4xl mx-auto px-6 py-24 text-center">
            <h2
              className="text-[1.75rem] sm:text-[2.5rem] leading-tight font-semibold text-zinc-100 mb-4 tracking-[-0.01em]"
              style={{ fontFamily: SERIF }}
            >
              {t('cta.headline')}
            </h2>
            <p className="text-base text-zinc-400 leading-relaxed mb-8 max-w-2xl mx-auto">
              {t('cta.body')}
            </p>
            <button
              onClick={() => goToApp('/dashboard')}
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors"
            >
              {t('hero.ctaInvestigate')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      {/* =====================================================================
          FOOTER — minimal credit line
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
