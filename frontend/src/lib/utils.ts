import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import i18n from '@/i18n'
import { MAX_CONTRACT_VALUE, FLAG_THRESHOLD } from './constants'
import { getExchangeRate } from './exchangeRates'


/**
 * Get the Intl locale string matching the current i18n language.
 * Falls back to 'es-MX' for Spanish, 'en-US' for English.
 */
export function getLocale(): string {
  const lang = i18n.language
  if (lang === 'en') return 'en-US'
  return 'es-MX'
}

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Mexican Pesos (locale-aware)
 */
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format large amounts in compact form, locale-aware.
 *
 * English (default): "1.5B MXN" / "9.9T MXN" — billion = 10⁹, trillion = 10¹².
 *
 * Mexican Spanish — uses MDP (millones de pesos) as the canonical unit because
 *   "billion" = "mil millones" (10⁹) which doesn't translate cleanly. The
 *   Mexican procurement convention is to express most public amounts in MDP.
 *   - >= 10¹²:  "X.X billones MXN"     (billón in Spanish = 10¹² = English trillion)
 *   - >= 10⁹:   "X,XXX MDP"            (e.g., 1.5B MXN → "1,500 MDP")
 *   - >= 10⁶:   "X.X MDP"
 *   - else:     formatMXN
 */
