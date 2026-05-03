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
  const name = ctx.category_name_en || ctx.category_name || 'Categoría'

  // Opening: value + contract count
  let sentence = ''
  if (ctx.total_value_mxn && ctx.total_contracts) {
    sentence += `${name} concentra ${formatCompactMXN(ctx.total_value_mxn)} en ${formatNumber(ctx.total_contracts)} contratos federales`
  } else {
    sentence += name
  }

  // Market structure
  if (ctx.hhi != null) {
    const concentr = ctx.hhi > 0.25 ? 'oligopólico' : ctx.hhi > 0.10 ? 'concentrado' : 'competitivo'
    const vendorNote = ctx.unique_vendors ? ` (${formatNumber(ctx.unique_vendors)} proveedores)` : ''
    sentence += `, en un mercado ${concentr}${vendorNote}`
  } else if (ctx.unique_vendors != null) {
    sentence += ` distribuidos entre ${formatNumber(ctx.unique_vendors)} proveedores`
  }
  sentence += '.'

  // Risk signal
  const sentences: string[] = [sentence]
  const da = ctx.direct_award_pct != null ? (ctx.direct_award_pct > 1.5 ? ctx.direct_award_pct : ctx.direct_award_pct * 100) : null
  if (da != null && ctx.avg_risk_score != null) {
    const daHigh = da > 60
    const riskHigh = ctx.avg_risk_score >= 0.40
    if (daHigh && riskHigh) {
      sentences.push(`Con ${da.toFixed(0)}% de adjudicaciones directas y un indicador de riesgo promedio de ${ctx.avg_risk_score.toFixed(2)}, presenta señales de concentración relevantes para investigación.`)
    } else if (daHigh) {
      sentences.push(`El ${da.toFixed(0)}% de adjudicaciones directas supera el promedio federal y merece seguimiento.`)
    } else if (riskHigh) {
      sentences.push(`El indicador de riesgo promedio de ${ctx.avg_risk_score.toFixed(2)} ubica esta categoría en alerta alta.`)
    }
  } else if (da != null && da > 60) {
    sentences.push(`El ${da.toFixed(0)}% de adjudicaciones directas supera el promedio federal.`)
  }
  return sentences.join(' ')
}

export function getLedeForInstitution(ctx: LedeContext): string {
  const name = ctx.institution_name || 'Institución'

  // Opening: spending scale + span
  let sentence = ''
  if (ctx.total_value_mxn && ctx.total_contracts) {
    sentence += `${name} ha contratado ${formatCompactMXN(ctx.total_value_mxn)} en ${formatNumber(ctx.total_contracts)} procedimientos`
  } else if (ctx.total_value_mxn) {
    sentence += `${name} registra un gasto contratado de ${formatCompactMXN(ctx.total_value_mxn)}`
  } else {
    return `${name} — datos insuficientes para síntesis editorial.`
  }

  // Top category
  if (ctx.top_category_name) {
    sentence += `, concentrando su mayor gasto en ${ctx.top_category_name}`
  }
  sentence += '.'

  // Risk signals: direct-award + governance grade
  const sentences: string[] = [sentence]
  const da = ctx.direct_award_pct != null ? (ctx.direct_award_pct > 1.5 ? ctx.direct_award_pct : ctx.direct_award_pct * 100) : null
  if (da != null && ctx.governance_grade) {
    const GRADE_WORDS: Record<string, string> = {
      S: 'Excelente', A: 'Satisfactorio', 'B+': 'Satisfactorio', B: 'Satisfactorio',
      'C+': 'Regular', C: 'Regular', D: 'Deficiente', 'D-': 'Deficiente', F: 'Crítico', 'F-': 'Crítico',
    }
    const tierLabel = GRADE_WORDS[ctx.governance_grade] ?? ctx.governance_grade
    sentences.push(`Con ${da.toFixed(0)}% de adjudicaciones directas y una calificación de gobernanza ${tierLabel}, ${da > 60 ? 'sus patrones de adjudicación merecen revisión prioritaria.' : 'su desempeño de transparencia es evaluado como ' + tierLabel.toLowerCase() + '.'}`)
  } else if (da != null && da > 70) {
    sentences.push(`El ${da.toFixed(0)}% de adjudicaciones directas supera significativamente el promedio federal y es señal de alerta.`)
  } else if (ctx.governance_grade) {
    const GRADE_WORDS: Record<string, string> = {
      S: 'Excelente', A: 'Satisfactorio', 'B+': 'Satisfactorio', B: 'Satisfactorio',
      'C+': 'Regular', C: 'Regular', D: 'Deficiente', 'D-': 'Deficiente', F: 'Crítico', 'F-': 'Crítico',
    }
    const tierLabel = GRADE_WORDS[ctx.governance_grade] ?? ctx.governance_grade
    sentences.push(`Su calificación de gobernanza es ${tierLabel}.`)
  }
  return sentences.join(' ')
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
