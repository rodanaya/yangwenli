/**
 * StoryVendorFingerprint — Editorial: the anatomy of a suspect vendor
 *
 * HEMOSER's SHAP fingerprint as a Nightingale rose. The dominant petal is
 * same_day_count — 12 cardiac contracts awarded in a single day to the
 * same vendor, a textbook threshold-splitting pattern.
 */

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import VendorFingerprintChart from '@/components/charts/VendorFingerprintChart'

const HEMOSER_SHAP = {
  price_volatility:      0.62,
  price_ratio:           0.41,
  vendor_concentration:  0.88,
  network_member_count:  0.19,
  same_day_count:        1.24,
  single_bid:            0.53,
  ad_period_days:        0.28,
  institution_diversity: -0.14,
}

export function StoryVendorFingerprint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Section overline with risk pill */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
          RUBLI · Vendor Forensics
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1
                        bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Critical risk
        </div>
      </div>

      {/* Editorial headline */}
      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        12 contracts in one day: inside HEMOSER&apos;s risk fingerprint
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        On August 2, 2023, ISSSTE awarded HEMOSER 12 separate cardiac supply contracts
        — a textbook &ldquo;threshold splitting&rdquo; pattern designed to keep each contract
        below the competitive bidding threshold. The SHAP model assigns HEMOSER a risk score
        of <span className="text-red-400 font-mono font-bold">0.94</span> — in the top 2% of
        all 200K+ active vendors.
      </p>

      {/* SHAP factor callouts */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Same-day', value: '+1.24', color: 'text-red-400', note: 'strongest signal' },
          { label: 'Concentration', value: '+0.88', color: 'text-red-400', note: 'market share' },
          { label: 'Price volatility', value: '+0.62', color: 'text-orange-400', note: 'contract sizes vary' },
          { label: 'Inst. diversity', value: '-0.14', color: 'text-teal-400', note: 'protective factor' },
        ].map((f) => (
          <div key={f.label} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5 text-center">
            <div className={`text-lg font-mono font-bold ${f.color}`}>{f.value}</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wide mt-0.5">{f.label}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{f.note}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex justify-center">
        <VendorFingerprintChart
          shapValues={HEMOSER_SHAP}
          riskScore={0.94}
          vendorName="HEMOSER"
          size={300}
          showLabels={true}
          animate={true}
        />
      </div>

      {/* Reading guide */}
      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">
          HOW TO READ THIS CHART
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Each petal represents one of the 9 active risk model features.
          <strong className="text-red-400"> Red petals</strong> are risk-increasing factors;
          <strong className="text-teal-400"> teal petals</strong> are protective.
          Petal size is proportional to the SHAP contribution — larger petals drive
          the risk score higher. The center badge shows the overall score.
        </p>
      </div>

      {/* Investigation hook */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">
          Source: RUBLI v6.5 SHAP explanations · vendor_shap_v52 table
        </p>
        <a
          href="/aria"
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          View ARIA investigation queue
        </a>
      </div>
    </motion.div>
  )
}
