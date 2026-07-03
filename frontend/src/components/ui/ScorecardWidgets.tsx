/**
 * Shared scorecard UI components for the Procurement Integrity grading system.
 * Used by ReportCard, VendorProfile, and InstitutionProfile pages.
 *
 * The underlying backend still returns 10 letter grades (S/A/B+/B/C+/C/D/D-/
 * F/F-), but the UI renders 5 global-audience tier labels (Excelente/
 * Satisfactorio/Regular/Deficiente/Crítico in ES; Excellent/Satisfactory/
 * Moderate/Poor/Critical in EN). Letter grades are US school vocabulary
 * and don't travel to a global audience.
 */
import { useTranslation } from 'react-i18next'
import { DotBar } from './DotBar'
import { INSTITUTION_PILLARS, pillarLabel } from '@/lib/institution-pillars'

/** Convert a raw API enum string (e.g. "low_risk", "pillar_conduct") to a readable label */
function formatRiskDriver(raw: string): string {
  const MAP: Record<string, string> = {
    pillar_risk_signal: 'ML Signal',
    pillar_conduct: 'Conduct',
    pillar_spread: 'Diversification',
    pillar_behavior: 'Patterns',
    pillar_flags: 'External Alerts',
    pillar_openness: 'Competitive Openness',
    pillar_price: 'Process Integrity',
    pillar_vendors: 'Tail Risk (P90)',
    pillar_process: 'External Flags',
    pillar_external: 'Vendor Independence',
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
  // Bible §3.10: the good-end grades (S/A/B+) are neutral slate, never
  // green/lime — a procurement model can't certify integrity. Warm escalation
  // (yellow → orange → red) below carries the bad end.
  'S':  { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', bar: '#475569' },
  'A':  { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', bar: '#64748b' },
  'B+': { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', bar: '#94a3b8' },
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

// Collapse the 10-grade ladder into 5 global-audience tiers.
// A/B/C/D/F letter grades read as US school-grade vocabulary; users in a
// global audience (incl. Mexico, LatAm, EU) read them as culturally
// opaque. Labels below replace letters in the badge render.
const GRADE_TIER_ES: Record<string, string> = {
  'S': 'Excelente', 'A': 'Excelente',
  'B+': 'Satisfactorio', 'B': 'Satisfactorio',
  'C+': 'Regular', 'C': 'Regular',
  'D': 'Deficiente', 'D-': 'Deficiente',
  'F': 'Crítico', 'F-': 'Crítico',
}
const GRADE_TIER_EN: Record<string, string> = {
  'S': 'Excellent', 'A': 'Excellent',
  'B+': 'Satisfactory', 'B': 'Satisfactory',
  'C+': 'Moderate', 'C': 'Moderate',
  'D': 'Poor', 'D-': 'Poor',
  'F': 'Critical', 'F-': 'Critical',
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
  const { i18n } = useTranslation()
  const isEs = i18n.language.startsWith('es')
  const tierLabel = (isEs ? GRADE_TIER_ES[grade] : GRADE_TIER_EN[grade])
    ?? (GRADE_LABELS[grade] ?? grade)
  const c = GRADE10_COLORS[grade] ?? GRADE10_COLORS['F']
  const sizePill = {
    sm:  'px-2 py-0.5 text-[12px]',
    md:  'px-2.5 py-1 text-[13px]',
    lg:  'px-3 py-1.5 text-xs',
    xl:  'px-4 py-2 text-sm',
  }[size]
  return (
    <span
      title={GRADE_LABELS[grade] ?? grade}
      className={`inline-flex items-center justify-center rounded-sm font-bold tracking-[0.08em] uppercase flex-shrink-0 ${sizePill}`}
      style={{
        fontFamily: 'var(--font-family-mono)',
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {tierLabel}
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
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{label}</span>
        <span className="font-medium font-mono tabular-nums">{score.toFixed(0)}/{maxScore}</span>
      </div>
      <DotBar value={score} max={maxScore} color={color} emptyColor="var(--color-background-elevated)" emptyStroke="var(--color-border-hover)" />
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
    <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: c.border, backgroundColor: c.bg + '40' }}>
      <div className="flex items-center gap-3">
        <GradeBadge10 grade={sc.grade} size="lg" />
        <div>
          <div className="text-xs font-semibold" style={{ color: c.text }}>
            {sc.grade_label}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums" style={{ color: c.text }}>
            {sc.total_score.toFixed(0)}<span className="text-xs font-normal opacity-70">/100</span>
          </div>
          <div className="text-[13px] opacity-60">
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
        <div className="text-[13px] pt-1 border-t" style={{ borderColor: c.border, color: 'var(--color-text-muted)' }}>
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
  const { i18n } = useTranslation()
  const lang = i18n.language
  const c = GRADE10_COLORS[sc.grade] ?? GRADE10_COLORS['F']
  // Canonical pillar map — correct label + true max per pillar.
  const pillars = INSTITUTION_PILLARS.map((p) => ({
    label: pillarLabel(p, lang),
    score: (sc[p.dbField] as number) ?? 0,
    max: p.max,
  }))
  return (
    <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: c.border, backgroundColor: c.bg + '40' }}>
      <div className="flex items-center gap-3">
        <GradeBadge10 grade={sc.grade} size="lg" />
        <div>
          <div className="text-xs font-semibold" style={{ color: c.text }}>
            {sc.grade_label}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums" style={{ color: c.text }}>
            {sc.total_score.toFixed(0)}<span className="text-xs font-normal opacity-70">/100</span>
          </div>
          <div className="text-[13px] opacity-60">
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
        <div className="text-[13px] pt-1 border-t" style={{ borderColor: c.border, color: 'var(--color-text-muted)' }}>
          ↓ Gap: <span className="font-medium" style={{ color: c.text }}>{formatRiskDriver(sc.top_risk_driver)}</span>
        </div>
      )}
    </div>
  )
}
