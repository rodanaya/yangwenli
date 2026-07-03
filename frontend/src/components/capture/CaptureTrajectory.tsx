/**
 * CaptureTrajectory — the Reuters *Forever Pollution* threshold-crossing port.
 *
 * One (institution, vendor) pair drawn as a connected line through years on a
 * SHARED 0–100% y-domain (so the 50% ceiling sits at one pixel row in every
 * card — the fixed-threshold invariant). Each segment is colored by which side
 * of the ceiling it sits on; where a segment straddles 50% it is split at the
 * exact crossing point. This renders honestly for clean climbs, spikes, AND
 * sawtooths (e.g. AFAC crosses twice) — the model-pitch "monotonic climb" the
 * data sometimes contradicts is never asserted by the geometry.
 *
 * DESIGNUS audit fixes folded in: F3 (per-segment recolor, no barber-pole),
 * multi-crossing handled, years computed from the timeline (never hardcoded).
 */

import type { CapturePoint } from '@/api/client'

const RED = 'var(--color-risk-critical)'
const ZINC = '#71717a'

interface Props {
  timeline: CapturePoint[]
  ceil: number
  peakYear: number
  peakSharePct: number
  latestSharePct: number
  lang: 'en' | 'es'
  variant?: 'card' | 'lead'
}

export function CaptureTrajectory({
  timeline,
  ceil,
  peakYear,
  peakSharePct,
  latestSharePct,
  lang,
  variant = 'card',
}: Props) {
  const isLead = variant === 'lead'
  const W = isLead ? 320 : 150
  const H = isLead ? 168 : 104
  const PLOT_H = isLead ? 128 : 72
  const PAD = 10

  const tl = [...timeline].sort((a, b) => a.year - b.year)
  if (tl.length === 0) return null
  const years = tl.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = Math.max(1, maxYear - minYear)
  const x = (year: number) => PAD + ((year - minYear) / span) * (W - 2 * PAD)
  const y = (share: number) => 6 + (1 - share / 100) * (PLOT_H - 12)

  // Build colored segments; split any segment that straddles the ceiling so the
  // color switches exactly at 50% (true Reuters recolor — no overlap).
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = []
  for (let i = 0; i < tl.length - 1; i++) {
    const a = tl[i]
    const b = tl[i + 1]
    const ax = x(a.year)
    const ay = y(a.share_pct)
    const bx = x(b.year)
    const by = y(b.share_pct)
    const aAbove = a.share_pct >= ceil
    const bAbove = b.share_pct >= ceil
    if (aAbove === bAbove) {
      segs.push({ x1: ax, y1: ay, x2: bx, y2: by, color: aAbove ? RED : ZINC })
    } else {
      const t = (ceil - a.share_pct) / (b.share_pct - a.share_pct)
      const cx = ax + t * (bx - ax)
      const cy = y(ceil)
      segs.push({ x1: ax, y1: ay, x2: cx, y2: cy, color: aAbove ? RED : ZINC })
      segs.push({ x1: cx, y1: cy, x2: bx, y2: by, color: bAbove ? RED : ZINC })
    }
  }

  const crossYear = tl.find((p) => p.share_pct >= ceil)?.year ?? null
  const tickYears = isLead
    ? years
    : Array.from(new Set([minYear, peakYear, maxYear])).sort((a, b) => a - b)

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ maxWidth: '100%', height: 'auto' }}
      role="img"
      aria-label={
        lang === 'en'
          ? `Vendor share of institution spend ${minYear}–${maxYear}; ${crossYear ? `crossed the 50% ceiling in ${crossYear}, ` : ''}peaked ${peakSharePct}% in ${peakYear}, ${latestSharePct >= ceil ? `holds ${latestSharePct}%` : `fell to ${latestSharePct}%`}.`
          : `Participación del proveedor en el gasto institucional ${minYear}–${maxYear}; ${crossYear ? `cruzó el techo del 50% en ${crossYear}, ` : ''}llegó a ${peakSharePct}% en ${peakYear}, ${latestSharePct >= ceil ? `sostiene ${latestSharePct}%` : `cayó a ${latestSharePct}%`}.`
      }
    >
      {/* 50% ceiling — drawn first, behind the path */}
      <line
        x1={PAD}
        x2={W - PAD}
        y1={y(ceil)}
        y2={y(ceil)}
        stroke={RED}
        strokeWidth={0.75}
        strokeDasharray="3 3"
        opacity={0.5}
      />
      {/* trajectory segments (recolored at the crossing) */}
      {segs.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.color}
          strokeWidth={s.color === RED ? (isLead ? 2.4 : 1.8) : isLead ? 1.8 : 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* year dots, colored by their own side of the ceiling */}
      {tl.map((p) => (
        <circle
          key={p.year}
          cx={x(p.year)}
          cy={y(p.share_pct)}
          r={p.share_pct >= ceil ? (isLead ? 3 : 2.2) : isLead ? 2.4 : 1.6}
          fill={p.share_pct >= ceil ? RED : ZINC}
        />
      ))}
      {/* year ticks */}
      {tickYears.map((yr) => (
        <text
          key={`y-${yr}`}
          x={x(yr)}
          y={PLOT_H + (isLead ? 14 : 9)}
          textAnchor="middle"
          fontSize={isLead ? 9 : 8}
          fontFamily="JetBrains Mono, monospace"
          fill="var(--color-text-muted)"
        >
          {isLead ? yr : `'${String(yr).slice(2)}`}
        </text>
      ))}
      {/* crossing-year callout */}
      {crossYear !== null && (
        <text
          x={x(crossYear)}
          y={y(ceil) - 4}
          textAnchor="middle"
          fontSize={isLead ? 10 : 7.5}
          fontFamily="JetBrains Mono, monospace"
          fontWeight={700}
          fill={RED}
        >
          {isLead ? (lang === 'en' ? `crossed 50% in ${crossYear}` : `cruzó el 50% en ${crossYear}`) : `'${String(crossYear).slice(2)}`}
        </text>
      )}
      {/* lead-only: peak marker on the line */}
      {isLead && (
        <text
          x={x(peakYear)}
          y={y(peakSharePct) - 7}
          textAnchor="middle"
          fontSize={12}
          fontFamily="JetBrains Mono, monospace"
          fill="var(--color-text-secondary)"
        >
          ▲ {peakSharePct}% ({peakYear})
        </text>
      )}
    </svg>
  )
}
