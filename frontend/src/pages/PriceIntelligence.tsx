/**
 * PriceIntelligence.tsx -- Editorial redesign
 *
 * NYT/FT investigative journalism aesthetic for price anomaly analysis.
 *
 * Primary data source:
 *   GET /api/v1/analysis/price-anomalies?min_z=3&limit=50
 *
 * Backend response shape (verified):
 *   summary: { total_outliers, total_value_mxn, avg_z_score, max_z_score, threshold_applied }
 *   by_sector: [{ sector_id, outlier_count, total_mxn, avg_z }]
 *   data: [{ contract_id, vendor_name, amount_mxn, sector_id, contract_year,
 *             institution_name, risk_score, risk_level, z_price_ratio,
 *             z_price_volatility, vendor_id }]
 */

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from '@/components/charts'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
// HallazgoStat removed — replaced by inline hero lede KPI strip
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { api } from '@/api/client'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  Info,
} from 'lucide-react'

// --- Constants ---------------------------------------------------------------

const STALE_TIME = 10 * 60 * 1000

// --- Types -------------------------------------------------------------------

interface PriceAnomalyContract {
  contract_id: number
  vendor_name: string
  vendor_id: number | null
  amount_mxn: number
  sector_id: number
  contract_year: number
  institution_name: string
  risk_score: number
  risk_level: string
  z_price_ratio: number
  z_price_volatility: number
}

// Exact field names returned by the backend /analysis/price-anomalies endpoint
interface PriceAnomalySectorItem {
  sector_id: number
  outlier_count: number     // backend key (NOT "count")
  total_mxn: number         // backend key (NOT "total_value_mxn")
  avg_z: number             // backend key (NOT "avg_z_score")
}

interface PriceAnomalyResponse {
  summary: {
    total_outliers: number
    total_value_mxn: number
    avg_z_score: number
    max_z_score?: number
    threshold_applied?: number
  }
  by_sector: PriceAnomalySectorItem[]
  data: PriceAnomalyContract[]
}

// --- API helpers -------------------------------------------------------------

async function fetchPriceAnomalies(minZ = 3, limit = 50): Promise<PriceAnomalyResponse> {
  const { data } = await api.get<PriceAnomalyResponse>(
    `/analysis/price-anomalies?min_z=${minZ}&limit=${limit}`,
    { timeout: 120_000 }  // cold-cache query can take 50s+; warmup covers most cases
  )
  return data
}

// --- Risk Score Badge --------------------------------------------------------

function RiskScoreBadge({ score }: { score: number }) {
  const level: 'critical' | 'high' | 'medium' | 'low' =
    score >= 0.6 ? 'critical' : score >= 0.4 ? 'high' : score >= 0.25 ? 'medium' : 'low'
  return <RiskLevelPill level={level} score={score} size="sm" showDot />
}

// --- Sector Bar Chart --------------------------------------------------------

interface SectorBarDatum {
  name: string
  code: string
  count: number
  color: string
  avgZ: number
  totalValue: number
}

