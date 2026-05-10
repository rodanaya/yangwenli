/**
 * StoryAdminSunburst — Editorial: where each president spent
 *
 * Sunburst showing how MXN 9.9T in federal procurement was distributed
 * across 5 administrations and 12 sectors. Inner ring = presidents,
 * outer ring = sector breakdown within each administration.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AdminSectorSunburst } from '@/components/charts/AdminSectorSunburst'

export function StoryAdminSunburst() {
  const { t } = useTranslation('storyCharts')
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('adminSunburst.kicker')}
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('adminSunburst.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('adminSunburst.lede')}
      </p>

      {/* Key comparison stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-text-muted pl-3 py-1">
          <div className="text-lg font-mono font-bold text-text-muted">{t('adminSunburst.stat1Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminSunburst.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-risk-high">{t('adminSunburst.stat2Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminSunburst.stat2Label')}
          </div>
        </div>
        <div className="border-l-2 border-pink-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-pink-400">{t('adminSunburst.stat3Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminSunburst.stat3Label')}
          </div>
        </div>
      </div>

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

      {/* Source */}
      <p className="text-[10px] text-text-muted">
        {t('adminSunburst.footer')}
      </p>
    </motion.div>
  )
}
