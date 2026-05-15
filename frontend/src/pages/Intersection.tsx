/**
 * Intersection — the RUBLI-vs-regulators contradiction surface.
 *
 * This is the pitch page: what does our model see that SAT EFOS / SFP /
 * ground-truth corpus have missed, and vice versa? Three quadrants:
 *
 *  • Novelty   — RUBLI High+ risk, zero external registry hits
 *  • Confirmed — RUBLI High+ risk AND at least one external registry hit
 *  • Blind spot — RUBLI Low risk BUT at least one external registry hit
 *
 * The fourth quadrant (both clean) is just a number — no editorial
 * interest in a ranked list of unsuspicious vendors.
 *
 * 2026-05-15 redesign: replaced 2×2 scatter (broken: 99% of dots cluster
 * in one corner) with a proportional treemap; promoted Novelty count to
 * a single dominant hero ("1,808 vendors no regulator has touched"); added
 * editorial FINDING callout; removed paper-grain texture so this page
 * stops looking like Relationships.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { intersectionApi, type IntersectionVendor, type IntersectionSummary } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS, CURRENT_MODEL_VERSION, GROUND_TRUTH_CASE_COUNT_FALLBACK, GROUND_TRUTH_VENDOR_COUNT_FALLBACK, getSectorName } from '@/lib/constants'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

function RegistryBadges({ v }: { v: IntersectionVendor }) {
  const badges: Array<{ label: string; color: string; title: string }> = []
  if (v.is_efos_definitivo) badges.push({
    label: 'EFOS',
    color: '#dc2626',
    title: 'SAT-confirmed ghost company (Art. 69-B definitivo)',
  })
  if (v.is_sfp_sanctioned) badges.push({
    label: 'SFP',
    color: '#ea580c',
    title: 'Federal comptroller sanction',
  })
  if (v.in_ground_truth) badges.push({
    label: 'GT',
    color: '#a06820',
    title: 'Party to a documented corruption case',
  })
  if (badges.length === 0) return null
  return (
    <span className="inline-flex gap-1 flex-shrink-0">
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
          style={{
            color: b.color,
            background: `${b.color}14`,
            border: `1px solid ${b.color}33`,
          }}
        >
          {b.label}
        </span>
      ))}
    </span>
  )
}

function VendorRow({
  v,
  rank,
  showSecondaryMetric,
  lang,
}: {
  v: IntersectionVendor
  rank: number
  showSecondaryMetric: 'ips' | 'risk' | 'value'
  lang: string
}) {
  const sectorColor = v.primary_sector_name
    ? SECTOR_COLORS[v.primary_sector_name.toLowerCase()] ?? '#64748b'
    : '#64748b'
  const secondary =
    showSecondaryMetric === 'ips'
      ? `IPS ${(v.ips_final * 100).toFixed(1)}`
      : showSecondaryMetric === 'risk'
        ? `${(v.avg_risk_score * 100).toFixed(0)}/100`
        : formatCompactMXN(v.total_value_mxn)
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `3px solid ${sectorColor}` }}
    >
      <span className="flex-shrink-0 w-6 font-mono text-[11px] font-bold text-text-muted tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>
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
          <span className="tabular-nums">
            {formatNumber(v.total_contracts)} {lang === 'es' ? 'contratos' : 'contracts'}
          </span>
          {v.primary_pattern && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider">{v.primary_pattern}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <div className="font-mono text-sm font-bold tabular-nums text-text-primary">
          {secondary}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
    </div>
  )
}

function QuadrantCard({
  eyebrow,
  title,
  deck,
  count,
  accent,
  rows,
  showSecondaryMetric,
  lang,
  ctaLabel,
  ctaTo,
}: {
  eyebrow: string
  title: React.ReactNode
  deck: React.ReactNode
  count: number
  accent: string
  rows: IntersectionVendor[]
  showSecondaryMetric: 'ips' | 'risk' | 'value'
  lang: string
  ctaLabel: string
  ctaTo: string
}) {
  return (
    <section
      className="rounded-sm border border-border bg-background-card overflow-hidden"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p
            className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </p>
          <p className="font-mono tabular-nums text-[11px] text-text-muted">
            {formatNumber(count)} {lang === 'es' ? 'proveedores' : 'vendors'}
          </p>
        </div>
        <h2
          className="mt-1 text-text-primary leading-tight"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] max-w-prose">
          {deck}
        </p>
      </header>
      {rows.length > 0 ? (
        <div>
          {rows.map((v, i) => (
            <VendorRow
              key={v.vendor_id}
              v={v}
              rank={i + 1}
              showSecondaryMetric={showSecondaryMetric}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-text-muted">
          {lang === 'es' ? 'Sin datos.' : 'No data.'}
        </div>
      )}
      {count > rows.length && (
        <Link
          to={ctaTo}
          className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border text-[11px] font-mono tracking-[0.12em] uppercase text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <span>{ctaLabel}</span>
          <span>
            {count - rows.length > 0
              ? `+${formatNumber(count - rows.length)} ${lang === 'es' ? 'más' : 'more'}`
              : ''}{' '}
            →
          </span>
        </Link>
      )}
    </section>
  )
}

// ─── Proportional quadrant treemap ────────────────────────────────────────────
// Replaces the 2×2 scatter (which looked broken because 99% of dots stacked in
// one corner). Three rectangles sized by vendor count, with the NOVELTY
// rectangle dominating the top row — visually mirroring its 61% share of the
// regulator-vs-model contradiction surface.
//
// Layout: top row = NOVELTY (full width). Bottom row = BLIND SPOT | CONFIRMED,
// each width-proportional to its count.

function ProportionalQuadrantMap({
  data,
  lang,
}: {
  data: IntersectionSummary
  lang: string
}) {
  const { novelty, confirmed, blindspot } = data.counts
  const total = novelty + confirmed + blindspot

  // Top row gets ~61% of the height to mirror the 61% novelty share — but
  // we cap the dominant row's height so the bottom row stays readable.
  const noveltyHeightShare = Math.max(0.5, Math.min(0.7, novelty / total))
  const topHeightPct = noveltyHeightShare * 100
  const bottomHeightPct = 100 - topHeightPct
  // Bottom row split: blindspot (left) vs confirmed (right), proportional.
  const bottomTotal = blindspot + confirmed || 1
  const blindspotWidthPct = (blindspot / bottomTotal) * 100
  const confirmedWidthPct = (confirmed / bottomTotal) * 100

  const NOVELTY_COLOR = '#ef4444'
  const CONFIRMED_COLOR = '#a06820'
  const BLINDSPOT_COLOR = '#64748b'

  return (
    <div className="rounded-sm border border-border bg-background-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          {lang === 'es'
            ? 'Mapa proporcional · cuadrantes por volumen'
            : 'Proportional map · quadrants by volume'}
        </p>
        <p className="text-[10px] font-mono text-text-muted tabular-nums">
          {formatNumber(total)} {lang === 'es' ? 'proveedores totales' : 'total vendors'}
        </p>
      </div>
      <div className="p-4">
        <div
          className="w-full"
          style={{ aspectRatio: '16 / 9', minHeight: 280, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {/* Top row: NOVELTY dominates */}
          <div
            style={{ height: `${topHeightPct}%`, position: 'relative' }}
            className="rounded-sm overflow-hidden"
          >
            <div
              className="absolute inset-0 transition-colors"
              style={{
                background: `${NOVELTY_COLOR}14`,
                borderLeft: `4px solid ${NOVELTY_COLOR}`,
                border: `1px solid ${NOVELTY_COLOR}33`,
                borderLeftWidth: 4,
              }}
            />
            <div className="relative h-full flex flex-col justify-between p-4 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className="text-[10px] font-mono font-bold uppercase tracking-[0.20em]"
                  style={{ color: NOVELTY_COLOR }}
                >
                  {lang === 'es' ? 'NOVEDAD · cuadrante I' : 'NOVELTY · quadrant I'}
                </p>
                <p className="text-[10px] font-mono tabular-nums text-text-muted">
                  {((novelty / total) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div
                  className="tabular-nums leading-none"
                  style={{
                    fontFamily: '"Playfair Display", "EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(40px, 7vw, 88px)',
                    color: NOVELTY_COLOR,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatNumber(novelty)}
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-text-secondary max-w-[40ch] leading-[1.55]">
                  {lang === 'es'
                    ? 'Alto riesgo del modelo · ningún registro oficial los toca.'
                    : 'High model risk · no official registry has touched them.'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom row: BLIND SPOT | CONFIRMED, proportional */}
          <div
            style={{ height: `${bottomHeightPct}%`, display: 'flex', gap: 6, minHeight: 80 }}
          >
            <div
              style={{
                width: `${blindspotWidthPct}%`,
                minWidth: 100,
                position: 'relative',
              }}
              className="rounded-sm overflow-hidden"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `${BLINDSPOT_COLOR}14`,
                  border: `1px solid ${BLINDSPOT_COLOR}33`,
                  borderLeft: `4px solid ${BLINDSPOT_COLOR}`,
                }}
              />
              <div className="relative h-full flex flex-col justify-between p-3 sm:p-4">
                <p
                  className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: BLINDSPOT_COLOR }}
                >
                  {lang === 'es' ? 'PUNTO CIEGO · III' : 'BLIND SPOT · III'}
                </p>
                <div>
                  <div
                    className="tabular-nums leading-none"
                    style={{
                      fontFamily: '"Playfair Display", "EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: 'clamp(28px, 4vw, 48px)',
                      color: BLINDSPOT_COLOR,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatNumber(blindspot)}
                  </div>
                  <p className="text-[10px] font-mono text-text-muted mt-1">
                    {((blindspot / total) * 100).toFixed(0)}%
                    <span className="mx-1.5">·</span>
                    {lang === 'es' ? 'reguladores vieron · modelo no' : "regulators saw · model didn't"}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                width: `${confirmedWidthPct}%`,
                minWidth: 100,
                position: 'relative',
              }}
              className="rounded-sm overflow-hidden"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `${CONFIRMED_COLOR}14`,
                  border: `1px solid ${CONFIRMED_COLOR}33`,
                  borderLeft: `4px solid ${CONFIRMED_COLOR}`,
                }}
              />
              <div className="relative h-full flex flex-col justify-between p-3 sm:p-4">
                <p
                  className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: CONFIRMED_COLOR }}
                >
                  {lang === 'es' ? 'CONFIRMADO · II' : 'CONFIRMED · II'}
                </p>
                <div>
                  <div
                    className="tabular-nums leading-none"
                    style={{
                      fontFamily: '"Playfair Display", "EB Garamond", Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: 'clamp(28px, 4vw, 48px)',
                      color: CONFIRMED_COLOR,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatNumber(confirmed)}
                  </div>
                  <p className="text-[10px] font-mono text-text-muted mt-1">
                    {((confirmed / total) * 100).toFixed(0)}%
                    <span className="mx-1.5">·</span>
                    {lang === 'es' ? 'ambos métodos coinciden' : 'both methods agree'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-border flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted">
          {lang === 'es' ? 'Área = recuento de proveedores' : 'Area = vendor count'}
        </span>
        <span className="text-[10px] font-mono text-text-muted ml-auto">
          {lang === 'es'
            ? 'Cuadrante IV (limpio) omitido — sin interés editorial'
            : 'Quadrant IV (clean) omitted — no editorial interest'}
        </span>
      </div>
    </div>
  )
}

