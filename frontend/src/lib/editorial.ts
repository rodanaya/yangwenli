/**
 * editorial.ts — design tokens for the RUBLI editorial particle grammar.
 *
 * Single source of truth for colors, hairlines, fonts, and the tiny constants
 * (OECD ceiling, sexenio years, risk thresholds) that appear across every
 * NYT/Economist/FT-style chart. Import from here instead of hardcoding.
 */

// ── Surface colors (dark editorial) ────────────────────────────────────────
export const EDITORIAL_BG = '#09090b'        // zinc-950
export const EDITORIAL_BG_PANEL = '#0c0c0f'  // a hair lighter for panels
export const EDITORIAL_INK = '#fafafa'        // zinc-50
export const EDITORIAL_INK_MUTED = '#a1a1aa'  // zinc-400
export const EDITORIAL_INK_DIM = '#71717a'    // zinc-500
export const EDITORIAL_INK_FAINT = '#52525b'  // zinc-600

// ── Hairlines ──────────────────────────────────────────────────────────────
export const HAIRLINE_STROKE = 'rgba(255,255,255,0.08)'
export const HAIRLINE_STROKE_FAINT = 'rgba(255,255,255,0.04)'
export const HAIRLINE_STROKE_STRONG = 'rgba(255,255,255,0.16)'
export const LEADER_LINE_STROKE = 'rgba(161,161,170,0.45)' // zinc-400 @ 45%

// ── Type ───────────────────────────────────────────────────────────────────
export const FONT_MONO = 'var(--font-family-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace)'
export const FONT_SERIF = 'var(--font-family-serif, "Tiempos Headline", "Lyon Display", Georgia, serif)'
export const FONT_SANS = 'var(--font-family-sans, "Inter", "Söhne", system-ui, -apple-system, sans-serif)'

// ── Risk palette (editorial, never green for risk) ─────────────────────────
export const RISK_PALETTE = {
  critical: '#ef4444', // red-500
  high:     '#f59e0b', // amber-500
  medium:   '#a16207', // bronze (yellow-700)
  low:      '#71717a', // zinc-500
} as const
export type RiskLevel = keyof typeof RISK_PALETTE

// Per-level dot styling — used by the particle charts
export const RISK_DOT_STYLE: Record<RiskLevel, { r: number; fill: string; alpha: number; halo?: number }> = {
  critical: { r: 1.8, fill: RISK_PALETTE.critical, alpha: 0.95, halo: 3.6 },
  high:     { r: 1.3, fill: RISK_PALETTE.high,     alpha: 0.78 },
  medium:   { r: 0.95, fill: RISK_PALETTE.medium,  alpha: 0.55 },
  low:      { r: 0.6,  fill: RISK_PALETTE.low,     alpha: 0.42 },
}

// ── v0.6.5 model constants ─────────────────────────────────────────────────
export const RISK_THRESHOLDS = {
  critical: 0.60,
  high: 0.40,
  medium: 0.25,
} as const

// v0.6.5 deployed distribution (HR=13.49%)
export const RISK_DISTRIBUTION_065 = {
  critical: 0.0601,
  high: 0.0748,
  medium: 0.2684,
  low: 0.5967,
} as const

// ── OECD reference ─────────────────────────────────────────────────────────
export const OECD_FLOOR = 0.02   // 2% high-risk floor
export const OECD_CEILING = 0.15 // 15% high-risk ceiling

// ── Mexican sexenios (presidential terms) ──────────────────────────────────
export interface SexenioYear { start: number; end: number; president: string; party: string }
export const SEXENIO_YEARS: SexenioYear[] = [
  { start: 2000, end: 2006, president: 'Fox',     party: 'PAN' },
  { start: 2006, end: 2012, president: 'Calderón', party: 'PAN' },
  { start: 2012, end: 2018, president: 'Peña Nieto', party: 'PRI' },
  { start: 2018, end: 2024, president: 'AMLO',    party: 'MORENA' },
  { start: 2024, end: 2030, president: 'Sheinbaum', party: 'MORENA' },
]

// ── Sector colors (canonical 12-sector taxonomy) ───────────────────────────
export const SECTOR_COLORS: Record<string, string> = {
  salud:           '#dc2626',
  educacion:       '#3b82f6',
  infraestructura: '#ea580c',
  energia:         '#eab308',
  defensa:         '#1e3a5f',
  tecnologia:      '#8b5cf6',
  hacienda:        '#16a34a',
  gobernacion:     '#be123c',
  agricultura:     '#22c55e',
  ambiente:        '#10b981',
  trabajo:         '#f97316',
  otros:           '#64748b',
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical'
  if (score >= RISK_THRESHOLDS.high) return 'high'
  if (score >= RISK_THRESHOLDS.medium) return 'medium'
  return 'low'
}
