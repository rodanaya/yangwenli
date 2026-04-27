/**
 * DotStrip (legacy adapter) — thin wrapper around the canonical editorial
 * primitive. Kept for API compatibility with callers that pass raw values +
 * CSS-var/hex colors from external lookup tables (sector palettes,
 * GRADE_COLORS, PROCEDURE_COLORS, etc.).
 *
 * New code SHOULD prefer `import { DotStrip } from '@/components/charts/editorial'`
 * and pass `rows: DotStripRow[]` with semantic `colorToken` values.
 *
 * This adapter exists so that the off-token legacy implementation no longer
 * lives in the codebase — there's exactly one renderer (editorial), called
 * through two API shapes.
 */

import {
  DotStrip as EditorialDotStrip,
  type DotStripRow,
} from './editorial'

export interface DotStripItem {
  label: string
  value: number
  /** CSS color (hex or var(--…)). Routed through colorRaw on the editorial primitive. */
  color?: string
  valueLabel?: string
}

interface DotStripProps {
  data: DotStripItem[]
  /** Number of dot cells per row. Default falls through to editorial's N=50. */
  dots?: number
  /** @deprecated geometry now locked to CHART_TOKENS.dotMatrix.R */
  dotR?: number
  /** @deprecated geometry now locked to CHART_TOKENS.dotMatrix.GAP */
  dotGap?: number
  labelW?: number
  rowH?: number
  formatVal?: (v: number) => string
  className?: string
}

export function DotStrip({
  data,
  dots,
  labelW,
  rowH,
  formatVal,
}: DotStripProps) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map((d) => d.value), 1)

  const rows: DotStripRow[] = data.map((item) => ({
    label: item.label,
    fraction: item.value / maxVal,
    colorRaw: item.color,
    valueLabel:
      item.valueLabel ??
      (formatVal ? formatVal(item.value) : item.value.toLocaleString()),
  }))

  return (
    <EditorialDotStrip
      rows={rows}
      N={dots}
      labelWidth={labelW}
      rowHeight={rowH}
    />
  )
}

export default DotStrip
