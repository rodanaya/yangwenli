import { useState, useCallback } from 'react'

export interface ExportOptions {
  filename: string
  columns?: string[]
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function recordsToCSV(
  data: Record<string, unknown>[],
  columns?: string[]
): string {
  if (data.length === 0) return ''

  const keys = columns ?? Object.keys(data[0])

  const header = keys.map(k => quoteCSVField(k)).join(',')

  const rows = data.map(row =>
    keys.map(k => quoteCSVField(String(row[k] ?? ''))).join(',')
  )

  // UTF-8 BOM so Excel opens it correctly
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

function quoteCSVField(value: string): string {
  // Quote if value contains comma, double-quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function useBulkExport() {
  const [isExporting, setIsExporting] = useState(false)

  const exportAsCSV = useCallback(
    (data: Record<string, unknown>[], options: ExportOptions): void => {
      setIsExporting(true)
      try {
        const csv = recordsToCSV(data, options.columns)
        const filename = options.filename.endsWith('.csv')
          ? options.filename
          : `${options.filename}.csv`
        triggerDownload(csv, filename, 'text/csv;charset=utf-8;')
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  const exportAsJSON = useCallback(
    (data: Record<string, unknown>[], options: ExportOptions): void => {
      setIsExporting(true)
      try {
        const json = JSON.stringify(data, null, 2)
        const filename = options.filename.endsWith('.json')
          ? options.filename
          : `${options.filename}.json`
        triggerDownload(json, filename, 'application/json')
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  const copyAsJSON = useCallback(async (data: unknown[]): Promise<boolean> => {
    try {
      const json = JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(json)
      return true
    } catch {
      return false
    }
  }, [])

  return { exportAsCSV, exportAsJSON, copyAsJSON, isExporting }
}
