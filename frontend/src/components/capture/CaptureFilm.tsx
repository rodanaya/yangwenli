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
import { useSearchParams } from 'react-router-dom'
import {
  type CaptureItem,
  type CaptureTopResponse,
  type CaptureLandscapeResponse,
} from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const ceil = thresholds.ceil_share_pct
  const sort = (SORT_KEYS as string[]).includes(searchParams.get('sort') ?? '')
    ? (searchParams.get('sort') as SortKey)
    : 'cruce'
  const openKey = searchParams.get('abrir')

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

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

  const keyOf = (c: CaptureItem) => `${c.institution_id}-${c.vendor_id}`

  return (
    <section id="la-pelicula" aria-labelledby="pelicula-heading" className="mt-8">
      {/* ── §B′ Exhibit A — the documented climber, shown intimately ── */}
      {lead && (
        <div className="mb-8">
          <p className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
            {lang === 'en' ? '§ Exhibit A' : '§ Prueba A'}
          </p>
          <LeadExhibit
            c={lead}
            ceil={ceil}
            lang={lang}
            agreeCount={agreeCount}
            total={data.length}
            expanded={openKey === keyOf(lead)}
            onToggle={() => setParam('abrir', openKey === keyOf(lead) ? null : keyOf(lead))}
            thresholds={thresholds}
            landscape={landscape}
          />
        </div>
      )}

      {/* ── §C — the film: 13 threshold-crossing trajectories ── */}
      <p
        id="pelicula-heading"
        className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2"
      >
        {lang === 'en'
          ? '§ THE FILM · PLATE XIV·a — THIRTEEN LINES CROSSING ONE LINE'
          : '§ LA PELÍCULA · LÁMINA XIV·a — TRECE LÍNEAS QUE CRUZAN UNA LÍNEA'}
      </p>
      {/* Standfirst — the legal-honesty sentence (frozen contract, kept once) */}
      <p
        className="mb-2"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'en'
          ? 'Institutional capture is not proof of wrongdoing. Some legitimate concentrations emerge from technical certification, regional exclusivity, or single-source regulatory dependency. Each line warrants investigation — not accusation.'
          : 'La captura institucional no es prueba de irregularidad. Algunas concentraciones legítimas emergen de certificación técnica, exclusividad regional, o dependencia regulatoria de proveedor único. Cada línea merece investigación — no acusación.'}
      </p>
      <p className="mb-3 font-mono text-[13px] uppercase tracking-[0.12em] text-text-muted">
        {lang === 'en'
          ? `dashed line = the ${ceil}% capture ceiling · zinc below · red above`
          : `línea punteada = el techo de captura del ${ceil}% · zinc abajo · rojo arriba`}
      </p>

      {/* Sort control */}
      <div className="flex items-center gap-3 mb-3 overflow-x-auto">
        <span className="text-[12px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted flex-shrink-0">
          {lang === 'en' ? 'Order' : 'Ordenar'}
        </span>
        {SORT_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setParam('sort', k === 'cruce' ? null : k)}
            aria-pressed={sort === k}
            className={`flex-shrink-0 font-mono text-[12px] uppercase tracking-wider transition-colors ${
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
        keyOf={keyOf}
        onToggle={(c) => setParam('abrir', openKey === keyOf(c) ? null : keyOf(c))}
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
        keyOf={keyOf}
        onToggle={(c) => setParam('abrir', openKey === keyOf(c) ? null : keyOf(c))}
        thresholds={thresholds}
        landscape={landscape}
      />
    </section>
  )
}

// ─── Seal (at rest, from the folded aria field) ──────────────────────────────
function CrossSeal({ c, lang }: { c: CaptureItem; lang: 'en' | 'es' }) {
  if (!c.aria) return null
  const badges: Array<{ t: string; color: string }> = []
  if (c.aria.in_ground_truth)
    badges.push({ t: lang === 'en' ? 'documented' : 'documentado', color: 'var(--color-risk-critical)' })
  if (c.aria.ips_tier === 1) badges.push({ t: 'ARIA T1', color: 'var(--color-accent)' })
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1.5 align-middle">
      {badges.map((b) => (
        <span
          key={b.t}
          className="font-mono text-[10px] uppercase tracking-[0.1em] px-1 py-0.5 rounded-[2px]"
          style={{ color: b.color, border: `1px solid ${b.color}`, opacity: 0.9 }}
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
  keyOf,
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
  keyOf: (c: CaptureItem) => string
  onToggle: (c: CaptureItem) => void
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
}) {
  if (rows.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          {title}
        </h3>
        <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-text-muted">· {sub}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
        {rows.map((c) => {
          const expanded = openKey === keyOf(c)
          const delta = c.peak_share_pct - c.earliest_share_pct
          return (
            <div
              key={keyOf(c)}
              style={expanded ? { gridColumn: '1 / -1' } : undefined}
              className={expanded ? 'rounded-sm border border-border bg-background-card' : ''}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return // inner chips navigate
                  onToggle(c)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggle(c)
                  }
                }}
                aria-expanded={expanded}
                className="w-full text-left p-2 cursor-pointer hover:bg-background-elevated transition-colors focus:outline-none focus:ring-1 focus:ring-text-muted rounded-sm"
              >
                <div className={expanded ? 'max-w-[260px]' : ''}>
                  <CaptureTrajectory
                    timeline={c.timeline}
                    ceil={ceil}
                    peakYear={c.peak_year}
                    peakSharePct={c.peak_share_pct}
                    latestSharePct={c.latest_share_pct}
                    lang={lang}
                  />
                </div>
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="xs" className="max-w-full" />
                </div>
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  <span className="text-[13px] text-text-muted font-mono uppercase tracking-wide">
                    {lang === 'en' ? 'captured' : 'capturó'}
                  </span>
                  <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="xs" className="min-w-0" />
                </div>
                <p className="mt-0.5 font-mono text-[13px] text-text-muted tabular-nums flex items-center gap-1.5 flex-wrap">
                  <span>+{delta.toFixed(0)}pp</span>
                  <span>·</span>
                  <span>{formatCompactMXN(c.cumulative_value_mxn)}</span>
                  <CrossSeal c={c} lang={lang} />
                </p>
              </div>
              {expanded && (
                <CaptureExpand c={c} lang={lang} thresholds={thresholds} landscape={landscape} />
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
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">
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
            {lang === 'en'
              ? `peaked ${c.peak_share_pct}% in ${c.peak_year} · ${holds ? `holds ${c.latest_share_pct}% today` : `fell to ${c.latest_share_pct}%`} · ${formatCompactMXN(c.cumulative_value_mxn)} captured`
              : `llegó a ${c.peak_share_pct}% en ${c.peak_year} · ${holds ? `sostiene ${c.latest_share_pct}% hoy` : `cayó a ${c.latest_share_pct}%`} · ${formatCompactMXN(c.cumulative_value_mxn)} capturados`}
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
              />
            )}
          </div>
          <p className="mt-3 text-[12px] text-text-secondary leading-snug" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal' }}>
            {lang === 'en'
              ? `Two methods, one conclusion: the model independently flags ${agreeCount} of these ${total}.`
              : `Dos métodos, una conclusión: el modelo señala de forma independiente ${agreeCount} de estas ${total}.`}
          </p>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="mt-3 font-mono text-[12px] font-bold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-accent)' }}
          >
            {expanded
              ? lang === 'en' ? 'Hide the receipts ↑' : 'Ocultar los recibos ↑'
              : lang === 'en' ? 'See the year-by-year receipts ↓' : 'Ver los recibos año con año ↓'}
          </button>
        </div>
      </div>
      {expanded && <CaptureExpand c={c} lang={lang} thresholds={thresholds} landscape={landscape} />}
    </div>
  )
}
