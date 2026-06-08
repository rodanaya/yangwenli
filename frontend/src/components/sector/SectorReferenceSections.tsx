/**
 * SectorReferenceSections — the enrichment sections for the sector dossier.
 *
 * 2026-06-08 (DESIGNUS — sector data-density pass). The sector dossier sat on
 * top of more reachable data than any sibling (vendors AND institutions AND
 * categories AND cases AND an investigation queue all live under a sector) yet
 * rendered only a hero, a stat strip, a 2×2 diagnostic grid and an institution
 * table. These sections surface the prosecutorial material that was already
 * computed and instant — top vendors, the category baskets, the sexenio
 * trajectory, concentration, the model's own weights, documented cases, and the
 * ARIA queue — all in the shared folio register (mono labels, EB Garamond
 * italics, RISK_COLORS fills, dot-strip primitives, no green for low risk).
 *
 * Every section receives already-fetched data; the page owns the queries. Each
 * reuses the command primitives (Panel / DotBar / EntityIdentityChip) — none
 * reinvents chrome.
 */
import { Link } from 'react-router-dom'
import type { VendorTopItem } from '@/api/types'
import type { ScandalListItem } from '@/api/types'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { DotBar } from '@/components/ui/DotBar'
import { EditorialAreaChart } from '@/components/charts/editorial'
import { Panel, EmptyNote } from '@/components/dossier/command/primitives'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { ADMIN_ORDER, ADMIN_DISPLAY, type AdministrationKey } from '@/lib/administrations'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

const t = (lang: 'en' | 'es', es: string, en: string) => (lang === 'es' ? es : en)

// ─── 1 · Vendor reference table ──────────────────────────────────────────────
// Mirrors CategoryVendorTable, fed by /vendors/top?sector_id (precomputed).

