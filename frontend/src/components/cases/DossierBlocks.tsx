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
import { Link } from 'react-router-dom'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
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
      style={{ fontSize: 8.5, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 500 }}
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
  sections,
  lang,
}: {
  scandal: ScandalDetail
  totalCases: number | null
  sectorName: string | null
  /** Resolved sector accent (defaults to RISK_COLORS.critical upstream) —
   *  runs the card's left spine and the § index numerals (W3). */
  sectorColor: string
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
          style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'var(--color-text-secondary)', fontWeight: 600 }}
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
              className="inline-flex items-baseline gap-1.5 hover:opacity-70 transition-opacity"
              style={{ textDecoration: 'none' }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 13,
                  color: sectorColor,
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

function formatMultiplier(m: number): string {
  return m >= 10 ? String(Math.round(m)) : m.toFixed(1)
}

const COST_VB_W = 640
const COST_VB_H = 96
const COST_PAD_L = 16
const COST_PAD_R = 16
const COST_AXIS_Y = 54
const COST_PLOT_W = COST_VB_W - COST_PAD_L - COST_PAD_R

function clampAnchor(x: number, vbW: number, pad: number): 'start' | 'middle' | 'end' {
  if (x < pad + 44) return 'start'
  if (x > vbW - pad - 44) return 'end'
  return 'middle'
}

export function CostInArchive({
  amount,
  sectorId,
  sectorName,
  accentKind,
  allCases,
  lang,
}: {
  amount: number
  sectorId: number | null
  sectorName: string | null
  /** Sector accent, or the disposition ink when legal_status === 'impunity'. */
  accentKind: string
  allCases: ScandalListItem[] | undefined
  lang: Lang
}) {
  const threshold = sectorRedFlag(sectorId)
  const multiplier = amount / threshold
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null
  const sector = sectorName ?? (lang === 'es' ? 'el sector' : 'the sector')

  const multiplierSentence = multiplier >= 1.5 && (
    <p
      className="mt-2"
      style={{
        fontFamily: '"EB Garamond", Georgia, serif',
        fontStyle: 'italic',
        fontSize: 14.5,
        lineHeight: 1.45,
        color: 'var(--color-text-primary)',
      }}
    >
      {lang === 'es'
        ? <><strong className="tabular-nums not-italic">{formatMultiplier(multiplier)}×</strong> el umbral de revisión de la plataforma para {sector} — un umbral interno, no una norma oficial.</>
        : <><strong className="tabular-nums not-italic">{formatMultiplier(multiplier)}×</strong> the platform's {sector} review threshold — an internal benchmark, not an official norm.</>}
    </p>
  )

  const usable = (allCases ?? [])
    .map((c) => ({
      v: c.amount_mxn_high ?? c.amount_mxn_low ?? null,
      name: lang === 'es' && c.name_es ? c.name_es : c.name_en,
    }))
    .filter((c): c is { v: number; name: string } => c.v != null && c.v > 0)

  // Degraded: fewer than 5 usable amounts in the docket — this-case dot +
  // threshold rule + multiplier sentence only (MoneyBenchmark's old info,
  // new frame).
  if (usable.length < 5) {
    const lo = Math.sqrt(Math.max(0, Math.min(amount, threshold) * 0.8))
    const hi = Math.sqrt(Math.max(lo * lo + 1, Math.max(amount, threshold) * 1.15))
    const x = (v: number) => COST_PAD_L + ((Math.sqrt(v) - lo) / (hi - lo)) * COST_PLOT_W
    const thisX = x(amount)
    const threshX = x(threshold)
    return (
      <div className="mt-4 max-w-xl">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${COST_VB_W} ${COST_VB_H}`}
            width="100%"
            style={{ minWidth: 280, display: 'block' }}
            role="img"
            aria-label={
              lang === 'es'
                ? `Este caso: ${formatCompactMXN(amount)} frente al umbral de ${formatCompactMXN(threshold)}.`
                : `This case: ${formatCompactMXN(amount)} against the ${formatCompactMXN(threshold)} threshold.`
            }
          >
            <line x1={COST_PAD_L} y1={COST_AXIS_Y} x2={COST_VB_W - COST_PAD_R} y2={COST_AXIS_Y} stroke="var(--color-border)" strokeWidth={1} />
            <line x1={threshX} y1={COST_AXIS_Y - 20} x2={threshX} y2={COST_AXIS_Y + 20} stroke={RISK_COLORS.critical} strokeWidth={1.5} strokeDasharray="2 4" />
            <text x={threshX} y={COST_AXIS_Y + 34} textAnchor={clampAnchor(threshX, COST_VB_W, COST_PAD_R)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fill: RISK_COLORS.critical }}>
              {lang === 'es' ? 'UMBRAL' : 'THRESHOLD'} · {formatCompactMXN(threshold)}
            </text>
            <circle cx={thisX} cy={COST_AXIS_Y} r={5} fill={accentKind} stroke="var(--color-background)" strokeWidth={1.5} />
            <text x={thisX} y={COST_AXIS_Y - 12} textAnchor={clampAnchor(thisX, COST_VB_W, COST_PAD_R)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, fill: accentKind }}>
              {lang === 'es' ? 'ESTE CASO' : 'THIS CASE'} · {formatCompactMXN(amount)}
            </text>
          </svg>
        </div>
        {multiplierSentence}
      </div>
    )
  }

  const values = usable.map((c) => c.v)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const sqrtMin = Math.sqrt(minV)
  const sqrtMax = Math.sqrt(Math.max(maxV, minV + 1))
  const x = (v: number) => COST_PAD_L + ((Math.sqrt(v) - sqrtMin) / (sqrtMax - sqrtMin)) * COST_PLOT_W
  const total = usable.length
  const thisX = x(amount)
  const threshX = x(threshold)
  const isThisTheMax = maxV === amount

  const caption = lang === 'es'
    ? `Cada punto es uno de ${total} casos documentados, ubicado por su costo estimado (escala de raíz cuadrada).`
    : `Each dot is one of ${total} documented cases, placed by estimated cost (square-root scale).`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${COST_VB_W} ${COST_VB_H}`}
          width="100%"
          style={{ minWidth: 400, display: 'block' }}
          role="img"
          aria-label={
            lang === 'es'
              ? `Costo de este caso entre los ${total} casos documentados: ${formatCompactMXN(amount)}; umbral ${formatCompactMXN(threshold)}; máximo del archivo ${formatCompactMXN(maxV)}.`
              : `This case's cost among ${total} documented cases: ${formatCompactMXN(amount)}; threshold ${formatCompactMXN(threshold)}; archive max ${formatCompactMXN(maxV)}.`
          }
        >
          <line x1={COST_PAD_L} y1={COST_AXIS_Y} x2={COST_VB_W - COST_PAD_R} y2={COST_AXIS_Y} stroke="var(--color-border)" strokeWidth={1} />

          {usable.map((c, i) => (
            <circle key={i} cx={x(c.v)} cy={COST_AXIS_Y} r={2.5} fill="var(--color-text-muted)" opacity={0.32}>
              <title>{`${c.name} · ${formatCompactMXN(c.v)}`}</title>
            </circle>
          ))}

          <line x1={threshX} y1={COST_AXIS_Y - 20} x2={threshX} y2={COST_AXIS_Y + 20} stroke={RISK_COLORS.critical} strokeWidth={1.5} strokeDasharray="2 4" />
          <text x={threshX} y={COST_AXIS_Y + 34} textAnchor={clampAnchor(threshX, COST_VB_W, COST_PAD_R)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fill: RISK_COLORS.critical }}>
            {lang === 'es' ? 'UMBRAL' : 'THRESHOLD'} · {formatCompactMXN(threshold)}
          </text>

          {!isThisTheMax && (
            <text x={x(maxV)} y={COST_AXIS_Y - 8} textAnchor="end" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fill: 'var(--color-text-muted)' }}>
              {lang === 'es' ? 'MAYOR' : 'LARGEST'} · {formatCompactMXN(maxV)}
            </text>
          )}

          <circle cx={thisX} cy={COST_AXIS_Y} r={5} fill={accentKind} stroke="var(--color-background)" strokeWidth={1.5} />
          <text x={thisX} y={COST_AXIS_Y - 12} textAnchor={clampAnchor(thisX, COST_VB_W, COST_PAD_R)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, fill: accentKind }}>
            {lang === 'es' ? 'ESTE CASO' : 'THIS CASE'} · {formatCompactMXN(amount)}
          </text>
        </svg>
      </div>
      <p
        className="mt-2"
        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-muted)', maxWidth: '64ch' }}
      >
        {caption}
      </p>
      {multiplierSentence}
    </div>
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
                    style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
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
                fontSize: 8.5,
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
              fontStyle: 'italic',
              fontSize: 14.5,
              color: 'var(--color-text-muted)',
            }}
          >
            {a.name}{' '}
            <span
              className="font-mono not-italic uppercase"
              style={{ fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}
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
      <div
        className="flex items-center gap-3 mb-3 font-mono uppercase"
        style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--color-text-muted)', fontWeight: 600 }}
      >
        <span>{heading}</span>
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
          className="font-mono uppercase hover:opacity-70 transition-opacity"
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
