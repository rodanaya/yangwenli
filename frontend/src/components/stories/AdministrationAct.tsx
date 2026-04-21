import { useTranslation } from 'react-i18next'
import { ScrollReveal, AnimatedNumber, AnimatedFill } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'

interface AdminStats {
  totalContracts: number
  totalValueBn: number
  daPct: number
  avgRisk: number
  peakYear?: number
  peakDaPct?: number
  notableCase?: string
  notableCaseValue?: string
}

type EraKey = 'fox' | 'calderon' | 'pena' | 'amlo' | 'sheinbaum'
type PartyKey = 'PAN' | 'PRI' | 'MORENA'

interface AdministrationActProps {
  era: EraKey
  years: string
  president: string
  party: PartyKey
  verdict: string
  stats: AdminStats
  isHighlight?: boolean
  className?: string
}

const PARTY_COLORS: Record<PartyKey, { border: string; badge: string; badgeText: string; accent: string }> = {
  PAN: {
    border: '#3b82f6',
    badge: 'bg-blue-600',
    badgeText: 'text-white',
    accent: '#3b82f6',
  },
  PRI: {
    border: '#16a34a',
    badge: 'bg-green-600',
    badgeText: 'text-white',
    accent: '#16a34a',
  },
  MORENA: {
    border: '#dc2626',
    badge: 'bg-red-700',
    badgeText: 'text-white',
    accent: '#dc2626',
  },
}

const ERA_LABELS: Record<EraKey, string> = {
  fox: 'Vicente Fox',
  calderon: 'Felipe Calderon',
  pena: 'Enrique Pena Nieto',
  amlo: 'Andres Manuel Lopez Obrador',
  sheinbaum: 'Claudia Sheinbaum',
}

const OECD_DA_BENCHMARK = 25 // OECD average direct award %

export default function AdministrationAct({
  era,
  years,
  president,
  party,
  verdict,
  stats,
  isHighlight = false,
  className,
}: AdministrationActProps) {
  const { t } = useTranslation('administrations')
  const partyStyle = PARTY_COLORS[party]
  const presidentLabel = ERA_LABELS[era] || president

  const statCards: { label: string; value: number; suffix: string; decimals: number }[] = [
    { label: t('actCard.contracts'), value: stats.totalContracts, suffix: '', decimals: 0 },
    { label: t('actCard.totalValue'), value: stats.totalValueBn, suffix: 'B', decimals: 1 },
    { label: t('actCard.directAward'), value: stats.daPct, suffix: '%', decimals: 1 },
    { label: t('actCard.avgRisk'), value: stats.avgRisk, suffix: '', decimals: 2 },
  ]

  return (
    <ScrollReveal className={cn('my-8', className)}>
      <article
        className={cn(
          'relative rounded-lg overflow-hidden transition-colors',
          isHighlight ? 'bg-zinc-900/80' : 'bg-zinc-900/40'
        )}
        style={{
          borderLeft: `4px solid ${partyStyle.border}`,
          boxShadow: isHighlight ? `0 0 40px ${partyStyle.border}15` : undefined,
        }}
        aria-label={`Administración ${presidentLabel} (${years})`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <h3 className={cn(
              'font-bold text-zinc-100',
              isHighlight ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
            )}>
              {presidentLabel}
            </h3>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase leading-none',
                partyStyle.badge,
                partyStyle.badgeText
              )}
            >
              {party}
            </span>
          </div>
          <span className="text-sm text-zinc-500 tabular-nums font-mono">{years}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 pb-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-md bg-zinc-800/60 px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{s.label}</p>
              <AnimatedNumber
                value={s.value}
                suffix={s.suffix}
                decimals={s.decimals}
                duration={1400}
                className={cn(
                  'text-lg font-bold tabular-nums',
                  s.label === t('actCard.directAward') && s.value > OECD_DA_BENCHMARK
                    ? 'text-red-400'
                    : 'text-zinc-100'
                )}
              />
            </div>
          ))}
        </div>

        {/* DA% comparison bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-1">
            <span>{t('actCard.daVsOecd', { pct: OECD_DA_BENCHMARK })}</span>
          </div>
          <div className="relative">
            <AnimatedFill
              pct={Math.min(stats.daPct, 100)}
              color={stats.daPct > OECD_DA_BENCHMARK ? partyStyle.accent : '#71717a'}
              height="h-2.5"
              delay={300}
            />
            {/* OECD benchmark marker */}
            <div
              className="absolute top-0 h-2.5 border-r-2 border-dashed border-zinc-400"
              style={{ left: `${OECD_DA_BENCHMARK}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-600">0%</span>
            <span className="text-[10px] text-zinc-500">{t('actCard.oecdBenchmark', { pct: OECD_DA_BENCHMARK })}</span>
            <span className="text-[10px] text-zinc-600">100%</span>
          </div>
        </div>

        {/* Notable case */}
        {stats.notableCase && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span>{t('actCard.notableCase')} <span className="text-zinc-300 font-medium">{stats.notableCase}</span></span>
              {stats.notableCaseValue && (
                <span className="text-red-400 font-bold">{stats.notableCaseValue}</span>
              )}
            </div>
          </div>
        )}

        {/* Verdict */}
        <div
          className="px-5 py-4 border-t border-zinc-800"
          style={{
            backgroundColor: isHighlight ? `${partyStyle.border}08` : undefined,
          }}
        >
          <p className={cn(
            'italic text-zinc-300 leading-relaxed',
            isHighlight ? 'text-base md:text-lg' : 'text-sm md:text-base'
          )}>
            {verdict}
          </p>
        </div>
      </article>
    </ScrollReveal>
  )
}
