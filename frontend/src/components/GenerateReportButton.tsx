import { lazy, Suspense, useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ReportModal (308 LOC + PDF generation deps) only loads on first click.
const ReportModal = lazy(() =>
  import('@/components/ReportModal').then((m) => ({ default: m.ReportModal }))
)

interface GenerateReportButtonProps {
  reportType: 'vendor' | 'institution' | 'sector'
  entityId: number
  entityName: string
  variant?: 'default' | 'outline' | 'ghost'
}

export function GenerateReportButton({
  reportType,
  entityId,
  entityName,
  variant = 'outline',
}: GenerateReportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5 mr-1" />
        Generate Report
      </Button>

      {open && (
        <Suspense fallback={null}>
          <ReportModal
            reportType={reportType}
            entityId={entityId}
            entityName={entityName}
            open={open}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}

export default GenerateReportButton
