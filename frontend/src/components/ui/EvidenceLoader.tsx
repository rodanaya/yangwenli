import { cn } from '@/lib/utils'

interface EvidenceLoaderProps {
  label?: string
  className?: string
  height?: string
}

export function EvidenceLoader({
  label = 'GATHERING EVIDENCE',
  className,
  height = '200px'
}: EvidenceLoaderProps) {
  return (
    <div
      className={cn(
        'surface-card flex flex-col items-center justify-center gap-3 w-full',
        className
      )}
      style={{ height }}
      role="status"
      aria-label={label}
    >
      {/* Animated scan lines */}
      <div className="relative w-48 h-px bg-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-1/3 bg-accent/60"
          style={{
            animation: 'evidenceScan 1.6s ease-in-out infinite',
          }}
        />
      </div>
      <span className="chart-annotation text-text-muted/60 tracking-[0.3em]">
        {label}
      </span>
      <style>{`
        @keyframes evidenceScan {
          0%   { left: -33%; }
          100% { left: 133%; }
        }
      `}</style>
    </div>
  )
}
