/**
 * InvestigationLede — Newspaper-style page opener for investigations.
 * Shows above the main content like a newspaper article lede.
 */
import { RISK_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface InvestigationLedeProps {
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  topFinding: string
  sector: string
  yearsActive: string
  totalValue: string
  contractCount: number
  className?: string
}

const RISK_LABELS: Record<string, string> = {
  critical: 'CRITICO',
  high: 'ALTO',
  medium: 'MEDIO',
  low: 'BAJO',
}

export default function InvestigationLede({
  riskLevel,
  topFinding,
  sector,
  yearsActive,
  totalValue,
  contractCount,
  className,
}: InvestigationLedeProps) {
  const borderColor = RISK_COLORS[riskLevel] ?? RISK_COLORS.low
  const badgeBg = `${borderColor}20`

  return (
    <div
      className={cn(
        'bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 relative overflow-hidden',
        className
      )}
      style={{ borderTopWidth: '3px', borderTopColor: borderColor }}
    >
      {/* Section eyebrow */}
      <p className="text-xs tracking-wider text-zinc-400 mb-1.5">
        PERFIL DE VENDEDOR
        {sector && <> &middot; {sector.toUpperCase()}</>}
        {yearsActive && <> &middot; {yearsActive}</>}
      </p>

      {/* Lede sentence */}
      <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
        {topFinding} en {contractCount.toLocaleString()} contratos &middot; Total: {totalValue}
      </p>

      {/* Risk badge */}
      <span
        className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full border"
        style={{
          color: borderColor,
          backgroundColor: badgeBg,
          borderColor: `${borderColor}40`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        {RISK_LABELS[riskLevel] ?? riskLevel.toUpperCase()}
      </span>
    </div>
  )
}
