/**
 * PadronBand — Lámina I «El Padrón» for /atlas scope 0.
 *
 * One full-width band = everything the lens's cohorts contracted. Each cohort
 * is a slice whose WIDTH is its contracted value and whose 45° ink hatch rises
 * to the share of its vendors in the high/critical band. Same grammar as the
 * Sectors counting table (ArqueoMesa) so the reader already knows how to read
 * it; works unchanged at 7, 12 or 72 slices. Pure SVG, ResizeObserver width.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PATTERN_COLORS, RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

export interface PadronCluster {
  code: string
  label: string
  vendors: number
  t1: number
  /** 0..1 — share of the cohort's vendors in the high or critical band. */
  highRiskPct: number
  totalValueMxn: number
}

interface Props {
  clusters: PadronCluster[]
  lens: string
  lang: 'en' | 'es'
  onSelect?: (code: string) => void
  spotlightCode?: string | null
}

const READOUT_H = 20
const BAND_H = 260
const STRIP_H = 4
const LABEL_H = 18
const GUTTER_W = 34
const RIGHT_PAD = 8
const MIN_COL_W = 6
const LABEL_MIN_W = 72
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
const MONO = "'IBM Plex Mono', monospace"

function domainColor(lens: string, code: string): string {
  if (lens === 'patterns') return PATTERN_COLORS[code] ?? 'var(--color-border)'
  if (lens === 'sectors') return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
  return 'var(--color-border)'
}

function wrapLabel(label: string, w: number): [string, string | null] {
  const max = Math.max(4, Math.floor(w / 6.6))
  if (label.length <= max) return [label, null]
  const words = label.split(' ')
  let first = ''
  while (words.length && (first + ' ' + words[0]).trim().length <= max) first = (first + ' ' + words.shift()).trim()
  if (!first) first = words.shift() ?? ''
  const rest = words.join(' ')
  const second = rest.length > max ? rest.slice(0, Math.max(3, max - 1)) + '…' : rest
  return [first, second || null]
}

