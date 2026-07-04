/**
 * Contract-dossier formatting helpers (DESIGNUS "El Cotejo", Day-6).
 *
 *  - localizeProcedure: COMPRANET procedure_type / _normalized → clean bilingual
 *    label. The raw column is uppercase-unaccented ("LICITACIÓN PÚBLICA") or a
 *    normalized snake-case bucket; a resilient prefix matcher handles both and
 *    falls back to a title-cased echo.
 *  - describeContractFactor: one row of GET /contracts/{id}/risk, localized.
 *    The endpoint's `weight` is a v0.6.5-era hardcoded decoy (0.0 / 0.03 / 0.05)
 *    and `category` is undefined for the dynamic factors a flagged contract
 *    actually carries — so we render SEVERITY (alto/medio) + the human parameter,
 *    derive the category client-side from the code, and never print the weight.
 */
import { parseFactorLabel, getFactorCategoryColor, type FactorCategory } from './risk-factors'
import type {
  ContractRiskFactor,
  ContractDetail,
  ContractContextResponse,
  ContractRiskBreakdownResponse,
} from '@/api/types'
import { RISK_COLORS } from './constants'
import { formatDualCurrency } from './utils'
import { formatEntityName } from './entity/format'

// ── Procedure type ──────────────────────────────────────────────────────────

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Localize a COMPRANET procedure type. Handles raw uppercase, normalized
 *  snake-case, and unknown values (title-cased echo). */
