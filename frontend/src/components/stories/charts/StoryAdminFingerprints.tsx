/**
 * StoryAdminFingerprints — Editorial: 5 presidents, 5 procurement styles
 *
 * Radar charts comparing procurement fingerprints across administrations.
 * Each president has a distinctive pattern: Pena Nieto spent the most but
 * had the lowest risk rate; AMLO had the highest direct award percentage;
 * Sheinbaum's early data shows the highest risk rate yet.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'

export function StoryAdminFingerprints() {
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
        {t('adminFingerprints.kicker')}
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('adminFingerprints.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('adminFingerprints.lede')}
      </p>

      {/* Key finding strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-text-muted pl-3 py-1">
          <div className="text-lg font-mono font-bold text-text-muted">{t('adminFingerprints.stat1Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminFingerprints.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-risk-high">{t('adminFingerprints.stat2Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminFingerprints.stat2Label')} · <span className="text-[color:var(--color-oecd)]">{t('adminFingerprints.stat2OecdNote')}</span>
          </div>
        </div>
        <div className="border-l-2 border-pink-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-pink-400">{t('adminFingerprints.stat3Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('adminFingerprints.stat3Label')}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <AdministrationFingerprints />
      </div>

      {/* Caveat + finding */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
            {t('adminFingerprints.findingLabel')}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t('adminFingerprints.findingBody')}
          </p>
        </div>
        <div className="rounded-sm border border-border bg-background-card p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-text-muted mb-1">
            {t('adminFingerprints.caveatLabel')}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t('adminFingerprints.caveatBody')}
          </p>
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-text-muted">
        {t('adminFingerprints.footer')}
      </p>
    </motion.div>
  )
}
