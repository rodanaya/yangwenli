/**
 * Pattern Descriptions
 * Rich descriptions for all risk pattern types detected by the platform.
 */

export interface PatternDescription {
  title: string
  what: string
  howDetected: string
  realExample: string
  whyItMatters: string
  icon: string
}

export const PATTERN_DESCRIPTIONS: Record<string, PatternDescription> = {
  single_bid: {
    title: 'Single Bidder',
    what: 'A competitive procurement procedure where only one vendor submitted a bid, eliminating any price competition.',
    howDetected: 'Flagged when a non-direct-award procedure has exactly one distinct vendor_id. Direct awards are excluded since single participation is expected.',
    realExample: 'A hospital invites bids for MRI equipment maintenance. Despite being open to all, only one company bids — the incumbent. The contract is awarded at their asking price with no competitive pressure.',
    whyItMatters: 'Single bidding is the OECD\'s top red-flag indicator. It can indicate bid-rigging (competitors agree not to bid), specification tailoring (requirements written for one vendor), or market intimidation.',
    icon: 'user',
  },
  direct_award: {
    title: 'Direct Award',
    what: 'Contract awarded without competitive bidding, bypassing open tender requirements. Legally permitted under specific conditions (emergency, sole source, low value).',
    howDetected: 'Identified from the procedure_type field in COMPRANET data. Includes "Adjudicacion Directa" and related procedure types.',
    realExample: 'During COVID-19, health agencies awarded billions in direct contracts for medical supplies citing emergency provisions — some to vendors with no prior healthcare experience.',
    whyItMatters: 'While sometimes justified, direct awards remove competitive pressure and transparency. Mexico\'s direct award rate exceeds 70% in some sectors, far above international norms. However, the v4.0 model found that direct awards are actually less common in known corruption cases than expected.',
    icon: 'zap',
  },
  price_anomaly: {
    title: 'Price Anomaly',
    what: 'Contract amount significantly deviates from typical pricing in the same sector and time period, suggesting potential overpricing or underpricing.',
    howDetected: 'Uses Tukey\'s IQR method: contracts above Q3 + 1.5*IQR are statistical outliers; above Q3 + 3*IQR are extreme outliers. Z-score normalization accounts for sector and year baselines.',
    realExample: 'Cyber Robotic charged government agencies 3-5x market rates for standard IT equipment. A $50,000 server was billed at $250,000 — detectable only by comparing against sector pricing baselines.',
    whyItMatters: 'Overpricing is a primary mechanism for extracting corrupt rents. Even modest 10-20% overpricing across thousands of contracts generates billions in illicit gains.',
    icon: 'dollar-sign',
  },
  vendor_concentration: {
    title: 'Vendor Concentration',
    what: 'A single vendor captures a disproportionately large share of contracts within a sector or institution, suggesting potential monopolistic behavior or favoritism.',
    howDetected: 'Measures vendor\'s total contract value as a percentage of sector spending. Flagged at >10% share (partial), >20% (elevated), >30% (full flag). The v4.0 model\'s strongest predictor with a +1.0 coefficient.',
    realExample: 'PISA Farmaceutica held over 55% of IMSS pharmaceutical contracts for years. LICONSA dominated SEGALMEX food distribution. In both cases, the concentration enabled systematic fraud.',
    whyItMatters: 'The v4.0 statistical model found vendor concentration is 18.7x more predictive of corruption than any other indicator. Dominant vendors can extract rents through market power, lock-in effects, and captured relationships with procurement officials.',
    icon: 'pie-chart',
  },
  short_ad: {
    title: 'Short Advertisement Period',
    what: 'The time between publishing a tender notice and the contract award is unusually brief, potentially limiting vendor participation.',
    howDetected: 'Calculates days between publication_date and award_date. Flagged at <5 days (full), <15 days (elevated), <30 days (partial). Normalized against sector/year baselines.',
    realExample: 'A construction tender published on Friday with bids due Monday effectively limits participation to pre-informed vendors, defeating the purpose of competitive bidding.',
    whyItMatters: 'Short advertisement periods can be used to exclude potential competitors while maintaining the appearance of an open process. However, the v4.0 model found this indicator has a reversed sign — known corrupt vendors actually tend to use normal-length ad periods.',
    icon: 'clock',
  },
  split: {
    title: 'Threshold Splitting',
    what: 'Multiple contracts awarded to the same vendor on the same day, potentially to keep individual amounts below competitive bidding thresholds.',
    howDetected: 'Counts same-day contracts from the same institution to the same vendor. Flagged at 2+ (partial), 3+ (elevated), 5+ (full flag).',
    realExample: 'Instead of one $5M contract requiring competitive bidding, an institution awards five $1M contracts to the same vendor on the same date — each below the threshold that would trigger open tender.',
    whyItMatters: 'Splitting circumvents competitive bidding requirements designed to ensure value for money. It indicates deliberate manipulation of procurement rules to favor a specific vendor.',
    icon: 'scissors',
  },
  year_end: {
    title: 'Year-End Timing',
    what: 'Contracts awarded in December, when agencies rush to spend remaining budgets before the fiscal year closes.',
    howDetected: 'Binary flag based on whether the contract_date falls in December. Weighted at 7% in v3.3 and has a negligible +0.023 coefficient in v4.0.',
    realExample: 'A ministry awards 40% of its annual contracts in the last two weeks of December, including a $200M IT project with a 3-day evaluation period — classic "use it or lose it" budget behavior.',
    whyItMatters: 'Year-end spending pressure leads to reduced due diligence, shortened evaluation periods, and acceptance of higher prices. December contracts have historically higher risk scores across all sectors.',
    icon: 'calendar',
  },
  network: {
    title: 'Network Risk',
    what: 'The vendor belongs to a group of related entities (shared ownership, addresses, or legal representatives) that may coordinate to simulate competition.',
    howDetected: 'Vendor group detection uses shared RFC roots, addresses, phone numbers, and legal representatives. Group size is flagged at 2+ (partial), 3+ (elevated), 5+ (full flag).',
    realExample: 'The IMSS ghost company network used dozens of shell companies with shared addresses and legal representatives to win "competitive" bids against each other — creating an illusion of market competition.',
    whyItMatters: 'Related vendor networks are a primary mechanism for bid-rigging. Shell companies can simulate competition while ensuring a predetermined winner, and profits flow back to the same beneficial owners.',
    icon: 'git-branch',
  },
  co_bid: {
    title: 'Co-Bidding Pattern',
    what: 'Vendors that consistently participate in the same bidding procedures, potentially coordinating their bids.',
    howDetected: 'Measures how often vendor pairs appear in the same procedures. Flagged when co-bid rate exceeds 50% of a vendor\'s total procedures with 10+ shared procedures.',
    realExample: 'Three construction companies bid on every road project together. Company A always wins with the lowest bid, while B and C submit higher "cover bids." They rotate the winning position across different project types.',
    whyItMatters: 'Co-bidding patterns are the strongest indicator of bid-rigging cartels. While some co-bidding is natural in specialized markets, high rates combined with predictable win/loss patterns strongly suggest collusion.',
    icon: 'users',
  },
  industry_mismatch: {
    title: 'Industry Mismatch',
    what: 'A vendor wins contracts in sectors that don\'t match their registered business activity or historical specialization.',
    howDetected: 'Compares vendor\'s industry classification and primary sector affinity against the contract\'s sector. Flagged when a vendor operates significantly outside their core industry.',
    realExample: 'A company registered as a travel agency wins a $50M pharmaceutical supply contract. A construction firm receives IT consulting contracts. These mismatches suggest the vendor may be a front.',
    whyItMatters: 'Industry mismatches can indicate shell companies or front operations. Legitimate vendors typically operate within their area of expertise. A +0.21 coefficient in v4.0 confirms this as a meaningful corruption signal.',
    icon: 'alert-triangle',
  },
  inst_risk: {
    title: 'Institution Risk',
    what: 'The contracting institution has structural characteristics associated with higher corruption risk, such as decentralized oversight or weak audit capacity.',
    howDetected: 'Based on institution type classification (federal ministry, decentralized entity, state enterprise, etc.) and historical risk patterns. State enterprises and legally decentralized entities score higher.',
    realExample: 'PEMEX (state enterprise) and SEGALMEX (decentralized entity) have both been centers of major corruption scandals. Their semi-autonomous structure can create oversight gaps.',
    whyItMatters: 'Institutional characteristics create the conditions for corruption. Organizations with weak controls, high autonomy, and limited external oversight are structurally more vulnerable regardless of individual contract characteristics.',
    icon: 'building',
  },
  monopoly: {
    title: 'Market Monopoly',
    what: 'A vendor has no effective competition in their market segment, allowing them to set prices without competitive pressure.',
    howDetected: 'Identified when a vendor holds >50% of contract value within a specific sector-institution combination over multiple years.',
    realExample: 'A single vendor supplies 90% of insulin to IMSS. While they may be the most qualified supplier, the lack of alternatives means there\'s no market mechanism to ensure fair pricing.',
    whyItMatters: 'Monopolistic positions allow vendors to extract monopoly rents — charging above competitive prices because buyers have no alternative. This isn\'t always corruption per se, but it represents a structural vulnerability.',
    icon: 'lock',
  },
  rubber: {
    title: 'Rubber Stamp',
    what: 'Contracts that appear to be approved with minimal review — very short evaluation periods, minimal documentation, or automatic renewals.',
    howDetected: 'Combines short decision periods, repeated identical contract values, and formulaic descriptions to identify contracts that may lack genuine evaluation.',
    realExample: 'An agency renews a $10M services contract annually with the same vendor for 8 years, same amount, same description — no re-evaluation, no market testing, no competition.',
    whyItMatters: 'Rubber-stamping indicates captured procurement processes where oversight mechanisms exist on paper but not in practice. It enables long-term extraction schemes that accumulate significant value.',
    icon: 'stamp',
  },
  new_vendor: {
    title: 'New Vendor Risk',
    what: 'Contracts awarded to recently created vendors with no procurement track record, which may indicate shell companies created for specific corrupt purposes.',
    howDetected: 'Flags vendors whose first contract appears within 6 months of their first appearance in COMPRANET, especially for high-value contracts.',
    realExample: 'A company created 3 months before receiving a $100M government contract, with no employees, no office, and a registered address at a residential apartment — classic shell company indicators.',
    whyItMatters: 'Shell companies are created specifically to participate in corrupt procurement schemes. They have no reputation to protect, no ongoing business relationships, and can be abandoned after extracting funds.',
    icon: 'plus-circle',
  },
}

/**
 * Get pattern description by key.
 */
export function getPatternDescription(patternKey: string): PatternDescription | undefined {
  return PATTERN_DESCRIPTIONS[patternKey]
}

/**
 * Get all pattern keys.
 */
export function getAllPatternKeys(): string[] {
  return Object.keys(PATTERN_DESCRIPTIONS)
}
