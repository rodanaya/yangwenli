/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Fully internationalized (ES/EN) via react-i18next 'executive' namespace.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react'
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
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { ScrollReveal, useCountUp, AnimatedFill, AnimatedSegment } from '@/hooks/useAnimations'
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
} from 'lucide-react'

// ============================================================================
// Cinematic Components — Fern/NYT editorial enhancements
// ============================================================================

function CinematicHero() {
  const reduced = useReducedMotion()

  return (
    <div className="relative overflow-hidden pt-12 pb-16 mb-8">
      {/* Giant ghost year range */}
      <div
        className="select-none pointer-events-none text-center"
        style={{
          fontSize: 'clamp(4rem, 15vw, 14rem)',
          fontWeight: 900,
          lineHeight: 1,
          WebkitTextStroke: '1px rgba(220,38,38,0.3)',
          color: 'transparent',
          letterSpacing: '-0.02em',
        }}
        aria-hidden="true"
      >
        2002–2025
      </div>

      {/* Overlaid subtitle */}
      <motion.p
        className="text-center text-sm sm:text-base tracking-[0.3em] uppercase text-text-muted/70 font-mono mt-4"
        initial={reduced ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Mexico's Procurement Record
      </motion.p>

      {/* Animated horizontal gradient line */}
      <motion.div
        className="mx-auto mt-6 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #dc2626, transparent)',
          maxWidth: '80%',
        }}
        initial={reduced ? {} : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.0, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

function EditorialStat({
  value,
  label,
  delay = 0,
}: {
  value: string
  label: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const reduced = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className="py-8 border-l-[3px] border-l-[#dc2626] pl-6"
      initial={reduced ? {} : { opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: delay / 1000, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="font-black text-text-primary leading-none"
        style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
      >
        {value}
      </div>
      <div className="mt-2 text-xs font-bold tracking-[0.2em] uppercase text-[#dc2626]/70 font-mono">
        {label}
      </div>
    </motion.div>
  )
}

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

  return (
    <article className="max-w-4xl mx-auto pb-20 space-y-16 print:text-black print:bg-background-card">
      {/* Cinematic opening hero */}
      <CinematicHero />

      <EditorialHeadline
        section="RESUMEN EJECUTIVO"
        headline="Panorama de Contrataciones"
        subtitle="Analisis integral del gasto federal mexicano · 2002–2025"
      />

      <ScrollReveal delay={80}><ReportHeader data={data} /></ScrollReveal>

      {/* Editorial pull stats */}
      <div className="flex flex-wrap gap-8 my-6">
        <HallazgoStat value={`${totalValueT}T`} label="MXN total analizado" color="border-amber-500" />
        <HallazgoStat value={`${highRiskPct}%`} label="contratos de alto riesgo" color="border-red-500" />
        <HallazgoStat value={formatNumber(data.headline.total_contracts)} label="contratos analizados" color="border-blue-500" />
        <HallazgoStat value="23 anos" label="de datos federales · 2002–2025" color="border-zinc-400" />
      </div>

      {/* Editorial stat moments */}
      <div className="space-y-2">
        <EditorialStat value={formatNumber(data.headline.total_contracts)} label="Federal Contracts Analyzed" delay={0} />
        <EditorialStat value={`${totalValueT}T MXN`} label="Total Procurement Value" delay={200} />
        <EditorialStat value={`${highRiskPct}%`} label="High-Risk Rate" delay={400} />
      </div>

      <ScrollReveal delay={100}><StatBombs data={data} /></ScrollReveal>

      {/* Pull quote */}
      <PullQuote>
        One in eight contracts shows statistical patterns consistent with procurement fraud.
      </PullQuote>

      <ScrollReveal delay={120}><WhatWeFound data={data} /></ScrollReveal>
      <AnimatedDivider />
      {/* 02 — WHAT IT FOUND: Three Systemic Patterns */}
      <ScrollReveal><SectionThreePatterns data={data} /></ScrollReveal>
      <AnimatedDivider />
      {/* 04 — THE THREAT: Risk Scores & Value at Risk */}
      <ScrollReveal><SectionThreat data={data} /></ScrollReveal>

      {/* Pull quote before vendors */}
      <PullQuote delay={200}>
        The procurement system's greatest vulnerability is not any single contract — it is the
        structural concentration of public spending in vendors that operate without meaningful competition.
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
          title="Sobre este analisis"
          body="Basado en el modelo de riesgo RUBLI v6.4 (AUC=0.840, HR ~10%). Scores indican similitud con patrones de corrupcion documentados, no son prueba de irregularidad."
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
      value: `${highRiskRate}%`,
      label: 'High-Risk Rate',
      sub: 'OECD-calibrated · v6.0',
      glow: 'rgba(248,113,113,0.3)',
      color: '#f87171',
    },
    {
      value: highCriticalFormatted,
      label: 'High/Critical Contracts',
      sub: `${highRiskRate}% of all 3.1M contracts`,
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
      value: '0.840',
      label: 'Model AUC',
      sub: 'Vendor-stratified split · v6.4',
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
    {
      value: pyodData ? `${Math.round(pyodData.both_flagged / 1000)}K` : '130K',
      label: 'Dual-Confirmed',
      sub: 'v6.0 model AND PyOD ML · unsupervised cross-validation',
      glow: 'rgba(139,92,246,0.3)',
      color: '#a78bfa',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {bombs.map((b, i) => (
        <ScrollReveal key={b.label} delay={i * 80}>
          <div
            className="fern-card relative p-3 sm:p-4 text-center overflow-hidden transition-all duration-300"
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
              className="stat-bomb-value stat-hero text-white relative z-10 whitespace-nowrap"
              style={{
                textShadow: `0 0 40px ${b.glow}`,
                fontSize: b.value.length > 5 ? '1.6rem' : b.value.length > 3 ? '2rem' : '2.5rem',
              }}
            >
              {b.value}
            </div>
            <div className="editorial-label mt-1.5 relative z-10 leading-tight">
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
      color: 'rgba(148,163,184,0.12)',
      border: 'rgba(148,163,184,0.5)',
      text: '#cbd5e1',
    },
    {
      label: 'Medium+ Risk',
      sub: 'Statistical anomaly detected',
      value: `${mediumPlusPct.toFixed(1)}%`,
      pct: 72,
      color: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.7)',
      text: '#fbbf24',
    },
    {
      label: 'High Risk',
      sub: 'Priority investigation',
      value: `${(risk.high_pct + risk.critical_pct).toFixed(1)}%`,
      pct: 48,
      color: 'rgba(251,146,60,0.14)',
      border: 'rgba(251,146,60,0.8)',
      text: '#fb923c',
    },
    {
      label: 'Critical Risk',
      sub: 'Immediate action required',
      value: `${risk.critical_pct.toFixed(1)}%`,
      pct: 28,
      color: 'rgba(248,113,113,0.18)',
      border: 'rgba(248,113,113,0.9)',
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

  const maxBar = tiers.length > 0 ? Math.max(...tiers.map(t => t.barWidth)) : 1

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
