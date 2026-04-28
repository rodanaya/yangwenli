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
import { getStoryBySlug, getRelatedStories, localizeChapter, localizeStory } from '@/lib/story-content'
import type { StoryChapterDef, StoryDef, StoryStatus } from '@/lib/story-content'
import { OutletBadge } from '@/components/stories/OutletBadge'
import ChapterBanner from '@/components/stories/ChapterBanner'
import DataPullquote from '@/components/stories/DataPullquote'
import ProseStat from '@/components/stories/ProseStat'
import { StoryCard } from '@/components/stories/StoryCard'
import { ScrollReveal, AnimatedNumber } from '@/hooks/useAnimations'
import { slideUp, fadeIn, staggerContainer } from '@/lib/animations'
import { cn, localizeAmount } from '@/lib/utils'
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
  InlineMultiLine,
  InlineNetwork,
  InlineStackedBar,
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
// Chapter section — variant-aware layouts (news-website style hierarchy).
//
// Same chapter data renders differently depending on which variant the picker
// chooses. This breaks the monotonous "every chapter is a 65ch box" rhythm
// that made /stories feel like a blog post instead of a magazine spread.
// ---------------------------------------------------------------------------

type ChapterVariant =
  | 'hero'              // first chapter: full-width, oversized, drop cap, gradient backdrop
  | 'feature'           // rich chapter: wider, asymmetric pullquote breakout
  | 'data-spotlight'    // chart-driven: chart breaks out wider than text
  | 'quote-spotlight'   // quote-driven: massive Playfair italic
  | 'connective'        // short transitional: narrow column, brief
  | 'closing'           // final chapter: generous closing thesis
  | 'standard'          // default rhythm

function pickChapterVariant(
  chapter: StoryChapterDef,
  index: number,
  total: number,
): ChapterVariant {
  if (index === 0) return 'hero'
  if (index === total - 1) return 'closing'
  const proseLen = chapter.prose?.length ?? 0
  const hasChart = !!chapter.chartConfig
  const hasQuote = !!chapter.pullquote
  // Chapter centered on chart (brief text + chart, no quote)
  if (hasChart && !hasQuote && proseLen <= 2) return 'data-spotlight'
  // Chapter centered on quote (brief text + quote, no chart)
  if (hasQuote && !hasChart && proseLen <= 2) return 'quote-spotlight'
  // Short transitional chapter
  if (!hasChart && !hasQuote && proseLen === 1) return 'connective'
  // Rich content chapter
  if (hasChart && hasQuote && proseLen >= 2) return 'feature'
  return 'standard'
}

// ── Render helpers (shared across variants) ───────────────────────────────

