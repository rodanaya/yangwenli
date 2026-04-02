import { useState, useCallback } from 'react'
import { ArrowUpDown, Copy, Download } from 'lucide-react'
import { cn, formatCompactMXN, getLocale } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendRow {
  year: number
  total_contracts: number
  high_risk_count: number
  high_risk_pct: number       // 0–100
  avg_risk_score: number      // 0–1
  total_value_mxn?: number
  sector_name?: string
}

export interface TrendDataTableProps {
  data: TrendRow[]
  title?: string
  loading?: boolean
  className?: string
  showSectorColumn?: boolean
}

// Years that coincide with well-documented procurement scandals
const SCANDAL_YEARS = new Set([2013, 2020, 2021])

type SortKey = 'year' | 'total_contracts' | 'high_risk_pct' | 'avg_risk_score'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCsvContent(rows: TrendRow[], showSector: boolean): string {
  const headers = [
    'Year',
    ...(showSector ? ['Sector'] : []),
    'Total Contracts',
    'High-Risk Count',
    'High-Risk %',
    'Avg Score %',
    'Total Value (MXN)',
  ]

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.year,
        ...(showSector ? [r.sector_name ?? ''] : []),
        r.total_contracts,
        r.high_risk_count,
        r.high_risk_pct.toFixed(1),
        (r.avg_risk_score * 100).toFixed(1),
        r.total_value_mxn ?? '',
      ].join(',')
    ),
  ]

  return lines.join('\n')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 rounded bg-background-elevated/50 animate-pulse" style={{ width: i === 0 ? '3rem' : '100%' }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TrendDataTable({
  data,
  title,
  loading = false,
  className,
  showSectorColumn = false,
}: TrendDataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('year')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [copiedYear, setCopiedYear] = useState<number | null>(null)

  // Sort
  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Paginate
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = page < totalPages

  // Column count for skeletons
  const colCount = 5 + (showSectorColumn ? 1 : 0) + 1 /* copy */ + (data.some((r) => r.total_value_mxn !== undefined) ? 1 : 0)

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('desc')
      }
      setPage(1)
    },
    [sortKey]
  )

  const handleCopyRow = useCallback(
    (row: TrendRow) => {
      const text = `Year: ${row.year}, High-Risk: ${row.high_risk_pct.toFixed(1)}%, Avg Score: ${(row.avg_risk_score * 100).toFixed(1)}%`
      navigator.clipboard.writeText(text).then(() => {
        setCopiedYear(row.year)
        setTimeout(() => setCopiedYear(null), 1500)
      })
    },
    []
  )

  const handleExport = useCallback(() => {
    const csv = buildCsvContent(sorted, showSectorColumn)
    downloadCsv(csv, `rubli-risk-trends.csv`)
  }, [sorted, showSectorColumn])

  const showValue = data.some((r) => r.total_value_mxn !== undefined)

  // Sortable header helper
  const SortableHead = ({
    label,
    sortable,
    field,
    className: cls,
  }: {
    label: string
    sortable?: SortKey
    field?: string
    className?: string
  }) => (
    <TableHead className={cn('whitespace-nowrap', cls)}>
      {sortable ? (
        <button
          onClick={() => toggleSort(sortable)}
          className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors group"
          aria-label={`Sort by ${field ?? label}`}
        >
          {label}
          <ArrowUpDown
            className={cn(
              'h-3 w-3 flex-shrink-0 transition-colors',
              sortKey === sortable ? 'text-accent' : 'text-text-muted/50 group-hover:text-text-muted'
            )}
          />
        </button>
      ) : (
        <span className="text-text-muted">{label}</span>
      )}
    </TableHead>
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border/50 bg-background-elevated px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:border-accent/50 transition-colors"
          aria-label="Export all rows as CSV"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background-elevated/80">
              <SortableHead label="Year" sortable="year" field="year" />
              {showSectorColumn && <SortableHead label="Sector" />}
              <SortableHead label="Total Contracts" sortable="total_contracts" field="total contracts" className="text-right" />
              <TableHead className="text-right whitespace-nowrap">
                <span className="text-text-muted">High-Risk</span>
              </TableHead>
              <SortableHead label="High-Risk %" sortable="high_risk_pct" field="high-risk percentage" className="text-right" />
              <SortableHead label="Avg Score" sortable="avg_risk_score" field="average score" className="text-right" />
              {showValue && (
                <TableHead className="text-right whitespace-nowrap">
                  <span className="text-text-muted">Total Value</span>
                </TableHead>
              )}
              {/* Copy column — no label */}
              <TableHead className="w-8" aria-label="Row actions" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
              : visible.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-12 text-center text-text-muted text-sm">
                    No trend data available.
                  </TableCell>
                </TableRow>
              )
              : visible.map((row) => {
                const isScandal = SCANDAL_YEARS.has(row.year)
                const isCopied = copiedYear === row.year
                const barWidth = Math.min(100, Math.max(0, row.high_risk_pct))
                const avgScoreDisplay = `${(row.avg_risk_score * 100).toFixed(1)}%`

                return (
                  <TableRow
                    key={`${row.year}-${row.sector_name ?? 'all'}`}
                    className="group relative"
                  >
                    {/* Year */}
                    <TableCell className="font-bold text-text-primary">
                      <div className="flex items-center gap-1.5">
                        {row.year}
                        {isScandal && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0"
                            title={`${row.year} — notable scandal year`}
                            aria-label={`${row.year} is a notable scandal year`}
                          />
                        )}
                      </div>
                    </TableCell>

                    {/* Sector */}
                    {showSectorColumn && (
                      <TableCell className="text-text-muted text-xs">
                        {row.sector_name ?? '—'}
                      </TableCell>
                    )}

                    {/* Total contracts */}
                    <TableCell className="text-right tabular-nums text-text-secondary">
                      {row.total_contracts.toLocaleString(getLocale())}
                    </TableCell>

                    {/* High-risk count */}
                    <TableCell className="text-right tabular-nums text-text-secondary">
                      {row.high_risk_count.toLocaleString(getLocale())}
                    </TableCell>

                    {/* High-risk % with bar */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            'tabular-nums text-sm font-medium',
                            row.high_risk_pct >= 15
                              ? 'text-red-400'
                              : row.high_risk_pct >= 10
                              ? 'text-orange-400'
                              : 'text-text-secondary'
                          )}
                        >
                          {row.high_risk_pct.toFixed(1)}%
                        </span>
                        <div
                          className="h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                          style={{ width: `${barWidth}%`, maxWidth: '4rem', minWidth: '2px' }}
                          aria-hidden="true"
                        />
                      </div>
                    </TableCell>

                    {/* Avg score */}
                    <TableCell className="text-right tabular-nums text-text-secondary">
                      {avgScoreDisplay}
                    </TableCell>

                    {/* Total value */}
                    {showValue && (
                      <TableCell className="text-right tabular-nums text-text-secondary text-xs">
                        {row.total_value_mxn !== undefined
                          ? formatCompactMXN(row.total_value_mxn)
                          : '—'}
                      </TableCell>
                    )}

                    {/* Copy button */}
                    <TableCell className="w-8 text-center">
                      <button
                        onClick={() => handleCopyRow(row)}
                        className={cn(
                          'rounded p-1 opacity-0 group-hover:opacity-100 transition-all',
                          isCopied
                            ? 'text-green-400 opacity-100'
                            : 'text-text-muted hover:text-text-primary hover:bg-white/10'
                        )}
                        aria-label={`Copy row data for ${row.year}`}
                        title={isCopied ? 'Copied!' : 'Copy row'}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* Show more / pagination */}
      {!loading && hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="self-center rounded-md border border-border/50 px-4 py-1.5 text-xs text-text-muted hover:text-text-primary hover:border-accent/50 transition-colors"
          aria-label={`Show more rows (${sorted.length - visible.length} remaining)`}
        >
          Show more ({sorted.length - visible.length} remaining)
        </button>
      )}

      {/* Row count */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-text-muted text-center" aria-live="polite">
          Showing {visible.length} of {sorted.length} rows
          {data.some((r) => SCANDAL_YEARS.has(r.year)) && (
            <> &mdash; <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
              notable scandal year
            </span></>
          )}
        </p>
      )}
    </div>
  )
}
