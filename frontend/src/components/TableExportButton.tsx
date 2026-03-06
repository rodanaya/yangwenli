import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TableExportButtonProps {
  data: Record<string, unknown>[]
  filename?: string
  columns?: string[]
  label?: string
  className?: string
  disabled?: boolean
  /** When true, shows buttons for both CSV and Excel (default false) */
  showXlsx?: boolean
}

function toCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (!data.length) return ''
  const headers = columns ?? Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Convert data to an HTML table that Excel can open as .xls.
 * No external npm dependencies — uses the standard "Excel-HTML" data-URI trick.
 */
function toExcelHtml(data: Record<string, unknown>[], columns?: string[]): string {
  if (!data.length) return ''
  const headers = columns ?? Object.keys(data[0])
  const headerRow = headers.map(h => `<th>${h}</th>`).join('')
  const bodyRows = data
    .map(row => {
      const cells = headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return `<td>${str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`
      })
      return `<tr>${cells.join('')}</tr>`
    })
    .join('')
  return [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="UTF-8"></head>',
    `<body><table border="1"><thead><tr>${headerRow}</tr></thead>`,
    `<tbody>${bodyRows}</tbody></table></body></html>`,
  ].join('')
}

type ExportFormat = 'csv' | 'xlsx'
type ExportState = 'idle' | 'loading' | 'done'

export function TableExportButton({
  data,
  filename = 'export',
  columns,
  label,
  className,
  disabled,
  showXlsx = false,
}: TableExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle')
  const [xlsxMenuOpen, setXlsxMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!xlsxMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setXlsxMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [xlsxMenuOpen])

  const isEmpty = !data.length
  const isDisabled = disabled || isEmpty || state === 'loading'

  const doExport = async (format: ExportFormat) => {
    if (isDisabled) return
    setState('loading')
    setXlsxMenuOpen(false)
    // Yield to render cycle so the spinner appears
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    let blob: Blob
    let ext: string

    if (format === 'csv') {
      const csv = toCSV(data, columns)
      blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      ext = 'csv'
    } else {
      const html = toExcelHtml(data, columns)
      blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      ext = 'xls'
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${filename}.${ext}`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)

    setState('done')
    setTimeout(() => setState('idle'), 2000)
  }

  const icon =
    state === 'loading' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
    ) : state === 'done' ? (
      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
    ) : (
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
    )

  // ── Single-button variant (CSV only) — default ───────────────────────────
  if (!showXlsx) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={label ? 'sm' : 'icon'}
            className={`${label ? 'h-7 px-2' : 'h-7 w-7'} ${className ?? ''}`}
            onClick={() => doExport('csv')}
            disabled={isDisabled}
            aria-label="Export table as CSV"
          >
            {icon}
            {label && (
              <span className="ml-1 text-xs">
                {state === 'done' ? 'Downloaded' : label}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isEmpty
              ? 'No data to export'
              : state === 'done'
              ? '✓ Downloaded'
              : 'Download as CSV'}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // ── Multi-format variant: CSV primary + XLSX option ──────────────────────
  return (
    <div className={`relative flex items-center ${className ?? ''}`} ref={menuRef}>
      {/* CSV primary button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 rounded-r-none"
        onClick={() => doExport('csv')}
        disabled={isDisabled}
        aria-label="Export as CSV"
      >
        {icon}
        {label && (
          <span className="ml-1 text-xs">
            {state === 'done' ? 'Downloaded' : label}
          </span>
        )}
      </Button>

      {/* Dropdown chevron */}
      <button
        type="button"
        className="h-7 w-6 flex items-center justify-center border-l border-border/40 hover:bg-accent/10 rounded-r transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => setXlsxMenuOpen(o => !o)}
        disabled={isDisabled}
        aria-label="More export formats"
        aria-expanded={xlsxMenuOpen}
        aria-haspopup="menu"
      >
        <ChevronDown className="h-3 w-3 text-text-muted" aria-hidden="true" />
      </button>

      {/* Dropdown menu */}
      {xlsxMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-50 min-w-[160px] rounded-md border border-border bg-background-card shadow-lg py-1"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors"
            onClick={() => doExport('csv')}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export as CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors"
            onClick={() => doExport('xlsx')}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export as Excel (.xls)
          </button>
        </div>
      )}
    </div>
  )
}
