/**
 * ExposureLedger — M3v2 "El Libro Mayor de la Exposición / The Exposure Ledger".
 *
 * Owner: FALCO (StarFox M3v2). Implements §1 (CumulativeRibbon) and §2–§4
 * (THE LEDGER · marginalia rail · ∑ sum rule) of `.claude/designs/M3v2-spec.md`.
 *
 * The page IS a ranked exposure ledger — an auditor's working paper. Every
 * per-sector metric lives in exactly one place on one table sorted by VaR
 * (model-flagged MXN through high+critical contracts). The ∑ sum rule is the
 * ONLY home of platform totals.
 *
 * Contract (FROZEN — PEPPY imports these; do not deviate):
 *   - LedgerRow / CumulativeRibbon / ExposureLedger exported below.
 *   - `rows` arrive sorted varMxn-descending; both components tolerate any
 *     row count > 0.
 *
 * Design rules enforced:
 *   - Hex colours ONLY via style={{}} (className hex is silently stripped — FM-7).
 *   - Big numbers: EB Garamond italic 800 tabular.
 *   - VaR is always "exposición señalada / model-flagged exposure" — never
 *     "probability of corruption".
 *   - No green anywhere for low/clean (Bible §3.10).
 *   - Currency via formatCompactMXN (bilingual; handles billones/MDP in ES).
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS, OECD_DIRECT_AWARD_LIMIT, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { EditorialSparkline } from '@/components/charts/editorial'
import type { SectorTrajectoryPoint } from '@/api/types'

// ─────────────────────────────────────────────────────────────────────────────
// Frozen contract — PEPPY (Sectors.tsx) imports these.
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

// Sectors that carry a marginalia dagger (†) on the index.
const DAGGER_SECTORS = new Set(['salud', 'agricultura', 'trabajo'])

// OECD direct-award ceiling, as a percentage (0–100) for this surface's copy.
// Single source: constants.ts OECD_DIRECT_AWARD_LIMIT (anti-pattern A7 — never
// retype the limit per surface; the legacy slope chart's hardcoded 25% is gone).
const OECD_DA_CEILING = OECD_DIRECT_AWARD_LIMIT * 100

// ─────────────────────────────────────────────────────────────────────────────
// Tiny local helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Compact integer count: 1.08M · 65.7k · 942. Local per spec (not currency). */
function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const sectorFill = (code: string): string => SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
const sectorTextFill = (code: string): string => SECTOR_TEXT_COLORS[code] ?? SECTOR_TEXT_COLORS.otros

const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number): number =>
  rows.reduce((acc, r) => acc + pick(r), 0)

// Kicker / column-label typography — mono, micro, uppercase, wide tracking, muted.
const KICKER_STYLE: CSSProperties = {
  fontSize: 9.5,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
}

// Big-number typography — serif italic 800 tabular (FM-7 / spec §1).
const BIGNUM_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
}

// EB Garamond italic 500 — the sector name (row link surface).
const SERIF_NAME_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 500,
}

// EB Garamond italic — marginalia / register notes.
const MARGIN_NOTE_STYLE: CSSProperties = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontSize: 11,
  lineHeight: 1.45,
  color: 'var(--color-text-secondary)',
}

// Direction of a risk trajectory over its series — rising risk is the signal we tint.
function trajectoryDirection(traj: SectorTrajectoryPoint[]): { glyph: string; rising: boolean } {
  if (!traj || traj.length < 2) return { glyph: '·', rising: false }
  const delta = traj[traj.length - 1].avg_risk - traj[0].avg_risk
  if (delta > 0.02) return { glyph: '↑', rising: true }
  if (delta < -0.02) return { glyph: '↓', rising: false }
  return { glyph: '→', rising: false }
}

// Intensity dot colour — RISK_COLORS by level, but never green for low (Bible §3.10).
function intensityColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[level]
}

// Intensity level word, localized + compact.
function intensityWord(score: number, lang: 'en' | 'es'): string {
  const level = getRiskLevelFromScore(score)
  if (lang === 'es') return { critical: 'crít', high: 'alto', medium: 'med', low: 'bajo' }[level]
  return level
}

