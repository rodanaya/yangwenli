/**
 * StorySectorRiskHeatmap — editorial wrapper for SectorRiskHeatmap.
 *
 * 12 sectors x 24 years grid showing risk concentration across administrations.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { motion } from 'framer-motion'
import { SectorRiskHeatmap } from '@/components/charts/SectorRiskHeatmap'

export function StorySectorRiskHeatmap() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-background-card rounded-sm p-4 border border-border"
    >
      {/* Editorial overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · 24-Year Risk Map
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        Risk concentrates in Salud and Agricultura during the AMLO sexenio
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        12 sectors · 2002-2025 · Cell intensity = avg risk score · 5 administrations
      </p>

      <SectorRiskHeatmap />

      {/* Source */}
      <p className="text-[10px] text-text-muted mt-2 font-mono">
        Source: COMPRANET 2002-2025 · RUBLI v0.6.5 · Administration boundaries from INE records
      </p>
    </motion.div>
  )
}
