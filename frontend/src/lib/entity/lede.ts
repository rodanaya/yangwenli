/**
 * Entity lede — synthesized 80-word summary per entity type.
 *
 * Per docs/VENDOR_DOSSIER_SCHEME.md § 1: every entity dossier opens with
 * an 80-word paragraph that fuses the most editorially loaded facts.
 * For vendors with `aria_queue.memo_text`, that 5,800-char dossier is
 * truncated to ~80 words. Otherwise a template substitutes the salient
 * fields (case_name, primary_pattern, top_institution, total_value).
 *
 * This is the function the chip's hover-card and the dossier § 1 both call.
 */
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { EntityType } from './format'

export interface LedeContext {
  // Vendor fields
  vendor_name?: string
  total_value_mxn?: number
  total_contracts?: number
  first_contract_year?: number
  last_contract_year?: number
  primary_sector_name?: string
  top_institution_name?: string
  top_institution_pct?: number
  direct_award_pct?: number
  avg_risk_score?: number
  primary_pattern?: string
  aria_tier?: 1 | 2 | 3 | 4
  case_id?: string | number
  case_name?: string
  memo_text?: string

  // Category fields
  category_name?: string
  category_name_en?: string
  hhi?: number
  unique_vendors?: number

  // Institution fields
  institution_name?: string
  governance_grade?: string
  top_category_name?: string

  // Generic
  [key: string]: unknown
}

const PATTERN_LABELS: Record<string, string> = {
  P1: 'Monopolio',
  P2: 'Empresa Fantasma',
  P3: 'Intermediario',
  P4: 'Cártel',
  P5: 'Captura Sectorial',
  P6: 'Captura Institucional',
  P7: 'Anomalía Estructural',
}

function fmtPct(value: number | undefined, decimals = 0): string {
  if (value == null) return '—'
  // Accept either 0-1 or 0-100; if value < 2 assume fraction
  const pct = value > 1.5 ? value : value * 100
  return `${pct.toFixed(decimals)}%`
}

/**
 * Reduce a long memo to a roughly 80-word lede.
 * Keeps the first paragraph if it's short enough, otherwise the first
 * 80 words split at a sentence boundary.
 */
function memoToLede(memo: string, maxWords = 80): string {
  if (!memo) return ''
  // Strip markdown headers
  const cleaned = memo
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\n\n+/g, '\n\n')
    .trim()

  // Prefer the "Resumen" or "Summary" paragraph if labeled
  const resumenMatch = cleaned.match(/(?:Resumen|Summary)[:\n]\s*([\s\S]+?)(?:\n\n|$)/i)
  if (resumenMatch) {
    const paragraph = resumenMatch[1].trim()
    const words = paragraph.split(/\s+/)
    if (words.length <= maxWords) return paragraph
    // Truncate at sentence boundary
    return words.slice(0, maxWords).join(' ').replace(/[,;:]$/, '') + '…'
  }

  // Otherwise: first paragraph or first 80 words
  const firstPara = cleaned.split(/\n\n/)[0]
  const words = firstPara.split(/\s+/)
  if (words.length <= maxWords) return firstPara
  return words.slice(0, maxWords).join(' ').replace(/[,;:]$/, '') + '…'
}

export function getLedeForVendor(ctx: LedeContext): string {
  if (ctx.memo_text) return memoToLede(ctx.memo_text)

  const parts: string[] = []
  const verb = ctx.last_contract_year && ctx.last_contract_year < new Date().getFullYear() - 1
    ? 'distribuyó'
    : 'distribuye'

  if (ctx.vendor_name && ctx.total_value_mxn) {
    parts.push(`${ctx.vendor_name} ${verb} ${formatCompactMXN(ctx.total_value_mxn)}`)
  }
  if (ctx.first_contract_year && ctx.last_contract_year) {
    parts.push(`entre ${ctx.first_contract_year}-${ctx.last_contract_year}`)
  }
  if (ctx.top_institution_name && ctx.top_institution_pct) {
    parts.push(`con ${ctx.top_institution_name} (${fmtPct(ctx.top_institution_pct)} de su valor)`)
  }
  if (ctx.direct_award_pct != null) {
    parts.push(`vía adjudicación directa (${fmtPct(ctx.direct_award_pct)})`)
  }
  if (ctx.primary_pattern) {
    const label = PATTERN_LABELS[ctx.primary_pattern] || ctx.primary_pattern
    parts.push(`Patrón detectado: ${label}`)
  }
  if (ctx.case_name) {
    parts.push(`Caso: ${ctx.case_name}`)
  }
  if (ctx.aria_tier) {
    parts.push(`ARIA Tier ${ctx.aria_tier}`)
  }

  return parts.join(' · ') || 'Sin datos suficientes para sintetizar lede.'
}

export function getLedeForCategory(ctx: LedeContext): string {
  const parts: string[] = []
  const name = ctx.category_name || 'Categoría'
  if (ctx.total_value_mxn && ctx.total_contracts) {
    parts.push(`${formatCompactMXN(ctx.total_value_mxn)} en ${formatNumber(ctx.total_contracts)} contratos`)
  }
  if (ctx.direct_award_pct != null) {
    parts.push(`${fmtPct(ctx.direct_award_pct, 1)} adjudicación directa`)
  }
  if (ctx.hhi != null) {
    const concentr = ctx.hhi > 0.25 ? 'oligopólico' : ctx.hhi > 0.10 ? 'concentrado' : 'competitivo'
    parts.push(`Mercado ${concentr} (HHI ${ctx.hhi.toFixed(2)})`)
  }
  if (ctx.unique_vendors != null) {
    parts.push(`${formatNumber(ctx.unique_vendors)} proveedores únicos`)
  }
  if (ctx.avg_risk_score != null) {
    parts.push(`Indicador de riesgo promedio: ${ctx.avg_risk_score.toFixed(2)}`)
  }
  return `${name} — ${parts.join(' · ')}`
}

export function getLedeForInstitution(ctx: LedeContext): string {
  const parts: string[] = []
  const name = ctx.institution_name || 'Institución'
  if (ctx.total_value_mxn) {
    parts.push(`Gasto total: ${formatCompactMXN(ctx.total_value_mxn)}`)
  }
  if (ctx.top_category_name) {
    parts.push(`Top categoría: ${ctx.top_category_name}`)
  }
  if (ctx.governance_grade) {
    parts.push(`Calificación gobernanza: ${ctx.governance_grade}`)
  }
  if (ctx.direct_award_pct != null) {
    parts.push(`${fmtPct(ctx.direct_award_pct)} adjudicación directa`)
  }
  return `${name} — ${parts.join(' · ')}`
}

/** Universal entry point. Routes to the type-specific synthesizer. */
export function getLedeFor(type: EntityType, ctx: LedeContext): string {
  switch (type) {
    case 'vendor': return getLedeForVendor(ctx)
    case 'category': return getLedeForCategory(ctx)
    case 'institution': return getLedeForInstitution(ctx)
    default: return ctx.memo_text ? memoToLede(ctx.memo_text) : ''
  }
}
