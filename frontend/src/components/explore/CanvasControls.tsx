/**
 * CanvasControls — overlay controls floated on top of the ExploreCanvas.
 *
 * 2026-06-12 STEP-0 cull (El Mapa Day 5): YearScrubber, LensToggle,
 * RiskFloorToggle and MapLegend deleted — all dispatched into state
 * fields (`year`, `riskFloor`) that no query or render ever consumed,
 * and the scrubber's 28px strip occluded every panel's footer exits.
 * ShareViewButton is the sole survivor; the Z-panel jumpline bars wire it.
 */
import { useState } from 'react'

/**
 * ShareViewButton — copies the current /explore URL (with focus stack
 * encoded by useExploreUrlSync) to the clipboard.
 */
export function ShareViewButton({ lang }: { lang: 'en' | 'es' }) {
  const [copied, setCopied] = useState(false)
  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Older browsers / non-secure contexts — fall back to selection prompt
      window.prompt(lang === 'en' ? 'Copy this URL:' : 'Copia esta URL:', window.location.href)
    }
  }
  return (
    <button
      type="button"
      onClick={onShare}
      className="flex items-center gap-1.5 transition-colors"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: 'var(--font-family-mono, monospace)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
      aria-label={lang === 'en' ? 'Copy view URL to clipboard' : 'Copiar URL al portapapeles'}
    >
      {copied
        ? (lang === 'en' ? '✓ Copied' : '✓ Copiado')
        : (lang === 'en' ? '⤴ Copy link' : '⤴ Copiar enlace')}
    </button>
  )
}
