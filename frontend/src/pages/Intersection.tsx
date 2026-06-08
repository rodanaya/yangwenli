/**
 * Intersection — "Two Worlds". The model-vs-official-record reconciliation,
 * drawn as the thing it actually is: a set intersection.
 *
 * v3 (2026-06-08). v2 was honest but read as a vendor list — i.e. a clone of
 * the ARIA risk queue, with "the intersection" demoted to a thin ladder. This
 * version makes the INTERSECTION the centerpiece: a Venn of RUBLI's model
 * flags (6,548) against the official record (SAT EFOS + SFP, 224). The two
 * barely overlap — 46 shared names — which is the whole story and the one
 * thing a flat ranked list structurally cannot show. The vendor list is now a
 * drill-down: click a region of the Venn to read its vendors.
 *
 *   • model-only crescent  → the Ghost Ledger (flagged, state silent)
 *   • overlap lens         → Confirmed (both agree)
 *   • record-only crescent → Blind spots (state flagged, model clear)
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, type IntersectionVendor, type IntersectionSummary } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, CURRENT_MODEL_VERSION, getSectorName, getRiskLevelFromScore } from '@/lib/constants'
import { useGroundTruthCount } from '@/hooks/useGroundTruthCount'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PageFooter } from '@/components/layout/PageFooter'

const EFOS_REGISTRY_SIZE = 13_960 // SAT Art. 69-B definitivo RFCs (national)
const SERIF = '"Playfair Display", "EB Garamond", Georgia, serif'

type ZoneKey = 'ghost' | 'confirmed' | 'blindspot'

const C_MODEL = RISK_COLORS.critical // red — RUBLI model
const C_RECORD = '#64748b' // slate — the official record (institutional, neutral)
const C_OVERLAP = RISK_COLORS.high // amber — genuine agreement

function patternLabel(p: string | null, lang: string): string | null {
  if (!p) return null
  const map: Record<string, [string, string]> = {
    P2: ['Empresa fantasma', 'Ghost company'],
    P3: ['Intermediario', 'Intermediary'],
    P5: ['Red de proveedores', 'Vendor network'],
    P6: ['Captura institucional', 'Institutional capture'],
    P1: ['Concentración', 'Concentration'],
  }
  const e = map[p]
  return e ? (lang === 'es' ? e[0] : e[1]) : p
}

// ─── Ledger row — a vendor as a mini-case ──────────────────────────────────

function LedgerRow({ v, rank, lang }: { v: IntersectionVendor; rank: number; lang: string }) {
  const sectorColor = v.primary_sector_name ? SECTOR_COLORS[v.primary_sector_name.toLowerCase()] ?? '#64748b' : '#64748b'
  const riskColor = RISK_COLORS[getRiskLevelFromScore(v.avg_risk_score)]
  const da = v.direct_award_rate != null ? Math.round(v.direct_award_rate * 100) : null
  const sb = v.single_bid_rate != null ? Math.round(v.single_bid_rate * 100) : null
  const pat = patternLabel(v.primary_pattern, lang)

  const chips: Array<{ label: string; color: string }> = []
  if (v.is_efos_definitivo) chips.push({ label: 'EFOS', color: C_MODEL })
  if (v.is_sfp_sanctioned) chips.push({ label: 'SFP', color: '#ea580c' })
  if (v.is_disappeared) chips.push({ label: lang === 'es' ? 'Desaparecido' : 'Disappeared', color: C_MODEL })
  if (sb != null && sb >= 50) chips.push({ label: (lang === 'es' ? 'Propuesta única ' : 'Single-bid ') + sb + '%', color: '#71717a' })
  else if (da != null && da >= 70) chips.push({ label: (lang === 'es' ? 'Adj. directa ' : 'Direct-award ') + da + '%', color: '#71717a' })

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">{String(rank).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" />
          {pat && (
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ color: riskColor, background: `${riskColor}14`, border: `1px solid ${riskColor}33` }}>
              {pat}
            </span>
          )}
          {chips.map((c) => (
            <span key={c.label} className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ color: c.color, background: `${c.color}14`, border: `1px solid ${c.color}33` }}>
              {c.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-text-muted">
          {v.primary_sector_name && <span className="uppercase tracking-wider">{getSectorName(v.primary_sector_name.toLowerCase(), lang === 'es' ? 'es' : 'en')}</span>}
          <span>·</span>
          <span className="tabular-nums">{formatNumber(v.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}</span>
          <span>·</span>
          <span className="tabular-nums">{formatCompactMXN(v.total_value_mxn)}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-sm font-bold tabular-nums" style={{ color: riskColor }}>{v.avg_risk_score.toFixed(2)}</div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">{lang === 'es' ? 'riesgo' : 'risk'}</div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
    </div>
  )
}

// ─── The Two Worlds Venn — the centerpiece ─────────────────────────────────
// Geometry is fixed; counts are bound to data. The model circle (left, large)
// and the official-record circle (right, small) overlap in a thin lens = the
// shared 46. Three regions are independently clickable.

// model: cx 270, cy 205, r 165 · record: cx 471, cy 205, r 72
function VennZone({
  zone, selected, onSelect, label, children,
}: {
  zone: ZoneKey
  selected: boolean
  onSelect: (z: ZoneKey) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(zone)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(zone)
        }
      }}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {children}
    </g>
  )
}

function TwoWorldsVenn({ w, selected, onSelect, lang }: { w: IntersectionSummary['worlds']; selected: ZoneKey; onSelect: (z: ZoneKey) => void; lang: string }) {
  const fill = (c: string, sel: boolean) => ({ fill: c, fillOpacity: sel ? 0.3 : 0.12, stroke: c, strokeOpacity: sel ? 1 : 0.45, strokeWidth: sel ? 2.5 : 1.5 })
  return (
    <div className="rounded-sm border border-border bg-background-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          {lang === 'es' ? 'Dos mundos · modelo × registro oficial' : 'Two worlds · model × official record'}
        </p>
        <p className="text-[10px] font-mono text-text-muted tabular-nums">
          {formatNumber(w.overlap)} {lang === 'es' ? 'nombres en común' : 'shared names'}
        </p>
      </div>
      <div className="px-3 py-4 sm:px-6">
        <svg viewBox="0 0 720 420" className="w-full h-auto" role="group" aria-label={lang === 'es' ? 'Diagrama de intersección' : 'Intersection diagram'} style={{ maxHeight: 460 }}>
          <defs>
            <clipPath id="venn-lens-clip"><circle cx={270} cy={205} r={165} /></clipPath>
          </defs>

          {/* MODEL circle (left, large) → ghost */}
          <VennZone zone="ghost" selected={selected === 'ghost'} onSelect={onSelect} label={`${lang === 'es' ? 'El modelo marca' : 'Model flags'}: ${formatNumber(w.model_flags)}`}>
            <circle cx={270} cy={205} r={165} {...fill(C_MODEL, selected === 'ghost')} />
            {/* ghost-core inner disc */}
            <circle cx={203} cy={268} r={47} fill={C_MODEL} fillOpacity={selected === 'ghost' ? 0.34 : 0.2} stroke={C_MODEL} strokeOpacity={0.6} strokeWidth={1.25} />
          </VennZone>

          {/* RECORD circle (right, small) → blindspot */}
          <VennZone zone="blindspot" selected={selected === 'blindspot'} onSelect={onSelect} label={`${lang === 'es' ? 'Registro oficial' : 'Official record'}: ${formatNumber(w.official_record)}`}>
            <circle cx={471} cy={205} r={72} {...fill(C_RECORD, selected === 'blindspot')} />
          </VennZone>

          {/* OVERLAP lens (record clipped to model) → confirmed */}
          <VennZone zone="confirmed" selected={selected === 'confirmed'} onSelect={onSelect} label={`${lang === 'es' ? 'Ambos coinciden' : 'Both agree'}: ${formatNumber(w.overlap)}`}>
            <circle cx={471} cy={205} r={72} clipPath="url(#venn-lens-clip)" fill={C_OVERLAP} fillOpacity={selected === 'confirmed' ? 0.55 : 0.32} stroke={C_OVERLAP} strokeOpacity={selected === 'confirmed' ? 1 : 0.6} strokeWidth={selected === 'confirmed' ? 2.5 : 1.5} />
          </VennZone>

          {/* ── Labels (non-interactive) ── */}
          <g pointerEvents="none" style={{ fontFamily: 'var(--font-family-mono, "IBM Plex Mono", monospace)' }}>
            {/* Model */}
            <text x={120} y={104} fill={C_MODEL} fontSize={11} fontWeight={700} letterSpacing="1.6">{lang === 'es' ? 'MODELO RUBLI' : 'RUBLI MODEL'}</text>
            <text x={119} y={146} fill={C_MODEL} fontSize={42} fontWeight={800} fontStyle="italic" style={{ fontFamily: SERIF }}>{formatNumber(w.model_flags)}</text>
            <text x={121} y={166} fill="var(--color-text-muted)" fontSize={11}>{lang === 'es' ? 'marcados · riesgo ≥40' : 'flagged · risk ≥40'}</text>
            {/* Ghost core */}
            <text x={203} y={264} fill={C_MODEL} fontSize={23} fontWeight={800} fontStyle="italic" textAnchor="middle" style={{ fontFamily: SERIF }}>{formatNumber(w.ghost_signature)}</text>
            <text x={203} y={281} fill="var(--color-text-secondary)" fontSize={9} fontWeight={700} letterSpacing="0.5" textAnchor="middle">{lang === 'es' ? 'HUELLA FANTASMA' : 'GHOST SIGNATURE'}</text>
            {/* Record (labels to the right) */}
            <line x1={548} y1={150} x2={520} y2={178} stroke="var(--color-border)" strokeWidth={1} />
            <text x={556} y={140} fill={C_RECORD} fontSize={11} fontWeight={700} letterSpacing="1.4">{lang === 'es' ? 'REGISTRO OFICIAL' : 'OFFICIAL RECORD'}</text>
            <text x={556} y={156} fill="var(--color-text-muted)" fontSize={10}>SAT EFOS + SFP</text>
            <text x={556} y={192} fill={C_RECORD} fontSize={30} fontWeight={800} fontStyle="italic" style={{ fontFamily: SERIF }}>{formatNumber(w.official_record)}</text>
            {/* Blind spots */}
            <line x1={512} y1={250} x2={500} y2={232} stroke="var(--color-border)" strokeWidth={1} />
            <text x={516} y={262} fill="var(--color-text-secondary)" fontSize={11} fontWeight={700}>
              <tspan fontStyle="italic" fontSize={15} style={{ fontFamily: SERIF }}>{formatNumber(w.blind_spots)}</tspan>
              <tspan dx="6" fill="var(--color-text-muted)" fontWeight={400}>{lang === 'es' ? 'puntos ciegos' : 'blind spots'}</tspan>
            </text>
            {/* Overlap callout */}
            <line x1={418} y1={86} x2={418} y2={150} stroke={C_OVERLAP} strokeOpacity={0.6} strokeWidth={1} />
            <text x={418} y={62} fill={C_OVERLAP} fontSize={30} fontWeight={800} fontStyle="italic" textAnchor="middle" style={{ fontFamily: SERIF }}>{formatNumber(w.overlap)}</text>
            <text x={418} y={80} fill="var(--color-text-secondary)" fontSize={10} fontWeight={700} letterSpacing="0.5" textAnchor="middle">{lang === 'es' ? 'AMBOS COINCIDEN' : 'BOTH AGREE'}</text>
          </g>
        </svg>

        <p className="mt-1 text-center text-[11px] font-mono text-text-muted leading-[1.6] max-w-[60ch] mx-auto">
          {lang === 'es'
            ? <>Dos sistemas cazando el mismo delito comparten <strong className="text-text-secondary tabular-nums">{formatNumber(w.overlap)}</strong> nombres. <span className="text-text-secondary">Toca una región</span> para leer sus proveedores.</>
            : <>Two systems hunting the same crime share <strong className="text-text-secondary tabular-nums">{formatNumber(w.overlap)}</strong> names. <span className="text-text-secondary">Click a region</span> to read its vendors.</>}
        </p>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