export function formatCompactMXN(amount: number): string {
  const lang = i18n.language || 'en'
  const isEs = lang.startsWith('es')

  if (isEs) {
    if (amount >= 1_000_000_000_000) {
      return `${(amount / 1_000_000_000_000).toFixed(1)} billones MXN`
    }
    if (amount >= 1_000_000_000) {
      // Express in MDP with thousand separators — "1,500 MDP" reads clearly
      const mdp = amount / 1_000_000
      return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(mdp))} MDP`
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)} MDP`
    }
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)} mil MXN`
    return formatMXN(amount)
  }

  // English — MXN only; USD via <USDTooltip> hover popover at call sites
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}T MXN`
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B MXN`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M MXN`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K MXN`
  return formatMXN(amount)
}

/**
 * Format an MXN amount as a compact USD figure using the current MXN/USD rate.
 * For inflation-adjusted historical-year conversions, use toReal2024USD instead.
 *
 * Examples (rate ≈ 20.10):
 *   9_900_000_000_000 → "US$493B"
 *   1_200_000_000_000 → "US$60B"
 *   582_200_000_000   → "US$29B"
 *   100_000_000       → "US$5M"
 */
export function formatCompactUSD(amountMXN: number): string {
  const rate = getExchangeRate()
  const usd = amountMXN / rate

  if (usd >= 1e12) return `US$${(usd / 1e12).toFixed(1)}T`
  if (usd >= 1e9)  return `US$${(usd / 1e9).toFixed(0)}B`
  if (usd >= 1e6)  return `US$${(usd / 1e6).toFixed(0)}M`
  if (usd >= 1e3)  return `US$${(usd / 1e3).toFixed(0)}K`
  return `US$${Math.round(usd)}`
}

/**
 * Format an MXN amount with an inline USD companion for impact, locale-aware.
 *
 * EN: "9.9T MXN · ≈US$493B"  — inline USD provides instant scale for foreign readers
 * ES: "9.9 billones MXN"     — Mexican audience reads MXN natively, no USD clutter
 *
 * Breaks the legacy "never inline both units" rule on purpose: the dashboard
 * headline numbers need impact, and hover-only USD doesn't carry on first read.
 */
export function formatDualCurrency(amountMXN: number): string {
  const mxn = formatCompactMXN(amountMXN)
  const lang = i18n.language || 'en'
  if (lang.startsWith('es')) return mxn

  const usd = formatCompactUSD(amountMXN)
  return `${mxn} · ≈${usd}`
}

/**
 * Localize an amount string from English (B/T/M MXN) to Mexican Spanish at
 * runtime. Used to intercept hardcoded English stats in legacy story content
 * without rewriting story-content.ts.
 *
 * Examples (when isEs=true):
 *   "133.2B MXN"     → "133,200 MDP"
 *   "$2.5B MXN"      → "$2,500 MDP"
 *   "1.25T MXN"      → "1.25 billones MXN"
 *   "$2.76T MXN"     → "$2.76 billones MXN"
 *   "526.8B MXN"     → "526,800 MDP"
 *   "979 contracts"  → "979 contracts" (passed through, no MXN suffix)
 *
 * Mexican media convention: "billón" = 10¹² (= English trillion), MDP =
 * "millones de pesos" used heavily in procurement journalism.
 */
export function localizeAmount(input: string, lang?: 'en' | 'es'): string {
  const isEs = (lang ?? i18n.language ?? 'en').startsWith('es')
  if (!isEs) return input

  function convertOne(numStr: string, suffix: string, dollarPrefix: string): string | null {
    const n = parseFloat(numStr.replace(',', '.'))
    if (Number.isNaN(n)) return null
    const s = suffix.toUpperCase()
    if (s === 'T') return `${dollarPrefix}${n.toFixed(n < 10 ? 2 : 1)} billones MXN`
    if (s === 'B') {
      const mdp = n * 1000
      const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(mdp))
      return `${dollarPrefix}${fmt} MDP`
    }
    if (s === 'M') return `${dollarPrefix}${n.toFixed(1)} MDP`
    return null
  }

  const trimmed = input.trim()

  // Range format: "79-158B MXN" → "79,000-158,000 MDP"
  const rangeRe = /^(\$\s*)?([0-9]+(?:[.,][0-9]+)?)-([0-9]+(?:[.,][0-9]+)?)\s*(B|T|M)\s*MXN\s*$/i
  const rm = trimmed.match(rangeRe)
  if (rm) {
    const lo = convertOne(rm[2], rm[4], rm[1] ? '$' : '')
    const hiRaw = convertOne(rm[3], rm[4], '')
    if (lo && hiRaw) {
      // strip trailing " MDP" from lo to join with dash: "79,000-158,000 MDP"
      const loVal = lo.replace(/\s*MDP$/, '').replace(/\s*billones MXN$/, '')
      return `${loVal}-${hiRaw}`
    }
  }

  // Single value: original path
  const re = /^(\$\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(B|T|M)\s*MXN\s*$/i
  const m = trimmed.match(re)
  if (!m) return input
  return convertOne(m[2], m[3], m[1] ? '$' : '') ?? input
}

/**
 * Format a number with thousands separators (locale-aware)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(getLocale()).format(num)
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a date for display (locale-aware)
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

import { getRiskLevelFromScore } from './constants'

/**
 * Get risk level from score (v4.0 thresholds — risk similarity indicators)
 * Delegates to the canonical function in constants.ts
 */
export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  return getRiskLevelFromScore(score)
}

/**
 * Get risk color class from score
 */
export function getRiskColorClass(score: number): string {
  const level = getRiskLevel(score)
  return `risk-${level}`
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Format a risk score consistently as percentage (0.27 -> "27.0")
 * This is the STANDARD way to display risk scores across the app
 */
export function formatRiskScore(score: number | undefined | null): string {
  if (score === undefined || score === null) return '-'
  return (score * 100).toFixed(1)
}

/**
 * Format a risk score with percentage sign (0.27 -> "27.0%")
 */
export function formatRiskScorePercent(score: number | undefined | null): string {
  if (score === undefined || score === null) return '-'
  return `${(score * 100).toFixed(1)}%`
}

/**
 * Safe percentage formatter - handles both 0-1 and 0-100 scales
 * @param value - The value to format
 * @param isDecimal - If true, value is 0-1 scale; if false, value is 0-100 scale
 */
export function formatPercentSafe(
  value: number | undefined | null,
  isDecimal: boolean = true,
  decimals: number = 1
): string {
  if (value === undefined || value === null) return '-'
  const percentage = isDecimal ? value * 100 : value
  return `${percentage.toFixed(decimals)}%`
}

/**
 * Validate contract amount and return status
 */
export function validateAmount(amount: number): {
  isValid: boolean
  isFlagged: boolean
  status: 'valid' | 'flagged' | 'rejected'
  message?: string
} {
  if (amount > MAX_CONTRACT_VALUE) {
    return {
      isValid: false,
      isFlagged: false,
      status: 'rejected',
      message: `Amount exceeds ${formatCompactMXN(MAX_CONTRACT_VALUE)} threshold - likely data error`,
    }
  }
  if (amount > FLAG_THRESHOLD) {
    return {
      isValid: true,
      isFlagged: true,
      status: 'flagged',
      message: `Amount exceeds ${formatCompactMXN(FLAG_THRESHOLD)} - flagged for review`,
    }
  }
  return { isValid: true, isFlagged: false, status: 'valid' }
}

/**
 * Format compact MXN with validation warning
 */
export function formatCompactMXNSafe(amount: number): { formatted: string; warning?: string } {
  const validation = validateAmount(amount)
  return {
    formatted: formatCompactMXN(amount),
    warning: validation.message,
  }
}

/**
 * Normalize a value to 0-1 scale given min/max bounds
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Title case converter for ALL CAPS database text.
 * Handles Mexican corporate suffixes, acronyms, state prefixes, and Spanish particles.
 */
export function toTitleCase(text: string): string {
  if (!text) return ''
  // Already genuine mixed case (has BOTH a lowercase AND an uppercase ASCII
  // letter) — leave it alone. We test ASCII case only on purpose: COMPRANET
  // stores many names ASCII-UPPERCASE with their accented vowels left lowercase
  // (SQLite UPPER() is ASCII-only), e.g. "ANNA HIDA CHáVEZ ALEMáN". The old
  // `text !== text.toUpperCase()` guard treated that lone lowercase "á" as
  // mixed-case and returned the mangled string unchanged; the ASCII-only test
  // correctly recognises it as effectively all-caps and title-cases it.
  if (/[a-z]/.test(text) && /[A-Z]/.test(text)) return text

  let lower = text.toLowerCase()

  // Preserve period-separated corporate suffixes BEFORE word-level processing
  lower = lower
    .replace(/\bs\.\s*a\.\s*de\s+c\.\s*v\./g, '\x01SACV\x01')
    .replace(/\bs\.\s*de\s+r\.\s*l\.\s*de\s+c\.\s*v\./g, '\x01SRLCV\x01')
    .replace(/\bs\.\s*de\s+r\.\s*l\./g, '\x01SRL\x01')
    .replace(/\bs\.\s*a\.\s*p\.\s*i\./g, '\x01SAPI\x01')
    .replace(/\bs\.\s*a\.\s*b\./g, '\x01SAB\x01')
    .replace(/\bs\.\s*a\./g, '\x01SA\x01')
    .replace(/\bs\.\s*c\./g, '\x01SC\x01')
    .replace(/\bs\.\s*n\.\s*c\./g, '\x01SNC\x01')

  // Spanish particles that stay lowercase (except at start)
  const particles = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'en', 'con', 'al', 'para', 'por', 'a'])
  // Corporate/legal tokens that stay UPPERCASE (space-separated)
  const upperTokens = new Set(['sa', 'cv', 'sc', 'srl', 'sab', 'sapi', 'sofom', 'enr', 'ac', 'ab', 'rl', 'ia', 'ii', 'iii', 'iv'])
  // Known acronyms to preserve
  const acronyms = new Set(['imss', 'issste', 'pemex', 'cfe', 'sat', 'shcp', 'sep', 'ssa', 'sedena', 'semar', 'conagua', 'sct', 'cdi', 'inegi', 'unam', 'ipn', 'lp', 'inc'])

  // Handle state prefix pattern: "NL-Something" → keep prefix uppercase
  const stateMatch = lower.match(/^([a-z]{2,4})-(.+)$/)
  if (stateMatch) {
    return stateMatch[1].toUpperCase() + '-' + toTitleCase(stateMatch[2].toUpperCase())
  }

  // Split on whitespace to process space-separated tokens (avoids \b issues with accented chars)
  const result = lower.split(/(\s+)/).map((token, i, arr) => {
    // Preserve whitespace tokens as-is
    if (/^\s+$/.test(token)) return token
    // Find the position of this token relative to start (for first-word check)
    const isFirst = arr.slice(0, i).every(t => /^\s*$/.test(t))
    // Strip trailing punctuation for matching, reattach after
    const match = token.match(/^([,;:/(]*)([\s\S]*?)([\x01,;:/).]*)$/)
    if (!match) return token
    const [, prefix, core, suffix] = match
    // Placeholder tokens from corporate patterns
    if (core.startsWith('\x01')) return prefix + core + suffix
    // Check if the ASCII-only version matches our word lists
    const ascii = core.replace(/[^a-z]/g, '')
    if (upperTokens.has(ascii) && ascii === core) return prefix + core.toUpperCase() + suffix
    if (acronyms.has(ascii) && ascii === core) return prefix + core.toUpperCase() + suffix
    if (!isFirst && particles.has(core)) return prefix + core + suffix
    // Default: capitalize first letter
    return prefix + core.charAt(0).toUpperCase() + core.slice(1) + suffix
  }).join('')

  // Restore corporate suffix placeholders
  return result
    .replace(/\x01SACV\x01/g, 'S.A. de C.V.')
    .replace(/\x01SRLCV\x01/g, 'S. de R.L. de C.V.')
    .replace(/\x01SRL\x01/g, 'S. de R.L.')
    .replace(/\x01SAPI\x01/g, 'S.A.P.I.')
    .replace(/\x01SAB\x01/g, 'S.A.B.')
    .replace(/\x01SA\x01/g, 'S.A.')
    .replace(/\x01SC\x01/g, 'S.C.')
    .replace(/\x01SNC\x01/g, 'S.N.C.')
}

/**
 * MXN to USD approximate conversion rates (annual averages)
 */
export const MXN_USD_RATES: Record<number, number> = {
  2002: 9.66, 2003: 10.79, 2004: 11.29, 2005: 10.90, 2006: 10.90,
  2007: 10.93, 2008: 11.13, 2009: 13.51, 2010: 12.64, 2011: 12.42,
  2012: 13.17, 2013: 12.77, 2014: 13.29, 2015: 15.85, 2016: 18.66,
  2017: 18.93, 2018: 19.24, 2019: 19.26, 2020: 21.49, 2021: 20.28,
  2022: 20.13, 2023: 17.76, 2024: 17.05, 2025: 17.20,
}

/**
 * Format a MXN amount as compact USD using year-specific exchange rate.
 * Use when a contract's historical year matters (e.g. converting 2002 pesos
 * at the 2002 rate rather than today's). For "today's-rate" scale companions
 * on headline numbers, use formatCompactUSD() instead.
 */
export function formatCompactUSDByYear(amountMXN: number, year?: number): string {
  const rate = year ? (MXN_USD_RATES[year] || 17.2) : 17.2
  const usd = amountMXN / rate
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(1)}T USD`
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B USD`
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M USD`
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K USD`
  return `$${usd.toFixed(0)} USD`
}

/**
 * Approximate chi-squared survival function (1 - CDF) for computing p-values.
 * Uses the regularized incomplete gamma function via series expansion.
 * @param x - The chi-squared statistic (e.g., Mahalanobis D²)
 * @param k - Degrees of freedom (default 12 for 12 z-score features)
 * @returns p-value (probability of observing a value >= x)
 */
export function chiSquaredPValue(x: number, k: number = 12): number {
  if (x <= 0) return 1
  // P(X >= x) = 1 - gammainc(k/2, x/2) where gammainc is the regularized lower incomplete gamma
  // Use series expansion of the regularized lower incomplete gamma function
  const a = k / 2
  const z = x / 2

  // For large x, p-value is very small
  if (z > a + 40) return 0

  // Series expansion: P(a, z) = e^(-z) * z^a * sum(z^n / gamma(a+n+1))
  let sum = 0
  let term = 1 / a
  sum = term
  for (let n = 1; n < 200; n++) {
    term *= z / (a + n)
    sum += term
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) break
  }

  // log(P) = -z + a*log(z) + log(sum) - lgamma(a)
  const logP = -z + a * Math.log(z) + Math.log(sum) - lnGamma(a)
  const P = Math.exp(logP)

  return Math.max(0, Math.min(1, 1 - P))
}

/** Log-gamma function (Lanczos approximation) */
function lnGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  }
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i)
  }
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/**
 * Get anomaly label and color from Mahalanobis distance.
 * @returns { label, colorClass } or null if no data
 */
export function getAnomalyInfo(mahalanobisDistance: number | undefined | null): {
  label: string
  dotClass: string
  badgeClass: string
} | null {
  if (mahalanobisDistance == null) return null
  const pValue = chiSquaredPValue(mahalanobisDistance)
  if (pValue < 0.01) {
    return {
      label: 'Anomalous',
      dotClass: 'bg-risk-critical',
      badgeClass: 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30',
    }
  }
  if (pValue < 0.05) {
    return {
      label: 'Unusual',
      dotClass: 'bg-risk-high',
      badgeClass: 'bg-risk-high/20 text-risk-high border border-risk-high/30',
    }
  }
  return null
}

const CONTRACT_STRIP_PREFIXES = [
  'CONTRATO DE SERVICIOS DE ',
  'CONTRATO DE PRESTACIÓN DE SERVICIOS DE ',
  'ADJUDICACIÓN DIRECTA PARA LA ',
  'ADJUDICACIÓN DIRECTA PARA ',
  'LICITACIÓN PÚBLICA NACIONAL PARA ',
  'LICITACIÓN PÚBLICA INTERNACIONAL PARA ',
  'SERVICIO DE ',
  'ADQUISICIÓN DE ',
  'PROYECTO INTEGRAL DE ',
  'ELABORACIÓN DEL PROYECTO EJECUTIVO, SUMINISTRO DE MATERIALES, ',
  'ELABORACIÓN DE PROYECTO EJECUTIVO, SUMINISTRO DE MATERIALES, ',
  'TRABAJOS DE CONSTRUCCIÓN Y OBRAS COMPLEMENTARIAS DEL ',
]

const INSTITUTION_ABBREVS: Record<string, string> = {
  'INSTITUTO MEXICANO DEL SEGURO SOCIAL': 'IMSS',
  'PETRÓLEOS MEXICANOS': 'PEMEX',
  'COMISIÓN FEDERAL DE ELECTRICIDAD': 'CFE',
  'SECRETARÍA DE SALUD': 'SS',
  'SECRETARÍA DE EDUCACIÓN PÚBLICA': 'SEP',
  'SECRETARÍA DE HACIENDA Y CRÉDITO PÚBLICO': 'SHCP',
  'SECRETARÍA DE INFRAESTRUCTURA, COMUNICACIONES Y TRANSPORTES': 'SICT',
  'COMISIÓN NACIONAL DEL AGUA': 'CONAGUA',
  'INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO': 'ISSSTE',
  'BANCO NACIONAL DE OBRAS Y SERVICIOS PÚBLICOS': 'BANOBRAS',
}

/**
 * ~4.6% of pre-2010 COMPRANET contract titles (source_structure A/B) have every
 * accented vowel collapsed into a single garbage byte at original ingestion —
 * "ý" never legitimately appears in Spanish, so stripping it is safe wherever
 * contract text is displayed. Not recoverable: distinct source characters
 * (ó/á/é/ª) all map to the same byte, so there's no correct letter to restore.
 */
export function stripEncodingArtifacts(s: string): string {
  return s.replace(/[ýÝ]/g, '')
}

export function shortenContractName(name: string, maxChars = 80): string {
  if (!name) return ''
  let s = stripEncodingArtifacts(name).toUpperCase()
  for (const prefix of CONTRACT_STRIP_PREFIXES) {
    if (s.startsWith(prefix)) { s = s.slice(prefix.length); break }
  }
  for (const [full, abbrev] of Object.entries(INSTITUTION_ABBREVS)) {
    s = s.replace(full, abbrev)
  }
  s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  return s.length > maxChars ? s.slice(0, maxChars) + '…' : s
}

/**
 * Clamp a page number to valid range
 */
export function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, Math.max(1, totalPages)))
}

/**
 * Calculate pagination range (start, end, clamped to total)
 */
export function getPaginationRange(
  page: number,
  perPage: number,
  total: number
): { start: number; end: number } {
  const clampedPage = clampPage(page, Math.ceil(total / perPage))
  const start = Math.min((clampedPage - 1) * perPage + 1, total)
  const end = Math.min(clampedPage * perPage, total)
  return { start: total > 0 ? start : 0, end }
}
