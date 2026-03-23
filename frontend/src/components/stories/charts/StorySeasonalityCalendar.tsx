/**
 * StorySeasonalityCalendar — story-context wrapper for SeasonalityCalendar.
 *
 * Radial bar chart revealing the December spending spike across 23 years.
 * Zero props — uses embedded static aggregate data.
 */

import { motion } from 'framer-motion'
import { SeasonalityCalendar } from '@/components/charts/SeasonalityCalendar'

export function StorySeasonalityCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        El efecto diciembre · patrón de gasto mensual 2002–2025
      </p>
      <SeasonalityCalendar />
    </motion.div>
  )
}
