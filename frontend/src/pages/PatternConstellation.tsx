/**
 * PatternConstellation — isolated full-screen view of one ARIA corruption
 * pattern cluster. Route: /patterns/:code/constellation
 *
 * UX-2 from the Atlas fix queue. Removes the left rail and right dossier
 * noise so a single cluster fills the viewport for focused investigation.
 * AtlasContextProvider wraps the whole page so AtlasZoomLayer can dispatch
 * zoom-into-cluster on mount and listen to state changes.
 */

import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { AtlasContextProvider, useAtlasDispatch } from '@/components/atlas/AtlasContext'
import { AtlasZoomLayer } from '@/components/atlas/AtlasZoomLayer'
import { buildPatternMeta, type ConstellationRiskRow } from '@/components/charts/ConcentrationConstellation'

// Fixed risk rows — representative v0.8.5 distribution
const STATIC_ROWS: ConstellationRiskRow[] = [
  { level: 'critical', count: 162648,  pct: 5.2  },
  { level: 'high',     count: 184177,  pct: 5.9  },
  { level: 'medium',   count: 506748,  pct: 16.2 },
  { level: 'low',      count: 2197721, pct: 72.7 },
]

export function PatternConstellation() {
  const { code } = useParams<{ code: string }>()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <AtlasContextProvider
      initialState={{
        lens: 'patterns',
        yearIndex: 17,
        riskFloor: 'all',
        pinnedCode: code ?? null,
      }}
    >
      <PatternConstellationInner code={code ?? 'P5'} lang={lang} />
    </AtlasContextProvider>
  )
}

function PatternConstellationInner({ code, lang }: { code: string; lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  const dispatch = useAtlasDispatch()
  const isEs = lang === 'es'

  const allMeta = useMemo(() => buildPatternMeta(isEs), [isEs])
  const meta = useMemo(
    () => allMeta.find((m) => m.code === code) ?? allMeta[0],
    [allMeta, code],
  )

  // Auto-zoom into this cluster shortly after mount so the animation plays
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: 'zoom-into-cluster', code })
    }, 150)
    return () => clearTimeout(t)
  }, [code, dispatch])

  return (
    <div
      className="flex"
      style={{
        height: 'calc(100vh - var(--topbar-h, 64px))',
        background: 'var(--color-background)',
      }}
    >
      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <AtlasZoomLayer
          mode="patterns"
          rows={STATIC_ROWS}
          totalContracts={3051294}
          lang={lang}
          activeMeta={allMeta}
          pinnedCode={code}
          highlightedClusterCodes={[code]}
        />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] font-mono uppercase tracking-[0.1em]"
          style={{
            background: 'var(--color-background-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {lang === 'en' ? 'Back' : 'Atrás'}
        </button>
      </div>

      {/* Pattern dossier panel */}
      <aside
        className="hidden lg:flex flex-col overflow-y-auto border-l border-border"
        style={{ width: 280, background: 'var(--color-background-card)' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div
            className="text-[13px] font-mono uppercase tracking-[0.16em] mb-1"
            style={{ color: meta.color }}
          >
            {code} · {lang === 'en' ? 'PATTERN' : 'PATRÓN'}
          </div>
          <h1
            className="font-serif font-extrabold text-[20px] leading-[1.1]"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: 'var(--color-text-primary)',
            }}
          >
            {meta.label}
          </h1>
        </div>

        {/* Stats + description */}
        <div className="p-5 flex-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <p>{meta.desc}</p>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span
                className="font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'T1 vendors' : 'Proveedores T1'}
              </span>
              <span
                className="font-mono font-bold tabular-nums"
                style={{ color: meta.color }}
              >
                {meta.t1}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span
                className="font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'Total vendors' : 'Total proveedores'}
              </span>
              <span className="font-mono tabular-nums">{meta.vendors.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span
                className="font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'High-risk %' : '% alto riesgo'}
              </span>
              <span className="font-mono tabular-nums">
                {(meta.highRiskPct * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Investigate CTA */}
        <div className="p-4 border-t border-border">
          <a
            href={`/patterns/${code}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm font-mono uppercase tracking-[0.1em] text-[13px] font-bold"
            style={{
              background: meta.color,
              color: 'var(--color-background)',
              textDecoration: 'none',
            }}
          >
            {lang === 'en' ? 'Investigate' : 'Investigar'}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </aside>
    </div>
  )
}

export default PatternConstellation
