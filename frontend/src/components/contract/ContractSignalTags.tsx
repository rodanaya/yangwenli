/**
 * ContractSignalTags — TRUE-only typology + anomaly tag rail (W5).
 *
 * Surfaces the boolean structural flags + the PyOD ensemble outlier that the
 * contract detail response already carries but the dossier never rendered.
 * "Forever Pollution" discipline: a FALSE flag is simply not drawn (no greyed
 * "no" chips), so the rail reads as a list of what IS true. Renders nothing
 * when no tag fires (Structure-A contracts) — the caller can omit the row.
 */
import type { ContractDetail } from '@/api/types'
import { RISK_COLORS } from '@/lib/constants'

const STRUCTURAL = '#71717a' // zinc — structural-neutral typology, not a risk color

interface TagDef {
  key: string
  on: boolean
  label: string
  color: string
  title: string
}

export function buildContractTags(contract: ContractDetail, lang: 'en' | 'es'): TagDef[] {
  const isEs = lang === 'es'
  const tags: TagDef[] = [
    {
      key: 'framework',
      on: !!contract.is_framework,
      label: isEs ? 'MARCO' : 'FRAMEWORK',
      color: STRUCTURAL,
      title: isEs ? 'Contrato marco' : 'Framework contract',
    },
    {
      key: 'consolidated',
      on: !!contract.is_consolidated,
      label: isEs ? 'CONSOLIDADO' : 'CONSOLIDATED',
      color: STRUCTURAL,
      title: isEs ? 'Compra consolidada entre dependencias' : 'Consolidated multi-agency purchase',
    },
    {
      key: 'multiannual',
      on: !!contract.is_multiannual,
      label: isEs ? 'PLURIANUAL' : 'MULTIANNUAL',
      color: STRUCTURAL,
      title: isEs ? 'Contrato plurianual' : 'Multi-year contract',
    },
    {
      key: 'high_value',
      on: !!contract.is_high_value,
      label: isEs ? 'ALTO VALOR' : 'HIGH VALUE',
      color: STRUCTURAL,
      title: isEs ? 'Contrato de alto valor' : 'High-value contract',
    },
    {
      key: 'year_end',
      on: !!contract.is_year_end,
      label: isEs ? 'FIN DE AÑO' : 'YEAR-END',
      color: RISK_COLORS.medium,
      title: isEs ? 'Adjudicado en noviembre o diciembre' : 'Awarded in November or December',
    },
  ]
  // PyOD ensemble outlier — only when flagged, with the score inline.
  if (contract.pyod_is_outlier && contract.ensemble_anomaly_score != null) {
    tags.push({
      key: 'pyod',
      on: true,
      label: `PyOD ▲${contract.ensemble_anomaly_score.toFixed(2)}`,
      color: RISK_COLORS.high,
      title: isEs
        ? 'Valor atípico para el conjunto PyOD (umbral 0.26)'
        : 'Flagged as an outlier by the PyOD ensemble (threshold 0.26)',
    })
  }
  return tags.filter((t) => t.on)
}

export function ContractSignalTags({
  contract,
  lang,
}: {
  contract: ContractDetail
  lang: 'en' | 'es'
}) {
  const tags = buildContractTags(contract, lang)
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={lang === 'es' ? 'Señales del contrato' : 'Contract signals'}>
      {tags.map((t) => (
        <span
          key={t.key}
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: t.color,
            background: `${t.color}1f`,
            border: `1px solid ${t.color}44`,
            padding: '2px 6px',
            borderRadius: 2,
          }}
          title={t.title}
        >
          {t.label}
        </span>
      ))}
    </div>
  )
}