function renderChartBlock(
  chapter: StoryChapterDef,
  className = 'my-8',
) {
  if (!chapter.chartConfig) return null
  const cfg = chapter.chartConfig
  // Multi-series and network charts have their own data shapes — dispatch
  // before the InlineChartMap which only handles StoryInlineChartData.
  if (cfg.type === 'inline-multi-line' && cfg.multiSeries) {
    return (
      <ScrollReveal className={className}>
        <InlineMultiLine data={cfg.multiSeries} title={cfg.title} />
      </ScrollReveal>
    )
  }
  if (cfg.type === 'inline-network' && cfg.network) {
    return (
      <ScrollReveal className={className}>
        <InlineNetwork data={cfg.network} title={cfg.title} />
      </ScrollReveal>
    )
  }
  if (cfg.type === 'inline-stacked-bar' && cfg.stacked) {
    return (
      <ScrollReveal className={className}>
        <InlineStackedBar data={cfg.stacked} title={cfg.title} />
      </ScrollReveal>
    )
  }
  if (cfg.data) {
    const InlineChart = INLINE_CHART_MAP[cfg.type]
    return (
      <ScrollReveal className={className}>
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
  const chartId = cfg.chartId || TYPE_TO_CHART_ID[cfg.type]
  const ChartComponent = chartId ? CHART_REGISTRY[chartId] : undefined
  return (
    <ScrollReveal className={className}>
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
}

function renderPullquote(chapter: StoryChapterDef, story: StoryDef, className = '') {
  if (!chapter.pullquote) return null
  return (
    <div className={className}>
      <DataPullquote
        quote={chapter.pullquote.quote}
        stat={chapter.pullquote.stat}
        statLabel={chapter.pullquote.statLabel}
        barValue={chapter.pullquote.barValue}
        barLabel={chapter.pullquote.barLabel}
        outlet={story.outlet}
        statColor={story.leadStat.color}
        vizTemplate={chapter.pullquote.vizTemplate}
      />
    </div>
  )
}

// ── Editorial artwork — abstract procurement-themed SVG.
//   Used as a hero accent. Pure CSS, no external image. Style: stamps,
//   document grid, contract redaction marks, cluster pattern. Looks like
//   the kind of decorative element NYT/FT use behind hero headlines. ────

function HeroArtwork({ accentColor, variant = 'cluster' }: { accentColor: string; variant?: 'cluster' | 'grid' | 'stamp' }) {
  if (variant === 'cluster') {
    // Constellation-style cluster suggesting the Atlas
    return (
      <svg
        viewBox="0 0 560 200"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cluster-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Background dot grid */}
        {Array.from({ length: 14 * 5 }).map((_, i) => {
          const cols = 14
          const col = i % cols
          const row = Math.floor(i / cols)
          const cx = 30 + col * 38
          const cy = 28 + row * 36
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={1.4}
              fill={accentColor}
              opacity={0.18}
            />
          )
        })}
        {/* Cluster glow */}
        <circle cx={280} cy={100} r={75} fill="url(#cluster-glow)" />
        {/* Critical cluster — hand-positioned bright dots with edges */}
        {[
          [260, 92], [275, 85], [285, 100], [295, 88], [302, 102], [288, 115], [270, 110],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.6} fill={accentColor} opacity={0.85} />
        ))}
        {/* Connecting hairlines */}
        {[
          [260, 92, 275, 85], [275, 85, 285, 100], [285, 100, 295, 88], [285, 100, 288, 115],
          [288, 115, 270, 110], [295, 88, 302, 102], [302, 102, 288, 115],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accentColor} strokeWidth={0.6} opacity={0.45} />
        ))}
        {/* A few outlier specks scattered */}
        {[[80, 50], [120, 150], [450, 60], [490, 145], [410, 140], [70, 130], [50, 80]].map(([x, y], i) => (
          <circle key={`o-${i}`} cx={x} cy={y} r={1.8} fill={accentColor} opacity={0.5} />
        ))}
      </svg>
    )
  }
  if (variant === 'grid') {
    // Document grid suggesting contract pages
    return (
      <svg viewBox="0 0 560 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => (
            <rect
              key={`${row}-${col}`}
              x={20 + col * 44}
              y={16 + row * 30}
              width={36}
              height={22}
              fill={accentColor}
              opacity={0.05 + Math.random() * 0.18}
              rx={1}
            />
          ))
        )}
      </svg>
    )
  }
  // 'stamp' — official rubber-stamp circle marks
  return (
    <svg viewBox="0 0 560 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[[140, 100, 56], [350, 70, 42], [430, 130, 48]].map(([cx, cy, r], i) => (
        <g key={i} opacity={0.18}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={accentColor} strokeWidth={2.2} />
          <circle cx={cx} cy={cy} r={r as number - 8} fill="none" stroke={accentColor} strokeWidth={1} strokeDasharray="3 4" />
        </g>
      ))}
    </svg>
  )
}

// ── KeyFactsStrip — inline mini-infographic, 3 facts in a row.
//   A visual breakout that summarizes the chapter's key numbers. Designed
//   to appear MID-CHAPTER as a moment of revelation (vs the existing
//   pullquote which is more text+stat). ─────────────────────────────────

