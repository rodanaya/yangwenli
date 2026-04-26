/**
 * Entity verdict — 4-bucket classification per entity type.
 *
 * Per docs/VENDOR_DOSSIER_SCHEME.md § 8: every dossier ends with an
 * honest classification that distinguishes structural-but-legitimate
 * concentration (BAXTER, FRESENIUS) from documented capture (GRUFESA)
 * from ghost companies. This is the false-positive guard the audit
 * found missing across the platform.
 */
import type { EntityType } from './format'
import type { LedeContext } from './lede'

export type VerdictBucket =
  | 'critical'      // 🔴 Posible fraude / Possible fraud
  | 'high'          // 🟠 Capturado por institución / Institution-captured
  | 'medium'        // 🟡 Monopolio estructural / Structural monopoly
  | 'neutral'       // ⚫ Patrón anómalo, sin caso / Anomalous, uncased

export interface Verdict {
  bucket: VerdictBucket
  label_es: string
  label_en: string
  rationale_es: string
  rationale_en: string
}

interface VendorVerdictInput extends LedeContext {
  is_false_positive?: boolean | number
  fp_reason?: string
  in_ground_truth?: boolean | number
  top_institution_pct?: number
  ghost_companion_score?: number
}

export function getVerdictForVendor(ctx: VendorVerdictInput): Verdict {
  const isFP = ctx.is_false_positive === true || ctx.is_false_positive === 1
  const inGT = ctx.in_ground_truth === true || ctx.in_ground_truth === 1
  const topPct = ctx.top_institution_pct ?? 0
  const ghost = ctx.ghost_companion_score ?? 0
  const risk = ctx.avg_risk_score ?? 0

  // Bucket 1: structural FP override (BAXTER/FRESENIUS/INFRA/PRAXAIR)
  if (isFP) {
    return {
      bucket: 'medium',
      label_es: 'Monopolio estructural',
      label_en: 'Structural monopoly',
      rationale_es:
        'Vendor multinacional o estructural. La concentración refleja la posición del mercado, no evidencia de fraude. ' +
        (ctx.fp_reason ? `Motivo: ${ctx.fp_reason}.` : ''),
      rationale_en:
        'Multinational or structural vendor. Concentration reflects market position, not fraud evidence. ' +
        (ctx.fp_reason ? `Reason: ${ctx.fp_reason}.` : ''),
    }
  }

  // Bucket 2: GT case + high institution capture → likely fraud
  if (inGT && (risk >= 0.6 || ghost >= 0.6)) {
    return {
      bucket: 'critical',
      label_es: 'Posible fraude',
      label_en: 'Possible fraud',
      rationale_es:
        'Vendor en caso documentado de corrupción con indicador de riesgo crítico. ' +
        (ctx.case_name ? `Caso: ${ctx.case_name}. ` : '') +
        'Investigación recomendada.',
      rationale_en:
        'Vendor in documented corruption case with critical risk indicator. ' +
        (ctx.case_name ? `Case: ${ctx.case_name}. ` : '') +
        'Investigation recommended.',
    }
  }

  // Bucket 3: high institution capture but no GT case
  if (topPct >= 0.40 && (risk >= 0.4 || inGT)) {
    return {
      bucket: 'high',
      label_es: 'Capturado por institución',
      label_en: 'Institution-captured',
      rationale_es:
        'Vendor depende de una sola institución (' +
        `${(topPct > 1.5 ? topPct : topPct * 100).toFixed(0)}% de su valor total). ` +
        'Patrón consistente con captura institucional o regulatoria.',
      rationale_en:
        'Vendor depends on one institution (' +
        `${(topPct > 1.5 ? topPct : topPct * 100).toFixed(0)}% of total value). ` +
        'Pattern consistent with institutional or regulatory capture.',
    }
  }

  // Bucket 4: neutral — anomalous but not yet cased
  return {
    bucket: 'neutral',
    label_es: 'Patrón anómalo, sin caso',
    label_en: 'Anomalous, uncased',
    rationale_es:
      'Vendor con indicador de riesgo elevado pero sin caso documentado todavía. ' +
      'Candidato a investigación.',
    rationale_en:
      'Vendor with elevated risk indicator but no documented case yet. ' +
      'Investigation candidate.',
  }
}

interface CategoryVerdictInput extends LedeContext {
  hhi?: number
  unique_vendors?: number
  direct_award_pct?: number
  avg_risk_score?: number
}

