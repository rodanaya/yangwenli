import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ImpactoHumanoProps {
  amountMxn: number
  className?: string
}

interface Comparison {
  unitCost: number
  labelEs: string
  labelEn: string
}

const COMPARISONS: Comparison[] = [
  { unitCost: 120_000, labelEs: 'salarios anuales IMSS', labelEn: 'IMSS annual salaries' },
  { unitCost: 2_500_000, labelEs: 'escuelas rurales', labelEn: 'rural schools' },
  { unitCost: 50_000_000, labelEs: 'hospitales rurales', labelEn: 'rural hospitals' },
  { unitCost: 1_800_000, labelEs: 'ambulancias equipadas', labelEn: 'equipped ambulances' },
  { unitCost: 400_000, labelEs: 'aulas construidas', labelEn: 'classrooms built' },
  { unitCost: 15_000, labelEs: 'anos de educacion basica', labelEn: 'years of basic education' },
]

function pickBestTwo(amount: number): { count: number; label: string }[] {
  const scored = COMPARISONS.map(c => {
    const count = Math.floor(amount / c.unitCost)
    // Prefer comparisons where count is between 1 and 10,000
    const inRange = count >= 1 && count <= 10_000
    // Score by how "relatable" the number is (prefer mid-range)
    const logDist = inRange ? Math.abs(Math.log10(count) - 2) : 100
    return { count, label: c.labelEs, score: inRange ? logDist : 999 }
  })
    .filter(s => s.count >= 1)
    .sort((a, b) => a.score - b.score)

  return scored.slice(0, 2).map(({ count, label }) => ({ count, label }))
}

export function ImpactoHumano({ amountMxn, className }: ImpactoHumanoProps) {
  const comparisons = useMemo(() => pickBestTwo(amountMxn), [amountMxn])

  if (comparisons.length === 0) return null

  return (
    <div
      className={cn(
        'rounded p-3 text-sm',
        'bg-amber-950/30 border border-amber-800/40',
        className
      )}
    >
      <div className="text-amber-400 font-semibold text-xs uppercase tracking-wide mb-2">
        Este monto equivale a:
      </div>
      {comparisons.map((c, i) => (
        <div key={i} className="flex items-baseline gap-1.5 text-text-secondary">
          <span className="text-amber-500">&rarr;</span>
          <span>
            <span className="font-semibold text-text-primary tabular-nums">
              {c.count.toLocaleString()}
            </span>{' '}
            {c.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ImpactoHumano
