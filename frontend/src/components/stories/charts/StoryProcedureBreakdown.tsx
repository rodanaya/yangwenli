/**
 * StoryProcedureBreakdown — Editorial: the death of open competition
 *
 * Stacked horizontal bars showing how direct awards dominate Mexican
 * procurement. Agriculture tops 93.4% — but even the "best" sector
 * (Infrastructure) awards only 60% via open tender.
 */

import { motion } from 'framer-motion'
import { ProcedureBreakdown } from '@/components/charts/ProcedureBreakdown'

const SECTOR_PROCEDURES = [
  { sector_name: 'Agricultura',     sector_code: 'agricultura',     direct_award_pct: 93.4, single_bid_pct: 3.2,  open_tender_pct: 3.4  },
  { sector_name: 'Hacienda',        sector_code: 'hacienda',        direct_award_pct: 80.0, single_bid_pct: 5.1,  open_tender_pct: 14.9 },
  { sector_name: 'Trabajo',         sector_code: 'trabajo',         direct_award_pct: 75.9, single_bid_pct: 8.7,  open_tender_pct: 15.4 },
  { sector_name: 'Tecnologia',      sector_code: 'tecnologia',      direct_award_pct: 71.8, single_bid_pct: 14.2, open_tender_pct: 14.0 },
  { sector_name: 'Educacion',       sector_code: 'educacion',       direct_award_pct: 72.3, single_bid_pct: 12.1, open_tender_pct: 15.6 },
  { sector_name: 'Gobernacion',     sector_code: 'gobernacion',     direct_award_pct: 60.3, single_bid_pct: 13.5, open_tender_pct: 26.2 },
  { sector_name: 'Salud',           sector_code: 'salud',           direct_award_pct: 63.8, single_bid_pct: 15.2, open_tender_pct: 21.0 },
  { sector_name: 'Ambiente',        sector_code: 'ambiente',        direct_award_pct: 62.1, single_bid_pct: 11.8, open_tender_pct: 26.1 },
  { sector_name: 'Defensa',         sector_code: 'defensa',         direct_award_pct: 56.3, single_bid_pct: 22.1, open_tender_pct: 21.6 },
  { sector_name: 'Energia',         sector_code: 'energia',         direct_award_pct: 55.7, single_bid_pct: 9.3,  open_tender_pct: 35.0 },
  { sector_name: 'Otros',           sector_code: 'otros',           direct_award_pct: 52.0, single_bid_pct: 9.8,  open_tender_pct: 38.2 },
  { sector_name: 'Infraestructura', sector_code: 'infraestructura', direct_award_pct: 31.9, single_bid_pct: 8.2,  open_tender_pct: 59.9 },
]

export function StoryProcedureBreakdown() {
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
        RUBLI · Procedure Analysis
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        9 of 12 sectors award more than half their contracts without competition
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        The OECD recommends that no more than 25% of public contracts be direct awards.
        In Mexico, not a single sector meets this benchmark. Agriculture leads at 93.4% direct
        awards — only 3.4% of its contracts go through open tender.
      </p>

      {/* Hero stat + OECD reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-4xl font-mono font-bold text-red-400">93.4%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Agriculture direct awards · <span className="text-cyan-400">OECD max: 25%</span>
          </div>
        </div>
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-4xl font-mono font-bold text-emerald-400">59.9%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Infrastructure open tender · best sector, still <span className="text-cyan-400">below OECD norm (75%+)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <ProcedureBreakdown data={SECTOR_PROCEDURES} height={360} />
      </div>

      {/* Finding callout */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          Defensa has the highest single-bid rate (22.1%) among all sectors — meaning
          nearly a quarter of its &ldquo;competitive&rdquo; procedures received only one bid.
          Combined with its 56.3% direct award rate, effectively 78.4% of defense contracts
          face no real competition.
        </p>
      </div>

      {/* OECD benchmark line */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-cyan-500/30" />
        <span className="text-[10px] font-mono text-cyan-400">OECD max direct award: 25%</span>
        <div className="h-px flex-1 bg-cyan-500/30" />
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: COMPRANET 2002-2025 · 3.05M contracts · OECD Public Procurement Report 2023
      </p>
    </motion.div>
  )
}