export function SectorVendorTable({
  vendors,
  totalSpend,
  lang,
}: {
  vendors: VendorTopItem[]
  totalSpend: number
  lang: 'en' | 'es'
}) {
  if (vendors.length === 0) {
    return <EmptyNote text={t(lang, 'Sin proveedores registrados.', 'No vendors on record.')} />
  }
  const top10Share = totalSpend > 0
    ? (vendors.slice(0, 10).reduce((s, v) => s + (v.total_value_mxn ?? 0), 0) / totalSpend) * 100
    : 0
  const lead = vendors[0]
  const leadShare = totalSpend > 0 ? ((lead.total_value_mxn ?? 0) / totalSpend) * 100 : 0

  return (
    <div>
      <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `Los 10 mayores capturan el ${Math.round(top10Share)}% del gasto sectorial · el mayor, ${leadShare.toFixed(1)}%.`,
          `The top 10 capture ${Math.round(top10Share)}% of sector spend · the largest, ${leadShare.toFixed(1)}%.`,
        )}
      </p>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm" aria-label={t(lang, 'Proveedores del sector', 'Sector vendors')}>
          <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold" style={{ width: 28 }}>#</th>
              <th scope="col" className="text-left px-3 py-2 font-semibold">{t(lang, 'Proveedor', 'Vendor')}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Contratos', 'Contracts')}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Monto', 'Amount')}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Cuota', 'Share')}</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Riesgo', 'Risk')}</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => {
              const share = totalSpend > 0 ? ((v.total_value_mxn ?? 0) / totalSpend) * 100 : 0
              const risk = v.avg_risk_score ?? 0
              const lvl = risk > 0 ? getRiskLevelFromScore(risk) : 'low'
              const riskPct = risk > 0 ? Math.round(risk * 100) : null
              const riskColor = riskPct == null ? 'var(--color-text-muted)' : RISK_TEXT_COLORS[lvl]
              return (
                <tr key={v.vendor_id} className="border-t border-border/30">
                  <td className="px-3 py-2 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2"><EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" /></td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatNumber(v.total_contracts ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCompactMXN(v.total_value_mxn ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: share >= 10 ? 600 : 400 }}>{share.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: riskColor, fontWeight: 600 }}>{riskPct ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── 2 · Category composition ────────────────────────────────────────────────

export interface SectorCategoryRow {
  category_id: number
  name_es: string
  name_en: string
  total_value: number
  total_contracts: number
  avg_risk: number
  high_risk_pct?: number
}

export function SectorCategoryComposition({
  categories,
  totalSpend,
  accent,
  lang,
}: {
  categories: SectorCategoryRow[]
  totalSpend: number
  accent: string
  lang: 'en' | 'es'
}) {
  if (categories.length === 0) {
    return <EmptyNote text={t(lang, 'Sin desglose por categoría.', 'No category breakdown.')} />
  }
  const rows = [...categories].sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0))
  const maxVal = Math.max(1, ...rows.map((r) => r.total_value ?? 0))

  return (
    <div className="space-y-3">
      <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `${rows.length} canasta${rows.length === 1 ? '' : 's'} de gasto componen el sector.`,
          `${rows.length} spending basket${rows.length === 1 ? '' : 's'} compose the sector.`,
        )}
      </p>
      {rows.map((c) => {
        const share = totalSpend > 0 ? ((c.total_value ?? 0) / totalSpend) * 100 : 0
        const risk = c.avg_risk ?? 0
        const lvl = risk > 0 ? getRiskLevelFromScore(risk) : 'low'
        const riskPct = risk > 0 ? Math.round(risk * 100) : null
        return (
          <div key={c.category_id} className="grid items-center gap-3" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) 1fr auto' }}>
            <div className="min-w-0">
              <EntityIdentityChip type="category" id={c.category_id} name={lang === 'es' ? c.name_es : c.name_en} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <DotBar value={c.total_value ?? 0} max={maxVal} color={accent} ariaLabel={lang === 'es' ? c.name_es : c.name_en} />
              <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{Math.round(share)}%</span>
            </div>
            <div className="text-right font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{formatCompactMXN(c.total_value ?? 0)}</span>
              {riskPct != null && (
                <span className="ml-2" style={{ color: RISK_TEXT_COLORS[lvl], fontWeight: 600 }}>{riskPct}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 3 · Spend by administration (sexenio) ───────────────────────────────────

interface TrendLike {
  year: number
  total_value_mxn: number
  total_contracts: number
  avg_risk_score: number
}

const ADMIN_YEARS: Record<AdministrationKey, string> = {
  fox: '2002–06', calderon: '2007–12', epn: '2013–18', amlo: '2019–24', sheinbaum: '2025–',
}

function adminForYear(y: number): AdministrationKey {
  if (y <= 2006) return 'fox'
  if (y <= 2012) return 'calderon'
  if (y <= 2018) return 'epn'
  if (y <= 2024) return 'amlo'
  return 'sheinbaum'
}

export function SectorSexenioStrip({
  trends,
  accent,
  lang,
}: {
  trends: TrendLike[]
  accent: string
  lang: 'en' | 'es'
}) {
  const buckets = new Map<AdministrationKey, { value: number; contracts: number; riskNum: number; riskDen: number }>()
  for (const tr of trends) {
    if (!Number.isFinite(tr.year)) continue
    const key = adminForYear(tr.year)
    const b = buckets.get(key) ?? { value: 0, contracts: 0, riskNum: 0, riskDen: 0 }
    const contracts = tr.total_contracts ?? 0
    b.value += tr.total_value_mxn ?? 0
    b.contracts += contracts
    if (tr.avg_risk_score > 0 && contracts > 0) {
      b.riskNum += tr.avg_risk_score * contracts
      b.riskDen += contracts
    }
    buckets.set(key, b)
  }
  const rows = ADMIN_ORDER.map((k) => {
    const b = buckets.get(k)
    return b && b.value > 0
      ? { key: k, value: b.value, contracts: b.contracts, risk: b.riskDen > 0 ? b.riskNum / b.riskDen : 0 }
      : null
  }).filter(Boolean) as Array<{ key: AdministrationKey; value: number; contracts: number; risk: number }>

  if (rows.length === 0) {
    return <EmptyNote text={t(lang, 'Serie temporal insuficiente.', 'Insufficient time series.')} />
  }
  const maxVal = Math.max(1, ...rows.map((r) => r.value))
  const peak = rows.reduce((mx, r) => (r.value > mx.value ? r : mx), rows[0])

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const lvl = r.risk > 0 ? getRiskLevelFromScore(r.risk) : 'low'
        const isPeak = r.key === peak.key
        return (
          <div key={r.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
                {ADMIN_DISPLAY[r.key]}
                <span style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}> · {ADMIN_YEARS[r.key]}</span>
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: 11 }}>
                <span style={{ color: isPeak ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: isPeak ? 600 : 400 }}>{formatCompactMXN(r.value)}</span>
                {r.risk > 0 && (
                  <span className="ml-2" style={{ color: RISK_TEXT_COLORS[lvl], fontWeight: 600 }}>{Math.round(r.risk * 100)}</span>
                )}
              </span>
            </div>
            <DotBar value={r.value} max={maxVal} color={isPeak ? RISK_COLORS.high : accent} ariaLabel={ADMIN_DISPLAY[r.key]} />
          </div>
        )
      })}
      <p className="font-mono" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `Pico de gasto · ${ADMIN_DISPLAY[peak.key]} (${ADMIN_YEARS[peak.key]}).`,
          `Peak spend · ${ADMIN_DISPLAY[peak.key]} (${ADMIN_YEARS[peak.key]}).`,
        )}
      </p>
    </div>
  )
}

