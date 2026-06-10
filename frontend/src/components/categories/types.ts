/**
 * Shared row contract for the /categories index surface (page + plate + hover
 * dossier + risk-rank band). One source of truth so the three sub-components
 * stay in lockstep with `categoriesApi.getSummary()`.
 */
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

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

/**
 * intensityColor — RISK_COLORS by level, but NEVER green for low (Bible §3.10).
 * Local reimplementation per spec (the /sectors confoundScales helper is not
 * importable across the sector boundary for a category surface).
 */
export function intensityColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[level]
}
