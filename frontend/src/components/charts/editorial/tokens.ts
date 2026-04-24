/**
 * Chart tokens — locked to ART_DIRECTION.md §2, §3, §4.
 * Every editorial chart primitive imports from here. No styling knob in
 * a primitive accepts a raw hex value; everything resolves through tokens.
 */

export const CHART_TOKENS = {
  /* Axis (bible §3.3: mono Micro 11px, muted) */
  axis: {
    tickFill: 'var(--color-text-muted)',
    tickFontSize: 11,
    tickFontFamily: 'var(--font-family-mono)',
    tickLine: false,
    axisLine: false,
    width: 44,
  },
  /* Grid — horizontal hairlines only, low opacity (bible §4 implicit) */
  grid: {
    stroke: 'var(--color-border)',
    strokeDasharray: '3 3',
    opacity: 0.35,
    vertical: false,
  },
  /* Tooltip — paper dark per bible §8 GRAFIKA V9, rendered via .chart-tooltip */
  tooltip: {
    className: 'chart-tooltip',
  },
  /* Line (bible §3: hairline authority) */
  line: {
    strokeWidth: 2,
    strokeWidthSecondary: 1.5,
    dot: false,
    activeDotR: 4,
  },
  /* Area (gradient fill, opacity 0.25 → 0) */
  area: {
    fillOpacityTop: 0.22,
    fillOpacityBottom: 0,
  },
  /* Dot-matrix (bible §4 canonical parameters) */
  dotMatrix: {
    N: 50,
    R: 3,
    GAP: 8,
    emptyFill: '#f3f1ec',
    emptyStroke: '#e2ddd6',
    emptyFillDarkContext: '#27272a',
    emptyStrokeDarkContext: '#3f3f46',
    staggerSec: 0.008,
    fadeInSec: 0.25,
  },
  /* OECD reference line (bible §2, §4) */
  oecd: {
    stroke: '#22d3ee',
    strokeWidth: 1,
    strokeDasharray: '2 2',
  },
  /* Canonical heights */
  dims: {
    spark: 40,
    compact: 160,
    default: 260,
    hero: 360,
  },
} as const

/** Semantic token name → CSS var. All chart colors go through this. */
export type ColorToken =
  /* Risk palette */
  | 'risk-critical' | 'risk-high' | 'risk-medium' | 'risk-low'
  /* Sector palette */
  | 'sector-salud' | 'sector-educacion' | 'sector-infraestructura'
  | 'sector-energia' | 'sector-defensa' | 'sector-tecnologia'
  | 'sector-hacienda' | 'sector-gobernacion' | 'sector-agricultura'
  | 'sector-ambiente' | 'sector-trabajo' | 'sector-otros'
  /* Accents + neutrals */
  | 'accent' | 'accent-data' | 'oecd' | 'text-primary' | 'text-muted'
  | 'neutral'

export function tokenColor(token: ColorToken): string {
  if (token === 'neutral') return 'var(--color-text-muted)'
  if (token === 'oecd') return 'var(--color-oecd)'
  if (token === 'accent' || token === 'accent-data') {
    return `var(--color-${token})`
  }
  if (token.startsWith('text-')) return `var(--color-${token})`
  return `var(--color-${token})`
}

/** Shared annotation shape used by all primitives. */
export type ChartAnnotation =
  | { kind: 'vrule'; x: string | number; label: string; tone?: 'info' | 'warn' | 'critical' | 'oecd' }
  | { kind: 'hrule'; y: number; label: string; tone?: 'info' | 'warn' | 'critical' | 'oecd' }
  | { kind: 'band'; x1: string | number; x2: string | number; label?: string; tone?: 'admin' | 'crisis' }
  | { kind: 'point'; x: string | number; y: number; label: string; tone?: 'info' | 'critical' }

export function annotationStroke(tone: ChartAnnotation['tone']): string {
  switch (tone) {
    case 'critical': return 'var(--color-risk-critical)'
    case 'warn': return 'var(--color-risk-high)'
    case 'oecd': return 'var(--color-oecd)'
    case 'admin': return 'var(--color-accent)'
    case 'crisis': return 'var(--color-risk-critical)'
    case 'info':
    default: return 'var(--color-text-muted)'
  }
}

/** Bible §3.6 number formatters. */
export function formatValue(
  v: number | null | undefined,
  fmt: 'pct' | 'mxn-compact' | 'integer' | 'decimal' = 'integer',
): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  switch (fmt) {
    case 'pct':
      return `${v.toFixed(1)}%`
    case 'mxn-compact':
      if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`
      if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`
      if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
      if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`
      return v.toFixed(0)
    case 'decimal':
      return v.toFixed(2)
    case 'integer':
    default:
      return new Intl.NumberFormat('es-MX').format(Math.round(v))
  }
}
