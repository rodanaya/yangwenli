/**
 * StoryTemporalRiskChart — editorial wrapper for TemporalRiskChart.
 *
 * Shows risk-score timeline 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with overline, headline, and context.
 */

import { useTranslation } from 'react-i18next'
import { TemporalRiskChart } from '@/components/charts/TemporalRiskChart'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StoryTemporalRiskChart() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('temporalRisk.kicker')}
      headline={t('temporalRisk.headline')}
      subline={t('temporalRisk.subline')}
      footer={t('temporalRisk.footer')}
    >
      <TemporalRiskChart
        title=""
        showScandals={true}
        height={320}
      />
    </EditorialChartFrame>
  )
}
