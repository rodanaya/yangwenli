/**
 * ThresholdFigures — the four live figures of «Los precios que terminan en
 * ceros» (SD-07).
 *
 * The story arrived claiming that 28,264 federal contracts were written for
 * **exactly** 210,000 pesos, and that this ran 76% above the 16,075 at
 * 200,000. Both numbers are real counts of the wrong things: 28,264 is a
 * 10,000-peso bucket and 16,075 is a 5,000-peso half-bucket, so the spike the
 * prose walked was two bucket widths in one sentence. At a common width the
 * two are 28,963 and 30,441 — a decline. The count of contracts written for
 * exactly 210,000 pesos is 1,613. `useThresholdData` carries the full note.
 *
 * What the register does say is sharper, and it is what these figures draw:
 * 22,263 contracts in the band sit on an exact multiple of 10,000 pesos, four
 * in five of them handed out without a contest, and the habit peaked in 2014
 * and has since halved.
 *
 * Rules inherited from SD-01..06: HTML owns every glyph — there is no <text>
 * in this file, the SVGs carry geometry only — no label or value is truncated,
 * a number never breaks across a line, and a figure whose query fails says so
 * in one mono line rather than falling back to a typed number.
 */
import { Link } from 'react-router-dom'
import type { AmountHistogramResponse } from '@/api/types'
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatNumber } from '@/lib/utils'
import {
  BAND_MAX,
  BAND_MIN,
  COARSE_BUCKET,
  THRESHOLDS,
  readGrid,
  readSpike,
  readYears,
  useCoarseHistogram,
  useFineHistogram,
  type Threshold,
} from './useThresholdData'
import { useState } from 'react'

export type ThresholdFigureKind =
  | 'threshold-histogram'
  | 'threshold-exact'
  | 'threshold-institutions'
  | 'threshold-years'

/** The round values, and the argument. */
const EMPHASIS = 'var(--color-risk-critical)'
/** The value the reader has selected. */
const SELECTED = 'var(--color-risk-high)'
/** Zinc — everything ordinary. Low is never green (Bible § 3.10). */
const FIELD = '#71717a'

