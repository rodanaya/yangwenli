/**
 * Institutional Capture Creep — deterministic concentration growth.
 *
 * No model, no regression, no SHAP. Just arithmetic: for every federal
 * institution × year since 2018, compute each vendor's share. Surface
 * pairs where the vendor's share grew monotonically from <= 25% to
 * >= 50% across at least 4 years. Each row is a publishable story.
 */

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { captureApi, type CaptureItem } from '@/api/client'
import { formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { AlertTriangle, ChevronRight } from 'lucide-react'

/**
 * Mini sparkline of share-percent over the observed years. Pure SVG —
 * drawn at 180×40 so a row of captures reads as a shape-first scan.
 */
function ShareSparkline({ timeline, peakShare }: { timeline: CaptureItem['timeline']; peakShare: number }) {
  if (timeline.length < 2) return null
  const W = 180
  const H = 40
  const minY = 0
  const maxY = Math.max(100, peakShare) // always fix scale 0-100 so rows are comparable
  const minX = Math.min(...timeline.map((p) => p.year))
  const maxX = Math.max(...timeline.map((p) => p.year))
  const xSpan = Math.max(1, maxX - minX)
  const ySpan = maxY - minY

  const points = timeline.map((p) => {
    const x = ((p.year - minX) / xSpan) * (W - 8) + 4
    const y = H - 4 - ((p.share_pct - minY) / ySpan) * (H - 8)
    return { x, y, ...p }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${H - 4} L ${points[0].x.toFixed(1)} ${H - 4} Z`

  // 50% capture threshold line
  const thresholdY = H - 4 - ((50 - minY) / ySpan) * (H - 8)

  return (
    <svg width={W} height={H} className="flex-shrink-0" aria-hidden="true">
      {/* 50% capture line */}
      <line
        x1="4" x2={W - 4}
        y1={thresholdY} y2={thresholdY}
        stroke="currentColor"
        strokeWidth="0.6"
        strokeDasharray="2 2"
        opacity="0.35"
      />
      <path d={area} fill="var(--color-risk-critical)" opacity="0.12" />
      <path d={path} fill="none" stroke="var(--color-risk-critical)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle
          key={p.year}
          cx={p.x}
          cy={p.y}
          r={p.share_pct >= 50 ? 2.2 : 1.6}
          fill={p.share_pct >= 50 ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
        />
      ))}
    </svg>
  )
}

function CaptureRow({ c, rank, lang }: { c: CaptureItem; rank: number; lang: 'en' | 'es' }) {
  const sectorColor = c.institution_sector_name
    ? SECTOR_COLORS[c.institution_sector_name.toLowerCase()] ?? '#64748b'
    : '#64748b'
  const delta = c.peak_share_pct - c.earliest_share_pct
  const years = `${c.earliest_year}–${c.peak_year}`

  return (
    <article
      className="group flex flex-col md:flex-row items-stretch md:items-center gap-4 px-5 py-5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
      style={{ borderLeft: `4px solid ${sectorColor}` }}
    >
      {/* Rank + sparkline */}
      <div className="flex items-start gap-4 md:w-[240px] flex-shrink-0">
        <span className="font-mono text-[11px] font-bold text-text-muted tabular-nums pt-1">
          {String(rank).padStart(2, '0')}
        </span>
        <ShareSparkline timeline={c.timeline} peakShare={c.peak_share_pct} />
      </div>

      {/* Finding — vendor → institution, narrative */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-text-primary leading-tight mb-1"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: '1.05rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          <EntityIdentityChip type="vendor" id={c.vendor_id} name={c.vendor_name} size="sm" />
          {' '}
          <span className="text-text-muted" style={{ fontWeight: 400 }}>
            {lang === 'es' ? 'capturó' : 'captured'}
          </span>
          {' '}
          <EntityIdentityChip type="institution" id={c.institution_id} name={c.institution_name} size="sm" />
        </h3>
        <p className="text-[13px] text-text-secondary leading-[1.55]">
          {lang === 'es' ? (
            <>
              De <strong className="text-text-primary font-mono tabular-nums">{c.earliest_share_pct}%</strong>
              {' '}en {c.earliest_year} a{' '}
              <strong className="text-text-primary font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{c.peak_share_pct}%</strong>
              {' '}en {c.peak_year} — <strong className="text-text-primary">+{delta.toFixed(1)} puntos</strong> en {c.years_observed} años. Valor capturado: <strong className="text-text-primary font-mono">{formatCompactMXN(c.cumulative_value_mxn)}</strong> de {formatCompactMXN(c.institution_total_window)} totales de la institución.
            </>
          ) : (
            <>
              From <strong className="text-text-primary font-mono tabular-nums">{c.earliest_share_pct}%</strong>
              {' '}in {c.earliest_year} to{' '}
              <strong className="text-text-primary font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{c.peak_share_pct}%</strong>
              {' '}in {c.peak_year} — <strong className="text-text-primary">+{delta.toFixed(1)} points</strong> over {c.years_observed} observed years. Value captured: <strong className="text-text-primary font-mono">{formatCompactMXN(c.cumulative_value_mxn)}</strong> of the institution's {formatCompactMXN(c.institution_total_window)} total.
            </>
          )}
        </p>
        <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] font-mono tracking-wider uppercase text-text-muted">
          {c.institution_sector_name && (
            <span>
              <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle" style={{ background: sectorColor }} />
              {c.institution_sector_name}
            </span>
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

export default function CaptureCreep() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'en') as 'en' | 'es'
  const { data, isLoading } = useQuery({
    queryKey: ['capture', 'top', 50],
    queryFn: () => captureApi.getTop({ limit: 50 }),
    staleTime: 30 * 60 * 1000,
  })

  const captures = data?.data ?? []
  const totalCount = data?.total_captures ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EditorialPageShell
        kicker={lang === 'es' ? 'RUBLI · CAPTURA INSTITUCIONAL' : 'RUBLI · INSTITUTIONAL CAPTURE'}
        headline={
          isLoading ? (
            lang === 'es' ? 'Captura institucional' : 'Institutional capture'
          ) : totalCount > 0 ? (
            lang === 'es' ? (
              <>
                <span style={{ color: 'var(--color-risk-critical)' }}>{totalCount}</span>
                {' '}instituciones capturadas por un solo proveedor entre 2018 y 2025.
              </>
            ) : (
              <>
                <span style={{ color: 'var(--color-risk-critical)' }}>{totalCount}</span>
                {' '}institutions captured by a single vendor between 2018 and 2025.
              </>
            )
          ) : (
            lang === 'es' ? 'Sin capturas detectadas.' : 'No captures detected.'
          )
        }
        paragraph={
          lang === 'es' ? (
            <>
              Sin modelo, sin regresión, sin SHAP. Para cada institución × año, sumamos los contratos de cada proveedor, dividimos entre el total anual, y buscamos curvas monótonas donde la participación de un proveedor saltó de <strong className="text-text-primary">&le; 25%</strong> a <strong className="text-text-primary">&ge; 50%</strong> en al menos <strong className="text-text-primary">4 años</strong>. Cada fila es un hallazgo publicable — una institución federal donde un solo proveedor pasó de marginal a dominante en la década actual.
            </>
          ) : (
            <>
              No model, no regression, no SHAP. For every institution × year, we sum each vendor's contracts, divide by that year's total, and look for monotonic growth curves where a vendor's share jumped from <strong className="text-text-primary">&le; 25%</strong> to <strong className="text-text-primary">&ge; 50%</strong> across at least <strong className="text-text-primary">4 years</strong>. Every row is a publishable finding — a federal institution where a single vendor went from marginal to dominant in the current decade.
            </>
          )
        }
        stats={
          isLoading || !data ? undefined : [
            {
              value: formatNumber(data.total_captures),
              label: lang === 'es' ? 'Capturas' : 'Captures',
              color: 'var(--color-risk-critical)',
              sub: lang === 'es' ? 'instituciones' : 'institutions',
            },
            {
              value: formatCompactMXN(data.data.reduce((sum, c) => sum + c.cumulative_value_mxn, 0)),
              label: lang === 'es' ? 'Valor capturado' : 'Captured value',
              color: 'var(--color-accent)',
            },
            {
              value: data.data.length > 0
                ? `${Math.max(...data.data.map((c) => c.peak_share_pct - c.earliest_share_pct)).toFixed(0)}pt`
                : '—',
              label: lang === 'es' ? 'Mayor salto' : 'Largest jump',
              sub: lang === 'es' ? 'puntos porcentuales' : 'percentage points',
            },
            {
              value: data.thresholds.year_window,
              label: lang === 'es' ? 'Ventana' : 'Window',
              sub: lang === 'es' ? `${data.thresholds.floor_share_pct}% → ${data.thresholds.ceil_share_pct}%` : `${data.thresholds.floor_share_pct}% → ${data.thresholds.ceil_share_pct}%`,
            },
          ]
        }
        severity="critical"
        loading={isLoading}
      >
        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-sm border border-border bg-background-elevated">
              <AlertTriangle className="h-3.5 w-3.5 text-text-muted mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-[1.6] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    La captura institucional no es prueba de irregularidad. Algunas concentraciones legítimas emergen de certificación técnica, exclusividad regional, o dependencia regulatoria de proveedor único. Cada fila abajo merece investigación — no acusación.
                  </>
                ) : (
                  <>
                    Institutional capture is not proof of wrongdoing. Some legitimate concentrations emerge from technical certification, regional exclusivity, or single-source regulatory dependency. Each row below warrants investigation — not accusation.
                  </>
                )}
              </p>
            </div>

            <div className="rounded-sm border border-border bg-background-card overflow-hidden">
              {captures.map((c, i) => (
                <CaptureRow
                  key={`${c.institution_id}-${c.vendor_id}`}
                  c={c}
                  rank={i + 1}
                  lang={lang}
                />
              ))}
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                {lang === 'es' ? 'Metodología' : 'Methodology'}
              </p>
              <p className="text-[12px] leading-[1.7] text-text-secondary max-w-prose">
                {lang === 'es' ? (
                  <>
                    Calculado sobre {data ? data.total_unfiltered : '—'} candidatos (institución, proveedor) con al menos {data?.thresholds.min_years ?? '—'} años de datos. Umbrales: piso {data?.thresholds.floor_share_pct ?? '—'}%, techo {data?.thresholds.ceil_share_pct ?? '—'}%. Institución total mínimo: {formatCompactMXN(data?.thresholds.min_inst_total_mxn ?? 0)}. Valor capturado mínimo: {formatCompactMXN(data?.thresholds.min_cumulative_value_mxn ?? 0)}. Ranking: Δparticipación × √(valor MXN capturado). Datos: COMPRANET contratos federales 2018-2025, montos validados (rechazados &gt; 100B MXN).
                  </>
                ) : (
                  <>
                    Computed over {data ? data.total_unfiltered : '—'} (institution, vendor) candidates with at least {data?.thresholds.min_years ?? '—'} years of data. Thresholds: floor {data?.thresholds.floor_share_pct ?? '—'}%, ceiling {data?.thresholds.ceil_share_pct ?? '—'}%. Minimum institution total: {formatCompactMXN(data?.thresholds.min_inst_total_mxn ?? 0)}. Minimum captured value: {formatCompactMXN(data?.thresholds.min_cumulative_value_mxn ?? 0)}. Ranking: Δshare × √(captured MXN). Data: COMPRANET federal contracts 2018-2025, validated amounts (reject &gt; 100B MXN).
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </EditorialPageShell>
    </div>
  )
}
