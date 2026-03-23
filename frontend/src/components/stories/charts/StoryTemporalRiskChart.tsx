/**
 * StoryTemporalRiskChart — story-context wrapper for TemporalRiskChart.
 *
 * Shows risk-score timeline 2010-2025 with scandal reference lines.
 * Zero props — data fetched internally via /analysis/year-over-year.
 */

import { motion } from 'framer-motion'
import { TemporalRiskChart } from '@/components/charts/TemporalRiskChart'

export function StoryTemporalRiskChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Evolución del riesgo de contratación pública · 2010–2025
      </p>
      <TemporalRiskChart />
    </motion.div>
  )
}
