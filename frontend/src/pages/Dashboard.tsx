import React, { memo, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RiskScoreDisclaimer } from '@/components/RiskScoreDisclaimer'
import { analysisApi, investigationApi } from '@/api/client'
import type { ExecutiveCaseDetail } from '@/api/types'
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Target,
  Search,
  Crosshair,
  Activity,
  TrendingDown,
  TrendingUp,
  FileSearch,
  AlertTriangle,
  Layers,
  BarChart3,
  Users,
  DollarSign,
  Gauge,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  Cell,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  ReferenceLine,
  ReferenceArea,
  LabelList,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { LayoutDashboard } from 'lucide-react'

// ============================================================================
// Dashboard 2.0: Situation Room
//
// Layout:
// 1. LIVE ALERT BANNER (critical vendors detected)
// 2. HEADLINE ROW: 4 KPI cards
// 3. RISK DISTRIBUTION (Donut) + TOP RISK SECTORS (Horizontal bar)
// 4. TEMPORAL TREND (full-width area chart)
// 5. TOP VENDORS AT RISK + RECENT HIGH-RISK CONTRACTS
// 6. SECTOR GRID: 12 sector cards with mini sparklines
// ============================================================================

// Risk donut colors
const DONUT_COLORS: Record<string, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
}

// ============================================================================
// MINI SPARKLINE — 120x24px area chart for KPI trend embedding
// ============================================================================

