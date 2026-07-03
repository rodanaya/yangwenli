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
 *   § IV  Los Beneficiarios — top vendors + top sectors (+ top-100 drill-down)
 *   § V   Los Compradores  — top spending institutions for the term (the buyers)
 *   § VI  El Ciclo del Sexenio — term-year trajectory + sector scorecard
 *   compare tool (collapsed) · PageFooter
 */

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminSummaryCard } from '@/components/administrations/AdminSummaryCard'
import { ComparePeriodView } from '@/components/administrations/ComparePeriodView'
import { AdminSurvivorsSlope, type SurvivorColumn } from '@/components/administrations/AdminSurvivorsSlope'
import { SeamStrip, type SeamPoint, type SeamAdmin, type Seam } from '@/components/administrations/SeamStrip'
import { AdminSectorDeviation, type SectorDeviationRow } from '@/components/administrations/AdminSectorDeviation'
import { OfficialTenureBands } from '@/components/administrations/OfficialTenureBands'
import { ExpedienteSpine } from '@/components/administrations/ExpedienteSpine'
import { AdminVendorsDeepList } from '@/components/administrations/AdminVendorsDeepList'
import { AdminBuyersSection } from '@/components/administrations/AdminBuyersSection'
import { GapRecoveryPanel } from '@/components/gap/GapRecoveryPanel'
import {
  ADMINISTRATIONS,
  ADMIN_DISPLAY_NAMES,
  PARTY_COLORS,
} from '@/components/administrations/data'
import type {
  AdminName,
  AdminAgg,
} from '@/components/administrations/types'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { analysisApi, officialsApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { TableExportButton } from '@/components/TableExportButton'
import { AlertTriangle } from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { PageFooter } from '@/components/layout/PageFooter'
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
import { ShareButton } from '@/components/ShareButton'
import { DotBar } from '@/components/ui/DotBar'
import {
  EditorialSparkline,
  tokenColor,
  formatValue,
} from '@/components/charts/editorial'
import { EditorialChartFrame } from '@/components/stories/EditorialChartFrame'

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
// (2026-06-07) — shared with AdminSummaryCard. Imported above.

// Localized labels for the §I anomaly-chip metric keys (AD = Adjudicación
// Directa, AR = Alto Riesgo — the abbreviations used elsewhere on the page).
const ANOMALY_METRIC_LABELS: Record<string, { en: string; es: string }> = {
  contracts: { en: 'contracts', es: 'contratos' },
  risk:      { en: 'risk',      es: 'riesgo' },
  'DA%':     { en: 'DA%',       es: 'AD%' },
  'HR%':     { en: 'HR%',       es: 'AR%' },
}

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
    <div className="text-[13px] tracking-[0.25em] uppercase font-bold text-accent mb-1">
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
  const [compareOpen, setCompareOpen] = useState(false)
  // §IV drill-down: the top-100 beneficiaries archive drawer (lazy, mount-on-open).
  // Open by default — the full ledger is the section users came for.
  const [vendorsDeepOpen, setVendorsDeepOpen] = useState(true)

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

  // Collapse the §IV drill-down drawer when the reader switches administration —
  // the open archive of one term shouldn't bleed into the next.
  useEffect(() => {
    setVendorsDeepOpen(false)
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

  const { data: breakdownResp, isLoading: breakdownLoading } = useQuery({
    queryKey: ['analysis', 'admin-breakdown'],
    queryFn: () => analysisApi.getAdminBreakdown(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  // Cross-institution movers — administration-agnostic (2018+ window), so it
  // sits as a window-wide coda after the per-sexenio modules.
  const { data: moversResp } = useQuery({
    queryKey: ['officials', 'movers', 24],
    queryFn: () => officialsApi.getMovers(24, 50),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const yoyData = yoyResp?.data ?? []
  const sectorYearData = sectorYearResp?.data ?? []

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

  const selectedAgg = adminAggs.find((a) => a.name === selectedAdmin)
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin) ?? ADMINISTRATIONS[0]

  // Era-level extras (GT case count + December spend spike) for the summary
  // card verdict lede and the §III GT anchor stat.
  const selectedEraExtras = useMemo(() => {
    const era = (breakdownResp?.eras ?? []).find((e) => e.era === ERA_KEYS[selectedAdmin])
    return { gtCaseCount: era?.gt_case_count, decSpikePct: era?.dec_spike_pct }
  }, [breakdownResp, selectedAdmin])


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

  // ── ML: Anomaly detection ─────────────────────────────────────────────────
  // Flag years in the selected admin where a metric deviates >1.8σ from the
  // all-time baseline (all 24 years).
  const yearAnomalies = useMemo(() => {
    if (!selectedAgg || yoyData.length < 5) return []
    // Baseline excludes junk micro-volume years (2000: 1 contract, 2001: 19,
    // 2004: 7) whose extreme rates (HR 100%/0% on a handful of contracts) blow
    // up the std and shift the mean, distorting which years get flagged. DC9.
    const baseYears = yoyData.filter((y) => y.contracts >= 1000)
    if (baseYears.length < 5) return []
    const allContracts = baseYears.map((y) => y.contracts)
    const allRisk     = baseYears.map((y) => y.avg_risk * 100)
    const allDA       = baseYears.map((y) => y.direct_award_pct)
    const allHR       = baseYears.map((y) => y.high_risk_pct)
    const anomalies: Array<{ year: number; metric: string; z: number }> = []
    for (const yr of selectedAgg.years) {
      if (yr.contracts < 1000) continue
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
          <p className="text-[12px] tracking-[0.2em] uppercase text-text-muted">
            RUBLI — {t('classifiedHeader.eyebrow', 'Political cycle analysis')}
          </p>
        </div>
      </div>
    )
  }

  const isEs = (i18n.language?.startsWith('es') ?? false)

  // ── M7c module identity — the EXPEDIENTE folder carries the selected
  // administration's party color; the PATRÓN folder carries the platform ochre.
  const folderColor = PARTY_COLORS[selectedMeta.party] || '#64748b'
  const selectedDisplay = ADMIN_DISPLAY_NAMES[selectedAdmin] ?? selectedAdmin
  const adminTag = `${selectedDisplay} · ${selectedMeta.dataStart}–${Math.min(selectedMeta.end, 2025)}`
  // ── Fable-remake §8 «LOS SOBREVIVIENTES» — ACTO I/III data. All derived from
  //    the 4 eager payloads already in memory: 0 new endpoints, 0 new eager calls.
  const PARTY_ABBR: Record<string, string> = { PAN: 'PAN', PRI: 'PRI', MORENA: 'MOR' }
  const survivorColumns: SurvivorColumn[] = ADMINISTRATIONS.map((a) => {
    const era = (breakdownResp?.eras ?? []).find((e) => e.era === ERA_KEYS[a.name])
    return {
      adminName: a.name,
      displayName: ADMIN_DISPLAY_NAMES[a.name] ?? a.name,
      yearsLabel: `${a.dataStart}–${Math.min(a.end, 2025)}`,
      party: a.party,
      color: PARTY_COLORS[a.party] ?? a.color,
      seats: (era?.top_vendors ?? []).slice(0, 6).map((v) => ({
        name: v.vendor_name,
        totalMxn: v.total_mxn,
        contracts: v.contracts,
        riskPct: (v.avg_risk ?? 0) * 100,
      })),
    }
  })
  const seamSeries: SeamPoint[] = [...yoyData]
    .filter((y) => y.year >= 2002 && y.year <= 2025)
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ year: y.year, highRiskPct: y.high_risk_pct }))
  const seamAdmins: SeamAdmin[] = ADMINISTRATIONS.map((a) => ({
    name: a.name,
    displayName: ADMIN_DISPLAY_NAMES[a.name] ?? a.name,
    abbr: PARTY_ABBR[a.party] ?? a.party,
    party: a.party,
    color: PARTY_COLORS[a.party] ?? a.color,
    start: a.dataStart,
    end: Math.min(a.end, 2025),
  }))
  const seams: Seam[] = [
    { xYear: 2006.92, fromAdmin: 'Fox', toAdmin: 'Calderon', structureA: true },
    { xYear: 2012.92, fromAdmin: 'Calderon', toAdmin: 'Pena Nieto' },
    { xYear: 2018.92, fromAdmin: 'Pena Nieto', toAdmin: 'AMLO' },
    { xYear: 2024.75, fromAdmin: 'AMLO', toAdmin: 'Sheinbaum', partial: true },
  ]
  const sectorDeviationRows: SectorDeviationRow[] = sectorHeatmap.map((s) => ({
    sectorId: s.sectorId,
    name: s.name,
    color: s.color,
    hrFraction: s.hr / 100,
    daPct: s.da,
    contracts: s.contracts,
  }))
  const termBenchmarkFraction = (selectedAgg?.highRiskPct ?? 0) / 100
  const nDaOver50 = adminAggs.filter((a) => a.directAwardPct > 50).length
  const nHrOverNatl = adminAggs.filter((a) => a.highRiskPct > allTimeAvg.hr).length
  const onSelectAdmin = (name: string) => {
    setSelectedAdmin(name as AdminName)
    document.getElementById('expediente-file')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
              fontSize: '12px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ fontStyle: 'normal', fontWeight: 300 }}>
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
                  fontStyle: 'normal',
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
                className="mt-2 text-[15px] leading-relaxed text-text-secondary"
              >
                {isEs
                  ? 'Tres millones de contratos federales bajo cinco presidentes. Elija una administración — el expediente responde.'
                  : 'Three million federal contracts under five presidents. Choose an administration — the file answers.'}
              </p>
              <p style={{ fontFamily: '"EB Garamond", Georgia, serif' }} className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                {isEs ? (
                  <><span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{nDaOver50}</span> de 5 administraciones adjudicaron más de la mitad de sus contratos sin competencia · <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{nHrOverNatl}</span> de 5 por encima del promedio nacional de alto riesgo.</>
                ) : (
                  <><span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{nDaOver50}</span> of 5 administrations awarded over half their contracts without competition · <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{nHrOverNatl}</span> of 5 above the national high-risk average.</>
                )}
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

        <div className="space-y-6 max-w-[1600px] mx-auto">
          {/* ==== ACTO I - EL PATRON: the thesis proven above the fold, no tab
              needed. Sec.A named survivors across party turnover; Sec.B the risk
              line across four handovers. Both computed from payloads in memory. ==== */}
          <div className="mb-2 text-[12px] font-mono uppercase tracking-[0.25em]" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{isEs ? 'Acto I' : 'Act I'}</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            {isEs ? 'El patrón' : 'The pattern'}
          </div>
          <section
            aria-label={isEs ? 'El patrón — supervivencia entre sexenios' : 'The pattern — survival across terms'}
            className="rounded-sm border border-border/50 bg-background-card overflow-hidden mb-6"
            style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-accent)', boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
          >
            <div className="px-4 sm:px-5 py-4">
              <AdminSurvivorsSlope columns={survivorColumns} isEs={isEs} onSelectAdmin={onSelectAdmin} />
            </div>
            <div className="border-t border-border/40 px-4 sm:px-5 py-4">
              <SeamStrip series={seamSeries} nationalAvgPct={allTimeAvg.hr} admins={seamAdmins} seams={seams} isEs={isEs} onSelectAdmin={onSelectAdmin} />
            </div>
          </section>
          {/* ==== ACTO II - EL EXPEDIENTE: the selected administration's file ==== */}
          <div className="mb-2 text-[12px] font-mono uppercase tracking-[0.25em]" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: folderColor, fontWeight: 600 }}>{isEs ? 'Acto II' : 'Act II'}</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            {isEs ? 'El expediente' : 'The file'}
          </div>
          <section
            id="expediente-file"
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
          <div className="border-t border-border/40 px-4 sm:px-5 py-4">
            {selectedAgg && selectedAgg.years.length > 0 ? (() => {
              const years = selectedAgg.years
              // Worst-year claim for the headline (max high_risk_pct).
              const worst = years.reduce((m, y) => (y.high_risk_pct > m.high_risk_pct ? y : m), years[0])
              const worstYear = worst.year
              const worstHR = worst.high_risk_pct
              // EL PULSO+ — lead-pair trajectory (small multiples). Each metric
              // gets its OWN auto-scaled sparkline panel, so real per-metric
              // movement is legible instead of three near-flat lines crushed
              // onto one shared 0–93% axis (the Tufte multi-magnitude failure).
              // Direct Award + High Risk are co-equal LEADS — HR is the metric
              // the headline names, so it must not be the buried bottom line;
              // Single Bid is a demoted support row.
              // Reference: FT "small multiples" + NYT Upshot annotated single series.
              const first = years[0]
              const last = years[years.length - 1]
              // Term averages = the SAME contract-weighted aggregates the
              // summary fingerprint shows (selectedAgg.*), NOT an unweighted
              // year-mean. The year-mean is badly skewed by micro-volume years
              // (e.g. Fox 2004 = 7 contracts at DA 71%), which made §I disagree
              // with the card above it — Fox read DA 17.9% here vs 0.0% there. DC1.
              const daAvg = selectedAgg.directAwardPct
              const sbAvg = selectedAgg.singleBidPct
              const hrAvg = selectedAgg.highRiskPct
              const maxHR = Math.max(...years.map((y) => y.high_risk_pct))
              const daDelta = daAvg - allTimeAvg.da
              const sbDelta = sbAvg - allTimeAvg.sb
              const hrDelta = hrAvg - allTimeAvg.hr
              const yrSpan = `${first.year} → ${last.year}`
              const multiYear = years.length >= 2
              // Δ vs national average. Above-national is *worse* for DA/HR
              // (→ risk-critical); SB is neutral (→ muted). NEVER green (Bible §3.10).
              const renderDelta = (delta: number, worseWhenPositive: boolean) => {
                const up = delta >= 0
                const color = worseWhenPositive && up
                  ? tokenColor('risk-critical')
                  : tokenColor('text-muted')
                return (
                  <span className="text-[12px] font-mono tabular-nums whitespace-nowrap" style={{ color }}>
                    {up ? '▲ +' : '▼ −'}{Math.abs(delta).toFixed(1)}
                  </span>
                )
              }
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
                  <div className="space-y-2.5">
                    {/* ── LEAD PAIR · Direct Award + High Risk (co-equal) ── */}
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-sm overflow-hidden"
                      style={{ backgroundColor: 'var(--color-border)' }}
                    >
                      {/* DA — lead structural fact */}
                      <div className="bg-background-card p-3 space-y-1.5" style={{ borderLeft: `2px solid ${tokenColor('risk-critical')}` }}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted">
                            {isEs ? 'ADJ. DIRECTA · RECTORA' : 'DIRECT AWARD · LEAD'}
                          </span>
                          <span className="text-[12px] font-mono text-text-muted/70 tabular-nums whitespace-nowrap">{yrSpan}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif font-extrabold tabular-nums leading-none text-[24px]" style={{ color: tokenColor('risk-critical') }}>
                            {formatValue(daAvg, 'pct')}
                          </span>
                          <span className="text-[12px] font-mono text-text-muted">{isEs ? 'prom. sexenio' : 'term avg'}</span>
                          {renderDelta(daDelta, true)}
                        </div>
                        {multiYear && (
                          <EditorialSparkline
                            data={years}
                            yKey="direct_award_pct"
                            colorToken="risk-critical"
                            kind="area"
                            height={32}
                            lastValue={`${formatValue(first.direct_award_pct, 'pct')}→${formatValue(last.direct_award_pct, 'pct')}`}
                          />
                        )}
                        <p className="text-[12px] font-mono text-text-muted">
                          {isEs ? 'vs. nacional ' : 'vs. national '}{allTimeAvg.da.toFixed(1)}%
                        </p>
                      </div>
                      {/* HR — the headline metric, co-equal not demoted */}
                      <div className="bg-background-card p-3 space-y-1.5" style={{ borderLeft: `2px solid ${tokenColor('risk-medium')}` }}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted">
                            {isEs ? 'ALTO RIESGO · TITULAR' : 'HIGH RISK · HEADLINE'}
                          </span>
                          <span className="text-[12px] font-mono text-text-muted/70 tabular-nums whitespace-nowrap">{yrSpan}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif font-extrabold tabular-nums leading-none text-[24px]" style={{ color: tokenColor('risk-medium') }}>
                            {formatValue(hrAvg, 'pct')}
                          </span>
                          <span className="text-[12px] font-mono text-text-muted">{isEs ? 'prom. sexenio' : 'term avg'}</span>
                          {renderDelta(hrDelta, true)}
                        </div>
                        {multiYear && (
                          <EditorialSparkline
                            data={years}
                            yKey="high_risk_pct"
                            colorToken="risk-medium"
                            kind="line"
                            height={32}
                            lastValue={`${formatValue(first.high_risk_pct, 'pct')}→${formatValue(last.high_risk_pct, 'pct')}`}
                          />
                        )}
                        <p className="text-[12px] font-mono text-text-muted">
                          {isEs ? 'máx ' : 'peak '}{worstYear} · <span style={{ color: tokenColor('risk-medium'), fontWeight: 700 }}>{formatValue(maxHR, 'pct')}</span>
                        </p>
                      </div>
                    </div>

                    {/* ── SUPPORT · Single Bid ── */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                      <span className="w-28 shrink-0 text-[12px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
                        {isEs ? 'LICITACIÓN ÚNICA' : 'SINGLE BID'}
                      </span>
                      <div className="flex-1 min-w-0">
                        {multiYear ? (
                          <EditorialSparkline
                            data={years}
                            yKey="single_bid_pct"
                            colorToken="text-muted"
                            kind="line"
                            height={24}
                            lastValue={`${formatValue(first.single_bid_pct, 'pct')}→${formatValue(last.single_bid_pct, 'pct')}`}
                          />
                        ) : (
                          <span className="text-[13px] font-mono text-text-muted tabular-nums">{formatValue(last.single_bid_pct, 'pct')}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-[12px] font-mono text-text-muted whitespace-nowrap">
                        {isEs ? 'prom. ' : 'avg '}{sbAvg.toFixed(1)}%
                      </span>
                      {renderDelta(sbDelta, false)}
                    </div>

                    {/* auto-scale honesty disclosure (each panel owns its y-domain) */}
                    <p className="text-[13px] font-mono text-text-secondary">
                      {isEs
                        ? 'cada panel se autoescala — compare la forma dentro de cada métrica, no entre ellas'
                        : 'each panel auto-scales — compare the shape within a metric, not across them'}
                    </p>
                  </div>
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
                    <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-text-muted font-mono">
                      {t('aiDetectedAnomalies')}
                    </span>
                    <span className="text-[12px] text-text-muted">— {t('anomaliesNote')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {yearAnomalies.map((a) => {
                      const ml = ANOMALY_METRIC_LABELS[a.metric] ?? { en: a.metric, es: a.metric }
                      const mLabel = isEs ? ml.es : ml.en
                      return (
                      <span
                        key={`${a.year}-${a.metric}`}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-mono font-medium',
                          Math.abs(a.z) >= 2.5
                            ? 'bg-risk-critical/10 text-risk-critical border border-risk-critical/20'
                            : 'bg-risk-medium/10 text-risk-medium border border-risk-medium/20'
                        )}
                        title={isEs
                          ? `${mLabel} en ${a.year}: ${a.z.toFixed(2)}σ del promedio histórico`
                          : `${mLabel} in ${a.year}: ${a.z.toFixed(2)}σ from all-time average`}
                      >
                        {a.year} {mLabel} {a.z > 0 ? '+' : ''}{a.z.toFixed(1)}σ
                      </span>
                      )
                    })}
                  </div>
                </div>
              )}
              <p className="mt-3 pt-3 border-t border-border/20 text-[12px] text-text-muted leading-relaxed">
                {t('evidenceSection.inflationNote')}
              </p>

              {/* § VOLUMEN — contracts per year. Relocated to the foot of §I and
                  rebuilt from the old floating skeleton-strip: a full-width row
                  of labelled era-coloured bars (honest linear-from-zero scale),
                  every year named, the peak emphasised. */}
              {selectedAgg && selectedAgg.years.length > 1 && (() => {
                const years = selectedAgg.years
                const maxC = Math.max(...years.map((y) => y.contracts), 1)
                const peak = years.reduce((m, y) => (y.contracts > m.contracts ? y : m), years[0])
                const total = years.reduce((s, y) => s + y.contracts, 0)
                return (
                  <div className="mt-4 pt-3 border-t border-border/20">
                    <div className="flex items-baseline justify-between gap-2 mb-2.5">
                      <span className="text-[13px] tracking-[0.25em] uppercase font-bold text-accent">
                        {isEs ? '§ VOLUMEN · CONTRATOS POR AÑO' : '§ VOLUME · CONTRACTS PER YEAR'}
                      </span>
                      <span className="text-[12px] font-mono text-text-muted tabular-nums">
                        {formatNumber(total)} {isEs ? 'total' : 'total'}
                      </span>
                    </div>
                    {/* Bars — flex-1 so the row fills the full width */}
                    <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: 84 }}>
                      {years.map((yr) => {
                        const h = Math.max(3, (yr.contracts / maxC) * 72)
                        const isPeak = yr.year === peak.year
                        return (
                          <div key={yr.year} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
                            <span
                              className="text-[8.5px] font-mono tabular-nums mb-1 whitespace-nowrap"
                              style={{ color: isPeak ? selectedMeta.color : 'var(--color-text-muted)', fontWeight: isPeak ? 700 : 400 }}
                            >
                              {formatNumber(yr.contracts)}
                            </span>
                            <div
                              className="w-full rounded-t-sm"
                              style={{
                                height: h,
                                backgroundColor: selectedMeta.color,
                                opacity: isPeak ? 0.95 : 0.5,
                              }}
                              title={`${yr.year}: ${formatNumber(yr.contracts)} ${isEs ? 'contratos' : 'contracts'}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                    {/* Year axis — aligned 1:1 under the bars */}
                    <div className="flex gap-1.5 sm:gap-2 mt-1 pt-1 border-t border-border/30">
                      {years.map((yr) => (
                        <span key={yr.year} className="flex-1 min-w-0 text-center text-[13px] font-mono text-text-muted tabular-nums">
                          {yr.year}
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px] text-text-muted mt-2 leading-relaxed">
                      {isEs
                        ? `Volumen anual de contratos · escala lineal desde cero. Pico en ${peak.year} (${formatNumber(peak.contracts)}).`
                        : `Annual contract volume · linear scale from zero. Peak in ${peak.year} (${formatNumber(peak.contracts)}).`}
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── § EL APAGÓN — post-CompraNet recovered awards. Only Sheinbaum:
              the gap window (Sep 2025+) lies entirely within her term. Labeled
              recovery tier, never blended into the scored corpus (Option C). ── */}
          {selectedAdmin === 'Sheinbaum' && <GapRecoveryPanel isEs={isEs} />}

          {/* -- Sec.II - LA DESVIACION SECTORIAL - sector risk vs the term's own average -- */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-4">
            <div className="mb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <ChapterKicker numeral="II" es="LA DESVIACIÓN SECTORIAL" en="THE SECTOR DEVIATION" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
                  <h3 className="text-sm font-mono text-text-primary">
                    {isEs
                      ? `Qué sectores corrieron por encima del propio promedio de ${selectedDisplay}`
                      : `Which sectors ran hotter than ${selectedDisplay}'s own average`}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {isEs
                      ? 'Desviación del alto riesgo de cada sector frente al promedio del sexenio — no un semáforo, una acusación medida.'
                      : "Each sector's high-risk rate against the term's own average — not a heatmap, a measured indictment."}
                  </p>
                </div>
                <TableExportButton
                  filename="rubli-administraciones-sectores.csv"
                  data={sectorHeatmap.filter((s) => s.contracts > 0).map((s) => ({
                    sector: s.name,
                    [isEs ? 'adj_directa_pct' : 'direct_award_pct']: s.da.toFixed(1) + '%',
                    [isEs ? 'lic_unica_pct' : 'single_bid_pct']: s.sb.toFixed(1) + '%',
                    [isEs ? 'alto_riesgo_pct' : 'high_risk_pct']: s.hr.toFixed(1) + '%',
                    [isEs ? 'riesgo_prom' : 'avg_risk']: (s.risk * 100).toFixed(1) + '%',
                  }))}
                  className="shrink-0"
                />
              </div>
            </div>
            <AdminSectorDeviation rows={sectorDeviationRows} termBenchmarkFraction={termBenchmarkFraction} isEs={isEs} />
          </div>

          {/* ── § III · EL EXPEDIENTE — chronological case-file spine (R3) ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-4" id="expediente">
            <div className="mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <ChapterKicker numeral="III" es="EL EXPEDIENTE" en="THE CASE FILE" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
                  <h3 className="text-sm font-mono text-text-primary">
                    {t('keyEvents', { admin: selectedDisplay, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">{t('keyEventsSubtitle')}</p>
                </div>
                {selectedEraExtras.gtCaseCount != null && (
                  <span className="text-[12px] font-mono text-text-muted shrink-0 text-right">
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
          <div className="border-t border-border/40 px-4 sm:px-5 py-4">
            <div className="mb-3">
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
                            <span className="text-[12px] font-mono text-text-muted w-4 text-right flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sector.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[12px] mb-0.5">
                                <span className="text-text-secondary whitespace-normal break-words leading-tight">{sector.name}</span>
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
                                dotR={3}
                                dotGap={8}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[12px] font-mono text-text-muted/60 mt-1.5">
                      {isEs ? '1 ● ≈ 5% del sector líder' : '1 ● ≈ 5% of the leading sector'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── §IV drill-down · the top-100 beneficiaries archive drawer ──
                Front-of-house keeps the top-10 above; this is the full ledger,
                lazy-mounted on open (clones the "Comparar dos periodos" toggle). */}
            <div className="mt-4 border-t border-border/40">
              <button
                className="w-full flex items-center justify-between py-3 text-left hover:bg-background-elevated/40 transition-colors"
                onClick={() => setVendorsDeepOpen((v) => !v)}
                aria-expanded={vendorsDeepOpen}
                aria-controls="beneficiarios-100"
              >
                <span className="text-[12px] tracking-[0.2em] uppercase font-mono text-text-muted">
                  {isEs ? '§ LOS 100 MAYORES BENEFICIARIOS' : '§ THE TOP 100 BENEFICIARIES'}
                </span>
                <span className="text-text-muted text-xs font-mono">{vendorsDeepOpen ? '−' : '+'}</span>
              </button>
              {vendorsDeepOpen && (
                <div id="beneficiarios-100" className="pt-1 pb-1">
                  <AdminVendorsDeepList
                    era={ERA_KEYS[selectedAdmin]}
                    eraColor={selectedMeta.color}
                    isEs={isEs}
                    selectedDisplay={selectedDisplay}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── § V · LOS COMPRADORES — the buyers (top spending institutions).
              The reverse of §IV: who received → who signed. Closes MÓDULO 1. ── */}
          <div className="border-t border-border/40 px-4 sm:px-5 py-4" id="compradores">
            <div className="mb-3">
              <ChapterKicker numeral="V" es="LOS COMPRADORES" en="THE BUYERS" isEs={isEs} adminTag={adminTag} tagColor={folderColor} />
              <h3 className="text-sm font-mono text-text-primary">
                {isEs ? 'Las dependencias que más gastaron' : 'The agencies that spent the most'}
              </h3>
              <p className="text-xs text-text-muted mt-1">
                {isEs
                  ? 'El reverso de los beneficiarios: quién firmó los contratos.'
                  : 'The flip side of the beneficiaries: who signed the contracts.'}
              </p>
            </div>
            <AdminBuyersSection
              era={ERA_KEYS[selectedAdmin]}
              eraColor={selectedMeta.color}
              folderColor={folderColor}
              adminTag={adminTag}
              isEs={isEs}
              selectedDisplay={selectedDisplay}
            />
          </div>

          {/* ── Folder colophon — explicit module end ── */}
          <div className="border-t border-border/40 px-5 py-2 text-center">
            <span
              className="text-[13px] font-mono uppercase tracking-[0.3em] text-text-muted"
              style={{ fontStyle: 'normal' }}
            >
              — {isEs ? 'fin del expediente' : 'end of file'} · <span style={{ color: folderColor, fontWeight: 700 }}>{selectedDisplay}</span> —
            </span>
          </div>
          </section>
          {/* ==== ACTO III - LOS QUE PERMANECEN: officials who kept signing across
              a change of government, + the on-demand two-period compare. ==== */}
          <div className="mt-8 mb-2 text-[12px] font-mono uppercase tracking-[0.25em]" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{isEs ? 'Acto III' : 'Act III'}</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            {isEs ? 'Los que permanecen' : 'The ones who remain'}
          </div>
          {moversResp?.data_available && moversResp.movers.length > 0 && (
            <OfficialTenureBands movers={moversResp.movers} isEs={isEs} />
          )}

          {/* Period Comparison tool (collapsed footer utility, relocated from the retired MODULO 2) */}
          <div className="mt-6 border border-border/50 rounded-sm bg-background-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-background-elevated/40 transition-colors"
              onClick={() => setCompareOpen((v) => !v)}
              aria-expanded={compareOpen}
            >
              <span className="text-[12px] tracking-[0.2em] uppercase font-mono text-text-muted">
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
// `dupScandal` marks a curated event that restates a DOSSIER_DATA scandal of
// that key — ExpedienteSpine drops it when the scandal is present so §III shows
// each affair once (the case-linked scandal wins). DC4.
const HARDCODED_EVENTS: Record<string, Array<{ year: number; title: string; titleEs: string; type: 'reform' | 'scandal' | 'audit' | 'crisis'; impact: 'high' | 'medium' | 'low'; dupScandal?: string }>> = {
  Fox: [
    { year: 2002, title: 'COMPRANET launched as digital procurement platform', titleEs: 'COMPRANET se lanza como plataforma digital de contratación', type: 'reform', impact: 'medium' },
    { year: 2003, title: 'First ASF audit on widespread direct-award contracting', titleEs: 'Primera auditoría de la ASF sobre adjudicación directa generalizada', type: 'audit', impact: 'medium' },
    { year: 2004, title: 'PEMEXGATE scandal: diversions in maintenance contracts', titleEs: 'Escándalo PEMEXGATE: desvíos en contratos de mantenimiento', type: 'scandal', impact: 'high', dupScandal: 'pemexgate' },
    { year: 2005, title: 'Acquisitions Law reform — new transparency requirements', titleEs: 'Reforma a la Ley de Adquisiciones — nuevos requisitos de transparencia', type: 'reform', impact: 'medium' },
  ],
  Calderon: [
    { year: 2007, title: 'National Security Strategy launched — surge in defense contracts', titleEs: 'Estrategia Nacional de Seguridad — auge de contratos de defensa', type: 'crisis', impact: 'medium' },
    { year: 2008, title: 'Global financial crisis — federal spending contraction', titleEs: 'Crisis financiera global — contracción del gasto federal', type: 'crisis', impact: 'medium' },
    { year: 2009, title: 'AH1N1 flu: emergency procurement with minimal bidding', titleEs: 'Influenza AH1N1: compras de emergencia con licitación mínima', type: 'crisis', impact: 'high' },
    { year: 2010, title: 'PEMEX hires Odebrecht for Etileno XXI — bribery scheme begins', titleEs: 'PEMEX contrata a Odebrecht para Etileno XXI — inicia esquema de sobornos', type: 'scandal', impact: 'high', dupScandal: 'odebrecht' },
    { year: 2012, title: 'New Government Procurement Law — broadest reform in 15 years', titleEs: 'Nueva Ley de Contrataciones Públicas — la reforma más amplia en 15 años', type: 'reform', impact: 'high' },
  ],
  'Pena Nieto': [
    { year: 2014, title: 'Casa Blanca scandal — conflict of interest with contractor Grupo Higa', titleEs: 'Escándalo de la Casa Blanca — conflicto de interés con el contratista Grupo Higa', type: 'scandal', impact: 'high', dupScandal: 'casa_blanca' },
    { year: 2015, title: 'IMSS ghost-company network uncovered by ASF audit', titleEs: 'Red de empresas fantasma del IMSS descubierta por auditoría de la ASF', type: 'scandal', impact: 'high', dupScandal: 'imss_ghost' },
    { year: 2016, title: 'Odebrecht-PEMEX investigation — bribes for infrastructure contracts', titleEs: 'Investigación Odebrecht-PEMEX — sobornos por contratos de infraestructura', type: 'scandal', impact: 'high', dupScandal: 'odebrecht' },
    { year: 2017, title: 'La Estafa Maestra: MXN 7.6B diverted through public universities', titleEs: 'La Estafa Maestra: 7,600 MDP desviados a través de universidades públicas', type: 'scandal', impact: 'high', dupScandal: 'estafa_maestra' },
    { year: 2017, title: 'September earthquakes — emergency procurement without bidding', titleEs: 'Sismos de septiembre — compras de emergencia sin licitación', type: 'crisis', impact: 'medium' },
    { year: 2018, title: 'CompraNet 5.0 reform — improved traceability', titleEs: 'Reforma CompraNet 5.0 — mejor trazabilidad', type: 'reform', impact: 'medium' },
  ],
  AMLO: [
    { year: 2019, title: 'Austerity decree — drastic reduction in service contracts', titleEs: 'Decreto de austeridad — reducción drástica de contratos de servicios', type: 'reform', impact: 'high' },
    { year: 2019, title: 'Militarization of megaprojects (AIFA, Tren Maya) — direct awards to Army', titleEs: 'Militarización de megaproyectos (AIFA, Tren Maya) — adjudicaciones directas al Ejército', type: 'reform', impact: 'high' },
    { year: 2020, title: 'COVID-19 pandemic: emergency procurement of ventilators and medicines', titleEs: 'Pandemia de COVID-19: compras de emergencia de ventiladores y medicinas', type: 'crisis', impact: 'high', dupScandal: 'covid_procurement' },
    { year: 2021, title: 'Segalmex scandal — MXN 9.4B fraud in food distribution', titleEs: 'Escándalo Segalmex — fraude de 9,400 MDP en distribución de alimentos', type: 'scandal', impact: 'high', dupScandal: 'segalmex' },
    { year: 2022, title: 'SAT publishes final EFOS list: 38 COMPRANET vendors confirmed as ghost companies', titleEs: 'El SAT publica la lista definitiva de EFOS: 38 proveedores de COMPRANET confirmados como empresas fantasma', type: 'audit', impact: 'high', dupScandal: 'efos_sat' },
    { year: 2023, title: 'Tren Maya: FONATUR awards MXN 180M in direct contracts to Sedena', titleEs: 'Tren Maya: FONATUR adjudica 180 MDP en contratos directos a la Sedena', type: 'scandal', impact: 'medium', dupScandal: 'tren_maya' },
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
