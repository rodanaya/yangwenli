/**
 * EmergencyFigures — the five live figures of «El año de la emergencia» (SD-02).
 *
 * The story was written against numbers that the register does not support: a
 * 2020 direct-award rate of 87% (it is 78.1%), 215,000 contracts in 2020 (there
 * are 158,309, eighteen percent FEWER than 2019), a pre-COVID baseline of 72.3%
 * (2019 was already 77.8%). Every figure here therefore reads the endpoint and
 * prints what it says, and the prose was rewritten to match it — the ratchet the
 * headline names is real, the spike it used to claim is not.
 *
 * Four endpoints, five figures, one lazy chunk:
 *   F1 covid-floor            /analysis/year-over-year
 *   F2 covid-months           /analysis/monthly-breakdown/{2019,2020,2021}
 *   F3 covid-hemoser-calendar /vendors/6038/contracts?year=2020
 *   F4 covid-ratchet          /analysis/year-over-year  (shared with F1)
 *   F5 covid-sectors          /sectors?year=2019 + ?year=2020
 *
 * Honesty (STORY_DAYS principle 6): a figure whose query fails says so in one
 * mono line and points at the surface that owns the data. It never falls back
 * to a typed number.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ContractListItem, SectorStatistics, YearOverYearChange } from '@/api/types'
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SeriesLine, type SeriesPoint } from './SeriesLine'
import {
  useMonthlyYears,
  useSectorsYears,
  useVendorYearContracts,
  useYearOverYear,
} from './useEmergencyData'
import { SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

export type EmergencyFigureKind =
  | 'covid-floor'
  | 'covid-months'
  | 'covid-hemoser-calendar'
  | 'covid-ratchet'
  | 'covid-sectors'

/** HEMOSER, S.A. DE C.V. — the vendor ch2 names. */
const HEMOSER_ID = 6038
const HEMOSER_NAME = 'HEMOSER, S.A. DE C.V.'
/** From `/vendors/6038` at build time; the chip colours its own risk band. */
const HEMOSER_RISK = 0.4988
const HEMOSER_TIER = 2

const EMPHASIS = 'var(--color-risk-critical)'
const ACCENT = 'var(--color-accent)'
const MUTED = 'var(--color-text-muted)'

const STAMP = { en: 'LIVE · COMPRANET', es: 'EN VIVO · COMPRANET' } as const

const pct = (v: number) => `${v.toFixed(1)}%`

/**
 * The years whose award procedure CompraNet actually records.
 *
 * Structure A (2002–2009) carries no procedure type, so those years report a
 * direct-award rate of ~0.0 — an absence of data, not an absence of direct
 * awards. Plotting them would draw a competitive decade that never existed and
 * would crush the y-scale of the years that are real. The stub years (2000,
 * 2001, 2004: 1, 19 and 7 contracts) go with them.
 */
function recordedYears(rows: YearOverYearChange[], maxYear: number): YearOverYearChange[] {
  return rows
    .filter((r) => r.contracts >= 1000 && r.direct_award_pct >= 1 && r.year <= maxYear)
    .sort((a, b) => a.year - b.year)
}

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

// ── F1 · the floor ────────────────────────────────────────────────────────

const F1_CHROME = {
  en: { eyebrow: 'FIGURE I · THE FLOOR', title: 'The years above the line' },
  es: { eyebrow: 'FIGURA I · EL PISO', title: 'Los años por encima de la línea' },
}

