/**
 * ConcentrationConstellation — a static dot-density "sky" of contract risk.
 *
 * 1,200 fixed dots laid out in a Halton(2,3) sequence fill an 840x220 panel.
 * Each dot is colored by risk level in exact proportion to risk_distribution.
 * Critical dots are nudged toward 3 invisible attractors (echoing the
 * ContractField hero on Intro) and joined to nearest neighbors with hairline
 * red edges — the corruption network made legible.
 *
 * Design grammar: same particle vocabulary as ContractField, but frozen.
 * Tells the story that no bar chart can: critical risk is not just rare,
 * it CLUSTERS. The other 94% is background sky.
 */
import { useMemo } from 'react'

export interface ConstellationRiskRow {
  level: 'critical' | 'high' | 'medium' | 'low'
  count: number
  pct: number // 0-100
}

interface ConcentrationConstellationProps {
  rows: ConstellationRiskRow[]
  totalContracts: number
  className?: string
}

// ── Layout constants ──────────────────────────────────────────────────────
const SVG_W = 840
const SVG_H = 220
const PAD_L = 16
const PAD_R = 200 // reserve right margin for annotations
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B
const N_DOTS = 1200
const N_ATTRACTORS = 3

// Risk visual styling (mirrors ContractField + RiskStrata)
const DOT_STYLE: Record<ConstellationRiskRow['level'], { r: number; fill: string; alpha: number; halo?: number }> = {
  critical: { r: 1.8, fill: '#ef4444', alpha: 0.95, halo: 3.6 },
  high:     { r: 1.3, fill: '#f59e0b', alpha: 0.78 },
  medium:   { r: 0.95, fill: '#a16207', alpha: 0.55 },
  low:      { r: 0.6,  fill: '#71717a', alpha: 0.42 },
}