function MiniSparkline({
  data,
  dataKey,
  color,
}: {
  data: Array<Record<string, number>>
  dataKey: string
  color: string
}) {
  const gradId = `spark-${dataKey}-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width={120} height={24}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ============================================================================
// KPI CARD — Large number, label, trend indicator, colored glow
// ============================================================================

interface KPICardProps {
  label: string
  value: string
  sublabel: string
  color: string
  loading: boolean
  icon: React.ElementType
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  onClick?: () => void
  sparkData?: Array<Record<string, number>>
  sparkKey?: string
}

const KPICard = memo(function KPICard({
  label, value, sublabel, color, loading, icon: Icon, trend, onClick, sparkData, sparkKey,
}: KPICardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'fern-card relative flex flex-col justify-between p-6 text-left overflow-hidden group',
        onClick && 'cursor-pointer hover:scale-[1.005]',
        !onClick && 'cursor-default',
      )}
      style={{
        borderTopColor: color,
        borderTopWidth: '3px',
      }}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono leading-none">
          {label}
        </p>
        <Icon className="h-4 w-4 text-text-muted/50" />
      </div>
      {loading ? (
        <Skeleton className="h-10 w-28 mb-2" />
      ) : (
        <p
          className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight transition-colors"
          style={{ color, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-[10px] text-text-muted leading-tight flex-1">{sublabel}</p>
        {trend && (
          <span className={cn(
            'text-[10px] font-bold font-mono tabular-nums flex items-center gap-0.5 flex-shrink-0',
            trend.direction === 'up' ? 'text-risk-critical' : trend.direction === 'down' ? 'text-risk-low' : 'text-text-muted'
          )}>
            {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trend.label}
          </span>
        )}
        {sparkData && sparkKey && (
          <div className="flex-shrink-0">
            <MiniSparkline data={sparkData} dataKey={sparkKey} color={color} />
          </div>
        )}
      </div>
      {/* Hover brightening */}
      {onClick && (
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </button>
  )
})

// ============================================================================
// ALERT BANNER — Shows when critical vendors are present
// ============================================================================

function AlertBanner({ criticalCount, onClick }: { criticalCount: number; onClick: () => void }) {
  if (criticalCount === 0) return null
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 rounded-lg border-l-4 border-l-accent border border-accent/15 bg-accent/5 hover:bg-accent/10 transition-all text-left group"
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-risk-critical animate-pulse" />
        <AlertTriangle className="h-4 w-4 text-risk-critical" />
      </div>
      <p className="text-sm text-risk-critical font-medium flex-1">
        <span className="font-black tabular-nums">{formatNumber(criticalCount)}</span> critical-risk contracts detected
      </p>
      <ArrowUpRight className="h-4 w-4 text-risk-critical opacity-60 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  )
}

// ============================================================================
// RISK DONUT CHART — PieChart with innerRadius showing 4 risk levels
// ============================================================================

const RiskDonutChart = memo(function RiskDonutChart({
  data,
}: {
  data: Array<{ risk_level: string; count: number; percentage: number; total_value_mxn: number }>
}) {
  const chartData = ['critical', 'high', 'medium', 'low'].map((level) => {
    const item = data.find((d) => d.risk_level === level)
    return {
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: item?.percentage ?? 0,
      count: item?.count ?? 0,
    }
  }).filter((d) => d.value > 0)

  const highCriticalPct = data
    .filter((d) => d.risk_level === 'critical' || d.risk_level === 'high')
    .reduce((s, d) => s + (d.percentage || 0), 0)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <PieChart width={200} height={200} aria-label="Risk level distribution donut chart">
          <Pie
            data={chartData}
            cx={100}
            cy={100}
            innerRadius={68}
            outerRadius={92}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={DONUT_COLORS[entry.name.toLowerCase()] ?? '#64748b'}
                opacity={0.88}
              />
            ))}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as { name: string; value: number; count: number }
                return (
                  <div className="chart-tooltip text-xs">
                    <p className="font-bold text-text-primary">{d.name}</p>
                    <p className="text-text-muted tabular-nums font-mono">
                      {d.value.toFixed(1)}% ({formatNumber(d.count)})
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          aria-label={`${highCriticalPct.toFixed(1)}% high-risk`}
        >
          <span className="text-2xl font-black tabular-nums font-mono leading-none text-text-primary">
            {highCriticalPct.toFixed(1)}%
          </span>
          <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider mt-1 text-center leading-tight">
            High-Risk
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DONUT_COLORS[d.name.toLowerCase()] ?? '#64748b', opacity: 0.88 }} />
            <span className="text-[10px] text-text-muted font-mono">
              {d.name} <span className="text-text-secondary font-semibold">{d.value.toFixed(1)}%</span> ({formatNumber(d.count)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

// ============================================================================
// TOP RISK SECTORS BAR — Horizontal bar chart sorted by high-risk rate
// ============================================================================

interface SectorBarData {
  name: string
  code: string
  id: number
  riskPct: number
  avgRisk: number
  contracts: number
  totalValue: number
}

const TopRiskSectorsBar = memo(function TopRiskSectorsBar({
  data,
  onSectorClick,
}: {
  data: SectorBarData[]
  onSectorClick: (id: number) => void
}) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.riskPct - a.riskPct), [data])

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          onClick={(barData: Record<string, unknown>) => {
            const payload = barData?.activePayload as Array<{ payload: SectorBarData }> | undefined
            const id = payload?.[0]?.payload?.id
            if (id) onSectorClick(id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as SectorBarData
                return (
                  <div className="chart-tooltip text-xs">
                    <p className="font-bold text-text-primary">{d.name}</p>
                    <p className="text-text-muted tabular-nums font-mono">
                      High-risk: {d.riskPct.toFixed(1)}% | Avg: {(d.avgRisk * 100).toFixed(1)}%
                    </p>
                    <p className="text-text-muted tabular-nums font-mono">
                      {formatNumber(d.contracts)} contracts | {formatCompactMXN(d.totalValue)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="riskPct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {sorted.map((s) => (
              <Cell
                key={s.code}
                fill={SECTOR_COLORS[s.code] ?? '#64748b'}
                fillOpacity={0.8}
              />
            ))}
            <LabelList
              dataKey="riskPct"
              position="right"
              formatter={(v: unknown) => `${(v as number).toFixed(1)}%`}
              style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-muted)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// ============================================================================
// RISK TRAJECTORY CHART — Full-width area chart with administration bands
// ============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2000, end: 2006, color: '#3b82f6' },
  { name: 'Calderon', start: 2006, end: 2012, color: '#8b5cf6' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: '#16a34a' },
  { name: 'AMLO', start: 2018, end: 2024, color: '#f97316' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: '#dc2626' },
]

interface RiskTrajectoryChartProps {
  data: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number }>
  sectorTrajectory?: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number }>
  sectorColor?: string
  yearlyTrends?: Array<{ year: number; avg_risk: number; risk_stddev?: number }>
}

const RiskTrajectoryChart = memo(function RiskTrajectoryChart({
  data,
  sectorTrajectory,
  sectorColor,
  yearlyTrends,
}: RiskTrajectoryChartProps) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  const hasSectorOverlay = sectorTrajectory !== undefined && sectorTrajectory.length > 0

  const mergedData = useMemo(() => {
    if (!hasSectorOverlay) return data
    const sectorMap = new Map(sectorTrajectory.map((d) => [d.year, d.highRiskPct]))
    return data.map((row) => ({
      ...row,
      sectorHighRiskPct: sectorMap.get(row.year) ?? null,
    }))
  }, [data, sectorTrajectory, hasSectorOverlay])

  const hasStddev = yearlyTrends ? yearlyTrends.some((d) => d.risk_stddev != null) : false
  const stddevMap = useMemo(() => {
    if (!yearlyTrends || !hasStddev) return new Map<number, number>()
    return new Map(
      yearlyTrends
        .filter((d) => d.risk_stddev != null)
        .map((d) => [d.year, (d.risk_stddev as number) * 100]),
    )
  }, [yearlyTrends, hasStddev])

  const chartData = useMemo(() => {
    if (!hasStddev) return mergedData
    return mergedData.map((row) => {
      const sd = stddevMap.get(row.year)
      if (sd == null) return row
      return {
        ...row,
        ciLower: Math.max(0, row.highRiskPct - sd),
        ciUpper: row.highRiskPct + sd,
      }
    })
  }, [mergedData, stddevMap, hasStddev])

  const minYear = data.length > 0 ? data[0].year : 2010
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2025
  const maxContracts = Math.max(...data.map((d) => d.contracts), 1)
  const aggregateColor = hasSectorOverlay ? 'rgba(139,148,158,0.45)' : RISK_COLORS.high

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="riskGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hasSectorOverlay ? 'rgba(139,148,158,0.3)' : RISK_COLORS.high} stopOpacity={hasSectorOverlay ? 0.15 : 0.4} />
              <stop offset="100%" stopColor={hasSectorOverlay ? 'rgba(139,148,158,0.1)' : RISK_COLORS.high} stopOpacity={0.02} />
            </linearGradient>
            {hasStddev && (
              <linearGradient id="ciGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RISK_COLORS.high} stopOpacity={0.12} />
                <stop offset="100%" stopColor={RISK_COLORS.high} stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>
          {ADMINISTRATIONS.map((admin) => {
            const x1 = Math.max(admin.start, minYear)
            const x2 = Math.min(admin.end, maxYear)
            if (x1 >= maxYear || x2 <= minYear) return null
            return (
              <ReferenceArea
                key={admin.name}
                x1={x1}
                x2={x2}
                fill={admin.color}
                fillOpacity={0.04}
                ifOverflow="extendDomain"
                label={{ value: admin.name, position: 'insideTopLeft', fontSize: 10, fill: 'var(--color-text-muted)', opacity: 0.5 }}
              />
            )
          })}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            type="number"
            domain={[minYear, maxYear]}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            domain={[0, maxContracts * 1.2]}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as {
                  year: number
                  highRiskPct: number
                  contracts: number
                  sectorHighRiskPct?: number | null
                  ciLower?: number
                  ciUpper?: number
                }
                return (
                  <div className="chart-tooltip">
                    <p className="font-bold text-sm text-text-primary">{d.year}</p>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-xs text-text-muted tabular-nums">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: aggregateColor }} />
                        {t('highRiskRate')} (all): <strong className="text-text-secondary">{d.highRiskPct.toFixed(1)}%</strong>
                      </p>
                      {hasSectorOverlay && d.sectorHighRiskPct != null && (
                        <p className="text-xs text-text-muted tabular-nums">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: sectorColor }} />
                          {t('highRiskRate')} (sector): <strong className="text-text-secondary">{d.sectorHighRiskPct.toFixed(1)}%</strong>
                        </p>
                      )}
                      {hasStddev && d.ciLower != null && d.ciUpper != null && (
                        <p className="text-xs text-text-muted/70 tabular-nums">
                          CI: [{d.ciLower.toFixed(1)}%--{d.ciUpper.toFixed(1)}%]
                        </p>
                      )}
                      <p className="text-xs text-text-secondary tabular-nums">
                        {formatNumber(d.contracts)} {tc('contracts').toLowerCase()}
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine
            x={2020}
            yAxisId="left"
            stroke={RISK_COLORS.critical}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'COVID-19', position: 'insideTopRight', fontSize: 10, fill: RISK_COLORS.critical }}
          />
          <Bar
            yAxisId="right"
            dataKey="contracts"
            fill="var(--color-text-muted)"
            fillOpacity={0.15}
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          {hasStddev && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="ciUpper"
              stroke="none"
              fill={RISK_COLORS.high}
              fillOpacity={0.10}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              connectNulls
            />
          )}
          {hasStddev && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="ciLower"
              stroke="none"
              fill="var(--color-background-base)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              connectNulls
            />
          )}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="highRiskPct"
            stroke={aggregateColor}
            strokeWidth={hasSectorOverlay ? 1.5 : 2}
            fill="url(#riskGradient2)"
            dot={false}
            activeDot={hasSectorOverlay ? false : { r: 4, stroke: RISK_COLORS.high, strokeWidth: 2, fill: 'var(--color-background-base)' }}
            strokeDasharray={hasSectorOverlay ? '4 3' : undefined}
          />
          {hasSectorOverlay && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sectorHighRiskPct"
              stroke={sectorColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: sectorColor, strokeWidth: 2, fill: 'var(--color-background-base)' }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
        {hasSectorOverlay ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: sectorColor }} />
              <span className="text-xs text-text-muted">Sector</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded opacity-50" style={{ borderTop: '1.5px dashed rgba(139,148,158,0.6)' }} />
              <span className="text-xs text-text-muted">All sectors (ref)</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded" style={{ backgroundColor: RISK_COLORS.high }} />
            <span className="text-xs text-text-muted">{t('highRiskRate')}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-text-muted opacity-15" />
          <span className="text-xs text-text-muted">{tc('contracts')}</span>
        </div>
        {hasStddev && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: RISK_COLORS.high, opacity: 0.12 }} />
            <span className="text-xs text-text-muted">+/-1 std dev</span>
          </div>
        )}
      </div>
    </div>
  )
})

// ============================================================================
// SECTOR MINI CARD — Compact card for the 12-sector grid
// ============================================================================

interface SectorMiniCardProps {
  name: string
  code: string
  id: number
  contracts: number
  riskPct: number
  totalValue: number
  avgRisk: number
  directAwardPct: number
  onClick: () => void
}

const SectorMiniCard = memo(function SectorMiniCard({
  name, code, contracts, riskPct, totalValue, avgRisk, directAwardPct, onClick,
}: SectorMiniCardProps) {
  const sectorColor = SECTOR_COLORS[code] ?? '#64748b'
  const riskColor = riskPct >= 15 ? 'text-risk-critical' : riskPct >= 10 ? 'text-risk-high' : 'text-risk-medium'

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-lg border border-border/30 bg-background-card/40 hover:border-border/60 hover:bg-background-elevated/30 transition-all text-left group"
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
        <span className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
          {name}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">Contracts</p>
          <p className="text-xs font-bold tabular-nums font-mono text-text-secondary">{formatNumber(contracts)}</p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">High-risk</p>
          <p className={cn('text-xs font-bold tabular-nums font-mono', riskColor)}>{riskPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">Value</p>
          <p className="text-xs font-bold tabular-nums font-mono text-text-secondary">{formatCompactMXN(totalValue)}</p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">DA%</p>
          <p className="text-xs font-bold tabular-nums font-mono text-text-muted">{directAwardPct.toFixed(0)}%</p>
        </div>
      </div>
      {/* Mini risk bar */}
      <div className="w-full h-1 rounded-full bg-background-elevated/40 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(avgRisk * 100 * 3, 100)}%`,
            backgroundColor: sectorColor,
            opacity: 0.7,
          }}
        />
      </div>
    </button>
  )
})

