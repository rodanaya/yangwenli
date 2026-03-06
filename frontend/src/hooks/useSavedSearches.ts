/**
 * Generic localStorage hook for saved searches/filters.
 * Used by CommandPalette (query strings) and Contracts page (URL filter params).
 */

import { useState, useCallback, useEffect } from 'react'

export interface SavedSearch {
  label: string
  value: string
  savedAt: string
}

function loadItems(key: string): SavedSearch[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SavedSearch[]) : []
  } catch {
    return []
  }
}

function persistItems(key: string, items: SavedSearch[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (e) {
    console.error('useSavedSearches: failed to persist', e)
  }
}

interface UseSavedSearchesReturn {
  items: SavedSearch[]
  save: (label: string, value: string) => void
  remove: (index: number) => void
  clear: () => void
}

/**
 * Generic hook for saving search queries / filter strings to localStorage.
 *
 * @param storageKey  localStorage key (e.g. 'rubli_saved_searches')
 * @param maxItems    Maximum items to keep; oldest are removed first (default 8)
 */
export function useSavedSearches(
  storageKey: string,
  maxItems = 8
): UseSavedSearchesReturn {
  const [items, setItems] = useState<SavedSearch[]>(() => loadItems(storageKey))

  // Sync if another tab updates localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setItems(loadItems(storageKey))
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [storageKey])

  const save = useCallback(
    (label: string, value: string) => {
      setItems((prev) => {
        // Deduplicate by value — update label if already saved
        const filtered = prev.filter((it) => it.value !== value)
        const updated = [
          { label: label.trim() || value, value, savedAt: new Date().toISOString() },
          ...filtered,
        ].slice(0, maxItems)
        persistItems(storageKey, updated)
        return updated
      })
    },
    [storageKey, maxItems]
  )

  const remove = useCallback(
    (index: number) => {
      setItems((prev) => {
        const updated = prev.filter((_, i) => i !== index)
        persistItems(storageKey, updated)
        return updated
      })
    },
    [storageKey]
  )

  const clear = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [storageKey])

  return { items, save, remove, clear }
}
