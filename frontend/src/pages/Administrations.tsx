/**
 * Administration Deep Dive — "UN SOLO PATRÓN"
 *
 * P1 layout (one scroll, no tabs):
 * Hero → §1 25-yr trend → §2 HR dot-bars → §3 transition lede →
 * §4 standings matrix → § EXPLORAR divider → admin selector +
 * per-admin blocks → lame-duck multiples → compare footer → PageFooter
 */

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PresidentAvatar } from '@/components/administrations/PresidentAvatar'
import { DeltaBadge } from '@/components/administrations/DeltaBadge'
import { AdminDossierPanel } from '@/components/administrations/AdminDossierPanel'
import { AdminSectorMatrix, MATRIX_SECTORS } from '@/components/administrations/AdminSectorMatrix'
import { ComparePeriodView } from '@/components/administrations/ComparePeriodView'
import { AdminCycleSmallMultiples } from '@/components/administrations/AdminCycleSmallMultiples'
import {
  ADMINISTRATIONS,
  PARTY_COLORS,
} from '@/components/administrations/data'
import type {
  AdminName,
  AdminAgg,
  MatrixMetric,
} from '@/components/administrations/types'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, slideUp } from '@/lib/animations'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'

import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTORS, RISK_COLORS, OECD_DIRECT_AWARD_LIMIT } from '@/lib/constants'
import { DashboardSledgehammer } from '@/components/editorial/DashboardSledgehammer'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { TableExportButton } from '@/components/TableExportButton'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
} from '@/components/charts'
import {
  AlertTriangle,
  Shield,
  Users,
  Banknote,
  FileText,
  Activity,
} from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import { PageFooter } from '@/components/layout/PageFooter'
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
import { ShareButton } from '@/components/ShareButton'
import { FeaturedComparison } from '@/components/editorial/FeaturedComparison'
import {
  EditorialLineChart,
  DotStrip,
  type ChartAnnotation,
  type LineSeries,
  type DotStripRow,
} from '@/components/charts/editorial'
import { EditorialChartFrame } from '@/components/stories/EditorialChartFrame'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { useRef } from 'react'

// =============================================================================
// Constants
// =============================================================================

// ADMINISTRATIONS, PARTY_COLORS, DOSSIER_DATA, SEVERITY_COLORS, AdminName,
// AdminAgg, AdminMeta, ScandalRef, DossierEntry moved to
// components/administrations/{data,types}.ts as part of the AdminDossierPanel
// extraction (2026-05-11). Imported above.

// Map AdminName to backend era key
const ERA_KEYS: Record<string, string> = {
  Fox: 'fox',
  Calderon: 'calderon',
  'Pena Nieto': 'pena_nieto',
  AMLO: 'amlo',
  Sheinbaum: 'sheinbaum',
}

// PARTY_COLORS imported above.

// DOSSIER_DATA + ScandalRef + DossierEntry imported above.

// Display names with correct diacritics. Keyed on the ASCII `name` identifier.
const ADMIN_DISPLAY_NAMES: Record<string, string> = {
  Fox: 'Fox',
  Calderon: 'Calderón',
  'Pena Nieto': 'Peña Nieto',
  AMLO: 'AMLO',
  Sheinbaum: 'Sheinbaum',
}

// AdminName imported above from components/administrations/types.
// MATRIX_SECTORS imported from AdminSectorMatrix.

// =============================================================================
// Helpers
// =============================================================================

// AdminAgg imported above from components/administrations/types.

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

function delta(a: number, b: number): { value: number; direction: 'up' | 'down' | 'flat' } {
  const d = a - b
  return { value: d, direction: Math.abs(d) < 0.01 ? 'flat' : d > 0 ? 'up' : 'down' }
}

// =============================================================================
// ML helpers — anomaly detection + correlation
// =============================================================================

/** Standard z-score of `value` relative to the population `values`. */
function computeZScore(values: number[], value: number): number {
  if (values.length < 3) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const std = Math.sqrt(variance)
  return std > 0.001 ? (value - mean) / std : 0
}

// PresidentAvatar + DeltaBadge extracted to components/administrations/.
// (2026-05-11) Trims this file from 3,671 to ~3,580 LOC and lets those
// helpers be reused without importing the Administrations page module.

// MatrixMetric imported from components/administrations/types.

// =============================================================================
// AdminDossierPanel — per-administration deep-dive panel
// =============================================================================

// DossierPanelProps + SEVERITY_COLORS imported from components/administrations.

// AdminDossierPanel moved to components/administrations/AdminDossierPanel.tsx

