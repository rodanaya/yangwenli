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
 * reuses the command primitives (Panel / EntityIdentityChip) and the local
 * FullBar / SignedBar full-width proportional bars — none reinvents chrome.
 *
 * 2026-06-08 (DESIGNUS density squadron — SLIPPY). Killed the hollow rows: the
 * fixed-width 22-dot DotBar left a void beside every row-spanning metric, so
 * each metric now uses a full-width <FullBar> that stretches its flex-1 track
 * (mirrors ExposureLedger VaRBar / OecdDeviationPanel). Category composition is
 * a full-width Upshot-style bar list; the sexenio strip and largest contracts
 * are dense full-width bar rows with EB-Garamond anchor numbers; the model
 * ladder uses diverging <SignedBar>; the case roll tiles two-up and fills the
 * middle with fraud-type/administration/years; the ARIA ribbon enlarges the
 * tier counts to 30px Garamond CTAs.
 */
import { Link } from 'react-router-dom'
import type { VendorTopItem } from '@/api/types'
import type { ScandalListItem } from '@/api/types'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
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

const BIGNUM_STYLE = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 700,
} as const

// ─── FullBar — canonical full-width proportional bar ─────────────────────────
// Replaces the fixed-width DotBar across every row-spanning metric. A track that
// stretches to fill its flex-1 container, with a single fill segment and an
// optional benchmark tick. Mirrors OecdDeviationPanel / VaRBar anatomy.

