/**
 * Narrative Generators
 * Template-based text generation for human-readable data summaries.
 * All functions return arrays of paragraph strings with optional inline highlights.
 */

import type {
  VendorDetailResponse,
  VendorRiskProfile,
  InstitutionDetailResponse,
  InstitutionVendorItem,
  ContractDetail,
  SectorStatistics,
} from '@/api/types'
import { formatCompactMXN, formatNumber, formatRiskScorePercent } from '@/lib/utils'
import { SECTOR_NAMES_EN } from '@/lib/constants'
import { getSectorDescription } from '@/lib/sector-descriptions'

export interface NarrativeParagraph {
  text: string
  /** Optional severity to color the paragraph border */
  severity?: 'info' | 'warning' | 'critical'
}

// ============================================================================
// Vendor Narrative
// ============================================================================

export function buildVendorNarrative(
  vendor: VendorDetailResponse,
  riskProfile?: VendorRiskProfile | null,
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []
  const sectorName = vendor.primary_sector_name
    ? (SECTOR_NAMES_EN[vendor.primary_sector_name.toLowerCase()] || vendor.primary_sector_name)
    : 'multiple sectors'

  // Opening — who they are
  const sizeTerm = vendor.total_contracts > 5000 ? 'major' :
    vendor.total_contracts > 500 ? 'significant' :
    vendor.total_contracts > 50 ? 'mid-size' : 'small'

  let opening = `A ${sizeTerm} vendor in ${sectorName}`
  if (vendor.sectors_count > 1) {
    opening += ` operating across ${vendor.sectors_count} sectors`
  }
  opening += `. ${formatNumber(vendor.total_contracts)} contracts totaling ${formatCompactMXN(vendor.total_value_mxn)}`
  if (vendor.years_active > 1) {
    opening += ` over ${vendor.years_active} years`
  }
  opening += '.'

  if (vendor.industry_name) {
    opening += ` Classified as ${vendor.industry_name}.`
  }
  paragraphs.push({ text: opening })

  // Risk assessment
  if (vendor.avg_risk_score != null) {
    const riskPct = formatRiskScorePercent(vendor.avg_risk_score)
    const highPct = vendor.high_risk_pct.toFixed(0)
    let riskText = `Average risk score of ${riskPct} with ${highPct}% of contracts flagged as high or critical risk.`

    if (riskProfile?.risk_trend) {
      const trendWord = riskProfile.risk_trend === 'worsening' ? 'worsening' :
        riskProfile.risk_trend === 'improving' ? 'improving' : 'stable'
      riskText += ` Risk trend is ${trendWord} over recent years.`
    }

    if (riskProfile?.risk_vs_sector_avg != null) {
      const diff = riskProfile.risk_vs_sector_avg
      if (Math.abs(diff) > 0.05) {
        const direction = diff > 0 ? 'above' : 'below'
        riskText += ` This is ${Math.abs(diff * 100).toFixed(0)}pp ${direction} the sector average.`
      }
    }

    if (riskProfile?.risk_percentile != null) {
      riskText += ` Ranks in the ${riskProfile.risk_percentile.toFixed(0)}th percentile for risk.`
    }

    const severity = vendor.avg_risk_score >= 0.60 ? 'critical' :
      vendor.avg_risk_score >= 0.40 ? 'warning' : 'info'
    paragraphs.push({ text: riskText, severity })
  }

  // Anomaly assessment
  if (vendor.pct_anomalous != null && vendor.pct_anomalous > 0.15) {
    paragraphs.push({
      text: `${(vendor.pct_anomalous * 100).toFixed(0)}% of this vendor's contracts are statistically anomalous based on Mahalanobis distance — significantly above the population average of ~14%.`,
      severity: vendor.pct_anomalous > 0.4 ? 'critical' : 'warning',
    })
  }

  // Procurement patterns
  const patterns: string[] = []
  if (vendor.direct_award_pct > 50) {
    patterns.push(`${vendor.direct_award_pct.toFixed(0)}% direct awards`)
  }
  if (vendor.single_bid_pct > 15) {
    patterns.push(`${vendor.single_bid_pct.toFixed(0)}% single-bid wins`)
  }
  if (vendor.total_institutions > 10) {
    patterns.push(`works with ${vendor.total_institutions} institutions`)
  }
  if (patterns.length > 0) {
    paragraphs.push({ text: `Procurement patterns: ${patterns.join(', ')}.` })
  }

  return paragraphs
}

// ============================================================================
// Institution Narrative
// ============================================================================

