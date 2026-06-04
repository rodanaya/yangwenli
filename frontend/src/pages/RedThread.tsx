/**
 * RedThread — Scroll-driven Investigation Narrative
 *
 * Transforms a vendor's risk data into a structured journalistic briefing.
 * Six chapters, scroll-driven, with a literal crimson thread running down
 * the left margin that grows as the investigator reads deeper.
 *
 * Entry points:
 *   - ARIA queue: "Investigate" button on each Tier 1/2 lead
 *   - VendorProfile: "Build Investigation Thread" in header
 *   - Direct link: /thread/:vendorId
 *
 * Uses zero new backend endpoints — all data from existing APIs.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion, useScroll } from 'framer-motion'
import { vendorApi, ariaApi, networkApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Building2,
  GitBranch,
  DollarSign,
  Gavel,
  Clock,
  ChevronRight,
  Share2,
} from 'lucide-react'
// Extracted to components/thread/
import { ChapterSubject } from '@/components/thread/ChapterSubject'
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'
import { PatternDiagnostic } from '@/components/thread/PatternDiagnostic'
import { ConcentricConstellation } from '@/components/thread/ConcentricConstellation'
import { MoneyStaircase } from '@/components/thread/MoneyStaircase'
import { ChapterVerdict } from '@/components/thread/ChapterVerdict'

// ─── Constants ─────────────────────────────────────────────────────────────

// Order: subject → timeline → network → money → pattern → verdict.
// Reordered (Apr 2026) per user feedback: Pattern (the algorithmic
// diagnosis) now sits immediately before Verdict, since the Verdict's
// evidence list cites the pattern. Network moves up so the structural
// "who-with" chapter precedes the "how-much" chapter.
const CHAPTER_IDS = ['subject', 'timeline', 'network', 'money', 'pattern', 'verdict'] as const
type ChapterId = typeof CHAPTER_IDS[number]

const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  subject:  Building2,
  timeline: Clock,
  pattern:  AlertTriangle,
  network:  GitBranch,
  money:    DollarSign,
  verdict:  Gavel,
}

// Pattern metadata moved into PatternDiagnostic chapter (component 6/10, 2026-05-25)


// ─── Sub-components ─────────────────────────────────────────────────────────

function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">
      {children}
    </h2>
  )
}

/**
 * RedThreadChapter — editorial chapter header primitive.
 * Replaces the copy-pasted (ChapterLabel + h2.font-serif) pairing that was
 * duplicated across 5 chapters. Use `label` for the gold kicker and `title`
 * for the serif headline. Optional `id` enables anchor scrolling.
 */
function RedThreadChapter({ label, title, id }: { label: string; title: React.ReactNode; id?: string }) {
  return (
    <header id={id}>
      <ChapterLabel>{label}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-text-primary mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {title}
      </h2>
    </header>
  )
}

function ChapterDivider() {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 bg-background-elevated" />
      <div className="w-0.5 h-0.5 rounded-full bg-[var(--color-accent)] opacity-50" />
      <div className="h-px flex-1 bg-background-elevated" />
    </div>
  )
}

/**
 * ChapterShell — chapter rhythm primitive. Tightened to py-5 from py-8
 * after user feedback ("a lot of spaces between chapters still"). With
 * ChapterDivider at my-3 the inter-chapter gap is now ~64px content-edge
 * to content-edge (was ~128px).
 */
function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-5 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

// ─── Chapter 1: The Subject ─────────────────────────────────────────────────
// Extracted to components/thread/ChapterSubject.tsx

// ─── Chapter 2: The Timeline ────────────────────────────────────────────────

type TimelineItem = { year: number; avg_risk_score: number | null; contract_count: number; total_value: number }

function ChapterTimeline({ totalContracts, vendorFirstYear, vendorLastYear, timeline, vendorName, primarySectorName }: {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: TimelineItem[]
  vendorName?: string
  primarySectorName?: string
  t?: unknown
}) {
  return (
    <TimelineHourglass
      totalContracts={totalContracts}
      vendorFirstYear={vendorFirstYear}
      vendorLastYear={vendorLastYear}
      timeline={timeline}
      vendorName={vendorName}
      primarySectorName={primarySectorName}
    />
  )
}

// ─── Chapter 3: The Pattern ─────────────────────────────────────────────────

