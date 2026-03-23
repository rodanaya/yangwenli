/**
 * StoryProcedureBreakdown — story-context wrapper for ProcedureBreakdown.
 *
 * Stacked horizontal bar: Direct Award % / Single Bid % / Open Tender %
 * for all 12 sectors. Sorted descending by direct award rate.
 * Static RUBLI-derived aggregates 2002-2025 — no API required.
 */

import { motion } from 'framer-motion'
import { ProcedureBreakdown } from '@/components/charts/ProcedureBreakdown'

// RUBLI aggregates 2002-2025 by sector
const SECTOR_PROCEDURES = [
  { sector_name: 'Agricultura',     sector_code: 'agricultura',     direct_award_pct: 93.4, single_bid_pct: 3.2,  open_tender_pct: 3.4  },
  { sector_name: 'Hacienda',        sector_code: 'hacienda',        direct_award_pct: 80.0, single_bid_pct: 5.1,  open_tender_pct: 14.9 },
  { sector_name: 'Trabajo',         sector_code: 'trabajo',         direct_award_pct: 75.9, single_bid_pct: 8.7,  open_tender_pct: 15.4 },
  { sector_name: 'Tecnología',      sector_code: 'tecnologia',      direct_award_pct: 71.8, single_bid_pct: 14.2, open_tender_pct: 14.0 },
  { sector_name: 'Educación',       sector_code: 'educacion',       direct_award_pct: 72.3, single_bid_pct: 12.1, open_tender_pct: 15.6 },
  { sector_name: 'Gobernación',     sector_code: 'gobernacion',     direct_award_pct: 60.3, single_bid_pct: 13.5, open_tender_pct: 26.2 },
  { sector_name: 'Salud',           sector_code: 'salud',           direct_award_pct: 63.8, single_bid_pct: 15.2, open_tender_pct: 21.0 },
  { sector_name: 'Ambiente',        sector_code: 'ambiente',        direct_award_pct: 62.1, single_bid_pct: 11.8, open_tender_pct: 26.1 },
  { sector_name: 'Defensa',         sector_code: 'defensa',         direct_award_pct: 56.3, single_bid_pct: 22.1, open_tender_pct: 21.6 },
  { sector_name: 'Energía',         sector_code: 'energia',         direct_award_pct: 55.7, single_bid_pct: 9.3,  open_tender_pct: 35.0 },
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
      className="w-full"
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Tipos de procedimiento por sector · adjudicación directa vs licitación abierta 2002-2025
      </p>
      <ProcedureBreakdown data={SECTOR_PROCEDURES} height={320} />
    </motion.div>
  )
}
