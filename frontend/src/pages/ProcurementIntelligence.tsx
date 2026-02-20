/**
 * Procurement Intelligence — Merged Money Flow + Red Flags
 *
 * Combines institution money flow analysis with risk factor breakdown
 * in a single investigation-oriented page.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import { PageHero } from '@/components/DashboardWidgets'
import type { MoneyFlowItem, RiskFactorFrequency, FactorCooccurrence } from '@/api/types'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from '@/components/charts'
import {
  TrendingUp,
  Building2,
  AlertTriangle,
  Filter,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Layers,
} from 'lucide-react'

// =============================================================================
// Helpers
// =============================================================================

function riskToColor(risk: number | null): string {
  if (risk == null) return '#64748b'
  const level = getRiskLevel(risk)
  return RISK_COLORS[level]
}

function riskLevelBadge(risk: number | null): string {
  if (risk == null) return 'bg-zinc-700/30 text-text-muted'
  if (risk >= 0.5) return 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30'
  if (risk >= 0.3) return 'bg-risk-high/20 text-risk-high border border-risk-high/30'
  if (risk >= 0.1) return 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30'
  return 'bg-risk-low/20 text-risk-low border border-risk-low/30'
}

function riskLevelLabel(risk: number | null, t: (k: string) => string): string {
  if (risk == null) return '—'
  if (risk >= 0.5) return t('riskLevels.critical')
  if (risk >= 0.3) return t('riskLevels.high')
  if (risk >= 0.1) return t('riskLevels.medium')
  return t('riskLevels.low')
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const a = parse(colorA)
  const b = parse(colorB)
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

function riskScoreToColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return lerpColor(RISK_COLORS.high, RISK_COLORS.critical, (score - 0.3) / 0.2)
  if (score >= 0.1) return lerpColor(RISK_COLORS.medium, RISK_COLORS.high, (score - 0.1) / 0.2)
  return lerpColor(RISK_COLORS.low, RISK_COLORS.medium, score / 0.1)
}

function liftToColor(lift: number): string {
  if (lift >= 2) return 'bg-risk-critical/30 text-risk-critical'
  if (lift >= 1.5) return 'bg-risk-high/25 text-risk-high'
  if (lift >= 1) return 'bg-risk-medium/20 text-risk-medium'
  return 'bg-zinc-700/30 text-text-muted'
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1f2e' : '#e2e8f0'
}

// Factor label helpers
function getFactorGroup(factor: string): string {
  if (factor.startsWith('split_')) {
    const n = parseInt(factor.replace('split_', ''), 10)
    if (n >= 10) return 'split_10+'
    return factor
  }
  if (factor.startsWith('network_')) {
    const n = parseInt(factor.replace('network_', ''), 10)
    if (n >= 5) return 'network_5+'
    return factor
  }
  return factor
}

type TFunction = (key: string) => string

function getFactorLabel(factor: string, t: TFunction): string {
  const group = getFactorGroup(factor)
  const safe = group.replace(/[<>+]/g, '').replace(/_+$/, '')
  const map: Record<string, string> = {
    'split_10': 'split_10plus',
    'network_5': 'network_5plus',
  }
  const i18nKey = map[safe] ?? safe
  const key = `factors.${i18nKey}`
  const translated = t(key)
  if (translated !== key) return translated
  if (factor.startsWith('split_')) return `x${factor.replace('split_', '')}`
  if (factor.startsWith('network_')) return `Red (${factor.replace('network_', '')})`
  return factor.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function consolidateFactors(data: RiskFactorFrequency[], t: TFunction) {
  const groups = new Map<string, { count: number; riskSum: number; percentage: number }>()
  for (const d of data) {
    const group = getFactorGroup(d.factor)
    const existing = groups.get(group)
    if (existing) {
      existing.count += d.count
      existing.riskSum += d.avg_risk_score * d.count
      existing.percentage += d.percentage
    } else {
      groups.set(group, { count: d.count, riskSum: d.avg_risk_score * d.count, percentage: d.percentage })
    }
  }
  return Array.from(groups.entries()).map(([group, { count, riskSum, percentage }]) => ({
    factor: group,
    label: getFactorLabel(group, t),
    count,
    avg_risk_score: count > 0 ? riskSum / count : 0,
    percentage,
  }))
}

// =============================================================================
// Treemap Content
// =============================================================================

function TreemapContent(props: {
  x: number; y: number; width: number; height: number
  name: string; fill: string; value: number
}) {
  const { x, y, width, height, name, fill, value } = props
  const showLabel = width > 40 && height > 20
  const showValue = width > 60 && height > 45
  const textColor = getTextColor(fill)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#1a1f2e" strokeWidth={2} rx={4} />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showValue ? -7 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs font-medium"
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 9}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs"
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', opacity: 0.8 }}
        >
          {formatCompactMXN(value)}
        </text>
      )}
    </g>
  )
}

// =============================================================================
// Sort state type
// =============================================================================

type SortKey = 'total_flow' | 'high_risk_pct' | 'avg_risk' | 'contracts'
type SortDir = 'asc' | 'desc'

// =============================================================================
// Main Component
// =============================================================================

export default function ProcurementIntelligence() {
  const navigate = useNavigate()
  const { t } = useTranslation('procurement')
  const { t: tRf } = useTranslation('redflags')

  const [selectedSector, setSelectedSector] = useState<number | ''>('')
  const [selectedYear, setSelectedYear] = useState<number | ''>(2024)
  const [sortKey, setSortKey] = useState<SortKey>('total_flow')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showMoreInstitutions, setShowMoreInstitutions] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(true)

  // ---- Data fetches ----
  const { data: flowData, isLoading: flowLoading } = useQuery({
    queryKey: ['money-flow', selectedSector, selectedYear],
    queryFn: () => analysisApi.getMoneyFlow(selectedYear || undefined, selectedSector || undefined),
    staleTime: 5 * 60 * 1000,
  })

  const { data: rfData, isLoading: rfLoading } = useQuery({
    queryKey: ['risk-factors', selectedSector, selectedYear],
    queryFn: () => analysisApi.getRiskFactorAnalysis(selectedSector || undefined, selectedYear || undefined),
    staleTime: 5 * 60 * 1000,
  })

  // ---- Derived: institution flows ----
  const institutionFlows = useMemo(() => {
    if (!flowData?.flows) return []
    return flowData.flows
      .filter((f: MoneyFlowItem) => f.source_type === 'institution')
      .map((f: MoneyFlowItem) => ({
        id: f.source_id,
        name: toTitleCase(f.source_name),
        total_flow: f.value,
        contracts: f.contracts,
        avg_risk: f.avg_risk,
        high_risk_pct: f.high_risk_pct ?? 0,  // % of contracts with risk_score >= 0.30
      }))
  }, [flowData])

  // ---- Derived: sorted institutions ----
  const sortedInstitutions = useMemo(() => {
    const sorted = [...institutionFlows].sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return showMoreInstitutions ? sorted : sorted.slice(0, 30)
  }, [institutionFlows, sortKey, sortDir, showMoreInstitutions])

  // ---- Derived: sector treemap ----
  const sectorAgg = useMemo(() => {
    if (!flowData?.flows) return []
    const sectorMap = new Map<number, { value: number; contracts: number }>()
    for (const f of flowData.flows as MoneyFlowItem[]) {
      const sectorId = f.source_type === 'sector' ? f.source_id : (f.target_type === 'sector' ? f.target_id : null)
      if (sectorId != null) {
        const existing = sectorMap.get(sectorId) || { value: 0, contracts: 0 }
        existing.value += f.value
        existing.contracts += f.contracts
        sectorMap.set(sectorId, existing)
      }
    }
    return SECTORS
      .filter(s => sectorMap.has(s.id))
      .map(s => {
        const agg = sectorMap.get(s.id)!
        return { name: s.nameEN, sectorCode: s.code, sectorId: s.id, value: agg.value, contracts: agg.contracts, fill: SECTOR_COLORS[s.code] || '#64748b' }
      })
      .sort((a, b) => b.value - a.value)
  }, [flowData])

  // ---- Derived: hero stats ----
  const heroStats = useMemo(() => {
    const totalSpend = flowData?.total_value ?? 0
    const highRiskInstitutions = institutionFlows.filter(i => (i.avg_risk ?? 0) >= 0.3).length
    const highRiskValue = institutionFlows
      .filter(i => (i.avg_risk ?? 0) >= 0.3)
      .reduce((sum, i) => sum + i.total_flow, 0)

    // Top risk factor from rfData
    const topFactor = rfData?.factor_frequencies?.[0]
    const topFactorLabel = topFactor ? getFactorLabel(topFactor.factor, tRf) : '—'

    return { totalSpend, highRiskInstitutions, highRiskValue, topFactorLabel }
  }, [flowData, institutionFlows, rfData, tRf])

  // ---- Derived: danger zone ----
  const dangerZone = useMemo(() => {
    return institutionFlows
      .filter(i => (i.avg_risk ?? 0) >= 0.3)
      .sort((a, b) => (b.avg_risk ?? 0) - (a.avg_risk ?? 0))
      .slice(0, 20)
  }, [institutionFlows])

  // ---- Sort handler ----
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (colKey !== sortKey) return <ChevronDown className="h-3 w-3 text-text-muted/50 ml-1 inline" />
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 text-accent ml-1 inline" />
      : <ChevronUp className="h-3 w-3 text-accent ml-1 inline" />
  }

  const isLoading = flowLoading || rfLoading

  // ---- Filter controls ----
  const filterControls = (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-md border border-border bg-background-elevated px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label={t('filters.year')}
      >
        <option value="">{t('filters.allYears')}</option>
        {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={selectedSector}
        onChange={(e) => setSelectedSector(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-md border border-border bg-background-elevated px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label={t('filters.sector')}
      >
        <option value="">{t('filters.allSectors')}</option>
        {SECTORS.map(s => (
          <option key={s.id} value={s.id}>{s.nameEN}</option>
        ))}
      </select>
    </div>
  )

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent><Skeleton className="h-72" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent><ChartSkeleton height={300} /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── HERO ─── */}
      <PageHero
        trackingLabel={t('trackingLabel')}
        title={t('title')}
        subtitle={t('subtitle')}
        controls={filterControls}
        stats={[
          {
            label: t('hero.totalSpend'),
            value: formatCompactMXN(heroStats.totalSpend),
            detail: t('hero.totalSpendDetail'),
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            label: t('hero.highRiskInstitutions'),
            value: formatNumber(heroStats.highRiskInstitutions),
            detail: t('hero.highRiskInstitutionsDetail'),
            icon: <Building2 className="h-4 w-4" />,
            variant: heroStats.highRiskInstitutions > 0 ? 'high' : undefined,
          },
          {
            label: t('hero.topRiskFactor'),
            value: heroStats.topFactorLabel,
            detail: t('hero.topRiskFactorDetail'),
            icon: <AlertTriangle className="h-4 w-4" />,
          },
          {
            label: t('hero.highRiskValue'),
            value: formatCompactMXN(heroStats.highRiskValue),
            detail: t('hero.highRiskValueDetail'),
            icon: <Layers className="h-4 w-4" />,
            variant: heroStats.highRiskValue > 0 ? 'high' : undefined,
          },
        ]}
      />

      {/* ─── S2: INSTITUTION TABLE ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide">{t('institutionTable.title')}</CardTitle>
          <CardDescription className="text-xs">{t('institutionTable.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedInstitutions.length === 0 ? (
            <p className="text-text-muted text-sm p-6 text-center">{t('institutionTable.empty')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-background-elevated/50">
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium w-8">{t('institutionTable.rank')}</th>
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('institutionTable.institution')}</th>
                      <th
                        className="px-4 py-2.5 text-right text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none"
                        onClick={() => handleSort('total_flow')}
                      >
                        {t('institutionTable.totalFlow')}
                        <SortIcon colKey="total_flow" />
                      </th>
                      <th
                        className="px-4 py-2.5 text-right text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none"
                        onClick={() => handleSort('high_risk_pct')}
                      >
                        {t('institutionTable.highRiskPct')}
                        <SortIcon colKey="high_risk_pct" />
                      </th>
                      <th
                        className="px-4 py-2.5 text-center text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none"
                        onClick={() => handleSort('avg_risk')}
                      >
                        {t('institutionTable.riskLevel')}
                        <SortIcon colKey="avg_risk" />
                      </th>
                      <th
                        className="px-4 py-2.5 text-right text-text-muted font-medium cursor-pointer hover:text-text-primary transition-colors select-none"
                        onClick={() => handleSort('contracts')}
                      >
                        {t('institutionTable.contracts')}
                        <SortIcon colKey="contracts" />
                      </th>
                      <th className="px-4 py-2.5 text-right text-text-muted font-medium w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInstitutions.map((inst, idx) => (
                      <tr
                        key={inst.id ?? inst.name}
                        className="border-b border-border/30 hover:bg-background-elevated/40 transition-colors group"
                      >
                        <td className="px-4 py-2.5 text-text-muted">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-text-primary font-medium max-w-xs">
                          {inst.name}
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-primary font-mono">
                          {formatCompactMXN(inst.total_flow)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span style={{ color: riskToColor((inst.high_risk_pct ?? 0) / 100) }}>
                            {(inst.high_risk_pct ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', riskLevelBadge(inst.avg_risk))}>
                            {riskLevelLabel(inst.avg_risk, tRf)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary font-mono">
                          {formatNumber(inst.contracts)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {inst.id && (
                            <button
                              onClick={() => navigate(`/institutions/${inst.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-accent hover:underline flex items-center gap-1 ml-auto text-xs"
                            >
                              {t('institutionTable.viewContracts')}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {institutionFlows.length > 30 && (
                <div className="p-4 border-t border-border/30">
                  <button
                    onClick={() => setShowMoreInstitutions(v => !v)}
                    className="text-xs text-accent hover:underline"
                  >
                    {showMoreInstitutions
                      ? `Show top 30`
                      : t('institutionTable.showMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── S3: SECTOR TREEMAP ─── */}
      {sectorAgg.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide">{t('treemap.title')}</CardTitle>
            <CardDescription className="text-xs">{t('treemap.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={sectorAgg}
                dataKey="value"
                content={<TreemapContent x={0} y={0} width={0} height={0} name="" fill="" value={0} />}
                onClick={(data: { sectorId?: number }) => {
                  if (data.sectorId) setSelectedSector(data.sectorId)
                }}
              />
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ─── S4: RISK FACTOR ANALYSIS ─── */}
      {rfData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide">{t('riskFactors.title')}</CardTitle>
            <CardDescription className="text-xs">{t('riskFactors.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Factor Frequency */}
            {rfData.factor_frequencies?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-3">{t('riskFactors.frequencyTitle')}</p>
                <p className="text-xs text-text-muted mb-4">{t('riskFactors.frequencySubtitle')}</p>
                <FactorFrequencyChart data={rfData.factor_frequencies} t={tRf} />
              </div>
            )}

            {/* Heatmap toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-text-secondary">{t('riskFactors.heatmapTitle')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('riskFactors.heatmapSubtitle')}</p>
                </div>
                <button
                  onClick={() => setShowHeatmap(v => !v)}
                  className="text-xs text-accent hover:underline shrink-0 ml-4"
                >
                  {showHeatmap ? t('riskFactors.hideHeatmap') : t('riskFactors.showHeatmap')}
                </button>
              </div>
              {showHeatmap && rfData.top_cooccurrences?.length > 0 && (
                <CooccurrenceHeatmap
                  cooccurrences={rfData.top_cooccurrences}
                  factors={rfData.factor_frequencies?.map((f: RiskFactorFrequency) => f.factor) ?? []}
                  t={tRf}
                />
              )}
            </div>

            {/* Scatter: risk score vs frequency */}
            {rfData.factor_frequencies?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-3">{t('riskFactors.scatterTitle')}</p>
                <p className="text-xs text-text-muted mb-4">{t('riskFactors.scatterSubtitle')}</p>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 4, right: 20, bottom: 4, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="percentage"
                      name="Frequency %"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      label={{ value: 'Frequency (%)', position: 'insideBottom', offset: -4, fill: 'var(--color-text-muted)', fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="avg_risk_score"
                      name="Avg Risk"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    />
                    <ZAxis type="number" dataKey="count" range={[40, 400]} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const d = payload[0].payload
                        return (
                          <div className="rounded-lg border border-border/50 bg-background-card px-3 py-2 shadow-lg text-xs">
                            <p className="font-medium text-text-primary mb-1">{d.label ?? getFactorLabel(d.factor, tRf)}</p>
                            <p className="text-text-secondary">Frequency: {d.percentage?.toFixed(1)}%</p>
                            <p className="text-text-secondary">Avg Risk: {(d.avg_risk_score * 100).toFixed(1)}%</p>
                            <p className="text-text-muted">{formatNumber(d.count)} {t('riskFactors.contracts')}</p>
                          </div>
                        )
                      }}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <ReferenceLine y={0.3} stroke={RISK_COLORS.high} strokeDasharray="4 4" strokeWidth={1} />
                    <Scatter
                      data={consolidateFactors(rfData.factor_frequencies, tRf)}
                      fill={RISK_COLORS.high}
                    >
                      {consolidateFactors(rfData.factor_frequencies, tRf).map((entry, index) => (
                        <Cell key={index} fill={riskScoreToColor(entry.avg_risk_score)} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── S5: DANGER ZONE ─── */}
      {dangerZone.length > 0 && (
        <Card className="border-risk-high/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide text-risk-high">{t('dangerZone.title')}</CardTitle>
            <CardDescription className="text-xs">{t('dangerZone.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-background-elevated/50">
                    <th className="px-4 py-2.5 text-left text-text-muted font-medium w-8">{t('dangerZone.rank')}</th>
                    <th className="px-4 py-2.5 text-left text-text-muted font-medium">{t('dangerZone.institution')}</th>
                    <th className="px-4 py-2.5 text-right text-text-muted font-medium">{t('dangerZone.totalValue')}</th>
                    <th className="px-4 py-2.5 text-right text-text-muted font-medium">{t('dangerZone.avgRisk')}</th>
                    <th className="px-4 py-2.5 text-right text-text-muted font-medium">{t('dangerZone.contracts')}</th>
                    <th className="px-4 py-2.5 text-right text-text-muted font-medium w-28" />
                  </tr>
                </thead>
                <tbody>
                  {dangerZone.map((inst, idx) => (
                    <tr key={inst.id ?? inst.name} className="border-b border-border/30 hover:bg-risk-high/5 transition-colors group">
                      <td className="px-4 py-2.5 text-text-muted">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-text-primary font-medium">{inst.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-primary">{formatCompactMXN(inst.total_flow)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-medium" style={{ color: riskToColor(inst.avg_risk) }}>
                          {inst.avg_risk != null ? `${(inst.avg_risk * 100).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary font-mono">{formatNumber(inst.contracts)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {inst.id && (
                          <button
                            onClick={() => navigate(`/institutions/${inst.id}`)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-risk-high hover:underline flex items-center gap-1 ml-auto"
                          >
                            {t('dangerZone.investigate')}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function FactorFrequencyChart({ data, t }: { data: RiskFactorFrequency[]; t: TFunction }) {
  const allData = useMemo(() => consolidateFactors(data, t).sort((a, b) => b.count - a.count), [data, t])
  const chartData = allData.slice(0, 15)
  const chartHeight = Math.min(600, Math.max(300, chartData.length * 36))

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          tickFormatter={(v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
            return String(v)
          }}
          axisLine={{ stroke: 'var(--color-border)' }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const d = payload[0].payload
            return (
              <div className="rounded-lg border border-border/50 bg-background-card px-3 py-2 shadow-lg text-xs">
                <p className="font-medium text-text-primary mb-1">{d.label}</p>
                <p className="text-text-secondary">{formatNumber(d.count)} contracts ({d.percentage.toFixed(1)}%)</p>
                <p className="text-text-muted">Avg Risk: {(d.avg_risk_score * 100).toFixed(1)}%</p>
              </div>
            )
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={riskScoreToColor(entry.avg_risk_score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function CooccurrenceHeatmap({ cooccurrences, factors, t }: { cooccurrences: FactorCooccurrence[]; factors: string[]; t: TFunction }) {
  const filtered = useMemo(() => cooccurrences.filter(c => c.lift > 1.0), [cooccurrences])

  const liftMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of filtered) {
      m.set(`${c.factor_a}|${c.factor_b}`, c.lift)
      m.set(`${c.factor_b}|${c.factor_a}`, c.lift)
    }
    return m
  }, [filtered])

  const relevantFactors = useMemo(() => {
    const seen = new Set<string>()
    for (const c of filtered) { seen.add(c.factor_a); seen.add(c.factor_b) }
    return factors.filter(f => seen.has(f))
  }, [factors, filtered])

  if (relevantFactors.length === 0) {
    return <div className="flex items-center justify-center h-32 text-text-muted text-sm">No co-occurrence data</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs" role="grid" aria-label="Risk factor co-occurrence heatmap">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background-card z-10 p-1.5 text-left text-text-muted font-normal min-w-[100px]" />
            {relevantFactors.map(f => (
              <th key={f} className="p-1.5 text-center text-text-muted font-normal" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', minWidth: 28 }}>
                {getFactorLabel(f, t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relevantFactors.map(rowFactor => (
            <tr key={rowFactor}>
              <td className="sticky left-0 bg-background-card z-10 p-1.5 text-text-secondary font-medium whitespace-nowrap pr-3">
                {getFactorLabel(rowFactor, t)}
              </td>
              {relevantFactors.map(colFactor => {
                const lift = liftMap.get(`${rowFactor}|${colFactor}`)
                return (
                  <td key={colFactor} className="p-0.5 text-center" title={lift != null ? `Lift: ${lift.toFixed(2)}` : '—'}>
                    {rowFactor === colFactor ? (
                      <div className="w-7 h-7 rounded flex items-center justify-center bg-border/20 text-text-muted">—</div>
                    ) : lift != null ? (
                      <div className={cn('w-7 h-7 rounded flex items-center justify-center text-xs font-medium', liftToColor(lift))}>
                        {lift.toFixed(1)}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded bg-border/10" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
