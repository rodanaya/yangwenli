/**
 * AtlasLeftRail — 240px command rail for the investigator console.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 3, § 2.5
 * Build: atlas-C-P1 (structure), atlas-C-P2 (breadcrumb-back chip)
 *
 * Sections (top → bottom):
 *   Header: OBSERVATORIO + subline + reset button
 *   Lens list: 4 vertical radio-style buttons (Bloomberg grammar)
 *   Year scrubber: simplified horizontal slider + autoplay
 *   Risk floor: segmented control
 *   Vendor search: typeahead input (functionality bridged from Atlas.tsx)
 *   Saved investigations: ATLAS_STORIES + "save current view" stub
 *
 * All state reads from AtlasStateContext; mutations fire AtlasDispatch.
 * The year scrubber also calls the bridged callbacks (onYearChange,
 * onPlayChange) so the existing Atlas.tsx auto-play loop keeps running
 * during P1's transitional dual-write period.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, Pause, Search, BookOpen, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ATLAS_STORIES } from '@/lib/atlas-stories'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'
import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'

// ─────────────────────────────────────────────────────────────────────────────
// Year snapshot labels (subset for annotations — full array bridged from Atlas)
// ─────────────────────────────────────────────────────────────────────────────
interface YearHighlight {
  year: number
  highlight?: { en: string; es: string }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lens configuration
// ─────────────────────────────────────────────────────────────────────────────
const LENSES: Array<{
  id: ConstellationMode
  en: string
  es: string
  count: string
}> = [
  { id: 'patterns',   en: 'Patterns',   es: 'Patrones',   count: '7' },
  { id: 'sectors',    en: 'Sectors',    es: 'Sectores',   count: '12' },
  { id: 'categories', en: 'Categories', es: 'Categorías', count: '32' },
  { id: 'sexenios',   en: 'Terms',      es: 'Sexenios',   count: '6' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Risk floor configuration
// ─────────────────────────────────────────────────────────────────────────────
const RISK_FLOORS: Array<{
  id: 'all' | 'medium' | 'high' | 'critical'
  en: string
  es: string
  color: string
}> = [
  { id: 'all',      en: 'All',    es: 'Todo',  color: 'var(--color-text-muted)' },
  { id: 'medium',   en: 'Med+',   es: 'Med+',  color: '#a06820' },
  { id: 'high',     en: 'High+',  es: 'Alto+', color: '#f59e0b' },
  { id: 'critical', en: 'Crit',   es: 'Crít',  color: '#dc2626' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Props — bridge to existing Atlas.tsx during P1 transitional period
// ─────────────────────────────────────────────────────────────────────────────
export interface AtlasLeftRailProps {
  lang: 'en' | 'es'
  // Year bridge — until P2 migrates year state fully into context
  yearSnapshots: YearHighlight[]
  isPlaying: boolean
  onYearChange: (index: number) => void
  onPlayChange: (playing: boolean) => void
  // Vendor search bridge — proxied into Atlas.tsx's VendorSearchBox logic
  onVendorSearchPick: (query: string) => void
  // Story bridge — opens ATLAS_STORIES narratives in Atlas.tsx
  onStoryOpen: (storyId: string) => void
  // Reset all filters
  onReset: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Section divider
// ─────────────────────────────────────────────────────────────────────────────
function RailSection({ label }: { label: string }) {
  return (
    <div
      className="px-4 pt-4 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.14em] flex items-center gap-2"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      {label}
      <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AtlasLeftRail
// ─────────────────────────────────────────────────────────────────────────────
export function AtlasLeftRail({
  lang,
  yearSnapshots,
  isPlaying,
  onYearChange,
  onPlayChange,
  onVendorSearchPick,
  onStoryOpen,
  onReset,
}: AtlasLeftRailProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()

  // Local vendor search query
  const [vendorQuery, setVendorQuery] = useState('')

  const snapshot = yearSnapshots[state.yearIndex]
  const minYearIdx = 0
  const maxYearIdx = yearSnapshots.length - 1

  // Accent amber — matches dashboard/Atlas platform color
  const ACCENT = '#a06820'

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      {/* P2: when zoomed, header becomes a breadcrumb-back chip per § 2.5.
          Format: ATLAS · {LENS} · {CODE} {LABEL} · {N} vendors · [← zoom out]
          OpenCorporates Hierarchy vocabulary: answers "where am I?" */}
      {state.view.kind === 'zoomed-cluster' ? (
        <div
          className="px-4 pt-4 pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Breadcrumb path */}
          <div
            className="text-[8px] font-mono uppercase tracking-[0.14em] mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'ATLAS · ZOOMED' : 'ATLAS · AMPLIADO'}
          </div>
          {/* Code + label */}
          <div
            className="text-[12px] font-mono font-bold leading-tight mb-1"
            style={{ color: ACCENT }}
          >
            {state.view.code}
          </div>
          {/* Back button */}
          <button
            onClick={() => dispatch({ type: 'escape-zoom' })}
            className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1.5 rounded-sm transition-colors text-[10px] font-mono font-bold uppercase tracking-[0.1em] hover:bg-background-elevated/40"
            style={{ border: `1px solid ${ACCENT}`, color: ACCENT }}
            aria-label={lang === 'en' ? 'Zoom out to full sky' : 'Volver al cielo completo'}
          >
            ← {lang === 'en' ? 'Zoom out' : 'Volver'}
          </button>
          {/* ESC hint */}
          <div
            className="mt-1.5 text-[8px] font-mono"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'or press ESC' : 'o presiona ESC'}
          </div>
        </div>
      ) : (
        <div
          className="px-4 pt-5 pb-3 border-b flex items-start justify-between gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="min-w-0">
            <div
              className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] leading-none"
              style={{ color: ACCENT }}
            >
              {lang === 'en' ? 'OBSERVATORY' : 'OBSERVATORIO'}
            </div>
            <div
              className="text-[9px] font-mono mt-1 leading-tight"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {lang === 'en' ? '3.06M contracts · 2002–2025' : '3.06M contratos · 2002–2025'}
            </div>
          </div>
          <button
            onClick={onReset}
            className="flex-shrink-0 p-1 rounded-sm hover:bg-background-elevated/60 transition-colors mt-0.5"
            aria-label={lang === 'en' ? 'Reset all filters' : 'Restablecer filtros'}
            title={lang === 'en' ? 'Reset all filters' : 'Restablecer filtros'}
          >
            <RotateCcw className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>
      )}

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── LENS ──────────────────────────────────────────────────── */}
        <RailSection label={lang === 'en' ? 'LENS' : 'LENTE'} />
        <div className="px-2 pb-1" role="radiogroup" aria-label={lang === 'en' ? 'Observatory lens' : 'Lente del Observatorio'}>
          {LENSES.map((lens) => {
            const isActive = state.lens === lens.id
            return (
              <button
                key={lens.id}
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  dispatch({ type: 'set-lens', lens: lens.id })
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12px] font-mono rounded-sm',
                  'flex items-center gap-2 transition-colors mb-0.5',
                  isActive
                    ? 'font-bold'
                    : 'font-normal hover:bg-background-elevated/40',
                )}
                style={{
                  background: isActive ? 'var(--color-background-elevated, rgba(160,104,32,0.06))' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
              >
                {/* Radio dot */}
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: isActive ? ACCENT : 'transparent',
                    border: isActive ? 'none' : '1px solid var(--color-border-hover)',
                  }}
                />
                <span className="flex-1 truncate">{lang === 'en' ? lens.en : lens.es}</span>
                {/* FT Visual Vocabulary: quantify choices before committing */}
                <span
                  className="text-[9px] opacity-60 flex-shrink-0"
                  style={{ color: isActive ? ACCENT : 'var(--color-text-muted)' }}
                >
                  {lens.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── YEAR ──────────────────────────────────────────────────── */}
        <RailSection label={lang === 'en' ? 'YEAR' : 'AÑO'} />
        <div className="px-4 pb-2">
          {/* Big year display — Playfair Italic 800 */}
          <div
            className="tabular-nums leading-none mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 800,
              fontStyle: 'italic',
              fontSize: 28,
              color: ACCENT,
            }}
          >
            {snapshot?.year ?? '—'}
          </div>

          {/* Horizontal scrubber (simplified from Atlas.tsx YearScrubber) */}
          <div className="relative mb-1">
            <input
              type="range"
              min={minYearIdx}
              max={maxYearIdx}
              value={state.yearIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10)
                dispatch({ type: 'set-year', index: idx })
                onYearChange(idx)
              }}
              className="w-full h-[5px] rounded-full cursor-pointer atlas-rail-slider"
              aria-label={lang === 'en' ? 'Year scrubber' : 'Selector de año'}
            />
            <div className="flex items-center justify-between mt-1 text-[8px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              <span>{yearSnapshots[0]?.year}</span>
              <span>{yearSnapshots[maxYearIdx]?.year}</span>
            </div>
          </div>

          {/* Autoplay button */}
          <button
            onClick={() => onPlayChange(!isPlaying)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono uppercase tracking-[0.1em] text-[9px] font-bold transition-colors mt-1"
            style={{
              background: isPlaying ? '#dc2626' : 'var(--color-border)',
              color: isPlaying ? 'white' : 'var(--color-text-primary)',
            }}
            aria-label={isPlaying ? (lang === 'en' ? 'Pause autoplay' : 'Pausar reproducción') : (lang === 'en' ? 'Autoplay years' : 'Reproducir años')}
          >
            {isPlaying
              ? <><Pause className="h-2.5 w-2.5" /> {lang === 'en' ? 'Pause' : 'Pausar'}</>
              : <><Play className="h-2.5 w-2.5" /> {lang === 'en' ? 'Autoplay' : 'Reproducir'}</>
            }
          </button>

          {/* Year highlight annotation */}
          <AnimatePresence mode="wait">
            {snapshot?.highlight ? (
              <motion.div
                key={snapshot.year}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="mt-2 pt-2 flex items-start gap-1.5"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span
                  className="font-mono font-bold text-[8px] uppercase tracking-[0.12em] flex-shrink-0 mt-0.5"
                  style={{ color: '#dc2626' }}
                >
                  ◆
                </span>
                <span
                  className="text-[10px] leading-[1.5]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {snapshot.highlight[lang]}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── RISK FLOOR ─────────────────────────────────────────────── */}
        <RailSection label={lang === 'en' ? 'RISK FLOOR' : 'PISO DE RIESGO'} />
        <div className="px-4 pb-3">
          <div
            className="flex items-center text-[9px] font-mono uppercase tracking-[0.08em] rounded-sm overflow-hidden w-full"
            role="group"
            aria-label={lang === 'en' ? 'Risk floor filter' : 'Filtro mínimo de riesgo'}
            style={{ border: '1px solid var(--color-border)' }}
          >
            {RISK_FLOORS.map((f, i) => {
              const isActive = state.riskFloor === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    dispatch({ type: 'set-risk-floor', floor: f.id })
                  }}
                  className="flex-1 py-1.5 transition-colors text-center"
                  style={{
                    background: isActive ? f.color : 'transparent',
                    color: isActive
                      ? (f.id === 'all' ? 'var(--color-text-primary)' : 'white')
                      : 'var(--color-text-muted)',
                    borderRight: i < RISK_FLOORS.length - 1 ? '1px solid var(--color-border)' : 'none',
                    fontWeight: isActive ? 700 : 500,
                  }}
                  aria-pressed={isActive}
                >
                  {lang === 'en' ? f.en : f.es}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── FIND A VENDOR ─────────────────────────────────────────── */}
        <RailSection label={lang === 'en' ? 'FIND A VENDOR' : 'BUSCAR PROVEEDOR'} />
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              value={vendorQuery}
              onChange={(e) => setVendorQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && vendorQuery.trim().length >= 2) {
                  onVendorSearchPick(vendorQuery.trim())
                  setVendorQuery('')
                }
              }}
              placeholder={lang === 'en' ? 'Toka, Edenred, IMSS…' : 'Toka, Edenred, IMSS…'}
              className="w-full pl-7 pr-2.5 py-1.5 text-[11px] font-mono rounded-sm transition-colors focus:outline-none"
              style={{
                background: 'var(--color-background-elevated, var(--color-border))',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              aria-label={lang === 'en' ? 'Vendor search' : 'Buscar proveedor'}
            />
          </div>
          <div
            className="mt-1.5 text-[9px] font-mono"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? '↵ to pin cluster · 42 curated vendors' : '↵ para pinear cúmulo · 42 proveedores curados'}
          </div>
        </div>

        {/* ── INVESTIGATIONS (Saved + Stories) ──────────────────────── */}
        <RailSection label={lang === 'en' ? 'INVESTIGATIONS' : 'INVESTIGACIONES'} />
        <div className="px-2 pb-4">
          {ATLAS_STORIES.map((story) => (
            <button
              key={story.id}
              onClick={() => onStoryOpen(story.id)}
              className="w-full text-left px-3 py-2.5 rounded-sm transition-colors mb-0.5 flex items-start gap-2 hover:bg-background-elevated/40"
              style={{ borderLeft: `2px solid ${story.accent}` }}
            >
              <BookOpen
                className="h-3 w-3 flex-shrink-0 mt-0.5"
                style={{ color: story.accent }}
              />
              <div className="min-w-0">
                <div
                  className="text-[11px] font-mono font-bold truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {story.title[lang]}
                </div>
                <div
                  className="text-[9px] font-mono mt-0.5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {story.chapters.length} {lang === 'en' ? 'cap' : 'cap'} · {story.duration}
                </div>
              </div>
            </button>
          ))}

          {/* Hairline divider + save stub (P5 will wire this fully) */}
          <div
            className="my-2 mx-1"
            style={{ height: 1, background: 'var(--color-border)' }}
          />
          <button
            onClick={() => {
              // P5: will serialize current state to localStorage
              // For P1: no-op with visual feedback
            }}
            className="w-full text-left px-3 py-2 rounded-sm transition-colors text-[10px] font-mono flex items-center gap-1.5 hover:bg-background-elevated/30"
            style={{ color: 'var(--color-text-muted)' }}
            title={lang === 'en' ? 'Coming in P5 — saves current lens, year, filters, and pin to a named view' : 'Disponible en P5 — guarda la lente, año, filtros y pin actuales como vista nombrada'}
          >
            <span style={{ color: ACCENT }}>+</span>
            {lang === 'en' ? 'Save current view' : 'Guardar vista actual'}
          </button>
        </div>
      </div>

      {/* ── Custom slider styling (scoped to rail) ─────────────────── */}
      <style>{`
        .atlas-rail-slider {
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(
            to right,
            #a06820 0%,
            #a06820 var(--fill-pct, 100%),
            var(--color-border, #e5e7eb) var(--fill-pct, 100%),
            var(--color-border, #e5e7eb) 100%
          );
        }
        .atlas-rail-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
          border: 2px solid var(--color-background, white);
          box-shadow: 0 1px 4px rgba(220,38,38,0.30);
          transition: transform 100ms ease;
        }
        .atlas-rail-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .atlas-rail-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
          border: 2px solid var(--color-background, white);
        }
      `}</style>
    </div>
  )
}
