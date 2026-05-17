import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Activity, Landmark } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { PoliticalCycleResponse } from '@/api/types'
import { ScrollReveal } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialComposedChart, type ComposedLayer } from '@/components/charts/editorial'

export function PoliticalCycleView() {
  const { t } = useTranslation('administrations')
  const { data, isLoading, isError } = useQuery<PoliticalCycleResponse>({
    queryKey: ['political-cycle'],
    queryFn: () => analysisApi.getPoliticalCycle(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="card">
        <div className="pt-6 flex items-center gap-2 text-text-muted text-sm px-4 pb-3 bg-background-card">
          <AlertTriangle className="h-4 w-4 text-risk-high shrink-0" aria-hidden="true" />
          <span>{t('common.loadError', 'Political cycle data could not be loaded.')}</span>
        </div>
      </div>
    )
  }

  const election_year_effect = data.election_year_effect ?? {} as PoliticalCycleResponse['election_year_effect']
  const sexenio_year_breakdown = data.sexenio_year_breakdown ?? []

  const breakdownData = sexenio_year_breakdown.map((r) => ({
    label: r.label,
    avg_risk_pct: +(r.avg_risk * 100).toFixed(3),
    high_risk_pct: +r.high_risk_pct.toFixed(2),
    direct_award_pct: +r.direct_award_pct.toFixed(2),
    contracts: r.contracts,
  }))

  return (
    <div className="space-y-6">
      {/* Election Year Effect — 3 cards */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <h3 className="text-sm font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
            Election Year Effect
          </h3>
          <p className="text-xs text-text-muted">Average procurement risk in election vs non-election years (2002–2025)</p>
        </div>
        <div className="px-4 py-3 bg-background-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Election years card */}
            <div className="rounded-sm border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-[0.15em]">Election Years</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: RISK_COLORS.high }}
              >
                {((election_year_effect.election_year?.avg_risk ?? 0) * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-text-muted">avg risk score</div>
              <div className="text-xs font-mono text-text-secondary mt-2">
                DA: {(election_year_effect.election_year?.direct_award_pct ?? 0).toFixed(1)}%
                {' · '}
                High-Risk: {(election_year_effect.election_year?.high_risk_pct ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {formatNumber(election_year_effect.election_year?.contracts ?? 0)} contracts
              </div>
            </div>

            {/* Non-election years card */}
            <div className="rounded-sm border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-[0.15em]">Non-Election Years</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: RISK_COLORS.medium }}
              >
                {((election_year_effect.non_election_year?.avg_risk ?? 0) * 100).toFixed(2)}%
              </div>
              <div className="text-[11px] text-text-muted">avg risk score</div>
              <div className="text-xs font-mono text-text-secondary mt-2">
                DA: {(election_year_effect.non_election_year?.direct_award_pct ?? 0).toFixed(1)}%
                {' · '}
                High-Risk: {(election_year_effect.non_election_year?.high_risk_pct ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {formatNumber(election_year_effect.non_election_year?.contracts ?? 0)} contracts
              </div>
            </div>

            {/* Delta card */}
            <div className="rounded-sm border border-border/40 bg-background-elevated/20 p-4 text-center space-y-1">
              <div className="text-[11px] text-text-muted uppercase tracking-[0.15em]">Risk Delta</div>
              {election_year_effect.risk_delta !== undefined ? (
                <>
                  <div
                    className={cn(
                      'text-3xl font-bold font-mono',
                      election_year_effect.risk_delta > 0 ? 'text-risk-high' : 'text-risk-low',
                    )}
                  >
                    {election_year_effect.risk_delta > 0 ? '+' : ''}
                    {(election_year_effect.risk_delta * 100).toFixed(3)}pp
                  </div>
                  <div className="text-[11px] text-text-muted">election − non-election</div>
                  {election_year_effect.risk_delta_pct !== undefined && (
                    <div className="text-xs font-mono text-text-secondary mt-2">
                      {election_year_effect.risk_delta_pct > 0 ? '+' : ''}
                      {election_year_effect.risk_delta_pct.toFixed(1)}% relative
                    </div>
                  )}
                  <div className="text-[11px] text-text-muted mt-1">
                    {election_year_effect.risk_delta > 0
                      ? t('politicalView.higherInElection')
                      : election_year_effect.risk_delta < 0
                      ? t('politicalView.lowerInElection')
                      : t('politicalView.noSignificantDiff')}
                  </div>
                </>
              ) : (
                <div className="text-text-muted text-sm">{t('politicalView.insufficientData')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sexenio Year Breakdown Chart */}
      {breakdownData.length > 0 && (
        <ScrollReveal>
          <div className="card">
            <div className="px-4 py-3 border-b border-border/60 bg-background-card">
              <h3 className="text-sm font-mono flex items-center gap-2">
                <Landmark className="h-4 w-4 text-accent" />
                Sexenio Year Breakdown
              </h3>
              <p className="text-xs text-text-muted">
                Average procurement risk across Years 1–6 of the presidential term (all administrations pooled)
              </p>
            </div>
            <div className="px-4 py-3 bg-background-card">
              {(() => {
                type BreakdownRow = (typeof breakdownData)[number]
                const layers: ComposedLayer<BreakdownRow>[] = [
                  {
                    kind: 'line',
                    key: 'direct_award_pct',
                    label: 'Direct Award %',
                    colorToken: 'accent-data',
                    axis: 'right',
                  },
                ]
                return (
                  <EditorialComposedChart
                    data={breakdownData}
                    xKey="label"
                    layers={layers}
                    yFormat="pct"
                    rightYFormat="pct"
                    height={280}
                  />
                )
              })()}
              <p className="text-[11px] text-text-muted mt-2 font-mono">
                Year 1 = first year of administration, Year 6 = final year before election.
                Higher risk in late sexenio years may indicate &quot;budget dump&quot; spending.
              </p>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}
