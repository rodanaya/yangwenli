/**
 * CaptureFilm — § LA PELÍCULA · Plate XIV·a (the centerpiece)
 *
 * The 13 monotonic captures as a small-multiples grid of Reuters threshold-
 * crossing trajectories, faceted into "still captive today" vs "rose and fell"
 * on a shared 0–100% y-domain. One documented climber leads as the enlarged
 * Exhibit A (shown intimately before the wall — the "exhibit before argument"
 * graft); ASIPONA is the collapse exemplar in the lower row. GT/Tier seals
 * render AT REST from the folded `aria` field; clicks add the money ledger.
 *
 * DESIGNUS «LA LÍNEA QUE NADIE CRUZA SOLO» (precedent-first, 88/100).
 */

import { useMemo } from 'react'
import { useQueryStates, parseAsString, parseAsStringLiteral } from 'nuqs'
import {
  type CaptureItem,
  type CaptureTopResponse,
  type CaptureLandscapeResponse,
} from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { RISK_TEXT_COLORS } from '@/lib/constants'
import { formatEntityName } from '@/lib/entity/format'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { CaptureTrajectory } from './CaptureTrajectory'
import { CaptureExpand } from './CaptureExpand'
import { captureCaseFor } from '@/lib/capture-cases'

// Documented + still-held climbers, in lead preference (EDENRED then TOKA).
const LEAD_PREFERENCE = [44372, 102627]

type SortKey = 'cruce' | 'pico' | 'valor' | 'vigencia'
const SORT_KEYS: SortKey[] = ['cruce', 'pico', 'valor', 'vigencia']
const SORT_LABEL: Record<SortKey, { es: string; en: string }> = {
  cruce: { es: 'Año de cruce', en: 'Crossing year' },
  pico: { es: 'Pico', en: 'Peak' },
  valor: { es: 'MXN acumulado', en: 'Cumulative MXN' },
  vigencia: { es: 'Persistencia', en: 'Persistence' },
}

/** The URL key for one (institution, vendor) pair — the ?open= value. */
const keyOf = (c: CaptureItem) => `${c.institution_id}-${c.vendor_id}`

/** The panel a card's disclosure button controls (aria-controls target). */
const panelId = (c: CaptureItem) => `recibos-${c.institution_id}-${c.vendor_id}`

/** Short affordance on a card; the lead exhibit keeps its longer sentence. */
const receiptsLabel = (lang: 'en' | 'es', expanded: boolean) =>
  lang === 'en'
    ? expanded
      ? 'receipts ↑'
      : 'receipts ↓'
    : expanded
      ? 'recibos ↑'
      : 'recibos ↓'

/**
 * Exhibit A's standfirst.
 *
 * Three corrections from the panel: the latest share is "as of <year>", not
 * "today" (six of the thirteen series end in 2023 or 2024); the money is the
 * window total, not the share above the ceiling; and when the peak year IS the
 * latest year the two clauses collapse, because "peaked 70.01% ... holds 70.01%
 * today" printed the same number twice 300px apart.
 */
const leadSentence = (c: CaptureItem, holds: boolean, lang: 'en' | 'es') => {
  const peak = c.peak_share_pct.toFixed(1)
  const latest = c.latest_share_pct.toFixed(1)
  const mxn = formatCompactMXN(c.cumulative_value_mxn)
  if (holds && c.peak_year === c.latest_year) {
    return lang === 'en'
      ? `holds ${latest}% as of ${c.latest_year}, its peak · ${mxn} over the window`
      : `sostiene ${latest}% al cierre de ${c.latest_year}, su pico · ${mxn} en la ventana`
  }
  const now =
    lang === 'en'
      ? holds
        ? `holds ${latest}% as of ${c.latest_year}`
        : `fell to ${latest}% by ${c.latest_year}`
      : holds
        ? `sostiene ${latest}% al cierre de ${c.latest_year}`
        : `cayó a ${latest}% para ${c.latest_year}`
  return lang === 'en'
    ? `peaked ${peak}% in ${c.peak_year} · ${now} · ${mxn} over the window`
    : `llegó a ${peak}% en ${c.peak_year} · ${now} · ${mxn} en la ventana`
}

const crossingYear = (c: CaptureItem, ceil: number) =>
  [...c.timeline].sort((a, b) => a.year - b.year).find((p) => p.share_pct >= ceil)?.year ??
  c.peak_year

interface Props {
  data: CaptureItem[]
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
  lang: 'en' | 'es'
}

