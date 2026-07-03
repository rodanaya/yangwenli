/**
 * scenes.ts — «El Teatro de Papel» (2026-07-03).
 *
 * Cut-vector OBJECT scenes for the StoryFilm canvas layer — the reply to "just
 * dots, no objects." Each scene draws a real place made of paper (ledgers, lamps,
 * storefronts, plazas, scales) whose choreography carries the beat. Same call
 * contract as the engine's drawShapes(); the DOM overlays (stat/subtitle/VO) are
 * renderer-independent and untouched. Aesthetic: cut-paper × Ordnance-Survey plate
 * — 1–1.5px bone strokes, flat fills at a few opacities, layered parallax, lamp
 * cones as radial gradients, silhouettes as low-point closed paths. Palette comes
 * from the film def (lib/ is outside the token-lint scope, so cinematic values live
 * here, not in the .tsx component).
 */
import type { FilmPalette } from '@/lib/gallery/films'

export interface SceneArgs {
  ls: number          // ms elapsed in this beat
  dur: number         // beat duration ms
  W: number
  H: number
  KF: number          // scale factor (~W/920)
  lang: 'en' | 'es'
  reduce: boolean
  pal: FilmPalette
}
export type SceneFn = (ctx: CanvasRenderingContext2D, a: SceneArgs) => void

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ── Beat 9 · GHOST VENDORS — the false-front street ────────────────────────────
// A night street of storefronts. The camera finds one, its door opens on a void,
// and the reveal exposes the whole row as film-set flats propped up from behind —
// registered shape, no substance. Invoice threads still stream to a treasury.
const ghostStreet: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const groundY = H * 0.80
  const p = clamp01(ls / dur)
  const propReveal = reduce ? 1 : easeOut(clamp01((ls - dur * 0.5) / (dur * 0.32)))

  // treasury on the right edge — where every invoice thread leads
  const tx = W * 0.88, tw = W * 0.15, th = H * 0.30
  ctx.strokeStyle = dim(0.3); ctx.lineWidth = 1
  ctx.strokeRect(tx, groundY - th, tw, th)
  for (let i = 0; i < 4; i++) { const cx = tx + tw * 0.14 + i * tw * 0.24; ctx.beginPath(); ctx.moveTo(cx, groundY - th * 0.82); ctx.lineTo(cx, groundY - th * 0.08); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(tx - tw * 0.04, groundY - th); ctx.lineTo(tx + tw * 0.5, groundY - th - H * 0.05); ctx.lineTo(tx + tw * 1.04, groundY - th); ctx.stroke()

  // ground
  ctx.strokeStyle = ink(0.35); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke()

  // receding back ranks — the grid of ~68 fronts (agate "≈90 each"), dim
  const backA = 0.18 + 0.16 * propReveal
  for (let rank = 2; rank >= 1; rank--) {
    const s = 0.42 - rank * 0.1
    const ry = groundY - H * 0.05 - rank * H * 0.055
    const fw = W * 0.1 * s, fh = H * 0.3 * s, n = 7 + rank
    for (let i = 0; i < n; i++) {
      const fx = W * 0.08 + (i / (n - 1)) * W * 0.66 + (rank % 2) * W * 0.02
      drawFacade(ctx, fx, ry, fw, fh, pal, 0.25, false, backA, 0, reduce, ls)
    }
  }

  // front row — 5 storefronts; index 2 is the hero whose door opens on nothing
  const frontN = 5, HERO = 2
  const threadPulse = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(ls * 0.004))
  for (let i = 0; i < frontN; i++) {
    const fx = W * 0.15 + (i / (frontN - 1)) * W * 0.52
    const fw = W * 0.115, fh = H * 0.34
    const hero = i === HERO
    const doorOpen = hero
      ? easeOut(clamp01((ls - dur * 0.18) / (dur * 0.34)))
      : easeOut(clamp01((ls - dur * 0.55 - i * 260) / (dur * 0.3))) * 0.85
    // invoice thread: mail slot → treasury
    ctx.strokeStyle = ink(0.12 + 0.1 * threadPulse); ctx.setLineDash([2, 5]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(fx + fw * 0.34, groundY - fh * 0.34); ctx.lineTo(tx, groundY - th * 0.5); ctx.stroke(); ctx.setLineDash([])
    drawFacade(ctx, fx, groundY, fw, fh, pal, hero ? 0.8 : 0.5, hero, 1, doorOpen, reduce, ls)
    // prop sticks behind — the "it's a flat" reveal
    if (propReveal > 0.01) {
      ctx.strokeStyle = dim(0.28 * propReveal); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(fx + fw * 0.34, groundY - fh * 0.2); ctx.lineTo(fx + fw * 0.62, groundY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(fx - fw * 0.34, groundY - fh * 0.2); ctx.lineTo(fx - fw * 0.62, groundY); ctx.stroke()
    }
  }

  // faint camera "slide" hint on the hero — a thin bright edge showing 2D-ness late
  if (propReveal > 0.2) {
    const fx = W * 0.15 + (HERO / (frontN - 1)) * W * 0.52, fw = W * 0.115, fh = H * 0.34
    ctx.strokeStyle = ink(0.5 * propReveal); ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(fx + fw / 2, groundY - fh); ctx.lineTo(fx + fw / 2 + 6 * KF, groundY - fh + 4 * KF); ctx.lineTo(fx + fw / 2 + 6 * KF, groundY); ctx.lineTo(fx + fw / 2, groundY); ctx.stroke()
  }
  void p
}

// one storefront facade (cut-vector). doorOpen 0..1 swings the door and reveals a void.
function drawFacade(
  ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number,
  pal: FilmPalette, strokeA: number, hero: boolean, revealA: number, doorOpen: number, reduce: boolean, ls: number,
) {
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const x0 = cx - w / 2, y0 = baseY - h
  ctx.lineWidth = hero ? 1.4 : 1
  ctx.strokeStyle = ink(strokeA * revealA)
  // body
  ctx.strokeRect(x0, y0, w, h)
  // sign band
  const sh = h * 0.16
  ctx.strokeRect(x0, y0, w, sh)
  ctx.fillStyle = ink(0.35 * strokeA * revealA)
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + w * (0.2 + i * 0.22), y0 + sh * 0.42, w * 0.14, sh * 0.16)
  // window + mail slot
  ctx.strokeRect(x0 + w * 0.08, y0 + sh + h * 0.06, w * 0.28, h * 0.2)
  ctx.strokeRect(x0 + w * 0.62, y0 + sh + h * 0.1, w * 0.24, h * 0.05) // mail slot
  // door frame
  const dw = w * 0.34, dx = cx - dw / 2, dy = y0 + h * 0.5, dh = baseY - dy
  ctx.strokeRect(dx, dy, dw, dh)
  if (doorOpen > 0.01) {
    // the void inside — pure black gap
    ctx.fillStyle = `rgba(0,0,0,${0.92 * revealA})`
    ctx.fillRect(dx + 1, dy + 1, dw - 2, dh - 2)
    // the ajar door itself (a parallelogram swinging open toward viewer)
    const sw = dw * (0.2 + 0.8 * (1 - doorOpen))
    ctx.strokeStyle = ink(0.6 * revealA); ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(dx, dy); ctx.lineTo(dx + sw, dy - dh * 0.06 * doorOpen)
    ctx.lineTo(dx + sw, dy + dh + dh * 0.06 * doorOpen); ctx.lineTo(dx, dy + dh); ctx.stroke()
    // drifting invoices in the void
    if (hero) {
      ctx.fillStyle = ink(0.5 * revealA)
      for (let i = 0; i < 5; i++) {
        const t = ((ls * 0.02 + i * 90) % 100) / 100
        const iw = dw * 0.3, ih = iw * 1.3
        const ix = dx + dw * (0.2 + 0.5 * ((i * 0.37) % 1)), iy = dy + dh - t * dh * 0.9
        ctx.save(); ctx.translate(ix, iy); ctx.rotate((reduce ? 0 : Math.sin(ls * 0.001 + i) * 0.2))
        ctx.globalAlpha = (1 - t) * 0.55 * revealA
        ctx.fillRect(-iw / 2, -ih / 2, iw, ih)
        ctx.globalAlpha = 1; ctx.restore()
      }
    }
  }
}

