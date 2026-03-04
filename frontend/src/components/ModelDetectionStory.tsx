import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'

// ============================================================================
// HARDCODED DETECTION DATA — real cases from RISK_METHODOLOGY_v5.md
// Updated to reflect v5.1 detection performance
// ============================================================================

interface DetectionCase {
  name: string
  sector: string
  sectorKey: string
  contracts: number
  detectionRate: number
  avgScore: number
  type: string
}

const DETECTION_DATA: DetectionCase[] = [
  { name: 'IMSS Ghost Company Network', sector: 'Health', sectorKey: 'salud', contracts: 9366, detectionRate: 99.9, avgScore: 0.977, type: 'ghost_companies' },
  { name: 'Segalmex Food Distribution', sector: 'Agriculture', sectorKey: 'agricultura', contracts: 6326, detectionRate: 99.6, avgScore: 0.664, type: 'procurement_fraud' },
  { name: 'COVID-19 Emergency Procurement', sector: 'Health', sectorKey: 'salud', contracts: 5371, detectionRate: 99.9, avgScore: 0.821, type: 'embezzlement' },
  { name: 'Edenred Voucher Monopoly', sector: 'Energy', sectorKey: 'energia', contracts: 2939, detectionRate: 100, avgScore: 0.884, type: 'monopoly' },
  { name: 'Toka IT Monopoly', sector: 'Education', sectorKey: 'educacion', contracts: 1954, detectionRate: 100, avgScore: 0.964, type: 'monopoly' },
  { name: 'SEGOB-Mainbit IT Monopoly', sector: 'Governance', sectorKey: 'gobernacion', contracts: 604, detectionRate: 96, avgScore: 0.82, type: 'monopoly' },
  { name: 'ISSSTE Ambulance Fraud', sector: 'Labor', sectorKey: 'trabajo', contracts: 603, detectionRate: 95, avgScore: 0.74, type: 'overpricing' },
  { name: 'Infrastructure Fraud Network', sector: 'Infrastructure', sectorKey: 'infraestructura', contracts: 191, detectionRate: 100, avgScore: 0.962, type: 'overpricing' },
  { name: 'SixSigma Tender Rigging', sector: 'Treasury', sectorKey: 'hacienda', contracts: 147, detectionRate: 95.2, avgScore: 0.756, type: 'bid_rigging' },
  { name: 'Cyber Robotic IT', sector: 'Technology', sectorKey: 'tecnologia', contracts: 139, detectionRate: 100, avgScore: 0.249, type: 'overpricing' },
  { name: 'SAT EFOS Ghost Network', sector: 'Multiple', sectorKey: 'otros', contracts: 122, detectionRate: 41.8, avgScore: 0.283, type: 'ghost_companies' },
  { name: 'IPN Cartel de la Limpieza', sector: 'Education', sectorKey: 'educacion', contracts: 48, detectionRate: 95.8, avgScore: 0.551, type: 'bid_rigging' },
  { name: 'PEMEX-Cotemar Irregularities', sector: 'Energy', sectorKey: 'energia', contracts: 51, detectionRate: 100, avgScore: 1.0, type: 'procurement_fraud' },
  { name: 'Odebrecht-PEMEX Bribery', sector: 'Energy', sectorKey: 'energia', contracts: 35, detectionRate: 97.1, avgScore: 0.915, type: 'bribery' },
]

const TYPE_LABELS: Record<string, string> = {
  ghost_companies: 'Ghost companies',
  procurement_fraud: 'Procurement fraud',
  embezzlement: 'Embezzlement',
  monopoly: 'Monopoly',
  overpricing: 'Overpricing',
  bid_rigging: 'Bid rigging',
  bribery: 'Bribery',
}

type SortKey = 'contracts' | 'detectionRate' | 'avgScore'

