/**
 * CategoryDossierSections — the enrichment sections for the category dossier.
 *
 * 2026-06-09 (DESIGNUS — category data-density pass). The category dossier sat
 * on top of far more reachable data than it rendered: it read only /summary,
 * /trends and /top-vendors-fast (3 of 10 endpoints) and stopped at a 2×2
 * diagnostic grid. These sections surface the prosecutorial material that was
 * already computed and instant — the procedure split (the category's signature
 * tell: direct-award dominates the COUNT of contracts while licitación
 * dominates the VALUE), the December year-end tell, the ARIA corruption-pattern
 * fingerprint, subcategory composition, and the vendor×institution capture
 * pairs — all in the shared folio register (mono labels, EB Garamond italics,
 * RISK_COLORS fills, full-width proportional bars, no green for low risk).
 *
 * Every section receives already-fetched data; the page (CategoryDossier) owns
 * the queries and renders the DossierSectionHeader. Each reuses the command
 * primitives (Panel / EmptyNote / EntityIdentityChip) and a local FullBar — none
 * reinvents chrome. getPriceDistribution is deliberately absent (it times out
 * >30s live); getVendorInstitution is strictly lazy (~14s).
 */
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { EditorialComposedChart } from '@/components/charts/editorial'
import { EmptyNote } from '@/components/dossier/command/primitives'
import {
  RISK_COLORS,
  RISK_TEXT_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

const t = (lang: 'en' | 'es', es: string, en: string) => (lang === 'es' ? es : en)

const BIGNUM_STYLE = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 800,
} as const

// ─── FullBar — canonical full-width proportional bar (category-local copy of the
//     sector dossier primitive — a track that stretches its flex container with a
//     single fill segment and an optional benchmark tick). ─────────────────────
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
      <div className="absolute inset-y-0 left-0" style={{ width: `max(${minFill}, ${clamped.toFixed(2)}%)`, background: color, borderRadius: 999 }} />
      {tickPct != null && (
        <div aria-hidden="true" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, tickPct)}%`, width: 1, background: 'var(--color-text-muted)' }} />
      )}
    </div>
  )
}

const FINDING_STYLE = {
  fontFamily: '"EB Garamond", Georgia, serif',
  fontStyle: 'italic' as const,
  fontSize: 14,
  lineHeight: 1.5,
  color: 'var(--color-text-secondary)',
}

// ════════════════════════════════════════════════════════════════════════════
// § I — THE PROCEDURE SPLIT (LA COMPETENCIA) — the category's signature tell.
// ════════════════════════════════════════════════════════════════════════════

export interface CompetitionData {
  procedure_breakdown: { type: string; count: number; pct_contracts: number; value: number; pct_value: number }[]
  yearly_trend: { year: number; contracts: number; da_pct: number; sb_pct: number }[]
  sector_da_avg: number | null
  sector_sb_avg: number | null
  total_contracts: number
}

// Procedure palette — direct award is the risk-bearing leg, licitación the
// competitive one. Never green (Bible §3.10).
function procedureColor(type: string, accent: string): string {
  const k = type.toLowerCase()
  if (k.startsWith('direct')) return RISK_COLORS.high
  if (k.startsWith('licit')) return accent
  if (k.startsWith('invit')) return RISK_COLORS.medium
  return 'var(--color-text-muted)'
}
function procedureLabel(type: string, lang: 'en' | 'es'): string {
  const k = type.toLowerCase()
  if (k.startsWith('direct')) return t(lang, 'Adjudicación directa', 'Direct award')
  if (k.startsWith('licit')) return t(lang, 'Licitación', 'Open tender')
  if (k.startsWith('invit')) return t(lang, 'Invitación', 'Invitation')
  return t(lang, 'Otro', 'Other')
}

function SegmentedBar({ segments }: { segments: { pct: number; color: string }[] }) {
  return (
    <div className="flex overflow-hidden" style={{ height: 16, borderRadius: 3, background: 'var(--color-border)' }} aria-hidden="true">
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${Math.max(0, Math.min(100, s.pct))}%`, background: s.color, borderRight: i < segments.length - 1 ? '1px solid var(--color-background)' : undefined }} />
      ))}
    </div>
  )
}

