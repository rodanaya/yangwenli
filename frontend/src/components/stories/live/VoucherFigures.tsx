/**
 * VoucherFigures — the four live figures of «El cártel de los vales» (SD-03).
 *
 * The story was written about three firms sharing a 240-billion-peso market by
 * direct award. The register says something else on every count. There are five
 * issuers, not three; the largest of them, Toka, holds no contract before 2013
 * and is not in the story at all; the five together hold 142.6B, not 240B; and
 * the door most of them use is not the direct award the story leads on but the
 * tender that draws a single bidder. So every number here is read from the
 * endpoint and printed as it comes, and the prose was rewritten to match.
 *
 * Three endpoints, four figures, one lazy chunk:
 *   F1 vales-stream    /vendors/:id/risk-timeline  (annual value, stacked)
 *   F2 vales-doors     /vendors/:id                (the two award routes)
 *   F3 vales-roster    /vendors/:id + /aria/queue/:id
 *   F4 vales-sexenios  /vendors/:id/risk-timeline  (shared with F1)
 *
 * Two rules inherited from SD-02's legibility work and kept here:
 * HTML owns every glyph (the SVG draws geometry only, so an 11px label is 11px
 * at 390 as well as at 1440), and no label, value or name is ever truncated —
 * a caption that does not fit its slot is dropped or given its own line, never
 * clipped (STORY_DAYS principle 7).
 *
 * Honesty (principle 6): a figure whose query fails says so in one mono line
 * and points at the surface that owns the data. It never falls back to a typed
 * number.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AriaQueueItem } from '@/api/types'
import { ChartCard, useMeasuredWidth } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { ADMINISTRATIONS, ADMIN_DISPLAY, ADMIN_DISPLAY_ACCENTED } from '@/lib/administrations'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  firmYears,
  mergeFirms,
  useVoucherAria,
  useVoucherStats,
  useVoucherTimelines,
  valueIn,
  VOUCHER_FIRMS,
  type FirmStats,
} from './useVoucherData'

export type VoucherFigureKind = 'vales-stream' | 'vales-doors' | 'vales-roster' | 'vales-sexenios'

const EMPHASIS = 'var(--color-risk-critical)'
const ACCENT = 'var(--color-accent)'
const MUTED = 'var(--color-text-muted)'

const STAMP = { en: 'LIVE · COMPRANET', es: 'EN VIVO · COMPRANET' } as const

const pct = (v: number) => `${v.toFixed(1)}%`
/** Advance width of one mono glyph as a fraction of its font size. */
const MONO_ADVANCE = 0.6

/**
 * The register froze on 28 September 2025, so the last year of every series is
 * a partial year. Nothing that compares years — who led, who grew — may include
 * it, and every figure that draws it says so.
 */
const isPartial = (year: number, years: number[]) => year === Math.max(...years)

// ── shared card states ────────────────────────────────────────────────────

function Shell({
  eyebrow,
  title,
  lang,
  children,
}: {
  eyebrow: string
  title: string
  lang: 'en' | 'es'
  children: React.ReactNode
}) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      {children}
    </ChartCard>
  )
}

function Loading({ eyebrow, title, lang }: { eyebrow: string; title: string; lang: 'en' | 'es' }) {
  return (
    <Shell eyebrow={eyebrow} title={title} lang={lang}>
      <div
        role="status"
        aria-label={lang === 'es' ? 'Cargando la figura en vivo' : 'Loading the live figure'}
        className="h-40 rounded-sm bg-surface-2 motion-safe:animate-pulse"
      />
    </Shell>
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
    <Shell eyebrow={eyebrow} title={title} lang={lang}>
      <p className="px-2 py-8 font-mono text-[12px] leading-relaxed text-text-muted">
        {lang === 'es' ? 'Figura en vivo no disponible — ver ' : 'Live figure unavailable — see '}
        <Link to={to} className="underline underline-offset-2 hover:text-text-secondary">
          {to}
        </Link>
      </p>
    </Shell>
  )
}

/**
 * The five-firm key, printed with each firm's lifetime total.
 *
 * Two of the swatches are the same ink at different opacity, which is why the
 * total is printed beside every name rather than left to the colour: the key
 * has to work for a reader who cannot separate the two greys.
 */
