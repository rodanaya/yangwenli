/**
 * Relationships — Folio·XIV
 *
 * Two analytical lenses on how vendors build relationships with public money:
 *
 *  I.  La Intersección — RUBLI vs regulators: what the model flags that
 *      official registries haven't caught yet, and vice versa.
 *
 *  II. Captura Institucional — monotonic concentration: vendors that grew
 *      from ≤25% to ≥50% of an institution's spend over ≥4 years.
 *
 * Consolidates the former /intersection and /captura surfaces into a single
 * editorial arc. Both redirected here.
 */

import { Link, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, captureApi, type IntersectionVendor, type CaptureItem } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import {
  SECTORS,
  SECTOR_COLORS,
  CURRENT_MODEL_VERSION,
  GROUND_TRUTH_CASE_COUNT_FALLBACK,
  GROUND_TRUTH_VENDOR_COUNT_FALLBACK,
  getSectorName,
} from '@/lib/constants'
import { ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { PlateFrame } from '@/components/atlas/PlateFrame'

// ─── Intersection helpers ─────────────────────────────────────────────────────

function RegistryBadges({ v }: { v: IntersectionVendor }) {
  const badges: Array<{ label: string; color: string; title: string }> = []
  if (v.is_efos_definitivo) badges.push({ label: 'EFOS', color: '#dc2626', title: 'SAT-confirmed ghost company (Art. 69-B definitivo)' })
  if (v.is_sfp_sanctioned) badges.push({ label: 'SFP', color: '#ea580c', title: 'Federal comptroller sanction' })
  if (v.in_ground_truth) badges.push({ label: 'GT', color: '#a06820', title: 'Party to a documented corruption case' })
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1 flex-shrink-0">
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
          style={{ color: b.color, background: `${b.color}14`, border: `1px solid ${b.color}33` }}
        >
          {b.label}
        </span>
      ))}
    </span>
  )
}

function VendorRow({ v, rank, showSecondaryMetric, lang }: {
  v: IntersectionVendor; rank: number; showSecondaryMetric: 'ips' | 'risk' | 'value'; lang: string
}) {
  const sectorColor = v.primary_sector_name ? SECTOR_COLORS[v.primary_sector_name.toLowerCase()] ?? '#64748b' : '#64748b'
  const secondary =
    showSecondaryMetric === 'ips' ? `IPS ${(v.ips_final * 100).toFixed(1)}`
    : showSecondaryMetric === 'risk' ? `${(v.avg_risk_score * 100).toFixed(0)}/100`
    : formatCompactMXN(v.total_value_mxn)
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">{String(rank).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <EntityIdentityChip type="vendor" id={v.vendor_id} name={v.vendor_name} size="xs" />
          <RegistryBadges v={v} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-text-muted">
          {v.primary_sector_name && (
            <span className="uppercase tracking-wider">
              {getSectorName(v.primary_sector_name.toLowerCase(), lang === 'es' ? 'es' : 'en')}
            </span>
          )}
          <span>·</span>
          <span className="tabular-nums">{formatNumber(v.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}</span>
          {v.primary_pattern && <><span>·</span><span className="uppercase tracking-wider">{v.primary_pattern}</span></>}
        </div>
      </div>
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <div className="font-mono text-sm font-bold tabular-nums text-text-primary">{secondary}</div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
    </div>
  )
}

