/**
 * StoryAdminFingerprints — Editorial: 5 presidents, 5 procurement styles
 *
 * Radar charts comparing procurement fingerprints across administrations.
 * Fetches live YOY data so fingerprints match the current model version.
 */

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Suspense, useMemo } from 'react'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'
import { EditorialChartFrame } from '../EditorialChartFrame'
import { analysisApi } from '@/api/client'
import { ADMINISTRATIONS } from '@/components/administrations/data'
import type { AdminAgg } from '@/components/administrations/types'
import type { YearOverYearChange } from '@/api/types'

function aggregateByAdmin(yoyData: YearOverYearChange[]): AdminAgg[] {
  return ADMINISTRATIONS.map((admin) => {
    const years = yoyData.filter((y) => y.year >= admin.dataStart && y.year < admin.end)
    const totalContracts = years.reduce((s, y) => s + y.contracts, 0)
    const totalValue = years.reduce((s, y) => s + y.total_value, 0)
    const yearCount = years.length || 1
    const wRisk = totalContracts > 0 ? years.reduce((s, y) => s + y.avg_risk * y.contracts, 0) / totalContracts : 0
    const wDA   = totalContracts > 0 ? years.reduce((s, y) => s + y.direct_award_pct * y.contracts, 0) / totalContracts : 0
    const wSB   = totalContracts > 0 ? years.reduce((s, y) => s + y.single_bid_pct * y.contracts, 0) / totalContracts : 0
    const wHR   = totalContracts > 0 ? years.reduce((s, y) => s + y.high_risk_pct * y.contracts, 0) / totalContracts : 0
    return {
      name: admin.name,
      contracts: totalContracts,
      totalValue,
      avgRisk: wRisk,
      directAwardPct: wDA,
      singleBidPct: wSB,
      highRiskPct: wHR,
      valueAtRisk: totalValue * wHR / 100,
      vendorCount: 0,
      institutionCount: 0,
      years,
      contractsPerYear: totalContracts / yearCount,
      valuePerYear: totalValue / yearCount,
      yearCount,
    }
  })
}

function FingerprintsWithData() {
  const { data: yoyResp } = useQuery({
    queryKey: ['analysis', 'yoy'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 60 * 60 * 1000,
  })

  const adminAggs = useMemo(
    () => aggregateByAdmin(yoyResp?.data ?? []),
    [yoyResp],
  )

  return <AdministrationFingerprints adminAggs={adminAggs} />
}

export function StoryAdminFingerprints() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('adminFingerprints.kicker')}
      headline={t('adminFingerprints.headline')}
      lede={t('adminFingerprints.lede')}
      stats={[
        { value: t('adminFingerprints.stat1Value'), label: t('adminFingerprints.stat1Label') },
        { value: t('adminFingerprints.stat2Value'), label: `${t('adminFingerprints.stat2Label')} · ${t('adminFingerprints.stat2OecdNote')}`, accent: 'var(--color-oecd)' },
        { value: t('adminFingerprints.stat3Value'), label: t('adminFingerprints.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('adminFingerprints.findingLabel'), body: t('adminFingerprints.findingBody') }}
      footer={t('adminFingerprints.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <Suspense fallback={<div className="h-[420px] bg-background-card animate-pulse rounded-sm" />}>
          <FingerprintsWithData />
        </Suspense>
      </div>

      <div className="rounded-sm border border-border bg-background-card p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-text-muted mb-1">
          {t('adminFingerprints.caveatLabel')}
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('adminFingerprints.caveatBody')}
        </p>
      </div>
    </EditorialChartFrame>
  )
}
