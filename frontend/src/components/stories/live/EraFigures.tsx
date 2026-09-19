/**
 * EraFigures — the five live figures of «El Libro Mayor de Cinco Sexenios»
 * (SD-10).
 *
 * `useEraData` carries the full note on what the endpoints moved. The short
 * version: the story's thesis survives and four of its numbers did not. AMLO
 * reads 12.53%, not 12.62%. Sheinbaum reads 11.18%, not 12.9% — level with Peña
 * Nieto rather than between him and AMLO. Every magnitude in the sector ledger
 * changed. SEDENA's climb has two steps back in it, so it is not monotonic and
 * the chapter no longer says it is.
 *
 * Two things this file deliberately does not draw, because the register does
 * not carry them: a high-risk rate per category per term (F4 draws the mean
 * risk indicator and says so), and a direct-award figure in pesos (F1 prints
 * the count rate only).
 *
 * Rules inherited from SD-01..09: HTML owns every glyph — there is no <text> in
 * this file — no label or value is truncated, a number never breaks across a
 * line, and a figure whose query fails says so in one mono line rather than
 * falling back to a typed number.
 */
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatCompactMXN, formatDualCurrency, formatNumber } from '@/lib/utils'
import { ADMINISTRATIONS } from '@/lib/administrations'
import { SeriesLine, type SeriesPoint } from './SeriesLine'
import {
  EMPHASIS,
  FIELD,
  FactLine,
  Footline,
  Loading,
  REFERENCE,
  STAMP,
  Track,
  Unavailable,
  pct1,
  pct2,
  pp,
} from './figureChrome'
import {
  CATEGORY_ROWS,
  LEDGER_AFTER,
  LEDGER_BEFORE,
  HR_BAND_CEILING,
  HR_BAND_FLOOR,
  SEDENA_FROM,
  SEDENA_ID,
  readCategoryShift,
  readEraYears,
  readSectorLedger,
  readSedena,
  readSedenaDips,
  readTerms,
  sumLedger,
  termsAscend,
  useCategorySexenio,
  useSectorYears,
  useSedenaTimeline,
  useYearOverYear,
  type CategoryShift,
  type EraYear,
  type LedgerRow,
  type SedenaYear,
  type TermReading,
} from './useEraData'

export type EraFigureKind =
  | 'era-terms'
  | 'era-sectors'
  | 'era-sedena'
  | 'era-categories'
  | 'era-years'

/** F1's track runs to 20% so the calibration band occupies the middle of the lane. */
const TERM_SCALE = 20

const ind = (v: number) => v.toFixed(3)

// ── F1 · five columns ─────────────────────────────────────────────────────

const F1_CHROME = {
  en: {
    eyebrow: 'FIGURE I · FIVE COLUMNS',
    title: 'Every finished administration scored a larger share of high-risk contracts than the one before it',
  },
  es: {
    eyebrow: 'FIGURA I · CINCO COLUMNAS',
    title: 'Cada sexenio terminado calificó una proporción mayor de contratos de alto riesgo que el anterior',
  },
}

