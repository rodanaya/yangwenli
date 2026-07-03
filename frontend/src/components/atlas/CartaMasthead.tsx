/**
 * CartaMasthead — folio masthead for /atlas «La Carta del Cielo» (§7 Sky Survey).
 *
 * Reskins AtlasMasthead's compressed strip with the survey's thesis headline
 * plus one COMPUTED finding (argmax high_risk_rate across the live patterns
 * cluster-stats query, same query key as the engine so React Query dedupes —
 * zero extra network requests).
 */

import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { atlasApi } from '@/api/client'
import { formatNumber } from '@/lib/utils'

interface CartaMastheadProps {
  lang: 'en' | 'es'
}

export function CartaMasthead({ lang }: CartaMastheadProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { data } = useQuery({
    queryKey: ['atlas-cluster-stats', 'patterns'],
    queryFn: () => atlasApi.getClusterStats('patterns'),
    staleTime: 10 * 60 * 1000,
  })

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

  const clusters = data?.clusters ?? []
  const top = clusters.length
    ? clusters.reduce((best, c) => (c.high_risk_rate > best.high_risk_rate ? c : best), clusters[0])
    : null

  return (
    <header
      className="relative h-14 md:h-auto px-4 py-2 flex items-center justify-between gap-3"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="min-w-0 flex flex-col justify-center">
        <div className="font-mono text-[12px] md:text-[13px] uppercase tracking-[0.16em] text-text-muted leading-tight truncate">
          <span style={{ color: 'var(--color-accent)', fontStyle: 'normal' }}>FOLIO·IX</span>
          {lang === 'en'
            ? ' · THE SKY SURVEY · COMPRANET 2002–2025 · v0.8.5'
            : ' · LA CARTA DEL CIELO · COMPRANET 2002–2025 · v0.8.5'}
        </div>
        <h1
          className="hidden md:block text-[22px] leading-tight truncate"
          style={{
            fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
            color: 'var(--color-text-primary)',
            fontWeight: 500,
          }}
        >
          {lang === 'en' ? (
            <>What burns hottest in this sky <span style={{ color: 'var(--color-accent)', fontStyle: 'normal' }}>is small</span>.</>
          ) : (
            <>Lo que más arde en este cielo <span style={{ color: 'var(--color-accent)', fontStyle: 'normal' }}>es pequeño</span>.</>
          )}
        </h1>
        {top && (
          <div className="hidden md:block font-mono text-[12px] text-text-muted leading-tight truncate">
            {lang === 'en' ? (
              <>highest body on the patterns plate: {top.label_en} — {Math.round(top.high_risk_rate * 100)}% of its {formatNumber(top.vendors)} vendors in the high or critical band · risk indicator, not a probability</>
            ) : (
              <>cuerpo más alto de la lámina de patrones: {top.label_es} — {Math.round(top.high_risk_rate * 100)}% de sus {formatNumber(top.vendors)} proveedores en banda alta o crítica · indicador de riesgo, no probabilidad</>
            )}
          </div>
        )}
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
          aria-label={lang === 'en' ? 'How to read the survey' : 'Cómo leer la carta'}
          aria-expanded={infoOpen}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>

        {infoOpen && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={lang === 'en' ? 'How to read the survey' : 'Cómo leer la carta'}
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
              className="font-mono text-[13px] uppercase tracking-[0.16em] mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {lang === 'en' ? 'HOW TO READ THE SURVEY' : 'CÓMO LEER LA CARTA'}
            </div>
            <div
              className="text-[12.5px] flex flex-col gap-2"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.005em',
              }}
            >
              <p>
                {lang === 'en' ? (
                  <>Four plates of one sky: patterns, sectors, categories and terms. Each body is a vendor cohort — right = more vendors, up = higher high-risk rate, area = priority files (T1).</>
                ) : (
                  <>Cuatro láminas de un mismo cielo: patrones, sectores, categorías y sexenios. Cada cuerpo es una cohorte de proveedores — derecha = más proveedores, arriba = mayor tasa de riesgo alto, área = expedientes prioritarios (T1).</>
                )}
              </p>
              <p>
                {lang === 'en' ? (
                  <>Pick a story and let the data guide the narration, or fly into any body: the camera drops to its vendors and each mark opens a file.</>
                ) : (
                  <>Elija una historia y deje que los datos guíen el relato, o entre a cualquier cuerpo: la cámara baja a sus proveedores y cada punto abre un expediente.</>
                )}
              </p>
              <p>
                {lang === 'en' ? (
                  <>Like the photographic sky charts the Tacubaya Observatory drew up plate by plate, this survey is an index of the sky — not the sky. See the surveyor's note at the foot.</>
                ) : (
                  <>Como las cartas fotográficas del cielo que el Observatorio de Tacubaya levantó lámina por lámina, esta carta es un índice del cielo — no el cielo. Véase la «Fe de carta» al pie.</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