export function KeyFactsStrip({ accentColor, facts }: {
  accentColor: string
  facts: Array<{ value: string; label: string; sublabel?: string }>
}) {
  return (
    <ScrollReveal className="my-10">
      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: `1px solid var(--color-border)`,
          background: `linear-gradient(135deg, ${accentColor}06, transparent 70%)`,
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {facts.map((f, i) => (
            <div key={i} className="px-5 py-5 sm:py-6">
              <div
                className="font-extrabold tabular-nums leading-[0.95] tracking-[-0.02em] mb-1"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: accentColor,
                  fontSize: 'clamp(28px, 4vw, 36px)',
                }}
              >
                {f.value}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mb-0.5">
                {f.label}
              </div>
              {f.sublabel && (
                <div className="text-[11px] text-text-secondary leading-[1.45]">
                  {f.sublabel}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  )
}

// ── AtlasLink — CTA that opens /atlas with prefilled state matching the
//   story chapter. Lets readers jump from a story chapter to the live
//   constellation showing the same pattern/year/cluster. ───────────────

function AtlasLink({
  accentColor,
  lens,
  year,
  pin,
  caption,
  lang,
}: {
  accentColor: string
  lens?: 'patterns' | 'sectors' | 'categories' | 'sexenios'
  year?: number
  pin?: string
  caption: { en: string; es: string }
  lang: 'en' | 'es'
}) {
  const params = new URLSearchParams()
  if (lens) params.set('lens', lens)
  if (year) params.set('year', String(year))
  if (pin) params.set('pin', pin)
  const href = `/atlas${params.toString() ? '?' + params.toString() : ''}`
  return (
    <ScrollReveal className="my-8">
      <Link
        to={href}
        className="block rounded-lg p-5 transition-opacity hover:opacity-90"
        style={{
          background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}03 60%)`,
          border: `1px solid ${accentColor}40`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5"
              style={{ color: accentColor }}
            >
              ◆ {lang === 'en' ? 'OPEN THE OBSERVATORY' : 'ABRIR EL OBSERVATORIO'}
            </div>
            <p className="text-[13px] text-text-primary leading-[1.55]">
              {caption[lang]}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
        </div>
      </Link>
    </ScrollReveal>
  )
}

// ── Decorative chapter divider (sits between chapters) ────────────────────

function ChapterDivider({ accentColor }: { accentColor: string }) {
  return (
    <div className="my-16 flex items-center justify-center" aria-hidden="true">
      <span
        className="block h-px w-12 opacity-40"
        style={{ background: accentColor }}
      />
      <span
        className="mx-3 h-1.5 w-1.5 rounded-full opacity-70"
        style={{ background: accentColor }}
      />
      <span
        className="block h-px w-12 opacity-40"
        style={{ background: accentColor }}
      />
    </div>
  )
}

// ── Variant: HERO (chapter 1) ─────────────────────────────────────────────

function HeroChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t } = useTranslation('common')
  const paddedNumber = String(chapter.number).padStart(2, '0')
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-20 relative"
    >
      {/* Editorial backdrop — soft accent gradient */}
      <div
        className="absolute inset-x-0 top-0 h-[460px] -z-10 pointer-events-none rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${accentColor}12 0%, transparent 100%)`,
        }}
      >
        {/* Decorative procurement-themed SVG artwork — sits faintly behind the title */}
        <div className="absolute inset-0 opacity-60">
          <HeroArtwork accentColor={accentColor} variant="cluster" />
        </div>
      </div>

      <ScrollReveal>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-10 relative">
          {/* Massive watermark numeral */}
          <span
            className="absolute -top-2 right-2 sm:right-8 select-none pointer-events-none font-extrabold leading-none"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(180px, 28vw, 360px)',
              color: accentColor,
              opacity: 0.07,
              letterSpacing: '-0.04em',
            }}
            aria-hidden="true"
          >
            {paddedNumber}
          </span>

          {/* Top eyebrow */}
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold mb-4"
            style={{ color: accentColor }}
          >
            {t('storyType.chapter', 'Chapter')} {paddedNumber}
            {story.era && (
              <>
                <span className="mx-2 opacity-50">·</span>
                <span className="text-text-muted">{getEraLabel(story.era, t)}</span>
              </>
            )}
          </p>

          {/* Massive editorial title */}
          <h2
            className="text-[40px] sm:text-[56px] md:text-[68px] leading-[1.05] tracking-[-0.02em] font-extrabold text-text-primary mb-5 text-balance"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {chapter.title}
          </h2>

          {chapter.subtitle && (
            <p className="text-lg sm:text-xl text-text-secondary leading-[1.5] mb-10 text-pretty max-w-3xl">
              {chapter.subtitle}
            </p>
          )}
        </div>
      </ScrollReveal>

      {/* Lede paragraph with drop cap + remaining body */}
      <div className="max-w-prose mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p
              className={cn(
                'text-text-primary leading-[1.75] mb-6',
                i === 0 ? 'text-[19px] hero-dropcap' : 'text-[17px] text-text-secondary',
              )}
              style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
            >
              {paragraph}
            </p>
          </ScrollReveal>
        ))}

        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}

        {/* Hero stat callout — if pullquote exists, render it as a hero-sized
            breakout below the lede. */}
        {chapter.pullquote && (
          <ScrollReveal className="my-10">
            {renderPullquote(chapter, story)}
          </ScrollReveal>
        )}

        {/* Chart, if any — wider than text column */}
        {chapter.chartConfig && (
          <div className="my-10 -mx-4 sm:mx-[-10%] md:mx-[-15%]">
            {renderChartBlock(chapter, '')}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Variant: FEATURE (rich content chapter) ───────────────────────────────

function FeatureChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t } = useTranslation('common')
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-20"
    >
      <ChapterBanner
        number={chapter.number}
        title={chapter.title}
        subtitle={chapter.subtitle}
        era={story.era ? getEraLabel(story.era, t) : undefined}
        color={accentColor}
      />

      {/* Two-column layout on desktop: prose + breakout pullquote */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6">
        {/* Body column */}
        <div className="lg:col-span-7 lg:col-start-1">
          {chapter.prose.map((paragraph, i) => (
            <ScrollReveal key={i} delay={i * 60}>
              <p
                className={cn(
                  'text-text-primary leading-[1.75] mb-5 text-[17px]',
                  i === 0 && 'feature-dropcap',
                )}
                style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
              >
                {paragraph}
              </p>
            </ScrollReveal>
          ))}
          {chapter.sources && chapter.sources.length > 0 && (
            <ChapterSources sources={chapter.sources} />
          )}
        </div>

        {/* Sidebar pullquote — sticky on desktop, breaks out of grid */}
        {chapter.pullquote && (
          <aside className="lg:col-span-5 lg:col-start-8">
            <ScrollReveal className="lg:sticky lg:top-24">
              {renderPullquote(chapter, story)}
            </ScrollReveal>
          </aside>
        )}
      </div>

      {/* Chart spans full editorial width below */}
      {chapter.chartConfig && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          {renderChartBlock(chapter, '')}
        </div>
      )}
    </section>
  )
}

