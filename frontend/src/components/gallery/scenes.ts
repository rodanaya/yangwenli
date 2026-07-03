/**
 * scenes.ts — «El Teatro de Papel» (2026-07-03).
 *
 * Cut-vector OBJECT scenes for the StoryFilm canvas layer — the reply to "just
 * dots, no objects." Each scene draws a real place made of paper (ledgers, lamps,
 * storefronts, plazas, scales) whose choreography carries the beat. Same call
 * contract as the engine's drawShapes(); the DOM overlays (stat/subtitle/VO) are
 * renderer-independent. Aesthetic: cut-paper × Ordnance-Survey plate — bold bone
 * strokes, flat interior fills for mass, layered parallax, lamp cones as gradients.
 *
 * Composition law: the big DOM stat number lives centre-top (~22–45% height); scene
 * key objects stay OUT of that band — lower half or the sides — so nothing collides.
 */
import type { FilmPalette } from '@/lib/gallery/films'

export interface SceneArgs {
  ls: number; dur: number; W: number; H: number; KF: number
  lang: 'en' | 'es'; reduce: boolean; pal: FilmPalette
}
export type SceneFn = (ctx: CanvasRenderingContext2D, a: SceneArgs) => void

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ── Beat 9 · GHOST VENDORS — the false-front street ────────────────────────────
const ghostStreet: SceneFn = (ctx, a) => {
  const { W, H, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const groundY = H * 0.82
  const propReveal = reduce ? 1 : easeOut(clamp01((ls - dur * 0.5) / (dur * 0.32)))
  // treasury on the right — where every invoice thread leads
  const tx = W * 0.86, tw = W * 0.16, th = H * 0.28
  ctx.fillStyle = ink(0.05); ctx.fillRect(tx, groundY - th, tw, th)
  ctx.strokeStyle = dim(0.45); ctx.lineWidth = 1.4; ctx.strokeRect(tx, groundY - th, tw, th)
  for (let i = 0; i < 4; i++) { const cx = tx + tw * 0.14 + i * tw * 0.24; ctx.beginPath(); ctx.moveTo(cx, groundY - th * 0.82); ctx.lineTo(cx, groundY - th * 0.08); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(tx - tw * 0.04, groundY - th); ctx.lineTo(tx + tw * 0.5, groundY - th - H * 0.05); ctx.lineTo(tx + tw * 1.04, groundY - th); ctx.stroke()
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke()
  // receding back ranks — dim
  const backA = 0.24 + 0.18 * propReveal
  for (let rank = 2; rank >= 1; rank--) {
    const s = 0.42 - rank * 0.1, ry = groundY - H * 0.05 - rank * H * 0.055
    const fw = W * 0.1 * s, fh = H * 0.3 * s, n = 7 + rank
    for (let i = 0; i < n; i++) { const fx = W * 0.08 + (i / (n - 1)) * W * 0.6 + (rank % 2) * W * 0.02; drawFacade(ctx, fx, ry, fw, fh, pal, 0.32, false, backA, 0, reduce, ls) }
  }
  // front row — index 2 is the hero whose door opens on nothing
  const frontN = 5, HERO = 2, threadPulse = reduce ? 0.6 : (0.5 + 0.5 * Math.sin(ls * 0.004))
  for (let i = 0; i < frontN; i++) {
    const fx = W * 0.15 + (i / (frontN - 1)) * W * 0.5, fw = W * 0.12, fh = H * 0.35
    const hero = i === HERO
    const doorOpen = hero ? easeOut(clamp01((ls - dur * 0.18) / (dur * 0.34))) : easeOut(clamp01((ls - dur * 0.55 - i * 260) / (dur * 0.3))) * 0.9
    ctx.strokeStyle = ink(0.14 + 0.12 * threadPulse); ctx.setLineDash([2, 5]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(fx + fw * 0.34, groundY - fh * 0.34); ctx.lineTo(tx, groundY - th * 0.5); ctx.stroke(); ctx.setLineDash([])
    drawFacade(ctx, fx, groundY, fw, fh, pal, hero ? 0.92 : 0.62, hero, 1, doorOpen, reduce, ls)
    if (propReveal > 0.01) {
      ctx.strokeStyle = dim(0.4 * propReveal); ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(fx + fw * 0.34, groundY - fh * 0.2); ctx.lineTo(fx + fw * 0.66, groundY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(fx - fw * 0.34, groundY - fh * 0.2); ctx.lineTo(fx - fw * 0.66, groundY); ctx.stroke()
    }
  }
}
function drawFacade(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number, pal: FilmPalette, strokeA: number, hero: boolean, revealA: number, doorOpen: number, reduce: boolean, ls: number) {
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const x0 = cx - w / 2, y0 = baseY - h
  ctx.fillStyle = `rgba(${pal.ink},${0.05 * strokeA * revealA})`; ctx.fillRect(x0, y0, w, h)
  ctx.lineWidth = hero ? 1.9 : 1.3; ctx.strokeStyle = ink(strokeA * revealA); ctx.strokeRect(x0, y0, w, h)
  const sh = h * 0.16
  ctx.strokeRect(x0, y0, w, sh)
  ctx.fillStyle = ink(0.42 * strokeA * revealA)
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + w * (0.2 + i * 0.22), y0 + sh * 0.42, w * 0.14, sh * 0.16)
  ctx.strokeRect(x0 + w * 0.08, y0 + sh + h * 0.06, w * 0.28, h * 0.2)
  ctx.strokeRect(x0 + w * 0.62, y0 + sh + h * 0.1, w * 0.24, h * 0.05)
  const dw = w * 0.34, dx = cx - dw / 2, dy = y0 + h * 0.5, dh = baseY - dy
  ctx.strokeRect(dx, dy, dw, dh)
  if (doorOpen > 0.01) {
    ctx.fillStyle = `rgba(0,0,0,${0.94 * revealA})`; ctx.fillRect(dx + 1, dy + 1, dw - 2, dh - 2)
    const sw = dw * (0.2 + 0.8 * (1 - doorOpen))
    ctx.strokeStyle = ink(0.7 * revealA); ctx.lineWidth = 1.3
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + sw, dy - dh * 0.06 * doorOpen); ctx.lineTo(dx + sw, dy + dh + dh * 0.06 * doorOpen); ctx.lineTo(dx, dy + dh); ctx.stroke()
    if (hero) {
      ctx.fillStyle = ink(0.6 * revealA)
      for (let i = 0; i < 5; i++) {
        const t = ((ls * 0.02 + i * 90) % 100) / 100, iw = dw * 0.32, ih = iw * 1.3
        const ix = dx + dw * (0.2 + 0.5 * ((i * 0.37) % 1)), iy = dy + dh - t * dh * 0.9
        ctx.save(); ctx.translate(ix, iy); ctx.rotate(reduce ? 0 : Math.sin(ls * 0.001 + i) * 0.2); ctx.globalAlpha = (1 - t) * 0.6 * revealA
        ctx.fillRect(-iw / 2, -ih / 2, iw, ih); ctx.globalAlpha = 1; ctx.restore()
      }
    }
  }
}

// ── Beat 1 · THE LEDGER — a book opening inside an archive hall ────────────────
const ledgerHall: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const cx = W * 0.5, floorY = H * 0.76
  const pull = easeOut(clamp01((ls - dur * 0.5) / (dur * 0.45)))
  const lampY = H * 0.06
  const g = ctx.createLinearGradient(cx, lampY, cx, floorY)
  g.addColorStop(0, ink(0.13)); g.addColorStop(1, ink(0))
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, lampY); ctx.lineTo(cx - W * 0.22, floorY); ctx.lineTo(cx + W * 0.22, floorY); ctx.closePath(); ctx.fill()
  ctx.fillStyle = ink(0.9); ctx.beginPath(); ctx.arc(cx, lampY, 2.6 * KF, 0, 7); ctx.fill()
  if (pull > 0.01) {
    const vy = H * 0.46
    ctx.strokeStyle = dim(0.4 * pull); ctx.lineWidth = 1.1
    for (const side of [-1, 1]) for (let s = 1; s <= 5; s++) { const fx = cx + side * W * (0.15 + s * 0.085); ctx.beginPath(); ctx.moveTo(fx, floorY); ctx.lineTo(lerp(fx, cx, 0.78), vy); ctx.stroke() }
    for (let r = 1; r <= 4; r++) { const t = r / 5, y = lerp(floorY, vy, t * 0.85), xw = W * 0.52 * (1 - t * 0.78); ctx.beginPath(); ctx.moveTo(cx - xw, y); ctx.lineTo(cx + xw, y); ctx.stroke() }
  }
  const bs = lerp(1.05, 0.68, pull), bw = W * 0.32 * bs, bh = H * 0.15 * bs, by = floorY - bh
  const open = easeOut(clamp01((ls - dur * 0.22) / (dur * 0.3)))
  ctx.fillStyle = ink(0.06); ctx.fillRect(cx - bw / 2, by, bw, bh)
  ctx.lineWidth = 1.9; ctx.strokeStyle = ink(0.9)
  if (open < 0.05) { ctx.strokeRect(cx - bw / 2, by, bw, bh); ctx.strokeRect(cx - bw / 2 + 3 * KF, by + 3 * KF, bw - 6 * KF, bh - 6 * KF) }
  else {
    const hw = (bw / 2) * (0.45 + 0.55 * open)
    ctx.fillStyle = ink(0.07)
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + s * hw, by - bh * 0.12); ctx.lineTo(cx + s * hw, by + bh); ctx.lineTo(cx, by + bh * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke() }
    ctx.strokeStyle = ink(0.35); ctx.lineWidth = 1
    for (let i = 1; i < 6; i++) { const ly = by + bh * 0.12 * i; ctx.beginPath(); ctx.moveTo(cx - hw * 0.85, ly); ctx.lineTo(cx - hw * 0.12, ly); ctx.moveTo(cx + hw * 0.12, ly); ctx.lineTo(cx + hw * 0.85, ly); ctx.stroke() }
    if (!reduce) for (let i = 0; i < 4; i++) { const t = (ls * 0.0009 + i * 0.25) % 1, ang = -Math.PI * 0.5 + t * Math.PI; ctx.strokeStyle = ink(0.6 * (1 - Math.abs(t - 0.5) * 1.3)); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, by + bh * 0.42); ctx.lineTo(cx + Math.cos(ang) * hw, by + bh * 0.42 - Math.sin(ang) * bh * 0.6); ctx.stroke() }
  }
}

