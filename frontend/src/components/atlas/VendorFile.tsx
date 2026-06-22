/**
 * VendorFile — "El Expediente": the in-place vendor record the Atlas opens
 * when a vendor dot is SELECTED (instead of ejecting to /vendors/:id).
 *
 * ICIJ/Aleph entity-file mechanic: every entity is a folder that opens.
 * Four bands + foot, each fed by an existing PK-indexed per-vendor endpoint
 * (<100ms cold; verified in backend/api/routers/vendors.py):
 *
 *   1. ¿POR QUÉ SEÑALADO?  — signed SHAP driver strip   · GET /vendors/{id}/shap
 *   2. HUELLA ARIA         — tier + pattern fingerprint  · pattern_confidences
 *                            + cross-pattern jump chips    (on the cluster item)
 *   3. COMPRADORES         — top buyer institutions      · GET /vendors/{id}/institutions
 *   4. ACTIVIDAD           — spend-by-year ribbon + AD%  · GET /vendors/{id}/contract-aggregate
 *   ⊥  REGISTROS           — EFOS/SFP chips + GT cases   · /external-flags · /ground-truth-status
 *
 * Two render variants:
 *   - 'panel'  : docked right-side file panel over the Observatory scatter
 *   - 'inline' : accordion body under a drawer IndexRow (walk the long tail)
 */
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vendorApi, type AtlasClusterVendorItem } from '@/api/client'
import { RISK_COLORS, riskRamp } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

export interface VendorFileProps {
  item: AtlasClusterVendorItem
  lens: string
  /** Focused cluster code (e.g. "P2") — highlighted in the ARIA fingerprint. */
  currentCode: string | null
  /** code → display label for the active lens (drives fingerprint + jump chips). */
  codeLabels: Record<string, string>
  lang: 'en' | 'es'
  /** Cluster accent color (the orb fill the reader flew into). */
  accent: string
  variant?: 'panel' | 'inline'
  onClose?: () => void
  /** Navigate to the full /vendors/:id dossier (the explicit exit). */
  onOpenVendor: (vendorId: number) => void
  /** Lateral camera jump to a sibling pattern (patterns lens only). */
  onJumpToPattern?: (code: string) => void
}

// EN fallbacks for SHAP factor labels (the endpoint ships label_es only).
const FACTOR_EN: Record<string, string> = {
  price_volatility: 'Price volatility',
  institution_diversity: 'Institution diversity',
  price_ratio: 'Price ratio',
  vendor_concentration: 'Vendor concentration',
  cobid_herfindahl: 'Co-bid concentration',
  recency_z: 'Recency',
  amount_residual_z: 'Amount residual',
  network_member_count: 'Network size',
  amendment_flag: 'Amendments',
  ad_period_days: 'Tender ad period',
  direct_award: 'Direct award',
  pub_delay_z: 'Publication delay',
  single_bid: 'Single bid',
  contract_count_z: 'Contract count',
  value_concentration: 'Value concentration',
  seasonal_clustering: 'Seasonal clustering',
}

const RISK_LABEL: Record<string, { es: string; en: string }> = {
  critical: { es: 'Crítico', en: 'Critical' },
  high: { es: 'Alto', en: 'High' },
  medium: { es: 'Medio', en: 'Medium' },
  low: { es: 'Bajo', en: 'Low' },
}

const SERIF = '"EB Garamond",Georgia,serif'

