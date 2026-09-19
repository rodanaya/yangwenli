/**
 * IntermediaryFigures — the five live figures of «Sigan al intermediario»
 * (SD-05).
 *
 * The story's prototype broker was a vendor ARIA had already cleared.
 * CONSTRUCTORA ARHNOS is the largest firm in the P3 cohort by value and it
 * carried the subheadline, the ch3 lede and the pull-quote; the register files
 * it `review_status = false_positive`. It is not alone: of the largest P3
 * vendors at the buyers where the pattern's money sits, the first, second,
 * fifth, seventh and eighth by value all carry a cleared disposition. Two
 * enormous contracts inside one year are the signature of a megaproject
 * contractor as much as of a shell, and the pattern cannot tell them apart —
 * only a reviewer can.
 *
 * So the figures are built the other way up. F1 and F2 show where the money
 * is. F3 goes to the thirteen Tier-1 leads, where the signature is unambiguous
 * and every row is already a documented case. F4 counts who has been checked.
 * F5 counts who has not — 2,691 of 2,972.
 *
 * No vendor carrying a cleared disposition is drawn, named or chipped
 * anywhere in this file; `isCleared` in `useIntermediaryData` is the single
 * rule, and every figure that drops rows says how many and why.
 *
 * Four endpoints, five figures, one lazy chunk:
 *   F1 p3-sectors  /aria/patterns/P3/institutions?group=sector
 *   F2 p3-flows    /aria/patterns/P3/institutions?vendors=3
 *   F3 p3-ticket   /aria/queue?pattern=P3&tier=1  +  /sectors
 *   F4 p3-file     /aria/patterns/P3/institutions?vendors=3
 *   F5 p3-queue    the cohort block of the sector call
 *
 * Rules inherited from SD-01..04: HTML owns every glyph — there is no <text>
 * in this file — no label or value is truncated, a number never breaks across
 * a line, and a figure whose query fails says so in one mono line rather than
 * falling back to a typed number.
 */
import { Link } from 'react-router-dom'
import type { AriaPatternGroupRow, AriaPatternGroupsResponse, AriaQueueItem } from '@/api/types'
import type { SectorStatistics } from '@/api/types'
import { FunnelStrip } from '@/components/capture/FunnelStrip'
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  FLOW_ROWS,
  flowValue,
  isCleared,
  ticketOf,
  useP3Buyers,
  useP3Sectors,
  useP3Tier1,
  useSectorNorms,
} from './useIntermediaryData'

export type IntermediaryFigureKind =
  | 'p3-sectors'
  | 'p3-flows'
  | 'p3-ticket'
  | 'p3-file'
  | 'p3-queue'

const EMPHASIS = 'var(--color-risk-critical)'
const ACCENT = 'var(--color-accent)'
const MUTED = 'var(--color-text-muted)'
/** Zinc — the unemphasised field. Low is never green (Bible § 3.10). */
const FIELD = '#71717a'
/** Amber — a partial disposition, between the field and the emphasis. */
const PARTIAL = '#a16207'

const STAMP = { en: 'LIVE · ARIA', es: 'EN VIVO · ARIA' } as const

const pct1 = (v: number) => `${v.toFixed(1)}%`

/** The three sectors ch1 names, in the order it names them. */
const NAMED_SECTORS = ['infraestructura', 'energia', 'salud']

const SECTOR_LABEL: Record<string, { en: string; es: string }> = {
  salud: { en: 'Health', es: 'Salud' },
  educacion: { en: 'Education', es: 'Educación' },
  infraestructura: { en: 'Infrastructure', es: 'Infraestructura' },
  energia: { en: 'Energy', es: 'Energía' },
  defensa: { en: 'Defense', es: 'Defensa' },
  tecnologia: { en: 'Technology', es: 'Tecnología' },
  hacienda: { en: 'Treasury', es: 'Hacienda' },
  gobernacion: { en: 'Governance', es: 'Gobernación' },
  agricultura: { en: 'Agriculture', es: 'Agricultura' },
  ambiente: { en: 'Environment', es: 'Ambiente' },
  trabajo: { en: 'Labor', es: 'Trabajo' },
  otros: { en: 'Other', es: 'Otros' },
}

const sectorName = (code: string, lang: 'en' | 'es') => SECTOR_LABEL[code]?.[lang] ?? code

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
 * A row of facts under a chip or a bar.
 *
 * Each cell is its own unbreakable unit with a break opportunity between
 * cells, so the line wraps between facts and never inside one: "556.5B MXN"
 * splitting its unit onto a second line reads as two numbers
 * (STORY_DAYS.md § 7).
 */
