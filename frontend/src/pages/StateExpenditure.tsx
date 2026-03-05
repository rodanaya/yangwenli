/**
 * State Expenditure — Subnational Procurement Analysis
 *
 * Three levels:
 * L0: Summary strip (total contracts / value / vendors across all states)
 * L1: States grid/table with key metrics + cross-state risk comparison bar chart
 * L2: State detail (institutions, year trend with risk overlay,
 *     top vendors by year, sector breakdown TODO, local vendors)
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { subnationalApi } from '@/api/client'
import type {
  SubnationalStateSummary,
  SubnationalVendor,
  SubnationalTopVendorsByYearResponse,
} from '@/api/types'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  Bar,
  BarChart,
} from '@/components/charts'
import {
  MapPin,
  ArrowLeft,
  AlertTriangle,
  Info,
  Building2,
  Users,
  FileText,
  DollarSign,
  Shield,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'

// ── Coverage banner ──────────────────────────────────────────────────────────
function CoverageBanner() {
  const { t } = useTranslation('subnational')
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <span className="font-semibold">{t('coverageLabel')}: </span>
        {t('coverageNote')}
      </div>
    </div>
  )
}

// ── Risk pill ────────────────────────────────────────────────────────────────
function RiskBadge({ score }: { score: number }) {
  const safeScore = score ?? 0
  const level =
    safeScore >= 0.5 ? 'critical' : safeScore >= 0.3 ? 'high' : safeScore >= 0.1 ? 'medium' : 'low'
  const color = RISK_COLORS[level]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {safeScore.toFixed(3)}
    </span>
  )
}

// ── Cross-state risk comparison bar chart ────────────────────────────────────
function RiskComparisonChart({ states }: { states: SubnationalStateSummary[] }) {
  const { t } = useTranslation('subnational')

  // Sort by avg_risk_score descending, take top 20 for readability
  const sorted = useMemo(
    () =>
      [...states]
        .sort((a, b) => (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
        .slice(0, 20),
    [states],
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('riskComparison')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 0.5]}
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={{ fontSize: 10 }}
            />
            <YAxis type="category" dataKey="state_code" tick={{ fontSize: 10 }} width={42} />
            <Tooltip
              formatter={(v: number | string | undefined) => [
                typeof v === 'number' ? v.toFixed(4) : v,
                t('stats.avgRisk'),
              ]}
              labelFormatter={(l: string) =>
                sorted.find((s) => s.state_code === l)?.state_name ?? l
              }
            />
            <Bar
              dataKey="avg_risk_score"
              name={t('stats.avgRisk')}
              fill="#fb923c"
              radius={[0, 2, 2, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Top 20 states by average risk score (descending). Click a state row in the table to drill
          down.
        </p>
      </CardContent>
    </Card>
  )
}

// ── States list ──────────────────────────────────────────────────────────────
function StatesList() {
  const { t } = useTranslation('subnational')
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<'value' | 'risk'>('value')

  const { data, isLoading, error } = useQuery({
    queryKey: ['subnational', 'states'],
    queryFn: () => subnationalApi.getStates(),
    staleTime: 15 * 60 * 1000,
  })

  const rawStates = data?.data ?? []

  const sortedStates = useMemo(() => {
    const copy = [...rawStates]
    if (sortBy === 'risk') {
      copy.sort((a, b) => (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
    } else {
      copy.sort((a, b) => (b.total_value_mxn ?? 0) - (a.total_value_mxn ?? 0))
    }
    return copy
  }, [rawStates, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>{t('noData')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: t('stats.totalContracts'),
            value: (data.total_contracts ?? 0).toLocaleString(),
            icon: FileText,
          },
          {
            label: t('stats.totalValue'),
            value: formatCompactMXN(data.total_value_mxn ?? 0),
            icon: DollarSign,
          },
          {
            label: t('stats.vendors'),
            value: (data.total_vendors ?? 0).toLocaleString(),
            icon: Users,
          },
          {
            label: t('stateCount', { count: rawStates.length }),
            value: `${rawStates.length}`,
            icon: MapPin,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.coverage_note && <CoverageBanner />}

      {/* Cross-state risk comparison bar chart */}
      <RiskComparisonChart states={rawStates} />

      {/* Sort controls + States table */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <Button
            variant={sortBy === 'value' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setSortBy('value')}
          >
            <ChevronDown className="h-3 w-3" />
            {t('sortByValue')}
          </Button>
          <Button
            variant={sortBy === 'risk' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setSortBy('risk')}
          >
            <ChevronDown className="h-3 w-3" />
            {t('sortByRisk')}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('table.state')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t('table.contracts')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t('table.value')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t('table.avgRisk')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">
                  {t('table.institutions')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                  {t('table.directAward')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                  {t('table.singleBid')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedStates.map((state) => (
                <StateRow
                  key={state.state_code}
                  state={state}
                  onClick={() => navigate(`/state-expenditure/${state.state_code}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StateRow({
  state,
  onClick,
}: {
  state: SubnationalStateSummary
  onClick: () => void
}) {
  return (
    <tr className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-10 items-center justify-center rounded bg-muted text-xs font-mono font-semibold">
            {state.state_code}
          </span>
          <span className="font-medium">{state.state_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {(state.contract_count ?? 0).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatCompactMXN(state.total_value_mxn ?? 0)}
      </td>
      <td className="px-4 py-3 text-right">
        <RiskBadge score={state.avg_risk_score ?? 0} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
        {state.institution_count ?? 0}
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {((state.direct_award_rate ?? 0) * 100).toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {((state.single_bid_rate ?? 0) * 100).toFixed(1)}%
      </td>
    </tr>
  )
}

// ── Top Vendors by Year section ───────────────────────────────────────────────
const AVAILABLE_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018] as const

function TopVendorsByYear({ code, stateName }: { code: string; stateName: string }) {
  const { t } = useTranslation('subnational')
  const navigate = useNavigate()
  const [selectedYear, setSelectedYear] = useState<number>(2024)

  const { data, isLoading, error } = useQuery<SubnationalTopVendorsByYearResponse>({
    queryKey: ['subnational', 'vendors-by-year', code, selectedYear],
    queryFn: () => subnationalApi.getStateVendorsByYear(code, selectedYear),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  // Backend /vendors endpoint returns `vendors` field in SubnationalTopVendorsByYearResponse.
  // Fall back gracefully to empty array.
  const vendors: SubnationalTopVendorsByYearResponse['vendors'] = data?.vendors ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('topVendorsThisYear')} — {stateName}
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('selectYear')}:</span>
            <div className="flex flex-wrap gap-1" role="group" aria-label={t('selectYear')}>
              {AVAILABLE_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`rounded px-2 py-0.5 text-xs font-mono transition-colors ${
                    selectedYear === y
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                  aria-pressed={selectedYear === y}
                  aria-label={`Select year ${y}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error || vendors.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t('noData')}</p>
        ) : (
          <table
            className="w-full text-sm"
            aria-label={`Top vendors in ${stateName} for ${selectedYear}`}
          >
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground w-10">
                  {t('rank')}
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  {t('vendorName')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('totalValue')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('contracts')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('riskScore')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.slice(0, 10).map((v, idx) => (
                <tr
                  key={v.vendor_id ?? idx}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/vendors/${v.vendor_id}`)
                  }}
                  role="row"
                  aria-label={`${v.vendor_name}, rank ${idx + 1}`}
                >
                  <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground w-10">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    <span className="line-clamp-1 text-xs font-medium">{v.vendor_name}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">
                    {formatCompactMXN(v.total_value_mxn ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">
                    {(v.contract_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <RiskBadge score={v.avg_risk_score ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

// ── State detail ─────────────────────────────────────────────────────────────
function StateDetail({ code }: { code: string }) {
  const { t } = useTranslation('subnational')
  const navigate = useNavigate()
  const [localOnly, setLocalOnly] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['subnational', 'states', code],
    queryFn: () => subnationalApi.getStateDetail(code),
    staleTime: 15 * 60 * 1000,
  })

  const vendorsQuery = useQuery({
    queryKey: ['subnational', 'vendors', code, localOnly],
    queryFn: () => subnationalApi.getStateVendors(code, localOnly),
    staleTime: 15 * 60 * 1000,
  })

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>{t('noData')}</span>
      </div>
    )
  }

  const d = detailQuery.data
  const riskDist = d.risk_distribution ?? { critical: 0, high: 0, medium: 0, low: 0 }
  const riskTotal =
    (riskDist.critical ?? 0) +
    (riskDist.high ?? 0) +
    (riskDist.medium ?? 0) +
    (riskDist.low ?? 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/state-expenditure')}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('detail.backToList')}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">{d.state_name}</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: t('stats.totalContracts'),
            value: (d.contract_count ?? 0).toLocaleString(),
            icon: FileText,
          },
          {
            label: t('stats.totalValue'),
            value: formatCompactMXN(d.total_value_mxn ?? 0),
            icon: DollarSign,
          },
          {
            label: t('stats.institutions'),
            value: (d.institution_count ?? 0).toLocaleString(),
            icon: Building2,
          },
          {
            label: t('stats.vendors'),
            value: (d.vendor_count ?? 0).toLocaleString(),
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {d.coverage_note && <CoverageBanner />}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Risk distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('detail.riskDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => {
                const count = riskDist[lvl]
                const pct = riskTotal > 0 ? (count / riskTotal) * 100 : 0
                return (
                  <div key={lvl} className="flex items-center gap-3">
                    <span className="w-16 text-xs capitalize text-muted-foreground">
                      {t(`riskLevels.${lvl}`)}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: RISK_COLORS[lvl] }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Year trend — spending line + risk trend line on secondary Y axis */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('detail.yearTrend')}
              </CardTitle>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="h-3 w-3" style={{ color: '#dc2626' }} />
                {t('riskTrend')}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {d.year_trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart
                  data={d.year_trend}
                  margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  {/* Left Y axis — spending value */}
                  <YAxis
                    yAxisId="value"
                    tickFormatter={(v: number) => formatCompactMXN(v)}
                    tick={{ fontSize: 10 }}
                    width={60}
                  />
                  {/* Right Y axis — avg risk score (0–0.6 covers all risk thresholds) */}
                  <YAxis
                    yAxisId="risk"
                    orientation="right"
                    domain={[0, 0.6]}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    tick={{ fontSize: 10, fill: '#dc2626' }}
                    width={36}
                  />
                  <Tooltip
                    formatter={(
                      v: number | string | undefined,
                      name: string | undefined,
                    ) => {
                      if (name === 'total_value_mxn') {
                        return [formatCompactMXN(Number(v ?? 0)), t('stats.totalValue')]
                      }
                      return [typeof v === 'number' ? v.toFixed(4) : v, t('riskTrend')]
                    }}
                    labelFormatter={(l) => `Year: ${l}`}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === 'total_value_mxn' ? t('stats.totalValue') : t('riskTrend')
                    }
                    wrapperStyle={{ fontSize: 10 }}
                  />
                  <Line
                    yAxisId="value"
                    type="monotone"
                    dataKey="total_value_mxn"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="total_value_mxn"
                  />
                  <Line
                    yAxisId="risk"
                    type="monotone"
                    dataKey="avg_risk_score"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                    name="avg_risk_score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
        TODO: Add GET /subnational/states/{code}/sectors endpoint to the backend.
        The endpoint should return sector breakdown for this state:
          [{ sector_code, sector_name, total_value_mxn, contract_count, pct_of_state_total }]
        Once implemented, replace this placeholder with a horizontal BarChart using SECTOR_COLORS.
      */}
      <Card className="border-dashed border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('spendingBySector')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Sector breakdown requires{' '}
            <code className="rounded bg-muted px-1 text-xs">
              GET /subnational/states/{'{code}'}/sectors
            </code>{' '}
            endpoint (not yet implemented).
          </p>
        </CardContent>
      </Card>

      {/* Top institutions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('detail.topInstitutions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  {t('detail.institution')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('detail.contracts')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('detail.value')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {t('detail.riskScore')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">
                  {t('detail.directAwardRate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.top_institutions.map((inst) => (
                <tr key={inst.institution_id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 max-w-xs">
                    <span className="line-clamp-1 text-xs">{inst.institution_name}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">
                    {(inst.contract_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">
                    {formatCompactMXN(inst.total_value_mxn ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <RiskBadge score={inst.avg_risk_score ?? 0} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
                    {((inst.direct_award_rate ?? 0) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top vendors by year — new analytical layer */}
      <TopVendorsByYear code={code} stateName={d.state_name} />

      {/* Local vendors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('vendors.title', { state: d.state_name })}
            </CardTitle>
            <Button
              variant={localOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLocalOnly(!localOnly)}
              className="gap-1.5 text-xs h-7"
            >
              <Shield className="h-3 w-3" />
              {t('vendors.filterLocal')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vendorsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <VendorsTable vendors={vendorsQuery.data?.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function VendorsTable({ vendors }: { vendors: SubnationalVendor[] }) {
  const { t } = useTranslation('subnational')
  const navigate = useNavigate()

  if (vendors.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t('noData')}</p>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
            {t('vendors.vendor')}
          </th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
            {t('vendors.contracts')}
          </th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">
            {t('vendors.stateShare')}
          </th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">
            {t('vendors.stateConcentration')}
          </th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
            {t('vendors.riskScore')}
          </th>
          <th className="px-4 py-2 text-center font-medium text-muted-foreground hidden sm:table-cell">
            {t('vendors.localDominant')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {vendors.map((v) => (
          <tr
            key={v.vendor_id}
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate(`/vendors/${v.vendor_id}`)}
          >
            <td className="px-4 py-2 max-w-xs">
              <span className="line-clamp-1 text-xs font-medium">{v.vendor_name}</span>
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-xs">
              {(v.contract_count ?? 0).toLocaleString()}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
              {(v.state_share_pct ?? 0).toFixed(1)}%
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-xs hidden md:table-cell">
              {(v.state_concentration_pct ?? 0).toFixed(1)}%
            </td>
            <td className="px-4 py-2 text-right">
              <RiskBadge score={v.avg_risk_score ?? 0} />
            </td>
            <td className="px-4 py-2 text-center hidden sm:table-cell">
              {v.is_local_dominant && (
                <Badge variant="critical" className="text-[10px] px-1.5 py-0">
                  {t('vendors.localDominant')}
                </Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Page entry point ─────────────────────────────────────────────────────────
export function StateExpenditure() {
  const { t } = useTranslation('subnational')
  const { code } = useParams<{ code?: string }>()

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page header */}
      {!code && (
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      )}

      {code ? <StateDetail code={code} /> : <StatesList />}
    </div>
  )
}

export default StateExpenditure