// ============================================================================
// TOP VENDORS TABLE — Ranked list with risk scores
// ============================================================================

interface VendorRowData {
  id: number
  name: string
  avg_risk: number
  contracts: number
  value_billions: number
}

const TopVendorsTable = memo(function TopVendorsTable({
  vendors,
  loading,
  onVendorClick,
}: {
  vendors: VendorRowData[]
  loading: boolean
  onVendorClick: (id: number) => void
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9" />)}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {vendors.map((vendor, i) => {
        const riskPct = vendor.avg_risk * 100
        const riskColor = vendor.avg_risk >= 0.50 ? 'text-risk-critical' :
          vendor.avg_risk >= 0.30 ? 'text-risk-high' :
          vendor.avg_risk >= 0.10 ? 'text-risk-medium' : 'text-risk-low'
        const riskBg = vendor.avg_risk >= 0.50 ? 'bg-risk-critical' :
          vendor.avg_risk >= 0.30 ? 'bg-risk-high' :
          vendor.avg_risk >= 0.10 ? 'bg-risk-medium' : 'bg-risk-low'
        return (
          <button
            key={vendor.id}
            onClick={() => onVendorClick(vendor.id)}
            className="flex items-center gap-2 w-full py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors text-left group"
          >
            <span className="text-xs text-text-muted font-mono w-5 flex-shrink-0 tabular-nums">{i + 1}</span>
            <span className="text-sm text-text-secondary font-medium flex-1 truncate group-hover:text-text-primary transition-colors">
              {toTitleCase(vendor.name)}
            </span>
            <span className="text-xs tabular-nums font-mono text-text-muted w-[68px] text-right flex-shrink-0">
              {vendor.value_billions.toFixed(1)}B
            </span>
            <span className="text-xs tabular-nums font-mono text-text-muted w-[48px] text-right flex-shrink-0">
              {formatNumber(vendor.contracts)}
            </span>
            <div className="w-[72px] flex items-center gap-1 flex-shrink-0">
              <div className="flex-1 h-1.5 rounded-full bg-background-elevated/50 overflow-hidden">
                <div className={cn('h-full rounded-full', riskBg)} style={{ width: `${riskPct}%`, opacity: 0.7 }} />
              </div>
              <span className={cn('text-xs font-bold tabular-nums font-mono w-[32px] text-right', riskColor)}>
                {riskPct.toFixed(0)}%
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
})

// ============================================================================
// GROUND TRUTH CASES — compact grid
// ============================================================================

const GroundTruthSection = memo(function GroundTruthSection({
  cases,
  loading,
  modelAuc,
  totalCases,
  onFullAnalysis,
}: {
  cases: ExecutiveCaseDetail[]
  loading: boolean
  modelAuc: number
  totalCases: number
  onFullAnalysis: () => void
}) {
  const { t } = useTranslation('dashboard')

  if (loading) {
    return (
      <div className="space-y-1.5">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6" />)}
      </div>
    )
  }

  const filtered = [...cases]
    .filter(c => c.contracts >= 10)
    .sort((a, b) => b.high_plus_pct - a.high_plus_pct)
    .slice(0, 8)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="text-[10px] font-mono text-text-muted flex-1">Case</span>
        <span className="text-[10px] font-mono text-text-muted w-[100px]">{t('detectionRate')}</span>
        <span className="text-[10px] font-mono text-text-muted w-10 text-right">%</span>
      </div>
      <div className="space-y-1">
        {filtered.map(c => {
          const pct = c.high_plus_pct
          const barColor =
            pct >= 90 ? '#4ade80' :
            pct >= 50 ? '#fbbf24' :
            '#f87171'
          const textColor =
            pct >= 90 ? 'text-green-400' :
            pct >= 50 ? 'text-amber-400' :
            'text-red-400'
          const truncatedName = c.name.length > 28 ? c.name.slice(0, 28) + '...' : c.name
          return (
            <div
              key={c.name}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-background-elevated/20 transition-colors"
              title={`${c.name}: ${pct.toFixed(0)}% detected (${formatNumber(c.contracts)} contracts, avg score ${c.avg_score.toFixed(2)})`}
            >
              <span className="text-[11px] text-text-secondary flex-1 truncate font-mono">{truncatedName}</span>
              <div className="w-[100px] h-1.5 rounded-full bg-background-elevated/50 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, opacity: 0.8 }}
                />
              </div>
              <span className={cn('text-[11px] font-black font-mono tabular-nums w-10 text-right shrink-0', textColor)}>
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[10px] text-text-muted font-mono">
          AUC {modelAuc.toFixed(3)} | {totalCases} cases
        </p>
        <button onClick={onFullAnalysis} className="text-[10px] text-accent hover:underline font-mono flex items-center gap-0.5">
          {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
})

// ============================================================================
// SECTION WRAPPER — Error boundary per section
// ============================================================================

function DashboardSection({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className,
  noPadding,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  icon?: React.ElementType
  action?: React.ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <div className={cn('fern-card overflow-hidden', className)}>
      {title && (
        <div className={cn('flex items-center justify-between', noPadding ? 'px-5 pt-5 pb-3' : 'px-5 pt-5 pb-3')}>
          <div>
            <div className="editorial-rule" style={{ marginBottom: subtitle ? '0.25rem' : 0 }}>
              {Icon && <Icon className="h-3.5 w-3.5 text-accent flex-shrink-0" aria-hidden="true" />}
              <span className="editorial-label">{title}</span>
            </div>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'px-5 pb-5'}>
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { open: openEntityDrawer } = useEntityDrawer()
  const { t } = useTranslation('dashboard')

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: fastDashboard, isLoading: dashLoading, error: dashError, refetch: dashRefetch } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['executive', 'summary'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })

  useQuery({
    queryKey: ['analysis', 'patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: moneyFlowData } = useQuery({
    queryKey: ['analysis', 'money-flow', 'dashboard'],
    queryFn: () => analysisApi.getMoneyFlow(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: modelMeta } = useQuery({
    queryKey: ['analysis', 'model-metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  useQuery({
    queryKey: ['investigation', 'top-1-dashboard'],
    queryFn: () => investigationApi.getTopCases(1),
    staleTime: 30 * 60 * 1000,
    enabled: false,
  })

  const { data: sectorYearData } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const overview = fastDashboard?.overview
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution

  const criticalHighContractPct = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.percentage || 0), 0)
  }, [riskDist])

  const criticalHighValuePct = useMemo(() => {
    if (!riskDist) return 0
    const totalVal = riskDist.reduce((s, d) => s + (d.total_value_mxn || 0), 0)
    const flaggedVal = riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
    return totalVal > 0 ? (flaggedVal / totalVal) * 100 : 0
  }, [riskDist])

  const criticalCount = useMemo(() => {
    if (!riskDist) return 0
    return riskDist.find(d => d.risk_level === 'critical')?.count ?? 0
  }, [riskDist])

  const sectorData = useMemo(() => {
    if (!sectors) return []
    return sectors
      .map((s) => {
        const ct = s.total_contracts || 1
        const hrRate = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct
        const daRate = (s.direct_award_count || 0) / ct
        return {
          name: getSectorNameEN(s.code),
          code: s.code,
          id: s.id,
          valueAtRisk: hrRate * (s.total_value_mxn || 0),
          riskPct: hrRate * 100,
          contracts: s.total_contracts,
          totalValue: s.total_value_mxn || 0,
          avgRisk: s.avg_risk_score || 0,
          directAwardPct: daRate * 100,
        }
      })
      .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
  }, [sectors])

  const riskTrajectory = useMemo(() => {
    if (!fastDashboard?.yearly_trends) return []
    return fastDashboard.yearly_trends
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.avg_risk || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
      }))
  }, [fastDashboard])

  const corruptionCases = useMemo(() => {
    if (!execData?.ground_truth?.case_details) return []
    return execData.ground_truth.case_details
  }, [execData])

  const groundTruth = execData?.ground_truth
  const modelAuc = execData?.model?.auc ?? 0.849

  const topFlows = useMemo(() => {
    if (!moneyFlowData?.flows) return []
    return [...moneyFlowData.flows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [moneyFlowData])

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // Sector trajectory selector
  const [selectedTrajectorySectorId, setSelectedTrajectorySectorId] = useState<number | null>(null)

  const sectorTrajectory = useMemo(() => {
    if (selectedTrajectorySectorId === null || !sectorYearData?.data) return []
    return sectorYearData.data
      .filter((d) => d.sector_id === selectedTrajectorySectorId && d.year >= 2010)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.avg_risk || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
      }))
      .sort((a, b) => a.year - b.year)
  }, [sectorYearData, selectedTrajectorySectorId])

  // Refs for chart export
  const riskTrajectoryRef = useRef<HTMLDivElement>(null)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        label="PANORAMA NACIONAL"
        title={t('title')}
        subtitle={t('subtitle')}
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                <Activity className="h-3 w-3 text-signal-live" />
                <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
              </div>
            )}
            <span className="text-[10px] font-mono text-text-muted/50">
              {modelMeta?.version ?? CURRENT_MODEL_VERSION} | AUC {modelMeta?.auc_test?.toFixed(3) ?? '0.849'}
            </span>
          </div>
        }
      />

      {/* Error Banner */}
      {dashError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-risk-critical/30 bg-risk-critical/5">
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0" />
          <p className="text-sm text-risk-critical flex-1">
            Dashboard data failed to load. Some sections may be unavailable.
          </p>
          <button
            onClick={() => void dashRefetch()}
            className="text-sm text-risk-critical underline hover:no-underline font-medium flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* LIVE ALERT BANNER                                                */}
      {/* ================================================================ */}
      <AlertBanner
        criticalCount={criticalCount}
        onClick={() => navigate('/contracts?risk_level=critical')}
      />

      {/* ================================================================ */}
      {/* HEADLINE ROW: 4 KPI Cards                                        */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t('contractsShowingRisk')}
          value={dashLoading ? '--' : `${criticalHighContractPct.toFixed(1)}%`}
          sublabel={dashLoading ? '' : t('contractsFlaggedDetail', { num: formatNumber(overview?.high_risk_contracts ?? 0) })}
          color="#f87171"
          loading={dashLoading}
          icon={Gauge}
          onClick={() => navigate('/contracts?risk_level=critical&risk_level=high')}
          sparkData={riskTrajectory.length > 3 ? riskTrajectory : undefined}
          sparkKey="highRiskPct"
        />
        <KPICard
          label={t('criticalContracts')}
          value={dashLoading ? '--' : formatNumber(criticalCount)}
          sublabel={t('oecdHighRisk')}
          color="#ef4444"
          loading={dashLoading}
          icon={AlertTriangle}
          onClick={() => navigate('/contracts?risk_level=critical')}
        />
        <KPICard
          label={t('valueFlagged')}
          value={dashLoading ? '--' : formatCompactMXN(overview?.total_value_mxn ?? 0)}
          sublabel={dashLoading ? '' : t('valueFlaggedDetail', { pct: criticalHighValuePct.toFixed(1) })}
          color="#fb923c"
          loading={dashLoading}
          icon={DollarSign}
          onClick={() => navigate('/categories')}
        />
        <KPICard
          label={t('topVendors')}
          value={dashLoading ? '--' : formatNumber(overview?.total_vendors ?? 0)}
          sublabel={`${formatNumber(overview?.total_contracts ?? 0)} contracts | 2002-2025`}
          color="#818cf8"
          loading={dashLoading}
          icon={Users}
          onClick={() => navigate('/network')}
        />
      </div>

      {/* ================================================================ */}
      {/* ROW 2: RISK DISTRIBUTION (Donut) + TOP RISK SECTORS (Bar)       */}
      {/* ================================================================ */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Risk Distribution Donut */}
        <DashboardSection
          title={t('riskDistribution')}
          subtitle={t('riskDistLabel', { total: formatNumber(overview?.total_contracts || 0) })}
          icon={BarChart3}
          action={<RiskScoreDisclaimer />}
        >
          {dashLoading || !riskDist ? (
            <div className="flex justify-center py-8"><Skeleton className="h-48 w-48 rounded-full" /></div>
          ) : (
            <div className="space-y-4">
              <RiskDonutChart data={riskDist} />
              {/* Stacked proportion bar */}
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
                  Contracts by risk level
                </p>
                <div className="flex h-6 rounded overflow-hidden gap-px">
                  {(['critical', 'high', 'medium', 'low'] as const).map(level => {
                    const d = riskDist.find(r => r.risk_level === level)
                    const pct = d?.percentage ?? 0
                    return pct > 0.5 ? (
                      <button
                        key={level}
                        onClick={() => navigate(`/contracts?risk_level=${level}`)}
                        className="flex items-center justify-center hover:opacity-90 transition-opacity"
                        style={{ width: `${pct}%`, backgroundColor: DONUT_COLORS[level] ?? '#64748b', opacity: 0.75 }}
                        title={`${level}: ${pct.toFixed(1)}%`}
                      >
                        {pct > 5 && (
                          <span className="text-[9px] font-bold text-white font-mono tabular-nums">{pct.toFixed(0)}%</span>
                        )}
                      </button>
                    ) : null
                  })}
                </div>
              </div>
              {/* Value proportion bar */}
              {(() => {
                const totalValue = riskDist.reduce((s, d) => s + (d.total_value_mxn || 0), 0)
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Value by risk level</p>
                      <p className="text-[10px] font-mono text-text-muted">{formatCompactMXN(totalValue)}</p>
                    </div>
                    <div className="flex h-6 rounded overflow-hidden gap-px">
                      {(['critical', 'high', 'medium', 'low'] as const).map(level => {
                        const d = riskDist.find(r => r.risk_level === level)
                        const val = d?.total_value_mxn ?? 0
                        const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                        return pct > 0.5 ? (
                          <button
                            key={level}
                            onClick={() => navigate(`/contracts?risk_level=${level}`)}
                            className="flex items-center justify-center hover:opacity-90 transition-opacity"
                            style={{ width: `${pct}%`, backgroundColor: DONUT_COLORS[level] ?? '#64748b', opacity: 0.75 }}
                            title={`${level}: ${pct.toFixed(1)}% of value (${formatCompactMXN(val)})`}
                          >
                            {pct > 5 && (
                              <span className="text-[9px] font-bold text-white font-mono tabular-nums">{pct.toFixed(0)}%</span>
                            )}
                          </button>
                        ) : null
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </DashboardSection>

        {/* Top Risk Sectors */}
        <DashboardSection
          title={t('sectorIntelligence')}
          subtitle={t('sectorIntelligenceDesc')}
          icon={Target}
          action={
            <button
              onClick={() => navigate('/sectors')}
              className="text-xs text-accent flex items-center gap-1 hover:underline"
            >
              {t('viewAll')} <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        >
          {dashLoading || sectorData.length === 0 ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <div style={{ height: 360 }}>
              <TopRiskSectorsBar
                data={sectorData}
                onSectorClick={(id) => navigate(`/sectors/${id}`)}
              />
            </div>
          )}
        </DashboardSection>
      </div>

      {/* ================================================================ */}
      {/* TEMPORAL TREND — Full-width area chart                           */}
      {/* ================================================================ */}
      <DashboardSection
        title={t('riskTrajectory')}
        subtitle={t('riskTrajectoryDesc')}
        icon={Activity}
        action={
          <div className="flex items-center gap-2">
            <select
              className="text-xs font-mono bg-background-elevated/60 border border-border/30 rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent/60 cursor-pointer"
              value={selectedTrajectorySectorId ?? ''}
              onChange={(e) => setSelectedTrajectorySectorId(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Filter risk trajectory by sector"
            >
              <option value="">All Sectors</option>
              {sectorData.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChartDownloadButton targetRef={riskTrajectoryRef} filename="rubli-risk-trajectory" />
          </div>
        }
      >
        {dashLoading ? (
          <div className="h-[300px] flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
        ) : (
          <div ref={riskTrajectoryRef}>
            <RiskTrajectoryChart
              data={riskTrajectory}
              sectorTrajectory={selectedTrajectorySectorId !== null ? sectorTrajectory : undefined}
              sectorColor={selectedTrajectorySectorId !== null
                ? (SECTOR_COLORS[sectorData.find((s) => s.id === selectedTrajectorySectorId)?.code ?? ''] ?? '#64748b')
                : undefined}
              yearlyTrends={fastDashboard?.yearly_trends}
            />
          </div>
        )}
      </DashboardSection>

      {/* ================================================================ */}
      {/* ROW 4: TOP VENDORS + WHERE THE MONEY GOES                       */}
      {/* ================================================================ */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Top Vendors */}
        <DashboardSection
          title={t('topVendorsByValue')}
          subtitle={t('topVendorsByValueDesc')}
          icon={Target}
          action={
            <button
              onClick={() => navigate('/network')}
              className="text-xs text-accent flex items-center gap-1 hover:underline"
            >
              {t('viewNetwork')} <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        >
          <TopVendorsTable
            vendors={execData?.top_vendors ?? []}
            loading={execLoading}
            onVendorClick={(id) => openEntityDrawer(id, 'vendor')}
          />
        </DashboardSection>

        {/* Where the Money Goes */}
        <DashboardSection
          title={t('whereTheMoneyGoes')}
          subtitle={t('whereMoneyGoesSubDesc')}
          icon={ArrowRight}
          action={
            <button
              onClick={() => navigate('/categories')}
              className="text-xs text-accent flex items-center gap-1 hover:underline"
            >
              {t('fullBreakdown')} <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        >
          {!moneyFlowData ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {topFlows.map((flow, i) => {
                const riskColor =
                  (flow.avg_risk ?? 0) >= 0.50 ? 'text-risk-critical' :
                  (flow.avg_risk ?? 0) >= 0.30 ? 'text-risk-high' :
                  (flow.avg_risk ?? 0) >= 0.10 ? 'text-risk-medium' :
                  'text-risk-low'
                return (
                  <div key={i} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors">
                    <span className="text-xs text-text-muted font-mono w-5 flex-shrink-0 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => openEntityDrawer(flow.source_id, 'institution')} className="text-xs font-semibold text-text-secondary truncate block hover:text-accent transition-colors">
                        {toTitleCase(flow.source_name)}
                      </button>
                      <button onClick={() => openEntityDrawer(flow.target_id, 'vendor')} className="text-xs text-text-muted truncate block hover:text-accent transition-colors">
                        {toTitleCase(flow.target_name)}
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs tabular-nums font-mono text-text-secondary font-semibold">
                        {formatCompactMXN(flow.value)}
                      </p>
                      {flow.avg_risk != null && (
                        <p className={cn('text-[10px] font-bold tabular-nums font-mono', riskColor)}>
                          {(flow.avg_risk * 100).toFixed(0)}% risk
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* ================================================================ */}
      {/* GROUND TRUTH VALIDATION                                          */}
      {/* ================================================================ */}
      <DashboardSection
        title={t('validatedAgainstReal')}
        subtitle={`AUC ${modelAuc.toFixed(3)} | ${groundTruth?.cases ?? 390} documented corruption cases`}
        icon={Shield}
        action={
          <button
            onClick={() => navigate('/executive-summary')}
            className="text-xs text-accent flex items-center gap-1 hover:underline"
          >
            {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
          </button>
        }
      >
        <GroundTruthSection
          cases={corruptionCases}
          loading={execLoading}
          modelAuc={modelAuc}
          totalCases={groundTruth?.cases ?? 390}
          onFullAnalysis={() => navigate('/executive-summary')}
        />
      </DashboardSection>

      {/* ================================================================ */}
      {/* SECTOR GRID: 12 cards                                            */}
      {/* ================================================================ */}
      {sectorData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              12 Federal Sectors
            </h2>
          </div>
          <motion.div
            className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-40px' }}
          >
            {sectorData.map((sector) => (
              <motion.div key={sector.code} variants={staggerItem}>
                <SectorMiniCard
                  {...sector}
                  onClick={() => navigate(`/sectors/${sector.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ================================================================ */}
      {/* RESEARCH CONTEXT — CompraNet abolished                          */}
      {/* ================================================================ */}
      <div className="rounded-lg border border-border/40 bg-background-card/50 p-5">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-border/20 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-1">
              {t('compranetContextLabel')}
            </p>
            <p className="text-sm font-semibold text-text-primary mb-2">
              {t('compranetContextTitle')}
            </p>
            <p className="text-xs text-text-muted leading-relaxed mb-3">
              {t('compranetContextBody')}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border/40 bg-border/10">
                {t('compranetContextDate1')}
              </span>
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border/40 bg-border/10">
                {t('compranetContextDate2')}
              </span>
              <button
                onClick={() => navigate('/limitations')}
                className="text-xs text-accent flex items-center gap-1 ml-auto"
              >
                {t('compranetContextLink')} <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* START INVESTIGATING — 3 action cards                            */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-base font-bold text-text-primary mb-1">{t('startInvestigating')}</h2>
        <p className="text-xs text-text-muted mb-3">
          {t('startInvestigatingDesc')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <button
            onClick={() => navigate('/categories')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Search className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">{t('followTheMoney')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('followTheMoneyDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('exploreCategories')} <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => navigate('/contracts')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <FileSearch className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">{t('searchAnyContract')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('searchAnyContractDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('openContractSearch')} <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => navigate('/investigation')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Crosshair className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">{t('openInvestigation')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('openInvestigationDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('openCaseManager')} <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Preserved exports for backward compatibility
// ============================================================================

export const _StatCard = memo(function _StatCard({ loading, label, value, detail, color, borderColor, sublabel, onClick }: {
  loading: boolean
  label: React.ReactNode
  value: string
  detail: string
  color: string
  borderColor: string
  sublabel?: string
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        'border-l-4 transition-shadow hover:border-accent/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)]',
        borderColor,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 group/sc'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-1.5">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <p className={cn('text-2xl md:text-3xl font-black tabular-nums tracking-tight leading-none', color)}>{value}</p>
        )}
        <p className="text-xs text-text-muted mt-1.5">{detail}</p>
        {sublabel && (
          <p className="text-xs text-text-muted mt-0.5 font-mono">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
})

export function _RiskBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(0)
  const color =
    value >= 0.50 ? 'bg-risk-critical/20 text-risk-critical border-risk-critical/30' :
    value >= 0.30 ? 'bg-risk-high/20 text-risk-high border-risk-high/30' :
    value >= 0.10 ? 'bg-risk-medium/20 text-risk-medium border-risk-medium/30' :
    'bg-risk-low/20 text-risk-low border-risk-low/30'
  return (
    <span className={cn('text-xs font-bold tabular-nums font-mono px-1.5 py-0.5 rounded border', color)}>
      {pct}%
    </span>
  )
}

export default Dashboard
