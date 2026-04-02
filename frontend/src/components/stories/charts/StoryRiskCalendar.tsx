/**
 * StoryRiskCalendar — Editorial: a decade of risk mapped month by month
 *
 * GitHub-style heatmap grid: rows = years (2016-2025), cells = months.
 * Color intensity = average risk score. December consistently glows red.
 * The 2020 COVID procurement spike is visible as a horizontal red streak.
 */

import { motion } from 'framer-motion'
import { RiskCalendarHeatmap } from '@/components/charts/RiskCalendarHeatmap'

export function StoryRiskCalendar() {
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
        RUBLI · Risk Calendar
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Ten years of procurement risk — December never cools down
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Each cell in this heatmap represents one month&apos;s average risk score across all
        federal contracts. The pattern is unmistakable: the rightmost column (December)
        is consistently the darkest shade. The 2020 row shows an exceptional horizontal
        streak — COVID emergency procurement pushed risk scores up across all months.
      </p>

      {/* Annotation strip */}
      <div className="flex items-center gap-4 py-2 border-y border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-[10px] text-zinc-400">High/Critical risk months</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          <span className="text-[10px] text-zinc-400">Medium risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-700" />
          <span className="text-[10px] text-zinc-400">Low risk</span>
        </div>
        <span className="text-[10px] text-zinc-600 ml-auto">Hover cells for detail</span>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <RiskCalendarHeatmap />
      </div>

      {/* Year annotations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="text-[10px] font-mono text-red-400 uppercase tracking-wide">2020 — COVID SPIKE</div>
          <p className="text-xs text-zinc-300 mt-1">
            Emergency procurement bypassed normal competitive procedures. Average risk
            scores reached their highest sustained levels in the 10-year window.
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wide">DECEMBER PATTERN</div>
          <p className="text-xs text-zinc-300 mt-1">
            Year-end budget exhaustion is visible in every single row. December risk averages
            are 64% higher than the October trough — the most reliable seasonal signal in
            the data.
          </p>
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: COMPRANET 2016-2025 · monthly average risk scores · RUBLI v6.5
      </p>
    </motion.div>
  )
}
