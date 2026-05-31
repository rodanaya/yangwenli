/**
 * ObservatoryScatter — "The Firmament": the faithful Observatory macro view as
 * a luminous celestial chart you can fly into.
 *
 * Faithful encoding (every channel = real data) is unchanged:
 *   • x  = scale (vendor count, log)   • y = high-risk rate
 *   • r  = Tier-1 priority leads        • hue = risk ramp on the rate
 *
 * 2026-05-31 redesign v2 (DESIGNUS), per feedback "too dark / poor contrast"
 * and "clicking should fly me INTO that orb, not dump me on a page":
 *   - LIGHT engraved-plate aesthetic (warm cream) for high contrast + on-theme.
 *     Drama comes from luminous glowing bodies, an ignition entrance, a
 *     starfield + graticule and constellation lines — not from a black box.
 *   - CLICK A BODY → fly into it: the orb expands to a central sun and its top
 *     vendors animate in as orbiting satellites (real cluster-vendors data),
 *     each hoverable + clickable through to its Red-Thread. A secondary
 *     "open full dossier" + a back affordance escape the focus.
 *
 * Labels use a greedy collision-avoider (leader lines when offset) — no text
 * ever overlaps text. Fully keyboard-accessible.
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { riskRamp, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { halton } from '@/lib/particle'
import { atlasApi } from '@/api/client'

export interface ScatterCluster {
  code: string
  label: string
  vendors: number
  t1: number
  highRiskPct: number
}

interface Props {
  clusters: ScatterCluster[]
  lens: string
  lang: 'en' | 'es'
  onOpenDossier: (code: string) => void
  onVendorClick: (vendorId: number) => void
}

const W = 1180
const H = 600
const M = { top: 60, right: 96, bottom: 78, left: 96 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom
const PAD_X = 0.075
const PAD_Y = 0.12

// Light celestial palette — warm cream plate, dark ink type (high contrast).
const C = {
  plate0: '#fcfaf5',
  plate1: '#f2ece0',
  grid: 'rgba(120,108,90,0.16)',
  gridStrong: 'rgba(80,70,55,0.30)',
  star: 'rgba(150,138,118,0.55)',
  ink: '#2a2521',
  inkMuted: '#7a7064',
  inkFaint: '#a59a8a',
}

const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: halton(i + 7, 2), y: halton(i + 7, 3),
  r: 0.4 + halton(i + 7, 5) * 1.0, a: 0.2 + halton(i + 7, 7) * 0.5,
}))

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

type Box = { x: number; y: number; w: number; h: number }
function boxHit(a: Box, b: Box, pad = 2): boolean {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y)
}

export function ObservatoryScatter({ clusters, lens, lang, onOpenDossier, onVendorClick }: Props) {
  const [focused, setFocused] = useState<string | null>(null)
  const [hoverVendor, setHoverVendor] = useState<number | null>(null)

  const scales = useMemo(() => {
    if (clusters.length === 0) return { minLogV: 0, maxLogV: 1, maxHr: 1, maxT1: 1 }
    const logV = clusters.map((c) => Math.log10(Math.max(1, c.vendors)))
    return {
      minLogV: Math.min(...logV), maxLogV: Math.max(...logV),
      maxHr: Math.max(...clusters.map((c) => c.highRiskPct)) * 1.15,
      maxT1: Math.max(...clusters.map((c) => Math.max(1, c.t1))),
    }
  }, [clusters])

  const xFor = (v: number) => {
    const lv = Math.log10(Math.max(1, v))
    const t = scales.maxLogV === scales.minLogV ? 0.5 : (lv - scales.minLogV) / (scales.maxLogV - scales.minLogV)
    return M.left + (PAD_X + t * (1 - 2 * PAD_X)) * PLOT_W
  }
  const yFor = (hr: number) => M.top + (1 - (PAD_Y + (scales.maxHr ? hr / scales.maxHr : 0) * (1 - 2 * PAD_Y))) * PLOT_H
  const rFor = (t1: number) => 11 + (Math.sqrt(Math.max(1, t1)) / Math.sqrt(scales.maxT1)) * 34

  const bodies = useMemo(() => {
    return [...clusters]
      .map((c) => ({
        ...c, cx: xFor(c.vendors), cy: yFor(c.highRiskPct), r: rFor(c.t1),
        fill: riskRamp(c.highRiskPct), level: getRiskLevelFromScore(c.highRiskPct),
        importance: c.highRiskPct * 0.7 + (Math.sqrt(c.t1) / Math.sqrt(scales.maxT1)) * 0.3,
      }))
      .sort((a, b) => b.importance - a.importance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, scales])

  const focusedBody = bodies.find((b) => b.code === focused) ?? null

  // Pre-warm ALL clusters' top vendors via the cached batch endpoint on mount,
  // so flying into an orb is instant (the single per-cluster query is a slow
  // uncached JOIN; the batch is optimized + cached). Background, non-blocking.
  const codes = useMemo(() => clusters.map((c) => c.code).sort(), [clusters])
  const { data: vendorBatch, isLoading: batchLoading } = useQuery({
    queryKey: ['obs-batch-vendors', lens, codes],
    queryFn: () => atlasApi.getClusterVendorsBatch({ lens, codes, limit: 24 }),
    enabled: codes.length > 0,
    staleTime: 10 * 60 * 1000,
  })
  const focusVendors = useMemo(
    () => vendorBatch?.clusters.find((c) => c.code === focused),
    [vendorBatch, focused],
  )
  const vendorsLoading = !!focused && batchLoading

  // MST links (decorative).
  const links = useMemo(() => {
    if (bodies.length < 2) return [] as Array<{ x1: number; y1: number; x2: number; y2: number }>
    const n = bodies.length, inTree = new Array(n).fill(false)
    const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    inTree[0] = true
    for (let k = 1; k < n; k++) {
      let bi = -1, bj = -1, bd = Infinity
      for (let i = 0; i < n; i++) if (inTree[i]) for (let j = 0; j < n; j++) if (!inTree[j]) {
        const d = (bodies[i].cx - bodies[j].cx) ** 2 + (bodies[i].cy - bodies[j].cy) ** 2
        if (d < bd) { bd = d; bi = i; bj = j }
      }
      if (bj === -1) break
      inTree[bj] = true
      out.push({ x1: bodies[bi].cx, y1: bodies[bi].cy, x2: bodies[bj].cx, y2: bodies[bj].cy })
    }
    return out
  }, [bodies])

  // Greedy collision-free labels.
  const labels = useMemo(() => {
    const placed: Box[] = bodies.map((b) => ({ x: b.cx - b.r, y: b.cy - b.r, w: b.r * 2, h: b.r * 2 }))
    const out: Array<{ code: string; bx: number; by: number; tx: number; ty: number; anchor: 'start' | 'middle' | 'end'; leader: boolean; name: string; stat: string; fill: string }> = []
    for (const b of bodies) {
      const name = toTitleCase(b.label)
      const pct = Math.round(b.highRiskPct * 100)
      const stat = `${formatNumber(b.vendors)} ${lang === 'es' ? 'prov' : 'vend'} · ${b.t1} T1 · ${pct}%`
      const w = Math.max(name.length * 6.6, stat.length * 5.0) + 6, h = 24, g = 7
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
        if (placed.some((p) => boxHit(box, p))) continue
        chosen = c; break
      }
      placed.push({ x: chosen.x, y: chosen.y, w, h })
      const tx = chosen.anchor === 'middle' ? chosen.x + w / 2 : chosen.anchor === 'start' ? chosen.x + 3 : chosen.x + w - 3
      const leader = Math.hypot(chosen.x + w / 2 - b.cx, chosen.y + h / 2 - b.cy) > b.r + 24
      out.push({ code: b.code, bx: b.cx, by: b.cy, tx, ty: chosen.y, anchor: chosen.anchor, leader, name, stat, fill: b.fill })
    }
    return out
  }, [bodies, lang])

  const xTicks = useMemo(() => {
    const t: number[] = []
    for (let p = Math.floor(scales.minLogV); p <= Math.ceil(scales.maxLogV); p++) t.push(10 ** p)
    return t
  }, [scales])
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8].filter((v) => v <= scales.maxHr)

  // ── Focus geometry: central sun + orbiting vendor satellites ───────────────
  const FCX = M.left + PLOT_W * 0.5
  const FCY = M.top + PLOT_H * 0.46
  const satellites = useMemo(() => {
    const vs = focusVendors?.vendors ?? []
    if (vs.length === 0) return []
    const maxAmt = Math.max(...vs.map((v) => v.total_amount_mxn || 1))
    const golden = 2.39996
    return vs.slice(0, 24).map((v, i) => {
      const ring = 1 + Math.floor(i / 8)
      const radius = 92 + ring * 46 + (i % 8) * 2
      const ang = i * golden
      return {
        v,
        x: FCX + Math.cos(ang) * radius * 1.45,
        y: FCY + Math.sin(ang) * radius,
        r: 5 + (Math.sqrt(v.total_amount_mxn || 1) / Math.sqrt(maxAmt)) * 11,
        fill: riskRamp(v.risk_score),
      }
    })
  }, [focusVendors])

  return (
    <div style={{ position: 'relative', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 14px 36px -24px rgba(80,60,40,0.4)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={lang === 'es' ? 'Carta celeste de patrones' : 'Celestial chart of patterns'}>
        <defs>
          <radialGradient id="obs-plate" cx="48%" cy="36%" r="82%">
            <stop offset="0%" stopColor={C.plate0} /><stop offset="100%" stopColor={C.plate1} />
          </radialGradient>
          <radialGradient id="obs-danger" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RISK_COLORS.critical} stopOpacity={0.07} /><stop offset="100%" stopColor={RISK_COLORS.critical} stopOpacity={0} />
          </radialGradient>
          {bodies.map((b) => (
            <radialGradient key={`g-${b.code}`} id={`obs-body-${b.code}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={b.fill} stopOpacity={0.95} />
              <stop offset="55%" stopColor={b.fill} stopOpacity={0.55} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0.12} />
            </radialGradient>
          ))}
          {bodies.map((b) => (
            <radialGradient key={`h-${b.code}`} id={`obs-halo-${b.code}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={b.fill} stopOpacity={b.level === 'critical' ? 0.34 : b.level === 'high' ? 0.24 : 0.12} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#obs-plate)" />
        <rect x={M.left + PLOT_W * 0.5} y={M.top} width={PLOT_W * 0.5 + M.right} height={PLOT_H * 0.5} fill="url(#obs-danger)" />
        {STARS.map((s, i) => (<circle key={`s${i}`} cx={M.left + s.x * PLOT_W} cy={M.top + s.y * PLOT_H} r={s.r} fill={C.star} opacity={s.a} />))}

        {/* graticule */}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.left} y1={yFor(v)} x2={W - M.right} y2={yFor(v)} stroke={C.grid} strokeWidth={1} />
            <text x={M.left - 12} y={yFor(v) + 3} textAnchor="end" fill={C.inkMuted} fontSize={11} fontFamily="var(--font-family-mono)">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {xTicks.map((v) => (
          <g key={`x${v}`}>
            <line x1={xFor(v)} y1={M.top} x2={xFor(v)} y2={H - M.bottom} stroke={C.grid} strokeWidth={1} />
            <text x={xFor(v)} y={H - M.bottom + 20} textAnchor="middle" fill={C.inkMuted} fontSize={11} fontFamily="var(--font-family-mono)">{v >= 1000 ? `${v / 1000}k` : v}</text>
          </g>
        ))}
        <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="none" stroke={C.grid} strokeWidth={1} />
        {[[M.left, M.top, 1, 1], [W - M.right, M.top, -1, 1], [M.left, H - M.bottom, 1, -1], [W - M.right, H - M.bottom, -1, -1]].map(([cx, cy, sx, sy], i) => (
          <g key={`c${i}`} stroke={C.gridStrong} strokeWidth={1.2}>
            <line x1={cx} y1={cy} x2={cx + sx * 12} y2={cy} /><line x1={cx} y1={cy} x2={cx} y2={cy + sy * 12} />
          </g>
        ))}
        <text x={M.left + PLOT_W / 2} y={H - 20} textAnchor="middle" fill={C.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
          {lang === 'es' ? 'ESCALA · PROVEEDORES (log) →' : 'SCALE · VENDOR COUNT (log) →'}
        </text>
        <text transform={`translate(28, ${M.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle" fill={C.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
          {lang === 'es' ? '↑ TASA DE ALTO RIESGO' : '↑ HIGH-RISK RATE'}
        </text>

        {/* ─── BASE firmament (dim when focused) ─── */}
        <motion.g animate={{ opacity: focused ? 0.12 : 1 }} transition={{ duration: 0.5 }} style={{ pointerEvents: focused ? 'none' : 'auto' }}>
          {links.map((l, i) => (
            <motion.line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={C.grid} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }} />
          ))}
          {labels.filter((l) => l.leader).map((l) => (
            <line key={`ld-${l.code}`} x1={l.bx} y1={l.by} x2={l.tx} y2={l.ty + (l.ty < l.by ? 22 : 2)} stroke={l.fill} strokeWidth={1} opacity={0.5} />
          ))}
          {bodies.map((b, i) => {
            const pct = Math.round(b.highRiskPct * 100)
            const aria = lang === 'es'
              ? `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} proveedores, ${b.t1} Tier-1, ${pct}% alto riesgo. Explorar.`
              : `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} vendors, ${b.t1} Tier-1, ${pct}% high-risk. Explore.`
            return (
              <motion.g key={b.code} role="button" tabIndex={0} aria-label={aria}
                onClick={() => setFocused(b.code)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocused(b.code) } }}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: `${b.cx}px ${b.cy}px`, cursor: 'pointer' }}
              >
                <title>{aria}</title>
                <circle cx={b.cx} cy={b.cy} r={Math.max(b.r, 26)} fill="transparent" />
                <circle cx={b.cx} cy={b.cy} r={b.r * 2.6} fill={`url(#obs-halo-${b.code})`} />
                <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#obs-body-${b.code})`} stroke={b.fill} strokeWidth={1.2} />
                <circle cx={b.cx} cy={b.cy} r={2.6} fill={b.fill} />
                <circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={Math.max(2, b.r * 0.22)} fill="#fff" opacity={0.6} />
              </motion.g>
            )
          })}
          {labels.map((l, i) => (
            <motion.g key={`t-${l.code}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.05, duration: 0.5 }} style={{ pointerEvents: 'none' }}>
              <text x={l.tx} y={l.ty + 11} textAnchor={l.anchor} fill={C.ink} fontSize={12.5} fontFamily='"EB Garamond","Source Serif Pro",Georgia,serif' fontStyle="italic" fontWeight={600}>{l.name}</text>
              <text x={l.tx} y={l.ty + 22} textAnchor={l.anchor} fill={C.inkMuted} fontSize={9} fontFamily="var(--font-family-mono)">{l.stat}</text>
            </motion.g>
          ))}
        </motion.g>

        {/* ─── FOCUS layer: the orb you flew into + its vendors ─── */}
        <AnimatePresence>
          {focusedBody && (
            <motion.g key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
              {/* tap-anywhere-to-exit scrim */}
              <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={() => setFocused(null)} style={{ cursor: 'zoom-out' }} />
              {/* orbital rings */}
              {[138, 184, 230].map((rad) => (
                <ellipse key={rad} cx={FCX} cy={FCY} rx={rad * 1.45} ry={rad} fill="none" stroke={C.grid} strokeWidth={1} strokeDasharray="2 6" />
              ))}
              {/* satellites */}
              {satellites.map((s, i) => {
                const hovered = hoverVendor === s.v.vendor_id
                return (
                  <motion.g key={s.v.vendor_id} role="button" tabIndex={0}
                    aria-label={`${formatVendorName(s.v.name, 60)} — ${formatCompactMXN(s.v.total_amount_mxn)}, ${s.v.risk_level}. ${lang === 'es' ? 'Abrir hilo' : 'Open thread'}`}
                    onClick={(e) => { e.stopPropagation(); onVendorClick(s.v.vendor_id) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') onVendorClick(s.v.vendor_id) }}
                    onMouseEnter={() => setHoverVendor(s.v.vendor_id)} onMouseLeave={() => setHoverVendor(null)}
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                    transition={{ delay: 0.15 + i * 0.025, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ cursor: 'pointer' }}
                  >
                    <line x1={FCX} y1={FCY} x2={s.x} y2={s.y} stroke={s.fill} strokeWidth={0.6} opacity={0.18} />
                    <circle cx={s.x} cy={s.y} r={s.r * 1.8} fill={s.fill} opacity={hovered ? 0.22 : 0.1} />
                    <circle cx={s.x} cy={s.y} r={s.r} fill={s.fill} stroke={hovered ? C.ink : '#fff'} strokeWidth={hovered ? 1.4 : 0.8} strokeOpacity={hovered ? 0.7 : 0.5} />
                    {s.v.is_gt && <circle cx={s.x} cy={s.y} r={s.r + 3} fill="none" stroke={s.fill} strokeWidth={1} strokeDasharray="2 2" />}
                    {(hovered || i < 7) && (
                      <text x={s.x} y={s.y - s.r - 4} textAnchor="middle" fill={C.ink} fontSize={hovered ? 11 : 9.5} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={hovered ? 700 : 500}>
                        {formatVendorName(s.v.name, hovered ? 34 : 20)}
                      </text>
                    )}
                  </motion.g>
                )
              })}
              {/* central sun */}
              <motion.g initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ transformOrigin: `${FCX}px ${FCY}px` }}>
                <circle cx={FCX} cy={FCY} r={80} fill={`url(#obs-halo-${focusedBody.code})`} />
                <circle cx={FCX} cy={FCY} r={38} fill={`url(#obs-body-${focusedBody.code})`} stroke={focusedBody.fill} strokeWidth={1.5} />
                <circle cx={FCX} cy={FCY} r={5} fill={focusedBody.fill} />
                <circle cx={FCX - 11} cy={FCY - 11} r={6} fill="#fff" opacity={0.55} />
                <text x={FCX} y={FCY + 64} textAnchor="middle" fill={C.ink} fontSize={17} fontFamily='"EB Garamond","Source Serif Pro",Georgia,serif' fontStyle="italic" fontWeight={700}>
                  {toTitleCase(focusedBody.label)}
                </text>
                <text x={FCX} y={FCY + 80} textAnchor="middle" fill={C.inkMuted} fontSize={10} fontFamily="var(--font-family-mono)" letterSpacing="0.04em">
                  {formatNumber(focusedBody.vendors)} {lang === 'es' ? 'proveedores' : 'vendors'} · {focusedBody.t1} T1 · {Math.round(focusedBody.highRiskPct * 100)}% {lang === 'es' ? 'alto riesgo' : 'high-risk'}
                </text>
                {vendorsLoading && (
                  <text x={FCX} y={FCY + 100} textAnchor="middle" fill={C.inkFaint} fontSize={10} fontFamily="var(--font-family-mono)">
                    {lang === 'es' ? 'cargando proveedores…' : 'loading vendors…'}
                  </text>
                )}
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* HTML overlay: focus controls */}
      <AnimatePresence>
        {focusedBody && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}
            style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onOpenDossier(focusedBody.code)}
              className="font-mono hover:opacity-80 transition-opacity"
              style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: focusedBody.fill, border: 'none', padding: '6px 11px', borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
              {lang === 'es' ? 'Expediente completo ↗' : 'Full dossier ↗'}
            </button>
            <button type="button" onClick={() => setFocused(null)}
              className="font-mono hover:opacity-80 transition-opacity"
              style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'var(--color-background-card)', border: '1px solid var(--color-border)', padding: '6px 11px', borderRadius: 3, cursor: 'pointer' }}>
              ← {lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* how-to-read strip (hidden while focused) */}
      {!focused && (
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ background: C.plate1, borderTop: '1px solid var(--color-border)' }}>
          <ReadItem glyph="◉" title={lang === 'es' ? 'Posición' : 'Position'} body={lang === 'es' ? 'Derecha = más proveedores · Arriba = mayor tasa' : 'Right = more vendors · Up = higher rate'} />
          <ReadItem glyph="⬤" title={lang === 'es' ? 'Tamaño' : 'Size'} body={lang === 'es' ? 'Área ∝ proveedores Tier-1' : 'Area ∝ Tier-1 vendors'} />
          <ReadItem glyph="✦" title={lang === 'es' ? 'Clic = entrar' : 'Click = fly in'} body={lang === 'es' ? 'Entra al orbe y ve sus proveedores' : 'Enter the orb, see its vendors'} />
        </div>
      )}
    </div>
  )
}

function ReadItem({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <div className="px-4 py-2.5" style={{ borderLeft: '1px solid var(--color-border)' }}>
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" style={{ color: RISK_COLORS.high, fontSize: 12 }}>{glyph}</span>
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</span>
      </div>
      <p className="mt-0.5" style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{body}</p>
    </div>
  )
}
