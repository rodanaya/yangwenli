/**
 * dots-from-rows — port of the Halton(2,3) dot-placement math from
 * ConcentrationConstellation.tsx into a pure function the new
 * CanvasConstellation engine can consume.
 *
 * Atlas P6 Pass 2. The legacy SVG engine builds 1,200 dots in `useMemo`
 * mixed with rendering state; we extract only the geometry pass so the
 * Canvas engine receives a `ConstellationDot[]` it can quadtree + paint.
 *
 * Mirrors the SVG layout exactly (same Halton bases, jitter, attractor
 * weighting, cluster-radius math, mode-specific tightening) so visual
 * parity is preserved on the swap.
 *
 * Output coords are in 0..1 world fractions (CanvasConstellation
 * convention). The SVG engine works in 840×540 pixel space — we divide
 * out the field padding + size when emitting world coords.
 */

import { halton, mulberry32 } from '@/lib/particle'
import type {
  ConstellationRiskRow,
  ClusterMeta,
  ConstellationMode,
} from '@/components/charts/ConcentrationConstellation'
import type { ConstellationDot } from '@/components/atlas/CanvasConstellation'

// Must mirror ConcentrationConstellation.tsx constants exactly.
const SVG_W = 840
const SVG_H = 540
const PAD_L = 16
const PAD_R = 200
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B
const N_DOTS = 1200

export interface DotsFromRowsOptions {
  rows: ConstellationRiskRow[]
  meta: ClusterMeta[]
  mode: ConstellationMode
  seed: number
}

/**
 * Pure function — given the active risk distribution + cluster meta,
 * returns a ConstellationDot[] in world (0..1) coordinates ready for the
 * Canvas engine. Identity is stable across calls with the same inputs.
 */
export function dotsFromRows(opts: DotsFromRowsOptions): ConstellationDot[] {
  const { rows, meta, mode, seed } = opts
  const nClusters = meta.length

  // Allocate dot counts proportional to percentages, preserving N_DOTS.
  const order: Array<ConstellationRiskRow['level']> = ['critical', 'high', 'medium', 'low']
  const byLevel = Object.fromEntries(
    order.map((l) => [l, rows.find((r) => r.level === l)?.pct ?? 0]),
  ) as Record<ConstellationRiskRow['level'], number>

  const counts: Record<ConstellationRiskRow['level'], number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  }
  let allocated = 0
  for (const lvl of order) {
    const c = Math.round((byLevel[lvl] / 100) * N_DOTS)
    counts[lvl] = c
    allocated += c
  }
  counts.low += N_DOTS - allocated

  // Flat level array in critical-first order so they paint last.
  const labels: Array<ConstellationRiskRow['level']> = []
  for (const lvl of order) {
    for (let i = 0; i < counts[lvl]; i++) labels.push(lvl)
  }

  // Attractors in pixel space (we convert to 0..1 world at emit time).
  const attractors = meta.map((m) => ({
    x: PAD_L + m.fx * FIELD_W,
    y: PAD_T + m.fy * FIELD_H,
    code: m.code,
  }))

  const totalT1 = meta.reduce((s, m) => s + m.t1, 0) || 1
  const weights = meta.map((m) => m.t1 / totalT1)
  const cumWeights: number[] = []
  for (let i = 0; i < weights.length; i++) {
    cumWeights.push((cumWeights[i - 1] ?? 0) + weights[i])
  }
  if (cumWeights.length > 0) cumWeights[cumWeights.length - 1] = 1

  const rng = mulberry32(seed)
  const out: ConstellationDot[] = []
  let criticalIdx = 0

  for (let i = 0; i < N_DOTS; i++) {
    const u = halton(i + 1, 2)
    const v = halton(i + 1, 3)
    const jx = (rng() - 0.5) * 4
    const jy = (rng() - 0.5) * 4
    let x = PAD_L + u * FIELD_W + jx
    let y = PAD_T + v * FIELD_H + jy

    const level = labels[i]
    let clusterCode: string | undefined

    if (level === 'critical' && nClusters > 0) {
      const uCluster = halton(criticalIdx * 7 + 1, 5)
      let picked = cumWeights.findIndex((cw) => uCluster < cw)
      if (picked === -1) picked = nClusters - 1
      const a = attractors[picked]
      clusterCode = a.code
      criticalIdx++

      const ang = rng() * Math.PI * 2
      const rMax = mode === 'sexenios' ? 16 : 22
      const radius = 6 + Math.pow(rng(), 1.6) * rMax
      x = a.x + Math.cos(ang) * radius
      y = a.y + Math.sin(ang) * radius
    }

    // Clamp inside field.
    x = Math.max(PAD_L + 2, Math.min(PAD_L + FIELD_W - 2, x))
    y = Math.max(PAD_T + 2, Math.min(PAD_T + FIELD_H - 2, y))

    // Emit in 0..1 world coords — CanvasConstellation contract.
    out.push({
      id: `dot-${i}`,
      x: x / SVG_W,
      y: y / SVG_H,
      riskLevel: level,
      clusterCode,
    })
  }

  return out
}

/**
 * Convert a ClusterMeta[] (SVG-pixel fractions of FIELD_W × FIELD_H) into
 * the world-space (0..1 of full canvas) cluster attractors the engine
 * accepts. The SVG engine reserves a 200px right margin for annotations;
 * Canvas engine has no such reservation, so we re-anchor onto the full
 * canvas. Visual parity is preserved by keeping the same fx,fy that the
 * SVG engine used (the engine has its own padding semantics).
 */
export function clustersFromMeta(meta: ClusterMeta[]): Array<{
  code: string
  label: string
  fx: number
  fy: number
  color: string
}> {
  return meta.map((m) => ({
    code: m.code,
    label: m.label,
    // Map SVG pixel attractors into 0..1 world coords on the full SVG_W/H.
    fx: (PAD_L + m.fx * FIELD_W) / SVG_W,
    fy: (PAD_T + m.fy * FIELD_H) / SVG_H,
    color: m.color,
  }))
}
