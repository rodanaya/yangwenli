/**
 * Shared row contract for the /categories index surface (page + plate + hover
 * dossier + risk-rank band). One source of truth so the three sub-components
 * stay in lockstep with `categoriesApi.getSummary()`.
 */

export interface CategoryTopVendor {
  id: number
  name: string
}

export interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  high_risk_pct: number | null
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: CategoryTopVendor | null
}

/** Floor below which a category's avg_risk is too thin to rank / encode. */
export const CONTRACT_FLOOR = 200

/** Concentration / risk lens for the centerpiece plate. */
export type PlateLens = 'concentration' | 'risk'

/** intensityColor — one home: the /sectors confoundScales helper (PARALLAX D7b STEP 0). */
export { intensityColor } from '@/components/sectors/confoundScales'