export function CaptureFilm({ data, thresholds, landscape, lang }: Props) {
  const ceil = thresholds.ceil_share_pct
  // The film's two URL keys. nuqs writes them together, so two writes in one
  // tick cannot clobber each other the way a searchParams closure did, and
  // `clearOnDefault` keeps a default out of the URL entirely.
  const [{ sort, open: openKey }, setFilmState] = useQueryStates(
    {
      sort: parseAsStringLiteral(SORT_KEYS).withDefault('cruce'),
      open: parseAsString,
    },
    { history: 'replace', clearOnDefault: true },
  )

  /** One toggle for the lead and the twelve cards. */
  const toggle = (c: CaptureItem) => setFilmState({ open: openKey === keyOf(c) ? null : keyOf(c) })

  const lead = useMemo(() => {
    const held = data.filter((c) => c.latest_share_pct >= ceil)
    for (const vid of LEAD_PREFERENCE) {
      const hit = held.find((c) => c.vendor_id === vid)
      if (hit) return hit
    }
    return [...held].sort((a, b) => b.cumulative_value_mxn - a.cumulative_value_mxn)[0] ?? null
  }, [data, ceil])

  const agreeCount = useMemo(
    () => data.filter((c) => c.aria && (c.aria.in_ground_truth || c.aria.ips_tier === 1)).length,
    [data],
  )

  const { held, fell } = useMemo(() => {
    const rest = data.filter((c) => c !== lead)
    const bySort = (a: CaptureItem, b: CaptureItem) => {
      if (sort === 'pico') return b.peak_share_pct - a.peak_share_pct
      if (sort === 'valor') return b.cumulative_value_mxn - a.cumulative_value_mxn
      if (sort === 'vigencia') return b.latest_share_pct - a.latest_share_pct
      return crossingYear(a, ceil) - crossingYear(b, ceil) // earliest crossers first
    }
    return {
      held: rest.filter((c) => c.latest_share_pct >= ceil).sort(bySort),
      fell: rest.filter((c) => c.latest_share_pct < ceil).sort(bySort),
    }
  }, [data, lead, sort, ceil])

  return (
    <section id="la-pelicula" aria-labelledby="pelicula-heading" className="mt-8 scroll-mt-14">
      {/* ── §B′ Exhibit A — the documented climber, shown intimately ── */}
      {lead && (
        <div className="mb-8 lg:max-w-[760px]">
          <h2 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
            {lang === 'en' ? '§ Exhibit A' : '§ Prueba A'}
          </h2>
          <LeadExhibit
            c={lead}
            ceil={ceil}
            lang={lang}
            agreeCount={agreeCount}
            total={data.length}
            expanded={openKey === keyOf(lead)}
            onToggle={() => toggle(lead)}
            thresholds={thresholds}
            landscape={landscape}
          />
        </div>
      )}

      {/* ── §C — the film: 13 threshold-crossing trajectories ── */}
      <h2
        id="pelicula-heading"
        className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2"
      >
        {lang === 'en'
          ? '§ THE FILM · PLATE XIV·a — THIRTEEN LINES CROSSING ONE LINE'
          : '§ LA PELÍCULA · LÁMINA XIV·a — TRECE LÍNEAS QUE CRUZAN UNA LÍNEA'}
      </h2>
      {/* Standfirst — the legal-honesty sentence (frozen contract, kept once) */}
      <div className="lg:max-w-[640px]">
        <p
          className="mb-2"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
          }}
        >
          {lang === 'en'
            ? 'Institutional capture is not proof of wrongdoing. Some legitimate concentrations emerge from technical certification, regional exclusivity, or single-source regulatory dependency. Each line warrants investigation — not accusation.'
            : 'La captura institucional no es prueba de irregularidad. Algunas concentraciones legítimas emergen de certificación técnica, exclusividad regional, o dependencia regulatoria de proveedor único. Cada línea merece investigación — no acusación.'}
        </p>
        <p className="mb-3 font-mono text-[13px] uppercase tracking-[0.12em] text-text-muted">
          {(lang === 'en'
            ? [
                `dashed rule = the ${ceil}% capture ceiling`,
                'zinc below',
                'red above',
                'faint dashes = years without data',
                '* 2025 partial, to Sep 28',
              ]
            : [
                `regla punteada = el techo de captura del ${ceil}%`,
                'zinc abajo',
                'rojo arriba',
                'punteado tenue = años sin datos',
                '* 2025 parcial, al 28 sep',
              ]
          ).map((term, i) => (
            // The separator is glued to the term's first word with a
            // non-breaking space, so a `·` can never orphan at a line end.
            // A whitespace-nowrap span round the WHOLE term overflows 390:
            // "dashed rule = the 50% capture ceiling" is wider than the column.
            <span key={term}>
              {i > 0 ? '· ' : ''}
              {term}
              {' '}
            </span>
          ))}
        </p>
      </div>

      {/* Sort control — wraps instead of scrolling (D6 C3) */}
      <div role="group" aria-labelledby="pelicula-sort" className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span
          id="pelicula-sort"
          className="text-[12px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted flex-shrink-0"
        >
          {lang === 'en' ? 'Order' : 'Ordenar'}
        </span>
        {SORT_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilmState({ sort: k })}
            aria-pressed={sort === k}
            className={`flex-shrink-0 min-h-6 px-1 inline-flex items-center font-mono text-[12px] uppercase tracking-wider transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              sort === k ? 'underline underline-offset-4' : 'text-text-muted hover:text-text-secondary'
            }`}
            style={sort === k ? { color: 'var(--color-accent)' } : undefined}
          >
            {SORT_LABEL[k][lang]}
          </button>
        ))}
      </div>

      <FacetRow
        title={lang === 'en' ? 'STILL CAPTIVE TODAY' : 'AÚN CAUTIVAS HOY'}
        sub={lang === 'en' ? `latest share ≥ ${ceil}%` : `participación actual ≥ ${ceil}%`}
        rows={held}
        ceil={ceil}
        lang={lang}
        openKey={openKey}
        onToggle={toggle}
        thresholds={thresholds}
        landscape={landscape}
      />
      <FacetRow
        title={lang === 'en' ? 'ROSE AND FELL' : 'SUBIERON Y CAYERON'}
        sub={lang === 'en' ? `built a majority, then receded below ${ceil}%` : `construyeron una mayoría y luego cayeron del ${ceil}%`}
        rows={fell}
        ceil={ceil}
        lang={lang}
        openKey={openKey}
        onToggle={toggle}
        thresholds={thresholds}
        landscape={landscape}
      />
    </section>
  )
}

