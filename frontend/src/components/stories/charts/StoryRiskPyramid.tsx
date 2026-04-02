/**
 * StoryRiskPyramid — Editorial: where the money concentrates
 *
 * Mirrored bar pyramid: left = contract count by risk level,
 * right = contract value. The finding: critical-risk contracts
 * are only 6% of volume but hold 42% of total procurement value.
 * The money is concentrated where the risk is highest.
 */

import { motion } from 'framer-motion'
import { RiskPyramid } from '@/components/charts/RiskPyramid'

export function StoryRiskPyramid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Risk Distribution
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        6% of contracts hold 42% of the money — and they are all critical risk
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        The pyramid reveals the core asymmetry in Mexican procurement: critical-risk contracts
        are rare by count (6.1%) but massive by value (41.8%). This means the riskiest contracts
        are also the largest — an MXN 4.1 trillion concentration of suspicious spending.
      </p>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-400">MXN 4.1T</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            in critical-risk contracts
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400">6.9x</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            value-to-count ratio (critical)
          </div>
        </div>
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-emerald-400">0.49x</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            value-to-count ratio (low risk)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <RiskPyramid />
      </div>

      {/* Finding callout */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-red-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          The pyramid shape inverts for value: while 78% of contracts are low-risk, they
          contain only 38% of the money. The pattern is consistent across all 12 sectors:
          <strong className="text-red-400"> corruption gravitates toward the largest contracts</strong>.
          This aligns with OECD research showing that procurement fraud disproportionately
          targets high-value awards.
        </p>
      </div>

      {/* OECD benchmark context */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-cyan-500/30" />
        <span className="text-[10px] font-mono text-cyan-400">
          OECD: high-risk rate target 2-15% · Mexico: 13.5%
        </span>
        <div className="h-px flex-1 bg-cyan-500/30" />
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: 3.05M contracts · RUBLI v6.5 · thresholds: critical {'>'}=0.60, high {'>'}=0.40, medium {'>'}=0.25
      </p>
    </motion.div>
  )
}
