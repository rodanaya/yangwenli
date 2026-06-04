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

// Darker variants of SECTOR_COLORS for use as TEXT FILL on light backgrounds.
// Each color shifted 2-3 steps darker on the Tailwind ladder so contrast on
// `--color-background` (#faf9f6 warm-white) reaches WCAG AA (≥4.5:1).
// USE FOR: <text> elements, <span> labels, anything reading as foreground type.
// DO NOT USE FOR: chart fills, large color swatches, decorative borders —
// those should keep using the vivid SECTOR_COLORS palette.
export const SECTOR_TEXT_COLORS: Record<string, string> = {
  salud:           '#991b1b',  // red-800 (was red-600 — passes AA)
  educacion:       '#1e40af',  // blue-800 (was blue-500 — passes AA)
  infraestructura: '#9a3412',  // orange-800 (was orange-600 — passes AA)
  energia:         '#854d0e',  // yellow-800 (was yellow-500 — 1.7:1 → 5.1:1)
  defensa:         '#1e3a5f',  // navy — already dark, keep
  tecnologia:      '#5b21b6',  // violet-800 (was violet-500 — passes AA)
  hacienda:        '#166534',  // green-800 (was green-600 — 2.9:1 → 5.5:1)
  gobernacion:     '#9f1239',  // rose-800 (was rose-700 — passes AA)
  agricultura:     '#166534',  // green-800 (was green-500 — 1.9:1 → 5.5:1)
  ambiente:        '#065f46',  // emerald-800 (was emerald-500 — 2.2:1 → 5.4:1)
  trabajo:         '#9a3412',  // orange-800 (was orange-500 — 2.5:1 → 5.1:1)
  otros:           '#475569',  // slate-600 (was slate-500 — passes AA)
} as const

/** Pick the AA-safe text color for a sector code (falls back to slate-600). */
export function getSectorTextColor(code: string): string {
  return SECTOR_TEXT_COLORS[code] ?? '#475569'
}

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

// Spanish sector name translations (proper case, with diacritics).
// Backend codes are normalised to lowercase ascii (`salud`, `educacion`,
// `gobernacion`) so `getSectorNameES` is what callers should use to render
// the user-facing label — never just `code.toUpperCase()` which drops accents
// and reads as a backend identifier.
export const SECTOR_NAMES_ES: Record<string, string> = {
  salud: 'Salud',
  educacion: 'Educación',
  infraestructura: 'Infraestructura',
  energia: 'Energía',
  defensa: 'Defensa',
  tecnologia: 'Tecnología',
  hacienda: 'Hacienda',
  gobernacion: 'Gobernación',
  agricultura: 'Agricultura',
  ambiente: 'Ambiente',
  trabajo: 'Trabajo',
  otros: 'Otros',
} as const

// Helper function to translate sector code to English name
export function getSectorNameEN(sectorCode: string): string {
  return SECTOR_NAMES_EN[sectorCode] || sectorCode
}

// Spanish counterpart — used by ARIA queue, vendor profiles, and any chip
// that previously called getSectorNameEN unconditionally.
export function getSectorNameES(sectorCode: string): string {
  return SECTOR_NAMES_ES[sectorCode] || sectorCode
}

/** Lang-aware sector label — pass the i18n language to pick ES or EN. */
export function getSectorName(sectorCode: string, lang: 'en' | 'es'): string {
  return lang === 'es' ? getSectorNameES(sectorCode) : getSectorNameEN(sectorCode)
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

// Per-pattern accent colors — P1–P7 investigation typologies.
// Must match the PATTERN_COLORS in Patterns.tsx. Source of truth lives here.
export const PATTERN_COLORS: Record<string, string> = {
  P1: '#f59e0b',   // amber — concentrated monopoly
  P2: '#ef4444',   // red — ghost companies
  P3: '#fb923c',   // orange — intermediaries
  P4: '#f43f5e',   // rose — kickbacks / bid rigging
  P5: '#8b5cf6',   // violet — bid rotation / overpricing
  P6: '#dc2626',   // deep red — institutional capture
  P7: '#a06820',   // amber-dark — budget dump
} as const

// Risk colors — Phase 1 canonical palette (no green for "low")
// Rationale: green overclaims safety on a corruption platform — use neutral zinc
// for the noise floor. Critical=red-500, high=amber-500, medium=amber-800, low=zinc-500.
export const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#a16207',
  low: '#71717a',
} as const

