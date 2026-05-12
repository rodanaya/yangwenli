/**
 * StorySeasonalityCalendar — Editorial: the December effect
 *
 * Wraps the SeasonalityCalendar radial bar chart with editorial context:
 * December risk is 64% higher than October baseline, and average contract
 * size spikes to MXN 4.87M — a pattern consistent across all 23 years.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SeasonalityCalendar } from '@/components/charts/SeasonalityCalendar'

export function StorySeasonalityCalendar() {
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
        {t('seasonality.kicker')}
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('seasonality.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('seasonality.lede')}
      </p>

      {/* Two stat callouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-critical">{t('seasonality.stat1Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('seasonality.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-high">{t('seasonality.stat2Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('seasonality.stat2Label')}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <SeasonalityCalendar />
      </div>

      {/* OECD context */}
      <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-oecd)] mb-1">
          {t('seasonality.oecdLabel')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('seasonality.oecdBody')}
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-text-muted">
        {t('seasonality.footer')}
      </p>
    </motion.div>
  )
}
