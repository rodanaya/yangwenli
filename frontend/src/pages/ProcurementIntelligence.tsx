/**
 * Procurement Risk Intelligence
 *
 * Interactive investigation tool: money flows, risk factors, temporal patterns,
 * collusion signals. Every entity is clickable. Every section is filterable.
 */

import { useState, useMemo } from 'react'
import { TableExportButton } from '@/components/TableExportButton'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { RiskPyramid } from '@/components/charts/RiskPyramid'
import { SectorParadoxScatter } from '@/components/charts/SectorParadoxScatter'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RISK_COLORS, SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { MoneyFlowItem, RiskFactorFrequency, FactorCooccurrence, ThresholdGamingResponse, SectorYearItem, YearOverYearChange } from '@/api/types'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ComposedChart,
} from '@/components/charts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Network,
  ExternalLink,
  AlertTriangle,
  Filter,
  X,
  Target,
  Activity,
  Minus,
} from 'lucide-react'

// =============================================================================
// Colour helpers
// =============================================================================

function lerpColor(colorA: string, colorB: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const a = parse(colorA); const b = parse(colorB)
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

function riskScoreToColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return lerpColor(RISK_COLORS.high, RISK_COLORS.critical, (score - 0.3) / 0.2)
  if (score >= 0.1) return lerpColor(RISK_COLORS.medium, RISK_COLORS.high, (score - 0.1) / 0.2)
  return lerpColor(RISK_COLORS.low, RISK_COLORS.medium, score / 0.1)
}

/** Maps a risk score to a categorical RISK_COLORS entry (no lerp blending).
 *  Use this for bar/cell fills so each bar gets a distinct, readable color. */
function riskScoreToCategoricalColor(score: number): string {
  if (score >= 0.50) return RISK_COLORS.critical
  if (score >= 0.30) return RISK_COLORS.high
  if (score >= 0.10) return RISK_COLORS.medium
  return RISK_COLORS.low
}

function riskBadgeClass(risk: number | null): string {
  if (risk == null) return 'text-text-muted'
  if (risk >= 0.5) return 'text-risk-critical font-bold'
  if (risk >= 0.3) return 'text-risk-high font-bold'
  if (risk >= 0.1) return 'text-risk-medium'
  return 'text-risk-low'
}

function liftToColor(lift: number): string {
  if (lift >= 2) return 'bg-risk-critical/30 text-risk-critical'
  if (lift >= 1.5) return 'bg-risk-high/25 text-risk-high'
  if (lift >= 1) return 'bg-risk-medium/20 text-risk-medium'
  return 'bg-zinc-700/30 text-text-muted'
}

// =============================================================================
// Sector color resolver — maps institution name fragments to sector colors
// =============================================================================

/** Attempt to infer sector from institution name for node coloring. */
function inferSectorColor(name: string): string {
  const n = name.toLowerCase()
  if (/salud|imss|issste|insalud|hospital|médico|medico|ssa|cnpss/.test(n)) return SECTOR_COLORS.salud
  if (/educac|unam|ipn|sep|conacyt|tecnológic|universidad|escuela/.test(n)) return SECTOR_COLORS.educacion
  if (/infra|scct|conagua|carretera|obra|construcción|caminos|puentes/.test(n)) return SECTOR_COLORS.infraestructura
  if (/pemex|cfe|energía|energia|petróleo|petroleo|gas|comisión federal/.test(n)) return SECTOR_COLORS.energia
  if (/defensa|sedena|semar|ejército|ejercito|armada/.test(n)) return SECTOR_COLORS.defensa
  if (/tecnolog|informática|sistemas|digital|sat\b/.test(n)) return SECTOR_COLORS.tecnologia
  if (/hacienda|shcp|fisco|tributar|banco de mexico|banxico/.test(n)) return SECTOR_COLORS.hacienda
  if (/gobernac|interior|segob|migrac|policía|policia|fgr|pgr/.test(n)) return SECTOR_COLORS.gobernacion
  if (/agricu|sagarpa|sader|campo|forestal|pesca|alimenta/.test(n)) return SECTOR_COLORS.agricultura
  if (/ambient|ecología|ecologia|semarnat|agua|medio/.test(n)) return SECTOR_COLORS.ambiente
  if (/trabajo|stps|empleo|laboral/.test(n)) return SECTOR_COLORS.trabajo
  return SECTOR_COLORS.otros
}

// =============================================================================
// Name abbreviation — shorten long government agency / vendor names
// =============================================================================

const KNOWN_ACRONYMS: Record<string, string> = {
  'Instituto Mexicano Del Seguro Social': 'IMSS',
  'Instituto Mexicano del Seguro Social': 'IMSS',
  'Instituto De Seguridad Y Servicios Sociales De Los Trabajadores Del Estado': 'ISSSTE',
  'Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado': 'ISSSTE',
  'Comision Federal De Electricidad': 'CFE',
  'Comisión Federal de Electricidad': 'CFE',
  'Petroleos Mexicanos': 'PEMEX',
  'Petróleos Mexicanos': 'PEMEX',
  'Secretaria De Salud': 'SSA',
  'Secretaría de Salud': 'SSA',
  'Secretaria De Educacion Publica': 'SEP',
  'Secretaría de Educación Pública': 'SEP',
  'Secretaria De Hacienda Y Credito Publico': 'SHCP',
  'Secretaría de Hacienda y Crédito Público': 'SHCP',
  'Secretaria De La Defensa Nacional': 'SEDENA',
  'Secretaría de la Defensa Nacional': 'SEDENA',
  'Secretaria De Marina': 'SEMAR',
  'Secretaría de Marina': 'SEMAR',
  'Secretaria De Gobernacion': 'SEGOB',
  'Secretaría de Gobernación': 'SEGOB',
  'Secretaria De Comunicaciones Y Transportes': 'SCT',
  'Secretaría de Comunicaciones y Transportes': 'SCT',
  'Secretaria De Agricultura Y Desarrollo Rural': 'SADER',
  'Secretaría de Agricultura y Desarrollo Rural': 'SADER',
  'Secretaria De Medio Ambiente Y Recursos Naturales': 'SEMARNAT',
  'Secretaría de Medio Ambiente y Recursos Naturales': 'SEMARNAT',
  'Servicio De Administracion Tributaria': 'SAT',
  'Servicio de Administración Tributaria': 'SAT',
  'Comision Nacional Del Agua': 'CONAGUA',
  'Comisión Nacional del Agua': 'CONAGUA',
  'Instituto Politecnico Nacional': 'IPN',
  'Instituto Politécnico Nacional': 'IPN',
  'Universidad Nacional Autonoma De Mexico': 'UNAM',
  'Universidad Nacional Autónoma de México': 'UNAM',
  'Fondo De Cultura Economica': 'FCE',
  'Fondo de Cultura Económica': 'FCE',
}

const SKIP_WORDS = new Set(['de', 'del', 'y', 'la', 'las', 'los', 'el', 'a', 'e', 'en', 'por', 'para', 'con', 'sa', 'sapi', 'cv', 'de cv', 's.a', 's.a.'])

