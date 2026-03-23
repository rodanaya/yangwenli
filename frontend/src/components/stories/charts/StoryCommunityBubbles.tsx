/**
 * StoryCommunityBubbles — story-context wrapper for CommunityBubbles.
 *
 * Packed bubble chart of detected vendor network communities.
 * Each bubble = one community cluster of co-bidders.
 * Size = total contract value. Color = avg risk score.
 * Self-fetching — no props required.
 */

import { motion } from 'framer-motion'
import { CommunityBubbles } from '@/components/charts/CommunityBubbles'

export function StoryCommunityBubbles() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Comunidades de proveedores vinculados · tamaño = valor · color = riesgo
      </p>
      <CommunityBubbles />
    </motion.div>
  )
}
