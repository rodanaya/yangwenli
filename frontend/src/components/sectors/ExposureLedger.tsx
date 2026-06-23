/**
 * ExposureLedger module — shared contract + registry footer for /sectors WHO
 * "El Libro Mayor de la Exposición" (Confounded-Ledger redesign).
 *
 * HISTORY: this file once rendered "El Registro Auditado / The Audited
 * Register" — a sortable table that toggled against §B's ConfoundPlate. On
 * 2026-06-23 the two were MERGED: the Confound Plate became the single
 * registry view, the table's auditable data folded into the plate's hover/tap
 * dossier (SectorDossierCard, now carrying the DA-vs-OECD bullet + risk
 * trajectory), and the table's platform totals + caveat footnotes moved
 * beneath the plate as the exported `RegistrySummary`. The `ExposureLedger`
 * table component + its per-row item were retired in that merge.
 *
 * What this file still owns:
 *   - `LedgerRow` — the FROZEN row contract Sectors.tsx builds (do not change
 *     its shape; ConfoundPlate / confoundScales / SelfCaptureBand / the dossier
 *     all import it from here).
 *   - `intensityColor` / `compactCount` — shared §B/§C/dossier helpers.
 *   - `DAGGER_SECTORS` — the 3 sectors that carry a marginalia † (cross-links
 *     the plate rows to the footnotes in RegistrySummary).
 *   - `RegistrySummary` — the ∑ sum rule + model note + caveat footnotes,
 *     rendered beneath the plate (the ONLY home of platform totals).
 *
 * Contract notes:
 *   - Hex colours ONLY via style={{}} (className hex is silently stripped).
 *   - VaR is always "exposición señalada / model-flagged exposure" — never
 *     "probability of corruption". No green anywhere (Bible §3.10).
 *   - Currency via formatCompactMXN (bilingual; billones/MDP in ES).
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { SectorTrajectoryPoint } from '@/api/types'

// ─────────────────────────────────────────────────────────────────────────────
// Frozen contract — Sectors.tsx imports these.
// ─────────────────────────────────────────────────────────────────────────────
export interface LedgerRow {
  sectorId: number
  sectorCode: string   // key into SECTOR_COLORS / SECTOR_TEXT_COLORS
  name: string         // already-localized sector name
  varMxn: number       // high+critical value (the spine metric)
  criticalMxn: number  // critical-only value
  totalMxn: number     // sector total spend
  daPct: number        // direct_award_pct (0-100)
  sbPct: number        // single_bid_pct (0-100)
  contracts: number
  vendors: number
  // ── Non-value axes (rev 2) ──────────────────────────────────────────────
  avgRiskScore: number // intensity (0–1) — model's mean risk, size-independent
  criticalCount: number // # critical-level contracts (composition numerator; contracts = denominator)
  topInstitution: { id: number; name: string; siglas?: string | null; sharePct: number } | null // capture / WHO
  trajectory: SectorTrajectoryPoint[] // risk-by-year series for the per-row sparkline
}

// Sectors that carry a marginalia dagger (†) — cross-links plate rows to the
// caveat footnotes below. Exported for ConfoundPlate's row names.
export const DAGGER_SECTORS = new Set(['salud', 'agricultura', 'trabajo'])

// ─────────────────────────────────────────────────────────────────────────────
// Tiny shared helpers (intensityColor / compactCount shared with §B/§C/dossier)
// ─────────────────────────────────────────────────────────────────────────────

/** Compact integer count: 1.08M · 65.7k · 942. Local per spec (not currency). */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number): number =>
  rows.reduce((acc, r) => acc + pick(r), 0)

// Intensity dot colour — RISK_COLORS by level, but never green for low (Bible §3.10).
export function intensityColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[level]
}

// EB Garamond italic — marginalia / register notes.
const MARGIN_NOTE_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontSize: 11,
  lineHeight: 1.45,
  color: 'var(--color-text-secondary)',
}

// ─────────────────────────────────────────────────────────────────────────────
// Marginalia note strings — caveat register (Hacienda note promoted to §A/§B).
// ─────────────────────────────────────────────────────────────────────────────
type MarginNote = { id: string; text: string }

