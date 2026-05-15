/**
 * SectorRadialTree — radial node-link tree for the 12 sectors
 *
 * Central hub = Federal procurement total
 * 12 sector nodes on an inner ring, sized by sqrt(spend)
 * Edges: curved bezier from hub to each node
 * Color: SECTOR_COLORS with risk-opacity tint
 * Click → /sectors/:id
 */

import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS, getSectorName, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { SectorStatistics } from '@/api/types'

// ── Sector symbols (from Beeswarm / backlog spec) ────────────────────────────

const SECTOR_SYMBOL: Record<string, string> = {
  salud:           '✚',
  educacion:       '◆',
  infraestructura: '▲',
  energia:         '⚡',
  defensa:         '◉',
  tecnologia:      '◈',
  hacienda:        '⊕',
  gobernacion:     '★',
  agricultura:     '✿',
  ambiente:        '❋',
  trabajo:         '⚙',
  otros:           '◻',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function nodeFill(code: string, riskScore: number): string {
  const hex = SECTOR_COLORS[code] ?? '#64748b'
  const [r, g, b] = hexToRgb(hex)
  const clamped = Math.max(0, Math.min(1, (riskScore - 0.10) / 0.30))
  const a = 0.40 + 0.55 * clamped
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState { sector: SectorStatistics; x: number; y: number }

function Tooltip({ data, lang }: { data: TooltipState; lang: string }) {
  const s = data.sector
  const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
  const rl = getRiskLevelFromScore(s.avg_risk_score)
  const riskColor =
    rl === 'critical' ? '#ef4444' : rl === 'high' ? '#f59e0b' : rl === 'medium' ? '#a16207' : '#71717a'
  const tipW = 210
  const tipH = 200
  const left = data.x + tipW > window.innerWidth - 32 ? data.x - tipW - 8 : data.x + 14
  const top  = data.y + tipH > window.innerHeight - 32 ? data.y - tipH - 8 : data.y + 14

  const rows = [
    { label: lang === 'es' ? 'Gasto total'        : 'Total spend',      value: formatCompactMXN(s.total_value_mxn) },
    { label: lang === 'es' ? 'Contratos'           : 'Contracts',        value: formatNumber(s.total_contracts) },
    { label: lang === 'es' ? 'Adj. directa'        : 'Direct award',     value: `${(s.direct_award_pct ?? 0).toFixed(1)}%` },
    { label: lang === 'es' ? 'Indicador de riesgo' : 'Risk indicator',   value: `${(s.avg_risk_score * 100).toFixed(1)}%`, color: riskColor },
  ]

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 select-none rounded border border-[color:var(--color-border)] bg-[color:var(--color-background-card)] shadow-lg"
      style={{ left, top, width: tipW }}
    >
      <div className="h-1 w-full rounded-t" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] mb-2" style={{ color }}>
          {getSectorName(s.sector_code, lang === 'es' ? 'es' : 'en')}
        </p>
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[color:var(--color-text-muted)]">{row.label}</span>
              <span
                className="text-[11px] font-mono tabular-nums font-bold"
                style={{ color: row.color ?? 'var(--color-text-primary)' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.1em] text-[color:var(--color-text-muted)]">
          {lang === 'es' ? 'Clic para ver perfil →' : 'Click to view profile →'}
        </p>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface SectorRadialTreeProps {
  sectors: SectorStatistics[]
}

export function SectorRadialTree({ sectors }: SectorRadialTreeProps) {
  const { i18n } = useTranslation('sectors')
  const lang = i18n.language
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Canvas dimensions — responsive via container (max-w-4xl = 896px)
  const W = 720
  const H = 560
  const cx = W / 2
  const cy = H / 2

  // Sort by spend desc so biggest sector gets most prominent angle position
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn),
    [sectors],
  )

  // Node radius proportional to sqrt(spend) — range 18px…52px
  const maxSpend = sorted[0]?.total_value_mxn ?? 1
  const nodeRadius = (s: SectorStatistics) => {
    const frac = Math.sqrt(s.total_value_mxn / maxSpend)
    return 18 + frac * 34  // 18..52
  }

  // Place 12 nodes on a ring. Offset start so biggest node is top-center.
  // Two rings: top 6 (bigger) on inner ring, bottom 6 (smaller) on outer ring
  // for a more tree-like top-heavy appearance.
  const INNER_R = 185
  const OUTER_R = 248
  const nodePositions = useMemo(() => {
    const n = sorted.length
    return sorted.map((s, i) => {
      // Distribute evenly in a circle; start at -90° (top), go clockwise
      const angle = (-Math.PI / 2) + (2 * Math.PI * i) / n
      // Alternate between two rings for visual depth
      const ring = i < Math.ceil(n / 2) ? INNER_R : OUTER_R
      return {
        sector: s,
        x: cx + ring * Math.cos(angle),
        y: cy + ring * Math.sin(angle),
        angle,
        r: nodeRadius(s),
      }
    })
  }, [sorted, cx, cy])

  // Hub radius reflects total spend
  const HUB_R = 38
  const totalSpend = sectors.reduce((sum, s) => sum + s.total_value_mxn, 0)
  const totalContracts = sectors.reduce((sum, s) => sum + s.total_contracts, 0)

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, display: 'block', margin: '0 auto' }}
        role="list"
        aria-label={lang === 'es' ? 'Árbol radial de sectores' : 'Sector radial tree'}
      >
        {/* Subtle grid rings for visual depth */}
        {[INNER_R - 30, INNER_R + 10, OUTER_R + 22].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="3 6"
            opacity={0.4}
          />
        ))}

        {/* Edges: curved bezier from hub to each sector node */}
        {nodePositions.map(({ sector: s, x, y }) => {
          const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const isHov = hovered === s.sector_id
          // Control point pulls the curve outward from center
          const midX = (cx + x) / 2
          const midY = (cy + y) / 2
          return (
            <path
              key={`edge-${s.sector_id}`}
              d={`M ${cx} ${cy} Q ${midX} ${midY} ${x} ${y}`}
              fill="none"
              stroke={color}
              strokeWidth={isHov ? 2 : 1}
              opacity={
                hovered === null ? 0.35
                : isHov ? 0.75
                : 0.12
              }
              style={{ transition: 'opacity 0.15s, stroke-width 0.15s', pointerEvents: 'none' }}
            />
          )
        })}

        {/* Sector nodes */}
        {nodePositions.map(({ sector: s, x, y, r }) => {
          const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const fill = nodeFill(s.sector_code, s.avg_risk_score)
          const isHov = hovered === s.sector_id
          const anyHov = hovered !== null
          const opacity = anyHov && !isHov ? 0.35 : 1
          const symbol = SECTOR_SYMBOL[s.sector_code] ?? '◻'
          const name = getSectorName(s.sector_code, lang === 'es' ? 'es' : 'en')
          const daPct = s.direct_award_pct ?? 0
          const isOECDViolator = daPct > 25

          return (
            <g
              key={`node-${s.sector_id}`}
              role="listitem"
              style={{ opacity, cursor: 'pointer' }}
              tabIndex={0}
              aria-label={`${name} — ${formatCompactMXN(s.total_value_mxn)}`}
              onPointerEnter={(e) => {
                setHovered(s.sector_id)
                setTooltip({ sector: s, x: e.clientX, y: e.clientY })
              }}
              onPointerMove={(e) => {
                setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
              }}
              onPointerLeave={() => { setHovered(null); setTooltip(null) }}
              onClick={() => navigate(`/sectors/${s.sector_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/sectors/${s.sector_id}`)
                }
              }}
            >
              {/* Node circle */}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={fill}
                stroke={isOECDViolator ? '#f59e0b' : color}
                strokeWidth={isHov ? 2.5 : isOECDViolator ? 1.5 : 1}
                style={{ transition: 'r 0.15s, stroke-width 0.15s' }}
              />

              {/* Sector symbol */}
              <text
                x={x}
                y={y - (r > 30 ? 6 : 3)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={r > 32 ? 16 : r > 22 ? 12 : 9}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                fill="var(--color-text-primary)"
                opacity={0.85}
              >
                {symbol}
              </text>

              {/* Sector name — below symbol for larger nodes */}
              {r > 26 && (
                <text
                  x={x}
                  y={y + (r > 32 ? 11 : 8)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={r > 38 ? 9 : 8}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                  fill="var(--color-text-primary)"
                  opacity={0.8}
                  style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {name.length > 8 ? name.slice(0, 8) : name}
                </text>
              )}

              {/* OECD chip in top-right corner of node */}
              {isOECDViolator && r > 22 && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={x + r - 5} cy={y - r + 5} r={5} fill="#f59e0b" opacity={0.9} />
                  <text
                    x={x + r - 5}
                    y={y - r + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={6}
                    fontWeight={800}
                    fontFamily="var(--font-family-mono)"
                    fill="#1a1714"
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Central hub */}
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={cx}
            cy={cy}
            r={HUB_R}
            fill="var(--color-background-card)"
            stroke="var(--color-border)"
            strokeWidth={1.5}
          />
          <circle cx={cx} cy={cy} r={HUB_R - 2} fill="none" stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3 4" />
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontFamily="var(--font-family-serif)"
            fontStyle="italic"
            fontWeight={700}
            fill="var(--color-text-primary)"
          >
            {formatCompactMXN(totalSpend).replace(' MXN', '')}
          </text>
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7.5}
            fontFamily="var(--font-family-mono)"
            fontWeight={600}
            fill="var(--color-text-muted)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            MXN TOTAL
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fontFamily="var(--font-family-mono)"
            fill="var(--color-text-muted)"
            opacity={0.7}
          >
            {formatNumber(totalContracts)} {lang === 'es' ? 'contratos' : 'contracts'}
          </text>
        </g>
      </svg>

      {tooltip && <Tooltip data={tooltip} lang={lang} />}
    </div>
  )
}
