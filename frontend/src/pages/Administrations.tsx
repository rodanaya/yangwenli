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

import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange, SexenioYearBreakdown, ComparePeriodResponse, PoliticalCycleResponse } from '@/api/types'
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
  Info,
} from 'lucide-react'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'

// =============================================================================
// Constants
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', fullName: 'Vicente Fox', start: 2001, end: 2006, dataStart: 2002, color: '#3b82f6', party: 'PAN' },
  { name: 'Calderon', fullName: 'Felipe Calderon', start: 2006, end: 2012, dataStart: 2006, color: '#fb923c', party: 'PAN' },
  { name: 'Pena Nieto', fullName: 'Enrique Pena Nieto', start: 2012, end: 2018, dataStart: 2012, color: '#f87171', party: 'PRI' },
  { name: 'AMLO', fullName: 'Andres Manuel Lopez Obrador', start: 2018, end: 2024, dataStart: 2018, color: '#4ade80', party: 'MORENA' },
  { name: 'Sheinbaum', fullName: 'Claudia Sheinbaum', start: 2024, end: 2030, dataStart: 2024, color: '#60a5fa', party: 'MORENA' },
] as const

// Party color mapping for badge/stripe
const PARTY_COLORS: Record<string, string> = {
  PAN: '#002395',
  PRI: '#008000',
  MORENA: '#8B0000',
}

// Admin × Sector risk matrix (hardcoded approximation based on known cases)
// Rows: 5 administrations | Cols: 12 sectors
// Values: estimated avg risk score (0–1)
const ADMIN_SECTOR_MATRIX: Record<string, Record<string, number>> = {
  Fox: {
    salud: 0.12, educacion: 0.09, infraestructura: 0.18, energia: 0.11,
    defensa: 0.07, tecnologia: 0.08, hacienda: 0.10, gobernacion: 0.13,
    agricultura: 0.09, ambiente: 0.08, trabajo: 0.07, otros: 0.10,
  },
  Calderon: {
    salud: 0.18, educacion: 0.14, infraestructura: 0.22, energia: 0.19,
    defensa: 0.15, tecnologia: 0.12, hacienda: 0.16, gobernacion: 0.20,
    agricultura: 0.17, ambiente: 0.11, trabajo: 0.13, otros: 0.14,
  },
  'Pena Nieto': {
    salud: 0.38, educacion: 0.25, infraestructura: 0.41, energia: 0.29,
    defensa: 0.18, tecnologia: 0.31, hacienda: 0.22, gobernacion: 0.35,
    agricultura: 0.44, ambiente: 0.20, trabajo: 0.19, otros: 0.27,
  },
  AMLO: {
    salud: 0.52, educacion: 0.31, infraestructura: 0.28, energia: 0.37,
    defensa: 0.14, tecnologia: 0.25, hacienda: 0.29, gobernacion: 0.33,
    agricultura: 0.61, ambiente: 0.22, trabajo: 0.20, otros: 0.24,
  },
  Sheinbaum: {
    salud: 0.21, educacion: 0.16, infraestructura: 0.19, energia: 0.23,
    defensa: 0.10, tecnologia: 0.18, hacienda: 0.17, gobernacion: 0.22,
    agricultura: 0.24, ambiente: 0.14, trabajo: 0.13, otros: 0.16,
  },
}

// Sector list for the matrix grid
const MATRIX_SECTORS = [
  { key: 'salud',          code: 'S',  name: 'Salud' },
  { key: 'educacion',      code: 'Ed', name: 'Educación' },
  { key: 'infraestructura',code: 'In', name: 'Infraestructura' },
  { key: 'energia',        code: 'En', name: 'Energía' },
  { key: 'defensa',        code: 'D',  name: 'Defensa' },
  { key: 'tecnologia',     code: 'T',  name: 'Tecnología' },
  { key: 'hacienda',       code: 'H',  name: 'Hacienda' },
  { key: 'gobernacion',    code: 'G',  name: 'Gobernación' },
  { key: 'agricultura',    code: 'A',  name: 'Agricultura' },
  { key: 'ambiente',       code: 'Am', name: 'Ambiente' },
  { key: 'trabajo',        code: 'Tr', name: 'Trabajo' },
  { key: 'otros',          code: 'O',  name: 'Otros' },
]

