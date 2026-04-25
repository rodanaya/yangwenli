import { useRef, useEffect, useState } from 'react'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { getLocale } from '@/lib/utils'

interface SingleBidWallProps {
  count: number
  valueBn: number
}

const TOTAL_CONTRACTS = 3_051_294

export function SingleBidWall({ count, valueBn }: SingleBidWallProps) {
  const pct = (count / TOTAL_CONTRACTS) * 100
  const { ref: countRef, value: animCount } = useCountUp(count, 2000, 0)
  const barRef = useRef<HTMLDivElement>(null)
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate with slight overshoot
          setTimeout(() => setBarWidth(Math.min(pct * 1.04, 100)), 200)
          setTimeout(() => setBarWidth(pct), 1100)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pct])

  return (
    <ScrollReveal>
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(10,4,4,0.98) 0%, rgba(20,8,8,0.98) 50%, rgba(10,4,4,0.98) 100%)',
          border: '1px solid rgba(220,38,38,0.25)',
          borderTopWidth: '3px',
          borderTopColor: '#dc2626',
        }}
      >
        <div className="p-5">
          {/* Main stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
            {/* Left: Count */}
            <div>
              <p
                className="text-[2.2rem] sm:text-[2.8rem] font-black tabular-nums leading-none tracking-tighter font-mono"
                style={{
                  color: '#ef4444',
                  textShadow: '0 0 30px rgba(239,68,68,0.3)',
                }}
              >
                <span ref={countRef}>{animCount.toLocaleString(getLocale())}</span>
              </p>
              <p className="text-xs text-risk-critical/70 mt-2 leading-relaxed max-w-[260px]">
                licitaciones con un solo oferente — competencia de papel
              </p>
            </div>

            {/* Right: Value */}
            <div className="sm:text-right">
              <p
                className="text-[2.2rem] sm:text-[2.8rem] font-black tabular-nums leading-none tracking-tighter font-mono"
                style={{
                  color: '#fbbf24',
                  textShadow: '0 0 30px rgba(251,191,36,0.2)',
                }}
              >
                <span className="text-[1.6rem] sm:text-[2rem]">$</span>
                {valueBn.toFixed(2)}
                <span className="text-[1rem] sm:text-[1.2rem] ml-1 text-risk-high/60">T</span>
              </p>
              <p className="text-xs text-accent/60 mt-2 leading-relaxed max-w-[280px] sm:ml-auto">
                pagados en procesos que nadie mas pudo ganar
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div ref={barRef}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-mono text-risk-critical/50 uppercase tracking-widest font-bold">
                Proporcion del total
              </p>
              <p className="text-[10px] font-mono text-risk-critical/80 font-bold tabular-nums">
                {pct.toFixed(1)}%
              </p>
            </div>
            {(() => {
              const N = 50, DR = 3, DG = 8
              const filled = Math.max(1, Math.round((barWidth / 100) * N))
              return (
                <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: N }).map((_, i) => (
                    <circle key={i} cx={i * DG + DR} cy={5} r={DR}
                      fill={i < filled ? '#ef4444' : 'var(--color-background-elevated)'}
                      stroke={i < filled ? undefined : 'var(--color-border-hover)'}
                      strokeWidth={i < filled ? 0 : 0.5}
                      fillOpacity={i < filled ? 0.85 : 1}
                    />
                  ))}
                </svg>
              )
            })()}
            <p className="text-[10px] text-risk-critical/40 font-mono mt-1.5 text-center">
              {pct.toFixed(1)}% de todos los contratos — con competencia ficticia
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}

export default SingleBidWall
