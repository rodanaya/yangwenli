import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export interface ExplorerFilters {
  sectorId: number | undefined
  yearStart: number | undefined
  yearEnd: number | undefined
  riskLevels: string[]
  searchText: string
  entityType: 'vendor' | 'institution'
}

export interface ExplorerFilterSetters {
  setSectorId: (id: number | undefined) => void
  setYearRange: (start: number | undefined, end: number | undefined) => void
  toggleRiskLevel: (level: string) => void
  setSearchText: (text: string) => void
  setEntityType: (type: 'vendor' | 'institution') => void
  clearAll: () => void
}

const RISK_ALL = ['critical', 'high', 'medium', 'low']

export function useExplorerFilters(): ExplorerFilters & ExplorerFilterSetters {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<ExplorerFilters>(() => {
    const sectorParam = searchParams.get('sector')
    const yearStartParam = searchParams.get('year_start')
    const yearEndParam = searchParams.get('year_end')
    const riskParam = searchParams.get('risk')
    const searchTextParam = searchParams.get('q')
    const entityTypeParam = searchParams.get('type')

    return {
      sectorId: sectorParam ? Number(sectorParam) : undefined,
      yearStart: yearStartParam ? Number(yearStartParam) : undefined,
      yearEnd: yearEndParam ? Number(yearEndParam) : undefined,
      riskLevels: riskParam ? riskParam.split(',').filter(Boolean) : RISK_ALL,
      searchText: searchTextParam || '',
      entityType: (entityTypeParam === 'institution' ? 'institution' : 'vendor') as 'vendor' | 'institution',
    }
  }, [searchParams])

  const update = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSectorId = useCallback((id: number | undefined) => {
    update({ sector: id != null ? String(id) : null })
  }, [update])

  const setYearRange = useCallback((start: number | undefined, end: number | undefined) => {
    update({
      year_start: start != null ? String(start) : null,
      year_end: end != null ? String(end) : null,
    })
  }, [update])

  const toggleRiskLevel = useCallback((level: string) => {
    const current = filters.riskLevels
    const next = current.includes(level) ? current.filter(l => l !== level) : [...current, level]
    const allSelected = next.length === RISK_ALL.length
    update({ risk: allSelected ? null : next.join(',') })
  }, [filters.riskLevels, update])

  const setSearchText = useCallback((text: string) => {
    update({ q: text || null })
  }, [update])

  const setEntityType = useCallback((type: 'vendor' | 'institution') => {
    update({ type: type === 'vendor' ? null : type })
  }, [update])

  const clearAll = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return {
    ...filters,
    setSectorId,
    setYearRange,
    toggleRiskLevel,
    setSearchText,
    setEntityType,
    clearAll,
  }
}
