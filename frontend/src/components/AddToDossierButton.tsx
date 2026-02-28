/**
 * AddToDossierButton
 * Adds a vendor or institution to an existing dossier (or creates a new one).
 * Shows a popover with a list of dossiers; calls dossierApi.addItem on selection.
 */

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Folder, Plus, Loader2, CheckCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dossierApi, type DossierSummary } from '@/api/client'
import { DossierCreateDialog } from '@/components/DossierCreateDialog'

// Re-export DossierSummary so callers don't need a separate import
export type { DossierSummary }

interface AddToDossierButtonProps {
  entityType: 'vendor' | 'institution'
  entityId: number
  entityName: string
  className?: string
}

export function AddToDossierButton({
  entityType,
  entityId,
  entityName,
  className,
}: AddToDossierButtonProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState<number | null>(null) // dossier id just added to
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch dossier list on demand
  const { data: dossiers, isLoading } = useQuery({
    queryKey: ['dossiers', 'list'],
    queryFn: () => dossierApi.list(),
    enabled: open,
    staleTime: 30 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: ({ dossierId }: { dossierId: number }) =>
      dossierApi.addItem(dossierId, {
        item_type: entityType,
        item_id: entityId,
        item_name: entityName,
      }),
    onSuccess: (_data, { dossierId }) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      setSuccess(dossierId)
      setTimeout(() => {
        setSuccess(null)
        setOpen(false)
      }, 1500)
    },
  })

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const activeDossiers = (dossiers ?? []).filter((d) => d.status === 'active')

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className={className}
        aria-label="Add to Dossier"
        aria-expanded={open}
      >
        <FolderPlus className="h-4 w-4 mr-1.5" />
        Add to Dossier
        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] rounded-lg border border-border/60 bg-background-card shadow-xl"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Add to Dossier
            </p>
          </div>

          <div className="max-h-[200px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </div>
            ) : activeDossiers.length === 0 ? (
              <p className="text-xs text-text-muted px-3 py-3 text-center">
                No active dossiers yet
              </p>
            ) : (
              activeDossiers.map((dossier: DossierSummary) => {
                const isThisSuccess = success === dossier.id
                const isPending = addMutation.isPending && addMutation.variables?.dossierId === dossier.id
                return (
                  <button
                    key={dossier.id}
                    role="menuitem"
                    disabled={isPending || isThisSuccess}
                    onClick={() => addMutation.mutate({ dossierId: dossier.id })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-background-elevated/60 transition-colors disabled:opacity-60"
                  >
                    {isThisSuccess ? (
                      <CheckCircle className="h-3.5 w-3.5 text-risk-low shrink-0" />
                    ) : isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                    ) : (
                      <Folder
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: dossier.color }}
                      />
                    )}
                    <span className="truncate text-text-secondary">
                      {dossier.name}
                    </span>
                    <span className="ml-auto text-[10px] text-text-muted shrink-0">
                      {dossier.item_count}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-border/40 py-1">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setCreateDialogOpen(true)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-accent hover:bg-accent/5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Dossier...
            </button>
          </div>
        </div>
      )}

      <DossierCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        loading={createLoading}
        onSubmit={async (formData) => {
          setCreateLoading(true)
          try {
            const newDossier = await dossierApi.create(formData)
            queryClient.invalidateQueries({ queryKey: ['dossiers'] })
            // Immediately add the entity to the freshly created dossier
            addMutation.mutate({ dossierId: newDossier.id })
            setCreateDialogOpen(false)
          } finally {
            setCreateLoading(false)
          }
        }}
      />
    </div>
  )
}
