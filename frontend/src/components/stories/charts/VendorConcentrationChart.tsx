/**
 * VendorConcentrationChart — Pure SVG dot-matrix strips.
 *
 * Vendor market concentration by category (% of total spend).
 * Color-coded by risk level. OECD 5% concentration limit marked
 * at dot #20 with a vertical cyan line.
 * Each dot = 0.25pp; domain 0-14%.
 */

import { motion } from 'framer-motion'
import { RISK_COLORS } from '@/lib/constants'

interface VendorRow {
  vendor: string
  share: number
  risk: 'critical' | 'high' | 'medium' | 'low'
}

const DATA: VendorRow[] = [
  { vendor: 'Otros top 20',          share: 11.2, risk: 'medium'   },
  { vendor: 'Farmaceutica (top 3)',  share: 8.4,  risk: 'critical' },
  { vendor: 'Energia (CFE/PEMEX)',   share: 6.7,  risk: 'high'     },
  { vendor: 'Construccion (top 5)',  share: 5.9,  risk: 'high'     },
  { vendor: 'Alimentacion (SEGALMEX)', share: 4.8, risk: 'critical' },
  { vendor: 'Tecnologia (top 4)',    share: 3.9,  risk: 'high'     },
  { vendor: 'Logistica (top 3)',     share: 3.1,  risk: 'medium'   },
  { vendor: 'Salud (IMSS red)',      share: 2.8,  risk: 'critical' },
]

const OECD_LIMIT = 5.0
const OECD_COLOR = '#22d3ee'
const CHART_RISK_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high: RISK_COLORS.high,
  medium: RISK_COLORS.medium,
  low: RISK_COLORS.low,
}

const DOTS = 56          // each dot = 0.25pp (0-14% domain)
const DOT_PER_PCT = DOTS / 14
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 170
const COL_W = DOTS * DOT_GAP
const VALUE_W = 56
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 46 + DATA.length * ROW_H + 16

export function VendorConcentrationChart() {
  const oecdDot = Math.round(OECD_LIMIT * DOT_PER_PCT) // = 20

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background-card rounded-sm p-4 border border-border"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Market Concentration
      </p>
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        Top 20 vendors control 46.8% of federal spending
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        Concentration by vendor category · % of total spend · OECD limit: 5%
      </p>

      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Vendor market concentration dot matrix, each dot 0.25pp, OECD 5% line"
        >
          {/* Header */}
          <text
            x={LABEL_W - 6}
            y={22}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            CATEGORÍA
          </text>
          <text
            x={LABEL_W + COL_W + VALUE_W - 2}
            y={22}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            % GASTO
          </text>

          {/* OECD 5% line */}
          <line
            x1={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            x2={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            y1={32}
            y2={46 + DATA.length * ROW_H - 4}
            stroke={OECD_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            opacity={0.85}
          />
          <text
            x={LABEL_W + oecdDot * DOT_GAP + DOT_R + 4}
            y={38}
            fill={OECD_COLOR}
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            OECD 5%
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 52 + rowIdx * ROW_H
            const color = CHART_RISK_COLORS[row.risk]
            const filled = Math.round(row.share * DOT_PER_PCT)

            return (
              <g key={row.vendor}>
                {/* Category label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.vendor}
                </text>

                {/* Dots */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP + DOT_R}
                      cy={y0 + STRIP_H / 2}
                      r={DOT_R}
                      fill={isFilled ? color : '#2d2926'}
                      fillOpacity={isFilled ? 0.9 : 1}
                      stroke={isFilled ? 'none' : '#3d3734'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.share.toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        {(['critical', 'high', 'medium'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: CHART_RISK_COLORS[level] }}
            />
            <span className="text-[10px] font-mono text-text-muted capitalize">{level}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: OECD_COLOR }} />
          <span className="text-[10px] font-mono text-text-muted">OECD benchmark</span>
        </div>
      </div>

      <p className="text-[10px] text-text-muted mt-2 font-mono">
        Source: COMPRANET 2002-2025 · Each dot = 0.25pp · RUBLI v0.6.5 risk model
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
