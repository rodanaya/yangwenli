/**
 * PriceIntelligence.tsx -- "Mercado en la Sombra"
 *
 * Editorial investigative page for price anomaly analysis.
 * NYT/FT dark-mode aesthetic, compelling data storytelling.
 *
 * Primary data source:
 *   GET /api/v1/analysis/price-anomalies?min_z=3&limit=50
 *
 * Backend response shape (verified):
 *   summary: { total_outliers, total_value_mxn, avg_z_score, max_z_score, threshold_applied }
 *   by_sector: [{ sector_id, outlier_count, total_mxn, avg_z }]
 *   data: [{ contract_id, vendor_name, vendor_id, amount_mxn, sector_id, contract_year,
 *             institution_name, risk_score, risk_level, z_price_ratio, z_price_volatility }]
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

interface PriceAnomalySectorItem {
  sector_id: number
  outlier_count: number
  total_mxn: number
  avg_z: number
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
    { timeout: 120_000 },
  )
  return data
}

// --- Sector lookup -----------------------------------------------------------

function getSectorName(sectorId: number): string {
  return SECTORS.find((s) => s.id === sectorId)?.name ?? 'Otros'
}

function getSectorCode(sectorId: number): string {
  return SECTORS.find((s) => s.id === sectorId)?.code ?? 'otros'
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
  if (loading) return <Skeleton className="h-56 w-full" />
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
              <div className="bg-zinc-900 border border-zinc-700 rounded-md text-xs p-3 min-w-[160px]">
                <p className="text-zinc-100 font-semibold mb-1">{label}</p>
                <p className="text-zinc-400 m-0">
                  {chartT('tableHeaderContracts')}: <strong className="text-orange-400">{formatNumber(d.count)}</strong>
                </p>
                <p className="text-zinc-400 m-0 mt-0.5">
                  {chartT('tableHeaderAmount')}: <strong className="text-zinc-100">{formatCompactMXN(d.totalValue)}</strong>
                </p>
                <p className="text-zinc-400 m-0 mt-0.5">
                  {chartT('statsAvgZ')}: <strong className="text-amber-400">+{(d.avgZ ?? 0).toFixed(1)}&sigma;</strong>
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} isAnimationActive>
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
      className="border border-zinc-700/60 rounded-lg bg-zinc-900/40 p-4 hover:border-orange-500/40 transition-colors"
      role="article"
      aria-label={t('cardAriaLabel', { vendorName: contract.vendor_name })}
    >
      {/* Top row: sector + year + risk */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
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
        <span className="text-sm text-zinc-500">
          {t('moreThan')}
        </span>
      </div>

      {/* Amount */}
      <p className="text-lg font-semibold text-zinc-100 tabular-nums mb-1">
        {formatCompactMXN(contract.amount_mxn)}
      </p>

      {/* Vendor */}
      <p className="text-sm text-zinc-300 truncate mb-0.5">
        {contract.vendor_id ? (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="hover:underline text-blue-400"
            title={contract.vendor_name}
          >
            {contract.vendor_name}
          </Link>
        ) : (
          contract.vendor_name
        )}
      </p>

      {/* Institution */}
      <p className="text-xs text-zinc-500 truncate mb-3">
        {contract.institution_name}
      </p>

      {/* Footer links */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-700/40">
        <Link
          to={`/contracts/${contract.contract_id}`}
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
          aria-label={`Ver detalle del contrato ${contract.contract_id}`}
        >
          {t('viewContract')}
          <ExternalLink className="w-3 h-3" />
        </Link>
        {contract.vendor_id && (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 hover:underline"
          >
            {t('vendorProfile')}
          </Link>
        )}
      </div>
    </article>
  )
}

// --- Repeat Offenders Table --------------------------------------------------

