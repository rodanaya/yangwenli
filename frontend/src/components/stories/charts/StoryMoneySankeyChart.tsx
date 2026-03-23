/**
 * StoryMoneySankeyChart — story-context Sankey showing pharma-triangle money flows.
 *
 * Hard-coded flows: federal health institutions → 3 dominant pharma vendors.
 * Values from RUBLI COMPRANET analysis 2019-2023.
 * No API required — static data embedded for narrative use.
 */

import { motion } from 'framer-motion'
import { MoneySankeyChart } from '@/components/charts/MoneySankeyChart'

// RUBLI-derived aggregates: IMSS/ISSSTE/INSABI → top 3 pharma vendors 2019-2023
const PHARMA_FLOWS = [
  {
    source_type: 'institution', source_id: 1, source_name: 'IMSS',
    target_type: 'vendor',      target_id: 101, target_name: 'Fármacos Especializados',
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
    target_type: 'vendor',      target_id: 101, target_name: 'Fármacos Especializados',
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

export function StoryMoneySankeyChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Flujo de dinero: salud federal → triángulo farmacéutico 2019-2023
      </p>
      <MoneySankeyChart flows={PHARMA_FLOWS} height={300} />
    </motion.div>
  )
}