function ChapterPattern({ waterfall, ariaPattern, isLoading, primarySectorName }: {
  waterfall: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  ariaPattern: string | null
  isLoading?: boolean
  primarySectorName?: string
  t?: unknown
}) {
  return (
    <PatternDiagnostic
      features={waterfall}
      ariaPattern={ariaPattern}
      primarySectorName={primarySectorName}
      isLoading={isLoading}
    />
  )
}

// ─── Chapter 5.5: Press & Registry Mentions ────────────────────────────────

type WebEvidenceArticle = {
  query_type: string
  verdict: string
  confidence: number
  snippet: string
  source_url: string | null
  source_name: string | null
  published_date: string | null
  reasoning: string
}

const WEB_VERDICT_STYLE: Record<string, { bg: string; color: string }> = {
  CORRUPTION_MENTION: { bg: 'rgba(239,68,68,0.10)',   color: 'var(--color-risk-critical)' },
  RISK_MENTION:       { bg: 'rgba(245,158,11,0.10)',  color: 'var(--color-risk-high)' },
  EXCULPATORY:        { bg: 'rgba(51,65,85,0.10)',    color: '#334155' }, // slate-700 — §3.10: exculpatory isn't green-for-clean
  NEUTRAL:            { bg: 'rgba(100,116,139,0.08)', color: 'var(--color-text-muted)' },
}

const WEB_VERDICT_KEYS: Record<string, string> = {
  CORRUPTION_MENTION: 'verdict.webVerdictCorruption',
  RISK_MENTION: 'verdict.webVerdictRisk',
  EXCULPATORY: 'verdict.webVerdictExculpatory',
  NEUTRAL: 'verdict.webVerdictNeutral',
}

