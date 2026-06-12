import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RiskLevelPillProps {
  level: 'critical' | 'high' | 'medium' | 'low'
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
  score?: number
}

// Phase 1 canonical risk pill palette — see design tokens in src/index.css.
// Critical=red-500, high=amber-500, medium=amber-800/zinc, low=zinc-500 (no green).
const RISK_STYLES = {
  critical: {
    bg: 'bg-risk-critical/15',
    text: 'text-risk-critical',
    border: 'border-risk-critical/30',
    dot: 'var(--color-risk-critical)',
  },
  high: {
    bg: 'bg-risk-high/15',
    text: 'text-risk-high',
    border: 'border-risk-high/30',
    dot: 'var(--color-risk-high)',
  },
  medium: {
    bg: 'bg-risk-medium/10',
    text: 'text-risk-medium',
    border: 'border-risk-medium/30',
    dot: 'var(--color-risk-medium)',
  },
  low: {
    bg: 'bg-background-elevated',
    text: 'text-text-muted',
    border: 'border-border',
    dot: '#71717a',
  },
} as const

const RISK_TOOLTIPS_EN: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical:
    'Critical risk — Strong match to documented fraud patterns. This is a statistical indicator, not proof of wrongdoing.',
  high: 'High risk — Elevated similarity to known corruption patterns.',
  medium: 'Medium risk — Some procurement anomalies detected relative to sector baseline.',
  low: 'Low risk — Few anomalies relative to sector baseline.',
}

const RISK_TOOLTIPS_ES: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical:
    'Riesgo crítico — Fuerte similitud con patrones de fraude documentados. Es un indicador estadístico, no prueba de irregularidad.',
  high: 'Riesgo alto — Similitud elevada con patrones de corrupción conocidos.',
  medium: 'Riesgo medio — Algunas anomalías de contratación respecto a la base del sector.',
  low: 'Riesgo bajo — Pocas anomalías respecto a la base del sector.',
}

const RISK_LABELS_ES: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export function RiskLevelPill({
  level,
  size = 'sm',
  showDot = true,
  className,
  score,
}: RiskLevelPillProps) {
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es') ?? false
  const s = RISK_STYLES[level]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  const baseTooltip = isEs ? RISK_TOOLTIPS_ES[level] : RISK_TOOLTIPS_EN[level]
  const tooltipText =
    score !== undefined
      ? `${baseTooltip} ${isEs ? 'Puntuación' : 'Score'}: ${score.toFixed(3)}.`
      : baseTooltip

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border} ${padding} ${className ?? ''}`}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.dot }}
          aria-hidden="true"
        />
      )}
      {isEs ? RISK_LABELS_ES[level] : level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-center">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