function FirmLegend({ firms, lang }: { firms: FirmStats[]; lang: 'en' | 'es' }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-3">
      {firms.map((f) => (
        <li key={f.firm.key} className="flex items-baseline gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block shrink-0"
            style={{
              width: 9,
              height: 9,
              background: f.firm.color,
              opacity: f.firm.opacity ?? 1,
              border: f.firm.dashed ? `1px dashed ${MUTED}` : undefined,
              transform: 'translateY(1px)',
            }}
          />
          <span className="text-text-secondary" style={{ fontSize: 12 }}>
            {f.firm.label}
          </span>
          <span className="font-mono tabular-nums text-text-muted" style={{ fontSize: 11 }}>
            {formatCompactMXN(f.value)}
          </span>
        </li>
      ))}
      <li className="sr-only">
        {lang === 'es'
          ? `Total de las cinco: ${formatCompactMXN(firms.reduce((s, f) => s + f.value, 0))}`
          : `Five-firm total: ${formatCompactMXN(firms.reduce((s, f) => s + f.value, 0))}`}
      </li>
    </ul>
  )
}

// ── F1 · the share-out ────────────────────────────────────────────────────

const F1_CHROME = {
  en: { eyebrow: 'FIGURE I · THE SHARE-OUT', title: 'Who took the money, year by year' },
  es: { eyebrow: 'FIGURA I · LA REPARTICIÓN', title: 'Quién se llevó el dinero, año con año' },
}

/** Stage → the last year drawn. Stage 3 also turns the share lens on. */
const F1_STAGE_LAST_YEAR = [2010, 2018, 9999, 9999]

const PLOT_H = 268
const PAD = { l: 46, r: 10, t: 26, b: 52 }
const AXIS_FS = 11
const BAND_FS = 10

type Lens = 'value' | 'share'

/**
 * The firm leading in every complete year, and the run of years the current
 * leader has held without interruption.
 *
 * Written from the series rather than asserted: the story used to claim the
 * same three names held the market throughout, and the point of this figure is
 * that the name at the top changes.
 */
function leadRun(firms: FirmStats[], years: number[]) {
  const complete = years.filter((y) => !isPartial(y, years))
  const leaders = complete.map((y) => {
    let best: FirmStats | null = null
    let bestV = 0
    for (const f of firms) {
      const v = valueIn(f, y)
      if (v > bestV) {
        bestV = v
        best = f
      }
    }
    return best
  })
  if (!leaders.length) return null
  const last = leaders[leaders.length - 1]
  if (!last) return null
  let i = leaders.length - 1
  while (i > 0 && leaders[i - 1]?.firm.key === last.firm.key) i -= 1
  return { firm: last, from: complete[i] }
}