// ─── Seal (at rest, from the folded aria field) ──────────────────────────────
function CrossSeal({ c, lang }: { c: CaptureItem; lang: 'en' | 'es' }) {
  if (!c.aria) return null
  // 10px seals are small text: the ink is the AA-safe reading colour, the
  // border keeps the vivid mark colour (D6 C4 — "inks for type, marks vivid").
  const badges: Array<{ t: string; ink: string; edge: string }> = []
  if (c.aria.in_ground_truth)
    badges.push({
      t: lang === 'en' ? 'documented' : 'documentado',
      ink: RISK_TEXT_COLORS.critical,
      edge: 'var(--color-risk-critical)',
    })
  if (c.aria.ips_tier === 1)
    badges.push({ t: 'ARIA T1', ink: 'var(--color-accent-hover)', edge: 'var(--color-accent)' })
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1.5 align-middle">
      {badges.map((b) => (
        <span
          key={b.t}
          className="font-mono text-[10px] uppercase tracking-[0.1em] px-1 py-0.5 rounded-[2px]"
          style={{ color: b.ink, border: `1px solid ${b.edge}` }}
        >
          {b.t}
        </span>
      ))}
    </span>
  )
}

// ─── Faceted row of small trajectory cards ───────────────────────────────────
function FacetRow({
  title,
  sub,
  rows,
  ceil,
  lang,
  openKey,
  onToggle,
  thresholds,
  landscape,
}: {
  title: string
  sub: string
  rows: CaptureItem[]
  ceil: number
  lang: 'en' | 'es'
  openKey: string | null
  onToggle: (c: CaptureItem) => void
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
}) {
  if (rows.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2">
        <h3 className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          {title}
        </h3>
        <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-text-muted">· {sub}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((c) => {
          const expanded = openKey === keyOf(c)
          const delta = c.peak_share_pct - c.earliest_share_pct
          return (
            <div
              key={keyOf(c)}
              style={expanded ? { gridColumn: '1 / -1' } : undefined}
              className={expanded ? 'rounded-sm border border-border bg-background-card' : 'rounded-sm border border-border/60 bg-background-card'}
            >
              {/* The figure and its numbers are ONE disclosure button; the two
                  chips are links after it, never inside it (D6 C3). */}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => onToggle(c)}
                  aria-expanded={expanded}
                  aria-controls={panelId(c)}
                  className="block w-full text-left cursor-pointer rounded-sm hover:bg-background-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                >
                  <span className="sr-only">
                    {`${formatEntityName('vendor', c.vendor_name, 'full')} · ${formatEntityName('institution', c.institution_name, 'full')}: `}
                  </span>
                  <span className={expanded ? 'block max-w-[380px]' : 'block'}>
                    <CaptureTrajectory
                      timeline={c.timeline}
                      ceil={ceil}
                      peakYear={c.peak_year}
                      peakSharePct={c.peak_share_pct}
                      latestSharePct={c.latest_share_pct}
                      lang={lang}
                    />
                  </span>
                  <span className="mt-1 font-mono text-[13px] text-text-muted tabular-nums flex items-center gap-1.5 flex-wrap">
                    <span>+{delta.toFixed(0)}pp</span>
                    <span>·</span>
                    <span>{formatCompactMXN(c.cumulative_value_mxn)}</span>
                    <CrossSeal c={c} lang={lang} />
                  </span>
                  <span
                    className="mt-1 inline-block font-mono text-[12px] uppercase tracking-[0.14em] hover:opacity-80"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {receiptsLabel(lang, expanded)}
                  </span>
                </button>
                <div className="mt-1.5">
                  <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="sm" fullName />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[13px] text-text-muted font-mono uppercase tracking-wide flex-shrink-0">
                    {lang === 'en' ? 'captured' : 'capturó'}
                  </span>
                  <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="sm" fullName />
                </div>
              </div>
              {expanded && (
                <CaptureExpand id={panelId(c)} c={c} lang={lang} thresholds={thresholds} landscape={landscape} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Lead Exhibit A — the documented climber, enlarged ───────────────────────
function LeadExhibit({
  c,
  ceil,
  lang,
  agreeCount,
  total,
  expanded,
  onToggle,
  thresholds,
  landscape,
}: {
  c: CaptureItem
  ceil: number
  lang: 'en' | 'es'
  agreeCount: number
  total: number
  expanded: boolean
  onToggle: () => void
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
}) {
  const caseLink = captureCaseFor(c.vendor_id)
  const holds = c.latest_share_pct >= ceil
  return (
    <div className="rounded-sm border border-border bg-background-card overflow-hidden">
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-[minmax(300px,380px)_1fr] gap-6 items-start">
        <div>
          <CaptureTrajectory
            timeline={c.timeline}
            ceil={ceil}
            peakYear={c.peak_year}
            peakSharePct={c.peak_share_pct}
            latestSharePct={c.latest_share_pct}
            lang={lang}
            variant="lead"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="md" className="max-w-full" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="text-[12px] text-text-muted font-mono uppercase tracking-wide">
              {lang === 'en' ? 'captured' : 'capturó'}
            </span>
            <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="md" />
          </div>
          <p className="mt-3 font-mono text-[13px] text-text-secondary tabular-nums leading-relaxed">
            {leadSentence(c, holds, lang)}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <CrossSeal c={c} lang={lang} />
            {caseLink && (
              <EntityIdentityChip
                type="case"
                id={caseLink.slug}
                name={
                  lang === 'en'
                    ? `Documented: ${caseLink.label_en}`
                    : `Documentado: ${caseLink.label_es}`
                }
                size="sm"
                fullName
              />
            )}
          </div>
          <p className="mt-3 text-[13.5px] text-text-secondary leading-snug" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal' }}>
            {lang === 'en'
              ? `Two methods, one conclusion: the model independently flags ${agreeCount} of these ${total}.`
              : `Dos métodos, una conclusión: el modelo señala de forma independiente ${agreeCount} de estas ${total}.`}
          </p>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId(c)}
            className="mt-3 min-h-6 inline-flex items-center font-mono text-[12px] font-bold uppercase tracking-[0.14em] rounded-sm hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            style={{ color: 'var(--color-accent)' }}
          >
            {expanded
              ? lang === 'en' ? 'Hide the receipts ↑' : 'Ocultar los recibos ↑'
              : lang === 'en' ? 'See the year-by-year receipts ↓' : 'Ver los recibos año con año ↓'}
          </button>
        </div>
      </div>
      {expanded && (
        <CaptureExpand id={panelId(c)} c={c} lang={lang} thresholds={thresholds} landscape={landscape} />
      )}
    </div>
  )
}