const STAMP = { en: 'LIVE · COMPRANET', es: 'EN VIVO · COMPRANET' } as const

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`
const ratio1 = (v: number) => `${v.toFixed(1)}×`

/** "210 mil" reads as money in Spanish; "210K" reads as a label in English. */
function amountLabel(amount: number, lang: 'en' | 'es'): string {
  const thousands = amount / 1000
  return lang === 'es' ? `${formatNumber(thousands)} mil` : `${formatNumber(thousands)}K`
}

/** "1 contract" / "1 contrato" — the register has single-contract values. */
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
  to = '/methodology',
}: {
  eyebrow: string
  title: string
  lang: 'en' | 'es'
  to?: string
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
 * A row of facts under a figure.
 *
 * Each cell is its own unbreakable unit with a break opportunity between
 * cells, so the line wraps between facts and never inside one (STORY_DAYS § 7).
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
 * The band's amount axis, as five HTML labels over the plot's own width.
 *
 * Absolutely placed rather than one label per bar: the fine plot has two
 * hundred bars, which at 390 px is under two pixels apiece. The ends clamp
 * inward so neither runs past the card (STORY_DAYS § 7).
 */
/**
 * Three, not five. The Spanish labels are "200 mil", not "200K", and at 390 a
 * five-tick axis put "200 mil" and "250 mil" hard against each other with no
 * space between them — legible per the census, unreadable in fact. Three ticks
 * clear at every width in both languages, and the teeth are what the figure is
 * for anyway.
 */
const AXIS_TICKS = [200000, 300000, 400000]

function AmountAxis({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="relative mt-1" style={{ height: 14 }} aria-hidden="true">
      {AXIS_TICKS.map((amount, i) => {
        const left = ((amount - BAND_MIN) / (BAND_MAX - BAND_MIN)) * 100
        const edge = i === 0 ? '0' : i === AXIS_TICKS.length - 1 ? '-100%' : '-50%'
        return (
          <span
            key={amount}
            className="absolute whitespace-nowrap font-mono tabular-nums"
            style={{
              left: `${left}%`,
              transform: `translateX(${edge})`,
              fontSize: 10.5,
              color: 'var(--color-text-muted)',
            }}
          >
            {amountLabel(amount, lang)}
          </span>
        )
      })}
    </div>
  )
}

/**
 * A bar plot of the band. Geometry only — every glyph on this figure is HTML
 * outside the SVG, so nothing here can be clipped by a viewBox.
 */
const PLOT_H = 150

function BandBars({
  bars,
  height = PLOT_H,
}: {
  bars: { count: number; color: string; opacity?: number }[]
  height?: number
}) {
  const peak = Math.max(1, ...bars.map((b) => b.count))
  const w = bars.length
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height, display: 'block' }}
      aria-hidden="true"
    >
      {bars.map((b, i) => {
        const h = (b.count / peak) * height
        return (
          <rect
            key={i}
            x={i}
            y={Math.round((height - h) * 10) / 10}
            width={1}
            height={Math.round(h * 10) / 10}
            fill={b.color}
            opacity={b.opacity ?? 1}
          />
        )
      })}
    </svg>
  )
}

// ── F1 · the silhouette, and the comb underneath it ───────────────────────

const F1_CHROME = {
  en: {
    eyebrow: 'FIGURE I · THE SILHOUETTE',
    title: 'Zoom in on a smooth slope and it turns out to have teeth',
  },
  es: {
    eyebrow: 'FIGURA I · LA SILUETA',
    title: 'Acerca la lente a una pendiente lisa y resulta tener dientes',
  },
}

function Silhouette({
  coarse,
  fine,
  lang,
  stage = 3,
}: {
  coarse: AmountHistogramResponse
  fine: AmountHistogramResponse
  lang: 'en' | 'es'
  stage?: number
}) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  const clamped = Math.min(Math.max(stage, 0), 3)
  const [selected, setSelected] = useState<Threshold>(300000)

  const grid = readGrid(fine)
  const roundSet = new Set(grid.spikes.map((s) => s.amount))
  const chosen = grid.spikes.find((s) => s.amount === selected)
  const named = THRESHOLDS.map((t) => grid.spikes.find((s) => s.amount === t)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s),
  )

  // Beat 0 draws the coarse silhouette the story used to walk; every later
  // beat draws the same band at 1,000 pesos, where the round values separate
  // from the carpet they sit on.
  const bars =
    clamped === 0
      ? coarse.buckets.map((b) => ({ count: b.count, color: FIELD, opacity: 0.85 }))
      : fine.buckets.map((b) => {
          const round = roundSet.has(b.from)
          if (!round) return { count: b.count, color: FIELD, opacity: 0.55 }
          if (clamped === 1) {
            return b.from === selected
              ? { count: b.count, color: SELECTED, opacity: 1 }
              : { count: b.count, color: FIELD, opacity: 0.55 }
          }
          if (clamped === 2) {
            const isNamed = (THRESHOLDS as readonly number[]).includes(b.from)
            return isNamed
              ? { count: b.count, color: b.from === selected ? SELECTED : EMPHASIS, opacity: 1 }
              : { count: b.count, color: FIELD, opacity: 0.55 }
          }
          return {
            count: b.count,
            color: b.from === selected ? SELECTED : EMPHASIS,
            opacity: 0.95,
          }
        })

  return (
    <ChartCard
      source="/analysis/amount-histogram"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(grid.count),
        label: es
          ? `contratos de ${amountLabel(BAND_MIN, lang)} a ${amountLabel(BAND_MAX, lang)} de pesos escritos sobre un múltiplo exacto de diez mil — el ${pct1(grid.share)} de la banda, y ${pct1(grid.directAwardShare)} de ellos por adjudicación directa`
          : `contracts between ${amountLabel(BAND_MIN, lang)} and ${amountLabel(BAND_MAX, lang)} pesos written on an exact multiple of ten thousand — ${pct1(grid.share)} of the band, and ${pct1(grid.directAwardShare)} of them handed out by direct award`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `La misma banda, dos resoluciones. En el primer compás cada barra es un cubo de diez mil pesos y la curva baja limpia. Después cada barra es un cubo de mil pesos: la curva resulta ser una alfombra baja con un diente cada diez mil. Un diente no es un precio, es una decisión — el ${pct1(grid.directAwardShare)} de los contratos escritos sobre un número redondo se adjudicaron directamente, contra el ${pct1(grid.bandDirectAwardShare)} de la banda entera. La banda es semiabierta, así que ${amountLabel(BAND_MAX, lang)} queda fuera.`
          : `The same band at two resolutions. On the first beat each bar is a ten-thousand-peso bucket and the curve falls cleanly. After that each bar is a one-thousand-peso bucket, and the curve turns out to be a low carpet with a tooth every ten thousand. A tooth is not a price, it is a decision — ${pct1(grid.directAwardShare)} of the contracts written on a round number were awarded directly, against ${pct1(grid.bandDirectAwardShare)} of the whole band. The band is half-open, so ${amountLabel(BAND_MAX, lang)} falls outside it.`
      }
    >
      <div className="px-2 pb-2">
        {/* The selector. Real buttons, so it is reachable and operable from the
            keyboard without a roving-tabindex dance. */}
        <div
          role="group"
          aria-label={es ? 'Elegir un umbral' : 'Choose a threshold'}
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 10.5, letterSpacing: '0.16em' }}
          >
            {es ? 'Umbral' : 'Threshold'}
          </span>
          {THRESHOLDS.map((t) => {
            const on = t === selected
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelected(t)}
                aria-pressed={on}
                className="whitespace-nowrap rounded-sm border px-2 py-1 font-mono tabular-nums transition-colors"
                style={{
                  fontSize: 11.5,
                  borderColor: on ? SELECTED : 'var(--color-border)',
                  color: on ? SELECTED : 'var(--color-text-secondary)',
                  background: on ? 'color-mix(in srgb, var(--color-risk-high) 12%, transparent)' : 'transparent',
                }}
              >
                {amountLabel(t, lang)}
              </button>
            )
          })}
        </div>

        <BandBars bars={bars} />
        <AmountAxis lang={lang} />

        <FactLine
          className="mt-3"
          items={
            clamped === 0
              ? [
                  <span className="text-text-primary">
                    {es ? 'intervalos de ' : 'buckets of '}
                    {amountLabel(COARSE_BUCKET, lang)}
                  </span>,
                  <>
                    {coarse.buckets.length} {es ? 'barras' : 'bars'}
                  </>,
                  <>
                    {es ? 'máximo ' : 'tallest '}
                    {formatNumber(Math.max(...coarse.buckets.map((b) => b.count)))}
                  </>,
                ]
              : [
                  <span className="text-text-primary">
                    {es ? 'cubos de ' : 'buckets of '}
                    {amountLabel(1000, lang)}
                  </span>,
                  <>
                    {fine.buckets.length} {es ? 'barras' : 'bars'}
                  </>,
                  <>
                    {formatNumber(grid.spikes.length)} {es ? 'valores redondos' : 'round values'}
                  </>,
                ]
          }
        />

        {/* The selected threshold, always printed — the selector has to say
            something even before the reader has scrolled to its beat. */}
        {chosen ? (
          <FactLine
            className="mt-1"
            items={[
              <span style={{ color: SELECTED }}>{amountLabel(chosen.amount, lang)}</span>,
              <span className="text-text-primary">
                {formatNumber(chosen.count)} {contractsWord(chosen.count, lang)}
              </span>,
              <>
                {es ? 'vecinos ' : 'neighbours '}
                {formatNumber(chosen.below)} / {formatNumber(chosen.above)}
              </>,
              <>{ratio1(chosen.ratio)}</>,
              <>
                {pct1(chosen.directAwardShare)} {es ? 'directa' : 'direct'}
              </>,
            ]}
          />
        ) : null}

        {clamped >= 2 ? (
          <FactLine
            className="mt-1"
            items={named.map((s) => (
              <>
                <span style={{ color: s.amount === selected ? SELECTED : EMPHASIS }}>
                  {amountLabel(s.amount, lang)}
                </span>{' '}
                {formatNumber(s.count)} · {ratio1(s.ratio)}
              </>
            ))}
          />
        ) : null}

        {clamped >= 3 ? (
          <Footline>
            {es
              ? `Los tres valores que el relato nombra son picos reales — ${named
                  .map((s) => `${amountLabel(s.amount, lang)} a ${ratio1(s.ratio)}`)
                  .join(', ')} sobre el promedio de sus dos vecinos a mil pesos. Pero no son los más agudos: `
              : `The three values the story names are real spikes — ${named
                  .map((s) => `${amountLabel(s.amount, lang)} at ${ratio1(s.ratio)}`)
                  .join(', ')} above the mean of their two neighbours a thousand pesos away. They are not the sharpest, though: `}
            <span className="whitespace-nowrap" style={{ color: EMPHASIS }}>
              {amountLabel(grid.sharpest.amount, lang)}
            </span>
            {es
              ? ` está a ${ratio1(grid.sharpest.ratio)}. Cada uno de los ${grid.spikes.length} múltiplos de diez mil de la banda se levanta sobre la alfombra que lo rodea. El patrón no es una línea legal, es el hábito de escribir un número redondo — y de adjudicarlo a dedo.`
              : ` stands at ${ratio1(grid.sharpest.ratio)}. Every one of the band's ${grid.spikes.length} multiples of ten thousand rises out of the carpet around it. The pattern is not one legal line; it is the habit of writing a round number — and of handing it out without a contest.`}
          </Footline>
        ) : null}

        <span className="sr-only">
          {grid.spikes
            .map((s) =>
              es
                ? `${amountLabel(s.amount, lang)} de pesos: ${formatNumber(s.count)} contratos, ${ratio1(s.ratio)} sobre sus vecinos, ${pct1(s.directAwardShare)} adjudicación directa.`
                : `${amountLabel(s.amount, lang)} pesos: ${formatNumber(s.count)} contracts, ${ratio1(s.ratio)} above its neighbours, ${pct1(s.directAwardShare)} direct award.`,
            )
            .join(' ')}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F2 · exact, not near ──────────────────────────────────────────────────

