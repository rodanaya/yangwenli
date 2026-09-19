/**
 * DirectAwardFigures — the five live figures of «La regla del 82 por ciento»
 * (SD-09).
 *
 * The story arrived with one number that inverted its own opening argument and
 * one that the register cannot hold. `useDirectAwardData` carries the full
 * note; the short version:
 *
 *  - Calderón's term share is **61.90%**, not 42.3%. The 42.3% averaged
 *    2007-2012, and COMPRANET scores 2007-2009 at 0.0% direct award because it
 *    does not code procedure type before 2010. The chapter's thesis — each
 *    government used less competition than the last — survives the correction,
 *    but the gap it rests on shrinks from 37.1 points to 17.5.
 *  - The run above 60% is **fifteen** years, 2010-2024, not fourteen.
 *  - "720 billion pesos of direct awards in 2023" is larger than the whole of
 *    2023: the register holds 412.95 billion for that year, every procedure
 *    type included. The 108-billion premium estimate built on it goes with it —
 *    the register publishes no direct-award value split to rebuild it from.
 *  - Per-term contract counts were right; per-term values were not (Calderón
 *    191.6B against a measured 1.08T, Peña Nieto 852.5B against 3.06T, AMLO
 *    1.06T against 2.76T).
 *
 * Rules inherited from SD-01..08: HTML owns every glyph — there is no <text> in
 * this file — no label or value is truncated, a number never breaks across a
 * line, and a figure whose query fails says so in one mono line rather than
 * falling back to a typed number.
 */
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SeriesLine, type SeriesPoint } from './SeriesLine'
import {
  CODED_FROM,
  LAST_FULL_YEAR,
  OECD_CEILING,
  RULE_FLOOR,
  SHIFT_FROM,
  SHIFT_TO,
  inWindow,
  readPeak,
  readRun,
  readSectorShift,
  readTerms,
  readYears,
  sumContracts,
  sumDirectAwards,
  termsAscend,
  useSectorYears,
  useYearOverYear,
  type DaYear,
  type SectorShift,
  type TermReading,
} from './useDirectAwardData'

export type DirectAwardFigureKind =
  | 'da-terms'
  | 'da-line'
  | 'da-emergency'
  | 'da-sectors'
  | 'da-count'

/** The argument — a contract awarded without a contest. */
const EMPHASIS = 'var(--color-risk-critical)'
/** The OECD reference line. External to RUBLI, and always captioned as such. */
const REFERENCE = 'var(--color-sector-tecnologia)'
/** Zinc — everything ordinary. Low is never green (Bible § 3.10). */
const FIELD = '#71717a'

const STAMP = { en: 'LIVE · COMPRANET', es: 'EN VIVO · COMPRANET' } as const