const ZONE_META: Record<ZoneKey, { accent: string }> = {
  ghost: { accent: C_MODEL },
  confirmed: { accent: C_OVERLAP },
  blindspot: { accent: C_RECORD },
}

export default function Intersection() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const gtCount = useGroundTruthCount()
  const [zone, setZone] = useState<ZoneKey>('ghost')

  const { data, isLoading } = useQuery({
    queryKey: ['intersection', 'summary-v3', 30],
    queryFn: () => intersectionApi.getSummary(30),
    staleTime: 10 * 60 * 1000,
  })

  const w = data?.worlds
  const z = data?.zones[zone]

  const zoneCopy = (k: ZoneKey): { kicker: string; deck: React.ReactNode } => {
    if (!w) return { kicker: '', deck: null }
    if (k === 'ghost') return {
      kicker: lang === 'es' ? 'El modelo marca · el Estado calla' : 'The model flags · the state is silent',
      deck: lang === 'es'
        ? <><strong className="text-text-primary tabular-nums">{formatNumber(w.ghost_signature)}</strong> proveedores con la huella de empresa fantasma (patrones P2/P3, adjudicación única, desaparición) que el registro 69-B del SAT nunca nombró.</>
        : <><strong className="text-text-primary tabular-nums">{formatNumber(w.ghost_signature)}</strong> suppliers carrying the ghost-company fingerprint (P2/P3 patterns, single-bidding, disappearance) that SAT's 69-B registry never named.</>,
    }
    if (k === 'confirmed') return {
      kicker: lang === 'es' ? 'Ambos coinciden' : 'Both agree',
      deck: lang === 'es'
        ? <><strong className="text-text-primary tabular-nums">{formatNumber(w.overlap)}</strong> proveedores que RUBLI marca de alto riesgo y que además aparecen en SAT EFOS o SFP. La única corroboración externa genuina.</>
        : <><strong className="text-text-primary tabular-nums">{formatNumber(w.overlap)}</strong> vendors RUBLI flags as high-risk that also appear on SAT EFOS or SFP. The only genuine external corroboration.</>,
    }
    return {
      kicker: lang === 'es' ? 'El Estado marca · el modelo no lo ve' : 'The state flags · the model is blind',
      deck: lang === 'es'
        ? <><strong className="text-text-primary tabular-nums">{formatNumber(w.blind_spots)}</strong> proveedores sancionados o listados (EFOS/SFP) que el modelo califica de bajo riesgo. Honestidad: aquí RUBLI no ve.</>
        : <><strong className="text-text-primary tabular-nums">{formatNumber(w.blind_spots)}</strong> sanctioned or listed vendors (EFOS/SFP) the model rates low-risk. Honesty: this is where RUBLI is blind.</>,
    }
  }

  const copy = zoneCopy(zone)
  const accent = ZONE_META[zone].accent
  const setAsideNames = (data?.set_aside.sample ?? []).slice(0, 3).map((v) => v.vendor_name)

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Masthead */}
      <header className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-5" style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIII</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>{lang === 'es' ? 'Informe de inteligencia · La brecha regulatoria' : 'Intelligence brief · The regulatory gap'}</span>
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-12 w-[34rem] max-w-full" /><Skeleton className="h-4 w-[40rem] max-w-full" /></div>
        ) : w ? (
          <div>
            <h1 className="text-text-primary leading-[1.05]" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 'clamp(30px, 5.2vw, 56px)', letterSpacing: '-0.02em', maxWidth: '20ch' }}>
              {lang === 'es' ? 'Dos formas de ver la corrupción. Casi nunca coinciden.' : 'Two ways of seeing corruption. They almost never agree.'}
            </h1>
            <p className="mt-4 text-text-secondary max-w-[62ch]" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.5 }}>
              {lang === 'es'
                ? <>El modelo de RUBLI marca <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.model_flags)}</strong> proveedores de alto riesgo. El registro oficial del Estado — SAT EFOS + SFP — lista <strong className="tabular-nums" style={{ color: C_RECORD }}>{formatNumber(w.official_record)}</strong>. Comparten <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{formatNumber(w.overlap)}</strong>.</>
                : <>RUBLI's model flags <strong className="tabular-nums" style={{ color: C_MODEL }}>{formatNumber(w.model_flags)}</strong> high-risk suppliers. The state's official record — SAT EFOS + SFP — lists <strong className="tabular-nums" style={{ color: C_RECORD }}>{formatNumber(w.official_record)}</strong>. They share <strong className="tabular-nums" style={{ color: C_OVERLAP }}>{formatNumber(w.overlap)}</strong>.</>}
            </p>
          </div>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[420px] w-full rounded-sm" />
          <div className="rounded-sm border border-border bg-background-card p-5 space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </div>
      ) : !data || !w || !z ? null : (
        <div className="space-y-7">
          {/* THE VENN — centerpiece */}
          <TwoWorldsVenn w={w} selected={zone} onSelect={setZone} lang={lang} />

          {/* Zone tabs (also reflect Venn selection) */}
          <div className="flex items-stretch gap-2 -mt-2" role="tablist" aria-label={lang === 'es' ? 'Regiones' : 'Regions'}>
            {(['ghost', 'confirmed', 'blindspot'] as ZoneKey[]).map((k) => {
              const active = zone === k
              const a = ZONE_META[k].accent
              const labels: Record<ZoneKey, [string, string]> = {
                ghost: ['Solo el modelo', 'Model only'],
                confirmed: ['Ambos', 'Both agree'],
                blindspot: ['Solo el Estado', 'State only'],
              }
              const cnt = k === 'ghost' ? w.ghost_signature : k === 'confirmed' ? w.overlap : w.blind_spots
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setZone(k)}
                  className="flex-1 px-3 py-2.5 rounded-sm text-left transition-colors"
                  style={{ border: `1px solid ${active ? a : 'var(--color-border)'}`, background: active ? `${a}12` : 'transparent' }}
                >
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: active ? a : 'var(--color-text-muted)' }}>{lang === 'es' ? labels[k][0] : labels[k][1]}</span>
                  <span className="block font-mono text-sm font-bold tabular-nums mt-0.5" style={{ color: active ? a : 'var(--color-text-secondary)' }}>{formatNumber(cnt)}</span>
                </button>
              )
            })}
          </div>

          {/* ZONE DETAIL — the drill-down (no longer the page) */}
          <section className="rounded-sm border border-border bg-background-card overflow-hidden" style={{ borderLeft: `4px solid ${accent}` }}>
            <header className="px-5 py-4 border-b border-border">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{copy.kicker}</p>
              <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-[72ch]">{copy.deck}</p>
            </header>
            {z.vendors.length > 0 ? (
              <div>{z.vendors.slice(0, 18).map((v, i) => <LedgerRow key={v.vendor_id} v={v} rank={i + 1} lang={lang} />)}</div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-muted font-mono" role="status">{lang === 'es' ? 'Sin proveedores.' : 'No vendors.'}</div>
            )}
            {zone === 'ghost' && z.count > 18 && (
              <Link to="/aria" className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border text-[11px] font-mono tracking-[0.12em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors">
                <span>{lang === 'es' ? 'Investigar en La Cola (ARIA)' : 'Investigate in the Queue (ARIA)'}</span>
                <span>+{formatNumber(z.count - 18)} {lang === 'es' ? 'más' : 'more'} →</span>
              </Link>
            )}
          </section>

          {/* HONEST LIMITS */}
          <section>
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">{lang === 'es' ? 'Límites honestos' : 'Honest limits'}</p>
            <div className="space-y-3">
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: `3px solid ${RISK_COLORS.low}` }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es'
                    ? <><strong className="text-text-primary">El registro oficial excluye nuestro propio corpus.</strong> El «registro» son solo SAT EFOS + SFP. Otros <strong className="tabular-nums">{formatNumber(w.self_documented)}</strong> proveedores marcados aparecen en el corpus de casos de RUBLI — pero el modelo se entrenó con ellos, así que no cuenta como corroboración externa.</>
                    : <><strong className="text-text-primary">The official record excludes our own corpus.</strong> "Record" means SAT EFOS + SFP only. Another <strong className="tabular-nums">{formatNumber(w.self_documented)}</strong> flagged vendors appear in RUBLI's case corpus — but the model trained on those, so it doesn't count as external corroboration.</>}
                </p>
              </div>
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: '3px solid #3f3f46' }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es'
                    ? <><strong className="text-text-primary">{formatNumber(data.set_aside.count)} apartados como escala legítima.</strong> Aseguradoras y grandes contratistas {setAsideNames.length > 0 && <>(p. ej. {setAsideNames.join(', ')})</>} puntúan alto por volumen pero no son fantasmas — fuera del círculo del modelo.</>
                    : <><strong className="text-text-primary">{formatNumber(data.set_aside.count)} set aside as legitimate scale.</strong> Insurers and large contractors {setAsideNames.length > 0 && <>(e.g. {setAsideNames.join(', ')})</>} score high on volume but aren't ghosts — excluded from the model circle.</>}
                </p>
              </div>
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: `3px solid ${C_MODEL}` }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es'
                    ? <><strong className="text-text-primary">Una huella es una pista, no un veredicto.</strong> Coincidir con patrones de empresa fantasma amerita revisión, no acusación.</>
                    : <><strong className="text-text-primary">A signature is a lead, not a verdict.</strong> Matching shell-company patterns warrants review, not accusation.</>}
                </p>
              </div>
            </div>
          </section>

          {/* METHODOLOGY */}
          <div className="mt-2 pt-6 border-t border-border">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">{lang === 'es' ? 'Metodología' : 'Methodology'}</p>
            <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
              {lang === 'es'
                ? <>Dos conjuntos sobre aria_queue. <span className="font-mono">Modelo</span> = proveedores con puntaje RUBLI ≥ {(data.thresholds.rubli_flags * 100).toFixed(0)}/100 ({CURRENT_MODEL_VERSION}, calibrado OCDE). <span className="font-mono">Registro oficial</span> = SAT EFOS (Art. 69-B, {formatNumber(EFOS_REGISTRY_SIZE)} RFCs) + SFP (sanciones firmes) — NO incluye el corpus de RUBLI ({gtCount.cases.toLocaleString('es-MX')} casos), que sería circular. Huella fantasma = patrones {data.thresholds.ghost_patterns.join('/')}, ≥ {data.thresholds.min_contracts} contratos, depurada de falsos positivos. Ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>.</>
                : <>Two sets over aria_queue. <span className="font-mono">Model</span> = suppliers at RUBLI score ≥ {(data.thresholds.rubli_flags * 100).toFixed(0)}/100 ({CURRENT_MODEL_VERSION}, OECD-calibrated). <span className="font-mono">Official record</span> = SAT EFOS (Art. 69-B, {formatNumber(EFOS_REGISTRY_SIZE)} RFCs) + SFP (final sanctions) — excludes RUBLI's own corpus ({gtCount.cases.toLocaleString()} cases), which would be circular. Ghost signature = patterns {data.thresholds.ghost_patterns.join('/')}, ≥ {data.thresholds.min_contracts} contracts, cleaned of false positives. See <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>.</>}
            </p>
          </div>
        </div>
      )}
      <PageFooter />
    </div>
  )
}
