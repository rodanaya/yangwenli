import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: { value: number; label: string }   // e.g. { value: 2.3, label: 'vs last year' }
  accentColor?: string                        // CSS color for accent
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = '#06b6d4',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/30 bg-card p-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-border/60 hover:bg-white/[0.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-text-muted uppercase tracking-wider">
          {title}
        </span>
        {Icon && <Icon className="h-4 w-4 text-text-muted/50" />}
      </div>
      <div
        className="text-2xl font-bold font-mono text-text-primary"
        style={accentColor !== '#06b6d4' ? { color: accentColor } : undefined}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div className="text-xs text-text-muted mt-1">{subtitle}</div>
      )}
      {trend && (
        <div
          className={cn(
            'text-xs mt-2',
            trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%{' '}
          {trend.label}
        </div>
      )}
    </div>
  )
}
