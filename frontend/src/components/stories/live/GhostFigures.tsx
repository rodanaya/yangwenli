/**
 * GhostFigures — the five live figures of «El hombre que ganó 370 millones de
 * pesos y desapareció» (SD-06).
 *
 * The story is the June remake's approved proof piece and its voice is not in
 * play here. One number is. It said SAT's definitive Article 69-B list
 * confirms 42 of the 6,118 vendors ARIA flags on the ghost pattern; the
 * register says 126, from three endpoints that agree. `useGhostData` explains
 * where the 42 survives and why nobody caught it.
 *
 * What the figures argue, in order: one vendor's whole life fits in two cells
 * of a 24-year strip (F1); he is one of a crowd of small vendors with a very
 * long right tail, and the five the chapter names are the tail (F2); SAT has
 * confirmed the smallest of them and none of the largest (F3); the two lists
 * barely meet (F4); and the roster behind the lede is live, with every
 * disposition printed (F5).
 *
 * **No dot-grid, and no grid tally of circles anywhere.** The user banned the
 * 42-against-6,076 dot field outright ("i hate this graph. never want to see
 * it in my life"). F2 is the only figure with circles in it and it is a
 * distribution: a mark's position is its vendor's lifetime value on a log
 * axis, nothing is arranged on a lattice, and no mark stands for a count.
 *
 * Rules inherited from SD-01..05: HTML owns every glyph — there is no <text>
 * in this file — no label or value is truncated, a number never breaks across
 * a line, and a figure whose query fails says so in one mono line rather than
 * falling back to a typed number.
 */
import { Link } from 'react-router-dom'
import type { AriaPatternGroupsResponse, AriaPatternVendor, GhostSuspect } from '@/api/types'
import { ChartCard } from '@/components/stories/InlineCharts'
import { HatchBand } from '@/components/methodology/TwoWorldsExhibit'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  CARRANZA_ID,
  NAMED_VENDORS,
  ROSTER_ROWS,
  isCleared,
  runSeconds,
  useAriaRun,
  useGhostLifecycles,
  useGhostPopulation,
  useP2Cohort,
  useP2Efos,
  type EfosSet,
  type GhostPopulation,
  type Lifecycle,
} from './useGhostData'

export type GhostFigureKind =
  | 'p2-lifecycle'
  | 'p2-population'
  | 'p2-signals'
  | 'p2-match'
  | 'p2-roster'

const EMPHASIS = 'var(--color-risk-critical)'
const MUTED = 'var(--color-text-muted)'
/** Zinc — the unemphasised field. Low is never green (Bible § 3.10). */
const FIELD = '#71717a'
/** Amber — agreement between the model and the state, as on /methodology. */
const AGREE = 'var(--color-risk-high)'

const STAMP = { en: 'LIVE · ARIA', es: 'EN VIVO · ARIA' } as const

/** SAT's definitive Art. 69-B list, April 2026 — no endpoint publishes it. */
const SAT_LIST_SIZE = 13960

/** The record the strips span. */
const YEAR_FROM = 2002
const YEAR_TO = 2025

const pct1 = (v: number) => `${v.toFixed(1)}%`

/** "1 contract" / "1 contrato" — the register has single-contract vendors. */
const contractsWord = (n: number, lang: 'en' | 'es') =>
  lang === 'es' ? (n === 1 ? 'contrato' : 'contratos') : n === 1 ? 'contract' : 'contracts'

// ── shared card states ────────────────────────────────────────────────────

function Loading({ eyebrow, title, lang }: { eyebrow: string; title: string; lang: 'en' | 'es' }) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <div
        role="status"
        aria-label={lang === 'es' ? 'Cargando la figura en vivo' : 'Loading the live figure'}
        className="h-40 rounded-sm bg-surface-2 motion-safe:animate-pulse"
      />
    </ChartCard>
  )
}

function Unavailable({
  eyebrow,
  title,
  lang,
  to,
}: {
  eyebrow: string
  title: string
  lang: 'en' | 'es'
  to: string
}) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <p className="px-2 py-8 font-mono text-[12px] leading-relaxed text-text-muted">
        {lang === 'es' ? 'Figura en vivo no disponible — ver ' : 'Live figure unavailable — see '}
        <Link to={to} className="underline underline-offset-2 hover:text-text-secondary">
          {to}
        </Link>
      </p>
    </ChartCard>
  )
}

/**
 * A row of facts under a chip or a strip.
 *
 * Each cell is its own unbreakable unit with a break opportunity between
 * cells, so the line wraps between facts and never inside one (STORY_DAYS
 * § 7).
 */
