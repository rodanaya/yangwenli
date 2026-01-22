/**
 * Toast Notification Component
 * Simple toast system without external dependencies
 */

import { memo, useEffect, useState, createContext, useContext, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { addToast } = context

  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message, duration: 4000 }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message, duration: 6000 }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message, duration: 5000 }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message, duration: 4000 }),
  }
}

const ToastContainer = memo(function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
})

const ToastItem = memo(function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    success: 'border-risk-low bg-risk-low/10 text-risk-low',
    error: 'border-risk-critical bg-risk-critical/10 text-risk-critical',
    warning: 'border-risk-medium bg-risk-medium/10 text-risk-medium',
    info: 'border-accent bg-accent/10 text-accent',
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-slide-up',
        'bg-background-card',
        colors[toast.type]
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-text-muted mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-background-elevated transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4 text-text-muted" />
      </button>
    </div>
  )
})

export default ToastProvider
