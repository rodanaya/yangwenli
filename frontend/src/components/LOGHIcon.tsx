interface LOGHIconProps {
  className?: string
  size?: number
  color?: string
}

export function LOGHIcon({ className, size = 20, color = 'currentColor' }: LOGHIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagonal shield outline */}
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Compass star - 6 points */}
      <path
        d="M12 5L13.5 10L18.5 12L13.5 14L12 19L10.5 14L5.5 12L10.5 10L12 5Z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.15"
      />
      {/* Center point */}
      <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
  )
}
