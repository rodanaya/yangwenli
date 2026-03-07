/**
 * HexMap — Hexagonal cartogram of Mexico's 32 states
 *
 * Each hexagon represents one state. All hexes are the same size (area equality),
 * which avoids the geographic problem where huge but sparse northern states
 * dominate a traditional choropleth. Color = selected metric.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SubnationalStateSummary } from '@/api/types'
import { RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

// ── Hex grid layout ────────────────────────────────────────────────────────────
// [row, col] positions in a pointy-top hex grid.
// Arranged to approximate Mexico's geographic layout.
const HEX_POSITIONS: Record<string, [number, number]> = {
  BC:   [0, 2],  CHIH: [0, 5],  COAH: [0, 7],  NL:   [0, 9],  TAMPS:[0, 11],
  BCS:  [1, 1],  SON:  [1, 3],  SIN:  [1, 4],  DGO:  [1, 6],  ZAC:  [1, 8],  SLP:  [1, 10],
  NAY:  [2, 3],  JAL:  [2, 5],  AGS:  [2, 6],  GTO:  [2, 7],  QRO:  [2, 8],  HGO:  [2, 9],  VER:  [2, 10], QROO:[2, 12],
  COL:  [3, 4],  MICH: [3, 6],  MEX:  [3, 7],  CDMX: [3, 8],  TLAX: [3, 9],  PUE:  [3, 10], OAX:  [3, 11], YUC: [3, 12], CAMP:[3, 13],
  GRO:  [4, 7],  MOR:  [4, 9],  TAB:  [4, 12],
  CHIS: [5, 11],
}

// State abbreviation labels shown inside each hex
const HEX_LABELS: Record<string, string> = {
  BC: 'BC', BCS: 'BCS', SON: 'SON', CHIH: 'CHIH', COAH: 'COAH', NL: 'NL', TAMPS: 'TAM',
  SIN: 'SIN', DGO: 'DGO', ZAC: 'ZAC', SLP: 'SLP', NAY: 'NAY', JAL: 'JAL',
  AGS: 'AGS', GTO: 'GTO', QRO: 'QRO', HGO: 'HGO', VER: 'VER', QROO: 'QR',
  COL: 'COL', MICH: 'MIC', MEX: 'MEX', CDMX: 'CDM', TLAX: 'TLX', PUE: 'PUE',
  OAX: 'OAX', YUC: 'YUC', CAMP: 'CAM', GRO: 'GRO', MOR: 'MOR', TAB: 'TAB', CHIS: 'CHS',
}

type Metric = 'amount' | 'risk' | 'contracts'

interface Props {
  states: SubnationalStateSummary[]
  metric: Metric
}

function getMetricValue(s: SubnationalStateSummary, metric: Metric): number {
  if (metric === 'amount')    return s.total_value_mxn ?? 0
  if (metric === 'risk')      return s.avg_risk_score ?? 0
  return s.contract_count ?? 0
}

function getRiskColor(r: number) {
  if (r >= 0.5) return RISK_COLORS.critical
  if (r >= 0.3) return RISK_COLORS.high
  if (r >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
}

const METRIC_COLORS: Record<Metric, [string, string]> = {
  amount:    ['#dbeafe', '#1d4ed8'],
  risk:      ['#dcfce7', '#dc2626'],
  contracts: ['#ede9fe', '#7c3aed'],
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}
function lerpColor(a: string, b: string, t: number) {
  const [r1,g1,b1] = hexToRgb(a); const [r2,g2,b2] = hexToRgb(b)
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`
}

// Pointy-top hex: returns SVG path string for a hex centred at (cx, cy) with radius r
function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  })
  return `M${pts.join('L')}Z`
}

export function HexMap({ states, metric }: Props) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)

  const stateByCode = useMemo(() => {
    const m = new Map<string, SubnationalStateSummary>()
    states.forEach(s => m.set(s.state_code, s))
    return m
  }, [states])

  const maxValue = useMemo(() =>
    Math.max(...states.map(s => getMetricValue(s, metric)), 1),
    [states, metric]
  )

  // Hex geometry constants
  const R = 28          // hex radius (point-to-point / 2)
  const W = R * Math.sqrt(3)  // flat-to-flat width
  const H = R * 2             // point-to-point height
  const PAD = 8

  // Compute SVG dimensions based on grid
  const cols = 14, rows = 6
  const svgW = cols * W + PAD * 2 + W / 2
  const svgH = rows * H * 0.75 + H * 0.5 + PAD * 2

  const hexes = useMemo(() =>
    Object.entries(HEX_POSITIONS).map(([code, [row, col]]) => {
      const cx = PAD + col * W + (row % 2 === 1 ? W / 2 : 0) + W / 2
      const cy = PAD + row * H * 0.75 + H / 2
      const state = stateByCode.get(code)
      const value = state ? getMetricValue(state, metric) : 0
      const t = maxValue > 0 ? Math.pow(value / maxValue, 0.4) : 0
      const [c1, c2] = METRIC_COLORS[metric]
      const fill = state ? lerpColor(c1, c2, t) : '#e2e8f0'
      return { code, cx, cy, fill, state, value }
    }),
    [stateByCode, metric, maxValue]
  )

  const hoveredState = hovered ? stateByCode.get(hovered) : null
  const fmt = metric === 'amount' ? formatCompactMXN : metric === 'risk' ? (v: number) => v.toFixed(3) : (v: number) => v.toLocaleString()

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ maxHeight: 320 }}
      >
        {hexes.map(({ code, cx, cy, fill, state }) => {
          const isHovered = code === hovered
          return (
            <g
              key={code}
              style={{ cursor: state ? 'pointer' : 'default' }}
              onClick={() => state && navigate(`/state-expenditure/${code}`)}
              onMouseEnter={() => setHovered(code)}
              onMouseLeave={() => setHovered(null)}
            >
              <path
                d={hexPath(cx, cy, isHovered ? R + 2 : R - 1)}
                fill={isHovered ? '#f59e0b' : fill}
                stroke={isHovered ? '#d97706' : '#1e293b'}
                strokeWidth={isHovered ? 1.5 : 0.7}
              />
              <text
                x={cx} y={cy + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={R > 24 ? 8 : 7}
                fontFamily="monospace"
                fill={isHovered ? '#1e293b' : '#334155'}
                fontWeight={isHovered ? '700' : '400'}
                pointerEvents="none"
              >
                {HEX_LABELS[code] ?? code}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && (
        <div className="absolute top-2 right-2 bg-slate-900/95 border border-slate-700 rounded px-3 py-2 text-xs pointer-events-none shadow-xl">
          <p className="font-semibold text-slate-100 mb-0.5">{hoveredState.state_name}</p>
          <p className="text-slate-300">
            {metric === 'amount' ? 'Spending' : metric === 'risk' ? 'Avg Risk' : 'Contracts'}:{' '}
            <span className="text-white font-bold">{fmt(getMetricValue(hoveredState, metric))}</span>
          </p>
          <p className="text-slate-400 text-[10px] mt-0.5">
            Risk:{' '}
            <span style={{ color: getRiskColor(hoveredState.avg_risk_score ?? 0) }}>
              {(hoveredState.avg_risk_score ?? 0).toFixed(3)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
