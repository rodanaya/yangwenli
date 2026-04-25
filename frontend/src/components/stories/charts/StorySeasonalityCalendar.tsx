/**
 * StorySeasonalityCalendar — Editorial: the December effect
 *
 * Wraps the SeasonalityCalendar radial bar chart with editorial context:
 * December risk is 64% higher than October baseline, and average contract
 * size spikes to MXN 4.87M — a pattern consistent across all 23 years.
 */

import { motion } from 'framer-motion'
import { SeasonalityCalendar } from '@/components/charts/SeasonalityCalendar'

export function StorySeasonalityCalendar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Temporal Pattern
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        Every December, procurement risk spikes 64% — for 23 consecutive years
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        The &ldquo;December effect&rdquo; is the single most persistent anomaly in Mexican
        federal procurement. Government agencies rush to exhaust annual budgets before the
        fiscal year closes, pushing average contract amounts to MXN 4.87M — nearly double the
        yearly average of MXN 2.9M.
      </p>

      {/* Two stat callouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-critical">+64%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            December risk vs. October baseline
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-high">MXN 4.87M</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            avg contract in December · 1.7x annual avg
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <SeasonalityCalendar />
      </div>

      {/* OECD context */}
      <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-oecd)] mb-1">
          OECD BENCHMARK
        </p>
        <p className="text-sm text-text-secondary">
          The OECD recommends even distribution of procurement across the fiscal year.
          Year-end spending spikes are a recognized corruption risk indicator in all
          OECD integrity frameworks — Mexico&apos;s December pattern is among the most extreme
          in OECD member states.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-text-muted">
        Source: COMPRANET 2002-2025 · 3.05M contracts · RUBLI v0.6.5 risk scores
      </p>
    </motion.div>
  )
}
