/**
 * journalistsMagnitude — pure, unit-testable helpers for the «La Línea del Saqueo»
 * newsroom redesign (DESIGNUS spec journalists-2026-06-22).
 *
 * The /journalists index plots 13 hardcoded investigations on a time × magnitude
 * swimlane. These helpers turn each investigation's editorial metadata
 * (amount / contracts / status / yearSpan) into the geometry the chart needs:
 *   - a COMPOSITE magnitude that is never null (fixes the broken amount-sort, W4)
 *   - an ORDINAL severity key for the sequential color ramp (replaces nominal
 *     fraud-type confetti, W3)
 *   - a parsed [start, end] year span for x-positioning on the 2002–2025 axis
 *
 * No React, no color values — components map SeverityKey → RISK_COLORS.
 */

export type JStatus = 'procesado' | 'auditado' | 'reporteado' | 'solo_datos'
export type SeverityKey = 'critical' | 'high' | 'medium' | 'low'

export interface MagItem {
  /** MXN billions; 0 for pattern-only stories (Ghost Army, Intermediary, …). */
  amount: number
  contracts: number
  status: JStatus
  yearSpan?: string
  /** Subtitle, used as a year-span fallback when yearSpan is absent. */
  sub?: string
}

const STATUS_WEIGHT: Record<JStatus, number> = {
  procesado: 1.0,
  auditado: 0.9,
  reporteado: 0.7,
  solo_datos: 0.4,
}

/**
 * Composite magnitude — NEVER null. Uses the real peso amount (billions) when
 * present; otherwise a contracts-and-status-derived proxy so every row has a
 * real rank and bar height. Governs ORDER + height only — pattern rows still
 * render hollow (no faked length) regardless of this value.
 */
export function compositeMag(item: MagItem): number {
  if (item.amount > 0) return item.amount
  return Math.max(1, item.contracts / 100_000) * STATUS_WEIGHT[item.status]
}

/** amount === 0 → a structural pattern (rendered hollow, no single-peso magnitude). */
export function isPatternRow(item: MagItem): boolean {
  return item.amount <= 0
}

/**
 * Ordinal severity (NOT nominal fraud_type) → drives the sequential RISK_COLORS
 * ramp. Proxy from status × amount; deterministic, always defined.
 */
export function severityKey(item: MagItem): SeverityKey {
  if (item.amount >= 500) return 'critical'
  if ((item.status === 'procesado' || item.status === 'auditado') && item.amount >= 200) return 'critical'
  if (item.amount >= 100) return 'high'
  if (item.amount > 0 && item.status === 'reporteado') return 'high'
  if (item.amount <= 0 && item.status === 'solo_datos') return 'low'
  return 'medium'
}

const SEVERITY_ORDER: Record<SeverityKey, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/** Lower = more severe (critical 0 … low 3) — for the severity sort axis. */
export function severityRankNum(item: MagItem): number {
  return SEVERITY_ORDER[severityKey(item)]
}

/** Parse "2002–2025" (or a single year) → [start, end], clamped to the 2002–2025 axis. */
export function parseYearSpan(yearSpan?: string, sub?: string): [number, number] {
  const src = yearSpan || sub || ''
  const range = src.match(/(\d{4})\s*[–-]\s*(\d{4})/)
  if (range) {
    const a = Number(range[1])
    const b = Number(range[2])
    return [Math.min(a, b), Math.max(a, b)]
  }
  const single = src.match(/(20\d{2})/)
  if (single) {
    const y = Number(single[1])
    return [y, y]
  }
  return [2002, 2025]
}

/** Last year of the span — for the recency/chronology axis. */
export function lastYear(item: MagItem): number {
  return parseYearSpan(item.yearSpan, item.sub)[1]
}

/** First year of the span — for the chronology axis. */
export function firstYear(item: MagItem): number {
  return parseYearSpan(item.yearSpan, item.sub)[0]
}