// ── Beat 1 · THE LEDGER — one book opening inside an archive hall ──────────────
const ledgerHall: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const cx = W * 0.5, floorY = H * 0.74
  const pull = easeOut(clamp01((ls - dur * 0.5) / (dur * 0.45)))
  // lamp cone over the reading table
  const lampY = H * 0.1
  const g = ctx.createLinearGradient(cx, lampY, cx, floorY)
  g.addColorStop(0, ink(0.11)); g.addColorStop(1, ink(0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.moveTo(cx, lampY); ctx.lineTo(cx - W * 0.2, floorY); ctx.lineTo(cx + W * 0.2, floorY); ctx.closePath(); ctx.fill()
  ctx.fillStyle = ink(0.85); ctx.beginPath(); ctx.arc(cx, lampY, 2.4 * KF, 0, 7); ctx.fill()
  // archive hall — shelves receding to a vanishing point, revealed as we pull back
  if (pull > 0.01) {
    const vy = H * 0.44
    ctx.strokeStyle = dim(0.28 * pull); ctx.lineWidth = 1
    for (const side of [-1, 1]) {
      for (let s = 1; s <= 5; s++) {
        const fx = cx + side * W * (0.14 + s * 0.085)
        ctx.beginPath(); ctx.moveTo(fx, floorY); ctx.lineTo(lerp(fx, cx, 0.78), vy); ctx.stroke()
      }
    }
    for (let r = 1; r <= 4; r++) {
      const t = r / 5, y = lerp(floorY, vy, t * 0.85), xw = W * 0.5 * (1 - t * 0.78)
      ctx.beginPath(); ctx.moveTo(cx - xw, y); ctx.lineTo(cx + xw, y); ctx.stroke()
    }
  }
  // the book — closed → open two-page spread
  const bs = lerp(1, 0.64, pull), bw = W * 0.3 * bs, bh = H * 0.14 * bs, by = floorY - bh
  const open = easeOut(clamp01((ls - dur * 0.22) / (dur * 0.3)))
  ctx.lineWidth = 1.4; ctx.strokeStyle = ink(0.85)
  if (open < 0.05) {
    ctx.strokeRect(cx - bw / 2, by, bw, bh); ctx.strokeRect(cx - bw / 2 + 3 * KF, by + 3 * KF, bw - 6 * KF, bh - 6 * KF)
  } else {
    const hw = (bw / 2) * (0.45 + 0.55 * open)
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + s * hw, by - bh * 0.12); ctx.lineTo(cx + s * hw, by + bh); ctx.lineTo(cx, by + bh * 0.9); ctx.closePath(); ctx.stroke()
    }
    ctx.strokeStyle = ink(0.3)
    for (let i = 1; i < 6; i++) { const ly = by + bh * 0.12 * i; ctx.beginPath(); ctx.moveTo(cx - hw * 0.85, ly); ctx.lineTo(cx - hw * 0.12, ly); ctx.moveTo(cx + hw * 0.12, ly); ctx.lineTo(cx + hw * 0.85, ly); ctx.stroke() }
    if (!reduce) for (let i = 0; i < 4; i++) { const t = (ls * 0.0009 + i * 0.25) % 1, ang = -Math.PI * 0.5 + t * Math.PI; ctx.strokeStyle = ink(0.5 * (1 - Math.abs(t - 0.5) * 1.3)); ctx.beginPath(); ctx.moveTo(cx, by + bh * 0.42); ctx.lineTo(cx + Math.cos(ang) * hw, by + bh * 0.42 - Math.sin(ang) * bh * 0.6); ctx.stroke() }
  }
}