function Floor({ rows, lang }: { rows: YearOverYearChange[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const series = recordedYears(rows, 2019)
  const c = F1_CHROME[lang]
  if (series.length < 2) return <Unavailable {...c} lang={lang} to="/methodology" />

  const first = series[0]
  const last = series[series.length - 1]
  const min = series.reduce((m, r) => (r.direct_award_pct < m.direct_award_pct ? r : m), series[0])

  const points: SeriesPoint[] = series.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.direct_award_pct,
    callout: r.year === last.year ? pct(r.direct_award_pct) : undefined,
    emphasis: r.year === last.year,
  }))

  return (
    <ChartCard
      source="/analysis/year-over-year"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct(last.direct_award_pct),
        label: es
          ? `adjudicación directa en ${last.year} — la línea base`
          : `direct award in ${last.year} — the before-state baseline`,
      }}
      annotation={
        es
          ? `Los registros de CompraNet de 2002 a 2009 no traen el tipo de procedimiento, así que la serie de adjudicación directa empieza en ${first.year}. Desde entonces nunca ha bajado de ${pct(min.direct_award_pct)} (${min.year}). La OCDE considera que 15–20% es el tope de un sistema competitivo: la banda sombreada al pie.`
          : `CompraNet's 2002–2009 records do not carry the award procedure, so the direct-award series begins in ${first.year}. It has never since fallen below ${pct(min.direct_award_pct)} (${min.year}). The OECD treats 15–20% as the ceiling of a competitive system — the shaded band at the foot.`
      }
    >
      <div className="px-2 pt-6">
        <SeriesLine
          points={points}
          yMin={0}
          yMax={100}
          yTicks={[0, 20, 40, 60, 80, 100]}
          formatTick={(v) => `${v}%`}
          bands={[
            {
              from: 15,
              to: 20,
              color: ACCENT,
              label: es ? 'banda de la OCDE 15–20%' : 'OECD band 15–20%',
            },
          ]}
          rules={[
            {
              value: min.direct_award_pct,
              color: MUTED,
              label: es
                ? `mínimo ${pct(min.direct_award_pct)} · ${min.year}`
                : `low ${pct(min.direct_award_pct)} · ${min.year}`,
            },
          ]}
          ariaSummary={
            es
              ? `Tasa de adjudicación directa por año de ${first.year} a ${last.year}: de ${pct(first.direct_award_pct)} a ${pct(last.direct_award_pct)}, con un mínimo de ${pct(min.direct_award_pct)} en ${min.year}.`
              : `Annual direct-award rate from ${first.year} to ${last.year}: ${pct(first.direct_award_pct)} rising to ${pct(last.direct_award_pct)}, with a low of ${pct(min.direct_award_pct)} in ${min.year}.`
          }
        />
      </div>
    </ChartCard>
  )
}

// ── F2 · the 36 months ────────────────────────────────────────────────────

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const F2_CHROME = {
  en: { eyebrow: 'FIGURE II · THE 36 MONTHS', title: 'The month competition was supposed to stop' },
  es: { eyebrow: 'FIGURA II · LOS 36 MESES', title: 'El mes en que la competencia debía detenerse' },
}

/** Stage → how many of the 36 months are drawn. */
const F2_STAGE_MONTHS = [12, 15, 24, 36]
/** Index of March 2020 — the decree marker sits in the gap after it. */
const DECREE_AFTER = 14

type Lens = 'rate' | 'value'

interface MonthRow {
  key: string
  year: number
  month: number
  contracts: number
  directAward: number
  value: number
}

