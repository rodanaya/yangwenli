/**
 * CartaLensIndex — the atlas's VISIBLE PLATE INDEX (RUBLI §7 "La Carta del
 * Cielo"). Four folio-numbered tabs (IX·a–IX·d), each stamped with data
 * PROVENANCE (live vs archival). An atlas that hides its plate index behind
 * a dropdown is just a PDF — this component makes the survey's structure
 * visible at all times.
 *
 * Only mounted in the default "faithful" view. The legacy `?legacy=1`
 * toolbar (AtlasToolbar.tsx) keeps its own controls; this component carries
 * NO temporal controls (no year scrubber, no autoplay, no risk floor).
 */

import { useEffect, useRef, useState } from 'react'
import { BookOpen, HelpCircle } from 'lucide-react'
import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'

interface CartaLensIndexProps {
  lang: 'en' | 'es'
  mode: ConstellationMode
  setMode: (m: ConstellationMode) => void
  onStoriesOpen: () => void
}

const PLATES: Array<{
  id: ConstellationMode
  folio: string
  en: string
  es: string
}> = [
  { id: 'patterns',   folio: 'IX·a', en: 'PATTERNS',   es: 'PATRONES'    },
  { id: 'sectors',    folio: 'IX·b', en: 'SECTORS',    es: 'SECTORES'    },
  { id: 'categories', folio: 'IX·c', en: 'CATEGORIES', es: 'CATEGORÍAS'  },
  { id: 'sexenios',   folio: 'IX·d', en: 'TERMS',      es: 'SEXENIOS'    },
]

// Structural fact: patterns + sectors compute live from the register;
// categories + sexenios are curated archival aggregates.
const LIVE = new Set<ConstellationMode>(['patterns', 'sectors'])

export function CartaLensIndex({ lang, mode, setMode, onStoriesOpen }: CartaLensIndexProps) {
  const [keymapOpen, setKeymapOpen] = useState(false)
  const keymapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!keymapOpen) return
    function onDown(e: MouseEvent) {
      if (keymapRef.current && !keymapRef.current.contains(e.target as Node)) {
        setKeymapOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setKeymapOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [keymapOpen])

  return (
    <div
      className="h-10 px-3 flex items-center justify-between gap-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {/* ── Left: plate index (tab rail) ── */}
      <div
        role="tablist"
        aria-label={lang === 'en' ? 'Atlas plate index' : 'Índice de láminas del atlas'}
        className="flex items-center gap-4 overflow-x-auto min-w-0"
      >
        {PLATES.map((p) => {
          const active = mode === p.id
          const live = LIVE.has(p.id)
          const tooltip = live
            ? (lang === 'en'
                ? 'Live aggregates from the register'
                : 'Agregados en vivo del padrón')
            : (lang === 'en'
                ? 'Archival plate: curated aggregates — live computation pending'
                : 'Lámina de archivo: agregados curados — cómputo en vivo pendiente')

          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(p.id)}
              title={tooltip}
              className="flex items-center gap-1.5 py-2 whitespace-nowrap transition-colors hover:bg-background-elevated/50"
              style={{
                borderBottom: active
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              <span
                className="font-mono text-[13px] tabular-nums"
                style={{
                  color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                {p.folio}
              </span>
              <span
                className="font-mono text-[13px] uppercase tracking-[0.08em]"
                style={{
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {lang === 'en' ? p.en : p.es}
              </span>
              <span
                className="font-mono text-[8px]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {live
                  ? (lang === 'en' ? ' · live' : ' · en vivo')
                  : (lang === 'en' ? ' · archive' : ' · archivo')}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Right: itineraries + keymap ── */}
      <div className="flex items-center gap-1 shrink-0">
        <ToolbarIconButton
          onClick={onStoriesOpen}
          ariaLabel={lang === 'en' ? 'Itineraries' : 'Itinerarios'}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </ToolbarIconButton>

        <div ref={keymapRef} className="relative">
          <ToolbarIconButton
            onClick={() => setKeymapOpen((v) => !v)}
            ariaLabel={lang === 'en' ? 'Keyboard shortcuts' : 'Atajos de teclado'}
            pressed={keymapOpen}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </ToolbarIconButton>
          {keymapOpen && <KeymapPopover lang={lang} />}
        </div>
      </div>
    </div>
  )
}

function ToolbarIconButton({
  onClick,
  ariaLabel,
  pressed,
  children,
}: {
  onClick: () => void
  ariaLabel: string
  pressed?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={ariaLabel}
      className="inline-flex items-center justify-center h-7 w-7 rounded-sm hover:bg-background-elevated/60 transition-colors"
      style={{
        color: pressed ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        background: pressed ? 'var(--color-background-elevated)' : 'transparent',
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </button>
  )
}

// Self-contained duplicate of AtlasToolbar's KeymapPopover — deliberately
// NOT imported, so this file has no dependency on the legacy toolbar.
function KeymapPopover({ lang }: { lang: 'en' | 'es' }) {
  const rows: Array<[string, { en: string; es: string }]> = [
    ['click cluster', { en: 'drill in',          es: 'entrar al cluster'   }],
    ['wheel',         { en: 'zoom',              es: 'zoom'                 }],
    ['drag',          { en: 'pan',               es: 'mover'                }],
    ['shift+drag',    { en: 'lasso select',      es: 'selección lasso'      }],
    ['+ / −',         { en: 'zoom in / out',     es: 'acercar / alejar'     }],
    ['0',             { en: 'reset zoom',        es: 'restablecer zoom'     }],
    ['arrows',        { en: 'pan',               es: 'mover'                }],
    ['H',             { en: 'home (galaxy)',     es: 'inicio (galaxia)'     }],
    ['esc',           { en: 'out one level',     es: 'salir un nivel'       }],
    ['enter',         { en: 'drill into focus',  es: 'entrar al foco'       }],
  ]
  return (
    <div
      role="dialog"
      aria-label={lang === 'en' ? 'Keyboard shortcuts' : 'Atajos de teclado'}
      className="absolute top-[calc(100%+4px)] right-0 z-30 rounded-sm shadow-md"
      style={{
        background: 'var(--color-background-card)',
        border: '1px solid var(--color-border)',
        padding: '10px 12px',
        width: 240,
      }}
    >
      <div
        className="font-mono text-[13px] uppercase tracking-[0.16em] mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {lang === 'en' ? 'KEYMAP' : 'ATAJOS'}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        {rows.map(([key, label]) => (
          <div key={key} className="contents">
            <dt
              className="font-mono tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
            >
              {key}
            </dt>
            <dd
              className="font-mono"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {lang === 'en' ? label.en : label.es}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
