/**
 * ExposureLedger — §D "El Registro Auditado / The Audited Register" of the
 * /sectors WHO Confounded-Ledger redesign (DESIGNUS panel, winner [plate] +
 * judge amendments; supersedes M3v2's single-table layout).
 *
 * The page IS still a ranked exposure ledger — but the argument now lives in
 * §B (ConfoundPlate, log-VaR × own-spend dumbbell registry) and this file is
 * the auditable record: one clean ~36px line per sector, a single
 * process-integrity FT-bullet cell (DA% vs the OECD ceiling — the overshoot
 * silhouette is the geometry), sortable VaR/Intensity headers sharing the
 * plate's ?lens state, and the praised /categories-style hover dossier
 * (SectorDossierCard) with lazy top-contract + GT-linkage fetches.
 *
 * What died here (Confounded Ledger §9): CumulativeRibbon (redundant proof
 * bar), VaRBar (linear sliver-collapse), the line-2 five-atom mono run-on,
 * the sub-header legend strip, and the Hacienda footnote (promoted to §A/§B).
 *
 * Contract notes:
 *   - `LedgerRow` is FROZEN — Sectors.tsx builds it; do not change its shape.
 *   - Rows arrive sorted varMxn-descending; display order derives from `lens`.
 *   - Hex colours ONLY via style={{}} (className hex is silently stripped).
 *   - VaR is always "exposición señalada / model-flagged exposure" — never
 *     "probability of corruption". No green anywhere (Bible §3.10).
 *   - Currency via formatCompactMXN (bilingual; billones/MDP in ES).
 */
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SECTOR_COLORS, RISK_COLORS, OECD_DIRECT_AWARD_LIMIT, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { EditorialSparkline, DABullet } from '@/components/charts/editorial'
import type { SectorTrajectoryPoint } from '@/api/types'
import { SectorDossierCard } from './SectorHoverDossier'
import { orderForLens } from './confoundScales'
import type { PlateLens } from './confoundScales'

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

// Sectors that carry a marginalia dagger (†) on the index.
const DAGGER_SECTORS = new Set(['salud', 'agricultura', 'trabajo'])

// OECD direct-award ceiling, as a percentage (0–100) for this surface's copy.
// Single source: constants.ts OECD_DIRECT_AWARD_LIMIT (anti-pattern A7 — never
// retype the limit per surface).
const OECD_DA_CEILING = OECD_DIRECT_AWARD_LIMIT * 100

// ─────────────────────────────────────────────────────────────────────────────
// Tiny local helpers (intensityColor / compactCount shared with §B/§C/dossier)
// ─────────────────────────────────────────────────────────────────────────────

/** Compact integer count: 1.08M · 65.7k · 942. Local per spec (not currency). */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const sectorFill = (code: string): string => SECTOR_COLORS[code] ?? SECTOR_COLORS.otros

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

// Big-number typography — serif italic 800 tabular.
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
export function intensityColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  return level === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[level]
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

// DABullet (process-integrity cell: DA% vs OECD ceiling, overshoot in amber) is
// now the shared @/components/charts/editorial export, imported above —
// behavior-identical to the prior local copy.

