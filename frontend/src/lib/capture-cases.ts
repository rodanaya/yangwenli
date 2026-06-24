/**
 * CAPTURE_CASE_MAP — verified (vendor_id → documented scandal) bridges for /captura.
 *
 * ONLY pairs that resolve to a real `/cases/:slug` (present in
 * `procurement_scandals`) are listed. Absent a match, NO case chip is rendered —
 * never a fabricated link. This keeps the W8 "make capture concrete" promise
 * honest: the documented climber (EDENRED) leads Exhibit A, ASIPONA (no case)
 * stays as the unlinked collapse exemplar.
 *
 * Verified 2026-06-24 against `procurement_scandals` (both slugs present).
 */

export interface CaptureCaseLink {
  /** Resolves via <EntityIdentityChip type="case" id={slug}> → /cases/:slug */
  slug: string
  label_en: string
  label_es: string
}

export const CAPTURE_CASE_MAP: Record<number, CaptureCaseLink> = {
  // EDENRED MEXICO (SPF) — voucher monopoly
  44372: {
    slug: 'edenred-voucher-monopoly',
    label_en: 'voucher monopoly',
    label_es: 'monopolio de vales',
  },
  // TOKA INTERNACIONAL (CIJ + INAPAM) — voucher / IT monopoly
  102627: {
    slug: 'toka-it-monopoly',
    label_en: 'voucher & IT monopoly',
    label_es: 'monopolio de vales y TI',
  },
}

export function captureCaseFor(vendorId: number): CaptureCaseLink | null {
  return CAPTURE_CASE_MAP[vendorId] ?? null
}
