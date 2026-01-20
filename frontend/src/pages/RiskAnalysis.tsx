import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export function RiskAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Risk Analysis</h2>
        <p className="text-sm text-text-muted">Advanced risk analysis tools and visualizations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted">
            This page will include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            <li>Risk heatmap by sector and year</li>
            <li>Vendor network graph visualization</li>
            <li>Anomaly detection results</li>
            <li>Risk factor breakdown analysis</li>
            <li>Trend analysis and predictions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