/** Abbreviate long names: check known acronyms first, then derive from initials, then truncate. */
function abbreviateName(name: string, maxLen = 22): string {
  if (name.length <= maxLen) return name
  if (KNOWN_ACRONYMS[name]) return KNOWN_ACRONYMS[name]
  const words = name.split(/\s+/)
  const acronym = words
    .filter(w => w.length > 1 && !SKIP_WORDS.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .join('')
  if (acronym.length >= 3 && acronym.length <= 7) return acronym
  return name.slice(0, maxLen - 1) + '…'
}

// =============================================================================
// Factor label helpers
// =============================================================================

type TFn = (key: string) => string

function getFactorGroup(factor: string): string {
  if (factor.startsWith('split_') && parseInt(factor.replace('split_', ''), 10) >= 10) return 'split_10+'
  if (factor.startsWith('network_') && parseInt(factor.replace('network_', ''), 10) >= 5) return 'network_5+'
  return factor
}

function getFactorLabel(factor: string, t: TFn): string {
  const group = getFactorGroup(factor)
  const safe = group.replace(/[<>+]/g, '').replace(/_+$/, '')
  const map: Record<string, string> = { split_10: 'split_10plus', network_5: 'network_5plus' }
  const key = `factors.${map[safe] ?? safe}`
  const translated = t(key)
  if (translated !== key) return translated
  if (factor.startsWith('split_')) return `×${factor.replace('split_', '')}`
  if (factor.startsWith('network_')) return `Red (${factor.replace('network_', '')})`
  return factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function consolidateFactors(data: RiskFactorFrequency[], t: TFn) {
  const groups = new Map<string, { count: number; riskSum: number; percentage: number }>()
  for (const d of data) {
    const group = getFactorGroup(d.factor)
    const ex = groups.get(group)
    if (ex) { ex.count += d.count; ex.riskSum += d.avg_risk_score * d.count; ex.percentage += d.percentage }
    else groups.set(group, { count: d.count, riskSum: d.avg_risk_score * d.count, percentage: d.percentage })
  }
  return Array.from(groups.entries()).map(([group, { count, riskSum, percentage }]) => ({
    factor: group,
    label: getFactorLabel(group, t),
    count, percentage,
    avg_risk_score: count > 0 ? riskSum / count : 0,
  }))
}

// =============================================================================
// Co-occurrence heatmap
// =============================================================================

function CooccurrenceHeatmap({ cooccurrences, factors, t, onCellClick }: {
  cooccurrences: FactorCooccurrence[]
  factors: string[]
  t: TFn
  onCellClick?: (fa: string, fb: string) => void
}) {
  const filtered = useMemo(() => cooccurrences.filter(c => c.lift > 1.0), [cooccurrences])
  const liftMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of filtered) {
      m.set(`${c.factor_a}|${c.factor_b}`, c.lift)
      m.set(`${c.factor_b}|${c.factor_a}`, c.lift)
    }
    return m
  }, [filtered])
  const relevantFactors = useMemo(() => {
    const seen = new Set<string>()
    for (const c of filtered) { seen.add(c.factor_a); seen.add(c.factor_b) }
    return factors.filter(f => seen.has(f))
  }, [factors, filtered])

  if (relevantFactors.length === 0) return (
    <div className="flex items-center justify-center h-24 text-text-muted text-xs">No co-occurrence data</div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="text-xs" role="grid">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background-card z-10 p-1 min-w-[90px]" />
            {relevantFactors.map(f => (
              <th key={f} className="p-1 text-text-muted font-normal"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', minWidth: 26 }}>
                {getFactorLabel(f, t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relevantFactors.map(rowF => (
            <tr key={rowF}>
              <td className="sticky left-0 bg-background-card z-10 p-1 text-text-secondary font-medium whitespace-nowrap pr-2 text-[11px]">
                {getFactorLabel(rowF, t)}
              </td>
              {relevantFactors.map(colF => {
                const lift = liftMap.get(`${rowF}|${colF}`)
                return (
                  <td key={colF} className="p-0.5 text-center"
                    title={lift != null ? `${getFactorLabel(rowF, t)} + ${getFactorLabel(colF, t)}: lift ${lift.toFixed(2)}` : '—'}>
                    {rowF === colF ? (
                      <div className="w-6 h-6 rounded bg-border/20 text-text-muted flex items-center justify-center">—</div>
                    ) : lift != null ? (
                      <button
                        onClick={() => onCellClick?.(rowF, colF)}
                        className={cn('w-6 h-6 rounded flex items-center justify-center text-xs font-medium hover:ring-1 hover:ring-accent/50 transition-all', liftToColor(lift))}
                      >
                        {lift.toFixed(1)}
                      </button>
                    ) : (
                      <div className="w-6 h-6 rounded bg-border/10" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// =============================================================================
// Sort icon helper
// =============================================================================

type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="h-3 w-3 text-text-muted/40 ml-0.5 inline" />
  return dir === 'desc'
    ? <ChevronDown className="h-3 w-3 text-accent ml-0.5 inline" />
    : <ChevronUp className="h-3 w-3 text-accent ml-0.5 inline" />
}

// =============================================================================
// Task A — Flow Sankey-style visual nodes
// =============================================================================

interface FlowRow {
  sourceId: number
  sourceName: string
  targetId: number
  targetName: string
  value: number
  contracts: number
  avgRisk: number
  highRiskPct: number
}

/** Vertical Sankey-style node pair showing sector color on the left node. */
function SankeyFlowViz({ flows, totalValue }: { flows: FlowRow[]; totalValue: number }) {
  if (flows.length === 0) return null

  // Take top 8 flows by value for the visual
  const top = flows.slice(0, 8)
  const maxVal = top[0]?.value ?? 1

  return (
    <div className="mb-4 p-3 rounded-lg bg-background-elevated/20 border border-border/30">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono mb-3">
        Money Flow — Institution to Vendor (top {top.length} by value)
      </p>
      <div className="space-y-1.5">
        {top.map((flow) => {
          const barWidth = Math.max(4, Math.round((flow.value / maxVal) * 100))
          const sectorColor = inferSectorColor(flow.sourceName)
          const riskColor = riskScoreToColor(flow.avgRisk)
          const valuePct = totalValue > 0 ? (flow.value / totalValue) * 100 : 0

          return (
            <div key={`${flow.sourceId}-${flow.targetId}`} className="flex items-center gap-2 group">
              {/* Left node — institution: dark text always, sector color as dot indicator */}
              <div
                className="w-[130px] shrink-0 text-right text-[10px] font-bold text-text-primary flex items-center justify-end gap-1"
                title={flow.sourceName}
              >
                <span className="truncate">{abbreviateName(flow.sourceName)}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0 inline-block"
                  style={{ backgroundColor: sectorColor }}
                />
              </div>

              {/* Flow bar */}
              <div className="flex-1 relative h-4 flex items-center">
                <div
                  className="h-3 rounded-sm transition-all opacity-70 group-hover:opacity-100"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${sectorColor}80, ${riskColor}90)`,
                  }}
                />
                {/* Value label inside bar if wide enough */}
                {barWidth > 25 && (
                  <span
                    className="absolute left-1.5 text-[9px] font-mono font-bold text-white/90 leading-none pointer-events-none"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {formatCompactMXN(flow.value)}
                  </span>
                )}
              </div>

              {/* Right node — vendor name */}
              <div
                className="w-[110px] shrink-0 text-[10px] font-semibold text-text-secondary"
                title={flow.targetName}
              >
                {abbreviateName(flow.targetName, 20)}
              </div>

              {/* Value % */}
              <div className="w-[36px] shrink-0 text-right">
                <span className="text-[9px] font-mono tabular-nums text-text-muted">
                  {valuePct.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-2 border-t border-border/20 text-[9px] text-text-muted">
        <span>Left color = Sector</span>
        <span>Right color = Risk level</span>
        <span>Bar width = Relative value</span>
      </div>
    </div>
  )
}

// =============================================================================
// Task A — Concentration alert banner
// =============================================================================

function ConcentrationAlert({ flows, totalValue }: { flows: FlowRow[]; totalValue: number }) {
  const alert = useMemo(() => {
    if (!flows.length || totalValue === 0) return null
    // Find the single largest flow
    const top = [...flows].sort((a, b) => b.value - a.value)[0]
    const pct = (top.value / totalValue) * 100
    if (pct < 30) return null
    return { flow: top, pct }
  }, [flows, totalValue])

  if (!alert) return null

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3 border"
      style={{
        background: `${RISK_COLORS.high}15`,
        borderColor: `${RISK_COLORS.high}40`,
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: RISK_COLORS.high }} />
      <p className="text-xs leading-snug">
        <span className="font-bold uppercase tracking-wide" style={{ color: RISK_COLORS.high }}>
          Concentration:{' '}
        </span>
        <span className="text-text-secondary font-semibold">{alert.flow.sourceName}</span>
        <span className="text-text-muted"> → </span>
        <span className="text-text-secondary font-semibold">{alert.flow.targetName}</span>
        <span className="text-text-muted"> represents </span>
        <span className="font-bold font-mono" style={{ color: RISK_COLORS.high }}>
          {alert.pct.toFixed(1)}%
        </span>
        <span className="text-text-muted"> of shown spend ({formatCompactMXN(alert.flow.value)})</span>
      </p>
    </div>
  )
}

// =============================================================================
// Task B — Risk Factor Breakdown (ASCII-bar frequency table)
// =============================================================================

/** Human-readable labels for the factor keys used in risk analysis */
const FACTOR_DISPLAY_LABELS: Record<string, string> = {
  direct_award:       'DIRECT AWARD',
  single_bid:         'SINGLE BIDDER',
  price_ratio:        'PRICE ANOMALY',
  vendor_concentration: 'MARKET CAPTURE',
  ad_period_days:     'SHORT AD PERIOD',
  year_end:           'YEAR-END TIMING',
  same_day_count:     'THRESHOLD SPLIT',
  network_member_count: 'NETWORK RISK',
  industry_mismatch:  'INDUSTRY MISMATCH',
  institution_risk:   'INSTITUTION RISK',
  price_hyp_confidence: 'PRICE HYPOTHESIS',
  co_bid_rate:        'CO-BIDDING',
  price_volatility:   'ERRATIC PRICING',
  win_rate:           'WIN RATE SPIKE',
  institution_diversity: 'INSTITUTION SPREAD',
  sector_spread:      'SECTOR SPREAD',
}

// =============================================================================
// Task C — Mini risk heatmap (5 squares: low → critical)
// =============================================================================

/**
 * Renders 5 × 10px colored squares showing a risk distribution profile.
 * Inputs are raw counts per level. The squares visualize proportional risk weight.
 */
function RiskMiniHeatmap({
  highRiskPct,
  avgRisk,
  title,
}: {
  highRiskPct: number
  avgRisk: number
  title?: string
}) {
  // Build 5 squares: each represents 20% of risk spectrum from low→critical.
  // We use avgRisk and highRiskPct to construct a rough distribution profile.
  const squares = useMemo(() => {
    // Heuristic color assignment for each square slot (0=lowest, 4=highest risk)
    const levels = [
      { threshold: 0.0,  color: RISK_COLORS.low },
      { threshold: 0.05, color: lerpColor(RISK_COLORS.low, RISK_COLORS.medium, 0.5) },
      { threshold: 0.10, color: RISK_COLORS.medium },
      { threshold: 0.30, color: RISK_COLORS.high },
      { threshold: 0.50, color: RISK_COLORS.critical },
    ]
    return levels.map(({ threshold, color }) => {
      // Intensity: how relevant is this risk level given avgRisk?
      const distance = Math.abs(avgRisk - threshold)
      const intensity = Math.max(0.15, 1 - distance * 4)
      return { color, intensity }
    })
  }, [avgRisk])

  const tooltipText = title
    ? `${title}\nAvg risk: ${(avgRisk * 100).toFixed(0)}% · High-risk: ${(highRiskPct * 100).toFixed(0)}%`
    : `Avg risk: ${(avgRisk * 100).toFixed(0)}% · High-risk: ${(highRiskPct * 100).toFixed(0)}%`

  return (
    <div
      className="flex gap-0.5 items-center"
      role="img"
      aria-label={tooltipText}
      title={tooltipText}
    >
      {squares.map((sq, i) => (
        <div
          key={i}
          className="rounded-[2px] shrink-0"
          style={{
            width: 10,
            height: 10,
            backgroundColor: sq.color,
            opacity: sq.intensity,
          }}
        />
      ))}
    </div>
  )
}

// =============================================================================
// Main component
// =============================================================================

type RiskFilter = 'all' | 'high' | 'critical'
type SortKey = 'value' | 'risk' | 'contracts'

export default function ProcurementIntelligence() {
  const navigate = useNavigate()
  const { t } = useTranslation('procurement')
  const { t: tRf } = useTranslation('redflags')
  const { t: ts } = useTranslation('sectors')
  const { open: openEntityDrawer } = useEntityDrawer()

  // ── Filter / sort state ──────────────────────────────────────────────────
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showMore, setShowMore] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // ── Risk factor state ────────────────────────────────────────────────────
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)

  // ── Collusion state ──────────────────────────────────────────────────────
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  // Collusion queries are expensive (self-join on 3M rows) — only run on demand
  const [loadCollusion, setLoadCollusion] = useState(false)

  // ── Data queries ─────────────────────────────────────────────────────────
  // Batch 1: fast queries, fire immediately
  const { data: flowData, isLoading: flowLoading } = useQuery({
    queryKey: ['money-flow', 'risk-intel'],
    queryFn: () => analysisApi.getMoneyFlow(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: rfData, isLoading: rfLoading } = useQuery({
    queryKey: ['risk-factors', 'risk-intel'],
    queryFn: () => analysisApi.getRiskFactorAnalysis(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: spikeData } = useQuery({
    queryKey: ['december-spike'],
    queryFn: () => analysisApi.getDecemberSpike(2010, 2024),
    staleTime: 30 * 60 * 1000,
  })

  const { data: thresholdData } = useQuery<ThresholdGamingResponse>({
    queryKey: ['threshold-gaming'],
    queryFn: () => analysisApi.getThresholdGaming(),
    staleTime: 60 * 60 * 1000,
  })

  // Batch 2: expensive queries — only fire after user requests them
  const { data: coBidData, isLoading: coBidLoading } = useQuery({
    queryKey: ['co-bidding'],
    queryFn: () => analysisApi.getCoBiddingPatterns(),
    staleTime: 30 * 60 * 1000,
    enabled: loadCollusion,
  })

  const { data: concentrationData, isLoading: concentrationLoading } = useQuery({
    queryKey: ['concentration'],
    queryFn: () => analysisApi.getConcentrationPatterns(),
    staleTime: 30 * 60 * 1000,
    enabled: loadCollusion,
  })

  // Leads: fire after money-flow data is available (serialized, not concurrent)
  const { data: leadsData } = useQuery({
    queryKey: ['investigation-leads'],
    queryFn: () => analysisApi.getInvestigationLeads(20),
    staleTime: 10 * 60 * 1000,
    enabled: !!flowData,
  })

  // Sector × year breakdown for pattern heatmap
  const { data: sectorYearResp } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown', 'procurement'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Year-over-year for alert ticker
  const { data: yoyResp } = useQuery({
    queryKey: ['analysis', 'year-over-year', 'procurement'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 30 * 60 * 1000,
  })

  // ── Derived: institution flows ────────────────────────────────────────────
  // money-flow now returns institution->vendor flows only (precomputed table)
  const allFlows = useMemo(() => {
    if (!flowData?.flows) return []
    return (flowData.flows as MoneyFlowItem[])
      .map(f => ({
        sourceId: f.source_id,
        sourceName: toTitleCase(f.source_name),
        targetId: f.target_id,
        targetName: toTitleCase(f.target_name),
        value: f.value,
        contracts: f.contracts,
        avgRisk: f.avg_risk ?? 0,
        highRiskPct: f.high_risk_pct ?? 0,
      }))
  }, [flowData])

  // ── Derived: filtered + sorted flows ─────────────────────────────────────
  const filteredFlows = useMemo(() => {
    let rows = allFlows
    if (riskFilter === 'high') rows = rows.filter(r => r.avgRisk >= 0.3)
    if (riskFilter === 'critical') rows = rows.filter(r => r.avgRisk >= 0.5)
    const sorted = [...rows].sort((a, b) => {
      const av = sortKey === 'value' ? a.value : sortKey === 'risk' ? a.avgRisk : a.contracts
      const bv = sortKey === 'value' ? b.value : sortKey === 'risk' ? b.avgRisk : b.contracts
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return showMore ? sorted : sorted.slice(0, 15)
  }, [allFlows, riskFilter, sortKey, sortDir, showMore])

  const totalFlowCount = useMemo(() => {
    let rows = allFlows
    if (riskFilter === 'high') rows = rows.filter(r => r.avgRisk >= 0.3)
    if (riskFilter === 'critical') rows = rows.filter(r => r.avgRisk >= 0.5)
    return rows.length
  }, [allFlows, riskFilter])

  // ── Derived: export data for flows table ─────────────────────────────────
  const flowsExportData = useMemo(() => {
    if (!allFlows.length) return []
    let rows = allFlows
    if (riskFilter === 'high') rows = rows.filter(r => r.avgRisk >= 0.3)
    if (riskFilter === 'critical') rows = rows.filter(r => r.avgRisk >= 0.5)
    return rows.map(f => ({
      institution: f.sourceName,
      vendor: f.targetName,
      value_mxn: f.value,
      contracts: f.contracts,
      avg_risk_score: Number(f.avgRisk.toFixed(4)),
      high_risk_pct: Number(f.highRiskPct.toFixed(4)),
    }))
  }, [allFlows, riskFilter])

  // ── Derived: summary stats ────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!allFlows.length) return null
    const highRisk = allFlows.filter(f => f.avgRisk >= 0.3)
    return {
      total: flowData?.total_value ?? 0,
      highRiskFlows: highRisk.length,
      highRiskValue: highRisk.reduce((s, f) => s + f.value, 0),
    }
  }, [allFlows, flowData])

  // ── Derived: total value for visible flows (for concentration alert) ───────
  const visibleFlowsTotal = useMemo(
    () => filteredFlows.reduce((s, f) => s + f.value, 0),
    [filteredFlows],
  )

  // ── Derived: consolidated risk factors ───────────────────────────────────
  const factors = useMemo(() => {
    if (!rfData?.factor_frequencies) return []
    return consolidateFactors(rfData.factor_frequencies, tRf)
      .sort((a, b) => b.count - a.count)
      .slice(0, 14)
  }, [rfData, tRf])

  const selectedFactorData = useMemo(() => {
    if (!selectedFactor) return null
    return factors.find(f => f.factor === selectedFactor) ?? null
  }, [selectedFactor, factors])

  // ── Derived: December Rush chart data ────────────────────────────────────
  const spikeChartData = useMemo(() => {
    if (!spikeData?.years) return []
    return spikeData.years
      .filter(y => y.spike_ratio != null)
      .map(y => ({
        year: String(y.year),
        spike_ratio: Math.round((y.spike_ratio ?? 0) * 10) / 10,
        is_significant: y.is_significant,
      }))
  }, [spikeData])

  // ── Alert ticker: high-risk contracts in the most recent year ────────────
  const alertTicker = useMemo(() => {
    const yoyData: YearOverYearChange[] = yoyResp?.data ?? []
    if (!yoyData.length) return null
    const sorted = [...yoyData].sort((a, b) => b.year - a.year)
    const latest = sorted[0]
    const prior = sorted[1]
    if (!latest) return null
    const highRiskCount = Math.round((latest.high_risk_pct / 100) * latest.contracts)
    const priorHighRiskCount = prior ? Math.round(((prior.high_risk_pct ?? 0) / 100) * (prior.contracts ?? 0)) : null
    const delta = priorHighRiskCount != null ? highRiskCount - priorHighRiskCount : null
    return { year: latest.year, count: highRiskCount, pct: latest.high_risk_pct, delta }
  }, [yoyResp])

  // ── Sector × year heatmap data (2020–2025 window) ─────────────────────────
  const heatmapYears = [2020, 2021, 2022, 2023, 2024, 2025]
  const heatmapData = useMemo(() => {
    const rows: SectorYearItem[] = sectorYearResp?.data ?? []
    if (!rows.length) return null
    return SECTORS.map(sector => ({
      sector,
      cells: heatmapYears.map(year => {
        const row = rows.find(r => r.sector_id === sector.id && r.year === year)
        return { year, pct: row?.high_risk_pct ?? null }
      }),
    }))
  }, [sectorYearResp])

  // ── Top red flags with trend arrows ──────────────────────────────────────
  const topRedFlags = useMemo(() => {
    if (!rfData?.factor_frequencies) return []
    const TOP_FACTORS = ['direct_award', 'single_bid', 'price_ratio', 'same_day_count', 'year_end']
    return TOP_FACTORS.map(factor => {
      const found = rfData.factor_frequencies.find((f: RiskFactorFrequency) => f.factor === factor)
      return {
        factor,
        label: FACTOR_DISPLAY_LABELS[factor] ?? factor.replace(/_/g, ' ').toUpperCase(),
        count: found?.count ?? 0,
        pct: found?.percentage ?? 0,
        avgRisk: found?.avg_risk_score ?? 0,
      }
    }).filter(f => f.count > 0).sort((a, b) => b.count - a.count)
  }, [rfData])

  // ── Sort handler ─────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Collusion sections: only render if data present ───────────────────────
  const hasCoBid = (coBidData?.pairs?.length ?? 0) > 0
  const hasConcentration = (concentrationData?.alerts?.length ?? 0) > 0
  const hasLeads = (leadsData?.leads?.length ?? 0) > 0

  // ==========================================================================
  return (
    <div className="space-y-5 pb-8">

      {/* ─── PAGE HEADER ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            {t('trackingLabel')}
          </span>
        </div>
        <h1 className="text-2xl font-black text-text-primary mb-1">{t('title')}</h1>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>

      {/* ─── ALERT TICKER ─────────────────────────────────────────────────── */}
      {alertTicker && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={{ background: `${RISK_COLORS.high}12`, borderColor: `${RISK_COLORS.high}40` }}
          role="status"
          aria-live="polite"
        >
          <Activity className="h-4 w-4 shrink-0" style={{ color: RISK_COLORS.high }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide font-mono" style={{ color: RISK_COLORS.high }}>
              Live Risk Alert
            </span>
            <span className="text-xs text-text-secondary ml-2">
              <span className="font-bold text-text-primary">{formatNumber(alertTicker.count)}</span> high-risk contracts in{' '}
              <button
                onClick={() => navigate(`/year-in-review/${alertTicker.year}`)}
                className="text-accent hover:underline font-semibold"
              >
                {alertTicker.year}
              </button>
              {' '}({alertTicker.pct.toFixed(1)}% of all contracts)
            </span>
            {alertTicker.delta != null && (
              <span className={cn(
                'ml-3 text-xs font-mono font-bold inline-flex items-center gap-0.5',
                alertTicker.delta > 0 ? 'text-risk-critical' : alertTicker.delta < 0 ? 'text-risk-low' : 'text-text-muted'
              )}>
                {alertTicker.delta > 0 ? <TrendingUp className="h-3 w-3" /> : alertTicker.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {alertTicker.delta > 0 ? '+' : ''}{formatNumber(alertTicker.delta)} vs prior year
              </span>
            )}
          </div>
          <span className="text-[10px] text-text-muted font-mono shrink-0">
            Updated: {new Date().toLocaleDateString('en-MX')}
          </span>
        </div>
      )}

      {/* ─── SECTION 1: MONEY FLOW EXPLORER ──────────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-text-primary">{t('highRiskFlows.title')}</h2>
            </div>
            <TableExportButton data={flowsExportData} filename="procurement-money-flows" />
          </div>
          <p className="text-xs text-text-muted mb-3">{t('highRiskFlows.subtitle')}</p>

          {/* Summary strip */}
          {summaryStats && (
            <div className="flex flex-wrap gap-4 mb-3 text-xs">
              <span className="text-text-muted">
                Total: <span className="font-bold text-text-primary">{formatCompactMXN(summaryStats.total)}</span>
              </span>
              <span className="text-text-muted">
                High-risk flows: <span className="font-bold text-risk-high">{formatNumber(summaryStats.highRiskFlows)}</span>
              </span>
              <span className="text-text-muted">
                Value at risk: <span className="font-bold text-risk-high">{formatCompactMXN(summaryStats.highRiskValue)}</span>
              </span>
            </div>
          )}

          {/* Task A — Sankey-style flow visualization */}
          {!flowLoading && filteredFlows.length > 0 && (
            <SankeyFlowViz
              flows={filteredFlows}
              totalValue={visibleFlowsTotal}
            />
          )}

          {/* Task A — Concentration alert banner */}
          {!flowLoading && filteredFlows.length > 0 && (
            <ConcentrationAlert
              flows={filteredFlows}
              totalValue={visibleFlowsTotal}
            />
          )}

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-text-muted shrink-0" />
            {(['all', 'high', 'critical'] as RiskFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setRiskFilter(f); setShowMore(false) }}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
                  riskFilter === f
                    ? f === 'critical' ? 'bg-risk-critical/20 text-risk-critical border-risk-critical/40'
                      : f === 'high' ? 'bg-risk-high/20 text-risk-high border-risk-high/40'
                      : 'bg-accent/20 text-accent border-accent/30'
                    : 'bg-background-elevated/30 text-text-muted border-border/40 hover:border-border'
                )}
              >
                {f === 'all' ? 'All Flows' : f === 'high' ? 'High Risk (≥30%)' : 'Critical (≥50%)'}
              </button>
            ))}
            <span className="text-xs text-text-muted ml-auto">
              {totalFlowCount} flows
            </span>
          </div>

          {/* Table */}
          {flowLoading ? (
            <div className="space-y-1.5">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : filteredFlows.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{t('highRiskFlows.empty')}</p>
          ) : (
            <>
              {/* Column headers — added Risk Profile column for Task C */}
              <div className="grid grid-cols-[20px_1fr_12px_1fr_90px_56px_48px_52px_32px] gap-x-2 px-2 pb-1 text-[10px] text-text-muted uppercase tracking-wide border-b border-border/30 mb-1">
                <span>#</span>
                <span>{t('highRiskFlows.institution')}</span>
                <span />
                <span>{t('highRiskFlows.vendor')}</span>
                <button onClick={() => handleSort('value')} className="text-left hover:text-text-primary transition-colors">
                  {t('highRiskFlows.value')}<SortIcon active={sortKey === 'value'} dir={sortDir} />
                </button>
                <button onClick={() => handleSort('risk')} className="text-left hover:text-text-primary transition-colors">
                  {t('highRiskFlows.risk')}<SortIcon active={sortKey === 'risk'} dir={sortDir} />
                </button>
                <button onClick={() => handleSort('contracts')} className="text-left hover:text-text-primary transition-colors">
                  {t('highRiskFlows.contracts')}<SortIcon active={sortKey === 'contracts'} dir={sortDir} />
                </button>
                {/* Task C — mini heatmap column header */}
                <span title="Risk profile: 5 squares from low (green) to critical (red)">Profile</span>
                <span />
              </div>

              <div className="space-y-0.5">
                {filteredFlows.map((flow, i) => {
                  const flowKey = `${flow.sourceId}-${flow.targetId}`
                  const isExpanded = expandedRow === flowKey
                  return (
                    <div key={flowKey}>
                      <div
                        className={cn(
                          'grid grid-cols-[20px_1fr_12px_1fr_90px_56px_48px_52px_32px] gap-x-2 items-center px-2 py-1.5 rounded text-xs transition-colors',
                          isExpanded
                            ? 'bg-background-elevated/60 ring-1 ring-accent/20'
                            : 'hover:bg-background-elevated/30',
                          flow.avgRisk >= 0.5 && 'border-l-2 border-risk-critical',
                          flow.avgRisk >= 0.3 && flow.avgRisk < 0.5 && 'border-l-2 border-risk-high',
                        )}
                      >
                        <span className="text-text-muted font-mono text-[10px]">{i + 1}</span>

                        {/* Institution — colored dot with sector color */}
                        <button
                          onClick={() => openEntityDrawer(flow.sourceId, 'institution')}
                          className="text-left truncate text-text-secondary hover:text-accent transition-colors font-medium flex items-center gap-1 min-w-0"
                          title={flow.sourceName}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: inferSectorColor(flow.sourceName) }}
                          />
                          <span className="truncate">{flow.sourceName}</span>
                        </button>

                        <ArrowRight className="h-3 w-3 text-text-muted shrink-0" />

                        {/* Vendor */}
                        <button
                          onClick={() => openEntityDrawer(flow.targetId, 'vendor')}
                          className="text-left truncate text-text-secondary hover:text-accent transition-colors font-medium"
                          title={flow.targetName}
                        >
                          {flow.targetName}
                        </button>

                        {/* Value */}
                        <span className="text-text-secondary tabular-nums font-mono text-right">
                          {formatCompactMXN(flow.value)}
                        </span>

                        {/* Risk */}
                        <span
                          className={cn('tabular-nums font-mono text-right', riskBadgeClass(flow.avgRisk))}
                        >
                          {(flow.avgRisk * 100).toFixed(0)}%
                        </span>

                        {/* Contracts */}
                        <span className="text-text-muted tabular-nums text-right">
                          {formatNumber(flow.contracts)}
                        </span>

                        {/* Task C — Mini risk heatmap */}
                        <div className="flex justify-center">
                          <RiskMiniHeatmap
                            highRiskPct={flow.highRiskPct}
                            avgRisk={flow.avgRisk}
                            title={`${flow.sourceName} → ${flow.targetName}`}
                          />
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : flowKey)}
                          className="flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <div className="px-3 py-2 mb-0.5 rounded-b bg-background-elevated/40 border border-t-0 border-accent/20 flex flex-wrap gap-3 text-xs">
                          <div className="flex gap-4 flex-wrap flex-1">
                            <span className="text-text-muted">
                              High-risk contracts:{' '}
                              <span className="font-bold text-risk-high">
                                {(flow.highRiskPct * 100).toFixed(0)}%
                              </span>
                            </span>
                            <span className="text-text-muted">
                              Total value:{' '}
                              <span className="font-bold text-text-primary">{formatCompactMXN(flow.value)}</span>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEntityDrawer(flow.sourceId, 'institution')}
                              className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                            >
                              Institution profile <ExternalLink className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => openEntityDrawer(flow.targetId, 'vendor')}
                              className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                            >
                              Vendor profile <ExternalLink className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => navigate(`/contracts?institution_id=${flow.sourceId}&vendor_id=${flow.targetId}`)}
                              className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                            >
                              {t('highRiskFlows.investigate')} <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!showMore && totalFlowCount > 15 && (
                <button
                  onClick={() => setShowMore(true)}
                  className="mt-3 w-full text-xs text-accent hover:text-accent/80 py-1.5 border border-dashed border-accent/30 rounded transition-colors"
                >
                  Show all {totalFlowCount} flows ↓
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── SECTION 2: RISK FACTOR INTELLIGENCE ─────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-base font-bold text-text-primary">{t('riskFactors.title')}</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">{t('riskFactors.subtitle')}</p>

          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            {/* Factor frequency bar chart */}
            <div>
              <p className="text-xs text-text-muted mb-2">
                Click a factor to explore the contracts it flags.
              </p>
              {rfLoading ? <Skeleton className="h-60" /> : factors.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">No factor data</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(factors.length * 28, 200)}>
                  <BarChart
                    data={factors}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 0, bottom: 0 }}
                    onClick={(payload: any) => {
                      const factor = payload?.activePayload?.[0]?.payload?.factor
                      if (factor) setSelectedFactor(prev => prev === factor ? null : factor)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => formatNumber(v)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} width={90} />
                    <RechartsTooltip
                      contentStyle={{ background: '#1a1f2e', border: '1px solid #2a2f3e', borderRadius: 6, fontSize: 11 }}
                      formatter={(v: any, _: any, p: any) => [
                        `${formatNumber(v)} contracts · avg risk ${((p.payload?.avg_risk_score ?? 0) * 100).toFixed(0)}%`,
                        'Frequency',
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {factors.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={riskScoreToCategoricalColor(entry.avg_risk_score)}
                          opacity={selectedFactor && selectedFactor !== entry.factor ? 0.35 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Selected factor context panel */}
            <div className="flex flex-col gap-3">
              {selectedFactorData ? (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 h-fit">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-accent uppercase tracking-wide">Selected Factor</span>
                    <button onClick={() => setSelectedFactor(null)} className="text-text-muted hover:text-text-primary" aria-label="Clear selection"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-3">{selectedFactorData.label}</p>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Contracts flagged</span>
                      <span className="font-bold text-text-primary tabular-nums">{formatNumber(selectedFactorData.count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">% of all contracts</span>
                      <span className="font-bold text-text-primary tabular-nums">{selectedFactorData.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Avg risk score</span>
                      <span
                        className="font-bold tabular-nums font-mono"
                        style={{ color: riskScoreToCategoricalColor(selectedFactorData.avg_risk_score) }}
                      >
                        {(selectedFactorData.avg_risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/contracts?risk_factor=${selectedFactorData.factor}`)}
                    className="w-full text-xs bg-accent/20 hover:bg-accent/30 text-accent py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    View {formatNumber(selectedFactorData.count)} contracts
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-border/30 bg-background-elevated/20 p-3 h-fit">
                  <p className="text-xs text-text-muted leading-relaxed">
                    <span className="font-semibold text-text-secondary">Click any bar</span> to explore the contracts that trigger that risk factor — see count, average risk score, and navigate directly to those contracts.
                  </p>
                </div>
              )}

              {/* Quick factor comparison */}
              {factors.length > 0 && (
                <div className="text-xs">
                  <p className="text-text-muted mb-1.5 font-semibold">Top by avg risk score:</p>
                  <div className="space-y-1">
                    {[...factors].sort((a, b) => b.avg_risk_score - a.avg_risk_score).slice(0, 5).map((f) => (
                      <button
                        key={f.factor}
                        onClick={() => setSelectedFactor(prev => prev === f.factor ? null : f.factor)}
                        className={cn(
                          'w-full flex items-center gap-2 py-1 px-1.5 rounded transition-colors text-left',
                          selectedFactor === f.factor ? 'bg-accent/10' : 'hover:bg-background-elevated/30'
                        )}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: riskScoreToCategoricalColor(f.avg_risk_score) }} />
                        <span className="flex-1 truncate text-text-secondary">{f.label}</span>
                        <span className="font-mono tabular-nums shrink-0" style={{ color: riskScoreToCategoricalColor(f.avg_risk_score) }}>
                          {(f.avg_risk_score * 100).toFixed(0)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Heatmap toggle */}
          {rfData?.top_cooccurrences && rfData.top_cooccurrences.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <button
                onClick={() => setShowHeatmap(v => !v)}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                {showHeatmap
                  ? <><ChevronUp className="h-3.5 w-3.5" />{t('riskFactors.hideHeatmap')}</>
                  : <><ChevronDown className="h-3.5 w-3.5" />{t('riskFactors.showHeatmap')}</>
                }
              </button>
              {showHeatmap && (
                <div className="mt-3">
                  <p className="text-xs text-text-muted mb-2">
                    {t('riskFactors.heatmapSubtitle')}{' '}
                    <span className="text-accent">Click a cell to view contracts with both factors.</span>
                  </p>
                  <CooccurrenceHeatmap
                    cooccurrences={rfData.top_cooccurrences}
                    factors={rfData.factor_frequencies?.map((f: RiskFactorFrequency) => f.factor) ?? []}
                    t={tRf}
                    onCellClick={(fa, fb) =>
                      navigate(`/contracts?risk_factor=${fa}&risk_factor_2=${fb}`)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── SECTION 2b: TOP RED FLAGS RANKING ──────────────────────────────── */}
      {topRedFlags.length > 0 && (
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-risk-high" />
              <h2 className="text-base font-bold text-text-primary">Top Red Flags — All-Time Frequency</h2>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Most common procurement red flags by contract count, ranked by frequency. Each contract may trigger multiple flags.
            </p>
            <div className="space-y-2">
              {topRedFlags.map((flag, i) => {
                const maxCount = topRedFlags[0]?.count ?? 1
                const barPct = Math.max(2, Math.round((flag.count / maxCount) * 100))
                const color = riskScoreToCategoricalColor(flag.avgRisk)
                return (
                  <div key={flag.factor} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-text-muted w-4 shrink-0 text-right">{i + 1}</span>
                    <div className="w-[140px] shrink-0 text-right">
                      <span className="text-[10px] font-mono font-bold text-text-secondary tracking-wide">
                        {flag.label}
                      </span>
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-2.5 rounded-sm w-full bg-border/10 overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all"
                          style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.85 }}
                        />
                      </div>
                    </div>
                    <div className="w-[90px] shrink-0 flex items-center justify-end gap-1.5">
                      <span className="text-[10px] font-mono tabular-nums text-text-muted">
                        {formatNumber(flag.count)}
                      </span>
                      <button
                        onClick={() => navigate(`/contracts?risk_factor=${flag.factor}`)}
                        className="text-text-muted hover:text-accent transition-colors shrink-0"
                        title={`View contracts with ${flag.label}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 2c: SECTOR × YEAR RISK HEATMAP ────────────────────────── */}
      {heatmapData && (
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-text-primary">Sector Risk Heatmap (2020–2025)</h2>
            </div>
            <p className="text-xs text-text-muted mb-4">
              High-risk rate (%) per sector per year. Darker red = higher concentration of high-risk contracts.
              Click a cell to explore those contracts.
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full" role="grid" aria-label="Sector risk heatmap 2020–2025">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide min-w-[100px]">Sector</th>
                    {heatmapYears.map(y => (
                      <th key={y} className="text-center py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide min-w-[52px]">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map(row => (
                    <tr key={row.sector.id} className="hover:bg-background-elevated/20 transition-colors">
                      <td className="py-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.sector.color }} />
                          <span className="text-[10px] text-text-secondary font-medium truncate max-w-[90px]">
                            {ts(row.sector.code)}
                          </span>
                        </div>
                      </td>
                      {row.cells.map(cell => {
                        const pct = cell.pct
                        if (pct == null) return (
                          <td key={cell.year} className="py-1 px-2 text-center">
                            <div className="w-10 h-7 rounded flex items-center justify-center mx-auto bg-border/10">
                              <span className="text-[9px] text-text-muted">—</span>
                            </div>
                          </td>
                        )
                        // Color intensity: 0%=transparent, 50%+=full red
                        const intensity = Math.min(1, pct / 25)
                        const bg = `rgba(248,113,113,${intensity * 0.75 + 0.05})`
                        const textColor = intensity > 0.5 ? '#fff' : '#94a3b8'
                        return (
                          <td key={cell.year} className="py-1 px-2 text-center">
                            <button
                              onClick={() => navigate(`/contracts?sector_id=${row.sector.id}&year=${cell.year}&risk_level=high`)}
                              className="w-10 h-7 rounded text-[10px] font-bold tabular-nums transition-opacity hover:opacity-80 flex items-center justify-center mx-auto"
                              style={{ backgroundColor: bg, color: textColor }}
                              title={`${ts(row.sector.code)} ${cell.year}: ${pct.toFixed(1)}% high-risk — click to explore`}
                              aria-label={`${ts(row.sector.code)} ${cell.year}: ${pct.toFixed(1)}% high-risk contracts`}
                            >
                              {pct.toFixed(1)}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-text-muted mt-2">
              Values = % of contracts classified as high or critical risk for that sector and year. Click any cell to view those contracts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 3: DECEMBER RUSH ─────────────────────────────────────── */}
      {spikeChartData.length > 0 && (
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-risk-medium" />
                <h2 className="text-base font-bold text-text-primary">{t('decemberRush.title')}</h2>
              </div>
              {spikeData && (
                <span className="text-xs text-text-muted font-mono">
                  avg <span className="font-bold text-text-primary">{spikeData.average_spike_ratio.toFixed(1)}x</span>{' '}
                  · {spikeData.years_with_significant_spike}/{spikeData.total_years_analyzed} years significant
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mb-1">{t('decemberRush.subtitle')}</p>
            <p className="text-xs text-accent mb-4">Click any bar to view contracts from that December.</p>

            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={spikeChartData}
                margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
                onClick={(payload: any) => {
                  const year = payload?.activePayload?.[0]?.payload?.year
                  if (year) navigate(`/contracts?year=${year}&month=12`)
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Spike Ratio (x avg month)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#64748b' }, offset: 10 }}
                />
                <RechartsTooltip
                  contentStyle={{ background: '#1a1f2e', border: '1px solid #2a2f3e', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: any, name: any) => [
                    `${v}×`, name === 'spike_ratio' ? 'December vs. avg month' : name,
                  ]}
                  labelFormatter={(label) => `${label} — click to view contracts`}
                />
                <Bar dataKey="spike_ratio" name="spike_ratio" radius={[3, 3, 0, 0]}>
                  {spikeChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.is_significant ? RISK_COLORS.high : '#374151'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>

            <div className="flex gap-3 mt-2 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: RISK_COLORS.high }} />
                Significant spike
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block bg-zinc-700" />
                Normal year
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 3.5: THRESHOLD GAMING ──────────────────────────────── */}
      {thresholdData && (
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-risk-high" />
                <h2 className="text-base font-bold text-text-primary">Threshold Gaming</h2>
              </div>
              <span className="text-xs text-text-muted font-mono">
                {formatNumber(thresholdData.total_flagged)} contracts ·{' '}
                <span className="font-bold text-risk-high">
                  {thresholdData.pct_of_competitive_procedures.toFixed(1)}%
                </span>{' '}
                of competitive procedures
              </span>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Contracts clustered just below procurement thresholds — a known indicator of artificial splitting
              to avoid competitive bidding requirements (Szucs 2023, Coviello et al. 2018).
            </p>

            {thresholdData.by_sector.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={thresholdData.by_sector.slice(0, 10).map((s) => ({
                    name: s.sector_name.charAt(0).toUpperCase() + s.sector_name.slice(1),
                    flagged: s.flagged_contracts,
                    value_b: s.total_value_mxn / 1e9,
                  }))}
                  margin={{ top: 4, right: 16, bottom: 24, left: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    width={88}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v: unknown, name?: string) => [
                      name === 'flagged'
                        ? formatNumber(v as number)
                        : `${(v as number).toFixed(1)}B MXN`,
                      name === 'flagged' ? 'Flagged Contracts' : 'Total Value',
                    ]}
                  />
                  <Bar dataKey="flagged" name="flagged" fill={RISK_COLORS.high} radius={[0, 3, 3, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 4: COLLUSION SIGNALS ────────────────────────────────── */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Network className="h-4 w-4 text-risk-critical" />
            <h2 className="text-base font-bold text-text-primary">{t('collusion.title')}</h2>
          </div>
          <p className="text-xs text-text-muted mb-4">{t('collusion.subtitle')}</p>

          {!loadCollusion ? (
            <div className="rounded-lg border border-border/40 bg-background-elevated/10 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-risk-critical/10 border border-risk-critical/20 flex items-center justify-center">
                  <Network className="h-6 w-6 text-risk-critical" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary mb-1">
                    Detect Co-Bidding &amp; Collusion Patterns
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Scans 3M+ contract records to find vendor pairs that bid together suspiciously often,
                    and market concentration alerts where a single vendor dominates an institution.
                    This query is expensive — run it on demand.
                  </p>
                </div>
                <button
                  onClick={() => setLoadCollusion(true)}
                  className="shrink-0 px-5 py-2.5 text-sm font-bold bg-risk-critical/15 text-risk-critical border border-risk-critical/30 rounded-lg hover:bg-risk-critical/25 transition-colors flex items-center gap-2"
                >
                  <Network className="h-4 w-4" />
                  Run Collusion Analysis
                </button>
              </div>
            </div>
          ) : coBidLoading || concentrationLoading ? (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-4 border-2 border-risk-critical border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs text-text-muted">Scanning 3M+ contract records for collusion patterns…</span>
              </div>
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : !hasCoBid && !hasConcentration ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Network className="h-8 w-8 text-text-muted/30" />
              <p className="text-sm font-semibold text-text-secondary">No significant collusion patterns detected</p>
              <p className="text-xs text-text-muted max-w-sm">
                No vendor pairs met the co-bidding threshold and no concentration alerts were triggered
                with the current dataset and filters.
              </p>
            </div>
          ) : (

            <div className="grid gap-4 md:grid-cols-2">
              {/* Co-Bidding Pairs */}
              {hasCoBid && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-0.5">{t('collusion.coBiddingTitle')}</p>
                  <p className="text-xs text-text-muted mb-2">{t('collusion.coBiddingSubtitle')}</p>
                  <div className="space-y-1">
                    {coBidData!.pairs.slice(0, 7).map((pair, i) => (
                      <div
                        key={`${pair.vendor_1_id}-${pair.vendor_2_id}`}
                        className={cn(
                          'flex items-center justify-between gap-2 py-1.5 px-2 rounded text-xs transition-colors',
                          pair.is_potential_collusion
                            ? 'bg-risk-critical/10 border border-risk-critical/20'
                            : 'hover:bg-background-elevated/30'
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-text-muted font-mono w-4 shrink-0">{i + 1}</span>
                          <button
                            onClick={() => openEntityDrawer(pair.vendor_1_id, 'vendor')}
                            className="truncate text-text-secondary hover:text-accent transition-colors font-medium max-w-[90px]"
                            title={toTitleCase(pair.vendor_1_name)}
                          >
                            {toTitleCase(pair.vendor_1_name)}
                          </button>
                          <span className="text-text-muted shrink-0 text-[10px]">+</span>
                          <button
                            onClick={() => openEntityDrawer(pair.vendor_2_id, 'vendor')}
                            className="truncate text-text-secondary hover:text-accent transition-colors font-medium max-w-[90px]"
                            title={toTitleCase(pair.vendor_2_name)}
                          >
                            {toTitleCase(pair.vendor_2_name)}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-text-muted tabular-nums">{pair.co_bid_count}</span>
                          <span className={cn('font-bold font-mono tabular-nums', pair.co_bid_rate >= 70 ? 'text-risk-critical' : 'text-risk-high')}>
                            {pair.co_bid_rate.toFixed(0)}%
                          </span>
                          {pair.is_potential_collusion && (
                            <AlertTriangle className="h-3 w-3 text-risk-critical shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                    {coBidData!.potential_collusion_pairs > 0 && (
                      <p className="text-xs text-risk-critical font-mono mt-1 text-right">
                        {coBidData!.potential_collusion_pairs} potential collusion pairs
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Concentration Alerts */}
              {hasConcentration && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-0.5">{t('collusion.concentrationTitle')}</p>
                  <p className="text-xs text-text-muted mb-2">{t('collusion.concentrationSubtitle')}</p>
                  <div className="space-y-1">
                    {concentrationData!.alerts.slice(0, 7).map((alert, i) => (
                      <div
                        key={alert.vendor_id}
                        className="flex items-center justify-between gap-2 py-1.5 px-2 rounded text-xs hover:bg-background-elevated/30 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-text-muted font-mono w-4 shrink-0">{i + 1}</span>
                          <div className="min-w-0">
                            <button
                              onClick={() => openEntityDrawer(alert.vendor_id, 'vendor')}
                              className="truncate text-text-secondary hover:text-accent transition-colors font-medium block max-w-[130px]"
                              title={toTitleCase(alert.vendor_name)}
                            >
                              {toTitleCase(alert.vendor_name)}
                            </button>
                            <button
                              onClick={() => openEntityDrawer(alert.institution_id, 'institution')}
                              className="truncate text-text-muted hover:text-accent transition-colors text-[10px] block max-w-[130px]"
                              title={alert.institution_name}
                            >
                              @ {alert.institution_name}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold font-mono text-risk-high tabular-nums">
                            {alert.value_share_pct.toFixed(0)}%
                          </span>
                          {alert.avg_risk_score != null && (
                            <span
                              className="text-xs font-mono tabular-nums"
                              style={{ color: riskScoreToCategoricalColor(alert.avg_risk_score) }}
                            >
                              {(alert.avg_risk_score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>

      {/* ─── SECTION 5: INVESTIGATION LEADS (conditional) ────────────────── */}
      {hasLeads && (
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-risk-high" />
                <h2 className="text-base font-bold text-text-primary">{t('leads.title')}</h2>
              </div>
              <span className="text-xs text-text-muted font-mono">
                {leadsData!.high_priority} high priority
              </span>
            </div>
            <p className="text-xs text-text-muted mb-4">{t('leads.subtitle')}</p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leadsData!.leads.map((lead, i) => {
                const leadKey = `${lead.vendor_id ?? i}-${lead.lead_type}`
                const isExpanded = expandedLead === leadKey
                return (
                  <div key={leadKey} className="rounded-lg border border-border/40 bg-background-elevated/20 p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-text-primary capitalize">
                        {lead.lead_type.replace(/_/g, ' ')}
                      </span>
                      <span className={cn(
                        'text-xs font-mono px-1.5 py-0.5 rounded shrink-0 capitalize',
                        lead.priority === 'high' || lead.priority === 'critical'
                          ? 'bg-risk-high/20 text-risk-high border border-risk-high/30'
                          : 'bg-zinc-700/30 text-text-muted'
                      )}>
                        {lead.priority}
                      </span>
                    </div>

                    {lead.vendor_name && (
                      <button
                        onClick={() => lead.vendor_id && openEntityDrawer(lead.vendor_id, 'vendor')}
                        className="text-xs text-text-secondary hover:text-accent transition-colors text-left leading-snug"
                      >
                        <span className="text-text-muted">Vendor: </span>
                        {toTitleCase(lead.vendor_name)}
                      </button>
                    )}
                    {lead.institution_name && (
                      <button
                        onClick={() => lead.institution_id && openEntityDrawer(lead.institution_id, 'institution')}
                        className="text-xs text-text-secondary hover:text-accent transition-colors text-left leading-snug"
                      >
                        <span className="text-text-muted">Institution: </span>
                        {lead.institution_name}
                      </button>
                    )}

                    <div className="flex gap-3 text-xs text-text-muted">
                      {lead.amount_mxn != null && (
                        <span><span className="font-bold text-text-primary">{formatCompactMXN(lead.amount_mxn)}</span></span>
                      )}
                      {lead.risk_score != null && (
                        <span className="font-bold font-mono" style={{ color: riskScoreToCategoricalColor(lead.risk_score) }}>
                          {(lead.risk_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {lead.risk_indicators?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.risk_indicators.slice(0, 3).map((ind, j) => (
                          <span key={j} className="text-[10px] bg-border/20 text-text-muted px-1.5 py-0.5 rounded">
                            {ind.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {lead.verification_steps?.length > 0 && (
                      <div>
                        <button
                          onClick={() => setExpandedLead(isExpanded ? null : leadKey)}
                          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {t('leads.steps')} ({lead.verification_steps.length})
                        </button>
                        {isExpanded && (
                          <ol className="mt-1.5 space-y-1 pl-3 border-l border-accent/30">
                            {lead.verification_steps.map((step, j) => (
                              <li key={j} className="text-xs text-text-muted leading-relaxed">
                                <span className="text-accent font-mono">{j + 1}.</span> {step}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}

                    {lead.contract_id && (
                      <button
                        onClick={() => navigate(`/contracts?id=${lead.contract_id}`)}
                        className="text-xs text-accent hover:text-accent/80 text-left mt-auto transition-colors"
                      >
                        {t('leads.viewContracts')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================== */}
      {/* Risk Pyramid                                                  */}
      {/* =========================================================== */}
      <div className="border-t border-border/40 pt-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text-primary">{t('risk_pyramid.title')}</h2>
          <p className="text-xs text-text-muted mt-0.5">{t('risk_pyramid.subtitle')}</p>
        </div>
        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-5">
            <RiskPyramid />
          </CardContent>
        </Card>
      </div>

      {/* =========================================================== */}
      {/* Direct Award Paradox Scatter                                  */}
      {/* =========================================================== */}
      <div className="border-t border-border/40 pt-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text-primary">{t('sector_paradox.title')}</h2>
          <p className="text-xs text-text-muted mt-0.5">{t('sector_paradox.subtitle')}</p>
        </div>
        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-5">
            <SectorParadoxScatter />
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
