/**
 * Year in Review — Comprehensive annual procurement summary
 *
 * Shows hero stats, top vendors/institutions, sector growth ranking,
 * risk level breakdown, and administration context for a selected year.
 */

import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { analysisApi, vendorApi, institutionApi } from '@/api/client'
import type { YearOverYearChange, SectorYearItem } from '@/api/types'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from '@/components/charts'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Landmark,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { SeasonalityCalendar } from '@/components/charts/SeasonalityCalendar'

// =============================================================================
// Constants
// =============================================================================

const ALL_YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2025 - i) // 2025 down to 2002

const SECTOR_YOY_DATA = [
  { year: 2010, salud: 35670, infraestructura: 23377, energia: 52351, educacion: 19930, hacienda: 8730, otros: 15000 },
  { year: 2012, salud: 13872, infraestructura: 11149, energia: 15282, educacion: 7179, hacienda: 3195, otros: 8000 },
  { year: 2014, salud: 36049, infraestructura: 28626, energia: 39268, educacion: 19215, hacienda: 9953, otros: 12000 },
  { year: 2016, salud: 65667, infraestructura: 28202, energia: 26601, educacion: 27490, hacienda: 14686, otros: 18000 },
  { year: 2018, salud: 63058, infraestructura: 25256, energia: 3192, educacion: 26486, hacienda: 10440, otros: 15000 },
  { year: 2020, salud: 75371, infraestructura: 11963, energia: 2565, educacion: 16806, hacienda: 7007, otros: 9000 },
  { year: 2022, salud: 107031, infraestructura: 10335, energia: 3139, educacion: 22026, hacienda: 7114, otros: 11000 },
  { year: 2024, salud: 62117, infraestructura: 8452, energia: 1908, educacion: 20217, hacienda: 6936, otros: 8000 },
]

const SECTOR_AREA_KEYS = ['salud', 'infraestructura', 'energia', 'educacion', 'hacienda', 'otros'] as const

const DEFAULT_YEAR = 2024

interface AdminMeta {
  key: string
  color: string
  partyColor: string
}

function getAdminForYear(year: number): AdminMeta {
  if (year <= 2006) return { key: 'Fox', color: '#3b82f6', partyColor: '#002395' }
  if (year <= 2012) return { key: 'Calderon', color: '#fb923c', partyColor: '#002395' }
  if (year <= 2018) return { key: 'PenaNieto', color: '#f87171', partyColor: '#008000' }
  if (year <= 2024) return { key: 'AMLO', color: '#4ade80', partyColor: '#8B0000' }
  return { key: 'Sheinbaum', color: '#60a5fa', partyColor: '#8B0000' }
}

// =============================================================================
// Helper components
// =============================================================================

function YoyBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-text-muted text-xs">—</span>
  const isUp = pct > 0.5
  const isDown = pct < -0.5
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
  const color = isUp
    ? 'text-risk-critical'
    : isDown
    ? 'text-risk-low'
    : 'text-text-muted'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-mono', color)}>
      <Icon className="h-3 w-3" />
      {pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  )
}

// =============================================================================
// Main component
// =============================================================================

