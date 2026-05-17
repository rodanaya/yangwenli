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
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion, useScroll, useInView } from 'framer-motion'
import { vendorApi, ariaApi, networkApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
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
} from 'lucide-react'
// Extracted to components/thread/
import { ChapterSubject } from '@/components/thread/ChapterSubject'
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'
import { PatternDiagnostic } from '@/components/thread/PatternDiagnostic'
import { ConcentricConstellation, classifyRole } from '@/components/thread/ConcentricConstellation'
import { InstitutionalRibbon } from '@/components/thread/InstitutionalRibbon'
import { MoneyStaircase } from '@/components/thread/MoneyStaircase'
import { ChapterVerdict } from '@/components/thread/ChapterVerdict'
import { Skeleton } from '@/components/ui/skeleton'

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

// Pattern palette — mapped to canonical design tokens (bible §2). No invented
// 7-color palette: we reuse risk + sector tokens so pattern chips read as part
// of the editorial system.
//   P1 Monopoly       → risk-critical (structural, severe)
//   P2 Ghost companies → risk-critical (worst signal)
//   P3 Intermediary   → risk-high
//   P4 Splitting      → risk-high
//   P5 Overpricing    → accent-data (evidence, numeric)
//   P6 Capture        → accent (gold — institutional)
//   P7 Misc           → sector-hacienda (green treasury — neutral)
function getPatternMeta(t: TFunction): Record<string, { label: string; color: string; bg: string; description: string }> {
  return {
    P1: { label: t('patterns.P1.label'), color: 'var(--color-risk-critical)',       bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P1.description') },
    P2: { label: t('patterns.P2.label'), color: 'var(--color-risk-critical)',       bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P2.description') },
    P3: { label: t('patterns.P3.label'), color: 'var(--color-risk-high)',           bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P3.description') },
    P4: { label: t('patterns.P4.label'), color: 'var(--color-risk-high)',           bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P4.description') },
    P5: { label: t('patterns.P5.label'), color: 'var(--color-accent-data)',         bg: 'rgba(37,99,235,0.10)',   description: t('patterns.P5.description') },
    P6: { label: t('patterns.P6.label'), color: 'var(--color-accent)',              bg: 'rgba(160,104,32,0.10)',  description: t('patterns.P6.description') },
    P7: { label: t('patterns.P7.label'), color: 'var(--color-sector-hacienda)',     bg: 'rgba(22,163,74,0.10)',   description: t('patterns.P7.description') },
  }
}

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

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

function ChapterTimeline({ totalContracts, vendorFirstYear, vendorLastYear, timeline }: {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: TimelineItem[]
  t?: unknown
}) {
  return (
    <TimelineHourglass
      totalContracts={totalContracts}
      vendorFirstYear={vendorFirstYear}
      vendorLastYear={vendorLastYear}
      timeline={timeline}
    />
  )
}

// ─── Chapter 3: The Pattern ─────────────────────────────────────────────────

function ChapterPattern({ waterfall, ariaPattern, isLoading, t }: {
  waterfall: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  ariaPattern: string | null
  isLoading?: boolean
  t: TFunction
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const PATTERN_META = getPatternMeta(t)
  const meta = ariaPattern ? PATTERN_META[ariaPattern] : null

  // Sort: positive contributions first (drivers), then protective factors
  const safeWaterfall = Array.isArray(waterfall) ? waterfall : []
  const sorted = [...safeWaterfall]
    .filter((f) => Math.abs(f.contribution) > 0.001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)

  // Cap diagnostic panel at 6 rows. Below 6 the contributions are <0.05
  // and add visual noise without explaining the pattern.
  const sortedSix = sorted.slice(0, 6)

  return (
    <ChapterShell id="chapter-pattern">
      <RedThreadChapter label={t('chapters.headings.pattern')} title={t('pattern.heading')} />
      <p className="text-text-muted mb-6 max-w-xl text-sm">
        {t('pattern.description')}
      </p>

      {/* ARIA pattern badge — compact one-liner instead of a 6-padding card */}
      {meta && ariaPattern && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-sm border px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: meta.bg, borderColor: meta.color + '44' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
          <span className="editorial-label" style={{ color: meta.color }}>{ariaPattern}</span>
          <span className="text-sm font-bold text-text-primary">{meta.label}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary text-xs leading-relaxed flex-1 min-w-[280px]">{meta.description}</span>
        </motion.div>
      )}

      {/* Diagnostic panel — replaces the SHAP waterfall with a medical
          lab-report layout. Each row shows the feature on a -3σ to +3σ
          axis with sector p25-p75 reference band, vendor's marker dot,
          and contribution value. Reader sees instantly which "lab values"
          are out of normal range vs within the population. */}
      <div ref={ref}>
        {isLoading && safeWaterfall.length === 0 ? (
          <div className="space-y-2" role="status" aria-live="polite" aria-label={t('pattern.loadingLabel', { defaultValue: 'Loading diagnostic features' })}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <PatternDiagnostic
            features={sortedSix}
            inView={inView}
            raisesLabel={t('pattern.raisesRisk', { defaultValue: 'raises' })}
            lowersLabel={t('pattern.lowersRisk', { defaultValue: 'lowers' })}
            referenceLabel={t('pattern.sectorReference', { defaultValue: 'sector p25–p75' })}
            diagnosisLabel={t('pattern.diagnosis', {
              defaultValue: '{{anomalous}} of {{total}} lab values outside sector reference range',
              anomalous: sortedSix.filter((f) => Math.abs(f.z_score) >= 1).length,
              total: sortedSix.length,
            })}
          />
        )}
      </div>

      {!isLoading && safeWaterfall.length === 0 && (
        <div className="text-text-secondary text-sm italic">{t('pattern.noData')}</div>
      )}

      <p className="text-[10px] text-text-muted italic mt-2 leading-relaxed">
        {t('pattern.shapNote')}
      </p>
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
function ChapterNetwork({ vendorId, vendor, coBidders, institutions, t, i18n }: {
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
  const totalCoBidders = coBidders?.length ?? 0
  const topCoBidder = coBidders?.[0] ?? null
  const sectorName = vendor.primary_sector_name ?? null

  // Topology read — interprets the constellation in plain language
  const topologyRead =
    totalCoBidders === 0 && vendor.total_institutions <= 5
      ? t('network.topology.tightSingleSource')
      : totalCoBidders === 0
      ? t('network.topology.broadSingleSource')
      : totalCoBidders <= 3
      ? t('network.topology.thinNetwork')
      : t('network.topology.denseNetwork')

  return (
    <ChapterShell id="chapter-network">
      <RedThreadChapter label={t('chapters.headings.network')} title={t('network.heading')} />
      <p className="text-text-secondary mb-3 max-w-2xl text-sm leading-relaxed">
        {t('network.constellationDescription')}
      </p>

      {/* The constellation — always renders, even with 0 co-bidders */}
      <div className="bg-background-card border border-border rounded-sm p-4 mb-3">
        {coBidders === null ? (
          <div
            className="h-[340px] rounded bg-background-elevated animate-pulse"
            role="status"
            aria-live="polite"
            aria-label={t('network.loadingConstellation', { defaultValue: 'Loading network constellation' })}
          />
        ) : (
          <ConcentricConstellation
            subjectName={vendor.name}
            sectorName={sectorName}
            totalInstitutions={vendor.total_institutions}
            sectorsCount={vendor.sectors_count}
            coBidders={coBidders}
            t={t}
            i18n={i18n}
          />
        )}
      </div>

      {/* Empty-state note — coBidders is loaded but contains zero entries.
          A blank space here reads as "data missing"; this clarifies it's
          an editorial finding (the vendor never shared a procedure). */}
      {coBidders !== null && coBidders.length === 0 && (
        <div className="rounded-sm border border-border bg-background-card/40 px-4 py-3 mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1">
            {t('network.noCoBiddersLabel', { defaultValue: 'No co-bidders on record' })}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
            {t('network.noCoBiddersBody', {
              defaultValue:
                'This vendor has not participated in a single procedure alongside another bidder in the COMPRANET record. Either every contract was awarded by direct adjudication, or every competitive procedure had only one valid bidder. Both are themselves signals.',
            })}
          </p>
        </div>
      )}

      {/* Topology read — plain-language interpretation */}
      <p className="text-xs text-text-secondary mb-3 max-w-2xl leading-relaxed">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-text-muted">{t('network.topologyRead')}</span>
        {' '}— {topologyRead}
      </p>

      {/* Top co-bidder callout — only when present */}
      {topCoBidder && (
        <p className="text-xs text-text-secondary mb-3 max-w-2xl leading-relaxed">
          <span className="text-text-muted">{t('network.mostFrequent')}</span>{' '}
          <EntityIdentityChip
            type="vendor"
            id={topCoBidder.vendor_id}
            name={topCoBidder.vendor_name}
            narrative={true}
            size="xs"
            className="inline-flex align-middle"
          />
          {' '}— {t('network.sharedProcedures', { count: topCoBidder.co_bid_count })}, {classifyRole(topCoBidder, t).label.toLowerCase()}.
        </p>
      )}

      {/* Second graph — InstitutionalRibbon. Each institution is one
          horizontal lane spanning their first→last contract year, with
          ribbon thickness encoding value and color encoding avg risk.
          Top concentration is auto-annotated. */}
      {institutions && institutions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1.5">
            {t('network.institutionalRibbonLabel')}
          </p>
          <h3 className="font-serif text-base font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {t('network.institutionalRibbonHeading')}
          </h3>
          <p className="text-text-secondary mb-4 max-w-2xl text-xs leading-relaxed">
            {t('network.institutionalRibbonDescription')}
          </p>
          <div className="bg-background-card border border-border/60 rounded-sm p-3">
            <InstitutionalRibbon
              institutions={institutions}
              vendorFirstYear={vendor.first_contract_year ?? 2008}
              vendorLastYear={vendor.last_contract_year ?? 2025}
              i18n={i18n}
            />
          </div>
          <p className="mt-2 text-[10px] font-mono text-text-muted/60 tracking-[0.08em]">
            {t('network.ribbonSourceFooter')}
          </p>
        </div>
      )}

      {/* CTA */}
      <Link
        to={`/network?vendor=${vendorId}`}
        className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors mt-4"
      >
        <GitBranch className="w-3.5 h-3.5" />
        {t('network.openNetworkGraph')}
        <ExternalLink className="w-3 h-3" />
      </Link>
    </ChapterShell>
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
function ChapterMoney({ timeline, t }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  t: TFunction
}) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const totalValue = timeline.reduce((s, item) => s + item.total_value, 0)
  const peakYear = timeline.reduce((max, item) => item.total_value > (max.total_value ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakRiskYear = timeline.reduce((max, item) => (item.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakShare = totalValue > 0 ? (peakYear.total_value / totalValue) * 100 : 0

  // Active year for the detail panel — hover wins, then pinned, else peak by value
  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  let runningCum = 0
  const cumByYear = new Map<number, { cum: number; share: number; deltaShare: number }>()
  for (const item of sorted) {
    runningCum += item.total_value
    cumByYear.set(item.year, {
      cum: runningCum,
      share: totalValue > 0 ? (runningCum / totalValue) * 100 : 0,
      deltaShare: totalValue > 0 ? (item.total_value / totalValue) * 100 : 0,
    })
  }
  const detailYear = hoverYear ?? selectedYear
  const detailItem =
    detailYear != null
      ? sorted.find((item) => item.year === detailYear) ?? peakYear
      : peakYear
  const detailRisk = detailItem.avg_risk_score ?? 0
  const detailColor = RISK_DOT_COLORS[getRiskLevel(detailRisk)]
  const detailCum = cumByYear.get(detailItem.year) ?? { cum: 0, share: 0, deltaShare: 0 }

  return (
    <ChapterShell id="chapter-money">
      <RedThreadChapter
        label={t('chapters.headings.money')}
        title={t('money.heading', { value: formatCompactMXN(totalValue) })}
      />
      <p className="text-text-secondary mb-4 max-w-2xl text-sm leading-relaxed">
        {t('money.staircaseDescription')}
      </p>

      {/* Inline anchor stats — concentration + peak risk year */}
      {peakYear && (
        <div className="flex items-baseline gap-6 mb-3 flex-wrap">
          <div>
            <span className="text-base font-bold text-text-primary font-mono tabular-nums">{peakShare.toFixed(0)}%</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.flowedIn', { year: peakYear.year })}</span>
          </div>
          {peakRiskYear && (
            <div>
              <span className="text-base font-bold font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{((peakRiskYear.avg_risk_score ?? 0) * 100).toFixed(0)}%</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.peakRiskYearShort')}</span>
              <span className="text-xs ml-2 font-mono tabular-nums text-text-muted">{peakRiskYear.year}</span>
            </div>
          )}
          {selectedYear != null && (
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className="ml-auto text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted hover:text-text-primary transition-colors"
            >
              {t('timeline.unpin')}
            </button>
          )}
        </div>
      )}

      <div className="bg-background-card border border-border/60 rounded-sm p-3">
        <MoneyStaircase
          timeline={timeline}
          selectedYear={selectedYear}
          hoverYear={hoverYear}
          onHoverYear={setHoverYear}
          onSelectYear={setSelectedYear}
          byYearLabel={t('money.byYear')}
        />
      </div>

      {/* Detail panel — mirrors Chapter II's interactivity. Hover any
          year column or click to pin; the panel updates to show the
          jump for that year + the cumulative share to date. */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2.5 rounded-sm border border-border bg-background-card/40">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {hoverYear != null
              ? t('timeline.detail.hovering')
              : selectedYear != null
              ? t('timeline.detail.pinned')
              : t('money.peakByValue')}
          </p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{detailItem.year}</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: detailColor }}>
            {Math.round(detailRisk * 100)}% {t('timeline.detail.avgRisk').toLowerCase()}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('money.detail.delta')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">+{formatCompactMXN(detailItem.total_value)}</p>
          <p className="text-[10px] font-mono tabular-nums text-text-muted">{detailCum.deltaShare.toFixed(1)}% {t('timeline.detail.ofTotal')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('money.detail.cumulative')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatCompactMXN(detailCum.cum)}</p>
          <p className="text-[10px] font-mono tabular-nums text-text-muted">{detailCum.share.toFixed(0)}% {t('money.detail.toDate')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('timeline.detail.contracts')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatNumber(detailItem.contract_count)}</p>
        </div>
      </div>

      <p className="text-[10px] text-text-muted italic mt-3 leading-relaxed">
        {t('money.riskNote')}
      </p>
    </ChapterShell>
  )
}

// ─── Chapter 6: The Verdict ─────────────────────────────────────────────────

/**
 * VerdictGauge — semicircular dial showing the risk score on a 0-100
 * arc segmented by the four risk levels. The needle pulses subtly to
 * draw the eye. Compact (160×96) so it floats next to the chapter
 * heading instead of dominating the layout.
 */
function RedThreadLine({ progress }: { progress: number }) {
  // Clamp once for both the fill height and the tip-dot position so the
  // dot can never escape the line at the bottom of the page.
  const pct = Math.max(0, Math.min(100, progress * 100))
  return (
    <div
      role="progressbar"
      aria-label="Investigation progress"
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

function ChapterNav({ active, chapters }: { active: number; chapters: Array<{ id: string; label: string; icon: React.ElementType }> }) {
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
      aria-label="Investigation chapters"
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

function ThreadSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-1 h-16 bg-risk-critical mx-auto mb-6 animate-pulse rounded-full" />
        <p className="text-text-muted text-sm animate-pulse">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedThread() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
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

  if (vendorLoading) return <ThreadSkeleton label={t('loading')} />

  // 404 — vendor genuinely does not exist. Distinct UI from network failure
  // so the reader knows retrying won't help and they should pick a different
  // vendor. (Was: same generic "Could not load" UI as 5xx/network errors.)
  if (vendorError && vendorErrorStatus === 404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-text-muted" />
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
        <AlertTriangle className="h-8 w-8 text-destructive" />
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
    <div id="main-content" ref={containerRef} className="relative min-h-screen bg-[var(--color-background)]">
      {/* Fixed elements */}
      <RedThreadLine progress={scrollPct} />
      <ChapterNav active={activeChapter} chapters={chapters} />

      {/* Back nav */}
      <div className="sticky top-0 z-40 px-3 sm:px-8 py-3 bg-[var(--color-background)]/80 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/aria')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.back')}
        </button>
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-risk-critical)] animate-pulse flex-shrink-0" />
          <span className="text-xs text-text-secondary uppercase tracking-widest">{t('nav.redThread')}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted max-w-[160px] md:max-w-[240px] truncate" title={vendor.name}>{formatVendorName(vendor.name, 40)}</span>
        </div>
        <EntityIdentityChip type="vendor" id={id} name={vendor.name} size="xs" />
      </div>

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
          t={t}
        />

        <ChapterDivider />

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
          isLoading={waterfallLoading}
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