type AdminName = typeof ADMINISTRATIONS[number]['name']

const ADMIN_NARRATIVES: Record<AdminName, string> = {
  Fox: "Vicente Fox's term (2000–2006) marked the PAN's first presidential win after 71 years of PRI rule and the transition to COMPRANET digital procurement records. Data quality improves significantly from 2003 onward. Technology sector procurement expanded notably as e-government initiatives launched.",
  Calderon: "The Calderón administration (2006–2012) saw significant infrastructure and security procurement driven by the drug war. Single-bid rates remained elevated across defense-adjacent sectors, and PEMEX contracts from this era later became subjects of major corruption investigations including the Odebrecht bribery network.",
  'Pena Nieto': "Enrique Peña Nieto's administration (2012–2018) is the best-documented period for corruption cases in this dataset. IMSS ghost company networks, La Estafa Maestra, and the Casa Blanca conflict of interest all originate here. The PRI's return to power coincided with record-high vendor concentration in health and agriculture.",
  AMLO: "Under López Obrador (2018–2024), direct award contracts reached historic highs as austerity policies consolidated procurement through fewer channels. Health and energy sectors showed elevated risk patterns, particularly in COVID-19 emergency spending (Segalmex, COVID procurement fraud) despite the administration's anti-corruption rhetoric.",
  Sheinbaum: "Claudia Sheinbaum took office in October 2024. COMPRANET data for this administration is currently limited to a partial year. Risk patterns are preliminary and should not be compared to full six-year terms. Trends will become meaningful as the dataset expands through 2025–2030.",
}

