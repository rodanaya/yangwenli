/**
 * StoryAdminFingerprints — Editorial: 5 presidents, 5 procurement styles
 *
 * Radar charts comparing procurement fingerprints across administrations.
 * Each president has a distinctive pattern: Pena Nieto spent the most but
 * had the lowest risk rate; AMLO had the highest direct award percentage;
 * Sheinbaum's early data shows the highest risk rate yet.
 */

import { useTranslation } from 'react-i18next'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'
import { EditorialChartFrame } from '../EditorialChartFrame'

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
      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <AdministrationFingerprints />
      </div>

      {/* Caveat */}
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
