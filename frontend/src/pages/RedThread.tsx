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

import { useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { vendorApi, ariaApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
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

const CHAPTERS = [
  { id: 'subject',  label: 'Subject',  icon: Building2 },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'pattern',  label: 'Pattern',  icon: AlertTriangle },
  { id: 'network',  label: 'Network',  icon: GitBranch },
  { id: 'money',    label: 'Money',    icon: DollarSign },
  { id: 'verdict',  label: 'Verdict',  icon: Gavel },
] as const

const PATTERN_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  P1: { label: 'Market Monopoly',      color: '#f87171', bg: 'rgba(248,113,113,0.1)',  description: 'Holds a disproportionate share of sector contracts — potential market capture through non-competitive means.' },
  P2: { label: 'Ghost Company',        color: '#c084fc', bg: 'rgba(192,132,252,0.1)', description: 'Exhibits shell-company indicators: short operating history, few contracts, near-100% direct awards, unverifiable presence.' },
  P3: { label: 'Intermediary',         color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  description: 'Acts as a pass-through entity, winning contracts outside its primary industry and likely reselling to actual providers.' },
  P4: { label: 'Bid Rigging',          color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  description: 'Multiple vendors show coordinated bidding — rotation, cover bids, or geographic market allocation.' },
  P5: { label: 'Price Manipulation',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  description: 'Contract values are statistically anomalous vs. sector benchmarks, indicating inflated pricing.' },
  P6: { label: 'Institutional Capture',color: '#f472b6', bg: 'rgba(244,114,182,0.1)', description: 'Receives a disproportionate share from a single institution, typically through direct awards.' },
  P7: { label: 'Network Cluster',      color: '#34d399', bg: 'rgba(52,211,153,0.1)',  description: 'Embedded in a co-contracting network, suggesting coordinated vendor rings.' },
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
    <p className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">
      {children}
    </p>
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

function ChapterSubject({ vendor, aria }: {
  vendor: { name: string; total_value_mxn: number; total_contracts: number; primary_sector_name?: string; avg_risk_score?: number; first_contract_year?: number; last_contract_year?: number; high_risk_pct: number; direct_award_pct: number }
  aria: { ips_final: number; ips_tier: number } | null
}) {
  const sectorColor = vendor.primary_sector_name
    ? SECTOR_COLORS[vendor.primary_sector_name.toLowerCase()] ?? '#dc2626'
    : '#dc2626'

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]

  return (
    <section id="chapter-subject" className="min-h-screen flex flex-col justify-center py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>Chapter I · The Subject</ChapterLabel>

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-5xl md:text-7xl font-bold text-white leading-tight mb-8"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {vendor.name}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-wrap items-center gap-3 mb-12"
      >
        {vendor.primary_sector_name && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: sectorColor + '22', color: sectorColor, border: `1px solid ${sectorColor}44` }}
          >
            {vendor.primary_sector_name}
          </span>
        )}
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{ backgroundColor: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}44` }}
        >
          {riskLevel} risk
        </span>
        {aria && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-red-950 text-red-300 border border-red-800">
            ARIA Tier {aria.ips_tier}
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
            label: 'Total Value',
            value: formatCompactMXN(vendor.total_value_mxn),
            note: 'All contracts awarded, 2002–2025',
          },
          {
            label: 'Contracts',
            value: formatNumber(vendor.total_contracts),
            note: `${vendor.first_contract_year ?? '?'} – ${vendor.last_contract_year ?? '?'}`,
          },
          {
            label: 'Direct Awards',
            value: `${Math.round(vendor.direct_award_pct)}%`,
            note: 'vs. ~48% national average',
          },
          {
            label: 'High-Risk',
            value: `${Math.round(vendor.high_risk_pct)}%`,
            note: 'OECD benchmark: 2–15%',
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
      >
        This investigation thread follows the procurement history of{' '}
        <strong className="text-white">{vendor.name}</strong>, tracing the patterns, relationships,
        and financial flows that triggered automated detection. Scroll to follow the evidence.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-16 flex items-center gap-2 text-text-secondary"
      >
        <ChevronDown className="w-4 h-4 animate-bounce" />
        <span className="text-xs tracking-widest uppercase">Continue</span>
      </motion.div>
    </section>
  )
}

// ─── Chapter 2: The Timeline ────────────────────────────────────────────────

function ChapterTimeline({ contracts }: {
  contracts: Array<{ id: number; contract_date?: string; amount_mxn?: number; risk_score?: number; institution_name?: string; procedure_type?: string }>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  // Normalize dot sizes: log scale, 4px–28px
  const maxValue = Math.max(...contracts.map((c) => c.amount_mxn ?? 0), 1)

  const dots = contracts.slice(0, 300).map((c, i) => {
    const val = c.amount_mxn ?? 0
    const size = Math.max(4, Math.min(28, 4 + (Math.log(val + 1) / Math.log(maxValue + 1)) * 24))
    const level = getRiskLevel(c.risk_score ?? 0)
    const year = c.contract_date ? new Date(c.contract_date).getFullYear() : 2010
    return { ...c, size, level, year, i }
  })

  // Group by year for annotations
  const yearGroups: Record<number, typeof dots> = {}
  dots.forEach((d) => {
    if (!yearGroups[d.year]) yearGroups[d.year] = []
    yearGroups[d.year].push(d)
  })

  const years = Object.keys(yearGroups).map(Number).sort()
  const minYear = years[0] ?? 2002
  const maxYear = years[years.length - 1] ?? 2025

  return (
    <section id="chapter-timeline" className="min-h-screen py-24 px-8 max-w-5xl mx-auto">
      <ChapterLabel>Chapter II · The Timeline</ChapterLabel>
      <h2 className="font-serif text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {formatNumber(contracts.length)} Contracts, {minYear}–{maxYear}
      </h2>
      <p className="text-text-muted mb-12 max-w-xl">
        Each dot is one contract. Size reflects value. Color reflects risk. Scroll across to trace the history.
      </p>

      <div ref={ref} className="relative">
        {/* Year axis */}
        <div className="flex justify-between text-xs text-text-secondary mb-4 px-1">
          {years.filter((_, i) => i % 3 === 0 || i === years.length - 1).map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>

        {/* Dot field */}
        <div className="relative h-48 bg-background border border-border rounded-xl overflow-hidden px-4 py-4">
          {dots.map((dot, idx) => {
            const xPct = maxYear > minYear ? ((dot.year - minYear) / (maxYear - minYear)) * 96 : 50
            const seed = dot.id != null ? Number(dot.id) : idx
            const sinVal = Math.sin(seed * 9301 + 49297) * 233280
            const yPct = 10 + (sinVal - Math.floor(sinVal)) * 80
            return (
              <motion.div
                key={dot.id ?? idx}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 0.85, scale: 1 } : {}}
                transition={{ delay: idx * 0.002, duration: 0.3, ease: 'backOut' }}
                className="absolute rounded-full cursor-pointer hover:opacity-100 hover:scale-150 transition-transform"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  width: dot.size,
                  height: dot.size,
                  backgroundColor: RISK_DOT_COLORS[dot.level],
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.round(dot.size),
                }}
                title={`${dot.institution_name ?? 'Unknown'} · ${formatCompactMXN(dot.amount_mxn ?? 0)} · ${dot.level} risk`}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          {Object.entries(RISK_DOT_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-text-muted capitalize">{level}</span>
            </div>
          ))}
          <div className="ml-auto text-xs text-text-secondary">
            Size = contract value
          </div>
        </div>
      </div>

      <ChapterDivider />

      {/* Yearly breakdown */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-8">
        {years.slice(-12).map((year) => {
          const group = yearGroups[year] ?? []
          const totalValue = group.reduce((s, c) => s + (c.amount_mxn ?? 0), 0)
          const highRisk = group.filter((c) => c.level === 'critical' || c.level === 'high').length
          const pctHigh = group.length > 0 ? (highRisk / group.length) * 100 : 0
          return (
            <div key={year} className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">{year}</p>
              <p className="text-sm font-bold text-white tabular-nums">{formatCompactMXN(totalValue)}</p>
              <p className="text-xs mt-1" style={{ color: pctHigh > 30 ? '#f87171' : '#6b7280' }}>
                {Math.round(pctHigh)}% flagged
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Chapter 3: The Pattern ─────────────────────────────────────────────────

function ChapterPattern({ waterfall, ariaPattern }: {
  waterfall: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  ariaPattern: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const meta = ariaPattern ? PATTERN_META[ariaPattern] : null

  // Sort: positive contributions first (drivers), then protective factors
  const sorted = [...waterfall]
    .filter((f) => Math.abs(f.contribution) > 0.001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)

  const maxAbs = Math.max(...sorted.map((f) => Math.abs(f.contribution)), 0.01)

  return (
    <section id="chapter-pattern" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>Chapter III · The Pattern</ChapterLabel>
      <h2 className="font-serif text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        What the Algorithm Found
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        Risk scores are built from 16 z-score features normalized against sector baselines. These are the factors that drove this vendor's score.
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
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-text-primary">{f.label_en}</span>
                  {f.z_score !== 0 && (
                    <span className="text-xs text-text-secondary tabular-nums">
                      z={f.z_score.toFixed(2)}
                    </span>
                  )}
                </div>
                <span
                  className="text-sm font-mono font-bold tabular-nums"
                  style={{ color }}
                >
                  {isPositive ? '+' : ''}{f.contribution.toFixed(3)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {waterfall.length === 0 && (
        <div className="text-text-secondary text-sm italic">Feature attribution data not available for this vendor.</div>
      )}

      <p className="text-xs text-text-muted italic mt-6 leading-relaxed">
        Positive values increase risk score (red). Negative values reduce it (green). Values are SHAP-style
        feature contributions: β_i × (z_i − E[z_i]).
      </p>
    </section>
  )
}

// ─── Chapter 4: The Network ─────────────────────────────────────────────────

function ChapterNetwork({ vendorId, vendor }: {
  vendorId: number
  vendor: { name: string; total_institutions: number; sectors_count: number }
}) {
  return (
    <section id="chapter-network" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>Chapter IV · The Network</ChapterLabel>
      <h2 className="font-serif text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Connections & Relationships
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        Vendor networks reveal co-contracting rings, shared entities, and institutional dependencies
        invisible in contract-by-contract analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-background border border-border rounded-xl p-6">
          <p className="editorial-label text-text-muted mb-2">Institutions Served</p>
          <p className="text-4xl font-black text-white tabular-nums">{formatNumber(vendor.total_institutions)}</p>
          <AnnotationNote>
            {vendor.total_institutions <= 3
              ? 'Very few institutions — possible institutional capture.'
              : vendor.total_institutions >= 20
              ? 'Wide institutional reach — diversified vendor profile.'
              : 'Moderate institutional diversity.'}
          </AnnotationNote>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <p className="editorial-label text-text-muted mb-2">Sectors Active</p>
          <p className="text-4xl font-black text-white tabular-nums">{vendor.sectors_count}</p>
          <AnnotationNote>
            {vendor.sectors_count <= 1
              ? 'Single-sector presence — typical for specialists.'
              : vendor.sectors_count >= 5
              ? 'Cross-sector activity — may indicate intermediary behavior.'
              : 'Multi-sector vendor.'}
          </AnnotationNote>
        </div>
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
          <p className="text-white font-semibold mb-1">Open Full Network Graph</p>
          <p className="text-text-muted text-sm">
            Interactive force-directed graph showing co-bidders, related entities, and community clusters.
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
          <p className="text-white font-semibold mb-1">Co-Bidder Analysis</p>
          <p className="text-text-muted text-sm">
            Vendors that consistently appear in the same procedures — potential coordination rings.
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-text-muted transition-colors flex-shrink-0" />
      </Link>
    </section>
  )
}

// ─── Chapter 5: The Money ───────────────────────────────────────────────────

function ChapterMoney({ timeline }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const chartData = timeline.map((t) => ({
    year: t.year,
    value: t.total_value / 1e6, // in millions
    risk: (t.avg_risk_score ?? 0) * 100,
    contracts: t.contract_count,
  }))

  const totalValue = timeline.reduce((s, t) => s + t.total_value, 0)
  const peakYear = timeline.reduce((max, t) => t.total_value > (max.total_value ?? 0) ? t : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakRiskYear = timeline.reduce((max, t) => (t.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0) ? t : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })

  return (
    <section id="chapter-money" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>Chapter V · The Money</ChapterLabel>
      <h2 className="font-serif text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {formatCompactMXN(totalValue)} Over Time
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        Annual contract value and risk trajectory — where the money went, and when the risk spiked.
      </p>

      {/* Annotations */}
      {peakYear && (
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="bg-background border border-border rounded-lg px-4 py-3">
            <p className="editorial-label text-text-muted mb-1">Peak Year by Value</p>
            <p className="text-white font-bold">{peakYear.year} — {formatCompactMXN(peakYear.total_value)}</p>
          </div>
          {peakRiskYear && (
            <div className="bg-background border border-red-900/50 rounded-lg px-4 py-3">
              <p className="editorial-label text-red-500 mb-1">Peak Year by Risk</p>
              <p className="text-white font-bold">{peakRiskYear.year} — {((peakRiskYear.avg_risk_score ?? 0) * 100).toFixed(1)}% avg score</p>
            </div>
          )}
        </div>
      )}

      {/* Area chart: contract value over time */}
      <div ref={ref} className="bg-background border border-border rounded-xl p-6 mb-6">
        <p className="editorial-label text-text-muted mb-4">Contract Value by Year (MXN millions)</p>
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
                    formatter={(v: unknown) => [`${(v as number).toFixed(1)}M MXN`, 'Value']}
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
          <p className="editorial-label text-text-muted mb-4">Average Risk Score by Year (%)</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={35} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'Avg Risk']}
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
            Risk thresholds: Critical ≥60%, High ≥40%, Medium ≥15%. OECD benchmark: 2–15% high-risk.
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
}) {
  const navigate = useNavigate()
  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const patternMeta = aria?.primary_pattern ? PATTERN_META[aria.primary_pattern] : null

  return (
    <section id="chapter-verdict" className="min-h-screen py-24 px-8 max-w-4xl mx-auto">
      <ChapterLabel>Chapter VI · The Verdict</ChapterLabel>
      <h2 className="font-serif text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Investigation Summary
      </h2>
      <p className="text-text-muted mb-10 max-w-xl">
        Statistical signals warrant attention. A high score is not proof of wrongdoing — it means
        this vendor closely resembles documented corruption patterns.
      </p>

      {/* Score card */}
      <div className="bg-background border border-border rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="editorial-label text-text-muted mb-2">Risk Indicator Score</p>
            <p className="font-serif text-7xl font-bold tabular-nums" style={{ color: riskColor, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {((vendor.avg_risk_score ?? 0) * 100).toFixed(1)}
            </p>
            <p className="text-text-muted text-sm mt-1">out of 100</p>
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
                ARIA IPS: {(aria.ips_final * 100).toFixed(0)} · Tier {aria.ips_tier}
              </p>
            )}
          </div>
        </div>

        {/* External flags */}
        {aria && (aria.is_efos_definitivo || aria.is_sfp_sanctioned || aria.in_ground_truth) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {aria.is_efos_definitivo && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-300 border border-red-800 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> SAT EFOS Definitivo
              </span>
            )}
            {aria.is_sfp_sanctioned && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-950 text-orange-300 border border-orange-800 flex items-center gap-1.5">
                <Gavel className="w-3 h-3" /> SFP Sanctioned
              </span>
            )}
            {aria.in_ground_truth && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> In Ground Truth Cases
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
            <p className="editorial-label text-text-muted mb-2">ARIA Intelligence Memo</p>
            <p className="text-text-primary text-sm leading-relaxed whitespace-pre-line">{aria.memo_text}</p>
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
          Full Vendor Profile
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
          Export PDF Briefing
        </button>

        <Link
          to="/workspace"
          className="flex items-center justify-center gap-2 bg-background-elevated hover:bg-background-elevated text-white font-semibold rounded-xl px-5 py-3.5 transition-colors border border-border"
        >
          <BookmarkPlus className="w-4 h-4" />
          Add to Workspace
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 p-4 bg-background border border-border rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <strong className="text-text-muted">Methodology note:</strong> Risk scores measure similarity to documented corruption patterns in 3.1M Mexican federal contracts (2002–2025). Scores are statistical indicators for investigation triage — not proof of wrongdoing. Model v6.0, vendor-stratified validation, AUC 0.840 (internal) / 0.728 (population). See{' '}
            <Link to="/methodology" className="text-text-muted underline hover:text-text-primary">
              full methodology
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

function ChapterNav({ active }: { active: number }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {CHAPTERS.map((ch, idx) => (
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

function ThreadSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-1 h-16 bg-[#dc2626] mx-auto mb-6 animate-pulse rounded-full" />
        <p className="text-text-muted text-sm animate-pulse">Building investigation thread…</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedThread() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const id = Number(vendorId)

  const containerRef = useRef<HTMLDivElement>(null)
  const [activeChapter, setActiveChapter] = useState(0)

  const { scrollYProgress } = useScroll({ container: containerRef })

  // Track active chapter by scroll position (simple approach)
  const handleScroll = useCallback(() => {
    const chapters = CHAPTERS.map((ch) => document.getElementById(`chapter-${ch.id}`))
    const scrollY = window.scrollY + window.innerHeight / 2
    let active = 0
    chapters.forEach((el, idx) => {
      if (el && el.offsetTop <= scrollY) active = idx
    })
    setActiveChapter(active)
  }, [])

  // Queries
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorApi.getById(id),
    enabled: !!id && !isNaN(id),
  })

  const { data: contracts } = useQuery({
    queryKey: ['vendor-contracts', id, 'thread'],
    queryFn: () => vendorApi.getContracts(id, { per_page: 300 }),
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

  // scroll progress for the thread line (page-level)
  const [scrollPct, setScrollPct] = useState(0)
  scrollYProgress.on('change', setScrollPct)

  if (isNaN(id)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted">
        Invalid vendor ID.
      </div>
    )
  }

  if (vendorLoading) return <ThreadSkeleton />
  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-text-muted">Vendor not found.</p>
        <button onClick={() => navigate(-1)} className="text-[#dc2626] text-sm underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-background)]" onScroll={handleScroll}>
      {/* Fixed elements */}
      <RedThreadLine progress={scrollPct} />
      <ChapterNav active={activeChapter} />

      {/* Back nav */}
      <div className="sticky top-0 z-40 px-8 py-3 bg-[var(--color-background)]/80 backdrop-blur-sm border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
          <span className="text-xs text-text-secondary uppercase tracking-widest">Red Thread</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted max-w-[200px] truncate">{vendor.name}</span>
        </div>
        <Link
          to={`/vendors/${id}`}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          Full Profile <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Chapters */}
      <div className="pl-6">
        <ChapterSubject
          vendor={vendor}
          aria={aria ?? null}
        />

        <ChapterDivider />

        <ChapterTimeline
          contracts={(contracts?.data ?? []).map((c) => ({
            id: c.id,
            contract_date: c.contract_date,
            amount_mxn: c.amount_mxn,
            risk_score: c.risk_score ?? undefined,
            institution_name: c.institution_name ?? undefined,
            procedure_type: c.procedure_type ?? undefined,
          }))}
        />

        <ChapterDivider />

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
        />

        <ChapterDivider />

        <ChapterNetwork
          vendorId={id}
          vendor={{
            name: vendor.name,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
          }}
        />

        <ChapterDivider />

        <ChapterMoney
          timeline={(timeline?.timeline ?? []).map((t) => ({
            year: t.year,
            avg_risk_score: t.avg_risk_score,
            contract_count: t.contract_count,
            total_value: t.total_value,
          }))}
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
        />
      </div>

      {/* Bottom padding */}
      <div className="h-32" />
    </div>
  )
}