// ── Variant: DATA-SPOTLIGHT (chart-driven chapter) ────────────────────────

function DataSpotlightChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-20"
    >
      <ChapterBanner
        number={chapter.number}
        title={chapter.title}
        subtitle={chapter.subtitle}
        era={story.era ? getEraLabel(story.era, t) : undefined}
        color={accentColor}
      />

      {/* Brief lede in normal column */}
      <div className="max-w-prose mx-auto px-4 sm:px-0 mb-8">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p
              className={cn(
                'text-text-primary leading-[1.75] mb-5 text-[17px]',
                i === 0 && 'feature-dropcap',
              )}
              style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
            >
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}
      </div>

      {/* Chart breakout — wider than prose */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div
            className="rounded-lg p-1 sm:p-2"
            style={{
              background: `linear-gradient(135deg, ${accentColor}15, transparent 60%)`,
              borderTop: `2px solid ${accentColor}`,
            }}
          >
            {renderChartBlock(chapter, 'p-3 sm:p-5 bg-background rounded-md')}
          </div>
        </ScrollReveal>
      </div>

      {/* Optional pullquote at bottom */}
      {chapter.pullquote && (
        <div className="max-w-prose mx-auto px-4 sm:px-0 mt-10">
          <ScrollReveal>
            {renderPullquote(chapter, story)}
          </ScrollReveal>
        </div>
      )}

      {/* Connect to live Atlas — readers can manipulate the data themselves */}
      <div className="max-w-prose mx-auto px-4 sm:px-0">
        <AtlasLink
          accentColor={accentColor}
          lens="patterns"
          lang={lang}
          caption={{
            en: 'Explore this chart\'s data live in The Observatory — toggle lenses, scrub years.',
            es: 'Explora los datos de este gráfico en vivo en El Observatorio — alterna lentes, desplaza años.',
          }}
        />
      </div>
    </section>
  )
}

