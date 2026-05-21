/**
 * CanvasVendorHaloCard — Atlas P6 Frontier A.
 *
 * Lightweight halo card rendered next to a hovered named-vendor dot on the
 * Canvas constellation when zoom ≥ 18×. The Canvas engine already provides
 * SCREEN-SPACE coordinates of the hovered dot via the extended
 * `onDotHover(dot, screenPos)` callback, so this component is a pure
 * positioning shell — no SVG transforms to invert.
 *
 * Visual contract mirrors the legacy SVG-era VendorHaloCard
 * (Playfair italic name · DotBar + risk chip · sector + open-dossier link)
 * but the geometry is simpler since coords are already in CSS pixels.
 */

import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { formatVendorName } from '@/lib/vendor/formatName'
import { DotBar } from '@/components/ui/DotBar'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

export interface CanvasVendorHaloDot {
  id: string
  name: string
  riskScore: number
  sectorColor?: string
}

interface CanvasVendorHaloCardProps {
  dot: CanvasVendorHaloDot
  /** Screen-space position of the dot inside the wrapper (CSS pixels). */
  screenX: number
  screenY: number
  wrapperWidth: number
  wrapperHeight: number
  lang: 'en' | 'es'
}

const RISK_LABEL: Record<'critical' | 'high' | 'medium' | 'low', { en: string; es: string }> = {
  critical: { en: 'CRIT', es: 'CRÍT' },
  high:     { en: 'HIGH', es: 'ALTO' },
  medium:   { en: 'MED',  es: 'MED'  },
  low:      { en: 'LOW',  es: 'BAJO' },
}

const CARD_W = 220
const CARD_H = 80
const GAP = 14

export function CanvasVendorHaloCard({
  dot,
  screenX,
  screenY,
  wrapperWidth,
  wrapperHeight,
  lang,
}: CanvasVendorHaloCardProps) {
  const navigate = useNavigate()

  // Edge-flip: if dot is in right half → render to the LEFT; if top half → BELOW.
  const flipLeft = screenX + GAP + CARD_W > wrapperWidth
  const flipDown = screenY - GAP - CARD_H < 0
  const left = flipLeft ? screenX - GAP - CARD_W : screenX + GAP
  const top  = flipDown ? screenY + GAP : screenY - GAP - CARD_H

  const level = getRiskLevelFromScore(dot.riskScore)
  const riskColor = RISK_COLORS[level]
  const pct = Math.round(dot.riskScore * 100)
  const riskLabel = RISK_LABEL[level][lang]
  const isNumericId = /^\d+$/.test(dot.id)

  const handleOpen = () => {
    if (!isNumericId) return
    navigate(`/thread/${dot.id}`)
  }

  return (
    <div
      role="dialog"
      aria-label={formatVendorName(dot.name, 80)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: `${Math.max(4, Math.min(wrapperWidth - CARD_W - 4, left))}px`,
        top: `${Math.max(4, Math.min(wrapperHeight - CARD_H - 4, top))}px`,
        width: CARD_W,
        background: 'var(--color-background-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        padding: 8,
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="truncate"
        title={formatVendorName(dot.name, 80)}
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.15,
          color: 'var(--color-text-primary)',
        }}
      >
        {formatVendorName(dot.name, 36)}
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <DotBar value={dot.riskScore} max={1} color={riskColor} ariaLabel={`${pct}% risk`} />
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: riskColor, fontWeight: 700 }}
        >
          {pct}%
        </span>
        <span
          className="font-mono text-[9px] uppercase"
          style={{ color: riskColor, letterSpacing: '0.08em', fontWeight: 700 }}
        >
          {riskLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase"
          style={{ letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
        >
          {dot.sectorColor && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: dot.sectorColor,
              }}
            />
          )}
        </span>
        {isNumericId && (
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase hover:underline transition-colors"
            style={{
              color: 'var(--color-accent)',
              letterSpacing: '0.1em',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {lang === 'en' ? 'open dossier' : 'abrir dossier'}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default CanvasVendorHaloCard
