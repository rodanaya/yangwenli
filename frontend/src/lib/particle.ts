/**
 * particle.ts — shared deterministic geometry primitives for the editorial
 * particle-grammar charts (ContractField, ConcentrationConstellation,
 * MiniRiskField, RiskRingField, SexenioStratum, …).
 *
 * Everything in here is deterministic: identical inputs always produce
 * identical output. No animation, no Date.now(), no Math.random() leaks.
 *
 * Public API:
 *   halton(i, base)               — single Halton scalar
 *   mulberry32(seed)              — fast seeded RNG (returns () => number)
 *   haltonField({ n, seed, ... }) — N points in a unit square, optional
 *                                   centripetal pull toward attractors
 *   nearestNeighborEdges(pts, k)  — for each point, k nearest-neighbor edges
 */

// ── Halton low-discrepancy sequence ────────────────────────────────────────
// Even-but-organic placement that never clumps. Bases 2 and 3 give a
// classical 2D "starfield" feel without grid betrayal.
export function halton(index: number, base: number): number {
  let result = 0
  let f = 1 / base
  let i = index
  while (i > 0) {
    result += f * (i % base)
    i = Math.floor(i / base)
    f /= base
  }
  return result
}

// ── Mulberry32 seeded RNG ──────────────────────────────────────────────────
// Tiny, fast, good distribution. Used for jitter and per-dot offsets where
// we want determinism across renders.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 2D point ───────────────────────────────────────────────────────────────
export interface Point2D { x: number; y: number }

export interface Attractor extends Point2D {
  /** 0..1 — how strongly this attractor pulls (1 = full snap to ring). */
  weight?: number
}

export interface HaltonFieldOptions {
  /** Number of points to generate. */
  n: number
  /** RNG seed for jitter and attractor selection. */
  seed?: number
  /** Field width and height. Output coords are in [pad, w-pad] × [pad, h-pad]. */
  width?: number
  height?: number
  /** Inset from edges so dots never touch the border. */
  pad?: number
  /** Pixel jitter applied to Halton positions to break visible structure. */
  jitter?: number
  /**
   * Optional attractors. If `attractorPicker(i)` returns an index >= 0, that
   * point is reseated near the attractor inside a small radius (mimicking
   * ContractField's self-organize phase).
   */
  attractors?: Attractor[]
  attractorPicker?: (i: number) => number
  /** Min/max radius around attractor (default 8..34). */
  attractorRadius?: [number, number]
}

/**
 * haltonField — generate `n` evenly-but-organically placed 2D points,
 * optionally pulling a subset toward attractors. Deterministic given seed.
 */
export function haltonField(opts: HaltonFieldOptions): Point2D[] {
  const {
    n,
    seed = 31415,
    width = 1,
    height = 1,
    pad = 2,
    jitter = 0,
    attractors,
    attractorPicker,
    attractorRadius = [8, 34],
  } = opts

  const rng = mulberry32(seed)
  const out: Point2D[] = []

  const minX = pad
  const minY = pad
  const maxX = Math.max(pad, width - pad)
  const maxY = Math.max(pad, height - pad)

  for (let i = 0; i < n; i++) {
    const u = halton(i + 1, 2)
    const v = halton(i + 1, 3)
    const jx = jitter > 0 ? (rng() - 0.5) * jitter : 0
    const jy = jitter > 0 ? (rng() - 0.5) * jitter : 0

    let x = u * width + jx
    let y = v * height + jy

    if (attractors && attractors.length > 0 && attractorPicker) {
      const idx = attractorPicker(i)
      if (idx >= 0 && idx < attractors.length) {
        const a = attractors[idx]
        const ang = rng() * Math.PI * 2
        const [r0, r1] = attractorRadius
        const r = r0 + Math.pow(rng(), 1.6) * (r1 - r0)
        x = a.x + Math.cos(ang) * r
        y = a.y + Math.sin(ang) * r
      }
    }

    x = Math.max(minX, Math.min(maxX, x))
    y = Math.max(minY, Math.min(maxY, y))

    out.push({ x, y })
  }

  return out
}

// ── Edge construction ──────────────────────────────────────────────────────
export interface EdgeIdx { i: number; j: number; primary: boolean }

/**
 * nearestNeighborEdges — for each point, return its k nearest neighbor edges.
 * Used to draw "vendor network" red lines between critical-cluster members.
 *
 * Optionally restrict to same group via `group(i)` (return same value to
 * link, return different values to disconnect — like the "cluster" id on
 * ContractField).
 */
export function nearestNeighborEdges(
  points: Point2D[],
  k: number = 1,
  opts: { maxDist?: number; group?: (i: number) => number } = {},
): EdgeIdx[] {
  const { maxDist, group } = opts
  const maxD2 = maxDist != null ? maxDist * maxDist : Infinity
  const out: EdgeIdx[] = []
  const n = points.length

  for (let i = 0; i < n; i++) {
    // Top-k smallest distances
    const best: { idx: number; d2: number }[] = []
    const gi = group ? group(i) : 0
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      if (group && group(j) !== gi) continue
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const d2 = dx * dx + dy * dy
      if (d2 > maxD2) continue
      // Insert sorted
      if (best.length < k) {
        best.push({ idx: j, d2 })
        best.sort((a, b) => a.d2 - b.d2)
      } else if (d2 < best[best.length - 1].d2) {
        best[best.length - 1] = { idx: j, d2 }
        best.sort((a, b) => a.d2 - b.d2)
      }
    }
    for (let r = 0; r < best.length; r++) {
      out.push({ i, j: best[r].idx, primary: r === 0 })
    }
  }

  return out
}