function MonthsFigure({
  rows,
  lang,
  stage = 3,
}: {
  rows: MonthRow[]
  lang: 'en' | 'es'
  stage?: number
}) {
  const es = lang === 'es'
  const [lens, setLens] = useState<Lens>('rate')
  const c = F2_CHROME[lang]
  const months = es ? MONTHS_ES : MONTHS_EN

  const shown = F2_STAGE_MONTHS[Math.min(Math.max(stage, 0), 3)]

  const measure = (r: MonthRow) => (lens === 'rate' ? (100 * r.directAward) / r.contracts : r.value)

  // The 2019 reference: the year's aggregate rate (total direct awards over
  // total contracts), or its mean monthly value — both read off the same rows
  // the line is drawn from, so the rule can never disagree with the plot.
  const y2019 = rows.filter((r) => r.year === 2019)
  const baseline =
    lens === 'rate'
      ? (100 * y2019.reduce((s, r) => s + r.directAward, 0)) / y2019.reduce((s, r) => s + r.contracts, 0)
      : y2019.reduce((s, r) => s + r.value, 0) / y2019.length

  const peak = rows.reduce((m, r) => (measure(r) > measure(m) ? r : m), rows[0])
  // How often the post-decree series comes back under the 2019 line — the
  // stage-3 sentence is written from this, not asserted.
  const after = rows.slice(DECREE_AFTER + 1)
  const belowAfter = after.filter((r) => measure(r) < baseline).length

  const fmt = (v: number) => (lens === 'rate' ? pct(v) : formatCompactMXN(v))

  const points: SeriesPoint[] = rows.map((r, i) => ({
    key: r.key,
    axis: r.month === 1 || r.month === 7 ? `${months[r.month - 1]} ${String(r.year).slice(2)}` : undefined,
    value: measure(r),
    emphasis: i > DECREE_AFTER,
    callout: shown > 24 && r.key === peak.key ? fmt(measure(peak)) : undefined,
    calloutSub: shown > 24 && r.key === peak.key ? `${months[peak.month - 1]} ${peak.year}` : undefined,
  }))

  const values = rows.map(measure)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const yMin = lens === 'rate' ? Math.floor((lo - 4) / 5) * 5 : 0
  const yMax = lens === 'rate' ? Math.ceil((hi + 5) / 5) * 5 : Math.ceil((hi * 1.15) / 1e10) * 1e10
  const ticks =
    lens === 'rate'
      ? [yMin, (yMin + yMax) / 2, yMax]
      : [0, yMax / 2, yMax]

  const stageNote = [
    es
      ? `2019, antes del decreto. La regla punteada es la tasa del año: ${pct(baseline)}.`
      : `2019, before the decree. The dashed rule is the year's own rate: ${pct(baseline)}.`,
    es
      ? 'Enero a marzo de 2020 — los últimos meses bajo la regla anterior.'
      : 'January to March 2020 — the last months under the old rule.',
    es
      ? 'El decreto del 30 de marzo cae aquí. El resto de 2020 sigue la línea, no la rompe.'
      : 'The March 30 decree lands here. The rest of 2020 follows the line; it does not break it.',
    es
      ? `Y 2021: el mes más alto de los 36 es ${months[peak.month - 1]} de ${peak.year}, ${peak.year > 2020 ? 'después de la emergencia' : 'durante la emergencia'}, no en los meses del decreto. La serie vuelve por debajo de la línea de 2019 en ${belowAfter} de los ${after.length} meses posteriores.`
      : `And 2021: the highest of the 36 months is ${months[peak.month - 1]} ${peak.year}, ${peak.year > 2020 ? 'after the emergency' : 'during it'}, not in the decree months. The series falls back below the 2019 line in ${belowAfter} of the ${after.length} months that follow it.`,
  ][Math.min(Math.max(stage, 0), 3)]

  const lensLabel = {
    rate: es ? 'Tasa' : 'Rate',
    value: es ? 'Monto' : 'Value',
  }

  return (
    <ChartCard
      source="/analysis/monthly-breakdown"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: lens === 'rate' ? pct(measure(peak)) : formatCompactMXN(measure(peak)),
        label: es
          ? `${months[peak.month - 1]} de ${peak.year} — el mes más alto de la serie`
          : `${months[peak.month - 1]} ${peak.year} — the highest month in the series`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `${stageNote} Adjudicación directa como porcentaje de los contratos del mes (Tasa) o monto adjudicado en el mes (Monto), enero 2019 – diciembre 2021.`
          : `${stageNote} Direct award as a share of the month's contracts (Rate), or the month's awarded value (Value), January 2019 – December 2021.`
      }
    >
      <div className="px-2">
        <div className="flex items-center gap-2 pb-1">
          <span className="font-mono uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
            {es ? 'Lente' : 'Lens'}
          </span>
          {(['rate', 'value'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              aria-pressed={lens === l}
              className="font-mono uppercase px-2 py-0.5 border transition-colors"
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                borderColor: lens === l ? 'var(--color-accent)' : 'var(--color-border)',
                color: lens === l ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderRadius: 2,
              }}
            >
              {lensLabel[l]}
            </button>
          ))}
        </div>
        <SeriesLine
          points={points}
          visibleCount={shown}
          yMin={yMin}
          yMax={yMax}
          yTicks={ticks}
          formatTick={(v) => (lens === 'rate' ? `${Math.round(v)}%` : formatCompactMXN(v))}
          rules={[
            {
              value: baseline,
              color: MUTED,
              label: es ? `2019 · ${fmt(baseline)}` : `2019 · ${fmt(baseline)}`,
            },
          ]}
          markers={[
            {
              afterIndex: DECREE_AFTER,
              label: es ? '30 mar 2020 · decreto' : '30 Mar 2020 · decree',
            },
          ]}
          ariaSummary={
            es
              ? `Serie mensual de enero de 2019 a diciembre de 2021. El mes más alto es ${months[peak.month - 1]} de ${peak.year} con ${fmt(measure(peak))}; la referencia de 2019 es ${fmt(baseline)}.`
              : `Monthly series from January 2019 to December 2021. The highest month is ${months[peak.month - 1]} ${peak.year} at ${fmt(measure(peak))}; the 2019 reference is ${fmt(baseline)}.`
          }
        />
      </div>
    </ChartCard>
  )
}

