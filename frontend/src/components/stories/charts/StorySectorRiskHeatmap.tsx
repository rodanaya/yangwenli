/**
 * StorySectorRiskHeatmap — editorial wrapper for SectorRiskHeatmap.
 *
 * 12 sectors x 24 years grid showing risk concentration across administrations.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { useTranslation } from 'react-i18next'
import { SectorRiskHeatmap } from '@/components/charts/SectorRiskHeatmap'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StorySectorRiskHeatmap() {
  const { t, i18n } = useTranslation('storyCharts')
  const lang = i18n.language
  const isES = lang === 'es'

  const stats = [
    {
      value: '0.42',
      label: isES ? 'Pico · Salud · AMLO 2020' : 'Peak · Salud · AMLO 2020',
      accent: RISK_COLORS.critical,
    },
    {
      value: isES ? 'Salud + Agricultura' : 'Salud + Agricultura',
      label: isES ? 'Clúster persistente AMLO–Sheinbaum' : 'Persistent AMLO–Sheinbaum cluster',
      accent: RISK_COLORS.high,
    },
  ]

  const finding = {
    label: isES ? 'HALLAZGO' : 'FINDING',
    body: isES
      ? 'El clúster de riesgo en Salud durante el sexenio de AMLO se sostiene en el primer año de Sheinbaum — pico de 0.42 en 2020 sin retorno a la línea base previa a COVID.'
      : 'The Salud risk cluster from the AMLO sexenio carries into Sheinbaum’s first year — peak 0.42 in 2020 with no return to the pre-COVID baseline.',
  }

  return (
    <EditorialChartFrame
      kicker={t('sectorRiskHeatmap.kicker')}
      headline={t('sectorRiskHeatmap.headline')}
      subline={t('sectorRiskHeatmap.subline')}
      stats={stats}
      finding={finding}
      footer={t('sectorRiskHeatmap.footer')}
    >
      <SectorRiskHeatmap />
    </EditorialChartFrame>
  )
}
