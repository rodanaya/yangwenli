/**
 * DossierAddItemDialog — #91 Quick Add from vendor search
 * Lets the user search for a vendor by name and add it to a specific dossier.
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dossierApi, vendorApi } from '@/api/client'
import type { VendorListItem } from '@/api/types'
import { Search, Users, Loader2, CheckCircle } from 'lucide-react'

interface DossierAddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossierId: number
  dossierName: string
}

export function DossierAddItemDialog({
  open,
  onOpenChange,
  dossierId,
  dossierName,
}: DossierAddItemDialogProps) {
  const { t, i18n } = useTranslation('workspace')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VendorListItem[]>([])
  const [searching, setSearching] = useState(false)
  const [addedId, setAddedId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced vendor search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await vendorApi.search(q, 8)
        setResults(res.data ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSearching(false)
      setAddedId(null)
    }
  }, [open])

  const addMutation = useMutation({
    mutationFn: (vendor: VendorListItem) =>
      dossierApi.addItem(dossierId, {
        item_type: 'vendor',
        item_id: vendor.id,
        item_name: vendor.name,
      }),
    onSuccess: (_data, vendor) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      queryClient.invalidateQueries({ queryKey: ['dossier-items', dossierId] })
      setAddedId(vendor.id)
      // Auto-close after brief success flash
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
    },
    onError: (err) => {
      console.error('[DossierAddItemDialog] Failed to add vendor:', err)
    },
  })

  const hasResults = results.length > 0
  const isIdle = query.trim().length < 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {lang === 'en' ? 'Add vendor to dossier' : 'Agregar proveedor a dossier'}
          </DialogTitle>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {dossierName}
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <Input
              autoFocus
              placeholder={lang === 'en' ? 'Search vendors...' : 'Buscar proveedores...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 text-sm"
              aria-label={lang === 'en' ? 'Search vendors' : 'Buscar proveedores'}
            />
          </div>

          {/* Results list */}
          <div className="min-h-[80px] max-h-[220px] overflow-y-auto space-y-1">
            {isIdle ? (
              <p className="text-xs text-text-muted text-center py-6">
                {lang === 'en' ? 'Type at least 2 characters to search' : 'Escribe al menos 2 caracteres para buscar'}
              </p>
            ) : searching ? (
              <div className="space-y-1.5 px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : !hasResults ? (
              <p className="text-xs text-text-muted text-center py-6">
                {t('search.noResults', { query })}
              </p>
            ) : (
              results.map((vendor) => {
                const isAdded = addedId === vendor.id
                const isPending =
                  addMutation.isPending &&
                  (addMutation.variables as VendorListItem | undefined)?.id === vendor.id

                return (
                  <button
                    key={vendor.id}
                    disabled={isPending || isAdded || addMutation.isPending}
                    onClick={() => addMutation.mutate(vendor)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm hover:bg-background-elevated/60 transition-colors disabled:opacity-60 border border-transparent hover:border-border/40"
                  >
                    {isAdded ? (
                      <CheckCircle className="h-4 w-4 text-risk-low shrink-0" />
                    ) : isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0" />
                    ) : (
                      <Users className="h-4 w-4 text-text-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate font-medium text-text-primary">
                      {vendor.name}
                    </span>
                    {vendor.avg_risk_score != null && (
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        {(vendor.avg_risk_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
