/**
 * PriceIntelligence.tsx — Price Anomaly Analysis page
 *
 * Replaces the broken original page that depended on an empty price_hypotheses table.
 *
 * Primary data sources:
 *   GET /api/v1/analysis/price-anomalies?min_z=3&limit=50
 *   GET /api/v1/analysis/price-sector-baselines
 *   GET /api/v1/aria/queue (T1+T2, for vendor detail)
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { api, ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  Info,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STALE_TIME = 10 * 60 * 1000

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceAnomalyContract {
  contract_id: number
  vendor_name: string
  amount_mxn: number
  sector_id: number
  contract_year: number
  institution_name: string
  risk_score: number
  risk_level: string
  z_price_ratio: number
  z_price_volatility: number
}

interface PriceAnomalySectorItem {
  sector_id: number
  sector_name: string
  count: number
  total_value_mxn: number
  avg_z_score: number
}

interface PriceAnomalyResponse {
  summary: {
    total_outliers: number
    total_value_mxn: number
    avg_z_score: number
  }
  by_sector: PriceAnomalySectorItem[]
  data: PriceAnomalyContract[]
}


// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchPriceAnomalies(minZ = 3, limit = 50): Promise<PriceAnomalyResponse> {
  const { data } = await api.get<PriceAnomalyResponse>(
    `/analysis/price-anomalies?min_z=${minZ}&limit=${limit}`
  )
  return data
}


// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  loading,
  label,
  value,
  detail,
  accent,
}: {
  loading: boolean
  label: string
  value: string
  detail: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-7 w-32 mb-1" />
      ) : (
        <p
          className="text-xl font-bold tabular-nums"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
      )}
      <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{detail}</p>
    </div>
  )
}

// ─── How It Works Accordion ───────────────────────────────────────────────────

function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-background-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-text-muted" />
          ¿Cómo funciona la detección? / How does detection work?
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm text-text-muted space-y-3 border-t border-border pt-3">
          <p>
            <strong className="text-text-primary">Normalización por z-score:</strong> Cada contrato
            se compara con la media y desviación estándar de su sector y año. Un z-score alto
            indica que el precio es estadísticamente anómalo respecto a sus pares.{' '}
            <em>
              (Z-score normalization: each contract is compared to the mean and standard deviation
              of its sector and year baseline.)
            </em>
          </p>
          <p>
            <strong className="text-text-primary">price_ratio (z {'>'} 3):</strong> Monto del
            contrato dividido entre la mediana del sector, expresado en desviaciones estándar. Más
            de 3 SD sobre la media corresponde al 0.1% superior de la distribución.{' '}
            <em>
              (Contract amount vs sector median in standard deviations — beyond 3 SD is the top
              0.1% of the distribution.)
            </em>
          </p>
          <p>
            <strong className="text-text-primary">price_volatility:</strong> Varianza del monto
            entre contratos del mismo proveedor respecto a la norma del sector. Alta volatilidad
            sugiere precios inconsistentes o manipulación selectiva.{' '}
            <em>
              (Variance in contract amounts for the same vendor vs sector norm — signals selective
              pricing manipulation.)
            </em>
          </p>
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
          >
            Ver metodología completa / Full methodology
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Risk Score Badge ─────────────────────────────────────────────────────────

function RiskScoreBadge({ score }: { score: number }) {
  const level: 'critical' | 'high' | 'medium' | 'low' =
    score >= 0.6 ? 'critical' : score >= 0.4 ? 'high' : score >= 0.25 ? 'medium' : 'low'
  return <RiskLevelPill level={level} score={score} size="sm" showDot />
}

// ─── Contract Table ───────────────────────────────────────────────────────────

function ContractTable({
  contracts,
  loading,
  vendorMap,
}: {
  contracts: PriceAnomalyContract[]
  loading: boolean
  vendorMap: Map<string, number>
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!contracts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
        <AlertTriangle className="w-6 h-6" />
        <p className="text-sm">No se encontraron contratos con precios anómalos.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Proveedor / Vendor
            </th>
            <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted hidden sm:table-cell">
              Institución
            </th>
            <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Monto
            </th>
            <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted hidden md:table-cell">
              z-score
            </th>
            <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Riesgo
            </th>
            <th className="py-2 px-3 hidden lg:table-cell" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const vendorId = vendorMap.get(c.vendor_name.toLowerCase())
            return (
              <tr
                key={c.contract_id}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="py-2 px-3 font-medium text-text-primary max-w-[180px] truncate">
                  {vendorId ? (
                    <Link
                      to={`/vendors/${vendorId}`}
                      className="hover:underline text-primary"
                      title={c.vendor_name}
                    >
                      {c.vendor_name}
                    </Link>
                  ) : (
                    c.vendor_name
                  )}
                </td>
                <td className="py-2 px-3 text-text-muted max-w-[160px] truncate hidden sm:table-cell">
                  {c.institution_name}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-text-primary">
                  {formatCompactMXN(c.amount_mxn)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-orange-400 hidden md:table-cell">
                  +{c.z_price_ratio.toFixed(1)}σ
                </td>
                <td className="py-2 px-3">
                  <RiskScoreBadge score={c.risk_score} />
                </td>
                <td className="py-2 px-3 text-right hidden lg:table-cell">
                  {vendorId && (
                    <Link
                      to={`/vendors/${vendorId}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      aria-label={`Ver perfil de ${c.vendor_name}`}
                    >
                      Ver perfil
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sector Bar Chart ─────────────────────────────────────────────────────────

interface SectorBarDatum {
  name: string
  code: string
  count: number
  color: string
}

function SectorRiskChart({
  data,
  loading,
}: {
  data: SectorBarDatum[]
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-56 w-full" />
  }

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <RechartsTooltip
          contentStyle={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#f1f5f9' }}
          itemStyle={{ color: '#94a3b8' }}
          formatter={(value: number | undefined) => [
            value != null ? formatNumber(value) : '—',
            'Contratos anómalos',
          ]}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell key={entry.code} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PriceIntelligence() {
  const { t } = useTranslation('priceIntelligence')

  // Primary: price anomaly endpoint (contracts with z_price_ratio > 3)
  const anomalyQuery = useQuery({
    queryKey: ['analysis', 'price-anomalies', 3, 50],
    queryFn: () => fetchPriceAnomalies(3, 50),
    staleTime: STALE_TIME,
  })


  // ARIA queue T1+T2 — used to resolve vendor IDs for deep-link profile links
  const ariaT1Query = useQuery({
    queryKey: ['aria', 'queue', 'tier1', 100],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 100 }),
    staleTime: STALE_TIME,
  })

  const ariaT2Query = useQuery({
    queryKey: ['aria', 'queue', 'tier2', 200],
    queryFn: () => ariaApi.getQueue({ tier: 2, per_page: 200 }),
    staleTime: STALE_TIME,
  })

  // ── Build vendor name → ID map from ARIA for linking ──────────────────────

  const allAriaVendors: AriaQueueItem[] = [
    ...(ariaT1Query.data?.data ?? []),
    ...(ariaT2Query.data?.data ?? []),
  ]

  const vendorMap = new Map<string, number>()
  for (const v of allAriaVendors) {
    vendorMap.set(v.vendor_name.toLowerCase(), v.vendor_id)
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const summary = anomalyQuery.data?.summary
  const bySector = anomalyQuery.data?.by_sector ?? []
  const contracts = anomalyQuery.data?.data ?? []

  // Build chart data from by_sector, match to our SECTORS list for colors
  const chartData: SectorBarDatum[] = bySector
    .map((s) => {
      const sector = SECTORS.find(
        (sec) => sec.id === s.sector_id || sec.name === s.sector_name
      )
      const code = sector?.code ?? 'otros'
      return {
        name: sector?.name ?? s.sector_name,
        code,
        count: s.count,
        color: SECTOR_COLORS[code] ?? SECTOR_COLORS['otros'],
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topSectorName = chartData[0]?.name ?? '—'

  const loading = anomalyQuery.isLoading

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 mt-0.5">
          <TrendingUp className="w-5 h-5 text-orange-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {t('title', 'Análisis de Precios / Price Anomaly Analysis')}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {t(
              'subtitle',
              'El sobrevalor se detecta comparando cada contrato con la media estadística de su sector y año — contratos con z-score de precio mayor a 3σ sobre la norma sectorial. / Overpricing is detected via z-score normalization vs sector-year baseline (contracts with price z-score above 3σ).'
            )}
          </p>
        </div>
      </div>

      {/* ── Key Stats Bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          loading={loading}
          label={t('stats.anomalousContracts.label', 'Contratos con precio anómalo')}
          value={summary ? formatNumber(summary.total_outliers) : '—'}
          detail={t(
            'stats.anomalousContracts.detail',
            'Con z_price_ratio > 3σ sobre la media sectorial / z_price_ratio > 3σ above sector mean'
          )}
          accent="#f87171"
        />
        <StatCard
          loading={loading}
          label={t('stats.topSector.label', 'Sector más afectado')}
          value={topSectorName}
          detail={t(
            'stats.topSector.detail',
            'Mayor concentración de contratos con precio anómalo / Most anomalous contracts'
          )}
          accent={chartData[0]?.color}
        />
        <StatCard
          loading={loading}
          label={t('stats.valueAtRisk.label', 'Monto en contratos anómalos')}
          value={summary ? formatCompactMXN(summary.total_value_mxn) : '—'}
          detail={t(
            'stats.valueAtRisk.detail',
            'Valor acumulado de contratos con precio estadísticamente extremo / Total value in price-outlier contracts'
          )}
          accent="#fb923c"
        />
      </div>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract table — takes 2/3 width */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(
                  'contracts.title',
                  'Contratos con mayor z-score de precio / Highest Price Z-Score Contracts'
                )}
              </CardTitle>
              <CardDescription>
                {t(
                  'contracts.description',
                  'Contratos cuyo monto supera 3 desviaciones estándar sobre la media de su sector y año. Los nombres de proveedor son enlaces a su perfil completo cuando están disponibles. / Contracts priced 3+ standard deviations above their sector-year mean.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContractTable
                contracts={contracts}
                loading={loading}
                vendorMap={vendorMap}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sector chart — takes 1/3 width */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('chart.title', 'Contratos anómalos por sector / Anomalous Contracts by Sector')}
              </CardTitle>
              <CardDescription>
                {t(
                  'chart.description',
                  'Número de contratos con z_price_ratio > 3σ por sector / Contracts with z_price_ratio > 3σ per sector'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectorRiskChart data={chartData} loading={loading} />
            </CardContent>
          </Card>

          {summary && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
                  Z-score promedio / Avg z-score
                </p>
                <p className="text-2xl font-bold tabular-nums text-orange-400">
                  +{summary.avg_z_score.toFixed(1)}σ
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t(
                    'chart.avgZDetail',
                    'Desviaciones estándar sobre la media sectorial en contratos anómalos'
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <HowItWorks />
    </div>
  )
}
