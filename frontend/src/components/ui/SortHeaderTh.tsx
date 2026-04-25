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
      className={`font-medium cursor-pointer select-none ${className}`}
      aria-sort={
        isActive ? (order === 'desc' ? 'descending' : 'ascending') : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-0.5 hover:text-text-primary transition-colors uppercase tracking-wider text-[11px]"
      >
        {label}
        <Icon className={iconCls} />
      </button>
    </th>
  )
}
