/**
 * ObservatoryScatter — the faithful-encoding Observatory macro view.
 *
 * Adopted 2026-05-29 (option 1) after the honest Atlas grade: the prior
 * constellation's position + size encoded nothing (hand-placed centers,
 * golden-spiral artifact, every cluster ~55 dots despite a 72× population
 * range). This bubble scatter makes every channel carry real data — one
 * bubble per cluster:
 *
 *   • x  = scale (vendor count, log)       → how much of the market
 *   • y  = high-risk rate (highRiskPct)     → how dirty
 *   • r  = Tier-1 priority leads (t1)       → how many actionable targets
 *   • hue = risk ramp on the high-risk rate → redder = dirtier
 *
 * Top-right + large = the investigation target the eye lands on first.
 *
 * ⚠ Data caveat: cluster stats come from the static meta builders
 * (buildPatternMeta / buildSectorMeta), same numbers the labels always used.
 * Faithful ENCODING on semi-curated data; Stage 2 binds these to a live
 * per-cluster aggregates endpoint.
 *
 * Accessibility: each bubble is a focusable, keyboard-activatable group with
 * an aria-label — unlike the canvas constellation, which was invisible to AT.
 */
import { useMemo } from 'react'
import { riskRamp, RISK_COLORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

export interface ScatterCluster {
  code: string
  label: string
  vendors: number
  t1: number
  highRiskPct: number
}

interface Props {
  clusters: ScatterCluster[]
  lang: 'en' | 'es'
  onClusterClick: (code: string) => void
}

const W = 1180
const H = 560
const M = { top: 54, right: 70, bottom: 72, left: 88 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom
const PAD_X = 0.06
const PAD_Y = 0.10

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

export function ObservatoryScatter({ clusters, lang, onClusterClick }: Props) {
  const scales = useMemo(() => {
    if (clusters.length === 0) return { minLogV: 0, maxLogV: 1, maxHr: 1, maxT1: 1 }
    const logV = clusters.map((c) => Math.log10(Math.max(1, c.vendors)))
    return {
      minLogV: Math.min(...logV),
      maxLogV: Math.max(...logV),
      maxHr: Math.max(...clusters.map((c) => c.highRiskPct)) * 1.15,
      maxT1: Math.max(...clusters.map((c) => Math.max(1, c.t1))),
    }
  }, [clusters])

  const xFor = (vendors: number) => {
    const lv = Math.log10(Math.max(1, vendors))
    const t = scales.maxLogV === scales.minLogV ? 0.5 : (lv - scales.minLogV) / (scales.maxLogV - scales.minLogV)
    return M.left + (PAD_X + t * (1 - 2 * PAD_X)) * PLOT_W
  }
  const yFor = (hr: number) => {
    const t = scales.maxHr === 0 ? 0 : hr / scales.maxHr
    return M.top + (1 - (PAD_Y + t * (1 - 2 * PAD_Y))) * PLOT_H
  }
  const rFor = (t1: number) => 9 + (Math.sqrt(Math.max(1, t1)) / Math.sqrt(scales.maxT1)) * 29

  const bubbles = useMemo(
    () =>
      [...clusters]
        .sort((a, b) => b.t1 - a.t1)
        .map((c) => ({ ...c, cx: xFor(c.vendors), cy: yFor(c.highRiskPct), r: rFor(c.t1), fill: riskRamp(c.highRiskPct) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clusters, scales],
  )

  const xTicks = useMemo(() => {
    const ticks: number[] = []
    for (let p = Math.floor(scales.minLogV); p <= Math.ceil(scales.maxLogV); p++) ticks.push(10 ** p)
    return ticks
  }, [scales])
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8].filter((v) => v <= scales.maxHr)

  return (
    <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-background-card)', borderRadius: 4 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="group"
        aria-label={lang === 'es' ? 'Dispersión de patrones por escala y riesgo' : 'Scatter of patterns by scale and risk'}
      >
        {yTicks.map((v) => {
          const y = yFor(v)
          return (
            <g key={`y${v}`}>
              <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
              <text x={M.left - 10} y={y + 3} textAnchor="end" fill="var(--color-text-muted)" fontSize={11} fontFamily="var(--font-family-mono)">
                {Math.round(v * 100)}%
              </text>
            </g>
          )
        })}
        {xTicks.map((v) => {
          const x = xFor(v)
          return (
            <g key={`x${v}`}>
              <line x1={x} y1={M.top} x2={x} y2={H - M.bottom} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.45} />
              <text x={x} y={H - M.bottom + 18} textAnchor="middle" fill="var(--color-text-muted)" fontSize={11} fontFamily="var(--font-family-mono)">
                {v >= 1000 ? `${v / 1000}k` : v}
              </text>
            </g>
          )
        })}

        <text x={M.left + PLOT_W / 2} y={H - 16} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
          {lang === 'es' ? 'ESCALA · NÚMERO DE PROVEEDORES (log) →' : 'SCALE · VENDOR COUNT (log) →'}
        </text>
        <text transform={`translate(20, ${M.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={12} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
          {lang === 'es' ? '↑ TASA DE ALTO RIESGO' : '↑ HIGH-RISK RATE'}
        </text>
        <text x={W - M.right - 6} y={M.top + 14} textAnchor="end" fill="var(--color-text-muted)" fontSize={10} fontStyle="italic" fontFamily="var(--font-family-serif)" opacity={0.8}>
          {lang === 'es' ? 'grande + alto = objetivo prioritario' : 'large + high = priority target'}
        </text>

        {bubbles.map((b) => {
          const pct = Math.round(b.highRiskPct * 100)
          const aria =
            lang === 'es'
              ? `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} proveedores, ${b.t1} Tier-1, ${pct}% alto riesgo. Abrir expediente.`
              : `${toTitleCase(b.label)}: ${formatNumber(b.vendors)} vendors, ${b.t1} Tier-1, ${pct}% high-risk. Open dossier.`
          return (
            <g
              key={b.code}
              role="button"
              tabIndex={0}
              aria-label={aria}
              style={{ cursor: 'pointer' }}
              onClick={() => onClusterClick(b.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClusterClick(b.code)
                }
              }}
            >
              <title>{aria}</title>
              {/* invisible hit-pad so the whole label+bubble area is clickable */}
              <rect x={b.cx - Math.max(b.r, 60)} y={b.cy - b.r - 26} width={Math.max(b.r, 60) * 2} height={b.r * 2 + 30} fill="transparent" />
              <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} fillOpacity={0.22} stroke={b.fill} strokeWidth={1.5} />
              <circle cx={b.cx} cy={b.cy} r={3} fill={b.fill} />
              <text x={b.cx} y={b.cy - b.r - 19} textAnchor="middle" fill="var(--color-text-primary)" fontSize={12} fontFamily='"Source Serif Pro", Georgia, serif' fontStyle="italic" fontWeight={600}>
                {toTitleCase(b.label)}
              </text>
              <text x={b.cx} y={b.cy - b.r - 7} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
                {formatNumber(b.vendors)} {lang === 'es' ? 'prov' : 'vend'} · {b.t1} T1 · {pct}%
              </text>
            </g>
          )
        })}
      </svg>

      {/* how-to-read strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4 pt-1">
        <ReadItem glyph="◉" title={lang === 'es' ? 'Posición' : 'Position'} body={lang === 'es' ? 'Derecha = más proveedores · Arriba = mayor tasa de alto riesgo' : 'Right = more vendors · Up = higher high-risk rate'} />
        <ReadItem glyph="⬤" title={lang === 'es' ? 'Tamaño' : 'Size'} body={lang === 'es' ? 'Área ∝ proveedores Tier-1 (objetivos prioritarios)' : 'Area ∝ Tier-1 vendors (priority targets)'} />
        <ReadItem glyph="●" title={lang === 'es' ? 'Color' : 'Color'} body={lang === 'es' ? 'Rampa de riesgo: más rojo = mayor tasa' : 'Risk ramp: redder = higher rate'} />
      </div>
    </div>
  )
}

function ReadItem({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <div style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: 12 }}>
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{glyph}</span>
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</span>
      </div>
      <p className="mt-0.5" style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{body}</p>
    </div>
  )
}

// re-export RISK_COLORS consumers may want for the section accent
export { RISK_COLORS }
