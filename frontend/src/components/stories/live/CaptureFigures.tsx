/**
 * CaptureFigures — the five live figures of «El edificio que construyó la
 * captura» (SD-04).
 *
 * The story had the arrow pointing the wrong way. It read P6 as a property of
 * a BUYER — "IMSS carries 401.8 billion pesos of capture-pattern contracting",
 * as though four hundred billion of the institute's budget were captured. The
 * register measures a property of a VENDOR: `top_institution_ratio`, never
 * below 0.80 across the whole P6 cohort and averaging 0.96, is how much of a
 * flagged supplier's OWN contracting goes to one buyer. So the honest sentence
 * is the mirror image: 3,468 suppliers send four fifths or more of everything
 * they sell to IMSS, and their combined lifetime federal contracting is 405
 * billion pesos.
 *
 * Both readings are in here, because the difference is the story. The
 * vendor-side reading (F1, F2) says the suppliers depend on the buyer. The
 * buyer-side reading, from `/capture/landscape`, says whether any one supplier
 * dominates the buyer — and at IMSS it does not. Two directions, one address.
 *
 * Two endpoints, five figures, one lazy chunk:
 *   F1 capture-imss           /aria/patterns/P6/institutions?vendors=6
 *   F2 capture-institutions   the same call + /capture/landscape
 *   F3 capture-intermediaries /aria/patterns/P3/institutions?group=sector
 *   F4 capture-estafa         /cases/estafa-maestra
 *   F5 capture-queue          /aria/patterns/{P6,P3}/institutions (cohorts)
 *
 * Rules inherited from SD-01..03: HTML owns every glyph, no label or value is
 * ever truncated, a number never breaks across lines, and a figure whose query
 * fails says so in one mono line rather than falling back to a typed number.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { caseLibraryApi } from '@/api/client'
import type { AriaPatternGroupRow, AriaPatternGroupsResponse } from '@/api/types'
import { AxisTicks, BAND_COLOR, shareBand, ThresholdRules } from '@/components/capture/captureAxis'
import { FunnelStrip } from '@/components/capture/FunnelStrip'
import { ChartCard } from '@/components/stories/InlineCharts'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  IMSS_SIGLAS,
  IMSS_VENDORS,
  rowFor,
  shareOfFlagged,
  TOP_INSTITUTIONS,
  useCaptureLandscape,
  usePatternGroups,
  useTwoPatternCohorts,
} from './useCaptureData'

export type CaptureFigureKind =
  | 'capture-imss'
  | 'capture-institutions'
  | 'capture-intermediaries'
  | 'capture-estafa'
  | 'capture-queue'

const EMPHASIS = 'var(--color-risk-critical)'
const ACCENT = 'var(--color-accent)'
const MUTED = 'var(--color-text-muted)'
/**
 * The two neutral inks come from the /captura band palette rather than being
 * redeclared here, so a recolour of the capture plates carries into the story.
 * `low` is the muted field a stage-0 bar is drawn in; `mid` is the anteroom
 * amber the partial-disposition bars use.
 */
const FIELD = BAND_COLOR.low
const PARTIAL = BAND_COLOR.mid

const STAMP = { en: 'LIVE · ARIA', es: 'EN VIVO · ARIA' } as const

const pct1 = (v: number) => `${v.toFixed(1)}%`

/** The case ch4 is about — verified in `procurement_scandals`, slug-stable. */
const ESTAFA_SLUG = 'estafa-maestra'

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
 * Every cell is its own unbreakable unit with a break opportunity between
 * cells, so the line wraps between facts and never inside one — "405.3B MXN"
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

// ── F1 · the address ──────────────────────────────────────────────────────

const F1_CHROME = {
  en: { eyebrow: 'FIGURE I · THE ADDRESS', title: 'Who depends on IMSS, and by how much' },
  es: { eyebrow: 'FIGURA I · LA DIRECCIÓN', title: 'Quién depende del IMSS, y cuánto' },
}

