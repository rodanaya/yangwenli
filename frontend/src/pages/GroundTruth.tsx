/**
 * Ground Truth War Room
 *
 * Validates the risk detection model against documented corruption cases.
 * Fetches live data from the API — no hardcoded constants.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import {
  Shield,
  Target,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  Crosshair,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  LabelList,
} from '@/components/charts'

// ============================================================================
// Types
// ============================================================================

interface PerCaseItem {
  case_name: string
  case_type: string
  sector_name: string | null
  estimated_fraud_mxn: number | null
  confidence_level: string | null
  vendors_matched: number
  total_contracts: number
  avg_risk_score: number
  detection_rate: number
  critical_rate: number
}

interface ValidationSummary {
  total_cases: number
  total_vendors: number
  vendors_matched: number
  cases: Array<{ estimated_fraud_mxn?: number | null }>
  last_validation_run?: { detection_rate?: number } | null
}

interface DetectionRateResult {
  model_version: string
  detection_rate: number
  high_plus_rate?: number
  critical_detection_rate?: number
}

interface DetectionRateResponse {
  results?: DetectionRateResult[]
}

// ============================================================================
// Helpers
// ============================================================================

type SortKey = keyof Pick<
  PerCaseItem,
  'case_name' | 'vendors_matched' | 'total_contracts' | 'detection_rate' | 'avg_risk_score' | 'estimated_fraud_mxn'
>

function scoreColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return RISK_COLORS[level]
}

function detectionBadgeVariant(rate: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (rate >= 0.9) return 'default'
  if (rate >= 0.5) return 'secondary'
  return 'destructive'
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-accent/10 p-2 shrink-0">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary truncate">{label}</p>
            <p className="text-xl font-bold text-text-primary font-mono">{value}</p>
            {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SortButton({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === currentKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
        active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
      )}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  )
}

function CasesTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function ModelComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs">
      <p className="font-semibold text-text-primary mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="font-mono text-text-primary">{(p.value * 100).toFixed(1)}%</span>
        </p>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function GroundTruth() {
  const { t } = useTranslation('common')

  // Sort state for cases table
  const [sortKey, setSortKey] = useState<SortKey>('total_contracts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  // Expanded row state
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const {
    data: perCaseData,
    isLoading: perCaseLoading,
    isError: perCaseError,
  } = useQuery({
    queryKey: ['perCaseDetection'],
    queryFn: () => analysisApi.getPerCaseDetection(),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['validationSummary'],
    queryFn: () => analysisApi.getValidationSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: detectionRateData,
    isLoading: detectionLoading,
  } = useQuery({
    queryKey: ['detectionRate'],
    queryFn: () => analysisApi.getDetectionRate(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: factorLiftData, isLoading: factorLiftLoading } = useQuery({
    queryKey: ['factorLift'],
    queryFn: () => analysisApi.getFactorLift(),
    staleTime: 30 * 60 * 1000,
  })

  // --------------------------------------------------------------------------
  // Derived values from summary
  // --------------------------------------------------------------------------

  const summary = summaryData as ValidationSummary | undefined
  const totalCases = summary?.total_cases ?? 0
  const vendorsMatched = summary?.vendors_matched ?? 0
  const totalFraud = useMemo(() => {
    if (!summary?.cases) return 0
    return summary.cases.reduce((sum: number, c) => sum + (c.estimated_fraud_mxn ?? 0), 0)
  }, [summary])

  // --------------------------------------------------------------------------
  // Sorted cases table data
  // --------------------------------------------------------------------------

  const cases: PerCaseItem[] = useMemo(() => {
    const raw = (perCaseData as { data?: PerCaseItem[] } | undefined)?.data ?? []
    return [...raw].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const an = Number(av)
      const bn = Number(bv)
      return sortDir === 'asc' ? an - bn : bn - an
    })
  }, [perCaseData, sortKey, sortDir])

  // --------------------------------------------------------------------------
  // Model comparison chart data
  // --------------------------------------------------------------------------

  const modelComparisonData = useMemo(() => {
    const results = (detectionRateData as DetectionRateResponse | undefined)?.results ?? []
    if (!results.length) return []

    // Group by model version; build one row per model with detection metrics
    return results.map((r) => ({
      model: r.model_version,
      'Detection (medium+)': r.detection_rate ?? 0,
      'High+ Rate': r.high_plus_rate ?? 0,
      'Critical Rate': r.critical_detection_rate ?? 0,
    }))
  }, [detectionRateData])

  // --------------------------------------------------------------------------
  // Sort handler
  // --------------------------------------------------------------------------

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // --------------------------------------------------------------------------
  // Overall loading / error state
  // --------------------------------------------------------------------------

  const isLoading = perCaseLoading || summaryLoading
  const isError = perCaseError || summaryError

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6 p-6">
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          Ground Truth War Room
          <Badge variant="outline" className="text-xs font-normal ml-1">
            {t('groundTruth.liveData')}
          </Badge>
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Documented corruption cases validate the risk detection model
        </p>
      </div>

      <SectionDescription variant="callout">
        This page measures RUBLI's detection capability against real, documented Mexican
        procurement corruption cases. Each case was independently investigated by journalists,
        auditors, or prosecutors. Our model never saw these labels during training — the
        detection rates shown here represent genuine out-of-sample predictive performance.
      </SectionDescription>

      {/* ================================================================== */}
      {/* Section A — Stat Cards                                             */}
      {/* ================================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-destructive p-4 rounded-md border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Failed to load summary data. Please try refreshing.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Shield}
            label="Ground Truth Cases"
            value={totalCases || '—'}
            sub="Documented corruption cases"
          />
          <StatCard
            icon={Crosshair}
            label="Vendors Matched"
            value={vendorsMatched || '—'}
            sub="In COMPRANET records"
          />
          <StatCard
            icon={FileText}
            label="Total Value at Risk"
            value={totalFraud > 0 ? formatCompactMXN(totalFraud) : '—'}
            sub="Estimated fraud across all cases"
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* Section B — Sortable Cases Table                                  */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" aria-hidden="true" />
            {t('groundTruth.caseName')} — Per-Case Detection
          </CardTitle>
          <CardDescription>
            Live detection rates computed from current risk scores. Click a row to expand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perCaseLoading ? (
            <CasesTableSkeleton />
          ) : perCaseError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>Failed to load case data.</span>
            </div>
          ) : cases.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No ground truth cases found in the database.
            </p>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Per-case detection table">
              <table className="w-full text-sm" aria-label="Ground truth cases detection rates">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4">
                      <SortButton
                        label={t('groundTruth.caseName')}
                        sortKey="case_name"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-left py-2 pr-4 hidden md:table-cell">
                      <span className="text-xs font-medium text-text-secondary">
                        {t('groundTruth.caseType')}
                      </span>
                    </th>
                    <th className="text-left py-2 pr-4 hidden lg:table-cell">
                      <span className="text-xs font-medium text-text-secondary">
                        {t('groundTruth.sector')}
                      </span>
                    </th>
                    <th className="text-right py-2 pr-4">
                      <SortButton
                        label={t('groundTruth.vendorsMatched')}
                        sortKey="vendors_matched"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 pr-4">
                      <SortButton
                        label={t('groundTruth.contracts')}
                        sortKey="total_contracts"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 pr-4">
                      <SortButton
                        label={t('groundTruth.detectionRate')}
                        sortKey="detection_rate"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 pr-4">
                      <SortButton
                        label={t('groundTruth.avgScore')}
                        sortKey="avg_risk_score"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="text-right py-2 hidden lg:table-cell">
                      <SortButton
                        label={t('groundTruth.estimatedFraud')}
                        sortKey="estimated_fraud_mxn"
                        currentKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const isExpanded = expandedRow === c.case_name
                    return (
                      <>
                        <tr
                          key={c.case_name}
                          className="border-b border-border/50 hover:bg-background-hover cursor-pointer transition-colors"
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : c.case_name)
                          }
                          aria-expanded={isExpanded}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setExpandedRow(isExpanded ? null : c.case_name)
                            }
                          }}
                        >
                          <td className="py-2.5 pr-4 font-medium text-text-primary">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 text-text-muted shrink-0" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
                              )}
                              <span className="truncate max-w-[180px]" title={c.case_name}>
                                {c.case_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 hidden md:table-cell text-text-secondary">
                            {c.case_type ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 hidden lg:table-cell text-text-secondary capitalize">
                            {c.sector_name ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-text-primary">
                            {c.vendors_matched}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-text-primary">
                            {formatNumber(c.total_contracts)}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {c.total_contracts > 0 ? (
                              <Badge variant={detectionBadgeVariant(c.detection_rate)}>
                                {(c.detection_rate * 100).toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {c.total_contracts > 0 ? (
                              <span
                                className="font-mono text-sm font-semibold"
                                style={{ color: scoreColor(c.avg_risk_score) }}
                              >
                                {(c.avg_risk_score * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right hidden lg:table-cell text-text-secondary font-mono text-xs">
                            {c.estimated_fraud_mxn != null
                              ? formatCompactMXN(c.estimated_fraud_mxn)
                              : '—'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr
                            key={`${c.case_name}-expanded`}
                            className="bg-background-hover/50"
                          >
                            <td colSpan={8} className="px-8 py-3 text-xs text-text-secondary">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                                <div>
                                  <span className="font-medium text-text-primary">Critical Rate: </span>
                                  <span style={{ color: RISK_COLORS.critical }}>
                                    {(c.critical_rate * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-text-primary">Confidence: </span>
                                  <span className="capitalize">{c.confidence_level ?? '—'}</span>
                                </div>
                                <div className="col-span-2 md:col-span-2">
                                  Matched via vendor RFC/name in{' '}
                                  <code className="text-xs bg-background-card px-1 rounded">
                                    ground_truth_vendors
                                  </code>{' '}
                                  table. Contracts join on{' '}
                                  <code className="text-xs bg-background-card px-1 rounded">
                                    vendor_id
                                  </code>
                                  .
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section C — Factor Lift vs Ground Truth                          */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-accent" aria-hidden="true" />
            Factor Lift vs Ground Truth
          </CardTitle>
          <CardDescription>
            How much more often each risk factor appears in documented corruption cases vs the general contract
            population. Lift &gt; 1.0 = over-represented in known-bad contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {factorLiftLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !factorLiftData?.factors.length ? (
            <p className="text-sm text-text-secondary text-center py-8">No factor lift data available.</p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={factorLiftData.factors.slice(0, 12).map((f) => ({
                    factor: f.factor.replace(/_/g, ' '),
                    lift: parseFloat(f.lift.toFixed(2)),
                    gt_rate: parseFloat((f.gt_rate * 100).toFixed(1)),
                    base_rate: parseFloat((f.base_rate * 100).toFixed(1)),
                  }))}
                  margin={{ top: 4, right: 60, left: 100, bottom: 4 }}
                  aria-label="Factor lift horizontal bar chart"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(v: number) => `${v}×`}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="factor"
                    width={96}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-background-card p-3 shadow-lg text-xs space-y-1">
                          <p className="font-semibold text-text-primary capitalize">{d.factor}</p>
                          <p className="text-text-secondary">
                            Lift: <span className="font-mono text-accent">{d.lift}×</span>
                          </p>
                          <p className="text-text-secondary">
                            GT rate: <span className="font-mono">{d.gt_rate}%</span>
                          </p>
                          <p className="text-text-secondary">
                            Base rate: <span className="font-mono">{d.base_rate}%</span>
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="lift" name="Lift" radius={[0, 3, 3, 0]} maxBarSize={18}>
                    {factorLiftData.factors.slice(0, 12).map((f) => (
                      <Cell
                        key={f.factor}
                        fill={f.lift >= 3 ? RISK_COLORS.critical : f.lift >= 2 ? RISK_COLORS.high : f.lift >= 1.5 ? RISK_COLORS.medium : RISK_COLORS.low}
                        fillOpacity={0.85}
                      />
                    ))}
                    <LabelList
                      dataKey="lift"
                      position="right"
                      formatter={(v: number) => `${v}×`}
                      style={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section D — Model Comparison Bar Chart                            */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
            {t('groundTruth.modelComparison')}
          </CardTitle>
          <CardDescription>
            Detection rate comparison across model versions (v3.3, v4.0, v5.0).
            High+ = score ≥ 0.30, Critical = score ≥ 0.50.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detectionLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : modelComparisonData.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No model comparison data available. Run validate_risk_model.py to generate results.
            </p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={modelComparisonData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  aria-label="Model comparison bar chart"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="model"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    domain={[0, 1]}
                  />
                  <RechartsTooltip content={<ModelComparisonTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
                  />
                  <Bar
                    dataKey="Detection (medium+)"
                    fill={RISK_COLORS.medium}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="High+ Rate"
                    fill={RISK_COLORS.high}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Critical Rate"
                    fill={RISK_COLORS.critical}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
