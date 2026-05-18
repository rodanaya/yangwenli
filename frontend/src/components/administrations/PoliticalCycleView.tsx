import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Landmark } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { PoliticalCycleResponse } from '@/api/types'
import { ScrollReveal } from '@/hooks/useAnimations'
import { Skeleton } from '@/components/ui/skeleton'
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

  {/* Election Year Effect note removed (M7): null finding 23.34% vs 23.46% */}
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
