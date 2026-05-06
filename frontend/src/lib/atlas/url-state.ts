/**
 * Atlas URL state encoder/decoder — pure functions, no React imports.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § P5
 * Build: atlas-C-P5
 *
 * Encodes the following Atlas state into URL search params (non-default values only):
 *   lens  — patterns | sectors | categories | sexenios
 *   year  — 4-digit year (2008-2025); converted to/from yearIndex via ATLAS_YEARS
 *   floor — all | medium | high | critical (omitted when "all")
 *   pin   — cluster code (e.g. "P5"); omitted when null
 *   zoom  — cluster code when view.kind === 'zoomed-cluster'; takes precedence over pin
 *   select — comma-separated vendor IDs when selection is non-empty
 *
 * Existing params (compare, yearB, story) are preserved on write.
 */

// Year list mirrors YEAR_SNAPSHOTS in Atlas.tsx. Kept in sync here so this
// module stays free of React / Atlas.tsx imports (unit-testable).
export const ATLAS_YEARS = [
  2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,
  2018,2019,2020,2021,2022,2023,2024,2025,
] as const

export type AtlasLens = 'patterns' | 'sectors' | 'categories' | 'sexenios'
export type AtlasRiskFloor = 'all' | 'medium' | 'high' | 'critical'

const VALID_LENSES: readonly AtlasLens[] = ['patterns', 'sectors', 'categories', 'sexenios']
const VALID_FLOORS: readonly AtlasRiskFloor[] = ['all', 'medium', 'high', 'critical']

export interface AtlasUrlState {
  lens: AtlasLens
  yearIndex: number         // 0-17
  riskFloor: AtlasRiskFloor
  pinnedCode: string | null
  zoomedCode: string | null // non-null when view.kind === 'zoomed-cluster'
  selection: string[]       // vendor IDs
}

const DEFAULT_LENS: AtlasLens = 'patterns'
const DEFAULT_YEAR_INDEX = ATLAS_YEARS.length - 1 // 2025

/**
 * Encode Atlas state into URLSearchParams.
 * Only writes non-default values. Preserves unrelated params (compare, story, etc.)
 * by accepting an existing params object to merge into.
 */
export function encodeAtlasState(
  state: AtlasUrlState,
  existing?: URLSearchParams,
): URLSearchParams {
  // Start from a copy of existing params (preserves compare, story, etc.)
  const params = new URLSearchParams(existing?.toString() ?? '')

  // lens — omit if default
  if (state.lens !== DEFAULT_LENS) {
    params.set('lens', state.lens)
  } else {
    params.delete('lens')
  }

  // year — omit if default (most recent)
  const year = ATLAS_YEARS[state.yearIndex]
  if (state.yearIndex !== DEFAULT_YEAR_INDEX && year !== undefined) {
    params.set('year', String(year))
  } else {
    params.delete('year')
  }

  // floor — omit if 'all'
  if (state.riskFloor !== 'all') {
    params.set('floor', state.riskFloor)
  } else {
    params.delete('floor')
  }

  // zoom takes precedence over pin in the URL
  if (state.zoomedCode) {
    params.set('zoom', state.zoomedCode)
    params.delete('pin')
  } else {
    params.delete('zoom')
    if (state.pinnedCode) {
      params.set('pin', state.pinnedCode)
    } else {
      params.delete('pin')
    }
  }

  // select — omit if empty
  if (state.selection.length > 0) {
    params.set('select', state.selection.join(','))
  } else {
    params.delete('select')
  }

  return params
}

/**
 * Decode URL search params into a partial AtlasUrlState.
 * Returns only the fields it could successfully parse — callers should merge
 * with defaults. Returns an empty object if all params are missing or invalid.
 * Never throws.
 */
export function decodeAtlasState(params: URLSearchParams): Partial<AtlasUrlState> {
  const result: Partial<AtlasUrlState> = {}

  // lens
  const lensRaw = params.get('lens')
  if (lensRaw && (VALID_LENSES as readonly string[]).includes(lensRaw)) {
    result.lens = lensRaw as AtlasLens
  }

  // year → yearIndex
  const yearRaw = params.get('year')
  if (yearRaw) {
    const yearNum = parseInt(yearRaw, 10)
    const idx = ATLAS_YEARS.indexOf(yearNum as typeof ATLAS_YEARS[number])
    if (idx >= 0) result.yearIndex = idx
  }

  // floor
  const floorRaw = params.get('floor')
  if (floorRaw && (VALID_FLOORS as readonly string[]).includes(floorRaw)) {
    result.riskFloor = floorRaw as AtlasRiskFloor
  }

  // zoom (takes precedence over pin)
  const zoomRaw = params.get('zoom')
  if (zoomRaw && zoomRaw.length > 0 && zoomRaw.length <= 32) {
    result.zoomedCode = zoomRaw
    result.pinnedCode = zoomRaw // also pin the cluster when zoomed
  } else {
    result.zoomedCode = null
    // pin — only if no zoom
    const pinRaw = params.get('pin')
    if (pinRaw && pinRaw.length > 0 && pinRaw.length <= 32) {
      result.pinnedCode = pinRaw
    }
  }

  // select
  const selectRaw = params.get('select')
  if (selectRaw && selectRaw.length > 0) {
    // Split by comma, filter empty strings, limit to reasonable count
    const ids = selectRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    if (ids.length > 0 && ids.length <= 500) {
      result.selection = ids
    }
  }

  return result
}

/**
 * Returns true if the URLSearchParams contain any Atlas-C-specific state
 * (zoom, select, floor). Used to decide whether to skip the first-visit auto-tour.
 */
export function hasAtlasCParams(params: URLSearchParams): boolean {
  return (
    params.has('zoom') ||
    params.has('select') ||
    params.has('floor') ||
    params.has('lens') ||
    params.has('pin')
  )
}
