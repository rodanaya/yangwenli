import { useEffect, useRef } from 'react'

/**
 * ContractField — canvas particle visualization for the RUBLI hero.
 *
 * Concept: ~800 particles represent a sample of the 3.05M procurement
 * contracts. They begin as a uniform grey cloud ("all contracts look the
 * same"). After ~1.5s they self-organize:
 *   - ~6% burn red (critical risk) and cluster into 2-3 attractors
 *     (mimicking vendor/capture networks)
 *   - ~7.5% glow amber (high risk) and drift outward on orbital paths
 *   - ~27% pulse medium (dim amber) as a loose dispersed shell
 *   - ~59% scatter grey (low risk) as ambient background
 *
 * The distribution matches the v0.6.5 risk model (HR = 13.49%).
 *
 * Performance notes:
 *   - requestAnimationFrame loop, cleaned up on unmount
 *   - DPR-aware canvas sizing, capped at 2 for perf
 *   - Particles capped at 800 (scales down to 450 on small viewports)
 *   - Pointer events enabled for cursor repulsion; parent can still stack
 *     text above with z-index.
 */

// Risk distribution from v0.6.5 model
const RISK_DIST = {
  critical: 0.0601,
  high: 0.0748,
  medium: 0.2684,
  // low is the remainder
} as const

type RiskKind = 'critical' | 'high' | 'medium' | 'low'

interface Particle {
  // Current position
  x: number
  y: number
  // Velocity (drift)
  vx: number
  vy: number
  // Target (for phase 2 self-organization)
  tx: number
  ty: number
  // Visual
  r: number
  baseAlpha: number
  // Risk assignment
  risk: RiskKind
  // Cluster index for critical particles (which attractor they belong to)
  cluster: number
  // Phase jitter offset for pulsing
  phase: number
  // Tiny eased progress for self-organize (0..1)
  organize: number
}

interface Attractor {
  x: number
  y: number
  // Small slow orbit for breath
  ox: number
  oy: number
}

