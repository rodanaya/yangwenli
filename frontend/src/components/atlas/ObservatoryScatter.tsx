/**
 * ObservatoryScatter — "The Firmament": the faithful Observatory macro view
 * rendered as an engraved astronomical plate.
 *
 * The faithful encoding (every channel carries real data) is unchanged:
 *   • x  = scale (vendor count, log)        → how much of the market
 *   • y  = high-risk rate (highRiskPct)      → how dirty
 *   • r  = Tier-1 priority leads (t1)        → how many actionable targets
 *   • hue = risk ramp on the high-risk rate  → redder = hotter
 *
 * The 2026-05-31 redesign (DESIGNUS) wraps that honest geometry in a dark
 * celestial plate so it reads as the firmament it claims to be — recapturing
 * the constellation's spectacle WITHOUT the constellation's lie (its position
 * and size encoded nothing). Each cluster is a luminous body with a risk-keyed
 * corona; a starfield + graticule give depth; faint constellation lines trace
 * between bodies (star-chart decoration, not a data claim); bodies ignite on
 * load. Labels are placed by a greedy collision-avoider with leader lines —
 * no text ever overlaps text.
 *
 * Accessibility: each body is a focusable, keyboard-activatable group with an
 * aria-label — unlike the canvas constellation, which was invisible to AT.
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { riskRamp, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import { halton } from '@/lib/particle'

export interface ScatterCluster {
  code: string
  label: string
  vendors: number
  t1: number
  highRiskPct: number
}

interface Props {
  clusters: ScatterCluster[]
  lang: 'en' | 'es'
  onClusterClick: (code: string) => void
}

// ── Plate geometry ──────────────────────────────────────────────────────────
const W = 1180
const H = 600
const M = { top: 60, right: 96, bottom: 78, left: 96 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom
const PAD_X = 0.075
const PAD_Y = 0.12

// ── Plate palette (deep warm near-black — an engraved night-sky plate) ───────
const PLATE = {
  bg0: '#0d0b09',        // outermost
  bg1: '#171310',        // centre glow
  grid: 'rgba(214,205,191,0.10)',
  gridStrong: 'rgba(214,205,191,0.16)',
  star: 'rgba(232,224,210,0.55)',
  ink: '#ece6da',        // primary label
  inkMuted: '#9a9082',   // stat / axis label
  inkFaint: '#6b6357',
  link: 'rgba(214,205,191,0.13)',
}

// Starfield — deterministic Halton(2,3) specks in plot space.
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: halton(i + 7, 2),
  y: halton(i + 7, 3),
  r: 0.3 + halton(i + 7, 5) * 0.9,
  a: 0.18 + halton(i + 7, 7) * 0.5,
}))

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

type Box = { x: number; y: number; w: number; h: number }
function intersects(a: Box, b: Box, pad = 2): boolean {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y)
}

export function ObservatoryScatter({ clusters, lang, onClusterClick }: Props) {
  const scales = useMemo(() => {
    if (clusters.length === 0) return { minLogV: 0, maxLogV: 1, maxHr: 1, maxT1: 1 }
    const logV = clusters.map((c) => Math.log10(Math.max(1, c.vendors)))
    return {
      minLogV: Math.min(...logV),
      maxLogV: Math.max(...logV),
      maxHr: Math.max(...clusters.map((c) => c.highRiskPct)) * 1.15,
      maxT1: Math.max(...clusters.map((c) => Math.max(1, c.t1))),
    }
  }, [clusters])

  const xFor = (vendors: number) => {
    const lv = Math.log10(Math.max(1, vendors))
    const t = scales.maxLogV === scales.minLogV ? 0.5 : (lv - scales.minLogV) / (scales.maxLogV - scales.minLogV)
    return M.left + (PAD_X + t * (1 - 2 * PAD_X)) * PLOT_W
  }
  const yFor = (hr: number) => {
    const t = scales.maxHr === 0 ? 0 : hr / scales.maxHr
    return M.top + (1 - (PAD_Y + t * (1 - 2 * PAD_Y))) * PLOT_H
  }
  const rFor = (t1: number) => 11 + (Math.sqrt(Math.max(1, t1)) / Math.sqrt(scales.maxT1)) * 34

  // Bodies, importance-sorted (criticality then scale) — drives draw order,
  // ignition stagger and label-placement priority.
  const bodies = useMemo(() => {
    return [...clusters]
      .map((c) => {
        const cx = xFor(c.vendors)
        const cy = yFor(c.highRiskPct)
        const r = rFor(c.t1)
        const fill = riskRamp(c.highRiskPct)
        const level = getRiskLevelFromScore(c.highRiskPct)
        const importance = c.highRiskPct * 0.7 + (Math.sqrt(c.t1) / Math.sqrt(scales.maxT1)) * 0.3
        return { ...c, cx, cy, r, fill, level, importance }
      })
      .sort((a, b) => b.importance - a.importance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, scales])

  // Constellation links — Prim's MST over body centres (star-chart decoration).
  const links = useMemo(() => {
    if (bodies.length < 2) return [] as Array<{ x1: number; y1: number; x2: number; y2: number }>
    const n = bodies.length
    const inTree = new Array(n).fill(false)
    const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    inTree[0] = true
    for (let k = 1; k < n; k++) {
      let best = -1, bestJ = -1, bestD = Infinity
      for (let i = 0; i < n; i++) {
        if (!inTree[i]) continue
        for (let j = 0; j < n; j++) {
          if (inTree[j]) continue
          const d = (bodies[i].cx - bodies[j].cx) ** 2 + (bodies[i].cy - bodies[j].cy) ** 2
          if (d < bestD) { bestD = d; best = i; bestJ = j }
        }
      }
      if (bestJ === -1) break
      inTree[bestJ] = true
      out.push({ x1: bodies[best].cx, y1: bodies[best].cy, x2: bodies[bestJ].cx, y2: bodies[bestJ].cy })
    }
    return out
  }, [bodies])

  // Greedy collision-free label placement — biggest/hottest first.
  const labels = useMemo(() => {
    const placed: Box[] = bodies.map((b) => ({ x: b.cx - b.r, y: b.cy - b.r, w: b.r * 2, h: b.r * 2 }))
    const out: Array<{ code: string; bx: number; by: number; tx: number; ty: number; anchor: 'start' | 'middle' | 'end'; w: number; h: number; leader: boolean; name: string; stat: string; fill: string; level: string }> = []
    for (const b of bodies) {
      const name = toTitleCase(b.label)
      const pct = Math.round(b.highRiskPct * 100)
      const stat = `${formatNumber(b.vendors)} ${lang === 'es' ? 'prov' : 'vend'} · ${b.t1} T1 · ${pct}%`
      const w = Math.max(name.length * 6.6, stat.length * 5.0) + 6
      const h = 24
      // candidate anchor points (label box top-left), preference-ordered
      const g = 7
      const cands: Array<{ x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = [
        { x: b.cx - w / 2, y: b.cy - b.r - g - h, anchor: 'middle' },
        { x: b.cx - w / 2, y: b.cy + b.r + g, anchor: 'middle' },
        { x: b.cx + b.r + g, y: b.cy - h / 2, anchor: 'start' },
        { x: b.cx - b.r - g - w, y: b.cy - h / 2, anchor: 'end' },
        { x: b.cx - w / 2, y: b.cy - b.r - g - h - 20, anchor: 'middle' },
        { x: b.cx - w / 2, y: b.cy + b.r + g + 20, anchor: 'middle' },
        { x: b.cx + b.r + g + 14, y: b.cy - h / 2 - 16, anchor: 'start' },
        { x: b.cx - b.r - g - w - 14, y: b.cy - h / 2 - 16, anchor: 'end' },
      ]
      let chosen = cands[0]
      for (const c of cands) {
        const box = { x: c.x, y: c.y, w, h }
        if (box.x < M.left - 80 || box.x + box.w > W - 8 || box.y < M.top - 24 || box.y + box.h > H - M.bottom + 30) continue
        if (placed.some((p) => intersects(box, p))) continue
        chosen = c
        break
      }
      placed.push({ x: chosen.x, y: chosen.y, w, h })
      // text x by anchor
      const tx = chosen.anchor === 'middle' ? chosen.x + w / 2 : chosen.anchor === 'start' ? chosen.x + 3 : chosen.x + w - 3
      const labelCx = chosen.x + w / 2
      const labelCy = chosen.y + h / 2
      const leader = Math.hypot(labelCx - b.cx, labelCy - b.cy) > b.r + 24
      out.push({ code: b.code, bx: b.cx, by: b.cy, tx, ty: chosen.y, anchor: chosen.anchor, w, h, leader, name, stat, fill: b.fill, level: b.level })
    }
    return out
  }, [bodies, lang])

  const xTicks = useMemo(() => {
    const t: number[] = []
    for (let p = Math.floor(scales.minLogV); p <= Math.ceil(scales.maxLogV); p++) t.push(10 ** p)
    return t
  }, [scales])
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8].filter((v) => v <= scales.maxHr)

  return (
    <div style={{ position: 'relative', borderRadius: 5, overflow: 'hidden', boxShadow: '0 1px 0 rgba(255,255,255,0.5), 0 18px 40px -22px rgba(20,16,12,0.55)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={lang === 'es' ? 'Carta celeste de patrones por escala y riesgo' : 'Celestial chart of patterns by scale and risk'}>
        <defs>
          <radialGradient id="obs-plate" cx="46%" cy="38%" r="80%">
            <stop offset="0%" stopColor={PLATE.bg1} />
            <stop offset="100%" stopColor={PLATE.bg0} />
          </radialGradient>
          <radialGradient id="obs-danger" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </radialGradient>
          {bodies.map((b) => (
            <radialGradient key={`g-${b.code}`} id={`obs-body-${b.code}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={b.fill} stopOpacity={0.95} />
              <stop offset="45%" stopColor={b.fill} stopOpacity={0.45} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0.08} />
            </radialGradient>
          ))}
          {bodies.map((b) => (
            <radialGradient key={`h-${b.code}`} id={`obs-halo-${b.code}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={b.fill} stopOpacity={b.level === 'critical' ? 0.5 : b.level === 'high' ? 0.34 : 0.16} />
              <stop offset="60%" stopColor={b.fill} stopOpacity={0.06} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {/* plate */}
        <rect x={0} y={0} width={W} height={H} fill="url(#obs-plate)" />
        {/* danger quadrant — top-right (big + high) */}
        <rect x={M.left + PLOT_W * 0.5} y={M.top} width={PLOT_W * 0.5 + M.right} height={PLOT_H * 0.5} fill="url(#obs-danger)" />

        {/* starfield */}
        {STARS.map((s, i) => (
          <circle key={`s${i}`} cx={M.left + s.x * PLOT_W} cy={M.top + s.y * PLOT_H} r={s.r} fill={PLATE.star} opacity={s.a} />
        ))}

        {/* graticule */}
        {yTicks.map((v) => {
          const y = yFor(v)
          return (
            <g key={`y${v}`}>
              <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke={PLATE.grid} strokeWidth={1} />
              <text x={M.left - 12} y={y + 3} textAnchor="end" fill={PLATE.inkMuted} fontSize={11} fontFamily="var(--font-family-mono)">{Math.round(v * 100)}%</text>
            </g>
          )
        })}
        {xTicks.map((v) => {
          const x = xFor(v)
          return (
            <g key={`x${v}`}>
              <line x1={x} y1={M.top} x2={x} y2={H - M.bottom} stroke={PLATE.grid} strokeWidth={1} />
              <text x={x} y={H - M.bottom + 20} textAnchor="middle" fill={PLATE.inkMuted} fontSize={11} fontFamily="var(--font-family-mono)">{v >= 1000 ? `${v / 1000}k` : v}</text>
            </g>
          )
        })}
        {/* plate frame + corner ticks */}
        <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="none" stroke={PLATE.gridStrong} strokeWidth={1} />
        {[[M.left, M.top, 1, 1], [W - M.right, M.top, -1, 1], [M.left, H - M.bottom, 1, -1], [W - M.right, H - M.bottom, -1, -1]].map(([cx, cy, sx, sy], i) => (
          <g key={`c${i}`} stroke={PLATE.ink} strokeWidth={1.2} opacity={0.5}>
            <line x1={cx} y1={cy} x2={cx + sx * 12} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 12} />
          </g>
        ))}

        {/* axis titles */}
        <text x={M.left + PLOT_W / 2} y={H - 20} textAnchor="middle" fill={PLATE.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
          {lang === 'es' ? 'ESCALA · PROVEEDORES (log) →' : 'SCALE · VENDOR COUNT (log) →'}
        </text>
        <text transform={`translate(28, ${M.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle" fill={PLATE.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
          {lang === 'es' ? '↑ TASA DE ALTO RIESGO' : '↑ HIGH-RISK RATE'}
        </text>
        <text x={W - M.right - 4} y={M.top + 16} textAnchor="end" fill={PLATE.inkFaint} fontSize={10} fontStyle="italic" fontFamily='"Source Serif Pro", Georgia, serif'>
          {lang === 'es' ? 'grande + alto = objetivo prioritario' : 'large + high = priority target'}
        </text>

        {/* constellation links */}
        {links.map((l, i) => (
          <motion.line
            key={`l${i}`}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={PLATE.link} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }}
          />
        ))}

        {/* leader lines (under bodies) */}
        {labels.filter((l) => l.leader).map((l) => (
          <line key={`ld-${l.code}`} x1={l.bx} y1={l.by} x2={l.tx} y2={l.ty + (l.ty < l.by ? l.h - 2 : 2)} stroke={l.fill} strokeWidth={1} opacity={0.4} />
        ))}

        {/* bodies */}
        {bodies.map((b, i) => {
          const pct = Math.round(b.highRiskPct * 100)
          const aria = lang === 'es'
            ? `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} proveedores, ${b.t1} Tier-1, ${pct}% alto riesgo. Abrir expediente.`
            : `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} vendors, ${b.t1} Tier-1, ${pct}% high-risk. Open dossier.`
          return (
            <motion.g
              key={b.code}
              role="button" tabIndex={0} aria-label={aria}
              onClick={() => onClusterClick(b.code)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClusterClick(b.code) } }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: `${b.cx}px ${b.cy}px`, cursor: 'pointer' }}
            >
              <title>{aria}</title>
              {/* hit pad */}
              <circle cx={b.cx} cy={b.cy} r={Math.max(b.r, 26)} fill="transparent" />
              {/* corona */}
              <circle cx={b.cx} cy={b.cy} r={b.r * 2.6} fill={`url(#obs-halo-${b.code})`} />
              {/* body disc */}
              <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#obs-body-${b.code})`} stroke={b.fill} strokeWidth={1} strokeOpacity={0.7} />
              {/* bright core */}
              <circle cx={b.cx} cy={b.cy} r={2.6} fill="#fff" opacity={0.92} />
              <circle cx={b.cx} cy={b.cy} r={1.2} fill={b.fill} />
            </motion.g>
          )
        })}

        {/* labels (on top) */}
        {labels.map((l, i) => (
          <motion.g key={`t-${l.code}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.05, duration: 0.5 }} style={{ pointerEvents: 'none' }}>
            <text x={l.tx} y={l.ty + 11} textAnchor={l.anchor} fill={PLATE.ink} fontSize={12.5} fontFamily='"EB Garamond","Source Serif Pro",Georgia,serif' fontStyle="italic" fontWeight={600}>
              {l.name}
            </text>
            <text x={l.tx} y={l.ty + 22} textAnchor={l.anchor} fill={PLATE.inkMuted} fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.02em">
              {l.stat}
            </text>
          </motion.g>
        ))}
      </svg>

      {/* how-to-read strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ background: PLATE.bg0, borderTop: '1px solid rgba(214,205,191,0.12)' }}>
        <ReadItem glyph="◉" title={lang === 'es' ? 'Posición' : 'Position'} body={lang === 'es' ? 'Derecha = más proveedores · Arriba = mayor tasa' : 'Right = more vendors · Up = higher rate'} />
        <ReadItem glyph="⬤" title={lang === 'es' ? 'Tamaño' : 'Size'} body={lang === 'es' ? 'Área ∝ proveedores Tier-1' : 'Area ∝ Tier-1 vendors'} />
        <ReadItem glyph="✦" title={lang === 'es' ? 'Brillo' : 'Glow'} body={lang === 'es' ? 'Más rojo y brillante = mayor riesgo' : 'Redder + brighter = higher risk'} />
      </div>
    </div>
  )
}

function ReadItem({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <div className="px-4 py-2.5" style={{ borderLeft: '1px solid rgba(214,205,191,0.10)' }}>
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" style={{ color: RISK_COLORS.high, fontSize: 12 }}>{glyph}</span>
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#cdc4b5', fontWeight: 600 }}>{title}</span>
      </div>
      <p className="mt-0.5" style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 12, color: '#8f8675', lineHeight: 1.4 }}>{body}</p>
    </div>
  )
}
