/**
 * ShareButton — share the current page via WhatsApp, X/Twitter, or clipboard.
 * Uses i18n for all labels. URL includes nuqs-synced filter state automatically.
 */

import { useState, useRef, useEffect } from 'react'
import { Share2, Check, MessageCircle, Twitter, Link } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ShareButtonProps {
  /** Short summary text for social share messages. Defaults to document.title */
  summary?: string
  /** Override URL to share. Defaults to window.location.href (includes filter params) */
  url?: string
  /** Override button label text */
  label?: string
  className?: string
}

export function ShareButton({ summary, url, label, className = '' }: ShareButtonProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const shareUrl = url ?? window.location.href
  const shareSummary = summary ?? document.title

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setOpen(false)
    const tid = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(tid)
  }

  function handleWhatsApp() {
    const message = t('share.template', { summary: shareSummary, url: shareUrl })
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  function handleX() {
    const text = t('share.template', { summary: shareSummary, url: shareUrl })
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-2.5 py-1.5 rounded border border-zinc-700 hover:border-zinc-500"
        aria-label={t('share.title')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400">{t('share.copied')}</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" />
            <span>{label ?? t('share.title')}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 py-1 text-xs"
        >
          <button
            role="menuitem"
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            {t('share.whatsapp')}
          </button>
          <button
            role="menuitem"
            onClick={handleX}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Twitter className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
            {t('share.postOnX')}
          </button>
          <div className="h-px bg-zinc-800 my-1" role="separator" />
          <button
            role="menuitem"
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Link className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
            {t('share.copyLink')}
          </button>
        </div>
      )}
    </div>
  )
}
