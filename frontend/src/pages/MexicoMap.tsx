/**
 * MexicoMap — Mexico States Choropleth
 *
 * Shows procurement spending, average risk, or contract count per state
 * using ECharts map series with GeoJSON fetched from a public CDN.
 *
 * Fallback: if GeoJSON fails to load, shows a state list table.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { Map as MapIcon, AlertTriangle, DollarSign, Shield, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { subnationalApi } from '@/api/client'
import type { SubnationalStateSummary } from '@/api/types'
import { PageHeader } from '@/components/layout/PageHeader'

// ── State code → GeoJSON feature name mapping ─────────────────────────────────
// Keys must match the INEGI codes stored in institutions.state_code (backend).
// Values must match the 'name' property in public/mexico.geojson features exactly.
const STATE_NAME_MAP: Record<string, string> = {
  AGS:  'Aguascalientes',
  BC:   'Baja California',
  BCS:  'Baja California Sur',
  CAMP: 'Campeche',
  CHIS: 'Chiapas',
  CHIH: 'Chihuahua',
  CDMX: 'Ciudad de México',
  COAH: 'Coahuila',
  COL:  'Colima',
  DGO:  'Durango',
  GTO:  'Guanajuato',
  GRO:  'Guerrero',
  HGO:  'Hidalgo',
  JAL:  'Jalisco',
  MEX:  'México',
  MICH: 'Michoacán',
  MOR:  'Morelos',
  NAY:  'Nayarit',
  NL:   'Nuevo León',
  OAX:  'Oaxaca',
  PUE:  'Puebla',
  QRO:  'Querétaro',
  QROO: 'Quintana Roo',
  SLP:  'San Luis Potosí',
  SIN:  'Sinaloa',
  SON:  'Sonora',
  TAB:  'Tabasco',
  TAMPS:'Tamaulipas',
  TLAX: 'Tlaxcala',
  VER:  'Veracruz',
  YUC:  'Yucatán',
  ZAC:  'Zacatecas',
}

// Reverse map: state name → state code (for tooltip lookup)
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_MAP).map(([code, name]) => [name, code]),
)

type Metric = 'amount' | 'risk' | 'contracts'

const METRIC_CONFIG: Record<Metric, { label: string; colorRange: [string, string]; format: (v: number) => string }> = {
  amount: {
    label: 'Total Spending',
    colorRange: ['#eff6ff', '#1d4ed8'],
    format: (v) => formatCompactMXN(v),
  },
  risk: {
    label: 'Avg Risk Score',
    colorRange: ['#f0fdf4', '#dc2626'],
    format: (v) => v.toFixed(3),
  },
  contracts: {
    label: 'Contract Count',
    colorRange: ['#f5f3ff', '#7c3aed'],
    format: (v) => v.toLocaleString(),
  },
}

function getMetricValue(state: SubnationalStateSummary, metric: Metric): number {
  if (metric === 'amount') return state.total_value_mxn ?? 0
  if (metric === 'risk') return state.avg_risk_score ?? 0
  return state.contract_count ?? 0
}

// ── Fallback list when GeoJSON can't be loaded ────────────────────────────────
function StateFallbackList({
  states,
  metric,
  onStateClick,
}: {
  states: SubnationalStateSummary[]
  metric: Metric
  onStateClick: (code: string) => void
}) {
  const sorted = useMemo(
    () => [...states].sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)),
    [states, metric],
  )
  const fmt = METRIC_CONFIG[metric].format
  const maxVal = sorted[0] ? getMetricValue(sorted[0], metric) : 1

  return (
    <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
      {sorted.map((s) => {
        const val = getMetricValue(s, metric)
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
        const riskScore = s.avg_risk_score ?? 0
        const barColor =
          riskScore >= 0.5
            ? RISK_COLORS.critical
            : riskScore >= 0.3
            ? RISK_COLORS.high
            : riskScore >= 0.1
            ? RISK_COLORS.medium
            : RISK_COLORS.low

        return (
          <button
            key={s.state_code}
            className="w-full text-left group"
            onClick={() => onStateClick(s.state_code)}
            aria-label={`${s.state_name}: ${fmt(val)}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-muted-foreground w-8 shrink-0">{s.state_code}</span>
              <span className="text-xs font-medium group-hover:text-foreground truncate flex-1">{s.state_name}</span>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">{fmt(val)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0" />
              <div className="flex-1 h-[4px] rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: barColor, opacity: 0.8 }}
                />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main choropleth component ─────────────────────────────────────────────────
export default function MexicoMap() {
  const navigate = useNavigate()
  const [metric, setMetric] = useState<Metric>('amount')
  const [mapRegistered, setMapRegistered] = useState<boolean | null>(null) // null = loading

  // Register Mexico GeoJSON with ECharts
  useEffect(() => {
    fetch('/mexico.geojson')
      .then((r) => r.json())
      .then((geoJson) => {
        echarts.registerMap('Mexico', geoJson as Parameters<typeof echarts.registerMap>[1])
        setMapRegistered(true)
      })
      .catch(() => setMapRegistered(false))
  }, [])

  // Fetch subnational state data
  const { data, isLoading, error } = useQuery({
    queryKey: ['subnational', 'states'],
    queryFn: () => subnationalApi.getStates(),
    staleTime: 15 * 60 * 1000,
  })

  const states = data?.data ?? []

  // Build lookup map for tooltip
  const stateByCode = useMemo(() => {
    const m = new Map<string, SubnationalStateSummary>()
    states.forEach((s) => m.set(s.state_code, s))
    return m
  }, [states])

  // Also build lookup by display name (for ECharts click handler)
  const stateByName = useMemo(() => {
    const m = new Map<string, SubnationalStateSummary>()
    states.forEach((s) => {
      const displayName = STATE_NAME_MAP[s.state_code]
      if (displayName) m.set(displayName, s)
    })
    return m
  }, [states])

  // Compute max value for visualMap scaling
  const maxValue = useMemo(() => {
    if (states.length === 0) return 1
    return Math.max(...states.map((s) => getMetricValue(s, metric)), 1)
  }, [states, metric])

  const cfg = METRIC_CONFIG[metric]

  // Build ECharts option
  const option = useMemo(() => {
    if (!mapRegistered) return {}
    const seriesData = states.map((s) => ({
      name: STATE_NAME_MAP[s.state_code] ?? s.state_code,
      value: getMetricValue(s, metric),
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' },
        formatter: (params: { name: string; value: number }) => {
          const code = NAME_TO_CODE[params.name]
          const d = code ? stateByCode.get(code) : stateByName.get(params.name)
          if (!d)
            return `<strong>${params.name}</strong><br/>No data`
          const riskColor =
            (d.avg_risk_score ?? 0) >= 0.5
              ? RISK_COLORS.critical
              : (d.avg_risk_score ?? 0) >= 0.3
              ? RISK_COLORS.high
              : (d.avg_risk_score ?? 0) >= 0.1
              ? RISK_COLORS.medium
              : RISK_COLORS.low
          return [
            `<strong style="font-size:13px">${d.state_name} (${d.state_code})</strong>`,
            `<span style="color:#94a3b8">Spending: ${formatCompactMXN(d.total_value_mxn ?? 0)}</span>`,
            `<span style="color:${riskColor};font-weight:700">Avg Risk: ${(d.avg_risk_score ?? 0).toFixed(3)}</span>`,
            `<span style="color:#94a3b8">Contracts: ${(d.contract_count ?? 0).toLocaleString()}</span>`,
            `<span style="color:#64748b;font-size:10px">Click to drill down</span>`,
          ].join('<br/>')
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        inRange: { color: cfg.colorRange },
        text: ['High', 'Low'],
        calculable: true,
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 80,
        bottom: 20,
        left: 10,
      },
      series: [
        {
          type: 'map' as const,
          map: 'Mexico',
          roam: true,
          data: seriesData,
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: '#f59e0b', borderColor: '#d97706', borderWidth: 1.5 },
          },
          select: { disabled: true },
          itemStyle: {
            borderColor: '#1e293b',
            borderWidth: 0.8,
          },
        },
      ],
    }
  }, [mapRegistered, states, metric, maxValue, cfg, stateByCode, stateByName])

  const onEvents = useMemo(
    () => ({
      click: (params: unknown) => {
        const p = params as { name: string }
        if (!p?.name) return
        const code = NAME_TO_CODE[p.name]
        if (code) navigate(`/state-expenditure/${code}`)
      },
    }),
    [navigate],
  )

  const handleStateClick = useCallback(
    (code: string) => navigate(`/state-expenditure/${code}`),
    [navigate],
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Mexico Procurement Map"
        subtitle="Federal spending by state — click any state to drill down"
        icon={MapIcon}
      />

      {/* Metric selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Show:</span>
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <Button
            key={m}
            variant={metric === m ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setMetric(m)}
          >
            {m === 'amount' && <DollarSign className="h-3 w-3" />}
            {m === 'risk' && <Shield className="h-3 w-3" />}
            {m === 'contracts' && <FileText className="h-3 w-3" />}
            {METRIC_CONFIG[m].label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {cfg.label} by State
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading states */}
          {(isLoading || mapRegistered === null) && (
            <div className="space-y-3">
              <Skeleton className="h-[460px] w-full" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-center gap-2 py-8 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to load state data</span>
            </div>
          )}

          {/* Map or fallback */}
          {!isLoading && !error && mapRegistered === true && (
            <ReactECharts
              option={option}
              style={{ height: '460px', width: '100%' }}
              onEvents={onEvents}
            />
          )}

          {/* Fallback list when GeoJSON fails */}
          {!isLoading && !error && mapRegistered === false && states.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded px-3 py-2">
                Map could not be loaded. Showing data as a list instead.
              </p>
              <StateFallbackList states={states} metric={metric} onStateClick={handleStateClick} />
            </div>
          )}

          {/* Risk legend */}
          {!isLoading && !error && (
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk:</span>
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <div key={level} className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: RISK_COLORS[level] }} />
                  <span className="text-[10px] capitalize">{level}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary table below map */}
      {!isLoading && !error && states.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              All States — {cfg.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">State</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Contracts</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Total Spending</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Avg Risk</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs hidden sm:table-cell">
                      Direct Award
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...states]
                    .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric))
                    .map((s) => {
                      const riskScore = s.avg_risk_score ?? 0
                      const riskColor =
                        riskScore >= 0.5
                          ? RISK_COLORS.critical
                          : riskScore >= 0.3
                          ? RISK_COLORS.high
                          : riskScore >= 0.1
                          ? RISK_COLORS.medium
                          : RISK_COLORS.low
                      return (
                        <tr
                          key={s.state_code}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => navigate(`/state-expenditure/${s.state_code}`)}
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-9 items-center justify-center rounded bg-muted text-[10px] font-mono font-semibold">
                                {s.state_code}
                              </span>
                              <span className="text-xs font-medium">{s.state_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {(s.contract_count ?? 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">
                            {formatCompactMXN(s.total_value_mxn ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs">
                            <span
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ backgroundColor: riskColor }}
                            >
                              {riskScore.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs hidden sm:table-cell">
                            {((s.direct_award_rate ?? 0) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
