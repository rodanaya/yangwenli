/**
 * StoryAdminSunburst — Editorial: where each president spent
 *
 * Sunburst showing how MXN 9.9T in federal procurement was distributed
 * across 5 administrations and 12 sectors. Inner ring = presidents,
 * outer ring = sector breakdown within each administration.
 */

import { motion } from 'framer-motion'
import { AdminSectorSunburst } from '@/components/charts/AdminSectorSunburst'

export function StoryAdminSunburst() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Administration Comparison
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        MXN 9.9 trillion across 5 presidents — where did the money go?
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Each administration left a distinct procurement fingerprint. Pena Nieto&apos;s
        administration was the largest spender at MXN 3.1T, while AMLO&apos;s government shifted
        spending toward health and social programs. The inner ring shows each president&apos;s
        share; the outer ring breaks it down by sector.
      </p>

      {/* Key comparison stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-emerald-400">MXN 3.1T</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            Pena Nieto · largest spender
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-amber-400">79.5%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            AMLO direct awards · highest ever
          </div>
        </div>
        <div className="border-l-2 border-pink-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-pink-400">12.0%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            Sheinbaum high-risk rate (early)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4 flex justify-center">
        <AdminSectorSunburst />
      </div>

      {/* Reading guide */}
      <div className="rounded-sm border border-border bg-background-card p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted mb-1">
          HOW TO READ THIS CHART
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-secondary">Inner ring:</strong> each arc represents one
          presidential administration, sized by total procurement spending.
          <strong className="text-text-secondary"> Outer ring:</strong> each segment is one of 12
          sectors, sized by that sector&apos;s spending under the corresponding president.
          Hover to see exact values.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-text-muted">
        Source: COMPRANET 2002-2025 · 3.05M contracts · 12 sectors
      </p>
    </motion.div>
  )
}