// ── Halton low-discrepancy sequence ───────────────────────────────────────
// Deterministic, evenly-distributed positions that look random but never
// clump. Far better than Math.random() for a "starfield" feel.
function halton(index: number, base: number): number {
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

// Mulberry32 — seeded RNG for tiny jitter, deterministic across renders.
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface DotPos {
  x: number
  y: number
  level: ConstellationRiskRow['level']
  cluster: number // -1 for non-critical
}

export function ConcentrationConstellation({ rows, totalContracts, className }: ConcentrationConstellationProps) {
  const { dots, criticalEdges, marginAnchors } = useMemo(() => {
    // Sort to deterministic order: critical, high, medium, low
    const order = ['critical', 'high', 'medium', 'low'] as const
    const byLevel = Object.fromEntries(order.map((l) => [l, rows.find((r) => r.level === l)?.pct ?? 0])) as Record<typeof order[number], number>

    // Allocate dot counts proportional to percentages, preserving N_DOTS total
    const counts: Record<typeof order[number], number> = { critical: 0, high: 0, medium: 0, low: 0 }
    let allocated = 0
    for (const lvl of order) {
      const c = Math.round((byLevel[lvl] / 100) * N_DOTS)
      counts[lvl] = c
      allocated += c
    }
    // Adjust low to make sum exactly N_DOTS
    counts.low += N_DOTS - allocated

    // Build flat label array in critical-first order so they paint LAST (on top)
    const labels: ConstellationRiskRow['level'][] = []
    for (const lvl of order) {
      for (let i = 0; i < counts[lvl]; i++) labels.push(lvl)
    }

    // Three invisible attractors — same right-weighted geometry as ContractField
    const attractors = [
      { x: PAD_L + FIELD_W * 0.55, y: PAD_T + FIELD_H * 0.32 },
      { x: PAD_L + FIELD_W * 0.82, y: PAD_T + FIELD_H * 0.62 },
      { x: PAD_L + FIELD_W * 0.38, y: PAD_T + FIELD_H * 0.78 },
    ]

    const rng = mulberry32(31415)
    const built: DotPos[] = []

    for (let i = 0; i < N_DOTS; i++) {
      // Halton(2,3) for even-but-organic positions
      const u = halton(i + 1, 2)
      const v = halton(i + 1, 3)
      // Tiny jitter so the lattice doesn't betray itself
      const jx = (rng() - 0.5) * 4
      const jy = (rng() - 0.5) * 4
      let x = PAD_L + u * FIELD_W + jx
      let y = PAD_T + v * FIELD_H + jy

      const level = labels[i]
      let cluster = -1

      if (level === 'critical') {
        // Pull critical dots toward an attractor — same as ContractField's
        // self-organize phase. Selection is deterministic via index mod.
        cluster = i % N_ATTRACTORS
        const a = attractors[cluster]
        const ang = rng() * Math.PI * 2
        const radius = 8 + Math.pow(rng(), 1.6) * 26
        x = a.x + Math.cos(ang) * radius
        y = a.y + Math.sin(ang) * radius
      }

      // Clamp inside field
      x = Math.max(PAD_L + 2, Math.min(PAD_L + FIELD_W - 2, x))
      y = Math.max(PAD_T + 2, Math.min(PAD_T + FIELD_H - 2, y))

      built.push({ x, y, level, cluster })
    }

    // Edges: each critical dot → its 2 nearest critical neighbors in same cluster
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number; primary: boolean }> = []
    const criticals = built.filter((d) => d.level === 'critical')
    for (let i = 0; i < criticals.length; i++) {
      const a = criticals[i]
      let best1 = -1
      let best2 = -1
      let d1 = Infinity
      let d2 = Infinity
      for (let j = 0; j < criticals.length; j++) {
        if (j === i || criticals[j].cluster !== a.cluster) continue
        const b = criticals[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = dx * dx + dy * dy
        if (d < d1) { d2 = d1; best2 = best1; d1 = d; best1 = j }
        else if (d < d2) { d2 = d; best2 = j }
      }
      if (best1 >= 0) {
        const b = criticals[best1]
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, primary: true })
      }
      if (best2 >= 0) {
        const b = criticals[best2]
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, primary: false })
      }
    }

    // Pick a representative anchor dot for each level (for margin labels)
    // Use the one closest to a target y-position so leaders fan out.
    const findAnchor = (lvl: ConstellationRiskRow['level'], targetY: number): DotPos | null => {
      let best: DotPos | null = null
      let bd = Infinity
      for (const d of built) {
        if (d.level !== lvl) continue
        const score = Math.abs(d.y - targetY) + (PAD_L + FIELD_W - d.x) * 0.3
        if (score < bd) { bd = score; best = d }
      }
      return best
    }

    return {
      dots: built,
      criticalEdges: edges,
      marginAnchors: {
        critical: findAnchor('critical', PAD_T + FIELD_H * 0.32),
        high:     findAnchor('high',     PAD_T + FIELD_H * 0.55),
        low:      findAnchor('low',      PAD_T + FIELD_H * 0.82),
      },
    }
  }, [rows])

  const criticalRow = rows.find((r) => r.level === 'critical')
  const highRow = rows.find((r) => r.level === 'high')
  const lowRow = rows.find((r) => r.level === 'low')

  // Annotation positions in the right margin
  const annoX = PAD_L + FIELD_W + 24
  const annoLines = [
    { row: criticalRow, anchor: marginAnchors.critical, color: '#ef4444', label: 'critical', y: PAD_T + 12 },
    { row: highRow,     anchor: marginAnchors.high,     color: '#f59e0b', label: 'high',     y: PAD_T + FIELD_H * 0.45 },
    { row: lowRow,      anchor: marginAnchors.low,      color: '#a1a1aa', label: 'low',      y: PAD_T + FIELD_H * 0.85 },
  ]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`Constellation of ${totalContracts.toLocaleString()} contracts: critical-risk dots cluster into 3 attractors, the rest is background.`}
    >
      {/* ── Field border (hairline) ──────────────────────────────────────── */}
      <rect
        x={PAD_L - 4}
        y={PAD_T - 4}
        width={FIELD_W + 8}
        height={FIELD_H + 8}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1}
      />

      {/* ── Edges (drawn first, under the dots) ──────────────────────────── */}
      {criticalEdges.map((e, idx) => (
        <line
          key={`edge-${idx}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="#ef4444"
          strokeOpacity={e.primary ? 0.32 : 0.16}
          strokeWidth={e.primary ? 0.7 : 0.5}
        />
      ))}

      {/* ── Halos for critical dots (under the dot core) ─────────────────── */}
      {dots.map((d, idx) => {
        if (d.level !== 'critical') return null
        const s = DOT_STYLE.critical
        return (
          <circle
            key={`halo-${idx}`}
            cx={d.x}
            cy={d.y}
            r={(s.halo ?? 3) * 1.0}
            fill={s.fill}
            fillOpacity={0.10}
          />
        )
      })}

      {/* ── Dots, painted in order: low → medium → high → critical (on top) ── */}
      {(['low', 'medium', 'high', 'critical'] as const).flatMap((paintLevel) =>
        dots.map((d, idx) => {
          if (d.level !== paintLevel) return null
          const s = DOT_STYLE[d.level]
          return (
            <circle
              key={`dot-${paintLevel}-${idx}`}
              cx={d.x}
              cy={d.y}
              r={s.r}
              fill={s.fill}
              fillOpacity={s.alpha}
            />
          )
        })
      )}

      {/* ── Margin annotations: count + label, with leader to a real dot ─── */}
      {annoLines.map((a) =>
        a.anchor && a.row ? (
          <g key={`anno-${a.label}`}>
            {/* Leader from anchor dot to label */}
            <line
              x1={a.anchor.x + 4}
              y1={a.anchor.y}
              x2={annoX - 6}
              y2={a.y + 4}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            {/* Tiny color dot in margin so the eye knows what level we're labeling */}
            <circle cx={annoX - 12} cy={a.y + 4} r={2.4} fill={a.color} fillOpacity={0.95} />
            {/* Count */}
            <text
              x={annoX}
              y={a.y - 1}
              fill={a.color}
              fontSize={13}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight="bold"
              dominantBaseline="middle"
            >
              {a.row.count.toLocaleString()}
            </text>
            {/* Label */}
            <text
              x={annoX}
              y={a.y + 12}
              fill="#71717a"
              fontSize={9.5}
              fontFamily="var(--font-family-mono, monospace)"
              dominantBaseline="middle"
            >
              {a.label} · {a.row.pct.toFixed(2)}%
            </text>
          </g>
        ) : null
      )}

      {/* ── Caption strip ────────────────────────────────────────────────── */}
      <text
        x={PAD_L}
        y={SVG_H - 10}
        fill="#52525b"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
      >
        1 dot ≈ {Math.round(totalContracts / N_DOTS).toLocaleString()} contracts · critical dots collapse into 3 networks · everything else is background
      </text>
    </svg>
  )
}
