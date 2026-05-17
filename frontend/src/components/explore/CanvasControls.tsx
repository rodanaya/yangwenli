/**
 * CanvasControls — overlay controls floated on top of the ExploreCanvas.
 *
 * Year scrubber lives at the bottom-center, risk-floor toggle at the
 * top-right. Both are pure UI — they dispatch into ExploreState via
 * set-year / set-risk-floor and the consuming data hooks read those
 * fields. Nothing here knows about the canvas SVG; both controls sit
 * above it via position: absolute on the canvas wrapper.
 */
import { useState } from 'react'
import { useExploreState, useExploreDispatch } from './ExploreState'

const YEAR_MIN = 2002
const YEAR_MAX = 2025

export function YearScrubber({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  const year = state.year
  const isAll = year === null

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"
      style={{
        background: 'var(--color-background-card, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: '8px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minWidth: 360,
      }}
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted">
          {lang === 'en' ? 'Year' : 'Año'}
        </span>
        <span className="text-base font-mono font-bold tabular-nums text-text-primary">
          {isAll ? (lang === 'en' ? 'All' : 'Todos') : year}
        </span>
        {!isAll && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-year', year: null })}
            className="ml-auto text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-primary transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {lang === 'en' ? 'reset' : 'reiniciar'}
          </button>
        )}
      </div>
      <input
        type="range"
        min={YEAR_MIN}
        max={YEAR_MAX}
        step={1}
        value={year ?? YEAR_MAX}
        onChange={(e) => dispatch({ type: 'set-year', year: Number(e.target.value) })}
        className="w-full h-1 cursor-pointer appearance-none"
        style={{
          background: 'var(--color-border)',
          accentColor: 'var(--color-accent)',
        }}
        aria-label={lang === 'en' ? 'Year filter' : 'Filtro de año'}
      />
      <div className="flex justify-between text-[8px] font-mono tabular-nums text-text-muted opacity-70 mt-0.5">
        <span>{YEAR_MIN}</span>
        <span>{YEAR_MAX}</span>
      </div>
    </div>
  )
}

const RISK_FLOORS: Array<{
  value: 'all' | 'medium' | 'high' | 'critical'
  labelEn: string
  labelEs: string
}> = [
  { value: 'all', labelEn: 'All', labelEs: 'Todos' },
  { value: 'medium', labelEn: 'Med+', labelEs: 'Med+' },
  { value: 'high', labelEn: 'High+', labelEs: 'Alto+' },
  { value: 'critical', labelEn: 'Crit', labelEs: 'Crít' },
]

export function RiskFloorToggle({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  return (
    <div
      className="absolute bottom-16 left-3 z-10 flex"
      style={{
        background: 'var(--color-background-card, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {RISK_FLOORS.map((f, i) => {
        const active = state.riskFloor === f.value
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => dispatch({ type: 'set-risk-floor', floor: f.value })}
            className="text-[10px] font-mono uppercase tracking-[0.12em] py-1.5 px-3 transition-colors"
            style={{
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
            aria-pressed={active}
          >
            {lang === 'en' ? f.labelEn : f.labelEs}
          </button>
        )
      })}
    </div>
  )
}

/**
 * LensToggle — Gap 6. Two lenses for v1.0:
 *   SECTORS (default) — bodies sized by total spend, colored by sector palette.
 *                       Answers "where is the money?"
 *   RISK              — bodies sized by avg_risk_score, colored by risk
 *                       palette (critical/high/medium/low). Answers "where
 *                       is the corruption concentrated?"
 *
 * Z0Layer reads state.lens and branches its body builder.
 *
 * Future v1.1 lenses (patterns / categories / terms) attach here.
 */
const LENSES: Array<{ value: 'sectors' | 'risk'; labelEn: string; labelEs: string }> = [
  { value: 'sectors', labelEn: 'Spend', labelEs: 'Gasto' },
  { value: 'risk', labelEn: 'Risk', labelEs: 'Riesgo' },
]