// ── Beat 5 · THE BLACKOUT — the hall goes dark, the sign comes down ────────────
const blackout: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const red = (o: number) => `rgba(${pal.accentRGB},${o})`
  const floorY = H * 0.8
  const die = clamp01(ls / (dur * 0.42)) // lamps extinguish far→near over first 42%
  // a corridor row of ceiling lamps, going out one by one
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const x = lerp(W * 0.12, W * 0.62, t)
    const y = lerp(H * 0.14, H * 0.24, t)
    const on = die < (1 - t) // far lamps (high t) die first
    if (on) {
      const r = lerp(H * 0.14, H * 0.09, t)
      const g = ctx.createLinearGradient(x, y, x, y + r)
      g.addColorStop(0, ink(0.13)); g.addColorStop(1, ink(0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - r * 0.5, y + r); ctx.lineTo(x + r * 0.5, y + r); ctx.closePath(); ctx.fill()
      ctx.fillStyle = ink(0.8); ctx.beginPath(); ctx.arc(x, y, 2 * KF, 0, 7); ctx.fill()
    } else { ctx.fillStyle = dim(0.4); ctx.beginPath(); ctx.arc(x, y, 1.6 * KF, 0, 7); ctx.fill() }
  }
  // government facade on the right, sign lowering, shutter rolling down
  const fx = W * 0.66, fw = W * 0.24, fh = H * 0.42, fy = floorY - fh
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 1.2; ctx.strokeRect(fx, fy, fw, fh)
  for (let i = 0; i < 4; i++) { const c = fx + fw * 0.16 + i * fw * 0.23; ctx.beginPath(); ctx.moveTo(c, fy + fh * 0.18); ctx.lineTo(c, floorY - fh * 0.28); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(fx - fw * 0.03, fy); ctx.lineTo(fx + fw * 0.5, fy - H * 0.05); ctx.lineTo(fx + fw * 1.03, fy); ctx.stroke()
  // the CompraNet sign — a plate descending on two ropes
  const drop = easeOut(clamp01((ls - dur * 0.42) / (dur * 0.3)))
  const sgY = lerp(fy - H * 0.03, floorY - H * 0.06, drop)
  ctx.strokeStyle = dim(0.5); ctx.beginPath(); ctx.moveTo(fx + fw * 0.32, fy - H * 0.04); ctx.lineTo(fx + fw * 0.32, sgY); ctx.moveTo(fx + fw * 0.68, fy - H * 0.04); ctx.lineTo(fx + fw * 0.68, sgY); ctx.stroke()
  ctx.strokeStyle = ink(0.6); ctx.strokeRect(fx + fw * 0.24, sgY, fw * 0.52, H * 0.05)
  // door + shutter rolling down
  const dw = fw * 0.34, dx = fx + fw * 0.5 - dw / 2, dh = fh * 0.42, dy = floorY - dh
  ctx.strokeStyle = ink(0.5); ctx.strokeRect(dx, dy, dw, dh)
  const sh = clamp01((ls - dur * 0.5) / (dur * 0.28)) * dh
  ctx.fillStyle = ink(0.28); ctx.fillRect(dx, dy, dw, sh)
  ctx.strokeStyle = ink(0.4); for (let y = dy; y < dy + sh; y += 4 * KF) { ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); ctx.stroke() }
  // paper ticker jammed mid-sheet on the left wall, the red glint
  const tx = W * 0.16, ty = floorY - H * 0.16
  ctx.strokeStyle = ink(0.45); ctx.strokeRect(tx, ty, W * 0.02, H * 0.12)
  const jam = clamp01((ls - dur * 0.6) / (dur * 0.2))
  ctx.fillStyle = red(0.25 + 0.4 * jam); ctx.fillRect(tx + W * 0.021, ty + H * 0.03, W * 0.05, H * 0.055 * (1 - jam * 0.3))
  void reduce
}

