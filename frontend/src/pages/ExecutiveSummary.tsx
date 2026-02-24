/**
 * Executive Intelligence Summary
 *
 * The flagship report page — reads like a NYT investigation or OECD annual report.
 * Long-scroll editorial format with rich narrative, supporting data, and qualitative insights.
 * Every section has a thesis statement, evidence, and contextual analysis.
 * Fully internationalized (ES/EN) via react-i18next 'executive' namespace.
 */

import { useMemo, useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import type { ExecutiveSummaryResponse } from '@/api/types'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { ScrollReveal, useCountUp, AnimatedFill, AnimatedSegment } from '@/hooks/useAnimations'
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
  const { data, isLoading } = useExecutiveSummary()
  const { data: patternCounts } = usePatternCounts()

  if (isLoading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <article className="max-w-4xl mx-auto pb-20 space-y-16">
      <ScrollReveal delay={80}><ReportHeader data={data} /></ScrollReveal>
      <ScrollReveal delay={120}><KeyFindings /></ScrollReveal>
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
  const totalValueUSD = headline.total_value / 17.5

  return (
    <header className="pt-4">
      {/* Small caps label */}
      <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/5">
        <Shield className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
          {t('header.badge')}
        </span>
        <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
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
              totalValueUSD: formatCompactMXN(totalValueUSD).replace('MXN', 'USD'),
              valueAtRisk: formatCompactMXN(data.risk.value_at_risk),
              pct: data.risk.value_at_risk_pct,
            }}
          />
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HeadlineStat value={formatNumber(headline.total_contracts)} label={t('header.contracts')} rawNumber={headline.total_contracts} />
        <HeadlineStat value={formatCompactMXN(headline.total_value)} label={t('header.totalValue')} />
        <HeadlineStat value={formatNumber(headline.total_vendors)} label={t('header.vendors')} rawNumber={headline.total_vendors} />
        <HeadlineStat value={formatNumber(headline.total_institutions)} label={t('header.institutions')} rawNumber={headline.total_institutions} />
      </div>
    </header>
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
      value: '17.5%',
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
          ? `${risk.critical_pct.toFixed(1)}% · ${(178938).toLocaleString()} contracts · Immediate investigation`
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

  const nodes = [
    {
      icon: '🗄️',
      title: 'COMPRANET',
      sub: '3.1M contracts',
      detail: '2002–2025',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.1)',
      border: 'rgba(100,116,139,0.3)',
    },
    {
      icon: '📐',
      title: 'Z-SCORES',
      sub: '16 features',
      detail: 'per sector/year',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.3)',
    },
    {
      icon: '📊',
      title: 'MAHALANOBIS',
      sub: 'Multivariate',
      detail: 'anomaly distance',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.3)',
    },
    {
      icon: '🧠',
      title: 'LOGISTIC REG.',
      sub: '12 sub-models',
      detail: 'AUC 0.960',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.3)',
    },
    {
      icon: '🚨',
      title: 'RISK SCORE',
      sub: '0 → 1.0',
      detail: 'P(corrupt|x)',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.5)',
    },
  ]

  return (
    <div ref={ref} className="my-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono mb-4">
        Detection Pipeline — v5.0 Model Architecture
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
              <div className="text-2xl mb-1">{node.icon}</div>
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
          ✦ PU-learning correction c=0.887 (Elkan &amp; Noto 2008) · Bootstrap 95% CI per
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
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cx = 200
  const cy = 130
  // Triangle vertices
  const nodes = [
    {
      x: 200,
      y: 30,
      label: 'DIRECT AWARD',
      sub: '71% of contracts',
      color: '#fb923c',
      id: 'da',
    },
    {
      x: 70,
      y: 210,
      label: 'DECEMBER RUSH',
      sub: '1.33× spike',
      color: '#fbbf24',
      id: 'dr',
    },
    {
      x: 330,
      y: 210,
      label: 'CONCENTRATION',
      sub: '7.9% at risk',
      color: '#f87171',
      id: 'vc',
    },
  ]
  // Edges with labels
  const edges = [
    { from: 0, to: 1, label: 'no audit trail', labelPos: { x: 108, y: 128 } },
    {
      from: 1,
      to: 2,
      label: 'rushed spend → capture',
      labelPos: { x: 200, y: 235 },
    },
    {
      from: 2,
      to: 0,
      label: 'dominant vendors win direct',
      labelPos: { x: 298, y: 128 },
    },
  ]

  return (
    <div className="flex justify-center my-6">
      <svg
        ref={ref}
        viewBox="0 0 400 260"
        className="w-full max-w-md"
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
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 600ms ${i * 150 + 300}ms ease`,
                  animation: visible ? 'dashFlow 2s linear infinite' : 'none',
                }}
              />
              {/* Edge label */}
              <text
                x={edge.labelPos.x}
                y={edge.labelPos.y}
                textAnchor="middle"
                fontSize="7"
                fill="rgba(148,163,184,0.7)"
                fontFamily="monospace"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 400ms ${i * 150 + 600}ms ease`,
                }}
              >
                {edge.label}
              </text>
            </g>
          )
        })}

        {/* Center node */}
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={visible ? 28 : 0}
            fill="rgba(248,113,113,0.08)"
            stroke="rgba(248,113,113,0.3)"
            strokeWidth="1"
            style={{ transition: 'r 500ms 800ms cubic-bezier(0.16,1,0.3,1)' }}
          />
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="9"
            fill="#f87171"
            fontFamily="monospace"
            fontWeight="bold"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 400ms 900ms ease',
            }}
          >
            RISK
          </text>
          <text
            x={cx}
            y={cy + 7}
            textAnchor="middle"
            fontSize="9"
            fill="#f87171"
            fontFamily="monospace"
            fontWeight="bold"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 400ms 950ms ease',
            }}
          >
            AMPLIFIED
          </text>
        </g>

        {/* Outer nodes */}
        {nodes.map((node, i) => (
          <g key={node.id}>
            {/* Pulse ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={visible ? 34 : 0}
              fill="none"
              stroke={node.color}
              strokeWidth="0.5"
              opacity={0.2}
              style={{
                transition: `r 600ms ${i * 100 + 200}ms cubic-bezier(0.16,1,0.3,1)`,
              }}
            />
            {/* Main circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={visible ? 26 : 0}
              fill={`${node.color}15`}
              stroke={node.color}
              strokeWidth="1.5"
              style={{
                transition: `r 500ms ${i * 100 + 200}ms cubic-bezier(0.16,1,0.3,1)`,
              }}
            />
            {/* Label */}
            <text
              x={node.x}
              y={node.y - 4}
              textAnchor="middle"
              fontSize="7.5"
              fill={node.color}
              fontFamily="monospace"
              fontWeight="bold"
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 400ms ${i * 100 + 500}ms ease`,
              }}
            >
              {node.label}
            </text>
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              fontSize="7"
              fill="rgba(255,255,255,0.7)"
              fontFamily="monospace"
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 400ms ${i * 100 + 600}ms ease`,
              }}
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
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s1.riskDistLabel')}
        </p>
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
      stat: '7.9%',
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
    </section>
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
      <div className="space-y-2 mb-6">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-2">
          {t('s2.detectionLabel')}
        </p>
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
              {t('s2.nContracts', { count: formatNumber(c.contracts) })}
            </span>
          </div>
        ))}
      </div>

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
              <MiniStat label={t('s7.labels.value')} value={formatCompactMXN(admin.value)} />
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
    </section>
  )
}

