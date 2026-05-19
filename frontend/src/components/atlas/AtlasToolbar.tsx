/**
 * AtlasToolbar — 36px chart toolbar for /atlas (M-OBS Phase 1).
 *
 * Replaces:
 *  - the 5-button row (VendorSearchBox + Stories + Share + Compare Years)
 *  - the RISK FLOOR chip row
 *
 * Left group:  lens dropdown · compact year stepper · risk-floor chips
 * Right group: ♦ stories · ▶ autoplay · ⇄ compare · ? keymap
 *
 * Design spec: designs/M-OBS-spec.md · Replacement 2.
 */

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Play,
  Pause,
  Columns,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'

type RiskFloor = 'all' | 'medium' | 'high' | 'critical'

interface AtlasToolbarProps {
  lang: 'en' | 'es'
  mode: ConstellationMode
  setMode: (m: ConstellationMode) => void
  yearIndex: number
  setYearIndex: (i: number) => void
  years: number[]
  riskFloor: RiskFloor
  setRiskFloor: (r: RiskFloor) => void
  onStoriesOpen: () => void
  isPlaying: boolean
  setIsPlaying: (b: boolean) => void
  compareMode: boolean
  setCompareMode: (b: boolean) => void
}

const LENS_OPTIONS: Array<{ id: ConstellationMode; en: string; es: string }> = [
  { id: 'patterns',   en: 'Patterns',   es: 'Patrones'   },
  { id: 'sectors',    en: 'Sectors',    es: 'Sectores'   },
  { id: 'categories', en: 'Categories', es: 'Categorías' },
  { id: 'sexenios',   en: 'Terms',      es: 'Sexenios'   },
]

const RISK_FLOORS: Array<{ id: RiskFloor; en: string; es: string }> = [
  { id: 'all',      en: 'all',      es: 'todos'   },
  { id: 'medium',   en: 'medium+',  es: 'medio+'  },
  { id: 'high',     en: 'high+',    es: 'alto+'   },
  { id: 'critical', en: 'critical', es: 'crítico' },
]

export function AtlasToolbar({
  lang,
  mode,
  setMode,
  yearIndex,
  setYearIndex,
  years,
  riskFloor,
  setRiskFloor,
  onStoriesOpen,
  isPlaying,
  setIsPlaying,
  compareMode,
  setCompareMode,
}: AtlasToolbarProps) {
  const [lensOpen, setLensOpen] = useState(false)
  const [keymapOpen, setKeymapOpen] = useState(false)
  const lensRef = useRef<HTMLDivElement>(null)
  const keymapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lensOpen && !keymapOpen) return
    function onDown(e: MouseEvent) {
      if (lensOpen && lensRef.current && !lensRef.current.contains(e.target as Node)) {
        setLensOpen(false)
      }
      if (keymapOpen && keymapRef.current && !keymapRef.current.contains(e.target as Node)) {
        setKeymapOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLensOpen(false)
        setKeymapOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [lensOpen, keymapOpen])

  const currentLens = LENS_OPTIONS.find((l) => l.id === mode) ?? LENS_OPTIONS[0]
  const currentYear = years[yearIndex] ?? years[years.length - 1]
  const minYear = 0
  const maxYear = years.length - 1

  return (
    <div
      className="h-9 px-3 flex items-center gap-2 flex-wrap"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {/* ── Left group ── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Lens dropdown */}
        <div ref={lensRef} className="relative">
          <button
            type="button"
            onClick={() => setLensOpen((v) => !v)}
            className="h-6 px-2 inline-flex items-center gap-1 rounded-sm font-mono text-[11px] uppercase tracking-[0.08em] hover:bg-background-elevated/60 transition-colors"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontWeight: 600,
            }}
            aria-haspopup="listbox"
            aria-expanded={lensOpen}
          >
            <span>{lang === 'en' ? currentLens.en : currentLens.es}</span>
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
          {lensOpen && (
            <div
              role="listbox"
              className="absolute top-[calc(100%+4px)] left-0 z-30 rounded-sm shadow-md"
              style={{
                background: 'var(--color-background-card)',
                border: '1px solid var(--color-border)',
                minWidth: 140,
              }}
            >
              {LENS_OPTIONS.map((l) => {
                const active = l.id === mode
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setMode(l.id)
                      setLensOpen(false)
                    }}
                    className="w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] hover:bg-background-elevated/60 transition-colors"
                    style={{
                      color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontWeight: active ? 700 : 400,
                      background: active ? 'var(--color-background-elevated)' : 'transparent',
                    }}
                  >
                    {lang === 'en' ? l.en : l.es}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Year stepper */}
        <div
          className="h-6 inline-flex items-center rounded-sm"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={() => setYearIndex(Math.max(minYear, yearIndex - 1))}
            disabled={yearIndex <= minYear}
            className="h-full w-6 inline-flex items-center justify-center hover:bg-background-elevated/60 disabled:opacity-40 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label={lang === 'en' ? 'Previous year' : 'Año anterior'}
          >
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          </button>
          <div
            className="font-mono text-[11px] tabular-nums px-2 text-center"
            style={{
              color: 'var(--color-text-primary)',
              fontWeight: 600,
              minWidth: 44,
            }}
          >
            {currentYear}
          </div>
          <button
            type="button"
            onClick={() => setYearIndex(Math.min(maxYear, yearIndex + 1))}
            disabled={yearIndex >= maxYear}
            className="h-full w-6 inline-flex items-center justify-center hover:bg-background-elevated/60 disabled:opacity-40 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label={lang === 'en' ? 'Next year' : 'Año siguiente'}
          >
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {/* Risk-floor chips */}
        <div
          role="group"
          aria-label={lang === 'en' ? 'Risk floor filter' : 'Filtro mínimo de riesgo'}
          className="inline-flex items-center rounded-sm overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {RISK_FLOORS.map((f) => {
            const active = riskFloor === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setRiskFloor(f.id)}
                aria-pressed={active}
                className="h-6 px-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  background: active ? 'var(--color-background-elevated)' : 'transparent',
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {lang === 'en' ? f.en : f.es}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right group (action icons) ── */}
      <div className="flex items-center gap-1 ml-auto">
        <ToolbarIconButton
          onClick={onStoriesOpen}
          ariaLabel={lang === 'en' ? 'Stories' : 'Historias'}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </ToolbarIconButton>

        <ToolbarIconButton
          onClick={() => setIsPlaying(!isPlaying)}
          ariaLabel={isPlaying
            ? (lang === 'en' ? 'Pause autoplay' : 'Pausar reproducción')
            : (lang === 'en' ? 'Autoplay years' : 'Reproducir años')}
          pressed={isPlaying}
        >
          {isPlaying
            ? <Pause className="h-4 w-4" aria-hidden="true" />
            : <Play className="h-4 w-4" aria-hidden="true" />}
        </ToolbarIconButton>

        <ToolbarIconButton
          onClick={() => setCompareMode(!compareMode)}
          ariaLabel={lang === 'en' ? 'Compare years' : 'Comparar años'}
          pressed={compareMode}
        >
          <Columns className="h-4 w-4" aria-hidden="true" />
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
        className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {lang === 'en' ? 'KEYMAP' : 'ATAJOS'}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
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
