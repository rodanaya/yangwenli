/**
 * buildVendorFlags — pure function that collapses every "this vendor is
 * suspicious" signal on a Vendor dossier into a single priority-sorted
 * flag list, ready to hand to <PriorityAlert>.
 *
 * This replaces:
 *   - 5 stacked alert banners in VendorProfile (Critical/EFOS/ARIA/GT/Sanctions)
 *   - the inline "Why is this vendor risky?" block at L1673
 *   - the PlainLanguageRiskCard pills
 *
 * All three rendered variants of the same underlying facts, producing
 * 4-5× repetition of EFOS/GT status on one page. Now there is one
 * computation feeding one component.
 */
import type {
  AriaQueueItem,
  CoBiddersResponse,
  VendorDetailResponse,
  VendorExternalFlags,
  VendorGroundTruthStatus,
  VendorWaterfallContribution,
} from '@/api/types'
import {
  sortFlagsByPriority,
  type PriorityFlag,
} from '@/components/ui/PriorityAlert'
import { RISK_THRESHOLDS } from '@/lib/constants'

export interface BuildFlagsInput {
  vendor: VendorDetailResponse
  externalFlags?: VendorExternalFlags | null
  groundTruthStatus?: VendorGroundTruthStatus | null
  coBidders?: CoBiddersResponse | null
  aria?: AriaQueueItem | null
  waterfall?: VendorWaterfallContribution[] | null
  /**
   * i18n translator — pass the `t` function from useTranslation().
   * Falls back to English defaults when a key is missing so the function is
   * unit-testable without a real i18n runtime.
   */
  t: (key: string, vars?: Record<string, string | number>) => string
}

/**
 * Returns flags ordered by severity (critical → high → medium → info).
 * Multiple flags of the same severity preserve insertion order.
 */
