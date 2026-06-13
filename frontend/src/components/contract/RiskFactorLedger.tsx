/**
 * RiskFactorLedger — §2 POR QUÉ, the prod-true risk reading (W1 / W2 / W5).
 *
 * Replaces the empty "No hay descomposición SHAP" apology that rendered on
 * EVERY prod contract (deploy DB has no contract_z_features). Reads the
 * server-parsed factors from GET /contracts/{id}/risk — which works WITHOUT
 * z-features — and ranks them by SEVERITY (not the v0.6.5-decoy weight, FATAL-2).
 * No magnitude bar (a length on a fabricated weight is the omega anti-pattern):
 * severity glyph + left-rule + the human parameter carry the emphasis.
 *
 * Three states, none an apology:
 *   - factors present  → severity-ranked itemized ledger + disclosure
 *   - factors empty     → the recorded basis (score + boolean flags)
 *   - SHAP available    → progressive-enhancement toggle (local/NORMALIZED only)
 */
import { useState } from 'react'
import type {
  ContractRiskBreakdownResponse,
  ContractDetail,
  RiskExplanation,
} from '@/api/types'
import { describeContractFactor, severityWord } from '@/lib/contract-format'
import type { FactorCategory } from '@/lib/risk-factors'
import { RISK_COLORS } from '@/lib/constants'

const CATEGORY_LABEL: Record<FactorCategory, { en: string; es: string }> = {
  competition: { en: 'Competition', es: 'Competencia' },
  pricing: { en: 'Pricing', es: 'Precio' },
  timing: { en: 'Timing', es: 'Tiempo' },
  network: { en: 'Network', es: 'Red' },
  institutional: { en: 'Institutional', es: 'Institucional' },
  procedural: { en: 'Procedure', es: 'Procedimiento' },
  interaction: { en: 'Interaction', es: 'Interacción' },
}

function severityColor(severity: 'alto' | 'medio' | null): string {
  if (severity === 'alto') return RISK_COLORS.critical
  if (severity === 'medio') return RISK_COLORS.medium
  return 'var(--color-text-muted)'
}

