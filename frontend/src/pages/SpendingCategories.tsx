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
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  Cell,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
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
} from 'lucide-react'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { getSectorNameEN, SECTORS } from '@/lib/constants'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
import { CategoryTreemap } from '@/components/charts/CategoryTreemap'

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

function getRiskColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return RISK_COLORS[level]
}

function getRiskLabel(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <span className="text-text-muted/40 ml-1">&#8597;</span>
  return <span className="text-accent ml-1">{sortDir === 'desc' ? '\u25BC' : '\u25B2'}</span>
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
const MAX_YEAR = 2025

// Sector options for filter dropdown
const SECTOR_OPTIONS = [
  { code: '', label: 'Todos los Sectores' },
  { code: 'salud', label: 'Salud' },
  { code: 'educacion', label: 'Educación' },
  { code: 'infraestructura', label: 'Infraestructura' },
  { code: 'energia', label: 'Energía' },
  { code: 'defensa', label: 'Defensa' },
  { code: 'tecnologia', label: 'Tecnología' },
  { code: 'hacienda', label: 'Hacienda' },
  { code: 'gobernacion', label: 'Gobernación' },
  { code: 'agricultura', label: 'Agricultura' },
  { code: 'ambiente', label: 'Medio Ambiente' },
  { code: 'trabajo', label: 'Trabajo' },
  { code: 'otros', label: 'Otros' },
]

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
              Principales relaciones proveedor-institución por monto
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onNavigate(`/categories/${categoryId}`)}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 px-2 py-1 rounded"
            >
              <ExternalLink className="h-3 w-3" />
              Ver perfil completo
            </button>
            <button
              onClick={() => onNavigate(`/contracts?category_id=${categoryId}`)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors border border-accent/30 px-2 py-1 rounded"
            >
              <ExternalLink className="h-3 w-3" />
              Ver contratos
            </button>
            {sectorId && (
              <button
                onClick={() => onNavigate(`/investigation?sector_id=${sectorId}`)}
                className="flex items-center gap-1 text-xs text-[#f87171] hover:text-[#fca5a5] transition-colors border border-[#f87171]/30 px-2 py-1 rounded"
                title="Ver casos de investigación en este sector"
              >
                <ExternalLink className="h-3 w-3" />
                Casos
              </button>
            )}
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Cerrar panel"
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
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Contratos más costosos</p>
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
                <span>Proveedor</span>
                <span className="text-text-muted/30">&rarr;</span>
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>Institución</span>
              </div>
              <span className="w-20 text-right flex-shrink-0">Monto</span>
              <span className="w-14 text-right flex-shrink-0 hidden md:block">Contratos</span>
              <span className="w-12 text-right flex-shrink-0 hidden lg:block">Riesgo</span>
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
            {category.name_es || category.name_en}
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
            Contratos
          </button>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Cerrar resumen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border/10">
        {/* Total Value */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">Monto Total</p>
          <p className="text-xl font-mono font-bold text-text-primary leading-tight">
            {formatCompactMXN(category.total_value)}
          </p>
        </div>

        {/* Contract Count */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">Contratos</p>
          <p className="text-xl font-mono font-bold text-text-primary leading-tight">
            {formatNumber(category.total_contracts)}
          </p>
          <p className="text-[10px] text-text-muted/50 mt-0.5 font-mono">
            ~{formatCompactMXN(category.total_contracts > 0 ? category.total_value / category.total_contracts : 0)} prom.
          </p>
        </div>

        {/* Avg Risk */}
        <div className="bg-background-card px-4 py-3.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">Riesgo Promedio</p>
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
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">Adj. Directa</p>
          <p
            className="text-xl font-mono font-bold leading-tight"
            style={{ color: isHighDA ? '#fb923c' : 'var(--color-text-primary)' }}
          >
            {category.direct_award_pct != null ? `${category.direct_award_pct.toFixed(0)}%` : '—'}
          </p>
          {isOECDViolation && (
            <p className="text-[10px] text-cyan-400 mt-0.5 font-mono">
              OCDE: max 25%
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
              title="OCDE max 25%"
            />
          </div>
        </div>

        {/* Top Vendor */}
        <div className="bg-background-card px-4 py-3.5 col-span-2 md:col-span-1">
          <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60 mb-1">Principal Proveedor</p>
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
              {category.single_bid_pct.toFixed(0)}% licitaci{'ó'}n {'ú'}nica
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
              <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/60">Tendencia de gasto ({last5[0].year}–{last5[last5.length - 1].year})</p>
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
        if (category.direct_award_pct > 75) flags.push(`${category.direct_award_pct.toFixed(0)}% adj. directa — ${(category.direct_award_pct / 25).toFixed(1)}x límite OCDE`)
        else if (category.direct_award_pct > 25) flags.push(`${category.direct_award_pct.toFixed(0)}% adj. directa excede límite OCDE (25%)`)
        if (category.single_bid_pct > 25) flags.push(`${category.single_bid_pct.toFixed(0)}% licitaciones con un solo postor`)
        if (category.avg_risk >= 0.60) flags.push('Riesgo crítico — patrón coincide con casos de corrupción documentados')
        else if (category.avg_risk >= 0.40) flags.push('Riesgo alto — revisar patrones de concentración de proveedores')
        if (!flags.length) return null
        return (
          <div className="px-5 py-3 border-t border-red-500/20 bg-red-500/[0.04]">
            <p className="text-[9px] font-mono uppercase tracking-wide text-red-400 mb-1.5">INDICADORES DE RIESGO</p>
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
            HALLAZGO
          </p>
          <p className="text-sm text-zinc-200">
            {category.avg_risk >= 0.40 && isHighDA
              ? `Esta categoría combina riesgo ${riskLevel} (${(category.avg_risk * 100).toFixed(0)}%) con ${category.direct_award_pct.toFixed(0)}% de adjudicación directa — ${(category.direct_award_pct / 25).toFixed(1)}x el límite OCDE de 25%.`
              : category.avg_risk >= 0.40
                ? `Riesgo promedio ${riskLevel} en ${formatNumber(category.total_contracts)} contratos por ${formatCompactMXN(category.total_value)}. Revisar patrones de concentración.`
                : `${category.direct_award_pct.toFixed(0)}% de adjudicación directa — ${(category.direct_award_pct / 25).toFixed(1)}x el límite OCDE de 25%. Baja competencia en esta categoría.`
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
            Qué se compró &mdash; {categoryName}
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
    { key: 'value', label: 'Monto' },
    { key: 'risk',  label: 'Riesgo' },
    { key: 'da',    label: 'AD%' },
    { key: 'sb',    label: 'LU%' },
  ]

  return (
    <Card className="border-blue-500/20 bg-blue-500/[0.02] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              Qué se compró
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {namedCount} subcategorías &middot; {categoryName} &middot; haga clic en una fila para expandir
            </CardDescription>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-[9px] text-text-muted/50 font-mono uppercase mr-1.5">Ordenar</span>
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
            <span>{classifiedPct.toFixed(0)}% del gasto categorizado en subcategorías</span>
            <span className="text-text-muted/40">{catchAllPct.toFixed(0)}% sin clasificar</span>
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
          <div className="flex-1 min-w-0">Subcategoría</div>
          <span className="w-20 text-right flex-shrink-0">Monto</span>
          <span className="w-12 text-right flex-shrink-0">%</span>
          <span className="w-10 text-right flex-shrink-0 hidden lg:block">Riesgo</span>
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
                          otros
                        </span>
                      )}
                      {isFlagged && (
                        <span title={`${isHighDA ? `${sub.direct_award_pct.toFixed(0)}% adjudicación directa` : ''}${isHighDA && isHighSB ? ' · ' : ''}${isHighSB ? `${sub.single_bid_pct.toFixed(0)}% licitación única` : ''}`}>
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
                            isHighDA && `${sub.direct_award_pct.toFixed(0)}% adjudicación directa (baja competencia)`,
                            isHighSB && `${sub.single_bid_pct.toFixed(0)}% licitación única`,
                            sub.avg_risk >= RISK_THRESHOLDS.high && `riesgo promedio ${(sub.avg_risk * 100).toFixed(0)}%`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">Contratos</p>
                        <p className="text-sm font-mono font-bold text-text-primary">{formatNumber(sub.total_contracts)}</p>
                      </div>
                      {sub.year_min != null && sub.year_max != null && (
                        <div>
                          <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">Años activo</p>
                          <p className="text-sm font-mono font-bold text-text-primary">{sub.year_min}–{sub.year_max}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">Adj. Directa</p>
                        <p
                          className="text-sm font-mono font-bold"
                          style={{ color: isHighDA ? '#fb923c' : 'var(--color-text-primary)' }}
                        >
                          {sub.direct_award_pct > 0 ? `${sub.direct_award_pct.toFixed(0)}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">Licit. Única</p>
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
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted flex-shrink-0">Principal proveedor</p>
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
                          Títulos de contratos ejemplo
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
    { key: 'value', label: 'Mayor gasto', hint: 'Por monto total' },
    { key: 'risk', label: 'Mayor riesgo', hint: 'Por score promedio' },
    { key: 'da', label: 'Adj. directa', hint: '% sobre total' },
  ]

  const getMetric = (cat: CategoryStat): { value: string; color: string; sub: string } => {
    if (view === 'value') {
      return {
        value: formatCompactMXN(cat.total_value),
        color: '#fafafa',
        sub: `${formatNumber(cat.total_contracts)} contratos`,
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
      sub: overLimit ? `${(cat.direct_award_pct / 25).toFixed(1)}x límite OCDE` : 'Dentro de límite OCDE',
    }
  }

  return (
    <section aria-labelledby="top-findings-heading">
      <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            RUBLI · Ranking dinámico
          </p>
          <h2
            id="top-findings-heading"
            className="text-lg font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Las cinco categorías que importan
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
                {truncate(cat.name_es || cat.name_en, 50)}
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
// Main Component
// =============================================================================

export default function SpendingCategories() {
  const navigate = useNavigate()
  const { t } = useTranslation('spending')
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
    return cat ? (cat.name_en || cat.name_es) : null
  }, [selectedCategoryId, allCategories])

  const selectedCategorySectorId = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = allCategories.find(c => c.category_id === selectedCategoryId)
    return cat ? getSectorId(cat.sector_code) : null
  }, [selectedCategoryId, allCategories])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return allCategories.find(c => c.category_id === selectedCategoryId) ?? null
  }, [selectedCategoryId, allCategories])

  // Treemap data
  const treemapData = useMemo(() => {
    return filteredCategories
      .filter(c => c.total_value > 0)
      .slice(0, 30)
      .map(c => ({
        name: c.name_en || c.name_es,
        value: c.total_value,
        category_id: c.category_id,
        fill: selectedCategoryId === c.category_id
          ? '#f59e0b'
          : c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : getRiskColor(c.avg_risk),
      }))
  }, [filteredCategories, selectedCategoryId])

  // Trend chart data
  const trendChartData = useMemo(() => {
    if (!trendsData?.data) return { years: [] as number[], series: [] as Array<{ name: string; data: Record<number, number> }> }
    const items: TrendItem[] = trendsData.data
    const sortedByValue = [...filteredCategories].sort((a, b) => b.total_value - a.total_value)
    const targetIds = selectedCategoryId
      ? [selectedCategoryId]
      : (trendCount === null ? sortedByValue : sortedByValue.slice(0, trendCount)).map(c => c.category_id)
    const yearSet = new Set<number>()
    const seriesMap = new Map<number, { name: string; data: Record<number, number> }>()

    for (const item of items) {
      if (!targetIds.includes(item.category_id)) continue
      yearSet.add(item.year)
      if (!seriesMap.has(item.category_id)) {
        seriesMap.set(item.category_id, { name: item.name_en || item.name_es, data: {} })
      }
      const entry = seriesMap.get(item.category_id)
      if (entry) {
        entry.data[item.year] = item.value
      }
    }

    return { years: Array.from(yearSet).sort(), series: Array.from(seriesMap.values()) }
  }, [trendsData, filteredCategories, selectedCategoryId, trendCount])

  const TREND_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#16a34a', '#dc2626']

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
        name: c.name_es || c.name_en,
        total_value: c.total_value,
        avg_risk: c.avg_risk,
        total_contracts: c.total_contracts,
        direct_award_pct: c.direct_award_pct,
        sector_code: c.sector_code,
        radius: Math.max(4, Math.min(12, Math.sqrt(c.total_contracts / 1000))),
        fill: c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : '#64748b',
      }))
  }, [allCategories])

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
      const catKey = (cat.name_es || cat.name_en).slice(0, 20)
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
  }, [sexenioData, allCategories])

  const sexenioCategories = useMemo(() => {
    return [...allCategories]
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
      .map(c => ({
        key: (c.name_es || c.name_en).slice(0, 20),
        color: c.sector_code ? (SECTOR_COLORS[c.sector_code] || '#64748b') : '#64748b',
      }))
  }, [allCategories])

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

  // Loading skeleton
  if (summaryLoading && !summaryData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
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
    <div className="space-y-8">
      {/* ================================================================= */}
      {/* 1. Editorial Headline                                             */}
      {/* ================================================================= */}
      <EditorialHeadline
        section="PARTIDAS PRESUPUESTARIAS"
        headline="En Qué Gasta el Gobierno: Un Desglose por Categoría"
        subtitle="Análisis de los códigos Partida que revelan dónde se concentra el gasto público y el riesgo de corrupción"
      />

      {/* ================================================================= */}
      {/* 2. Three HallazgoStat cards                                       */}
      {/* ================================================================= */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <HallazgoStat
          value={allCategories.length > 0 ? String(allCategories.length) : '—'}
          label="Categorías de gasto rastreadas"
          annotation="Códigos Partida presupuestal, 2002–2025"
          color="border-blue-500"
        />
        <HallazgoStat
          value={`${highestRiskPct}%`}
          label={highestRiskCat
            ? `Riesgo promedio más alto: ${truncate(highestRiskCat.name_es || highestRiskCat.name_en, 35)}`
            : 'Categoría de mayor riesgo'
          }
          annotation={highestRiskCat ? `${formatNumber(highestRiskCat.total_contracts)} contratos` : undefined}
          color="border-red-500"
        />
        <HallazgoStat
          value={topSpendCat ? formatCompactMXN(topSpendCat.total_value) : '—'}
          label={topSpendCat
            ? `Mayor gasto: ${truncate(topSpendCat.name_es || topSpendCat.name_en, 35)}`
            : 'Categoría líder en gasto'
          }
          annotation={topSpendCat ? `${formatNumber(topSpendCat.total_contracts)} contratos` : undefined}
          color="border-amber-500"
        />
      </div>

      {/* ================================================================= */}
      {/* 2.5 Category Treemap — hero visualization                         */}
      {/* ================================================================= */}
      {allCategories.length > 0 && (
        <section aria-labelledby="treemap-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                RUBLI · Mapa de gasto
              </p>
              <h2
                id="treemap-heading"
                className="text-lg font-bold text-text-primary tracking-tight"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {allCategories.length} categorías dimensionadas por gasto total
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Tamaño = monto total · Color = sector · Clic en una categoría para ver su perfil
              </p>
            </div>
            <FuentePill source="COMPRANET · 2002–2025" verified={true} />
          </div>
          <div className="rounded-xl border border-border/30 bg-background-card overflow-hidden p-2">
            <CategoryTreemap categories={allCategories} height={480} />
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
          {allCategories.length > 0 ? (
            <>
              De las {allCategories.length} categorías presupuestarias del gobierno federal,
              {' '}{banderasRojas.length > 0 && (
                <>
                  las de mayor riesgo muestran indicadores de corrupción
                  hasta {highestRiskPct}% por encima del promedio.{' '}
                </>
              )}
              El desglose por código Partida revela dónde se concentra el gasto
              y qué tipos de bienes y servicios presentan los patrones más sospechosos.
            </>
          ) : (
            t('hero.loading')
          )}
        </p>
        <div className="mt-2">
          <FuentePill source="COMPRANET" count={allCategories.reduce((s, c) => s + c.total_contracts, 0)} countLabel="contratos" verified={true} />
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
              Banderas Rojas
            </h2>
            <span className="text-xs text-text-muted ml-2">
              Las 5 categorías con mayor riesgo promedio (min. 10 contratos)
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
                        {cat.name_es || cat.name_en}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      <span>{formatCompactMXN(cat.total_value)}</span>
                      <span>&middot;</span>
                      <span>{formatNumber(cat.total_contracts)} contratos</span>
                      {cat.sector_code && (
                        <>
                          <span>&middot;</span>
                          <span className="capitalize">{cat.sector_code}</span>
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
              placeholder="Buscar categoría…"
              className="w-full h-8 pl-8 pr-3 rounded border border-border bg-background-card text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="Buscar categorías de gasto"
            />
          </div>

          {/* Year range */}
          <div className="flex items-center gap-2">
            <label htmlFor="year-from" className="text-xs text-text-muted whitespace-nowrap">Año</label>
            <select
              id="year-from"
              value={yearFrom}
              onChange={e => setYearFrom(Math.min(Number(e.target.value), yearTo))}
              className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-text-muted">a</span>
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
            <label htmlFor="sector-filter" className="text-xs text-text-muted whitespace-nowrap">Sector</label>
            <select
              id="sector-filter"
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="h-7 rounded border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {SECTOR_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
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
            {filteredCategories.length} Categorías{sectorFilter ? ` en ${getSectorNameEN(sectorFilter)}` : ''}
          </h2>
          {stats && (
            <span className="text-xs text-text-muted">
              {formatCompactMXN(stats.totalValue)} total &middot; riesgo prom. {(stats.avgRisk * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {selectedCategoryId !== null && selectedCategory && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20 mb-3 text-xs animate-in fade-in duration-200">
            <span className="font-mono text-text-muted/60 uppercase tracking-wider text-[10px] flex-shrink-0">Seleccionado:</span>
            <span className="font-semibold text-accent truncate flex-1">{selectedCategory.name_es || selectedCategory.name_en}</span>
            <button
              onClick={() => setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors whitespace-nowrap flex-shrink-0 font-mono"
            >
              Ver detalles ↓
            </button>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              aria-label="Deseleccionar categoría"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {summaryLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs" role="table">
                  <thead>
                    <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                      <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Categoría</th>
                      <th className="px-3 py-2.5 text-left font-medium hidden md:table-cell">Sector</th>
                      <th
                        className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                        onClick={() => handleSort('total_contracts')}
                      >
                        Contratos
                        <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                      </th>
                      <th
                        className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                        onClick={() => handleSort('total_value')}
                      >
                        Monto (MXN)
                        <SortIndicator field="total_value" sortField={sortField} sortDir={sortDir} />
                      </th>
                      <th
                        className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                        onClick={() => handleSort('avg_risk')}
                      >
                        Riesgo
                        <SortIndicator field="avg_risk" sortField={sortField} sortDir={sortDir} />
                      </th>
                      <th
                        className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap hidden lg:table-cell"
                        onClick={() => handleSort('direct_award_pct')}
                      >
                        AD%
                        <SortIndicator field="direct_award_pct" sortField={sortField} sortDir={sortDir} />
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium hidden lg:table-cell">Principal Proveedor</th>
                      <th className="px-3 py-2.5 text-right font-medium hidden xl:table-cell whitespace-nowrap">
                        Tendencia
                      </th>
                      <th className="px-2 py-2.5 w-8" aria-label="Perfil" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategories.slice(0, 50).map((cat, idx) => {
                      const riskLevel = getRiskLevelFromScore(cat.avg_risk)
                      return (
                        <tr
                          key={cat.category_id}
                          className={cn(
                            'border-b border-border/10 hover:bg-background-elevated/50 transition-colors cursor-pointer',
                            selectedCategoryId === cat.category_id && 'bg-accent/5 border-l-2 border-l-accent',
                          )}
                          onClick={() => setSelectedCategoryId(prev => prev === cat.category_id ? null : cat.category_id)}
                        >
                          <td className="px-3 py-2 text-text-muted tabular-nums">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {cat.sector_code && (
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: SECTOR_COLORS[cat.sector_code] || '#64748b' }}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="text-text-primary font-medium truncate max-w-[280px]">
                                {cat.name_es || cat.name_en}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-text-muted hidden md:table-cell capitalize">
                            {cat.sector_code ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary tabular-nums font-mono">
                            {formatNumber(cat.total_contracts)}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary tabular-nums font-mono">
                            {formatCompactMXN(cat.total_value)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono tabular-nums"
                              style={{
                                color: getRiskColor(cat.avg_risk),
                                backgroundColor: `${getRiskColor(cat.avg_risk)}15`,
                              }}
                              title={getRiskLabel(cat.avg_risk)}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getRiskColor(cat.avg_risk) }}
                              />
                              {(cat.avg_risk * 100).toFixed(1)}%
                            </span>
                            <span className="block text-[9px] text-text-muted/60 mt-0.5 uppercase font-mono">
                              {riskLevel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-text-muted tabular-nums font-mono hidden lg:table-cell">
                            {cat.direct_award_pct != null ? `${cat.direct_award_pct.toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-text-muted text-xs truncate max-w-[200px] hidden lg:table-cell">
                            {cat.top_vendor ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${cat.top_vendor!.id}`) }}
                                className="hover:text-accent transition-colors flex items-center gap-1"
                              >
                                {truncate(cat.top_vendor.name, 28)}
                                <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                              </button>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right hidden xl:table-cell">
                            <div className="flex items-center justify-end">
                              <MiniSparkline
                                values={categorySparklines.get(cat.category_id) ?? []}
                                color={getRiskColor(cat.avg_risk)}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/categories/${cat.category_id}`) }}
                              className="text-text-muted hover:text-accent transition-colors p-0.5"
                              aria-label={`Ver perfil de ${cat.name_es || cat.name_en}`}
                              title="Ver perfil completo"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {sortedCategories.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                    No se encontraron categorías con los filtros actuales.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* 7. Subcategory + Vendor Drill-Down Panels                         */}
      {/* ================================================================= */}
      <div ref={detailPanelRef} className="scroll-mt-4 space-y-4">
        {selectedCategoryId === null && sortedCategories.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-4 py-3 text-xs text-text-muted">
            <ArrowUpRight className="h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span>Haga clic en cualquier fila de la tabla para ver <span className="font-semibold text-text-secondary">subcategorías</span>, principales proveedores y desgloses institucionales.</span>
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
            RUBLI · Mapa de Riesgo
          </p>
          <h2
            id="risk-value-heading"
            className="text-xl font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Riesgo y valor: el panorama de las 72 categorías
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Cada punto es una categoría. Eje X = gasto total 2002–2025. Eje Y = riesgo promedio.
            Las categorías arriba a la derecha requieren atención inmediata.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {summaryLoading ? (
              <ChartSkeleton height={420} />
            ) : scatterData.length > 0 ? (
              <div style={{ height: 420 }} className="relative">
                {/* Quadrant labels */}
                <div className="absolute top-2 left-16 text-[10px] font-mono uppercase tracking-wider text-text-muted/40 z-10 pointer-events-none">
                  Bajo Valor / Alto Riesgo
                </div>
                <div className="absolute top-2 right-8 text-[10px] font-mono uppercase tracking-wider text-red-400/60 z-10 pointer-events-none">
                  Alto Valor / Alto Riesgo
                </div>
                <div className="absolute bottom-10 left-16 text-[10px] font-mono uppercase tracking-wider text-text-muted/30 z-10 pointer-events-none">
                  Bajo Valor / Bajo Riesgo
                </div>
                <div className="absolute bottom-10 right-8 text-[10px] font-mono uppercase tracking-wider text-green-500/40 z-10 pointer-events-none">
                  Alto Valor / Bajo Riesgo
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.4} />
                    <XAxis
                      type="number"
                      dataKey="total_value"
                      name="Gasto"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      tickFormatter={(v: number) => formatCompactMXN(v)}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      label={{
                        value: 'Gasto total (MXN)',
                        position: 'insideBottom',
                        offset: -10,
                        style: { fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' },
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="avg_risk"
                      name="Riesgo"
                      domain={[0, 'auto']}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      width={45}
                      label={{
                        value: 'Riesgo promedio',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 5,
                        style: { fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' },
                      }}
                    />
                    <ZAxis type="number" dataKey="radius" range={[30, 450]} />
                    <ReferenceLine
                      x={scatterMedianValue}
                      stroke="var(--color-border)"
                      strokeDasharray="6 4"
                      strokeOpacity={0.5}
                    />
                    <ReferenceLine
                      y={0.15}
                      stroke="var(--color-border)"
                      strokeDasharray="6 4"
                      strokeOpacity={0.5}
                      label={{
                        value: '15% riesgo',
                        position: 'right',
                        style: { fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-family-mono)' },
                      }}
                    />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#52525b' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as (typeof scatterData)[0]
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg space-y-1"
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                          >
                            <p className="font-bold text-text-primary text-[11px] max-w-[220px] whitespace-normal">{d.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                              <span className="text-text-muted capitalize">{d.sector_code ?? 'otros'}</span>
                            </div>
                            <p className="text-text-secondary">Gasto: <span className="font-bold text-text-primary">{formatCompactMXN(d.total_value)}</span></p>
                            <p className="text-text-secondary">Riesgo: <span className="font-bold" style={{ color: getRiskColor(d.avg_risk) }}>{(d.avg_risk * 100).toFixed(1)}%</span></p>
                            <p className="text-text-secondary">AD: <span className="text-text-primary">{d.direct_award_pct?.toFixed(0) ?? '—'}%</span></p>
                            <p className="text-text-secondary">{formatNumber(d.total_contracts)} contratos</p>
                            <p className="text-accent/60 mt-1">Clic para ver perfil</p>
                          </div>
                        )
                      }}
                    />
                    <Scatter
                      data={scatterData}
                      onClick={(entry) => {
                        if (entry?.category_id) {
                          navigate(`/categories/${entry.category_id}`)
                        }
                      }}
                      cursor="pointer"
                    >
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`scatter-${index}`}
                          fill={entry.fill}
                          fillOpacity={0.75}
                          stroke={entry.fill}
                          strokeWidth={1}
                          strokeOpacity={0.3}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                Sin datos de categorías para el cuadrante de riesgo.
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
            RUBLI · Gasto Federal
          </p>
          <h2
            id="sexenio-shifts-heading"
            className="text-xl font-bold text-text-primary leading-tight"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Gasto por administración: cómo cambió lo que compra el gobierno
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Gasto federal acumulado en las 10 categorías de mayor valor, distribuido por sexenio presidencial.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-4">
            {sexenioLoading ? (
              <ChartSkeleton height={380} />
            ) : sexenioChartData.length > 0 ? (
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sexenioChartData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
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
                        const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg space-y-1"
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                          >
                            <p className="font-bold text-text-primary text-[11px] mb-1">{label}</p>
                            <p className="text-text-secondary mb-1.5">Total: <span className="font-bold text-text-primary">{formatCompactMXN(total)}</span></p>
                            {payload.filter(p => (Number(p.value) || 0) > 0).map((p, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: String(p.color) }} />
                                <span className="text-text-muted/80 truncate max-w-[160px]">{String(p.name)}</span>
                                <span className="ml-auto font-semibold tabular-nums" style={{ color: String(p.color) }}>
                                  {formatCompactMXN(Number(p.value))}
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
                        <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                          {value}
                        </span>
                      )}
                    />
                    {sexenioCategories.map((cat) => (
                      <Bar
                        key={cat.key}
                        dataKey={cat.key}
                        stackId="sexenio"
                        fill={cat.color}
                        fillOpacity={0.8}
                        maxBarSize={60}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                Sin datos de sexenio disponibles.
              </div>
            )}
            <p className="text-[10px] text-text-muted/50 mt-2 font-mono">
              Sheinbaum = 2025 parcial. Fox incluye parte del dato COMPRANET.
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

        {/* Top Categories Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-family-serif)' }}>
              <BarChart3 className="h-4 w-4 text-text-muted" />
              {t('treemap.title')}
            </CardTitle>
            <CardDescription>
              Top 30 categorías de gasto por monto total. Color = sector. Clic en una barra para detalle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCategoryName && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-text-muted">Tendencia filtrada por:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {selectedCategoryName}
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className="ml-0.5 hover:text-amber-200"
                    aria-label="Limpiar filtro"
                  >
                    &times;
                  </button>
                </span>
              </div>
            )}
            {summaryLoading ? (
              <ChartSkeleton height={500} />
            ) : treemapData.length > 0 ? (
              <div style={{ height: Math.max(380, treemapData.length * 22 + 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={treemapData}
                    margin={{ top: 4, right: 120, bottom: 4, left: 8 }}
                    style={{ cursor: 'pointer' }}
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
                      width={200}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                      tickFormatter={(v: string) => v.length > 28 ? v.slice(0, 27) + '…' : v}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as { name: string; value: number; category_id: number }
                        return (
                          <div
                            className="rounded-lg border p-3 text-xs font-mono shadow-lg"
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                          >
                            <p className="font-bold text-text-primary mb-1 max-w-[220px] whitespace-normal">{d.name}</p>
                            <p className="text-text-secondary">{formatCompactMXN(d.value)}</p>
                            {selectedCategoryId === d.category_id && (
                              <p className="text-amber-400 mt-1">Seleccionado &mdash; clic para deseleccionar</p>
                            )}
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 3, 3, 0]}
                      maxBarSize={18}
                      onClick={(barData) => {
                        const d = barData as { category_id?: number } | null
                        const cid = d?.category_id
                        if (cid != null) {
                          setSelectedCategoryId((prev: number | null) => prev === cid ? null : cid)
                        }
                      }}
                    >
                      {treemapData.map((entry, index) => (
                        <Cell
                          key={`bar-cell-${index}`}
                          fill={entry.fill}
                          fillOpacity={selectedCategoryId === null || selectedCategoryId === entry.category_id ? 0.85 : 0.35}
                          stroke={selectedCategoryId === entry.category_id ? '#f59e0b' : 'transparent'}
                          strokeWidth={selectedCategoryId === entry.category_id ? 1.5 : 0}
                        />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v: unknown) => formatCompactMXN(Number(v))}
                        style={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                {t('treemap.empty')}
              </div>
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
                    Mostrando: {selectedCategoryName}
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
                      Todos
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
                            style={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
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
                    {trendChartData.series.map((series, idx) => (
                      <Line
                        key={series.name}
                        type="monotone"
                        data={trendChartData.years.map(y => ({ year: y, value: series.data[y] || 0 }))}
                        dataKey="value"
                        name={series.name}
                        stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: TREND_COLORS[idx % TREND_COLORS.length], strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: '#0d1117' }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                {t('trends.empty')}
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
  )
}
