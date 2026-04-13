/**
 * CategoryProfile — Full drill-down page for a single spending category.
 *
 * Route: /categories/:id
 * Editorial dark-mode aesthetic. Shows historical evolution, sexenio comparison,
 * market concentration, vendor-institution pairs, top contracts, and subcategories.
 */

import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { categoriesApi } from '@/api/client'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  Line,
  ComposedChart,
  Cell,
} from '@/components/charts'
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  AlertTriangle,
  Building2,
  User,
} from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'

// =============================================================================
// Types
// =============================================================================

interface CategoryStat {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: { id: number; name: string } | null
  top_institution: { id: number; name: string } | null
}

interface TrendItem {
  category_id: number
  name_es: string
  name_en: string
  year: number
  contracts: number
  value: number
  avg_risk: number
}

// =============================================================================
// Helpers
// =============================================================================

function getRiskColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return RISK_COLORS[level]
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text
}

const ADMIN_DISPLAY: Record<string, string> = {
  Fox: 'Fox',
  Calderon: 'Calderon',
  'Calderón': 'Calderon',
  'Pena Nieto': 'Pena Nieto',
  'Peña Nieto': 'Pena Nieto',
  AMLO: 'AMLO',
  Sheinbaum: 'Sheinbaum',
}

const ADMIN_ORDER = ['Fox', 'Calderon', 'Pena Nieto', 'AMLO', 'Sheinbaum']

