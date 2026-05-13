/**
 * StorySectorRiskHeatmap — editorial wrapper for SectorRiskHeatmap.
 *
 * 12 sectors x 24 years grid showing risk concentration across administrations.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { useTranslation } from 'react-i18next'
import { SectorRiskHeatmap } from '@/components/charts/SectorRiskHeatmap'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StorySectorRiskHeatmap() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('sectorRiskHeatmap.kicker')}
      headline={t('sectorRiskHeatmap.headline')}
      subline={t('sectorRiskHeatmap.subline')}
      footer={t('sectorRiskHeatmap.footer')}
    >
      <SectorRiskHeatmap />
    </EditorialChartFrame>
  )
}
