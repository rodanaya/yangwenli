import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'

export function AppBanner() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('rubli_banner_v20') === 'true'
  )

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('rubli_banner_v20', 'true')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b border-accent/20 animate-in slide-in-from-top-1 duration-300">
      <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
      <p className="flex-1 text-xs text-accent font-medium">
        <span className="font-bold">RUBLI 2.0 —</span> Rediseño editorial completo · Modelo de riesgo v6.2 · 3.1M contratos analizados.
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-accent/10 text-accent/60 hover:text-accent transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