// ─────────────────────────────────────────────────────────────────────────────
// §1 — CumulativeRibbon (proof-of-lede)
// ─────────────────────────────────────────────────────────────────────────────
export function CumulativeRibbon({
  rows,
  lang,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
}) {
  const totalVaR = sum(rows, (r) => r.varMxn) || 1

  // Top-3 share, computed (never hardcoded).
  const top3Share = rows.slice(0, 3).reduce((acc, r) => acc + r.varMxn, 0) / totalVaR
  const top3Pct = (top3Share * 100).toFixed(1)

  // Labels: top-3 sector names, then a single "resto / rest" tail label.
  const topThree = rows.slice(0, 3)

  return (
    <figure className="m-0">
      <figcaption
        className="font-mono flex items-baseline justify-between mb-1.5"
        style={KICKER_STYLE}
      >
        <span>{lang === 'es' ? 'Exposición acumulada' : 'Cumulative exposure'}</span>
        <span aria-hidden="true" style={{ letterSpacing: '0.1em' }}>
          50% · 75%
        </span>
      </figcaption>

      {/* The ribbon: 12 inline divs, widths ∝ VaR share, sector fills. */}
      <div
        className="relative flex w-full overflow-hidden rounded-[1px]"
        style={{ height: 40, border: '1px solid var(--color-border)' }}
        role="img"
        aria-label={
          lang === 'es'
            ? `Tres sectores concentran el ${top3Pct}% de la exposición señalada.`
            : `Three sectors hold ${top3Pct}% of model-flagged exposure.`
        }
      >
        {rows.map((r) => {
          const pct = (r.varMxn / totalVaR) * 100
          return (
            <div
              key={r.sectorId}
              style={{
                width: `${pct}%`,
                minWidth: pct > 0 ? 1 : 0,
                background: sectorFill(r.sectorCode),
              }}
              title={`${r.name} · ${pct.toFixed(1)}%`}
            />
          )
        })}

        {/* Cumulative tick hairlines at 50% / 75%. */}
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{ left: '50%', width: 1, background: 'var(--color-text-primary)', opacity: 0.45 }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{ left: '75%', width: 1, background: 'var(--color-text-primary)', opacity: 0.3 }}
        />
      </div>

      {/* Below: mono labels for top 3 + resto / rest. */}
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3 min-w-0 flex-wrap">
          {topThree.map((r) => (
            <span
              key={r.sectorId}
              className="font-mono tabular-nums whitespace-nowrap"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.04em',
                color: sectorTextFill(r.sectorCode),
                fontWeight: 600,
              }}
            >
              {r.name}
            </span>
          ))}
          <span
            className="font-mono whitespace-nowrap"
            style={{ fontSize: 9.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}
          >
            {lang === 'es' ? 'resto' : 'rest'}
          </span>
        </div>
      </div>

      {/* Annotation line — computed top-3 share. */}
      <p
        className="mt-1 font-mono text-center"
        style={{ fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}
      >
        {lang === 'es' ? `◄ top 3 = ${top3Pct}% ►` : `◄ top 3 = ${top3Pct}% ►`}
      </p>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VaRBar — linear scale, two-tone in ONE bar (critical + high).
// ─────────────────────────────────────────────────────────────────────────────
function VaRBar({ row, maxVar }: { row: LedgerRow; maxVar: number }) {
  // Filled width = varMxn / maxVar (linear; leader = 100%). Min 3px floor.
  const fillFrac = maxVar > 0 ? Math.max(0, Math.min(1, row.varMxn / maxVar)) : 0
  // Critical share of the filled portion (the leading saturated segment).
  const critFrac =
    row.varMxn > 0 ? Math.max(0, Math.min(1, row.criticalMxn / row.varMxn)) : 0

  return (
    <div
      className="relative h-3 flex-1 overflow-hidden rounded-[1px]"
      style={{ background: 'var(--color-background-elevated)', minWidth: 24 }}
      aria-hidden="true"
    >
      {/* Filled track — min 3px so even `otros` reads as a mark, not nothing. */}
      <div
        className="absolute inset-y-0 left-0 flex overflow-hidden rounded-[1px]"
        style={{ width: `max(3px, ${(fillFrac * 100).toFixed(3)}%)` }}
      >
        {/* Critical (saturated) leading segment. */}
        <div
          style={{
            width: `${(critFrac * 100).toFixed(3)}%`,
            background: RISK_COLORS.critical,
          }}
        />
        {/* High (lighter) tail — same bar, no gap. */}
        <div
          className="flex-1"
          style={{ background: RISK_COLORS.high, opacity: 0.65 }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Marginalia note strings — defined ONCE; rendered in the rail (≥lg) AND the
// numbered register (<lg). No duplication of copy.
// ─────────────────────────────────────────────────────────────────────────────
type MarginNote = { id: string; anchorCode?: string; text: string }

function buildMarginNotes(rows: LedgerRow[], lang: 'en' | 'es'): MarginNote[] {
  const hacienda = rows.find((r) => r.sectorCode === 'hacienda')
  const salud = rows.find((r) => r.sectorCode === 'salud')

  // (1) Hacienda intensity — own-spend share, computed (don't hardcode).
  const hacIntensity =
    hacienda && hacienda.totalMxn > 0 ? (hacienda.varMxn / hacienda.totalMxn) * 100 : null
  // Volume contrast vs Salud (× fewer CONTRACTS — "volumen" is contract volume,
  // not VaR value; salud 1.08M vs hacienda 134k ≈ 8×).
  const volRatio =
    hacienda && salud && hacienda.contracts > 0
      ? Math.round(salud.contracts / hacienda.contracts)
      : null

  const hacIntensityStr =
    hacIntensity != null ? hacIntensity.toFixed(1) : '75.4'
  const volRatioStr = volRatio != null ? `${volRatio}×` : '8×'

  return [
    {
      id: 'hacienda',
      anchorCode: 'hacienda',
      text:
        lang === 'es'
          ? `${hacIntensityStr}% de su propio gasto señalado — la mayor intensidad del registro, con ${volRatioStr} menos volumen que Salud.`
          : `${hacIntensityStr}% of its own spend is model-flagged — the highest intensity in the ledger, on ${volRatioStr} less volume than Health.`,
    },
    {
      id: 'agricultura',
      anchorCode: 'agricultura',
      text:
        lang === 'es'
          ? '† Agricultura: Segalmex domina el conjunto de entrenamiento (6,326 contratos GT).'
          : '† Agriculture: Segalmex dominates the training set (6,326 GT contracts).',
    },
    {
      id: 'salud-trabajo',
      anchorCode: 'salud',
      text:
        lang === 'es'
          ? '† Salud: riesgo ponderado por valor · † Trabajo: N pequeño.'
          : '† Health: value-weighted risk · † Labor: small N.',
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// A single ledger row.
// ─────────────────────────────────────────────────────────────────────────────
function LedgerRowItem({
  row,
  rank,
  maxVar,
  lang,
}: {
  row: LedgerRow
  rank: number
  maxVar: number
  lang: 'en' | 'es'
}) {
  const fill = sectorFill(row.sectorCode)
  const sbHot = row.sbPct > 25
  const hasDagger = DAGGER_SECTORS.has(row.sectorCode)
  const intensity = row.avgRiskScore ?? 0
  const critPct = row.contracts > 0 ? (row.criticalCount / row.contracts) * 100 : 0
  const dir = trajectoryDirection(row.trajectory)
  const hasTraj = Boolean(row.trajectory && row.trajectory.length > 1)
  const cap = row.topInstitution
  const capName = cap ? (cap.siglas || cap.name) : null

  const ariaLabel =
    lang === 'es'
      ? `${row.name} — ${formatCompactMXN(row.varMxn)} exposición señalada, intensidad ${intensity.toFixed(2)}`
      : `${row.name} — ${formatCompactMXN(row.varMxn)} model-flagged exposure, intensity ${intensity.toFixed(2)}`

  const counts = `${compactCount(row.contracts)} · ${compactCount(row.vendors)}`

  return (
    <Link
      to={`/sectors/${row.sectorId}`}
      role="listitem"
      aria-label={ariaLabel}
      className="group block transition-colors hover:bg-background-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      style={{ borderLeft: `3px solid ${fill}` }}
    >
      {/* Line 1 — primary scan: rank · name · size bar · VaR · intensity · trajectory */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 pt-2.5 pb-1 lg:pt-2 lg:pb-0.5">
        <span
          className="font-mono tabular-nums shrink-0 w-6 text-right"
          style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        <div className="shrink-0 w-28 sm:w-36 min-w-0 flex items-baseline gap-0.5">
          <span
            className="truncate group-hover:underline decoration-1 underline-offset-2"
            style={{ ...SERIF_NAME_STYLE, fontSize: 15, color: 'var(--color-text-primary)' }}
          >
            {row.name}
          </span>
          {hasDagger && (
            <sup className="font-mono" style={{ fontSize: 8, color: 'var(--color-text-muted)' }} aria-hidden="true">†</sup>
          )}
        </div>

        {/* Size bar (SIZE) */}
        <div className="hidden sm:flex flex-1 min-w-0 items-center">
          <VaRBar row={row} maxVar={maxVar} />
        </div>

        {/* VaR readout */}
        <span
          className="shrink-0 w-20 sm:w-24 text-right tabular-nums"
          style={{ ...BIGNUM_STYLE, fontSize: 16, color: 'var(--color-text-primary)' }}
        >
          {formatCompactMXN(row.varMxn)}
        </span>

        {/* Intensity dot + score (INTENSITY — size-independent) */}
        <span
          className="hidden sm:flex shrink-0 w-[70px] items-center justify-end gap-1.5"
          title={lang === 'es' ? `Intensidad de riesgo ${intensity.toFixed(2)}` : `Risk intensity ${intensity.toFixed(2)}`}
        >
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 9999, background: intensityColor(intensity), flexShrink: 0 }} />
          <span className="font-mono tabular-nums" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
            {intensity.toFixed(2)}
          </span>
        </span>

        {/* Trajectory sparkline + direction glyph (TIME) */}
        <span className="hidden lg:flex shrink-0 w-24 items-center gap-1">
          {hasTraj ? (
            <>
              <span className="flex-1 min-w-0">
                <EditorialSparkline data={row.trajectory} yKey="avg_risk" colorToken="text-muted" height={24} kind="line" />
              </span>
              <span
                className="font-mono shrink-0"
                style={{ fontSize: 12, color: dir.rising ? RISK_COLORS.high : 'var(--color-text-muted)' }}
                aria-hidden="true"
              >
                {dir.glyph}
              </span>
            </>
          ) : (
            <span className="font-mono w-full text-center" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>—</span>
          )}
        </span>
      </div>

      {/* Line 2 — dossier sublabel (sm+): capture · composition · DA · 1P · counts */}
      <div
        className="hidden sm:flex items-center flex-wrap gap-x-2.5 gap-y-0.5 pl-10 sm:pl-12 pb-2 lg:pb-1.5 font-mono tabular-nums"
        style={{ fontSize: 10, color: 'var(--color-text-muted)' }}
      >
        {capName && (
          <span className="whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
            {capName}<span style={{ opacity: 0.5, margin: '0 3px' }}>·</span>{cap!.sharePct.toFixed(0)}% {lang === 'es' ? 'capt.' : 'capt.'}
          </span>
        )}
        <span className="whitespace-nowrap inline-flex items-center gap-1">
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 1, background: RISK_COLORS.critical, flexShrink: 0 }} />
          {lang === 'es' ? 'crít' : 'crit'} {critPct.toFixed(1)}%
        </span>
        <span className="whitespace-nowrap">DA {row.daPct.toFixed(0)}%</span>
        <span className="whitespace-nowrap" style={{ color: sbHot ? RISK_COLORS.critical : undefined }}>
          1P {row.sbPct.toFixed(1)}%
        </span>
        <span className="whitespace-nowrap">{counts}</span>
      </div>

      {/* <sm: bar + key readouts on their own lines */}
      <div className="sm:hidden px-2 pb-2.5 -mt-0.5 space-y-1.5">
        <div className="flex items-center">
          <VaRBar row={row} maxVar={maxVar} />
        </div>
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 9999, background: intensityColor(intensity), flexShrink: 0 }} />
            {intensity.toFixed(2)} {intensityWord(intensity, lang)}
          </span>
          {capName && <span style={{ color: 'var(--color-text-secondary)' }}>{capName} {cap!.sharePct.toFixed(0)}%</span>}
          <span style={{ color: RISK_COLORS.critical }}>{lang === 'es' ? 'crít' : 'crit'} {critPct.toFixed(1)}%</span>
          <span>DA {row.daPct.toFixed(0)}%</span>
          <span style={{ color: sbHot ? RISK_COLORS.critical : undefined }}>1P {row.sbPct.toFixed(1)}%</span>
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// §2–§4 — ExposureLedger (table + marginalia rail + ∑ sum rule)
// ─────────────────────────────────────────────────────────────────────────────
export function ExposureLedger({
  rows,
  lang,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
}) {
  const maxVar = rows.length > 0 ? rows[0].varMxn : 1
  const totalVaR = sum(rows, (r) => r.varMxn)
  const totalSpend = sum(rows, (r) => r.totalMxn)
  const totalContracts = sum(rows, (r) => r.contracts)

  // VaR as share of all spend, for the ∑ rule.
  const varSharePct = totalSpend > 0 ? (totalVaR / totalSpend) * 100 : 0
  // Count of sectors exceeding the OECD direct-award ceiling.
  const daExceedCount = rows.filter((r) => r.daPct > OECD_DA_CEILING).length

  const notes = buildMarginNotes(rows, lang)

  // Column-header labels (mono, micro, muted).
  const exposureHeader =
    lang === 'es' ? 'Exposición señalada · escala lineal' : 'Model-flagged exposure · linear scale'
  const daPhrase =
    lang === 'es'
      ? `OCDE ≤${OECD_DA_CEILING} · las ${daExceedCount} exceden`
      : `OECD ≤${OECD_DA_CEILING} · ${daExceedCount} exceed`

  return (
    <section aria-label={lang === 'es' ? 'El Libro Mayor de la Exposición' : 'The Exposure Ledger'}>
      <div className="min-w-0">
        {/* Column header row (sm+). */}
        <div
          className="hidden sm:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 pb-2 mb-1"
          style={{ borderBottom: '1px solid var(--color-border)' }}
          aria-hidden="true"
        >
          <span className="font-mono w-6 text-right" style={KICKER_STYLE}>#</span>
          <span className="font-mono w-28 sm:w-36" style={KICKER_STYLE}>{lang === 'es' ? 'Sector' : 'Sector'}</span>
          <span className="font-mono flex-1 min-w-0 truncate" style={KICKER_STYLE}>{exposureHeader}</span>
          <span className="font-mono w-20 sm:w-24 text-right" style={KICKER_STYLE}>VaR</span>
          <span className="font-mono w-[70px] text-right" style={KICKER_STYLE}>{lang === 'es' ? 'Intens.' : 'Intens.'}</span>
          <span className="hidden lg:inline font-mono w-24 text-right truncate" style={KICKER_STYLE}>
            {lang === 'es' ? 'Trayectoria' : 'Trajectory'}
          </span>
        </div>

        {/* Sub-header legend strip — explains the line-2 atoms + OECD count, once. */}
        <div
          className="hidden sm:flex items-center justify-between gap-3 px-3 pb-2 mb-1 font-mono"
          style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
          aria-hidden="true"
        >
          <span>
            {lang === 'es'
              ? 'fila 2 · capt. = institución dominante · crít = % de contratos · ↑ riesgo en aumento'
              : 'row 2 · capt. = top institution · crit = % of contracts · ↑ risk rising'}
          </span>
          <span>{daPhrase}</span>
        </div>

        {/* Rows */}
        <div role="list">
          {rows.map((r, i) => (
            <div key={r.sectorId} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <LedgerRowItem row={r} rank={i + 1} maxVar={maxVar} lang={lang} />
            </div>
          ))}
        </div>

        {/* ── §4 ∑ Sum rule — double hairline, the ONLY home of platform totals. ── */}
        <div
          className="mt-3 py-2.5"
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

        {/* Model note line. */}
        <p
          className="mt-2.5 px-3 font-mono"
          style={{ fontSize: 10, letterSpacing: '0.02em', color: 'var(--color-text-muted)', lineHeight: 1.5 }}
        >
          {lang === 'es'
            ? 'Modelo v0.8.5 · exposición = MXN vía contratos alto+crítico · intensidad = riesgo medio del sector · indicador estadístico, no determinación legal · clic en fila → dossier · '
            : 'Model v0.8.5 · exposure = MXN via high+critical contracts · intensity = sector mean risk · statistical indicator, not a legal determination · click a row → dossier · '}
          <Link
            to="/methodology"
            className="underline decoration-1 underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {lang === 'es' ? 'metodología ↗' : 'methodology ↗'}
          </Link>
        </p>

        {/* Legend microline — size bar · intensity dot · trajectory line. */}
        <p
          className="mt-1.5 px-3 font-mono"
          style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
        >
          {lang === 'es'
            ? 'barra = tamaño (lineal) · tono saturado = crítico, claro = alto · ● = intensidad · línea = trayectoria de riesgo'
            : 'bar = size (linear) · saturated = critical, light = high · ● = intensity · line = risk trajectory'}
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
    </section>
  )
}