function FactLine({ items, className = '' }: { items: React.ReactNode[]; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono tabular-nums text-text-muted ${className}`}
      style={{ fontSize: 11.5 }}
    >
      {items.filter(Boolean).map((node, i) => (
        <span key={i} className="whitespace-nowrap">
          {node}
        </span>
      ))}
    </div>
  )
}

/** A closing line under a figure — the sum, the caveat, the rollup. */
function Footline({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="w-full pt-4 font-mono"
      style={{ fontSize: 12, lineHeight: 1.6, color: MUTED, textWrap: 'pretty' }}
    >
      {children}
    </p>
  )
}

// ── F1 · appear, win, vanish ──────────────────────────────────────────────

const F1_CHROME = {
  en: { eyebrow: 'FIGURE I · APPEAR, WIN, VANISH', title: 'Five contracting lives, drawn against the whole record' },
  es: { eyebrow: 'FIGURA I · APARECE, GANA, DESAPARECE', title: 'Cinco vidas de contratación, sobre todo el registro' },
}

const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i)
/** Decade rules printed under the strip — every year label would not fit. */
const YEAR_TICKS = [2002, 2008, 2014, 2020, 2025]

function Lifecycles({
  rows,
  lang,
  stage = 3,
}: {
  rows: Lifecycle[]
  lang: 'en' | 'es'
  stage?: number
}) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  const clamped = Math.min(Math.max(stage, 0), 3)

  // Ordered as the chapter names them — the lede first, the two other physical
  // persons next, the two foreign-domiciled companies last — not by value.
  // F2 is where they are placed by money.
  const order = [CARRANZA_ID, 54323, 69019, 205012, 124418]
  const ordered = order
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is Lifecycle => Boolean(r))
  // The reveal follows the prose: paragraph 1 is Carranza, 2 is the other two
  // persons, 3 is the pair of foreign entities.
  const litCount = clamped <= 0 ? 1 : clamped === 1 ? 3 : ordered.length

  const carranza = ordered.find((r) => r.id === CARRANZA_ID) ?? ordered[0]
  const totalOf = (r: Lifecycle) => r.years.reduce((s, y) => s + y.value, 0)
  const contractsOf = (r: Lifecycle) => r.years.reduce((s, y) => s + y.contracts, 0)
  const activeYears = ordered.reduce((s, r) => s + r.years.length, 0)
  const lastYear = Math.max(...ordered.flatMap((r) => r.years.map((y) => y.year)))
  const cohortValue = ordered.reduce((s, r) => s + totalOf(r), 0)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(totalOf(carranza)),
        label: es
          ? `de Emilio Carranza Obersohn — dos contratos en una sola dependencia, y nada antes ni después en veinticuatro años de registro`
          : `won by Emilio Carranza Obersohn — two contracts at one institution, and nothing before or after across twenty-four years of record`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada tira son los ${YEARS.length} años del registro federal, de ${YEAR_FROM} a ${YEAR_TO}. Una celda se llena solo si ese proveedor firmó al menos un contrato ese año, y el monto del año va impreso debajo, no dentro de la celda: a 390 px una celda mide trece píxeles y una cifra dentro de ella se cortaría. Las filas van en el orden en que el capítulo las nombra, no por monto. El año de cada contrato es el que trae el contrato; el padrón de proveedores fecha los dos de Carranza en 2011 y por eso ARIA le cuenta un solo año activo. Cifras en vivo de /vendors/:id/risk-timeline.`
          : `Each strip is the ${YEARS.length} years of the federal record, ${YEAR_FROM} to ${YEAR_TO}. A cell fills only if that vendor signed at least one contract that year, and the year's amount is printed below the strip rather than inside the cell: at 390 px a cell is thirteen pixels wide and a figure set inside it would be cut. Rows run in the order the chapter names them, not by value. Each contract's year is the one the contract carries; the vendor register dates both of Carranza's to 2011, which is why ARIA counts him a single active year. Figures live from /vendors/:id/risk-timeline.`
      }
    >
      <div className="px-2 pb-2">
        {ordered.map((r, i) => {
          const lit = i < litCount
          const total = totalOf(r)
          const active = new Map(r.years.map((y) => [y.year, y]))
          const color = lit ? EMPHASIS : FIELD
          return (
            <div key={r.id} className="border-b border-border py-3">
              <EntityIdentityChip
                type="vendor"
                id={r.id}
                name={r.name}
                size="sm"
                riskScore={r.risk}
                fullName
              />

              <div className="mt-2 flex gap-px" style={{ height: 22 }} aria-hidden="true">
                {YEARS.map((y) => {
                  const hit = active.get(y)
                  return (
                    <div
                      key={y}
                      className="min-w-0 flex-1"
                      style={{
                        background: hit ? color : 'var(--color-border)',
                        opacity: hit ? (lit ? 0.95 : 0.55) : 0.4,
                        borderRadius: 1,
                        transition: 'background-color 240ms ease, opacity 240ms ease',
                      }}
                    />
                  )
                })}
              </div>

              {/* Ticks are absolutely placed over the strip's own width rather
                  than one label per cell: a cell is 13 px at 390 and a 10.5 px
                  label set inside it would wrap to two lines. The ends clamp
                  inward so neither runs past the card (STORY_DAYS § 7). */}
              <div className="relative mt-1" style={{ height: 14 }} aria-hidden="true">
                {YEAR_TICKS.map((y) => {
                  const i = YEARS.indexOf(y)
                  const left = ((i + 0.5) / YEARS.length) * 100
                  const edge = y === YEAR_TICKS[0] ? '0' : y === YEAR_TICKS[YEAR_TICKS.length - 1] ? '-100%' : '-50%'
                  return (
                    <span
                      key={y}
                      className="absolute whitespace-nowrap font-mono tabular-nums"
                      style={{ left: `${left}%`, transform: `translateX(${edge})`, fontSize: 10.5, color: MUTED }}
                    >
                      {y}
                    </span>
                  )
                })}
              </div>

              <FactLine
                className="mt-2"
                items={[
                  <span className="text-text-primary">{formatCompactMXN(total)}</span>,
                  <>
                    {formatNumber(contractsOf(r))} {contractsWord(contractsOf(r), lang)}
                  </>,
                  <>
                    {r.years.length}{' '}
                    {es
                      ? r.years.length === 1
                        ? 'año activo'
                        : 'años activos'
                      : r.years.length === 1
                        ? 'active year'
                        : 'active years'}
                  </>,
                ]}
              />
              <FactLine
                className="mt-0.5"
                items={r.years.map((y) => (
                  <>
                    {y.year}: {formatCompactMXN(y.value)}
                  </>
                ))}
              />
            </div>
          )
        })}

        {clamped >= 3 && (
          <Footline>
            {es ? 'Los cinco juntos: ' : 'The five together: '}
            <span className="whitespace-nowrap text-text-primary">
              {formatCompactMXN(cohortValue)}
            </span>
            {es
              ? ` en ${activeYears} años activos repartidos entre veinticuatro, y ninguno vuelve a aparecer después de ${lastYear}.`
              : ` across ${activeYears} active years out of twenty-four apiece, and not one of them appears again after ${lastYear}.`}
          </Footline>
        )}

        <span className="sr-only">
          {ordered
            .map((r) =>
              es
                ? `${r.name}: ${formatCompactMXN(totalOf(r))} en ${formatNumber(contractsOf(r))} contratos, años activos ${r.years.map((y) => y.year).join(' y ')}.`
                : `${r.name}: ${formatCompactMXN(totalOf(r))} across ${formatNumber(contractsOf(r))} contracts, active in ${r.years.map((y) => y.year).join(' and ')}.`,
            )
            .join(' ')}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F2 · the population ───────────────────────────────────────────────────

const F2_CHROME = {
  en: { eyebrow: 'FIGURE II · THE POPULATION', title: 'A crowd of small vendors, and a tail with five names on it' },
  es: { eyebrow: 'FIGURA II · LA POBLACIÓN', title: 'Una multitud de proveedores chicos, y una cola con cinco nombres' },
}

/** The strip runs 10 thousand to 10 billion pesos — six decades. */
const LOG_MIN = 4
const LOG_MAX = 10
const PLOT_W = 760
const PLOT_H = 132

const DECADES = [4, 5, 6, 7, 8, 9, 10]
const DECADE_LABEL: Record<number, { en: string; es: string }> = {
  4: { en: '10K', es: '0.01' },
  5: { en: '100K', es: '0.1' },
  6: { en: '1M', es: '1' },
  7: { en: '10M', es: '10' },
  8: { en: '100M', es: '100' },
  9: { en: '1B', es: '1,000' },
  10: { en: '10B', es: '10,000' },
}

/**
 * A stable vertical offset per vendor, so the cloud does not reshuffle on a
 * re-render and a reader can point at the same mark twice. Knuth's
 * multiplicative hash on the vendor id — no randomness, no lattice.
 */
function jitter(id: number): number {
  return ((id * 2654435761) % 4096) / 4096
}

const TIER_COLOR: Record<GhostSuspect['ghost_confidence_tier'], string> = {
  confirmed: EMPHASIS,
  multi_signal: AGREE,
  behavioral: FIELD,
}

function Population({
  pop,
  efos,
  cohortTotal,
  lang,
}: {
  pop: GhostPopulation
  efos: EfosSet
  /** The P2 cohort the ranking scores a subset of — 6,118 today. */
  cohortTotal: number
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const drawn = pop.rows
  const namedIds = new Set(NAMED_VENDORS.map((v) => v.id))

  // One decimal is a tenth of a viewBox unit — below a rendered pixel at every
  // width, and it keeps a thousand marks from writing seventeen-digit
  // coordinates into the DOM (vercel-react-best-practices § rendering).
  const r1 = (n: number) => Math.round(n * 10) / 10
  // Inset by a mark's radius: a vendor sitting exactly on 10 thousand pesos
  // drew at x = 0 and the viewBox cut it in half.
  const INSET = 5
  const x = (v: number) => {
    const l = Math.log10(Math.max(v, 1))
    const t = Math.min(Math.max((l - LOG_MIN) / (LOG_MAX - LOG_MIN), 0), 1)
    return r1(INSET + t * (PLOT_W - 2 * INSET))
  }
  const y = (id: number) => r1(8 + jitter(id) * (PLOT_H - 16))

  const values = drawn
    .map((r) => r.total_value_mxn ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  const median = values.length ? values[Math.floor(values.length / 2)] : 0
  const shortLived = drawn.filter((r) => (r.years_active ?? 0) <= 1).length

  // The five the chapter names, drawn last so they sit on top of the cloud.
  const highlighted = drawn.filter((r) => namedIds.has(r.vendor_id))
  const field = drawn.filter((r) => !namedIds.has(r.vendor_id))

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(median),
        label: es
          ? `es la contratación federal de por vida del proveedor mediano entre los ${formatNumber(drawn.length)} de mayor evidencia — el patrón es una multitud de proveedores chicos, no un puñado de grandes`
          : `is the lifetime federal contracting of the median vendor among the ${formatNumber(drawn.length)} best-evidenced — the pattern is a crowd of small vendors, not a handful of big ones`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada marca es un proveedor, colocado por su contratación federal de por vida sobre un eje logarítmico de seis décadas; la altura es un desplazamiento fijo derivado de su folio, solo para que las marcas no se encimen. Nada está ordenado en una retícula y ninguna marca representa un conteo. Se dibujan ${formatNumber(drawn.length)} de los ${formatNumber(pop.total)} proveedores que el modelo de señales fantasma puntúa, tomados por evidencia y no por monto: eso incluye las ${formatNumber(pop.tiers.confirmed)} filas corroboradas y las ${formatNumber(pop.tiers.multi_signal)} multiseñal completas, más las ${formatNumber(drawn.length - pop.tiers.confirmed - pop.tiers.multi_signal)} conductuales de mayor puntaje. La mediana y la cuenta de años activos de abajo son de esas ${formatNumber(drawn.length)}, no de la cohorte entera. Cifras en vivo de /aria/ghost-suspects.`
          : `Each mark is one vendor, placed by its lifetime federal contracting on a six-decade logarithmic axis; the height is a fixed offset derived from its record number, there only to keep marks from sitting on top of each other. Nothing is arranged on a lattice and no mark stands for a count. ${formatNumber(drawn.length)} of the ${formatNumber(pop.total)} vendors the ghost-signal model scores are drawn, taken by evidence rather than by value: that is every one of the ${formatNumber(pop.tiers.confirmed)} corroborated and all ${formatNumber(pop.tiers.multi_signal)} multi-signal rows, plus the ${formatNumber(drawn.length - pop.tiers.confirmed - pop.tiers.multi_signal)} highest-scoring behavioural ones. The median and the active-year count below are of those ${formatNumber(drawn.length)}, not of the whole cohort. Figures live from /aria/ghost-suspects.`
      }
    >
      <div className="px-2 pb-2">
        {/* A distribution, not a tally: x is a value, y is an anti-overlap
            offset, and there is no grid. The banned dot-grid counted vendors
            into cells; this cannot, because two marks at the same value sit at
            different heights and a mark carries no unit. */}
        <svg
          viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-hidden="true"
        >
          {DECADES.map((d) => {
            const px = r1(INSET + ((d - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (PLOT_W - 2 * INSET))
            return (
              <line
                key={d}
                x1={px}
                y1={0}
                x2={px}
                y2={PLOT_H}
                stroke="var(--color-border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          {field.map((r) => (
            <circle
              key={r.vendor_id}
              cx={x(r.total_value_mxn ?? 0)}
              cy={y(r.vendor_id)}
              r={2}
              fill={TIER_COLOR[r.ghost_confidence_tier]}
              fillOpacity={r.ghost_confidence_tier === 'behavioral' ? 0.42 : 0.8}
            />
          ))}
          {highlighted.map((r) => (
            <circle
              key={r.vendor_id}
              cx={x(r.total_value_mxn ?? 0)}
              cy={y(r.vendor_id)}
              r={5}
              fill="none"
              stroke={EMPHASIS}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Axis glyphs are HTML, clamped at both ends so neither runs past the
            card's overflow edge; the alternates drop below `sm`, where seven
            labels would collide (STORY_DAYS § 7). */}
        <div className="relative mt-1" style={{ height: 18 }} aria-hidden="true">
          {DECADES.map((d, i) => {
            // The same inset the plot uses, so a glyph sits under its own rule.
            const p = (100 * (INSET + ((d - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (PLOT_W - 2 * INSET))) / PLOT_W
            const edge = i === 0 ? '0' : i === DECADES.length - 1 ? '-100%' : '-50%'
            const hideNarrow = i % 2 === 1
            return (
              <span
                key={d}
                className={`absolute whitespace-nowrap font-mono tabular-nums ${hideNarrow ? 'hidden sm:inline' : ''}`}
                style={{ left: `${p}%`, transform: `translateX(${edge})`, fontSize: 10.5, color: MUTED }}
              >
                {DECADE_LABEL[d][lang]}
              </span>
            )
          })}
        </div>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: 10.5 }}>
          {es ? 'contratación de por vida, millones de pesos (escala logarítmica)' : 'lifetime contracting, MXN (log scale)'}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {(
            [
              ['confirmed', es ? 'corroborado por un registro externo' : 'corroborated by an outside registry', pop.tiers.confirmed],
              ['multi_signal', es ? 'varias señales' : 'several signals', pop.tiers.multi_signal],
              ['behavioral', es ? 'solo conducta' : 'behaviour only', pop.tiers.behavioral],
            ] as const
          ).map(([tier, label, count]) => (
            <span
              key={tier}
              className="flex items-center gap-1.5 whitespace-nowrap font-mono tabular-nums"
              style={{ fontSize: 11.5, color: MUTED }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: TIER_COLOR[tier],
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {formatNumber(count)} {label}
            </span>
          ))}
        </div>

        <Footline>
          {es
            ? `Los cinco proveedores que el capítulo anterior nombra son los cinco mayores de toda la cohorte puntuada — los anillos abiertos, al extremo de la cola. `
            : `The five vendors the previous chapter names are the five largest in the whole scored cohort — the open rings, at the far end of the tail. `}
          <span className="whitespace-nowrap text-text-primary">{formatNumber(shortLived)}</span>
          {es
            ? ` de los ${formatNumber(drawn.length)} dibujados contrataron un solo año o menos, y ${formatNumber(efos.count)} de los ${formatNumber(cohortTotal)} de la cohorte llevan el listado definitivo del SAT.`
            : ` of the ${formatNumber(drawn.length)} drawn contracted for a single year or less, and ${formatNumber(efos.count)} of the cohort's ${formatNumber(cohortTotal)} carry SAT's definitive listing.`}
        </Footline>

        <span className="sr-only">
          {es
            ? `Distribución de ${formatNumber(drawn.length)} proveedores con patrón fantasma por contratación de por vida, de ${formatCompactMXN(values[0] ?? 0)} a ${formatCompactMXN(values[values.length - 1] ?? 0)}, con mediana de ${formatCompactMXN(median)}.`
            : `Distribution of ${formatNumber(drawn.length)} ghost-pattern vendors by lifetime contracting, from ${formatCompactMXN(values[0] ?? 0)} to ${formatCompactMXN(values[values.length - 1] ?? 0)}, median ${formatCompactMXN(median)}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F3 · the signal matrix ────────────────────────────────────────────────

const F3_CHROME = {
  en: { eyebrow: 'FIGURE III · WHAT EACH SIGNAL SAYS', title: 'SAT has confirmed the smallest of them and none of the largest' },
  es: { eyebrow: 'FIGURA III · QUÉ DICE CADA SEÑAL', title: 'El SAT confirmó a los más chicos y a ninguno de los más grandes' },
}

/**
 * The seven signals that fire on anybody.
 *
 * `sig_young_company`, `sig_invalid_rfc`, `sig_high_risk` and `sig_efos_soft`
 * are columns of dashes on every row the endpoint serves, so they are not
 * drawn; the caption says they never fire rather than printing four empty
 * columns. `efos` is read from the queue, not from the row, because the
 * ranking table is one EFOS import behind (see `useGhostData`).
 */
type SignalKey =
  | 'sig_sfp_sanctioned'
  | 'sig_disappeared'
  | 'sig_p7_intersection'
  | 'sig_ultra_micro'
  | 'sig_short_lived'
  | 'sig_temporal_burst'

const SIGNALS: ReadonlyArray<{
  key: SignalKey | 'efos'
  head: { en: string; es: string }
  full: { en: string; es: string }
}> = [
  { key: 'efos', head: { en: 'EFOS', es: 'EFOS' }, full: { en: "SAT's definitive Art. 69-B listing", es: 'listado definitivo SAT Art. 69-B' } },
  { key: 'sig_sfp_sanctioned', head: { en: 'SFP', es: 'SFP' }, full: { en: 'sanctioned by the public-service ministry', es: 'sancionado por la Función Pública' } },
  { key: 'sig_disappeared', head: { en: 'GONE', es: 'DESAP' }, full: { en: 'no contract since', es: 'sin contratos desde entonces' } },
  { key: 'sig_p7_intersection', head: { en: 'P7', es: 'P7' }, full: { en: 'also on ARIA pattern 7', es: 'también en el patrón 7 de ARIA' } },
  { key: 'sig_ultra_micro', head: { en: 'MICRO', es: 'MICRO' }, full: { en: 'ultra-thin contracting footprint', es: 'huella de contratación mínima' } },
  { key: 'sig_short_lived', head: { en: 'SHORT', es: 'CORTA' }, full: { en: 'a contracting life of one year', es: 'vida contratante de un año' } },
  { key: 'sig_temporal_burst', head: { en: 'BURST', es: 'RÁFAGA' }, full: { en: 'every contract inside one window', es: 'todos los contratos en una ventana' } },
]

const TIER_LABEL: Record<GhostSuspect['ghost_confidence_tier'], { en: string; es: string }> = {
  confirmed: { en: 'corroborated', es: 'corroborado' },
  multi_signal: { en: 'several signals', es: 'varias señales' },
  behavioral: { en: 'behaviour only', es: 'solo conducta' },
}

/** The ten rows: the five the chapter names, then the five best-evidenced. */
function matrixRows(pop: GhostPopulation): GhostSuspect[] {
  const named = NAMED_VENDORS.map((v) => pop.rows.find((r) => r.vendor_id === v.id)).filter(
    (r): r is GhostSuspect => Boolean(r),
  )
  const seen = new Set(named.map((r) => r.vendor_id))
  const best = pop.rows.filter((r) => !seen.has(r.vendor_id)).slice(0, 5)
  return [...named, ...best]
}

function Signals({
  pop,
  efos,
  runS,
  lang,
}: {
  pop: GhostPopulation
  efos: EfosSet
  runS: number | null
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const rows = matrixRows(pop)
  const fires = (r: GhostSuspect, key: (typeof SIGNALS)[number]['key']) =>
    key === 'efos' ? efos.ids.has(r.vendor_id) : r[key] === 1
  const listed = rows.filter((r) => efos.ids.has(r.vendor_id))
  const unlisted = rows.filter((r) => !efos.ids.has(r.vendor_id))
  const sum = (rs: GhostSuspect[]) => rs.reduce((s, r) => s + (r.total_value_mxn ?? 0), 0)
  const runLabel = runS === null ? null : runS < 600 ? `${Math.floor(runS / 60)}m ${Math.round(runS % 60)}s` : `${Math.round(runS / 60)} min`

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: `${listed.length} / ${rows.length}`,
        label: es
          ? `de los proveedores de abajo llevan el listado definitivo del SAT — y son los ${listed.length} más chicos de los diez`
          : `of the vendors below carry SAT's definitive listing — and they are the ${listed.length} smallest of the ten`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Las primeras cinco filas son los proveedores que el capítulo 1 nombra; las otras cinco son las de mayor puntaje de evidencia en toda la tabla. Una paloma es una señal que se dispara, una raya es una que no: ningún dato se codifica solo por color. La columna EFOS se lee de la cola de ARIA y no de la fila puntuada, porque la tabla de puntajes va un corte del SAT atrás — trae 42 listados y la cola trae ${formatNumber(efos.count)}. Las señales «empresa joven», «RFC inválido», «alto riesgo» y «EFOS presuntivo» no se dibujan: no se disparan en ninguna fila que el endpoint entrega. Cifras en vivo de /aria/ghost-suspects y /aria/queue.`
          : `The first five rows are the vendors chapter 1 names; the other five are the highest evidence scores in the whole table. A tick is a signal that fires and a dash is one that does not: nothing here is encoded by colour alone. The EFOS column is read from the ARIA queue rather than from the scored row, because the scoring table is one SAT import behind — it carries 42 listings where the queue carries ${formatNumber(efos.count)}. The "young company", "invalid RFC", "high risk" and "presumptive EFOS" signals are not drawn: they fire on no row the endpoint serves. Figures live from /aria/ghost-suspects and /aria/queue.`
      }
    >
      <div className="px-2 pb-2">
        {/* Seven equal columns at every width. The headers are 10.5 px with
            no tracking and the widest of them (RÁFAGA, six glyphs) measures
            ~38 px inside a ~41 px column at 390 — the narrowest the card gets.
            Any wider header would have to lose a column, not shrink. */}
        <div
          className="grid gap-x-0.5 border-b border-border pb-1"
          style={{ gridTemplateColumns: `repeat(${SIGNALS.length}, minmax(0, 1fr))` }}
        >
          {SIGNALS.map((s) => (
            <span
              key={String(s.key)}
              className="text-center font-mono uppercase"
              style={{ fontSize: 10.5, color: MUTED }}
            >
              <span className="sr-only">{s.full[lang]}</span>
              <span aria-hidden="true">{s.head[lang]}</span>
            </span>
          ))}
        </div>

        {rows.map((r) => {
          const on = efos.ids.has(r.vendor_id)
          return (
            <div key={r.vendor_id} className="border-b border-border py-2.5">
              <EntityIdentityChip
                type="vendor"
                id={r.vendor_id}
                name={r.vendor_name ?? ''}
                size="sm"
                riskScore={r.avg_risk_score}
                fullName
              />
              <FactLine
                className="mt-1"
                items={[
                  <span className="text-text-primary">{formatCompactMXN(r.total_value_mxn ?? 0)}</span>,
                  <>
                    {formatNumber(r.total_contracts ?? 0)} {contractsWord(r.total_contracts ?? 0, lang)}
                  </>,
                  <span style={{ color: on ? EMPHASIS : MUTED }}>{TIER_LABEL[r.ghost_confidence_tier][lang]}</span>,
                ]}
              />
              <div
                className="mt-1.5 grid gap-x-0.5"
                style={{ gridTemplateColumns: `repeat(${SIGNALS.length}, minmax(0, 1fr))` }}
              >
                {SIGNALS.map((s) => {
                  const hit = fires(r, s.key)
                  return (
                    <span
                      key={String(s.key)}
                      className="text-center font-mono"
                      style={{ fontSize: 13, color: hit ? EMPHASIS : 'var(--color-border)' }}
                    >
                      <span className="sr-only">
                        {`${s.full[lang]}: ${hit ? (es ? 'sí' : 'yes') : es ? 'no' : 'no'}. `}
                      </span>
                      <span aria-hidden="true">{hit ? '✓' : '—'}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}

        <Footline>
          {es ? 'Los ' : 'The '}
          <span className="whitespace-nowrap text-text-primary">{listed.length}</span>
          {es ? ' que el SAT sí listó suman ' : ' SAT has listed hold '}
          <span className="whitespace-nowrap text-text-primary">{formatCompactMXN(sum(listed))}</span>
          {es ? ' entre todos; los ' : ' between them; the '}
          <span className="whitespace-nowrap text-text-primary">{unlisted.length}</span>
          {es ? ' que no listó suman ' : ' it has not hold '}
          <span className="whitespace-nowrap text-text-primary">{formatCompactMXN(sum(unlisted))}</span>
          {es ? '.' : '.'}
          {runLabel ? (
            <>
              {es
                ? ` La lista del SAT tarda de 6 a 36 meses en armarse, caso por caso; la última corrida completa de ARIA puntuó a los 248,944 proveedores del padrón en ${runLabel}. Lo que el pipeline no puede hacer es probar ninguno de esos casos.`
                : ` SAT's list takes six to thirty-six months to build, case by case; ARIA's last full run scored all 248,944 vendors in the register in ${runLabel}. What the pipeline cannot do is prove any one of those cases.`}
            </>
          ) : null}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F4 · the match ledger ─────────────────────────────────────────────────

const F4_CHROME = {
  en: { eyebrow: 'FIGURE IV · THE MATCH', title: 'Two lists of ghosts, and the sliver where they meet' },
  es: { eyebrow: 'FIGURA IV · LA COINCIDENCIA', title: 'Dos listas de fantasmas, y la astilla donde coinciden' },
}

function Match({
  body,
  efos,
  lang,
}: {
  body: AriaPatternGroupsResponse
  efos: EfosSet
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const k = body.cohort!

  // The cohort splits three ways and the three must sum to it: confirmed by
  // SAT, documented by RUBLI and nowhere else, and neither.
  const confirmed = efos.count
  const gtOnly = Math.max(k.in_ground_truth - efos.inGroundTruth, 0)
  const neither = Math.max(k.total_vendors - confirmed - gtOnly, 0)
  const p = (n: number) => (k.total_vendors > 0 ? (100 * n) / k.total_vendors : 0)
  const lensPct = Math.min(100, p(confirmed) * 10)
  const satShare = (100 * confirmed) / SAT_LIST_SIZE
  const valueShare = k.total_value_mxn > 0 ? (100 * efos.valueMxn) / k.total_value_mxn : 0

  const rowLabel = 'font-mono uppercase text-text-muted'
  const rowLabelStyle = { fontSize: 11, letterSpacing: '0.12em' } as const

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(confirmed),
        label: es
          ? `de los ${formatNumber(k.total_vendors)} proveedores con patrón fantasma ya llevan el listado definitivo del SAT bajo el Artículo 69-B`
          : `of the ${formatNumber(k.total_vendors)} ghost-pattern vendors already carry SAT's definitive Article 69-B listing`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada banda es una lista entera dibujada a todo el ancho, con su propio total impreso: no comparten escala, porque lo que se compara es la misma astilla de ${formatNumber(confirmed)} vista desde los dos lados. Los tres tramos de la primera banda suman la cohorte exacta —${formatNumber(confirmed)} + ${formatNumber(gtOnly)} + ${formatNumber(neither)} = ${formatNumber(k.total_vendors)}— y el detalle amplía ese primer tramo diez veces para que se lea, como en la lámina de /methodology. La segunda banda es la única cifra tecleada de la figura: el tamaño del listado definitivo del SAT a abril de 2026, que ningún endpoint publica. Cifras en vivo de /aria/patterns/P2/institutions y /aria/queue.`
          : `Each band is one whole list drawn at full width, with its own total printed: they do not share a scale, because what is being compared is the same sliver of ${formatNumber(confirmed)} seen from both sides. The three segments of the first band sum to the cohort exactly — ${formatNumber(confirmed)} + ${formatNumber(gtOnly)} + ${formatNumber(neither)} = ${formatNumber(k.total_vendors)} — and the detail magnifies that first segment ten times to make it legible, as the plate on /methodology does. The second band is the only typed number in the figure: the size of SAT's definitive list as of April 2026, which no endpoint publishes. Figures live from /aria/patterns/P2/institutions and /aria/queue.`
      }
    >
      <div className="px-2 pb-2">
        {/* BAND A — the P2 cohort */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={rowLabel} style={rowLabelStyle}>
            {es ? 'COHORTE FANTASMA · ARIA P2' : 'GHOST COHORT · ARIA P2'}
          </span>
          <span
            className="whitespace-nowrap tabular-nums"
            style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: 22, color: FIELD }}
          >
            {formatNumber(k.total_vendors)}
          </span>
        </div>
        <div className="mt-1.5">
          <HatchBand
            segments={[
              { pct: p(neither), fill: 'hatch', color: EMPHASIS },
              { pct: p(gtOnly), fill: 'dense', color: EMPHASIS },
              { pct: p(confirmed), fill: 'solid', color: AGREE },
            ]}
          />
        </div>
        <FactLine
          className="mt-1.5"
          items={[
            <>
              {formatNumber(neither)} {es ? 'en ninguna lista' : 'on neither list'}
            </>,
            <>
              {formatNumber(gtOnly)} {es ? 'solo en los casos de RUBLI' : "in RUBLI's cases only"}
            </>,
            <span style={{ color: AGREE }}>
              {formatNumber(confirmed)} {es ? 'listados por el SAT' : 'listed by SAT'}
            </span>,
          ]}
        />

        {/* the ×10 lens on the sliver */}
        <div className="mt-4 border border-border p-3">
          <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10.5, letterSpacing: '0.12em' }}>
            {es
              ? `DETALLE ×10 · los ${formatNumber(confirmed)} listados, ampliados`
              : `DETAIL ×10 · the ${formatNumber(confirmed)} listed, magnified`}
          </p>
          <div className="mt-2" style={{ width: `${lensPct}%` }}>
            <HatchBand segments={[{ pct: 100, fill: 'solid', color: AGREE }]} />
          </div>
          <p className="mt-1.5 font-mono" style={{ fontSize: 11, lineHeight: 1.5, color: MUTED, textWrap: 'pretty' }}>
            {es
              ? `${pct1(p(confirmed))} de la cohorte, y ${pct1(valueShare)} de sus ${formatCompactMXN(k.total_value_mxn)} — el SAT ha confirmado a los proveedores chicos.`
              : `${pct1(p(confirmed))} of the cohort, and ${pct1(valueShare)} of its ${formatCompactMXN(k.total_value_mxn)} — SAT has confirmed the small vendors.`}
          </p>
        </div>

        {/* BAND B — SAT's own list, on its own scale */}
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={rowLabel} style={rowLabelStyle}>
            {es ? 'LISTA DEFINITIVA SAT · ART. 69-B' : "SAT DEFINITIVE LIST · ART. 69-B"}
          </span>
          <span
            className="whitespace-nowrap tabular-nums"
            style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: 22, color: FIELD }}
          >
            {formatNumber(SAT_LIST_SIZE)}
          </span>
        </div>
        <div className="mt-1.5">
          <HatchBand
            segments={[
              { pct: 100 - satShare, fill: 'hatch', color: FIELD },
              { pct: satShare, fill: 'solid', color: AGREE },
            ]}
          />
        </div>
        <FactLine
          className="mt-1.5"
          items={[
            <>
              {/* Short on purpose: "…with no P2-pattern federal contracting"
                  in a no-break fact cell ran 16 px past the card's overflow
                  edge at 390 (STORY_DAYS § 7). The annotation carries the
                  long reading. */}
              {formatNumber(SAT_LIST_SIZE - confirmed)}{' '}
              {es ? 'fuera de la cohorte P2' : 'not in the P2 cohort'}
            </>,
            <span style={{ color: AGREE }}>
              {formatNumber(confirmed)} · {pct1(satShare)} {es ? 'de la lista del SAT' : "of SAT's list"}
            </span>,
            <span className="text-text-muted">{es ? 'cifra tecleada · SAT, abril 2026' : 'typed figure · SAT, April 2026'}</span>,
          ]}
        />

        <Footline>
          {es
            ? `La misma astilla se lee distinta desde cada lado: ${pct1(p(confirmed))} de lo que marca el modelo, ${pct1(satShare)} de lo que ha probado el Estado. Ninguna de las dos listas es un subconjunto de la otra.`
            : `The same sliver reads differently from each side: ${pct1(p(confirmed))} of what the model flags, ${pct1(satShare)} of what the state has proved. Neither list is a subset of the other.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F5 · the roster ───────────────────────────────────────────────────────

const F5_CHROME = {
  en: { eyebrow: 'FIGURE V · THE ROSTER', title: 'The largest ghost-pattern vendors at the twelve biggest buyers' },
  es: { eyebrow: 'FIGURA V · EL PADRÓN', title: 'Los mayores proveedores con patrón fantasma en los doce compradores principales' },
}

type RosterRow = { v: AriaPatternVendor; buyer: string }

/**
 * The register's review dispositions, in words.
 *
 * The raw enum is an English identifier (`needs_review`), so printing it
 * unchanged left a Spanish reader reading English snake_case. Cleared
 * dispositions are in the map for completeness; no figure here draws one.
 */
const REVIEW_LABEL: Record<string, { en: string; es: string }> = {
  pending: { en: 'never opened', es: 'nunca abierto' },
  needs_review: { en: 'awaiting review', es: 'pendiente de revisión' },
  reviewing: { en: 'under review', es: 'en revisión' },
  reviewed: { en: 'reviewed', es: 'revisado' },
  confirmed: { en: 'confirmed on review', es: 'confirmado en revisión' },
  confirmed_corrupt: { en: 'confirmed corrupt', es: 'corrupción confirmada' },
  skipped: { en: 'web pass moved on', es: 'la pasada web siguió de largo' },
  false_positive: { en: 'ruled out', es: 'descartado' },
  fp_excluded: { en: 'structurally excluded', es: 'excluido por estructura' },
  dismissed: { en: 'dismissed', es: 'desestimado' },
}

function Roster({
  body,
  efos,
  lang,
}: {
  body: AriaPatternGroupsResponse
  efos: EfosSet
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const all: RosterRow[] = body.rows.flatMap((r) => r.vendors.map((v) => ({ v, buyer: r.label })))
  const dropped = all.filter(({ v }) => isCleared(v)).length
  const standing = all
    .filter(({ v }) => !isCleared(v))
    .sort((a, b) => b.v.total_value_mxn - a.v.total_value_mxn)

  const rows = standing.slice(0, ROSTER_ROWS)
  // The lede belongs on his own story's roster even if the buyers shuffle.
  if (!rows.some(({ v }) => v.vendor_id === CARRANZA_ID)) {
    const lede = standing.find(({ v }) => v.vendor_id === CARRANZA_ID)
    if (lede) rows.splice(ROSTER_ROWS - 1, 1, lede)
  }

  const total = rows.reduce((s, { v }) => s + v.total_value_mxn, 0)
  const contracts = rows.reduce((s, { v }) => s + v.total_contracts, 0)
  const unopened = rows.filter(({ v }) => v.review_status === 'pending').length

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(total),
        label: es
          ? `en manos de ${rows.length} proveedores y ${formatNumber(contracts)} contratos; a ${unopened} de ellos nadie los ha abierto todavía`
          : `held by ${rows.length} vendors across ${formatNumber(contracts)} contracts; ${unopened} of them nobody has opened yet`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `La cola de ARIA no acepta un parámetro de orden, así que el ranking por monto sale del agregado por comprador: los ${formatNumber(all.length)} proveedores P2 mayores en los doce compradores donde más dinero P2 hay, ordenados por su contratación federal de por vida. ${dropped === 0 ? 'Ninguno de ellos lleva una disposición de descarte, así que no se cayó ninguna fila.' : `${formatNumber(dropped)} filas llevan una disposición de descarte de un revisor y no se dibujan.`} La disposición de revisión va impresa en cada fila, en palabras y no en el identificador del padrón: «nunca abierto» quiere decir que nadie lo ha mirado, no que esté limpio. Cifras en vivo de /aria/patterns/P2/institutions.`
          : `The ARIA queue takes no sort parameter, so the ranking by money comes from the buyer aggregate: the ${formatNumber(all.length)} largest P2 vendors at the twelve buyers where the P2 money sits, ordered by lifetime federal contracting. ${dropped === 0 ? 'None of them carries a cleared disposition, so no row was dropped.' : `${formatNumber(dropped)} rows carry a reviewer's cleared disposition and are not drawn.`} Each row prints its review disposition in words rather than in the register's identifier: "never opened" means nobody has looked at it, not that it is clean. Figures live from /aria/patterns/P2/institutions.`
      }
    >
      <div className="px-2 pb-2">
        <ol className="space-y-0">
          {rows.map(({ v, buyer }) => {
            const listed = efos.ids.has(v.vendor_id)
            return (
              <li key={v.vendor_id} className="border-b border-border py-2.5">
                <EntityIdentityChip
                  type="vendor"
                  id={v.vendor_id}
                  name={v.vendor_name}
                  size="sm"
                  riskScore={v.avg_risk_score}
                  ariaTier={(v.ips_tier as 1 | 2 | 3 | 4 | null) ?? undefined}
                  fullName
                />
                <FactLine
                  className="mt-1.5"
                  items={[
                    <span className="text-text-primary">{formatCompactMXN(v.total_value_mxn)}</span>,
                    <>
                      {formatNumber(v.total_contracts)} {contractsWord(v.total_contracts, lang)}
                    </>,
                    v.in_ground_truth ? <span>{es ? 'caso documentado' : 'documented case'}</span> : null,
                    listed ? (
                      <span style={{ color: AGREE }}>{es ? 'listado por el SAT' : 'listed by SAT'}</span>
                    ) : null,
                    <span>{REVIEW_LABEL[v.review_status]?.[lang] ?? v.review_status}</span>,
                  ]}
                />
                {/* The buyer's name gets its own wrapping line — the register
                    files some at full length and a no-break fact cell ran past
                    the card's overflow edge at 390 (SD-05 § 7). */}
                <p className="mt-1 font-mono text-text-muted" style={{ fontSize: 11.5, textWrap: 'pretty' }}>
                  {es ? 'Comprador principal: ' : 'Top buyer: '}
                  {buyer}
                </p>
              </li>
            )
          })}
        </ol>

        <Footline>
          {es
            ? `${formatNumber(rows.filter(({ v }) => efos.ids.has(v.vendor_id)).length)} de estos ${rows.length} llevan el listado definitivo del SAT; ${formatNumber(rows.filter(({ v }) => v.in_ground_truth).length)} ya son casos documentados en RUBLI.`
            : `${formatNumber(rows.filter(({ v }) => efos.ids.has(v.vendor_id)).length)} of these ${rows.length} carry SAT's definitive listing; ${formatNumber(rows.filter(({ v }) => v.in_ground_truth).length)} are already documented cases in RUBLI.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveGhostFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: GhostFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure enables only the pulls it needs, and the five share query
  // keys, so a pull is made once for the page rather than once per figure.
  const needsPop = kind === 'p2-population' || kind === 'p2-signals'
  const needsEfos = kind !== 'p2-lifecycle'
  // F2 quotes the cohort total in its footline. It shares F4 and F5's query
  // key, so asking for it here costs the page nothing.
  const needsCohort = kind === 'p2-match' || kind === 'p2-roster' || kind === 'p2-population'

  const lifeQ = useGhostLifecycles(kind === 'p2-lifecycle')
  const popQ = useGhostPopulation(needsPop)
  const efosQ = useP2Efos(needsEfos)
  const cohortQ = useP2Cohort(needsCohort)
  const runQ = useAriaRun(kind === 'p2-signals')

  const chrome =
    kind === 'p2-lifecycle'
      ? F1_CHROME[lang]
      : kind === 'p2-population'
        ? F2_CHROME[lang]
        : kind === 'p2-signals'
          ? F3_CHROME[lang]
          : kind === 'p2-match'
            ? F4_CHROME[lang]
            : F5_CHROME[lang]

  if (kind === 'p2-lifecycle') {
    if (lifeQ.isPending) return <Loading {...chrome} lang={lang} />
    if (lifeQ.isError || !lifeQ.data?.length || lifeQ.data.some((r) => !r.years.length))
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    return <Lifecycles rows={lifeQ.data} lang={lang} stage={stage} />
  }

  if (needsPop) {
    const waiting =
      popQ.isPending ||
      efosQ.isPending ||
      (kind === 'p2-signals' && runQ.isPending) ||
      (kind === 'p2-population' && cohortQ.isPending)
    if (waiting) return <Loading {...chrome} lang={lang} />
    if (popQ.isError || efosQ.isError || !popQ.data?.rows.length || !efosQ.data?.count)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    if (kind === 'p2-signals') {
      const run = runQ.data?.latest_run
      return (
        <Signals
          pop={popQ.data}
          efos={efosQ.data}
          runS={run ? runSeconds(run.started_at, run.completed_at) : null}
          lang={lang}
        />
      )
    }
    if (cohortQ.isError || !cohortQ.data?.cohort)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    return (
      <Population
        pop={popQ.data}
        efos={efosQ.data}
        cohortTotal={cohortQ.data.cohort.total_vendors}
        lang={lang}
      />
    )
  }

  if (cohortQ.isPending || efosQ.isPending) return <Loading {...chrome} lang={lang} />
  if (
    cohortQ.isError ||
    efosQ.isError ||
    !cohortQ.data?.cohort ||
    !cohortQ.data.rows.length ||
    !efosQ.data?.count
  )
    return <Unavailable {...chrome} lang={lang} to="/aria" />
  if (kind === 'p2-match') return <Match body={cohortQ.data} efos={efosQ.data} lang={lang} />
  return <Roster body={cohortQ.data} efos={efosQ.data} lang={lang} />
}
