/**
 * Two Worlds — methodology exhibit.
 *
 * Formerly the standalone /intersection page. It was retired (2026-06-08)
 * because as a *tool* it offered nothing ARIA doesn't: one zone duplicated the
 * queue, one listed vendors already on the official list, one listed the
 * model's own misses. But the underlying finding is a strong *credibility
 * argument* — RUBLI's model and the government's official record (SAT EFOS +
 * SFP) barely overlap, so the platform is not redundant with what the state
 * already publishes. That argument belongs here, made once, as an exhibit.
 *
 * Static by design (no drill-down): the leads live in ARIA. The only hypertext
 * is the named-nodes register at the foot.
 *
 * PARALLAX D2b § Change 3: the Venn was replaced by a proportional ledger. The
 * Venn drew the model at ~5× the state's area when the data is 29×, floated its
 * labels on leader lines, and showed nothing of the 46 / 607 / 178 beyond a
 * number. This draws both lists to one linear scale in the Balanza's engraving
 * vocabulary, and magnifies the state's 224 ten times so its split is legible.
 * Spec: docs/parallax/DAY-02b-methodology-plates.md § Change 3.
 */

import { useId, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { intersectionApi, type IntersectionVendor } from '@/api/client'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { cn, formatNumber } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'

const SERIF = '"Playfair Display", "EB Garamond", Georgia, serif'
const MONO = '"IBM Plex Mono", "JetBrains Mono", monospace'
const C_MODEL = RISK_COLORS.critical // red — RUBLI model
const INK_RECORD = 'var(--color-text-secondary)' // slate — the official record
const C_OVERLAP = RISK_COLORS.high // amber — agreement

// ── HatchBand — one ruled band of proportional hatch segments ───────────────
// Same 45° engraving vocabulary as BalanzaLedger's HatchBar: `dense` is the
// identical pattern at a heavier weight, `solid` is flat ink. No <circle>.
type BandFill = 'hatch' | 'dense' | 'solid'
interface BandSegment {
  /** width as a percentage of the band */
  pct: number
  fill: BandFill
  color: string
}

function HatchBand({ segments, height = 16 }: { segments: BandSegment[]; height?: number }) {
  const uid = useId().replace(/:/g, '')
  let cursor = 0
  const placed = segments.map((s, i) => {
    const seg = { ...s, x: cursor, id: `${uid}-${i}` }
    cursor += s.pct
    return seg
  })
  return (
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        {placed
          .filter((s) => s.fill !== 'solid')
          .map((s) => (
            <pattern
              key={s.id}
              id={s.id}
              width={3}
              height={3}
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width={3} height={3} fill={s.color} fillOpacity={s.fill === 'dense' ? 0.34 : 0.16} />
              <line x1={0} y1={0} x2={0} y2={3} stroke={s.color} strokeWidth={s.fill === 'dense' ? 1.8 : 1.4} />
            </pattern>
          ))}
      </defs>
      {placed.map((s) => (
        <g key={s.id}>
          <rect
            x={s.x}
            y={1}
            width={s.pct}
            height={8}
            fill={s.fill === 'solid' ? s.color : `url(#${s.id})`}
            fillOpacity={s.fill === 'solid' ? 0.85 : undefined}
          />
          <rect
            x={s.x}
            y={1}
            width={s.pct}
            height={8}
            fill="none"
            stroke={s.color}
            strokeOpacity={0.55}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          {/* terminal tick at the segment boundary */}
          <line
            x1={Math.min(s.x + s.pct, 99.9)}
            y1={0}
            x2={Math.min(s.x + s.pct, 99.9)}
            y2={10}
            stroke={s.color}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  )
}

/** 28×12 legend swatch — the same band, one segment wide. */
function Swatch({ fill, color }: { fill: BandFill; color: string }) {
  return (
    <span style={{ display: 'inline-block', width: 28, flexShrink: 0 }}>
      <HatchBand segments={[{ pct: 100, fill, color }]} height={12} />
    </span>
  )
}

export function TwoWorldsExhibit({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data } = useQuery({
    queryKey: ['intersection', 'exhibit'],
    // top_n = 3 — the named-nodes register lists the top 3 of each zone.
    queryFn: () => intersectionApi.getSummary(3),
    staleTime: 10 * 60 * 1000,
  })
  const w = data?.worlds
  if (!w || !data) return null

  // ── Proportions, all derived from the payload — never hard-coded ──────────
  const modelFlags = w.model_flags
  const officialRecord = w.official_record
  const overlap = w.overlap
  const ghost = w.ghost_signature
  const blindSpots = w.blind_spots
  const modelOnlyOther = w.model_only - w.ghost_signature

  const pct = (n: number) => (modelFlags > 0 ? (n / modelFlags) * 100 : 0)
  const pOther = pct(modelOnlyOther)
  const pGhost = pct(ghost)
  const pOverlap = pct(overlap)
  // model_flags and official_record are independent counts, not partitions of
  // one another — clamp both so an inverted dataset can't overrun the plate.
  const stubPct = Math.min(100, pct(officialRecord))
  const lensPct = Math.min(100, stubPct * 10)
  const lensOverlapPct = officialRecord > 0 ? (overlap / officialRecord) * 100 : 0

  const underScrutiny = modelFlags + blindSpots
  const shareOfModel = pOverlap
  const shareOfState = lensOverlapPct

  const efos = data.registry_breakdown.efos_definitivo
  const sfp = data.registry_breakdown.sfp_sanctioned
  // EFOS + SFP overshoots the official record by the vendors carried on both.
  const onBothLists = Math.max(0, efos + sfp - officialRecord)

  const n = formatNumber
  const p1 = (v: number) => v.toFixed(1)

  const plateCaption = lang === 'es'
    ? `Lámina III·c — los dos padrones dibujados a una sola escala. La lista del modelo, la del Estado y la franja donde coinciden, con los ${n(officialRecord)} del Estado ampliados diez veces para leer su reparto.`
    : `Plate III·c — the two lists drawn to one scale. The model's list, the state's list, and the sliver where they meet, with the state's ${n(officialRecord)} magnified ten times to make its split legible.`

  // role="img" pulls this block's HTML text out of the accessibility tree, so
  // the label has to carry every number a sighted reader gets from it — not
  // just the headline three. (react-reviewer, D2b)
  const ledgerAria = lang === 'es'
    ? `Libro proporcional: el modelo marca ${n(modelFlags)} proveedores — ${n(modelOnlyOther)} solo el modelo, ${n(ghost)} con huella fantasma y ${n(overlap)} que también están en el registro oficial. El registro oficial lista ${n(officialRecord)}: esos mismos ${n(overlap)} más ${n(blindSpots)} puntos ciegos, de ${n(efos)} registros SAT EFOS y ${n(sfp)} sanciones SFP.`
    : `Proportional ledger: the model flags ${n(modelFlags)} vendors — ${n(modelOnlyOther)} model only, ${n(ghost)} with a ghost signature and ${n(overlap)} that are also on the official record. The official record lists ${n(officialRecord)}: those same ${n(overlap)} plus ${n(blindSpots)} blind spots, from ${n(efos)} SAT EFOS entries and ${n(sfp)} SFP sanctions.`

  const legend: Array<{ label: string; count: number; color: string; fill: BandFill; gloss: string }> = [
    {
      label: lang === 'es' ? 'Solo el modelo' : 'Model only',
      count: modelOnlyOther,
      color: C_MODEL,
      fill: 'hatch',
      gloss: lang === 'es' ? 'marcados, en ninguna lista del Estado' : 'flagged, not on any state list',
    },
    {
      label: lang === 'es' ? 'Huella fantasma' : 'Ghost signature',
      count: ghost,
      color: C_MODEL,
      fill: 'dense',
      gloss: lang === 'es' ? 'huella P2/P3 que el registro nunca listó' : 'P2/P3 fingerprint the registry never listed',
    },
    {
      label: lang === 'es' ? 'Ambos coinciden' : 'Both agree',
      count: overlap,
      color: C_OVERLAP,
      fill: 'solid',
      gloss: lang === 'es' ? 'en EFOS/SFP y marcados por el modelo' : 'on EFOS/SFP and flagged by the model',
    },
    {
      label: lang === 'es' ? 'Solo el Estado' : 'State only',
      count: blindSpots,
      color: INK_RECORD,
      fill: 'hatch',
      gloss: lang === 'es' ? 'sancionados que el modelo no ve' : 'sanctioned vendors the model misses',
    },
  ]

  const top3 = (vendors: IntersectionVendor[] | undefined) =>
    [...(vendors ?? [])].sort((a, b) => b.avg_risk_score - a.avg_risk_score).slice(0, 3)

  const nodeColumns: Array<{ kicker: string; color: string; vendors: IntersectionVendor[] }> = [
    {
      kicker: lang === 'es' ? 'AMBOS COINCIDEN · 3 DE MAYOR RIESGO' : 'BOTH AGREE · TOP 3 BY RISK',
      color: C_OVERLAP,
      vendors: top3(data.zones.confirmed?.vendors),
    },
    {
      kicker: lang === 'es' ? 'HUELLA FANTASMA · 3' : 'GHOST SIGNATURE · TOP 3',
      color: C_MODEL,
      vendors: top3(data.zones.ghost?.vendors),
    },
    {
      kicker: lang === 'es' ? 'PUNTOS CIEGOS · 3' : 'BLIND SPOTS · TOP 3',
      color: INK_RECORD,
      vendors: top3(data.zones.blindspot?.vendors),
    },
  ]

  const emptyTitle = lang === 'es' ? 'Sin proveedores en esta zona' : 'No vendors in this zone'
  const ghostLabel = `${n(ghost)} ${lang === 'es' ? 'huella fantasma' : 'ghost signature'} · P2/P3`
  const rowLabelStyle = { fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em' } as const
  const underLabelStyle = { fontFamily: MONO, fontSize: '11px', whiteSpace: 'nowrap' } as const

  return (
    <section id="two-worlds" className={cn('scroll-mt-20', className)}>
      <PlateFrame
        lang={lang}
        folio="III·c"
        contextLabel={{ en: 'Two ways of seeing', es: 'Dos formas de ver' }}
        caption={plateCaption}
      >
        {/* ── Headline area ──────────────────────────────────────────────── */}
        <header className="mb-6">
          <p className="font-mono font-bold uppercase" style={{ color: C_OVERLAP, fontSize: '12px', letterSpacing: '0.18em' }}>
            {lang === 'es' ? 'Exhibit · por qué el modelo no es redundante' : "Exhibit · why the model isn't redundant"}
          </p>
          <h3
            className="mt-2 text-text-primary leading-[1.1]"
            style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 'clamp(22px, 3vw, 34px)', letterSpacing: '-0.02em', maxWidth: '20ch' }}
          >
            {lang === 'es' ? 'Dos formas de ver la corrupción. Casi nunca coinciden.' : 'Two ways of seeing corruption. They almost never agree.'}
          </h3>
          <p className="mt-3 text-text-secondary" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(15px, 1.8vw, 18px)', lineHeight: 1.5 }}>
            {lang === 'es'
              ? <>El modelo de RUBLI marca <strong className="tabular-nums" style={{ color: C_MODEL }}>{n(modelFlags)}</strong> proveedores de alto riesgo. El registro oficial del Estado — SAT EFOS + SFP — lista <strong className="tabular-nums" style={{ color: INK_RECORD }}>{n(officialRecord)}</strong>. Comparten <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{n(overlap)}</strong>. Si el modelo solo repitiera la lista oficial, sobraría; no lo hace.</>
              : <>RUBLI's model flags <strong className="tabular-nums" style={{ color: C_MODEL }}>{n(modelFlags)}</strong> high-risk suppliers. The state's official record — SAT EFOS + SFP — lists <strong className="tabular-nums" style={{ color: INK_RECORD }}>{n(officialRecord)}</strong>. They share <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{n(overlap)}</strong>. If the model just echoed the official list it would be redundant; it doesn't.</>}
          </p>
        </header>

        {/* ── The proportional ledger ────────────────────────────────────── */}
        <div role="img" aria-label={ledgerAria}>
          {/* ROW A — the model's list, the full width of the plate */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="uppercase text-text-muted" style={rowLabelStyle}>
              {lang === 'es' ? 'MODELO RUBLI · riesgo ≥ 0.40' : 'RUBLI MODEL · risk ≥ 0.40'}
            </span>
            <span className="tabular-nums" style={{ fontFamily: SERIF, fontStyle: 'normal', fontWeight: 800, fontSize: '22px', color: C_MODEL }}>
              {n(modelFlags)}
            </span>
          </div>
          <div className="mt-1.5">
            <HatchBand
              segments={[
                { pct: pOther, fill: 'hatch', color: C_MODEL },
                { pct: pGhost, fill: 'dense', color: C_MODEL },
                { pct: pOverlap, fill: 'solid', color: C_OVERLAP },
              ]}
            />
          </div>
          {/* under-labels — one line, outer two fixed, middle takes the slack
              and truncates. Anchoring the middle to its own segment edge left
              "46" orphaned on a line of its own at 390. (D2b § judge) */}
          <div className="mt-1.5 flex items-baseline justify-between gap-2 text-text-muted">
            <span className="whitespace-nowrap" style={underLabelStyle}>
              {n(modelOnlyOther)} {lang === 'es' ? 'solo el modelo' : 'model only'}
            </span>
            <span className="min-w-0 flex-1 truncate text-right" style={underLabelStyle} title={ghostLabel}>
              {ghostLabel}
            </span>
            <span className="whitespace-nowrap tabular-nums" style={{ ...underLabelStyle, color: C_OVERLAP }}>
              {n(overlap)}
            </span>
          </div>

          {/* ROW B — the state's list, at row A's scale: a 3.4% stub */}
          <div className="mt-5 flex items-baseline justify-between gap-3">
            <span className="uppercase text-text-muted" style={rowLabelStyle}>
              {lang === 'es' ? 'REGISTRO OFICIAL · SAT EFOS + SFP' : 'OFFICIAL RECORD · SAT EFOS + SFP'}
            </span>
            <span className="tabular-nums" style={{ fontFamily: SERIF, fontStyle: 'normal', fontWeight: 800, fontSize: '22px', color: INK_RECORD }}>
              {n(officialRecord)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-end">
            <div style={{ width: `${stubPct}%` }}>
              <HatchBand
                segments={[
                  { pct: lensOverlapPct, fill: 'solid', color: C_OVERLAP },
                  { pct: 100 - lensOverlapPct, fill: 'hatch', color: INK_RECORD },
                ]}
              />
            </div>
          </div>

          {/* leader — from the stub's left edge down to the lens's left edge.
              Only at ≥ sm: below it the lens is full width, so there is no
              left edge to point at. (D2b § judge) */}
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="hidden sm:block" style={{ width: '100%', height: 22 }} aria-hidden="true">
            <line
              x1={100 - stubPct}
              y1={0}
              x2={100 - lensPct}
              y2={10}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* LENS — the same stub, magnified ten times. Below sm it goes full
              width: at 34% of a 390 viewport the box is ~100px and its captions
              wrap to one word per line. (D2b § judge) */}
          <div className="mt-4 flex justify-end sm:mt-0">
            <div
              className="w-full max-w-full p-3 sm:w-[var(--lens-w)]"
              style={{ '--lens-w': `${lensPct}%`, minWidth: 0, border: '1px solid var(--color-border)' } as CSSProperties}
            >
              <p className="uppercase text-text-muted" style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '0.12em' }}>
                {lang === 'es' ? `DETALLE ×10 · los ${n(officialRecord)} del Estado, ampliados` : `DETALLE ×10 · the state's ${n(officialRecord)}, magnified`}
              </p>
              <div className="mt-2">
                <HatchBand
                  segments={[
                    { pct: lensOverlapPct, fill: 'solid', color: C_OVERLAP },
                    { pct: 100 - lensOverlapPct, fill: 'hatch', color: INK_RECORD },
                  ]}
                />
              </div>
              <p className="mt-1.5" style={{ fontFamily: MONO, fontSize: '11px', lineHeight: 1.4, color: C_OVERLAP }}>
                {n(overlap)} {lang === 'es' ? `coinciden · ${p1(shareOfState)}% de la lista del Estado` : `both agree · ${p1(shareOfState)}% of the state's list`}
              </p>
              <p className="text-text-secondary" style={{ fontFamily: MONO, fontSize: '11px', lineHeight: 1.4 }}>
                {n(blindSpots)} {lang === 'es' ? 'puntos ciegos · sancionados, puntuación del modelo < 0.40' : 'blind spots · sanctioned, model score < 0.40'}
              </p>
              <p className="mt-1.5 text-text-muted" style={{ fontFamily: MONO, fontSize: '11px', lineHeight: 1.4 }}>
                {n(efos)} SAT EFOS 69-B · {n(sfp)} {lang === 'es' ? 'sanciones SFP' : 'SFP sanctions'}
                {onBothLists > 0 && (lang === 'es' ? ` · ${n(onBothLists)} en ambas listas` : ` · ${n(onBothLists)} on both lists`)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Legend — four typed cells with counts ──────────────────────── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-y border-border">
          {legend.map((l) => (
            <div key={l.label} className="bg-background-card px-3 py-3">
              <div className="flex items-center gap-2">
                <Swatch fill={l.fill} color={l.color} />
                <span className="uppercase" style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.12em', color: l.color }}>
                  {l.label}
                </span>
              </div>
              <div className="mt-1 tabular-nums" style={{ fontFamily: SERIF, fontStyle: 'normal', fontWeight: 800, fontSize: '22px', color: l.color }}>
                {n(l.count)}
              </div>
              <p className="mt-0.5 text-text-muted" style={{ fontFamily: MONO, fontSize: '11px', lineHeight: 1.4 }}>
                {l.gloss}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tally ──────────────────────────────────────────────────────── */}
        <p className="mt-2 text-right text-text-muted" style={{ fontFamily: MONO, fontSize: '11px', lineHeight: 1.5 }}>
          {lang === 'es'
            ? `${n(underScrutiny)} proveedores bajo escrutinio · ${n(overlap)} compartidos · ${p1(shareOfModel)}% de la lista del modelo · ${p1(shareOfState)}% de la del Estado`
            : `${n(underScrutiny)} vendors under scrutiny · ${n(overlap)} shared · ${p1(shareOfModel)}% of the model's list · ${p1(shareOfState)}% of the state's`}
        </p>

        {/* ── Named nodes — the only hypertext on the exhibit ─────────────── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {nodeColumns.map((col) => (
            <div key={col.kicker}>
              <p className="uppercase" style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '0.12em', color: col.color }}>
                {col.kicker}
              </p>
              {col.vendors.length === 0 ? (
                <p className="mt-2 text-text-muted" style={{ fontFamily: MONO, fontSize: '11px' }} title={emptyTitle}>
                  {/* `title` alone is not announced on a non-focusable <p> */}
                  <span className="sr-only">{emptyTitle}</span>
                  <span aria-hidden="true">—</span>
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {col.vendors.map((v) => (
                    <li key={v.vendor_id}>
                      <EntityIdentityChip
                        type="vendor"
                        id={v.vendor_id}
                        name={v.vendor_name}
                        size="sm"
                        riskScore={v.avg_risk_score}
                      />
                      <span className="block mt-0.5 text-text-muted" style={{ fontFamily: MONO, fontSize: '11px' }}>
                        {v.primary_pattern ? `${v.primary_pattern} · ` : ''}
                        {n(v.total_contracts)}{' '}
                        {lang === 'es'
                          ? v.total_contracts === 1 ? 'contrato' : 'contratos'
                          : v.total_contracts === 1 ? 'contract' : 'contracts'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <p className="mt-6 text-[13px] leading-[1.6] text-text-secondary">
          {lang === 'es'
            ? <>El «registro oficial» son solo SAT EFOS (Art. 69-B) + SFP — <strong className="text-text-primary">no</strong> incluye el corpus de casos de RUBLI, que sería circular (el modelo se entrenó con él). Los <strong className="tabular-nums" style={{ color: C_MODEL }}>{n(ghost)}</strong> proveedores que solo el modelo ve son las pistas de investigación — viven en <Link to="/aria" className="underline underline-offset-2 hover:text-text-primary">la Lista de Vigilancia (ARIA)</Link>.</>
            : <>"Official record" is SAT EFOS (Art. 69-B) + SFP only — it does <strong className="text-text-primary">not</strong> include RUBLI's own case corpus, which would be circular (the model trained on it). The <strong className="tabular-nums" style={{ color: C_MODEL }}>{n(ghost)}</strong> suppliers only the model sees are the investigation leads — they live in <Link to="/aria" className="underline underline-offset-2 hover:text-text-primary">the Queue (ARIA)</Link>.</>}
        </p>
      </PlateFrame>
    </section>
  )
}
