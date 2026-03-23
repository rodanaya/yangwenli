/**
 * StoryRiskCalendar — story-context wrapper for RiskCalendarHeatmap.
 *
 * GitHub-style grid: rows = years (2016–2025), cells = months.
 * Color intensity = average risk score. Shows December spikes
 * and suspicious procurement periods. Self-fetching.
 */

import { motion } from 'framer-motion'
import { RiskCalendarHeatmap } from '@/components/charts/RiskCalendarHeatmap'

export function StoryRiskCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Mapa de riesgo mensual 2016–2025 · diciembre = rojo permanente
      </p>
      <RiskCalendarHeatmap />
    </motion.div>
  )
}
