import { TableExportButton } from '@/components/TableExportButton'
import { JsonExportButton } from '@/components/JsonExportButton'

interface ExportButtonGroupProps {
  data: Record<string, unknown>[]
  filename: string
  columns?: string[]
  className?: string
  showLabels?: boolean
}

/**
 * Renders a CSV and JSON export button side by side.
 * Drop this into any table header to provide both export formats.
 *
 * Usage:
 *   <ExportButtonGroup data={rows} filename="contracts-2024" />
 *   <ExportButtonGroup data={rows} filename="vendors" showLabels />
 */
export function ExportButtonGroup({
  data,
  filename,
  columns,
  className,
  showLabels = false,
}: ExportButtonGroupProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className ?? ''}`}>
      <TableExportButton
        data={data}
        filename={filename}
        columns={columns}
        label={showLabels ? 'CSV' : undefined}
      />
      <JsonExportButton
        data={data}
        filename={filename}
        label={showLabels ? 'JSON' : undefined}
      />
    </div>
  )
}