export default function Intersection() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['intersection', 'summary', 50, selectedSector],
    queryFn: () => intersectionApi.getSummary(50, selectedSector ?? undefined),
    staleTime: 10 * 60 * 1000,
  })

  // The Novelty number is the headline claim — keep it stable across renders
  // so the hero doesn't flicker between loading and loaded states.
  const noveltyCount = data?.counts.novelty ?? 0
  const confirmedCount = data?.counts.confirmed ?? 0
  const blindspotCount = data?.counts.blindspot ?? 0
  const totalHighRisk = noveltyCount + confirmedCount

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Folio kicker — kept consistent with rest of site but lighter than
          Relationships (no paper grain). */}
      <header className="mb-10 pb-6 border-b border-border">
        <div
          className="flex items-center gap-3 mb-5"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontWeight: 400,
          }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
            <span style={{ color: '#a06820', fontWeight: 500 }}>Folio·XIII</span>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            <span>
              {lang === 'es' ? 'Informe de inteligencia · La brecha regulatoria' : 'Intelligence brief · The regulatory gap'}
            </span>
          </span>
        </div>

        {/* HERO: the Novelty number is the headline claim. Playfair Display
            Italic 800, ~88px, critical red. This is the platform's pitch. */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-72" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-3 w-[28rem]" />
          </div>
        ) : data ? (
          <div>
            <div
              className="tabular-nums leading-[0.95]"
              style={{
                fontFamily: '"Playfair Display", "EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 'clamp(64px, 12vw, 128px)',
                color: 'var(--color-risk-critical)',
                letterSpacing: '-0.025em',
              }}
            >
              {formatNumber(noveltyCount)}
            </div>
            <p
              className="mt-3 sm:mt-4 max-w-[42ch]"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(20px, 2.6vw, 30px)',
                lineHeight: 1.18,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.005em',
              }}
            >
              {lang === 'es'
                ? <>proveedores que RUBLI marcó <span style={{ fontStyle: 'normal', fontWeight: 600 }}>y ningún regulador ha tocado.</span></>
                : <>vendors RUBLI flagged <span style={{ fontStyle: 'normal', fontWeight: 600 }}>that no regulator has touched.</span></>}
            </p>
            <p
              className="mt-5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted leading-[1.7] max-w-[78ch]"
            >
              {lang === 'es' ? (
                <>
                  De <span className="tabular-nums font-bold text-text-secondary">{formatNumber(totalHighRisk)}</span> proveedores de alto riesgo
                  <span className="mx-2 opacity-50">·</span>
                  <span className="tabular-nums font-bold text-text-secondary">{formatNumber(confirmedCount)}</span> confirmados por registros
                  <span className="mx-2 opacity-50">·</span>
                  <span className="tabular-nums font-bold text-text-secondary">{formatNumber(blindspotCount)}</span> marcados pero el modelo no
                </>
              ) : (
                <>
                  Of <span className="tabular-nums font-bold text-text-secondary">{formatNumber(totalHighRisk)}</span> high-risk vendors
                  <span className="mx-2 opacity-50">·</span>
                  <span className="tabular-nums font-bold text-text-secondary">{formatNumber(confirmedCount)}</span> confirmed by registries
                  <span className="mx-2 opacity-50">·</span>
                  <span className="tabular-nums font-bold text-text-secondary">{formatNumber(blindspotCount)}</span> registry-flagged but model-clean
                </>
              )}
            </p>
          </div>
        ) : null}
      </header>

      <div>
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-sm border border-border bg-background-card p-5">
                <Skeleton className="h-3 w-32 mb-3" />
                <Skeleton className="h-6 w-96 mb-2" />
                <Skeleton className="h-4 w-full max-w-prose mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* FINDING callout — left border in critical red, monospace, the
                editorial framing. Sits above the chart so readers anchor to
                the claim before parsing the geometry. */}
            <div
              className="px-5 py-4 rounded-sm bg-background-elevated"
              style={{ borderLeft: '3px solid var(--color-risk-critical)' }}
            >
              <p
                className="text-[10px] font-mono font-bold uppercase tracking-[0.20em] mb-2"
                style={{ color: 'var(--color-risk-critical)' }}
              >
                {lang === 'es' ? 'HALLAZGO' : 'FINDING'}
              </p>
              <p
                className="text-[13px] sm:text-[14px] leading-[1.65] text-text-primary max-w-[72ch]"
                style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}
              >
                {lang === 'es' ? (
                  <>
                    RUBLI identifica <strong>3× más proveedores de alto riesgo</strong> que los registros SAT EFOS + SFP combinados.
                    De <strong className="tabular-nums">{formatNumber(totalHighRisk)}</strong> proveedores con patrones de riesgo elevado en su contratación,
                    solo <strong className="tabular-nums">{formatNumber(confirmedCount)}</strong> aparecen en alguna lista oficial.
                    La brecha regulatoria: <strong className="tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{formatNumber(noveltyCount)}</strong>.
                  </>
                ) : (
                  <>
                    RUBLI identifies <strong>3× more high-risk vendors</strong> than the combined SAT EFOS + SFP registries.
                    Of <strong className="tabular-nums">{formatNumber(totalHighRisk)}</strong> vendors with elevated procurement-risk patterns,
                    only <strong className="tabular-nums">{formatNumber(confirmedCount)}</strong> appear on any official watchlist.
                    The regulatory gap: <strong className="tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{formatNumber(noveltyCount)}</strong>.
                  </>
                )}
              </p>
            </div>

            {/* Proportional quadrant map — replaces the old 2×2 scatter. */}
            <ProportionalQuadrantMap data={data} lang={lang} />

            {/* Methodology caveat */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm border border-border bg-background-card">
              <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-[1.6] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Los cuadrantes son señales de investigación, no veredictos. Un proveedor en "novedad" coincide con patrones de corrupción documentados pero no aparece en registros externos — eso justifica revisión, no acusación. Umbrales: {(data.thresholds.rubli_flags * 100).toFixed(0)}% = alto riesgo; {(data.thresholds.rubli_clean * 100).toFixed(0)}% = bajo riesgo; ≥ {data.thresholds.min_contracts} contratos.
                  </>
                ) : (
                  <>
                    Quadrants are investigation signals, not verdicts. A vendor in "novelty" matches documented corruption patterns but does not appear on external registries — that warrants review, not accusation. Thresholds: {(data.thresholds.rubli_flags * 100).toFixed(0)}% = high risk; {(data.thresholds.rubli_clean * 100).toFixed(0)}% = low risk; ≥ {data.thresholds.min_contracts} contracts.
                  </>
                )}
              </p>
            </div>

            {/* Sector filter chips */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label={lang === 'es' ? 'Filtrar por sector' : 'Filter by sector'}
              style={{ scrollbarWidth: 'none' }}
            >
              <button
                onClick={() => setSelectedSector(null)}
                className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                style={{
                  border: `1px solid ${selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-border)'}`,
                  color: selectedSector === null ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  background: selectedSector === null ? 'var(--color-background-elevated)' : 'transparent',
                  fontWeight: selectedSector === null ? 700 : 400,
                }}
                aria-pressed={selectedSector === null}
              >
                {lang === 'es' ? 'Todos' : 'All'}
              </button>
              {SECTORS.map((s) => {
                const active = selectedSector === s.code
                return (
                  <button
                    key={s.code}
                    onClick={() => setSelectedSector(active ? null : s.code)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                    style={{
                      border: `1px solid ${active ? s.color : `${s.color}44`}`,
                      color: active ? s.color : 'var(--color-text-muted)',
                      background: active ? `${s.color}12` : 'transparent',
                      fontWeight: active ? 700 : 400,
                    }}
                    aria-pressed={active}
                  >
                    {getSectorName(s.code, lang === 'es' ? 'es' : 'en')}
                  </button>
                )
              })}
            </div>

            {/* Quadrant cards — three editorial sections, NOT inside the
                PlateFrame anymore. Removing PlateFrame + paper-grain is what
                visually divorces this page from Relationships. */}
            <div className="space-y-6">
              {/* NOVELTY — the pitch quadrant */}
              <QuadrantCard
                eyebrow={lang === 'es' ? 'Cuadrante I · Novedad' : 'Quadrant I · Novelty'}
                accent="var(--color-risk-critical)"
                count={data.counts.novelty}
                title={
                  lang === 'es'
                    ? <>Proveedores que coinciden con patrones de corrupción — sin marca externa.</>
                    : <>Vendors matching corruption patterns — not on any external registry.</>
                }
                deck={
                  lang === 'es'
                    ? <>Esta es la razón de ser del modelo: <strong className="text-text-primary">{formatNumber(data.counts.novelty)}</strong> proveedores con score alto (≥ 40/100) cuyos RFC no aparecen en SAT EFOS, ni tienen sanción SFP, ni están en el corpus de casos documentados. Ordenados por IPS — prioridad integrada.</>
                    : <>This is the model's reason to exist: <strong className="text-text-primary">{formatNumber(data.counts.novelty)}</strong> vendors with high pattern-match (≥ 40/100) whose RFCs do not appear on SAT EFOS, carry no SFP sanction, and are absent from the documented-case corpus. Ranked by IPS (integrated priority score).</>
                }
                rows={selectedSector ? data.rankings.novelty.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.novelty}
                showSecondaryMetric="ips"
                lang={lang}
                ctaLabel={lang === 'es' ? 'Ver todos los proveedores de novedad' : 'View all novelty vendors'}
                ctaTo="/aria"
              />

              {/* CONFIRMED — triangulation */}
              <QuadrantCard
                eyebrow={lang === 'es' ? 'Cuadrante II · Confirmado' : 'Quadrant II · Confirmed'}
                accent="var(--color-accent)"
                count={data.counts.confirmed}
                title={
                  lang === 'es'
                    ? <>Ambas señales coinciden — modelo y reguladores de acuerdo.</>
                    : <>Both signals agree — model and regulators converge.</>
                }
                deck={
                  lang === 'es'
                    ? <>Triangulación: <strong className="text-text-primary">{formatNumber(data.counts.confirmed)}</strong> proveedores con score alto que además aparecen en al menos un registro externo. Cuando métodos independientes convergen, la confianza en cada uno crece.</>
                    : <>Triangulation: <strong className="text-text-primary">{formatNumber(data.counts.confirmed)}</strong> vendors with high pattern-match that also appear on at least one external registry. When independent methods converge, confidence in each grows.</>
                }
                rows={selectedSector ? data.rankings.confirmed.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.confirmed}
                showSecondaryMetric="risk"
                lang={lang}
                ctaLabel={lang === 'es' ? 'Ver todos los confirmados' : 'View all confirmed'}
                ctaTo="/aria"
              />

              {/* BLIND SPOT — humility */}
              <QuadrantCard
                eyebrow={lang === 'es' ? 'Cuadrante III · Punto ciego' : 'Quadrant III · Blind spot'}
                accent="var(--color-text-muted)"
                count={data.counts.blindspot}
                title={
                  lang === 'es'
                    ? <>Lo que los reguladores vieron y el modelo no.</>
                    : <>What regulators saw and the model didn't.</>
                }
                deck={
                  lang === 'es'
                    ? <>Honestidad metodológica: <strong className="text-text-primary">{formatNumber(data.counts.blindspot)}</strong> proveedores con bajo score RUBLI (&lt; 25/100) que sí aparecen en un registro externo. Ordenados por valor total de contratos — los puntos ciegos más grandes primero.</>
                    : <>Methodological honesty: <strong className="text-text-primary">{formatNumber(data.counts.blindspot)}</strong> vendors with low RUBLI score (&lt; 25/100) that do appear on an external registry. Sorted by total contract value — largest blind spots first.</>
                }
                rows={selectedSector ? data.rankings.blindspot.filter((v) => v.primary_sector_name?.toLowerCase() === selectedSector) : data.rankings.blindspot}
                showSecondaryMetric="value"
                lang={lang}
                ctaLabel={lang === 'es' ? 'Ver todos los puntos ciegos' : 'View all blind spots'}
                ctaTo="/aria"
              />
            </div>

            {/* Methodology footer */}
            <div className="mt-4 pt-6 border-t border-border">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'es' ? 'Metodología' : 'Methodology'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Los cuadrantes se computan sobre aria_queue (318K proveedores federales). Puntaje RUBLI = score {CURRENT_MODEL_VERSION} calibrado OCDE por sector (ver <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología</Link>). Registros externos: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (sanciones firmes del comptroller federal, 544 registros), <span className="font-mono">Corpus RUBLI</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString('es-MX')} casos de verdad fundamental con {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} proveedores vinculados).
                  </>
                ) : (
                  <>
                    Quadrants computed over aria_queue (318K federal vendors). RUBLI score = {CURRENT_MODEL_VERSION} OECD-calibrated per-sector (see <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">methodology</Link>). External registries: <span className="font-mono">SAT EFOS</span> (Art. 69-B definitivo, 13,960 RFCs), <span className="font-mono">SFP</span> (final federal-comptroller sanctions, 544 records), <span className="font-mono">RUBLI corpus</span> ({GROUND_TRUTH_CASE_COUNT_FALLBACK.toLocaleString()} ground-truth cases covering {GROUND_TRUTH_VENDOR_COUNT_FALLBACK} vendors).
                  </>
                )}
              </p>
              <p className="mt-3 text-[11px] font-mono text-text-muted">
                {lang === 'es'
                  ? <>Para acceso al dataset completo, consulta la <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">metodología RUBLI</Link>. Datos: contratos federales COMPRANET 2002–2025.</>
                  : <>For full dataset access, see the <Link to="/methodology" className="underline underline-offset-2 hover:text-text-primary">RUBLI methodology</Link>. Data: COMPRANET federal contracts 2002–2025.</>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