const F2_CHROME = {
  en: {
    eyebrow: 'FIGURE II · EXACT, NOT NEAR',
    title: 'A thousand pesos to either side, and the crowd is gone',
  },
  es: {
    eyebrow: 'FIGURA II · EXACTO, NO CERCA',
    title: 'Mil pesos a cualquier lado, y la multitud desaparece',
  },
}

function ExactVsNeighbours({ coarse, lang }: { coarse: AmountHistogramResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const spikes = coarse.exact.map(readSpike)
  const widest = spikes.reduce((a, b) => (b.ratio > a.ratio ? b : a), spikes[0])
  const peak = Math.max(1, ...spikes.map((s) => s.count))

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: ratio1(widest.ratio),
        label: es
          ? `más contratos escritos en exactamente ${amountLabel(widest.amount, lang)} de pesos que en ${amountLabel(widest.amount - 1000, lang)} o ${amountLabel(widest.amount + 1000, lang)} — el salto más ancho de los tres`
          : `more contracts written for exactly ${amountLabel(widest.amount, lang)} pesos than for ${amountLabel(widest.amount - 1000, lang)} or ${amountLabel(widest.amount + 1000, lang)} — the widest of the three`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Un proveedor que entrega ${amountLabel(300000, lang)} de pesos en bienes no tiene más probabilidad de facturar exactamente esa cifra que mil pesos arriba o abajo. Los precios reales se reparten; un precio que aterriza sobre la línea es una decisión. Las nueve cifras son conteos de igualdad exacta sobre todo el registro, no cubos. La participación de adjudicación directa va impresa bajo cada valor exacto.`
          : `A vendor delivering ${amountLabel(300000, lang)} pesos of goods is no likelier to invoice that figure exactly than a thousand pesos either side of it. Real prices spread; a price that lands on the line is a decision. All nine figures are exact-equality counts over the whole register, not buckets. The direct-award share is printed under each exact value.`
      }
    >
      <div className="px-2 pb-2">
        {spikes.map((s) => (
          <div key={s.amount} className="border-b border-border py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="whitespace-nowrap font-mono tabular-nums text-text-primary"
                style={{ fontSize: 13 }}
              >
                {amountLabel(s.amount, lang)} {es ? 'pesos' : 'pesos'}
              </span>
              <span
                className="whitespace-nowrap font-mono tabular-nums"
                style={{ fontSize: 11.5, color: EMPHASIS }}
              >
                {ratio1(s.ratio)}
              </span>
            </div>

            <div className="mt-2 space-y-1">
              {[
                { amount: s.amount - 1000, count: s.below, on: false },
                { amount: s.amount, count: s.count, on: true },
                { amount: s.amount + 1000, count: s.above, on: false },
              ].map((row) => (
                <div key={row.amount} className="flex items-center gap-2">
                  <span
                    className="w-[76px] shrink-0 whitespace-nowrap text-right font-mono tabular-nums text-text-muted"
                    style={{ fontSize: 10.5 }}
                  >
                    {formatNumber(row.amount)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block"
                      style={{
                        height: 10,
                        width: `${Math.max((row.count / peak) * 100, 0.4)}%`,
                        background: row.on ? EMPHASIS : FIELD,
                        opacity: row.on ? 0.95 : 0.6,
                        borderRadius: 1,
                      }}
                    />
                  </span>
                  <span
                    className="w-[52px] shrink-0 whitespace-nowrap font-mono tabular-nums"
                    style={{
                      fontSize: 11.5,
                      color: row.on ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>

            <FactLine
              className="mt-2"
              items={[
                <>
                  {es ? 'promedio de vecinos ' : 'neighbour mean '}
                  {s.neighbourMean.toFixed(1)}
                </>,
                <>
                  {pct1(s.directAwardShare)} {es ? 'adjudicación directa' : 'direct award'}
                </>,
                <>
                  {formatNumber(s.directAwardCount)} {es ? 'de' : 'of'} {formatNumber(s.count)}
                </>,
              ]}
            />
          </div>
        ))}

        <Footline>
          {es
            ? `Los nueve conteos son del registro completo, no de la banda: un valor exacto no depende de dónde se corte la ventana. Las tres cifras de abajo pesan más que las de arriba en los tres casos — mil pesos por debajo de un número redondo sigue siendo un número redondo.`
            : `All nine counts are over the whole register, not the band: an exact value does not depend on where the window is cut. In all three cases the figure a thousand below outweighs the one a thousand above — a thousand pesos under a round number is still a round number.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F3 · who stands on the line ───────────────────────────────────────────

const F3_CHROME = {
  en: {
    eyebrow: 'FIGURE III · WHO STANDS ON THE LINE',
    title: 'The buyers that write round numbers, and how often they compete',
  },
  es: {
    eyebrow: 'FIGURA III · QUIÉN SE PARA EN LA LÍNEA',
    title: 'Las dependencias que escriben números redondos, y cuánto compiten',
  },
}

const ROSTER_ROWS = 15

function Institutions({ fine, lang }: { fine: AmountHistogramResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const grid = readGrid(fine)
  const rows = fine.top_institutions.slice(0, ROSTER_ROWS)
  const peak = Math.max(1, ...rows.map((r) => r.exact_count))
  const lead = rows[0]

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(lead.exact_count),
        label: es
          ? `contratos escritos sobre un múltiplo exacto de diez mil pesos por ${lead.institution} — la cifra más alta del registro, y ${pct1(lead.exact_direct_award_count / lead.exact_count)} de ellos sin competencia`
          : `contracts written on an exact multiple of ten thousand pesos by ${lead.institution} — the highest count in the register, and ${pct1(lead.exact_direct_award_count / lead.exact_count)} of them without a contest`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Las ${rows.length} dependencias con más contratos sobre un número redondo en la banda de ${amountLabel(BAND_MIN, lang)} a ${amountLabel(BAND_MAX, lang)}. «Sobre la banda» es qué proporción de todo lo que esa dependencia contrató en ese rango cayó sobre uno de los ${grid.spikes.length} valores redondos; el promedio del registro es ${pct1(grid.share)}. La barra mide el conteo, no la proporción — una dependencia chica puede estar muy arriba en proporción y no aparecer aquí. Conteos en vivo; los nombres resuelven a su expediente.`
          : `The ${rows.length} buyers with the most round-numbered contracts in the ${amountLabel(BAND_MIN, lang)} to ${amountLabel(BAND_MAX, lang)} band. "Of its band" is the share of everything that buyer contracted in that range which landed on one of the ${grid.spikes.length} round values; the register's own average is ${pct1(grid.share)}. The bar measures the count, not the share — a small buyer can sit far above average on share and not appear here at all. Counts live; each name resolves to its dossier.`
      }
    >
      <ol className="px-2 pb-2">
        {rows.map((r, i) => {
          const share = r.range_count > 0 ? r.exact_count / r.range_count : 0
          const da = r.exact_count > 0 ? r.exact_direct_award_count / r.exact_count : 0
          return (
            <li key={r.institution_id} className="border-b border-border py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className="whitespace-nowrap font-mono tabular-nums text-text-muted"
                  style={{ fontSize: 10.5 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <EntityIdentityChip
                  type="institution"
                  id={r.institution_id}
                  name={r.institution}
                  size="sm"
                  fullName
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span
                    className="block"
                    style={{
                      height: 10,
                      width: `${Math.max((r.exact_count / peak) * 100, 0.6)}%`,
                      background: EMPHASIS,
                      opacity: 0.9,
                      borderRadius: 1,
                    }}
                  />
                </span>
                <span
                  className="w-[52px] shrink-0 whitespace-nowrap text-right font-mono tabular-nums text-text-primary"
                  style={{ fontSize: 11.5 }}
                >
                  {formatNumber(r.exact_count)}
                </span>
              </div>

              <FactLine
                className="mt-2"
                items={[
                  <>
                    {pct1(share)} {es ? 'de su banda' : 'of its band'}
                  </>,
                  <>
                    {formatNumber(r.range_count)} {es ? 'en la banda' : 'in the band'}
                  </>,
                  <>
                    {pct1(da)} {es ? 'adjudicación directa' : 'direct award'}
                  </>,
                ]}
              />
            </li>
          )
        })}
      </ol>

      <div className="px-2 pb-2">
        <Footline>
          {es
            ? `Estas ${rows.length} dependencias reúnen ${formatNumber(
                rows.reduce((s, r) => s + r.exact_count, 0),
              )} de los ${formatNumber(grid.count)} contratos sobre un número redondo de la banda. Tres de las cinco primeras son de salud o seguridad social, que es el hallazgo editorial: la compra de insumos médicos casi nunca produce una cifra cerrada por sí sola.`
            : `These ${rows.length} buyers hold ${formatNumber(
                rows.reduce((s, r) => s + r.exact_count, 0),
              )} of the band's ${formatNumber(grid.count)} round-numbered contracts. Three of the top five are health or social-security bodies, which is the editorial finding: buying medical supplies almost never produces a closed figure on its own.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── F4 · the line in time ─────────────────────────────────────────────────

const F4_CHROME = {
  en: {
    eyebrow: 'FIGURE IV · THE LINE IN TIME',
    title: 'The habit grew for twelve years, and then it receded',
  },
  es: {
    eyebrow: 'FIGURA IV · LA LÍNEA EN EL TIEMPO',
    title: 'El hábito creció doce años, y después retrocedió',
  },
}

const LINE_W = 760
const LINE_H = 168
const LINE_PAD = 8

function Years({ fine, lang }: { fine: AmountHistogramResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const points = readYears(fine)
  // One fold of the twenty round values, not one per interpolation.
  const gridValues = readGrid(fine).spikes.length
  const peak = points.reduce((a, b) => (b.share > a.share ? b : a), points[0])
  const latest = points[points.length - 1]
  const first = points[0]
  const top = Math.max(...points.map((p) => p.share))
  const minYear = first.year
  const maxYear = latest.year

  const r1 = (n: number) => Math.round(n * 10) / 10
  const x = (year: number) =>
    r1(LINE_PAD + ((year - minYear) / Math.max(1, maxYear - minYear)) * (LINE_W - 2 * LINE_PAD))
  const y = (share: number) => r1(LINE_PAD + (1 - share / top) * (LINE_H - 2 * LINE_PAD))
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year)} ${y(p.share)}`).join(' ')

  const ticks = [first.year, peak.year, latest.year].filter(
    (v, i, a) => a.indexOf(v) === i,
  )

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct1(peak.share),
        label: es
          ? `de los contratos de la banda se escribieron sobre un número redondo en ${peak.year}, el punto más alto del registro — para ${latest.year} la cifra es ${pct1(latest.share)}`
          : `of the band's contracts were written on a round number in ${peak.year}, the high-water mark — by ${latest.year} the figure is ${pct1(latest.share)}`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Contratos escritos sobre uno de los ${gridValues} múltiplos de diez mil pesos, como proporción de todos los contratos de la banda ese año. Ambos números salen del mismo corte, así que la serie no se mueve porque el registro crezca. Se omiten los años con menos de 500 contratos en la banda — el registro trae dos contratos fechados en 2001 y dos en 2004, y una proporción sobre dos casos no dice nada. La adjudicación directa no está codificada antes de 2010 (Estructura A), así que esta figura cuenta contratos, no procedimientos.`
          : `Contracts written on one of the ${gridValues} multiples of ten thousand pesos, as a share of every contract in the band that year. Both numbers come from the same cut, so the series does not move just because the register grows. Years holding fewer than 500 in-band contracts are dropped — the register carries two contracts dated 2001 and two dated 2004, and a share over two cases says nothing. Procedure type is not coded before 2010 (Structure A), so this figure counts contracts, not procedures.`
      }
    >
      <div className="px-2 pb-2">
        <svg
          viewBox={`0 0 ${LINE_W} ${LINE_H}`}
          className="w-full"
          style={{ height: LINE_H, display: 'block' }}
          aria-hidden="true"
        >
          {/* The zero rule. Without it the series floats and a reader cannot
              tell whether the axis is zero-based — it is, and the distance
              from this line to the 2002 point is part of the reading. */}
          <line
            x1={0}
            x2={LINE_W}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <path d={path} fill="none" stroke={EMPHASIS} strokeWidth={2} strokeLinejoin="round" />
          {points.map((p) => (
            <circle
              key={p.year}
              cx={x(p.year)}
              cy={y(p.share)}
              r={p.year === peak.year || p.year === latest.year ? 4 : 2}
              fill={p.year === peak.year || p.year === latest.year ? EMPHASIS : FIELD}
            />
          ))}
        </svg>

        <div className="relative mt-1" style={{ height: 14 }} aria-hidden="true">
          {ticks.map((year, i) => {
            const left = ((year - minYear) / Math.max(1, maxYear - minYear)) * 100
            const edge = i === 0 ? '0' : i === ticks.length - 1 ? '-100%' : '-50%'
            return (
              <span
                key={year}
                className="absolute whitespace-nowrap font-mono tabular-nums"
                style={{
                  left: `${left}%`,
                  transform: `translateX(${edge})`,
                  fontSize: 10.5,
                  color: 'var(--color-text-muted)',
                }}
              >
                {year}
              </span>
            )
          })}
        </div>

        <FactLine
          className="mt-3"
          items={[
            <>
              {first.year} <span className="text-text-primary">{pct1(first.share)}</span>
            </>,
            <>
              {peak.year} <span style={{ color: EMPHASIS }}>{pct1(peak.share)}</span>
            </>,
            <>
              {latest.year} <span className="text-text-primary">{pct1(latest.share)}</span>
            </>,
          ]}
        />
        <FactLine
          className="mt-1"
          items={[
            <>
              {peak.year}: {formatNumber(peak.onGrid)} {es ? 'de' : 'of'}{' '}
              {formatNumber(peak.inBand)}
            </>,
            <>
              {latest.year}: {formatNumber(latest.onGrid)} {es ? 'de' : 'of'}{' '}
              {formatNumber(latest.inBand)}
            </>,
          ]}
        />

        <Footline>
          {es
            ? `De ${pct1(first.share)} en ${first.year} a ${pct1(peak.share)} en ${peak.year}, y de vuelta a ${pct1(latest.share)} en ${latest.year}: el hábito casi se dividió a la mitad desde su máximo. Eso no es una absolución — ${formatNumber(latest.onGrid)} contratos del último año todavía se escribieron sobre una cifra cerrada — pero sí contradice la idea de que el patrón se esté afianzando.`
            : `From ${pct1(first.share)} in ${first.year} to ${pct1(peak.share)} in ${peak.year}, and back to ${pct1(latest.share)} in ${latest.year}: the habit has roughly halved from its peak. That is not an acquittal — ${formatNumber(latest.onGrid)} contracts in the latest year were still written on a closed figure — but it does contradict the idea that the pattern is entrenching.`}
        </Footline>

        <span className="sr-only">
          {points
            .map((p) =>
              es
                ? `${p.year}: ${pct1(p.share)}, ${formatNumber(p.onGrid)} de ${formatNumber(p.inBand)}.`
                : `${p.year}: ${pct1(p.share)}, ${formatNumber(p.onGrid)} of ${formatNumber(p.inBand)}.`,
            )
            .join(' ')}
        </span>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveThresholdFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: ThresholdFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure enables only the pulls it needs, and the four share two query
  // keys, so the page makes two requests rather than four.
  const needsCoarse = kind === 'threshold-histogram' || kind === 'threshold-exact'
  const needsFine =
    kind === 'threshold-histogram' ||
    kind === 'threshold-institutions' ||
    kind === 'threshold-years'

  const coarseQ = useCoarseHistogram(needsCoarse)
  const fineQ = useFineHistogram(needsFine)

  const chrome =
    kind === 'threshold-histogram'
      ? F1_CHROME[lang]
      : kind === 'threshold-exact'
        ? F2_CHROME[lang]
        : kind === 'threshold-institutions'
          ? F3_CHROME[lang]
          : F4_CHROME[lang]

  if ((needsCoarse && coarseQ.isPending) || (needsFine && fineQ.isPending))
    return <Loading {...chrome} lang={lang} />

  if (kind === 'threshold-exact') {
    if (coarseQ.isError || !coarseQ.data?.exact.length)
      return <Unavailable {...chrome} lang={lang} />
    return <ExactVsNeighbours coarse={coarseQ.data} lang={lang} />
  }

  if (kind === 'threshold-histogram') {
    if (
      coarseQ.isError ||
      fineQ.isError ||
      !coarseQ.data?.buckets.length ||
      !fineQ.data?.buckets.length ||
      !fineQ.data.exact.length
    )
      return <Unavailable {...chrome} lang={lang} />
    return <Silhouette coarse={coarseQ.data} fine={fineQ.data} lang={lang} stage={stage} />
  }

  if (fineQ.isError || !fineQ.data?.buckets.length || !fineQ.data.exact.length)
    return <Unavailable {...chrome} lang={lang} />

  if (kind === 'threshold-institutions') {
    if (!fineQ.data.top_institutions.length) return <Unavailable {...chrome} lang={lang} />
    return <Institutions fine={fineQ.data} lang={lang} />
  }

  if (!readYears(fineQ.data).length) return <Unavailable {...chrome} lang={lang} />
  return <Years fine={fineQ.data} lang={lang} />
}
