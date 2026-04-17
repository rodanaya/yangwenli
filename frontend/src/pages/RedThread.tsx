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
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion, useScroll, useInView, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { vendorApi, ariaApi, networkApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  ArrowLeft,
  ExternalLink,
  Download,
  BookmarkPlus,
  AlertTriangle,
  Building2,
  GitBranch,
  DollarSign,
  Gavel,
  FileText,
  Clock,
  Zap,
  Shield,
  ChevronDown,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────

const CHAPTER_IDS = ['subject', 'timeline', 'pattern', 'network', 'money', 'verdict'] as const
type ChapterId = typeof CHAPTER_IDS[number]

const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  subject:  Building2,
  timeline: Clock,
  pattern:  AlertTriangle,
  network:  GitBranch,
  money:    DollarSign,
  verdict:  Gavel,
}

function getPatternMeta(t: TFunction): Record<string, { label: string; color: string; bg: string; description: string }> {
  return {
    P1: { label: t('patterns.P1.label'), color: '#f87171', bg: 'rgba(248,113,113,0.1)',  description: t('patterns.P1.description') },
    P2: { label: t('patterns.P2.label'), color: '#c084fc', bg: 'rgba(192,132,252,0.1)', description: t('patterns.P2.description') },
    P3: { label: t('patterns.P3.label'), color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  description: t('patterns.P3.description') },
    P4: { label: t('patterns.P4.label'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  description: t('patterns.P4.description') },
    P5: { label: t('patterns.P5.label'), color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  description: t('patterns.P5.description') },
    P6: { label: t('patterns.P6.label'), color: '#f472b6', bg: 'rgba(244,114,182,0.1)', description: t('patterns.P6.description') },
    P7: { label: t('patterns.P7.label'), color: '#34d399', bg: 'rgba(52,211,153,0.1)',  description: t('patterns.P7.description') },
  }
}

const RISK_DOT_COLORS: Record<string, string> = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fbbf24',
  low:      '#4ade80',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">
      {children}
    </h2>
  )
}

function ChapterDivider() {
  return (
    <div className="flex items-center gap-4 my-16">
      <div className="h-px flex-1 bg-background-elevated" />
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
      <div className="h-px flex-1 bg-background-elevated" />
    </div>
  )
}

function AnnotationNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-text-muted italic mt-1 leading-relaxed">
      {children}
    </p>
  )
}

// ─── Chapter 1: The Subject ─────────────────────────────────────────────────

