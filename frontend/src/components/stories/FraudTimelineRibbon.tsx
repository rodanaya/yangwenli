import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useReveal } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'

type EraKey = 'fox' | 'calderon' | 'pena' | 'amlo' | 'sheinbaum'

interface TimelineCase {
  year: number
  caseName: string
  type: string
  valueBn?: number
  era: EraKey
}

interface FraudTimelineRibbonProps {
  cases: TimelineCase[]
  highlightEra?: string
  className?: string
}

const ERA_COLORS: Record<EraKey, string> = {
  fox: 'var(--color-sector-educacion)',
  calderon: 'var(--color-sector-educacion)',
  pena: 'var(--color-sector-hacienda)',
  amlo: 'var(--color-sector-salud)',
  sheinbaum: '#a855f7',
}

const ERA_LABELS: Record<EraKey, string> = {
  fox: 'Fox',
  calderon: 'Calderon',
  pena: 'Pena Nieto',
  amlo: 'AMLO',
  sheinbaum: 'Sheinbaum',
}

export default function FraudTimelineRibbon({
  cases,
  highlightEra,
  className,
}: FraudTimelineRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ref: revealRef, visible } = useReveal(0.1)
  const [lineWidth, setLineWidth] = useState(0)

  const sorted = [...cases].sort((a, b) => a.year - b.year)
  const minYear = sorted[0]?.year ?? 2000
  const maxYear = sorted[sorted.length - 1]?.year ?? 2025

  // Animate the timeline line
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setLineWidth(100), 100)
      return () => clearTimeout(timer)
    }
  }, [visible])

  // Generate year markers between min and max
  const yearMarkers: number[] = []
  const step = maxYear - minYear > 15 ? 5 : maxYear - minYear > 8 ? 2 : 1
  for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) {
    yearMarkers.push(y)
  }

  const cardWidth = 140
  const totalWidth = Math.max(sorted.length * (cardWidth + 16) + 80, 600)

  const getPositionPct = (year: number): number => {
    if (maxYear === minYear) return 50
    return ((year - minYear) / (maxYear - minYear)) * 85 + 5
  }

  return (
    <div
      ref={revealRef}
      className={cn('my-10', className)}
      role="figure"
      aria-label={`Linea de tiempo de casos de corrupcion, ${minYear}-${maxYear}`}
    >
      {/* Era legend */}
      <div className="flex items-center gap-4 mb-4 px-2 flex-wrap">
        {Object.entries(ERA_LABELS).map(([key, label]) => {
          const eraKey = key as EraKey
          const hasCases = sorted.some(c => c.era === eraKey)
          if (!hasCases) return null
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-opacity',
                highlightEra && highlightEra !== key ? 'opacity-30' : 'opacity-100'
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ERA_COLORS[eraKey] }}
                aria-hidden="true"
              />
              <span className="text-text-secondary">{label}</span>
            </div>
          )
        })}
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-4 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, minHeight: '200px' }}
        >
          {/* Timeline line */}
          <div className="absolute top-[60px] left-0 right-0 h-[2px] bg-background-elevated">
            <div
              className="h-full bg-text-muted origin-left"
              style={{
                width: `${lineWidth}%`,
                transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Year markers */}
          {yearMarkers.map(year => (
            <div
              key={year}
              className="absolute top-[46px] -translate-x-1/2"
              style={{ left: `${getPositionPct(year)}%` }}
            >
              <div className="w-[1px] h-4 bg-background-elevated mx-auto" aria-hidden="true" />
              <span className="text-[10px] text-text-muted font-mono tabular-nums block text-center mt-0.5">
                {year}
              </span>
            </div>
          ))}

          {/* Case cards */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate={visible ? 'animate' : 'initial'}
            className="relative"
          >
            {sorted.map((c, i) => {
              const eraColor = ERA_COLORS[c.era]
              const isHighlighted = !highlightEra || highlightEra === c.era
              // Stagger vertically to avoid overlap
              const verticalOffset = (i % 2 === 0) ? 80 : 120

              return (
                <motion.div
                  key={`${c.year}-${c.caseName}-${i}`}
                  variants={staggerItem}
                  className="absolute"
                  style={{
                    left: `${getPositionPct(c.year)}%`,
                    top: `${verticalOffset}px`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Connecting dot */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-border"
                    style={{
                      backgroundColor: eraColor,
                      top: `${-(verticalOffset - 56)}px`,
                    }}
                    aria-hidden="true"
                  />
                  {/* Connecting line from dot to card */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-[1px]"
                    style={{
                      backgroundColor: `${eraColor}40`,
                      top: `${-(verticalOffset - 66)}px`,
                      height: `${verticalOffset - 72}px`,
                    }}
                    aria-hidden="true"
                  />

                  {/* Card */}
                  <div
                    className={cn(
                      'rounded-md px-3 py-2 transition-opacity duration-300',
                      isHighlighted ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{
                      width: `${cardWidth}px`,
                      backgroundColor: `${eraColor}12`,
                      border: `1px solid ${eraColor}30`,
                    }}
                    role="listitem"
                    aria-label={`${c.caseName}, ${c.year}${c.valueBn ? `, ${c.valueBn}B MXN` : ''}`}
                  >
                    <p
                      className="text-[10px] font-bold font-mono tabular-nums mb-0.5"
                      style={{ color: eraColor }}
                    >
                      {c.year}
                    </p>
                    <p className="text-xs font-medium text-text-secondary leading-tight line-clamp-2 mb-1">
                      {c.caseName}
                    </p>
                    {c.valueBn !== undefined && (
                      <p className="text-[11px] font-bold text-risk-critical font-mono tabular-nums">
                        {c.valueBn.toLocaleString('es-MX', { maximumFractionDigits: 1 })}B MXN
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint for mobile */}
      <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-text-muted lg:hidden">
        <span aria-hidden="true">&larr;</span>
        <span>Deslizar para ver mas</span>
        <span aria-hidden="true">&rarr;</span>
      </div>
    </div>
  )
}
