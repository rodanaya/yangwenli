/**
 * ClusterActa — «El acta del nudo» / "The knot's record" (§3.6).
 *
 * Replaces the former «§ Firma del cúmulo» + «§ Más centrales» 2-card grid
 * with a single full-width charge sheet: a verdict seal + synthesized lede
 * across the top, then a 2-column grid — LOS CARGOS (charges, FT deviation-
 * bar grammar) | LOS SEÑALADOS (pagerank roster) — plus an optional
 * «Compradores asediados» cross-reference block.
 *
 * Named precedents: ActaLedger margin-note grammar (glyph + severity word +
 * clause + colored left rule) for the charges; FT Visual Vocabulary
 * deviation bar for the OECD rows; cluster-verdict.ts's 4-bucket honesty
 * contract for the seal.
 *
 * Spec: network-la-trama-fable-2026-07-02-spec.md §3.6 / §4.2.
 */
import type { ReactNode } from 'react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import {
  OECD_DIRECT_AWARD_LIMIT,
  OECD_SINGLE_BID_LIMIT,
  PATTERN_COLORS,
  RISK_COLORS,
  RISK_TEXT_COLORS,
} from '@/lib/constants'
import { formatEntityName } from '@/lib/entity/format'
import { getClusterVerdict } from '@/lib/network/cluster-verdict'
import { cn, formatDualCurrency } from '@/lib/utils'
import type { CommunityGraphResponse, CommunityIndexItem } from '@/api/client'

// ── FT deviation-bar micro-chart — copied verbatim from the page-level
// helper it retires (RedesKnownDossier.tsx `DeviationRow`), now owned here. ──
function DeviationRow({
  label,
  value,
  benchmark,
  benchmarkLabel,
  maxDelta,
}: {
  label: string
  value: number
  benchmark: number
  benchmarkLabel: string
  maxDelta: number
}) {
  const delta = value - benchmark
  const isAbove = delta > 0
  const halfPct = Math.min(Math.abs(delta) / maxDelta, 1) * 50
  const fill = isAbove ? RISK_COLORS.critical : 'var(--color-text-muted)'
  const textFill = isAbove ? RISK_TEXT_COLORS.critical : 'var(--color-text-muted)'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[12px] font-mono text-text-secondary">{label}</span>
        <span className="text-[13px] font-mono text-text-muted">
          <span style={{ color: textFill, fontWeight: 700 }}>{Math.round(value * 100)}%</span>
          {' · '}{benchmarkLabel} {Math.round(benchmark * 100)}%{' '}
          <span style={{ color: textFill }}>{isAbove ? '↑' : '↓'}{Math.abs(Math.round(delta * 100))}pp</span>
        </span>
      </div>
      <div className="relative h-[5px] w-full rounded-full bg-border/40" aria-hidden="true">
        <span className="absolute left-1/2 top-[-2px] h-[9px] w-px bg-text-muted/60" />
        <span
          className="absolute top-[1px] h-[3px] rounded-full"
          style={{ background: fill, opacity: 0.9, left: isAbove ? '50%' : `${50 - halfPct}%`, width: `${halfPct}%` }}
        />
      </div>
    </div>
  )
}

// ── A single margin-note charge row, ActaLedger grammar. ────────────────────
function ChargeRow({
  glyph,
  severity,
  color,
  children,
}: {
  glyph: '▲' | '·'
  severity?: string
  color: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 py-1 pl-2.5" style={{ borderLeft: `2px solid ${color}` }}>
      <span aria-hidden="true" style={{ fontSize: 12, color, fontWeight: 700, minWidth: 12, textAlign: 'center' }}>
        {glyph}
      </span>
      <span className="min-w-0">
        {severity && (
          <span
            className="font-mono block"
            style={{ fontSize: 8.5, letterSpacing: '0.10em', fontWeight: 700, color }}
          >
            {severity}
          </span>
        )}
        <span
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 12.5,
            color: 'var(--color-text-primary)',
            lineHeight: 1.35,
          }}
        >
          {children}
        </span>
      </span>
    </div>
  )
}

