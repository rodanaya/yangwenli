/**
 * StoryTemporalRiskChart — editorial wrapper for TemporalRiskChart.
 *
 * Shows risk-score timeline 2010-2025 with scandal reference lines.
 * Dark zinc-900 editorial framing with overline, headline, and context.
 */

import { motion } from 'framer-motion'
import { TemporalRiskChart } from '@/components/charts/TemporalRiskChart'

export function StoryTemporalRiskChart() {
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
        RUBLI · Risk Timeline
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        COVID-19 drove a 30% spike in procurement risk — and it never fully came back down
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        High-risk rate and avg risk score · 2010-2025 · Scandal annotations marked
      </p>

      <TemporalRiskChart
        title=""
        showScandals={true}
        height={320}
      />

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2010-2025 · RUBLI v0.6.5 risk model · Scandal dates from public record
      </p>
    </motion.div>
  )
}
