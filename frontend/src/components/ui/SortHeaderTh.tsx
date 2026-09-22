/**
 * SortHeaderTh — canonical sortable table-header cell.
 *
 * Replaces the local SortHeader implementations in
 * `pages/explore/ResultsTable.tsx`, `pages/InstitutionLeague.tsx`, and
 * `pages/Contracts.tsx` (3 incompatible APIs, identical visual intent).
 * Uses lucide ArrowUp / ArrowDown / ArrowUpDown for state.
 */
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface SortHeaderThProps<F extends string = string> {
  field: F
  label: string
  /** Currently active sort field (matches `field` to mark active). */
  activeField: F
  /** 'asc' | 'desc'. */
  order: 'asc' | 'desc'
  onSort: (field: F) => void
  className?: string
}

export function SortHeaderTh<F extends string = string>({
  field,
  label,
  activeField,
  order,
  onSort,
  className = '',
}: SortHeaderThProps<F>) {
  const isActive = activeField === field
  const Icon = !isActive ? ArrowUpDown : order === 'desc' ? ArrowDown : ArrowUp
  const iconCls = isActive
    ? 'h-2.5 w-2.5 ml-0.5 text-text-primary'
    : 'h-2.5 w-2.5 ml-0.5 opacity-30'

  return (
    <th
      scope="col"
      className={`font-medium cursor-pointer select-none ${className}`}
      aria-sort={
        isActive ? (order === 'desc' ? 'descending' : 'ascending') : 'none'
      }
    >
      {/* min-h-6 lifts the hit target to 24px; -my-0.5 spends the 4px inside the
          cell's own padding so no caller's header row changes height. */}
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-0.5 min-h-6 -my-0.5 rounded-sm hover:text-text-primary transition-colors uppercase tracking-wider text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        {label}
        <Icon className={iconCls} />
      </button>
    </th>
  )
}
