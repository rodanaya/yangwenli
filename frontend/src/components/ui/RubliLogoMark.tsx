/**
 * RUBLI brand mark — stepped Aztec pyramid (Teotihuacán style).
 *
 * Concept: "Mexican procurement intelligence"
 * — The pyramid steps mirror ascending risk tiers (low → critical)
 * — Each step is slightly narrower than the last, like a risk funnel
 * — The apex represents the anomaly/critical finding
 * — Ground line anchors the structure
 *
 * Scales cleanly from 16px (compact) to 64px (hero).
 */

interface RubliLogoMarkProps {
  size?: number
  className?: string
}

export function RubliLogoMark({ size = 20, className }: RubliLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="RUBLI"
    >
      {/* Ground line */}
      <line
        x1="1.5"
        y1="17"
        x2="18.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Step 1 — base tier (widest) */}
      <rect x="2" y="14" width="16" height="3" rx="0.5" fill="currentColor" opacity="0.30" />

      {/* Step 2 */}
      <rect x="4" y="11" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.50" />

      {/* Step 3 */}
      <rect x="6" y="8" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.70" />

      {/* Step 4 */}
      <rect x="8" y="5" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.88" />

      {/* Apex — the anomaly/critical finding */}
      <rect x="9" y="2.5" width="2" height="2.5" rx="0.4" fill="currentColor" />
    </svg>
  )
}