function ChapterPress({ vendorId, webEvidenceScore, t }: {
  vendorId: number
  webEvidenceScore: number | null
  t: TFunction
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-web-evidence', vendorId],
    queryFn: () => ariaApi.getWebEvidence(vendorId),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const articles: WebEvidenceArticle[] = data?.articles ?? []
  const notable = articles.filter((a) => a.verdict !== 'NEUTRAL')

  // Only render the chapter if the vendor has a web evidence score or any results
  const hasEvidence = webEvidenceScore !== null || articles.length > 0
  if (!isLoading && !hasEvidence) return null

  return (
    <ChapterShell id="chapter-press">
      <RedThreadChapter
        label={t('chapters.headings.press', { defaultValue: '§ PRENSA · REGISTROS' })}
        title={t('press.heading', { defaultValue: 'External Press & Registry Mentions' })}
      />
      <p className="text-text-muted mb-4 max-w-xl text-sm">
        {t('press.description', { defaultValue: 'CENTINELA web evidence — press mentions retrieved from public news sources and government registries.' })}
      </p>

      {isLoading && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="h-7 w-full bg-background-elevated animate-pulse rounded-sm" />
          <div className="h-7 w-5/6 bg-background-elevated animate-pulse rounded-sm" />
          <div className="h-7 w-4/6 bg-background-elevated animate-pulse rounded-sm" />
        </div>
      )}

      {!isLoading && articles.length === 0 && (
        <p className="text-text-secondary text-xs italic">
          {t('press.noResults', { defaultValue: 'No external press coverage found for this vendor.' })}
        </p>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="space-y-1.5" role="list" aria-label={t('press.listLabel', { defaultValue: 'Press mentions' })}>
          {(notable.length > 0 ? notable : articles).slice(0, 12).map((article, idx) => {
            const style = WEB_VERDICT_STYLE[article.verdict] ?? WEB_VERDICT_STYLE.NEUTRAL
            const verdictKey = WEB_VERDICT_KEYS[article.verdict] ?? WEB_VERDICT_KEYS.NEUTRAL
            const verdictLabel = t(verdictKey, { defaultValue: article.verdict })
            const dateStr = article.published_date
              ? new Date(article.published_date).getFullYear()
              : null
            return (
              <div
                key={idx}
                role="listitem"
                className="flex items-start gap-2.5 py-2 px-3 rounded-sm border border-border/50 bg-background-card"
              >
                {/* Verdict badge */}
                <span
                  className="flex-shrink-0 mt-0.5 text-[9px] font-mono font-semibold tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                  style={{ backgroundColor: style.bg, color: style.color }}
                >
                  {verdictLabel}
                </span>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {article.source_url ? (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-primary hover:text-accent transition-colors line-clamp-1 inline-flex items-center gap-1"
                    >
                      <span className="truncate">{article.snippet.slice(0, 120)}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" aria-hidden="true" />
                    </a>
                  ) : (
                    <p className="text-xs text-text-primary line-clamp-1">{article.snippet.slice(0, 120)}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {article.source_name && (
                      <span className="text-[10px] font-mono text-text-muted">{article.source_name}</span>
                    )}
                    {dateStr && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span className="text-[10px] font-mono text-text-muted">{dateStr}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && notable.length === 0 && articles.length > 0 && (
        <p className="text-[10px] text-text-muted italic mt-2">
          {t('press.allNeutral', { defaultValue: 'All retrieved articles were classified as neutral — no corruption or risk language detected.' })}
        </p>
      )}
    </ChapterShell>
  )
}

/**
 * PatternDiagnostic — medical lab-report layout for SHAP-style risk
 * decomposition. Each row is one feature ("test"), rendered as:
 *
 *   FEATURE LABEL ┃ -3σ ─── [p25══p75] ───●─── +3σ ┃ +0.248
 *
 * Where:
 *   • The horizontal scale spans -3σ to +3σ (sector standardized)
 *   • The lighter band marks the sector p25-p75 reference range
 *     (assumed roughly ±0.674σ for a normal distribution)
 *   • The marker is the vendor's z-score, colored red if it pushes
 *     risk up and the sample is in the tail (|z| ≥ 1)
 *   • The contribution badge shows the SHAP-style risk contribution
 *
 * The layout reads like a CBC or metabolic panel — designers in the
 * journalism world (FT, NYT) lean on the lab-report metaphor because
 * it inherits credibility from medicine. The same metaphor works
 * here: this is a *diagnosis*, not an opinion.
 */

// ─── Institutional Footprint Table — moved into ChapterNetwork's
//     ConcentricConstellation rewrite (component 4/10, 2026-05-25) ──

function ChapterNetwork({ vendorId, vendor, coBidders, institutions }: {
  vendorId: number
  vendor: { name: string; total_institutions: number; sectors_count: number; primary_sector_name?: string | null; first_contract_year?: number; last_contract_year?: number }
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number; loss_count: number; same_winner_ratio: number; relationship_strength: string }> | null
  institutions: Array<{
    institution_id: number
    institution_name: string
    institution_type?: string
    contract_count: number
    total_value_mxn: number
    avg_risk_score?: number
    first_year?: number
    last_year?: number
  }> | null
  t: TFunction
  i18n: { language: string }
}) {
  // Loading state — coBidders not yet resolved
  if (coBidders === null) {
    return (
      <ChapterShell id="chapter-network">
        <div className="h-[340px] rounded bg-background-elevated animate-pulse" role="status" aria-live="polite" />
      </ChapterShell>
    )
  }
  // Self-contained chapter renders heading + lede + constellation + sections
  return (
    <ConcentricConstellation
      vendorId={vendorId}
      subjectName={vendor.name}
      sectorName={vendor.primary_sector_name ?? null}
      totalInstitutions={vendor.total_institutions}
      sectorsCount={vendor.sectors_count}
      coBidders={coBidders}
      institutions={institutions ?? undefined}
    />
  )
}

// ─── Chapter 5: The Money ───────────────────────────────────────────────────

/**
 * MoneyStaircase — cumulative MXN as a stepped path. Replaces the
 * generic dual-axis bar+line with a "journey" visualization.
 *
 * The cumulative line tells the time-as-drama story that a year-by-year
 * bar chart can't. Each step's color is graduated by the avg risk in
 * that year, so the reader sees not just "money grew" but "money grew
 * during high-risk years." The three largest single-year jumps get
 * pinned annotations with year + delta. A final "$N by YEAR" callout
 * anchors the right edge.
 *
 * What Chapter II covered (year-by-year activity) is intentionally NOT
 * repeated here. This chapter is about the journey, not the snapshots.
 */
function ChapterMoney({ timeline, vendorName, primarySectorName }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  vendorName?: string
  primarySectorName?: string
  t?: unknown
}) {
  return (
    <MoneyStaircase
      timeline={timeline}
      vendorName={vendorName}
      primarySectorName={primarySectorName}
    />
  )
}

// ─── Chapter 6: The Verdict ─────────────────────────────────────────────────

/**
 * VerdictGauge — semicircular dial showing the risk score on a 0-100
 * arc segmented by the four risk levels. The needle pulses subtly to
 * draw the eye. Compact (160×96) so it floats next to the chapter
 * heading instead of dominating the layout.
 */
function RedThreadLine({ progress, lang }: { progress: number; lang: 'en' | 'es' }) {
  // Clamp once for both the fill height and the tip-dot position so the
  // dot can never escape the line at the bottom of the page.
  const pct = Math.max(0, Math.min(100, progress * 100))
  return (
    <div
      role="progressbar"
      aria-label={lang === 'en' ? 'Investigation progress' : 'Progreso de la investigación'}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed left-0 top-0 bottom-0 w-[3px] pointer-events-none z-50"
      style={{ background: 'rgba(220,38,38,0.08)' }}
    >
      <motion.div
        className="absolute top-0 left-0 w-full origin-top"
        style={{
          height: `${pct}%`,
          background: 'linear-gradient(to bottom, var(--color-risk-critical), rgba(153,27,27,0.55))',
        }}
        transition={{ ease: 'linear', duration: 0 }}
      />
      {/* Glowing pulse dot at tip */}
      <motion.div
        aria-hidden="true"
        className="absolute left-0 w-3 h-3 rounded-full -translate-x-[5px]"
        style={{
          top: `${Math.min(99, pct)}%`,
          background: 'var(--color-risk-critical)',
          boxShadow: '0 0 8px 2px rgba(220,38,38,0.53)',
        }}
      />
    </div>
  )
}

// ─── Chapter Navigation Dots ────────────────────────────────────────────────

function ChapterNav({ active, chapters, lang }: { active: number; chapters: Array<{ id: string; label: string; icon: React.ElementType }>; lang: 'en' | 'es' }) {
  // Smooth scroll + focus management for keyboard nav. Arrow keys cycle
  // through chapter anchors so screen-reader / keyboard users can move
  // through the investigation without a mouse.
  const onKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, idx: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = chapters[(idx + 1) % chapters.length]
      document.getElementById(`chapter-nav-${next.id}`)?.focus()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = chapters[(idx - 1 + chapters.length) % chapters.length]
      document.getElementById(`chapter-nav-${prev.id}`)?.focus()
    }
  }

  return (
    <nav
      aria-label={lang === 'en' ? 'Investigation chapters' : 'Capítulos de la investigación'}
      className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3"
    >
      {chapters.map((ch, idx) => {
        const isActive = active === idx
        return (
          <a
            key={ch.id}
            id={`chapter-nav-${ch.id}`}
            href={`#chapter-${ch.id}`}
            aria-label={`Chapter ${idx + 1}: ${ch.label}`}
            aria-current={isActive ? 'true' : undefined}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className="group flex items-center gap-2 justify-end focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-risk-critical)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] rounded-full"
          >
            <span className={cn(
              'text-xs transition-opacity text-text-muted hidden md:block',
              isActive
                ? 'opacity-100 text-text-primary font-medium'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            )}>
              {ch.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'rounded-full transition-all duration-300',
                isActive
                  ? 'w-2.5 h-2.5 bg-[var(--color-risk-critical)] shadow-[0_0_8px_2px_rgba(220,38,38,0.5)] ring-2 ring-[var(--color-risk-critical)]/30'
                  : 'w-2 h-2 bg-background-elevated group-hover:bg-text-muted'
              )}
            />
          </a>
        )
      })}
    </nav>
  )
}

// ─── Loading State ──────────────────────────────────────────────────────────

function ThreadSkeleton({ label: _label, vendorName }: { label: string; vendorName?: string }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Skeleton header strip */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-risk-critical rounded-full animate-pulse" />
          <div className="space-y-1">
            {vendorName
              ? <p className="text-sm font-mono text-text-primary truncate max-w-[420px]" title={vendorName}>{formatVendorName(vendorName, 60)}</p>
              : <div className="h-4 w-48 bg-border animate-pulse rounded" />
            }
            <div className="h-3 w-32 bg-border/60 animate-pulse rounded" />
          </div>
        </div>
      </div>
      {/* Chapter skeleton rows */}
      <div className="max-w-4xl mx-auto px-5 pt-8 space-y-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 bg-border/50 animate-pulse rounded" />
            <div className="h-6 w-64 bg-border animate-pulse rounded" />
            <div className="h-4 w-full bg-border/40 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-border/40 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedThread() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation('redThread')
  const id = Number(vendorId)

  const containerRef = useRef<HTMLDivElement>(null)
  const [activeChapter, setActiveChapter] = useState(0)

  const { scrollYProgress } = useScroll()

  // Build chapter list from translation keys
  const chapters = CHAPTER_IDS.map((chId) => ({
    id: chId,
    label: t(`chapters.${chId}`),
    icon: CHAPTER_ICONS[chId],
  }))

  // Track active chapter by scroll position (simple approach)
  const handleScroll = useCallback(() => {
    const chapterEls = CHAPTER_IDS.map((chId) => document.getElementById(`chapter-${chId}`))
    const scrollY = window.scrollY + window.innerHeight / 2
    let active = 0
    chapterEls.forEach((el, idx) => {
      if (el && el.offsetTop <= scrollY) active = idx
    })
    setActiveChapter(active)
  }, [])

  // Bind scroll handler to window — the outer div has no overflow so onScroll never fires
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // set initial active chapter
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Queries — all share three resilience flags:
  //   • staleTime keeps data fresh through transient deploy windows
  //   • refetchOnWindowFocus auto-recovers when the user comes back to a
  //     stale tab after a backend hiccup
  //   • retry on the root vendor query stays at default (3 attempts) so a
  //     single-packet network blip doesn't fail the whole page
  // Sub-resource queries that may legitimately 404 (ARIA queue, co-bidders)
  // keep retry: false — those are "expected absence" cases, not failures.
  const COMMON_QUERY_OPTS = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  } as const

  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
    error: vendorErrorObj,
    refetch: refetchVendor,
  } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorApi.getById(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: waterfall, isLoading: waterfallLoading } = useQuery({
    queryKey: ['vendor-waterfall', id],
    queryFn: () => vendorApi.getRiskWaterfall(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: timeline } = useQuery({
    queryKey: ['vendor-timeline', id],
    queryFn: () => vendorApi.getRiskTimeline(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: aria } = useQuery({
    queryKey: ['aria-vendor', id],
    queryFn: () => ariaApi.getVendorDetail(id),
    enabled: !!id && !isNaN(id),
    retry: false, // vendor may not be in ARIA queue — that's OK
    ...COMMON_QUERY_OPTS,
  })

  const { data: coBidders } = useQuery({
    queryKey: ['co-bidders', id],
    queryFn: () => networkApi.getCoBidders(id, 10, 5),
    // Network chapter is now at index 2 (subject=0, timeline=1, network=2);
    // fetch as soon as the user scrolls past timeline. The previous gate
    // (>= 3) targeted the old order where network was 4th.
    enabled: !!id && !isNaN(id) && activeChapter >= 1,
    retry: false,
    ...COMMON_QUERY_OPTS,
  })

  // Per-institution breakdown — used by the InstitutionalRibbon graph
  // in the Network chapter. Returns each institution with first_year,
  // last_year, contract_count, total_value_mxn, avg_risk_score so we
  // can plot horizontal lanes spanning each institution's tenure.
  const { data: institutions } = useQuery({
    queryKey: ['vendor-institutions', id],
    queryFn: () => vendorApi.getInstitutions(id, 50),
    enabled: !!id && !isNaN(id) && activeChapter >= 1,
    retry: false,
    ...COMMON_QUERY_OPTS,
  })

  // Distinguish "vendor doesn't exist" (404) from "backend unreachable" so
  // the UI can give the reader an actionable message instead of the same
  // generic "Could not load" for every failure mode. Was a single early-
  // return that produced indistinguishable error states for 404, 5xx, and
  // network-down.
  const vendorErrorStatus = (vendorErrorObj as AxiosError | undefined)?.response?.status

  // scroll progress for the thread line (page-level)
  const [scrollPct, setScrollPct] = useState(0)
  scrollYProgress.on('change', setScrollPct)

  if (isNaN(id)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted">
        {t('errors.invalidId')}
      </div>
    )
  }

  if (vendorLoading) return <ThreadSkeleton label={t('loading')} vendorName={location.state?.vendorName as string | undefined} />

  // 404 — vendor genuinely does not exist. Distinct UI from network failure
  // so the reader knows retrying won't help and they should pick a different
  // vendor. (Was: same generic "Could not load" UI as 5xx/network errors.)
  if (vendorError && vendorErrorStatus === 404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-text-muted" aria-hidden="true" />
        <div>
          <p className="text-text-primary font-medium mb-1">
            {t('errors.vendorNotFound')}
          </p>
          <p className="text-text-muted text-sm">
            {t('errors.vendorNotFoundHint', { defaultValue: 'Vendor #' + id + ' is not in the procurement database. It may have been deduplicated, or the ID is wrong.' })}
          </p>
        </div>
        <button onClick={() => navigate('/aria')} className="text-risk-critical text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }

  // 5xx, network, or other transient — give the reader a Retry button
  // instead of forcing them to navigate away and back. The page often comes
  // back on its own once the deploy window or network blip clears.
  if (vendorError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-risk-critical" aria-hidden="true" />
        <div>
          <p className="text-text-primary font-medium mb-1">{t('errors.loadFailed')}</p>
          <p className="text-text-muted text-sm">
            {t('errors.loadFailedHint', { defaultValue: 'Backend returned ' + (vendorErrorStatus ?? 'no response') + '. This usually clears within a minute.' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchVendor()}
            className="text-sm font-medium px-3 py-1.5 rounded-sm border border-border hover:bg-background-elevated/40 transition-colors inline-flex items-center gap-1.5"
          >
            {t('errors.retry', { defaultValue: 'Retry' })}
          </button>
          <button onClick={() => navigate('/aria')} className="text-risk-critical text-sm underline">
            {t('errors.goBack')}
          </button>
        </div>
      </div>
    )
  }
  if (!vendor) {
    // Defensive — useQuery returned success but no payload. Treated as
    // "vendor not found" since that's the only realistic shape that gets
    // here (ID mismatch, race, etc.).
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-text-muted">{t('errors.vendorNotFound')}</p>
        <button onClick={() => navigate('/aria')} className="text-risk-critical text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[var(--color-background)]">
      {/* Fixed elements */}
      <RedThreadLine progress={scrollPct} lang={i18n.language === 'en' ? 'en' : 'es'} />
      <ChapterNav active={activeChapter} chapters={chapters} lang={i18n.language === 'en' ? 'en' : 'es'} />

      {/* Back nav */}
      <div className="sticky top-0 z-40 px-3 sm:px-8 py-3 bg-[var(--color-background)]/80 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/aria')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t('nav.back')}
        </button>
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-risk-critical)] animate-pulse flex-shrink-0" />
          <span className="text-xs text-text-secondary uppercase tracking-widest">{t('nav.redThread')}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted max-w-[160px] md:max-w-[240px] truncate" title={vendor.name}>{formatVendorName(vendor.name, 40)}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const text = `RUBLI Investigation: ${vendor.name} — ${window.location.href}`
              navigator.clipboard?.writeText(text).catch(() => {})
            }}
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-accent transition-colors px-2 py-1 rounded border border-border/40 hover:border-accent/40"
            title={i18n.language.startsWith('es') ? 'Copiar enlace de investigación' : 'Copy investigation link'}
          >
            <Share2 className="h-3 w-3" aria-hidden="true" />
            {i18n.language.startsWith('es') ? 'Citar' : 'Cite'}
          </button>
          <EntityIdentityChip type="vendor" id={id} name={vendor.name} size="xs" />
        </div>
      </div>

      {/* Breadcrumb — gives journalists arriving via search a sense of where they are */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 px-4 sm:px-8 pt-4 pb-1 text-[11px] text-text-muted/60 font-mono">
        <Link to="/aria" className="hover:text-text-muted transition-colors">
          {i18n.language.startsWith('es') ? 'Cola de Riesgo' : 'Risk Queue'}
        </Link>
        <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[240px]">{formatVendorName(vendor.name, 40)}</span>
        <span className="text-text-muted/40 ml-0.5">
          {i18n.language.startsWith('es') ? '· Hilo' : '· Thread'}
        </span>
      </nav>

      {/* Chapters — order: Subject → Timeline → Network → Money → Pattern → Verdict.
          Pattern (algorithmic diagnosis) sits immediately before Verdict
          since the verdict cites it as evidence. Network moves up so
          relationships precede the financial chapter. */}
      <div className="pl-6">
        <ChapterSubject
          vendor={vendor}
          aria={aria ? { ips_final: aria.ips_final, ips_tier: aria.ips_tier, primary_sector_name: aria.primary_sector_name } : null}
          t={t}
        />

        <ChapterDivider />

        <ChapterTimeline
          totalContracts={vendor.total_contracts}
          vendorFirstYear={vendor.first_contract_year}
          vendorLastYear={vendor.last_contract_year}
          timeline={timeline?.timeline ?? []}
          vendorName={vendor.name}
          primarySectorName={vendor.primary_sector_name}
          t={t}
        />

        <ChapterDivider />

        <ChapterNetwork
          vendorId={id}
          vendor={{
            name: vendor.name,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
            primary_sector_name: vendor.primary_sector_name ?? aria?.primary_sector_name ?? null,
            first_contract_year: vendor.first_contract_year,
            last_contract_year: vendor.last_contract_year,
          }}
          coBidders={coBidders?.co_bidders ?? null}
          institutions={institutions?.data ?? null}
          t={t}
          i18n={i18n}
        />

        <ChapterDivider />

        <ChapterMoney
          timeline={(timeline?.timeline ?? []).map((item) => ({
            year: item.year,
            avg_risk_score: item.avg_risk_score,
            contract_count: item.contract_count,
            total_value: item.total_value,
          }))}
          vendorName={vendor.name}
          primarySectorName={vendor.primary_sector_name}
          t={t}
        />

        <ChapterDivider />

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
          isLoading={waterfallLoading}
          primarySectorName={vendor.primary_sector_name}
          t={t}
        />

        <ChapterDivider />

        <ChapterPress
          vendorId={id}
          webEvidenceScore={aria?.web_evidence_score ?? null}
          t={t}
        />

        <ChapterDivider />

        <ChapterVerdict
          vendorId={id}
          vendor={{
            name: vendor.name,
            avg_risk_score: vendor.avg_risk_score,
            in_ground_truth: aria?.in_ground_truth,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
            total_contracts: vendor.total_contracts,
          }}
          coBidderCount={coBidders?.co_bidders?.length ?? 0}
          aria={aria ? {
            ips_final: aria.ips_final,
            ips_tier: aria.ips_tier,
            primary_pattern: aria.primary_pattern,
            review_status: aria.review_status,
            is_efos_definitivo: aria.is_efos_definitivo,
            is_sfp_sanctioned: aria.is_sfp_sanctioned,
            in_ground_truth: aria.in_ground_truth,
            memo_text: aria.memo_text,
            web_evidence_score: aria.web_evidence_score,
            web_evidence_verdict: aria.web_evidence_verdict,
            web_evidence_updated_at: aria.web_evidence_updated_at,
          } : null}
          t={t}
        />
      </div>

      {/* Honest "what's missing" footnote — Phase 3 trust-building.
          Acknowledging what the data CAN'T tell is journalistic
          accountability. Never let the reader walk away thinking
          this was a complete picture. */}
      <section
        id="chapter-disclosure"
        className="py-6 px-4 sm:px-8 max-w-4xl mx-auto border-t border-border mt-8"
      >
        <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('disclosure.label', { defaultValue: "What this thread can't tell you" })}
        </p>
        <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
          {t('disclosure.body', {
            defaultValue:
              "The COMPRANET dataset has known structural gaps. RFC (vendor tax ID) coverage is uneven across periods (0.1% in 2002–2010, 47% in 2023+). Beneficial-ownership data is not tracked. Contract documents (the actual scope of work, deliverables, modifications) are not in this dataset. Subcontracting relationships are not exposed. The risk score measures statistical similarity to documented corruption patterns — not proof of wrongdoing. Treat every flag as a hypothesis to verify, not a verdict.",
          })}
        </p>
      </section>

      {/* Bottom padding */}
      <div className="h-24" />
    </div>
  )
}
