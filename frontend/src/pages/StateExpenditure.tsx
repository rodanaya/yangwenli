/**
 * State Expenditure — Subnational Procurement Analysis
 *
 * Three levels:
 * L0: Summary strip (total contracts / value / vendors across all states)
 * L1: States grid/table with key metrics
 * L2: State detail (institutions, year trend, risk distribution, local vendors)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { subnationalApi } from '@/api/client'
import type {
  SubnationalStateSummary,
  SubnationalStateDetail,
  SubnationalVendor,
} from '@/api/types'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from '@/components/charts'
import {
  MapPin,
  ArrowLeft,
  AlertTriangle,
  Info,
  TrendingUp,
  Building2,
  Users,
  FileText,
  DollarSign,
  Shield,
} from 'lucide-react'

// ── Coverage banner ──────────────────────────────────────────────────────────
function CoverageBanner({ note }: { note: string }) {
  const { t } = useTranslation('subnational')
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <span className="font-semibold">{t('coverageLabel')}: </span>
        {note}
      </div>
    </div>
  )
}

// ── Risk pill ────────────────────────────────────────────────────────────────
function RiskBadge({ score }: { score: number }) {
  const level =
    score >= 0.5 ? 'critical' : score >= 0.3 ? 'high' : score >= 0.1 ? 'medium' : 'low'
  const color = RISK_COLORS[level]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {score.toFixed(3)}
    </span>
  )
}

// ── States list ──────────────────────────────────────────────────────────────
function StatesList() {
  const { t } = useTranslation('subnational')
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['subnational', 'states'],
    queryFn: () => subnationalApi.getStates(),
    staleTime: 15 * 60 * 1000,
  })

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

  const states = data.data

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('stats.totalContracts'), value: data.total_contracts.toLocaleString(), icon: FileText },
          { label: t('stats.totalValue'), value: formatCompactMXN(data.total_value_mxn), icon: DollarSign },
          { label: t('stats.vendors'), value: data.total_vendors.toLocaleString(), icon: Users },
          { label: t('stateCount', { count: states.length }), value: `${states.length}`, icon: MapPin },
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

      <CoverageBanner note={data.coverage_note} />

      {/* States table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('table.state')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('table.contracts')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('table.value')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('table.avgRisk')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">{t('table.institutions')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">{t('table.directAward')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">{t('table.singleBid')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {states.map((state) => (
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
    <tr
      className="cursor-pointer hover:bg-muted/40 transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-10 items-center justify-center rounded bg-muted text-xs font-mono font-semibold">
            {state.state_code}
          </span>
          <span className="font-medium">{state.state_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {state.contract_count.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatCompactMXN(state.total_value_mxn)}
      </td>
      <td className="px-4 py-3 text-right">
        <RiskBadge score={state.avg_risk_score} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
        {state.institution_count}
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {(state.direct_award_rate * 100).toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {(state.single_bid_rate * 100).toFixed(1)}%
      </td>
    </tr>
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
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
  const riskDist = d.risk_distribution
  const riskTotal = riskDist.critical + riskDist.high + riskDist.medium + riskDist.low

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
          { label: t('stats.totalContracts'), value: d.contract_count.toLocaleString(), icon: FileText },
          { label: t('stats.totalValue'), value: formatCompactMXN(d.total_value_mxn), icon: DollarSign },
          { label: t('stats.institutions'), value: d.institution_count.toLocaleString(), icon: Building2 },
          { label: t('stats.vendors'), value: d.vendor_count.toLocaleString(), icon: Users },
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

      <CoverageBanner note={d.coverage_note} />

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

        {/* Year trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('detail.yearTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.year_trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={d.year_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v: number) => formatCompactMXN(v)}
                    tick={{ fontSize: 10 }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCompactMXN(v), 'Value']}
                    labelFormatter={(l) => `Year: ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_value_mxn"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

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
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('detail.institution')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('detail.contracts')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('detail.value')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('detail.riskScore')}</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">{t('detail.directAwardRate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.top_institutions.map((inst) => (
                <tr key={inst.institution_id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 max-w-xs">
                    <span className="line-clamp-1 text-xs">{inst.institution_name}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">{inst.contract_count.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">{formatCompactMXN(inst.total_value_mxn)}</td>
                  <td className="px-4 py-2 text-right">
                    <RiskBadge score={inst.avg_risk_score} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
                    {(inst.direct_award_rate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
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
    return <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t('noData')}</p>
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t('vendors.vendor')}</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('vendors.contracts')}</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">{t('vendors.stateShare')}</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">{t('vendors.stateConcentration')}</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">{t('vendors.riskScore')}</th>
          <th className="px-4 py-2 text-center font-medium text-muted-foreground hidden sm:table-cell">{t('vendors.localDominant')}</th>
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
            <td className="px-4 py-2 text-right tabular-nums text-xs">{v.contract_count.toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
              {v.state_share_pct.toFixed(1)}%
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-xs hidden md:table-cell">
              {v.state_concentration_pct.toFixed(1)}%
            </td>
            <td className="px-4 py-2 text-right">
              <RiskBadge score={v.avg_risk_score} />
            </td>
            <td className="px-4 py-2 text-center hidden sm:table-cell">
              {v.is_local_dominant && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
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
