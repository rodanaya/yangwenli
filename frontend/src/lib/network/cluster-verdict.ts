/**
 * cluster-verdict.ts — «El acta del nudo» 4-bucket honesty contract.
 *
 * Classifies a co-bidding cluster into one of four verdicts, purely from
 * live index/graph numbers (no LLM narrative, no hardcoded thresholds
 * outside the shared risk-band ladder). Used by the rail's verdict tick
 * and ClusterActa's seal.
 *
 * Spec: network-la-trama-fable-2026-07-02-spec.md §3.6 / §4.2.
 */
import { RISK_COLORS, RISK_TEXT_COLORS, getRiskLevelFromScore } from '@/lib/constants'

export interface ClusterVerdict {
  key: 'documented' | 'hot' | 'watched' | 'plumbing'
  color: string // RISK_COLORS.critical | RISK_TEXT_COLORS.high | RISK_TEXT_COLORS.medium | 'var(--color-text-muted)'
  label_es: string
  label_en: string
  rationale_es: string
  rationale_en: string
}

export interface ClusterVerdictInput {
  avg_risk: number
  size: number
  gt_vendor_count: number
  sanctioned_count: number
}

/**
 * Pure, no React. Ladder strictly gated by `getRiskLevelFromScore(avg_risk)`
 * — never an inline risk-band reimplementation.
 */
export function getClusterVerdict(c: ClusterVerdictInput, meshMedianRisk: number): ClusterVerdict {
  const band = getRiskLevelFromScore(c.avg_risk)
  const r = Math.round(c.avg_risk * 100)
  const x = (meshMedianRisk > 0 ? c.avg_risk / meshMedianRisk : 0).toFixed(1)
  const gt = c.gt_vendor_count
  const s = c.sanctioned_count
  const isHotBand = band === 'critical' || band === 'high'
  const bandWord_es = band === 'critical' ? 'crítica' : 'alta'
  const bandWord_en = band === 'critical' ? 'critical' : 'high'

  if (isHotBand && gt >= 1) {
    return {
      key: 'documented',
      color: RISK_COLORS.critical,
      label_es: 'Nudo documentado',
      label_en: 'Documented knot',
      rationale_es: `${gt} proveedor(es) de este nudo figuran en casos documentados y el indicador de riesgo promedio (${r}%) cae en banda ${bandWord_es}. El nudo — no la firma aislada — es la unidad de investigación.`,
      rationale_en: `${gt} vendor(s) in this knot appear in documented cases and the average risk indicator (${r}%) falls in the ${bandWord_en} band. The knot — not the isolated firm — is the unit of investigation.`,
    }
  }

  if (isHotBand) {
    return {
      key: 'hot',
      color: RISK_TEXT_COLORS.high,
      label_es: 'Nudo caliente',
      label_en: 'Hot knot',
      rationale_es: `Indicador de riesgo promedio de ${r}% — ${x}× la mediana de la trama — sin caso documentado todavía. Candidato a investigación.`,
      rationale_en: `Average risk indicator of ${r}% — ${x}× the mesh median — no documented case yet. Investigation candidate.`,
    }
  }

  if (band === 'medium' || s >= 1 || gt >= 1) {
    return {
      key: 'watched',
      color: RISK_TEXT_COLORS.medium,
      label_es: 'Órbita vigilada',
      label_en: 'Watched orbit',
      rationale_es: `Señales moderadas${s >= 1 ? `, con ${s} sancionado(s) SFP entre sus miembros` : ''}. Requiere monitoreo, no acusación.`,
      rationale_en: `Moderate signals${s >= 1 ? `, with ${s} SFP-sanctioned member(s)` : ''}. Warrants monitoring, not accusation.`,
    }
  }

  return {
    key: 'plumbing',
    color: 'var(--color-text-muted)',
    label_es: 'Plomería estructural',
    label_en: 'Structural plumbing',
    rationale_es: 'Co-licitación a escala de mercado: consorcios y procedimientos multi-adjudicación explican la malla. Riesgo bajo no certifica integridad.',
    rationale_en: 'Market-scale co-bidding: consortia and multi-award procedures explain the mesh. Low risk does not certify integrity.',
  }
}
