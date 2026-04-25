/**
 * ThresholdSplittingChart — Pure SVG dot-matrix strips.
 *
 * Visualizes a real threshold-splitting pattern: 12 contracts awarded
 * on a single day, all just below the supervision threshold.
 * Each dot = $10M MXN; domain 0-1520M. Red vertical line at $1,500M.
 * The visual story: every strip reaches almost to — but never crosses — the red line.
 */

import { motion } from 'framer-motion'
import { RISK_COLORS } from '@/lib/constants'

interface ContractRow {
  contrato: string
  monto: number
  hora: string
}

const DATA: ContractRow[] = [
  { contrato: '#1',  monto: 1433, hora: '09:14' },
  { contrato: '#2',  monto: 1441, hora: '09:22' },
  { contrato: '#3',  monto: 1438, hora: '09:31' },
  { contrato: '#4',  monto: 1445, hora: '10:03' },
  { contrato: '#5',  monto: 1437, hora: '10:18' },
  { contrato: '#6',  monto: 1442, hora: '10:45' },
  { contrato: '#7',  monto: 1439, hora: '11:12' },
  { contrato: '#8',  monto: 1444, hora: '11:38' },
  { contrato: '#9',  monto: 1436, hora: '13:02' },
  { contrato: '#10', monto: 1441, hora: '13:29' },
  { contrato: '#11', monto: 1438, hora: '14:11' },
  { contrato: '#12', monto: 1432, hora: '14:47' },
]

const THRESHOLD = 1500
const DOMAIN_MAX = 1520
const totalValue = DATA.reduce((sum, d) => sum + d.monto, 0)

const DOTS = 76        // 20M per dot → 1520M ceiling
const DOT_PER_M = DOTS / DOMAIN_MAX
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 84
const COL_W = DOTS * DOT_GAP
const VALUE_W = 62
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 46 + DATA.length * ROW_H + 16

export function ThresholdSplittingChart() {
  const thresholdDot = Math.round(THRESHOLD * DOT_PER_M) // = 75

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background-card rounded-sm p-4 border border-border"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Threshold Splitting
      </p>
      <h3 className="text-base font-bold text-text-primary leading-tight mb-0.5">
        12 contracts in 6 hours, all below the $1,500M oversight limit
      </h3>
      <p className="text-xs text-text-muted font-mono mb-4">
        HEMOSER · 2 Aug 2023 · Total: ${totalValue.toLocaleString()}M MXN
        ({Math.round((totalValue / THRESHOLD) * 100) / 100}x threshold if combined)
      </p>

      <div className="border-l-2 pl-3 py-1 mb-4" style={{ borderColor: RISK_COLORS.high }}>
        <div className="text-2xl font-mono font-bold" style={{ color: RISK_COLORS.high }}>
          $17.3B MXN
        </div>
        <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
          Total split across 12 contracts to avoid oversight
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Dot matrix of 12 contracts all clustering just below 1500M threshold"
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
            CONTRATO
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
            MONTO MXN
          </text>

          {/* Supervision threshold line */}
          <line
            x1={LABEL_W + thresholdDot * DOT_GAP + DOT_R}
            x2={LABEL_W + thresholdDot * DOT_GAP + DOT_R}
            y1={32}
            y2={46 + DATA.length * ROW_H - 4}
            stroke={RISK_COLORS.critical}
            strokeDasharray="6 3"
            strokeWidth={2}
          />
          <text
            x={LABEL_W + thresholdDot * DOT_GAP + DOT_R - 4}
            y={38}
            textAnchor="end"
            fill={RISK_COLORS.critical}
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            fontWeight={600}
          >
            Umbral $1,500M
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 52 + rowIdx * ROW_H
            const filled = Math.round(row.monto * DOT_PER_M)
            const color = RISK_COLORS.high

            return (
              <g key={row.contrato}>
                {/* Contract + hora */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.contrato}
                  <tspan fill="#52525b">  {row.hora}</tspan>
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
                      fill={isFilled ? color : 'var(--color-background-elevated)'}
                      fillOpacity={isFilled ? 0.9 : 1}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
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
                  ${row.monto}M
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-0.5">
          HALLAZGO
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Average contract: $1,439M MXN. Average gap below threshold: $61M (4.1%).
          The uniform clustering below $1,500M is statistically improbable under
          legitimate procurement — consistent with deliberate threshold splitting.
        </p>
      </div>

      <p className="text-[10px] text-text-muted mt-2 font-mono">
        Source: COMPRANET 2023 · Each dot = $20M MXN · RUBLI same-day detection
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
