/**
 * Administration Deep Dive — Macro-to-Micro Presidential Analysis
 *
 * L0: Admin Selector (5 clickable cards)
 * L1: Selected Admin Overview (6 stat cards)
 * L2: Admin Comparison Table (replaces radar chart)
 * L3: Yearly Deep Dive (within selected admin)
 * L4: Sector Heatmap (12 sectors × 4 metrics)
 * L5: Transition Impact (4 delta cards)
 * L6: Events Timeline
 */

import { lazy, Suspense, useMemo, useState } from 'react'
import { PresidentAvatar } from '@/components/administrations/PresidentAvatar'
import { DeltaBadge } from '@/components/administrations/DeltaBadge'
import { AdminDossierPanel } from '@/components/administrations/AdminDossierPanel'
import { AdminSectorMatrix, MATRIX_SECTORS } from '@/components/administrations/AdminSectorMatrix'
import { PatternsView } from '@/components/administrations/PatternsView'
import { PoliticalCycleView } from '@/components/administrations/PoliticalCycleView'
import { ComparePeriodView } from '@/components/administrations/ComparePeriodView'
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
import { staggerContainer, slideUp, fadeIn } from '@/lib/animations'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'

import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import { TableExportButton } from '@/components/TableExportButton'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
} from '@/components/charts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  AlertTriangle,
  Shield,
  Users,
  Banknote,
  FileText,
  Activity,
} from 'lucide-react'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
// AdminVendorBreakdown is used in the default 'overview' tab — keep eager.
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
// All other charts only render when user navigates within the page —
// lazy-load so initial /administrations page-load doesn't pay for them.
const AdministrationFingerprints = lazy(() => import('@/components/charts/AdministrationFingerprints'))
const AdminRiskTrajectory = lazy(() => import('@/components/charts/AdminRiskTrajectory').then(m => ({ default: m.AdminRiskTrajectory })))
import { ShareButton } from '@/components/ShareButton'
import { FeaturedComparison } from '@/components/editorial/FeaturedComparison'
import { PlateFrame } from '@/components/atlas/PlateFrame'

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

// Map AdminName to i18n editorial key
const ERA_EDITORIAL_KEYS: Record<string, string> = {
  Fox: 'fox',
  Calderon: 'calderon',
  'Pena Nieto': 'penaNieto',
  AMLO: 'amlo',
  Sheinbaum: 'sheinbaum',
}

// PARTY_COLORS imported above.

// DOSSIER_DATA + ScandalRef + DossierEntry imported above.

// Administration colors for bar chart cells and reference bands
// Fox=blue, Calderon=green, Pena Nieto=red, AMLO=brown/sienna, Sheinbaum=teal
const ADMIN_COLORS: Record<string, string> = {
  Fox: '#3b82f6',
  Calderon: '#22c55e',
  'Pena Nieto': '#ef4444',
  AMLO: '#a16207',
  Sheinbaum: '#14b8a6',
}

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

// Comparison table metric definitions — direct bilingual labels (no i18n lookup needed)
const ADMIN_METRIC_KEYS: Array<{
  key: keyof AdminAgg
  label: { en: string; es: string }
  format: (v: number) => string
}> = [
  { key: 'contractsPerYear', label: { en: 'Contracts / yr', es: 'Contratos / año' }, format: (v) => formatNumber(Math.round(v)) },
  { key: 'valuePerYear',     label: { en: 'Avg annual spend', es: 'Gasto anual prom.' }, format: (v) => formatCompactMXN(v) },
  { key: 'avgRisk',          label: { en: 'Avg risk score', es: 'Riesgo promedio' }, format: (v) => (v * 100).toFixed(1) + '%' },
  { key: 'directAwardPct',   label: { en: 'Direct award', es: 'Adj. directa' }, format: (v) => v.toFixed(1) + '%' },
  { key: 'highRiskPct',      label: { en: 'High-risk rate', es: 'Tasa alto riesgo' }, format: (v) => v.toFixed(1) + '%' },
  { key: 'valueAtRisk',      label: { en: 'Value at risk', es: 'Gasto en riesgo' }, format: (v) => formatCompactMXN(v) },
  { key: 'singleBidPct',     label: { en: 'Single bid', es: 'Lic. única' }, format: (v) => v.toFixed(1) + '%' },
]

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