function Stream({ firms, lang, stage = 3 }: { firms: FirmStats[]; lang: 'en' | 'es'; stage?: number }) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  const [userLens, setUserLens] = useState<Lens | null>(null)
  const clamped = Math.min(Math.max(stage, 0), 3)
  // Stage 3 turns the share lens on, but a reader who has touched the toggle
  // keeps their choice: the beat sets the default, it does not override a
  // deliberate click.
  const lens: Lens = userLens ?? (clamped >= 3 ? 'share' : 'value')

  const years = firmYears(firms)
  const lastYear = F1_STAGE_LAST_YEAR[clamped]
  const shownCount = years.filter((y) => y <= lastYear).length

  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const w = Math.max(width, 260)
  const innerW = Math.max(w - PAD.l - PAD.r, 40)
  const innerH = PLOT_H - PAD.t - PAD.b
  const colW = innerW / years.length
  const barW = Math.min(colW * 0.74, 26)

  const yearTotal = (y: number) => firms.reduce((s, f) => s + valueIn(f, y), 0)
  // The domain is fixed across every stage and both lenses' reveals, so the
  // beats read as the chart filling in rather than rescaling under the reader.
  const maxTotal = Math.max(...years.map(yearTotal), 1)
  const yMax = lens === 'share' ? 100 : Math.ceil(maxTotal / 2e9) * 2e9
  const yTicks = lens === 'share' ? [0, 50, 100] : [0, yMax / 2, yMax]
  const y = (v: number) => PAD.t + (1 - Math.min(v / yMax, 1)) * innerH
  const colX = (i: number) => PAD.l + colW * i + colW / 2

  const run = leadRun(firms, years)
  const partial = Math.max(...years)

  // Year captions thin out rather than collide — the same rule SeriesLine uses:
  // keep every k-th, where k is the smallest step at which the widest caption
  // still fits its column.
  const tickYears = (() => {
    const widest = 5 * AXIS_FS * MONO_ADVANCE + 6
    const step = Math.max(1, Math.ceil(widest / Math.max(colW, 1)))
    return years.filter((_, i) => i % step === 0 || i === years.length - 1)
  })()

  const fmtY = (v: number) => (lens === 'share' ? `${v}%` : formatCompactMXN(v))
  const total = firms.reduce((s, f) => s + f.value, 0)

  const stageNote = [
    es
      ? `Los primeros años: sólo Efectivale y Sodexo tienen registro antes de 2010.`
      : `The early years: only Efectivale and Sodexo have a record before 2010.`,
    es
      ? `Entran Edenred y Si Vale, y el liderazgo empieza a moverse entre ellos.`
      : `Edenred and Si Vale arrive, and the lead starts moving between them.`,
    run
      ? es
        ? `${run.firm.firm.label} encabeza desde ${run.from} y no ha soltado un solo año completo desde entonces.`
        : `${run.firm.firm.label} has led every complete year since ${run.from}.`
      : '',
    es
      ? 'En porcentaje del total de cada año, el reparto se lee sin que los años grandes aplasten a los chicos.'
      : 'Read as each year’s share, the split shows without the big years flattening the small ones.',
  ][clamped]

  const lensLabel = { value: es ? 'Monto' : 'Value', share: es ? 'Reparto' : 'Share' }

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(total),
        label: es
          ? `en contratos federales ganados por las cinco emisoras de vales, ${years[0]}–${partial}`
          : `in federal contracts won by the five voucher issuers, ${years[0]}–${partial}`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `${stageNote} Valor adjudicado por año a cada emisora, ${years[0]}–${partial}. Efectivale aparece bajo tres registros (${VOUCHER_FIRMS[2].ids.join(', ')}) que aquí se suman como una sola empresa. ${partial} es un año parcial: el registro federal se congeló el 28 de septiembre de ${partial}, y ${years.includes(2004) ? '' : '2004 no tiene registro para ninguna de las cinco. '}Cifras en vivo de /vendors/:id/risk-timeline.`
          : `${stageNote} Value awarded per year to each issuer, ${years[0]}–${partial}. Efectivale appears under three registrations (${VOUCHER_FIRMS[2].ids.join(', ')}), summed here as one firm. ${partial} is a partial year — the federal register froze on 28 September ${partial}${years.includes(2004) ? '' : ', and 2004 carries no record for any of the five'}. Figures live from /vendors/:id/risk-timeline.`
      }
    >
      <div className="px-2">
        <div className="flex items-center gap-2 pb-1">
          <span className="font-mono uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
            {es ? 'Lente' : 'Lens'}
          </span>
          {(['value', 'share'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setUserLens(l)}
              aria-pressed={lens === l}
              className="font-mono uppercase px-2 py-0.5 border transition-colors"
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                borderColor: lens === l ? ACCENT : 'var(--color-border)',
                color: lens === l ? 'var(--color-text-primary)' : MUTED,
                borderRadius: 2,
              }}
            >
              {lensLabel[l]}
            </button>
          ))}
        </div>

        <div ref={ref} className="relative w-full" style={{ height: PLOT_H }}>
          <svg
            width={w}
            height={PLOT_H}
            viewBox={`0 0 ${w} ${PLOT_H}`}
            className="absolute inset-0"
            aria-hidden="true"
          >
            {yTicks.map((tv) => (
              <line
                key={`grid-${tv}`}
                x1={PAD.l}
                x2={PAD.l + innerW}
                y1={y(tv)}
                y2={y(tv)}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            ))}

            {years.slice(0, shownCount).map((yr, i) => {
              const tot = yearTotal(yr)
              let acc = 0
              return (
                <g key={yr}>
                  {firms.map((f) => {
                    const v = valueIn(f, yr)
                    if (v <= 0) return null
                    const h = lens === 'share' ? (tot ? (100 * v) / tot : 0) : v
                    const y0 = y(acc + h)
                    const y1 = y(acc)
                    acc += h
                    return (
                      <rect
                        key={f.firm.key}
                        x={colX(i) - barW / 2}
                        y={y0}
                        width={barW}
                        height={Math.max(y1 - y0, 0.6)}
                        fill={f.firm.color}
                        opacity={f.firm.opacity ?? 1}
                        stroke={f.firm.dashed ? MUTED : undefined}
                        strokeDasharray={f.firm.dashed ? '2 2' : undefined}
                        strokeWidth={f.firm.dashed ? 0.75 : undefined}
                      >
                        <title>{`${yr} · ${f.firm.label} · ${formatCompactMXN(v)}${tot ? ` · ${pct((100 * v) / tot)}` : ''}`}</title>
                      </rect>
                    )
                  })}
                </g>
              )
            })}

            {/* Administration tenure rules, under the year captions. Drawn for
                the whole span at every beat, like the year captions and the
                y-scale: the frame stays still and the data fills into it. */}
            {ADMINISTRATIONS.map((a) => {
              const idx = years
                .map((yr, i) => ({ yr, i }))
                .filter((r) => r.yr >= a.yearStart && r.yr <= a.yearEnd)
              if (!idx.length) return null
              const x0 = PAD.l + colW * idx[0].i + colW * 0.13
              const x1 = PAD.l + colW * (idx[idx.length - 1].i + 1) - colW * 0.13
              return (
                <line
                  key={a.key}
                  x1={x0}
                  x2={x1}
                  y1={PAD.t + innerH + 26}
                  y2={PAD.t + innerH + 26}
                  stroke="var(--color-border)"
                  strokeWidth={2}
                />
              )
            })}
          </svg>

          {/* ── HTML glyph layer ── */}
          <div className="absolute inset-0 pointer-events-none">
            {yTicks.map((tv) => (
              <span
                key={`ytick-${tv}`}
                className="absolute font-mono tabular-nums text-text-muted"
                style={{
                  fontSize: AXIS_FS,
                  left: 0,
                  top: y(tv),
                  width: PAD.l - 6,
                  textAlign: 'right',
                  transform: 'translateY(-50%)',
                }}
              >
                {fmtY(tv)}
              </span>
            ))}

            {tickYears.map((yr) => (
              <span
                key={`x-${yr}`}
                className="absolute font-mono tabular-nums text-text-muted whitespace-nowrap"
                style={{
                  fontSize: AXIS_FS,
                  left: Math.min(Math.max(colX(years.indexOf(yr)), 16), w - 16),
                  top: PAD.t + innerH + 7,
                  transform: 'translateX(-50%)',
                }}
              >
                {String(yr).slice(2)}
              </span>
            ))}

            {/* A term's name prints only when its own band can hold it. Below
                that it is dropped, never shortened into an invented code and
                never clipped — the caption under the plot names all five with
                their years at every width. */}
            {ADMINISTRATIONS.map((a) => {
              const idx = years
                .map((yr, i) => ({ yr, i }))
                .filter((r) => r.yr >= a.yearStart && r.yr <= a.yearEnd)
              if (!idx.length) return null
              const x0 = PAD.l + colW * idx[0].i
              const x1 = PAD.l + colW * (idx[idx.length - 1].i + 1)
              const label = es ? ADMIN_DISPLAY_ACCENTED[a.key] : ADMIN_DISPLAY[a.key]
              if (label.length * BAND_FS * MONO_ADVANCE > x1 - x0 - 4) return null
              return (
                <span
                  key={`band-${a.key}`}
                  className="absolute font-mono uppercase text-text-muted whitespace-nowrap"
                  style={{
                    fontSize: BAND_FS,
                    letterSpacing: '0.06em',
                    left: (x0 + x1) / 2,
                    top: PAD.t + innerH + 31,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {label}
                </span>
              )
            })}

            {/* The lead callout arrives with stage 2, when the last years are
                on the plot to carry it. */}
            {clamped >= 2 && run && (() => {
              const text = es
                ? `${run.firm.firm.label} desde ${run.from}`
                : `${run.firm.firm.label} leads from ${run.from}`
              // Two guards, because one is not enough: the estimate places the
              // caption beside its year while it fits, and `maxWidth` bounds
              // the box whatever the real glyph widths turn out to be. With
              // only the estimate, "Toka Internacional leads from 2019" ran
              // 30px past the card edge at 390 — it does not fit on one line
              // there at any offset, so it is allowed to wrap instead.
              const estW = text.length * AXIS_FS * (MONO_ADVANCE + 0.08) + 8
              const left = Math.min(
                Math.max(colX(years.indexOf(run.from)) - colW / 2, PAD.l),
                Math.max(w - PAD.r - estW, PAD.l),
              )
              return (
                <span
                  className="absolute font-mono uppercase"
                  style={{
                    fontSize: AXIS_FS,
                    lineHeight: 1.25,
                    letterSpacing: '0.08em',
                    color: run.firm.firm.color,
                    left,
                    maxWidth: Math.max(w - left - 2, 60),
                    top: 2,
                    background: 'var(--color-background-card)',
                    padding: '0 4px',
                  }}
                >
                  {text}
                </span>
              )
            })()}
          </div>

          <span className="sr-only">
            {es
              ? `Valor adjudicado por año a cinco emisoras de vales, ${years[0]} a ${partial}. Total de las cinco: ${formatCompactMXN(total)}.${run ? ` ${run.firm.firm.label} encabeza cada año completo desde ${run.from}.` : ''}`
              : `Value awarded per year to five voucher issuers, ${years[0]} to ${partial}. Five-firm total: ${formatCompactMXN(total)}.${run ? ` ${run.firm.firm.label} leads every complete year from ${run.from}.` : ''}`}
          </span>
        </div>

        <FirmLegend firms={firms} lang={lang} />

        <p className="pt-2 font-mono text-text-muted" style={{ fontSize: 11, lineHeight: 1.6 }}>
          {ADMINISTRATIONS.filter((a) => years.some((yr) => yr >= a.yearStart && yr <= a.yearEnd))
            .map((a) => {
              const span = years.filter((yr) => yr >= a.yearStart && yr <= a.yearEnd)
              const lo = Math.min(...span)
              const hi = Math.max(...span)
              const name = es ? ADMIN_DISPLAY_ACCENTED[a.key] : ADMIN_DISPLAY[a.key]
              return `${name} ${lo}${hi === lo ? '' : `–${String(hi).slice(2)}`}`
            })
            .join(' · ')}
        </p>
      </div>
    </ChartCard>
  )
}

