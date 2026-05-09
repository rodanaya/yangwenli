/**
 * CanvasControls — overlay controls floated on top of the ExploreCanvas.
 *
 * Year scrubber lives at the bottom-center, risk-floor toggle at the
 * top-right. Both are pure UI — they dispatch into ExploreState via
 * set-year / set-risk-floor and the consuming data hooks read those
 * fields. Nothing here knows about the canvas SVG; both controls sit
 * above it via position: absolute on the canvas wrapper.
 */
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
      className="absolute top-3 right-3 z-10 flex"
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
