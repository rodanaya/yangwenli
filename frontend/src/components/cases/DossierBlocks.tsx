/**
 * DossierBlocks — El Expediente (/cases/:slug) composition blocks.
 *
 *   CaseDocketRail           — sticky left identity rail (folio, gap,
 *                              sector spine, COMPRANET reach, § jump links).
 *   CostInArchive             — NYT-Upshot annotated dot field: this case's
 *                              cost placed among all documented cases.
 *   CompranetVisibilityBanner— one-line evidentiary-reach footnote.
 *   LinkedVendorList         — EntityIdentityChip vendor rows (hard rule #1)
 *                              + ghost rows for named-but-unlinked vendors.
 *   KeepReadingFooter        — same-sector onward routing.
 */
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { placeLabels, measureLabel, type LabelCandidate } from '@/components/network/plateLabels'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import type { KeyActor, LinkedVendor, ScandalDetail, ScandalListItem } from '@/api/types'
import {
  dispositionFor,
  evidenceLabel,
  folio,
  impunityGap,
  sectorRedFlag,
  visibilityMeta,
  type Lang,
} from './casesVocab'

// ─── CaseDocketRail ─────────────────────────────────────────────────────────

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono uppercase"
      style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--color-text-muted)', fontWeight: 500 }}
    >
      {children}
    </p>
  )
}

function RailDivider() {
  return <div aria-hidden="true" className="my-2 h-px" style={{ background: 'var(--color-border)' }} />
}

