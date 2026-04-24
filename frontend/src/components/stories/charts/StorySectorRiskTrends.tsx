/**
 * StorySectorRiskTrends — editorial wrapper for SectorRiskTrendPanel.
 *
 * Per-sector risk trend lines 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with finding headline.
 */

import { motion } from 'framer-motion'
import { SectorRiskTrendPanel } from '@/components/charts/SectorRiskTrendPanel'

export function StorySectorRiskTrends() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-background-card rounded-sm p-4 border border-border"
    >
      {/* Editorial overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Sector Trajectories
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        Agriculture risk doubled after Segalmex — Salud spiked during COVID and stayed elevated
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        High-risk rate per sector · 2010-2025 · Toggle sectors to compare
      </p>

      <SectorRiskTrendPanel />

      {/* Source */}
      <p className="text-[10px] text-text-muted mt-2 font-mono">
        Source: COMPRANET 2010-2025 · RUBLI v0.6.5 per-sector models · Scandal dates from public record
      </p>
    </motion.div>
  )
}