const pct2 = (v: number) => `${v.toFixed(2)}%`
const pct1 = (v: number) => `${v.toFixed(1)}%`
const pp = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} pp`

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

function Unavailable({ eyebrow, title, lang }: { eyebrow: string; title: string; lang: 'en' | 'es' }) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <p className="px-2 py-8 font-mono text-[12px] leading-relaxed text-text-muted">
        {lang === 'es' ? 'Figura en vivo no disponible — ver ' : 'Live figure unavailable — see '}
        <Link to="/methodology" className="underline underline-offset-2 hover:text-text-secondary">
          /methodology
        </Link>
      </p>
    </ChartCard>
  )
}

/**
 * A row of facts under a figure.
 *
 * Each cell is its own unbreakable unit with a break opportunity between cells,
 * so the line wraps between facts and never inside one (STORY_DAYS § 7).
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
      style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-muted)', textWrap: 'pretty' }}
    >
      {children}
    </p>
  )
}

/**
 * A horizontal track with a reference rule on it. Geometry is HTML boxes, not
 * SVG, so there is no viewBox to clip and no glyph inside it to shrink.
 */
function Track({
  fill,
  color,
  rule,
  height = 10,
}: {
  /** 0–1. */
  fill: number
  color: string
  /** 0–1 — a reference mark drawn across the track. */
  rule?: number
  height?: number
}) {
  return (
    <span className="relative block w-full" style={{ height, background: 'var(--color-border)', borderRadius: 1 }}>
      <span
        className="absolute inset-y-0 left-0 block"
        style={{ width: `${Math.max(fill * 100, 0.6)}%`, background: color, opacity: 0.9, borderRadius: 1 }}
      />
      {rule !== undefined ? (
        <span
          className="absolute inset-y-0 block"
          style={{ left: `${rule * 100}%`, width: 1.5, background: REFERENCE }}
        />
      ) : null}
    </span>
  )
}

// ── F1 · four terms, one direction ────────────────────────────────────────

const F1_CHROME = {
  en: {
    eyebrow: 'FIGURE I · FOUR TERMS, ONE DIRECTION',
    title: 'Every finished term awarded a larger share without a contest than the one before it',
  },
  es: {
    eyebrow: 'FIGURA I · CUATRO MANDATOS, UNA DIRECCIÓN',
    title: 'Cada mandato terminado adjudicó sin concurso una proporción mayor que el anterior',
  },
}

function TermBars({ terms, lang, stage = 3 }: { terms: TermReading[]; lang: 'en' | 'es'; stage?: number }) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  // One bar per beat: the reader meets Calderón, then each successor lands on
  // top of the one before. Below `lg` the hook pins the last beat, so all four
  // are present for a reader who never triggers a step.
  const shown = terms.slice(0, Math.min(stage + 1, terms.length))
  const finished = terms.filter((t) => !t.unfinished)
  const anchor = finished[finished.length - 1]
  const first = finished[0]
  const ascend = termsAscend(terms)
  const running = terms.find((t) => t.unfinished)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={
        anchor
          ? {
              value: pct2(anchor.share),
              label: es
                ? `de los ${formatNumber(anchor.contracts)} contratos del sexenio de ${anchor.name} se adjudicaron sin concurso — la proporción más alta de cualquier mandato completo que el registro puede calificar`
                : `of the ${formatNumber(anchor.contracts)} contracts of ${anchor.name}'s term were awarded without a contest — the highest share of any complete term the register can score`,
              color: EMPHASIS,
            }
          : undefined
      }
      annotation={
        es
          ? `La proporción de cada mandato es Σ adjudicaciones directas ÷ Σ contratos de sus años, no el promedio de las tasas anuales: 2011 aporta 43,773 contratos y 2010 aporta 217,139, y promediarlos por año les daría el mismo peso. El mandato de Calderón arranca aquí en ${CODED_FROM} y no en 2007 porque CompraNet no codifica el tipo de procedimiento antes de ${CODED_FROM} — la Estructura A marca 0.0% de adjudicación directa en todos sus años, y promediar sobre ellos es lo que producía el 42.3% que esta historia imprimía. Fox (2000-2006) no aparece: no tiene un solo año calificable. La línea vertical es el techo de ~${OECD_CEILING}% que la OCDE describe para un sistema funcional (OCDE, 2023, capítulo 3); es una referencia externa, no una medición de RUBLI.`
          : `Each term's share is Σ direct awards ÷ Σ contracts across its years, not the mean of the annual rates: 2011 contributes 43,773 contracts and 2010 contributes 217,139, and averaging by year would weigh them alike. Calderón's term starts here in ${CODED_FROM} rather than 2007 because COMPRANET does not code procedure type before ${CODED_FROM} — Structure A records 0.0% direct award across all of its years, and averaging over them is what produced the 42.3% this story used to print. Fox (2000-2006) is absent: it has no scoreable year at all. The vertical mark is the ~${OECD_CEILING}% ceiling the OECD describes for a functioning system (OECD, 2023, chapter 3); it is an external reference, not a RUBLI measurement.`
      }
    >
      <ol className="px-2 pb-2">
        {shown.map((t) => (
          <li key={t.key} className="border-b border-border py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-text-primary" style={{ fontSize: 13 }}>
                {t.name}
              </span>
              <span className="whitespace-nowrap font-mono tabular-nums text-text-muted" style={{ fontSize: 10.5 }}>
                {/* A term the register can score for one year only prints that
                    year — "2025–2025" reads as a typo, not as a range. */}
                {t.from === t.to ? t.from : `${t.from}–${t.to}`}
              </span>
              {t.clipped ? (
                <span className="whitespace-nowrap font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
                  {es ? `desde ${CODED_FROM}` : `from ${CODED_FROM}`}
                </span>
              ) : null}
              {t.unfinished ? (
                <span className="whitespace-nowrap font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
                  {es ? 'parcial' : 'partial'}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <Track fill={t.share / 100} color={t.unfinished ? FIELD : EMPHASIS} rule={OECD_CEILING / 100} />
              </span>
              <span
                className="w-[58px] shrink-0 whitespace-nowrap text-right font-mono tabular-nums text-text-primary"
                style={{ fontSize: 11.5 }}
              >
                {pct2(t.share)}
              </span>
            </div>

            <FactLine
              className="mt-2"
              items={[
                <>
                  {formatNumber(t.directAwards)} {es ? 'de' : 'of'} {formatNumber(t.contracts)}{' '}
                  {es ? 'contratos' : 'contracts'}
                </>,
                <>{formatCompactMXN(t.value)}</>,
                <>
                  {(t.share / OECD_CEILING).toFixed(1)}× {es ? 'la línea OCDE' : 'the OECD line'}
                </>,
              ]}
            />
          </li>
        ))}
      </ol>

      {stage >= 3 && anchor && first ? (
        <div className="px-2 pb-2">
          <Footline>
            {ascend
              ? es
                ? `Los ${finished.length} mandatos completos suben en orden: ${finished.map((t) => `${t.name} ${pct2(t.share)}`).join(' · ')}. La distancia entre el primero y el último es de ${pp(anchor.share - first.share)}, no los +37.1 pp que decía esta historia — esa cifra comparaba el ${pct1(anchor.share)} de ${anchor.name} contra un 42.3% de Calderón calculado sobre tres años que el registro califica en cero. ${running ? `${running.name} lleva ${formatNumber(running.contracts)} contratos en ${pct2(running.share)}, pero son nueve meses de un año, no un mandato: el feed federal se congeló el 28 de septiembre de 2025.` : ''}`
                : `The ${finished.length} complete terms rise in order: ${finished.map((t) => `${t.name} ${pct2(t.share)}`).join(' · ')}. The distance from the first to the last is ${pp(anchor.share - first.share)}, not the +37.1 pp this story used to print — that figure set ${anchor.name}'s ${pct1(anchor.share)} against a Calderón reading of 42.3% computed over three years the register scores at zero. ${running ? `${running.name} stands at ${pct2(running.share)} on ${formatNumber(running.contracts)} contracts, but that is nine months of one year rather than a term: the federal feed froze on 28 September 2025.` : ''}`
              : es
                ? `Los mandatos completos no suben en orden estricto: ${finished.map((t) => `${t.name} ${pct2(t.share)}`).join(' · ')}.`
                : `The complete terms do not rise in strict order: ${finished.map((t) => `${t.name} ${pct2(t.share)}`).join(' · ')}.`}
          </Footline>
        </div>
      ) : null}
    </ChartCard>
  )
}

