import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange, PoliticalCycleResponse } from '@/api/types'
import { ScrollReveal } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS } from '@/lib/constants'
import {
  EditorialLineChart,
  EditorialComposedChart,
  type ChartAnnotation,
  type LineSeries,
  type ComposedLayer,
} from '@/components/charts/editorial'
import { DotStrip } from '@/components/charts/DotStrip'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'

export interface PatternsViewProps {
  yoyData: YearOverYearChange[]
  allTimeAvg: { da: number; sb: number; hr: number; risk: number }
  isLoading: boolean
}

const transitionYears = [2006, 2012, 2018, 2024]
const adminLabels: Record<number, string> = {
  2006: 'Calderon',
  2012: 'Peña',
  2018: 'AMLO',
  2024: 'Sheinbaum',
}

export function PatternsView({ yoyData, allTimeAvg, isLoading }: PatternsViewProps) {
  const { t } = useTranslation('administrations')
  const systemicChartRef = useRef<HTMLDivElement>(null)
  const { data: breaksData } = useQuery({
    queryKey: ['analysis', 'structural-breaks'],
    queryFn: () => analysisApi.getStructuralBreaks(),
    staleTime: 60 * 60 * 1000,
  })

  const { data: politicalData } = useQuery({
    queryKey: ['analysis', 'political-cycle'],
    queryFn: () => analysisApi.getPoliticalCycle(),
    staleTime: 6 * 60 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const daVsOECD = allTimeAvg.da - 25
  const maxDA = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.direct_award_pct), 0) : 0
  const maxSB = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.single_bid_pct), 0) : 0
  const maxHR = yoyData.length > 0 ? Math.max(...yoyData.map(y => y.high_risk_pct), 0) : 0
  const peakDAYear = yoyData.find(y => y.direct_award_pct === maxDA)?.year

  return (
    <div className="space-y-4">
      {/* Systemic pattern summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScrollReveal delay={0} direction="up">
        <div className="card">
          <div className="p-4 bg-background-card">
            <div className="text-xs font-mono text-text-muted uppercase tracking-[0.15em] mb-1">{t('patternsView.directAwardCard')}</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.da > 50 ? 'text-risk-critical' : allTimeAvg.da > 30 ? 'text-risk-high' : 'text-risk-medium')}>
              {allTimeAvg.da.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              {t('patternsView.directAwardDesc')}
              {daVsOECD > 0 && (
                <span className="ml-1 text-risk-high">{t('patternsView.directAwardAboveBenchmark', { val: daVsOECD.toFixed(1) })}</span>
              )}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {peakDAYear
                ? t('patternsView.directAwardPeak', { val: maxDA.toFixed(1), year: peakDAYear })
                : `${maxDA.toFixed(1)}%`}
            </div>
          </div>
        </div>
        </ScrollReveal>

        <ScrollReveal delay={80} direction="up">
        <div className="card">
          <div className="p-4 bg-background-card">
            <div className="text-xs font-mono text-text-muted uppercase tracking-[0.15em] mb-1">{t('patternsView.singleBidCard')}</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.sb > 30 ? 'text-risk-critical' : allTimeAvg.sb > 15 ? 'text-risk-high' : 'text-risk-medium')}>
              {allTimeAvg.sb.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              {t('patternsView.singleBidDesc')}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('patternsView.singleBidPeak', { maxSB: maxSB.toFixed(1), maxHR: maxHR.toFixed(1) })}
            </div>
          </div>
        </div>
        </ScrollReveal>

        <ScrollReveal delay={160} direction="up">
        <div className="card">
          <div className="p-4 bg-background-card">
            <div className="text-xs font-mono text-text-muted uppercase tracking-[0.15em] mb-1">{t('patternsView.highRiskCard')}</div>
            <div className={cn('text-2xl font-bold font-mono', allTimeAvg.hr > 15 ? 'text-risk-critical' : allTimeAvg.hr > 8 ? 'text-risk-high' : 'text-risk-low')}>
              {allTimeAvg.hr.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-text-muted leading-relaxed">
              {t('patternsView.highRiskDesc')}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {t('patternsView.highRiskAvg', { val: (allTimeAvg.risk * 100).toFixed(1) })}
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>

      {/* 23-year trend chart */}
      <ScrollReveal direction="fade">
      <div className="card">
        <div className="px-4 py-3 border-b border-border/60 bg-background-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono text-text-primary">
              {t('patternsView.chartTitle')}
            </h3>
            <ChartDownloadButton targetRef={systemicChartRef} filename="systemic-patterns-23yr" />
          </div>
        </div>
        <div className="px-4 py-3 bg-background-card">
          {yoyData.length > 0 ? (
            <div ref={systemicChartRef}>
              {(() => {
                const annotations: ChartAnnotation[] = [
                  { kind: 'band', x1: 2002, x2: 2006, label: 'Fox · PAN', tone: 'admin' },
                  { kind: 'band', x1: 2006, x2: 2012, label: 'Calderón · PAN', tone: 'admin' },
                  { kind: 'band', x1: 2012, x2: 2018, label: 'EPN · PRI', tone: 'admin' },
                  { kind: 'band', x1: 2018, x2: 2024, label: 'AMLO · MORENA', tone: 'admin' },
                  { kind: 'band', x1: 2024, x2: 2026, label: 'Sheinbaum · MORENA', tone: 'admin' },
                  { kind: 'hrule', y: 78, label: t('patternsView.nationalAvgLabel'), tone: 'oecd' },
                  ...transitionYears.map<ChartAnnotation>((year) => ({
                    kind: 'vrule', x: year, label: adminLabels[year] ?? '', tone: 'info',
                  })),
                  ...((breaksData?.breakpoints ?? [])
                    .filter((bp, i, arr) => arr.findIndex(b => b.year === bp.year) === i)
                    .map<ChartAnnotation>((bp) => ({
                      kind: 'vrule', x: bp.year, label: `~${bp.year}`, tone: 'warn',
                    }))),
                ]
                const seriesData = yoyData.map((r) => ({
                  ...r,
                  avg_risk_x100: (r.avg_risk ?? 0) * 100,
                }))
                const series: LineSeries<typeof seriesData[number]>[] = [
                  { key: 'direct_award_pct', label: 'Direct Award %', colorToken: 'accent-data' },
                  { key: 'single_bid_pct', label: 'Single Bid %', colorToken: 'risk-high' },
                  { key: 'high_risk_pct', label: 'High Risk %', colorToken: 'risk-critical' },
                  { key: 'avg_risk_x100', label: 'Avg Risk ×100', colorToken: 'sector-tecnologia', style: 'dashed', emphasis: 'secondary' },
                ]
                return (
                  <EditorialLineChart
                    data={seriesData}
                    xKey="year"
                    series={series}
                    yFormat="pct"
                    yDomain={[0, 100]}
                    annotations={annotations}
                    height={360}
                  />
                )
              })()}
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-text-muted text-sm">
              {t('patternsView.noData')}
            </div>
          )}
          <p className="mt-3 text-xs text-text-muted leading-relaxed">
            {t('patternsView.chartFootnote')}
          </p>
          {breaksData?.breakpoints && breaksData.breakpoints.length > 0 && (
            <p className="text-[10px] text-risk-high/80 font-mono mt-1">
              <Activity className="inline-block h-3 w-3 mr-0.5 align-text-bottom" /> {t('patternsView.regimeShiftNote')}
            </p>
          )}
        </div>
      </div>
      </ScrollReveal>

      {/* Political Budget Cycle — sexenio-year breakdown */}
      {politicalData && (politicalData.sexenio_year_breakdown?.length ?? 0) > 0 && (
        <ScrollReveal direction="fade">
        <div className="card">
          <div className="px-4 py-3 border-b border-border/60 bg-background-card">
            <h3 className="text-sm font-mono text-text-primary">
              {t('patternsView.politicalCycleTitle')}
            </h3>
          </div>
          <div className="px-4 py-3 bg-background-card">
            <div className="mb-3 text-xs text-text-muted leading-relaxed">
              {t('patternsView.politicalCycleDesc')}
            </div>
            {(() => {
              type SexenioRow = NonNullable<PoliticalCycleResponse['sexenio_year_breakdown']>[number]
              const layers: ComposedLayer<SexenioRow>[] = [
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
                  data={politicalData.sexenio_year_breakdown}
                  xKey="label"
                  layers={layers}
                  yFormat="pct"
                  rightYFormat="pct"
                  yDomain={[0, 12]}
                  rightYDomain={[60, 85]}
                  height={220}
                />
              )
            })()}
            <div className="mt-3">
              <DotStrip
                data={(politicalData.sexenio_year_breakdown ?? []).map((r) => ({
                  label: r.label,
                  value: +r.high_risk_pct.toFixed(2),
                  color: RISK_COLORS.high,
                }))}
                formatVal={(v) => `${v.toFixed(1)}%`}
              />
              <p className="text-[10px] text-text-muted font-mono mt-1">High Risk % por año del sexenio</p>
            </div>
            {politicalData.election_year_effect?.risk_delta !== undefined && (
              <p className="mt-2 text-[11px] text-text-muted font-mono">
                {t('patternsView.electionYearAvgNote', {
                  election: ((politicalData.election_year_effect?.election_year?.avg_risk ?? 0) * 100).toFixed(2),
                  nonElection: ((politicalData.election_year_effect?.non_election_year?.avg_risk ?? 0) * 100).toFixed(2),
                })}
                {' ('}
                <span className={(politicalData.election_year_effect?.risk_delta ?? 0) > 0 ? 'text-risk-high' : 'text-risk-low'}>
                  {(politicalData.election_year_effect?.risk_delta ?? 0) > 0 ? '+' : ''}{((politicalData.election_year_effect?.risk_delta ?? 0) * 100).toFixed(3)}pp
                </span>
                {')'}
              </p>
            )}
          </div>
        </div>
        </ScrollReveal>
      )}
    </div>
  )
}
