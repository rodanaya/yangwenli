import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export type OutletType = 'longform' | 'investigative' | 'data_analysis' | 'rubli'

const OUTLET_CONFIG: Record<OutletType, { bg: string; text: string }> = {
  longform: {
    bg: 'bg-background-elevated',
    text: 'text-text-secondary',
  },
  investigative: {
    bg: 'bg-background-elevated',
    text: 'text-text-secondary',
  },
  data_analysis: {
    bg: 'bg-background-elevated',
    text: 'text-text-secondary',
  },
  rubli: {
    bg: 'bg-risk-critical',
    text: 'text-text-primary',
  },
}

interface OutletBadgeProps {
  outlet: OutletType
  className?: string
}

export function OutletBadge({ outlet, className }: OutletBadgeProps) {
  const { t } = useTranslation('common')
  const config = OUTLET_CONFIG[outlet]
  const label = t(`outletLabels.${outlet}`, { defaultValue: outlet.toUpperCase() })
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold tracking-wider uppercase leading-none',
        config.bg,
        config.text,
        className
      )}
    >
      {label}
    </span>
  )
}
