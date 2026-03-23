/**
 * StoryRiskPyramid — story-context wrapper for RiskPyramid.
 *
 * Mirrored bar chart: left = contract count by risk level,
 * right = contract value. Reveals that critical-risk contracts
 * (6.1% of count) hold 41.8% of total procurement value.
 * Static data embedded — no API required.
 */

import { motion } from 'framer-motion'
import { RiskPyramid } from '@/components/charts/RiskPyramid'

export function StoryRiskPyramid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Pirámide de riesgo · contratos vs valor · 3.05M contratos 2002-2025
      </p>
      <RiskPyramid />
    </motion.div>
  )
}