export function buildInstitutionNarrative(
  inst: InstitutionDetailResponse,
  topVendors?: InstitutionVendorItem[] | null,
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []

  // Opening
  const sizeLabel = (inst.total_contracts ?? 0) > 100000 ? 'One of Mexico\'s largest procurement entities' :
    (inst.total_contracts ?? 0) > 10000 ? 'A major government institution' :
    (inst.total_contracts ?? 0) > 1000 ? 'A mid-size government institution' : 'A smaller government entity'

  let opening = sizeLabel
  if (inst.institution_type) {
    opening += ` (${inst.institution_type})`
  }
  opening += `. Awarded ${formatNumber(inst.total_contracts ?? 0)} contracts totaling ${formatCompactMXN(inst.total_amount_mxn ?? 0)}.`
  if (inst.geographic_scope) {
    opening += ` Scope: ${inst.geographic_scope}.`
  }
  paragraphs.push({ text: opening })

  // Risk profile
  if (inst.high_risk_percentage != null) {
    const riskPct = inst.high_risk_percentage.toFixed(1)
    let riskText = `${riskPct}% of contracts flagged as high or critical risk.`
    if (inst.risk_baseline != null) {
      riskText += ` Institution risk baseline: ${(inst.risk_baseline * 100).toFixed(0)}%.`
    }
    const severity = inst.high_risk_percentage > 20 ? 'critical' :
      inst.high_risk_percentage > 10 ? 'warning' : 'info'
    paragraphs.push({ text: riskText, severity })
  }

  // Vendor concentration
  if (topVendors && topVendors.length > 0) {
    const totalValue = inst.total_amount_mxn ?? 0
    const top5Value = topVendors.slice(0, 5).reduce((s, v) => s + v.total_value_mxn, 0)
    if (totalValue > 0) {
      const top5Pct = ((top5Value / totalValue) * 100).toFixed(0)
      const topVendorName = topVendors[0].vendor_name
      const topVendorPct = ((topVendors[0].total_value_mxn / totalValue) * 100).toFixed(0)
      let vendorText = `Top 5 vendors account for ${top5Pct}% of total spending.`
      vendorText += ` Largest: ${topVendorName} (${topVendorPct}%, ${formatCompactMXN(topVendors[0].total_value_mxn)}).`
      const severity = Number(top5Pct) > 60 ? 'warning' : 'info'
      paragraphs.push({ text: vendorText, severity })
    }
  }

  // Data quality
  if (inst.classification_confidence != null && inst.classification_confidence < 0.7) {
    paragraphs.push({
      text: `Note: Classification confidence is ${(inst.classification_confidence * 100).toFixed(0)}% — this institution's sector assignment may be imprecise.`,
      severity: 'warning',
    })
  }

  return paragraphs
}

// ============================================================================
// Contract Narrative
// ============================================================================

export function buildContractNarrative(contract: ContractDetail): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []

  // Opening
  const procedureType = contract.is_direct_award ? 'direct award' :
    contract.is_single_bid ? 'single-bid competitive procedure' :
    contract.procedure_type_normalized || 'procurement procedure'

  let opening = `A ${formatCompactMXN(contract.amount_mxn)} ${procedureType}`
  if (contract.vendor_name) {
    opening += ` to ${contract.vendor_name}`
  }
  if (contract.sector_name) {
    const sectorEN = SECTOR_NAMES_EN[contract.sector_name.toLowerCase()] || contract.sector_name
    opening += ` in the ${sectorEN} sector`
  }
  opening += '.'

  if (contract.description) {
    const desc = contract.description.length > 200
      ? contract.description.slice(0, 200) + '...'
      : contract.description
    opening += ` ${desc}`
  }
  paragraphs.push({ text: opening })

  // Risk assessment
  if (contract.risk_score != null) {
    const score = formatRiskScorePercent(contract.risk_score)
    let riskText = `Risk score: ${score} (${contract.risk_level ?? 'unknown'}).`

    if (contract.risk_confidence_lower != null && contract.risk_confidence_upper != null) {
      const ciLow = formatRiskScorePercent(contract.risk_confidence_lower)
      const ciHigh = formatRiskScorePercent(contract.risk_confidence_upper)
      riskText += ` 95% confidence interval: ${ciLow} to ${ciHigh}.`
    }

    if (contract.risk_factors && contract.risk_factors.length > 0) {
      riskText += ` Triggered by ${contract.risk_factors.length} risk factor${contract.risk_factors.length > 1 ? 's' : ''}.`
    }

    const severity = (contract.risk_level === 'critical') ? 'critical' :
      (contract.risk_level === 'high') ? 'warning' : 'info'
    paragraphs.push({ text: riskText, severity })
  }

  // Procurement timeline
  const dates: string[] = []
  if (contract.publication_date) dates.push(`published ${contract.publication_date}`)
  if (contract.award_date) dates.push(`awarded ${contract.award_date}`)
  if (contract.start_date) dates.push(`started ${contract.start_date}`)
  if (contract.end_date) dates.push(`ending ${contract.end_date}`)
  if (dates.length > 1) {
    paragraphs.push({ text: `Timeline: ${dates.join(' \u2192 ')}.` })
  }

  // Data quality note
  if (contract.data_quality_grade && ['D', 'F'].includes(contract.data_quality_grade)) {
    paragraphs.push({
      text: `Data quality: Grade ${contract.data_quality_grade} (${contract.source_structure || 'unknown'} structure). Risk scores may be less reliable for this contract.`,
      severity: 'warning',
    })
  }

  return paragraphs
}

// ============================================================================
// Sector Narrative
// ============================================================================

