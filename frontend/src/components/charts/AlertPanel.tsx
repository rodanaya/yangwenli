/**
 * Alert Panel Component
 * Shows top anomalies requiring attention
 */

import { memo } from 'react'
import { AlertTriangle, AlertOctagon, AlertCircle, Info, ExternalLink } from 'lucide-react'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { AnomalyItem } from '@/api/types'

interface AlertPanelProps {
  anomalies: AnomalyItem[]
  maxItems?: number
  onInvestigate?: (anomaly: AnomalyItem) => void
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertOctagon,
    className: 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical',
    iconClassName: 'text-risk-critical',
  },
  high: {
    icon: AlertTriangle,
    className: 'bg-risk-high/10 border-risk-high/30 text-risk-high',
    iconClassName: 'text-risk-high',
  },
  medium: {
    icon: AlertCircle,
    className: 'bg-risk-medium/10 border-risk-medium/30 text-risk-medium',
    iconClassName: 'text-risk-medium',
  },
  low: {
    icon: Info,
    className: 'bg-risk-low/10 border-risk-low/30 text-risk-low',
    iconClassName: 'text-risk-low',
  },
}

export const AlertPanel = memo(function AlertPanel({
  anomalies,
  maxItems = 5,
  onInvestigate,
}: AlertPanelProps) {
  const displayedAnomalies = anomalies.slice(0, maxItems)

  if (displayedAnomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-muted">
        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No anomalies detected</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayedAnomalies.map((anomaly, index) => {
        const config = SEVERITY_CONFIG[anomaly.severity]
        const Icon = config.icon

        return (
          <div
            key={`${anomaly.anomaly_type}-${index}`}
            className={`rounded-lg border p-3 ${config.className} animate-fade-in`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${config.iconClassName}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide opacity-75">
                    {anomaly.severity}
                  </span>
                  <span className="text-xs opacity-50">|</span>
                  <span className="text-xs opacity-75">{anomaly.anomaly_type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm font-medium text-text-primary">{anomaly.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span>
                    <strong>{formatNumber(anomaly.affected_contracts)}</strong> contracts
                  </span>
                  <span>
                    <strong>{formatCompactMXN(anomaly.affected_value_mxn)}</strong> at risk
                  </span>
                </div>
              </div>
              {onInvestigate && (
                <button
                  onClick={() => onInvestigate(anomaly)}
                  className="flex-shrink-0 p-1.5 rounded hover:bg-background-elevated transition-colors"
                  title="Investigate"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {anomalies.length > maxItems && (
        <p className="text-xs text-text-muted text-center pt-2">
          +{anomalies.length - maxItems} more anomalies
        </p>
      )}
    </div>
  )
})

export default AlertPanel
