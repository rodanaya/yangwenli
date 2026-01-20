import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Users, Building2 } from 'lucide-react'

export function Export() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Export Data</h2>
        <p className="text-sm text-text-muted">Download procurement data in various formats</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          title="Contracts"
          description="Export contract data with risk scores and classifications"
          icon={FileText}
          formats={['CSV', 'Excel', 'JSON']}
        />
        <ExportCard
          title="Vendors"
          description="Export vendor profiles with risk metrics and classifications"
          icon={Users}
          formats={['CSV', 'Excel', 'JSON']}
        />
        <ExportCard
          title="Institutions"
          description="Export institution data with spending analysis"
          icon={Building2}
          formats={['CSV', 'Excel', 'JSON']}
        />
      </div>
    </div>
  )
}

interface ExportCardProps {
  title: string
  description: string
  icon: React.ElementType
  formats: string[]
}

function ExportCard({ title, description, icon: Icon, formats }: ExportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-muted mb-4">{description}</p>
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <Button key={format} variant="outline" size="sm">
              <Download className="mr-2 h-3 w-3" />
              {format}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