function FactLine({
  items,
  className = '',
  style,
}: {
  items: React.ReactNode[]
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono tabular-nums text-text-muted ${className}`}
      style={{ fontSize: 11.5, ...style }}
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

// ── F1 · the signature ────────────────────────────────────────────────────

const F1_CHROME = {
  en: { eyebrow: 'FIGURE I · THE SIGNATURE', title: 'Where the pass-through pattern puts its money' },
  es: { eyebrow: 'FIGURA I · LA FIRMA', title: 'Dónde pone su dinero el patrón de paso' },
}

function Sectors({
  body,
  lang,
  stage = 3,
}: {
  body: AriaPatternGroupsResponse
  lang: 'en' | 'es'
  stage?: number
}) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  const cohort = body.cohort!
  const clamped = Math.min(Math.max(stage, 0), 3)

  // Ordered by the money, because the money is what the chapter follows. The
  // share of each sector's flagged spend rides along as the second fact.
  const rows = [...body.rows].sort((a, b) => b.total_value_mxn - a.total_value_mxn)
  const named = rows.filter((r) => NAMED_SECTORS.includes(r.label))
  const namedSum = named.reduce((s, r) => s + r.total_value_mxn, 0)
  const namedShare = cohort.total_value_mxn > 0 ? (100 * namedSum) / cohort.total_value_mxn : 0
  const max = Math.max(...rows.map((r) => r.total_value_mxn), 1)

  return (
    <ChartCard
      source="/aria/patterns/P3/institutions?group=sector"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(cohort.total_value_mxn),
        label: es
          ? `en contratos federales de por vida de los ${formatNumber(cohort.total_vendors)} proveedores que coinciden con la firma de intermediación`
          : `in lifetime federal contracts held by the ${formatNumber(cohort.total_vendors)} vendors that match the intermediary signature`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada barra suma la contratación federal acumulada de los proveedores P3 cuyo sector principal es ese — el valor viaja con el proveedor y abarca toda su vida en el padrón, no un año ni un presupuesto sectorial. Los tres sectores que el capítulo nombra suman ${formatCompactMXN(namedSum)}, ${pct1(namedShare)} de la cohorte. La segunda cifra de cada fila es la porción de todo lo que ARIA marca en ese sector, bajo cualquier patrón, que corre por intermediarios: el denominador viene de la misma consulta, así que la porción es comprobable sin salir de ella. Los doce sectores están aquí; la cohorte no se reparte en ocho.`
          : `Each bar sums the lifetime federal contracting of the P3 vendors whose primary sector is that one — the value travels with the vendor and covers its whole life in the register, not one year and not a sector budget. The three sectors the chapter names hold ${formatCompactMXN(namedSum)} between them, ${pct1(namedShare)} of the cohort. The second figure on each row is the share of everything ARIA flags in that sector, under any pattern, that runs through intermediaries: the denominator comes from the same query, so the share is checkable without leaving it. All twelve sectors are here; the cohort does not divide into eight.`
      }
    >
      <div className="px-2 pb-2">
        {rows.map((r) => {
          const isNamed = NAMED_SECTORS.includes(r.label)
          const lit = clamped >= 1 && isNamed
          const color = lit ? SECTOR_COLORS[r.label] ?? ACCENT : FIELD
          const share = r.flagged_value_mxn > 0 ? (100 * r.total_value_mxn) / r.flagged_value_mxn : 0
          return (
            <div key={r.key} className="border-b border-border py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-text-primary" style={{ fontSize: 13 }}>
                  {sectorName(r.label, lang)}
                </span>
                <span
                  className="font-mono tabular-nums whitespace-nowrap"
                  style={{ fontSize: 12.5, color: lit ? 'var(--color-text-primary)' : MUTED }}
                >
                  {formatCompactMXN(r.total_value_mxn)}
                </span>
              </div>

              <div className="relative mt-1.5" style={{ height: 10 }}>
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.max((100 * r.total_value_mxn) / max, 0.6)}%`,
                    background: color,
                    opacity: lit ? 0.92 : 0.5,
                    borderRadius: 2,
                    transition: 'background-color 240ms ease, opacity 240ms ease',
                  }}
                  aria-hidden="true"
                />
              </div>

              <FactLine
                className="mt-1"
                items={[
                  <>
                    {formatNumber(r.vendor_count)} {es ? 'proveedores P3' : 'P3 vendors'}
                  </>,
                  <>
                    {pct1(share)} {es ? 'de lo marcado aquí' : 'of what ARIA flags here'}
                  </>,
                ]}
              />
            </div>
          )
        })}

        {clamped >= 2 && (
          <Footline>
            <span className="whitespace-nowrap text-text-primary">{formatCompactMXN(namedSum)}</span>{' '}
            {es
              ? `en los tres sectores que el capítulo nombra — ${named
                  .map((r) => sectorName(r.label, lang).toLowerCase())
                  .join(', ')} — o `
              : `across the three sectors the chapter names — ${named
                  .map((r) => sectorName(r.label, lang).toLowerCase())
                  .join(', ')} — or `}
            <span className="whitespace-nowrap">{pct1(namedShare)}</span>
            {es ? ' de la cohorte.' : ' of the cohort.'}
          </Footline>
        )}

        {clamped >= 3 && (
          <Footline>
            {es ? 'La cohorte completa: ' : 'The whole cohort: '}
            <span className="whitespace-nowrap text-text-primary">
              {formatNumber(cohort.total_vendors)}
            </span>
            {es ? ' proveedores, ' : ' vendors, '}
            <span className="whitespace-nowrap text-text-primary">
              {formatCompactMXN(cohort.total_value_mxn)}
            </span>
            {es
              ? `, repartidos en los ${rows.length} sectores de la taxonomía.`
              : `, spread across all ${rows.length} sectors of the taxonomy.`}
          </Footline>
        )}

        <span className="sr-only">
          {es
            ? `Contratación P3 por sector. ${rows
                .map(
                  (r) =>
                    `${sectorName(r.label, 'es')}: ${formatCompactMXN(r.total_value_mxn)}, ${formatNumber(r.vendor_count)} proveedores`,
                )
                .join('. ')}.`
            : `P3 contracting by sector. ${rows
                .map(
                  (r) =>
                    `${sectorName(r.label, 'en')}: ${formatCompactMXN(r.total_value_mxn)}, ${formatNumber(r.vendor_count)} vendors`,
                )
                .join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F2 · the channels ─────────────────────────────────────────────────────

const F2_CHROME = {
  en: { eyebrow: 'FIGURE II · THE CHANNELS', title: 'One buyer, one broker: the largest channel at each address' },
  es: { eyebrow: 'FIGURA II · LOS CANALES', title: 'Un comprador, un intermediario: el canal mayor en cada dirección' },
}

/** A buyer paired with the largest vendor at it that no reviewer has cleared. */
type Channel = {
  row: AriaPatternGroupRow
  vendor: AriaPatternGroupRow['vendors'][number]
  value: number
}

function channelsOf(body: AriaPatternGroupsResponse): {
  channels: Channel[]
  clearedCount: number
  clearedValue: number
  fetched: number
} {
  const channels: Channel[] = []
  let clearedCount = 0
  let clearedValue = 0
  let fetched = 0
  for (const row of body.rows) {
    for (const v of row.vendors) {
      fetched += 1
      if (isCleared(v)) {
        clearedCount += 1
        clearedValue += v.total_value_mxn
      }
    }
    const standing = row.vendors.find((v) => !isCleared(v))
    if (standing) channels.push({ row, vendor: standing, value: flowValue(standing) })
  }
  channels.sort((a, b) => b.value - a.value)
  return { channels: channels.slice(0, FLOW_ROWS), clearedCount, clearedValue, fetched }
}

function Channels({ body, lang }: { body: AriaPatternGroupsResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const { channels, clearedCount, clearedValue, fetched } = channelsOf(body)
  const max = Math.max(...channels.map((ch) => ch.value), 1)
  const lead = channels[0]

  return (
    <ChartCard
      source="/aria/patterns/P3/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(lead.value),
        label: es
          ? `el canal mayor: de ${lead.row.label} a un solo proveedor con patrón de intermediación`
          : `the largest single channel: from ${lead.row.label} to one intermediary-pattern vendor`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada fila es un canal: el comprador donde el patrón concentra más dinero y el mayor proveedor P3 anclado ahí que ningún revisor ha descartado. La cifra es una estimación de dos campos del padrón — la contratación de por vida del proveedor por la porción de ella que va a ese comprador, las dos cifras siguientes de la fila — no una suma contrato por contrato, y por eso se imprime junto a sus dos factores. De los ${formatNumber(fetched)} proveedores mayores en estas ${formatNumber(body.rows.length)} direcciones, ${formatNumber(clearedCount)} llevan una disposición de revisión de falso positivo o exclusión estructural, ${formatCompactMXN(clearedValue)} entre ellos, y no se dibujan: dos contratos enormes dentro de un año son la firma de un contratista de megaproyecto tanto como la de una fachada, y el patrón no los distingue. Los nombres de comprador son las siglas con que la cola archiva al comprador; PEMEX reúne tres registros y la ficha abre el mayor.`
          : `Each row is a channel: the buyer where the pattern concentrates most money, and the largest P3 vendor anchored there that no reviewer has cleared. The figure is an estimate from two register fields — the vendor's lifetime contracting times the share of it that sits at that buyer — not a summed contract ledger, which is why it is printed beside both of its factors. Of the ${formatNumber(fetched)} largest vendors at these ${formatNumber(body.rows.length)} addresses, ${formatNumber(clearedCount)} carry a review disposition of false positive or structural exclusion, ${formatCompactMXN(clearedValue)} between them, and are not drawn: two enormous contracts inside one year are the signature of a megaproject contractor as much as of a front, and the pattern cannot tell them apart. The buyer names are the acronyms the queue files a buyer under; PEMEX gathers three registrations and the chip opens the largest.`
      }
    >
      <div className="px-2 pb-2">
        <ol>
          {channels.map(({ row, vendor, value }) => {
            const ratio = (vendor.top_institution_ratio ?? 0) * 100
            return (
              <li key={row.key} className="border-b border-border py-2.5">
                {/* Buyer above, broker below. A `fullName` chip fills its flex
                    line, so an arrow set BETWEEN the two chips was pushed onto
                    a line of its own on eight rows in ten and read as a stray
                    mark. It belongs to the broker, so it travels with it. */}
                {row.institution_id != null ? (
                  <EntityIdentityChip
                    type="institution"
                    id={row.institution_id}
                    name={row.institution_name ?? row.label}
                    fullName
                  />
                ) : (
                  <span className="block text-text-primary" style={{ fontSize: 13 }}>
                    {row.label}
                  </span>
                )}
                {/* The chip renders `w-full` in `fullName` mode, so it fills
                    any flex line it is placed on and pushes a sibling arrow
                    onto a line of its own. It gets its own `min-w-0 flex-1`
                    box — the SD-04 pattern — and the arrow keeps the gutter. */}
                <div className="mt-1 flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-mono text-text-muted"
                    style={{ fontSize: 13, lineHeight: '24px' }}
                  >
                    →
                  </span>
                  <div className="min-w-0 flex-1">
                    <EntityIdentityChip
                      type="vendor"
                      id={vendor.vendor_id}
                      name={vendor.vendor_name}
                      riskScore={vendor.avg_risk_score ?? undefined}
                      ariaTier={
                        vendor.ips_tier === 1 || vendor.ips_tier === 2 || vendor.ips_tier === 3 || vendor.ips_tier === 4
                          ? vendor.ips_tier
                          : undefined
                      }
                      flags={vendor.in_ground_truth ? ['gt'] : undefined}
                      fullName
                    />
                  </div>
                </div>

                <div className="relative mt-2" style={{ height: 10 }}>
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.max((100 * value) / max, 0.6)}%`,
                      background: EMPHASIS,
                      opacity: 0.9,
                      borderRadius: 2,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <FactLine
                  className="mt-1.5"
                  items={[
                    <span className="text-text-primary">{formatCompactMXN(value)}</span>,
                    <>
                      {pct1(ratio)} {es ? 'de su contratación' : 'of its contracting'}
                    </>,
                    <>
                      {formatNumber(vendor.total_contracts)} {es ? 'contratos' : 'contracts'}
                    </>,
                  ]}
                />
              </li>
            )
          })}
        </ol>

        <Footline>
          {es
            ? `${formatNumber(body.rows.length)} direcciones consultadas, ${formatNumber(channels.length)} canales dibujados, `
            : `${formatNumber(body.rows.length)} addresses queried, ${formatNumber(channels.length)} channels drawn, `}
          <span className="whitespace-nowrap text-text-primary">{formatNumber(clearedCount)}</span>
          {es ? ' proveedores descartados en revisión.' : ' vendors cleared on review.'}
        </Footline>

        <span className="sr-only">
          {es
            ? `Canales de comprador a intermediario. ${channels
                .map((ch) => `${ch.row.label} a ${ch.vendor.vendor_name}: ${formatCompactMXN(ch.value)}`)
                .join('. ')}.`
            : `Buyer-to-intermediary channels. ${channels
                .map((ch) => `${ch.row.label} to ${ch.vendor.vendor_name}: ${formatCompactMXN(ch.value)}`)
                .join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F3 · the ticket ───────────────────────────────────────────────────────

const F3_CHROME = {
  en: { eyebrow: 'FIGURE III · THE TICKET', title: 'What one contract is worth to a Tier-1 broker' },
  es: { eyebrow: 'FIGURA III · EL TICKET', title: 'Cuánto vale un solo contrato para un intermediario de nivel 1' },
}

/**
 * The log lane, four decades wide.
 *
 * A million pesos and ten billion sit on the same row only on a log axis, and
 * the decades land on quarters, so the tick labels are a plain flex row with
 * `justify-between` rather than four absolutely-positioned glyphs that would
 * each need their own edge correction.
 */
const LOG_MIN = 6 // 1M MXN
const LOG_MAX = 10 // 10B MXN
/**
 * Decade labels, per locale.
 *
 * "1B" may not appear in the Spanish axis: a billón is 10¹², so an
 * English-loaned B would put the tick three decades off for a Mexican reader
 * (CLAUDE.md § Spanish currency formatting). Spanish counts the lane in MDP —
 * millones de pesos — which is also the unit every row readout in this figure
 * prints, so the axis and the rows read in the same currency.
 */
const LOG_TICKS = {
  en: ['1M', '10M', '100M', '1B', '10B'],
  es: ['1', '10', '100', '1,000', '10,000'],
} as const
const logPos = (v: number) => {
  if (v <= 0) return 0
  const p = (Math.log10(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)
  return Math.min(Math.max(p, 0), 1) * 100
}

function Ticket({
  rows,
  sectors,
  lang,
}: {
  rows: AriaQueueItem[]
  sectors: SectorStatistics[]
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]

  const normFor = (code: string | null) =>
    sectors.find((s) => s.sector_code === (code ?? '').toLowerCase())?.avg_contract_value ?? 0

  const ranked = rows
    .map((r) => {
      const ticket = ticketOf(r)
      const norm = normFor(r.primary_sector_name)
      return { r, ticket, norm, multiple: norm > 0 ? ticket / norm : 0 }
    })
    .sort((a, b) => b.ticket - a.ticket)
  const lead = ranked[0]

  const mult = (m: number) => (m >= 100 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`)

  return (
    <ChartCard
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: mult(lead.multiple),
        label: es
          ? `el contrato promedio de su sector, en el ticket del mayor intermediario de nivel 1`
          : `the average contract in its sector, in the ticket of the largest Tier-1 intermediary`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `El punto lleno es el ticket del proveedor — su contratación total entre su número de contratos. El punto hueco es el contrato promedio de su sector principal, de /sectors, y el tramo entre los dos es el múltiplo impreso a la derecha. La escala es logarítmica: cuatro décadas, de un millón de pesos a diez mil millones, porque los dos valores de una fila se separan por dos o tres órdenes de magnitud. Un ticket grande no prueba nada por sí solo — un tramo de carretera cuesta lo que cuesta — pero es uno de los seis términos del burst score con que ARIA define la intermediación de un solo uso (ARIA_SPEC § Módulo 3), junto con una vida de a lo más tres años y la desaparición posterior. La prueba del patrón se toma contra la mediana del sector; aquí se imprime el promedio, que es lo que publica /sectors. Estas son las ${formatNumber(rows.length)} filas de nivel 1 de la cohorte P3 — la banda que la cola prioriza — y las ${formatNumber(rows.filter((r) => r.in_ground_truth).length)} están ya documentadas como casos.`
          : `The filled dot is the vendor's ticket — its total contracting divided by its number of contracts. The hollow dot is the average contract in its primary sector, from /sectors, and the run between them is the multiple printed on the right. The scale is logarithmic across four decades, from one million pesos to ten billion, because a row's two values sit two or three orders of magnitude apart. A large ticket proves nothing on its own — a stretch of motorway costs what it costs — but it is one of the six terms in the burst score ARIA defines single-use intermediation with (ARIA_SPEC § Module 3), alongside a life of at most three years and disappearance afterwards. The pattern's own test is taken against the sector median; what is printed here is the average, which is what /sectors publishes. These are the cohort's ${formatNumber(rows.length)} Tier-1 rows — the band the queue prioritises — and ${formatNumber(rows.filter((r) => r.in_ground_truth).length)} of them are already documented cases.`
      }
    >
      <div className="px-2 pb-2">
        <ol>
          {ranked.map(({ r, ticket, norm, multiple }) => {
            const color = SECTOR_COLORS[(r.primary_sector_name ?? '').toLowerCase()] ?? ACCENT
            return (
              <li key={r.vendor_id} className="border-b border-border py-2.5">
                <EntityIdentityChip
                  type="vendor"
                  id={r.vendor_id}
                  name={r.vendor_name}
                  riskScore={r.avg_risk_score}
                  ariaTier={r.ips_tier}
                  flags={r.in_ground_truth ? ['gt'] : undefined}
                  fullName
                />

                {/* The lane is inset by 8px so a 10px dot sitting on either
                    decade end stays inside the card rather than under its
                    `overflow: hidden` edge. */}
                <div className="relative mx-2 mt-2.5" style={{ height: 12 }}>
                  <div
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                    style={{ height: 1, background: 'var(--color-border)' }}
                    aria-hidden="true"
                  />
                  {norm > 0 && (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{
                          left: `${logPos(norm)}%`,
                          width: `${Math.max(logPos(ticket) - logPos(norm), 0)}%`,
                          height: 2,
                          background: color,
                          opacity: 0.45,
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="absolute top-1/2"
                        style={{
                          left: `${logPos(norm)}%`,
                          width: 9,
                          height: 9,
                          marginLeft: -4.5,
                          marginTop: -4.5,
                          borderRadius: '50%',
                          border: `1.5px solid ${MUTED}`,
                          background: 'var(--color-background-card)',
                        }}
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <span
                    className="absolute top-1/2"
                    style={{
                      left: `${logPos(ticket)}%`,
                      width: 10,
                      height: 10,
                      marginLeft: -5,
                      marginTop: -5,
                      borderRadius: '50%',
                      background: color,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <FactLine
                  className="mt-2"
                  items={[
                    <span className="text-text-primary">{formatCompactMXN(ticket)}</span>,
                    <>
                      {formatNumber(r.total_contracts)} {es ? 'contratos' : 'contracts'}
                    </>,
                    <>
                      {es ? 'promedio del sector ' : 'sector average '}
                      {formatCompactMXN(norm)}
                    </>,
                    <span style={{ color }}>{mult(multiple)}</span>,
                  ]}
                />
              </li>
            )
          })}
        </ol>

        {/* Decade labels. Four equal quarters, so a flex row lands each glyph
            on its own tick without absolute positioning or edge correction. */}
        <div
          className="mx-2 mt-2 flex justify-between font-mono tabular-nums text-text-muted"
          style={{ fontSize: 11.5 }}
          aria-hidden="true"
        >
          {LOG_TICKS[lang].map((t) => (
            <span key={t} className="whitespace-nowrap">
              {t}
            </span>
          ))}
        </div>
        <p className="mx-2 mt-1 font-mono text-text-muted" style={{ fontSize: 11.5 }}>
          {es ? 'MDP por contrato · escala logarítmica' : 'MXN per contract · log scale'}
        </p>

        <span className="sr-only">
          {es
            ? `Ticket por contrato contra el promedio del sector. ${ranked
                .map(
                  ({ r, ticket, norm, multiple }) =>
                    `${r.vendor_name}: ${formatCompactMXN(ticket)} por contrato, promedio del sector ${formatCompactMXN(norm)}, ${mult(multiple)}`,
                )
                .join('. ')}.`
            : `Ticket per contract against the sector average. ${ranked
                .map(
                  ({ r, ticket, norm, multiple }) =>
                    `${r.vendor_name}: ${formatCompactMXN(ticket)} per contract, sector average ${formatCompactMXN(norm)}, ${mult(multiple)}`,
                )
                .join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F4 · the file ─────────────────────────────────────────────────────────

const F4_CHROME = {
  en: { eyebrow: 'FIGURE IV · THE FILE', title: 'What review said about the pattern’s biggest names' },
  es: { eyebrow: 'FIGURA IV · EL EXPEDIENTE', title: 'Qué dijo la revisión sobre los nombres mayores del patrón' },
}

/** Where a queue row's disposition puts it in the file. */
type Bucket = 'cleared' | 'confirmed' | 'open' | 'untouched'

const BUCKET_OF: Record<string, Bucket> = {
  false_positive: 'cleared',
  fp_excluded: 'cleared',
  dismissed: 'cleared',
  confirmed: 'confirmed',
  confirmed_corrupt: 'confirmed',
  needs_review: 'open',
  reviewing: 'open',
  reviewed: 'open',
  skipped: 'open',
}

const BUCKET_CHROME: Record<Bucket, { en: string; es: string; color: string }> = {
  cleared: {
    en: 'Cleared — a reviewer ruled the vendor out, or the calibration excludes its market',
    es: 'Descartados — un revisor los excluyó, o la calibración excluye su mercado',
    color: FIELD,
  },
  confirmed: {
    en: 'Confirmed on review',
    es: 'Confirmados tras la revisión',
    color: EMPHASIS,
  },
  open: {
    en: 'Looked at, no verdict yet',
    es: 'Revisados, aún sin veredicto',
    color: PARTIAL,
  },
  untouched: {
    en: 'No one has opened the file',
    es: 'Nadie ha abierto el expediente',
    color: FIELD,
  },
}

const BUCKET_ORDER: Bucket[] = ['cleared', 'open', 'confirmed', 'untouched']

function FileFigure({ body, lang }: { body: AriaPatternGroupsResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]

  const all = body.rows.flatMap((r) => r.vendors.map((v) => ({ v, row: r })))
  const ranked = [...all].sort((a, b) => b.v.total_value_mxn - a.v.total_value_mxn)
  const bucketOf = (status: string): Bucket => BUCKET_OF[status] ?? 'untouched'

  const buckets = BUCKET_ORDER.map((key) => {
    const members = all.filter(({ v }) => bucketOf(v.review_status) === key)
    return {
      key,
      count: members.length,
      value: members.reduce((s, { v }) => s + v.total_value_mxn, 0),
    }
  }).filter((b) => b.count > 0)
  const maxValue = Math.max(...buckets.map((b) => b.value), 1)
  const total = all.length
  const totalValue = all.reduce((s, { v }) => s + v.total_value_mxn, 0)

  // How far down the value ranking the first vendor that survived review sits.
  const firstStanding = ranked.findIndex(({ v }) => bucketOf(v.review_status) !== 'cleared')
  const clearedAtTop = firstStanding < 0 ? ranked.length : firstStanding
  const confirmed = ranked.filter(({ v }) => bucketOf(v.review_status) === 'confirmed')
  // The chapter's argument as one number: how much of the money at the top of
  // the pattern a reviewer has already ruled out.
  const cleared = buckets.find((b) => b.key === 'cleared')
  const clearedShare = totalValue > 0 ? (100 * (cleared?.value ?? 0)) / totalValue : 0

  return (
    <ChartCard
      source="/aria/patterns/P3/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct1(clearedShare),
        label: es
          ? `del dinero que acumulan los proveedores mayores del patrón ya fue revisado y descartado`
          : `of the money held by the pattern’s largest vendors has already been reviewed and ruled out`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `La población son los ${formatNumber(total)} mayores proveedores P3 de las ${formatNumber(body.rows.length)} direcciones donde el patrón concentra su dinero — ${formatCompactMXN(totalValue)} entre todos — agrupados por lo que dijo la revisión. La cima del patrón es una trampa de falsos positivos: los ${formatNumber(clearedAtTop)} mayores por valor están descartados, y ${formatNumber(cleared?.count ?? 0)} del grupo lo están, ${formatCompactMXN(cleared?.value ?? 0)} entre ellos. Esto no es un defecto del padrón sino del método: el patrón lee una ráfaga —pocos contratos, muy grandes, dentro de una ventana corta— y un contratista de megaproyecto la produce igual que una fachada. Por eso ningún proveedor descartado se nombra ni se dibuja en esta historia. Abajo van los que la revisión sí confirmó.`
          : `The population is the ${formatNumber(total)} largest P3 vendors at the ${formatNumber(body.rows.length)} addresses where the pattern concentrates its money — ${formatCompactMXN(totalValue)} between them — grouped by what review said. The top of the pattern is a false-positive trap: the ${formatNumber(clearedAtTop)} largest by value are cleared, and ${formatNumber(cleared?.count ?? 0)} of the group are, ${formatCompactMXN(cleared?.value ?? 0)} between them. That is not a flaw in the register but in the method: the pattern reads a burst — few contracts, very large, inside a short window — and a megaproject contractor produces one exactly as a front does. It is why no cleared vendor is named or drawn anywhere in this story. Below are the ones review did confirm.`
      }
    >
      <div className="px-2 pb-2">
        {buckets.map((b) => {
          const chrome = BUCKET_CHROME[b.key]
          return (
            <div key={b.key} className="border-b border-border py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="min-w-0 flex-1 text-text-primary" style={{ fontSize: 13, textWrap: 'pretty' }}>
                  {chrome[lang]}
                </span>
                <span
                  className="font-mono tabular-nums whitespace-nowrap text-text-primary"
                  style={{ fontSize: 12.5 }}
                >
                  {formatNumber(b.count)}
                </span>
              </div>

              <div className="relative mt-1.5" style={{ height: 10 }}>
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.max((100 * b.value) / maxValue, 0.6)}%`,
                    background: chrome.color,
                    opacity: 0.9,
                    borderRadius: 2,
                  }}
                  aria-hidden="true"
                />
              </div>

              <FactLine
                className="mt-1"
                items={[
                  <span className="text-text-primary">{formatCompactMXN(b.value)}</span>,
                  <>
                    {pct1(totalValue > 0 ? (100 * b.value) / totalValue : 0)}{' '}
                    {es ? 'del valor del grupo' : 'of the group’s value'}
                  </>,
                ]}
              />
            </div>
          )
        })}

        {confirmed.length > 0 && (
          <>
            <p
              className="pt-4 pb-2 font-mono uppercase text-text-muted"
              style={{ fontSize: 11, letterSpacing: '0.16em' }}
            >
              {es ? 'Confirmados tras la revisión' : 'Confirmed on review'}
            </p>
            <ul>
              {confirmed.map(({ v, row }) => (
                <li key={v.vendor_id} className="border-b border-border py-2">
                  <EntityIdentityChip
                    type="vendor"
                    id={v.vendor_id}
                    name={v.vendor_name}
                    riskScore={v.avg_risk_score ?? undefined}
                    ariaTier={
                      v.ips_tier === 1 || v.ips_tier === 2 || v.ips_tier === 3 || v.ips_tier === 4
                        ? v.ips_tier
                        : undefined
                    }
                    flags={v.in_ground_truth ? ['gt'] : undefined}
                    fullName
                  />
                  <FactLine
                    className="mt-1.5"
                    items={[
                      <span className="text-text-primary">{formatCompactMXN(v.total_value_mxn)}</span>,
                      <>
                        {formatNumber(v.total_contracts)} {es ? 'contratos' : 'contracts'}
                      </>,
                      <>
                        {pct1((v.top_institution_ratio ?? 0) * 100)}{' '}
                        {es ? 'a su comprador' : 'to its buyer'}
                      </>,
                    ]}
                  />
                  {/* The buyer's name gets its own wrapping line: the queue
                      files some of them at full length ("SERVICIO DE
                      ADMINISTRACIÓN Y ENAJENACIÓN DE BIENES"), and inside a
                      no-break fact cell that name ran past the card's
                      `overflow: hidden` edge at 390 (STORY_DAYS § 7). The
                      percentage above it stays unbreakable; the name yields. */}
                  <p
                    className="mt-1 font-mono text-text-muted"
                    style={{ fontSize: 11.5, textWrap: 'pretty' }}
                  >
                    {es ? 'Comprador principal: ' : 'Top buyer: '}
                    {row.label}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        <span className="sr-only">
          {es
            ? `Disposición de revisión de los ${formatNumber(total)} mayores proveedores P3. ${buckets
                .map((b) => `${BUCKET_CHROME[b.key].es}: ${formatNumber(b.count)}, ${formatCompactMXN(b.value)}`)
                .join('. ')}.`
            : `Review disposition of the ${formatNumber(total)} largest P3 vendors. ${buckets
                .map((b) => `${BUCKET_CHROME[b.key].en}: ${formatNumber(b.count)}, ${formatCompactMXN(b.value)}`)
                .join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F5 · where it lands ───────────────────────────────────────────────────

const F5_CHROME = {
  en: { eyebrow: 'FIGURE V · WHERE IT LANDS', title: 'The cohort, and everything anyone has done with it' },
  es: { eyebrow: 'FIGURA V · ADÓNDE ATERRIZA', title: 'La cohorte, y todo lo que alguien ha hecho con ella' },
}

function Queue({ body, lang }: { body: AriaPatternGroupsResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const k = body.cohort!
  const untouched = Math.max(k.total_vendors - k.reviewed, 0)
  const tier12 = k.tier1 + k.tier2

  return (
    <ChartCard
      source="/aria/patterns/P3/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(untouched),
        label: es
          ? `proveedores con patrón de intermediación que nadie ha abierto todavía`
          : `intermediary-pattern vendors no one has opened yet`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Las cuatro barras son disposiciones que se traslapan, no subconjuntos anidados: un proveedor puede estar documentado como caso sin haber pasado nunca por una revisión, y al revés. De los ${formatNumber(k.total_vendors)} proveedores de la cohorte, ${formatNumber(k.reviewed)} llevan alguna disposición —${pct1((100 * k.reviewed) / k.total_vendors)} de la cohorte— y ${formatNumber(k.confirmed)} quedaron confirmados. ${formatNumber(tier12)} están en los niveles 1 y 2, la banda que la cola prioriza; los otros ${formatNumber(k.tier3 + k.tier4)} están en los niveles 3 y 4. Esto es lo que ARIA puede decir por sí sola: quién encaja en la forma y quién ha sido visto. Lo que ninguna de estas cifras dice es si la diferencia entre lo que cobró el intermediario y lo que pagó al subcontratista fue renta o trabajo — eso vive en registros bancarios que están fuera del padrón.`
          : `The four bars are overlapping dispositions, not nested subsets: a vendor can be documented as a case without ever having passed a review, and the other way round. Of the cohort's ${formatNumber(k.total_vendors)} vendors, ${formatNumber(k.reviewed)} carry any disposition at all — ${pct1((100 * k.reviewed) / k.total_vendors)} of the cohort — and ${formatNumber(k.confirmed)} were confirmed. ${formatNumber(tier12)} sit at Tiers 1 and 2, the band the queue prioritises; the other ${formatNumber(k.tier3 + k.tier4)} sit at Tiers 3 and 4. This is what ARIA can say on its own: who fits the shape, and who has been looked at. What none of these counts says is whether the difference between what the intermediary charged and what it paid the subcontractor was rent or work — that lives in bank records the register does not hold.`
      }
    >
      <div className="px-2 pb-2">
        <FunnelStrip
          lang={lang}
          tiers={[
            {
              count: k.total_vendors,
              labelEn: `Vendors flagged under P3 intermediation, across ${formatCompactMXN(k.total_value_mxn)} of lifetime federal contracting.`,
              labelEs: `Proveedores marcados por intermediación P3, sobre ${formatCompactMXN(k.total_value_mxn)} de contratación federal de por vida.`,
              color: FIELD,
            },
            {
              count: k.in_ground_truth,
              labelEn: `Already documented corruption cases in RUBLI's ground truth.`,
              labelEs: `Ya son casos de corrupción documentados en la verdad-base de RUBLI.`,
              color: PARTIAL,
            },
            {
              count: k.reviewed,
              labelEn: `Given any review disposition at all — confirmed, cleared or in progress.`,
              labelEs: `Con alguna disposición de revisión — confirmado, descartado o en curso.`,
              color: PARTIAL,
            },
            {
              count: k.confirmed,
              labelEn: `Confirmed on review.`,
              labelEs: `Confirmados tras la revisión.`,
              color: EMPHASIS,
            },
          ]}
        />

        <Footline>
          {es ? 'Nivel 1 y 2 de ARIA: ' : 'ARIA Tier 1 and 2: '}
          <span className="whitespace-nowrap text-text-primary">{formatNumber(tier12)}</span>
          {es
            ? ` de ${formatNumber(k.total_vendors)} — nivel 1 ${formatNumber(k.tier1)}, nivel 2 ${formatNumber(k.tier2)}. El resto está en los niveles 3 y 4.`
            : ` of ${formatNumber(k.total_vendors)} — Tier 1 ${formatNumber(k.tier1)}, Tier 2 ${formatNumber(k.tier2)}. The rest sit at Tiers 3 and 4.`}
        </Footline>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveIntermediaryFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: IntermediaryFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure enables only the pulls it needs, and the five share query keys,
  // so the page issues four requests between them rather than one each.
  const needsSectors = kind === 'p3-sectors' || kind === 'p3-queue'
  const needsBuyers = kind === 'p3-flows' || kind === 'p3-file'
  const needsTier1 = kind === 'p3-ticket'

  const sectorsQ = useP3Sectors(needsSectors)
  const buyersQ = useP3Buyers(needsBuyers)
  const tier1Q = useP3Tier1(needsTier1)
  const normsQ = useSectorNorms(needsTier1)

  const chrome =
    kind === 'p3-sectors'
      ? F1_CHROME[lang]
      : kind === 'p3-flows'
        ? F2_CHROME[lang]
        : kind === 'p3-ticket'
          ? F3_CHROME[lang]
          : kind === 'p3-file'
            ? F4_CHROME[lang]
            : F5_CHROME[lang]

  if (needsSectors) {
    if (sectorsQ.isPending) return <Loading {...chrome} lang={lang} />
    if (sectorsQ.isError || !sectorsQ.data?.cohort || !sectorsQ.data.rows.length)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    if (kind === 'p3-queue') return <Queue body={sectorsQ.data} lang={lang} />
    return <Sectors body={sectorsQ.data} lang={lang} stage={stage} />
  }

  if (needsBuyers) {
    if (buyersQ.isPending) return <Loading {...chrome} lang={lang} />
    if (buyersQ.isError || !buyersQ.data?.cohort || !buyersQ.data.rows.length)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    if (kind === 'p3-file') return <FileFigure body={buyersQ.data} lang={lang} />
    // Every fetched vendor at every fetched buyer could be a cleared row, and
    // the card says so rather than drawing an empty ledger. Short-circuiting
    // on the first standing vendor keeps this off `channelsOf`, which the
    // figure runs anyway.
    const anyStanding = buyersQ.data.rows.some((r) => r.vendors.some((v) => !isCleared(v)))
    if (!anyStanding) return <Unavailable {...chrome} lang={lang} to="/aria" />
    return <Channels body={buyersQ.data} lang={lang} />
  }

  if (tier1Q.isPending || normsQ.isPending) return <Loading {...chrome} lang={lang} />
  if (tier1Q.isError || normsQ.isError || !tier1Q.data?.data.length || !normsQ.data?.data.length)
    return <Unavailable {...chrome} lang={lang} to="/aria" />
  return <Ticket rows={tier1Q.data.data} sectors={normsQ.data.data} lang={lang} />
}
