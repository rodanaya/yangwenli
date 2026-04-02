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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full bg-zinc-900 rounded-xl p-4 border border-zinc-800"
    >
      {/* Editorial overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · 24-Year Risk Map
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        Risk concentrates in Salud and Agricultura during the AMLO sexenio
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        12 sectors · 2002-2025 · Cell intensity = avg risk score · 5 administrations
      </p>

      <SectorRiskHeatmap />

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2002-2025 · RUBLI v6.5 · Administration boundaries from INE records
      </p>
    </motion.div>
  )
}
