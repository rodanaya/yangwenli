/**
 * InstitutionCompare — editorial side-by-side institution comparison
 * Route: /institutions/compare?a=INSTITUTION_ID&b=INSTITUTION_ID
 *
 * NYT/WaPo investigative journalism aesthetic with radar overlay,
 * metric table, top-vendor comparison, and risk distribution.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from '@/components/charts'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { institutionApi } from '@/api/client'
import type { InstitutionDetailResponse, InstitutionVendorItem } from '@/api/types'
import { getRiskLevelFromScore, RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatPercentSafe, formatNumber, toTitleCase, cn } from '@/lib/utils'
import { ArrowLeft, AlertCircle, Search, TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InstitutionLogoBanner } from '@/components/InstitutionBadge'

// ============================================================================
// Constants
// ============================================================================

const COLOR_A = '#06b6d4' // cyan
const COLOR_B = '#a78bfa' // violet

const HHI_COLORS: Record<string, string> = {
  captura: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

function getHHILevel(hhi: number): string {
  if (hhi >= 2500) return 'captura'
  if (hhi >= 1500) return 'high'
  if (hhi >= 1000) return 'medium'
  return 'low'
}

// ============================================================================
// Radar axis definitions — 6 key procurement dimensions
// ============================================================================

interface RadarMetric {
  key: keyof InstitutionDetailResponse
  label: string
  labelEs: string
  higherIsBad: boolean
}

const RADAR_METRICS: RadarMetric[] = [
  { key: 'total_contracts', label: 'Contracts', labelEs: 'Contratos', higherIsBad: false },
  { key: 'total_amount_mxn', label: 'Total Value', labelEs: 'Valor Total', higherIsBad: false },
  { key: 'avg_risk_score', label: 'Avg Risk Score', labelEs: 'Riesgo Prom.', higherIsBad: true },
  { key: 'direct_award_pct', label: 'Direct Award %', labelEs: 'Adj. Directa', higherIsBad: true },
  { key: 'single_bid_pct', label: 'Single Bid %', labelEs: 'Licitante Unico', higherIsBad: true },
  { key: 'high_risk_pct', label: 'High Risk %', labelEs: 'Alto Riesgo', higherIsBad: true },
]

function normalizeRelative(a: number, b: number): [number, number] {
  const max = Math.max(a, b)
  if (max === 0) return [0, 0]
  return [a / max, b / max]
}

function buildRadarData(instA: InstitutionDetailResponse, instB: InstitutionDetailResponse) {
  return RADAR_METRICS.map((m) => {
    const rawA = (instA[m.key] as number | undefined) ?? 0
    const rawB = (instB[m.key] as number | undefined) ?? 0
    const [normA, normB] = normalizeRelative(rawA, rawB)
    return {
      factor: m.labelEs,
      instA: Math.round(normA * 100) / 100,
      instB: Math.round(normB * 100) / 100,
    }
  })
}

// ============================================================================
// Metric comparison definitions
// ============================================================================

interface MetricDef {
  label: string
  getValue: (i: InstitutionDetailResponse) => number | null
  format: (n: number) => string
  higherIsBad: boolean
}

const METRICS: MetricDef[] = [
  {
    label: 'Total de contratos',
    getValue: (i) => i.total_contracts ?? null,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
  {
    label: 'Gasto total',
    getValue: (i) => i.total_amount_mxn ?? null,
    format: (n) => formatCompactMXN(n),
    higherIsBad: false,
  },
  {
    label: 'Adjudicacion directa',
    getValue: (i) => i.direct_award_pct ?? null,
    format: (n) => formatPercentSafe(n, false),
    higherIsBad: true,
  },
  {
    label: 'Riesgo promedio',
    getValue: (i) => i.avg_risk_score ?? null,
    format: (n) => `${(n * 100).toFixed(1)}%`,
    higherIsBad: true,
  },
  {
    label: 'Contratos alto riesgo',
    getValue: (i) => i.high_risk_pct ?? null,
    format: (n) => formatPercentSafe(n, false),
    higherIsBad: true,
  },
  {
    label: 'Licitante unico',
    getValue: (i) => i.single_bid_pct ?? null,
    format: (n) => formatPercentSafe(n, false),
    higherIsBad: true,
  },
  {
    label: 'Proveedores unicos',
    getValue: (i) => i.vendor_count ?? null,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
  {
    label: 'Indice HHI',
    getValue: (i) => i.supplier_diversity?.hhi_current_year ?? null,
    format: (n) => formatNumber(Math.round(n)),
    higherIsBad: true,
  },
]

// ============================================================================
// Subcomponents
// ============================================================================

/** Sector color tag for institution preview cards */
function SectorTag({ sectorId }: { sectorId?: number }) {
  const sectorNames: Record<number, { code: string; name: string }> = {
    1: { code: 'salud', name: 'Salud' },
    2: { code: 'educacion', name: 'Educacion' },
    3: { code: 'infraestructura', name: 'Infraestructura' },
    4: { code: 'energia', name: 'Energia' },
    5: { code: 'defensa', name: 'Defensa' },
    6: { code: 'tecnologia', name: 'Tecnologia' },
    7: { code: 'hacienda', name: 'Hacienda' },
    8: { code: 'gobernacion', name: 'Gobernacion' },
    9: { code: 'agricultura', name: 'Agricultura' },
    10: { code: 'ambiente', name: 'Ambiente' },
    11: { code: 'trabajo', name: 'Trabajo' },
    12: { code: 'otros', name: 'Otros' },
  }
  if (!sectorId || !sectorNames[sectorId]) return null
  const s = sectorNames[sectorId]
  const color = SECTOR_COLORS[s.code] ?? '#64748b'
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {s.name}
    </span>
  )
}

