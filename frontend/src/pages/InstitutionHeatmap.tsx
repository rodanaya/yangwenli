/**
 * ATLAS DE CAPTURA — Institutional Capture Intelligence
 * Route: /heatmap
 *
 * Replaces the sparse 20×12 risk matrix with:
 *   1. Sankey diagram: institution → vendor money flows (reuses MoneySankeyChart)
 *   2. HHI ranked bar chart: vendor concentration by institution
 *   3. Summary stats: top captured institutions
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, Building2, GitBranch, BarChart3 } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'
import type { InstitutionHealthItem } from '@/api/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortName(name: string): string {
  const n = toTitleCase(name)
  return n.length > 40 ? n.slice(0, 38) + '…' : n
}

function hhiLabel(hhi: number): { label: string; color: string } {
  if (hhi > 0.25) return { label: 'Alta captura', color: '#f87171' }
  if (hhi > 0.15) return { label: 'Moderada', color: '#fb923c' }
  if (hhi > 0.10) return { label: 'Baja', color: '#fbbf24' }
  return { label: 'Competitiva', color: '#4ade80' }
}

// ---------------------------------------------------------------------------
// HHI bar chart
// ---------------------------------------------------------------------------

interface HHIChartProps {
  institutions: InstitutionHealthItem[]
  lang: string
  onSelect: (id: number) => void
}

function HHIChart({ institutions, lang, onSelect }: HHIChartProps) {
  const top30 = [...institutions]
    .sort((a, b) => b.hhi - a.hhi)
    .slice(0, 30)

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 220, right: 20, top: 10, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const d = top30.find(i => shortName(i.institution_name) === params[0]?.name)
        if (!d) return ''
        return `
          <div style="min-width:200px">
            <div style="font-weight:600;margin-bottom:4px">${shortName(d.institution_name)}</div>
            <div>HHI: <b>${d.hhi.toFixed(3)}</b></div>
            <div>${lang === 'es' ? 'Top vendor share' : 'Top vendor share'}: <b>${(d.top_vendor_share * 100).toFixed(1)}%</b></div>
            <div>${lang === 'es' ? 'Adj. directa' : 'Direct award'}: <b>${(d.direct_award_pct * 100).toFixed(1)}%</b></div>
            <div>${lang === 'es' ? 'Contratos' : 'Contracts'}: <b>${formatNumber(d.total_contracts)}</b></div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'value',
      name: 'HHI',
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: { color: '#94a3b8', formatter: (v: number) => v.toFixed(2) },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      // Reference lines for HHI thresholds
    },
    yAxis: {
      type: 'category',
      data: top30.map(d => shortName(d.institution_name)).reverse(),
      axisLabel: { color: '#cbd5e1', fontSize: 10.5, width: 200, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        type: 'bar',
        data: [...top30].reverse().map(d => ({
          value: d.hhi,
          itemStyle: {
            color: d.hhi > 0.25 ? '#f87171'
              : d.hhi > 0.15 ? '#fb923c'
              : d.hhi > 0.10 ? '#fbbf24'
              : '#4ade80',
            borderRadius: [0, 4, 4, 0],
          },
          name: shortName(d.institution_name),
        })),
        markLine: {
          data: [
            { xAxis: 0.25, lineStyle: { color: '#f87171', type: 'dashed', width: 1 }, label: { formatter: lang === 'es' ? 'Alta captura' : 'High capture', color: '#f87171', fontSize: 10 } },
            { xAxis: 0.15, lineStyle: { color: '#fb923c', type: 'dashed', width: 1 }, label: { formatter: lang === 'es' ? 'Moderada' : 'Moderate', color: '#fb923c', fontSize: 10 } },
          ],
          symbol: ['none', 'none'],
        },
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: Math.max(400, top30.length * 22 + 60) }}
      theme="dark"
      notMerge
      onEvents={{
        click: (params: { name: string }) => {
          const inst = top30.find(i => shortName(i.institution_name) === params.name)
          if (inst) onSelect(inst.institution_id)
        },
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstitutionHeatmap() {
  const navigate = useNavigate()
  const { i18n } = useTranslation('institutions')
  const lang = i18n.language

  const [activeTab, setActiveTab] = useState<'sankey' | 'hhi'>('sankey')
  const [sankeyYear, setSankeyYear] = useState<number | undefined>(undefined)
  const [sankeySector, setSankeySector] = useState<number | undefined>(undefined)

  const { data: flowData, isLoading: loadingFlow, isError: errorFlow } = useQuery({
    queryKey: ['money-flow', sankeyYear, sankeySector],
    queryFn: () => analysisApi.getMoneyFlow(sankeyYear, sankeySector),
    staleTime: 10 * 60 * 1000,
  })

  const { data: rankingsData, isLoading: loadingRankings, isError: errorRankings } = useQuery({
    queryKey: ['institution-rankings-capture'],
    queryFn: () => analysisApi.getInstitutionRankings('risk', 50, 80),
    staleTime: 10 * 60 * 1000,
  })

  const flows = flowData?.flows ?? []
  const institutions: InstitutionHealthItem[] = rankingsData?.data ?? []

  // Summary stats
  const highCaptureCount = useMemo(
    () => institutions.filter(i => i.hhi > 0.25).length,
    [institutions]
  )
  const avgHHI = useMemo(
    () => institutions.length ? institutions.reduce((s, i) => s + i.hhi, 0) / institutions.length : 0,
    [institutions]
  )
  const totalValue = flowData?.total_value ?? 0

  const isLoading = loadingFlow || loadingRankings
  const hasError = errorFlow || errorRankings

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">
          {lang === 'es' ? 'Cargando atlas de captura…' : 'Loading capture atlas…'}
        </div>
      </div>
    )
  }

  if (hasError) {
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
        <p className="text-xs tracking-widest text-slate-500 uppercase mb-1">
          {lang === 'es' ? 'INTELIGENCIA INSTITUCIONAL · CAPTURA Y CONCENTRACIÓN' : 'INSTITUTIONAL INTELLIGENCE · CAPTURE & CONCENTRATION'}
        </p>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'es' ? 'Atlas de Captura' : 'Capture Atlas'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {lang === 'es'
            ? 'Flujos de dinero institución → proveedor y concentración de mercado (HHI) por institución'
            : 'Institution → vendor money flows and market concentration (HHI) by institution'}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: lang === 'es' ? 'Valor Flujos' : 'Flow Value',
            value: formatCompactMXN(totalValue),
          },
          {
            label: lang === 'es' ? 'Alta Captura (HHI>0.25)' : 'High Capture (HHI>0.25)',
            value: `${highCaptureCount} ${lang === 'es' ? 'inst.' : 'inst.'}`,
            color: highCaptureCount > 0 ? '#f87171' : '#4ade80',
          },
          {
            label: lang === 'es' ? 'HHI Promedio' : 'Avg HHI',
            value: avgHHI.toFixed(3),
            color: avgHHI > 0.25 ? '#f87171' : avgHHI > 0.15 ? '#fb923c' : '#fbbf24',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: kpi.color ?? '#f1f5f9' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {([
          ['sankey', GitBranch, lang === 'es' ? 'Flujos de Dinero' : 'Money Flows'],
          ['hhi', BarChart3, lang === 'es' ? 'Concentración HHI' : 'HHI Concentration'],
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

      {/* Sankey tab */}
      {activeTab === 'sankey' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{lang === 'es' ? 'Año' : 'Year'}:</span>
              <select
                value={sankeyYear ?? ''}
                onChange={e => setSankeyYear(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
              >
                <option value="">{lang === 'es' ? 'Todos' : 'All'}</option>
                {Array.from({length: 26}, (_, i) => 2025 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{lang === 'es' ? 'Sector' : 'Sector'}:</span>
              <select
                value={sankeySector ?? ''}
                onChange={e => setSankeySector(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
              >
                <option value="">{lang === 'es' ? 'Todos' : 'All'}</option>
                {SECTORS.map(s => (
                  <option key={s.id} value={s.id}>{lang === 'es' ? s.name : s.nameEN}</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500">
              {flows.length} {lang === 'es' ? 'flujos' : 'flows'} · {formatCompactMXN(totalValue)}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3">
              {lang === 'es'
                ? 'Nodos izquierda = instituciones. Nodos derecha = proveedores. Ancho del enlace = valor contratado. Color = nivel de riesgo.'
                : 'Left nodes = institutions. Right nodes = vendors. Link width = contract value. Color = risk level.'}
            </p>
            {flows.length > 0 ? (
              <MoneySankeyChart flows={flows} height={560} />
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                {lang === 'es' ? 'Sin flujos para este filtro' : 'No flows for this filter'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HHI tab */}
      {activeTab === 'hhi' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-4 text-xs">
                {[
                  { color: '#f87171', label: lang === 'es' ? 'Alta captura (>0.25)' : 'High capture (>0.25)' },
                  { color: '#fb923c', label: lang === 'es' ? 'Moderada (0.15-0.25)' : 'Moderate (0.15-0.25)' },
                  { color: '#fbbf24', label: lang === 'es' ? 'Baja (0.10-0.15)' : 'Low (0.10-0.15)' },
                  { color: '#4ade80', label: lang === 'es' ? 'Competitiva (<0.10)' : 'Competitive (<0.10)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {lang === 'es'
                ? 'HHI (Índice Herfindahl-Hirschman) mide concentración de proveedores. HHI>0.25 indica un solo proveedor domina. Haz clic para ver institución.'
                : 'HHI (Herfindahl-Hirschman Index) measures vendor concentration. HHI>0.25 indicates a single vendor dominates. Click to view institution.'}
            </p>
            {institutions.length > 0 ? (
              <HHIChart
                institutions={institutions}
                lang={lang}
                onSelect={id => navigate(`/institutions/${id}`)}
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                {lang === 'es' ? 'Sin datos de instituciones' : 'No institution data'}
              </div>
            )}
          </div>

          {/* Top captured institutions table */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
              <Building2 size={15} className="text-red-400" />
              <span className="text-sm font-semibold text-white">
                {lang === 'es' ? 'Instituciones con Alta Captura' : 'High-Capture Institutions'}
              </span>
              <span className="text-xs text-slate-500">({highCaptureCount})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="px-3 py-2 text-left">{lang === 'es' ? 'Institución' : 'Institution'}</th>
                    <th className="px-3 py-2 text-right">HHI</th>
                    <th className="px-3 py-2 text-right">{lang === 'es' ? 'Top proveedor' : 'Top vendor'}</th>
                    <th className="px-3 py-2 text-right">{lang === 'es' ? 'Adj. Directa' : 'Direct Award'}</th>
                    <th className="px-3 py-2 text-right">{lang === 'es' ? 'Valor Total' : 'Total Value'}</th>
                    <th className="px-3 py-2 text-right">{lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk'}</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions
                    .filter(i => i.hhi > 0.25)
                    .sort((a, b) => b.hhi - a.hhi)
                    .slice(0, 20)
                    .map(inst => {
                      const { color } = hhiLabel(inst.hhi)
                      return (
                        <tr
                          key={inst.institution_id}
                          onClick={() => navigate(`/institutions/${inst.institution_id}`)}
                          className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2 text-white">{shortName(inst.institution_name)}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color }}>{inst.hhi.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{(inst.top_vendor_share * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-slate-300">{(inst.direct_award_pct * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-slate-300">{formatCompactMXN(inst.total_value)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{(inst.avg_risk_score * 100).toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
