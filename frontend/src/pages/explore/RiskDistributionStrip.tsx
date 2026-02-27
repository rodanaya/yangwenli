import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const RISK_LEVELS = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

interface RiskDistributionStripProps {
  activeRiskLevels: string[]
  onToggleRisk: (level: string) => void
}

export function RiskDistributionStrip({ activeRiskLevels, onToggleRisk }: RiskDistributionStripProps) {
  const { data } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const riskDist = data?.risk_distribution

  return (
    <div>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Risk Level</div>
      <div className="flex gap-2 flex-wrap">
        {RISK_LEVELS.map(r => {
          const stat = riskDist?.find(d => d.risk_level === r.key)
          const pct = stat?.percentage ?? 0
          const isActive = activeRiskLevels.includes(r.key)
          const color = RISK_COLORS[r.key]
          return (
            <button
              key={r.key}
              onClick={() => onToggleRisk(r.key)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                isActive
                  ? 'border-transparent'
                  : 'border-border/30 opacity-40 grayscale'
              )}
              style={isActive ? { backgroundColor: `${color}18`, borderColor: `${color}50` } : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium" style={{ color: isActive ? color : undefined }}>
                {r.label}
              </span>
              {stat && (
                <span className="text-xs text-text-muted font-mono">
                  {pct.toFixed(1)}%
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
