/**
 * ConcentrationConstellation — a static dot-density "sky" of contract risk,
 * now labelled with the 7 ARIA corruption pattern clusters (P1..P7).
 *
 * 1,200 fixed dots laid out in a Halton(2,3) sequence fill an 840x220 panel.
 * Each dot is colored by risk level in exact proportion to risk_distribution.
 * Critical dots are allocated to the 7 ARIA attractors by a weighted Halton
 * draw (proportional to each pattern's T1 vendor count), then joined to their
 * nearest in-cluster neighbors with hairline edges — the 7 architectures of
 * state capture made legible.
 *
 * Design grammar: same particle vocabulary as ContractField, but frozen.
 * Ring radius ∝ √(T1 count); ring color = pattern severity; hover exposes
 * the full pattern summary with "Ver en ARIA" affordance.
 *
 * Interactivity: clicking a cluster calls onClusterClick(patternCode), e.g.
 *   onClusterClick={(code) => navigate(`/clusters#${code.toLowerCase()}`)}
 */
import { useMemo, useState } from 'react'
import { halton, mulberry32 } from '@/lib/particle'

export interface ConstellationRiskRow {
  level: 'critical' | 'high' | 'medium' | 'low'
  count: number
  pct: number // 0-100
}

interface ConcentrationConstellationProps {
  rows: ConstellationRiskRow[]
  totalContracts: number
  onClusterClick?: (patternCode: string) => void
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
const N_ATTRACTORS = 7

// ── ARIA Pattern cluster metadata ─────────────────────────────────────────
// 7 corruption patterns detected by ARIA v1.1. Positions are fractions of
// FIELD_W × FIELD_H, hand-tuned so the 7 clusters distribute across the
// panel without overlap and avoid the right-margin annotation strip.
interface ClusterMeta {
  code: string     // 'P1' .. 'P7'
  label: string
  desc: string
  color: string
  vendors: number  // total vendors in the pattern
  t1: number       // T1 critical vendors
  fx: number       // 0..1, fraction of FIELD_W
  fy: number       // 0..1, fraction of FIELD_H
}

const CLUSTER_META: ClusterMeta[] = [
  // P5 — center, largest cluster (180 T1)
  { code: 'P5', label: 'Sobreprecio Sistemático',   desc: 'Precios 2σ sobre promedio sectorial — 180 proveedores T1',           color: '#dc2626', vendors: 3985,  t1: 180, fx: 0.50, fy: 0.40 },
  // P7 — upper right (56 T1)
  { code: 'P7', label: 'Red de Contratistas',        desc: 'Redes multi-proveedor con evidencia externa — 56 T1',              color: '#dc2626', vendors: 257,   t1: 56,  fx: 0.78, fy: 0.22 },
  // P1 — lower right (23 T1)
  { code: 'P1', label: 'Monopolio Concentrado',      desc: 'Proveedor domina >3% del valor sectorial — 23 T1',                 color: '#dc2626', vendors: 44,    t1: 23,  fx: 0.72, fy: 0.68 },
  // P3 — upper left (26 T1)
  { code: 'P3', label: 'Intermediaria de Uso Único', desc: 'Ráfaga de contratos + desaparición — 26 T1',                       color: '#f59e0b', vendors: 2974,  t1: 26,  fx: 0.22, fy: 0.28 },
  // P6 — lower left (31 T1)
  { code: 'P6', label: 'Captura Institucional',      desc: '>80% contratos de una sola institución — 31 T1',                   color: '#78716c', vendors: 15923, t1: 31,  fx: 0.28, fy: 0.72 },
  // P2 — lower center (1 T1)
  { code: 'P2', label: 'Empresa Fantasma',           desc: 'Sin RFC, ≤10 contratos, desaparece — 1 T1',                        color: '#57534e', vendors: 6034,  t1: 1,   fx: 0.55, fy: 0.78 },
  // P4 — top center (3 T1)
  { code: 'P4', label: 'Colusión en Licitaciones',   desc: 'Co-licitación >50% + tasa de victoria >70% — 3 T1',               color: '#f59e0b', vendors: 220,   t1: 3,   fx: 0.42, fy: 0.14 },
]

// Weighted allocation of critical dots to clusters (∝ T1 count).
// Totals: P5=180, P7=56, P6=31, P3=26, P1=23, P4=3, P2=1 → 320
// Order MUST match CLUSTER_META order above.
const CLUSTER_WEIGHTS = [
  180 / 320, // P5
   56 / 320, // P7
   23 / 320, // P1
   26 / 320, // P3
   31 / 320, // P6
    1 / 320, // P2
    3 / 320, // P4
]

// Risk visual styling (mirrors ContractField + RiskStrata)
const DOT_STYLE: Record<ConstellationRiskRow['level'], { r: number; fill: string; alpha: number; halo?: number }> = {
  critical: { r: 1.8, fill: '#ef4444', alpha: 0.95, halo: 3.6 },
  high:     { r: 1.3, fill: '#f59e0b', alpha: 0.78 },
  medium:   { r: 0.95, fill: '#a16207', alpha: 0.55 },
  low:      { r: 0.6,  fill: '#71717a', alpha: 0.42 },
}

interface DotPos {
  x: number
  y: number
  level: ConstellationRiskRow['level']
  cluster: number // -1 for non-critical, else 0..N_ATTRACTORS-1
}

export function ConcentrationConstellation({ rows, totalContracts, onClusterClick, className }: ConcentrationConstellationProps) {
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null)

