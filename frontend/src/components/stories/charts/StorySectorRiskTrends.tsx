/**
 * StorySectorRiskTrends — editorial wrapper for SectorRiskTrendPanel.
 *
 * Per-sector risk trend lines 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SectorRiskTrendPanel } from '@/components/charts/SectorRiskTrendPanel'

export function StorySectorRiskTrends() {
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
        {t('sectorRiskTrends.kicker')}
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        {t('sectorRiskTrends.headline')}
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        {t('sectorRiskTrends.subline')}
      </p>

      <SectorRiskTrendPanel />

      {/* Source */}
      <p className="text-[10px] text-text-muted mt-2 font-mono">
        {t('sectorRiskTrends.footer')}
      </p>
    </motion.div>
  )
}