// ── F2 · fifteen years above the line ─────────────────────────────────────

const F2_CHROME = {
  en: {
    eyebrow: 'FIGURE II · FIFTEEN YEARS ABOVE THE LINE',
    title: 'The rate has not touched 60% since the register began coding procedure type',
  },
  es: {
    eyebrow: 'FIGURA II · QUINCE AÑOS ARRIBA DE LA LÍNEA',
    title: 'La tasa no baja del 60% desde que el registro codifica el tipo de procedimiento',
  },
}

function YearLine({ years, lang }: { years: DaYear[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const window = years.filter(inWindow)
  const peak = readPeak(years)
  const run = readRun(years)
  const opening = window[0]
  const latestFull = window.filter((r) => !r.partial).at(-1)
  const partial = window.find((r) => r.partial)
  const falls = window.filter((r, i) => i > 0 && !r.partial && r.rate < window[i - 1].rate)

  // Two callouts, at opposite ends of the series: where it starts and where it
  // tops out. Labelling 2024 too would put a third caption one slot from the
  // peak's, which at 390 is 22px of room for 40px of glyphs — the latest year
  // reads from the fact line instead.
  const points: SeriesPoint[] = window.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.rate,
    callout: peak && (r.year === peak.year || r.year === opening?.year) ? pct1(r.rate) : undefined,
    calloutSub: peak && r.year === peak.year ? (es ? 'PICO' : 'PEAK') : undefined,
  }))

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={
        peak
          ? {
              value: pct2(peak.rate),
              label: es
                ? `de los ${formatNumber(peak.contracts)} contratos federales de ${peak.year} se adjudicaron sin concurso — la lectura más alta de los ${window.filter((r) => !r.partial).length} años que el registro puede calificar`
                : `of ${peak.year}'s ${formatNumber(peak.contracts)} federal contracts were awarded without a contest — the highest reading of the ${window.filter((r) => !r.partial).length} years the register can score`,
              color: EMPHASIS,
            }
          : undefined
      }
      annotation={
        es
          ? `Adjudicación directa como proporción de todos los contratos de cada año. La serie arranca en ${CODED_FROM} porque es el primer año en que CompraNet codifica el tipo de procedimiento: los años anteriores marcan 0.0% y no son comparables con nada posterior. La banda sombreada es el piso del ${RULE_FLOOR}% que la historia afirma; la línea punteada baja es el techo de ~${OECD_CEILING}% que describe la OCDE (OCDE, 2023), una referencia externa. ${partial ? `${partial.year} está incompleto y queda fuera de la racha: el feed federal se congeló el 28 de septiembre de 2025.` : ''}`
          : `Direct awards as a share of every contract that year. The series starts in ${CODED_FROM} because that is the first year COMPRANET codes procedure type: earlier years read 0.0% and are not comparable with anything after them. The shaded band is the ${RULE_FLOOR}% floor the story claims; the lower dashed line is the ~${OECD_CEILING}% ceiling the OECD describes (OECD, 2023), an external reference. ${partial ? `${partial.year} is incomplete and sits outside the run: the federal feed froze on 28 September 2025.` : ''}`
      }
    >
      <div className="px-4 pb-2 sm:px-5">
        <SeriesLine
          points={points}
          yMin={0}
          yMax={90}
          yTicks={[0, 30, 60, 90]}
          formatTick={(v) => `${v}%`}
          rules={[
            { value: OECD_CEILING, label: es ? `OCDE ~${OECD_CEILING}%` : `OECD ~${OECD_CEILING}%`, color: REFERENCE },
          ]}
          bands={
            run
              ? [
                  {
                    from: RULE_FLOOR,
                    to: 90,
                    label: es ? `${run.length} años ≥ ${RULE_FLOOR}%` : `${run.length} years ≥ ${RULE_FLOOR}%`,
                    color: EMPHASIS,
                  },
                ]
              : []
          }
          ariaSummary={
            es
              ? `Tasa anual de adjudicación directa, ${window[0]?.year} a ${window.at(-1)?.year}: ${window.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
              : `Annual direct-award rate, ${window[0]?.year} to ${window.at(-1)?.year}: ${window.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
          }
        />

        {latestFull && opening ? (
          <FactLine
            className="mt-3"
            items={[
              <>
                {opening.year}: {pct2(opening.rate)}
              </>,
              <>
                {es ? 'último año completo' : 'latest full year'} {latestFull.year}: {pct2(latestFull.rate)}
              </>,
              partial ? (
                <>
                  {partial.year} ({es ? 'parcial' : 'partial'}): {pct2(partial.rate)}
                </>
              ) : null,
              <>
                {(latestFull.rate / OECD_CEILING).toFixed(1)}× {es ? 'la línea OCDE' : 'the OECD line'}
              </>,
            ]}
          />
        ) : null}

        {run ? (
          <Footline>
            {es
              ? `${run.length} años seguidos, ${run.from}–${run.to}, en o por encima del ${RULE_FLOOR}%. El piso de esa racha es ${pct2(run.floor.rate)} en ${run.floor.year}. La historia decía catorce años; son ${run.length}. Tampoco es un ascenso continuo: ${falls.length} de esos años cerraron por debajo del anterior — 2011, 2014, 2018, 2022 y 2024 — y aun así ninguno se acercó al techo de la OCDE. Lo que no se mueve no es la pendiente, es el piso.`
              : `${run.length} straight years, ${run.from}–${run.to}, at or above ${RULE_FLOOR}%. The floor of that run is ${pct2(run.floor.rate)} in ${run.floor.year}. The story said fourteen years; it is ${run.length}. Nor is it a continuous climb: ${falls.length} of those years closed below the one before — 2011, 2014, 2018, 2022 and 2024 — and none of them came near the OECD ceiling anyway. What holds steady is not the slope. It is the floor.`}
          </Footline>
        ) : null}
      </div>
    </ChartCard>
  )
}

