/**
 * VendorFingerprintChart — "La Huella Digital"
 *
 * A Nightingale rose / polar area chart that visualizes a vendor's SHAP values
 * as a unique corruption "fingerprint". Each petal represents one of the 8 active
 * risk model features. Red petals = risk-increasing, teal petals = protective.
 *
 * Inspired by Florence Nightingale's 1858 polar area diagram.
 */

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { getRiskLevelFromScore } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Feature definitions — the 8 active v6.4 coefficients
// ---------------------------------------------------------------------------

interface FingerprintFeature {
  key: string
  labelES: string
  labelEN: string
  direction: 'risk' | 'protective'
}

const FINGERPRINT_FEATURES: FingerprintFeature[] = [
  { key: 'price_volatility',      labelES: 'Volatilidad\nde precio',     labelEN: 'Price\nvolatility',    direction: 'risk' },
  { key: 'price_ratio',           labelES: 'Ratio de\nprecio',           labelEN: 'Price\nratio',         direction: 'risk' },
  { key: 'vendor_concentration',  labelES: 'Concentracion\nde mercado',  labelEN: 'Market\nconc.',        direction: 'risk' },
  { key: 'network_member_count',  labelES: 'Red de\nvinculos',           labelEN: 'Network\nlinks',       direction: 'risk' },
  { key: 'same_day_count',        labelES: 'Contratos\nsimultaneos',     labelEN: 'Same-day\ncontracts',  direction: 'risk' },
  { key: 'single_bid',            labelES: 'Propuesta\nunica',           labelEN: 'Single\nbid',          direction: 'risk' },
  { key: 'ad_period_days',        labelES: 'Periodo\nanuncio',           labelEN: 'Ad\nperiod',           direction: 'risk' },
  { key: 'institution_diversity', labelES: 'Diversidad\ninstitucional',  labelEN: 'Inst.\ndiversity',     direction: 'protective' },
]

const WEDGE_COUNT = FINGERPRINT_FEATURES.length
const WEDGE_ANGLE = (2 * Math.PI) / WEDGE_COUNT  // 45 degrees
const GAP_ANGLE = 0.04  // radians gap between petals

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const RISK_PETAL_BASE = '#dc2626'
const RISK_PETAL_LIGHT = '#f87171'
const PROTECT_PETAL_BASE = '#0f766e'
const PROTECT_PETAL_LIGHT = '#5eead4'

const CENTER_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
}

// ---------------------------------------------------------------------------
// SVG arc path builder
// ---------------------------------------------------------------------------

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function buildWedgePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  if (r < 0.5) return `M ${cx} ${cy} Z`

  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)

  const sweep = endAngle - startAngle
  const largeArc = sweep > Math.PI ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Glow filter SVG
// ---------------------------------------------------------------------------

