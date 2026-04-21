import { memo, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { realUSDLabel } from '@/lib/currency'
import { analysisApi, ariaApi } from '@/api/client'
import type { AriaQueueItem, FastDashboardData } from '@/api/types'
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Crosshair,
  FileSearch,
  Info,
  ChevronRight,
} from 'lucide-react'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'
import { RiskStrata, type RiskStrataRow } from '@/components/charts/RiskStrata'
import { SectorMarimekko, type SectorMarimekkoRow } from '@/components/charts/SectorMarimekko'
import { SexenioStratum, type SexenioYearRow } from '@/components/charts/SexenioStratum'
import { ConcentrationConstellation, type ConstellationRiskRow, type ConstellationMode } from '@/components/charts/ConcentrationConstellation'
import { AdminFingerprints } from '@/components/charts/AdminFingerprints'
import { PatternTypology } from '@/components/charts/PatternTypology'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

// ============================================================================
// Dashboard: Data-Rich Editorial Intelligence Brief
//
// Structure:
// 1. EDITORIAL HERO — compact kicker + serif headline + inline stat strip
// 2. RISK OVERVIEW — 2-column: sector bars (left) + risk distribution bars (right)
// 3. ARIA TIER CARDS — 3 compact cards (T1 / T2 / T3) with left color border
// 4. TOP PRIORITY LEAD — full-width vendor spotlight
// 5. SECTOR TABLE — compact 12-sector comparison table
// 6. CONTEXT + CTAs
// ============================================================================

// ============================================================================
// RISK DISTRIBUTION — geological strata column (RiskStrata)
// ============================================================================

function RiskDistributionPanel({
  data,
  totalContracts,
}: {
  data: Array<{ risk_level: string; percentage: number; count: number }>
  totalContracts: number
}) {
  const { t } = useTranslation('dashboard')

  const strataRows = useMemo((): RiskStrataRow[] => {
    const order = ['critical', 'high', 'medium', 'low'] as const
    const labelKeys: Record<typeof order[number], string> = {
      critical: 'editorial.riskCritical',
      high:     'editorial.riskHigh',
      medium:   'editorial.riskMedium',
      low:      'editorial.riskLow',
    }
    return order.map((level) => {
      const item = data.find((d) => d.risk_level === level)
      return {
        level,
        label: t(labelKeys[level], level.charAt(0).toUpperCase() + level.slice(1)),
        pct: item?.percentage ?? 0,
        count: item?.count ?? 0,
      }
    })
  }, [data, t])

  const hrRate = useMemo(
    () => strataRows.filter((r) => r.level === 'critical' || r.level === 'high').reduce((s, r) => s + r.pct, 0),
    [strataRows]
  )

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-bold text-text-primary">
          {t('editorial.riskDistTitle', 'Risk distribution')}
        </h3>
        <span className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider flex-shrink-0">
          {formatNumber(totalContracts)}
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
        {t('editorial.riskDistSubtitle', 'Share of {{total}} contracts at each risk level. High-risk = critical + high.', {
          total: formatNumber(totalContracts),
        })}
      </p>

      <RiskStrata
        rows={strataRows}
        totalContracts={totalContracts}
        hrRate={hrRate}
      />

      <p className="text-[10px] text-text-muted/60 mt-2 font-mono">
        {t('editorial.riskOecdNote', 'High-risk: {{rate}}% · OECD 2-15%', { rate: hrRate.toFixed(1) })}
      </p>
    </div>
  )
}

// ============================================================================
// ARIA TIER CARD — compact with left color border
// ============================================================================

