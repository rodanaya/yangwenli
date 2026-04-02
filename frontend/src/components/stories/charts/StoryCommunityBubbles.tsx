/**
 * StoryCommunityBubbles — Editorial: the hidden networks
 *
 * Packed bubble chart of detected vendor communities. Each bubble
 * represents a cluster of vendors that co-bid together. Size = total
 * contract value, color = average risk score. The largest communities
 * control billions in procurement spending.
 */

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { CommunityBubbles } from '@/components/charts/CommunityBubbles'

export function StoryCommunityBubbles() {
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
        RUBLI · Network Intelligence
      </p>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Vendor communities: the clusters that bid together, win together
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        RUBLI&apos;s Louvain community detection algorithm identifies clusters of vendors
        that repeatedly appear in the same procurement procedures. Red bubbles indicate
        communities with high average risk scores — potential collusion networks.
        Click any bubble to explore its members.
      </p>

      {/* Legend strip */}
      <div className="flex items-center gap-4 py-2 border-y border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Risk level:</span>
        {[
          { label: 'Critical', color: '#f87171' },
          { label: 'High', color: '#fb923c' },
          { label: 'Medium', color: '#fbbf24' },
          { label: 'Low', color: '#4ade80' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="text-[10px] text-zinc-600 ml-auto">Bubble size = contract value</span>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <CommunityBubbles />
      </div>

      {/* Finding callout */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          The largest vendor communities often share common addresses, legal representatives,
          or RFC patterns — indicators of potential shell company networks. Communities flagged
          red (critical risk) account for a disproportionate share of high-value contracts.
        </p>
      </div>

      {/* Investigation hook */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">
          Source: RUBLI community detection · Louvain algorithm · 200K+ vendors
        </p>
        <a
          href="/network"
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          Explore network map
        </a>
      </div>
    </motion.div>
  )
}