/** URL-friendly slug for ?admin= deep links: "Pena Nieto" → "pena-nieto". */
const adminSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

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

  // Per-admin "standings" summary for the §4 matrix overall column.
  const adminSummary = useMemo(() => {
    const out: Record<string, { risk: number; da: number; hr: number; sb: number }> = {}
    for (const a of adminAggs) {
      out[a.name] = { risk: a.avgRisk, da: a.directAwardPct, hr: a.highRiskPct, sb: a.singleBidPct }
    }
    return out
  }, [adminAggs])

  const selectedAgg = adminAggs.find((a) => a.name === selectedAdmin)
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin) ?? ADMINISTRATIONS[0]

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

  // Transition data
  const transitions = useMemo(() => {
    const result = []
    for (let i = 1; i < ADMINISTRATIONS.length; i++) {
      const prev = adminAggs.find((a) => a.name === ADMINISTRATIONS[i - 1].name)
      const curr = adminAggs.find((a) => a.name === ADMINISTRATIONS[i].name)
      if (prev && curr && prev.contracts > 0 && curr.contracts > 0) {
        result.push({
          from: ADMINISTRATIONS[i - 1].name,
          to: ADMINISTRATIONS[i].name,
          fromColor: ADMINISTRATIONS[i - 1].color,
          toColor: ADMINISTRATIONS[i].color,
          dDA: delta(curr.directAwardPct, prev.directAwardPct),
          dSB: delta(curr.singleBidPct, prev.singleBidPct),
          dHR: delta(curr.highRiskPct, prev.highRiskPct),
          dContracts: delta(curr.contracts, prev.contracts),
          dVendors: delta(curr.vendorCount, prev.vendorCount),
        })
      }
    }
    return result
  }, [adminAggs])

  // Biggest cross-sexenio swing — drives the FeaturedComparison lede
  const headlineTransition = useMemo(() => {
    if (transitions.length === 0) return null
    // Rank by absolute direct-award delta (most story-worthy signal)
    const ranked = [...transitions].sort(
      (a, b) => Math.abs(b.dDA.value) - Math.abs(a.dDA.value)
    )
    const top = ranked[0]
    const prev = adminAggs.find((a) => a.name === top.from)
    const curr = adminAggs.find((a) => a.name === top.to)
    if (!prev || !curr) return null
    return { top, prev, curr }
  }, [transitions, adminAggs])

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
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
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

  // Derived data for the promoted 25-yr trend chart (§1)
  const transitionYears = [2006, 2012, 2018, 2024]
  const adminLabels: Record<number, string> = { 2006: 'Calderon', 2012: 'Peña', 2018: 'AMLO', 2024: 'Sheinbaum' }
  const breaksData = breaksResp

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

        {/* ── HERO — Folio·XI + 65.3% sledgehammer (P2) ── */}
        <header className="mb-8 pb-5 border-b border-border">
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
          <DashboardSledgehammer
            daRate={allTimeAvg.da}
            lang={isEs ? 'es' : 'en'}
            eyebrow={isEs
              ? '§ CINCO ADMINISTRACIONES · UN SOLO PATRÓN'
              : '§ FIVE ADMINISTRATIONS · ONE PATTERN'}
            deck={isEs
              ? 'de contratos federales adjudicados sin competencia — bajo cada administración, 2002–2025.'
              : 'of federal contracts awarded without competition — under every administration, 2002–2025.'}
            oecdLimitPct={Math.round(OECD_DIRECT_AWARD_LIMIT * 100)}
            microStats={[
              { value: '5', label: isEs ? 'Sexenios' : 'Administrations' },
              { value: isEs ? '9.9 billones MXN' : '9.9T MXN', label: isEs ? 'Gasto total' : 'Total spend' },
              { value: '3.1M', label: isEs ? 'Contratos' : 'Contracts' },
            ]}
          />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <FuentePill source="COMPRANET" verified={true} />
            <MetodologiaTooltip
              title={t('narrative')}
              body={t('comparisonTableDesc')}
              link="/methodology"
            />
            <ShareButton label={t('share', 'Share')} />
          </div>
        </header>

        <div className="space-y-8 max-w-[1600px] mx-auto">

          {/* ── §1 THE ONE PATTERN — 25-year systemic trend (promoted from PatternsView) ── */}
          <ScrollReveal direction="fade">
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
            tone="card"
          >
            {yoyData.length > 0 ? (
              <div ref={systemicChartRef}>
                {(() => {
                  const annotations: ChartAnnotation[] = [
                    { kind: 'band', x1: 2002, x2: 2006, label: 'Fox · PAN', tone: 'admin' },
                    { kind: 'band', x1: 2006, x2: 2012, label: 'Calderón · PAN', tone: 'admin' },
                    { kind: 'band', x1: 2012, x2: 2018, label: 'EPN · PRI', tone: 'admin' },
                    { kind: 'band', x1: 2018, x2: 2024, label: 'AMLO · MORENA', tone: 'admin' },
                    { kind: 'band', x1: 2024, x2: 2026, label: 'Sheinbaum · MORENA', tone: 'admin' },
                    { kind: 'hrule', y: 65.3, label: t('patternsView.nationalAvgLabel'), tone: 'oecd' },
                    ...transitionYears.map<ChartAnnotation>((year) => ({
                      kind: 'vrule', x: year, label: adminLabels[year] ?? '', tone: 'info',
                    })),
                    ...((breaksData?.breakpoints ?? [])
                      .filter((bp, i, arr) => arr.findIndex(b => b.year === bp.year) === i)
                      .map<ChartAnnotation>((bp) => ({
                        kind: 'vrule', x: bp.year, label: `~${bp.year}`, tone: 'warn',
                      }))),
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
          </ScrollReveal>

          {/* ── §2 FIVE PRESIDENTS, RANKED BY RISK — high-risk DotStrip ── */}
          <div className="bg-background-card rounded-sm border border-border/40 p-5">
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
                const adminMeta = ADMINISTRATIONS.find((ad) => ad.name === a.name)
                const partyColor = PARTY_COLORS[adminMeta?.party || ''] || '#64748b'
                const multiple = allTimeAvg.hr > 0 ? a.highRiskPct / allTimeAvg.hr : 0
                const party = adminMeta?.party ?? ''
                return {
                  label: ADMIN_DISPLAY_NAMES[a.name] ?? a.name,
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

          {/* ── §3 THE ONE TRANSITION — biggest cross-sexenio DA swing ── */}
          {headlineTransition && (() => {
            const { top, prev, curr } = headlineTransition
            const deltaValue = top.dDA.value
            const direction = deltaValue > 0 ? t('lede.rose') : t('lede.fell')
            const absDelta = Math.abs(deltaValue).toFixed(1)
            const accent = deltaValue > 0 ? 'var(--color-risk-high)' : 'var(--color-text-muted)'
            return (
              <FeaturedComparison
                kicker={t('lede.kicker', { direction, absDelta })}
                accent={accent}
                entityA={{
                  name: ADMIN_DISPLAY_NAMES[prev.name] ?? prev.name,
                  subtitle: `${prev.directAwardPct.toFixed(1)}% DA · ${formatNumber(prev.contracts)} ${t('lede.contracts')}`,
                  share: prev.directAwardPct,
                }}
                entityB={{
                  name: ADMIN_DISPLAY_NAMES[curr.name] ?? curr.name,
                  subtitle: `${curr.directAwardPct.toFixed(1)}% DA · ${formatNumber(curr.contracts)} ${t('lede.contracts')}`,
                  share: curr.directAwardPct,
                }}
                centerLabel={`${deltaValue > 0 ? '+' : ''}${deltaValue.toFixed(1)} pp`}
                deck={t('lede.deck', { prevName: ADMIN_DISPLAY_NAMES[prev.name] ?? prev.name, currName: ADMIN_DISPLAY_NAMES[curr.name] ?? curr.name, direction, prevPct: prev.directAwardPct.toFixed(1), currPct: curr.directAwardPct.toFixed(1) })}
                action={{
                  label: t('lede.viewDossier', { name: ADMIN_DISPLAY_NAMES[curr.name] ?? curr.name }),
                  onClick: () => setSelectedAdmin(curr.name),
                }}
                tintColor={top.toColor}
              />
            )
          })()}

          {/* ── §4 THE STANDINGS — Admin × Sector matrix ── */}
          <AdminSectorMatrix
            selectedAdmin={selectedAdmin}
            liveMatrix={liveAdminSectorMatrix}
            summary={adminSummary}
            metric={matrixMetric}
            onMetricChange={setMatrixMetric}
          />

          {/* ── § EXPLORAR EN DETALLE divider ── */}
          <div className="pt-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-semibold flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span>{isEs ? '§ EXPLORAR EN DETALLE' : '§ EXPLORE IN DETAIL'}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="text-center text-[10px] text-text-muted mt-2 font-mono">
              {isEs
                ? 'Selecciona una administración para ver su perfil completo'
                : 'Select an administration to view its full profile'}
            </p>
          </div>

          {/* Admin selector cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {ADMINISTRATIONS.map((admin, idx) => {
              const agg = adminAggs.find((a) => a.name === admin.name)
              const isSelected = selectedAdmin === admin.name
              const partyColor = PARTY_COLORS[admin.party] || '#64748b'
              return (
                <ScrollReveal key={admin.name} delay={idx * 80} direction="up">
                <button
                  onClick={() => setSelectedAdmin(admin.name)}
                  className={cn(
                    'relative text-left w-full rounded-sm overflow-hidden transition-all duration-300',
                    isSelected
                      ? 'bg-background-card shadow-lg ring-1'
                      : 'bg-background-card/60 hover:bg-background-card hover:shadow-md'
                  )}
                  style={{
                    borderLeft: `4px solid ${isSelected ? partyColor : `${partyColor}40`}`,
                    ...(isSelected ? { boxShadow: `0 0 24px -6px ${partyColor}30`, ringColor: `${partyColor}40` } : {}),
                  }}
                >
                  <div className="p-3.5">
                    <div className="text-[9px] tracking-[0.25em] uppercase text-text-muted font-semibold mb-2">
                      {t('cardLabels.expediente')}
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <PresidentAvatar
                        wikiArticle={admin.wikiArticle}
                        fullName={admin.fullName}
                        color={admin.color}
                        size={36}
                      />
                      <div className="flex-1 min-w-0">
                        <span style={{ fontFamily: 'var(--font-family-serif)' }} className={cn(
                          'text-sm font-bold block truncate leading-tight',
                          isSelected ? 'text-text-primary' : 'text-text-secondary'
                        )}>
                          {admin.fullName.split(' ').slice(0, 2).join(' ')}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-text-muted font-mono">
                            {admin.dataStart}–{Math.min(admin.end, 2025)}
                          </span>
                          <span
                            className="text-[9px] font-mono font-bold px-1.5 py-0 rounded"
                            style={{
                              backgroundColor: `${partyColor}20`,
                              color: partyColor,
                              border: `1px solid ${partyColor}40`,
                            }}
                          >
                            {admin.party}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-border/30 pt-2 mt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">{t('cardLabels.contratos')}</span>
                        <span className="font-mono font-semibold text-text-secondary">{agg ? formatNumber(agg.contracts) : '0'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">{t('cardLabels.gastoTotal')}</span>
                        <span className="font-mono font-semibold text-text-secondary">{agg ? formatCompactMXN(agg.totalValue) : '$0'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">{t('cardLabels.altoRiesgo')}</span>
                        <span className={cn(
                          'font-mono font-bold',
                          agg && agg.highRiskPct > 10 ? 'text-risk-critical' : agg && agg.highRiskPct > 6 ? 'text-risk-high' : 'text-text-muted'
                        )}>
                          {agg ? agg.highRiskPct.toFixed(1) + '%' : '--'}
                        </span>
                      </div>
                    </div>
                    {agg && agg.years.length > 1 && (
                      <div className="mt-2 h-6" style={{ minWidth: 80 }}>
                        <ResponsiveContainer width="100%" minWidth={0} height="100%">
                          <ComposedChart data={agg.years} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Line
                              type="monotone"
                              dataKey="contracts"
                              stroke={admin.color}
                              strokeWidth={1.5}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </button>
                </ScrollReveal>
              )
            })}
          </motion.div>

          {/* Per-admin detail blocks (demoted below EXPLORAR divider) */}

          {/* StatCards */}
          {selectedAgg && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
              variants={slideUp}
              initial="initial"
              animate="animate"
            >
              {[
                { label: t('statCards.contracts'), value: formatNumber(selectedAgg.contracts), delta: null, icon: FileText },
                { label: t('statCards.totalValue'), value: formatCompactMXN(selectedAgg.totalValue), delta: null, icon: Banknote },
                { label: t('statCards.directAward'), value: `${selectedAgg.directAwardPct.toFixed(1)}%`, delta: selectedAgg.directAwardPct - allTimeAvg.da, unit: ' pts', icon: Shield },
                { label: t('statCards.singleBid'), value: `${selectedAgg.singleBidPct.toFixed(1)}%`, delta: selectedAgg.singleBidPct - allTimeAvg.sb, unit: ' pts', icon: Users },
                { label: t('statCards.highRisk'), value: `${selectedAgg.highRiskPct.toFixed(1)}%`, delta: selectedAgg.highRiskPct - allTimeAvg.hr, unit: ' pts', icon: AlertTriangle },
                { label: t('statCards.activeVendors'), value: formatNumber(selectedAgg.vendorCount), delta: null, icon: Activity, invertDelta: true },
              ].map((card, i) => (
                <ScrollReveal key={card.label} delay={i * 60} direction="up">
                  <StatCard
                    label={card.label}
                    value={card.value}
                    delta={card.delta ?? null}
                    unit={(card as { unit?: string }).unit}
                    icon={card.icon}
                    color={selectedMeta.color}
                    invertDelta={(card as { invertDelta?: boolean }).invertDelta}
                  />
                </ScrollReveal>
              ))}
            </motion.div>
          )}

          {/* Inflation disclaimer */}
          <div className="flex items-start gap-2 rounded-sm border border-border/60 bg-background-elevated/60 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              {t('evidenceSection.inflationNote')}
            </p>
          </div>

          {/* Incomplete data warning for Sheinbaum */}
          {selectedAdmin === 'Sheinbaum' && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-sm border border-risk-medium/30 bg-risk-medium/5">
              <AlertTriangle className="h-4 w-4 text-risk-medium mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-risk-medium">{t('incompleteDataset')}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t('incompleteDatasetDescription')}
                </p>
              </div>
            </div>
          )}

          {/* Yearly Deep Dive */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <h3 className="text-sm font-mono text-text-primary">
                {t('yearlyTrends', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
              </h3>
            </div>
            <div className="px-4 py-3 bg-background-card">
              {selectedAgg && selectedAgg.years.length > 0 ? (
                (() => {
                  const years = selectedAgg.years
                  const W = 620; const H = 310
                  const ML = 56; const MR = 46; const MT = 18; const MB = 34
                  const cW = W - ML - MR; const cH = H - MT - MB
                  const n = years.length
                  const colW = Math.max(4, (cW / n) * 0.72)
                  const maxC = Math.max(...years.map((y) => y.contracts), 1)
                  const xOf = (i: number) => ML + (i + 0.5) * (cW / n)
                  const colY = (c: number) => MT + cH - Math.sqrt(c / maxC) * cH * 0.62
                  const pctY = (p: number) => MT + cH - Math.max(0, Math.min(100, p)) / 100 * cH
                  const eventSet = new Set(adminBreaks.map((b) => b.year))
                  const lines: Array<{ key: string; pct: (y: typeof years[0]) => number; color: string; label: string }> = [
                    { key: 'da', pct: (y) => y.direct_award_pct, color: 'var(--color-sector-tecnologia)', label: t('statCards.directAward') },
                    { key: 'sb', pct: (y) => y.single_bid_pct, color: 'var(--color-accent)', label: t('statCards.singleBid') },
                    { key: 'hr', pct: (y) => y.high_risk_pct, color: RISK_COLORS.high, label: t('statCards.highRisk') },
                  ]
                  return (
                    <>
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Yearly trends: contract volume and procurement risk indicators">
                      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                        const y = MT + cH * (1 - f * 0.62)
                        const val = Math.round(Math.pow(f, 2) * maxC)
                        return (
                          <g key={f}>
                            <line x1={ML - 3} y1={y} x2={ML} y2={y} stroke="#3f3f46" strokeWidth={1} />
                            <text x={ML - 5} y={y + 1} fill="var(--color-text-muted)" fontSize={10} textAnchor="end" dominantBaseline="middle" fontFamily="monospace">{formatNumber(val)}</text>
                          </g>
                        )
                      })}
                      {[0, 25, 50, 75, 100].map((pct) => {
                        const y = pctY(pct)
                        return (
                          <g key={pct}>
                            <line x1={W - MR} y1={y} x2={W - MR + 3} y2={y} stroke="#3f3f46" strokeWidth={1} />
                            <text x={W - MR + 5} y={y + 1} fill="var(--color-text-muted)" fontSize={10} textAnchor="start" dominantBaseline="middle" fontFamily="monospace">{pct}%</text>
                            <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="var(--color-border-hover)" strokeWidth={0.5} strokeDasharray="3 4" />
                          </g>
                        )
                      })}
                      <line x1={ML} y1={MT} x2={ML} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />
                      <line x1={W - MR} y1={MT} x2={W - MR} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />
                      <line x1={ML} y1={MT + cH} x2={W - MR} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />
                      {years.map((yr, i) => {
                        const x = xOf(i); const top = colY(yr.contracts)
                        return (
                          <rect key={yr.year} x={x - colW / 2} y={top} width={colW} height={MT + cH - top}
                            fill={selectedMeta.color} fillOpacity={eventSet.has(yr.year) ? 0.75 : 0.38} rx={1} />
                        )
                      })}
                      {adminEvents.slice(0, 8).map((ev) => {
                        const i = years.findIndex((y) => y.year === ev.year)
                        if (i < 0) return null
                        const x = xOf(i)
                        return (
                          <g key={ev.id ?? ev.year}>
                            <line x1={x} y1={MT} x2={x} y2={MT + cH} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
                            <text x={x + 3} y={MT + 6} fill="var(--color-text-muted)" fontSize={10} fontFamily="monospace">{(ev.title ?? '').slice(0, 12)}</text>
                          </g>
                        )
                      })}
                      {adminBreaks.map((b) => {
                        const i = years.findIndex((y) => y.year === b.year)
                        if (i < 0) return null
                        const x = xOf(i)
                        return (
                          <g key={`brk-${b.year}-${b.metric}`}>
                            <line x1={x} y1={MT} x2={x} y2={MT + cH} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="4 2" />
                            <text x={x + 2} y={MT + 14} fill="var(--color-accent)" fontSize={10} fontFamily="monospace">!</text>
                          </g>
                        )
                      })}
                      {lines.map((ln) => (
                        <g key={ln.key}>
                          <polyline
                            points={years.map((yr, i) => `${xOf(i)},${pctY(ln.pct(yr))}`).join(' ')}
                            fill="none" stroke={ln.color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"
                          />
                          {years.map((yr, i) => (
                            <circle key={i} cx={xOf(i)} cy={pctY(ln.pct(yr))} r={2.4} fill={ln.color} fillOpacity={0.9} />
                          ))}
                        </g>
                      ))}
                      {years.map((yr, i) => (
                        <text key={yr.year} x={xOf(i)} y={H - 4} fill="var(--color-text-muted)" fontSize={10} textAnchor="middle" fontFamily="monospace">
                          {yr.year}
                        </text>
                      ))}
                    </svg>
                    <div className="flex flex-wrap gap-4 mt-1 px-1">
                      {lines.map((ln) => (
                        <div key={ln.key} className="flex items-center gap-1.5">
                          <svg width={16} height={10} aria-hidden="true"><line x1={0} y1={5} x2={16} y2={5} stroke={ln.color} strokeWidth={1.8} /><circle cx={8} cy={5} r={2.2} fill={ln.color} /></svg>
                          <span className="text-[10px] font-mono text-text-muted">{ln.label}</span>
                        </div>
                      ))}
                    </div>
                    </>
                  )
                })()
              ) : (
                <div className="h-[320px] flex items-center justify-center text-text-muted text-sm">
                  {t('noData')}
                </div>
              )}
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
            </div>
          </div>

          {/* Sector Risk Profile (without correlations) */}
          <ScrollReveal direction="fade">
          <div className="card-elevated">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">{t('evidenceLabel')}</div>
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
            <div className="overflow-x-auto px-4 py-3 bg-background-card">
              <table className="w-full text-xs font-mono" aria-label="Sector risk metrics by administration">
                <thead>
                  <tr>
                    <th scope="col" className="data-cell-header text-left">{t('heatmap.sector')}</th>
                    <th scope="col" className="data-cell-header text-right" title="Percentage of contracts awarded directly without competitive bidding">{t('heatmap.directAward')}</th>
                    <th scope="col" className="data-cell-header text-right" title="Percentage of competitive procedures with only one bidder">{t('heatmap.singleBid')}</th>
                    <th scope="col" className="data-cell-header text-right" title="Percentage of contracts scored as high or critical risk">{t('heatmap.highRisk')}</th>
                    <th scope="col" className="data-cell-header text-right" title="Average risk score (0-100%)">{t('heatmap.avgRisk')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorHeatmap
                    .filter((s) => s.contracts > 0)
                    .sort((a, b) => b.hr - a.hr)
                    .map((sector) => (
                    <tr key={sector.sectorId} className="hover:bg-background-elevated/30 transition-colors">
                      <td className="data-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} aria-hidden="true" />
                          <span className="text-text-secondary">{sector.name}</span>
                        </div>
                      </td>
                      <td className="data-cell text-right"><HeatCell value={sector.da} max={100} /></td>
                      <td className="data-cell text-right"><HeatCell value={sector.sb} max={50} /></td>
                      <td className="data-cell text-right"><HeatCell value={sector.hr} max={30} /></td>
                      <td className="data-cell text-right"><HeatCell value={sector.risk * 100} max={50} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </ScrollReveal>

          {/* Key Events + Documented Cases */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">{t('cronologiaLabel')}</div>
              <h3 className="text-sm font-mono text-text-primary">
                {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
              </h3>
              <p className="text-xs text-text-muted mt-1">{t('keyEventsSubtitle')}</p>
            </div>
            <div className="px-4 py-3 bg-background-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-text-muted tracking-[0.15em] uppercase mb-0.5">
                    {t('documentedCases')}
                  </h4>
                  <p className="text-xs text-text-muted/70 italic mb-3">{t('documentedCasesNote')}</p>
                  <div className="flex items-start gap-2 rounded-sm border border-border/30 bg-background-elevated/20 p-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <p className="text-xs text-text-secondary leading-relaxed">{t('groundTruthNote')}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-muted tracking-[0.15em] uppercase mb-2">
                    {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
                  </h4>
                  <HardcodedEventsTimeline adminName={selectedAdmin} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Vendors */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
                {t('vendorSection.title')}
              </div>
              <h3 className="text-sm font-mono text-text-primary">{t('vendorSection.subtitle')}</h3>
            </div>
            <div className="px-4 py-3 bg-background-card">
              <AdminVendorBreakdown
                vendors={selectedVendors}
                eraColor={selectedMeta.color}
                loading={breakdownLoading}
              />
            </div>
          </div>

          {/* Dossier Panel */}
          <AdminDossierPanel
            adminName={selectedAdmin}
            adminMeta={selectedMeta}
            agg={selectedAgg}
            vendors={selectedVendors}
            vendorsLoading={breakdownLoading}
            sectorData={sectorHeatmap}
          />

          {/* ── Lame-duck / term-year small multiples (demoted) ── */}
          <AdminCycleSmallMultiples
            administrations={adminCycleData}
            isEs={isEs}
          />

          {/* ── Period Comparison tool (collapsed footer utility) ── */}
          <div className="border border-border/40 rounded-sm">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-background-card text-left hover:bg-background-elevated/40 transition-colors"
              onClick={() => setCompareOpen((v) => !v)}
              aria-expanded={compareOpen}
            >
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-text-muted">
                {isEs ? '§ COMPARAR DOS PERIODOS' : '§ COMPARE TWO PERIODS'}
              </span>
              <span className="text-text-muted text-xs font-mono">{compareOpen ? '−' : '+'}</span>
            </button>
            {compareOpen && (
              <div className="px-4 pb-4">
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

// ProcurementGradeCard + computeProcurementGrade moved to components/administrations/ProcurementGradeCard.tsx
// TransitionMiniBar + TransitionMetric removed in P1 (L5 Transition Impact block cut)

// Hardcoded key events per administration — sourced from public records
const HARDCODED_EVENTS: Record<string, Array<{ year: number; title: string; type: 'reform' | 'scandal' | 'audit' | 'crisis'; impact: 'high' | 'medium' | 'low' }>> = {
  Fox: [
    { year: 2002, title: 'COMPRANET launched as digital procurement platform', type: 'reform', impact: 'medium' },
    { year: 2003, title: 'First ASF audit on widespread direct-award contracting', type: 'audit', impact: 'medium' },
    { year: 2004, title: 'PEMEXGATE scandal: diversions in maintenance contracts', type: 'scandal', impact: 'high' },
    { year: 2005, title: 'Acquisitions Law reform — new transparency requirements', type: 'reform', impact: 'medium' },
  ],
  Calderon: [
    { year: 2007, title: 'National Security Strategy launched — surge in defense contracts', type: 'crisis', impact: 'medium' },
    { year: 2008, title: 'Global financial crisis — federal spending contraction', type: 'crisis', impact: 'medium' },
    { year: 2009, title: 'AH1N1 flu: emergency procurement with minimal bidding', type: 'crisis', impact: 'high' },
    { year: 2010, title: 'PEMEX hires Odebrecht for Etileno XXI — bribery scheme begins', type: 'scandal', impact: 'high' },
    { year: 2012, title: 'New Government Procurement Law — broadest reform in 15 years', type: 'reform', impact: 'high' },
  ],
  'Pena Nieto': [
    { year: 2014, title: 'Casa Blanca scandal — conflict of interest with contractor Grupo Higa', type: 'scandal', impact: 'high' },
    { year: 2015, title: 'IMSS ghost-company network uncovered by ASF audit', type: 'scandal', impact: 'high' },
    { year: 2016, title: 'Odebrecht-PEMEX investigation — bribes for infrastructure contracts', type: 'scandal', impact: 'high' },
    { year: 2017, title: 'La Estafa Maestra: MXN 7.6B diverted through public universities', type: 'scandal', impact: 'high' },
    { year: 2017, title: 'September earthquakes — emergency procurement without bidding', type: 'crisis', impact: 'medium' },
    { year: 2018, title: 'CompraNet 5.0 reform — improved traceability', type: 'reform', impact: 'medium' },
  ],
  AMLO: [
    { year: 2019, title: 'Austerity decree — drastic reduction in service contracts', type: 'reform', impact: 'high' },
    { year: 2019, title: 'Militarization of megaprojects (AIFA, Tren Maya) — direct awards to Army', type: 'reform', impact: 'high' },
    { year: 2020, title: 'COVID-19 pandemic: emergency procurement of ventilators and medicines', type: 'crisis', impact: 'high' },
    { year: 2021, title: 'Segalmex scandal — MXN 9.4B fraud in food distribution', type: 'scandal', impact: 'high' },
    { year: 2022, title: 'SAT publishes final EFOS list: 38 COMPRANET vendors confirmed as ghost companies', type: 'audit', impact: 'high' },
    { year: 2023, title: 'Tren Maya: FONATUR awards MXN 180M in direct contracts to Sedena', type: 'scandal', impact: 'medium' },
  ],
  Sheinbaum: [
    { year: 2024, title: "Claudia Sheinbaum inaugurated — Mexico's first female president", type: 'reform', impact: 'low' },
    { year: 2024, title: 'Continuation of militarized infrastructure (AIFA, Dos Bocas refinery)', type: 'reform', impact: 'medium' },
    { year: 2025, title: 'Preliminary data — analysis ongoing as records accumulate', type: 'audit', impact: 'low' },
  ],
}

function HardcodedEventsTimeline({ adminName }: { adminName: AdminName }) {
  const { t } = useTranslation('administrations')
  const events = HARDCODED_EVENTS[adminName] ?? []
  const typeIcons: Record<string, React.ElementType> = {
    reform: FileText,
    scandal: AlertTriangle,
    audit: Shield,
    crisis: Activity,
  }
  const typeColors: Record<string, string> = {
    reform: '#3b82f6',
    scandal: '#f87171',
    audit: '#fbbf24',
    crisis: '#fb923c',
  }
  const typeLabels: Record<string, string> = {
    reform:  t('eventTypes.reform'),
    scandal: t('eventTypes.scandal'),
    audit:   t('eventTypes.audit'),
    crisis:  t('eventTypes.crisis'),
  }

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-text-muted text-xs">
        {t('eventsNoData')}
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
      {events.map((e, i) => {
        const Icon = typeIcons[e.type] ?? Activity
        const color = typeColors[e.type] ?? '#64748b'
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-sm border-l-2 pl-2.5 py-1.5"
            style={{ borderLeftColor: color }}
          >
            <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-mono font-semibold" style={{ color }}>
                  {e.year}
                </span>
                <span
                  className="text-[9px] font-medium px-1 py-0 rounded"
                  style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                >
                  {typeLabels[e.type]}
                </span>
              </div>
              <div className="text-xs text-text-secondary leading-snug">{e.title}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({
  label, value, delta: deltaVal, unit, icon: Icon, color, invertDelta,
}: {
  label: string
  value: string
  delta: number | null
  unit?: string
  icon: React.ElementType
  color: string
  invertDelta?: boolean
}) {
  const { t } = useTranslation('administrations')
  // Extract numeric portion for count-up animation
  const numericMatch = value.replace(/[,%]/g, '').match(/^[\d.]+/)
  const numericValue = numericMatch ? parseFloat(numericMatch[0]) : 0
  const isNumeric = numericValue > 0
  const { ref: countRef, value: countValue } = useCountUp(isNumeric ? numericValue : 0, 1200)

  // Build display: replace numeric part with animated count
  const displayValue = isNumeric
    ? value.replace(numericMatch![0], countValue.toLocaleString())
    : value

  return (
    <div className="card hover-lift p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs font-mono text-text-muted uppercase tracking-[0.15em]">{label}</span>
        </div>
        <div className="text-lg font-bold font-mono" style={{ color }}>
          <span ref={countRef}>{displayValue}</span>
        </div>
        {deltaVal !== null && (
          <div className="mt-0.5">
            <DeltaBadge val={deltaVal} unit={unit || ''} invertColor={invertDelta} />
            <span className="text-xs text-text-muted ml-1">{t('statCards.vsAvg')}</span>
          </div>
        )}
    </div>
  )
}

function HeatCell({ value, max }: { value: number; max: number }) {
  const ratio = Math.min(value / max, 1)
  // Interpolate from #bfdbfe (light blue) to #3730a3 (deep indigo) — same as matrix
  const r = Math.round(191 + (55  - 191) * ratio)
  const g = Math.round(219 + (48  - 219) * ratio)
  const b = Math.round(254 + (163 - 254) * ratio)
  const bg = `rgba(${r}, ${g}, ${b}, 0.15)`
  const text = `rgb(${r}, ${g}, ${b})`

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {value.toFixed(1)}%
    </span>
  )
}


// AdminSectorMatrix, PatternsView, PoliticalCycleView, ComparePeriodView
// extracted to components/administrations/ (2026-05-15).