// ─── 4 · Concentration over time (Gini / top-vendor share) ───────────────────

interface ConcentrationPoint {
  year: number
  gini: number
  top_vendor_share: number
}

export function SectorConcentrationPanel({
  history,
  lang,
}: {
  history: ConcentrationPoint[]
  lang: 'en' | 'es'
}) {
  const series = history
    .map((h) => ({ year: h.year, share: (h.top_vendor_share ?? 0) * 100 }))
    .filter((h) => Number.isFinite(h.year) && h.share > 0)
    .sort((a, b) => a.year - b.year)

  return (
    <Panel label={t(lang, 'Concentración en el tiempo', 'Concentration over time')} accent={RISK_COLORS.high}>
      {series.length > 1 ? (
        <>
          <EditorialAreaChart data={series} xKey="year" yKey="share" colorToken="risk-high" yFormat="pct" height={96} />
          <p className="font-mono mt-2" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
            {(() => {
              const last = series[series.length - 1]
              const lo = Math.min(...series.map((s) => s.share))
              const hi = Math.max(...series.map((s) => s.share))
              return t(
                lang,
                `Cuota del mayor proveedor · ${last.share.toFixed(1)}% en ${last.year} (rango ${lo.toFixed(1)}–${hi.toFixed(1)}%). Cuota baja = mercado atomizado.`,
                `Largest-vendor share · ${last.share.toFixed(1)}% in ${last.year} (range ${lo.toFixed(1)}–${hi.toFixed(1)}%). Low share = atomized market.`,
              )
            })()}
          </p>
        </>
      ) : (
        <EmptyNote text={t(lang, 'Sin historial de concentración.', 'No concentration history.')} />
      )}
    </Panel>
  )
}

// ─── 5 · Model coefficient ladder ────────────────────────────────────────────

const FEATURE_LABELS: Record<string, [string, string]> = {
  price_volatility: ['Volatilidad de precios', 'Price volatility'],
  vendor_concentration: ['Concentración de proveedor', 'Vendor concentration'],
  institution_diversity: ['Diversidad institucional', 'Institution diversity'],
  price_ratio: ['Ratio de precio', 'Price ratio'],
  network_member_count: ['Red de proveedores', 'Network size'],
  same_day_count: ['Contratos simultáneos', 'Same-day contracts'],
  direct_award: ['Adjudicación directa', 'Direct award'],
  single_bid: ['Único postor', 'Single bid'],
  ad_period_days: ['Días de publicación', 'Ad-period days'],
  cobid_herfindahl: ['HHI de co-licitación', 'Co-bid HHI'],
  recency_z: ['Actividad reciente (z)', 'Recency (z)'],
  amount_residual_z: ['Residual de monto (z)', 'Amount residual (z)'],
  amendment_flag: ['Modificaciones', 'Amendments'],
  pub_delay_z: ['Retraso de publicación (z)', 'Publication delay (z)'],
}

