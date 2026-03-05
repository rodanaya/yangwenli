/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Every section has a thesis statement, evidence, and contextual analysis.
 * Fully internationalized (ES/EN) via react-i18next 'executive' namespace.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import type { ExecutiveSummaryResponse } from '@/api/types'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { RiskScoreDisclaimer } from '@/components/RiskScoreDisclaimer'
import { ModelDetectionStory } from '@/components/ModelDetectionStory'
import { ScrollReveal, useCountUp, AnimatedFill, AnimatedSegment } from '@/hooks/useAnimations'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import {
  AlertTriangle,
  Target,
  Scale,
  Users,
  Landmark,
  Brain,
  EyeOff,
  ArrowRight,
  Shield,
  Search,
  Database,
  HelpCircle,
  Compass,
  Network,
  CheckCircle,
  Calendar,
  TrendingUp,
  Globe2,
  DollarSign,
  Zap,
  Printer,
} from 'lucide-react'

// ============================================================================
// Data Hook
// ============================================================================

function useExecutiveSummary() {
  return useQuery({
    queryKey: ['executive', 'summary'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })
}

function usePatternCounts() {
  return useQuery({
    queryKey: ['analysis', 'pattern-counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 10 * 60 * 1000,
  })
}

// ============================================================================
// Main Component
// ============================================================================

export function ExecutiveSummary() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useExecutiveSummary()
  const { data: patternCounts } = usePatternCounts()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto py-24 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-risk-critical" />
        <h2 className="text-lg font-bold text-text-primary">Failed to load Executive Summary</h2>
        <p className="text-sm text-text-muted max-w-sm">
          The report data could not be retrieved. Check your connection and try again.
        </p>
        <button
          onClick={() => void refetch()}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-accent text-background-base hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <article className="max-w-4xl mx-auto pb-20 space-y-16 print:text-black print:bg-white">
      <ScrollReveal delay={80}><ReportHeader data={data} /></ScrollReveal>
      <ScrollReveal delay={100}><StatBombs data={data} /></ScrollReveal>
      <ScrollReveal delay={110}><CurrencyNoteBanner /></ScrollReveal>
      <ScrollReveal delay={120}><WhatWeFound data={data} /></ScrollReveal>
      <ScrollReveal delay={140}><KeyFindings /></ScrollReveal>
      <ScrollReveal delay={160}><TopFraudSignals /></ScrollReveal>
      <Divider />
      {/* 00 — CONTEXT: How the System Works & What's Changing */}
      <ScrollReveal><SectionSystem /></ScrollReveal>
      <Divider />
      {/* 01 — CAN I TRUST IT: Data Foundation */}
      <ScrollReveal><SectionData /></ScrollReveal>
      <Divider />
      {/* 02 — WHAT IT FOUND: Three Systemic Patterns */}
      <ScrollReveal><SectionThreePatterns data={data} /></ScrollReveal>
      <Divider />
      {/* 03 — HOW IT KNOWS: AI Model */}
      <ScrollReveal><SectionModel data={data} /></ScrollReveal>
      <Divider />
      {/* 04 — THE THREAT: Risk Scores & Value at Risk */}
      <ScrollReveal><SectionThreat data={data} /></ScrollReveal>
      <Divider />
      {/* 05 — EVERY GOVT: Five Administrations */}
      <ScrollReveal><SectionAdministrations data={data} /></ScrollReveal>
      <ScrollReveal><CompetitionDeclineCard /></ScrollReveal>
      <Divider />
      {/* 06 — WHO BENEFITS: Top Vendors */}
      <ScrollReveal><SectionVendors data={data} navigate={navigate} /></ScrollReveal>
      <Divider />
      {/* 07 — WHICH SECTORS: Risk Concentration */}
      <ScrollReveal><SectionSectors data={data} navigate={navigate} /></ScrollReveal>
      <Divider />
      {/* 08 — PROOF IT WORKS: Ground Truth Validation */}
      <ScrollReveal><SectionProof data={data} /></ScrollReveal>
      <Divider />
      {/* 09 — THE NETWORK: Co-bidding & Collusion */}
      <ScrollReveal><SectionNetwork patternCounts={patternCounts} /></ScrollReveal>
      <Divider />
      {/* 10 — LIMITATIONS */}
      <ScrollReveal><SectionLimitations /></ScrollReveal>
      <Divider />
      {/* 11 — NOW WHAT: Recommendations */}
      <ScrollReveal><SectionRecommendations navigate={navigate} /></ScrollReveal>
      <ScrollReveal><ReportFooter data={data} /></ScrollReveal>
    </article>
  )
}

export default ExecutiveSummary

// ============================================================================
// S0: Report Header
// ============================================================================