  const { dots, criticalEdges, marginAnchors, attractors } = useMemo(() => {
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

    // 7 attractors laid out across the field, coords pre-resolved from fx/fy
    const attractors = CLUSTER_META.map((m) => ({
      x: PAD_L + m.fx * FIELD_W,
      y: PAD_T + m.fy * FIELD_H,
    }))

    // Cumulative weights for weighted Halton draw on critical dots
    const cumWeights: number[] = []
    for (let i = 0; i < CLUSTER_WEIGHTS.length; i++) {
      cumWeights.push((cumWeights[i - 1] ?? 0) + CLUSTER_WEIGHTS[i])
    }
    // Ensure final bucket captures numeric slop
    cumWeights[cumWeights.length - 1] = 1

    const rng = mulberry32(31415)
    const built: DotPos[] = []

    // Track critical dot index so we can draw a deterministic Halton value per
    // critical dot (independent of absolute index i).
    let criticalIdx = 0

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
        // Weighted assignment via a fresh Halton base-5 sequence so cluster
        // distribution tracks T1 counts (180/56/31/26/23/3/1), not i-modulo.
        const uCluster = halton(criticalIdx * 7 + 1, 5)
        let picked = cumWeights.findIndex((cw) => uCluster < cw)
        if (picked === -1) picked = N_ATTRACTORS - 1
        cluster = picked
        criticalIdx++

        const a = attractors[cluster]
        const ang = rng() * Math.PI * 2
        const radius = 6 + Math.pow(rng(), 1.6) * 22
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

    // Pick a representative anchor dot for each level (for margin labels).
    // Critical leader points to cluster 0 (P5) specifically, per spec.
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
    const findCriticalAnchorInCluster = (clusterIdx: number): DotPos | null => {
      const a = attractors[clusterIdx]
      let best: DotPos | null = null
      let bd = Infinity
      for (const d of built) {
        if (d.level !== 'critical' || d.cluster !== clusterIdx) continue
        const dx = d.x - a.x
        const dy = d.y - a.y
        const d2 = dx * dx + dy * dy
        if (d2 < bd) { bd = d2; best = d }
      }
      return best
    }

    return {
      dots: built,
      criticalEdges: edges,
      attractors,
      marginAnchors: {
        critical: findCriticalAnchorInCluster(0) ?? findAnchor('critical', PAD_T + FIELD_H * 0.40),
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
    <div className="relative">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className={className}
        role="img"
        aria-label={`Constellation of ${totalContracts.toLocaleString()} contracts: critical-risk dots cluster into 7 ARIA corruption patterns (P1–P7). Hover or click a cluster to open its pattern page.`}
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

        {/* ── Attractor rings, labels, hit targets (above dots) ───────────── */}
        {attractors.map((a, idx) => {
          const isHovered = hoveredCluster === idx
          const meta = CLUSTER_META[idx]
          // Ring radius ∝ √T1 so P5(180) reads largest, P2(1) smallest.
          // Floor at 4 so P2/P4 remain visible; cap at 16 so P5 doesn't dominate.
          const ringR = Math.max(4, Math.min(16, Math.sqrt(meta.t1)))
          return (
            <g key={`attractor-${idx}`}>
              {/* Outer ring — radius ∝ √T1 count */}
              <circle
                cx={a.x}
                cy={a.y}
                r={ringR}
                fill="none"
                stroke={meta.color}
                strokeOpacity={isHovered ? 0.75 : 0.30}
                strokeWidth={1}
                style={{ transition: 'stroke-opacity 160ms ease' }}
              />

              {/* Pattern code label (e.g. "P5") */}
              <text
                x={a.x}
                y={a.y + ringR + 8}
                fill={meta.color}
                fillOpacity={isHovered ? 1 : 0.80}
                fontSize={7}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ transition: 'fill-opacity 160ms ease' }}
              >
                {meta.code}
              </text>

              {/* Transparent hit target — larger than visible ring */}
              <circle
                cx={a.x}
                cy={a.y}
                r={Math.max(18, ringR + 10)}
                fill="transparent"
                style={{ cursor: onClusterClick ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoveredCluster(idx)}
                onMouseLeave={() => setHoveredCluster(null)}
                onFocus={() => setHoveredCluster(idx)}
                onBlur={() => setHoveredCluster(null)}
                onClick={() => onClusterClick?.(meta.code)}
                tabIndex={onClusterClick ? 0 : -1}
                role={onClusterClick ? 'button' : undefined}
                aria-label={onClusterClick ? `Pattern ${meta.code}: ${meta.label}. ${meta.desc}. Open pattern page.` : undefined}
              />
            </g>
          )
        })}

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
          1 dot ≈ {Math.round(totalContracts / N_DOTS).toLocaleString()} contratos · 7 patrones ARIA (P1–P7) · click para abrir tipología
        </text>
      </svg>

      {/* ── Floating cluster tooltip (DOM, positioned over SVG) ──────────── */}
      {hoveredCluster !== null && (() => {
        const meta = CLUSTER_META[hoveredCluster]
        // Convert attractor frac to CSS percent of wrapping div
        const topPct = ((PAD_T + meta.fy * FIELD_H) / SVG_H) * 100
        const leftPct = ((PAD_L + meta.fx * FIELD_W) / SVG_W) * 100
        return (
          <div
            className="absolute z-10 pointer-events-none rounded-md border border-stone-700 bg-stone-900/95 backdrop-blur-sm p-2.5 shadow-xl"
            style={{
              top: `${topPct}%`,
              left: `${leftPct}%`,
              transform: 'translate(-50%, -130%)',
              minWidth: '200px',
              maxWidth: '260px',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-bold tracking-[0.15em]"
                style={{ color: meta.color }}
              >
                {meta.code} · PATRÓN
              </span>
              <span className="h-1 flex-1 rounded-full" style={{ backgroundColor: `${meta.color}44` }} />
            </div>
            <div className="text-sm font-bold text-stone-100 mb-0.5">
              {meta.label}
            </div>
            <div className="text-[11px] text-stone-400 leading-snug mb-1.5">
              {meta.desc}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500 mb-1">
              <span>{meta.vendors.toLocaleString()} proveedores</span>
              <span className="text-stone-600">·</span>
              <span style={{ color: meta.color }}>{meta.t1} T1</span>
            </div>
            {onClusterClick && (
              <div className="text-[10px] font-mono text-amber-400 tracking-wider uppercase">
                → Ver tipología
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
