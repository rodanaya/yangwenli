/**
 * StoryMoneySankeyChart — Editorial Sankey: the pharma triangle
 *
 * Reveals the concentration of federal health spending flowing through
 * just 3 pharmaceutical intermediaries. MXN 270B across 3,830 contracts.
 * Dark editorial aesthetic with risk-colored flows.
 */

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'

const PHARMA_FLOWS = [
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 101, target_name: 'Farmacos Especializados',
    value: 98_000_000_000, contracts: 1240, avg_risk: 0.97, high_risk_pct: 98.2,
  },
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 102, target_name: 'Maypo S.A.',
    value: 54_000_000_000, contracts: 890, avg_risk: 0.96, high_risk_pct: 97.1,
  },
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 103, target_name: 'DIMM Distribuidora',
    value: 41_000_000_000, contracts: 620, avg_risk: 0.97, high_risk_pct: 96.8,
  },
  {
    source_type: 'institution', source_id: 2, source_name: 'ISSSTE',
    target_type: 'vendor',      target_id: 101, target_name: 'Farmacos Especializados',
    value: 38_000_000_000, contracts: 480, avg_risk: 0.96, high_risk_pct: 97.4,
  },
  {
    source_type: 'institution', source_id: 2, source_name: 'ISSSTE',
    target_type: 'vendor',      target_id: 102, target_name: 'Maypo S.A.',
    value: 21_000_000_000, contracts: 310, avg_risk: 0.95, high_risk_pct: 96.0,
  },
  {
    source_type: 'institution', source_id: 3, source_name: 'INSABI / IMSS-Bienestar',
    target_type: 'vendor',      target_id: 103, target_name: 'DIMM Distribuidora',
    value: 18_000_000_000, contracts: 290, avg_risk: 0.97, high_risk_pct: 98.0,
  },
]

const TOTAL_MXN = PHARMA_FLOWS.reduce((s, f) => s + f.value, 0)
const TOTAL_CONTRACTS = PHARMA_FLOWS.reduce((s, f) => s + f.contracts, 0)

export function StoryMoneySankeyChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Money Flow Analysis
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        3 intermediaries captured MXN 270B in federal health procurement
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Between 2019 and 2023, three pharmaceutical distributors absorbed the vast majority of
        IMSS, ISSSTE, and INSABI drug spending. All three score above 0.95 on the RUBLI risk model
        — the highest possible tier.
      </p>

      {/* Key stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-400">
            MXN {(TOTAL_MXN / 1e9).toFixed(0)}B
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            total flow through 3 vendors
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-amber-400">
            {TOTAL_CONTRACTS.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            contracts · avg MXN {(TOTAL_MXN / TOTAL_CONTRACTS / 1e6).toFixed(0)}M each
          </div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-400">97%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            avg risk score · all critical
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-sm border border-border bg-background p-4">
        <MoneySankeyChart flows={PHARMA_FLOWS} height={300} />
      </div>

      {/* Finding callout */}
      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          A single vendor — Farmacos Especializados — received MXN 136B from two institutions
          (IMSS + ISSSTE), equivalent to 50% of total identified flow. This level of concentration
          far exceeds OECD procurement diversification guidelines.
        </p>
      </div>

      {/* Source line */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          Source: COMPRANET 2019-2023 · RUBLI risk model v0.6.5
        </p>
        <a
          href="/aria"
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          Investigate vendors
        </a>
      </div>
    </motion.div>
  )
}
