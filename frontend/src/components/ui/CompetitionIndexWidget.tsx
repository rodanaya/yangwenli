import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollReveal } from '@/hooks/useAnimations'

interface CompetitionIndexWidgetProps {
  daPct: number
  year: number
}

/**
 * SVG arc gauge drawing utility.
 * Draws an arc from startAngle to endAngle (in degrees, 0 = top).
 */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const start = { x: cx + r * Math.cos(rad(endAngle)), y: cy + r * Math.sin(rad(endAngle)) }
  const end = { x: cx + r * Math.cos(rad(startAngle)), y: cy + r * Math.sin(rad(startAngle)) }
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

function AnimatedGauge({
  value,
  maxValue,
  color,
  label,
  sublabel,
}: {
  value: number
  maxValue: number
  color: string
  label: string
  sublabel: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate over 1200ms
          let start: number | null = null
          const duration = 1200
          const target = Math.min(value / maxValue, 1)
          const animate = (ts: number) => {
            if (!start) start = ts
            const t = Math.min((ts - start) / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3)
            setProgress(eased * target)
            if (t < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, maxValue])

  const cx = 70
  const cy = 70
  const r = 54
  const totalAngle = 240
  const startAngle = -120
  const fillAngle = startAngle + totalAngle * progress

  return (
    <div className="flex flex-col items-center">
      <svg ref={ref} width={140} height={110} viewBox="0 0 140 110" aria-label={`${label}: ${value}%`}>
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, startAngle, startAngle + totalAngle)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {progress > 0.001 && (
          <path
            d={describeArc(cx, cy, r, startAngle, fillAngle)}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        )}
        {/* Center value */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill={color}
          fontSize="26"
          fontWeight="800"
          fontFamily="var(--font-family-mono)"
        >
          {Math.round(value)}%
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontWeight="600"
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          {sublabel.toUpperCase()}
        </text>
      </svg>
      <p className="text-[11px] font-semibold text-text-secondary mt-1">{label}</p>
    </div>
  )
}

export function CompetitionIndexWidget({ daPct, year }: CompetitionIndexWidgetProps) {
  const { t } = useTranslation('dashboard')
  const competitionIndex = 100 - daPct
  const oecdTarget = 75
  const gap = oecdTarget - competitionIndex

  const gaugeColor =
    competitionIndex >= 50 ? '#4ade80' : competitionIndex >= 30 ? '#fb923c' : '#f87171'

  return (
    <ScrollReveal>
      <div
        className="rounded-sm border border-border/30 bg-background-card/60 p-5"
        style={{ borderTopWidth: '3px', borderTopColor: gaugeColor }}
      >
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary tracking-tight">
            Indice de Competencia
          </h3>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">
            menor = mas contratos sin licitacion ({year})
          </p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <AnimatedGauge
            value={competitionIndex}
            maxValue={100}
            color={gaugeColor}
            label={`${t('competition.mexicoLabel')} ${year}`}
            sublabel={t('competition.mexicoLabel')}
          />
          <AnimatedGauge
            value={oecdTarget}
            maxValue={100}
            color="#71717a"
            label={t('competition.oecdMin')}
            sublabel="OECD"
          />
        </div>

        <div className="mt-4 text-center space-y-1.5">
          <p className="text-xs text-text-muted font-mono tabular-nums">
            <span style={{ color: gaugeColor }} className="font-bold">
              {t('competition.mexicoLabel')}: {competitionIndex.toFixed(0)}%
            </span>
            <span className="mx-2 text-border">|</span>
            <span className="text-green-400 font-bold">{t('competition.oecdMin')}: {oecdTarget}%</span>
          </p>
          {gap > 0 && (
            <p
              className="text-sm font-black font-mono tabular-nums"
              style={{ color: '#f87171' }}
            >
              {t('competition.gapLabel')}: {gap.toFixed(0)} pts
            </p>
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}

export default CompetitionIndexWidget
