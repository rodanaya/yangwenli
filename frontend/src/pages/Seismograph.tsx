/**
 * CRONOLOGÍA DEL RIESGO — Risk timeline & sexenio comparison
 *
 * Sections:
 *   1. Sexenio comparison hero — horizontal bars for avg_risk,
 *      direct_award_pct, and high_risk_pct across administrations
 *   2. Key insight callouts (derived from real data)
 *   3. Annotated yearly timeline (trend context)
 *
 * Removed: calendar heatmap (no story), sector bump chart (12 tangled lines).
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, TrendingUp, ArrowUpRight, Info, Vote } from 'lucide-react'
import { motion } from 'framer-motion'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { formatCompactMXN } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEXENIOS = [
  { key: 'fox',       nameES: 'Fox',        nameEN: 'Fox',        party: 'PAN',    start: 2001, end: 2006 },
  { key: 'calderon',  nameES: 'Calderón',   nameEN: 'Calderón',   party: 'PAN',    start: 2007, end: 2012 },
  { key: 'pena',      nameES: 'Peña Nieto', nameEN: 'Peña Nieto', party: 'PRI',    start: 2013, end: 2018 },
  { key: 'amlo',      nameES: 'AMLO',       nameEN: 'AMLO',       party: 'Morena', start: 2019, end: 2024 },
  { key: 'sheinbaum', nameES: 'Sheinbaum',  nameEN: 'Sheinbaum',  party: 'Morena', start: 2025, end: 2030 },
]

const PARTY_COLORS: Record<string, string> = {
  PAN:    '#3b82f6',
  PRI:    '#16a34a',
  Morena: '#dc2626',
}

const ANNOTATION_EVENTS = [
  { year: 2017, es: 'La Estafa Maestra', en: 'La Estafa Maestra' },
  { year: 2020, es: 'Compras COVID',     en: 'COVID Procurement' },
  { year: 2021, es: 'Segalmex',          en: 'Segalmex Scandal'  },
]

type MetricKey = 'avgRisk' | 'highRiskPct' | 'directAwardPct'

// ---------------------------------------------------------------------------
// Election year constants
// ---------------------------------------------------------------------------

const ELECTION_YEARS = [2000, 2006, 2012, 2018, 2024]

// ---------------------------------------------------------------------------
// Derived type for sexenio aggregates
// ---------------------------------------------------------------------------

interface SexenioStats {
  key: string
  nameES: string
  nameEN: string
  party: string
  start: number
  end: number
  contracts: number
  totalValue: number
  avgRisk: number
  highRiskPct: number     // fraction 0–1
  directAwardPct: number  // fraction 0–1
}

// ---------------------------------------------------------------------------
// Sexenio horizontal bar chart
// ---------------------------------------------------------------------------

interface ComparisonChartProps {
  data: SexenioStats[]
  metric: MetricKey
  lang: string
}

function ComparisonBarChart({ data, metric, lang }: ComparisonChartProps) {
  const metaMap: Record<MetricKey, { labelES: string; labelEN: string; formatter: (v: number) => string }> = {
    avgRisk: {
      labelES: 'Riesgo Promedio',
      labelEN: 'Avg Risk Score',
      formatter: (v) => `${(v * 100).toFixed(1)}%`,
    },
    highRiskPct: {
      labelES: '% Contratos Alto Riesgo',
      labelEN: '% High-Risk Contracts',
      formatter: (v) => `${(v * 100).toFixed(1)}%`,
    },
    directAwardPct: {
      labelES: '% Adjudicaciones Directas',
      labelEN: '% Direct Awards',
      formatter: (v) => `${(v * 100).toFixed(0)}%`,
    },
  }
  const meta = metaMap[metric]

  const sorted = [...data].sort((a, b) => a.start - b.start)
  const names = sorted.map(d => lang === 'es' ? d.nameES : d.nameEN)
  const values = sorted.map(d => d[metric])
  const colors = sorted.map(d => PARTY_COLORS[d.party] ?? '#64748b')
  const maxVal = Math.max(...values)

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 90, right: 70, top: 10, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        const stat = sorted.find(d => (lang === 'es' ? d.nameES : d.nameEN) === p.name)
        const sub = stat ? `${stat.start}–${stat.end} · ${stat.party}` : ''
        return `<div style="min-width:160px">
          <div style="font-weight:700">${p.name}</div>
          <div style="color:#94a3b8;font-size:10px;margin-bottom:4px">${sub}</div>
          <div>${lang === 'es' ? meta.labelES : meta.labelEN}: <b>${meta.formatter(p.value)}</b></div>
        </div>`
      },
    },
    xAxis: {
      type: 'value',
      max: maxVal * 1.15,
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
        barMaxWidth: 32,
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => meta.formatter(p.value),
          color: '#e2e8f0',
          fontSize: 11,
          fontWeight: 'bold',
        },
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 200 }}
      theme="dark"
      notMerge
    />
  )
}

// ---------------------------------------------------------------------------
// Yearly timeline chart
// ---------------------------------------------------------------------------

function YearlyAreaChart({ data, lang }: { data: YearOverYearChange[]; lang: string }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.year - b.year).filter(d => d.year >= 2006),
    [data],
  )

  const markLines = ANNOTATION_EVENTS.map(ev => ({
    xAxis: ev.year,
    label: {
      formatter: lang === 'es' ? ev.es : ev.en,
      position: 'insideStartTop',
      color: '#f87171',
      fontSize: 10,
    },
    lineStyle: { color: '#f87171', type: 'dashed' as const, width: 1, opacity: 0.6 },
  }))

  const adminBands = SEXENIOS.slice(1).map((s, i) => [
    {
      xAxis: s.start,
      itemStyle: { color: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)' },
      label: {
        show: true,
        position: 'insideTopLeft',
        formatter: lang === 'es' ? s.nameES : s.nameEN,
        color: '#475569',
        fontSize: 10,
      },
    },
    { xAxis: Math.min(s.end, 2025) },
  ])

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: 20, top: 30, bottom: 50 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { axisValue: number }[]) => {
        const year = params[0]?.axisValue
        const d = sorted.find(r => r.year === year)
        if (!d) return ''
        return `<div style="min-width:180px">
          <div style="font-weight:600;margin-bottom:4px">${year}</div>
          <div>${lang === 'es' ? 'Riesgo prom.' : 'Avg risk'}: <b>${(d.avg_risk * 100).toFixed(1)}%</b></div>
          <div>${lang === 'es' ? 'Alto riesgo' : 'High risk'}: <b>${d.high_risk_pct.toFixed(1)}%</b></div>
          <div>${lang === 'es' ? 'Adj. directa' : 'Direct award'}: <b>${d.direct_award_pct.toFixed(1)}%</b></div>
          <div>${lang === 'es' ? 'Valor total' : 'Total value'}: <b>${formatCompactMXN(d.total_value)}</b></div>
        </div>`
      },
    },
    xAxis: {
      type: 'category',
      data: sorted.map(d => d.year),
      axisLabel: { color: '#94a3b8', interval: 2 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 0.5,
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: lang === 'es' ? '% Alto Riesgo' : '% High Risk',
        type: 'line',
        data: sorted.map(d => d.high_risk_pct / 100),
        smooth: true,
        lineStyle: { color: '#fb923c', width: 1.5 },
        areaStyle: { color: 'rgba(251,146,60,0.08)' },
        symbol: 'none',
      },
      {
        name: lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk',
        type: 'line',
        data: sorted.map(d => d.avg_risk),
        smooth: true,
        lineStyle: { color: '#f87171', width: 2.5 },
        areaStyle: { color: 'rgba(248,113,113,0.12)' },
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: { color: '#f87171' },
        markLine: { data: markLines, symbol: ['none', 'none'] },
        markArea: { data: adminBands, silent: true },
      },
      {
        name: lang === 'es' ? '% Adj. Directas' : '% Direct Awards',
        type: 'line',
        data: sorted.map(d => d.direct_award_pct / 100),
        smooth: true,
        lineStyle: { color: '#60a5fa', width: 1.5, type: 'dashed' as const },
        symbol: 'none',
      },
    ],
    legend: {
      bottom: 8,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 300 }}
      theme="dark"
      notMerge
    />
  )
}

// ---------------------------------------------------------------------------
// Animated BarRow — per-year risk bar
// ---------------------------------------------------------------------------

interface BarRowProps {
  year: number
  avgRisk: number
  highRiskPct: number
  index: number
  isElectionYear: boolean
}

function BarRow({ year, avgRisk, highRiskPct, index, isElectionYear }: BarRowProps) {
  const barColor = avgRisk >= 0.25
    ? avgRisk >= 0.40 ? '#f87171' : '#fb923c'
    : '#fbbf24'
  const widthPct = Math.min(avgRisk * 300, 100) // scale 0–0.33 → 0–100%

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={`flex items-center gap-3 py-1 px-2 rounded-lg ${isElectionYear ? 'bg-blue-950/30 border border-blue-800/30' : ''}`}
    >
      <span className={`text-xs w-10 shrink-0 font-mono ${isElectionYear ? 'text-blue-300 font-bold' : 'text-slate-400'}`}>
        {year}
        {isElectionYear && <span className="ml-0.5 text-blue-400" aria-label="election year">*</span>}
      </span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ delay: index * 0.04 + 0.1, duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12 text-right font-mono shrink-0">
        {(avgRisk * 100).toFixed(1)}%
      </span>
      <span className="text-xs text-slate-500 w-14 text-right font-mono shrink-0 hidden sm:block">
        {highRiskPct.toFixed(1)}% hi
      </span>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Seismograph() {
  const { t, i18n } = useTranslation('seismograph')
  const lang = i18n.language

  const [metric, setMetric] = useState<MetricKey>('avgRisk')
  const [showElectionMarkers, setShowElectionMarkers] = useState(false)

  const { data: yoyData, isLoading, isError } = useQuery({
    queryKey: ['year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  const years: YearOverYearChange[] = yoyData?.data ?? []

  // Aggregate yearly data into sexenio buckets (weighted by contract count)
  const sexenioStats = useMemo<SexenioStats[]>(() => {
    return SEXENIOS.flatMap(s => {
      const inPeriod = years.filter(d => d.year >= s.start && d.year <= s.end)
      if (inPeriod.length === 0) return []
      const totalContracts = inPeriod.reduce((sum, d) => sum + d.contracts, 0)
      const totalValue = inPeriod.reduce((sum, d) => sum + d.total_value, 0)
      const avgRisk = inPeriod.reduce((sum, d) => sum + d.avg_risk * d.contracts, 0) / totalContracts
      // API returns high_risk_pct and direct_award_pct as percentages (0–100); normalize to 0–1 for display consistency
      const highRiskPct = inPeriod.reduce((sum, d) => sum + d.high_risk_pct * d.contracts, 0) / totalContracts / 100
      const directAwardPct = inPeriod.reduce((sum, d) => sum + d.direct_award_pct * d.contracts, 0) / totalContracts / 100
      return [{ ...s, contracts: totalContracts, totalValue, avgRisk, highRiskPct, directAwardPct }]
    })
  }, [years])

  const amlo = sexenioStats.find(s => s.key === 'amlo')
  const calderon = sexenioStats.find(s => s.key === 'calderon')
  const fox = sexenioStats.find(s => s.key === 'fox')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">{t('loading')}</div>
      </div>
    )
  }

  if (isError || years.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-400">
        <AlertTriangle size={20} />
        <span>{t('error')}</span>
      </div>
    )
  }

  const metricLabels: Record<MetricKey, string> = {
    avgRisk:        t('sexenio.metricAvgRisk'),
    highRiskPct:    t('sexenio.metricHighRisk'),
    directAwardPct: t('sexenio.metricDirectAward'),
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-screen-xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs tracking-widest text-slate-500 uppercase mb-1">{t('eyebrow')}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          {t('title')}
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl">
          {t('subtitle')}
        </p>
      </div>

      {/* ── Hero: Sexenio comparison ──────────────────────────────────────── */}
      <section aria-labelledby="sexenio-heading">
        <h2 id="sexenio-heading" className="text-lg font-semibold text-white mb-1">
          {t('sexenio.heading')}
        </h2>
        <p className="text-xs text-slate-400 mb-4 max-w-xl">
          {t('sexenio.description')}
        </p>

        {/* Metric selector */}
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t('sexenio.metricAriaLabel')}>
          {(Object.keys(metricLabels) as MetricKey[]).map(key => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                metric === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
              }`}
            >
              {metricLabels[key]}
            </button>
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          {sexenioStats.length > 0 && (
            <ComparisonBarChart data={sexenioStats} metric={metric} lang={lang} />
          )}
        </div>

        {/* Party legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {Object.entries(PARTY_COLORS).map(([party, color]) => (
            <div key={party} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-400">{party}</span>
            </div>
          ))}
          <span className="text-xs text-slate-500 ml-auto">{t('sexenio.dataSource')}</span>
        </div>
      </section>

      {/* ── Animated AMLO-era metric row ─────────────────────────────────── */}
      {amlo && (
        <section aria-label="AMLO era key metrics">
          <h2 className="text-base font-semibold text-slate-300 mb-3">
            {lang === 'es' ? 'Métricas — Era AMLO (2019–2024)' : 'Metrics — AMLO Era (2019–2024)'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: lang === 'es' ? 'Adj. Directas' : 'Direct Award %',
                value: `${(amlo.directAwardPct * 100).toFixed(0)}%`,
                level: amlo.directAwardPct > 0.6 ? 'high' : amlo.directAwardPct > 0.4 ? 'medium' : 'low',
                barPct: Math.min(amlo.directAwardPct * 100, 100),
                color: '#60a5fa',
              },
              {
                label: lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk Score',
                value: `${(amlo.avgRisk * 100).toFixed(1)}%`,
                level: amlo.avgRisk >= 0.25 ? 'high' : 'medium',
                barPct: Math.min(amlo.avgRisk * 400, 100),
                color: '#f87171',
              },
              {
                label: lang === 'es' ? '% Alto Riesgo' : 'High Risk %',
                value: `${(amlo.highRiskPct * 100).toFixed(1)}%`,
                level: amlo.highRiskPct > 0.15 ? 'high' : 'medium',
                barPct: Math.min(amlo.highRiskPct * 400, 100),
                color: '#fb923c',
              },
              {
                label: lang === 'es' ? 'Contratos' : 'Contracts',
                value: amlo.contracts.toLocaleString('es-MX'),
                level: 'neutral',
                barPct: 65,
                color: '#a78bfa',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-2"
              >
                <p className="text-xs text-slate-400 leading-snug">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.barPct}%` }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Key insight callouts ─────────────────────────────────────────── */}
      {amlo && calderon && fox && (
        <section aria-label={t('insights.ariaLabel')}>
          <h2 className="text-base font-semibold text-slate-300 mb-3">{t('insights.heading')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Callout 1 — AMLO direct award rate vs Calderón */}
            <div className="bg-slate-900/60 border border-red-900/40 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <ArrowUpRight size={15} className="text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">
                  {t('insight.directAward.label')}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {(amlo.directAwardPct * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('insight.directAward.body', {
                  amloRate:     (amlo.directAwardPct * 100).toFixed(0),
                  calderonRate: (calderon.directAwardPct * 100).toFixed(0),
                })}
              </p>
            </div>

            {/* Callout 2 — avg risk jump Calderón → AMLO */}
            <div className="bg-slate-900/60 border border-orange-900/40 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <TrendingUp size={15} className="text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide">
                  {t('insight.riskIncrease.label')}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                +{((amlo.avgRisk - calderon.avgRisk) * 100).toFixed(1)}pp
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('insight.riskIncrease.body', {
                  calderonRisk: (calderon.avgRisk * 100).toFixed(1),
                  amloRisk:     (amlo.avgRisk * 100).toFixed(1),
                })}
              </p>
            </div>

            {/* Callout 3 — AMLO high-risk contract share vs Fox */}
            <div className="bg-slate-900/60 border border-yellow-900/40 rounded-xl p-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <Info size={15} className="text-yellow-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">
                  {t('insight.highRisk.label')}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {(amlo.highRiskPct * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('insight.highRisk.body', {
                  amloHighRisk: (amlo.highRiskPct * 100).toFixed(1),
                  foxHighRisk:  (fox.highRiskPct * 100).toFixed(1),
                })}
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ── Yearly timeline ───────────────────────────────────────────────── */}
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="text-lg font-semibold text-white mb-1">
          {t('timeline.heading')}
        </h2>
        <p className="text-xs text-slate-400 mb-4 max-w-xl">
          {t('timeline.description')}
        </p>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <YearlyAreaChart data={years} lang={lang} />
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('timeline.footnote')}
        </p>

        {/* Election year toggle */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setShowElectionMarkers(prev => !prev)}
            aria-pressed={showElectionMarkers}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border transition-colors ${
              showElectionMarkers
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
            }`}
          >
            <Vote size={12} aria-hidden="true" />
            {lang === 'es' ? 'Mostrar años electorales' : 'Show Election Years'}
          </button>
          {showElectionMarkers && (
            <span className="text-xs text-slate-500">
              {lang === 'es'
                ? `Elecciones presidenciales: ${ELECTION_YEARS.join(', ')}`
                : `Presidential elections: ${ELECTION_YEARS.join(', ')}`}
            </span>
          )}
        </div>

        {/* Election year stats table */}
        {showElectionMarkers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 bg-slate-900/60 border border-blue-900/30 rounded-xl p-4 overflow-hidden"
          >
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Vote size={11} aria-hidden="true" />
              {lang === 'es' ? 'Riesgo en años electorales' : 'Risk in Election Years'}
            </p>
            <div className="space-y-1">
              {ELECTION_YEARS.map((elYear, i) => {
                const row = years.find(d => d.year === elYear)
                if (!row) return (
                  <div key={elYear} className="flex items-center gap-3 py-1 px-2 text-xs text-slate-500">
                    <span className="font-mono w-10">{elYear}</span>
                    <span>{lang === 'es' ? 'Sin datos' : 'No data'}</span>
                  </div>
                )
                const riskColor = row.avg_risk >= 0.25 ? '#f87171' : row.avg_risk >= 0.15 ? '#fb923c' : '#fbbf24'
                return (
                  <motion.div
                    key={elYear}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="grid grid-cols-4 gap-2 items-center py-1.5 px-2 rounded-lg bg-slate-800/40"
                  >
                    <span className="text-xs font-mono font-bold text-blue-300">{elYear}</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(row.avg_risk * 400, 100)}%` }}
                          transition={{ delay: i * 0.06 + 0.1, duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: riskColor }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300 w-10 shrink-0">
                        {(row.avg_risk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 text-right font-mono">
                      {row.high_risk_pct.toFixed(1)}%{' '}
                      <span className="text-slate-600">{lang === 'es' ? 'alto' : 'hi'}</span>
                    </span>
                  </motion.div>
                )
              })}
            </div>
            <p className="text-xs text-slate-600 mt-3">
              * {lang === 'es'
                ? 'Elecciones presidenciales — julio del año indicado'
                : 'Presidential election years — held in July'}
            </p>
          </motion.div>
        )}

        {/* Animated per-year BarRows */}
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
            <TrendingUp size={11} aria-hidden="true" />
            {lang === 'es' ? 'Riesgo promedio por año' : 'Average risk by year'}
            {showElectionMarkers && (
              <span className="ml-2 text-blue-400">* = {lang === 'es' ? 'año electoral' : 'election year'}</span>
            )}
          </p>
          <div className="space-y-0.5">
            {[...years]
              .filter(d => d.year >= 2006)
              .sort((a, b) => a.year - b.year)
              .map((d, i) => (
                <BarRow
                  key={d.year}
                  year={d.year}
                  avgRisk={d.avg_risk}
                  highRiskPct={d.high_risk_pct}
                  index={i}
                  isElectionYear={showElectionMarkers && ELECTION_YEARS.includes(d.year)}
                />
              ))}
          </div>
        </div>
      </section>

    </div>
  )
}
