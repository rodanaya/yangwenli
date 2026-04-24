/**
 * Pattern inference for co-bidding pairs.
 *
 * Given only the three counts we actually have from the API
 * (shared_procedures, vendor_a_procedures, vendor_b_procedures),
 * classify the relationship into one of four forensic patterns.
 *
 * Real bid-rigging vocabulary — see RISK_METHODOLOGY_v3 §co-bidding.
 */

import type { CollusionPair } from '@/api/types'

export type CollusionPattern =
  | 'cover'        // asymmetric — one vendor's bids shadow the other's
  | 'mutual'       // both overlap very highly — joint operation
  | 'rotation'     // moderate overlap, many shared procs — taking turns
  | 'unknown'      // not enough signal to classify

export interface PairMetrics {
  shareA: number  // % of A's procedures that are shared with B
  shareB: number  // % of B's procedures that are shared with A
  asymmetry: number  // |shareA − shareB|, 0..100
  pattern: CollusionPattern
}

export function computePairMetrics(pair: CollusionPair): PairMetrics {
  const shareA =
    pair.vendor_a_procedures > 0
      ? (pair.shared_procedures / pair.vendor_a_procedures) * 100
      : 0
  const shareB =
    pair.vendor_b_procedures > 0
      ? (pair.shared_procedures / pair.vendor_b_procedures) * 100
      : 0
  const asymmetry = Math.abs(shareA - shareB)

  let pattern: CollusionPattern = 'unknown'
  if (shareA >= 70 && shareB >= 70) {
    pattern = 'mutual'
  } else if (asymmetry >= 40 && Math.max(shareA, shareB) >= 70) {
    pattern = 'cover'
  } else if (
    pair.shared_procedures >= 20 &&
    asymmetry < 30 &&
    Math.min(shareA, shareB) >= 15
  ) {
    pattern = 'rotation'
  }

  return { shareA, shareB, asymmetry, pattern }
}

/**
 * Single sentence describing the pair's behavioural pattern, in Spanish.
 * Used as the deck quote in PairDossierRow. No AI, no templating libs —
 * plain string interpolation, deterministic for a given pair.
 */
export function quoteFor(pair: CollusionPair, m: PairMetrics): string {
  const a = truncateName(pair.vendor_name_a)
  const b = truncateName(pair.vendor_name_b)

  switch (m.pattern) {
    case 'cover': {
      // One dominates: the one with the HIGHER share is the "shadow" bidder
      // (every time they bid, the other is also bidding).
      const shadow = m.shareA >= m.shareB ? a : b
      const leader = m.shareA >= m.shareB ? b : a
      const shadowPct = Math.max(m.shareA, m.shareB).toFixed(0)
      return `${shadow} comparece en el ${shadowPct}% de sus procedimientos con ${leader} — patrón consistente con licitación de cobertura.`
    }
    case 'mutual': {
      const avg = ((m.shareA + m.shareB) / 2).toFixed(0)
      return `Ambos aparecen juntos en más del ${avg}% de sus procedimientos — operación prácticamente conjunta.`
    }
    case 'rotation': {
      return `${pair.shared_procedures} procedimientos compartidos con participación recíproca — patrón consistente con rotación de adjudicaciones.`
    }
    default:
      return `${pair.shared_procedures} procedimientos compartidos entre ambos proveedores.`
  }
}

function truncateName(name: string, max: number = 32): string {
  if (name.length <= max) return name
  return name.slice(0, max - 1).trimEnd() + '…'
}

/**
 * Display label for a pattern — used in kickers and badges.
 */
export function patternLabel(p: CollusionPattern): string {
  switch (p) {
    case 'cover':
      return 'LICITACIÓN DE COBERTURA'
    case 'mutual':
      return 'DEPENDENCIA MUTUA'
    case 'rotation':
      return 'ROTACIÓN DE TURNOS'
    default:
      return 'PATRÓN NO CLASIFICADO'
  }
}

/**
 * Kicker-color class for a pattern.
 * Matches the editorial grammar established in Wave A.
 */
export function patternKickerClass(p: CollusionPattern): string {
  switch (p) {
    case 'cover':
      return 'text-kicker text-kicker--investigation'
    case 'mutual':
      return 'text-kicker text-kicker--investigation'
    case 'rotation':
      return 'text-kicker text-kicker--analysis'
    default:
      return 'text-kicker text-text-muted'
  }
}

/**
 * Accent hex for a pattern — used for the 2px left edge of flagged rows
 * and for the asymmetric arrow fill.
 */
export function patternAccent(p: CollusionPattern): string {
  switch (p) {
    case 'cover':
      return '#ef4444' // red-500
    case 'mutual':
      return '#dc2626' // red-600 (more severe)
    case 'rotation':
      return '#f59e0b' // amber-500
    default:
      return '#71717a' // zinc-500
  }
}
