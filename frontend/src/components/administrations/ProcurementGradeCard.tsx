/**
 * ProcurementGradeCard — composite OECD-benchmark grade for an admin.
 *
 * Computes an A–F score from three metrics (direct-award rate, high-risk
 * rate, single-bid rate) and renders a tier badge + 3 detail tiles.
 *
 * Extracted from pages/Administrations.tsx (2026-05-11) so AdminDossierPanel
 * can import this as a peer component instead of forward-referencing it
 * inside the same module.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { gradeToTierKey, TIER_STYLES } from '@/lib/tiers'
import { RISK_TEXT_COLORS } from '@/lib/constants'
import type { AdminAgg } from './types'

interface ProcurementGradeResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  details: Array<{ labelKey: string; value: string; grade: string }>
}

function computeProcurementGrade(agg: AdminAgg): ProcurementGradeResult {
  const daScore = agg.directAwardPct < 30 ? 4 : agg.directAwardPct < 50 ? 3 : agg.directAwardPct < 65 ? 2 : agg.directAwardPct < 80 ? 1 : 0
  const hrScore = agg.highRiskPct < 8 ? 4 : agg.highRiskPct < 12 ? 3 : agg.highRiskPct < 16 ? 2 : agg.highRiskPct < 22 ? 1 : 0
  const sbScore = agg.singleBidPct < 10 ? 4 : agg.singleBidPct < 20 ? 3 : agg.singleBidPct < 30 ? 2 : agg.singleBidPct < 40 ? 1 : 0
  const total = (daScore + hrScore + sbScore) / 12
  const grade: ProcurementGradeResult['grade'] = total >= 0.83 ? 'A' : total >= 0.66 ? 'B' : total >= 0.5 ? 'C' : total >= 0.33 ? 'D' : 'F'
  return {
    grade,
    score: Math.round(total * 100),
    details: [
      { labelKey: 'dossier.fingerprint.directAward', value: `${agg.directAwardPct.toFixed(0)}%`, grade: daScore >= 3 ? 'A' : daScore >= 2 ? 'B' : daScore >= 1 ? 'C' : 'F' },
      { labelKey: 'dossier.fingerprint.highRisk',    value: `${agg.highRiskPct.toFixed(1)}%`,    grade: hrScore >= 3 ? 'A' : hrScore >= 2 ? 'B' : hrScore >= 1 ? 'C' : 'F' },
      { labelKey: 'dossier.fingerprint.singleBid',   value: `${agg.singleBidPct.toFixed(1)}%`,   grade: sbScore >= 3 ? 'A' : sbScore >= 2 ? 'B' : sbScore >= 1 ? 'C' : 'F' },
    ],
  }
}

// Bible §3.10: the good-end grades are neutral slate (mirrors TIER_STYLES
// Excelente/Satisfactorio), never green — a procurement model can't certify
// "good". The warm escalation (yellow → orange → red) carries the bad end.
/** Grade letters as TYPE take the AA-safe risk text ramp (PARALLAX D8
 *  § Change 4); GRADE_COLORS stays on the tile's border tint. */
const GRADE_TEXT_COLORS: Record<string, string> = {
  A: RISK_TEXT_COLORS.low,
  B: RISK_TEXT_COLORS.low,
  C: RISK_TEXT_COLORS.medium,
  D: RISK_TEXT_COLORS.high,
  F: RISK_TEXT_COLORS.critical,
}

const GRADE_COLORS: Record<string, string> = {
  A: '#334155', // slate-700
  B: '#64748b', // slate-500
  C: '#eab308',
  D: '#f97316',
  F: '#dc2626',
}

interface Props {
  agg: AdminAgg
}

export function ProcurementGradeCard({ agg }: Props) {
  const { t } = useTranslation('administrations')
  // Tier labels live in the institutionleague namespace ("Crítico" ES / "Critical" EN)
  const { t: tTier } = useTranslation('institutionleague')
  const result = useMemo(() => computeProcurementGrade(agg), [agg])
  const gradeColor = GRADE_COLORS[result.grade] || '#64748b'

  return (
    <div
      className="rounded-sm border bg-background-elevated/20 p-3 mt-3"
      style={{ borderColor: `${gradeColor}30` }}
    >
      <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-text-muted mb-2 font-mono">
        {t('grade.title', { defaultValue: 'PROCUREMENT GRADE' })}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-center">
          {(() => {
            const tk = gradeToTierKey(result.grade)
            const ts = tk ? TIER_STYLES[tk] : null
            return ts ? (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded text-[13px] font-bold font-mono uppercase tracking-wider border"
                style={{ color: GRADE_TEXT_COLORS[result.grade], backgroundColor: `${ts.color}18`, borderColor: `${ts.color}40` }}
              >
                {tTier(`tiers.${tk}`, tk)}
              </span>
            ) : (
              <div className="text-4xl font-mono font-black leading-none" style={{ color: GRADE_TEXT_COLORS[result.grade] }}>
                {result.grade}
              </div>
            )
          })()}
          <div className="text-[13px] font-mono text-text-muted mt-1">
            {result.score}/100
          </div>
        </div>
      </div>
      {/* The three component grades as label · letter · value rows: a ~230px
          column cannot hold three side-by-side tiles at an 11px floor without
          breaking words (PARALLAX D8 § Change 4). */}
      <dl className="mt-2.5 space-y-1">
        {result.details.map((d) => (
          <div key={d.labelKey} className="flex items-baseline justify-between gap-2 border-t border-border/20 pt-1">
            <dt className="text-[11px] uppercase tracking-[0.08em] font-mono text-text-muted">{t(d.labelKey)}</dt>
            <dd className="whitespace-nowrap font-mono tabular-nums">
              <span className="text-[13px] font-bold" style={{ color: GRADE_TEXT_COLORS[d.grade] ?? RISK_TEXT_COLORS.low }}>
                {d.grade}
              </span>{' '}
              <span className="text-[13px] text-text-muted">{d.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="text-[13px] text-text-muted font-mono mt-2 leading-relaxed">
        {t('grade.procurement', { defaultValue: 'Based on OECD benchmarks: direct award rate, high-risk rate, and single-bid rate.' })}
      </div>
    </div>
  )
}

export default ProcurementGradeCard
