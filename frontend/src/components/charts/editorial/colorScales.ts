/**
 * Perceptually-uniform color scales for editorial heatmaps.
 * Locked to bible §2 color vocabulary.
 */

export type HeatmapScale = 'risk' | 'sequential-amber' | 'diverging-cream-red'

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Map a value to a heatmap fill.
 * Risk scale: cream → amber → red (low → critical).
 * Sequential amber: cream → amber gold.
 * Diverging: cream at midpoint, red high, blue low.
 */
export function scaleToColor(
  v: number,
  min: number,
  max: number,
  scale: HeatmapScale = 'risk',
): string {
  const t = max === min ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min)))
  switch (scale) {
    case 'risk': {
      // 3-stop gradient: cream → amber → red
      if (t < 0.5) return lerpHex('#f3f1ec', '#f59e0b', t * 2)
      return lerpHex('#f59e0b', '#ef4444', (t - 0.5) * 2)
    }
    case 'sequential-amber':
      return lerpHex('#f3f1ec', '#a06820', t)
    case 'diverging-cream-red':
      if (t < 0.5) return lerpHex('#22d3ee', '#f3f1ec', t * 2)
      return lerpHex('#f3f1ec', '#ef4444', (t - 0.5) * 2)
  }
}