function TermBars({ terms, lang, stage = 3 }: { terms: TermReading[]; lang: 'en' | 'es'; stage?: number }) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  // One beat per column pair: the reader meets Fox and Calderón together —
  // neither means anything without the other — then each successor lands on top
  // of them. Below `lg` the hook pins the last beat, so all five are present
  // for a reader who never triggers a step.
  const shown = terms.slice(0, Math.min(stage + 2, terms.length))
  const finished = terms.filter((t) => !t.unfinished)
  const anchor = finished[finished.length - 1]
  const first = finished[0]
  const running = terms.find((t) => t.unfinished)
  const ascend = termsAscend(terms)
  // Sheinbaum's nine months and Peña Nieto's six years are one thousandth of a
  // point apart. Printing that as "below" or "above" would be a claim the
  // measurement cannot support, so the figure names whichever term it is level
  // with instead.
  const peer =
    running && finished.find((t) => Math.abs(t.rate - running.rate) < 0.05 && t.key !== running.key)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={
        anchor
          ? {
              value: pct2(anchor.rate),
              label: es
                ? `de los ${formatNumber(anchor.contracts)} contratos del sexenio de ${anchor.name} quedaron marcados como de alto riesgo — la lectura más alta de cualquier sexenio completo del registro`
                : `of the ${formatNumber(anchor.contracts)} contracts of ${anchor.name}'s term were flagged high-risk — the highest reading of any complete term in the register`,
              color: EMPHASIS,
            }
          : undefined
      }
      annotation={
        es
          ? `La tasa de cada sexenio es Σ contratos marcados ÷ Σ contratos de sus años, no el promedio de las tasas anuales: 2011 aporta 43,773 contratos y 2010 aporta 217,139, y promediarlos por año les daría el mismo peso. El indicador es el modelo v0.8.5 de RUBLI (AUC de prueba 0.785), que no se calibró para ninguna administración. La banda sombreada es la meta de calibración de RUBLI para la proporción señalada, de 2 a ${HR_BAND_CEILING}% (docs/RISK_METHODOLOGY_v6.md); ningún sexenio la rebasa. La lectura de Fox es un piso: la Estructura A de CompraNet cubre apenas el 0.1% de los RFC entre 2002 y 2010, así que el período está sub-reportado y su riesgo real es probablemente mayor. Los sexenios se recortan a los años que el registro contiene, no a los años calendario del mandato.`
          : `Each term's rate is Σ flagged contracts ÷ Σ contracts across its years, not the mean of the annual rates: 2011 contributes 43,773 contracts and 2010 contributes 217,139, and averaging by year would weigh them alike. The indicator is RUBLI's v0.8.5 model (test AUC 0.785), which was not tuned to any administration. The shaded band is RUBLI's calibration target for the flagged share, 2 to ${HR_BAND_CEILING}% (docs/RISK_METHODOLOGY_v6.md); no term crosses it. Fox's reading is a floor: COMPRANET's Structure A carries RFC coverage of 0.1% across 2002-2010, so the period is under-reported and its true risk is likely higher. Terms are cut to the years the register holds, not to the calendar years of the mandate.`
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
              {t.key === 'fox' ? (
                <span
                  className="whitespace-nowrap font-mono uppercase text-text-muted"
                  style={{ fontSize: 10, letterSpacing: '0.08em' }}
                >
                  {es ? 'estructura A · piso' : 'structure A · floor'}
                </span>
              ) : null}
              {t.unfinished ? (
                <span
                  className="whitespace-nowrap font-mono uppercase text-text-muted"
                  style={{ fontSize: 10, letterSpacing: '0.08em' }}
                >
                  {es ? 'parcial' : 'partial'}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <Track
                  fill={t.rate / TERM_SCALE}
                  color={t.unfinished ? FIELD : EMPHASIS}
                  band={[HR_BAND_FLOOR / TERM_SCALE, HR_BAND_CEILING / TERM_SCALE]}
                />
              </span>
              <span
                className="w-[58px] shrink-0 whitespace-nowrap text-right font-mono tabular-nums text-text-primary"
                style={{ fontSize: 11.5 }}
              >
                {pct2(t.rate)}
              </span>
            </div>

            <FactLine
              className="mt-2"
              items={[
                <>
                  {formatNumber(t.flagged)} {es ? 'de' : 'of'} {formatNumber(t.contracts)}{' '}
                  {es ? 'contratos' : 'contracts'}
                </>,
                <>{formatCompactMXN(t.value)}</>,
                <>
                  {pct1(t.directAwardRate)} {es ? 'adjudicación directa' : 'direct award'}
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
                ? `Los ${finished.length} sexenios completos suben en orden: ${finished.map((t) => `${t.name} ${pct2(t.rate)}`).join(' · ')}. Del primero al último hay ${pp(anchor.rate - first.rate)}. ${
                    running
                      ? `${running.name} lleva ${formatNumber(running.contracts)} contratos en ${pct2(running.rate)} — ${peer ? `la misma lectura que ${peer.name}, con una diferencia de milésimas de punto que no es una diferencia, y` : ''} por debajo de ${anchor.name}. Es la primera cuenta del libro que no sube sobre la anterior, pero son nueve meses de un año, no un sexenio: el feed federal se congeló el 28 de septiembre de 2025.`
                      : ''
                  }`
                : `The ${finished.length} complete terms rise in order: ${finished.map((t) => `${t.name} ${pct2(t.rate)}`).join(' · ')}. From the first to the last is ${pp(anchor.rate - first.rate)}. ${
                    running
                      ? `${running.name} stands at ${pct2(running.rate)} on ${formatNumber(running.contracts)} contracts — ${peer ? `the same reading as ${peer.name}, a gap of thousandths of a point that is not a gap, and` : ''} below ${anchor.name}. It is the first account in the book that does not read higher than the one before it, but it is nine months of one year rather than a term: the federal feed froze on 28 September 2025.`
                      : ''
                  }`
              : es
                ? `Los sexenios completos no suben en orden estricto: ${finished.map((t) => `${t.name} ${pct2(t.rate)}`).join(' · ')}.`
                : `The complete terms do not rise in strict order: ${finished.map((t) => `${t.name} ${pct2(t.rate)}`).join(' · ')}.`}
          </Footline>
        </div>
      ) : null}
    </ChartCard>
  )
}

// ── F2 · the reorganized ledger ───────────────────────────────────────────

const F2_CHROME = {
  en: {
    eyebrow: 'FIGURE II · THE REORGANIZED LEDGER',
    title: 'Five sectors were contracted more heavily than under Peña Nieto; seven were contracted less',
  },
  es: {
    eyebrow: 'FIGURA II · EL LIBRO REORGANIZADO',
    title: 'Cinco sectores se contrataron más que con Peña Nieto; siete se contrataron menos',
  },
}

