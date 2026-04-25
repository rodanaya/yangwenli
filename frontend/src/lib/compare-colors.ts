/**
 * Comparison color pair — single source of truth for the "A vs B"
 * visualizations on InstitutionCompare and VendorCompare.
 *
 * Was a duplicated cyan/violet hex pair (#06b6d4 + #a78bfa) hardcoded in
 * both pages — dark SaaS palette that fights the cream broadsheet base.
 *
 * The pair below uses the editorial gold accent (warm amber) for slot A
 * and the OECD reference cyan for slot B. Both are already platform
 * tokens and read clearly on cream.
 */

export const COMPARE_COLORS = {
  /** Slot A — primary (warm amber/gold). Matches --color-accent. */
  a: 'var(--color-accent)',
  /** Slot B — secondary (OECD cyan). Matches --color-oecd. */
  b: 'var(--color-oecd)',
} as const

/** Resolved hex values for charts that need a literal color string at
 *  build time (e.g. recharts <Cell/>). Use the var refs above wherever
 *  CSS will resolve the variable. */
export const COMPARE_HEX = {
  a: '#a06820',
  b: '#22d3ee',
} as const
