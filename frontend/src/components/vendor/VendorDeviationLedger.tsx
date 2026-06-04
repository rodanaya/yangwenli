/**
 * VendorDeviationLedger — "EL DESVÍO": a vendor as a row of DEVIATIONS from its
 * sector's norm, not a list of metrics. Ported from the /explore Z3 view to the
 * canonical /vendors/:id dossier. Geometry is driven by deviation magnitude, not
 * data volume, and it runs on the POPULATION peer-comparison endpoint (vendor
 * value, sector median, and percentile all from vendor_stats) — so it's accurate
 * for a 1-contract vendor and a 4,000-contract vendor alike.
 *
 * Reference: FT bullet-vs-benchmark + NYT Upshot sledgehammer.
 *
 * Units from the peer endpoint: direct_award_pct / single_bid_pct are stored
 * 0–100; avg_risk_score is a 0–1 fraction (→ ×100); price_per_contract is MXN.
 * direct_award_pct can be corrupted >100 in vendor_stats, so rates are clamped.
 */
import { RISK_COLORS, OECD_DIRECT_AWARD_LIMIT } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import type { VendorPeerComparisonResponse, PeerComparisonMetric } from '@/api/types'

const OCHRE = '#a06820'
const OECD_CYAN = '#0891b2'

export type DeviationRowModel = {
  key: 'direct_award' | 'single_bid' | 'risk' | 'price'
  label: string
  kind: 'pct' | 'mxn'
  vendorVal: number
  medianVal: number | null
  percentile: number | null
  absoluteRef: { value: number; label: string } | null
  alarm: boolean
  ratio: number | null
}

const clampPct = (v: number | null | undefined) => (v == null ? null : Math.max(0, Math.min(100, v)))
const ratioOf = (v: number, m: number | null) => (m && m > 0 ? v / m : null)

export function buildDeviationRows(
  metrics: PeerComparisonMetric[] | undefined,
  lang: 'en' | 'es',
): DeviationRowModel[] {
  const of = (k: string) => (metrics ?? []).find((m) => m.metric === k)
  const da = of('direct_award_pct'); const sb = of('single_bid_pct')
  const rk = of('avg_risk_score'); const pp = of('price_per_contract')

  const daVendor = clampPct(da?.value) ?? 0
  const sbVendor = clampPct(sb?.value) ?? 0
  const rkVendor = rk?.value != null ? rk.value * 100 : 0
  const ppVendor = pp?.value ?? 0
  const daMedian = clampPct(da?.peer_median)
  const sbMedian = clampPct(sb?.peer_median)
  const rkMedian = rk?.peer_median != null ? rk.peer_median * 100 : null
  const ppMedian = pp?.peer_median ?? null

  return [
    {
      key: 'direct_award', label: lang === 'en' ? 'Direct award' : 'Adj. directa', kind: 'pct',
      vendorVal: daVendor, medianVal: daMedian, percentile: da?.percentile ?? null,
      absoluteRef: { value: OECD_DIRECT_AWARD_LIMIT * 100, label: 'OECD' }, alarm: daVendor >= 75, ratio: ratioOf(daVendor, daMedian),
    },
    {
      key: 'single_bid', label: lang === 'en' ? 'Single bid' : 'Único postor', kind: 'pct',
      vendorVal: sbVendor, medianVal: sbMedian, percentile: sb?.percentile ?? null,
      absoluteRef: null, alarm: sbVendor >= 50, ratio: ratioOf(sbVendor, sbMedian),
    },
    {
      key: 'risk', label: lang === 'en' ? 'Avg risk score' : 'Riesgo promedio', kind: 'pct',
      vendorVal: rkVendor, medianVal: rkMedian, percentile: rk?.percentile ?? null,
      absoluteRef: null, alarm: rkVendor >= 40, ratio: ratioOf(rkVendor, rkMedian),
    },
    {
      key: 'price', label: lang === 'en' ? 'Price / contract' : 'Precio / contrato', kind: 'mxn',
      vendorVal: ppVendor, medianVal: ppMedian, percentile: pp?.percentile ?? null,
      absoluteRef: null, alarm: (pp?.percentile ?? 0) >= 90, ratio: ratioOf(ppVendor, ppMedian),
    },
  ]
}