function SectorLedger({ rows, lang }: { rows: LedgerRow[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const top = rows[0]
  const bottom = rows[rows.length - 1]
  const up = rows.filter((r) => r.delta > 0)
  const beforeTotal = sumLedger(rows, 'before')
  const afterTotal = sumLedger(rows, 'after')
  const max = Math.max(...rows.flatMap((r) => [r.before, r.after]))
  const before = ADMINISTRATIONS.find((a) => a.key === LEDGER_BEFORE)
  const after = ADMINISTRATIONS.find((a) => a.key === LEDGER_AFTER)
  const beforeSpan = before ? `${before.yearStart}–${before.yearEnd}` : ''
  const afterSpan = after ? `${after.yearStart}–${after.yearEnd}` : ''

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: `${top.delta > 0 ? '+' : '−'}${Math.abs(top.delta).toFixed(0)}%`,
        label: es
          ? `creció la contratación de ${top.name} entre los dos sexenios, de ${formatCompactMXN(top.before)} a ${formatCompactMXN(top.after)} — el mayor movimiento de los doce sectores, y el único que se triplica`
          : `is how much ${top.name} contracting grew between the two terms, from ${formatCompactMXN(top.before)} to ${formatCompactMXN(top.after)} — the largest move of the twelve sectors, and the only one that triples`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Σ del valor contratado por sector en ${beforeSpan} frente a ${afterSpan}, de /analysis/sector-year-breakdown, en la misma escala. El sector es el del contrato, no el de la dependencia que lo firma. Esta figura reemplaza una tabla escrita a mano en abril de 2026 cuyo mapeo sectorial no coincidía con el del registro: la dirección de los doce sectores se sostiene, ninguna de las magnitudes lo hace. Infraestructura cayó 45%, no 65. Hacienda subió 20%, no 70. Defensa subió 203%, no 186. Los totales de los dos sexenios están al pie.`
          : `Σ contracted value per sector across ${beforeSpan} against ${afterSpan}, from /analysis/sector-year-breakdown, on one scale. Sector is the contract's, not that of the agency signing it. This figure replaces a table written by hand in April 2026 whose sector mapping did not match the register's: the direction of all twelve sectors holds, none of the magnitudes do. Infrastructure fell 45%, not 65. Treasury rose 20%, not 70. Defence rose 203%, not 186. The two term totals are at the foot.`
      }
    >
      <div className="px-2 pb-2">
        <div
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-2 font-mono uppercase text-text-muted"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          <span className="whitespace-nowrap">
            {es ? 'Peña Nieto' : 'Peña Nieto'} {beforeSpan}
          </span>
          <span className="whitespace-nowrap">
            AMLO {afterSpan} · {es ? 'cambio' : 'change'}
          </span>
        </div>

        {rows.map((r) => (
          <div
            key={r.sectorId}
            className="border-b border-border py-2.5 sm:grid sm:items-center"
            // The readout column holds two currency strings and a delta. At
            // 150px they escaped the figure's overflow-hidden box by up to 30px
            // (clip census, 1440/1280/1024). The fix is structural per
            // STORY_DAYS § 7: a wider lane and wrapping BETWEEN whole items —
            // never a truncate, and never a number broken across lines.
            style={{ gridTemplateColumns: '150px 1fr 208px', columnGap: 10 }}
          >
            <span className="block">
              <EntityIdentityChip type="sector" id={r.sectorId} name={r.name} size="sm" fullName />
            </span>

            <div className="my-2 flex flex-col gap-1 sm:my-0" aria-hidden="true">
              <Track fill={r.before / max} color={FIELD} height={8} opacity={0.55} />
              <Track fill={r.after / max} color={r.color} height={8} />
            </div>

            <span
              className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono tabular-nums text-text-muted sm:justify-end"
              style={{ fontSize: 12 }}
            >
              <span className="whitespace-nowrap">{formatCompactMXN(r.before)} →</span>
              <span className="whitespace-nowrap text-text-primary">{formatCompactMXN(r.after)}</span>
              <span className="whitespace-nowrap" style={{ color: r.delta > 0 ? EMPHASIS : FIELD }}>
                {r.delta > 0 ? '+' : '−'}
                {Math.abs(r.delta).toFixed(0)}%
              </span>
            </span>
          </div>
        ))}

        <span className="sr-only">
          {es
            ? `Valor contratado por sector, ${beforeSpan} frente a ${afterSpan}: ${rows.map((r) => `${r.name} ${formatCompactMXN(r.before)} a ${formatCompactMXN(r.after)}`).join('; ')}.`
            : `Contracted value per sector, ${beforeSpan} against ${afterSpan}: ${rows.map((r) => `${r.name} ${formatCompactMXN(r.before)} to ${formatCompactMXN(r.after)}`).join('; ')}.`}
        </span>

        <Footline>
          {es
            ? `${up.length} de los ${rows.length} sectores se contrataron más que en ${beforeSpan}; ${rows.length - up.length} se contrataron menos. Los libros no se recortaron parejo ni crecieron parejo: ${top.name} se triplica y ${bottom.name} pierde ${Math.abs(bottom.delta).toFixed(0)}%. El total tampoco se sostiene — el sexenio de Peña Nieto contrató ${formatDualCurrency(beforeTotal)} y el de AMLO ${formatDualCurrency(afterTotal)}, ${pct1(Math.abs((afterTotal - beforeTotal) / beforeTotal) * 100)} menos. No es que el dinero se moviera de una línea a otra dejando el total quieto; hubo menos dinero, y lo que quedó se repartió distinto.`
            : `${up.length} of the ${rows.length} sectors were contracted more heavily than in ${beforeSpan}; ${rows.length - up.length} less. The books were neither cut evenly nor grown evenly: ${top.name} triples while ${bottom.name} loses ${Math.abs(bottom.delta).toFixed(0)}%. Nor does the total hold — Peña Nieto's term contracted ${formatDualCurrency(beforeTotal)} and AMLO's ${formatDualCurrency(afterTotal)}, ${pct1(Math.abs((afterTotal - beforeTotal) / beforeTotal) * 100)} less. It is not that the money moved from one line to another and left the total still; there was less money, and what remained was divided differently.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F3 · the army's climb ─────────────────────────────────────────────────

const F3_CHROME = {
  en: {
    eyebrow: "FIGURE III · THE ARMY'S SHARE",
    title: "SEDENA's share of federal contracting grew fivefold in nine years, twice falling back along the way",
  },
  es: {
    eyebrow: 'FIGURA III · LA PARTICIPACIÓN DEL EJÉRCITO',
    title: 'La participación de la SEDENA se quintuplicó en nueve años, con dos escalones hacia atrás',
  },
}

const SEDENA_BAR_H = 64

function SedenaShare({ rows, lang }: { rows: SedenaYear[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const full = rows.filter((r) => !r.partial)
  const peak = full.length ? full.reduce((a, b) => (b.share > a.share ? b : a)) : undefined
  const opening = rows[0]
  const partial = rows.find((r) => r.partial)
  const dips = readSedenaDips(rows)
  const handover = rows.find((r) => r.year === 2018)
  // The deepest step back, and the year it fell from — the annotation names the
  // pair rather than hard-coding a year that a later refresh could move.
  const fullDips = dips.filter((d) => !d.partial)
  const worst = fullDips.length
    ? fullDips.reduce((a, b) => {
        const drop = (d: SedenaYear) => (rows[rows.indexOf(d) - 1]?.share ?? d.share) - d.share
        return drop(b) > drop(a) ? b : a
      })
    : undefined
  const worstPrev = worst ? rows[rows.indexOf(worst) - 1] : undefined
  if (!peak || !opening) return <Unavailable {...c} lang={lang} />

  const tallest = Math.max(...rows.map((r) => r.value))
  const points: SeriesPoint[] = rows.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.share,
    callout:
      r.year === peak.year || r.year === opening.year || dips.some((d) => d.year === r.year && !d.partial)
        ? pct2(r.share)
        : undefined,
    calloutSub:
      r.year === peak.year ? (es ? 'PICO' : 'PEAK') : dips.some((d) => d.year === r.year) ? (es ? 'CAÍDA' : 'DIP') : undefined,
    emphasis: r.year >= 2019 && !r.partial,
  }))

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct2(peak.share),
        label: es
          ? `de todo el valor contratado por el gobierno federal en ${peak.year} pasó por la SEDENA — ${(peak.share / opening.share).toFixed(1)} veces su participación de ${opening.year}, sobre ${formatCompactMXN(peak.value)} en ${formatNumber(peak.contracts)} contratos`
          : `of everything the federal government contracted in ${peak.year} ran through SEDENA — ${(peak.share / opening.share).toFixed(1)} times its ${opening.year} share, across ${formatCompactMXN(peak.value)} in ${formatNumber(peak.contracts)} contracts`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Valor contratado anual de la SEDENA (/institutions/${SEDENA_ID}/risk-timeline) dividido entre el valor federal total del mismo año (/analysis/year-over-year). La línea es la participación; las barras de abajo son los pesos. El ascenso no es una línea recta, como decía esta historia: ${fullDips.length > 0 ? `la participación cayó en ${fullDips.map((d) => d.year).join(' y ')}` : 'hay años de retroceso'}${worst && worstPrev ? `, y ${worst.year} retrocedió en las dos lecturas a la vez — de ${formatCompactMXN(worstPrev.value)} y ${pct2(worstPrev.share)} en ${worstPrev.year} a ${formatCompactMXN(worst.value)} y ${pct2(worst.share)}` : ''}. Los extremos sí se sostienen. ${partial ? `${partial.year} está incompleto: el feed federal se congeló el 28 de septiembre de 2025 y su lectura no es comparable con un año entero.` : ''}`
          : `SEDENA's annual contracted value (/institutions/${SEDENA_ID}/risk-timeline) over the same year's federal total (/analysis/year-over-year). The line is the share; the bars beneath it are the pesos. The climb is not a straight line, as this story used to say: ${fullDips.length > 0 ? `the share fell in ${fullDips.map((d) => d.year).join(' and ')}` : 'there are years of retreat'}${worst && worstPrev ? `, and ${worst.year} retreated on both readings at once — from ${formatCompactMXN(worstPrev.value)} and ${pct2(worstPrev.share)} in ${worstPrev.year} to ${formatCompactMXN(worst.value)} and ${pct2(worst.share)}` : ''}. The end points do hold. ${partial ? `${partial.year} is incomplete: the federal feed froze on 28 September 2025 and its reading is not comparable with a whole year.` : ''}`
      }
    >
      <div className="px-4 pb-2 sm:px-5">
        <div className="pb-3">
          <EntityIdentityChip
            type="institution"
            id={SEDENA_ID}
            name="Secretaría de la Defensa Nacional"
            size="sm"
            fullName
          />
        </div>

        <SeriesLine
          points={points}
          yMin={0}
          yMax={6}
          yTicks={[0, 2, 4, 6]}
          formatTick={(v) => `${v}%`}
          ariaSummary={
            es
              ? `Participación de la SEDENA en el valor contratado federal, ${rows[0]?.year} a ${rows.at(-1)?.year}: ${rows.map((r) => `${r.year} ${pct2(r.share)}`).join('; ')}.`
              : `SEDENA's share of federal contracted value, ${rows[0]?.year} to ${rows.at(-1)?.year}: ${rows.map((r) => `${r.year} ${pct2(r.share)}`).join('; ')}.`
          }
        />

        <div
          className="mt-4 font-mono uppercase text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: '0.16em' }}
        >
          {es ? 'Valor contratado por año' : 'Contracted value by year'}
        </div>
        <div className="mt-1.5 flex items-end gap-[3px]" style={{ height: SEDENA_BAR_H }} aria-hidden="true">
          {rows.map((r) => (
            <span
              key={r.year}
              className="min-w-0 flex-1"
              style={{
                height: `${Math.max((r.value / tallest) * 100, 2)}%`,
                background: r.year === peak.year ? EMPHASIS : FIELD,
                opacity: r.partial ? 0.35 : r.year === peak.year ? 0.95 : 0.55,
                borderRadius: 1,
              }}
            />
          ))}
        </div>
        <div
          className="mt-1 flex items-baseline justify-between font-mono tabular-nums text-text-muted"
          style={{ fontSize: 10.5 }}
        >
          <span className="whitespace-nowrap">
            {rows[0].year} · {formatCompactMXN(rows[0].value)}
          </span>
          <span className="whitespace-nowrap">
            {rows.at(-1)!.year} · {formatCompactMXN(rows.at(-1)!.value)}
            {rows.at(-1)!.partial ? (es ? ' (parcial)' : ' (partial)') : ''}
          </span>
        </div>

        <span className="sr-only">
          {es
            ? `Valor contratado por la SEDENA por año: ${rows.map((r) => `${r.year} ${formatCompactMXN(r.value)}`).join('; ')}.`
            : `SEDENA contracted value by year: ${rows.map((r) => `${r.year} ${formatCompactMXN(r.value)}`).join('; ')}.`}
        </span>

        <FactLine
          className="mt-3"
          items={[
            handover ? (
              <>
                {handover.year}: {pct2(handover.share)} · {formatCompactMXN(handover.value)}
              </>
            ) : null,
            <>
              {es ? 'pico' : 'peak'} {peak.year}: {pct2(peak.share)} · {formatCompactMXN(peak.value)}
            </>,
            <>
              {(peak.share / opening.share).toFixed(1)}× {opening.year}
            </>,
            partial ? (
              <>
                {partial.year} ({es ? 'parcial' : 'partial'}): {pct2(partial.share)}
              </>
            ) : null,
          ]}
        />

        <Footline>
          {es
            ? `Entre ${opening.year} y ${peak.year} la participación de la SEDENA pasó de ${pct2(opening.share)} a ${pct2(peak.share)} del valor contratado federal. No subió todos los años: ${fullDips.map((d) => d.year).join(', ')} cerraron por debajo del año anterior${worst && worstPrev ? `, y el retroceso de ${worst.year} fue de ${pp(worst.share - worstPrev.share)}` : ''}. La historia decía que cada año del sexenio amplió la huella del ejército; ${fullDips.filter((d) => d.year >= 2019).map((d) => d.year).join(' y ') || 'no todos'} no lo hizo, y el valor contratado también cayó en 2019 frente a 2018. Lo que la serie sí sostiene es el punto de llegada — y que ${handover ? `el salto ocurrió en ${handover.year}, antes del cambio de gobierno` : 'el salto precede al cambio de gobierno'}.`
            : `Between ${opening.year} and ${peak.year} SEDENA's share went from ${pct2(opening.share)} to ${pct2(peak.share)} of federal contracted value. It did not rise every year: ${fullDips.map((d) => d.year).join(', ')} closed below the year before${worst && worstPrev ? `, and the ${worst.year} retreat was ${pp(worst.share - worstPrev.share)}` : ''}. The story used to say every year of the term expanded the army's footprint; ${fullDips.filter((d) => d.year >= 2019).map((d) => d.year).join(' and ') || 'not all of them'} did not, and contracted value fell in 2019 against 2018 as well. What the series does support is where it ends — and that ${handover ? `the step up happened in ${handover.year}, before the change of government` : 'the step up precedes the change of government'}.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F4 · the hot lines ────────────────────────────────────────────────────

const F4_CHROME = {
  en: {
    eyebrow: 'FIGURE IV · THE HOT LINES',
    title: "The risk indicator rose in nine of the ten largest categories of AMLO's term",
  },
  es: {
    eyebrow: 'FIGURA IV · LAS PARTIDAS CALIENTES',
    title: 'El indicador de riesgo subió en nueve de las diez partidas mayores del sexenio de AMLO',
  },
}

function CategoryDumbbell({ rows, lang }: { rows: CategoryShift[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const top = rows[0]
  const risen = rows.filter((r) => r.delta > 0)
  const fallen = rows.filter((r) => r.delta <= 0)

  const lo = Math.min(...rows.flatMap((r) => [r.before, r.after]))
  const hi = Math.max(...rows.flatMap((r) => [r.before, r.after]))
  const span = Math.max(hi - lo, 0.01)
  const at = (v: number) => `${(((v - lo) / span) * 100).toFixed(1)}%`

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: ind(top.after),
        label: es
          ? `es el indicador de riesgo medio de ${top.name} en el sexenio de AMLO, sobre ${formatCompactMXN(top.value)} en ${formatNumber(top.contracts)} contratos — el más alto de las diez partidas mayores, y ${top.delta >= 0 ? '+' : '−'}${Math.abs(top.delta).toFixed(3)} frente a su lectura con Peña Nieto`
          : `is ${top.name}'s mean risk indicator across AMLO's term, over ${formatCompactMXN(top.value)} in ${formatNumber(top.contracts)} contracts — the highest of the ten largest lines, and ${top.delta >= 0 ? '+' : '−'}${Math.abs(top.delta).toFixed(3)} against its reading under Peña Nieto`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Las ${CATEGORY_ROWS} partidas con mayor valor contratado en el sexenio de AMLO (/categories/sexenio), ordenadas por su indicador. El punto hueco es el indicador de riesgo medio con Peña Nieto; el lleno, con AMLO. Es un indicador de 0 a 1, no una tasa de contratos marcados: mide el parecido estructural promedio de los contratos de la partida con patrones conocidos, y no se compara con la banda de calibración de 2 a ${HR_BAND_CEILING}%, que habla de proporciones de contratos y no de esta escala. El registro no publica una tasa de alto riesgo por partida y por sexenio, así que las cifras de ese tipo que esta historia imprimía —alimentos al 32.4%, farmacéuticos al 22.4%— se retiraron en lugar de dejarlas leerse como si fueran de la misma fuente.`
          : `The ${CATEGORY_ROWS} categories with the largest contracted value in AMLO's term (/categories/sexenio), ordered by their indicator. The hollow dot is the mean risk indicator under Peña Nieto, the filled one under AMLO. It is an indicator from 0 to 1, not a rate of flagged contracts: it measures the average structural resemblance of the line's contracts to known patterns, and it is not set against the OECD's 2 to ${HR_BAND_CEILING}% band, which speaks of shares of contracts and not of this scale. The register publishes no high-risk rate per category per term, so the figures of that kind this story used to print — food at 32.4%, pharmaceuticals at 22.4% — were withdrawn rather than left to read as though they came from the same source.`
      }
    >
      <div className="px-2 pb-2">
        <div
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-2 font-mono uppercase text-text-muted"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          <span>{es ? 'Partida' : 'Category'}</span>
          <span className="whitespace-nowrap">
            {es ? 'indicador · Peña → AMLO' : 'indicator · Peña → AMLO'}
          </span>
        </div>

        {rows.map((r) => {
          const up = r.delta > 0
          const dot = up ? EMPHASIS : FIELD
          return (
            <div
              key={r.categoryId}
              className="border-b border-border py-2 sm:grid sm:items-center"
              style={{ gridTemplateColumns: '176px 1fr 168px', columnGap: 10 }}
            >
              <span className="block">
                <EntityIdentityChip type="category" id={r.categoryId} name={r.name} size="sm" fullName />
              </span>

              <div className="relative my-1.5 sm:my-0" style={{ height: 14 }} aria-hidden="true">
                <span
                  className="absolute"
                  style={{
                    left: at(Math.min(r.before, r.after)),
                    width: `calc(${at(Math.max(r.before, r.after))} - ${at(Math.min(r.before, r.after))})`,
                    top: 6,
                    height: 2,
                    background: dot,
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
                    background: dot,
                  }}
                />
              </div>

              <span
                className="block whitespace-nowrap font-mono tabular-nums text-text-muted sm:text-right"
                style={{ fontSize: 12 }}
              >
                {ind(r.before)} → <span className="text-text-primary">{ind(r.after)}</span>{' '}
                <span style={{ color: up ? EMPHASIS : FIELD }}>
                  {up ? '+' : '−'}
                  {Math.abs(r.delta).toFixed(3)}
                </span>
              </span>
            </div>
          )
        })}

        <span className="sr-only">
          {es
            ? `Indicador de riesgo medio por partida, Peña Nieto y AMLO: ${rows.map((r) => `${r.name} ${ind(r.before)} a ${ind(r.after)}`).join('; ')}.`
            : `Mean risk indicator per category, Peña Nieto and AMLO: ${rows.map((r) => `${r.name} ${ind(r.before)} to ${ind(r.after)}`).join('; ')}.`}
        </span>

        <Footline>
          {es
            ? `De las ${rows.length} partidas mayores del sexenio, ${risen.length} leen más alto que con Peña Nieto y ${fallen.length} más bajo. La excepción es la mayor de todas: ${fallen.length ? `${fallen[fallen.length - 1].name}, ${formatCompactMXN(fallen[fallen.length - 1].value)} contratados, baja de ${ind(fallen[fallen.length - 1].before)} a ${ind(fallen[fallen.length - 1].after)}` : 'ninguna'}. El indicador mide estructura, no culpa probada, y una partida con lectura alta no es una acusación contra ninguno de sus proveedores.`
            : `Of the ${rows.length} largest lines of the term, ${risen.length} read higher than under Peña Nieto and ${fallen.length} lower. The exception is the largest line of all: ${fallen.length ? `${fallen[fallen.length - 1].name}, ${formatCompactMXN(fallen[fallen.length - 1].value)} contracted, falls from ${ind(fallen[fallen.length - 1].before)} to ${ind(fallen[fallen.length - 1].after)}` : 'none'}. The indicator measures structure, not proven guilt, and a line that reads high is not an accusation against any of its suppliers.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F5 · the account still open ───────────────────────────────────────────

const F5_CHROME = {
  en: {
    eyebrow: 'FIGURE V · THE ACCOUNT STILL OPEN',
    title: 'Twenty-four years of the register, and the five terms that divide them',
  },
  es: {
    eyebrow: 'FIGURA V · LA CUENTA AÚN ABIERTA',
    title: 'Veinticuatro años de registro, y los cinco sexenios que los dividen',
  },
}

function YearLine({ years, terms, lang }: { years: EraYear[]; terms: TermReading[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const full = years.filter((r) => !r.partial)
  const peak = full.length ? full.reduce((a, b) => (b.rate > a.rate ? b : a)) : undefined
  const opening = years[0]
  const partial = years.find((r) => r.partial)
  const last = years[years.length - 1]
  // The span and the count are different numbers and the story needs both:
  // 2002-2025 is 24 calendar years, but the model can score 23 of them. 2004
  // holds seven contracts — a register artefact SD-07 and SD-08 hit too — and
  // is filtered out rather than drawn as a year.
  const spanYears = last.year - opening.year + 1
  const scoredYears = years.length
  const skipped = spanYears - scoredYears
  if (!peak || !opening) return <Unavailable {...c} lang={lang} />

  const points: SeriesPoint[] = years.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.rate,
    callout: r.year === peak.year || r.year === opening.year ? pct1(r.rate) : undefined,
    calloutSub: r.year === peak.year ? (es ? 'PICO' : 'PEAK') : undefined,
    emphasis: r.partial,
  }))

  const spanOf = (t: TermReading) => t.to - t.from + 1
  const totalSpan = terms.reduce((s, t) => s + spanOf(t), 0)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={
        partial
          ? {
              value: pct2(partial.rate),
              label: es
                ? `de los ${formatNumber(partial.contracts)} contratos que el registro tiene de ${partial.year} quedaron marcados — nueve meses de cuenta abierta, no un año, y mucho menos un sexenio`
                : `of the ${formatNumber(partial.contracts)} contracts the register holds for ${partial.year} were flagged — nine months of an open account, not a year, and nowhere near a term`,
              color: EMPHASIS,
            }
          : undefined
      }
      annotation={
        es
          ? `Proporción anual de contratos marcados como de alto riesgo por el modelo v0.8.5, ${opening.year}–${last.year}: ${spanYears} años de registro, no los 23 que decía esta historia, de los cuales el modelo puede calificar ${scoredYears}${skipped > 0 ? ` — 2004 guarda siete contratos y es un artefacto del registro, no un año` : ''}. La banda sombreada es la meta de calibración de 2 a ${HR_BAND_CEILING}%, una referencia externa que la serie nunca rebasa. La tira de abajo son los cinco sexenios con su tasa del libro mayor, al ancho de los años que el registro contiene de cada uno. Los años anteriores a 2010 se leen sobre la Estructura A de CompraNet, con 0.1% de cobertura de RFC, así que el arranque de la serie es un piso. ${partial ? `${partial.year} está incompleto — el feed federal se congeló el 28 de septiembre de 2025 — y se dibuja aparte.` : ''}`
          : `The annual share of contracts the v0.8.5 model flags high-risk, ${opening.year}–${last.year}: ${spanYears} years of register, not the 23 this story used to claim, of which the model can score ${scoredYears}${skipped > 0 ? ` — 2004 holds seven contracts and is a register artefact rather than a year` : ''}. The shaded band is RUBLI's 2 to ${HR_BAND_CEILING}% calibration target, a reference the series never crosses. The strip beneath is the five terms with their ledger rate, at the width of the years the register holds for each. Years before 2010 are read off COMPRANET's Structure A, with 0.1% RFC coverage, so the start of the series is a floor. ${partial ? `${partial.year} is incomplete — the federal feed froze on 28 September 2025 — and is drawn apart.` : ''}`
      }
    >
      <div className="px-4 pb-2 sm:px-5">
        <SeriesLine
          points={points}
          yMin={0}
          yMax={16}
          yTicks={[0, 4, 8, 12, 16]}
          formatTick={(v) => `${v}%`}
          bands={[
            {
              from: HR_BAND_FLOOR,
              to: HR_BAND_CEILING,
              label: es ? `Meta ${HR_BAND_FLOOR}–${HR_BAND_CEILING}%` : `Target ${HR_BAND_FLOOR}–${HR_BAND_CEILING}%`,
              color: REFERENCE,
            },
          ]}
          ariaSummary={
            es
              ? `Tasa anual de alto riesgo, ${opening.year} a ${years.at(-1)?.year}: ${years.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
              : `Annual high-risk rate, ${opening.year} to ${years.at(-1)?.year}: ${years.map((r) => `${r.year} ${pct2(r.rate)}`).join('; ')}.`
          }
        />

        {/* The five terms as a strip rather than as shaded regions behind the
            line: five captions inside the plot would be five more glyph boxes
            competing with 24 axis years and two callouts, and at 390 that is a
            clip waiting to happen. Out here each term owns its own box and its
            label wraps instead of colliding. */}
        <div className="mt-5 flex w-full gap-0.5" aria-hidden="true">
          {terms.map((t) => (
            <span
              key={t.key}
              className="block"
              style={{
                flexBasis: `${(spanOf(t) / totalSpan) * 100}%`,
                height: 10,
                borderRadius: 1,
                background: t.key === 'amlo' ? EMPHASIS : FIELD,
                opacity: t.unfinished ? 0.3 : t.key === 'amlo' ? 0.95 : 0.5,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex w-full gap-0.5">
          {terms.map((t) => (
            <span
              key={t.key}
              className="flex min-w-0 flex-col"
              style={{ flexBasis: `${(spanOf(t) / totalSpan) * 100}%` }}
            >
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: 11.5,
                  color: t.key === 'amlo' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                }}
              >
                {pct1(t.rate)}
              </span>
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 10, letterSpacing: '0.06em', textWrap: 'pretty' }}
              >
                {t.name}
              </span>
            </span>
          ))}
        </div>

        <FactLine
          className="mt-4"
          items={[
            <>
              {es ? 'pico' : 'peak'} {peak.year}: {pct2(peak.rate)}
            </>,
            <>
              {opening.year}: {pct2(opening.rate)}
            </>,
            <>
              {spanYears} {es ? 'años de registro' : 'years of register'}
            </>,
            partial ? (
              <>
                {partial.year} ({es ? 'parcial' : 'partial'}): {formatNumber(partial.contracts)}{' '}
                {es ? 'contratos' : 'contracts'}
              </>
            ) : null,
          ]}
        />

        <Footline>
          {es
            ? `La línea más alta del libro no es un sexenio, es ${peak.year}: ${pct2(peak.rate)} sobre ${formatNumber(peak.contracts)} contratos. Ninguno de los ${scoredYears} años calificados rebasa el techo del ${HR_BAND_CEILING}% de la banda de calibración, y ninguno baja de su piso del ${HR_BAND_FLOOR}%; lo que se mueve pasa entero dentro de la banda. ${partial ? `La cuenta de ${partial.year} sigue abierta con ${formatNumber(partial.contracts)} contratos frente a los ${formatNumber(Math.round(full.slice(-3).reduce((s, r) => s + r.contracts, 0) / 3))} de un año completo reciente: es demasiado pronto para leerle una trayectoria, y lo único que puede decirse de ella es dónde arranca.` : ''}`
            : `The highest line in the book is not a term, it is ${peak.year}: ${pct2(peak.rate)} across ${formatNumber(peak.contracts)} contracts. None of the ${scoredYears} scored years crosses the calibration band's ${HR_BAND_CEILING}% ceiling, and none falls below its ${HR_BAND_FLOOR}% floor; the whole movement happens inside the band. ${partial ? `The ${partial.year} account is still open on ${formatNumber(partial.contracts)} contracts against the ${formatNumber(Math.round(full.slice(-3).reduce((s, r) => s + r.contracts, 0) / 3))} of a recent full year: it is far too early to read a trajectory into it, and the only thing that can be said is where it starts.` : ''}`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveEraFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: EraFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // F1, F3 and F5 share one annual query, so three of the five figures cost a
  // single request between them; F2 and F4 add one call each.
  const yearQ = useYearOverYear(kind !== 'era-sectors' && kind !== 'era-categories')
  const sectorQ = useSectorYears(kind === 'era-sectors')
  const sedenaQ = useSedenaTimeline(kind === 'era-sedena')
  const catQ = useCategorySexenio(kind === 'era-categories')

  const chrome =
    kind === 'era-terms'
      ? F1_CHROME[lang]
      : kind === 'era-sectors'
        ? F2_CHROME[lang]
        : kind === 'era-sedena'
          ? F3_CHROME[lang]
          : kind === 'era-categories'
            ? F4_CHROME[lang]
            : F5_CHROME[lang]

  if (kind === 'era-sectors') {
    if (sectorQ.isPending) return <Loading {...chrome} lang={lang} />
    if (sectorQ.isError || !sectorQ.data?.length) return <Unavailable {...chrome} lang={lang} />
    const before = ADMINISTRATIONS.find((a) => a.key === LEDGER_BEFORE)
    const after = ADMINISTRATIONS.find((a) => a.key === LEDGER_AFTER)
    if (!before || !after) return <Unavailable {...chrome} lang={lang} />
    const rows = readSectorLedger(sectorQ.data, before, after, lang)
    if (!rows.length) return <Unavailable {...chrome} lang={lang} />
    return <SectorLedger rows={rows} lang={lang} />
  }

  if (kind === 'era-categories') {
    if (catQ.isPending) return <Loading {...chrome} lang={lang} />
    if (catQ.isError || !catQ.data?.length) return <Unavailable {...chrome} lang={lang} />
    const rows = readCategoryShift(catQ.data, lang)
    if (!rows.length) return <Unavailable {...chrome} lang={lang} />
    return <CategoryDumbbell rows={rows} lang={lang} />
  }

  if (yearQ.isPending) return <Loading {...chrome} lang={lang} />
  if (yearQ.isError || !yearQ.data?.length) return <Unavailable {...chrome} lang={lang} />
  const years = readEraYears(yearQ.data)
  if (!years.length) return <Unavailable {...chrome} lang={lang} />

  if (kind === 'era-sedena') {
    if (sedenaQ.isPending) return <Loading {...chrome} lang={lang} />
    if (sedenaQ.isError || !sedenaQ.data?.timeline?.length) return <Unavailable {...chrome} lang={lang} />
    const rows = readSedena(sedenaQ.data.timeline, years, SEDENA_FROM)
    if (!rows.length) return <Unavailable {...chrome} lang={lang} />
    return <SedenaShare rows={rows} lang={lang} />
  }

  const terms = readTerms(years, yearQ.data)
  if (!terms.length) return <Unavailable {...chrome} lang={lang} />

  if (kind === 'era-terms') return <TermBars terms={terms} lang={lang} stage={stage} />
  return <YearLine years={years} terms={terms} lang={lang} />
}
