interface StatRingProps {
  value: number       // 0–100
  label: string
  sublabel?: string
  color?: string      // CSS color, default 'var(--color-accent)'
  size?: number       // px, default 80
}

export function StatRing({ value, label, sublabel, color = 'var(--color-accent)', size = 80 }: StatRingProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="currentColor" strokeWidth={6}
            className="text-border/30"
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-sm font-bold text-text-primary leading-none">{value}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-text-secondary">{label}</p>
        {sublabel && <p className="text-[10px] text-text-muted">{sublabel}</p>}
      </div>
    </div>
  )
}