// ── Beat 5 · THE BLACKOUT — the hall goes dark, the sign comes down ────────────
const blackout: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const red = (o: number) => `rgba(${pal.accentRGB},${o})`
  const floorY = H * 0.82
  const die = clamp01(ls / (dur * 0.42))
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), x = lerp(W * 0.1, W * 0.58, t), y = lerp(H * 0.13, H * 0.24, t)
    if (die < (1 - t)) {
      const r = lerp(H * 0.16, H * 0.1, t)
      const g = ctx.createLinearGradient(x, y, x, y + r); g.addColorStop(0, ink(0.15)); g.addColorStop(1, ink(0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - r * 0.5, y + r); ctx.lineTo(x + r * 0.5, y + r); ctx.closePath(); ctx.fill()
      ctx.fillStyle = ink(0.85); ctx.beginPath(); ctx.arc(x, y, 2.2 * KF, 0, 7); ctx.fill()
    } else { ctx.fillStyle = dim(0.45); ctx.beginPath(); ctx.arc(x, y, 1.8 * KF, 0, 7); ctx.fill() }
  }
  const fx = W * 0.6, fw = W * 0.3, fh = H * 0.46, fy = floorY - fh
  ctx.fillStyle = ink(0.05); ctx.fillRect(fx, fy, fw, fh)
  ctx.strokeStyle = ink(0.72); ctx.lineWidth = 1.7; ctx.strokeRect(fx, fy, fw, fh)
  for (let i = 0; i < 5; i++) { const c = fx + fw * 0.12 + i * fw * 0.19; ctx.beginPath(); ctx.moveTo(c, fy + fh * 0.16); ctx.lineTo(c, floorY - fh * 0.28); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(fx - fw * 0.03, fy); ctx.lineTo(fx + fw * 0.5, fy - H * 0.055); ctx.lineTo(fx + fw * 1.03, fy); ctx.stroke()
  const drop = easeOut(clamp01((ls - dur * 0.42) / (dur * 0.3)))
  const sgY = lerp(fy - H * 0.03, floorY - H * 0.07, drop)
  ctx.strokeStyle = dim(0.6); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(fx + fw * 0.3, fy - H * 0.04); ctx.lineTo(fx + fw * 0.3, sgY); ctx.moveTo(fx + fw * 0.7, fy - H * 0.04); ctx.lineTo(fx + fw * 0.7, sgY); ctx.stroke()
  ctx.fillStyle = ink(0.08); ctx.fillRect(fx + fw * 0.22, sgY, fw * 0.56, H * 0.055)
  ctx.strokeStyle = ink(0.75); ctx.lineWidth = 1.4; ctx.strokeRect(fx + fw * 0.22, sgY, fw * 0.56, H * 0.055)
  const dw = fw * 0.36, dx = fx + fw * 0.5 - dw / 2, dh = fh * 0.44, dy = floorY - dh
  ctx.strokeRect(dx, dy, dw, dh)
  const sh = clamp01((ls - dur * 0.5) / (dur * 0.28)) * dh
  ctx.fillStyle = ink(0.32); ctx.fillRect(dx, dy, dw, sh)
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 1; for (let y = dy; y < dy + sh; y += 4 * KF) { ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); ctx.stroke() }
  const tx = W * 0.14, ty = floorY - H * 0.18
  ctx.strokeStyle = ink(0.55); ctx.lineWidth = 1.4; ctx.strokeRect(tx, ty, W * 0.024, H * 0.14)
  const jam = clamp01((ls - dur * 0.6) / (dur * 0.2))
  ctx.fillStyle = red(0.3 + 0.5 * jam); ctx.fillRect(tx + W * 0.025, ty + H * 0.035, W * 0.055, H * 0.06 * (1 - jam * 0.3))
}