export function buildSectorNarrative(
  sector: SectorStatistics,
  allSectors?: SectorStatistics[],
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []
  const sectorCode = sector.sector_code
  const desc = getSectorDescription(sectorCode)

  // Description
  paragraphs.push({ text: desc.short })

  // Size context
  let sizeText = `${formatNumber(sector.total_contracts)} contracts totaling ${formatCompactMXN(sector.total_value_mxn)}`
  if (allSectors && allSectors.length > 1) {
    const totalAll = allSectors.reduce((s, sec) => s + sec.total_value_mxn, 0)
    const pctOfTotal = ((sector.total_value_mxn / totalAll) * 100).toFixed(1)
    sizeText += ` (${pctOfTotal}% of all procurement)`

    // Rank
    const sorted = [...allSectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    const rank = sorted.findIndex(s => s.sector_code === sectorCode) + 1
    if (rank <= 3) {
      sizeText += ` — ${rank === 1 ? 'the largest' : rank === 2 ? 'the 2nd largest' : 'the 3rd largest'} sector by spending`
    }
  }
  sizeText += '.'
  paragraphs.push({ text: sizeText })

  // Risk context
  const highRiskPct = sector.high_risk_pct
  let riskText = `${highRiskPct.toFixed(1)}% high or critical risk.`

  if (allSectors && allSectors.length > 1) {
    const avgHighRisk = allSectors.reduce((s, sec) => s + sec.high_risk_pct, 0) / allSectors.length
    const diff = highRiskPct - avgHighRisk
    if (Math.abs(diff) > 2) {
      riskText += ` ${diff > 0 ? 'Above' : 'Below'} the ${avgHighRisk.toFixed(1)}% cross-sector average by ${Math.abs(diff).toFixed(1)}pp.`
    }

    const riskRank = [...allSectors].sort((a, b) => b.high_risk_pct - a.high_risk_pct)
    const riskPos = riskRank.findIndex(s => s.sector_code === sectorCode) + 1
    if (riskPos === 1) {
      riskText += ` The highest-risk sector.`
    } else if (riskPos <= 3) {
      riskText += ` Among the top 3 highest-risk sectors.`
    }
  }

  const daRate = sector.direct_award_pct.toFixed(0)
  const sbRate = sector.single_bid_pct.toFixed(0)
  riskText += ` Direct awards: ${daRate}%. Single bids: ${sbRate}%.`

  if (allSectors && allSectors.length > 1) {
    const avgDA = allSectors.reduce((s, sec) => s + sec.direct_award_pct, 0) / allSectors.length
    if (sector.direct_award_pct > avgDA + 10) {
      riskText += ` Direct award rate is notably above average, suggesting systemic avoidance of competitive bidding.`
    }
  }

  const severity = highRiskPct > 15 ? 'critical' :
    highRiskPct > 10 ? 'warning' : 'info'
  paragraphs.push({ text: riskText, severity })

  // Corruption context
  paragraphs.push({ text: desc.corruptionContext, severity: 'info' })

  return paragraphs
}

// ============================================================================
// Pattern Narrative
// ============================================================================

export function buildPatternNarrative(
  _patternType: string,
  count: number,
  total?: number,
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []

  const pctText = total ? ` (${((count / total) * 100).toFixed(1)}% of all contracts)` : ''
  paragraphs.push({
    text: `${formatNumber(count)} contracts matched this pattern${pctText}.`,
  })

  return paragraphs
}

// ============================================================================
// Filter Summary Narrative
// ============================================================================

export function buildFilterNarrative(
  totalResults: number,
  filters: Record<string, unknown>,
  stats?: { highRiskPct?: number; avgRisk?: number; sectorAvgHighRisk?: number },
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = []
  const parts: string[] = []

  if (filters.sector_id) parts.push(`${SECTOR_NAMES_EN[String(filters.sector_name)] || 'selected'} sector`)
  if (filters.year) parts.push(`from ${filters.year}`)
  if (filters.risk_level) parts.push(`${String(filters.risk_level)} risk`)
  if (filters.is_direct_award) parts.push('direct awards only')
  if (filters.is_single_bid) parts.push('single-bid only')
  if (filters.vendor_name) parts.push(`vendor: "${filters.vendor_name}"`)

  let text = `Showing ${formatNumber(totalResults)} contracts`
  if (parts.length > 0) {
    text += ` (${parts.join(', ')})`
  }
  text += '.'

  if (stats?.highRiskPct != null) {
    const pct = (stats.highRiskPct * 100).toFixed(0)
    text += ` ${pct}% flagged high/critical risk`
    if (stats.sectorAvgHighRisk != null) {
      const avg = (stats.sectorAvgHighRisk * 100).toFixed(0)
      const diff = stats.highRiskPct * 100 - stats.sectorAvgHighRisk * 100
      if (Math.abs(diff) > 3) {
        text += ` — ${diff > 0 ? 'above' : 'below'} the ${avg}% sector average`
      }
    }
    text += '.'
  }

  paragraphs.push({ text })
  return paragraphs
}
