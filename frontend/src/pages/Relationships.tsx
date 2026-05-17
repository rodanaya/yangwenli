/**
 * Relationships — Folio·XIV · Institutional Capture
 *
 * Single analytical lens: monotonic concentration — vendors that grew from
 * ≤25% to ≥50% of an institution's spend over ≥4 years.
 *
 * The intersection quadrants (RUBLI vs regulators) previously also lived
 * on this page but were a carbon copy of the dedicated /intersection
 * surface. We now keep a compact teaser linking to /intersection and
 * focus this page entirely on Captura Institucional.
 */

import { Link, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { captureApi, type CaptureItem } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import {
  SECTORS,
  SECTOR_COLORS,
  getSectorName,
} from '@/lib/constants'
import { ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PlateFrame } from '@/components/atlas/PlateFrame'

// ─── Capture helpers ──────────────────────────────────────────────────────────

function ShareSparkline({ timeline, peakShare }: { timeline: CaptureItem['timeline']; peakShare: number }) {
  if (timeline.length < 2) return null
  const W = 180, H = 40, minY = 0
  const maxY = Math.max(100, peakShare)
  const minX = Math.min(...timeline.map((p) => p.year))
  const maxX = Math.max(...timeline.map((p) => p.year))
  const xSpan = Math.max(1, maxX - minX)
  const ySpan = maxY - minY
  const points = timeline.map((p) => ({
    x: ((p.year - minX) / xSpan) * (W - 8) + 4,
    y: H - 4 - ((p.share_pct - minY) / ySpan) * (H - 8),
    ...p,
  }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${H - 4} L ${points[0].x.toFixed(1)} ${H - 4} Z`
  const thresholdY = H - 4 - ((50 - minY) / ySpan) * (H - 8)
  return (
    <svg width={W} height={H} className="flex-shrink-0" aria-hidden="true">
      <line x1="4" x2={W - 4} y1={thresholdY} y2={thresholdY} stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35" />
      <path d={area} fill="var(--color-risk-critical)" opacity="0.12" />
      <path d={path} fill="none" stroke="var(--color-risk-critical)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.year} cx={p.x} cy={p.y} r={p.share_pct >= 50 ? 2.2 : 1.6}
          fill={p.share_pct >= 50 ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'} />
      ))}
    </svg>
  )
}

function CaptureRow({ c, rank, lang }: { c: CaptureItem; rank: number; lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  // Use sector_id for color + localized name — API returns name_en (English)
  // regardless of UI language, so id-based lookup is the correct approach.
  const sector = SECTORS.find(s => s.id === c.institution_sector_id)
  const sectorColor = sector ? SECTOR_COLORS[sector.code] : '#64748b'
  const delta = c.peak_share_pct - c.earliest_share_pct
  const years = `${c.earliest_year}–${c.peak_year}`
  const goToInstitution = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Let inner links (EntityIdentityChip) handle their own clicks
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate(`/institutions/${c.institution_id}`)
  }
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={goToInstitution}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToInstitution(e) } }}
      title={lang === 'es' ? `Ver institución: ${c.institution_name}` : `View institution: ${c.institution_name}`}
      className="group flex flex-col md:flex-row items-stretch md:items-center gap-4 px-5 py-5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-text-muted focus:ring-inset"
      style={{ borderLeft: `4px solid ${sectorColor}` }}
    >
      <div className="flex items-start gap-4 md:w-[240px] flex-shrink-0">
        <span className="font-mono text-[11px] font-bold text-text-muted tabular-nums pt-1">{String(rank).padStart(2, '0')}</span>
        <ShareSparkline timeline={c.timeline} peakShare={c.peak_share_pct} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-0.5 mb-1.5">
          <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="sm" className="self-start max-w-full" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">{lang === 'es' ? 'capturó' : 'captured'}</span>
            <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="sm" className="flex-1 min-w-0" />
          </div>
        </div>
        <p className="text-[13px] text-text-secondary leading-[1.55]">
          {lang === 'es' ? (
            <>De <strong className="text-text-primary font-mono tabular-nums">{c.earliest_share_pct}%</strong> en {c.earliest_year} a{' '}
            <strong className="font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{c.peak_share_pct}%</strong> en {c.peak_year} — <strong className="text-text-primary">+{delta.toFixed(1)} puntos</strong> en {c.years_observed} años. Valor capturado: <strong className="text-text-primary font-mono">{formatCompactMXN(c.cumulative_value_mxn)}</strong> de {formatCompactMXN(c.institution_total_window)} totales.</>
          ) : (
            <>From <strong className="text-text-primary font-mono tabular-nums">{c.earliest_share_pct}%</strong> in {c.earliest_year} to{' '}
            <strong className="font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{c.peak_share_pct}%</strong> in {c.peak_year} — <strong className="text-text-primary">+{delta.toFixed(1)} points</strong> over {c.years_observed} years. Value captured: <strong className="text-text-primary font-mono">{formatCompactMXN(c.cumulative_value_mxn)}</strong> of institution's {formatCompactMXN(c.institution_total_window)} total.</>
          )}
        </p>
        <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] font-mono tracking-wider uppercase text-text-muted">
          {sector && (
            <span><span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle" style={{ background: sectorColor }} />{getSectorName(sector.code, lang).toUpperCase()}</span>
          )}
          <span>·</span>
          <span className="tabular-nums">{years}</span>
          <span>·</span>
          <span className="tabular-nums">Score {c.score.toFixed(0)}</span>
        </div>
      </div>
      <ChevronRight className="hidden md:block h-4 w-4 text-text-muted flex-shrink-0 group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Relationships() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  const { data: capData, isLoading: capLoading } = useQuery({
    queryKey: ['capture', 'top', 50],
    queryFn: () => captureApi.getTop({ limit: 50 }),
    staleTime: 30 * 60 * 1000,
  })

  const allCaptures = capData?.data ?? []
  const [captureFilter, setCaptureFilter] = useState<number | null>(null)

  // Sector counts keyed by institution_sector_id (integer 1-12) — matches SECTORS[].id
  const captureSectorCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const c of allCaptures) {
      const id = c.institution_sector_id
      if (id != null) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [allCaptures])

  const topSectorEntry = useMemo(() => {
    let best: { id: number; code: string; count: number } | null = null
    for (const [id, count] of captureSectorCounts) {
      if (!best || count > best.count) {
        const sec = SECTORS.find(s => s.id === id)
        best = { id, code: sec?.code ?? 'otros', count }
      }
    }
    return best
  }, [captureSectorCounts])

  const captures = useMemo(() => {
    if (captureFilter === null) return allCaptures
    return allCaptures.filter((c) => c.institution_sector_id === captureFilter)
  }, [allCaptures, captureFilter])

  const totalCaptures = capData?.total_captures ?? 0
  const capturedValue = allCaptures.reduce((s, c) => s + c.cumulative_value_mxn, 0)
  const largestJump = allCaptures.length > 0
    ? Math.max(...allCaptures.map((c) => c.peak_share_pct - c.earliest_share_pct))
    : 0

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Paper-grain overlay — single filter for the unified page */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', opacity: 0.045, mixBlendMode: 'multiply', zIndex: 0 }}
      >
        <filter id="relationships-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="14" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.41  0 0 0 0 0.27  0 0 0 0 0.13  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#relationships-paper-grain)" />
      </svg>

      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Folio·XIV page hero — Institutional Capture ──────────────── */}
        <header className="mb-8 pb-6 border-b border-border">
          <div
            className="flex items-center gap-3 mb-3"
            style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 400 }}
          >
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Folio·XIV</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>{lang === 'es' ? 'Captura institucional · concentración monótona' : 'Institutional capture · monotonic concentration'}</span>
            </span>
          </div>
          <h1
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: 1.04,
              letterSpacing: '-0.012em',
              color: 'var(--color-text-primary)',
            }}
          >
            {lang === 'es' ? (
              <>
                Cómo un proveedor{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  captura una institución.
                </span>
              </>
            ) : (
              <>
                How a vendor{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--color-accent)' }}>
                  captures an institution.
                </span>
              </>
            )}
          </h1>
          <p
            className="mt-4"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '17px', lineHeight: 1.55, maxWidth: '68ch', color: 'var(--color-text-secondary)', letterSpacing: '0.005em' }}
          >
            {lang === 'es'
              ? 'Concentración monótona: el proveedor empezó por debajo del 25% y terminó por encima del 50%, año tras año, durante al menos cuatro años. El ascenso no es prueba de irregularidad — pero la geometría es publicable.'
              : "Monotonic concentration: the vendor began below 25% and ended above 50%, year after year, for at least four years. The climb is not proof of wrongdoing — but the geometry is publishable."}
          </p>
        </header>

        {/* ── Intersection teaser — compact link to dedicated surface ──── */}
        <div className="mb-10 pb-6 border-b border-border flex items-start gap-5 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-1">
              {lang === 'es' ? 'Cuadrante de la intersección · Folio·XIII' : 'Intersection quadrant · Folio·XIII'}
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.55] max-w-prose">
              {lang === 'es'
                ? 'Tres cuadrantes de triangulación: lo que el modelo señala antes que los reguladores, lo que ambos confirman, y lo que el modelo todavía no ve.'
                : 'Three triangulation quadrants: what the model flags before regulators, what both confirm, and what the model still misses.'}
            </p>
            <Link
              to="/intersection"
              className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-mono font-bold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              {lang === 'es' ? 'Ver superficie de investigación completa' : 'Open full investigation surface'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            Captura Institucional
            ════════════════════════════════════════════════════════════════ */}
        <section id="captura" aria-labelledby="captura-heading">
          <div className="mb-6">
            <div className="flex items-baseline gap-5">
              <div className="text-right">
                {capLoading ? <Skeleton className="h-5 w-12 ml-auto" /> : <div className="font-mono tabular-nums text-base font-semibold" style={{ color: 'var(--color-risk-critical)' }}>{formatNumber(totalCaptures)}</div>}
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">{lang === 'es' ? 'Capturas' : 'Captures'}</div>
              </div>
              <div className="text-right">
                {capLoading ? <Skeleton className="h-5 w-20 ml-auto" /> : <div className="font-mono tabular-nums text-base font-semibold text-text-primary">{formatCompactMXN(capturedValue)}</div>}
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">{lang === 'es' ? 'Valor capturado' : 'Captured value'}</div>
              </div>
              <div className="text-right">
                {capLoading ? <Skeleton className="h-5 w-14 ml-auto" /> : <div className="font-mono tabular-nums text-base font-semibold text-text-primary">{largestJump > 0 ? `${largestJump.toFixed(0)} pp` : '—'}</div>}
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">{lang === 'es' ? 'Mayor salto' : 'Largest jump'}</div>
              </div>
              <div className="text-right">
                {capLoading ? (
                  <Skeleton className="h-5 w-24 ml-auto" />
                ) : topSectorEntry ? (
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: SECTOR_COLORS[topSectorEntry.code] ?? '#64748b' }}
                      aria-hidden="true"
                    />
                    <span className="font-mono tabular-nums text-base font-semibold text-text-primary uppercase tracking-tight">
                      {getSectorName(topSectorEntry.code, lang)}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-text-muted">
                      ({topSectorEntry.count})
                    </span>
                  </div>
                ) : (
                  <div className="font-mono tabular-nums text-base font-semibold text-text-primary">—</div>
                )}
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">
                  {lang === 'es' ? 'Sector dominante' : 'Top sector'}
                </div>
              </div>
            </div>
          </div>

          {capLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm border border-border bg-background-elevated">
                <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-[11px] leading-[1.6] text-text-secondary max-w-prose">
                  {lang === 'es'
                    ? 'La captura institucional no es prueba de irregularidad. Algunas concentraciones legítimas emergen de certificación técnica, exclusividad regional, o dependencia regulatoria de proveedor único. Cada fila abajo merece investigación — no acusación.'
                    : 'Institutional capture is not proof of wrongdoing. Some legitimate concentrations emerge from technical certification, regional exclusivity, or single-source regulatory dependency. Each row warrants investigation — not accusation.'}
                </p>
              </div>

              {/* Sector filter chips — narrow the capture list to a single sector */}
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted flex-shrink-0">
                  {lang === 'es' ? 'Filtrar' : 'Filter'}
                </p>
                <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                  <button
                    type="button"
                    onClick={() => setCaptureFilter(null)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors ${
                      captureFilter === null
                        ? 'border border-text-primary text-text-primary bg-background-elevated font-semibold'
                        : 'border border-border text-text-muted hover:text-text-secondary hover:border-text-muted'
                    }`}
                    aria-pressed={captureFilter === null}
                  >
                    <span>{lang === 'es' ? 'Todos' : 'All'}</span>
                    <span className="opacity-50" aria-hidden="true">·</span>
                    <span className="tabular-nums opacity-70">{allCaptures.length}</span>
                  </button>
                  {SECTORS.map((s) => {
                    const count = captureSectorCounts.get(s.id) ?? 0
                    if (count === 0) return null
                    const active = captureFilter === s.id
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => setCaptureFilter(active ? null : s.id)}
                        aria-pressed={active}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          active
                            ? 'bg-background-elevated font-semibold'
                            : 'border border-border text-text-muted hover:text-text-secondary hover:border-text-muted'
                        }`}
                        style={
                          active
                            ? { border: `1px solid ${SECTOR_COLORS[s.code] ?? '#64748b'}`, color: SECTOR_COLORS[s.code] ?? undefined }
                            : undefined
                        }
                        title={`${lang === 'es' ? s.name : s.nameEN} — ${count} ${lang === 'es' ? 'capturas' : 'captures'}`}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: SECTOR_COLORS[s.code] ?? '#64748b' }}
                          aria-hidden="true"
                        />
                        <span>{lang === 'es' ? s.name : s.nameEN}</span>
                        <span className="opacity-50" aria-hidden="true">·</span>
                        <span className="tabular-nums opacity-70">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <PlateFrame
                lang={lang}
                folio="XII"
                contextLabel={{ en: 'Capture atlas', es: 'Atlas de captura' }}
                caption={lang === 'es'
                  ? 'Lámina — Las concentraciones monótonas más grandes de proveedor → institución, 2018–2025. El ancho de la chispa muestra los años observados; los puntos rojos marcan años con participación ≥ 50%.'
                  : 'Plate — The largest monotonic vendor → institution concentrations, 2018–2025. Sparkline width shows observed years; red dots mark years at ≥ 50% share.'}
              >
                <div className="rounded-sm border border-border bg-background-card overflow-hidden">
                  {captures.length === 0 ? (
                    <div className="px-5 py-10 text-center text-[12px] text-text-muted">
                      {lang === 'es'
                        ? 'Ninguna captura coincide con este filtro de sector.'
                        : 'No captures match this sector filter.'}
                    </div>
                  ) : (
                    captures.map((c, i) => (
                      <CaptureRow key={`${c.institution_id}-${c.vendor_id}`} c={c} rank={i + 1} lang={lang} />
                    ))
                  )}
                </div>
              </PlateFrame>

              <div className="pt-4 border-t border-border">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">{lang === 'es' ? 'Metodología' : 'Methodology'}</p>
                <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                  {lang === 'es' ? (
                    <>Calculado sobre {capData ? capData.total_unfiltered : '—'} candidatos (institución, proveedor) con al menos {capData?.thresholds.min_years ?? '—'} años de datos. Umbrales: piso {capData?.thresholds.floor_share_pct ?? '—'}%, techo {capData?.thresholds.ceil_share_pct ?? '—'}%. Ranking: Δparticipación × √(valor MXN capturado). Datos: COMPRANET contratos federales 2018–2025.</>
                  ) : (
                    <>Computed over {capData ? capData.total_unfiltered : '—'} (institution, vendor) candidates with at least {capData?.thresholds.min_years ?? '—'} years of data. Thresholds: floor {capData?.thresholds.floor_share_pct ?? '—'}%, ceiling {capData?.thresholds.ceil_share_pct ?? '—'}%. Ranking: Δshare × √(captured MXN). Data: COMPRANET federal contracts 2018–2025.</>
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