// ── F2 · the two doors ────────────────────────────────────────────────────

const F2_CHROME = {
  en: { eyebrow: 'FIGURE II · THE TWO DOORS', title: 'Which door each firm walks through' },
  es: { eyebrow: 'FIGURA II · LAS DOS PUERTAS', title: 'Por qué puerta entra cada empresa' },
}

function Doors({ firms, lang }: { firms: FirmStats[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const rows = [...firms].sort((a, b) => b.singleBidPct - a.singleBidPct)
  const top = rows[0]

  const contracts = firms.reduce((s, f) => s + f.contracts, 0)
  const closed = firms.reduce((s, f) => s + f.directAward + f.singleBid, 0)
  const closedPct = contracts ? (100 * closed) / contracts : 0
  // Registrations whose years predate CompraNet's recording of the award
  // procedure: their direct-award share is an absence of data, not an absence
  // of direct awards, and the annotation has to say which rows carry it.
  const preRecord = firms.filter((f) => f.firstYear < 2010).map((f) => f.firm.label)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct(top.singleBidPct),
        label: es
          ? `de los ${formatNumber(top.contracts)} contratos de ${top.firm.label} salieron de una licitación con un solo postor`
          : `of ${top.firm.label}’s ${formatNumber(top.contracts)} contracts came from a tender with one bidder`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Dos rutas, una fila por empresa, ordenadas por oferta única. Adjudicación directa: no hay licitación, el comprador escoge. Oferta única: sí hay licitación —convocatoria publicada, proceso formal— y se presenta una sola empresa. Entre las dos rutas suman ${pct(closedPct)} de los ${formatNumber(contracts)} contratos de las cinco. ${preRecord.length ? `Ojo con ${preRecord.join(' y ')}: parte de su registro es anterior a 2010, cuando CompraNet aún no anotaba el tipo de procedimiento, así que su adjudicación directa aparece subestimada y su oferta única sobrestimada. ` : ''}Cifras en vivo de /vendors/:id.`
          : `Two routes, one row per firm, ordered by single-bidder share. Direct award: no tender, the buyer picks. Single bidder: there is a tender — a published notice, a formal process — and one firm turns up. Between them the two routes account for ${pct(closedPct)} of the five firms’ ${formatNumber(contracts)} contracts. ${preRecord.length ? `Read ${preRecord.join(' and ')} with care: part of their record predates 2010, when CompraNet did not yet note the award procedure, so their direct-award share is understated and their single-bidder share overstated. ` : ''}Figures live from /vendors/:id.`
      }
    >
      <div className="px-2 pb-2">
        <div
          className="flex items-baseline justify-between font-mono uppercase text-text-muted pb-2"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          <span>{es ? 'Empresa' : 'Firm'}</span>
          <span>
            <span style={{ color: ACCENT }}>{es ? 'Directa' : 'Direct'}</span>
            {' · '}
            <span style={{ color: EMPHASIS }}>{es ? 'Oferta única' : 'Single bidder'}</span>
          </span>
        </div>

        {rows.map((r) => (
          <div
            key={r.firm.key}
            className="border-b border-border py-2 sm:grid sm:items-center"
            style={{ gridTemplateColumns: '160px 1fr 172px', columnGap: 10 }}
          >
            {/* Wraps rather than truncates — a firm name is a name. */}
            <span className="block text-text-primary" style={{ fontSize: 13 }}>
              {r.firm.label}
            </span>

            <div className="relative my-2 sm:my-0" style={{ height: 14 }}>
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: `${Math.min(r.directAwardPct, r.singleBidPct)}%`,
                  width: `${Math.abs(r.singleBidPct - r.directAwardPct)}%`,
                  top: 6,
                  height: 2,
                  background: MUTED,
                  opacity: 0.5,
                }}
              />
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: `${r.directAwardPct}%`,
                  top: 2,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  borderRadius: 999,
                  border: `1.5px solid ${ACCENT}`,
                  background: 'var(--color-background-card)',
                }}
              />
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: `${r.singleBidPct}%`,
                  top: 2,
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  borderRadius: 999,
                  background: EMPHASIS,
                }}
              />
            </div>

            <span
              className="font-mono tabular-nums text-text-muted block sm:text-right whitespace-nowrap"
              style={{ fontSize: 12 }}
            >
              <span style={{ color: ACCENT }}>{pct(r.directAwardPct)}</span>
              {' · '}
              <span style={{ color: EMPHASIS }}>{pct(r.singleBidPct)}</span>
            </span>

            {/* No `whitespace-nowrap` here: "1,944 contracts · 51.8B MXN" is
                wider than any track this column can be given, and in Spanish
                wider still. Held on one line it ran past the card's
                `overflow-hidden` edge and lost the last glyph of the currency.
                It wraps instead (STORY_DAYS principle 7). */}
            <span
              className="font-mono tabular-nums text-text-muted block sm:col-start-3 sm:text-right"
              style={{ fontSize: 11 }}
            >
              {formatNumber(r.contracts)} {es ? 'contratos' : 'contracts'} {'· '}
              {formatCompactMXN(r.value)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

// ── F3 · the register ─────────────────────────────────────────────────────

const F3_CHROME = {
  en: { eyebrow: 'FIGURE III · THE REGISTER', title: 'The five issuers, as ARIA files them' },
  es: { eyebrow: 'FIGURA III · EL REGISTRO', title: 'Las cinco emisoras, como las tiene ARIA' },
}

/** ARIA's pattern names, from /atlas/cluster-stats?lens=patterns. */
const PATTERN_LABEL: Record<string, { en: string; es: string }> = {
  P1: { en: 'Institutional monopoly', es: 'Monopolio institucional' },
  P2: { en: 'Ghost company', es: 'Empresa fantasma' },
  P3: { en: 'Intermediary', es: 'Intermediario' },
  P4: { en: 'Sham bidding', es: 'Licitación ficticia' },
  P5: { en: 'Systematic overpricing', es: 'Sobreprecio sistemático' },
  P6: { en: 'Institutional capture', es: 'Captura institucional' },
  P7: { en: 'Collusion network', es: 'Red de colusión' },
}

function Roster({
  firms,
  aria,
  resolved,
  lang,
}: {
  firms: FirmStats[]
  aria: Array<AriaQueueItem | null>
  /** How many ARIA rows actually came back — the anchor's denominator. */
  resolved: number
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const ariaFor = (id: number) => aria.find((a) => a?.vendor_id === id) ?? null

  const patterns = [...new Set(firms.map((f) => ariaFor(f.firm.chipId)?.primary_pattern).filter(Boolean))]
  const onePattern = patterns.length === 1 ? (patterns[0] as string) : null
  const tier1 = firms.filter((f) => ariaFor(f.firm.chipId)?.ips_tier === 1).length
  const inGt = firms.filter((f) => ariaFor(f.firm.chipId)?.in_ground_truth).length
  const denom = Math.max(resolved, 1)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: `${tier1}/${denom}`,
        label: es
          ? `en el nivel 1 de la cola de ARIA${inGt ? `, ${inGt} de ellas ya documentadas` : ''}`
          : `at Tier 1 of ARIA’s queue${inGt ? `, ${inGt} of them already documented cases` : ''}`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Las cinco emisoras ordenadas por valor adjudicado. La insignia trae el nivel de ARIA, GT cuando la empresa ya es un caso documentado y la palabra del estatus sólo cuando la revisión está confirmada.${onePattern ? ` Las cinco comparten el mismo patrón primario, ${onePattern}: ${PATTERN_LABEL[onePattern]?.es ?? onePattern} — un indicador de precio, no una acusación de colusión.` : ''} Los totales de Efectivale suman sus tres registros; la ficha abre el que sigue contratando (${VOUCHER_FIRMS[2].chipId}), y el de 2002–2010 (64) es el que ARIA tiene en nivel 1 y en ground truth. ${resolved < firms.length ? `La cola de ARIA respondió por ${resolved} de las ${firms.length}: el denominador del ancla es lo que sí llegó. ` : ''}Cifras en vivo de /vendors/:id y /aria/queue/:id.`
          : `The five issuers ordered by awarded value. The badge carries ARIA’s tier, GT where the firm is already a documented case, and the status word only where the review is confirmed.${onePattern ? ` All five share the same primary pattern, ${onePattern}: ${PATTERN_LABEL[onePattern]?.en ?? onePattern} — a pricing indicator, not a finding of collusion.` : ''} Efectivale’s totals sum its three registrations; the chip opens the one still trading (${VOUCHER_FIRMS[2].chipId}), and its 2002–2010 registration (64) is the one ARIA holds at Tier 1 and in ground truth. ${resolved < firms.length ? `ARIA’s queue answered for ${resolved} of the ${firms.length}; the anchor’s denominator is what came back. ` : ''}Figures live from /vendors/:id and /aria/queue/:id.`
      }
    >
      <ol className="px-2 pb-2">
        {firms.map((f, i) => {
          const a = ariaFor(f.firm.chipId)
          return (
            <li key={f.firm.key} className="border-b border-border py-2.5">
              <div className="flex items-start gap-2.5">
                <span
                  className="font-mono tabular-nums text-text-muted shrink-0"
                  style={{ fontSize: 12, lineHeight: '24px' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <EntityIdentityChip
                    type="vendor"
                    id={f.firm.chipId}
                    name={f.firm.label}
                    riskScore={f.riskScore}
                    ariaTier={a?.ips_tier}
                    fullName
                  />
                </div>
              </div>
              {/* Every value gets its own line below the chip at phone width and
                  a right-hand column above `sm` — none of them is ever put in a
                  fixed track it can be clipped out of. */}
              <div
                className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono tabular-nums text-text-muted"
                style={{ fontSize: 11.5, paddingLeft: 26 }}
              >
                <span className="text-text-primary">{formatCompactMXN(f.value)}</span>
                <span>
                  {formatNumber(f.contracts)} {es ? 'contratos' : 'contracts'}
                </span>
                <span>
                  {f.firstYear}
                  {'–'}
                  {f.lastYear}
                </span>
                {/* The tier is the chip's own badge — repeating it here printed
                    "T1 … T1" on every row. What is left is what the chip cannot
                    carry. */}
                {a && (a.in_ground_truth || a.review_status === 'confirmed') && (
                  <span className="uppercase" style={{ letterSpacing: '0.08em' }}>
                    {a.in_ground_truth ? 'GT' : ''}
                    {a.in_ground_truth && a.review_status === 'confirmed' ? ' · ' : ''}
                    {a.review_status === 'confirmed' ? (es ? 'CONFIRMADO' : 'CONFIRMED') : ''}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </ChartCard>
  )
}

// ── F4 · five administrations ─────────────────────────────────────────────

const F4_CHROME = {
  en: { eyebrow: 'FIGURE IV · FIVE ADMINISTRATIONS', title: 'The lead changes hands; the market does not open' },
  es: { eyebrow: 'FIGURA IV · CINCO GOBIERNOS', title: 'El liderazgo cambia de manos; el mercado no se abre' },
}

function Sexenios({ firms, lang }: { firms: FirmStats[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const years = firmYears(firms)
  const partial = Math.max(...years)

  const terms = useMemo(
    () =>
      ADMINISTRATIONS.map((a) => {
        const shares = firms.map((f) => ({
          firm: f,
          value: f.years
            .filter((y) => y.year >= a.yearStart && y.year <= a.yearEnd)
            .reduce((s, y) => s + y.value, 0),
        }))
        const total = shares.reduce((s, r) => s + r.value, 0)
        const span = years.filter((y) => y >= a.yearStart && y <= a.yearEnd)
        return {
          admin: a,
          total,
          span,
          shares: shares.map((r) => ({ ...r, pct: total ? (100 * r.value) / total : 0 })),
          leader: total ? shares.reduce((m, r) => (r.value > m.value ? r : m), shares[0]).firm : null,
        }
      }).filter((t) => t.total > 0),
    [firms, years],
  )

  const handoffs = terms.filter((t, i) => i > 0 && t.leader?.firm.key !== terms[i - 1].leader?.firm.key).length
  const sequence = terms.map((t) => t.leader?.firm.label).filter(Boolean)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: String(handoffs),
        label: es
          ? `cambios de líder en ${terms.length} administraciones — ninguno de ellos abrió el mercado`
          : `changes of leader across ${terms.length} administrations — none of which opened the market`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Reparto del total de las cinco dentro de cada sexenio, con los años del término tal como los define lib/administrations.ts (el año de transición se atribuye al gobierno saliente, porque once de sus doce meses le pertenecen). La secuencia de líderes es ${sequence.join(' → ')}. El último sexenio sólo tiene ${partial}, y ${partial} es parcial: el registro se congeló el 28 de septiembre. Cifras en vivo de /vendors/:id/risk-timeline.`
          : `Each term’s split of the five-firm total, with the term years as lib/administrations.ts defines them (a transition year is credited to the outgoing government, because eleven of its twelve months belong to it). The sequence of leaders runs ${sequence.join(' → ')}. The last term holds only ${partial}, and ${partial} is partial — the register froze on 28 September. Figures live from /vendors/:id/risk-timeline.`
      }
    >
      <div className="px-2 pb-2">
        {terms.map((t) => {
          const name = es ? ADMIN_DISPLAY_ACCENTED[t.admin.key] : ADMIN_DISPLAY[t.admin.key]
          const lo = Math.min(...t.span)
          const hi = Math.max(...t.span)
          return (
            <div key={t.admin.key} className="pb-4">
              <div className="flex flex-wrap items-baseline gap-x-2 pb-1">
                <span className="text-text-primary" style={{ fontSize: 13 }}>
                  {name}
                </span>
                <span className="font-mono tabular-nums text-text-muted" style={{ fontSize: 11 }}>
                  {lo}
                  {hi === lo ? '' : `–${hi}`}
                  {hi === partial ? (es ? ' · parcial' : ' · partial') : ''}
                </span>
                <span className="font-mono tabular-nums text-text-muted ml-auto" style={{ fontSize: 11 }}>
                  {formatCompactMXN(t.total)}
                </span>
              </div>

              <div className="flex w-full overflow-hidden" style={{ height: 26, borderRadius: 2 }}>
                {t.shares
                  .filter((s) => s.pct > 0)
                  .map((s) => (
                    <div
                      key={s.firm.firm.key}
                      title={`${name} · ${s.firm.firm.label} · ${formatCompactMXN(s.value)} · ${pct(s.pct)}`}
                      style={{
                        width: `${s.pct}%`,
                        background: s.firm.firm.color,
                        opacity: s.firm.firm.opacity ?? 1,
                        borderRight: s.firm.firm.dashed ? `1px dashed ${MUTED}` : undefined,
                      }}
                    />
                  ))}
              </div>

              {/* The shares are printed under the bar rather than inside the
                  segments. Five fills, two of them the same ink at reduced
                  opacity, cannot all carry legible text in both themes — and a
                  share that only appears above some width is a share the
                  reader cannot check. Here every one of them prints, the
                  leader first, and the line wraps instead of clipping. */}
              <p className="pt-1 font-mono text-text-muted" style={{ fontSize: 11, lineHeight: 1.6 }}>
                <span className="uppercase" style={{ letterSpacing: '0.08em' }}>
                  {es ? 'Líder ' : 'Leader '}
                </span>
                <span style={{ color: t.leader?.firm.color, opacity: t.leader?.firm.opacity ?? 1 }}>
                  {t.leader?.firm.label ?? '—'}
                </span>{' '}
                <span className="tabular-nums text-text-primary">
                  {pct(t.shares.find((s) => s.firm.firm.key === t.leader?.firm.key)?.pct ?? 0)}
                </span>
                {t.shares
                  .filter((s) => s.pct >= 0.05 && s.firm.firm.key !== t.leader?.firm.key)
                  .sort((a, b) => b.pct - a.pct)
                  .map((s) => (
                    <span key={s.firm.firm.key}>
                      {' · '}
                      {s.firm.firm.label} <span className="tabular-nums">{pct(s.pct)}</span>
                    </span>
                  ))}
              </p>
            </div>
          )
        })}

        <FirmLegend firms={firms} lang={lang} />

        <span className="sr-only">
          {es
            ? `Reparto por sexenio. ${terms.map((t) => `${ADMIN_DISPLAY_ACCENTED[t.admin.key]}: ${t.leader?.firm.label} con ${pct(t.shares.find((s) => s.firm.firm.key === t.leader?.firm.key)?.pct ?? 0)}`).join('. ')}.`
            : `Split by administration. ${terms.map((t) => `${ADMIN_DISPLAY[t.admin.key]}: ${t.leader?.firm.label} at ${pct(t.shares.find((s) => s.firm.firm.key === t.leader?.firm.key)?.pct ?? 0)}`).join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveVoucherFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: VoucherFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure enables only the pulls it needs; the four share the page, so
  // the page issues one request per vendor id between them rather than one per
  // figure. The roster is the only one that touches ARIA.
  // Every figure needs the firm list, so `/vendors/:id` is always on; only the
  // two that draw a series pay for the timelines, and only the roster for ARIA.
  const needsTimeline = kind === 'vales-stream' || kind === 'vales-sexenios'
  const stats = useVoucherStats(true)
  const timelines = useVoucherTimelines(needsTimeline)
  const aria = useVoucherAria(kind === 'vales-roster')

  const chrome =
    kind === 'vales-stream'
      ? F1_CHROME[lang]
      : kind === 'vales-doors'
        ? F2_CHROME[lang]
        : kind === 'vales-roster'
          ? F3_CHROME[lang]
          : F4_CHROME[lang]

  const pending = stats.isPending || (needsTimeline && timelines.isPending) || (kind === 'vales-roster' && aria.isPending)
  if (pending) return <Loading {...chrome} lang={lang} />
  if (stats.isError || !stats.data || (needsTimeline && (timelines.isError || !timelines.data)))
    return <Unavailable {...chrome} lang={lang} to="/vendors" />

  const firms = mergeFirms(stats.data, timelines.data ?? [])
  if (firms.length < 2) return <Unavailable {...chrome} lang={lang} to="/vendors" />

  if (kind === 'vales-stream') return <Stream firms={firms} lang={lang} stage={stage} />
  if (kind === 'vales-doors') return <Doors firms={firms} lang={lang} />
  if (kind === 'vales-roster')
    return <Roster firms={firms} aria={aria.data} resolved={aria.resolved} lang={lang} />

  return <Sexenios firms={firms} lang={lang} />
}
