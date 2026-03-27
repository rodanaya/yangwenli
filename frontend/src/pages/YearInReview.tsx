/**
 * Year in Review — Editorial annual procurement report
 *
 * NYT Year-in-Review aesthetic with editorial components,
 * year pills, sparklines, and sexenio context.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { analysisApi, vendorApi } from '@/api/client'
import type { YearOverYearChange, SectorYearItem, VendorTopItem } from '@/api/types'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const FEATURED_YEARS = [2024, 2023, 2022, 2021, 2020] as const
const ALL_YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2025 - i)
const DEFAULT_YEAR = 2024

interface SexenioInfo {
  president: string
  party: string
  period: string
  color: string
  partyColor: string
  yearInSexenio: number
  totalYears: number
}

function getSexenioInfo(year: number): SexenioInfo {
  if (year <= 2000) return { president: 'Ernesto Zedillo', party: 'PRI', period: '1994-2000', color: '#16a34a', partyColor: '#008000', yearInSexenio: year - 1994 + 1, totalYears: 6 }
  if (year <= 2006) return { president: 'Vicente Fox', party: 'PAN', period: '2000-2006', color: '#3b82f6', partyColor: '#002395', yearInSexenio: year - 2000 + 1, totalYears: 6 }
  if (year <= 2012) return { president: 'Felipe Calderon', party: 'PAN', period: '2006-2012', color: '#fb923c', partyColor: '#002395', yearInSexenio: year - 2006 + 1, totalYears: 6 }
  if (year <= 2018) return { president: 'Enrique Pena Nieto', party: 'PRI', period: '2012-2018', color: '#f87171', partyColor: '#008000', yearInSexenio: year - 2012 + 1, totalYears: 6 }
  if (year <= 2024) return { president: 'Andres Manuel Lopez Obrador', party: 'MORENA', period: '2018-2024', color: '#4ade80', partyColor: '#8B0000', yearInSexenio: year - 2018 + 1, totalYears: 6 }
  return { president: 'Claudia Sheinbaum', party: 'MORENA', period: '2024-2030', color: '#60a5fa', partyColor: '#8B0000', yearInSexenio: year - 2024 + 1, totalYears: 6 }
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'critical': return '#f87171'
    case 'high': return '#fb923c'
    case 'medium': return '#fbbf24'
    default: return '#4ade80'
  }
}

function getRiskLevel(score: number): string {
  if (score >= 0.60) return 'critical'
  if (score >= 0.40) return 'high'
  if (score >= 0.25) return 'medium'
  return 'low'
}

// =============================================================================
// Sub-components
// =============================================================================

/** Month-by-month sparkline for contract volume */
function MonthlySparkline({
  data,
  year,
}: {
  data: SectorYearItem[]
  year: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // We don't have monthly data from the sector-year breakdown API,
  // so we show sector contribution as a horizontal bar chart instead
  const sectorData = useMemo(() => {
    const yearRows = data.filter((r) => r.year === year)
    if (!yearRows.length) return []
    const total = yearRows.reduce((s, r) => s + r.total_value, 0)
    return SECTORS
      .map((sector) => {
        const row = yearRows.find((r) => r.sector_id === sector.id)
        if (!row || row.total_value <= 0) return null
        return {
          id: sector.id,
          code: sector.code,
          name: sector.name,
          color: sector.color,
          value: row.total_value,
          contracts: row.contracts,
          pct: total > 0 ? (row.total_value / total) * 100 : 0,
          avgRisk: row.avg_risk,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as {
        id: number; code: string; name: string; color: string
        value: number; contracts: number; pct: number; avgRisk: number
      }[]
  }, [data, year])

  if (!sectorData.length) {
    return (
      <div className="py-8 text-center text-sm text-text-muted italic">
        Sin datos sectoriales para {year}.
      </div>
    )
  }

  const maxPct = Math.max(...sectorData.map((s) => s.pct))

  return (
    <div className="space-y-2">
      {sectorData.map((s, i) => {
        const barWidth = maxPct > 0 ? (s.pct / maxPct) * 100 : 0
        const isHovered = hoveredIdx === i
        return (
          <div
            key={s.id}
            className="group flex items-center gap-3 cursor-default"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-text-secondary w-32 truncate flex-shrink-0">
              {s.name}
            </span>
            <div className="flex-1 relative h-5 rounded overflow-hidden bg-background-elevated/20">
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: s.color,
                  opacity: isHovered ? 0.7 : 0.4,
                }}
              />
              {isHovered && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[10px] font-mono text-text-primary">
                    {formatCompactMXN(s.value)} / {formatNumber(s.contracts)} contratos / riesgo {(s.avgRisk * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-mono text-text-muted w-12 text-right flex-shrink-0 tabular-nums">
              {s.pct.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Single vendor card for Top 5 editorial list */
function VendorRankCard({
  vendor,
  rank,
  onClick,
}: {
  vendor: VendorTopItem
  rank: number
  onClick: () => void
}) {
  const score = vendor.avg_risk_score ?? 0
  const riskLevel = getRiskLevel(score)
  const riskColor = getRiskLevelColor(riskLevel)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-all',
        'hover:border-accent/40 hover:bg-card-hover/30',
        'border-border/30 bg-card/50',
        rank === 1 && 'border-l-[3px]'
      )}
      style={rank === 1 ? { borderLeftColor: '#dc2626' } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-sm font-bold',
            rank === 1 ? 'bg-red-500/20 text-red-400' :
            rank === 2 ? 'bg-orange-500/15 text-orange-400' :
            rank === 3 ? 'bg-amber-500/15 text-amber-400' :
            'bg-zinc-700/30 text-zinc-400'
          )}
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-semibold truncate">
            {vendor.vendor_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-mono text-text-muted">
              {formatCompactMXN(vendor.metric_value)}
            </span>
            <span className="text-xs text-text-muted">
              {formatNumber(vendor.total_contracts)} contratos
            </span>
          </div>
        </div>

        {/* Risk badge */}
        {score > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              color: riskColor,
              backgroundColor: `${riskColor}15`,
              borderColor: `${riskColor}30`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: riskColor }}
            />
            {score.toFixed(2)}
          </span>
        )}
      </div>
    </button>
  )
}

// =============================================================================
// Main component
// =============================================================================

export default function YearInReview() {
  const { year: yearParam } = useParams<{ year?: string }>()
  const navigate = useNavigate()

  const selectedYear = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR
  const validYear = ALL_YEARS.includes(selectedYear) ? selectedYear : DEFAULT_YEAR

  const handleYearChange = (y: number) => {
    navigate(`/year-in-review/${y}`, { replace: false })
  }

  // -- Data queries (preserved from original) --

  const { data: yoyResp, isLoading: yoyLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', 10, validYear],
    queryFn: () => vendorApi.getTop('value', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskVendorsResp } = useQuery({
    queryKey: ['vendors', 'top', 'risk', 10, validYear],
    queryFn: () => vendorApi.getTop('risk', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const yoyData: YearOverYearChange[] = yoyResp?.data ?? []
  const sectorYearData: SectorYearItem[] = sectorYearResp?.data ?? []

  // -- Derived data --

  const yearRow = useMemo(
    () => yoyData.find((y) => y.year === validYear),
    [yoyData, validYear]
  )

  const priorRow = useMemo(
    () => yoyData.find((y) => y.year === validYear - 1),
    [yoyData, validYear]
  )

  const spendingChangePct = useMemo(() => {
    if (!yearRow || !priorRow || priorRow.total_value === 0) return null
    return ((yearRow.total_value - priorRow.total_value) / priorRow.total_value) * 100
  }, [yearRow, priorRow])

  // Find top sector for the year
  const topSector = useMemo(() => {
    const yearSectors = sectorYearData.filter((r) => r.year === validYear)
    if (!yearSectors.length) return null
    const top = yearSectors.reduce((best, r) => r.total_value > best.total_value ? r : best, yearSectors[0])
    const sectorInfo = SECTORS.find((s) => s.id === top.sector_id)
    return sectorInfo ? { ...sectorInfo, value: top.total_value, contracts: top.contracts } : null
  }, [sectorYearData, validYear])


  // Sector growth ranking
  const sectorGrowth = useMemo(() => {
    const currentRows = sectorYearData.filter((r) => r.year === validYear)
    const priorRows = sectorYearData.filter((r) => r.year === validYear - 1)
    if (currentRows.length === 0) return []
    return SECTORS.map((sector) => {
      const cur = currentRows.find((r) => r.sector_id === sector.id)
      const prev = priorRows.find((r) => r.sector_id === sector.id)
      const curVal = cur?.total_value ?? 0
      const prevVal = prev?.total_value ?? 0
      const growthPct = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 100 : null
      return {
        id: sector.id,
        name: sector.name,
        code: sector.code,
        color: sector.color,
        curVal,
        growthPct,
      }
    })
      .filter((s) => s.curVal > 0)
      .sort((a, b) => {
        if (a.growthPct == null) return 1
        if (b.growthPct == null) return -1
        return b.growthPct - a.growthPct
      })
  }, [sectorYearData, validYear])

  // Top hallazgos / anomalies for the year
  const hallazgos = useMemo(() => {
    if (!yearRow) return []
    const findings: { text: string; severity: 'high' | 'medium' }[] = []

    if (yearRow.high_risk_pct > 15) {
      findings.push({
        text: `Tasa de alto riesgo del ${yearRow.high_risk_pct.toFixed(1)}% -- por encima del umbral OCDE del 15%`,
        severity: 'high',
      })
    }

    if (yearRow.direct_award_pct > 75) {
      findings.push({
        text: `${yearRow.direct_award_pct.toFixed(1)}% de contratos por adjudicacion directa -- concentracion de poder discrecional`,
        severity: 'high',
      })
    }

    if (yearRow.single_bid_pct > 30) {
      findings.push({
        text: `${yearRow.single_bid_pct.toFixed(1)}% de procedimientos competitivos con un solo licitante`,
        severity: 'medium',
      })
    }

    // YoY spending spike
    if (spendingChangePct != null && spendingChangePct > 30) {
      findings.push({
        text: `Incremento del ${spendingChangePct.toFixed(0)}% en gasto respecto al ano anterior`,
        severity: 'medium',
      })
    }

    // YoY spending drop
    if (spendingChangePct != null && spendingChangePct < -25) {
      findings.push({
        text: `Caida del ${Math.abs(spendingChangePct).toFixed(0)}% en gasto respecto al ano anterior`,
        severity: 'medium',
      })
    }

    return findings
  }, [yearRow, spendingChangePct])

  const sexenio = getSexenioInfo(validYear)
  const isLoading = yoyLoading || syLoading

  // Generate dynamic subtitle
  const dynamicSubtitle = useMemo(() => {
    if (!yearRow) return 'Cargando datos del ano...'
    const parts: string[] = []
    parts.push(`${formatNumber(yearRow.contracts)} contratos`)
    parts.push(`${formatCompactMXN(yearRow.total_value)} en gasto federal`)
    parts.push(`${yearRow.high_risk_pct.toFixed(1)}% de alto riesgo`)
    return parts.join(' | ')
  }, [yearRow])

  // Generate narrative lede text
  const ledeText = useMemo(() => {
    if (!yearRow) return ''
    const yrStr = String(validYear)

    if (validYear === 2020 || validYear === 2021) {
      return `${yrStr} estuvo marcado por la emergencia sanitaria. Con ${formatNumber(yearRow.contracts)} contratos y un ${yearRow.direct_award_pct.toFixed(0)}% de adjudicacion directa, el gasto de emergencia redefinio los patrones de contratacion publica.`
    }
    if (validYear === 2024) {
      return `${yrStr} fue un ano de transicion presidencial. ${formatNumber(yearRow.contracts)} contratos por ${formatCompactMXN(yearRow.total_value)} reflejan el cierre de una administracion y el inicio de otra.`
    }
    if (yearRow.high_risk_pct > 15) {
      return `${yrStr} registro una tasa de alto riesgo del ${yearRow.high_risk_pct.toFixed(1)}%, significativamente por encima del umbral recomendado por la OCDE. ${formatNumber(yearRow.contracts)} contratos por ${formatCompactMXN(yearRow.total_value)} requieren atencion.`
    }
    return `En ${yrStr}, el gobierno federal proceso ${formatNumber(yearRow.contracts)} contratos por un total de ${formatCompactMXN(yearRow.total_value)}. La tasa de adjudicacion directa fue del ${yearRow.direct_award_pct.toFixed(0)}%.`
  }, [yearRow, validYear])

  // Top vendor by value (for "Momento Mas Destacado")
  const topVendor = (vendorsResp?.data ?? [])[0] ?? null

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8 space-y-8">

      {/* ------------------------------------------------------------------ */}
      {/* 1. Year Selector Pills — newspaper edition style                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted mb-3">
          EDICION ANUAL
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {FEATURED_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={cn(
                'px-5 py-2.5 text-lg font-bold transition-all rounded-sm',
                y === validYear
                  ? 'bg-text-primary text-background shadow-lg'
                  : 'text-text-muted hover:text-text-primary border border-border/40 hover:border-border'
              )}
              style={{ fontFamily: "var(--font-family-serif)" }}
              aria-current={y === validYear ? 'page' : undefined}
            >
              {y}
            </button>
          ))}
        </div>
        {/* Full year selector for other years */}
        <div className="mt-3">
          <select
            value={validYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="text-xs text-text-muted bg-transparent border-b border-border/30 py-1 px-2 cursor-pointer focus:outline-none"
            aria-label="Seleccionar otro ano"
          >
            {ALL_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Editorial Headline                                               */}
      {/* ------------------------------------------------------------------ */}
      <motion.div variants={fadeIn} initial="initial" animate="animate">
        <EditorialHeadline
          section={`INFORME ANUAL ${validYear}`}
          headline={`${validYear}: El Ano en Contratos`}
          subtitle={dynamicSubtitle}
        />
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Narrative Lede                                                   */}
      {/* ------------------------------------------------------------------ */}
      {yearRow && (
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          <div className="border-l-[3px] border-text-muted/30 pl-5 py-2">
            <p
              className="text-base text-text-secondary leading-relaxed"
              style={{ fontFamily: "var(--font-family-serif)" }}
            >
              {ledeText}
            </p>
          </div>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Big 5 HallazgoStats                                              */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : yearRow ? (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={formatNumber(yearRow.contracts)}
              label="Contratos"
              color="border-blue-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={formatCompactMXN(yearRow.total_value)}
              label="Gasto Total"
              color="border-violet-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={`${yearRow.high_risk_pct.toFixed(1)}%`}
              label="Alto Riesgo"
              annotation={`${formatNumber(Math.round((yearRow.high_risk_pct / 100) * yearRow.contracts))} contratos`}
              color={yearRow.high_risk_pct >= 15 ? 'border-red-500' : 'border-orange-500'}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={topSector?.name ?? '--'}
              label="Sector Lider"
              annotation={topSector ? formatCompactMXN(topSector.value) : undefined}
              color={`border-[${topSector?.color ?? '#64748b'}]`}
              className="[&>div:first-child]:text-2xl"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={
                spendingChangePct != null
                  ? `${spendingChangePct > 0 ? '+' : ''}${spendingChangePct.toFixed(0)}%`
                  : '--'
              }
              label="vs Ano Anterior"
              annotation={priorRow ? formatCompactMXN(priorRow.total_value) : undefined}
              color={
                spendingChangePct == null ? 'border-zinc-500'
                : spendingChangePct > 0 ? 'border-emerald-500'
                : 'border-red-500'
              }
            />
          </motion.div>
        </motion.div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Sexenio Context                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="rounded-lg border px-5 py-4"
        style={{
          borderColor: `${sexenio.partyColor}30`,
          backgroundColor: `${sexenio.partyColor}08`,
        }}
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: sexenio.color }}
          >
            ADMINISTRACION PRESIDENCIAL
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{sexenio.president}</span>
          {' '}({sexenio.party}) &middot; {sexenio.period}
        </p>
        {/* Sexenio progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {Array.from({ length: sexenio.totalYears }).map((_, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-sm transition-colors"
                style={{
                  backgroundColor: i < sexenio.yearInSexenio
                    ? sexenio.color
                    : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
            Ano {sexenio.yearInSexenio}/{sexenio.totalYears}
          </span>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. "Momento Mas Destacado" — Spotlight on top vendor                */}
      {/* ------------------------------------------------------------------ */}
      {topVendor && !vendorsLoading && (
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-3">
            MOMENTO MAS DESTACADO
          </p>
          <div
            className="rounded-lg border border-border/40 bg-card/60 p-5 cursor-pointer hover:border-accent/30 transition-colors"
            onClick={() => navigate(`/vendors/${topVendor.vendor_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/vendors/${topVendor.vendor_id}`) }}
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              PROVEEDOR CON MAYOR GASTO EN {validYear}
            </p>
            <h3
              className="text-xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-family-serif)" }}
            >
              {topVendor.vendor_name}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-mono text-text-secondary">
                {formatCompactMXN(topVendor.metric_value)}
              </span>
              <span className="text-sm text-text-muted">
                {formatNumber(topVendor.total_contracts)} contratos
              </span>
              {(topVendor.avg_risk_score ?? 0) > 0 && (() => {
                const score = topVendor.avg_risk_score ?? 0
                const riskColor = getRiskLevelColor(getRiskLevel(score))
                return (
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border"
                    style={{
                      color: riskColor,
                      backgroundColor: `${riskColor}15`,
                      borderColor: `${riskColor}30`,
                    }}
                  >
                    Riesgo {score.toFixed(2)}
                  </span>
                )
              })()}
            </div>
            <ImpactoHumano amountMxn={topVendor.metric_value} className="mt-3" />
          </div>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Key YoY Deltas — compact strip                                   */}
      {/* ------------------------------------------------------------------ */}
      {yearRow && priorRow && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          {[
            {
              label: 'Contratos',
              val: formatNumber(yearRow.contracts),
              delta: priorRow.contracts > 0 ? ((yearRow.contracts - priorRow.contracts) / priorRow.contracts) * 100 : null,
              suffix: '%',
              invertColor: false,
            },
            {
              label: 'Tasa Alto Riesgo',
              val: `${yearRow.high_risk_pct.toFixed(1)}%`,
              delta: yearRow.high_risk_pct - priorRow.high_risk_pct,
              suffix: 'pp',
              invertColor: true,
            },
            {
              label: 'Adjudicacion Directa',
              val: `${yearRow.direct_award_pct.toFixed(1)}%`,
              delta: yearRow.direct_award_pct - priorRow.direct_award_pct,
              suffix: 'pp',
              invertColor: true,
            },
            {
              label: 'Riesgo Promedio',
              val: yearRow.avg_risk.toFixed(3),
              delta: (yearRow.avg_risk - priorRow.avg_risk) * 100,
              suffix: 'pp',
              invertColor: true,
            },
          ].map((item) => {
            const isUp = item.delta != null && item.delta > 0
            const color = item.delta == null
              ? '#a1a1aa'
              : item.invertColor
                ? (isUp ? '#f87171' : '#4ade80')
                : (isUp ? '#4ade80' : '#f87171')
            const Icon = isUp ? TrendingUp : TrendingDown
            return (
              <div
                key={item.label}
                className="rounded-md border border-border/30 bg-background-elevated/40 px-3 py-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-muted uppercase tracking-wide truncate">{item.label}</p>
                  <p className="text-sm font-mono font-bold text-text-primary tabular-nums">{item.val}</p>
                </div>
                {item.delta != null && (
                  <span className="flex items-center gap-0.5 text-xs font-mono font-bold flex-shrink-0" style={{ color }}>
                    <Icon className="h-3 w-3" />
                    {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}{item.suffix}
                  </span>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. Top 5 Vendors of the Year — editorial cards                      */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
          LOS 5 MAYORES PROVEEDORES
        </p>
        <p
          className="text-lg font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          Quienes recibieron mas dinero en {validYear}
        </p>

        {vendorsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (vendorsResp?.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm italic">
            Sin datos de proveedores para {validYear}.
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {(vendorsResp?.data ?? []).slice(0, 5).map((v, i) => (
              <motion.div key={v.vendor_id} variants={staggerItem}>
                <VendorRankCard
                  vendor={v}
                  rank={i + 1}
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 9. Top 5 Risk Vendors                                               */}
      {/* ------------------------------------------------------------------ */}
      {(riskVendorsResp?.data ?? []).length > 0 && (
        <div>
          <div className="h-px bg-border mb-4" />
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold">
              PROVEEDORES DE MAYOR RIESGO
            </p>
          </div>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            Banderas rojas de {validYear}
          </p>
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {(riskVendorsResp?.data ?? []).slice(0, 5).map((v, i) => (
              <motion.div key={v.vendor_id} variants={staggerItem}>
                <VendorRankCard
                  vendor={v}
                  rank={i + 1}
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. Sector Breakdown                                                */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
          DISTRIBUCION SECTORIAL
        </p>
        <p
          className="text-lg font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          Como se repartio el gasto en {validYear}
        </p>

        {syLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7" />)}
          </div>
        ) : (
          <MonthlySparkline data={sectorYearData} year={validYear} />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 11. Sector Growth Ranking (if prior year data exists)               */}
      {/* ------------------------------------------------------------------ */}
      {sectorGrowth.length > 0 && priorRow && (
        <div>
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            CRECIMIENTO SECTORIAL
          </p>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            Que sectores crecieron y cuales se contrajeron
          </p>

          <div className="space-y-2">
            {sectorGrowth.map((s) => {
              const maxAbsGrowth = Math.max(...sectorGrowth.map((x) => Math.abs(x.growthPct ?? 0)), 1)
              const barWidth = s.growthPct != null
                ? Math.min(100, (Math.abs(s.growthPct) / maxAbsGrowth) * 100)
                : 0
              const isPos = s.growthPct != null && s.growthPct > 0
              const isNeg = s.growthPct != null && s.growthPct < 0
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-text-secondary w-32 truncate flex-shrink-0">
                    {s.name}
                  </span>
                  <div className="flex-1 relative h-4 rounded overflow-hidden bg-background-elevated/20">
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 rounded transition-all',
                        isPos ? 'bg-emerald-500/30 left-0' : isNeg ? 'bg-red-500/30 left-0' : 'bg-border/30 left-0'
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-mono w-16 text-right flex-shrink-0 tabular-nums',
                    isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-text-muted'
                  )}>
                    {s.growthPct != null
                      ? `${s.growthPct > 0 ? '+' : ''}${s.growthPct.toFixed(1)}%`
                      : '--'
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 12. Hallazgos del Ano                                               */}
      {/* ------------------------------------------------------------------ */}
      {hallazgos.length > 0 && (
        <div>
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            HALLAZGOS DEL ANO
          </p>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            Anomalias estadisticas detectadas en {validYear}
          </p>
          <div className="space-y-3">
            {hallazgos.map((h, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3',
                  h.severity === 'high'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 flex-shrink-0 mt-0.5',
                    h.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                  )}
                  aria-hidden="true"
                />
                <p className="text-sm text-text-secondary leading-relaxed">
                  {h.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 13. Full year navigation pills at bottom                            */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-3">
          TODOS LOS ANOS
        </p>
        <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Navegacion por ano">
          {ALL_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={cn(
                'px-2.5 py-1 rounded-sm text-xs font-mono transition-colors',
                y === validYear
                  ? 'bg-text-primary text-background font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-card-hover border border-transparent'
              )}
              aria-current={y === validYear ? 'page' : undefined}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom margin */}
      <div className="h-8" />
    </div>
  )
}
