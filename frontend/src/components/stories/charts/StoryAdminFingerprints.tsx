/**
 * StoryAdminFingerprints — Editorial: 5 presidents, 5 procurement styles
 *
 * Radar charts comparing procurement fingerprints across administrations.
 * Each president has a distinctive pattern: Pena Nieto spent the most but
 * had the lowest risk rate; AMLO had the highest direct award percentage;
 * Sheinbaum's early data shows the highest risk rate yet.
 */

import { motion } from 'framer-motion'
import AdministrationFingerprints from '@/components/charts/AdministrationFingerprints'

export function StoryAdminFingerprints() {
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
        RUBLI · Political Analysis
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Each president left a distinct corruption fingerprint in the data
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Five radar charts reveal how procurement practices shifted with each administration.
        The five dimensions — risk score, high-risk rate, direct award percentage, total value,
        and contract volume — create a unique &ldquo;fingerprint&rdquo; for each presidency.
      </p>

      {/* Key finding strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-emerald-400">7.59%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Pena Nieto HR · lowest of all 5
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-amber-400">79.5%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            AMLO direct awards · <span className="text-cyan-400">OECD: max 25%</span>
          </div>
        </div>
        <div className="border-l-2 border-pink-500 pl-3 py-1">
          <div className="text-lg font-mono font-bold text-pink-400">12.0%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            Sheinbaum HR · highest (early data)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <AdministrationFingerprints />
      </div>

      {/* Caveat + finding */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
            HALLAZGO
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">
            AMLO&apos;s administration increased direct awards to 79.5% — the highest in 23
            years and 3.2x the OECD recommended maximum of 25%. Despite anti-corruption
            rhetoric, the data shows less competition, not more.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1">
            CAVEAT
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sheinbaum data covers only 2025 (partial year). The 12.0% high-risk rate may
            normalize as more contracts are recorded. Fox-era data (2002-2006) has the lowest
            data quality (Structure A), making risk comparisons less reliable for that period.
          </p>
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600">
        Source: COMPRANET 2002-2025 · 3.05M contracts · RUBLI v6.5 model · 5 administrations
      </p>
    </motion.div>
  )
}
