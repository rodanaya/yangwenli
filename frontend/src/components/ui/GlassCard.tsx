import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  title?: string
  headerActions?: React.ReactNode
}

export function GlassCard({ children, className, glow = false, title, headerActions }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-sm border border-border/40 bg-surface/60 backdrop-blur-sm',
        glow && 'transition-shadow hover:border-accent/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)]',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/20">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
