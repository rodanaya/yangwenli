/**
 * Saved Views Hook
 * Allows users to save and load filter configurations
 */

import { useState, useCallback, useEffect } from 'react'
import type { ContractFilterParams } from '@/api/types'

interface SavedView {
  id: string
  name: string
  filters: Partial<ContractFilterParams>
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'rubli-saved-views'
const MAX_VIEWS = 10

function generateId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function loadViews(): SavedView[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function persistViews(views: SavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch (e) {
    console.error('Failed to persist saved views:', e)
  }
}

interface UseSavedViewsReturn {
  views: SavedView[]
  saveView: (name: string, filters: Partial<ContractFilterParams>) => SavedView
  deleteView: (id: string) => void
  updateView: (id: string, updates: Partial<Pick<SavedView, 'name' | 'filters'>>) => void
  loadView: (id: string) => SavedView | undefined
  canSaveMore: boolean
}

/**
 * Hook for managing saved filter views
 *
 * @example
 * ```tsx
 * const { views, saveView, loadView, deleteView } = useSavedViews();
 *
 * // Save current filters
 * const newView = saveView('My High Risk View', { risk_level: 'high', sector_id: 1 });
 *
 * // Load a saved view
 * const view = loadView(viewId);
 * if (view) {
 *   setFilters(view.filters);
 * }
 *
 * // Delete a view
 * deleteView(viewId);
 * ```
 */
export function useSavedViews(): UseSavedViewsReturn {
  const [views, setViews] = useState<SavedView[]>([])

  // Load views from localStorage on mount
  useEffect(() => {
    setViews(loadViews())
  }, [])

  const saveView = useCallback(
    (name: string, filters: Partial<ContractFilterParams>): SavedView => {
      const now = new Date().toISOString()
      const newView: SavedView = {
        id: generateId(),
        name: name.trim() || 'Untitled View',
        filters,
        createdAt: now,
        updatedAt: now,
      }

      setViews((prev) => {
        // Keep only the most recent views if we're at the limit
        const updated = [newView, ...prev].slice(0, MAX_VIEWS)
        persistViews(updated)
        return updated
      })

      return newView
    },
    []
  )

  const deleteView = useCallback((id: string): void => {
    setViews((prev) => {
      const updated = prev.filter((v) => v.id !== id)
      persistViews(updated)
      return updated
    })
  }, [])

  const updateView = useCallback(
    (id: string, updates: Partial<Pick<SavedView, 'name' | 'filters'>>): void => {
      setViews((prev) => {
        const updated = prev.map((v) =>
          v.id === id
            ? {
                ...v,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : v
        )
        persistViews(updated)
        return updated
      })
    },
    []
  )

  const loadView = useCallback(
    (id: string): SavedView | undefined => {
      return views.find((v) => v.id === id)
    },
    [views]
  )

  return {
    views,
    saveView,
    deleteView,
    updateView,
    loadView,
    canSaveMore: views.length < MAX_VIEWS,
  }
}

export type { SavedView }
export default useSavedViews
