/**
 * AlertFeed — compact widget showing recent critical-risk contracts.
 * Fetches from GET /api/v1/alerts/feed and displays an investigation feed.
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { alertsApi } from '@/api/client'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { cn } from '@/lib/utils'

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'today'
  if (diff === 1) return '1d ago'
  return `${diff}d ago`
}

interface AlertFeedProps {
  days?: number
  limit?: number
  className?: string
}

export function AlertFeed({ days = 7, limit = 10, className }: AlertFeedProps) {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', 'feed', days, limit],
    queryFn: () => alertsApi.feed(days, limit),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const alerts = data?.alerts ?? []
  const total = data?.total ?? 0
  const criticalCount = alerts.filter(a => {
    const level = a.risk_score != null ? getRiskLevelFromScore(a.risk_score) : null
    return level === 'critical'
  }).length

  return (
    <div className={cn('w-full max-w-xs', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <div className="relative">
          <Bell className="h-4 w-4 text-text-muted" aria-hidden="true" />
          {criticalCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-risk-critical text-[9px] font-bold text-white">
              {criticalCount > 9 ? '9+' : criticalCount}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-text-primary">Recent Alerts</span>
        <span className="text-[10px] text-text-muted font-mono ml-auto">{total} total</span>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="space-y-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-shimmer" />
            ))}
          </div>
        )}

        {error && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">
            Failed to load alerts
          </div>
        )}

        {!isLoading && !error && alerts.length === 0 && (
          <div className="px-3 py-6 text-xs text-text-muted text-center">
            No critical alerts in the last {days} days
          </div>
        )}

        {!isLoading && !error && alerts.map((alert) => {
          const level = alert.risk_score != null ? getRiskLevelFromScore(alert.risk_score) : null
          const isCritical = level === 'critical'
          const color = level ? RISK_COLORS[level] : RISK_COLORS.low

          return (
            <button
              key={alert.contract_id}
              onClick={() => navigate(`/vendors/${alert.vendor_id}`)}
              className={cn(
                'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-background-elevated/60',
                isCritical && 'border-l-2 border-risk-critical animate-pulse-subtle'
              )}
              aria-label={`Alert: ${alert.vendor_name}, risk ${level}`}
            >
              {/* Risk badge */}
              <span
                className="mt-0.5 shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                style={{
                  backgroundColor: `${color}20`,
                  color,
                }}
              >
                {level}
              </span>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-text-primary truncate">
                  {alert.vendor_name ?? 'Unknown vendor'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {alert.amount_mxn != null && (
                    <span className="text-[10px] font-mono text-text-secondary">
                      {formatCompactMXN(alert.amount_mxn)}
                    </span>
                  )}
                  {alert.sector_name && (
                    <span className="text-[10px] text-text-muted truncate">
                      {alert.sector_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Time */}
              <span className="shrink-0 text-[10px] text-text-muted mt-0.5">
                {daysAgo(alert.contract_date)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="border-t border-border/40 px-3 py-2">
          <button
            onClick={() => navigate('/aria')}
            className="text-[11px] text-accent hover:text-accent-hover transition-colors font-medium"
          >
            View all investigations &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