function SectorRiskChart({
  data,
  loading,
  chartT,
}: {
  data: SectorBarDatum[]
  loading: boolean
  chartT: (key: string) => string
}) {
  if (loading) {
    return <Skeleton className="h-56 w-full" />
  }

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <RechartsTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload as SectorBarDatum | undefined
            if (!d) return null
            return (
              <div
                style={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  fontSize: '12px',
                  padding: '8px 12px',
                  minWidth: 160,
                }}
              >
                <p style={{ color: '#f4f4f5', fontWeight: 600, marginBottom: 4 }}>{label}</p>
                <p style={{ color: '#a1a1aa', margin: 0 }}>
                  {chartT('tableHeaderContracts')}: <strong style={{ color: '#fb923c' }}>{formatNumber(d.count)}</strong>
                </p>
                <p style={{ color: '#a1a1aa', margin: '2px 0 0' }}>
                  {chartT('tableHeaderAmount')}: <strong style={{ color: '#f4f4f5' }}>{formatCompactMXN(d.totalValue)}</strong>
                </p>
                <p style={{ color: '#a1a1aa', margin: '2px 0 0' }}>
                  {chartT('statsAvgZ')}: <strong style={{ color: '#fbbf24' }}>+{(d.avgZ ?? 0).toFixed(1)}&sigma;</strong>
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} isAnimationActive={true}>
          {data.map((entry) => (
            <Cell key={entry.code} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- Extreme Case Card -------------------------------------------------------

function ExtremeCaseCard({
  contract,
  sectorName,
  t,
}: {
  contract: PriceAnomalyContract
  sectorName: string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const overpricingFactor = (contract.z_price_ratio ?? 0).toFixed(1)

  return (
    <article
      className="border border-border rounded-lg bg-background-card p-4 hover:border-orange-500/40 transition-colors"
      role="article"
      aria-label={t('cardAriaLabel', { vendorName: contract.vendor_name })}
    >
      {/* Top row: sector + year + risk */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {sectorName} &middot; {contract.contract_year}
        </span>
        <RiskScoreBadge score={contract.risk_score ?? 0} />
      </div>

      {/* Overpricing factor -- hero number */}
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="text-3xl font-bold text-orange-400 tabular-nums"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {overpricingFactor}x
        </span>
        <span className="text-sm text-text-muted">
          {t('moreThan')}
        </span>
      </div>

      {/* Amount */}
      <p className="text-lg font-semibold text-text-primary tabular-nums mb-1">
        {formatCompactMXN(contract.amount_mxn)}
      </p>

      {/* Vendor */}
      <p className="text-sm text-text-secondary truncate mb-0.5">
        {contract.vendor_id ? (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="hover:underline text-primary"
            title={contract.vendor_name}
          >
            {contract.vendor_name}
          </Link>
        ) : (
          contract.vendor_name
        )}
      </p>

      {/* Institution */}
      <p className="text-xs text-text-muted truncate mb-3">
        {contract.institution_name}
      </p>

      {/* Footer link */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Link
          to={`/contracts/${contract.contract_id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label={`Ver detalle del contrato ${contract.contract_id}`}
        >
          {t('viewContract')}
          <ExternalLink className="w-3 h-3" />
        </Link>
        {contract.vendor_id && (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary hover:underline"
          >
            {t('vendorProfile')}
          </Link>
        )}
      </div>
    </article>
  )
}

// --- Methodology Accordion ---------------------------------------------------

function MethodologySection({ t }: { t: (key: string) => string }) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="border-t border-b border-border py-6"
      aria-label={t('methodologyAriaLabel')}
    >
      <button
        className="w-full flex items-center justify-between text-left group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-text-muted" aria-hidden="true" />
          <span className="text-xs uppercase tracking-[0.15em] font-semibold text-text-muted group-hover:text-text-primary transition-colors">
            {t('methodologyLabel')}
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-text-secondary leading-relaxed max-w-3xl">
          <p>
            <strong className="text-text-primary">{t('methodologyPara1Title')}</strong>{' '}
            {t('methodologyPara1')}
          </p>
          <p>
            <strong className="text-text-primary">{t('methodologyPara2Title')}</strong>{' '}
            {t('methodologyPara2')}
          </p>
          <p>
            <strong className="text-text-primary">{t('methodologyPara3Title')}</strong>{' '}
            {t('methodologyPara3')}
          </p>
          <p className="text-xs text-text-muted italic">
            {t('methodologyDisclaimer')}
          </p>
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
          >
            {t('viewFullMethodology')}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  )
}

// --- Reincidentes Section (repeat offenders) --------------------------------

function ReincidentesSection({ contracts, loading }: { contracts: PriceAnomalyContract[]; loading: boolean }) {
  const reincidentes = useMemo(() => {
    if (!contracts.length) return []
    // Group by vendor_id (or vendor_name fallback)
    const vendorMap = new Map<string, {
      vendor_id: number | null
      vendor_name: string
      years: Set<number>
      contracts: number
      total_value: number
      sector_id: number
      z_sum: number
    }>()

    for (const c of contracts) {
      const key = c.vendor_id != null ? String(c.vendor_id) : c.vendor_name
      const existing = vendorMap.get(key)
      if (existing) {
        existing.years.add(c.contract_year)
        existing.contracts++
        existing.total_value += c.amount_mxn
        existing.z_sum += c.z_price_ratio ?? 0
      } else {
        vendorMap.set(key, {
          vendor_id: c.vendor_id,
          vendor_name: c.vendor_name,
          years: new Set([c.contract_year]),
          contracts: 1,
          total_value: c.amount_mxn,
          sector_id: c.sector_id,
          z_sum: c.z_price_ratio ?? 0,
        })
      }
    }

    return [...vendorMap.values()]
      .filter((v) => v.years.size >= 2)
      .sort((a, b) => b.years.size - a.years.size || b.total_value - a.total_value)
      .slice(0, 8)
      .map((v) => ({
        ...v,
        avg_z: v.z_sum / v.contracts,
        yearsList: [...v.years].sort((a, b) => a - b),
      }))
  }, [contracts])

  if (loading) return <Skeleton className="h-48 w-full" />
  if (!reincidentes.length) return null

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
          RUBLI &middot; Patron de reincidencia
        </p>
        <h2
          className="text-lg font-bold text-text-primary"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Proveedores con anomalias de precio recurrentes
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Proveedores detectados en multiples anos con precios significativamente superiores al mercado
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Proveedores reincidentes">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Proveedor</th>
              <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Anos flaggeados</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Contratos</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted hidden sm:table-cell">Valor total</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Z-score prom</th>
            </tr>
          </thead>
          <tbody>
            {reincidentes.map((v, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 px-3 max-w-[200px]">
                  {v.vendor_id ? (
                    <Link to={`/vendors/${v.vendor_id}`} className="text-xs font-medium text-text-primary hover:underline truncate block">
                      {v.vendor_name}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-text-primary truncate block">{v.vendor_name}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {v.yearsList.map((yr) => {
                      const recency = yr >= 2023 ? 'text-orange-300 bg-orange-500/15 border-orange-500/30' : yr >= 2020 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30'
                      return (
                        <span key={yr} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${recency}`}>
                          {yr}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-text-secondary text-xs">{v.contracts}</td>
                <td className="py-2 px-3 text-right tabular-nums text-text-secondary text-xs hidden sm:table-cell">{formatCompactMXN(v.total_value)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-orange-400 text-xs font-mono">+{v.avg_z.toFixed(1)}&sigma;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// --- Anomaly Timeline Section -----------------------------------------------

function AnomalyTimelineSection({ contracts, loading }: { contracts: PriceAnomalyContract[]; loading: boolean }) {
  const yearData = useMemo(() => {
    if (!contracts.length) return []
    const yearMap = new Map<number, { year: number; count: number; total_z: number }>()
    for (const c of contracts) {
      const yr = c.contract_year
      if (yr < 2015 || yr > 2025) continue
      const existing = yearMap.get(yr)
      if (existing) {
        existing.count++
        existing.total_z += c.z_price_ratio ?? 0
      } else {
        yearMap.set(yr, { year: yr, count: 1, total_z: c.z_price_ratio ?? 0 })
      }
    }
    return [...yearMap.values()]
      .sort((a, b) => a.year - b.year)
      .map((d) => ({
        ...d,
        avg_z: d.count > 0 ? d.total_z / d.count : 0,
      }))
  }, [contracts])

  if (loading) return <Skeleton className="h-48 w-full" />
  if (!yearData.length) return null

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
          Evolucion temporal
        </p>
        <h2
          className="text-lg font-bold text-text-primary"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Anomalias de precio detectadas por ano
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={yearData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload as { year: number; count: number; avg_z: number } | undefined
              if (!d) return null
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs">
                  <p className="text-white font-semibold">{d.year}</p>
                  <p className="text-zinc-400">Anomalias: <span className="text-orange-400 font-bold">{d.count}</span></p>
                  <p className="text-zinc-400">Z-score prom: <span className="text-amber-400">+{d.avg_z.toFixed(1)}&sigma;</span></p>
                </div>
              )
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {yearData.map((entry) => (
              <Cell
                key={entry.year}
                fill={entry.avg_z > 5 ? '#f87171' : entry.avg_z > 3 ? '#fb923c' : '#fbbf24'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

// --- Main Page ---------------------------------------------------------------

export default function PriceIntelligence() {
  const { t } = useTranslation('price')

  // --- Z-score threshold slider state ---
  const [zThreshold, setZThreshold] = useState(3.0)

  // --- Sector filter chips state (null = all sectors) ---
  const [activeSectorId, setActiveSectorId] = useState<number | null>(null)

  // Primary: price anomaly endpoint — re-fetches when zThreshold changes
  const anomalyQuery = useQuery({
    queryKey: ['analysis', 'price-anomalies', zThreshold, 50],
    queryFn: () => fetchPriceAnomalies(zThreshold, 50),
    staleTime: STALE_TIME,
  })

  // Derived stats
  const summary = anomalyQuery.data?.summary
  const bySector = anomalyQuery.data?.by_sector ?? []
  const allContracts = anomalyQuery.data?.data ?? []

  // Apply sector filter chip
  const contracts = activeSectorId != null
    ? allContracts.filter((c) => c.sector_id === activeSectorId)
    : allContracts

  // Build chart data from by_sector — using actual backend field names
  const chartData: SectorBarDatum[] = bySector
    .map((s) => {
      const sector = SECTORS.find((sec) => sec.id === s.sector_id)
      const code = sector?.code ?? 'otros'
      return {
        name: sector?.name ?? `Sector ${s.sector_id}`,
        code,
        count: s.outlier_count,        // backend field: outlier_count
        color: SECTOR_COLORS[code] ?? SECTOR_COLORS['otros'],
        avgZ: s.avg_z,                 // backend field: avg_z
        totalValue: s.total_mxn,       // backend field: total_mxn
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const loading = anomalyQuery.isLoading

  // Top 10 extreme cases for the editorial cards — sorted by z_price_ratio
  const extremeCases = [...contracts]
    .sort((a, b) => (b.z_price_ratio ?? 0) - (a.z_price_ratio ?? 0))
    .slice(0, 10)

  // Sector name lookup helper
  function getSectorName(sectorId: number): string {
    const s = SECTORS.find((sec) => sec.id === sectorId)
    return s?.name ?? 'Otros'
  }

  // --- Error state ---
  if (anomalyQuery.isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 p-6 text-text-muted border border-border rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span>{t('errorMessage')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">

      {/* === Editorial Headline === */}
      <EditorialHeadline
        section={t('intelligenceLabel')}
        headline={t('headline')}
        subtitle={t('pageDesc')}
      />

      {/* === Source pill === */}
      <div className="flex items-center gap-2 flex-wrap">
        <FuentePill
          source="COMPRANET"
          count={summary?.total_outliers}
          countLabel={t('anomaliesDetected')}
        />
        <MetodologiaTooltip
          title={t('baselinesTitle')}
          body={t('baselinesDesc')}
          link="/methodology"
        />
      </div>

      {/* === Hero Lede — the finding, not the topic === */}
      <div className="max-w-3xl">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : summary ? (() => {
          const avgZ = summary.avg_z_score || 3
          const estimatedOverpayPct = avgZ > 1 ? ((1 - 1 / avgZ) * 100) : 0
          const estimatedSavings = summary.total_value_mxn * (1 - 1 / avgZ)
          return (
            <div className="space-y-4">
              <p
                className="text-lg text-text-primary leading-relaxed font-semibold"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {formatNumber(summary.total_outliers)} contratos por valor de {formatCompactMXN(summary.total_value_mxn)} fueron
                adjudicados a precios {avgZ.toFixed(1)} veces por encima del precio de mercado. De no haber ocurrido
                esta sobrevaloracion, el gobierno podria haber ahorrado {formatCompactMXN(estimatedSavings)}.
              </p>

              {/* 5-stat KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="border-l-2 border-orange-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-orange-400 tabular-nums">{formatNumber(summary.total_outliers)}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">contratos anomalos</div>
                </div>
                <div className="border-l-2 border-red-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-red-400 tabular-nums">{formatCompactMXN(summary.total_value_mxn)}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">valor en riesgo</div>
                </div>
                <div className="border-l-2 border-amber-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">+{avgZ.toFixed(1)}&sigma;</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">z-score promedio</div>
                </div>
                <div className="border-l-2 border-purple-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-purple-400 tabular-nums">+{(summary.max_z_score ?? 0).toFixed(1)}&sigma;</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">z-score maximo</div>
                </div>
                <div className="border-l-2 border-emerald-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">{formatCompactMXN(estimatedSavings)}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">ahorro potencial <span className="text-zinc-600">({estimatedOverpayPct.toFixed(0)}%)</span></div>
                </div>
              </div>
            </div>
          )
        })() : (
          <p className="text-lg text-text-secondary">No se encontraron anomalias de precio.</p>
        )}
      </div>

      {/* === Filter Controls === */}
      <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4 space-y-4">
        {/* Z-score threshold slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="z-threshold-slider"
              className="text-xs font-semibold uppercase tracking-widest text-text-muted"
            >
              Min Z-Score:{' '}
              <span className="text-orange-400 font-bold">{zThreshold.toFixed(1)}&sigma;</span>
            </label>
            <span className="text-xs text-text-muted">
              {t('zThresholdHint')}
            </span>
          </div>
          <input
            id="z-threshold-slider"
            type="range"
            min={1.5}
            max={5}
            step={0.5}
            value={zThreshold}
            onChange={(e) => setZThreshold(parseFloat(e.target.value))}
            className="w-full accent-orange-400 cursor-pointer"
            aria-label={t('zThresholdAriaLabel', { value: zThreshold })}
            aria-valuemin={1.5}
            aria-valuemax={5}
            aria-valuenow={zThreshold}
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-0.5 select-none">
            <span>1.5&sigma;</span>
            <span>2.0&sigma;</span>
            <span>2.5&sigma;</span>
            <span>3.0&sigma;</span>
            <span>3.5&sigma;</span>
            <span>4.0&sigma;</span>
            <span>4.5&sigma;</span>
            <span>5.0&sigma;</span>
          </div>
        </div>

        {/* Sector filter chips */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
            {t('filterBySector')}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterAriaLabel')}>
            <button
              onClick={() => setActiveSectorId(null)}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                activeSectorId === null
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                  : 'border-zinc-600/50 text-text-muted hover:border-zinc-500 hover:text-text-secondary',
              ].join(' ')}
              aria-pressed={activeSectorId === null}
            >
              {t('allSectors')}
            </button>
            {chartData.map((s) => (
              <button
                key={s.code}
                onClick={() => {
                  const sector = SECTORS.find((sec) => sec.code === s.code)
                  if (!sector) return
                  setActiveSectorId(activeSectorId === sector.id ? null : sector.id)
                }}
                className={[
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  activeSectorId === (SECTORS.find((sec) => sec.code === s.code)?.id ?? -1)
                    ? 'border-current text-white'
                    : 'border-zinc-600/50 text-text-muted hover:border-zinc-500 hover:text-text-secondary',
                ].join(' ')}
                style={
                  activeSectorId === (SECTORS.find((sec) => sec.code === s.code)?.id ?? -1)
                    ? { borderColor: s.color, backgroundColor: `${s.color}22`, color: s.color }
                    : {}
                }
                aria-pressed={activeSectorId === (SECTORS.find((sec) => sec.code === s.code)?.id ?? -1)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === Reincidentes — vendors flagged in multiple years === */}
      <ReincidentesSection contracts={allContracts} loading={loading} />

      {/* === Year-over-Year Anomaly Timeline === */}
      <AnomalyTimelineSection contracts={allContracts} loading={loading} />

      {/* === Casos Mas Extremos === */}
      <section aria-label={t('extremeCasesAriaLabel')}>
        <div className="mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('topAnomaliesTitle')}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {t('extremeCasesSubtitle')}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : extremeCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm">{t('noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extremeCases.map((c) => (
              <ExtremeCaseCard
                key={c.contract_id}
                contract={c}
                sectorName={getSectorName(c.sector_id)}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      {/* === Sector Comparison === */}
      <section aria-label="Comparacion por sector">
        <div className="border-t border-border pt-6">
          <h2
            className="text-xl font-bold text-text-primary mb-1"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('sectorMapTitle')}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {t('sectorMapDesc')}
          </p>
          {/* Summary Stats Bar */}
          {!loading && summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  {t('statsOutliers')}
                </p>
                <p className="text-xl font-bold tabular-nums text-orange-400">
                  {formatNumber(summary.total_outliers)}
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
              </div>
              <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  {t('statsValueAtRisk')}
                </p>
                <p className="text-xl font-bold tabular-nums text-red-400">
                  {formatCompactMXN(summary.total_value_mxn)}
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
              </div>
              <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  {t('statsAvgZ')}
                </p>
                <p className="text-xl font-bold tabular-nums text-amber-400">
                  +{(summary.avg_z_score ?? 0).toFixed(1)}&sigma;
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
              </div>
              <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                  {t('statsMaxZ')}
                </p>
                <p className="text-xl font-bold tabular-nums text-purple-400">
                  +{(summary.max_z_score ?? 0).toFixed(1)}&sigma;
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-purple-500" aria-hidden="true" />
              </div>
            </div>
          )}

          <SectorRiskChart data={chartData} loading={loading} chartT={t} />

          {/* Sector detail table */}
          {!loading && chartData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm" aria-label={t('tableAriaLabel')}>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('tableHeaderSector')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('tableHeaderContracts')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted hidden sm:table-cell">
                      {t('tableHeaderAmount')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('tableHeaderAvgZ')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((s) => (
                    <tr
                      key={s.code}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2 px-3 font-medium text-text-primary">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: s.color }}
                          aria-hidden="true"
                        />
                        {s.name}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-text-secondary">
                        {formatNumber(s.count)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-text-secondary hidden sm:table-cell">
                        {formatCompactMXN(s.totalValue)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-orange-400">
                        +{(s.avgZ ?? 0).toFixed(1)}&sigma;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* === Impacto Humano === */}
      {summary && summary.total_value_mxn > 0 && (
        <section aria-label={t('humanImpactLabel')}>
          <div className="max-w-3xl">
            <p
              className="text-base text-text-secondary leading-relaxed mb-3"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('humanImpactPara')}
            </p>
            <ImpactoHumano amountMxn={summary.total_value_mxn} />
          </div>
        </section>
      )}

      {/* === Average Z-Score card === */}
      {summary && (
        <div className="flex items-center gap-6 border border-border rounded-lg p-4 bg-background-card max-w-md">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
              {t('avgZLabel')}
            </p>
            <p className="text-3xl font-bold tabular-nums text-orange-400">
              +{(summary.avg_z_score ?? 0).toFixed(1)}&sigma;
            </p>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {t('avgZDesc')}{' '}
            <span className="text-text-primary font-semibold tabular-nums">
              {formatNumber(summary.total_outliers)}
            </span>
          </p>
        </div>
      )}

      {/* === See Also === */}
      <div className="flex items-center gap-3 py-3 border-t border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          {t('seeAlso')}
        </span>
        <Link
          to="/categories"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-700/60 hover:border-zinc-500 rounded px-2.5 py-1"
        >
          {t('spendingCategories')}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* === Methodology === */}
      <MethodologySection t={t} />
    </div>
  )
}
