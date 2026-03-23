/**
 * StoryNarrative — Individual story page.
 *
 * Renders a full investigative journalism piece from the static STORIES array.
 * Dark-mode immersive reading experience with scroll-driven animations,
 * chapter banners, data pullquotes, and inline prose stats.
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Clock, ArrowLeft, ExternalLink, Share2, ArrowRight, ChevronRight } from 'lucide-react'
import { getStoryBySlug, getRelatedStories } from '@/lib/story-content'
import type { StoryChapterDef, StoryDef, StoryStatus } from '@/lib/story-content'
import { OutletBadge } from '@/components/stories/OutletBadge'
import ChapterBanner from '@/components/stories/ChapterBanner'
import DataPullquote from '@/components/stories/DataPullquote'
import ProseStat from '@/components/stories/ProseStat'
import { StoryCard } from '@/components/stories/StoryCard'
import { ScrollReveal, AnimatedNumber } from '@/hooks/useAnimations'
import { slideUp, fadeIn, staggerContainer } from '@/lib/animations'
import { cn } from '@/lib/utils'
import * as StoryCharts from '@/components/stories/charts'

// ---------------------------------------------------------------------------
// Chart registry — maps chartId to component
// ---------------------------------------------------------------------------

const CHART_REGISTRY: Record<string, React.ComponentType> = {
  'da-rate-trend': StoryCharts.DaRateTrendChart,
  'da-by-sector': StoryCharts.DaBySectorChart,
  'amlo-era-comparison': StoryCharts.AmloEraComparisonChart,
  'covid-emergency': StoryCharts.CovidEmergencyChart,
  'monthly-spending': StoryCharts.MonthlySpendingChart,
  'risk-by-sector': StoryCharts.RiskBySectorChart,
  'vendor-concentration': StoryCharts.VendorConcentrationChart,
  'threshold-splitting': StoryCharts.ThresholdSplittingChart,
  'sexenio-comparison': StoryCharts.SexenioComparisonChart,
  'temporal-risk': StoryCharts.StoryTemporalRiskChart,
  'sector-risk-heatmap': StoryCharts.StorySectorRiskHeatmap,
  'seasonality-calendar': StoryCharts.StorySeasonalityCalendar,
  'money-sankey': StoryCharts.StoryMoneySankeyChart,
  'admin-sunburst': StoryCharts.StoryAdminSunburst,
  'sector-paradox': StoryCharts.StorySectorParadox,
  'risk-pyramid': StoryCharts.StoryRiskPyramid,
  'administration-fingerprints': StoryCharts.StoryAdminFingerprints,
  'sector-risk-trends': StoryCharts.StorySectorRiskTrends,
  'racing-bar': StoryCharts.StoryRacingBar,
  'risk-calendar': StoryCharts.StoryRiskCalendar,
  'community-bubbles': StoryCharts.StoryCommunityBubbles,
  'procedure-breakdown': StoryCharts.StoryProcedureBreakdown,
  'vendor-fingerprint': StoryCharts.StoryVendorFingerprint,
}

// Fallback map: chapter.chartConfig.type → chartId when no chartId is specified
const TYPE_TO_CHART_ID: Record<string, string> = {
  'da-trend':    'da-rate-trend',
  'sector-bar':  'da-by-sector',
  'comparison':  'amlo-era-comparison',
  'year-bar':    'monthly-spending',
  'vendor-list': 'vendor-concentration',
}

// ---------------------------------------------------------------------------
// Outlet-level accent colors
// ---------------------------------------------------------------------------

const OUTLET_ACCENT: Record<string, string> = {
  longform: '#1a1714',
  investigative: '#c41e3a',
  data_analysis: '#2563eb',
  rubli: '#dc2626',
}

function getEraLabel(era: string, t: ReturnType<typeof useTranslation>['t']): string {
  const map: Record<string, string> = {
    fox: t('era.fox', 'Fox (2000-2006)'),
    calderon: t('era.calderon', 'Calderón (2006-2012)'),
    pena: t('era.pena', 'Peña Nieto (2012-2018)'),
    amlo: t('era.amlo', 'López Obrador (2018-2024)'),
    sheinbaum: t('era.sheinbaum', 'Sheinbaum (2024-)'),
    cross: t('era.cross', 'Multi-administration'),
  }
  return map[era] || era
}

function getTypeLabel(type: string, t: ReturnType<typeof useTranslation>['t']): string {
  const map: Record<string, string> = {
    era: t('storyType.era', 'Era Analysis'),
    case: t('storyType.case', 'Investigation Case'),
    thematic: t('storyType.thematic', 'Thematic Investigation'),
    year: t('storyType.year', 'Annual Analysis'),
  }
  return map[type] || type
}

// ---------------------------------------------------------------------------
// Parse lead stat for animated counter
// ---------------------------------------------------------------------------

function parseLeadStat(value: string): { numeric: number; prefix: string; suffix: string; decimals: number } | null {
  const match = value.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/)
  if (!match) return null
  const prefix = match[1]
  const numStr = match[2].replace(/,/g, '')
  const suffix = match[3]
  const numeric = parseFloat(numStr)
  if (isNaN(numeric)) return null
  const dotIdx = numStr.indexOf('.')
  const decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0
  return { numeric, prefix, suffix, decimals }
}

// ---------------------------------------------------------------------------
// Chapter section
// ---------------------------------------------------------------------------

function ChapterSection({
  chapter,
  story,
  accentColor,
}: {
  chapter: StoryChapterDef
  story: StoryDef
  accentColor: string
}) {
  const { t } = useTranslation('common')
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-16"
    >
      <ChapterBanner
        number={chapter.number}
        title={chapter.title}
        subtitle={chapter.subtitle}
        era={story.era ? getEraLabel(story.era, t) : undefined}
        color={accentColor}
      />

      <div className="max-w-prose mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p className="text-zinc-200 leading-relaxed mb-6 text-lg">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}

        {chapter.chartConfig && (() => {
          const chartId = chapter.chartConfig.chartId || TYPE_TO_CHART_ID[chapter.chartConfig.type]
          const ChartComponent = chartId ? CHART_REGISTRY[chartId] : undefined
          return (
            <ScrollReveal className="my-8">
              {ChartComponent ? (
                <ChartComponent />
              ) : (
                <div
                  className="bg-zinc-900 rounded-xl p-6 text-zinc-500 text-sm text-center"
                  role="img"
                  aria-label={chapter.chartConfig.title}
                >
                  {chapter.chartConfig.title}
                </div>
              )}
            </ScrollReveal>
          )
        })()}

        {chapter.pullquote && (
          <DataPullquote
            quote={chapter.pullquote.quote}
            stat={chapter.pullquote.stat}
            statLabel={chapter.pullquote.statLabel}
            barValue={chapter.pullquote.barValue}
            barLabel={chapter.pullquote.barLabel}
            outlet={story.outlet}
            statColor={story.leadStat.color}
          />
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function StoryHero({ story, accentColor }: { story: StoryDef; accentColor: string }) {
  const { t } = useTranslation('common')
  const parsed = parseLeadStat(story.leadStat.value)

  return (
    <header className="relative bg-black overflow-hidden" role="banner">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${accentColor} 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* Outlet + type badges */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex items-center gap-3 mb-6 flex-wrap"
        >
          <OutletBadge outlet={story.outlet} />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-500">
            {getTypeLabel(story.type, t)}
          </span>
          {story.era && (
            <span
              className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {getEraLabel(story.era, t)}
            </span>
          )}
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="text-4xl sm:text-5xl xl:text-7xl font-bold text-white leading-[1.08] mb-5"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {story.headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-2xl mb-8"
        >
          {story.subheadline}
        </motion.p>

        {/* Byline + read time */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex items-center gap-4 text-sm text-zinc-500 mb-10"
        >
          <span>{story.byline}</span>
          <span className="w-px h-4 bg-zinc-700" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {story.estimatedMinutes} min {t('storyType.readTime', 'read')}
          </span>
        </motion.div>

        {/* Lead stat */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="mb-8"
        >
          <div className={cn('text-6xl sm:text-7xl xl:text-8xl font-black tracking-tight', story.leadStat.color)}>
            {parsed ? (
              <AnimatedNumber
                value={parsed.numeric}
                decimals={parsed.decimals}
                prefix={parsed.prefix}
                suffix={parsed.suffix}
                duration={2000}
              />
            ) : (
              <span>{story.leadStat.value}</span>
            )}
          </div>
          <p className="text-zinc-400 text-base mt-2">{story.leadStat.label}</p>
          {story.leadStat.sublabel && (
            <p className="text-zinc-500 text-sm mt-1">{story.leadStat.sublabel}</p>
          )}
        </motion.div>

        {/* Thin colored divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-[2px] w-32 origin-left"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Chapter navigation dots (sticky sidebar)
// ---------------------------------------------------------------------------

function ChapterNav({ chapters, accentColor }: { chapters: StoryChapterDef[]; accentColor: string }) {
  const { t } = useTranslation('common')
  return (
    <nav
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3"
      aria-label={t('storyType.chapterNav', 'Chapter navigation')}
    >
      {chapters.map((ch) => (
        <a
          key={ch.id}
          href={`#chapter-${ch.id}`}
          className="group relative flex items-center justify-end gap-2"
          aria-label={`${t('storyType.chapter', 'Chapter')} ${ch.number}: ${ch.title}`}
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-400 whitespace-nowrap pr-2">
            {ch.title}
          </span>
          <span
            className="w-2.5 h-2.5 rounded-full border-2 transition-colors group-hover:scale-125"
            style={{ borderColor: accentColor }}
          />
        </a>
      ))}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Methodology footer
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<StoryStatus, { labelKey: string; color: string; bg: string; border: string }> = {
  solo_datos:  { labelKey: 'story.statusSoloDatos', color: 'text-amber-400',  bg: 'bg-amber-950/40',  border: 'border-amber-800/60' },
  reporteado:  { labelKey: 'story.statusReporteado',           color: 'text-sky-400',     bg: 'bg-sky-950/40',    border: 'border-sky-800/60'   },
  auditado:    { labelKey: 'story.statusAuditado',          color: 'text-violet-400',  bg: 'bg-violet-950/40', border: 'border-violet-800/60' },
  procesado:   { labelKey: 'story.statusProcesado',           color: 'text-red-400',     bg: 'bg-red-950/40',    border: 'border-red-800/60'   },
}

function MethodologySection({ story }: { story: StoryDef }) {
  const { t } = useTranslation('common')
  const statusCfg = story.status ? STATUS_CONFIG[story.status] : null

  return (
    <ScrollReveal>
      <section
        className="max-w-prose mx-auto px-4 sm:px-0 my-16 py-8 border-t border-zinc-800"
        aria-label={t('story.methodology')}
      >
        {/* Investigation status badge */}
        {statusCfg && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            {t('story.statusLabel')}: {t(statusCfg.labelKey)}
          </div>
        )}

        <h3
          className="text-xl font-bold text-zinc-200 mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('story.methodology')}
        </h3>
        <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
          <p>
            {t('story.methodologyP1')}{' '}
            <ProseStat value="3,051,294" color="text-red-400" animate={false} />{' '}
            {t('story.methodologyP2')}
          </p>
          <p>
            {t('story.methodologyP3')}
          </p>
          <p>
            {t('story.methodologyP4')}
          </p>
        </div>

        {/* Next steps for journalists */}
        {story.nextSteps && story.nextSteps.length > 0 && (
          <div className="mt-8 p-4 rounded-lg border border-zinc-700/60 bg-zinc-900/60">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-red-400" />
              {t('story.nextSteps')}
            </h4>
            <ul className="space-y-2">
              {story.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            {t('story.fullMethodology')}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            to="/model"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            {t('story.modelTransparency')}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </ScrollReveal>
  )
}

// ---------------------------------------------------------------------------
// Related stories
// ---------------------------------------------------------------------------

function RelatedSection({ story }: { story: StoryDef }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const related = getRelatedStories(story)
  if (related.length === 0) return null

  return (
    <ScrollReveal>
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 my-16"
        aria-label={t('story.investigateMore')}
      >
        <h3
          className="text-xl font-bold text-zinc-200 mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('story.investigateMore')}
        </h3>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {related.slice(0, 3).map((r) => (
            <StoryCard
              key={r.slug}
              slug={r.slug}
              outlet={r.outlet}
              type={r.type}
              headline={r.headline}
              subheadline={r.subheadline}
              leadStatValue={r.leadStat.value}
              leadStatLabel={r.leadStat.label}
              leadStatColor={r.leadStat.color}
              estimatedMinutes={r.estimatedMinutes}
              era={r.era ? getEraLabel(r.era, t) : undefined}
              onClick={() => {
                navigate(`/stories/${r.slug}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ))}
        </motion.div>
      </section>
    </ScrollReveal>
  )
}

// ---------------------------------------------------------------------------
// Platform links
// ---------------------------------------------------------------------------

function PlatformLinks({ story }: { story: StoryDef }) {
  const { t } = useTranslation('common')
  const links = [
    { label: t('story.ariaIntelligence'), to: '/aria', description: t('story.ariaDesc') },
    { label: t('story.documentedCases'), to: '/cases', description: t('story.documentedCasesDesc') },
    { label: t('story.exploreContracts'), to: '/contracts', description: t('story.exploreContractsDesc') },
  ]

  if (story.era === 'amlo' || story.slug.includes('granero')) {
    links.push({ label: t('story.sectorAgricultura'), to: '/sectors/9', description: t('story.sectorAgriculturaDesc') })
  }

  return (
    <ScrollReveal>
      <section className="max-w-prose mx-auto px-4 sm:px-0 my-12">
        <h3
          className="text-lg font-bold text-zinc-300 mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('story.viewOnPlatform')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-zinc-500">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  )
}

// ---------------------------------------------------------------------------
// Share bar
// ---------------------------------------------------------------------------

function ShareBar({ story }: { story: StoryDef }) {
  const { t } = useTranslation('common')
  const handleShare = async () => {
    const url = window.location.href
    const text = `${story.headline} - ${story.leadStat.value} ${story.leadStat.label}`
    if (navigator.share) {
      try {
        await navigator.share({ title: story.headline, text, url })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="max-w-prose mx-auto px-4 sm:px-0 my-8">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
      >
        <Share2 className="h-3.5 w-3.5" />
        {t('story.shareInvestigation')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StoryNarrative() {
  const { t } = useTranslation('common')
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const story = slug ? getStoryBySlug(slug) : undefined

  // Redirect to /journalists if story not found
  useEffect(() => {
    if (slug && !story) {
      navigate('/journalists', { replace: true })
    }
  }, [slug, story, navigate])

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  if (!story) {
    return null
  }

  const accentColor = OUTLET_ACCENT[story.outlet] || '#dc2626'

  return (
    <div className="min-h-screen bg-black">
      {/* Back to Journalists link */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <Link
            to="/journalists"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('story.allStories')}
          </Link>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
            {t('story.investigations')}
          </span>
        </div>
      </div>

      {/* Hero */}
      <StoryHero story={story} accentColor={accentColor} />

      {/* Chapter navigation dots */}
      <ChapterNav chapters={story.chapters} accentColor={accentColor} />

      {/* Chapters */}
      <main className="relative">
        {story.chapters.map((chapter) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            story={story}
            accentColor={accentColor}
          />
        ))}
      </main>

      {/* Methodology */}
      <MethodologySection story={story} />

      {/* Share */}
      <ShareBar story={story} />

      {/* Platform links */}
      <PlatformLinks story={story} />

      {/* Related stories */}
      <RelatedSection story={story} />

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  )
}