function ImssLedger({
  row,
  cohort,
  landscape,
  lang,
  stage = 3,
}: {
  row: AriaPatternGroupRow
  cohort: NonNullable<AriaPatternGroupsResponse['cohort']>
  landscape: ReturnType<typeof useCaptureLandscape>['data']
  lang: 'en' | 'es'
  stage?: number
}) {
  const es = lang === 'es'
  const c = F1_CHROME[lang]
  const clamped = Math.min(Math.max(stage, 0), 3)

  // The two thresholds are the /captura definition's own, read from the
  // endpoint — never hardcoded, so a recalibration moves the rules here too.
  const floor = landscape?.thresholds.floor_share_pct ?? 25
  const ceil = landscape?.thresholds.ceil_share_pct ?? 50

  const vendors = row.vendors.slice(0, IMSS_VENDORS)
  const shown = vendors.reduce((s, v) => s + v.total_value_mxn, 0)

  /**
   * Register entries whose display name collides with another row's.
   *
   * BAXTER is filed twice in the padrón under spellings that differ only by
   * the space after a comma, and `formatVendorName` — correctly — strips the
   * legal suffix from both and returns "Baxter" for each. Neither row carries
   * an RFC (structure A/B coverage is 0.1–15.7%), so the register cannot merge
   * them and neither can this figure. Rather than print what reads as one
   * supplier listed twice, the colliding rows carry the dossier number that
   * tells them apart, and the annotation says why there are two.
   */
  const twinIds = (() => {
    const byName = new Map<string, number[]>()
    for (const v of vendors) {
      const k = formatVendorName(v.vendor_name, 300)
      byName.set(k, [...(byName.get(k) ?? []), v.vendor_id])
    }
    return new Set([...byName.values()].filter((ids) => ids.length > 1).flat())
  })()

  // The buyer-side counter-reading. `monotonic_institution_ids` is the list of
  // buyers where one supplier climbed from under the floor to over the
  // ceiling; IMSS is not on it, and that absence is the figure's second half.
  const monotonic = landscape?.monotonic_institution_ids ?? []
  const imssClimbs = row.institution_id != null && monotonic.includes(row.institution_id)

  return (
    <ChartCard
      source="/aria/patterns/P6/institutions · /capture/landscape"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(row.total_value_mxn),
        label: es
          ? `en contratos federales acumulados de los ${formatNumber(row.vendor_count)} proveedores marcados que canalizan su trabajo al IMSS`
          : `in lifetime federal contracts held by the ${formatNumber(row.vendor_count)} flagged vendors that route their work through IMSS`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada barra es la dependencia de un proveedor: qué porción de SU PROPIA contratación federal va al IMSS. No es la porción del presupuesto del IMSS que ese proveedor se lleva — la flecha apunta del proveedor al comprador, y ese es el sentido que mide el patrón P6. Las reglas punteadas son el piso (${floor}%) y el techo (${ceil}%) de la definición de captura de /captura, leídos del endpoint. Los seis mayores por valor de los ${formatNumber(row.vendor_count)} anclados en el IMSS. En el otro sentido la lectura se invierte: ${
              imssClimbs
                ? 'el IMSS sí aparece entre los compradores donde un proveedor escaló del piso al techo.'
                : `el IMSS no aparece entre los ${formatNumber(monotonic.length)} compradores donde un solo proveedor escaló del piso al techo — ningún proveedor domina al IMSS, son los proveedores los que dependen de él.`
            }${
              twinIds.size
                ? ` Dos filas llevan el mismo nombre: están inscritas en el padrón con grafías que solo difieren en la puntuación, y ninguna de las dos trae RFC — la cobertura de RFC en los años en que se registraron va de 0.1% a 15.7% —, así que el padrón no puede fusionarlas y esta figura tampoco. Se distinguen por su número de registro, su valor y su número de contratos.`
                : ''
            }`
          : `Each bar is one vendor’s dependence: the share of ITS OWN federal contracting that goes to IMSS. It is not the share of the IMSS budget that vendor takes — the arrow runs from supplier to buyer, and that is the direction the P6 pattern measures. The dashed rules are the floor (${floor}%) and ceiling (${ceil}%) of the /captura capture definition, read from the endpoint. These are the six largest by value of the ${formatNumber(row.vendor_count)} anchored at IMSS. Read the other way the finding reverses: ${
              imssClimbs
                ? 'IMSS does appear among the buyers where one supplier climbed from the floor to the ceiling.'
                : `IMSS is not among the ${formatNumber(monotonic.length)} buyers where a single supplier climbed from the floor to the ceiling — no vendor dominates IMSS; the vendors depend on it.`
            }${
              twinIds.size
                ? ` Two rows carry the same name: they are filed in the padrón under spellings that differ only in punctuation, and neither one carries an RFC — coverage across the years they were registered runs from 0.1% to 15.7% — so the register cannot merge them and this figure will not either. They are told apart by their register number, their value and their contract count.`
                : ''
            }`
      }
    >
      <div className="px-2 pb-2">
        <ol>
          {vendors.map((v, i) => {
            const ratio = (v.top_institution_ratio ?? 0) * 100
            const band = shareBand(ratio, floor, ceil)
            const color = clamped >= 1 ? BAND_COLOR[band] : FIELD
            const tier = v.ips_tier
            return (
              <li key={v.vendor_id} className="border-b border-border py-2.5">
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
                      id={v.vendor_id}
                      name={v.vendor_name}
                      riskScore={v.avg_risk_score ?? undefined}
                      ariaTier={tier === 1 || tier === 2 || tier === 3 || tier === 4 ? tier : undefined}
                      flags={v.in_ground_truth ? ['gt'] : undefined}
                      fullName
                    />
                    {twinIds.has(v.vendor_id) && (
                      <span
                        className="mt-0.5 block font-mono tabular-nums whitespace-nowrap text-text-muted"
                        style={{ fontSize: 11 }}
                      >
                        {es ? `Registro n.º ${v.vendor_id}` : `Register entry no. ${v.vendor_id}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative mt-2" style={{ height: 14, marginLeft: 26 }}>
                  <div
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                    style={{ height: 10, background: 'var(--color-surface-2)', borderRadius: 2 }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2"
                    style={{
                      width: `${Math.min(ratio, 100)}%`,
                      height: 10,
                      background: color,
                      borderRadius: 2,
                      transition: 'background-color 240ms ease',
                    }}
                    aria-hidden="true"
                  />
                  {clamped >= 1 && (
                    <ThresholdRules floor={floor} ceil={ceil} lang={lang} />
                  )}
                </div>

                {/* Value and contract count are NOT staged: they are what tells
                    two register entries of the same name apart, so they belong
                    on the row from the first beat. The dependence share stays
                    the stage-2 reveal — the bar already carries it as length. */}
                <FactLine
                  className="mt-1.5"
                  style={{ paddingLeft: 26 }}
                  items={[
                    clamped >= 2 ? (
                      <span style={{ color }}>
                        {pct1(ratio)} {es ? 'al IMSS' : 'to IMSS'}
                      </span>
                    ) : null,
                    <span className="text-text-primary">{formatCompactMXN(v.total_value_mxn)}</span>,
                    <>
                      {formatNumber(v.total_contracts)} {es ? 'contratos' : 'contracts'}
                    </>,
                  ]}
                />
              </li>
            )
          })}
        </ol>

        <div style={{ marginLeft: 26 }}>
          <AxisTicks className="mt-2" />
        </div>

        {clamped >= 3 && (
          <p
            className="w-full pt-4 font-mono"
            style={{ fontSize: 12, lineHeight: 1.6, color: MUTED, textWrap: 'pretty' }}
          >
            <span className="whitespace-nowrap text-text-primary">
              {formatCompactMXN(shown)}
            </span>{' '}
            {es
              ? `de los seis mayores, sobre ${formatCompactMXN(row.total_value_mxn)} de los ${formatNumber(row.vendor_count)} proveedores anclados aquí, dentro de una cohorte P6 de `
              : `from the six largest, out of ${formatCompactMXN(row.total_value_mxn)} across the ${formatNumber(row.vendor_count)} vendors anchored here, inside a P6 cohort of `}
            <span className="whitespace-nowrap">{formatNumber(cohort.total_vendors)}</span>
            {es ? ' proveedores.' : ' vendors.'}
          </p>
        )}

        <span className="sr-only">
          {es
            ? `Dependencia del IMSS de los seis proveedores P6 más grandes. ${vendors
                .map((v) => `${v.vendor_name}${twinIds.has(v.vendor_id) ? `, registro n.º ${v.vendor_id}` : ''}: ${pct1((v.top_institution_ratio ?? 0) * 100)} de su contratación, ${formatCompactMXN(v.total_value_mxn)}, ${formatNumber(v.total_contracts)} contratos`)
                .join('. ')}.`
            : `IMSS dependence of the six largest P6 vendors. ${vendors
                .map((v) => `${v.vendor_name}${twinIds.has(v.vendor_id) ? `, register entry no. ${v.vendor_id}` : ''}: ${pct1((v.top_institution_ratio ?? 0) * 100)} of its contracting, ${formatCompactMXN(v.total_value_mxn)}, ${formatNumber(v.total_contracts)} contracts`)
                .join('. ')}.`}
        </span>
      </div>
    </ChartCard>
  )
}

