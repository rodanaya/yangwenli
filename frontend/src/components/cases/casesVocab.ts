/**
 * casesVocab — single-source vocabulary + encoding for the Case Library
 * ("El Padrón", /cases) and the Case Dossier ("El Expediente", /cases/:slug).
 *
 * DESIGNUS synthesis 2026-06-10 (_designus_cases/SYNTHESIS.md). This module
 * is the bug-fix home for the raw-enum class of defects (FRAUDTYPES.X,
 * INFRASTRUCTURE_OVERRUN, MULTIPLE rendering on prod): every fraud type,
 * administration, legal status and COMPRANET-visibility value renders
 * through these maps, each with a humanized fallback so an unknown enum
 * can never reach the screen raw again.
 *
 * Color discipline (panel ruling):
 *   - legal DISPOSITION is the only status-coded axis; impunity alone is red.
 *   - the lone conviction renders in neutral ink with an ochre RING glyph
 *     (chrome marking) — never green, never an ochre fill.
 *   - fraud type carries NO color (the FRAUD_TYPE_LEFT rainbow is dead).
 */
import { RISK_COLORS, RISK_TEXT_COLORS, SECTORS } from '@/lib/constants'
import { ADMINISTRATIONS, getAdministrationByYear } from '@/lib/administrations'
import type { ScandalDetail, ScandalListItem } from '@/api/types'

export type Lang = 'en' | 'es'

export const CURRENT_YEAR = new Date().getFullYear()

// ─── Fraud types — typographic only, complete map + fallback ────────────────

const FRAUD_LABEL: Record<string, { en: string; es: string }> = {
  ghost_company:          { en: 'Ghost Company',           es: 'Empresa fantasma' },
  bid_rigging:            { en: 'Bid Rigging',             es: 'Colusión de licitación' },
  overpricing:            { en: 'Overpricing',             es: 'Sobreprecio' },
  conflict_of_interest:   { en: 'Conflict of Interest',    es: 'Conflicto de interés' },
  embezzlement:           { en: 'Embezzlement',            es: 'Desvío de recursos' },
  bribery:                { en: 'Bribery',                 es: 'Soborno' },
  procurement_fraud:      { en: 'Procurement Fraud',       es: 'Fraude de adquisiciones' },
  monopoly:               { en: 'Monopoly',                es: 'Monopolio' },
  emergency_fraud:        { en: 'Emergency Fraud',         es: 'Fraude por emergencia' },
  tender_rigging:         { en: 'Tender Rigging',          es: 'Manipulación de concurso' },
  invoice_fraud:          { en: 'Invoice Fraud',           es: 'Fraude de facturación' },
  infrastructure_overrun: { en: 'Infrastructure Overrun',  es: 'Sobrecosto de obra' },
  state_capture:          { en: 'State Capture',           es: 'Captura del Estado' },
  cartel_infiltration:    { en: 'Cartel Infiltration',     es: 'Infiltración del crimen organizado' },
  other:                  { en: 'Other',                   es: 'Otro' },
}

