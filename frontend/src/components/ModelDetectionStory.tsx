import { memo, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'

// ============================================================================
// HARDCODED DETECTION DATA — real cases from RISK_METHODOLOGY_v5.md
// Updated to reflect v6.0 detection performance
// ============================================================================

interface DetectionCase {
  name: string
  shortName: string
  sector: string
  sectorKey: string
  contracts: number
  detectionRate: number
  avgScore: number
  type: string
}

const DETECTION_DATA: DetectionCase[] = [
  { name: 'IMSS Ghost Company Network',    shortName: 'IMSS Ghost Co.',       sector: 'Health',          sectorKey: 'salud',           contracts: 9366, detectionRate: 99.9, avgScore: 0.977, type: 'ghost_companies'   },
  { name: 'Segalmex Food Distribution',    shortName: 'Segalmex',             sector: 'Agriculture',     sectorKey: 'agricultura',     contracts: 6326, detectionRate: 99.6, avgScore: 0.664, type: 'procurement_fraud' },
  { name: 'COVID-19 Emergency Procurement',shortName: 'COVID-19 Procurement', sector: 'Health',          sectorKey: 'salud',           contracts: 5371, detectionRate: 99.9, avgScore: 0.821, type: 'embezzlement'      },
  { name: 'Edenred Voucher Monopoly',      shortName: 'Edenred Voucher',      sector: 'Energy',          sectorKey: 'energia',         contracts: 2939, detectionRate: 100,  avgScore: 0.884, type: 'monopoly'          },
  { name: 'Toka IT Monopoly',              shortName: 'Toka IT',              sector: 'Education',       sectorKey: 'educacion',       contracts: 1954, detectionRate: 100,  avgScore: 0.964, type: 'monopoly'          },
  { name: 'SEGOB-Mainbit IT Monopoly',     shortName: 'Mainbit IT',           sector: 'Governance',      sectorKey: 'gobernacion',     contracts: 604,  detectionRate: 96,   avgScore: 0.82,  type: 'monopoly'          },
  { name: 'ISSSTE Ambulance Fraud',        shortName: 'ISSSTE Ambulance',     sector: 'Labor',           sectorKey: 'trabajo',         contracts: 603,  detectionRate: 95,   avgScore: 0.74,  type: 'overpricing'       },
  { name: 'Infrastructure Fraud Network',  shortName: 'Infra. Network',       sector: 'Infrastructure',  sectorKey: 'infraestructura', contracts: 191,  detectionRate: 100,  avgScore: 0.962, type: 'overpricing'       },
  { name: 'SixSigma Tender Rigging',       shortName: 'SixSigma SAT',         sector: 'Treasury',        sectorKey: 'hacienda',        contracts: 147,  detectionRate: 95.2, avgScore: 0.756, type: 'bid_rigging'       },
  { name: 'Cyber Robotic IT',              shortName: 'Cyber Robotic',        sector: 'Technology',      sectorKey: 'tecnologia',      contracts: 139,  detectionRate: 100,  avgScore: 0.249, type: 'overpricing'       },
  { name: 'SAT EFOS Ghost Network',        shortName: 'SAT EFOS',             sector: 'Multiple',        sectorKey: 'otros',           contracts: 122,  detectionRate: 41.8, avgScore: 0.283, type: 'ghost_companies'   },
  { name: 'PEMEX-Cotemar Irregularities',  shortName: 'PEMEX-Cotemar',        sector: 'Energy',          sectorKey: 'energia',         contracts: 51,   detectionRate: 100,  avgScore: 1.0,   type: 'procurement_fraud' },
  { name: 'IPN Cartel de la Limpieza',     shortName: 'IPN Cartel',           sector: 'Education',       sectorKey: 'educacion',       contracts: 48,   detectionRate: 95.8, avgScore: 0.551, type: 'bid_rigging'       },
  { name: 'Odebrecht-PEMEX Bribery',       shortName: 'Odebrecht',            sector: 'Energy',          sectorKey: 'energia',         contracts: 35,   detectionRate: 97.1, avgScore: 0.915, type: 'bribery'           },
]

const TYPE_LABELS: Record<string, string> = {
  ghost_companies:   'Ghost companies',
  procurement_fraud: 'Procurement fraud',
  embezzlement:      'Embezzlement',
  monopoly:          'Monopoly',
  overpricing:       'Overpricing',
  bid_rigging:       'Bid rigging',
  bribery:           'Bribery',
}

const TYPE_COLORS: Record<string, string> = {
  ghost_companies:   '#f43f5e',
  procurement_fraud: '#f97316',
  embezzlement:      '#a855f7',
  monopoly:          '#06b6d4',
  overpricing:       '#eab308',
  bid_rigging:       '#ec4899',
  bribery:           '#84cc16',
}

type SortKey = 'detectionRate' | 'contracts' | 'avgScore'

// ============================================================================
// BAR FILL — green gradient above 90%, amber 50-90%, red below 50%
// ============================================================================
function barColor(rate: number): string {
  if (rate >= 90) return '#4ade80'
  if (rate >= 50) return '#fbbf24'
  return '#f87171'
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================
interface TooltipPayloadItem {
  payload: DetectionCase
}

function ChartTooltip({
  active,
  payload,
  navigate,
}: {
  active?: boolean
  payload?: ReadonlyArray<TooltipPayloadItem>
  navigate: (path: string) => void
}) {
  if (!active || !payload?.length) return null
  const c = payload[0].payload
  const sectorColor = SECTOR_COLORS[c.sectorKey] || '#64748b'
  const typeColor = TYPE_COLORS[c.type] || '#64748b'

  return (
    <div className="bg-background-elevated border border-border rounded-lg shadow-xl p-3 min-w-[220px] max-w-[280px]">
      {/* Case name */}
      <div className="flex items-start gap-2 mb-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: sectorColor }} />
        <p className="text-xs font-semibold text-text-primary leading-tight">{c.name}</p>
      </div>

      {/* Type badge */}
      <span
        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-2"
        style={{ backgroundColor: typeColor + '22', color: typeColor }}
      >
        {TYPE_LABELS[c.type] ?? c.type}
      </span>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
        <span className="text-text-muted">Detection</span>
        <span className="text-right font-bold" style={{ color: barColor(c.detectionRate) }}>
          {c.detectionRate.toFixed(c.detectionRate === 100 ? 0 : 1)}%
        </span>
        <span className="text-text-muted">Avg score</span>
        <span className="text-right font-bold text-text-primary">{c.avgScore.toFixed(2)}</span>
        <span className="text-text-muted">Contracts</span>
        <span className="text-right text-text-secondary">{formatNumber(c.contracts)}</span>
        <span className="text-text-muted">Sector</span>
        <span className="text-right" style={{ color: sectorColor }}>{c.sector}</span>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/contracts?search=${encodeURIComponent(c.name)}`)}
        className="mt-2 w-full text-[10px] text-accent hover:underline underline-offset-2 text-center font-mono"
      >
        View contracts →
      </button>
    </div>
  )
}

// ============================================================================
// CUSTOM Y-AXIS TICK — sector color dot + short name
// ============================================================================
function YAxisTick({
  x, y, payload,
}: {
  x?: number
  y?: number
  payload?: { value: string; index: number }
}) {
  if (x === undefined || y === undefined || !payload) return null
  const c = DETECTION_DATA.find((d) => d.shortName === payload.value)
  const sectorColor = c ? (SECTOR_COLORS[c.sectorKey] || '#64748b') : '#64748b'
  const typeColor = c ? (TYPE_COLORS[c.type] || '#64748b') : '#64748b'

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Sector dot */}
      <circle cx={-6} cy={0} r={3.5} fill={sectorColor} opacity={0.85} />
      {/* Type color stripe */}
      <rect x={-14} y={-5} width={3} height={10} rx={1.5} fill={typeColor} opacity={0.7} />
      {/* Label */}
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={10.5}
        fontFamily="var(--font-mono, monospace)"
        fill="var(--color-text-secondary, #94a3b8)"
      >
        {payload.value}
      </text>
    </g>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ModelDetectionStoryProps {
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export const ModelDetectionStory = memo(function ModelDetectionStory({
  collapsible = false,
  defaultCollapsed = false,
}: ModelDetectionStoryProps) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('detectionRate')
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const sortedCases = useMemo(() => {
    return [...DETECTION_DATA].sort((a, b) => a[sortKey] - b[sortKey])
  }, [sortKey])

  const totalContracts = useMemo(() => DETECTION_DATA.reduce((s, c) => s + c.contracts, 0), [])
  const avgDetection = useMemo(() => {
    const w = DETECTION_DATA.reduce((s, c) => s + c.detectionRate * c.contracts, 0)
    return totalContracts > 0 ? w / totalContracts : 0
  }, [totalContracts])

  const chartData = useMemo(() =>
    sortedCases.map((c) => ({ ...c, displayRate: c.detectionRate })),
    [sortedCases]
  )

  const renderTooltip = useCallback(
    (props: { active?: boolean; payload?: ReadonlyArray<TooltipPayloadItem> }) => (
      <ChartTooltip {...props} navigate={navigate} />
    ),
    [navigate]
  )

  const body = (
    <div className="space-y-3">
      {/* ── Stats strip ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 rounded-lg bg-background-elevated/30 border border-border/30 text-[11px] font-mono uppercase tracking-wide text-text-muted">
        <span>
          <span className="font-black text-text-primary text-sm not-uppercase normal-case tracking-normal font-sans mr-1">
            {DETECTION_DATA.length}
          </span>
          cases
        </span>
        <span className="text-border/50">·</span>
        <span>
          <span className="font-black text-text-primary text-sm not-uppercase normal-case tracking-normal font-sans mr-1">
            {formatNumber(totalContracts)}
          </span>
          contracts
        </span>
        <span className="text-border/50">·</span>
        <span>
          avg detection{' '}
          <span className="font-black text-[#4ade80] text-sm not-uppercase normal-case tracking-normal font-sans">
            {avgDetection.toFixed(1)}%
          </span>
        </span>
        <span className="text-border/50">·</span>
        <span>
          AUC{' '}
          <span className="font-black text-accent text-sm not-uppercase normal-case tracking-normal font-sans">
            0.849
          </span>
        </span>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button type="button" className="inline-flex items-center text-text-muted hover:text-text-secondary transition-colors focus:outline-none rounded-sm" aria-label="What is detection rate?">
              <HelpCircle size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3">
            <p className="font-semibold text-xs mb-1">Detection Rate (high+)</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              % of contracts from each documented corruption case flagged as <strong>high or critical</strong> risk by the v6.0 model. Bars sorted ascending — best detection at top.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* ── Sort tabs ── */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-text-muted uppercase tracking-wider mr-1">Sort:</span>
        {([
          ['detectionRate', 'Detection %'],
          ['contracts', 'Contracts'],
          ['avgScore', 'Avg Score'],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors',
              sortKey === key
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-background-elevated/40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Bar chart ── */}
      <ResponsiveContainer width="100%" height={sortedCases.length * 28 + 24}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 56, left: 110, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

          <XAxis
            type="number"
            domain={[0, 100]}
            tickCount={6}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 9, fill: 'var(--color-text-muted, #64748b)', fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="shortName"
            width={108}
            tick={(props) => <YAxisTick {...props} />}
            axisLine={false}
            tickLine={false}
          />

          {/* 90% threshold reference */}
          <ReferenceLine
            x={90}
            stroke="#4ade80"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.35}
            label={{
              value: '90%',
              position: 'top',
              fontSize: 9,
              fill: '#4ade80',
              opacity: 0.6,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />

          <RechartsTooltip content={renderTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          <Bar dataKey="displayRate" radius={[0, 3, 3, 0]} maxBarSize={14}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={barColor(entry.detectionRate)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ── Legend strips ── */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 pt-1 border-t border-border/20">
        {Object.entries(TYPE_LABELS).map(([key, label]) => {
          const color = TYPE_COLORS[key] || '#64748b'
          const hasCase = DETECTION_DATA.some((c) => c.type === key)
          if (!hasCase) return null
          return (
            <span key={key} className="inline-flex items-center gap-1 text-[10px] text-text-muted">
              <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color, opacity: 0.8 }} />
              {label}
            </span>
          )
        })}
      </div>

      <p className="text-[10px] text-text-muted/65 font-mono px-2">
        Bar color: <span style={{ color: '#4ade80' }}>■</span> ≥90% · <span style={{ color: '#fbbf24' }}>■</span> ≥50% · <span style={{ color: '#f87171' }}>■</span> &lt;50% · Left stripe = fraud type · Dot = sector · v6.0 model
      </p>
    </div>
  )

  if (!collapsible) return body

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-2 py-1 mb-2 text-left group"
        aria-expanded={!collapsed}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">
          Per-Case Detection Breakdown
        </span>
        {collapsed ? <ChevronDown size={13} className="text-text-muted" /> : <ChevronUp size={13} className="text-text-muted" />}
      </button>
      {!collapsed && body}
    </div>
  )
})