// ── F2 · the seven addresses ──────────────────────────────────────────────

const F2_CHROME = {
  en: { eyebrow: 'FIGURE II · SEVEN ADDRESSES', title: 'Where the flagged vendors are anchored' },
  es: { eyebrow: 'FIGURA II · LAS SIETE DIRECCIONES', title: 'Dónde están anclados los proveedores marcados' },
}

function Institutions({
  body,
  landscape,
  lang,
}: {
  body: AriaPatternGroupsResponse
  landscape: ReturnType<typeof useCaptureLandscape>['data']
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F2_CHROME[lang]
  const cohort = body.cohort!
  const rows = body.rows.slice(0, TOP_INSTITUTIONS)
  const shown = rows.reduce((s, r) => s + r.total_value_mxn, 0)
  // Everything the seven do NOT hold, drawn as its own bar so the ranking is
  // never mistaken for the whole cohort.
  const others = Math.max(cohort.total_value_mxn - shown, 0)
  const mean = rows.length ? shown / rows.length : 0
  const max = Math.max(...rows.map((r) => r.total_value_mxn), others, 1)
  const leader = rows[0]

  const bars = [
    ...rows.map((r) => ({ row: r, value: r.total_value_mxn, isOthers: false })),
    {
      row: null,
      value: others,
      isOthers: true,
    },
  ]

  return (
    <ChartCard
      source="/aria/patterns/P6/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatCompactMXN(shown),
        label: es
          ? `de los ${formatCompactMXN(cohort.total_value_mxn)} de la cohorte, en los ${rows.length} compradores con más proveedores anclados`
          : `of the cohort’s ${formatCompactMXN(cohort.total_value_mxn)}, at the ${rows.length} buyers with the most vendors anchored to them`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Cada barra suma la contratación federal acumulada de los proveedores P6 cuyo comprador principal es esa institución — el valor viaja con el proveedor, no sale del presupuesto de la institución. La regla punteada es el promedio de los ${rows.length} (${formatCompactMXN(mean)}); ${leader.label} corre ${(leader.total_value_mxn / (mean || 1)).toFixed(1)}× eso. La barra «otros» es el resto de la cohorte, repartido entre el resto de los compradores. Los nombres son las siglas con que la cola archiva al comprador: PEMEX reúne tres registros (corporativo, Refinación, Exploración) y la ficha abre el mayor. El embudo de abajo lee en el otro sentido y cuenta instituciones, no proveedores.`
          : `Each bar sums the lifetime federal contracting of the P6 vendors whose main buyer is that institution — the value travels with the vendor; it does not come out of the institution’s budget. The dashed rule is the ${rows.length}-buyer average (${formatCompactMXN(mean)}); ${leader.label} runs ${(leader.total_value_mxn / (mean || 1)).toFixed(1)}× it. The “others” bar is the rest of the cohort, spread across every other buyer. The names are the acronyms the queue files a buyer under: PEMEX gathers three registrations (corporate, Refinación, Exploración) and the chip opens the largest. The funnel below reads the other way and counts institutions, not vendors.`
      }
    >
      <div className="px-2 pb-2">
        {bars.map((b, i) => {
          const label = b.isOthers ? (es ? 'Otros compradores' : 'All other buyers') : b.row!.label
          const isLead = i === 0
          const color = b.isOthers ? FIELD : isLead ? EMPHASIS : ACCENT
          return (
            <div key={b.isOthers ? 'others' : b.row!.key} className="border-b border-border py-2.5">
              <div className="flex items-start gap-2.5">
                {!b.isOthers && b.row!.institution_id != null ? (
                  <div className="min-w-0 flex-1">
                    <EntityIdentityChip
                      type="institution"
                      id={b.row!.institution_id}
                      name={b.row!.institution_name ?? label}
                      fullName
                    />
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 text-text-primary" style={{ fontSize: 13 }}>
                    {label}
                  </span>
                )}
              </div>

              <div className="relative mt-2" style={{ height: 12 }}>
                <div
                  className="absolute top-1/2 left-0 -translate-y-1/2"
                  style={{
                    width: `${(100 * b.value) / max}%`,
                    height: 10,
                    background: color,
                    opacity: b.isOthers ? 0.55 : 1,
                    borderRadius: 2,
                  }}
                  aria-hidden="true"
                />
                {/* The mean rule sits in the same coordinate space as the bars. */}
                <div
                  className="absolute inset-y-0 w-px"
                  style={{
                    left: `${(100 * mean) / max}%`,
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, #71717a 0 3px, transparent 3px 7px)',
                    opacity: 0.5,
                  }}
                  aria-hidden="true"
                />
              </div>

              <FactLine
                className="mt-1.5"
                items={[
                  <span className="text-text-primary">{formatCompactMXN(b.value)}</span>,
                  !b.isOthers && (
                    <>
                      {formatNumber(b.row!.vendor_count)} {es ? 'proveedores' : 'vendors'}
                    </>
                  ),
                  !b.isOthers && (
                    <>
                      {pct1(shareOfFlagged(b.row!))} {es ? 'de lo marcado aquí' : 'of what ARIA flags here'}
                    </>
                  ),
                ]}
              />
            </div>
          )
        })}

        <p className="pt-3 pb-1 font-mono uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
          {es ? 'En el otro sentido — instituciones' : 'The other direction — institutions'}
        </p>
        {landscape ? (
          <FunnelStrip
            lang={lang}
            tiers={[
              {
                count: landscape.qualifying_count,
                labelEn: `Federal buyers with enough recorded spend to measure a top-supplier share.`,
                labelEs: `Compradores federales con gasto registrado suficiente para medir la porción de su mayor proveedor.`,
                color: FIELD,
              },
              {
                count: landscape.captured_now_count,
                labelEn: `Buyers where one supplier already holds at least ${landscape.thresholds.ceil_share_pct}% of the recorded total.`,
                labelEs: `Compradores donde un solo proveedor ya tiene al menos ${landscape.thresholds.ceil_share_pct}% del total registrado.`,
                color: EMPHASIS,
              },
              {
                count: landscape.monotonic_institution_ids.length,
                labelEn: `Buyers where that share climbed from under ${landscape.thresholds.floor_share_pct}% to over ${landscape.thresholds.ceil_share_pct}% across the window — the full capture trajectory.`,
                labelEs: `Compradores donde esa porción subió de menos de ${landscape.thresholds.floor_share_pct}% a más de ${landscape.thresholds.ceil_share_pct}% en la ventana — la trayectoria completa de captura.`,
                color: EMPHASIS,
              },
            ]}
          />
        ) : (
          <p className="py-4 font-mono text-[12px] text-text-muted">
            {es ? 'Censo de instituciones no disponible.' : 'Institution census unavailable.'}
          </p>
        )}
      </div>
    </ChartCard>
  )
}

// ── F3 · the toll booths ──────────────────────────────────────────────────

const F3_CHROME = {
  en: { eyebrow: 'FIGURE III · THE TOLL BOOTHS', title: 'Where intermediaries take the biggest cut of flagged spend' },
  es: { eyebrow: 'FIGURA III · LAS CASETAS', title: 'Dónde los intermediarios se llevan la mayor tajada de lo marcado' },
}

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

/**
 * A sector whose flagged base is this thin cannot carry a share statement: one
 * vendor moves it by whole percentage points. The rows stay — dropping them
 * would hide the tail — but they are drawn muted and named in the caption.
 */
const THIN_BASE_MXN = 50e9

function Intermediaries({ body, lang }: { body: AriaPatternGroupsResponse; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const c = F3_CHROME[lang]
  const cohort = body.cohort!

  const rows = [...body.rows]
    .map((r) => ({ row: r, share: shareOfFlagged(r), thin: r.flagged_value_mxn < THIN_BASE_MXN }))
    .sort((a, b) => b.share - a.share)
  const solid = rows.filter((r) => !r.thin)
  const lead = solid[0]
  const health = rows.find((r) => r.row.label === 'salud')
  const max = Math.max(...rows.map((r) => r.share), 1)
  const thinNames = rows
    .filter((r) => r.thin)
    .map((r) => SECTOR_LABEL[r.row.label]?.[lang] ?? r.row.label)

  return (
    <ChartCard
      source="/aria/patterns/P3/institutions?group=sector"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: pct1(lead.share),
        label: es
          ? `de todo lo que ARIA marca en ${SECTOR_LABEL[lead.row.label]?.es ?? lead.row.label} corre por intermediarios`
          : `of everything ARIA flags in ${SECTOR_LABEL[lead.row.label]?.en ?? lead.row.label} runs through intermediaries`,
        color: SECTOR_COLORS[lead.row.label] ?? EMPHASIS,
      }}
      annotation={
        es
          ? `Cada barra es la porción del gasto marcado de un sector que corre por proveedores con patrón P3 — intermediarios que ganan el contrato y subcontratan el trabajo. El denominador es todo lo que ARIA marca en ese sector, bajo cualquier patrón, del mismo endpoint: ${formatCompactMXN(cohort.total_value_mxn)} de P3 sobre el total marcado de cada sector.${
              health
                ? ` ${SECTOR_LABEL[lead.row.label]?.es ?? lead.row.label} corre ${(lead.share / (health.share || 1)).toFixed(1)}× la porción de salud (${pct1(health.share)}).`
                : ''
            }${
              thinNames.length
                ? ` ${thinNames.join(' y ')} ${thinNames.length > 1 ? 'aparecen' : 'aparece'} en gris: su base marcada es demasiado pequeña para sostener una porción — un solo proveedor la mueve puntos enteros.`
                : ''
            }`
          : `Each bar is the share of a sector’s flagged spend that runs through P3 vendors — intermediaries that win the contract and subcontract the work. The denominator is everything ARIA flags in that sector, under any pattern, from the same endpoint: ${formatCompactMXN(cohort.total_value_mxn)} of P3 against each sector’s flagged total.${
              health
                ? ` ${SECTOR_LABEL[lead.row.label]?.en ?? lead.row.label} runs ${(lead.share / (health.share || 1)).toFixed(1)}× the share in health (${pct1(health.share)}).`
                : ''
            }${
              thinNames.length
                ? ` ${thinNames.join(' and ')} ${thinNames.length > 1 ? 'are' : 'is'} drawn in grey: their flagged base is too small to carry a share — one vendor moves it by whole points.`
                : ''
            }`
      }
    >
      <div className="px-2 pb-2">
        {rows.map(({ row, share, thin }) => {
          const name = SECTOR_LABEL[row.label]?.[lang] ?? row.label
          const color = thin ? FIELD : SECTOR_COLORS[row.label] ?? ACCENT
          return (
            <div key={row.key} className="border-b border-border py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-text-primary" style={{ fontSize: 13 }}>
                  {name}
                </span>
                <span
                  className="font-mono tabular-nums whitespace-nowrap"
                  style={{ fontSize: 12.5, color: thin ? MUTED : 'var(--color-text-primary)' }}
                >
                  {pct1(share)}
                </span>
              </div>

              <div className="relative mt-1.5" style={{ height: 10 }}>
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${(100 * share) / max}%`,
                    background: color,
                    opacity: thin ? 0.45 : 0.92,
                    borderRadius: 2,
                  }}
                  aria-hidden="true"
                />
              </div>

              <FactLine
                className="mt-1"
                items={[
                  <span className="text-text-primary">{formatCompactMXN(row.total_value_mxn)}</span>,
                  <>
                    {formatNumber(row.vendor_count)} {es ? 'proveedores P3' : 'P3 vendors'}
                  </>,
                  <>
                    {es ? 'de ' : 'of '}
                    {formatCompactMXN(row.flagged_value_mxn)} {es ? 'marcados' : 'flagged'}
                  </>,
                ]}
              />
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

// ── F4 · the blueprint ────────────────────────────────────────────────────

const F4_CHROME = {
  en: { eyebrow: 'FIGURE IV · THE BLUEPRINT', title: 'The case Mexico documented, and the population that matches its shape' },
  es: { eyebrow: 'FIGURA IV · EL PLANO', title: 'El caso que México documentó, y la población que repite su forma' },
}

/** The `LegalStatus` union as the case library stores it. */
const LEGAL_STATUS_LABEL: Record<string, { en: string; es: string }> = {
  investigation: { en: 'Under investigation', es: 'En investigación' },
  prosecuted: { en: 'Prosecuted', es: 'Llevada a juicio' },
  convicted: { en: 'Convicted', es: 'Con sentencia condenatoria' },
  acquitted: { en: 'Acquitted', es: 'Absuelta' },
  dismissed: { en: 'Dismissed', es: 'Sobreseída' },
  impunity: { en: 'No one charged', es: 'Sin imputados' },
  unresolved: { en: 'Unresolved', es: 'Sin resolver' },
  ongoing: { en: 'Ongoing', es: 'En curso' },
  settled: { en: 'Settled', es: 'Conciliada' },
}

function Estafa({
  scandal,
  p3,
  lang,
}: {
  scandal: Awaited<ReturnType<typeof caseLibraryApi.getBySlug>>
  p3: AriaPatternGroupsResponse
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F4_CHROME[lang]
  const cohort = p3.cohort!
  const caseName = es ? scandal.name_es : scandal.name_en
  const low = scandal.amount_mxn_low ?? 0
  const high = scandal.amount_mxn_high ?? null
  const multiple = low > 0 ? cohort.total_value_mxn / low : 0
  const status = scandal.legal_status ? LEGAL_STATUS_LABEL[scandal.legal_status] : undefined
  const statusText = status ? status[lang] : scandal.legal_status
  // The record's own note on how the prosecution ended. It is the chapter's
  // correction — the story said Mexico convicted on this case — so it is
  // printed verbatim rather than paraphrased.
  const note = scandal.legal_status_note

  const bars = [
    {
      key: 'case',
      label: caseName,
      value: low,
      color: MUTED,
      detail: es
        ? `${scandal.contract_year_start}–${scandal.contract_year_end} · ${statusText}`
        : `${scandal.contract_year_start}–${scandal.contract_year_end} · ${statusText}`,
    },
    {
      key: 'p3',
      label: es ? 'Cohorte P3 en la cola de hoy' : 'The P3 cohort in today’s queue',
      value: cohort.total_value_mxn,
      color: EMPHASIS,
      detail: es
        ? `${formatNumber(cohort.total_vendors)} proveedores · ${formatNumber(cohort.in_ground_truth)} ya documentados`
        : `${formatNumber(cohort.total_vendors)} vendors · ${formatNumber(cohort.in_ground_truth)} already documented`,
    },
  ]
  const max = Math.max(...bars.map((b) => b.value), 1)

  return (
    <ChartCard
      source="/cases/${ESTAFA_SLUG} · /aria/patterns/P3/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: `${multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}×`,
        label: es
          ? `el tamaño del caso documentado, en la contratación de la cohorte P3 que hoy repite su estructura`
          : `the documented case’s size, in the contracting of the P3 cohort that repeats its structure today`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `El expediente es el que RUBLI tiene verificado en su biblioteca de casos: ${caseName}, ${scandal.contract_year_start}–${scandal.contract_year_end}, ${formatCompactMXN(low)}${high ? ` a ${formatCompactMXN(high)}` : ''}, estado legal «${statusText}»${note ? ` — ${note}` : ''}. La comparación es de estructura, no de culpa: los ${formatNumber(cohort.total_vendors)} proveedores P3 comparten la forma —ganar el contrato y subcontratar la entrega— no una sentencia. ${formatNumber(cohort.in_ground_truth)} de ellos ya figuran como casos documentados.`
          : `The file is the one RUBLI holds verified in its case library: ${caseName}, ${scandal.contract_year_start}–${scandal.contract_year_end}, ${formatCompactMXN(low)}${high ? ` to ${formatCompactMXN(high)}` : ''}, legal status “${statusText}”${note ? ` — ${note}` : ''}. The comparison is of structure, not of guilt: the ${formatNumber(cohort.total_vendors)} P3 vendors share the shape — win the contract, subcontract the delivery — not a verdict. ${formatNumber(cohort.in_ground_truth)} of them already appear as documented cases.`
      }
    >
      <div className="px-2 pb-2">
        <div className="pb-3">
          <EntityIdentityChip type="case" id={scandal.slug} name={caseName} fullName />
        </div>

        {bars.map((b) => (
          <div key={b.key} className="border-b border-border py-2.5">
            <span className="block text-text-primary" style={{ fontSize: 13 }}>
              {b.label}
            </span>
            <div className="relative mt-1.5" style={{ height: 12 }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${Math.max((100 * b.value) / max, 0.6)}%`,
                  background: b.color,
                  borderRadius: 2,
                }}
                aria-hidden="true"
              />
            </div>
            <FactLine
              className="mt-1"
              items={[
                <span className="text-text-primary">{formatCompactMXN(b.value)}</span>,
                b.detail,
              ]}
            />
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

// ── F5 · the keys ─────────────────────────────────────────────────────────

const F5_CHROME = {
  en: { eyebrow: 'FIGURE V · THE KEYS', title: 'What the queue holds, and what anyone has opened' },
  es: { eyebrow: 'FIGURA V · LAS LLAVES', title: 'Lo que guarda la cola, y lo que alguien ha abierto' },
}

function Queue({
  p6,
  p3,
  lang,
}: {
  p6: AriaPatternGroupsResponse
  p3: AriaPatternGroupsResponse
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const c = F5_CHROME[lang]
  const a = p6.cohort!
  const b = p3.cohort!

  const total = a.total_vendors + b.total_vendors
  const reviewed = a.reviewed + b.reviewed
  const inGt = a.in_ground_truth + b.in_ground_truth
  const confirmed = a.confirmed + b.confirmed
  const tier12 = a.tier1 + a.tier2 + b.tier1 + b.tier2
  const untouched = Math.max(total - reviewed, 0)
  const value = a.total_value_mxn + b.total_value_mxn

  return (
    <ChartCard
      source="/aria/patterns/P6/institutions · /aria/patterns/P3/institutions"
      eyebrow={c.eyebrow}
      title={c.title}
      lang={lang}
      stamp={STAMP}
      anchor={{
        value: formatNumber(untouched),
        label: es
          ? `proveedores marcados bajo los dos patrones que nadie ha abierto todavía`
          : `vendors flagged under the two patterns that no one has opened yet`,
        color: EMPHASIS,
      }}
      annotation={
        es
          ? `Los dos patrones de esta historia juntos: ${formatNumber(a.total_vendors)} con captura P6 y ${formatNumber(b.total_vendors)} con intermediación P3, ${formatNumber(total)} en total, sobre ${formatCompactMXN(value)} de contratación federal de por vida. Las tres barras de abajo son disposiciones que se traslapan, no subconjuntos anidados: un proveedor puede estar documentado sin haber pasado por revisión. ${formatNumber(tier12)} están en los niveles 1 y 2 de ARIA, la banda que la cola prioriza.`
          : `The story’s two patterns together: ${formatNumber(a.total_vendors)} under P6 capture and ${formatNumber(b.total_vendors)} under P3 intermediation, ${formatNumber(total)} in all, across ${formatCompactMXN(value)} of lifetime federal contracting. The three bars below are overlapping dispositions, not nested subsets: a vendor can be documented without ever having passed a review. ${formatNumber(tier12)} sit at ARIA Tiers 1 and 2, the band the queue prioritises.`
      }
    >
      <div className="px-2 pb-2">
        <FunnelStrip
          lang={lang}
          tiers={[
            {
              count: total,
              labelEn: `Vendors flagged under P6 capture or P3 intermediation.`,
              labelEs: `Proveedores marcados por captura P6 o intermediación P3.`,
              color: FIELD,
            },
            {
              count: inGt,
              labelEn: `Already documented corruption cases in RUBLI's ground truth.`,
              labelEs: `Ya son casos de corrupción documentados en la verdad-base de RUBLI.`,
              color: PARTIAL,
            },
            {
              count: reviewed,
              labelEn: `Given any review disposition at all — confirmed, dismissed or in progress.`,
              labelEs: `Con alguna disposición de revisión — confirmado, descartado o en curso.`,
              color: PARTIAL,
            },
            {
              count: confirmed,
              labelEn: `Confirmed on review.`,
              labelEs: `Confirmados tras la revisión.`,
              color: EMPHASIS,
            },
          ]}
        />

        <p
          className="w-full pt-4 font-mono"
          style={{ fontSize: 12, lineHeight: 1.6, color: MUTED, textWrap: 'pretty' }}
        >
          {es ? 'Nivel 1 y 2 de ARIA: ' : 'ARIA Tier 1 and 2: '}
          <span className="whitespace-nowrap text-text-primary">{formatNumber(tier12)}</span>
          {es
            ? ` de los ${formatNumber(total)}. El resto está en los niveles 3 y 4.`
            : ` of ${formatNumber(total)}. The rest sit at Tiers 3 and 4.`}
        </p>
      </div>
    </ChartCard>
  )
}

// ── entry point ───────────────────────────────────────────────────────────

export default function LiveCaptureFigure({
  kind,
  lang,
  stage = 3,
}: {
  kind: CaptureFigureKind
  lang: 'en' | 'es'
  /** F1 only — the scroll beat (0–3). */
  stage?: number
}) {
  // Each figure enables only the pulls it needs, and the five share query keys,
  // so the page issues three requests between them rather than one each.
  const needsP6 = kind === 'capture-imss' || kind === 'capture-institutions'
  const needsP3Sectors = kind === 'capture-intermediaries'
  const needsLandscape = needsP6
  const needsCohorts = kind === 'capture-queue'
  const needsEstafa = kind === 'capture-estafa'

  const p6 = usePatternGroups('P6', {
    limit: TOP_INSTITUTIONS,
    vendors: IMSS_VENDORS,
    enabled: needsP6,
  })
  const p3Sectors = usePatternGroups('P3', { group: 'sector', limit: 12, enabled: needsP3Sectors })
  const landscape = useCaptureLandscape(needsLandscape)
  const cohorts = useTwoPatternCohorts(needsCohorts || needsEstafa)
  const scandal = useQuery({
    queryKey: ['case-detail', ESTAFA_SLUG],
    queryFn: () => caseLibraryApi.getBySlug(ESTAFA_SLUG),
    staleTime: 60 * 60 * 1000,
    enabled: needsEstafa,
  })

  const chrome =
    kind === 'capture-imss'
      ? F1_CHROME[lang]
      : kind === 'capture-institutions'
        ? F2_CHROME[lang]
        : kind === 'capture-intermediaries'
          ? F3_CHROME[lang]
          : kind === 'capture-estafa'
            ? F4_CHROME[lang]
            : F5_CHROME[lang]

  if (kind === 'capture-imss' || kind === 'capture-institutions') {
    // The landscape is a second opinion, not a dependency: the ledger and the
    // ranking both read without it, so a slow census never blocks the figure.
    if (p6.isPending) return <Loading {...chrome} lang={lang} />
    if (p6.isError || !p6.data?.cohort || !p6.data.rows.length)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    if (kind === 'capture-institutions')
      return <Institutions body={p6.data} landscape={landscape.data} lang={lang} />
    const imss = rowFor(p6.data, IMSS_SIGLAS)
    if (!imss || !imss.vendors.length) return <Unavailable {...chrome} lang={lang} to="/aria" />
    return (
      <ImssLedger
        row={imss}
        cohort={p6.data.cohort}
        landscape={landscape.data}
        lang={lang}
        stage={stage}
      />
    )
  }

  if (kind === 'capture-intermediaries') {
    if (p3Sectors.isPending) return <Loading {...chrome} lang={lang} />
    if (p3Sectors.isError || !p3Sectors.data?.cohort || !p3Sectors.data.rows.length)
      return <Unavailable {...chrome} lang={lang} to="/aria" />
    return <Intermediaries body={p3Sectors.data} lang={lang} />
  }

  if (kind === 'capture-estafa') {
    if (scandal.isPending || cohorts.isPending) return <Loading {...chrome} lang={lang} />
    if (scandal.isError || !scandal.data || !cohorts.p3?.cohort)
      return <Unavailable {...chrome} lang={lang} to="/cases" />
    return <Estafa scandal={scandal.data} p3={cohorts.p3} lang={lang} />
  }

  if (cohorts.isPending) return <Loading {...chrome} lang={lang} />
  if (cohorts.isError || !cohorts.p6?.cohort || !cohorts.p3?.cohort)
    return <Unavailable {...chrome} lang={lang} to="/aria" />
  return <Queue p6={cohorts.p6} p3={cohorts.p3} lang={lang} />
}
