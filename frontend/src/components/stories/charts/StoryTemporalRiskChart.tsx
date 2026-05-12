/**
 * StoryTemporalRiskChart — editorial wrapper for TemporalRiskChart.
 *
 * Shows risk-score timeline 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with overline, headline, and context.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TemporalRiskChart } from '@/components/charts/TemporalRiskChart'

export function StoryTemporalRiskChart() {
  const { t } = useTranslation('storyCharts')
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-background-card rounded-sm p-4 border border-border"
    >
      {/* Editorial overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        {t('temporalRisk.kicker')}
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        {t('temporalRisk.headline')}
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        {t('temporalRisk.subline')}
      </p>

      <TemporalRiskChart
        title=""
        showScandals={true}
        height={320}
      />

      {/* Source */}
      <p className="text-[10px] text-text-muted mt-2 font-mono">
        {t('temporalRisk.footer')}
      </p>
    </motion.div>
  )
}
