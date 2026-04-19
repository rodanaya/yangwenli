/**
 * Vendor name normalisation.
 *
 * COMPRANET data ships vendor names in ALL CAPS with trailing legal suffixes
 * ("CONSTRUCCIONES DEL NORTE SA DE CV", "GRUPO FARMACEUTICO ALTAMIRANO S.A. DE
 * C.V."). Rendering those verbatim blows up any editorial row — so this module
 * gives us a single Title-Cased, suffix-stripped string that reads like a
 * newspaper byline.
 *
 * Intentionally deterministic and dependency-free (no i18n/ICU libs).
 */

// Common Mexican legal-entity suffixes. Order matters — match longest first so
// "S.A. DE C.V." wins over "S.A.".
const LEGAL_SUFFIX_PATTERNS: RegExp[] = [
  /\bS\.?\s*A\.?\s*DE\s*C\.?\s*V\.?\b\.?$/i,
  /\bS\.?\s*DE\s*R\.?\s*L\.?\s*DE\s*C\.?\s*V\.?\b\.?$/i,
  /\bS\.?\s*A\.?\s*P\.?\s*I\.?\s*DE\s*C\.?\s*V\.?\b\.?$/i,
  /\bS\.?\s*C\.?\s*DE\s*C\.?\s*V\.?\b\.?$/i,
  /\bS\.?\s*A\.?\s*B\.?\s*DE\s*C\.?\s*V\.?\b\.?$/i,
  /\bS\.?\s*DE\s*R\.?\s*L\.?\b\.?$/i,
  /\bS\.?\s*A\.?\s*B\.?\b\.?$/i,
  /\bS\.?\s*A\.?\s*P\.?\s*I\.?\b\.?$/i,
  /\bS\.?\s*A\.?\b\.?$/i,
  /\bS\.?\s*C\.?\b\.?$/i,
  /\bA\.?\s*C\.?\b\.?$/i,
  /\bS\.?\s*N\.?\s*C\.?\b\.?$/i,
  /,?\s*SOCIEDAD\s+AN[OÓ]NIMA(\s+DE\s+CAPITAL\s+VARIABLE)?\b\.?$/i,
]

// Spanish connectors that stay lowercase inside a Title-Cased string.
const LOWERCASE_TOKENS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'para', 'por',
  'con', 'a', 'al', 'o', 'u', 'sobre',
])

// Tokens that should stay fully uppercase (known acronyms / initialisms).
const UPPERCASE_TOKENS = new Set([
  'sa', 'cv', 'rl', 'sc', 'ac', 'api', 'sab', 'snc',
  'usa', 'uk', 'mx', 'ee', 'uu', 'eeuu',
  'imss', 'issste', 'pemex', 'cfe', 'sat', 'sep', 'sedena', 'semar',
  'conagua', 'infonavit', 'fovissste', 'bansefi', 'bancomext',
  'it', 'ti', 'tic', 'tics', 'bi', 'erp', 'crm', 'sap',
  'abc', 'sa.', 'sab.', 'cv.',
])

function titleCaseToken(raw: string, isFirst: boolean): string {
  if (!raw) return raw
  const lower = raw.toLowerCase()

  // Preserve pure-punctuation / numeric / short tokens verbatim.
  if (/^[\d.,\-/&()]+$/.test(raw)) return raw

  // Known acronyms stay uppercase.
  if (UPPERCASE_TOKENS.has(lower.replace(/\./g, ''))) {
    return raw.toUpperCase()
  }

  // Spanish connectors stay lowercase, unless they're the leading token.
  if (!isFirst && LOWERCASE_TOKENS.has(lower)) {
    return lower
  }

  // Hyphenated compounds: title-case each half.
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map((part, i) => titleCaseToken(part, i === 0))
      .join('-')
  }

  // Strip stray trailing periods before casing, restore afterwards.
  const trailing = lower.endsWith('.') ? '.' : ''
  const core = trailing ? lower.slice(0, -1) : lower
  return core.charAt(0).toUpperCase() + core.slice(1) + trailing
}

/**
 * Normalise a vendor name for display.
 *
 * - Strips common legal suffixes (SA DE CV, S.A. DE C.V., etc.)
 * - Converts ALL CAPS → Title Case with Spanish-aware lowercasing of connectors
 * - Preserves known acronyms (IMSS, PEMEX, SA, CV…)
 * - Truncates past `maxLength` with an ellipsis.
 */
export function formatVendorName(
  name: string | null | undefined,
  maxLength: number = 28,
): string {
  if (!name) return ''

  let working = name.trim().replace(/\s+/g, ' ')

  // Strip legal suffixes (iteratively — some names carry two).
  for (let pass = 0; pass < 3; pass++) {
    const before = working
    for (const pattern of LEGAL_SUFFIX_PATTERNS) {
      working = working.replace(pattern, '').trim()
    }
    // Strip trailing commas / periods left behind by suffix removal.
    working = working.replace(/[\s,.;:-]+$/g, '').trim()
    if (working === before) break
  }

  if (!working) working = name.trim()

  // Detect "is this mostly uppercase?" — if so, apply Title Case. Otherwise
  // leave human-cased names alone (don't butcher "Grupo México" → "Grupo
  // México" is fine, but also don't re-case mixed-case strings).
  const letters = working.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '')
  const upperLetters = letters.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '')
  const mostlyUpper =
    letters.length > 0 && upperLetters.length / letters.length > 0.7

  if (mostlyUpper) {
    working = working
      .split(' ')
      .map((tok, i) => titleCaseToken(tok, i === 0))
      .join(' ')
  }

  // Truncate at word boundary if possible.
  if (working.length > maxLength) {
    const slice = working.slice(0, maxLength - 1)
    const lastSpace = slice.lastIndexOf(' ')
    const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice
    working = cut.trimEnd() + '…'
  }

  return working
}