function featureLabel(key: string, lang: 'en' | 'es'): string {
  const pair = FEATURE_LABELS[key]
  if (pair) return lang === 'es' ? pair[0] : pair[1]
  return key.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

export function SectorModelLadder({
  coefficients,
  usesGlobal,
  lang,
}: {
  coefficients: Array<{ feature: string; coefficient: number }>
  usesGlobal: boolean
  lang: 'en' | 'es'
}) {
  const rows = [...(coefficients ?? [])]
    .filter((c) => Number.isFinite(c.coefficient) && c.coefficient !== 0)
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, 12)
  const maxAbs = Math.max(0.01, ...rows.map((c) => Math.abs(c.coefficient)))

  return (
    <Panel label={t(lang, 'Por qué marca riesgo', 'Why it flags risk')} accent={RISK_COLORS.critical}>
      {rows.length > 0 ? (
        <div className="space-y-2.5">
          {rows.map((c) => {
            const positive = c.coefficient > 0
            const color = positive ? RISK_COLORS.critical : 'var(--color-text-muted)'
            const sign = positive ? '+' : ''
            return (
              <div key={c.feature}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono truncate" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>{featureLabel(c.feature, lang)}</span>
                  <span className="font-mono tabular-nums flex-shrink-0 ml-2" style={{ fontSize: 10, fontWeight: 600, color }}>{sign}{c.coefficient.toFixed(2)}</span>
                </div>
                <DotBar value={Math.abs(c.coefficient)} max={maxAbs} color={color} ariaLabel={featureLabel(c.feature, lang)} />
              </div>
            )
          })}
          <p className="font-mono pt-1" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
            {t(lang, 'Modelo v0.8.5 · ', 'v0.8.5 model · ')}
            {usesGlobal
              ? t(lang, 'global (sin modelo sectorial)', 'global (no sector model)')
              : t(lang, 'sectorial', 'sector-specific')}
            {' · '}
            <span style={{ color: RISK_TEXT_COLORS.critical }}>{t(lang, 'rojo = aumenta riesgo', 'red = raises risk')}</span>
          </p>
        </div>
      ) : (
        <EmptyNote text={t(lang, 'Sin coeficientes disponibles.', 'No coefficients available.')} />
      )}
    </Panel>
  )
}

// ─── 6 · Year-by-year anomalies ──────────────────────────────────────────────

interface AnomalyYear {
  year: number
  overall_anomaly_score: number
}

export function SectorAnomalyStrip({
  anomalies,
  lang,
}: {
  anomalies: AnomalyYear[]
  lang: 'en' | 'es'
}) {
  const rows = [...(anomalies ?? [])]
    .filter((a) => Number.isFinite(a.year) && a.overall_anomaly_score > 0)
    .sort((a, b) => a.year - b.year)

  return (
    <Panel label={t(lang, 'Años anómalos', 'Anomalous years')} accent={RISK_COLORS.high}>
      {rows.length > 0 ? (
        <>
          <div className="space-y-2.5">
            {(() => {
              const maxScore = Math.max(0.5, ...rows.map((r) => r.overall_anomaly_score))
              const worst = rows.reduce((mx, r) => (r.overall_anomaly_score > mx.overall_anomaly_score ? r : mx), rows[0])
              // Show the 8 most recent years to keep the panel compact.
              const recent = rows.slice(-8)
              return recent.map((r) => {
                const isWorst = r.year === worst.year
                const color = isWorst ? RISK_COLORS.critical : RISK_COLORS.high
                return (
                  <div key={r.year} className="grid items-center gap-3" style={{ gridTemplateColumns: '38px 1fr 28px' }}>
                    <span className="font-mono tabular-nums" style={{ fontSize: 10, color: isWorst ? RISK_TEXT_COLORS.critical : 'var(--color-text-secondary)', fontWeight: isWorst ? 600 : 400 }}>{r.year}</span>
                    <DotBar value={r.overall_anomaly_score} max={maxScore} color={color} ariaLabel={`${r.year}`} />
                    <span className="font-mono tabular-nums text-right" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.overall_anomaly_score.toFixed(1)}</span>
                  </div>
                )
              })
            })()}
          </div>
          <p className="font-mono pt-2" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
            {t(lang, 'Desviación |z| media de factores vs. la línea base del sector.', 'Mean |z| deviation of factors vs the sector baseline.')}
          </p>
        </>
      ) : (
        <EmptyNote text={t(lang, 'Sin señal de anomalía temporal.', 'No temporal anomaly signal.')} />
      )}
    </Panel>
  )
}

// ─── 7 · Documented cases ────────────────────────────────────────────────────

const LEGAL_STATUS: Record<string, [string, string]> = {
  investigation: ['En investigación', 'Under investigation'],
  prosecuted: ['Procesado', 'Prosecuted'],
  acquitted: ['Absuelto', 'Acquitted'],
  dismissed: ['Desestimado', 'Dismissed'],
  impunity: ['Impunidad', 'Impunity'],
  unresolved: ['Sin resolución', 'Unresolved'],
}

