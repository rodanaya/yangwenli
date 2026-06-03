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
  const result = useMemo(() => computeProcurementGrade(agg), [agg])
  const gradeColor = GRADE_COLORS[result.grade] || '#64748b'

  return (
    <div
      className="rounded-sm border bg-background-elevated/20 p-3 mt-3"
      style={{ borderColor: `${gradeColor}30` }}
    >
      <div className="text-[8px] tracking-[0.25em] uppercase font-bold text-text-muted mb-2 font-mono">
        {t('grade.title', { defaultValue: 'PROCUREMENT GRADE' })}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-center">
          {(() => {
            const tk = gradeToTierKey(result.grade)
            const ts = tk ? TIER_STYLES[tk] : null
            return ts ? (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold font-mono uppercase tracking-wider border"
                style={{ color: ts.color, backgroundColor: `${ts.color}18`, borderColor: `${ts.color}40` }}
              >
                {tk}
              </span>
            ) : (
              <div className="text-4xl font-mono font-black leading-none" style={{ color: gradeColor }}>
                {result.grade}
              </div>
            )
          })()}
          <div className="text-[9px] font-mono text-text-muted mt-1">
            {result.score}/100
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1.5">
          {result.details.map((d) => {
            const detailColor = GRADE_COLORS[d.grade] || '#64748b'
            return (
              <div
                key={d.labelKey}
                className="rounded-sm border border-border/20 bg-background-elevated/30 px-1.5 py-1 text-center"
              >
                <div className="text-[7px] text-text-muted uppercase tracking-[0.15em] font-mono truncate">
                  {t(d.labelKey)}
                </div>
                <div className="text-xs font-bold font-mono" style={{ color: detailColor }}>
                  {d.grade}
                </div>
                <div className="text-[9px] text-text-muted font-mono">
                  {d.value}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="text-[9px] text-text-muted font-mono mt-2 leading-relaxed">
        {t('grade.procurement', { defaultValue: 'Based on OECD benchmarks: direct award rate, high-risk rate, and single-bid rate.' })}
      </div>
    </div>
  )
}

export default ProcurementGradeCard
