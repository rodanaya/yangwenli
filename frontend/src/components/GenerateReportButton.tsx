import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportModal } from '@/components/ReportModal'

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

      <ReportModal
        reportType={reportType}
        entityId={entityId}
        entityName={entityName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

export default GenerateReportButton
