/**
 * Shared scorecard UI components for the 10-tier Procurement Integrity grading system.
 * Used by ReportCard, VendorProfile, and InstitutionProfile pages.
 */

/** Convert a raw API enum string (e.g. "low_risk", "pillar_conduct") to a readable label */
function formatRiskDriver(raw: string): string {
  const MAP: Record<string, string> = {
    pillar_risk_signal: 'ML Signal',
    pillar_conduct: 'Conduct',
    pillar_spread: 'Diversification',
    pillar_behavior: 'Patterns',
    pillar_flags: 'External Alerts',
    pillar_openness: 'Openness',
    pillar_price: 'Price Integrity',
    pillar_vendors: 'Vendor Independence',
    pillar_process: 'Transparency',
    pillar_external: 'External Alerts',
    low_risk: 'Low Risk Score',
    avg_risk_elevated: 'Elevated Avg Risk',
    avg_risk_high: 'High Avg Risk',
    high_risk: 'High Risk Score',
    critical_risk: 'Critical Risk Score',
    aria_t1: 'ARIA Tier 1 (Critical)',
    aria_t2: 'ARIA Tier 2 (High)',
    confirmed_corrupt: 'Confirmed Case',
    efos: 'EFOS Listed',
    sfp: 'SFP Sanctioned',
    vendor_concentration: 'Vendor Concentration',
    price_volatility: 'Price Volatility',
    single_bid: 'Single Bidding',
    direct_award: 'Direct Award',
  }
  return MAP[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const GRADE10_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'S':  { bg: '#f0fdf4', text: '#047857', border: '#6ee7b7', bar: '#10b981' },
  'A':  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', bar: '#22c55e' },
  'B+': { bg: '#f7fee7', text: '#4d7c0f', border: '#bef264', bar: '#84cc16' },
  'B':  { bg: '#fefce8', text: '#854d0e', border: '#fde047', bar: '#eab308' },
  'C+': { bg: '#fffbeb', text: '#b45309', border: '#fcd34d', bar: '#f59e0b' },
  'C':  { bg: '#fff7ed', text: '#c2410c', border: '#fdba74', bar: '#f97316' },
  'D':  { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', bar: '#ef4444' },
  'D-': { bg: '#fef2f2', text: '#b91c1c', border: '#f87171', bar: '#dc2626' },
  'F':  { bg: '#fef2f2', text: '#991b1b', border: '#ef4444', bar: '#991b1b' },
  'F-': { bg: '#1c0505', text: '#fca5a5', border: '#991b1b', bar: '#450a0a' },
}

export const GRADE10_ORDER_KEYS = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'D-', 'F', 'F-'] as const

const GRADE_LABELS: Record<string, string> = {
  'S': 'Modelo', 'A': 'Sólido', 'B+': 'Sobresaliente', 'B': 'Adecuado',
  'C+': 'Atención', 'C': 'Preocupante', 'D': 'Alto Riesgo',
  'D-': 'Grave', 'F': 'Crítico', 'F-': 'Bandera Roja',
}

// ---------------------------------------------------------------------------
// GradeBadge10
// ---------------------------------------------------------------------------

export function GradeBadge10({
  grade,
  size = 'md',
}: {
  grade: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const c = GRADE10_COLORS[grade] ?? GRADE10_COLORS['F']
  const sizeClasses = {
    sm:  'w-7 h-7 text-sm',
    md:  'w-9 h-9 text-base',
    lg:  'w-12 h-12 text-xl',
    xl:  'w-16 h-16 text-3xl',
  }[size]
  return (
    <span
      title={GRADE_LABELS[grade] ?? grade}
      className={`inline-flex items-center justify-center rounded-lg font-bold flex-shrink-0 ${sizeClasses}`}
      style={{ fontFamily: 'var(--font-family-serif)', backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {grade}
    </span>
  )
}

// ---------------------------------------------------------------------------
// PillarBar — 0-20 (or other max) visual bar
// ---------------------------------------------------------------------------

export function PillarBar({
  label,
  score,
  maxScore,
  color,
}: {
  label: string
  score: number
  maxScore: number
  color: string
}) {
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{label}</span>
        <span className="font-medium tabular-nums">{score.toFixed(0)}/{maxScore}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VendorScorecardCard — compact pillar card for VendorProfile
// ---------------------------------------------------------------------------

export interface VendorScorecardData {
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  sector_percentile: number
  pillar_risk_signal: number
  pillar_conduct: number
  pillar_spread: number
  pillar_behavior: number
  pillar_flags: number
  top_risk_driver: string | null
}

export function VendorScorecardCard({ sc }: { sc: VendorScorecardData }) {
  const c = GRADE10_COLORS[sc.grade] ?? GRADE10_COLORS['F']
  const pillars = [
    { label: 'Señal ML',    score: sc.pillar_risk_signal, max: 25 },
    { label: 'Conducta',    score: sc.pillar_conduct,     max: 20 },
    { label: 'Diversif.',   score: sc.pillar_spread,      max: 20 },
    { label: 'Patrones',    score: sc.pillar_behavior,    max: 20 },
    { label: 'Alertas Ext.',score: sc.pillar_flags,       max: 15 },
  ]
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: c.border, backgroundColor: c.bg + '40' }}>
      <div className="flex items-center gap-3">
        <GradeBadge10 grade={sc.grade} size="lg" />
        <div>
          <div className="text-xs font-semibold" style={{ color: c.text }}>
            {sc.grade_label}
          </div>
          <div className="text-lg font-bold tabular-nums" style={{ color: c.text }}>
            {sc.total_score.toFixed(0)}<span className="text-xs font-normal opacity-70">/100</span>
          </div>
          <div className="text-[11px] opacity-60">
            Pct. nacional: <strong>{(sc.national_percentile * 100).toFixed(0)}°</strong>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {pillars.map(p => (
          <PillarBar key={p.label} label={p.label} score={p.score} maxScore={p.max} color={c.bar} />
        ))}
      </div>
      {sc.top_risk_driver && (
        <div className="text-[11px] pt-1 border-t" style={{ borderColor: c.border, color: 'var(--color-text-muted)' }}>
          ↓ Gap: <span className="font-medium" style={{ color: c.text }}>{formatRiskDriver(sc.top_risk_driver)}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InstitutionScorecardCard — compact pillar card for InstitutionProfile
// ---------------------------------------------------------------------------

export interface InstitutionScorecardData {
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  pillar_openness: number
  pillar_price: number
  pillar_vendors: number
  pillar_process: number
  pillar_external: number
  top_risk_driver: string | null
}

export function InstitutionScorecardCard({ sc }: { sc: InstitutionScorecardData }) {
  const c = GRADE10_COLORS[sc.grade] ?? GRADE10_COLORS['F']
  const pillars = [
    { label: 'Apertura',      score: sc.pillar_openness, max: 20 },
    { label: 'Int. Precios',  score: sc.pillar_price,    max: 20 },
    { label: 'Ind. Proveed.', score: sc.pillar_vendors,  max: 20 },
    { label: 'Transparencia', score: sc.pillar_process,  max: 20 },
    { label: 'Alertas Ext.',  score: sc.pillar_external, max: 20 },
  ]
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: c.border, backgroundColor: c.bg + '40' }}>
      <div className="flex items-center gap-3">
        <GradeBadge10 grade={sc.grade} size="lg" />
        <div>
          <div className="text-xs font-semibold" style={{ color: c.text }}>
            {sc.grade_label}
          </div>
          <div className="text-lg font-bold tabular-nums" style={{ color: c.text }}>
            {sc.total_score.toFixed(0)}<span className="text-xs font-normal opacity-70">/100</span>
          </div>
          <div className="text-[11px] opacity-60">
            Pct. nacional: <strong>{(sc.national_percentile * 100).toFixed(0)}°</strong>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {pillars.map(p => (
          <PillarBar key={p.label} label={p.label} score={p.score} maxScore={p.max} color={c.bar} />
        ))}
      </div>
      {sc.top_risk_driver && (
        <div className="text-[11px] pt-1 border-t" style={{ borderColor: c.border, color: 'var(--color-text-muted)' }}>
          ↓ Gap: <span className="font-medium" style={{ color: c.text }}>{formatRiskDriver(sc.top_risk_driver)}</span>
        </div>
      )}
    </div>
  )
}
