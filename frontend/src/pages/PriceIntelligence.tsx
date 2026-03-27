/**
 * PriceIntelligence.tsx -- Editorial redesign
 *
 * NYT/FT investigative journalism aesthetic for price anomaly analysis.
 *
 * Primary data sources:
 *   GET /api/v1/analysis/price-anomalies?min_z=3&limit=50
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
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { api, ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
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

// --- API helpers -------------------------------------------------------------

async function fetchPriceAnomalies(minZ = 3, limit = 50): Promise<PriceAnomalyResponse> {
  const { data } = await api.get<PriceAnomalyResponse>(
    `/analysis/price-anomalies?min_z=${minZ}&limit=${limit}`
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
}: {
  data: SectorBarDatum[]
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-56 w-full" />
  }

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          width={100}
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
            value != null ? formatNumber(value) : '--',
            'Contratos anomalos',
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

// --- Extreme Case Card -------------------------------------------------------

function ExtremeCaseCard({
  contract,
  vendorId,
  sectorName,
}: {
  contract: PriceAnomalyContract
  vendorId: number | undefined
  sectorName: string
}) {
  const overpricingFactor = contract.z_price_ratio.toFixed(1)

  return (
    <article
      className="border border-border rounded-lg bg-background-card p-4 hover:border-orange-500/40 transition-colors"
      role="article"
      aria-label={`Anomalia de precio: ${contract.vendor_name}`}
    >
      {/* Top row: sector + year + risk */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {sectorName} &middot; {contract.contract_year}
        </span>
        <RiskScoreBadge score={contract.risk_score} />
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
          mas caro que la mediana sectorial
        </span>
      </div>

      {/* Amount */}
      <p className="text-lg font-semibold text-text-primary tabular-nums mb-1">
        {formatCompactMXN(contract.amount_mxn)}
      </p>

      {/* Vendor */}
      <p className="text-sm text-text-secondary truncate mb-0.5">
        {vendorId ? (
          <Link
            to={`/vendors/${vendorId}`}
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
          Ver contrato
          <ExternalLink className="w-3 h-3" />
        </Link>
        {vendorId && (
          <Link
            to={`/vendors/${vendorId}`}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary hover:underline"
          >
            Perfil del proveedor
          </Link>
        )}
      </div>
    </article>
  )
}

// --- Methodology Accordion ---------------------------------------------------

function MethodologySection() {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="border-t border-b border-border py-6"
      aria-label="Nota metodologica"
    >
      <button
        className="w-full flex items-center justify-between text-left group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-text-muted" aria-hidden="true" />
          <span className="text-xs uppercase tracking-[0.15em] font-semibold text-text-muted group-hover:text-text-primary transition-colors">
            Nota Metodologica
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
            <strong className="text-text-primary">Deteccion de precios anomalos.</strong>{' '}
            Cada contrato se compara con la distribucion de precios de su sector y
            ano utilizando z-scores. Un z-score de precio mayor a 3 significa que el
            monto supera 3 desviaciones estandar sobre la media sectorial, ubicandose
            en el 0.1% superior de la distribucion.
          </p>
          <p>
            <strong className="text-text-primary">Metodo IQR (Tukey):</strong>{' '}
            Complementariamente, el sistema utiliza el metodo de rango intercuartilico
            (IQR) para detectar valores atipicos. El umbral de alerta se establece en
            Q3 + 1.5 x IQR (valor atipico estadistico) y Q3 + 3.0 x IQR
            (sobrevaloracion extrema).
          </p>
          <p>
            <strong className="text-text-primary">price_volatility:</strong>{' '}
            Mide la varianza de los montos de un proveedor respecto a la norma del sector.
            Alta volatilidad sugiere precios inconsistentes o manipulacion selectiva.
            Es el predictor mas fuerte del modelo de riesgo v6.5 (coeficiente +0.53).
          </p>
          <p className="text-xs text-text-muted italic">
            Los scores de riesgo son indicadores estadisticos que miden similitud con
            patrones de corrupcion documentados. Un score alto no constituye prueba
            de irregularidad.
          </p>
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
          >
            Ver metodologia completa
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  )
}

// --- Main Page ---------------------------------------------------------------

