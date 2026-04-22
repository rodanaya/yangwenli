/**
 * CategoryHotspot — compact dashboard widget showing the top-risk spending
 * categories. Pulls from /categories/summary, sorts by avg_risk desc.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/client'
import { ArrowRight } from 'lucide-react'

interface Category {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number
  sector_code: string
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
}

interface CategoriesResponse {
  data: Category[]
}

const SECTOR_COLORS: Record<string, string> = {
  salud: '#dc2626',
  educacion: '#3b82f6',
  infraestructura: '#ea580c',
  energia: '#eab308',
  defensa: '#1e3a5f',
  tecnologia: '#8b5cf6',
  hacienda: '#16a34a',
  gobernacion: '#be123c',
  agricultura: '#22c55e',
  ambiente: '#10b981',
  trabajo: '#f97316',
  otros: '#64748b',
}

function useTopRiskCategories() {
  return useQuery({
    queryKey: ['category-hotspot'],
    queryFn: async () => {
      const { data } = await api.get<CategoriesResponse>('/categories/summary')
      const sorted = [...data.data].sort((a, b) => b.avg_risk - a.avg_risk)
      return sorted.slice(0, 5)
    },
    staleTime: 60 * 60 * 1000,
  })
}

// 10 dots → each dot ≈ 10% of risk score (max ~1.0)
const N_DOTS = 10
const MAX_RISK = 1.0

export function CategoryHotspot({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { data: categories, isLoading, isError } = useTopRiskCategories()

  if (isLoading) {
    return (
      <div className={className}>
        <div className="h-[120px] bg-zinc-800/40 rounded animate-pulse" />
      </div>
    )
  }

  if (isError || !categories?.length) return null

  return (
    <div className={className}>
      {/* Kicker */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
          style={{ color: '#f59e0b' }}
        >
          {lang === 'en' ? 'HIGH-RISK CATEGORIES' : 'CATEGORÍAS DE ALTO RIESGO'}
        </span>
        <Link
          to="/categories"
          className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition-colors"
        >
          {lang === 'en' ? 'all categories' : 'todas'}
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Category rows */}
      <div className="space-y-1.5">
        {categories.map((cat, idx) => {
          const name = lang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es
          const sectorColor = SECTOR_COLORS[cat.sector_code] ?? '#64748b'
          const riskPct = Math.round(cat.avg_risk * 100)
          const filled = Math.round((cat.avg_risk / MAX_RISK) * N_DOTS)

          return (
            <div key={cat.category_id} className="flex items-center gap-2">
              {/* Rank */}
              <span className="text-[9px] font-mono text-zinc-600 w-3 flex-shrink-0 text-right">
                {idx + 1}
              </span>

              {/* Sector color dot */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: sectorColor }}
              />

              {/* Name */}
              <span className="text-[10px] font-mono text-zinc-300 flex-1 min-w-0 truncate">
                {name}
              </span>

              {/* Dot strip */}
              <div className="flex items-center gap-[2px] flex-shrink-0">
                {Array.from({ length: N_DOTS }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      backgroundColor: i < filled ? '#f59e0b' : '#27272a',
                      border: i < filled ? 'none' : '0.5px solid #3f3f46',
                    }}
                  />
                ))}
              </div>

              {/* Risk % */}
              <span
                className="text-[10px] font-mono font-bold w-7 text-right flex-shrink-0"
                style={{ color: '#f59e0b' }}
              >
                {riskPct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 text-[9px] font-mono text-zinc-600">
        {lang === 'en' ? '1 dot ≈ 10% avg risk score' : '1 punto ≈ 10% puntaje de riesgo'}
      </div>
    </div>
  )
}

export default CategoryHotspot