// ─────────────────────────────────────────────────────────────────────────────
// A single register row — one clean line; the detail lives in the dossier.
// ─────────────────────────────────────────────────────────────────────────────
function LedgerRowItem({
  row,
  displayRank,
  lang,
  expanded,
  onToggleExpand,
  rankVar,
  totalRows,
}: {
  row: LedgerRow
  displayRank: number
  lang: 'en' | 'es'
  expanded: boolean
  onToggleExpand: () => void
  rankVar: number
  totalRows: number
}) {
  const navigate = useNavigate()
  const fill = sectorFill(row.sectorCode)
  const hasDagger = DAGGER_SECTORS.has(row.sectorCode)
  const intensity = row.avgRiskScore ?? 0
  const dir = trajectoryDirection(row.trajectory)
  const hasTraj = Boolean(row.trajectory && row.trajectory.length > 1)

  const ariaLabel =
    lang === 'es'
      ? `${row.name} — ${formatCompactMXN(row.varMxn)} exposición señalada, intensidad ${intensity.toFixed(2)}, adjudicación directa ${row.daPct.toFixed(0)}%`
      : `${row.name} — ${formatCompactMXN(row.varMxn)} model-flagged exposure, intensity ${intensity.toFixed(2)}, direct award ${row.daPct.toFixed(0)}%`

  return (
    <div
      role="button"
      tabIndex={0}
      data-wf-row={row.sectorId}
      aria-label={ariaLabel}
      className="group cursor-pointer transition-colors hover:bg-background-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      style={{ borderLeft: `3px solid ${fill}` }}
      onClick={() => navigate(`/sectors/${row.sectorId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/sectors/${row.sectorId}`)
        }
      }}
    >
      {/* The single register line */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2">
        <span
          className="font-mono tabular-nums shrink-0 w-6 text-right"
          style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
        >
          {String(displayRank).padStart(2, '0')}
        </span>

        <div className="flex-1 min-w-0 flex items-baseline gap-0.5">
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

        {/* Process-integrity bullet: DA% vs OECD ceiling */}
        <span className="hidden sm:flex shrink-0 w-[120px] items-center gap-1.5">
          <DABullet daPct={row.daPct} />
          <span className="font-mono tabular-nums shrink-0 w-8 text-right" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {row.daPct.toFixed(0)}%
          </span>
        </span>

        {/* VaR readout */}
        <span
          className="shrink-0 w-20 sm:w-24 text-right tabular-nums"
          style={{ ...BIGNUM_STYLE, fontSize: 16, color: 'var(--color-text-primary)' }}
        >
          {formatCompactMXN(row.varMxn)}
        </span>

        {/* Intensity dot + score (size-independent) */}
        <span
          className="hidden sm:flex shrink-0 w-[64px] items-center justify-end gap-1.5"
          title={lang === 'es' ? `Intensidad de riesgo ${intensity.toFixed(2)}` : `Risk intensity ${intensity.toFixed(2)}`}
        >
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 9999, background: intensityColor(intensity), flexShrink: 0 }} />
          <span className="font-mono tabular-nums" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
            {intensity.toFixed(2)}
          </span>
        </span>

        {/* Trajectory sparkline + direction glyph */}
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

        {/* Mobile expand toggle (the dossier becomes an inline block on touch) */}
        <button
          type="button"
          className="sm:hidden shrink-0 font-mono px-1.5 py-1"
          style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
          aria-expanded={expanded}
          aria-label={
            lang === 'es'
              ? `${expanded ? 'Cerrar' : 'Abrir'} dossier de ${row.name}`
              : `${expanded ? 'Close' : 'Open'} ${row.name} dossier`
          }
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {/* Mobile inline dossier */}
      {expanded && (
        <div
          className="sm:hidden px-3 pb-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono shrink-0" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              DA · {lang === 'es' ? 'OCDE' : 'OECD'} ≤{OECD_DA_CEILING.toFixed(0)}%
            </span>
            <DABullet daPct={row.daPct} />
            <span className="font-mono tabular-nums shrink-0" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {row.daPct.toFixed(0)}%
            </span>
          </div>
          <SectorDossierCard row={row} rankVar={rankVar} totalRows={totalRows} lang={lang} active={expanded} />
          <Link
            to={`/sectors/${row.sectorId}`}
            className="mt-2 inline-block font-mono underline decoration-1 underline-offset-2"
            style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {lang === 'es' ? 'ver dossier del sector ↗' : 'view sector dossier ↗'}
          </Link>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExposureLedger — the audited register (+ floating dossier + ∑ sum rule)
// ─────────────────────────────────────────────────────────────────────────────
export function ExposureLedger({
  rows,
  lang,
  lens = 'var',
  onLensChange,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
  lens?: PlateLens
  onLensChange?: (l: PlateLens) => void
}) {
  const changeLens = onLensChange ?? (() => undefined)
  const totalVaR = sum(rows, (r) => r.varMxn)
  const totalSpend = sum(rows, (r) => r.totalMxn)
  const totalContracts = sum(rows, (r) => r.contracts)

  // VaR as share of all spend, for the ∑ rule.
  const varSharePct = totalSpend > 0 ? (totalVaR / totalSpend) * 100 : 0

  const display = useMemo(() => orderForLens(rows, lens), [rows, lens])
  const rankVarById = useMemo(() => new Map(rows.map((r, i) => [r.sectorId, i + 1])), [rows])

  // Hover dossier state (desktop) + tap-to-expand state (mobile).
  const [hover, setHover] = useState<{ id: number; top: number; bottom: number; containerH: number } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const hoverRow = hover ? rows.find((r) => r.sectorId === hover.id) ?? null : null
  const dossierBelow = hover ? hover.top < hover.containerH / 2 : true

  const notes = buildMarginNotes(lang)

  const captureRect = (el: HTMLElement) => {
    const parent = el.offsetParent as HTMLElement | null
    return {
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
      containerH: parent?.offsetHeight ?? el.offsetTop + el.offsetHeight,
    }
  }

  // Sortable header cell — shares the §B ?lens state (VaR / Intensity only).
  const sortHeader = (key: PlateLens, label: string, widthClass: string) => (
    <button
      type="button"
      onClick={() => changeLens(key)}
      aria-pressed={lens === key}
      className={`font-mono text-right ${widthClass} shrink-0 transition-opacity hover:opacity-70`}
      style={{
        ...KICKER_STYLE,
        color: lens === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        background: 'none',
        border: 0,
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {label}
      {lens === key ? ' ↓' : ''}
    </button>
  )

  return (
    <section aria-label={lang === 'es' ? 'El Registro Auditado' : 'The Audited Register'}>
      <div className="min-w-0">
        {/* Column header row (sm+). */}
        <div
          className="hidden sm:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 pb-2 mb-1"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="font-mono w-6 text-right shrink-0" style={KICKER_STYLE} aria-hidden="true">#</span>
          <span className="font-mono flex-1" style={KICKER_STYLE} aria-hidden="true">{lang === 'es' ? 'Sector' : 'Sector'}</span>
          <span className="font-mono w-[120px] shrink-0" style={KICKER_STYLE} aria-hidden="true">
            DA · {lang === 'es' ? 'OCDE' : 'OECD'} ≤{OECD_DA_CEILING.toFixed(0)}%
          </span>
          {sortHeader('var', 'VaR', 'w-20 sm:w-24')}
          {sortHeader('intensity', 'Intens.', 'w-[64px]')}
          <span className="hidden lg:inline font-mono w-24 text-right truncate shrink-0" style={KICKER_STYLE} aria-hidden="true">
            {lang === 'es' ? 'Trayectoria' : 'Trajectory'}
          </span>
        </div>

        {/* Rows + floating dossier anchor */}
        <div role="list" className="relative" onMouseLeave={() => setHover(null)}>
          {display.map((r, i) => (
            <div
              key={r.sectorId}
              style={{ borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => setHover({ id: r.sectorId, ...captureRect(e.currentTarget) })}
              onFocusCapture={(e) => setHover({ id: r.sectorId, ...captureRect(e.currentTarget as HTMLElement) })}
              onBlurCapture={() => setHover(null)}
            >
              <LedgerRowItem
                row={r}
                displayRank={i + 1}
                lang={lang}
                expanded={expandedId === r.sectorId}
                onToggleExpand={() => setExpandedId(expandedId === r.sectorId ? null : r.sectorId)}
                rankVar={rankVarById.get(r.sectorId) ?? i + 1}
                totalRows={rows.length}
              />
            </div>
          ))}

          {/* Floating dossier (desktop only) — edge-flips above/below mid-register */}
          {hoverRow && hover && (
            <div
              className="hidden sm:block pointer-events-none absolute z-20"
              style={{
                right: 8,
                ...(dossierBelow
                  ? { top: hover.bottom + 6 }
                  : { bottom: hover.containerH - hover.top + 6 }),
              }}
            >
              <div className="rounded-md border border-border bg-background-card p-3 shadow-xl" style={{ width: 330 }}>
                <SectorDossierCard
                  row={hoverRow}
                  rankVar={rankVarById.get(hoverRow.sectorId) ?? 0}
                  totalRows={rows.length}
                  lang={lang}
                  active
                />
              </div>
            </div>
          )}
        </div>

        {/* ── ∑ Sum rule — double hairline, the ONLY home of platform totals. ── */}
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

        {/* Legend microline — bullet rule · intensity dot · trajectory line. */}
        <p
          className="mt-1.5 px-3 font-mono"
          style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
        >
          {lang === 'es'
            ? `regla = adjudicación directa vs techo OCDE ${OECD_DA_CEILING.toFixed(0)}% (excedente en ámbar) · ● = intensidad · línea = trayectoria de riesgo`
            : `rule = direct award vs OECD ${OECD_DA_CEILING.toFixed(0)}% ceiling (overshoot in amber) · ● = intensity · line = risk trajectory`}
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