function getConcentrationBadge(label: string, t: (key: string) => string) {
  switch (label) {
    case 'highly_concentrated':
      return { text: t('profile.concentration.high'), color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
    case 'moderately_concentrated':
      return { text: t('profile.concentration.moderate'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
    default:
      return { text: t('profile.concentration.competitive'), color: '#4ade80', bg: 'rgba(74,222,128,0.1)' }
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function CategoryProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('categories')
  const categoryId = Number(id)

  // Data queries
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['categories', 'trends', 2002, 2025],
    queryFn: () => categoriesApi.getTrends(2002, 2025),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sexenioData, isLoading: sexenioLoading } = useQuery({
    queryKey: ['categories', 'sexenio'],
    queryFn: () => categoriesApi.getSexenio(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: topVendorsData, isLoading: topVendorsLoading } = useQuery({
    queryKey: ['categories', 'top-vendors', categoryId],
    queryFn: () => categoriesApi.getTopVendors(categoryId),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorInstData, isLoading: vendorInstLoading } = useQuery({
    queryKey: ['categories', 'vendor-institution', categoryId],
    queryFn: () => categoriesApi.getVendorInstitution(categoryId, 20),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: topContractsData, isLoading: topContractsLoading } = useQuery({
    queryKey: ['categories', 'contracts', categoryId, 'top10'],
    queryFn: () => categoriesApi.getContracts(categoryId, { per_page: 10, sort_by: 'amount_mxn', sort_order: 'desc' }),
    enabled: !isNaN(categoryId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: subcategoryData, isLoading: subcategoryLoading } = useQuery({
    queryKey: ['categories', 'subcategories', categoryId],
    queryFn: () => categoriesApi.getSubcategories(categoryId),
    enabled: !isNaN(categoryId),
    staleTime: 10 * 60 * 1000,
  })

  // Derived data
  const category: CategoryStat | null = useMemo(() => {
    if (!summaryData?.data) return null
    return (summaryData.data as CategoryStat[]).find(c => c.category_id === categoryId) ?? null
  }, [summaryData, categoryId])

  const sectorColor = category?.sector_code ? (SECTOR_COLORS[category.sector_code] || '#64748b') : '#64748b'

  // Timeline data for this category
  const timelineData = useMemo(() => {
    if (!trendsData?.data) return []
    return (trendsData.data as TrendItem[])
      .filter(t => t.category_id === categoryId)
      .sort((a, b) => a.year - b.year)
  }, [trendsData, categoryId])

  // Sexenio data for this category
  const sexenioBarData = useMemo(() => {
    if (!sexenioData?.data) return []
    const catData = sexenioData.data.find(c => c.category_id === categoryId)
    if (!catData) return []

    return ADMIN_ORDER.map(admin => {
      // Find matching key in administrations
      const matchKey = Object.keys(catData.administrations).find(k => (ADMIN_DISPLAY[k] ?? k) === admin)
      const vals = matchKey ? catData.administrations[matchKey] : null
      return {
        admin,
        value: vals?.value ?? 0,
        contracts: vals?.contracts ?? 0,
        avg_risk: vals?.avg_risk ?? 0,
      }
    })
  }, [sexenioData, categoryId])

  // Subcategory bar data
  const subcatBarData = useMemo(() => {
    if (!subcategoryData?.data) return []
    return [...subcategoryData.data]
      .filter(s => !s.is_catch_all && s.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 15)
  }, [subcategoryData])

  // 404 state
  if (!summaryLoading && !category) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
          {t('profile.notFound.title')}
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {t('profile.notFound.description', { id })}
        </p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('profile.notFound.backLink')}
        </Link>
      </div>
    )
  }

  const riskLevel = category ? getRiskLevelFromScore(category.avg_risk) : 'low'
  const riskColor = category ? getRiskColor(category.avg_risk) : '#4ade80'
  const daPct = category?.direct_award_pct ?? 0
  const daColor = daPct > 50 ? '#f87171' : daPct > 25 ? '#fbbf24' : '#4ade80'

  const topContracts = (topContractsData?.data ?? []) as Array<{
    id: number
    title: string | null
    amount_mxn: number
    contract_year: number | null
    risk_score: number
    risk_level: string | null
    vendor_name: string | null
    vendor_id: number | null
    institution_name: string | null
  }>

  return (
    <div className="space-y-8 pb-12">
      {/* ================================================================= */}
      {/* 1. Back navigation + Header                                       */}
      {/* ================================================================= */}
      <div>
        <Link
          to="/categories"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('profile.breadcrumb')}
        </Link>

        {summaryLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-5 w-48" />
          </div>
        ) : category ? (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-2xl font-bold text-text-primary leading-tight"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {category.name_es || category.name_en}
              </h1>
              {category.sector_code && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                  style={{
                    color: sectorColor,
                    backgroundColor: `${sectorColor}15`,
                    border: `1px solid ${sectorColor}30`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectorColor }} />
                  {category.sector_code}
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/60">
              COMPRANET 2002-2025
            </p>
          </div>
        ) : null}
      </div>

      {/* ================================================================= */}
      {/* 2. KPI Strip                                                      */}
      {/* ================================================================= */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : category ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20 rounded-xl overflow-hidden">
          <div className="bg-background-card px-5 py-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('profile.kpi.totalAmount')}</p>
            <p className="text-2xl font-mono font-bold text-text-primary leading-tight">
              {formatCompactMXN(category.total_value)}
            </p>
          </div>
          <div className="bg-background-card px-5 py-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('profile.kpi.contracts')}</p>
            <p className="text-2xl font-mono font-bold text-text-primary leading-tight">
              {formatNumber(category.total_contracts)}
            </p>
            <p className="text-[10px] text-text-muted/50 font-mono mt-0.5">
              {t('profile.kpi.avgAmount', { value: formatCompactMXN(category.total_contracts > 0 ? category.total_value / category.total_contracts : 0) })}
            </p>
          </div>
          <div className="bg-background-card px-5 py-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('profile.kpi.avgRisk')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold leading-tight" style={{ color: riskColor }}>
                {(category.avg_risk * 100).toFixed(1)}%
              </p>
              <span
                className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded"
                style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
              >
                {riskLevel}
              </span>
            </div>
          </div>
          <div className="bg-background-card px-5 py-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('profile.kpi.directAward')}</p>
            <p className="text-2xl font-mono font-bold leading-tight" style={{ color: daColor }}>
              {daPct.toFixed(0)}%
            </p>
            {daPct > 25 && (
              <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                {t('profile.kpi.oecd')}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* ================================================================= */}
      {/* 3. Historical Timeline                                            */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('profile.sections.eyebrow')}{t('profile.sections.timeline')}
          </p>
          <h2
            className="text-lg font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('profile.sections.timelineSubtitle')}
          </h2>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {trendsLoading ? (
              <ChartSkeleton height={320} type="area" />
            ) : timelineData.length > 0 ? (
              <div style={{ height: 320 }} role="img" aria-label="Area chart showing contract value and risk score trends over time">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 10, right: 40, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="value"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCompactMXN(v)}
                      width={72}
                    />
                    <YAxis
                      yAxisId="risk"
                      orientation="right"
                      domain={[0, 0.6]}
                      tick={{ fill: '#fb923c', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: '#fb923c30' }}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      width={45}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg space-y-1"
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                          >
                            <p className="font-bold text-text-primary">{label}</p>
                            {payload.map((p, i) => (
                              <p key={i} style={{ color: String(p.color) }}>
                                {p.name === 'value' ? t('profile.tooltip.spend') : t('profile.tooltip.risk')}:{' '}
                                <span className="font-bold">
                                  {p.name === 'value' ? formatCompactMXN(Number(p.value)) : `${(Number(p.value) * 100).toFixed(1)}%`}
                                </span>
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Area
                      yAxisId="value"
                      type="monotone"
                      dataKey="value"
                      fill={sectorColor}
                      fillOpacity={0.15}
                      stroke={sectorColor}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="risk"
                      type="monotone"
                      dataKey="avg_risk"
                      stroke="#fb923c"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r: 2, fill: '#fb923c', strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-text-muted text-sm">
                {t('profile.empty.noTrend')}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* 4. Sexenio Comparison                                             */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('profile.sections.eyebrow')}{t('profile.sections.byAdmin')}
          </p>
          <h2
            className="text-lg font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('profile.sections.byAdminSubtitle')}
          </h2>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {sexenioLoading ? (
              <ChartSkeleton height={280} />
            ) : sexenioBarData.length > 0 && sexenioBarData.some(d => d.value > 0) ? (
              <div style={{ height: 280 }} role="img" aria-label="Bar chart showing contract value by presidential administration">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sexenioBarData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                      dataKey="admin"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCompactMXN(v)}
                      width={72}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as (typeof sexenioBarData)[0] | undefined
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg space-y-1"
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                          >
                            <p className="font-bold text-text-primary">{label}</p>
                            <p className="text-text-secondary">{t('profile.adminTooltip.spend')} <span className="font-bold text-text-primary">{formatCompactMXN(d?.value ?? 0)}</span></p>
                            <p className="text-text-secondary">{t('profile.adminTooltip.contracts')} <span className="text-text-primary">{formatNumber(d?.contracts ?? 0)}</span></p>
                            <p className="text-text-secondary">{t('profile.adminTooltip.risk')} <span className="font-bold" style={{ color: getRiskColor(d?.avg_risk ?? 0) }}>{((d?.avg_risk ?? 0) * 100).toFixed(1)}%</span></p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {sexenioBarData.map((_entry, index) => (
                        <Cell
                          key={`admin-${index}`}
                          fill={sectorColor}
                          fillOpacity={0.3 + (index / (sexenioBarData.length - 1)) * 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-text-muted text-sm">
                {t('profile.empty.noAdmin')}
              </div>
            )}
            <p className="text-[10px] text-text-muted/50 mt-2 font-mono">
              {t('profile.footnote')}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* 5. Market Concentration (Top Vendors)                             */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('profile.sections.eyebrow')}{t('profile.sections.concentration')}
          </p>
          <h2
            className="text-lg font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('profile.sections.concentrationSubtitle')}
          </h2>
        </div>
        <Card>
          {topVendorsLoading ? (
            <CardContent className="space-y-3 py-6">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </CardContent>
          ) : topVendorsData ? (
            <>
              {/* Concentration header */}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const badge = getConcentrationBadge(topVendorsData.concentration_label, t)
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider"
                        style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.color}30` }}
                      >
                        {badge.text}
                      </span>
                    )
                  })()}
                  <span className="text-xs text-text-muted font-mono">
                    HHI: {topVendorsData.hhi.toFixed(0)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {t('profile.concentrationMarket', { pct: topVendorsData.top3_share_pct.toFixed(1) })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
                  <span className="w-6 flex-shrink-0">#</span>
                  <span className="flex-1 min-w-0">{t('profile.table.vendor')}</span>
                  <span className="w-28 text-right flex-shrink-0">{t('profile.table.share')}</span>
                  <span className="w-20 text-right flex-shrink-0 hidden md:block">{t('profile.table.amount')}</span>
                  <span className="w-14 text-right flex-shrink-0 hidden md:block">{t('profile.table.contracts')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.risk')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.directAward')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {topVendorsData.data.map((v, idx) => {
                    const vendorRiskColor = getRiskColor(v.avg_risk)
                    return (
                      <div
                        key={v.vendor_id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 hover:bg-background-elevated/40 transition-colors group',
                          idx === 0 && v.market_share_pct > 20 && 'border-l-2 border-l-amber-500/60',
                        )}
                      >
                        <span className="text-[11px] text-text-muted/40 font-mono w-6 flex-shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                            className="text-xs font-semibold text-text-primary hover:text-accent truncate max-w-[240px] transition-colors flex items-center gap-1"
                          >
                            {truncate(v.vendor_name, 35)}
                            <ArrowUpRight className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <div className="w-28 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-border/20 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(v.market_share_pct, 100)}%`,
                                  backgroundColor: vendorRiskColor,
                                  opacity: 0.7,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold tabular-nums text-text-primary">
                              {v.market_share_pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <span className="w-20 text-right text-xs font-mono text-text-secondary tabular-nums flex-shrink-0 hidden md:block">
                          {formatCompactMXN(v.vendor_value)}
                        </span>
                        <span className="w-14 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden md:block">
                          {formatNumber(v.contract_count)}
                        </span>
                        <span
                          className="w-12 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden lg:block"
                          style={{ color: vendorRiskColor }}
                        >
                          {(v.avg_risk * 100).toFixed(0)}%
                        </span>
                        <span className="w-12 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden lg:block">
                          {v.direct_award_pct.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-8 text-center text-text-muted text-sm">
              {t('profile.empty.noVendors')}
            </CardContent>
          )}
        </Card>
      </section>

      {/* ================================================================= */}
      {/* 6. Vendor-Institution Pairs                                       */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('profile.sections.eyebrow')}{t('profile.sections.relations')}
          </p>
          <h2
            className="text-lg font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('profile.sections.relationsSubtitle')}
          </h2>
        </div>
        <Card>
          <CardContent className="p-0">
            {vendorInstLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (vendorInstData?.data?.length ?? 0) > 0 ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
                  <span className="w-4 flex-shrink-0">#</span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span>{t('profile.table.vendor')}</span>
                    <span className="text-text-muted/30">&rarr;</span>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span>{t('profile.table.institution')}</span>
                  </div>
                  <span className="w-20 text-right flex-shrink-0">{t('profile.table.amount')}</span>
                  <span className="w-14 text-right flex-shrink-0 hidden md:block">{t('profile.table.contracts')}</span>
                  <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('profile.table.risk')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {vendorInstData!.data.map((pair, idx) => {
                    const maxVal = vendorInstData!.data[0]?.total_value ?? 1
                    return (
                      <div
                        key={`${pair.vendor_id}-${pair.institution_id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-background-elevated/40 transition-colors group"
                      >
                        <span className="text-[11px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <button
                              onClick={() => navigate(`/vendors/${pair.vendor_id}`)}
                              className="text-xs font-semibold text-text-primary hover:text-accent truncate max-w-[180px] transition-colors"
                            >
                              {truncate(pair.vendor_name, 30)}
                            </button>
                            <span className="text-text-muted/30 text-xs flex-shrink-0">&rarr;</span>
                            <span className="text-xs text-text-secondary truncate max-w-[160px]">
                              {truncate(pair.institution_name, 28)}
                            </span>
                          </div>
                          <div className="h-0.5 bg-border/20 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((pair.total_value / maxVal) * 100, 100)}%`,
                                backgroundColor: getRiskColor(pair.avg_risk),
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-20 text-right text-xs font-black font-mono text-text-primary tabular-nums flex-shrink-0">
                          {formatCompactMXN(pair.total_value)}
                        </span>
                        <span className="w-14 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden md:block">
                          {formatNumber(pair.contract_count)}
                        </span>
                        <span
                          className="w-12 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden lg:block"
                          style={{ color: getRiskColor(pair.avg_risk) }}
                        >
                          {(pair.avg_risk * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('profile.empty.noRelations')}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* 7. Top Contracts                                                  */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('profile.sections.eyebrow')}{t('profile.sections.contracts')}
          </p>
          <h2
            className="text-lg font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('profile.sections.contractsSubtitle')}
          </h2>
        </div>
        <Card>
          <CardContent className="p-0">
            {topContractsLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topContracts.length > 0 ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
                  <span className="w-4 flex-shrink-0">#</span>
                  <span className="flex-1 min-w-0">{t('profile.table.description')}</span>
                  <span className="w-20 text-right flex-shrink-0">{t('profile.table.amount')}</span>
                  <span className="w-24 text-right flex-shrink-0 hidden md:block">{t('profile.table.vendor')}</span>
                  <span className="w-10 text-right flex-shrink-0 hidden md:block">{t('profile.table.year')}</span>
                  <span className="w-14 text-right flex-shrink-0">{t('profile.table.risk')}</span>
                </div>
                <div className="divide-y divide-border/10">
                  {topContracts.map((c, idx) => {
                    const contractRiskColor = getRiskColor(c.risk_score ?? 0)
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-background-elevated/30 transition-colors"
                      >
                        <span className="text-[10px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary truncate">{truncate(c.title ?? t('profile.actions.noTitle'), 60)}</p>
                          {c.institution_name && (
                            <p className="text-[10px] text-text-muted/50 font-mono mt-0.5 truncate">{truncate(c.institution_name, 40)}</p>
                          )}
                        </div>
                        <span className="w-20 text-right text-xs font-mono font-bold text-text-primary tabular-nums flex-shrink-0">
                          {formatCompactMXN(c.amount_mxn ?? 0)}
                        </span>
                        <span className="w-24 text-right text-xs text-text-muted truncate flex-shrink-0 hidden md:block">
                          {c.vendor_id ? (
                            <button
                              onClick={() => navigate(`/vendors/${c.vendor_id}`)}
                              className="hover:text-accent transition-colors"
                            >
                              {truncate(c.vendor_name ?? '---', 18)}
                            </button>
                          ) : '---'}
                        </span>
                        <span className="w-10 text-right text-[10px] text-text-muted font-mono flex-shrink-0 hidden md:block">
                          {c.contract_year ?? '---'}
                        </span>
                        <span
                          className="w-14 text-right text-[10px] font-mono uppercase flex-shrink-0"
                          style={{ color: contractRiskColor }}
                        >
                          {c.risk_level ?? '---'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('profile.empty.noContracts')}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-2">
          <button
            onClick={() => navigate(`/contracts?category_id=${categoryId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors font-mono uppercase tracking-wide"
          >
            <ExternalLink className="h-3 w-3" />
            {t('profile.actions.viewAll')}
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 8. Subcategories                                                  */}
      {/* ================================================================= */}
      {(subcategoryLoading || (subcatBarData.length > 0)) && (
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
              RUBLI · Subcategorias
            </p>
            <h2
              className="text-lg font-bold text-text-primary leading-tight"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              Desglose por subcategoria
            </h2>
          </div>
          <Card>
            <CardContent className="pt-6 pb-4">
              {subcategoryLoading ? (
                <ChartSkeleton height={320} />
              ) : subcatBarData.length > 0 ? (
                <div style={{ height: Math.max(200, subcatBarData.length * 28 + 60) }} role="img" aria-label="Bar chart showing contract value by subcategory">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={subcatBarData.map(s => ({
                        name: truncate(s.name_es || s.name_en, 30),
                        value: s.total_value,
                        avg_risk: s.avg_risk,
                      }))}
                      margin={{ top: 4, right: 100, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                      <XAxis
                        type="number"
                        dataKey="value"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                        tickFormatter={(v: number) => formatCompactMXN(v)}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={180}
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload as { name: string; value: number; avg_risk: number }
                          return (
                            <div
                              className="rounded-lg border p-3 text-xs font-mono shadow-lg"
                              style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                            >
                              <p className="font-bold text-text-primary mb-1">{d.name}</p>
                              <p className="text-text-secondary">{formatCompactMXN(d.value)}</p>
                              <p style={{ color: getRiskColor(d.avg_risk) }}>Riesgo: {(d.avg_risk * 100).toFixed(1)}%</p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
                        {subcatBarData.map((_entry, index) => (
                          <Cell
                            key={`subcat-${index}`}
                            fill={sectorColor}
                            fillOpacity={0.7}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                  Sin subcategorias disponibles.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ================================================================= */}
      {/* Footer                                                            */}
      {/* ================================================================= */}
      <div className="pt-2">
        <FuentePill source="COMPRANET 2002-2025" />
      </div>
    </div>
  )
}
