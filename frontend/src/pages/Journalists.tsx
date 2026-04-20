import { useQuery } from '@tanstack/react-query'
import { ariaApi } from '@/api/client'
import { useNavigate, Link } from 'react-router-dom'
import type { AriaQueueItem } from '@/api/types'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Clock, BookOpen, Download, AlertTriangle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { staggerContainer, slideUp, staggerItem, fadeIn } from '@/lib/animations'
import { ScrollReveal, AnimatedNumber } from '@/hooks/useAnimations'
import { STORIES } from '@/lib/story-content'
import type { StoryDef, StoryStatus } from '@/lib/story-content'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

/** Map story status to visual treatment */
const STATUS_CONFIG: Record<StoryStatus, { label: string; color: string; bg: string; border: string }> = {
  solo_datos: { label: 'DATA LEAD', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  reporteado: { label: 'REPORTED', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  auditado: { label: 'AUDITED', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  procesado: { label: 'PROSECUTED', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
}

/** Topic categories for filtering — editorial, not technical */
interface TopicFilter {
  id: string
  label: string
  match: (s: StoryDef) => boolean
  accent?: string
}

const TOPIC_FILTERS: TopicFilter[] = [
  { id: 'all', label: 'All Investigations', match: () => true },
  { id: 'direct-awards', label: 'Direct Awards', match: (s) => ['la-cuarta-adjudicacion', 'la-austeridad-que-no-fue', 'el-ano-sin-excusas', 'sexenio-a-sexenio', 'cero-competencia'].includes(s.slug), accent: '#dc2626' },
  { id: 'ghost-companies', label: 'Ghost Companies', match: (s) => ['los-nuevos-ricos-de-la-4t', 'red-fantasma', 'pandemia-sin-supervision'].includes(s.slug), accent: '#ea580c' },
  { id: 'health', label: 'Health', match: (s) => ['el-granero-vacio', 'hemoser-el-2-de-agosto', 'triangulo-farmaceutico', 'cartel-del-corazon', 'insabi-el-experimento'].includes(s.slug), accent: '#dc2626' },
  { id: 'infrastructure', label: 'Infrastructure', match: (s) => ['infraestructura-sin-competencia', 'la-casa-de-los-contratos', 'tren-maya-sin-reglas'].includes(s.slug), accent: '#ea580c' },
  { id: 'energy', label: 'Energy', match: (s) => ['pemex-el-gigante', 'oceanografia', 'fabrica-de-monopolios'].includes(s.slug), accent: '#eab308' },
  { id: 'amlo', label: '4T Era', match: (s) => s.era === 'amlo', accent: '#8b5cf6' },
  { id: 'cases', label: 'Case Studies', match: (s) => s.type === 'case' },
]

function getExcerpt(story: StoryDef): string {
  // Pull the first 1-2 sentences from the first chapter's prose
  const firstChapter = story.chapters[0]
  if (!firstChapter?.prose?.length) return story.subheadline
  const firstPara = firstChapter.prose[0]
  // Take first two sentences
  const sentences = firstPara.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return firstPara.slice(0, 200)
  return sentences.slice(0, 2).join('').trim()
}

// ---------------------------------------------------------------------------
// Breaking Investigations — ARIA T1 compact strip
// ---------------------------------------------------------------------------

function getInvestigationSentence(item: AriaQueueItem): string {
  const daRate = item.direct_award_rate
  const riskNorm = item.risk_score_norm ?? item.avg_risk_score ?? 0
  const score = Math.round(riskNorm * 100)

  if (item.is_efos_definitivo || item.is_sfp_sanctioned) {
    return 'On government sanctions registry'
  }
  if (daRate !== undefined && daRate > 0.8) {
    return `${Math.round(daRate * 100)}% contracts without bidding`
  }
  if (riskNorm > 0.8) {
    return 'Extreme risk — top 5% of all vendors'
  }
  return `Risk score ${score} — flagged for investigation`
}

function BreakingStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['aria', 'breaking-feed'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 4 }),
    staleTime: 5 * 60 * 1000,
  })

  if (isError || isLoading) return null
  const items = data?.data ?? []
  if (items.length === 0) return null

  return (
    <section aria-label="Active investigations" className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Live Investigation Leads
        </div>
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
          ARIA T1
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const riskNorm = item.risk_score_norm ?? item.avg_risk_score ?? 0
          const pct = Math.min(100, Math.round(riskNorm * 100))
          const color = riskNorm >= 0.6 ? '#dc2626' : riskNorm >= 0.4 ? '#ea580c' : '#eab308'
          const name = item.vendor_name.length > 35 ? item.vendor_name.slice(0, 35) + '...' : item.vendor_name

          return (
            <Link
              key={item.vendor_id}
              to={`/thread/${item.vendor_id}`}
              className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition-colors"
            >
              <p className="text-xs font-semibold text-zinc-200 leading-snug mb-1 group-hover:text-white transition-colors" title={item.vendor_name}>
                {name}
              </p>
              <p className="text-[11px] text-zinc-500 leading-snug mb-2">
                {getInvestigationSentence(item)}
              </p>
              <div className="flex items-center gap-2">
                {(() => {
                  const N = 18, DR = 2, DG = 5
                  const filled = Math.max(1, Math.round((pct / 100) * N))
                  return (
                    <svg viewBox={`0 0 ${N * DG} 5`} className="flex-1" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                      {Array.from({ length: N }).map((_, k) => (
                        <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                          fill={k < filled ? color : '#2d2926'}
                          fillOpacity={k < filled ? 0.85 : 1}
                        />
                      ))}
                    </svg>
                  )
                })()}
                <span className="text-[10px] font-mono tabular-nums" style={{ color }}>{pct}%</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Featured Story — hero card
// ---------------------------------------------------------------------------

function FeaturedStory({ story }: { story: StoryDef }) {
  const navigate = useNavigate()
  const { t } = useTranslation('journalists')

  return (
    <motion.button
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/stories/${story.slug}`)}
      className={cn(
        'relative w-full rounded-sm border border-zinc-800 bg-zinc-900',
        'p-8 sm:p-10 lg:p-12 text-left overflow-hidden group cursor-pointer',
        'transition-colors hover:border-zinc-700'
      )}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.03] blur-3xl pointer-events-none"
        style={{ background: story.leadStat.color.includes('red') ? '#dc2626' : '#ea580c' }}
      />

      <div className="relative z-10">
        {/* Overline */}
        <div className="flex items-center gap-3 mb-5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
            RUBLI Investigations
          </p>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-red-500">
            {t('featured.label')}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* Left: editorial content */}
          <div className="flex-1 max-w-2xl">
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-[1.15] mb-4"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {story.headline}
            </h2>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-6">
              {story.subheadline}
            </p>

            {/* Excerpt from chapter 1 */}
            <p className="text-sm text-zinc-500 leading-relaxed mb-6 max-w-xl line-clamp-3">
              {getExcerpt(story)}
            </p>

            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 group-hover:text-red-400 transition-colors">
                {t('featured.readMore')}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600">
                <Clock className="h-3 w-3" />
                {story.estimatedMinutes} min read
              </span>
            </div>
          </div>

          {/* Right: hero stat */}
          <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
            <div className="border-l-2 border-red-500 pl-5 py-1">
              <div className={cn('text-4xl sm:text-5xl font-mono font-bold', story.leadStat.color)}>
                {story.leadStat.value}
              </div>
              <div className="text-xs text-zinc-400 uppercase tracking-wide mt-1.5 max-w-[240px] leading-snug">
                {story.leadStat.label}
              </div>
              {story.leadStat.sublabel && (
                <div className="text-[10px] text-zinc-600 mt-1">
                  {story.leadStat.sublabel}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Story Card — editorial weight
// ---------------------------------------------------------------------------

function InvestigationCard({ story, onClick }: { story: StoryDef; onClick: () => void }) {
  const { t } = useTranslation('journalists')
  const status = story.status ? STATUS_CONFIG[story.status] : null
  const isRead = (() => { try { return !!localStorage.getItem(`rubli_read:${story.slug}`) } catch { return false } })()

  // Use i18n headline/subheadline if available, fall back to story-content
  const headline = t(`stories.${story.slug}.headline`, { defaultValue: story.headline })
  const subheadline = t(`stories.${story.slug}.subheadline`, { defaultValue: story.subheadline })

  return (
    <motion.button
      variants={staggerItem}
      whileHover={{ y: -3, borderColor: 'rgba(113,113,122,0.4)', transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative bg-zinc-900 border border-zinc-800 rounded-sm text-left w-full',
        'flex flex-col transition-colors cursor-pointer group overflow-hidden'
      )}
      aria-label={headline}
    >
      {/* Card body */}
      <div className="p-5 pb-4 flex flex-col gap-2.5 flex-1">
        {/* Top row: type + status + read indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-600">
            {story.type === 'case' ? 'CASE STUDY' : story.type === 'era' ? 'ERA ANALYSIS' : story.type === 'year' ? 'ANNUAL REVIEW' : 'INVESTIGATION'}
          </span>
          {status && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border', status.bg, status.border, status.color)}>
              {status.label}
            </span>
          )}
          {story.era && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 font-mono">
              {story.era === 'amlo' ? '4T' : story.era === 'pena' ? 'EPN' : story.era === 'calderon' ? 'FCH' : story.era === 'fox' ? 'FOX' : story.era.toUpperCase()}
            </span>
          )}
          {isRead && (
            <span className="ml-auto text-[10px] text-zinc-600 font-mono tracking-wide">
              ✓ read
            </span>
          )}
        </div>

        {/* Headline */}
        <h3
          className="text-lg font-bold text-white leading-tight line-clamp-2 group-hover:text-zinc-100"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {headline}
        </h3>

        {/* Subheadline / excerpt */}
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
          {subheadline}
        </p>
      </div>

      {/* Stat footer — the number that matters */}
      <div className="px-5 pb-5 mt-auto">
        <div className="border-t border-zinc-800 pt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className={cn('text-2xl font-mono font-bold leading-none', story.leadStat.color)}>
              {story.leadStat.value}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 leading-snug line-clamp-1">
              {story.leadStat.label}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-600 flex-shrink-0">
            <Clock className="h-3 w-3" />
            {story.estimatedMinutes}m
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Journalists() {
  const { t } = useTranslation('journalists')
  const navigate = useNavigate()
  const [activeTopic, setActiveTopic] = useState('all')

  // Featured story = first story in the canonical array
  const featured = STORIES[0]

  // Remaining stories (exclude featured from grid)
  const remaining = useMemo(() => STORIES.slice(1), [])

  // Filter
  const currentFilter = TOPIC_FILTERS.find((f) => f.id === activeTopic) ?? TOPIC_FILTERS[0]
  const filtered = useMemo(
    () => remaining.filter(currentFilter.match),
    [remaining, activeTopic] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Count for the headline
  const storyCount = STORIES.length

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ================================================================ */}
        {/* EDITORIAL MASTHEAD                                               */}
        {/* ================================================================ */}
        <motion.header
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="pt-12 sm:pt-16 pb-8"
        >
          {/* Dateline */}
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)] max-w-2xl">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-zinc-300">RUBLI</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span>Investigations · Desk</span>
            <span className="text-zinc-700">·</span>
            <span className="font-mono tabular-nums">v0.6.5</span>
          </div>

          {/* Kicker */}
          <p className="text-kicker text-kicker--investigation mb-3">RUBLI Investigations</p>

          {/* Main headline */}
          <h1
            className="text-white leading-[1.05] mb-4"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
            }}
          >
            {storyCount} Investigations Into Mexican Federal Procurement
          </h1>

          {/* Italic-serif deck */}
          <p
            className="text-zinc-300 max-w-3xl mb-6"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
              lineHeight: 1.55,
            }}
          >
            Every investigation is built from real data: 3,051,294 federal contracts (2002-2025)
            scored by a machine learning model trained on 748 documented corruption cases.
            The numbers are the starting point. The stories are what they reveal.
          </p>

          {/* Stat strip — the three numbers that contextualize everything */}
          <div className="flex flex-wrap gap-6 sm:gap-10 mb-6">
            <div className="border-l-2 border-red-500 pl-3">
              <div className="text-xl font-mono font-bold text-white tabular-nums">
                <AnimatedNumber value={3051294} duration={2000} />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t('hero.contractsLabel')}</p>
            </div>
            <div className="border-l-2 border-amber-500 pl-3">
              <div className="text-xl font-mono font-bold text-white tabular-nums">
                <AnimatedNumber value={9.88} decimals={2} prefix="$" suffix="T" duration={1800} />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t('hero.valueLabel')}</p>
            </div>
            <div className="border-l-2 border-zinc-600 pl-3">
              <div className="text-xl font-mono font-bold text-white tabular-nums">
                <AnimatedNumber value={748} duration={1600} />
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t('hero.casesLabel')}</p>
            </div>
          </div>

          {/* Source line */}
          <p className="text-[10px] text-zinc-600 font-mono">
            Source: COMPRANET (Secretaria de Hacienda) | Risk model v0.6.5 (AUC 0.828) | {t('masthead.lastUpdated')}
          </p>
        </motion.header>

        {/* Crimson rule */}
        <div className="h-[2px] w-full bg-gradient-to-r from-red-600 via-red-600/40 to-transparent mb-10" />

        {/* ================================================================ */}
        {/* FEATURED INVESTIGATION — hero card                              */}
        {/* ================================================================ */}
        <ScrollReveal className="mb-12">
          <FeaturedStory story={featured} />
        </ScrollReveal>

        {/* ================================================================ */}
        {/* BREAKING — live ARIA T1 strip                                    */}
        {/* ================================================================ */}
        <BreakingStrip />

        {/* ================================================================ */}
        {/* TOPIC FILTER BAR                                                 */}
        {/* ================================================================ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              All Investigations
            </h2>
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TOPIC_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTopic(f.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTopic === f.id
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* STORY GRID                                                       */}
        {/* ================================================================ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTopic}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-16"
          >
            {filtered.map((story) => (
              <InvestigationCard
                key={story.slug}
                story={story}
                onClick={() => navigate(`/stories/${story.slug}`)}
              />
            ))}
            {filtered.length === 0 && (
              <motion.div
                variants={fadeIn}
                className="col-span-full py-16 text-center"
              >
                <AlertTriangle className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                  {t('filters.noStories')}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ================================================================ */}
        {/* METHODOLOGY FOOTER                                               */}
        {/* ================================================================ */}
        <ScrollReveal className="pb-16">
          <div className="rounded-sm border border-zinc-800 bg-zinc-900/40 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                  RUBLI Methodology
                </p>
                <h3
                  className="text-xl font-bold text-white mb-3 flex items-center gap-1.5"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {t('methodology.title')}
                  <MetodologiaTooltip
                    title={t('methodology.tooltipTitle')}
                    body={t('methodology.tooltipBody')}
                    link="/methodology"
                  />
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t('methodology.description')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 sm:mt-6">
                <button
                  onClick={() => navigate('/methodology')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('methodology.viewMethodology')}
                </button>
                <button
                  onClick={() => navigate('/settings?tab=export')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('methodology.downloadData')}
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