export function RiskFactorLedger({
  breakdown,
  explanation,
  contract,
  riskPct,
  lang,
}: {
  breakdown: ContractRiskBreakdownResponse | undefined
  explanation: RiskExplanation | undefined
  contract: ContractDetail
  riskPct: number | null
  lang: 'en' | 'es'
}) {
  const isEs = lang === 'es'
  const [expanded, setExpanded] = useState(false)
  const [shapOpen, setShapOpen] = useState(false)

  const described = (breakdown?.factors ?? [])
    .map((f) => describeContractFactor(f, lang))
    // severity desc, stable for ties (so price_anomaly weight-0.0 never headlines)
    .sort((a, b) => b.sortKey - a.sortKey)

  const hasFactors = described.length > 0
  const visible = expanded ? described : described.slice(0, 3)

  const scoreLine = riskPct != null
    ? (isEs
        ? `El modelo v0.8.5 lo marca en ${riskPct}/100. La base registrada del veredicto:`
        : `The v0.8.5 model rates it ${riskPct}/100. The recorded basis of the verdict:`)
    : (isEs
        ? 'Base registrada del veredicto del modelo:'
        : 'The recorded basis of the model verdict:')

  // ── no-factors fallback: the recorded basis from C1 booleans ────────────────
  const fallbackBasis: string[] = []
  if (!hasFactors) {
    if (contract.is_direct_award) fallbackBasis.push(isEs ? 'adjudicación directa' : 'direct award')
    if (contract.is_single_bid) fallbackBasis.push(isEs ? 'postor único' : 'single bid')
    if (contract.is_year_end) fallbackBasis.push(isEs ? 'concentración fin de año' : 'year-end concentration')
    if (contract.pyod_is_outlier && contract.ensemble_anomaly_score != null) {
      fallbackBasis.push(
        isEs
          ? `valor atípico PyOD (${contract.ensemble_anomaly_score.toFixed(2)})`
          : `PyOD outlier (${contract.ensemble_anomaly_score.toFixed(2)})`,
      )
    }
  }

  const shapAvailable = Boolean(explanation?.explanation_available) && (explanation?.features?.length ?? 0) > 0

  return (
    <div className="max-w-3xl">
      <p
        className="mb-4"
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--color-text-secondary)',
        }}
      >
        {scoreLine}
      </p>

      {hasFactors ? (
        <>
          <ul className="space-y-1.5 list-none p-0">
            {visible.map((f) => {
              const color = severityColor(f.severity)
              const sev = severityWord(f.severity, lang)
              const catLabel = isEs ? CATEGORY_LABEL[f.category].es : CATEGORY_LABEL[f.category].en
              return (
                <li
                  key={f.code}
                  className="flex items-baseline gap-3 px-3 py-2"
                  style={{ borderLeft: `2px solid ${f.severity ? color : 'var(--color-border)'}` }}
                >
                  <span
                    aria-hidden="true"
                    style={{ fontSize: 11, color, fontWeight: 700, minWidth: 14, textAlign: 'center' }}
                  >
                    {f.severity ? '▲' : '·'}
                  </span>
                  {sev && (
                    <span
                      className="font-mono flex-shrink-0"
                      style={{ fontSize: 9, letterSpacing: '0.10em', fontWeight: 700, color, minWidth: 38 }}
                    >
                      {sev}
                    </span>
                  )}
                  <span
                    className="flex-1 min-w-0"
                    style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}
                  >
                    {f.label}
                  </span>
                  {f.param && (
                    <span
                      className="font-mono tabular-nums flex-shrink-0 text-right"
                      style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
                    >
                      {f.param}
                    </span>
                  )}
                  <span
                    className="font-mono flex-shrink-0 hidden sm:inline"
                    style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', minWidth: 76, textAlign: 'right' }}
                  >
                    {catLabel}
                  </span>
                </li>
              )
            })}
          </ul>

          {described.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 font-mono uppercase tracking-[0.10em] hover:opacity-70 transition-opacity cursor-pointer"
              style={{ fontSize: 10, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: '4px 0' }}
            >
              {expanded
                ? (isEs ? '⌃ Ver menos' : '⌃ Show fewer')
                : (isEs ? `⌄ Ver los ${described.length} factores` : `⌄ See all ${described.length} factors`)}
            </button>
          )}
        </>
      ) : (
        <div
          className="px-3 py-2.5 rounded-sm"
          style={{ borderLeft: '2px solid var(--color-border)', background: 'var(--color-background-elevated)' }}
        >
          <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}>
            {fallbackBasis.length > 0
              ? (isEs
                  ? `Señales registradas: ${fallbackBasis.join(' · ')}.`
                  : `Recorded signals: ${fallbackBasis.join(' · ')}.`)
              : (isEs
                  ? 'El modelo registró una puntuación sin factores individuales desglosados para este contrato.'
                  : 'The model recorded a score without itemized factors for this contract.')}
          </p>
        </div>
      )}

      {/* Honesty footnote — the parsed weights are NOT v0.8.5 magnitudes */}
      <p
        className="mt-3 font-mono"
        style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-muted)', opacity: 0.75 }}
      >
        {isEs
          ? 'Factores ordenados por severidad — indicadores estadísticos, no probabilidades.'
          : 'Factors ranked by severity — statistical indicators, not probabilities.'}
      </p>

      {/* SHAP progressive enhancement — only when z-features exist (never on prod) */}
      {shapAvailable && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShapOpen((v) => !v)}
            aria-expanded={shapOpen}
            className="font-mono uppercase tracking-[0.10em] hover:opacity-70 transition-opacity cursor-pointer"
            style={{ fontSize: 10, color: 'var(--color-accent)', background: 'none', border: 'none', padding: '4px 0' }}
          >
            {shapOpen
              ? (isEs ? '⌃ Ocultar descomposición SHAP' : '⌃ Hide SHAP decomposition')
              : (isEs ? '⌄ Descomposición SHAP' : '⌄ SHAP decomposition')}
          </button>
          {shapOpen && (
            <ul className="mt-2 space-y-1.5 list-none p-0">
              {[...(explanation?.features ?? [])]
                .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
                .slice(0, 6)
                .map((f, i) => {
                  const pos = f.contribution > 0
                  const c = pos ? RISK_COLORS.critical : 'var(--color-text-muted)'
                  return (
                    <li key={i} className="flex items-baseline gap-3 px-3 py-1.5" style={{ borderLeft: `2px solid ${c}` }}>
                      <span aria-hidden="true" style={{ fontSize: 11, color: c, fontWeight: 700, minWidth: 14 }}>
                        {pos ? '▲' : '▽'}
                      </span>
                      <span className="flex-1 min-w-0" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13, color: 'var(--color-text-primary)' }}>
                        {f.label}
                      </span>
                      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 11, color: c, fontWeight: 700 }}>
                        {pos ? '+' : ''}{f.contribution.toFixed(3)}
                      </span>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