function ReincidentesSection({
  contracts,
  loading,
}: {
  contracts: PriceAnomalyContract[]
  loading: boolean
}) {
  const reincidentes = useMemo(() => {
    if (!contracts.length) return []
    const vendorMap = new Map<
      string,
      {
        vendor_id: number | null
        vendor_name: string
        years: Set<number>
        contracts: number
        total_value: number
        sector_id: number
        z_sum: number
      }
    >()

    for (const c of contracts) {
      if (c.vendor_id == null) continue
      const key = String(c.vendor_id)
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
      .sort((a, b) => b.total_value - a.total_value)
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
          className="text-lg font-bold text-zinc-100"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Proveedores con anomalias de precio recurrentes
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Identificados en multiples anos fiscales con precios significativamente superiores al mercado
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Proveedores reincidentes">
          <thead>
            <tr className="border-b border-zinc-700/60">
              <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Proveedor
              </th>
              <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Anos
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Contratos
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hidden sm:table-cell">
                Valor total
              </th>
              <th className="text-center py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hidden sm:table-cell">
                Sector
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Z-score prom
              </th>
            </tr>
          </thead>
          <tbody>
            {reincidentes.map((v, i) => {
              const sectorCode = getSectorCode(v.sector_id)
              const sectorColor = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS['otros']
              return (
                <tr
                  key={i}
                  className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-2 px-3 max-w-[200px]">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="text-xs font-medium text-zinc-200 hover:underline truncate block"
                    >
                      {v.vendor_name}
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {v.yearsList.map((yr) => {
                        const cls =
                          yr >= 2023
                            ? 'text-orange-300 bg-orange-500/15 border-orange-500/30'
                            : yr >= 2020
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30'
                        return (
                          <span
                            key={yr}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cls}`}
                          >
                            {yr}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-400 text-xs">
                    {v.contracts}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-400 text-xs hidden sm:table-cell">
                    {formatCompactMXN(v.total_value)}
                  </td>
                  <td className="py-2 px-3 text-center hidden sm:table-cell">
                    <span
                      className="inline-block text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                      style={{
                        color: sectorColor,
                        borderColor: `${sectorColor}44`,
                        backgroundColor: `${sectorColor}11`,
                      }}
                    >
                      {getSectorName(v.sector_id)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-orange-400 text-xs font-mono">
                    +{v.avg_z.toFixed(1)}&sigma;
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// --- Anomaly Timeline --------------------------------------------------------

function AnomalyTimelineSection({
  contracts,
  loading,
}: {
  contracts: PriceAnomalyContract[]
  loading: boolean
}) {
  const yearData = useMemo(() => {
    if (!contracts.length) return []
    const yearMap = new Map<number, { year: number; count: number; total_z: number; total_value: number }>()
    for (const c of contracts) {
      const yr = c.contract_year
      if (yr < 2015 || yr > 2025) continue
      const existing = yearMap.get(yr)
      if (existing) {
        existing.count++
        existing.total_z += c.z_price_ratio ?? 0
        existing.total_value += c.amount_mxn
      } else {
        yearMap.set(yr, { year: yr, count: 1, total_z: c.z_price_ratio ?? 0, total_value: c.amount_mxn })
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
          RUBLI &middot; Evolucion temporal
        </p>
        <h2
          className="text-lg font-bold text-zinc-100"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Contratos con precio anomalo por ano (2015-2025)
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
              const d = payload[0]?.payload as
                | { year: number; count: number; avg_z: number; total_value: number }
                | undefined
              if (!d) return null
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs">
                  <p className="text-white font-semibold">{d.year}</p>
                  <p className="text-zinc-400">
                    Anomalias: <span className="text-orange-400 font-bold">{d.count}</span>
                  </p>
                  <p className="text-zinc-400">
                    Valor: <span className="text-zinc-200">{formatCompactMXN(d.total_value)}</span>
                  </p>
                  <p className="text-zinc-400">
                    Z-score prom: <span className="text-amber-400">+{d.avg_z.toFixed(1)}&sigma;</span>
                  </p>
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

// --- Methodology Accordion ---------------------------------------------------

function MethodologySection({ t }: { t: (key: string) => string }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="border-t border-zinc-700/50 py-6" aria-label={t('methodologyAriaLabel')}>
      <button
        className="w-full flex items-center justify-between text-left group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          <span className="text-xs uppercase tracking-[0.15em] font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">
            {t('methodologyLabel')}
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-zinc-400 leading-relaxed max-w-3xl">
          <p>
            <strong className="text-zinc-200">{t('methodologyPara1Title')}</strong> {t('methodologyPara1')}
          </p>
          <p>
            <strong className="text-zinc-200">{t('methodologyPara2Title')}</strong> {t('methodologyPara2')}
          </p>
          <p>
            <strong className="text-zinc-200">{t('methodologyPara3Title')}</strong> {t('methodologyPara3')}
          </p>
          <p className="text-xs text-zinc-600 italic">{t('methodologyDisclaimer')}</p>
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1 text-blue-400 hover:underline text-xs"
          >
            {t('viewFullMethodology')}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function PriceIntelligence() {
  const { t } = useTranslation('price')

  // Z-score threshold slider
  const [zThreshold, setZThreshold] = useState(3.0)

  // Sector filter chips
  const [activeSectorId, setActiveSectorId] = useState<number | null>(null)

  // Primary query
  const anomalyQuery = useQuery({
    queryKey: ['analysis', 'price-anomalies', zThreshold, 50],
    queryFn: () => fetchPriceAnomalies(zThreshold, 50),
    staleTime: STALE_TIME,
  })

  const summary = anomalyQuery.data?.summary
  const bySector = anomalyQuery.data?.by_sector ?? []
  const allContracts = anomalyQuery.data?.data ?? []

  // Apply sector filter
  const contracts = activeSectorId != null
    ? allContracts.filter((c) => c.sector_id === activeSectorId)
    : allContracts

  // Chart data from by_sector
  const chartData: SectorBarDatum[] = bySector
    .filter((s) => s.outlier_count > 0)
    .map((s) => {
      const sector = SECTORS.find((sec) => sec.id === s.sector_id)
      const code = sector?.code ?? 'otros'
      return {
        name: sector?.name ?? `Sector ${s.sector_id}`,
        code,
        count: s.outlier_count,
        color: SECTOR_COLORS[code] ?? SECTOR_COLORS['otros'],
        avgZ: s.avg_z,
        totalValue: s.total_mxn,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const loading = anomalyQuery.isLoading

  // Top 10 extreme cases
  const extremeCases = [...contracts]
    .sort((a, b) => (b.z_price_ratio ?? 0) - (a.z_price_ratio ?? 0))
    .slice(0, 10)

  // Top sector for KPI
  const topSector = chartData.length > 0 ? chartData[0] : null

  // Show computed sections only if enough data
  const showComputedSections = allContracts.length >= 3

  // --- Error state ---
  if (anomalyQuery.isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 p-6 text-zinc-400 border border-zinc-700/60 rounded-lg bg-zinc-900/40">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">COMPRANET: datos no disponibles</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t('errorMessage')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* ================================================================== */}
      {/* SECTION 1: Hero Lede + KPI Strip                                   */}
      {/* ================================================================== */}

      <header>
        {/* Overline */}
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
          RUBLI &middot; Inteligencia de precios
        </p>

        {/* Page title */}
        <h1
          className="text-2xl md:text-3xl font-bold text-zinc-100 leading-tight mb-1"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Mercado en la Sombra
        </h1>
        <p className="text-sm text-zinc-500 mb-4">
          Contratos adjudicados a precios estadisticamente anomalos
        </p>

        {/* Source pills */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
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

        {/* Hero lede */}
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : summary ? (
          (() => {
            const avgZ = summary.avg_z_score || 3
            const estimatedSavings = avgZ > 1 ? summary.total_value_mxn * (1 - 1 / avgZ) : 0
            const estimatedOverpayPct = avgZ > 1 ? (1 - 1 / avgZ) * 100 : 0

            return (
              <div className="space-y-5">
                <p
                  className="text-base md:text-lg text-zinc-200 leading-relaxed max-w-3xl"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  <strong className="text-orange-400">{formatNumber(summary.total_outliers)}</strong> contratos
                  federales, por un monto de{' '}
                  <strong className="text-red-400">{formatCompactMXN(summary.total_value_mxn)}</strong>, fueron
                  adjudicados a precios estadisticamente anomalos &mdash; definidos como aquellos{' '}
                  <strong className="text-amber-400">
                    {avgZ.toFixed(1)} desviaciones estandar
                  </strong>{' '}
                  por encima del precio de mercado en su sector.
                </p>

                {/* 5-KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* 1. Total contracts */}
                  <div className="border-l-2 border-orange-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-orange-400 tabular-nums">
                      {formatNumber(summary.total_outliers)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Contratos anomalos
                    </div>
                  </div>

                  {/* 2. Value at risk */}
                  <div className="border-l-2 border-red-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-red-400 tabular-nums">
                      {formatCompactMXN(summary.total_value_mxn)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Valor en riesgo
                    </div>
                  </div>

                  {/* 3. Average z-score */}
                  <div className="border-l-2 border-amber-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
                      +{avgZ.toFixed(1)}&sigma;
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Desviacion promedio
                    </div>
                  </div>

                  {/* 4. Estimated overpricing */}
                  <div className="border-l-2 border-purple-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-purple-400 tabular-nums">
                      {formatCompactMXN(estimatedSavings)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Sobrevaloracion est.{' '}
                      <MetodologiaTooltip
                        title="Sobrevaloracion estimada"
                        body={`Calculo: valor_total x (1 - 1/z_promedio) = ${formatCompactMXN(summary.total_value_mxn)} x ${estimatedOverpayPct.toFixed(0)}%. Es una aproximacion estadistica, no un monto confirmado.`}
                        link="/methodology"
                      />
                    </div>
                  </div>

                  {/* 5. Top sector */}
                  <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: topSector?.color ?? '#71717a' }}>
                    <div
                      className="text-xl font-mono font-bold tabular-nums"
                      style={{ color: topSector?.color ?? '#71717a' }}
                    >
                      {topSector ? formatNumber(topSector.count) : '--'}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {topSector?.name ?? 'Sector mas afectado'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 p-6 text-center">
            <AlertTriangle className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              No se encontraron anomalias de precio con el umbral actual.
              Intente reducir el Z-score minimo.
            </p>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/* FILTER CONTROLS                                                     */}
      {/* ================================================================== */}
      <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-4 space-y-4">
        {/* Z-score slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="z-threshold-slider"
              className="text-xs font-semibold uppercase tracking-widest text-zinc-500"
            >
              Min Z-Score:{' '}
              <span className="text-orange-400 font-bold">{zThreshold.toFixed(1)}&sigma;</span>
            </label>
            <span className="text-xs text-zinc-600">{t('zThresholdHint')}</span>
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
          <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5 select-none">
            {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((v) => (
              <span key={v}>{v}&sigma;</span>
            ))}
          </div>
        </div>

        {/* Sector chips */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            {t('filterBySector')}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterAriaLabel')}>
            <button
              onClick={() => setActiveSectorId(null)}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                activeSectorId === null
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                  : 'border-zinc-600/50 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300',
              ].join(' ')}
              aria-pressed={activeSectorId === null}
            >
              {t('allSectors')}
            </button>
            {chartData.map((s) => {
              const sector = SECTORS.find((sec) => sec.code === s.code)
              if (!sector) return null
              const isActive = activeSectorId === sector.id
              return (
                <button
                  key={s.code}
                  onClick={() => setActiveSectorId(isActive ? null : sector.id)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                    isActive
                      ? 'border-current text-white'
                      : 'border-zinc-600/50 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                  style={
                    isActive ? { borderColor: s.color, backgroundColor: `${s.color}22`, color: s.color } : {}
                  }
                  aria-pressed={isActive}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: Sector Breakdown                                        */}
      {/* ================================================================== */}
      <section aria-label="Comparacion por sector">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            RUBLI &middot; Distribucion sectorial
          </p>
          <h2
            className="text-xl font-bold text-zinc-100 mb-1"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('sectorMapTitle')}
          </h2>
          <p className="text-sm text-zinc-500 mb-4">{t('sectorMapDesc')}</p>

          <SectorRiskChart data={chartData} loading={loading} chartT={t} />

          {/* Sector detail table */}
          {!loading && chartData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm" aria-label={t('tableAriaLabel')}>
                <thead>
                  <tr className="border-b border-zinc-700/60">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {t('tableHeaderSector')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {t('tableHeaderContracts')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hidden sm:table-cell">
                      {t('tableHeaderAmount')}
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {t('tableHeaderAvgZ')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((s) => (
                    <tr key={s.code} className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-2 px-3 font-medium text-zinc-200">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: s.color }}
                          aria-hidden="true"
                        />
                        {s.name}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                        {formatNumber(s.count)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400 hidden sm:table-cell">
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

      {/* ================================================================== */}
      {/* SECTION 3: Extreme Cases                                           */}
      {/* ================================================================== */}
      <section aria-label={t('extremeCasesAriaLabel')}>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            RUBLI &middot; Casos extremos
          </p>
          <h2
            className="text-xl font-bold text-zinc-100"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('topAnomaliesTitle')}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{t('extremeCasesSubtitle')}</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : extremeCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm">{t('noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extremeCases.map((c) => (
              <ExtremeCaseCard key={c.contract_id} contract={c} sectorName={getSectorName(c.sector_id)} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* SECTION 4: Repeat Offenders (only if >= 3 records)                 */}
      {/* ================================================================== */}
      {showComputedSections && <ReincidentesSection contracts={allContracts} loading={loading} />}

      {/* ================================================================== */}
      {/* SECTION 5: Anomaly Timeline (only if >= 3 records)                 */}
      {/* ================================================================== */}
      {showComputedSections && <AnomalyTimelineSection contracts={allContracts} loading={loading} />}

      {/* ================================================================== */}
      {/* HALLAZGO callout                                                   */}
      {/* ================================================================== */}
      {summary && summary.total_value_mxn > 0 && (() => {
        const avgZ = summary.avg_z_score || 3
        const savings = avgZ > 1 ? summary.total_value_mxn * (1 - 1 / avgZ) : 0
        return (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
              HALLAZGO
            </p>
            <p className="text-sm text-zinc-200">
              De los {formatNumber(summary.total_outliers)} contratos anomalos detectados, el
              sobreprecio estimado asciende a{' '}
              <strong className="text-amber-300">{formatCompactMXN(savings)}</strong>. Esto equivale
              al presupuesto para{' '}
              <strong className="text-amber-300">
                {formatNumber(Math.round(savings / 160000))}
              </strong>{' '}
              becas universitarias anuales.
            </p>
          </div>
        )
      })()}

      {/* ================================================================== */}
      {/* See Also links                                                     */}
      {/* ================================================================== */}
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
        <Link
          to="/aria"
          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 hover:border-amber-500/60 rounded px-2.5 py-1 font-mono uppercase tracking-wide"
        >
          Cola de investigacion ARIA
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* ================================================================== */}
      {/* SECTION 7: Methodology                                             */}
      {/* ================================================================== */}
      <MethodologySection t={t} />
    </div>
  )
}
