/**
 * StoryAdminSunburst — story-context wrapper for AdminSectorSunburst.
 *
 * Radial spending fingerprint: inner ring = 5 administrations,
 * outer ring = 12 sectors sized by spending under each admin.
 * Self-fetching — no props required.
 */

import { motion } from 'framer-motion'
import { AdminSectorSunburst } from '@/components/charts/AdminSectorSunburst'

export function StoryAdminSunburst() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Huella presupuestal por administración · 5 sexenios · 12 sectores
      </p>
      <AdminSectorSunburst />
    </motion.div>
  )
}
