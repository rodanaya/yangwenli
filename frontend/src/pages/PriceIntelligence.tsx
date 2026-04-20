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
import { TableExportButton } from '@/components/TableExportButton'
import { CitationBlock } from '@/components/CitationBlock'
import { ShareButton } from '@/components/ShareButton'
// Recharts removed — replaced with pure SVG field visualizations
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { api } from '@/api/client'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  Info,
  CheckCircle2,
  Flame,
  TrendingUp,
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

// Seeded RNG (Mulberry32) for deterministic dot placement
function _mul32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function SectorRiskChart({
  data,
  loading,
}: {
  data: SectorBarDatum[]
  loading: boolean
  chartT: (key: string) => string
}) {
  if (loading) return <Skeleton className="h-56 w-full" />
  if (!data.length) return null

  // Scale dots: max sector gets 40 dots, others proportional
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const ROW_H   = 28
  const ROW_GAP = 6
  const LABEL_W = 110
  const FIELD_W = 480
  const svgH    = data.length * (ROW_H + ROW_GAP) + 8
  const SVG_W   = LABEL_W + FIELD_W + 80

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgH}`}
      width="100%"
      role="img"
      aria-label="Dot-density chart: anomalous contracts by sector"
    >
      {data.map((sector, rowIdx) => {
        const y0 = rowIdx * (ROW_H + ROW_GAP) + 4
        const cy = y0 + ROW_H / 2
        const nDots = Math.max(1, Math.round((sector.count / maxCount) * 40))
        const barW  = (sector.count / maxCount) * FIELD_W
        const rng   = _mul32(rowIdx * 997 + 13)

        // Dot radius driven by avgZ severity: 2–5σ → r 1.4, 5–8σ → r 1.9, >8σ → r 2.5
        const baseR = sector.avgZ > 8 ? 2.5 : sector.avgZ > 5 ? 1.9 : 1.4

        return (
          <g key={sector.code}>
            {/* Sector label */}
            <text
              x={LABEL_W - 8}
              y={cy}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9.5}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#71717a"
            >
              {sector.name.length > 12 ? sector.name.slice(0, 12) + '…' : sector.name}
            </text>

            {/* Background field */}
            <rect x={LABEL_W} y={y0 + 2} width={FIELD_W} height={ROW_H - 4}
              fill="rgba(255,255,255,0.02)" rx={2} />

            {/* Dots */}
            {Array.from({ length: nDots }, (_, i) => {
              const x = LABEL_W + (rng() * 0.95 + 0.025) * barW
              const y = y0 + 4 + rng() * (ROW_H - 8)
              // Color: sector color but with opacity driven by avgZ
              const opacity = 0.5 + Math.min(0.45, (sector.avgZ - 2) * 0.08)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={baseR * (0.7 + rng() * 0.6)}
                  fill={sector.color}
                  fillOpacity={opacity}
                />
              )
            })}

            {/* Count label */}
            <text
              x={LABEL_W + barW + 6}
              y={cy}
              dominantBaseline="middle"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              fill={sector.color}
              fillOpacity={0.85}
            >
              {formatNumber(sector.count)}
            </text>
          </g>
        )
      })}
    </svg>
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
            {formatVendorName(contract.vendor_name, 40)}
          </Link>
        ) : (
          formatVendorName(contract.vendor_name, 40)
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
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 transition-colors"
          aria-label={`Ver detalle del contrato ${contract.contract_id}`}
        >
          {t('viewContract')}
          <ExternalLink className="w-3 h-3" />
        </Link>
        {contract.vendor_id && (
          <Link
            to={`/vendors/${contract.vendor_id}`}
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
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
                      title={v.vendor_name}
                    >
                      {formatVendorName(v.vendor_name, 40)}
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
  const { t } = useTranslation('price')
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
          {t('anomalousContractsByYear')}
        </h2>
      </div>
      {/* Year outlier timeline — pure SVG, SexenioStratum-style columns */}
      {(() => {
        const W = 700; const H = 120; const PAD_L = 28; const PAD_B = 22; const PAD_T = 8
        const fieldW = W - PAD_L - 8; const fieldH = H - PAD_T - PAD_B
        const maxCount = Math.max(...yearData.map((d) => d.count), 1)
        const colW = fieldW / yearData.length
        return (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%"
            role="img" aria-label="Outlier contract timeline by year">
            {yearData.map((d, i) => {
              const barH = Math.sqrt(d.count / maxCount) * fieldH
              const x = PAD_L + i * colW
              const y = PAD_T + (fieldH - barH)
              const fill = d.avg_z > 5 ? '#ef4444' : d.avg_z > 3 ? '#f59e0b' : '#a16207'
              const gap = 1.2
              return (
                <g key={d.year}>
                  <rect x={x + gap / 2} y={y} width={colW - gap} height={barH}
                    fill={fill} fillOpacity={0.80} rx={1} />
                  {(i % 4 === 0 || i === yearData.length - 1) && (
                    <text x={x + colW / 2} y={H - 6} textAnchor="middle"
                      fontSize={7.5} fontFamily="var(--font-family-mono, monospace)"
                      fill="#52525b">
                      {d.year}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1={PAD_L} y1={H - PAD_B} x2={W - 8} y2={H - PAD_B}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD_L - 4} y={PAD_T + fieldH / 2} fontSize={7}
              fontFamily="var(--font-family-mono, monospace)" fill="#3f3f46"
              textAnchor="middle" transform={`rotate(-90,${PAD_L - 4},${PAD_T + fieldH / 2})`}
              opacity={0.6}>√ count</text>
          </svg>
        )
      })()}
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

// --- Most Extreme Case Callout (editorial lede) -------------------------------

function MostExtremeCallout({
  contract,
  sectorName,
}: {
  contract: PriceAnomalyContract
  sectorName: string
}) {
  const factor = (contract.z_price_ratio ?? 0).toFixed(1)
  return (
    <aside
      className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-zinc-900/60 to-zinc-900/30 p-5 md:p-6"
      role="complementary"
      aria-label="El contrato más extremo"
    >
      {/* Red accent bar */}
      <div className="absolute top-0 left-0 h-full w-1 bg-red-500" aria-hidden="true" />
      <div className="flex items-start gap-3 mb-3">
        <Flame className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-red-400 mb-0.5">
            EL CONTRATO MÁS EXTREMO
          </p>
          <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">
            Primera parada para cualquier investigación
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-8 items-end">
        <div>
          <p
            className="text-zinc-100 leading-[1.15] mb-3"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
              fontWeight: 600,
              letterSpacing: '-0.015em',
            }}
          >
            {contract.vendor_id ? (
              <Link
                to={`/vendors/${contract.vendor_id}`}
                className="hover:text-red-300 transition-colors"
              >
                {formatVendorName(contract.vendor_name, 60)}
              </Link>
            ) : (
              formatVendorName(contract.vendor_name, 60)
            )}
            <span className="text-zinc-500"> cobró </span>
            <span className="text-red-300 tabular-nums">{formatCompactMXN(contract.amount_mxn)}</span>
            <span className="text-zinc-500"> a </span>
            <span className="text-zinc-200">{contract.institution_name}</span>
            <span className="text-zinc-500"> ({contract.contract_year}).</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="font-mono uppercase tracking-wide px-2 py-0.5 rounded border"
              style={{
                color: SECTOR_COLORS[getSectorCode(contract.sector_id)] ?? SECTOR_COLORS['otros'],
                borderColor: `${SECTOR_COLORS[getSectorCode(contract.sector_id)] ?? SECTOR_COLORS['otros']}55`,
                backgroundColor: `${SECTOR_COLORS[getSectorCode(contract.sector_id)] ?? SECTOR_COLORS['otros']}11`,
              }}
            >
              {sectorName}
            </span>
            <RiskScoreBadge score={contract.risk_score ?? 0} />
            <Link
              to={`/contracts/${contract.contract_id}`}
              className="inline-flex items-center gap-1 font-mono uppercase tracking-wide text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 rounded px-2 py-0.5 transition-colors"
            >
              Abrir expediente
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Hero factor */}
        <div className="border-l-2 border-red-500 pl-4 md:pl-5 md:text-right">
          <div
            className="font-bold text-red-400 tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              letterSpacing: '-0.03em',
            }}
          >
            {factor}σ
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">
            sobre la media sectorial
          </div>
        </div>
      </div>
    </aside>
  )
}

// --- Sector Price Deviation Bars (horizontal, intensity-colored) --------------

function SectorDeviationBars({
  data,
  loading,
}: {
  data: SectorBarDatum[]
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-56 w-full" />
  if (!data.length) return null

  // Sort by avg_z descending — worst offenders at top
  const sorted = [...data].sort((a, b) => b.avgZ - a.avgZ)
  const maxZ = Math.max(...sorted.map((d) => d.avgZ), 1)

  const ROW_H = 24
  const ROW_GAP = 4
  const LABEL_W = 120
  const BAR_W = 380
  const VALUE_W = 90
  const SVG_W = LABEL_W + BAR_W + VALUE_W + 16
  const svgH = sorted.length * (ROW_H + ROW_GAP) + 10

  // Intensity ramp: z=2→amber, z=5→orange, z=8+→deep red
  const intensityColor = (z: number): string => {
    if (z >= 8) return '#b91c1c'
    if (z >= 5) return '#dc2626'
    if (z >= 3.5) return '#ea580c'
    if (z >= 2.5) return '#f59e0b'
    return '#eab308'
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgH}`}
      width="100%"
      role="img"
      aria-label="Comparación sectorial: desviación promedio de precios"
    >
      {/* Reference line at OECD-ish threshold z=3 */}
      {(() => {
        const x3 = LABEL_W + (3 / maxZ) * BAR_W
        return (
          <g>
            <line
              x1={x3}
              x2={x3}
              y1={0}
              y2={svgH - 14}
              stroke="#22d3ee"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.45}
            />
            <text
              x={x3}
              y={svgH - 4}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#22d3ee"
              opacity={0.75}
            >
              z=3σ · umbral outlier
            </text>
          </g>
        )
      })()}

      {sorted.map((sector, i) => {
        const y0 = i * (ROW_H + ROW_GAP) + 2
        const cy = y0 + ROW_H / 2
        const barLen = (sector.avgZ / maxZ) * BAR_W
        const fill = intensityColor(sector.avgZ)

        return (
          <g key={sector.code}>
            {/* Sector label */}
            <text
              x={LABEL_W - 8}
              y={cy}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#a1a1aa"
            >
              {sector.name.length > 14 ? sector.name.slice(0, 14) + '…' : sector.name}
            </text>

            {/* Sector dot */}
            <circle cx={LABEL_W - 2} cy={cy} r={2.5} fill={sector.color} opacity={0.7} />

            {/* Track */}
            <rect
              x={LABEL_W}
              y={y0 + 3}
              width={BAR_W}
              height={ROW_H - 6}
              fill="rgba(255,255,255,0.03)"
              rx={2}
            />

            {/* Bar */}
            <rect
              x={LABEL_W}
              y={y0 + 3}
              width={barLen}
              height={ROW_H - 6}
              fill={fill}
              fillOpacity={0.85}
              rx={2}
            />

            {/* Value label */}
            <text
              x={LABEL_W + barLen + 6}
              y={cy}
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={fill}
              fontWeight={600}
            >
              +{sector.avgZ.toFixed(1)}σ
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Sector Price Distribution Curves (density-like) --------------------------

function SectorDistributionCurves({
  data,
  loading,
}: {
  data: SectorBarDatum[]
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (!data.length) return null

  // Show top 4 most severe sectors as mini density curves
  const top = [...data].sort((a, b) => b.avgZ - a.avgZ).slice(0, 4)

  const W_PER = 250
  const H_CURVE = 110
  const PAD_X = 14
  const PAD_Y = 18

  // Build a normal-ish density curve + highlight the tail beyond z=3
  const buildPath = (): string => {
    // Standard normal-ish: f(z) = e^(-z²/2), domain z ∈ [-3.5, 12]
    const zMin = -3.5
    const zMax = 12
    const N = 120
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= N; i++) {
      const z = zMin + (i / N) * (zMax - zMin)
      const y = Math.exp(-(z * z) / 2)
      // normalize z → x pixels
      const xPx = PAD_X + ((z - zMin) / (zMax - zMin)) * (W_PER - 2 * PAD_X)
      const yPx = H_CURVE - PAD_Y - y * (H_CURVE - 2 * PAD_Y) * 0.95
      pts.push([xPx, yPx])
    }
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  }

  const zToX = (z: number): number => {
    const zMin = -3.5
    const zMax = 12
    return PAD_X + ((z - zMin) / (zMax - zMin)) * (W_PER - 2 * PAD_X)
  }

  const baseline = H_CURVE - PAD_Y

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {top.map((sector) => {
        const x3 = zToX(3)
        const xAvg = zToX(Math.min(sector.avgZ, 12))
        const xMax = W_PER - PAD_X

        return (
          <div
            key={sector.code}
            className="rounded-lg border border-zinc-700/40 bg-zinc-900/30 p-2"
            aria-label={`Distribución de precios — ${sector.name}`}
          >
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: sector.color }}
                />
                <span className="text-[11px] font-semibold text-zinc-200">{sector.name}</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 tabular-nums">
                {formatNumber(sector.count)} anomalías
              </span>
            </div>
            <svg
              viewBox={`0 0 ${W_PER} ${H_CURVE}`}
              width="100%"
              role="img"
              aria-label={`Curva de densidad — ${sector.name}`}
            >
              {/* Outlier zone (z ≥ 3) shaded red */}
              <defs>
                <linearGradient id={`tail-${sector.code}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id={`body-${sector.code}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={sector.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={sector.color} stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {/* Normal body fill under curve */}
              <path
                d={`${buildPath()} L${xMax},${baseline} L${PAD_X},${baseline} Z`}
                fill={`url(#body-${sector.code})`}
              />

              {/* Red tail fill (z ≥ 3 region) */}
              <path
                d={`M${x3},${baseline} L${x3},${H_CURVE - PAD_Y - Math.exp(-4.5) * (H_CURVE - 2 * PAD_Y) * 0.95} ` +
                  (() => {
                    const N = 40
                    const pts: string[] = []
                    for (let i = 0; i <= N; i++) {
                      const z = 3 + (i / N) * 9
                      const y = Math.exp(-(z * z) / 2)
                      const px = zToX(z)
                      const py = H_CURVE - PAD_Y - y * (H_CURVE - 2 * PAD_Y) * 0.95
                      pts.push(`L${px.toFixed(1)},${py.toFixed(1)}`)
                    }
                    return pts.join(' ')
                  })() +
                  ` L${xMax},${baseline} Z`}
                fill={`url(#tail-${sector.code})`}
              />

              {/* Main curve stroke */}
              <path d={buildPath()} fill="none" stroke={sector.color} strokeWidth={1.2} opacity={0.85} />

              {/* Baseline axis */}
              <line
                x1={PAD_X}
                x2={xMax}
                y1={baseline}
                y2={baseline}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />

              {/* z=3 threshold marker */}
              <line
                x1={x3}
                x2={x3}
                y1={PAD_Y - 4}
                y2={baseline}
                stroke="#f87171"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={x3}
                y={PAD_Y - 6}
                textAnchor="middle"
                fontSize={7}
                fontFamily="var(--font-family-mono, monospace)"
                fill="#f87171"
              >
                z=3
              </text>

              {/* Avg-z marker for this sector */}
              <line
                x1={xAvg}
                x2={xAvg}
                y1={baseline - 30}
                y2={baseline}
                stroke={sector.color}
                strokeWidth={1.5}
              />
              <circle cx={xAvg} cy={baseline - 30} r={2.5} fill={sector.color} />
              <text
                x={xAvg}
                y={baseline - 34}
                textAnchor="middle"
                fontSize={8}
                fontFamily="var(--font-family-mono, monospace)"
                fill={sector.color}
                fontWeight={600}
              >
                +{sector.avgZ.toFixed(1)}σ
              </text>

              {/* z axis labels */}
              {[0, 3, 6, 9].map((z) => (
                <text
                  key={z}
                  x={zToX(z)}
                  y={baseline + 10}
                  textAnchor="middle"
                  fontSize={7}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="#52525b"
                >
                  {z}σ
                </text>
              ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}

// --- Overpricing Timeline with Value Overlay ----------------------------------

function OverpricingTimelineSection({
  contracts,
  loading,
}: {
  contracts: PriceAnomalyContract[]
  loading: boolean
}) {
  const yearData = useMemo(() => {
    if (!contracts.length) return []
    const m = new Map<
      number,
      { year: number; count: number; total_z: number; total_value: number; max_z: number }
    >()
    for (const c of contracts) {
      const yr = c.contract_year
      if (yr < 2015 || yr > 2025) continue
      const e = m.get(yr)
      const z = c.z_price_ratio ?? 0
      if (e) {
        e.count++
        e.total_z += z
        e.total_value += c.amount_mxn
        if (z > e.max_z) e.max_z = z
      } else {
        m.set(yr, {
          year: yr,
          count: 1,
          total_z: z,
          total_value: c.amount_mxn,
          max_z: z,
        })
      }
    }
    return [...m.values()]
      .sort((a, b) => a.year - b.year)
      .map((d) => ({ ...d, avg_z: d.count > 0 ? d.total_z / d.count : 0 }))
  }, [contracts])

  if (loading) return <Skeleton className="h-56 w-full" />
  if (!yearData.length) return null

  const peakYear = yearData.reduce((a, b) => (a.count > b.count ? a : b))
  const peakValueYear = yearData.reduce((a, b) => (a.total_value > b.total_value ? a : b))

  // SVG dimensions
  const W = 720
  const H = 180
  const PAD_L = 42
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 28
  const fieldW = W - PAD_L - PAD_R
  const fieldH = H - PAD_T - PAD_B
  const maxCount = Math.max(...yearData.map((d) => d.count), 1)
  const maxValue = Math.max(...yearData.map((d) => d.total_value), 1)
  const colW = fieldW / yearData.length

  return (
    <section className="space-y-3" aria-label="Cronología de sobreprecios">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
          RUBLI · Cronología de sobreprecios
        </p>
        <h2
          className="text-lg font-bold text-zinc-100"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          ¿Cuándo se dispararon los precios anómalos?
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
          Barras = número de contratos anómalos. La línea punteada sigue el valor total adjudicado
          en sobreprecio. Un pico en ambos indica gasto concentrado en un ejercicio fiscal.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2 max-w-2xl">
        <div className="border-l-2 border-orange-500 pl-3 py-0.5">
          <div className="text-lg font-mono font-bold text-orange-400 tabular-nums">
            {peakYear.year}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            año con más anomalías · {formatNumber(peakYear.count)}
          </div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-lg font-mono font-bold text-red-400 tabular-nums">
            {peakValueYear.year}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            pico de valor · {formatCompactMXN(peakValueYear.total_value)}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-0.5">
          <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">
            {yearData.length}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            años con actividad anómala
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Timeline: contratos anómalos y valor sobreprecio por año"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_T + fieldH * (1 - frac)
          return (
            <line
              key={frac}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          )
        })}

        {/* Left axis label — count */}
        <text
          x={PAD_L - 8}
          y={PAD_T + 6}
          textAnchor="end"
          fontSize={8}
          fontFamily="var(--font-family-mono, monospace)"
          fill="#71717a"
        >
          contratos
        </text>
        <text
          x={PAD_L - 8}
          y={PAD_T + fieldH}
          textAnchor="end"
          fontSize={8}
          fontFamily="var(--font-family-mono, monospace)"
          fill="#52525b"
        >
          0
        </text>
        <text
          x={PAD_L - 8}
          y={PAD_T + 14}
          textAnchor="end"
          fontSize={8}
          fontFamily="var(--font-family-mono, monospace)"
          fill="#a1a1aa"
        >
          {formatNumber(maxCount)}
        </text>

        {/* Right axis — value */}
        <text
          x={W - PAD_R + 2}
          y={PAD_T + 6}
          textAnchor="start"
          fontSize={8}
          fontFamily="var(--font-family-mono, monospace)"
          fill="#a78bfa"
        >
          valor
        </text>

        {/* Bars */}
        {yearData.map((d, i) => {
          const barH = (d.count / maxCount) * fieldH
          const x = PAD_L + i * colW
          const y = PAD_T + (fieldH - barH)
          const fill = d.avg_z > 6 ? '#b91c1c' : d.avg_z > 4 ? '#dc2626' : d.avg_z > 3 ? '#ea580c' : '#f59e0b'
          const gap = Math.min(2, colW * 0.1)
          return (
            <g key={d.year}>
              <rect
                x={x + gap / 2}
                y={y}
                width={colW - gap}
                height={barH}
                fill={fill}
                fillOpacity={0.82}
                rx={1.5}
              />
              {/* Year label — every 2nd year to reduce crowding */}
              {(i % 2 === 0 || i === yearData.length - 1) && (
                <text
                  x={x + colW / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="#71717a"
                >
                  {d.year}
                </text>
              )}
            </g>
          )
        })}

        {/* Value overlay line (right-axis scaled) */}
        {(() => {
          const pts = yearData.map((d, i) => {
            const x = PAD_L + i * colW + colW / 2
            const y = PAD_T + (fieldH - (d.total_value / maxValue) * fieldH)
            return [x, y] as [number, number]
          })
          const path = pts
            .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
            .join(' ')
          return (
            <g>
              <path d={path} fill="none" stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.9} />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={2.2} fill="#a78bfa" opacity={0.9} />
              ))}
            </g>
          )
        })()}

        {/* Baseline */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={PAD_T + fieldH}
          y2={PAD_T + fieldH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />

        {/* Legend */}
        <g transform={`translate(${PAD_L + 4}, ${H - 2})`}>
          <rect x={0} y={-7} width={8} height={6} fill="#dc2626" fillOpacity={0.82} />
          <text
            x={12}
            y={-2}
            fontSize={8}
            fontFamily="var(--font-family-mono, monospace)"
            fill="#a1a1aa"
          >
            contratos
          </text>
          <line x1={70} x2={85} y1={-4} y2={-4} stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="3 2" />
          <text
            x={89}
            y={-2}
            fontSize={8}
            fontFamily="var(--font-family-mono, monospace)"
            fill="#a1a1aa"
          >
            valor MXN
          </text>
        </g>
      </svg>
    </section>
  )
}

// --- Risk-Level Price Gap Section ---------------------------------------------
// Since the endpoint does not expose is_direct_award, we split anomalies by
// risk_level: critical+high (procurement with multiple red flags, typically
// direct-award abuse) vs medium+low (cleaner procurement). This surfaces the
// price premium that corrupt procurement introduces.

function RiskLevelPriceGap({
  contracts,
  loading,
}: {
  contracts: PriceAnomalyContract[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    if (!contracts.length) return null
    const bins = {
      flagged: { count: 0, total: 0, z_sum: 0, max_amt: 0 },
      standard: { count: 0, total: 0, z_sum: 0, max_amt: 0 },
    }
    for (const c of contracts) {
      const isFlagged = c.risk_level === 'critical' || c.risk_level === 'high'
      const bin = isFlagged ? bins.flagged : bins.standard
      bin.count++
      bin.total += c.amount_mxn
      bin.z_sum += c.z_price_ratio ?? 0
      if (c.amount_mxn > bin.max_amt) bin.max_amt = c.amount_mxn
    }
    const flaggedAvg = bins.flagged.count > 0 ? bins.flagged.total / bins.flagged.count : 0
    const standardAvg = bins.standard.count > 0 ? bins.standard.total / bins.standard.count : 0
    const flaggedZ = bins.flagged.count > 0 ? bins.flagged.z_sum / bins.flagged.count : 0
    const standardZ = bins.standard.count > 0 ? bins.standard.z_sum / bins.standard.count : 0
    const premium = standardAvg > 0 ? (flaggedAvg / standardAvg - 1) * 100 : 0
    return {
      flagged: {
        ...bins.flagged,
        avg: flaggedAvg,
        avg_z: flaggedZ,
      },
      standard: {
        ...bins.standard,
        avg: standardAvg,
        avg_z: standardZ,
      },
      premium,
      totalCount: bins.flagged.count + bins.standard.count,
    }
  }, [contracts])

  if (loading) return <Skeleton className="h-40 w-full" />
  if (!stats || stats.totalCount === 0) return null

  const maxAvg = Math.max(stats.flagged.avg, stats.standard.avg, 1)
  const flaggedPct = (stats.flagged.avg / maxAvg) * 100
  const standardPct = (stats.standard.avg / maxAvg) * 100

  return (
    <section className="space-y-3" aria-label="Brecha de precio por nivel de riesgo">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
          RUBLI · Prima de corrupción
        </p>
        <h2
          className="text-lg font-bold text-zinc-100"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          El precio que paga el Estado por procurement sospechoso
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
          Contratos con <strong className="text-orange-400">múltiples banderas de riesgo</strong>{' '}
          (crítico + alto) vs contratos con riesgo medio o bajo. La diferencia en precio promedio
          revela la prima que introducen los patrones de corrupción.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-4 md:p-5 space-y-5">
        {/* Headline: the premium */}
        {stats.premium > 0 && stats.standard.count > 0 && stats.flagged.count > 0 && (
          <div className="flex items-baseline gap-3 flex-wrap">
            <TrendingUp className="w-5 h-5 text-red-400 flex-shrink-0" aria-hidden="true" />
            <div
              className="text-3xl md:text-4xl font-bold text-red-400 tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              +{stats.premium.toFixed(0)}%
            </div>
            <div className="text-sm text-zinc-400">
              de prima en el precio promedio de contratos con múltiples banderas de riesgo
            </div>
          </div>
        )}

        {/* Horizontal bar comparison */}
        <div className="space-y-4">
          {/* Flagged row */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                <span className="text-xs font-semibold text-zinc-200">
                  Crítico + Alto riesgo
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  n={formatNumber(stats.flagged.count)}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-red-400 tabular-nums">
                {formatCompactMXN(stats.flagged.avg)}
              </div>
            </div>
            <div className="relative">
              {(() => {
                const N = 40, DR = 3, DG = 8
                const filled = Math.max(1, Math.round((flaggedPct / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 12`} className="w-full" style={{ height: 12 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={6} r={DR}
                        fill={k < filled ? '#dc2626' : '#2d2926'}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
              <p className="text-[10px] font-mono text-red-300/80 mt-1 tracking-wide">
                precio promedio · +{stats.flagged.avg_z.toFixed(1)}σ
              </p>
            </div>
          </div>

          {/* Standard row */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true" />
                <span className="text-xs font-semibold text-zinc-300">
                  Medio + Bajo riesgo
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  n={formatNumber(stats.standard.count)}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-zinc-300 tabular-nums">
                {formatCompactMXN(stats.standard.avg)}
              </div>
            </div>
            <div className="relative">
              {(() => {
                const N = 40, DR = 3, DG = 8
                const filled = Math.max(1, Math.round((standardPct / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 12`} className="w-full" style={{ height: 12 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={6} r={DR}
                        fill={k < filled ? '#71717a' : '#2d2926'}
                        fillOpacity={k < filled ? 0.85 : 1}
                      />
                    ))}
                  </svg>
                )
              })()}
              <p className="text-[10px] font-mono text-zinc-400 mt-1 tracking-wide">
                precio promedio · +{stats.standard.avg_z.toFixed(1)}σ
              </p>
            </div>
          </div>
        </div>

        {/* Detail table */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Flagged · valor total
            </p>
            <p className="text-sm font-mono text-red-400 tabular-nums">
              {formatCompactMXN(stats.flagged.total)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Standard · valor total
            </p>
            <p className="text-sm font-mono text-zinc-400 tabular-nums">
              {formatCompactMXN(stats.standard.total)}
            </p>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[10px] text-zinc-600 italic leading-relaxed pt-2 border-t border-zinc-800/60">
          Nota: Segmentación basada en <code className="text-zinc-500">risk_level</code>{' '}
          del modelo v0.6.5. Los contratos críticos/altos típicamente combinan adjudicación directa,
          baja competencia y concentración de proveedor — señales asociadas con procurement irregular.
        </p>
      </div>
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
            <p className="text-sm font-semibold text-zinc-200">{t('compranetUnavailableTitle')}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t('errorMessage')}</p>
          </div>
        </div>
      </div>
    )
  }

  const heroAvgZ = summary?.avg_z_score ?? 0
  const heroEstSavings = heroAvgZ > 1 ? (summary?.total_value_mxn ?? 0) * (1 - 1 / heroAvgZ) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <EditorialPageShell
        kicker="PRICE INTELLIGENCE · MARKET ANOMALY DETECTION"
        headline={<>When prices deviate, <em>corruption follows.</em></>}
        paragraph="Price intelligence tracks statistical outliers across Mexico's federal procurement market — contracts priced beyond sector norms are investigated first."
        severity="high"
        loading={loading}
        stats={[
          {
            value: summary ? formatNumber(summary.total_outliers) : '—',
            label: 'anomalous contracts',
            color: '#fb923c',
          },
          {
            value: summary ? formatCompactMXN(summary.total_value_mxn) : '—',
            label: 'value at risk',
            color: '#f87171',
          },
          {
            value: summary ? `+${(summary.avg_z_score ?? 0).toFixed(1)}σ` : '—',
            label: 'avg deviation',
            color: '#fbbf24',
          },
          {
            value: heroEstSavings > 0 ? formatCompactMXN(heroEstSavings) : '—',
            label: 'est. overpricing',
            color: '#a78bfa',
          },
        ]}
      >
        <Act number="I" label="THE ANOMALIES">
      {/* ================================================================== */}
      {/* SECTION 1: Hero Lede + KPI Strip                                   */}
      {/* ================================================================== */}

      <header>
        {/* Dateline strip — newspaper masthead grammar */}
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-zinc-300">RUBLI</span>
          </span>
          <span className="text-zinc-700">·</span>
          <span>Investigación · Precios anómalos</span>
          <span className="text-zinc-700">·</span>
          <span className="tabular-nums">v0.6.5</span>
        </div>

        {/* Overline */}
        <p className="text-kicker text-kicker--investigation mb-3">
          {t('pageKicker')}
        </p>

        {/* Page title + share */}
        <div className="flex items-start justify-between gap-4">
          <h1
            className="text-zinc-50 leading-[1.05]"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
            }}
          >
            {t('pageTitle')}
          </h1>
          <ShareButton label={t('share')} className="mt-1 flex-shrink-0" />
        </div>
        <p
          className="mt-3 max-w-2xl text-zinc-300 mb-4"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
            lineHeight: 1.55,
          }}
        >
          {t('contractsAwardedAtAnomalousPrice')}
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
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-l-2 border-zinc-700 pl-3 py-0.5">
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : summary && summary.total_outliers === 0 ? (
          // --- HEALTHY SYSTEM: no anomalies detected at current threshold -----
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4 max-w-3xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-emerald-400 mb-1">
                  {t('healthySystemLabel')}
                </p>
                <h2
                  className="text-lg md:text-xl font-bold text-zinc-100 mb-2"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {t('healthySystemTitle')}
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: t('healthySystemBody', { threshold: zThreshold.toFixed(1) }) }}
                />
                <p className="text-xs text-zinc-500 mt-3 leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: t('healthySystemNote') }}
                />
              </div>
            </div>
          </div>
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
                  dangerouslySetInnerHTML={{
                    __html: t('kpiLede', {
                      n: `<strong class="text-orange-400">${formatNumber(summary.total_outliers)}</strong>`,
                      value: `<strong class="text-red-400">${formatCompactMXN(summary.total_value_mxn)}</strong>`,
                      z: `<strong class="text-amber-400">${avgZ.toFixed(1)}</strong>`,
                      interpolation: { escapeValue: false },
                    })
                  }}
                />

                {/* 5-KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* 1. Total contracts */}
                  <div className="border-l-2 border-orange-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-orange-400 tabular-nums">
                      {formatNumber(summary.total_outliers)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {t('anomalousContracts')}
                    </div>
                  </div>

                  {/* 2. Value at risk */}
                  <div className="border-l-2 border-red-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-red-400 tabular-nums">
                      {formatCompactMXN(summary.total_value_mxn)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {t('kpiValueAtRisk')}
                    </div>
                  </div>

                  {/* 3. Average z-score */}
                  <div className="border-l-2 border-amber-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
                      +{avgZ.toFixed(1)}&sigma;
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {t('kpiAvgDeviation')}
                    </div>
                  </div>

                  {/* 4. Estimated overpricing */}
                  <div className="border-l-2 border-purple-500 pl-3 py-0.5">
                    <div className="text-xl font-mono font-bold text-purple-400 tabular-nums">
                      {formatCompactMXN(estimatedSavings)}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {t('kpiOverpricingEst')}{' '}
                      <MetodologiaTooltip
                        title={t('overpricingTooltipTitle')}
                        body={t('overpricingTooltipBody', { value: formatCompactMXN(summary.total_value_mxn), pct: estimatedOverpayPct.toFixed(0) })}
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
                      {topSector?.name ?? t('kpiTopSectorFallback')}
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
              {t('noAnomaliesAtThreshold')}
            </p>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/* EDITORIAL CALLOUT — single most extreme case                        */}
      {/* ================================================================== */}
      {!loading && extremeCases.length > 0 && (
        <MostExtremeCallout
          contract={extremeCases[0]}
          sectorName={getSectorName(extremeCases[0].sector_id)}
        />
      )}

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
      </Act>

      <Act number="II" label="THE SECTORS">
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

          {/* Horizontal deviation bars — worst offenders ranked by avg_z */}
          {!loading && chartData.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                RUBLI · Intensidad de desviación
              </p>
              <h3
                className="text-base font-bold text-zinc-100 mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                ¿Qué sectores pagan los peores sobreprecios?
              </h3>
              <p className="text-xs text-zinc-500 mb-3 max-w-2xl">
                Desviación promedio de precio (Z-score) por sector. Rojo profundo = sobreprecio
                extremo. La línea cyan marca el umbral de outlier estadístico (z=3σ).
              </p>
              <SectorDeviationBars data={chartData} loading={loading} />
            </div>
          )}

          {/* Density curves — top 4 sectors with normal body + red tail */}
          {!loading && chartData.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                RUBLI · Distribución de precios
              </p>
              <h3
                className="text-base font-bold text-zinc-100 mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                Dónde termina lo normal y empieza la anomalía
              </h3>
              <p className="text-xs text-zinc-500 mb-3 max-w-2xl">
                Cada curva representa la distribución de precios de un sector. La zona roja (z≥3σ)
                es el tail de outliers. La marca coloreada indica el z-score promedio observado
                en los contratos anómalos del sector.
              </p>
              <SectorDistributionCurves data={chartData} loading={loading} />
            </div>
          )}

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
      </Act>

      <Act number="III" label="THE EXTREMES">
      <section aria-label={t('extremeCasesAriaLabel')}>
        <div className="mb-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            RUBLI &middot; Casos extremos
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-xl font-bold text-zinc-100"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('topAnomaliesTitle')}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">{t('extremeCasesSubtitle')}</p>
            </div>
            {allContracts.length > 0 && (
              <TableExportButton
                data={allContracts.map(c => ({
                  contract_id: c.contract_id,
                  vendor_name: c.vendor_name,
                  institution_name: c.institution_name,
                  amount_mxn: c.amount_mxn,
                  sector_id: c.sector_id,
                  year: c.contract_year,
                  z_price_ratio: c.z_price_ratio,
                  risk_level: c.risk_level,
                }))}
                filename="price-anomalies"
              />
            )}
          </div>
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
      </Act>

      <Act number="IV" label="THE PATTERNS">
      {/* Corruption premium: flagged vs standard price gap */}
      {showComputedSections && <RiskLevelPriceGap contracts={allContracts} loading={loading} />}

      {showComputedSections && <ReincidentesSection contracts={allContracts} loading={loading} />}

      {/* ================================================================== */}
      {/* SECTION 5: Overpricing Timeline (richer — bars + value line)       */}
      {/* ================================================================== */}
      {showComputedSections && <OverpricingTimelineSection contracts={allContracts} loading={loading} />}

      {/* ================================================================== */}
      {/* SECTION 5b: Original anomaly timeline (compact sqrt-scaled)        */}
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
      </Act>

      <Act number="V" label="THE METHOD">
      <MethodologySection t={t} />

      <CitationBlock context="Price anomaly analysis — 7,090 anomalies" className="mt-2" />
        </Act>
      </EditorialPageShell>
    </div>
  )
}