export function buildVendorFlags(input: BuildFlagsInput): PriorityFlag[] {
  const { vendor, externalFlags, groundTruthStatus, coBidders, aria, waterfall, t } = input
  const flags: PriorityFlag[] = []

  // ─── Ground truth (confirmed cases from model training) ────────────────
  if (groundTruthStatus?.is_known_bad) {
    const caseCount = groundTruthStatus.cases?.length ?? 0
    const firstSlug = groundTruthStatus.cases?.[0]?.scandal_slug
    flags.push({
      key: 'gt-confirmed',
      severity: 'critical',
      headline: t('vendorFlags.groundTruth.headline'),
      detail:
        caseCount > 0
          ? t('vendorFlags.groundTruth.detail', { n: caseCount })
          : undefined,
      // § 7 dossier spec: GT case flag must be clickable → /cases/:slug
      linkTo: firstSlug ? `/cases/${firstSlug}` : undefined,
    })
  }

  // ─── SAT EFOS (tax-authority ghost-company registry) ───────────────────
  const efosStage = externalFlags?.sat_efos?.stage
  if (efosStage === 'definitivo') {
    flags.push({
      key: 'efos-definitivo',
      severity: 'critical',
      headline: t('vendorFlags.efosDefinitivo.headline'),
      detail: t('vendorFlags.efosDefinitivo.detail'),
    })
  } else if (efosStage === 'presunto') {
    flags.push({
      key: 'efos-presunto',
      severity: 'high',
      headline: t('vendorFlags.efosPresunto.headline'),
      detail: t('vendorFlags.efosPresunto.detail'),
    })
  }

  // ─── SFP sanctions ──────────────────────────────────────────────────────
  const sfpCount = externalFlags?.sfp_sanctions?.length ?? 0
  if (sfpCount > 0) {
    flags.push({
      key: 'sfp',
      severity: 'critical',
      headline: t('vendorFlags.sfp.headline', { n: sfpCount }),
      detail: t('vendorFlags.sfp.detail'),
    })
  }

  // ─── ARIA investigation tier ───────────────────────────────────────────
  if (aria?.ips_tier === 1) {
    flags.push({
      key: 'aria-t1',
      severity: 'critical',
      headline: t('vendorFlags.ariaT1.headline'),
      detail: aria.primary_pattern
        ? t('vendorFlags.ariaT1.detail', { pattern: aria.primary_pattern })
        : undefined,
      linkTo: `/aria/${aria.vendor_id}`,
    })
  } else if (aria?.ips_tier === 2) {
    flags.push({
      key: 'aria-t2',
      severity: 'high',
      headline: t('vendorFlags.ariaT2.headline'),
      detail: aria.primary_pattern
        ? t('vendorFlags.ariaT2.detail', { pattern: aria.primary_pattern })
        : undefined,
      linkTo: `/aria/${aria.vendor_id}`,
    })
  }

  // ─── § 8 False-positive guard — structural monopoly (BAXTER/FRESENIUS etc) ──
  // When set, ARIA/risk flags above are noise, not signal. Surface explicitly
  // so a journalist doesn't draw a false corruption inference.
  if (aria?.fp_structural_monopoly) {
    flags.push({
      key: 'fp-structural',
      severity: 'info',
      headline: t('vendorFlags.fpStructural.headline'),
      detail: t('vendorFlags.fpStructural.detail'),
    })
  }

  // ─── Model risk score ──────────────────────────────────────────────────
  const score = vendor.avg_risk_score ?? 0
  if (score >= RISK_THRESHOLDS.critical) {
    flags.push({
      key: 'risk-critical',
      severity: 'critical',
      headline: t('vendorFlags.riskCritical.headline', { pct: (score * 100).toFixed(0) }),
    })
  } else if (score >= RISK_THRESHOLDS.high) {
    flags.push({
      key: 'risk-high',
      severity: 'high',
      headline: t('vendorFlags.riskHigh.headline', { pct: (score * 100).toFixed(0) }),
    })
  }

  // ─── Procurement patterns ──────────────────────────────────────────────
  const daPct = vendor.direct_award_rate_corrected ?? vendor.direct_award_pct ?? 0
  if (daPct > 70) {
    flags.push({
      key: 'direct-award',
      severity: 'high',
      headline: t('vendorFlags.highDirectAward.headline', { pct: daPct.toFixed(0) }),
    })
  }
  const sbPct = vendor.single_bid_pct ?? 0
  if (sbPct > 40) {
    flags.push({
      key: 'single-bid',
      severity: 'medium',
      headline: t('vendorFlags.highSingleBid.headline', { pct: sbPct.toFixed(0) }),
    })
  }

  // ─── Co-bidding clustering ─────────────────────────────────────────────
  const clustering = vendor.cobid_clustering_coeff ?? 0
  if (clustering > 0.6) {
    flags.push({
      key: 'clustering',
      severity: 'high',
      headline: t('vendorFlags.highClustering.headline', { pct: (clustering * 100).toFixed(0) }),
    })
  }
  const strongCoBid =
    coBidders?.co_bidders?.some(
      (cb) =>
        cb.relationship_strength === 'very_strong' ||
        cb.relationship_strength === 'strong'
    ) || (coBidders?.suspicious_patterns?.length ?? 0) > 0
  if (strongCoBid && clustering <= 0.6) {
    // Don't double-count if clustering flag already fired.
    flags.push({
      key: 'co-bidding',
      severity: 'medium',
      headline: t('vendorFlags.coBidding.headline'),
    })
  }

  // ─── Model primary driver (if waterfall available) ─────────────────────
  if (waterfall && waterfall.length > 0) {
    const topDriver = [...waterfall]
      .filter((f) => f.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)[0]
    if (topDriver && topDriver.z_score > 2) {
      flags.push({
        key: 'primary-driver',
        severity: 'medium',
        headline: t('vendorFlags.primaryDriver.headline', {
          factor: topDriver.label_en || topDriver.feature,
          z: topDriver.z_score.toFixed(1),
        }),
      })
    }
  }

  return sortFlagsByPriority(flags)
}