function ChapterSubject({ vendor, aria, t }: {
  vendor: { name: string; total_value_mxn: number; total_contracts: number; primary_sector_name?: string; avg_risk_score?: number; first_contract_year?: number; last_contract_year?: number; high_risk_pct: number; direct_award_pct: number }
  aria: { ips_final: number; ips_tier: number; primary_sector_name?: string | null } | null
  t: TFunction
}) {
  // Fallback to ARIA sector when vendor object has no primary_sector_name
  const sectorName = vendor.primary_sector_name ?? aria?.primary_sector_name ?? null
  const sectorColor = sectorName
    ? SECTOR_COLORS[sectorName.toLowerCase()] ?? '#dc2626'
    : '#dc2626'

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]

  return (
    <section id="chapter-subject" className="min-h-screen flex flex-col justify-center py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>{t('chapters.headings.subject')}</ChapterLabel>

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif font-bold text-white leading-[1.05] mb-8"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
          letterSpacing: '-0.025em',
        }}
        title={vendor.name}
      >
        {formatVendorName(vendor.name, 70)}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-wrap items-center gap-3 mb-12"
      >
        {sectorName && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: sectorColor + '22', color: sectorColor, border: `1px solid ${sectorColor}44` }}
          >
            {sectorName}
          </span>
        )}
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{ backgroundColor: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}44` }}
        >
          {t('subject.riskBadge', { level: riskLevel })}
        </span>
        {aria && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-red-950 text-red-300 border border-red-800">
            {t('subject.ariaTier', { tier: aria.ips_tier })}
          </span>
        )}
      </motion.div>

      {/* Key stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        {[
          {
            label: t('kpi.totalValue'),
            value: formatCompactMXN(vendor.total_value_mxn),
            note: t('notes.allContracts'),
          },
          {
            label: t('kpi.contracts'),
            value: formatNumber(vendor.total_contracts),
            note: `${vendor.first_contract_year ?? '?'} – ${vendor.last_contract_year ?? '?'}`,
          },
          {
            label: t('kpi.directAwards'),
            value: `${Math.round(vendor.direct_award_pct)}%`,
            note: t('notes.vsNational'),
          },
          {
            label: t('kpi.highRisk'),
            value: `${Math.round(vendor.high_risk_pct)}%`,
            note: t('notes.oecdBenchmark'),
          },
        ].map((s) => (
          <div key={s.label} className="bg-background border border-border rounded-xl p-5">
            <p className="editorial-label text-text-muted mb-1">{s.label}</p>
            <p className="text-2xl font-black text-white tabular-nums">{s.value}</p>
            <AnnotationNote>{s.note}</AnnotationNote>
          </div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="text-text-muted text-lg leading-relaxed max-w-2xl"
        // introText uses {{name}} placeholder — vendor.name is escaped to prevent XSS
        dangerouslySetInnerHTML={{
          __html: t('subject.introText', {
            name: `<strong class="text-white">${formatVendorName(vendor.name, 60)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}</strong>`,
          }),
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-16 flex items-center gap-2 text-text-secondary"
      >
        <ChevronDown className="w-4 h-4 animate-bounce" />
        <span className="text-xs tracking-widest uppercase">{t('subject.scrollHint')}</span>
      </motion.div>
    </section>
  )
}

// ─── Chapter 2: The Timeline ────────────────────────────────────────────────

function ChapterTimeline({ totalContracts, vendorFirstYear, vendorLastYear, timeline, t }: {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  t: TFunction
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  // Use year-aggregate timeline data (covers ALL years, not just 100 most-recent contracts)
  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year)
  const years = sortedTimeline.map((item) => item.year)
  const minYear = years[0] ?? vendorFirstYear ?? 2010
  const maxYear = years[years.length - 1] ?? vendorLastYear ?? 2025
  const displayTotal = totalContracts ?? sortedTimeline.reduce((s, item) => s + item.contract_count, 0)

  // Normalize dot sizes: log scale, 10px–44px based on total_value per year
  const maxValue = Math.max(...sortedTimeline.map((item) => item.total_value), 1)

  return (
    <section id="chapter-timeline" className="min-h-screen py-24 px-8 max-w-5xl mx-auto">
      <ChapterLabel>{t('chapters.headings.timeline')}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {t('timeline.heading', { total: formatNumber(displayTotal), minYear, maxYear })}
      </h2>
      <p className="text-zinc-400 mb-12 max-w-xl">
        {t('timeline.dotDescription')}
      </p>

      <div ref={ref} className="relative">
        {/* Year axis */}
        <div className="flex justify-between text-xs text-zinc-500 mb-3 px-1">
          {years.filter((_, i) => i % 3 === 0 || i === years.length - 1).map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>

        {/* Dot field — one dot per year, spread across timeline */}
        <div className="relative h-48 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden px-4 py-2">
          {sortedTimeline.map((item, idx) => {
            const xPct = maxYear > minYear ? ((item.year - minYear) / (maxYear - minYear)) * 94 + 3 : 50
            const risk = item.avg_risk_score ?? 0
            const level = getRiskLevel(risk)
            const size = Math.max(10, Math.min(44, 10 + (Math.log(item.total_value + 1) / Math.log(maxValue + 1)) * 34))
            // Deterministic y jitter by year index
            const sinVal = Math.sin(idx * 137.508 + 1.618) * 10000
            const yPct = 15 + (sinVal - Math.floor(sinVal)) * 70
            return (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 0.9, scale: 1 } : {}}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: 'backOut' }}
                className="absolute rounded-full cursor-pointer hover:opacity-100 hover:scale-125 transition-transform"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  width: size,
                  height: size,
                  backgroundColor: RISK_DOT_COLORS[level],
                  transform: 'translate(-50%, -50%)',
                  boxShadow: risk > 0.6 ? `0 0 8px 2px ${RISK_DOT_COLORS[level]}55` : 'none',
                  zIndex: Math.round(size),
                }}
                title={`${item.year} · ${formatCompactMXN(item.total_value)} · ${item.contract_count} contracts · avg risk ${(risk * 100).toFixed(0)}%`}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          {Object.entries(RISK_DOT_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-zinc-500 capitalize">{level}</span>
            </div>
          ))}
          <div className="ml-auto text-xs text-zinc-600">
            {t('timeline.legend.sizeLabel')}
          </div>
        </div>
      </div>

      <ChapterDivider />

      {/* Yearly breakdown cards — from timeline aggregates */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-8">
        {sortedTimeline.slice(-12).map((item) => {
          const risk = item.avg_risk_score ?? 0
          const pctHigh = risk * 100
          return (
            <div key={item.year} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">{item.year}</p>
              <p className="text-sm font-bold text-white tabular-nums">{formatCompactMXN(item.total_value)}</p>
              <p className="text-xs mt-0.5 tabular-nums" style={{ color: pctHigh > 40 ? '#f87171' : pctHigh > 25 ? '#fb923c' : '#6b7280' }}>
                {item.contract_count} · {Math.round(pctHigh)}% risk
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Chapter 3: The Pattern ─────────────────────────────────────────────────

function ChapterPattern({ waterfall, ariaPattern, t }: {
  waterfall: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  ariaPattern: string | null
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

  const maxAbs = Math.max(...sorted.map((f) => Math.abs(f.contribution)), 0.01)

  return (
    <section id="chapter-pattern" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>{t('chapters.headings.pattern')}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {t('pattern.heading')}
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        {t('pattern.description')}
      </p>

      {/* ARIA pattern badge */}
      {meta && ariaPattern && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border p-6 mb-10"
          style={{ backgroundColor: meta.bg, borderColor: meta.color + '44' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: meta.color }} />
            <span className="editorial-label" style={{ color: meta.color }}>{ariaPattern}</span>
            <span className="text-lg font-bold text-white ml-2">{meta.label}</span>
          </div>
          <p className="text-text-primary text-sm leading-relaxed">{meta.description}</p>
        </motion.div>
      )}

      {/* Waterfall bars */}
      <div ref={ref} className="space-y-3">
        {sorted.map((f, idx) => {
          const isPositive = f.contribution > 0
          const width = (Math.abs(f.contribution) / maxAbs) * 100
          const color = isPositive ? '#f87171' : '#4ade80'
          const bgColor = isPositive ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)'
          return (
            <motion.div
              key={f.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-lg border border-border overflow-hidden"
              style={{ backgroundColor: bgColor }}
            >
              {/* Fill bar */}
              <motion.div
                className="absolute inset-y-0 left-0"
                initial={{ width: 0 }}
                animate={inView ? { width: `${width}%` } : {}}
                transition={{ delay: idx * 0.07 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ backgroundColor: color + '18' }}
              />
              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm text-zinc-200">{f.label_en}</span>
                    {f.z_score !== 0 && (
                      <span className="text-xs text-zinc-500 tabular-nums ml-2">
                        z={f.z_score.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-zinc-500">
                    {isPositive ? t('pattern.raisesRisk') : t('pattern.lowersRisk')}
                  </span>
                  <span
                    className="text-sm font-mono font-bold tabular-nums"
                    style={{ color }}
                  >
                    {isPositive ? '+' : ''}{f.contribution.toFixed(3)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {safeWaterfall.length === 0 && (
        <div className="text-text-secondary text-sm italic">{t('pattern.noData')}</div>
      )}

      <p className="text-xs text-text-muted italic mt-6 leading-relaxed">
        {t('pattern.shapNote')}
      </p>
    </section>
  )
}

// ─── Chapter 4: The Network ─────────────────────────────────────────────────

function classifyRole(coBidder: { win_count: number; co_bid_count: number }, t: TFunction): {
  label: string
  color: string
  bg: string
} {
  const winRate = coBidder.co_bid_count > 0 ? coBidder.win_count / coBidder.co_bid_count : 0
  if (winRate < 0.15) return { label: t('roles.possibleDecoy'),     color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  if (winRate >= 0.3 && winRate <= 0.7) return { label: t('roles.rotationPattern'),  color: '#fb923c', bg: 'rgba(251,146,60,0.12)' }
  if (winRate > 0.6)  return { label: t('roles.possibleAccomplice'), color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  return { label: t('roles.coBidder'), color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' }
}

function ChapterNetwork({ vendorId, vendor, coBidders, t }: {
  vendorId: number
  vendor: { name: string; total_institutions: number; sectors_count: number }
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number; loss_count: number; same_winner_ratio: number; relationship_strength: string }> | null
  t: TFunction
}) {
  return (
    <section id="chapter-network" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>{t('chapters.headings.network')}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {t('network.heading')}
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        {t('network.description')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-background border border-border rounded-xl p-6">
          <p className="editorial-label text-text-muted mb-2">{t('network.institutionsServed')}</p>
          <p className="text-2xl font-bold text-white tabular-nums">{formatNumber(vendor.total_institutions)}</p>
          <AnnotationNote>
            {vendor.total_institutions <= 3
              ? t('network.institutionsNote.few')
              : vendor.total_institutions >= 20
              ? t('network.institutionsNote.many')
              : t('network.institutionsNote.moderate')}
          </AnnotationNote>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <p className="editorial-label text-text-muted mb-2">{t('network.sectorsActive')}</p>
          <p className="text-2xl font-bold text-white tabular-nums">{vendor.sectors_count}</p>
          <AnnotationNote>
            {vendor.sectors_count <= 1
              ? t('network.sectorsNote.single')
              : vendor.sectors_count >= 5
              ? t('network.sectorsNote.multi')
              : t('network.sectorsNote.moderate')}
          </AnnotationNote>
        </div>
      </div>

      {/* Co-bidding partners */}
      <div className="mb-10">
        <p className="editorial-label text-text-muted mb-4">{t('network.coBiddingPartners')}</p>
        {coBidders === null ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-background-elevated animate-pulse" />
            ))}
          </div>
        ) : coBidders.length === 0 ? (
          <p className="text-text-muted text-sm italic">{t('network.noCoBidders')}</p>
        ) : (
          <ul className="space-y-2">
            {coBidders.slice(0, 5).map((cb) => {
              const role = classifyRole(cb, t)
              return (
                <li key={cb.vendor_id}>
                  <Link
                    to={`/thread/${cb.vendor_id}`}
                    className="flex items-center gap-3 bg-background hover:bg-background-elevated border border-border rounded-xl px-4 py-3 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white text-sm font-medium truncate group-hover:text-[#dc2626] transition-colors"
                        title={cb.vendor_name}
                      >
                        {formatVendorName(cb.vendor_name, 40)}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {t('network.sharedProcedures', { count: cb.co_bid_count })}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: role.color, backgroundColor: role.bg }}
                    >
                      {role.label}
                    </span>
                    <ExternalLink className="w-3 h-3 text-text-muted flex-shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* CTA to full network graph */}
      <Link
        to={`/network?vendor=${vendorId}`}
        className="group flex items-center gap-4 bg-background hover:bg-background-elevated border border-border hover:border-border rounded-xl p-6 transition-all mb-6"
      >
        <div className="w-12 h-12 rounded-full bg-background-elevated group-hover:bg-red-950 flex items-center justify-center transition-colors flex-shrink-0">
          <GitBranch className="w-5 h-5 text-text-muted group-hover:text-[#dc2626] transition-colors" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold mb-1">{t('network.openNetworkGraph')}</p>
          <p className="text-text-muted text-sm">
            {t('network.openNetworkGraphDesc')}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-text-muted transition-colors flex-shrink-0" />
      </Link>

      {/* CTA to vendor profile network tab */}
      <Link
        to={`/vendors/${vendorId}?tab=network`}
        className="group flex items-center gap-4 bg-background hover:bg-background-elevated border border-border hover:border-border rounded-xl p-6 transition-all"
      >
        <div className="w-12 h-12 rounded-full bg-background-elevated group-hover:bg-red-950 flex items-center justify-center transition-colors flex-shrink-0">
          <Building2 className="w-5 h-5 text-text-muted group-hover:text-[#dc2626] transition-colors" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold mb-1">{t('network.coBidderAnalysis')}</p>
          <p className="text-text-muted text-sm">
            {t('network.coBidderAnalysisDesc')}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-text-muted transition-colors flex-shrink-0" />
      </Link>
    </section>
  )
}

// ─── Chapter 5: The Money ───────────────────────────────────────────────────

function ChapterMoney({ timeline, t }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  t: TFunction
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const chartData = timeline.map((item) => ({
    year: item.year,
    value: item.total_value / 1e6, // in millions
    risk: (item.avg_risk_score ?? 0) * 100,
    contracts: item.contract_count,
  }))

  const totalValue = timeline.reduce((s, item) => s + item.total_value, 0)
  const peakYear = timeline.reduce((max, item) => item.total_value > (max.total_value ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakRiskYear = timeline.reduce((max, item) => (item.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })

  return (
    <section id="chapter-money" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>{t('chapters.headings.money')}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {t('money.heading', { value: formatCompactMXN(totalValue) })}
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        {t('money.description')}
      </p>

      {/* Annotations */}
      {peakYear && (
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="bg-background border border-border rounded-lg px-4 py-3">
            <p className="editorial-label text-text-muted mb-1">{t('money.peakByValue')}</p>
            <p className="text-white font-bold">{t('money.peakValueLabel', { year: peakYear.year, value: formatCompactMXN(peakYear.total_value) })}</p>
          </div>
          {peakRiskYear && (
            <div className="bg-background border border-red-900/50 rounded-lg px-4 py-3">
              <p className="editorial-label text-red-500 mb-1">{t('money.peakByRisk')}</p>
              <p className="text-white font-bold">{t('money.peakRiskLabel', { year: peakRiskYear.year, pct: ((peakRiskYear.avg_risk_score ?? 0) * 100).toFixed(1) })}</p>
            </div>
          )}
        </div>
      )}

      {/* Area chart: contract value over time */}
      <div ref={ref} className="bg-background border border-border rounded-xl p-6 mb-6">
        <p className="editorial-label text-text-muted mb-4">{t('money.chartValueLabel')}</p>
        <AnimatePresence>
          {inView && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="h-52"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${v}M`} />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#dc2626' }}
                    formatter={(v: unknown) => [`${(v as number).toFixed(1)}M MXN`, t('money.tooltipValue')]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} fill="url(#valueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bar chart: avg risk score by year */}
      {chartData.some((d) => d.risk > 0) && (
        <div className="bg-background border border-border rounded-xl p-6">
          <p className="editorial-label text-text-muted mb-4">{t('money.chartRiskLabel')}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={35} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, t('money.tooltipRisk')]}
                />
                <Bar dataKey="risk" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.risk > 50 ? '#dc2626' : entry.risk > 30 ? '#ea580c' : entry.risk > 15 ? '#eab308' : '#4ade80'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <AnnotationNote>
            {t('money.riskNote')}
          </AnnotationNote>
        </div>
      )}
    </section>
  )
}

