/**
 * Spending Categories — Editorial Redesign
 *
 * NYT/WaPo investigative journalism aesthetic.
 * Sections: Editorial headline, HallazgoStats, Lede, Category table,
 * Banderas Rojas, Charts, ImpactoHumano, drill-down panels.
 */

import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'
import { categoriesApi } from '@/api/client'
import { motion } from 'framer-motion'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from '@/components/charts'
import {
  TrendingUp,
  ArrowUpRight,
  SlidersHorizontal,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  X,
  Building2,
  User,
  Flag,
  Search,
  Layers,
  Zap,
} from 'lucide-react'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { SECTORS } from '@/lib/constants'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
import { CategoryRanking } from '@/components/charts/CategoryRanking'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

// Helper: map sector code string to integer sector_id for API queries
function getSectorId(code: string | null): number | null {
  if (!code) return null
  return SECTORS.find(s => s.code === code)?.id ?? null
}

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

interface TopContractItem {
  id: number
  title: string | null
  amount_mxn: number
  contract_date: string | null
  contract_year: number | null
  risk_score: number
  risk_level: string | null
  is_direct_award: boolean
  is_single_bid: boolean
  vendor_name: string | null
  vendor_id: number | null
  institution_name: string | null
  institution_id: number | null
}

type SortField = 'total_contracts' | 'total_value' | 'avg_risk' | 'direct_award_pct'
type SortDir = 'asc' | 'desc'

// =============================================================================
// Helpers
// =============================================================================

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

/** Pick the right locale name from API objects that carry both name_es and name_en */
function localeName(cat: { name_en: string; name_es: string }, lang: string): string {
  return lang === 'en' ? (cat.name_en || cat.name_es) : (cat.name_es || cat.name_en)
}

function getRiskColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return RISK_COLORS[level]
}

function getRiskLabel(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level.charAt(0).toUpperCase() + level.slice(1)
}


// =============================================================================
// Mini sparkline for category table rows
// =============================================================================

interface MiniSparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
}

function MiniSparkline({ values, color = '#58a6ff', width = 56, height = 20 }: MiniSparklineProps) {
  if (!values.length || values.every(v => v === 0)) {
    return <span className="text-[9px] text-text-muted font-mono">&mdash;</span>
  }
  const max = Math.max(...values)
  if (max === 0) return <span className="text-[9px] text-text-muted font-mono">&mdash;</span>

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1
    const y = height - 2 - ((v / max) * (height - 4)) + 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastVal = values[values.length - 1]
  const firstNonZero = values.find(v => v > 0) ?? 0
  const trend = lastVal > firstNonZero * 1.1 ? 'up' : lastVal < firstNonZero * 0.9 ? 'down' : 'flat'
  const trendColor = trend === 'up' ? '#fb923c' : trend === 'down' ? '#4ade80' : color

  return (
    <svg
      width={width}
      height={height}
      className="flex-shrink-0"
      aria-label={`5-year trend: ${values.map(v => formatCompactMXN(v)).join(', ')}`}
      role="img"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      {values.length > 0 && (() => {
        const lastX = width - 1
        const lastY = height - 2 - ((lastVal / max) * (height - 4)) + 1
        return <circle cx={lastX} cy={lastY} r={2} fill={trendColor} />
      })()}
    </svg>
  )
}

// =============================================================================
// Year range constants
// =============================================================================

const MIN_YEAR = 2002
const MAX_YEAR = new Date().getFullYear()

// SECTOR_OPTIONS is now defined inside the main component so it can use t()

// =============================================================================
// Vendor x Institution Panel
// =============================================================================

interface VendorInstPair {
  vendor_id: number
  vendor_name: string
  institution_id: number
  institution_name: string
  contract_count: number
  total_value: number
  avg_risk: number
  max_risk: number
  direct_award_pct: number
  single_bid_pct: number
}

