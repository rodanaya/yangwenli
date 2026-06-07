/**
 * Administration Deep Dive — "EL EXPEDIENTE SEXENAL"
 *
 * 2026-06-07 reorganization — the dossier IS the page. The reader picks an
 * administration FIRST (summary card with switcher rail at the top), and
 * the per-admin chapters answer to that choice. Systemic 25-year context
 * is demoted to a closing section.
 *
 * Layout:
 *   Compact folio header (no sledgehammer)
 *   █ AdminSummaryCard — switcher + identity + fingerprint + verdict
 *   § I   La Trayectoria   — yearly chart + anomalies + inflation note
 *   § II  La Huella Sectorial — sector risk table
 *   § III El Expediente    — documented scandals + key events
 *   § IV  Los Beneficiarios — top vendors + top sectors
 *   ─── § El Contexto Sistémico · 2002–2025 ───
 *   25-yr trend · risk ranking · admin×sector matrix · term-year multiples ·
 *   compare tool (collapsed) · PageFooter
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminSummaryCard } from '@/components/administrations/AdminSummaryCard'
import { AdminSectorMatrix, MATRIX_SECTORS } from '@/components/administrations/AdminSectorMatrix'
import { ComparePeriodView } from '@/components/administrations/ComparePeriodView'
import { AdminCycleSmallMultiples } from '@/components/administrations/AdminCycleSmallMultiples'
import { ExpedienteSpine } from '@/components/administrations/ExpedienteSpine'
import {
  ADMINISTRATIONS,
  ADMIN_DISPLAY_NAMES,
  PARTY_COLORS,
} from '@/components/administrations/data'
import type {
  AdminName,
  AdminAgg,
  MatrixMetric,
} from '@/components/administrations/types'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { TableExportButton } from '@/components/TableExportButton'
import {
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { PageFooter } from '@/components/layout/PageFooter'
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
import { ShareButton } from '@/components/ShareButton'
import { DotBar } from '@/components/ui/DotBar'
import {
  EditorialLineChart,
  DotStrip,
  type ChartAnnotation,
  type LineSeries,
  type DotStripRow,
} from '@/components/charts/editorial'
import { EditorialChartFrame } from '@/components/stories/EditorialChartFrame'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'

// =============================================================================
// Constants
// =============================================================================

// Map AdminName to backend era key
const ERA_KEYS: Record<string, string> = {
  Fox: 'fox',
  Calderon: 'calderon',
  'Pena Nieto': 'pena_nieto',
  AMLO: 'amlo',
  Sheinbaum: 'sheinbaum',
}

// ADMIN_DISPLAY_NAMES (diacritics map) moved to components/administrations/data.ts
// (2026-06-07) — shared with AdminSectorMatrix + AdminSummaryCard. Imported above.

// =============================================================================
// Helpers
// =============================================================================

function aggregateByAdmin(yoyData: YearOverYearChange[]): AdminAgg[] {
  return ADMINISTRATIONS.map((admin) => {
    const years = yoyData.filter(
      (y) => y.year >= admin.dataStart && y.year < admin.end
    )
    const totalContracts = years.reduce((s, y) => s + y.contracts, 0)
    const totalValue = years.reduce((s, y) => s + y.total_value, 0)
    const yearCount = years.length || 1
    const weightedRisk = totalContracts > 0
      ? years.reduce((s, y) => s + y.avg_risk * y.contracts, 0) / totalContracts
      : 0
    const weightedDA = totalContracts > 0
      ? years.reduce((s, y) => s + y.direct_award_pct * y.contracts, 0) / totalContracts
      : 0
    const weightedSB = totalContracts > 0
      ? years.reduce((s, y) => s + y.single_bid_pct * y.contracts, 0) / totalContracts
      : 0
    const weightedHR = totalContracts > 0
      ? years.reduce((s, y) => s + y.high_risk_pct * y.contracts, 0) / totalContracts
      : 0
    const maxVendors = years.length > 0 ? Math.max(...years.map((y) => y.vendor_count)) : 0
    const maxInst = years.length > 0 ? Math.max(...years.map((y) => y.institution_count)) : 0

    return {
      name: admin.name,
      contracts: totalContracts,
      totalValue,
      avgRisk: weightedRisk,
      directAwardPct: weightedDA,
      singleBidPct: weightedSB,
      highRiskPct: weightedHR,
      valueAtRisk: totalValue * weightedHR / 100,
      vendorCount: maxVendors,
      institutionCount: maxInst,
      years,
      contractsPerYear: totalContracts / yearCount,
      valuePerYear: totalValue / yearCount,
      yearCount,
    }
  })
}

// =============================================================================
// ML helpers — anomaly detection
// =============================================================================

/** Standard z-score of `value` relative to the population `values`. */
function computeZScore(values: number[], value: number): number {
  if (values.length < 3) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  return std > 0.001 ? (value - mean) / std : 0
}

/** URL-friendly slug for ?admin= deep links: "Pena Nieto" → "pena-nieto". */
const adminSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

/**
 * Chapter kicker — Spanish § kicker with Roman numeral, editorial accent.
 * `adminTag`/`tagColor` bind the chapter to the selected administration
 * (M7c cohesion: every per-admin chapter announces WHOSE file it belongs to).
 */
function ChapterKicker({
  numeral, es, en, isEs, adminTag, tagColor,
}: {
  numeral: string; es: string; en: string; isEs: boolean; adminTag?: string; tagColor?: string
}) {
  return (
    <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-1">
      § {numeral} · {isEs ? es : en}
      {adminTag && (
        <span className="font-semibold" style={{ color: tagColor ?? 'var(--color-text-muted)' }}>
          {' '}— {adminTag}
        </span>
      )}
    </div>
  )
}