function QuadrantCard({ eyebrow, title, deck, count, accent, rows, showSecondaryMetric, lang, ctaLabel, ctaTo }: {
  eyebrow: string; title: React.ReactNode; deck: React.ReactNode; count: number; accent: string
  rows: IntersectionVendor[]; showSecondaryMetric: 'ips' | 'risk' | 'value'; lang: string; ctaLabel: string; ctaTo: string
}) {
  return (
    <section className="rounded-sm border border-border bg-background-card overflow-hidden" style={{ borderLeft: `4px solid ${accent}` }}>
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{eyebrow}</p>
          <p className="font-mono tabular-nums text-[11px] text-text-muted">{formatNumber(count)} {lang === 'es' ? 'proveedores' : 'vendors'}</p>
        </div>
        <h3
          className="mt-1 text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)', fontWeight: 700, letterSpacing: '-0.015em' }}
        >
          {title}
        </h3>
        <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-prose">{deck}</p>
      </header>
      {rows.length > 0 ? (
        <div>
          {rows.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={i + 1} showSecondaryMetric={showSecondaryMetric} lang={lang} />)}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-text-muted">{lang === 'es' ? 'Sin datos.' : 'No data.'}</div>
      )}
      {count > rows.length && (
        <Link
          to={ctaTo}
          className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border text-[11px] font-mono tracking-[0.12em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <span>{ctaLabel}</span>
          <span>{count - rows.length > 0 ? `+${formatNumber(count - rows.length)} ${lang === 'es' ? 'más' : 'more'}` : ''} →</span>
        </Link>
      )}
    </section>
  )
}

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
  const sectorColor = c.institution_sector_name ? SECTOR_COLORS[c.institution_sector_name.toLowerCase()] ?? '#64748b' : '#64748b'
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
        <h4
          className="text-text-primary leading-tight mb-1"
          style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}
        >
          <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="sm" />
          {' '}
          <span className="text-text-muted" style={{ fontWeight: 400 }}>{lang === 'es' ? 'capturó' : 'captured'}</span>
          {' '}
          <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="sm" />
        </h4>
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
          {c.institution_sector_name && (
            <span><span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle" style={{ background: sectorColor }} />{c.institution_sector_name}</span>
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

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="flex items-center gap-3 my-10">
      <div className="flex-1 h-px bg-background-elevated" />
      <div className="w-1 h-1 rounded-full bg-[#a06820]" />
      <div className="flex-1 h-px bg-background-elevated" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Relationships() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'

  const { data: ixData, isLoading: ixLoading } = useQuery({
    queryKey: ['intersection', 'summary', 10],
    queryFn: () => intersectionApi.getSummary(10),
    staleTime: 10 * 60 * 1000,
  })

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
    let best: { id: number; count: number } | null = null
    for (const [id, count] of captureSectorCounts) {
      if (!best || count > best.count) best = { id, count }
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

  // Intersection total (for the deep-dive link)
  const ixTotal = ixData ? ixData.counts.novelty + ixData.counts.confirmed + ixData.counts.blindspot : 0

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

        {/* ── Folio·XIV page hero ───────────────────────────────────────── */}
        <header className="mb-10 pb-6 border-b border-border">
          <div
            className="flex items-center gap-3 mb-3"
            style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 400 }}
          >
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              <span style={{ color: '#a06820', fontWeight: 500 }}>Folio·XIV</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <span>{lang === 'es' ? 'Las relaciones · dinero público · captura · triangulación' : 'Relationships · public money · capture · triangulation'}</span>
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
                Cómo el dinero público{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                  construye relaciones.
                </span>
              </>
            ) : (
              <>
                How public money{' '}
                <span style={{ fontStyle: 'normal', fontWeight: 600, color: '#a06820' }}>
                  builds relationships.
                </span>
              </>
            )}
          </h1>
          <p
            className="mt-4"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '17px', lineHeight: 1.55, maxWidth: '68ch', color: 'var(--color-text-secondary)', letterSpacing: '0.005em' }}
          >
            {lang === 'es'
              ? 'Dos lentes sobre el mismo fenómeno: qué señala el modelo que los reguladores todavía no han visto, y qué vendedores han crecido hasta dominar una institución año tras año durante al menos cuatro años.'
              : 'Two lenses on the same phenomenon: what the model flags that regulators have not yet seen, and which vendors have grown to dominate an institution year after year for at least four years.'}
          </p>
        </header>

        {/* ════════════════════════════════════════════════════════════════
            SECTION I — La Intersección (RUBLI vs reguladores)
            ════════════════════════════════════════════════════════════════ */}
        <section id="intersection" aria-labelledby="intersection-heading">
          <div className="mb-6">
            <p
              className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-1"
              style={{ color: '#a06820' }}
            >
              {lang === 'es' ? 'Folio·XIII · La Intersección' : 'Folio·XIII · The Intersection'}
            </p>
            <h2
              id="intersection-heading"
              style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'clamp(1.25rem, 2.2vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
            >
              {lang === 'es' ? 'El modelo señala lo que los reguladores todavía no.' : "The model flags what regulators haven't yet."}
            </h2>
            <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-prose">
              {lang === 'es'
                ? 'Tres cuadrantes triangulan dos métodos independientes: el patrón cuantitativo del modelo y el registro oficial de los reguladores. Donde divergen — proveedores que un método ve y el otro no — está la materia prima de una investigación.'
                : "Three quadrants triangulate two independent methods: the model's quantitative pattern and the regulators' official register. Where they diverge — vendors one method sees and the other does not — is the raw material of an investigation."}
            </p>
            {!ixLoading && ixData && (
              <div className="flex items-baseline gap-5 mt-4">
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--color-risk-critical)' }}>{formatNumber(ixData.counts.novelty)}</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{lang === 'es' ? 'Novedad' : 'Novelty'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--color-accent)' }}>{formatNumber(ixData.counts.confirmed)}</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{lang === 'es' ? 'Confirmado' : 'Confirmed'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-primary tabular-nums leading-none">{formatNumber(ixData.counts.blindspot)}</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">{lang === 'es' ? 'Punto ciego' : 'Blind spot'}</div>
                </div>
                <Link
                  to="/intersection"
                  className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-primary transition-colors self-end pb-0.5"
                >
                  <span>
                    {lang === 'es'
                      ? <>Análisis completo de la intersección <span className="tabular-nums">({formatNumber(ixTotal)} {lang === 'es' ? 'proveedores' : 'vendors'})</span></>
                      : <>Full intersection analysis <span className="tabular-nums">({formatNumber(ixTotal)} vendors)</span></>}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {ixLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-sm border border-border bg-background-card p-5">
                  <Skeleton className="h-3 w-32 mb-3" />
                  <Skeleton className="h-6 w-96 mb-2" />
                  <div className="space-y-2">{[1, 2, 3].map((j) => <Skeleton key={j} className="h-10 w-full" />)}</div>
                </div>
              ))}
            </div>
          ) : ixData ? (
            <div className="space-y-6">
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm border border-border bg-background-elevated">
                <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
                <p className="text-[11px] leading-[1.6] text-text-secondary max-w-prose">
                  {lang === 'es' ? (
                    <>Los cuadrantes son señales de investigación, no veredictos. Umbrales: {(ixData.thresholds.rubli_flags * 100).toFixed(0)}% = alto riesgo; {(ixData.thresholds.rubli_clean * 100).toFixed(0)}% = bajo riesgo; ≥ {ixData.thresholds.min_contracts} contratos.</>
                  ) : (
                    <>Quadrants are investigation signals, not verdicts. Thresholds: {(ixData.thresholds.rubli_flags * 100).toFixed(0)}% = high risk; {(ixData.thresholds.rubli_clean * 100).toFixed(0)}% = low risk; ≥ {ixData.thresholds.min_contracts} contracts.</>
                  )}
                </p>
              </div>

              <PlateFrame
                lang={lang}
                folio="XIII"
                contextLabel={{ en: 'Intersection atlas', es: 'Atlas de la intersección' }}
                caption={lang === 'es'
                  ? 'Lámina — Tres cuadrantes RUBLI × reguladores. Novedad: alto riesgo del modelo, sin marca externa. Confirmado: ambos métodos coinciden. Punto ciego: el modelo no detecta lo que el regulador sí registró.'
                  : 'Plate — Three RUBLI × regulator quadrants. Novelty: high model risk, no external mark. Confirmed: methods agree. Blind spot: model misses what the regulator registered.'}
              >
                <div className="space-y-6">
                  <QuadrantCard
                    eyebrow={lang === 'es' ? 'Cuadrante I · Novedad' : 'Quadrant I · Novelty'}
                    accent="var(--color-risk-critical)"
                    count={ixData.counts.novelty}
                    title={lang === 'es' ? <>Proveedores que coinciden con patrones de corrupción — sin marca externa.</> : <>Vendors matching corruption patterns — not on any external registry.</>}
                    deck={lang === 'es'
                      ? <><strong className="text-text-primary">{formatNumber(ixData.counts.novelty)}</strong> proveedores con score alto (≥ 40/100) cuyos RFC no aparecen en SAT EFOS, ni tienen sanción SFP, ni están en el corpus de casos documentados. Ordenados por IPS — prioridad integrada.</>
                      : <><strong className="text-text-primary">{formatNumber(ixData.counts.novelty)}</strong> vendors with high pattern-match (≥ 40/100) whose RFCs do not appear on SAT EFOS, carry no SFP sanction, and are absent from the documented-case corpus. Ranked by IPS (integrated priority score).</>}
                    rows={ixData.rankings.novelty}
                    showSecondaryMetric="ips"
                    lang={lang}
                    ctaLabel={lang === 'es' ? 'Ver todos los proveedores de novedad' : 'View all novelty vendors'}
                    ctaTo="/intersection"
                  />
                  <QuadrantCard
                    eyebrow={lang === 'es' ? 'Cuadrante II · Confirmado' : 'Quadrant II · Confirmed'}
                    accent="var(--color-accent)"
                    count={ixData.counts.confirmed}
                    title={lang === 'es' ? <>Ambas señales coinciden — modelo y reguladores de acuerdo.</> : <>Both signals agree — model and regulators converge.</>}
                    deck={lang === 'es'
                      ? <>Triangulación: <strong className="text-text-primary">{formatNumber(ixData.counts.confirmed)}</strong> proveedores con score alto que además aparecen en al menos un registro externo.</>
                      : <>Triangulation: <strong className="text-text-primary">{formatNumber(ixData.counts.confirmed)}</strong> vendors with high pattern-match that also appear on at least one external registry.</>}
                    rows={ixData.rankings.confirmed}
                    showSecondaryMetric="risk"
                    lang={lang}
                    ctaLabel={lang === 'es' ? 'Ver todos los confirmados' : 'View all confirmed'}
                    ctaTo="/intersection"
                  />
                  <QuadrantCard
                    eyebrow={lang === 'es' ? 'Cuadrante III · Punto ciego' : 'Quadrant III · Blind spot'}
                    accent="var(--color-text-muted)"
                    count={ixData.counts.blindspot}
                    title={lang === 'es' ? <>Lo que los reguladores vieron y el modelo no.</> : <>What regulators saw and the model didn't.</>}
                    deck={lang === 'es'
                      ? <>Honestidad metodológica: <strong className="text-text-primary">{formatNumber(ixData.counts.blindspot)}</strong> proveedores con bajo score RUBLI (&lt; 25/100) que sí aparecen en un registro externo.</>
                      : <>Methodological honesty: <strong className="text-text-primary">{formatNumber(ixData.counts.blindspot)}</strong> vendors with low RUBLI score (&lt; 25/100) that do appear on an external registry.</>}
                    rows={ixData.rankings.blindspot}
                    showSecondaryMetric="value"
                    lang={lang}
                    ctaLabel={lang === 'es' ? 'Ver todos los puntos ciegos' : 'View all blind spots'}
                    ctaTo="/intersection"
                  />
                </div>
              </PlateFrame>

              <div className="pt-4 border-t border-border">
                <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">{lang === 'es' ? 'Metodología' : 'Methodology'}</p>
                <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                  {lang === 'es' ? (
                    <>Los cuadrantes se computan sobre aria_queue (318K proveedores federales). Puntaje RUBLI = score {CURRENT_MODEL_VERSION} calibrado OCDE por sector (ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>). Registros externos: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (sanciones firmes del comptroller federal), <span className="font-mono">Corpus RUBLI</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString('es-MX')} casos · {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} proveedores vinculados).</>
                  ) : (
                    <>Quadrants computed over aria_queue (318K federal vendors). RUBLI score = {CURRENT_MODEL_VERSION} OECD-calibrated per-sector (see <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>). External registries: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (final federal-comptroller sanctions), <span className="font-mono">RUBLI corpus</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString()} cases · {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} vendors).</>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <SectionDivider />

        {/* ════════════════════════════════════════════════════════════════
            SECTION II — Captura Institucional
            ════════════════════════════════════════════════════════════════ */}
        <section id="captura" aria-labelledby="captura-heading">
          <div className="mb-6">
            <p
              className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-1"
              style={{ color: '#a06820' }}
            >
              {lang === 'es' ? 'Folio·XII · Captura Institucional' : 'Folio·XII · Institutional Capture'}
            </p>
            <h2
              id="captura-heading"
              style={{ fontFamily: 'var(--font-family-serif)', fontSize: 'clamp(1.25rem, 2.2vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
            >
              {lang === 'es' ? 'Cómo un proveedor captura una institución.' : 'How a vendor captures an institution.'}
            </h2>
            <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-prose">
              {lang === 'es'
                ? 'Concentración monótona: el proveedor empezó por debajo del 25% y terminó por encima del 50%, año tras año, durante al menos cuatro años. El ascenso no es prueba de irregularidad — pero la geometría es publicable.'
                : "Monotonic concentration: the vendor began below 25% and ended above 50%, year after year, for at least four years. The climb is not proof of wrongdoing — but the geometry is publishable."}
            </p>
            <div className="flex items-baseline gap-5 mt-4">
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
                ) : topSectorEntry ? (() => {
                  const ts = SECTORS.find(s => s.id === topSectorEntry.id)
                  return (
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: ts ? SECTOR_COLORS[ts.code] : '#64748b' }}
                        aria-hidden="true"
                      />
                      <span className="font-mono tabular-nums text-base font-semibold text-text-primary uppercase tracking-tight">
                        {getSectorName(ts?.code ?? 'otros', lang)}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-text-muted">
                        ({topSectorEntry.count})
                      </span>
                    </div>
                  )
                })()
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
                        ? 'border border-text-primary text-text-primary bg-background-elevated'
                        : 'border border-border text-text-muted hover:text-text-secondary hover:border-text-muted'
                    }`}
                    aria-pressed={captureFilter === null}
                  >
                    <span>{lang === 'es' ? 'Todos' : 'All'}</span>
                    <span className="tabular-nums opacity-70">{allCaptures.length}</span>
                  </button>
                  {SECTORS.map((s) => {
                    const count = captureSectorCounts.get(s.id) ?? 0
                    const active = captureFilter === s.id
                    const disabled = count === 0
                    return (
                      <button
                        key={s.code}
                        type="button"
                        disabled={disabled}
                        onClick={() => setCaptureFilter(active ? null : s.id)}
                        aria-pressed={active}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          active
                            ? 'bg-background-elevated text-text-primary'
                            : disabled
                            ? 'border border-border text-text-muted opacity-40 cursor-not-allowed'
                            : 'border border-border text-text-muted hover:text-text-secondary'
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
                          style={{ background: SECTOR_COLORS[s.code] ?? '#64748b', opacity: disabled ? 0.4 : 1 }}
                          aria-hidden="true"
                        />
                        <span>{lang === 'es' ? s.name : s.nameEN}</span>
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
