/**
 * StorySectorParadox — story-context wrapper for SectorParadoxScatter.
 *
 * Scatter plot disproving "direct awards = corruption":
 * X = DA%, Y = High-Risk%, bubble size = total value.
 * Agricultura has 93% DA but only 2% high-risk.
 * Salud has 64% DA but 12.6% high-risk.
 * Static data embedded — no API required.
 */

import { motion } from 'framer-motion'
import { SectorParadoxScatter } from '@/components/charts/SectorParadoxScatter'

export function StorySectorParadox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        La paradoja: adjudicación directa ≠ riesgo de corrupción · 12 sectores 2002-2025
      </p>
      <SectorParadoxScatter />
    </motion.div>
  )
}
