import { cn } from '@/lib/utils'

export type OutletType = 'nyt' | 'wapo' | 'animal_politico' | 'rubli'

const OUTLET_CONFIG: Record<OutletType, { label: string; bg: string; text: string }> = {
  nyt: {
    label: 'NYT',
    bg: 'bg-zinc-950',
    text: 'text-white',
  },
  wapo: {
    label: 'WASHINGTON POST',
    bg: 'bg-[#14213D]',
    text: 'text-white',
  },
  animal_politico: {
    label: 'ANIMAL POLITICO',
    bg: 'bg-[#e6420e]',
    text: 'text-white',
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
