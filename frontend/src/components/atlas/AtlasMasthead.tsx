/**
 * AtlasMasthead — compressed 56px editorial strip for /atlas (M-OBS Phase 1).
 *
 * Replaces the ~250px FOLIO·IX hero block in Atlas.tsx (the "An Atlas of nine
 * trillion pesos in federal procurement." preamble) with a single tight strip:
 * kicker + Playfair italic headline on the left, `(i)` button on the right
 * that opens a popover containing the full editorial lede.
 *
 * Design spec: designs/M-OBS-spec.md · Replacement 1.
 */

import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'

interface AtlasMastheadProps {
  lang: 'en' | 'es'
}

export function AtlasMasthead({ lang }: AtlasMastheadProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click / Esc
  useEffect(() => {
    if (!infoOpen) return
    function onDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setInfoOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setInfoOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [infoOpen])

  const kicker = lang === 'en'
    ? 'FOLIO·IX · ATLAS OF FEDERAL CONTRACTING'
    : 'FOLIO·IX · ATLAS DE CONTRATACIÓN FEDERAL'

  const headline = lang === 'en'
    ? 'Nine trillion pesos. 3.06M contracts. One map.'
    : 'Nueve billones de pesos. 3.06M de contratos. Un mapa.'

  return (
    <header
      className="relative h-14 px-4 py-2 flex items-center justify-between gap-3"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="min-w-0 flex flex-col justify-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted leading-tight truncate">
          {kicker}
        </div>
        <h1
          className="hidden md:block font-playfair italic text-[22px] leading-tight truncate"
          style={{
            fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
            color: 'var(--color-text-primary)',
            fontWeight: 500,
          }}
        >
          {headline}
        </h1>
      </div>

      <div className="relative flex-shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="inline-flex items-center justify-center h-7 w-7 rounded-sm hover:bg-background-elevated/60 transition-colors"
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          aria-label={lang === 'en' ? 'About this atlas' : 'Acerca de este atlas'}
          aria-expanded={infoOpen}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>

        {infoOpen && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={lang === 'en' ? 'About this atlas' : 'Acerca de este atlas'}
            className="absolute top-[calc(100%+6px)] right-0 z-30 rounded-sm shadow-lg"
            style={{
              width: 360,
              maxWidth: '92vw',
              background: 'var(--color-background-card)',
              border: '1px solid var(--color-border)',
              padding: '14px 16px',
            }}
          >
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-6 w-6 rounded-sm hover:bg-background-elevated/60"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div
              className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {lang === 'en' ? 'ABOUT THIS ATLAS' : 'ACERCA DE ESTE ATLAS'}
            </div>
            <p
              className="text-[12.5px]"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.005em',
              }}
            >
              {lang === 'en' ? (
                <>Pick a <em style={{ color: 'var(--color-text-primary)' }}>story</em> to let the data guide the narration, or choose a <em style={{ color: 'var(--color-text-primary)' }}>lens</em> and drag the year to watch the procurement universe evolve from 2008 to 2025.</>
              ) : (
                <>Elige una <em style={{ color: 'var(--color-text-primary)' }}>historia</em> y deja que los datos guíen el relato, o selecciona una <em style={{ color: 'var(--color-text-primary)' }}>lente</em> y arrastra el año para ver el universo de contratación evolucionar de 2008 a 2025.</>
              )}
            </p>
          </div>
        )}
      </div>
    </header>
  )
}