function legalLabel(status: string, lang: 'en' | 'es'): string {
  const pair = LEGAL_STATUS[status]
  if (pair) return lang === 'es' ? pair[0] : pair[1]
  return status.replace(/_/g, ' ')
}

export function SectorCaseRoll({
  cases,
  lang,
}: {
  cases: ScandalListItem[]
  lang: 'en' | 'es'
}) {
  if (cases.length === 0) {
    return <EmptyNote text={t(lang, 'Sin casos documentados ligados al sector.', 'No documented cases linked to the sector.')} />
  }
  const rows = [...cases].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))

  return (
    <ul className="divide-y divide-border/40 border border-border rounded-sm overflow-hidden">
      {rows.map((c) => {
        const amount = c.amount_mxn_high ?? c.amount_mxn_low ?? 0
        const years = c.contract_year_start
          ? `${c.contract_year_start}${c.contract_year_end && c.contract_year_end !== c.contract_year_start ? `–${c.contract_year_end}` : ''}`
          : null
        return (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 flex items-center gap-2">
              <EntityIdentityChip type="case" id={c.slug} name={lang === 'es' ? c.name_es : c.name_en} size="sm" />
            </div>
            <div className="flex items-baseline gap-3 flex-shrink-0 font-mono tabular-nums" style={{ fontSize: 10.5 }}>
              {years && <span style={{ color: 'var(--color-text-muted)' }}>{years}</span>}
              {amount > 0 && <span style={{ color: 'var(--color-text-secondary)' }}>{formatCompactMXN(amount)}</span>}
              <span className="uppercase tracking-wider" style={{ fontSize: 9, color: c.legal_status === 'prosecuted' ? RISK_TEXT_COLORS.critical : c.legal_status === 'impunity' ? RISK_TEXT_COLORS.high : 'var(--color-text-muted)' }}>
                {legalLabel(c.legal_status, lang)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── 8 · ARIA investigation-queue ribbon ─────────────────────────────────────

export interface TierCount { tier: 1 | 2 | 3 | 4; count: number }

const TIER_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: RISK_COLORS.critical, 2: RISK_COLORS.high, 3: RISK_COLORS.medium, 4: RISK_COLORS.low,
}
const TIER_LABEL: Record<1 | 2 | 3 | 4, [string, string]> = {
  1: ['Prioritario', 'Priority'], 2: ['Elevado', 'Elevated'], 3: ['Medio', 'Medium'], 4: ['Base', 'Baseline'],
}

export function SectorQueueRibbon({
  tiers,
  sectorId,
  lang,
}: {
  tiers: TierCount[]
  sectorId: number
  lang: 'en' | 'es'
}) {
  const total = tiers.reduce((s, x) => s + x.count, 0)
  if (total === 0) {
    return <EmptyNote text={t(lang, 'Sin proveedores en la cola de investigación.', 'No vendors in the investigation queue.')} />
  }

  return (
    <div className="border border-border rounded-sm p-4">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatNumber(total)}</span>
          {' '}{t(lang, 'proveedores en la cola ARIA', 'vendors in the ARIA queue')}
        </p>
        <Link
          to={`/aria?sector_id=${sectorId}`}
          className="font-mono uppercase tracking-widest hover:opacity-70 transition-opacity"
          style={{ fontSize: 10, color: 'var(--color-accent)' }}
        >
          {t(lang, 'Ver la cola', 'Open the queue')} →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((tier) => {
          const tc = tiers.find((x) => x.tier === tier)
          const count = tc?.count ?? 0
          return (
            <div key={tier} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: TIER_COLOR[tier], display: 'inline-block' }} />
                <span className="font-mono tabular-nums" style={{ fontSize: 16, fontWeight: 600, color: count > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{formatNumber(count)}</span>
              </div>
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8.5, color: 'var(--color-text-muted)' }}>
                T{tier} · {lang === 'es' ? TIER_LABEL[tier][0] : TIER_LABEL[tier][1]}
              </span>
              <DotBar value={count} max={Math.max(1, ...tiers.map((x) => x.count))} color={TIER_COLOR[tier]} ariaLabel={`T${tier}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