export function getVerdictForCategory(ctx: CategoryVerdictInput): Verdict {
  const hhi = ctx.hhi ?? 0
  const da = ctx.direct_award_pct ?? 0
  const daPct = da > 1.5 ? da : da * 100
  const risk = ctx.avg_risk_score ?? 0

  // Bucket 1: high HHI + high DA + high risk = capturado
  if (hhi >= 0.25 && daPct >= 70 && risk >= 0.4) {
    return {
      bucket: 'critical',
      label_es: 'Mercado capturado',
      label_en: 'Captured market',
      rationale_es:
        `Concentración HHI ${hhi.toFixed(2)}, ${daPct.toFixed(0)}% adjudicación directa, ` +
        `riesgo promedio ${risk.toFixed(2)}. Pocos vendors dominantes, baja competencia.`,
      rationale_en:
        `HHI concentration ${hhi.toFixed(2)}, ${daPct.toFixed(0)}% direct-award, ` +
        `avg risk ${risk.toFixed(2)}. Few dominant vendors, low competition.`,
    }
  }

  // Bucket 2: oligopólico
  if (hhi >= 0.15 || (daPct >= 60 && risk >= 0.3)) {
    return {
      bucket: 'high',
      label_es: 'Mercado oligopólico',
      label_en: 'Oligopolistic market',
      rationale_es:
        'Mercado dominado por pocos proveedores. Patrón requiere monitoreo continuo.',
      rationale_en:
        'Market dominated by few vendors. Pattern requires ongoing monitoring.',
    }
  }

  // Bucket 3: estructural — high spend but expected concentration
  if (hhi >= 0.08) {
    return {
      bucket: 'medium',
      label_es: 'Concentración estructural',
      label_en: 'Structural concentration',
      rationale_es:
        'Concentración esperada por la naturaleza del mercado (especialización técnica, regulación).',
      rationale_en:
        'Expected concentration given market nature (technical specialization, regulation).',
    }
  }

  // Bucket 4: competitivo
  return {
    bucket: 'neutral',
    label_es: 'Mercado competitivo',
    label_en: 'Competitive market',
    rationale_es:
      `Múltiples proveedores activos (${ctx.unique_vendors ?? '—'}), HHI ${hhi.toFixed(2)}.`,
    rationale_en:
      `Multiple active vendors (${ctx.unique_vendors ?? '—'}), HHI ${hhi.toFixed(2)}.`,
  }
}

interface InstitutionVerdictInput extends LedeContext {
  governance_grade?: string
  hhi?: number
  avg_risk_score?: number
}

export function getVerdictForInstitution(ctx: InstitutionVerdictInput): Verdict {
  const grade = ctx.governance_grade?.toLowerCase() ?? ''
  const risk = ctx.avg_risk_score ?? 0

  if (grade === 'critico' || grade === 'critical' || risk >= 0.5) {
    return {
      bucket: 'critical',
      label_es: 'Gobernanza en escándalo',
      label_en: 'Scandal-tier governance',
      rationale_es: 'Indicadores de capture institucional severo o casos documentados.',
      rationale_en: 'Indicators of severe institutional capture or documented cases.',
    }
  }
  if (grade === 'deficiente' || grade === 'poor' || risk >= 0.35) {
    return {
      bucket: 'high',
      label_es: 'Gobernanza asediada',
      label_en: 'Besieged governance',
      rationale_es: 'Múltiples señales de riesgo concentradas en pocos proveedores.',
      rationale_en: 'Multiple risk signals concentrated in few vendors.',
    }
  }
  if (grade === 'regular' || risk >= 0.25) {
    return {
      bucket: 'medium',
      label_es: 'Gobernanza vigilada',
      label_en: 'Monitored governance',
      rationale_es: 'Indicadores moderados, requiere monitoreo continuo.',
      rationale_en: 'Moderate indicators, requires ongoing monitoring.',
    }
  }
  return {
    bucket: 'neutral',
    label_es: 'Gobernanza saludable',
    label_en: 'Healthy governance',
    rationale_es: 'Indicadores dentro del rango esperado.',
    rationale_en: 'Indicators within expected range.',
  }
}

/** Universal entry point. Routes to the type-specific verdict. */
export function getVerdictFor(type: EntityType, ctx: LedeContext): Verdict | null {
  switch (type) {
    case 'vendor': return getVerdictForVendor(ctx as VendorVerdictInput)
    case 'category': return getVerdictForCategory(ctx as CategoryVerdictInput)
    case 'institution': return getVerdictForInstitution(ctx as InstitutionVerdictInput)
    default: return null
  }
}