function ReportHeader({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { headline } = data
  const totalValueUSD = headline.total_value_usd
    ? `$${(headline.total_value_usd / 1e9).toFixed(1)}B USD`
    : formatCompactUSD(headline.total_value)

  return (
    <header className="pt-4 relative overflow-hidden">
      <div className="relative z-10">
      {/* Small caps label + print button row */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/5">
          <Shield className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            {t('header.badge')}
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 transition-colors"
          title="Print or save as PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / PDF
        </button>
      </div>

      {/* Date line */}
      <p className="text-xs text-text-muted font-mono tracking-wide mb-3">
        {t('header.dateline')}
      </p>

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-2"
        style={{
          background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #fbbf24 60%, #f87171 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {t('header.title')}
      </h1>
      <p className="text-lg text-text-secondary italic mb-8">
        {t('header.subtitle')}
      </p>

      {/* Lead paragraph */}
      <div className="border-l-2 border-accent/40 pl-5 mb-10">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="header.lead"
            values={{
              totalContracts: formatNumber(headline.total_contracts),
              totalValue: formatCompactMXN(headline.total_value),
              totalValueUSD: totalValueUSD,
              valueAtRisk: formatCompactMXN(data.risk.value_at_risk),
              pct: data.risk.value_at_risk_pct,
            }}
          />
        </p>
      </div>

      {/* Headline stats */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
      >
        <motion.div variants={staggerItem}>
          <HeadlineStat value={formatNumber(headline.total_contracts)} label={t('header.contracts')} rawNumber={headline.total_contracts} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HeadlineStat
            value={formatCompactMXN(headline.total_value)}
            label={t('header.totalValue')}
            sublabel={headline.total_value_real_mxn
              ? `${formatCompactMXN(headline.total_value_real_mxn)} pesos 2024`
              : undefined}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HeadlineStat value={formatNumber(headline.total_vendors)} label={t('header.vendors')} rawNumber={headline.total_vendors} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HeadlineStat value={formatNumber(headline.total_institutions)} label={t('header.institutions')} rawNumber={headline.total_institutions} />
        </motion.div>
      </motion.div>
      </div>
    </header>
  )
}

// ============================================================================
// Hero Stat Bombs — dramatic number callouts after the header
// ============================================================================

function StatBombs({ data }: { data: ExecutiveSummaryResponse }) {
  const { risk } = data
  const highRiskRate = (risk.high_pct + risk.critical_pct).toFixed(1)

  const highCriticalCount = (risk.critical_count ?? 201_745) + (risk.high_count ?? 126_553)
  // Always display as compact number to prevent card overflow
  const highCriticalFormatted = highCriticalCount >= 1_000_000
    ? `${(highCriticalCount / 1_000_000).toFixed(1)}M`
    : `${Math.round(highCriticalCount / 1_000)}K`

  const bombs = [
    {
      value: `${highRiskRate}%`,
      label: 'High-Risk Rate',
      sub: 'OECD-calibrated · v5.1',
      glow: 'rgba(248,113,113,0.3)',
      color: '#f87171',
    },
    {
      value: highCriticalFormatted,
      label: 'High/Critical Contracts',
      sub: `Critical + High risk · 9% of 3.1M`,
      glow: 'rgba(251,146,60,0.3)',
      color: '#fb923c',
    },
    {
      value: '23',
      label: 'Years Covered',
      sub: '2002 – 2025 · 3.1M contracts',
      glow: 'rgba(6,182,212,0.3)',
      color: '#22d3ee',
    },
    {
      value: '0.957',
      label: 'Model AUC',
      sub: 'Train/test temporal split · v5.1',
      glow: 'rgba(34,197,94,0.3)',
      color: '#4ade80',
    },
    {
      value: '22',
      label: 'Documented Cases',
      sub: 'Ground truth for corruption detection',
      glow: 'rgba(251,191,36,0.3)',
      color: '#fbbf24',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {bombs.map((b, i) => (
        <ScrollReveal key={b.label} delay={i * 80}>
          <div
            className="relative rounded-xl border border-border/20 bg-surface-raised/20 p-5 text-center overflow-hidden hover:border-opacity-60 transition-all duration-300"
            style={{ borderColor: `${b.color}33` }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 32px 4px ${b.glow}`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            {/* Subtle radial glow background */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 50%, ${b.color}, transparent 70%)` }}
            />
            <div
              className={`font-black font-mono text-white tracking-tight relative z-10 leading-none ${
                b.value.length > 6 ? 'text-2xl sm:text-3xl' :
                b.value.length > 4 ? 'text-3xl sm:text-4xl' :
                'text-4xl sm:text-5xl'
              }`}
              style={{ textShadow: `0 0 40px ${b.glow}` }}
            >
              {b.value}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-widest mt-1.5 font-mono relative z-10 leading-tight">
              {b.label}
            </div>
            <div className="text-[10px] mt-0.5 font-mono relative z-10 leading-tight" style={{ color: `${b.color}99` }}>
              {b.sub}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  )
}

// ============================================================================
// What We Found — bold finding highlight cards
// ============================================================================

function WhatWeFound({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { risk } = data
  const highRiskValue = (risk.high_value ?? 0) + (risk.critical_value ?? 0)

  const findings = [
    {
      icon: AlertTriangle,
      value: formatCompactMXN(highRiskValue),
      desc: t('whatWeFound.highRisk'),
      borderColor: 'border-red-500/20',
      bgColor: 'bg-red-500/5',
      iconColor: 'text-red-400',
      valueColor: 'text-red-400',
    },
    {
      icon: TrendingUp,
      value: '71%',
      desc: t('whatWeFound.directAward'),
      borderColor: 'border-orange-500/20',
      bgColor: 'bg-orange-500/5',
      iconColor: 'text-orange-400',
      valueColor: 'text-orange-400',
    },
    {
      icon: DollarSign,
      value: '1.33×',
      desc: t('whatWeFound.december'),
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-500/5',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-400',
    },
    {
      icon: Zap,
      value: '99.0%',
      desc: t('whatWeFound.imss'),
      borderColor: 'border-cyan-500/20',
      bgColor: 'bg-cyan-500/5',
      iconColor: 'text-cyan-400',
      valueColor: 'text-cyan-400',
    },
  ]

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {findings.map((f, i) => {
        const Icon = f.icon
        return (
          <ScrollReveal key={f.desc} delay={i * 80}>
            <div className={`rounded-xl border p-5 ${f.borderColor} ${f.bgColor}`}>
              <Icon className={`h-6 w-6 mb-3 ${f.iconColor}`} />
              <div className={`text-2xl font-bold mb-1 ${f.valueColor}`}>{f.value}</div>
              <div className="text-sm text-text-muted">{f.desc}</div>
            </div>
          </ScrollReveal>
        )
      })}
    </div>
  )
}

// ============================================================================
// Key Findings Hero Card
// ============================================================================

function KeyFindings() {
  const { t } = useTranslation('executive')
  const items = t('keyFindings.items', { returnObjects: true }) as string[]

  return (
    <div className="border border-accent/30 rounded-lg bg-accent/5 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent font-mono">
          {t('keyFindings.title')}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <ScrollReveal key={i} delay={i * 80} direction="left">
            <li className="flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-sm text-text-secondary leading-relaxed">{item}</span>
            </li>
          </ScrollReveal>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// Top Fraud Signals — 3 key patterns detected across 3.1M contracts
// ============================================================================

function TopFraudSignals() {
  const signals = [
    {
      rank: '01',
      signal: 'Price Volatility',
      detail:
        'The single strongest predictor (β = +1.22). Vendors whose contract amounts swing wildly across institutions — a hallmark of pricing manipulation rather than legitimate market fluctuation.',
      color: '#f87171',
      examples: 'IMSS Ghost Network · COVID-19 Procurement',
    },
    {
      rank: '02',
      signal: 'Abnormal Win Rate',
      detail:
        'Vendors winning contracts at rates far above their sector baseline (β = +0.73). Legitimate companies win some tenders; captured institutions award the same vendors repeatedly.',
      color: '#fb923c',
      examples: 'Toka IT Monopoly · Edenred Voucher Monopoly',
    },
    {
      rank: '03',
      signal: 'Vendor Concentration',
      detail:
        'A single vendor capturing a disproportionate share of an institution\'s procurement (β = +0.43). High concentration with few competitors is the structural precondition for corruption.',
      color: '#fbbf24',
      examples: 'Segalmex · PEMEX-Cotemar',
    },
  ]

  return (
    <div className="rounded-xl border border-border/30 bg-surface-raised/10 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4">
        Top 3 risk indicators — model coefficients (v5.1)
      </p>
      <div className="space-y-4">
        {signals.map((s) => (
          <div key={s.rank} className="flex items-start gap-4">
            <div
              className="text-2xl font-black font-mono flex-shrink-0 w-8 text-right leading-none mt-0.5"
              style={{ color: `${s.color}60` }}
            >
              {s.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-text-primary">{s.signal}</span>
                <div className="h-px flex-1 rounded-full" style={{ background: `${s.color}40` }} />
              </div>
              <p className="text-xs leading-relaxed text-text-muted mb-1">{s.detail}</p>
              <p className="text-[10px] font-mono" style={{ color: `${s.color}99` }}>
                Documented in: {s.examples}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// SECTION 00 — THE SYSTEM: How Public Procurement Works
// ============================================================================

function SectionSystem() {
  const { t } = useTranslation('executive')

  const procedures = [
    {
      nameKey: 'sSystem.proc1Name',
      spanishKey: 'sSystem.proc1Spanish',
      whenKey: 'sSystem.proc1When',
      howKey: 'sSystem.proc1How',
      badgeKey: 'sSystem.proc1Badge',
      borderColor: 'border-green-500/25',
      bgColor: 'bg-green-500/5',
      labelColor: 'text-green-500',
      badgeBg: 'bg-green-500/10 text-green-600',
    },
    {
      nameKey: 'sSystem.proc2Name',
      spanishKey: 'sSystem.proc2Spanish',
      whenKey: 'sSystem.proc2When',
      howKey: 'sSystem.proc2How',
      badgeKey: 'sSystem.proc2Badge',
      borderColor: 'border-yellow-500/25',
      bgColor: 'bg-yellow-500/5',
      labelColor: 'text-yellow-500',
      badgeBg: 'bg-yellow-500/10 text-yellow-600',
    },
    {
      nameKey: 'sSystem.proc3Name',
      spanishKey: 'sSystem.proc3Spanish',
      whenKey: 'sSystem.proc3When',
      howKey: 'sSystem.proc3How',
      badgeKey: 'sSystem.proc3Badge',
      borderColor: 'border-risk-high/25',
      bgColor: 'bg-risk-high/5',
      labelColor: 'text-risk-high',
      badgeBg: 'bg-risk-high/10 text-risk-high',
    },
  ]

  return (
    <section>
      <SectionHeading number="00" title={t('sSystem.title')} icon={Globe2} />

      <p className="text-sm text-text-secondary leading-relaxed mb-6">
        {t('sSystem.intro')}
      </p>

      {/* Three Procedures */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-3">
        {t('sSystem.proceduresTitle')}
      </p>
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {procedures.map((p) => (
          <div key={p.nameKey} className={`rounded-lg border p-4 ${p.borderColor} ${p.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold font-mono uppercase ${p.labelColor}`}>
                {t(p.nameKey)}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${p.badgeBg}`}>
                {t(p.badgeKey)}
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary mb-1 italic">{t(p.spanishKey)}</p>
            <p className="text-xs text-text-muted leading-relaxed mb-1">{t(p.whenKey)}</p>
            <p className="text-xs text-text-secondary leading-relaxed">{t(p.howKey)}</p>
          </div>
        ))}
      </div>

      {/* The Gap */}
      <div className="border border-risk-high/20 bg-risk-high/5 rounded-lg p-5 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-risk-high font-mono mb-2">
          {t('sSystem.gapTitle')}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">{t('sSystem.gapText')}</p>
      </div>

      {/* Oversight Architecture */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-2">
          {t('sSystem.oversightTitle')}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">{t('sSystem.oversightText')}</p>
      </div>

      {/* Crisis Box — high visual prominence: infrastructure being dismantled */}
      <div className="border-2 border-risk-critical/50 rounded-lg p-5 bg-risk-critical/8 shadow-[0_0_24px_rgba(248,113,113,0.12)]">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest text-risk-critical font-mono">
            {t('sSystem.crisisTitle')}
          </p>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {t('sSystem.crisisText')}
        </p>
        <div className="p-3 rounded-md bg-accent/5 border border-accent/15 mb-3">
          <p className="text-xs text-text-muted italic leading-relaxed">{t('sSystem.crisisNote')}</p>
        </div>
        <p className="text-[10px] text-text-muted font-mono">{t('sSystem.sources')}</p>
      </div>
    </section>
  )
}

// ============================================================================
// GRAPHIC 1: Corruption Funnel
// ============================================================================

function CorruptionFunnel({ data }: { data: ExecutiveSummaryResponse }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const { risk } = data
  const mediumPlusPct = ((risk.medium_pct ?? 0) + risk.high_pct + risk.critical_pct) || 54.5
  const layers = [
    {
      label: 'All Federal Contracts',
      sub: '2002–2025',
      value: '3.1M',
      pct: 100,
      color: 'rgba(148,163,184,0.25)',
      border: 'rgba(148,163,184,0.4)',
      text: '#94a3b8',
    },
    {
      label: 'Medium+ Risk',
      sub: 'Statistical anomaly detected',
      value: `${mediumPlusPct.toFixed(1)}%`,
      pct: 72,
      color: 'rgba(251,191,36,0.15)',
      border: 'rgba(251,191,36,0.5)',
      text: '#fbbf24',
    },
    {
      label: 'High Risk',
      sub: 'Priority investigation',
      value: `${(risk.high_pct + risk.critical_pct).toFixed(1)}%`,
      pct: 48,
      color: 'rgba(251,146,60,0.18)',
      border: 'rgba(251,146,60,0.6)',
      text: '#fb923c',
    },
    {
      label: 'Critical Risk',
      sub: 'Immediate action required',
      value: `${risk.critical_pct.toFixed(1)}%`,
      pct: 28,
      color: 'rgba(248,113,113,0.2)',
      border: 'rgba(248,113,113,0.7)',
      text: '#f87171',
    },
  ]

  return (
    <div ref={ref} className="my-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4 text-center">
        Risk Stratification — 3.1M Contracts
      </p>
      <div className="flex flex-col items-center gap-1">
        {layers.map((layer, i) => {
          const w = visible ? layer.pct : 0
          return (
            <div
              key={layer.label}
              style={{
                width: `${w}%`,
                transition: `width 800ms cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
                background: layer.color,
                border: `1px solid ${layer.border}`,
                borderRadius:
                  i === layers.length - 1
                    ? '0 0 6px 6px'
                    : i === 0
                      ? '6px 6px 0 0'
                      : '0',
              }}
              className="relative px-4 py-2.5 min-w-[120px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: layer.text }}>
                    {layer.label}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">{layer.sub}</p>
                </div>
                <span
                  className="text-lg font-black tabular-nums font-mono"
                  style={{ color: layer.text }}
                >
                  {layer.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {/* Funnel neck arrow */}
      <div className="flex justify-center mt-1">
        <div
          style={{
            width: `${visible ? 28 : 0}%`,
            transition: 'width 800ms 480ms cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '10px solid rgba(248,113,113,0.5)',
              }}
            />
          </div>
        </div>
      </div>
      <p className="text-center text-[10px] text-risk-critical font-mono mt-1">
        {visible
          ? `${risk.critical_pct.toFixed(1)}% · ${(risk.critical_count).toLocaleString()} contracts · Immediate investigation`
          : ''}
      </p>
    </div>
  )
}

// ============================================================================
// GRAPHIC 2: AI Detection Pipeline
// ============================================================================

function AIPipelineChart() {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(-1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          ;[0, 1, 2, 3, 4].forEach((i) => setTimeout(() => setStep(i), i * 220))
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const nodes: {
    icon: React.ElementType
    title: string
    sub: string
    detail: string
    color: string
    bg: string
    border: string
  }[] = [
    {
      icon: Database,
      title: 'COMPRANET',
      sub: '3.1M contracts',
      detail: '2002–2025',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.1)',
      border: 'rgba(100,116,139,0.3)',
    },
    {
      icon: Scale,
      title: 'Z-SCORES',
      sub: '16 features',
      detail: 'per sector/year',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.3)',
    },
    {
      icon: Compass,
      title: 'MAHALANOBIS',
      sub: 'Multivariate',
      detail: 'anomaly distance',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.3)',
    },
    {
      icon: Brain,
      title: 'LOGISTIC REG.',
      sub: '12 sub-models',
      detail: 'AUC 0.957',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.3)',
    },
    {
      icon: AlertTriangle,
      title: 'RISK SCORE',
      sub: '0 → 1.0',
      detail: 'similarity score',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.5)',
    },
  ]

  return (
    <div ref={ref} className="my-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4">
        Detection Pipeline — v5.1 Model Architecture
      </p>

      {/* Pipeline nodes — horizontal scroll on mobile */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {nodes.map((node, i) => (
          <div key={node.title} className="flex items-center flex-shrink-0">
            {/* Node box */}
            <div
              style={{
                opacity: step >= i ? 1 : 0,
                transform:
                  step >= i ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)',
                transition:
                  'opacity 400ms ease, transform 400ms cubic-bezier(0.16,1,0.3,1)',
                background: node.bg,
                border: `1px solid ${node.border}`,
                borderRadius: '8px',
                minWidth: '96px',
                padding: '10px 8px',
                textAlign: 'center' as const,
              }}
            >
              <div className="flex justify-center mb-1">
                {(() => { const NodeIcon = node.icon; return <NodeIcon size={18} style={{ color: node.color }} /> })()}
              </div>
              <p
                className="text-[10px] font-black tracking-wider font-mono"
                style={{ color: node.color }}
              >
                {node.title}
              </p>
              <p className="text-[11px] font-semibold text-text-primary mt-0.5">{node.sub}</p>
              <p className="text-[9px] text-text-muted font-mono">{node.detail}</p>
            </div>

            {/* Arrow connector — not after last */}
            {i < nodes.length - 1 && (
              <div
                style={{
                  opacity: step >= i + 1 ? 1 : 0,
                  transition: 'opacity 300ms ease',
                  flexShrink: 0,
                  width: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="20" viewBox="0 0 28 20">
                  <defs>
                    <linearGradient id={`pipeGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={nodes[i].color} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={nodes[i + 1].color} stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <line
                    x1="2"
                    y1="10"
                    x2="20"
                    y2="10"
                    stroke={`url(#pipeGrad${i})`}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                    style={{
                      animation:
                        step >= i + 1 ? 'dashFlow 1.2s linear infinite' : 'none',
                    }}
                  />
                  <polygon
                    points="20,6 27,10 20,14"
                    fill={nodes[i + 1].color}
                    opacity={0.8}
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PU learning note */}
      <div
        style={{
          opacity: step >= 4 ? 1 : 0,
          transform: step >= 4 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 400ms 200ms ease, transform 400ms 200ms ease',
        }}
        className="mt-3 flex items-center gap-2 px-3 py-2 rounded border border-border/20 bg-background-elevated/20"
      >
        <span className="text-[10px] font-mono text-text-muted">
          PU-learning correction c=0.882 (Elkan &amp; Noto 2008) · Bootstrap 95% CI per
          contract · Temporal split train≤2020 / test≥2021
        </span>
      </div>

      {/* Keyframe for dashes */}
      <style>{`
        @keyframes dashFlow {
          from { stroke-dashoffset: 10; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// GRAPHIC 3: Pattern Web SVG
// ============================================================================

function PatternWebDiagram() {
  const ref = useRef<SVGSVGElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Center of diagram
  const cx = 260
  const cy = 170

  // Outer nodes — bigger triangle, more spacing
  const nodes = [
    { x: 260, y: 48,  lines: ['DIRECT', 'AWARD'],        sub: '71% of contracts', color: '#fb923c', id: 'da' },
    { x: 72,  y: 280, lines: ['DECEMBER', 'RUSH'],        sub: '1.33× spending spike', color: '#fbbf24', id: 'dr' },
    { x: 448, y: 280, lines: ['VENDOR', 'CONCENTRATION'], sub: '10.6% high-risk rate', color: '#f87171', id: 'vc' },
  ]

  // Edge connection labels
  const edges = [
    { from: 0, to: 1, lines: ['no audit', 'trail'],            lx: 142, ly: 158 },
    { from: 1, to: 2, lines: ['rushed spend', '→ capture'],    lx: 260, ly: 308 },
    { from: 2, to: 0, lines: ['dominant vendors', 'win direct'], lx: 380, ly: 158 },
  ]

  return (
    <div className="flex justify-center my-6">
      <svg
        ref={ref}
        viewBox="0 0 520 380"
        className="w-full max-w-xl"
        style={{ overflow: 'visible' }}
        aria-label="Pattern web diagram showing how direct award, December rush, and vendor concentration reinforce each other"
      >
        {/* Connecting lines */}
        {edges.map((edge, i) => {
          const from = nodes[edge.from]
          const to = nodes[edge.to]
          return (
            <g key={i}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke="rgba(255,255,255,0.13)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 600ms ${i * 150 + 300}ms ease`,
                }}
              />
              {/* Edge label — two lines in a subtle box */}
              <rect
                x={edge.lx - 44} y={edge.ly - 13}
                width={88} height={24}
                rx={4}
                fill="rgba(15,23,42,0.7)"
                style={{ opacity: visible ? 1 : 0, transition: `opacity 400ms ${i * 150 + 650}ms ease` }}
              />
              <text
                textAnchor="middle"
                fontFamily="monospace"
                fill="rgba(148,163,184,0.9)"
                style={{ opacity: visible ? 1 : 0, transition: `opacity 400ms ${i * 150 + 700}ms ease` }}
              >
                <tspan x={edge.lx} y={edge.ly - 2} fontSize="8.5">{edge.lines[0]}</tspan>
                <tspan x={edge.lx} dy="11"         fontSize="8.5">{edge.lines[1]}</tspan>
              </text>
            </g>
          )
        })}

        {/* Center node — RISK AMPLIFIED */}
        <circle
          cx={cx} cy={cy}
          r={visible ? 44 : 0}
          fill="rgba(248,113,113,0.07)"
          stroke="rgba(248,113,113,0.35)"
          strokeWidth="1.5"
          style={{ transition: 'r 500ms 800ms cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text textAnchor="middle" fontFamily="monospace" fontWeight="bold" fill="#f87171"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 400ms 900ms ease' }}>
          <tspan x={cx} y={cy - 7} fontSize="12">RISK</tspan>
          <tspan x={cx} dy="17"    fontSize="12">AMPLIFIED</tspan>
        </text>

        {/* Outer nodes */}
        {nodes.map((node, i) => (
          <g key={node.id}>
            {/* Pulse ring */}
            <circle cx={node.x} cy={node.y}
              r={visible ? 64 : 0}
              fill="none" stroke={node.color} strokeWidth="0.5" opacity={0.15}
              style={{ transition: `r 600ms ${i * 100 + 200}ms cubic-bezier(0.16,1,0.3,1)` }}
            />
            {/* Main circle */}
            <circle cx={node.x} cy={node.y}
              r={visible ? 52 : 0}
              fill={`${node.color}22`}
              stroke={node.color}
              strokeWidth="1.5"
              style={{ transition: `r 500ms ${i * 100 + 200}ms cubic-bezier(0.16,1,0.3,1)` }}
            />
            {/* Dark background rect behind text for readability */}
            <rect
              x={node.x - 46} y={node.y - 22}
              width={92} height={34}
              rx={4}
              fill="rgba(10,15,30,0.75)"
              style={{ opacity: visible ? 1 : 0, transition: `opacity 300ms ${i * 100 + 480}ms ease` }}
            />
            {/* Two-line label */}
            <text textAnchor="middle" fontFamily="monospace" fontWeight="bold" fill={node.color}
              style={{ opacity: visible ? 1 : 0, transition: `opacity 400ms ${i * 100 + 500}ms ease` }}>
              <tspan x={node.x} y={node.y - 8} fontSize="12">{node.lines[0]}</tspan>
              <tspan x={node.x} dy="16"         fontSize="12">{node.lines[1]}</tspan>
            </text>
            {/* Sub-stat background */}
            <rect
              x={node.x - 46} y={node.y + 24}
              width={92} height={16}
              rx={3}
              fill="rgba(10,15,30,0.70)"
              style={{ opacity: visible ? 1 : 0, transition: `opacity 300ms ${i * 100 + 600}ms ease` }}
            />
            {/* Sub-stat */}
            <text x={node.x} y={node.y + 35}
              textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.90)" fontFamily="monospace"
              style={{ opacity: visible ? 1 : 0, transition: `opacity 400ms ${i * 100 + 620}ms ease` }}
            >
              {node.sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ============================================================================
// Risk Level Infographic — 4-tier visual stack
// ============================================================================

function RiskLevelInfographic({ data }: { data: ExecutiveSummaryResponse }) {
  const { risk } = data
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const tiers = [
    {
      level: 'CRITICAL',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.35)',
      pct: `${risk.critical_pct.toFixed(1)}%`,
      count: (201_745).toLocaleString(),
      contracts: '201,745 contracts',
      action: 'Immediate investigation',
      barWidth: risk.critical_pct,
    },
    {
      level: 'HIGH',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.07)',
      border: 'rgba(251,146,60,0.3)',
      pct: `${risk.high_pct.toFixed(1)}%`,
      count: (126_553).toLocaleString(),
      contracts: '126,553 contracts',
      action: 'Priority review',
      barWidth: risk.high_pct,
    },
    {
      level: 'MEDIUM',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.06)',
      border: 'rgba(251,191,36,0.25)',
      pct: `${risk.medium_pct.toFixed(1)}%`,
      count: '~1.36M',
      contracts: '~1.36M contracts',
      action: 'Watch list',
      barWidth: risk.medium_pct,
    },
    {
      level: 'LOW',
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.04)',
      border: 'rgba(74,222,128,0.2)',
      pct: `${risk.low_pct.toFixed(1)}%`,
      count: '~1.42M',
      contracts: '~1.42M contracts',
      action: 'Standard monitoring',
      barWidth: risk.low_pct,
    },
  ]

  const maxBar = Math.max(...tiers.map(t => t.barWidth))

  return (
    <div ref={ref} className="my-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-3">
        Risk Level Distribution — 3.1M Contracts
      </p>
      <div className="space-y-2">
        {tiers.map((tier, i) => (
          <div
            key={tier.level}
            className="rounded-lg border overflow-hidden"
            style={{
              background: tier.bg,
              borderColor: tier.border,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-16px)',
              transition: `opacity 400ms ${i * 80}ms ease, transform 400ms ${i * 80}ms ease`,
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Level badge */}
              <div
                className="text-[10px] font-black tracking-widest font-mono px-2 py-1 rounded w-20 text-center flex-shrink-0"
                style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}40` }}
              >
                {tier.level}
              </div>
              {/* Bar */}
              <div className="flex-1 relative h-6 rounded overflow-hidden bg-background-elevated/40">
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: visible ? `${(tier.barWidth / maxBar) * 100}%` : '0%',
                    background: `linear-gradient(90deg, ${tier.color}60, ${tier.color}30)`,
                    transition: `width 700ms ${200 + i * 100}ms cubic-bezier(0.16,1,0.3,1)`,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-bold font-mono" style={{ color: tier.color }}>
                    {tier.pct}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono ml-2 hidden sm:inline">
                    · {tier.contracts}
                  </span>
                </div>
              </div>
              {/* Action */}
              <div className="text-[10px] text-text-muted font-mono w-32 text-right flex-shrink-0 hidden sm:block">
                {tier.action}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// S1: The Threat Assessment
// ============================================================================

function SectionThreat({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { risk, procedures } = data
  const totalValue = data.headline.total_value || 1

  const criticalPctValue = (risk.critical_value / totalValue) * 100
  const highPctValue = (risk.high_value / totalValue) * 100
  const mediumPctValue = (risk.medium_value / totalValue) * 100
  const lowPctValue = (risk.low_value / totalValue) * 100

  return (
    <section>
      <SectionHeading number="04" title={t('s1.title')} icon={AlertTriangle} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s1.p1"
          values={{
            totalValue: formatCompactMXN(data.headline.total_value),
            valueAtRisk: formatCompactMXN(risk.value_at_risk),
            pct: risk.value_at_risk_pct,
            years: Math.round(risk.value_at_risk / 400_000_000_000),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Risk Level Infographic — 4-tier visual stack */}
      <RiskLevelInfographic data={data} />

      <CorruptionFunnel data={data} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s1.p2"
          values={{ remainingPct: (100 - risk.value_at_risk_pct).toFixed(0) }}
        />
      </p>

      {/* Risk distribution bar — animated fill */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
            {t('s1.riskDistLabel')}
          </p>
          <RiskScoreDisclaimer />
        </div>
        <div className="h-8 rounded-md overflow-hidden flex gap-0.5">
          {[
            { pct: criticalPctValue, color: RISK_COLORS.critical, label: t('s1.riskLevel.critical'), delay: 0 },
            { pct: highPctValue, color: RISK_COLORS.high, label: t('s1.riskLevel.high'), delay: 150 },
            { pct: mediumPctValue, color: RISK_COLORS.medium, label: t('s1.riskLevel.medium'), delay: 300 },
            { pct: lowPctValue, color: RISK_COLORS.low, label: t('s1.riskLevel.low'), delay: 450 },
          ].map((seg) => (
            <AnimatedSegment key={seg.label} pct={seg.pct} color={seg.color} delay={seg.delay} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted font-mono">
          <span style={{ color: RISK_COLORS.critical }}>{t('s1.riskLevel.critical')} {criticalPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.high }}>{t('s1.riskLevel.high')} {highPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.medium }}>{t('s1.riskLevel.medium')} {mediumPctValue.toFixed(0)}%</span>
          <span style={{ color: RISK_COLORS.low }}>{t('s1.riskLevel.low')} {lowPctValue.toFixed(0)}%</span>
        </div>
      </div>

      {/* 4 stat callouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCallout
          value={formatNumber(risk.critical_count)}
          label={t('s1.criticalContracts')}
          color={RISK_COLORS.critical}
          pulse
        />
        <StatCallout
          value={formatNumber(risk.high_count)}
          label={t('s1.highRiskContracts')}
          color={RISK_COLORS.high}
        />
        <StatCallout
          value={`${procedures.direct_award_pct}%`}
          label={t('s1.directAwards')}
          color="var(--color-text-secondary)"
        />
        <StatCallout
          value={`${procedures.single_bid_pct}%`}
          label={t('s1.singleBidders')}
          color="var(--color-text-secondary)"
        />
      </div>

      {/* Calibration context */}
      <p className="text-xs text-text-muted mt-1 max-w-prose">
        {t('s9.calibrationNote')}
      </p>

      {/* Counterintuitive finding */}
      <p className="text-sm leading-relaxed text-text-secondary mt-4">
        <Trans
          t={t}
          i18nKey="s1.p3"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S2 (new): Three Systemic Patterns — The Central Narrative
// ============================================================================

function SectionThreePatterns({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const navigate = useNavigate()
  const { procedures } = data

  const patterns = [
    {
      label: t('sPatterns.p1DirectAward.label'),
      name: t('sPatterns.p1DirectAward.name'),
      stat: `${procedures.direct_award_pct}%`,
      statColor: 'var(--color-risk-high)',
      borderColor: 'border-risk-high/20',
      bgColor: 'bg-risk-high/5',
      icon: Scale,
      iconColor: 'text-risk-high',
      iconBg: 'bg-risk-high/10',
      descKey: 'sPatterns.p1DirectAward.desc' as const,
      descValues: { pct: procedures.direct_award_pct },
      note: t('sPatterns.p1DirectAward.note'),
      useTrans: true,
      glowColor: 'rgba(251, 146, 60, 0.3)',
    },
    {
      label: t('sPatterns.p2December.label'),
      name: t('sPatterns.p2December.name'),
      stat: '1.33×',
      statColor: 'var(--color-risk-medium)',
      borderColor: 'border-risk-medium/20',
      bgColor: 'bg-risk-medium/5',
      icon: Calendar,
      iconColor: 'text-risk-medium',
      iconBg: 'bg-risk-medium/10',
      descKey: 'sPatterns.p2December.desc' as const,
      descValues: {},
      note: t('sPatterns.p2December.note'),
      useTrans: false,
      glowColor: 'rgba(251, 191, 36, 0.3)',
    },
    {
      label: t('sPatterns.p3Concentration.label'),
      name: t('sPatterns.p3Concentration.name'),
      stat: '10.6%',
      statColor: 'var(--color-risk-critical)',
      borderColor: 'border-risk-critical/20',
      bgColor: 'bg-risk-critical/5',
      icon: TrendingUp,
      iconColor: 'text-risk-critical',
      iconBg: 'bg-risk-critical/10',
      descKey: 'sPatterns.p3Concentration.desc' as const,
      descValues: {},
      note: t('sPatterns.p3Concentration.note'),
      useTrans: false,
      glowColor: 'rgba(248, 113, 113, 0.3)',
    },
  ]

  return (
    <section>
      <SectionHeading number="02" title={t('sPatterns.title')} icon={Compass} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('sPatterns.intro')}
      </p>

      <PatternWebDiagram />

      <div className="space-y-4">
        {patterns.map((p, idx) => {
          const Icon = p.icon
          return (
            <ScrollReveal key={p.label} delay={idx * 120}>
              <div
                className={`border rounded-xl p-6 transition-all duration-500 hover:shadow-lg relative overflow-hidden ${p.borderColor} ${p.bgColor}`}
                style={{ boxShadow: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 24px 2px ${p.glowColor}`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Decorative gradient in corner */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
                  style={{ background: p.statColor }}
                />
                <div className="relative flex items-start gap-4">
                  <div className={`p-2 rounded-md flex-shrink-0 ${p.iconBg}`}>
                    <Icon className={`h-5 w-5 ${p.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-text-muted font-mono">
                      {p.label}
                    </span>
                    <h4 className="text-base font-bold text-text-primary mt-0.5 mb-2">{p.name}</h4>
                    <div className="text-3xl font-black font-mono mb-3 tabular-nums" style={{ color: p.statColor }}>
                      {p.stat}
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary mb-2">
                      {p.useTrans ? (
                        <Trans t={t} i18nKey={p.descKey} values={p.descValues} components={{ bold: <strong className="text-text-primary" /> }} />
                      ) : (
                        t(p.descKey)
                      )}
                    </p>
                    <p className="text-xs italic text-text-muted border-t border-border/20 pt-2 mt-2">{p.note}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )
        })}
      </div>

      {/* CASE IN POINT — one documented example to make the patterns concrete */}
      <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent font-mono mb-2">
          Case in Point
        </p>
        <p className="text-sm font-bold text-text-primary mb-2">
          IMSS Ghost Company Network · Health Sector · 2018–2022
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          Two vendors — Pisa Farmacéutica and DIQN — won{' '}
          <strong className="text-text-primary">9,366 contracts</strong>{' '}
          worth billions of pesos through a single institution (IMSS), frequently on the same day,
          with no competing bids. The model flags{' '}
          <strong className="text-risk-critical">99.9%</strong> of these contracts as high-risk —
          the highest detection rate of any documented case. This single case demonstrates
          all three patterns operating simultaneously: direct award dominance, year-end
          concentration, and extreme vendor–institution lock-in.
        </p>
        <button
          onClick={() => navigate('/investigation')}
          className="mt-3 text-xs text-accent flex items-center gap-1 hover:underline font-mono"
        >
          View all 22 documented cases <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  )
}

// ============================================================================
// Corruption Cases Timeline — vertical chronological list
// ============================================================================

const TIMELINE_CASES = [
  { year: 2004, name: 'La Estafa Maestra', sector: 'gobernacion', type: 'Ghost companies', impact: '~$7.7B MXN' },
  { year: 2012, name: 'Grupo Higa / Casa Blanca', sector: 'infraestructura', type: 'Conflict of interest', impact: 'Undisclosed' },
  { year: 2013, name: 'Decoaro Ghost Cleaning Company', sector: 'gobernacion', type: 'Ghost companies', impact: '$46M MXN' },
  { year: 2014, name: 'Odebrecht-PEMEX Bribery', sector: 'energia', type: 'Bribery', impact: '$10.5M USD' },
  { year: 2014, name: 'CONAGUA Ghost Contractor Rotation', sector: 'ambiente', type: 'Ghost companies', impact: '$29M MXN' },
  { year: 2015, name: 'PEMEX Emilio Lozoya (Odebrecht-linked)', sector: 'energia', type: 'Bribery', impact: 'Documented / shared vendors' },
  { year: 2015, name: 'Oceanografia PEMEX Fraud', sector: 'energia', type: 'Invoice fraud', impact: '$400M MXN' },
  { year: 2016, name: 'IPN Cartel de la Limpieza', sector: 'educacion', type: 'Bid rigging', impact: '$180M MXN' },
  { year: 2016, name: 'Infrastructure Fraud Network', sector: 'infraestructura', type: 'Overpricing', impact: '$191M MXN' },
  { year: 2017, name: 'IMSS Ghost Company Network', sector: 'salud', type: 'Ghost companies', impact: '$2.8B MXN' },
  { year: 2017, name: 'IT Procurement Overpricing (Cyber Robotic)', sector: 'tecnologia', type: 'Overpricing', impact: '$139M MXN' },
  { year: 2018, name: 'SAT Tender Rigging (SixSigma)', sector: 'hacienda', type: 'Tender rigging', impact: '$320M MXN' },
  { year: 2018, name: 'PEMEX-Cotemar Irregularities', sector: 'energia', type: 'Procurement fraud', impact: '$51M MXN' },
  { year: 2019, name: 'SEGOB-Mainbit IT Monopoly', sector: 'gobernacion', type: 'Monopoly', impact: '$1.1B MXN' },
  { year: 2019, name: 'ISSSTE Ambulance Leasing Fraud', sector: 'trabajo', type: 'Overpricing', impact: '$603M MXN' },
  { year: 2019, name: 'Toka IT Monopoly', sector: 'tecnologia', type: 'Monopoly', impact: '$2.1B MXN' },
  { year: 2020, name: 'COVID-19 Emergency Procurement', sector: 'salud', type: 'Embezzlement', impact: '$3.4B MXN' },
  { year: 2020, name: 'Segalmex Food Distribution', sector: 'agricultura', type: 'Procurement fraud', impact: '$15B MXN' },
  { year: 2020, name: 'Edenred Government Voucher Monopoly', sector: 'energia', type: 'Monopoly', impact: '$8.9B MXN' },
  { year: 2021, name: 'IMSS Overpriced Medicines (Ethomedical Network)', sector: 'salud', type: 'Overpricing', impact: 'Under investigation' },
  { year: 2021, name: 'Tren Maya Direct Award Irregularities', sector: 'infraestructura', type: 'Procurement fraud', impact: 'Under investigation' },
  { year: 2022, name: 'SAT EFOS Ghost Network (Case 22)', sector: 'otros', type: 'Ghost companies', impact: '38 confirmed RFCs' },
] as const

function CorruptionTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4">
        Ground Truth Cases — Chronological Timeline
      </p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border/30" />
        <div className="space-y-0">
          {TIMELINE_CASES.map((c, i) => {
            const dotColor = SECTOR_COLORS[c.sector] ?? SECTOR_COLORS.otros
            return (
              <div
                key={`${c.year}-${c.name}`}
                className="relative pl-10 pb-5"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                  transition: `opacity 350ms ${i * 55}ms ease, transform 350ms ${i * 55}ms ease`,
                }}
              >
                {/* Dot */}
                <div
                  className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: dotColor,
                    background: `${dotColor}33`,
                    boxShadow: `0 0 6px ${dotColor}55`,
                  }}
                />
                {/* Content */}
                <div className="text-[10px] text-text-muted font-mono mb-0.5">{c.year}</div>
                <div className="text-sm font-semibold text-text-primary leading-tight">{c.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color: dotColor, background: `${dotColor}18`, border: `1px solid ${dotColor}30` }}
                  >
                    {c.type}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono capitalize">{c.sector}</span>
                  <span className="text-[10px] text-text-muted font-mono">&middot; {c.impact}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// S2: The Proof — Ground Truth Validation
// ============================================================================

function SectionProof({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { ground_truth: gt } = data
  const sortedCases = useMemo(
    () => [...gt.case_details].sort((a, b) => b.high_plus_pct - a.high_plus_pct),
    [gt.case_details]
  )
  const detectionChartRef = useRef<HTMLDivElement>(null)

  return (
    <section>
      <SectionHeading number="08" title={t('s2.title')} icon={Target} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s2.p1"
          values={{
            cases: gt.cases,
            contracts: formatNumber(gt.contracts),
            vendors: gt.vendors,
          }}
        />
      </p>

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s2.p2"
          values={{
            detectionRate: gt.detection_rate,
            auc: gt.auc,
            aucPct: (gt.auc * 100).toFixed(0),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Detection rate bars */}
      <div ref={detectionChartRef} className="space-y-2 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
            {t('s2.detectionLabel')}
          </p>
          <ChartDownloadButton targetRef={detectionChartRef} filename="rubli-ground-truth-detection" />
        </div>
        {sortedCases.map((c, idx) => (
          <div key={c.name} className="flex items-center gap-3">
            <div className="w-52 sm:w-64 text-right">
              <span className="text-xs text-text-secondary truncate block">{c.name}</span>
            </div>
            <div className="flex-1 h-5 bg-surface-raised rounded overflow-hidden relative">
              <AnimatedSegment
                pct={c.high_plus_pct}
                color={c.high_plus_pct >= 90 ? RISK_COLORS.critical : c.high_plus_pct >= 60 ? RISK_COLORS.high : RISK_COLORS.medium}
                delay={idx * 80}
              />
              <span className="absolute right-2 top-0 bottom-0 flex items-center text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-mono z-10">
                {c.high_plus_pct}%
              </span>
            </div>
            <span className="text-xs text-text-muted w-20 text-right font-mono">
              {t('s2.nContracts', { count: c.contracts })}
            </span>
          </div>
        ))}
      </div>

      {/* Full detection story — all 14 ground truth cases, sortable */}
      <ModelDetectionStory collapsible={false} />

      {/* Corruption Cases Timeline */}
      <CorruptionTimeline />

      {/* Early warning callout */}
      <div className="border-l-2 border-accent/50 bg-accent/[0.03] rounded-r-md px-5 py-4 mb-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="s2.earlyWarning"
            components={{
              accent: <strong className="text-accent" />,
              italic: <em />,
            }}
          />
        </p>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s2.p3"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S3: Where the Risk Concentrates — Sectors
// ============================================================================

function SectionSectors({
  data,
  navigate,
}: {
  data: ExecutiveSummaryResponse
  navigate: (path: string) => void
}) {
  const { t } = useTranslation(['executive', 'sectors'])
  const sortedSectors = useMemo(() => {
    return [...data.sectors].sort((a, b) => {
      const aRiskValue = (a.high_plus_pct / 100) * a.value
      const bRiskValue = (b.high_plus_pct / 100) * b.value
      return bRiskValue - aRiskValue
    })
  }, [data.sectors])

  const maxRiskValue = useMemo(() => {
    return Math.max(...sortedSectors.map((s) => (s.high_plus_pct / 100) * s.value))
  }, [sortedSectors])

  const healthSector = data.sectors.find((s) => s.code === 'salud')

  return (
    <section>
      <SectionHeading number="07" title={t('s3.title')} icon={Scale} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s3.p1"
          values={{
            healthContracts: formatNumber(healthSector?.contracts ?? 0),
            healthValue: formatCompactMXN(healthSector?.value ?? 0),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Sector bars sorted by value at risk */}
      <div className="space-y-1.5 mb-8">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s3.riskLabel')}
        </p>
        {sortedSectors.map((s, idx) => {
          const riskValue = (s.high_plus_pct / 100) * s.value
          const pct = maxRiskValue > 0 ? (riskValue / maxRiskValue) * 100 : 0
          const color = SECTOR_COLORS[s.code] || SECTOR_COLORS.otros
          return (
            <button
              key={s.code}
              className="flex items-center gap-3 w-full group hover:bg-surface-raised/50 rounded px-1 py-0.5 transition-colors text-left"
              onClick={() => {
                const sector = data.sectors.find((x) => x.code === s.code)
                if (sector) navigate(`/sectors/${data.sectors.indexOf(sector) + 1}`)
              }}
            >
              <div className="w-28 text-right">
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  {t(s.code, { ns: 'sectors' })}
                </span>
              </div>
              <AnimatedFill pct={Math.max(pct, 1)} color={color} delay={idx * 60} height="h-4" />
              <span className="text-xs text-text-muted w-24 text-right font-mono">
                {formatCompactMXN(riskValue)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sector callouts */}
      <div className="space-y-4">
        <SectorCallout
          name={t('s3.health.name')}
          color={SECTOR_COLORS.salud}
          text={t('s3.health.text')}
        />
        <SectorCallout
          name={t('s3.infrastructure.name')}
          color={SECTOR_COLORS.infraestructura}
          text={t('s3.infrastructure.text')}
        />
        <SectorCallout
          name={t('s3.agriculture.name')}
          color={SECTOR_COLORS.agricultura}
          text={t('s3.agriculture.text')}
        />
      </div>
    </section>
  )
}

// ============================================================================
// S4: Who Is Involved — Top Vendors
// ============================================================================

function SectionVendors({
  data,
  navigate,
}: {
  data: ExecutiveSummaryResponse
  navigate: (path: string) => void
}) {
  const { t } = useTranslation('executive')
  const knownBadIds = new Set([4335, 13885])

  return (
    <section>
      <SectionHeading number="06" title={t('s4.title')} icon={Users} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s4.p1"
          values={{
            totalValue: formatCompactMXN(data.top_vendors.reduce((sum, v) => sum + v.value_billions * 1e9, 0)),
          }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Editorial table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.rank')}
              </th>
              <th className="text-left py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.vendor')}
              </th>
              <th className="text-right py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.value')}
              </th>
              <th className="text-right py-2 pr-3 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.contracts')}
              </th>
              <th className="text-right py-2 text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
                {t('s4.table.avgRisk')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.top_vendors.map((v, i) => {
              const isKnownBad = knownBadIds.has(v.id)
              const riskColor =
                v.avg_risk >= 0.30
                  ? RISK_COLORS.high
                  : v.avg_risk >= 0.20
                    ? RISK_COLORS.medium
                    : 'var(--color-text-muted)'
              return (
                <tr
                  key={v.id}
                  className="border-b border-border/20 hover:bg-surface-raised/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/vendors/${v.id}`)}
                >
                  <td className="py-2 pr-3 text-text-muted font-mono text-xs">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-3 text-text-primary">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[280px]">{v.name}</span>
                      {isKnownBad && (
                        <Shield className="h-3.5 w-3.5 flex-shrink-0 text-risk-critical" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-text-secondary font-mono text-xs">
                    {v.value_billions}B
                  </td>
                  <td className="py-2 pr-3 text-right text-text-muted font-mono text-xs">
                    {formatNumber(v.contracts)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono"
                      style={{ color: riskColor, background: `color-mix(in srgb, ${riskColor} 15%, transparent)` }}
                    >
                      {v.avg_risk.toFixed(3)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s4.p2"
          values={{ topValue: data.top_vendors[0]?.value_billions }}
          components={{
            bold: <strong className="text-text-primary" />,
            shield: <Shield className="h-3 w-3 inline text-risk-critical" />,
          }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S5: The Network — Co-bidding and Collusion Patterns
// ============================================================================

function SectionNetwork({ patternCounts }: {
  patternCounts?: { counts: { critical: number; december_rush: number; split_contracts: number; co_bidding: number; price_outliers: number } }
}) {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="09" title={t('s5.title')} icon={Network} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s5.p1"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s5.p2"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <StatCallout value="8,701" label={t('s5.suspiciousVendors')} color="var(--color-risk-high)" />
        <StatCallout
          value={patternCounts ? formatNumber(patternCounts.counts.co_bidding) : '1M+'}
          label={t('s5.affectedContracts')}
          color="var(--color-risk-medium)"
        />
        <StatCallout value="50%+" label={t('s5.coBidThreshold')} color="var(--color-text-secondary)" />
      </div>

      {patternCounts && (
        <div className="border border-border/30 rounded-lg px-4 py-3 bg-surface-raised/20 mb-6">
          <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-3">
            All detection patterns — live database scan
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Critical risk" value={formatNumber(patternCounts.counts.critical)} color={RISK_COLORS.critical} />
            <MiniStat label="December rush" value={formatNumber(patternCounts.counts.december_rush)} color={RISK_COLORS.medium} />
            <MiniStat label="Split contracts" value={formatNumber(patternCounts.counts.split_contracts)} />
            <MiniStat label="Price outliers" value={formatNumber(patternCounts.counts.price_outliers)} />
          </div>
        </div>
      )}

      <p className="text-sm leading-relaxed text-text-secondary">
        {t('s5.p3')}
      </p>
    </section>
  )
}

// ============================================================================
// S6: The Data — COMPRANET Data Quality
// ============================================================================

// ============================================================================
// Currency Note Banner — data quality notice for headline KPI row
// ============================================================================

function CurrencyNoteBanner() {
  const { t } = useTranslation('executive')
  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5">
      <HelpCircle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-300/80 leading-relaxed">
        {t('currencyNote.text')}
      </p>
    </div>
  )
}

function SectionData() {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="01" title={t('s6.title')} icon={Database} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        {t('s6.p1')}
      </p>

      <div className="space-y-3 mb-6">
        <DataStructureRow period="A" years="2002-2010" quality={t('s6.structures.a.quality')} rfcCoverage="0.1%" note={t('s6.structures.a.note')} />
        <DataStructureRow period="B" years="2010-2017" quality={t('s6.structures.b.quality')} rfcCoverage="15.7%" note={t('s6.structures.b.note')} />
        <DataStructureRow period="C" years="2018-2022" quality={t('s6.structures.c.quality')} rfcCoverage="30.3%" note={t('s6.structures.c.note')} />
        <DataStructureRow period="D" years="2023-2025" quality={t('s6.structures.d.quality')} rfcCoverage="47.4%" note={t('s6.structures.d.note')} />
      </div>

      <div className="border-l-2 border-accent/50 bg-accent/[0.03] rounded-r-md px-5 py-4 mb-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans
            t={t}
            i18nKey="s6.trillionLesson"
            components={{ accent: <strong className="text-accent" /> }}
          />
        </p>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        {t('s6.p2')}
      </p>
    </section>
  )
}

function DataStructureRow({ period, years, quality, rfcCoverage, note }: { period: string; years: string; quality: string; rfcCoverage: string; note: string }) {
  const { t } = useTranslation('executive')
  const qualityLower = quality.toLowerCase()
  const qualityColor = qualityLower.includes('lowest') || qualityLower.includes('baja') ? RISK_COLORS.critical : qualityLower.includes('better') || qualityLower.includes('mejor') ? RISK_COLORS.medium : qualityLower.includes('good') || qualityLower.includes('buena') ? RISK_COLORS.low : 'var(--color-accent)'
  return (
    <div className="flex items-start gap-3 border border-border/30 rounded-lg p-4 bg-surface-raised/20">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-elevated text-sm font-bold text-text-primary font-mono flex-shrink-0">
        {period}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-text-primary">{years}</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-bold font-mono" style={{ color: qualityColor, background: `color-mix(in srgb, ${qualityColor} 15%, transparent)` }}>
            {quality}
          </span>
          <span className="text-xs text-text-muted font-mono">{t('s6.rfc')}: {rfcCoverage}</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{note}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Competition Decline Callout — audit-insight panel for SectionAdministrations
// ============================================================================

function CompetitionDeclineCard() {
  const { t } = useTranslation('executive')
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 flex flex-col sm:flex-row gap-5 items-start">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15">
        <TrendingUp className="h-5 w-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono mb-1">
          {t('competitionDecline.statLabel')}
        </p>
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
            {t('competitionDecline.stat')}
          </span>
          <span className="text-sm font-bold text-text-primary">
            {t('competitionDecline.title')}
          </span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {t('competitionDecline.subtitle')}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// S7: Across Administrations — Political Timeline
// ============================================================================

function SectionAdministrations({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')

  return (
    <section>
      <SectionHeading number="05" title={t('s7.title')} icon={Landmark} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        <Trans
          t={t}
          i18nKey="s7.p1"
          components={{ italic: <em /> }}
        />
      </p>

      <div className="space-y-4">
        {data.administrations.map((admin) => (
          <div
            key={admin.name}
            className="border border-border/30 rounded-lg p-5 bg-surface-raised/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary">{admin.full_name}</h4>
                <p className="text-xs text-text-muted font-mono">
                  {admin.years} &middot; {admin.party}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
              <MiniStat label={t('s7.labels.contracts')} value={formatNumber(admin.contracts)} />
              <MiniStat
                label={t('s7.labels.value')}
                value={formatCompactMXN(admin.value)}
                sublabel={admin.real_value
                  ? `${formatCompactMXN(admin.real_value)} pesos 2024`
                  : undefined}
              />
              <MiniStat
                label={t('s7.labels.highRisk')}
                value={`${admin.high_risk_pct}%`}
                color={admin.high_risk_pct >= 4.5 ? RISK_COLORS.high : undefined}
              />
              <MiniStat
                label={t('s7.labels.directAward')}
                value={`${admin.direct_award_pct}%`}
                color={admin.direct_award_pct >= 75 ? RISK_COLORS.medium : undefined}
              />
            </div>

            {/* Narrative */}
            <p className="text-sm leading-relaxed text-text-muted">
              {t(`s7.narratives.${admin.name}`, '')}
            </p>
          </div>
        ))}
      </div>

      {/* Key moments excerpt */}
      <KeyMomentsPanel />
    </section>
  )
}

// ============================================================================
// Key Moments Panel — curated excerpt for Executive Summary
// ============================================================================

const KEY_MOMENTS = [
  {
    year: 2012,
    title: 'Ley de Adquisiciones Reform',
    desc: 'Modernized public procurement law, mandating electronic bidding on CompraNet for all federal agencies above threshold.',
    type: 'reform',
    admin: 'fox',
    color: '#3b82f6',
  },
  {
    year: 2014,
    title: 'Casa Blanca Scandal',
    desc: 'President Peña Nieto\'s family home built by Grupo Higa, a key government contractor — conflict of interest documented by journalists.',
    type: 'scandal',
    admin: 'pena',
    color: '#dc2626',
  },
  {
    year: 2017,
    title: 'La Estafa Maestra',
    desc: 'ASF audit uncovered $7.7B MXN funneled through public universities to shell companies. Emblematic of ghost-contractor networks.',
    type: 'scandal',
    admin: 'pena',
    color: '#dc2626',
  },
  {
    year: 2020,
    title: 'COVID Emergency Procurement',
    desc: '$45B MXN in emergency health contracts bypassed competitive bidding. RUBLI flags 81% of these as critical risk.',
    type: 'crisis',
    admin: 'amlo',
    color: '#ea580c',
  },
  {
    year: 2021,
    title: 'Segalmex Scandal',
    desc: '$9.4B MXN embezzled from the food security agency via overpriced contracts and ghost distributors — 100% detected by the model.',
    type: 'scandal',
    admin: 'amlo',
    color: '#dc2626',
  },
  {
    year: 2024,
    title: 'CompraNet 5.0 Launch',
    desc: 'New procurement platform with enhanced transparency features; 47.4% RFC coverage in 2023–2025 data vs. 0.1% in 2002–2010.',
    type: 'reform',
    admin: 'sheinbaum',
    color: '#16a34a',
  },
] as const

type MomentType = 'reform' | 'scandal' | 'crisis'

const TYPE_LABELS: Record<MomentType, string> = {
  reform: 'Reforma',
  scandal: 'Escándalo',
  crisis: 'Crisis',
}

const TYPE_BG: Record<MomentType, string> = {
  reform: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  scandal: 'bg-red-500/10 text-red-400 border-red-500/20',
  crisis: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

function KeyMomentsPanel() {
  const navigate = useNavigate()

  return (
    <div className="mt-8 border border-border/20 rounded-xl bg-surface-raised/20 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-surface-raised/30">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted font-mono">
            Momentos Clave · 2002–2024
          </span>
        </div>
        <button
          onClick={() => navigate('/administrations')}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
        >
          Ver análisis completo <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Timeline */}
      <div className="divide-y divide-border/10">
        {KEY_MOMENTS.map((evt) => (
          <div key={`${evt.year}-${evt.title}`} className="flex gap-4 px-5 py-3 hover:bg-surface-raised/20 transition-colors">
            {/* Year + color bar */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="text-xs font-black font-mono text-text-primary w-10 text-right">
                {evt.year}
              </span>
              <div className="w-0.5 flex-1 rounded" style={{ backgroundColor: evt.color }} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-semibold text-text-primary">{evt.title}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${TYPE_BG[evt.type as MomentType]}`}
                >
                  {TYPE_LABELS[evt.type as MomentType]}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{evt.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-5 py-2.5 bg-surface-raised/10 border-t border-border/10">
        <p className="text-[10px] text-text-muted font-mono">
          Fuentes: ASF, IMCO, Contralínea, Aristegui Noticias · Escándalos incluidos en ground truth del modelo v5.1
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Model Evolution AUC Comparison Bars
// ============================================================================

function ModelEvolutionBars() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const versions = [
    {
      version: 'v3.3',
      label: 'Weighted Checklist',
      auc: 0.584,
      barColor: '#f87171',
      tag: '8 rule-based factors',
    },
    {
      version: 'v4.0',
      label: 'Statistical Framework',
      auc: 0.942,
      barColor: '#fbbf24',
      tag: 'Z-scores + Mahalanobis',
    },
    {
      version: 'v5.1',
      label: 'Per-Sector Sub-Models',
      auc: 0.957,
      barColor: '#4ade80',
      tag: 'Active · 16 features · ElasticNet',
    },
  ]

  const maxAuc = 1.0

  return (
    <div ref={ref} className="mb-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-3">
        Model Evolution — AUC-ROC (higher = better discrimination)
      </p>
      <div className="space-y-3">
        {versions.map((v, i) => (
          <div key={v.version} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 text-xs font-black font-mono text-text-muted text-right">
              {v.version}
            </div>
            <div className="flex-1 relative h-8 rounded bg-surface-raised/30 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: visible ? `${(v.auc / maxAuc) * 100}%` : '0%',
                  background: `linear-gradient(90deg, ${v.barColor}70, ${v.barColor}40)`,
                  borderRight: `2px solid ${v.barColor}`,
                  transition: `width 700ms ${150 + i * 130}ms cubic-bezier(0.16,1,0.3,1)`,
                }}
              />
              <div className="absolute inset-0 flex items-center px-3 gap-3">
                <span className="text-sm font-bold font-mono" style={{ color: v.barColor }}>
                  {v.auc.toFixed(3)}
                </span>
                <span className="text-xs text-text-muted hidden sm:inline">{v.label}</span>
              </div>
            </div>
            <div
              className="flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded hidden sm:block"
              style={{
                color: v.barColor,
                background: `${v.barColor}14`,
                border: `1px solid ${v.barColor}30`,
              }}
            >
              {v.tag}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1 px-13 text-[9px] font-mono text-text-muted">
        <span className="pl-14">0.50 (random)</span>
        <span>1.00 (perfect)</span>
      </div>
    </div>
  )
}

// ============================================================================
// S8: How We Know — Model Transparency
// ============================================================================

function SectionModel({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { model } = data
  const maxBeta = Math.max(...model.top_predictors.map((p) => Math.abs(p.beta)))
  const coeffChartRef = useRef<HTMLDivElement>(null)

  return (
    <section>
      <SectionHeading number="03" title={t('s8.title')} icon={Brain} />

      <p className="text-sm leading-relaxed text-text-secondary mb-4">
        <Trans
          t={t}
          i18nKey="s8.p1"
          values={{ contracts: formatNumber(data.ground_truth.contracts) }}
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>

      {/* Plain-language AUC explanation for non-technical readers */}
      <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 font-mono mb-2">
          What does AUC 0.957 mean in plain language?
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          Imagine picking two contracts at random — one from a documented corruption case, one
          clean. Our model ranks the corrupt contract higher{' '}
          <strong className="text-text-primary">95.7% of the time</strong>. A coin flip would
          achieve 50%. A model this accurate means investigators can focus on the top-flagged
          contracts and find real wrongdoing — rather than searching blindly across 3.1 million
          records.
        </p>
        <p className="text-xs text-text-muted mt-2 italic">
          AUC = Area Under the ROC Curve. Validated on contracts from 2021–2025 that the model
          never saw during training (temporal holdout split).
        </p>
      </div>

      <AIPipelineChart />

      {/* Model evolution AUC comparison */}
      <ModelEvolutionBars />

      {/* Metric badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <MetricBadge label="AUC-ROC" value={model.auc.toFixed(3)} description={t('s8.discriminationPower')} />
        <MetricBadge label="Brier Score" value={model.brier.toFixed(3)} description={t('s8.calibrationQuality')} />
        <MetricBadge label="Lift" value={`${model.lift}x`} description={t('s8.vsRandom')} />
      </div>

      {/* Coefficient chart */}
      <div ref={coeffChartRef} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
            {t('s8.coeffLabel')}
          </p>
          <ChartDownloadButton targetRef={coeffChartRef} filename="rubli-model-coefficients" />
        </div>
        <div className="space-y-2">
          {model.top_predictors.map((p) => {
            const isPositive = p.beta > 0
            const width = (Math.abs(p.beta) / maxBeta) * 100
            return (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-40 text-right">
                  <span className="text-xs text-text-secondary">
                    {t(`predictors.${p.name}`, p.name)}
                  </span>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  {!isPositive && (
                    <div className="flex-1 flex justify-end">
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${width}%`,
                          background: 'var(--color-accent)',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  )}
                  <div className="w-px h-6 bg-border/50" />
                  {isPositive && (
                    <div className="flex-1">
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${width}%`,
                          background: RISK_COLORS.critical,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  )}
                  {!isPositive && <div className="flex-1" />}
                </div>
                <span className="text-xs font-bold text-text-secondary font-mono w-14 text-right">
                  {isPositive ? '+' : ''}{p.beta.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-text-muted font-mono">
          <span className="pl-44">{t('s8.reducesRisk')}</span>
          <span>{t('s8.increasesRisk')}</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        <Trans
          t={t}
          i18nKey="s8.p2"
          components={{ bold: <strong className="text-text-primary" /> }}
        />
      </p>
    </section>
  )
}

// ============================================================================
// S9: What We Cannot See — Limitations
// ============================================================================

function SectionLimitations() {
  const { t } = useTranslation('executive')

  const limitations = [
    { icon: Database, key: 'groundTruth' },
    { icon: Search, key: 'dataQuality' },
    { icon: Scale, key: 'correlation' },
    { icon: HelpCircle, key: 'unknowns' },
    { icon: EyeOff, key: 'executionPhase' },
    { icon: AlertTriangle, key: 'scarViolation' },
    { icon: Calendar, key: 'temporalLeakage' },
  ]

  return (
    <section>
      <SectionHeading number="10" title={t('s9.title')} icon={EyeOff} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('s9.p1')}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {limitations.map((lim) => {
          const Icon = lim.icon
          return (
            <div
              key={lim.key}
              className="border border-border/30 rounded-lg p-5 bg-surface-raised/20"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className="h-4 w-4 text-text-muted flex-shrink-0" />
                <h4 className="text-sm font-bold text-text-primary">
                  {t(`s9.limitations.${lim.key}.title`)}
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                {t(`s9.limitations.${lim.key}.text`)}
              </p>
              <p className="text-xs italic text-text-muted mt-2">
                {t(`s9.limitations.${lim.key}.mitigation`)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// S10: What Comes Next — Recommendations
// ============================================================================

function SectionRecommendations({ navigate }: { navigate: (path: string) => void }) {
  const { t } = useTranslation('executive')

  const actions = [
    { icon: Search, key: 'investigate', href: '/investigation' },
    { icon: Compass, key: 'safeguards', href: '/patterns' },
    { icon: Shield, key: 'diversify', href: '/ground-truth' },
  ]

  const policyRecommendations = [
    {
      audience: 'For Investigators (ASF / SFP)',
      color: '#f87171',
      steps: [
        'Start with the 201,745 critical-risk contracts — filter by sector (Salud, Agricultura) and institution to triage the highest-value cases first.',
        'Cross-reference the 38 SAT-confirmed EFOS ghost vendors (Case 22) against active contracts. Any current procurement relationship warrants immediate review.',
        'Run vendor network analysis on co-bidding clusters — 8,701 vendors show suspicious co-bid rates above 50%, a hallmark of bid rotation.',
      ],
    },
    {
      audience: 'For Procurement Reformers',
      color: '#fb923c',
      steps: [
        'The 71% direct award rate is the single largest vulnerability. Mandate competitive procedures for all contracts above 500K MXN, with limited emergency exceptions.',
        'Require publication of justification memos for direct awards within 24 hours of signing — not retroactively.',
        'December contract volume spikes 1.33× — enforce quarterly budget release schedules to eliminate year-end spending dumps.',
      ],
    },
    {
      audience: 'For Journalists & Civil Society',
      color: '#fbbf24',
      steps: [
        'Use the Sector page to identify which agencies account for the highest value-at-risk in your area of coverage.',
        'The Vendor Profile tool shows 27 documented ground truth vendors alongside statistical risk — compare institutional exposure.',
        'Filter the contract explorer to risk_level=critical and sector=salud to reproduce the IMSS ghost company patterns independently.',
      ],
    },
  ]

  return (
    <section>
      <SectionHeading number="11" title={t('s10.title')} icon={ArrowRight} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('s10.p1')}
      </p>

      {/* Platform navigation actions */}
      <div className="space-y-3 mb-8">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => navigate(action.href)}
              className="w-full text-left border border-border/30 rounded-lg p-5 bg-surface-raised/20 hover:bg-surface-raised/50 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
                    {t(`s10.actions.${action.key}.title`)}
                  </h4>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {t(`s10.actions.${action.key}.description`)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors mt-1 flex-shrink-0" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Audience-specific next steps */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4">
          Recommended next steps — by audience
        </p>
        <div className="space-y-4">
          {policyRecommendations.map((rec) => (
            <div
              key={rec.audience}
              className="rounded-xl border p-5"
              style={{ borderColor: `${rec.color}30`, background: `${rec.color}06` }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest font-mono mb-3"
                style={{ color: rec.color }}
              >
                {rec.audience}
              </p>
              <ol className="space-y-2">
                {rec.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="text-[10px] font-black font-mono mt-0.5 flex-shrink-0 w-4"
                      style={{ color: rec.color }}
                    >
                      {i + 1}.
                    </span>
                    <span className="text-sm text-text-secondary leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Report Footer
// ============================================================================

function ReportFooter({ data }: { data: ExecutiveSummaryResponse }) {
  const { t, i18n } = useTranslation('executive')
  const locale = i18n.language === 'es' ? 'es-MX' : 'en-US'

  return (
    <footer className="pt-12 pb-8 text-center space-y-3">
      <div className="h-px bg-border/30 mb-8" />
      <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
        {t('footer.platform')}
      </p>
      <p className="text-xs text-text-secondary font-mono">
        {new Date(data.generated_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
        {' '}&middot; {t('footer.compranet')} &middot; Model v5.1 (AUC {data.model.auc})
      </p>
      <p className="text-xs text-text-secondary font-mono">
        {formatNumber(data.headline.total_contracts)} {t('header.contracts').toLowerCase()}
        {' '}&middot; {formatCompactMXN(data.headline.total_value)}
        {' '}&middot; {formatNumber(data.headline.total_vendors)} {t('header.vendors').toLowerCase()}
        {' '}&middot; {t('footer.sectors')}
      </p>
      <p className="text-sm italic text-text-muted mt-6">
        {t('footer.quote')}
      </p>
      <p className="text-xs text-text-muted font-mono mt-4 tracking-wide">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </p>
    </footer>
  )
}

// ============================================================================
// Shared Sub-Components
// ============================================================================

function SectionHeading({
  number,
  title,
  icon: Icon,
}: {
  number: string
  title: string
  icon: React.ElementType
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          <Icon className="h-5 w-5 text-text-muted flex-shrink-0" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          <span className="text-text-muted font-mono text-sm mr-2">{number} —</span>
          {title}
        </h2>
      </div>
      <div
        className="h-px ml-8 rounded-full"
        style={{
          background: 'linear-gradient(90deg, var(--color-accent) 0%, transparent 60%)',
          opacity: 0.4,
        }}
      />
    </div>
  )
}

function HeadlineStat({ value, label, rawNumber, sublabel }: { value: string; label: string; rawNumber?: number; sublabel?: string }) {
  const { ref, value: animated } = useCountUp(rawNumber ?? 0, 1600)
  const displayValue = rawNumber !== undefined
    ? (animated >= 1_000_000_000
        ? `${(animated / 1_000_000_000).toFixed(1)}T`
        : animated >= 1_000_000
          ? `${(animated / 1_000_000).toFixed(0)}M`
          : animated.toLocaleString())
    : value

  return (
    <div className="text-center py-4 px-2 border border-border/20 rounded-lg bg-surface-raised/20 hover:bg-surface-raised/40 hover:border-accent/20 transition-all duration-300 group">
      <span ref={ref}>
        <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono tracking-tight group-hover:text-accent transition-colors duration-300">
          {displayValue}
        </div>
      </span>
      <div className="text-xs text-text-muted uppercase tracking-wider font-mono mt-1">{label}</div>
      {sublabel && (
        <div className="text-[10px] text-text-muted/60 font-mono mt-0.5 italic">{sublabel}</div>
      )}
    </div>
  )
}

function StatCallout({ value, label, color, pulse }: { value: string; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="text-center py-2">
      <div
        className="text-lg font-bold font-mono"
        style={{
          color,
          animation: pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
        }}
      >
        {value}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color, sublabel }: { label: string; value: string; color?: string; sublabel?: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted uppercase tracking-wider font-mono">
        {label}
      </div>
      <div
        className="text-sm font-bold font-mono"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] text-text-muted/60 font-mono italic leading-tight">{sublabel}</div>
      )}
    </div>
  )
}

function MetricBadge({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border border-border/30 rounded-lg px-4 py-2.5 bg-surface-raised/20">
      <div>
        <div className="text-lg font-bold text-accent font-mono">{value}</div>
        <div className="text-xs text-text-muted font-mono uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="text-xs text-text-secondary max-w-[80px] leading-tight">{description}</div>
    </div>
  )
}

function SectorCallout({ name, color, text }: { name: string; color: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-0.5">{name}</h4>
        <p className="text-sm leading-relaxed text-text-muted">{text}</p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/20" />
}


function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
