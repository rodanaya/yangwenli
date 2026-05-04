/**
 * Yang Wen-li Constants
 * Centralized configuration values
 * Build: 2026-05-04-v2
 */

// Sector Colors - matches CLAUDE.md spec exactly
export const SECTOR_COLORS: Record<string, string> = {
  salud: '#dc2626',
  educacion: '#3b82f6',
  infraestructura: '#ea580c',
  energia: '#eab308',
  defensa: '#1e3a5f',
  tecnologia: '#8b5cf6',
  hacienda: '#16a34a',
  gobernacion: '#be123c',
  agricultura: '#22c55e',
  ambiente: '#10b981',
  trabajo: '#f97316',
  otros: '#64748b',
} as const

// English sector name translations for UI consistency
export const SECTOR_NAMES_EN: Record<string, string> = {
  salud: 'Health',
  educacion: 'Education',
  infraestructura: 'Infrastructure',
  energia: 'Energy',
  defensa: 'Defense',
  tecnologia: 'Technology',
  hacienda: 'Treasury',
  gobernacion: 'Governance',
  agricultura: 'Agriculture',
  ambiente: 'Environment',
  trabajo: 'Labor',
  otros: 'Other',
} as const

// Helper function to translate sector code to English name
export function getSectorNameEN(sectorCode: string): string {
  return SECTOR_NAMES_EN[sectorCode] || sectorCode
}

// Sector metadata with professional colors
export const SECTORS = [
  { id: 1, code: 'salud', name: 'Salud', nameEN: 'Health', color: '#dc2626' },
  { id: 2, code: 'educacion', name: 'Educación', nameEN: 'Education', color: '#3b82f6' },
  { id: 3, code: 'infraestructura', name: 'Infraestructura', nameEN: 'Infrastructure', color: '#ea580c' },
  { id: 4, code: 'energia', name: 'Energía', nameEN: 'Energy', color: '#eab308' },
  { id: 5, code: 'defensa', name: 'Defensa', nameEN: 'Defense', color: '#1e3a5f' },
  { id: 6, code: 'tecnologia', name: 'Tecnología', nameEN: 'Technology', color: '#8b5cf6' },
  { id: 7, code: 'hacienda', name: 'Hacienda', nameEN: 'Treasury', color: '#16a34a' },
  { id: 8, code: 'gobernacion', name: 'Gobernación', nameEN: 'Governance', color: '#be123c' },
  { id: 9, code: 'agricultura', name: 'Agricultura', nameEN: 'Agriculture', color: '#22c55e' },
  { id: 10, code: 'ambiente', name: 'Ambiente', nameEN: 'Environment', color: '#10b981' },
  { id: 11, code: 'trabajo', name: 'Trabajo', nameEN: 'Labor', color: '#f97316' },
  { id: 12, code: 'otros', name: 'Otros', nameEN: 'Other', color: '#64748b' },
] as const

// Risk colors — Phase 1 canonical palette (no green for "low")
// Rationale: green overclaims safety on a corruption platform — use neutral zinc
// for the noise floor. Critical=red-500, high=amber-500, medium=amber-800, low=zinc-500.
export const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#a16207',
  low: '#71717a',
} as const

// Active risk model version (fallback — Dashboard fetches live from /analysis/model/metadata)
export const CURRENT_MODEL_VERSION = 'v0.8.5'

// Build identifier — bump to force Vite content hash change and bust CDN/browser cache
export const BUILD_ID = '2026-05-04-p3'

// Risk thresholds (v0.6.5 — medium raised from 0.15→0.25 to make medium actionable)
// Rationale: at 0.15 threshold, 76.7% of contracts were "medium" — near-zero lift.
// At 0.25, medium is 26.8% of contracts (investigable) and low is 59.4% (noise floor).
// Structural FP vendors (pharma OEMs) capped at medium via DB risk_level override.
// High+ rate: 13.49% | Train AUC: 0.798 | Test AUC: 0.828
// SINGLE SOURCE OF TRUTH — all other files import from here
export const RISK_THRESHOLDS = {
  critical: 0.60, // Strongest similarity to known corruption patterns
  high: 0.40,     // Strong similarity to known corruption patterns
  medium: 0.25,   // Moderate similarity — actionable (was 0.15, changed v6.4)
  low: 0,         // Low similarity to known corruption patterns (noise floor)
} as const

/**
 * Canonical risk level classifier — v6.0 recalibrated thresholds.
 * ALL components must use this function (or import it via utils.ts).
 */
export function getRiskLevelFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= RISK_THRESHOLDS.critical) return 'critical'
  if (score >= RISK_THRESHOLDS.high) return 'high'
  if (score >= RISK_THRESHOLDS.medium) return 'medium'
  return 'low'
}

// Data validation thresholds (CLAUDE.md spec)
export const MAX_CONTRACT_VALUE = 100_000_000_000  // 100B MXN - reject above this
export const FLAG_THRESHOLD = 10_000_000_000       // 10B MXN - flag for review

// Risk thresholds (v3.3 - preserved for reference/comparison)
export const RISK_THRESHOLDS_V3 = {
  critical: 0.50,
  high: 0.35,
  medium: 0.20,
  low: 0,
} as const

