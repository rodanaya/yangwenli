/**
 * RiskBySectorChart — Pure SVG dot-matrix strips by sector.
 *
 * Shows high-risk contract percentage per sector, sorted descending.
 * Each dot = 0.5pp (DOTS=40, domain 0-20%). OECD 9% benchmark marked
 * at dot #18 with a vertical cyan line.
 */

import { motion } from 'framer-motion'
import { SECTOR_COLORS } from '@/lib/constants'

interface SectorRow {
  sector: string
  code: string
  high_pct: number
}

const DATA: SectorRow[] = [
  { sector: 'Agricultura',     code: 'agricultura',     high_pct: 19.4 },
  { sector: 'Energia',         code: 'energia',         high_pct: 16.8 },
  { sector: 'Salud',           code: 'salud',           high_pct: 14.2 },
  { sector: 'Infraestructura', code: 'infraestructura', high_pct: 13.7 },
  { sector: 'Gobernacion',     code: 'gobernacion',     high_pct: 12.1 },
  { sector: 'Tecnologia',      code: 'tecnologia',      high_pct: 11.3 },
  { sector: 'Hacienda',        code: 'hacienda',        high_pct: 9.8  },
  { sector: 'Educacion',       code: 'educacion',       high_pct: 8.4  },
  { sector: 'Defensa',         code: 'defensa',         high_pct: 7.2  },
  { sector: 'Ambiente',        code: 'ambiente',        high_pct: 6.9  },
  { sector: 'Trabajo',         code: 'trabajo',         high_pct: 6.1  },
  { sector: 'Otros',           code: 'otros',           high_pct: 5.3  },
]

const OECD_AVG = 9.0
const OECD_COLOR = '#22d3ee'

const DOTS = 40        // each dot = 0.5pp (0-20% domain)
const DOT_PER_PCT = DOTS / 20
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 118
const COL_W = DOTS * DOT_GAP
const VALUE_W = 58
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 44 + DATA.length * ROW_H + 14

export function RiskBySectorChart() {
  const oecdDot = Math.round(OECD_AVG * DOT_PER_PCT) // = 18

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Sector Risk Distribution
      </p>
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        Agriculture and Energy lead with 2x the national risk average
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        % of contracts rated critical + high · National avg: {OECD_AVG}%
      </p>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="High-risk contract percentage by sector, dot matrix, each dot 0.5pp"
        >
          {/* Headers */}
          <text
            x={LABEL_W - 6}
            y={20}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            SECTOR
          </text>
          <text
            x={LABEL_W + COL_W + VALUE_W - 2}
            y={20}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            % ALTO RIESGO
          </text>

          {/* OECD reference line */}
          <line
            x1={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            x2={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            y1={30}
            y2={44 + DATA.length * ROW_H - 4}
            stroke={OECD_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            opacity={0.8}
          />
          <text
            x={LABEL_W + oecdDot * DOT_GAP + DOT_R + 4}
            y={36}
            fill={OECD_COLOR}
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            Avg {OECD_AVG}%
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 50 + rowIdx * ROW_H
            const color = SECTOR_COLORS[row.code] || '#64748b'
            const opacity = row.high_pct > OECD_AVG ? 0.95 : 0.55
            const filled = Math.round(row.high_pct * DOT_PER_PCT)

            return (
              <g key={row.sector}>
                {/* Sector label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.sector}
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
                      fill={isFilled ? color : '#18181b'}
                      fillOpacity={isFilled ? opacity : 1}
                      stroke={isFilled ? 'none' : '#27272a'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.high_pct.toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
        <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: OECD_COLOR }} />
        <span className="text-[10px] font-mono text-zinc-500">
          National average (OECD HR benchmark: 2-15%)
        </span>
      </div>

      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2002-2025 · RUBLI v0.6.5 · Each dot = 0.5pp · Sectors above avg at full opacity
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
