/**
 * RUBLI brand mark — Águila Real (Mexican golden eagle) head in profile.
 *
 * Concept: The eagle from Mexico's coat of arms — the nation's guardian —
 * reimagined as a data sentinel that sees and exposes corruption.
 * Crown feathers signal the águila real; the hooked beak is the hook
 * of investigation and accountability.
 *
 * Scales cleanly from 16px (sidebar) to 64px (hero).
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
      {/* Eagle head silhouette — evenodd punches out the eye */}
      <path
        fillRule="evenodd"
        d="
          M 1.5 9.5
          L 3 8.2
          C 5 7 7.5 5.5 9 4.5
          L 9.5 3
          L 10.5 1.5
          L 11.5 3
          L 13 1.5
          L 14.5 3.5
          C 17 5 18 8 17 11.5
          C 16 14.5 14 17 11 18.5
          L 7.5 19
          C 5.5 18.5 4 17 3 15
          L 2.5 13
          L 2 11.5
          L 1.8 10.5
          Z
          M 14.8 9
          A 1.5 1.5 0 1 0 11.8 9
          A 1.5 1.5 0 1 0 14.8 9
          Z
        "
        fill="currentColor"
      />
    </svg>
  )
}