// ── Variant: QUOTE-SPOTLIGHT (quote-driven chapter) ───────────────────────

function QuoteSpotlightChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t } = useTranslation('common')
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-20"
    >
      <ChapterBanner
        number={chapter.number}
        title={chapter.title}
        subtitle={chapter.subtitle}
        era={story.era ? getEraLabel(story.era, t) : undefined}
        color={accentColor}
      />

      {/* Brief context */}
      <div className="max-w-prose mx-auto px-4 sm:px-0 mb-10">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p className="text-text-primary leading-[1.75] mb-5 text-[17px]">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
      </div>

      {/* Massive Playfair italic quote — wider breakout */}
      {chapter.pullquote && (
        <ScrollReveal>
          <figure
            className="max-w-4xl mx-auto px-4 sm:px-6 my-10"
            aria-label={t('storyType.pullquote', 'Pull quote')}
          >
            <div
              className="relative pl-6 sm:pl-10 pr-4 py-6"
              style={{ borderLeft: `4px solid ${accentColor}` }}
            >
              {/* Decorative open-quote */}
              <span
                className="absolute -top-4 -left-2 select-none pointer-events-none"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 80,
                  lineHeight: 1,
                  color: accentColor,
                  opacity: 0.25,
                }}
                aria-hidden="true"
              >“</span>
              <blockquote
                className="text-[26px] sm:text-[34px] md:text-[40px] leading-[1.18] tracking-[-0.01em] font-medium italic text-text-primary text-balance"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {chapter.pullquote.quote}
              </blockquote>
              {chapter.pullquote.stat && (
                <div className="mt-6 pt-4 border-t border-border/60 flex items-baseline gap-4">
                  <div
                    className="font-extrabold tabular-nums leading-none flex-shrink-0"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: accentColor,
                      fontSize: 36,
                    }}
                  >
                    {chapter.pullquote.stat}
                  </div>
                  {chapter.pullquote.statLabel && (
                    <p className="text-sm text-text-muted leading-[1.5]">
                      {chapter.pullquote.statLabel}
                    </p>
                  )}
                </div>
              )}
            </div>
          </figure>
        </ScrollReveal>
      )}

      {/* Source citations remain available */}
      {chapter.sources && chapter.sources.length > 0 && (
        <div className="max-w-prose mx-auto px-4 sm:px-0">
          <ChapterSources sources={chapter.sources} />
        </div>
      )}
    </section>
  )
}

// ── Variant: CONNECTIVE (short transitional chapter) ──────────────────────

function ConnectiveChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t } = useTranslation('common')
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-16"
    >
      {/* Smaller chapter marker, no big banner */}
      <div className="max-w-prose mx-auto px-4 sm:px-0 mb-6">
        <ScrollReveal>
          <div className="flex items-baseline gap-3 mb-2">
            <span
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: accentColor }}
            >
              {t('storyType.chapter', 'Chapter')} {String(chapter.number).padStart(2, '0')}
            </span>
            {story.era && (
              <span className="text-[10px] text-text-muted">
                · {getEraLabel(story.era, t)}
              </span>
            )}
          </div>
          <h2
            className="text-[24px] sm:text-[28px] leading-[1.2] font-bold text-text-primary mb-4 text-balance"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {chapter.title}
          </h2>
        </ScrollReveal>
      </div>

      {/* Narrow column for connective tissue */}
      <div className="max-w-[55ch] mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p className="text-text-secondary leading-[1.75] mb-5 text-[17px] italic">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}
      </div>
    </section>
  )
}

