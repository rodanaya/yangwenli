/**
 * ObservatoryScatter — "The Firmament": the faithful Observatory macro view as
 * a full-bleed luminous celestial chart you fly a CAMERA into.
 *
 * Faithful encoding (every channel = real data):
 *   • x = scale (vendor count, log)   • y = high-risk rate
 *   • r = Tier-1 priority leads        • hue = risk ramp on the rate
 *
 * 2026-06-01 redesign v3 (DESIGNUS), per feedback "elegant but we're not
 * exploiting the space and there's no transition when zooming in / do we need
 * the list?":
 *   - FULL-BLEED. The permanent name index is retired — the constellation owns
 *     the whole width. Names live IN the space: on-chart labels, a hover card,
 *     and a SUMMONABLE drawer (the full ranked list, on demand) instead of a
 *     column that permanently halves the canvas.
 *   - REAL camera zoom. Clicking an orb animates the SVG viewBox toward that
 *     orb so it grows IN PLACE into the focus and its vendors spiral out of it;
 *     Back flies the camera out. (The viewBox is driven by a framer-motion
 *     value bound straight to the attribute — zero per-frame React re-renders.)
 *
 * Labels use a greedy collision-avoider — no text ever overlaps text.
 * Fully keyboard-accessible.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { riskRamp, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatNumber, formatCompactMXN, formatCompactUSD } from '@/lib/utils'
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
const H = 720
const M = { top: 60, right: 96, bottom: 78, left: 96 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom
const PAD_X = 0.075
const PAD_Y = 0.12

// ── L2 sub-scatter geometry — flying into a cluster resolves its vendors into a
// FAITHFUL mini-scatter (x = contract value · y = risk · size = contracts),
// reusing the macro grammar. Positions carry the meaning, so the labels stop
// fighting and it scales to ~40 nodes (the ledger carries the full tail). The
// orbit's positions were arbitrary — this fixes that AND is consistent with L1.
const SUB_HALF_W = 285   // sub-plot half-width  (SVG units, around the cluster orb)
const SUB_HALF_H = 170   // sub-plot half-height
const SUB_PAD = 30       // inset so orbs + labels stay off the frame edge
const SUB_COUNT = 30     // max vendors plotted on-chart — tied to the batch fetch limit
const SUB_MAX_R = 13     // worst-case vendor orb radius

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Risk hardened against bad API data: a NaN/undefined risk_score would propagate
// through the fan math (collapse → NaN → every ty → NaN) and blank the chart.
const safeRisk01 = (v: number) => (Number.isFinite(v) ? clamp(v, 0, 1) : 0)

// Below this risk SPREAD across a cluster's vendors the y-axis (risk) carries no
// usable signal, so the sub-scatter fans vendors vertically by a stable hash (an
// equal-risk cloud) instead of asserting a false gradient. Chosen below the 0.25
// medium-risk band so a cluster spanning two risk tiers still plots faithfully.
const RISK_FAN_THRESHOLD = 0.2
// collapse ≥ this ⇒ the vertical order is mostly arbitrary, so the y-axis label
// switches to a neutral "≈ equal risk" and the gridline greys out (honesty: the
// fan must never be read as a risk ranking).
const FAN_LABEL_AT = 0.5

/**
 * Camera target viewBox for flying into a cluster — frames the vendor sub-scatter
 * (a fixed box around the cluster orb) + margin, aspect-preserved, biased toward
 * the plate interior for edge orbs. Adaptive zoom; the field always fits.
 */
