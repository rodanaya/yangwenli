/**
 * StorySectorRiskTrends — story-context wrapper for SectorRiskTrendPanel.
 *
 * Per-sector risk trend lines 2010–2025 with scandal reference lines.
 * Sector toggle checkboxes. Self-fetching — no props required.
 */

import { motion } from 'framer-motion'
import { SectorRiskTrendPanel } from '@/components/charts/SectorRiskTrendPanel'

export function StorySectorRiskTrends() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Tendencia de riesgo por sector 2010–2025 · escándalos anotados
      </p>
      <SectorRiskTrendPanel />
    </motion.div>
  )
}
