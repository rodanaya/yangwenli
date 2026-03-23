/**
 * StorySectorRiskHeatmap — story-context wrapper for SectorRiskHeatmap.
 *
 * 12 sectors × 24 years grid showing risk concentration across administrations.
 * Zero props — data fetched internally.
 */

import { motion } from 'framer-motion'
import { SectorRiskHeatmap } from '@/components/charts/SectorRiskHeatmap'

export function StorySectorRiskHeatmap() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Mapa de riesgo por sector y año · 12 sectores · 2002–2025
      </p>
      <SectorRiskHeatmap />
    </motion.div>
  )
}