function TierCard({
  tier,
  label,
  count,
  color,
  action,
  onClick,
}: {
  tier: string
  label: string
  count: number
  color: string
  action: string
  onClick: () => void
}) {
  const { t } = useTranslation('dashboard')
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-md border border-border/30 p-4 transition-all hover:border-border/60 hover:bg-background-elevated/30"
      style={{ borderLeftWidth: '3px', borderLeftColor: color }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold tracking-[0.15em]" style={{ color }}>
          {tier}
        </span>
        <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="stat-lg font-mono mb-1" style={{ color }}>
        {formatNumber(count)}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-muted leading-snug truncate">{action}</p>
        <span className="text-[10px] font-mono text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
          {t('editorial.viewQueue', 'View queue')}
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

// ============================================================================
// SECTOR TABLE — compact 12-sector comparison
// ============================================================================

interface SectorTableRow {
  code: string
  name: string
  contracts: number
  totalValue: number
  avgRisk: number // 0-1
  highCritPct: number // 0-100
}

function SectorTable({ sectors, loading }: { sectors: SectorTableRow[]; loading: boolean }) {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            {t('editorial.sectorTableTitle', 'Sector breakdown')}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('editorial.sectorTableSubtitle', 'Contracts, total value and risk for each of the 12 federal sectors, ordered by spend.')}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/30">
        {/* Header row */}
        <div
          className="grid items-center text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted/70 px-3 py-2 border-b border-border/30 min-w-[560px]"
          style={{ gridTemplateColumns: '1.8fr 1fr 1.2fr 1fr 1fr 16px' }}
        >
          <span>{t('editorial.colSector', 'Sector')}</span>
          <span className="text-right">{t('editorial.colContracts', 'Contracts')}</span>
          <span className="text-right">{t('editorial.colValue', 'Total value')}</span>
          <span className="text-right">{t('editorial.colAvgRisk', 'Avg risk')}</span>
          <span className="text-right">{t('editorial.colHighCrit', '% High+Crit')}</span>
          <span />
        </div>
        {/* Rows */}
        {sectors.map((s, idx) => {
          const color = SECTOR_COLORS[s.code] ?? '#64748b'
          const riskLevel =
            s.avgRisk >= 0.4 ? 'high' : s.avgRisk >= 0.25 ? 'medium' : 'low'
          const riskColor =
            riskLevel === 'high' ? RISK_COLORS.high
            : riskLevel === 'medium' ? RISK_COLORS.medium
            : RISK_COLORS.low
          return (
            <button
              key={s.code}
              onClick={() => navigate(`/sectors/${s.code}`)}
              className={cn(
                'w-full grid items-center px-3 py-2 text-left transition-colors hover:bg-background-elevated/40 min-w-[560px]',
                idx < sectors.length - 1 && 'border-b border-border/20'
              )}
              style={{ gridTemplateColumns: '1.8fr 1fr 1.2fr 1fr 1fr 16px' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-text-primary font-medium truncate">{s.name}</span>
              </div>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {formatNumber(s.contracts)}
              </span>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {formatCompactMXN(s.totalValue)}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                {(() => {
                  const N = 10, DR = 2, DG = 5
                  const pct = Math.min(1, s.avgRisk * 2) // scale 0-0.5 to 0-100%
                  const filled = Math.round(pct * N)
                  return (
                    <svg viewBox={`0 0 ${N * DG} 6`} width={N * DG} height={6} aria-hidden="true">
                      {Array.from({ length: N }).map((_, i) => (
                        <circle
                          key={i}
                          cx={i * DG + DR}
                          cy={3}
                          r={DR}
                          fill={i < filled ? riskColor : '#2d2926'}
                          stroke={i < filled ? undefined : '#3d3734'}
                          strokeWidth={i < filled ? 0 : 0.5}
                          fillOpacity={i < filled ? 0.85 : 0.7}
                        />
                      ))}
                    </svg>
                  )
                })()}
                <span className="text-[11px] font-mono text-text-primary tabular-nums w-10 text-right">
                  {(s.avgRisk * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {s.highCritPct.toFixed(1)}%
              </span>
              <ChevronRight className="h-3 w-3 text-text-muted/50" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')
  const { t: ts } = useTranslation('sectors')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [constellationMode, setConstellationMode] = useState<ConstellationMode>('patterns')

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: fastDashboard, isLoading: dashLoading, error: dashError, refetch: dashRefetch } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const fastFailed = !dashLoading && (!fastDashboard || !fastDashboard.overview)
  const { data: riskOverviewFallback, isLoading: fallbackLoading } = useQuery({
    queryKey: ['analysis', 'risk-overview-fallback'],
    queryFn: () => analysisApi.getRiskOverview(),
    staleTime: 5 * 60 * 1000,
    enabled: fastFailed,
    retry: 1,
  })

  const { data: modelMeta } = useQuery({
    queryKey: ['analysis', 'model-metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const { data: ariaStats } = useQuery({
    queryKey: ['aria', 'stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  const { data: ariaT1 } = useQuery({
    queryKey: ['aria', 'queue', 'spotlight'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const overview = fastDashboard?.overview ?? (riskOverviewFallback?.overview as FastDashboardData['overview'] | undefined)
  const sectorsRaw = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution ?? (riskOverviewFallback?.risk_distribution as FastDashboardData['risk_distribution'] | undefined)

  const bothSettled = !dashLoading && (!fastFailed || !fallbackLoading)
  const kpiLoading = !bothSettled || !overview

  const criticalHighValue = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter((d) => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
  }, [riskDist])

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // Enriched sector rows (unified source for chart + table)
  const sectorRows = useMemo(() => {
    if (!sectorsRaw) return []
    return sectorsRaw
      .map((s) => {
        const ct = s.total_contracts || 1
        const highCritPct = (((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct) * 100
        return {
          code: s.code,
          name: ts(s.code) || getSectorNameEN(s.code),
          contracts: s.total_contracts,
          totalValue: s.total_value_mxn || 0,
          avgRisk: s.avg_risk_score || 0,
          highCritPct,
        }
      })
  }, [sectorsRaw, ts])

  const marimekkoRows: SectorMarimekkoRow[] = useMemo(
    () =>
      sectorRows.map((s) => {
        const ct = s.contracts || 1
        const raw = sectorsRaw?.find((r) => r.code === s.code)
        const critPct = ((raw?.critical_risk_count ?? 0) / ct) * 100
        const highPct = ((raw?.high_risk_count ?? 0) / ct) * 100
        const medPct  = ((raw?.medium_risk_count ?? 0) / ct) * 100
        const lowPct  = Math.max(0, 100 - critPct - highPct - medPct)
        return {
          code: s.code,
          name: s.name,
          totalValue: s.totalValue,
          criticalPct: +critPct.toFixed(1),
          highPct:     +highPct.toFixed(1),
          mediumPct:   +medPct.toFixed(1),
          lowPct:      +lowPct.toFixed(1),
          color:       SECTOR_COLORS[s.code] ?? '#64748b',
          avgRisk:     s.avgRisk,
        }
      }),
    [sectorRows, sectorsRaw]
  )

  const sectorTableRows: SectorTableRow[] = useMemo(
    () => [...sectorRows].sort((a, b) => b.totalValue - a.totalValue),
    [sectorRows]
  )

  // SexenioStratum: map yearly_trends → SexenioYearRow[]
  const sexenioRows: SexenioYearRow[] = useMemo(() => {
    const trends = fastDashboard?.yearly_trends
    if (!trends?.length) return []
    return trends.map((t) => ({
      year:          t.year,
      value_mxn:     t.value_mxn ?? t.total_value ?? 0,
      avg_risk:      t.avg_risk ?? 0,
      high_risk_pct: t.high_risk_pct ?? 0,
      contracts:     t.contracts ?? 0,
    }))
  }, [fastDashboard?.yearly_trends])

  // ConcentrationConstellation: map risk_distribution → ConstellationRiskRow[]
  const constellationRows: ConstellationRiskRow[] = useMemo(() => {
    if (!riskDist) return []
    return riskDist
      .filter((d): d is typeof d & { risk_level: ConstellationRiskRow['level'] } =>
        ['critical', 'high', 'medium', 'low'].includes(d.risk_level)
      )
      .map((d) => ({
        level: d.risk_level as ConstellationRiskRow['level'],
        count: d.count,
        pct:   d.percentage,
      }))
  }, [riskDist])

  // ARIA tier data
  const latestRun = ariaStats?.latest_run
  const t1Count = ariaT1?.pagination?.total ?? latestRun?.tier1_count ?? 320
  const t2Count = latestRun?.tier2_count ?? 1234
  const t3Count = latestRun?.tier3_count ?? 5016
  const t4Count = latestRun?.tier4_count ?? 311871
  const ariaTotal = ariaStats?.queue_total ?? (t1Count + t2Count + t3Count + t4Count)
  const ariaElevatedValue = ariaStats?.elevated_value_mxn ?? 0

  const topVendor = ariaT1?.data?.[0] as AriaQueueItem | undefined

  const modelAuc = modelMeta?.auc_test ?? 0.828
  const modelVersion = modelMeta?.version === 'v6.5' ? 'v0.6.5' : (modelMeta?.version ?? CURRENT_MODEL_VERSION)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <EditorialPageShell
      kicker={t('editorial.kicker', 'RUBLI · INTELLIGENCE BRIEF')}
      headline={
        <>
          {t('editorial.headline', '{{value}} vendors require immediate investigation', {
            value: formatNumber(t1Count),
          })}
        </>
      }
      paragraph={t('editorial.subhead', {
        totalValue: formatCompactMXN(overview?.total_value_mxn ?? 0),
        riskValue: formatCompactMXN(criticalHighValue || ariaElevatedValue),
        contracts: formatNumber(overview?.total_contracts ?? 0),
        defaultValue: 'RUBLI analyzed {{contracts}} federal contracts worth {{totalValue}} (2002-2025). {{riskValue}} sits in contracts flagged high or critical risk — patterns consistent with documented corruption cases.',
      })}
      stats={[
        {
          value: kpiLoading ? '—' : formatNumber(t1Count),
          label: t('editorial.stripT1', 'T1 Critical'),
          color: RISK_COLORS.critical,
        },
        {
          value: kpiLoading ? '—' : formatCompactMXN(criticalHighValue || ariaElevatedValue),
          label: t('editorial.stripValue', 'at risk'),
          color: 'var(--color-accent)',
          sub: kpiLoading
            ? undefined
            : realUSDLabel(criticalHighValue || ariaElevatedValue, 2024, i18n.language) ?? undefined,
        },
        {
          value: `${(modelAuc * 100).toFixed(1)}%`,
          label: t('editorial.stripModel', 'AUC {{auc}}', { auc: modelAuc.toFixed(3) }),
        },
      ]}
      meta={
        <span className="flex items-center gap-2 text-[10px] font-mono text-text-muted/60">
          <span>{modelVersion}</span>
          {lastUpdated && (
            <>
              <span>·</span>
              <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
            </>
          )}
        </span>
      }
      loading={kpiLoading}
      severity="critical"
      className="max-w-7xl mx-auto px-4 py-6"
    >
      <div className="space-y-8">

      {/* ERROR BANNER */}
      {dashError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-risk-critical/30 bg-risk-critical/5">
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0" />
          <p className="text-sm text-risk-critical flex-1">
            {t('dashboardLoadError')}
          </p>
          <button
            onClick={() => void dashRefetch()}
            className="text-sm text-risk-critical underline hover:no-underline font-medium flex-shrink-0"
          >
            {tc('retry')}
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* ACT I — THE FIELD                                                */}
      {/* ================================================================ */}
      <Act number="I" label="THE FIELD">

        {/* Sexenio Stratum — 23-year horizontal timeline */}
        {sexenioRows.length > 0 && (
          <section className="surface-card p-5">
            <ErrorBoundary fallback={<SectionErrorFallback />}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-sm font-bold text-text-primary">
                  {t('editorial.sexenioTitle', '23 years of federal procurement')}
                </h3>
                <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider flex-shrink-0">
                  {t('editorial.sexenioRange', '2002–2025')}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                {t('editorial.sexenioSubtitle', 'Column height ∝ √(contract value). Warm fill = contracts at high or critical risk. Dashed line = OECD 15% ceiling. Presidential terms delineated.')}
              </p>
              <SexenioStratum rows={sexenioRows} />
            </ErrorBoundary>
          </section>
        )}

        {/* Concentration Constellation — risk dot field */}
        {constellationRows.length > 0 && overview && (
          <section className="surface-card p-5">
            <ErrorBoundary fallback={<SectionErrorFallback />}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-sm font-bold text-text-primary">
                  {t('editorial.constellationTitle', 'Risk concentration field')}
                </h3>
                <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider flex-shrink-0">
                  {formatNumber(overview.total_contracts)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                {constellationMode === 'sectors'
                  ? t('editorial.constellationSubtitleSectors', 'Cada punto representa un conjunto de contratos. Los críticos se agrupan en los 12 sectores federales — donde el dinero público se concentra.')
                  : constellationMode === 'sexenios'
                  ? t('editorial.constellationSubtitleSexenios', 'Cada punto representa un conjunto de contratos. Los críticos se distribuyen entre los 6 sexenios presidenciales — 23 años de contratación.')
                  : t('editorial.constellationSubtitle', 'Cada punto representa un conjunto de contratos. Los contratos críticos se auto-organizan en 7 patrones ARIA — las 7 arquitecturas de captura del Estado.')}
              </p>

              {/* Mode pillbox — PATRONES / SECTORES / SEXENIOS ──────────── */}
              <div
                role="tablist"
                aria-label="Constellation clustering mode"
                className="inline-flex items-center gap-1 mb-4 rounded-full border border-border/40 bg-background-elevated/40 p-0.5"
              >
                {([
                  { key: 'patterns', label: 'PATRONES' },
                  { key: 'sectors',  label: 'SECTORES' },
                  { key: 'sexenios', label: 'SEXENIOS' },
                ] as const).map((opt) => {
                  const active = constellationMode === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setConstellationMode(opt.key)}
                      className={cn(
                        'text-[10px] font-mono font-bold tracking-[0.15em] px-3 py-1 rounded-full transition-colors',
                        active
                          ? 'bg-risk-critical/15 text-risk-critical border border-risk-critical/40 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.08)]'
                          : 'text-text-muted/70 border border-transparent hover:text-text-primary hover:bg-background-elevated/60'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              <ConcentrationConstellation
                rows={constellationRows}
                totalContracts={overview.total_contracts ?? 0}
                mode={constellationMode}
                onClusterClick={(code) => {
                  if (constellationMode === 'sectors') {
                    navigate(`/sectors/${code}`)
                  } else if (constellationMode === 'sexenios') {
                    navigate(`/stories/${code}`)
                  } else {
                    navigate(`/clusters#${code.toLowerCase()}`)
                  }
                }}
              />
            </ErrorBoundary>
          </section>
        )}

      </Act>

      {/* ================================================================ */}
      {/* ACT II — THE CONCENTRATION                                       */}
      {/* ================================================================ */}
      <Act number="II" label="THE CONCENTRATION">

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Marimekko sector spend × risk chart (~60%) */}
          <div className="surface-card lg:col-span-3 p-5">
            <ErrorBoundary fallback={<SectionErrorFallback />}>
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h3 className="text-sm font-bold text-text-primary">
                    {t('editorial.sectorChartTitle', 'Risk by sector')}
                  </h3>
                  <span className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider flex-shrink-0">
                    v0.6.5
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  {t('editorial.sectorChartSubtitle', 'Bar width = total contract value. Fill = risk composition. Sorted by spend.')}
                </p>
                {dashLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-[320px] w-full rounded" />
                  </div>
                ) : (
                  <SectorMarimekko
                    sectors={marimekkoRows}
                    onSectorClick={(code) => navigate(`/sectors/${code}`)}
                  />
                )}
                <p className="text-[10px] text-text-muted/50 font-mono mt-2 text-right">
                  {t('editorial.sectorChartSource', 'Source: RUBLI v0.6.5 · 3,051,294 contracts (2002-2025)')}
                </p>
              </div>
            </ErrorBoundary>
          </div>

          {/* Right: risk distribution geological strata (~40%) */}
          <div className="surface-card lg:col-span-2 p-5">
            <ErrorBoundary fallback={<SectionErrorFallback />}>
              {riskDist && overview ? (
                <RiskDistributionPanel data={riskDist} totalContracts={overview.total_contracts ?? 0} />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-[280px] w-full rounded" />
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>

      </Act>

      {/* ================================================================ */}
      {/* ACT III — THE QUEUE                                              */}
      {/* ================================================================ */}
      <Act number="III" label="THE QUEUE">

        {/* ARIA Tier Cards */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
              {t('editorial.tierKicker', 'ARIA QUEUE · {{total}} VENDORS', {
                total: formatNumber(ariaTotal),
              })}
            </p>
            <Link
              to="/aria"
              className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('editorial.viewQueue', 'View queue')}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TierCard
              tier="T1"
              label={t('editorial.riskCritical', 'Critical')}
              count={t1Count}
              color={RISK_COLORS.critical}
              action={t('editorial.t1Action', 'Immediate investigation')}
              onClick={() => navigate('/aria?tier=1')}
            />
            <TierCard
              tier="T2"
              label={t('editorial.riskHigh', 'High')}
              count={t2Count}
              color={RISK_COLORS.high}
              action={t('editorial.t2Action', 'Priority review')}
              onClick={() => navigate('/aria?tier=2')}
            />
            <TierCard
              tier="T3"
              label={t('editorial.riskMedium', 'Medium')}
              count={t3Count}
              color={RISK_COLORS.medium}
              action={t('editorial.t3Action', 'Active surveillance')}
              onClick={() => navigate('/aria?tier=3')}
            />
          </div>
        </div>

        {/* Top Priority Lead — vendor spotlight */}
        <ErrorBoundary fallback={null}>
          {topVendor && (
            <section
              className="rounded-lg p-5"
              style={{
                borderLeft: `3px solid var(--color-accent)`,
                border: '1px solid var(--color-border)',
                borderLeftWidth: '3px',
                borderLeftColor: 'var(--color-accent)',
                background: 'var(--color-accent-glow)',
              }}
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-1.5"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {t('editorial.spotlightKicker', 'PRIMARY INVESTIGATION TARGET')}
                  </p>
                  <p className="text-base font-bold text-text-primary mb-1">
                    {toTitleCase(topVendor.vendor_name)}
                  </p>
                  <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                    <span><span className="font-mono tabular-nums">{formatNumber(topVendor.total_contracts)}</span> {tc('contracts').toLowerCase()}</span>
                    <span className="text-text-muted/40">·</span>
                    <span className="font-mono">{formatCompactMXN(topVendor.total_value_mxn)}</span>
                    {topVendor.primary_sector_name && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span>{toTitleCase(topVendor.primary_sector_name)}</span>
                      </>
                    )}
                    {topVendor.primary_pattern && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/40 bg-border/10">
                          {topVendor.primary_pattern}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-5 flex-shrink-0">
                  <div className="text-right">
                    <div className="stat-lg font-mono" style={{ color: RISK_COLORS.critical }}>
                      {topVendor.ips_final.toFixed(3)}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">
                      {t('editorial.spotlightIps', 'IPS')}
                    </div>
                  </div>
                  <Link
                    to={`/vendors/${topVendor.vendor_id}`}
                    className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1 px-3 py-2 rounded border border-accent/40 hover:bg-accent/10 transition-colors"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {t('editorial.spotlightOpen', 'Open profile')}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </section>
          )}
        </ErrorBoundary>

      </Act>

      {/* ================================================================ */}
      {/* ACT IV — THE TWELVE                                              */}
      {/* ================================================================ */}
      <Act number="IV" label="THE TWELVE">

        <div>
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <SectorTable sectors={sectorTableRows} loading={dashLoading} />
          </ErrorBoundary>
          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded border border-border/30 bg-background-elevated/20">
            <Info className="h-3 w-3 text-text-muted/50 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-text-muted/60 leading-relaxed">
              {t('sectorChartDataQualityNote', 'Data quality varies by period: 2002–2010 contracts have 0.1% vendor RFC coverage (lowest quality) — sector averages for that era are directional estimates. Coverage improves to 15.7% (2010–2017), 30.3% (2018–2022), and 47.4% (2023–2025).')}
            </p>
          </div>
        </div>

      </Act>

      {/* ================================================================ */}
      {/* ACT V — THE PATTERNS                                              */}
      {/* ================================================================ */}
      <Act number="V" label="THE PATTERNS">

        {/* Presidential Fingerprints */}
        <section className="surface-card p-5">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="text-sm font-bold text-text-primary">
                {t('editorial.adminTitle', 'Perfil de riesgo por sexenio')}
              </h3>
              <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider flex-shrink-0">
                2001–2025
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
              {t(
                'editorial.adminSubtitle',
                'High-risk rate and direct award percentage for each presidential administration. AMLO era: 41.8% high-risk vs. Fox era 17.7%.'
              )}
            </p>
            <AdminFingerprints />
          </ErrorBoundary>
        </section>

        {/* Pattern Typology */}
        <section className="surface-card p-5">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="text-sm font-bold text-text-primary">
                {t('editorial.patternsTitle', 'Patrones de riesgo identificados')}
              </h3>
              <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider flex-shrink-0">
                v0.6.5
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
              {t(
                'editorial.patternsSubtitle',
                'Five procurement red flags across 3,051,294 contracts. Co-licitación alone flags 1.5M contracts — nearly half the entire dataset.'
              )}
            </p>
            <PatternTypology />
          </ErrorBoundary>
        </section>

      </Act>

      {/* ================================================================ */}
      {/* 6. COMPRANET CONTEXT — editorial callout                          */}
      {/* ================================================================ */}
      <section className="surface-card surface-card--elevated p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-text-muted flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
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
                className="text-xs flex items-center gap-1 ml-auto"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('compranetContextLink')} <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 7. QUICK LINKS / CTA                                              */}
      {/* ================================================================ */}
      <section>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          {t('startInvestigating')}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => navigate('/aria')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
            style={{ borderTopWidth: '3px', borderTopColor: RISK_COLORS.critical }}
          >
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4" style={{ color: RISK_COLORS.critical }} />
              <span className="text-sm font-bold text-text-primary">
                {t('ctaAria', 'Begin with Tier 1')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('ctaAriaDesc', {
                count: t1Count,
                defaultValue: '{{count}} vendors flagged critical by ARIA. Start here.',
              })}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('ctaAriaLink', 'Open ARIA queue')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>

          <button
            onClick={() => navigate('/sectors')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
            style={{ borderTopWidth: '3px', borderTopColor: 'var(--color-accent)' }}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-bold text-text-primary">
                {t('ctaSectors', 'Explore by Sector')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('ctaSectorsDesc', '12 federal sectors with risk profiles, concentration analysis, and vendor networks.')}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('ctaSectorsLink', 'View sectors')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>

          <button
            onClick={() => navigate('/contracts')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
            style={{ borderTopWidth: '3px', borderTopColor: '#818cf8' }}
          >
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" style={{ color: '#818cf8' }} />
              <span className="text-sm font-bold text-text-primary">
                {t('searchAnyContract')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('searchAnyContractDesc')}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('openContractSearch')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        </div>
      </section>

      {/* Footer source line */}
      <footer className="text-[10px] text-text-muted/40 font-mono text-center pb-4">
        RUBLI &middot; {formatNumber(overview?.total_contracts ?? 3051294)} {tc('contracts').toLowerCase()} &middot; 2002-2025 &middot; {modelVersion}
      </footer>

      </div>
    </EditorialPageShell>
  )
}

// ============================================================================
// Section error fallback
// ============================================================================

function SectionErrorFallback() {
  const { t } = useTranslation('dashboard')
  return (
    <div className="rounded-lg border border-border/30 p-4 text-center">
      <p className="text-xs text-text-muted">{t('sectionLoadError', 'This section could not be loaded.')}</p>
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
          <p className={cn('stat-md', color)}>{value}</p>
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
    value >= 0.60 ? 'bg-risk-critical/20 text-risk-critical border-risk-critical/30' :
    value >= 0.40 ? 'bg-risk-high/20 text-risk-high border-risk-high/30' :
    value >= 0.15 ? 'bg-risk-medium/20 text-risk-medium border-risk-medium/30' :
    'bg-risk-low/20 text-risk-low border-risk-low/30'
  return (
    <span className={cn('text-xs font-bold tabular-nums font-mono px-1.5 py-0.5 rounded border', color)}>
      {pct}%
    </span>
  )
}

export default Dashboard