function pickStrongest(rows: DeviationRowModel[]): DeviationRowModel | null {
  const order: DeviationRowModel['key'][] = ['direct_award', 'single_bid', 'risk', 'price']
  const byKey = (k: DeviationRowModel['key']) => rows.find((r) => r.key === k)!
  const isOver = (r: DeviationRowModel) => r.medianVal != null && r.vendorVal > r.medianVal
  for (const k of order) { const r = byKey(k); if (isOver(r) && (r.alarm || (r.ratio != null && r.ratio >= 1.5))) return r }
  for (const k of order) { const r = byKey(k); if (r.alarm) return r }
  const withP = rows.filter((r) => r.percentile != null)
  if (withP.length) return withP.reduce((b, r) => ((r.percentile ?? 0) > (b.percentile ?? 0) ? r : b))
  return null
}

function DeviationRow({ row }: { row: DeviationRowModel }) {
  const hasMedian = row.medianVal != null
  const domainMax = row.kind === 'pct' ? 100 : Math.max(row.vendorVal, row.medianVal ?? 0, 1) * 1.5
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const vPos = clamp(row.vendorVal / domainMax)
  const mPos = hasMedian ? clamp((row.medianVal as number) / domainMax) : null
  const refPos = row.absoluteRef ? clamp(row.absoluteRef.value / domainMax) : null
  const overNorm = hasMedian && row.vendorVal > (row.medianVal as number)
  const wedgeColor = row.alarm ? RISK_COLORS.critical : overNorm ? OCHRE : 'var(--color-text-muted)'
  const fmtMoney = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} MDP` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `$${Math.round(v)}`)
  const fmt = (v: number) => (row.kind === 'mxn' ? fmtMoney(v) : `${v.toFixed(0)}%`)
  const lo = mPos != null ? Math.min(vPos, mPos) : vPos
  const hi = mPos != null ? Math.max(vPos, mPos) : vPos

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex-shrink-0 font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--color-text-muted)', width: 104 }}>
        {row.label}
      </span>
      <span className="flex-1 relative" style={{ height: 22 }}>
        <span aria-hidden="true" className="absolute left-0 right-0" style={{ top: '50%', height: 2, background: 'var(--color-border)', borderRadius: 1, transform: 'translateY(-50%)' }} />
        {mPos != null && hi > lo && (
          <span aria-hidden="true" className="absolute" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, top: '50%', height: 9, transform: 'translateY(-50%)', background: wedgeColor, opacity: overNorm ? 0.7 : 0.4, borderRadius: 1 }} />
        )}
        {refPos != null && (
          <span aria-hidden="true" className="absolute" style={{ left: `${refPos * 100}%`, top: 1, bottom: 1, width: 1.5, background: OECD_CYAN }} title={`${row.absoluteRef?.label} ${row.absoluteRef?.value}%`} />
        )}
        {mPos != null && (
          <span aria-hidden="true" className="absolute" style={{ left: `${mPos * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--color-text-secondary)', opacity: 0.7 }} />
        )}
        <span className="absolute rounded-full" style={{ left: `${vPos * 100}%`, top: '50%', width: 9, height: 9, marginLeft: -4.5, transform: 'translateY(-50%)', background: row.alarm ? RISK_COLORS.critical : overNorm ? OCHRE : 'var(--color-text-secondary)', boxShadow: '0 0 0 2px var(--color-background-elevated)' }} />
      </span>
      <span className="flex-shrink-0 text-right flex items-baseline justify-end gap-1.5" style={{ width: 132 }}>
        <span className="font-mono tabular-nums" style={{ fontSize: 12.5, fontWeight: 700, color: row.alarm ? RISK_COLORS.critical : 'var(--color-text-primary)' }}>{fmt(row.vendorVal)}</span>
        <span className="font-mono tabular-nums" style={{ fontSize: 9.5, color: overNorm ? (row.alarm ? RISK_COLORS.critical : OCHRE) : 'var(--color-text-muted)' }}>
          {row.ratio != null ? `${row.ratio.toFixed(1)}×` : hasMedian ? `vs ${fmt(row.medianVal as number)}` : '·'}
        </span>
        {row.percentile != null && (
          <span className="font-mono tabular-nums" style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)' }}>p{Math.round(row.percentile)}</span>
        )}
      </span>
    </div>
  )
}

