/**
 * ConcentrationConstellation — a static dot-density "sky" of contract risk,
 * with three clustering modes that re-organize the same dot population around
 * different attractor geographies:
 *
 *   PATRONES (default)  — 7 ARIA corruption pattern clusters (P1..P7)
 *   SECTORES            — 12 sector attractors in a 4×3 grid
 *   SEXENIOS            — 6 presidential periods in a horizontal timeline
 *
 * 1,200 fixed dots laid out in a Halton(2,3) sequence fill an 840x220 panel.
 * Each dot is colored by risk level in exact proportion to risk_distribution.
 * Critical dots are allocated to the active attractor set by a weighted Halton
 * draw (proportional to each cluster's T1 vendor count), then joined to their
 * nearest in-cluster neighbors with hairline edges — the architectures of
 * state capture made legible, from three different vantage points.
 *
 * Design grammar: same particle vocabulary as ContractField, but frozen.
 * Ring radius ∝ √(T1 count); ring color = cluster identity; hover exposes
 * the full cluster summary with a DotBar visualization of highRiskPct.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { halton, mulberry32 } from '@/lib/particle'

export interface ConstellationRiskRow {
  level: 'critical' | 'high' | 'medium' | 'low'
  count: number
  pct: number // 0-100
}

export type ConstellationMode = 'patterns' | 'sectors' | 'sexenios'

interface ConcentrationConstellationProps {
  rows: ConstellationRiskRow[]
  totalContracts: number
  mode?: ConstellationMode
  onClusterClick?: (clusterCode: string) => void
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

// ── Cluster metadata (shared shape across the 3 modes) ────────────────────
interface ClusterMeta {
  code: string     // e.g. 'P5', 'salud', 'amlo'
  label: string    // human-readable
  desc: string     // tooltip description
  color: string    // stroke/ring color
  vendors: number  // total vendors in the cluster
  t1: number       // T1 critical vendors (drives weight & ring radius)
  highRiskPct: number // 0..1 — rendered as DotBar in tooltip
  fx: number       // 0..1, fraction of FIELD_W
  fy: number       // 0..1, fraction of FIELD_H
  kicker?: string  // optional extra line (e.g. sexenio years)
}

// ── MODE 1: PATRONES (ARIA patterns) ──────────────────────────────────────
// 7 corruption patterns detected by ARIA v1.1. Positions hand-tuned so the
// clusters distribute across the panel without overlap.
function buildPatternMeta(isEs: boolean): ClusterMeta[] {
  return [
    // P5 — center, largest cluster (180 T1)
    { code: 'P5', label: isEs ? 'Sobreprecio Sistemático' : 'Systematic Overpricing',   desc: isEs ? 'Precios 2σ sobre promedio sectorial — 180 proveedores T1' : 'Prices 2σ above sector average — 180 T1 vendors',           color: '#dc2626', vendors: 3985,  t1: 180, highRiskPct: 0.62, fx: 0.50, fy: 0.40 },
    // P7 — upper right (56 T1)
    { code: 'P7', label: isEs ? 'Red de Contratistas' : 'Contractor Network',        desc: isEs ? 'Redes multi-proveedor con evidencia externa — 56 T1' : 'Multi-vendor networks with external evidence — 56 T1',              color: '#dc2626', vendors: 257,   t1: 56,  highRiskPct: 0.72, fx: 0.78, fy: 0.22 },
    // P1 — lower right (23 T1)
    { code: 'P1', label: isEs ? 'Monopolio Concentrado' : 'Concentrated Monopoly',      desc: isEs ? 'Proveedor domina >3% del valor sectorial — 23 T1' : 'Vendor dominates >3% of sector value — 23 T1',                 color: '#dc2626', vendors: 44,    t1: 23,  highRiskPct: 0.85, fx: 0.72, fy: 0.68 },
    // P3 — upper left (26 T1)
    { code: 'P3', label: isEs ? 'Intermediaria de Uso Único' : 'Single-Use Intermediary', desc: isEs ? 'Ráfaga de contratos + desaparición — 26 T1' : 'Burst of contracts + disappearance — 26 T1',                       color: '#f59e0b', vendors: 2974,  t1: 26,  highRiskPct: 0.44, fx: 0.22, fy: 0.28 },
    // P6 — lower left (31 T1)
    { code: 'P6', label: isEs ? 'Captura Institucional' : 'Institutional Capture',      desc: isEs ? '>80% contratos de una sola institución — 31 T1' : '>80% of contracts from a single institution — 31 T1',                   color: '#78716c', vendors: 15923, t1: 31,  highRiskPct: 0.28, fx: 0.28, fy: 0.72 },
    // P2 — lower center (1 T1)
    { code: 'P2', label: isEs ? 'Empresa Fantasma' : 'Ghost Company',           desc: isEs ? 'Sin RFC, ≤10 contratos, desaparece — 1 T1' : 'No RFC, ≤10 contracts, disappears — 1 T1',                        color: '#57534e', vendors: 6034,  t1: 1,   highRiskPct: 0.12, fx: 0.55, fy: 0.78 },
    // P4 — top center (3 T1)
    { code: 'P4', label: isEs ? 'Colusión en Licitaciones' : 'Bid Collusion',   desc: isEs ? 'Co-licitación >50% + tasa de victoria >70% — 3 T1' : 'Co-bidding >50% + win rate >70% — 3 T1',               color: '#f59e0b', vendors: 220,   t1: 3,   highRiskPct: 0.35, fx: 0.42, fy: 0.14 },
  ]
}

// ── MODE 2: SECTORES (12 sectors in a 4×3 grid) ──────────────────────────
// Grid positions (row, col): 4 columns × 3 rows. Values are fraction of
// FIELD_W × FIELD_H. Attractor radii driven by sqrt(t1) as in PATRONES.
function buildSectorMeta(isEs: boolean): ClusterMeta[] {
  return [
    // Row 0 (top)
    { code: 'salud',           label: isEs ? 'Salud' : 'Health',           desc: isEs ? 'IMSS, ISSSTE, SSa — mayor concentración de casos documentados' : 'IMSS, ISSSTE, SSa — highest concentration of documented cases',  color: '#dc2626', vendors: 32000,  t1: 89, highRiskPct: 0.18, fx: 0.15, fy: 0.22 },
    { code: 'educacion',       label: isEs ? 'Educación' : 'Education',       desc: isEs ? 'SEP, SEMS, becas, infraestructura educativa' : 'SEP, SEMS, scholarships, educational infrastructure',                     color: '#3b82f6', vendors: 28000,  t1: 34, highRiskPct: 0.11, fx: 0.38, fy: 0.22 },
    { code: 'infraestructura', label: isEs ? 'Infraestructura' : 'Infrastructure', desc: isEs ? 'SCT, obra pública — fraude ejecución invisible a este modelo' : 'SCT, public works — execution fraud invisible to this model',   color: '#ea580c', vendors: 24000,  t1: 67, highRiskPct: 0.14, fx: 0.62, fy: 0.22 },
    { code: 'energia',         label: isEs ? 'Energía' : 'Energy',         desc: isEs ? 'PEMEX, CFE — estructura monopólica, vendedores certificados' : 'PEMEX, CFE — monopolistic structure, certified vendors',    color: '#eab308', vendors: 12000,  t1: 44, highRiskPct: 0.16, fx: 0.85, fy: 0.22 },
    // Row 1 (middle)
    { code: 'defensa',         label: isEs ? 'Defensa' : 'Defense',         desc: isEs ? 'SEDENA, SEMAR — datos limitados por seguridad nacional' : 'SEDENA, SEMAR — data limited by national security',          color: '#1e3a5f', vendors: 3400,   t1:  8, highRiskPct: 0.09, fx: 0.15, fy: 0.50 },
    { code: 'tecnologia',      label: isEs ? 'Tecnología' : 'Technology',      desc: isEs ? 'Monopolios IT (Toka, Mainbit) — riesgo alto en pocos proveedores' : 'IT monopolies (Toka, Mainbit) — high risk in few vendors', color: '#8b5cf6', vendors: 18000,  t1: 29, highRiskPct: 0.13, fx: 0.38, fy: 0.50 },
    { code: 'hacienda',        label: isEs ? 'Hacienda' : 'Finance',        desc: isEs ? 'SAT, Tesorería — licitaciones amañadas documentadas' : 'SAT, Treasury — documented rigged tenders',             color: '#16a34a', vendors: 9000,   t1: 21, highRiskPct: 0.10, fx: 0.62, fy: 0.50 },
    { code: 'gobernacion',     label: isEs ? 'Gobernación' : 'Interior',     desc: isEs ? 'Estafa Maestra originó aquí — empresas fantasma multi-instituc.' : 'Estafa Maestra originated here — multi-institution ghost companies', color: '#be123c', vendors: 15000,  t1: 48, highRiskPct: 0.15, fx: 0.85, fy: 0.50 },
    // Row 2 (bottom)
    { code: 'agricultura',     label: isEs ? 'Agricultura' : 'Agriculture',     desc: isEs ? 'Segalmex, LICONSA — fraude ~15.8B MXN confirmado' : 'Segalmex, LICONSA — ~15.8B MXN fraud confirmed',                color: '#22c55e', vendors: 7000,   t1: 19, highRiskPct: 0.12, fx: 0.15, fy: 0.78 },
    { code: 'ambiente',        label: isEs ? 'Ambiente' : 'Environment',        desc: isEs ? 'CONAGUA — red rotativa de contratistas ghost' : 'CONAGUA — rotating network of ghost contractors',                    color: '#10b981', vendors: 5000,   t1: 11, highRiskPct: 0.08, fx: 0.38, fy: 0.78 },
    { code: 'trabajo',         label: isEs ? 'Trabajo' : 'Labor',         desc: isEs ? 'ISSSTE ambulancias — sobreprecio en arrendamiento' : 'ISSSTE ambulances — overpricing in leasing',               color: '#f97316', vendors: 4000,   t1: 14, highRiskPct: 0.09, fx: 0.62, fy: 0.78 },
    { code: 'otros',           label: isEs ? 'Otros' : 'Other',           desc: isEs ? 'Miscelánea federal — mayor volumen, menor riesgo promedio' : 'Federal miscellaneous — higher volume, lower average risk',       color: '#64748b', vendors: 160000, t1: 35, highRiskPct: 0.07, fx: 0.85, fy: 0.78 },
  ]
}

// ── MODE 3: SEXENIOS (6 presidential periods as timeline) ────────────────
// Arranged chronologically left-to-right, Y centered at 0.50. AMLO cluster
// is visibly larger (more vendors, higher risk) — crimson.
function buildSexenioMeta(isEs: boolean): ClusterMeta[] {
  return [
    { code: 'zedillo',   label: 'Zedillo',    desc: isEs ? 'Datos pre-COMPRANET muy limitados (cobertura estructura A)' : 'Pre-COMPRANET data very limited (structure A coverage)',                 color: '#64748b', vendors: 15000,  t1:  6, highRiskPct: 0.06, fx: 0.08, fy: 0.50, kicker: '1994–2000' },
    { code: 'fox',       label: 'Fox',        desc: isEs ? 'Primera alternancia — datos estructura A, RFC <1%' : 'First political transition — structure A data, RFC <1%',                          color: '#16a34a', vendors: 25000,  t1: 12, highRiskPct: 0.07, fx: 0.22, fy: 0.50, kicker: '2000–2006' },
    { code: 'calderon',  label: 'Calderón',   desc: isEs ? 'Guerra contra narco — contratos SEDENA/SEMAR escalan' : 'Drug war — SEDENA/SEMAR contracts escalate',                       color: '#3b82f6', vendors: 40000,  t1: 24, highRiskPct: 0.08, fx: 0.38, fy: 0.50, kicker: '2006–2012' },
    { code: 'pena',      label: 'Peña Nieto', desc: isEs ? 'Estafa Maestra, Odebrecht, Grupo Higa — era dorada de empresas fantasma' : 'Estafa Maestra, Odebrecht, Grupo Higa — golden age of ghost companies',    color: '#ea580c', vendors: 65000,  t1: 58, highRiskPct: 0.12, fx: 0.55, fy: 0.50, kicker: '2012–2018' },
    { code: 'amlo',      label: 'AMLO',       desc: isEs ? 'Segalmex, Tren Maya, COVID — mayor volumen y mayor concentración T1' : 'Segalmex, Tren Maya, COVID — higher volume and higher T1 concentration',        color: '#dc2626', vendors: 120000, t1: 148, highRiskPct: 0.18, fx: 0.72, fy: 0.50, kicker: '2018–2024' },
    { code: 'sheinbaum', label: 'Sheinbaum',  desc: isEs ? 'Año 1 — señales tempranas de continuidad en adjudicaciones directas' : 'Year 1 — early signs of continuity in direct awards',        color: '#be123c', vendors: 28000,  t1: 72, highRiskPct: 0.15, fx: 0.90, fy: 0.50, kicker: '2024–' },
  ]
}

// Meta label shown in tooltip kicker and caption
function buildModeKickers(isEs: boolean): Record<ConstellationMode, { short: string; caption: string }> {
  return {
    patterns: { short: isEs ? 'PATRÓN' : 'PATTERN',  caption: isEs ? '7 patrones ARIA (P1–P7) · click para abrir tipología' : '7 ARIA patterns (P1–P7) · click to open typology' },
    sectors:  { short: isEs ? 'SECTOR' : 'SECTOR',  caption: isEs ? '12 sectores federales · click para abrir sector' : '12 federal sectors · click to open sector' },
    sexenios: { short: isEs ? 'SEXENIO' : 'TERM', caption: isEs ? '6 periodos presidenciales · click para abrir sexenio' : '6 presidential terms · click to open term' },
  }
}

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
  cluster: number // -1 for non-critical, else 0..nClusters-1
}

// ── DotBar — small inline dot-style bar chart (0..1 → filled/empty dots) ──
function DotBar({ value, color, dots = 20, size = 5, gap = 2 }: {
  value: number
  color: string
  dots?: number
  size?: number
  gap?: number
}) {
  const filled = Math.round(value * dots)
  const w = dots * (size + gap) - gap
  return (
    <svg width={w} height={size} style={{ display: 'block' }}>
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={i * (size + gap) + size / 2}
          cy={size / 2}
          r={size / 2}
          fill={i < filled ? color : '#2d2926'}
        />
      ))}
    </svg>
  )
}

export function ConcentrationConstellation({
  rows,
  totalContracts,
  mode = 'patterns',
  onClusterClick,
  className,
}: ConcentrationConstellationProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language === 'es'
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null)

  // Pick the active meta array for the current mode
  const activeMeta: ClusterMeta[] = useMemo(() => {
    if (mode === 'sectors')  return buildSectorMeta(isEs)
    if (mode === 'sexenios') return buildSexenioMeta(isEs)
    return buildPatternMeta(isEs)
  }, [mode, isEs])

  const MODE_KICKERS = useMemo(() => buildModeKickers(isEs), [isEs])

  const { dots, criticalEdges, marginAnchors, attractors } = useMemo(() => {
    // Reset hover when mode changes — avoid stale index referencing old meta
    // (setState inside useMemo would be a bug; we instead cap hoveredCluster
    //  at paint time).

    const nClusters = activeMeta.length

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

    // Attractors: resolve fractional coords into pixel positions
    const attractors = activeMeta.map((m) => ({
      x: PAD_L + m.fx * FIELD_W,
      y: PAD_T + m.fy * FIELD_H,
    }))

    // Cluster weights ∝ T1 count (critical attribution follows risk mass)
    const totalT1 = activeMeta.reduce((s, m) => s + m.t1, 0) || 1
    const weights = activeMeta.map((m) => m.t1 / totalT1)
    const cumWeights: number[] = []
    for (let i = 0; i < weights.length; i++) {
      cumWeights.push((cumWeights[i - 1] ?? 0) + weights[i])
    }
    cumWeights[cumWeights.length - 1] = 1

    // Seed varies by mode so dot positions change when user toggles — the
    // panel feels alive and re-organizing rather than frozen.
    const seed = mode === 'sectors' ? 27182 : mode === 'sexenios' ? 16180 : 31415
    const rng = mulberry32(seed)
    const built: DotPos[] = []

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
        // Weighted assignment via fresh Halton base-5 so cluster distribution
        // tracks T1 counts, not i-modulo.
        const uCluster = halton(criticalIdx * 7 + 1, 5)
        let picked = cumWeights.findIndex((cw) => uCluster < cw)
        if (picked === -1) picked = nClusters - 1
        cluster = picked
        criticalIdx++

        const a = attractors[cluster]
        const ang = rng() * Math.PI * 2
        // In sexenios mode, slightly tighten the clusters so 6 nodes read
        // as a row, not a loose cloud.
        const rMax = mode === 'sexenios' ? 16 : 22
        const radius = 6 + Math.pow(rng(), 1.6) * rMax
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

    // Pick representative anchor dots for margin labels (always same cluster[0])
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
  }, [rows, activeMeta, mode])

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

  // Guard hovered index against mode changes (stale high index after toggle)
  const safeHover =
    hoveredCluster !== null && hoveredCluster < activeMeta.length ? hoveredCluster : null

  const kickerLabel = MODE_KICKERS[mode]
  const modeAriaHint = mode === 'sectors'
    ? 'Critical-risk dots cluster into 12 federal sectors arranged in a grid.'
    : mode === 'sexenios'
      ? 'Critical-risk dots cluster into 6 presidential periods arranged chronologically.'
      : 'Critical-risk dots cluster into 7 ARIA corruption patterns (P1–P7).'

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className={className}
        role="img"
        aria-label={`Constellation of ${totalContracts.toLocaleString()} contracts. ${modeAriaHint} Hover or click a cluster to open its page.`}
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

        {/* ── Sexenios timeline baseline (subtle spine under attractors) ──── */}
        {mode === 'sexenios' && (
          <line
            x1={PAD_L + FIELD_W * 0.04}
            y1={PAD_T + FIELD_H * 0.50}
            x2={PAD_L + FIELD_W * 0.96}
            y2={PAD_T + FIELD_H * 0.50}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        )}

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
          const isHovered = safeHover === idx
          const meta = activeMeta[idx]
          // Ring radius ∝ √T1 so high-t1 nodes read larger.
          // Floor at 4 so small clusters remain visible; cap at 16.
          const ringR = Math.max(4, Math.min(16, Math.sqrt(meta.t1)))
          // Short label inside/above the ring. For patrones it's the code
          // ("P5"); for sectores/sexenios use first 3 chars of the label.
          const shortLabel =
            mode === 'patterns' ? meta.code : meta.label.slice(0, 3).toUpperCase()
          return (
            <g key={`attractor-${meta.code}-${idx}`}>
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

              {/* Cluster label */}
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
                {shortLabel}
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
                aria-label={onClusterClick ? `${meta.label}. ${meta.desc}. Open page.` : undefined}
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
          1 dot ≈ {Math.round(totalContracts / N_DOTS).toLocaleString()} {isEs ? 'contratos' : 'contracts'} · {kickerLabel.caption}
        </text>
      </svg>

      {/* ── Floating cluster tooltip (DOM, positioned over SVG) ──────────── */}
      {safeHover !== null && (() => {
        const meta = activeMeta[safeHover]
        // Convert attractor frac to CSS percent of wrapping div
        const topPct = ((PAD_T + meta.fy * FIELD_H) / SVG_H) * 100
        const leftPct = ((PAD_L + meta.fx * FIELD_W) / SVG_W) * 100
        // On the far-right column, flip tooltip to the left so it doesn't
        // clip off the edge of the card.
        const flipLeft = meta.fx > 0.80
        const transform = flipLeft
          ? 'translate(-90%, -130%)'
          : meta.fx < 0.15
            ? 'translate(-10%, -130%)'
            : 'translate(-50%, -130%)'
        return (
          <div
            className="absolute z-10 pointer-events-none rounded-md border border-stone-700 bg-stone-900/95 backdrop-blur-sm p-2.5 shadow-xl"
            style={{
              top: `${topPct}%`,
              left: `${leftPct}%`,
              transform,
              minWidth: '200px',
              maxWidth: '280px',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-bold tracking-[0.15em]"
                style={{ color: meta.color }}
              >
                {mode === 'patterns' ? `${meta.code} · ${kickerLabel.short}` : kickerLabel.short}
              </span>
              <span className="h-1 flex-1 rounded-full" style={{ backgroundColor: `${meta.color}44` }} />
            </div>
            <div className="text-sm font-bold text-stone-100 mb-0.5">
              {meta.label}
              {meta.kicker && (
                <span className="ml-1.5 text-[10px] font-mono text-stone-500">{meta.kicker}</span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 leading-snug mb-1.5">
              {meta.desc}
            </div>
            {/* DotBar — highRiskPct visualized as filled dots */}
            <div className="mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500">
                  {isEs ? 'Alto + crítico' : 'High + critical'}
                </span>
                <span className="text-[10px] font-mono font-bold" style={{ color: meta.color }}>
                  {(meta.highRiskPct * 100).toFixed(1)}%
                </span>
              </div>
              <DotBar value={meta.highRiskPct} color={meta.color} />
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500 mb-1">
              <span>{meta.vendors.toLocaleString()} {isEs ? 'proveedores' : 'vendors'}</span>
              <span className="text-stone-600">·</span>
              <span style={{ color: meta.color }}>{meta.t1} T1</span>
            </div>
            {onClusterClick && (
              <div className="text-[10px] font-mono text-amber-400 tracking-wider uppercase">
                {isEs ? '→ Ver detalle' : '→ View detail'}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