// AA-safe risk colours for TEXT / NUMERALS on the warm #faf9f6 page. RISK_COLORS
// are tuned for FILLS/bars/dots and fail WCAG AA as small coloured text
// (critical #ef4444 = 3.57:1, high #f59e0b = 2.04:1). Use these for any
// risk-coloured number/label; keep RISK_COLORS for fills, strokes, dots, bars.
export const RISK_TEXT_COLORS = {
  critical: '#b91c1c',  // red-700  (~5.9:1)
  high: '#b45309',      // amber-700 (passes AA)
  medium: '#a16207',    // amber-800 (already AA-safe)
  low: '#71717a',       // zinc-500
} as const

// OECD procurement-integrity limits — the SINGLE source. Never retype these per
// section (the 25%/30% same-metric contradiction on /vendors/:id came from doing
// exactly that). Direct award ≤30%, single bid ≤10%; model high-risk baseline ~11%.
// See docs/WEBSITE_STANDARDS.md anti-pattern A7.
export const OECD_DIRECT_AWARD_LIMIT = 0.30
export const OECD_SINGLE_BID_LIMIT = 0.10
export const MODEL_HR_BASELINE = 0.11

// Active risk model version (fallback — Dashboard fetches live from /analysis/model/metadata)
export const CURRENT_MODEL_VERSION = 'v0.8.5'

// Ground-truth case count fallback. The live count is served by
// `/api/v1/executive/summary` → `ground_truth.cases` and grows on every
// retraining cycle. Surfaces that aren't already loading the executive
// summary fall back to this snapshot so we don't ship a hardcoded "1,363"
// (Day 1 audit Fix B caught the homepage hero; this constant covers the
// remaining 4 surfaces — CaseDetail, Intersection, ModelTransparency,
// and the watchlist `caseDesc` JSON which uses {{count}} interpolation).
// Update on every retraining unless we wire `useGroundTruthCount()` (v1.1).
export const GROUND_TRUTH_CASE_COUNT_FALLBACK = 1427

// Ground-truth vendor count fallback (vendors linked to ≥1 GT case).
// Same fallback contract as GROUND_TRUTH_CASE_COUNT_FALLBACK — updates
// on each retraining and is referenced by methodology/intersection
// editorial copy. Live source: `/api/v1/executive/summary` →
// `ground_truth.vendors`.
export const GROUND_TRUTH_VENDOR_COUNT_FALLBACK = 1554

// Build identifier — bump to force Vite content hash change and bust CDN/browser cache



export const BUILD_ID = '2026-06-04-serif-eb-garamond'

// Risk thresholds (calibrated under v0.6.5; preserved unchanged through v0.8.5
// retraining — medium was raised from 0.15→0.25 to make medium actionable)
// Rationale: at 0.15 threshold, 76.7% of contracts were "medium" — near-zero lift.
// At 0.25, medium is 26.8% of contracts (investigable) and low is 59.4% (noise floor).
// Structural FP vendors (pharma OEMs) capped at medium via DB risk_level override.
// High+ rate: 11.01% | Train AUC: 0.797 | Test AUC: 0.785 (v0.8.5, May 2 2026)
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

/**
 * Canonical risk → color ramp. SINGLE SOURCE OF TRUTH for "color a risk value".
 *
 * Charts MUST use this instead of inline `if (score < x) return green` ladders.
 * The 2026-05-29 chart audit found charts routing risk tiers through the SECTOR
 * palette (sector-hacienda / sector-agricultura), painting "low risk" GREEN —
 * a Bible §3.10 absolute-rule violation (a procurement-only model cannot certify
 * integrity). This helper guarantees low → neutral zinc, never green.
 *
 * @param score 0–1 risk score
 * @returns a RISK_COLORS hex (apply via style={{ color/fill }}, NOT className)
 */
export function riskRamp(score: number): string {
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

/**
 * Risk ramp keyed off a percentage (0–100). Convenience for charts whose data
 * is already in percentage terms AND genuinely represents a risk score. Do NOT
 * use for a non-risk rate (e.g. direct-award %) — that would imply low rate = safe.
 */
export function riskRampFromPct(pct: number): string {
  return riskRamp(pct / 100)
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

