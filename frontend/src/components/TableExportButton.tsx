import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TableExportButtonProps {
  data: Record<string, unknown>[]
  filename?: string
  className?: string
}

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return ''
  const headers = Object.keys(data[0])
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

export function TableExportButton({ data, filename = 'export', className }: TableExportButtonProps) {
  const handleDownload = () => {
    const csv = toCSV(data)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${filename}.csv`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${className ?? ''}`}
          onClick={handleDownload}
          disabled={!data.length}
          aria-label="Export table as CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent><p className="text-xs">Export CSV</p></TooltipContent>
    </Tooltip>
  )
}