/** Institution preview card shown in the selector */
function InstitutionPreviewCard({
  institution,
  accentColor,
  side,
}: {
  institution: InstitutionDetailResponse
  accentColor: string
  side: string
}) {
  const riskScore = institution.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)

  return (
    <div
      className="rounded-lg border border-border/60 bg-zinc-900/40 p-4 mt-3"
      style={{ borderTopWidth: '3px', borderTopColor: accentColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="text-[10px] font-bold tracking-widest uppercase font-mono mb-1 block"
            style={{ color: accentColor }}
          >
            {side}
          </span>
          <InstitutionLogoBanner name={institution.name} height={24} className="mb-1" />
          <h3
            className="text-lg font-bold text-text-primary leading-snug"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {toTitleCase(institution.name)}
          </h3>
          {institution.siglas && (
            <p className="text-xs text-text-muted font-mono mt-0.5">{institution.siglas}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <SectorTag sectorId={institution.sector_id} />
            <RiskLevelPill level={riskLevel} score={riskScore} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">Contracts</p>
          <p className="text-sm font-bold text-text-primary font-mono tabular-nums">
            {formatNumber(institution.total_contracts ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">Valor</p>
          <p className="text-sm font-bold text-text-primary font-mono tabular-nums">
            {formatCompactMXN(institution.total_amount_mxn ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">Adj. Directa</p>
          <p className="text-sm font-bold text-text-primary font-mono tabular-nums">
            {institution.direct_award_pct != null ? formatPercentSafe(institution.direct_award_pct, false) : '--'}
          </p>
        </div>
      </div>
      <Link
        to={`/institutions/${institution.id}`}
        className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-3"
        aria-label={`Ver perfil completo de ${institution.name}`}
      >
        Ver perfil completo
      </Link>
    </div>
  )
}

/** Veredicto header shown when both institutions are loaded */
function VeredictoHeader({
  instA,
  instB,
}: {
  instA: InstitutionDetailResponse
  instB: InstitutionDetailResponse
}) {
  const { t } = useTranslation('institutions')
  const hhiA = instA.supplier_diversity?.hhi_current_year ?? 0
  const hhiB = instB.supplier_diversity?.hhi_current_year ?? 0
  const levelA = getHHILevel(hhiA)
  const levelB = getHHILevel(hhiB)
  const infoA = { label: t(`compare.hhi.${levelA}`), color: HHI_COLORS[levelA] }
  const infoB = { label: t(`compare.hhi.${levelB}`), color: HHI_COLORS[levelB] }

  // Narrative
  const ratio = hhiB > 0 ? hhiA / hhiB : 0
  let narrative = ''
  if (hhiA > 0 && hhiB > 0) {
    if (ratio > 1.2) {
      const rStr = ratio.toFixed(1)
      narrative = `${toTitleCase(instA.siglas || instA.name)} muestra ${rStr}x mas concentracion de proveedores que ${toTitleCase(instB.siglas || instB.name)}`
    } else if (ratio < 0.8) {
      const rStr = (1 / ratio).toFixed(1)
      narrative = `${toTitleCase(instB.siglas || instB.name)} muestra ${rStr}x mas concentracion de proveedores que ${toTitleCase(instA.siglas || instA.name)}`
    } else {
      narrative = 'Ambas instituciones presentan niveles de concentracion similares'
    }
  }

  return (
    <div className="py-6 mb-8">
      <div className="h-px bg-border mb-6" />

      {/* Institution names in large serif */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-6">
        <h2
          className="text-2xl md:text-3xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          <span style={{ color: COLOR_A }}>{toTitleCase(instA.siglas || instA.name)}</span>
          <span className="text-text-muted mx-3 text-lg">vs</span>
          <span style={{ color: COLOR_B }}>{toTitleCase(instB.siglas || instB.name)}</span>
        </h2>
      </div>

      {/* HHI side by side */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-4">
        <div className="flex items-center gap-3">
          <HallazgoStat
            value={formatNumber(Math.round(hhiA))}
            label={`HHI ${toTitleCase(instA.siglas || instA.name).slice(0, 20)}`}
            color={`border-[${infoA.color}]`}
            className="min-w-[140px]"
          />
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{
              color: infoA.color,
              backgroundColor: `${infoA.color}15`,
              border: `1px solid ${infoA.color}40`,
            }}
          >
            {infoA.label}
          </span>
        </div>
        <div className="hidden sm:flex items-center text-text-muted text-lg">
          <Scale className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-3">
          <HallazgoStat
            value={formatNumber(Math.round(hhiB))}
            label={`HHI ${toTitleCase(instB.siglas || instB.name).slice(0, 20)}`}
            color={`border-[${infoB.color}]`}
            className="min-w-[140px]"
          />
          <span
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{
              color: infoB.color,
              backgroundColor: `${infoB.color}15`,
              border: `1px solid ${infoB.color}40`,
            }}
          >
            {infoB.label}
          </span>
        </div>
      </div>

      {/* Narrative */}
      {narrative && (
        <p
          className="text-sm text-text-secondary italic leading-relaxed max-w-2xl"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {narrative}
        </p>
      )}

      <div className="h-px bg-border mt-6" />
    </div>
  )
}

/** Side-by-side metric comparison table */
function MetricTable({
  instA,
  instB,
}: {
  instA: InstitutionDetailResponse
  instB: InstitutionDetailResponse
}) {
  const nameA = toTitleCase(instA.siglas || instA.name).slice(0, 25)
  const nameB = toTitleCase(instB.siglas || instB.name).slice(0, 25)

  return (
    <section className="mb-10" aria-label="Comparacion de metricas">
      <h3
        className="text-lg font-bold text-text-primary mb-1"
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        Metricas Clave
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Valores resaltados en rojo indican la institucion con peor desempeno en esa metrica.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm" aria-label="Comparacion de metricas institucionales">
          <thead>
            <tr className="border-b border-border bg-zinc-900/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                Metrica
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR_A }}>
                {nameA}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR_B }}>
                {nameB}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wide">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const vA = m.getValue(instA)
              const vB = m.getValue(instB)
              const aIsWorse = vA !== null && vB !== null && (m.higherIsBad ? vA > vB : vA < vB)
              const bIsWorse = vA !== null && vB !== null && (m.higherIsBad ? vB > vA : vB < vA)

              // Delta
              let deltaEl = <td className="px-4 py-3 text-center text-xs text-text-muted">--</td>
              if (vA !== null && vB !== null) {
                const d = vB - vA
                if (Math.abs(d) < 0.0001 && Math.abs(d) < 1) {
                  deltaEl = <td className="px-4 py-3 text-center text-xs text-text-muted font-mono">Igual</td>
                } else {
                  const worse = m.higherIsBad ? d > 0 : d < 0
                  const sign = d > 0 ? '+' : ''
                  const pctStr = vA !== 0 ? ` (${sign}${((d / Math.abs(vA)) * 100).toFixed(0)}%)` : ''
                  const DeltaIcon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus
                  deltaEl = (
                    <td className={cn('px-4 py-3 text-center text-xs font-mono', worse ? 'text-red-400' : 'text-emerald-400')}>
                      <span className="inline-flex items-center gap-1">
                        <DeltaIcon className="h-3 w-3" />
                        {Math.abs(d) >= 1000 ? formatCompactMXN(d) : `${sign}${d.toFixed(1)}`}
                        {pctStr && <span className="opacity-60">{pctStr}</span>}
                      </span>
                    </td>
                  )
                }
              }

              return (
                <tr
                  key={m.label}
                  className="border-b border-border/20 hover:bg-zinc-800/20 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-text-secondary font-medium">{m.label}</td>
                  <td className={cn(
                    'px-4 py-3 text-center text-xs font-mono tabular-nums',
                    aIsWorse ? 'text-red-400 font-semibold' : 'text-text-primary',
                  )}>
                    {vA !== null ? m.format(vA) : '--'}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-center text-xs font-mono tabular-nums',
                    bIsWorse ? 'text-red-400 font-semibold' : 'text-text-primary',
                  )}>
                    {vB !== null ? m.format(vB) : '--'}
                  </td>
                  {deltaEl}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Top vendors comparison — two columns */
function TopVendorsComparison({
  vendorsA,
  vendorsB,
  nameA,
  nameB,
  totalA,
  totalB,
}: {
  vendorsA: InstitutionVendorItem[]
  vendorsB: InstitutionVendorItem[]
  nameA: string
  nameB: string
  totalA: number
  totalB: number
}) {
  const { t } = useTranslation('institutions')
  const top5A = vendorsA.slice(0, 5)
  const top5B = vendorsB.slice(0, 5)

  function VendorColumn({
    vendors,
    accentColor,
    instName,
    total,
  }: {
    vendors: InstitutionVendorItem[]
    accentColor: string
    instName: string
    total: number
  }) {
    return (
      <div className="flex-1 min-w-0">
        <h4
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: accentColor }}
        >
          {instName}
        </h4>
        {vendors.length === 0 ? (
          <p className="text-xs text-text-muted italic">{t('profile.noVendorData')}</p>
        ) : (
          <div className="space-y-2">
            {vendors.map((v, idx) => {
              const share = total > 0 ? (v.total_value_mxn / total) * 100 : 0
              const riskLevel = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : null
              const riskColor = riskLevel ? RISK_COLORS[riskLevel] : undefined

              return (
                <div
                  key={v.vendor_id}
                  className="rounded border border-border/30 bg-zinc-900/30 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted font-mono">#{idx + 1}</span>
                        <Link
                          to={`/vendors/${v.vendor_id}`}
                          className="text-xs font-medium text-text-primary hover:text-accent truncate"
                        >
                          {toTitleCase(v.vendor_name)}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted font-mono tabular-nums">
                          {formatCompactMXN(v.total_value_mxn)}
                        </span>
                        <span className="text-xs text-text-muted font-mono tabular-nums">
                          {v.contract_count.toLocaleString()} contr.
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold font-mono tabular-nums" style={{ color: accentColor }}>
                        {share.toFixed(1)}%
                      </span>
                      {riskColor && (
                        <div className="mt-0.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: riskColor }}
                            title={`Riesgo: ${riskLevel}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Share dot-matrix */}
                  {(() => {
                    const N = 22, DR = 2, DG = 5
                    const filled = Math.max(1, Math.round((Math.min(share, 100) / 100) * N))
                    return (
                      <svg viewBox={`0 0 ${N * DG} 5`} className="w-full mt-1.5" style={{ height: 5 }} preserveAspectRatio="none" aria-hidden="true">
                        {Array.from({ length: N }).map((_, k) => (
                          <circle key={k} cx={k * DG + DR} cy={2.5} r={DR}
                            fill={k < filled ? accentColor : '#2d2926'}
                            stroke={k < filled ? undefined : '#3d3734'}
                            strokeWidth={k < filled ? 0 : 0.5}
                            fillOpacity={k < filled ? 0.85 : 1}
                          />
                        ))}
                      </svg>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="mb-10" aria-label="Comparacion de proveedores principales">
      <h3
        className="text-lg font-bold text-text-primary mb-1"
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        Principales Proveedores
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Top 5 proveedores por valor contratado. El porcentaje indica la participacion del proveedor en el gasto total de la institucion.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VendorColumn vendors={top5A} accentColor={COLOR_A} instName={nameA} total={totalA} />
        <VendorColumn vendors={top5B} accentColor={COLOR_B} instName={nameB} total={totalB} />
      </div>
    </section>
  )
}

interface PairedDotDatum {
  level: string
  a: number
  b: number
  color: string
}

/**
 * PairedDotStrips — paired horizontal dot-matrix strips.
 * For each metric row, shows TWO strips side by side: institution A on top,
 * institution B below. Values are percentages (0-100).
 */
function PairedDotStrips({
  data,
  colorA,
  colorB,
  nameA,
  nameB,
}: {
  data: PairedDotDatum[]
  colorA: string
  colorB: string
  nameA: string
  nameB: string
}) {
  const DOTS = 50
  const DOT_R = 3
  const DOT_GAP = 8
  const LABEL_W = 90
  const STRIP_H = 14
  const PAIR_H = STRIP_H * 2 + 18
  const VALUE_W = 56

  // Scale relative to max value across both a and b
  const maxValue = Math.max(...data.flatMap(d => [d.a, d.b]), 1)
  const width = LABEL_W + DOTS * DOT_GAP + VALUE_W + 16
  const height = data.length * PAIR_H + 24

  const renderStrip = (value: number, color: string, cy: number, rowIdx: number, seriesIdx: 0 | 1) => {
    const filled = value > 0 ? Math.max(1, Math.round((value / maxValue) * DOTS)) : 0
    return (
      <>
        {Array.from({ length: DOTS }).map((_, i) => {
          const isFilled = i < filled
          return (
            <motion.circle
              key={`s-${rowIdx}-${seriesIdx}-${i}`}
              cx={LABEL_W + i * DOT_GAP + DOT_GAP / 2}
              cy={cy}
              r={DOT_R}
              fill={isFilled ? color : '#2d2926'}
              fillOpacity={isFilled ? 0.85 : 1}
              stroke={isFilled ? 'none' : '#3d3734'}
              strokeWidth={isFilled ? 0 : 1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: rowIdx * 0.04 + seriesIdx * 0.02 + i * 0.002 }}
            />
          )
        })}
        <text
          x={LABEL_W + DOTS * DOT_GAP + 8}
          y={cy + 3}
          fontSize="10"
          fill={color}
          fontFamily="var(--font-family-mono)"
        >
          {value.toFixed(1)}%
        </text>
      </>
    )
  }

  return (
    <div style={{ minHeight: 260 }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[260px]">
        <title>
          Paired dot strips comparing {nameA} and {nameB} across risk levels
        </title>
        {data.map((d, rowIdx) => {
          const topCy = 12 + rowIdx * PAIR_H + STRIP_H / 2 + 2
          const botCy = topCy + STRIP_H + 2
          return (
            <g key={`pair-${rowIdx}`}>
              <text
                x={LABEL_W - 8}
                y={topCy + STRIP_H / 2 + 2}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-secondary)"
                fontFamily="var(--font-family-sans)"
                fontWeight={600}
              >
                {d.level}
              </text>
              {renderStrip(d.a, colorA, topCy, rowIdx, 0)}
              {renderStrip(d.b, colorB, botCy, rowIdx, 1)}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Risk distribution comparison — paired dot strips */
function RiskDistribution({
  instA,
  instB,
  nameA,
  nameB,
}: {
  instA: InstitutionDetailResponse
  instB: InstitutionDetailResponse
  nameA: string
  nameB: string
}) {
  // Approximate risk distribution from available data
  const totalA = instA.total_contracts ?? 0
  const totalB = instB.total_contracts ?? 0
  const highPctA = instA.high_risk_pct ?? 0
  const highPctB = instB.high_risk_pct ?? 0

  // We have high_risk_pct which combines critical+high. Estimate breakdown.
  const riskScoreA = instA.avg_risk_score ?? 0
  const riskScoreB = instB.avg_risk_score ?? 0

  // Estimate distribution based on available metrics
  const critPctA = riskScoreA >= 0.3 ? highPctA * 0.4 : highPctA * 0.2
  const highOnlyPctA = highPctA - critPctA
  const medPctA = Math.max(0, Math.min(100 - highPctA, riskScoreA * 100))
  const lowPctA = Math.max(0, 100 - highPctA - medPctA)

  const critPctB = riskScoreB >= 0.3 ? highPctB * 0.4 : highPctB * 0.2
  const highOnlyPctB = highPctB - critPctB
  const medPctB = Math.max(0, Math.min(100 - highPctB, riskScoreB * 100))
  const lowPctB = Math.max(0, 100 - highPctB - medPctB)

  const chartData = [
    { level: 'Critico', a: critPctA, b: critPctB, color: RISK_COLORS.critical },
    { level: 'Alto', a: highOnlyPctA, b: highOnlyPctB, color: RISK_COLORS.high },
    { level: 'Medio', a: medPctA, b: medPctB, color: RISK_COLORS.medium },
    { level: 'Bajo', a: lowPctA, b: lowPctB, color: RISK_COLORS.low },
  ]

  return (
    <section className="mb-10" aria-label="Distribucion de riesgo">
      <h3
        className="text-lg font-bold text-text-primary mb-1"
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        Distribucion de Riesgo
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Porcentaje estimado de contratos por nivel de riesgo.
        {totalA > 0 && totalB > 0 && (
          <span> Base: {formatNumber(totalA)} vs {formatNumber(totalB)} contratos.</span>
        )}
      </p>
      <div className="rounded-lg border border-border/40 bg-zinc-900/30 p-4" role="img" aria-label="Dot matrix chart comparing risk level distribution between two institutions">
        <PairedDotStrips data={chartData} colorA={COLOR_A} colorB={COLOR_B} nameA={nameA} nameB={nameB} />
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_A }} />
          <span className="text-xs text-text-muted">{nameA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_B }} />
          <span className="text-xs text-text-muted">{nameB}</span>
        </div>
      </div>
    </section>
  )
}

/** Radar comparison chart */
function ComparisonRadar({
  radarData,
  aName,
  bName,
}: {
  radarData: ReturnType<typeof buildRadarData>
  aName: string
  bName: string
}) {
  return (
    <section className="mb-10" aria-label="Radar de comportamiento">
      <h3
        className="text-lg font-bold text-text-primary mb-1"
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        Radar de Contratacion
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Comparacion normalizada de 6 dimensiones de contratacion. 100% corresponde al valor mas alto entre ambas instituciones.
      </p>
      <div className="h-[320px] rounded-lg border border-border/40 bg-zinc-900/30 p-4" role="img" aria-label="Radar chart comparing six procurement dimensions between two institutions">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
            <PolarGrid stroke="#3d3734" />
            <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload as (typeof radarData)[0]
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-text-primary mb-1">{d.factor}</p>
                    <p style={{ color: COLOR_A }}>
                      {aName.slice(0, 22)}: {(d.instA * 100).toFixed(0)}%
                    </p>
                    <p style={{ color: COLOR_B }}>
                      {bName.slice(0, 22)}: {(d.instB * 100).toFixed(0)}%
                    </p>
                    <p className="text-text-muted mt-1 text-[10px]">Normalizado uno respecto al otro</p>
                  </div>
                )
              }}
            />
            <Radar
              dataKey="instA"
              name={aName}
              stroke={COLOR_A}
              fill={COLOR_A}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              dataKey="instB"
              name={bName}
              stroke={COLOR_B}
              fill={COLOR_B}
              fillOpacity={0.10}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-px w-6 inline-block" style={{ backgroundColor: COLOR_A }} />
          <span className="text-xs text-text-muted">{aName.slice(0, 25)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-px w-6 border-t-2 border-dashed inline-block" style={{ borderColor: COLOR_B }} />
          <span className="text-xs text-text-muted">{bName.slice(0, 25)}</span>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Institution picker — shown when no institutions are selected
// ============================================================================

function InstitutionSearchInput({
  id,
  label,
  query,
  setQuery,
  selectedId,
  setSelectedId,
  accentColor,
  selectedInstitution,
}: {
  id: string
  label: string
  query: string
  setQuery: (v: string) => void
  selectedId: number | null
  setSelectedId: (v: number | null) => void
  accentColor: string
  selectedInstitution?: InstitutionDetailResponse | null
}) {
  const { data: results } = useQuery({
    queryKey: ['institution-search', query],
    queryFn: () => institutionApi.search(query, 5),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })

  return (
    <div className="flex-1 relative">
      <label htmlFor={id} className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div
        className="flex items-center gap-2 border rounded-lg px-3 py-2.5 transition-colors"
        style={{
          borderColor: selectedId ? `${accentColor}60` : undefined,
          backgroundColor: selectedId ? `${accentColor}08` : undefined,
        }}
      >
        <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        <input
          id={id}
          type="text"
          placeholder="Buscar por nombre..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedId(null)
          }}
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
          aria-label={`Buscar ${label}`}
          autoComplete="off"
        />
        {selectedId && (
          <button
            onClick={() => { setQuery(''); setSelectedId(null) }}
            className="text-text-muted hover:text-text-primary text-xs"
            aria-label="Limpiar seleccion"
          >
            x
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {results && results.data.length > 0 && !selectedId && query.length >= 2 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-background-card shadow-xl max-h-56 overflow-y-auto">
          {results.data.map((inst) => (
            <li key={inst.id}>
              <button
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-sidebar-hover/50 transition-colors border-b border-border/20 last:border-0"
                onClick={() => {
                  setQuery(toTitleCase(inst.name))
                  setSelectedId(inst.id)
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary block truncate">
                      {toTitleCase(inst.name)}
                    </span>
                    {inst.siglas && (
                      <span className="text-text-muted font-mono">{inst.siglas}</span>
                    )}
                  </div>
                  {inst.total_contracts != null && (
                    <span className="text-[10px] text-text-muted flex-shrink-0">
                      {formatNumber(inst.total_contracts)} contr.
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Preview card when institution is selected and data is loaded */}
      {selectedId && selectedInstitution && (
        <InstitutionPreviewCard
          institution={selectedInstitution}
          accentColor={accentColor}
          side={label}
        />
      )}

      {selectedId && !selectedInstitution && (
        <div className="mt-3">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main page component
// ============================================================================

export default function InstitutionCompare() {
  const { t } = useTranslation('institutions')
  const [searchParams, setSearchParams] = useSearchParams()
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const numA = idA ? parseInt(idA, 10) : null
  const numB = idB ? parseInt(idB, 10) : null
  const hasIds = numA !== null && !isNaN(numA) && numB !== null && !isNaN(numB)

  // Picker state (used when no IDs in URL yet)
  const [queryA, setQueryA] = useState('')
  const [queryB, setQueryB] = useState('')
  const [selectedA, setSelectedA] = useState<number | null>(numA)
  const [selectedB, setSelectedB] = useState<number | null>(numB)

  // Institution detail queries
  const effectiveA = hasIds ? numA : selectedA
  const effectiveB = hasIds ? numB : selectedB

  const {
    data: instA,
    isLoading: loadingA,
    error: errorA,
  } = useQuery({
    queryKey: ['institution', effectiveA],
    queryFn: () => institutionApi.getById(effectiveA!),
    enabled: effectiveA !== null,
  })

  const {
    data: instB,
    isLoading: loadingB,
    error: errorB,
  } = useQuery({
    queryKey: ['institution', effectiveB],
    queryFn: () => institutionApi.getById(effectiveB!),
    enabled: effectiveB !== null,
  })

  // Top vendors for each institution
  const { data: vendorsAResp } = useQuery({
    queryKey: ['institution-vendors', effectiveA],
    queryFn: () => institutionApi.getVendors(effectiveA!, 10),
    enabled: effectiveA !== null && instA !== undefined,
  })

  const { data: vendorsBResp } = useQuery({
    queryKey: ['institution-vendors', effectiveB],
    queryFn: () => institutionApi.getVendors(effectiveB!, 10),
    enabled: effectiveB !== null && instB !== undefined,
  })

  const radarData = useMemo(
    () => (instA && instB ? buildRadarData(instA, instB) : []),
    [instA, instB],
  )

  const isLoading = loadingA || loadingB
  const hasError = errorA || errorB

  const handleCompare = () => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      setSearchParams({ a: String(selectedA), b: String(selectedB) })
    }
  }

  // Derived names
  const nameA = instA ? toTitleCase(instA.siglas || instA.name).slice(0, 25) : ''
  const nameB = instB ? toTitleCase(instB.siglas || instB.name).slice(0, 25) : ''

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          to="/institutions/health"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors uppercase tracking-wide"
          aria-label="Regresar a Instituciones"
        >
          <ArrowLeft className="h-3 w-3" />
          Instituciones
        </Link>
      </div>

      {/* Editorial headline */}
      <EditorialHeadline
        section="COMPARATIVA INSTITUCIONAL"
        headline="Dos Instituciones, Una Radiografia"
        subtitle="Compara el patron de contratacion, concentracion y riesgo de dos dependencias federales"
        className="mb-8"
      />

      {/* Institution selectors — always visible */}
      {!hasIds && (
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-stretch gap-6 mb-6">
            <InstitutionSearchInput
              id="inst-a-search"
              label={t('compare.institutionA')}
              query={queryA}
              setQuery={setQueryA}
              selectedId={selectedA}
              setSelectedId={setSelectedA}
              accentColor={COLOR_A}
              selectedInstitution={selectedA === effectiveA ? instA : undefined}
            />
            <InstitutionSearchInput
              id="inst-b-search"
              label={t('compare.institutionB')}
              query={queryB}
              setQuery={setQueryB}
              selectedId={selectedB}
              setSelectedId={setSelectedB}
              accentColor={COLOR_B}
              selectedInstitution={selectedB === effectiveB ? instB : undefined}
            />
          </div>
          <div className="flex justify-center">
            <Button
              onClick={handleCompare}
              disabled={!selectedA || !selectedB || selectedA === selectedB}
              className="px-8"
              aria-label="Comparar instituciones"
            >
              <Scale className="h-4 w-4 mr-2" />
              Comparar
            </Button>
          </div>
          {selectedA && selectedB && selectedA === selectedB && (
            <p className="text-xs text-red-400 text-center mt-2">
              Selecciona dos instituciones diferentes para comparar.
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">{t('compare.loadError')}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {t('compare.loadErrorDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {hasIds && isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-60 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Comparison content */}
      {hasIds && instA && instB && (
        <>
          {/* Veredicto header */}
          <VeredictoHeader instA={instA} instB={instB} />

          {/* Metric comparison table */}
          <MetricTable instA={instA} instB={instB} />

          {/* Top vendors comparison */}
          <TopVendorsComparison
            vendorsA={vendorsAResp?.data ?? []}
            vendorsB={vendorsBResp?.data ?? []}
            nameA={nameA}
            nameB={nameB}
            totalA={instA.total_amount_mxn ?? 0}
            totalB={instB.total_amount_mxn ?? 0}
          />

          {/* Risk distribution */}
          <RiskDistribution
            instA={instA}
            instB={instB}
            nameA={nameA}
            nameB={nameB}
          />

          {/* Radar comparison */}
          <ComparisonRadar
            radarData={radarData}
            aName={nameA}
            bName={nameB}
          />

          {/* Change comparison link */}
          <div className="text-center py-6 border-t border-border/40">
            <button
              onClick={() => {
                setSearchParams({})
                setSelectedA(null)
                setSelectedB(null)
                setQueryA('')
                setQueryB('')
              }}
              className="text-xs text-accent hover:underline"
            >
              Cambiar instituciones
            </button>
          </div>
        </>
      )}
    </div>
  )
}