// ── Variant: CLOSING (final chapter) ──────────────────────────────────────

function ClosingChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  return (
    <section
      id={`chapter-${chapter.id}`}
      aria-label={`${t('storyType.chapter', 'Chapter')} ${chapter.number}: ${chapter.title}`}
      className="mb-12 relative"
    >
      <div
        className="absolute inset-x-0 top-0 h-[280px] -z-10 pointer-events-none rounded-lg"
        style={{
          background: `linear-gradient(180deg, ${accentColor}08 0%, transparent 100%)`,
        }}
      />

      <ScrollReveal>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-6">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-4"
            style={{ color: accentColor }}
          >
            ◆ {t('storyType.closing', 'Closing')} · {t('storyType.chapter', 'Chapter')} {String(chapter.number).padStart(2, '0')}
          </p>
          <h2
            className="text-[32px] sm:text-[44px] md:text-[52px] leading-[1.08] tracking-[-0.015em] font-extrabold text-text-primary mb-4 text-balance"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {chapter.title}
          </h2>
          {chapter.subtitle && (
            <p className="text-lg text-text-secondary leading-[1.55] mb-8 text-pretty">
              {chapter.subtitle}
            </p>
          )}
        </div>
      </ScrollReveal>

      <div className="max-w-prose mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p
              className={cn(
                'text-text-primary leading-[1.75] mb-5 text-[17px] sm:text-[18px]',
                i === 0 && 'feature-dropcap',
              )}
              style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
            >
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}
      </div>

      {chapter.pullquote && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
          <ScrollReveal>
            {renderPullquote(chapter, story)}
          </ScrollReveal>
        </div>
      )}

      {chapter.chartConfig && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
          {renderChartBlock(chapter, '')}
        </div>
      )}

      {/* Closing CTA — link to live Atlas. The story has named patterns / years
          / clusters; the Atlas is where readers can manipulate them live. */}
      <div className="max-w-prose mx-auto px-4 sm:px-0">
        <AtlasLink
          accentColor={accentColor}
          lens="patterns"
          lang={lang}
          caption={{
            en: 'Open this story\'s patterns live in The Observatory — scrub years, pin clusters, run your own investigation.',
            es: 'Abre los patrones de esta historia en vivo en El Observatorio — desplaza años, fija cúmulos, lleva tu propia investigación.',
          }}
        />
      </div>
    </section>
  )
}

// ── Variant: STANDARD (current default, refined) ──────────────────────────

