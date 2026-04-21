import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AppBanner() {
  const { t } = useTranslation('common')
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('rubli_banner_v21') === 'true'
  )

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('rubli_banner_v21', 'true')
    setDismissed(true)
  }

  return (
    <div className="relative flex items-center gap-2.5 px-5 py-1.5 bg-gradient-to-r from-accent/[0.08] via-accent/[0.04] to-transparent border-b border-accent/25 animate-in slide-in-from-top-1 duration-300">
      {/* Thin colored accent rule below the banner */}
      <span
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        aria-hidden="true"
      />
      <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
      <p className="flex-1 text-[11px] text-accent font-medium tracking-tight leading-tight min-w-0">
        <span className="font-bold font-mono uppercase tracking-[0.08em] mr-1.5">RUBLI&nbsp;v2.1</span>
        <span className="text-accent/70 mx-1.5 hidden sm:inline">·</span>
        <span className="hidden sm:inline">{t('banner')}</span>
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded border border-accent/30 hover:bg-accent/15 text-accent/80 hover:text-accent hover:border-accent/60 transition-colors"
        aria-label={t('dismissBanner')}
        title={t('dismissBanner')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