function buildMarginNotes(lang: 'en' | 'es'): MarginNote[] {
  return [
    {
      id: 'agricultura',
      text:
        lang === 'es'
          ? '† Agricultura: Segalmex domina el conjunto de entrenamiento (6,326 contratos GT).'
          : '† Agriculture: Segalmex dominates the training set (6,326 GT contracts).',
    },
    {
      id: 'salud-trabajo',
      text:
        lang === 'es'
          ? '† Salud: riesgo ponderado por valor · † Trabajo: N pequeño.'
          : '† Health: value-weighted risk · † Labor: small N.',
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// RegistrySummary — the ∑ sum rule + model note + caveat footnotes, rendered
// beneath the plate. The ONLY home of platform totals. (Merged out of the
// retired Audited Register table; the per-row DA bullet / intensity / trajectory
// now live in the plate's hover/tap dossier.)
// ─────────────────────────────────────────────────────────────────────────────
export function RegistrySummary({ rows, lang }: { rows: LedgerRow[]; lang: 'en' | 'es' }) {
  const totalVaR = sum(rows, (r) => r.varMxn)
  const totalSpend = sum(rows, (r) => r.totalMxn)
  const totalContracts = sum(rows, (r) => r.contracts)
  const varSharePct = totalSpend > 0 ? (totalVaR / totalSpend) * 100 : 0
  const notes = buildMarginNotes(lang)

  if (rows.length === 0) return null

  return (
    <div className="min-w-0">
      {/* ── ∑ Sum rule — double hairline, the ONLY home of platform totals. ── */}
      <div
        className="py-2.5"
        style={{
          borderTop: '3px double var(--color-text-muted)',
          borderBottom: '3px double var(--color-text-muted)',
        }}
      >
        <p
          className="font-mono tabular-nums px-3"
          style={{ fontSize: 11, letterSpacing: '0.02em', color: 'var(--color-text-primary)', lineHeight: 1.55 }}
        >
          {lang === 'es' ? (
            <>
              ∑ {rows.length} SECTORES · {formatCompactMXN(totalVaR)} exposición señalada (
              {varSharePct.toFixed(1)}% del valor) · {formatCompactMXN(totalSpend)} gasto ·{' '}
              {totalContracts.toLocaleString('es-MX')} contratos
            </>
          ) : (
            <>
              ∑ {rows.length} SECTORS · {formatCompactMXN(totalVaR)} model-flagged exposure (
              {varSharePct.toFixed(1)}% of value) · {formatCompactMXN(totalSpend)} spend ·{' '}
              {totalContracts.toLocaleString('en-US')} contracts
            </>
          )}
        </p>
      </div>

      {/* Model note line — the merged registry's reading instruction. */}
      <p
        className="mt-2.5 px-3 font-mono"
        style={{ fontSize: 10, letterSpacing: '0.02em', color: 'var(--color-text-muted)', lineHeight: 1.5 }}
      >
        {lang === 'es'
          ? 'Modelo v0.8.5 · exposición = MXN vía contratos alto+crítico · intensidad = riesgo medio del sector · indicador estadístico, no determinación legal · pase el cursor o toque una fila → dossier · '
          : 'Model v0.8.5 · exposure = MXN via high+critical contracts · intensity = sector mean risk · statistical indicator, not a legal determination · hover or tap a row → dossier · '}
        <Link
          to="/methodology"
          className="underline decoration-1 underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {lang === 'es' ? 'metodología ↗' : 'methodology ↗'}
        </Link>
      </p>

      {/* Footnote register — caveat notes, shown at all breakpoints. */}
      <ol className="mt-4 px-3 space-y-2" style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
        {notes.map((n, i) => (
          <li key={n.id} className="flex gap-2">
            <span
              className="font-mono shrink-0 tabular-nums"
              style={{ fontSize: 9.5, color: 'var(--color-text-muted)', marginTop: 2 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={MARGIN_NOTE_STYLE}>{n.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