function GlowFilter({ id, color }: { id: string; color: string }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feFlood floodColor={color} floodOpacity="0.4" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

// ---------------------------------------------------------------------------
// Petal label — multi-line text positioned outside the rose
// ---------------------------------------------------------------------------

function PetalLabel({
  cx,
  cy,
  angle,
  radius,
  label,
  color,
}: {
  cx: number
  cy: number
  angle: number
  radius: number
  label: string
  color: string
}) {
  const pos = polarToCartesian(cx, cy, radius, angle)
  const lines = label.split('\n')

  // Determine text anchor based on quadrant
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  let textAnchor: 'start' | 'middle' | 'end' = 'middle'
  if (normalizedAngle > 0.3 && normalizedAngle < Math.PI - 0.3) {
    textAnchor = 'start'
  } else if (normalizedAngle > Math.PI + 0.3 && normalizedAngle < 2 * Math.PI - 0.3) {
    textAnchor = 'end'
  }

  // Vertical alignment nudge
  const dy = normalizedAngle > 0.5 * Math.PI && normalizedAngle < 1.5 * Math.PI ? 0 : -((lines.length - 1) * 5)

  return (
    <text
      x={pos.x}
      y={pos.y + dy}
      textAnchor={textAnchor}
      fill={color}
      fontSize="9"
      fontFamily="ui-monospace, SFMono-Regular, 'Cascadia Code', monospace"
      opacity={0.85}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={pos.x} dy={i === 0 ? 0 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface VendorFingerprintChartProps {
  shapValues: Record<string, number>
  riskScore: number
  vendorName?: string
  size?: number
  showLabels?: boolean
  animate?: boolean
  compareWith?: Record<string, number>
}

export default function VendorFingerprintChart({
  shapValues,
  riskScore,
  vendorName,
  size = 280,
  showLabels = true,
  animate = true,
  compareWith,
}: VendorFingerprintChartProps) {
  const cx = size / 2
  const cy = size / 2
  const labelOffset = showLabels ? 48 : 8
  const maxRadius = (size / 2) - labelOffset
  const centerRadius = 18

  const riskLevel = getRiskLevelFromScore(riskScore)

  // Compute absolute SHAP magnitudes and normalize
  const petalData = useMemo(() => {
    const absValues = FINGERPRINT_FEATURES.map(f => Math.abs(shapValues[f.key] ?? 0))
    const maxVal = Math.max(...absValues, 0.001)

    return FINGERPRINT_FEATURES.map((feature, i) => {
      const rawValue = shapValues[feature.key] ?? 0
      const absValue = Math.abs(rawValue)
      const normalized = absValue / maxVal  // 0..1

      // Radius: area-proportional. A = (1/2) * r^2 * theta
      // For normalized value n: r = maxRadius * sqrt(n) (sqrt because area is proportional)
      const effectiveMax = maxRadius - centerRadius
      const r = centerRadius + effectiveMax * Math.sqrt(Math.max(normalized, 0))

      const startAngle = i * WEDGE_ANGLE - Math.PI / 2 + GAP_ANGLE / 2
      const endAngle = (i + 1) * WEDGE_ANGLE - Math.PI / 2 - GAP_ANGLE / 2
      const midAngle = (startAngle + endAngle) / 2

      const isHighMagnitude = normalized > 0.65

      return {
        feature,
        rawValue,
        absValue,
        normalized,
        radius: r,
        startAngle,
        endAngle,
        midAngle,
        isHighMagnitude,
        index: i,
      }
    })
  }, [shapValues, maxRadius])

  // Compare overlay data
  const compareData = useMemo(() => {
    if (!compareWith) return null

    const absValues = FINGERPRINT_FEATURES.map(f => Math.abs(compareWith[f.key] ?? 0))
    const primaryAbs = FINGERPRINT_FEATURES.map(f => Math.abs(shapValues[f.key] ?? 0))
    const maxVal = Math.max(...absValues, ...primaryAbs, 0.001)

    return FINGERPRINT_FEATURES.map((feature, i) => {
      const absValue = Math.abs(compareWith[feature.key] ?? 0)
      const normalized = absValue / maxVal
      const effectiveMax = maxRadius - centerRadius
      const r = centerRadius + effectiveMax * Math.sqrt(Math.max(normalized, 0))
      const startAngle = i * WEDGE_ANGLE - Math.PI / 2 + GAP_ANGLE / 2
      const endAngle = (i + 1) * WEDGE_ANGLE - Math.PI / 2 - GAP_ANGLE / 2
      return { radius: r, startAngle, endAngle }
    })
  }, [compareWith, shapValues, maxRadius])

  // Reference ring radii
  const ringRadii = [0.33, 0.66, 1.0].map(pct => centerRadius + (maxRadius - centerRadius) * pct)

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          vendorName
            ? `Corruption fingerprint for ${vendorName}: risk score ${(riskScore * 100).toFixed(0)}%`
            : `Vendor corruption fingerprint: risk score ${(riskScore * 100).toFixed(0)}%`
        }
      >
        <defs>
          <GlowFilter id="glow-risk" color={RISK_PETAL_BASE} />
          <GlowFilter id="glow-protect" color={PROTECT_PETAL_BASE} />

          {/* Radial gradients for each direction */}
          <radialGradient id="grad-risk" cx="50%" cy="50%" r="50%">
            <stop offset="20%" stopColor={RISK_PETAL_BASE} stopOpacity="0.9" />
            <stop offset="100%" stopColor={RISK_PETAL_LIGHT} stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="grad-protect" cx="50%" cy="50%" r="50%">
            <stop offset="20%" stopColor={PROTECT_PETAL_BASE} stopOpacity="0.9" />
            <stop offset="100%" stopColor={PROTECT_PETAL_LIGHT} stopOpacity="0.7" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={size} height={size} fill="#080c14" rx="8" />

        {/* Reference rings */}
        {ringRadii.map((r, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="white"
            strokeWidth="0.5"
            strokeDasharray="2 4"
            opacity="0.1"
          />
        ))}

        {/* Axis lines — faint spokes */}
        {FINGERPRINT_FEATURES.map((_, i) => {
          const angle = i * WEDGE_ANGLE - Math.PI / 2
          const outer = polarToCartesian(cx, cy, maxRadius, angle)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="white"
              strokeWidth="0.3"
              opacity="0.08"
            />
          )
        })}

        {/* Compare overlay (if present) — rendered first, behind primary */}
        {compareData && compareData.map((d, i) => (
          <path
            key={`compare-${i}`}
            d={buildWedgePath(cx, cy, d.radius, d.startAngle, d.endAngle)}
            fill="white"
            fillOpacity="0.08"
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity="0.25"
          />
        ))}

        {/* Petals */}
        {petalData.map((petal) => {
          const isRisk = petal.feature.direction === 'risk'
          const fillGradient = isRisk ? 'url(#grad-risk)' : 'url(#grad-protect)'
          const strokeColor = isRisk ? RISK_PETAL_LIGHT : PROTECT_PETAL_LIGHT
          const filterUrl = petal.isHighMagnitude
            ? (isRisk ? 'url(#glow-risk)' : 'url(#glow-protect)')
            : undefined

          // Opacity scales with magnitude
          const opacity = 0.45 + petal.normalized * 0.5

          const path = buildWedgePath(cx, cy, petal.radius, petal.startAngle, petal.endAngle)

          const motionProps = animate
            ? {
                initial: { opacity: 0, scale: 0 },
                animate: { opacity, scale: 1 },
                transition: {
                  delay: petal.index * 0.08,
                  duration: 0.7,
                  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
                },
              }
            : { style: { opacity } }

          return (
            <motion.g
              key={petal.feature.key}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              {...motionProps}
            >
              <path
                d={path}
                fill={fillGradient}
                stroke={strokeColor}
                strokeWidth="0.8"
                strokeOpacity="0.5"
                filter={filterUrl}
              />

              {/* Tooltip-friendly invisible hit area */}
              <path d={path} fill="transparent" stroke="none">
                <title>
                  {petal.feature.labelEN.replace('\n', ' ')}: {petal.rawValue >= 0 ? '+' : ''}{petal.rawValue.toFixed(4)}
                </title>
              </path>
            </motion.g>
          )
        })}

        {/* Center badge */}
        <motion.g
          initial={animate ? { scale: 0, opacity: 0 } : undefined}
          animate={animate ? { scale: 1, opacity: 1 } : undefined}
          transition={animate ? { delay: 0.7, duration: 0.5, ease: 'easeOut' } : undefined}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          {/* Outer glow ring */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius + 3}
            fill="none"
            stroke={CENTER_COLORS[riskLevel]}
            strokeWidth="1"
            opacity="0.3"
          />
          {/* Center circle */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill={CENTER_COLORS[riskLevel]}
            opacity="0.9"
          />
          {/* Risk score text */}
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="11"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, 'Cascadia Code', monospace"
          >
            {(riskScore * 100).toFixed(0)}
          </text>
        </motion.g>

        {/* Labels */}
        {showLabels && petalData.map((petal) => {
          const isRisk = petal.feature.direction === 'risk'
          const color = isRisk ? RISK_PETAL_LIGHT : PROTECT_PETAL_LIGHT

          return (
            <PetalLabel
              key={`label-${petal.feature.key}`}
              cx={cx}
              cy={cy}
              angle={petal.midAngle}
              radius={maxRadius + 14}
              label={petal.feature.labelEN}
              color={color}
            />
          )
        })}
      </svg>

      {/* Caption */}
      {vendorName && (
        <p className="text-[9px] text-white/30 font-mono mt-1 text-center max-w-[280px] truncate">
          {vendorName}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mini variant — for fingerprint walls and comparison grids
// ---------------------------------------------------------------------------

export interface VendorFingerprintMiniProps {
  shapValues: Record<string, number>
  riskScore: number
  size?: number
  onClick?: () => void
}

export function VendorFingerprintMini({
  shapValues,
  riskScore,
  size = 80,
  onClick,
}: VendorFingerprintMiniProps) {
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size / 2 - 4
  const centerRadius = 6

  const riskLevel = getRiskLevelFromScore(riskScore)

  const petalData = useMemo(() => {
    const absValues = FINGERPRINT_FEATURES.map(f => Math.abs(shapValues[f.key] ?? 0))
    const maxVal = Math.max(...absValues, 0.001)

    return FINGERPRINT_FEATURES.map((feature, i) => {
      const absValue = Math.abs(shapValues[feature.key] ?? 0)
      const normalized = absValue / maxVal
      const effectiveMax = maxRadius - centerRadius
      const r = centerRadius + effectiveMax * Math.sqrt(Math.max(normalized, 0))
      const startAngle = i * WEDGE_ANGLE - Math.PI / 2 + GAP_ANGLE / 2
      const endAngle = (i + 1) * WEDGE_ANGLE - Math.PI / 2 - GAP_ANGLE / 2

      return { feature, normalized, radius: r, startAngle, endAngle }
    })
  }, [shapValues, maxRadius])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Risk fingerprint: ${(riskScore * 100).toFixed(0)}%`}
      onClick={onClick}
      className={onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : undefined}
    >
      <rect width={size} height={size} fill="#080c14" rx="6" />

      {/* Single reference ring */}
      <circle
        cx={cx}
        cy={cy}
        r={maxRadius * 0.66}
        fill="none"
        stroke="white"
        strokeWidth="0.3"
        strokeDasharray="1 3"
        opacity="0.1"
      />

      {/* Petals */}
      {petalData.map((petal) => {
        const isRisk = petal.feature.direction === 'risk'
        const fill = isRisk ? RISK_PETAL_BASE : PROTECT_PETAL_BASE
        const opacity = 0.4 + petal.normalized * 0.5

        return (
          <path
            key={petal.feature.key}
            d={buildWedgePath(cx, cy, petal.radius, petal.startAngle, petal.endAngle)}
            fill={fill}
            opacity={opacity}
            stroke={isRisk ? RISK_PETAL_LIGHT : PROTECT_PETAL_LIGHT}
            strokeWidth="0.4"
            strokeOpacity="0.3"
          />
        )
      })}

      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r={centerRadius}
        fill={CENTER_COLORS[riskLevel]}
        opacity="0.9"
      />
    </svg>
  )
}
