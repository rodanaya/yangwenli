/**
 * RUBLI brand mark — magnifying glass with ascending anomaly bars inside the lens.
 *
 * Concept: "investigating procurement data for corruption anomalies"
 * — The lens represents scope and analysis coverage
 * — The ascending bars represent procurement volume/data
 * — The tallest bar (right) is the anomaly spike, the core detection metaphor
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
      {/* Lens outline */}
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />

      {/* Handle — thick rounded line extending bottom-right */}
      <line
        x1="13"
        y1="13"
        x2="18"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Baseline — subtle floor reference inside lens */}
      <line
        x1="3.2"
        y1="12"
        x2="12.8"
        y2="12"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Bar 1 — low, normal activity */}
      <rect x="4" y="10" width="2" height="2" rx="0.4" fill="currentColor" opacity="0.4" />

      {/* Bar 2 — medium, elevated activity */}
      <rect x="6.5" y="7.5" width="2" height="4.5" rx="0.4" fill="currentColor" opacity="0.65" />

      {/* Bar 3 — spike, the anomaly the model detects */}
      <rect x="9" y="5.5" width="2" height="6.5" rx="0.4" fill="currentColor" />
    </svg>
  )
}