function CategoryDetailPanel({
  categoryId,
  categoryName,
  sectorId,
  pairs,
  loading,
  onClose,
  onNavigate,
  topContracts = [],
  topContractsLoading = false,
}: {
  categoryId: number
  categoryName: string
  sectorId: number | null
  pairs: VendorInstPair[]
  loading: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  topContracts?: TopContractItem[]
  topContractsLoading?: boolean
}) {
  const { t } = useTranslation('spending')
  const maxValue = pairs[0]?.total_value ?? 1

  return (
    <Card className="border-accent/20 bg-accent/[0.02] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold text-text-primary truncate">{categoryName}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t('detail.vendorInstitutionRelations')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onNavigate(`/categories/${categoryId}`)}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 px-2 py-1 rounded"
            >
              <ExternalLink className="h-3 w-3" />
              {t('detail.viewFullProfile')}
            </button>
            <button
              onClick={() => onNavigate(`/contracts?category_id=${categoryId}`)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors border border-accent/30 px-2 py-1 rounded"
            >
              <ExternalLink className="h-3 w-3" />
              {t('detail.viewContracts')}
            </button>
            {sectorId && (
              <button
                onClick={() => onNavigate(`/investigation?sector_id=${sectorId}`)}
                className="flex items-center gap-1 text-xs text-[#f87171] hover:text-[#fca5a5] transition-colors border border-[#f87171]/30 px-2 py-1 rounded"
                title={t('detail.viewCasesTitle')}
              >
                <ExternalLink className="h-3 w-3" />
                {t('detail.viewCases')}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label={t('detail.closePanel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Top 5 most expensive contracts */}
        {(topContractsLoading || topContracts.length > 0) && (
          <div className="border-b border-border/20">
            <div className="px-4 py-2 bg-background-elevated/20 border-b border-border/10">
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">{t('detail.mostExpensiveContracts')}</p>
            </div>
            {topContractsLoading ? (
              <div className="space-y-1.5 p-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="divide-y divide-border/10">
                {topContracts.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2 hover:bg-background-elevated/30 transition-colors">
                    <span className="text-[10px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary truncate">{truncate(c.title ?? '—', 50)}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted/50 font-mono">
                        <span>{c.contract_year ?? '—'}</span>
                        {c.vendor_name && <><span>·</span><span className="truncate max-w-[160px]">{truncate(c.vendor_name, 28)}</span></>}
                        {c.is_direct_award && <span className="text-orange-400/80">AD</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono font-bold text-text-primary tabular-nums">{formatCompactMXN(c.amount_mxn ?? 0)}</p>
                      {c.risk_level && (
                        <span className="text-[9px] font-mono uppercase" style={{ color: getRiskColor(c.risk_score ?? 0) }}>
                          {c.risk_level}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : pairs.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-8 px-4">
            {t('table.noPairData')}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
              <span className="w-4 flex-shrink-0">#</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <User className="h-3 w-3 flex-shrink-0" />
                <span>{t('detail.vendor')}</span>
                <span className="text-text-muted/30">&rarr;</span>
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>{t('detail.institution')}</span>
              </div>
              <span className="w-20 text-right flex-shrink-0">{t('detail.amount')}</span>
              <span className="w-14 text-right flex-shrink-0 hidden md:block">{t('detail.contracts')}</span>
              <span className="w-12 text-right flex-shrink-0 hidden lg:block">{t('detail.risk')}</span>
              <span className="w-12 text-right flex-shrink-0 hidden xl:block">AD%</span>
            </div>
            <div className="divide-y divide-border/10">
              {pairs.map((pair, idx) => (
                <div
                  key={`${pair.vendor_id}-${pair.institution_id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-background-elevated/40 transition-colors group"
                >
                  <span className="text-[11px] text-text-muted/40 font-mono w-4 flex-shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <button
                        onClick={() => onNavigate(`/vendors/${pair.vendor_id}`)}
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
                          width: `${Math.min((pair.total_value / maxValue) * 100, 100)}%`,
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
                  <span className="w-12 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0 hidden xl:block">
                    {pair.direct_award_pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Category Summary Card — prominent stats when a category is selected
// =============================================================================

function CategorySummaryCard({
  category,
  onClose,
  onNavigate,
  trendItems = [],
}: {
  category: CategoryStat
  onClose: () => void
  onNavigate: (path: string) => void
  trendItems?: TrendItem[]
}) {
  const { t, i18n } = useTranslation('spending')
  const riskLevel = getRiskLevelFromScore(category.avg_risk)
  const riskColor = RISK_COLORS[riskLevel]
  const sectorColor = category.sector_code ? (SECTOR_COLORS[category.sector_code] || '#64748b') : '#64748b'
  const isHighDA = category.direct_award_pct >= 70
  const isOECDViolation = category.direct_award_pct > 25

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.03] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-accent/20 bg-accent/[0.05]">
        <div className="flex items-center gap-3 min-w-0">
          {category.sector_code && (
            <span
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: sectorColor }}
            />
          )}
          <h3 className="text-sm font-bold text-text-primary truncate" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {localeName(category, i18n.language)}
          </h3>
          {category.sector_code && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60 px-1.5 py-0.5 rounded bg-background-elevated/50 flex-shrink-0">
              {category.sector_code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onNavigate(`/contracts?category_id=${category.category_id}`)}
            className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors border border-accent/30 px-2 py-1 rounded font-mono uppercase tracking-wider"
          >
            <ExternalLink className="h-3 w-3" />
            {t('detail.contracts')}
          </button>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label={t('detail.closePanel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border/10">
        {/* Total Value */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('detail.totalAmount')}</p>
          <p className="text-xl font-mono font-bold text-text-primary leading-tight">
            {formatCompactMXN(category.total_value)}
          </p>
        </div>

        {/* Contract Count */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('detail.contracts')}</p>
          <p className="text-xl font-mono font-bold text-text-primary leading-tight">
            {formatNumber(category.total_contracts)}
          </p>
          <p className="text-[10px] text-text-muted/50 mt-0.5 font-mono">
            ~{formatCompactMXN(category.total_contracts > 0 ? category.total_value / category.total_contracts : 0)} {t('detail.avg')}
          </p>
        </div>

        {/* Avg Risk */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('detail.avgRisk')}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-mono font-bold leading-tight" style={{ color: riskColor }}>
              {(category.avg_risk * 100).toFixed(1)}%
            </p>
            <span
              className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded"
              style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
            >
              {riskLevel}
            </span>
          </div>
          {/* Risk bar */}
          <div className="h-1.5 bg-border/20 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(category.avg_risk * 100, 100)}%`,
                backgroundColor: riskColor,
              }}
            />
          </div>
        </div>

        {/* Direct Award % */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('detail.directAwardLabel')}</p>
          <p
            className="text-xl font-mono font-bold leading-tight"
            style={{ color: isHighDA ? '#fb923c' : 'var(--color-text-primary)' }}
          >
            {category.direct_award_pct != null ? `${category.direct_award_pct.toFixed(0)}%` : '—'}
          </p>
          {isOECDViolation && (
            <p className="text-[10px] text-cyan-400 mt-0.5 font-mono">
              {t('detail.oecdLimit')}
            </p>
          )}
          {/* DA bar */}
          <div className="h-1.5 bg-border/20 rounded-full overflow-hidden mt-2 relative">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(category.direct_award_pct ?? 0, 100)}%`,
                backgroundColor: isHighDA ? '#fb923c' : '#3b82f6',
              }}
            />
            {/* OECD marker at 25% */}
            <div
              className="absolute top-0 bottom-0 w-px bg-cyan-400/60"
              style={{ left: '25%' }}
              title={t('detail.oecdLimit')}
            />
          </div>
        </div>

        {/* Top Vendor */}
        <div className="bg-background-card px-4 py-3.5 col-span-2 md:col-span-1">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">{t('detail.topVendor')}</p>
          {category.top_vendor ? (
            <button
              onClick={() => onNavigate(`/vendors/${category.top_vendor!.id}`)}
              className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors flex items-center gap-1 leading-tight"
            >
              <span className="truncate max-w-[180px]">{truncate(category.top_vendor.name, 28)}</span>
              <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
            </button>
          ) : (
            <p className="text-sm text-text-muted">{'—'}</p>
          )}
          {/* Single bid % */}
          {category.single_bid_pct > 0 && (
            <p className="text-[10px] text-text-muted/50 mt-1 font-mono">
              {category.single_bid_pct.toFixed(0)}% {t('detail.singleBid')}
            </p>
          )}
        </div>
      </div>

      {/* Year Trend + YoY */}
      {trendItems.length >= 2 && (() => {
        const last5 = trendItems.slice(-5)
        const maxV = Math.max(...last5.map(t => t.value), 1)
        const latest = trendItems[trendItems.length - 1]
        const prev = trendItems[trendItems.length - 2]
        const yoy = prev.value > 0 ? (latest.value - prev.value) / prev.value : null
        return (
          <div className="px-5 py-3 border-t border-border/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60">{t('detail.spendTrend', { from: last5[0].year, to: last5[last5.length - 1].year })}</p>
              {yoy !== null && (
                <span className={cn(
                  'text-xs font-mono font-bold',
                  yoy > 0.05 ? 'text-orange-400' : yoy < -0.05 ? 'text-green-400' : 'text-text-muted',
                )}>
                  {yoy > 0 ? '↑' : '↓'} {Math.abs(yoy * 100).toFixed(0)}% vs {prev.year}
                </span>
              )}
            </div>
            <div className="flex items-end gap-1 h-10">
              {last5.map(t => (
                <div key={t.year} className="flex flex-col items-center flex-1 gap-0.5">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(4, (t.value / maxV) * 32)}px`,
                      backgroundColor: `${getRiskColor(t.avg_risk)}50`,
                      borderTop: `2px solid ${getRiskColor(t.avg_risk)}`,
                    }}
                  />
                  <span className="text-[8px] text-text-muted/50 font-mono tabular-nums">{t.year}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Risk Flags Checklist */}
      {(() => {
        const flags: string[] = []
        if (category.direct_award_pct > 75) flags.push(`${category.direct_award_pct.toFixed(0)}% ${t('flags.directAwardHigh', { multiple: (category.direct_award_pct / 25).toFixed(1) })}`)
        else if (category.direct_award_pct > 25) flags.push(`${category.direct_award_pct.toFixed(0)}% ${t('flags.directAwardExceeds')}`)
        if (category.single_bid_pct > 25) flags.push(`${category.single_bid_pct.toFixed(0)}% ${t('flags.singleBidHigh')}`)
        if (category.avg_risk >= 0.60) flags.push(t('flags.criticalRisk'))
        else if (category.avg_risk >= 0.40) flags.push(t('flags.highRisk'))
        if (!flags.length) return null
        return (
          <div className="px-5 py-3 border-t border-red-500/20 bg-red-500/[0.04]">
            <p className="text-[9px] font-mono uppercase tracking-wide text-red-400 mb-1.5">{t('detail.riskIndicators')}</p>
            <ul className="space-y-1">
              {flags.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* Contextual finding callout if high risk */}
      {(category.avg_risk >= 0.40 || isHighDA) && (
        <div className="px-5 py-3 border-t border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
            {t('detail.finding')}
          </p>
          <p className="text-sm text-zinc-200">
            {category.avg_risk >= 0.40 && isHighDA
              ? t('flags.narrativeHighDA', {
                  riskLevel,
                  riskPct: (category.avg_risk * 100).toFixed(0),
                  daPct: category.direct_award_pct.toFixed(0),
                  daMultiple: (category.direct_award_pct / 25).toFixed(1),
                })
              : category.avg_risk >= 0.40
                ? t('flags.narrativeMedRisk', {
                    riskLevel,
                    contracts: formatNumber(category.total_contracts),
                    value: formatCompactMXN(category.total_value),
                  })
                : t('flags.narrativeHighDAOnly', {
                    daPct: category.direct_award_pct.toFixed(0),
                    daMultiple: (category.direct_award_pct / 25).toFixed(1),
                  })
            }
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Subcategory Drill-Down Panel
// =============================================================================

interface SubcategoryItem {
  subcategory_id: number
  code: string
  name_en: string
  name_es: string
  is_catch_all: boolean
  display_order: number
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  year_min: number | null
  year_max: number | null
  top_vendor_name: string | null
  top_vendor_id: number | null
  example_titles: string[]
  pct_of_category: number
}

type SubSort = 'value' | 'risk' | 'da' | 'sb'

function SubcategoryPanel({
  categoryName,
  items,
  loading,
  onNavigate,
}: {
  categoryName: string
  items: SubcategoryItem[]
  loading: boolean
  onNavigate: (path: string) => void
}) {
  const { t } = useTranslation('spending')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [subSort, setSubSort] = useState<SubSort>('value')

  const sorted = useMemo(() => {
    const main = items.filter(i => !i.is_catch_all)
    const catchAll = items.filter(i => i.is_catch_all)
    const comparators: Record<SubSort, (a: SubcategoryItem, b: SubcategoryItem) => number> = {
      value: (a, b) => b.total_value - a.total_value,
      risk:  (a, b) => b.avg_risk - a.avg_risk,
      da:    (a, b) => b.direct_award_pct - a.direct_award_pct,
      sb:    (a, b) => b.single_bid_pct - a.single_bid_pct,
    }
    return [...main.sort(comparators[subSort]), ...catchAll]
  }, [items, subSort])

  const maxValue = items.filter(i => !i.is_catch_all).reduce((m, i) => Math.max(m, i.total_value), 1)

  const classifiedPct = useMemo(
    () => items.filter(i => !i.is_catch_all).reduce((s, i) => s + i.pct_of_category, 0),
    [items],
  )
  const catchAllPct = items.find(i => i.is_catch_all)?.pct_of_category ?? 0

  if (loading) {
    return (
      <Card className="border-blue-500/20 bg-blue-500/[0.02] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            {t('subcategory.titleWithCategory', { name: categoryName })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sorted.length === 0) return null

  const namedCount = sorted.filter(i => !i.is_catch_all).length
  const SORT_OPTS: { key: SubSort; label: string }[] = [
    { key: 'value', label: t('subcategory.sortAmount') },
    { key: 'risk',  label: t('subcategory.sortRisk') },
    { key: 'da',    label: t('subcategory.colDA') },
    { key: 'sb',    label: t('subcategory.colSB') },
  ]

  return (
    <Card className="border-blue-500/20 bg-blue-500/[0.02] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              {t('subcategory.title')}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t('subcategory.description', { count: namedCount, name: categoryName })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-[9px] text-text-muted/50 font-mono uppercase mr-1.5">{t('subcategory.sortLabel')}</span>
            {SORT_OPTS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSubSort(opt.key)}
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded transition-colors font-mono',
                  subSort === opt.key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-text-muted/60 hover:text-text-primary hover:bg-background-elevated',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted/60 mb-1">
            <span>{t('subcategory.classifiedPct', { pct: classifiedPct.toFixed(0) })}</span>
            <span className="text-text-muted/40">{t('subcategory.unclassifiedPct', { pct: catchAllPct.toFixed(0) })}</span>
          </div>
          <div className="h-1.5 bg-border/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500/50 transition-all duration-700 rounded-l-full"
              style={{ width: `${Math.min(classifiedPct, 100)}%` }}
            />
            <div
              className="h-full bg-border/30"
              style={{ width: `${Math.min(catchAllPct, 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-background-elevated/30 text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
          <div className="flex-1 min-w-0">{t('subcategory.colSubcategory')}</div>
          <span className="w-20 text-right flex-shrink-0">{t('subcategory.colAmount')}</span>
          <span className="w-12 text-right flex-shrink-0">%</span>
          <span className="w-10 text-right flex-shrink-0 hidden lg:block">{t('subcategory.colRisk')}</span>
          <span className="w-10 text-right flex-shrink-0 hidden xl:block">AD%</span>
          <span className="w-4 flex-shrink-0" />
        </div>

        <div className="divide-y divide-border/10">
          {sorted.map((sub) => {
            const isHighDA = sub.direct_award_pct >= 70
            const isHighSB = sub.single_bid_pct >= 25
            const isFlagged = !sub.is_catch_all && (isHighDA || isHighSB || sub.avg_risk >= RISK_THRESHOLDS.high)
            const barWidth = sub.is_catch_all
              ? Math.min(sub.pct_of_category, 100)
              : Math.min((sub.total_value / maxValue) * 100, 100)
            const daBarWidth = barWidth * (sub.direct_award_pct / 100)

            return (
              <div key={sub.subcategory_id}>
                <button
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-background-elevated/40 transition-colors text-left',
                    sub.is_catch_all && 'opacity-50',
                    expandedId === sub.subcategory_id && 'bg-background-elevated/30',
                    isFlagged && !sub.is_catch_all && 'border-l-2 border-l-amber-500/60',
                  )}
                  onClick={() => setExpandedId(prev => prev === sub.subcategory_id ? null : sub.subcategory_id)}
                  aria-expanded={expandedId === sub.subcategory_id}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                      {sub.is_catch_all && (
                        <span className="text-[9px] font-mono bg-background-elevated px-1 py-0.5 rounded text-text-muted/50 uppercase tracking-wider flex-shrink-0">
                          {t('subcategory.other')}
                        </span>
                      )}
                      {isFlagged && (
                        <span title={`${isHighDA ? `${sub.direct_award_pct.toFixed(0)}% ${t('detail.directAwardShort')}` : ''}${isHighDA && isHighSB ? ' · ' : ''}${isHighSB ? `${sub.single_bid_pct.toFixed(0)}% ${t('detail.singleBidShort')}` : ''}`}>
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                        </span>
                      )}
                      <span className="truncate">{sub.name_en || sub.name_es}</span>
                      <span className="text-[10px] font-mono text-text-muted/40 flex-shrink-0">
                        {formatNumber(sub.total_contracts)}
                      </span>
                    </div>
                    <div className="h-1 bg-border/20 rounded-full overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: sub.is_catch_all ? '#64748b' : getRiskColor(sub.avg_risk),
                          opacity: 0.55,
                        }}
                      />
                      {!sub.is_catch_all && daBarWidth > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-700"
                          style={{
                            width: `${daBarWidth}%`,
                            backgroundColor: getRiskColor(sub.avg_risk),
                            opacity: 0.9,
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="w-20 text-right text-xs font-mono font-bold text-text-primary tabular-nums flex-shrink-0">
                    {formatCompactMXN(sub.total_value)}
                  </span>
                  <span className="w-12 text-right text-xs font-mono text-text-muted tabular-nums flex-shrink-0">
                    {sub.pct_of_category.toFixed(1)}%
                  </span>
                  <span
                    className="w-10 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden lg:block"
                    style={{ color: sub.avg_risk > 0 ? getRiskColor(sub.avg_risk) : undefined }}
                  >
                    {sub.avg_risk > 0 ? `${(sub.avg_risk * 100).toFixed(0)}%` : '—'}
                  </span>
                  <span
                    className="w-10 text-right text-xs font-mono tabular-nums flex-shrink-0 hidden xl:block"
                    style={{ color: isHighDA ? '#fb923c' : undefined }}
                  >
                    {sub.direct_award_pct > 0 ? `${sub.direct_award_pct.toFixed(0)}%` : '—'}
                  </span>
                  <span className="w-4 text-right text-text-muted/40 text-[10px] flex-shrink-0 select-none">
                    {expandedId === sub.subcategory_id ? '\u25B2' : '\u25BC'}
                  </span>
                </button>

                {expandedId === sub.subcategory_id && sub.total_contracts > 0 && (
                  <div className="px-4 pb-4 pt-3 bg-background-elevated/20 border-t border-border/10">
                    {isFlagged && (
                      <div className="flex items-center gap-1.5 mb-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        <span className="text-[11px] text-amber-300/80">
                          {[
                            isHighDA && `${sub.direct_award_pct.toFixed(0)}% ${t('detail.directAwardLowCompetition')}`,
                            isHighSB && `${sub.single_bid_pct.toFixed(0)}% ${t('detail.singleBidShort')}`,
                            sub.avg_risk >= RISK_THRESHOLDS.high && `${t('subcategory.avgRisk')} ${(sub.avg_risk * 100).toFixed(0)}%`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">{t('detail.contracts')}</p>
                        <p className="text-sm font-mono font-bold text-text-primary">{formatNumber(sub.total_contracts)}</p>
                      </div>
                      {sub.year_min != null && sub.year_max != null && (
                        <div>
                          <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">{t('subcategory.activeYears')}</p>
                          <p className="text-sm font-mono font-bold text-text-primary">{sub.year_min}–{sub.year_max}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">{t('subcategory.directAward')}</p>
                        <p
                          className="text-sm font-mono font-bold"
                          style={{ color: isHighDA ? '#fb923c' : 'var(--color-text-primary)' }}
                        >
                          {sub.direct_award_pct > 0 ? `${sub.direct_award_pct.toFixed(0)}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">{t('subcategory.singleBid')}</p>
                        <p
                          className="text-sm font-mono font-bold"
                          style={{ color: isHighSB ? '#fb923c' : 'var(--color-text-primary)' }}
                        >
                          {sub.single_bid_pct > 0 ? `${sub.single_bid_pct.toFixed(0)}%` : '—'}
                        </p>
                      </div>
                    </div>
                    {sub.top_vendor_name && (
                      <div className="mb-3 flex items-center gap-2">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted flex-shrink-0">{t('subcategory.topVendor')}</p>
                        {sub.top_vendor_id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigate(`/vendors/${sub.top_vendor_id}`) }}
                            className="text-xs font-mono text-accent hover:text-accent/80 transition-colors flex items-center gap-1 truncate"
                          >
                            {truncate(sub.top_vendor_name, 45)}
                            <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs font-mono text-text-secondary truncate">{truncate(sub.top_vendor_name, 45)}</span>
                        )}
                      </div>
                    )}
                    {sub.example_titles.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                          {t('subcategory.exampleTitles')}
                        </p>
                        <div className="space-y-1.5">
                          {sub.example_titles.slice(0, 4).map((title, i) => (
                            <p key={i} className="text-[11px] text-text-muted italic leading-snug pl-2 border-l border-border/30">
                              {truncate(title, 120)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Top Findings Bar — 3 views (value / risk / direct award)
// =============================================================================

type FindingView = 'value' | 'risk' | 'da'

function TopFindingsBar({
  categories,
  onSelect,
}: {
  categories: CategoryStat[]
  onSelect: (id: number) => void
}) {
  const { t, i18n } = useTranslation('spending')
  const [view, setView] = useState<FindingView>('value')

  const top5 = useMemo(() => {
    const eligible = categories.filter(c => c.total_contracts >= 10 && c.total_value > 0)
    const comparators: Record<FindingView, (a: CategoryStat, b: CategoryStat) => number> = {
      value: (a, b) => b.total_value - a.total_value,
      risk: (a, b) => b.avg_risk - a.avg_risk,
      da: (a, b) => b.direct_award_pct - a.direct_award_pct,
    }
    return [...eligible].sort(comparators[view]).slice(0, 5)
  }, [categories, view])

  const VIEWS: { key: FindingView; label: string; hint: string }[] = [
    { key: 'value', label: t('hero.sortByValue'), hint: t('hero.sortByValueHint') },
    { key: 'risk', label: t('hero.sortByRisk'), hint: t('hero.sortByRiskHint') },
    { key: 'da', label: t('topFindings.sortDA'), hint: t('topFindings.sortDAHint') },
  ]

  const getMetric = (cat: CategoryStat): { value: string; color: string; sub: string } => {
    if (view === 'value') {
      return {
        value: formatCompactMXN(cat.total_value),
        color: '#fafafa',
        sub: t('topFindings.contracts', { n: formatNumber(cat.total_contracts) }),
      }
    }
    if (view === 'risk') {
      const level = getRiskLevelFromScore(cat.avg_risk)
      return {
        value: `${(cat.avg_risk * 100).toFixed(1)}%`,
        color: RISK_COLORS[level],
        sub: `${level.charAt(0).toUpperCase() + level.slice(1)} · ${formatCompactMXN(cat.total_value)}`,
      }
    }
    // da
    const overLimit = cat.direct_award_pct > 25
    return {
      value: `${cat.direct_award_pct.toFixed(0)}%`,
      color: overLimit ? '#fb923c' : '#fafafa',
      sub: overLimit ? `${(cat.direct_award_pct / 25).toFixed(1)}x ${t('hero.oecdLimit')}` : t('hero.withinOecdLimit'),
    }
  }

  return (
    <section aria-labelledby="top-findings-heading">
      <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('topFindings.eyebrow')}
          </p>
          <h2
            id="top-findings-heading"
            className="text-lg font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('topFindings.title')}
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-background-card border border-border/40 rounded p-0.5">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'px-3 py-1 text-[10px] rounded transition-colors font-mono uppercase tracking-wider',
                view === v.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-primary',
              )}
              title={v.hint}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {top5.map((cat, idx) => {
          const metric = getMetric(cat)
          const sectorColor = cat.sector_code ? (SECTOR_COLORS[cat.sector_code] ?? '#64748b') : '#64748b'
          return (
            <button
              key={cat.category_id}
              onClick={() => onSelect(cat.category_id)}
              className="group text-left p-3 rounded-lg border border-border/30 bg-background-card hover:bg-background-elevated/60 hover:border-accent/40 transition-colors"
              style={{ borderLeft: `3px solid ${sectorColor}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider tabular-nums">
                  #{idx + 1}
                </span>
                {cat.sector_code && (
                  <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider">
                    {cat.sector_code}
                  </span>
                )}
              </div>
              <p
                className="text-xs font-semibold text-text-primary leading-snug mb-2 group-hover:text-accent transition-colors"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {truncate(localeName(cat, i18n.language), 50)}
              </p>
              <p
                className="text-xl font-mono font-bold tabular-nums leading-tight"
                style={{ color: metric.color }}
              >
                {metric.value}
              </p>
              <p className="text-[10px] text-text-muted/70 font-mono mt-0.5">
                {metric.sub}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// =============================================================================
// Sector-Grouped Category View — 72 categories grouped under 12 sectors
// =============================================================================

function SectorGroupedCategories({
  categories,
  sortField,
  sortDir,
  onSort,
  selectedCategoryId,
  onSelect,
  categorySparklines,
  onNavigate,
}: {
  categories: CategoryStat[]
  sortField: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
  selectedCategoryId: number | null
  onSelect: (id: number) => void
  categorySparklines: Map<number, number[]>
  onNavigate: (path: string) => void
}) {
  const { t, i18n } = useTranslation('spending')

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryStat[]>()
    for (const cat of categories) {
      const key = cat.sector_code ?? 'otros'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(cat)
    }
    const comparators: Record<SortField, (a: CategoryStat, b: CategoryStat) => number> = {
      total_contracts: (a, b) => sortDir === 'desc' ? b.total_contracts - a.total_contracts : a.total_contracts - b.total_contracts,
      total_value: (a, b) => sortDir === 'desc' ? b.total_value - a.total_value : a.total_value - b.total_value,
      avg_risk: (a, b) => sortDir === 'desc' ? b.avg_risk - a.avg_risk : a.avg_risk - b.avg_risk,
      direct_award_pct: (a, b) => sortDir === 'desc' ? b.direct_award_pct - a.direct_award_pct : a.direct_award_pct - b.direct_award_pct,
    }
    return Array.from(map.entries())
      .map(([sectorCode, cats]) => {
        const totalValue = cats.reduce((s, c) => s + c.total_value, 0)
        const totalContracts = cats.reduce((s, c) => s + c.total_contracts, 0)
        const avgRisk = totalContracts > 0
          ? cats.reduce((s, c) => s + c.avg_risk * c.total_contracts, 0) / totalContracts
          : 0
        return { sectorCode, cats: [...cats].sort(comparators[sortField]), totalValue, totalContracts, avgRisk }
      })
      .sort((a, b) => {
        // Pin "otros" (catch-all) to the bottom regardless of value
        if (a.sectorCode === 'otros') return 1
        if (b.sectorCode === 'otros') return -1
        return b.totalValue - a.totalValue
      })
  }, [categories, sortField, sortDir])

  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(() => new Set(grouped.map(g => g.sectorCode)))

  // Re-sync expanded set when sector list changes (after filter)
  const prevGroupKeys = useRef<string>('')
  useEffect(() => {
    const keys = grouped.map(g => g.sectorCode).join(',')
    if (keys !== prevGroupKeys.current) {
      prevGroupKeys.current = keys
      setExpandedSectors(new Set(grouped.map(g => g.sectorCode)))
    }
  }, [grouped])

  const toggleSector = (code: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-text-muted border border-dashed border-border/30 rounded-lg">
        {t('table.noResults')}
      </div>
    )
  }

  const SORT_OPTS: { field: SortField; label: string }[] = [
    { field: 'total_value', label: t('table.sortValue') },
    { field: 'avg_risk', label: t('table.sortRisk') },
    { field: 'total_contracts', label: t('table.sortCount') },
    { field: 'direct_award_pct', label: t('table.colDA') },
  ]

  return (
    <div className="space-y-2">
      {/* Sort controls */}
      <div className="flex items-center gap-1 pb-2 text-[10px] font-mono uppercase tracking-wider text-text-muted/60 flex-wrap">
        <span className="mr-1 text-text-muted/40">{t('subcategory.sortLabel')}:</span>
        {SORT_OPTS.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => onSort(field)}
            className={cn(
              'px-2 py-0.5 rounded transition-colors',
              sortField === field
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted/60 hover:text-text-primary hover:bg-background-elevated',
            )}
          >
            {label}
            {sortField === field && (
              <span className="ml-1 opacity-70">{sortDir === 'desc' ? '▼' : '▲'}</span>
            )}
          </button>
        ))}
      </div>

      {grouped.map(({ sectorCode, cats, totalValue, avgRisk }) => {
        const sectorColor = SECTOR_COLORS[sectorCode] || '#64748b'
        const isExpanded = expandedSectors.has(sectorCode)
        const riskLevel = getRiskLevelFromScore(avgRisk)
        const riskColor = RISK_COLORS[riskLevel]

        return (
          <div key={sectorCode} className="rounded-lg border border-border/30 overflow-hidden">
            {/* Sector header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-background-elevated/20 hover:bg-background-elevated/40 transition-colors text-left"
              onClick={() => toggleSector(sectorCode)}
              aria-expanded={isExpanded}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
              <span className="font-semibold text-sm text-text-primary flex-1 truncate">
                {t(`sectors.${sectorCode}`)}
              </span>
              <span className="text-[10px] text-text-muted/50 font-mono flex-shrink-0">
                {cats.length}
              </span>
              <span className="text-sm font-mono font-bold text-text-primary tabular-nums flex-shrink-0">
                {formatCompactMXN(totalValue)}
              </span>
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ color: riskColor, backgroundColor: `${riskColor}18` }}
              >
                {(avgRisk * 100).toFixed(0)}%
              </span>
              <span className="text-text-muted/40 text-[10px] w-4 text-center flex-shrink-0 select-none">
                {isExpanded ? '▲' : '▼'}
              </span>
            </button>

            {/* Category rows */}
            {isExpanded && (
              <div className="divide-y divide-border/[0.07]">
                {cats.map((cat, idx) => {
                  const catRiskColor = getRiskColor(cat.avg_risk)
                  const isSelected = selectedCategoryId === cat.category_id
                  return (
                    <div
                      key={cat.category_id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-background-elevated/30 transition-colors',
                        isSelected && 'bg-accent/5 border-l-2 border-l-accent',
                      )}
                      onClick={() => onSelect(cat.category_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(cat.category_id) }}
                      aria-selected={isSelected}
                    >
                      <span className="text-[10px] text-text-muted/30 font-mono w-5 flex-shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'text-xs font-medium truncate block',
                          isSelected ? 'text-accent' : 'text-text-primary',
                        )}>
                          {localeName(cat, i18n.language)}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-text-muted tabular-nums w-14 text-right flex-shrink-0 hidden sm:block">
                        {formatNumber(cat.total_contracts)}
                      </span>
                      <span className="text-xs font-mono font-bold text-text-primary tabular-nums w-20 text-right flex-shrink-0">
                        {formatCompactMXN(cat.total_value)}
                      </span>
                      <span
                        className="text-xs font-mono tabular-nums w-12 text-right flex-shrink-0"
                        style={{ color: catRiskColor }}
                      >
                        {(cat.avg_risk * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-mono text-text-muted tabular-nums w-10 text-right flex-shrink-0 hidden lg:block">
                        {cat.direct_award_pct != null ? `${cat.direct_award_pct.toFixed(0)}%` : '—'}
                      </span>
                      <div className="hidden xl:flex items-center justify-end w-14 flex-shrink-0">
                        <MiniSparkline
                          values={categorySparklines.get(cat.category_id) ?? []}
                          color={catRiskColor}
                        />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate(`/categories/${cat.category_id}`) }}
                        className="text-text-muted/40 hover:text-accent transition-colors p-0.5 flex-shrink-0"
                        aria-label={t('table.viewProfileAriaLabel', { name: localeName(cat, i18n.language) })}
                        title={t('table.viewProfileShort')}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Pure-SVG Risk × Value Quadrant Scatter
// =============================================================================

type ScatterPoint = {
  category_id: number
  name: string
  total_value: number
  avg_risk: number
  total_contracts: number
  direct_award_pct: number
  sector_code: string | null
  fill: string
}

function QuadrantScatterSVG({
  data,
  medianValue,
  onNavigate,
}: {
  data: ScatterPoint[]
  medianValue: number
  onNavigate: (path: string) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 600
  const H = 380
  const ML = 56, MR = 20, MT = 24, MB = 50
  const plotW = W - ML - MR
  const plotH = H - MT - MB

  const maxValue = useMemo(() => Math.max(...data.map(d => d.total_value), 1), [data])
  const maxRisk = useMemo(() => {
    const m = Math.max(...data.map(d => d.avg_risk), 0.2)
    return Math.min(m * 1.15, 1.0)
  }, [data])

  const xScale = (v: number) => (v / maxValue) * plotW
  const yScale = (r: number) => plotH * (1 - Math.min(r, maxRisk) / maxRisk)

  const xMedian = xScale(medianValue)
  const RISK_LINE = 0.15
  const yRiskLine = yScale(RISK_LINE)

  const labeled = useMemo(() => {
    const byRisk = [...data].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 5).map(d => d.category_id)
    const byVal = [...data].filter(d => d.avg_risk > RISK_LINE).sort((a, b) => b.total_value - a.total_value).slice(0, 3).map(d => d.category_id)
    return new Set([...byRisk, ...byVal])
  }, [data])

  const hoveredItem = data.find(d => d.category_id === hovered) ?? null

  return (
    <div className="relative select-none" style={{ height: H }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '100%' }}
        aria-label="Cuadrante riesgo vs gasto"
        onMouseLeave={() => setHovered(null)}
      >
        <g transform={`translate(${ML},${MT})`}>
          {/* Quadrant shading */}
          <rect x={xMedian} y={0} width={plotW - xMedian} height={yRiskLine} fill="#dc262609" />
          <rect x={0} y={0} width={xMedian} height={yRiskLine} fill="#eab30807" />
          <rect x={xMedian} y={yRiskLine} width={plotW - xMedian} height={plotH - yRiskLine} fill="#3b82f606" />

          {/* Reference lines */}
          <line x1={xMedian} y1={0} x2={xMedian} y2={plotH} stroke="var(--color-border)" strokeDasharray="4 3" opacity={0.55} />
          <line x1={0} y1={yRiskLine} x2={plotW} y2={yRiskLine} stroke="var(--color-border)" strokeDasharray="4 3" opacity={0.55} />

          {/* Quadrant corner labels */}
          <text x={xMedian + 6} y={11} fontSize={7.5} fontFamily="monospace" fill="#dc262665">ALTO RIESGO · ALTO VALOR</text>
          <text x={6} y={11} fontSize={7.5} fontFamily="monospace" fill="#eab30855">ALTO RIESGO</text>
          <text x={xMedian + 6} y={plotH - 5} fontSize={7.5} fontFamily="monospace" fill="#3b82f655">ALTO VALOR</text>
          <text x={6} y={plotH - 5} fontSize={7.5} fontFamily="monospace" fill="#52525b55">RIESGO BAJO</text>

          {/* 15% risk annotation */}
          <text x={plotW - 4} y={yRiskLine - 4} textAnchor="end" fontSize={7.5} fontFamily="monospace" fill="#71717a80">15% riesgo</text>

          {/* Axes */}
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--color-border)" />
          <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--color-border)" />

          {/* X ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <g key={p}>
              <line x1={p * plotW} y1={plotH} x2={p * plotW} y2={plotH + 4} stroke="var(--color-border)" />
              <text x={p * plotW} y={plotH + 14} textAnchor="middle" fontSize={8.5} fontFamily="monospace" fill="var(--color-text-muted)">
                {formatCompactMXN(p * maxValue)}
              </text>
            </g>
          ))}

          {/* Y ticks */}
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5].filter(r => r <= maxRisk + 0.05).map(r => (
            <g key={r}>
              <line x1={-4} y1={yScale(r)} x2={0} y2={yScale(r)} stroke="var(--color-border)" />
              <text x={-8} y={yScale(r) + 3} textAnchor="end" fontSize={8.5} fontFamily="monospace" fill="var(--color-text-muted)">
                {(r * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={plotW / 2} y={plotH + 38} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="var(--color-text-muted)" opacity={0.7}>
            GASTO TOTAL (MXN)
          </text>
          <g transform={`rotate(-90) translate(${-(plotH / 2)}, ${-46})`}>
            <text textAnchor="middle" fontSize={8} fontFamily="monospace" fill="var(--color-text-muted)" opacity={0.7}>
              RIESGO PROMEDIO
            </text>
          </g>

          {/* Data points */}
          <g>
            {data.map((d) => {
              const cx = Math.max(4, Math.min(plotW - 4, xScale(d.total_value)))
              const cy = Math.max(4, Math.min(plotH - 4, yScale(d.avg_risk)))
              const r = Math.max(3, Math.min(9, Math.sqrt(d.total_contracts / 800)))
              const isHov = hovered === d.category_id
              const dimmed = hovered !== null && !isHov
              return (
                <circle
                  key={d.category_id}
                  cx={cx}
                  cy={cy}
                  r={isHov ? r + 2.5 : r}
                  fill={d.fill}
                  fillOpacity={dimmed ? 0.18 : isHov ? 1 : 0.72}
                  stroke={isHov ? '#ffffff' : 'transparent'}
                  strokeWidth={isHov ? 1.5 : 0}
                  style={{ cursor: 'pointer', transition: 'r 0.12s, fill-opacity 0.12s' }}
                  onMouseEnter={() => setHovered(d.category_id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onNavigate(`/categories/${d.category_id}`)}
                />
              )
            })}
          </g>

          {/* Notable labels */}
          {data.filter(d => labeled.has(d.category_id)).map((d) => {
            const cx = Math.max(4, Math.min(plotW - 4, xScale(d.total_value)))
            const cy = Math.max(4, Math.min(plotH - 4, yScale(d.avg_risk)))
            const label = d.name.length > 22 ? d.name.slice(0, 21) + '…' : d.name
            const isHov = hovered === d.category_id
            const dimmed = hovered !== null && !isHov
            return (
              <text
                key={`lbl-${d.category_id}`}
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize={7.5}
                fontFamily="monospace"
                fill={d.fill}
                fillOpacity={dimmed ? 0.12 : isHov ? 1 : 0.82}
                style={{ pointerEvents: 'none' }}
              >
                {label}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Floating tooltip — fixed bottom-left so it never clips */}
      {hoveredItem && (
        <div
          className="absolute bottom-12 left-14 z-20 rounded-lg border p-3 text-xs font-mono shadow-xl pointer-events-none animate-in fade-in duration-100"
          style={{ backgroundColor: 'var(--color-background-card)', borderColor: hoveredItem.fill, maxWidth: 230 }}
        >
          <p className="font-bold text-text-primary text-[11px] mb-1 leading-tight whitespace-normal">{hoveredItem.name}</p>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hoveredItem.fill }} />
            <span className="text-text-muted/80 capitalize text-[10px]">{hoveredItem.sector_code ?? 'otros'}</span>
          </div>
          <div className="space-y-0.5 text-[10px]">
            <p className="text-text-muted">Gasto: <span className="font-semibold text-text-primary">{formatCompactMXN(hoveredItem.total_value)}</span></p>
            <p className="text-text-muted">Riesgo: <span className="font-semibold" style={{ color: getRiskColor(hoveredItem.avg_risk) }}>{(hoveredItem.avg_risk * 100).toFixed(1)}%</span></p>
            <p className="text-text-muted">Adj. directa: <span className="text-text-primary">{hoveredItem.direct_award_pct.toFixed(0)}%</span></p>
            <p className="text-text-muted">{hoveredItem.total_contracts.toLocaleString('es-MX')} contratos</p>
          </div>
          <p className="text-accent/60 mt-1.5 text-[10px]">Clic para ver perfil →</p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Direct Award Concentration Chart — horizontal bars, OECD 25% line
// =============================================================================

function DAConcentrationChart({
  categories,
  lang,
  onSelect,
}: {
  categories: CategoryStat[]
  lang: string
  onSelect: (id: number) => void
}) {
  const top = useMemo(() => {
    return [...categories]
      .filter(c => c.direct_award_pct > 0 && c.total_contracts >= 10)
      .sort((a, b) => b.direct_award_pct - a.direct_award_pct)
      .slice(0, 22)
  }, [categories])

  if (!top.length) return <p className="text-text-muted text-sm text-center py-8">Sin datos</p>

  const maxDA = Math.max(...top.map(d => d.direct_award_pct), 100)
  const OECD = 25
  const oecdPct = (OECD / maxDA) * 100

  return (
    <div className="space-y-[3px]">
      {top.map((cat, idx) => {
        const isOver = cat.direct_award_pct > OECD
        const barW = (cat.direct_award_pct / maxDA) * 100
        const rColor = getRiskColor(cat.avg_risk)
        return (
          <button
            key={cat.category_id}
            onClick={() => onSelect(cat.category_id)}
            className="w-full group flex items-center gap-2 px-1 py-[3px] rounded hover:bg-background-elevated/30 transition-colors text-left"
            title={`${localeName(cat, lang)} — ${cat.direct_award_pct.toFixed(0)}% adjudicación directa`}
          >
            <span className="text-[9px] font-mono text-text-muted/30 w-4 flex-shrink-0 tabular-nums text-right">{idx + 1}</span>
            <span className="w-36 flex-shrink-0 text-[10px] font-mono text-text-muted/80 truncate group-hover:text-text-primary transition-colors">
              {localeName(cat, lang)}
            </span>
            <div className="flex-1 relative h-3.5">
              <div className="absolute inset-0 rounded bg-background-elevated/30" />
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{ width: `${barW}%`, backgroundColor: isOver ? '#fb923c' : '#3b82f6', opacity: 0.72 }}
              />
              <div
                className="absolute inset-y-[-2px] w-px bg-red-500"
                style={{ left: `${oecdPct}%`, opacity: 0.65 }}
              />
            </div>
            <span
              className="text-[10px] font-mono font-bold tabular-nums w-9 text-right flex-shrink-0"
              style={{ color: isOver ? '#fb923c' : 'var(--color-text-secondary)' }}
            >
              {cat.direct_award_pct.toFixed(0)}%
            </span>
            <span className="text-[9px] font-mono tabular-nums w-9 text-right flex-shrink-0" style={{ color: rColor }}>
              R:{(cat.avg_risk * 100).toFixed(0)}%
            </span>
          </button>
        )
      })}

      <div className="flex items-center gap-4 pt-3 border-t border-border/20 text-[9px] font-mono text-text-muted/50">
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3.5 bg-red-500 opacity-70" />
          <span>Límite OCDE 25%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 rounded" style={{ backgroundColor: '#fb923c', opacity: 0.72 }} />
          <span>Sobre límite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-3 rounded" style={{ backgroundColor: '#3b82f6', opacity: 0.72 }} />
          <span>Dentro de límite</span>
        </div>
        <span className="ml-auto opacity-60">R: riesgo promedio</span>
      </div>
    </div>
  )
}

// =============================================================================
// Squarified Treemap (pure SVG) — spend hierarchy at a glance
// =============================================================================

interface TreemapDatum {
  category_id: number
  name: string
  sector_code: string | null
  total_value: number
  total_contracts: number
  avg_risk: number
  direct_award_pct: number
}

interface TreemapRect extends TreemapDatum {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Squarified treemap algorithm (Bruls, Huijing & van Wijk 2000).
 * Pure function, no deps. Returns rectangles sized by value.
 */
function squarify(
  items: TreemapDatum[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  if (!items.length || w <= 0 || h <= 0) return []

  const total = items.reduce((s, d) => s + d.total_value, 0)
  if (total <= 0) return []

  const area = w * h
  const scale = area / total

  const rects: TreemapRect[] = []
  const sorted = [...items].sort((a, b) => b.total_value - a.total_value)

  function worst(row: TreemapDatum[], sideLength: number): number {
    if (!row.length) return Infinity
    const sum = row.reduce((s, d) => s + d.total_value * scale, 0)
    const rMax = row.reduce((m, d) => Math.max(m, d.total_value * scale), 0)
    const rMin = row.reduce((m, d) => Math.min(m, d.total_value * scale), Infinity)
    const s2 = sum * sum
    const l2 = sideLength * sideLength
    return Math.max((l2 * rMax) / s2, s2 / (l2 * rMin))
  }

  function layout(row: TreemapDatum[], cx: number, cy: number, cw: number, ch: number) {
    const horizontal = cw >= ch
    const side = horizontal ? ch : cw
    const sum = row.reduce((s, d) => s + d.total_value * scale, 0)
    const slice = sum / side
    let offset = 0
    for (const d of row) {
      const length = (d.total_value * scale) / side
      if (horizontal) {
        rects.push({ ...d, x: cx, y: cy + offset, w: slice, h: length })
      } else {
        rects.push({ ...d, x: cx + offset, y: cy, w: length, h: slice })
      }
      offset += length
    }
    if (horizontal) return { x: cx + slice, y: cy, w: cw - slice, h: ch }
    return { x: cx, y: cy + slice, w: cw, h: ch - slice }
  }

  let remaining = sorted
  let region = { x, y, w, h }

  while (remaining.length) {
    const row: TreemapDatum[] = []
    const side = Math.min(region.w, region.h)
    let i = 0
    while (i < remaining.length) {
      const next = remaining[i]
      const trial = [...row, next]
      if (row.length === 0 || worst(trial, side) <= worst(row, side)) {
        row.push(next)
        i++
      } else {
        break
      }
    }
    region = layout(row, region.x, region.y, region.w, region.h)
    remaining = remaining.slice(row.length)
    if (region.w <= 0 || region.h <= 0) break
  }

  return rects
}

function TreemapSquarified({
  categories,
  lang,
  height = 480,
  onSelect,
}: {
  categories: CategoryStat[]
  lang: string
  height?: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation('spending')
  const [hovered, setHovered] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Top 40 categories — anything smaller becomes illegible
  const items = useMemo((): TreemapDatum[] => {
    return [...categories]
      .filter(c => c.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 40)
      .map(c => ({
        category_id: c.category_id,
        name: localeName(c, lang),
        sector_code: c.sector_code,
        total_value: c.total_value,
        total_contracts: c.total_contracts,
        avg_risk: c.avg_risk,
        direct_award_pct: c.direct_award_pct,
      }))
  }, [categories, lang])

  const rects = useMemo(
    () => squarify(items, 0, 0, Math.max(100, width), height),
    [items, width, height],
  )

  const hoveredItem = hovered != null ? rects.find(r => r.category_id === hovered) : null
  const totalShown = items.reduce((s, d) => s + d.total_value, 0)
  const totalAll = categories.reduce((s, d) => s + d.total_value, 0)
  const shownPct = totalAll > 0 ? (totalShown / totalAll) * 100 : 0

  if (!items.length) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center rounded-lg border border-border/30 bg-background-card"
        style={{ height }}
      >
        <p className="text-xs text-text-muted font-mono">{t('treemap.noData', 'Sin datos')}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative select-none">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(100, width)} ${height}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHovered(null)}
        style={{ display: 'block' }}
        aria-label="Treemap of top spending categories"
        role="img"
      >
        {rects.map(r => {
          const sectorColor = r.sector_code ? (SECTOR_COLORS[r.sector_code] ?? '#64748b') : '#64748b'
          // Opacity modulated by avg_risk — riskier categories pop
          const riskOpacity = 0.42 + Math.min(r.avg_risk, 0.8) * 0.7
          const isHov = hovered === r.category_id
          const dimmed = hovered !== null && !isHov
          const riskLevel = getRiskLevelFromScore(r.avg_risk)
          const isCritical = riskLevel === 'critical'
          const isHigh = riskLevel === 'high'

          // Only label cells large enough to fit text
          const canLabelName = r.w > 64 && r.h > 28
          const canLabelValue = r.w > 64 && r.h > 44
          const canLabelSub = r.w > 110 && r.h > 66

          return (
            <g
              key={r.category_id}
              onMouseEnter={() => setHovered(r.category_id)}
              onClick={() => onSelect(r.category_id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={r.x}
                y={r.y}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                fill={sectorColor}
                fillOpacity={dimmed ? 0.2 : riskOpacity}
                stroke={isHov ? '#fafafa' : isCritical ? '#dc2626' : isHigh ? '#ea580c' : '#18181b'}
                strokeWidth={isHov ? 2 : isCritical || isHigh ? 1.5 : 1}
                style={{ transition: 'fill-opacity 120ms, stroke 120ms, stroke-width 120ms' }}
              />
              {/* Risk stripe for critical/high */}
              {(isCritical || isHigh) && r.w > 24 && r.h > 24 && (
                <rect
                  x={r.x + 2}
                  y={r.y + 2}
                  width={Math.max(0, Math.min(r.w - 4, 3))}
                  height={Math.max(0, r.h - 4)}
                  fill={isCritical ? '#dc2626' : '#ea580c'}
                  fillOpacity={dimmed ? 0.25 : 0.95}
                />
              )}
              {canLabelName && (
                <text
                  x={r.x + 8}
                  y={r.y + 16}
                  fontSize={Math.min(13, Math.max(10, Math.sqrt(r.w * r.h) / 12))}
                  fontWeight={700}
                  fill="#fafafa"
                  fillOpacity={dimmed ? 0.35 : 0.96}
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
                  {r.name.length > Math.floor(r.w / 7)
                    ? r.name.slice(0, Math.floor(r.w / 7) - 1) + '…'
                    : r.name}
                </text>
              )}
              {canLabelValue && (
                <text
                  x={r.x + 8}
                  y={r.y + 32}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fill="#fafafa"
                  fillOpacity={dimmed ? 0.3 : 0.82}
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  {formatCompactMXN(r.total_value)}
                </text>
              )}
              {canLabelSub && (
                <text
                  x={r.x + 8}
                  y={r.y + 47}
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fill="#fafafa"
                  fillOpacity={dimmed ? 0.22 : 0.64}
                  style={{ pointerEvents: 'none' }}
                >
                  {formatNumber(r.total_contracts)} · {(r.avg_risk * 100).toFixed(0)}% riesgo
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-20 rounded-lg border p-3 text-xs font-mono shadow-xl pointer-events-none animate-in fade-in duration-100"
          style={{
            left: Math.min(hoveredItem.x + 10, (width || 900) - 240),
            top: Math.min(hoveredItem.y + 10, height - 140),
            backgroundColor: 'var(--color-background-card)',
            borderColor: hoveredItem.sector_code ? (SECTOR_COLORS[hoveredItem.sector_code] ?? '#64748b') : '#64748b',
            maxWidth: 240,
          }}
        >
          <p
            className="font-bold text-text-primary text-[12px] mb-1 leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {hoveredItem.name}
          </p>
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: hoveredItem.sector_code ? (SECTOR_COLORS[hoveredItem.sector_code] ?? '#64748b') : '#64748b',
              }}
            />
            <span className="text-text-muted/80 capitalize text-[10px]">
              {hoveredItem.sector_code ?? 'otros'}
            </span>
          </div>
          <div className="space-y-0.5 text-[10px]">
            <p className="text-text-muted">
              Gasto: <span className="font-semibold text-text-primary">{formatCompactMXN(hoveredItem.total_value)}</span>
            </p>
            <p className="text-text-muted">
              Contratos: <span className="text-text-primary">{formatNumber(hoveredItem.total_contracts)}</span>
            </p>
            <p className="text-text-muted">
              Riesgo: <span className="font-semibold" style={{ color: getRiskColor(hoveredItem.avg_risk) }}>
                {(hoveredItem.avg_risk * 100).toFixed(1)}%
              </span>
            </p>
            <p className="text-text-muted">
              Adj. directa: <span className="text-text-primary">{hoveredItem.direct_award_pct.toFixed(0)}%</span>
            </p>
          </div>
          <p className="text-accent/70 mt-1.5 text-[10px]">Clic para detalles →</p>
        </div>
      )}

      {/* Footer legend */}
      <div className="flex items-center gap-4 mt-3 text-[9px] font-mono text-text-muted/60 flex-wrap">
        <span>
          <span className="text-text-primary font-bold">{items.length}</span>{' '}
          {lang === 'en' ? 'categories shown' : 'categorías mostradas'} · {shownPct.toFixed(0)}%{' '}
          {lang === 'en' ? 'of total spend' : 'del gasto total'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#dc2626' }} />
          <span>{lang === 'en' ? 'Critical risk' : 'Riesgo crítico'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#ea580c' }} />
          <span>{lang === 'en' ? 'High risk' : 'Riesgo alto'}</span>
        </div>
        <span className="ml-auto opacity-70">
          {lang === 'en' ? 'Size = total spend · Color = sector · Opacity = risk' : 'Tamaño = gasto · Color = sector · Opacidad = riesgo'}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Signal vs Noise — risk-adjusted spending outliers
// =============================================================================

interface OutlierItem {
  category: CategoryStat
  score: number            // composite disproportionality
  riskExcess: number       // avg_risk - median_risk (in absolute terms)
  spendPctile: number      // 0..1 percentile of spend
  reason: 'high-risk-high-spend' | 'high-risk-small' | 'concentration'
}

function SignalNoiseOutliers({
  categories,
  lang,
  onSelect,
}: {
  categories: CategoryStat[]
  lang: string
  onSelect: (id: number) => void
}) {
  const outliers = useMemo((): OutlierItem[] => {
    const eligible = categories.filter(c => c.avg_risk > 0 && c.total_contracts >= 30 && c.total_value > 0)
    if (eligible.length < 5) return []

    const risks = eligible.map(c => c.avg_risk).sort((a, b) => a - b)
    const median = risks[Math.floor(risks.length / 2)]

    const spendSorted = [...eligible].sort((a, b) => a.total_value - b.total_value)
    const spendRank = new Map<number, number>()
    spendSorted.forEach((c, i) => spendRank.set(c.category_id, i / Math.max(1, eligible.length - 1)))

    // Composite: spending volume × risk excess. Weight large-spend-high-risk heavily.
    const scored = eligible.map(c => {
      const riskExcess = c.avg_risk - median
      const spendPctile = spendRank.get(c.category_id) ?? 0
      // score = risk above median * spend percentile rank * log(contract volume)
      const score =
        Math.max(0, riskExcess) *
        (0.3 + 0.7 * spendPctile) *
        Math.log10(Math.max(10, c.total_contracts))
      let reason: OutlierItem['reason'] = 'high-risk-high-spend'
      if (spendPctile < 0.5 && c.avg_risk >= RISK_THRESHOLDS.high) reason = 'high-risk-small'
      if (c.direct_award_pct >= 80) reason = 'concentration'
      return { category: c, score, riskExcess, spendPctile, reason }
    })

    return scored
      .filter(o => o.score > 0 && o.riskExcess > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }, [categories])

  if (!outliers.length) return null

  return (
    <section aria-labelledby="outliers-heading">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div className="max-w-2xl">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            RUBLI · {lang === 'en' ? 'Signal vs. Noise' : 'Señal vs. Ruido'}
          </p>
          <h2
            id="outliers-heading"
            className="text-2xl font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {lang === 'en'
              ? <>Where risk and spend <em>converge.</em></>
              : <>Donde el riesgo y el gasto <em>convergen.</em></>
            }
          </h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {lang === 'en'
              ? 'These categories carry risk scores disproportionately high given their spend volume — the needles in the haystack where the biggest corruption risk lives.'
              : 'Estas categorías presentan riesgo desproporcionadamente alto para su volumen de gasto — las agujas en el pajar donde se concentra el riesgo de corrupción más grande.'
            }
          </p>
        </div>
        <FuentePill source={lang === 'en' ? 'Composite score · RUBLI' : 'Puntaje compuesto · RUBLI'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {outliers.map((o, idx) => {
          const cat = o.category
          const riskLevel = getRiskLevelFromScore(cat.avg_risk)
          const riskColor = RISK_COLORS[riskLevel]
          const sectorColor = cat.sector_code ? (SECTOR_COLORS[cat.sector_code] ?? '#64748b') : '#64748b'
          const excessPct = (o.riskExcess * 100).toFixed(1)
          const spendPctile = (o.spendPctile * 100).toFixed(0)

          let headline: string
          if (o.reason === 'high-risk-high-spend') {
            headline = lang === 'en'
              ? `${excessPct}pp above median risk — on ${spendPctile}th-percentile spend.`
              : `${excessPct}pp sobre riesgo mediano — gasto en percentil ${spendPctile}.`
          } else if (o.reason === 'high-risk-small') {
            headline = lang === 'en'
              ? `High risk concentrated in a small-spend category — classic shell pattern.`
              : `Riesgo alto concentrado en categoría de gasto reducido — patrón de fachada.`
          } else {
            headline = lang === 'en'
              ? `${cat.direct_award_pct.toFixed(0)}% direct awards — ${(cat.direct_award_pct / 25).toFixed(1)}× OECD limit.`
              : `${cat.direct_award_pct.toFixed(0)}% adj. directa — ${(cat.direct_award_pct / 25).toFixed(1)}× límite OCDE.`
          }

          return (
            <button
              key={cat.category_id}
              onClick={() => onSelect(cat.category_id)}
              className="group text-left rounded-xl border border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.07] hover:border-amber-500/40 transition-colors overflow-hidden"
              style={{ borderLeftColor: riskColor, borderLeftWidth: 3 }}
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-[0.15em]">
                    #{idx + 1} {lang === 'en' ? 'Outlier' : 'Anomalía'}
                  </span>
                  <span className="h-px flex-1 bg-amber-500/20" />
                  {cat.sector_code && (
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${sectorColor}18`,
                        color: sectorColor,
                      }}
                    >
                      {cat.sector_code}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs font-mono uppercase tracking-wide text-amber-400/90 mb-2"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {lang === 'en' ? 'HALLAZGO' : 'HALLAZGO'}
                </p>
                <p
                  className="text-base font-semibold text-text-primary leading-snug mb-3 group-hover:text-amber-100 transition-colors"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {localeName(cat, lang)}
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">{headline}</p>

                {/* Mini stat row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-amber-500/10">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
                      {lang === 'en' ? 'Risk' : 'Riesgo'}
                    </p>
                    <p className="text-lg font-mono font-bold tabular-nums" style={{ color: riskColor }}>
                      {(cat.avg_risk * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
                      {lang === 'en' ? 'Spend' : 'Gasto'}
                    </p>
                    <p className="text-lg font-mono font-bold tabular-nums text-text-primary">
                      {formatCompactMXN(cat.total_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
                      {lang === 'en' ? 'AD rate' : 'Adj. dir.'}
                    </p>
                    <p
                      className="text-lg font-mono font-bold tabular-nums"
                      style={{ color: cat.direct_award_pct > 25 ? '#fb923c' : 'var(--color-text-primary)' }}
                    >
                      {cat.direct_award_pct.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-amber-400/80 uppercase tracking-wide group-hover:text-amber-300 transition-colors">
                  <span>{lang === 'en' ? 'Investigate this category' : 'Investigar esta categoría'}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// =============================================================================
// Vendor Concentration Callout — for selected category
// =============================================================================

interface TopVendorRow {
  vendor_id: number
  vendor_name: string
  contract_count: number
  vendor_value: number
  market_share_pct: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
}

function VendorConcentrationCallout({
  categoryName,
  categoryTotalValue,
  hhi,
  concentrationLabel,
  top3SharePct,
  vendors,
  loading,
  lang,
  onNavigate,
}: {
  categoryName: string
  categoryTotalValue: number
  hhi: number
  concentrationLabel: 'highly_concentrated' | 'moderately_concentrated' | 'competitive'
  top3SharePct: number
  vendors: TopVendorRow[]
  loading: boolean
  lang: string
  onNavigate: (path: string) => void
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/30 bg-background-card/50 p-5">
        <Skeleton className="h-4 w-1/3 mb-3" />
        <Skeleton className="h-12 w-1/2 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      </div>
    )
  }

  if (!vendors.length) return null

  const top = vendors[0]
  const isHighlyConc = concentrationLabel === 'highly_concentrated'
  const isModConc = concentrationLabel === 'moderately_concentrated'
  const barColor = isHighlyConc ? '#dc2626' : isModConc ? '#ea580c' : '#3b82f6'
  const pillColor = isHighlyConc ? '#dc2626' : isModConc ? '#ea580c' : '#16a34a'

  const concLabel =
    concentrationLabel === 'highly_concentrated'
      ? (lang === 'en' ? 'HIGHLY CONCENTRATED' : 'ALTAMENTE CONCENTRADO')
      : concentrationLabel === 'moderately_concentrated'
        ? (lang === 'en' ? 'MODERATELY CONCENTRATED' : 'MODERADAMENTE CONCENTRADO')
        : (lang === 'en' ? 'COMPETITIVE' : 'COMPETITIVO')

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `${pillColor}30`,
        backgroundColor: `${pillColor}08`,
        borderLeftColor: pillColor,
        borderLeftWidth: 3,
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-3.5 w-3.5" style={{ color: pillColor }} />
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]" style={{ color: pillColor }}>
            {lang === 'en' ? 'Vendor Concentration' : 'Concentración de Proveedores'}
          </p>
          <span
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
            style={{ color: pillColor, backgroundColor: `${pillColor}18` }}
          >
            {concLabel}
          </span>
        </div>

        {/* Editorial finding — the hero stat */}
        <div className="border-l-2 pl-4 py-1 mt-2 mb-4" style={{ borderColor: barColor }}>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-mono font-bold tabular-nums" style={{ color: barColor }}>
              {top.market_share_pct.toFixed(1)}%
            </span>
            <span className="text-sm text-zinc-400">
              {lang === 'en' ? 'held by' : 'controlado por'}{' '}
              <button
                onClick={() => onNavigate(`/vendors/${top.vendor_id}`)}
                className="text-text-primary font-semibold hover:text-amber-400 transition-colors"
              >
                {truncate(top.vendor_name, 40)}
              </button>
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {lang === 'en'
              ? `${formatCompactMXN(top.vendor_value)} across ${formatNumber(top.contract_count)} contracts in ${categoryName}`
              : `${formatCompactMXN(top.vendor_value)} en ${formatNumber(top.contract_count)} contratos en ${categoryName}`
            }
          </p>
        </div>

        {/* Concentration stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border/20">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
              HHI
            </p>
            <p className="text-lg font-mono font-bold tabular-nums" style={{ color: barColor }}>
              {hhi.toFixed(3)}
            </p>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {hhi >= 0.25
                ? (lang === 'en' ? 'Monopolistic' : 'Monopólico')
                : hhi >= 0.15
                  ? (lang === 'en' ? 'Concentrated' : 'Concentrado')
                  : (lang === 'en' ? 'Competitive' : 'Competitivo')
              }
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
              {lang === 'en' ? 'Top 3 share' : 'Top 3'}
            </p>
            <p className="text-lg font-mono font-bold tabular-nums text-text-primary">
              {top3SharePct.toFixed(0)}%
            </p>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {lang === 'en' ? 'combined' : 'combinado'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60 mb-0.5">
              {lang === 'en' ? 'Total market' : 'Mercado total'}
            </p>
            <p className="text-lg font-mono font-bold tabular-nums text-text-primary">
              {formatCompactMXN(categoryTotalValue)}
            </p>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {vendors.length} {lang === 'en' ? 'shown' : 'mostrados'}
            </p>
          </div>
        </div>

        {/* Top vendors bar chart */}
        <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-2">
          {lang === 'en' ? 'Market share — top vendors' : 'Participación — proveedores principales'}
        </p>
        <div className="space-y-1">
          {vendors.slice(0, 8).map((v, idx) => {
            const riskLevel = getRiskLevelFromScore(v.avg_risk)
            const riskColor = RISK_COLORS[riskLevel]
            return (
              <div
                key={v.vendor_id}
                className="group flex items-center gap-2 py-1 px-1 rounded hover:bg-background-elevated/40 transition-colors"
              >
                <span className="text-[9px] font-mono text-text-muted/30 w-5 text-right tabular-nums flex-shrink-0">
                  {idx + 1}
                </span>
                <button
                  onClick={() => onNavigate(`/vendors/${v.vendor_id}`)}
                  className="text-[11px] text-text-secondary hover:text-accent transition-colors truncate w-44 flex-shrink-0 text-left"
                >
                  {truncate(v.vendor_name, 28)}
                </button>
                <div className="flex-1 relative h-3.5">
                  <div className="absolute inset-0 rounded bg-background-elevated/30" />
                  <div
                    className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                    style={{
                      width: `${Math.min(v.market_share_pct * 2.5, 100)}%`,
                      backgroundColor: idx === 0 ? barColor : '#3b82f6',
                      opacity: idx === 0 ? 0.85 : 0.55,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-mono font-bold tabular-nums w-11 text-right flex-shrink-0"
                  style={{ color: idx === 0 ? barColor : 'var(--color-text-secondary)' }}
                >
                  {v.market_share_pct.toFixed(1)}%
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums w-9 text-right flex-shrink-0 hidden md:block"
                  style={{ color: riskColor }}
                >
                  {(v.avg_risk * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Dot-matrix chart primitives
// =============================================================================

interface SexenioStackedDatum {
  admin: string
  [categoryKey: string]: string | number
}

interface SexenioCategory {
  key: string
  color: string
}

/**
 * SexenioStackedDotColumns — vertical stacked dot-matrix columns.
 * Replaces a stacked BarChart. Each administration is a column; dots stack
 * bottom-up, colored by category proportion of that admin's total.
 */
function SexenioStackedDotColumns({
  data,
  categories,
}: {
  data: SexenioStackedDatum[]
  categories: SexenioCategory[]
}) {
  const ROWS = 40
  const COL_W = 32
  const DOT_GAP = 8
  const DOT_R = 3
  const LABEL_H = 28
  const VALUE_H = 18
  const LEGEND_COLS = 2

  // Compute per-admin totals and max-total for scaling columns
  const adminTotals = data.map(d =>
    categories.reduce((s, c) => s + (Number(d[c.key]) || 0), 0)
  )
  const maxTotal = Math.max(...adminTotals, 1)
  const width = Math.max(520, data.length * (COL_W + 40) + 40)
  const colsTotalWidth = data.length * COL_W + (data.length - 1) * 40
  const offsetX = (width - colsTotalWidth) / 2
  const chartHeight = ROWS * DOT_GAP + LABEL_H + VALUE_H + 16

  // Build legend: categories split into rows
  const legendRowH = 18
  const legendRows = Math.ceil(categories.length / LEGEND_COLS)
  const legendHeight = legendRows * legendRowH + 16
  const totalHeight = chartHeight + legendHeight
  const legendY = chartHeight + 4

  return (
    <div
      style={{ height: 380 }}
      role="img"
      aria-label="Dot matrix chart showing contract value by administration and top categories"
    >
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="w-full h-auto max-h-[370px]">
        {data.map((d, colIdx) => {
          const total = adminTotals[colIdx]
          const filledTotal = total > 0 ? Math.max(1, Math.round((total / maxTotal) * ROWS)) : 0
          const cx = offsetX + colIdx * (COL_W + 40) + COL_W / 2

          // Build per-category filled counts proportional to category share of total,
          // within the admin's filledTotal rows.
          const catFilled: number[] = []
          let remaining = filledTotal
          categories.forEach((c, i) => {
            const v = Number(d[c.key]) || 0
            if (total <= 0) {
              catFilled.push(0)
              return
            }
            const fill =
              i === categories.length - 1
                ? remaining
                : Math.round((v / total) * filledTotal)
            const capped = Math.max(0, Math.min(fill, remaining))
            catFilled.push(capped)
            remaining -= capped
          })

          // Map dot index (bottom-up) → category color
          const dotColors: (string | null)[] = Array(ROWS).fill(null)
          let cursor = 0
          catFilled.forEach((count, ci) => {
            for (let k = 0; k < count; k++) {
              if (cursor < ROWS) {
                dotColors[cursor] = categories[ci].color
                cursor++
              }
            }
          })

          return (
            <g key={`admin-${colIdx}`}>
              <text
                x={cx}
                y={12}
                textAnchor="middle"
                fontSize="9"
                fill="#a1a1aa"
                fontFamily="var(--font-family-mono)"
              >
                {formatCompactMXN(total)}
              </text>
              {Array.from({ length: ROWS }).map((_, i) => {
                // i=0 → bottom
                const cy = VALUE_H + (ROWS - 1 - i) * DOT_GAP + DOT_GAP / 2
                const fill = dotColors[i]
                return (
                  <motion.circle
                    key={`dot-${colIdx}-${i}`}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={fill ?? '#18181b'}
                    fillOpacity={fill ? 0.85 : 1}
                    stroke={fill ? 'none' : '#27272a'}
                    strokeWidth={fill ? 0 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: colIdx * 0.03 + i * 0.002 }}
                  />
                )
              })}
              <text
                x={cx}
                y={VALUE_H + ROWS * DOT_GAP + 18}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text-secondary)"
                fontFamily="var(--font-family-mono)"
              >
                {d.admin}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        {categories.map((c, i) => {
          const col = i % LEGEND_COLS
          const row = Math.floor(i / LEGEND_COLS)
          const colWidth = width / LEGEND_COLS
          const lx = col * colWidth + 20
          const ly = legendY + row * legendRowH + 12
          return (
            <g key={`legend-${i}`}>
              <circle cx={lx} cy={ly - 3} r={4} fill={c.color} />
              <text
                x={lx + 10}
                y={ly}
                fontSize="10"
                fill="var(--color-text-secondary)"
                fontFamily="var(--font-family-sans)"
              >
                {truncate(c.key, 32)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function SpendingCategories() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('spending')

  const SECTOR_OPTIONS = [
    { code: '', label: t('filters.allSectors') },
    { code: 'salud', label: t('sectors.salud') },
    { code: 'educacion', label: t('sectors.educacion') },
    { code: 'infraestructura', label: t('sectors.infraestructura') },
    { code: 'energia', label: t('sectors.energia') },
    { code: 'defensa', label: t('sectors.defensa') },
    { code: 'tecnologia', label: t('sectors.tecnologia') },
    { code: 'hacienda', label: t('sectors.hacienda') },
    { code: 'gobernacion', label: t('sectors.gobernacion') },
    { code: 'agricultura', label: t('sectors.agricultura') },
    { code: 'ambiente', label: t('sectors.ambiente') },
    { code: 'trabajo', label: t('sectors.trabajo') },
    { code: 'otros', label: t('sectors.otros') },
  ]
  const [sectorFilter, setSectorFilter] = useState<string>('')
  const [yearFrom, setYearFrom] = useState(2010)
  const [yearTo, setYearTo] = useState(2025)
  const [sortField, setSortField] = useState<SortField>('total_value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [trendCount, setTrendCount] = useState<number | null>(10)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const trendChartRef = useRef<HTMLDivElement>(null)
  const detailPanelRef = useRef<HTMLDivElement>(null)

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['categories', 'trends', yearFrom, yearTo],
    queryFn: () => categoriesApi.getTrends(yearFrom, yearTo),
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorInstData, isLoading: vendorInstLoading } = useQuery({
    queryKey: ['categories', 'vendor-institution', selectedCategoryId],
    queryFn: () => categoriesApi.getVendorInstitution(selectedCategoryId!, 15),
    enabled: selectedCategoryId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const { data: subcategoryData, isLoading: subcategoryLoading } = useQuery({
    queryKey: ['categories', 'subcategories', selectedCategoryId],
    queryFn: () => categoriesApi.getSubcategories(selectedCategoryId!),
    enabled: selectedCategoryId !== null,
    staleTime: 10 * 60 * 1000,
  })

  const { data: topContractsData, isLoading: topContractsLoading } = useQuery({
    queryKey: ['categories', 'top-contracts', selectedCategoryId],
    queryFn: () => categoriesApi.getContracts(selectedCategoryId!, { per_page: 5, sort_by: 'amount_mxn', sort_order: 'desc' }),
    enabled: selectedCategoryId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const { data: sexenioData, isLoading: sexenioLoading } = useQuery({
    queryKey: ['categories', 'sexenio'],
    queryFn: () => categoriesApi.getSexenio(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: topVendorsData, isLoading: topVendorsLoading } = useQuery({
    queryKey: ['categories', 'top-vendors', selectedCategoryId],
    queryFn: () => categoriesApi.getTopVendors(selectedCategoryId!, 15),
    enabled: selectedCategoryId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const allCategories: CategoryStat[] = summaryData?.data ?? []

  // Apply sector + search filter
  const filteredCategories = useMemo(() => {
    let cats = allCategories
    if (sectorFilter) {
      cats = cats.filter(c => c.sector_code === sectorFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      cats = cats.filter(c =>
        (c.name_en || '').toLowerCase().includes(q) ||
        (c.name_es || '').toLowerCase().includes(q)
      )
    }
    return cats
  }, [allCategories, sectorFilter, searchQuery])

  // Derived stats
  const stats = useMemo(() => {
    if (!filteredCategories.length) return null
    const totalValue = filteredCategories.reduce((s, c) => s + c.total_value, 0)
    const totalContracts = filteredCategories.reduce((s, c) => s + c.total_contracts, 0)
    const avgRisk = totalContracts > 0
      ? filteredCategories.reduce((s, c) => s + c.avg_risk * c.total_contracts, 0) / totalContracts
      : 0
    const highRiskCategories = filteredCategories.filter(c => c.avg_risk >= RISK_THRESHOLDS.high).length
    return { totalValue, totalContracts, avgRisk, highRiskCategories }
  }, [filteredCategories])

  // Sort handler
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // Sorted partida view
  const sortedCategories = useMemo(() => {
    const sorted = [...filteredCategories]
    sorted.sort((a, b) => {
      const aVal = a[sortField] as number
      const bVal = b[sortField] as number
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return sorted
  }, [filteredCategories, sortField, sortDir])

  // Top 5 risk categories for Banderas Rojas
  const banderasRojas = useMemo(() => {
    return [...allCategories]
      .filter(c => c.avg_risk > 0 && c.total_contracts >= 10)
      .sort((a, b) => b.avg_risk - a.avg_risk)
      .slice(0, 5)
  }, [allCategories])

  // Highest risk category (for HallazgoStat)
  const highestRiskCat = useMemo(() => {
    if (!allCategories.length) return null
    return [...allCategories]
      .filter(c => c.avg_risk > 0 && c.total_contracts >= 10)
      .sort((a, b) => b.avg_risk - a.avg_risk)[0] ?? null
  }, [allCategories])

  // Top category by spend
  const topSpendCat = useMemo(() => {
    if (!allCategories.length) return null
    return [...allCategories].sort((a, b) => b.total_value - a.total_value)[0] ?? null
  }, [allCategories])

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = allCategories.find(c => c.category_id === selectedCategoryId)
    return cat ? localeName(cat, i18n.language) : null
  }, [selectedCategoryId, allCategories, i18n.language])

  const selectedCategorySectorId = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = allCategories.find(c => c.category_id === selectedCategoryId)
    return cat ? getSectorId(cat.sector_code) : null
  }, [selectedCategoryId, allCategories])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return allCategories.find(c => c.category_id === selectedCategoryId) ?? null
  }, [selectedCategoryId, allCategories])

  // Trend chart data
  const trendChartData = useMemo(() => {
    if (!trendsData?.data) return { years: [] as number[], series: [] as Array<{ name: string; sector_code: string | null; data: Record<number, number> }> }
    const items: TrendItem[] = trendsData.data
    const sortedByValue = [...filteredCategories].sort((a, b) => b.total_value - a.total_value)
    const targetIds = selectedCategoryId
      ? [selectedCategoryId]
      : (trendCount === null ? sortedByValue : sortedByValue.slice(0, trendCount)).map(c => c.category_id)
    const yearSet = new Set<number>()
    const seriesMap = new Map<number, { name: string; sector_code: string | null; data: Record<number, number> }>()

    for (const item of items) {
      if (!targetIds.includes(item.category_id)) continue
      yearSet.add(item.year)
      if (!seriesMap.has(item.category_id)) {
        const cat = filteredCategories.find(c => c.category_id === item.category_id)
        seriesMap.set(item.category_id, { name: localeName(item, i18n.language), sector_code: cat?.sector_code ?? null, data: {} })
      }
      const entry = seriesMap.get(item.category_id)
      if (entry) {
        entry.data[item.year] = item.value
      }
    }

    return { years: Array.from(yearSet).sort(), series: Array.from(seriesMap.values()) }
  }, [trendsData, filteredCategories, selectedCategoryId, trendCount, i18n.language])

  // Sparkline data
  const categorySparklines = useMemo(() => {
    if (!trendsData?.data) return new Map<number, number[]>()
    const items: TrendItem[] = trendsData.data
    const map = new Map<number, Map<number, number>>()
    for (const item of items) {
      if (!map.has(item.category_id)) map.set(item.category_id, new Map())
      const yearMap = map.get(item.category_id)
      if (yearMap) {
        yearMap.set(item.year, item.value)
      }
    }
    const result = new Map<number, number[]>()
    const recentYears = Array.from({ length: 5 }, (_, i) => yearTo - 4 + i)
    for (const [catId, yearMap] of map.entries()) {
      result.set(catId, recentYears.map(y => yearMap.get(y) ?? 0))
    }
    return result
  }, [trendsData, yearTo])

  const selectedCategoryTrend = useMemo(() => {
    if (!selectedCategoryId || !trendsData?.data) return []
    return (trendsData.data as TrendItem[])
      .filter(t => t.category_id === selectedCategoryId)
      .sort((a, b) => a.year - b.year)
  }, [selectedCategoryId, trendsData])

  // Scatter plot data for Risk x Value Quadrant
  const scatterData = useMemo(() => {
    return allCategories
      .filter(c => c.total_value > 0 && c.avg_risk > 0)
      .map(c => ({
        category_id: c.category_id,
        name: localeName(c, i18n.language),
        total_value: c.total_value,
        avg_risk: c.avg_risk,
        total_contracts: c.total_contracts,
        direct_award_pct: c.direct_award_pct,
        sector_code: c.sector_code,
        radius: Math.max(4, Math.min(12, Math.sqrt(c.total_contracts / 1000))),
        fill: c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : '#64748b',
      }))
  }, [allCategories, i18n.language])

  const scatterMedianValue = useMemo(() => {
    if (!scatterData.length) return 0
    const sorted = [...scatterData].sort((a, b) => a.total_value - b.total_value)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1].total_value + sorted[mid].total_value) / 2
      : sorted[mid].total_value
  }, [scatterData])

  // Sexenio stacked bar data
  const ADMIN_NAMES = ['Fox', 'Calderon', 'Pena Nieto', 'AMLO', 'Sheinbaum']
  const ADMIN_DISPLAY: Record<string, string> = {
    Fox: 'Fox', Calderon: 'Calderon', 'Calderón': 'Calderon',
    'Pena Nieto': 'Pena Nieto', 'Peña Nieto': 'Pena Nieto',
    AMLO: 'AMLO', Sheinbaum: 'Sheinbaum',
  }

  const sexenioChartData = useMemo(() => {
    if (!sexenioData?.data) return []
    const top10 = [...allCategories]
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
    const top10Ids = new Set(top10.map(c => c.category_id))

    const adminTotals = new Map<string, Record<string, number>>()
    for (const admin of ADMIN_NAMES) {
      adminTotals.set(admin, {})
    }

    for (const cat of sexenioData.data) {
      if (!top10Ids.has(cat.category_id)) continue
      const catKey = localeName(cat, i18n.language).slice(0, 20)
      for (const [rawAdmin, vals] of Object.entries(cat.administrations)) {
        const admin = ADMIN_DISPLAY[rawAdmin] ?? rawAdmin
        if (!adminTotals.has(admin)) continue
        const bucket = adminTotals.get(admin)!
        bucket[catKey] = (bucket[catKey] ?? 0) + vals.value
      }
    }

    return ADMIN_NAMES.map(admin => ({
      admin,
      ...adminTotals.get(admin),
    }))
  }, [sexenioData, allCategories, i18n.language])

  const sexenioCategories = useMemo(() => {
    return [...allCategories]
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
      .map(c => ({
        key: localeName(c, i18n.language).slice(0, 20),
        color: c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : '#64748b',
      }))
  }, [allCategories, i18n.language])

  // Auto-scroll to detail panels when a category is selected
  useEffect(() => {
    if (selectedCategoryId !== null) {
      const timer = setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [selectedCategoryId])

  const yearOptions = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

  // Estimate health-related category spend for ImpactoHumano
  const healthCategorySpend = useMemo(() => {
    return allCategories
      .filter(c => c.sector_code === 'salud')
      .reduce((s, c) => s + c.total_value, 0)
  }, [allCategories])

  // Loading skeleton — mirrors final layout (hero, stats, treemap, ranking)
  if (summaryLoading && !summaryData) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <ChartSkeleton height={480} />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (summaryError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-primary">{t('errors.loadCategories')}</p>
          <p className="text-xs text-text-muted mt-1">{t('errors.checkConnection')}</p>
        </div>
      </div>
    )
  }

  const highestRiskPct = highestRiskCat ? (highestRiskCat.avg_risk * 100).toFixed(0) : '0'

  return (
    <EditorialPageShell
      kicker="SPENDING CATEGORIES · PARTIDA ANALYSIS"
      headline={<>Where the budget flows, <em>line by line.</em></>}
      paragraph="Federal procurement organized by partida codes — Mexico's budget classification system — reveals concentration patterns invisible in sector-level analysis."
      severity="medium"
      loading={summaryLoading && !summaryData}
      stats={[
        {
          value: allCategories.length > 0 ? formatNumber(allCategories.length) : '—',
          label: 'categories tracked',
          color: '#60a5fa',
        },
        {
          value: stats ? formatCompactMXN(stats.totalValue) : '—',
          label: 'total spend (filtered)',
          color: '#fbbf24',
        },
        {
          value: stats ? formatNumber(stats.totalContracts) : '—',
          label: 'contracts',
          color: '#a78bfa',
        },
        {
          value: highestRiskCat ? `${highestRiskPct}%` : '—',
          label: highestRiskCat ? `top risk: ${truncate(localeName(highestRiskCat, i18n.language), 22)}` : 'top risk category',
          color: '#f87171',
        },
      ]}
    >
      <Act number="I" label="THE CATEGORIES">
    <div className="space-y-8">
      {/* ================================================================= */}
      {/* 1. Editorial Headline                                             */}
      {/* ================================================================= */}
      <EditorialHeadline
        section={t('hero.trackingLabel')}
        headline={t('hero.headline')}
        subtitle={t('hero.analysisSubtitle')}
      />

      {/* ================================================================= */}
      {/* 2. Three HallazgoStat cards                                       */}
      {/* ================================================================= */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <HallazgoStat
          value={allCategories.length > 0 ? String(allCategories.length) : '—'}
          label={t('hero.categoriesTrackedLabel')}
          annotation={t('hero.categoriesAnnotation')}
          color="border-blue-500"
        />
        <HallazgoStat
          value={`${highestRiskPct}%`}
          label={highestRiskCat
            ? `${t('hero.highestRiskCategory')}: ${truncate(localeName(highestRiskCat, i18n.language), 35)}`
            : t('hero.highestRiskCategory')
          }
          annotation={highestRiskCat ? t('hero.contracts', { count: highestRiskCat.total_contracts }) : undefined}
          color="border-red-500"
        />
        <HallazgoStat
          value={topSpendCat ? formatCompactMXN(topSpendCat.total_value) : '—'}
          label={topSpendCat
            ? `${t('hero.highestValueCategory')}: ${truncate(localeName(topSpendCat, i18n.language), 35)}`
            : t('hero.highestValueCategory')
          }
          annotation={topSpendCat ? t('hero.contracts', { count: topSpendCat.total_contracts }) : undefined}
          color="border-amber-500"
        />
      </div>

      {/* ================================================================= */}
      {/* 2.4 Squarified Treemap — spend hierarchy at a glance              */}
      {/* ================================================================= */}
      {allCategories.length > 0 && (
        <section aria-labelledby="treemap-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                <Layers className="h-3 w-3 inline-block mr-1 -mt-0.5" />
                RUBLI · {i18n.language === 'en' ? 'The Anatomy of Federal Spend' : 'La Anatomía del Gasto Federal'}
              </p>
              <h2
                id="treemap-heading"
                className="text-2xl font-bold text-text-primary leading-tight"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {i18n.language === 'en'
                  ? <>9.9 trillion pesos, <em>mapped.</em></>
                  : <>9.9 billones de pesos, <em>mapeados.</em></>
                }
              </h2>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                {i18n.language === 'en'
                  ? 'Each rectangle is a partida code. Size is total spend. Color is sector. Darker fill means higher average risk. Click any cell to investigate.'
                  : 'Cada rectángulo es un código partida. El tamaño es el gasto total. El color es el sector. Mayor intensidad indica mayor riesgo promedio. Clic en cualquier celda para investigar.'
                }
              </p>
            </div>
            <FuentePill source="COMPRANET · 2002–2025" verified={true} />
          </div>
          <div className="rounded-xl border border-border/30 bg-background-card/50 p-2">
            {summaryLoading ? (
              <ChartSkeleton height={480} />
            ) : (
              <TreemapSquarified
                categories={allCategories}
                lang={i18n.language}
                height={480}
                onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
              />
            )}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 2.5 Category Ranking — editorial replacement for 72-cell treemap  */}
      {/* ================================================================= */}
      {allCategories.length > 0 && (
        <section aria-labelledby="ranking-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                RUBLI · {i18n.language === 'en' ? 'Where the Money Goes' : 'A Dónde Va el Dinero'}
              </p>
              <h2
                id="ranking-heading"
                className="text-2xl font-bold text-text-primary leading-tight"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {i18n.language === 'en'
                  ? <>The <em>top 20 categories</em> — ranked by spend, flagged by risk.</>
                  : <>Las <em>20 categorías principales</em> — por gasto, con riesgo.</>
                }
              </h2>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                {i18n.language === 'en'
                  ? `Of ${allCategories.length} partida codes, the top 20 account for the majority of federal procurement. Rows in crimson signal critical-risk categories — those whose procurement patterns most closely resemble documented corruption cases.`
                  : `De ${allCategories.length} códigos partida, las 20 principales concentran la mayoría del gasto federal. Las filas en carmesí indican categorías de riesgo crítico — aquellas cuyos patrones de adquisición se asemejan más a casos documentados de corrupción.`
                }
              </p>
            </div>
            <FuentePill source="COMPRANET · 2002–2025" verified={true} />
          </div>
          <div className="rounded-xl border border-border/30 bg-background-card/50 p-5">
            <CategoryRanking
              categories={allCategories}
              lang={i18n.language}
              limit={20}
              onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
            />
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 2.6 Top Findings Bar — 3 views                                    */}
      {/* ================================================================= */}
      {allCategories.length > 0 && (
        <TopFindingsBar
          categories={allCategories}
          onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
        />
      )}

      {/* ================================================================= */}
      {/* 3. Journalistic Lede                                              */}
      {/* ================================================================= */}
      <div className="border-l-[3px] border-red-600 pl-5 py-2">
        <p
          className="text-lg text-text-primary leading-relaxed"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {allCategories.length > 0
            ? t('lede.text', { count: allCategories.length, pct: highestRiskPct })
            : t('hero.loading')
          }
        </p>
        <div className="mt-2">
          <FuentePill source="COMPRANET" count={allCategories.reduce((s, c) => s + c.total_contracts, 0)} countLabel={t('hero.contractsLabel')} verified={true} />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. Banderas Rojas — Top 5 by risk                                 */}
      {/* ================================================================= */}
      {banderasRojas.length > 0 && (
        <section aria-labelledby="banderas-rojas-heading">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="h-4 w-4 text-red-500" />
            <h2
              id="banderas-rojas-heading"
              className="text-lg font-bold text-text-primary tracking-tight"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('banderasRojas.title')}
            </h2>
            <span className="text-xs text-text-muted ml-2">
              {t('banderasRojas.subtitle')}
            </span>
          </div>

          <div className="space-y-1">
            {banderasRojas.map((cat, idx) => {
              const riskLevel = getRiskLevelFromScore(cat.avg_risk)
              const riskColor = RISK_COLORS[riskLevel]
              return (
                <div
                  key={cat.category_id}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border/30 bg-background-card hover:bg-background-elevated/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedCategoryId(prev => prev === cat.category_id ? null : cat.category_id)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedCategoryId(prev => prev === cat.category_id ? null : cat.category_id) }}
                >
                  {/* Rank */}
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                  >
                    {idx + 1}
                  </span>

                  {/* Name + sector */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {cat.sector_code && (
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SECTOR_COLORS[cat.sector_code] || '#64748b' }}
                        />
                      )}
                      <span className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                        {localeName(cat, i18n.language)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      <span>{formatCompactMXN(cat.total_value)}</span>
                      <span>&middot;</span>
                      <span>{t('banderasRojas.contracts', { count: cat.total_contracts })}</span>
                      {cat.sector_code && (
                        <>
                          <span>&middot;</span>
                          <span className="capitalize">{t(`sectors.${cat.sector_code}`)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Risk badge */}
                  <div className="flex-shrink-0 text-right">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold font-mono"
                      style={{
                        color: riskColor,
                        backgroundColor: `${riskColor}15`,
                        borderLeft: `3px solid ${riskColor}`,
                      }}
                    >
                      {(cat.avg_risk * 100).toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider font-mono">
                      {getRiskLabel(cat.avg_risk)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 4.5 Signal vs. Noise — risk-adjusted outliers                     */}
      {/* ================================================================= */}
      {allCategories.length > 0 && (
        <SignalNoiseOutliers
          categories={allCategories}
          lang={i18n.language}
          onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
        />
      )}

      {/* ================================================================= */}
      {/* 5. Search / Filter Bar                                            */}
      {/* ================================================================= */}
      <div className="space-y-3">
        <div className="h-px bg-border" />
        <div className="flex items-center gap-3 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full h-8 pl-8 pr-3 rounded border border-border bg-background-card text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label={t('filters.searchAriaLabel')}
            />
          </div>

          {/* Year range — applies to trend chart only */}
          <div className="flex items-center gap-2" title="This year range applies to the spending trend chart only. Summary statistics and other charts cover all years 2002–2025.">
            <label htmlFor="year-from" className="text-xs text-text-muted whitespace-nowrap">{t('filters.trendYearLabel')}</label>
            <select
              id="year-from"
              value={yearFrom}
              onChange={e => setYearFrom(Math.min(Number(e.target.value), yearTo))}
              className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-text-muted">{t('filters.yearTo')}</span>
            <select
              id="year-to"
              value={yearTo}
              onChange={e => setYearTo(Math.max(Number(e.target.value), yearFrom))}
              className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Sector filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="sector-filter" className="text-xs text-text-muted whitespace-nowrap">{t('filters.sectorLabel')}</label>
            <select
              id="sector-filter"
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {SECTOR_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.code === '' ? t('filters.allSectors') : opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-px bg-border" />
      </div>

      {/* ================================================================= */}
      {/* 6. Category Cards / Table                                         */}
      {/* ================================================================= */}
      <section aria-labelledby="categories-table-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="categories-table-heading"
            className="text-base font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('filters.categoriesCount', { count: filteredCategories.length })}{sectorFilter ? ` — ${t(`sectors.${sectorFilter}`)}` : ''}
          </h2>
          {stats && (
            <span className="text-xs text-text-muted">
              {formatCompactMXN(stats.totalValue)} total &middot; {t('table.avgRiskLabel')} {(stats.avgRisk * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {selectedCategoryId !== null && selectedCategory && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20 mb-3 text-xs animate-in fade-in duration-200">
            <span className="font-mono text-text-muted/60 uppercase tracking-wider text-[10px] flex-shrink-0">{t('table.selected')}:</span>
            <span className="font-semibold text-accent truncate flex-1">{localeName(selectedCategory, i18n.language)}</span>
            <button
              onClick={() => setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors whitespace-nowrap flex-shrink-0 font-mono"
            >
              {t('filters.viewDetails')}
            </button>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              aria-label={t('filters.deselectCategory')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {summaryLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <SectorGroupedCategories
            categories={filteredCategories}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            selectedCategoryId={selectedCategoryId}
            onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
            categorySparklines={categorySparklines}
            onNavigate={navigate}
          />
        )}
      </section>

      {/* ================================================================= */}
      {/* 7. Subcategory + Vendor Drill-Down Panels                         */}
      {/* ================================================================= */}
      <div ref={detailPanelRef} className="scroll-mt-4 space-y-4">
        {selectedCategoryId === null && sortedCategories.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-4 py-3 text-xs text-text-muted">
            <ArrowUpRight className="h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span>{t('filters.tableHint')}</span>
          </div>
        )}
        {selectedCategoryId !== null && selectedCategory && (
          <CategorySummaryCard
            category={selectedCategory}
            onClose={() => setSelectedCategoryId(null)}
            onNavigate={navigate}
            trendItems={selectedCategoryTrend}
          />
        )}
        {selectedCategoryId !== null && selectedCategory && (topVendorsLoading || (topVendorsData?.data?.length ?? 0) > 0) && (
          <VendorConcentrationCallout
            categoryName={localeName(selectedCategory, i18n.language)}
            categoryTotalValue={topVendorsData?.total_value ?? selectedCategory.total_value}
            hhi={topVendorsData?.hhi ?? 0}
            concentrationLabel={topVendorsData?.concentration_label ?? 'competitive'}
            top3SharePct={topVendorsData?.top3_share_pct ?? 0}
            vendors={(topVendorsData?.data ?? []) as TopVendorRow[]}
            loading={topVendorsLoading}
            lang={i18n.language}
            onNavigate={navigate}
          />
        )}
        {selectedCategoryId !== null && (subcategoryLoading || (subcategoryData?.data?.length ?? 0) > 0) && (
          <SubcategoryPanel
            categoryName={selectedCategoryName ?? ''}
            items={subcategoryData?.data ?? []}
            loading={subcategoryLoading}
            onNavigate={navigate}
          />
        )}
        {selectedCategoryId !== null && (
          <CategoryDetailPanel
            categoryId={selectedCategoryId}
            categoryName={selectedCategoryName ?? ''}
            sectorId={selectedCategorySectorId}
            pairs={vendorInstData?.data ?? []}
            loading={vendorInstLoading}
            onClose={() => setSelectedCategoryId(null)}
            onNavigate={navigate}
            topContracts={topContractsData?.data as TopContractItem[] ?? []}
            topContractsLoading={topContractsLoading}
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* 7b. Risk x Value Quadrant                                        */}
      {/* ================================================================= */}
      <section aria-labelledby="risk-value-heading">
        <div className="h-px bg-border mb-6" />
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('riskMap.eyebrow')}
          </p>
          <h2
            id="risk-value-heading"
            className="text-xl font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('riskMap.title')}
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            {t('riskMap.scatterDescription')}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {summaryLoading ? (
              <ChartSkeleton height={380} />
            ) : scatterData.length > 0 ? (
              <QuadrantScatterSVG
                data={scatterData}
                medianValue={scatterMedianValue}
                onNavigate={navigate}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                {t('scatter.noData')}
              </div>
            )}
          </CardContent>
        </Card>
        <FuentePill source="COMPRANET 2002-2025" />
      </section>

      {/* ================================================================= */}
      {/* 7c. Sexenio Shifts                                                */}
      {/* ================================================================= */}
      <section aria-labelledby="sexenio-shifts-heading">
        <div className="h-px bg-border mb-6" />
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            {t('sexenio.eyebrow')}
          </p>
          <h2
            id="sexenio-shifts-heading"
            className="text-xl font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('sexenio.title')}
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            {t('sexenio.description')}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {sexenioLoading ? (
              <ChartSkeleton height={380} />
            ) : sexenioChartData.length > 0 ? (
              <SexenioStackedDotColumns
                data={sexenioChartData}
                categories={sexenioCategories}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                {t('sexenio.noData')}
              </div>
            )}
            <p className="text-[10px] text-text-muted/50 mt-2 font-mono">
              {t('sexenio.footnote')}
            </p>
          </CardContent>
        </Card>
        <FuentePill source="COMPRANET 2002-2025" />
      </section>

      {/* ================================================================= */}
      {/* 8. Charts Section                                                 */}
      {/* ================================================================= */}
      <div className="space-y-5">
        <div className="h-px bg-border" />

        {/* Direct Award Concentration */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-family-serif)' }}>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  {t('da.chartTitle', 'Concentración por Adjudicación Directa')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('da.chartDesc', 'Categorías con mayor proporción de contratos sin licitación, ordenadas por porcentaje. La línea roja marca el límite recomendado por la OCDE (25%).')}
                </CardDescription>
              </div>
              <FuentePill source="COMPRANET 2002–2025" />
            </div>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <ChartSkeleton height={440} />
            ) : (
              <DAConcentrationChart
                categories={filteredCategories}
                lang={i18n.language}
                onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
              />
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 flex-1 text-sm" style={{ fontFamily: 'var(--font-family-serif)' }}>
                <TrendingUp className="h-4 w-4 text-text-muted" />
                {t('trends.title')}
                {selectedCategoryName ? (
                  <span className="ml-auto text-xs text-amber-400 font-normal">
                    {t('sexenio.barChartShowing', { name: selectedCategoryName })}
                  </span>
                ) : (
                  <div className="ml-auto flex items-center gap-1">
                    {([5, 10, 20] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setTrendCount(n)}
                        className={cn(
                          'px-2 py-0.5 text-xs rounded border transition-colors',
                          trendCount === n
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border/50 text-text-muted hover:border-accent/40 hover:text-text-primary'
                        )}
                      >
                        Top {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setTrendCount(null)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border transition-colors',
                        trendCount === null
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border/50 text-text-muted hover:border-accent/40 hover:text-text-primary'
                      )}
                    >
                      {t('sexenio.all')}
                    </button>
                  </div>
                )}
              </CardTitle>
              <ChartDownloadButton targetRef={trendChartRef} filename="spending-category-trends" />
            </div>
            <CardDescription>
              {t('trends.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton height={320} type="area" />
            ) : trendChartData.years.length > 0 ? (
              <div style={{ height: 320 }} ref={trendChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                    <XAxis
                      dataKey="year"
                      type="number"
                      domain={[trendChartData.years[0], trendChartData.years[trendChartData.years.length - 1]]}
                      ticks={trendChartData.years}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      interval={trendChartData.years.length > 10 ? 2 : 0}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCompactMXN(v)}
                      width={72}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg space-y-1.5"
                            style={{ backgroundColor: 'var(--color-background-card)', borderColor: 'var(--color-border)' }}
                          >
                            <p className="font-bold text-text-primary text-[11px]">{label}</p>
                            {payload.map((p, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color ?? '#888' }} />
                                <span className="text-text-muted/80 truncate max-w-[180px]">{truncate(String(p.name), 30)}</span>
                                <span className="ml-auto font-semibold tabular-nums" style={{ color: p.color ?? '#e2e8f0' }}>
                                  {formatCompactMXN(p.value as number)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={48}
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(value: string) => (
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {truncate(value, 28)}
                        </span>
                      )}
                    />
                    {trendChartData.series.map((series) => {
                      const lineColor = series.sector_code ? (SECTOR_COLORS[series.sector_code] ?? '#64748b') : '#64748b'
                      return (
                        <Line
                          key={series.name}
                          type="monotone"
                          data={trendChartData.years.map(y => ({ year: y, value: series.data[y] || 0 }))}
                          dataKey="value"
                          name={series.name}
                          stroke={lineColor}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: '#0d1117' }}
                          connectNulls={false}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <TrendingUp className="h-8 w-8 text-text-muted/30" />
                <div>
                  <p className="text-sm text-text-muted">{t('trends.empty', 'Selecciona una categoría arriba')}</p>
                  <p className="text-[11px] text-text-muted/50 mt-1 font-mono">{t('trends.emptyHint', 'o ajusta el rango de años para ver la evolución del gasto')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* 9. See Also cross-link                                            */}
      {/* ================================================================= */}
      <div className="flex items-center gap-3 py-3 border-t border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Ver también
        </span>
        <button
          onClick={() => navigate('/price-analysis')}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-700/60 hover:border-zinc-500 rounded px-2.5 py-1"
        >
          Análisis de Precios Anómalos
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* ================================================================= */}
      {/* 10. ImpactoHumano                                                 */}
      {/* ================================================================= */}
      {healthCategorySpend > 0 && (
        <section>
          <div className="h-px bg-border mb-6" />
          <div className="max-w-2xl">
            <p
              className="text-sm text-text-secondary leading-relaxed mb-3"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              Las categorías de medicamentos y equipo médico representan una parte sustancial del gasto en salud &mdash; y presentan indicadores de riesgo elevados.
            </p>
            <ImpactoHumano amountMxn={healthCategorySpend} />
          </div>
        </section>
      )}
    </div>
      </Act>
    </EditorialPageShell>
  )
}
