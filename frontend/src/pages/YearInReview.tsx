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
import { SECTORS } from '@/lib/constants'
import { analysisApi, vendorApi, institutionApi } from '@/api/client'
import type { YearOverYearChange, SectorYearItem } from '@/api/types'
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

// =============================================================================
// Constants
// =============================================================================

const ALL_YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2025 - i) // 2025 down to 2002

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

  // Top vendors and institutions — global top (year filter not exposed by /vendors/top API)
  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', 5],
    queryFn: () => vendorApi.getTop('value', 5),
    staleTime: 5 * 60 * 1000,
  })

  const { data: institutionsResp, isLoading: instsLoading } = useQuery({
    queryKey: ['institutions', 'top', 'spending', 5],
    queryFn: () => institutionApi.getTop('spending', 5),
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
        nameEN: sector.nameEN,
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
  }, [sectorYearData, validYear])

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
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              title={t('heroStats.totalSpending')}
              value={yearRow ? formatCompactMXN(yearRow.total_value) : '—'}
              icon={BarChart3}
              accentColor={adminMeta.color}
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
            <p className="text-xs text-text-muted mt-0.5">{t('topVendors.subtitle')} (all-time)</p>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (vendorsResp?.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : (
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
                    <tr key={v.vendor_id} className="border-b border-border/10 hover:bg-card-hover/30">
                      <td className="py-2 pr-2 text-xs font-mono text-text-muted">{v.rank}</td>
                      <td className="py-2 text-xs text-text-secondary truncate max-w-[180px]">
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
            )}
          </CardContent>
        </Card>

        {/* Top 5 Institutions */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('topInstitutions.title')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-0.5">{t('topInstitutions.subtitle')} (all-time)</p>
          </CardHeader>
          <CardContent>
            {instsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (institutionsResp?.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">{t('noData')}</div>
            ) : (
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
                  {(institutionsResp?.data ?? []).slice(0, 5).map((inst) => (
                    <tr key={inst.institution_id} className="border-b border-border/10 hover:bg-card-hover/30">
                      <td className="py-2 pr-2 text-xs font-mono text-text-muted">{inst.rank}</td>
                      <td className="py-2 text-xs text-text-secondary truncate max-w-[180px]">
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
            )}
          </CardContent>
        </Card>
      </div>

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
                    <span className="text-xs text-text-secondary flex-1 truncate">{s.nameEN}</span>
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
                        {s.nameEN}
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