export default function Administrations() {
  const { t, i18n } = useTranslation('administrations')
  const { t: ts } = useTranslation('sectors')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedAdmin, setSelectedAdmin] = useState<AdminName>(() => {
    const p = searchParams.get('admin')
    const match = p ? ADMINISTRATIONS.find((a) => adminSlug(a.name) === p) : undefined
    return (match?.name ?? 'AMLO') as AdminName
  })
  const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>('risk')
  const [compareOpen, setCompareOpen] = useState(false)
  const systemicChartRef = useRef<HTMLDivElement>(null)

  // Keep ?admin= synced with the selection so a chosen administration is a
  // shareable, reload-safe deep link (e.g. /administrations?admin=amlo).
  useEffect(() => {
    const want = adminSlug(selectedAdmin)
    if (searchParams.get('admin') !== want) {
      const next = new URLSearchParams(searchParams)
      next.set('admin', want)
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAdmin])

  // Data queries
  const { data: yoyResp, isLoading: yoyLoading, isError: yoyError } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: eventsResp } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: breaksResp } = useQuery({
    queryKey: ['analysis', 'structural-breaks'],
    queryFn: () => analysisApi.getStructuralBreaks(),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  const { data: breakdownResp, isLoading: breakdownLoading } = useQuery({
    queryKey: ['analysis', 'admin-breakdown'],
    queryFn: () => analysisApi.getAdminBreakdown(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const yoyData = yoyResp?.data ?? []
  const sectorYearData = sectorYearResp?.data ?? []
  const events = eventsResp?.events ?? []

  // Aggregations
  const adminAggs = useMemo(() => aggregateByAdmin(yoyData), [yoyData])
  const allTimeAvg = useMemo(() => {
    const total = yoyData.reduce((s, y) => s + y.contracts, 0)
    if (total === 0) return { da: 0, sb: 0, hr: 0, risk: 0 }
    return {
      da: yoyData.reduce((s, y) => s + y.direct_award_pct * y.contracts, 0) / total,
      sb: yoyData.reduce((s, y) => s + y.single_bid_pct * y.contracts, 0) / total,
      hr: yoyData.reduce((s, y) => s + y.high_risk_pct * y.contracts, 0) / total,
      risk: yoyData.reduce((s, y) => s + y.avg_risk * y.contracts, 0) / total,
    }
  }, [yoyData])

  // Per-admin "standings" summary for the matrix overall column.
  const adminSummary = useMemo(() => {
    const out: Record<string, { risk: number; da: number; hr: number; sb: number }> = {}
    for (const a of adminAggs) {
      out[a.name] = { risk: a.avgRisk, da: a.directAwardPct, hr: a.highRiskPct, sb: a.singleBidPct }
    }
    return out
  }, [adminAggs])

  const selectedAgg = adminAggs.find((a) => a.name === selectedAdmin)
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin) ?? ADMINISTRATIONS[0]

  // Era-level extras (GT case count + December spend spike) for the summary
  // card verdict lede and the §III GT anchor stat.
  const selectedEraExtras = useMemo(() => {
    const era = (breakdownResp?.eras ?? []).find((e) => e.era === ERA_KEYS[selectedAdmin])
    return { gtCaseCount: era?.gt_case_count, decSpikePct: era?.dec_spike_pct }
  }, [breakdownResp, selectedAdmin])

  // Build AdminCycleSmallMultiples data — one per administration, term year 1–6
  const adminCycleData = useMemo(() =>
    ADMINISTRATIONS.map((a) => {
      const agg = adminAggs.find((x) => x.name === a.name)
      const displayName = ADMIN_DISPLAY_NAMES[a.name] ?? a.name
      return {
        name: a.name,
        displayName,
        color: a.color,
        yearData: (agg?.years ?? []).map((y) => ({
          termYear: y.year - a.dataStart + 1,
          risk: y.avg_risk * 100,
        })).filter((d) => d.termYear >= 1 && d.termYear <= 6),
      }
    }),
    [adminAggs],
  )

  // Selected admin top vendors from breakdown endpoint
  const selectedVendors = useMemo(() => {
    const eraKey = ERA_KEYS[selectedAdmin]
    const eras = breakdownResp?.eras ?? []
    const era = eras.find((e) => e.era === eraKey)
    return (era?.top_vendors ?? []).map((v) => ({
      name: v.vendor_name,
      total_mxn: v.total_mxn,
      contracts: v.contracts,
      risk_pct: (v.avg_risk ?? 0) * 100,
    }))
  }, [breakdownResp, selectedAdmin])

  // Sector heatmap data for selected admin
  const sectorHeatmap = useMemo(() => {
    if (!selectedMeta || sectorYearData.length === 0) return []
    const filtered = sectorYearData.filter(
      (sy) => sy.year >= selectedMeta.dataStart && sy.year < selectedMeta.end
    )
    return SECTORS.map((sector) => {
      const sectorRows = filtered.filter((r) => r.sector_id === sector.id)
      const totalContracts = sectorRows.reduce((s, r) => s + r.contracts, 0)
      if (totalContracts === 0) {
        return { sectorId: sector.id, code: sector.code, name: ts(sector.code), color: sector.color, da: 0, sb: 0, hr: 0, risk: 0, contracts: 0 }
      }
      return {
        sectorId: sector.id,
        code: sector.code,
        name: ts(sector.code),
        color: sector.color,
        contracts: totalContracts,
        da: sectorRows.reduce((s, r) => s + r.direct_award_pct * r.contracts, 0) / totalContracts,
        sb: sectorRows.reduce((s, r) => s + (r.single_bid_pct ?? 0) * r.contracts, 0) / totalContracts,
        hr: sectorRows.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalContracts,
        risk: sectorRows.reduce((s, r) => s + r.avg_risk * r.contracts, 0) / totalContracts,
      }
    })
  }, [sectorYearData, selectedMeta, ts])

  // Top sectors by contract count for §IV (from live sectorHeatmap)
  const topSectors = useMemo(() =>
    [...sectorHeatmap]
      .filter((s) => s.contracts > 0)
      .sort((a, b) => b.contracts - a.contracts)
      .slice(0, 5),
    [sectorHeatmap],
  )

  // Live Admin × Sector Matrix — computed from sectorYearData (all administrations at once)
  const liveAdminSectorMatrix = useMemo(() => {
    if (sectorYearData.length === 0) return null
    const result: Record<string, Record<string, { risk: number; da: number; hr: number; sb: number }>> = {}
    for (const admin of ADMINISTRATIONS) {
      const adminRows = sectorYearData.filter(
        (sy) => sy.year >= admin.dataStart && sy.year < admin.end
      )
      result[admin.name] = {}
      MATRIX_SECTORS.forEach((sector, idx) => {
        const sectorId = idx + 1 // MATRIX_SECTORS is ordered exactly sector_id 1–12
        const rows = adminRows.filter((r) => r.sector_id === sectorId)
        const totalContracts = rows.reduce((s, r) => s + r.contracts, 0)
        result[admin.name][sector.key] = totalContracts === 0
          ? { risk: 0, da: 0, hr: 0, sb: 0 }
          : {
              risk: rows.reduce((s, r) => s + r.avg_risk * r.contracts, 0) / totalContracts,
              da: rows.reduce((s, r) => s + r.direct_award_pct * r.contracts, 0) / totalContracts,
              hr: rows.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalContracts,
              sb: rows.reduce((s, r) => s + (r.single_bid_pct ?? 0) * r.contracts, 0) / totalContracts,
            }
      })
    }
    return result
  }, [sectorYearData])

  // Events filtered to selected admin
  const adminEvents = useMemo(
    () => events.filter((e) => e.year >= selectedMeta.dataStart && e.year < selectedMeta.end),
    [events, selectedMeta]
  )

  // Structural breaks filtered to selected admin's year range
  const adminBreaks = useMemo(() => {
    const breaks = breaksResp?.breakpoints ?? []
    return breaks.filter((b) => b.year >= selectedMeta.dataStart && b.year < selectedMeta.end)
  }, [breaksResp, selectedMeta])

  // ── ML: Anomaly detection ─────────────────────────────────────────────────
  // Flag years in the selected admin where a metric deviates >1.8σ from the
  // all-time baseline (all 24 years).
  const yearAnomalies = useMemo(() => {
    if (!selectedAgg || yoyData.length < 5) return []
    const allContracts = yoyData.map((y) => y.contracts)
    const allRisk     = yoyData.map((y) => y.avg_risk * 100)
    const allDA       = yoyData.map((y) => y.direct_award_pct)
    const allHR       = yoyData.map((y) => y.high_risk_pct)
    const anomalies: Array<{ year: number; metric: string; z: number }> = []
    for (const yr of selectedAgg.years) {
      const checks = [
        { metric: 'contracts', z: computeZScore(allContracts, yr.contracts) },
        { metric: 'risk',      z: computeZScore(allRisk,      yr.avg_risk * 100) },
        { metric: 'DA%',       z: computeZScore(allDA,        yr.direct_award_pct) },
        { metric: 'HR%',       z: computeZScore(allHR,        yr.high_risk_pct) },
      ]
      for (const c of checks) {
        if (Math.abs(c.z) >= 1.8) anomalies.push({ year: yr.year, metric: c.metric, z: c.z })
      }
    }
    return anomalies.sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 6)
  }, [yoyData, selectedAgg])

  const isLoading = yoyLoading || syLoading
  const hasNoData = !isLoading && yoyData.length === 0

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 w-96" />
        <Skeleton className="h-72" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (yoyError || hasNoData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-risk-critical/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-5 w-5 text-risk-critical" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">{t('loadError', 'Data unavailable')}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('loadErrorDetail', 'The server may be temporarily unavailable. Administration data will appear once the connection is restored.')}
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-text-muted">
            RUBLI — {t('classifiedHeader.eyebrow', 'Political cycle analysis')}
          </p>
        </div>
      </div>
    )
  }

  const isEs = (i18n.language?.startsWith('es') ?? false)

  // Derived data for the 25-yr trend chart (systemic closing section)
  const transitionYears = [2006, 2012, 2018, 2024]
  const adminLabels: Record<number, string> = { 2006: 'Calderón', 2012: 'Peña', 2018: 'AMLO', 2024: 'Sheinbaum' }
  const breaksData = breaksResp

  // ── M7c module identity — the EXPEDIENTE folder carries the selected
  // administration's party color; the PATRÓN folder carries the platform ochre.
  const folderColor = PARTY_COLORS[selectedMeta.party] || '#64748b'
  const selectedDisplay = ADMIN_DISPLAY_NAMES[selectedAdmin] ?? selectedAdmin
  const adminTag = `${selectedDisplay} · ${selectedMeta.dataStart}–${Math.min(selectedMeta.end, 2025)}`

  return (
    <div className="min-h-screen bg-background relative">
      {/* Page paper-grain */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="administrations-page-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="19" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#administrations-page-paper-grain)" />
      </svg>
      <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ zIndex: 1 }}>

        {/* ── Compact folio header — no sledgehammer ── */}
        <header className="mb-6 pb-5 border-b border-border">
          <div
            className="flex items-center gap-3 mb-3"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XI</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>
                {isEs
                  ? 'Análisis sexenal · 2002–2025'
                  : 'Cross-administration analysis · 2002–2025'}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(28px, 4.5vw, 44px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.012em',
                }}
                className="text-text-primary"
              >
                {isEs ? (
                  <>Cinco sexenios, <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>un patrón</span>.</>
                ) : (
                  <>Five administrations, <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>one pattern</span>.</>
                )}
              </h1>
              <p
                style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
                className="mt-2 text-[15px] leading-relaxed text-text-secondary max-w-[64ch]"
              >
                {isEs
                  ? 'Tres millones de contratos federales bajo cinco presidentes. Elija una administración — el expediente responde.'
                  : 'Three million federal contracts under five presidents. Choose an administration — the file answers.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <FuentePill source="COMPRANET" verified={true} />
              <MetodologiaTooltip
                title={t('narrative')}
                body={t('comparisonTableDesc')}
                link="/methodology"
              />
              <ShareButton label={t('share', 'Share')} />
            </div>
          </div>
        </header>

        <div className="space-y-8 max-w-[1600px] mx-auto">

          {/* ════════════════════════════════════════════════════════════════
              MÓDULO 1 · EL EXPEDIENTE — one bounded folder. EVERYTHING inside
              (summary + chapters § I–IV) belongs to the SELECTED administration.
              The party-color spine runs the full height (M7c cohesion refactor).
              ════════════════════════════════════════════════════════════════ */}
          <section
            aria-label={isEs ? `Expediente · ${selectedDisplay}` : `Case file · ${selectedDisplay}`}
            className="rounded-sm border border-border/50 bg-background-card overflow-hidden"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: folderColor,
              boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
              transition: 'border-color 0.3s ease',
            }}
          >
          <AdminSummaryCard
            aggs={adminAggs}
            selected={selectedAdmin}
            onSelect={setSelectedAdmin}
            allTimeAvg={allTimeAvg}
            displayNames={ADMIN_DISPLAY_NAMES}
            isEs={isEs}
            eraExtras={selectedEraExtras}
            embedded
          />

          {/* ── § I · LA TRAYECTORIA — yearly deep dive (editorial rebuild R1) ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5">
            {selectedAgg && selectedAgg.years.length > 0 ? (() => {
              const years = selectedAgg.years
              // Worst-year claim for the headline (max high_risk_pct).
              const worst = years.reduce((m, y) => (y.high_risk_pct > m.high_risk_pct ? y : m), years[0])
              const worstYear = worst.year
              const worstHR = worst.high_risk_pct
              const maxC = Math.max(...years.map((y) => y.contracts), 1)
              const maxSeries = Math.max(
                ...years.map((y) => Math.max(y.direct_award_pct, y.single_bid_pct, y.high_risk_pct)),
                allTimeAvg.da, 1,
              )
              const series: LineSeries<typeof years[number]>[] = [
                { key: 'direct_award_pct', label: isEs ? 'Adj. Directa %' : 'Direct Award %', colorToken: 'risk-critical' },
                { key: 'single_bid_pct', label: isEs ? 'Licitación Única %' : 'Single Bid %', colorToken: 'text-muted' },
                { key: 'high_risk_pct', label: isEs ? 'Alto Riesgo %' : 'High Risk %', colorToken: 'risk-medium' },
              ]
              // Top-3 admin events by impact (high first), de-duplicated to one vrule per year.
              const impactRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
              const topEvents = [...adminEvents]
                .filter((ev) => years.some((y) => y.year === ev.year))
                .sort((a, b) => (impactRank[a.impact] ?? 3) - (impactRank[b.impact] ?? 3))
              const seenEventYears = new Set<number>()
              const eventAnnos: ChartAnnotation[] = []
              // Bilingual fallbacks for backend event types not in the i18n map
              // (the live temporal-events API emits free strings like 'election').
              const evTypeFallback: Record<string, string> = {
                election: isEs ? 'Elección' : 'Election',
                crisis: 'Crisis',
                reform: isEs ? 'Reforma' : 'Reform',
                audit: isEs ? 'Auditoría' : 'Audit',
                scandal: isEs ? 'Escándalo' : 'Scandal',
                pandemic: isEs ? 'Pandemia' : 'Pandemic',
              }
              for (const ev of topEvents) {
                if (eventAnnos.length >= 3) break
                if (seenEventYears.has(ev.year)) continue
                seenEventYears.add(ev.year)
                const typeLabel = ev.type ? t(`eventTypes.${ev.type}`, evTypeFallback[ev.type] ?? ev.type) : ''
                eventAnnos.push({
                  kind: 'vrule',
                  x: ev.year,
                  label: typeLabel ? `${ev.year} · ${typeLabel}` : `${ev.year}`,
                  tone: 'info',
                })
              }
              const breakYears = new Set<number>()
              const breakAnnos: ChartAnnotation[] = []
              for (const b of adminBreaks) {
                if (breakYears.has(b.year)) continue
                if (!years.some((y) => y.year === b.year)) continue
                breakYears.add(b.year)
                breakAnnos.push({ kind: 'vrule', x: b.year, label: `~${b.year}`, tone: 'warn' })
              }
              const annotations: ChartAnnotation[] = [
                { kind: 'hrule', y: allTimeAvg.da, label: `${isEs ? 'Promedio nacional' : 'National average'} ${allTimeAvg.da.toFixed(1)}%`, tone: 'oecd' },
                ...eventAnnos,
                ...breakAnnos,
              ]
              return (
                <EditorialChartFrame
                  kicker={`§ I · ${isEs ? 'LA TRAYECTORIA' : 'THE YEARLY RECORD'} — ${adminTag}`}
                  headline={isEs
                    ? `${worstYear}: el año de mayor riesgo del sexenio — ${worstHR.toFixed(1)}% de contratos de alto riesgo`
                    : `${worstYear}: the term's highest-risk year — ${worstHR.toFixed(1)}% high-risk contracts`}
                  footer={
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      COMPRANET · RUBLI v0.8.5
                    </span>
                  }
                  tone="bare"
                >
                  <EditorialLineChart
                    data={years}
                    xKey="year"
                    series={series}
                    yFormat="pct"
                    yDomain={[0, Math.ceil(maxSeries) + 10]}
                    annotations={annotations}
                    height={300}
                  />
                  {/* Contract-volume micro bar-strip — LINEAR scale (kills the old sqrt lie) */}
                  <svg viewBox="0 0 620 28" width="100%" height={28} role="img" aria-label="Contracts per year — linear scale" className="mt-2 block">
                    {years.map((yr, i) => {
                      const n = years.length
                      const slot = 620 / n
                      const bw = Math.max(2, slot * 0.62)
                      const x = i * slot + (slot - bw) / 2
                      const h = (yr.contracts / maxC) * 24
                      return <rect key={yr.year} x={x} y={28 - h} width={bw} height={h} fill={selectedMeta.color} fillOpacity={0.45} rx={0.5} />
                    })}
                    {[0, years.length - 1].map((i) => {
                      const n = years.length
                      const slot = 620 / n
                      const x = i * slot + slot / 2
                      const anchor = i === 0 ? 'start' : 'end'
                      return (
                        <text key={`lbl-${i}`} x={i === 0 ? x - slot / 2 + 1 : x + slot / 2 - 1} y={8} fill="var(--color-text-muted)" fontSize={8.5} fontFamily="monospace" textAnchor={anchor}>
                          {formatNumber(years[i].contracts)}
                        </text>
                      )
                    })}
                  </svg>
                  <p className="text-[9px] font-mono text-text-muted mt-0.5">
                    {isEs ? 'Contratos por año · escala lineal' : 'Contracts per year · linear scale'}
                  </p>
                </EditorialChartFrame>
              )
            })() : (
              <div>
                <ChapterKicker numeral="I" es="LA TRAYECTORIA" en="THE YEARLY RECORD" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
                <div className="h-[320px] flex items-center justify-center text-text-muted text-sm">
                  {t('noData')}
                </div>
              </div>
            )}
            <div className="mt-3">
              {yearAnomalies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3 w-3 text-risk-medium" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted font-mono">
                      {t('aiDetectedAnomalies')}
                    </span>
                    <span className="text-[10px] text-text-muted">— {t('anomaliesNote')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {yearAnomalies.map((a) => (
                      <span
                        key={`${a.year}-${a.metric}`}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium',
                          Math.abs(a.z) >= 2.5
                            ? 'bg-risk-critical/10 text-risk-critical border border-risk-critical/20'
                            : 'bg-risk-medium/10 text-risk-medium border border-risk-medium/20'
                        )}
                        title={`${a.metric} in ${a.year}: ${a.z.toFixed(2)}σ from all-time average`}
                      >
                        {a.year} {a.metric} {a.z > 0 ? '+' : ''}{a.z.toFixed(1)}σ
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 pt-3 border-t border-border/20 text-[10px] text-text-muted leading-relaxed">
                {t('evidenceSection.inflationNote')}
              </p>
            </div>
          </div>

          {/* ── § II · LA HUELLA SECTORIAL — sector risk profile ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <ChapterKicker numeral="II" es="LA HUELLA SECTORIAL" en="THE SECTOR FOOTPRINT" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
                  <h3 className="text-sm font-mono text-text-primary">
                    {t('sectorProfile', { admin: selectedAdmin })}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {t('heatmapSubtitle')}
                  </p>
                </div>
                <TableExportButton
                  filename="rubli-administraciones-sectores.csv"
                  data={sectorHeatmap.filter((s) => s.contracts > 0).map((s) => ({
                    sector: s.name,
                    direct_award_pct: s.da.toFixed(1) + '%',
                    single_bid_pct: s.sb.toFixed(1) + '%',
                    high_risk_pct: s.hr.toFixed(1) + '%',
                    avg_risk: (s.risk * 100).toFixed(1) + '%',
                  }))}
                  className="shrink-0"
                />
              </div>
            </div>
            <div>
              {(() => {
                const ranked = sectorHeatmap.filter((s) => s.contracts > 0).sort((a, b) => b.hr - a.hr)
                if (ranked.length === 0) {
                  return <div className="h-24 flex items-center justify-center text-text-muted text-sm">{t('noData')}</div>
                }
                const adminAvgHR = selectedAgg?.highRiskPct ?? 0
                const top = ranked[0]
                const scaleMax = Math.max(...ranked.map((s) => s.hr), adminAvgHR, 1) * 1.15
                const rows: DotStripRow[] = ranked.map((s) => ({
                  label: s.name,
                  sublabel: `DA ${s.da.toFixed(0)}% · ${formatNumber(s.contracts)}`,
                  fraction: s.hr / scaleMax,
                  colorRaw: s.color,
                  valueLabel: s.hr.toFixed(1) + '%',
                }))
                return (
                  <>
                    {adminAvgHR > 0 && (
                      <p className="text-[11px] font-mono mb-3 leading-relaxed text-text-secondary">
                        <span style={{ color: 'var(--color-accent)' }}>▲</span> {top.name}: {top.hr.toFixed(1)}% {isEs ? 'alto riesgo' : 'high risk'} —{' '}
                        <span style={{ color: 'var(--color-accent)' }}>{(top.hr / adminAvgHR).toFixed(1)}×</span> {isEs ? 'el promedio del sexenio' : 'the term average'}
                      </p>
                    )}
                    <DotStrip
                      rows={rows}
                      labelWidth={150}
                      rowHeight={30}
                      oecdMark={{
                        fraction: adminAvgHR / scaleMax,
                        label: `${isEs ? 'Promedio del sexenio' : 'Term average'} · ${adminAvgHR.toFixed(1)}%`,
                      }}
                    />
                  </>
                )
              })()}
            </div>
          </div>

          {/* ── § III · EL EXPEDIENTE — chronological case-file spine (R3) ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5" id="expediente">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <ChapterKicker numeral="III" es="EL EXPEDIENTE" en="THE CASE FILE" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
                  <h3 className="text-sm font-mono text-text-primary">
                    {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">{t('keyEventsSubtitle')}</p>
                </div>
                {selectedEraExtras.gtCaseCount != null && (
                  <span className="text-[10px] font-mono text-text-muted shrink-0 text-right">
                    {selectedEraExtras.gtCaseCount} {isEs ? 'casos documentados (GT)' : 'documented cases (GT)'}
                  </span>
                )}
              </div>
            </div>
            <ExpedienteSpine
              adminName={selectedAdmin}
              isEs={isEs}
              gtCaseCount={selectedEraExtras.gtCaseCount}
              events={HARDCODED_EVENTS[selectedAdmin] ?? []}
            />
          </div>

          {/* ── § IV · LOS BENEFICIARIOS — top vendors + top sectors ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5">
            <div className="mb-4">
              <ChapterKicker numeral="IV" es="LOS BENEFICIARIOS" en="THE BENEFICIARIES" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
              <h3 className="text-sm font-mono text-text-primary">{t('vendorSection.subtitle')}</h3>
            </div>
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                <AdminVendorBreakdown
                  vendors={selectedVendors}
                  eraColor={selectedMeta.color}
                  loading={breakdownLoading}
                />
                {topSectors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-muted tracking-[0.15em] uppercase mb-2">
                      {t('dossier.topSectors')}
                    </h4>
                    <div className="space-y-1.5">
                      {topSectors.map((sector, idx) => {
                        const maxContracts = topSectors[0]?.contracts ?? 1
                        const pct = Math.min(100, (sector.contracts / maxContracts) * 100)
                        return (
                          <div key={sector.sectorId} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-text-muted w-4 text-right flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sector.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[10px] mb-0.5">
                                <span className="text-text-secondary truncate">{sector.name}</span>
                                <span className="font-mono text-text-muted ml-1 flex-shrink-0">
                                  {formatNumber(sector.contracts)}
                                </span>
                              </div>
                              <DotBar
                                value={pct}
                                max={100}
                                color={sector.color}
                                emptyColor="var(--color-background-elevated)"
                                emptyStroke="var(--color-border-hover)"
                                dots={20}
                                dotR={1.75}
                                dotGap={4.5}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[10px] font-mono text-text-muted/60 mt-1.5">
                      {isEs ? '1 ● ≈ 5% del sector líder' : '1 ● ≈ 5% of the leading sector'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Folder colophon — explicit module end ── */}
          <div className="border-t border-border/40 px-5 py-3 text-center">
            <span
              className="text-[9px] font-mono uppercase tracking-[0.3em] text-text-muted"
              style={{ fontStyle: 'italic' }}
            >
              — {isEs ? 'fin del expediente' : 'end of file'} · <span style={{ color: folderColor, fontWeight: 700 }}>{selectedDisplay}</span> —
            </span>
          </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════
              MÓDULO 2 · EL PATRÓN — the systemic folder. Five terms compared;
              the SELECTED administration is threaded through every chart as a
              ▶ highlight. Ochre spine = platform voice (M7c cohesion refactor).
              ════════════════════════════════════════════════════════════════ */}
          <section
            aria-label={isEs ? 'El patrón — cinco sexenios comparados' : 'The pattern — five terms compared'}
            className="rounded-sm border border-border/50 bg-background-card overflow-hidden"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: 'var(--color-accent)',
              boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
            }}
          >
          {/* Module header */}
          <div className="px-4 sm:px-5 py-5">
            <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-1.5">
              § V · {isEs ? 'EL PATRÓN · CINCO SEXENIOS COMPARADOS' : 'THE PATTERN · FIVE TERMS COMPARED'}
            </div>
            <h2
              style={{
                fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(20px, 2.6vw, 28px)',
                lineHeight: 1.1,
              }}
              className="text-text-primary"
            >
              {isEs ? (
                <>¿Cómo se sitúa <span style={{ fontStyle: 'normal', fontWeight: 600, color: folderColor }}>{selectedDisplay}</span> frente a los otros cuatro?</>
              ) : (
                <>How does <span style={{ fontStyle: 'normal', fontWeight: 600, color: folderColor }}>{selectedDisplay}</span> compare against the other four?</>
              )}
            </h2>
            <p className="mt-1.5 text-xs text-text-muted max-w-[64ch] leading-relaxed">
              {isEs
                ? 'Las gráficas de este módulo comparan los cinco sexenios; la administración seleccionada aparece marcada con ▶.'
                : 'Charts in this module compare all five terms; the selected administration is marked with ▶.'}
            </p>
          </div>

          {/* 25-year systemic trend */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5">
          <EditorialChartFrame
            kicker={isEs ? '§ TENDENCIAS 25 AÑOS' : '§ 25-YEAR SYSTEMIC TRENDS'}
            headline={isEs
              ? '65.3% de contratos federales adjudicados sin competencia — en cada administración'
              : '65.3% of federal contracts awarded without open competition — every administration'}
            footer={
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  COMPRANET 2000–2025 · RUBLI v0.8.5
                </span>
                <ChartDownloadButton targetRef={systemicChartRef} filename="systemic-patterns-25yr" />
              </div>
            }
            tone="bare"
          >
            {yoyData.length > 0 ? (
              <div ref={systemicChartRef}>
                {(() => {
                  // Era bands — the page-selected administration gets a ▶ marker
                  // so the systemic chart visibly threads back to the selection.
                  const eraBands: Array<{ name: AdminName; label: string; x1: number; x2: number }> = [
                    { name: 'Fox', label: 'Fox · PAN', x1: 2002, x2: 2006 },
                    { name: 'Calderon', label: 'Calderón · PAN', x1: 2006, x2: 2012 },
                    { name: 'Pena Nieto', label: 'EPN · PRI', x1: 2012, x2: 2018 },
                    { name: 'AMLO', label: 'AMLO · MORENA', x1: 2018, x2: 2024 },
                    { name: 'Sheinbaum', label: 'Sheinbaum · MORENA', x1: 2024, x2: 2026 },
                  ]
                  const annotations: ChartAnnotation[] = [
                    ...eraBands.map<ChartAnnotation>((b) => ({
                      kind: 'band',
                      x1: b.x1,
                      x2: b.x2,
                      label: b.name === selectedAdmin ? `▶ ${b.label}` : b.label,
                      tone: 'admin',
                    })),
                    { kind: 'hrule', y: 65.3, label: t('patternsView.nationalAvgLabel'), tone: 'oecd' },
                    ...transitionYears.map<ChartAnnotation>((year) => ({
                      kind: 'vrule', x: year, label: adminLabels[year] ?? '', tone: 'info',
                    })),
                    ...((breaksData?.breakpoints ?? [])
                      .filter((bp, i, arr) => arr.findIndex(b => b.year === bp.year) === i)
                      .map<ChartAnnotation>((bp) => ({
                        kind: 'vrule', x: bp.year, label: `~${bp.year}`, tone: 'warn',
                      }))),
                    // F4 — name the all-time peak direct-award year (M7-3 debt).
                    ...(yoyData.length > 0 ? (() => {
                      const peak = yoyData.reduce((m, r) => (r.direct_award_pct > m.direct_award_pct ? r : m), yoyData[0])
                      return [{
                        kind: 'vrule' as const,
                        x: peak.year,
                        label: `${isEs ? 'Máximo histórico' : 'All-time peak'} · ${peak.direct_award_pct.toFixed(1)}%`,
                        tone: 'warn' as const,
                      }]
                    })() : []),
                  ]
                  const seriesData = yoyData.map((r) => ({
                    ...r,
                    avg_risk_x100: (r.avg_risk ?? 0) * 100,
                  }))
                  const series: LineSeries<typeof seriesData[number]>[] = [
                    { key: 'direct_award_pct', label: isEs ? 'Adj. Directa %' : 'Direct Award %', colorToken: 'risk-critical' },
                    { key: 'single_bid_pct', label: isEs ? 'Licitación Única %' : 'Single Bid %', colorToken: 'text-muted' },
                    { key: 'high_risk_pct', label: isEs ? 'Alto Riesgo %' : 'High Risk %', colorToken: 'risk-medium' },
                  ]
                  return (
                    <EditorialLineChart
                      data={seriesData}
                      xKey="year"
                      series={series}
                      yFormat="pct"
                      yDomain={[35, 90]}
                      annotations={annotations}
                      height={360}
                    />
                  )
                })()}
              </div>
            ) : (
              <div className="h-[360px] flex items-center justify-center text-text-muted text-sm">
                {t('patternsView.noData')}
              </div>
            )}
            <p className="mt-3 text-xs text-text-muted leading-relaxed">
              {t('patternsView.chartFootnote')}
            </p>
            {breaksData?.breakpoints && breaksData.breakpoints.length > 0 && (
              <p className="text-[10px] text-risk-high/80 font-mono mt-1">
                <Activity className="inline-block h-3 w-3 mr-0.5 align-text-bottom" aria-hidden="true" /> {t('patternsView.regimeShiftNote')}
              </p>
            )}
          </EditorialChartFrame>
          </div>

          {/* Five presidents ranked by risk */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-5">
            <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-1">
              {isEs ? '§ CINCO PRESIDENTES · RIESGO COMPARADO' : '§ FIVE PRESIDENTS · RISK COMPARED'}
            </div>
            <p className="text-xs text-text-muted mb-4 max-w-[62ch] leading-relaxed">
              {isEs
                ? 'Proporción de contratos de alto riesgo por administración, de mayor a menor. La línea cian marca el promedio nacional.'
                : 'Share of high-risk contracts by administration, ranked high to low. The cyan line marks the national average.'}
            </p>
            {adminAggs.length > 0 && (() => {
              const ranked = [...adminAggs].sort((a, b) => b.highRiskPct - a.highRiskPct)
              const scaleMax = Math.max(...adminAggs.map((ag) => ag.highRiskPct), allTimeAvg.hr, 1) * 1.15
              const rows: DotStripRow[] = ranked.map((a) => {
                const isAmlo = a.name === 'AMLO'
                const isSelected = a.name === selectedAdmin
                const adminMeta = ADMINISTRATIONS.find((ad) => ad.name === a.name)
                const partyColor = PARTY_COLORS[adminMeta?.party || ''] || '#64748b'
                const multiple = allTimeAvg.hr > 0 ? a.highRiskPct / allTimeAvg.hr : 0
                const party = adminMeta?.party ?? ''
                const baseLabel = ADMIN_DISPLAY_NAMES[a.name] ?? a.name
                return {
                  // ▶ threads the page selection through the systemic ranking (M7c)
                  label: isSelected ? `▶ ${baseLabel}` : baseLabel,
                  sublabel: isAmlo
                    ? `${party} · ${multiple.toFixed(1)}× ${isEs ? 'promedio' : 'avg'}`
                    : party,
                  fraction: a.highRiskPct / scaleMax,
                  colorRaw: isAmlo ? RISK_COLORS.critical : partyColor,
                  valueLabel: a.highRiskPct.toFixed(1) + '%',
                }
              })
              return (
                <DotStrip
                  rows={rows}
                  labelWidth={150}
                  rowHeight={32}
                  oecdMark={{
                    fraction: allTimeAvg.hr / scaleMax,
                    label: isEs
                      ? `Promedio nacional · ${allTimeAvg.hr.toFixed(1)}%`
                      : `National average · ${allTimeAvg.hr.toFixed(1)}%`,
                  }}
                />
              )
            })()}
            <p className="mt-3 text-[10px] text-text-muted italic leading-relaxed">
              {t('evidenceSection.registryNote')}
            </p>
          </div>

          {/* Admin × Sector matrix */}
          <div className="border-t border-border/40">
            <AdminSectorMatrix
              selectedAdmin={selectedAdmin}
              liveMatrix={liveAdminSectorMatrix}
              summary={adminSummary}
              metric={matrixMetric}
              onMetricChange={setMatrixMetric}
              bare
            />
          </div>

          {/* Lame-duck / term-year small multiples — selected panel ringed */}
          <div className="border-t border-border/40">
            <AdminCycleSmallMultiples
              administrations={adminCycleData}
              isEs={isEs}
              referencePct={allTimeAvg.risk * 100}
              selectedName={selectedAdmin}
              bare
            />
          </div>

          {/* Period Comparison tool (collapsed footer utility) */}
          <div className="border-t border-border/40">
            <button
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-background-elevated/40 transition-colors"
              onClick={() => setCompareOpen((v) => !v)}
              aria-expanded={compareOpen}
            >
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-text-muted">
                {isEs ? '§ COMPARAR DOS PERIODOS' : '§ COMPARE TWO PERIODS'}
              </span>
              <span className="text-text-muted text-xs font-mono">{compareOpen ? '−' : '+'}</span>
            </button>
            {compareOpen && (
              <div className="px-4 sm:px-5 pb-4">
                <ComparePeriodView />
              </div>
            )}
          </div>
          </section>

          <PageFooter />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

// Hardcoded key events per administration — sourced from public records.
// Bilingual since 2026-06-07: `title` EN, `titleEs` ES (previously English-only,
// which leaked untranslated strings into the Spanish UI).
const HARDCODED_EVENTS: Record<string, Array<{ year: number; title: string; titleEs: string; type: 'reform' | 'scandal' | 'audit' | 'crisis'; impact: 'high' | 'medium' | 'low' }>> = {
  Fox: [
    { year: 2002, title: 'COMPRANET launched as digital procurement platform', titleEs: 'COMPRANET se lanza como plataforma digital de contratación', type: 'reform', impact: 'medium' },
    { year: 2003, title: 'First ASF audit on widespread direct-award contracting', titleEs: 'Primera auditoría de la ASF sobre adjudicación directa generalizada', type: 'audit', impact: 'medium' },
    { year: 2004, title: 'PEMEXGATE scandal: diversions in maintenance contracts', titleEs: 'Escándalo PEMEXGATE: desvíos en contratos de mantenimiento', type: 'scandal', impact: 'high' },
    { year: 2005, title: 'Acquisitions Law reform — new transparency requirements', titleEs: 'Reforma a la Ley de Adquisiciones — nuevos requisitos de transparencia', type: 'reform', impact: 'medium' },
  ],
  Calderon: [
    { year: 2007, title: 'National Security Strategy launched — surge in defense contracts', titleEs: 'Estrategia Nacional de Seguridad — auge de contratos de defensa', type: 'crisis', impact: 'medium' },
    { year: 2008, title: 'Global financial crisis — federal spending contraction', titleEs: 'Crisis financiera global — contracción del gasto federal', type: 'crisis', impact: 'medium' },
    { year: 2009, title: 'AH1N1 flu: emergency procurement with minimal bidding', titleEs: 'Influenza AH1N1: compras de emergencia con licitación mínima', type: 'crisis', impact: 'high' },
    { year: 2010, title: 'PEMEX hires Odebrecht for Etileno XXI — bribery scheme begins', titleEs: 'PEMEX contrata a Odebrecht para Etileno XXI — inicia esquema de sobornos', type: 'scandal', impact: 'high' },
    { year: 2012, title: 'New Government Procurement Law — broadest reform in 15 years', titleEs: 'Nueva Ley de Contrataciones Públicas — la reforma más amplia en 15 años', type: 'reform', impact: 'high' },
  ],
  'Pena Nieto': [
    { year: 2014, title: 'Casa Blanca scandal — conflict of interest with contractor Grupo Higa', titleEs: 'Escándalo de la Casa Blanca — conflicto de interés con el contratista Grupo Higa', type: 'scandal', impact: 'high' },
    { year: 2015, title: 'IMSS ghost-company network uncovered by ASF audit', titleEs: 'Red de empresas fantasma del IMSS descubierta por auditoría de la ASF', type: 'scandal', impact: 'high' },
    { year: 2016, title: 'Odebrecht-PEMEX investigation — bribes for infrastructure contracts', titleEs: 'Investigación Odebrecht-PEMEX — sobornos por contratos de infraestructura', type: 'scandal', impact: 'high' },
    { year: 2017, title: 'La Estafa Maestra: MXN 7.6B diverted through public universities', titleEs: 'La Estafa Maestra: 7,600 MDP desviados a través de universidades públicas', type: 'scandal', impact: 'high' },
    { year: 2017, title: 'September earthquakes — emergency procurement without bidding', titleEs: 'Sismos de septiembre — compras de emergencia sin licitación', type: 'crisis', impact: 'medium' },
    { year: 2018, title: 'CompraNet 5.0 reform — improved traceability', titleEs: 'Reforma CompraNet 5.0 — mejor trazabilidad', type: 'reform', impact: 'medium' },
  ],
  AMLO: [
    { year: 2019, title: 'Austerity decree — drastic reduction in service contracts', titleEs: 'Decreto de austeridad — reducción drástica de contratos de servicios', type: 'reform', impact: 'high' },
    { year: 2019, title: 'Militarization of megaprojects (AIFA, Tren Maya) — direct awards to Army', titleEs: 'Militarización de megaproyectos (AIFA, Tren Maya) — adjudicaciones directas al Ejército', type: 'reform', impact: 'high' },
    { year: 2020, title: 'COVID-19 pandemic: emergency procurement of ventilators and medicines', titleEs: 'Pandemia de COVID-19: compras de emergencia de ventiladores y medicinas', type: 'crisis', impact: 'high' },
    { year: 2021, title: 'Segalmex scandal — MXN 9.4B fraud in food distribution', titleEs: 'Escándalo Segalmex — fraude de 9,400 MDP en distribución de alimentos', type: 'scandal', impact: 'high' },
    { year: 2022, title: 'SAT publishes final EFOS list: 38 COMPRANET vendors confirmed as ghost companies', titleEs: 'El SAT publica la lista definitiva de EFOS: 38 proveedores de COMPRANET confirmados como empresas fantasma', type: 'audit', impact: 'high' },
    { year: 2023, title: 'Tren Maya: FONATUR awards MXN 180M in direct contracts to Sedena', titleEs: 'Tren Maya: FONATUR adjudica 180 MDP en contratos directos a la Sedena', type: 'scandal', impact: 'medium' },
  ],
  Sheinbaum: [
    { year: 2024, title: "Claudia Sheinbaum inaugurated — Mexico's first female president", titleEs: 'Claudia Sheinbaum toma posesión — primera presidenta de México', type: 'reform', impact: 'low' },
    { year: 2024, title: 'Continuation of militarized infrastructure (AIFA, Dos Bocas refinery)', titleEs: 'Continuación de la infraestructura militarizada (AIFA, refinería Dos Bocas)', type: 'reform', impact: 'medium' },
    { year: 2025, title: 'Preliminary data — analysis ongoing as records accumulate', titleEs: 'Datos preliminares — análisis en curso conforme se acumulan registros', type: 'audit', impact: 'low' },
  ],
}

// AdminSectorMatrix, PoliticalCycleView, ComparePeriodView extracted to
// components/administrations/ (2026-05-15). AdminSummaryCard added 2026-06-07;
// it replaces the sledgehammer hero, the selector-card grid, the StatCards
// row, and AdminDossierPanel (kept on disk, no longer mounted here).
