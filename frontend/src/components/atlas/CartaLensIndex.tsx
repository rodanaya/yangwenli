/**
 * CartaLensIndex — the atlas's VISIBLE PLATE INDEX (RUBLI §7 "La Carta del
 * Cielo"). Three folio-numbered tabs (IX·a–IX·c), each stamped with data
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
import { ADMINISTRATIONS, ADMIN_DISPLAY_ACCENTED, PERIOD_API_KEY } from '@/lib/administrations'

interface CartaLensIndexProps {
  lang: 'en' | 'es'
  mode: ConstellationMode
  setMode: (m: ConstellationMode) => void
  onStoriesOpen: () => void
  /** Global sexenio time filter (Sep 2026) — orthogonal to the lens tabs
   *  above; never a cohort lens itself. API vocabulary (pena_nieto, not
   *  epn) — see PERIOD_API_KEY. */
  period: string | null
  setPeriod: (p: string | null) => void
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
]

// All three plates compute live from the register (categories via the
// category_stats precompute served by /atlas/cluster-stats since backend 02).
const LIVE = new Set<ConstellationMode>(['patterns', 'sectors', 'categories'])

export function CartaLensIndex({ lang, mode, setMode, onStoriesOpen, period, setPeriod }: CartaLensIndexProps) {
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
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
    <div className="h-10 px-3 flex items-center justify-between gap-2">
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
                ? 'No live data for this lens yet — nothing is drawn'
                : 'Sin datos en vivo para esta lente todavía — no se dibuja nada')

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
                  : (lang === 'en' ? ' · no data' : ' · sin datos')}
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

      {/* ── Sexenio row: global time filter, orthogonal to the lens tabs
          above (never a cohort lens). Same visual language, one notch
          quieter (h-8, top border instead of accent tab underline color
          on the container). ── */}
      <div
        role="tablist"
        aria-label={lang === 'en' ? 'Administration' : 'Sexenio'}
        className="h-8 px-3 flex items-center gap-4 overflow-x-auto"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={period === null}
          onClick={() => setPeriod(null)}
          className="font-mono text-[13px] uppercase tracking-[0.08em] whitespace-nowrap py-1.5 transition-colors"
          style={{
            color: period === null ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            fontWeight: period === null ? 700 : 400,
            borderBottom: period === null ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}
        >
          {lang === 'en' ? 'ALL' : 'TODO'}
        </button>
        {ADMINISTRATIONS.map((a) => {
          const apiKey = PERIOD_API_KEY[a.key]
          const active = period === apiKey
          return (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(apiKey)}
              className="font-mono text-[13px] uppercase tracking-[0.08em] whitespace-nowrap py-1.5 transition-colors inline-flex items-baseline gap-1"
              style={{
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: active ? 700 : 400,
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {ADMIN_DISPLAY_ACCENTED[a.key]}
              <span className="font-mono text-[8px] normal-case" style={{ color: 'var(--color-text-muted)' }}>
                {a.yearStart}–{String(a.yearEnd).slice(-2)}
              </span>
            </button>
          )
        })}
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
