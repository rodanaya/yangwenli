/**
 * Procurement Risk Intelligence — simplified journalist view
 *
 * Four sections:
 *   1. Alert Ticker          — high-risk contract count vs prior year
 *   2. Top Risk Vendors      — ARIA T1 queue, 10 most suspicious vendors
 *   3. Sector Risk Heatmap   — % high-risk by sector × year (2020–2025)
 *   4. Recent Critical Contracts — last 20 critical-risk contracts
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { analysisApi, ariaApi, contractApi } from '@/api/client'
import type { AriaQueueItem, ContractListItem, SectorYearItem, YearOverYearChange } from '@/api/types'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'

// =============================================================================
// Risk helpers
// =============================================================================

function riskScoreColor(score: number): string {
  if (score >= 0.60) return RISK_COLORS.critical
  if (score >= 0.40) return RISK_COLORS.high
  if (score >= 0.25) return RISK_COLORS.medium
  return RISK_COLORS.low
}

// =============================================================================
// Sub-components
// =============================================================================

/** Loading skeleton rows for a table */
function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  )
}

// =============================================================================
// Section 1 — Alert Ticker
// =============================================================================

function AlertTicker() {
  const { data: yoyResp, isLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year', 'pi-simple'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 30 * 60 * 1000,
  })
  const navigate = useNavigate()

  if (isLoading) return <Skeleton className="h-12 w-full" />

  const yoyData: YearOverYearChange[] = yoyResp?.data ?? []
  if (!yoyData.length) return null

  const sorted = [...yoyData].sort((a, b) => b.year - a.year)
  const latest = sorted[0]
  const prior = sorted[1]

  if (!latest) return null

  const highRiskCount = Math.round((latest.high_risk_pct / 100) * latest.contracts)
  const priorHighRiskCount = prior
    ? Math.round(((prior.high_risk_pct ?? 0) / 100) * (prior.contracts ?? 0))
    : null
  const delta = priorHighRiskCount != null ? highRiskCount - priorHighRiskCount : null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border"
      style={{ background: `${RISK_COLORS.high}12`, borderColor: `${RISK_COLORS.high}40` }}
      role="status"
      aria-live="polite"
    >
      <Activity className="h-4 w-4 shrink-0" style={{ color: RISK_COLORS.high }} aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-bold uppercase tracking-wide font-mono" style={{ color: RISK_COLORS.high }}>
          Risk Alert
        </span>
        <span className="text-xs text-text-secondary">
          <span className="font-bold text-text-primary">{formatNumber(highRiskCount)}</span>
          {' high-risk contracts in '}
          <button
            onClick={() => navigate(`/year-in-review/${latest.year}`)}
            className="text-accent hover:underline font-semibold"
          >
            {latest.year}
          </button>
          {` (${latest.high_risk_pct.toFixed(1)}% of all contracts)`}
        </span>
        {delta != null && (
          <span
            className={cn(
              'text-xs font-mono font-bold inline-flex items-center gap-0.5',
              delta > 0 ? 'text-risk-critical' : delta < 0 ? 'text-risk-low' : 'text-text-muted',
            )}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Minus className="h-3 w-3" aria-hidden="true" />
            )}
            {delta > 0 ? '+' : ''}
            {formatNumber(delta)} vs prior year
          </span>
        )}
      </div>
      <span className="text-[10px] text-text-muted font-mono shrink-0">
        {new Date().toLocaleDateString('en-MX')}
      </span>
    </div>
  )
}

// =============================================================================
// Section 2 — Top Risk Vendors (ARIA T1)
// =============================================================================

interface TopRiskVendorsProps {
  onVendorClick: (id: number) => void
}

