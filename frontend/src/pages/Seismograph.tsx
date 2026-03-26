/**
 * CRONOLOGÍA DEL RIESGO — Risk timeline 2000-2025
 *
 * Replaces the oscilloscope metaphor with:
 *   1. Annotated area chart: yearly avg_risk + high_risk_pct bands
 *   2. GitHub-style calendar heatmap (monthly, last 10 years) — reuses RiskCalendarHeatmap
 *   3. Bump/rank chart: sector risk rankings over sexenios
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, Calendar, TrendingUp, Award } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RiskCalendarHeatmap } from '@/components/charts/RiskCalendarHeatmap'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEXENIOS = [
  { name: 'Fox', start: 2001, end: 2006 },
  { name: 'Calderón', start: 2007, end: 2012 },
  { name: 'Peña Nieto', start: 2013, end: 2018 },
  { name: 'AMLO', start: 2019, end: 2024 },
  { name: 'Sheinbaum', start: 2025, end: 2030 },
]

const ANNOTATION_EVENTS = [
  { year: 2017, es: 'La Estafa Maestra', en: 'La Estafa Maestra' },
  { year: 2020, es: 'Compras COVID', en: 'COVID Procurement' },
  { year: 2021, es: 'Escándalo Segalmex', en: 'Segalmex Scandal' },
]

function getRiskColor(risk: number): string {
  if (risk >= 0.60) return '#f87171'
  if (risk >= 0.40) return '#fb923c'
  if (risk >= 0.25) return '#fbbf24'
  return '#4ade80'
}

// ---------------------------------------------------------------------------
// Yearly area chart
// ---------------------------------------------------------------------------

interface YearlyChartProps {
  data: YearOverYearChange[]
  lang: string
}

function YearlyAreaChart({ data, lang }: YearlyChartProps) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data])

  const markLines = ANNOTATION_EVENTS.map(ev => ({
    xAxis: ev.year,
    label: {
      formatter: lang === 'es' ? ev.es : ev.en,
      position: 'insideStartTop',
      color: '#f87171',
      fontSize: 10,
    },
    lineStyle: { color: '#f87171', type: 'dashed', width: 1, opacity: 0.6 },
  }))

  const sexenioMarkAreas = SEXENIOS.filter(s => s.start >= 2001 && s.end <= 2026).map((s, i) => [
    {
      xAxis: s.start,
      itemStyle: { color: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)' },
      label: { show: true, position: 'insideTopLeft', formatter: s.name, color: '#64748b', fontSize: 10 },
    },
    { xAxis: s.end },
  ])

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: 20, top: 30, bottom: 50 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { axisValue: number; value: number; seriesName: string }[]) => {
        const year = params[0]?.axisValue
        const d = sorted.find(r => r.year === year)
        if (!d) return ''
        return `
          <div style="min-width:180px">
            <div style="font-weight:600;margin-bottom:4px">${year}</div>
            <div>${lang === 'es' ? 'Contratos' : 'Contracts'}: <b>${formatNumber(d.contracts)}</b></div>
            <div>${lang === 'es' ? 'Valor' : 'Value'}: <b>${formatCompactMXN(d.total_value)}</b></div>
            <div>${lang === 'es' ? 'Riesgo prom.' : 'Avg risk'}: <b>${(d.avg_risk * 100).toFixed(1)}%</b></div>
            <div>${lang === 'es' ? 'Alto riesgo' : 'High risk'}: <b>${(d.high_risk_pct * 100).toFixed(1)}%</b></div>
            <div>${lang === 'es' ? 'Adj. directa' : 'Direct award'}: <b>${(d.direct_award_pct * 100).toFixed(1)}%</b></div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'category',
      data: sorted.map(d => d.year),
      axisLabel: { color: '#94a3b8', interval: 1 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: [
      {
        type: 'value',
        name: lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
        max: 0.8,
        axisLabel: { color: '#94a3b8', formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      {
        type: 'value',
        name: lang === 'es' ? 'Valor Total' : 'Total Value',
        nameLocation: 'middle',
        nameGap: 55,
        axisLabel: {
          color: '#64748b',
          formatter: (v: number) => v >= 1e12 ? `${(v / 1e12).toFixed(1)}T`
            : v >= 1e9 ? `${(v / 1e9).toFixed(0)}B`
            : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v),
        },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: lang === 'es' ? 'Valor Total' : 'Total Value',
        type: 'bar',
        yAxisIndex: 1,
        data: sorted.map(d => d.total_value),
        itemStyle: { color: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', borderWidth: 1 },
        emphasis: { itemStyle: { color: 'rgba(59,130,246,0.3)' } },
      },
      {
        name: lang === 'es' ? '% Alto Riesgo' : '% High Risk',
        type: 'line',
        yAxisIndex: 0,
        data: sorted.map(d => d.high_risk_pct),
        smooth: true,
        lineStyle: { color: '#fb923c', width: 1.5 },
        areaStyle: { color: 'rgba(251,146,60,0.08)' },
        symbol: 'none',
        emphasis: { lineStyle: { width: 2.5 } },
      },
      {
        name: lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk',
        type: 'line',
        yAxisIndex: 0,
        data: sorted.map(d => d.avg_risk),
        smooth: true,
        lineStyle: { color: '#f87171', width: 2.5 },
        areaStyle: { color: 'rgba(248,113,113,0.12)' },
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: { color: '#f87171' },
        markLine: {
          data: markLines,
          symbol: ['none', 'none'],
        },
        markArea: { data: sexenioMarkAreas, silent: true },
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
      style={{ height: 340 }}
      theme="dark"
      notMerge
    />
  )
}

// ---------------------------------------------------------------------------
// Sector bump chart — rank by avg_risk per sexenio
// ---------------------------------------------------------------------------

interface BumpChartProps {
  sectorYearData: { year: number; sector_id: number; avg_risk: number }[]
  lang: string
}

function SectorBumpChart({ sectorYearData, lang }: BumpChartProps) {
  // Average risk per sector per sexenio
  const sexenioRanks = useMemo(() => {
    const periods = SEXENIOS.slice(1) // skip Fox (too old / poor data)
    return periods.map(s => {
      const inPeriod = sectorYearData.filter(d => d.year >= s.start && d.year <= s.end)
      const bySector = new Map<number, number[]>()
      for (const d of inPeriod) {
        if (!bySector.has(d.sector_id)) bySector.set(d.sector_id, [])
        bySector.get(d.sector_id)!.push(d.avg_risk)
      }
      const avgs = Array.from(bySector.entries())
        .map(([id, risks]) => ({ id, avg: risks.reduce((a, b) => a + b, 0) / risks.length }))
        .sort((a, b) => b.avg - a.avg)

      const ranks: Record<number, number> = {}
      avgs.forEach((item, i) => { ranks[item.id] = i + 1 })
      return { period: s.name, ranks, avgs }
    })
  }, [sectorYearData])

  const sectorIds = useMemo(() => {
    const ids = new Set(sectorYearData.map(d => d.sector_id))
    return Array.from(ids).sort((a, b) => a - b)
  }, [sectorYearData])

  const periods = sexenioRanks.map(s => s.period)

  const series = sectorIds.map(id => {
    const sectorInfo = SECTORS.find(s => s.id === id)
    const color = SECTOR_COLORS[sectorInfo?.code ?? 'otros'] ?? '#64748b'
    const name = lang === 'es' ? (sectorInfo?.name ?? `Sector ${id}`) : (sectorInfo?.nameEN ?? `Sector ${id}`)

    return {
      name,
      type: 'line',
      data: sexenioRanks.map(s => s.ranks[id] ?? null),
      smooth: false,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      symbol: 'circle',
      symbolSize: 8,
      label: {
        show: true,
        position: 'right',
        formatter: name.substring(0, 6),
        color,
        fontSize: 9,
      },
    }
  })

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 90, top: 20, bottom: 50 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      name: lang === 'es' ? 'Rango (1=más riesgo)' : 'Rank (1=highest risk)',
      nameLocation: 'middle',
      nameGap: 28,
      inverse: true,
      min: 1,
      max: 12,
      axisLabel: { color: '#94a3b8', formatter: (v: number) => `#${v}` },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    legend: { show: false },
    series,
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 320 }}
      theme="dark"
      notMerge
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Seismograph() {
  const { t, i18n } = useTranslation('seismograph')
  const lang = i18n.language

  const [activeTab, setActiveTab] = useState<'timeline' | 'calendar' | 'ranks'>('timeline')

  const { data: yoyData, isLoading, isError } = useQuery({
    queryKey: ['year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorBreakdown } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const years: YearOverYearChange[] = yoyData?.data ?? []
  const sectorItems = sectorBreakdown?.data ?? []

  // Top KPIs from most recent complete year
  const lastYear = useMemo(() => {
    const sorted = [...years].sort((a, b) => b.year - a.year)
    return sorted.find(d => d.year <= 2025) ?? sorted[0]
  }, [years])

  const peakRiskYear = useMemo(() => {
    return years.reduce((best, d) => (!best || d.avg_risk > best.avg_risk) ? d : best, null as YearOverYearChange | null)
  }, [years])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">
          {lang === 'es' ? 'Cargando cronología…' : 'Loading timeline…'}
        </div>
      </div>
    )
  }

  if (isError || years.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-400">
        <AlertTriangle size={20} />
        <span>{lang === 'es' ? 'Error cargando datos' : 'Error loading data'}</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs tracking-widest text-slate-500 uppercase mb-1">{t('eyebrow')}</p>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'es' ? 'Cronología del Riesgo' : 'Risk Timeline'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {lang === 'es'
            ? 'Evolución del riesgo de corrupción en la contratación pública 2000–2025'
            : 'Corruption risk evolution in public procurement 2000–2025'}
        </p>
      </div>

      {/* KPI strip */}
      {lastYear && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: lang === 'es' ? `Contratos ${lastYear.year}` : `Contracts ${lastYear.year}`,
              value: formatNumber(lastYear.contracts),
            },
            {
              label: lang === 'es' ? 'Valor Contratado' : 'Contracted Value',
              value: formatCompactMXN(lastYear.total_value),
            },
            {
              label: lang === 'es' ? 'Riesgo Promedio' : 'Avg Risk',
              value: (lastYear.avg_risk * 100).toFixed(1) + '%',
              color: getRiskColor(lastYear.avg_risk),
            },
            {
              label: lang === 'es' ? `Año Pico (${peakRiskYear?.year})` : `Peak Year (${peakRiskYear?.year})`,
              value: peakRiskYear ? (peakRiskYear.avg_risk * 100).toFixed(1) + '%' : '—',
              color: '#f87171',
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: kpi.color ?? '#f1f5f9' }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {([
          ['timeline', TrendingUp, lang === 'es' ? 'Línea de tiempo' : 'Timeline'],
          ['calendar', Calendar, lang === 'es' ? 'Mapa mensual' : 'Monthly map'],
          ['ranks', Award, lang === 'es' ? 'Rangos por sexenio' : 'Sexenio ranks'],
        ] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-3">
            {lang === 'es'
              ? 'Riesgo promedio anual (línea roja) y % alto riesgo (naranja). Barras azules = valor total contratado. Líneas punteadas = eventos relevantes.'
              : 'Annual avg risk (red line) and % high risk (orange). Blue bars = total contracted value. Dashed lines = key events.'}
          </p>
          <YearlyAreaChart data={years} lang={lang} />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-4">
            {lang === 'es'
              ? 'Riesgo promedio mensual (2016–2025). Verde = bajo riesgo, rojo = alto riesgo. Los picos de diciembre revelan el "dump" de fin de año.'
              : 'Monthly avg risk (2016–2025). Green = low risk, red = high risk. December spikes reveal year-end budget dumps.'}
          </p>
          <RiskCalendarHeatmap />
        </div>
      )}

      {activeTab === 'ranks' && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-3">
            {lang === 'es'
              ? 'Ranking de sectores por riesgo promedio en cada sexenio. #1 = mayor riesgo. Líneas que suben = sectores que mejoran.'
              : 'Sector risk rank by presidential term. #1 = highest risk. Rising lines = improving sectors.'}
          </p>
          <SectorBumpChart sectorYearData={sectorItems} lang={lang} />
        </div>
      )}
    </div>
  )
}
