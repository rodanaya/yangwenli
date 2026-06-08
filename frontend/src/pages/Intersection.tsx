/**
 * Intersection — the model-vs-official-record reconciliation surface.
 *
 * v2 (2026-06-08 redesign). The previous version sold three claims it
 * couldn't back up: a "novelty" hero topped by Halliburton / the national
 * insurers (legitimate scale, not ghosts regulators missed); a "confirmed"
 * count that was ~93% self-confirmation against the model's own training
 * corpus; and a "blind spot" that was the model's deliberate FP-suppression
 * relabelled as failure. It also rendered the same red number three times
 * and drew a 3-box pseudo-treemap that encoded nothing.
 *
 * This version is honest and list-first:
 *   1. THE LEDGER is the hero — the ghost-signature vendors (P2/P3 patterns,
 *      cleaned of structural FPs) that carry SAT's own Art. 69-B fingerprint
 *      but were never listed. Apples-to-apples; named vendors over aggregates.
 *   2. THE CORROBORATION LADDER replaces the treemap — it splits the high-risk
 *      census into genuine-external / self-documented / uncorroborated so the
 *      circularity is visible, not sold past.
 *   3. HONEST LIMITS promotes the caveats into content, including the
 *      set-aside list (the giants we excluded — audit us).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, type IntersectionVendor, type IntersectionSummary } from '@/api/client'
import { formatNumber, formatCompactMXN, cn } from '@/lib/utils'
import {
  SECTOR_COLORS,
  SECTORS,
  RISK_COLORS,
  CURRENT_MODEL_VERSION,
  getSectorName,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { useGroundTruthCount } from '@/hooks/useGroundTruthCount'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PageFooter } from '@/components/layout/PageFooter'

const EFOS_REGISTRY_SIZE = 13_960 // SAT Art. 69-B definitivo RFCs (national)

const SERIF = '"Playfair Display", "EB Garamond", Georgia, serif'

function pctText(n: number, total: number): string {
  if (!total) return '0%'
  const p = (n / total) * 100
  return p < 1 ? p.toFixed(1) + '%' : Math.round(p) + '%'
}

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

// ─── Ledger row — a ghost-signature vendor as a mini-case ──────────────────

function LedgerRow({ v, rank, lang }: { v: IntersectionVendor; rank: number; lang: string }) {
  const sectorColor = v.primary_sector_name
    ? SECTOR_COLORS[v.primary_sector_name.toLowerCase()] ?? '#64748b'
    : '#64748b'
  const riskColor = RISK_COLORS[getRiskLevelFromScore(v.avg_risk_score)]
  const da = v.direct_award_rate != null ? Math.round(v.direct_award_rate * 100) : null
  const sb = v.single_bid_rate != null ? Math.round(v.single_bid_rate * 100) : null
  const pat = patternLabel(v.primary_pattern, lang)

  // The strongest WHY chips — disappeared and high single-bid/direct-award are
  // the shell signatures worth surfacing inline.
  const whyChips: Array<{ label: string; strong?: boolean }> = []
  if (v.is_disappeared) whyChips.push({ label: lang === 'es' ? 'Desaparecido' : 'Disappeared', strong: true })
  if (sb != null && sb >= 50) whyChips.push({ label: (lang === 'es' ? 'Propuesta única ' : 'Single-bid ') + sb + '%' })
  else if (da != null && da >= 70) whyChips.push({ label: (lang === 'es' ? 'Adj. directa ' : 'Direct-award ') + da + '%' })

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" />
          {pat && (
            <span
              className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
              style={{ color: riskColor, background: `${riskColor}14`, border: `1px solid ${riskColor}33` }}
            >
              {pat}
            </span>
          )}
          {whyChips.map((c) => (
            <span
              key={c.label}
              className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
              style={
                c.strong
                  ? { color: RISK_COLORS.critical, background: `${RISK_COLORS.critical}14`, border: `1px solid ${RISK_COLORS.critical}33` }
                  : { color: 'var(--color-text-muted)', background: 'var(--color-background-elevated)', border: '1px solid var(--color-border)' }
              }
            >
              {c.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-text-muted">
          {v.primary_sector_name && (
            <span className="uppercase tracking-wider">
              {getSectorName(v.primary_sector_name.toLowerCase(), lang === 'es' ? 'es' : 'en')}
            </span>
          )}
          <span>·</span>
          <span className="tabular-nums">
            {formatNumber(v.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}
          </span>
          <span>·</span>
          <span className="tabular-nums">{formatCompactMXN(v.total_value_mxn)}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-sm font-bold tabular-nums" style={{ color: riskColor }}>
          {v.avg_risk_score.toFixed(2)}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">
          {lang === 'es' ? 'riesgo' : 'risk'}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
    </div>
  )
}

// ─── Corroboration ladder — replaces the empty 3-box treemap ───────────────
// A literal ladder of rungs (not a width-proportional census bar that the
// "other" mass would dominate). Three honest rungs over the high-risk census,
// with the uncorroborated rung broken into ghost / network / set-aside.

function Rung({
  label,
  gloss,
  count,
  total,
  color,
  indent = false,
  anchor,
}: {
  label: string
  gloss: string
  count: number
  total: number
  color: string
  indent?: boolean
  anchor?: React.ReactNode
}) {
  const widthPct = total ? Math.max(0.6, (count / total) * 100) : 0
  return (
    <div className={cn('py-2', indent && 'pl-5')}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] truncate"
            style={{ color: indent ? 'var(--color-text-secondary)' : color }}
          >
            {label}
          </span>
          {anchor}
        </div>
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <span
            className="tabular-nums leading-none"
            style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: indent ? '1rem' : '1.4rem', color: indent ? 'var(--color-text-secondary)' : color }}
          >
            {formatNumber(count)}
          </span>
          <span className="text-[10px] font-mono text-text-muted tabular-nums w-10 text-right">
            {pctText(count, total)}
          </span>
        </div>
      </div>
      <div className="mt-1.5 h-[3px] w-full rounded-full bg-background-elevated overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${widthPct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] font-mono text-text-muted leading-[1.4]">{gloss}</p>
    </div>
  )
}

function CorroborationLadder({ data, lang }: { data: IntersectionSummary; lang: string }) {
  const total = data.high_risk_total
  const { external_corroborated, self_documented, uncorroborated } = data.ladder
  const ghost = data.ghost.count
  const setAside = data.set_aside.count
  const other = Math.max(0, uncorroborated - ghost - setAside)

  const C_EXTERNAL = RISK_COLORS.high // amber — genuine outside match
  const C_SELF = RISK_COLORS.low // muted zinc — circular w/ training
  const C_GHOST = RISK_COLORS.critical // red — the live leads
  const C_OTHER = '#475569' // dim slate
  const C_ASIDE = '#3f3f46' // dimmest — excluded

  return (
    <section className="rounded-sm border border-border bg-background-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          {lang === 'es' ? 'La escalera de corroboración' : 'The corroboration ladder'}
        </p>
        <p className="text-[10px] font-mono text-text-muted tabular-nums">
          {formatNumber(total)} {lang === 'es' ? 'proveedores de alto riesgo' : 'high-risk vendors'}
        </p>
      </div>
      <div className="px-5 py-3 divide-y divide-border/60">
        <Rung
          label={lang === 'es' ? 'Corroborado por registros' : 'Externally corroborated'}
          gloss={lang === 'es' ? 'También en SAT EFOS o SFP — coincidencia externa genuina.' : 'Also on SAT EFOS or SFP — a genuine outside match.'}
          count={external_corroborated}
          total={total}
          color={C_EXTERNAL}
        />
        <Rung
          label={lang === 'es' ? 'Auto-documentado' : 'Self-documented'}
          gloss={lang === 'es' ? 'Solo en el corpus de casos de RUBLI — y el modelo se entrenó con ellos (circular).' : "Only in RUBLI's own case corpus — and the model trained on these (circular)."}
          count={self_documented}
          total={total}
          color={C_SELF}
        />
        <div className="pt-1">
          <Rung
            label={lang === 'es' ? 'Sin corroborar' : 'Uncorroborated'}
            gloss={lang === 'es' ? 'En ningún registro oficial. Aquí vive la brecha:' : 'On no official registry. The gap lives here:'}
            count={uncorroborated}
            total={total}
            color={C_OTHER}
          />
          <Rung
            indent
            label={lang === 'es' ? 'Huella fantasma → el expediente' : 'Ghost signature → the ledger'}
            gloss={lang === 'es' ? 'Patrones P2/P3 con la huella del 69-B. Es la apuesta de abajo.' : "P2/P3 patterns carrying the 69-B fingerprint. The ledger below."}
            count={ghost}
            total={uncorroborated}
            color={C_GHOST}
          />
          <Rung
            indent
            label={lang === 'es' ? 'Red / captura' : 'Network / capture'}
            gloss={lang === 'es' ? 'Riesgo elevado por estructura de red — señal más blanda.' : 'Elevated by network structure — a softer signal.'}
            count={other}
            total={uncorroborated}
            color={C_OTHER}
          />
          <Rung
            indent
            label={lang === 'es' ? 'Apartados (escala legítima)' : 'Set aside (legitimate scale)'}
            gloss={lang === 'es' ? 'Aseguradoras y grandes contratistas — auditables abajo.' : 'Insurers and large contractors — auditable below.'}
            count={setAside}
            total={uncorroborated}
            color={C_ASIDE}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Intersection() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const gtCount = useGroundTruthCount()
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['intersection', 'summary-v2', 40],
    queryFn: () => intersectionApi.getSummary(40),
    staleTime: 10 * 60 * 1000,
  })

  const ghostCount = data?.ghost.count ?? 0
  const externalCount = data?.ladder.external_corroborated ?? 0
  const uncorroboratedCount = data?.ladder.uncorroborated ?? 0

  const ledgerRows = (
    selectedSector
      ? (data?.ghost.vendors ?? []).filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector)
      : (data?.ghost.vendors ?? [])
  ).slice(0, 18)

  const setAsideNames = (data?.set_aside.sample ?? []).slice(0, 3).map((v) => v.vendor_name)

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Masthead — editorial headline, NOT a giant repeated number ── */}
      <header className="mb-9 pb-6 border-b border-border">
        <div
          className="flex items-center gap-3 mb-5"
          style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIII</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>{lang === 'es' ? 'Informe de inteligencia · La brecha regulatoria' : 'Intelligence brief · The regulatory gap'}</span>
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-[34rem] max-w-full" />
            <Skeleton className="h-4 w-[40rem] max-w-full" />
            <Skeleton className="h-3 w-96" />
          </div>
        ) : data ? (
          <div>
            <h1
              className="text-text-primary leading-[1.05]"
              style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 'clamp(30px, 5.2vw, 56px)', letterSpacing: '-0.02em', maxWidth: '18ch' }}
            >
              {lang === 'es' ? 'Los proveedores que los registros olvidaron.' : 'The vendors the registries forgot.'}
            </h1>
            <p
              className="mt-4 text-text-secondary max-w-[60ch]"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.5 }}
            >
              {lang === 'es' ? (
                <>
                  El registro 69-B del SAT lista{' '}
                  <span className="tabular-nums">{formatNumber(EFOS_REGISTRY_SIZE)}</span> empresas fantasma. RUBLI encuentra{' '}
                  <strong className="tabular-nums text-text-primary" style={{ color: RISK_COLORS.critical }}>{formatNumber(ghostCount)}</strong>{' '}
                  proveedores federales más con la misma huella — adjudicación única, desaparecidos, intermediarios — que la lista nunca nombró.
                </>
              ) : (
                <>
                  SAT's 69-B registry lists{' '}
                  <span className="tabular-nums">{formatNumber(EFOS_REGISTRY_SIZE)}</span> ghost companies. RUBLI finds{' '}
                  <strong className="tabular-nums text-text-primary" style={{ color: RISK_COLORS.critical }}>{formatNumber(ghostCount)}</strong>{' '}
                  more federal suppliers carrying the same fingerprint — single-bidder, disappeared, intermediary — the list never named.
                </>
              )}
            </p>
            <p className="mt-5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted leading-[1.7]">
              <strong className="tabular-nums" style={{ color: RISK_COLORS.critical }}>{formatNumber(ghostCount)}</strong>{' '}
              {lang === 'es' ? 'pistas con huella fantasma' : 'ghost-signature leads'}
              <span className="mx-2 opacity-50">·</span>
              <strong className="tabular-nums text-text-secondary">{formatNumber(externalCount)}</strong>{' '}
              {lang === 'es' ? 'corroboradas por registros' : 'externally corroborated'}
              <span className="mx-2 opacity-50">·</span>
              <strong className="tabular-nums text-text-secondary">{formatNumber(uncorroboratedCount)}</strong>{' '}
              {lang === 'es' ? 'de alto riesgo sin registro' : 'high-risk, no registry'}
            </p>
          </div>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <div className="rounded-sm border border-border bg-background-card p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="rounded-sm border border-border bg-background-card p-5 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : !data ? null : (
        <div className="space-y-7">
          {/* ── Corroboration ladder ── */}
          <CorroborationLadder data={data} lang={lang} />

          {/* ── The Ledger — the payoff ── */}
          <section className="rounded-sm border border-border bg-background-card overflow-hidden" style={{ borderLeft: `4px solid ${RISK_COLORS.critical}` }}>
            <header className="px-5 py-4 border-b border-border">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: RISK_COLORS.critical }}>
                  {lang === 'es' ? 'El expediente · huella fantasma' : 'The ledger · ghost signature'}
                </p>
                <p className="text-[10px] font-mono text-text-muted tabular-nums">
                  {formatNumber(ghostCount)} {lang === 'es' ? 'proveedores' : 'vendors'}
                </p>
              </div>
              <h2 className="mt-1.5 text-text-primary leading-tight" style={{ fontFamily: SERIF, fontSize: 'clamp(1.05rem, 1.6vw, 1.4rem)', fontWeight: 700, letterSpacing: '-0.015em' }}>
                {lang === 'es' ? 'Coinciden con la huella del 69-B — sin estar en la lista.' : 'They match the 69-B fingerprint — without being on the list.'}
              </h2>
              <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-[72ch]">
                {lang === 'es'
                  ? <>Patrones de empresa fantasma (P2) e intermediario (P3), con adjudicación única o desaparición registral, depurados de falsos positivos estructurales. Ordenados por IPS — prioridad de investigación.</>
                  : <>Ghost-company (P2) and intermediary (P3) patterns, with single-bidding or registry disappearance, cleaned of structural false positives. Ranked by IPS — investigation priority.</>}
              </p>
            </header>

            {/* Sector filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-border" role="group" aria-label={lang === 'es' ? 'Filtrar por sector' : 'Filter by sector'} style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedSector(null)}
                className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                style={{ border: `1px solid ${selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-border)'}`, color: selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-text-muted)', background: selectedSector === null ? 'var(--color-background-elevated)' : 'transparent', fontWeight: selectedSector === null ? 700 : 400 }}
                aria-pressed={selectedSector === null}
              >
                {lang === 'es' ? 'Todos' : 'All'}
              </button>
              {SECTORS.map((s) => {
                const active = selectedSector === s.code
                return (
                  <button
                    key={s.code}
                    onClick={() => setSelectedSector(active ? null : s.code)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                    style={{ border: `1px solid ${active ? s.color : `${s.color}44`}`, color: active ? s.color : 'var(--color-text-muted)', background: active ? `${s.color}12` : 'transparent', fontWeight: active ? 700 : 400 }}
                    aria-pressed={active}
                  >
                    {getSectorName(s.code, lang === 'es' ? 'es' : 'en')}
                  </button>
                )
              })}
            </div>

            {ledgerRows.length > 0 ? (
              <div>
                {ledgerRows.map((v, i) => (
                  <LedgerRow key={v.vendor_id} v={v} rank={i + 1} lang={lang} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-muted font-mono" role="status" aria-live="polite">
                {lang === 'es' ? 'Sin proveedores con huella fantasma en este sector.' : 'No ghost-signature vendors in this sector.'}
              </div>
            )}

            <Link
              to="/aria"
              className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border text-[11px] font-mono tracking-[0.12em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
            >
              <span>{lang === 'es' ? 'Investigar en La Cola (ARIA)' : 'Investigate in the Queue (ARIA)'}</span>
              <span>
                {ghostCount > ledgerRows.length ? `+${formatNumber(ghostCount - ledgerRows.length)} ${lang === 'es' ? 'más' : 'more'}` : ''} →
              </span>
            </Link>
          </section>

          {/* ── Honest limits — caveats promoted to content ── */}
          <section>
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-3">
              {lang === 'es' ? 'Límites honestos' : 'Honest limits'}
            </p>
            <div className="space-y-3">
              {/* 1 — circularity */}
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: `3px solid ${RISK_COLORS.low}` }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es' ? (
                    <><strong className="text-text-primary">«Corroborado» casi siempre somos nosotros.</strong> De {formatNumber(data.high_risk_total)} proveedores de alto riesgo, solo <strong className="tabular-nums">{formatNumber(externalCount)}</strong> tienen una coincidencia externa real (SAT EFOS / SFP). Los otros <strong className="tabular-nums">{formatNumber(data.ladder.self_documented)}</strong> solo aparecen en el corpus de casos de RUBLI — y el modelo se entrenó con ellos. No lo contamos como confirmación independiente.</>
                  ) : (
                    <><strong className="text-text-primary">"Corroborated" is mostly us.</strong> Of {formatNumber(data.high_risk_total)} high-risk vendors, only <strong className="tabular-nums">{formatNumber(externalCount)}</strong> carry a genuine outside match (SAT EFOS / SFP). The other <strong className="tabular-nums">{formatNumber(data.ladder.self_documented)}</strong> appear only in RUBLI's own case corpus — and the model trained on those. We don't count that as independent confirmation.</>
                  )}
                </p>
              </div>
              {/* 2 — set aside */}
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: '3px solid #3f3f46' }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es' ? (
                    <><strong className="text-text-primary">{formatNumber(data.set_aside.count)} apartados como escala legítima.</strong> Aseguradoras nacionales y grandes contratistas {setAsideNames.length > 0 && <>(p. ej. {setAsideNames.join(', ')})</>} puntúan alto por volumen, pero obviamente no son fantasmas. Los mostramos para que audites lo que excluimos.</>
                  ) : (
                    <><strong className="text-text-primary">{formatNumber(data.set_aside.count)} set aside as legitimate scale.</strong> National insurers and large contractors {setAsideNames.length > 0 && <>(e.g. {setAsideNames.join(', ')})</>} score high on volume features but obviously aren't ghosts. We show them so you can audit what we excluded.</>
                  )}
                </p>
              </div>
              {/* 3 — flag ≠ verdict */}
              <div className="px-4 py-3 rounded-sm bg-background-elevated" style={{ borderLeft: `3px solid ${RISK_COLORS.critical}` }}>
                <p className="text-[12px] leading-[1.6] text-text-secondary max-w-[80ch]">
                  {lang === 'es' ? (
                    <><strong className="text-text-primary">Una huella es una pista, no un veredicto.</strong> Estos proveedores coinciden con patrones asociados a empresas fantasma; eso amerita revisión, no acusación.</>
                  ) : (
                    <><strong className="text-text-primary">A signature is a lead, not a verdict.</strong> These vendors match patterns associated with shell companies; that warrants review, not accusation.</>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* ── Methodology ── */}
          <div className="mt-2 pt-6 border-t border-border">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              {lang === 'es' ? 'Metodología' : 'Methodology'}
            </p>
            <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
              {lang === 'es' ? (
                <>
                  Censo de alto riesgo computado sobre aria_queue ({formatNumber(data.high_risk_total)} proveedores con puntaje RUBLI ≥ {(data.thresholds.rubli_flags * 100).toFixed(0)}/100). Huella fantasma = patrones {data.thresholds.ghost_patterns.join('/')} con ≥ {data.thresholds.min_contracts} contratos, depurados de falsos positivos estructurales. Puntaje RUBLI = {CURRENT_MODEL_VERSION} calibrado OCDE por sector (ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>). Registros: <span className="font-mono">SAT EFOS</span> (Art. 69-B, {formatNumber(EFOS_REGISTRY_SIZE)} RFCs), <span className="font-mono">SFP</span> (sanciones firmes), <span className="font-mono">Corpus RUBLI</span> ({gtCount.cases.toLocaleString('es-MX')} casos, {gtCount.vendors} proveedores).
                </>
              ) : (
                <>
                  High-risk census computed over aria_queue ({formatNumber(data.high_risk_total)} vendors at RUBLI score ≥ {(data.thresholds.rubli_flags * 100).toFixed(0)}/100). Ghost signature = patterns {data.thresholds.ghost_patterns.join('/')} with ≥ {data.thresholds.min_contracts} contracts, cleaned of structural false positives. RUBLI score = {CURRENT_MODEL_VERSION} OECD-calibrated per-sector (see <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>). Registries: <span className="font-mono">SAT EFOS</span> (Art. 69-B, {formatNumber(EFOS_REGISTRY_SIZE)} RFCs), <span className="font-mono">SFP</span> (final sanctions), <span className="font-mono">RUBLI corpus</span> ({gtCount.cases.toLocaleString()} cases, {gtCount.vendors} vendors).
                </>
              )}
            </p>
          </div>
        </div>
      )}
      <PageFooter />
    </div>
  )
}
