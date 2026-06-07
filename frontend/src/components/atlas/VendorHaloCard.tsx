/**
 * VendorHaloCard — info chip rendered adjacent to a vendor dot when the user
 * hovers it at deep zoom (effectiveScale > 18). Replaces the simpler
 * VendorDotOverlay hover tooltip at telescope-star zoom levels.
 *
 * Design spec: designs/M-OBS-spec.md · Replacement 6.
 */

import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { formatVendorName } from '@/lib/vendor/formatName'
import { DotBar } from '@/components/ui/DotBar'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'

export interface VendorHaloCardDot {
  id: string
  vendorId?: number
  name: string
  riskScore: number
  sectorColor: string
  x: number
  y: number
  isMock?: boolean
}

interface VendorHaloCardProps {
  dot: VendorHaloCardDot
  /** Composed transform: screen_x = dot.x * s + tx */
  transform: { tx: number; ty: number; s: number }
  /** Bounding rect of the overlay SVG (for edge-flip logic). */
  wrapperWidth: number
  wrapperHeight: number
  /** SVG viewBox width (so we can map SVG units → screen px). */
  svgWidth: number
  svgHeight: number
  lang: 'en' | 'es'
}

const RISK_LABEL: Record<'critical' | 'high' | 'medium' | 'low', { en: string; es: string }> = {
  critical: { en: 'CRIT', es: 'CRÍT' },
  high:     { en: 'HIGH', es: 'ALTO' },
  medium:   { en: 'MED',  es: 'MED'  },
  low:      { en: 'LOW',  es: 'BAJO' },
}

export function VendorHaloCard({
  dot,
  transform,
  wrapperWidth,
  wrapperHeight,
  svgWidth,
  svgHeight,
  lang,
}: VendorHaloCardProps) {
  const navigate = useNavigate()

  // Translate the dot's SVG-space position into screen pixels relative to the
  // wrapper. The overlay SVG uses preserveAspectRatio="xMidYMid meet" so it
  // scales uniformly to fit. ratio = wrapperWidth / svgWidth (same vertically).
  const ratio = wrapperWidth / svgWidth || 1
  const dotSvgX = dot.x * transform.s + transform.tx
  const dotSvgY = dot.y * transform.s + transform.ty
  const dotScreenX = dotSvgX * ratio
  const dotScreenY = dotSvgY * ratio
  void svgHeight

  // Card geometry
  const CARD_W = 220
  const CARD_H = 80
  const GAP = 14

  // Edge-flip: keep the card inside the wrapper.
  const flipLeft = dotScreenX + GAP + CARD_W > wrapperWidth
  const flipDown = dotScreenY - GAP - CARD_H < 0

  const left = flipLeft ? dotScreenX - GAP - CARD_W : dotScreenX + GAP
  const top  = flipDown ? dotScreenY + GAP : dotScreenY - GAP - CARD_H

  const level = getRiskLevelFromScore(dot.riskScore)
  const riskColor = RISK_COLORS[level]
  const pct = Math.round(dot.riskScore * 100)
  const riskLabel = RISK_LABEL[level][lang]

  const handleOpen = () => {
    if (dot.isMock) return
    const id = dot.vendorId ?? dot.id
    navigate(`/vendors/${id}`)
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
      {/* Vendor name */}
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

      {/* Risk bar + chip */}
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

      {/* Sector chip + open-dossier link */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase"
          style={{ letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
        >
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
          {/* Use sector color as the chip's body; no label text — context is from card position */}
        </span>
        {!dot.isMock && (
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
