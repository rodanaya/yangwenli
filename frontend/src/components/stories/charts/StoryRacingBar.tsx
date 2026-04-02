/**
 * StoryRacingBar — Editorial: the spending race across 5 presidents
 *
 * Animated racing bar chart: sectors compete for budget share year by year
 * as administrations change. Energy and Health consistently lead, but the
 * relative weights shift dramatically with each presidency.
 */

import { motion } from 'framer-motion'
import { RacingBarChart } from '@/components/charts/RacingBarChart'

export function StoryRacingBar() {
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
        RUBLI · Sector Spending Race
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Watch 23 years of federal spending shift across sectors and presidents
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Press play to watch sectors race for budget share from Fox (2002) to
        Sheinbaum (2025). Energy and Health consistently dominate, but each
        administration reshuffles the deck. The color bands below the scrubber
        show presidential terms.
      </p>

      {/* Key moments callout */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">2008-2012</div>
          <div className="text-sm text-zinc-200 mt-1">
            Energy spending peaks under Calderon — Pemex reforms drive procurement surge
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">2019-2020</div>
          <div className="text-sm text-zinc-200 mt-1">
            Health sector spikes during AMLO&apos;s centralized drug procurement + COVID emergency
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">2024-2025</div>
          <div className="text-sm text-zinc-200 mt-1">
            Early Sheinbaum data shows Infrastructure rising as Tren Maya contracts flow
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <RacingBarChart />
      </div>

      {/* Insight */}
      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">
          PATTERN
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The bar chart reveals a structural feature of Mexican procurement: regardless of
          which party holds power, Health and Energy consistently claim the top two positions.
          Together they account for 40-55% of all federal spending in any given year.
          The sectors that move the most between administrations are Infrastructure and Technology.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: COMPRANET 2002-2025 · 3.05M contracts · 12 sectors · animated by year
      </p>
    </motion.div>
  )
}
