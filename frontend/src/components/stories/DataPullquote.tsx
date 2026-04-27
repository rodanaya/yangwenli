import { useEffect, useRef, useState } from 'react'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { OutletBadge, type OutletType } from './OutletBadge'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// 14-template editorial visualization system. Each template tells one story
// in one image — NYT/FT/Economist long-form aesthetic. No generic progress
// bars. Auto-selection picks a template if none is specified.
// ─────────────────────────────────────────────────────────────────────────────

export type VizTemplate =
  | 'breach-ceiling'
  | 'mass-sliver'
  | 'redline-gauge'
  | 'count-grid'
  | 'receipt-stamp'
  | 'margin-rule'
  | 'range-band'
  | 'zero-bar'
  | 'horizon'
  | 'mosaic-tile'
  | 'threshold-band'
  | 'dot-ratio'
  | 'wave-breaker'
  | 'pile-up'

interface DataPullquoteProps {
  quote: string
  attribution?: string
  stat: string
  statLabel: string
  statColor?: string
  barValue?: number
  barLabel?: string
  outlet?: OutletType
  className?: string
  vizTemplate?: VizTemplate
}

const OUTLET_BORDER_COLORS: Record<OutletType, string> = {
  longform: 'var(--color-text-muted)',
  investigative: 'var(--color-sector-educacion)',
  data_analysis: 'var(--color-sector-tecnologia)',
  rubli: 'var(--color-sector-salud)',
}

function parseStatNumber(stat: string): { num: number; suffix: string; decimals: number } | null {
  const match = stat.match(/^([0-9.,]+)\s*(%|B|M|K|T)?$/)
  if (!match) return null
  const cleaned = match[1].replace(/,/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0
  return { num, suffix: match[2] || '', decimals }
}

function autoSelectTemplate(value: number, stat: string, label?: string): VizTemplate {
  if (value === 0) return 'zero-bar'
  if (value < 0.06) return 'mass-sliver'
  if (/^0\.\d{2,}$/.test(stat.trim()) && value >= 0.40) return 'redline-gauge'
  if ((label?.toLowerCase().includes('oecd') || label?.toLowerCase().includes('threshold')) && value > 0.40) return 'breach-ceiling'
  if (/^\d[\d,]+$/.test(stat.trim())) return 'count-grid'
  if (/\d+[,.]?\d*\s*[-–]\s*\d/.test(stat.trim()) && !stat.includes('MXN')) return 'range-band'
  if (value > 0.65) return 'mosaic-tile'
  return 'threshold-band'
}

function parseThreshold(label?: string): number {
  if (!label) return 0.30
  const range = label.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%/)
  if (range) return parseFloat(range[1]) / 100
  const pct = label.match(/(\d+(?:\.\d+)?)\s*%/)
  if (pct) return parseFloat(pct[1]) / 100
  const dec = label.match(/:\s*(0\.\d+)/)
  if (dec) return parseFloat(dec[1])
  return 0.30
}

function useReveal(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, revealed]
}