// ── Beat 11 · CAPTURE — a market plaza freezes in ice ─────────────────────────
const plazaFreeze: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal, reduce } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const floorY = H * 0.84
  const freeze = easeOut(clamp01((ls - dur * 0.4) / (dur * 0.4)))
  const move = reduce ? 0 : (1 - freeze)
  ctx.strokeStyle = ink(0.45); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke()
  for (const bx of [W * 0.06, W * 0.86]) { ctx.fillStyle = ink(0.05); ctx.fillRect(bx, floorY - H * 0.34, W * 0.09, H * 0.34); ctx.strokeStyle = dim(0.5); ctx.lineWidth = 1.4; ctx.strokeRect(bx, floorY - H * 0.34, W * 0.09, H * 0.34) }
  const stalls = 6
  for (let i = 0; i < stalls; i++) {
    const sx = lerp(W * 0.22, W * 0.78, i / (stalls - 1)), sy = floorY - H * 0.13, sw = W * 0.075
    ctx.fillStyle = ink(0.06); ctx.beginPath(); ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx, sy - H * 0.055); ctx.lineTo(sx + sw / 2, sy); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = ink(0.72); ctx.lineWidth = 1.4; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx - sw / 2, floorY); ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, floorY); ctx.stroke()
  }
  for (let i = 0; i < 9; i++) {
    const base = lerp(W * 0.2, W * 0.8, ((i * 0.618) % 1)), x = base + Math.sin(ls * 0.003 + i) * W * 0.02 * move, y = floorY
    ctx.fillStyle = freeze > 0.5 ? dim(0.6) : ink(0.75)
    ctx.beginPath(); ctx.arc(x, y - H * 0.075, 3 * KF, 0, 7); ctx.fill(); ctx.fillRect(x - 1.9 * KF, y - H * 0.065, 3.8 * KF, H * 0.065)
  }
  if (freeze > 0.02) {
    ctx.strokeStyle = `rgba(${pal.ink},${0.22 * freeze})`; ctx.lineWidth = 1
    const nodes = 14
    for (let i = 0; i < nodes; i++) {
      const ax = lerp(W * 0.1, W * 0.9, i / (nodes - 1)), ay = floorY - H * (0.05 + 0.28 * ((i * 0.37) % 1))
      for (const j of [i + 1, i + 3]) { if (j >= nodes) continue; const bx = lerp(W * 0.1, W * 0.9, j / (nodes - 1)), by = floorY - H * (0.05 + 0.28 * ((j * 0.37) % 1)); const grow = clamp01((freeze - (i / nodes) * 0.5) * 2); if (grow <= 0) continue; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, grow), lerp(ay, by, grow)); ctx.stroke() }
    }
  }
  const clx = W * 0.14, cly = floorY - H * 0.5, cr = H * 0.05
  ctx.strokeStyle = ink(0.6); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(clx, cly, cr, 0, 7); ctx.stroke()
  const ha = ls * 0.001; ctx.beginPath(); ctx.moveTo(clx, cly); ctx.lineTo(clx + Math.cos(ha) * cr * 0.7, cly + Math.sin(ha) * cr * 0.7); ctx.stroke()
}

