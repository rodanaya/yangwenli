/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Fully internationalized (ES/EN) via react-i18next 'executive' namespace.
 */

import React, { useMemo, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
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
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
// HallazgoStat available if needed for additional breakdowns
// import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import {
  AlertTriangle,
  Scale,
  Users,
  Compass,
  ArrowRight,
  Shield,
  Search,
  Calendar,
  TrendingUp,
  DollarSign,
  Zap,
  Printer,
  Share2,
  Check,
  ChevronDown,
} from 'lucide-react'

function PullQuote({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLQuoteElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()

  return (
    <motion.blockquote
      ref={ref}
      className="border-l-[3px] border-l-[#dc2626] pl-6 py-4 my-10"
      initial={reduced ? {} : { opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ delay: delay / 1000, duration: 0.8 }}
    >
      <p className="text-lg sm:text-xl italic text-text-secondary leading-relaxed">
        {children}
      </p>
    </motion.blockquote>
  )
}

function AnimatedDivider() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })

  return (
    <div ref={ref} className="py-4">
      <div
        className="h-px mx-auto"
        style={{
          background: 'linear-gradient(90deg, #dc2626, #dc262640)',
          maxWidth: '100%',
          transform: isInView ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left center',
          transition: 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  )
}

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

// ============================================================================
// Main Component
// ============================================================================

export function ExecutiveSummary() {
  const navigate = useNavigate()
  const { t } = useTranslation('executive')
  const { data, isLoading, isError, refetch } = useExecutiveSummary()
  const [showFullBreakdown, setShowFullBreakdown] = useState(false)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto py-24 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-risk-critical" />
        <h2 className="text-lg font-bold text-text-primary">{t('error.title')}</h2>
        <p className="text-sm text-text-muted max-w-sm">
          {t('error.body')}
        </p>
        <button
          onClick={() => void refetch()}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-accent text-background-base hover:bg-accent/90 transition-colors"
        >
          {t('error.retry')}
        </button>
      </div>
    )
  }

  const highRiskPct = (data.risk.high_pct + data.risk.critical_pct).toFixed(1)
  const totalValueT = (data.headline.total_value / 1e12).toFixed(1)
  const valueAtRiskFormatted = formatCompactMXN((data.risk.high_value ?? 0) + (data.risk.critical_value ?? 0))

  return (
    <article className="max-w-4xl mx-auto pb-20 space-y-16 print:text-black print:bg-background-card">
      <EditorialHeadline
        section={t('editorialSection')}
        headline={t('editorialHeadline')}
        subtitle={t('editorialSubtitle')}
      />

      {/* ── Editorial Lede ── */}
      <motion.blockquote
        className="border-l-4 border-l-[#dc2626] pl-6 py-4 my-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <p className="text-xl sm:text-2xl italic text-text-secondary leading-relaxed font-serif">
          {t('lede', { highRiskPct, valueAtRisk: valueAtRiskFormatted })}
        </p>
      </motion.blockquote>

      {/* ── 4 Primary KPI Cards ── */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
      >
        <motion.div variants={staggerItem}>
          <div className="fern-card p-4 border-l-[3px] border-l-blue-500">
            <div className="font-black text-2xl sm:text-3xl font-mono text-text-primary tabular-nums">
              {formatNumber(data.headline.total_contracts)}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-500/70 mt-1">{t('kpi.totalContracts')}</div>
            <div className="text-[11px] text-text-muted mt-1 leading-snug">{t('kpi.totalContractsContext')}</div>
          </div>
        </motion.div>
        <motion.div variants={staggerItem}>
          <div className="fern-card p-4 border-l-[3px] border-l-amber-500">
            <div className="font-black text-2xl sm:text-3xl font-mono text-text-primary tabular-nums">
              {totalValueT}T
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-500/70 mt-1">{t('kpi.totalValue')}</div>
            <div className="text-[11px] text-text-muted mt-1 leading-snug">{t('kpi.totalValueContext')}</div>
          </div>
        </motion.div>
        <motion.div variants={staggerItem}>
          <div className="fern-card p-4 border-l-[3px] border-l-red-500">
            <div className="font-black text-2xl sm:text-3xl font-mono text-text-primary tabular-nums">
              {highRiskPct}%
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-500/70 mt-1">{t('kpi.highRiskRate')}</div>
            <div className="text-[11px] text-text-muted mt-1 leading-snug">{t('kpi.highRiskRateContext')}</div>
          </div>
        </motion.div>
        <motion.div variants={staggerItem}>
          <div className="fern-card p-4 border-l-[3px] border-l-orange-500">
            <div className="font-black text-2xl sm:text-3xl font-mono text-text-primary tabular-nums">
              {valueAtRiskFormatted}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-500/70 mt-1">{t('kpi.valueAtRisk')}</div>
            <div className="text-[11px] text-text-muted mt-1 leading-snug">{t('kpi.valueAtRiskContext')}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Editorial context notes below KPI cards ── */}
      <div className="space-y-1.5">
        <p className="text-xs text-text-muted leading-relaxed italic">
          {t('rateExplanation')}
        </p>
        <p className="text-xs text-text-muted leading-relaxed italic">
          {t('budgetContext', { pct: '56' })}
        </p>
      </div>

      {/* ── Expandable Full Breakdown ── */}
      <div>
        <button
          onClick={() => setShowFullBreakdown(!showFullBreakdown)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          {showFullBreakdown ? t('hideBreakdown') : t('seeFullBreakdown')}
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showFullBreakdown ? 'rotate-180' : ''}`} />
        </button>
        {showFullBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-6"
          >
            <ScrollReveal delay={80}><ReportHeader data={data} /></ScrollReveal>
            <ScrollReveal delay={100}><StatBombs data={data} /></ScrollReveal>
          </motion.div>
        )}
      </div>

      {/* Pull quote */}
      <PullQuote>
        {t('pullQuote1')}
      </PullQuote>

      <ScrollReveal delay={120}><WhatWeFound data={data} /></ScrollReveal>

      {/* Section numbering note — sections 02/04/06/07/11 reflect original 11-chapter report */}
      <p className="text-[10px] text-text-muted/60 font-mono text-right">
        {t('sectionNumberNote')}
      </p>

      <AnimatedDivider />
      {/* 02 — WHAT IT FOUND: Three Systemic Patterns */}
      <ScrollReveal><SectionThreePatterns data={data} /></ScrollReveal>
      <AnimatedDivider />
      {/* 04 — THE THREAT: Risk Scores & Value at Risk */}
      <ScrollReveal><SectionThreat data={data} /></ScrollReveal>

      {/* Pull quote before vendors */}
      <PullQuote delay={200}>
        {t('pullQuote2')}
      </PullQuote>

      <AnimatedDivider />
      {/* 06 — WHO BENEFITS: Top Vendors */}
      <ScrollReveal><SectionVendors data={data} navigate={navigate} /></ScrollReveal>
      <AnimatedDivider />
      {/* 07 — WHICH SECTORS: Risk Concentration */}
      <ScrollReveal><SectionSectors data={data} navigate={navigate} /></ScrollReveal>
      <AnimatedDivider />
      {/* 11 — NOW WHAT: Recommendations */}
      <ScrollReveal><SectionRecommendations navigate={navigate} /></ScrollReveal>
      {/* Data source attribution */}
      <div className="flex flex-wrap items-center gap-3 mt-8">
        <FuentePill source="COMPRANET" count={3051294} verified={true} />
        <MetodologiaTooltip
          title={t('sourceLabel')}
          body={t('sourceBody')}
          link="/methodology"
        />
      </div>

      <ScrollReveal><ReportFooter data={data} /></ScrollReveal>
    </article>
  )
}

export default ExecutiveSummary

// ============================================================================
// Share Button (copies URL to clipboard)
// ============================================================================

function ShareButton() {
  const { t } = useTranslation('executive')
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={() => void handleShare()}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-background-elevated/50 hover:bg-background-elevated border border-border text-text-muted hover:text-text-secondary transition-colors"
      title={t('share')}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? t('shareCopied') : t('share')}
    </button>
  )
}

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
        <div className="print:hidden flex items-center gap-2">
          <ShareButton />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-background-elevated/50 hover:bg-background-elevated border border-border text-text-muted hover:text-text-secondary transition-colors"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            {t('exportPdf')}
          </button>
        </div>
      </div>

      {/* Date line */}
      <p className="text-xs text-text-muted font-mono tracking-wide mb-3">
        {t('header.dateline')}
      </p>

      {/* Editorial label */}
      <div className="editorial-rule mb-4">
        <span className="editorial-label text-accent">{t('header.badge')}</span>
      </div>

      {/* Title */}
      <h1 className="text-editorial-display text-text-primary mb-3">
        {t('header.title')}
      </h1>
      <p className="text-lg text-text-secondary italic mb-8 max-w-2xl">
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
  const { t } = useTranslation('executive')
  const { risk } = data
  const highRiskRate = (risk.high_pct + risk.critical_pct).toFixed(1)

  const { data: pyodData } = useQuery({
    queryKey: ['analysis', 'pyod-agreement'],
    queryFn: () => analysisApi.getPyodAgreement(),
    staleTime: 60 * 60 * 1000,
  })

  const highCriticalCount = (risk.critical_count ?? 0) + (risk.high_count ?? 0)
  // Always display as compact number to prevent card overflow
  const highCriticalFormatted = highCriticalCount >= 1_000_000
    ? `${(highCriticalCount / 1_000_000).toFixed(1)}M`
    : `${Math.round(highCriticalCount / 1_000)}K`

  const bombs = [
    {
      key: 'highRiskRate',
      value: `${highRiskRate}%`,
      label: t('statBombs.highRiskRate'),
      sub: t('statBombs.highRiskRateSub'),
      context: t('statBombs.highRiskRateContext'),
      color: '#f87171',
    },
    {
      key: 'highCritical',
      value: highCriticalFormatted,
      label: t('statBombs.highCritical'),
      sub: t('statBombs.highCriticalSub', { pct: highRiskRate }),
      context: t('statBombs.highCriticalContext'),
      color: '#fb923c',
    },
    {
      key: 'yearsCovered',
      value: '23',
      label: t('statBombs.yearsCovered'),
      sub: t('statBombs.yearsCoveredSub'),
      context: t('statBombs.yearsCoveredContext'),
      color: '#22d3ee',
    },
    {
      key: 'modelAuc',
      value: '0.840',
      label: t('statBombs.modelAuc'),
      sub: t('statBombs.modelAucSub'),
      context: t('statBombs.modelAucContext'),
      color: '#4ade80',
    },
    {
      key: 'documentedCases',
      value: '22',
      label: t('statBombs.documentedCases'),
      sub: t('statBombs.documentedCasesSub'),
      context: t('statBombs.documentedCasesContext'),
      color: '#fbbf24',
    },
    {
      key: 'dualConfirmed',
      value: pyodData ? `${Math.round(pyodData.both_flagged / 1000)}K` : '130K',
      label: t('statBombs.dualConfirmed'),
      sub: t('statBombs.dualConfirmedSub'),
      context: t('statBombs.dualConfirmedContext'),
      color: '#a78bfa',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
      {bombs.map((b, i) => (
        <ScrollReveal key={b.key} delay={i * 80}>
          <div className="flex items-start gap-4 p-4 bg-background-card border border-border rounded-lg">
            <div className="flex-shrink-0">
              <div className="text-2xl font-mono font-bold text-text-primary">{b.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">{b.label}</div>
            </div>
            <div className="text-xs text-text-muted leading-relaxed border-l border-border pl-4">
              {b.context}
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
            <div className={`fern-card border-l-[3px] border-l-amber-500/60 p-5 transition-shadow hover:border-l-amber-500/80 ${f.borderColor} ${f.bgColor}`}>
              <Icon className={`h-6 w-6 mb-3 ${f.iconColor}`} />
              <div className={`pull-stat mb-1 ${f.valueColor}`}>{f.value}</div>
              <div className="text-sm text-text-muted">{f.desc}</div>
            </div>
          </ScrollReveal>
        )
      })}
    </div>
  )
}

// ============================================================================
// S2: Three Systemic Patterns — The Central Narrative
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
                    <div className="pull-stat mb-3" style={{ color: p.statColor }}>
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
          {t('caseInPoint.label')}
        </p>
        <p className="text-sm font-bold text-text-primary mb-2">
          {t('caseInPoint.title')}
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {t('caseInPoint.desc1')}{' '}
          <strong className="text-text-primary">{t('caseInPoint.contracts')}</strong>{' '}
          {t('caseInPoint.desc2')}{' '}
          <strong className="text-risk-critical">{t('caseInPoint.detection')}</strong>{' '}
          {t('caseInPoint.desc3')}
        </p>
        <button
          onClick={() => navigate('/investigation')}
          className="mt-3 text-xs text-accent flex items-center gap-1 hover:underline font-mono"
        >
          {t('caseInPoint.link')} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  )
}

// ============================================================================
// GRAPHIC 1: Investigation Cascade (replaces Corruption Funnel)
// A left-aligned cascade showing how 3.1M contracts triage down to 133K critical
// ============================================================================

function CorruptionFunnel({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { risk } = data
  const criticalCount = risk.critical_count ?? 133572
  const highCount = risk.high_count ?? 148043
  const highPlusPct = risk.high_pct + risk.critical_pct
  const highPlusCount = criticalCount + highCount
  const medPlusPct = (risk.medium_pct ?? 0) + highPlusPct
  const medPlusCount = Math.round(medPlusPct / 100 * 3051294)

  const stages = [
    {
      label: t('funnel.allContracts'),
      pct: 100,
      count: 3051294,
      barH: 16,
      color: 'var(--color-text-muted)',
      accent: false,
    },
    {
      label: t('funnel.mediumRisk'),
      pct: medPlusPct,
      count: medPlusCount,
      barH: 14,
      color: 'var(--color-text-secondary)',
      accent: false,
    },
    {
      label: t('funnel.highRisk'),
      pct: highPlusPct,
      count: highPlusCount,
      barH: 14,
      color: '#ea580c',
      accent: false,
    },
    {
      label: t('funnel.criticalRisk'),
      pct: risk.critical_pct,
      count: criticalCount,
      barH: 22,
      color: 'var(--color-accent)',
      accent: true,
    },
  ]

  return (
    <div className="my-8 p-5 rounded-lg border border-border bg-background-card">
      {/* Headline */}
      <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-text-muted mb-1">
        {t('funnel.title')}
      </p>
      <p className="text-xs text-text-muted font-mono mb-5">
        3,051,294 {t('funnel.allContractsSub')}
      </p>

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={i}>
            {/* Label row */}
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[11px] font-bold uppercase tracking-wider font-mono"
                style={{ color: stage.accent ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
              >
                {stage.label}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="text-[11px] font-mono tabular-nums text-text-muted"
                >
                  {stage.count.toLocaleString()} contracts
                </span>
                <span
                  className={`font-mono tabular-nums font-black ${stage.accent ? 'text-lg' : 'text-sm'}`}
                  style={{ color: stage.accent ? 'var(--color-accent)' : 'var(--color-text-primary)', minWidth: '52px', textAlign: 'right' }}
                >
                  {stage.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            {/* Bar — left-aligned, proportional width */}
            <div className="relative" style={{ height: `${stage.barH}px`, backgroundColor: 'var(--color-background-elevated)', borderRadius: 2 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${stage.pct}%`,
                  backgroundColor: stage.color,
                  borderRadius: 2,
                  opacity: stage.accent ? 1 : 0.65,
                }}
              />
              {/* Inline % label for narrow bars */}
              {stage.pct < 15 && (
                <span
                  className="absolute left-[calc(var(--w)+6px)] top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono tabular-nums"
                  style={{ '--w': `${stage.pct}%` } as React.CSSProperties}
                />
              )}
            </div>
            {/* Separator */}
            {i < stages.length - 1 && (
              <div className="mt-3 border-t border-border opacity-40" />
            )}
          </div>
        ))}
      </div>

      {/* Critical callout */}
      <div className="mt-5 pt-4 border-t border-border flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary font-mono">{criticalCount.toLocaleString()}</strong>
          {' '}{t('funnel.criticalRiskSub')}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Risk Level Infographic — 4-tier visual stack