export function VendorDeviationLedger({
  peerComparison,
  vendorName,
  lang,
}: {
  peerComparison: VendorPeerComparisonResponse | null | undefined
  vendorName: string
  lang: 'en' | 'es'
}) {
  const rows = buildDeviationRows(peerComparison?.metrics, lang)
  const hasAny = rows.some((r) => r.medianVal != null || r.vendorVal > 0)
  if (!hasAny) return null
  const strongest = pickStrongest(rows)

  // One prose finding — the strongest deviation, stated once.
  const accent = strongest?.alarm ? RISK_COLORS.critical : OCHRE
  const strong = (s: string) => <span style={{ fontWeight: 700, color: accent }}>{s}</span>
  const fmtVal = (r: DeviationRowModel) => (r.kind === 'mxn' ? formatCompactMXN(r.vendorVal) : `${r.vendorVal.toFixed(0)}%`)
  const fmtMed = (r: DeviationRowModel) => (r.medianVal == null ? '—' : r.kind === 'mxn' ? formatCompactMXN(r.medianVal) : `${r.medianVal.toFixed(0)}%`)
  let finding: React.ReactNode = null
  if (strongest) {
    const r = strongest
    const ratioClause = r.ratio != null
      ? (lang === 'en' ? <> — {strong(`${r.ratio.toFixed(1)}×`)} the sector norm ({fmtMed(r)})</> : <> — {strong(`${r.ratio.toFixed(1)}×`)} la norma del sector ({fmtMed(r)})</>)
      : (r.percentile != null ? (lang === 'en' ? <> — {strong(`p${Math.round(r.percentile)}`)} in its sector</> : <> — {strong(`percentil ${Math.round(r.percentile)}`)} del sector</>) : null)
    if (r.key === 'direct_award') finding = lang === 'en' ? <>{vendorName} took {strong(fmtVal(r))} of its contracts without competition{ratioClause}.</> : <>{vendorName} obtuvo el {strong(fmtVal(r))} de sus contratos sin competencia{ratioClause}.</>
    else if (r.key === 'single_bid') finding = lang === 'en' ? <>{vendorName} won {strong(fmtVal(r))} of its contracts as the only bidder{ratioClause}.</> : <>{vendorName} ganó el {strong(fmtVal(r))} de sus contratos como único postor{ratioClause}.</>
    else if (r.key === 'risk') finding = lang === 'en' ? <>{vendorName} carries an average risk score of {strong(fmtVal(r))}{ratioClause}.</> : <>{vendorName} tiene un riesgo promedio de {strong(fmtVal(r))}{ratioClause}.</>
    else finding = lang === 'en' ? <>{vendorName} paid {strong(fmtVal(r))} per contract{ratioClause}.</> : <>{vendorName} pagó {strong(fmtVal(r))} por contrato{ratioClause}.</>
  }

  return (
    <div>
      {finding && (
        <div className="flex items-start gap-3 max-w-3xl mb-3">
          <span className="inline-block self-stretch w-[3px] flex-shrink-0 rounded-sm" style={{ background: accent }} aria-hidden="true" />
          <p className="text-text-secondary leading-snug" style={{ fontSize: 15, fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic' }}>{finding}</p>
        </div>
      )}
      <section className="rounded-sm overflow-hidden" style={{ border: '1px solid var(--color-border)', boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)', background: 'var(--color-background-elevated)' }}>
        <div className="flex items-baseline justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--color-text-muted)' }}>
            <span style={{ color: OCHRE, fontStyle: 'italic', fontWeight: 600 }}>§ {lang === 'en' ? 'The deviation' : 'El desvío'}</span>
            <span style={{ margin: '0 7px', opacity: 0.45 }}>·</span>
            <span style={{ fontWeight: 300 }}>{lang === 'en' ? 'vs the sector norm' : 'frente a la norma del sector'}</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono" style={{ fontSize: 8.5, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 1, background: 'var(--color-text-secondary)', display: 'inline-block' }} /> {lang === 'en' ? 'median' : 'mediana'}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 2, background: OECD_CYAN, display: 'inline-block' }} /> OECD 25%</span>
          </div>
        </div>
        <div className="px-4 py-2.5">
          {rows.map((r) => <DeviationRow key={r.key} row={r} />)}
        </div>
      </section>
    </div>
  )
}