interface ClusterActaProps {
  community: CommunityIndexItem
  graph: CommunityGraphResponse
  meshMedianRisk: number
  besiegedBuyers: Array<{ institutionId: number; name: string; vendorCount: number }>
  selectedVendorId: number | null
  onViewVendorRing: (vendorId: number) => void
  onOpenBuyerSiege: (institutionId: number) => void
  lang: 'en' | 'es'
}

export function ClusterActa({
  community,
  graph,
  meshMedianRisk,
  besiegedBuyers,
  selectedVendorId,
  onViewVendorRing,
  onOpenBuyerSiege,
  lang,
}: ClusterActaProps) {
  const isEs = lang === 'es'

  const verdict = getClusterVerdict(
    {
      avg_risk: graph.stats.avg_risk,
      size: community.size,
      gt_vendor_count: graph.stats.gt_vendor_count,
      sanctioned_count: graph.stats.sanctioned_count,
    },
    meshMedianRisk,
  )

  // ── Lede — every param live ────────────────────────────────────────────
  const r = Math.round(graph.stats.avg_risk * 100)
  const x = (meshMedianRisk > 0 ? graph.stats.avg_risk / meshMedianRisk : 0).toFixed(1)
  const s = graph.stats.sanctioned_count
  const gt = graph.stats.gt_vendor_count
  const hubName = formatEntityName('vendor', community.hub_vendor_name, 'sm')

  const lede = isEs
    ? `${community.size} firmas en la órbita de ${hubName} movieron ${formatDualCurrency(graph.stats.total_value_mxn)} con un indicador de riesgo promedio de ${r}% — ${x}× la mediana de la trama${s > 0 ? `; ${s} sancionada(s) por la SFP` : ''}${gt > 0 ? `; ${gt} en casos documentados` : ''}.`
    : `${community.size} firms in the orbit of ${hubName} moved ${formatDualCurrency(graph.stats.total_value_mxn)} at an average risk indicator of ${r}% — ${x}× the mesh median${s > 0 ? `; ${s} SFP-sanctioned` : ''}${gt > 0 ? `; ${gt} in documented cases` : ''}.`

  // ── Los cargos ──────────────────────────────────────────────────────────
  const daRate = graph.stats.da_rate ?? 0
  const sbRate = graph.stats.sb_rate ?? 0
  const daDelta = Math.round((daRate - OECD_DIRECT_AWARD_LIMIT) * 100)
  const sbDelta = Math.round((sbRate - OECD_SINGLE_BID_LIMIT) * 100)
  const daAbove = daDelta > 0
  const sbAbove = sbDelta > 0

  const drawnEdges = graph.edges.length
  const collusionEdges = graph.edges.filter((e) => e.is_potential_collusion).length

  const showNullFindings = s === 0 && gt === 0

  const coverage = graph.stats.labeled_count / Math.max(community.size, 1)
  const patternMixVisible = coverage >= 0.3 && graph.stats.pattern_mix.length > 0

  // ── Los señalados — pagerank roster, top-8 ─────────────────────────────
  const roster = [...graph.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 8)

  return (
    <div
      className="mt-4 rounded-sm border border-border bg-background-card px-5 py-4"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)' }}
    >
      {/* Seal + lede */}
      <div className="flex items-start gap-2.5 mb-1.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex-shrink-0"
          style={{ width: 10, height: 10, background: verdict.color, display: 'inline-block' }}
        />
        <span
          className="font-mono font-bold uppercase tracking-[0.18em]"
          style={{ fontSize: 12, color: verdict.color }}
        >
          {isEs ? verdict.label_es : verdict.label_en}
        </span>
        <span className="ml-auto font-mono text-[13px] text-text-muted/60">C-{community.community_id}</span>
      </div>
      <p
        className="mb-1.5"
        style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 15, color: 'var(--color-text-primary)', lineHeight: 1.45 }}
      >
        «{lede}»
      </p>
      <p className="mb-4 font-mono" style={{ fontSize: 12, color: verdict.color, lineHeight: 1.5 }}>
        {isEs ? verdict.rationale_es : verdict.rationale_en}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 border-t border-border/50 pt-4">
        {/* ── LOS CARGOS ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-2.5 text-[13px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
            {isEs ? '§ Los cargos' : '§ The charges'}
          </p>
          <div className="space-y-2">
            <ChargeRow
              glyph={daAbove ? '▲' : '·'}
              severity={daAbove ? (isEs ? 'ALTO' : 'HIGH') : undefined}
              color={daAbove ? RISK_COLORS.critical : 'var(--color-text-muted)'}
            >
              {isEs
                ? `Adjudicación directa ${Math.round(daRate * 100)}% — ${daAbove ? '↑' : '↓'}${Math.abs(daDelta)}pp ${daAbove ? 'por encima del' : 'por debajo del'} techo OCDE (${Math.round(OECD_DIRECT_AWARD_LIMIT * 100)}%)`
                : `Direct award ${Math.round(daRate * 100)}% — ${daAbove ? '↑' : '↓'}${Math.abs(daDelta)}pp ${daAbove ? 'above' : 'below'} the OECD ceiling (${Math.round(OECD_DIRECT_AWARD_LIMIT * 100)}%)`}
              <DeviationRow
                label=""
                value={daRate}
                benchmark={OECD_DIRECT_AWARD_LIMIT}
                benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                maxDelta={0.75}
              />
            </ChargeRow>
            <ChargeRow
              glyph={sbAbove ? '▲' : '·'}
              severity={sbAbove ? (isEs ? 'ALTO' : 'HIGH') : undefined}
              color={sbAbove ? RISK_COLORS.critical : 'var(--color-text-muted)'}
            >
              {isEs
                ? `Propuesta única ${Math.round(sbRate * 100)}% — ${sbAbove ? '↑' : '↓'}${Math.abs(sbDelta)}pp ${sbAbove ? 'por encima del' : 'por debajo del'} techo OCDE (${Math.round(OECD_SINGLE_BID_LIMIT * 100)}%)`
                : `Single bid ${Math.round(sbRate * 100)}% — ${sbAbove ? '↑' : '↓'}${Math.abs(sbDelta)}pp ${sbAbove ? 'above' : 'below'} the OECD ceiling (${Math.round(OECD_SINGLE_BID_LIMIT * 100)}%)`}
              <DeviationRow
                label=""
                value={sbRate}
                benchmark={OECD_SINGLE_BID_LIMIT}
                benchmarkLabel={isEs ? 'OCDE' : 'OECD'}
                maxDelta={0.75}
              />
            </ChargeRow>
            <ChargeRow glyph={collusionEdges > 0 ? '▲' : '·'} color={collusionEdges > 0 ? RISK_COLORS.high : 'var(--color-text-muted)'}>
              {isEs
                ? `${collusionEdges} de ${drawnEdges} aristas dibujadas señaladas por colusión`
                : `${collusionEdges} of ${drawnEdges} drawn edges flagged for collusion`}
            </ChargeRow>
            {!showNullFindings && s > 0 && (
              <ChargeRow glyph="▲" color={RISK_TEXT_COLORS.critical}>
                {isEs
                  ? `${s} miembro(s) en el registro de sancionados SFP`
                  : `${s} member(s) in the SFP sanction registry`}
              </ChargeRow>
            )}
            {!showNullFindings && gt > 0 && (
              <ChargeRow glyph="▲" color="var(--color-accent)">
                {isEs
                  ? `${gt} miembro(s) en casos documentados`
                  : `${gt} member(s) in documented cases`}
              </ChargeRow>
            )}
            {showNullFindings && (
              <ChargeRow glyph="·" color="var(--color-text-muted)">
                <span style={{ fontStyle: 'normal', color: 'var(--color-text-muted)' }}>
                  {isEs
                    ? 'Sin sanciones SFP ni casos documentados entre sus miembros.'
                    : 'No SFP sanctions or documented cases among its members.'}
                </span>
              </ChargeRow>
            )}
          </div>

          {/* Pattern mix — visible suppression below 30% coverage */}
          {patternMixVisible ? (
            <div className="mt-3 border-t border-border/50 pt-2.5">
              <p className="mb-1 text-[13px] font-mono uppercase tracking-[0.14em] text-text-muted/60">
                {isEs ? 'Mezcla de patrones ARIA' : 'ARIA pattern mix'}
              </p>
              <div className="flex h-[5px] w-full overflow-hidden rounded-full bg-border/40" aria-hidden="true">
                {graph.stats.pattern_mix.map((m) => (
                  <span
                    key={m.pattern}
                    style={{
                      width: `${(m.count / Math.max(graph.stats.labeled_count, 1)) * 100}%`,
                      background: PATTERN_COLORS[m.pattern] ?? 'var(--color-text-muted)',
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[8.5px] font-mono text-text-muted/60">
                {graph.stats.pattern_mix
                  .map((m) => `${m.pattern} ${Math.round((m.count / Math.max(graph.stats.labeled_count, 1)) * 100)}%`)
                  .join(' · ')}{' '}
                — {isEs ? `sobre ${graph.stats.labeled_count} clasificados` : `over ${graph.stats.labeled_count} labeled`}
              </p>
            </div>
          ) : (
            <p className="mt-3 border-t border-border/50 pt-2.5 text-[13px] font-mono text-text-muted/60">
              {isEs
                ? `Clasificación ARIA en ${graph.stats.labeled_count} de ${community.size} miembros — mezcla omitida por cobertura <30%.`
                : `ARIA classification on ${graph.stats.labeled_count} of ${community.size} members — mix withheld below 30% coverage.`}
            </p>
          )}
        </div>

        {/* ── LOS SEÑALADOS + COMPRADORES ASEDIADOS ────────────────────── */}
        <div>
          <p className="text-[13px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
            {isEs ? '§ Los señalados · por influencia (pagerank)' : '§ The named · by influence (pagerank)'}
          </p>
          <p className="mb-2.5 text-[8.5px] font-mono text-text-muted/45">
            {isEs ? 'centralidad pagerank · conexiones = grado' : 'pagerank centrality · ties = degree'}
          </p>
          <ul className="space-y-1.5">
            {roster.map((n, i) => {
              const percentile = roster.length > 1 ? Math.round((1 - i / (roster.length - 1)) * 100) : 100
              return (
                <li key={n.vendor_id} className="min-w-0">
                  <EntityIdentityChip
                    type="vendor"
                    id={n.vendor_id}
                    name={n.name}
                    size="sm"
                    riskScore={n.risk_score}
                    fullName
                  />
                  <span
                    className="ml-6 text-[13px] font-mono text-text-muted/55"
                    title={isEs ? 'conteo bruto de co-licitaciones' : 'raw co-bidding tie count'}
                  >
                    {n.degree} {isEs ? 'conexiones' : 'ties'} · {percentile}º
                    {n.is_sanctioned && <span style={{ color: RISK_TEXT_COLORS.critical }}> · SFP</span>}
                  </span>
                </li>
              )
            })}
          </ul>

          {selectedVendorId != null && (
            <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between gap-2">
              <span className="text-[12px] font-mono text-text-muted/70">
                {isEs ? 'Actor seleccionado en la trama' : 'Actor selected in the mesh'}
              </span>
              <button
                type="button"
                onClick={() => onViewVendorRing(selectedVendorId)}
                className="rounded-sm border border-accent/40 bg-accent/8 px-2.5 py-1 text-[13px] font-mono font-bold uppercase tracking-wider text-accent hover:bg-accent/15 transition-colors"
              >
                {isEs ? 'Ver su red →' : 'View its ring →'}
              </button>
            </div>
          )}

          {besiegedBuyers.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-3">
              <p className="mb-2 text-[13px] font-mono uppercase tracking-[0.18em] text-text-muted/60">
                {isEs ? '§ Compradores asediados por este nudo' : '§ Buyers besieged by this knot'}
              </p>
              <ul className="space-y-1.5">
                {besiegedBuyers.slice(0, 4).map((b) => (
                  <li key={b.institutionId} className={cn('flex items-center justify-between gap-2')}>
                    <EntityIdentityChip type="institution" id={b.institutionId} name={b.name} size="sm" fullName />
                    <button
                      type="button"
                      onClick={() => onOpenBuyerSiege(b.institutionId)}
                      className="flex-shrink-0 font-mono text-[13px] font-bold uppercase tracking-wider text-accent hover:opacity-70 transition-opacity"
                    >
                      {isEs ? 'sitio →' : 'siege →'}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[8.5px] font-mono text-text-muted/50">
                {isEs ? 'entre los 120 mayores compradores federales' : 'among the 120 largest federal buyers'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