// ============================================================================

function RiskLevelInfographic({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { risk } = data

  const tiers = [
    {
      level: 'CRITICAL',
      pct: risk.critical_pct,
      count: risk.critical_count != null ? risk.critical_count.toLocaleString() : '133,572',
      action: t('riskInfographic.immediate'),
      color: 'var(--color-accent)',
      bg: 'rgba(196,30,58,0.08)',
      accent: true,
    },
    {
      level: 'HIGH',
      pct: risk.high_pct,
      count: risk.high_count != null ? risk.high_count.toLocaleString() : '148,043',
      action: t('riskInfographic.priority'),
      color: '#ea580c',
      bg: 'rgba(234,88,12,0.06)',
      accent: false,
    },
    {
      level: 'MEDIUM',
      pct: risk.medium_pct,
      count: '~498K',
      action: t('riskInfographic.watchList'),
      color: '#ca8a04',
      bg: 'rgba(202,138,4,0.05)',
      accent: false,
    },
    {
      level: 'LOW',
      pct: risk.low_pct,
      count: '~2.3M',
      action: t('riskInfographic.standard'),
      color: 'var(--color-text-muted)',
      bg: 'transparent',
      accent: false,
    },
  ]

  // Full-width distribution bar across the top
  const barSegments = [
    { pct: risk.critical_pct, color: 'var(--color-accent)' },
    { pct: risk.high_pct, color: '#ea580c' },
    { pct: risk.medium_pct, color: '#ca8a04' },
    { pct: risk.low_pct, color: 'var(--color-background-elevated)' },
  ]

  return (
    <div className="my-8">
      <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-text-muted mb-4">
        {t('riskInfographic.title')}
      </p>

      {/* Distribution bar — thin strip showing proportional split */}
      <div className="flex h-2 rounded overflow-hidden mb-1 gap-px">
        {barSegments.map((s, i) => (
          <div key={i} style={{ width: `${s.pct}%`, backgroundColor: s.color, minWidth: 2 }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-text-muted mb-6">
        <span style={{ color: 'var(--color-accent)' }}>CRITICAL {risk.critical_pct.toFixed(1)}%</span>
        <span style={{ color: '#ea580c' }}>HIGH {risk.high_pct.toFixed(1)}%</span>
        <span style={{ color: '#ca8a04' }}>MEDIUM {risk.medium_pct.toFixed(1)}%</span>
        <span>LOW {risk.low_pct.toFixed(1)}%</span>
      </div>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.level}
            className="rounded-lg border border-border p-4 relative overflow-hidden"
            style={{ backgroundColor: tier.bg }}
          >
            {/* Left accent bar */}
            <div
              className="absolute left-0 inset-y-0 w-[3px] rounded-l-lg"
              style={{ backgroundColor: tier.color }}
            />
            <div className="pl-1">
              <p className="text-[10px] font-black uppercase tracking-widest font-mono mb-1" style={{ color: tier.color }}>
                {tier.level}
              </p>
              <p
                className="font-black font-mono tabular-nums leading-none mb-1"
                style={{ fontSize: tier.accent ? '2rem' : '1.5rem', color: tier.accent ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
              >
                {tier.pct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-text-secondary font-mono tabular-nums">
                {tier.count}
              </p>
              <p className="text-[10px] text-text-muted mt-1.5 leading-tight">
                {tier.action}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-mono text-text-muted mt-3">
        Source: COMPRANET 2002–2025 · RUBLI v6.4 · OECD benchmark: 2–15%
      </p>
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

      {/* Risk distribution by value — stacked bar */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold tracking-widest uppercase font-mono text-text-muted">
            {t('s1.riskDistLabel')}
          </p>
          <RiskScoreDisclaimer />
        </div>
        <div className="flex rounded overflow-hidden gap-px" style={{ height: '24px' }}>
          {[
            { pct: criticalPctValue, color: 'var(--color-accent)', label: t('s1.riskLevel.critical') },
            { pct: highPctValue, color: '#ea580c', label: t('s1.riskLevel.high') },
            { pct: mediumPctValue, color: '#ca8a04', label: t('s1.riskLevel.medium') },
            { pct: lowPctValue, color: 'var(--color-background-elevated)', label: t('s1.riskLevel.low') },
          ].map((seg) => (
            <div
              key={seg.label}
              style={{ width: `${seg.pct}%`, backgroundColor: seg.color, minWidth: 2 }}
              title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex gap-5 mt-2.5 flex-wrap">
          {[
            { color: 'var(--color-accent)', label: t('s1.riskLevel.critical'), pct: criticalPctValue },
            { color: '#ea580c', label: t('s1.riskLevel.high'), pct: highPctValue },
            { color: '#ca8a04', label: t('s1.riskLevel.medium'), pct: mediumPctValue },
            { color: 'var(--color-text-muted)', label: t('s1.riskLevel.low'), pct: lowPctValue },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, backgroundColor: item.color, flexShrink: 0, borderRadius: 1 }} />
              <span className="text-[10px] font-mono text-text-muted">
                {item.label}{' '}
                <span className="font-bold text-text-primary">{item.pct.toFixed(0)}%</span>
              </span>
            </div>
          ))}
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
    return sortedSectors.length > 0 ? Math.max(...sortedSectors.map((s) => (s.high_plus_pct / 100) * s.value)) : 1
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

      {/* Sector bars — ranked by estimated value at risk */}
      <div className="my-6 rounded-lg border border-border bg-background-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-text-muted">
            {t('s3.riskLabel')}
          </p>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {sortedSectors.map((s, idx) => {
              const riskValue = (s.high_plus_pct / 100) * s.value
              const pct = maxRiskValue > 0 ? (riskValue / maxRiskValue) * 100 : 0
              const sectorColor = SECTOR_COLORS[s.code] || SECTOR_COLORS.otros
              const isTop = idx === 0
              return (
                <tr
                  key={s.code}
                  className="group cursor-pointer hover:bg-background-elevated transition-colors"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onClick={() => {
                    const sector = data.sectors.find((x) => x.code === s.code)
                    if (sector) navigate(`/sectors/${data.sectors.indexOf(sector) + 1}`)
                  }}
                >
                  {/* Rank */}
                  <td className="py-2.5 px-3 text-[10px] font-mono text-text-muted tabular-nums text-right" style={{ width: '28px' }}>
                    {idx + 1}
                  </td>
                  {/* Sector name + color dot */}
                  <td className="py-2.5 pr-3" style={{ width: '130px' }}>
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sectorColor, flexShrink: 0 }} />
                      <span className={`text-xs transition-colors ${isTop ? 'font-bold text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                        {t(s.code, { ns: 'sectors' })}
                      </span>
                    </div>
                  </td>
                  {/* Bar */}
                  <td className="py-2.5 pr-3">
                    <div className="relative" style={{ height: '8px', backgroundColor: 'var(--color-background-elevated)', borderRadius: 2 }}>
                      <div
                        style={{
                          position: 'absolute',
                          inset: '0 auto 0 0',
                          width: `${Math.max(pct, 0.5)}%`,
                          backgroundColor: isTop ? 'var(--color-accent)' : sectorColor,
                          borderRadius: 2,
                          opacity: isTop ? 1 : 0.7,
                        }}
                      />
                    </div>
                  </td>
                  {/* Risk rate */}
                  <td className="py-2.5 pr-2 text-right text-[11px] font-mono tabular-nums text-text-muted" style={{ width: '48px' }}>
                    {s.high_plus_pct.toFixed(1)}%
                  </td>
                  {/* MXN value */}
                  <td className="py-2.5 pl-1 pr-4 text-right font-mono font-bold tabular-nums text-text-primary" style={{ width: '96px', fontSize: '12px' }}>
                    {formatCompactMXN(riskValue)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-border bg-background-elevated/50">
          <p className="text-[10px] font-mono text-text-muted">
            Value at risk = high+critical rate × sector spend · Source: COMPRANET 2002–2025
          </p>
        </div>
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
            totalValue: formatCompactMXN((data.top_vendors ?? []).reduce((sum, v) => sum + v.value_billions * 1e9, 0)),
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
                  className="border-b border-border/20 border-l-[0px] border-l-transparent hover:bg-surface-raised/50 hover:border-l-[3px] hover:border-l-[#dc2626] cursor-pointer transition-all duration-200"
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
        'Start with the critical-risk contracts — filter by sector (Salud, Agricultura) and institution to triage the highest-value cases first.',
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
              className="w-full text-left fern-card p-5 hover:border-accent/30 transition-all group"
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
        <div className="editorial-rule mb-4">
          <span className="editorial-label">Recommended next steps — by audience</span>
        </div>
        <div className="space-y-4">
          {policyRecommendations.map((rec) => (
            <div
              key={rec.audience}
              className="fern-card p-5"
              style={{ borderColor: `${rec.color}30`, background: `${rec.color}06` }}
            >
              <p
                className="editorial-label mb-3"
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
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-border/30" />
        <div className="accent-rule" />
        <div className="h-px flex-1 bg-border/30" />
      </div>
      <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono">
        {t('footer.platform')}
      </p>
      <p className="text-xs text-text-secondary font-mono">
        {new Date(data.generated_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
        {' '}&middot; {t('footer.compranet')} &middot; Model v6.0 (AUC {data.model.auc})
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
    <div className="mb-6">
      {/* Small monospace crimson number label */}
      <div className="mb-2">
        <span
          className="font-mono font-bold"
          style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'rgba(220, 38, 38, 0.7)' }}
        >
          {number}
        </span>
      </div>
      <div className="editorial-rule">
        <Icon className="h-4 w-4 text-accent flex-shrink-0" />
        <span className="editorial-label text-accent">{number}</span>
      </div>
      <h2 className="text-editorial-h2 text-text-primary">{title}</h2>
      <div className="accent-rule mt-3" />
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
    <div className="fern-card text-center py-5 px-3 group">
      <span ref={ref}>
        <div className="stat-hero text-text-primary group-hover:text-accent transition-colors duration-300" style={{ fontSize: '2.5rem' }}>
          {displayValue}
        </div>
      </span>
      <div className="editorial-label mt-2">{label}</div>
      {sublabel && (
        <div className="text-[10px] text-text-muted/60 font-mono mt-0.5 italic">{sublabel}</div>
      )}
    </div>
  )
}

function StatCallout({ value, label, color, pulse }: { value: string; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="fern-card text-center py-4 px-3">
      <div
        className="pull-stat"
        style={{
          color,
          animation: pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
        }}
      >
        {value}
      </div>
      <div className="editorial-label mt-1">{label}</div>
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
