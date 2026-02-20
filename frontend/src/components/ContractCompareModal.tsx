import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, GitCompareArrows, ExternalLink } from 'lucide-react'
import { cn, formatCompactMXN, formatDate, toTitleCase, getRiskLevel } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import type { ContractListItem } from '@/api/types'

interface ContractCompareModalProps {
  contracts: ContractListItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewDetail: (id: number) => void
}

// A single comparison row: label in first col, values in subsequent cols
interface CompareRowProps {
  label: string
  values: React.ReactNode[]
  highlight?: 'none' | 'max' | 'min'
  highlightIndexes?: number[]
}

function CompareRow({ label, values, highlightIndexes = [] }: CompareRowProps) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-3 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap bg-background-card/60 border-r border-border/40 w-28 shrink-0">
        {label}
      </td>
      {values.map((val, i) => (
        <td
          key={i}
          className={cn(
            'px-3 py-2.5 text-xs border-r border-border/30 last:border-r-0 align-top',
            highlightIndexes.includes(i) && 'bg-accent/5'
          )}
        >
          {val}
        </td>
      ))}
    </tr>
  )
}

function RiskBar({ score }: { score?: number }) {
  if (score == null) return <span className="text-text-muted">—</span>
  const level = getRiskLevel(score)
  const color = RISK_COLORS[level]
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(score * 100, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="tabular-nums font-semibold" style={{ color }}>
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function RiskBadge({ level }: { level?: string }) {
  if (!level) return <span className="text-text-muted">—</span>
  const colors: Record<string, string> = {
    critical: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
    high: 'bg-risk-high/15 text-risk-high border-risk-high/30',
    medium: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
    low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  }
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border', colors[level] || 'bg-border/20 text-text-muted border-border/30')}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

export function ContractCompareModal({
  contracts,
  open,
  onOpenChange,
  onViewDetail,
}: ContractCompareModalProps) {
  if (!open || contracts.length === 0) return null

  const n = contracts.length

  // Find indexes with highest risk score
  const maxRiskIdx = contracts.reduce((best, c, i) =>
    (c.risk_score ?? 0) > (contracts[best].risk_score ?? 0) ? i : best, 0)

  // Find index with highest amount
  const maxAmtIdx = contracts.reduce((best, c, i) =>
    c.amount_mxn > contracts[best].amount_mxn ? i : best, 0)

  const colWidth = n === 2 ? '42%' : n === 3 ? '30%' : '23%'

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: n <= 2 ? '48rem' : n === 3 ? '64rem' : '78rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        className="border bg-background rounded-lg shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">
              Compare Contracts
              <span className="ml-1.5 text-xs font-normal text-text-muted">({n} selected)</span>
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity p-1"
            aria-label="Close comparison"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 overflow-x-auto">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '7rem' }} />
              {contracts.map((_, i) => (
                <col key={i} style={{ width: colWidth }} />
              ))}
            </colgroup>
            <tbody>
              {/* Contract header row */}
              <tr className="border-b border-border/60 bg-background-card/40">
                <td className="px-3 py-2 text-xs font-medium text-text-muted bg-background-card/60 border-r border-border/40" />
                {contracts.map((c, i) => {
                  const sector = c.sector_id ? SECTORS.find((s) => s.id === c.sector_id) : null
                  return (
                    <td key={i} className="px-3 py-2.5 border-r border-border/30 last:border-r-0">
                      <div className="flex items-start gap-1.5">
                        {sector && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: sector.color }}
                            title={sector.nameEN}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">
                            {c.title ? toTitleCase(c.title) : 'Untitled'}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {c.contract_number || `#${c.id}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { onOpenChange(false); onViewDetail(c.id) }}
                        className="mt-1.5 text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Full details
                      </button>
                    </td>
                  )
                })}
              </tr>

              {/* Risk Score */}
              <CompareRow
                label="Risk Score"
                values={contracts.map((c) => <RiskBar key={c.id} score={c.risk_score} />)}
                highlightIndexes={[maxRiskIdx]}
              />

              {/* Risk Level */}
              <CompareRow
                label="Risk Level"
                values={contracts.map((c) => <RiskBadge key={c.id} level={c.risk_level} />)}
              />

              {/* Amount */}
              <CompareRow
                label="Amount"
                values={contracts.map((c) => (
                  <span key={c.id} className={cn('tabular-nums font-medium', maxAmtIdx === contracts.indexOf(c) && 'text-accent')}>
                    {formatCompactMXN(c.amount_mxn)}
                  </span>
                ))}
                highlightIndexes={[maxAmtIdx]}
              />

              {/* Date */}
              <CompareRow
                label="Date"
                values={contracts.map((c) => (
                  <span key={c.id} className="text-text-primary">
                    {c.contract_date ? formatDate(c.contract_date) : (c.contract_year || '—')}
                  </span>
                ))}
              />

              {/* Vendor */}
              <CompareRow
                label="Vendor"
                values={contracts.map((c) => (
                  c.vendor_id
                    ? <Link key={c.id} to={`/vendors/${c.vendor_id}`} onClick={() => onOpenChange(false)} className="text-accent hover:underline line-clamp-2">
                        {toTitleCase(c.vendor_name || 'Unknown')}
                      </Link>
                    : <span key={c.id} className="text-text-muted">Unknown</span>
                ))}
              />

              {/* Institution */}
              <CompareRow
                label="Institution"
                values={contracts.map((c) => (
                  c.institution_id
                    ? <Link key={c.id} to={`/institutions/${c.institution_id}`} onClick={() => onOpenChange(false)} className="text-accent hover:underline line-clamp-2">
                        {toTitleCase(c.institution_name || 'Unknown')}
                      </Link>
                    : <span key={c.id} className="text-text-muted">Unknown</span>
                ))}
              />

              {/* Sector */}
              <CompareRow
                label="Sector"
                values={contracts.map((c) => {
                  const sec = c.sector_id ? SECTORS.find((s) => s.id === c.sector_id) : null
                  return sec
                    ? <span key={c.id} className="font-medium" style={{ color: sec.color }}>{sec.nameEN}</span>
                    : <span key={c.id} className="text-text-muted">—</span>
                })}
              />

              {/* Procedure */}
              <CompareRow
                label="Procedure"
                values={contracts.map((c) => (
                  <span key={c.id} className="text-text-primary">
                    {c.procedure_type || '—'}
                  </span>
                ))}
              />

              {/* Flags */}
              <CompareRow
                label="Flags"
                values={contracts.map((c) => (
                  <div key={c.id} className="flex flex-wrap gap-1">
                    {c.is_direct_award && (
                      <span className="text-xs font-semibold text-risk-high bg-risk-high/15 px-1.5 py-0.5 rounded" title="Direct Award">DA</span>
                    )}
                    {c.is_single_bid && (
                      <span className="text-xs font-semibold text-risk-critical bg-risk-critical/15 px-1.5 py-0.5 rounded" title="Single Bid">SB</span>
                    )}
                    {!c.is_direct_award && !c.is_single_bid && (
                      <span className="text-text-muted">—</span>
                    )}
                  </div>
                ))}
              />

              {/* Risk Factors */}
              <CompareRow
                label="Risk Factors"
                values={contracts.map((c) => {
                  const factors = c.risk_factors?.filter(Boolean) || []
                  return factors.length > 0
                    ? <div key={c.id} className="flex flex-wrap gap-1">
                        {factors.slice(0, 4).map((f) => (
                          <span key={f} className="text-xs bg-border/30 text-text-muted px-1 py-0.5 rounded">{f}</span>
                        ))}
                        {factors.length > 4 && <span className="text-xs text-text-muted">+{factors.length - 4}</span>}
                      </div>
                    : <span key={c.id} className="text-text-muted">—</span>
                })}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}
