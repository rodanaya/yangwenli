/**
 * StoryAdminFingerprints — story-context wrapper for AdministrationFingerprints.
 *
 * Radar chart comparing procurement fingerprints across 5 administrations
 * (Fox, Calderón, Peña Nieto, AMLO, Sheinbaum).
 * Static data embedded — no API required.
 */

import { motion } from 'framer-motion'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'

export function StoryAdminFingerprints() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Huella de contratación por sexenio · Fox → Sheinbaum · modelo v6.4
      </p>
      <AdministrationFingerprints />
    </motion.div>
  )
}