function focusFrameFor(b: { cx: number; cy: number }): { x: number; y: number; w: number; h: number } {
  const contentHalfX = SUB_HALF_W + SUB_MAX_R + 14
  const contentHalfY = SUB_HALF_H + SUB_MAX_R + 22
  const halfW = Math.max(contentHalfX, contentHalfY * (W / H), 220)
  const halfH = halfW * (H / W)
  const slackX = Math.max(0, halfW - contentHalfX)
  const slackY = Math.max(0, halfH - contentHalfY)
  const cx = b.cx + clamp(W / 2 - b.cx, -slackX, slackX) * 0.6
  const cy = b.cy + clamp(H / 2 - b.cy, -slackY, slackY) * 0.6
  return { x: cx - halfW, y: cy - halfH, w: 2 * halfW, h: 2 * halfH }
}

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
  const [hoverBody, setHoverBody] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Keyboard-focus tracking (distinct from hover) so we can paint a visible focus
  // ring on the orb the user tabbed to — SVG can't render :focus-visible.
  const [focusVendorId, setFocusVendorId] = useState<number | null>(null)
  const [focusBodyCode, setFocusBodyCode] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const dur = (s: number) => (reduce ? 0 : s)
  // Vendor amounts: EN readers get USD scale to feel the impact (platform
  // convention); ES keeps native MXN (Mexican procurement reads in pesos).
  const fmtAmount = (mxn: number) => (lang === 'en' ? formatCompactUSD(mxn) : formatCompactMXN(mxn))

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
  const maxBodyR = clusters.length > 20 ? 22 : clusters.length > 9 ? 31 : 42
  const rFor = (t1: number) => 8 + (Math.sqrt(Math.max(1, t1)) / Math.sqrt(scales.maxT1)) * (maxBodyR - 8)

  const bodies = useMemo(() => {
    const arr = [...clusters]
      .map((c) => ({
        ...c, tx: xFor(c.vendors), ty: yFor(c.highRiskPct), r: rFor(c.t1),
        fill: riskRamp(c.highRiskPct), level: getRiskLevelFromScore(c.highRiskPct),
        importance: c.highRiskPct * 0.7 + (Math.sqrt(c.t1) / Math.sqrt(scales.maxT1)) * 0.3,
      }))
      .sort((a, b) => b.importance - a.importance)
    // De-overlap: gentle force relaxation — push overlapping bodies apart while
    // a weak spring pulls each back toward its TRUE (scale,risk) position.
    const n = arr.length
    const px = arr.map((b) => b.tx), py = arr.map((b) => b.ty)
    const GAP = 6
    for (let iter = 0; iter < 160; iter++) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i]
        const d = Math.hypot(dx, dy) || 0.001
        const min = arr[i].r + arr[j].r + GAP
        if (d < min) {
          const push = ((min - d) / 2) * 0.85, ux = dx / d, uy = dy / d
          px[i] -= ux * push; py[i] -= uy * push
          px[j] += ux * push; py[j] += uy * push
        }
      }
      for (let i = 0; i < n; i++) {
        px[i] += (arr[i].tx - px[i]) * 0.045
        py[i] += (arr[i].ty - py[i]) * 0.045
        px[i] = Math.max(M.left + arr[i].r, Math.min(W - M.right - arr[i].r, px[i]))
        py[i] = Math.max(M.top + arr[i].r, Math.min(H - M.bottom - arr[i].r, py[i]))
      }
    }
    return arr.map((b, i) => ({ ...b, cx: px[i], cy: py[i] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, scales])

  const focusedBody = bodies.find((b) => b.code === focused) ?? null

  // Pre-warm ALL clusters' top vendors via the cached batch endpoint on mount,
  // so flying into an orb is instant.
  const codes = useMemo(() => clusters.map((c) => c.code).sort(), [clusters])
  const { data: vendorBatch, isLoading: batchLoading } = useQuery({
    queryKey: ['obs-batch-vendors', lens, codes],
    queryFn: () => atlasApi.getClusterVendorsBatch({ lens, codes, limit: SUB_COUNT }),
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

  // Labels: place the most-important first; render ONLY labels that fit with
  // zero overlap. Anything that can't be placed cleanly is hover-only.
  const labels = useMemo(() => {
    const placed: Box[] = bodies.map((b) => ({ x: b.cx - b.r, y: b.cy - b.r, w: b.r * 2, h: b.r * 2 }))
    const out: Array<{ code: string; bx: number; by: number; tx: number; ty: number; anchor: 'start' | 'middle' | 'end'; leader: boolean; name: string; stat: string; fill: string }> = []
    for (const b of bodies) {
      const name = toTitleCase(b.label)
      const pct = Math.round(b.highRiskPct * 100)
      const stat = `${formatNumber(b.vendors)} ${lang === 'es' ? 'prov' : 'vend'} · ${b.t1} T1 · ${pct}%`
      const w = Math.max(name.length * 8.5, stat.length * 6.7) + 6, h = 32, g = 6
      const cands: Array<{ x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = [
        { x: b.cx - w / 2, y: b.cy - b.r - g - h, anchor: 'middle' },
        { x: b.cx - w / 2, y: b.cy + b.r + g, anchor: 'middle' },
        { x: b.cx + b.r + g, y: b.cy - h / 2, anchor: 'start' },
        { x: b.cx - b.r - g - w, y: b.cy - h / 2, anchor: 'end' },
        { x: b.cx + b.r + g, y: b.cy - b.r - h + 2, anchor: 'start' },
        { x: b.cx - b.r - g - w, y: b.cy - b.r - h + 2, anchor: 'end' },
        { x: b.cx + b.r + g, y: b.cy + b.r - 2, anchor: 'start' },
        { x: b.cx - b.r - g - w, y: b.cy + b.r - 2, anchor: 'end' },
        { x: b.cx - w / 2, y: b.cy - b.r - g - h - 22, anchor: 'middle' },
        { x: b.cx - w / 2, y: b.cy + b.r + g + 22, anchor: 'middle' },
      ]
      let chosen: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null = null
      for (const c of cands) {
        const box = { x: c.x, y: c.y, w, h }
        if (box.x < M.left - 70 || box.x + box.w > W - 6 || box.y < M.top - 22 || box.y + box.h > H - M.bottom + 28) continue
        if (placed.some((p) => boxHit(box, p, 3))) continue
        chosen = c; break
      }
      if (!chosen) continue
      placed.push({ x: chosen.x, y: chosen.y, w, h })
      const tx = chosen.anchor === 'middle' ? chosen.x + w / 2 : chosen.anchor === 'start' ? chosen.x + 3 : chosen.x + w - 3
      const leader = Math.hypot(chosen.x + w / 2 - b.cx, chosen.y + h / 2 - b.cy) > b.r + 22
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

  // ── Camera zoom (viewBox driven by a motion value — no per-frame re-render) ─
  const svgRef = useRef<SVGSVGElement>(null)
  const zoom = useMotionValue(0)
  // The target viewBox is kept in a ref so it stays valid through the zoom-OUT
  // (we only clear `focused` after the animation completes), and so the change
  // handler reads the current target without re-subscribing.
  const targetRef = useRef<Box>({ x: 0, y: 0, w: W, h: H })
  const baseDim = useTransform(zoom, [0, 1], [1, 0.05])
  const focusIn = useTransform(zoom, [0.35, 1], [0, 1])

  useEffect(() => {
    const apply = (z: number) => {
      const t = targetRef.current
      const x = t.x * z, y = t.y * z
      const w = W + (t.w - W) * z, h = H + (t.h - H) * z
      svgRef.current?.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
    }
    apply(zoom.get())
    const unsub = zoom.on('change', apply)
    return unsub
  }, [zoom])

  const flyTo = (b: { code: string; cx: number; cy: number; r: number }) => {
    targetRef.current = focusFrameFor(b)
    setDrawerOpen(false)
    setHoverBody(null)
    setFocused(b.code)
    animate(zoom, 1, { duration: dur(0.9), ease: [0.16, 1, 0.3, 1] })
  }
  const flyBack = () => {
    setDrawerOpen(false)
    setHoverVendor(null)
    animate(zoom, 0, { duration: dur(0.6), ease: [0.5, 0, 0.2, 1], onComplete: () => setFocused(null) })
  }

  // Recovery: if the lens changed out from under a focused orb (the code no
  // longer exists in the new bodies), fly the camera home instead of stranding
  // the user on a blank zoomed frame with no Back button.
  useEffect(() => {
    if (focused && !focusedBody) {
      animate(zoom, 0, { duration: reduce ? 0 : 0.4, onComplete: () => setFocused(null) })
    }
  }, [focused, focusedBody, zoom, reduce])

  // Escape key: close the drawer, else fly back out of focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (drawerOpen) setDrawerOpen(false)
      else if (focused) animate(zoom, 0, { duration: reduce ? 0 : 0.6, ease: [0.5, 0, 0.2, 1], onComplete: () => setFocused(null) })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, focused, zoom, reduce])

  // How collapsed the risk axis is for the focused cluster (0 = risk varies and y
  // is faithful · 1 = all vendors share ~one risk so y is an arbitrary fan). Lifted
  // OUT of subScatter so the render layer can honestly relabel the y-axis — the
  // fan must never be read as a risk gradient.
  const fanState = useMemo(() => {
    const vs = (focusVendors?.vendors ?? []).slice(0, SUB_COUNT)
    if (vs.length === 0) return { collapse: 0 }
    const risks = vs.map((v) => safeRisk01(v.risk_score))
    const rMin = Math.min(...risks), rMax = Math.max(...risks)
    return { collapse: clamp(1 - (rMax - rMin) / RISK_FAN_THRESHOLD, 0, 1) }
  }, [focusVendors])
  const fanned = !!focusedBody && fanState.collapse >= FAN_LABEL_AT

  // L2 sub-scatter: the focused cluster's vendors as a FAITHFUL mini-scatter
  // (x = contract value · y = risk · size = contracts), de-overlapped inside a
  // fixed box around the cluster orb. Same grammar as the macro view, so
  // positions carry the meaning and labels no longer fight.
  const subScatter = useMemo(() => {
    if (!focusedBody) return []
    const vs = (focusVendors?.vendors ?? []).slice(0, SUB_COUNT)
    if (vs.length === 0) return []
    const cx = focusedBody.cx, cy = focusedBody.cy
    const logs = vs.map((v) => Math.log10(Math.max(1, v.total_amount_mxn || 1)))
    const minA = Math.min(...logs), maxA = Math.max(...logs)
    const maxC = Math.max(...vs.map((v) => v.total_contracts || 1))
    const risks = vs.map((v) => safeRisk01(v.risk_score))
    // When a cluster's vendors share ~the same risk (e.g. all-max-risk Ghost),
    // the y-axis carries no signal and orbs collapse onto a single line — a
    // crowded horizontal smear where few labels fit. We fan them into the empty
    // vertical space with a stable per-vendor offset, so they read as an
    // equal-risk cloud (the y-axis label switches to "≈ equal risk" — see fanned).
    // Faithful risk-y is preserved whenever risk varies (collapse → 0). `collapse`
    // is read straight from fanState so the chart and the axis label can't drift.
    const collapse = fanState.collapse
    const hash01 = (id: number) => ((Math.imul(id ^ 0x9e3779b9, 2654435761) >>> 0) % 1000) / 1000
    const arr = vs.map((v, i) => {
      const t = maxA === minA ? 0.5 : (logs[i] - minA) / (maxA - minA)
      const tyFaithful = cy + (0.5 - risks[i]) * 2 * (SUB_HALF_H - SUB_PAD)
      const tyFan = cy + (hash01(v.vendor_id) - 0.5) * 2 * (SUB_HALF_H - SUB_PAD)
      return {
        v,
        risk: risks[i],
        tx: cx + (t - 0.5) * 2 * (SUB_HALF_W - SUB_PAD),
        ty: tyFaithful * (1 - collapse) + tyFan * collapse,
        r: 3 + (Math.sqrt(v.total_contracts || 1) / Math.sqrt(maxC)) * 10,
        fill: riskRamp(risks[i]),
        imp: v.total_amount_mxn || 0,
      }
    }).sort((a, b) => b.imp - a.imp)
    // de-overlap (force relaxation) inside the box, springing back to (tx,ty)
    const n = arr.length
    const px = arr.map((a) => a.tx), py = arr.map((a) => a.ty)
    const x0 = cx - SUB_HALF_W, x1 = cx + SUB_HALF_W, y0 = cy - SUB_HALF_H, y1 = cy + SUB_HALF_H
    for (let it = 0; it < 130; it++) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i]
        const d = Math.hypot(dx, dy) || 0.001
        const min = arr[i].r + arr[j].r + 3
        if (d < min) {
          const push = ((min - d) / 2) * 0.82, ux = dx / d, uy = dy / d
          px[i] -= ux * push; py[i] -= uy * push; px[j] += ux * push; py[j] += uy * push
        }
      }
      for (let i = 0; i < n; i++) {
        px[i] += (arr[i].tx - px[i]) * 0.05
        py[i] += (arr[i].ty - py[i]) * 0.05
        px[i] = clamp(px[i], x0 + arr[i].r, x1 - arr[i].r)
        py[i] = clamp(py[i], y0 + arr[i].r, y1 - arr[i].r)
      }
    }
    return arr.map((a, i) => ({ ...a, x: px[i], y: py[i] }))
  }, [focusedBody, focusVendors, fanState])

  // Fit-only labels over the sub-scatter (most valuable first) — collision-free,
  // skipped when there's no clean slot (hover + the ledger carry the rest). This
  // is what kills the stacked-names problem: no label is ever drawn over another.
  const subLabels = useMemo(() => {
    if (!focusedBody || subScatter.length === 0) return []
    const cx = focusedBody.cx, cy = focusedBody.cy
    const placed: Box[] = subScatter.map((s) => ({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }))
    const out: Array<{ id: number; x: number; y: number; anchor: 'start' | 'middle' | 'end'; name: string; fill: string }> = []
    for (const s of subScatter) {
      const name = formatVendorName(s.v.name, 26)
      const w = name.length * 5 + 5, h = 11, g = 3.5   // sized for the 6.8px render below
      const cands: Array<{ x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = [
        { x: s.x - w / 2, y: s.y - s.r - g - h, anchor: 'middle' },
        { x: s.x - w / 2, y: s.y + s.r + g, anchor: 'middle' },
        { x: s.x + s.r + g, y: s.y - h / 2, anchor: 'start' },
        { x: s.x - s.r - g - w, y: s.y - h / 2, anchor: 'end' },
      ]
      let chosen: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null = null
      for (const c of cands) {
        const box = { x: c.x, y: c.y, w, h }
        if (box.x < cx - SUB_HALF_W - 28 || box.x + box.w > cx + SUB_HALF_W + 28 || box.y < cy - SUB_HALF_H - 12 || box.y + box.h > cy + SUB_HALF_H + 12) continue
        if (placed.some((p) => boxHit(box, p, 2))) continue
        chosen = c; break
      }
      if (!chosen) continue
      placed.push({ x: chosen.x, y: chosen.y, w, h })
      const tx = chosen.anchor === 'middle' ? chosen.x + w / 2 : chosen.anchor === 'start' ? chosen.x + 2 : chosen.x + w - 2
      out.push({ id: s.v.vendor_id, x: tx, y: chosen.y + h - 2, anchor: chosen.anchor, name, fill: s.fill })
    }
    return out
  }, [focusedBody, subScatter])

  // Drawer = the COMPLETE ranked tail (keyset-paginated by risk indicator), not
  // just the on-chart top-30 — the batch endpoint caps at 30, this walks the rest,
  // so "full list" is literally true and a deep high-value vendor is reachable.
  const drawerQuery = useInfiniteQuery({
    queryKey: ['obs-drawer-vendors', lens, focused],
    queryFn: ({ pageParam }) => atlasApi.getClusterVendors({ lens, code: focused as string, limit: 60, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: drawerOpen && !!focused,
    staleTime: 5 * 60 * 1000,
  })
  const drawerVendorsFull = useMemo(
    () => (drawerQuery.data ? drawerQuery.data.pages.flatMap((p) => p.vendors) : null),
    [drawerQuery.data],
  )
  const drawerCount = focusedBody ? formatNumber(focusedBody.vendors) : String(bodies.length)
  const lensLabel = (lang === 'es'
    ? ({ patterns: 'Patrones', sectors: 'Sectores', categories: 'Categorías', sexenios: 'Sexenios' } as Record<string, string>)
    : ({ patterns: 'Patterns', sectors: 'Sectors', categories: 'Categories', sexenios: 'Terms' } as Record<string, string>))[lens] ?? lens

  // Screen-reader narrative — the faithful encoding is the whole point, so announce
  // it (cluster + how many vendors, by what criterion) whenever the camera flies in.
  const srAnnounce = focusedBody
    ? (lang === 'es'
        ? `Enfocado: ${toTitleCase(focusedBody.label)}. ${subScatter.length} mayores proveedores por riesgo, de ${formatNumber(focusedBody.vendors)} en total; valor de contrato en el eje horizontal.`
        : `Focused: ${toTitleCase(focusedBody.label)}. Top ${subScatter.length} vendors by risk indicator, of ${formatNumber(focusedBody.vendors)} total; contract value on the horizontal axis.`)
    : ''

  return (
    <div style={{ position: 'relative', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 14px 36px -24px rgba(80,60,40,0.4)', background: C.plate1 }}>
      {/* Plain <svg> (not motion.svg): the viewBox is an UNCONTROLLED attribute
          owned by the camera effect via setAttribute. React keeps the JSX prop
          constant so it never clobbers our animated value on a re-render. */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', maxHeight: 'calc(100vh - 184px)' }}
        role="group"
        aria-label={focusedBody
          ? (lang === 'es'
              ? `${toTitleCase(focusedBody.label)}: ${subScatter.length} mayores proveedores por riesgo; valor de contrato en el eje horizontal`
              : `${toTitleCase(focusedBody.label)}: top ${subScatter.length} vendors by risk; contract value on the horizontal axis`)
          : (lang === 'es' ? 'Carta celeste de patrones' : 'Celestial chart of patterns')}
      >
        <defs>
          <radialGradient id="obs-plate" cx="48%" cy="36%" r="82%">
            <stop offset="0%" stopColor={C.plate0} /><stop offset="100%" stopColor={C.plate1} />
          </radialGradient>
          <radialGradient id="obs-danger" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RISK_COLORS.critical} stopOpacity={0.07} /><stop offset="100%" stopColor={RISK_COLORS.critical} stopOpacity={0} />
          </radialGradient>
          {/* One shared top-left "sheen" overlay → every L2 vendor orb reads as a
              luminous sphere (not a flat disk) without a per-vendor gradient def. */}
          <radialGradient id="obs-sub-sheen" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
            <stop offset="42%" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
          {bodies.map((b) => (
            <radialGradient key={`g-${b.code}`} id={`obs-body-${b.code}`} cx="38%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
              <stop offset="22%" stopColor={b.fill} stopOpacity={0.92} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0.66} />
            </radialGradient>
          ))}
          {bodies.map((b) => (
            <radialGradient key={`h-${b.code}`} id={`obs-halo-${b.code}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={b.fill} stopOpacity={b.level === 'critical' ? 0.34 : b.level === 'high' ? 0.24 : 0.12} />
              <stop offset="100%" stopColor={b.fill} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {/* Plate fills well beyond [0,W]×[0,H] so the camera never reveals a hard
            edge when it centers on an orb near the chart border. */}
        <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={C.plate1} />
        <rect x={0} y={0} width={W} height={H} fill="url(#obs-plate)" />
        <rect x={M.left + PLOT_W * 0.5} y={M.top} width={PLOT_W * 0.5 + M.right} height={PLOT_H * 0.5} fill="url(#obs-danger)" />

        {/* ─── BASE firmament (dims as the camera flies in) ─── */}
        <motion.g style={{ opacity: baseDim, pointerEvents: focused ? 'none' : 'auto' }}>
          {STARS.map((s, i) => (<circle key={`s${i}`} cx={M.left + s.x * PLOT_W} cy={M.top + s.y * PLOT_H} r={s.r} fill={C.star} opacity={s.a} />))}
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={M.left} y1={yFor(v)} x2={W - M.right} y2={yFor(v)} stroke={C.grid} strokeWidth={1} />
              <text x={M.left - 12} y={yFor(v) + 3} textAnchor="end" fill={C.inkMuted} fontSize={13} fontFamily="var(--font-family-mono)">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {xTicks.map((v) => (
            <g key={`x${v}`}>
              <line x1={xFor(v)} y1={M.top} x2={xFor(v)} y2={H - M.bottom} stroke={C.grid} strokeWidth={1} />
              <text x={xFor(v)} y={H - M.bottom + 20} textAnchor="middle" fill={C.inkMuted} fontSize={13} fontFamily="var(--font-family-mono)">{v >= 1000 ? `${v / 1000}k` : v}</text>
            </g>
          ))}
          <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="none" stroke={C.grid} strokeWidth={1} />
          {[[M.left, M.top, 1, 1], [W - M.right, M.top, -1, 1], [M.left, H - M.bottom, 1, -1], [W - M.right, H - M.bottom, -1, -1]].map(([cx, cy, sx, sy], i) => (
            <g key={`c${i}`} stroke={C.gridStrong} strokeWidth={1.2}>
              <line x1={cx} y1={cy} x2={cx + sx * 12} y2={cy} /><line x1={cx} y1={cy} x2={cx} y2={cy + sy * 12} />
            </g>
          ))}
          <text x={M.left + PLOT_W / 2} y={H - 20} textAnchor="middle" fill={C.inkMuted} fontSize={14} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
            {lang === 'es' ? 'ESCALA · PROVEEDORES (log) →' : 'SCALE · VENDOR COUNT (log) →'}
          </text>
          <text transform={`translate(28, ${M.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle" fill={C.inkMuted} fontSize={14} fontFamily="var(--font-family-mono)" letterSpacing="0.14em">
            {lang === 'es' ? '↑ TASA DE ALTO RIESGO' : '↑ HIGH-RISK RATE'}
          </text>

          {links.map((l, i) => (
            <motion.line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={C.grid} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }} />
          ))}
          {labels.filter((l) => l.leader).map((l) => (
            <line key={`ld-${l.code}`} x1={l.bx} y1={l.by} x2={l.tx} y2={l.ty + (l.ty < l.by ? 30 : 2)} stroke={l.fill} strokeWidth={1} opacity={0.5} />
          ))}
          {bodies.map((b, i) => {
            const pct = Math.round(b.highRiskPct * 100)
            const aria = lang === 'es'
              ? `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} proveedores, ${b.t1} Tier-1, ${pct}% alto riesgo. Entrar.`
              : `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} vendors, ${b.t1} Tier-1, ${pct}% high-risk. Fly in.`
            return (
              <motion.g key={b.code} role="button" tabIndex={focused ? -1 : 0} aria-label={aria}
                onClick={() => flyTo(b)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flyTo(b) } }}
                onMouseEnter={() => setHoverBody(b.code)} onMouseLeave={() => setHoverBody(null)}
                onFocus={() => { setHoverBody(b.code); setFocusBodyCode(b.code) }} onBlur={() => { setHoverBody(null); setFocusBodyCode(null) }}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduce ? 0 : i * 0.07, duration: dur(0.7), ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: `${b.cx}px ${b.cy}px`, cursor: 'pointer', outline: 'none' }}
              >
                <title>{aria}</title>
                <circle cx={b.cx} cy={b.cy} r={Math.max(b.r, 26)} fill="transparent" />
                {(b.level === 'critical' || b.level === 'high') && (
                  <circle cx={b.cx} cy={b.cy} r={b.r * 1.42} fill={`url(#obs-halo-${b.code})`} />
                )}
                <circle cx={b.cx} cy={b.cy} r={b.r} fill={`url(#obs-body-${b.code})`} stroke={b.fill} strokeWidth={1.5} />
                {b.r > 17 && <circle cx={b.cx} cy={b.cy} r={b.r - 3.5} fill="none" stroke="#fff" strokeWidth={0.75} strokeOpacity={0.32} />}
                <circle cx={b.cx} cy={b.cy} r={3.1} fill="#fff" stroke={b.fill} strokeWidth={1.3} />
                {focusBodyCode === b.code && <circle cx={b.cx} cy={b.cy} r={b.r + 6} fill="none" stroke={C.ink} strokeWidth={1.6} />}
              </motion.g>
            )
          })}
          {labels.map((l, i) => (
            <motion.g key={`t-${l.code}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.05, duration: 0.5 }} style={{ pointerEvents: 'none' }}>
              <text x={l.tx} y={l.ty + 14} textAnchor={l.anchor} fill={C.ink} fontSize={16} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={600}>{l.name}</text>
              <text x={l.tx} y={l.ty + 30} textAnchor={l.anchor} fill={C.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)">{l.stat}</text>
            </motion.g>
          ))}
          {/* hover card — the always-discoverable name for any orb */}
          {hoverBody && !focused && (() => {
            const b = bodies.find((x) => x.code === hoverBody)
            if (!b) return null
            const name = toTitleCase(b.label)
            const pct = Math.round(b.highRiskPct * 100)
            const stat = `${formatNumber(b.vendors)} ${lang === 'es' ? 'prov' : 'vend'} · ${b.t1} T1 · ${pct}%`
            const w = Math.max(name.length * 9.6, stat.length * 7.2) + 22
            const px = Math.max(M.left + w / 2, Math.min(W - M.right - w / 2, b.cx))
            const py = b.cy - b.r - 42
            return (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={b.cx} cy={b.cy} r={b.r + 3} fill="none" stroke={b.fill} strokeWidth={1.5} opacity={0.55} />
                <rect x={px - w / 2} y={py} width={w} height={38} rx={3} fill={C.plate0} stroke={b.fill} strokeWidth={1} />
                <text x={px} y={py + 16} textAnchor="middle" fill={C.ink} fontSize={16} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={700}>{name}</text>
                <text x={px} y={py + 31} textAnchor="middle" fill={C.inkMuted} fontSize={12} fontFamily="var(--font-family-mono)">{stat}</text>
              </g>
            )
          })()}
        </motion.g>

        {/* ─── FOCUS layer: the orb (now a SUN) + its vendors, fades in with the camera ─── */}
        {focusedBody && (
          <motion.g style={{ opacity: focusIn }} role="group"
            aria-label={lang === 'es' ? `Proveedores de ${toTitleCase(focusedBody.label)}` : `Vendors in ${toTitleCase(focusedBody.label)}`}>
            {/* tap-empty-to-exit scrim — only fires once the camera has settled */}
            <rect x={focusedBody.cx - W} y={focusedBody.cy - H} width={W * 2} height={H * 2} fill="transparent"
              onClick={() => { if (zoom.get() > 0.9) flyBack() }} style={{ cursor: 'zoom-out' }} />

            {/* sub-plot frame + faithful axis hints (x = value · y = risk) */}
            <rect x={focusedBody.cx - SUB_HALF_W} y={focusedBody.cy - SUB_HALF_H} width={SUB_HALF_W * 2} height={SUB_HALF_H * 2} rx={4} fill="none" stroke={C.grid} strokeWidth={0.6} />
            <text x={focusedBody.cx} y={focusedBody.cy + SUB_HALF_H + 13} textAnchor="middle" fill={C.inkFaint} fontSize={6.5} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
              {lang === 'es' ? 'VALOR DE CONTRATO →' : 'CONTRACT VALUE →'}
            </text>
            {/* HONESTY: when the cluster's vendors share ~one risk, vertical position
                is an arbitrary fan — the axis must NOT assert a risk gradient. */}
            <text transform={`translate(${focusedBody.cx - SUB_HALF_W - 9}, ${focusedBody.cy}) rotate(-90)`} textAnchor="middle" fill={fanned ? C.inkMuted : C.inkFaint} fontSize={6.5} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
              {fanned
                ? (lang === 'es' ? '≈ MISMO RIESGO · ORDEN ARBITRARIO' : '≈ EQUAL RISK · ARBITRARY SPREAD')
                : (lang === 'es' ? '↑ RIESGO' : '↑ RISK')}
            </text>
            {/* cluster identity — top-left kicker (the orb you flew into) */}
            <text x={focusedBody.cx - SUB_HALF_W + 2} y={focusedBody.cy - SUB_HALF_H - 13} fill={C.ink} fontSize={11} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={700} paintOrder="stroke" stroke={C.plate0} strokeWidth={2.4} strokeLinejoin="round">
              {toTitleCase(focusedBody.label)}
            </text>
            {/* HONESTY: these are the top-N by RISK (backend orders avg_risk_score
                DESC), not a value-complete sample — the label names the criterion so
                a high-value/mid-risk vendor's absence is never read as "doesn't exist". */}
            <text x={focusedBody.cx - SUB_HALF_W + 2} y={focusedBody.cy - SUB_HALF_H - 4} fill={C.inkMuted} fontSize={7} fontFamily="var(--font-family-mono)" letterSpacing="0.02em" paintOrder="stroke" stroke={C.plate0} strokeWidth={1.5} strokeLinejoin="round">
              {formatNumber(focusedBody.vendors)} {lang === 'es' ? 'prov.' : 'vend.'} · {lang === 'es' ? `${subScatter.length} de mayor riesgo` : `top ${subScatter.length} by risk`} · {focusedBody.t1} T1
            </text>
            {/* L2 micro-legend — the two encodings the macro how-to-read strip can't
                explain while it's hidden: orb size and the documented-case ring. */}
            <text x={focusedBody.cx + SUB_HALF_W - 2} y={focusedBody.cy - SUB_HALF_H - 4} textAnchor="end" fill={C.inkFaint} fontSize={5.8} fontFamily="var(--font-family-mono)" letterSpacing="0.02em" paintOrder="stroke" stroke={C.plate0} strokeWidth={1.4} strokeLinejoin="round">
              {lang === 'es' ? '◯ tamaño ∝ contratos · ⊝ caso documentado' : '◯ size ∝ contracts · ⊝ documented case'}
            </text>
            {/* +N unlabeled cue — names with no collision-free slot are reachable via
                hover/keyboard and the full list; click jumps straight to it. */}
            {subScatter.length > subLabels.length && (
              <text x={focusedBody.cx + SUB_HALF_W - 2} y={focusedBody.cy + SUB_HALF_H + 13} textAnchor="end" fill={C.inkMuted} fontSize={6} fontFamily="var(--font-family-mono)" letterSpacing="0.02em" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setDrawerOpen(true) }}>
                +{subScatter.length - subLabels.length} {lang === 'es' ? 'sin etiqueta · ver lista ▤' : 'unlabeled · open list ▤'}
              </text>
            )}

            {/* vendor orbs — positioned by value × risk, de-overlapped (no orbit).
                Risk is carried by hue AND by a redundant ring weight (colour-blind
                safe): heavy ring = critical · thin ring = high · none = medium. */}
            {subScatter.map((s, i) => {
              const active = hoverVendor === s.v.vendor_id || focusVendorId === s.v.vendor_id
              const kbFocus = focusVendorId === s.v.vendor_id
              const lvl = getRiskLevelFromScore(s.risk)
              const tierRing = lvl === 'critical' ? 1.5 : lvl === 'high' ? 0.75 : 0
              return (
                <motion.g key={s.v.vendor_id} role="button" tabIndex={0}
                  aria-label={`${formatVendorName(s.v.name, 60)} — ${fmtAmount(s.v.total_amount_mxn)}, ${s.v.risk_level}. ${lang === 'es' ? 'Abrir' : 'Open'}`}
                  onClick={(e) => { e.stopPropagation(); onVendorClick(s.v.vendor_id) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVendorClick(s.v.vendor_id) } }}
                  onMouseEnter={() => setHoverVendor(s.v.vendor_id)} onMouseLeave={() => setHoverVendor(null)}
                  onFocus={() => { setHoverVendor(s.v.vendor_id); setFocusVendorId(s.v.vendor_id) }}
                  onBlur={() => { setHoverVendor(null); setFocusVendorId(null) }}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reduce ? 0 : 0.4 + Math.min(i, 24) * 0.018, duration: dur(0.45), ease: [0.16, 1, 0.3, 1] }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {active && <circle cx={s.x} cy={s.y} r={s.r * 1.7} fill={s.fill} opacity={0.18} />}
                  {(lvl === 'critical' || lvl === 'high') && <circle cx={s.x} cy={s.y} r={s.r * 1.5} fill={s.fill} opacity={lvl === 'critical' ? 0.16 : 0.1} />}
                  <circle cx={s.x} cy={s.y} r={s.r} fill={s.fill} fillOpacity={0.92} stroke={s.fill} strokeWidth={0.6} strokeOpacity={0.5} />
                  <circle cx={s.x} cy={s.y} r={s.r} fill="url(#obs-sub-sheen)" />
                  {tierRing > 0 && <circle cx={s.x} cy={s.y} r={s.r + 1.5} fill="none" stroke={s.fill} strokeWidth={tierRing} strokeOpacity={0.9} />}
                  {s.r > 4 && <circle cx={s.x - s.r * 0.28} cy={s.y - s.r * 0.3} r={Math.max(0.9, s.r * 0.22)} fill="#fff" opacity={0.85} />}
                  {s.v.is_gt && <circle cx={s.x} cy={s.y} r={s.r + 3} fill="none" stroke={C.ink} strokeWidth={0.8} strokeDasharray="2.4 1.6" strokeOpacity={0.6} />}
                  {kbFocus && <circle cx={s.x} cy={s.y} r={s.r + 4.5} fill="none" stroke={C.ink} strokeWidth={1.4} />}
                </motion.g>
              )
            })}

            {/* fit-only labels — collision-free, NEVER stacked. The active vendor's
                label is dropped here; its name moves to the opaque hover card below. */}
            {subLabels.filter((l) => l.id !== (hoverVendor ?? focusVendorId)).map((l) => (
              <text key={l.id} x={l.x} y={l.y} textAnchor={l.anchor} fill={C.ink} fontSize={6.8} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={600} paintOrder="stroke" stroke={C.plate0} strokeWidth={1.4} strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
                {l.name}
              </text>
            ))}

            {/* hover/focus card — opaque plate, drawn LAST (top-most) so the active
                vendor's full name is ALWAYS legible, even over a crowded label field.
                (The old inline label sat under the fit-only labels and tangled with
                neighbours — the "can't read the hovered name" bug.) */}
            {(() => {
              const activeId = hoverVendor ?? focusVendorId
              if (activeId == null) return null
              const s = subScatter.find((x) => x.v.vendor_id === activeId)
              if (!s) return null
              const name = formatVendorName(s.v.name, 42)
              const sub = `${fmtAmount(s.v.total_amount_mxn)} · ${Math.round(s.risk * 100)}%`
              const w = Math.max(name.length * 4.5, sub.length * 4.4) + 14
              const h = 21
              const cardX = clamp(s.x, focusedBody.cx - SUB_HALF_W + w / 2 + 2, focusedBody.cx + SUB_HALF_W - w / 2 - 2)
              const above = s.y - s.r - h - 4
              const cardY = above < focusedBody.cy - SUB_HALF_H + 2 ? s.y + s.r + 4 : above
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={s.x} cy={s.y} r={s.r + 2.5} fill="none" stroke={s.fill} strokeWidth={1} opacity={0.7} />
                  <rect x={cardX - w / 2} y={cardY} width={w} height={h} rx={3} fill={C.plate0} stroke={s.fill} strokeWidth={0.8} />
                  <text x={cardX} y={cardY + 9} textAnchor="middle" fill={C.ink} fontSize={8} fontFamily='"EB Garamond",Georgia,serif' fontStyle="italic" fontWeight={700}>{name}</text>
                  <text x={cardX} y={cardY + 17.5} textAnchor="middle" fill={C.inkMuted} fontSize={6} fontFamily="var(--font-family-mono)">{sub}</text>
                </g>
              )
            })()}

            {vendorsLoading && (
              <text x={focusedBody.cx} y={focusedBody.cy} textAnchor="middle" fill={C.inkFaint} fontSize={7} fontFamily="var(--font-family-mono)">
                {lang === 'es' ? 'cargando proveedores…' : 'loading vendors…'}
              </text>
            )}
            {!vendorsLoading && subScatter.length === 0 && (
              <text x={focusedBody.cx} y={focusedBody.cy} textAnchor="middle" fill={C.inkFaint} fontSize={7} fontFamily="var(--font-family-mono)">
                {lang === 'es' ? 'desglose en el expediente ↗' : 'breakdown in the dossier ↗'}
              </text>
            )}
          </motion.g>
        )}
      </svg>

      {/* Screen-reader-only live region: narrates the focused cluster on fly-in. */}
      <div aria-live="polite" className="sr-only">{srAnnounce}</div>

      {/* ── Top-right controls (HTML overlay) ── */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 4 }}>
        {focusedBody && (
          <>
            <button type="button" onClick={() => onOpenDossier(focusedBody.code)}
              className="font-mono hover:opacity-80 transition-opacity"
              style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: focusedBody.fill, border: 'none', padding: '6px 11px', borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
              {lang === 'es' ? 'Expediente ↗' : 'Dossier ↗'}
            </button>
            <button type="button" onClick={flyBack}
              className="font-mono hover:opacity-80 transition-opacity"
              style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'var(--color-background-card)', border: '1px solid var(--color-border)', padding: '6px 11px', borderRadius: 3, cursor: 'pointer' }}>
              ← {lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </>
        )}
        {/* summon the full list — replaces the permanent index column */}
        <button type="button" onClick={() => setDrawerOpen(true)}
          className="font-mono hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
          style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'var(--color-background-card)', border: '1px solid var(--color-border)', padding: '6px 10px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>
          <span aria-hidden="true">▤</span>
          {drawerCount} {focusedBody ? (lang === 'es' ? 'prov.' : 'vend.') : lensLabel}
        </button>
      </div>

      {/* how-to-read strip (hidden while focused) */}
      {!focused && (
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ background: C.plate1, borderTop: '1px solid var(--color-border)' }}>
          <ReadItem glyph="◉" title={lang === 'es' ? 'Posición' : 'Position'} body={lang === 'es' ? 'Derecha = más proveedores · Arriba = mayor tasa' : 'Right = more vendors · Up = higher rate'} />
          <ReadItem glyph="⬤" title={lang === 'es' ? 'Tamaño' : 'Size'} body={lang === 'es' ? 'Área ∝ proveedores Tier-1' : 'Area ∝ Tier-1 vendors'} />
          <ReadItem glyph="✦" title={lang === 'es' ? 'Clic = entrar' : 'Click = fly in'} body={lang === 'es' ? 'La cámara entra al orbe y ve sus proveedores' : 'The camera flies into the orb to its vendors'} />
        </div>
      )}

      {/* ── Summonable drawer — the complete ranked list, on demand ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(40,30,20,0.18)', zIndex: 8 }}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '85%', zIndex: 9, background: 'var(--color-background-card)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', boxShadow: '-18px 0 40px -28px rgba(40,30,20,0.5)' }}
              aria-label={lang === 'es' ? 'Índice completo' : 'Full index'}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div className="min-w-0">
                  {focusedBody ? (
                    <>
                      <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{lang === 'es' ? 'Proveedores · por riesgo' : 'Vendors · by risk'}</div>
                      <div style={{ fontFamily: '"EB Garamond",Georgia,serif', fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>{toTitleCase(focusedBody.label)}</div>
                    </>
                  ) : (
                    <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 700 }}>{lensLabel} · {bodies.length} · {lang === 'es' ? 'por riesgo' : 'by risk'}</div>
                  )}
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
                  className="font-mono hover:opacity-70 flex-shrink-0"
                  style={{ fontSize: 16, lineHeight: 1, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {focusedBody ? (
                  drawerQuery.isLoading && !drawerVendorsFull ? (
                    <div className="font-mono" style={{ padding: 14, fontSize: 10, color: 'var(--color-text-muted)' }}>{lang === 'es' ? 'cargando…' : 'loading…'}</div>
                  ) : drawerVendorsFull && drawerVendorsFull.length > 0 ? (
                    <>
                      {drawerVendorsFull.map((v, i) => (
                        <IndexRow key={v.vendor_id} rank={i + 1} dot={riskRamp(safeRisk01(v.risk_score))}
                          name={formatVendorName(v.name, 72)}
                          stat={`${fmtAmount(v.total_amount_mxn)} · ${v.total_contracts} ${lang === 'es' ? 'contr' : 'contr'} · ${Math.round(safeRisk01(v.risk_score) * 100)}%`}
                          gt={v.is_gt} active={hoverVendor === v.vendor_id}
                          onEnter={() => setHoverVendor(v.vendor_id)} onLeave={() => setHoverVendor(null)}
                          onClick={() => onVendorClick(v.vendor_id)} />
                      ))}
                      {drawerQuery.hasNextPage ? (
                        <button type="button" onClick={() => drawerQuery.fetchNextPage()} disabled={drawerQuery.isFetchingNextPage}
                          className="w-full font-mono hover:opacity-80"
                          style={{ padding: '10px 14px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'var(--color-background-elevated)', border: 'none', borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}>
                          {drawerQuery.isFetchingNextPage
                            ? (lang === 'es' ? 'cargando…' : 'loading…')
                            : (lang === 'es' ? `Cargar más — ${drawerVendorsFull.length} de ${formatNumber(focusedBody.vendors)}` : `Load more — ${drawerVendorsFull.length} of ${formatNumber(focusedBody.vendors)}`)}
                        </button>
                      ) : (
                        <div className="font-mono" style={{ padding: '10px 14px', fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
                          {lang === 'es' ? `${drawerVendorsFull.length} proveedores · lista completa` : `${drawerVendorsFull.length} vendors · complete list`}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: 0 }}>
                        {lang === 'es' ? 'El desglose por proveedor de esta vista vive en el expediente completo.' : 'The per-vendor breakdown for this view lives in the full dossier.'}
                      </p>
                      <button type="button" onClick={() => onOpenDossier(focusedBody.code)} className="font-mono hover:opacity-80 self-start"
                        style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: focusedBody.fill, border: 'none', padding: '7px 12px', borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
                        {lang === 'es' ? 'Abrir expediente ↗' : 'Open dossier ↗'}
                      </button>
                    </div>
                  )
                ) : (
                  bodies.map((b, i) => (
                    <IndexRow key={b.code} rank={i + 1} dot={b.fill}
                      name={toTitleCase(b.label)}
                      stat={`${formatNumber(b.vendors)} ${lang === 'es' ? 'prov' : 'vend'} · ${b.t1} T1 · ${Math.round(b.highRiskPct * 100)}%`}
                      active={hoverBody === b.code}
                      onEnter={() => setHoverBody(b.code)} onLeave={() => setHoverBody(null)}
                      onClick={() => flyTo(b)} />
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function IndexRow({ rank, dot, name, stat, gt, active, onEnter, onLeave, onClick }: {
  rank: number; dot: string; name: string; stat: string; gt?: boolean; active: boolean
  onEnter: () => void; onLeave: () => void; onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onEnter} onBlur={onLeave} onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 transition-colors"
      style={{
        padding: '8px 14px', background: active ? 'var(--color-background-elevated)' : 'transparent',
        borderLeft: `2px solid ${active ? dot : 'transparent'}`, borderTop: 'none', borderRight: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
      }}
    >
      <span className="flex items-baseline gap-2.5">
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 9, color: 'var(--color-text-muted)', width: 18 }}>{rank}</span>
        <span aria-hidden="true" className="flex-shrink-0 self-center" style={{ width: 8, height: 8, borderRadius: 999, background: dot, boxShadow: gt ? `0 0 0 2px var(--color-background-card), 0 0 0 3px ${dot}` : 'none' }} />
        <span className="flex-1 min-w-0" style={{ fontFamily: '"EB Garamond",Georgia,serif', fontStyle: 'italic', fontWeight: 500, fontSize: 15, lineHeight: 1.2, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{name}</span>
      </span>
      <span className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)', paddingLeft: 30 }}>{stat}</span>
    </button>
  )
}

function ReadItem({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <div className="px-4 py-2.5" style={{ borderLeft: '1px solid var(--color-border)' }}>
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" className="flex-shrink-0 text-center" style={{ color: RISK_COLORS.high, fontSize: 12, width: 14 }}>{glyph}</span>
        <div className="min-w-0">
          <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</span>
          <p className="mt-0.5" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{body}</p>
        </div>
      </div>
    </div>
  )
}