/** Pearson correlation coefficient between two equal-length series. */
function pearsonCorr(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return 0
  const mx = xs.slice(0, n).reduce((s, v) => s + v, 0) / n
  const my = ys.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0
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

export default function Administrations() {
  const { t, i18n } = useTranslation('administrations')
  const { t: ts } = useTranslation('sectors')
  const [selectedAdmin, setSelectedAdmin] = useState<AdminName>('AMLO')
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'political' | 'compare'>('overview')
  const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>('risk')
  const [trajectoryMetric, setTrajectoryMetric] = useState<'avg_risk' | 'direct_award_pct' | 'high_risk_pct'>('avg_risk')

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

  const selectedAgg = adminAggs.find((a) => a.name === selectedAdmin)
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin) ?? ADMINISTRATIONS[0]

  // Build AdminRiskTrajectory lines — one per administration, aligned to term year
  const adminTrajectoryLines = useMemo(() =>
    ADMINISTRATIONS.map((a) => {
      const agg = adminAggs.find((x) => x.name === a.name)
      return {
        name: a.name,
        color: a.color,
        startYear: a.dataStart,
        points: (agg?.years ?? []).map((y) => ({
          year: y.year,
          avg_risk: y.avg_risk,
          direct_award_pct: y.direct_award_pct,
          high_risk_pct: y.high_risk_pct,
          contracts: y.contracts,
        })),
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

  // ── ML: Transition statistical significance ───────────────────────────────
  // Compare each admin-to-admin delta to the distribution of all year-to-year
  // deltas, producing a z-score (how unusual is this transition?).
  const transitionSignificance = useMemo(() => {
    const result = new Map<string, { da: number; sb: number; hr: number }>()
    if (yoyData.length < 4 || transitions.length === 0) return result
    const allDeltaDA: number[] = []
    const allDeltaSB: number[] = []
    const allDeltaHR: number[] = []
    for (let i = 1; i < yoyData.length; i++) {
      allDeltaDA.push(yoyData[i].direct_award_pct - yoyData[i - 1].direct_award_pct)
      allDeltaSB.push(yoyData[i].single_bid_pct   - yoyData[i - 1].single_bid_pct)
      allDeltaHR.push(yoyData[i].high_risk_pct    - yoyData[i - 1].high_risk_pct)
    }
    for (const t of transitions) {
      result.set(`${t.from}-${t.to}`, {
        da: Math.abs(computeZScore(allDeltaDA, t.dDA.value)),
        sb: Math.abs(computeZScore(allDeltaSB, t.dSB.value)),
        hr: Math.abs(computeZScore(allDeltaHR, t.dHR.value)),
      })
    }
    return result
  }, [yoyData, transitions])

  // ── ML: Sector risk correlations ──────────────────────────────────────────
  // Within the selected admin's years, find sector pairs whose risk score
  // trajectories moved together (|r| ≥ 0.70).
  const topSectorCorrelations = useMemo(() => {
    if (!selectedMeta || sectorYearData.length === 0) return []
    const adminSY  = sectorYearData.filter(
      (sy) => sy.year >= selectedMeta.dataStart && sy.year < selectedMeta.end
    )
    const years = [...new Set(adminSY.map((r) => r.year))].sort()
    if (years.length < 3) return []
    const activeSectors = SECTORS.filter((s) =>
      adminSY.some((r) => r.sector_id === s.id && r.contracts > 0)
    )
    const vectors: Record<number, number[]> = {}
    for (const sec of activeSectors) {
      vectors[sec.id] = years.map((yr) => {
        const row = adminSY.find((r) => r.sector_id === sec.id && r.year === yr)
        return row ? row.avg_risk * 100 : 0
      })
    }
    const pairs: Array<{ sectorA: string; sectorB: string; r: number }> = []
    for (let i = 0; i < activeSectors.length; i++) {
      for (let j = i + 1; j < activeSectors.length; j++) {
        const r = pearsonCorr(vectors[activeSectors[i].id], vectors[activeSectors[j].id])
        if (Math.abs(r) >= 0.70 && !isNaN(r)) {
          pairs.push({ sectorA: ts(activeSectors[i].code), sectorB: ts(activeSectors[j].code), r })
        }
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4)
  }, [sectorYearData, selectedMeta, ts])

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
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
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

  return (
    <div className="min-h-screen bg-background relative">
      {/* Page paper-grain — scoped to this contemplative cross-sexenio
          surface. Pattern from rubli-folio-aesthetic § "Atmosphere —
          paper-grain overlay". */}
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
        {/* Folio·XI hero — replaces the prior utility header. EB Garamond
            italic 500 + ochre normal-weight fragment per
            rubli-folio-aesthetic § Typography. Named precedent: NYT
            Upshot multi-administration grouped comparison; FT small
            multiples for the radar-fingerprint grid. Cited in plan
            docs/FOLIO_V1_PHASE4_2026_05_07.md § 1. */}
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
              <span style={{ color: '#a06820', fontWeight: 500 }}>Folio·XI</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>
                {isEs
                  ? 'Análisis sexenal · 2002–2025'
                  : 'Cross-administration analysis · 2002–2025'}
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(30px, 4.4vw, 52px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.012em',
                  color: 'var(--color-text-primary)',
                }}
              >
                {isEs ? (
                  <>
                    Cinco administraciones,{' '}
                    <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                      un solo patrón.
                    </span>
                  </>
                ) : (
                  <>
                    {/* 2026-05-12 (Audit F157): "Six administrations" headline
                        contradicted "Five federal administrations" body and
                        the actual count (Fox / Calderón / Peña Nieto / AMLO /
                        Sheinbaum). Aligned to five. */}
                    Five administrations,{' '}
                    <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                      one pattern.
                    </span>
                  </>
                )}
              </h1>
              <p
                className="mt-4"
                style={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: '17px',
                  lineHeight: 1.55,
                  maxWidth: '68ch',
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.005em',
                }}
              >
                {isEs
                  ? 'Cinco gobiernos federales, tres partidos, una métrica constante: la adjudicación directa permanece sobre el techo OCDE en cada sexenio. La lámina central muestra la huella de cada administración a lo largo de las mismas seis dimensiones.'
                  : "Five federal administrations, three parties, one constant: the direct-award rate stays above the OECD ceiling under every term. The plate below shows each administration's fingerprint across the same six dimensions."}
              </p>
            </div>
            <div className="flex items-baseline gap-5 flex-shrink-0">
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">5</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{isEs ? 'Administraciones' : 'Administrations'}</div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--color-accent)' }}>9.9T MXN</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{isEs ? 'Gasto total' : 'Total spend'}</div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">3.1M</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{isEs ? 'Contratos' : 'Contracts'}</div>
              </div>
            </div>
          </div>
          {/* Dynamic risk annotations + source attribution row */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {(() => {
              if (adminAggs.length === 0) return null
              const sorted = [...adminAggs].sort((a, b) => b.highRiskPct - a.highRiskPct)
              const highest = sorted[0]
              const lowest = sorted[sorted.length - 1]
              return (
                <>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-risk-critical animate-pulse" />
                    <span>
                      {t('classifiedHeader.highestRiskNote')}{' '}
                      <strong className="text-risk-critical">{highest.highRiskPct.toFixed(2)}%</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-risk-low" />
                    <span>
                      {t('classifiedHeader.lowestRiskNote')}{' '}
                      <strong className="text-risk-low">{lowest.highRiskPct.toFixed(2)}%</strong>
                    </span>
                  </div>
                </>
              )
            })()}
            <div className="ml-auto flex items-center gap-3">
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

      {/* Tab Switcher — standalone row */}
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border/50 p-0.5 bg-background-elevated/30 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
              activeTab === 'overview'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t('tabs.overview')}
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={cn(
              'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
              activeTab === 'patterns'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t('tabs.patterns')}
          </button>
          <button
            onClick={() => setActiveTab('political')}
            className={cn(
              'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
              activeTab === 'political'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t('tabs.political')}
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={cn(
              'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
              activeTab === 'compare'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t('tabs.compare')}
          </button>
      </div>

      {activeTab === 'patterns' && (
        <>
          <PatternsView yoyData={yoyData} allTimeAvg={allTimeAvg} isLoading={yoyLoading} />

          {/* Risk Trajectory by Term Year — all 5 administrations overlaid */}
          <div className="card mt-6">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
                {t('trajectoryChart.title')}
              </div>
              <h3 className="text-sm font-mono text-text-primary flex items-center justify-between flex-wrap gap-2">
                {t('trajectoryChart.title')}
                <div className="flex gap-1">
                  {(['avg_risk', 'direct_award_pct', 'high_risk_pct'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTrajectoryMetric(m)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded border font-mono transition-colors',
                        trajectoryMetric === m
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-muted hover:border-accent/50',
                      )}
                    >
                      {m === 'avg_risk' ? t('trajectoryChart.metricRisk') : m === 'direct_award_pct' ? t('trajectoryChart.metricDA') : t('trajectoryChart.metricHR')}
                    </button>
                  ))}
                </div>
              </h3>
              <p className="text-xs text-text-muted mt-1">
                {t('trajectoryChart.subtitle')}
              </p>
            </div>
            <div className="px-4 py-3 bg-background-card">
              <Suspense fallback={<div className="h-[300px] bg-background-card animate-pulse rounded-sm" />}>
                <AdminRiskTrajectory
                  administrations={adminTrajectoryLines}
                  metric={trajectoryMetric}
                  loading={yoyLoading}
                />
              </Suspense>
            </div>
          </div>
        </>
      )}

      {activeTab === 'political' && <PoliticalCycleView />}

      {activeTab === 'compare' && <ComparePeriodView />}

      {activeTab === 'overview' && (
      <>

      {/* Editorial lede — biggest cross-sexenio swing in direct-award share */}
      {headlineTransition && (() => {
        const { top, prev, curr } = headlineTransition
        const deltaValue = top.dDA.value
        const direction = deltaValue > 0 ? t('lede.rose') : t('lede.fell')
        const absDelta = Math.abs(deltaValue).toFixed(1)
        const accent = deltaValue > 0 ? '#f87171' : 'var(--color-text-muted)'
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

      {/* L0: EXPEDIENTES PRESIDENCIALES */}
      <div className="mb-2">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-semibold mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          {t('expedientes')}
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
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
                {/* EXPEDIENTE label */}
                <div className="text-[9px] tracking-[0.25em] uppercase text-text-muted font-semibold mb-2">
                  {t('cardLabels.expediente')}
                </div>
                {/* President avatar + name row */}
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
                {/* Quick stats */}
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
                      agg && agg.highRiskPct > 10 ? 'text-risk-critical' : agg && agg.highRiskPct > 6 ? 'text-risk-high' : 'text-risk-low'
                    )}>
                      {agg ? agg.highRiskPct.toFixed(1) + '%' : '--'}
                    </span>
                  </div>
                </div>
                {/* Mini sparkline */}
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

      {/* ── DOSSIER PANEL — per-administration deep-dive ── */}
      <AdminDossierPanel
        adminName={selectedAdmin}
        adminMeta={selectedMeta}
        agg={selectedAgg}
        vendors={selectedVendors}
        vendorsLoading={breakdownLoading}
        sectorData={sectorHeatmap}
      />

      {/* Administration Fingerprints — radar comparison.
          Folio·XI plate: NYT Upshot multi-administration grouped
          comparison; FT small multiples per-admin radar. */}
      <PlateFrame
        lang={isEs ? 'es' : 'en'}
        folio="XI"
        contextLabel={{ en: 'Administrations atlas', es: 'Atlas de administraciones' }}
        caption={
          isEs
            ? 'Lámina — Seis dimensiones, cinco huellas presidenciales. La participación adjudicada directamente, los proveedores únicos, la concentración de gasto y el riesgo medio se grafican sobre un eje común. La forma de cada radar es la "huella" de la administración.'
            : "Plate — Six dimensions, five presidential fingerprints. Direct-award share, single-bidder share, spend concentration and mean risk are plotted on a shared axis. Each radar's shape is the administration's fingerprint."
        }
      >
        <Suspense fallback={<div className="h-[420px] bg-background-card animate-pulse rounded-sm" />}>
          <AdministrationFingerprints adminAggs={adminAggs} />
        </Suspense>
      </PlateFrame>

      {/* Editorial Narrative — INVESTIGACION */}
      <motion.div
        className="relative border-l-4 border-accent bg-background-card rounded-r-lg px-5 py-4 space-y-2"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent">
          {t('editorial.sectionTitle')}
        </div>
        <p className="text-xs font-mono font-semibold text-text-primary">
          {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.headline`)}
        </p>
        <p style={{ fontFamily: 'var(--font-family-serif)' }} className="text-sm text-text-secondary leading-relaxed">
          {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.findings`)}
        </p>
        <div className="pt-1 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-risk-high mb-1">{t('keyRisk')}</p>
            <p className="text-xs text-text-muted leading-relaxed">
              {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.keyRisk`)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-muted mb-1">{t('legacy')}</p>
            <p className="text-xs text-text-muted leading-relaxed">
              {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.legacy`)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Incomplete data warning for Sheinbaum */}
      {selectedAdmin === 'Sheinbaum' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-sm border border-risk-medium/30 bg-risk-medium/5">
          <AlertTriangle className="h-4 w-4 text-risk-medium mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-risk-medium">{t('incompleteDataset')}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {t('incompleteDatasetDescription')}
            </p>
          </div>
        </div>
      )}

      {/* L1: Selected Admin Overview */}
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

      {/* ── EL REGISTRO ── */}
      <div className="mb-2 mt-4">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-semibold mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          {t('evidenceSection.label')}
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* High-risk rate comparison — dramatic bar visualization */}
      <div className="bg-background-card rounded-sm border border-border/40 p-5 mb-4">
        <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-3">
          {t('evidenceSection.registryTitle')}
        </div>
        <div className="space-y-2.5">
          {adminAggs.map((a) => {
            const maxHrPct = Math.max(...adminAggs.map(ag => ag.highRiskPct), 1)
            const barWidth = (a.highRiskPct / maxHrPct) * 100
            const isAmlo = a.name === 'AMLO'
            const adminMeta = ADMINISTRATIONS.find(ad => ad.name === a.name)
            const partyColor = PARTY_COLORS[adminMeta?.party || ''] || '#64748b'
            return (
              <div key={a.name} className="group">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs font-mono w-24 text-right',
                    a.name === selectedAdmin ? 'font-bold text-text-primary' : 'text-text-muted'
                  )}>
                    {ADMIN_DISPLAY_NAMES[a.name] ?? a.name}
                  </span>
                  <div className="flex-1 relative flex items-center">
                    {(() => {
                      const N = 40, DR = 3, DG = 8
                      const filled = Math.max(1, Math.round((barWidth / 100) * N))
                      const color = isAmlo ? '#dc2626' : partyColor
                      return (
                        <svg viewBox={`0 0 ${N * DG} 10`} width={N * DG} height={10} aria-hidden="true">
                          {Array.from({ length: N }).map((_, k) => (
                            <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                              fill={k < filled ? color : 'var(--color-background-elevated)'}
                              stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                              strokeWidth={k < filled ? 0 : 0.5}
                              fillOpacity={k < filled ? 0.85 : 1}
                            />
                          ))}
                        </svg>
                      )
                    })()}
                    {isAmlo && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-risk-critical animate-pulse pl-2">
                        {t('evidenceSection.amloMultiplier')}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-mono font-bold w-14 text-right',
                    isAmlo ? 'text-risk-critical' : a.highRiskPct < 5 ? 'text-risk-low' : 'text-text-secondary'
                  )}>
                    {a.highRiskPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[10px] text-text-muted italic leading-relaxed">
          {t('evidenceSection.registryNote')}
        </p>
      </div>

      {/* Inflation disclaimer */}
      <div className="mb-4 flex items-start gap-2 rounded-sm border border-blue-500/20 bg-blue-500/8 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400/70" aria-hidden="true" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          {t('evidenceSection.inflationNote')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L2: Administration Comparison Table */}
        <div className="card-elevated">
          <div className="px-4 py-3 border-b border-border/60 bg-background-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono text-text-primary">
                  {t('comparisonTable')}
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  {t('comparisonTableDesc')}
                </p>
              </div>
              <TableExportButton
                filename="rubli-administraciones-comparativa.csv"
                data={ADMIN_METRIC_KEYS.map((metric) => {
                  const row: Record<string, unknown> = { metric: isEs ? metric.label.es : metric.label.en }
                  adminAggs.forEach((a) => { row[a.name] = a.contracts > 0 ? metric.format(a[metric.key] as number) : '—' })
                  return row
                })}
                className="shrink-0"
              />
            </div>
          </div>
          <div className="px-4 py-3 bg-background-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Administration comparison metrics">
                <thead>
                  <tr>
                    <th className="data-cell-header text-left">{t('table.metric')}</th>
                    {adminAggs.map((a) => {
                      const adminColor = ADMIN_COLORS[a.name]
                      return (
                        <th
                          key={a.name}
                          className="data-cell-header text-right"
                          style={{ color: a.name === selectedAdmin ? adminColor : `${adminColor}70` }}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: adminColor }}
                          />
                          {ADMIN_DISPLAY_NAMES[a.name] ?? a.name}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_METRIC_KEYS.map((metric) => {
                    // Compute min/max for this metric across admins with data — drives the ranking bar width
                    const activeValues = adminAggs
                      .filter((a) => a.contracts > 0)
                      .map((a) => a[metric.key] as number)
                    const minVal = activeValues.length > 0 ? Math.min(...activeValues) : 0
                    const maxVal = activeValues.length > 0 ? Math.max(...activeValues) : 0
                    const range = maxVal - minVal
                    return (
                      <tr key={metric.key}>
                        <td className="data-cell text-text-muted">{isEs ? metric.label.es : metric.label.en}</td>
                        {adminAggs.map((a) => {
                          const value = a[metric.key] as number
                          const hasData = a.contracts > 0
                          const barPct = hasData && range > 0
                            ? ((value - minVal) / range) * 100
                            : hasData ? 100 : 0
                          const adminColor = ADMIN_COLORS[a.name]
                          return (
                            <td
                              key={a.name}
                              className={cn(
                                'data-cell text-right font-mono align-top',
                                a.name === selectedAdmin
                                  ? 'font-semibold text-text-primary'
                                  : 'text-text-muted'
                              )}
                            >
                              <div>{hasData ? metric.format(value) : '—'}</div>
                              {hasData && (
                                <div
                                  className="mt-1 h-[2px] rounded-sm ml-auto"
                                  style={{
                                    width: `${Math.max(4, barPct)}%`,
                                    backgroundColor: adminColor,
                                    opacity: a.name === selectedAdmin ? 0.85 : 0.45,
                                  }}
                                  aria-hidden="true"
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Fox era data quality footnote */}
            <p className="text-[10px] text-text-muted mt-3 leading-relaxed border-t border-border/20 pt-2">
              * Fox era (2002–2006) uses Structure A COMPRANET data (RFC coverage 0.1%). Direct award flags were not reliably recorded — 0% is a data artifact, not a true policy metric.
              Risk scores for this period are directional estimates only.
            </p>
          </div>
        </div>

        {/* L3: Yearly Deep Dive */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border/60 bg-background-card">
            <h3 className="text-sm font-mono text-text-primary">
              {t('yearlyTrends', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
            </h3>
          </div>
          <div className="px-4 py-3 bg-background-card">
            {selectedAgg && selectedAgg.years.length > 0 ? (
              /* ── Pure SVG dual-axis chart: contract columns + pct polylines ── */
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
                  { key: 'da', pct: (y) => y.direct_award_pct, color: '#3b82f6', label: t('statCards.directAward') },
                  { key: 'sb', pct: (y) => y.single_bid_pct, color: '#fbbf24', label: t('statCards.singleBid') },
                  { key: 'hr', pct: (y) => y.high_risk_pct, color: RISK_COLORS.high, label: t('statCards.highRisk') },
                ]
                return (
                  <>
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Yearly trends: contract volume and procurement risk indicators">
                    {/* Left axis ticks */}
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
                    {/* Right axis ticks */}
                    {[0, 25, 50, 75, 100].map((pct) => {
                      const y = pctY(pct)
                      return (
                        <g key={pct}>
                          <line x1={W - MR} y1={y} x2={W - MR + 3} y2={y} stroke="#3f3f46" strokeWidth={1} />
                          <text x={W - MR + 5} y={y + 1} fill="var(--color-text-muted)" fontSize={10} textAnchor="start" dominantBaseline="middle" fontFamily="monospace">{pct}%</text>
                          {/* Horizontal grid */}
                          <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="var(--color-border-hover)" strokeWidth={0.5} strokeDasharray="3 4" />
                        </g>
                      )
                    })}
                    {/* Left axis line */}
                    <line x1={ML} y1={MT} x2={ML} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />
                    {/* Right axis line */}
                    <line x1={W - MR} y1={MT} x2={W - MR} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />
                    {/* Bottom axis */}
                    <line x1={ML} y1={MT + cH} x2={W - MR} y2={MT + cH} stroke="#3f3f46" strokeWidth={1} />

                    {/* Contract volume columns */}
                    {years.map((yr, i) => {
                      const x = xOf(i); const top = colY(yr.contracts)
                      return (
                        <rect
                          key={yr.year}
                          x={x - colW / 2}
                          y={top}
                          width={colW}
                          height={MT + cH - top}
                          fill={selectedMeta.color}
                          fillOpacity={eventSet.has(yr.year) ? 0.75 : 0.38}
                          rx={1}
                        />
                      )
                    })}

                    {/* Event reference lines */}
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

                    {/* Structural break lines */}
                    {adminBreaks.map((b) => {
                      const i = years.findIndex((y) => y.year === b.year)
                      if (i < 0) return null
                      const x = xOf(i)
                      return (
                        <g key={`brk-${b.year}-${b.metric}`}>
                          <line x1={x} y1={MT} x2={x} y2={MT + cH} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" />
                          <text x={x + 2} y={MT + 14} fill="#f59e0b" fontSize={10} fontFamily="monospace">!</text>
                        </g>
                      )
                    })}

                    {/* Pct polylines */}
                    {lines.map((ln) => (
                      <g key={ln.key}>
                        <polyline
                          points={years.map((yr, i) => `${xOf(i)},${pctY(ln.pct(yr))}`).join(' ')}
                          fill="none"
                          stroke={ln.color}
                          strokeWidth={1.8}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {years.map((yr, i) => (
                          <circle key={i} cx={xOf(i)} cy={pctY(ln.pct(yr))} r={2.4} fill={ln.color} fillOpacity={0.9} />
                        ))}
                      </g>
                    ))}

                    {/* Year labels */}
                    {years.map((yr, i) => (
                      <text key={yr.year} x={xOf(i)} y={H - 4} fill="var(--color-text-muted)" fontSize={10} textAnchor="middle" fontFamily="monospace">
                        {yr.year}
                      </text>
                    ))}

                  </svg>
                  <div className="flex flex-wrap gap-4 mt-1 px-1">
                    {lines.map((ln) => (
                      <div key={ln.key} className="flex items-center gap-1.5">
                        <svg width={16} height={10}><line x1={0} y1={5} x2={16} y2={5} stroke={ln.color} strokeWidth={1.8} /><circle cx={8} cy={5} r={2.2} fill={ln.color} /></svg>
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
                  <AlertTriangle className="h-3 w-3 text-risk-medium" />
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
      </div>

      {/* L4 + L5 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L4: Sector Heatmap */}
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
                  <th className="data-cell-header text-left">{t('heatmap.sector')}</th>
                  <th className="data-cell-header text-right" title="Percentage of contracts awarded directly without competitive bidding">{t('heatmap.directAward')}</th>
                  <th className="data-cell-header text-right" title="Percentage of competitive procedures with only one bidder">{t('heatmap.singleBid')}</th>
                  <th className="data-cell-header text-right" title="Percentage of contracts scored as high or critical risk">{t('heatmap.highRisk')}</th>
                  <th className="data-cell-header text-right" title="Average risk score (0-100%)">{t('heatmap.avgRisk')}</th>
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
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                        <span className="text-text-secondary">{sector.name}</span>
                      </div>
                    </td>
                    <td className="data-cell text-right">
                      <HeatCell value={sector.da} max={100} />
                    </td>
                    <td className="data-cell text-right">
                      <HeatCell value={sector.sb} max={50} />
                    </td>
                    <td className="data-cell text-right">
                      <HeatCell value={sector.hr} max={30} />
                    </td>
                    <td className="data-cell text-right">
                      <HeatCell value={sector.risk * 100} max={50} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topSectorCorrelations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted font-mono mb-1.5">
                  {t('sectorCorrelations')} — {t('sectorCorrelationsNote')}
                </div>
                <div className="space-y-1">
                  {topSectorCorrelations.map((p) => (
                    <div key={`${p.sectorA}-${p.sectorB}`} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className={cn(
                        'font-bold',
                        Math.abs(p.r) >= 0.90 ? 'text-risk-critical' : Math.abs(p.r) >= 0.80 ? 'text-risk-high' : 'text-risk-medium'
                      )}>
                        r={p.r > 0 ? '+' : ''}{p.r.toFixed(2)}
                      </span>
                      <span className="text-text-muted">{p.sectorA} ↔ {p.sectorB}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </ScrollReveal>

        {/* L5: Transition Impact */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border/60 bg-background-card">
            <h3 className="text-sm font-mono text-text-primary">
              {t('transitionImpact')}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {t('transitionSubtitle')}
            </p>
          </div>
          <div className="space-y-3 px-4 py-3 bg-background-card">
            {transitions.map((tr, i) => {
              const isRelevant = tr.to === selectedAdmin || tr.from === selectedAdmin
              const sig = transitionSignificance.get(`${tr.from}-${tr.to}`)
              const fromAgg = adminAggs.find((a) => a.name === tr.from)
              const toAgg = adminAggs.find((a) => a.name === tr.to)
              // Net change: use high-risk percentage delta as the headline metric
              const netDelta = tr.dHR.value
              const netIsWorse = netDelta > 0.01
              const netIsBetter = netDelta < -0.01
              return (
                <ScrollReveal key={`${tr.from}-${tr.to}`} delay={i * 100} direction="up">
                <div
                  className={cn(
                    'rounded-sm border p-3 transition-all',
                    isRelevant
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-border/20 bg-card opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/20">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tr.fromColor, boxShadow: `0 0 6px ${tr.fromColor}40` }} />
                    <span className="text-xs font-bold text-text-primary">{tr.from}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tr.toColor, boxShadow: `0 0 6px ${tr.toColor}40` }} />
                    <span className="text-xs font-bold text-text-primary">{tr.to}</span>
                    {/* Enhancement C: Net Change indicator */}
                    <div className="ml-auto flex items-center gap-1">
                      {netIsWorse ? (
                        <TrendingUp className="h-4 w-4 text-risk-critical" />
                      ) : netIsBetter ? (
                        <TrendingDown className="h-4 w-4 text-risk-low" />
                      ) : (
                        <Minus className="h-4 w-4 text-text-muted" />
                      )}
                      <span className={cn(
                        'text-sm font-bold font-mono',
                        netIsWorse ? 'text-risk-critical' : netIsBetter ? 'text-risk-low' : 'text-text-muted'
                      )}>
                        {Math.abs(netDelta) < 0.01 ? '--' : `${netDelta > 0 ? '+' : ''}${netDelta.toFixed(1)}pp`}
                      </span>
                      <span className="text-[8px] text-text-muted font-mono">HR</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <TransitionMetric label={t('transitionMetrics.directAward')} delta={tr.dDA.value} unit=" pts" significance={sig?.da} />
                    <TransitionMetric label={t('transitionMetrics.singleBid')} delta={tr.dSB.value} unit=" pts" significance={sig?.sb} />
                    <TransitionMetric label={t('transitionMetrics.highRisk')} delta={tr.dHR.value} unit=" pts" significance={sig?.hr} />
                    <TransitionMetric label={t('transitionMetrics.contracts')} delta={tr.dContracts.value} unit="" isCount />
                    <TransitionMetric label={t('transitionMetrics.vendors')} delta={tr.dVendors.value} unit="" isCount invertColor />
                  </div>
                  {/* Enhancement C: Mini-bar comparisons */}
                  {fromAgg && toAgg && (
                    <div className="mt-3 pt-2 border-t border-border/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="text-[8px] text-text-muted font-mono uppercase tracking-[0.15em] mb-0.5">{t('transitionMetrics.directAward')}</div>
                        <TransitionMiniBar
                          fromName={tr.from}
                          toName={tr.to}
                          fromValue={fromAgg.directAwardPct}
                          toValue={toAgg.directAwardPct}
                          maxValue={100}
                        />
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted font-mono uppercase tracking-[0.15em] mb-0.5">{t('transitionMetrics.highRisk')}</div>
                        <TransitionMiniBar
                          fromName={tr.from}
                          toName={tr.to}
                          fromValue={fromAgg.highRiskPct}
                          toValue={toAgg.highRiskPct}
                          maxValue={Math.max(fromAgg.highRiskPct, toAgg.highRiskPct, 1)}
                        />
                      </div>
                      <div>
                        <div className="text-[8px] text-text-muted font-mono uppercase tracking-[0.15em] mb-0.5">{t('transitionMetrics.singleBid')}</div>
                        <TransitionMiniBar
                          fromName={tr.from}
                          toName={tr.to}
                          fromValue={fromAgg.singleBidPct}
                          toValue={toAgg.singleBidPct}
                          maxValue={Math.max(fromAgg.singleBidPct, toAgg.singleBidPct, 1)}
                        />
                      </div>
                    </div>
                  )}
                </div>
                </ScrollReveal>
              )
            })}
            {transitions.length === 0 && (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('insufficientData')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin × Sector Risk Matrix */}
      <AdminSectorMatrix
        selectedAdmin={selectedAdmin}
        liveMatrix={liveAdminSectorMatrix}
        metric={matrixMetric}
        onMetricChange={setMatrixMetric}
      />

      {/* L6: Events Timeline */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">{t('cronologiaLabel')}</div>
          <h3 className="text-sm font-mono text-text-primary">
            {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {t('keyEventsSubtitle')}
          </p>
        </div>
        <div className="px-4 py-3 bg-background-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ground truth note */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-[0.15em] uppercase mb-0.5">
                {t('documentedCases')}
              </h4>
              <p className="text-xs text-text-muted/70 italic mb-3">
                {t('documentedCasesNote')}
              </p>
              <div className="flex items-start gap-2 rounded-sm border border-border/30 bg-card-hover/20 p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('groundTruthNote')}
                </p>
              </div>
            </div>

            {/* Events */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-[0.15em] uppercase mb-2">
                {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
              </h4>
              <HardcodedEventsTimeline adminName={selectedAdmin} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Vendors by Administration */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
            {t('vendorSection.title')}
          </div>
          <h3 className="text-sm font-mono text-text-primary">
            {t('vendorSection.subtitle')}
          </h3>
        </div>
        <div className="px-4 py-3 bg-background-card">
          <AdminVendorBreakdown
            vendors={selectedVendors}
            eraColor={selectedMeta.color}
            loading={breakdownLoading}
          />
        </div>
      </div>

      </> /* end overview tab */
      )}
    </div>
      </div>
    </div>
  )
}

// =============================================================================
// Enhancement A: Procurement Grade Card
// =============================================================================

// ProcurementGradeCard + computeProcurementGrade moved to components/administrations/ProcurementGradeCard.tsx

// =============================================================================
// Enhancement B: All-Administration Radar Comparison (Pure SVG)
// =============================================================================


// =============================================================================
// Enhancement C: Transition Impact Mini-Bar Comparison
// =============================================================================

function TransitionMiniBar({
  fromName,
  toName,
  fromValue,
  toValue,
  maxValue,
  invertColor,
}: {
  fromName: string
  toName: string
  fromValue: number
  toValue: number
  maxValue: number
  invertColor?: boolean
}) {
  const safeMax = Math.max(maxValue, 0.01)
  const fromPct = Math.min(100, (Math.abs(fromValue) / safeMax) * 100)
  const toPct = Math.min(100, (Math.abs(toValue) / safeMax) * 100)
  const isWorse = invertColor ? toValue < fromValue : toValue > fromValue
  const isBetter = invertColor ? toValue > fromValue : toValue < fromValue
  const toBarColor = isWorse ? '#f87171' : isBetter ? 'var(--color-text-muted)' : '#94a3b8'

  return (
    <div className="space-y-1 mt-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] text-text-muted font-mono w-16 text-right truncate">{fromName}</span>
        <div className="flex-1">
          {(() => {
            const N = 20, DR = 2, DG = 5
            const filled = Math.max(1, Math.round((fromPct / 100) * N))
            return (
              <svg viewBox={`0 0 ${N * DG} 6`} width={N * DG} height={6} aria-hidden="true">
                {Array.from({ length: N }).map((_, k) => (
                  <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                    fill={k < filled ? 'var(--color-text-muted)' : 'var(--color-background-elevated)'}
                    stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                    strokeWidth={k < filled ? 0 : 0.5}
                    fillOpacity={k < filled ? 0.5 : 1}
                  />
                ))}
              </svg>
            )
          })()}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] text-text-muted font-mono w-16 text-right truncate">{toName}</span>
        <div className="flex-1">
          {(() => {
            const N = 20, DR = 2, DG = 5
            const filled = Math.max(1, Math.round((toPct / 100) * N))
            return (
              <svg viewBox={`0 0 ${N * DG} 6`} width={N * DG} height={6} aria-hidden="true">
                {Array.from({ length: N }).map((_, k) => (
                  <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                    fill={k < filled ? toBarColor : 'var(--color-background-elevated)'}
                    stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                    strokeWidth={k < filled ? 0 : 0.5}
                    fillOpacity={k < filled ? 0.85 : 1}
                  />
                ))}
              </svg>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

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

function TransitionMetric({
  label, delta: d, unit, isCount, invertColor, significance,
}: {
  label: string
  delta: number
  unit: string
  isCount?: boolean
  invertColor?: boolean
  significance?: number
}) {
  const isUp = d > 0.01
  const isDown = d < -0.01
  // For non-inverted: up = bad (red), down = good (green); inverted = opposite
  const color = invertColor
    ? (isUp ? 'text-risk-low' : isDown ? 'text-risk-critical' : 'text-text-muted')
    : (isUp ? 'text-risk-critical' : isDown ? 'text-risk-low' : 'text-text-muted')
  const bgColor = invertColor
    ? (isUp ? 'bg-risk-low/8' : isDown ? 'bg-risk-critical/8' : 'bg-background-elevated/30')
    : (isUp ? 'bg-risk-critical/8' : isDown ? 'bg-risk-low/8' : 'bg-background-elevated/30')
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
  const abs = Math.abs(d)

  return (
    <div className={cn('text-center rounded-sm border border-border/20 px-2 py-1.5', bgColor)}>
      <div className="flex items-center justify-center gap-0.5 mb-1">
        <div className="text-[9px] text-text-muted font-mono uppercase tracking-[0.15em]">{label}</div>
        {significance !== undefined && significance >= 1.8 && (
          <span
            className={cn(
              'text-[8px] font-bold font-mono ml-0.5 px-1 py-0 rounded',
              significance >= 2.5 ? 'text-risk-critical bg-risk-critical/10' : 'text-risk-medium bg-risk-medium/10'
            )}
            title={`${significance.toFixed(1)} from historical norm`}
          >
            {significance >= 2.5 ? '!!' : '!'}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-1">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className={cn('text-sm font-bold font-mono', color)}>
          {abs < 0.01 ? '--' : isCount
            ? `${d > 0 ? '+' : ''}${formatNumber(Math.round(d))}`
            : `${d > 0 ? '+' : ''}${abs.toFixed(1)}${unit}`
          }
        </span>
      </div>
      {!isCount && abs >= 0.01 && (
        <div className="text-[8px] text-text-muted font-mono mt-0.5">
          {abs.toFixed(1)} pts
        </div>
      )}
    </div>
  )
}

// AdminSectorMatrix, PatternsView, PoliticalCycleView, ComparePeriodView
// extracted to components/administrations/ (2026-05-15).