export function localizeProcedure(
  raw: string | null | undefined,
  lang: 'en' | 'es',
): string {
  if (!raw || !raw.trim()) return '—'
  const k = stripAccents(raw.trim().toLowerCase()).replace(/[_\s]+/g, ' ')

  const has = (...needles: string[]) => needles.some((n) => k.includes(n))

  // Short normalized buckets ('directa'/'licitacion'/'invitacion'/'otro'/
  // 'desconocido') AND the full raw strings ("LICITACIÓN PÚBLICA", "Adjudicación
  // Directa Federal", …) both land here.
  if (has('licitacion', 'public tender', 'open tender')) {
    const intl = has('internacional', 'international')
    const nat = has('nacional', 'national')
    if (lang === 'es') return intl ? 'Licitación pública internacional' : nat ? 'Licitación pública nacional' : 'Licitación pública'
    return intl ? 'International public tender' : nat ? 'National public tender' : 'Open public tender'
  }
  if (has('invitacion', 'invitation', 'three', 'tres')) {
    return lang === 'es' ? 'Invitación a cuando menos tres' : 'Restricted invitation (3 quotes)'
  }
  if (has('directa', 'direct award', 'direct')) {
    return lang === 'es' ? 'Adjudicación directa' : 'Direct award'
  }
  if (has('desconocido', 'unknown')) {
    return lang === 'es' ? 'Procedimiento no especificado' : 'Procedure not specified'
  }
  if (k === 'otro' || k === 'otra' || k === 'other') {
    return lang === 'es' ? 'Otro procedimiento' : 'Other procedure'
  }
  // Unknown — title-case the raw value rather than echo SHOUTING CAPS.
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Description sanitizer (W4 — COMPRANET XML-escape leakage) ──────────────

export function sanitizeContractText(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/_x000[DA]_|&#x000[DA];/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:"'“”·—–-]+/, '')
    .trim()
}

// ── Charge line (W8 — computed one-line finding, spec §I cascade) ──────────

export interface ChargeLine {
  text: string
  tier: 'landmark' | 'notable' | 'routine'
}

function formatMultiple(mult: number): string {
  if (mult >= 100) return `×${Math.round(mult)}`
  if (mult >= 10) return `×${mult.toFixed(0)}`
  return `×${mult.toFixed(1)}`
}

export function buildChargeLine(
  contract: ContractDetail,
  context: ContractContextResponse | undefined,
  breakdown: ContractRiskBreakdownResponse | undefined,
  lang: 'en' | 'es',
): ChargeLine | null {
  const isEs = lang === 'es'
  const pair = context?.pair

  if (pair?.total_contracts && pair.total_contracts > 1 && pair.this_rank != null) {
    const total = formatDualCurrency(pair.total_amount_mxn)
    const inst = formatEntityName('institution', contract.institution_name)
    const y0 = pair.first_year ?? ''
    const y1 = pair.last_year ?? ''
    const text = isEs
      ? `Acta ${pair.this_rank} de ${pair.total_contracts} — una relación de ${total} con ${inst}, ${y0}–${y1}.`
      : `Act ${pair.this_rank} of ${pair.total_contracts} — a ${total} relationship with ${inst}, ${y0}–${y1}.`
    return { text, tier: 'landmark' }
  }

  if (context?.size_vs_p99 != null && context.size_vs_p99 >= 2) {
    const mult = formatMultiple(context.size_vs_p99)
    const text = isEs
      ? `Un contrato ${mult} el percentil 99 de su sector.`
      : `A contract at ${mult} the sector's 99th percentile.`
    return { text, tier: 'notable' }
  }

  const score = Number(contract.risk_score)
  if (Number.isFinite(score) && score >= 0.6 && breakdown?.factors?.length) {
    const top = [...breakdown.factors]
      .map((f) => describeContractFactor(f, lang))
      .filter((f) => f.severity)
      .sort((a, b) => b.sortKey - a.sortKey)[0]
    if (top) {
      const pct = Math.round(score * 100)
      const text = isEs
        ? `Marcado ${pct}/100 — señal dominante: ${top.label.toLowerCase()}.`
        : `Rated ${pct}/100 — leading signal: ${top.label.toLowerCase()}.`
      return { text, tier: 'notable' }
    }
  }

  return null
}

// ── Risk factor row ───────────────────────────────────────────────────────────

export type FactorSeverity = 'alto' | 'medio' | null

export interface DescribedFactor {
  code: string
  label: string            // localized factor name
  category: FactorCategory // derived client-side from the code (never the API field)
  categoryColor: string
  severity: FactorSeverity
  param: string | null     // human parameter, e.g. "200% · 124 socios" / "confianza 0.95"
  sortKey: number          // severity rank for ordering (higher = more severe)
}

// Spanish labels for the /risk factor families (the endpoint ships EN only).
const FAMILY_ES: Record<string, string> = {
  price_hyp: 'Sobreprecio detectado',
  extreme_overpricing: 'Sobreprecio extremo',
  statistical_outlier: 'Valor atípico estadístico',
  co_bid_high: 'Co-licitación alta',
  co_bid_med: 'Co-licitación media',
  co_bid_low: 'Co-licitación baja',
  single_bid: 'Postor único',
  direct_award: 'Adjudicación directa',
  restricted_procedure: 'Procedimiento restringido',
  price_anomaly: 'Anomalía de precio',
  industry_mismatch: 'Desajuste industria-sector',
  vendor_concentration: 'Concentración de proveedor',
  network_risk: 'Riesgo de red',
  year_end: 'Concentración fin de año',
  threshold_split: 'Fraccionamiento de umbral',
  inst_risk: 'Riesgo institucional',
}

export function familyKey(code: string): string {
  const head = code.split(':')[0]
  // collapse parametric families (network_3, split_2, short_ad_<5d) to a stem
  if (/^network_\d+$/.test(head)) return 'network_risk'
  if (/^split_\d+$/.test(head)) return 'threshold_split'
  if (/^short_ad/.test(head)) return 'short_ad'
  if (/^vendor_concentration/.test(head)) return 'vendor_concentration'
  return head
}

/** Severity per the spec: ALTO = price_hyp / co_bid_high; MEDIO = co_bid_med;
 *  everything else neutral. (The weight field is a decoy — do not rank on it.) */
function severityOf(code: string): FactorSeverity {
  const head = code.split(':')[0]
  if (head === 'price_hyp' || head === 'co_bid_high') return 'alto'
  if (head === 'co_bid_med') return 'medio'
  return null
}

/** Extract the human-readable parameter from a parametric code. */
function paramOf(code: string, lang: 'en' | 'es'): string | null {
  // co_bid_high:200%:124p → "200% · 124 socios" / "200% · 124 partners"
  const coBid = code.match(/^co_bid_(?:high|med|low):(\d+%?)(?::(\d+)p)?$/)
  if (coBid) {
    const pct = coBid[1].endsWith('%') ? coBid[1] : `${coBid[1]}%`
    if (coBid[2]) {
      const partners = lang === 'es' ? `${coBid[2]} socios` : `${coBid[2]} partners`
      return `${pct} · ${partners}`
    }
    return pct
  }
  // price_hyp:extreme_overpricing:0.95 → "confianza 0.95" / "confidence 0.95"
  const priceHyp = code.match(/^price_hyp:[^:]+:([\d.]+)$/)
  if (priceHyp) {
    return lang === 'es' ? `confianza ${priceHyp[1]}` : `confidence ${priceHyp[1]}`
  }
  // industry_mismatch:distribucion->s1 → the mismatch pair
  const mismatch = code.match(/^industry_mismatch:(.+)$/)
  if (mismatch) return mismatch[1].replace(/->/g, ' → ')
  return null
}

export function describeContractFactor(
  factor: ContractRiskFactor,
  lang: 'en' | 'es',
): DescribedFactor {
  const code = factor.code
  const parsed = parseFactorLabel(code) // ALWAYS returns a category (BROKEN-5 fix)
  const fam = familyKey(code)
  const label = lang === 'es'
    ? (FAMILY_ES[fam] ?? FAMILY_ES[code] ?? parsed.label)
    : (factor.name || parsed.label)
  const severity = severityOf(code)
  return {
    code,
    label,
    category: parsed.category,
    categoryColor: getFactorCategoryColor(parsed.category),
    severity,
    param: paramOf(code, lang),
    sortKey: severity === 'alto' ? 2 : severity === 'medio' ? 1 : 0,
  }
}

export function severityWord(severity: FactorSeverity, lang: 'en' | 'es'): string {
  if (severity === 'alto') return lang === 'es' ? 'ALTO' : 'HIGH'
  if (severity === 'medio') return lang === 'es' ? 'MEDIO' : 'MED'
  return ''
}

// ── Acta row anchoring (El Acta Anotada, P1) ────────────────────────────────
//
// Maps a described risk factor — or a structural boolean flag — to the acta
// row it indicts, so the margin note renders face-to-face with the exact
// field it objects to (spec §2.2).

export type ActaRowKey =
  | 'monto'
  | 'procedimiento'
  | 'proveedor'
  | 'institucion'
  | 'fechas'
  | 'general'

const CATEGORY_ROW: Record<FactorCategory, ActaRowKey> = {
  pricing: 'monto',
  competition: 'procedimiento',
  procedural: 'procedimiento',
  timing: 'fechas',
  network: 'proveedor',
  institutional: 'institucion',
  interaction: 'general',
}

// familyKey overrides — parametric families collapsed to a stem (see
// familyKey() above) that route to a specific row regardless of the
// category the risk-factor parser assigned them.
const FAMILY_ROW_OVERRIDE: Record<string, ActaRowKey> = {
  threshold_split: 'monto',
  industry_mismatch: 'proveedor',
  vendor_concentration: 'proveedor',
  year_end: 'fechas',
  inst_risk: 'institucion',
}

export function anchorRowOf(f: DescribedFactor): ActaRowKey {
  const fam = familyKey(f.code)
  if (fam in FAMILY_ROW_OVERRIDE) return FAMILY_ROW_OVERRIDE[fam]
  return CATEGORY_ROW[f.category] ?? 'general'
}

// ── Structural margin notes (absorbed from ContractSignalTags/OfficialCard,
// P1) — boolean flags + PyOD ensemble outlier rendered as acta objections,
// each with a dedupeKey so ActaLedger can suppress a note when a matching
// risk-factor family already anchors that row (spec §2.2 "Absorbed structural
// signals"). is_high_value / is_direct_award / is_single_bid are intentionally
// NOT rendered here — see spec for the rationale. ────────────────────────────

const STRUCTURAL_COLOR = '#71717a' // zinc — structural-neutral typology, not a risk color

export interface StructuralNote {
  row: ActaRowKey
  /** 'pill' = neutral typology tag rendered inline in the field VALUE column
   *  (existing tag-pill styling, per spec §2.2 ASCII mockup — [MARCO]
   *  [PLURIANUAL] sit under the field value, not in the margin). 'note' =
   *  a real objection rendered in the margin column with the ledger's
   *  ▲/· + label anatomy (no severity word — structural notes are not
   *  severity-ranked risk factors). */
  kind: 'pill' | 'note'
  glyph: '▲' | '·'
  color: string
  label: string
  param?: string
  title?: string
  dedupeKey?: string
}

export function buildStructuralNotes(contract: ContractDetail, lang: 'en' | 'es'): StructuralNote[] {
  const isEs = lang === 'es'
  const notes: StructuralNote[] = []

  if (contract.is_framework) {
    notes.push({
      row: 'procedimiento',
      kind: 'pill',
      glyph: '·',
      color: STRUCTURAL_COLOR,
      label: isEs ? 'MARCO' : 'FRAMEWORK',
      title: isEs ? 'Contrato marco' : 'Framework contract',
    })
  }
  if (contract.is_consolidated) {
    notes.push({
      row: 'procedimiento',
      kind: 'pill',
      glyph: '·',
      color: STRUCTURAL_COLOR,
      label: isEs ? 'CONSOLIDADO' : 'CONSOLIDATED',
      title: isEs ? 'Compra consolidada entre dependencias' : 'Consolidated multi-agency purchase',
    })
  }
  if (contract.is_multiannual) {
    notes.push({
      row: 'procedimiento',
      kind: 'pill',
      glyph: '·',
      color: STRUCTURAL_COLOR,
      label: isEs ? 'PLURIANUAL' : 'MULTIANNUAL',
      title: isEs ? 'Contrato plurianual' : 'Multi-year contract',
    })
  }
  if (contract.pyod_is_outlier && contract.ensemble_anomaly_score != null) {
    notes.push({
      row: 'monto',
      kind: 'note',
      glyph: '·',
      color: RISK_COLORS.high,
      label: `PyOD ▲${contract.ensemble_anomaly_score.toFixed(2)}`,
      dedupeKey: 'pyod',
      title: isEs
        ? 'Valor atípico para el conjunto PyOD (umbral 0.26)'
        : 'Flagged as an outlier by the PyOD ensemble (threshold 0.26)',
    })
  }
  if (contract.is_threshold_gaming) {
    notes.push({
      row: 'monto',
      kind: 'note',
      glyph: '▲',
      color: RISK_COLORS.critical,
      label: isEs ? 'Juego de umbral' : 'Threshold gaming',
      param: contract.threshold_proximity != null
        ? (isEs
          ? `${Math.round(contract.threshold_proximity * 100)}% del umbral`
          : `${Math.round(contract.threshold_proximity * 100)}% of threshold`)
        : undefined,
      dedupeKey: 'threshold_split',
    })
  }
  if (contract.is_year_end) {
    notes.push({
      row: 'fechas',
      kind: 'note',
      glyph: '▲',
      color: RISK_COLORS.medium,
      label: isEs ? 'Concentración fin de año' : 'Year-end concentration',
      dedupeKey: 'year_end',
      title: isEs ? 'Adjudicado en noviembre o diciembre' : 'Awarded in November or December',
    })
  }

  return notes
}
