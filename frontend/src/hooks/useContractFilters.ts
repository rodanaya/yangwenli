import { useState, useCallback, useMemo } from 'react'

export interface ContractFilterState {
  year: number | null
  riskLevel: string | null
  procedureType: string | null
  sortBy: 'date' | 'amount' | 'risk'
  sortOrder: 'asc' | 'desc'
  searchText: string
}

export interface ContractFilterActions {
  setYear: (year: number | null) => void
  setRiskLevel: (level: string | null) => void
  setProcedureType: (type: string | null) => void
  setSortBy: (field: 'date' | 'amount' | 'risk') => void
  toggleSortOrder: () => void
  setSearchText: (text: string) => void
  reset: () => void
}

export type FilterableContract = {
  contract_date?: string
  amount_mxn?: number
  risk_score?: number | null
  risk_level?: string | null
  procedure_type?: string | null
  title?: string | null
}

const DEFAULT_STATE: ContractFilterState = {
  year: null,
  riskLevel: null,
  procedureType: null,
  sortBy: 'date',
  sortOrder: 'desc',
  searchText: '',
}

export function useContractFilters(): ContractFilterState &
  ContractFilterActions & {
    isFiltered: boolean
    applyFilters: <T extends FilterableContract>(contracts: T[]) => T[]
  } {
  const [state, setState] = useState<ContractFilterState>(DEFAULT_STATE)

  const setYear = useCallback((year: number | null) => {
    setState(prev => ({ ...prev, year }))
  }, [])

  const setRiskLevel = useCallback((riskLevel: string | null) => {
    setState(prev => ({ ...prev, riskLevel }))
  }, [])

  const setProcedureType = useCallback((procedureType: string | null) => {
    setState(prev => ({ ...prev, procedureType }))
  }, [])

  const setSortBy = useCallback((sortBy: 'date' | 'amount' | 'risk') => {
    setState(prev => ({ ...prev, sortBy }))
  }, [])

  const toggleSortOrder = useCallback(() => {
    setState(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))
  }, [])

  const setSearchText = useCallback((searchText: string) => {
    setState(prev => ({ ...prev, searchText }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  const isFiltered = useMemo(() => {
    return (
      state.year !== null ||
      state.riskLevel !== null ||
      state.procedureType !== null ||
      state.searchText !== '' ||
      state.sortBy !== DEFAULT_STATE.sortBy ||
      state.sortOrder !== DEFAULT_STATE.sortOrder
    )
  }, [state])

  const applyFilters = useCallback(
    <T extends FilterableContract>(contracts: T[]): T[] => {
      let result = [...contracts]

      // Filter by year
      if (state.year !== null) {
        result = result.filter(c => {
          if (!c.contract_date) return false
          return new Date(c.contract_date).getFullYear() === state.year
        })
      }

      // Filter by risk level
      if (state.riskLevel !== null) {
        result = result.filter(c => c.risk_level === state.riskLevel)
      }

      // Filter by procedure type (case-insensitive includes)
      if (state.procedureType !== null) {
        const needle = state.procedureType.toLowerCase()
        result = result.filter(c =>
          c.procedure_type != null &&
          c.procedure_type.toLowerCase().includes(needle)
        )
      }

      // Filter by search text (matches title or procedure_type)
      if (state.searchText !== '') {
        const needle = state.searchText.toLowerCase()
        result = result.filter(c => {
          const titleMatch = c.title != null && c.title.toLowerCase().includes(needle)
          const typeMatch =
            c.procedure_type != null && c.procedure_type.toLowerCase().includes(needle)
          return titleMatch || typeMatch
        })
      }

      // Sort
      result.sort((a, b) => {
        let comparison = 0

        if (state.sortBy === 'date') {
          const aDate = a.contract_date ? new Date(a.contract_date).getTime() : 0
          const bDate = b.contract_date ? new Date(b.contract_date).getTime() : 0
          comparison = aDate - bDate
        } else if (state.sortBy === 'amount') {
          comparison = (a.amount_mxn ?? 0) - (b.amount_mxn ?? 0)
        } else if (state.sortBy === 'risk') {
          comparison = (a.risk_score ?? 0) - (b.risk_score ?? 0)
        }

        return state.sortOrder === 'asc' ? comparison : -comparison
      })

      return result
    },
    [state]
  )

  return {
    ...state,
    setYear,
    setRiskLevel,
    setProcedureType,
    setSortBy,
    toggleSortOrder,
    setSearchText,
    reset,
    isFiltered,
    applyFilters,
  }
}
