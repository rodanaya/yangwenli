import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  key: string
  header: string
  numeric?: boolean
  sortable?: boolean
  className?: string
  render: (row: T, index: number) => ReactNode
}

interface EditorialTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyFn: (row: T, index: number) => string | number
  onRowClick?: (row: T) => void
  flagFn?: (row: T) => 'critical' | 'high' | null
  emptyMessage?: string
  className?: string
  initialSortKey?: string
  initialSortDir?: 'asc' | 'desc'
}

export function EditorialTable<T>({
  columns, data, keyFn, onRowClick, flagFn, emptyMessage = 'No records found.',
  className, initialSortKey, initialSortDir = 'desc'
}: EditorialTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="editorial-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  col.numeric && 'num',
                  col.sortable && 'cursor-pointer select-none hover:text-text-secondary transition-colors',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortKey === col.key
                    ? (sortDir === 'asc' ? 'ascending' : 'descending')
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-text-muted/50">
                      {sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="h-2.5 w-2.5" />
                          : <ChevronDown className="h-2.5 w-2.5" />
                        : <ChevronsUpDown className="h-2.5 w-2.5 opacity-50" />
                      }
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-text-muted py-8 font-mono text-xs tracking-widest uppercase"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const flag = flagFn?.(row)
              return (
                <tr
                  key={keyFn(row, idx)}
                  className={cn(
                    flag === 'critical' && 'is-flagged',
                    flag === 'high' && 'is-high',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn(col.numeric && 'num', col.className)}>
                      {col.render(row, idx)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