// Comparison table metric definitions — use fields from AdminAgg
const ADMIN_METRICS = [
  {
    key: 'contractsPerYear' as const,
    label: 'Contracts / Year',
    format: (v: number) => formatNumber(Math.round(v)),
  },
  {
    key: 'valuePerYear' as const,
    label: 'Avg Annual Spend',
    format: (v: number) => formatCompactMXN(v),
  },
  {
    key: 'avgRisk' as const,
    label: 'Avg Risk Score',
    format: (v: number) => (v * 100).toFixed(1) + '%',
  },
  {
    key: 'directAwardPct' as const,
    label: 'Direct Award %',
    format: (v: number) => v.toFixed(1) + '%',
  },
  {
    key: 'highRiskPct' as const,
    label: 'High Risk %',
    format: (v: number) => v.toFixed(1) + '%',
  },
  {
    key: 'singleBidPct' as const,
    label: 'Single Bid %',
    format: (v: number) => v.toFixed(1) + '%',
  },
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

export default function Administrations() {
  const [selectedAdmin, setSelectedAdmin] = useState<AdminName>('AMLO')
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'political' | 'compare'>('overview')
  const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>('risk')
  const systemicChartRef = useRef<HTMLDivElement>(null)

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
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin)!

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
        return { sectorId: sector.id, code: sector.code, nameEN: sector.nameEN, color: sector.color, da: 0, sb: 0, hr: 0, risk: 0, contracts: 0 }
      }
      return {
        sectorId: sector.id,
        code: sector.code,
        nameEN: sector.nameEN,
        color: sector.color,
        contracts: totalContracts,
        da: sectorRows.reduce((s, r) => s + r.direct_award_pct * r.contracts, 0) / totalContracts,
        sb: sectorRows.reduce((s, r) => s + (r.single_bid_pct ?? 0) * r.contracts, 0) / totalContracts,
        hr: sectorRows.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalContracts,
        risk: sectorRows.reduce((s, r) => s + r.avg_risk * r.contracts, 0) / totalContracts,
      }
    })
  }, [sectorYearData, selectedMeta])

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
          pairs.push({ sectorA: activeSectors[i].nameEN, sectorB: activeSectors[j].nameEN, r })
        }
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4)
  }, [sectorYearData, selectedMeta])

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
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary font-mono tracking-tight">
            Administration Analysis
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Deep dive into procurement patterns across Mexican presidential administrations (2002–2025)
          </p>
        </div>
        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 p-0.5 bg-background-elevated/30 sm:flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === 'overview'
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            Administration Overview
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
            Systemic Patterns
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
            Political Cycle
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
            Period Comparison
          </button>
        </div>
      </div>

      {activeTab === 'patterns' && (
        <PatternsView yoyData={yoyData} allTimeAvg={allTimeAvg} isLoading={yoyLoading} />
      )}

      {activeTab === 'political' && <PoliticalCycleView />}

      {activeTab === 'compare' && <ComparePeriodView />}

      {activeTab === 'overview' && (
      <>

      {/* L0: Admin Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {ADMINISTRATIONS.map((admin, idx) => {
          const agg = adminAggs.find((a) => a.name === admin.name)
          const isSelected = selectedAdmin === admin.name
          return (
            <ScrollReveal key={admin.name} delay={idx * 80} direction="up">
            <button
              key={admin.name}
              onClick={() => setSelectedAdmin(admin.name)}
              className={cn(
                'relative text-left rounded-lg border p-3 transition-all duration-200 overflow-hidden',
                isSelected
                  ? 'border-accent bg-accent/10 shadow-md scale-[1.02]'
                  : 'border-border/50 hover:border-border hover:bg-background-card/50'
              )}
            >
              {/* Party color stripe at top */}
              <span
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t"
                style={{ backgroundColor: PARTY_COLORS[admin.party] || '#64748b' }}
              />
              {isSelected && (
                <span className="absolute top-[3px] left-3 right-3 h-[2px] rounded-b" style={{ backgroundColor: admin.color }} />
              )}
              <div className="flex items-center gap-2 mb-1.5 mt-1">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: admin.color }} />
                <span className={cn(
                  'text-sm font-semibold truncate',
                  isSelected ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {admin.name}
                </span>
                <span
                  className="text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    backgroundColor: `${PARTY_COLORS[admin.party] || '#64748b'}25`,
                    color: PARTY_COLORS[admin.party] || '#64748b',
                    border: `1px solid ${PARTY_COLORS[admin.party] || '#64748b'}50`,
                  }}
                >
                  {admin.party}
                </span>
              </div>
              <div className="text-xs text-text-muted font-mono">
                {admin.dataStart}–{Math.min(admin.end, 2025)}
              </div>
              <div className="mt-2 text-xs font-mono text-text-secondary">
                {agg ? formatNumber(agg.contracts) : '0'} contracts
              </div>
              {isSelected && (
                <div className="mt-1 text-xs text-accent font-mono">Selected</div>
              )}
              {/* Mini sparkline */}
              {agg && agg.years.length > 1 && (
                <div className="mt-1.5 h-6">
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
            </button>
            </ScrollReveal>
          )
        })}
      </div>

      {/* Editorial Narrative */}
      <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-card px-4 py-3">
        <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider mr-2">Context</span>
          <span className="text-sm text-text-secondary leading-relaxed">
            {ADMIN_NARRATIVES[selectedAdmin]}
          </span>
        </div>
      </div>

      {/* Incomplete data warning for Sheinbaum */}
      {selectedAdmin === 'Sheinbaum' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-risk-medium/30 bg-risk-medium/5">
          <AlertTriangle className="h-4 w-4 text-risk-medium mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-risk-medium">Incomplete Dataset</p>
            <p className="text-xs text-text-muted mt-0.5">
              Sheinbaum's administration began October 2024. This data covers ~4 months vs. 6-year full terms for other presidents. Direct comparisons may be misleading.
            </p>
          </div>
        </div>
      )}

      {/* L1: Selected Admin Overview */}
      {selectedAgg && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Contracts', value: formatNumber(selectedAgg.contracts), delta: null, icon: FileText },
            { label: 'Total Value', value: formatCompactMXN(selectedAgg.totalValue), delta: null, icon: Banknote },
            { label: 'Direct Award %', value: `${selectedAgg.directAwardPct.toFixed(1)}%`, delta: selectedAgg.directAwardPct - allTimeAvg.da, unit: ' pts', icon: Shield },
            { label: 'Single Bid %', value: `${selectedAgg.singleBidPct.toFixed(1)}%`, delta: selectedAgg.singleBidPct - allTimeAvg.sb, unit: ' pts', icon: Users },
            { label: 'High Risk %', value: `${selectedAgg.highRiskPct.toFixed(1)}%`, delta: selectedAgg.highRiskPct - allTimeAvg.hr, unit: ' pts', icon: AlertTriangle },
            { label: 'Active Vendors', value: formatNumber(selectedAgg.vendorCount), delta: null, icon: Activity, invertDelta: true },
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
        </div>
      )}

      {/* L2 + L3 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L2: Administration Comparison Table */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Administration Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-text-muted font-normal text-xs">Metric</th>
                    {adminAggs.map((a) => (
                      <th
                        key={a.name}
                        className={cn(
                          'text-right py-2 px-2 text-xs font-semibold',
                          a.name === selectedAdmin ? 'text-accent' : 'text-text-muted'
                        )}
                      >
                        {a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_METRICS.map((metric) => (
                    <tr key={metric.key} className="border-b border-border/30">
                      <td className="py-2 pr-4 text-xs text-text-muted">{metric.label}</td>
                      {adminAggs.map((a) => {
                        const value = a[metric.key] as number
                        return (
                          <td
                            key={a.name}
                            className={cn(
                              'text-right py-2 px-2 text-xs font-mono',
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
        </Card>

        {/* L3: Yearly Deep Dive */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Yearly Trends — {selectedAdmin} ({selectedMeta.dataStart}–{Math.min(selectedMeta.end - 1, 2025)})
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
                    {selectedAgg.years.map((_, i) => (
                      <Cell key={i} fill={selectedMeta.color} fillOpacity={0.6} />
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
                No yearly data available for this administration
              </div>
            )}
            {yearAnomalies.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3 w-3 text-risk-medium" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    AI-Detected Anomalies
                  </span>
                  <span className="text-[10px] text-text-muted">— years deviating &gt;1.8σ from 23-year baseline</span>
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
        </Card>
      </div>

      {/* L4 + L5 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* L4: Sector Heatmap */}
        <ScrollReveal direction="fade">
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Sector Risk Profile — {selectedAdmin}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-3 py-2.5 text-xs text-text-muted font-medium">Sector</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of contracts awarded directly without competitive bidding">Direct Award</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of competitive procedures with only one bidder">Single Bid</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of contracts scored as high or critical risk">High Risk</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Average risk score (0-100%)">Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {sectorHeatmap
                  .filter((s) => s.contracts > 0)
                  .sort((a, b) => b.hr - a.hr)
                  .map((sector) => (
                  <tr key={sector.sectorId} className="border-b border-border/10 hover:bg-card-hover/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                        <span className="text-text-secondary">{sector.nameEN}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.da} max={100} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.sb} max={50} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.hr} max={30} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.risk * 100} max={50} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topSectorCorrelations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1.5">
                  Risk Comovement — correlated sector pairs (r ≥ 0.70)
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
        </Card>
        </ScrollReveal>

        {/* L5: Transition Impact */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Transition Impact
            </CardTitle>
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
                Insufficient data for transition analysis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin × Sector Risk Matrix */}
      <AdminSectorMatrix
        selectedAdmin={selectedAdmin}
        liveMatrix={liveAdminSectorMatrix}
        metric={matrixMetric}
        onMetricChange={setMatrixMetric}
      />

      {/* L6: Events Timeline */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-text-primary">
            Key Events — {selectedAdmin} ({selectedMeta.dataStart}–{Math.min(selectedMeta.end - 1, 2025)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ground truth note */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-0.5">
                Documented Corruption Cases
              </h4>
              <p className="text-xs text-text-muted/70 italic mb-3">
                Manually verified from public records and ASF investigations — not ML-detected
              </p>
              <div className="flex items-start gap-2 rounded-md border border-border/30 bg-card-hover/20 p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Known corruption cases documented in this period are tracked in the{' '}
                  <a
                    href="/ground-truth"
                    className="text-accent underline underline-offset-2 hover:no-underline"
                  >
                    Ground Truth
                  </a>{' '}
                  section, including vendor matches, contract counts, and detection rates for each case.
                </p>
              </div>
            </div>

            {/* Events */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                Key Events
              </h4>
              {adminEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {adminEvents.map((e, ei) => {
                    const Icon = e.type === 'election' ? Landmark
                      : e.type === 'crisis' ? AlertTriangle
                      : e.type === 'audit' ? Shield
                      : Activity
                    return (
                      <ScrollReveal key={e.id} delay={ei * 60} direction="left">
                      <div
                        className="flex items-start gap-2 rounded-md border-l-2 border-border/30 pl-2 py-1"
                        style={{
                          borderLeftColor: e.impact === 'high' ? RISK_COLORS.critical : e.impact === 'medium' ? RISK_COLORS.medium : 'var(--color-border)',
                        }}
                      >
                        <Icon className="h-3 w-3 mt-0.5 text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-text-secondary leading-snug">{e.title}</div>
                          <div className="text-xs text-text-muted font-mono">{e.date}</div>
                        </div>
                      </div>
                      </ScrollReveal>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-text-muted text-xs">
                  No events recorded for this period
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      </> /* end overview tab */
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

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
    <Card className="bg-card border-border/40">
      <CardContent className="p-4">
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
            <span className="text-xs text-text-muted ml-1">vs avg</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HeatCell({ value, max }: { value: number; max: number }) {
  const ratio = Math.min(value / max, 1)
  const r = Math.round(200 * ratio + 40)
  const g = Math.round(200 * (1 - ratio) + 40)
  const bg = `rgba(${r}, ${g}, 60, 0.15)`
  const text = `rgb(${r}, ${g}, 60)`

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

/** Interpolates from green (#4ade80) to red (#f87171) — t must be 0–1 */
function intensityToColor(t: number): string {
  const c = Math.min(1, Math.max(0, t))
  const r = Math.round(74  + (248 - 74)  * c)
  const g = Math.round(222 + (113 - 222) * c)
  const b = Math.round(128 + (113 - 128) * c)
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
  const isLive = liveMatrix !== null
  return (
    <Card className="bg-card border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-mono text-text-primary">
              Administration × Sector Matrix
            </CardTitle>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isLive ? 'Live data from COMPRANET — click a metric to change view' : 'Estimated values (data loading…)'}
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
                style={{ background: 'linear-gradient(to right, rgb(74,222,128), rgb(248,113,113))' }}
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
                <th key={sector.key} className="text-center pb-1" title={sector.name}>
                  <span className="text-[10px] text-text-muted font-mono">{sector.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMINISTRATIONS.map((admin) => {
              const liveRow = liveMatrix?.[admin.name]
              const fallbackRow = ADMIN_SECTOR_MATRIX[admin.name]
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
                    let intensity: number
                    let displayText: string
                    if (liveRow) {
                      const cell = liveRow[sector.key] ?? { risk: 0, da: 0, hr: 0, sb: 0 }
                      intensity = getCellIntensity(metric, cell)
                      displayText = getCellDisplay(metric, cell)
                    } else {
                      // Fallback: use hardcoded risk approximations
                      const score = fallbackRow?.[sector.key] ?? 0
                      intensity = Math.min(1, score / 0.5)
                      displayText = (score * 100).toFixed(0) + '%'
                    }
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
        {isLive && (
          <p className="mt-2 text-[10px] text-text-muted/50 italic">
            Source: COMPRANET contracts weighted by volume · {METRIC_LABELS[metric]}
          </p>
        )}
      </CardContent>
    </Card>
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
  const maxDA = Math.max(...yoyData.map(y => y.direct_award_pct), 0)
  const maxSB = Math.max(...yoyData.map(y => y.single_bid_pct), 0)
  const maxHR = Math.max(...yoyData.map(y => y.high_risk_pct), 0)
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
        <Card className="bg-card border-border/40">
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
        </Card>
        </ScrollReveal>

        <ScrollReveal delay={80} direction="up">
        <Card className="bg-card border-border/40">
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
        </Card>
        </ScrollReveal>

        <ScrollReveal delay={160} direction="up">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">High Risk Rate</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.hr > 15 ? 'text-risk-critical' : allTimeAvg.hr > 8 ? 'text-risk-high' : 'text-risk-low')}>
              {allTimeAvg.hr.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              Contracts scored critical or high risk by the AI model. OECD benchmark: 2–15%.
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Avg risk score: {(allTimeAvg.risk * 100).toFixed(1)}% across 3.1M contracts
            </div>
          </CardContent>
        </Card>
        </ScrollReveal>
      </div>

      {/* 23-year trend chart */}
      <ScrollReveal direction="fade">
      <Card className="bg-card border-border/40">
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
      </Card>
      </ScrollReveal>

      {/* Political Budget Cycle — sexenio-year breakdown */}
      {politicalData && politicalData.sexenio_year_breakdown.length > 0 && (
        <ScrollReveal direction="fade">
        <Card className="bg-card border-border/40">
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
        </Card>
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
      <Card>
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
      </Card>

      {/* Sexenio Year Breakdown Chart */}
      {breakdownData.length > 0 && (
        <ScrollReveal>
          <Card>
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
                      typeof value === 'number' ? `${value.toFixed(2)}%` : value,
                      name,
                    ]}
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
          </Card>
        </ScrollReveal>
      )}
    </div>
  )
}

// =============================================================================
// F9: Period Comparison View
// =============================================================================

function ComparePeriodView() {
  const [p1Start, setP1Start] = useState('2012')
  const [p1End, setP1End] = useState('2018')
  const [p2Start, setP2Start] = useState('2018')
  const [p2End, setP2End] = useState('2024')
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, isFetching } = useQuery<ComparePeriodResponse>({
    queryKey: ['compare-periods', p1Start, p1End, p2Start, p2End],
    queryFn: () => analysisApi.comparePeriods(p1Start, p1End, p2Start, p2End),
    enabled,
    staleTime: 10 * 60 * 1000,
  })

  const inputCls =
    'w-20 h-8 px-2 rounded border border-border/40 bg-background-elevated/60 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors text-text-primary'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-accent" />
            Period Comparison
          </CardTitle>
          <p className="text-xs text-text-muted">
            Compare procurement risk and total spending between any two time windows
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-5">
            <div>
              <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">Period 1</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1Start}
                  onChange={(e) => { setP1Start(e.target.value); setEnabled(false) }}
                  className={inputCls}
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p1End}
                  onChange={(e) => { setP1End(e.target.value); setEnabled(false) }}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">Period 2</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2Start}
                  onChange={(e) => { setP2Start(e.target.value); setEnabled(false) }}
                  className={inputCls}
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  type="number"
                  min={2002}
                  max={2025}
                  value={p2End}
                  onChange={(e) => { setP2End(e.target.value); setEnabled(false) }}
                  className={inputCls}
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
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Period 1 card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-mono text-text-muted">
                Period 1 · {data.period1.start} – {data.period1.end}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-[11px] text-text-muted">Total Value</div>
                <div className="text-2xl font-bold font-mono">{formatCompactMXN(data.period1.total_value)}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted">Avg Risk Score</div>
                <div className="text-2xl font-bold font-mono" style={{ color: RISK_COLORS.high }}>
                  {(data.period1.avg_risk * 100).toFixed(3)}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period 2 card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-mono text-text-muted">
                Period 2 · {data.period2.start} – {data.period2.end}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-[11px] text-text-muted">Total Value</div>
                <div className="text-2xl font-bold font-mono">{formatCompactMXN(data.period2.total_value)}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted">Avg Risk Score</div>
                <div className="text-2xl font-bold font-mono" style={{ color: RISK_COLORS.high }}>
                  {(data.period2.avg_risk * 100).toFixed(3)}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk delta */}
          <Card className="border-border/40">
            <CardContent className="pt-5">
              <div className="text-[11px] text-text-muted mb-1 uppercase tracking-wider">Risk Delta (P2 − P1)</div>
              <div
                className={cn(
                  'text-3xl font-bold font-mono',
                  data.delta_risk > 0 ? 'text-risk-high' : data.delta_risk < 0 ? 'text-risk-low' : 'text-text-secondary',
                )}
              >
                {data.delta_risk > 0 ? '+' : ''}{(data.delta_risk * 100).toFixed(3)}pp
              </div>
              <div className="text-xs text-text-muted mt-1">
                {data.delta_risk > 0
                  ? 'Risk increased in Period 2'
                  : data.delta_risk < 0
                  ? 'Risk decreased in Period 2'
                  : 'No change in risk'}
              </div>
            </CardContent>
          </Card>

          {/* Value delta */}
          <Card className="border-border/40">
            <CardContent className="pt-5">
              <div className="text-[11px] text-text-muted mb-1 uppercase tracking-wider">Spending Delta (P2 − P1)</div>
              <div
                className={cn(
                  'text-3xl font-bold font-mono',
                  data.delta_value > 0 ? 'text-accent' : 'text-risk-high',
                )}
              >
                {data.delta_value > 0 ? '+' : ''}{formatCompactMXN(data.delta_value)}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {data.delta_value > 0
                  ? 'Higher spending in Period 2'
                  : 'Lower spending in Period 2'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
