/**
 * SectorProfile — Individual sector detail page
 *
 * Three-tab layout:
 *   Overview   — spend trend (area chart) + top institutions
 *   Top Vendors — ranked table by value with risk badges
 *   Risk Analysis — risk distribution + top risk factors
 *
 * Hero: sector name + color + total spend + contract count + risk level
 * Navigation: prev/next sector + back to all sectors
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import {
  cn,
  formatCompactMXN,
  formatNumber,
  formatPercentSafe,
  toTitleCase,
} from '@/lib/utils'
import {
  api,
  sectorApi,
  vendorApi,
  analysisApi,
  institutionApi,
  phiApi,
  caseLibraryApi,
} from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  SECTORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { getSectorDescription } from '@/lib/sector-descriptions'
import {
  Building2,
  Users,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  TrendingUp,
  ShieldAlert,
  Info,
} from 'lucide-react'
import {
  EditorialAreaChart,
  EditorialLineChart,
  type ChartAnnotation,
  type ColorToken,
  type LineSeries,
} from '@/components/charts/editorial'
import { RiskRingField, type RiskRingRow } from '@/components/charts/RiskRingField'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ── constants ────────────────────────────────────────────────────────────────

const VENDOR_LIST_PER_PAGE = 20
const INSTITUTION_LIST_PER_PAGE = 15

// ── helpers ───────────────────────────────────────────────────────────────────

function hex(color: string, alpha: number) {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const FACTOR_LABELS: Record<string, string> = {
  direct_award: 'Direct Award',
  single_bid: 'Single Bid',
  price_anomaly: 'Price Anomaly',
  short_ad_period: 'Short Ad Period',
  'short_ad_<5d': 'Rushed Ad (<5 days)',
  'short_ad_<15d': 'Short Ad (<15 days)',
  'short_ad_<30d': 'Brief Ad (<30 days)',
  year_end: 'Year-End Rush',
  vendor_concentration: 'Vendor Concentration',
  threshold_splitting: 'Contract Splitting',
  network_risk: 'Network Connection',
  industry_mismatch: 'Industry Mismatch',
  co_bid_high: 'High Co-Bid Rate',
  co_bid_med: 'Medium Co-Bid Rate',
  price_hyp: 'Price Outlier',
  co_sid_high: 'High Co-Bid Rate',
  co_sid_med: 'Medium Co-Bid Rate',
}

const FACTOR_DESC: Record<string, string> = {
  direct_award: 'Contract awarded without competitive bidding',
  single_bid: 'Competitive procedure received only one offer',
  price_anomaly: 'Contract value is 3x above sector median',
  short_ad_period: 'Advertisement window too short for real competition',
  'short_ad_<5d': 'Under 5 days between publication and award',
  'short_ad_<15d': 'Under 15 days between publication and award',
  'short_ad_<30d': 'Under 30 days between publication and award',
  year_end: 'Awarded in December — budget-dump pattern',
  vendor_concentration: 'One vendor controls >30% of sector contracts',
  threshold_splitting: 'Multiple same-day contracts to avoid oversight thresholds',
  network_risk: 'Vendor belongs to a connected group of related companies',
  industry_mismatch: "Vendor's primary industry doesn't match contract scope",
  co_bid_high: 'Vendor co-bids in >80% of procedures with a partner',
  co_bid_med: 'Vendor co-bids in 50–80% of procedures with a partner',
  price_hyp: 'Statistical outlier flagged by IQR price model',
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'vendors' | 'risk'

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendArea({
  data,
  colorToken = 'accent-data',
}: {
  data: Array<{ year: number; total_value_mxn: number; total_contracts: number }>
  /** Token-locked color. Optional override; default is accent-data. */
  colorToken?: ColorToken
}) {
  const chartData = data
    .filter((d) => d.year >= 2010)
    .map((d) => ({ year: d.year, value: d.total_value_mxn / 1e9, contracts: d.total_contracts }))

  return (
    <div
      className="h-64"
      role="img"
      aria-label="Area chart showing contract value trend by year"
    >
      <span className="sr-only">Area chart showing annual contract value in billions MXN.</span>
      <EditorialAreaChart
        data={chartData}
        xKey="year"
        yKey="value"
        colorToken={colorToken}
        yFormat="mxn-compact"
        height={256}
      />
    </div>
  )
}

interface InstitutionFlow {
  source_id: number
  source_name: string
  value: number
  contracts: number
  avg_risk: number | null
  high_risk_pct: number | null
}

