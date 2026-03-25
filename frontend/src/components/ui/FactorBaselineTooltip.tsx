import { useState, useRef } from 'react'
import { useFactorBaseline } from '@/hooks/useFactorBaselines'
import { cn } from '@/lib/utils'

interface FactorBaselineTooltipProps {
  factorName: string
  zScore: number
  sectorId: number
  year: number
  vendorValue?: number
  children: React.ReactNode
  className?: string
}

/** Maps factor names to human-readable Spanish labels */
const FACTOR_LABELS: Record<string, string> = {
  price_volatility: 'Volatilidad de Precio',
  institution_diversity: 'Diversidad Institucional',
  vendor_concentration: 'Concentración de Proveedor',
  price_ratio: 'Ratio de Precio',
  network_member_count: 'Red de Co-contratación',
  same_day_count: 'Contratos Mismo Día',
  single_bid: 'Licitación Única',
  ad_period_days: 'Período de Publicación',
  win_rate: 'Tasa de Adjudicación',
  direct_award: 'Adjudicación Directa',
  sector_spread: 'Diversificación Sectorial',
  co_bid_rate: 'Tasa de Co-licitación',
  price_hyp_confidence: 'Anomalía de Precio',
  year_end: 'Fin de Año',
  industry_mismatch: 'Discrepancia Industrial',
  institution_risk: 'Riesgo Institucional',
}

function getZScoreColor(z: number): string {
  const abs = Math.abs(z)
  if (abs > 3) return 'text-red-500'
  if (abs > 2) return 'text-red-400'
  if (abs > 1) return 'text-yellow-500'
  return 'text-emerald-500'
}

function getZScoreBg(z: number): string {
  const abs = Math.abs(z)
  if (abs > 3) return 'bg-red-500'
  if (abs > 2) return 'bg-red-400'
  if (abs > 1) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function getZScoreLabel(z: number): string {
  const abs = Math.abs(z)
  if (abs > 3) return 'Extremo'
  if (abs > 2) return 'Alto'
  if (abs > 1) return 'Moderado'
  return 'Normal'
}

/** Tiny inline bell curve SVG showing where this z-score falls */
function BellCurveSVG({ zScore }: { zScore: number }) {
  const clampedZ = Math.max(-4, Math.min(4, zScore))
  // Map z-score to x position: -4 -> 10, +4 -> 190
  const markerX = 10 + ((clampedZ + 4) / 8) * 180
  const color = getZScoreBg(zScore)

  return (
    <svg viewBox="0 0 200 60" className="w-full h-10 mt-1" aria-hidden="true">
      {/* Bell curve path */}
      <path
        d="M 10 55 Q 30 55 50 50 Q 70 40 85 20 Q 95 5 100 5 Q 105 5 115 20 Q 130 40 150 50 Q 170 55 190 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-text-muted/40"
      />
      {/* 1-sigma zone */}
      <rect x="78" y="0" width="44" height="60" fill="currentColor" className="text-emerald-500/10" rx="2" />
      {/* 2-sigma zone */}
      <rect x="55" y="0" width="23" height="60" fill="currentColor" className="text-yellow-500/10" rx="2" />
      <rect x="122" y="0" width="23" height="60" fill="currentColor" className="text-yellow-500/10" rx="2" />
      {/* Marker */}
      <line x1={markerX} y1="0" x2={markerX} y2="60" strokeWidth="2" className={`stroke-current ${color.replace('bg-', 'text-')}`} />
      <circle cx={markerX} cy="8" r="3" className={`fill-current ${color.replace('bg-', 'text-')}`} />
      {/* Labels */}
      <text x="100" y="58" textAnchor="middle" className="text-text-muted fill-current" fontSize="7">0</text>
      <text x="78" y="58" textAnchor="middle" className="text-text-muted fill-current" fontSize="6">-1</text>
      <text x="122" y="58" textAnchor="middle" className="text-text-muted fill-current" fontSize="6">+1</text>
      <text x="55" y="58" textAnchor="middle" className="text-text-muted fill-current" fontSize="6">-2</text>
      <text x="145" y="58" textAnchor="middle" className="text-text-muted fill-current" fontSize="6">+2</text>
    </svg>
  )
}

export function FactorBaselineTooltip({
  factorName,
  zScore,
  sectorId,
  year,
  vendorValue,
  children,
  className,
}: FactorBaselineTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data, isLoading } = useFactorBaseline(
    isOpen ? sectorId : 0,
    isOpen ? year : 0,
  )

  const baseline = data?.baselines?.find((b) => b.factor_name === factorName)
  const derivedValue = baseline
    ? vendorValue ?? (zScore * baseline.stddev + baseline.mean)
    : vendorValue

  const label = FACTOR_LABELS[factorName] || factorName

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsOpen(true), 200)
  }

  function handleMouseLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-background-card border border-border rounded-lg shadow-lg p-3"
          role="tooltip"
        >
          <div className="text-xs font-semibold text-text-primary mb-1">{label}</div>
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="h-3 bg-background-elevated rounded animate-pulse" />
              <div className="h-3 bg-background-elevated rounded animate-pulse w-3/4" />
            </div>
          ) : baseline ? (
            <>
              <div className="text-xs text-text-muted space-y-0.5">
                <div>
                  <span className="text-text-secondary">Promedio sector:</span>{' '}
                  <span className="font-mono">{baseline.mean.toFixed(3)}</span>
                </div>
                {derivedValue !== undefined && (
                  <div>
                    <span className="text-text-secondary">Valor proveedor:</span>{' '}
                    <span className="font-mono">{derivedValue.toFixed(3)}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-secondary">Distancia:</span>{' '}
                  <span className={cn('font-mono font-semibold', getZScoreColor(zScore))}>
                    {zScore >= 0 ? '+' : ''}{zScore.toFixed(2)} &sigma;
                  </span>
                  <span className={cn('ml-1 text-[10px] px-1 py-0.5 rounded', getZScoreColor(zScore))}>
                    {getZScoreLabel(zScore)}
                  </span>
                </div>
              </div>
              <BellCurveSVG zScore={zScore} />
            </>
          ) : (
            <div className="text-xs text-text-muted italic">
              Sin datos de referencia para este sector/ano
            </div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-background-card border-r border-b border-border rotate-45" />
          </div>
        </div>
      )}
    </div>
  )
}

export default FactorBaselineTooltip