// ── F3 · HEMOSER's 2020, day by day ───────────────────────────────────────

const F3_CHROME = {
  en: { eyebrow: "FIGURE III · ONE VENDOR'S YEAR", title: "HEMOSER's 2020, day by day" },
  es: { eyebrow: 'FIGURA III · EL AÑO DE UN PROVEEDOR', title: 'El 2020 de HEMOSER, día por día' },
}

/** Printed thresholds for the three fill steps — never colour alone. */
const DAY_STEPS = [10_000_000, 100_000_000]

const DAYS_IN_MONTH_2020 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function Calendar({
  rows,
  total,
  complete,
  lang,
}: {
  rows: ContractListItem[]
  total: number
  complete: boolean
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const months = es ? MONTHS_ES : MONTHS_EN

  const days = useMemo(() => {
    const m = new Map<string, { n: number; sum: number; allDirect: boolean; buyer: string }>()
    for (const r of rows) {
      const d = r.contract_date?.slice(0, 10)
      if (!d) continue
      const prev = m.get(d)
      const amount = r.amount_mxn || 0
      if (prev) {
        prev.n += 1
        prev.sum += amount
        prev.allDirect = prev.allDirect && r.is_direct_award
      } else {
        m.set(d, {
          n: 1,
          sum: amount,
          allDirect: r.is_direct_award,
          buyer: r.institution_name || (es ? 'sin institución' : 'no institution'),
        })
      }
    }
    return m
  }, [rows, es])

  const sum = rows.reduce((s, r) => s + (r.amount_mxn || 0), 0)
  const daCount = rows.filter((r) => r.is_direct_award).length
  const daShare = rows.length ? (100 * daCount) / rows.length : 0
  const daValue = rows.filter((r) => r.is_direct_award).reduce((s, r) => s + (r.amount_mxn || 0), 0)

  const byBuyer = new Map<string, number>()
  for (const r of rows) {
    const k = r.institution_name || (es ? 'sin institución' : 'no institution')
    byBuyer.set(k, (byBuyer.get(k) || 0) + (r.amount_mxn || 0))
  }
  const topBuyer = [...byBuyer.entries()].sort((a, b) => b[1] - a[1])[0]

  const topDays = [...days.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 5)

  const step = (v: number) => (v >= DAY_STEPS[1] ? 1 : v >= DAY_STEPS[0] ? 0.72 : 0.44)

  return (
    <ChartCard
      source="/vendors/${HEMOSER_ID}/contracts"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(sum),
        label: es ? 'adjudicados a HEMOSER en 2020' : 'awarded to HEMOSER in 2020',
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Una celda por día de 2020; se llena cuando HEMOSER tiene al menos una adjudicación con esa fecha de contrato. Rojo = todas las adjudicaciones de ese día fueron directas; gris = al menos una salió por licitación. La opacidad marca el monto del día en tres escalones: < ${formatCompactMXN(DAY_STEPS[0])} · ${formatCompactMXN(DAY_STEPS[0])}–${formatCompactMXN(DAY_STEPS[1])} · > ${formatCompactMXN(DAY_STEPS[1])}. Los registros traen la fecha de adjudicación, no la de solicitud: el conteo de "mismo día" es un rasgo del modelo (z_same_day_count) y no se dibuja aquí.`
          : `One cell per day of 2020, filled when HEMOSER has at least one award carrying that contract date. Red = every award that day was direct; grey = at least one went through a tender. Opacity steps the day's total in three: < ${formatCompactMXN(DAY_STEPS[0])} · ${formatCompactMXN(DAY_STEPS[0])}–${formatCompactMXN(DAY_STEPS[1])} · > ${formatCompactMXN(DAY_STEPS[1])}. The records carry the award date, not the request date: the same-day count is a model feature (z_same_day_count) and is not drawn here.`
      }
    >
      <div className="px-2 pb-2">
        <div className="pb-3">
          <EntityIdentityChip
            type="vendor"
            id={HEMOSER_ID}
            name={HEMOSER_NAME}
            riskScore={HEMOSER_RISK}
            ariaTier={HEMOSER_TIER}
            fullName
          />
        </div>

        {DAYS_IN_MONTH_2020.map((len, mi) => (
          <div
            key={mi}
            className="grid items-center"
            style={{ gridTemplateColumns: '30px 1fr', columnGap: 6, marginBottom: 2 }}
          >
            <span
              className="font-mono uppercase text-text-muted"
              style={{ fontSize: 11, letterSpacing: '0.06em' }}
            >
              {months[mi]}
            </span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))', gap: 1 }}>
              {Array.from({ length: 31 }, (_, di) => {
                if (di >= len) return <div key={di} />
                const iso = `2020-${String(mi + 1).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`
                const hit = days.get(iso)
                const dow = new Date(`${iso}T00:00:00Z`).getUTCDay()
                const weekend = dow === 0 || dow === 6
                const decree = iso === '2020-03-30'
                return (
                  <div
                    key={di}
                    title={
                      hit
                        ? `${iso} · ${hit.n} · ${formatCompactMXN(hit.sum)} · ${hit.buyer}`
                        : iso
                    }
                    style={{
                      aspectRatio: '1 / 1',
                      minHeight: 8,
                      borderRadius: 1,
                      background: hit
                        ? hit.allDirect
                          ? EMPHASIS
                          : 'var(--color-text-secondary)'
                        : weekend
                          ? 'var(--color-border)'
                          : 'transparent',
                      opacity: hit ? step(hit.sum) : 1,
                      border: decree
                        ? `1.5px solid ${ACCENT}`
                        : hit || weekend
                          ? 'none'
                          : '1px solid var(--color-border)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* One fact per unbreakable segment, separators between them
            (STORY_DAYS § 7: a number never breaks across lines). As one
            template string the browser was free to split "4.5B" from "MXN"
            and a percentage from its noun. The buyer's name is the one segment
            allowed to wrap — it is a name, not a number, and it is long. */}
        <p className="mt-3 font-mono text-text-secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
          {([
            // `nowrap` is only for segments that would split a value from its
            // unit. A percentage is a single token and cannot break, so the
            // clause carrying two of them stays wrappable — held unbreakable it
            // was wider than a 390px card and overflowed by 123px in Spanish.
            [
              es
                ? `${formatNumber(rows.length)} adjudicaciones en ${days.size} días`
                : `${formatNumber(rows.length)} awards on ${days.size} days`,
              true,
            ],
            [formatCompactMXN(sum), true],
            [
              es
                ? `${pct(daShare)} por adjudicación directa, que llevan ${pct(sum ? (100 * daValue) / sum : 0)} del dinero`
                : `${pct(daShare)} direct award, carrying ${pct(sum ? (100 * daValue) / sum : 0)} of the money`,
              false,
            ],
            ...(complete
              ? []
              : [
                  [
                    es
                      ? `mostrando ${rows.length} de ${total} adjudicaciones`
                      : `showing ${rows.length} of ${total} awards`,
                    true,
                  ] as [string, boolean],
                ]),
          ] as Array<[string, boolean]>).map(([seg, nowrap], i) => (
            <span key={seg}>
              {i > 0 ? ' · ' : ''}
              <span className={nowrap ? 'whitespace-nowrap' : undefined}>{seg}</span>
            </span>
          ))}
          {' · '}
          <span>
            {es ? 'principal comprador: ' : 'top buyer: '}
            {topBuyer
              ? `${topBuyer[0]} (${pct(sum ? (100 * topBuyer[1]) / sum : 0)}${es ? ' del monto' : ' of value'})`
              : '—'}
          </span>
        </p>

        <p
          className="mt-3 font-mono uppercase text-text-muted"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          {es ? 'Los cinco días más grandes' : 'The five biggest days'}
        </p>
        <ol className="mt-1">
          {topDays.map(([iso, d]) => (
            // The buyer gets its own line at every width. Sharing the row cost
            // it an ellipsis twice: "Instit…" at 390 with four columns fighting
            // over ~50px, and still 249px of ISSSTE's name cut at 1440 because
            // `truncate` clips whatever the flex track cannot hold. STORY_DAYS
            // principle 7 — a name is never truncated; it is given a line.
            <li key={iso} className="border-b border-border py-1" style={{ fontSize: 12 }}>
              <div className="flex items-baseline gap-3">
                <span className="font-mono tabular-nums text-text-primary whitespace-nowrap">{iso}</span>
                <span className="font-mono tabular-nums text-text-muted whitespace-nowrap ml-auto">
                  {d.n} {es ? (d.n === 1 ? 'adj.' : 'adjs.') : d.n === 1 ? 'award' : 'awards'}
                </span>
                <span className="font-mono tabular-nums text-text-primary whitespace-nowrap">
                  {formatCompactMXN(d.sum)}
                </span>
              </div>
              <span className="block font-mono text-text-muted leading-snug">{d.buyer}</span>
            </li>
          ))}
        </ol>
      </div>
    </ChartCard>
  )
}

// ── F4 · the ratchet ──────────────────────────────────────────────────────

const F4_CHROME = {
  en: { eyebrow: 'FIGURE IV · THE RATCHET', title: 'It never came back' },
  es: { eyebrow: 'FIGURA IV · EL TRINQUETE', title: 'Nunca regresó' },
}

function Ratchet({ rows, lang }: { rows: YearOverYearChange[]; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const series = recordedYears(rows, 2024)
  if (series.length < 6) return <Unavailable {...c} lang={lang} to="/methodology" />

  const by = new Map(series.map((r) => [r.year, r.direct_award_pct]))
  const pre = [2015, 2016, 2017, 2018, 2019].map((y) => by.get(y)).filter((v): v is number => v != null)
  const preMean = pre.reduce((s, v) => s + v, 0) / pre.length
  const post = [2021, 2022, 2023, 2024]
    .map((y) => ({ y, v: by.get(y) }))
    .filter((r): r is { y: number; v: number } => r.v != null)
  const postLow = post.reduce((m, r) => (r.v < m.v ? r : m), post[0])
  const postHigh = post.reduce((m, r) => (r.v > m.v ? r : m), post[0])
  const preMax = series.filter((r) => r.year < 2020).reduce((m, r) => Math.max(m, r.direct_award_pct), 0)

  const points: SeriesPoint[] = series.map((r) => ({
    key: String(r.year),
    axis: String(r.year),
    value: r.direct_award_pct,
    emphasis: r.year >= 2020,
    callout: r.year === 2020 ? pct(r.direct_award_pct) : undefined,
    calloutSub: r.year === 2020 ? '2020' : undefined,
  }))

  const lo = Math.min(...series.map((r) => r.direct_award_pct))
  const hi = Math.max(...series.map((r) => r.direct_award_pct))
  const yMin = Math.floor((lo - 5) / 5) * 5
  const yMax = Math.ceil((hi + 5) / 5) * 5

  return (
    <ChartCard
      source="/analysis/year-over-year"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct(postLow.v),
        label: es
          ? `el año post-emergencia más bajo (${postLow.y}) — ${(postLow.v - preMean).toFixed(1)} puntos sobre el promedio 2015–19`
          : `the lowest post-emergency year (${postLow.y}) — ${(postLow.v - preMean).toFixed(1)} points above the 2015–19 mean`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Serie anual ${series[0].year}–${series[series.length - 1].year}; 2025 se omite porque el corte de datos se congeló el 28 de septiembre de ese año. La regla punteada es el promedio 2015–2019 (${pct(preMean)}); la banda sombreada va del año post-emergencia más bajo (${pct(postLow.v)}, ${postLow.y}) al más alto (${pct(postHigh.v)}, ${postHigh.y}). El más bajo de esos cuatro años supera a cualquier año anterior a la pandemia, cuyo máximo fue ${pct(preMax)}.`
          : `Annual series ${series[0].year}–${series[series.length - 1].year}; 2025 is left out because the data cut froze on September 28 of that year. The dashed rule is the 2015–2019 mean (${pct(preMean)}); the shaded band runs from the lowest post-emergency year (${pct(postLow.v)}, ${postLow.y}) to the highest (${pct(postHigh.v)}, ${postHigh.y}). The lowest of those four years is above every pre-pandemic year on record, whose highest was ${pct(preMax)}.`
      }
    >
      <div className="px-2 pt-6">
        <SeriesLine
          points={points}
          yMin={yMin}
          yMax={yMax}
          yTicks={[yMin, (yMin + yMax) / 2, yMax]}
          formatTick={(v) => `${Math.round(v)}%`}
          bands={[
            {
              from: postLow.v,
              to: postHigh.v,
              color: EMPHASIS,
              label: es
                ? `piso post-emergencia ${pct(postLow.v)}–${pct(postHigh.v)}`
                : `post-emergency floor ${pct(postLow.v)}–${pct(postHigh.v)}`,
            },
          ]}
          rules={[
            {
              value: preMean,
              color: MUTED,
              label: es ? `promedio 2015–19 · ${pct(preMean)}` : `2015–19 mean · ${pct(preMean)}`,
            },
          ]}
          ariaSummary={
            es
              ? `Tasa anual de adjudicación directa de ${series[0].year} a ${series[series.length - 1].year}. Promedio 2015–2019: ${pct(preMean)}. Cada año de 2021 a 2024 está entre ${pct(postLow.v)} y ${pct(postHigh.v)}.`
              : `Annual direct-award rate from ${series[0].year} to ${series[series.length - 1].year}. The 2015–2019 mean is ${pct(preMean)}. Every year from 2021 to 2024 sits between ${pct(postLow.v)} and ${pct(postHigh.v)}.`
          }
        />
      </div>
    </ChartCard>
  )
}

// ── F5 · who moved ────────────────────────────────────────────────────────

const F5_CHROME = {
  en: { eyebrow: 'FIGURE V · WHO MOVED', title: 'Where the tripwire mattered' },
  es: { eyebrow: 'FIGURA V · QUIÉN SE MOVIÓ', title: 'Dónde importaba el cable trampa' },
}

function sectorLabel(id: number, name: string, lang: 'en' | 'es'): string {
  const s = SECTORS.find((x) => x.id === id)
  if (!s) return name
  return lang === 'es' ? s.name : s.nameEN
}

function Dumbbell({
  before,
  after,
  lang,
}: {
  before: SectorStatistics[]
  after: SectorStatistics[]
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const rate = (s: SectorStatistics) => (s.total_contracts ? (100 * s.direct_award_count) / s.total_contracts : 0)
  const afterById = new Map(after.map((s) => [s.sector_id, s]))

  const rows = before
    .map((b) => {
      const a = afterById.get(b.sector_id)
      if (!a) return null
      const p19 = rate(b)
      const p20 = rate(a)
      return { id: b.sector_id, name: sectorLabel(b.sector_id, b.sector_name, lang), p19, p20, d: p20 - p19 }
    })
    .filter((r): r is NonNullable<typeof r> => r != null)
    .sort((x, y) => y.d - x.d)

  if (!rows.length) return <Unavailable {...c} lang={lang} to="/sectors" />

  const top = rows[0]
  const bottom = rows[rows.length - 1]
  const lo = Math.min(...rows.flatMap((r) => [r.p19, r.p20]))
  const hi = Math.max(...rows.flatMap((r) => [r.p19, r.p20]))
  const span = Math.max(hi - lo, 1)
  const at = (v: number) => `${(((v - lo) / span) * 100).toFixed(1)}%`

  return (
    <ChartCard
      source="/sectors?year="
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: `${top.d >= 0 ? '+' : ''}${top.d.toFixed(1)} pp`,
        label: es ? `${top.name} — el mayor aumento` : `${top.name} — the largest rise`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Tasa de adjudicación directa por sector, 2019 → 2020, ordenada por el cambio. El punto hueco es 2019, el lleno 2020; rojo cuando la tasa sube, gris cuando baja. Sólo ${rows.filter((r) => r.d > 0).length} de ${rows.length} sectores se volvieron más directos en el año de la emergencia; ${bottom.name} se movió en sentido contrario, ${bottom.d.toFixed(1)} puntos. La paleta sectorial no se usa aquí: el color codifica la dirección, no el sector.`
          : `Direct-award rate by sector, 2019 → 2020, ordered by the change. The hollow dot is 2019, the filled one 2020; red where the rate rose, grey where it fell. Only ${rows.filter((r) => r.d > 0).length} of ${rows.length} sectors got more direct in the emergency year; ${bottom.name} moved the other way, by ${bottom.d.toFixed(1)} points. The sector palette is not used here — colour encodes direction, not sector.`
      }
    >
      <div className="px-2 pb-2">
        <div
          className="flex items-baseline justify-between font-mono uppercase text-text-muted pb-2"
          style={{ fontSize: 11, letterSpacing: '0.16em' }}
        >
          <span>{es ? 'Sector' : 'Sector'}</span>
          <span>{es ? '2019 → 2020 · cambio' : '2019 → 2020 · change'}</span>
        </div>
        {rows.map((r) => {
          const up = r.d > 0
          const dotColor = up ? EMPHASIS : MUTED
          return (
            <div
              key={r.id}
              className="border-b border-border py-2 sm:grid sm:items-center"
              style={{ gridTemplateColumns: '120px 1fr 148px', columnGap: 10 }}
            >
              {/* Wraps rather than truncates — the sector name is a name
                  (STORY_DAYS principle 7), and a 120px track is narrower than
                  "Infraestructura" once the page is zoomed. */}
              <span className="block text-text-primary" style={{ fontSize: 13 }}>
                {r.name}
              </span>
              <div className="relative my-1.5 sm:my-0" style={{ height: 14 }}>
                <span
                  className="absolute"
                  style={{
                    left: at(Math.min(r.p19, r.p20)),
                    width: `calc(${at(Math.max(r.p19, r.p20))} - ${at(Math.min(r.p19, r.p20))})`,
                    top: 6,
                    height: 2,
                    background: dotColor,
                    opacity: 0.45,
                  }}
                />
                <span
                  className="absolute"
                  style={{
                    left: at(r.p19),
                    top: 2,
                    width: 10,
                    height: 10,
                    marginLeft: -5,
                    borderRadius: 999,
                    border: `1.5px solid ${MUTED}`,
                    background: 'var(--color-background-card)',
                  }}
                />
                <span
                  className="absolute"
                  style={{
                    left: at(r.p20),
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
                className="font-mono tabular-nums text-text-muted block sm:text-right whitespace-nowrap"
                style={{ fontSize: 12 }}
              >
                {pct(r.p19)} → <span className="text-text-primary">{pct(r.p20)}</span>{' '}
                <span style={{ color: up ? EMPHASIS : MUTED }}>
                  {r.d >= 0 ? '+' : ''}
                  {r.d.toFixed(1)}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveEmergencyFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: EmergencyFigureKind
  lang: 'en' | 'es'
  /** F2 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure fetches only its own endpoint. The five share the page, so the
  // page still issues one request per endpoint — but a figure mounted alone
  // (or one that fails) never drags the other three's traffic behind it.
  const yoy = useYearOverYear(kind === 'covid-floor' || kind === 'covid-ratchet')
  const monthly = useMonthlyYears(kind === 'covid-months' ? [2019, 2020, 2021] : [])
  const hemoser = useVendorYearContracts(HEMOSER_ID, 2020, kind === 'covid-hemoser-calendar')
  const sectors = useSectorsYears([2019, 2020], kind === 'covid-sectors')

  if (kind === 'covid-floor' || kind === 'covid-ratchet') {
    const chrome = kind === 'covid-floor' ? F1_CHROME[lang] : F4_CHROME[lang]
    if (yoy.isPending) return <Loading {...chrome} lang={lang} />
    if (yoy.isError || !yoy.data) return <Unavailable {...chrome} lang={lang} to="/methodology" />
    return kind === 'covid-floor' ? (
      <Floor rows={yoy.data} lang={lang} />
    ) : (
      <Ratchet rows={yoy.data} lang={lang} />
    )
  }

  if (kind === 'covid-months') {
    const chrome = F2_CHROME[lang]
    if (monthly.isPending) return <Loading {...chrome} lang={lang} />
    if (monthly.isError || !monthly.data) return <Unavailable {...chrome} lang={lang} to="/explore" />
    const rows: MonthRow[] = monthly.data.flatMap((y) =>
      y.months.map((m) => ({
        key: `${y.year}-${String(m.month).padStart(2, '0')}`,
        year: y.year,
        month: m.month,
        contracts: m.contracts,
        directAward: m.direct_award_count,
        value: m.value,
      })),
    )
    if (rows.length < 24) return <Unavailable {...chrome} lang={lang} to="/explore" />
    return <MonthsFigure rows={rows} lang={lang} stage={stage} />
  }

  if (kind === 'covid-hemoser-calendar') {
    const chrome = F3_CHROME[lang]
    if (hemoser.isPending) return <Loading {...chrome} lang={lang} />
    if (hemoser.isError || !hemoser.data || !hemoser.data.rows.length)
      return <Unavailable {...chrome} lang={lang} to={`/vendors/${HEMOSER_ID}`} />
    return (
      <Calendar
        rows={hemoser.data.rows}
        total={hemoser.data.total}
        complete={hemoser.data.complete}
        lang={lang}
      />
    )
  }

  const chrome = F5_CHROME[lang]
  if (sectors.isPending) return <Loading {...chrome} lang={lang} />
  if (sectors.isError || !sectors.data) return <Unavailable {...chrome} lang={lang} to="/sectors" />
  return <Dumbbell before={sectors.data[0].data} after={sectors.data[1].data} lang={lang} />
}