function StandardChapter({ chapter, story, accentColor }: ChapterRenderProps) {
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
            <p
              className={cn(
                'text-text-primary leading-[1.75] mb-5 text-[17px]',
                i === 0 && 'feature-dropcap',
              )}
              style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
            >
              {paragraph}
            </p>
          </ScrollReveal>
        ))}

        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} />
        )}

        {chapter.chartConfig && renderChartBlock(chapter)}
        {chapter.pullquote && (
          <div className="my-10">
            <ScrollReveal>{renderPullquote(chapter, story)}</ScrollReveal>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Top-level dispatcher ──────────────────────────────────────────────────

interface ChapterRenderProps {
  chapter: StoryChapterDef
  story: StoryDef
  accentColor: string
}

function ChapterSection({
  chapter,
  story,
  accentColor,
  variant,
}: ChapterRenderProps & { variant: ChapterVariant }) {
  // Build a language-localized projection of the chapter, with EN fallback when
  // _es fields are absent. All variant components consume this object's
  // resolved title/subtitle/prose/pullquote — they don't see the raw chapter.
  const { i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const localized = localizeChapter(chapter, lang)
  // Wire the resolved fields back onto a chapter-shaped object so existing
  // variant code keeps working without per-variant edits.
  const localizedChapter: StoryChapterDef = {
    ...chapter,
    title: localized.title,
    subtitle: localized.subtitle,
    prose: localized.prose,
    pullquote: localized.pullquote,
  }
  switch (variant) {
    case 'hero':            return <HeroChapter            chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'feature':         return <FeatureChapter         chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'data-spotlight':  return <DataSpotlightChapter   chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'quote-spotlight': return <QuoteSpotlightChapter  chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'connective':      return <ConnectiveChapter      chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'closing':         return <ClosingChapter         chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'standard':
    default:                return <StandardChapter        chapter={localizedChapter} story={story} accentColor={accentColor} />
  }
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
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  // V7: pull bilingual headline / subheadline / leadStat label from the story's
  // optional _es fields, falling back to English when missing.
  const ls = localizeStory(story, lang)
  // Then localize the lead stat VALUE itself to Mexican format
  const localizedValue = localizeAmount(story.leadStat.value, lang)
  const localizedSublabel = ls.leadStatSublabel
    ? localizeAmount(ls.leadStatSublabel, lang)
    : undefined
  const parsed = parseLeadStat(localizedValue)

  return (
    <header className="relative bg-background overflow-hidden border-b border-border" role="banner">
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
          {ls.headline}
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
          {ls.subheadline}
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

        {/* Kicker stats — per-story 3-row punchline. Falls through to leadStat
            when story.kickerStats is undefined. */}
        {story.kickerStats && story.kickerStats.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="mb-8 space-y-1"
          >
            {story.kickerStats.map((stat, idx) => {
              const valueColor =
                stat.tone === 'critical'
                  ? 'var(--color-risk-critical)'
                  : stat.tone === 'data'
                    ? 'var(--color-accent)'
                    : 'var(--color-text-primary)'
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.35 + idx * 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-baseline gap-x-2"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {stat.prefix && (
                    <span
                      className="text-text-secondary italic"
                      style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)' }}
                    >
                      {stat.prefix}
                    </span>
                  )}
                  <span
                    className="font-bold tabular-nums leading-none"
                    style={{
                      fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                      letterSpacing: '-0.035em',
                      color: valueColor,
                    }}
                  >
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span
                      className="text-text-secondary italic"
                      style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)' }}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="mb-8"
        >
          {/*
            Lead-stat color comes from story-content.ts as a hex string
            (e.g. "#dc2626"). The previous version applied it via cn() as if
            it were a Tailwind class — `cn('...', '#dc2626')` produces the
            literal class name "#dc2626", which the runtime ignores, so the
            number inherited link blue or accent amber from a parent. Apply
            it as an inline style instead. Match the dashboard tile rhythm:
            Playfair Italic 800 instead of plain bold serif.
          */}
          <div
            className="tabular-nums"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: story.leadStat.color,
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
              <span>{localizedValue}</span>
            )}
          </div>
          <p className="text-text-secondary text-base mt-2">{ls.leadStatLabel}</p>
          {localizedSublabel && (
            <p className="text-text-muted text-sm mt-1">{localizedSublabel}</p>
          )}
        </motion.div>
        )}

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
    <div className="min-h-screen bg-background">
      {/* Sticky header: back link + reading progress */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
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
      {/* Wider container so hero/feature/data-spotlight variants can breakout */}
      <main className="relative max-w-6xl mx-auto px-2 sm:px-4 pt-16">
        <Act number="I" label="THE INVESTIGATION" className="space-y-0">
          {story.chapters.map((chapter, idx) => {
            const variant = pickChapterVariant(chapter, idx, story.chapters.length)
            return (
              <div key={chapter.id}>
                <ChapterSection
                  chapter={chapter}
                  story={story}
                  accentColor={accentColor}
                  variant={variant}
                />
                {/* Decorative divider between chapters (skip after last) */}
                {idx < story.chapters.length - 1 && variant !== 'hero' && (
                  <ChapterDivider accentColor={accentColor} />
                )}
              </div>
            )
          })}
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
