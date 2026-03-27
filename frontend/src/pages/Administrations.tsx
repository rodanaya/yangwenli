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

import { useMemo, useState, useRef, memo } from 'react'
import { useWikipediaImage } from '@/hooks/useWikipediaImage'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, slideUp, fadeIn } from '@/lib/animations'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange, ComparePeriodResponse, PoliticalCycleResponse } from '@/api/types'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from '@/components/charts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Landmark,
  AlertTriangle,
  Shield,
  Users,
  Banknote,
  FileText,
  Activity,
  ChevronDown,
} from 'lucide-react'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { FuentePill } from '@/components/ui/FuentePill'
import { MetodologiaTooltip } from '@/components/ui/MetodologiaTooltip'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'
import { AdminSectorSunburst } from '@/components/charts/AdminSectorSunburst'
import { AdminSectorHeatmap } from '@/components/charts/AdminSectorHeatmap'
import { AdminVendorBreakdown } from '@/components/charts/AdminVendorBreakdown'
import { AdminRiskTrajectory } from '@/components/charts/AdminRiskTrajectory'

// =============================================================================
// Constants
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox',       fullName: 'Vicente Fox',                   start: 2001, end: 2006, dataStart: 2002, color: '#3b82f6', party: 'PAN',    wikiArticle: 'Vicente_Fox_Quesada' },
  { name: 'Calderon',  fullName: 'Felipe Calderon',               start: 2006, end: 2012, dataStart: 2006, color: '#fb923c', party: 'PAN',    wikiArticle: 'Felipe_Calderón_Hinojosa' },
  { name: 'Pena Nieto',fullName: 'Enrique Pena Nieto',            start: 2012, end: 2018, dataStart: 2012, color: '#f87171', party: 'PRI',    wikiArticle: 'Enrique_Peña_Nieto' },
  { name: 'AMLO',      fullName: 'Andres Manuel Lopez Obrador',   start: 2018, end: 2024, dataStart: 2018, color: '#4ade80', party: 'MORENA', wikiArticle: 'Andrés_Manuel_López_Obrador' },
  { name: 'Sheinbaum', fullName: 'Claudia Sheinbaum',             start: 2024, end: 2030, dataStart: 2024, color: '#60a5fa', party: 'MORENA', wikiArticle: 'Claudia_Sheinbaum' },
] as const

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

// Party color mapping for badge/stripe
const PARTY_COLORS: Record<string, string> = {
  PAN: '#002395',
  PRI: '#008000',
  MORENA: '#8B0000',
}

// Administration colors for bar chart cells and reference bands
const ADMIN_COLORS: Record<string, string> = {
  Fox: '#6366f1',
  Calderon: '#3b82f6',
  'Pena Nieto': '#10b981',
  AMLO: '#f59e0b',
  Sheinbaum: '#ec4899',
}

// Sector list for the matrix grid
const MATRIX_SECTORS = [
  { key: 'salud',          code: 'S',  name: 'Health' },
  { key: 'educacion',      code: 'Ed', name: 'Education' },
  { key: 'infraestructura',code: 'In', name: 'Infrastructure' },
  { key: 'energia',        code: 'En', name: 'Energy' },
  { key: 'defensa',        code: 'D',  name: 'Defense' },
  { key: 'tecnologia',     code: 'T',  name: 'Technology' },
  { key: 'hacienda',       code: 'H',  name: 'Finance' },
  { key: 'gobernacion',    code: 'G',  name: 'Interior' },
  { key: 'agricultura',    code: 'A',  name: 'Agriculture' },
  { key: 'ambiente',       code: 'Am', name: 'Environment' },
  { key: 'trabajo',        code: 'Tr', name: 'Labor' },
  { key: 'otros',          code: 'O',  name: 'Other' },
]

type AdminName = typeof ADMINISTRATIONS[number]['name']

// Comparison table metric definitions — use fields from AdminAgg
const ADMIN_METRIC_KEYS = [
  { key: 'contractsPerYear' as const, labelKey: 'metrics.contractsPerYear', format: (v: number) => formatNumber(Math.round(v)) },
  { key: 'valuePerYear' as const,     labelKey: 'metrics.avgAnnualSpend',   format: (v: number) => formatCompactMXN(v) },
  { key: 'avgRisk' as const,          labelKey: 'metrics.avgRiskScore',     format: (v: number) => (v * 100).toFixed(1) + '%' },
  { key: 'directAwardPct' as const,   labelKey: 'metrics.directAwardPct',   format: (v: number) => v.toFixed(1) + '%' },
  { key: 'highRiskPct' as const,      labelKey: 'metrics.highRiskPct',      format: (v: number) => v.toFixed(1) + '%' },
  { key: 'singleBidPct' as const,     labelKey: 'metrics.singleBidPct',     format: (v: number) => v.toFixed(1) + '%' },
]

// =============================================================================
// Helpers
// =============================================================================

interface AdminAgg {
  name: AdminName
  contracts: number
  totalValue: number
  avgRisk: number
  directAwardPct: number
  singleBidPct: number
  highRiskPct: number
  vendorCount: number
  institutionCount: number
  years: YearOverYearChange[]
  // Derived for comparison table
  contractsPerYear: number
  valuePerYear: number
  yearCount: number
}

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

function DeltaBadge({ val, unit, invertColor }: { val: number; unit: string; invertColor?: boolean }) {
  const abs = Math.abs(val)
  const isUp = val > 0.01
  const isDown = val < -0.01
  const color = invertColor
    ? (isUp ? 'text-risk-low' : isDown ? 'text-risk-critical' : 'text-text-muted')
    : (isUp ? 'text-risk-critical' : isDown ? 'text-risk-low' : 'text-text-muted')
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-mono', color)}>
      <Icon className="h-3 w-3" />
      {abs < 0.01 ? '--' : `${val > 0 ? '+' : ''}${abs.toFixed(1)}${unit}`}
    </span>
  )
}

// =============================================================================
// Component
// =============================================================================

type MatrixMetric = 'risk' | 'da' | 'hr' | 'sb'