// ─── Chapter 6: The Verdict ─────────────────────────────────────────────────

function ChapterVerdict({
  vendorId,
  vendor,
  aria,
  t,
}: {
  vendorId: number
  vendor: { name: string; avg_risk_score?: number; in_ground_truth?: boolean }
  aria: {
    ips_final: number
    ips_tier: number
    primary_pattern: string | null
    review_status: string
    is_efos_definitivo: boolean
    is_sfp_sanctioned: boolean
    in_ground_truth: boolean
    memo_text?: string | null
  } | null
  t: TFunction
}) {
  const navigate = useNavigate()
  const PATTERN_META = getPatternMeta(t)
  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const patternMeta = aria?.primary_pattern ? PATTERN_META[aria.primary_pattern] : null

  return (
    <section id="chapter-verdict" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>{t('chapters.headings.verdict')}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {t('verdict.heading')}
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        {t('verdict.description')}
      </p>

      {/* Score card */}
      <div className="bg-background border border-border rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="editorial-label text-text-muted mb-2">{t('verdict.riskIndicatorScore')}</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: riskColor, fontFamily: 'var(--font-family-serif)' }}>
              {((vendor.avg_risk_score ?? 0) * 100).toFixed(1)}
            </p>
            <p className="text-text-muted text-sm mt-1">{t('verdict.outOf100')}</p>
          </div>
          <div className="text-right">
            <span
              className="inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
              style={{ backgroundColor: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}44` }}
            >
              {riskLevel}
            </span>
            {aria && (
              <p className="text-text-muted text-xs mt-2">
                {t('verdict.ariaIps', { ips: (aria.ips_final * 100).toFixed(0), tier: aria.ips_tier })}
              </p>
            )}
          </div>
        </div>

        {/* External flags */}
        {aria && (aria.is_efos_definitivo || aria.is_sfp_sanctioned || aria.in_ground_truth) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {aria.is_efos_definitivo && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-300 border border-red-800 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> {t('verdict.efosLabel')}
              </span>
            )}
            {aria.is_sfp_sanctioned && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-950 text-orange-300 border border-orange-800 flex items-center gap-1.5">
                <Gavel className="w-3 h-3" /> {t('verdict.sfpLabel')}
              </span>
            )}
            {aria.in_ground_truth && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> {t('verdict.groundTruthLabel')}
              </span>
            )}
          </div>
        )}

        {patternMeta && aria?.primary_pattern && (
          <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: patternMeta.bg, borderColor: patternMeta.color + '44' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: patternMeta.color }}>
              {aria.primary_pattern} · {patternMeta.label}
            </p>
            <p className="text-text-primary text-sm">{patternMeta.description}</p>
          </div>
        )}

        {/* ARIA memo */}
        {aria?.memo_text && (
          <div className="border-l-2 border-[var(--color-accent)] pl-4 mt-4">
            <p className="editorial-label text-text-muted mb-2">{t('verdict.ariaMemoTitle')}</p>
            <div className="text-text-primary text-sm leading-relaxed space-y-1.5">
              {aria.memo_text.split('\n').map((line, i) => {
                if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-white text-sm mt-3">{line.slice(4)}</h4>
                if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-white text-base mt-4">{line.slice(3)}</h3>
                if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-white text-lg mt-4">{line.slice(2)}</h2>
                if (line.trim() === '') return <div key={i} className="h-1" />
                // Pipe table row
                if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                  const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
                  const isSeparator = cells.every(c => /^[-: ]+$/.test(c))
                  if (isSeparator) return null
                  return (
                    <div key={i} className="flex gap-2 text-xs">
                      {cells.map((cell, ci) => (
                        <span key={ci} className={cn('flex-1 px-2 py-0.5 bg-background-elevated rounded', ci === 0 ? 'text-text-muted' : 'text-text-primary font-medium')}>{cell.trim()}</span>
                      ))}
                    </div>
                  )
                }
                const parts = line.split(/\*\*(.+?)\*\*/g)
                return (
                  <p key={i}>
                    {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-white">{part}</strong> : part)}
                  </p>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate(`/vendors/${vendorId}`)}
          className="flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-red-700 text-white font-semibold rounded-xl px-5 py-3.5 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          {t('verdict.fullVendorProfile')}
        </button>

        <button
          onClick={() => {
            const prev = document.title
            document.title = `RUBLI — ${vendor.name} — Investigation Thread`
            window.print()
            window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
          }}
          className="flex items-center justify-center gap-2 bg-background-elevated hover:bg-background-elevated text-white font-semibold rounded-xl px-5 py-3.5 transition-colors border border-border"
        >
          <Download className="w-4 h-4" />
          {t('verdict.exportPdf')}
        </button>

        <Link
          to="/workspace"
          className="flex items-center justify-center gap-2 bg-background-elevated hover:bg-background-elevated text-white font-semibold rounded-xl px-5 py-3.5 transition-colors border border-border"
        >
          <BookmarkPlus className="w-4 h-4" />
          {t('verdict.addToWorkspace')}
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 p-4 bg-background border border-border rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <strong className="text-text-muted">{t('verdict.methodologyNote')}</strong>{' '}
            <Link to="/methodology" className="text-text-muted underline hover:text-text-primary">
              {t('verdict.methodologyLink')}
            </Link>.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Chapter Progress Line ───────────────────────────────────────────────────

function RedThreadLine({ progress }: { progress: number }) {
  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-[3px] pointer-events-none z-50"
      style={{ background: 'rgba(220,38,38,0.08)' }}
    >
      <motion.div
        className="absolute top-0 left-0 w-full origin-top"
        style={{ height: `${Math.min(100, progress * 100)}%`, background: 'linear-gradient(to bottom, #dc2626, #991b1b88)' }}
        transition={{ ease: 'linear', duration: 0 }}
      />
      {/* Glowing pulse dot at tip */}
      <motion.div
        className="absolute left-0 w-3 h-3 rounded-full -translate-x-[5px]"
        style={{
          top: `${Math.min(99, progress * 100)}%`,
          background: '#dc2626',
          boxShadow: '0 0 8px 2px #dc262688',
        }}
      />
    </div>
  )
}

// ─── Chapter Navigation Dots ────────────────────────────────────────────────

function ChapterNav({ active, chapters }: { active: number; chapters: Array<{ id: string; label: string; icon: React.ElementType }> }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {chapters.map((ch, idx) => (
        <a
          key={ch.id}
          href={`#chapter-${ch.id}`}
          className="group flex items-center gap-2 justify-end"
          title={ch.label}
        >
          <span className={cn(
            'text-xs opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hidden md:block',
            active === idx && 'opacity-100 text-white'
          )}>
            {ch.label}
          </span>
          <div className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            active === idx
              ? 'bg-[#dc2626] scale-125 shadow-[0_0_6px_2px_#dc262666]'
              : 'bg-background-elevated hover:bg-background'
          )} />
        </a>
      ))}
    </div>
  )
}

