/**
 * StoryAdminSunburst — Editorial: where each president spent
 *
 * Sunburst showing how MXN 9.9T in federal procurement was distributed
 * across 5 administrations and 12 sectors. Inner ring = presidents,
 * outer ring = sector breakdown within each administration.
 */

import { useTranslation } from 'react-i18next'
import { AdminSectorSunburst } from '@/components/charts/AdminSectorSunburst'
import { EditorialChartFrame } from '../EditorialChartFrame'

export function StoryAdminSunburst() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('adminSunburst.kicker')}
      headline={t('adminSunburst.headline')}
      lede={t('adminSunburst.lede')}
      stats={[
        { value: t('adminSunburst.stat1Value'), label: t('adminSunburst.stat1Label') },
        { value: t('adminSunburst.stat2Value'), label: t('adminSunburst.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: t('adminSunburst.stat3Value'), label: t('adminSunburst.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      footer={t('adminSunburst.footer')}
      tone="bare"
    >
      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4 flex justify-center">
        <AdminSectorSunburst />
      </div>

      {/* Reading guide */}
      <div className="rounded-sm border border-border bg-background-card p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted mb-1">
          {t('adminSunburst.readGuideLabel')}
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-secondary">{t('adminSunburst.readGuideInnerLabel')}</strong>{t('adminSunburst.readGuideInnerBody')}
          <strong className="text-text-secondary"> {t('adminSunburst.readGuideOuterLabel')}</strong>{t('adminSunburst.readGuideOuterBody')}
        </p>
      </div>
    </EditorialChartFrame>
  )
}
