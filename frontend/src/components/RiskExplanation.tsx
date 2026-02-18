/**
 * Visual breakdown of v5.0 risk score feature contributions.
 * Shows horizontal bars for each z-score feature's impact on the risk score.
 */

import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/api/client'
import type { RiskFeatureContribution } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp, Brain } from 'lucide-react'
import { useState } from 'react'

interface RiskExplanationProps {
  contractId: number
  compact?: boolean
}

export function RiskExplanationPanel({ contractId, compact = false }: RiskExplanationProps) {
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['risk-explain', contractId],
    queryFn: () => contractApi.getRiskExplanation(contractId),
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    )
  }

  if (error || !data || !data.explanation_available) {
    return null
  }

  // Only show features with non-zero contribution
  const activeFeatures = data.features.filter(f => Math.abs(f.contribution) > 0.001)
  const displayFeatures = expanded ? activeFeatures : activeFeatures.slice(0, compact ? 3 : 5)
  const hasMore = activeFeatures.length > displayFeatures.length

  // Find max absolute contribution for scaling bars
  const maxContrib = Math.max(...activeFeatures.map(f => Math.abs(f.contribution)), 0.01)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors w-full"
      >
        <Brain className="h-3 w-3" aria-hidden="true" />
        <span>Why This Score</span>
        <span className="text-xs font-normal normal-case tracking-normal text-text-secondary ml-1">
          {data.model_type === 'sector' ? 'sector model' : 'global model'} {data.model_version}
        </span>
        {hasMore && !expanded ? (
          <ChevronDown className="h-3 w-3 ml-auto" />
        ) : activeFeatures.length > (compact ? 3 : 5) ? (
          <ChevronUp className="h-3 w-3 ml-auto" />
        ) : null}
      </button>

      <div className="space-y-1">
        {displayFeatures.map((feature) => (
          <FeatureBar
            key={feature.feature}
            feature={feature}
            maxContrib={maxContrib}
          />
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-accent hover:underline"
        >
          +{activeFeatures.length - displayFeatures.length} more factors
        </button>
      )}
    </div>
  )
}

function FeatureBar({ feature, maxContrib }: {
  feature: RiskFeatureContribution
  maxContrib: number
}) {
  const isPositive = feature.contribution > 0
  const barWidth = Math.min(Math.abs(feature.contribution) / maxContrib * 100, 100)

  return (
    <div className="group flex items-center gap-2 text-xs">
      <span className="w-[120px] truncate text-text-secondary text-xs shrink-0" title={feature.label}>
        {feature.label}
      </span>

      <div className="flex-1 flex items-center h-4 relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50" />

        {/* Bar */}
        {isPositive ? (
          <div className="absolute left-1/2 h-2.5 rounded-r-sm bg-risk-critical/60"
            style={{ width: `${barWidth / 2}%` }}
          />
        ) : (
          <div className="absolute right-1/2 h-2.5 rounded-l-sm bg-risk-low/60"
            style={{ width: `${barWidth / 2}%` }}
          />
        )}
      </div>

      <span className={`w-[52px] text-right tabular-nums text-xs shrink-0 font-mono ${
        isPositive ? 'text-risk-critical' : 'text-risk-low'
      }`}>
        {isPositive ? '+' : ''}{feature.contribution.toFixed(2)}
      </span>

      {/* Tooltip on hover */}
      <span className="hidden group-hover:block absolute left-0 -top-6 bg-background-elevated border border-border rounded px-2 py-0.5 text-xs text-text-muted shadow-md z-10 whitespace-nowrap">
        z={feature.z_score.toFixed(2)} x {feature.coefficient.toFixed(3)}
      </span>
    </div>
  )
}