function TopRiskVendors({ onVendorClick }: TopRiskVendorsProps) {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['aria', 'queue', 'tier1', 'pi-simple'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 10, page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  const vendors: AriaQueueItem[] = data?.data ?? []

  return (
    <Card className="border-border/40">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-1 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AlertTriangle className="h-4 w-4 text-risk-critical" aria-hidden="true" />
              <h2 className="text-base font-bold text-text-primary">Top Risk Vendors</h2>
            </div>
            <p className="text-xs text-text-muted">
              ARIA Tier 1 — highest investigation priority scores across all 318K monitored vendors.
            </p>
          </div>
          <button
            onClick={() => navigate('/aria')}
            className="shrink-0 text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            Full queue <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : vendors.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No ARIA T1 vendors found</p>
          ) : (
            <table
              className="w-full text-xs border-separate border-spacing-y-0.5"
              role="grid"
              aria-label="Top risk vendors"
            >
              <thead>
                <tr className="text-[10px] text-text-muted uppercase tracking-wide">
                  <th className="text-left pb-1.5 w-5">#</th>
                  <th className="text-left pb-1.5">Vendor</th>
                  <th className="text-right pb-1.5 w-20">IPS Score</th>
                  <th className="text-right pb-1.5 w-20">Avg Risk</th>
                  <th className="text-right pb-1.5 w-20">Value</th>
                  <th className="text-left pb-1.5 w-24 pl-2">Pattern</th>
                  <th className="text-right pb-1.5 w-6" />
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor, i) => {
                  const color = riskScoreColor(vendor.avg_risk_score)
                  const hasExternalFlag = vendor.is_efos_definitivo || vendor.is_sfp_sanctioned
                  return (
                    <tr
                      key={vendor.vendor_id}
                      className="hover:bg-background-elevated/30 transition-colors group"
                    >
                      <td className="py-2 pl-1 text-text-muted font-mono text-[10px]">{i + 1}</td>
                      <td className="py-2 pr-2 min-w-0">
                        <button
                          onClick={() => onVendorClick(vendor.vendor_id)}
                          className="text-left hover:text-accent transition-colors font-medium text-text-primary leading-snug flex items-center gap-1.5 max-w-full"
                          title={toTitleCase(vendor.vendor_name)}
                        >
                          <span className="truncate">{toTitleCase(vendor.vendor_name)}</span>
                          {hasExternalFlag && (
                            <span
                              className="text-[9px] font-bold text-risk-critical shrink-0"
                              title={
                                vendor.is_efos_definitivo
                                  ? 'Listed on SAT EFOS registry'
                                  : 'Sanctioned by SFP'
                              }
                            >
                              {vendor.is_efos_definitivo ? 'EFOS' : 'SFP'}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-2 text-right tabular-nums font-mono font-bold" style={{ color }}>
                        {vendor.ips_final.toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-mono" style={{ color }}>
                        {(vendor.avg_risk_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 text-right tabular-nums text-text-secondary">
                        {formatCompactMXN(vendor.total_value_mxn)}
                      </td>
                      <td className="py-2 pl-2 text-text-muted text-[10px]">
                        {vendor.primary_pattern
                          ? vendor.primary_pattern.replace(/^P\d+\s*/, '').slice(0, 18)
                          : '—'}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => navigate(`/vendors/${vendor.vendor_id}`)}
                          className="text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Open profile for ${toTitleCase(vendor.vendor_name)}`}
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Section 3 — Sector Risk Heatmap
// =============================================================================

const HEATMAP_YEARS = [2020, 2021, 2022, 2023, 2024, 2025]

function SectorHeatmap() {
  const navigate = useNavigate()
  const { t: ts } = useTranslation('sectors')

  const { data: sectorYearResp, isLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown', 'pi-simple'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  const rows: SectorYearItem[] = sectorYearResp?.data ?? []

  const heatmapData = SECTORS.map(sector => ({
    sector,
    cells: HEATMAP_YEARS.map(year => {
      const row = rows.find(r => r.sector_id === sector.id && r.year === year)
      return { year, pct: row?.high_risk_pct ?? null }
    }),
  }))

  return (
    <Card className="border-border/40">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="text-base font-bold text-text-primary">Sector Risk Heatmap (2020–2025)</h2>
        </div>
        <p className="text-xs text-text-muted mb-4">
          High-risk contract rate (%) per sector per year. Click any cell to view those contracts.
        </p>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="text-xs w-full"
              role="grid"
              aria-label="Sector risk heatmap 2020–2025"
            >
              <thead>
                <tr>
                  <th className="text-left py-1.5 pr-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide min-w-[100px]">
                    Sector
                  </th>
                  {HEATMAP_YEARS.map(y => (
                    <th
                      key={y}
                      className="text-center py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide min-w-[52px]"
                    >
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map(({ sector, cells }) => (
                  <tr key={sector.id} className="hover:bg-background-elevated/20 transition-colors">
                    <td className="py-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sector.color }}
                          aria-hidden="true"
                        />
                        <span className="text-[10px] text-text-secondary font-medium truncate max-w-[90px]">
                          {ts(sector.code)}
                        </span>
                      </div>
                    </td>
                    {cells.map(cell => {
                      if (cell.pct == null) {
                        return (
                          <td key={cell.year} className="py-1 px-2 text-center">
                            <div className="w-10 h-7 rounded flex items-center justify-center mx-auto bg-border/10">
                              <span className="text-[9px] text-text-muted">—</span>
                            </div>
                          </td>
                        )
                      }
                      // 0% = faint, 25%+ = full red
                      const intensity = Math.min(1, cell.pct / 25)
                      const bg = `rgba(248,113,113,${intensity * 0.75 + 0.05})`
                      const textColor = intensity > 0.5 ? '#fff' : '#94a3b8'
                      return (
                        <td key={cell.year} className="py-1 px-2 text-center">
                          <button
                            onClick={() =>
                              navigate(
                                `/contracts?sector_id=${sector.id}&year=${cell.year}&risk_level=high`,
                              )
                            }
                            className="w-10 h-7 rounded text-[10px] font-bold tabular-nums transition-opacity hover:opacity-80 flex items-center justify-center mx-auto"
                            style={{ backgroundColor: bg, color: textColor }}
                            title={`${ts(sector.code)} ${cell.year}: ${cell.pct.toFixed(1)}% high-risk`}
                            aria-label={`${ts(sector.code)} ${cell.year}: ${cell.pct.toFixed(1)}% high-risk contracts`}
                          >
                            {cell.pct.toFixed(1)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[9px] text-text-muted mt-2">
          Values = % of contracts classified as high or critical risk. Click any cell to open the contracts list.
        </p>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Section 4 — Recent Critical Contracts
// =============================================================================

interface RecentContractsProps {
  onVendorClick: (id: number) => void
  onInstitutionClick: (id: number) => void
}

function RecentCriticalContracts({ onVendorClick, onInstitutionClick }: RecentContractsProps) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'critical', 'pi-simple'],
    queryFn: () =>
      contractApi.getAll({
        risk_level: 'critical',
        per_page: 20,
        page: 1,
        sort_by: 'contract_date',
        sort_order: 'desc',
      }),
    staleTime: 10 * 60 * 1000,
  })

  const contracts: ContractListItem[] = data?.data ?? []
  const visible = showAll ? contracts : contracts.slice(0, 10)

  return (
    <Card className="border-border/40">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-1 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="h-4 w-4 text-risk-critical" aria-hidden="true" />
              <h2 className="text-base font-bold text-text-primary">Recent Critical-Risk Contracts</h2>
            </div>
            <p className="text-xs text-text-muted">
              Most recent contracts scored critical (≥ 0.60) by the v6.5 risk model. Each is clickable.
            </p>
          </div>
          <button
            onClick={() => navigate('/contracts?risk_level=critical')}
            className="shrink-0 text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            All critical <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : contracts.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No critical contracts found</p>
          ) : (
            <>
              <table
                className="w-full text-xs border-separate border-spacing-y-0.5"
                role="grid"
                aria-label="Recent critical-risk contracts"
              >
                <thead>
                  <tr className="text-[10px] text-text-muted uppercase tracking-wide">
                    <th className="text-left pb-1.5">Date</th>
                    <th className="text-left pb-1.5 pl-2">Vendor</th>
                    <th className="text-left pb-1.5 pl-2 hidden sm:table-cell">Institution</th>
                    <th className="text-right pb-1.5 w-24">Amount</th>
                    <th className="text-right pb-1.5 w-16">Risk</th>
                    <th className="text-right pb-1.5 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(contract => {
                    const riskScore = contract.risk_score ?? 0
                    const riskColor = riskScoreColor(riskScore)
                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-background-elevated/30 transition-colors group"
                      >
                        {/* Date */}
                        <td className="py-2 text-text-muted tabular-nums font-mono text-[10px] whitespace-nowrap">
                          {contract.contract_date
                            ? contract.contract_date.slice(0, 10)
                            : contract.contract_year ?? '—'}
                        </td>

                        {/* Vendor */}
                        <td className="py-2 pl-2 min-w-0 max-w-[160px]">
                          {contract.vendor_id ? (
                            <button
                              onClick={() => onVendorClick(contract.vendor_id!)}
                              className="truncate text-text-primary hover:text-accent transition-colors font-medium text-left block w-full"
                              title={toTitleCase(contract.vendor_name ?? '')}
                            >
                              {toTitleCase(contract.vendor_name ?? '—')}
                            </button>
                          ) : (
                            <span className="text-text-muted">{contract.vendor_name ?? '—'}</span>
                          )}
                        </td>

                        {/* Institution — hidden on small screens */}
                        <td className="py-2 pl-2 min-w-0 max-w-[160px] hidden sm:table-cell">
                          {contract.institution_id ? (
                            <button
                              onClick={() => onInstitutionClick(contract.institution_id!)}
                              className="truncate text-text-secondary hover:text-accent transition-colors text-left block w-full"
                              title={contract.institution_name ?? ''}
                            >
                              {contract.institution_name ?? '—'}
                            </button>
                          ) : (
                            <span className="text-text-muted">{contract.institution_name ?? '—'}</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2 text-right tabular-nums font-mono text-text-secondary whitespace-nowrap">
                          {formatCompactMXN(contract.amount_mxn)}
                        </td>

                        {/* Risk score */}
                        <td
                          className="py-2 text-right tabular-nums font-mono font-bold"
                          style={{ color: riskColor }}
                        >
                          {(riskScore * 100).toFixed(0)}%
                        </td>

                        {/* Link to contract detail */}
                        <td className="py-2 text-right">
                          <button
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                            className="text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="View contract detail"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {!showAll && contracts.length > 10 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="mt-3 w-full text-xs text-accent hover:text-accent/80 py-1.5 border border-dashed border-accent/30 rounded transition-colors"
                >
                  Show all {contracts.length} contracts
                </button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Main page
// =============================================================================

export default function ProcurementIntelligence() {
  const { t } = useTranslation('procurement')
  const { open: openEntityDrawer } = useEntityDrawer()

  function handleVendorClick(id: number) {
    openEntityDrawer(id, 'vendor')
  }

  function handleInstitutionClick(id: number) {
    openEntityDrawer(id, 'institution')
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            {t('trackingLabel')}
          </span>
        </div>
        <h1 className="text-2xl font-black text-text-primary mb-1">{t('title')}</h1>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>

      {/* Section 1: Alert Ticker */}
      <AlertTicker />

      {/* Section 2: Top Risk Vendors */}
      <TopRiskVendors onVendorClick={handleVendorClick} />

      {/* Section 3: Sector Heatmap */}
      <SectorHeatmap />

      {/* Section 4: Recent Critical Contracts */}
      <RecentCriticalContracts
        onVendorClick={handleVendorClick}
        onInstitutionClick={handleInstitutionClick}
      />
    </div>
  )
}
