/**
 * StoryTemporalRiskChart — editorial wrapper for TemporalRiskChart.
 *
 * Shows risk-score timeline 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with overline, headline, and context.
 */

import { useTranslation } from 'react-i18next'
import { TemporalRiskChart } from '@/components/charts/TemporalRiskChart'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StoryTemporalRiskChart() {
  const { t, i18n } = useTranslation('storyCharts')
  const isES = i18n.language === 'es'

  const stats = [
    {
      value: '13.8%',
      label: isES ? 'Pico de alto riesgo · 2020' : 'Peak high-risk rate · 2020',
      accent: RISK_COLORS.critical,
    },
    {
      value: '0.29',
      label: isES ? 'Puntaje promedio · 2020' : 'Avg risk score · 2020',
      accent: RISK_COLORS.high,
    },
  ]

  const finding = {
    label: isES ? 'HALLAZGO' : 'FINDING',
    body: isES
      ? 'COVID-19 elevó la tasa de alto riesgo de 10.5% a 13.8% en un solo año — y aunque bajó después, nunca regresó al nivel pre-pandemia.'
      : 'COVID-19 pushed the high-risk rate from 10.5% to 13.8% in a single year — and although it eased after, it never returned to the pre-pandemic baseline.',
  }

  return (
    <EditorialChartFrame
      kicker={t('temporalRisk.kicker')}
      headline={t('temporalRisk.headline')}
      subline={t('temporalRisk.subline')}
      stats={stats}
      finding={finding}
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