function FullBar({
  pct,
  color,
  height = 6,
  track = 'var(--color-border)',
  tickPct,
  minFill = '3px',
  ariaLabel,
}: {
  pct: number
  color: string
  height?: number
  track?: string
  tickPct?: number
  minFill?: string
  ariaLabel?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ height, background: track, borderRadius: 999, minWidth: 24 }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `max(${minFill}, ${clamped.toFixed(2)}%)`, background: color, borderRadius: 999 }}
      />
      {tickPct != null && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, tickPct)}%`, width: 1, background: 'var(--color-text-muted)' }}
        />
      )}
    </div>
  )
}

// SignedBar — diverging full-width bar for model coefficients. A centre baseline
// with the fill extending right (positive / risk-raising) or left (protective).
function SignedBar({
  pct,
  positive,
  color,
  height = 7,
}: {
  pct: number
  positive: boolean
  color: string
  height?: number
}) {
  const half = Math.max(0, Math.min(50, (pct / 100) * 50))
  return (
    <div
      className="relative overflow-hidden flex-1"
      style={{ height, background: 'var(--color-border)', borderRadius: 999, minWidth: 24 }}
      aria-hidden="true"
    >
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--color-text-muted)', opacity: 0.5 }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: positive ? '50%' : `${50 - half}%`,
          width: `max(2px, ${half}%)`,
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  )
}

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
                <tr key={v.vendor_id} className="border-t border-border/30 hover:bg-background-elevated transition-colors">
                  <td className="px-3 py-1.5 font-mono tabular-nums text-text-muted">{i + 1}</td>
                  <td className="px-3 py-1.5"><EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="sm" /></td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-muted">{formatNumber(v.total_contracts ?? 0)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCompactMXN(v.total_value_mxn ?? 0)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="hidden sm:block w-16">
                        <FullBar pct={Math.min(100, share)} color={share >= 10 ? RISK_COLORS.high : 'var(--color-text-muted)'} height={4} ariaLabel={`${share.toFixed(1)}%`} />
                      </div>
                      <span className="font-mono tabular-nums shrink-0 w-12 text-right" style={{ color: share >= 10 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: share >= 10 ? 600 : 400 }}>{share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: riskColor, fontWeight: 600 }}>{riskPct ?? '—'}</td>
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
    <div>
      <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `${rows.length} canasta${rows.length === 1 ? '' : 's'} de gasto componen el sector · barra = cuota del gasto sectorial.`,
          `${rows.length} spending basket${rows.length === 1 ? '' : 's'} compose the sector · bar = share of sector spend.`,
        )}
      </p>
      <div className="divide-y divide-border/40 border border-border rounded-sm overflow-hidden">
        {rows.map((c) => {
          const share = totalSpend > 0 ? ((c.total_value ?? 0) / totalSpend) * 100 : 0
          const barPct = ((c.total_value ?? 0) / maxVal) * 100
          const risk = c.avg_risk ?? 0
          const lvl = risk > 0 ? getRiskLevelFromScore(risk) : 'low'
          const riskPct = risk > 0 ? Math.round(risk * 100) : null
          return (
            <div key={c.category_id} className="px-3 py-2 hover:bg-background-elevated transition-colors">
              {/* Line 1 — name · full-width bar · big spend */}
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-32 sm:w-44 min-w-0">
                  <EntityIdentityChip type="category" id={c.category_id} name={lang === 'es' ? c.name_es : c.name_en} size="sm" />
                </div>
                <FullBar pct={barPct} color={accent} ariaLabel={lang === 'es' ? c.name_es : c.name_en} />
                <span
                  className="shrink-0 text-right tabular-nums"
                  style={{ ...BIGNUM_STYLE, fontSize: 16, width: 92, color: 'var(--color-text-primary)' }}
                >
                  {formatCompactMXN(c.total_value ?? 0)}
                </span>
              </div>
              {/* Line 2 — sublabel: share · contracts · risk */}
              <div className="flex items-center gap-2.5 mt-0.5 pl-[8.5rem] sm:pl-[11.75rem] font-mono tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                <span style={{ color: share >= 20 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)', fontWeight: share >= 20 ? 600 : 400 }}>
                  {share.toFixed(1)}% {t(lang, 'del sector', 'of sector')}
                </span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{formatNumber(c.total_contracts ?? 0)} {t(lang, 'contratos', 'contracts')}</span>
                {riskPct != null && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: RISK_COLORS[lvl] }} />
                      <span style={{ color: RISK_TEXT_COLORS[lvl], fontWeight: 600 }}>{riskPct}</span>
                      <span>{t(lang, 'riesgo', 'risk')}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
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
    <div className="space-y-2.5">
      {rows.map((r) => {
        const lvl = r.risk > 0 ? getRiskLevelFromScore(r.risk) : 'low'
        const isPeak = r.key === peak.key
        const barPct = (r.value / maxVal) * 100
        return (
          <div key={r.key} className="flex items-center gap-3">
            <div className="shrink-0 w-28 sm:w-36 min-w-0">
              <div className="font-mono truncate" style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-primary)', fontWeight: isPeak ? 600 : 400 }}>
                {ADMIN_DISPLAY[r.key]}
                {isPeak && <span className="ml-1" style={{ color: RISK_TEXT_COLORS.high, fontSize: 9 }}>▲</span>}
              </div>
              <div className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{ADMIN_YEARS[r.key]} · {formatNumber(r.contracts)}</div>
            </div>
            <FullBar pct={barPct} color={isPeak ? RISK_COLORS.high : accent} height={7} ariaLabel={ADMIN_DISPLAY[r.key]} />
            <span
              className="shrink-0 text-right tabular-nums"
              style={{ ...BIGNUM_STYLE, fontSize: 16, width: 92, color: isPeak ? RISK_TEXT_COLORS.high : 'var(--color-text-primary)' }}
            >
              {formatCompactMXN(r.value)}
            </span>
            <span
              className="shrink-0 w-7 text-right font-mono tabular-nums"
              style={{ fontSize: 11, fontWeight: 600, color: r.risk > 0 ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)' }}
              title={t(lang, 'indicador de riesgo', 'risk indicator')}
            >
              {r.risk > 0 ? Math.round(r.risk * 100) : '—'}
            </span>
          </div>
        )
      })}
      <p className="font-mono pt-0.5" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `Pico de gasto · ${ADMIN_DISPLAY[peak.key]} (${ADMIN_YEARS[peak.key]}). Última columna = indicador de riesgo medio.`,
          `Peak spend · ${ADMIN_DISPLAY[peak.key]} (${ADMIN_YEARS[peak.key]}). Last column = mean risk indicator.`,
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
        <div className="space-y-2">
          {rows.map((c) => {
            const positive = c.coefficient > 0
            const color = positive ? RISK_COLORS.critical : 'var(--color-text-muted)'
            const sign = positive ? '+' : ''
            const barPct = (Math.abs(c.coefficient) / maxAbs) * 100
            return (
              <div key={c.feature} className="flex items-center gap-3">
                <span className="font-mono truncate shrink-0 w-28 sm:w-40" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>{featureLabel(c.feature, lang)}</span>
                <SignedBar pct={barPct} positive={positive} color={color} />
                <span className="font-mono tabular-nums shrink-0 w-12 text-right" style={{ fontSize: 11, fontWeight: 600, color }}>{sign}{c.coefficient.toFixed(2)}</span>
              </div>
            )
          })}
          <p className="font-mono pt-1.5" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
            {t(lang, 'Modelo v0.8.5 · ', 'v0.8.5 model · ')}
            {usesGlobal
              ? t(lang, 'global (sin modelo sectorial)', 'global (no sector model)')
              : t(lang, 'sectorial', 'sector-specific')}
            {' · '}
            <span style={{ color: RISK_TEXT_COLORS.critical }}>{t(lang, 'derecha/rojo = aumenta riesgo', 'right/red = raises risk')}</span>
            {' · '}
            <span>{t(lang, 'izquierda = protector', 'left = protective')}</span>
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
                const barPct = (r.overall_anomaly_score / maxScore) * 100
                return (
                  <div key={r.year} className="flex items-center gap-3">
                    <span className="font-mono tabular-nums shrink-0 w-10" style={{ fontSize: 11, color: isWorst ? RISK_TEXT_COLORS.critical : 'var(--color-text-secondary)', fontWeight: isWorst ? 600 : 400 }}>{r.year}</span>
                    <FullBar pct={barPct} color={color} height={isWorst ? 8 : 6} ariaLabel={`${r.year}`} />
                    <span className="font-mono tabular-nums text-right shrink-0 w-9" style={{ fontSize: 11, fontWeight: isWorst ? 600 : 400, color: isWorst ? RISK_TEXT_COLORS.critical : 'var(--color-text-secondary)' }}>{r.overall_anomaly_score.toFixed(1)}</span>
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

const FRAUD_TYPE_LABEL: Record<string, [string, string]> = {
  ghost_company: ['Empresa fantasma', 'Ghost company'],
  overpricing: ['Sobreprecio', 'Overpricing'],
  bid_rigging: ['Colusión', 'Bid rigging'],
  embezzlement: ['Desvío', 'Embezzlement'],
  bribery: ['Soborno', 'Bribery'],
  conflict_of_interest: ['Conflicto de interés', 'Conflict of interest'],
  shell_network: ['Red de fachadas', 'Shell network'],
  phantom_delivery: ['Entrega fantasma', 'Phantom delivery'],
  influence_peddling: ['Tráfico de influencias', 'Influence peddling'],
  money_laundering: ['Lavado', 'Money laundering'],
}

function fraudLabel(ft: string | undefined, lang: 'en' | 'es'): string | null {
  if (!ft) return null
  const pair = FRAUD_TYPE_LABEL[ft]
  if (pair) return lang === 'es' ? pair[0] : pair[1]
  return ft.replace(/_/g, ' ')
}

function adminLabel(a: string | undefined): string | null {
  if (!a) return null
  const key = a as AdministrationKey
  return ADMIN_DISPLAY[key] ?? a.charAt(0).toUpperCase() + a.slice(1)
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
  const maxAmount = Math.max(1, ...rows.map((c) => c.amount_mxn_high ?? c.amount_mxn_low ?? 0))

  return (
    <ul className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
      {rows.map((c) => {
        const amount = c.amount_mxn_high ?? c.amount_mxn_low ?? 0
        const barPct = (amount / maxAmount) * 100
        const years = c.contract_year_start
          ? `${c.contract_year_start}${c.contract_year_end && c.contract_year_end !== c.contract_year_start ? `–${c.contract_year_end}` : ''}`
          : null
        const fraud = fraudLabel(c.fraud_type, lang)
        const admin = adminLabel(c.administration)
        const statusColor = c.legal_status === 'prosecuted' ? RISK_TEXT_COLORS.critical : c.legal_status === 'impunity' ? RISK_TEXT_COLORS.high : 'var(--color-text-muted)'
        return (
          <li key={c.id} className="bg-background px-3 py-2.5 hover:bg-background-elevated transition-colors">
            {/* Line 1 — case · amount */}
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <EntityIdentityChip type="case" id={c.slug} name={lang === 'es' ? c.name_es : c.name_en} size="sm" />
              </div>
              {amount > 0 && (
                <span className="shrink-0 tabular-nums" style={{ ...BIGNUM_STYLE, fontSize: 15, color: 'var(--color-text-primary)' }}>
                  {formatCompactMXN(amount)}
                </span>
              )}
            </div>
            {/* Line 2 — full-width severity bar fills the void */}
            {amount > 0 && (
              <div className="mt-1.5">
                <FullBar pct={barPct} color={RISK_COLORS.high} height={4} ariaLabel={formatCompactMXN(amount)} />
              </div>
            )}
            {/* Line 3 — fraud type · administration · years · status */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5 font-mono tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
              {fraud && <span style={{ color: 'var(--color-text-secondary)' }}>{fraud}</span>}
              {admin && (<><span style={{ opacity: 0.5 }}>·</span><span>{admin}</span></>)}
              {years && (<><span style={{ opacity: 0.5 }}>·</span><span>{years}</span></>)}
              <span style={{ opacity: 0.5 }}>·</span>
              <span className="uppercase tracking-wider" style={{ fontSize: 9, color: statusColor, fontWeight: statusColor === 'var(--color-text-muted)' ? 400 : 600 }}>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {([1, 2, 3, 4] as const).map((tier) => {
          const tc = tiers.find((x) => x.tier === tier)
          const count = tc?.count ?? 0
          const maxCount = Math.max(1, ...tiers.map((x) => x.count))
          const barPct = (count / maxCount) * 100
          const sharePct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={tier} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: TIER_COLOR[tier], display: 'inline-block', flexShrink: 0 }} />
                <span
                  className="tabular-nums leading-none"
                  style={{ ...BIGNUM_STYLE, fontSize: 30, color: count > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {formatNumber(count)}
                </span>
              </div>
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                T{tier} · {lang === 'es' ? TIER_LABEL[tier][0] : TIER_LABEL[tier][1]}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <FullBar pct={barPct} color={TIER_COLOR[tier]} height={5} ariaLabel={`T${tier}`} />
                <span className="font-mono tabular-nums shrink-0" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{Math.round(sharePct)}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 9 · Largest single contracts ────────────────────────────────────────────

export interface SectorContractRow {
  contract_id: number
  amount_mxn: number
  year: number | null
  risk_level: string | null
  vendor_id: number | null
  vendor_name: string | null
  institution_id: number | null
  institution_name: string | null
  title: string | null
}

export function SectorLargestContracts({
  contracts,
  lang,
}: {
  contracts: SectorContractRow[]
  lang: 'en' | 'es'
}) {
  if (contracts.length === 0) {
    return <EmptyNote text={t(lang, 'Sin contratos registrados.', 'No contracts on record.')} />
  }
  const maxAmt = Math.max(1, ...contracts.map((c) => c.amount_mxn ?? 0))

  return (
    <ul className="divide-y divide-border/40 border border-border rounded-sm overflow-hidden">
      {contracts.map((c, i) => {
        const lvl = c.risk_level && ['critical', 'high', 'medium', 'low'].includes(c.risk_level)
          ? (c.risk_level as 'critical' | 'high' | 'medium' | 'low')
          : 'low'
        const barPct = ((c.amount_mxn ?? 0) / maxAmt) * 100
        return (
          <li key={c.contract_id} className="px-3 py-2 hover:bg-background-elevated transition-colors" style={{ borderLeft: `2px solid ${RISK_COLORS[lvl]}` }}>
            {/* Line 1 — rank · full-width amount bar · big amount */}
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums shrink-0 w-5 text-right" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
              <FullBar pct={barPct} color={RISK_COLORS[lvl]} height={7} ariaLabel={formatCompactMXN(c.amount_mxn ?? 0)} />
              <span
                className="tabular-nums shrink-0 text-right"
                style={{ ...BIGNUM_STYLE, fontSize: 18, width: 96, color: RISK_TEXT_COLORS[lvl] }}
              >
                {formatCompactMXN(c.amount_mxn ?? 0)}
              </span>
            </div>
            {/* Line 2 — vendor · institution · year · title fill the middle */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 pl-8">
              {c.vendor_id != null && c.vendor_name ? (
                <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="xs" />
              ) : (
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t(lang, 'proveedor no identificado', 'unidentified vendor')}</span>
              )}
              {c.institution_id != null && c.institution_name && (
                <>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)', opacity: 0.5 }}>→</span>
                  <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="xs" />
                </>
              )}
              {c.year != null && (
                <span className="font-mono tabular-nums shrink-0" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>{c.year}</span>
              )}
              {c.title && (
                <span className="truncate min-w-0" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  · {c.title}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