export function CaseDocketRail({
  scandal,
  totalCases,
  sectorName,
  sectorColor,
  ink,
  sections,
  lang,
}: {
  scandal: ScandalDetail
  totalCases: number | null
  sectorName: string | null
  /** Resolved sector accent (defaults to RISK_COLORS.critical upstream) —
   *  runs the card's left inset spine (W3). */
  sectorColor: string
  /** AA-safe ink for the § index numerals — `getSectorTextColor(code)`. */
  ink: string
  sections: { id: string; numeral: string; label: string }[]
  lang: Lang
}) {
  const gap = impunityGap(scandal)
  const vis = visibilityMeta(scandal.compranet_visibility)
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: `inset 4px 0 0 ${sectorColor}`,
        padding: '16px 16px 14px',
        background: 'var(--color-background-card)',
      }}
    >
      <RailLabel>{lang === 'es' ? 'Expediente' : 'Case file'}</RailLabel>
      <p
        className="tabular-nums mt-0.5"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'normal',
          fontWeight: 800,
          fontSize: 20,
          color: 'var(--color-accent)',
          lineHeight: 1,
        }}
      >
        {folio(scandal.id).replace('EXP·', '#')}
        {totalCases ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}> / {totalCases}</span>
        ) : null}
      </p>
      {scandal.is_verified ? (
        <p
          className="font-mono mt-1"
          style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--color-text-secondary)', fontWeight: 600 }}
        >
          {lang === 'es' ? 'VERIFICADO ✓' : 'VERIFIED ✓'}
        </p>
      ) : null}

      {gap && gap.open && (
        <>
          <RailDivider />
          <RailLabel>{lang === 'es' ? 'Brecha' : 'Gap'}</RailLabel>
          <p
            className="mt-1"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'normal',
              fontSize: 13.5,
              lineHeight: 1.4,
              color: 'var(--color-text-primary)',
            }}
          >
            {lang === 'es'
              ? <><strong className="tabular-nums">{gap.years} años</strong> sin resolución firme</>
              : <><strong className="tabular-nums">{gap.years} years</strong> without a final disposition</>}
          </p>
        </>
      )}

      {sectorName && (
        <>
          <RailDivider />
          <RailLabel>{lang === 'es' ? 'Sector' : 'Sector'}</RailLabel>
          <p
            className="mt-1 font-mono uppercase"
            style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
          >
            {sectorName}
          </p>
        </>
      )}

      <RailDivider />
      <RailLabel>COMPRANET</RailLabel>
      <p className="mt-1 flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-flex items-end gap-[2px]">
          {[1, 2, 3].map((r) => (
            <span
              key={r}
              style={{
                width: 4,
                height: 3 + r * 3,
                background: r <= vis.rung ? 'var(--color-text-secondary)' : 'var(--color-border)',
              }}
            />
          ))}
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 12, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}
        >
          {vis.label[lang]}
        </span>
      </p>
      {scandal.ground_truth_case_id != null && (
        <>
          <div className="mt-2" />
          <p
            className="font-mono"
            style={{ fontSize: 13, letterSpacing: '0.16em', color: 'var(--color-accent)', fontWeight: 700 }}
          >
            ▪ {lang === 'es' ? 'ENTRENAMIENTO GT' : 'GT TRAINING'}
          </p>
        </>
      )}

      <RailDivider />
      <RailLabel>{lang === 'es' ? 'En esta página' : 'On this page'}</RailLabel>
      <ul className="mt-1.5 space-y-1 list-none p-0">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex items-baseline gap-1.5 py-1 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              style={{ textDecoration: 'none' }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 13,
                  color: ink,
                  minWidth: 18,
                }}
              >
                {s.numeral}.
              </span>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 13, letterSpacing: '0.14em', color: 'var(--color-text-secondary)' }}
              >
                {s.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── CostInArchive ──────────────────────────────────────────────────────────
// NYT-Upshot annotated dot field: this case's cost placed among every
// documented case, on a square-root value scale. Migrates MoneyBenchmark's
// two jobs (threshold reference, multiplier sentence) into the new frame.
//
// PARALLAX D5 § Change 6 — "HTML owns glyphs, SVG owns geometry". The viewBox
// is the figure's MEASURED width, so nothing is scaled: the old fixed 640-unit
// box was squeezed to ~400px beside ScaleBlock and rendered its labels at
// 5.3px. The three callouts are HTML seated by `placeLabels`, which re-anchors
// a label that would cross the plate edge instead of letting it escape (the
// Oceanografia THRESHOLD label overhung its SVG by 36-57px).

function formatMultiplier(m: number): string {
  return m >= 10 ? String(Math.round(m)) : m.toFixed(1)
}

const COST_VB_H = 108
const COST_PAD_L = 16
const COST_PAD_R = 16
const COST_AXIS_Y = 58
const COST_MIN_W = 280

const CALLOUT_FS = 11
const CALLOUT_LH = 14
const CALLOUT_FONT = `${CALLOUT_FS}px "JetBrains Mono", monospace`

export function CostInArchive({
  amount,
  sectorId,
  sectorName,
  accentKind,
  ink,
  allCases,
  lang,
}: {
  amount: number
  sectorId: number | null
  sectorName: string | null
  /** Sector accent, or the disposition ink when legal_status === 'impunity' —
   *  the dot fill. */
  accentKind: string
  /** AA-safe ink for the THIS CASE callout (the mark keeps `accentKind`). */
  ink: string
  allCases: ScandalListItem[] | undefined
  lang: Lang
}) {
  const figureRef = useRef<HTMLElement>(null)
  const measured = useMeasuredWidth(figureRef)
  const fontsReady = useFontsReady()

  const threshold = sectorRedFlag(sectorId)
  const multiplier = amount / threshold
  const sector = sectorName ?? (lang === 'es' ? 'el sector' : 'the sector')

  const usable = (allCases ?? [])
    .map((c) => ({
      v: c.amount_mxn_high ?? c.amount_mxn_low ?? null,
      name: lang === 'es' && c.name_es ? c.name_es : c.name_en,
    }))
    .filter((c): c is { v: number; name: string } => c.v != null && c.v > 0)

  // Degraded: fewer than 5 usable amounts in the docket — this-case dot +
  // threshold rule + multiplier sentence only (MoneyBenchmark's old info,
  // new frame).
  const degraded = usable.length < 5
  const values = usable.map((c) => c.v)
  const maxV = degraded ? Math.max(amount, threshold) : Math.max(...values)
  const minV = degraded ? 0 : Math.min(...values)

  const W = Math.max(COST_MIN_W, measured || 640)
  const plotW = W - COST_PAD_L - COST_PAD_R
  // The threshold rule is a reference mark, so it belongs IN the domain.
  // Leaving it out put Oceanografía's 50B threshold past the right edge —
  // its label escaped the SVG by 36-57px and placeLabels could not seat it
  // at all, because no alignment rescues an anchor outside the bounds.
  const domainMax = Math.max(maxV, threshold)
  const sqrtMin = degraded
    ? Math.sqrt(Math.max(0, Math.min(amount, threshold) * 0.8))
    : Math.sqrt(Math.min(minV, threshold))
  const sqrtMax = degraded
    ? Math.sqrt(Math.max(sqrtMin * sqrtMin + 1, domainMax * 1.15))
    : Math.sqrt(Math.max(domainMax, minV + 1))
  const x = (v: number) => COST_PAD_L + ((Math.sqrt(v) - sqrtMin) / (sqrtMax - sqrtMin)) * plotW

  const thisX = x(amount)
  const threshX = x(threshold)
  const isThisTheMax = maxV === amount
  const total = usable.length

  const caption = lang === 'es'
    ? `Cada punto es uno de ${total} casos documentados, ubicado por su costo estimado (escala de raíz cuadrada).`
    : `Each dot is one of ${total} documented cases, placed by estimated cost (square-root scale).`

  const ariaLabel = degraded
    ? lang === 'es'
      ? `Este caso: ${formatCompactMXN(amount)} frente al umbral de ${formatCompactMXN(threshold)}.`
      : `This case: ${formatCompactMXN(amount)} against the ${formatCompactMXN(threshold)} threshold.`
    : lang === 'es'
      ? `Costo de este caso entre los ${total} casos documentados: ${formatCompactMXN(amount)}; umbral ${formatCompactMXN(threshold)}; máximo del archivo ${formatCompactMXN(maxV)}.`
      : `This case's cost among ${total} documented cases: ${formatCompactMXN(amount)}; threshold ${formatCompactMXN(threshold)}; archive max ${formatCompactMXN(maxV)}.`

  // ── HTML callouts, seated inside the plate box ───────────────────────────
  // Priority order: this case first, then the threshold it is measured
  // against, then the archive maximum. THRESHOLD is anchored below the axis
  // (its candidate y IS the label's bottom, with `above: 0`); the other two
  // sit above their dot.
  // Seated on every render — three measureText calls and a 3-candidate
  // placement. Manual memoization here is not worth the dependency surface
  // (the React Compiler covers it), and the layout must re-run when the web
  // fonts land anyway.
  const callouts = (() => {
    if (measured <= 0 || !fontsReady) return []
    const entries: {
      id: string
      text: string
      color: string
      weight: number
      x: number
      y: number
      above: number
      below?: number
    }[] = [
      {
        id: 'this',
        text: `${lang === 'es' ? 'ESTE CASO' : 'THIS CASE'} · ${formatCompactMXN(amount)}`,
        color: ink,
        weight: 700,
        x: thisX,
        y: COST_AXIS_Y,
        above: 11,
      },
      {
        id: 'threshold',
        text: `${lang === 'es' ? 'UMBRAL' : 'THRESHOLD'} · ${formatCompactMXN(threshold)}`,
        color: RISK_COLORS.critical,
        weight: 400,
        x: threshX,
        y: COST_AXIS_Y + 24 + CALLOUT_LH,
        above: 0,
      },
    ]
    if (!degraded && !isThisTheMax) {
      entries.push({
        id: 'largest',
        text: `${lang === 'es' ? 'MAYOR' : 'LARGEST'} · ${formatCompactMXN(maxV)}`,
        color: 'var(--color-text-muted)',
        weight: 400,
        x: x(maxV),
        y: COST_AXIS_Y,
        above: 11,
        // Falls below the axis when the archive maximum crowds THIS CASE —
        // otherwise placeLabels drops it rather than overprint.
        below: 24,
      })
    }
    const candidates: LabelCandidate[] = entries.map((e) => ({
      id: e.id,
      // Belt and braces: an anchor outside the plate can never be seated.
      x: Math.min(Math.max(e.x, 0), W),
      y: e.y,
      width: measureLabel(e.text, CALLOUT_FONT, W, CALLOUT_LH).width + 2,
      height: CALLOUT_LH,
      above: e.above,
      below: e.below,
    }))
    const bounds = { x0: 0, y0: 0, x1: W, y1: COST_VB_H }
    const placed = placeLabels(candidates, [], bounds)
    return placed.map((p) => ({ placed: p, meta: entries.find((e) => e.id === p.id)! }))
  })()

  if (!Number.isFinite(multiplier) || multiplier <= 0) return null

  const multiplierSentence = multiplier >= 1.5 && (
    <p
      className="mt-2"
      style={{
        fontFamily: '"EB Garamond", Georgia, serif',
        fontStyle: 'normal',
        fontSize: 14.5,
        lineHeight: 1.45,
        color: 'var(--color-text-primary)',
      }}
    >
      {lang === 'es'
        ? <><strong className="tabular-nums">{formatMultiplier(multiplier)}×</strong> el umbral de revisión de la plataforma para {sector} — un umbral interno, no una norma oficial.</>
        : <><strong className="tabular-nums">{formatMultiplier(multiplier)}×</strong> the platform's {sector} review threshold — an internal benchmark, not an official norm.</>}
    </p>
  )

  return (
    <figure ref={figureRef} className="mt-4 relative">
      <svg
        viewBox={`0 0 ${W} ${COST_VB_H}`}
        width="100%"
        height={COST_VB_H}
        style={{ display: 'block' }}
        role="img"
        aria-label={ariaLabel}
      >
        <line x1={COST_PAD_L} y1={COST_AXIS_Y} x2={W - COST_PAD_R} y2={COST_AXIS_Y} stroke="var(--color-border)" strokeWidth={1} />

        {!degraded && usable.map((c, i) => (
          <circle key={i} cx={x(c.v)} cy={COST_AXIS_Y} r={2.5} fill="var(--color-text-muted)" opacity={0.32}>
            <title>{`${c.name} · ${formatCompactMXN(c.v)}`}</title>
          </circle>
        ))}

        <line x1={threshX} y1={COST_AXIS_Y - 20} x2={threshX} y2={COST_AXIS_Y + 20} stroke={RISK_COLORS.critical} strokeWidth={1.5} strokeDasharray="2 4" />

        <circle cx={thisX} cy={COST_AXIS_Y} r={5} fill={accentKind} stroke="var(--color-background)" strokeWidth={1.5} />
      </svg>

      {callouts.map(({ placed, meta }) => (
        <span
          key={placed.id}
          aria-hidden="true"
          className="absolute pointer-events-none whitespace-nowrap font-mono"
          style={{
            left: placed.box.x0,
            top: placed.box.y0,
            width: placed.box.x1 - placed.box.x0,
            fontSize: CALLOUT_FS,
            lineHeight: `${CALLOUT_LH}px`,
            color: meta.color,
            fontWeight: meta.weight,
            textAlign: placed.align === 'right' ? 'right' : placed.align === 'left' ? 'left' : 'center',
          }}
        >
          {meta.text}
        </span>
      ))}

      {!degraded && (
        <figcaption
          className="mt-2 font-mono"
          style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--color-text-muted)' }}
        >
          {caption}
        </figcaption>
      )}
      {multiplierSentence}
    </figure>
  )
}

// ─── CompranetVisibilityBanner ──────────────────────────────────────────────
// Demoted (W5) to a one-line footnote below the vendor rows — presence now
// outweighs absence. Still not deleted: the honesty note is required.

export function CompranetVisibilityBanner({
  scandal,
  lang,
}: {
  scandal: ScandalDetail
  lang: Lang
}) {
  const vis = visibilityMeta(scandal.compranet_visibility)
  const rung = vis.label[lang]
  return (
    <div className="mt-3" style={{ maxWidth: '64ch' }}>
      <p className="font-mono" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>▎</span>{' '}
        {lang === 'es'
          ? `COMPRANET · ${rung} — los vínculos mostrados son un piso, no un total.`
          : `COMPRANET · ${rung} — links shown are a floor, not a total.`}
      </p>
      {/* compranet_note is analyst content authored in English only —
          lang="en" keeps screen readers correct on /es. */}
      {scandal.compranet_note && (
        <p lang="en" className="mt-1 font-mono" style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
          {scandal.compranet_note}
        </p>
      )}
    </div>
  )
}

/** De-underscore a raw DB enum for display (role / match_method). */
function humanizeToken(s: string): string {
  return s.replace(/_/g, ' ')
}

// ─── LinkedVendorList ───────────────────────────────────────────────────────
// Vendor rows lead §V (W5), enriched with role + match_method. Ghost rows
// follow: vendor-role actors (§IV) named but absent from linked_vendors —
// the actor↔vendor cross-reference gap, closed by showing absence explicitly
// (the GEDEFENSA state) instead of a silent dead end.

export function LinkedVendorList({
  vendors,
  ghostActors = [],
  lang,
}: {
  vendors: LinkedVendor[]
  ghostActors?: KeyActor[]
  lang: Lang
}) {
  if (vendors.length === 0 && ghostActors.length === 0) return null
  const sorted = [...vendors].sort((a, b) => {
    if ((b.contract_count ?? 0) !== (a.contract_count ?? 0)) {
      return (b.contract_count ?? 0) - (a.contract_count ?? 0)
    }
    return (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0)
  })
  return (
    <ul className="space-y-1.5 list-none p-0 m-0 max-w-2xl">
      {sorted.map((v, i) => {
        const roleFrag = v.role ? humanizeToken(v.role) : null
        const methodFrag = v.match_method
          ? lang === 'es'
            ? `coincidencia: ${humanizeToken(v.match_method)}`
            : `match: ${humanizeToken(v.match_method)}`
          : null
        const midRow = [roleFrag, methodFrag].filter(Boolean).join(' · ')
        return (
          <li
            key={`${v.vendor_id ?? 'unmatched'}-${i}`}
            className="flex items-center gap-3 py-1.5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <span className="flex-1 min-w-0">
              {v.vendor_id != null ? (
                <EntityIdentityChip
                  type="vendor"
                  id={v.vendor_id}
                  name={v.vendor_name}
                  riskScore={v.avg_risk_score}
                  size="sm"
                />
              ) : (
                <span
                  style={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontStyle: 'normal',
                    fontSize: 14.5,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {v.vendor_name}
                  <span
                    className="font-mono ml-2 uppercase"
                    style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
                  >
                    {lang === 'es' ? 'sin vínculo COMPRANET' : 'no COMPRANET link'}
                  </span>
                </span>
              )}
              {midRow && (
                <span className="block font-mono" style={{ fontSize: 10.5, letterSpacing: '0.02em', color: 'var(--color-text-muted)', marginTop: 1 }}>
                  {midRow}
                </span>
              )}
            </span>
            <span
              className="font-mono flex-shrink-0 uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                padding: '2px 6px',
              }}
            >
              {evidenceLabel(v.evidence_strength, lang)}
            </span>
            <span
              className="font-mono tabular-nums flex-shrink-0 text-right"
              style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 96 }}
            >
              {v.contract_count > 0
                ? lang === 'es'
                  ? `${v.contract_count} contratos`
                  : `${v.contract_count} contracts`
                : lang === 'es'
                  ? 'sin contratos en la ventana'
                  : 'none in the window'}
            </span>
          </li>
        )
      })}
      {ghostActors.map((a, i) => (
        <li
          key={`ghost-${a.name}-${i}`}
          className="flex items-center gap-3 py-1.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="flex-1 min-w-0"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'normal',
              fontSize: 14.5,
              color: 'var(--color-text-muted)',
            }}
          >
            {a.name}{' '}
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
            >
              · {lang === 'es' ? 'nombrado en §IV · sin registro COMPRANET' : 'named in §IV · no COMPRANET record'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── KeepReadingFooter ──────────────────────────────────────────────────────

export function KeepReadingFooter({
  current,
  allCases,
  lang,
}: {
  current: ScandalDetail
  allCases: ScandalListItem[] | undefined
  lang: Lang
}) {
  const sectorId = current.sector_id ?? current.sector_ids?.[0] ?? null
  const sector = sectorId != null ? SECTORS.find((s) => s.id === sectorId) : null

  const related = (allCases ?? [])
    .filter((c) => c.id !== current.id)
    .filter((c) =>
      sectorId != null
        ? c.sector_id === sectorId || (c.sector_ids ?? []).includes(sectorId)
        : true,
    )
    .sort((a, b) => (b.amount_mxn_low ?? 0) - (a.amount_mxn_low ?? 0))
    .slice(0, 3)

  if (related.length === 0) return null

  const heading = sector
    ? lang === 'es'
      ? `Sigue leyendo · más en ${sector.name}`
      : `Keep reading · more in ${sector.nameEN}`
    : lang === 'es'
      ? 'Sigue leyendo'
      : 'Keep reading'

  return (
    <section className="py-7" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <h2
          className="font-mono uppercase"
          style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 600 }}
        >
          {heading}
        </h2>
        <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        {sector && (
          <EntityIdentityChip
            type="sector"
            id={sector.id}
            name={lang === 'es' ? sector.name : sector.nameEN}
            size="sm"
          />
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3 list-none p-0 m-0">
        {related.map((c) => {
          const meta = dispositionFor(c.legal_status)
          return (
            <li
              key={c.id}
              className="p-3"
              style={{
                border: '1px solid var(--color-border)',
                boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
                borderLeft: `3px solid ${meta.ring ? 'var(--color-accent)' : meta.fill}`,
              }}
            >
              <EntityIdentityChip
                type="case"
                id={c.slug}
                name={lang === 'es' && c.name_es ? c.name_es : c.name_en}
                size="sm"
                fullName
              />
              <p
                className="mt-1.5 font-mono tabular-nums"
                style={{ fontSize: 13, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
              >
                {c.contract_year_start ?? '—'}
                {' · '}
                {c.amount_mxn_low ? formatCompactMXN(c.amount_mxn_low) : '—'}
              </p>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-center">
        <Link
          to="/cases"
          className="inline-block py-1 font-mono uppercase hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--color-text-primary)', fontWeight: 600, textDecoration: 'none' }}
        >
          {lang === 'es'
            ? `Ver los ${allCases?.length ?? 43} expedientes →`
            : `See all ${allCases?.length ?? 43} case files →`}
        </Link>
      </p>
      {(allCases ?? []).filter((c) => c.legal_status === 'convicted').length === 1 && (
        <p
          className="mt-4 text-center"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 13.5,
            color: 'var(--color-text-muted)',
          }}
        >
          {lang === 'es'
            ? `Una condena en ${allCases!.length} casos. El registro es el argumento.`
            : `One conviction in ${allCases!.length} cases. The record is the argument.`}
        </p>
      )}
    </section>
  )
}
