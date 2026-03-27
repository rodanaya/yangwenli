import { useEffect, useRef, useState, useCallback, useMemo, memo, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useInView, useMotionValue, animate as fmAnimate } from 'framer-motion'
import { ArrowRight, ChevronDown, Shield, Search, BarChart3, FileWarning } from 'lucide-react'
import { analysisApi, phiApi } from '@/api/client'
import type { FastDashboardData } from '@/api/types'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SECTOR_COLORS: Record<string, string> = {
  salud: '#dc2626',
  educacion: '#3b82f6',
  infraestructura: '#ea580c',
  energia: '#eab308',
  defensa: '#1e3a5f',
  tecnologia: '#8b5cf6',
  hacienda: '#16a34a',
  gobernacion: '#be123c',
  agricultura: '#22c55e',
  ambiente: '#10b981',
  trabajo: '#f97316',
  otros: '#64748b',
}

const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'S':  { text: '#34d399', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(52,211,153,0.25)' },
  'A':  { text: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)' },
  'B+': { text: '#a3e635', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(163,230,53,0.20)' },
  'B':  { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)' },
  'C+': { text: '#fcd34d', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(252,211,77,0.20)' },
  'C':  { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
  'D':  { text: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)' },
  'D-': { text: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(248,113,113,0.20)' },
  'F':  { text: '#fca5a5', bg: 'rgba(153,27,27,0.12)',   border: 'rgba(239,68,68,0.20)' },
  'F-': { text: '#fca5a5', bg: 'rgba(28,5,5,0.75)',      border: 'rgba(153,27,27,0.40)' },
}

const SERIF = "'Playfair Display', Georgia, serif"
const CRIMSON = '#c41e3a'

// ---------------------------------------------------------------------------
// GradientMeshBackground -- 3 animated radial-gradient orbs
// ---------------------------------------------------------------------------
const GradientMeshBackground = memo(function GradientMeshBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {/* Crimson orb */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '50vw',
          height: '50vw',
          maxWidth: 600,
          maxHeight: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,30,58,0.35) 0%, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'meshOrb1 12s ease-in-out infinite alternate',
        }}
      />
      {/* Dark green orb */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '45vw',
          height: '45vw',
          maxWidth: 550,
          maxHeight: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,46,22,0.45) 0%, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'meshOrb2 15s ease-in-out infinite alternate',
        }}
      />
      {/* Secondary crimson orb */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '60%',
          width: '40vw',
          height: '40vw',
          maxWidth: 500,
          maxHeight: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,30,58,0.2) 0%, transparent 70%)',
          filter: 'blur(120px)',
          animation: 'meshOrb3 18s ease-in-out infinite alternate',
        }}
      />
      <style>{`
        @keyframes meshOrb1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -30px) scale(1.1); }
        }
        @keyframes meshOrb2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-35px, 25px) scale(1.08); }
        }
        @keyframes meshOrb3 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(25px, 40px) scale(0.95); }
        }
      `}</style>
    </div>
  )
})

// ---------------------------------------------------------------------------
// useParticles -- canvas-based upward-drifting crimson particles
// ---------------------------------------------------------------------------
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  life: number
  maxLife: number
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    const particles: Particle[] = []
    const PARTICLE_COUNT = 60

    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const parent = canvas.parentElement
    const observer = new ResizeObserver(updateSize)
    if (parent) observer.observe(parent)
    updateSize()

    const spawnParticle = (): Particle => {
      const w = canvas.parentElement?.clientWidth ?? 1200
      const h = canvas.parentElement?.clientHeight ?? 800
      return {
        x: Math.random() * w,
        y: h + Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.3 + Math.random() * 0.7),
        alpha: 0.15 + Math.random() * 0.35,
        size: 1 + Math.random() * 2,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      }
    }

    // Pre-populate
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = spawnParticle()
      p.life = Math.random() * p.maxLife
      p.y -= p.life * Math.abs(p.vy)
      particles.push(p)
    }

    const draw = () => {
      const w = canvas.parentElement?.clientWidth ?? 1200
      const h = canvas.parentElement?.clientHeight ?? 800
      ctx.clearRect(0, 0, w, h)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++

        const lifeRatio = p.life / p.maxLife
        const fadeAlpha = lifeRatio < 0.1
          ? p.alpha * (lifeRatio / 0.1)
          : lifeRatio > 0.7
            ? p.alpha * (1 - (lifeRatio - 0.7) / 0.3)
            : p.alpha

        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = spawnParticle()
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(196, 30, 58, ${fadeAlpha})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
    }
  }, [canvasRef])
}

const ParticleCanvas = memo(function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticles(canvasRef)
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  )
})

