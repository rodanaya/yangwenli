/**
 * PatternDiagnostic — medical lab-report layout for SHAP-style risk
 * decomposition. Extracted from RedThread.tsx.
 *
 * Each row shows the feature on a -3σ to +3σ axis with sector p25-p75
 * reference band, vendor's marker dot, and contribution value.
 */

import { cn } from '@/lib/utils'

// ─── Props ───────────────────────────────────────────────────────────────────

interface PatternDiagnosticProps {
  features: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  inView: boolean
  raisesLabel: string
  lowersLabel: string
  referenceLabel: string
  diagnosisLabel: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PatternDiagnostic({
  features,
  inView,
  raisesLabel,
  lowersLabel,
  referenceLabel,
  diagnosisLabel,
}: PatternDiagnosticProps) {
  const SCALE_W = 380
  const ROW_H = 24
  const Z_RANGE = 3

  const xOf = (z: number) => {
    const clamped = Math.max(-Z_RANGE, Math.min(Z_RANGE, z))
    return ((clamped + Z_RANGE) / (2 * Z_RANGE)) * SCALE_W
  }

  return (
    <div>
      {/* Diagnosis line — auto-summarizes the panel */}
      <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-border">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">Diagnosis</span>
        <span className="text-xs text-text-secondary">{diagnosisLabel}</span>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[140px_1fr_64px] gap-3 items-center mb-1.5 pb-1 text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted opacity-70">
        <div>Feature</div>
        <div className="flex items-center justify-between">
          <span>−3σ</span>
          <span className="opacity-50">sector mean</span>
          <span>+3σ</span>
        </div>
        <div className="text-right">SHAP</div>
      </div>

      {/* Lab rows */}
      <div className="space-y-0.5">
        {features.map((f, idx) => {
          const isPositive = f.contribution > 0
          const isAnomalous = Math.abs(f.z_score) >= 1
          const markerColor = isPositive
            ? (isAnomalous ? 'var(--color-risk-critical)' : 'var(--color-risk-medium)')
            : 'var(--color-text-muted)'
          const contribColor = isPositive
            ? (isAnomalous ? 'var(--color-risk-critical)' : 'var(--color-risk-high)')
            : 'var(--color-text-muted)'
          const markerX = xOf(f.z_score)
          const delay = inView ? `${idx * 60}ms` : '0ms'
          return (
            <div
              key={f.feature}
              className={cn(
                'grid grid-cols-[140px_1fr_64px] gap-3 items-center px-1 py-1 rounded-sm border-l-2 transition-opacity',
                isAnomalous && isPositive ? 'bg-risk-critical/[0.04]' : ''
              )}
              style={{
                borderLeftColor: isAnomalous && isPositive ? markerColor : 'transparent',
                opacity: inView ? 1 : 0,
                transition: `opacity 0.4s ease ${delay}`,
              }}
            >
              {/* Feature name */}
              <div className="min-w-0">
                <div className="text-[12px] text-text-primary leading-tight truncate" title={f.label_en}>
                  {f.label_en}
                </div>
                <div className="text-[9px] font-mono tabular-nums text-text-muted">
                  z={f.z_score.toFixed(2)}σ · {isPositive ? raisesLabel : lowersLabel}
                </div>
              </div>

              {/* Lab scale */}
              <div className="relative w-full" style={{ height: ROW_H }}>
                <svg
                  viewBox={`0 0 ${SCALE_W} ${ROW_H}`}
                  className="w-full"
                  preserveAspectRatio="none"
                  style={{ height: ROW_H }}
                  role="img"
                  aria-label={`${f.label_en} z-score lab scale`}
                >
                  {/* Background scale rail */}
                  <line
                    x1={0} x2={SCALE_W}
                    y1={ROW_H / 2} y2={ROW_H / 2}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                  />
                  {/* Sector reference band p25-p75 ≈ ±0.674σ */}
                  <rect
                    x={xOf(-0.674)}
                    y={ROW_H / 2 - 5}
                    width={xOf(0.674) - xOf(-0.674)}
                    height={10}
                    fill="var(--color-text-muted)"
                    fillOpacity={0.08}
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                  />
                  {/* Center tick — sector mean */}
                  <line
                    x1={xOf(0)} x2={xOf(0)}
                    y1={ROW_H / 2 - 6} y2={ROW_H / 2 + 6}
                    stroke="var(--color-text-muted)"
                    strokeWidth={0.6}
                    opacity={0.5}
                  />
                  {/* ±2σ tail markers */}
                  {[-2, 2].map((z) => (
                    <line
                      key={z}
                      x1={xOf(z)} x2={xOf(z)}
                      y1={ROW_H / 2 - 3} y2={ROW_H / 2 + 3}
                      stroke="var(--color-text-muted)"
                      strokeWidth={0.5}
                      opacity={0.35}
                    />
                  ))}
                  {/* Out-of-range tail tinting */}
                  {Math.abs(f.z_score) >= 2 && (
                    <rect
                      x={f.z_score > 0 ? xOf(2) : 0}
                      y={ROW_H / 2 - 5}
                      width={f.z_score > 0 ? SCALE_W - xOf(2) : xOf(-2)}
                      height={10}
                      fill={markerColor}
                      fillOpacity={0.10}
                    />
                  )}
                </svg>
                {/* Vendor marker dot — HTML circle so it stays round under preserveAspectRatio="none" */}
                <span
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${(markerX / SCALE_W) * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 9,
                    height: 9,
                    backgroundColor: markerColor,
                    border: '1.5px solid var(--color-background)',
                    boxShadow: isAnomalous ? `0 0 3px ${markerColor}aa` : undefined,
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* SHAP contribution */}
              <div className="text-right">
                <span
                  className="text-[12px] font-mono font-bold tabular-nums"
                  style={{ color: contribColor }}
                >
                  {isPositive ? '+' : ''}{f.contribution.toFixed(3)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reference legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted opacity-70">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-2 rounded-sm border border-dashed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(115,115,115,0.08)' }} />
          {referenceLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-risk-critical)' }} />
          tail (|z| ≥ 1) raises risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)' }} />
          within range or protective
        </span>
      </div>
    </div>
  )
}
