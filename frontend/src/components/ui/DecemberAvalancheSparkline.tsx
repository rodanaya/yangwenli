import { useMemo } from 'react'
import { ScrollReveal } from '@/hooks/useAnimations'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
} from '@/components/charts'

interface DecemberYear {
  year: number
  decemberBn: number
  totalBn: number
}

interface DecemberAvalancheSparklineProps {
  years: DecemberYear[]
}

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

  return (
    <ScrollReveal>
      <div
        className="rounded-xl border border-border/30 bg-background-card/60 p-4"
        style={{ borderLeftWidth: '3px', borderLeftColor: '#f97316' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              La Avalancha de Diciembre
            </h3>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">
              Gasto federal en el mes de diciembre (miles de millones MXN)
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

        <div style={{ height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as {
                      year: number
                      value: number
                      total: number
                      pct: string
                    }
                    return (
                      <div className="chart-tooltip text-xs">
                        <p className="font-bold text-text-primary">{d.year}</p>
                        <p className="text-text-muted tabular-nums font-mono">
                          Diciembre: <strong className="text-orange-400">${d.value.toFixed(1)}B</strong>
                        </p>
                        <p className="text-text-muted tabular-nums font-mono">
                          Total anual: ${d.total.toFixed(1)}B ({d.pct}%)
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                y={maxVal}
                stroke="rgba(249,115,22,0.2)"
                strokeDasharray="3 3"
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.year}
                    fill={
                      entry.value === maxVal
                        ? '#dc2626'
                        : entry.value >= maxVal * 0.85
                          ? '#f97316'
                          : 'rgba(161,161,170,0.35)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ScrollReveal>
  )
}

export default DecemberAvalancheSparkline
