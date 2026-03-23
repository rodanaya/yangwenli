/**
 * StoryRacingBar — story-context wrapper for RacingBarChart.
 *
 * Animated racing bar chart showing sector spending 2002→2025.
 * Bars race year-by-year across 5 presidential administrations.
 * Self-fetching — no props required.
 */

import { motion } from 'framer-motion'
import { RacingBarChart } from '@/components/charts/RacingBarChart'

export function StoryRacingBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Gasto federal por sector 2002–2025 · carrera animada · 5 sexenios
      </p>
      <RacingBarChart />
    </motion.div>
  )
}
