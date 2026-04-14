/**
 * AnnotationPin — sticky note icon that users click to add private notes
 * to any contract or vendor. Notes persisted to localStorage.
 * Route to /annotations page lists all saved notes.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Dialog from '@radix-ui/react-dialog'
import { StickyNote, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// Storage helpers
// ============================================================================

const STORAGE_KEY = 'rubli_annotations'
const MAX_CHARS = 500

export type AnnotationEntityType = 'contract' | 'vendor'

function storageKey(entityType: AnnotationEntityType, entityId: number): string {
  return `${entityType}_${entityId}`
}

export function getAnnotations(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getAnnotation(entityType: AnnotationEntityType, entityId: number): string {
  return getAnnotations()[storageKey(entityType, entityId)] ?? ''
}

function saveAnnotation(entityType: AnnotationEntityType, entityId: number, text: string): void {
  const all = getAnnotations()
  const key = storageKey(entityType, entityId)
  if (text.trim()) {
    all[key] = text.trim()
  } else {
    delete all[key]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// ============================================================================
// Component
// ============================================================================

interface AnnotationPinProps {
  entityType: AnnotationEntityType
  entityId: number
  entityName?: string
  className?: string
}

export function AnnotationPin({ entityType, entityId, entityName, className }: AnnotationPinProps) {
  const { t } = useTranslation('workspace')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  // Load current annotation when dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setText(getAnnotation(entityType, entityId))
    }
    setOpen(next)
  }

  const existing = getAnnotation(entityType, entityId)
  const hasAnnotation = existing.length > 0

  const handleSave = () => {
    saveAnnotation(entityType, entityId, text)
    setOpen(false)
  }

  const handleDelete = () => {
    saveAnnotation(entityType, entityId, '')
    setText('')
    setOpen(false)
  }

  const charsLeft = MAX_CHARS - text.length
  const overLimit = charsLeft < 0

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className={`inline-flex items-center justify-center rounded transition-colors hover:bg-background-elevated focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${className ?? 'h-6 w-6'}`}
          aria-label={hasAnnotation ? t('annotationPin.editAria', { name: entityName ?? entityType }) : t('annotationPin.addAria', { name: entityName ?? entityType })}
          title={hasAnnotation ? t('annotationPin.editHover') : t('annotationPin.addHover')}
        >
          <StickyNote
            className="h-3.5 w-3.5"
            style={{ color: hasAnnotation ? '#fbbf24' : '#64748b' }}
            aria-hidden="true"
          />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-lg border border-border bg-background-card p-5 shadow-2xl focus:outline-none"
          aria-describedby="annotation-dialog-desc"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <Dialog.Title className="text-sm font-semibold text-text-primary">
                {hasAnnotation && text === existing ? t('annotationPin.editTitle') : t('annotationPin.addTitle')}
              </Dialog.Title>
              {entityName && (
                <p id="annotation-dialog-desc" className="text-xs text-text-muted mt-0.5 truncate max-w-[260px]">
                  {entityName}
                </p>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('annotationPin.placeholder')}
            rows={4}
            className="w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Annotation text"
            maxLength={MAX_CHARS + 50} // allow slight over so user sees the warning
          />

          {/* Char count */}
          <p className={`text-right text-[10px] mt-1 ${overLimit ? 'text-red-400' : 'text-text-muted/50'}`}>
            {overLimit ? t('annotationPin.overLimit', { count: Math.abs(charsLeft) }) : t('annotationPin.charsLeft', { count: charsLeft })}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            {hasAnnotation ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                aria-label="Delete annotation"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('annotationPin.delete')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  {t('annotationPin.cancel')}
                </Button>
              </Dialog.Close>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={overLimit || text.trim() === existing}
                aria-label={t('annotationPin.save')}
              >
                {t('annotationPin.save')}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
