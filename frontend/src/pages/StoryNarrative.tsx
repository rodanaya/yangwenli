/**
 * StoryNarrative — Individual story page.
 *
 * Renders a full investigative journalism piece from the static STORIES array.
 * Dark-mode immersive reading experience with scroll-driven animations,
 * chapter banners, data pullquotes, and inline prose stats.
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Clock, ArrowLeft, ExternalLink, Share2, ArrowRight, ChevronRight, FileText } from 'lucide-react'
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
// Story charts are lazy-loaded — see CHART_REGISTRY below. Each story
// page only renders ONE chart component, so eagerly importing all 41
// would balloon the StoryNarrative page chunk for no benefit.
import {
  InlineDotGrid,
  InlineBarChart,
  InlineLineChart,
  InlineAreaChart,
  InlineSpikeChart,
  InlineDivergingBar,
} from '@/components/stories/InlineCharts'
import type { StoryInlineChartData } from '@/lib/story-content'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

// ---------------------------------------------------------------------------
// Inline chart map — type string → component
// ---------------------------------------------------------------------------

type InlineChartComponent = React.ComponentType<{ data: StoryInlineChartData; title: string }>

const INLINE_CHART_MAP: Record<string, InlineChartComponent> = {
  'inline-dot-grid': InlineDotGrid,
  'inline-bar': InlineBarChart,
  'inline-line': InlineLineChart,
  'inline-area': InlineAreaChart,
  'inline-spike': InlineSpikeChart,
  'inline-diverging': InlineDivergingBar,
}

// ---------------------------------------------------------------------------
// Chart registry — maps chartId to component
// ---------------------------------------------------------------------------

const lazyChart = (loader: () => Promise<{ [key: string]: React.ComponentType }>, name: string) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))

const CHART_REGISTRY: Record<string, React.ComponentType> = {
  'da-rate-trend': lazyChart(() => import('@/components/stories/charts/DaRateTrendChart'), 'DaRateTrendChart'),
  'da-by-sector': lazyChart(() => import('@/components/stories/charts/DaBySectorChart'), 'DaBySectorChart'),
  'amlo-era-comparison': lazyChart(() => import('@/components/stories/charts/AmloEraComparisonChart'), 'AmloEraComparisonChart'),
  'covid-emergency': lazyChart(() => import('@/components/stories/charts/CovidEmergencyChart'), 'CovidEmergencyChart'),
  'monthly-spending': lazyChart(() => import('@/components/stories/charts/MonthlySpendingChart'), 'MonthlySpendingChart'),
  'risk-by-sector': lazyChart(() => import('@/components/stories/charts/RiskBySectorChart'), 'RiskBySectorChart'),
  'vendor-concentration': lazyChart(() => import('@/components/stories/charts/VendorConcentrationChart'), 'VendorConcentrationChart'),
  'threshold-splitting': lazyChart(() => import('@/components/stories/charts/ThresholdSplittingChart'), 'ThresholdSplittingChart'),
  'sexenio-comparison': lazyChart(() => import('@/components/stories/charts/SexenioComparisonChart'), 'SexenioComparisonChart'),
  'temporal-risk': lazyChart(() => import('@/components/stories/charts/StoryTemporalRiskChart'), 'StoryTemporalRiskChart'),
  'sector-risk-heatmap': lazyChart(() => import('@/components/stories/charts/StorySectorRiskHeatmap'), 'StorySectorRiskHeatmap'),
  'seasonality-calendar': lazyChart(() => import('@/components/stories/charts/StorySeasonalityCalendar'), 'StorySeasonalityCalendar'),
  'money-sankey': lazyChart(() => import('@/components/stories/charts/StoryMoneySankeyChart'), 'StoryMoneySankeyChart'),
  'admin-sunburst': lazyChart(() => import('@/components/stories/charts/StoryAdminSunburst'), 'StoryAdminSunburst'),
  'sector-paradox': lazyChart(() => import('@/components/stories/charts/StorySectorParadox'), 'StorySectorParadox'),
  'risk-pyramid': lazyChart(() => import('@/components/stories/charts/StoryRiskPyramid'), 'StoryRiskPyramid'),
  'administration-fingerprints': lazyChart(() => import('@/components/stories/charts/StoryAdminFingerprints'), 'StoryAdminFingerprints'),
  'sector-risk-trends': lazyChart(() => import('@/components/stories/charts/StorySectorRiskTrends'), 'StorySectorRiskTrends'),
  'racing-bar': lazyChart(() => import('@/components/stories/charts/StoryRacingBar'), 'StoryRacingBar'),
  'risk-calendar': lazyChart(() => import('@/components/stories/charts/StoryRiskCalendar'), 'StoryRiskCalendar'),
  'community-bubbles': lazyChart(() => import('@/components/stories/charts/StoryCommunityBubbles'), 'StoryCommunityBubbles'),
  'procedure-breakdown': lazyChart(() => import('@/components/stories/charts/StoryProcedureBreakdown'), 'StoryProcedureBreakdown'),
  'vendor-fingerprint': lazyChart(() => import('@/components/stories/charts/StoryVendorFingerprint'), 'StoryVendorFingerprint'),
  'story-cuarta-adj': lazyChart(() => import('@/components/stories/charts/StoryCuartaAdjudicacion'), 'StoryCuartaAdjudicacion'),
  'story-granero-vacio': lazyChart(() => import('@/components/stories/charts/StoryGraneroVacio'), 'StoryGraneroVacio'),
  'story-nuevos-ricos': lazyChart(() => import('@/components/stories/charts/StoryNuevosRicos'), 'StoryNuevosRicos'),
  'story-hemoser': lazyChart(() => import('@/components/stories/charts/StoryHemoserSplitting'), 'StoryHemoserSplitting'),
  'story-austeridad': lazyChart(() => import('@/components/stories/charts/StoryAusteridadChart'), 'StoryAusteridadChart'),
  'story-cero-competencia': lazyChart(() => import('@/components/stories/charts/StoryCeroCompetenciaChart'), 'StoryCeroCompetenciaChart'),
  'story-triangulo-farmaceutico': lazyChart(() => import('@/components/stories/charts/StoryTrianguloFarmaceutico'), 'StoryTrianguloFarmaceutico'),
  'story-avalancha-diciembre': lazyChart(() => import('@/components/stories/charts/StoryAvalanchaDiciembre'), 'StoryAvalanchaDiciembre'),
  'story-cartel-corazon': lazyChart(() => import('@/components/stories/charts/StoryCartelCorazon'), 'StoryCartelCorazon'),
  'story-red-fantasma': lazyChart(() => import('@/components/stories/charts/StoryRedFantasma'), 'StoryRedFantasma'),
  'story-infraestructura': lazyChart(() => import('@/components/stories/charts/StoryInfraestructura'), 'StoryInfraestructura'),
  'story-sixsigma-hacienda': lazyChart(() => import('@/components/stories/charts/StorySixSigmaHacienda'), 'StorySixSigmaHacienda'),
  'story-oceanografia': lazyChart(() => import('@/components/stories/charts/StoryOceanografia'), 'StoryOceanografia'),
  'story-sexenio-sexenio': lazyChart(() => import('@/components/stories/charts/StorySexenioASexenio'), 'StorySexenioASexenio'),
  'story-casa-contratos': lazyChart(() => import('@/components/stories/charts/StoryCasaContratos'), 'StoryCasaContratos'),
  'story-ano-sin-excusas': lazyChart(() => import('@/components/stories/charts/StoryAnoSinExcusas'), 'StoryAnoSinExcusas'),
  'story-insabi': lazyChart(() => import('@/components/stories/charts/StoryInsabi'), 'StoryInsabi'),
  'story-tren-maya': lazyChart(() => import('@/components/stories/charts/StoryTrenMaya'), 'StoryTrenMaya'),
}

// Fallback map: chapter.chartConfig.type → chartId when no chartId is specified
const TYPE_TO_CHART_ID: Record<string, string> = {
  'da-trend':    'da-rate-trend',
  'sector-bar':  'da-by-sector',
  'comparison':  'amlo-era-comparison',
  'year-bar':    'monthly-spending',
  'vendor-list': 'vendor-concentration',
  'radar':       'administration-fingerprints',
  'fingerprint': 'vendor-fingerprint',
  'trends':      'sector-risk-trends',
  'calendar':    'risk-calendar',
  'network':     'community-bubbles',
  'pyramid':     'risk-pyramid',
  'scatter':     'sector-paradox',
  'sunburst':    'admin-sunburst',
  'racing':      'racing-bar',
  'breakdown':   'procedure-breakdown',
}

// ---------------------------------------------------------------------------
// Outlet-level accent colors
// ---------------------------------------------------------------------------

const OUTLET_ACCENT: Record<string, string> = {
  longform: '#1a1714',
  investigative: '#d4922a',
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
// Chapter sources — collapsible citation footnote
// ---------------------------------------------------------------------------

function ChapterSources({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-8 mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors group"
        aria-expanded={open}
      >
        <FileText className="h-3 w-3 group-hover:text-text-secondary" />
        <span className="font-mono">{open ? '−' : '+'}</span>
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        <span className="text-text-primary">&mdash; {open ? 'collapse' : 'view citations'}</span>
      </button>
      {open && (
        <ol className="mt-3 space-y-1.5 border-l-2 border-border pl-4">
          {sources.map((s, i) => (
            <li key={i} className="text-[11px] text-text-muted font-mono leading-relaxed">
              <span className="text-text-primary mr-2 select-none">[{i + 1}]</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
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
            <p className="text-text-secondary leading-relaxed mb-6 text-lg">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}

        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}

        {chapter.chartConfig && (() => {
          const cfg = chapter.chartConfig

          // Inline data-driven charts — rendered when cfg.data is present
          if (cfg.data) {
            const InlineChart = INLINE_CHART_MAP[cfg.type]
            return (
              <ScrollReveal className="my-8">
                {InlineChart ? (
                  <InlineChart data={cfg.data} title={cfg.title} />
                ) : (
                  <div
                    className="bg-background-card rounded-sm p-6 text-text-muted text-sm text-center"
                    role="img"
                    aria-label={cfg.title}
                  >
                    {cfg.title}
                  </div>
                )}
              </ScrollReveal>
            )
          }

          // Existing registry-based charts (unchanged)
          const chartId = cfg.chartId || TYPE_TO_CHART_ID[cfg.type]
          const ChartComponent = chartId ? CHART_REGISTRY[chartId] : undefined
          return (
            <ScrollReveal className="my-8">
              {ChartComponent ? (
                <Suspense fallback={
                  <div className="bg-background-card rounded-sm p-6 text-text-muted text-sm text-center" role="img" aria-label={cfg.title}>
                    {cfg.title}
                  </div>
                }>
                  <ChartComponent />
                </Suspense>
              ) : (
                <div
                  className="bg-background-card rounded-sm p-6 text-text-muted text-sm text-center"
                  role="img"
                  aria-label={cfg.title}
                >
                  {cfg.title}
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
// Shared status config (used in Hero + Methodology)
// ---------------------------------------------------------------------------

// Tokenized — was 4 dark-mode pill styles (text-color-400 + bg-color-950)
// that read as washed-out muddy patches on the cream broadsheet. Routed
// through canonical risk + accent + OECD tokens.
const STATUS_CONFIG: Record<StoryStatus, { labelKey: string; color: string; bg: string; border: string }> = {
  solo_datos:  { labelKey: 'story.statusSoloDatos', color: 'text-risk-high',                   bg: 'bg-risk-high/10',                                  border: 'border-risk-high/30' },
  reporteado:  { labelKey: 'story.statusReporteado', color: 'text-[color:var(--color-accent-data)]', bg: 'bg-[color:var(--color-accent-data)]/10',     border: 'border-[color:var(--color-accent-data)]/30'   },
  auditado:    { labelKey: 'story.statusAuditado',  color: 'text-[color:var(--color-oecd)]',        bg: 'bg-[color:var(--color-oecd)]/10',            border: 'border-[color:var(--color-oecd)]/30' },
  procesado:   { labelKey: 'story.statusProcesado', color: 'text-risk-critical',                   bg: 'bg-risk-critical/10',                          border: 'border-risk-critical/30'   },
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
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted">
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
          className="font-bold text-text-primary leading-[1.05] mb-5"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(2rem, 5vw, 3.75rem)',
            letterSpacing: '-0.03em',
          }}
        >
          {story.headline}
        </motion.h1>

        {/* Subheadline (deck) */}
        <motion.p
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="italic text-text-secondary leading-[1.55] max-w-2xl mb-8"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)',
          }}
        >
          {story.subheadline}
        </motion.p>

        {/* Byline + read time + investigation status */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-10"
        >
          <span>{story.byline}</span>
          <span className="w-px h-4 bg-background-elevated" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {story.estimatedMinutes} min {t('storyType.readTime', 'read')}
          </span>
          {story.status && (() => {
            const sc = STATUS_CONFIG[story.status]
            return (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${sc.bg} ${sc.border} ${sc.color}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {t(sc.labelKey, story.status)}
              </span>
            )
          })()}
          <span className="text-[11px] text-text-primary font-mono">
            {story.chapters.length} {story.chapters.length === 1 ? 'chapter' : 'chapters'}
          </span>
        </motion.div>

        {/* Lead stat */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="mb-8"
        >
          <div
            className={cn('font-bold tabular-nums', story.leadStat.color)}
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
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
          <p className="text-text-secondary text-base mt-2">{story.leadStat.label}</p>
          {story.leadStat.sublabel && (
            <p className="text-text-muted text-sm mt-1">{story.leadStat.sublabel}</p>
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

function ChapterNav({
  chapters,
  accentColor,
  activeChapterId,
}: {
  chapters: StoryChapterDef[]
  accentColor: string
  activeChapterId: string | null
}) {
  const { t } = useTranslation('common')
  return (
    <nav
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3"
      aria-label={t('storyType.chapterNav', 'Chapter navigation')}
    >
      {chapters.map((ch) => {
        const isActive = ch.id === activeChapterId
        return (
          <a
            key={ch.id}
            href={`#chapter-${ch.id}`}
            className="group relative flex items-center justify-end gap-2"
            aria-label={`${t('storyType.chapter', 'Chapter')} ${ch.number}: ${ch.title}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={cn(
                'transition-opacity text-xs whitespace-nowrap pr-2',
                isActive ? 'opacity-100 text-text-secondary' : 'opacity-0 group-hover:opacity-100 text-text-secondary'
              )}
            >
              {ch.title}
            </span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full border-2 transition-all',
                isActive ? 'scale-125' : 'group-hover:scale-110'
              )}
              style={{
                borderColor: accentColor,
                backgroundColor: isActive ? accentColor : 'transparent',
              }}
            />
          </a>
        )
      })}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Methodology footer
// ---------------------------------------------------------------------------

function MethodologySection({ story }: { story: StoryDef }) {
  const { t } = useTranslation('common')
  const statusCfg = story.status ? STATUS_CONFIG[story.status] : null

  return (
    <ScrollReveal>
      <section
        className="max-w-prose mx-auto px-4 sm:px-0 my-16 py-8 border-t border-border"
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
          className="text-xl font-bold text-text-secondary mb-4"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {t('story.methodology')}
        </h3>
        <div className="text-sm text-text-secondary leading-relaxed space-y-3">
          <p>
            {t('story.methodologyP1')}{' '}
            <ProseStat value="3,051,294" color="text-risk-critical" animate={false} />{' '}
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
          <div className="mt-8 p-4 rounded-sm border border-border bg-background-card">
            <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-risk-critical" />
              {t('story.nextSteps')}
            </h4>
            <ul className="space-y-2">
              {story.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                  <span className="text-risk-critical font-bold shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-secondary hover:border-border transition-colors"
          >
            {t('story.fullMethodology')}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            to="/model"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-secondary hover:border-border transition-colors"
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
  const related = getRelatedStories(story.slug)
  if (related.length === 0) return null

  return (
    <ScrollReveal>
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 my-16"
        aria-label={t('story.investigateMore')}
      >
        <h3
          className="text-xl font-bold text-text-secondary mb-6"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {t('story.investigateMore')}
        </h3>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
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
          className="text-lg font-bold text-text-secondary mb-4"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {t('story.viewOnPlatform')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between p-3 rounded-sm bg-background-card border border-border hover:border-border transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-text-muted">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
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
        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border border-border text-text-secondary hover:text-text-secondary hover:border-border transition-colors"
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
  const [scrollPct, setScrollPct] = useState(0)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

  const story = slug ? getStoryBySlug(slug) : undefined

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setScrollPct(0)
    setActiveChapterId(null)
  }, [slug])

  // Reading progress bar
  useEffect(() => {
    if (!story) return
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setScrollPct(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [story])

  // Active chapter tracking via IntersectionObserver
  useEffect(() => {
    if (!story) return
    const sections = story.chapters
      .map((ch) => document.getElementById(`chapter-${ch.id}`))
      .filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveChapterId(entry.target.id.replace('chapter-', ''))
          }
        }
      },
      { rootMargin: '-15% 0px -65% 0px' }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [story])

  // Mark story as read in localStorage
  const markRead = useCallback((s: string) => {
    try { localStorage.setItem(`rubli_read:${s}`, '1') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (slug) markRead(slug)
  }, [slug, markRead])

  if (!story) {
    return (
      <div className="max-w-[1040px] mx-auto px-4 py-8">
        <EditorialPageShell
          kicker="INVESTIGATIVE NARRATIVES · ARCHIVE"
          headline={
            <>
              {t('story.notFound', 'Story not found')}
              <span className="block text-base font-normal mt-3 text-text-muted" style={{ fontFamily: 'var(--font-family-sans)' }}>
                The requested investigation could not be located.
              </span>
            </>
          }
          paragraph={t('story.notFoundDetail', 'The story "{{slug}}" could not be found in the RUBLI narrative archive. Return to the journalism index to explore active investigations.', { slug })}
          severity="high"
        >
          <Act number="I" label="RETURN TO INDEX">
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/journalists')}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-4 py-2 rounded-full border border-border hover:border-border-hover text-text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('story.allStories')}
              </button>
            </div>
          </Act>
        </EditorialPageShell>
      </div>
    )
  }

  const accentColor = OUTLET_ACCENT[story.outlet] || '#dc2626'

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky header: back link + reading progress */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-border">
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] transition-all duration-100"
          style={{ width: `${scrollPct}%`, backgroundColor: accentColor }}
          aria-hidden="true"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          <Link
            to="/journalists"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('story.allStories')}
          </Link>
          <span className="text-[10px] text-text-muted font-mono tabular-nums">
            {Math.round(scrollPct)}%
          </span>
        </div>
      </div>

      {/* Hero — editorial lede with outlet badge + lead stat */}
      <StoryHero story={story} accentColor={accentColor} />

      {/* Chapter navigation dots */}
      <ChapterNav chapters={story.chapters} accentColor={accentColor} activeChapterId={activeChapterId} />

      {/* ── ACT I: THE INVESTIGATION ── */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16">
        <Act number="I" label="THE INVESTIGATION" className="space-y-0">
          {story.chapters.map((chapter) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              story={story}
              accentColor={accentColor}
            />
          ))}
        </Act>
      </main>

      {/* ── ACT II: THE METHODOLOGY ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <Act number="II" label="THE METHODOLOGY" className="space-y-4">
          <MethodologySection story={story} />
        </Act>
      </div>

      {/* ── ACT III: FURTHER INQUIRY ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <Act number="III" label="FURTHER INQUIRY" className="space-y-4">
          <ShareBar story={story} />
          <PlatformLinks story={story} />
        </Act>
      </div>

      {/* ── ACT IV: RELATED DOSSIERS ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <Act number="IV" label="RELATED DOSSIERS" className="space-y-4">
          <RelatedSection story={story} />
        </Act>
      </div>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  )
}