interface VizProps {
  value: number
  color: string
  label?: string
  stat?: string
  revealed: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BreachCeiling — bar crashes through threshold
// ─────────────────────────────────────────────────────────────────────────────
function BreachCeiling({ value, color, label, revealed }: VizProps) {
  const threshold = parseThreshold(label)
  const valuePct = Math.max(0, Math.min(1, value)) * 100
  const thresholdPct = Math.max(0, Math.min(1, threshold)) * 100
  return (
    <div className="relative h-14">
      {/* safe zone */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${thresholdPct}%`,
          background: 'var(--color-sector-energia)',
          opacity: 0.18,
        }}
      />
      {/* bar */}
      <div
        className="absolute top-3 bottom-3 left-0 origin-left"
        style={{
          width: `${valuePct}%`,
          background: `repeating-linear-gradient(135deg, ${color} 0 6px, transparent 6px 9px), ${color}`,
          opacity: 0.92,
          transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1) 200ms',
        }}
      />
      {/* threshold line */}
      <div
        className="absolute inset-y-0"
        style={{
          left: `${thresholdPct}%`,
          width: 2,
          background: 'var(--color-text-primary)',
          opacity: revealed ? 0.85 : 0,
          transition: 'opacity 400ms ease-out',
        }}
      />
      <div
        className="absolute font-mono text-[9px] uppercase tracking-[0.12em]"
        style={{
          left: `${thresholdPct}%`,
          bottom: -16,
          transform: 'translateX(-50%)',
          color: 'var(--color-text-muted)',
        }}
      >
        Límite
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MassSliver — tiny confirmed sliver vs the vast undetected mass
// ─────────────────────────────────────────────────────────────────────────────
function MassSliver({ value, color, label, revealed }: VizProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  // Visual minimum: always at least 3.5% wide so the sliver is never invisible
  const visualPct = Math.max(3.5, pct)
  const detectedStr = pct < 1 ? pct.toFixed(1) : Math.round(pct).toString()
  const undetectedStr = (100 - pct).toFixed(pct < 1 ? 1 : 0)

  return (
    <div>
      <div
        className="relative h-11"
        style={{
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Colored sliver — minimum 3.5% so it's always visible */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${visualPct}%`,
            background: color,
            opacity: revealed ? 1 : 0,
            transition: 'opacity 600ms ease-out 200ms',
          }}
        />
        {/* Percentage label just after the sliver edge */}
        <div
          className="absolute top-0 bottom-0 flex items-center font-mono font-bold text-[11px]"
          style={{
            left: `calc(${visualPct}% + 6px)`,
            color,
            opacity: revealed ? 1 : 0,
            transition: 'opacity 600ms ease-out 450ms',
            whiteSpace: 'nowrap',
          }}
        >
          {detectedStr}%
        </div>
        {/* Undetected mass label — right-aligned in the void */}
        <div
          className="absolute inset-0 flex items-center justify-end pr-3"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)',
            color: 'var(--color-text-muted)',
            opacity: revealed ? 0.5 : 0,
            transition: 'opacity 700ms ease-out 700ms',
          }}
        >
          {undetectedStr}% sin detectar
        </div>
      </div>
      {label && (
        <div
          className="mt-1.5 text-[9px] font-mono uppercase tracking-[0.12em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RedlineGauge — semicircular speedometer
// ─────────────────────────────────────────────────────────────────────────────
function RedlineGauge({ value, color, revealed }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const angle = -90 + v * 180
  const CX = 100
  const CY = 90
  return (
    <div className="relative">
      <svg viewBox="0 0 200 110" className="w-full h-28">
        {/* zone arcs */}
        <path d="M 20 90 A 80 80 0 0 1 73.4 22.5" fill="none" stroke="var(--color-sector-energia)" strokeWidth="10" opacity="0.4" />
        <path d="M 73.4 22.5 A 80 80 0 0 1 126.6 22.5" fill="none" stroke="var(--color-risk-medium)" strokeWidth="10" opacity="0.55" />
        <path d="M 126.6 22.5 A 80 80 0 0 1 180 90" fill="none" stroke="var(--color-risk-critical)" strokeWidth="10" opacity="0.7" />
        {/* center hub */}
        <circle cx={CX} cy={CY} r={5} fill={color} />
        {/* needle */}
        <g
          style={{
            transform: revealed ? `rotate(${angle}deg)` : 'rotate(-90deg)',
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 1400ms cubic-bezier(0.16, 1, 0.3, 1) 300ms',
          }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - 65} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
      <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
        <span>Bajo</span>
        <span>Medio</span>
        <span>Crítico</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CountGrid — 8x8 newspaper-column dot matrix
// ─────────────────────────────────────────────────────────────────────────────
function CountGrid({ value, color, revealed, stat }: VizProps) {
  const total = 64
  const filled = Math.round(Math.max(0, Math.min(1, value)) * total)
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
        {Array.from({ length: total }).map((_, i) => {
          const isOn = i < filled
          return (
            <div
              key={i}
              className="aspect-square"
              style={{
                background: isOn ? color : 'var(--color-border)',
                opacity: revealed ? (isOn ? 0.95 : 0.35) : 0,
                transition: `opacity 320ms ease-out ${i * 8}ms`,
              }}
            />
          )
        })}
      </div>
      <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
        {filled} / {total} celdas {stat ? `· ${stat}` : ''}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ReceiptStamp — paper receipt with diagonal stamp
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptStamp({ color, revealed, stat }: VizProps) {
  return (
    <div
      className="relative px-5 py-6 overflow-hidden"
      style={{
        background:
          'repeating-linear-gradient(0deg, var(--color-background-card) 0 22px, var(--color-border) 22px 23px)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Recibo · COMPRANET
      </div>
      <div
        className="font-mono font-bold text-3xl tabular-nums"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {stat}
      </div>
      <div
        className="absolute right-3 bottom-3 px-3 py-1 font-serif font-bold text-base uppercase tracking-[0.15em]"
        style={{
          color,
          border: `2.5px solid ${color}`,
          transform: 'rotate(-15deg)',
          opacity: revealed ? 0.85 : 0,
          transition: 'opacity 700ms ease-out 600ms',
        }}
      >
        Adjudicación
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MarginRule — two stacked bars showing gap
// ─────────────────────────────────────────────────────────────────────────────
function MarginRule({ value, color, revealed, label }: VizProps) {
  const v = Math.max(0, Math.min(1, value)) * 100
  const ref = parseThreshold(label) * 100
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-1.5 origin-left"
          style={{
            background: color,
            width: `${v}%`,
            transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1) 100ms',
            flex: '0 0 auto',
          }}
        />
        <span className="font-mono text-[10px]" style={{ color }}>
          Actual {v.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 origin-left"
          style={{
            background: 'var(--color-sector-energia)',
            opacity: 0.55,
            width: `${ref}%`,
            transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1) 350ms',
            flex: '0 0 auto',
          }}
        />
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Referencia {ref.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 text-[9px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
        Brecha · {(v - ref).toFixed(0)} pts
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. RangeBand — fuzzy gradient band for ranges
// ─────────────────────────────────────────────────────────────────────────────
function RangeBand({ value, color, revealed, stat }: VizProps) {
  const center = Math.max(0, Math.min(1, value)) * 100
  const span = 22
  const left = Math.max(2, center - span)
  const right = Math.min(98, center + span)
  return (
    <div className="relative h-12">
      <div
        className="absolute inset-y-3 rounded-sm"
        style={{
          left: `${left}%`,
          width: `${right - left}%`,
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 80%)`,
          opacity: revealed ? 0.85 : 0,
          transition: 'opacity 900ms ease-out 200ms',
        }}
      />
      <div
        className="absolute inset-y-0"
        style={{
          left: `${center}%`,
          width: 1.5,
          background: color,
          opacity: revealed ? 1 : 0,
          transition: 'opacity 600ms ease-out 800ms',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
        <span>Bajo</span>
        <span style={{ color }}>{stat}</span>
        <span>Alto</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ZeroBar — empty track, "0" is the story
// ─────────────────────────────────────────────────────────────────────────────
function ZeroBar({ revealed }: VizProps) {
  return (
    <div className="relative h-14" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
        style={{ background: 'var(--color-text-muted)', opacity: revealed ? 1 : 0, transition: 'opacity 500ms' }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center font-serif italic text-xl"
        style={{
          color: 'var(--color-text-muted)',
          opacity: revealed ? 0.55 : 0,
          transition: 'opacity 800ms ease-out 500ms',
          letterSpacing: '0.04em',
        }}
      >
        ningún caso registrado
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Horizon — multi-era rising bars
// ─────────────────────────────────────────────────────────────────────────────
function Horizon({ value, color, revealed, label }: VizProps) {
  const eras: { name: string; mult: number }[] = [
    { name: 'Fox', mult: 0.40 },
    { name: 'Calderón', mult: 0.55 },
    { name: 'Peña Nieto', mult: 0.80 },
    { name: 'AMLO', mult: 1.0 },
    { name: 'Sheinbaum', mult: 0.85 },
  ]
  const threshold = parseThreshold(label)
  return (
    <div className="space-y-1.5">
      {eras.map((e, i) => {
        const v = Math.max(0, Math.min(1, value * e.mult)) * 100
        return (
          <div key={e.name} className="flex items-center gap-2">
            <span className="w-20 text-[10px] font-mono uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
              {e.name}
            </span>
            <div className="relative flex-1 h-2" style={{ background: 'var(--color-border)' }}>
              <div
                className="absolute inset-y-0 left-0 origin-left"
                style={{
                  width: `${v}%`,
                  background: color,
                  opacity: 0.9,
                  transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform 800ms cubic-bezier(0.16, 1, 0.3, 1) ${100 + i * 120}ms`,
                }}
              />
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${threshold * 100}%`,
                  width: 1,
                  background: 'var(--color-text-primary)',
                  opacity: 0.4,
                }}
              />
            </div>
            <span className="w-10 text-right font-mono text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {v.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. MosaicTile — 10×10 grid filled proportionally
// ─────────────────────────────────────────────────────────────────────────────
function MosaicTile({ value, color, revealed }: VizProps) {
  const total = 100
  const filled = Math.round(Math.max(0, Math.min(1, value)) * total)
  return (
    <div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
        {Array.from({ length: total }).map((_, i) => {
          const isOn = i < filled
          return (
            <div
              key={i}
              className="aspect-square"
              style={{
                background: isOn ? color : 'var(--color-border)',
                opacity: revealed ? (isOn ? 0.92 : 0.3) : 0,
                transition: `opacity 240ms ease-out ${i * 8}ms`,
              }}
            />
          )
        })}
      </div>
      <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.12em]" style={{ color }}>
        {filled} de cada 100
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ThresholdBand — bar with safe/danger zones painted in
// ─────────────────────────────────────────────────────────────────────────────
function ThresholdBand({ value, color, revealed, label }: VizProps) {
  const threshold = parseThreshold(label)
  const v = Math.max(0, Math.min(1, value))
  const valuePct = v * 100
  const thresholdPct = threshold * 100
  return (
    <div className="relative h-10" style={{ background: 'var(--color-border)', opacity: 0.95 }}>
      {/* safe zone */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${thresholdPct}%`,
          background: 'var(--color-sector-energia)',
          opacity: 0.25,
        }}
      />
      {/* danger zone (threshold..1) */}
      <div
        className="absolute inset-y-0"
        style={{
          left: `${thresholdPct}%`,
          right: 0,
          background: color,
          opacity: 0.12,
        }}
      />
      {/* current value fill */}
      <div
        className="absolute inset-y-0 left-0 origin-left"
        style={{
          width: `${valuePct}%`,
          background: color,
          opacity: 0.7,
          transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1) 200ms',
        }}
      />
      {/* threshold marker */}
      <div
        className="absolute inset-y-0"
        style={{
          left: `${thresholdPct}%`,
          width: 2,
          background: 'var(--color-text-primary)',
          opacity: 0.7,
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. DotRatio — two rows of dots showing ratio
// ─────────────────────────────────────────────────────────────────────────────
function DotRatio({ value, color, revealed }: VizProps) {
  const total = 50
  const filled = Math.round(Math.max(0, Math.min(1, value)) * total)
  const Row = ({ count, fillColor, opacity }: { count: number; fillColor: string; opacity: number }) => (
    <div className="flex gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 7,
            height: 7,
            background: i < count ? fillColor : 'transparent',
            border: i < count ? 'none' : '1px solid var(--color-border)',
            opacity: revealed ? opacity : 0,
            transition: `opacity 220ms ease-out ${i * 14}ms`,
          }}
        />
      ))}
    </div>
  )
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] mb-1" style={{ color }}>
          Subgrupo · {filled}
        </p>
        <Row count={filled} fillColor={color} opacity={0.95} />
      </div>
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Total · {total}
        </p>
        <Row count={total} fillColor="var(--color-text-muted)" opacity={0.55} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. WaveBreaker — sine wave fill
// ─────────────────────────────────────────────────────────────────────────────
function WaveBreaker({ value, color, revealed }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const fillH = 60 * v
  const topY = 60 - fillH
  // sine path along the top
  const W = 200
  const segs = 40
  let pathTop = `M 0 ${topY}`
  for (let i = 0; i <= segs; i++) {
    const x = (i / segs) * W
    const y = topY + (revealed ? Math.sin((i / segs) * Math.PI * 4) * 3 : 0)
    pathTop += ` L ${x} ${y}`
  }
  const path = `${pathTop} L ${W} 60 L 0 60 Z`
  return (
    <div className="relative">
      <svg viewBox="0 0 200 60" className="w-full h-16" preserveAspectRatio="none">
        <rect x="0" y="0" width="200" height="60" fill="var(--color-border)" opacity="0.35" />
        <path
          d={path}
          fill={color}
          opacity={revealed ? 0.85 : 0}
          style={{ transition: 'opacity 900ms ease-out, d 1200ms ease-out' }}
        />
      </svg>
      <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
        Nivel · {(v * 100).toFixed(0)}%
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. PileUp — vertical stack of segmented blocks
// ─────────────────────────────────────────────────────────────────────────────
function PileUp({ value, color, revealed, label }: VizProps) {
  const v = Math.max(0, Math.min(1, value))
  const threshold = parseThreshold(label)
  const blocks = 10
  const filledBlocks = Math.round(v * blocks)
  const thresholdBlocks = Math.round(threshold * blocks)
  return (
    <div className="flex items-end gap-[4px] h-32">
      {Array.from({ length: blocks }).map((_, i) => {
        const isOn = i < filledBlocks
        const isAboveThreshold = i >= thresholdBlocks
        const fill = isOn ? (isAboveThreshold ? color : 'var(--color-sector-energia)') : 'var(--color-border)'
        const op = isOn ? 0.92 : 0.35
        return (
          <div
            key={i}
            className="flex-1 origin-bottom"
            style={{
              height: '100%',
              background: fill,
              opacity: revealed ? op : 0,
              transform: revealed ? 'scaleY(1)' : 'scaleY(0)',
              transition: `opacity 280ms ease-out ${i * 60}ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderViz(template: VizTemplate, props: VizProps) {
  switch (template) {
    case 'breach-ceiling': return <BreachCeiling {...props} />
    case 'mass-sliver': return <MassSliver {...props} />
    case 'redline-gauge': return <RedlineGauge {...props} />
    case 'count-grid': return <CountGrid {...props} />
    case 'receipt-stamp': return <ReceiptStamp {...props} />
    case 'margin-rule': return <MarginRule {...props} />
    case 'range-band': return <RangeBand {...props} />
    case 'zero-bar': return <ZeroBar {...props} />
    case 'horizon': return <Horizon {...props} />
    case 'mosaic-tile': return <MosaicTile {...props} />
    case 'threshold-band': return <ThresholdBand {...props} />
    case 'dot-ratio': return <DotRatio {...props} />
    case 'wave-breaker': return <WaveBreaker {...props} />
    case 'pile-up': return <PileUp {...props} />
  }
}

export default function DataPullquote({
  quote,
  attribution,
  stat,
  statLabel,
  statColor = 'text-risk-critical',
  barValue,
  barLabel,
  outlet,
  className,
  vizTemplate,
}: DataPullquoteProps) {
  const parsed = parseStatNumber(stat)
  const { ref: countRef, value: animatedValue } = useCountUp(
    parsed ? parsed.num : 0,
    1600,
    parsed ? parsed.decimals : 0
  )

  const borderColor = outlet
    ? OUTLET_BORDER_COLORS[outlet]
    : statColor.includes('red') ? 'var(--color-sector-salud)'
    : statColor.includes('amber') ? 'var(--color-sector-energia)'
    : statColor.includes('blue') ? 'var(--color-sector-educacion)'
    : 'var(--color-sector-salud)'

  const barColorHex = borderColor

  const [vizRef, revealed] = useReveal()
  const template = vizTemplate ?? autoSelectTemplate(barValue ?? 0, stat, barLabel)
  const vizProps: VizProps = {
    value: barValue ?? 0,
    color: barColorHex,
    label: barLabel,
    stat,
    revealed,
  }

  return (
    <ScrollReveal className={cn('my-10', className)}>
      <figure
        className="relative pl-6 py-6 pr-6 rounded-r-lg bg-background-card"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        role="figure"
        aria-label="Cita con datos"
      >
        {outlet && (
          <div className="mb-3">
            <OutletBadge outlet={outlet} />
          </div>
        )}

        <blockquote className="text-lg md:text-xl italic text-text-secondary leading-relaxed mb-5 font-light">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {attribution && (
          <figcaption className="text-xs text-text-muted uppercase tracking-wider mb-5">
            &mdash; {attribution}
          </figcaption>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              ref={countRef}
              className={cn('text-4xl md:text-5xl font-black tabular-nums tracking-tight', statColor)}
              aria-label={`${stat} ${statLabel}`}
            >
              {parsed
                ? `${animatedValue.toLocaleString('es-MX', {
                    minimumFractionDigits: parsed.decimals,
                    maximumFractionDigits: parsed.decimals,
                  })}${parsed.suffix}`
                : stat}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{statLabel}</p>

          {barValue !== undefined && (
            <div
              ref={vizRef}
              role="img"
              aria-label={`${stat}${barLabel ? ` — ${barLabel}` : ''}`}
              className="mt-3"
            >
              {renderViz(template, vizProps)}
              {barLabel && (
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-3 leading-snug">
                  {barLabel}
                </p>
              )}
            </div>
          )}
        </div>
      </figure>
    </ScrollReveal>
  )
}
