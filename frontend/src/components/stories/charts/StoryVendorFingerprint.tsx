/**
 * StoryVendorFingerprint — story-context wrapper for VendorFingerprintChart.
 *
 * Nightingale rose showing HEMOSER's corruption "fingerprint":
 * SHAP values for the 8 active v6.4 risk model features.
 * Dominant petals: same_day_count (12 contracts in one day),
 * vendor_concentration (cardiac monopoly), price_volatility.
 *
 * Hardcoded RUBLI-derived SHAP values for HEMOSER — no API required.
 */

import { motion } from 'framer-motion'
import VendorFingerprintChart from '@/components/charts/VendorFingerprintChart'

// HEMOSER SHAP values derived from RUBLI v6.4 model
// Dominant signal: same_day_count — 12 contracts awarded August 2, 2023
const HEMOSER_SHAP = {
  price_volatility:     0.62,
  price_ratio:          0.41,
  vendor_concentration: 0.88,
  network_member_count: 0.19,
  same_day_count:       1.24,   // strongest signal: threshold splitting
  single_bid:           0.53,
  ad_period_days:       0.28,
  institution_diversity: -0.14, // protective (serves only ISSSTE)
}

export function StoryVendorFingerprint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full flex flex-col items-center"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Huella digital de riesgo: HEMOSER · modelo RUBLI v6.4 · 8 factores SHAP
      </p>
      <VendorFingerprintChart
        shapValues={HEMOSER_SHAP}
        riskScore={0.94}
        vendorName="HEMOSER"
        size={300}
        showLabels={true}
        animate={true}
      />
    </motion.div>
  )
}