export function LensToggle({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  return (
    <div
      className="absolute top-14 left-3 z-10 flex"
      style={{
        background: 'var(--color-background-card, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
      role="group"
      aria-label={lang === 'en' ? 'Lens — what to highlight on the map' : 'Lente — qué resaltar en el mapa'}
    >
      <span
        className="px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-[0.16em] flex items-center"
        style={{ color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}
      >
        {lang === 'en' ? 'Lens' : 'Lente'}
      </span>
      {LENSES.map((l, i) => {
        const active = state.lens === l.value
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => dispatch({ type: 'set-lens', lens: l.value })}
            className="text-[10px] font-mono uppercase tracking-[0.12em] py-1.5 px-3 transition-colors"
            style={{
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
            aria-pressed={active}
          >
            {lang === 'en' ? l.labelEn : l.labelEs}
          </button>
        )
      })}
    </div>
  )
}

// Sector palette — 6 most prominent sectors for the legend key
const LEGEND_SECTORS = [
  { color: '#dc2626', labelEn: 'Health',         labelEs: 'Salud' },
  { color: '#ea580c', labelEn: 'Infrastructure',  labelEs: 'Infraestructura' },
  { color: '#eab308', labelEn: 'Energy',          labelEs: 'Energía' },
  { color: '#3b82f6', labelEn: 'Education',       labelEs: 'Educación' },
  { color: '#16a34a', labelEn: 'Treasury',        labelEs: 'Hacienda' },
  { color: '#64748b', labelEn: 'Other',           labelEs: 'Otros' },
]

const LEGEND_RISK = [
  { color: '#ef4444', labelEn: 'Critical ≥0.60', labelEs: 'Crítico ≥0.60' },
  { color: '#f59e0b', labelEn: 'High ≥0.40',     labelEs: 'Alto ≥0.40' },
  { color: '#a16207', labelEn: 'Medium ≥0.25',   labelEs: 'Medio ≥0.25' },
  { color: '#71717a', labelEn: 'Low <0.25',       labelEs: 'Bajo <0.25' },
]

/**
 * MapLegend — floating key chip at bottom-right of the canvas.
 * Shows size/color meaning for the active lens.
 */
export function MapLegend({ lang }: { lang: 'en' | 'es' }) {
  const state = useExploreState()
  const isRisk = state.lens === 'risk'
  const rows = isRisk ? LEGEND_RISK : LEGEND_SECTORS
  const sizeKey = isRisk
    ? (lang === 'en' ? 'size = risk score' : 'tamaño = riesgo')
    : (lang === 'en' ? 'size = total spend' : 'tamaño = gasto total')

  return (
    <div
      className="absolute bottom-16 right-3 z-10 pointer-events-none"
      style={{
        background: 'var(--color-background-card, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: '8px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minWidth: 140,
      }}
    >
      <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1.5">
        {lang === 'en' ? 'Legend' : 'Leyenda'}
      </p>
      <p className="text-[9px] font-mono text-text-muted mb-2 italic">{sizeKey}</p>
      {rows.map((r) => (
        <div key={r.color} className="flex items-center gap-1.5 mb-1">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: r.color }}
          />
          <span className="text-[9px] font-mono text-text-secondary">
            {lang === 'en' ? r.labelEn : r.labelEs}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * ShareViewButton — copies the current /explore URL (with focus stack
 * encoded by useExploreUrlSync) to the clipboard. Sits below the risk
 * floor toggle so the controls stack vertically along the top-right.
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
      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 transition-colors"
      style={{
        background: 'var(--color-background-card, #fff)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: 'var(--font-family-mono, monospace)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
      aria-label={lang === 'en' ? 'Copy view URL to clipboard' : 'Copiar URL al portapapeles'}
    >
      {copied
        ? (lang === 'en' ? '✓ Copied' : '✓ Copiado')
        : (lang === 'en' ? '⤴ Share' : '⤴ Compartir')}
    </button>
  )
}