// ─── President photo avatar ────────────────────────────────────────────────
// Fetches official portrait from Wikipedia. Falls back to styled initials.
const PresidentAvatar = memo(function PresidentAvatar({
  wikiArticle,
  fullName,
  color,
  size = 32,
}: {
  wikiArticle: string
  fullName: string
  color: string
  size?: number
}) {
  const { src, isLoading } = useWikipediaImage(wikiArticle)
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('')

  return (
    <div
      className="flex-shrink-0 rounded-full overflow-hidden border-2"
      style={{
        width: size,
        height: size,
        borderColor: `${color}60`,
        backgroundColor: `${color}22`,
      }}
    >
      {src && !isLoading ? (
        <img
          src={src}
          alt={fullName}
          className="w-full h-full object-cover object-top"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center font-black font-mono"
          style={{ fontSize: size * 0.31, color }}
        >
          {initials}
        </span>
      )}
    </div>
  )
})

export default function Administrations() {
  const { t } = useTranslation('administrations')
  const { t: ts } = useTranslation('sectors')
  const [selectedAdmin, setSelectedAdmin] = useState<AdminName>('AMLO')
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'political' | 'compare'>('overview')
  const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>('risk')
  const [trajectoryMetric, setTrajectoryMetric] = useState<'avg_risk' | 'direct_award_pct' | 'high_risk_pct'>('avg_risk')

  // Data queries
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

  const { data: eventsResp } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: breaksResp } = useQuery({
    queryKey: ['analysis', 'structural-breaks'],
    queryFn: () => analysisApi.getStructuralBreaks(),
    staleTime: 30 * 60 * 1000,
  })

  const { data: breakdownResp, isLoading: breakdownLoading } = useQuery({
    queryKey: ['analysis', 'admin-breakdown'],
    queryFn: () => analysisApi.getAdminBreakdown(),
    staleTime: 60 * 60 * 1000,
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
    const era = breakdownResp?.eras.find((e) => e.era === eraKey)
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

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      {/* ── CLASSIFIED HEADER ── */}
      <div className="border-b border-border pb-6 mb-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-semibold mb-3">
          Informe Clasificado · RUBLI · Sistema Nacional de Transparencia
        </div>
        <h1 style={{ fontFamily: 'var(--font-family-serif)' }} className="text-2xl font-bold text-text-primary leading-tight mb-2">
          Los Sexenios de la Sombra
        </h1>
        <p className="text-base text-text-secondary leading-relaxed max-w-2xl">
          Análisis comparativo de riesgo en contratación pública federal · 2001-2025 · {formatNumber(3049988)} contratos · $9.87T MXN auditados
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-risk-critical animate-pulse" />
            <span>AMLO registro la tasa mas alta de riesgo: <strong className="text-risk-critical">15.82%</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-risk-low" />
            <span>EPN registro la mas baja: <strong className="text-risk-low">3.84%</strong></span>
          </div>
        </div>
      </div>

      {/* Data source + methodology */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <FuentePill source="COMPRANET" verified={true} />
        <MetodologiaTooltip
          title="Sobre la comparacion"
          body="Comparacion normalizada por ano y valor total presupuestal. Diferencias entre administraciones reflejan prioridades de politica, no necesariamente irregularidades. La mayor calidad de datos en 2018+ puede contribuir a tasas de riesgo mas altas."
          link="/methodology"
        />
      </div>

      {/* Tab Switcher — standalone row */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 p-0.5 bg-background-elevated/30 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
            <CardHeader className="pb-2">
              <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
                Comparación · Trayectoria de Riesgo
              </div>
              <CardTitle className="text-sm font-mono text-text-primary flex items-center justify-between flex-wrap gap-2">
                Risk Trajectory by Term Year — All Administrations
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
                      {m === 'avg_risk' ? 'Risk' : m === 'direct_award_pct' ? 'Direct Award' : 'High Risk'}
                    </button>
                  ))}
                </div>
              </CardTitle>
              <p className="text-xs text-text-muted mt-1">
                Each line traces one administration's metric across term years 1–6. Dashed = partial term data.
              </p>
            </CardHeader>
            <CardContent>
              <AdminRiskTrajectory
                administrations={adminTrajectoryLines}
                metric={trajectoryMetric}
                loading={yoyLoading}
              />
            </CardContent>
          </div>
        </>
      )}

      {activeTab === 'political' && <PoliticalCycleView />}

      {activeTab === 'compare' && <ComparePeriodView />}

      {activeTab === 'overview' && (
      <>

      {/* L0: EXPEDIENTES PRESIDENCIALES */}
      <div className="mb-2">
        <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-semibold mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          Expedientes Presidenciales
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
                'relative text-left w-full rounded-lg overflow-hidden transition-all duration-300',
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
                  Expediente
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
                    <span className="text-text-muted">Contratos</span>
                    <span className="font-mono font-semibold text-text-secondary">{agg ? formatNumber(agg.contracts) : '0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">Gasto total</span>
                    <span className="font-mono font-semibold text-text-secondary">{agg ? formatCompactMXN(agg.totalValue) : '$0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">Alto riesgo</span>
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
                  <div className="mt-2 h-6">
                    <ResponsiveContainer width="100%" height="100%">
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

      {/* Spending Fingerprint Sunburst — collapsed by default */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="card group-open:rounded-b-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Spending Fingerprint by Administration
                <ChevronDown className="h-3.5 w-3.5 text-text-muted ml-auto transition-transform group-open:rotate-180" />
              </CardTitle>
              <p className="text-xs text-text-muted">
                Inner ring = administration · Outer ring = sector spending · Click to expand
              </p>
            </CardHeader>
          </div>
        </summary>
        <div className="card border-t-0 rounded-t-none">
          <CardContent className="pt-4">
            <AdminSectorSunburst />
          </CardContent>
        </div>
      </details>

      {/* Administration Fingerprints — radar comparison */}
      <AdministrationFingerprints />

      {/* ── PROCUREMENT INTENSITY HEATMAP ── */}
      {sectorYearData.length > 0 && (
        <ScrollReveal direction="fade">
          <div className="card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Procurement Intensity Heatmap
              </CardTitle>
              <p className="text-xs text-text-muted">
                % of each administration's total spend allocated per sector.
                Darker cells = higher concentration of procurement spend in that sector.
              </p>
            </CardHeader>
            <CardContent>
              <AdminSectorHeatmap sectorYearData={sectorYearData} />
            </CardContent>
          </div>
        </ScrollReveal>
      )}

      {/* Editorial Narrative — INVESTIGACION */}
      <motion.div
        className="relative border-l-4 border-accent bg-background-card rounded-r-lg px-5 py-4 space-y-2"
        variants={fadeIn}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
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
            <p className="text-[10px] uppercase tracking-wider font-semibold text-risk-high mb-1">Key Risk</p>
            <p className="text-xs text-text-muted leading-relaxed">
              {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.keyRisk`)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-1">Legacy</p>
            <p className="text-xs text-text-muted leading-relaxed">
              {t(`editorial.${ERA_EDITORIAL_KEYS[selectedAdmin]}.legacy`)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Incomplete data warning for Sheinbaum */}
      {selectedAdmin === 'Sheinbaum' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-risk-medium/30 bg-risk-medium/5">
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
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
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
          Evidencia
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* High-risk rate comparison — dramatic bar visualization */}
      <div className="bg-background-card rounded-lg border border-border/40 p-5 mb-4">
        <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-accent mb-3">
          El Registro — Tasa de Alto Riesgo por Sexenio
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
                    {a.name}
                  </span>
                  <div className="flex-1 h-6 bg-background-elevated/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all duration-700 ease-out"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isAmlo ? 'var(--color-risk-critical)' : `${partyColor}80`,
                      }}
                    />
                    {isAmlo && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-risk-critical animate-pulse">
                        4x vs EPN
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
          Nota: la mayor cobertura de RFC en datos 2018+ puede contribuir a tasas de deteccion de riesgo mas altas en administraciones recientes.
        </p>
      </div>

      {/* Inflation disclaimer */}
      <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/8 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400/70" aria-hidden="true" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          All amounts in nominal MXN. Cumulative inflation 2002–2025 exceeds 150%. Cross-administration spending comparisons should account for purchasing power changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L2: Administration Comparison Table */}
        <div className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('comparisonTable')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              {t('comparisonTableDesc')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                          {a.name}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_METRIC_KEYS.map((metric) => (
                    <tr key={metric.key}>
                      <td className="data-cell text-text-muted">{t(metric.labelKey)}</td>
                      {adminAggs.map((a) => {
                        const value = a[metric.key] as number
                        return (
                          <td
                            key={a.name}
                            className={cn(
                              'data-cell text-right font-mono',
                              a.name === selectedAdmin
                                ? 'font-semibold text-text-primary'
                                : 'text-text-muted'
                            )}
                          >
                            {a.contracts > 0 ? metric.format(value) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </div>

        {/* L3: Yearly Deep Dive */}
        <div className="card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('yearlyTrends', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAgg && selectedAgg.years.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={selectedAgg.years} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => formatNumber(v)}
                    width={60}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-family-mono)',
                    }}
                    formatter={(value: unknown, name?: string) => {
                      const v = Number(value)
                      const n = name ?? ''
                      if (n === 'Contracts') return [formatNumber(v), n]
                      return [`${v.toFixed(1)}%`, n]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="contracts"
                    name="Contracts"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  >
                    {selectedAgg.years.map((yr) => (
                      <Cell key={yr.year} fill={selectedMeta.color} fillOpacity={0.6} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="direct_award_pct"
                    name="Direct Award %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="single_bid_pct"
                    name="Single Bid %"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="high_risk_pct"
                    name="High Risk %"
                    stroke={RISK_COLORS.high}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  {adminEvents.slice(0, 8).map((event) => (
                    <ReferenceLine
                      key={event.id ?? event.year}
                      yAxisId="left"
                      x={event.year}
                      stroke="#64748b"
                      strokeDasharray="3 3"
                      label={{
                        value: (event.title ?? '').slice(0, 15),
                        position: 'top',
                        fontSize: 9,
                        fill: '#64748b',
                      }}
                    />
                  ))}
                  {adminBreaks.map((b) => (
                    <ReferenceLine
                      key={`sb-${b.year}-${b.metric}`}
                      yAxisId="left"
                      x={b.year}
                      stroke="#f59e0b"
                      strokeDasharray="4 2"
                      label={{
                        value: '⚡',
                        position: 'top',
                        fontSize: 11,
                        fill: '#f59e0b',
                      }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-text-muted text-sm">
                {t('noData')}
              </div>
            )}
            {yearAnomalies.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3 w-3 text-risk-medium" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
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
          </CardContent>
        </div>
      </div>

      {/* L4 + L5 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L4: Sector Heatmap */}
        <ScrollReveal direction="fade">
        <div className="card-elevated">
          <CardHeader className="pb-2">
            <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">Evidencia · Perfil Sectorial</div>
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('sectorProfile', { admin: selectedAdmin })}
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              {t('heatmapSubtitle')}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1.5">
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
          </CardContent>
        </div>
        </ScrollReveal>

        {/* L5: Transition Impact */}
        <div className="card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('transitionImpact')}
            </CardTitle>
            <p className="text-xs text-text-muted mt-1">
              {t('transitionSubtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {transitions.map((t, i) => {
              const isRelevant = t.to === selectedAdmin || t.from === selectedAdmin
              const sig = transitionSignificance.get(`${t.from}-${t.to}`)
              return (
                <ScrollReveal key={`${t.from}-${t.to}`} delay={i * 100} direction="up">
                <div
                  className={cn(
                    'rounded-lg border p-3 transition-all',
                    isRelevant
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-border/20 bg-card opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.fromColor }} />
                    <span className="text-xs font-semibold text-text-secondary">{t.from}</span>
                    <ArrowRight className="h-3 w-3 text-text-muted" />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.toColor }} />
                    <span className="text-xs font-semibold text-text-secondary">{t.to}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <TransitionMetric label="Direct Award" delta={t.dDA.value} unit=" pts" significance={sig?.da} />
                    <TransitionMetric label="Single Bid" delta={t.dSB.value} unit=" pts" significance={sig?.sb} />
                    <TransitionMetric label="High Risk" delta={t.dHR.value} unit=" pts" significance={sig?.hr} />
                    <TransitionMetric label="Contracts" delta={t.dContracts.value} unit="" isCount />
                    <TransitionMetric label="Vendors" delta={t.dVendors.value} unit="" isCount invertColor />
                  </div>
                </div>
                </ScrollReveal>
              )
            })}
            {transitions.length === 0 && (
              <div className="py-8 text-center text-text-muted text-sm">
                {t('insufficientData')}
              </div>
            )}
          </CardContent>
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
        <CardHeader className="pb-2">
          <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">Cronologia · Hechos Documentados</div>
          <CardTitle className="text-sm font-mono text-text-primary">
            {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
          </CardTitle>
          <p className="text-xs text-text-muted mt-1">
            {t('keyEventsSubtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ground truth note */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-0.5">
                {t('documentedCases')}
              </h4>
              <p className="text-xs text-text-muted/70 italic mb-3">
                {t('documentedCasesNote')}
              </p>
              <div className="flex items-start gap-2 rounded-md border border-border/30 bg-card-hover/20 p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('groundTruthNote')}
                </p>
              </div>
            </div>

            {/* Events */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                {t('keyEvents', { admin: selectedAdmin, start: selectedMeta.dataStart, end: Math.min(selectedMeta.end - 1, 2025) })}
              </h4>
              <HardcodedEventsTimeline adminName={selectedAdmin} />
            </div>
          </div>
        </CardContent>
      </div>

      {/* Top Vendors by Administration */}
      <div className="card">
        <CardHeader className="pb-2">
          <div className="text-[9px] tracking-[0.2em] uppercase font-semibold text-text-muted mb-1">
            {t('vendorSection.title')}
          </div>
          <CardTitle className="text-sm font-mono text-text-primary">
            {t('vendorSection.subtitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminVendorBreakdown
            vendors={selectedVendors}
            eraColor={selectedMeta.color}
            loading={breakdownLoading}
          />
        </CardContent>
      </div>

      </> /* end overview tab */
      )}
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
    reform: 'Reform',
    scandal: 'Scandal',
    audit: 'Audit',
    crisis: 'Crisis',
  }

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-text-muted text-xs">
        No events recorded for this period.
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
            className="flex items-start gap-2.5 rounded-md border-l-2 pl-2.5 py-1.5"
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
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{label}</span>
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
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-0.5">
        <div className="text-xs text-text-muted font-mono uppercase">{label}</div>
        {significance !== undefined && significance >= 1.8 && (
          <span
            className={cn(
              'text-[9px] font-bold font-mono ml-0.5',
              significance >= 2.5 ? 'text-risk-critical' : 'text-risk-medium'
            )}
            title={`${significance.toFixed(1)}σ from historical norm`}
          >
            {significance >= 2.5 ? '!!' : '!'}
          </span>
        )}
      </div>
      <div className="mt-0.5">
        {isCount ? (
          <DeltaBadge
            val={d}
            unit=""
            invertColor={invertColor}
          />
        ) : (
          <DeltaBadge val={d} unit={unit} invertColor={invertColor} />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Admin × Sector Risk Heatmap Matrix
// =============================================================================

/** Interpolates from light blue (#bfdbfe) to deep indigo (#3730a3) — t must be 0–1 */
function intensityToColor(t: number): string {
  const c = Math.min(1, Math.max(0, t))
  // From #bfdbfe (191, 219, 254) to #3730a3 (55, 48, 163)
  const r = Math.round(191 + (55  - 191) * c)
  const g = Math.round(219 + (48  - 219) * c)
  const b = Math.round(254 + (163 - 254) * c)
  return `rgb(${r},${g},${b})`
}

type LiveCell = { risk: number; da: number; hr: number; sb: number }

function getCellIntensity(metric: MatrixMetric, v: LiveCell): number {
  switch (metric) {
    case 'risk': return Math.min(1, v.risk / 0.5)
    case 'da':   return Math.min(1, Math.max(0, (v.da - 20) / 80))
    case 'hr':   return Math.min(1, v.hr / 30)
    case 'sb':   return Math.min(1, v.sb / 40)
  }
}

function getCellDisplay(metric: MatrixMetric, v: LiveCell): string {
  switch (metric) {
    case 'risk': return (v.risk * 100).toFixed(0) + '%'
    case 'da':   return v.da.toFixed(0) + '%'
    case 'hr':   return v.hr.toFixed(0) + '%'
    case 'sb':   return v.sb.toFixed(0) + '%'
  }
}

interface MatrixCellProps {
  adminName: string
  sector: { key: string; code: string; name: string }
  intensity: number
  displayText: string
  isSelectedAdmin: boolean
}

function MatrixCell({ adminName, sector, intensity, displayText, isSelectedAdmin }: MatrixCellProps) {
  const bgColor = intensityToColor(intensity)
  return (
    <td className="p-0">
      <div
        className={cn(
          'relative flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-150 cursor-default select-none',
          isSelectedAdmin ? 'h-11 w-11' : 'h-10 w-10',
        )}
        style={{
          backgroundColor: `${bgColor}28`,
          border: isSelectedAdmin ? `1.5px solid ${bgColor}` : '1px solid transparent',
          borderRadius: 4,
        }}
        title={`${sector.name} · ${adminName}: ${displayText}`}
        aria-label={`${sector.name} under ${adminName}: ${displayText}`}
      >
        <span style={{ color: bgColor }}>{sector.code}</span>
        <span
          className="absolute bottom-0 left-0 rounded-b"
          style={{ height: 2, backgroundColor: bgColor, opacity: 0.6, width: `${intensity * 100}%` }}
        />
      </div>
    </td>
  )
}

const METRIC_LABELS: Record<MatrixMetric, string> = {
  risk: 'Avg Risk',
  da:   'Direct Award %',
  hr:   'High Risk %',
  sb:   'Single Bid %',
}

function AdminSectorMatrix({
  selectedAdmin,
  liveMatrix,
  metric,
  onMetricChange,
}: {
  selectedAdmin: AdminName
  liveMatrix: Record<string, Record<string, { risk: number; da: number; hr: number; sb: number }>> | null
  metric: MatrixMetric
  onMetricChange: (m: MatrixMetric) => void
}) {
  const { t } = useTranslation('administrations')
  const isLive = liveMatrix !== null
  return (
    <div className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-mono text-text-primary">
              {t('matrixTitle')}
            </CardTitle>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isLive ? t('matrixSubtitle') : t('matrixSubtitleLoading')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Metric toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-border/40 p-0.5 bg-background-elevated/30">
              {(Object.keys(METRIC_LABELS) as MatrixMetric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMetricChange(m)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                    metric === m
                      ? 'bg-accent/20 text-accent'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {METRIC_LABELS[m].replace(' %', '')}
                </button>
              ))}
            </div>
            {/* Gradient legend */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted font-mono">Low</span>
              <div
                className="h-3 w-20 rounded"
                style={{ background: 'linear-gradient(to right, rgb(191,219,254), rgb(55,48,163))' }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-text-muted font-mono">High</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="text-left pr-3 pb-1 text-[10px] text-text-muted font-normal w-24 whitespace-nowrap">
                Administration
              </th>
              {MATRIX_SECTORS.map((sector) => (
                <th key={sector.key} className="text-center pb-1 align-bottom" title={sector.name}>
                  <div className="flex justify-center">
                    <span
                      className="text-[10px] text-text-muted font-medium block"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        height: 52,
                        lineHeight: 1,
                        paddingBottom: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sector.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMINISTRATIONS.map((admin) => {
              const liveRow = liveMatrix?.[admin.name]
              const isSelected = admin.name === selectedAdmin
              const partyColor = PARTY_COLORS[admin.party] || '#64748b'
              return (
                <tr
                  key={admin.name}
                  className={cn('transition-colors', isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-90')}
                >
                  <td className="pr-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className="inline-block w-1.5 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: partyColor }}
                        title={admin.party}
                      />
                      <span className={cn('text-xs font-mono', isSelected ? 'text-text-primary font-bold' : 'text-text-muted')}>
                        {admin.name}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1 py-0 rounded"
                        style={{ backgroundColor: `${partyColor}25`, color: partyColor, border: `1px solid ${partyColor}40` }}
                      >
                        {admin.party}
                      </span>
                    </div>
                  </td>
                  {MATRIX_SECTORS.map((sector) => {
                    const cell = liveRow?.[sector.key] ?? { risk: 0, da: 0, hr: 0, sb: 0 }
                    const intensity = liveRow ? getCellIntensity(metric, cell) : 0
                    const displayText = liveRow ? getCellDisplay(metric, cell) : '—'
                    return (
                      <MatrixCell
                        key={sector.key}
                        adminName={admin.name}
                        sector={sector}
                        intensity={intensity}
                        displayText={displayText}
                        isSelectedAdmin={isSelected}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {isLive ? (
          <p className="mt-2 text-[10px] text-text-muted/50 italic">
            Source: COMPRANET contracts weighted by volume · {METRIC_LABELS[metric]}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-text-muted/50 italic">
            Loading sector data…
          </p>
        )}
      </CardContent>
    </div>
  )
}

// =============================================================================
// Patterns View — 23-year systemic pattern analysis
// =============================================================================

interface PatternsViewProps {
  yoyData: YearOverYearChange[]
  allTimeAvg: { da: number; sb: number; hr: number; risk: number }
  isLoading: boolean
}

function PatternsView({ yoyData, allTimeAvg, isLoading }: PatternsViewProps) {
  const systemicChartRef = useRef<HTMLDivElement>(null)
  const { data: breaksData } = useQuery({
    queryKey: ['analysis', 'structural-breaks'],
    queryFn: () => analysisApi.getStructuralBreaks(),
    staleTime: 60 * 60 * 1000,
  })

  const { data: politicalData } = useQuery({
    queryKey: ['analysis', 'political-cycle'],
    queryFn: () => analysisApi.getPoliticalCycle(),
    staleTime: 6 * 60 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  // OECD benchmark: ~20-30% direct award is "normal"
  const daVsOECD = allTimeAvg.da - 25 // deviation from OECD midpoint
  // December rush: approximate from single-bid patterns at year-end (use hr as proxy)
  const maxDA = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.direct_award_pct), 0) : 0
  const maxSB = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.single_bid_pct), 0) : 0
  const maxHR = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.high_risk_pct), 0) : 0
  const peakDAYear = yoyData.find(y => y.direct_award_pct === maxDA)?.year

  // Admin transition years for reference lines
  const transitionYears = [2006, 2012, 2018, 2024]
  const adminLabels: Record<number, string> = {
    2006: 'Calderon',
    2012: 'Peña',
    2018: 'AMLO',
    2024: 'Sheinbaum',
  }

  return (
    <div className="space-y-4">
      {/* Systemic pattern summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScrollReveal delay={0} direction="up">
        <div className="card">
          <CardContent className="p-4">
            <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Direct Award Rate</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.da > 50 ? 'text-risk-critical' : allTimeAvg.da > 30 ? 'text-risk-high' : 'text-risk-medium')}>
              {allTimeAvg.da.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              23-year average. OECD benchmark: 20–30%.
              {daVsOECD > 0 && (
                <span className="ml-1 text-risk-high">+{daVsOECD.toFixed(1)}pp above benchmark.</span>
              )}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Peak: {maxDA.toFixed(1)}%{peakDAYear ? ` (${peakDAYear})` : ''}
            </div>
          </CardContent>
        </div>
        </ScrollReveal>

        <ScrollReveal delay={80} direction="up">
        <div className="card">
          <CardContent className="p-4">
            <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Single Bidder Rate</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.sb > 30 ? 'text-risk-critical' : allTimeAvg.sb > 15 ? 'text-risk-high' : 'text-risk-medium')}>
              {allTimeAvg.sb.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              Competitive tenders with only one bidder — a primary collusion indicator.
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Peak: {maxSB.toFixed(1)}% · All-time high-risk: {maxHR.toFixed(1)}%
            </div>
          </CardContent>
        </div>
        </ScrollReveal>

        <ScrollReveal delay={160} direction="up">
        <div className="card">
          <CardContent className="p-4">
            <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">High Risk Rate</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.hr > 15 ? 'text-risk-critical' : allTimeAvg.hr > 8 ? 'text-risk-high' : 'text-risk-low')}>
              {allTimeAvg.hr.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              Contracts scored critical or high risk by the v6.0 risk model. Thresholds calibrated using ~390 documented corruption cases.
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {/* HARDCODED: "3.1M contracts" — update if total_contracts from API endpoint is available */}
              Avg risk score: {(allTimeAvg.risk * 100).toFixed(1)}% across 3.1M contracts
            </div>
          </CardContent>
        </div>
        </ScrollReveal>
      </div>

      {/* 23-year trend chart */}
      <ScrollReveal direction="fade">
      <div className="card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono text-text-primary">
              Systemic Patterns — 23-Year Timeline (2002–2025)
            </CardTitle>
            <ChartDownloadButton targetRef={systemicChartRef} filename="systemic-patterns-23yr" />
          </div>
        </CardHeader>
        <CardContent>
          {yoyData.length > 0 ? (
            <div ref={systemicChartRef}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={yoyData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.2} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'var(--font-family-mono)',
                  }}
                  formatter={(value: unknown, name?: string) => [`${Number(value).toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }} />
                {/* Administration background bands */}
                <ReferenceArea x1={2002} x2={2006} fill={ADMIN_COLORS['Fox']} fillOpacity={0.04} label={{ value: 'Fox', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                <ReferenceArea x1={2006} x2={2012} fill={ADMIN_COLORS['Calderon']} fillOpacity={0.04} label={{ value: 'Calderón', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                <ReferenceArea x1={2012} x2={2018} fill={ADMIN_COLORS['Pena Nieto']} fillOpacity={0.04} label={{ value: 'EPN', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                <ReferenceArea x1={2018} x2={2024} fill={ADMIN_COLORS['AMLO']} fillOpacity={0.04} label={{ value: 'AMLO', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                {/* Direct award national average benchmark */}
                <ReferenceLine y={78} stroke="rgba(255,165,0,0.4)" strokeDasharray="4 2" label={{ value: 'National avg 78%', fill: 'rgba(255,165,0,0.5)', fontSize: 10 }} />
                {/* Admin transition reference lines */}
                {transitionYears.map((year) => (
                  <ReferenceLine
                    key={year}
                    x={year}
                    stroke="#4b5563"
                    strokeDasharray="4 4"
                    label={{
                      value: adminLabels[year],
                      position: 'top',
                      fontSize: 9,
                      fill: '#6b7280',
                    }}
                  />
                ))}
                {/* Detected structural breakpoints */}
                {breaksData?.breakpoints
                  .filter((bp, i, arr) => arr.findIndex(b => b.year === bp.year) === i)
                  .map((bp) => (
                    <ReferenceLine
                      key={`break-${bp.year}-${bp.metric}`}
                      x={bp.year}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      label={{
                        value: `~${bp.year}`,
                        position: 'insideTopRight',
                        fontSize: 8,
                        fill: '#f59e0b',
                      }}
                    />
                  ))}
                <Line
                  type="monotone"
                  dataKey="direct_award_pct"
                  name="Direct Award %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="single_bid_pct"
                  name="Single Bid %"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="high_risk_pct"
                  name="High Risk %"
                  stroke={RISK_COLORS.high}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-text-muted text-sm">
              No data available
            </div>
          )}
          <p className="mt-3 text-xs text-text-muted leading-relaxed">
            Vertical dashed lines indicate presidential administration transitions.
            Three systemic patterns — direct awards bypassing competition, single-bidder tenders,
            and AI-flagged high-risk contracts — persist across all administrations regardless of political party.
          </p>
          {breaksData?.breakpoints && breaksData.breakpoints.length > 0 && (
            <p className="text-[10px] text-amber-500/80 font-mono mt-1">
              <Activity className="inline-block h-3 w-3 mr-0.5 align-text-bottom" /> Amber lines = statistically detected regime shifts (PELT algorithm)
            </p>
          )}
        </CardContent>
      </div>
      </ScrollReveal>

      {/* Political Budget Cycle — sexenio-year breakdown */}
      {politicalData && politicalData.sexenio_year_breakdown.length > 0 && (
        <ScrollReveal direction="fade">
        <div className="card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Political Budget Cycle — Risk by Sexenio Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-xs text-text-muted leading-relaxed">
              Mexico's 6-year presidential cycle creates predictable budget rhythms.
              Year 1 = new administration (election year). Year 3 = midterm elections. Year 6 = lame-duck spending surge.
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={politicalData.sexenio_year_breakdown}
                margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.2} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
                  interval={0}
                />
                <YAxis
                  yAxisId="risk"
                  domain={[0, 12]}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={36}
                />
                <YAxis
                  yAxisId="da"
                  orientation="right"
                  domain={[60, 85]}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'var(--font-family-mono)',
                  }}
                  formatter={(value: unknown, name?: string) => [`${Number(value).toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-family-mono)' }} />
                <Bar yAxisId="risk" dataKey="high_risk_pct" name="High Risk %" fill={RISK_COLORS.high} opacity={0.85} radius={[2, 2, 0, 0]} />
                <Line yAxisId="da" type="monotone" dataKey="direct_award_pct" name="Direct Award %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
            {politicalData.election_year_effect.risk_delta !== undefined && (
              <p className="mt-2 text-[11px] text-text-muted font-mono">
                Election year avg risk: {((politicalData.election_year_effect.election_year?.avg_risk ?? 0) * 100).toFixed(2)}%
                {' vs '}{((politicalData.election_year_effect.non_election_year?.avg_risk ?? 0) * 100).toFixed(2)}% non-election
                {' ('}
                <span className={politicalData.election_year_effect.risk_delta > 0 ? 'text-risk-high' : 'text-risk-low'}>
                  {politicalData.election_year_effect.risk_delta > 0 ? '+' : ''}{(politicalData.election_year_effect.risk_delta * 100).toFixed(3)}pp
                </span>
                {')'}
              </p>
            )}
          </CardContent>
        </div>
        </ScrollReveal>
      )}
    </div>
  )
}

// =============================================================================
// F4: Political Cycle View
// =============================================================================

function PoliticalCycleView() {
  const { data, isLoading } = useQuery<PoliticalCycleResponse>({
    queryKey: ['political-cycle'],
    queryFn: () => analysisApi.getPoliticalCycle(),
    staleTime: 30 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }
  if (!data) return null

  const { election_year_effect, sexenio_year_breakdown } = data

  const breakdownData = sexenio_year_breakdown.map((r) => ({
    label: r.label,
    avg_risk_pct: +(r.avg_risk * 100).toFixed(3),
    high_risk_pct: +r.high_risk_pct.toFixed(2),
    direct_award_pct: +r.direct_award_pct.toFixed(2),
    contracts: r.contracts,
  }))

  return (
    <div className="space-y-6">
      {/* Election Year Effect — 3 cards */}
      <div className="card">
        <CardHeader>
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            Election Year Effect
          </CardTitle>
          <p className="text-xs text-text-muted">Average procurement risk in election vs non-election years (2002–2025)</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Election years card */}
            <div className="rounded-lg border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-wider">Election Years</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: RISK_COLORS.high }}
              >
                {((election_year_effect.election_year?.avg_risk ?? 0) * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-text-muted">avg risk score</div>
              <div className="text-xs font-mono text-text-secondary mt-2">
                DA: {(election_year_effect.election_year?.direct_award_pct ?? 0).toFixed(1)}%
                {' · '}
                High-Risk: {(election_year_effect.election_year?.high_risk_pct ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {formatNumber(election_year_effect.election_year?.contracts ?? 0)} contracts
              </div>
            </div>

            {/* Non-election years card */}
            <div className="rounded-lg border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-wider">Non-Election Years</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: RISK_COLORS.low }}
              >
                {((election_year_effect.non_election_year?.avg_risk ?? 0) * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-text-muted">avg risk score</div>
              <div className="text-xs font-mono text-text-secondary mt-2">
                DA: {(election_year_effect.non_election_year?.direct_award_pct ?? 0).toFixed(1)}%
                {' · '}
                High-Risk: {(election_year_effect.non_election_year?.high_risk_pct ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {formatNumber(election_year_effect.non_election_year?.contracts ?? 0)} contracts
              </div>
            </div>

            {/* Delta card */}
            <div className="rounded-lg border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-wider">Risk Delta</div>
              {election_year_effect.risk_delta !== undefined ? (
                <>
                  <div
                    className={cn(
                      'text-3xl font-bold font-mono',
                      election_year_effect.risk_delta > 0 ? 'text-risk-high' : 'text-risk-low',
                    )}
                  >
                    {election_year_effect.risk_delta > 0 ? '+' : ''}
                    {(election_year_effect.risk_delta * 100).toFixed(3)}pp
                  </div>
                  <div className="text-[11px] text-text-muted">election − non-election</div>
                  {election_year_effect.risk_delta_pct !== undefined && (
                    <div className="text-xs font-mono text-text-secondary mt-2">
                      {election_year_effect.risk_delta_pct > 0 ? '+' : ''}
                      {election_year_effect.risk_delta_pct.toFixed(1)}% relative
                    </div>
                  )}
                  <div className="text-[11px] text-text-muted mt-1">
                    {election_year_effect.risk_delta > 0
                      ? 'Higher risk in election years'
                      : election_year_effect.risk_delta < 0
                      ? 'Lower risk in election years'
                      : 'No significant difference'}
                  </div>
                </>
              ) : (
                <div className="text-text-muted text-sm">Insufficient data</div>
              )}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Sexenio Year Breakdown Chart */}
      {breakdownData.length > 0 && (
        <ScrollReveal>
          <div className="card">
            <CardHeader>
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Landmark className="h-4 w-4 text-accent" />
                Sexenio Year Breakdown
              </CardTitle>
              <p className="text-xs text-text-muted">
                Average procurement risk across Years 1–6 of the presidential term (all administrations pooled)
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={breakdownData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="risk"
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    width={40}
                  />
                  <YAxis
                    yAxisId="da"
                    orientation="right"
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-family-mono)',
                    }}
                    formatter={(value: unknown, name?: string) => [
                      typeof value === 'number' ? `${value.toFixed(2)}%` : String(value ?? ''),
                      name ?? '',
                    ] as [string, string]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-family-mono)' }} />
                  <Bar
                    yAxisId="risk"
                    dataKey="avg_risk_pct"
                    name="Avg Risk %"
                    fill={RISK_COLORS.high}
                    opacity={0.85}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    yAxisId="risk"
                    dataKey="high_risk_pct"
                    name="High Risk %"
                    fill={RISK_COLORS.critical}
                    opacity={0.6}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="da"
                    type="monotone"
                    dataKey="direct_award_pct"
                    name="Direct Award %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-text-muted mt-2 font-mono">
                Year 1 = first year of administration, Year 6 = final year before election.
                Higher risk in late sexenio years may indicate &quot;budget dump&quot; spending.
              </p>
            </CardContent>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}

// =============================================================================
// F9: Period Comparison View
// =============================================================================

// Presidential administration presets for quick comparison
const ADMIN_PRESETS = [
  { label: 'Zedillo', start: '1994', end: '2000' },
  { label: 'Fox',     start: '2001', end: '2006' },
  { label: 'Calderón', start: '2006', end: '2012' },
  { label: 'Peña Nieto', start: '2012', end: '2018' },
  { label: 'AMLO',    start: '2018', end: '2024' },
  { label: 'Sheinbaum', start: '2024', end: '2030' },
] as const

interface CompareRow {
  metric: string
  p1: string
  p2: string
  delta: number        // raw numeric delta (P2 − P1)
  deltaFmt: string     // formatted delta string
  signal: 'worse' | 'better' | 'neutral'
  unit: string
}

function buildCompareRows(data: ComparePeriodResponse): CompareRow[] {
  const riskDelta = data.delta_risk
  const valueDelta = data.delta_value

  return [
    {
      metric: 'Avg Risk Score',
      p1: ((data.period1?.avg_risk ?? 0) * 100).toFixed(3) + '%',
      p2: ((data.period2?.avg_risk ?? 0) * 100).toFixed(3) + '%',
      delta: riskDelta,
      deltaFmt: (riskDelta > 0 ? '+' : '') + (riskDelta * 100).toFixed(3) + 'pp',
      signal: Math.abs(riskDelta) < 0.0005 ? 'neutral' : riskDelta > 0 ? 'worse' : 'better',
      unit: 'pp',
    },
    {
      metric: 'Total Spending',
      p1: formatCompactMXN(data.period1?.total_value ?? 0),
      p2: formatCompactMXN(data.period2?.total_value ?? 0),
      delta: valueDelta,
      deltaFmt: (valueDelta > 0 ? '+' : '') + formatCompactMXN(valueDelta),
      signal: 'neutral',
      unit: 'MXN',
    },
  ]
}

function SignalBadge({ signal }: { signal: 'worse' | 'better' | 'neutral' }) {
  if (signal === 'worse')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-critical"><TrendingUp className="h-3 w-3" />Worse</span>
  if (signal === 'better')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-low"><TrendingDown className="h-3 w-3" />Better</span>
  return <span className="text-xs text-text-muted"><Minus className="h-3 w-3 inline" /> —</span>
}

function ComparePeriodView() {
  const [p1Start, setP1Start] = useState('2012')
  const [p1End, setP1End] = useState('2018')
  const [p2Start, setP2Start] = useState('2018')
  const [p2End, setP2End] = useState('2024')
  const [enabled, setEnabled] = useState(true)

  const { data, isLoading, isFetching } = useQuery<ComparePeriodResponse>({
    queryKey: ['compare-periods', p1Start, p1End, p2Start, p2End],
    queryFn: () => analysisApi.comparePeriods(p1Start, p1End, p2Start, p2End),
    enabled,
    staleTime: 10 * 60 * 1000,
  })

  const inputCls =
    'w-20 h-8 px-2 rounded border border-border/40 bg-background-elevated/60 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors text-text-primary'

  const rows = useMemo(() => (data ? buildCompareRows(data) : []), [data])

  return (
    <div className="space-y-6">
      <div className="card">
        <CardHeader>
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-accent" />
            Compare Periods
          </CardTitle>
          <p className="text-xs text-text-muted">
            Compare procurement risk and total spending between any two time windows. Click an administration preset to fill Period A.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Administration presets */}
          <div>
            <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">Quick Presets → Period A</div>
            <div className="flex flex-wrap gap-1.5">
              {ADMIN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setP1Start(preset.start)
                    setP1End(preset.end)
                    setEnabled(true)
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                    p1Start === preset.start && p1End === preset.end
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'border-border/40 text-text-muted hover:text-text-primary hover:border-border',
                  )}
                >
                  {preset.label} {preset.start}–{preset.end}
                </button>
              ))}
            </div>
          </div>

          {/* Year selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">
                Period A
                {p1Start === p2Start && p1End === p2End ? (
                  <span className="ml-2 text-amber-500/80">Periods are identical</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1Start}
                  onChange={(e) => { setP1Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period A start year"
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1End}
                  onChange={(e) => { setP1End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period A end year"
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">Period B</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2Start}
                  onChange={(e) => { setP2Start(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period B start year"
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2End}
                  onChange={(e) => { setP2End(e.target.value); setEnabled(true) }}
                  className={inputCls}
                  aria-label="Period B end year"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setEnabled(true)}
            disabled={isFetching}
            className="px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? 'Loading…' : 'Compare Periods'}
          </button>
        </CardContent>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card">
          <CardContent className="pt-5 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </div>
      )}

      {/* Results table */}
      {data && !isLoading && (
        <div className="card">
          <CardHeader>
            <CardTitle className="text-xs font-mono text-text-muted">
              Results: Period A ({data.period1?.start}–{data.period1?.end}) vs Period B ({data.period2?.start}–{data.period2?.end})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table" aria-label="Period comparison results">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wider w-1/4">Metric</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Period A</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Period B</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Δ (B − A)</th>
                    <th className="text-center py-2 pl-4 text-xs font-medium text-text-muted uppercase tracking-wider">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.metric}
                      className={cn(
                        'border-b border-border/20 transition-colors',
                        row.signal === 'worse' && 'bg-risk-critical/5',
                        row.signal === 'better' && 'bg-risk-low/5',
                      )}
                    >
                      <td className="py-3 pr-4 text-xs font-medium text-text-secondary">{row.metric}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono tabular-nums text-text-primary">{row.p1}</td>
                      <td className="py-3 px-4 text-right text-xs font-mono tabular-nums text-text-primary">{row.p2}</td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right text-xs font-mono tabular-nums font-semibold',
                          row.signal === 'worse' ? 'text-risk-critical' :
                          row.signal === 'better' ? 'text-risk-low' :
                          'text-text-muted',
                        )}
                      >
                        {row.deltaFmt}
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <SignalBadge signal={row.signal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary footnote */}
            <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
              Signal: "Worse" = risk increased between periods. "Better" = risk decreased. Spending change is reported as neutral — higher spending may reflect legitimate growth or procurement expansion.
            </p>
          </CardContent>
        </div>
      )}
    </div>
  )
}
