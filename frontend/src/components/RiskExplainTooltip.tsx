/**
 * RiskExplainTooltip — hover a risk badge to see top contributing z-score features
 * Uses /api/v1/contracts/{id}/risk-explanation (RiskExplanation type)
 */
import * as Tooltip from '@radix-ui/react-tooltip'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { RiskExplanation } from '@/api/types'

interface Props {
  contractId: number
  riskScore: number
  riskLevel: string
  children: React.ReactNode
}

async function fetchRiskExplanation(contractId: number): Promise<RiskExplanation> {
  const { data } = await api.get<RiskExplanation>(`/contracts/${contractId}/risk-explanation`)
  return data
}

export function RiskExplainTooltip({ contractId, riskScore, riskLevel, children }: Props) {
  const { data } = useQuery({
    queryKey: ['contract-risk-explanation', contractId],
    queryFn: () => fetchRiskExplanation(contractId),
    staleTime: Infinity,
    enabled: !!contractId,
  })

  // Use top 3 features sorted by absolute contribution
  const topFeatures = (data?.features ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)

  const direction = (contribution: number) => (contribution > 0 ? 'high_risk' : 'low_risk')

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-lg border border-border bg-background-card p-3 shadow-xl"
            sideOffset={4}
          >
            <div className="text-xs font-semibold text-text-primary mb-2">
              Risk Score: {(riskScore * 100).toFixed(0)}% —{' '}
              <span className="capitalize">{riskLevel}</span>
            </div>
            {topFeatures.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs text-text-muted mb-1">Top risk drivers:</div>
                {topFeatures.map((f) => {
                  const dir = direction(f.contribution)
                  return (
                    <div key={f.feature} className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          dir === 'high_risk' ? 'bg-red-400' : 'bg-green-400'
                        }`}
                      />
                      <span className="text-xs text-text-secondary flex-1 truncate">{f.label}</span>
                      <span
                        className={`ml-auto text-xs font-mono ${
                          dir === 'high_risk' ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {f.z_score > 0 ? '+' : ''}
                        {f.z_score.toFixed(1)}σ
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-text-muted">Feature breakdown not available</div>
            )}
            <Tooltip.Arrow className="fill-background-card" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