export function ProcedureSplit({ data, accent, lang }: { data: CompetitionData; accent: string; lang: 'en' | 'es' }) {
  const order = ['directa', 'licitacion', 'invitacion', 'otro']
  const pb = [...(data.procedure_breakdown ?? [])].sort(
    (a, b) => order.indexOf(a.type.toLowerCase()) - order.indexOf(b.type.toLowerCase()),
  )
  if (pb.length === 0) return <EmptyNote text={t(lang, 'Sin desglose de procedimiento.', 'No procedure breakdown.')} />

  const contractSegs = pb.map((p) => ({ pct: p.pct_contracts, color: procedureColor(p.type, accent) }))
  const valueSegs = pb.map((p) => ({ pct: p.pct_value, color: procedureColor(p.type, accent) }))
  const directa = pb.find((p) => p.type.toLowerCase().startsWith('direct'))
  const tender = pb.find((p) => p.type.toLowerCase().startsWith('licit'))
  const gap = directa ? Math.abs((directa.pct_contracts ?? 0) - (directa.pct_value ?? 0)) : 0

  // Drift: yearly DA / SB, normalized to 0–1 for the 'pct' formatter.
  const norm = (v: number) => (v > 1 ? v / 100 : v)
  const drift = (data.yearly_trend ?? [])
    .filter((d) => Number.isFinite(d.year))
    .map((d) => ({ year: d.year, da: norm(d.da_pct ?? 0), sb: norm(d.sb_pct ?? 0) }))
    .sort((a, b) => a.year - b.year)
  const secDa = data.sector_da_avg != null ? norm(data.sector_da_avg) : null

  return (
    <div className="space-y-5">
      {/* The inversion — two stacked 100% bars: contracts vs value */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] items-start">
        <div className="space-y-3">
          <div>
            <div className="font-mono flex items-baseline justify-between mb-1.5" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
              <span>{t(lang, 'Cuota de contratos', 'Share of contracts')}</span>
              {directa && <span className="tabular-nums" style={{ color: RISK_TEXT_COLORS.high, fontWeight: 600 }}>{Math.round(directa.pct_contracts)}% {t(lang, 'directa', 'direct')}</span>}
            </div>
            <SegmentedBar segments={contractSegs} />
          </div>
          <div>
            <div className="font-mono flex items-baseline justify-between mb-1.5" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
              <span>{t(lang, 'Cuota del valor', 'Share of value')}</span>
              {directa && <span className="tabular-nums" style={{ color: directa.pct_value < (directa.pct_contracts ?? 0) ? 'var(--color-text-muted)' : RISK_TEXT_COLORS.high, fontWeight: 600 }}>{Math.round(directa.pct_value)}% {t(lang, 'directa', 'direct')}</span>}
            </div>
            <SegmentedBar segments={valueSegs} />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {pb.map((p) => (
              <div key={p.type} className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: procedureColor(p.type, accent), flexShrink: 0 }} />
                {procedureLabel(p.type, lang)}
              </div>
            ))}
          </div>
        </div>

        {/* Pull-stat — the gap */}
        {directa && (
          <div className="lg:border-l lg:pl-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="tabular-nums" style={{ ...BIGNUM_STYLE, fontSize: 40, lineHeight: 1, color: gap >= 15 ? RISK_TEXT_COLORS.critical : 'var(--color-text-primary)' }}>
              {Math.round(directa.pct_contracts)}<span style={{ fontSize: 22 }}>%</span>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontStyle: 'normal', fontSize: 22 }}> → </span>
              {Math.round(directa.pct_value)}<span style={{ fontSize: 22 }}>%</span>
            </div>
            <div className="font-mono mt-1.5" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              {t(lang, 'adjudicación directa · contratos → valor', 'direct award · contracts → value')}
            </div>
            <p className="mt-3" style={FINDING_STYLE}>
              {gap >= 15
                ? t(
                    lang,
                    `La adjudicación directa absorbe el ${Math.round(directa.pct_contracts)}% de los contratos pero solo el ${Math.round(directa.pct_value)}% del dinero${tender ? `: las licitaciones, el ${Math.round(tender.pct_contracts)}% de los contratos, mueven el ${Math.round(tender.pct_value)}% del valor` : ''}. Los grandes montos se licitan; los pequeños se reparten.`,
                    `Direct award absorbs ${Math.round(directa.pct_contracts)}% of contracts but only ${Math.round(directa.pct_value)}% of the money${tender ? `: open tenders — ${Math.round(tender.pct_contracts)}% of contracts — move ${Math.round(tender.pct_value)}% of the value` : ''}. The big sums are tendered; the small ones are handed out.`,
                  )
                : t(
                    lang,
                    `La adjudicación directa representa el ${Math.round(directa.pct_contracts)}% de los contratos y el ${Math.round(directa.pct_value)}% del valor — sin una brecha marcada entre conteo y monto.`,
                    `Direct award is ${Math.round(directa.pct_contracts)}% of contracts and ${Math.round(directa.pct_value)}% of value — no sharp count-vs-value gap.`,
                  )}
            </p>
          </div>
        )}
      </div>

      {/* The drift — DA / SB over time vs the sector benchmark */}
      {drift.length > 1 && (
        <div>
          <div className="font-mono mb-1.5" style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            {t(lang, 'Adjudicación directa y único postor en el tiempo', 'Direct award & single bid over time')}
          </div>
          <EditorialComposedChart
            data={drift}
            xKey="year"
            yFormat="pct"
            yDomain={[0, 1]}
            height={120}
            layers={[
              { kind: 'line', key: 'da', label: t(lang, 'Adj. directa', 'Direct award'), colorToken: 'risk-critical', emphasis: 'primary' },
              { kind: 'line', key: 'sb', label: t(lang, 'Único postor', 'Single bid'), colorToken: 'risk-high', emphasis: 'secondary' },
            ]}
            annotations={secDa != null ? [{ kind: 'hrule', y: secDa, label: t(lang, 'media del sector', 'sector avg'), tone: 'oecd' }] : undefined}
          />
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — THE DECEMBER TELL (LA SEÑAL DE DICIEMBRE) — year-end budget-flush.
// ════════════════════════════════════════════════════════════════════════════

export interface SeasonalityData {
  monthly: { month: number; month_name: string; contracts: number; value: number; pct_contracts: number; pct_value: number }[]
  december_pct_value: number
  december_index: number
}

const MONTH_INITIALS_ES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_INITIALS_EN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function SeasonalityTell({ data, accent, lang }: { data: SeasonalityData; accent: string; lang: 'en' | 'es' }) {
  const months = [...(data.monthly ?? [])].sort((a, b) => a.month - b.month)
  if (months.length === 0) return <EmptyNote text={t(lang, 'Sin datos de estacionalidad.', 'No seasonality data.')} />
  const initials = lang === 'es' ? MONTH_INITIALS_ES : MONTH_INITIALS_EN
  const maxPct = Math.max(...months.map((m) => m.pct_value), 8.34)
  const idx = data.december_index ?? 0
  const decPct = data.december_pct_value ?? months.find((m) => m.month === 12)?.pct_value ?? 0
  const severe = idx >= 1.5
  const decColor = idx >= 2 ? RISK_COLORS.critical : idx >= 1.5 ? RISK_COLORS.high : accent
  const uniformPct = 8.333 // 1/12

  return (
    <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr] items-end">
      {/* 12-column monthly strip, height ∝ pct_value, reference line at uniform 8.3% */}
      <div>
        <div className="relative flex items-end gap-[3px]" style={{ height: 92 }}>
          {/* uniform-share reference line */}
          <div aria-hidden="true" className="absolute left-0 right-0" style={{ bottom: `${(uniformPct / maxPct) * 92}px`, height: 1, background: 'var(--color-text-muted)', opacity: 0.4 }} />
          {months.map((m) => {
            const h = Math.max(2, (m.pct_value / maxPct) * 92)
            const isDec = m.month === 12
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end" style={{ height: 92 }} title={`${m.month_name}: ${m.pct_value.toFixed(1)}%`}>
                <div style={{ width: '100%', height: h, background: isDec ? decColor : 'var(--color-border)', borderRadius: '2px 2px 0 0', opacity: isDec ? 1 : 0.85 }} />
              </div>
            )
          })}
        </div>
        <div className="flex gap-[3px] mt-1">
          {months.map((m) => (
            <div key={m.month} className="flex-1 text-center font-mono" style={{ fontSize: 8, color: m.month === 12 ? decColor : 'var(--color-text-muted)', fontWeight: m.month === 12 ? 700 : 400 }}>
              {initials[m.month - 1]}
            </div>
          ))}
        </div>
        <div className="font-mono mt-1.5" style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {t(lang, 'línea = cuota uniforme (8.3%) · altura = % del valor anual', 'line = even share (8.3%) · height = % of annual value')}
        </div>
      </div>

      {/* Anchor + verdict */}
      <div className="sm:border-l sm:pl-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="tabular-nums" style={{ ...BIGNUM_STYLE, fontSize: 40, lineHeight: 1, color: severe ? RISK_TEXT_COLORS[idx >= 2 ? 'critical' : 'high'] : 'var(--color-text-primary)' }}>
          {idx > 0 ? `${idx.toFixed(1)}×` : '—'}
        </div>
        <div className="font-mono mt-1.5" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {t(lang, 'diciembre vs mes promedio', 'December vs average month')}
        </div>
        <p className="mt-3" style={FINDING_STYLE}>
          {severe
            ? t(
                lang,
                `Diciembre concentra el ${decPct.toFixed(0)}% del valor anual — ${idx.toFixed(1)}× la cuota esperada. El gasto se avalancha a fin de año.`,
                `December holds ${decPct.toFixed(0)}% of the annual value — ${idx.toFixed(1)}× the expected share. Spending avalanches into year-end.`,
              )
            : t(
                lang,
                `Diciembre concentra el ${decPct.toFixed(0)}% del valor anual — sin un pico marcado de fin de año.`,
                `December holds ${decPct.toFixed(0)}% of the annual value — no sharp year-end spike.`,
              )}
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — THE ARIA FINGERPRINT (LA HUELLA ARIA) — corruption-pattern profile.
// ════════════════════════════════════════════════════════════════════════════

export interface PatternsData {
  total_vendors: number
  vendors_in_aria: number
  dominant_pattern: string | null
  patterns: { pattern: string; label_es: string; label_en: string; color: string; vendor_count: number; pct_of_aria: number; high_tier_count: number }[]
}

export function AriaFingerprint({ data, lang }: { data: PatternsData; lang: 'en' | 'es' }) {
  const pats = [...(data.patterns ?? [])].filter((p) => p.vendor_count > 0).sort((a, b) => b.vendor_count - a.vendor_count)
  if (data.vendors_in_aria === 0 || pats.length === 0) {
    return <EmptyNote text={t(lang, 'Ningún proveedor de esta categoría está en la cola de investigación ARIA.', 'No vendors from this category are in the ARIA investigation queue.')} />
  }
  const maxCount = Math.max(...pats.map((p) => p.vendor_count))
  const cov = data.total_vendors > 0 ? (data.vendors_in_aria / data.total_vendors) * 100 : 0

  return (
    <div className="space-y-3">
      <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `${formatNumber(data.vendors_in_aria)} de ${formatNumber(data.total_vendors)} proveedores (${cov.toFixed(0)}%) están en la cola ARIA.`,
          `${formatNumber(data.vendors_in_aria)} of ${formatNumber(data.total_vendors)} vendors (${cov.toFixed(0)}%) are in the ARIA queue.`,
        )}
      </p>
      <div className="space-y-2.5">
        {pats.slice(0, 6).map((p) => {
          const label = lang === 'es' ? p.label_es : p.label_en
          return (
            <div key={p.pattern} className="flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-2" style={{ width: 168 }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: p.color, flexShrink: 0 }} />
                <span className="font-mono truncate" style={{ fontSize: 10.5, color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.pattern}</span> {label}
                </span>
              </div>
              <FullBar pct={(p.vendor_count / maxCount) * 100} color={p.color} height={7} ariaLabel={label} />
              <span className="shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 11, color: 'var(--color-text-secondary)', width: 88 }}>
                {formatNumber(p.vendor_count)} <span style={{ color: 'var(--color-text-muted)' }}>· {p.pct_of_aria.toFixed(0)}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — SUBCATEGORY COMPOSITION (LA COMPOSICIÓN) — conditional; many cats have none.
// ════════════════════════════════════════════════════════════════════════════

export interface SubcatRow {
  subcategory_id: number
  name_es: string
  name_en: string
  total_value: number
  avg_risk: number
  direct_award_pct: number
  pct_of_category: number
  top_vendor_name: string | null
  top_vendor_id: number | null
  example_titles: string[]
}

export function SubcategoryComposition({ rows, accent, lang }: { rows: SubcatRow[]; accent: string; lang: 'en' | 'es' }) {
  const items = [...(rows ?? [])].sort((a, b) => b.total_value - a.total_value).slice(0, 8)
  if (items.length === 0) return null
  const maxPct = Math.max(...items.map((r) => r.pct_of_category), 1)

  return (
    <div className="space-y-3.5">
      {items.map((r) => {
        const name = lang === 'es' ? r.name_es : r.name_en
        const lvl = r.avg_risk > 0 ? getRiskLevelFromScore(r.avg_risk) : 'low'
        const example = r.example_titles?.[0]
        return (
          <div key={r.subcategory_id}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="truncate" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}>
                {name}
              </span>
              <span className="shrink-0 flex items-baseline gap-2.5 font-mono tabular-nums" style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{formatCompactMXN(r.total_value)}</span>
                <span style={{ color: r.avg_risk > 0 ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)', fontWeight: 600 }}>{r.avg_risk > 0 ? Math.round(r.avg_risk * 100) : '—'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FullBar pct={(r.pct_of_category / maxPct) * 100} color={accent} height={6} ariaLabel={name} />
              <span className="shrink-0 font-mono tabular-nums" style={{ fontSize: 9.5, color: 'var(--color-text-muted)', width: 88, textAlign: 'right' }}>
                {r.pct_of_category.toFixed(1)}% · {Math.round(r.direct_award_pct)}% {t(lang, 'AD', 'DA')}
              </span>
            </div>
            {example && (
              <p className="truncate mt-0.5" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {t(lang, 'p. ej.', 'e.g.')} {example}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — CAPTURE PAIRS (PARES DE CAPTURA) — vendor × institution.
// 2026-06-09: now served from a precomputed table (instant) — the old "Load
// capture pairs" button is gone; the section fetches eagerly like its siblings.
// ════════════════════════════════════════════════════════════════════════════

export interface CapturePairRow {
  vendor_id: number
  vendor_name: string
  institution_id: number
  institution_name: string
  contract_count: number
  total_value: number
  avg_risk: number
  max_risk: number
  direct_award_pct: number
  single_bid_pct: number
}

export function CapturePairs({
  rows,
  isLoading,
  lang,
}: {
  rows: CapturePairRow[]
  isLoading: boolean
  lang: 'en' | 'es'
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 rounded-sm" style={{ background: 'var(--color-background-elevated)' }} />
        ))}
        <p className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t(lang, 'Consultando… puede tardar.', 'Querying… may take a moment.')}</p>
      </div>
    )
  }
  const items = [...(rows ?? [])].sort((a, b) => b.total_value - a.total_value).slice(0, 12)
  if (items.length === 0) {
    return <EmptyNote text={t(lang, 'Sin pares recurrentes proveedor × institución.', 'No recurring vendor × institution pairs.')} />
  }
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <table className="w-full text-sm" aria-label={t(lang, 'Pares proveedor × institución', 'Vendor × institution pairs')}>
        <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
          <tr>
            <th scope="col" className="text-left px-3 py-2 font-semibold">{t(lang, 'Proveedor → Institución', 'Vendor → Institution')}</th>
            <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Contratos', 'Contracts')}</th>
            <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Monto', 'Amount')}</th>
            <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'AD', 'DA')}</th>
            <th scope="col" className="text-right px-3 py-2 font-semibold">{t(lang, 'Riesgo', 'Risk')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const lvl = r.avg_risk > 0 ? getRiskLevelFromScore(r.avg_risk) : 'low'
            return (
              <tr key={`${r.vendor_id}-${r.institution_id}`} className="border-t border-border/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <EntityIdentityChip type="vendor" id={r.vendor_id} name={r.vendor_name} size="sm" />
                    <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>→</span>
                    <EntityIdentityChip type="institution" id={r.institution_id} name={r.institution_name} size="sm" hideIcon />
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-text-muted">{formatNumber(r.contract_count)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCompactMXN(r.total_value)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: r.direct_award_pct > 80 ? RISK_TEXT_COLORS.high : 'var(--color-text-secondary)' }}>{Math.round(r.direct_award_pct)}%</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: r.avg_risk > 0 ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)', fontWeight: 600 }}>{r.avg_risk > 0 ? Math.round(r.avg_risk * 100) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — CONTRACT SIZE / OUTLIERS (EL TAMAÑO DEL CONTRATO) — the shape of spending:
// a typical contract is small, but a handful of mega-contracts hold the money.
// ════════════════════════════════════════════════════════════════════════════

export interface PriceSpreadData {
  n: number
  p25: number | null
  p50: number | null
  p75: number | null
  mean: number | null
  mean_median_ratio: number | null
  outlier_count: number
  mega_count?: number
  mega_value?: number
  mega_value_pct?: number
  total_value?: number
}

export function PriceSpread({ data, accent, lang }: { data: PriceSpreadData; accent: string; lang: 'en' | 'es' }) {
  const { p25, p50, p75, mean } = data
  if (!p50 || !p75 || !mean) return <EmptyNote text={t(lang, 'Sin distribución de precios.', 'No price distribution.')} />
  const lo = p25 ?? 0
  const scaleMax = Math.max(p75, mean) * 1.12
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`
  const ratio = data.mean_median_ratio ?? (mean / p50)
  const megaPct = data.mega_value_pct ?? 0
  const megaN = data.mega_count ?? 0
  const skewed = ratio >= 3
  const anchorColor = megaPct >= 30 ? RISK_TEXT_COLORS.critical : megaPct >= 15 ? RISK_TEXT_COLORS.high : 'var(--color-text-primary)'

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
      {/* Quartile scale — IQR box, median line, mean marker (right-skew made visible) */}
      <div>
        <div className="relative" style={{ height: 56 }}>
          {/* baseline track */}
          <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 26, height: 3, background: 'var(--color-border)', borderRadius: 999 }} />
          {/* IQR box P25→P75 */}
          <div aria-hidden="true" className="absolute" style={{ left: x(lo), width: `calc(${x(p75)} - ${x(lo)})`, top: 18, height: 19, background: `${accent}33`, border: `1px solid ${accent}`, borderRadius: 3 }} />
          {/* median line */}
          <div aria-hidden="true" className="absolute" style={{ left: x(p50), top: 14, height: 27, width: 2, background: accent }} />
          {/* mean marker */}
          <div aria-hidden="true" className="absolute" style={{ left: x(mean), top: 10, height: 35, width: 2, background: anchorColor }} />
          {/* labels */}
          <div className="absolute font-mono tabular-nums" style={{ left: x(p50), top: 0, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {t(lang, 'mediana', 'median')} {formatCompactMXN(p50)}
          </div>
          <div className="absolute font-mono tabular-nums" style={{ left: x(mean), top: 44, transform: 'translateX(-50%)', fontSize: 9, color: anchorColor, whiteSpace: 'nowrap', fontWeight: 600 }}>
            {t(lang, 'promedio', 'mean')} {formatCompactMXN(mean)}
          </div>
        </div>
        <div className="font-mono mt-1 flex justify-between" style={{ fontSize: 8.5, color: 'var(--color-text-muted)' }}>
          <span>P25 {p25 != null ? formatCompactMXN(p25) : '—'}</span>
          <span>P75 {formatCompactMXN(p75)}</span>
        </div>
        <p className="mt-3" style={FINDING_STYLE}>
          {skewed
            ? t(
                lang,
                `La mitad de los contratos vale menos de ${formatCompactMXN(p50)}, pero el promedio (${formatCompactMXN(mean)}) lo supera ${ratio.toFixed(1)}× — unos pocos contratos gigantes inflan la media.`,
                `Half the contracts are worth less than ${formatCompactMXN(p50)}, yet the mean (${formatCompactMXN(mean)}) runs ${ratio.toFixed(1)}× higher — a handful of giant contracts pull the average up.`,
              )
            : t(
                lang,
                `La mediana es ${formatCompactMXN(p50)} y el promedio ${formatCompactMXN(mean)} (${ratio.toFixed(1)}×) — sin una cola de valores extremos marcada.`,
                `The median is ${formatCompactMXN(p50)} and the mean ${formatCompactMXN(mean)} (${ratio.toFixed(1)}×) — no pronounced extreme-value tail.`,
              )}
        </p>
      </div>

      {/* Mega-contract concentration anchor */}
      <div className="lg:border-l lg:pl-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="tabular-nums" style={{ ...BIGNUM_STYLE, fontSize: 44, lineHeight: 1, color: anchorColor }}>
          {megaPct > 0 ? `${megaPct.toFixed(0)}` : '—'}<span style={{ fontSize: 24 }}>%</span>
        </div>
        <div className="font-mono mt-1.5" style={{ fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {t(lang, 'del valor · en contratos ≥ 1.000 MDP', 'of value · in contracts ≥ 1B MXN')}
        </div>
        <p className="mt-3" style={FINDING_STYLE}>
          {megaN > 0
            ? t(
                lang,
                `${formatNumber(megaN)} ${megaN === 1 ? 'contrato concentra' : 'contratos concentran'} el ${megaPct.toFixed(0)}% del dinero de la categoría — de ${formatNumber(data.n)} contratos en total.`,
                `${formatNumber(megaN)} ${megaN === 1 ? 'contract holds' : 'contracts hold'} ${megaPct.toFixed(0)}% of the category's money — out of ${formatNumber(data.n)} contracts in all.`,
              )
            : t(lang, `Ningún contrato supera los 1.000 MDP en esta categoría.`, `No single contract exceeds 1B MXN in this category.`)}
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — LARGEST CONTRACTS (LOS GRANDES CONTRATOS) — named, datable, clickable.
// ════════════════════════════════════════════════════════════════════════════

export interface LargeContractRow {
  contract_id: number
  amount_mxn: number
  year: number | null
  risk_level: string | null
  risk_score: number | null
  vendor_id: number | null
  vendor_name: string | null
  institution_id: number | null
  institution_name: string | null
  title: string | null
}

export function LargestContracts({ rows, accent, lang }: { rows: LargeContractRow[]; accent: string; lang: 'en' | 'es' }) {
  const items = (rows ?? []).filter((r) => (r.amount_mxn ?? 0) > 0)
  if (items.length === 0) return <EmptyNote text={t(lang, 'Sin contratos destacados.', 'No standout contracts.')} />
  const maxAmt = Math.max(...items.map((r) => r.amount_mxn))

  return (
    <ol className="space-y-3.5">
      {items.map((r, i) => {
        const lvl = r.risk_score != null && r.risk_score > 0 ? getRiskLevelFromScore(r.risk_score) : 'low'
        const riskPct = r.risk_score != null && r.risk_score > 0 ? Math.round(r.risk_score * 100) : null
        return (
          <li key={r.contract_id} className="flex gap-3">
            <span className="font-mono tabular-nums shrink-0" style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 16, lineHeight: '1.5rem' }}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="tabular-nums" style={{ ...BIGNUM_STYLE, fontSize: 19, color: 'var(--color-text-primary)' }}>
                  {formatCompactMXN(r.amount_mxn)}
                </span>
                <span className="shrink-0 flex items-baseline gap-2.5 font-mono tabular-nums" style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  {r.year != null && <span>{r.year}</span>}
                  {riskPct != null && (
                    <span style={{ color: RISK_TEXT_COLORS[lvl], fontWeight: 600 }}>{riskPct}</span>
                  )}
                </span>
              </div>
              <div className="mt-0.5">
                <div style={{ position: 'relative', height: 3, background: 'var(--color-border)', borderRadius: 999 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(r.amount_mxn / maxAmt) * 100}%`, background: accent, borderRadius: 999 }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {r.vendor_id != null && r.vendor_name && (
                  <EntityIdentityChip type="vendor" id={r.vendor_id} name={r.vendor_name} size="sm" />
                )}
                {r.institution_id != null && r.institution_name && (
                  <>
                    <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>→</span>
                    <EntityIdentityChip type="institution" id={r.institution_id} name={r.institution_name} size="sm" hideIcon />
                  </>
                )}
              </div>
              {r.title && (
                <p className="truncate mt-1" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {r.title}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// § — TOP BUYERS (QUIÉN COMPRA) — the institutions that SPEND in this category.
// ════════════════════════════════════════════════════════════════════════════

export interface TopBuyerRow {
  institution_id: number
  name: string
  full_name: string
  contract_count: number
  value_mxn: number
  share_pct: number
  avg_risk: number | null
}

export function TopBuyers({ rows, lang }: { rows: TopBuyerRow[]; lang: 'en' | 'es' }) {
  const items = (rows ?? []).filter((r) => (r.value_mxn ?? 0) > 0)
  if (items.length === 0) return <EmptyNote text={t(lang, 'Sin desglose por institución compradora.', 'No buying-institution breakdown.')} />
  const maxShare = Math.max(...items.map((r) => r.share_pct), 1)
  const top3 = items.slice(0, 3).reduce((s, r) => s + (r.share_pct ?? 0), 0)

  return (
    <div className="space-y-3">
      <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {t(
          lang,
          `Las 3 mayores instituciones colocan el ${Math.round(top3)}% del gasto de la categoría.`,
          `The top 3 institutions place ${Math.round(top3)}% of the category's spend.`,
        )}
      </p>
      <div className="space-y-2.5">
        {items.map((r) => {
          const lvl = r.avg_risk != null && r.avg_risk > 0 ? getRiskLevelFromScore(r.avg_risk) : 'low'
          const riskPct = r.avg_risk != null && r.avg_risk > 0 ? Math.round(r.avg_risk * 100) : null
          return (
            <div key={r.institution_id} className="flex items-center gap-3">
              <div className="shrink-0 min-w-0" style={{ width: 188 }}>
                <EntityIdentityChip type="institution" id={r.institution_id} name={r.name} size="sm" hideIcon />
              </div>
              <FullBar pct={(r.share_pct / maxShare) * 100} color={r.share_pct >= 40 ? RISK_COLORS.high : 'var(--color-text-secondary)'} height={7} ariaLabel={r.name} />
              <span className="shrink-0 text-right font-mono tabular-nums flex items-baseline justify-end gap-2" style={{ fontSize: 11, color: 'var(--color-text-secondary)', width: 132 }}>
                <span>{formatCompactMXN(r.value_mxn)}</span>
                <span style={{ color: r.share_pct >= 40 ? RISK_TEXT_COLORS.high : 'var(--color-text-muted)', fontWeight: r.share_pct >= 40 ? 600 : 400 }}>{r.share_pct.toFixed(0)}%</span>
                <span style={{ color: riskPct != null ? RISK_TEXT_COLORS[lvl] : 'var(--color-text-muted)', fontWeight: 600, width: 22 }}>{riskPct ?? '—'}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