export default function PriceIntelligence() {
  const { t } = useTranslation('common')

  // Primary: price anomaly endpoint (contracts with z_price_ratio > 3)
  const anomalyQuery = useQuery({
    queryKey: ['analysis', 'price-anomalies', 3, 50],
    queryFn: () => fetchPriceAnomalies(3, 50),
    staleTime: STALE_TIME,
  })

  // ARIA queue T1+T2 -- used to resolve vendor IDs for deep-link profile links
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

  // Build vendor name -> ID map from ARIA for linking
  const allAriaVendors: AriaQueueItem[] = [
    ...(ariaT1Query.data?.data ?? []),
    ...(ariaT2Query.data?.data ?? []),
  ]

  const vendorMap = new Map<string, number>()
  for (const v of allAriaVendors) {
    vendorMap.set(v.vendor_name.toLowerCase(), v.vendor_id)
  }

  // Derived stats
  const summary = anomalyQuery.data?.summary
  const bySector = anomalyQuery.data?.by_sector ?? []
  const contracts = anomalyQuery.data?.data ?? []

  // Build chart data from by_sector
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
        avgZ: s.avg_z_score,
        totalValue: s.total_value_mxn,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topSectorName = chartData[0]?.name ?? '--'
  const loading = anomalyQuery.isLoading

  // Top 10 extreme cases for the editorial cards
  const extremeCases = [...contracts]
    .sort((a, b) => b.z_price_ratio - a.z_price_ratio)
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
          <span>No se pudo cargar la informacion de precios. Intente de nuevo mas tarde.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">

      {/* === Editorial Headline === */}
      <EditorialHeadline
        section="INTELIGENCIA DE PRECIOS"
        headline="El Mercado Secreto: Precios que No Cuadran"
        subtitle="Cuando el gobierno paga 10 veces mas por el mismo producto, los datos lo revelan"
      />

      {/* === Source pill === */}
      <div className="flex items-center gap-2 flex-wrap">
        <FuentePill
          source="COMPRANET"
          count={summary?.total_outliers}
          countLabel="contratos anomalos"
        />
        <MetodologiaTooltip
          title="Deteccion de precios anomalos"
          body="Z-score de precio > 3 desviaciones estandar sobre la media sectorial. Metodo IQR (Tukey) complementario."
          link="/methodology"
        />
      </div>

      {/* === Lede paragraph === */}
      <div className="max-w-3xl">
        <p
          className="text-lg text-text-secondary leading-relaxed"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              El analisis estadistico de 3.05 millones de contratos revela que{' '}
              <strong className="text-text-primary">
                {summary ? formatNumber(summary.total_outliers) : '--'}
              </strong>{' '}
              fueron adquiridos a precios que superan 3 veces la mediana del mercado.
              En salud y tecnologia, los sobreprecios son mas frecuentes. El monto
              acumulado en estos contratos anomalos asciende a{' '}
              <strong className="text-text-primary">
                {summary ? formatCompactMXN(summary.total_value_mxn) : '--'}
              </strong>
              .
            </>
          )}
        </p>
      </div>

      {/* === 3 HallazgoStat stats === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <HallazgoStat
              value={summary ? formatNumber(summary.total_outliers) : '--'}
              label="contratos con precio anomalo detectados"
              annotation="z_price_ratio > 3 desviaciones estandar"
              color="border-orange-500"
            />
            <HallazgoStat
              value={summary ? formatCompactMXN(summary.total_value_mxn) : '--'}
              label="monto acumulado en sobreprecios"
              annotation="valor total de contratos estadisticamente extremos"
              color="border-red-500"
            />
            <HallazgoStat
              value={topSectorName}
              label="sector con mayor concentracion de sobreprecios"
              annotation={
                chartData[0]
                  ? `${formatNumber(chartData[0].count)} contratos anomalos`
                  : undefined
              }
              color="border-amber-500"
            />
          </>
        )}
      </div>

      {/* === Casos Mas Extremos === */}
      <section aria-label="Casos mas extremos de sobreprecios">
        <div className="mb-4">
          <h2
            className="text-xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            Casos Mas Extremos
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Los contratos con mayor desviacion respecto a la mediana de su sector y ano.
            Un factor de 8.3x significa que el gobierno pago 8.3 veces el precio tipico.
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
            <p className="text-sm">No se encontraron contratos con precios anomalos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extremeCases.map((c) => (
              <ExtremeCaseCard
                key={c.contract_id}
                contract={c}
                vendorId={vendorMap.get(c.vendor_name.toLowerCase())}
                sectorName={getSectorName(c.sector_id)}
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
            Sobreprecios por Sector
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Sectores con mayor numero de contratos cuyo precio excede 3 desviaciones
            estandar de la mediana. Los sectores de salud y tecnologia muestran
            patrones persistentes.
          </p>
          <SectorRiskChart data={chartData} loading={loading} />

          {/* Sector detail table */}
          {!loading && chartData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm" aria-label="Detalle de anomalias por sector">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Sector
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Contratos
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted hidden sm:table-cell">
                      Monto
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Z-score prom.
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
                        +{s.avgZ.toFixed(1)}&sigma;
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
        <section aria-label="Impacto humano del sobrecoste">
          <div className="max-w-3xl">
            <p
              className="text-base text-text-secondary leading-relaxed mb-3"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              En el sector salud, un sobrecoste sistematico en contratos de medicamentos
              y equipo medico significa que el gobierno podria haber comprado
              significativamente mas insumos con el mismo presupuesto. Este es el costo
              real de los sobreprecios:
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
              Z-score promedio
            </p>
            <p className="text-3xl font-bold tabular-nums text-orange-400">
              +{summary.avg_z_score.toFixed(1)}&sigma;
            </p>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Desviaciones estandar sobre la media sectorial en los contratos
            con precios anomalos detectados.{' '}
            {t('contracts', 'contratos')}:{' '}
            <span className="text-text-primary font-semibold tabular-nums">
              {formatNumber(summary.total_outliers)}
            </span>
          </p>
        </div>
      )}

      {/* === Methodology === */}
      <MethodologySection />
    </div>
  )
}