// ============================================================================
// SCORE PILL — colored by risk level thresholds
// ============================================================================
function ScorePill({ score }: { score: number }) {
  const color =
    score >= 0.5 ? { bg: 'bg-risk-critical/15', text: 'text-risk-critical' } :
    score >= 0.3 ? { bg: 'bg-risk-high/15', text: 'text-risk-high' } :
    score >= 0.1 ? { bg: 'bg-risk-medium/15', text: 'text-risk-medium' } :
    { bg: 'bg-risk-low/15', text: 'text-risk-low' }

  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums', color.bg, color.text)}>
      {score.toFixed(2)}
    </span>
  )
}

// ============================================================================
// DETECTION BAR — horizontal bar showing detection rate
// ============================================================================
function DetectionBar({ rate }: { rate: number }) {
  const fillColor =
    rate >= 90 ? '#4ade80' :
    rate >= 50 ? '#fbbf24' :
    '#f87171'

  const trackColor =
    rate >= 90 ? 'rgba(74,222,128,0.12)' :
    rate >= 50 ? 'rgba(251,191,36,0.12)' :
    'rgba(248,113,113,0.12)'

  const textColor =
    rate >= 90 ? 'text-risk-low' :
    rate >= 50 ? 'text-risk-medium' :
    'text-risk-critical'

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1 h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
        {/* Tick marks */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute top-0 h-full w-px opacity-20"
            style={{ left: `${tick}%`, backgroundColor: 'var(--color-border)' }}
          />
        ))}
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(rate, 1.5)}%`, backgroundColor: fillColor }}
        />
      </div>
      <span className={cn('text-xs font-black font-mono tabular-nums w-12 text-right flex-shrink-0', textColor)}>
        {rate.toFixed(rate === 100 ? 0 : 1)}%
      </span>
    </div>
  )
}

// ============================================================================
// SUMMARY BAR — overall stats strip at the top
// ============================================================================
function SummaryBar({
  totalCases,
  totalContracts,
  avgDetection,
}: {
  totalCases: number
  totalContracts: number
  avgDetection: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 rounded-lg bg-background-elevated/30 border border-border/30 text-[11px] font-mono uppercase tracking-wide text-text-muted">
      <span>
        <span className="font-black text-text-primary text-base not-uppercase normal-case tracking-normal font-sans mr-1">
          {totalCases}
        </span>
        documented cases
      </span>
      <span className="text-border/60">·</span>
      <span>
        <span className="font-black text-text-primary text-base not-uppercase normal-case tracking-normal font-sans mr-1">
          {formatNumber(totalContracts)}
        </span>
        contracts
      </span>
      <span className="text-border/60">·</span>
      <span>
        Avg detection{' '}
        <span className="font-black text-risk-low text-base not-uppercase normal-case tracking-normal font-sans">
          {avgDetection.toFixed(1)}%
        </span>
      </span>
      <span className="text-border/60">·</span>
      <span>
        Model AUC{' '}
        <span className="font-black text-accent text-base not-uppercase normal-case tracking-normal font-sans">
          0.957
        </span>
      </span>
      {/* Tooltip explaining detection rate */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-text-muted hover:text-text-secondary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
            aria-label="What is detection rate?"
          >
            <HelpCircle size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="font-semibold text-xs mb-1">Detection Rate</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Percentage of contracts from each documented corruption case flagged as medium-risk or higher by the v5.1 ML model. High+ = flagged as high or critical risk.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

// ============================================================================
// SORT BUTTON — small header sort control
// ============================================================================
function SortButton({
  label,
  sortKey,
  active,
  direction,
  onClick,
}: {
  label: string
  sortKey: SortKey
  active: boolean
  direction: 'asc' | 'desc'
  onClick: (key: SortKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
        active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
      )}
      aria-pressed={active}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {active ? (
        direction === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
      ) : (
        <ArrowUpDown size={10} className="opacity-40" />
      )}
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ModelDetectionStoryProps {
  /** If true, render inside a collapsible container */
  collapsible?: boolean
  /** Initial collapsed state when collapsible=true */
  defaultCollapsed?: boolean
}

export const ModelDetectionStory = memo(function ModelDetectionStory({
  collapsible = false,
  defaultCollapsed = false,
}: ModelDetectionStoryProps) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('contracts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedCases = useMemo(() => {
    return [...DETECTION_DATA].sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1
      return mul * (a[sortKey] - b[sortKey])
    })
  }, [sortKey, sortDir])

  const totalContracts = useMemo(() => DETECTION_DATA.reduce((s, c) => s + c.contracts, 0), [])

  // Weighted average detection rate (weight by contract count)
  const avgDetection = useMemo(() => {
    const totalWeightedRate = DETECTION_DATA.reduce((s, c) => s + c.detectionRate * c.contracts, 0)
    return totalContracts > 0 ? totalWeightedRate / totalContracts : 0
  }, [totalContracts])

  const body = (
    <div className="space-y-3">
      <SummaryBar
        totalCases={DETECTION_DATA.length}
        totalContracts={totalContracts}
        avgDetection={avgDetection}
      />

      {/* Table header */}
      <div
        className="grid items-center gap-x-3 px-2 pt-1"
        style={{ gridTemplateColumns: '1fr 140px 56px 42px 40px' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Case / Type
        </span>
        <div className="flex items-center justify-end">
          <SortButton
            label="Detection"
            sortKey="detectionRate"
            active={sortKey === 'detectionRate'}
            direction={sortDir}
            onClick={handleSort}
          />
        </div>
        <div className="flex items-center justify-end">
          <SortButton
            label="Contracts"
            sortKey="contracts"
            active={sortKey === 'contracts'}
            direction={sortDir}
            onClick={handleSort}
          />
        </div>
        <div className="flex items-center justify-end">
          <SortButton
            label="Score"
            sortKey="avgScore"
            active={sortKey === 'avgScore'}
            direction={sortDir}
            onClick={handleSort}
          />
        </div>
        {/* View column — no header label */}
        <div />
      </div>

      {/* Rows */}
      <div className="space-y-0">
        {sortedCases.map((c) => {
          const sectorColor = SECTOR_COLORS[c.sectorKey] || '#64748b'
          return (
            <div
              key={c.name}
              className="grid items-center gap-x-3 py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors"
              style={{ gridTemplateColumns: '1fr 140px 56px 42px 40px' }}
            >
              {/* Case name + sector dot + type */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectorColor }}
                    title={c.sector}
                    aria-label={`Sector: ${c.sector}`}
                  />
                  <span className="text-xs font-semibold text-text-primary truncate leading-tight">
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                  <span className="text-[10px] text-text-muted">
                    {TYPE_LABELS[c.type] ?? c.type}
                  </span>
                  <span className="text-[10px] text-text-muted/50">{c.sector}</span>
                </div>
              </div>

              {/* Detection bar */}
              <DetectionBar rate={c.detectionRate} />

              {/* Contract count */}
              <div className="text-right">
                <span className="text-[11px] text-text-muted tabular-nums font-mono">
                  {formatNumber(c.contracts)}
                </span>
              </div>

              {/* Avg score pill */}
              <div className="flex justify-end">
                <ScorePill score={c.avgScore} />
              </div>

              {/* View contracts link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/contracts?search=${encodeURIComponent(c.name)}`)}
                  className="text-[10px] text-blue-400/70 hover:text-blue-400 underline-offset-2 hover:underline flex-shrink-0 font-mono"
                  aria-label={`View contracts for ${c.name}`}
                >
                  View →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-text-muted/50 font-mono px-2 pt-1 border-t border-border/20">
        Detection rate = % of contracts flagged medium-risk or higher · Score = avg risk indicator (0–1) · v5.1 model · AUC 0.957
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
        {collapsed ? (
          <ChevronDown size={13} className="text-text-muted" />
        ) : (
          <ChevronUp size={13} className="text-text-muted" />
        )}
      </button>
      {!collapsed && body}
    </div>
  )
})
