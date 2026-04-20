import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScrollReveal } from '@/hooks/useAnimations'

interface DecemberYear {
  year: number
  decemberBn: number
  totalBn: number
}

interface DecemberAvalancheSparklineProps {
  years: DecemberYear[]
}

// Horizontal dot sparkline: one column per year, vertical stack of dots
// representing December spending magnitude.
const DOTS_PER_COL = 14     // vertical resolution
const COL_W = 16
const DOT_R = 2.5

export function DecemberAvalancheSparkline({ years }: DecemberAvalancheSparklineProps) {
  const { maxVal, worstYear } = useMemo(() => {
    let mv = 0
    let wy = 0
    for (const y of years) {
      if (y.decemberBn > mv) {
        mv = y.decemberBn
        wy = y.year
      }
    }
    return { maxVal: mv, worstYear: wy }
  }, [years])

  const chartData = useMemo(
    () =>
      years.map((y) => ({
        year: y.year,
        value: y.decemberBn,
        total: y.totalBn,
        pct: y.totalBn > 0 ? ((y.decemberBn / y.totalBn) * 100).toFixed(1) : '0',
      })),
    [years],
  )

  const chartW = Math.max(1, chartData.length) * COL_W + 8
  const chartH = DOTS_PER_COL * 6 + 20

  return (
    <ScrollReveal>
      <div
        className="rounded-sm border border-border/30 bg-background-card/60 p-4"
        style={{ borderLeftWidth: '3px', borderLeftColor: '#f97316' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              La Avalancha de Diciembre
            </h3>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">
              Gasto federal en el mes de diciembre (miles de millones MXN) · cada punto ~{(maxVal / DOTS_PER_COL).toFixed(1)}B
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-black font-mono tabular-nums text-orange-400 leading-none">
              ${maxVal.toFixed(1)}B
            </p>
            <p className="text-[9px] text-text-muted font-mono">
              pico {worstYear}
            </p>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-auto"
          role="img"
          aria-label="December federal spending by year, vertical dot sparkline"
        >
          {chartData.map((d, colIdx) => {
            const filled = maxVal > 0 ? Math.round((d.value / maxVal) * DOTS_PER_COL) : 0
            const color =
              d.value === maxVal
                ? '#dc2626'
                : d.value >= maxVal * 0.85
                  ? '#f97316'
                  : '#a1a1aa'
            const baseOpacity = d.value === maxVal ? 1 : d.value >= maxVal * 0.85 ? 0.85 : 0.55
            const cx = colIdx * COL_W + COL_W / 2

            return (
              <g key={d.year}>
                {Array.from({ length: DOTS_PER_COL }).map((_, rowIdx) => {
                  // Fill from bottom up
                  const rowFromBottom = DOTS_PER_COL - 1 - rowIdx
                  const isFilled = rowFromBottom < filled
                  const cy = 4 + rowIdx * 6 + DOT_R
                  return (
                    <motion.circle
                      key={rowIdx}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={isFilled ? color : '#f3f1ec'}
                      fillOpacity={isFilled ? baseOpacity : 1}
                      stroke={isFilled ? 'none' : '#e2ddd6'}
                      strokeWidth={isFilled ? 0 : 0.4}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18, delay: colIdx * 0.03 + rowIdx * 0.01 }}
                    />
                  )
                })}
                <text
                  x={cx}
                  y={chartH - 4}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {String(d.year).slice(-2)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </ScrollReveal>
  )
}

export default DecemberAvalancheSparkline

// ✓ dot-matrix rewrite
