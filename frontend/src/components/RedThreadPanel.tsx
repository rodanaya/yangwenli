import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Users,
  FileSearch,
  Newspaper,
  Shield,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RedThreadItem {
  type:
    | 'co_bidder'
    | 'investigation_case'
    | 'sanctions'
    | 'scandal'
    | 'high_risk_vendor'
    | 'asf_finding'
  label: string
  count?: number
  href: string
  riskLevel?: 'critical' | 'high' | 'medium' | 'low'
}

interface RedThreadPanelProps {
  items: RedThreadItem[]
  entityName: string
  className?: string
}

const TYPE_CONFIG: Record<
  RedThreadItem['type'],
  { icon: typeof AlertTriangle; colorClass: string }
> = {
  sanctions: { icon: AlertTriangle, colorClass: 'text-red-400 bg-red-500/15 border-red-500/30' },
  scandal: { icon: Newspaper, colorClass: 'text-red-400 bg-red-500/15 border-red-500/30' },
  investigation_case: {
    icon: FileSearch,
    colorClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  },
  co_bidder: { icon: Users, colorClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
  high_risk_vendor: {
    icon: Shield,
    colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  },
  asf_finding: {
    icon: ClipboardList,
    colorClass: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  },
}

export function RedThreadPanel({
  items,
  entityName,
  className,
}: RedThreadPanelProps) {
  if (items.length === 0) {
    return (
      <div className={cn('text-xs text-text-muted p-3', className)}>
        No investigative leads found for {entityName}.
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Continue Investigation
      </h4>

      <div className="space-y-1.5">
        {items.map((item, i) => {
          const config = TYPE_CONFIG[item.type]
          const Icon = config.icon
          return (
            <Link
              key={i}
              to={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:opacity-80',
                config.colorClass
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.count != null && (
                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
                  {item.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <p className="text-[10px] text-text-muted pt-1">
        Based on {items.length} data connection{items.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default RedThreadPanel
