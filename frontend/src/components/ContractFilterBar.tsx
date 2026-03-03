import { Download, X, ArrowUpDown } from 'lucide-react'
import { RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN, cn } from '@/lib/utils'
import type { ContractFilterState, ContractFilterActions } from '@/hooks/useContractFilters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractFilterBarProps {
  filters: ContractFilterState & { isFiltered: boolean }
  actions: ContractFilterActions & { applyFilters: <T>(contracts: T[]) => T[] }
  totalCount: number
  filteredCount: number
  totalValue?: number
  availableYears?: number[]
  className?: string
  onExport?: () => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const
type RiskLevel = (typeof RISK_LEVELS)[number]

interface SortOption {
  label: string
  sortBy: 'date' | 'amount' | 'risk'
  sortOrder: 'asc' | 'desc'
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest First',       sortBy: 'date',   sortOrder: 'desc' },
  { label: 'Oldest First',       sortBy: 'date',   sortOrder: 'asc'  },
  { label: 'Amount \u2193',      sortBy: 'amount', sortOrder: 'desc' },
  { label: 'Amount \u2191',      sortBy: 'amount', sortOrder: 'asc'  },
  { label: 'Risk Score \u2193',  sortBy: 'risk',   sortOrder: 'desc' },
  { label: 'Risk Score \u2191',  sortBy: 'risk',   sortOrder: 'asc'  },
]

// ─── Risk Level Pill ──────────────────────────────────────────────────────────

interface RiskPillProps {
  level: RiskLevel | null
  active: boolean
  onClick: () => void
}

function RiskPill({ level, active, onClick }: RiskPillProps) {
  const color = level ? RISK_COLORS[level] : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        active
          ? 'text-white shadow-sm'
          : 'text-text-muted hover:text-text-primary bg-surface-tertiary hover:bg-surface-muted',
      )}
      style={
        active && color
          ? { backgroundColor: color }
          : active && !color
          ? { backgroundColor: 'rgba(255,255,255,0.15)' }
          : undefined
      }
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: active ? 'rgba(255,255,255,0.8)' : color }}
          aria-hidden="true"
        />
      )}
      {level ? level.charAt(0).toUpperCase() + level.slice(1) : 'All'}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractFilterBar({
  filters,
  actions,
  totalCount,
  filteredCount,
  totalValue,
  availableYears,
  className,
  onExport,
}: ContractFilterBarProps) {
  // Derive the current sort label for the <select>
  const currentSortIndex = SORT_OPTIONS.findIndex(
    opt => opt.sortBy === filters.sortBy && opt.sortOrder === filters.sortOrder,
  )
  const selectedSortIndex = currentSortIndex >= 0 ? currentSortIndex : 0

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = Number(e.target.value)
    const opt = SORT_OPTIONS[idx]
    if (!opt) return
    actions.setSortBy(opt.sortBy)
    // setSortOrder is not on ContractFilterActions directly — we toggle until we match
    // toggleSortOrder flips between asc/desc; compare to current and toggle once if needed
    if (filters.sortOrder !== opt.sortOrder) {
      actions.toggleSortOrder()
    }
  }

  const sortedYears = availableYears
    ? [...availableYears].sort((a, b) => b - a)
    : []

  return (
    <div
      className={cn(
        'bg-surface-secondary rounded-lg px-3 py-2 flex flex-wrap items-center gap-3',
        className,
      )}
      role="group"
      aria-label="Contract filters"
    >
      {/* ── Year select ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        <label
          htmlFor="filter-year"
          className="text-xs text-text-muted whitespace-nowrap select-none"
        >
          Year
        </label>
        <select
          id="filter-year"
          value={filters.year ?? ''}
          onChange={e => actions.setYear(e.target.value === '' ? null : Number(e.target.value))}
          className={cn(
            'bg-surface-tertiary border border-surface-muted rounded px-2 py-1 text-sm',
            'text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
            'cursor-pointer',
          )}
          aria-label="Filter by year"
        >
          <option value="">All Years</option>
          {sortedYears.map(yr => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {/* ── Risk level pills ────────────────────────────── */}
      <div
        className="flex items-center gap-1 flex-wrap"
        role="group"
        aria-label="Filter by risk level"
      >
        <RiskPill
          level={null}
          active={filters.riskLevel === null}
          onClick={() => actions.setRiskLevel(null)}
        />
        {RISK_LEVELS.map(level => (
          <RiskPill
            key={level}
            level={level}
            active={filters.riskLevel === level}
            onClick={() =>
              actions.setRiskLevel(filters.riskLevel === level ? null : level)
            }
          />
        ))}
      </div>

      {/* ── Sort dropdown + toggle icon ─────────────────── */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown
          className="h-3.5 w-3.5 text-text-muted flex-shrink-0"
          aria-hidden="true"
        />
        <select
          id="filter-sort"
          value={selectedSortIndex}
          onChange={handleSortChange}
          className={cn(
            'bg-surface-tertiary border border-surface-muted rounded px-2 py-1 text-sm',
            'text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
            'cursor-pointer',
          )}
          aria-label="Sort contracts"
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <option key={idx} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div className="hidden sm:block h-4 w-px bg-surface-muted flex-shrink-0" aria-hidden="true" />

      {/* ── Results summary ──────────────────────────────── */}
      <p className="text-xs text-text-muted whitespace-nowrap" aria-live="polite" aria-atomic="true">
        Showing{' '}
        <span className="font-medium text-text-secondary">
          {filteredCount.toLocaleString()}
        </span>{' '}
        of{' '}
        <span className="font-medium text-text-secondary">
          {totalCount.toLocaleString()}
        </span>{' '}
        contracts
        {totalValue !== undefined && totalValue > 0 && (
          <span className="text-text-muted">
            {' \u00B7 '}
            <span className="font-medium text-text-secondary">
              {formatCompactMXN(totalValue)}
            </span>
          </span>
        )}
      </p>

      {/* ── Spacer ──────────────────────────────────────── */}
      <div className="flex-1" aria-hidden="true" />

      {/* ── Clear filters ────────────────────────────────── */}
      {filters.isFiltered && (
        <button
          type="button"
          onClick={actions.reset}
          className={cn(
            'inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary',
            'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded',
          )}
          aria-label="Clear all filters"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Clear
        </button>
      )}

      {/* ── Export button ────────────────────────────────── */}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded',
            'bg-surface-tertiary border border-surface-muted text-text-secondary',
            'hover:bg-surface-muted hover:text-text-primary',
            'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          )}
          aria-label="Export filtered contracts"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export
        </button>
      )}
    </div>
  )
}
