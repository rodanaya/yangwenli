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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Administration Comparison
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        MXN 9.9 trillion across 5 presidents — where did the money go?
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Each administration left a distinct procurement fingerprint. Pena Nieto&apos;s
        administration was the largest spender at MXN 3.1T, while AMLO&apos;s government shifted
        spending toward health and social programs. The inner ring shows each president&apos;s
        share; the outer ring breaks it down by sector.
      </p>

      {/* Key comparison stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-emerald-400">MXN 3.1T</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Pena Nieto · largest spender
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-amber-400">79.5%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            AMLO direct awards · highest ever
          </div>
        </div>
        <div className="border-l-2 border-pink-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-pink-400">12.0%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Sheinbaum high-risk rate (early)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex justify-center">
        <AdminSectorSunburst />
      </div>

      {/* Reading guide */}
      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">
          HOW TO READ THIS CHART
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          <strong className="text-zinc-300">Inner ring:</strong> each arc represents one
          presidential administration, sized by total procurement spending.
          <strong className="text-zinc-300"> Outer ring:</strong> each segment is one of 12
          sectors, sized by that sector&apos;s spending under the corresponding president.
          Hover to see exact values.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: COMPRANET 2002-2025 · 3.05M contracts · 12 sectors
      </p>
    </motion.div>
  )
}