// Seeded RNG so the particle field is deterministic across reloads.
// Mulberry32 — fast, good enough.
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function assignRisk(rng: () => number): RiskKind {
  const u = rng()
  if (u < RISK_DIST.critical) return 'critical'
  if (u < RISK_DIST.critical + RISK_DIST.high) return 'high'
  if (u < RISK_DIST.critical + RISK_DIST.high + RISK_DIST.medium) return 'medium'
  return 'low'
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export default function ContractField({
  className = '',
  ariaLabel = 'Animated background showing procurement contract risk distribution',
}: {
  className?: string
  ariaLabel?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const attractorsRef = useRef<Attractor[]>([])
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  })
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Respect reduced-motion preference: render a single static frame and bail.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // -------- sizing --------
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h, dpr }
      seedParticles(w, h)
    }

    // -------- particle seed --------
    const seedParticles = (w: number, h: number) => {
      const count = w < 720 ? 450 : 800

      // 3 attractors — right-weighted so they don't fight headline text.
      // These are the DESTINATION of critical particles (vendor networks).
      const attractors: Attractor[] = [
        { x: w * 0.74, y: h * 0.38, ox: 0, oy: 0 },
        { x: w * 0.86, y: h * 0.65, ox: 0, oy: 0 },
        { x: w * 0.63, y: h * 0.75, ox: 0, oy: 0 },
      ]
      attractorsRef.current = attractors

      const parts: Particle[] = []
      const seededRng = makeRng(1337)

      for (let i = 0; i < count; i++) {
        const risk = assignRisk(seededRng)

        // Phase 1 (start): all particles scattered uniformly across canvas —
        // every contract looks identical, indistinguishable.
        const sx = seededRng() * w
        const sy = seededRng() * h

        // Phase 2 (target): risk drives where they end up.
        let tx = 0
        let ty = 0
        let cluster = 0

        if (risk === 'critical') {
          // Pull toward one of 3 tight clusters — vendor capture networks.
          cluster = Math.floor(seededRng() * attractors.length)
          const c = attractors[cluster]
          const ang = seededRng() * Math.PI * 2
          const r = 6 + Math.pow(seededRng(), 1.4) * 32
          tx = c.x + Math.cos(ang) * r
          ty = c.y + Math.sin(ang) * r
        } else if (risk === 'high') {
          // Loose orbital band around the cluster cloud
          const ang = seededRng() * Math.PI * 2
          const band = Math.min(w, h) * (0.20 + seededRng() * 0.10)
          tx = w * 0.74 + Math.cos(ang) * band
          ty = h * 0.52 + Math.sin(ang) * band * 0.68
        } else {
          // Low + medium: stay scattered across canvas — they don't move much.
          // Target is close to start so they only drift slightly.
          tx = sx + (seededRng() - 0.5) * w * 0.12
          ty = sy + (seededRng() - 0.5) * h * 0.12
        }

        // Clamp
        tx = Math.max(6, Math.min(w - 6, tx))
        ty = Math.max(6, Math.min(h - 6, ty))

        const r =
          risk === 'critical'
            ? 1.5 + seededRng() * 0.8
            : risk === 'high'
              ? 1.1 + seededRng() * 0.5
              : 0.65 + seededRng() * 0.35

        const baseAlpha =
          risk === 'critical' ? 0.88
          : risk === 'high'   ? 0.70
          : risk === 'medium' ? 0.28
          : 0.18

        parts.push({
          x: sx,
          y: sy,
          vx: (seededRng() - 0.5) * 0.06,
          vy: (seededRng() - 0.5) * 0.06,
          tx,
          ty,
          r,
          baseAlpha,
          risk,
          cluster,
          phase: seededRng() * Math.PI * 2,
          organize: 0,
        })
      }
      particlesRef.current = parts
    }

    resize()
    // ResizeObserver tracks container resizes (not just window)
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // -------- pointer --------
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current.x = e.clientX - rect.left
      pointerRef.current.y = e.clientY - rect.top
      pointerRef.current.active = true
    }
    const onLeave = () => {
      pointerRef.current.active = false
      pointerRef.current.x = -9999
      pointerRef.current.y = -9999
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    // -------- render loop --------
    const draw = (now: number) => {
      if (!startRef.current) startRef.current = now
      const t = (now - startRef.current) / 1000 // seconds

      const { w, h } = sizeRef.current
      const parts = particlesRef.current
      const attractors = attractorsRef.current

      // Clear fully — additive blending was washing out the colors.
      // Clean frame gives crisp, readable particles.
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)

      // Gentle orbit for attractors — the corruption clusters "breathe".
      for (let i = 0; i < attractors.length; i++) {
        const a = attractors[i]
        a.ox = Math.cos(t * 0.25 + i * 1.7) * 6
        a.oy = Math.sin(t * 0.31 + i * 2.1) * 4
      }

      // Organization timing:
      //   0.0 - 1.2s: uniform grey cloud, gentle drift
      //   1.2 - 3.8s: ease into targets, colors fade in
      //   3.8s+    : steady-state drift with micro brownian motion
      const organizeStart = 1.2
      const organizeEnd = 3.8

      ctx.globalCompositeOperation = 'source-over'

      const pointer = pointerRef.current

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]

        // Per-particle ease with a slight stagger so the "reveal" feels
        // organic rather than synchronized.
        const stagger = (i % 60) / 60 // 0..1
        const local = Math.max(0, Math.min(1, (t - organizeStart - stagger * 0.4) / (organizeEnd - organizeStart)))
        p.organize = easeInOutCubic(local)

        // During phase 1 the particle wanders freely. After phase 1 start,
        // we pull it toward the target position with a spring-ish force.
        if (t > organizeStart) {
          let tx = p.tx
          let ty = p.ty
          // Critical particles follow their orbiting attractor
          if (p.risk === 'critical') {
            const a = attractors[p.cluster]
            const dx = p.tx - (a.x) // relative offset from original attractor center
            const dy = p.ty - (a.y)
            tx = a.x + a.ox + dx
            ty = a.y + a.oy + dy
          }
          const k = 0.012 + p.organize * 0.02
          p.vx += (tx - p.x) * k
          p.vy += (ty - p.y) * k
        }

        // Cursor repulsion — only once particle has organized (otherwise
        // the initial bunched cloud explodes in a weird way on first mouse-in).
        if (pointer.active && p.organize > 0.2) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d2 = dx * dx + dy * dy
          const R = 90
          if (d2 < R * R && d2 > 0.5) {
            const d = Math.sqrt(d2)
            const force = (1 - d / R) * 0.9
            p.vx += (dx / d) * force
            p.vy += (dy / d) * force
          }
        }

        // Gentle brownian drift (always on)
        p.vx += (Math.random() - 0.5) * 0.04
        p.vy += (Math.random() - 0.5) * 0.04

        // Damping — heavier during steady-state to keep the field calm
        const damp = t > organizeEnd ? 0.9 : 0.94
        p.vx *= damp
        p.vy *= damp

        // Velocity cap — prevents runaway energy
        const vmag2 = p.vx * p.vx + p.vy * p.vy
        const vcap = 1.6
        if (vmag2 > vcap * vcap) {
          const vm = Math.sqrt(vmag2)
          p.vx = (p.vx / vm) * vcap
          p.vy = (p.vy / vm) * vcap
        }

        p.x += p.vx
        p.y += p.vy

        // Soft edge wrap for low-risk scatter particles (keeps background lively)
        if (p.risk === 'low') {
          if (p.x < -4) p.x = w + 4
          if (p.x > w + 4) p.x = -4
          if (p.y < -4) p.y = h + 4
          if (p.y > h + 4) p.y = -4
        }

        // Draw
        // Before organize, color is uniform grey. Blend into risk color as
        // organize progresses.
        const org = p.organize
        // Subtle pulse on critical/high — tiny scale oscillation, glow breath.
        const pulse =
          p.risk === 'critical'
            ? 0.85 + Math.sin(t * 2.8 + p.phase) * 0.15
            : p.risk === 'high'
              ? 0.9 + Math.sin(t * 1.6 + p.phase) * 0.1
              : 1

        const alpha = (p.baseAlpha * (0.35 + 0.65 * org) + 0.12 * (1 - org)) * pulse

        let r = 82, g = 82, b = 91 // zinc-600 default
        if (org > 0) {
          if (p.risk === 'critical') {
            r = 239; g = 68; b = 68 // red-500
          } else if (p.risk === 'high') {
            r = 245; g = 158; b = 11 // amber-500
          } else if (p.risk === 'medium') {
            // Dim amber/bronze — between low grey and amber
            r = 180; g = 120; b = 60
          } else {
            r = 82; g = 82; b = 91 // zinc-600
          }
          // Blend from neutral grey to risk color
          r = Math.round(82 + (r - 82) * org)
          g = Math.round(82 + (g - 82) * org)
          b = Math.round(91 + (b - 91) * org)
        }

        const radius = p.r * pulse

        // Halo for critical & high (radial gradient is expensive per-particle
        // — use stacked circles with low alpha instead).
        if (p.risk === 'critical' && org > 0.3) {
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.18})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 4.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.32})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 2.4, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.risk === 'high' && org > 0.3) {
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.22})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 2.6, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Vendor network lines — connect critical particles within the same cluster.
      // This is the key visual: it makes the corruption network legible.
      if (t > organizeEnd - 0.6) {
        const fadeIn = Math.min(1, (t - (organizeEnd - 0.6)) / 1.2)
        // Pulse the lines subtly so they feel alive
        const pulse = 0.78 + Math.sin(t * 1.1) * 0.22
        const netAlpha = fadeIn * pulse

        for (let c = 0; c < attractors.length; c++) {
          const members: Particle[] = []
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].risk === 'critical' && parts[i].cluster === c && parts[i].organize > 0.6) {
              members.push(parts[i])
            }
          }

          for (let i = 0; i < members.length; i++) {
            const a = members[i]
            let best1 = -1, best2 = -1
            let d1 = Infinity, d2 = Infinity
            for (let j = 0; j < members.length; j++) {
              if (j === i) continue
              const b = members[j]
              const dx = a.x - b.x; const dy = a.y - b.y
              const d = dx * dx + dy * dy
              if (d < d1) { d2 = d1; best2 = best1; d1 = d; best1 = j }
              else if (d < d2) { d2 = d; best2 = j }
            }
            // Primary edge — clear red, visible
            if (best1 >= 0) {
              const b = members[best1]
              ctx.lineWidth = 0.9
              ctx.strokeStyle = `rgba(239, 68, 68, ${netAlpha * 0.55})`
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
            }
            // Secondary edge — fainter, distance-capped
            if (best2 >= 0 && d2 < 3600) {
              const b = members[best2]
              ctx.lineWidth = 0.5
              ctx.strokeStyle = `rgba(239, 68, 68, ${netAlpha * 0.28})`
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
            }
          }
        }
      }

      if (!prefersReduced) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    if (prefersReduced) {
      // Render one fully-organized frame (jump to t = 5s-equivalent).
      startRef.current = performance.now() - 5000
      draw(performance.now())
    } else {
      rafRef.current = requestAnimationFrame(draw)
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  )
}