export function VendorFile({
  item, lens, currentCode, codeLabels, lang, accent,
  variant = 'panel', onClose, onOpenVendor, onJumpToPattern,
}: VendorFileProps) {
  const id = item.vendor_id
  const es = lang === 'es'
  const fmtAmount = (mxn: number) => (lang === 'en' ? formatCompactUSD(mxn) : formatCompactMXN(mxn))

  // ── Per-band queries: parallel, independently skeletoned, no retry storms ──
  const shapQ = useQuery({
    queryKey: ['vendor-file-shap', id],
    queryFn: () => vendorApi.getShap(id),
    staleTime: 10 * 60 * 1000, retry: false,
  })
  const instQ = useQuery({
    queryKey: ['vendor-file-insts', id],
    queryFn: () => vendorApi.getInstitutions(id, 4),
    staleTime: 10 * 60 * 1000, retry: false,
  })
  const aggQ = useQuery({
    queryKey: ['vendor-file-agg', id],
    queryFn: () => vendorApi.getContractAggregate(id),
    staleTime: 10 * 60 * 1000, retry: false,
  })
  const gtQ = useQuery({
    queryKey: ['vendor-file-gt', id],
    queryFn: () => vendorApi.getGroundTruthStatus(id),
    enabled: item.is_gt,
    staleTime: 10 * 60 * 1000, retry: false,
  })
  const flagsQ = useQuery({
    queryKey: ['vendor-file-flags', id],
    queryFn: () => vendorApi.getExternalFlags(id),
    staleTime: 10 * 60 * 1000, retry: false,
  })

  // ── Band 1 data: signed SHAP drivers (risk → right, protective → left) ──
  const shapRows = (() => {
    const d = shapQ.data
    if (!d) return []
    const risk = (d.top_risk_factors ?? []).map((f) => ({
      label: es ? f.label_es : (FACTOR_EN[f.factor] ?? f.factor.replace(/_/g, ' ')),
      value: f.shap,
    }))
    const prot = (d.top_protect_factors ?? []).map((f) => ({
      label: es ? f.label_es : (FACTOR_EN[f.factor] ?? f.factor.replace(/_/g, ' ')),
      value: f.shap,
    }))
    return [...risk, ...prot].filter((r) => Number.isFinite(r.value) && r.value !== 0)
  })()

  // ── Band 2 data: ARIA fingerprint + lateral jump targets ──
  const confidences = Object.entries(item.pattern_confidences ?? {})
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
  const fingerprint = confidences.slice(0, 4)
  const jumpTargets = lens === 'patterns' && onJumpToPattern
    ? confidences.filter(([code, v]) => code !== currentCode && v >= 0.4 && codeLabels[code]).slice(0, 2)
    : []

  // ── Band 4 data: spend-by-year ribbon ──
  const byYear = aggQ.data?.by_year ?? []
  const peakYear = byYear.reduce((best, b) => (b.amount > (best?.amount ?? -1) ? b : best), null as null | (typeof byYear)[number])

  const pad = variant === 'panel' ? '12px 16px' : '10px 12px'
  const lvl = item.risk_level
  const riskColor = lvl === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[lvl]

  // ── Scroll cue (panel only): the file is taller than its docked frame, so the
  // last bands (buyers / records) sit below the fold with no visible scrollbar
  // on Windows. A bottom fade + ▾ tells the reader there's more to scroll to.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [moreBelow, setMoreBelow] = useState(false)
  const recalcFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])
  // Re-measure after every render — band queries resolve async and grow the
  // content; setState bails when unchanged, so this can't loop.
  useEffect(() => { recalcFade() })
  useEffect(() => {
    window.addEventListener('resize', recalcFade)
    return () => window.removeEventListener('resize', recalcFade)
  }, [recalcFade])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: variant === 'panel' ? '100%' : 'auto', background: variant === 'panel' ? 'var(--color-background-card)' : 'transparent' }}>
      {/* ── Identity header (zero fetch — everything is on the cluster item) ── */}
      {variant === 'panel' && (
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--color-border)', borderTop: `2px solid ${accent}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              <span style={{ color: accent, fontWeight: 700 }}>{es ? 'Expediente' : 'File'}</span>
              <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
              {currentCode && codeLabels[currentCode] ? codeLabels[currentCode] : (es ? 'Atlas' : 'Atlas')}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label={es ? 'Cerrar expediente' : 'Close file'}
                className="font-mono hover:opacity-70 flex-shrink-0"
                style={{ fontSize: 16, lineHeight: 1, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>×</button>
            )}
          </div>
          <h3 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '6px 0 7px' }}>
            {formatVendorName(item.name, 80)}
          </h3>
          <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
            <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: riskColor, border: `1px solid ${riskColor}`, padding: '2px 6px', borderRadius: 3 }}>
              {(RISK_LABEL[lvl] ?? RISK_LABEL.low)[lang]} · {Math.round((item.risk_score ?? 0) * 100)}%
            </span>
            {item.tier != null && item.tier >= 1 && item.tier <= 4 && (
              <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: 3 }}>
                ARIA T{item.tier}
              </span>
            )}
            {item.is_gt && (
              <span className="font-mono" title={es ? 'Vinculado a un caso documentado' : 'Linked to a documented case'}
                style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-primary)', border: '1px solid var(--color-text-primary)', padding: '2px 6px', borderRadius: 3 }}>
                ⊜ {es ? 'caso' : 'case'}
              </span>
            )}
            {item.primary_sector_name && (
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{item.primary_sector_name}</span>
            )}
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 7 }}>
            {fmtAmount(item.total_amount_mxn)} · {formatNumber(item.total_contracts)} {es ? 'contratos' : 'contracts'}
          </div>
        </div>
      )}

      {/* ── Scrollable band stack ── */}
      {(() => {
        const bands = (
          <>

        {/* Band 1 — why flagged */}
        <Band title={es ? '¿Por qué señalado?' : 'Why flagged?'} accent={accent} pad={pad}>
          {shapQ.isLoading ? (
            <Skeleton lines={3} />
          ) : shapRows.length > 0 ? (
            <ShapDriverStrip rows={shapRows} lang={lang} />
          ) : (
            <Honest text={es ? 'Sin desglose SHAP para este proveedor.' : 'No SHAP breakdown for this vendor.'} />
          )}
        </Band>

        {/* Band 2 — ARIA fingerprint */}
        <Band title={es ? 'Huella ARIA' : 'ARIA fingerprint'} accent={accent} pad={pad}>
          {fingerprint.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {fingerprint.map(([code, conf]) => {
                const isCurrent = code === currentCode
                return (
                  <div key={code} className="flex items-center" style={{ gap: 8 }}>
                    <span className="font-mono flex-shrink-0" style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-muted)', width: 86, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {code} · {codeLabels[code] ?? code}
                    </span>
                    <span aria-hidden="true" className="flex-1" style={{ height: 5, borderRadius: 2, background: 'var(--color-background-elevated)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(conf * 100)}%`, borderRadius: 2, background: isCurrent ? accent : 'var(--color-text-muted)', opacity: isCurrent ? 1 : 0.45 }} />
                    </span>
                    <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 9, color: 'var(--color-text-secondary)', width: 28, textAlign: 'right' }}>{conf.toFixed(2)}</span>
                  </div>
                )
              })}
              {jumpTargets.length > 0 && (
                <div className="flex flex-wrap" style={{ gap: 6, marginTop: 3 }}>
                  {jumpTargets.map(([code, conf]) => (
                    <button key={code} type="button" onClick={() => onJumpToPattern?.(code)}
                      className="font-mono hover:opacity-80 transition-opacity"
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-primary)', background: 'var(--color-background-elevated)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 3, cursor: 'pointer' }}>
                      ⇄ {es ? 'también' : 'also'} {code} {codeLabels[code]} · {conf.toFixed(2)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Honest text={es ? 'Sin huella de patrones ARIA registrada.' : 'No ARIA pattern fingerprint on record.'} />
          )}
        </Band>

        {/* Band 3 — principal buyers */}
        <Band title={es ? 'Compradores principales' : 'Principal buyers'} accent={accent} pad={pad}>
          {instQ.isLoading ? (
            <Skeleton lines={3} />
          ) : (instQ.data?.data?.length ?? 0) > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(instQ.data?.data ?? []).slice(0, 3).map((inst) => {
                const share = item.total_amount_mxn > 0 ? inst.total_value_mxn / item.total_amount_mxn : 0
                const tenure = inst.first_year && inst.last_year
                  ? (inst.first_year === inst.last_year ? `${inst.first_year}` : `${inst.first_year}–${String(inst.last_year).slice(2)}`)
                  : null
                return (
                  <div key={inst.institution_id}>
                    <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.institution_name} size="xs" hideIcon fullName />
                    <div className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)', paddingLeft: 2, marginTop: 1 }}>
                      {tenure ? `${tenure} · ` : ''}{formatNumber(inst.contract_count)} {es ? 'contratos' : 'contracts'}
                      {share > 0.005 ? ` · ${Math.round(share * 100)}% ${es ? 'del valor' : 'of value'}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Honest text={es ? 'Sin desglose de instituciones disponible.' : 'No institution breakdown available.'} />
          )}
        </Band>

        {/* Band 4 — activity over time */}
        <Band title={es ? 'Actividad' : 'Activity'} accent={accent} pad={pad}>
          {aggQ.isLoading ? (
            <Skeleton lines={2} />
          ) : byYear.length > 0 ? (
            <>
              <YearRibbon byYear={byYear} peakYear={peakYear?.year ?? null} lang={lang} />
              <div className="font-mono tabular-nums flex flex-wrap" style={{ fontSize: 9, color: 'var(--color-text-secondary)', gap: 10, marginTop: 6 }}>
                {aggQ.data && aggQ.data.total_contracts > 0 && (
                  <span>{Math.round((aggQ.data.direct_award / aggQ.data.total_contracts) * 100)}% {es ? 'adjudicación directa' : 'direct award'}</span>
                )}
                {aggQ.data && aggQ.data.single_bid > 0 && (
                  <span>{formatNumber(aggQ.data.single_bid)} {es ? 'licitaciones de un solo postor' : 'single-bid awards'}</span>
                )}
                {aggQ.data?.peak_amount != null && aggQ.data.peak_amount > 0 && (
                  <span>{es ? 'contrato máximo' : 'largest contract'} {fmtAmount(aggQ.data.peak_amount)}</span>
                )}
              </div>
            </>
          ) : (
            <Honest text={es ? 'Sin serie anual disponible.' : 'No yearly series available.'} />
          )}
        </Band>

        {/* Foot — external registries + documented cases */}
        <Band title={es ? 'Registros' : 'Records'} accent={accent} pad={pad} last>
          {flagsQ.isLoading || (item.is_gt && gtQ.isLoading) ? (
            <Skeleton lines={2} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {flagsQ.data?.sat_efos && (
                  <span className="font-mono" style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
                    color: flagsQ.data.sat_efos.stage === 'definitivo' ? RISK_COLORS.critical : flagsQ.data.sat_efos.stage === 'presunto' ? RISK_COLORS.high : 'var(--color-text-muted)',
                    border: `1px solid ${flagsQ.data.sat_efos.stage === 'definitivo' ? RISK_COLORS.critical : flagsQ.data.sat_efos.stage === 'presunto' ? RISK_COLORS.high : 'var(--color-border)'}`,
                  }}>
                    EFOS {flagsQ.data.sat_efos.stage}
                  </span>
                )}
                {(flagsQ.data?.sfp_sanctions?.length ?? 0) > 0 && (
                  <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: RISK_COLORS.high, border: `1px solid ${RISK_COLORS.high}`, padding: '2px 6px', borderRadius: 3 }}>
                    {flagsQ.data!.sfp_sanctions.length} {es ? 'sanciones SFP' : 'SFP sanctions'}
                  </span>
                )}
                {(flagsQ.data?.asf_cases?.length ?? 0) > 0 && (
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: 3 }}>
                    {flagsQ.data!.asf_cases.length} ASF
                  </span>
                )}
                {!flagsQ.data?.sat_efos && (flagsQ.data?.sfp_sanctions?.length ?? 0) === 0 && (flagsQ.data?.asf_cases?.length ?? 0) === 0 && !item.is_gt && (
                  <Honest text={es ? 'Sin registros externos en SAT/SFP/ASF.' : 'No external SAT/SFP/ASF records.'} />
                )}
              </div>
              {(gtQ.data?.cases?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(gtQ.data?.cases ?? []).slice(0, 2).map((c) => (
                    <EntityIdentityChip key={c.case_id} type="case" id={c.case_id} name={c.case_name} size="xs" fullName />
                  ))}
                </div>
              )}
            </div>
          )}
        </Band>
          </>
        )
        if (variant !== 'panel') return <div>{bands}</div>
        return (
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <div ref={scrollRef} onScroll={recalcFade} style={{ height: '100%', overflowY: 'auto' }}>
              {bands}
              {/* breathing room so the last band never jams the CTA */}
              <div aria-hidden="true" style={{ height: 14 }} />
            </div>
            {/* scroll cue — fades in while more of the file lies below the fold */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 38,
                pointerEvents: 'none',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
                background: 'linear-gradient(to bottom, transparent, var(--color-background-card) 80%)',
                opacity: moreBelow ? 1 : 0,
                transition: 'opacity 160ms ease',
              }}
            >
              <span className="font-mono" style={{ fontSize: 11, lineHeight: 1, color: 'var(--color-text-muted)' }}>▾</span>
            </div>
          </div>
        )
      })()}

      {/* ── Exit CTA — the ONLY navigation away ── */}
      <div style={{ padding: variant === 'panel' ? '10px 16px' : '8px 12px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button type="button" onClick={() => onOpenVendor(item.vendor_id)}
          className="font-mono hover:opacity-85 transition-opacity w-full"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: accent, border: 'none', padding: '8px 12px', borderRadius: 3, cursor: 'pointer' }}>
          {es ? 'Abrir expediente completo ↗' : 'Open full dossier ↗'}
        </button>
      </div>
    </div>
  )
}

// ── Band chrome ───────────────────────────────────────────────────────────────

function Band({ title, accent, pad, last, children }: {
  title: string; accent: string; pad: string; last?: boolean; children: ReactNode
}) {
  return (
    <section style={{ padding: pad, borderBottom: last ? 'none' : '1px solid var(--color-border)' }}>
      <h4 className="font-mono" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true" style={{ width: 3, height: 10, background: accent, borderRadius: 1, display: 'inline-block' }} />
        {title}
      </h4>
      {children}
    </section>
  )
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 6 }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} style={{ height: 9, borderRadius: 2, background: 'var(--color-background-elevated)', width: `${88 - i * 14}%` }} />
      ))}
    </div>
  )
}

function Honest({ text }: { text: string }) {
  return (
    <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>{text}</p>
  )
}

// ── Band 1 renderer — verdict-led SHAP driver ledger ──────────────────────────
// Geometry is RANK + a 3-step strength glyph, NOT maxAbs-normalized bar width.
// On prod the /shap endpoint serves the v5.2 precompute (the deploy DB lacks
// v0.8.5 contract_z_features), where one driver can be a 50x outlier (e.g.
// price_ratio +11.09 vs ±0.19). A divergent bar normalized to that outlier
// starved ranks 2-6 into invisible slivers and destroyed the band's meaning.
// Rank index + tercile glyph cannot collapse, so every driver stays legible at
// full row height; the verdict sentence names the lead driver, and a quiet
// microline keeps the band honest (direction + relative weight, not exact
// magnitude) so it never over-claims a precision the served numbers can't back.
// Protective factors read in neutral muted (NEVER green — Bible §3.10).

function ShapDriverStrip({ rows, lang }: { rows: Array<{ label: string; value: number }>; lang: 'en' | 'es' }) {
  const es = lang === 'es'
  const risk = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value)
  const prot = rows.filter((r) => r.value < 0).sort((a, b) => a.value - b.value)
  const ordered = [...risk, ...prot]
  const d0 = risk[0]?.value ?? 0
  const d1 = risk[1]?.value ?? 0
  const dominant = d0 > 0 && (d1 === 0 || d0 >= 3 * d1)
  // Coarse 3-step strength, measured against the lead driver. Never 0 filled —
  // a finite-but-tiny driver still reads "present, minor".
  const ref = d0 > 0 ? d0 : Math.abs(prot[0]?.value ?? 0)
  const step = (v: number) => {
    if (ref <= 0) return 1
    const a = Math.abs(v)
    return a >= 0.4 * ref ? 3 : a >= 0.12 * ref ? 2 : 1
  }
  // Verdict — names the lead driver (one colored fragment). Guards empty arrays.
  const r0 = risk[0]?.label ?? ''
  const r1 = risk[1]?.label ?? ''
  const verdict =
    risk.length === 0
      ? { pre: es ? 'Ningún factor elevó a este proveedor; ' : 'No risk factors elevated this vendor; ', name: prot[0]?.label ?? '—', post: es ? ' lo acerca a lo rutinario.' : ' pulls toward routine.', color: 'var(--color-text-primary)' }
      : risk.length === 1
        ? { pre: '', name: r0, post: es ? ' es el único factor de esta señal.' : ' is the sole driver of this flag.', color: RISK_COLORS.critical }
        : dominant
          ? { pre: '', name: r0, post: es ? ' domina abrumadoramente esta señal.' : ' overwhelmingly drives this flag.', color: RISK_COLORS.critical }
          : { pre: '', name: r0, post: es ? ` encabeza esta señal, con apoyo de ${r1}.` : ` leads this flag, with support from ${r1}.`, color: RISK_COLORS.critical }

  return (
    <div role="img" aria-label={es ? 'Factores del indicador de riesgo, ordenados por peso' : 'Risk indicator drivers, ranked by weight'}>
      <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.35, color: 'var(--color-text-primary)', margin: '0 0 9px' }}>
        {verdict.pre}
        <span style={{ fontStyle: 'normal', color: verdict.color }}>{verdict.name}</span>
        {verdict.post}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {ordered.map((r, i) => {
          const pos = r.value > 0
          const rail = pos ? RISK_COLORS.critical : 'var(--color-text-muted)'
          const isDom = i === 0 && pos && dominant && risk.length > 1
          const s = step(r.value)
          const sword = s === 3 ? (es ? 'fuerte' : 'strong') : s === 2 ? (es ? 'moderado' : 'moderate') : (es ? 'leve' : 'faint')
          return (
            <div key={`${r.label}-${i}`} className="flex items-center" style={{ gap: 7 }}>
              <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 9, color: 'var(--color-text-muted)', width: 12, textAlign: 'right' }}>{i + 1}</span>
              <span aria-hidden="true" style={{ width: 2, alignSelf: 'stretch', minHeight: 12, background: rail, opacity: pos ? 0.85 : 0.5, borderRadius: 1 }} />
              <span className="font-mono" style={{ fontSize: 9.5, color: 'var(--color-text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>
                {r.label}
              </span>
              {isDom && (
                <span className="font-mono flex-shrink-0" style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', color: RISK_COLORS.critical, border: `1px solid ${RISK_COLORS.critical}`, borderRadius: 2, padding: '1px 4px', opacity: 0.9 }}>
                  {es ? 'DOMINA' : 'DOMINANT'}
                </span>
              )}
              <span aria-hidden="true" className="flex-shrink-0" style={{ display: 'flex', gap: 2 }}>
                {[0, 1, 2].map((k) => (
                  <span key={k} style={{ width: 6, height: 6, borderRadius: 1, background: rail, opacity: k < s ? (pos ? 0.9 : 0.55) : 0.14 }} />
                ))}
              </span>
              <span className="sr-only">{sword}</span>
            </div>
          )
        })}
      </div>
      <p className="font-mono" style={{ fontSize: 8.5, letterSpacing: '0.03em', color: 'var(--color-text-muted)', lineHeight: 1.35, margin: '9px 0 0', paddingTop: 7, borderTop: '1px solid var(--color-border)' }}>
        {es
          ? 'Atribución de riesgo del modelo — léase como dirección y peso relativo, no magnitud exacta.'
          : "The model's risk attribution — read as direction and relative weight, not exact magnitude."}
      </p>
    </div>
  )
}

// ── Band 4 renderer — spend-by-year ribbon ────────────────────────────────────
// Bars colored by that year's avg risk (riskRamp) — the spike years read in
// both height (spend) and heat (risk), peak year labeled.

function YearRibbon({ byYear, peakYear, lang }: {
  byYear: Array<{ year: number; count: number; amount: number; avg_risk: number }>
  peakYear: number | null
  lang: 'en' | 'es'
}) {
  const sorted = [...byYear].sort((a, b) => a.year - b.year)
  if (sorted.length === 0) return null
  const y0 = sorted[0].year, y1 = sorted[sorted.length - 1].year
  const span = Math.max(1, y1 - y0 + 1)
  const byYearMap = new Map(sorted.map((b) => [b.year, b]))
  const maxAmount = Math.max(...sorted.map((b) => b.amount), 1)
  const W = 100, BAR_H = 30
  const bw = W / span
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${BAR_H}`} width="100%" height={BAR_H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
        {Array.from({ length: span }, (_, i) => {
          const yr = y0 + i
          const b = byYearMap.get(yr)
          if (!b || b.amount <= 0) return null
          const h = Math.max(1.5, (b.amount / maxAmount) * BAR_H)
          return (
            <rect key={yr} x={i * bw + bw * 0.12} y={BAR_H - h} width={bw * 0.76} height={h}
              fill={riskRamp(Number.isFinite(b.avg_risk) ? Math.max(0, Math.min(1, b.avg_risk)) : 0)} opacity={yr === peakYear ? 1 : 0.7} />
          )
        })}
      </svg>
      <div className="font-mono tabular-nums flex justify-between" style={{ fontSize: 8, color: 'var(--color-text-muted)', marginTop: 2 }}>
        <span>{y0}</span>
        {peakYear != null && peakYear !== y0 && peakYear !== y1 && (
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
            {lang === 'es' ? 'pico' : 'peak'} {peakYear}
          </span>
        )}
        <span>{y1}</span>
      </div>
    </div>
  )
}