// ── F3 · after, not during ────────────────────────────────────────────────

const F3_CHROME = {
  en: {
    eyebrow: 'FIGURE III · AFTER, NOT DURING',
    title: 'The pandemic year moved the rate a third of a point; the three years after it moved four',
  },
  es: {
    eyebrow: 'FIGURA III · DESPUÉS, NO DURANTE',
    title: 'El año pandémico movió la tasa un tercio de punto; los tres siguientes la movieron cuatro',
  },
}

const ZOOM_FROM = 2019

function EmergencyZoom({ years, lang }: { years: DaYear[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const window = years.filter((r) => r.year >= ZOOM_FROM && r.year <= LAST_FULL_YEAR)
  const pre = window.find((r) => r.year === ZOOM_FROM)
  const covid = window.find((r) => r.year === 2020)
  const peak = window.length ? window.reduce((a, b) => (b.rate > a.rate ? b : a)) : undefined
  const last = window.at(-1)
  if (!pre || !covid || !peak || !last) return <Unavailable {...c} lang={lang} />

  const duringCovid = covid.rate - pre.rate
  const afterCovid = peak.rate - covid.rate
  const span = peak.rate - pre.rate

  // The scale is cut to the window, not to zero: the whole argument is a four
  // point move inside a six point range, and on a 0–90 axis it is a flat line.
  const lo = Math.floor(Math.min(...window.map((r) => r.rate)) - 1)
  const hi = Math.ceil(Math.max(...window.map((r) => r.rate)) + 1)

  const points: SeriesPoint[] = window.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.rate,
    callout: r.year === pre.year || r.year === covid.year || r.year === peak.year ? pct1(r.rate) : undefined,
    emphasis: r.year > covid.year,
  }))

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pp(span),
        label: es
          ? `es todo lo que la tasa subió entre ${pre.year} y ${peak.year}, y ${pp(afterCovid)} de esos ${Math.abs(span).toFixed(1)} llegaron después de que la emergencia sanitaria terminó`
          : `is the whole of the rate's rise from ${pre.year} to ${peak.year}, and ${pp(afterCovid)} of those ${Math.abs(span).toFixed(1)} arrived after the health emergency ended`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Los mismos datos de la Figura II, recortados a ${ZOOM_FROM}–${LAST_FULL_YEAR} y con el eje ajustado a la ventana: el movimiento completo son ${Math.abs(span).toFixed(1)} puntos, que en un eje de 0 a 90 es una línea recta. La marca vertical es el decreto de emergencia sanitaria del 30 de marzo de 2020, que habilitó la contratación de excepción. El techo de la OCDE (~${OECD_CEILING}%) queda muy por debajo de esta ventana y no se dibuja; ningún año de los seis se le acerca.`
          : `The same data as Figure II, cut to ${ZOOM_FROM}–${LAST_FULL_YEAR} with the axis fitted to the window: the entire move is ${Math.abs(span).toFixed(1)} points, which on a 0-to-90 axis is a straight line. The vertical mark is the health-emergency decree of 30 March 2020, which unlocked exception procurement. The OECD ceiling (~${OECD_CEILING}%) sits far below this window and is not drawn; none of the six years comes near it.`
      }
    >
      <div className="px-4 pb-2 sm:px-5">
        <SeriesLine
          points={points}
          yMin={lo}
          yMax={hi}
          yTicks={[lo, Math.round((lo + hi) / 2), hi]}
          formatTick={(v) => `${v}%`}
          markers={[{ afterIndex: 0, label: es ? '30 MAR 2020 · DECRETO' : '30 MAR 2020 · DECREE' }]}
          ariaSummary={
            es
              ? `Tasa de adjudicación directa ${window[0]?.year}–${window.at(-1)?.year}: ${window.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
              : `Direct-award rate ${window[0]?.year}–${window.at(-1)?.year}: ${window.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
          }
        />

        <FactLine
          className="mt-3"
          items={[
            <>
              {pre.year} → {covid.year}: {pp(duringCovid)}
            </>,
            <>
              {covid.year} → {peak.year}: {pp(afterCovid)}
            </>,
            <>
              {es ? 'máximo' : 'peak'} {peak.year}: {pct2(peak.rate)}
            </>,
            <>
              {last.year}: {pct2(last.rate)}
            </>,
          ]}
        />

        <Footline>
          {es
            ? `El año de la emergencia movió la tasa ${pp(duringCovid)} — de ${pct2(pre.rate)} a ${pct2(covid.rate)} — sobre ${formatNumber(covid.contracts)} contratos, el volumen más bajo de la ventana. Los tres años siguientes la movieron ${pp(afterCovid)} más. Si la pandemia hubiera sido la causa, la marca alta estaría en 2020; está en ${peak.year}, dos años después de que la emergencia se levantó. Es la lectura que SD-02 ya había establecido con los mismos datos mensuales.`
            : `The emergency year moved the rate ${pp(duringCovid)} — ${pct2(pre.rate)} to ${pct2(covid.rate)} — across ${formatNumber(covid.contracts)} contracts, the thinnest volume in the window. The three years that followed moved it ${pp(afterCovid)} further. Had the pandemic been the cause, the high-water mark would sit in 2020; it sits in ${peak.year}, two years after the emergency was lifted. It is the reading SD-02 established from the same register's monthly cuts.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F4 · where the tide rose ──────────────────────────────────────────────

const F4_CHROME = {
  en: {
    eyebrow: 'FIGURE IV · WHERE THE TIDE ROSE',
    title: 'Ten of twelve sectors award a larger share without a contest than they did in 2010',
  },
  es: {
    eyebrow: 'FIGURA IV · DÓNDE SUBIÓ LA MAREA',
    title: 'Diez de doce sectores adjudican sin concurso una proporción mayor que en 2010',
  },
}

function SectorDumbbell({ rows, lang }: { rows: SectorShift[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const top = rows[0]
  const bottom = rows[rows.length - 1]
  const risen = rows.filter((r) => r.delta > 0)

  const lo = Math.min(...rows.flatMap((r) => [r.before, r.after]))
  const hi = Math.max(...rows.flatMap((r) => [r.before, r.after]))
  const span = Math.max(hi - lo, 1)
  const at = (v: number) => `${(((v - lo) / span) * 100).toFixed(1)}%`

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pp(top.delta),
        label: es
          ? `es el ascenso de ${top.name} entre ${SHIFT_FROM} y ${SHIFT_TO}, de ${pct1(top.before)} a ${pct1(top.after)} — el mayor de los doce sectores, y el que compra medicamentos`
          : `is ${top.name}'s rise between ${SHIFT_FROM} and ${SHIFT_TO}, from ${pct1(top.before)} to ${pct1(top.after)} — the largest of the twelve sectors, and the one that buys medicine`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Tasa de adjudicación directa por sector en el primer año calificable (${SHIFT_FROM}, punto hueco) y en el año pico (${SHIFT_TO}, punto lleno), ordenada por el cambio. El color codifica la dirección, no el sector: rojo donde la tasa sube, gris donde baja. ${SHIFT_FROM} es un año atípico en su composición — 217,139 contratos frente a los 43,773 de 2011, con Energía y Agricultura aportando casi la mitad — porque es la costura entre las estructuras A y B de CompraNet; se usa igual porque es el primer año con tipo de procedimiento codificado. Cifras de /analysis/sector-year-breakdown, cuyos doce sectores suman exactamente los contratos que reporta la serie anual.`
          : `Direct-award rate per sector in the first scoreable year (${SHIFT_FROM}, hollow dot) and in the peak year (${SHIFT_TO}, filled dot), ordered by the change. Colour encodes direction, not sector: red where the rate rose, grey where it fell. ${SHIFT_FROM} is an unusual year in its composition — 217,139 contracts against 2011's 43,773, with Energy and Agriculture supplying nearly half — because it is the seam between COMPRANET Structures A and B; it is used anyway because it is the first year procedure type is coded. Figures from /analysis/sector-year-breakdown, whose twelve sectors sum to exactly the contract count the annual series reports.`
      }
    >
      <div className="px-2 pb-2">
        <div
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono uppercase text-text-muted pb-2"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          <span>{es ? 'Sector' : 'Sector'}</span>
          <span className="whitespace-nowrap">
            {SHIFT_FROM} → {SHIFT_TO} · {es ? 'cambio' : 'change'}
          </span>
        </div>

        {rows.map((r) => {
          const up = r.delta > 0
          const dotColor = up ? EMPHASIS : FIELD
          return (
            <div
              key={r.sectorId}
              className="border-b border-border py-2 sm:grid sm:items-center"
              style={{ gridTemplateColumns: '132px 1fr 172px', columnGap: 10 }}
            >
              <span className="block">
                <EntityIdentityChip type="sector" id={r.sectorId} name={r.name} size="sm" fullName />
              </span>
              <div className="relative my-1.5 sm:my-0" style={{ height: 14 }} aria-hidden="true">
                <span
                  className="absolute"
                  style={{
                    left: at(Math.min(r.before, r.after)),
                    width: `calc(${at(Math.max(r.before, r.after))} - ${at(Math.min(r.before, r.after))})`,
                    top: 6,
                    height: 2,
                    background: dotColor,
                    opacity: 0.45,
                  }}
                />
                <span
                  className="absolute"
                  style={{
                    left: at(r.before),
                    top: 2,
                    width: 10,
                    height: 10,
                    marginLeft: -5,
                    borderRadius: 999,
                    border: `1.5px solid ${FIELD}`,
                    background: 'var(--color-background-card)',
                  }}
                />
                <span
                  className="absolute"
                  style={{
                    left: at(r.after),
                    top: 2,
                    width: 10,
                    height: 10,
                    marginLeft: -5,
                    borderRadius: 999,
                    background: dotColor,
                  }}
                />
              </div>
              <span
                className="block whitespace-nowrap font-mono tabular-nums text-text-muted sm:text-right"
                style={{ fontSize: 12 }}
              >
                {pct1(r.before)} → <span className="text-text-primary">{pct1(r.after)}</span>{' '}
                <span style={{ color: up ? EMPHASIS : FIELD }}>{pp(r.delta)}</span>
              </span>
            </div>
          )
        })}

        <Footline>
          {es
            ? `${risen.length} de los ${rows.length} sectores adjudican hoy sin concurso una proporción mayor que en ${SHIFT_FROM}. El movimiento no es parejo: ${top.name} sube ${pp(top.delta)} y ${bottom.name} baja ${pp(bottom.delta)}. Los dos que retroceden lo hacen desde lugares distintos — Agricultura ya estaba en ${pct1(rows.find((x) => x.sectorId === 9)?.before ?? 0)} en ${SHIFT_FROM}, prácticamente sin techo por recorrer. Donde más subió la marea fue donde se compran medicamentos.`
            : `${risen.length} of the ${rows.length} sectors now award a larger share without a contest than in ${SHIFT_FROM}. The movement is uneven: ${top.name} rises ${pp(top.delta)} while ${bottom.name} falls ${pp(bottom.delta)}. The two that retreat do so from different places — Agriculture was already at ${pct1(rows.find((x) => x.sectorId === 9)?.before ?? 0)} in ${SHIFT_FROM}, with almost no ceiling left to reach. Where the tide rose furthest is where medicine is bought.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F5 · the count ────────────────────────────────────────────────────────

const F5_CHROME = {
  en: {
    eyebrow: 'FIGURE V · THE COUNT',
    title: 'What fifteen years above the line adds up to',
  },
  es: {
    eyebrow: 'FIGURA V · EL CONTEO',
    title: 'A cuánto suman quince años arriba de la línea',
  },
}

const COUNT_H = 132

function CountBars({ years, lang }: { years: DaYear[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const run = readRun(years)
  const from = run?.from ?? CODED_FROM
  const to = run?.to ?? LAST_FULL_YEAR
  const bars = years.filter((r) => r.year >= from && r.year <= to)
  const total = sumDirectAwards(years, from, to)
  const contracts = sumContracts(years, from, to)
  const peak = bars.reduce((a, b) => (b.directAwards > a.directAwards ? b : a), bars[0])
  const tallest = peak?.directAwards ?? 1
  const first = bars[0]
  const last = bars.at(-1)
  if (!peak || !first || !last) return <Unavailable {...c} lang={lang} />

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(total),
        label: es
          ? `contratos federales adjudicados sin concurso entre ${from} y ${to}, de ${formatNumber(contracts)} contratos en total — el ${pct1((total / contracts) * 100)} de todo lo que el registro puede calificar`
          : `federal contracts awarded without a contest between ${from} and ${to}, out of ${formatNumber(contracts)} contracts in all — ${pct1((total / contracts) * 100)} of everything the register can score`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Adjudicaciones directas por año, en número. Cada barra se reconstruye del mismo corte anual que dibuja la Figura II — contratos × la tasa del año — de modo que las barras y la línea no pueden discrepar. Es la cuenta, no el dinero: el registro publica el valor total de cada año, pero no lo separa por tipo de procedimiento, así que ninguna cifra en pesos de adjudicación directa puede derivarse de aquí. La historia imprimía «720 mil millones de pesos en adjudicaciones directas en 2023»; todo 2023, con cualquier tipo de procedimiento, suma ${formatCompactMXN(years.find((r) => r.year === SHIFT_TO)?.value ?? 0)}.`
          : `Direct awards by year, as a count. Each bar is reconstructed from the same annual cut that draws Figure II — contracts × that year's rate — so the bars and the line cannot disagree. It is the count, not the money: the register publishes each year's total value but does not split it by procedure type, so no peso figure for direct awards can be derived from it. The story used to print "720 billion pesos of direct awards in 2023"; the whole of 2023, every procedure type included, comes to ${formatCompactMXN(years.find((r) => r.year === SHIFT_TO)?.value ?? 0)}.`
      }
    >
      <div className="px-4 pb-2 sm:px-5">
        <div className="flex items-end gap-[3px]" style={{ height: COUNT_H }} aria-hidden="true">
          {bars.map((r) => (
            <span
              key={r.year}
              className="min-w-0 flex-1"
              style={{
                height: `${Math.max((r.directAwards / tallest) * 100, 1)}%`,
                background: r.year === peak.year ? EMPHASIS : FIELD,
                opacity: r.year === peak.year ? 0.95 : 0.55,
                borderRadius: 1,
              }}
            />
          ))}
        </div>

        <div
          className="mt-1 flex items-baseline justify-between font-mono tabular-nums text-text-muted"
          style={{ fontSize: 10.5 }}
        >
          <span className="whitespace-nowrap">{from}</span>
          <span className="whitespace-nowrap">{to}</span>
        </div>

        <span className="sr-only">
          {es
            ? `Adjudicaciones directas por año: ${bars.map((r) => `${r.year} ${formatNumber(r.directAwards)}`).join('; ')}.`
            : `Direct awards by year: ${bars.map((r) => `${r.year} ${formatNumber(r.directAwards)}`).join('; ')}.`}
        </span>

        <FactLine
          className="mt-3"
          items={[
            <>
              {es ? 'máximo' : 'peak'} {peak.year}: {formatNumber(peak.directAwards)}
            </>,
            <>
              {last.year}: {formatNumber(last.directAwards)}
            </>,
            <>
              {es ? 'suma' : 'total'} {from}–{to}: {formatNumber(total)}
            </>,
          ]}
        />

        <Footline>
          {es
            ? `El número más alto de adjudicaciones directas no cae en ${SHIFT_TO}, el año de la tasa más alta, sino en ${peak.year}. Entre ${from} y ${to} el gobierno federal firmó ${formatNumber(first.contracts - last.contracts)} contratos menos al año — de ${formatNumber(first.contracts)} a ${formatNumber(last.contracts)} — mientras la proporción adjudicada sin concurso subía de ${pct1(first.rate)} a ${pct1(last.rate)}. La marea no sube porque haya más adjudicaciones directas. Sube porque hay menos de todo lo demás.`
            : `The largest number of direct awards does not fall in ${SHIFT_TO}, the year of the highest rate, but in ${peak.year}. Between ${from} and ${to} the federal government signed ${formatNumber(first.contracts - last.contracts)} fewer contracts a year — ${formatNumber(first.contracts)} down to ${formatNumber(last.contracts)} — while the share awarded without a contest climbed from ${pct1(first.rate)} to ${pct1(last.rate)}. The tide does not rise because there are more direct awards. It rises because there is less of everything else.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveDirectAwardFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: DirectAwardFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Four of the five figures share one query key, so the page costs a single
  // request for them; F4's sector cut is the only second call.
  const yearQ = useYearOverYear(kind !== 'da-sectors')
  const sectorQ = useSectorYears(kind === 'da-sectors')

  const chrome =
    kind === 'da-terms'
      ? F1_CHROME[lang]
      : kind === 'da-line'
        ? F2_CHROME[lang]
        : kind === 'da-emergency'
          ? F3_CHROME[lang]
          : kind === 'da-sectors'
            ? F4_CHROME[lang]
            : F5_CHROME[lang]

  if (kind === 'da-sectors') {
    if (sectorQ.isPending) return <Loading {...chrome} lang={lang} />
    if (sectorQ.isError || !sectorQ.data?.length) return <Unavailable {...chrome} lang={lang} />
    const rows = readSectorShift(sectorQ.data, SHIFT_FROM, SHIFT_TO, lang)
    if (!rows.length) return <Unavailable {...chrome} lang={lang} />
    return <SectorDumbbell rows={rows} lang={lang} />
  }

  if (yearQ.isPending) return <Loading {...chrome} lang={lang} />
  if (yearQ.isError || !yearQ.data?.length) return <Unavailable {...chrome} lang={lang} />
  const years = readYears(yearQ.data)
  if (!years.filter(inWindow).length) return <Unavailable {...chrome} lang={lang} />

  if (kind === 'da-terms') {
    const terms = readTerms(years)
    if (!terms.length) return <Unavailable {...chrome} lang={lang} />
    return <TermBars terms={terms} lang={lang} stage={stage} />
  }
  if (kind === 'da-line') return <YearLine years={years} lang={lang} />
  if (kind === 'da-emergency') return <EmergencyZoom years={years} lang={lang} />
  return <CountBars years={years} lang={lang} />
}
