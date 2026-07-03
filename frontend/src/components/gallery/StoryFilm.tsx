/**
 * StoryFilm — La Galería canvas film engine (2026-06-27).
 *
 * A narrated motion documentary in the spirit of Fern: a persistent particle
 * system (each dot is a contract) morphs through an 11-beat script —
 *   field → blackout → portal → decode → reassemble → split → benchmark →
 *   redact → value-scan → spotlight → gauge —
 * over a vignette + slow camera drift, with a bilingual neural voiceover
 * (edge_tts mp3s, browser-TTS fallback) and an ambient music bed that ducks
 * under the narration. The voice drives the pacing.
 *
 * Click-to-play title card both opens the film and unlocks audio (browsers
 * block autoplaying sound without a gesture).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ArrowRight, Volume2, VolumeX } from 'lucide-react'
import type { FilmBeat, FilmDef, StatSlot } from '@/lib/gallery/films'
import { SEXENIO_COLORS } from '@/lib/gallery/films'
import { SECTOR_COLORS, getSectorName } from '@/lib/constants'
import { formatCompactUSD } from '@/lib/utils'
import { SCENES } from '@/components/gallery/scenes'

type Lang = 'en' | 'es'

const SECTOR_SLUGS = ['salud', 'educacion', 'infraestructura', 'energia', 'defensa', 'tecnologia', 'hacienda', 'gobernacion', 'agricultura', 'ambiente', 'trabajo', 'otros'] as const

interface Particle {
  fx: number; fy: number
  ex: number; ey: number
  gx: number; gy: number
  sx: number; sy: number
  vx: number
  ang: number
  da: boolean
  hasVal: boolean; val: number; hero: boolean
  keep: boolean
  ord: number
  barFrac: number
  priceKeep: boolean
  sector: number
  netLayer: number; netY: number
  cluster: number; clAng: number; clRad: number
  flameH: number; flameSide: number
  year: number; term: number
  phase: number
  ghost: boolean
  cx: number; cy: number; cr: number; ca: number; tier: number
}

interface Music {
  ctx: AudioContext
  bus: GainNode
  oscs: OscillatorNode[]
  timer: ReturnType<typeof setInterval>
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Reading-time floor: a beat must never advance before its caption can be READ.
// ~176 wpm + ~2.8s to absorb the visual; the beat's own durationMs is the minimum.
function beatDwellMs(beat: FilmBeat, lang: 'en' | 'es'): number {
  const cap = (beat.caption?.[lang] ?? '').trim()
  if (!cap) return beat.durationMs
  const words = cap.split(/\s+/).length
  return Math.max(beat.durationMs, Math.min(words * 340 + 2800, 32000))
}

function fmtTime(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function StatNumber({ beat, accent, slot = 'hero', mono = false }: { beat: FilmBeat; accent: string; slot?: StatSlot; mono?: boolean }) {
  const reduce = useReducedMotion()
  const st = beat.stat
  const [val, setVal] = useState(0)
  const [landed, setLanded] = useState(false)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    setLanded(false)
    if (!st || st.format === 'text' || st.target == null) { if (st?.red) setLanded(true); return }
    if (reduce) { setVal(st.target); setLanded(true); return }
    const start = performance.now()
    const DUR = st.countMs ?? 2200
    const tick = (now: number) => {
      const t = clamp01((now - start) / DUR)
      setVal(st.target! * easeOut(t))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setLanded(true)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [st, reduce])
  if (!st) return null
  let text: string
  if (st.format === 'text') text = st.text ?? ''
  else if (st.format === 'pct') text = `${val.toFixed(1)}%`
  else if (st.format === 'currencyB') text = `$${val.toFixed(1)}B`
  else if (st.format === 'currencyT') text = `$${val.toFixed(2)}T`
  else text = Math.round(val).toLocaleString()
  // Red stats count up in ink-white and flip to accent only on landing (the number
  // turns red the moment it becomes true); pct/currency read accent throughout.
  const accentNow = st.red ? landed : (st.format === 'pct' || st.format === 'currencyB' || st.format === 'currencyT')
  const isText = st.format === 'text'
  const isHero = slot === 'hero'
  // Rails + tallies read in mono; hero + counted figures stay serif italic (the sledgehammer).
  const useMono = mono || (isText && !isHero)
  const size = isHero
    ? (isText ? 'clamp(2rem, 5.6vw, 3.9rem)' : 'clamp(2.6rem, 7.4vw, 5.2rem)')
    : 'clamp(1.6rem, 3.4vw, 2.7rem)'
  return (
    <span
      className="block tabular-nums leading-[0.98]"
      style={{
        color: 'rgba(255,255,255,0.94)',
        fontFamily: useMono ? 'var(--font-family-mono, "JetBrains Mono", ui-monospace, monospace)' : 'var(--font-family-serif, Georgia, serif)',
        fontStyle: (isText || useMono) ? 'normal' : 'italic',
        fontWeight: useMono ? 400 : 500,
        fontSize: size,
        textShadow: '0 2px 26px rgba(0,0,0,0.6)',
        letterSpacing: useMono ? '0.01em' : (isText ? '0.04em' : '-0.01em'),
      }}
    >
      {accentNow ? <span style={{ color: accent, transition: 'color 200ms ease-out' }}>{text}</span> : text}
    </span>
  )
}

export function StoryFilm({ film, lang, onOpenFull }: { film: FilmDef; lang: Lang; onOpenFull?: () => void }) {
  const reduce = useReducedMotion()
  const N = film.beats.length
  const pal = film.palette

  const [beatIdx, setBeatIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [sound, setSound] = useState(true)
  const [started, setStarted] = useState(false)

  const beatRef = useRef(0)
  const stepStartRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicRef = useRef<Music | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partsRef = useRef<Particle[]>([])
  // Canvas draw reads current lang via a ref so switching language doesn't rebuild
  // the particle system (the on-canvas mode labels stay correct either way).
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  useEffect(() => {
    beatRef.current = beatIdx
    stepStartRef.current = performance.now()
  }, [beatIdx])

  const atEnd = beatIdx >= N
  const beat = atEnd ? null : film.beats[beatIdx]
  const t = useCallback((s: { en: string; es: string }) => (lang === 'es' ? s.es : s.en), [lang])

  // ── ambient music bed ──
  const startMusic = useCallback(() => {
    if (musicRef.current) return
    try {
      const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const bus = ctx.createGain(); bus.gain.value = 0
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420; filt.Q.value = 0.5
      filt.connect(bus); bus.connect(ctx.destination)
      const chords = [[130.81, 196.0, 261.63, 329.63], [110.0, 164.81, 246.94, 329.63]]
      const oscs: OscillatorNode[] = []
      chords[0].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
        const g = ctx.createGain(); g.gain.value = i < 2 ? 0.3 : 0.16
        o.connect(g); g.connect(filt); o.start(); oscs.push(o)
      })
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05
      const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(filt.frequency); lfo.start()
      bus.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2)
      let ci = 0
      const timer = setInterval(() => {
        ci ^= 1; const f = chords[ci]
        oscs.forEach((o, i) => { try { o.frequency.setTargetAtTime(f[i], ctx.currentTime, 2.0) } catch { /* */ } })
      }, 8000)
      musicRef.current = { ctx, bus, oscs, timer }
    } catch { /* no audio */ }
  }, [])
  const duckMusic = useCallback((on: boolean) => {
    const m = musicRef.current; if (!m) return
    try { m.bus.gain.setTargetAtTime(on ? 0.022 : 0.05, m.ctx.currentTime, 0.3) } catch { /* */ }
  }, [])
  const stopMusic = useCallback(() => {
    const m = musicRef.current; if (!m) return
    musicRef.current = null
    try {
      clearInterval(m.timer); m.bus.gain.setTargetAtTime(0, m.ctx.currentTime, 0.4)
      setTimeout(() => { try { m.oscs.forEach((o) => o.stop()); m.ctx.close() } catch { /* */ } }, 600)
    } catch { /* */ }
  }, [])
  useEffect(() => () => stopMusic(), [stopMusic])

  // procedural sound design — synthesized cues, no asset files, routed through
  // the same AudioContext as the music bed (so they exist only with sound on).
  const playSfx = useCallback((kind: 'whoosh' | 'boom' | 'ping') => {
    const m = musicRef.current; if (!m) return
    const ctx = m.ctx, now = ctx.currentTime
    try {
      if (kind === 'boom') {
        const o = ctx.createOscillator(); o.type = 'sine'
        o.frequency.setValueAtTime(72, now); o.frequency.exponentialRampToValueAtTime(32, now + 0.5)
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now)
        g.gain.exponentialRampToValueAtTime(0.5, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)
        o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 1)
      } else if (kind === 'ping') {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(880, now)
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now)
        g.gain.exponentialRampToValueAtTime(0.1, now + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
        o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.3)
      } else {
        const dur = 0.5, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource(); src.buffer = buf
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8
        bp.frequency.setValueAtTime(300, now); bp.frequency.exponentialRampToValueAtTime(2400, now + dur)
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now)
        g.gain.linearRampToValueAtTime(0.09, now + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
        src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + dur)
      }
    } catch { /* */ }
  }, [])

  // ── canvas engine ──
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let W = 0, H = 0, DPR = 1, KF = 1, raf = 0, last = performance.now()
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    function build() {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      const r = wrap!.getBoundingClientRect()
      W = r.width; H = r.height || 460
      canvas!.width = Math.round(W * DPR); canvas!.height = Math.round(H * DPR)
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
      KF = Math.max(0.85, W / 920)
      const n = film.particleCount
      const valCount = Math.floor(n * film.valueFraction)
      const parts: Particle[] = []
      let valSeen = 0
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2), rad = Math.sqrt(Math.random())
        const fx = W * 0.5 + Math.cos(ang) * rad * W * 0.32
        const fy = H * 0.5 + Math.sin(ang) * rad * H * 0.34
        const eang = rand(0, Math.PI * 2), erad = rand(1.15, 1.7)
        const da = Math.random() < film.daFraction
        const hasVal = i === 0 || Math.random() < film.valueFraction
        const hero = i === 0
        const val = hero ? 1 : Math.pow(Math.random(), 2.4)
        const col = hasVal ? (valSeen++ % Math.max(1, valCount)) : 0
        const yr = 2002 + Math.min(23, Math.floor((i / n) * 24))
        const term = yr < 2006 ? 0 : yr < 2012 ? 1 : yr < 2018 ? 2 : yr < 2024 ? 3 : 4
        parts.push({
          fx, fy,
          ex: W * 0.5 + Math.cos(eang) * erad * W * 0.55,
          ey: H * 0.5 + Math.sin(eang) * erad * H * 0.55,
          gx: 0, gy: 0,
          sx: da ? W * (0.14 + Math.random() * 0.42) : W * (0.64 + Math.random() * 0.22),
          sy: H * (0.30 + Math.random() * 0.46),
          vx: W * (0.12 + (col / Math.max(1, valCount)) * 0.76),
          ang: Math.random(),
          da, hasVal, val, hero,
          keep: i % 23 === 0,
          ord: i / n,
          barFrac: i / n,
          priceKeep: i % 4 === 0,
          sector: i % 12,
          netLayer: i < 18 ? 0 : i < 30 ? 1 : i < 36 ? 2 : i === 36 ? 3 : -1,
          netY: i < 18 ? i / 17 : i < 30 ? (i - 18) / 11 : i < 36 ? (i - 30) / 5 : 0.5,
          cluster: i < 84 ? i % 7 : -1,
          clAng: rand(0, Math.PI * 2),
          clRad: rand(0.04, 0.12),
          flameH: Math.random(),
          flameSide: rand(-1, 1),
          year: yr, term,
          phase: rand(0, Math.PI * 2),
          ghost: i % 10 === 0,
          cx: fx, cy: fy, cr: 2.2, ca: 0, tier: 1,
        })
      }
      const cols = Math.ceil(Math.sqrt(n * 1.7)), rows = Math.ceil(n / cols)
      const gw = W * 0.62, gh = H * 0.56, gx0 = W * 0.5 - gw / 2, gy0 = H * 0.5 - gh / 2
      for (let i = 0; i < parts.length; i++) {
        const c = i % cols, r2 = Math.floor(i / cols)
        parts[i].gx = gx0 + (cols <= 1 ? gw / 2 : (c / (cols - 1)) * gw)
        parts[i].gy = gy0 + (rows <= 1 ? gh / 2 : (r2 / (rows - 1)) * gh)
      }
      partsRef.current = parts
    }

    const scoreY = (v: number) => H * 0.84 - v * H * 0.60
    const sectorHex = (s: number) => SECTOR_COLORS[SECTOR_SLUGS[s % 12]] ?? pal.accent

    function targetFor(p: Particle, mode: string, ls: number, dur: number) {
      const t2 = { x: p.fx, y: p.fy, r: 2.2 * KF, a: 0.8, tier: 1 }
      if (mode === 'field') {
        t2.x = p.fx; t2.y = p.fy
        t2.r = (2.1 + (reduce ? 0 : 0.45 * Math.sin(ls * 0.0016 + p.phase))) * KF
        t2.a = 0.72; t2.tier = 1
      } else if (mode === 'dissolve') {
        const pr = easeOut(clamp01(ls / dur))
        if (p.keep) { t2.x = p.fx; t2.y = p.fy; t2.a = lerp(0.85, 0.14, pr); t2.tier = 0 }
        else { t2.x = lerp(p.fx, p.ex, pr); t2.y = lerp(p.fy, p.ey, pr); t2.a = lerp(0.85, 0, pr) }
        t2.r = 2.2 * KF
      } else if (mode === 'portal') {
        const rev = clamp01((ls / (dur * 0.82) - p.ord) * 7)
        t2.x = lerp(W * 0.2, p.fx, rev); t2.y = lerp(H * 0.5, p.fy, rev)
        t2.a = 0.82 * rev; t2.r = 2.1 * KF; t2.tier = 1
      } else if (mode === 'decode') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        t2.x = lerp(p.ex, p.fx, pr); t2.y = lerp(p.ey, p.fy, pr)
        const flick = pr < 0.95 && (Math.floor(ls / 110) + Math.floor(p.ord * 50)) % 6 === 0
        t2.a = 0.85 * pr; t2.tier = flick ? 2 : 1; t2.r = 2.1 * KF
      } else if (mode === 'reassemble') {
        const pr = easeOut(clamp01((ls - 250) / (dur * 0.6)))
        t2.x = lerp(p.ex, p.gx, pr); t2.y = lerp(p.ey, p.gy, pr); t2.a = lerp(0, 0.7, pr)
        t2.r = 2 * KF; t2.tier = 1
      } else if (mode === 'split') {
        const pr = easeOut(clamp01(ls / (dur * 0.45)))
        t2.x = lerp(p.gx, p.sx, pr); t2.y = lerp(p.gy, p.sy, pr)
        t2.a = p.da ? 0.92 : 0.42; t2.tier = p.da ? 2 : 0; t2.r = 2.4 * KF
      } else if (mode === 'benchmark') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        const barX0 = W * 0.16, barW = W * 0.68, barY = H * 0.52
        const tx = barX0 + p.barFrac * barW
        const ty = barY + (p.phase / Math.PI - 1) * H * 0.035
        t2.x = lerp(p.fx, tx, pr); t2.y = lerp(p.fy, ty, pr)
        t2.a = 0.9; t2.tier = p.barFrac < 0.787 ? 2 : 0; t2.r = 2.3 * KF
      } else if (mode === 'redact') {
        const sweepX = lerp(0, W * 1.05, easeOut(clamp01(ls / (dur * 0.6))))
        const blanked = !p.priceKeep && p.fx < sweepX
        t2.x = p.fx; t2.y = p.fy
        t2.a = p.priceKeep ? 0.92 : (blanked ? 0.08 : 0.45)
        t2.tier = p.priceKeep ? 2 : 0; t2.r = (p.priceKeep ? 2.7 : 2) * KF
      } else if (mode === 'valuescan') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        if (p.hasVal) {
          t2.x = p.vx; t2.y = lerp(H * 0.86, scoreY(p.val), pr)
          t2.r = lerp(2 * KF, (2.4 + p.val * 6) * KF, pr); t2.a = 0.92; t2.tier = p.hero ? 2 : 1
        } else {
          t2.x = p.fx; t2.y = lerp(p.fy, H * 0.93, pr * 0.7); t2.a = lerp(0.4, 0.1, pr); t2.r = 1.5 * KF; t2.tier = 0
        }
      } else if (mode === 'spotlight') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        if (p.hero) {
          t2.x = W * 0.5; t2.y = H * 0.46; t2.r = lerp(3, 22, pr) * KF; t2.a = 1; t2.tier = 2
        } else {
          t2.x = lerp(p.fx, W * 0.5 + (p.ex - W * 0.5) * 1.15, pr)
          t2.y = lerp(p.fy, p.ey, pr * 0.6); t2.a = lerp(0.5, 0.1, pr); t2.tier = 0; t2.r = 1.6 * KF
        }
      } else if (mode === 'categorygrid') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        const cols = 4, gw = W * 0.7, gh = H * 0.58, gx0 = W * 0.5 - gw / 2, gy0 = H * 0.2
        const cw = gw / cols, ch = gh / 3
        const c = p.sector % cols, rr = Math.floor(p.sector / cols)
        const tx = gx0 + c * cw + cw * (0.18 + 0.64 * (p.phase / (Math.PI * 2)))
        const ty = gy0 + rr * ch + ch * (0.22 + 0.58 * ((p.ord * 7) % 1))
        t2.x = lerp(p.fx, tx, pr); t2.y = lerp(p.fy, ty, pr); t2.a = 0.92; t2.tier = 1; t2.r = 2.2 * KF
      } else if (mode === 'modelnet') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        if (p.netLayer < 0) { t2.x = p.fx; t2.y = lerp(p.fy, H * 0.96, pr); t2.a = lerp(0.4, 0.04, pr); t2.r = 1.4 * KF; t2.tier = 0 }
        else {
          const layX = [0.22, 0.42, 0.62, 0.82][p.netLayer] * W
          const ly = H * 0.26 + p.netY * H * 0.48
          t2.x = lerp(p.fx, layX, pr); t2.y = lerp(p.fy, ly, pr)
          t2.a = 0.96; t2.tier = p.netLayer === 3 ? 2 : 1; t2.r = (p.netLayer === 3 ? 5 : 3) * KF
        }
      } else if (mode === 'network') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        if (p.cluster < 0) { t2.x = p.fx; t2.y = lerp(p.fy, H * 0.96, pr); t2.a = lerp(0.35, 0.04, pr); t2.r = 1.4 * KF; t2.tier = 0 }
        else {
          const ca = (p.cluster / 7) * Math.PI * 2
          const ccx = W * 0.5 + Math.cos(ca) * W * 0.26, ccy = H * 0.52 + Math.sin(ca) * H * 0.28
          t2.x = lerp(p.fx, ccx + Math.cos(p.clAng) * p.clRad * W, pr)
          t2.y = lerp(p.fy, ccy + Math.sin(p.clAng) * p.clRad * H, pr)
          t2.a = 0.92; t2.tier = p.cluster === 0 ? 2 : 1; t2.r = 2.6 * KF
        }
      } else if (mode === 'torch') {
        const pr = easeOut(clamp01(ls / (dur * 0.45)))
        const flick = reduce ? 0 : Math.sin(ls * 0.006 + p.phase) * 0.05
        const h = clamp01(p.flameH + flick)
        const fy = lerp(H * 0.82, H * 0.26, h)
        const wRaw = Math.pow(Math.max(0, Math.sin(h * Math.PI * 0.9)), 0.7)
        const fxp = W * 0.5 + p.flameSide * wRaw * W * 0.12
        t2.x = lerp(p.fx, fxp, pr); t2.y = lerp(p.fy, fy, pr)
        t2.a = 0.82 + 0.18 * (1 - h); t2.tier = 2; t2.r = (2.6 - h * 1.2) * KF
      } else if (mode === 'mark') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        const a0 = p.phase, rr = (0.02 + 0.05 * ((p.ord * 13) % 1)) * Math.min(W, H)
        t2.x = lerp(p.fx, W * 0.5 + Math.cos(a0) * rr, pr)
        t2.y = lerp(p.fy, H * 0.44 + Math.sin(a0) * rr, pr)
        t2.a = 0.9; t2.tier = 2; t2.r = 2.2 * KF
      } else if (mode === 'ribbon') {
        const pr = easeOut(clamp01(ls / (dur * 0.6)))
        const leftM = W * 0.08, rightM = W * 0.92, midY = H * 0.5
        const x = leftM + ((p.year - 2002) / 23) * (rightM - leftM)
        const yb = midY + (p.barFrac - 0.5) * H * 0.28
        const xn = (x - leftM) / (rightM - leftM)
        const shown = xn <= clamp01(ls / (dur * 0.7)) + 0.05
        t2.x = lerp(p.fx, x, pr); t2.y = lerp(p.fy, yb, pr)
        t2.a = shown ? 0.9 : 0; t2.tier = 1; t2.r = 2 * KF
      } else if (mode === 'ribbontear') {
        const leftM = W * 0.08, rightM = W * 0.92, midY = H * 0.5
        const x = leftM + ((p.year - 2002) / 23) * (rightM - leftM)
        const yb = midY + (p.barFrac - 0.5) * H * 0.28
        const tear = easeOut(clamp01(ls / (dur * 0.6)))
        const voidX = rightM - tear * (rightM - leftM) * 0.22
        if (x > voidX) {
          t2.x = x + Math.sin(p.phase) * 16 * tear
          t2.y = yb + tear * tear * H * 0.6
          t2.a = lerp(0.9, 0, clamp01(tear * 1.4)); t2.tier = 2; t2.r = 2 * KF
        } else {
          t2.x = x; t2.y = yb; t2.a = lerp(0.85, 0.5, tear); t2.tier = 1; t2.r = 2 * KF
        }
      } else if (mode === 'titlecard') {
        t2.x = p.fx; t2.y = p.fy; t2.a = 0.06; t2.tier = 0; t2.r = 1.6 * KF
      } else if (mode === 'gauge') {
        const a0 = Math.PI * (1 - p.ang), R = Math.min(W, H) * 0.34
        t2.x = W * 0.5 + Math.cos(a0) * R; t2.y = H * 0.70 - Math.sin(a0) * R
        const needle = 0.787 * easeOut(clamp01(ls / (dur * 0.55))), lit = p.ang < needle
        t2.a = lit ? 0.95 : 0.22; t2.tier = lit ? 2 : 0; t2.r = 2.3 * KF
      } else if (mode === 'torrent') {
        // Beat 2 · document rain too fast to read; one reading frame lights a single page.
        const colX = 0.18 + (((Math.round(p.ord * 680) * 7) % 13) / 13) * 0.64
        t2.x = W * colX + (reduce ? 0 : Math.sin(p.phase + ls * 0.001) * 6)
        const span = H * 1.25
        t2.y = reduce
          ? p.ord * span - H * 0.12
          : ((p.ord * H * 3 + ls * 0.14) % span) - H * 0.12
        t2.a = 0.5; t2.r = 2.1 * KF; t2.tier = 1
        if (Math.abs(t2.x - W * 0.24) < 17 && Math.abs(t2.y - H * 0.38) < 23) { t2.tier = 2; t2.a = 0.95 }
      } else if (mode === 'strata') {
        // Beat 8 · risk distribution; the flagged 11.1% tail shears up off the baseline.
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        const barX0 = W * 0.16, barW = W * 0.68, barY = H * 0.56
        const tx = barX0 + p.ord * barW
        let ty = barY + (p.phase / Math.PI - 1) * H * 0.035
        let a = 0.65, tier = 1, r = 2.2
        if (p.ord < 0.728) { a = 0.32; tier = 0 }
        else if (p.ord < 0.890) { a = 0.65; tier = 1 }
        else if (p.ord < 0.941) { a = 0.8; tier = 2 }
        else { a = 1.0; tier = 2; r = 2.8 }
        if (p.ord >= 0.889 && ls > dur * 0.45) {
          ty -= easeOut(clamp01((ls - dur * 0.45) / 1400)) * H * 0.09
        }
        t2.x = lerp(p.fx, tx, pr); t2.y = lerp(p.fy, ty, pr)
        t2.a = a; t2.tier = tier; t2.r = r * KF
      } else if (mode === 'ghosts') {
        // Beat 9 · the field recedes; ghost particles survive as hollow stroked rings.
        if (p.ghost) {
          t2.x = p.fx; t2.y = p.fy - (reduce ? 0 : ls * 0.004)
          t2.a = 0.6 + 0.25 * (0.5 + 0.5 * Math.sin(ls * 0.002 + p.phase))
          t2.r = 4.2 * KF; t2.tier = 1
        } else {
          const pr = clamp01(ls / (dur * 0.4))
          t2.x = p.fx; t2.y = p.fy; t2.a = lerp(0.7, 0.04, pr); t2.tier = 0; t2.r = 2 * KF
        }
      } else if (mode === 'monopoly') {
        // Beat 10 · 44 vendors orbit one institution; first 36 red → an 82% annulus.
        const idx = Math.round(p.ord * film.particleCount)
        if (idx < 44) {
          const pr = easeOut(clamp01(ls / (dur * 0.4)))
          const angle = (idx / 44) * Math.PI * 2 - Math.PI / 2
          const radius = Math.min(W, H) * 0.30
          t2.x = lerp(p.fx, W * 0.5 + Math.cos(angle) * radius, pr)
          t2.y = lerp(p.fy, H * 0.54 + Math.sin(angle) * radius, pr)
          if (idx < 36) { t2.tier = 2; t2.a = 0.95 } else { t2.tier = 1; t2.a = 0.6 }
          t2.r = 2.8 * KF
        } else {
          t2.x = p.fx; t2.y = lerp(p.fy, H * 0.97, clamp01(ls / (dur * 0.5)))
          t2.a = 0.04; t2.tier = 0; t2.r = 1.4 * KF
        }
      } else if (mode === 'lattice') {
        // Beat 11 · every particle snaps to grid; jitter is frozen in the frame loop.
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        t2.x = lerp(p.fx, p.gx, pr); t2.y = lerp(p.fy, p.gy, pr)
        t2.a = 0.7; t2.tier = p.cluster >= 0 ? 2 : 1; t2.r = 2.2 * KF
      } else if (mode === 'mass') {
        // Beat 13 · all particles accrete into a slowly rotating disc that turns red.
        const r0 = Math.sqrt(p.ord) * Math.min(W, H) * 0.16
        const angle = p.phase + (reduce ? 0 : ls * 0.0002)
        const pr = easeOut(clamp01((ls - p.ord * dur * 0.35) / 1800))
        t2.x = lerp(p.fx, W * 0.5 + Math.cos(angle) * r0, pr)
        t2.y = lerp(p.fy, H * 0.5 + Math.sin(angle) * r0, pr)
        t2.a = 0.9; t2.tier = pr > 0.5 ? 2 : 1; t2.r = 2.4 * KF
      }
      return t2
    }

    function dotColor(tier: number, a: number) {
      if (tier === 2) return `rgba(${pal.accentRGB},${a})`
      if (tier === 0) return `rgba(${pal.dim},${a * 0.55})`
      return `rgba(${pal.ink},${a})`
    }

    function drawShapes(mode: string, ls: number, dur: number) {
      if (mode === 'valuescan') {
        const sweep = (ls % 2600) / 2600, y = H * 0.12 + (H * 0.76) * sweep
        const grad = ctx!.createLinearGradient(0, y - 40, 0, y + 40)
        grad.addColorStop(0, `rgba(${pal.accentRGB},0)`); grad.addColorStop(0.5, `rgba(${pal.accentRGB},0.10)`); grad.addColorStop(1, `rgba(${pal.accentRGB},0)`)
        ctx!.fillStyle = grad; ctx!.fillRect(0, y - 40, W, 80)
        ctx!.strokeStyle = `rgba(${pal.accentRGB},0.5)`; ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(W, y); ctx!.stroke()
      } else if (mode === 'benchmark') {
        const barX0 = W * 0.16, barW = W * 0.68, barY = H * 0.52, tickX = barX0 + 0.4 * barW
        ctx!.setLineDash([5, 5]); ctx!.strokeStyle = `rgba(${pal.ink},0.7)`; ctx!.lineWidth = 1.4
        ctx!.beginPath(); ctx!.moveTo(tickX, barY - H * 0.11); ctx!.lineTo(tickX, barY + H * 0.11); ctx!.stroke(); ctx!.setLineDash([])
        // tick label lives in the DOM stat label now (one text authority)
      } else if (mode === 'torrent') {
        // the reading frame — one legible document while thousands pour past
        const fx = W * 0.24, fy = H * 0.38, fw = 34 * KF, fh = 46 * KF
        ctx!.strokeStyle = `rgba(${pal.ink},0.85)`; ctx!.lineWidth = 1.2
        ctx!.strokeRect(fx - fw / 2, fy - fh / 2, fw, fh)
        // "one at a time" reading-rate note lives in the DOM annotation layer now
      } else if (mode === 'strata') {
        const barX0 = W * 0.16, barW = W * 0.68, barY = H * 0.56
        ctx!.strokeStyle = `rgba(${pal.ink},0.22)`; ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.moveTo(barX0, barY + H * 0.05); ctx!.lineTo(barX0 + barW, barY + H * 0.05); ctx!.stroke()
        // segment + tail numbers live in the DOM stat/agate now (one text authority);
        // the bracket stays to point the eye at the lifted high-risk tail.
        const tx0 = barX0 + 0.889 * barW, tx1 = barX0 + barW, ty = barY - H * 0.115
        ctx!.strokeStyle = `rgba(${pal.accentRGB},0.7)`; ctx!.lineWidth = 1.2
        ctx!.beginPath(); ctx!.moveTo(tx0, ty + 6); ctx!.lineTo(tx0, ty); ctx!.lineTo(tx1, ty); ctx!.lineTo(tx1, ty + 6); ctx!.stroke()
      } else if (mode === 'monopoly') {
        const pr = easeOut(clamp01(ls / (dur * 0.4)))
        const cx = W * 0.5, cy = H * 0.54, radius = Math.min(W, H) * 0.30
        for (let i = 0; i < 44; i++) {
          const a = (i / 44) * Math.PI * 2 - Math.PI / 2
          const ex = cx + Math.cos(a) * radius * pr, ey = cy + Math.sin(a) * radius * pr
          ctx!.strokeStyle = i < 36 ? `rgba(${pal.accentRGB},0.15)` : `rgba(${pal.ink},0.07)`; ctx!.lineWidth = 1
          ctx!.beginPath(); ctx!.moveTo(cx, cy); ctx!.lineTo(ex, ey); ctx!.stroke()
        }
        ctx!.fillStyle = `rgba(${pal.ink},0.9)`; ctx!.fillRect(cx - 5 * KF, cy - 6.5 * KF, 10 * KF, 13 * KF)
        // ring caption ("1 institution · 44 vendors") lives in the DOM stat label now
      } else if (mode === 'redact') {
        const sweepX = lerp(0, W * 1.05, easeOut(clamp01(ls / (dur * 0.6))))
        if (sweepX < W) {
          ctx!.strokeStyle = `rgba(${pal.accentRGB},0.5)`; ctx!.lineWidth = 1.5
          ctx!.beginPath(); ctx!.moveTo(sweepX, 0); ctx!.lineTo(sweepX, H); ctx!.stroke()
        }
      } else if (mode === 'spotlight') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        if (pr > 0.4) {
          const pulse = reduce ? 1 : 0.6 + 0.4 * Math.sin(ls * 0.005)
          ctx!.strokeStyle = `rgba(${pal.accentRGB},${0.4 * pulse})`; ctx!.lineWidth = 1.5
          ctx!.beginPath(); ctx!.arc(W * 0.5, H * 0.46, (30 + 8 * Math.sin(ls * 0.004)) * KF, 0, Math.PI * 2); ctx!.stroke()
        }
      } else if (mode === 'categorygrid') {
        const cols = 4, gw = W * 0.7, gh = H * 0.58, gx0 = W * 0.5 - gw / 2, gy0 = H * 0.2
        const cw = gw / cols, ch = gh / 3
        ctx!.font = `${Math.round(9 * KF)}px ui-monospace, monospace`; ctx!.textAlign = 'left'; ctx!.textBaseline = 'top'
        for (let s = 0; s < 12; s++) {
          const c = s % cols, rr = Math.floor(s / cols)
          const x = gx0 + c * cw + cw * 0.06, y = gy0 + rr * ch + ch * 0.06, w = cw * 0.88, hh = ch * 0.88
          const col = sectorHex(s)
          ctx!.strokeStyle = col + '55'; ctx!.lineWidth = 1; ctx!.strokeRect(x, y, w, hh)
          ctx!.fillStyle = col + 'cc'; ctx!.fillText(getSectorName(SECTOR_SLUGS[s], langRef.current).toUpperCase().slice(0, 9), x + 5, y + 5)
        }
        ctx!.textBaseline = 'alphabetic'
      } else if (mode === 'modelnet') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        const layX = [0.22, 0.42, 0.62, 0.82].map((f) => f * W), counts = [18, 12, 6, 1]
        ctx!.strokeStyle = `rgba(${pal.dim},${0.09 * pr})`; ctx!.lineWidth = 0.6
        for (let l = 0; l < 3; l++) {
          for (let a = 0; a < counts[l]; a++) {
            const ay = H * 0.26 + (a / Math.max(1, counts[l] - 1)) * H * 0.48
            for (let b = 0; b < counts[l + 1]; b++) {
              const by = H * 0.26 + (b / Math.max(1, counts[l + 1] - 1)) * H * 0.48
              ctx!.beginPath(); ctx!.moveTo(layX[l], ay); ctx!.lineTo(layX[l + 1], by); ctx!.stroke()
            }
          }
        }
      } else if (mode === 'network') {
        const pr = easeOut(clamp01(ls / (dur * 0.5)))
        ctx!.strokeStyle = `rgba(${pal.dim},${0.16 * pr})`; ctx!.lineWidth = 0.7
        const centers: [number, number][] = []
        for (let c = 0; c < 7; c++) centers.push([W * 0.5 + Math.cos((c / 7) * Math.PI * 2) * W * 0.26, H * 0.52 + Math.sin((c / 7) * Math.PI * 2) * H * 0.28])
        for (let c = 0; c < 7; c++) { const n2 = centers[(c + 1) % 7]; ctx!.beginPath(); ctx!.moveTo(centers[c][0], centers[c][1]); ctx!.lineTo(n2[0], n2[1]); ctx!.stroke() }
      } else if (mode === 'torch') {
        const pr = easeOut(clamp01(ls / (dur * 0.45)))
        const g = ctx!.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.24)
        g.addColorStop(0, `rgba(${pal.accentRGB},${0.16 * pr})`); g.addColorStop(1, `rgba(${pal.accentRGB},0)`)
        ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H)
        ctx!.strokeStyle = `rgba(${pal.ink},${0.5 * pr})`; ctx!.lineWidth = 3 * KF
        ctx!.beginPath(); ctx!.moveTo(W * 0.5, H * 0.82); ctx!.lineTo(W * 0.5, H * 0.95); ctx!.stroke()
      } else if (mode === 'ribbon' || mode === 'ribbontear') {
        const leftM = W * 0.08, rightM = W * 0.92, midY = H * 0.5, bandH = H * 0.3
        ctx!.strokeStyle = `rgba(${pal.dim},0.16)`; ctx!.lineWidth = 1
        for (const yb of [2006, 2012, 2018, 2024]) {
          const x = leftM + ((yb - 2002) / 23) * (rightM - leftM)
          ctx!.beginPath(); ctx!.moveTo(x, midY - bandH); ctx!.lineTo(x, midY + bandH); ctx!.stroke()
        }
        ctx!.fillStyle = `rgba(${pal.dim},0.7)`; ctx!.font = `${Math.round(10 * KF)}px ui-monospace, monospace`
        ctx!.textAlign = 'left'; ctx!.fillText('2002', leftM, midY + bandH + 18)
        ctx!.textAlign = 'right'; ctx!.fillText('2025', rightM, midY + bandH + 18); ctx!.textAlign = 'left'
        if (mode === 'ribbontear') {
          const tear = easeOut(clamp01(ls / (dur * 0.6)))
          const voidX = rightM - tear * (rightM - leftM) * 0.22
          ctx!.fillStyle = pal.bg; ctx!.fillRect(voidX, 0, W - voidX, H)
          ctx!.strokeStyle = `rgba(${pal.accentRGB},0.85)`; ctx!.lineWidth = 2 * KF
          ctx!.beginPath(); ctx!.moveTo(voidX, 0); ctx!.lineTo(voidX + Math.sin(ls * 0.02) * 5, H); ctx!.stroke()
        }
      } else if (mode === 'gauge') {
        const R = Math.min(W, H) * 0.34, cx = W * 0.5, cy = H * 0.70
        ctx!.strokeStyle = `rgba(${pal.dim},0.25)`; ctx!.lineWidth = 1.5
        ctx!.beginPath(); ctx!.arc(cx, cy, R, Math.PI, 0); ctx!.stroke()
        const needle = 0.787 * easeOut(clamp01(ls / (dur * 0.55))), na = Math.PI * (1 - needle)
        ctx!.strokeStyle = pal.accent; ctx!.lineWidth = 2 * KF
        ctx!.beginPath(); ctx!.moveTo(cx, cy); ctx!.lineTo(cx + Math.cos(na) * R * 0.92, cy - Math.sin(na) * R * 0.92); ctx!.stroke()
        ctx!.fillStyle = pal.accent; ctx!.beginPath(); ctx!.arc(cx, cy, 4 * KF, 0, Math.PI * 2); ctx!.fill()
      }
    }

    let ov = 0
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const idx = beatRef.current, parts = partsRef.current
      ctx!.fillStyle = pal.bg; ctx!.fillRect(0, 0, W, H)
      if (idx < N && parts.length) {
        const b = film.beats[idx], ls = now - stepStartRef.current
        ov += (1 - ov) * Math.min(1, dt * 3)
        const k = Math.min(1, dt * 4.0)
        // slow camera drift (ken-burns) for cinematic depth
        const driftT = now * 0.00006
        const zoom = reduce ? 1 : 1.025 + 0.02 * Math.sin(driftT)
        const panX = reduce ? 0 : Math.sin(driftT * 0.8) * W * 0.012
        const panY = reduce ? 0 : Math.cos(driftT * 0.6) * H * 0.012
        ctx!.save()
        ctx!.translate(W / 2 + panX, H / 2 + panY); ctx!.scale(zoom, zoom); ctx!.translate(-W / 2, -H / 2)
        // double-exposure: the structural systems (network, model, torch) bleed
        // through the document field as light, instead of sitting flat under it.
        // El Teatro de Papel — object scenes replace the particle layer per beat.
        const scene = b.renderer === 'objects' ? SCENES[b.mode] : undefined
        if (scene) {
        scene(ctx!, { ls, dur: b.durationMs, W, H, KF, lang: langRef.current, reduce: !!reduce, pal })
        } else {
        const bleed = b.mode === 'network' || b.mode === 'modelnet' || b.mode === 'torch'
        if (bleed) ctx!.globalCompositeOperation = 'screen'
        drawShapes(b.mode, ls, b.durationMs)
        if (bleed) ctx!.globalCompositeOperation = 'source-over'
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i], tg = targetFor(p, b.mode, ls, b.durationMs)
          p.cx += (tg.x - p.cx) * k; p.cy += (tg.y - p.cy) * k
          p.cr += (tg.r - p.cr) * k; p.ca += (tg.a * ov - p.ca) * k; p.tier = tg.tier
          if (p.ca <= 0.01) continue
          let dx = reduce ? 0 : Math.sin(now * 0.0011 + p.phase) * 0.8
          let dy = reduce ? 0 : Math.cos(now * 0.0013 + p.phase) * 0.7
          if (b.mode === 'lattice') {
            // Capture as frozen motion — the organic wobble stops dead.
            const freeze = easeOut(clamp01(ls / (b.durationMs * 0.5)))
            dx *= 1 - freeze; dy *= 1 - freeze
          }
          const gx2 = p.cx + dx, gy2 = p.cy + dy, rr2 = Math.max(0.5, p.cr)
          // Ghost vendors — a hollow stroked ring: registered shape, no substance.
          if (b.mode === 'ghosts' && p.ghost) {
            ctx!.strokeStyle = `rgba(${pal.ink},${p.ca})`
            ctx!.lineWidth = 1
            ctx!.beginPath(); ctx!.arc(gx2, gy2, rr2, 0, Math.PI * 2); ctx!.stroke()
            continue
          }
          const isCat = b.mode === 'categorygrid'
          const isRibbon = (b.mode === 'ribbon' || b.mode === 'ribbontear') && p.tier !== 2
          if (isCat) { ctx!.globalAlpha = p.ca; ctx!.fillStyle = sectorHex(p.sector) }
          else if (isRibbon) { ctx!.globalAlpha = p.ca; ctx!.fillStyle = SEXENIO_COLORS[p.term] ?? pal.accent }
          else ctx!.fillStyle = dotColor(p.tier, p.ca)
          if (film.glyph === 'doc') { const gw2 = rr2 * 1.35, gh2 = rr2 * 1.85; ctx!.fillRect(gx2 - gw2 / 2, gy2 - gh2 / 2, gw2, gh2) }
          else { ctx!.beginPath(); ctx!.arc(gx2, gy2, rr2, 0, Math.PI * 2); ctx!.fill() }
          if (isCat || isRibbon) ctx!.globalAlpha = 1
        }
        }
        ctx!.restore()
      }
      raf = requestAnimationFrame(frame)
    }

    build()
    raf = requestAnimationFrame(frame)
    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [film, reduce, N, pal])

  // ── advance ──
  const advance = useCallback(() => setBeatIdx((i) => Math.min(N, i + 1)), [N])
  const next = useCallback(() => setBeatIdx((i) => Math.min(N, i + 1)), [N])
  const prev = useCallback(() => setBeatIdx((i) => Math.max(0, i - 1)), [])
  const restart = useCallback(() => { setBeatIdx(0); setPlaying(true) }, [])

  // timer pacing (sound off)
  useEffect(() => {
    if (!started || !playing || sound || atEnd) return
    const b = film.beats[beatIdx]
    const dur = b ? beatDwellMs(b, lang) : 22000
    const id = setTimeout(advance, dur)
    return () => clearTimeout(id)
  }, [beatIdx, started, playing, sound, atEnd, film, lang, advance])

  // narration pacing (sound on): mp3 per beat, browser-TTS fallback, advance on end
  useEffect(() => {
    if (!started || !sound || !playing || atEnd) return
    const b = film.beats[beatIdx]
    if (b.silence) {
      duckMusic(false)
      const sid = setTimeout(advance, b.durationMs)
      return () => clearTimeout(sid)
    }
    let cancelled = false, advanced = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    duckMusic(true)
    const doAdvance = () => { if (!cancelled && !advanced) { advanced = true; duckMusic(false); advance() } }
    // When a real VO clip is present it plays to the end and drives pacing. When it
    // is missing (e.g. el-registro before neural VO is regenerated), pace on the
    // beat's durationMs and let browser-TTS narrate UNDERNEATH — its end/error events
    // are unreliable (they can fire instantly) and must never race the film.
    const useFallback = () => {
      if (cancelled || fallbackTimer) return
      fallbackTimer = setTimeout(doAdvance, beatDwellMs(b, lang))
      try {
        const synth = window.speechSynthesis
        if (synth) {
          synth.cancel()
          const u = new SpeechSynthesisUtterance(b.caption[lang])
          u.lang = lang === 'es' ? 'es-MX' : 'en-US'; u.rate = 0.95
          synth.speak(u)
        }
      } catch { /* subtitles carry it; the timer paces */ }
    }
    const a = new Audio(); audioRef.current = a
    a.src = `/gallery-vo/${film.slug}/${lang}/${b.id}.mp3`
    a.onended = () => { if (!cancelled) { duckMusic(false); setTimeout(doAdvance, 400) } }
    a.onerror = useFallback
    const p = a.play()
    if (p && p.catch) p.catch(useFallback)
    return () => {
      cancelled = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      try { a.pause() } catch { /* */ }
      try { window.speechSynthesis?.cancel() } catch { /* */ }
    }
  }, [beatIdx, started, sound, playing, atEnd, film, lang, advance, duckMusic])

  // sound design — fire a cue on every beat transition
  useEffect(() => {
    if (!started || atEnd) return
    const m = film.beats[beatIdx]?.mode
    playSfx('whoosh')
    if (m === 'torch' || m === 'gauge' || m === 'spotlight' || m === 'mark' || m === 'split' || m === 'ribbontear') {
      const id = setTimeout(() => playSfx('boom'), 360); return () => clearTimeout(id)
    }
    if (m === 'network' || m === 'modelnet') {
      const id = setTimeout(() => playSfx('ping'), 300); return () => clearTimeout(id)
    }
  }, [beatIdx, started, atEnd, film, playSfx])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started) return
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key.toLowerCase() === 'r') restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, restart, started])

  const start = useCallback(() => {
    setStarted(true); setSound(true); setPlaying(true); setBeatIdx(0)
    stepStartRef.current = performance.now()
    startMusic()
  }, [startMusic])

  const toggleSound = useCallback(() => {
    setSound((s) => {
      const ns = !s
      if (ns) startMusic(); else { stopMusic(); try { audioRef.current?.pause(); window.speechSynthesis?.cancel() } catch { /* */ } }
      return ns
    })
  }, [startMusic, stopMusic])

  const totalMs = useMemo(() => film.beats.reduce((a, b) => a + b.durationMs, 0), [film])
  const elapsedMs = useMemo(() => film.beats.slice(0, Math.min(beatIdx, N)).reduce((a, b) => a + b.durationMs, 0), [beatIdx, film, N])
  // Continuous within-beat timer — the timecode is the sum of COMPLETED beats, so on a
  // long beat it sat frozen (the 17s opener read as "stuck"). Tick inside the current beat.
  const [beatElapsed, setBeatElapsed] = useState(0)
  useEffect(() => {
    setBeatElapsed(0)
    if (!started || !playing || atEnd) return
    const t0 = performance.now()
    const id = setInterval(() => setBeatElapsed(performance.now() - t0), 250)
    return () => clearInterval(id)
  }, [beatIdx, started, playing, atEnd])
  const curDur = film.beats[Math.min(beatIdx, N - 1)]?.durationMs ?? 0
  const shownMs = Math.min(elapsedMs + Math.min(beatElapsed, curDur), totalMs)

  return (
    <div className="overflow-hidden rounded-md border border-border" style={{ background: pal.bg }}>
      <div ref={wrapRef} className="relative" style={{ minHeight: '68vh' }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* vignette */}
        <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: 'radial-gradient(125% 95% at 50% 42%, transparent 52%, rgba(0,0,0,0.62) 100%)' }} />
        {/* paper grain — the "premium" texture tell, near-free */}
        <div
          className="pointer-events-none absolute inset-0 z-[6]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.05,
            mixBlendMode: 'overlay',
          }}
        />

        {/* tag */}
        <div className="pointer-events-none absolute left-0 right-0 top-6 z-10 text-center">
          <AnimatePresence mode="wait">
            {started && beat && (
              <motion.div key={`tag-${beatIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: `rgba(${pal.accentRGB},0.85)` }}>
                {t(beat.tag)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* chapter wayfinding cue */}
        <div className="pointer-events-none absolute left-5 top-5 z-10">
          <AnimatePresence mode="wait">
            {started && beat?.chapterLabel && (
              <motion.div key={`ch-${beatIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} exit={{ opacity: 0 }}
                className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `rgba(${pal.dim},0.8)` }}>
                {t(beat.chapterLabel)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* stat — slot-positioned (Intro redesign 2026-07-03). Never a forced centre pile;
            each beat's layout.slot places it in a rail, a corner stamp, the hero centre, or nowhere. */}
        {(() => {
          const slot: StatSlot = beat?.layout?.slot ?? 'hero'
          if (!started || !beat?.stat || slot === 'none') return null
          const isRailR = slot === 'rail-right'
          const isStamp = slot === 'stamp'
          const wrap =
            slot === 'hero' ? 'inset-x-0 top-[23%] items-center px-6 text-center'
            : isRailR ? 'right-[5%] top-[19%] max-w-[38%] items-end text-right'
            : slot === 'rail-left' ? 'left-[5%] top-[19%] max-w-[38%] items-start text-left'
            : 'right-[5%] top-[14%] items-end text-right' // stamp
          const dim = (o: number) => `rgba(${pal.dim},${o})`
          return (
            <div className={`pointer-events-none absolute z-10 flex flex-col ${wrap}`}>
              <AnimatePresence mode="wait">
                <motion.div key={`stat-${beatIdx}`} className="flex flex-col"
                  style={{ alignItems: slot === 'hero' ? 'center' : isRailR || isStamp ? 'flex-end' : 'flex-start' }}
                  initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduce ? 0 : -10 }}
                  transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}>
                  {isStamp ? (
                    <div className="inline-block font-mono uppercase" style={{
                      transform: 'rotate(-3deg)', border: `1px solid ${beat.stat.red ? pal.accent : dim(0.6)}`,
                      color: beat.stat.red ? pal.accent : `rgba(${pal.ink},0.9)`, padding: '6px 12px',
                      fontSize: 'clamp(0.8rem, 1.7vw, 1.15rem)', letterSpacing: '0.22em', background: 'rgba(12,10,9,0.5)',
                    }}>{beat.stat.text}</div>
                  ) : (
                    <StatNumber beat={beat} accent={pal.accent} slot={slot} mono={beat.layout?.mono} />
                  )}
                  {beat.stat.mxn != null && (
                    <div className="mt-1 font-mono tabular-nums" style={{ color: dim(0.75), fontSize: 'clamp(0.7rem, 1.2vw, 0.95rem)', letterSpacing: '0.04em' }}>
                      ≈ {formatCompactUSD(beat.stat.mxn)}
                    </div>
                  )}
                  {!isStamp && (
                    <div className="mt-2.5 max-w-[34ch] font-mono text-[11px] uppercase leading-snug tracking-[0.12em]" style={{ color: dim(0.9) }}>
                      {t(beat.stat.label)}
                    </div>
                  )}
                  {isStamp && (
                    <div className="mt-2 max-w-[30ch] font-mono text-[10px] uppercase leading-snug tracking-[0.12em]" style={{ color: dim(0.85) }}>
                      {t(beat.stat.label)}
                    </div>
                  )}
                  {beat.agate && (
                    <div className="mt-2 max-w-[38ch] font-mono text-[9px] leading-snug" style={{ color: dim(0.6) }}>
                      {t(beat.agate)}
                    </div>
                  )}
                  {beat.verdict && <div className="mt-4 font-serif text-xl italic" style={{ color: 'white' }}>{t(beat.verdict)}</div>}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        })()}

        {/* annotation layer — DOM pills pinned on the stage; the single text authority for
            scene labels (replaces canvas fillText that used to collide with the stat). */}
        {started && beat?.layout?.annotations?.map((a, i) => (
          <div key={`ann-${beatIdx}-${i}`} className="pointer-events-none absolute z-10 whitespace-nowrap font-mono uppercase"
            style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%,-50%)', fontSize: '9.5px', letterSpacing: '0.14em',
              color: a.red ? pal.accent : `rgba(${pal.ink},0.82)`, background: 'rgba(12,10,9,0.72)', border: `1px solid rgba(${pal.ink},0.14)`, padding: '2px 6px', borderRadius: 2 }}>
            {t(a.text)}
          </div>
        ))}

        {/* lower-third subtitle scrim — guarantees the chyron reads over any scene ink */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-[36%]" style={{ background: 'linear-gradient(to bottom, transparent, rgba(12,10,9,0.9))' }} />

        {/* lower-third subtitle — left-aligned documentary chyron, ≤3 lines, accent left-rule */}
        <div className="pointer-events-none absolute left-[5%] right-[10%] bottom-[7%] z-10">
          <AnimatePresence mode="wait">
            {started && beat && !beat.silence && t(beat.caption) && (
              <motion.p key={`cap-${beatIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                className="border-l-2 pl-4 leading-snug"
                style={{ borderColor: pal.accent, maxWidth: '58ch', fontFamily: 'var(--font-family-serif, Georgia, serif)', fontSize: 'clamp(0.95rem, 2vw, 1.08rem)', color: `rgba(${pal.ink},0.94)`, textShadow: '0 1px 18px rgba(0,0,0,0.9)',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t(beat.caption)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* act-break title card */}
        <AnimatePresence>
          {started && beat?.mode === 'titlecard' && (
            <motion.div key={`card-${beatIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center" style={{ background: pal.bg }}>
              <div className="font-mono text-[12px] uppercase tracking-[0.4em]" style={{ color: `rgba(${pal.dim},0.9)` }}>
                {beat.cardKicker ? t(beat.cardKicker) : ''}
              </div>
              <h2 className="mt-3" style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 600, fontStyle: 'italic', fontSize: 'clamp(2.2rem, 7vw, 4.2rem)', color: 'white' }}>
                {beat.cardTitle ? t(beat.cardTitle) : ''}
              </h2>
              <div className="mt-5 h-[3px] w-16" style={{ background: pal.accent }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* title-card poster (also unlocks audio) */}
        <AnimatePresence>
          {!started && (
            <motion.button key="poster" onClick={start} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center px-6 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color: pal.accent }}>
                {lang === 'es' ? 'RUBLI presenta · Reportaje animado' : 'RUBLI presents · An animated report'}
              </div>
              <h2 className="mt-4 max-w-3xl" style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 600, fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', lineHeight: 1.02, color: 'white' }}>
                {t(film.title)}
              </h2>
              <p className="mt-4 max-w-xl text-sm" style={{ color: `rgba(${pal.ink},0.78)` }}>{t(film.subtitle)}</p>
              <div className="mt-6 h-px w-16" style={{ background: pal.accent }} />
              <span className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em]" style={{ backgroundColor: pal.accent, color: 'white' }}>
                <Play className="h-4 w-4" /> {lang === 'es' ? 'Reproducir con sonido' : 'Play with sound'}
              </span>
              <span className="mt-3 font-mono text-[10px]" style={{ color: `rgba(${pal.dim},0.8)` }}>
                {film.beats.length} {lang === 'es' ? 'capítulos' : 'chapters'} · {fmtTime(totalMs)}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* end card */}
        <AnimatePresence>
          {started && atEnd && (
            <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center" style={{ background: pal.bg }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: `rgba(${pal.dim},0.9)` }}>
                {lang === 'es' ? 'Fin del reportaje' : 'End of report'}
              </div>
              <h2 className="mt-3" style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)', fontWeight: 600, fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: 'white' }}>{t(film.title)}</h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button onClick={restart} className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.14em]" style={{ color: 'white' }}>
                  <RotateCcw className="h-3.5 w-3.5" /> {lang === 'es' ? 'Repetir' : 'Replay'}
                </button>
                {onOpenFull && (
                  <button onClick={onOpenFull} className="inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-[0.14em]" style={{ backgroundColor: pal.accent, color: 'white' }}>
                    {lang === 'es' ? 'Leer el reportaje' : 'Read the full story'} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="border-t border-border px-4 py-3" style={{ background: pal.bg }}>
        <div className="mb-3 flex items-center gap-1">
          {film.beats.map((b, i) => (
            <div key={b.id} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: `rgba(${pal.dim},0.22)` }}>
              <div className="h-full rounded-full" style={{ background: pal.accent, width: beatIdx > i ? '100%' : beatIdx === i ? '50%' : '0%', transition: 'width 0.3s' }} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prev} aria-label="prev" className="rounded-sm p-1.5" style={{ color: `rgba(${pal.dim},0.95)` }}><SkipBack className="h-4 w-4" /></button>
            <button onClick={() => (atEnd ? restart() : started ? setPlaying((p) => !p) : start())} aria-label="play" className="rounded-sm p-1.5" style={{ color: 'white' }}>
              {atEnd ? <RotateCcw className="h-4 w-4" /> : !started || !playing ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button onClick={next} aria-label="next" className="rounded-sm p-1.5" style={{ color: `rgba(${pal.dim},0.95)` }}><SkipForward className="h-4 w-4" /></button>
            <button onClick={toggleSound} aria-label="sound" className="ml-1 rounded-sm p-1.5" style={{ color: sound ? pal.accent : `rgba(${pal.dim},0.95)` }}>
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
          <div className="font-mono text-[11px] tabular-nums" style={{ color: `rgba(${pal.dim},0.9)` }}>
            {fmtTime(shownMs)} / {fmtTime(totalMs)}
          </div>
        </div>
      </div>
    </div>
  )
}
