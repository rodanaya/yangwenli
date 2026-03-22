import { cn } from '@/lib/utils'

export type OutletType = 'longform' | 'investigative' | 'data_analysis' | 'rubli'

const OUTLET_CONFIG: Record<OutletType, { label: string; bg: string; text: string }> = {
  longform: {
    label: 'FORMATO LARGO',
    bg: 'bg-zinc-800',
    text: 'text-zinc-200',
  },
  investigative: {
    label: 'INVESTIGACIÓN',
    bg: 'bg-zinc-800',
    text: 'text-zinc-200',
  },
  data_analysis: {
    label: 'ANÁLISIS DE DATOS',
    bg: 'bg-zinc-800',
    text: 'text-zinc-200',
  },
  rubli: {
    label: 'RUBLI',
    bg: 'bg-[#dc2626]',
    text: 'text-white',
  },
}

interface OutletBadgeProps {
  outlet: OutletType
  className?: string
}

export function OutletBadge({ outlet, className }: OutletBadgeProps) {
  const config = OUTLET_CONFIG[outlet]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase leading-none',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  )
}