// ── Beat 11 · CAPTURE — a market plaza freezes in ice ─────────────────────────
const plazaFreeze: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const red = (o: number) => `rgba(${pal.accentRGB},${o})`
  const floorY = H * 0.82
  const freeze = easeOut(clamp01((ls - dur * 0.4) / (dur * 0.4)))
  const move = reduce ? 0 : (1 - freeze)
  ctx.strokeStyle = ink(0.32); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke()
  // edge institution buildings (frost origins)
  for (const bx of [W * 0.08, W * 0.84]) { ctx.strokeStyle = dim(0.4); ctx.strokeRect(bx, floorY - H * 0.32, W * 0.08, H * 0.32) }
  // market stalls (awnings + posts) across the plaza
  const stalls = 6
  for (let i = 0; i < stalls; i++) {
    const sx = lerp(W * 0.22, W * 0.78, i / (stalls - 1)), sy = floorY - H * 0.12, sw = W * 0.07
    ctx.strokeStyle = ink(0.55); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx, sy - H * 0.05); ctx.lineTo(sx + sw / 2, sy); ctx.stroke() // awning
    ctx.beginPath(); ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx - sw / 2, floorY); ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, floorY); ctx.stroke()
  }
  // figures trading — silhouettes, moving until they freeze
  for (let i = 0; i < 9; i++) {
    const base = lerp(W * 0.2, W * 0.8, ((i * 0.618) % 1))
    const sway = Math.sin(ls * 0.003 + i) * W * 0.02 * move
    const x = base + sway, y = floorY
    ctx.fillStyle = freeze > 0.5 ? dim(0.5) : ink(0.6)
    // simple silhouette: head + body
    ctx.beginPath(); ctx.arc(x, y - H * 0.07, 2.6 * KF, 0, 7); ctx.fill()
    ctx.fillRect(x - 1.6 * KF, y - H * 0.06, 3.2 * KF, H * 0.06)
  }
  // ice lattice crazing across — grows with freeze
  if (freeze > 0.02) {
    ctx.strokeStyle = `rgba(${pal.ink},${0.14 * freeze})`; ctx.lineWidth = 1
    const nodes = 14
    for (let i = 0; i < nodes; i++) {
      const ax = lerp(W * 0.1, W * 0.9, (i / (nodes - 1)))
      const ay = floorY - H * (0.05 + 0.28 * ((i * 0.37) % 1))
      for (const j of [i + 1, i + 3]) {
        if (j >= nodes) continue
        const bx = lerp(W * 0.1, W * 0.9, (j / (nodes - 1))), by = floorY - H * (0.05 + 0.28 * ((j * 0.37) % 1))
        const grow = clamp01((freeze - (i / nodes) * 0.5) * 2)
        if (grow <= 0) continue
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, grow), lerp(ay, by, grow)); ctx.stroke()
      }
    }
  }
  // the clock tower keeps turning (time moves, the market doesn't)
  const clx = W * 0.5, cly = floorY - H * 0.42, cr = H * 0.045
  ctx.strokeStyle = ink(0.5); ctx.beginPath(); ctx.arc(clx, cly, cr, 0, 7); ctx.stroke()
  const ha = ls * 0.001
  ctx.beginPath(); ctx.moveTo(clx, cly); ctx.lineTo(clx + Math.cos(ha) * cr * 0.7, cly + Math.sin(ha) * cr * 0.7); ctx.stroke()
  ctx.strokeStyle = red(0.06 * freeze); ctx.strokeRect(W * 0.08, floorY - H * 0.32, W * 0.08, H * 0.32)
}

