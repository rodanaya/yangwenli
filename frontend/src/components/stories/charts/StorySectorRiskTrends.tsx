/**
 * StorySectorRiskTrends — editorial wrapper for SectorRiskTrendPanel.
 *
 * Per-sector risk trend lines 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { useTranslation } from 'react-i18next'
import { SectorRiskTrendPanel } from '@/components/charts/SectorRiskTrendPanel'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StorySectorRiskTrends() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('sectorRiskTrends.kicker')}
      headline={t('sectorRiskTrends.headline')}
      subline={t('sectorRiskTrends.subline')}
      footer={t('sectorRiskTrends.footer')}
    >
      <SectorRiskTrendPanel />
    </EditorialChartFrame>
  )
}