function InstitutionList({
  flows,
  color,
}: {
  flows: InstitutionFlow[]
  color: string
}) {
  const maxVal = Math.max(...flows.map((f) => f.value), 1)

  return (
    <div className="space-y-1">
      {flows.map((f, i) => {
        const barPct = (f.value / maxVal) * 100
        const riskColor =
          (f.avg_risk ?? 0) >= 0.6 ? RISK_COLORS.critical :
          (f.avg_risk ?? 0) >= 0.4 ? RISK_COLORS.high :
          (f.avg_risk ?? 0) >= 0.25 ? RISK_COLORS.medium :
          RISK_COLORS.low

        return (
          <Link
            key={i}
            to={`/institutions/${f.source_id}`}
            className="group block rounded-lg px-3 py-2 hover:bg-background-elevated transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-text-muted w-4 flex-shrink-0">
                  #{i + 1}
                </span>
                <span
                  className="text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate"
                  title={toTitleCase(f.source_name)}
                >
                  {toTitleCase(f.source_name)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono font-bold tabular-nums text-text-primary">
                  {formatCompactMXN(f.value)}
                </span>
                {f.avg_risk != null && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono"
                    style={{ color: riskColor, backgroundColor: `${riskColor}18` }}
                  >
                    {Math.round(f.avg_risk * 100)}%
                  </span>
                )}
                <ExternalLink
                  className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="ml-6">
              {(() => {
                const N = 24, DR = 2, DG = 5
                const filled = Math.max(1, Math.round((barPct / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 5`} className="w-full" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                        fill={k < filled ? color : 'var(--color-background-elevated)'}
                        stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

type VendorRow = {
  vendor_id: number
  vendor_name: string
  total_value_mxn: number
  total_contracts: number
  avg_risk_score?: number
  contract_count?: number
  name?: string
}

function VendorTable({
  vendors,
  sectorId,
  color,
}: {
  vendors: VendorRow[]
  sectorId: number
  color: string
}) {
  const { t } = useTranslation('sectors')
  const top = vendors.slice(0, VENDOR_LIST_PER_PAGE)
  const maxVal = Math.max(...top.map((v) => v.total_value_mxn), 1)

  return (
    <div>
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          role="table"
          aria-label={t('profile.topVendors')}
        >
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary font-mono uppercase tracking-[0.15em]">
                #
              </th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary font-mono uppercase tracking-[0.15em]">
                {t('table.sector')}
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary font-mono uppercase tracking-[0.15em]">
                {t('table.totalValueMxn')}
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary font-mono uppercase tracking-[0.15em] hidden sm:table-cell">
                {t('table.totalContracts')}
              </th>
              <th className="text-center py-2.5 px-3 text-xs font-semibold text-text-secondary font-mono uppercase tracking-[0.15em]">
                {t('table.avgRiskScore')}
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((vendor, index) => {
              const riskScore = vendor.avg_risk_score ?? 0
              const riskLevel = getRiskLevelFromScore(riskScore)
              const barPct = (vendor.total_value_mxn / maxVal) * 100

              return (
                <tr
                  key={vendor.vendor_id}
                  className="border-b border-border hover:bg-background-elevated transition-colors"
                >
                  <td className="py-2.5 px-3 text-xs font-mono text-text-muted tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div>
                      <EntityIdentityChip type="vendor" id={vendor.vendor_id} name={toTitleCase(vendor.vendor_name ?? vendor.name ?? '')} size="sm" />
                      {(() => {
                        const N = 16, DR = 2, DG = 4
                        const filled = Math.max(1, Math.round((barPct / 100) * N))
                        return (
                          <svg viewBox={`0 0 ${N * DG} 5`} className="w-32 mt-1" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                            {Array.from({ length: N }).map((_, k) => (
                              <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                                fill={k < filled ? color : 'var(--color-background-elevated)'}
                                stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                                strokeWidth={k < filled ? 0 : 0.5}
                                fillOpacity={k < filled ? 0.85 : 1}
                              />
                            ))}
                          </svg>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-text-primary">
                    {formatCompactMXN(vendor.total_value_mxn)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-text-secondary hidden sm:table-cell">
                    {formatNumber(vendor.total_contracts ?? vendor.contract_count ?? 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RiskBadge level={riskLevel} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <Link to={`/vendors?sector_id=${sectorId}`}>
          <Button variant="ghost" size="sm" className="text-xs text-text-secondary hover:text-text-primary">
            {t('profile.viewAll')}
            <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function RiskDonut({
  data,
}: {
  data: Array<{ risk_level: string; count: number; percentage: number }>
  color: string
}) {
  const order = ['critical', 'high', 'medium', 'low'] as const
  const sorted = order.map((level) => {
    const found = data.find((d) => d.risk_level === level)
    return { level, count: found?.count ?? 0, pct: found?.percentage ?? 0 }
  })
  const total = sorted.reduce((a, b) => a + b.count, 0)
  const highPlus = sorted[0].count + sorted[1].count
  const highPlusPct = total > 0 ? ((highPlus / total) * 100).toFixed(1) : '0'

  const ringRows: RiskRingRow[] = sorted.map((d) => ({
    level: d.level as RiskRingRow['level'],
    pct:   d.pct,
    count: d.count,
  }))

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" aria-label="Risk distribution ring field">
        <RiskRingField
          rows={ringRows}
          size={176}
          n={120}
          centerLabel={`${highPlusPct}%`}
          centerSublabel="high+"
          seed={sorted[0]?.count ?? 42}
          animate
        />
      </div>

      <div className="flex-1 space-y-3">
        {sorted.map((d) => (
          <div key={d.level} className="space-y-0.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[d.level as keyof typeof RISK_COLORS] }}
                />
                <span className="capitalize text-text-secondary">{d.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums font-mono text-text-secondary">{d.pct.toFixed(1)}%</span>
                <span className="tabular-nums font-mono text-text-muted text-[10px]">
                  {formatNumber(d.count)}
                </span>
              </div>
            </div>
            {(() => {
              const N = 22, DR = 2, DG = 5
              const filled = Math.max(1, Math.round((d.pct / 100) * N))
              const color = RISK_COLORS[d.level as keyof typeof RISK_COLORS]
              return (
                <svg viewBox={`0 0 ${N * DG} 5`} className="w-full" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: N }).map((_, k) => (
                    <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                      fill={k < filled ? color : 'var(--color-background-elevated)'}
                      stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                      strokeWidth={k < filled ? 0 : 0.5}
                      fillOpacity={k < filled ? 0.85 : 1}
                    />
                  ))}
                </svg>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}

function FactorRankList({
  data,
  color,
}: {
  data: Array<{ factor: string; count: number; percentage: number; avg_risk_score: number }>
  color: string
}) {
  const top7 = data.slice(0, 7)
  const maxPct = Math.max(...top7.map((d) => d.percentage), 1)

  return (
    <div className="space-y-3">
      {top7.map((d, i) => {
        const label = FACTOR_LABELS[d.factor] ?? d.factor
        const desc = FACTOR_DESC[d.factor]
        const barWidth = (d.percentage / maxPct) * 100
        const riskColor =
          d.avg_risk_score >= 0.6 ? RISK_COLORS.critical :
          d.avg_risk_score >= 0.4 ? RISK_COLORS.high :
          d.avg_risk_score >= 0.25 ? RISK_COLORS.medium :
          RISK_COLORS.low

        return (
          <div key={d.factor}>
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-text-muted w-4 flex-shrink-0">
                  #{i + 1}
                </span>
                <span className="text-xs font-semibold text-text-primary truncate">{label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-text-secondary tabular-nums">
                  {d.percentage.toFixed(1)}%
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums"
                  style={{ color: riskColor, backgroundColor: `${riskColor}18` }}
                >
                  {Math.round(d.avg_risk_score * 100)}% risk
                </span>
              </div>
            </div>
            {desc && (
              <p className="text-[10px] text-text-muted ml-6 mb-1 leading-tight">{desc}</p>
            )}
            <div className="ml-6">
              {(() => {
                const N = 22, DR = 2, DG = 5
                const filled = Math.max(1, Math.round((barWidth / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 6`} className="w-full" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                        fill={k < filled ? color : 'var(--color-background-elevated)'}
                        stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                        strokeWidth={k < filled ? 0 : 0.5}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InsightCard({
  type,
  title,
  body,
  icon: Icon,
}: {
  type: 'warning' | 'info' | 'critical' | 'positive'
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const styles = {
    critical: { border: 'border-risk-critical/30 bg-risk-critical/5', text: 'text-risk-critical' },
    warning:  { border: 'border-risk-high/30 bg-risk-high/5', text: 'text-risk-high' },
    positive: { border: 'border-border-hover bg-background-elevated', text: 'text-text-muted' },
    info:     { border: 'border-cyan-500/30 bg-cyan-500/5', text: 'text-[color:var(--color-oecd)]' },
  }[type]

  return (
    <div className={cn('rounded-sm border p-4', styles.border)}>
      <div className={cn('flex items-center gap-1.5 text-sm font-semibold mb-1', styles.text)}>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        {title}
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{body}</p>
    </div>
  )
}

// ── Enhancement 1: PHI Governance Grade panel ─────────────────────────────────

interface PhiIndicator {
  value: number
  light: string
  benchmark?: number | null
  description?: string
}

interface PhiDetailData {
  grade?: string
  phi_composite_score?: number
  indicators?: {
    competition_rate?: PhiIndicator
    avg_bidders?: PhiIndicator
    single_bid_rate?: PhiIndicator
  }
}

function PhiGradePanel({ data }: { data: PhiDetailData }) {
  const grade = data.grade ?? '—'
  const score = data.phi_composite_score ?? null
  const compRate = data.indicators?.competition_rate?.value ?? null
  const avgBidders = data.indicators?.avg_bidders?.value ?? null
  const singleBidRate = data.indicators?.single_bid_rate?.value ?? null

  const gradeColor =
    grade === 'A' || grade === 'A+' ? 'text-text-muted' :
    grade.startsWith('B') ? 'text-lime-400' :
    grade.startsWith('C') ? 'text-risk-high' :
    grade.startsWith('D') ? 'text-orange-400' :
    'text-risk-critical'

  const indicators: Array<{ label: string; value: string | null; benchmark: string; highlight: boolean }> = [
    {
      label: 'Competition Rate',
      value: compRate != null ? `${compRate.toFixed(1)}%` : null,
      benchmark: 'OECD avg: 75%',
      highlight: compRate != null && compRate < 50,
    },
    {
      label: 'Avg Bidders',
      value: avgBidders != null ? avgBidders.toFixed(2) : null,
      benchmark: 'OECD avg: 3+',
      highlight: avgBidders != null && avgBidders < 2,
    },
    {
      label: 'Single-Bid Rate',
      value: singleBidRate != null ? `${singleBidRate.toFixed(1)}%` : null,
      benchmark: 'OECD target: <20%',
      highlight: singleBidRate != null && singleBidRate > 30,
    },
  ]

  return (
    <div
      className="rounded-sm border border-border bg-background/40 p-4"
      aria-label="Procurement Health Index governance grade"
    >
      <div className="flex items-start gap-5">
        {/* Grade letter + score */}
        <div className="flex flex-col items-center flex-shrink-0 min-w-[56px]">
          <span
            className={cn('text-5xl font-black leading-none tabular-nums', gradeColor)}
            aria-label={`Governance grade: ${grade}`}
          >
            {grade}
          </span>
          {score != null && (
            <span className="text-[11px] font-mono text-text-muted mt-1 tabular-nums">
              {score.toFixed(1)}/100
            </span>
          )}
          <span className="text-[9px] uppercase tracking-widest text-text-muted mt-1 font-semibold">
            PHI
          </span>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-background-elevated" aria-hidden="true" />

        {/* Indicator trio */}
        <div className="flex flex-1 gap-4 flex-wrap">
          {indicators.map((ind) => (
            <div key={ind.label} className="flex flex-col min-w-[80px]">
              <span
                className={cn(
                  'text-xl font-black tabular-nums leading-none',
                  ind.highlight ? 'text-risk-high' : 'text-text-primary'
                )}
              >
                {ind.value ?? '—'}
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5 font-semibold">{ind.label}</span>
              <span className="text-[10px] text-text-muted mt-0.5">{ind.benchmark}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Enhancement 2: Risk Trend chart ───────────────────────────────────────────

interface TimelineYear {
  year: number
  contracts: number
  total_value: number
  high_risk_count: number
  avg_risk: number
}

function RiskTrendChart({ years }: { years: TimelineYear[] }) {
  const { i18n } = useTranslation('sectors')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  const data = years
    .filter((d) => d.year >= 2010)
    .map((d) => ({
      year: d.year,
      avg_risk: Math.round(d.avg_risk * 1000) / 10, // → 0–100 scale
      high_risk_pct:
        d.contracts > 0
          ? Math.round((d.high_risk_count / d.contracts) * 1000) / 10
          : 0,
    }))

  if (!data.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">
          {lang === 'en' ? 'No risk trend data for this sector.' : 'Sin datos de evolución de riesgo para este sector.'}
        </p>
        <p className="text-[11px] text-text-muted mt-1">
          {lang === 'en'
            ? 'Requires at least two years with scored contracts.'
            : 'Requiere al menos dos años con contratos calificados.'}
        </p>
      </div>
    )
  }

  return (
    <div
      className="h-[180px]"
      role="img"
      aria-label="Line chart showing average risk score and high-risk percentage per year"
    >
      <span className="sr-only">
        Dual-line chart: amber line shows average risk score × 100, red line shows percentage of
        high-risk contracts, from 2010 to present.
      </span>
      {(() => {
        type RiskRow = (typeof data)[number]
        const series: LineSeries<RiskRow>[] = [
          { key: 'avg_risk', label: 'Avg Risk Score ×100', colorToken: 'risk-high' },
          { key: 'high_risk_pct', label: 'High-Risk %', colorToken: 'risk-critical' },
        ]
        return (
          <EditorialLineChart
            data={data}
            xKey="year"
            series={series}
            yFormat="pct"
            height={180}
          />
        )
      })()}
    </div>
  )
}

// ── Enhancement 3: Concentration Gini chart ───────────────────────────────────

interface ConcentrationYear {
  year: number
  gini: number
  top_vendor_share: number
  total_value: number
  vendor_count: number
}

function ConcentrationGiniChart({ history }: { history: ConcentrationYear[] }) {
  const data = history.filter((d) => d.year >= 2010)

  if (!data.length) {
    return (
      <p className="text-sm text-text-muted py-6 text-center">
        No concentration history data available.
      </p>
    )
  }

  return (
    <div
      className="h-[160px]"
      role="img"
      aria-label="Line chart showing market concentration Gini coefficient over time"
    >
      <span className="sr-only">
        Gini coefficient from 0 (perfectly equal) to 1 (full monopoly). Reference line at 0.25
        marks low-concentration threshold.
      </span>
      {(() => {
        const series: LineSeries<ConcentrationYear>[] = [
          { key: 'gini', label: 'Gini', colorToken: 'risk-high' },
        ]
        const annotations: ChartAnnotation[] = [
          { kind: 'hrule', y: 0.25, label: 'Low concentration', tone: 'info' },
        ]
        return (
          <EditorialLineChart
            data={data}
            xKey="year"
            series={series}
            yFormat="decimal"
            yDomain={[0, 1]}
            annotations={annotations}
            height={160}
          />
        )
      })()}
    </div>
  )
}

// ── Enhancement 4: Investigation Cases callout ────────────────────────────────

interface ScandalCaseSummary {
  id: number
  name_en: string
  name_es: string
  slug: string
  severity: number
  amount_mxn_low?: number
  amount_mxn_high?: number
}

function InvestigationCallout({
  cases,
  sectorId,
}: {
  cases: ScandalCaseSummary[]
  sectorId: number
}) {
  if (!cases.length) return null

  const totalLoss = cases.reduce(
    (sum, c) => sum + (c.amount_mxn_low ?? 0),
    0
  )

  const top3 = cases.slice(0, 3)

  return (
    <div
      className="rounded-sm border border-red-500/25 bg-red-500/5 p-4"
      role="region"
      aria-label={`${cases.length} investigation cases in this sector`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-risk-critical flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-risk-critical">
            {cases.length} Investigation {cases.length === 1 ? 'Case' : 'Cases'}
          </span>
        </div>
        {totalLoss > 0 && (
          <span className="text-xs font-mono font-bold text-risk-critical tabular-nums flex-shrink-0">
            est. loss: {formatCompactMXN(totalLoss)}+
          </span>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        {top3.map((c) => (
          <Link
            key={c.id}
            to={`/cases/${c.slug}`}
            className="flex items-center justify-between gap-2 group rounded-lg px-2 py-1.5 hover:bg-background-elevated transition-colors"
          >
            <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors truncate">
              {c.name_en}
            </span>
            <span
              className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                color:
                  c.severity >= 4 ? '#f87171' :
                  c.severity >= 3 ? '#fb923c' :
                  '#fbbf24',
                backgroundColor:
                  c.severity >= 4 ? '#f8717118' :
                  c.severity >= 3 ? '#fb923c18' :
                  '#fbbf2418',
              }}
            >
              severity {c.severity}
            </span>
          </Link>
        ))}
      </div>

      <Link
        to={`/cases?sector=${sectorId}`}
        className="inline-flex items-center gap-1 text-xs text-risk-critical hover:text-risk-critical/80 transition-colors font-semibold"
      >
        View all cases
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  )
}

function SectorProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
      <Skeleton className="h-4 w-32 mt-4" />
      <div className="rounded-sm border border-border bg-background/60 p-6 sm:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-16 w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        {[0,1,2].map((i) => <Skeleton key={i} className="h-9 w-32 rounded-sm" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-sm" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SectorProfile() {
  const { id } = useParams<{ id: string }>()
  const sectorId = Number(id)
  const navigate = useNavigate()
  const { t } = useTranslation('sectors')
  const currentYear = useMemo(() => new Date().getFullYear() - 1, [])
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // prev/next navigation
  const sectorIndex = SECTORS.findIndex((s) => s.id === sectorId)
  const prevSector = sectorIndex > 0 ? SECTORS[sectorIndex - 1] : null
  const nextSector = sectorIndex < SECTORS.length - 1 ? SECTORS[sectorIndex + 1] : null

  // ── queries ────────────────────────────────────────────────────────────────

  const { data: sector, isLoading: sectorLoading, error: sectorError } = useQuery({
    queryKey: ['sector', sectorId],
    queryFn: () => sectorApi.getById(sectorId),
    enabled: !!sectorId,
  })

  const { data: riskDist, isLoading: riskLoading } = useQuery({
    queryKey: ['sector', sectorId, 'risk-distribution'],
    queryFn: () => sectorApi.getRiskDistribution(sectorId),
    enabled: !!sectorId && activeTab === 'risk',
  })

  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', { sector_id: sectorId, per_page: VENDOR_LIST_PER_PAGE }],
    queryFn: () => vendorApi.getTop('value', VENDOR_LIST_PER_PAGE, { sector_id: sectorId }),
    enabled: !!sectorId && activeTab === 'vendors',
  })

  const { data: riskFactors, isLoading: riskFactorsLoading } = useQuery({
    queryKey: ['analysis', 'risk-factors', sectorId],
    queryFn: () => analysisApi.getRiskFactorAnalysis(sectorId),
    enabled: !!sectorId && activeTab === 'risk',
    staleTime: 10 * 60 * 1000,
  })

  const { data: moneyFlow, isLoading: moneyFlowLoading } = useQuery({
    queryKey: ['analysis', 'money-flow', sectorId],
    queryFn: () => analysisApi.getMoneyFlow(undefined, sectorId),
    enabled: !!sectorId && activeTab === 'overview',
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorInstitutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['institutions', 'by-sector', sectorId],
    queryFn: () =>
      institutionApi.getAll({
        sector_id: sectorId,
        per_page: INSTITUTION_LIST_PER_PAGE,
        sort_by: 'total_amount_mxn',
        sort_order: 'desc',
      }),
    enabled: !!sectorId && activeTab === 'overview',
    staleTime: 10 * 60 * 1000,
  })

  // Enhancement 1: PHI governance grade
  const { data: phiDetail } = useQuery({
    queryKey: ['phi', 'sector-detail', sectorId],
    queryFn: () => phiApi.getSectorDetail(sectorId) as Promise<PhiDetailData>,
    enabled: !!sectorId && activeTab === 'overview',
    staleTime: 60 * 60 * 1000,
  })

  // Enhancement 2: Risk timeline
  const { data: timelineData } = useQuery({
    queryKey: ['sector', sectorId, 'risk-timeline'],
    queryFn: async (): Promise<{ sector_id: number; years: TimelineYear[] }> => {
      const { data } = await api.get<{ sector_id: number; years: TimelineYear[] }>(
        `/sectors/${sectorId}/timeline`
      )
      return data
    },
    enabled: !!sectorId && activeTab === 'overview',
    staleTime: 30 * 60 * 1000,
  })

  // Enhancement 3: Concentration Gini history (Risk tab)
  const { data: concentrationHistory } = useQuery({
    queryKey: ['sector', sectorId, 'concentration-history'],
    queryFn: async (): Promise<{ sector_id: number; sector_name: string; history: ConcentrationYear[] }> => {
      const { data } = await api.get<{
        sector_id: number
        sector_name: string
        history: ConcentrationYear[]
      }>(`/sectors/${sectorId}/concentration-history`)
      return data
    },
    enabled: !!sectorId && activeTab === 'risk',
    staleTime: 60 * 60 * 1000,
  })

  // Enhancement 4: Investigation cases (Overview tab)
  const { data: sectorCases } = useQuery({
    queryKey: ['cases', 'by-sector', sectorId],
    queryFn: () => caseLibraryApi.getBySector(sectorId),
    enabled: !!sectorId && activeTab === 'overview',
    staleTime: 60 * 60 * 1000,
  })

  // ── derived values ─────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    type InsightEntry = {
      type: 'warning' | 'info' | 'critical' | 'positive'
      title: string
      body: string
      icon: React.ComponentType<{ className?: string }>
    }
    const result: InsightEntry[] = []
    const stats = sector?.statistics
    if (!stats) return result

    const highRiskRate =
      stats.total_contracts > 0
        ? (stats.high_risk_count + stats.critical_risk_count) / stats.total_contracts
        : 0
    const platformBaseline = 0.135 // v6.5 HR

    if (highRiskRate > platformBaseline * 1.3) {
      result.push({
        type: 'critical',
        title: 'Elevated High-Risk Rate',
        body: `${(highRiskRate * 100).toFixed(1)}% high-risk rate is significantly above the platform average of ${(platformBaseline * 100).toFixed(0)}%.`,
        icon: AlertTriangle,
      })
    } else if (highRiskRate < 0.02 && stats.total_contracts > 1000) {
      result.push({
        type: 'positive',
        title: 'Low Model Risk Signal',
        body: `${(highRiskRate * 100).toFixed(1)}% high-risk rate is unusually low — may reflect data quality gaps or structural sector characteristics.`,
        icon: Info,
      })
    }

    if (stats.direct_award_pct > 70) {
      result.push({
        type: 'warning',
        title: 'High Direct Award Rate',
        body: `${stats.direct_award_pct.toFixed(0)}% of contracts are direct awards, limiting competitive transparency.`,
        icon: ShieldAlert,
      })
    }

    if (stats.single_bid_pct > 25) {
      result.push({
        type: 'warning',
        title: 'Single-Bid Procedures',
        body: `${stats.single_bid_pct.toFixed(0)}% of competitive procedures had only one bidder.`,
        icon: Users,
      })
    }

    return result
  }, [sector?.statistics])

  // ── loading / error states ─────────────────────────────────────────────────

  if (sectorLoading) return <SectorProfileSkeleton />

  if (sectorError || !sector) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">{t('profile.sectorNotFound')}</h2>
        <p className="text-text-muted mb-4">{t('profile.sectorNotFoundMsg')}</p>
        <Link to="/sectors">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('profile.backToSectors')}
          </Button>
        </Link>
      </div>
    )
  }

  const sectorColor = SECTOR_COLORS[sector.code] ?? sector.color ?? '#64748b'
  // Token-locked sector color for primitive charts (bible §2)
  const sectorColorToken: ColorToken =
    (sector.code && (`sector-${sector.code}` as ColorToken)) || 'neutral'
  const stats = sector.statistics
  const riskLevel = getRiskLevelFromScore(stats?.avg_risk_score ?? 0)
  const highRiskPct =
    stats && stats.total_contracts > 0
      ? (
          ((stats.high_risk_count + stats.critical_risk_count) / stats.total_contracts) *
          100
        ).toFixed(1)
      : '0'

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: t('profile.overviewTab') },
    { id: 'vendors', label: t('profile.vendorsTab') },
    { id: 'risk', label: t('profile.riskTab') },
  ]

  // Editorial shell severity from sector risk level
  const shellSeverity: 'critical' | 'high' | 'medium' | 'low' =
    riskLevel === 'critical' ? 'critical' :
    riskLevel === 'high' ? 'high' :
    riskLevel === 'medium' ? 'medium' : 'low'

  return (
    <article className="max-w-6xl mx-auto pb-12 px-4 sm:px-6 pt-4">

      {/* ── BREADCRUMB NAV ──────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between pb-4"
        aria-label="Sector navigation"
      >
        <Link
          to="/sectors"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('profile.backToSectors')}
        </Link>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {prevSector && (
            <button
              onClick={() => navigate(`/sectors/${prevSector.id}`)}
              className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
              aria-label={`${t('profile.prev')}: ${t(prevSector.code)}`}
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              {t(prevSector.code)}
            </button>
          )}
          {prevSector && nextSector && (
            <span className="text-text-primary" aria-hidden="true">|</span>
          )}
          {nextSector && (
            <button
              onClick={() => navigate(`/sectors/${nextSector.id}`)}
              className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
              aria-label={`${t('profile.next')}: ${t(nextSector.code)}`}
            >
              {t(nextSector.code)}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </nav>

      <EditorialPageShell
        kicker={`SECTOR PROFILE · ${sector.name?.toUpperCase() ?? 'LOADING...'}`}
        headline={
          <>
            The <span style={{ color: sectorColor }} className="capitalize">{sector.name}</span> sector
          </>
        }
        paragraph={
          <>
            {getSectorDescription(sector.code).short} Procurement patterns in this sector reveal how
            public spending concentrates among vendors, where competitive bidding gives way to direct
            awards, and which institutions control the largest share of contract value.
          </>
        }
        stats={stats ? [
          { value: formatCompactMXN(stats.total_value_mxn), label: t('profile.totalSpend'), color: sectorColor },
          { value: formatNumber(stats.total_contracts), label: t('profile.contracts') },
          {
            value: `${highRiskPct}%`,
            label: t('profile.highPlusCritical'),
            color: parseFloat(highRiskPct) > 15 ? 'var(--color-risk-high)' : undefined,
            sub: 'OECD: 2-15%',
          },
          {
            value: formatPercentSafe(stats.direct_award_pct, false) ?? '-',
            label: t('profile.directAward'),
            color: (stats.direct_award_pct ?? 0) > 70 ? 'var(--color-risk-high)' : undefined,
            sub: 'OECD max: 25%',
          },
        ] : undefined}
        meta={<>RUBLI · v0.6.5</>}
        actions={
          <div className="flex items-center gap-3">
            <RiskBadge level={riskLevel} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              {sector.code}
            </span>
          </div>
        }
        severity={shellSeverity}
      >

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <Act number="I" label="EVIDENCIA · ANÁLISIS DEL SECTOR">
      <div>
        <div
          className="flex gap-1 rounded-sm bg-background/60 border border-border p-1 mb-6"
          role="tablist"
          aria-label="Sector detail tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 rounded-sm px-4 py-2 text-sm font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-secondary'
              )}
              style={
                activeTab === tab.id
                  ? { backgroundColor: hex(sectorColor, 0.2), color: sectorColor }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        <div
          id="tabpanel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          hidden={activeTab !== 'overview'}
          className="space-y-6"
        >
          {/* Enhancement 1: PHI Governance Grade panel */}
          {phiDetail && (
            <section aria-labelledby="phi-grade-heading">
              <div className="flex items-center gap-2 mb-2">
                <h2
                  id="phi-grade-heading"
                  className="text-sm font-bold text-text-secondary uppercase tracking-[0.15em]"
                >
                  Procurement Health Index
                </h2>
              </div>
              <PhiGradePanel data={phiDetail} />
            </section>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <section aria-label="Sector intelligence">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((insight, i) => (
                  <InsightCard key={i} {...insight} />
                ))}
              </div>
            </section>
          )}

          {/* Spend trend */}
          <section aria-labelledby="spending-trend-heading">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2
                  id="spending-trend-heading"
                  className="text-base font-bold text-text-primary"
                >
                  {t('profile.spendTrend')}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {t('profile.spendTrendSubtitle', { year: currentYear })}
                </p>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-background/40 p-4">
              {sector.trends?.length ? (
                <TrendArea data={sector.trends} colorToken={sectorColorToken} />
              ) : (
                <p className="text-sm text-text-muted py-8 text-center">
                  {t('profile.noTrendData')}
                </p>
              )}
            </div>
          </section>

          {/* Enhancement 2: Risk Profile Over Time */}
          {timelineData?.years?.length ? (
            <section aria-labelledby="risk-trend-heading">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2
                    id="risk-trend-heading"
                    className="text-base font-bold text-text-primary"
                  >
                    Risk Profile Over Time
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Average risk score and high-risk contract share per year
                  </p>
                </div>
              </div>
              <div className="rounded-sm border border-border bg-background/40 p-4">
                <RiskTrendChart years={timelineData.years} />
                <div className="flex items-center gap-4 mt-2 ml-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-4 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="text-[10px] text-text-secondary">Avg Risk Score ×100</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-4 rounded-full bg-red-500" aria-hidden="true" />
                    <span className="text-[10px] text-text-secondary">High-Risk %</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Enhancement 4: Investigation Cases callout */}
          {sectorCases && sectorCases.length > 0 && (
            <section aria-labelledby="investigation-callout-heading">
              <span id="investigation-callout-heading" className="sr-only">
                Investigation cases for this sector
              </span>
              <InvestigationCallout cases={sectorCases} sectorId={sectorId} />
            </section>
          )}

          {/* Top institutions */}
          <section aria-labelledby="institutions-heading">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2
                  id="institutions-heading"
                  className="text-base font-bold text-text-primary flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" style={{ color: sectorColor }} aria-hidden="true" />
                  {t('profile.topInstitutions')}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">{t('profile.topInstitutionsSubtitle')}</p>
              </div>
              <Link to={`/institutions?sector_id=${sectorId}`}>
                <Button variant="ghost" size="sm" className="text-xs text-text-secondary hover:text-text-primary">
                  {t('profile.viewAll')}
                  <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <div className="rounded-sm border border-border bg-background/40">
              {moneyFlowLoading || institutionsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : moneyFlow?.flows?.length ? (
                <div className="p-2">
                  <InstitutionList
                    flows={moneyFlow.flows.slice(0, 8)}
                    color={sectorColor}
                  />
                </div>
              ) : sectorInstitutions?.data?.length ? (
                <div className="p-2">
                  <InstitutionList
                    flows={sectorInstitutions.data.slice(0, 8).map((inst) => ({
                      source_id: inst.id,
                      source_name: inst.name,
                      value: inst.total_amount_mxn ?? 0,
                      contracts: inst.total_contracts ?? 0,
                      avg_risk: inst.avg_risk_score ?? null,
                      high_risk_pct: null,
                    }))}
                    color={sectorColor}
                  />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">
                  {t('profile.noInstitutionData')}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── VENDORS TAB ───────────────────────────────────────────────────── */}
        <div
          id="tabpanel-vendors"
          role="tabpanel"
          aria-labelledby="tab-vendors"
          hidden={activeTab !== 'vendors'}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: sectorColor }} aria-hidden="true" />
                {t('profile.topVendors')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">{t('profile.topVendorsSubtitle')}</p>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-background/40 overflow-hidden">
            {vendorsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topVendors?.data?.length ? (
              <div className="p-2">
                <VendorTable
                  vendors={topVendors.data as VendorRow[]}
                  sectorId={sectorId}
                  color={sectorColor}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                {t('profile.noVendorData')}
              </p>
            )}
          </div>
        </div>

        {/* ── RISK ANALYSIS TAB ─────────────────────────────────────────────── */}
        <div
          id="tabpanel-risk"
          role="tabpanel"
          aria-labelledby="tab-risk"
          hidden={activeTab !== 'risk'}
          className="space-y-6"
        >
          {/* Risk distribution */}
          <section aria-labelledby="risk-distribution-heading">
            <h2
              id="risk-distribution-heading"
              className="text-base font-bold text-text-primary mb-1"
            >
              {t('profile.riskDistribution')}
            </h2>
            <p className="text-xs text-text-secondary mb-4">{t('profile.riskDistributionSubtitle')}</p>
            <div className="rounded-sm border border-border bg-background/40 p-5">
              {riskLoading ? (
                <div className="flex items-center gap-6">
                  <Skeleton className="h-44 w-44 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    {[0,1,2,3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
                  </div>
                </div>
              ) : riskDist?.data ? (
                <RiskDonut data={riskDist.data} color={sectorColor} />
              ) : (
                <p className="py-6 text-center text-sm text-text-muted">
                  {t('profile.noRiskData')}
                </p>
              )}
            </div>
          </section>

          {/* Top risk factors */}
          <section aria-labelledby="risk-factors-heading">
            <h2
              id="risk-factors-heading"
              className="text-base font-bold text-text-primary mb-1"
            >
              {t('profile.topRiskFactors')}
            </h2>
            <p className="text-xs text-text-secondary mb-4">{t('profile.topRiskFactorsSubtitle')}</p>
            <div className="rounded-sm border border-border bg-background/40 p-5">
              {riskFactorsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : riskFactors?.factor_frequencies?.length ? (
                <FactorRankList
                  data={riskFactors.factor_frequencies}
                  color={sectorColor}
                />
              ) : (
                <p className="py-6 text-center text-sm text-text-muted">
                  {t('profile.noFactorData')}
                </p>
              )}
            </div>
          </section>

          {/* Enhancement 3: Concentration Gini history */}
          {concentrationHistory?.history?.length ? (
            <section aria-labelledby="gini-chart-heading">
              <h2
                id="gini-chart-heading"
                className="text-base font-bold text-text-primary mb-1"
              >
                Market Concentration Over Time
              </h2>
              <p className="text-xs text-text-secondary mb-4">
                Gini coefficient — 1.0 = full monopoly, 0 = perfect competition
              </p>
              <div className="rounded-sm border border-border bg-background/40 p-5">
                <ConcentrationGiniChart history={concentrationHistory.history} />
              </div>
            </section>
          ) : null}

          {/* Procurement pattern stats */}
          {stats && (
            <section aria-labelledby="procurement-patterns-heading">
              <h2
                id="procurement-patterns-heading"
                className="text-base font-bold text-text-primary mb-4"
              >
                Procurement Patterns
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: t('profile.directAward'),
                    value: formatPercentSafe(stats.direct_award_pct, false) ?? '-',
                    warn: (stats.direct_award_pct ?? 0) > 70,
                  },
                  {
                    label: t('profile.singleBid'),
                    value: formatPercentSafe(stats.single_bid_pct, false) ?? '-',
                    warn: (stats.single_bid_pct ?? 0) > 25,
                  },
                  {
                    label: t('profile.avgRisk'),
                    value: `${((stats.avg_risk_score ?? 0) * 100).toFixed(1)}%`,
                    warn: false,
                  },
                  {
                    label: t('profile.vendors'),
                    value: formatNumber(stats.total_vendors ?? 0),
                    warn: false,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'rounded-sm border p-4',
                      item.warn
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border bg-background/40'
                    )}
                  >
                    <p
                      className={cn(
                        'text-2xl font-black tabular-nums',
                        item.warn ? 'text-risk-high' : 'text-text-primary'
                      )}
                    >
                      {item.value}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5 capitalize">{item.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      </Act>
      </EditorialPageShell>
    </article>
  )
}

export default SectorProfile
