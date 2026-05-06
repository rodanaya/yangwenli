/**
 * useSavedInvestigations — reads saved investigations from localStorage,
 * auto-refreshes when the storage event fires (e.g. P4 saves a new entry).
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § P5
 * Build: atlas-C-P5
 *
 * Entry shape written by AtlasRightPanel.tsx (P4):
 *   { id, name, lens, code, vendor_ids, created_at }
 *
 * No React import needed in the hook file itself — it uses standard React
 * hooks via the caller's React context. We do import useState/useEffect here
 * because this is a React hook module (.ts with hook naming convention).
 */

import { useState, useEffect, useCallback } from 'react'

export const INVESTIGATIONS_KEY = 'rubli_atlas_investigations_v1'

export interface SavedInvestigation {
  id: string
  name: string
  lens: string        // ConstellationMode value written by P4
  code: string        // cluster code (e.g. "P5", "salud")
  vendor_ids: string[]
  created_at: string  // ISO 8601
}

function readFromStorage(): SavedInvestigation[] {
  try {
    const raw = localStorage.getItem(INVESTIGATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SavedInvestigation[]
  } catch {
    return []
  }
}

export interface UseSavedInvestigationsResult {
  investigations: SavedInvestigation[]
  deleteInvestigation: (id: string) => void
  refresh: () => void
}

/**
 * Hook that reads saved investigations from localStorage and subscribes to
 * the 'storage' event so cross-tab saves (and P4 in-tab saves that dispatch
 * a custom event) refresh the list automatically.
 */
export function useSavedInvestigations(): UseSavedInvestigationsResult {
  const [investigations, setInvestigations] = useState<SavedInvestigation[]>(() =>
    readFromStorage(),
  )

  const refresh = useCallback(() => {
    setInvestigations(readFromStorage())
  }, [])

  useEffect(() => {
    // Standard cross-tab storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === INVESTIGATIONS_KEY || e.key === null) {
        refresh()
      }
    }
    window.addEventListener('storage', handleStorage)

    // Custom event dispatched by the same-tab save action in AtlasRightPanel
    window.addEventListener('atlas-investigation-saved', refresh)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('atlas-investigation-saved', refresh)
    }
  }, [refresh])

  const deleteInvestigation = useCallback((id: string) => {
    setInvestigations((prev) => {
      const next = prev.filter((inv) => inv.id !== id)
      try {
        localStorage.setItem(INVESTIGATIONS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  return { investigations, deleteInvestigation, refresh }
}

/**
 * Format a saved investigation timestamp as a relative time string.
 * Returns bilingual strings based on lang param.
 */
export function formatRelativeTime(isoString: string, lang: 'en' | 'es'): string {
  try {
    const then = new Date(isoString).getTime()
    const now = Date.now()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60_000)
    const diffH = Math.floor(diffMs / 3_600_000)
    const diffD = Math.floor(diffMs / 86_400_000)

    if (diffMin < 1) return lang === 'en' ? 'just now' : 'ahora mismo'
    if (diffMin < 60) {
      return lang === 'en' ? `${diffMin}m ago` : `hace ${diffMin}m`
    }
    if (diffH < 24) {
      return lang === 'en' ? `${diffH}h ago` : `hace ${diffH}h`
    }
    if (diffD < 30) {
      return lang === 'en' ? `${diffD}d ago` : `hace ${diffD}d`
    }
    // Fallback to date string
    return new Date(isoString).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