export function PadronBand({ clusters, lens, lang, onSelect, spotlightCode }: Props) {
  const isEs = lang === 'es'
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const ordered = useMemo(
    () => [...clusters].sort((a, b) => b.totalValueMxn - a.totalValueMxn),
    [clusters],
  )
  const totalValue = useMemo(() => ordered.reduce((s, c) => s + c.totalValueMxn, 0), [ordered])
  const widest = ordered[0]
  const hottest = useMemo(
    () => ordered.reduce((a, b) => (b.highRiskPct > a.highRiskPct ? b : a), ordered[0]),
    [ordered],
  )

  // Axis max snaps to a nice ceiling above the hottest cohort so a lens whose
  // rates all sit at 1–5% (sectors) is legible; ticks are drawn from the same
  // scale, so the reader always sees the real numbers.
  const axisMax = useMemo(() => {
    const m = hottest ? hottest.highRiskPct : 1
    return m <= 0.1 ? 0.1 : m <= 0.25 ? 0.25 : m <= 0.5 ? 0.5 : 1
  }, [hottest])
  const yFor = (rate: number) => BAND_H * (1 - Math.min(1, rate / axisMax))
  const ticks = axisMax === 0.1 ? [0, 0.025, 0.05, 0.075, 0.1]
    : axisMax === 0.25 ? [0, 0.05, 0.1, 0.15, 0.2, 0.25]
    : axisMax === 0.5 ? [0, 0.1, 0.2, 0.3, 0.4, 0.5]
    : [0, 0.25, 0.5, 0.75, 1]

  const bandW = Math.max(0, width - GUTTER_W - RIGHT_PAD)
  // Legible floor per slice, remainder split strictly by value so Σ === bandW
  // and the run can never spill past the plate edge (same rule as ArqueoMesa).
  const colWidths = useMemo(() => {
    if (totalValue <= 0 || bandW <= 0) return ordered.map(() => 0)
    const n = ordered.length
    const floor = Math.min(MIN_COL_W, bandW / n)
    const free = Math.max(0, bandW - floor * n)
    return ordered.map((c) => floor + (c.totalValueMxn / totalValue) * free)
  }, [ordered, totalValue, bandW])

  const xOffsets = useMemo(() => {
    const xs: number[] = []
    let acc = GUTTER_W
    for (const w of colWidths) {
      xs.push(acc)
      acc += w
    }
    return xs
  }, [colWidths])

  const narrow = useMemo(
    () => ordered.map((c, i) => ({ c, w: colWidths[i] })).filter((d) => d.w < LABEL_MIN_W),
    [ordered, colWidths],
  )

  const readout = useMemo(() => {
    if (!hover) {
      return isEs
        ? 'pase el cursor por una rebanada · clic → ficha de la cohorte'
        : 'hover a slice · click → cohort dossier'
    }
    const c = ordered.find((x) => x.code === hover)
    if (!c) return ''
    const share = totalValue > 0 ? (c.totalValueMxn / totalValue) * 100 : 0
    const pct = (c.highRiskPct * 100).toFixed(0)
    const vend = c.vendors.toLocaleString(isEs ? 'es-MX' : 'en-US')
    return isEs
      ? `${c.label} · ${formatCompactMXN(c.totalValueMxn)} (${share.toFixed(0)}% de la banda) · ${pct}% de sus ${vend} proveedores en alto/crítico · ${c.t1} T1`
      : `${c.label} · ${formatCompactMXN(c.totalValueMxn)} (${share.toFixed(0)}% of the band) · ${pct}% of its ${vend} vendors high/critical · ${c.t1} T1`
  }, [hover, ordered, totalValue, isEs])

  const waterline = ordered
    .map((c, i) => {
      const y = yFor(c.highRiskPct).toFixed(1)
      return `${xOffsets[i].toFixed(1)},${y} ${(xOffsets[i] + colWidths[i]).toFixed(1)},${y}`
    })
    .join(' ')

  // Circled indices cover 20 narrow slices; past that (72 categories) the chip
  // row below carries every name, so the legend line is dropped, not garbled.
  const legend = narrow.length <= CIRCLED.length
    ? narrow.map((d, i) => `${CIRCLED[i]} ${d.c.label} ${(d.c.highRiskPct * 100).toFixed(0)}%`).join(' · ')
    : ''

  const callout =
    widest && hottest && widest.code !== hottest.code
      ? isEs
        ? `más dinero — ${widest.label} · ${formatCompactMXN(widest.totalValueMxn)}   ·   más caliente — ${hottest.label} · ${(hottest.highRiskPct * 100).toFixed(0)}%`
        : `most money — ${widest.label} · ${formatCompactMXN(widest.totalValueMxn)}   ·   hottest — ${hottest.label} · ${(hottest.highRiskPct * 100).toFixed(0)}%`
      : null

  return (
    <div ref={containerRef} className="w-full">
      {ordered.length === 0 ? null : (<>
      <div
        className="font-mono tabular-nums"
        style={{
          height: READOUT_H,
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{readout}</span>
        <span style={{ flexShrink: 0, fontSize: 8, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          {isEs ? `% de proveedores en alto/crítico · eje 0–${(axisMax * 100).toFixed(0)}` : `% of vendors high/critical · axis 0–${(axisMax * 100).toFixed(0)}`}
        </span>
      </div>

      <svg
        width={width}
        height={BAND_H + STRIP_H + LABEL_H}
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={
          isEs
            ? 'Banda de cohortes: ancho por valor contratado, achurado por proporción de proveedores de alto riesgo'
            : 'Cohort band: width by contracted value, hatch by share of high-risk vendors'
        }
      >
        <defs>
          <pattern id="padron-fine" width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
          </pattern>
        </defs>

        {ticks.map((t) => {
          const y = yFor(t)
          return (
            <g key={t}>
              <text x={GUTTER_W - 6} y={y + 3} textAnchor="end" fontFamily={MONO} fontSize={8.5} fill="var(--color-text-muted)">
                {axisMax <= 0.25 ? (t * 100).toFixed(t * 100 % 1 ? 1 : 0) : (t * 100).toFixed(0)}
              </text>
              {t > 0 && t < axisMax && (
                <line x1={GUTTER_W} y1={y} x2={GUTTER_W + bandW} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="2 4" />
              )}
            </g>
          )
        })}
        <line x1={GUTTER_W} y1={BAND_H} x2={GUTTER_W + bandW} y2={BAND_H} stroke="var(--color-text-primary)" strokeOpacity={0.45} strokeWidth={1} />

        {ordered.map((c, i) => {
          const x = xOffsets[i]
          const w = colWidths[i]
          const hatchY = yFor(c.highRiskPct)
          const isHover = hover === c.code
          const dimmed = hover !== null && !isHover
          const showLabel = w >= LABEL_MIN_W
          const [l1, l2] = showLabel ? wrapLabel(c.label, w) : ['', null]
          const block = l2 ? 44 : 32
          const labelAbove = hatchY - block > 12
          const baseY = labelAbove ? hatchY - block + 10 : hatchY + 16
          const narrowIdx = narrow.findIndex((d) => d.c.code === c.code)
          const activate = () => onSelect?.(c.code)
          return (
            <g
              key={c.code}
              role="button"
              tabIndex={0}
              aria-label={`${c.label} — ${formatCompactMXN(c.totalValueMxn)}, ${(c.highRiskPct * 100).toFixed(0)}%`}
              style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
              onMouseEnter={() => setHover(c.code)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(c.code)}
              onBlur={() => setHover(null)}
              onClick={activate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  activate()
                }
              }}
            >
              <rect x={x} y={0} width={w} height={BAND_H} fill="transparent" />
              {i > 0 && <line x1={x} y1={0} x2={x} y2={BAND_H} stroke="var(--color-border)" strokeWidth={1} />}
              <rect x={x} y={hatchY} width={w} height={BAND_H - hatchY} fill="url(#padron-fine)" opacity={dimmed ? 0.5 : 1} />
              <rect x={x} y={BAND_H} width={w} height={STRIP_H} fill={domainColor(lens, c.code)} opacity={dimmed ? 0.5 : 1} />
              {spotlightCode === c.code && (
                <rect x={x + 0.5} y={0.5} width={Math.max(0, w - 1)} height={BAND_H - 1} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="3 3" />
              )}
              {showLabel ? (
                <>
                  <text
                    x={x + 6}
                    y={baseY}
                    fontFamily={MONO}
                    fontSize={11}
                    fontWeight={isHover ? 700 : 500}
                    fill="var(--color-text-primary)"
                    opacity={dimmed ? 0.55 : 1}
                  >
                    {l1}
                  </text>
                  {l2 && (
                    <text x={x + 6} y={baseY + 12} fontFamily={MONO} fontSize={11} fontWeight={isHover ? 700 : 500} fill="var(--color-text-primary)" opacity={dimmed ? 0.55 : 1}>
                      {l2}
                    </text>
                  )}
                  <text
                    x={x + 6}
                    y={baseY + (l2 ? 24 : 12)}
                    fontFamily={MONO}
                    fontSize={9.5}
                    fill="var(--color-text-muted)"
                    opacity={dimmed ? 0.55 : 1}
                  >
                    {formatCompactMXN(c.totalValueMxn)} · {(c.highRiskPct * 100).toFixed(0)}%
                  </text>
                  {w >= 110 && (
                    <text x={x + w / 2} y={BAND_H + STRIP_H + 12} textAnchor="middle" fontFamily={MONO} fontSize={9} letterSpacing="0.06em" fill="var(--color-text-muted)">
                      {c.code.replace(/^cat_/, '').toUpperCase()}
                    </text>
                  )}
                </>
              ) : (
                narrowIdx < CIRCLED.length && (
                  <text x={x + w / 2} y={BAND_H + STRIP_H + 12} textAnchor="middle" fontFamily={MONO} fontSize={9} fill="var(--color-text-muted)">
                    {CIRCLED[narrowIdx]}
                  </text>
                )
              )}
            </g>
          )
        })}

        <polyline points={waterline} fill="none" stroke={RISK_COLORS.critical} strokeWidth={1.4} pointerEvents="none" />

        {callout && (
          <text x={GUTTER_W + bandW} y={10} textAnchor="end" fontFamily={MONO} fontSize={8.5} fill="var(--color-text-muted)" pointerEvents="none">
            {callout}
          </text>
        )}
      </svg>

      {legend && (
        <p className="font-mono tabular-nums mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          {legend}
        </p>
      )}
      </>)}
    </div>
  )
}