// ── Beat 13 · THE SCALE — $2.84T weighed; 41 dossiers unweighed on the floor ───
const scaleScene: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const red = (o: number) => `rgba(${pal.accentRGB},${o})`
  const cx = W * 0.44, topY = H * 0.24, floorY = H * 0.84
  const load = easeOut(clamp01((ls - dur * 0.15) / (dur * 0.5)))
  // fulcrum column
  ctx.strokeStyle = ink(0.55); ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, floorY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - W * 0.05, floorY); ctx.lineTo(cx + W * 0.05, floorY); ctx.stroke()
  // beam tilts under the loaded (left) pan
  const tilt = load * 0.24
  const armL = W * 0.17
  const lx = cx - Math.cos(tilt) * armL, ly = topY + Math.sin(tilt) * armL
  const rx = cx + Math.cos(tilt) * armL, ry = topY - Math.sin(tilt) * armL
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke()
  ctx.fillStyle = ink(0.7); ctx.beginPath(); ctx.moveTo(cx, topY - 6 * KF); ctx.lineTo(cx - 5 * KF, topY); ctx.lineTo(cx + 5 * KF, topY); ctx.closePath(); ctx.fill()
  // pans on lines
  const panDrop = H * 0.12
  ctx.strokeStyle = ink(0.4)
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + panDrop); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + panDrop); ctx.stroke()
  const pw = W * 0.12
  ctx.strokeStyle = ink(0.6)
  ctx.beginPath(); ctx.moveTo(lx - pw / 2, ly + panDrop); ctx.lineTo(lx + pw / 2, ly + panDrop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(rx - pw / 2, ry + panDrop); ctx.lineTo(rx + pw / 2, ry + panDrop); ctx.stroke()
  // left pan: dossiers (red-tabbed) + currency bands stacking
  const stackN = Math.floor(load * 7)
  for (let i = 0; i < stackN; i++) {
    const by = ly + panDrop - 5 * KF - i * 6 * KF, bw = pw * 0.7
    ctx.strokeStyle = ink(0.6); ctx.strokeRect(lx - bw / 2, by - 5 * KF, bw, 5 * KF)
    ctx.fillStyle = red(0.7); ctx.fillRect(lx + bw / 2 - 4 * KF, by - 5 * KF, 4 * KF, 5 * KF) // red tab
  }
  // beam readout
  ctx.fillStyle = red(0.8); ctx.font = `${Math.round(10 * KF)}px ui-monospace, monospace`; ctx.textAlign = 'center'
  void ctx.fillText('', cx, topY - 12 * KF)
  // ── the 41 unweighed dossiers on the floor, spotlit ──
  const ux = W * 0.8, uy = floorY
  const spot = easeOut(clamp01((ls - dur * 0.55) / (dur * 0.3)))
  const g = ctx.createLinearGradient(ux, H * 0.4, ux, uy)
  g.addColorStop(0, ink(0.1 * spot)); g.addColorStop(1, ink(0))
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ux, H * 0.4); ctx.lineTo(ux - W * 0.08, uy); ctx.lineTo(ux + W * 0.08, uy); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = ink(0.35 + 0.4 * spot); ctx.lineWidth = 1
  for (let i = 0; i < 6; i++) { const bw = W * 0.07 - i * 2 * KF; ctx.strokeRect(ux - bw / 2, uy - 5 * KF - i * 5 * KF, bw, 5 * KF) }
  ctx.fillStyle = dim(0.5 + 0.4 * spot); ctx.font = `${Math.round(9 * KF)}px ui-monospace, monospace`; ctx.textAlign = 'center'
  ctx.fillText(a.lang === 'es' ? '41 sin pesar' : '41 unweighed', ux, uy + 16 * KF); ctx.textAlign = 'left'
}

export const SCENES: Record<string, SceneFn> = {
  ghosts: ghostStreet,   // beat 9
  field: ledgerHall,     // beat 1
  dissolve: blackout,    // beat 5
  lattice: plazaFreeze,  // beat 11
  mass: scaleScene,      // beat 13
}
