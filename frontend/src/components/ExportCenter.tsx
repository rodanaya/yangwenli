import * as React from 'react'
import { toPng } from 'html-to-image'
import { FileSpreadsheet, Code2, Image, Printer, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ExportCenterProps {
  open: boolean
  onClose: () => void
  data: Record<string, unknown>[]
  title: string
  chartRef?: React.RefObject<HTMLDivElement>
  columns?: string[]
}

export default function ExportCenter({
  open,
  onClose,
  data,
  title,
  chartRef,
  columns,
}: ExportCenterProps) {
  const [copied, setCopied] = React.useState(false)
  const [pngLoading, setPngLoading] = React.useState(false)

  const keys = React.useMemo(
    () => (data.length > 0 ? (columns ?? Object.keys(data[0])) : []),
    [data, columns]
  )

  // --- export helpers ---

  const exportCSV = () => {
    if (!data.length) return
    const rows = data.map((row) =>
      keys
        .map((k) => {
          const v = row[k]
          if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
            return `"${v.replace(/"/g, '""')}"`
          }
          return String(v ?? '')
        })
        .join(',')
    )
    const csv = '\ufeff' + [keys.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    if (!data.length) return
    const filtered =
      columns != null
        ? data.map((row) =>
            Object.fromEntries(columns.map((k) => [k, row[k]]))
          )
        : data
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPNG = async () => {
    if (!chartRef?.current) return
    setPngLoading(true)
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${title}.png`
      a.click()
    } catch (err) {
      console.error('ExportCenter: PNG capture failed', err)
    } finally {
      setPngLoading(false)
    }
  }

  const copyJSON = async () => {
    if (!data.length) return
    const filtered =
      columns != null
        ? data.map((row) =>
            Object.fromEntries(columns.map((k) => [k, row[k]]))
          )
        : data
    await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // size estimates
  const csvSizeKB = Math.max(1, Math.ceil(data.length * 0.1))
  const jsonSizeKB = Math.max(1, Math.ceil(JSON.stringify(data).length / 1024))
  const hasChart = Boolean(chartRef?.current ?? chartRef)

  // --- button configs ---
  const options = [
    {
      id: 'csv',
      icon: <FileSpreadsheet className="h-6 w-6" />,
      label: 'CSV Spreadsheet',
      description: 'Open in Excel, Google Sheets, or any data tool',
      meta: `~${csvSizeKB}KB`,
      disabled: data.length === 0,
      loading: false,
      onClick: exportCSV,
    },
    {
      id: 'json',
      icon: <Code2 className="h-6 w-6" />,
      label: 'JSON Data',
      description: 'For developers and data pipelines',
      meta: `~${jsonSizeKB}KB`,
      disabled: data.length === 0,
      loading: false,
      onClick: exportJSON,
    },
    {
      id: 'png',
      icon: <Image className="h-6 w-6" />,
      label: 'Chart Image (PNG)',
      description: hasChart ? 'Screenshot of the current chart' : 'No chart available',
      meta: hasChart ? 'PNG' : '',
      disabled: !hasChart,
      loading: pngLoading,
      onClick: exportPNG,
    },
    {
      id: 'print',
      icon: <Printer className="h-6 w-6" />,
      label: 'Print / PDF',
      description: "Save as PDF using your browser's print dialog",
      meta: '',
      disabled: false,
      loading: false,
      onClick: () => window.print(),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent size="md" className="bg-surface-primary text-text-primary">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Export Data</DialogTitle>
          <DialogDescription className="text-sm text-text-muted">
            Choose your export format
          </DialogDescription>
        </DialogHeader>

        {/* 2x2 grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              disabled={opt.disabled || opt.loading}
              onClick={opt.onClick}
              aria-label={opt.label}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border border-surface-muted p-4 text-left transition-colors',
                opt.disabled || opt.loading
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:border-primary hover:bg-surface-secondary'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md',
                  opt.disabled ? 'bg-surface-muted text-text-muted' : 'bg-primary/10 text-primary'
                )}
              >
                {opt.loading ? (
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  opt.icon
                )}
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{opt.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
                {opt.meta && (
                  <p className="mt-1 text-xs font-mono text-text-muted">{opt.meta}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* footer row */}
        <div className="mt-4 flex items-center justify-between border-t border-surface-muted pt-3">
          <p className="text-xs text-text-muted">
            Includes{' '}
            <span className="font-medium text-text-primary">{data.length.toLocaleString()}</span>{' '}
            {data.length === 1 ? 'record' : 'records'}
          </p>
          <button
            onClick={copyJSON}
            disabled={data.length === 0}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
              data.length === 0
                ? 'cursor-not-allowed text-text-muted opacity-40'
                : 'text-primary hover:bg-surface-secondary'
            )}
            aria-label="Copy data as JSON to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy as JSON
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