/** De-underscore + title-case — the defensive net for unknown enum values. */
function humanize(raw: string): string {
  return raw
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function fraudLabel(type: string | undefined | null, lang: Lang): string {
  if (!type) return ''
  const hit = FRAUD_LABEL[type]
  return hit ? hit[lang] : humanize(type)
}

// ─── Legal disposition — the color spine ────────────────────────────────────

export interface DispositionMeta {
  /** Fill for rails / seals / band segments (RISK_COLORS scale). */
  fill: string
  /** AA-safe ink for words / numerals (RISK_TEXT_COLORS scale). */
  ink: string
  label: { en: string; es: string }
  /** True while the case has no final disposition — drives the dashed
   *  open segment on the impunity arc. */
  isOpen: boolean
  /** The lone-conviction marker: neutral ink + ochre ring glyph. */
  ring?: boolean
}

const NEUTRAL_FILL = RISK_COLORS.low
const NEUTRAL_INK = 'var(--color-text-muted)'

const DISPOSITION: Record<string, DispositionMeta> = {
  impunity: {
    fill: RISK_COLORS.critical,
    ink: RISK_TEXT_COLORS.critical,
    label: { en: 'Impunity', es: 'Impunidad' },
    isOpen: true,
  },
  investigation: {
    fill: RISK_COLORS.medium,
    ink: RISK_TEXT_COLORS.medium,
    label: { en: 'Investigation', es: 'Investigación' },
    isOpen: true,
  },
  ongoing: {
    fill: RISK_COLORS.medium,
    ink: RISK_TEXT_COLORS.medium,
    label: { en: 'Ongoing', es: 'En curso' },
    isOpen: true,
  },
  prosecuted: {
    fill: RISK_COLORS.high,
    ink: RISK_TEXT_COLORS.high,
    label: { en: 'Prosecuted', es: 'Procesado' },
    isOpen: true,
  },
  convicted: {
    fill: NEUTRAL_FILL,
    ink: 'var(--color-text-secondary)',
    label: { en: 'Convicted', es: 'Condena' },
    isOpen: false,
    ring: true,
  },
  acquitted: {
    fill: NEUTRAL_FILL,
    ink: NEUTRAL_INK,
    label: { en: 'Acquitted', es: 'Absuelto' },
    isOpen: false,
  },
  dismissed: {
    fill: NEUTRAL_FILL,
    ink: NEUTRAL_INK,
    label: { en: 'Dismissed', es: 'Desestimado' },
    isOpen: false,
  },
  settled: {
    fill: NEUTRAL_FILL,
    ink: NEUTRAL_INK,
    label: { en: 'Settled', es: 'Acuerdo' },
    isOpen: false,
  },
  reported: {
    fill: NEUTRAL_FILL,
    ink: NEUTRAL_INK,
    label: { en: 'Documented', es: 'Documentado' },
    isOpen: true,
  },
  unresolved: {
    fill: NEUTRAL_FILL,
    ink: NEUTRAL_INK,
    label: { en: 'Unresolved', es: 'Sin resolución' },
    isOpen: false,
  },
}

export function dispositionFor(status: string | undefined | null): DispositionMeta {
  return (status && DISPOSITION[status]) || DISPOSITION.unresolved
}

export function dispositionLabel(status: string | undefined | null, lang: Lang): string {
  if (!status) return DISPOSITION.unresolved.label[lang]
  const hit = DISPOSITION[status]
  return hit ? hit.label[lang] : humanize(status)
}

/** Display order for the disposition band — worst outcome first. */
export const DISPOSITION_ORDER = [
  'impunity', 'investigation', 'ongoing', 'prosecuted',
  'settled', 'dismissed', 'unresolved', 'reported', 'acquitted', 'convicted',
] as const

// ─── Administrations — boundary-corrected + sexenio spans ───────────────────

/**
 * Boundary-corrected administration for a single-sexenio case. Preserves the
 * audited 2026-05-11 override rule (F068/F069 — Tren Maya / NAICM): trust the
 * DB value when the case's start year falls inside that term; otherwise
 * derive from the start year.
 */
export function effectiveAdminKey(cas: {
  administration?: string | null
  contract_year_start?: number | null
  contract_year_end?: number | null
}): string | null {
  const startYear = cas.contract_year_start ?? cas.contract_year_end ?? null
  const dbRecord = cas.administration
    ? ADMINISTRATIONS.find((a) => a.key === cas.administration)
    : null
  const dbFitsYear =
    dbRecord != null &&
    startYear != null &&
    startYear >= dbRecord.yearStart &&
    startYear <= dbRecord.yearEnd
  if (dbFitsYear) return dbRecord.key
  const derived = getAdministrationByYear(startYear)
  return derived?.key ?? cas.administration ?? null
}

const ADMIN_PROPER: Record<string, string> = {
  fox: 'Fox',
  calderon: 'Calderón',
  epn: 'Peña Nieto',
  amlo: 'AMLO',
  sheinbaum: 'Sheinbaum',
}

/**
 * Sexenio label for any case. `administration === 'multiple'` resolves to the
 * computed span "Calderón → Peña Nieto" from the contract years (CRONISTA
 * graft) — strictly more informative than a flat "Multiple administrations";
 * falls back to the flat label when years are missing.
 */
export function sexenioLabel(
  cas: {
    administration?: string | null
    contract_year_start?: number | null
    contract_year_end?: number | null
  },
  lang: Lang,
): string {
  const admin = cas.administration
  if (admin && admin !== 'multiple' && admin !== 'unknown') {
    const key = effectiveAdminKey(cas)
    return (key && ADMIN_PROPER[key]) || humanize(admin)
  }
  if (admin === 'multiple') {
    const a = getAdministrationByYear(cas.contract_year_start)
    const b = getAdministrationByYear(cas.contract_year_end)
    if (a && b && a.key !== b.key) {
      // Compact tokens — the span has to fit a 110px agate cell.
      const SPAN_SHORT: Record<string, string> = {
        fox: 'Fox', calderon: 'Calderón', epn: 'EPN', amlo: 'AMLO', sheinbaum: 'Sheinbaum',
      }
      return `${SPAN_SHORT[a.key]} → ${SPAN_SHORT[b.key]}`
    }
    if (a) return ADMIN_PROPER[a.key]
    return lang === 'es' ? 'Varias administraciones' : 'Multiple administrations'
  }
  return lang === 'es' ? 'Administración no determinada' : 'Administration unknown'
}

// ─── COMPRANET visibility — honest reach of the evidence ────────────────────
// Live enum (DB-verified): high 22 · partial 13 · low 5 · none 3.
// There is no 'invisible' value; 'low' must branch or 5 of 43 dossiers
// hit an unmapped state.

export interface VisibilityMeta {
  label: { en: string; es: string }
  body: { en: string; es: string }
  /** 0–3 rung for the rail ladder readout. */
  rung: 0 | 1 | 2 | 3
}

const VISIBILITY: Record<string, VisibilityMeta> = {
  high: {
    label: { en: 'High', es: 'Alta' },
    body: {
      en: 'Full COMPRANET coverage — the linked contracts trace the case directly.',
      es: 'Cobertura completa en COMPRANET — los contratos vinculados rastrean el caso directamente.',
    },
    rung: 3,
  },
  partial: {
    label: { en: 'Partial', es: 'Parcial' },
    body: {
      en: 'Partial COMPRANET coverage; the links shown are a floor, not a total.',
      es: 'Cobertura parcial en COMPRANET; los vínculos mostrados son un piso, no un total.',
    },
    rung: 2,
  },
  low: {
    label: { en: 'Low', es: 'Baja' },
    body: {
      en: 'The contracts exist but are fragmented or thinly recorded in the registry.',
      es: 'Los contratos existen pero están fragmentados o registrados de forma incompleta.',
    },
    rung: 1,
  },
  none: {
    label: { en: 'None', es: 'Ninguna' },
    body: {
      en: 'This case occurred outside federal COMPRANET. The absence is not missing evidence; it is a jurisdiction boundary.',
      es: 'Este caso ocurrió fuera de COMPRANET federal. La ausencia no es un vacío de evidencia; es una frontera de jurisdicción.',
    },
    rung: 0,
  },
}

export function visibilityMeta(value: string | undefined | null): VisibilityMeta {
  return (value && VISIBILITY[value]) || VISIBILITY.none
}

// ─── Sector red-flag benchmarks (platform-internal thresholds) ──────────────
// From .claude/rules/data-validation.md § Sector-Specific Benchmarks. These
// are the platform's own review thresholds — captions must say so.

const SECTOR_RED_FLAG: Record<number, number> = {
  4: 50_000_000_000, // energía
  3: 20_000_000_000, // infraestructura
  1: 5_000_000_000,  // salud
  6: 2_000_000_000,  // tecnología
}
const DEFAULT_RED_FLAG = 1_000_000_000

export function sectorRedFlag(sectorId: number | undefined | null): number {
  return (sectorId != null && SECTOR_RED_FLAG[sectorId]) || DEFAULT_RED_FLAG
}

// ─── The impunity gap — one precise formula, always captioned ───────────────

export interface ImpunityGap {
  /** Whole years since the discovery year (CURRENT_YEAR − discovery_year). */
  years: number
  /** Anchor used: 'discovery' normally; 'contract_end' if discovery missing. */
  anchor: 'discovery' | 'contract_end'
  open: boolean
}

export function impunityGap(cas: {
  discovery_year?: number | null
  contract_year_end?: number | null
  legal_status?: string | null
}): ImpunityGap | null {
  const meta = dispositionFor(cas.legal_status)
  const anchorYear = cas.discovery_year ?? cas.contract_year_end ?? null
  if (anchorYear == null) return null
  return {
    years: Math.max(0, CURRENT_YEAR - anchorYear),
    anchor: cas.discovery_year != null ? 'discovery' : 'contract_end',
    open: meta.isOpen,
  }
}

/**
 * The one-line impunity-arc micro: "2013–2014 · descubierto 2017 · sin condena".
 * Used on the index lead/secondary meta lines.
 */
export function arcMicro(
  cas: {
    contract_year_start?: number | null
    contract_year_end?: number | null
    discovery_year?: number | null
    legal_status?: string | null
  },
  lang: Lang,
): string {
  const parts: string[] = []
  if (cas.contract_year_start) {
    parts.push(
      cas.contract_year_end && cas.contract_year_end !== cas.contract_year_start
        ? `${cas.contract_year_start}–${cas.contract_year_end}`
        : String(cas.contract_year_start),
    )
  }
  if (cas.discovery_year) {
    parts.push(lang === 'es' ? `descubierto ${cas.discovery_year}` : `uncovered ${cas.discovery_year}`)
  }
  const meta = dispositionFor(cas.legal_status)
  if (cas.legal_status === 'convicted') {
    parts.push(lang === 'es' ? 'condena obtenida' : 'conviction secured')
  } else if (meta.isOpen) {
    parts.push(lang === 'es' ? 'sin condena' : 'no conviction')
  } else {
    parts.push(dispositionLabel(cas.legal_status, lang).toLowerCase())
  }
  return parts.join(' · ')
}

// ─── Severity — a FOUR-point scale (API caps at 4; live data is 2–4) ────────

export const SEVERITY_MAX = 4

export function severityColor(severity: number): string {
  if (severity >= 4) return RISK_COLORS.critical
  if (severity === 3) return RISK_COLORS.medium
  return RISK_COLORS.low
}

// ─── Evidence strength (linked vendors) ─────────────────────────────────────

const EVIDENCE_LABEL: Record<string, { en: string; es: string }> = {
  strong:   { en: 'Strong',   es: 'Fuerte' },
  moderate: { en: 'Moderate', es: 'Moderada' },
  medium:   { en: 'Medium',   es: 'Media' },
  weak:     { en: 'Weak',     es: 'Débil' },
}

export function evidenceLabel(value: string | undefined | null, lang: Lang): string {
  if (!value) return ''
  const hit = EVIDENCE_LABEL[value]
  return hit ? hit[lang] : humanize(value)
}

// ─── Folio ──────────────────────────────────────────────────────────────────

export function folio(id: number): string {
  return `EXP·${String(id).padStart(4, '0')}`
}

// ─── The Charge — a live-computed, ranked lede sentence (El Cargo) ──────────
// DESIGNUS synthesis 2026-07-07 ("narrative-first" / "El Cargo"). Ranks a
// fixed candidate set (threshold multiple, archive cost-rank, impunity gap,
// conviction rarity, severity) by strength and emits the strongest as the
// primary clause, the next distinct-kind candidate as an optional secondary
// clause. The fallback candidate always exists (strength 0) so the function
// is total — it never returns an empty finding.

export interface LeadFinding {
  eyebrow: string
  primaryText: string
  secondaryText?: string
  /** emphasis[0] is the accented token inside primaryText; emphasis[1] (if
   *  present) is the accented token inside secondaryText. */
  emphasis: string[]
  accentKind: string
}

interface FindingCandidate {
  kind: 'threshold' | 'cost-rank' | 'impunity' | 'conviction' | 'severity' | 'fallback'
  text: string
  emphasis: string
  strength: number
}

function formatMultiplier(m: number): string {
  return m >= 10 ? String(Math.round(m)) : m.toFixed(1)
}

function ordinalSuffixEn(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

/**
 * "The 3rd-costliest of 43 documented cases" — the cost-rank clause, plus
 * the substring inside it that should carry the accent color.
 */
export function ordinalCostRank(
  rank: number,
  total: number,
  lang: Lang,
): { text: string; emphasis: string } {
  if (rank === 1) {
    return lang === 'es'
      ? { text: `el caso más costoso de ${total} documentados`, emphasis: 'más costoso' }
      : { text: `the costliest of ${total} documented cases`, emphasis: 'costliest' }
  }
  if (rank === 2) {
    return lang === 'es'
      ? { text: `el segundo más costoso de ${total} documentados`, emphasis: 'segundo más costoso' }
      : { text: `the 2nd-costliest of ${total} documented cases`, emphasis: '2nd-costliest' }
  }
  if (rank === 3) {
    return lang === 'es'
      ? { text: `el tercero más costoso de ${total} documentados`, emphasis: 'tercero más costoso' }
      : { text: `the 3rd-costliest of ${total} documented cases`, emphasis: '3rd-costliest' }
  }
  const suffix = ordinalSuffixEn(rank)
  return lang === 'es'
    ? { text: `el ${rank}.º más costoso de ${total} documentados`, emphasis: `${rank}.º más costoso` }
    : { text: `the ${rank}${suffix}-costliest of ${total} documented cases`, emphasis: `${rank}${suffix}-costliest` }
}

/**
 * The Charge — a pure, total function of `scandal` + the in-memory
 * `allCases` docket. Never hardcoded per-case; degrades to a status
 * fallback clause when the case has no amount, no distribution, and no gap.
 */
export function leadFinding(
  scandal: ScandalDetail,
  allCases: ScandalListItem[] | undefined,
  lang: Lang,
): LeadFinding {
  const amount = scandal.amount_mxn_high ?? scandal.amount_mxn_low ?? null
  const sectorId = scandal.sector_id ?? scandal.sector_ids?.[0] ?? null
  const sector = sectorId != null ? SECTORS.find((s) => s.id === sectorId) : null
  const sectorName = sector
    ? lang === 'es' ? sector.name : sector.nameEN
    : lang === 'es' ? 'el sector' : 'the sector'
  const sectorAccent = sector?.color ?? RISK_COLORS.critical
  const disposition = dispositionFor(scandal.legal_status)
  const gap = impunityGap(scandal)

  const candidates: FindingCandidate[] = []

  // C1 — threshold multiplier
  if (amount != null) {
    const threshold = sectorRedFlag(sectorId)
    const mult = amount / threshold
    if (Number.isFinite(mult) && mult >= 1.5) {
      const emphasis = `${formatMultiplier(mult)}×`
      const text = lang === 'es'
        ? `${emphasis} el umbral de revisión de la plataforma para ${sectorName}`
        : `${emphasis} the platform's ${sectorName} review threshold`
      candidates.push({ kind: 'threshold', text, emphasis, strength: Math.min(1, mult / 12) })
    }
  }

  // C2 — cost-rank among the documented archive
  const usableAmounts = (allCases ?? [])
    .map((c) => c.amount_mxn_high ?? c.amount_mxn_low ?? null)
    .filter((v): v is number => v != null)
  if (amount != null && usableAmounts.length >= 5) {
    const total = usableAmounts.length
    const rank = usableAmounts.filter((v) => v > amount).length + 1
    const cap = Math.max(3, Math.round(total * 0.15))
    if (rank <= cap) {
      const { text, emphasis } = ordinalCostRank(rank, total, lang)
      candidates.push({ kind: 'cost-rank', text, emphasis, strength: 1 - (rank - 1) / total })
    }
  }

  // C3 — impunity gap
  if (disposition.isOpen && gap && gap.years >= 2) {
    const emphasis = lang === 'es' ? `${gap.years} años` : `${gap.years} years`
    const text = lang === 'es'
      ? `sin resolución ${gap.years} años después del descubrimiento`
      : `unresolved ${gap.years} years after discovery`
    candidates.push({ kind: 'impunity', text, emphasis, strength: Math.min(1, gap.years / 10) })
  }

  // C4 — conviction rarity
  if (allCases && scandal.legal_status === 'convicted') {
    const n = allCases.filter((c) => c.legal_status === 'convicted').length
    const t = allCases.length
    const emphasis = lang === 'es' ? `${n} condenas` : `${n} convictions`
    const text = lang === 'es'
      ? `una de solo ${n} condenas en ${t} casos documentados`
      : `one of only ${n} convictions in ${t} documented cases`
    candidates.push({ kind: 'conviction', text, emphasis, strength: 0.7 })
  }

  // C5 — severity
  if (scandal.severity >= 4) {
    const emphasis = lang === 'es' ? 'más graves' : 'gravest'
    const text = lang === 'es' ? 'entre los más graves del archivo' : 'among the gravest in the archive'
    candidates.push({ kind: 'severity', text, emphasis, strength: 0.55 })
  }

  // Fallback — always present, lowest priority; guarantees a total function.
  candidates.push({
    kind: 'fallback',
    text: lang === 'es'
      ? 'documentado; sin resolución firme en el registro'
      : 'documented; no final disposition on record',
    emphasis: '',
    strength: 0,
  })

  candidates.sort((a, b) => b.strength - a.strength)
  const primary = candidates[0]
  const secondary = candidates.find((c) => c.kind !== primary.kind && c.strength > 0)

  const emphasis = [primary.emphasis]
  if (secondary) emphasis.push(secondary.emphasis)

  return {
    eyebrow: lang === 'es' ? 'EL HALLAZGO' : 'THE FINDING',
    primaryText: primary.text,
    secondaryText: secondary?.text,
    emphasis,
    accentKind: scandal.legal_status === 'impunity' ? disposition.ink : sectorAccent,
  }
}
