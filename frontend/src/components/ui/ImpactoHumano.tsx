import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ImpactoHumanoProps {
  amountMxn: number
  className?: string
}

interface Comparison {
  unitCost: number
  labelKey: string
}

const COMPARISONS: Comparison[] = [
  { unitCost: 120_000, labelKey: 'impacto.imssAnnualSalaries' },
  { unitCost: 2_500_000, labelKey: 'impacto.ruralSchools' },
  { unitCost: 50_000_000, labelKey: 'impacto.ruralHospitals' },
  { unitCost: 1_800_000, labelKey: 'impacto.equippedAmbulances' },
  { unitCost: 400_000, labelKey: 'impacto.classroomsBuilt' },
  { unitCost: 15_000, labelKey: 'impacto.basicEducationYears' },
]

function pickBestTwo(amount: number): { count: number; labelKey: string }[] {
  const scored = COMPARISONS.map(c => {
    const count = Math.floor(amount / c.unitCost)
    // Prefer comparisons where count is between 1 and 10,000
    const inRange = count >= 1 && count <= 10_000
    // Score by how "relatable" the number is (prefer mid-range)
    const logDist = inRange ? Math.abs(Math.log10(count) - 2) : 100
    return { count, labelKey: c.labelKey, score: inRange ? logDist : 999 }
  })
    .filter(s => s.count >= 1)
    .sort((a, b) => a.score - b.score)

  return scored.slice(0, 2).map(({ count, labelKey }) => ({ count, labelKey }))
}

export function ImpactoHumano({ amountMxn, className }: ImpactoHumanoProps) {
  const { t } = useTranslation('common')
  const comparisons = useMemo(() => pickBestTwo(amountMxn), [amountMxn])

  if (comparisons.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-sm p-3 text-sm',
        'bg-background-elevated border border-accent/25',
        className
      )}
    >
      <div className="text-accent font-semibold text-xs uppercase tracking-wide mb-2">
        {t('impacto.label')}
      </div>
      {comparisons.map((c, i) => (
        <div key={i} className="flex items-baseline gap-1.5 text-text-secondary">
          <span className="text-accent">&rarr;</span>
          <span>
            <span className="font-semibold text-text-primary font-mono tabular-nums">
              {c.count.toLocaleString()}
            </span>{' '}
            {t(c.labelKey)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ImpactoHumano