export default function YearInReview() {
  const { t } = useTranslation('yearinreview')
  const { t: ts } = useTranslation('sectors')
  const { year: yearParam } = useParams<{ year?: string }>()
  const navigate = useNavigate()

  const selectedYear = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR
  const validYear = ALL_YEARS.includes(selectedYear) ? selectedYear : DEFAULT_YEAR

  const handleYearChange = (y: number) => {
    navigate(`/year-in-review/${y}`, { replace: false })
  }

  // -- Data queries --

  const { data: yoyResp, isLoading: yoyLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 5 * 60 * 1000,
  })

  // Top vendors and institutions — filtered by selected year
  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', 10, validYear],
    queryFn: () => vendorApi.getTop('value', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: institutionsResp, isLoading: instsLoading } = useQuery({
    queryKey: ['institutions', 'top', 'spending', 10, validYear],
    queryFn: () => institutionApi.getTop('spending', 10, validYear),
    staleTime: 5 * 60 * 1000,
  })

  // Top vendors by risk for selected year
  const { data: riskVendorsResp } = useQuery({
    queryKey: ['vendors', 'top', 'risk', 10, validYear],
    queryFn: () => vendorApi.getTop('risk', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const yoyData: YearOverYearChange[] = yoyResp?.data ?? []
  const sectorYearData: SectorYearItem[] = sectorYearResp?.data ?? []

  // -- Derived data for selected year --

  const yearRow = useMemo(
    () => yoyData.find((y) => y.year === validYear),
    [yoyData, validYear]
  )

  const priorRow = useMemo(
    () => yoyData.find((y) => y.year === validYear - 1),
    [yoyData, validYear]
  )

  const spendingChangePct = useMemo(() => {
    if (!yearRow || !priorRow || priorRow.total_value === 0) return null
    return ((yearRow.total_value - priorRow.total_value) / priorRow.total_value) * 100
  }, [yearRow, priorRow])

  // Sector growth: compare current vs prior year for each sector
  const sectorGrowth = useMemo(() => {
    const currentRows = sectorYearData.filter((r) => r.year === validYear)
    const priorRows = sectorYearData.filter((r) => r.year === validYear - 1)
    if (currentRows.length === 0) return []
    return SECTORS.map((sector) => {
      const cur = currentRows.find((r) => r.sector_id === sector.id)
      const prev = priorRows.find((r) => r.sector_id === sector.id)
      const curVal = cur?.total_value ?? 0
      const prevVal = prev?.total_value ?? 0
      const growthPct = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 100 : null
      return {
        id: sector.id,
        name: ts(sector.code),
        code: sector.code,
        color: sector.color,
        curVal,
        prevVal,
        growthPct,
      }
    })
      .filter((s) => s.curVal > 0)
      .sort((a, b) => {
        // Sort by growthPct descending; nulls last
        if (a.growthPct == null) return 1
        if (b.growthPct == null) return -1
        return b.growthPct - a.growthPct
      })
  }, [sectorYearData, validYear, ts])

  const hasPriorSectorData = priorRow != null && sectorYearData.some((r) => r.year === validYear - 1)

  // Risk breakdown derived from yoyData — use yearRow directly
  const riskBreakdownRows = useMemo(() => {
    if (!yearRow) return null
    const total = yearRow.contracts
    if (total === 0) return null
    // yoyData only has high_risk_pct (critical+high combined into high_risk), no granular split
    // We'll show what's available: high+critical % from high_risk_pct
    const highRiskCount = Math.round((yearRow.high_risk_pct / 100) * total)
    const lowCount = total - highRiskCount
    return [
      { level: 'high' as const, label: t('riskBreakdown.high'), count: highRiskCount, pct: yearRow.high_risk_pct },
      { level: 'low' as const, label: t('riskBreakdown.low'), count: lowCount, pct: 100 - yearRow.high_risk_pct },
    ]
  }, [yearRow, t])

  const adminMeta = getAdminForYear(validYear)
  const isLoading = yoyLoading || syLoading

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary font-mono tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" aria-hidden="true" />
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-muted font-mono">{t('yearSelector')}</span>
          <select
            value={validYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className={cn(
              'rounded-md border border-border/50 bg-background-elevated px-3 py-1.5',
              'text-sm font-mono text-text-primary',
              'focus:outline-none focus:ring-1 focus:ring-accent',
              'cursor-pointer'
            )}
            aria-label={t('yearSelector')}
          >
            {ALL_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Administration context banner */}
      <motion.div
        className="flex items-center gap-3 rounded-lg border px-4 py-3"
        style={{
          borderColor: `${adminMeta.partyColor}40`,
          backgroundColor: `${adminMeta.partyColor}0a`,
        }}
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <Landmark className="h-4 w-4 flex-shrink-0" style={{ color: adminMeta.color }} aria-hidden="true" />
        <div>
          <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: adminMeta.color }}>
            {t('administrationBanner.title')}
          </span>
          <span className="mx-2 text-border">·</span>
          <span className="text-sm text-text-secondary">
            {t(`administrationBanner.${adminMeta.key}`)}
          </span>
        </div>
      </motion.div>

      {/* Hero stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <StatCard
              title={t('heroStats.totalContracts')}
              value={yearRow ? formatNumber(yearRow.contracts) : '—'}
              icon={FileText}
              accentColor={adminMeta.color}
              className="border-l-4 border-l-blue-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title={t('heroStats.totalSpending')}
              value={yearRow ? formatCompactMXN(yearRow.total_value) : '—'}
              icon={BarChart3}
              accentColor={adminMeta.color}
              className="border-l-4 border-l-violet-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title={t('heroStats.highRiskRate')}
              value={yearRow ? `${yearRow.high_risk_pct.toFixed(1)}%` : '—'}
              icon={AlertTriangle}
              accentColor={
                yearRow
                  ? yearRow.high_risk_pct >= 15
                    ? '#f87171'
                    : yearRow.high_risk_pct >= 8
                    ? '#fb923c'
                    : '#4ade80'
                  : adminMeta.color
              }
              subtitle={yearRow ? `${formatNumber(Math.round((yearRow.high_risk_pct / 100) * yearRow.contracts))} contracts` : undefined}
              className="border-l-4 border-l-orange-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title={t('heroStats.yoyChange')}
              value={
                spendingChangePct != null
                  ? `${spendingChangePct > 0 ? '+' : ''}${spendingChangePct.toFixed(1)}%`
                  : '—'
              }
              icon={spendingChangePct != null && spendingChangePct >= 0 ? TrendingUp : TrendingDown}
              accentColor={
                spendingChangePct == null
                  ? adminMeta.color
                  : spendingChangePct >= 0
                  ? '#4ade80'
                  : '#f87171'
              }
              subtitle={t('vsLastYear')}
              className={cn(
                'border-l-4',
                spendingChangePct == null
                  ? 'border-l-slate-500'
                  : spendingChangePct >= 0
                  ? 'border-l-emerald-500'
                  : 'border-l-red-500'
              )}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Top vendors + Top institutions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Vendors */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('topVendors.title')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('topVendors.subtitle')} · {validYear}</p>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (vendorsResp?.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-1.5 pr-2 text-xs text-text-muted font-normal w-8">{t('topVendors.rank')}</th>
                    <th className="text-left py-1.5 text-xs text-text-muted font-normal">{t('topVendors.vendor')}</th>
                    <th className="text-right py-1.5 px-2 text-xs text-text-muted font-normal">{t('topVendors.value')}</th>
                    <th className="text-right py-1.5 text-xs text-text-muted font-normal">{t('topVendors.contracts')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendorsResp?.data ?? []).map((v) => (
                    <tr key={v.vendor_id} className="border-b border-border/10 hover:bg-card-hover/30 cursor-pointer" onClick={() => navigate(`/vendors/${v.vendor_id}`)}>
                      <td className="py-2 pr-2 text-xs font-mono text-text-muted">{v.rank}</td>
                      <td className="py-2 text-xs text-text-secondary truncate max-w-[180px] hover:text-accent transition-colors">
                        {v.vendor_name}
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-mono text-text-primary">
                        {formatCompactMXN(v.metric_value)}
                      </td>
                      <td className="py-2 text-right text-xs font-mono text-text-muted">
                        {formatNumber(v.total_contracts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Institutions */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('topInstitutions.title')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('topInstitutions.subtitle')} · {validYear}</p>
          </CardHeader>
          <CardContent>
            {instsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (institutionsResp?.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-1.5 pr-2 text-xs text-text-muted font-normal w-8">{t('topInstitutions.rank')}</th>
                    <th className="text-left py-1.5 text-xs text-text-muted font-normal">{t('topInstitutions.institution')}</th>
                    <th className="text-right py-1.5 px-2 text-xs text-text-muted font-normal">{t('topInstitutions.value')}</th>
                    <th className="text-right py-1.5 text-xs text-text-muted font-normal">{t('topInstitutions.contracts')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(institutionsResp?.data ?? []).slice(0, 10).map((inst) => (
                    <tr key={inst.institution_id} className="border-b border-border/10 hover:bg-card-hover/30 cursor-pointer" onClick={() => navigate(`/institutions/${inst.institution_id}`)}>
                      <td className="py-2 pr-2 text-xs font-mono text-text-muted">{inst.rank}</td>
                      <td className="py-2 text-xs text-text-secondary truncate max-w-[180px] hover:text-accent transition-colors">
                        {inst.institution_name}
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-mono text-text-primary">
                        {formatCompactMXN(inst.metric_value)}
                      </td>
                      <td className="py-2 text-right text-xs font-mono text-text-muted">
                        {formatNumber(inst.total_contracts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top risk vendors for the year */}
      {(riskVendorsResp?.data ?? []).length > 0 && (
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#f87171]" aria-hidden="true" />
              {t('topRiskVendors.title')} · {validYear}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('topRiskVendors.subtitle')}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-1.5 pr-2 text-xs text-text-muted font-normal w-8">#</th>
                    <th className="text-left py-1.5 text-xs text-text-muted font-normal">Vendor</th>
                    <th className="text-right py-1.5 px-2 text-xs text-text-muted font-normal">Avg Risk</th>
                    <th className="text-right py-1.5 px-2 text-xs text-text-muted font-normal">Value</th>
                    <th className="text-right py-1.5 text-xs text-text-muted font-normal">Contracts</th>
                  </tr>
                </thead>
                <tbody>
                  {(riskVendorsResp?.data ?? []).map((v, i) => {
                    const score = v.avg_risk_score ?? 0
                    const riskColor = score >= 0.5 ? '#f87171' : score >= 0.3 ? '#fb923c' : '#fbbf24'
                    return (
                      <tr
                        key={v.vendor_id}
                        className="border-b border-border/10 hover:bg-card-hover/30 cursor-pointer"
                        onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                      >
                        <td className="py-2 pr-2 text-xs font-mono text-text-muted">{i + 1}</td>
                        <td className="py-2 text-xs text-text-secondary truncate max-w-[200px] hover:text-accent transition-colors">
                          {v.vendor_name}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span
                            className="inline-block text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                          >
                            {score.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-mono text-text-primary">
                          {formatCompactMXN(v.metric_value)}
                        </td>
                        <td className="py-2 text-right text-xs font-mono text-text-muted">
                          {formatNumber(v.total_contracts)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector growth + Risk breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sector Growth Ranking */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('sectorGrowth.title')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('sectorGrowth.subtitle')}</p>
          </CardHeader>
          <CardContent>
            {syLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7" />)}
              </div>
            ) : sectorGrowth.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : !hasPriorSectorData ? (
              <div className="space-y-2">
                {sectorGrowth.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs text-text-secondary flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-mono text-text-primary">{formatCompactMXN(s.curVal)}</span>
                    <span className="text-xs text-text-muted">—</span>
                  </div>
                ))}
                <p className="text-[10px] text-text-muted/60 italic mt-1">{t('sectorGrowth.noComparison')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sectorGrowth.map((s) => {
                  const isPos = s.growthPct != null && s.growthPct > 0
                  const isNeg = s.growthPct != null && s.growthPct < 0
                  // Bar width proportional to absolute growth, capped at full width
                  const maxAbsGrowth = Math.max(...sectorGrowth.map((x) => Math.abs(x.growthPct ?? 0)), 1)
                  const barWidth = s.growthPct != null
                    ? Math.min(100, (Math.abs(s.growthPct) / maxAbsGrowth) * 100)
                    : 0
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-xs text-text-secondary w-28 truncate flex-shrink-0">
                        {s.name}
                      </span>
                      <div className="flex-1 relative h-4 rounded overflow-hidden bg-background-elevated/30">
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 rounded transition-all',
                            isPos ? 'bg-emerald-500/30 left-0' : isNeg ? 'bg-red-500/30 left-0' : 'bg-border/30 left-0'
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <YoyBadge pct={s.growthPct} />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Level Breakdown */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('riskBreakdown.title')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('riskBreakdown.subtitle')}</p>
          </CardHeader>
          <CardContent>
            {yoyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !yearRow ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : !riskBreakdownRows ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('riskBreakdown.noData')}</div>
            ) : (
              <div className="space-y-3">
                {/* Simplified risk breakdown — yoy data only provides high_risk_pct aggregate */}
                {riskBreakdownRows.map((row) => (
                  <div key={row.level} className="flex items-center gap-3">
                    <RiskLevelPill level={row.level} />
                    <div className="flex-1 relative h-5 rounded overflow-hidden bg-background-elevated/30">
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded',
                          row.level === 'high' ? 'bg-orange-500/30' : 'bg-emerald-500/20'
                        )}
                        style={{ width: `${Math.max(1, row.pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-[100px] justify-end">
                      <span className="text-xs font-mono text-text-primary">{row.pct.toFixed(1)}%</span>
                      <span className="text-xs text-text-muted">({formatNumber(row.count)})</span>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-text-muted/50 italic mt-2">
                  Note: yearly data provides high-risk aggregate (critical + high combined).
                  Full four-level breakdown available in the Explore and Contracts pages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* December Effect — seasonal radial chart */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-text-primary flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#ef4444]" aria-hidden="true" />
            The December Effect
          </CardTitle>
          <p className="text-xs text-text-muted mt-0.5">
            Risk spikes 64% every December — the year-end budget dump (23-year aggregate)
          </p>
        </CardHeader>
        <CardContent>
          <SeasonalityCalendar />
        </CardContent>
      </Card>

      {/* Sector contribution stacked area chart */}
      <Card className="bg-slate-900/50 border border-white/5 rounded-xl">
        <CardHeader className="pb-2">
          <p className="text-sm font-semibold text-white/80 uppercase tracking-wider">Contract Volume by Sector</p>
          <p className="text-xs text-text-muted mt-0.5">Annual contract value distribution across top 6 sectors (billions MXN)</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={SECTOR_YOY_DATA} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}B`} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value: number | undefined, name: string | undefined) => [`${((value ?? 0) / 1000).toFixed(1)}B MXN`, name ?? '']}
              />
              {SECTOR_AREA_KEYS.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={SECTOR_COLORS[key] || '#64748b'}
                  fill={SECTOR_COLORS[key] || '#64748b'}
                  fillOpacity={0.6}
                  strokeWidth={1}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-white/50 italic mt-2">
            Health (salud) spending surged 70% from 2018 to 2022, driven by COVID-19 emergency procurement — now normalizing.
          </p>
        </CardContent>
      </Card>

      {/* Year navigation pills */}
      <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Year navigation">
        {ALL_YEARS.map((y) => (
          <button
            key={y}
            onClick={() => handleYearChange(y)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-mono transition-colors',
              y === validYear
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-text-muted hover:text-text-primary hover:bg-card-hover border border-transparent'
            )}
            aria-current={y === validYear ? 'page' : undefined}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  )
}