// ============================================================================
// S8: How We Know — Model Transparency
// ============================================================================

function SectionModel({ data }: { data: ExecutiveSummaryResponse }) {
  const { t } = useTranslation('executive')
  const { model } = data
  const maxBeta = Math.max(...model.top_predictors.map((p) => Math.abs(p.beta)))

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

      <AIPipelineChart />

      {/* Metric badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <MetricBadge label="AUC-ROC" value={model.auc.toFixed(3)} description={t('s8.discriminationPower')} />
        <MetricBadge label="Brier Score" value={model.brier.toFixed(3)} description={t('s8.calibrationQuality')} />
        <MetricBadge label="Lift" value={`${model.lift}x`} description={t('s8.vsRandom')} />
      </div>

      {/* Coefficient chart */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-3">
          {t('s8.coeffLabel')}
        </p>
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

  return (
    <section>
      <SectionHeading number="11" title={t('s10.title')} icon={ArrowRight} />

      <p className="text-sm leading-relaxed text-text-secondary mb-6">
        {t('s10.p1')}
      </p>

      <div className="space-y-3">
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
        {' '}&middot; {t('footer.compranet')} &middot; Model v5.0 (AUC {data.model.auc})
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

function HeadlineStat({ value, label, rawNumber }: { value: string; label: string; rawNumber?: number }) {
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

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
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
