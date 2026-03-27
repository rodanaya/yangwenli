/**
 * RADAR DE SECTORES — Sector-Year Risk Intelligence
 *
 * Replaces the astronomy metaphor with a practical scatter plot:
 *   X = year (2000-2025), Y = avg_risk, bubble size = total_value, color = sector
 * Plus a sortable ranked table of all 288 sector-year data points.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { SectorYearItem } from '@/api/types'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = 'year' | 'sector' | 'contracts' | 'total_value' | 'avg_risk' | 'high_risk_pct' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'
type YMetric = 'avg_risk' | 'high_risk_pct' | 'direct_award_pct'

const SECTOR_ID_TO_KEY: Record<number, string> = {
  1: 'salud', 2: 'educacion', 3: 'infraestructura', 4: 'energia',
  5: 'defensa', 6: 'tecnologia', 7: 'hacienda', 8: 'gobernacion',
  9: 'agricultura', 10: 'ambiente', 11: 'trabajo', 12: 'otros',
}

// Max bubble area in px² — scales down so bubbles don't overlap too much
const MAX_BUBBLE_AREA = 3600

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSectorName(sectorId: number): string {
  const entry = SECTORS.find(s => s.id === sectorId)
  return entry ? entry.name : SECTOR_ID_TO_KEY[sectorId] ?? `Sector ${sectorId}`
}

function getRiskColor(risk: number): string {
  if (risk >= 0.60) return '#f87171'
  if (risk >= 0.40) return '#fb923c'
  if (risk >= 0.25) return '#fbbf24'
  return '#4ade80'
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Telescope() {
  const { t, i18n } = useTranslation('telescope')
  const navigate = useNavigate()
  const lang = i18n.language

  const [yMetric, setYMetric] = useState<YMetric>('avg_risk')
  const [selectedSectors, setSelectedSectors] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('avg_risk')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [tableSearch, setTableSearch] = useState('')
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2025])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const allItems: SectorYearItem[] = data?.data ?? []

  // All sector IDs present in data
  const sectorIds = useMemo(() => {
    const ids = new Set(allItems.map(d => d.sector_id))
    return Array.from(ids).sort((a, b) => a - b)
  }, [allItems])

  const isFilterActive = selectedSectors.size > 0

  const filteredItems = useMemo(() => {
    return allItems.filter(d => {
      if (isFilterActive && !selectedSectors.has(d.sector_id)) return false
      if (d.year < yearRange[0] || d.year > yearRange[1]) return false
      return true
    })
  }, [allItems, selectedSectors, yearRange, isFilterActive])

  // Scatter chart data
  const maxValue = useMemo(() => Math.max(...filteredItems.map(d => d.total_value || 0)), [filteredItems])

  const scatterSeries = useMemo(() => {
    // Group by sector for separate series (needed for legend + color)
    const bySector = new Map<number, SectorYearItem[]>()
    for (const d of filteredItems) {
      if (!bySector.has(d.sector_id)) bySector.set(d.sector_id, [])
      bySector.get(d.sector_id)!.push(d)
    }

    return Array.from(bySector.entries()).map(([sectorId, items]) => {
      const key = SECTOR_ID_TO_KEY[sectorId] ?? 'otros'
      const color = SECTOR_COLORS[key] ?? '#64748b'
      const name = getSectorName(sectorId)

      return {
        name,
        type: 'scatter',
        data: items.map(d => {
          const yVal = yMetric === 'avg_risk' ? d.avg_risk
            : yMetric === 'high_risk_pct' ? d.high_risk_pct
            : d.direct_award_pct
          // Bubble size proportional to sqrt(total_value) → area ∝ value
          const size = maxValue > 0
            ? Math.sqrt((d.total_value / maxValue) * MAX_BUBBLE_AREA)
            : 8
          return {
            value: [d.year, yVal, d.total_value, size, sectorId, d.contracts, d.avg_risk, d.high_risk_pct, d.direct_award_pct],
            symbolSize: Math.max(6, Math.round(size)),
          }
        }),
        itemStyle: { color, opacity: 0.75 },
        emphasis: { itemStyle: { opacity: 1, shadowBlur: 12, shadowColor: color + '88' } },
      }
    })
  }, [filteredItems, yMetric, maxValue])

  const yLabel = yMetric === 'avg_risk'
    ? t('yLabels.avg_risk')
    : yMetric === 'high_risk_pct'
    ? t('yLabels.high_risk_pct')
    : t('yLabels.direct_award_pct')

  const chartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 60, right: 20, top: 20, bottom: 60 },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { data: { value: number[] }; seriesName: string }) => {
        const [year, , value, , , contracts, avgRisk, highRiskPct, directPct] = params.data.value
        return `
          <div style="min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${params.seriesName} · ${year}</div>
            <div>${t('tooltip.contracts')}: <b>${formatNumber(contracts)}</b></div>
            <div>${t('tooltip.value')}: <b>${formatCompactMXN(value)}</b></div>
            <div>${t('tooltip.avgRisk')}: <b>${(avgRisk * 100).toFixed(1)}%</b></div>
            <div>${t('tooltip.highRisk')}: <b>${highRiskPct.toFixed(1)}%</b></div>
            <div>${t('tooltip.directAward')}: <b>${directPct.toFixed(1)}%</b></div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'value',
      name: lang === 'es' ? 'Año' : 'Year',
      nameLocation: 'middle',
      nameGap: 30,
      min: yearRange[0] - 0.5,
      max: yearRange[1] + 0.5,
      axisLabel: { color: '#94a3b8', formatter: (v: number) => v.toFixed(0) },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 45,
      min: 0,
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => yMetric === 'avg_risk' ? `${(v * 100).toFixed(0)}%` : `${v.toFixed(0)}%`,
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    legend: { show: false },
    series: scatterSeries,
  }), [scatterSeries, yLabel, yMetric, yearRange, t, lang])

  // Table
  const tableItems = useMemo(() => {
    let items = filteredItems.filter(d => {
      if (!tableSearch) return true
      const name = getSectorName(d.sector_id).toLowerCase()
      return name.includes(tableSearch.toLowerCase()) || String(d.year).includes(tableSearch)
    })

    items = [...items].sort((a, b) => {
      let av: number | string, bv: number | string
      switch (sortKey) {
        case 'year': av = a.year; bv = b.year; break
        case 'sector': av = getSectorName(a.sector_id); bv = getSectorName(b.sector_id); break
        case 'contracts': av = a.contracts; bv = b.contracts; break
        case 'total_value': av = a.total_value; bv = b.total_value; break
        case 'avg_risk': av = a.avg_risk; bv = b.avg_risk; break
        case 'high_risk_pct': av = a.high_risk_pct; bv = b.high_risk_pct; break
        case 'direct_award_pct': av = a.direct_award_pct; bv = b.direct_award_pct; break
        default: av = a.avg_risk; bv = b.avg_risk
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    return items
  }, [filteredItems, tableSearch, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />
    return sortDir === 'desc'
      ? <ArrowDown size={12} className="ml-1 inline text-blue-400" />
      : <ArrowUp size={12} className="ml-1 inline text-blue-400" />
  }

  function toggleSector(id: number) {
    setSelectedSectors(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Summary stats
  const totalContracts = useMemo(() => filteredItems.reduce((s, d) => s + d.contracts, 0), [filteredItems])
  const totalValue = useMemo(() => filteredItems.reduce((s, d) => s + d.total_value, 0), [filteredItems])
  const avgRisk = useMemo(() => filteredItems.length
    ? filteredItems.reduce((s, d) => s + d.avg_risk, 0) / filteredItems.length
    : 0, [filteredItems])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">{t('loading')}</div>
      </div>
    )
  }

  if (isError || allItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-400">
        <AlertTriangle size={20} />
        <span>{lang === 'es' ? 'Error cargando datos de sectores' : 'Error loading sector data'}</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs tracking-widest text-slate-500 uppercase mb-1">{t('eyebrow')}</p>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'es' ? 'Radar de Sectores' : 'Sector Radar'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {lang === 'es'
            ? 'Riesgo por sector y año · tamaño = valor contratado · color = sector'
            : 'Risk by sector and year · size = contract value · color = sector'}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: lang === 'es' ? 'Contratos' : 'Contracts', value: formatNumber(totalContracts) },
          { label: lang === 'es' ? 'Valor Total' : 'Total Value', value: formatCompactMXN(totalValue) },
          { label: lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk', value: (avgRisk * 100).toFixed(1) + '%', color: getRiskColor(avgRisk) },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: kpi.color ?? '#f1f5f9' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Y-axis metric */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {(['avg_risk', 'high_risk_pct', 'direct_award_pct'] as YMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setYMetric(m)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                yMetric === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'avg_risk' ? t('yLabels.avg_risk')
                : m === 'high_risk_pct' ? t('yLabels.high_risk_pct')
                : t('yLabels.direct_award_pct')}
            </button>
          ))}
        </div>

        {/* Year range */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{lang === 'es' ? 'Años' : 'Years'}:</span>
          <select
            value={yearRange[0]}
            onChange={e => setYearRange([Number(e.target.value), yearRange[1]])}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
          >
            {Array.from({length: 26}, (_, i) => 2000 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span>–</span>
          <select
            value={yearRange[1]}
            onChange={e => setYearRange([yearRange[0], Number(e.target.value)])}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
          >
            {Array.from({length: 26}, (_, i) => 2000 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {isFilterActive && (
          <button
            onClick={() => setSelectedSectors(new Set())}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            {lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        )}
      </div>

      {/* Sector legend / filter pills */}
      <div className="flex flex-wrap gap-2">
        {sectorIds.map(id => {
          const key = SECTOR_ID_TO_KEY[id] ?? 'otros'
          const color = SECTOR_COLORS[key] ?? '#64748b'
          const name = getSectorName(id)
          const active = !isFilterActive || selectedSectors.has(id)
          return (
            <button
              key={id}
              onClick={() => toggleSector(id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all ${
                active
                  ? 'border-transparent text-white'
                  : 'border-slate-700 text-slate-500 bg-transparent'
              }`}
              style={active ? { backgroundColor: color + '33', borderColor: color + '66' } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? color : '#475569' }}
              />
              {name}
            </button>
          )
        })}
      </div>

      {/* Scatter chart */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
        <ReactECharts
          option={chartOption}
          style={{ height: 420 }}
          theme="dark"
          notMerge
        />
      </div>

      {/* Ranked table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">
              {lang === 'es' ? 'Ranking sector-año' : 'Sector-Year Ranking'}
            </span>
            <span className="text-xs text-slate-500 ml-1">({tableItems.length})</span>
          </div>
          <input
            type="text"
            placeholder={lang === 'es' ? 'Buscar sector o año…' : 'Search sector or year…'}
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs text-white placeholder-slate-500 w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {([
                  ['year', lang === 'es' ? 'Año' : 'Year'],
                  ['sector', lang === 'es' ? 'Sector' : 'Sector'],
                  ['contracts', lang === 'es' ? 'Contratos' : 'Contracts'],
                  ['total_value', lang === 'es' ? 'Valor Total' : 'Total Value'],
                  ['avg_risk', lang === 'es' ? 'Riesgo Prom.' : 'Avg Risk'],
                  ['high_risk_pct', lang === 'es' ? '% Alto Riesgo' : '% High Risk'],
                  ['direct_award_pct', lang === 'es' ? '% Adj. Directa' : '% Direct Award'],
                ] as [SortKey, string][]).map(([k, label]) => (
                  <th
                    key={k}
                    onClick={() => toggleSort(k)}
                    className="px-3 py-2 text-left text-slate-400 cursor-pointer hover:text-white select-none whitespace-nowrap"
                  >
                    {label}<SortIcon k={k} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableItems.slice(0, 100).map(d => {
                const key = SECTOR_ID_TO_KEY[d.sector_id] ?? 'otros'
                const color = SECTOR_COLORS[key] ?? '#64748b'
                const riskColor = getRiskColor(d.avg_risk)
                return (
                  <tr
                    key={`${d.sector_id}-${d.year}`}
                    onClick={() => navigate(`/sectors/${d.sector_id}`)}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-slate-300">{d.year}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-white">{getSectorName(d.sector_id)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-300 text-right">{formatNumber(d.contracts)}</td>
                    <td className="px-3 py-2 text-slate-300 text-right">{formatCompactMXN(d.total_value)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: riskColor }}>
                      {(d.avg_risk * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {d.high_risk_pct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {d.direct_award_pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
              {tableItems.length > 100 && (
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-center text-slate-500 text-xs">
                    {lang === 'es'
                      ? `Mostrando 100 de ${tableItems.length}. Filtra por sector o año para ver más.`
                      : `Showing 100 of ${tableItems.length}. Filter by sector or year to see more.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
