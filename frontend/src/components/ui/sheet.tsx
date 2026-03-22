/**
 * BottomSheet — slide-up overlay for mobile (< md breakpoint).
 * Triggered when a network node is selected on small screens.
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  'aria-label'?: string
}

export function BottomSheet({ open, onClose, children, className, 'aria-label': ariaLabel }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Trap focus inside the sheet when open
  useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length) focusable[0].focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto',
          'bg-background rounded-t-2xl border-t border-border shadow-2xl',
          'transition-transform duration-300 ease-out md:hidden',
          open ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>

        {children}
      </div>
    </>
  )
}