// ---------------------------------------------------------------------------
// SplitTextHero -- GSAP split-text letter animation for hero title
// ---------------------------------------------------------------------------
function SplitTextHero({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const spans = el.querySelectorAll<HTMLSpanElement>('.split-letter')
    if (spans.length === 0) return

    gsap.from(spans, {
      y: 60,
      opacity: 0,
      scale: 0.8,
      duration: 0.7,
      ease: 'back.out(1.7)',
      stagger: 0.08,
      delay: 0.1,
    })
  }, [text])

  return (
    <span ref={containerRef} className={className} style={style}>
      {text.split('').map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="split-letter"
          style={{
            display: ch === ' ' ? 'inline' : 'inline-block',
            textShadow: '0 0 30px rgba(196,30,58,0.4), 0 0 60px rgba(196,30,58,0.15)',
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ManifestoCounters -- 3 giant count-up numbers triggered by scroll
// ---------------------------------------------------------------------------
function ManifestoCounterItem({ target, prefix, suffix, label }: {
  target: number
  prefix?: string
  suffix?: string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const motionVal = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!isInView) return
    const ctrl = fmAnimate(motionVal, target, {
      duration: 2.5,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => ctrl.stop()
  }, [isInView, target, motionVal])

  useEffect(() => {
    const unsub = motionVal.on('change', (v) => {
      if (target >= 1000) {
        setDisplay(Math.round(v).toLocaleString())
      } else if (target >= 10) {
        setDisplay(v.toFixed(1))
      } else {
        setDisplay(v.toFixed(1))
      }
    })
    return unsub
  }, [motionVal, target])

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <span
        className="font-black tabular-nums font-mono leading-none"
        style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          color: '#f0ede8',
          letterSpacing: '-0.04em',
        }}
      >
        {prefix}{display}{suffix}
      </span>
      <span
        className="text-sm sm:text-base font-medium tracking-wide uppercase"
        style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
    </div>
  )
}

const ManifestoCounters = memo(function ManifestoCounters({ isEn, highRiskPct }: { isEn: boolean; highRiskPct: number }) {
  return (
    <section
      className="relative px-6 sm:px-12 lg:px-24 py-20 sm:py-28 overflow-hidden"
      style={{ background: '#0a0c0b' }}
      aria-label={isEn ? 'Key statistics' : 'Estadísticas clave'}
    >
      {/* Subtle crimson grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(196,30,58,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196,30,58,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8">
        <ManifestoCounterItem
          target={3051294}
          label={isEn ? 'Contracts analyzed' : 'Contratos analizados'}
        />
        <ManifestoCounterItem
          target={9.9}
          prefix="MX$"
          suffix="T"
          label={isEn ? 'Total value evaluated' : 'Valor total evaluado'}
        />
        <ManifestoCounterItem
          target={highRiskPct}
          suffix="%"
          label={isEn ? 'Flagged high-risk' : 'Marcados alto riesgo'}
        />
      </div>
    </section>
  )
})

// ---------------------------------------------------------------------------
// CaseMarquee -- infinite horizontal scrolling corruption case names
// ---------------------------------------------------------------------------
const CORRUPTION_CASES = [
  'SEGALMEX',
  'IMSS GHOST COMPANIES',
  'COVID-19 PROCUREMENT',
  'ODEBRECHT-PEMEX',
  'LA ESTAFA MAESTRA',
  'GRUPO HIGA',
  'OCEANOGRAFIA',
  'TOKA IT MONOPOLY',
  'SAT EFOS NETWORK',
  'PEMEX-COTEMAR',
]

const CaseMarquee = memo(function CaseMarquee() {
  const content = CORRUPTION_CASES.map((c) => c).join('  //  ') + '  //  '
  return (
    <div
      className="relative overflow-hidden py-4"
      style={{ background: '#0a0c0b', borderTop: '1px solid rgba(196,30,58,0.15)', borderBottom: '1px solid rgba(196,30,58,0.15)' }}
      aria-label={`Documented corruption cases: ${CORRUPTION_CASES.join(', ')}`}
      role="marquee"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20" style={{ background: 'linear-gradient(to right, #0a0c0b, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20" style={{ background: 'linear-gradient(to left, #0a0c0b, transparent)' }} />

      <div
        className="flex whitespace-nowrap"
        style={{ animation: 'tickerScroll 30s linear infinite' }}
      >
        <span
          className="text-sm font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: 'rgba(196,30,58,0.6)' }}
        >
          {content}
        </span>
        <span
          className="text-sm font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: 'rgba(196,30,58,0.6)' }}
        >
          {content}
        </span>
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// ScanLine -- CSS animated horizontal line sweeping top to bottom
// ---------------------------------------------------------------------------
const ScanLine = memo(function ScanLine() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 3 }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(196,30,58,0.6) 30%, rgba(196,30,58,0.8) 50%, rgba(196,30,58,0.6) 70%, transparent 100%)',
          boxShadow: '0 0 15px 3px rgba(196,30,58,0.3), 0 0 30px 6px rgba(196,30,58,0.15)',
          animation: 'introScanLine 4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes introScanLine {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
})

const SECTOR_DISPLAY: Record<string, { es: string; en: string }> = {
  salud: { es: 'Salud', en: 'Health' },
  educacion: { es: 'Educacion', en: 'Education' },
  infraestructura: { es: 'Infraestructura', en: 'Infrastructure' },
  energia: { es: 'Energia', en: 'Energy' },
  defensa: { es: 'Defensa', en: 'Defense' },
  tecnologia: { es: 'Tecnologia', en: 'Technology' },
  hacienda: { es: 'Hacienda', en: 'Finance' },
  gobernacion: { es: 'Gobernacion', en: 'Government' },
  agricultura: { es: 'Agricultura', en: 'Agriculture' },
  ambiente: { es: 'Ambiente', en: 'Environment' },
  trabajo: { es: 'Trabajo', en: 'Labor' },
  otros: { es: 'Otros', en: 'Other' },
}

// ---------------------------------------------------------------------------
// PHI Sector type
// ---------------------------------------------------------------------------
interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  greens: number
  yellows: number
  reds: number
  score: number
}

// ---------------------------------------------------------------------------
// useCountUp hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 1800, enabled = false): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) { setValue(0); return }
    startRef.current = null
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, enabled])

  return value
}

// ---------------------------------------------------------------------------
// NetworkCanvas -- cinematic canvas-based network graph background
// ---------------------------------------------------------------------------
interface NetNode {
  x: number
  y: number
  vx: number
  vy: number
  type: 'vendor' | 'institution' | 'risk'
  size: number
  pulsePhase: number
}

interface NetEdge {
  from: number
  to: number
  isRisk: boolean
}

interface NetPacket {
  edgeIdx: number
  progress: number
  speed: number
  isRisk: boolean
}

const NetworkCanvas = memo(function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef(0)
  const stateRef = useRef<{
    nodes: NetNode[]
    edges: NetEdge[]
    packets: NetPacket[]
    scanY: number
    counterValue: number
    counterStart: number
    w: number
    h: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup dimensions
    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (stateRef.current) {
        stateRef.current.w = rect.width
        stateRef.current.h = rect.height
      }
    }

    const parent = canvas.parentElement
    const observer = new ResizeObserver(updateSize)
    if (parent) observer.observe(parent)
    updateSize()

    const w = canvas.parentElement?.clientWidth ?? 1200
    const h = canvas.parentElement?.clientHeight ?? 800

    // Create nodes
    const nodeCount = 40
    const riskCount = 8
    const instCount = 10
    const nodes: NetNode[] = []
    for (let i = 0; i < nodeCount; i++) {
      let type: NetNode['type'] = 'vendor'
      if (i < riskCount) type = 'risk'
      else if (i < riskCount + instCount) type = 'institution'
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        type,
        size: type === 'risk' ? 10 : type === 'institution' ? 8 : 6,
        pulsePhase: Math.random() * Math.PI * 2,
      })
    }

    // Create edges (vendor->institution connections)
    const edges: NetEdge[] = []
    for (let i = 0; i < nodeCount; i++) {
      if (nodes[i].type === 'vendor' || nodes[i].type === 'risk') {
        // Connect to 1-2 institutions
        const targets = [riskCount + Math.floor(Math.random() * instCount)]
        if (Math.random() > 0.5) targets.push(riskCount + Math.floor(Math.random() * instCount))
        for (const t of targets) {
          if (t < nodeCount && t !== i) {
            edges.push({ from: i, to: t, isRisk: nodes[i].type === 'risk' })
          }
        }
      }
    }

    // Data packets
    const packets: NetPacket[] = []
    for (let i = 0; i < edges.length; i++) {
      if (Math.random() > 0.4) {
        packets.push({
          edgeIdx: i,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
          isRisk: edges[i].isRisk,
        })
      }
    }

    stateRef.current = {
      nodes,
      edges,
      packets,
      scanY: 0,
      counterValue: 0,
      counterStart: performance.now(),
      w,
      h,
    }

    const draw = (time: number) => {
      const s = stateRef.current
      if (!s) return
      const cw = s.w
      const ch = s.h

      ctx.clearRect(0, 0, cw, ch)
      ctx.fillStyle = '#0a0c0b'
      ctx.fillRect(0, 0, cw, ch)

      const t = time * 0.001

      // Move nodes
      for (const n of s.nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > cw) n.vx *= -1
        if (n.y < 0 || n.y > ch) n.vy *= -1
        n.x = Math.max(0, Math.min(cw, n.x))
        n.y = Math.max(0, Math.min(ch, n.y))
      }

      // Draw edges
      for (const e of s.edges) {
        const a = s.nodes[e.from]
        const b = s.nodes[e.to]
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = e.isRisk ? 'rgba(196,30,58,0.15)' : 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw & move packets
      for (const p of s.packets) {
        p.progress += p.speed
        if (p.progress > 1) {
          p.progress = 0
          // Randomly reassign edge
          if (Math.random() > 0.7) {
            p.edgeIdx = Math.floor(Math.random() * s.edges.length)
            p.isRisk = s.edges[p.edgeIdx].isRisk
          }
        }
        const e = s.edges[p.edgeIdx]
        const a = s.nodes[e.from]
        const b = s.nodes[e.to]
        const px = a.x + (b.x - a.x) * p.progress
        const py = a.y + (b.y - a.y) * p.progress
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = p.isRisk ? 'rgba(196,30,58,0.9)' : 'rgba(255,255,255,0.7)'
        ctx.fill()
      }

      // Draw nodes
      for (const n of s.nodes) {
        if (n.type === 'risk') {
          // Pulsing red glow
          const pulse = Math.sin(t * 2 + n.pulsePhase) * 3
          const glowR = n.size + 6 + pulse
          const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
          gradient.addColorStop(0, 'rgba(196,30,58,0.4)')
          gradient.addColorStop(1, 'rgba(196,30,58,0)')
          ctx.beginPath()
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
          // Core
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.size + pulse * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(196,30,58,0.9)'
          ctx.fill()
        } else if (n.type === 'institution') {
          // Square
          const half = n.size / 2
          ctx.fillStyle = 'rgba(100,160,255,0.5)'
          ctx.fillRect(n.x - half, n.y - half, n.size, n.size)
        } else {
          // Vendor circle
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.size / 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(200,200,200,0.6)'
          ctx.fill()
        }
      }

      // Scan line
      s.scanY = (s.scanY + ch / (4 * 60)) % ch
      ctx.fillStyle = 'rgba(196,30,58,0.08)'
      ctx.fillRect(0, s.scanY, cw, 1)

      // Stats overlay (bottom-left)
      const elapsed = (time - s.counterStart) / 1000
      const counterProgress = Math.min(elapsed / 3, 1)
      const eased = 1 - Math.pow(1 - counterProgress, 3)
      s.counterValue = Math.round(eased * 3051294)

      ctx.font = '11px "SF Mono", "Fira Code", "Consolas", monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.textAlign = 'left'
      const bx = 16
      const by = ch - 50
      ctx.fillText(`CONTRATOS ANALIZADOS: ${s.counterValue.toLocaleString()}`, bx, by)
      ctx.fillText('MONTO TOTAL: ~$9.9T MXN', bx, by + 16)
      ctx.fillText('ALTO RIESGO: ~13.5%', bx, by + 32)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
      aria-hidden="true"
    />
  )
})

// ---------------------------------------------------------------------------
// VideoHeroBackground -- cinematic video layer under NetworkCanvas
// ---------------------------------------------------------------------------
const VideoHeroBackground = memo(function VideoHeroBackground() {
  const [videoFailed, setVideoFailed] = useState(false)

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      src="/hero.mp4"
      onError={() => setVideoFailed(true)}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style={{
        display: videoFailed ? 'none' : 'block',
        opacity: 0.3,
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  )
})

// (AnimatedSection removed -- sections use GSAP ScrollTrigger)

// ---------------------------------------------------------------------------
// StatCounter -- a single animated statistic
// ---------------------------------------------------------------------------
function StatCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  color = '#fff',
  labelColor = 'rgba(255,255,255,0.6)',
  inView,
  duration = 2000,
}: {
  value: number
  suffix?: string
  prefix?: string
  label: string
  color?: string
  labelColor?: string
  inView: boolean
  duration?: number
}) {
  const animated = useCountUp(value, duration, inView)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
        style={{ color }}
      >
        {prefix}
        {animated.toLocaleString()}
        {suffix}
      </span>
      <span className="text-sm font-medium" style={{ color: labelColor }}>
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GradeSlotMachine -- animates through letters before landing
// ---------------------------------------------------------------------------
function GradeSlotMachine({ grade, trigger }: { grade: string; trigger: boolean }) {
  const letters = ['A', 'B', 'C', 'D', 'F']
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!trigger) return
    let idx = 0
    const total = letters.length * 3 + letters.indexOf(grade)
    const interval = setInterval(() => {
      idx++
      setCurrent(idx % letters.length)
      if (idx >= total) {
        clearInterval(interval)
        setDone(true)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [trigger, grade])

  const displayLetter = done ? grade : letters[current]
  const gradeStyle = GRADE_COLORS[displayLetter] || GRADE_COLORS.F

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayLetter}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.06 }}
        className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center mx-auto"
        style={{
          fontFamily: SERIF,
          fontSize: '5rem',
          fontWeight: 900,
          color: gradeStyle.text,
          backgroundColor: gradeStyle.bg,
          border: `3px solid ${gradeStyle.border}`,
        }}
      >
        {displayLetter}
      </motion.div>
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// LangToggle
// ---------------------------------------------------------------------------
function LangToggle({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  const borderColor = dark ? 'rgba(255,255,255,0.15)' : '#e7e5e4'
  const bgBase = dark ? 'transparent' : 'white'
  const activeBg = dark ? 'rgba(196,30,58,0.25)' : '#fef2f2'
  const inactiveColor = dark ? 'rgba(255,255,255,0.4)' : '#a8a29e'

  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{ border: `1px solid ${borderColor}`, backgroundColor: bgBase }}
    >
      {(['en', 'es'] as const).map((lang) => {
        const active = lang === 'en' ? isEn : !isEn
        return (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-red-400/40"
            style={{
              backgroundColor: active ? activeBg : 'transparent',
              color: active ? CRIMSON : inactiveColor,
            }}
            aria-pressed={active}
            aria-label={lang === 'en' ? 'Switch to English' : 'Cambiar a Espanol'}
          >
            {lang.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProcessStep -- one step in the methodology pipeline
// ---------------------------------------------------------------------------
function ProcessStep({
  step,
  title,
  body,
  color,
  index,
  inView,
}: {
  step: string
  title: string
  body: string
  color: string
  index: number
  inView: boolean
}) {
  return (
    <motion.div
      className="flex flex-col relative"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
    >
      {/* Step number */}
      <span
        className="text-6xl font-black font-mono mb-4 leading-none"
        style={{ color, opacity: 0.18 }}
      >
        {step}
      </span>
      <h3 className="text-lg font-bold mb-2" style={{ color: '#f0ede8' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#6a6560' }}>
        {body}
      </p>
      {/* Animated connector line on desktop */}
      {index < 3 && (
        <motion.div
          className="hidden sm:block absolute -right-4 top-8 w-8 h-0.5"
          style={{ backgroundColor: color, opacity: 0.25 }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.15 + 0.5 }}
        />
      )}
    </motion.div>
  )
}

// ===========================================================================
// Main Intro page
// ===========================================================================
export default function Intro() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')

  // Redirect if already seen
  useEffect(() => {
    if (localStorage.getItem('rubli_seen_intro')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  // ---- Data fetching ----
  const { data: fastDashboard } = useQuery<FastDashboardData>({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const { data: phiSectorsData } = useQuery<{ sectors: PHISector[] }>({
    queryKey: ['phi', 'sectors'],
    queryFn: () => phiApi.getSectors(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const goToApp = useCallback(
    (path = '/dashboard') => {
      localStorage.setItem('rubli_seen_intro', '1')
      navigate(path)
    },
    [navigate],
  )

  // ---- Derived data ----
  const overview = fastDashboard?.overview
  const totalContracts = overview?.total_contracts ?? 3_051_294
  const totalValueMxn = overview?.total_value_mxn ?? 9_900_000_000_000
  const highRiskPct = overview?.high_risk_pct ?? 13.49
  const yearlyTrends = fastDashboard?.yearly_trends ?? []
  const phiSectors = phiSectorsData?.sectors ?? []

  // Value in trillions
  const valueT = Math.round((totalValueMxn / 1_000_000_000_000) * 10) / 10
  const valueTInt = Math.round(valueT * 10)

  // Section refs for GSAP ScrollTrigger
  const s2Ref = useRef<HTMLDivElement>(null)
  const s3Ref = useRef<HTMLDivElement>(null)
  const s4Ref = useRef<HTMLDivElement>(null)
  const s5Ref = useRef<HTMLDivElement>(null)
  const s6Ref = useRef<HTMLDivElement>(null)

  // Hero refs for GSAP timeline
  const heroLabelRef = useRef<HTMLSpanElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const heroCtaRef = useRef<HTMLDivElement>(null)
  const heroScrollRef = useRef<HTMLDivElement>(null)
  const heroTopBarRef = useRef<HTMLDivElement>(null)

  // GSAP hero stat counter state
  const [heroContracts, setHeroContracts] = useState(0)
  const [heroValueT, setHeroValueT] = useState(0)
  const [heroRiskPct, setHeroRiskPct] = useState(0)
  const [heroCases, setHeroCases] = useState(0)
  const heroStatsRef = useRef<HTMLDivElement>(null)

  // Section inView states (driven by ScrollTrigger callbacks)
  const [s2InView, setS2InView] = useState(false)
  const [s3InView, setS3InView] = useState(false)
  const [s4InView, setS4InView] = useState(false)
  const [s5InView, setS5InView] = useState(false)

  // Count-up for section 2 stats
  const yearsUp = useCountUp(23, 1200, s2InView)
  const valueTUp = useCountUp(valueTInt, 1800, s2InView)

  // ---- GSAP Hero Timeline ----
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 })

    // Top bar
    if (heroTopBarRef.current) {
      gsap.set(heroTopBarRef.current, { opacity: 0, y: -20 })
      tl.to(heroTopBarRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power4.out' }, 0)
    }

    // Label
    if (heroLabelRef.current) {
      gsap.set(heroLabelRef.current, { opacity: 0, y: 15 })
      tl.to(heroLabelRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power4.out' }, 0.3)
    }

    // Title
    if (heroTitleRef.current) {
      gsap.set(heroTitleRef.current, { opacity: 0, y: 40 })
      tl.to(heroTitleRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out' }, 0.0)
    }

    // Subtitle
    if (heroSubRef.current) {
      gsap.set(heroSubRef.current, { opacity: 0, y: 20 })
      tl.to(heroSubRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
    }

    // Stat counters
    if (heroStatsRef.current) {
      gsap.set(heroStatsRef.current, { opacity: 0, y: 20 })
      tl.to(heroStatsRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.6)
    }

    // GSAP counter animation for hero stats
    const counterObj = { contracts: 0, valueT: 0, risk: 0, cases: 0 }
    tl.to(counterObj, {
      contracts: 3051294,
      valueT: 99,
      risk: 920,
      cases: 748,
      duration: 2.5,
      ease: 'power2.out',
      snap: { contracts: 1, valueT: 1, risk: 1, cases: 1 },
      onUpdate: () => {
        setHeroContracts(Math.round(counterObj.contracts))
        setHeroValueT(Math.round(counterObj.valueT))
        setHeroRiskPct(Math.round(counterObj.risk))
        setHeroCases(Math.round(counterObj.cases))
      },
    }, 0.6)

    // CTA buttons
    if (heroCtaRef.current) {
      gsap.set(heroCtaRef.current, { opacity: 0, scale: 0.8 })
      tl.to(heroCtaRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, 1.0)
    }

    // Scroll prompt
    if (heroScrollRef.current) {
      gsap.set(heroScrollRef.current, { opacity: 0 })
      tl.to(heroScrollRef.current, { opacity: 1, duration: 1, ease: 'power2.out' }, 1.5)
    }

    return () => { tl.kill() }
  }, [])

  // ---- GSAP ScrollTrigger for sections ----
  // Sections 2, 4, 5 get quiet fade-in (no y offset, short duration).
  // Section 3 (featured case) and 6 (CTA) keep theatrical treatment.
  useEffect(() => {
    const quietSections = [
      { ref: s2Ref, setter: setS2InView },
      { ref: s4Ref, setter: setS4InView },
      { ref: s5Ref, setter: setS5InView },
    ]

    const theatricalSections = [
      { ref: s3Ref, setter: setS3InView },
    ]

    const triggers: ScrollTrigger[] = []

    for (const { ref, setter } of quietSections) {
      if (!ref.current) continue
      const children = ref.current.querySelectorAll('.gsap-reveal')
      gsap.set(children, { opacity: 0, y: 0 })
      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          setter(true)
          gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: 'power1.out',
            stagger: 0.06,
          })
        },
      })
      triggers.push(st)
    }

    for (const { ref, setter } of theatricalSections) {
      if (!ref.current) continue
      const children = ref.current.querySelectorAll('.gsap-reveal')
      gsap.set(children, { opacity: 0, y: 80 })
      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          setter(true)
          gsap.to(children, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.12,
          })
        },
      })
      triggers.push(st)
    }

    // Section 6 (CTA) - theatrical
    if (s6Ref.current) {
      const children6 = s6Ref.current.querySelectorAll('.gsap-reveal')
      gsap.set(children6, { opacity: 0, y: 80 })
      const st6 = ScrollTrigger.create({
        trigger: s6Ref.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(children6, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.12,
          })
        },
      })
      triggers.push(st6)
    }

    return () => {
      triggers.forEach(t => t.kill())
    }
  }, [])

  // Build chart data for section 2 (year-by-year bars)
  const chartBars = useMemo(() => {
    if (yearlyTrends.length === 0) return []
    // Support both new ('contracts') and old precomputed_stats ('total_contracts') API format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getC = (y: any) => y.contracts ?? y.total_contracts ?? 0
    const maxContracts = Math.max(...yearlyTrends.map(getC))
    return yearlyTrends.map((y) => {
      const contracts = getC(y)
      return {
        year: y.year,
        contracts,
        heightPct: maxContracts > 0 ? (contracts / maxContracts) * 100 : 0,
        highRiskPct: y.high_risk_pct ?? 0,
      }
    })
  }, [yearlyTrends])

  // National average grade for section 5
  const nationalGrade = useMemo(() => {
    if (phiSectors.length === 0) return 'C'
    const avgScore = phiSectors.reduce((sum, s) => sum + s.score, 0) / phiSectors.length
    if (avgScore >= 80) return 'A'
    if (avgScore >= 60) return 'B'
    if (avgScore >= 40) return 'C'
    if (avgScore >= 20) return 'D'
    return 'F'
  }, [phiSectors])


  return (
    <div className="min-h-screen" style={{ overflowX: 'hidden' }}>
      {/* ================================================================= */}
      {/* SECTION 1: CINEMATIC OPENING - Dark, full viewport, canvas bg */}
      {/* ================================================================= */}
      <section
        className="min-h-screen flex flex-col items-center justify-center relative"
        style={{ background: '#0a0c0b', color: '#fff' }}
        aria-label="RUBLI platform introduction"
      >
        {/* Drop your video at frontend/public/hero.mp4 for cinematic background */}
        <VideoHeroBackground />

        {/* Animated gradient mesh orbs */}
        <GradientMeshBackground />

        {/* Canvas particle field */}
        <ParticleCanvas />

        {/* Dark gradient overlay between video and canvas */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(6,6,8,0.5) 0%, rgba(6,6,8,0.3) 50%, rgba(6,6,8,0.8) 100%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Canvas network graph background */}
        <NetworkCanvas />

        {/* Cinematic scan line */}
        <ScanLine />

        {/* Top bar */}
        <div
          ref={heroTopBarRef}
          className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-10 py-5 flex items-center justify-between"
        >
          <span
            className="text-xl font-black tracking-tight"
            style={{ fontFamily: SERIF, color: '#fff' }}
          >
            RUBLI
          </span>
          <div className="flex items-center gap-3">
            <LangToggle dark />
            <button
              onClick={() => goToApp()}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'Enter' : 'Entrar'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center gap-6">
          {/* Crimson label */}
          <span
            ref={heroLabelRef}
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: CRIMSON }}
          >
            RUBLI &bull; {isEn ? 'PROCUREMENT TRANSPARENCY' : 'TRANSPARENCIA PROCURATORIA'}
          </span>

          {/* GSAP split-text hero title */}
          <div ref={heroTitleRef}>
            <SplitTextHero
              text="RUBLI"
              className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] block mb-2"
              style={{ fontFamily: SERIF, letterSpacing: '-0.03em', color: CRIMSON }}
            />
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05]"
              style={{ fontFamily: SERIF, letterSpacing: '-0.03em' }}
            >
              <span style={{ color: CRIMSON }}>{heroContracts.toLocaleString()}</span>
              <br />
              <span style={{ color: '#fff' }}>{isEn ? 'contracts' : 'contratos'}</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p
            ref={heroSubRef}
            className="text-lg sm:text-xl max-w-2xl leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {isEn
              ? 'Mexican federal procurement data analyzed by machine learning to detect corruption patterns across 12 government sectors'
              : 'Datos de contrataciones federales de Mexico analizados por aprendizaje automatico para detectar patrones de corrupcion en 12 sectores gubernamentales'}
          </p>

          {/* Hero stats - GSAP animated counters */}
          <div ref={heroStatsRef} className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black tabular-nums font-mono" style={{ color: '#f0ede8' }}>
                ${(heroValueT / 10).toFixed(1)}T
              </span>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>MXN</span>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black tabular-nums font-mono" style={{ color: CRIMSON }}>
                {(heroRiskPct / 100).toFixed(2)}%
              </span>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isEn ? 'High risk' : 'Alto riesgo'}
              </span>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black tabular-nums font-mono" style={{ color: '#f0ede8' }}>
                {heroCases}+
              </span>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isEn ? 'Documented cases' : 'Casos documentados'}
              </span>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black tabular-nums font-mono" style={{ color: '#f0ede8' }}>
                23
              </span>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isEn ? 'Years' : 'Anos'}
              </span>
            </div>
          </div>

          {/* CTA buttons */}
          <div ref={heroCtaRef} className="flex flex-wrap gap-3 justify-center mt-2">
            <button
              onClick={() => goToApp('/report-card')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'See the Report' : 'Ver el Reporte'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => goToApp('/aria')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {isEn ? 'ARIA Intelligence' : 'Inteligencia ARIA'}
            </button>
            <button
              onClick={() => goToApp('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-background-elevated/30 focus:outline-none focus:ring-2 focus:ring-background-elevated"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
            >
              {isEn ? 'Explore' : 'Explorar'}
            </button>
          </div>

          {/* Scroll prompt */}
          <div
            ref={heroScrollRef}
            className="mt-8 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => {
              document.getElementById('section-scale')?.scrollIntoView({ behavior: 'smooth' })
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') document.getElementById('section-scale')?.scrollIntoView({ behavior: 'smooth' })
            }}
            aria-label={isEn ? 'Scroll to learn more' : 'Desplaza para saber mas'}
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isEn ? 'Discover' : 'Descubre'}
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Risk score disclaimer */}
      <div
        className="w-full text-center py-3 px-6"
        style={{ background: '#0a0c0b' }}
      >
        <p className="text-xs text-stone-500 leading-relaxed">
          ⚠ {isEn
            ? <>Risk scores indicate statistical similarity to documented corruption patterns — not proof of wrongdoing. <a href="/methodology" className="underline decoration-stone-600 hover:text-stone-400 transition-colors">See Methodology</a>.</>
            : <>Los puntajes de riesgo indican similitud estadística con patrones de corrupción documentados — no constituyen prueba de irregularidades. <a href="/methodology" className="underline decoration-stone-600 hover:text-stone-400 transition-colors">Ver Metodología</a>.</>
          }
        </p>
      </div>

      {/* ================================================================= */}
      {/* CASE MARQUEE -- scrolling corruption case names */}
      {/* ================================================================= */}
      <CaseMarquee />

      {/* ================================================================= */}
      {/* SECTION 2: THE SCALE - White bg, animated bar chart */}
      {/* ================================================================= */}
      <section
        id="section-scale"
        ref={s2Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#0d0f0e' }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header label */}
          <span
            className="gsap-reveal text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'THE SCALE OF THE PROBLEM' : 'EL TAMANO DEL PROBLEMA'}
          </span>

          <h2
            className="gsap-reveal text-3xl sm:text-4xl font-black mb-12 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#f0ede8' }}
          >
            {isEn ? '23 years of public spending data' : '23 anos de datos de gasto publico'}
          </h2>

          {/* Animated bar chart - custom CSS bars */}
          {chartBars.length > 0 && (
            <div className="gsap-reveal mb-16">
              <div className="flex items-end gap-[2px] sm:gap-1 h-40 sm:h-52">
                {chartBars.map((bar, i) => {
                  const isHighRisk = bar.highRiskPct > 15
                  return (
                    <motion.div
                      key={bar.year}
                      className="flex-1 rounded-t-sm relative group cursor-default"
                      style={{
                        backgroundColor: isHighRisk ? CRIMSON : '#2563eb',
                        opacity: isHighRisk ? 0.9 : 0.6,
                        minWidth: 2,
                      }}
                      initial={{ height: 0 }}
                      animate={s2InView ? { height: `${Math.max(bar.heightPct, 2)}%` } : { height: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.03 + 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                      title={`${bar.year}: ${bar.contracts.toLocaleString()} ${isEn ? 'contracts' : 'contratos'}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-background text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {bar.year}: {bar.contracts.toLocaleString()}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {/* Year labels (first, middle, last) */}
              <div className="flex justify-between mt-2 text-xs" style={{ color: '#6a6560' }}>
                <span>{chartBars[0]?.year}</span>
                <span>{chartBars[Math.floor(chartBars.length / 2)]?.year}</span>
                <span>{chartBars[chartBars.length - 1]?.year}</span>
              </div>
            </div>
          )}

          {/* Three animated stat counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <StatCounter
              value={totalContracts}
              label={isEn ? 'contracts analyzed' : 'contratos analizados'}
              color="#f0ede8"
              labelColor="#6a6560"
              inView={s2InView}
              duration={2200}
            />
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
                style={{ color: '#f0ede8' }}
              >
                {yearsUp}
              </span>
              <span className="text-sm font-medium" style={{ color: '#6a6560' }}>
                {isEn ? 'years of data (2002-2025)' : 'anos de datos (2002-2025)'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-4xl sm:text-5xl font-black tabular-nums font-mono leading-none"
                style={{ color: '#f0ede8' }}
              >
                ~{(valueTUp / 10).toFixed(1)}T
              </span>
              <span className="text-sm font-medium" style={{ color: '#6a6560' }}>
                {isEn ? 'MXN evaluated value' : 'MXN valor evaluado'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 3: FEATURED CASE - Dark bg, classified file feel */}
      {/* ================================================================= */}
      <FeaturedCase
        ref={s3Ref}
        inView={s3InView}
        isEn={isEn}
        goToApp={goToApp}
      />

      {/* ================================================================= */}
      {/* SECTION 4: HOW IT WORKS - Dark bg, animated steps */}
      {/* ================================================================= */}
      <section
        ref={s4Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#0d0f0e' }}
      >
        <div className="max-w-5xl mx-auto">
          <span
            className="gsap-reveal text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'HOW WE DETECT PATTERNS' : 'COMO DETECTAMOS PATRONES'}
          </span>

          <h2
            className="gsap-reveal text-3xl sm:text-4xl font-black mb-14 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#f0ede8' }}
          >
            {isEn ? 'From raw data to risk intelligence' : 'De datos crudos a inteligencia de riesgo'}
          </h2>

          <div className="gsap-reveal grid grid-cols-1 sm:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: isEn ? 'Data' : 'Datos',
                body: isEn
                  ? '3.1M contracts from COMPRANET (2002-2025), cleaned and standardized'
                  : '3.1M contratos de COMPRANET (2002-2025), limpiados y estandarizados',
                color: '#2563eb',
              },
              {
                step: '02',
                title: isEn ? '16 Indicators' : '16 Indicadores',
                body: isEn
                  ? 'Vendor concentration, atypical prices, direct awards, network patterns...'
                  : 'Concentracion de proveedores, precios atipicos, adjudicacion directa, redes...',
                color: '#8b5cf6',
              },
              {
                step: '03',
                title: isEn ? 'ML Model' : 'Modelo ML',
                body: isEn
                  ? 'Compared against 289 documented corruption cases across all 12 sectors'
                  : 'Comparamos contra 289 casos documentados de corrupcion en los 12 sectores',
                color: CRIMSON,
              },
              {
                step: '04',
                title: isEn ? 'Report' : 'Reporte',
                body: isEn
                  ? 'We grade procurement health from A to F for every sector'
                  : 'Calificamos la salud procuratoria de A a F para cada sector',
                color: '#16a34a',
              },
            ].map((item, i) => (
              <ProcessStep key={item.step} {...item} index={i} inView={s4InView} />
            ))}
          </div>

          {/* Disclaimer */}
          <div
            className="gsap-reveal mt-14 rounded-xl border p-5 text-sm leading-relaxed"
            style={{ color: '#6a6560', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {isEn
              ? 'Scores are statistical risk indicators, not proof of corruption. A high score means the contract resembles documented corruption patterns.'
              : 'Las puntuaciones son indicadores estadisticos de riesgo, no prueba de corrupcion. Una puntuacion alta significa que el contrato se parece a patrones documentados.'}
          </div>

          <button
            onClick={() => goToApp('/methodology')}
            className="gsap-reveal mt-8 inline-flex items-center gap-2 text-base font-bold transition-colors duration-200 hover:underline focus:outline-none"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'See the full methodology' : 'Ver la metodologia completa'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 5: REPORT CARD TEASER - Warm bg, grade slot machine */}
      {/* ================================================================= */}
      <section
        ref={s5Ref}
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#141716' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <span
            className="gsap-reveal text-xs font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'OUR NATIONAL GRADE' : 'NUESTRA CALIFICACION NACIONAL'}
          </span>

          <h2
            className="gsap-reveal text-3xl sm:text-4xl font-black mb-10 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#f0ede8' }}
          >
            {isEn
              ? 'How healthy is Mexican public procurement?'
              : 'Que tan sana es la contratacion publica de Mexico?'}
          </h2>

          {/* Grade slot machine */}
          <div className="gsap-reveal mb-12">
            <GradeSlotMachine grade={nationalGrade} trigger={s5InView} />
            <p className="mt-4 text-base" style={{ color: '#6a6560' }}>
              {isEn ? 'National average grade' : 'Calificacion promedio nacional'}
            </p>
          </div>

          {/* Per-sector grades */}
          {phiSectors.length > 0 ? (
            <div className="gsap-reveal grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
              {phiSectors.map((sector) => {
                const key = sector.sector_name.toLowerCase().replace(/\s+/g, '')
                const gradeStyle = GRADE_COLORS[sector.grade] || GRADE_COLORS.F
                const sectorColor = SECTOR_COLORS[key] ?? '#64748b'
                const displayName = SECTOR_DISPLAY[key]
                const name = displayName ? (isEn ? displayName.en : displayName.es) : sector.sector_name

                return (
                  <div
                    key={sector.sector_id}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sectorColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate block" style={{ color: '#f0ede8' }}>
                        {name}
                      </span>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0"
                      style={{
                        fontFamily: SERIF,
                        color: gradeStyle.text,
                        backgroundColor: gradeStyle.bg,
                        border: `1px solid ${gradeStyle.border}`,
                      }}
                    >
                      {sector.grade}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 h-16 animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => goToApp('/report-card')}
            className="inline-flex items-center gap-2 text-base font-bold transition-colors duration-200 hover:underline focus:outline-none"
            style={{ color: CRIMSON }}
          >
            {isEn ? 'See the Full Report' : 'Ver el Reporte Completo'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 5.5: ARIA INTELLIGENCE BRIEFING - Feature spotlight */}
      {/* ================================================================= */}
      <section
        className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#0d0f0e' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left: description */}
            <div className="flex-1 min-w-0">
              <span
                className="text-xs font-bold tracking-[0.2em] uppercase block mb-4"
                style={{ color: '#8b5cf6' }}
              >
                {isEn ? 'AUTOMATED INVESTIGATION' : 'INVESTIGACIÓN AUTOMATIZADA'}
              </span>
              <h2
                className="text-3xl sm:text-4xl font-black mb-6 leading-tight"
                style={{ fontFamily: SERIF, letterSpacing: '-0.02em', color: '#f0ede8' }}
              >
                ARIA {isEn ? 'Intelligence Briefing' : 'Reporte de Inteligencia'}
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '500px' }}>
                {isEn
                  ? 'Our 9-module Automated Risk Investigation Algorithm classifies 198K vendors into investigation tiers, detects monopoly, ghost company, and institutional capture patterns, and cross-references against SAT, SFP, and ASF registries.'
                  : 'Nuestro algoritmo automatizado de investigación de riesgos de 9 módulos clasifica 198K proveedores en niveles de investigación, detecta patrones de monopolio, empresas fantasma y captura institucional, y cruza datos con registros del SAT, SFP y ASF.'}
              </p>
              <button
                onClick={() => goToApp('/aria')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                {isEn ? 'Open ARIA Briefing' : 'Abrir Reporte ARIA'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Right: feature cards grid */}
            <div className="grid grid-cols-2 gap-3 lg:basis-[45%] w-full lg:w-auto">
              {[
                {
                  icon: Search,
                  stat: '198K',
                  label: isEn ? 'Vendors screened' : 'Proveedores evaluados',
                  color: '#8b5cf6',
                },
                {
                  icon: FileWarning,
                  stat: '16K+',
                  label: isEn ? 'Capture patterns' : 'Patrones de captura',
                  color: CRIMSON,
                },
                {
                  icon: Shield,
                  stat: '5',
                  label: isEn ? 'External registries' : 'Registros externos',
                  color: '#16a34a',
                },
                {
                  icon: BarChart3,
                  stat: '4',
                  label: isEn ? 'Investigation tiers' : 'Niveles de investigación',
                  color: '#2563eb',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <item.icon className="h-5 w-5" style={{ color: item.color }} aria-hidden="true" />
                  <span className="text-2xl font-black tabular-nums font-mono" style={{ color: '#f0ede8' }}>
                    {item.stat}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 6: CALL TO ACTION - Dark, cinematic */}
      {/* ================================================================= */}
      <section
        ref={s6Ref}
        className="relative px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
        style={{ background: '#0a0c0b', color: '#fff' }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2
            className="gsap-reveal text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 leading-tight"
            style={{ fontFamily: SERIF, letterSpacing: '-0.02em' }}
          >
            {isEn ? 'Start investigating' : 'Empieza a investigar'}
          </h2>

          <p
            className="gsap-reveal text-base sm:text-lg mb-10"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {isEn
              ? 'Browse contracts, investigate vendors, and discover risk patterns.'
              : 'Navega contratos, investiga proveedores y descubre patrones de riesgo.'}
          </p>

          <div className="gsap-reveal flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => goToApp('/report-card')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
            >
              {isEn ? 'See the Report' : 'Ver el Reporte'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => goToApp('/aria')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:brightness-125 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {isEn ? 'ARIA Intelligence' : 'Inteligencia ARIA'}
            </button>
            <button
              onClick={() => goToApp('/dashboard')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-background-elevated/30 focus:outline-none focus:ring-2 focus:ring-background-elevated"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
            >
              {isEn ? 'Explore the platform' : 'Explorar la plataforma'}
            </button>
          </div>

          {/* Red Thread teaser */}
          <button
            onClick={() => goToApp('/thread/36961')}
            className="gsap-reveal inline-flex items-center gap-2 mt-6 text-sm transition-colors hover:brightness-125"
            style={{ color: 'rgba(196,30,58,0.75)' }}
          >
            <span style={{ color: CRIMSON }}>&#9679;</span>
            {isEn
              ? 'Follow the investigation trail on Laboratorios Pisa'
              : 'Sigue el hilo de investigación sobre Laboratorios Pisa'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {/* Attribution */}
          <p
            className="gsap-reveal mt-14 text-xs"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {isEn ? 'Data' : 'Datos'}: COMPRANET &bull; {isEn ? 'Methodology' : 'Metodología'}: OECD, IMF CRI &bull;{' '}
            {isEn ? 'Open-source procurement intelligence' : 'Inteligencia en contrataciones de código abierto'}
          </p>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FeaturedCase -- classified-file reveal for a documented corruption case
// ---------------------------------------------------------------------------
const FEATURED_CASE = {
  vendorName: 'GRUPO FARMACOS ESPECIALIZADOS, S.A. DE C.V.',
  vendorId: 29277,
  riskScore: 0.995,
  contracts: 6360,
  totalValueB: 133.4,
  yearStart: 2007,
  yearEnd: 2020,
  directAwardPct: 79.1,
  highRiskPct: 98.4,
  years: 13,
} as const

function useScoreCountUp(target: number, duration: number, enabled: boolean): string {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) { setValue(0); return }
    startRef.current = null
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, enabled])

  return value.toFixed(3)
}

const FeaturedCase = forwardRef<
  HTMLDivElement,
  { inView: boolean; isEn: boolean; goToApp: (path?: string) => void }
>(function FeaturedCase({ inView, isEn, goToApp }, ref) {
  const fc = FEATURED_CASE
  const scoreDisplay = useScoreCountUp(fc.riskScore, 1500, inView)
  const barFillPct = inView ? fc.riskScore * 100 : 0

  const pills = [
    `${fc.directAwardPct}% ${isEn ? 'direct award' : 'adjudicacion directa'}`,
    `${fc.highRiskPct}% ${isEn ? 'critical contracts' : 'contratos criticos'}`,
    `${fc.years} ${isEn ? 'years of contracts' : 'anos de contratos'}`,
  ]

  return (
    <section
      ref={ref}
      className="px-6 sm:px-12 lg:px-24 py-24 sm:py-32"
      style={{ background: '#1a1714', color: '#fff' }}
      aria-label={isEn ? 'Featured documented case' : 'Caso documentado destacado'}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          {/* LEFT SIDE (60%) */}
          <div className="flex-1 lg:basis-[60%] min-w-0">
            <span
              className="gsap-reveal text-xs font-bold tracking-[0.2em] uppercase block mb-6"
              style={{
                color: CRIMSON,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
              }}
            >
              {isEn ? 'DOCUMENTED CASE' : 'CASO DOCUMENTADO'}
            </span>

            <h2
              className="gsap-reveal mb-6 leading-tight"
              style={{
                fontFamily: SERIF,
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                letterSpacing: '-0.02em',
                color: '#fff',
                animation: inView ? 'fc-text-wipe 0.8s ease-out 0.2s both' : 'none',
              }}
            >
              {fc.vendorName}
            </h2>

            <p
              className="gsap-reveal text-sm font-medium mb-6"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              {fc.contracts.toLocaleString()} {isEn ? 'contracts' : 'contratos'} &middot; ${fc.totalValueB}B MXN &middot; {fc.yearStart}&ndash;{fc.yearEnd}
            </p>

            <p
              className="gsap-reveal text-base leading-relaxed mb-8"
              style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px' }}
            >
              {isEn
                ? `This pharmaceutical company received government contracts with ${fc.directAwardPct}% direct awards. The risk model assigns a score of ${fc.riskScore} \u2014 the highest possible \u2014 indicating its contracting pattern almost perfectly matches documented fraud cases.`
                : `Esta empresa farmaceutica recibio contratos gubernamentales con un ${fc.directAwardPct}% de adjudicaciones directas. El modelo de riesgo asigna una puntuacion de ${fc.riskScore} \u2014 el mas alto posible \u2014 senalando que su patron de contratacion coincide casi perfectamente con casos documentados de fraude.`}
            </p>

            <button
              className="gsap-reveal inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-red-400/40"
              style={{ backgroundColor: CRIMSON, color: '#fff' }}
              onClick={() => goToApp(`/vendor/${fc.vendorId}`)}
            >
              {isEn ? 'See full investigation' : 'Ver investigación completa'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* RIGHT SIDE (40%) */}
          <div className="lg:basis-[40%] flex flex-col items-center gap-6 w-full lg:w-auto lg:pt-8">
            {/* Big score */}
            <div className="text-center">
              <span
                className="block tabular-nums font-black"
                style={{
                  fontFamily: SERIF,
                  fontSize: 'clamp(3.5rem, 8vw, 5.5rem)',
                  color: CRIMSON,
                  lineHeight: 1,
                }}
              >
                {inView ? scoreDisplay : '0.000'}
              </span>
              <span className="text-sm font-medium mt-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isEn ? 'Risk Score' : 'Puntuacion de Riesgo'}
              </span>
            </div>

            {/* Vertical progress bar */}
            <div
              className="relative mx-auto"
              style={{ width: '8px', height: '200px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: `${barFillPct}%`,
                  backgroundColor: CRIMSON,
                  borderRadius: '4px',
                  transition: inView ? 'height 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.0s' : 'none',
                }}
              />
              {/* White dot at top */}
              <div
                style={{
                  position: 'absolute',
                  bottom: `${barFillPct}%`,
                  left: '50%',
                  transform: 'translate(-50%, 50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  boxShadow: `0 0 8px ${CRIMSON}`,
                  opacity: inView ? 1 : 0,
                  transition: inView ? 'opacity 0.3s ease 2.2s, bottom 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.0s' : 'none',
                }}
              />
            </div>

            {/* Stat pills */}
            <div className="flex flex-col gap-2 w-full max-w-[260px]">
              {pills.map((pill, i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderLeft: `3px solid ${CRIMSON}`,
                    color: 'rgba(255,255,255,0.6)',
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateY(0)' : 'translateY(8px)',
                    transition: `opacity 0.4s ease ${1.4 + i * 0.08}s, transform 0.4s ease ${1.4 + i * 0.08}s`,
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe for text wipe */}
      <style>{`
        @keyframes fc-text-wipe {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
      `}</style>
    </section>
  )
})

