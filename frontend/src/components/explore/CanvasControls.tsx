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
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 px-3"
      style={{
        height: 28,
        background: 'var(--color-background-card, #fff)',
        borderTop: '1px solid var(--color-border)',
        opacity: 0.92,
      }}
    >
      <span className="text-[8px] font-mono uppercase tracking-[0.16em] text-text-muted shrink-0 tabular-nums">
        {isAll ? (lang === 'en' ? 'All years' : 'Todos') : year}
      </span>
      <input
        type="range"
        min={YEAR_MIN}
        max={YEAR_MAX}
        step={1}
        value={year ?? YEAR_MAX}
        onChange={(e) => dispatch({ type: 'set-year', year: Number(e.target.value) })}
        className="flex-1 cursor-pointer appearance-none"
        style={{ height: 2, accentColor: 'var(--color-accent)', touchAction: 'none' }}
        aria-label={lang === 'en' ? 'Year filter' : 'Filtro de año'}
      />
      {!isAll && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'set-year', year: null })}
          className="text-[8px] font-mono text-text-muted hover:text-text-primary transition-colors shrink-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label={lang === 'en' ? 'Reset year' : 'Reiniciar año'}
        >
          ✕
        </button>
      )}
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

// RiskFloorToggle merged into LensToggle — rendered there as second button group.
export function RiskFloorToggle(_props: { lang: 'en' | 'es' }) { return null }

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
      aria-label={lang === 'en' ? 'Map controls — lens and risk filter' : 'Controles del mapa — lente y filtro de riesgo'}
    >
      {/* Lens group */}
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
      {/* Risk floor group — separator then filter buttons */}
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 1,
          alignSelf: 'stretch',
          background: 'var(--color-border)',
          margin: '4px 0',
        }}
      />
      {RISK_FLOORS.map((f) => {
        const active = state.riskFloor === f.value
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => dispatch({ type: 'set-risk-floor', floor: f.value })}
            className="text-[10px] font-mono uppercase tracking-[0.12em] py-1.5 px-2.5 transition-colors"
            style={{
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderLeft: '1px solid var(--color-border)',
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

// MapLegend removed — legend context is provided by the LensToggle label and BriefingPanel.
export function MapLegend(_props: { lang: 'en' | 'es' }) { return null }

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
