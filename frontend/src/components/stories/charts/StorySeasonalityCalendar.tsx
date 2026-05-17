/**
 * StorySeasonalityCalendar — Editorial: the December effect
 *
 * Wraps the SeasonalityCalendar radial bar chart with editorial context:
 * December risk is 64% higher than October baseline, and average contract
 * size spikes to MXN 4.87M — a pattern consistent across all 23 years.
 */

import { useTranslation } from 'react-i18next'
import { SeasonalityCalendar } from '@/components/charts/SeasonalityCalendar'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StorySeasonalityCalendar() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('seasonality.kicker')}
      headline={t('seasonality.headline')}
      lede={t('seasonality.lede')}
      stats={[
        { value: t('seasonality.stat1Value'), label: t('seasonality.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('seasonality.stat2Value'), label: t('seasonality.stat2Label'), accent: 'var(--color-risk-high)' },
      ]}
      footer={t('seasonality.footer')}
      tone="bare"
    >
      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <SeasonalityCalendar />
      </div>

      {/* OECD context */}
      <div className="rounded-sm border border-oecd/20 bg-oecd/5 p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-oecd)] mb-1">
          {t('seasonality.oecdLabel')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('seasonality.oecdBody')}
        </p>
      </div>
    </EditorialChartFrame>
  )
}