// ── Beat 13 · THE SCALE — $2.84T weighed; 41 dossiers unweighed (lower-left; clears the stat) ─
const scaleScene: SceneFn = (ctx, a) => {
  const { W, H, KF, ls, dur, pal } = a
  const ink = (o: number) => `rgba(${pal.ink},${o})`
  const dim = (o: number) => `rgba(${pal.dim},${o})`
  const red = (o: number) => `rgba(${pal.accentRGB},${o})`
  const cx = W * 0.28, topY = H * 0.46, floorY = H * 0.86  // moved down + left so $2.84T (centre) doesn't collide
  const load = easeOut(clamp01((ls - dur * 0.15) / (dur * 0.5)))
  ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1.9
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, floorY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - W * 0.055, floorY); ctx.lineTo(cx + W * 0.055, floorY); ctx.stroke()
  const tilt = load * 0.24, armL = W * 0.15
  const lx = cx - Math.cos(tilt) * armL, ly = topY + Math.sin(tilt) * armL
  const rx = cx + Math.cos(tilt) * armL, ry = topY - Math.sin(tilt) * armL
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke()
  ctx.fillStyle = ink(0.8); ctx.beginPath(); ctx.moveTo(cx, topY - 7 * KF); ctx.lineTo(cx - 6 * KF, topY); ctx.lineTo(cx + 6 * KF, topY); ctx.closePath(); ctx.fill()
  const panDrop = H * 0.11
  ctx.strokeStyle = ink(0.5); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + panDrop); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + panDrop); ctx.stroke()
  const pw = W * 0.12
  ctx.strokeStyle = ink(0.72); ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.moveTo(lx - pw / 2, ly + panDrop); ctx.lineTo(lx + pw / 2, ly + panDrop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(rx - pw / 2, ry + panDrop); ctx.lineTo(rx + pw / 2, ry + panDrop); ctx.stroke()
  const stackN = Math.floor(load * 7)
  for (let i = 0; i < stackN; i++) {
    const by = ly + panDrop - 6 * KF - i * 7 * KF, bw = pw * 0.72
    ctx.fillStyle = ink(0.1); ctx.fillRect(lx - bw / 2, by - 6 * KF, bw, 6 * KF)
    ctx.strokeStyle = ink(0.75); ctx.lineWidth = 1.2; ctx.strokeRect(lx - bw / 2, by - 6 * KF, bw, 6 * KF)
    ctx.fillStyle = red(0.85); ctx.fillRect(lx + bw / 2 - 5 * KF, by - 6 * KF, 5 * KF, 6 * KF)
  }
  // ── the 41 unweighed dossiers on the floor, spotlit (lower-centre-right, clear of stat) ──
  const ux = W * 0.6, uy = floorY
  const spot = easeOut(clamp01((ls - dur * 0.5) / (dur * 0.3)))
  const g = ctx.createLinearGradient(ux, H * 0.52, ux, uy)
  g.addColorStop(0, ink(0.12 * spot)); g.addColorStop(1, ink(0))
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ux, H * 0.52); ctx.lineTo(ux - W * 0.09, uy); ctx.lineTo(ux + W * 0.09, uy); ctx.closePath(); ctx.fill()
  ctx.lineWidth = 1.3
  for (let i = 0; i < 6; i++) { const bw = W * 0.075 - i * 2 * KF; ctx.fillStyle = ink(0.08 + 0.1 * spot); ctx.fillRect(ux - bw / 2, uy - 6 * KF - i * 6 * KF, bw, 6 * KF); ctx.strokeStyle = ink(0.4 + 0.45 * spot); ctx.strokeRect(ux - bw / 2, uy - 6 * KF - i * 6 * KF, bw, 6 * KF) }
  ctx.fillStyle = dim(0.55 + 0.4 * spot); ctx.font = `${Math.round(10 * KF)}px ui-monospace, monospace`; ctx.textAlign = 'center'
  ctx.fillText(a.lang === 'es' ? '41 sin pesar' : '41 unweighed', ux, uy + 18 * KF); ctx.textAlign = 'left'
}

export const SCENES: Record<string, SceneFn> = {
  ghosts: ghostStreet,   // beat 9
  field: ledgerHall,     // beat 1
  dissolve: blackout,    // beat 5
  lattice: plazaFreeze,  // beat 11
  mass: scaleScene,      // beat 13
}
