/**
 * StoryNarrative — Individual story page.
 *
 * Renders a full investigative journalism piece from the static STORIES array.
 * Dark-mode immersive reading experience with scroll-driven animations,
 * chapter banners, data pullquotes, and inline prose stats.
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Clock, ArrowLeft, ExternalLink, Share2, ArrowRight, ChevronRight, FileText } from 'lucide-react'
import { getStoryBySlug, getRelatedStories, localizeChapter, localizeStory } from '@/lib/story-content'
import type { StoryChapterDef, StoryChartLive, StoryDef, StoryStatus } from '@/lib/story-content'
import type { GapFigureKind } from '@/components/stories/live/GapFigures'
import type { EmergencyFigureKind } from '@/components/stories/live/EmergencyFigures'
import type { VoucherFigureKind } from '@/components/stories/live/VoucherFigures'
import type { CaptureFigureKind } from '@/components/stories/live/CaptureFigures'
import type { IntermediaryFigureKind } from '@/components/stories/live/IntermediaryFigures'
import type { GhostFigureKind } from '@/components/stories/live/GhostFigures'
import type { ThresholdFigureKind } from '@/components/stories/live/ThresholdFigures'
import type { CompetitionFigureKind } from '@/components/stories/live/CompetitionFigures'
import { StickyStepFrame, useProseStage } from '@/components/stories/live/StickyStepFigure'
import { findStoryByLongformSlug } from '@/lib/atlas-stories'
import { OutletBadge } from '@/components/stories/OutletBadge'
import ChapterBanner from '@/components/stories/ChapterBanner'
import DataPullquote, { type PullquoteRole } from '@/components/stories/DataPullquote'
import ProseStat from '@/components/stories/ProseStat'
import { StoryCard } from '@/components/stories/StoryCard'
import { ScrollReveal, AnimatedNumber } from '@/hooks/useAnimations'
import { slideUp, fadeIn, staggerContainer } from '@/lib/animations'
import { cn, localizeAmount } from '@/lib/utils'
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
  InlineRoster,
  InlineTimeline,
  ThresholdDistribution as EditorialThreshold,
  AnnotatedThermometer as EditorialThermometer,
  ClevelandPairChart as EditorialClevelandPair,
} from '@/components/stories/InlineCharts'
import VendorPriceTrajectory from '@/components/stories/VendorPriceTrajectory'
import VennConvergence from '@/components/stories/VennConvergence'
import type { StoryInlineChartData } from '@/lib/story-content'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import { useIsMobile } from '@/hooks/useIsMobile'

// ---------------------------------------------------------------------------
// Inline chart map — type string → component
// ---------------------------------------------------------------------------

type InlineChartComponent = React.ComponentType<{ data: StoryInlineChartData; title: string; lang?: 'en' | 'es' }>

const INLINE_CHART_MAP: Record<string, InlineChartComponent> = {
  'inline-dot-grid': InlineDotGrid,
  'inline-bar': InlineBarChart,
  'inline-line': InlineLineChart,
  'inline-area': InlineAreaChart,
  'inline-spike': InlineSpikeChart,
  'inline-diverging': InlineDivergingBar,
  'inline-roster': InlineRoster,
  'inline-timeline': InlineTimeline,
  'editorial-threshold':      EditorialThreshold,
  'editorial-thermometer':    EditorialThermometer,
  'editorial-cleveland-pair': EditorialClevelandPair,
}

// ---------------------------------------------------------------------------
// Live figures — API-backed plates (STORY_DAYS principle 2).
//
// One lazy chunk PER STORY, not per figure: a story's figures always render on
// the same page and share their queries, so a chunk each would be N requests
// for one page. A chunk is only fetched by a story that declares a `live` kind
// from its family — an `el-vacio` reader never downloads SD-02's figures.
// ---------------------------------------------------------------------------

const LiveGapFigure = lazy(() => import('@/components/stories/live/GapFigures'))
const LiveEmergencyFigure = lazy(() => import('@/components/stories/live/EmergencyFigures'))
const LiveVoucherFigure = lazy(() => import('@/components/stories/live/VoucherFigures'))
const LiveCaptureFigure = lazy(() => import('@/components/stories/live/CaptureFigures'))
const LiveIntermediaryFigure = lazy(() => import('@/components/stories/live/IntermediaryFigures'))
const LiveGhostFigure = lazy(() => import('@/components/stories/live/GhostFigures'))
const LiveThresholdFigure = lazy(() => import('@/components/stories/live/ThresholdFigures'))
const LiveCompetitionFigure = lazy(() => import('@/components/stories/live/CompetitionFigures'))

/** Route a `chartConfig.live` kind to the story family that owns it. */
function LiveFigure({
  kind,
  lang,
  stage,
}: {
  kind: NonNullable<StoryChartLive>
  lang: 'en' | 'es'
  stage?: number
}) {
  if (kind.startsWith('covid-')) {
    return <LiveEmergencyFigure kind={kind as EmergencyFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('vales-')) {
    return <LiveVoucherFigure kind={kind as VoucherFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('capture-')) {
    return <LiveCaptureFigure kind={kind as CaptureFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('p3-')) {
    return <LiveIntermediaryFigure kind={kind as IntermediaryFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('p2-')) {
    return <LiveGhostFigure kind={kind as GhostFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('threshold-')) {
    return <LiveThresholdFigure kind={kind as ThresholdFigureKind} lang={lang} stage={stage} />
  }
  if (kind.startsWith('sb-')) {
    return <LiveCompetitionFigure kind={kind as CompetitionFigureKind} lang={lang} stage={stage} />
  }
  return <LiveGapFigure kind={kind as GapFigureKind} lang={lang} stage={stage} />
}

/** Suspense fallback — holds the ChartCard's shape while the chunk loads. */
function LiveFigureSkeleton({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div
      role="status"
      aria-label={lang === 'es' ? 'Cargando la figura en vivo' : 'Loading the live figure'}
      className="w-full h-[320px] my-8 bg-background-card motion-safe:animate-pulse"
      style={{
        border: '1px solid var(--color-border)',
        borderLeft: '3px solid var(--color-accent)',
        borderRadius: 2,
      }}
    />
  )
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

function ChapterSources({ sources, chapterId }: { sources: string[]; chapterId: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation('common')
  // aria-controls names the list the toggle opens; without it a screen-reader
  // user hears "expanded" with no way to know what expanded.
  const listId = `sources-${chapterId}`
  return (
    <div className="mt-8 mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors group"
        aria-expanded={open}
        aria-controls={listId}
      >
        <FileText className="h-3 w-3 group-hover:text-text-secondary" aria-hidden="true" />
        <span className="font-mono">{open ? '−' : '+'}</span>
        <span>{t('story.sources', { count: sources.length })}</span>
        <span className="text-text-primary">&mdash; {open ? t('story.collapse') : t('story.viewCitations')}</span>
      </button>
      {open && (
        <ol id={listId} className="mt-3 space-y-1.5 border-l-2 border-border pl-4">
          {sources.map((s, i) => (
            <li key={i} className="text-[13px] text-text-muted font-mono leading-relaxed">
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
  // A live figure added to an existing chapter must not re-flow it: the layout
  // a chapter was authored into is part of the story's rhythm, and SD-01 adds
  // live plates to chapters that were laid out before the plates existed. Only
  // a typed chart — the shape the variants were tuned against — moves a
  // chapter between variants.
  const hasChart = !!chapter.chartConfig && chapter.chartConfig.type !== 'live'
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

/** The typed inline figure only — `renderChartBlock` adds the live one around it. */
function renderTypedChartBlock(
  chapter: StoryChapterDef,
  className = 'my-8',
  lang: 'en' | 'es' = 'en',
) {
  if (!chapter.chartConfig) return null
  const cfg = chapter.chartConfig
  if (cfg.type === 'live') return null
  // Multi-series and network charts have their own data shapes — dispatch
  // before the InlineChartMap which only handles StoryInlineChartData.
  // Both the title and `lang` go through: these three branches used to pass
  // the English title and, for multi-line and network, no language at all, so
  // a Spanish reader got English chart titles, axis labels and annotations on
  // charts whose renderers already had the Spanish strings.
  const chartTitle = lang === 'es' ? (cfg.title_es ?? cfg.title) : cfg.title
  if (cfg.type === 'inline-multi-line' && cfg.multiSeries) {
    return (
      <ScrollReveal className={className}>
        <InlineMultiLine data={cfg.multiSeries} title={chartTitle} lang={lang} />
      </ScrollReveal>
    )
  }
  if (cfg.type === 'inline-network' && cfg.network) {
    return (
      <ScrollReveal className={className}>
        <InlineNetwork data={cfg.network} title={chartTitle} lang={lang} />
      </ScrollReveal>
    )
  }
  if (cfg.type === 'inline-stacked-bar' && cfg.stacked) {
    return (
      <ScrollReveal className={className}>
        <InlineStackedBar data={cfg.stacked} title={chartTitle} lang={lang} />
      </ScrollReveal>
    )
  }
  // Volatilidad story — two self-contained illustrative charts that carry no
  // data payload in story-content.ts. They used to resolve through the lazy
  // CHART_REGISTRY, which rendered them prop-less and so pinned them to their
  // Spanish default on the English page; dispatching here passes `lang`.
  if (cfg.type === 'vendor-price-trajectory') {
    return (
      <ScrollReveal className={className}>
        <VendorPriceTrajectory lang={lang} />
      </ScrollReveal>
    )
  }
  if (cfg.type === 'venn-convergence') {
    return (
      <ScrollReveal className={className}>
        <VennConvergence lang={lang} />
      </ScrollReveal>
    )
  }
  if (cfg.data) {
    const InlineChart = INLINE_CHART_MAP[cfg.type]
    return (
      <ScrollReveal className={className}>
        {InlineChart ? (
          <InlineChart data={cfg.data} title={lang === 'es' ? (cfg.title_es ?? cfg.title) : cfg.title} lang={lang} />
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
  // No inline renderer matched — keep the labelled placeholder so the chapter
  // still announces the figure it was meant to carry.
  return (
    <ScrollReveal className={className}>
      <div
        className="bg-background-card rounded-sm p-6 text-text-muted text-sm text-center"
        role="img"
        aria-label={cfg.title}
      >
        {cfg.title}
      </div>
    </ScrollReveal>
  )
}

/**
 * A chapter's figures: up to two live plates (`chartConfig.live` and `live2`)
 * and the typed inline chart (when `chartConfig.data` is set). A chapter may
 * carry all three — SD-01 ch3 opens with its typed procedure bar and closes
 * with the live exception catalog (`liveAfter`), while SD-02 ch2 and ch3 each
 * carry two live figures and no typed one.
 *
 * `live2` always renders last: it is the chapter's second exhibit, so it reads
 * after both the first plate and whatever typed figure sits between them.
 */
function renderChartBlock(
  chapter: StoryChapterDef,
  className = 'my-8',
  lang: 'en' | 'es' = 'en',
  stage?: number,
  /**
   * `primary` is the first live plate alone — what a scrolly chapter pins in
   * its sticky frame; `secondary` is everything that follows it, rendered in
   * normal flow below the prose. Omitted, the chapter renders all of it.
   */
  only?: 'primary' | 'secondary',
) {
  const cfg = chapter.chartConfig
  if (!cfg) return null
  const plate = (kind: NonNullable<StoryChartLive>, withStage: boolean) => (
    <ScrollReveal key={kind} className={className}>
      <Suspense fallback={<LiveFigureSkeleton lang={lang} />}>
        <LiveFigure kind={kind} lang={lang} stage={withStage ? stage : undefined} />
      </Suspense>
    </ScrollReveal>
  )
  const live = cfg.live ? plate(cfg.live, true) : null
  if (only === 'primary') return live
  const typed = renderTypedChartBlock(chapter, className, lang)
  const second = cfg.live2 ? plate(cfg.live2, false) : null
  if (only === 'secondary') return second
  if (!live) return typed
  if (!typed && !second) return live
  return (
    <>
      {cfg.liveAfter ? typed : live}
      {cfg.liveAfter ? live : typed}
      {second}
    </>
  )
}

// Derive the pull-quote role from the chapter variant + content shape, so a
// story that shows several figures never stamps the same box twice in a row.
function pickPullquoteRole(
  pq: NonNullable<StoryChapterDef['pullquote']>,
  variant: ChapterVariant,
  isFirst: boolean,
): PullquoteRole {
  if (pq.role) return pq.role
  if (variant === 'closing') return 'verdict'
  if (pq.barValue !== undefined) return 'plate'
  if (variant === 'hero' || (variant === 'feature' && isFirst)) return 'ledger'
  return 'margin'
}

function renderPullquote(
  chapter: StoryChapterDef,
  story: StoryDef,
  className = '',
  isFirst = false,
  variant: ChapterVariant = 'standard',
) {
  if (!chapter.pullquote) return null
  const role = pickPullquoteRole(chapter.pullquote, variant, isFirst)
  return (
    <div className={className}>
      <DataPullquote
        quote={chapter.pullquote.quote}
        stat={chapter.pullquote.stat}
        statLabel={chapter.pullquote.statLabel}
        barValue={chapter.pullquote.barValue}
        barLabel={chapter.pullquote.barLabel}
        barLabel_es={chapter.pullquote.barLabel_es}
        outlet={story.outlet}
        statColor={story.leadStat.color}
        vizTemplate={chapter.pullquote.vizTemplate}
        role={role}
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
          Array.from({ length: 12 }).map((_, col) => {
            // Deterministic per-cell jitter (stable across renders). Was
            // Math.random(), which re-randomized every paint and faked data
            // variation — a sanctioned decorative backdrop must still be stable.
            const s = Math.sin((row * 12 + col + 1) * 12.9898) * 43758.5453
            const jitter = s - Math.floor(s)
            return (
              <rect
                key={`${row}-${col}`}
                x={20 + col * 44}
                y={16 + row * 30}
                width={36}
                height={22}
                fill={accentColor}
                opacity={0.05 + jitter * 0.18}
                rx={1}
              />
            )
          })
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
              className="text-[12px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5"
              style={{ color: accentColor }}
            >
              ◆ {lang === 'en' ? 'OPEN THE OBSERVATORY' : 'ABRIR EL OBSERVATORIO'}
            </div>
            <p className="text-[13px] text-text-primary leading-[1.55]">
              {caption[lang]}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} aria-hidden="true" />
        </div>
      </Link>
    </ScrollReveal>
  )
}

// ── ObservatoryTrailerCTA — surfaces the matching atlas-tour for stories
//   that have one. Renders inside Act III so the reader, having finished
//   the analytical article, can opt into the 55-second visual trailer of
//   the same investigation. Hidden when no atlas tour is paired. ────────

function ObservatoryTrailerCTA({ longformSlug, lang }: { longformSlug: string; lang: 'en' | 'es' }) {
  const tour = findStoryByLongformSlug(longformSlug)
  if (!tour) return null
  const href = `/atlas?story=${tour.id}`
  const headline = lang === 'en'
    ? 'Watch this investigation in the Atlas'
    : 'Mira esta investigación en El Atlas'
  const body = lang === 'en'
    ? `${tour.duration} · ${tour.chapters.length} chapters · the visual trailer for the article you just read.`
    : `${tour.duration} · ${tour.chapters.length} capítulos · el tráiler visual del artículo que acabas de leer.`
  return (
    <ScrollReveal className="my-2">
      <Link
        to={href}
        className="block rounded-sm p-5 transition-opacity hover:opacity-90"
        style={{
          background: `linear-gradient(135deg, ${tour.accent}10, ${tour.accent}03 60%)`,
          border: `1px solid ${tour.accent}40`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-[12px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5"
              style={{ color: tour.accent }}
            >
              ◆ {lang === 'en' ? 'OBSERVATORY TOUR' : 'TOUR DEL OBSERVATORIO'}
            </div>
            <h4
              className="text-[18px] md:text-[20px] font-bold text-text-primary leading-[1.2] mb-1"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {headline}
            </h4>
            <p className="text-[12px] font-mono text-text-muted leading-[1.5]">
              {body}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 flex-shrink-0" style={{ color: tour.accent }} aria-hidden="true" />
        </div>
      </Link>
    </ScrollReveal>
  )
}

// ── Decorative chapter divider (sits between chapters) ────────────────────

// Sexenio-trajectory era strip — used as the chapter divider on
// "el-sexenio-del-riesgo". 4 administration segments at proportional widths
// (years governed), colored by their model-measured high-risk rate. A tick
// marks "you are here" (AMLO, since the story is about the AMLO sexenio).
// Encodes the chapter-1 thesis ("every admin since Fox has been riskier")
// directly into the chrome between chapters.
const SEXENIO_ERA_STRIP_STORY_SLUG = 'el-sexenio-del-riesgo'

function ChapterDivider({
  accentColor,
  storySlug,
}: {
  accentColor: string
  storySlug?: string
}) {
  const { i18n } = useTranslation('common')
  const isEs = i18n.language.startsWith('es')

  if (storySlug === SEXENIO_ERA_STRIP_STORY_SLUG) {
    // 4 administrations · width proportional to years governed · color by
    // RISK_COLORS bucket derived from the admin-era high-risk rate.
    // Fox 7.5% → low (zinc), Calderón 8.2% → low, Peña 11.2% → medium,
    // AMLO 12.6% → medium. Forces visual hierarchy so AMLO reads as the
    // emphasized segment via the "you are here" tick + accent ring.
    const eras: Array<{
      code: string
      label: string
      years: string
      span: number
      rate: number
      color: string
    }> = [
      { code: 'fox',      label: 'Fox',      years: '00–06',                                     span: 6, rate: 7.5,  color: RISK_COLORS.low },
      { code: 'calderon', label: 'Calderón', years: '06–12',                                     span: 6, rate: 8.2,  color: RISK_COLORS.low },
      { code: 'pena',     label: 'Peña',     years: '12–18',                                     span: 6, rate: 11.2, color: RISK_COLORS.medium },
      { code: 'amlo',     label: 'AMLO',     years: '18–24',                                     span: 6, rate: 12.6, color: RISK_COLORS.medium },
    ]
    const totalSpan = eras.reduce((s, e) => s + e.span, 0)
    const youAreHere = 'amlo'
    return (
      <div className="my-12 max-w-[760px] mx-auto px-4 sm:px-0" aria-hidden="true">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[13px] font-mono uppercase tracking-[0.18em]"
            style={{ color: accentColor }}
          >
            {isEs ? '◆ Trayectoria sexenal · tasa alto riesgo v0.8.5' : '◆ Sexenio trajectory · high-risk rate v0.8.5'}
          </span>
          <span className="text-[13px] font-mono uppercase tracking-[0.18em] text-text-muted">
            {isEs ? 'aquí ▼' : 'you are here ▼'}
          </span>
        </div>

        {/* Era segments */}
        <div className="flex w-full gap-0.5 h-2.5">
          {eras.map((e) => {
            const isHere = e.code === youAreHere
            return (
              <div
                key={e.code}
                className="relative"
                style={{ flexBasis: `${(e.span / totalSpan) * 100}%` }}
              >
                <div
                  className="h-full rounded-sm"
                  style={{
                    background: e.color,
                    opacity: isHere ? 0.95 : 0.55,
                    outline: isHere ? `2px solid ${accentColor}` : 'none',
                    outlineOffset: isHere ? 1 : 0,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Labels under each segment */}
        <div className="flex w-full gap-0.5 mt-1.5">
          {eras.map((e) => {
            const isHere = e.code === youAreHere
            return (
              <div
                key={e.code}
                className="flex flex-col items-center"
                style={{ flexBasis: `${(e.span / totalSpan) * 100}%` }}
              >
                <span
                  className="text-[12px] font-mono uppercase tracking-[0.12em]"
                  style={{
                    color: isHere ? accentColor : 'var(--color-text-muted)',
                    fontWeight: isHere ? 700 : 400,
                  }}
                >
                  {e.label}
                </span>
                <span
                  className="font-mono tabular-nums text-[12px]"
                  style={{ color: isHere ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {e.rate.toFixed(1)}%
                </span>
                <span className="text-[13px] font-mono text-text-muted/70">
                  {e.years}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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

// ── Variant: HERO (chapter 1) ─────────────────────────────────

/** Both stepped figures shipped so far draw in four beats (0–3). */
const STEP_MAX_STAGE = 3

function HeroChapter({ chapter, story, accentColor }: ChapterRenderProps) {
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const paddedNumber = String(chapter.number).padStart(2, '0')
  // SD-01 F1 — the blackout diagram is drawn in beats as the hero's prose
  // scrolls past it. Every other hero keeps the figure-below-prose flow.
  const isScrolly = chapter.chartConfig?.scrolly === true
  const narrow = useIsMobile(1023)
  const { stage, register } = useProseStage(
    chapter.prose.length,
    isScrolly && !narrow,
    STEP_MAX_STAGE,
  )
  // A scrolly chapter pinned its first plate above the prose; what is left for
  // the figure column below is only its second exhibit, which may be nothing.
  const belowProse = renderChartBlock(chapter, '', lang, undefined, isScrolly ? 'secondary' : undefined)
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
        <div className="max-w-[640px] mx-auto px-4 sm:px-0 pt-16 pb-10 relative">
          {/* Massive watermark numeral. The title block narrowed to the 640
              axis, so on wide screens the numeral moves back out to keep the
              visual position it had in the old 760 block — aria-hidden
              decoration at 7% opacity, safe to overhang the column. */}
          <span
            className="absolute -top-2 right-2 sm:right-8 lg:-right-24 select-none pointer-events-none font-extrabold leading-none"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(80px, 22vw, 360px)',
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
            className="text-[13px] uppercase tracking-[0.22em] font-bold mb-4"
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
            <p className="text-lg sm:text-xl text-text-secondary leading-[1.5] mb-10 text-pretty max-w-[640px]">
              {chapter.subtitle}
            </p>
          )}
        </div>
      </ScrollReveal>

      {/* The scrolly puts the figure ABOVE the prose and sticks it there, so
          the two share one positioning context; every other hero keeps the
          figure-after-prose flow. */}
      <div className={isScrolly ? 'relative' : undefined}>
        {isScrolly && (
          <StickyStepFrame stage={stage}>
            {renderChartBlock(chapter, '', lang, stage, 'primary')}
          </StickyStepFrame>
        )}

        {/* Lede paragraph with drop cap + remaining body */}
        <div className="max-w-[640px] mx-auto px-4 sm:px-0">
          {chapter.prose.map((paragraph, i) => (
            <ScrollReveal key={i} delay={i * 60}>
              <p
                ref={isScrolly ? (el) => register(el, i) : undefined}
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
            <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
          )}

          {/* Hero stat callout — if pullquote exists, render it as a hero-sized
              breakout below the lede. */}
          {chapter.pullquote && (
            <ScrollReveal className="my-10">
              {renderPullquote(chapter, story, '', false, 'hero')}
            </ScrollReveal>
          )}
        </div>
      </div>

      {/* Chart, if any — its own 760 figure column, centered on the same axis
          as the 640 text above it. Was a negative-margin bleed out of the
          prose div, which made the hero the one chapter whose figure width
          depended on the text column instead of the frame. */}
      {belowProse && (
        <div className="max-w-[760px] mx-auto px-4 sm:px-0 my-10">{belowProse}</div>
      )}
    </section>
  )
}

// ── Variant: FEATURE (rich content chapter) ───────────────────────────────

function FeatureChapter({ chapter, story, accentColor, isFirst = false }: ChapterRenderProps) {
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

      {/* Single measure. The old 12-column grid put feature prose 145px left
          of every other chapter's text; a 640 column inside that grid would
          leave the aside 129px wide, so the aside is gone and the pullquote
          runs in flow below the prose — same axis, same measure. */}
      <div className="max-w-[640px] mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => {
          const sourceCount = chapter.sources?.length ?? 0
          // Paragraph N → source ref [N] when chapter has at least that
          // many citations. Falls back silently when sources are absent.
          const sourceRef = sourceCount > 0 ? Math.min(i + 1, sourceCount) : 0
          return (
            <ScrollReveal key={i} delay={i * 60}>
              <p
                className={cn(
                  'text-text-primary leading-[1.75] mb-5 text-[17px]',
                  i === 0 && 'feature-dropcap',
                )}
                style={i === 0 ? { '--dropcap-color': accentColor } as React.CSSProperties : undefined}
              >
                {paragraph}
                {sourceRef > 0 && (
                  <sup className="font-mono text-text-muted text-[12px] ml-0.5 align-super tabular-nums">
                    [{sourceRef}]
                  </sup>
                )}
              </p>
            </ScrollReveal>
          )
        })}
        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
        )}
      </div>

      {/* Pullquote in flow on the text axis — the 'feature' role (and the
          'ledger' variant the first feature chapter gets) is unchanged; only
          the sticky sidebar it used to sit in is gone. */}
      {chapter.pullquote && (
        <div className="max-w-[640px] mx-auto px-4 sm:px-0 my-10">
          <ScrollReveal>
            {renderPullquote(chapter, story, '', isFirst, 'feature')}
          </ScrollReveal>
        </div>
      )}

      {/* Chart in the 760 figure box — 60px of overhang each side of the text */}
      {chapter.chartConfig && (
        <div className="max-w-[760px] mx-auto px-4 sm:px-0 mt-8">
          {renderChartBlock(chapter, '', lang)}
        </div>
      )}
    </section>
  )
}

// ── Variant: DATA-SPOTLIGHT (chart-driven chapter) ────────────────────────

function DataSpotlightChapter({ chapter, story, accentColor, isFirst = false }: ChapterRenderProps) {
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
      <div className="max-w-[640px] mx-auto px-4 sm:px-0 mb-8">
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
          <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
        )}
      </div>

      {/* Chart breakout — the 760 figure box at axis−60. The gradient frame IS
          the box; the chart inside it sits within the frame's own padding. */}
      <div className="max-w-[760px] mx-auto px-4 sm:px-0">
        <ScrollReveal>
          <div
            className="rounded-lg p-1 sm:p-2"
            style={{
              background: `linear-gradient(135deg, ${accentColor}15, transparent 60%)`,
              borderTop: `2px solid ${accentColor}`,
            }}
          >
            {renderChartBlock(chapter, 'p-3 sm:p-5 bg-background rounded-md', lang)}
          </div>
        </ScrollReveal>
      </div>

      {/* Optional pullquote at bottom */}
      {chapter.pullquote && (
        <div className="max-w-[640px] mx-auto px-4 sm:px-0 mt-10">
          <ScrollReveal>
            {renderPullquote(chapter, story, '', isFirst, 'data-spotlight')}
          </ScrollReveal>
        </div>
      )}

      {/* Connect to live Atlas — readers can manipulate the data themselves */}
      <div className="max-w-[640px] mx-auto px-4 sm:px-0">
        <AtlasLink
          accentColor={accentColor}
          lens="patterns"
          lang={lang}
          caption={{
            en: 'Explore this chart\'s data live in The Atlas — toggle lenses, scrub years.',
            es: 'Explora los datos de este gráfico en vivo en El Atlas — alterna lentes, desplaza años.',
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
      <div className="max-w-[640px] mx-auto px-4 sm:px-0 mb-10">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p className="text-text-primary leading-[1.75] mb-5 text-[17px]">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
      </div>

      {/* Massive Playfair quote — wider breakout */}
      {chapter.pullquote && (
        <ScrollReveal>
          <figure
            className="max-w-[760px] mx-auto px-4 sm:px-0 my-10"
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
                className="text-[26px] sm:text-[34px] md:text-[40px] leading-[1.18] tracking-[-0.01em] font-medium text-text-primary text-balance"
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
        <div className="max-w-[640px] mx-auto px-4 sm:px-0">
          <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
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
      <div className="max-w-[640px] mx-auto px-4 sm:px-0 mb-6">
        <ScrollReveal>
          <div className="flex items-baseline gap-3 mb-2">
            <span
              className="text-[12px] uppercase tracking-[0.22em] font-bold"
              style={{ color: accentColor }}
            >
              {t('storyType.chapter', 'Chapter')} {String(chapter.number).padStart(2, '0')}
            </span>
            {story.era && (
              <span className="text-[12px] text-text-muted">
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
      <div className="max-w-[640px] mx-auto px-4 sm:px-0">
        {chapter.prose.map((paragraph, i) => (
          <ScrollReveal key={i} delay={i * 60}>
            <p className="text-text-secondary leading-[1.75] mb-5 text-[17px]">
              {paragraph}
            </p>
          </ScrollReveal>
        ))}
        {chapter.sources && chapter.sources.length > 0 && (
          <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
        )}
      </div>
    </section>
  )
}

// ── Variant: CLOSING (final chapter) ──────────────────────────────────────

// ── ClosingCoda — the charter C3 "§ · ADÓNDE IR" exit ramp ────────────────
//
// Charter invariant 13: every story must end with an ADÓNDE IR coda carrying
// ≥1 investigate CTA + ≥2 EntityIdentityChips. The closing chapter already
// had the investigate CTA (AtlasLink) but ZERO chips. This block adds the
// related-entity chips via buildCodaChips() — the layered fallback below —
// so every one of the 12 stories clears the ≥2 floor from its own data.
//
// ROUTING TRAP (deliberate omission): a case chip would have to route by
// scandal SLUG (CaseDossier resolves by slug; a numeric case_id 404s).
// StoryDef carries only numeric caseIds — no verified case slug — so we
// SKIP the case chip rather than mint one that 404s, per the trap rule.

interface CodaChip {
  type: 'vendor' | 'institution' | 'sector' | 'story' | 'pattern'
  id: string | number
  name: string
  riskScore?: number
  ariaTier?: 1 | 2 | 3 | 4
}

// Build up to 3 related-entity chips for the closing coda, drawn ONLY from
// data already on the story. Layered so every story reaches the invariant-13
// floor of ≥2 chips:
//   1. story.entities          — verified vendor/institution dossiers (names
//                                travel with the entity).
//   2. lensTags.sectors        — sector codes → numeric ids via SECTORS
//                                (sector dossiers 1–12 always resolve).
//   3. related stories         — relatedSlugs → headline via getStoryBySlug
//                                (target is guaranteed to be in STORIES).
//   4. lensTags.patterns       — last resort. Pattern code (P1–P7) is both
//                                the route id and the display name; the chip
//                                routes to /patterns/P5 which always resolves.
//                                Code-as-name avoids the inconsistent prose
//                                pattern labels found across the codebase.
// Case chips are intentionally absent: StoryDef has only numeric caseIds and
// no verified case slug, and a numeric case_id 404s on CaseDossier (slug-only).
function buildCodaChips(story: StoryDef, lang: 'en' | 'es'): CodaChip[] {
  const chips: CodaChip[] = []
  const CAP = 3

  // 1. Named vendors/institutions — top by listing order.
  for (const e of story.entities ?? []) {
    if (chips.length >= CAP) break
    chips.push({
      type: e.type,
      id: e.id,
      name: e.name,
      riskScore: e.riskScore,
      ariaTier: e.ariaTier as 1 | 2 | 3 | 4 | undefined,
    })
  }

  // 2. Sectors.
  for (const code of story.lensTags?.sectors ?? []) {
    if (chips.length >= CAP) break
    const sector = SECTORS.find((s) => s.code === code)
    if (!sector) continue
    if (chips.some((c) => c.type === 'sector' && c.id === sector.id)) continue
    chips.push({ type: 'sector', id: sector.id, name: lang === 'es' ? sector.name : sector.nameEN })
  }

  // 3. Related stories (only needed to reach the ≥2 floor).
  if (chips.length < 2) {
    for (const relSlug of story.relatedSlugs ?? []) {
      if (chips.length >= CAP) break
      if (relSlug === story.slug) continue
      const rel = getStoryBySlug(relSlug)
      if (!rel) continue
      chips.push({ type: 'story', id: rel.slug, name: localizeStory(rel, lang).headline })
    }
  }

  // 4. Patterns — last resort, code as both id and name.
  if (chips.length < 2) {
    for (const code of story.lensTags?.patterns ?? []) {
      if (chips.length >= CAP) break
      if (chips.some((c) => c.type === 'pattern' && c.id === code)) continue
      chips.push({ type: 'pattern', id: code, name: code })
    }
  }

  return chips
}

function ClosingCoda({ story, accentColor, lang }: {
  story: StoryDef
  accentColor: string
  lang: 'en' | 'es'
}) {
  const chips = buildCodaChips(story, lang)
  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-0">
      {/* § · ADÓNDE IR kicker */}
      <p className="text-[12px] font-mono uppercase tracking-[0.15em] text-text-muted mb-4 mt-6">
        § · {lang === 'es' ? 'ADÓNDE IR' : 'WHERE TO GO NEXT'}
      </p>

      {/* Investigate CTA — live Atlas. The story has named patterns / years /
          clusters; the Atlas is where readers can manipulate them live. */}
      <AtlasLink
        accentColor={accentColor}
        lens="patterns"
        lang={lang}
        caption={{
          en: 'Open this story\'s patterns live in The Atlas — scrub years, pin clusters, run your own investigation.',
          es: 'Abre los patrones de esta historia en vivo en El Atlas — desplaza años, fija cúmulos, lleva tu propia investigación.',
        }}
      />

      {/* Related-entity chips — the dossiers this story names. */}
      {chips.length > 0 && (
        <ScrollReveal className="mt-6">
          <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted mb-3">
            {lang === 'es' ? 'Investigar los expedientes' : 'Investigate the dossiers'}
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <EntityIdentityChip
                key={`${c.type}-${c.id}`}
                type={c.type}
                id={c.id}
                name={c.name}
                riskScore={c.riskScore}
                ariaTier={c.ariaTier}
                size="sm"
              />
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

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
        <div className="max-w-[640px] mx-auto px-4 sm:px-0 pt-12 pb-6">
          <p
            className="text-[12px] uppercase tracking-[0.22em] font-bold mb-4"
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

      <div className="max-w-[640px] mx-auto px-4 sm:px-0">
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
          <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
        )}
      </div>

      {/* A live closing figure leads: it is the evidence the verdict quote then
          reads off, so the reader sees the distribution before the number that
          summarises it. A typed closing figure keeps the quote-first order the
          two stories that have one were laid out with. */}
      {chapter.chartConfig?.type === 'live' && (
        <div className="max-w-[760px] mx-auto px-4 sm:px-0 mt-10">
          {renderChartBlock(chapter, '', lang)}
        </div>
      )}

      {chapter.pullquote && (
        <div className="max-w-[760px] mx-auto px-4 sm:px-0 mt-10">
          <ScrollReveal>
            {renderPullquote(chapter, story, '', false, 'closing')}
          </ScrollReveal>
        </div>
      )}

      {chapter.chartConfig && chapter.chartConfig.type !== 'live' && (
        <div className="max-w-[760px] mx-auto px-4 sm:px-0 mt-10">
          {renderChartBlock(chapter, '', lang)}
        </div>
      )}

      {/* Closing coda — charter C3 "§ · ADÓNDE IR": investigate CTA (live
          Atlas) + related-entity chips (the dossiers this story names). */}
      <ClosingCoda story={story} accentColor={accentColor} lang={lang} />
    </section>
  )
}

// ── Variant: STANDARD (current default, refined) ──────────────────────────

function StandardChapter({ chapter, story, accentColor, isFirst = false }: ChapterRenderProps) {
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  // SD-02 F2 — a `standard` chapter can carry the stepped figure too: it goes
  // above the prose and sticks there, exactly as the hero's does.
  const isScrolly = chapter.chartConfig?.scrolly === true
  const narrow = useIsMobile(1023)
  const { stage, register } = useProseStage(
    chapter.prose.length,
    isScrolly && !narrow,
    STEP_MAX_STAGE,
  )
  const belowProse = renderChartBlock(chapter, 'my-8', lang, undefined, isScrolly ? 'secondary' : undefined)
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

      <div className={isScrolly ? 'relative' : undefined}>
        {isScrolly && (
          <StickyStepFrame stage={stage}>
            {renderChartBlock(chapter, '', lang, stage, 'primary')}
          </StickyStepFrame>
        )}

        <div className="max-w-[640px] mx-auto px-4 sm:px-0">
          {chapter.prose.map((paragraph, i) => (
            <ScrollReveal key={i} delay={i * 60}>
              <p
                ref={isScrolly ? (el) => register(el, i) : undefined}
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
            <ChapterSources sources={chapter.sources} chapterId={chapter.id} />
          )}
        </div>
      </div>

      {/* Chart in the 760 figure column — overhangs the 640 text by 60px a
          side, the same overhang every other variant's figure gets. A scrolly
          chapter already rendered its first plate above the prose; only its
          `live2` exhibit lands here. */}
      {belowProse && <div className="max-w-[760px] mx-auto px-4 sm:px-0">{belowProse}</div>}

      {chapter.pullquote && (
        <div className="max-w-[640px] mx-auto px-4 sm:px-0">
          <div className="my-10">
            <ScrollReveal>{renderPullquote(chapter, story, '', isFirst, 'standard')}</ScrollReveal>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Top-level dispatcher ──────────────────────────────────────────────────

interface ChapterRenderProps {
  chapter: StoryChapterDef
  story: StoryDef
  accentColor: string
  isFirst?: boolean
}

function ChapterSection({
  chapter,
  story,
  accentColor,
  variant,
  isFirst = false,
}: ChapterRenderProps & { variant: ChapterVariant }) {
  // Build a language-localized projection of the chapter, with EN fallback when
  // _es fields are absent. All variant components consume this object's
  // resolved title/subtitle/prose/pullquote — they don't see the raw chapter.
  const { i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const localized = localizeChapter(chapter, lang)
  // Wire the resolved fields back onto a chapter-shaped object so existing
  // variant code keeps working without per-variant edits. ChartConfig is
  // now also localized — title, axis labels, point labels, annotations,
  // multi-series names, network anchors, stacked-bar rows all respect
  // the lang setting (April 2026 fix for the chart-translation bug).
  const localizedChapter: StoryChapterDef = {
    ...chapter,
    title: localized.title,
    subtitle: localized.subtitle,
    prose: localized.prose,
    pullquote: localized.pullquote,
    chartConfig: localized.chartConfig,
  }
  switch (variant) {
    case 'hero':            return <HeroChapter            chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'feature':         return <FeatureChapter         chapter={localizedChapter} story={story} accentColor={accentColor} isFirst={isFirst} />
    case 'data-spotlight':  return <DataSpotlightChapter   chapter={localizedChapter} story={story} accentColor={accentColor} isFirst={isFirst} />
    case 'quote-spotlight': return <QuoteSpotlightChapter  chapter={localizedChapter} story={story} accentColor={accentColor} isFirst={isFirst} />
    case 'connective':      return <ConnectiveChapter      chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'closing':         return <ClosingChapter         chapter={localizedChapter} story={story} accentColor={accentColor} />
    case 'standard':
    default:                return <StandardChapter        chapter={localizedChapter} story={story} accentColor={accentColor} isFirst={isFirst} />
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
  reporteado:  { labelKey: 'story.statusReporteado', color: 'text-accent-data', bg: 'bg-accent-data/10',     border: 'border-accent-data/30'   },
  auditado:    { labelKey: 'story.statusAuditado',  color: 'text-oecd',        bg: 'bg-oecd/10',            border: 'border-oecd/30' },
  procesado:   { labelKey: 'story.statusProcesado', color: 'text-risk-critical',                   bg: 'bg-risk-critical/10',                          border: 'border-risk-critical/30'   },
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

const BYLINE_ES: Record<string, string> = {
  'RUBLI Data Analysis Unit': 'Unidad de Análisis de Datos de RUBLI',
  'RUBLI Investigative Data Unit': 'Unidad Investigativa de RUBLI',
}

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
    <header className="relative bg-background overflow-hidden border-b border-border">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${accentColor} 0%, transparent 60%)`,
        }}
      />

      {/* The hero title block sits on the 640 text axis, not in its own 760
          column — headline, deck, byline and kickers share one left edge with
          every body paragraph below them. The outer 1010 container repeats the
          chapters container verbatim (`max-w-[1010px] px-2 sm:px-4`): the hero
          lives outside it, and matching it by hand instead put the hero 8px
          left of the prose on phones. Two identical chains guarantee one edge
          at every width, not just the ones we measured. The children below
          keep their original indentation — this wrapper is the only new nesting. */}
      <div className="relative z-10 max-w-[1010px] mx-auto px-2 sm:px-4">
      <div className="max-w-[640px] mx-auto px-4 sm:px-0 py-12 md:py-20">
        {/* Outlet + type badges */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex items-center gap-3 mb-6 flex-wrap"
        >
          <OutletBadge outlet={story.outlet} />
          <span className="text-[12px] font-semibold tracking-[0.2em] uppercase text-text-muted">
            {getTypeLabel(story.type, t)}
          </span>
          {story.era && (
            <span
              className="text-[12px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border"
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
          className="text-text-secondary leading-[1.55] mb-8"
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
          <span>{lang === 'es' ? (BYLINE_ES[story.byline] ?? story.byline) : story.byline}</span>
          <span className="w-px h-4 bg-background-elevated" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {story.estimatedMinutes} min {t('storyType.readTime', 'read')}
          </span>
          {story.status && (() => {
            const sc = STATUS_CONFIG[story.status]
            return (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[13px] font-semibold ${sc.bg} ${sc.border} ${sc.color}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
                {t(sc.labelKey, story.status)}
              </span>
            )
          })()}
          <span className="text-[13px] text-text-primary font-mono">
            {story.chapters.length}{' '}
            {lang === 'es'
              ? story.chapters.length === 1 ? 'capítulo' : 'capítulos'
              : story.chapters.length === 1 ? 'chapter' : 'chapters'}
          </span>
          {/* Standing dateline — the front page's, not a build date. These
              pieces are static analyses of the COMPRANET record, and the
              record itself froze on 28 Sep 2025; what the reader needs is the
              data cut, which does not move when we rescore. */}
          <span className="w-px h-4 bg-background-elevated" aria-hidden="true" />
          <span
            className="text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted tabular-nums"
            title={lang === 'en'
              ? 'Stories are static analyses of the COMPRANET record, which froze on 28 Sep 2025. Live data updates in the Atlas and the ARIA queue, not in the story body.'
              : 'Las historias son análisis estáticos del registro de CompraNet, congelado el 28 de septiembre de 2025. Los datos en vivo se actualizan en El Atlas y en la cola ARIA, no en el cuerpo del artículo.'}
          >
            {lang === 'en' ? 'DATA CUT 2025·09·28' : 'CORTE DE DATOS 28·09·2025'}
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
              const prefix = (lang === 'es' && stat.prefix_es) ? stat.prefix_es : stat.prefix
              const suffix = (lang === 'es' && stat.suffix_es) ? stat.suffix_es : stat.suffix
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.35 + idx * 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-baseline gap-x-2"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {prefix && (
                    <span
                      className="text-text-secondary"
                      style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)' }}
                    >
                      {prefix}
                    </span>
                  )}
                  <span
                    className="tabular-nums leading-none"
                    style={{
                      // .tabular-nums pins font-family to the mono stack
                      // (index.css:193) unless an inline family overrides it.
                      // The leadStat fallback below already overrides; without
                      // this the two hero paths render in different typefaces.
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                      fontStyle: 'normal',
                      fontWeight: 800,
                      letterSpacing: '-0.035em',
                      color: valueColor,
                    }}
                  >
                    {localizeAmount(stat.value, lang)}
                  </span>
                  {suffix && (
                    <span
                      className="text-text-secondary"
                      style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)' }}
                    >
                      {suffix}
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
              fontStyle: 'normal',
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
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  return (
    <nav
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3"
      aria-label={t('storyType.chapterNav', 'Chapter navigation')}
    >
      {chapters.map((ch) => {
        const isActive = ch.id === activeChapterId
        const chapterTitle = lang === 'es' ? (ch.title_es ?? ch.title) : ch.title
        return (
          <a
            key={ch.id}
            href={`#chapter-${ch.id}`}
            className="group relative flex items-center justify-end gap-2"
            aria-label={`${t('storyType.chapter', 'Chapter')} ${ch.number}: ${chapterTitle}`}
            aria-current={isActive ? 'step' : undefined}
          >
            {/* The label is hover/focus-only, including for the active
                chapter: the nav is fixed in the margin and the active label
                printed over the feature aside and the closing column at 1440.
                aria-current + aria-label above keep the active chapter
                announced, so nothing is lost for assistive tech. */}
            <span className="transition-opacity text-xs whitespace-nowrap pr-2 text-text-secondary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
              {chapterTitle}
            </span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full border-2 transition-[transform,background-color]',
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
// ReadingProgress — the sticky story bar.
//
// It owns the scroll listener and the percentage state. That state used to
// live on the StoryNarrative root, so every scroll frame re-rendered the whole
// story tree — every chapter, every chart — to move a 2px bar. Keeping it here
// means a scroll re-renders this bar and nothing else. Mount it with
// key={slug} so a story change resets the percentage.
// ---------------------------------------------------------------------------

function ReadingProgress({ accentColor }: { accentColor: string }) {
  const { t } = useTranslation('common')
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setScrollPct(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      {/* Progress bar — only the width animates; transition-all also animated
          the background-color token swap on theme change. */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-[width] duration-100"
        style={{ width: `${scrollPct}%`, backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="max-w-[1010px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
        <Link
          to="/journalists"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('story.allStories')}
        </Link>
        <span className="text-[12px] text-text-muted font-mono tabular-nums">
          {Math.round(scrollPct)}%
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Methodology footer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DramatisPersonaeSection — entity chips for named subjects in the story
// ---------------------------------------------------------------------------

function DramatisPersonaeSection({ story, accentColor }: { story: StoryDef; accentColor: string }) {
  const { i18n } = useTranslation('common')
  const isEs = i18n.language.startsWith('es')

  if (!story.entities || story.entities.length === 0) return null

  return (
    <ScrollReveal>
      <div className="max-w-[760px] mx-auto px-4 sm:px-0 my-10">
        <div
          className="rounded-sm border border-border bg-background-elevated px-6 py-5"
          style={{ borderLeft: `3px solid ${accentColor}` }}
        >
          {/* Kicker */}
          <p
            className="text-[13px] font-mono uppercase tracking-[0.22em] mb-1"
            style={{ color: accentColor }}
          >
            {isEs ? 'Sujetos de esta investigación' : 'Subjects of this investigation'}
          </p>
          <p
            className="text-[13px] font-mono text-text-muted mb-5"
          >
            {isEs
              ? `${story.entities.length} entidades nombradas · ordenadas por nivel de riesgo`
              : `${story.entities.length} named entities · ordered by risk level`}
          </p>

          {/* Numbered editorial roster — one row per subject, full width.
              Layout: 01–NN rank · entity chip · risk readout · "Open dossier →" */}
          <ol className="divide-y divide-border/60">
            {story.entities.map((entity, idx) => {
              const score = typeof entity.riskScore === 'number' ? entity.riskScore : 0
              const level = getRiskLevelFromScore(score)
              const riskColor = RISK_COLORS[level]
              const rank = String(idx + 1).padStart(2, '0')
              const role = isEs ? (entity.role_es ?? entity.role) : entity.role
              return (
                <li
                  key={`${entity.type}-${entity.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3.5"
                >
                  {/* Rank — large Playfair Italic, dimmed */}
                  <span
                    className="tabular-nums select-none"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'normal',
                      fontWeight: 800,
                      fontSize: 28,
                      lineHeight: 0.95,
                      letterSpacing: '-0.02em',
                      color: 'var(--color-text-muted)',
                      opacity: 0.5,
                    }}
                    aria-hidden="true"
                  >
                    {rank}
                  </span>

                  {/* Entity identity + role caption */}
                  <div className="min-w-0">
                    <EntityIdentityChip
                      type={entity.type}
                      id={entity.id}
                      name={entity.name}
                      riskScore={entity.riskScore}
                      ariaTier={entity.ariaTier as 1 | 2 | 3 | 4 | undefined}
                      size="sm"
                    />
                    {role && (
                      <p className="text-[12px] font-mono text-text-muted pl-1 mt-1 leading-relaxed">
                        {role}
                      </p>
                    )}
                  </div>

                  {/* Risk readout — DotBar + numeric (hidden on mobile, shown sm+) */}
                  <div className="hidden sm:flex items-center gap-2.5 justify-end">
                    {typeof entity.riskScore === 'number' && (
                      <>
                        <DotBar
                          value={entity.riskScore}
                          max={1}
                          color={riskColor}
                          dots={12}
                          dotR={1.5}
                          dotGap={4}
                          ariaLabel={`Risk ${entity.riskScore.toFixed(2)}`}
                        />
                        <span
                          className="font-mono tabular-nums text-[13px] tracking-wide"
                          style={{ color: riskColor }}
                        >
                          {entity.riskScore.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* "Open dossier →" link — animated arrow on hover */}
                  <Link
                    to={
                      entity.type === 'vendor'
                        ? `/vendors/${entity.id}`
                        : entity.type === 'institution'
                          ? `/institutions/${entity.id}`
                          : entity.type === 'case'
                            ? `/cases/${entity.id}`
                            : `/${entity.type}/${entity.id}`
                    }
                    className="inline-flex items-center gap-1 text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-primary transition-colors col-span-3 sm:col-span-1 justify-self-end"
                  >
                    <span>{isEs ? 'Abrir dossier' : 'Open dossier'}</span>
                    <ArrowRight
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </ScrollReveal>
  )
}

function MethodologySection({ story }: { story: StoryDef }) {
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const ls = localizeStory(story, lang)
  const statusCfg = story.status ? STATUS_CONFIG[story.status] : null

  return (
    <ScrollReveal>
      <section
        className="max-w-[640px] mx-auto px-4 sm:px-0 my-16 py-8 border-t border-border"
        aria-label={t('story.methodology')}
      >
        {/* Investigation status badge */}
        {statusCfg && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
            <span className="w-2 h-2 rounded-full bg-current opacity-80" aria-hidden="true" />
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
        {ls.nextSteps && ls.nextSteps.length > 0 && (
          <div className="mt-8 p-4 rounded-sm border border-border bg-background-card">
            <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-risk-critical" aria-hidden="true" />
              {t('story.nextSteps')}
            </h4>
            <ul className="space-y-2">
              {ls.nextSteps.map((step, i) => (
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
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            to="/model"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-secondary hover:border-border transition-colors"
          >
            {t('story.modelTransparency')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
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
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()
  const related = getRelatedStories(story.slug)
  if (related.length === 0) return null

  return (
    <ScrollReveal>
      <section
        className="max-w-[1010px] mx-auto px-4 sm:px-6 my-16"
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
          {related.slice(0, 3).map((r) => {
            const loc = localizeStory(r, lang)
            return (
              <StoryCard
                key={r.slug}
                slug={r.slug}
                outlet={r.outlet}
                type={r.type}
                headline={loc.headline}
                subheadline={loc.subheadline}
                leadStatValue={r.leadStat.value}
                leadStatLabel={loc.leadStatLabel}
                leadStatColor={r.leadStat.color}
                estimatedMinutes={r.estimatedMinutes}
                era={r.era ? getEraLabel(r.era, t) : undefined}
                onClick={() => {
                  navigate(`/stories/${r.slug}`)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )
          })}
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
      <section className="max-w-[640px] mx-auto px-4 sm:px-0 my-12">
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
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0" aria-hidden="true" />
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
    <div className="max-w-[640px] mx-auto px-4 sm:px-0 my-8">
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
  const { t, i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

  const story = slug ? getStoryBySlug(slug) : undefined

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setActiveChapterId(null)
  }, [slug])

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
                {t('story.notFoundSubtitle', 'The requested investigation could not be located.')}
              </span>
            </>
          }
          paragraph={t('story.notFoundDetail', 'The story "{{slug}}" could not be found in the RUBLI narrative archive. Return to the journalism index to explore active investigations.', { slug })}
          severity="high"
        >
          <Act number="I" label={t('story.actReturnToIndex', 'RETURN TO INDEX')}>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/journalists')}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-4 py-2 rounded-full border border-border hover:border-border-hover text-text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
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
      {/* Sticky header: back link + reading progress. key={slug} resets the
          percentage when the reader moves to another story. */}
      <ReadingProgress key={slug} accentColor={accentColor} />

      {/* Hero — editorial lede with outlet badge + lead stat */}
      <StoryHero story={story} accentColor={accentColor} />

      {/* Chapter navigation dots */}
      <ChapterNav chapters={story.chapters} accentColor={accentColor} activeChapterId={activeChapterId} />

      {/* ── ACT I: THE INVESTIGATION ── */}
      {/* Wider container so hero/feature/data-spotlight variants can breakout */}
      <div className="relative max-w-[1010px] mx-auto px-2 sm:px-4 pt-6">
        <Act number="I" label={t('story.actInvestigation', 'THE INVESTIGATION')} className="space-y-0">
          {story.chapters.map((chapter, idx) => {
            const variant = pickChapterVariant(chapter, idx, story.chapters.length)
            return (
              <div key={chapter.id}>
                <ChapterSection
                  chapter={chapter}
                  story={story}
                  accentColor={accentColor}
                  variant={variant}
                  isFirst={idx === 1}
                />
                {/* Decorative divider between chapters (skip after last) */}
                {idx < story.chapters.length - 1 && variant !== 'hero' && (
                  <ChapterDivider accentColor={accentColor} storySlug={story.slug} />
                )}
              </div>
            )
          })}
        </Act>
      </div>

      {/* ── DRAMATIS PERSONAE — named subjects with dossier links ──
          Wrapped in the same 1010 container as the chapters so its 760 box
          lands on the prose edge on phones; on desktop both are centred and
          the wrapper changes nothing. */}
      {story.entities && story.entities.length > 0 && (
        <div className="max-w-[1010px] mx-auto px-2 sm:px-4">
          <DramatisPersonaeSection story={story} accentColor={accentColor} />
        </div>
      )}

      {/* ── ACT II: THE METHODOLOGY ── */}
      <div className="max-w-[1010px] mx-auto px-2 sm:px-4 pt-8">
        <Act number="II" label={t('story.actMethodology', 'THE METHODOLOGY')} className="space-y-4">
          <MethodologySection story={story} />
        </Act>
      </div>

      {/* ── ACT III: FURTHER INQUIRY ── */}
      <div className="max-w-[1010px] mx-auto px-2 sm:px-4 pt-8">
        <Act number="III" label={t('story.actFurtherInquiry', 'FURTHER INQUIRY')} className="space-y-4">
          <ShareBar story={story} />
          <ObservatoryTrailerCTA longformSlug={story.slug} lang={lang} />
          <PlatformLinks story={story} />
        </Act>
      </div>

      {/* ── ACT IV: RELATED DOSSIERS ── */}
      <div className="max-w-[1010px] mx-auto px-2 sm:px-4 pt-8">
        <Act number="IV" label={t('story.actRelatedDossiers', 'RELATED DOSSIERS')} className="space-y-4">
          <RelatedSection story={story} />
        </Act>
      </div>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  )
}