// ─── Loading State ──────────────────────────────────────────────────────────

function ThreadSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-1 h-16 bg-[#dc2626] mx-auto mb-6 animate-pulse rounded-full" />
        <p className="text-text-muted text-sm animate-pulse">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedThread() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('redThread')
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

  // Queries
  const { data: vendor, isLoading: vendorLoading, isError: vendorError } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorApi.getById(id),
    enabled: !!id && !isNaN(id),
  })

  const { data: waterfall } = useQuery({
    queryKey: ['vendor-waterfall', id],
    queryFn: () => vendorApi.getRiskWaterfall(id),
    enabled: !!id && !isNaN(id),
  })

  const { data: timeline } = useQuery({
    queryKey: ['vendor-timeline', id],
    queryFn: () => vendorApi.getRiskTimeline(id),
    enabled: !!id && !isNaN(id),
  })

  const { data: aria } = useQuery({
    queryKey: ['aria-vendor', id],
    queryFn: () => ariaApi.getVendorDetail(id),
    enabled: !!id && !isNaN(id),
    retry: false, // vendor may not be in ARIA queue — that's OK
  })

  const { data: coBidders } = useQuery({
    queryKey: ['co-bidders', id],
    queryFn: () => networkApi.getCoBidders(id, 10, 5),
    enabled: !!id && !isNaN(id) && activeChapter >= 3,
    retry: false,
  })

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
  if (vendorError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-text-muted">{t('errors.loadFailed')}</p>
        <button onClick={() => navigate('/aria')} className="text-[#dc2626] text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }
  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-text-muted">{t('errors.vendorNotFound')}</p>
        <button onClick={() => navigate('/aria')} className="text-[#dc2626] text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[var(--color-background)]">
      {/* Fixed elements */}
      <RedThreadLine progress={scrollPct} />
      <ChapterNav active={activeChapter} chapters={chapters} />

      {/* Back nav */}
      <div className="sticky top-0 z-40 px-8 py-3 bg-[var(--color-background)]/80 backdrop-blur-sm border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate('/aria')}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.back')}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
          <span className="text-xs text-text-secondary uppercase tracking-widest">{t('nav.redThread')}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted max-w-[240px] truncate" title={vendor.name}>{formatVendorName(vendor.name, 40)}</span>
        </div>
        <Link
          to={`/vendors/${id}`}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          {t('nav.fullProfile')} <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Chapters */}
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

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
          t={t}
        />

        <ChapterDivider />

        <ChapterNetwork
          vendorId={id}
          vendor={{
            name: vendor.name,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
          }}
          coBidders={coBidders?.co_bidders ?? null}
          t={t}
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

        <ChapterVerdict
          vendorId={id}
          vendor={{
            name: vendor.name,
            avg_risk_score: vendor.avg_risk_score,
            in_ground_truth: aria?.in_ground_truth,
          }}
          aria={aria ? {
            ips_final: aria.ips_final,
            ips_tier: aria.ips_tier,
            primary_pattern: aria.primary_pattern,
            review_status: aria.review_status,
            is_efos_definitivo: aria.is_efos_definitivo,
            is_sfp_sanctioned: aria.is_sfp_sanctioned,
            in_ground_truth: aria.in_ground_truth,
            memo_text: aria.memo_text,
          } : null}
          t={t}
        />
      </div>

      {/* Bottom padding */}
      <div className="h-32" />
    </div>
  )
}
