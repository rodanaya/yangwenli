/**
 * Risk Factor Label Parser
 *
 * Converts raw risk_factors strings from the database into human-readable labels.
 * The risk_factors column stores comma-separated strings like:
 *   "single_bid,split_2,co_bid_med:71%:2p,inst_risk:state_enterprise_energy"
 *
 * This parser handles all parametric patterns from calculate_risk_scores.py
 */

export type FactorCategory =
  | 'competition'
  | 'pricing'
  | 'timing'
  | 'network'
  | 'institutional'
  | 'procedural'
  | 'interaction'

export interface ParsedFactor {
  label: string
  category: FactorCategory
  raw: string
}

const CATEGORY_COLORS: Record<FactorCategory, string> = {
  competition: '#ef4444',   // red — single bid, concentration
  pricing: '#f59e0b',       // amber — price anomaly, overpricing
  timing: '#8b5cf6',        // violet — year end, short ad, splitting
  network: '#3b82f6',       // blue — network risk, co-bidding
  institutional: '#6366f1', // indigo — institution risk, mismatch
  procedural: '#ec4899',    // pink — direct award, restricted
  interaction: '#94a3b8',   // slate — interaction effects
}

export function getFactorCategoryColor(category: FactorCategory): string {
  return CATEGORY_COLORS[category]
}

export function parseFactorLabel(raw: string): ParsedFactor {
  // --- Exact matches first ---
  if (raw === 'single_bid') return { label: 'Single Bidder', category: 'competition', raw }
  if (raw === 'direct_award') return { label: 'Direct Award', category: 'procedural', raw }
  if (raw === 'restricted_procedure') return { label: 'Restricted Procedure', category: 'procedural', raw }
  if (raw === 'price_anomaly') return { label: 'Price Anomaly', category: 'pricing', raw }
  if (raw === 'year_end') return { label: 'Year-End Timing', category: 'timing', raw }
  if (raw === 'industry_mismatch') return { label: 'Industry Mismatch', category: 'institutional', raw }
  if (raw === 'vendor_concentration') return { label: 'Vendor Concentration', category: 'competition', raw }
  if (raw === 'concentration') return { label: 'Vendor Concentration', category: 'competition', raw }
  if (raw === 'threshold_split' || raw === 'split') return { label: 'Threshold Splitting', category: 'timing', raw }
  if (raw === 'network_risk' || raw === 'network') return { label: 'Network Risk', category: 'network', raw }
  if (raw === 'short_ad' || raw === 'short_ad_period') return { label: 'Short Ad Period', category: 'timing', raw }
  if (raw === 'price_hyp') return { label: 'Price Hypothesis', category: 'pricing', raw }
  if (raw === 'co_bid') return { label: 'Co-Bidding Pattern', category: 'network', raw }
  if (raw === 'co_bid_high') return { label: 'Co-Bidding Risk (High)', category: 'network', raw }
  if (raw === 'co_bid_med') return { label: 'Co-Bidding Risk (Medium)', category: 'network', raw }
  if (raw === 'inst_risk') return { label: 'Institution Risk', category: 'institutional', raw }

  // --- Parametric patterns ---

  // network_N → "Network Risk (N members)"
  const networkMatch = raw.match(/^network_(\d+)$/)
  if (networkMatch) {
    return { label: `Network Risk (${networkMatch[1]} members)`, category: 'network', raw }
  }

  // split_N → "Split Contracts (N)"
  const splitMatch = raw.match(/^split_(\d+)$/)
  if (splitMatch) {
    return { label: `Split Contracts (${splitMatch[1]})`, category: 'timing', raw }
  }

  // short_ad_<Nd → "Short Ad Period (<N days)"
  const shortAdMatch = raw.match(/^short_ad_<(\d+)d$/)
  if (shortAdMatch) {
    return { label: `Short Ad (<${shortAdMatch[1]} days)`, category: 'timing', raw }
  }

  // inst_risk:type → "Institution Risk"
  if (raw.startsWith('inst_risk:')) {
    return { label: 'Institution Risk', category: 'institutional', raw }
  }

  // price_hyp:type:confidence → descriptive label
  const priceHypMatch = raw.match(/^price_hyp:([^:]+)(?::(.+))?$/)
  if (priceHypMatch) {
    const type = priceHypMatch[1]
    const typeLabel =
      type === 'extreme_overpricing' ? 'Extreme Overpricing'
      : type === 'statistical_outlier' ? 'Statistical Outlier'
      : type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return { label: typeLabel, category: 'pricing', raw }
  }

  // co_bid_level:pct:Np → "Co-Bidding (Level, pct)"
  const coBidMatch = raw.match(/^co_bid_(high|med|low):(\d+%?)(?::(\d+)p)?$/)
  if (coBidMatch) {
    const levelMap: Record<string, string> = { high: 'High', med: 'Medium', low: 'Low' }
    const level = levelMap[coBidMatch[1]] || coBidMatch[1]
    return { label: `Co-Bidding (${level}, ${coBidMatch[2]})`, category: 'network', raw }
  }

  // vendor_concentration_X → "Vendor Concentration (X)"
  const vcMatch = raw.match(/^vendor_concentration_(.+)$/)
  if (vcMatch) {
    const level = vcMatch[1].charAt(0).toUpperCase() + vcMatch[1].slice(1)
    return { label: `Vendor Concentration (${level})`, category: 'competition', raw }
  }

  // industry_mismatch:X->sN → "Industry Mismatch"
  if (raw.startsWith('industry_mismatch:')) {
    return { label: 'Industry Mismatch', category: 'institutional', raw }
  }

  // interaction:X+Y → "X + Y"
  const interactionMatch = raw.match(/^interaction:(.+)\+(.+)$/)
  if (interactionMatch) {
    const a = interactionMatch[1].replace(/_/g, ' ')
    const b = interactionMatch[2].replace(/_/g, ' ')
    return { label: `${a} + ${b}`, category: 'interaction', raw }
  }

  // Fallback: title-case the raw string
  const fallbackLabel = raw
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return { label: fallbackLabel, category: 'procedural', raw }
}
