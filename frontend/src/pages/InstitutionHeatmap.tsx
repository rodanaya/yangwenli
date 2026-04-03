/**
 * MAPA DE RIESGO INSTITUCIONAL — Editorial Redesign
 * Route: /heatmap
 *
 * NYT/WaPo investigative journalism aesthetic:
 *   1. Editorial headline + journalistic lede
 *   2. 3 HallazgoStat key findings
 *   3. Tabbed visualizations: Sankey + HHI bar chart
 *   4. "Zonas Rojas" — top 10 highest-risk institutions with critical-only filter
 *   5. Methodology note
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, ArrowRight, GitBranch, BarChart3, Filter } from 'lucide-react'
import { analysisApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import type { InstitutionHealthItem } from '@/api/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortName(name: string): string {
  const n = toTitleCase(name)
  return n.length > 40 ? n.slice(0, 38) + '\u2026' : n
}

function riskBadgeColor(score: number): string {
  if (score >= 0.60) return '#f87171'
  if (score >= 0.40) return '#fb923c'
  if (score >= 0.25) return '#fbbf24'
  return '#4ade80'
}

// ---------------------------------------------------------------------------
// HHI bar chart
// ---------------------------------------------------------------------------

interface HHIChartProps {
  institutions: InstitutionHealthItem[]
  onSelect: (id: number) => void
  t: (key: string) => string
}

function HHIChart({ institutions, onSelect, t }: HHIChartProps) {
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
        const d = top30.find((i) => shortName(i.institution_name) === params[0]?.name)
        if (!d) return ''
        return `
          <div style="min-width:200px">
            <div style="font-weight:600;margin-bottom:4px">${shortName(d.institution_name)}</div>
            <div>HHI: <b>${(d.hhi ?? 0).toFixed(3)}</b></div>
            <div>${t('hhi.topVendorShare')}: <b>${(d.top_vendor_share ?? 0).toFixed(1)}%</b></div>
            <div>${t('hhi.directAward')}: <b>${(d.direct_award_pct ?? 0).toFixed(1)}%</b></div>
            <div>${t('hhi.contracts')}: <b>${formatNumber(d.total_contracts)}</b></div>
            <div style="margin-top:4px;font-size:11px;color:#94a3b8">${t('hhi.clickHint')}</div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'value',
      name: 'HHI',
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => (v ?? 0).toFixed(2),
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: top30.map((d) => shortName(d.institution_name)).reverse(),
      axisLabel: {
        color: '#cbd5e1',
        fontSize: 10.5,
        width: 200,
        overflow: 'truncate',
      },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        type: 'bar',
        data: [...top30].reverse().map((d) => ({
          value: d.hhi,
          itemStyle: {
            color:
              d.hhi > 0.25
                ? '#f87171'
                : d.hhi > 0.15
                ? '#fb923c'
                : d.hhi > 0.10
                ? '#fbbf24'
                : '#4ade80',
            borderRadius: [0, 4, 4, 0],
          },
          name: shortName(d.institution_name),
        })),
        markLine: {
          data: [
            {
              xAxis: 0.25,
              lineStyle: { color: '#f87171', type: 'dashed', width: 1 },
              label: { formatter: t('hhi.highCapture'), color: '#f87171', fontSize: 10 },
            },
            {
              xAxis: 0.15,
              lineStyle: { color: '#fb923c', type: 'dashed', width: 1 },
              label: { formatter: t('hhi.moderate'), color: '#fb923c', fontSize: 10 },
            },
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
          const inst = top30.find((i) => shortName(i.institution_name) === params.name)
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
  const { t, i18n } = useTranslation('institutions')
  const lang = i18n.language

  const [activeTab, setActiveTab] = useState<'sankey' | 'hhi'>('sankey')
  const [sankeyYear, setSankeyYear] = useState<number | undefined>(undefined)
  const [sankeySector, setSankeySector] = useState<number | undefined>(undefined)
  // Filter: show only critical-risk institutions in the Zonas Rojas list
  const [criticalOnly, setCriticalOnly] = useState(false)

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

  // ---- Computed stats ----

  const mostConcentrated = useMemo(
    () =>
      institutions.length
        ? [...institutions].sort((a, b) => b.hhi - a.hhi)[0]
        : null,
    [institutions]
  )

  const highestRisk = useMemo(
    () =>
      institutions.length
        ? [...institutions].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0]
        : null,
    [institutions]
  )

  const totalValue = flowData?.total_value ?? 0

  const topRiskInstitutions = useMemo(
    () =>
      [...institutions]
        .sort((a, b) => b.avg_risk_score - a.avg_risk_score)
        .slice(0, 10),
    [institutions]
  )

  // Apply optional critical-only filter
  const filteredRiskInstitutions = useMemo(
    () =>
      criticalOnly
        ? topRiskInstitutions.filter((i) => i.avg_risk_score >= 0.60)
        : topRiskInstitutions,
    [topRiskInstitutions, criticalOnly]
  )

  const criticalCount = useMemo(
    () => institutions.filter((i) => i.avg_risk_score >= 0.60).length,
    [institutions]
  )

  const isLoading = loadingFlow || loadingRankings
  const hasError = errorFlow || errorRankings

  // ---- i18n helper for riskLabel ----
  function riskLabel(score: number): string {
    if (score >= 0.60) return t('heatmap.riskLevelCritical')
    if (score >= 0.40) return t('heatmap.riskLevelHigh')
    if (score >= 0.25) return t('heatmap.riskLevelMedium')
    return t('heatmap.riskLevelLow')
  }

  // ---- Loading / Error ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">
          {t('heatmap.loading')}
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-400">
        <AlertTriangle size={20} />
        <span>
          {t('heatmap.errorLoading')}
        </span>
      </div>
    )
  }

  // ---- Render ----

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-screen-xl mx-auto">

      {/* ============================================================
          1. Editorial Headline
          ============================================================ */}
      <EditorialHeadline
        section={t('heatmap.section')}
        headline={t('heatmap.headline')}
        subtitle={t('heatmap.subtitle')}
      />

      {/* ============================================================
          2. Journalistic Lede
          ============================================================ */}
      <div className="max-w-3xl">
        <p
          className="text-lg text-zinc-300 leading-relaxed"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {t('heatmap.lede', { n: formatNumber(institutions.length) })}
        </p>
      </div>

      {/* ============================================================
          3. Three HallazgoStat findings
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HallazgoStat
          value={mostConcentrated ? mostConcentrated.hhi.toFixed(3) : '--'}
          label={
            mostConcentrated
              ? shortName(mostConcentrated.institution_name)
              : t('heatmap.noData')
          }
          annotation={t('heatmap.mostConcentratedAnnotation')}
          color="border-red-500"
        />
        <HallazgoStat
          value={
            highestRisk ? `${(highestRisk.avg_risk_score * 100).toFixed(0)}%` : '--'
          }
          label={
            highestRisk
              ? shortName(highestRisk.institution_name)
              : t('heatmap.noData')
          }
          annotation={t('heatmap.highestRiskAnnotation')}
          color="border-orange-500"
        />
        <HallazgoStat
          value={formatNumber(institutions.length)}
          label={t('heatmap.institutionsMapped')}
          annotation={t('heatmap.totalValue', { value: formatCompactMXN(totalValue) })}
          color="border-amber-500"
        />
      </div>

      {/* ============================================================
          4. Tabbed Visualizations — Sankey + HHI
          ============================================================ */}
      <section>
        {/* Section header + color legend */}
        <div className="mb-6">
          <div className="h-px bg-zinc-700/60" />
          <div className="flex items-end justify-between pt-4">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                {t('heatmap.fullMapSection')}
              </span>
              <p
                className="text-base text-zinc-400 mt-1 max-w-xl italic"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {t('heatmap.fullMapQuote')}
              </p>
            </div>

            {/* Color legend — always show, not just on md+ */}
            <div className="flex flex-wrap gap-4 text-xs shrink-0 ml-4">
              {[
                { color: '#f87171', label: t('heatmap.legendCritical') },
                { color: '#fb923c', label: t('heatmap.legendHigh') },
                { color: '#fbbf24', label: t('heatmap.legendMedium') },
                { color: '#4ade80', label: t('heatmap.legendLow') },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="text-zinc-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-zinc-800/80 rounded-lg p-1 w-fit mb-5">
          {(
            [
              ['sankey', GitBranch, t('heatmap.tabSankey')],
              ['hhi', BarChart3, t('heatmap.tabHhi')],
            ] as const
          ).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-red-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              aria-pressed={activeTab === tab}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Sankey tab */}
        {activeTab === 'sankey' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{t('heatmap.filterYear')}:</span>
                <select
                  value={sankeyYear ?? ''}
                  onChange={(e) =>
                    setSankeyYear(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                  aria-label={t('heatmap.filterYearLabel')}
                >
                  <option value="">{t('heatmap.filterAll')}</option>
                  {Array.from({ length: 26 }, (_, i) => 2025 - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Sector:</span>
                <select
                  value={sankeySector ?? ''}
                  onChange={(e) =>
                    setSankeySector(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                  aria-label={t('heatmap.filterSectorLabel')}
                >
                  <option value="">{t('heatmap.filterAll')}</option>
                  {SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === 'es' ? s.name : s.nameEN}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-zinc-500">
                {flows.length}{' '}
                {t('heatmap.flowsCount')} &middot;{' '}
                {formatCompactMXN(totalValue)}
              </span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">
                {t('heatmap.sankeyDesc')}
              </p>
              {flows.length > 0 ? (
                <MoneySankeyChart flows={flows} height={560} />
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                  {t('heatmap.noFlows')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HHI tab */}
        {activeTab === 'hhi' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex flex-wrap gap-4 text-xs">
                  {[
                    { color: '#f87171', label: t('heatmap.hhiLegendHighCapture') },
                    { color: '#fb923c', label: t('heatmap.hhiLegendModerate') },
                    { color: '#fbbf24', label: t('heatmap.hhiLegendLow') },
                    { color: '#4ade80', label: t('heatmap.hhiLegendCompetitive') },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="text-zinc-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-3">
                {t('heatmap.hhiDesc')}
              </p>
              {institutions.length > 0 ? (
                <HHIChart
                  institutions={institutions}
                  onSelect={(id) => navigate(`/institutions/${id}`)}
                  t={t}
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                  {t('heatmap.noInstitutions')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
          5. "Zonas Rojas" — Top 10 Highest-Risk Institutions
          ============================================================ */}
      <section aria-labelledby="zonas-rojas-heading">
        <div className="h-px bg-zinc-700/60" />
        <div className="pt-4 mb-4">
          <span className="text-xs uppercase tracking-[0.2em] text-red-400 font-semibold">
            {t('heatmap.zonasRojasSection')}
          </span>
          <h2
            id="zonas-rojas-heading"
            className="text-2xl font-bold text-white mt-1"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {t('heatmap.zonasRojasHeadline')}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {t('heatmap.zonasRojasDesc')}
          </p>
        </div>

        {/* Filter toggle: critical only */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setCriticalOnly((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
              criticalOnly
                ? 'bg-red-700/30 border-red-500/50 text-red-300'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            aria-pressed={criticalOnly}
          >
            <Filter size={12} aria-hidden="true" />
            {t('heatmap.criticalOnly')}
            {criticalOnly && criticalCount > 0 && (
              <span className="ml-1 bg-red-500/30 text-red-300 rounded-full px-1.5 py-0.5 text-[10px]">
                {criticalCount}
              </span>
            )}
          </button>
          {criticalOnly && filteredRiskInstitutions.length === 0 && (
            <span className="text-xs text-zinc-500">
              {t('heatmap.noCritical')}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {filteredRiskInstitutions.map((inst, idx) => {
            const badgeColor = riskBadgeColor(inst.avg_risk_score)
            const sector = SECTORS.find((s) => {
              const instLower = inst.institution_name.toLowerCase()
              return (
                inst.institution_type?.toLowerCase().includes(s.code) ||
                instLower.includes(s.code)
              )
            })

            return (
              <button
                key={inst.institution_id}
                onClick={() => navigate(`/institutions/${inst.institution_id}`)}
                className="w-full flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-4 py-3 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group text-left"
                aria-label={`${shortName(inst.institution_name)} — ${riskLabel(inst.avg_risk_score ?? 0)} ${((inst.avg_risk_score ?? 0) * 100).toFixed(0)}%`}
              >
                {/* Rank */}
                <span
                  className="text-3xl font-bold text-zinc-600 w-10 text-right tabular-nums shrink-0"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>

                {/* Name + sector tag */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">
                    {shortName(inst.institution_name)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sector && (
                      <span
                        className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: sector.color,
                          backgroundColor: `${sector.color}18`,
                        }}
                      >
                        {lang === 'es' ? sector.name : sector.nameEN}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {formatNumber(inst.total_contracts)}{' '}
                      {t('heatmap.contracts')}
                      {' '}&middot;{' '}
                      {formatCompactMXN(inst.total_value)}
                    </span>
                  </div>
                  {/* HHI sub-detail */}
                  <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          (inst.hhi ?? 0) > 0.25
                            ? '#f87171'
                            : (inst.hhi ?? 0) > 0.15
                            ? '#fb923c'
                            : '#6b7280',
                      }}
                      title={t('heatmap.hhiTooltip')}
                    >
                      HHI {(inst.hhi ?? 0).toFixed(3)}
                    </span>
                    {(inst.hhi ?? 0) > 0.25 && (
                      <span className="text-red-400 text-[9px] uppercase tracking-wide">
                        {t('heatmap.hhiHighCapture')}
                      </span>
                    )}
                    <span className="text-zinc-600">&middot;</span>
                    <span>
                      {t('heatmap.topVendorLabel')}{' '}
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            (inst.top_vendor_share ?? 0) >= 50
                              ? '#f87171'
                              : (inst.top_vendor_share ?? 0) >= 30
                              ? '#fb923c'
                              : '#6b7280',
                        }}
                      >
                        {(inst.top_vendor_share ?? 0).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                </div>

                {/* Risk badge */}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
                  style={{
                    color: badgeColor,
                    backgroundColor: `${badgeColor}18`,
                    borderColor: `${badgeColor}40`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: badgeColor }}
                    aria-hidden="true"
                  />
                  {riskLabel(inst.avg_risk_score ?? 0)}{' '}
                  {((inst.avg_risk_score ?? 0) * 100).toFixed(0)}%
                </span>

                {/* Arrow */}
                <ArrowRight
                  size={16}
                  className="text-zinc-600 group-hover:text-red-400 transition-colors shrink-0"
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          6. Top 5 Most Concentrated Institutions (by HHI)
          ============================================================ */}
      {institutions.length > 0 && (
        <section aria-labelledby="top-hhi-heading">
          <div className="h-px bg-zinc-700/60" />
          <div className="pt-4 mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-amber-400 font-semibold">
              {t('heatmap.hhiConcentrationSection')}
            </span>
            <h2
              id="top-hhi-heading"
              className="text-xl font-bold text-white mt-1"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {t('heatmap.top5Headline')}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {t('heatmap.top5Desc')}
            </p>
          </div>

          {/* HHI legend */}
          <div className="flex flex-wrap gap-4 text-xs mb-4">
            {[
              { color: '#f87171', label: t('heatmap.hhiLegendHighCaptureLong') },
              { color: '#fb923c', label: t('heatmap.hhiLegendModerateLong') },
              { color: '#fbbf24', label: t('heatmap.hhiLegendLowLong') },
              { color: '#4ade80', label: t('heatmap.hhiLegendCompetitiveLong') },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="text-zinc-400">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {[...institutions]
              .sort((a, b) => b.hhi - a.hhi)
              .slice(0, 5)
              .map((inst, idx) => {
                const hhiColor =
                  inst.hhi > 0.25 ? '#f87171'
                  : inst.hhi > 0.15 ? '#fb923c'
                  : inst.hhi > 0.10 ? '#fbbf24'
                  : '#4ade80'
                const shareColor =
                  (inst.top_vendor_share ?? 0) >= 50 ? '#f87171'
                  : (inst.top_vendor_share ?? 0) >= 30 ? '#fb923c'
                  : '#94a3b8'

                return (
                  <button
                    key={inst.institution_id}
                    onClick={() => navigate(`/institutions/${inst.institution_id}`)}
                    className="w-full flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-4 py-3 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group text-left"
                    aria-label={`${shortName(inst.institution_name)} — HHI ${inst.hhi.toFixed(3)}`}
                  >
                    <span
                      className="text-3xl font-bold text-zinc-600 w-10 text-right tabular-nums shrink-0"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">
                        {shortName(inst.institution_name)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                        <span>
                          {formatNumber(inst.total_contracts)}{' '}
                          {t('heatmap.contracts')}
                        </span>
                        <span>&middot;</span>
                        <span>{formatCompactMXN(inst.total_value)}</span>
                      </div>
                    </div>

                    {/* HHI badge */}
                    <div className="text-right shrink-0 mr-2">
                      <div
                        className="text-lg font-bold tabular-nums leading-tight"
                        style={{ color: hhiColor }}
                      >
                        {inst.hhi.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-zinc-500">HHI</div>
                    </div>

                    {/* Top vendor share badge */}
                    <div className="text-right shrink-0 mr-2">
                      <div
                        className="text-base font-bold tabular-nums leading-tight"
                        style={{ color: shareColor }}
                      >
                        {(inst.top_vendor_share ?? 0).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {t('heatmap.topVendorLabel')}
                      </div>
                    </div>

                    <ArrowRight
                      size={16}
                      className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                )
              })}
          </div>
        </section>
      )}

      {/* ============================================================
          7. Methodology Note
          ============================================================ */}
      <section>
        <div className="h-px bg-zinc-700/60" />
        <div className="pt-6 pb-4 max-w-2xl">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">
            {t('heatmap.methodologySection')}
          </span>
          <p
            className="text-sm text-zinc-400 mt-2 leading-relaxed"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {t('heatmap.methodologyText')}
          </p>
        </div>
      </section>
    </div>
  )
}
